"""FST_Keyboard control actions and debug-numpad toggles.

The control handlers mutate arg flags and stop the (mocked) listeners; the
pause-toggle reload path is exercised with the config load and console clear
stubbed so no file is opened and no real console is cleared.
"""
import logging
from unittest.mock import MagicMock

import fst_manager


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
    def test_all_numpad_actions(self, kb_env_plain, monkeypatch, tmp_path, capsys, caplog):
        kb = kb_env_plain
        for key in ['alt', 'num1', 'num2', 'num3', 'num4', 'num5', 'num7', 'num8']:
            kb.state_manager.set_real_key_press_state(kb.convert_to_vk_code(key), True)
        monkeypatch.setattr(fst_manager, 'FLOW_LOG_FILE', str(tmp_path / 'fst_flow.log'))
        caplog.set_level(logging.DEBUG)
        kb.check_debug_numpad_actions()
        # num1..num3 all toggle the shared root debug level (3 toggles -> on)
        assert logging.getLogger('fst').level == logging.DEBUG
        assert logging.getLogger('fst.eval').level == logging.DEBUG
        # num4 toggled the flow stream on
        flow = logging.getLogger('fst.flow')
        assert flow.level == logging.DEBUG
        assert flow.propagate is False
        assert any('fst_flow.log' in str(getattr(h, 'baseFilename', ''))
                   for h in flow.handlers)
        # num5 still dumps the internal groups to the console
        out = capsys.readouterr().out
        assert 'Aliases' in out
        # num7/num8 state dumps are DEBUG records via the state logger
        assert 'real_key_state' in caplog.text
        assert 'all_key_state' in caplog.text

    def test_num1_toggles_root_debug_level_off(self, kb_env_plain, caplog):
        kb = kb_env_plain
        kb.state_manager.set_real_key_press_state(kb.convert_to_vk_code('alt'), True)
        kb.state_manager.set_real_key_press_state(kb.convert_to_vk_code('num1'), True)
        caplog.set_level(logging.DEBUG)
        kb.check_debug_numpad_actions()
        assert logging.getLogger('fst').level == logging.DEBUG
        # a second alt+num1 toggles the root debug level back off
        kb.check_debug_numpad_actions()
        assert logging.getLogger('fst').level == logging.INFO
        assert logging.getLogger('fst.state').level == logging.INFO
