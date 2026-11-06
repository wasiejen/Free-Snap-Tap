"""U365 - pump-entry suppression control-flow pins (#364 held-trigger leak,
#365 tap-group double-send).

pynput 1.8.2 suppresses the hook event EXCLUSIVELY via exception control
flow: the filter calls ``listener.suppress_event()`` which raises
``SystemHook.SuppressException``; it must reach the hook proc
(``SystemHook._handler``, win32.py:305-308) where ``return 1`` consumes the
event. Any catch-all that swallows it ("except Exception") makes the hook
return CallNextHookEx -> the "suppressed" event passes UNFILTERED while the
sim replacement still fires: tap-group keys arrive twice (a,dd -> aa /
andd dd, #365), held-trigger auto-repeats print (held -o, -ctrl leaks o,
#364), and the physical ctrl+O reaches the app mid-write burst (app fires
its own open dialog; maintainer droplog 2026-11-06 records every swallowed
suppression as "event drop ... exc=SuppressException()").

The U345 entry catch (d5c43ba) was introduced for LEG exceptions (a leg that
dies mid-pipeline must not take the listener down); it also caught the
control-flow exception. Contract pinned here - both sides:
  (a) SuppressException: REPORTED (drop-watch keeps counting) AND re-raised
      (pynput consumes the event) -> exactly-one-emission per decision;
  (b) any other exception: still swallowed + reported (U345 H1 contract).

No real key injection: mocked pynput controllers; the listener stub raises
the REAL pynput SystemHook.SuppressException; a background loop thread plays
the macro lane.
"""
import asyncio
import logging
import threading
import time
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from pynput._util.win32 import SystemHook

from kb_helpers import build

WM_KEYDOWN = 256
WM_KEYUP = 257
WM_MOUSE_MIDDLE = 516

VK_W = 0x57
VK_A = 0x41
VK_B = 0x42
VK_O = 0x4F
VK_CTRL = 162


def key_data(vk, t, flags=0):
    return SimpleNamespace(vkCode=vk, time=t, flags=flags)


def mouse_data(t=1000, flags=0, mouse_data=0):
    return SimpleNamespace(pt=SimpleNamespace(x=0, y=0), mouseData=mouse_data,
                           flags=flags, time=t, dwExtraInfo=0)


@pytest.fixture
def live_listener(kb_env_ns):
    """kb_env_ns whose keyboard listener raises the REAL pynput suppression
    exception (the live control flow; MagicMock default never raises and is
    blind to the swallow)."""
    kb_env_ns.kb._listener.suppress_event.side_effect = SystemHook.SuppressException
    return kb_env_ns


@pytest.fixture
def loop_thread():
    loop = asyncio.new_event_loop()
    th = threading.Thread(target=loop.run_forever, daemon=True)
    th.start()
    yield loop
    loop.call_soon_threadsafe(loop.stop)
    th.join(2)
    loop.close()


def drive(kb, msg, vk, t, flags=0):
    """Returns 'SUPPRESSED' if the control-flow exception reaches the caller
    (hook proc consumes the event), 'PASSED' if it was swallowed (event
    reaches the app unfiltered)."""
    try:
        kb.keyboard_win32_event_filter(msg, key_data(vk, t, flags))
    except SystemHook.SuppressException:
        return 'SUPPRESSED'
    return 'PASSED'


