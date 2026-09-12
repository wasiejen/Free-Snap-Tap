"""Behavior tests for Output_Manager constraint/evaluation semantics (Phase 2).

Time-based eval is pinned against fst_manager.py (constraint_evaluation) and
Input_State_Manager timing semantics. pynput controllers are mocked - no real
keys are ever emitted. Wall-clock dependent eval (last()) is frozen with
freezegun.
"""
import sys
from time import time
from unittest.mock import MagicMock, call

import asyncio
from pynput import keyboard as pynput_keyboard
from pynput import mouse as pynput_mouse
import pytest
from freezegun import freeze_time
from types import SimpleNamespace

import fst_manager
from fst_data_types import Key, Key_Event, Tap_Group
from fst_manager import Output_Manager

VK_A = 0x41
VK_B = 0x42
VK_SHIFT = 160


def convert(key):
    try:
        return {'a': VK_A, 'b': VK_B, 'shift': VK_SHIFT}[key]
    except KeyError:
        return int(key)


@pytest.fixture
def om_env(fake_fst, monkeypatch):
    kb_mock = MagicMock()
    ms_mock = MagicMock()
    monkeypatch.setattr('pynput.keyboard.Controller', lambda: kb_mock)
    monkeypatch.setattr('pynput.mouse.Controller', lambda: ms_mock)
    manager = Output_Manager(fake_fst)
    fake_fst.output_manager = manager
    return SimpleNamespace(om=manager, kb=kb_mock, mouse=ms_mock, fst=fake_fst)


def make_ke(key='a', is_press=True, constraints=None):
    return Key_Event(convert(key), is_press=is_press,
                     constraints=constraints if constraints is not None else [0, 0])


def seed_real_holds(sm):
    """Real timing seed: release@1000, press@2000, release@2500 -> idle=1000, hold=500."""
    sm.set_key_times(1000, VK_A, False, 'real')
    sm.set_key_times(2000, VK_A, True, 'real')
    sm.set_key_times(2500, VK_A, False, 'real')


class TestTimingEval:
    def test_tr_press_gives_idle_time(self, om_env):
        seed_real_holds(om_env.fst.state_manager)
        assert om_env.om.constraint_evaluation('tr("-a")', make_ke()) == 1000

    def test_tr_release_gives_hold_time(self, om_env):
        seed_real_holds(om_env.fst.state_manager)
        assert om_env.om.constraint_evaluation('tr("+a")', make_ke(is_press=False)) == 500

    def test_tr_without_previous_event_returns_zero(self, om_env):
        assert om_env.om.constraint_evaluation('tr("+a")', make_ke(is_press=False)) == 0
        assert om_env.om.constraint_evaluation('tr("-a")', make_ke()) == 0

    def test_ts_reads_simulated_list_only(self, om_env):
        sm = om_env.fst.state_manager
        sm.set_key_times(1000, VK_A, True, 'simulated')
        sm.set_key_times(1600, VK_A, False, 'simulated')
        assert om_env.om.constraint_evaluation('ts("+a")', make_ke(is_press=False)) == 600
        assert om_env.om.constraint_evaluation('tr("+a")', make_ke(is_press=False)) == 0

    def test_ta_reads_all_list_independent_of_simulated(self, om_env):
        sm = om_env.fst.state_manager
        sm.set_key_times(1000, VK_A, True, 'all')
        sm.set_key_times(1400, VK_A, False, 'all')
        assert om_env.om.constraint_evaluation('ta("+a")', make_ke(is_press=False)) == 400
        # 'all' times must not leak into the simulated list
        assert om_env.om.constraint_evaluation('ts("+a")', make_ke(is_press=False)) == 0

    def test_last_press_and_release_wall_clock(self, om_env):
        with freeze_time('2020-01-01 00:00:00'):
            om_env.fst.TIME_DIFF = 0
            sm = om_env.fst.state_manager
            now_ms = int(time() * 1000)
            sm._time_real[0][VK_A] = now_ms - 1500
            sm._time_real[1][VK_A] = now_ms - 500
            assert om_env.om.constraint_evaluation('last("-a")', make_ke()) == 1500
            assert om_env.om.constraint_evaluation('last("+a")', make_ke()) == 500

    def test_last_without_events_returns_zero(self, om_env):
        assert om_env.om.constraint_evaluation('last("-a")', make_ke()) == 0


