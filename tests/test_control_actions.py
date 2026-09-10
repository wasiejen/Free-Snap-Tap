"""FST_Keyboard control actions and debug-numpad toggles.

The control handlers mutate arg flags and stop the (mocked) listeners; the
pause-toggle reload path is exercised with the config load and console clear
stubbed so no file is opened and no real console is cleared.
"""
from unittest.mock import MagicMock

import fst_manager
from fst_manager import CONSTANTS


class TestReturnToMenu:
    def test_return_to_menu(self, kb_env_plain, capsys):
        kb = kb_env_plain
        kb.control_return_to_menu()
        assert kb.arg_manager.MENU_ENABLED is True
        assert kb.arg_manager.WIN32_FILTER_PAUSED is True
        kb._mouse_listener.stop.assert_called_once_with()
        kb._listener.stop.assert_called_once_with()
        assert 'Return to menu' in capsys.readouterr().out


class TestExitProgram:
    def test_exit_program(self, kb_env_plain, capsys):
        kb = kb_env_plain
        kb.control_exit_program('unit')
        assert kb.arg_manager.STOPPED is True
        kb._mouse_listener.stop.assert_called_once_with()
        kb._listener.stop.assert_called_once_with()
        assert 'Stopping execution' in capsys.readouterr().out


class TestTogglePause:
    def stub_reload(self, kb, monkeypatch):
        monkeypatch.setattr(kb.config_manager, 'load_config', lambda: ({}, [], []))
        monkeypatch.setattr(fst_manager, 'system', MagicMock())

    def test_resume_reloads_and_unpauses(self, kb_env_plain, monkeypatch, capsys):
        kb = kb_env_plain
        self.stub_reload(kb, monkeypatch)
        kb.arg_manager.WIN32_FILTER_PAUSED = True
        kb.arg_manager.CONTROLS_ENABLED = True
        kb.control_toggle_pause()
        assert kb.arg_manager.WIN32_FILTER_PAUSED is False
        assert kb.arg_manager.MANUAL_PAUSED is False
        assert 'reloaded' in capsys.readouterr().out

    def test_pause_releases_keys_and_stops_repeats(self, kb_env_plain, capsys):
        kb = kb_env_plain
        kb.arg_manager.WIN32_FILTER_PAUSED = False
        kb.control_toggle_pause()
        assert kb.arg_manager.WIN32_FILTER_PAUSED is True
        assert kb.arg_manager.MANUAL_PAUSED is True
        assert 'manually paused' in capsys.readouterr().out


class TestDebugNumpad:
    def test_all_numpad_actions(self, kb_env_plain, capsys):
        kb = kb_env_plain
        for key in ['alt', 'num1', 'num2', 'num3', 'num4', 'num5', 'num7', 'num8']:
            kb.state_manager.set_real_key_press_state(kb.convert_to_vk_code(key), True)
        initial = CONSTANTS.DEBUG
        kb.check_debug_numpad_actions()
        # num1..num4 each toggle their debug flag; num5/num7/num8 print
        assert CONSTANTS.DEBUG is not initial
        out = capsys.readouterr().out
        assert 'real_key_state' in out  # num7
        assert 'all_key_state' in out  # num8
