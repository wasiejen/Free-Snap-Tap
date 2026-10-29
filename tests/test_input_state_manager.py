"""Behavior tests for Input_State_Manager (press states, timing, toggles)."""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from fst_data_types import Key_Event
from fst_manager import Input_State_Manager

VK_A = 0x41
VK_B = 0x42
VK_SHIFT = 0x10
VK_LEFT_SHIFT = 160


@pytest.fixture
def sm():
    return Input_State_Manager(SimpleNamespace(output_manager=MagicMock()))


class TestPressStateDicts:
    def test_unknown_key_defaults_to_false(self, sm):
        assert sm.get_real_key_press_state(VK_A) is False
        assert sm.get_simulated_key_press_state(VK_A) is False
        assert sm.get_all_key_press_state(VK_A) is False

    def test_set_real_updates_real_and_all(self, sm):
        sm.set_real_key_press_state(VK_A, True)
        assert sm.get_real_key_press_state(VK_A) is True
        assert sm.get_all_key_press_state(VK_A) is True
        # simulated dict untouched
        assert sm.get_simulated_key_press_state(VK_A) is False

    def test_set_simulated_only_positive_vk(self, sm):
        sm.set_simulated_key_press_state(VK_A, True)
        assert sm.get_simulated_key_press_state(VK_A) is True
        assert sm.get_all_key_press_state(VK_A) is True
        # None ke (vk 0) must be ignored
        sm.set_simulated_key_press_state(0, True)
        assert sm.get_simulated_key_press_state(0) is False

    def test_all_state_independent_from_real(self, sm):
        sm.set_all_key_press_state(VK_A, True)
        assert sm.get_all_key_press_state(VK_A) is True
        assert sm.get_real_key_press_state(VK_A) is False

    def test_get_all_key_press_state_unknown_key_initializes_false(self, sm):
        # a key never written to the dict hits the KeyError branch
        assert sm.get_all_key_press_state(VK_B) is False
        assert sm._all_key_press_states_dict[VK_B] is False

    def test_all_state_is_union_of_real_and_simulated(self, sm):
        # crossing semantics: a release from either side keeps the all state
        # while the other side's press is still active (union, not last-write)
        sm.set_real_key_press_state(VK_A, True)
        sm.set_simulated_key_press_state(VK_A, True)
        assert sm.get_all_key_press_state(VK_A) is True
        # simulated release while the real press is still held -> all stays True
        sm.set_simulated_key_press_state(VK_A, False)
        assert sm.get_all_key_press_state(VK_A) is True
        # real release of the last active side -> all becomes False
        sm.set_real_key_press_state(VK_A, False)
        assert sm.get_all_key_press_state(VK_A) is False

    def test_crossing_release_from_real_side_keeps_simulated_all_state(self, sm):
        sm.set_simulated_key_press_state(VK_A, True)
        sm.set_real_key_press_state(VK_A, True)
        # real release must not clear the still-active simulated press
        sm.set_real_key_press_state(VK_A, False)
        assert sm.get_all_key_press_state(VK_A) is True
        assert sm.get_real_key_press_state(VK_A) is False
        assert sm.get_simulated_key_press_state(VK_A) is True
        # simulated release of the last active side -> all becomes False
        sm.set_simulated_key_press_state(VK_A, False)
        assert sm.get_all_key_press_state(VK_A) is False

    def test_set_real_only_positive_vk(self, sm):
        # symmetric with the simulated setter: a vk_code <= 0 is not written
        sm.set_real_key_press_state(0, True)
        assert 0 not in sm._real_key_press_states_dict
        assert 0 not in sm._all_key_press_states_dict
        assert sm.get_real_key_press_state(0) is False


class TestPressedKeysSet:
    def test_event_based_add_and_remove(self, sm):
        sm.manage_key_press_states_by_event(Key_Event(VK_A, is_press=True))
        assert sm.get_key_press_state(VK_A) is True
        sm.manage_key_press_states_by_event(Key_Event(VK_A, is_press=False))
        assert sm.get_key_press_state(VK_A) is False

    def test_remove_missing_key_is_silent(self, sm):
        sm.remove_key_press_state(VK_B)  # never pressed -> no raise
        assert sm.get_key_press_state(VK_B) is False


class TestToggleStates:
    def test_default_toggle_state_false(self, sm):
        assert sm.get_toggle_state(VK_A) is False

    def test_toggle_cycles_press_release(self, sm):
        ke = Key_Event(VK_A, is_press=True)
        first = sm.get_next_toggle_state_key_event(ke)
        assert first.is_press is True
        assert sm.get_toggle_state(VK_A) is True
        second = sm.get_next_toggle_state_key_event(ke)
        assert second.is_press is False
        assert sm.get_toggle_state(VK_A) is False

    def test_set_toggle_state_to_curr_ke_only_for_tracked_keys(self, sm):
        # untracked vk is not updated
        sm.set_toggle_state_to_curr_ke(Key_Event(VK_B, is_press=True))
        assert sm.get_toggle_state(VK_B) is False
        # once tracked (via get), the state follows the current ke
        sm.get_toggle_state(VK_A)
        sm.set_toggle_state_to_curr_ke(Key_Event(VK_A, is_press=True))
        assert sm.get_toggle_state(VK_A) is True


