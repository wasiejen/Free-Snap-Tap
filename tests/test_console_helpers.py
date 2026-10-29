"""Console-helper tests for fst_overlay: customMessageHandler (the
QWindowsWindow::setGeometry suppression branch) and the console visibility
switching with fst_overlay.kernel32/user32 monkeypatched (no real console)."""
from unittest.mock import MagicMock

import fst_overlay


def test_message_handler_suppresses_set_geometry(capsys):
    fst_overlay.customMessageHandler(None, None, 'QWindowsWindow::setGeometry: geometry out of bound')
    assert capsys.readouterr().out == ''


def test_message_handler_prints_other_messages(capsys):
    fst_overlay.customMessageHandler(None, None, 'some other warning')
    assert 'Qt Message: some other warning' in capsys.readouterr().out


def _patch_console(monkeypatch, hwnd):
    kernel32 = MagicMock()
    kernel32.GetConsoleWindow.return_value = hwnd
    user32 = MagicMock()
    monkeypatch.setattr(fst_overlay, 'kernel32', kernel32)
    monkeypatch.setattr(fst_overlay, 'user32', user32)
    return user32


def test_set_console_visibility_hide_then_show(monkeypatch):
    user32 = _patch_console(monkeypatch, 42)
    monkeypatch.setattr(fst_overlay, 'console_visible', False)

    fst_overlay.set_console_visibility(False)
    assert fst_overlay.console_visible is False
    user32.ShowWindow.assert_called_once_with(42, 0)  # SW_HIDE

    fst_overlay.set_console_visibility(True)
    assert fst_overlay.console_visible is True
    user32.ShowWindow.assert_called_with(42, 5)  # SW_SHOW


def test_set_console_visibility_without_hwnd_is_noop(monkeypatch):
    user32 = _patch_console(monkeypatch, 0)
    monkeypatch.setattr(fst_overlay, 'console_visible', True)

    fst_overlay.set_console_visibility(False)

    assert fst_overlay.console_visible is True  # unchanged
    user32.ShowWindow.assert_not_called()


def test_switch_console_visibility_toggles(monkeypatch):
    user32 = _patch_console(monkeypatch, 7)
    monkeypatch.setattr(fst_overlay, 'console_visible', True)

    fst_overlay.switch_console_visibility()
    assert fst_overlay.console_visible is False

    fst_overlay.switch_console_visibility()
    assert fst_overlay.console_visible is True

    assert [c.args for c in user32.ShowWindow.call_args_list] == [(7, 0), (7, 5)]
