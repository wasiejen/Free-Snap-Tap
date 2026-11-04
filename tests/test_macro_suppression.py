"""U359 - hook-event suppression coverage for macros, rebinding and tap groups.

Synthetic raw win32 hook events (msg + data with a flags word) are fed to the
keyboard wrapper - no real keyboard, no SendInput, pynput controllers mocked.

The flags word is the point of this file: the wrapper decodes
is_simulated from data.flags. For keyboard events LLKHF_INJECTED = 0x04 marks
events FST itself injected (macro write lane, rebind replacement, tap sends,
modifier releases); LLKHF_ALTDOWN = 0x10 is the alt state. A wrapper that
reads 0x10 classifies every FST-injected keyboard event as REAL: the real leg
then flips the real press state of a physically held modifier to released
(the macro's write lane releases ctrl through release_modifier) - the
suppression window of ctrl+<trigger> closes mid-macro, the next trigger press
is no longer recognized and lands in the focused app (the maintainer's
"trigger key leaks into the typed output" + "the original shortcut fires").

Coverage per action class (all three untested for suppression before U359):
macro, rebind, tap group - plus the pump contract: a macro task stalled in
its write lane (loop thread) and a saturated toast offload queue must never
block the suppression on the hook pump. A/B: both toast-offload modes
(-no_toast_offload switch = CONSTANTS.TOAST_OFFLOAD) take the same path for
the suppression lane, so every test runs in both modes.
"""
import asyncio
import threading
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from kb_helpers import build

VK_W = 0x57
VK_A = 0x41
VK_B = 0x42
VK_I = 0x49
VK_O = 0x4F
VK_CTRL = 162          # left_control, in Input_State_Manager.ALL_MODIFIER_KEYS

WM_KEYDOWN = 256
WM_KEYUP = 257

LLKHF_INJECTED = 0x04  # keyboard injected flag (SendInput)
LLKHF_UP = 0x20        # keyboard release flag
LLKHF_ALTDOWN = 0x10   # alt state bit - NOT the injected bit


def key_data(vk, t, flags=0):
    return SimpleNamespace(vkCode=vk, time=t, flags=flags)


def raw_press(kb, vk, t, flags=0):
    kb.keyboard_win32_event_filter(WM_KEYDOWN, key_data(vk, t, flags))


def raw_release(kb, vk, t, flags=0):
    kb.keyboard_win32_event_filter(WM_KEYUP, key_data(vk, t, flags))


@pytest.fixture
def loop_thread():
    """Real asyncio loop on a background thread = the product's macro/toast
    pump thread (MainLogic.run in GUI mode); the test thread plays the hook
    pump."""
    loop = asyncio.new_event_loop()
    th = threading.Thread(target=loop.run_forever, daemon=True)
    th.start()
    yield loop
    loop.call_soon_threadsafe(loop.stop)
    th.join(2)
    loop.close()


@pytest.fixture(params=[True, False], ids=['offload_on', 'no_toast_offload'])
def offload_mode(request):
    from fst_manager import CONSTANTS
    CONSTANTS.TOAST_OFFLOAD = request.param
    return request.param


class TestMacroSuppressionWindow:
    """Macro class: the injected ctrl release of the write lane must keep the
    ctrl+trigger suppression window open (the physical ctrl is still held)."""

    def test_injected_modifier_release_keeps_suppression_window(
            self, kb_env_ns, loop_thread, offload_mode):
        kb = kb_env_ns.kb
        kb.set_loop(loop_thread)
        kb.init_toast_offload(MagicMock())
        build(kb, macros=[['(m1)', [['-o', '-ctrl', '+alt'],
                                    ['|(write("2026-11-04_19-16"))']]]])
        # stall the write lane (the product: SendInput blocked on the app queue)
        stalled = threading.Event()
        release = threading.Event()

        def stall_type(text):
            stalled.set()
            release.wait(2)

        kb_env_ns.kb_mock.type.side_effect = stall_type
        kb._listener.suppress_event.reset_mock()
        try:
            raw_press(kb, VK_CTRL, 1000)          # real ctrl down -> passes
            assert kb.state_manager.get_real_key_press_state(VK_CTRL) is True
            raw_press(kb, VK_O, 1100)             # ctrl+o -> trigger fires
            # suppression active at macro start: the 'o' press is swallowed
            assert kb._listener.suppress_event.call_count == 1
            # the macro task (loop thread) enters the write lane:
            # release_modifier() injected a ctrl release, then type() stalls
            assert stalled.wait(2) is True
            assert kb_env_ns.kb_mock.release.call_count == 1
            # the OS re-delivers FST's injected ctrl release through the hook
            raw_release(kb, VK_CTRL, 1200, flags=LLKHF_INJECTED | LLKHF_UP)
            # suppression window stays OPEN: the PHYSICAL ctrl is still held;
            # the injected release belongs to the simulated leg
            assert kb.state_manager.get_real_key_press_state(VK_CTRL) is True
            assert VK_CTRL in kb.state_manager.pressed_keys
            # toast activity piles up on the stalled loop (offload queue)
            for i in range(70):
                kb.toast_callback(f"t{i}", 1, 12, "bg", "fg")
            # second trigger press mid-macro -> still suppressed, pump non-blocking
            raw_press(kb, VK_O, 1300)
            assert kb._listener.suppress_event.call_count == 2
            assert stalled.is_set()               # task still in write lane
        finally:
            release.set()

    def test_second_trigger_press_mid_write_is_interrupt_and_restart(
            self, kb_env_ns, loop_thread, offload_mode):
        """The mid-write interrupt: the stalled task is cancelled by the next
        press and the new task runs after the stall ends (both modes)."""
        kb = kb_env_ns.kb
        kb.set_loop(loop_thread)
        kb.init_toast_offload(MagicMock())
        build(kb, macros=[['(m2)', [['-i', '-ctrl'],
                                    ['|(write(date_time()))']]]])
        entered = threading.Event()
        release = threading.Event()
        typed = []

        def stall_type(text):
            typed.append(text)
            entered.set()
            release.wait(2)

        kb_env_ns.kb_mock.type.side_effect = stall_type
        kb._listener.suppress_event.reset_mock()
        try:
            raw_press(kb, VK_CTRL, 1000)
            raw_press(kb, VK_I, 1100)             # fires macro 2
            assert entered.wait(2) is True
            assert kb._listener.suppress_event.call_count == 1
            # second press mid-write: 'i' suppressed, running task interrupted
            raw_press(kb, VK_I, 1200)
            assert kb._listener.suppress_event.call_count == 2
            handle = kb.macro_thread_dict['m2']
            assert handle is not None
        finally:
            release.set()


