"""StatusOverlay unit tests (offscreen pytest-qt): construction, color,
indicator show/hide, double-click, left-button drag (widget move, toast
manager re-position, screen-change counter), release recenter, menu action
slots and paintEvent. The blocking contextMenuEvent/exec_ path is NOT
exercised; menu actions are invoked directly or via QAction.trigger()."""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from PySide6.QtCore import QPoint, QRect, Qt
from PySide6.QtGui import QPaintEvent, QColor
from PySide6.QtWidgets import QApplication, QWidget

import fst_overlay
from fst_overlay import StatusOverlay


@pytest.fixture
def fst():
    return SimpleNamespace(
        arg_manager=SimpleNamespace(STATUS_INDICATOR_SIZE=10),
        open_config_file=MagicMock(),
        reload_from_file=MagicMock(),
        control_toggle_pause=MagicMock(),
        control_return_to_menu=MagicMock(),
    )


@pytest.fixture
def overlay(qtbot, fst):
    o = StatusOverlay(fst)
    qtbot.addWidget(o)
    return o


def test_construct_top_right(qtbot, overlay):
    screen = QApplication.primaryScreen().geometry()
    assert overlay.isVisible()
    assert overlay.windowTitle() == 'FST Status Indicator'
    # 10 * devicePixelRatio(1.0 offscreen) + 2 * padding(5)
    assert overlay.user_size == 10
    assert overlay.user_padding == 5
    assert overlay.x_size == 20
    assert overlay.y_size == 20
    assert overlay.color_name == 'red'
    assert overlay.color == QColor('red')
    assert overlay._drag_offset is None
    # init placement: top-right corner of the primary screen
    assert overlay.x() == screen.right() - overlay.x_size
    assert overlay.y() == screen.top()


def test_update_color(qtbot, overlay):
    overlay.update_color('green')
    assert overlay.color_name == 'green'
    assert overlay.color == QColor('green')


def test_toggle_status_indicator(qtbot, overlay):
    overlay._fst.arg_manager.STATUS_INDICATOR = True
    overlay.toggle_status_indicator()
    assert overlay._fst.arg_manager.STATUS_INDICATOR is False
    overlay.toggle_status_indicator()
    assert overlay._fst.arg_manager.STATUS_INDICATOR is True


def test_hide_and_show_indicator(qtbot, overlay):
    assert overlay.isVisible()
    overlay.hide_indicator()
    assert not overlay.isVisible()
    overlay.show_indicator()
    qtbot.wait(20)
    assert overlay.isVisible()


def test_double_click_opens_config_file(qtbot, overlay):
    qtbot.mouseDClick(overlay, Qt.LeftButton)
    overlay._fst.open_config_file.assert_called_once()


def test_press_sets_drag_state(qtbot, overlay):
    qtbot.mousePress(overlay, Qt.LeftButton)
    # drag offset = press position (widget center) relative to the top-left
    assert overlay._drag_offset == overlay.rect().center()
    assert overlay.screen_changed is False
    assert overlay.counter == 10
    # right-button press must not start a drag
    overlay._drag_offset = None
    qtbot.mousePress(overlay, Qt.RightButton)
    assert overlay._drag_offset is None


def test_drag_moves_widget_to_cursor(qtbot, overlay):
    x0, y0 = overlay.x(), overlay.y()
    qtbot.mousePress(overlay, Qt.LeftButton)

    # QTest.mouseMove takes a LOCAL position (global = widget.pos() + local);
    # the handler re-centers the widget under the cursor
    qtbot.mouseMove(overlay, QPoint(15, 15))
    assert overlay.x() == x0 + 15 - overlay.x_size // 2
    assert overlay.y() == y0 + 15 - overlay.y_size // 2

    qtbot.mouseMove(overlay, QPoint(20, 20))
    assert overlay.x() == x0 + 15
    assert overlay.y() == y0 + 15

    qtbot.mouseRelease(overlay, Qt.LeftButton)
    assert overlay._drag_offset is None


def test_drag_repositions_parent_toast_manager(qtbot, fst):
    parent = QWidget()
    parent.resize(800, 600)
    parent.toast_manager = MagicMock()
    qtbot.addWidget(parent)
    o = StatusOverlay(fst, parent=parent)
    qtbot.addWidget(o)

    qtbot.mousePress(o, Qt.LeftButton)
    qtbot.mouseMove(o, QPoint(400, 300))

    parent.toast_manager.update_position.assert_called_once()