class TestStateEval:
    def test_p_and_r_real_state(self, om_env):
        sm = om_env.fst.state_manager
        ke = make_ke()
        assert om_env.om.constraint_evaluation("p('a')", ke) is False
        assert om_env.om.constraint_evaluation("r('a')", ke) is True
        sm.set_real_key_press_state(VK_A, True)
        assert om_env.om.constraint_evaluation("p('a')", ke) is True
        assert om_env.om.constraint_evaluation("r('a')", ke) is False

    def test_ap_ar_all_state_independent_of_real(self, om_env):
        sm = om_env.fst.state_manager
        ke = make_ke()
        sm.set_all_key_press_state(VK_A, True)
        assert om_env.om.constraint_evaluation("ap('a')", ke) is True
        assert om_env.om.constraint_evaluation("ar('a')", ke) is False
        # simulated-only state must not leak into p()
        assert om_env.om.constraint_evaluation("p('a')", ke) is False

    def test_state_shorthand_constraints(self, om_env):
        sm = om_env.fst.state_manager
        ke = make_ke()
        sm.set_real_key_press_state(VK_SHIFT, True)
        assert om_env.om.constraint_evaluation('-shift', ke) is True
        assert om_env.om.constraint_evaluation('+shift', ke) is False
        assert om_env.om.constraint_evaluation('!shift', ke) is False

    def test_unknown_key_state_constraint_fails(self, om_env):
        # unknown key string in a state constraint fails the constraint (fail-closed)
        assert om_env.om.check_constraint_fulfillment(
            Key_Event(VK_A, constraints=['-zz_unknown'])) is False


class TestDoubleClickAndCounterstrafe:
    def test_dc_returns_interval_between_same_phase_events(self, om_env):
        seed_real_holds(om_env.fst.state_manager)
        # idle 1000 (time_released) + hold 500 (time_pressed) = 1500
        assert om_env.om.constraint_evaluation('dc()', make_ke()) == 1500

    def test_dc_unknown_key_sentinel(self, om_env):
        assert om_env.om.constraint_evaluation('dc()', Key_Event(VK_A)) == 9999

    def test_dc_key_string_sign_is_ignored(self, om_env):
        seed_real_holds(om_env.fst.state_manager)
        assert om_env.om.constraint_evaluation('dc("-a")', make_ke()) == 1500
        assert om_env.om.constraint_evaluation('dc("+a")', make_ke(is_press=False)) == 1500

    def test_cs_polynomial_below_500ms(self, om_env):
        om_env.fst.state_manager._time_real[3][VK_A] = 100  # hold = 100
        # velocity = -0.001*100^2 + 0.97*100 + 12 = 99 -> breaktime 39.6 -> 40
        assert om_env.om.constraint_evaluation('cs("+a")', make_ke(is_press=False)) == 40

    def test_cs_capped_at_100ms_above_500ms(self, om_env):
        om_env.fst.state_manager._time_real[3][VK_A] = 600
        assert om_env.om.constraint_evaluation('cs("+a")', make_ke(is_press=False)) == 100

    def test_csl_linear(self, om_env):
        om_env.fst.state_manager._time_real[3][VK_A] = 200
        assert om_env.om.constraint_evaluation('csl("+a")', make_ke(is_press=False)) == 40
        om_env.fst.state_manager._time_real[3][VK_A] = 700
        assert om_env.om.constraint_evaluation('csl("+a")', make_ke(is_press=False)) == 100


class TestConstraintChaining:
    def test_false_shortcuts(self, om_env):
        ke = make_ke()
        assert om_env.om.constraint_evaluation('!', ke) is False
        assert om_env.om.constraint_evaluation('', ke) is False

    def test_python_expressions_float_int_and_negative_clamp(self, om_env):
        ke = make_ke()
        assert om_env.om.constraint_evaluation('(2.5)', ke) == 2
        assert om_env.om.constraint_evaluation('(-5)', ke) == 0
        assert om_env.om.constraint_evaluation('pow(2, 3)', ke) == 8

    def test_chaining_collects_int_constraints_as_delays(self, om_env):
        ke = Key_Event(VK_A, constraints=[100, 50])
        fulfilled, delays = om_env.om.check_constraint_fulfillment(ke, get_also_delays=True)
        assert fulfilled is True
        assert delays == [100, 50]

    def test_chaining_short_circuits_on_false(self, om_env):
        # first constraint False -> second (side-effecting invocation) must not run
        ke = Key_Event(VK_A, constraints=["p('a')", 'release_all_keys()'])
        fulfilled, delays = om_env.om.check_constraint_fulfillment(ke, get_also_delays=True)
        assert fulfilled is False
        assert delays == []
        om_env.fst.release_all_currently_pressed_simulated_keys.assert_not_called()

    def test_chaining_runs_invocation_when_true(self, om_env):
        sm = om_env.fst.state_manager
        sm.set_real_key_press_state(VK_A, True)
        ke = Key_Event(VK_A, constraints=["p('a')", 'release_all_keys()'])
        fulfilled, _ = om_env.om.check_constraint_fulfillment(ke, get_also_delays=True)
        assert fulfilled is True
        om_env.fst.release_all_currently_pressed_simulated_keys.assert_called_once_with()