class TestRebindSuppression:
    """Rebind class: FST's injected replacement event must not re-run the real
    leg (no re-fire, no state clobber) - it belongs to the simulated leg."""

    def test_injected_replacement_lands_in_simulated_leg(
            self, kb_env_ns, offload_mode):
        kb = kb_env_ns.kb
        build(kb, rebinds=[['(r)', [['-a'], '-b']]])
        kb._listener.suppress_event.reset_mock()
        raw_press(kb, VK_A, 1000)                 # a -> b, source suppressed
        assert kb._listener.suppress_event.call_count == 1
        assert kb_env_ns.kb_mock.press.call_count == 1   # replacement sent
        # FST's injected 'b' press re-enters the hook as INJECTED
        raw_press(kb, VK_B, 1100, flags=LLKHF_INJECTED)
        # no re-fire through the real leg: the send count stays at 1
        assert kb_env_ns.kb_mock.press.call_count == 1
        # press state: simulated dict YES, real dict NO
        assert kb.state_manager.get_simulated_key_press_state(VK_B) is True
        assert kb.state_manager.get_real_key_press_state(VK_B) is False
        assert kb._listener.suppress_event.call_count == 1   # no second suppression


class TestTapGroupSuppression:
    """Tap-group class: the injected snap send must not feed the tap state a
    second time (no send churn, real press state untouched)."""

    def test_injected_snap_send_does_not_double_update(
            self, kb_env_ns, offload_mode):
        kb = kb_env_ns.kb
        build(kb, taps=[['(TAP_1)', ['w', 'a']]])
        kb._listener.suppress_event.reset_mock()
        raw_press(kb, VK_W, 1000)     # snap tap: real w suppressed, w sent
        assert kb._listener.suppress_event.call_count == 1
        n_calls = len(kb_env_ns.kb_mock.method_calls)
        # FST's injected w press re-enters the hook as INJECTED
        raw_press(kb, VK_W, 1100, flags=LLKHF_INJECTED)
        # tap state is fed by the event stream ONLY through real events
        assert len(kb_env_ns.kb_mock.method_calls) == n_calls
        assert kb.state_manager.get_simulated_key_press_state(VK_W) is True
        # the PHYSICAL w is still held: the injected events must not clear the
        # real press state (the repeat-suppression window of the tap trigger)
        assert kb.state_manager.get_real_key_press_state(VK_W) is True


class TestPumpContract:
    """Suppression on the hook pump never waits for the macro/toast loop."""

    def test_suppression_survives_stalled_loop_and_toast_overflow(
            self, kb_env_ns, loop_thread, offload_mode):
        kb = kb_env_ns.kb
        kb.set_loop(loop_thread)
        bridge = MagicMock()
        kb.init_toast_offload(bridge)
        build(kb, macros=[['(m3)', [['-o', '-ctrl'],
                                    ['|(write("x"))']]]])
        stalled = threading.Event()
        release = threading.Event()

        def stall_type(text):
            stalled.set()
            release.wait(2)

        kb_env_ns.kb_mock.type.side_effect = stall_type
        kb._listener.suppress_event.reset_mock()
        try:
            raw_press(kb, VK_CTRL, 1000)
            raw_press(kb, VK_O, 1100)
            assert stalled.wait(2) is True
            # toast activity on the stalled loop: queue fills, pump cannot drain
            for i in range(70):
                kb.toast_callback(f"t{i}", 1, 12, "bg", "fg")
            # the pump suppresses the next trigger press without touching the loop
            raw_press(kb, VK_O, 1200)
            assert kb._listener.suppress_event.call_count == 2
            # injected modifier release of the stalled task -> window stays open
            raw_release(kb, VK_CTRL, 1300, flags=LLKHF_INJECTED | LLKHF_UP)
            assert kb.state_manager.get_real_key_press_state(VK_CTRL) is True
        finally:
            release.set()
