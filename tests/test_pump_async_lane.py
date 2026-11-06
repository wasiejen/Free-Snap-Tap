"""U364/#360 - LL-hook pump never blocks on SendInput or I/O legs.

The win32 hook callbacks must return inside LowLevelHooksTimeout; a pump
that blocks on a SendInput/clipboard/file leg risks silent hook removal
(events pass unfiltered -> leaked trigger key + app-default shortcut
mid-macro, the maintainer's fst_flow.log evidence 2026-11-04).

Lane rule under test (pump_lane, fst_manager.Output_Manager):
- caller OFF the asyncio loop thread (hook pump, test thread): the blocking
  work is scheduled on the loop lane FIFO (loop ready queue) and the caller
  returns immediately;
- caller ON the loop thread (macro playback) or NO loop (headless/legacy):
  the work runs inline = old synchronous behavior (contract lock).

Framing (honest, U359 precedent): the RED-before run (pre-change worktree at
the baseline commit) shows: lane/timing/pump_lane pins
(TestHoldRepeatStepOrder, TestCallbackDuration, TestConstraintLegLane) FAIL
pre-change - the pre-change pump runs the send inline on the callback
thread. TestFallbackContract is green pre-change BY DESIGN: it locks the
inline behavior that must stay identical when no loop lane exists.

No real input: pynput controllers mocked via kb_env_ns / om_env; the stall
is a time.sleep inside a mock side_effect (the "stalled SendInput").
"""
import asyncio
import threading
import time
from types import SimpleNamespace

from pynput import keyboard as pynput_keyboard

import pytest

from kb_helpers import build, down, up

VK_A = 0x41
VK_B = 0x42

STALL_S = 0.25
FAST_MS = 100.0


@pytest.fixture
def loop_thread():
    """Real asyncio loop on a background thread = the product's macro/toast
    lane (MainLogic.run); the test thread plays the hook pump."""
    loop = asyncio.new_event_loop()
    th = threading.Thread(target=loop.run_forever, daemon=True)
    th.start()
    yield loop
    loop.call_soon_threadsafe(loop.stop)
    th.join(2)
    loop.close()


@pytest.fixture
def om_env(fake_fst, monkeypatch):
    """Output_Manager with mocked pynput controllers (same shape as
    tests/test_output_manager.py::om_env)."""
    from unittest.mock import MagicMock
    from fst_manager import Output_Manager
    kb_mock = MagicMock()
    ms_mock = MagicMock()
    monkeypatch.setattr('pynput.keyboard.Controller', lambda: kb_mock)
    monkeypatch.setattr('pynput.mouse.Controller', lambda: ms_mock)
    manager = Output_Manager(fake_fst)
    fake_fst.output_manager = manager
    return SimpleNamespace(om=manager, kb=kb_mock, mouse=ms_mock, fst=fake_fst)


