"""Win32 filter entry point (keyboard_win32_event_filter) and the
is_simulated contradiction logic of FST_Keyboard._win32_event_filter.

The keyboard entry point is driven with fake msg/data namespaces and the
delegated _win32_event_filter is mocked. Simulated events go through the real
_win32_event_filter - they only update state and the mock listener, no real
input is ever emitted.
"""
from types import SimpleNamespace
from unittest.mock import MagicMock

from fst_manager import CONSTANTS

from kb_helpers import build

VK_A = 0x41
VK_B = 0x42
VK_C = 0x43


def kb_msg_data(vk=VK_A, flags=0, t=1234):
    return SimpleNamespace(vkCode=vk, time=t, flags=flags)


class TestKeyboardWin32EventFilter:
    def patch_filter(self, kb, monkeypatch):
        monkeypatch.setattr(kb, '_win32_event_filter', MagicMock())

    def test_keydown_delegates_vk_time_and_press(self, kb_env_mouse, monkeypatch):
        kb = kb_env_mouse
        self.patch_filter(kb, monkeypatch)
        kb.keyboard_win32_event_filter(256, kb_msg_data())
        kb._win32_event_filter.assert_called_once_with(VK_A, 1234, True, 0)

    def test_syskeydown_counts_as_press(self, kb_env_mouse, monkeypatch):
        kb = kb_env_mouse
        self.patch_filter(kb, monkeypatch)
        kb.keyboard_win32_event_filter(260, kb_msg_data())
        kb._win32_event_filter.assert_called_once_with(VK_A, 1234, True, 0)

    def test_keyup_delegates_release(self, kb_env_mouse, monkeypatch):
        kb = kb_env_mouse
        self.patch_filter(kb, monkeypatch)
        kb.keyboard_win32_event_filter(257, kb_msg_data())
        kb._win32_event_filter.assert_called_once_with(VK_A, 1234, False, 0)

    def test_llkhf_injected_flag_marks_event_simulated(self, kb_env_mouse, monkeypatch):
        kb = kb_env_mouse
        self.patch_filter(kb, monkeypatch)
        kb.keyboard_win32_event_filter(256, kb_msg_data(flags=0x10))
        kb._win32_event_filter.assert_called_once_with(VK_A, 1234, True, 16)


class TestSimulatedContradiction:
    """Simulated (injected) events run through the real filter; the tap-group
    contradiction logic and simulated state bookkeeping are exercised. The
    general-contradiction release interception is disabled in the source
    (241016-1101), so those events pass through unsuppressed."""

    def sim_down(self, kb, vk, t):
        kb._win32_event_filter(vk, t, True, True)

    def sim_up(self, kb, vk, t):
        kb._win32_event_filter(vk, t, False, True)

    def test_sim_press_of_empty_tap_group_passes(self, kb_env_mouse):
        kb = kb_env_mouse
        build(kb, taps=[['(TAP_1)', ['a', 'b']]])
        # fresh tap group: active key is None -> simulated key allowed
        self.sim_down(kb, VK_A, 1000)
        kb._listener.suppress_event.assert_not_called()
        assert kb.state_manager.get_simulated_key_press_state(VK_A) is True
        assert kb.state_manager.time_simulated[0][VK_A] == 1000
        assert kb.state_manager.time_all[0][VK_A] == 1000

    def test_sim_release_of_active_tap_key_is_suppressed(self, kb_env_mouse):
        kb = kb_env_mouse
        build(kb, taps=[['(TAP_1)', ['a', 'b']]])
        kb._tap_groups[0].update_tap_states(VK_A, True)  # active key: a
        self.sim_up(kb, VK_A, 1000)  # release of the active key
        kb._listener.suppress_event.assert_called_once_with()

    def test_sim_press_of_inactive_tap_key_is_suppressed(self, kb_env_mouse):
        kb = kb_env_mouse
        build(kb, taps=[['(TAP_1)', ['a', 'b']]])
        kb._tap_groups[0].update_tap_states(VK_A, True)  # active key: a
        self.sim_down(kb, VK_B, 1000)  # press of a non-active group key
        kb._listener.suppress_event.assert_called_once_with()

    def test_sim_release_outside_tap_groups_not_suppressed(self, kb_env_mouse):
        kb = kb_env_mouse
        build(kb)  # no tap groups
        self.sim_up(kb, VK_A, 1000)  # not in a tap group, not pressed
        kb._listener.suppress_event.assert_not_called()
        assert kb.state_manager.get_simulated_key_press_state(VK_A) is False

    def test_sim_release_of_still_pressed_key_reaches_check(self, kb_env_mouse):
        kb = kb_env_mouse
        build(kb)
        kb.state_manager.add_key_press_state(VK_A)
        self.sim_up(kb, VK_A, 1000)  # would release a real press
        # interception is disabled upstream: event passes through
        kb._listener.suppress_event.assert_not_called()
        assert kb.state_manager.get_simulated_key_press_state(VK_A) is False

    def test_sim_release_of_toggle_key_passes(self, kb_env_mouse):
        kb = kb_env_mouse
        build(kb)
        kb.state_manager.get_toggle_state(VK_C)  # register C as toggle key
        self.sim_up(kb, VK_C, 1000)
        kb._listener.suppress_event.assert_not_called()

    def test_debug2_prints_contradiction_diagnostics(self, kb_env_mouse, capsys):
        kb = kb_env_mouse
        CONSTANTS.DEBUG2 = True
        build(kb)
        kb.state_manager.add_key_press_state(VK_A)
        self.sim_up(kb, VK_A, 1000)  # -> D2 press-state diagnostics
        kb.state_manager.get_toggle_state(VK_C)
        self.sim_up(kb, VK_C, 2000)  # -> D2 not suppressed (toggle)
        out = capsys.readouterr().out
        assert 'D2: ' in out
        assert 'D2 not suppressed' in out
