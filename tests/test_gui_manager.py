"""GUI_Manager unit tests (offscreen): construction with a stand-in fst
(doubles as an integration check of its four children), perform_periodic_update
called DIRECTLY (update_timer is never started), color logic and tray/overlay
sync, signal wiring, delegation methods, exit_program and start with a
mocked QApplication (app.exec() is mocked, the real loop is never entered)."""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

import fst_overlay
from fst_overlay import CrosshairOverlay, GUI_Manager, StatusOverlay, ToastManager, Tray_Icon


@pytest.fixture
def fst():
    return SimpleNamespace(
        arg_manager=SimpleNamespace(
            MANUAL_PAUSED=False,
            WIN32_FILTER_PAUSED=False,
            CROSSHAIR_ENABLED=False,
            STATUS_INDICATOR=True,
            ALWAYS_ACTIVE=False,
            TRAY_ICON=True,
            STATUS_INDICATOR_SIZE=10,
        ),
        focus_manager=SimpleNamespace(FOCUS_APP_NAME=''),
        open_config_file=MagicMock(),
        reload_from_file=MagicMock(),
        control_toggle_pause=MagicMock(),
        control_return_to_menu=MagicMock(),
        control_exit_program=MagicMock(),
        display_internal_repr_groups=MagicMock(),
    )


@pytest.fixture
def app_mock():
    return MagicMock()


@pytest.fixture
def manager(qtbot, fst, app_mock):
    m = GUI_Manager(fst, app_mock)
    qtbot.addWidget(m)
    return m


def test_construct_builds_children(qtbot, manager):
    assert isinstance(manager.tray_icon, Tray_Icon)
    assert isinstance(manager.overlay, StatusOverlay)
    assert isinstance(manager.toast_manager, ToastManager)
    assert isinstance(manager.crosshair, CrosshairOverlay)
    assert manager.color == 'red'  # not ALWAYS_ACTIVE


def test_initial_color_blue_when_always_active(qtbot, fst, app_mock):
    fst.arg_manager.ALWAYS_ACTIVE = True
    m = GUI_Manager(fst, app_mock)
    qtbot.addWidget(m)
    assert m.color == 'blue'


def test_periodic_update_toggles_indicator(qtbot, manager, fst):
    manager.overlay.hide_indicator = MagicMock()
    manager.overlay.show_indicator = MagicMock()

    fst.arg_manager.STATUS_INDICATOR = False
    manager.perform_periodic_update()
    manager.overlay.hide_indicator.assert_called_once()
    manager.overlay.show_indicator.assert_not_called()
    assert manager.status is False

    fst.arg_manager.STATUS_INDICATOR = True
    manager.perform_periodic_update()
    manager.overlay.show_indicator.assert_called_once()
    assert manager.status is True


def test_periodic_update_toggles_crosshair(qtbot, manager, fst):
    manager.crosshair.show_crosshair = MagicMock()
    manager.crosshair.hide_crosshair = MagicMock()

    fst.arg_manager.CROSSHAIR_ENABLED = True
    manager.perform_periodic_update()
    manager.crosshair.show_crosshair.assert_called_once()
    manager.crosshair.hide_crosshair.assert_not_called()
    assert manager.crosshair_enabled is True

    fst.arg_manager.CROSSHAIR_ENABLED = False
    manager.perform_periodic_update()
    manager.crosshair.hide_crosshair.assert_called_once()
    assert manager.crosshair_enabled is False


def test_periodic_update_red_when_manually_paused(qtbot, manager, fst):
    fst.arg_manager.MANUAL_PAUSED = True
    manager.perform_periodic_update()
    assert manager.manual is True
    assert manager.tray_icon.color == 'red'
    assert manager.overlay.color_name == 'red'


def test_periodic_update_blue_when_always_active_and_no_focus(qtbot, manager, fst):
    fst.arg_manager.ALWAYS_ACTIVE = True
    # first flip something to a paused state so the color logic runs ...
    fst.arg_manager.WIN32_FILTER_PAUSED = True
    manager.perform_periodic_update()
    assert manager.tray_icon.color == 'red'
    # ... then release it: not paused + ALWAYS_ACTIVE + empty focus name -> blue
    fst.arg_manager.WIN32_FILTER_PAUSED = False
    manager.perform_periodic_update()
    assert manager.tray_icon.color == 'blue'
    assert manager.overlay.color_name == 'blue'


