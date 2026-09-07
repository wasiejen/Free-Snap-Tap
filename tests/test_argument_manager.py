"""Behavior tests for Argument_Manager.apply_start_arguments (fst_manager.py).

Covers the <arg> start-argument branches: -file=, -nomenu, -nocontrols,
-delay/-nodelay, -tapdelay=/-macrodelay=/-aliasdelay= (incl. out-of-range
values), -crossover/-crossover=N (incl. out-of-range), -exec_one_macro,
-crosshair=, -save_dir=/-backup_root_dir= and unknown arguments.
The FST_Keyboard facade is a FakeFST - no real config file or GUI is touched.
"""
from types import SimpleNamespace

import pytest

from fst_manager import Argument_Manager, CONSTANTS, Focus_Group_Manager


@pytest.fixture
def am_env(fake_fst):
    fake_fst.config_manager = SimpleNamespace(file_name='')
    manager = Argument_Manager(fake_fst)
    return SimpleNamespace(am=manager, fst=fake_fst)


def test_file_argument_sets_config_file_name(am_env):
    am_env.am.apply_start_arguments(['-file=custom.cfg'])
    assert am_env.fst.config_manager.file_name == 'custom.cfg'


def test_nomenu_disables_menu(am_env):
    am_env.am.apply_start_arguments(['-nomenu'])
    assert am_env.am.MENU_ENABLED is False


def test_nocontrols_disables_controls(am_env):
    am_env.am.apply_start_arguments(['-nocontrols'])
    assert am_env.am.CONTROLS_ENABLED is False


def test_delay_and_nodelay_toggle_act_delay(am_env):
    am_env.am.apply_start_arguments(['-delay'])
    assert am_env.am.ACT_DELAY is True
    am_env.am.apply_start_arguments(['-nodelay'])
    assert am_env.am.ACT_DELAY is False
    # nodelay also disables crossover, even if it was enabled before
    am_env.am.apply_start_arguments(['-crossover', '-nodelay'])
    assert am_env.am.ACT_CROSSOVER is False
    assert am_env.am.ACT_DELAY is False


def test_tapdelay_sets_acts_delay_range(am_env):
    am_env.am.apply_start_arguments(['-tapdelay=50,20'])
    assert am_env.am.ACT_DELAY is True
    # values are sorted ascending -> min,max
    assert am_env.am.ACT_MIN_DELAY_IN_MS == 20
    assert am_env.am.ACT_MAX_DELAY_IN_MS == 50


def test_macro_and_aliasdelay_share_macro_delays(am_env):
    am_env.am.apply_start_arguments(['-macrodelay=500,3'])
    assert am_env.am.ACT_DELAY is True
    assert am_env.am.MACRO_MIN_DELAY_IN_MS == 3
    assert am_env.am.MACRO_MAX_DELAY_IN_MS == 500
    # -aliasdelay writes to the same macro delay variables
    am_env.am.apply_start_arguments(['-aliasdelay=1,1000'])
    assert am_env.am.MACRO_MIN_DELAY_IN_MS == 1
    assert am_env.am.MACRO_MAX_DELAY_IN_MS == 1000


def test_crossover_enabled_without_value(am_env):
    am_env.am.apply_start_arguments(['-crossover'])
    assert am_env.am.ACT_CROSSOVER is True
    assert am_env.am.ACT_CROSSOVER_PROPABILITY_IN_PERCENT == 50


def test_crossover_value_is_stored(am_env):
    am_env.am.apply_start_arguments(['-crossover=75'])
    assert am_env.am.ACT_CROSSOVER is True
    assert am_env.am.ACT_CROSSOVER_PROPABILITY_IN_PERCENT == 75
    am_env.am.apply_start_arguments(['-crossover=0'])
    assert am_env.am.ACT_CROSSOVER_PROPABILITY_IN_PERCENT == 0
    am_env.am.apply_start_arguments(['-crossover=100'])
    assert am_env.am.ACT_CROSSOVER_PROPABILITY_IN_PERCENT == 100