def test_screen_change_counter_decrements(qtbot, overlay, monkeypatch):
    fake_screen = MagicMock()
    monkeypatch.setattr(fst_overlay, 'get_current_screen', lambda: fake_screen)

    qtbot.mousePress(overlay, Qt.LeftButton)
    qtbot.mouseMove(overlay, QPoint(120, 120))  # first move: new screen detected
    assert overlay.screen_changed is True
    assert overlay.counter == 9  # reset to 10, then decremented once

    qtbot.mouseMove(overlay, QPoint(125, 125))  # same fake screen: only decrement
    assert overlay.screen_changed is True
    assert overlay.counter == 8


def test_screen_change_counter_zero_recenters(qtbot, overlay, monkeypatch):
    monkeypatch.setattr(overlay, 'set_window_size_and_position', MagicMock())

    qtbot.mousePress(overlay, Qt.LeftButton)
    overlay.screen_changed = True
    overlay.counter = 0
    qtbot.mouseMove(overlay, QPoint(120, 120))

    overlay.set_window_size_and_position.assert_called_once()
    assert overlay.screen_changed is False


def test_release_recenters_after_screen_change(qtbot, overlay, monkeypatch):
    monkeypatch.setattr(overlay, 'set_window_size_and_position', MagicMock())

    qtbot.mousePress(overlay, Qt.LeftButton)
    assert overlay._drag_offset is not None
    overlay.screen_changed = True
    qtbot.mouseRelease(overlay, Qt.LeftButton)

    overlay.set_window_size_and_position.assert_called_once()
    assert overlay.screen_changed is False
    assert overlay._drag_offset is None


def test_menu_action_slots(qtbot, overlay):
    overlay.toggle_pause()
    overlay._fst.control_toggle_pause.assert_called_once()
    overlay.return_to_menu()
    overlay._fst.control_return_to_menu.assert_called_once()
    overlay.open_config_file()
    overlay._fst.open_config_file.assert_called_once()
    overlay.reload_from_file()
    overlay._fst.reload_from_file.assert_called_once()


def test_remove_all_toasts_action_uses_parent_toast_manager(qtbot, fst):
    parent = QWidget()
    parent.toast_manager = MagicMock()
    qtbot.addWidget(parent)
    o = StatusOverlay(fst, parent=parent)
    qtbot.addWidget(o)

    o.remove_all_toasts()
    parent.toast_manager.remove_all_toasts.assert_called_once()

    # without a toast_manager on the parent this must be a no-op
    o2 = StatusOverlay(fst)
    qtbot.addWidget(o2)
    o2.remove_all_toasts()


def test_context_menu_crosshair_action_emits_signal(qtbot, overlay):
    fired = []
    overlay.signal_toggle_crosshair.connect(lambda: fired.append(1))

    action = next(a for a in overlay.context_menu.actions()
                  if a.text() == 'Toggle Crosshair')
    action.trigger()

    assert fired == [1]


def test_paint_event(qtbot, overlay):
    overlay.paintEvent(QPaintEvent(QRect(0, 0, overlay.x_size, overlay.y_size)))


def test_exit_program_closes_overlay(qtbot, fst):
    fst.control_exit_program = MagicMock()
    o = StatusOverlay(fst)
    qtbot.addWidget(o)
    assert o.isVisible()

    o.exit_program()

    fst.control_exit_program.assert_called_once_with('overlay')
    assert not o.isVisible()  # close() hides synchronously
    qtbot.wait(50)  # process the deleteLater


def test_display_internal_state(qtbot, overlay):
    overlay._fst.display_internal_repr_groups = MagicMock()
    overlay.display_internal_state()
    overlay._fst.display_internal_repr_groups.assert_called_once()


def test_get_current_screen_falls_back_to_primary(qtbot, monkeypatch):
    monkeypatch.setattr(fst_overlay.QApplication, 'screenAt', staticmethod(lambda pos: None))
    assert fst_overlay.get_current_screen() == QApplication.primaryScreen()


def test_set_window_size_and_position_recenters_at_cursor(qtbot, overlay, monkeypatch):
    cursor_pos = QPoint(300, 250)
    monkeypatch.setattr(fst_overlay.QCursor, 'pos', classmethod(lambda cls: cursor_pos))
    overlay.set_window_size_and_position()
    assert overlay.x() == cursor_pos.x() - overlay.x_size // 2
    assert overlay.y() == cursor_pos.y() - overlay.y_size // 2
