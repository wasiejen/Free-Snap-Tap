"""Behavior tests for Output_Manager constraint/evaluation semantics (Phase 2).

Time-based eval is pinned against fst_manager.py (constraint_evaluation) and
Input_State_Manager timing semantics. pynput controllers are mocked - no real
keys are ever emitted. Wall-clock dependent eval (last()) is frozen with
freezegun.
"""
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

    def test_unknown_key_state_constraint_passes(self, om_env):
        # unknown key string -> exception swallowed, None result treated as passing
        assert om_env.om.check_constraint_fulfillment(
            Key_Event(VK_A, constraints=['-zz_unknown'])) is True


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
        await asyncio.sleep(0.02)
        assert om_env.kb.method_calls == [
            call.press(pynput_keyboard.KeyCode.from_vk(VK_B)),
            call.release(pynput_keyboard.KeyCode.from_vk(VK_A)),
        ]

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
        await asyncio.sleep(0.02)
        assert om_env.kb.method_calls == [
            call.release(pynput_keyboard.KeyCode.from_vk(VK_A)),
            call.press(pynput_keyboard.KeyCode.from_vk(VK_B)),
        ]
