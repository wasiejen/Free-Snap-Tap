"""Unit tests of CLI_menu (fst_manager.py).

display_menu is driven by a scripted builtins.input plus patched system /
startfile / msvcrt / exit; the print-only display methods are checked with
capsys against a MagicMock FST_Keyboard. No real console clearing, no file
opening, no keyboard input.
"""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

import fst_manager
from fst_manager import CLI_menu, CONSTANTS


def make_menu_fst():
    """Stand-in for FST_Keyboard with the attributes display_menu touches."""
    fst = MagicMock()
    fst.arg_manager = SimpleNamespace(PRINT_VK_CODES=True, CONTROLS_ENABLED=False)
    fst.arg_manager.reset_global_variable_changes = MagicMock()
    fst.config_manager = SimpleNamespace(file_name='cfg.txt',
                                         display_groups=MagicMock())
    fst.focus_manager = SimpleNamespace(FOCUS_APP_NAME='cs2')
    return fst


@pytest.fixture
def scripted_menu(monkeypatch):
    """Patches everything display_menu touches outside the loop body and
    returns a helper to script the input() choices."""
    monkeypatch.setattr(fst_manager, 'system', MagicMock())
    monkeypatch.setattr(fst_manager, 'startfile', MagicMock())
    monkeypatch.setattr(fst_manager.msvcrt, 'kbhit', lambda: False)
    monkeypatch.setattr(fst_manager.msvcrt, 'getch', lambda: None)

    def script(choices):
        it = iter(choices)
        monkeypatch.setattr('builtins.input', lambda *args: next(it))

    return script


class TestDisplayMenu:
    def test_choice_zero_toggles_debug4_and_loops(self, scripted_menu):
        script = scripted_menu
        fst = make_menu_fst()
        initial = CONSTANTS.DEBUG4

        script(['0', ''])
        CLI_menu(fst).display_menu()

        assert CONSTANTS.DEBUG4 is not initial
        # choice 0 does not break: the menu looped until Enter
        assert fst_manager.system.call_count == 2  # clear_cli once per loop pass
        assert fst.arg_manager.PRINT_VK_CODES is False  # reset on entry

    def test_choice_one_opens_config_file(self, scripted_menu):
        script = scripted_menu
        fst = make_menu_fst()

        script(['1', ''])
        CLI_menu(fst).display_menu()

        fst_manager.startfile.assert_called_once_with('cfg.txt')

    def test_choice_two_reloads_everything_from_file(self, scripted_menu):
        script = scripted_menu
        fst = make_menu_fst()

        script(['2', ''])
        CLI_menu(fst).display_menu()

        fst.arg_manager.reset_global_variable_changes.assert_called_once_with()
        fst.apply_start_args_by_focus_name.assert_called_once_with('cs2')
        fst.apply_focus_groups.assert_called_once_with('cs2')

    def test_choice_three_enables_vk_code_printing_and_breaks(self, scripted_menu):
        script = scripted_menu
        fst = make_menu_fst()

        script(['3'])
        CLI_menu(fst).display_menu()

        assert fst.arg_manager.PRINT_VK_CODES is True
        assert fst_manager.system.call_count == 1  # single loop pass
        fst_manager.startfile.assert_not_called()

    def test_enter_breaks_without_action(self, scripted_menu):
        script = scripted_menu
        fst = make_menu_fst()

        script([''])
        CLI_menu(fst).display_menu()

        assert fst.arg_manager.PRINT_VK_CODES is False
        fst.apply_focus_groups.assert_not_called()
        fst_manager.startfile.assert_not_called()

    def test_invalid_input_prompts_and_loops(self, scripted_menu, capsys):
        script = scripted_menu
        fst = make_menu_fst()

        script(['x', ''])
        CLI_menu(fst).display_menu()

        assert 'Error: Invalid input.' in capsys.readouterr().out
        assert fst_manager.system.call_count == 2  # looped once for the retry

    def test_choice_four_exits_program(self, scripted_menu):
        script = scripted_menu
        fst = make_menu_fst()

        script(['4'])
        with pytest.raises(SystemExit):
            CLI_menu(fst).display_menu()


class TestDisplayMethods:
    def test_display_control_text(self, capsys):
        CLI_menu(MagicMock()).display_control_text()
        out = capsys.readouterr().out
        assert 'ALT + DELETE' in out
        assert 'ALT + END' in out
        assert 'ALT + PAGE_DOWN' in out

    def test_display_focus_names(self, capsys):
        fst = MagicMock()
        fst.focus_manager.multi_focus_dict_keys = ['cs2', 'horizon']
        CLI_menu(fst).display_focus_names()
        assert 'cs2, horizon' in capsys.readouterr().out

    def test_display_focus_found(self, capsys):
        CLI_menu(MagicMock()).display_focus_found('CS2 2024')
        out = capsys.readouterr().out
        assert 'FOCUS APP FOUND' in out
        assert 'CS2 2024' in out

    def test_display_focus_not_found_shows_names(self, capsys):
        fst = MagicMock()
        fst.focus_manager.multi_focus_dict_keys = ['cs2']
        CLI_menu(fst).display_focus_not_found()
        out = capsys.readouterr().out
        assert 'NO FOCUS APP FOUND' in out
        assert 'cs2' in out

    def test_display_default_active_shows_names(self, capsys):
        fst = MagicMock()
        fst.focus_manager.multi_focus_dict_keys = ['cs2']
        CLI_menu(fst).display_default_active()
        out = capsys.readouterr().out
        assert 'DEFAULT GROUP ACTIVE' in out
        assert 'cs2' in out

    def test_update_group_display_clears_and_shows_groups(self, scripted_menu, capsys):
        fst = make_menu_fst()
        fst.arg_manager.CONTROLS_ENABLED = True

        CLI_menu(fst).update_group_display()

        fst_manager.system.assert_called_once_with('cls||clear')
        fst.config_manager.display_groups.assert_called_once_with()
        assert 'ALT + DELETE' in capsys.readouterr().out

    def test_update_group_display_hides_control_text_when_disabled(self, scripted_menu, capsys):
        fst = make_menu_fst()
        fst.arg_manager.CONTROLS_ENABLED = False

        CLI_menu(fst).update_group_display()

        assert 'ALT + DELETE' not in capsys.readouterr().out

    def test_flush_the_input_buffer_drains_pending_keys(self, monkeypatch):
        # kbhit True once -> the pending key is drained via getch(); never live
        kbhit = MagicMock(side_effect=[True, False])
        getch = MagicMock()
        monkeypatch.setattr(fst_manager.msvcrt, 'kbhit', kbhit)
        monkeypatch.setattr(fst_manager.msvcrt, 'getch', getch)

        CLI_menu(MagicMock()).flush_the_input_buffer()

        getch.assert_called_once_with()
        assert kbhit.call_count == 2