class TestInvocations:
    def test_release_all_keys(self, om_env):
        assert om_env.om.constraint_evaluation('release_all_keys()', make_ke()) is True
        om_env.fst.release_all_currently_pressed_simulated_keys.assert_called_once_with()

    def test_sequence_name_invocation_resets_sequence(self, om_env):
        om_env.fst.macro_sequence_alias_list = ['my_seq']
        ke = make_ke()
        assert om_env.om.constraint_evaluation('my_seq', ke) is True
        om_env.fst.reset_macro_sequence_by_name.assert_called_once_with('my_seq', ke)

    def test_macro_name_invocation_interrupts(self, om_env):
        om_env.fst.macro_thread_dict = {'aiming': MagicMock()}
        assert om_env.om.constraint_evaluation('aiming', make_ke()) is True
        om_env.fst.interrupt_macro_by_name.assert_called_once_with('aiming')

    def test_stop_repeat_unknown_alias_is_silent(self, om_env):
        assert om_env.om.constraint_evaluation("stop_repeat('nope')", make_ke()) is True

    def test_toggle_repeat_starts_then_stops(self, om_env, monkeypatch):
        mock_task = MagicMock()
        monkeypatch.setattr(fst_manager, 'Macro_Repeat_Task', lambda *a, **k: mock_task)
        started = []

        def fake_run_coroutine_threadsafe(coro, loop):
            handle = MagicMock()
            handle.done.return_value = False
            started.append(handle)
            return handle

        monkeypatch.setattr(asyncio, 'run_coroutine_threadsafe', fake_run_coroutine_threadsafe)
        ke = make_ke()
        assert om_env.om.constraint_evaluation("toggle_repeat('scan', 6500)", ke) is True
        task, handle = om_env.om.repeat_thread_dict['scan']
        assert task is mock_task
        assert started == [handle]

        # second invocation while running -> stop
        assert om_env.om.constraint_evaluation("toggle_repeat('scan', 6500)", ke) is True
        mock_task.cancel_playback.assert_called_once_with()
        handle.cancel.assert_called_once_with()

        # stop_repeat on the running repeat -> second cancel
        assert om_env.om.constraint_evaluation("stop_repeat('scan')", ke) is True
        assert handle.cancel.call_count == 2

    def test_stop_all_repeat_cancels_only_running(self, om_env):
        running = MagicMock()
        running.done.return_value = False
        done = MagicMock()
        done.done.return_value = True
        om_env.om.repeat_thread_dict = {'a': [MagicMock(), running], 'b': [MagicMock(), done]}
        assert om_env.om.constraint_evaluation('stop_all_repeat()', make_ke()) is True
        running.cancel.assert_called_once_with()
        done.cancel.assert_not_called()

    def test_reset_repeat_running(self, om_env):
        task = MagicMock()
        handle = MagicMock()
        handle.done.return_value = False
        om_env.om.repeat_thread_dict['scan'] = [task, handle]
        assert om_env.om.constraint_evaluation("reset_repeat('scan')", make_ke()) is True
        task.reset.assert_called_once_with()
        # unknown alias -> silent True
        assert om_env.om.constraint_evaluation("reset_repeat('nope')", make_ke()) is True

    def test_malformed_repeat_entry_does_not_raise(self, om_env, monkeypatch):
        # a non-2-tuple repeat_thread_dict entry raises ValueError on unpack -
        # it must not propagate out of any of the five repeat constraint methods
        monkeypatch.setattr(fst_manager, 'Macro_Repeat_Task', lambda *a, **k: MagicMock())
        monkeypatch.setattr(asyncio, 'run_coroutine_threadsafe',
                            lambda coro, loop: MagicMock())
        om = om_env.om
        ke = make_ke()
        # 1-element entries: "not enough values to unpack" -> ValueError
        om.repeat_thread_dict['stop'] = [MagicMock()]
        om.repeat_thread_dict['active'] = [MagicMock()]
        om.repeat_thread_dict['reset'] = [MagicMock()]
        om.repeat_thread_dict['toggle'] = [MagicMock()]
        # 3-element entry: "too many values to unpack" -> ValueError
        om.repeat_thread_dict['all'] = [MagicMock(), MagicMock(), MagicMock()]
        assert om.constraint_evaluation("stop_repeat('stop')", ke) is True
        assert om.constraint_evaluation("is_repeat_active('active')", ke) is False
        assert om.constraint_evaluation("reset_repeat('reset')", ke) is True
        # ValueError path -> except -> start_repeat replaces the malformed entry
        assert om.constraint_evaluation("toggle_repeat('toggle', 650)", ke) is True
        assert om.constraint_evaluation('stop_all_repeat()', ke) is True

    def test_variable_roundtrip(self, om_env):
        om = om_env.om
        ke = make_ke()
        assert om.constraint_evaluation("set('hp', 5)", ke) is True
        assert om.constraint_evaluation("get('hp')", ke) == 5
        assert om.constraint_evaluation("is_set('hp')", ke) is True
        assert om.constraint_evaluation("is_set('nope')", ke) is False
        assert om.constraint_evaluation("incr('hp')", ke) is True
        assert om.constraint_evaluation("get('hp')", ke) == 6
        assert om.constraint_evaluation("check('hp', 6)", ke) is True
        assert om.constraint_evaluation("clear('hp')", ke) is True
        assert om.constraint_evaluation("is_set('hp')", ke) is False

    def test_show_message_routes_to_toast(self, om_env):
        assert om_env.om.constraint_evaluation('show_message("hi")', make_ke()) is True
        om_env.fst.toast_callback.assert_called_once_with('hi', 3., 12, "rgba(40, 150, 40, 200)", "white")

    def test_write_invocation_types_on_mock_controller(self, om_env):
        assert om_env.om.constraint_evaluation('write("hello")', make_ke()) is True
        om_env.kb.type.assert_called_once_with("hello")

    def test_unknown_macro_name_is_silent_noop(self, om_env):
        # unknown name falls through to bare eval; the NameError is swallowed (no-op, True)
        assert om_env.om.constraint_evaluation('never_played_macro', make_ke()) is True