def test_crossover_value_out_of_range_prints_warning(am_env, capsys):
    am_env.am.apply_start_arguments(['-crossover=150'])
    captured = capsys.readouterr()
    assert 'probability not in range' in captured.out
    # out-of-range value is not applied; crossover itself stays enabled
    assert am_env.am.ACT_CROSSOVER is True
    assert am_env.am.ACT_CROSSOVER_PROPABILITY_IN_PERCENT == 50


def test_exec_one_macro(am_env):
    am_env.am.apply_start_arguments(['-exec_one_macro'])
    assert am_env.am.EXEC_ONLY_ONE_TRIGGERED_MACRO is True


def test_crosshair_with_delta(am_env):
    am_env.am.apply_start_arguments(['-crosshair=5,-10'])
    assert am_env.am.CROSSHAIR_ENABLED is True
    assert am_env.am.CROSSHAIR_DELTA_X == 5
    assert am_env.am.CROSSHAIR_DELTA_Y == -10


def test_crosshair_plain_only_enables(am_env):
    am_env.am.apply_start_arguments(['-crosshair'])
    assert am_env.am.CROSSHAIR_ENABLED is True
    assert am_env.am.CROSSHAIR_DELTA_X == 0
    assert am_env.am.CROSSHAIR_DELTA_Y == 0


def test_save_dir_and_backup_root_dir(am_env):
    am_env.am.apply_start_arguments(['-save_dir=savedir', '-backup_root_dir=backuproot'])
    assert am_env.am.SAVE_DIR == 'savedir'
    assert am_env.am.BACKUP_ROOT_DIR == 'backuproot'


def test_unknown_argument_prints_notice(am_env, capsys):
    am_env.am.apply_start_arguments(['-no_such_argument'])
    captured = capsys.readouterr()
    assert 'unknown start argument' in captured.out


def test_multiple_arguments_applied_in_order(am_env):
    am_env.am.apply_start_arguments(['-tapdelay=8,2', '-crossover=40', '-nomenu'])
    assert am_env.am.ACT_MIN_DELAY_IN_MS == 2
    assert am_env.am.ACT_MAX_DELAY_IN_MS == 8
    assert am_env.am.ACT_CROSSOVER_PROPABILITY_IN_PERCENT == 40
    assert am_env.am.MENU_ENABLED is False


class TestInvalidArgumentsDoNotCrash:
    def test_invalid_tapdelay_string_keeps_previous_range(self, am_env, capsys):
        # used to raise NameError: 'delays' not defined
        am_env.am.apply_start_arguments(['-tapdelay=abc'])
        captured = capsys.readouterr()
        assert 'invalid delay' in captured.out
        assert am_env.am.ACT_MIN_DELAY_IN_MS == 2
        assert am_env.am.ACT_MAX_DELAY_IN_MS == 10

    def test_single_delay_applies_to_min_and_max(self, am_env):
        # used to raise ValueError: not enough values to unpack
        am_env.am.apply_start_arguments(['-tapdelay=50'])
        assert am_env.am.ACT_MIN_DELAY_IN_MS == 50
        assert am_env.am.ACT_MAX_DELAY_IN_MS == 50
        am_env.am.apply_start_arguments(['-macrodelay=250'])
        assert am_env.am.MACRO_MIN_DELAY_IN_MS == 250
        assert am_env.am.MACRO_MAX_DELAY_IN_MS == 250

    def test_out_of_range_delay_keeps_previous_range(self, am_env, capsys):
        am_env.am.apply_start_arguments(['-tapdelay=2000'])
        captured = capsys.readouterr()
        assert 'delay not in range' in captured.out
        assert am_env.am.ACT_MIN_DELAY_IN_MS == 2
        assert am_env.am.ACT_MAX_DELAY_IN_MS == 10
        # one valid and one invalid value: the valid one applies to both
        am_env.am.apply_start_arguments(['-tapdelay=2000,5'])
        assert am_env.am.ACT_MIN_DELAY_IN_MS == 5
        assert am_env.am.ACT_MAX_DELAY_IN_MS == 5

    def test_invalid_crossover_value_keeps_previous_probability(self, am_env, capsys):
        # used to raise NameError: 'probability' not defined
        am_env.am.apply_start_arguments(['-crossover=abc'])
        captured = capsys.readouterr()
        assert 'invalid probability' in captured.out
        assert am_env.am.ACT_CROSSOVER is True
        assert am_env.am.ACT_CROSSOVER_PROPABILITY_IN_PERCENT == 50

    def test_crosshair_missing_y_keeps_previous_delta(self, am_env, capsys):
        # used to raise ValueError: not enough values to unpack
        am_env.am.apply_start_arguments(['-crosshair=5'])
        captured = capsys.readouterr()
        assert 'invalid crosshair delta' in captured.out
        assert am_env.am.CROSSHAIR_ENABLED is True
        assert am_env.am.CROSSHAIR_DELTA_X == 0
        assert am_env.am.CROSSHAIR_DELTA_Y == 0

    def test_commented_arguments_are_silently_ignored(self, am_env, capsys):
        am_env.am.apply_start_arguments(['# a comment', ':another one'])
        captured = capsys.readouterr()
        assert 'unknown start argument' not in captured.out

    def test_debug_does_not_print_unknown_argument(self, am_env, capsys):
        am_env.am.apply_start_arguments(['-debug'])
        captured = capsys.readouterr()
        assert 'unknown start argument' not in captured.out
        assert am_env.am.DEBUG is True


