"""GUI_Manager unit tests (offscreen): construction with a stand-in fst
(doubles as an integration check of its four children), perform_periodic_update
called DIRECTLY (update_timer is never started), color logic and tray/overlay
sync, signal wiring, delegation methods, eval-on-save config watcher
(U290T: file save -> validator pass + result toast via the facade reload),
exit_program and start with a mocked QApplication (app.exec() is mocked,
the real loop is never entered)."""
import os
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
        config_manager=SimpleNamespace(file_name=''),
        open_config_file=MagicMock(),
        reload_from_file=MagicMock(),
        control_toggle_pause=MagicMock(),
        control_return_to_menu=MagicMock(),
        control_exit_program=MagicMock(),
        display_internal_repr_groups=MagicMock(),
        toast_callback=MagicMock(),
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


def test_toast_window_prewarmed_at_startup(manager):
    """#130: the native side of the toast window must already exist after GUI
    init (created by show/hide at startup, hidden like the steady state) so
    the first toast no longer pays the first-window-creation cost - it only
    re-shows the existing window, like a retrigger."""
    assert manager.toast_manager.windowHandle() is not None
    assert not manager.toast_manager.isVisible()


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


class TestEvalOnSaveWatcher:
    """U290T(2): a config file save triggers the validator pass (facade
    reload -> load_config validates at load) and the result toast path.
    The watcher lives on GUI_Manager: registration, the change handler and
    the signal->slot wiring are pinned deterministically; the Qt watcher
    ENGINE's live event delivery is platform timing (offscreen) - acceptance
    on the maintainer's machine is pending-hardware.

    U290R(P1): Qt fires fileChanged MULTIPLE times per in-place editor save
    (save-via-rename burst), so the direct reload used to chain one reload
    per event - group rebuilds, released-key side effects, result-toast
    spam per save. A single-shot debounce timer coalesces the burst of ONE
    save into exactly ONE reload; the flush re-arms the watch (Windows drops
    the path on a rename-save). The burst pins drive the watcher signal and
    the flush directly; the live timer leg is pinned through qtbot.wait."""

    def make_config(self, tmp_path):
        cfg = tmp_path / 'FSTconfig_watch.txt'
        cfg.write_text('a, b\n', encoding='utf-8')
        return cfg

    def test_config_file_watched_at_startup(self, qtbot, fst, app_mock, tmp_path):
        cfg = self.make_config(tmp_path)
        fst.config_manager.file_name = str(cfg)
        m = GUI_Manager(fst, app_mock)
        qtbot.addWidget(m)

        assert os.path.abspath(str(cfg)) in m.config_watcher.files()

    def test_empty_file_name_watches_nothing(self, qtbot, fst, app_mock):
        m = GUI_Manager(fst, app_mock)  # fixture: file_name '' (no config set)
        qtbot.addWidget(m)
        assert m.config_watcher.files() == []

    def test_missing_file_watches_nothing(self, qtbot, fst, app_mock, tmp_path):
        fst.config_manager.file_name = str(tmp_path / 'not_created_yet.txt')
        m = GUI_Manager(fst, app_mock)
        qtbot.addWidget(m)
        assert m.config_watcher.files() == []

    def test_burst_of_events_coalesces_to_one_reload(self, qtbot, fst, app_mock, tmp_path):
        cfg = self.make_config(tmp_path)
        fst.config_manager.file_name = str(cfg)
        m = GUI_Manager(fst, app_mock)
        qtbot.addWidget(m)
        m.reload_from_file = MagicMock()
        path = os.path.abspath(str(cfg))

        for _ in range(3):  # the rename-save burst of ONE editor save
            m.config_watcher.fileChanged.emit(path)
        m._flush_config_reload()

        m.reload_from_file.assert_called_once()  # ONE reload per save
        assert path in m.config_watcher.files()

    def test_event_arms_single_shot_debounce(self, qtbot, fst, app_mock, tmp_path):
        cfg = self.make_config(tmp_path)
        fst.config_manager.file_name = str(cfg)
        m = GUI_Manager(fst, app_mock)
        qtbot.addWidget(m)
        m.reload_from_file = MagicMock()

        m.config_watcher.fileChanged.emit(os.path.abspath(str(cfg)))

        assert m._config_reload_timer.isSingleShot() is True
        assert m._config_reload_timer.isActive() is True
        m.reload_from_file.assert_not_called()  # coalesced, not one per event
        qtbot.wait(fst_overlay.CONFIG_RELOAD_DEBOUNCE_MS + 250)  # live leg
        m.reload_from_file.assert_called_once()
        assert not m._config_reload_timer.isActive()

    def test_debounce_flush_rearms_watch_and_reloads(self, qtbot, fst, app_mock, tmp_path):
        cfg = self.make_config(tmp_path)
        fst.config_manager.file_name = str(cfg)
        m = GUI_Manager(fst, app_mock)
        qtbot.addWidget(m)
        m.reload_from_file = MagicMock()
        path = os.path.abspath(str(cfg))
        m.config_watcher.removePath(path)  # simulate the rename-save drop

        m._on_config_file_changed(path)  # the handler arms the debounce only
        m._flush_config_reload()

        assert path in m.config_watcher.files()  # the flush re-arms
        m.reload_from_file.assert_called_once()  # validator pass + result toast

    def test_fileChanged_signal_routes_to_flush(self, qtbot, fst, app_mock, tmp_path):
        # the signal->slot wiring a live fileChanged event rides: the event
        # arms the debounce, the timer flush runs the single reload
        cfg = self.make_config(tmp_path)
        fst.config_manager.file_name = str(cfg)
        m = GUI_Manager(fst, app_mock)
        qtbot.addWidget(m)
        m.reload_from_file = MagicMock()

        m.config_watcher.fileChanged.emit(os.path.abspath(str(cfg)))
        qtbot.wait(fst_overlay.CONFIG_RELOAD_DEBOUNCE_MS + 250)

        m.reload_from_file.assert_called_once()

    def test_delete_event_skips_reload_and_keeps_file_gone(self, qtbot, fst, app_mock, tmp_path):
        # U290R: a watcher event of a DELETED config must not reload - the
        # facade load_config recreates the default template on
        # FileNotFoundError, which silently wiped the user's setup
        cfg = self.make_config(tmp_path)
        fst.config_manager.file_name = str(cfg)
        m = GUI_Manager(fst, app_mock)
        qtbot.addWidget(m)
        m.reload_from_file = MagicMock()
        path = os.path.abspath(str(cfg))
        cfg.unlink()  # the user removed the config file

        m._on_config_file_changed(path)
        m._flush_config_reload()

        m.reload_from_file.assert_not_called()
        assert not cfg.exists()  # no default-template rewrite
        fst.toast_callback.assert_called_once()  # the event surfaces visibly
        assert 'config file deleted' in fst.toast_callback.call_args.args[0]
        # (the watcher engine's own drop of the deleted path is live-event
        # platform timing - the re-arm attempt above is a no-op while gone)

    def test_watch_arms_when_config_created_after_construction(self, qtbot, fst, app_mock, tmp_path):
        # U290R: construction with a missing config file left the watcher
        # empty and eval-on-save dead; the periodic-update hook arms the
        # watch once the first-run config is created
        late = tmp_path / 'FSTconfig_late.txt'
        fst.config_manager.file_name = str(late)
        m = GUI_Manager(fst, app_mock)
        qtbot.addWidget(m)
        assert m.config_watcher.files() == []

        late.write_text('a, b\n', encoding='utf-8')  # the created config
        m.perform_periodic_update()

        assert os.path.abspath(str(late)) in m.config_watcher.files()