class TestSendKeyEvent:
    def test_keyboard_press_and_release(self, om_env):
        om_env.om.send_key_event(make_ke())
        om_env.kb.press.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_A))
        om_env.om.send_key_event(make_ke(is_press=False))
        om_env.kb.release.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_A))

    def test_mouse_key_routes_to_mouse_controller(self, om_env):
        om_env.om.send_key_event(Key_Event(1, is_press=True))  # left mouse
        assert om_env.kb.press.call_count == 0
        om_env.mouse.press.assert_called_once_with(pynput_mouse.Button.left)


class TestCrossover:
    def build_switching_group(self):
        tg = Tap_Group(keys=[Key(VK_A), Key(VK_B)])
        tg.update_tap_states(VK_A, True)
        tg.set_last_key_send(VK_A)
        tg.update_tap_states(VK_B, True)  # active key B, last send A
        return tg

    def test_key_switch_releases_old_then_presses_new(self, om_env, monkeypatch):
        monkeypatch.setattr(fst_manager, 'randint', lambda lo, hi: (lo + hi) // 2)
        om_env.fst.arg_manager.ACT_DELAY = False
        om_env.fst.arg_manager.ACT_CROSSOVER = False
        tg = self.build_switching_group()
        om_env.om.send_keys_for_tap_group(tg)
        assert om_env.kb.method_calls == [
            call.release(pynput_keyboard.KeyCode.from_vk(VK_A)),
            call.press(pynput_keyboard.KeyCode.from_vk(VK_B)),
        ]
        assert tg.get_last_key_send() == VK_B

    def test_all_released_releases_last_key(self, om_env, monkeypatch):
        om_env.fst.arg_manager.ACT_DELAY = False
        om_env.fst.arg_manager.ACT_CROSSOVER = False
        tg = Tap_Group(keys=[Key(VK_A), Key(VK_B)])
        tg.update_tap_states(VK_A, True)
        tg.set_last_key_send(VK_A)
        tg.update_tap_states(VK_A, False)
        om_env.om.send_keys_for_tap_group(tg)
        om_env.kb.release.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_A))
        assert tg.get_last_key_send() is None

    def test_same_key_sends_nothing(self, om_env):
        tg = Tap_Group(keys=[Key(VK_A), Key(VK_B)])
        tg.update_tap_states(VK_A, True)
        tg.set_last_key_send(VK_A)
        om_env.om.send_keys_for_tap_group(tg)
        assert om_env.kb.press.call_count == 0
        assert om_env.kb.release.call_count == 0

    @staticmethod
    async def wait_for_calls(kb_mock, expected, tries=100, step=0.01):
        # event-driven bounded wait: poll the mock until it has recorded exactly
        # `expected` calls (replaces a fixed sleep racing the scheduled 5 ms task)
        for _ in range(tries):
            if kb_mock.method_calls == expected:
                return
            await asyncio.sleep(step)
        raise AssertionError(f"expected {expected!r}, got {kb_mock.method_calls!r}")

    @pytest.mark.asyncio
    async def test_crossover_presses_new_key_first(self, om_env, monkeypatch):
        # probability roll 100 -> crossover; delay roll 5 ms
        monkeypatch.setattr(fst_manager, 'randint',
                            lambda lo, hi: 100 if (lo, hi) == (0, 100) else 5)
        om_env.fst.arg_manager.ACT_CROSSOVER = True
        om_env.fst.arg_manager.ACT_DELAY = True
        tg = self.build_switching_group()
        om_env.fst.loop = asyncio.get_running_loop()
        om_env.om.send_keys_for_tap_group(tg)
        await self.wait_for_calls(om_env.kb, [
            call.press(pynput_keyboard.KeyCode.from_vk(VK_B)),
            call.release(pynput_keyboard.KeyCode.from_vk(VK_A)),
        ])

    @pytest.mark.asyncio
    async def test_crossover_not_taken_on_low_roll(self, om_env, monkeypatch):
        # probability roll 0 -> no crossover: old released, then new pressed
        monkeypatch.setattr(fst_manager, 'randint',
                            lambda lo, hi: 0 if (lo, hi) == (0, 100) else 5)
        om_env.fst.arg_manager.ACT_CROSSOVER = True
        om_env.fst.arg_manager.ACT_DELAY = True
        tg = self.build_switching_group()
        om_env.fst.loop = asyncio.get_running_loop()
        om_env.om.send_keys_for_tap_group(tg)
        await self.wait_for_calls(om_env.kb, [
            call.release(pynput_keyboard.KeyCode.from_vk(VK_A)),
            call.press(pynput_keyboard.KeyCode.from_vk(VK_B)),
        ])

    @pytest.mark.filterwarnings("ignore:.*never awaited.*:RuntimeWarning")
    def test_tap_group_async_scheduling_error_is_logged(self, om_env, monkeypatch):
        # a scheduling failure must not propagate into the hot path
        def raise_rct(*args, **kwargs):
            raise RuntimeError('no loop')

        monkeypatch.setattr(asyncio, 'run_coroutine_threadsafe', raise_rct)
        om_env.fst.arg_manager.ACT_DELAY = True
        tg = Tap_Group(keys=[Key(VK_A), Key(VK_B)])
        tg.update_tap_states(VK_A, True)
        tg.set_last_key_send(VK_A)
        tg.update_tap_states(VK_B, True)
        om_env.om.send_keys_for_tap_group(tg)  # no raise


