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
from unittest.mock import call

from pynput import keyboard as pynput_keyboard

from kb_helpers import build, down, up
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
