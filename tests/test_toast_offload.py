"""Toast offload queue pins (U345, #291 H2 prime suspect).

H2 investigation (2026-11-04, estate handover_u345.md): the LL hook pump
runs the FST filter synchronously (pynput _util/win32.py _handler); a hook
that blocks past LowLevelHooksTimeout (250 ms class) is removed by Windows
and events are lost during removal/reinstall. Gaming scenario (maintainer
2026-11-04): A/D tap-group moves + sidearm '2' -> <halbautomatic_start>
repeat on left_mouse posts a toast EVERY repeat iteration (the
repeat-toast storm is the contender in the repeat path).
Fix: the toast call enqueues (O(1) deque append on the poster thread -
the hook-pump leg) and a pump task on the asyncio loop drains into the
bridge, so the bridge emit never runs synchronously on the poster thread.
Pins are deterministic (bridge-call thread identity, drain, overflow,
off-switch direct path, headless no-bridge no-op). The enqueue latency
budget is measured by the scratch probe, published in the estate summary.
"""
import threading

import pytest

from fst_keyboard import Toast_Offload
import fst_manager
from fst_manager import CONSTANTS, START_ARG_FLAGS


class RecordingBridge:
    """Records every call with the calling thread identity."""

    def __init__(self):
        self.calls = []

    def _rec(self, name, *args):
        self.calls.append((name, args, threading.current_thread().ident))

    def trigger_toast(self, text, duration, text_size, bg_color, text_color):
        self._rec('toast', text, duration, text_size, bg_color, text_color)

    def trigger_timer(self, text, duration, text_size, bg_color, text_color):
        self._rec('timer', text, duration, text_size, bg_color, text_color)

    def trigger_remove(self, text, immediately=0):
        self._rec('remove', text, immediately)

    def trigger_remove_all(self, immediately=0):
        self._rec('remove_all', immediately)


@pytest.fixture
def offload(fake_fst):
    return Toast_Offload(fake_fst)


def test_post_enqueues_only_until_drain(offload):
    bridge = RecordingBridge()
    offload.attach(bridge)
    offload.toast('hi', 5, 12, 'rgba(0,0,0,200)', 'white')
    assert bridge.calls == []  # bridge untouched until the pump drains
    offload.drain()
    assert bridge.calls == [
        ('toast', ('hi', 5, 12, 'rgba(0,0,0,200)', 'white'),
         threading.current_thread().ident)]


def test_all_four_legs_drain_in_order(offload):
    bridge = RecordingBridge()
    offload.attach(bridge)
    offload.toast('t', 1, 2, 'bg', 'tc')
    offload.timer('tm', 3, 4, 'bg', 'tc')
    offload.remove('t', 1)
    offload.remove_all(0)
    offload.drain()
    assert [c[0] for c in bridge.calls] == ['toast', 'timer', 'remove',
                                            'remove_all']
    assert bridge.calls[2][1] == ('t', 1)
    assert bridge.calls[3][1] == (0,)


def test_bridge_call_never_on_poster_thread(offload):
    """The poster (a hook pump thread) must not carry the bridge emit;
    the emit lands on the drain/pump thread."""
    bridge = RecordingBridge()
    offload.attach(bridge)
    poster = threading.Thread(
        target=offload.toast, args=('x', 1, 2, 'bg', 'tc'))
    poster.start()
    poster.join()
    assert bridge.calls == []  # poster returned WITHOUT calling the bridge
    offload.drain()
    assert [c[2] for c in bridge.calls] == [threading.current_thread().ident]


def test_overflow_keeps_newest_and_counts_drops(fake_fst):
    offload = Toast_Offload(fake_fst, maxlen=3)
    bridge = RecordingBridge()
    offload.attach(bridge)
    for i in range(4):
        offload.toast(f't{i}', 1, 2, 'bg', 'tc')
    offload.drain()
    texts = [c[1][0] for c in bridge.calls]
    assert texts == ['t1', 't2', 't3']  # oldest dropped, newest kept
    assert offload.dropped == 1


def test_off_switch_direct_emit_on_poster(fake_fst, monkeypatch):
    monkeypatch.setattr(CONSTANTS, 'TOAST_OFFLOAD', False)
    offload = Toast_Offload(fake_fst)
    bridge = RecordingBridge()
    offload.attach(bridge)
    offload.toast('x', 1, 2, 'bg', 'tc')
    # legacy direct path: bridge called synchronously, no queue involvement
    assert [c[0] for c in bridge.calls] == ['toast']
    assert bridge.calls[0][2] == threading.current_thread().ident


def test_headless_no_bridge_is_noop_both_paths(fake_fst, monkeypatch):
    # ON path: enqueue + drain without bridge -> no crash (previously the
    # headless show_message leg raised TypeError on toast_callback=None)
    offload = Toast_Offload(fake_fst)
    offload.toast('x', 1, 2, 'bg', 'tc')
    offload.drain()
    assert offload.dropped == 1
    # OFF path: direct emit without bridge -> no-op, no crash
    monkeypatch.setattr(CONSTANTS, 'TOAST_OFFLOAD', False)
    offload.toast('y', 1, 2, 'bg', 'tc')
    offload.drain()
    assert offload.dropped == 2


def test_facade_wiring_and_pump(kb_env_plain):
    kb = kb_env_plain
    bridge = RecordingBridge()
    kb.init_toast_offload(bridge)
    kb.toast_callback('t', 1, 2, 'bg', 'tc')
    kb.timer_callback('tm', 1, 2, 'bg', 'tc')
    kb.remove_callback('t')
    kb.remove_all_callback()
    assert bridge.calls == []  # wired through the offload queue now
    kb.drain_toast_queue()
    assert [c[0] for c in bridge.calls] == ['toast', 'timer', 'remove',
                                            'remove_all']
    assert asyncio_is_coroutine_pump(kb)


def asyncio_is_coroutine_pump(kb):
    import inspect
    return inspect.iscoroutinefunction(kb.toast_pump)


def test_facade_headless_wiring_no_bridge_is_noop(kb_env_plain):
    """Product headless path: init_toast_offload(None) wires the offload
    with no bridge; the legacy toast_callback=None TypeError landmine
    (constraint show_message / Macro_Repeat_Task overlay headless) closes.
    RED-before: pre-U345 wiring left toast_callback None -> TypeError."""
    kb = kb_env_plain
    kb.init_toast_offload(None)
    kb.toast_callback('x', 1, 2, 'bg', 'tc')
    kb.timer_callback('tm', 1, 2, 'bg', 'tc')
    kb.remove_callback('x')
    kb.remove_all_callback()
    kb.drain_toast_queue()  # drain without bridge: counted no-ops, no crash
    assert kb._toast_offload.dropped == 4


def test_start_argument_turns_offload_off(fake_fst):
    am = fst_manager.Argument_Manager(fake_fst)
    am.apply_start_arguments(['-no_toast_offload'])
    assert CONSTANTS.TOAST_OFFLOAD is False
    # re-applying (focus change re-runs apply) keeps the switch off
    am.apply_start_arguments(['-no_toast_offload'])
    assert CONSTANTS.TOAST_OFFLOAD is False


def test_validator_accepts_new_flags():
    assert '-no_toast_offload' in START_ARG_FLAGS
    assert '-drop_watch' in START_ARG_FLAGS