def wait_for(predicate, timeout=2.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(0.005)
    return predicate()


class TestTapGroupExactlyOneEmission:
    #365: the real tap-group key must be consumed (propagate), the snap send
    # must fire exactly once - real PASSED + sim sent == double-send.

    def test_real_tap_key_consumed_one_sim_emission(self, live_listener):
        kb = live_listener.kb
        build(kb, taps=[['(TAP_1)', ['w', 'a']]])
        live_listener.kb_mock.press.reset_mock()
        assert drive(kb, WM_KEYDOWN, VK_W, 1000) == 'SUPPRESSED'
        assert live_listener.kb_mock.press.call_count == 1  # the sim replacement

    def test_repeat_stream_under_hold_emits_once(self, live_listener):
        # hold w (tap key): the auto-repeat presses that arrive while the
        # physical press_state is still True must each be consumed and must
        # never emit another sim send
        kb = live_listener.kb
        build(kb, taps=[['(TAP_1)', ['w', 'a']]])
        live_listener.kb_mock.press.reset_mock()
        assert drive(kb, WM_KEYDOWN, VK_W, 1000) == 'SUPPRESSED'
        for i in range(10):  # synthetic repeat stream while still held
            assert drive(kb, WM_KEYDOWN, VK_W, 1100 + i) == 'SUPPRESSED'
        assert live_listener.kb_mock.press.call_count == 1
        # the physical release is also consumed (the snap send releases the
        # sim key - one sim release, the real release never reaches the app)
        live_listener.kb_mock.release.reset_mock()
        assert drive(kb, WM_KEYUP, VK_W, 1200) == 'SUPPRESSED'
        assert live_listener.kb_mock.release.call_count == 1

    def test_suppression_still_reported_by_drop_watch(self, live_listener, caplog):
        kb = live_listener.kb
        build(kb, taps=[['(TAP_1)', ['w', 'a']]])
        with caplog.at_level(logging.DEBUG, logger='fst.drop'):
            assert drive(kb, WM_KEYDOWN, VK_W, 1000) == 'SUPPRESSED'
        lines = [r.getMessage() for r in caplog.records if 'event drop' in r.getMessage()]
        assert len(lines) == 1
        assert 'vk=87 press' in lines[0]
        assert 'SuppressException' in lines[0]


class TestHeldTriggerRepeatLifetime:
    #364: a physically held macro trigger key - auto-repeat presses must be
    # suppressed until the physical release, including after write() completes.

    def _build_macro(self, kb, loop_thread):
        kb.set_loop(loop_thread)
        kb.init_toast_offload(MagicMock())
        build(kb, macros=[['(m1)', [['-o', '-ctrl'], ['|(write("2026-11-06"))']]]])

    def test_trigger_press_consumed_combo_not_reached(self, live_listener, loop_thread):
        kb = live_listener.kb
        self._build_macro(kb, loop_thread)
        assert drive(kb, WM_KEYDOWN, VK_CTRL, 1000) == 'PASSED'      # ctrl passes by design
        # the o press is the trigger: consumed -> the app never sees ctrl+O,
        # so the window's own ctrl+O action cannot fire (the cut-at-2026-11
        # class rides on this leak reaching the app mid-burst)
        assert drive(kb, WM_KEYDOWN, VK_O, 1100) == 'SUPPRESSED'

    def test_repeat_stream_after_write_fully_suppressed(self, live_listener, loop_thread):
        kb = live_listener.kb
        self._build_macro(kb, loop_thread)
        # ctrl+o fires the macro; write stub returns immediately -> task done
        drive(kb, WM_KEYDOWN, VK_CTRL, 1000)
        assert drive(kb, WM_KEYDOWN, VK_O, 1100) == 'SUPPRESSED'
        assert wait_for(lambda: live_listener.kb_mock.type.call_count == 1)  # write() ran on the lane
        live_listener.kb_mock.type.reset_mock()
        live_listener.kb_mock.press.reset_mock()
        # the user keeps holding ctrl+o: the OS repeat stream must ALL be
        # suppressed until the physical release (no 'o' leak, no re-fire)
        for i in range(12):
            assert drive(kb, WM_KEYDOWN, VK_O, 1200 + i) == 'SUPPRESSED'
        assert live_listener.kb_mock.type.call_count == 0   # no macro re-fire
        assert live_listener.kb_mock.press.call_count == 0  # no stray emission
        # release passes OUT (documented release rule; clears the hold state)
        assert drive(kb, WM_KEYUP, VK_O, 1400) == 'PASSED'


class TestRebindAndMouseLegs:

    def test_rebind_source_consumed(self, live_listener):
        kb = live_listener.kb
        build(kb, rebinds=[['(r)', [['o'], 'b']]])
        live_listener.kb_mock.press.reset_mock()
        assert drive(kb, WM_KEYDOWN, VK_O, 1000) == 'SUPPRESSED'
        assert live_listener.kb_mock.press.call_count == 1  # exactly the replacement

    def test_mouse_pump_propagates_control_flow(self, kb_env_mouse, caplog):
        kb = kb_env_mouse
        kb._mouse_listener.suppress_event.side_effect = SystemHook.SuppressException
        kb._win32_event_filter = MagicMock(side_effect=SystemHook.SuppressException)
        with caplog.at_level(logging.DEBUG, logger='fst.drop'):
            with pytest.raises(SystemHook.SuppressException):
                kb.mouse_win32_event_filter(WM_MOUSE_MIDDLE, mouse_data())
        lines = [r.getMessage() for r in caplog.records if 'event drop' in r.getMessage()]
        assert len(lines) == 1  # reported AND re-raised

    def test_leg_exception_still_swallowed_u345_contract(self, live_listener, caplog):
        # U345 H1 half of the contract: a genuine leg exception must NOT
        # propagate (listener survives) - only the control-flow exception
        # re-raises. Guards against an over-broad re-raise.
        kb = live_listener.kb
        kb._win32_event_filter = MagicMock(side_effect=RuntimeError('boom'))
        with caplog.at_level(logging.DEBUG, logger='fst.drop'):
            kb.keyboard_win32_event_filter(WM_KEYDOWN, key_data(VK_A, 1000))  # no raise
        lines = [r.getMessage() for r in caplog.records if 'event drop' in r.getMessage()]
        assert len(lines) == 1
        assert "RuntimeError('boom')" in lines[0]


MSG_MOUSE_UNMAPPED = 518  # not MOVE(512), not in DOWN/UP/SCROLL sets -> get_mouse_vk_code() None

WM_MOUSE_MIDDLE_DOWN = 519


class TestRebindRepeatLetThroughAtEntry:
    # U372 #367 pin (1): the repeated-REBIND let-through (2026-09-15 ruling,
    # _rebind_repeat_let_through) driven through the PUMP ENTRY, not the inner
    # _win32_event_filter (the pre-existing pins call the inner filter directly -
    # kb_helpers.down/up). Pins the let-through / no-early-exception interaction
    # against the U365 entry arms: the repeat passes the STOP-REPEATED guard
    # WITHOUT raising, re-fires the replacement exactly once, and the only
    # SuppressException the entry arms see is the source-consumption raise
    # (report once + re-raise). RED-before: the pre-U365 entry (git show
    # eccad5f^1:fst_keyboard.py, plain swallow) returns 'PASSED' at the first
    # drive - the class fails there.

    def _seq(self, kb, kb_mock, caplog):
        build(kb, rebinds=[['(r)', [['o'], 'b']]])
        kb_mock.press.reset_mock()
        with caplog.at_level(logging.DEBUG, logger='fst.drop'):
            assert drive(kb, WM_KEYDOWN, VK_O, 1000) == 'SUPPRESSED'  # first press: consumed, replacement fires
            assert drive(kb, WM_KEYDOWN, VK_O, 1100) == 'SUPPRESSED'  # repeat while held: let through, re-fires, source consumed
        return kb_mock.press.call_count

    def test_repeat_let_through_refires_replacement_once_at_entry(self, live_listener, caplog):
        kb = live_listener.kb
        presses = self._seq(kb, live_listener.kb_mock, caplog)
        assert presses == 2  # first replacement + exactly one re-fire from the let-through repeat

    def test_repeat_let_through_reports_exactly_one_drop_per_drive(self, live_listener, caplog):
        kb = live_listener.kb
        self._seq(kb, live_listener.kb_mock, caplog)
        lines = [r.getMessage() for r in caplog.records if 'event drop' in r.getMessage()]
        assert len(lines) == 2  # ONE raise per drive (no double-report; the entry arms see only the source-consumption raise)
        assert all('vk=79 press' in l and 'SuppressException' in l for l in lines)

    def test_control_guarded_repeat_does_not_refire(self, live_listener, caplog, monkeypatch):
        # live control (green both sides, not the RED leg): with the let-through
        # function stubbed False the repeat dies at the STOP-REPEATED guard - the
        # re-fire assert above demonstrably rides _rebind_repeat_let_through.
        kb = live_listener.kb
        monkeypatch.setattr(kb, '_rebind_repeat_let_through', lambda ke: False)
        presses = self._seq(kb, live_listener.kb_mock, caplog)
        assert presses == 1  # no re-fire: the repeat was swallowed by the guard
        lines = [r.getMessage() for r in caplog.records if 'event drop' in r.getMessage()]
        assert len(lines) == 2


class TestMousePumpNoneVkSuppression:
    # U372 #367 pin (2): the mouse pump's `vk_code is None` leg (fst_keyboard.py
    # ~L788) sits OUTSIDE the U365 try: - suppress_event() on an unmapped mouse
    # message, no inner filter call, no drop report (nothing to report: there is
    # no vk_code). Pinned AS-IS (tested+reported): a refactor moving the leg
    # inside the try would emit an 'event drop' with vk=None (or swallow the
    # raise) and must trip these pins. RED-before: a scratch copy with the else
    # branch moved into the try makes the propagate-test report ('event drop'
    # line appears) and the recorder-test ... the entry arm reports vk None
    # instead of the clean raise.

    def test_none_vk_calls_suppress_event_without_inner_filter(self, kb_env_mouse):
        kb = kb_env_mouse
        kb._win32_event_filter = MagicMock()
        kb.mouse_win32_event_filter(MSG_MOUSE_UNMAPPED, mouse_data())
        assert kb._mouse_listener.suppress_event.call_count == 1
        assert kb._win32_event_filter.call_count == 0

    def test_none_vk_raise_propagates_unreported(self, kb_env_mouse, caplog):
        kb = kb_env_mouse
        kb._mouse_listener.suppress_event.side_effect = SystemHook.SuppressException
        kb._win32_event_filter = MagicMock()
        with caplog.at_level(logging.DEBUG, logger='fst.drop'):
            with pytest.raises(SystemHook.SuppressException):  # pynput consumes it (hook proc return 1)
                kb.mouse_win32_event_filter(MSG_MOUSE_UNMAPPED, mouse_data())
        lines = [r.getMessage() for r in caplog.records if 'event drop' in r.getMessage()]
        assert len(lines) == 0  # as-is: outside the try, NOTHING is reported on this leg
        assert kb._win32_event_filter.call_count == 0