class TestPropertyAndDelayHelpers:
    def test_mouse_property_exposes_controller(self, om_env):
        assert om_env.om.mouse is om_env.mouse

    def test_get_random_delay_swaps_when_min_gt_max(self, om_env, monkeypatch):
        monkeypatch.setattr(fst_manager, 'randint', lambda lo, hi: lo)
        assert om_env.om.get_random_delay(5, 20) == 5  # min 20 > max 5 -> swapped


class TestExecuteKeyEventDelays:
    @pytest.mark.asyncio
    async def test_none_ke_with_empty_delays_waits_nothing(self, om_env, monkeypatch):
        sleeps = []

        async def fake_sleep(t):
            sleeps.append(t)

        monkeypatch.setattr(asyncio, 'sleep', fake_sleep)
        await om_env.om.execute_key_event(Key_Event(0))  # None ke (vk 0), no delays
        assert sleeps == []

    @pytest.mark.asyncio
    async def test_three_delays_are_truncated_to_two(self, om_env, monkeypatch):
        sleeps = []

        async def fake_sleep(t):
            sleeps.append(t)

        monkeypatch.setattr(asyncio, 'sleep', fake_sleep)
        # [10, 20, 30] -> [10, 20]; get_random_delay(10, 20) exercises the swap
        monkeypatch.setattr(fst_manager, 'randint', lambda lo, hi: lo)
        om_env.fst.arg_manager.ACT_DELAY = True
        await om_env.om.execute_key_event(make_ke(), delay_times=[10, 20, 30])
        assert sleeps == [0.01]

    def test_horizontal_scroll_vk_sends_scroll(self, om_env):
        om_env.om.send_key_event(Key_Event(7, is_press=True))  # scroll_x_horizontal
        om_env.mouse.scroll.assert_called_once_with(1, 0)