class TestKeyTimes:
    def test_press_then_release_stores_hold_time(self, sm):
        sm.set_key_times(1000, VK_A, True, 'real')
        sm.set_key_times(1300, VK_A, False, 'real')
        last_pressed, last_released, time_released, time_pressed = sm.time_real
        assert last_pressed[VK_A] == 1000
        assert last_released[VK_A] == 1300
        assert time_pressed[VK_A] == 300

    def test_press_after_release_stores_idle_time(self, sm):
        sm.set_key_times(1000, VK_A, False, 'real')
        sm.set_key_times(2000, VK_A, True, 'real')
        _, _, time_released, _ = sm.time_real
        assert time_released[VK_A] == 1000

    def test_first_events_without_previous_phase_do_not_raise(self, sm):
        sm.set_key_times(1000, VK_A, True, 'real')
        sm.set_key_times(2000, VK_A, False, 'real')

    def test_real_and_simulated_lists_are_independent(self, sm):
        sm.set_key_times(1000, VK_A, True, 'real')
        sm.set_key_times(1000, VK_A, True, 'simulated')
        sm.set_key_times(1200, VK_A, False, 'real')
        assert sm.time_real[3][VK_A] == 200
        assert VK_A not in sm.time_simulated[3]


class TestReleaseAllSimulated:
    def test_releases_pressed_simulated_keys_and_resets(self, sm):
        fst = sm._fst
        fst.output_manager = MagicMock()
        sm.set_simulated_key_press_state(VK_A, True)
        sm.set_simulated_key_press_state(VK_B, True)
        sm.set_simulated_key_press_state(VK_LEFT_SHIFT, False)

        sm.release_all_currently_pressed_simulated_keys()

        released = [c.args[0] for c in fst.output_manager.send_key_event.call_args_list]
        assert released == [Key_Event(VK_A, is_press=False), Key_Event(VK_B, is_press=False)]
        # state dicts are reset afterwards
        assert sm.get_simulated_key_press_state(VK_A) is False
        assert sm.get_simulated_key_press_state(VK_B) is False

    def test_releases_active_toggles(self, sm):
        fst = sm._fst
        fst.output_manager = MagicMock()
        sm.get_toggle_state(VK_SHIFT)
        sm.set_toggle_state(VK_SHIFT, True)

        sm.release_all_currently_pressed_simulated_keys()

        released = [c.args[0] for c in fst.output_manager.send_key_event.call_args_list]
        assert released == [Key_Event(VK_SHIFT, is_press=False)]
        assert sm.get_toggle_state(VK_SHIFT) is False

    def test_modifier_keys_only_released_when_actually_pressed(self, sm):
        fst = sm._fst
        fst.output_manager = MagicMock()
        sm.pressed_keys.add(VK_LEFT_SHIFT)
        sm.pressed_keys.add(VK_A)

        sm.release_all_modifier_keys()

        released = [c.args[0] for c in fst.output_manager.send_key_event.call_args_list]
        assert released == [Key_Event(VK_LEFT_SHIFT, is_press=False)]


class TestResets:
    def test_reset_states_dicts(self, sm):
        sm.set_real_key_press_state(VK_A, True)
        sm.set_simulated_key_press_state(VK_B, True)
        sm.pressed_keys.add(VK_A)
        sm.reset_states_dicts()
        assert sm._real_key_press_states_dict == {}
        assert sm._simulated_key_press_states_dict == {}
        assert sm.pressed_keys == set()

    def test_reset_all_lists_clears_toggles_too(self, sm):
        sm.get_toggle_state(VK_A)
        sm.set_toggle_state(VK_A, True)
        sm.reset_all_lists()
        assert sm._toggle_states_dict == {}
        assert sm.toggle_states_dict_keys == []


class TestStopAllRepeatingKeys:
    def test_cancels_active_repeat_handles(self):
        fst = SimpleNamespace(output_manager=MagicMock())
        sm = Input_State_Manager(fst)
        task = MagicMock()
        handle = MagicMock()
        handle.done.return_value = False
        done_handle = MagicMock()
        done_handle.done.return_value = True
        fst.output_manager.repeat_thread_dict = {
            'x': [task, handle],
            'y': [MagicMock(), done_handle],
        }

        sm.stop_all_repeating_keys()

        task.cancel_playback.assert_called_once_with()
        handle.cancel.assert_called_once_with()
        done_handle.cancel.assert_not_called()
