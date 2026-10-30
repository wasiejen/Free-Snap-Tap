"""Tap-group drop/reconcile tests (proposal 2026-10-31_fst-tap-group-repeat-hardening).

Part (a) repro unit: a scripted multi-key hold simulation that documents the
stale pressed=1 state when a real release event never reaches the filter
(Windows input-queue drop). The filter takes events at face value - nothing
outside the event stream ever heals `Tap_Group.states`.

Repro evidence (measured on main @ afbc247, option-less code): after the
dropped `up(b)`, `states[b] == 1`, `active_key == VK_B` and `last_key_send
== VK_B` persist through all later real events; the idealized output stream
re-presses VK_B on every re-release of VK_A - the stuck cycle the maintainer
observed ("stuck until re-pressed and re-released").
"""
from unittest.mock import MagicMock, call

from pynput import keyboard as pynput_keyboard

from kb_helpers import build, down, up
from fst_manager import CONSTANTS
from vk_codes import vk_codes_dict

VK_A = vk_codes_dict['a']
VK_B = vk_codes_dict['b']


class TestStuckTapKeyRepro:
    """Green against the current (pre-reconcile) code: documents the bug."""

    def _hold_a_and_b_with_dropped_b_release(self, kb, kb_mock):
        """down a, down b, then the real release of b is dropped: the
        filter never receives it (no call - the queue dropped the event)."""
        build(kb, taps=[['(TAP_1)', ['a', 'b']]])
        code = pynput_keyboard.KeyCode.from_vk
        down(kb, VK_A, 1000)
        down(kb, VK_B, 2000)
        assert kb_mock.method_calls == [
            call.press(code(VK_A)),
            call.release(code(VK_A)), call.press(code(VK_B)),
        ]

    def test_stale_pressed_state_after_dropped_release(self, kb_env_ns):
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        self._hold_a_and_b_with_dropped_b_release(kb, kb_mock)

        up(kb, VK_A, 3000)  # a's real release arrives; b stays stale

        tg = kb._tap_groups[0]
        assert tg.get_states()[VK_B] == 1
        assert tg.get_active_key() == VK_B
        assert tg.get_last_key_send() == VK_B
        # no release of b was ever emitted - the game keeps b pressed
        code = pynput_keyboard.KeyCode.from_vk
        assert kb_mock.method_calls == [
            call.press(code(VK_A)),
            call.release(code(VK_A)), call.press(code(VK_B)),
        ]

    def test_stuck_cycle_never_self_heals(self, kb_env_ns):
        """Re-pressing/re-releasing a never clears the stale b state; each
        cycle re-presses b in the idealized stream (maintainer observation:
        stuck until re-pressed and re-released)."""
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        self._hold_a_and_b_with_dropped_b_release(kb, kb_mock)

        up(kb, VK_A, 3000)     # stale b: nothing sent (b == last_key_send)
        down(kb, VK_A, 4000)   # re-press a: idealized release b, press a
        up(kb, VK_A, 5000)     # re-release a: idealized release a, press b

        tg = kb._tap_groups[0]
        assert tg.get_states()[VK_B] == 1
        assert tg.get_active_key() == VK_B
        code = pynput_keyboard.KeyCode.from_vk
        assert kb_mock.method_calls == [
            call.press(code(VK_A)),
            call.release(code(VK_A)), call.press(code(VK_B)),
            call.release(code(VK_B)), call.press(code(VK_A)),
            call.release(code(VK_A)), call.press(code(VK_B)),
        ]