class TestVariableConstraintFunctions:
    def test_set_normalizes_bool_values(self, om_env):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("set('a', True)", ke) is True
        assert om_env.om.variables['a'] == 1
        assert om_env.om.constraint_evaluation("set('b', False)", ke) is True
        assert om_env.om.variables['b'] == 0

    def test_get_missing_variable_initializes_zero(self, om_env):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("get('nope')", ke) == 0
        assert om_env.om.variables['nope'] == 0

    def test_check_missing_int_returns_false(self, om_env):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("check('nope', 1)", ke) is False

    def test_check_list_membership_hit_and_miss(self, om_env):
        ke = make_ke()
        om_env.om.variables['x'] = 1
        assert om_env.om.constraint_evaluation("check('x', [1, 2])", ke) is True
        assert om_env.om.constraint_evaluation("check('x', [3])", ke) is False

    def test_check_list_missing_returns_false(self, om_env):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("check('nope', [1])", ke) is False

    def test_incr_missing_variable_starts_at_one(self, om_env, capsys):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("incr('cnt')", ke) is True
        assert om_env.om.variables['cnt'] == 1
        assert 'set to 1' in capsys.readouterr().out

    def test_decr_existing_variable(self, om_env):
        ke = make_ke()
        om_env.om.variables['n'] = 5
        assert om_env.om.constraint_evaluation("decr('n')", ke) is True
        assert om_env.om.variables['n'] == 4

    def test_decr_missing_variable_starts_at_zero(self, om_env, capsys):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("decr('n')", ke) is True
        assert om_env.om.variables['n'] == 0
        assert 'set to 0' in capsys.readouterr().out

    def test_clear_all_variables_constraint_empties_store(self, om_env):
        ke = make_ke()
        om_env.om.variables['hp'] = 5
        assert om_env.om.constraint_evaluation("clear_all_variables()", ke) is True
        assert om_env.om.variables == {}


class TestStringVariableConstraints:
    def test_set_var_get_var_roundtrip(self, om_env):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("set_var('x', 'hello')", ke) is True
        assert om_env.om.constraint_evaluation("get_var('x')", ke) == 'hello'

    def test_get_var_missing_variable_defaults_to_none_string(self, om_env, capsys):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("get_var('nope')", ke) == 'None'
        assert om_env.om.variables['nope'] == 'None'

    def test_cli_constraint_prints(self, om_env, capsys):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("cli('hi there')", ke) is True
        assert 'hi there' in capsys.readouterr().out

    def test_print_all_variables_empty_and_populated(self, om_env, capsys):
        ke = make_ke()
        om_env.om.clear_all_variables()
        assert om_env.om.constraint_evaluation("print_all_variables()", ke) is True
        assert 'No variables set.' in capsys.readouterr().out
        om_env.om.variables['hp'] = 5
        assert om_env.om.constraint_evaluation("print_all_variables()", ke) is True
        assert 'hp: 5' in capsys.readouterr().out


class TestDateConstraints:
    def test_date_returns_compact_date(self, om_env):
        ke = make_ke()
        with freeze_time('2020-01-02 03:04:00'):
            assert om_env.om.constraint_evaluation("date()", ke) == '200102'

    def test_date_time_returns_compact_timestamp(self, om_env):
        ke = make_ke()
        with freeze_time('2020-01-02 03:04:00'):
            assert om_env.om.constraint_evaluation("date_time()", ke) == '200102-0304'


