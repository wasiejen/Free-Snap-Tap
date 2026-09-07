"""Tray_Icon unit tests (offscreen): construction, update_color (known and
unknown colors), on_activated, and the context-menu actions. The tray icon is
never show()n (QSystemTrayIcon.isSystemTrayAvailable() is False offscreen);
menu actions are triggered directly via QAction.trigger() - never exec_."""
from types import SimpleNamespace

import pytest
from PySide6.QtWidgets import QSystemTrayIcon

from fst_overlay import Tray_Icon


@pytest.fixture
def tray(qtbot):
    t = Tray_Icon(SimpleNamespace())
    yield t
    t.deleteLater()  # QSystemTrayIcon is a QObject, not a QWidget
    qtbot.wait(50)


def test_construct(qtbot, tray):
    assert isinstance(tray, QSystemTrayIcon)
    assert not QSystemTrayIcon.isSystemTrayAvailable()  # offscreen
    assert tray.color is None
    assert sorted(tray.images) == ['blue', 'green', 'red']
    assert tray.toolTip() == 'FST Status'
    assert tray.contextMenu() is not None


def test_update_color_known_switches_icon(qtbot, tray):
    set_icon_calls = []
    tray.setIcon = set_icon_calls.append
    tray.update_color('green')
    assert tray.color == 'green'
    assert len(set_icon_calls) == 1
    # QPixmap has no reliable content equality; compare the pixmap cache keys
    assert set_icon_calls[0].pixmap(64).cacheKey() == tray.images['green'].pixmap(64).cacheKey()


def test_update_color_unknown_keeps_previous_icon(qtbot, tray):
    set_icon_calls = []
    tray.setIcon = set_icon_calls.append
    before_key = tray.icon().pixmap(64).cacheKey()
    tray.update_color('magenta')
    assert tray.color == 'magenta'
    assert set_icon_calls == []  # setIcon not called for unknown colors
    assert tray.icon().pixmap(64).cacheKey() == before_key


SIGNAL_BY_TEXT = {
    'Open config file': 'signal_open_config',
    'Reload from file': 'signal_reload',
    'Toggle Pause': 'signal_toggle_pause',
    'Return to Menu': 'signal_return_menu',
    'Toggle Indicator': 'signal_toggle_status_indicator',
    'Toggle Crosshair': 'signal_toggle_crosshair',
    'Toggle Console': 'signal_toggle_console',
    'Exit Program': 'signal_exit',
}


def test_on_activated_trigger_emits_toggle_console(qtbot, tray):
    seen = []
    tray.signal_toggle_console.connect(lambda: seen.append(1))

    tray.on_activated(QSystemTrayIcon.Trigger)
    assert seen == [1]

    for reason in (QSystemTrayIcon.DoubleClick, QSystemTrayIcon.Context):
        tray.on_activated(reason)
    assert seen == [1]  # only Trigger is handled


def test_menu_actions_emit_matching_signals(qtbot, tray):
    fired = []
    for signal_name in SIGNAL_BY_TEXT.values():
        getattr(tray, signal_name).connect(lambda name=signal_name: fired.append(name))

    for action in tray.contextMenu().actions():
        if not action.isSeparator():
            action.trigger()

    assert sorted(fired) == sorted(SIGNAL_BY_TEXT.values())