def test_periodic_update_green_when_focus_name_set(qtbot, manager, fst):
    fst.focus_manager.FOCUS_APP_NAME = 'cs2'
    manager.perform_periodic_update()
    assert manager.tray_icon.color == 'green'
    assert manager.overlay.color_name == 'green'


def test_periodic_update_no_change_no_color_updates(qtbot, manager):
    tray_calls = []
    overlay_calls = []
    manager.tray_icon.update_color = tray_calls.append
    manager.overlay.update_color = overlay_calls.append

    manager.perform_periodic_update()

    assert tray_calls == []
    assert overlay_calls == []


def test_tray_signals_reach_manager_delegation(qtbot, manager, fst):
    manager.tray_icon.signal_open_config.emit()
    fst.open_config_file.assert_called_once()

    manager.tray_icon.signal_reload.emit()
    fst.reload_from_file.assert_called_once()

    manager.tray_icon.signal_toggle_pause.emit()
    fst.control_toggle_pause.assert_called_once()

    manager.tray_icon.signal_return_menu.emit()
    fst.control_return_to_menu.assert_called_once()


def test_toggle_status_indicator_via_tray_signal(qtbot, manager, fst):
    assert fst.arg_manager.STATUS_INDICATOR is True
    manager.tray_icon.signal_toggle_status_indicator.emit()
    assert fst.arg_manager.STATUS_INDICATOR is False
    manager.tray_icon.signal_toggle_status_indicator.emit()
    assert fst.arg_manager.STATUS_INDICATOR is True


def test_toggle_crosshair_from_tray_and_overlay_signals(qtbot, manager, fst):
    manager.tray_icon.signal_toggle_crosshair.emit()
    assert fst.arg_manager.CROSSHAIR_ENABLED is True

    manager.overlay.signal_toggle_crosshair.emit()
    assert fst.arg_manager.CROSSHAIR_ENABLED is False


def test_toggle_methods_delegation(qtbot, manager, fst):
    manager.open_config_file()
    fst.open_config_file.assert_called_once()
    manager.reload_from_file()
    fst.reload_from_file.assert_called_once()
    manager.toggle_pause()
    fst.control_toggle_pause.assert_called_once()
    manager.return_to_menu()
    fst.control_return_to_menu.assert_called_once()
    manager.display_internal_state()
    fst.display_internal_repr_groups.assert_called_once()


def test_toggle_status_indicator_direct(qtbot, manager, fst):
    manager.toggle_status_indicator()
    assert fst.arg_manager.STATUS_INDICATOR is False
    manager.toggle_status_indicator()
    assert fst.arg_manager.STATUS_INDICATOR is True


def test_toggle_crosshair_direct(qtbot, manager, fst):
    manager.toggle_crosshair()
    assert fst.arg_manager.CROSSHAIR_ENABLED is True
    manager.toggle_crosshair()
    assert fst.arg_manager.CROSSHAIR_ENABLED is False


def test_toggle_console_on_left_click_hides_console(monkeypatch, qtbot, fst, app_mock):
    kernel32 = MagicMock()
    kernel32.GetConsoleWindow.return_value = 1
    user32 = MagicMock()
    monkeypatch.setattr(fst_overlay, 'kernel32', kernel32)
    monkeypatch.setattr(fst_overlay, 'user32', user32)
    monkeypatch.setattr(fst_overlay, 'console_visible', True)

    m = GUI_Manager(fst, app_mock)
    qtbot.addWidget(m)
    m.toggle_console_on_left_click()

    assert fst_overlay.console_visible is False
    user32.ShowWindow.assert_called_once_with(1, 0)  # SW_HIDE


def test_exit_program(qtbot, fst, app_mock):
    m = GUI_Manager(fst, app_mock)
    qtbot.addWidget(m)

    with pytest.raises(SystemExit) as exc_info:
        m.exit_program()

    assert exc_info.value.code == 0
    fst.control_exit_program.assert_called_once_with('icon')
    app_mock.quit.assert_called_once()


def test_start_starts_timer_and_event_loop(qtbot, fst, app_mock):
    m = GUI_Manager(fst, app_mock)
    qtbot.addWidget(m)
    assert not m.update_timer.isActive()

    m.start()  # app_mock.exec() returns immediately (no real event loop)

    assert m.update_timer.isActive()
    app_mock.exec.assert_called_once()
    m.update_timer.stop()