class TestRemainingStartArguments:
    """The remaining -debug_numpad / -status_indicator / -always_active /
    -tray_icon / -hide_cmd_window / -focusapp branches plus multi-value delay
    truncation and the alias/macro invalid-delay notices."""

    def test_tapdelay_truncates_to_first_two_values(self, am_env):
        am_env.am.apply_start_arguments(['-tapdelay=1,2,3'])
        assert am_env.am.ACT_MIN_DELAY_IN_MS == 1
        assert am_env.am.ACT_MAX_DELAY_IN_MS == 2

    def test_debug_numpad_enables_constants_flag(self, am_env):
        am_env.am.apply_start_arguments(['-debug_numpad'])
        assert CONSTANTS.DEBUG_NUMPAD is True

    def test_invalid_aliasdelay_prints_notice(self, am_env, capsys):
        am_env.am.apply_start_arguments(['-aliasdelay=abc'])
        assert 'no valid alias delay' in capsys.readouterr().out

    def test_invalid_macrodelay_prints_notice(self, am_env, capsys):
        am_env.am.apply_start_arguments(['-macrodelay=abc'])
        assert 'no valid macro delay' in capsys.readouterr().out

    def test_focusapp_rejected_and_exits(self, am_env, capsys):
        with pytest.raises(SystemExit):
            am_env.am.apply_start_arguments(['-focusapp=cs2'])
        assert 'Do not use the -focusapp start argument' in capsys.readouterr().out

    def test_status_indicator_enables_and_sizes(self, am_env):
        am_env.am.apply_start_arguments(['-status_indicator'])
        assert am_env.am.STATUS_INDICATOR is True
        am_env.am.apply_start_arguments(['-status_indicator=20'])
        assert am_env.am.STATUS_INDICATOR_SIZE == 20

    def test_always_active_tray_icon_and_hidden_cmd_window(self, am_env):
        am_env.am.apply_start_arguments(['-always_active', '-tray_icon', '-hide_cmd_window'])
        assert am_env.am.ALWAYS_ACTIVE is True
        assert am_env.am.TRAY_ICON is True
        assert am_env.am.CMD_WINDOW_HIDDEN is True


class TestSysStartArgsProperty:
    def test_getter_and_setter(self, am_env):
        assert am_env.am.sys_start_args == []
        am_env.am.sys_start_args = ['-nomenu']
        assert am_env.am.sys_start_args == ['-nomenu']

    def test_setter_type_check(self, am_env):
        with pytest.raises(TypeError):
            am_env.am.sys_start_args = 'not a list'


class TestFocusGroupManagerDataHolders:
    def test_default_start_arguments_setter(self):
        fm = Focus_Group_Manager(SimpleNamespace())
        fm.default_start_arguments = ['-nomenu']
        assert fm.default_start_arguments == ['-nomenu']

    def test_default_group_lines_setter(self):
        fm = Focus_Group_Manager(SimpleNamespace())
        fm.default_group_lines = [('', 'a')]
        assert fm.default_group_lines == [('', 'a')]
