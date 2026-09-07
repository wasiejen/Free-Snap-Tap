"""CrosshairOverlay unit tests (offscreen): show/hide, update_position with
and without CROSSHAIR_DELTA_X/Y (the source uses getattr(..., 0)), and
paintEvent called directly."""
from types import SimpleNamespace

import pytest
from PySide6.QtCore import QRect
from PySide6.QtGui import QPaintEvent
from PySide6.QtWidgets import QApplication

from fst_overlay import CrosshairOverlay


def make_fst(deltas=None):
    arg = SimpleNamespace()
    for key, value in (deltas or {}).items():
        setattr(arg, key, value)
    return SimpleNamespace(arg_manager=arg)


@pytest.fixture
def crosshair(qtbot):
    c = CrosshairOverlay(make_fst())
    qtbot.addWidget(c)
    return c


def screen_center():
    return QApplication.primaryScreen().geometry().center()


def test_construct_hidden_and_sized(qtbot, crosshair):
    assert not crosshair.isVisible()
    # offscreen: devicePixelRatio 1.0 -> size_multiplier 1.0
    assert crosshair.crosshair_size == 100
    assert crosshair.thickness == 3
    assert crosshair.size_multiplier == 1.0
    # hide_crosshair is a no-op while already hidden
    crosshair.hide_crosshair()
    assert not crosshair.isVisible()


def test_show_and_hide_crosshair(qtbot, crosshair):
    crosshair.show_crosshair()
    qtbot.wait(20)
    assert crosshair.isVisible()
    crosshair.show_crosshair()  # second call is a no-op
    crosshair.hide_crosshair()
    qtbot.wait(20)
    assert not crosshair.isVisible()
    crosshair.hide_crosshair()  # no-op while hidden


def test_update_position_without_deltas(qtbot, crosshair):
    center = screen_center()
    crosshair.update_position()
    assert crosshair.geometry().x() == center.x() - crosshair.crosshair_size // 2
    assert crosshair.geometry().y() == center.y() - crosshair.crosshair_size // 2


def test_update_position_with_deltas(qtbot):
    fst = make_fst({'CROSSHAIR_DELTA_X': 20, 'CROSSHAIR_DELTA_Y': -10})
    c = CrosshairOverlay(fst)
    qtbot.addWidget(c)
    center = screen_center()
    c.update_position()
    assert c.geometry().x() == center.x() + 20 - c.crosshair_size // 2
    assert c.geometry().y() == center.y() - 10 - c.crosshair_size // 2


def test_paint_event(qtbot, crosshair):
    crosshair.show()
    crosshair.paintEvent(QPaintEvent(QRect(0, 0, crosshair.crosshair_size, crosshair.crosshair_size)))