class TestCallbackConstraints:
    def test_show_timer_routes_to_timer_callback(self, om_env):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("show_timer('t')", ke) is True
        om_env.fst.timer_callback.assert_called_once_with(
            't', 3., 12, "rgba(150, 150, 40, 200)", "white")

    def test_remove_toast_routes_to_remove_callback(self, om_env):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("remove_toast('t')", ke) is True
        om_env.fst.remove_callback.assert_called_once_with('t')

    def test_remove_all_toasts_routes_to_fake_fst(self, om_env):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("remove_all_toasts()", ke) is True
        om_env.fst.remove_all_callback.assert_called_once_with()

    def test_remove_all_toasts_drift_guard(self, om_env):
        # the control function must call the SAME attribute production
        # FST_Keyboard exposes (singular): a stand-in exposing only that name
        # fails with AttributeError if the names ever drift apart
        standin = SimpleNamespace(**{
            name: value for name, value in vars(om_env.fst).items()
            if name not in ('remove_all_callback', 'remove_all_callbacks')
        })
        standin.remove_all_callback = MagicMock()
        original = om_env.om._fst
        om_env.om._fst = standin
        try:
            ke = make_ke()
            assert om_env.om.constraint_evaluation("remove_all_toasts()", ke) is True
            standin.remove_all_callback.assert_called_once_with()
        finally:
            om_env.om._fst = original