class TestReconcileOption:
    """Option RECONCILE_TAP_STATES (packet b2): event-time reconciliation of
    Tap_Group.states against GetAsyncKeyState. Default OFF; reconciled drops
    reported debug-only (packet c)."""

    def make_fake_os(self, kb, monkeypatch):
        """OS ground truth: a pressed-vk set maintained in the test body -
        a queue drop = a transition the filter never sees."""
        pressed = set()

        def fake_os_key_pressed(vk_code):
            return vk_code in pressed

        monkeypatch.setattr(kb, '_os_key_pressed', fake_os_key_pressed)
        return pressed

    def _hold_a_and_b_with_dropped_b_release(self, kb, pressed, t_a=1000, t_b=2000):
        build(kb, taps=[['(TAP_1)', ['a', 'b']]])
        pressed.add(VK_A)
        down(kb, VK_A, t_a)
        pressed.add(VK_B)
        down(kb, VK_B, t_b)
        pressed.discard(VK_B)  # b physically released; event dropped

    def test_default_off_keeps_behavior_identical(self, kb_env_ns):
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        assert kb.arg_manager.RECONCILE_TAP_STATES is False
        build(kb, taps=[['(TAP_1)', ['a', 'b']]])
        code = pynput_keyboard.KeyCode.from_vk
        down(kb, VK_A, 1000)
        down(kb, VK_B, 2000)
        up(kb, VK_A, 3000)  # b release dropped; option OFF -> stale persists
        tg = kb._tap_groups[0]
        assert tg.get_states()[VK_B] == 1
        assert tg.get_active_key() == VK_B
        assert kb_mock.method_calls == [
            call.press(code(VK_A)),
            call.release(code(VK_A)), call.press(code(VK_B)),
        ]

    def test_reconcile_on_heals_dropped_release(self, kb_env_ns, monkeypatch):
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        pressed = self.make_fake_os(kb, monkeypatch)
        kb.arg_manager.RECONCILE_TAP_STATES = True
        code = pynput_keyboard.KeyCode.from_vk
        self._hold_a_and_b_with_dropped_b_release(kb, pressed)
        pressed.discard(VK_A)
        up(kb, VK_A, 3000)  # any tap event reconciles the stale b
        tg = kb._tap_groups[0]
        assert tg.get_states()[VK_B] == 0
        assert tg.get_active_key() is None
        assert kb_mock.method_calls == [
            call.press(code(VK_A)),
            call.release(code(VK_A)), call.press(code(VK_B)),
            call.release(code(VK_B)),  # healed: the stuck b gets released
        ]

    def test_reconcile_on_normal_sequence_unchanged(self, kb_env_ns, monkeypatch):
        """With exact OS truth the idealization sequence stays identical:
        last-pressed wins and suppression paths untouched by reconciliation."""
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        pressed = self.make_fake_os(kb, monkeypatch)
        kb.arg_manager.RECONCILE_TAP_STATES = True
        code = pynput_keyboard.KeyCode.from_vk
        build(kb, taps=[['(TAP_1)', ['a', 'b']]])
        pressed.add(VK_A)
        down(kb, VK_A, 1000)
        pressed.add(VK_B)
        down(kb, VK_B, 2000)
        pressed.discard(VK_B)
        up(kb, VK_B, 3000)  # a still physically held
        pressed.discard(VK_A)
        up(kb, VK_A, 4000)
        assert kb_mock.method_calls == [
            call.press(code(VK_A)),
            call.release(code(VK_A)), call.press(code(VK_B)),
            call.release(code(VK_B)), call.press(code(VK_A)),
            call.release(code(VK_A)),
        ]
        assert kb._listener.suppress_event.call_count == 4
        tg = kb._tap_groups[0]
        assert tg.get_states()[VK_A] == 0
        assert tg.get_states()[VK_B] == 0

    def test_reconciled_drop_reported_debug_only(self, kb_env_ns, monkeypatch):
        kb = kb_env_ns.kb
        pressed = self.make_fake_os(kb, monkeypatch)
        kb.arg_manager.RECONCILE_TAP_STATES = True
        kb.toast_callback = MagicMock()
        self._hold_a_and_b_with_dropped_b_release(kb, pressed)
        pressed.discard(VK_A)
        CONSTANTS.DEBUG_TAP_RECONCILE = True
        up(kb, VK_A, 3000)
        assert kb.toast_callback.call_count == 1
        msg = kb.toast_callback.call_args[0][0]
        assert msg.startswith('[FST]')
        # normal runs (debug off) never notify: a second drop stays silent
        kb.toast_callback.reset_mock()
        CONSTANTS.DEBUG_TAP_RECONCILE = False
        pressed.add(VK_B)
        down(kb, VK_B, 5000)  # b pressed again (new real event)
        pressed.discard(VK_B)  # b release dropped a second time
        pressed.add(VK_A)
        down(kb, VK_A, 6000)  # a tap event reconciles b - silently
        assert kb.toast_callback.call_count == 0

    def test_start_arguments_enable_option(self, kb_env_ns):
        am = kb_env_ns.kb.arg_manager
        am.apply_start_arguments(['-tap_reconcile', '-debug_tap_reconcile'])
        assert am.RECONCILE_TAP_STATES is True
        assert CONSTANTS.DEBUG_TAP_RECONCILE is True
        # focus-change reset returns the instance to the class default OFF
        # (start args are re-applied afterwards, keeping the opt set)
        am.reset_global_variable_changes()
        assert am.RECONCILE_TAP_STATES is False

    def test_os_key_pressed_real_ctypes(self, kb_env_ns):
        # sanity check of the real ctypes leg: the test harness runs without
        # physical input, so no key reads pressed
        assert kb_env_ns.kb._os_key_pressed(VK_A) is False
