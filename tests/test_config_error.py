"""P08: ConfigError surfacing - raise sites, user-facing boundaries, and
hot-path listener survival when a focus group name went stale."""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from pynput import keyboard as pynput_keyboard

import fst_manager
from fst_data_types import ConfigError, Key_Event
from fst_manager import CLI_menu, Output_Manager
from fst_overlay import GUI_Manager, StatusOverlay

from kb_helpers import build, down, hold_keys

VK_MENU = 164
VK_DELETE = 46
VK_A = 0x41
VK_B = 0x42


class TestConfigErrorDefinition:
    def test_str_format_and_attrs(self):
        err = ConfigError("focus group 'x' not found", 'x')
        assert err.reason == "focus group 'x' not found"
        assert err.context == 'x'
        assert str(err) == "FST config error: focus group 'x' not found (x)"


class TestFocusNameRaiseSites:
    def test_apply_focus_groups_absent_name_raises_config_error(self, kb_env_ns):
        kb = kb_env_ns.kb
        kb.focus_manager.multi_focus_dict = {}
        with pytest.raises(ConfigError) as excinfo:
            kb.apply_focus_groups('stale_app')
        assert 'stale_app' in excinfo.value.reason

    def test_apply_start_args_absent_name_raises_config_error(self, kb_env_ns, monkeypatch):
        kb = kb_env_ns.kb
        monkeypatch.setattr(kb.config_manager, 'load_config', lambda: ({}, [], []))
        with pytest.raises(ConfigError) as excinfo:
            kb.apply_start_args_by_focus_name('stale_app')
        assert 'stale_app' in excinfo.value.reason


class TestHotPathSurvival:
    def test_stale_focus_name_degrades_to_defaults_and_keeps_running(self, kb_env_ns, monkeypatch, capsys):
        kb = kb_env_ns.kb
        monkeypatch.setattr(kb.config_manager, 'load_config', lambda: ({}, [], []))
        kb.focus_manager.FOCUS_APP_NAME = 'stale_app'
        kb.arg_manager.WIN32_FILTER_PAUSED = True
        kb.arg_manager.MANUAL_PAUSED = True
        kb.arg_manager.CONTROLS_ENABLED = True
        hold_keys(kb, VK_MENU)
        # ALT+DELETE while paused: resume branch hits the stale focus name
        down(kb, VK_DELETE, 1000)
        out = capsys.readouterr().out
        assert 'FST config error' in out
        assert 'stale_app' in out
        assert kb.arg_manager.WIN32_FILTER_PAUSED is False
        assert kb.arg_manager.MANUAL_PAUSED is False
        # the listener kept running: a rebind built after the degrade still fires
        build(kb, rebinds=[['(r)', [['a'], 'b']]])
        down(kb, VK_A, 2000)
        kb_env_ns.kb_mock.press.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_B))
        assert kb._listener.suppress_event.call_count == 1


@pytest.fixture
def scripted_menu(monkeypatch):
    monkeypatch.setattr(fst_manager, 'system', MagicMock())
    monkeypatch.setattr(fst_manager, 'startfile', MagicMock())
    monkeypatch.setattr(fst_manager.msvcrt, 'kbhit', lambda: False)
    monkeypatch.setattr(fst_manager.msvcrt, 'getch', lambda: None)

    def script(choices):
        it = iter(choices)
        monkeypatch.setattr('builtins.input', lambda *args: next(it))

    return script


class TestCliMenuReloadConfigError:
    def test_choice_two_config_error_prints_and_loop_continues(self, scripted_menu, capsys):
        script = scripted_menu
        fst = MagicMock()
        fst.arg_manager = SimpleNamespace(PRINT_VK_CODES=True)
        fst.arg_manager.reset_global_variable_changes = MagicMock()
        fst.config_manager = SimpleNamespace(file_name='cfg.txt', display_groups=MagicMock())
        fst.focus_manager = SimpleNamespace(FOCUS_APP_NAME='stale_app')
        err = ConfigError("focus group 'stale_app' not found - renamed or removed in config?", 'stale_app')
        fst.apply_start_args_by_focus_name.side_effect = err

        script(['2', ''])
        CLI_menu(fst).display_menu()

        out = capsys.readouterr().out
        assert 'FST config error' in out
        assert 'stale_app' in out
        assert fst_manager.system.call_count == 2


class TestGuiHandlersConfigError:
    def _fst(self, raising_method):
        fst = MagicMock()
        setattr(fst, raising_method, MagicMock(side_effect=ConfigError(
            "focus group 'x' not found - renamed or removed in config?", 'x')))
        return SimpleNamespace(_fst=fst)

    def test_gui_manager_reload_toasts_and_does_not_raise(self):
        self_ = self._fst('reload_from_file')
        GUI_Manager.reload_from_file(self_)
        self_._fst.toast_callback.assert_called_once()
        assert 'FST config error' in self_._fst.toast_callback.call_args.args[0]

    def test_gui_manager_toggle_pause_toasts_and_does_not_raise(self):
        self_ = self._fst('control_toggle_pause')
        GUI_Manager.toggle_pause(self_)
        self_._fst.toast_callback.assert_called_once()
        assert 'FST config error' in self_._fst.toast_callback.call_args.args[0]

    def test_status_overlay_toggle_pause_toasts_and_does_not_raise(self):
        self_ = self._fst('control_toggle_pause')
        StatusOverlay.toggle_pause(self_)
        self_._fst.toast_callback.assert_called_once()
        assert 'FST config error' in self_._fst.toast_callback.call_args.args[0]

    def test_status_overlay_reload_toasts_and_does_not_raise(self):
        self_ = self._fst('reload_from_file')
        StatusOverlay.reload_from_file(self_)
        self_._fst.toast_callback.assert_called_once()
        assert 'FST config error' in self_._fst.toast_callback.call_args.args[0]


class TestCheckForCombinationConfigError:
    def test_unresolvable_string_returns_false_and_warns_once(self, kb_env_ns, capsys):
        kb = kb_env_ns.kb
        kb.state_manager.set_real_key_press_state(VK_MENU, True)
        assert kb.check_for_combination([VK_MENU, 'zz']) is False
        out = capsys.readouterr().out
        assert 'FST config error' in out
        assert 'zz' in out
        kb.check_for_combination([VK_MENU, 'zz'])
        assert capsys.readouterr().out == ''

    def test_resolvable_combination_still_evaluates(self, kb_env_ns):
        kb = kb_env_ns.kb
        kb.state_manager.set_real_key_press_state(VK_MENU, True)
        kb.state_manager.set_real_key_press_state(VK_DELETE, True)
        assert kb.check_for_combination([VK_MENU, VK_DELETE]) is True
        kb.state_manager.set_real_key_press_state(VK_DELETE, False)
        assert kb.check_for_combination([VK_MENU, VK_DELETE]) is False


class TestConstraintEvalConfigError:
    def test_constraint_function_unknown_key_fails_closed(self, fake_fst, capsys):
        om = Output_Manager(fake_fst)
        result = om.constraint_evaluation('p("zz")', Key_Event(VK_A, True))
        assert result is False
        assert 'FST config error' in capsys.readouterr().out