class TestFileConstraints:
    def test_save_into_file_writes_file(self, om_env, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        ke = make_ke()
        assert om_env.om.constraint_evaluation("save_into_file('hello')", ke) is True
        assert 'hello' in (tmp_path / 'output.txt').read_text()

    def test_append_then_empty_file(self, om_env, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        ke = make_ke()
        assert om_env.om.constraint_evaluation("append_to_file('more')", ke) is True
        assert om_env.om.constraint_evaluation("empty_file()", ke) is True
        assert (tmp_path / 'output.txt').read_text() == ''


class TestConstraintResultTypes:
    def test_int_result_is_collected_as_delay(self, om_env):
        ke = Key_Event(VK_A, constraints=['2'])
        fulfilled, delays = om_env.om.check_constraint_fulfillment(ke, get_also_delays=True)
        assert fulfilled is True
        assert delays == [2]

    def test_string_result_prints_invalid_warning(self, om_env, capsys):
        om_env.om.variables['x'] = 'hello'
        ke = Key_Event(VK_A, constraints=["get_var('x')"])
        om_env.om.check_constraint_fulfillment(ke)
        assert 'not valid' in capsys.readouterr().out

    def test_eval_none_result_is_treated_as_true(self, om_env, capsys):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("print('x')", ke) is True


class TestClassBMouseClipboardBackup:
    """Mouse / clipboard / backup constraint functions. pyperclip, the pynput
    mouse controller and the fst_save_file_handler entry points are all mocked
    - no real clipboard, mouse or file backup is ever touched."""

    def patch_clipboard(self, monkeypatch):
        clip = MagicMock()
        monkeypatch.setattr(fst_manager, 'pyperclip', clip)
        return clip

    def test_make_backup_copies_and_toasts(self, om_env, monkeypatch):
        monkeypatch.setattr(fst_manager, 'mb',
                            lambda *a, **k: ('/save/dir', 'FSTconfig_2020.txt'))
        ke = make_ke()
        assert om_env.om.constraint_evaluation("make_backup()", ke) is True
        om_env.fst.toast_callback.assert_called_once()

    def test_restore_backup_restores_and_toasts(self, om_env, monkeypatch):
        monkeypatch.setattr(fst_manager, 'rb',
                            lambda *a, **k: ('/save/dir', 'FSTconfig_2020.txt'))
        ke = make_ke()
        assert om_env.om.constraint_evaluation("restore_backup()", ke) is True
        om_env.fst.toast_callback.assert_called()

    def test_scroll_constraints(self, om_env):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("scroll_up(5)", ke) is True
        assert om_env.om.constraint_evaluation("scroll_down(5)", ke) is True
        assert om_env.om.constraint_evaluation("scroll_right(5)", ke) is True
        assert om_env.om.constraint_evaluation("scroll_left(5)", ke) is True
        assert om_env.mouse.scroll.call_args_list == [
            call(0, 5), call(0, -5), call(5, 0), call(-5, 0)]

    def test_mouse_move_abs_and_move(self, om_env):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("mouse_move_abs(100, 200)", ke) is True
        assert om_env.mouse.position == (100, 200)
        assert om_env.om.constraint_evaluation("mouse_move(10, 20)", ke) is True
        om_env.mouse.move.assert_called_once_with(10, 20)

    def test_mouse_get_pos_copies_position_to_clipboard(self, om_env, monkeypatch):
        clip = self.patch_clipboard(monkeypatch)
        om_env.mouse.position = (3, 4)
        ke = make_ke()
        pos = om_env.om.constraint_evaluation("mouse_get_pos()", ke)
        assert pos == (3, 4)
        clip.copy.assert_called_once_with("(3, 4)")
        om_env.fst.toast_callback.assert_called()

    def test_mouse_save_to_var(self, om_env, monkeypatch, capsys):
        self.patch_clipboard(monkeypatch)
        om_env.mouse.position = (7, 8)
        ke = make_ke()
        assert om_env.om.constraint_evaluation("mouse_save_to_var('pos')", ke) is True
        assert om_env.om.variables['pos'] == (7, 8)
        assert 'saved to variable' in capsys.readouterr().out

    def test_mouse_move_to_var_valid_position(self, om_env, capsys):
        ke = make_ke()
        om_env.om.variables['pos'] = (5, 6)
        assert om_env.om.constraint_evaluation("mouse_move_to_var('pos')", ke) is True
        assert om_env.mouse.position == (5, 6)
        assert 'moved to position' in capsys.readouterr().out

    def test_mouse_move_to_var_invalid_position(self, om_env, capsys):
        ke = make_ke()
        om_env.om.variables['bad'] = 42
        assert om_env.om.constraint_evaluation("mouse_move_to_var('bad')", ke) is False
        assert 'does not contain a valid position' in capsys.readouterr().out

    def test_mouse_move_to_var_missing_variable(self, om_env, capsys):
        ke = make_ke()
        assert om_env.om.constraint_evaluation("mouse_move_to_var('nope')", ke) is False
        assert 'not found' in capsys.readouterr().out

    def test_copy_to_clipboard(self, om_env, monkeypatch):
        clip = self.patch_clipboard(monkeypatch)
        ke = make_ke()
        assert om_env.om.constraint_evaluation("copy_to_clipboard('hello')", ke) is True
        clip.copy.assert_called_once_with('hello')
        om_env.fst.toast_callback.assert_called()

    def test_paste_returns_clipboard_text(self, om_env, monkeypatch, capsys):
        clip = self.patch_clipboard(monkeypatch)
        clip.paste.return_value = 'pasted text'
        ke = make_ke()
        assert om_env.om.constraint_evaluation("paste()", ke) == 'pasted text'
        assert 'pasted from clipboard' in capsys.readouterr().out

    def test_is_repeat_active_running(self, om_env):
        ke = make_ke()
        handle = MagicMock()
        handle.done.return_value = False
        om_env.om.repeat_thread_dict['scan'] = [MagicMock(), handle]
        assert om_env.om.constraint_evaluation("is_repeat_active('scan')", ke) is True

    def test_is_repeat_active_done_or_missing(self, om_env):
        ke = make_ke()
        done = MagicMock()
        done.done.return_value = True
        om_env.om.repeat_thread_dict['scan'] = [MagicMock(), done]
        assert om_env.om.constraint_evaluation("is_repeat_active('scan')", ke) is False
        assert om_env.om.constraint_evaluation("is_repeat_active('nope')", ke) is False

    def test_toggle_repeat_restarts_a_finished_repeat(self, om_env, monkeypatch):
        monkeypatch.setattr(fst_manager, 'Macro_Repeat_Task', lambda *a, **k: MagicMock())
        started = []

        def fake_rct(coro, loop):
            handle = MagicMock()
            handle.done.return_value = False
            started.append(handle)
            return handle

        monkeypatch.setattr(asyncio, 'run_coroutine_threadsafe', fake_rct)
        ke = make_ke()
        done = MagicMock()
        done.done.return_value = True
        om_env.om.repeat_thread_dict['scan'] = [MagicMock(), done]
        assert om_env.om.constraint_evaluation("toggle_repeat('scan', 6500)", ke) is True
        assert len(started) == 1

    def test_stop_all_repeat_tolerates_broken_entry(self, om_env):
        # an entry whose handle has no done() method raises AttributeError in the loop
        om_env.om.repeat_thread_dict['bad'] = [MagicMock(), object()]
        assert om_env.om.constraint_evaluation("stop_all_repeat()", make_ke()) is True

    def test_clear_console_win_and_other_platforms(self, om_env, monkeypatch):
        monkeypatch.setattr(fst_manager, 'system', MagicMock())
        ke = make_ke()
        assert om_env.om.constraint_evaluation("clear_console()", ke) is True
        assert fst_manager.system.call_args_list[-1] == call('cls')
        monkeypatch.setattr(sys, 'platform', 'linux')
        assert om_env.om.constraint_evaluation("clear_console()", ke) is True
        assert fst_manager.system.call_args_list[-1] == call('clear')