def wait_until(predicate, timeout=2.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(0.005)
    return predicate()


def stall_recorder(seen, stall=STALL_S):
    """Mock side_effect: record (thread-name, args) then stall - the stalled
    SendInput stand-in. Blocks WHATEVER thread runs it."""
    def _effect(*args, **kwargs):
        seen.append((threading.current_thread().name, args))
        time.sleep(stall)
    return _effect


def gate_recorder(kb_mock, seen, gate):
    """Mock side_effect: block until released, then record the arg.
    Gating BEFORE the recording lets the test observe "the pump returned
    while the lane unit has not touched the mock yet" without a race."""
    def _effect(*args, **kwargs):
        gate.wait(2)
        seen.append(args[0])
    kb_mock.press.side_effect = _effect
    kb_mock.release.side_effect = _effect


def kb_recorder(kb_mock, seen, stall=STALL_S):
    kb_mock.press.side_effect = stall_recorder(seen, stall)
    kb_mock.release.side_effect = stall_recorder(seen, stall)


def pump_thread_name():
    return threading.current_thread().name


def kc(vk):
    return pynput_keyboard.KeyCode.from_vk(vk)


class TestHoldRepeatStepOrder:
    """DoD 2 - the 260428-2341 hold-repeat contract survives lane routing:
    a held trigger's OS auto-repeat must not double-send, and the
    tap-group step sequence must arrive in exactly the old order."""

    def test_held_trigger_repeat_sequence_order(self, kb_env_ns, loop_thread):
        kb = kb_env_ns.kb
        kb.set_loop(loop_thread)
        build(kb, taps=[['(TAP_1)', ['a', 'b']]])
        seen = []
        gate = threading.Event()
        gate_recorder(kb_env_ns.kb_mock, seen, gate)
        # pump-thread view: the filter calls return while no send has
        # touched the controllers yet (lane unit waits gated); pre-change
        # the first down() already recorded its press on this thread
        down(kb, VK_A, 1000)
        assert seen == []
        down(kb, VK_A, 1050)  # OS auto-repeat of the held trigger
        assert seen == []
        down(kb, VK_B, 1100)  # B tapped while A held -> idealized switch
        assert seen == []
        up(kb, VK_A, 1200)    # A released -> B (already last send) stays
        assert seen == []

        gate.set()
        # lane drain: step order identical to the old synchronous pump
        assert wait_until(lambda: len(seen) == 3, timeout=2.0)
        assert seen == [kc(VK_A), kc(VK_A), kc(VK_B)]
        # release unit for the A->B switch is release(A)+press(B) in ONE
        # lane unit, so the plain recorder shows pressA | relA | pressB
        assert kb_env_ns.kb_mock.press.call_count == 2  # A once, then B
        kb_env_ns.kb_mock.press.assert_called_with(kc(VK_B))

    def test_tap_group_switch_units_not_interleaved(self, om_env, loop_thread):
        """A/B and B/A switch units keep their order within the lane even
        when a unit stalls mid-way: the FIFO lane serializes them."""
        from fst_data_types import Key, Tap_Group
        om_env.fst.loop = loop_thread
        om_env.fst.arg_manager.ACT_DELAY = False
        om_env.fst.arg_manager.ACT_CROSSOVER = False
        seen = []
        gate = threading.Event()
        gate_recorder(om_env.kb, seen, gate)

        tg = Tap_Group(keys=[Key(VK_A), Key(VK_B)])
        tg.update_tap_states(VK_A, True)
        tg.set_last_key_send(VK_A)
        tg.update_tap_states(VK_B, True)
        om_env.om.send_keys_for_tap_group(tg)  # unit 1: release A, press B

        # mid-unit: the unit is gated OFF the caller thread BEFORE it
        # touches the controller - pre-change this assert fails because the
        # whole unit ran inline (release A + press B recorded) on the
        # caller thread
        assert seen == []

        tg.update_tap_states(VK_B, False)
        tg.update_tap_states(VK_A, True)
        om_env.om.send_keys_for_tap_group(tg)  # unit 2: release B, press A
        gate.set()

        assert wait_until(lambda: len(seen) == 4, timeout=2.0)
        assert seen == [kc(VK_A), kc(VK_B), kc(VK_B), kc(VK_A)]
        # units not interleaved: unit 1 fully finished before unit 2 started


class TestCallbackDuration:
    """DoD 3 - RED-before: pre-change the stalled send runs ON the callback
    thread, so the pump callback takes >= the stall (the LowLevelHooksTimeout
    class); post-change the callback returns fast and the send lands on the
    loop thread."""

    def test_tap_send_stall_does_not_block_callback(self, kb_env_ns, loop_thread):
        kb = kb_env_ns.kb
        kb.set_loop(loop_thread)
        build(kb, taps=[['(TAP_1)', ['a']]])
        seen = []
        kb_recorder(kb_env_ns.kb_mock, seen)

        t0 = time.monotonic()
        down(kb, VK_A, 1000)
        dur_ms = (time.monotonic() - t0) * 1000
        assert dur_ms < FAST_MS, f"pump callback took {dur_ms:.0f} ms"
        assert wait_until(lambda: len(seen) >= 1, timeout=2.0)
        assert seen[0][0] != pump_thread_name()  # ran on the lane, not the pump

    def test_rebind_send_stall_does_not_block_callback(self, kb_env_ns, loop_thread):
        kb = kb_env_ns.kb
        kb.set_loop(loop_thread)
        build(kb, rebinds=[['(r)', [['a'], 'b']]])
        seen = []
        kb_recorder(kb_env_ns.kb_mock, seen)

        t0 = time.monotonic()
        down(kb, VK_A, 1000)
        dur_ms = (time.monotonic() - t0) * 1000
        assert dur_ms < FAST_MS, f"pump callback took {dur_ms:.0f} ms"
        # suppression of the source event stays synchronous on the pump
        assert kb._listener.suppress_event.call_count == 1
        assert wait_until(lambda: len(seen) >= 1, timeout=2.0)
        assert seen[0][0] != pump_thread_name()
        assert seen[0][1] == (kc(VK_B),)  # the replacement key, once


class TestConstraintLegLane:
    """Constraint-string blocking legs (SendInput/clipboard/file) run on the
    loop lane when called off-loop (pump); the caller gets the action's True
    back immediately."""

    def test_write_leg_from_pump_thread_returns_fast(self, om_env, loop_thread):
        om_env.fst.loop = loop_thread
        seen = []
        om_env.kb.type.side_effect = stall_recorder(seen)

        t0 = time.monotonic()
        result = om_env.om.constraint_evaluation(
            'write("x")', SimpleNamespace(vk_code=VK_A, is_press=True))
        dur_ms = (time.monotonic() - t0) * 1000
        assert result is True
        assert dur_ms < FAST_MS, f"constraint leg took {dur_ms:.0f} ms"
        assert wait_until(lambda: len(seen) >= 1, timeout=2.0)
        assert seen[0][0] != pump_thread_name()

    def test_mouse_move_to_var_leg_routed(self, om_env, loop_thread):
        """Reviewer P1-1 cure: the position SET inside mouse_move_to_var is
        a SendInput leg (sibling of mouse_move/mouse_move_abs) - the pump
        caller returns while the SET waits gated on the lane."""
        om_env.fst.loop = loop_thread
        gate = threading.Event()
        seen = []

        class GateMouse:
            def __init__(self):
                self._pos = (0, 0)
            @property
            def position(self):
                return self._pos
            @position.setter
            def position(self, value):
                gate.wait(2)
                seen.append(value)
                self._pos = value

        gate_mouse = GateMouse()
        om_env.om._mouse_controller = gate_mouse
        om_env.om.variables['v'] = (7, 9)

        t0 = time.monotonic()
        result = om_env.om.constraint_evaluation(
            "mouse_move_to_var('v')", SimpleNamespace(vk_code=VK_A, is_press=True))
        dur_ms = (time.monotonic() - t0) * 1000
        assert result is True
        assert dur_ms < FAST_MS, f"constraint leg took {dur_ms:.0f} ms"
        assert seen == []  # SET not applied on the caller thread
        gate.set()
        assert wait_until(lambda: len(seen) == 1, timeout=2.0)
        assert seen == [(7, 9)] and gate_mouse.position == (7, 9)

    def test_pump_lane_inline_on_loop_thread(self, om_env):
        """Macro-playback lane: ON the loop thread the leg runs inline -
        a macro sequence never races its own queued copy."""
        async def call_from_loop():
            return om_env.om.pump_lane(lambda: 'inline', 'inline_test')

        # asyncio.run makes THIS thread the running loop's thread
        assert asyncio.run(call_from_loop()) == 'inline'

    def test_pump_lane_schedules_off_loop_fifo(self, om_env, loop_thread):
        om_env.fst.loop = loop_thread
        order = []

        def make_leg(n, stall):
            def _work():
                order.append(('start', n))
                time.sleep(stall)
                order.append(('end', n))
            return _work

        # two legs submitted back to back from a non-loop (pump) thread
        t0 = time.monotonic()
        assert om_env.om.pump_lane(make_leg(1, 0.05), 'leg1') is True
        assert om_env.om.pump_lane(make_leg(2, 0.0), 'leg2') is True
        dur_ms = (time.monotonic() - t0) * 1000
        assert dur_ms < FAST_MS  # the caller never waits on the legs

        assert wait_until(lambda: len(order) >= 4, timeout=2.0)
        # FIFO within the lane: leg 1 ran fully before leg 2 started
        assert order == [('start', 1), ('end', 1), ('start', 2), ('end', 2)]


class TestFallbackContract:
    """Contract locks (green pre-change by design): without a loop lane the
    legs run inline exactly like before (headless/tests = legacy sync
    path), and the hold-repeat suppression decisions keep using the
    synchronously updated tap state."""

    def test_tap_send_inline_without_loop(self, om_env):
        from fst_data_types import Key, Tap_Group
        from unittest.mock import call
        om_env.fst.loop = None
        om_env.fst.arg_manager.ACT_DELAY = False
        om_env.fst.arg_manager.ACT_CROSSOVER = False
        tg = Tap_Group(keys=[Key(VK_A), Key(VK_B)])
        tg.update_tap_states(VK_A, True)
        tg.set_last_key_send(VK_A)
        tg.update_tap_states(VK_B, True)
        om_env.om.send_keys_for_tap_group(tg)  # loop None -> inline, as before
        assert om_env.kb.method_calls == [
            call.release(kc(VK_A)),
            call.press(kc(VK_B)),
        ]

    def test_rebind_send_still_inline_without_loop(self, kb_env_ns):
        kb = kb_env_ns.kb  # FST_Keyboard default loop is None
        build(kb, rebinds=[['(r)', [['a'], 'b']]])
        down(kb, VK_A, 1000)
        kb_env_ns.kb_mock.press.assert_called_once_with(kc(VK_B))
