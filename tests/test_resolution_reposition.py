"""U388 Leg 1 - resolution-change detection + reposition (priority item 1,
TODO #388). PAIR MODE, protocol:
agent/handover/protocols/protocol_fst-resolution-reset.md (estate).

RED-before pins, run against the untouched base (fst_combined tip
86d8394) BEFORE the Leg-1 code; the measured RED evidence is recorded in
the protocol step ledger + estate worker summary. On the base,
GUI_Manager has NO _watch_screen_geometry / on_screen_geometry_changed
(AttributeError = the RED marker on every leg), so nothing ever reacts
to a display change.

Design (Leg 0, reviewer STEP-0 P0=0 P1=0, rulings ACCEPT):
- detection = QScreen.geometryChanged connected per screen in
  GUI_Manager.start() (+ QApplication.screenAdded for late monitors);
- semantics = overlay re-anchors to the STARTUP top-right anchor
  (set_window_size_and_position(init=True), unconditional - hidden too,
  so the next show lands right); crosshair update_position ONLY while
  visible (show_crosshair already recomputes when hidden); toast
  manager update_position ONLY while visible, AFTER the overlay
  recompute (it anchors to the overlay geometry).

Offscreen Qt (conftest pins QT_QPA_PLATFORM=offscreen); real widgets,
geometryChanged never emitted - the handler is driven directly (the
Qt-level emission is live-acceptance territory). FakeScreen stands in
for get_current_screen() (module-level function - monkeypatchable).
"""
from types import SimpleNamespace

import pytest
from PySide6.QtCore import QPoint, QRect
from unittest.mock import MagicMock

from fst_overlay import CrosshairOverlay, GUI_Manager, StatusOverlay

OLD_SCREEN = QRect(0, 0, 3840, 2160)
NEW_SCREEN = QRect(0, 0, 1920, 1080)


class FakeScreen:
    """Stand-in for QScreen as far as the positioning code reads it:
    geometry(), devicePixelRatio(), name()."""

    def __init__(self, rect, dpr=1.0, name='FakeScreen'):
        self._rect = rect
        self._dpr = dpr
        self._name = name

    def geometry(self):
        return QRect(self._rect)

    def size(self):
        # CrosshairOverlay.update_position prints screen.size()
        return QRect(self._rect)

    def devicePixelRatio(self):
        return self._dpr

    def name(self):
        return self._name


@pytest.fixture
def overlay_fst():
    """Stand-in fst for the real overlay widgets (shape of
    tests/test_headless_loop_wiring.py::overlay_fst, defined locally)."""
    return SimpleNamespace(
        arg_manager=SimpleNamespace(
            MANUAL_PAUSED=False,
            WIN32_FILTER_PAUSED=False,
            CROSSHAIR_ENABLED=False,
            STATUS_INDICATOR=True,
            ALWAYS_ACTIVE=False,
            TRAY_ICON=True,
            STATUS_INDICATOR_SIZE=10,
            CROSSHAIR_DELTA_X=0,
            CROSSHAIR_DELTA_Y=0,
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
def manager(qtbot, overlay_fst):
    """Real GUI_Manager on a stubbed QApplication (the established
    offscreen shape)."""
    m = GUI_Manager(overlay_fst, MagicMock())
    qtbot.addWidget(m)
    return m


def mock_subwidgets(m):
    """Stub the positioning-relevant children of the REAL manager
    (reviewer P2-2: no SimpleNamespace-self - product __init__ always
    sets these, the pins should exercise the real attribute paths);
    return the stubs for pinning."""
    overlay = MagicMock()
    overlay.user_padding = 5
    overlay.geometry.return_value = QRect(0, 0, 20, 20)
    toast = MagicMock()
    toast.isVisible.return_value = True
    toast.width.return_value = 500
    crosshair = MagicMock()
    crosshair.isVisible.return_value = True
    m.overlay = overlay
    m.toast_manager = toast
    m.crosshair = crosshair
    return overlay, toast, crosshair


class TestLeg1Detection:
    def test_start_connects_current_screens_and_screen_added(self, manager):
        """start() must wire the screen watch before entering the Qt loop
        (RED before: GUI_Manager has no _watch_screen_geometry).
        Connection shape: exactly one geometryChanged.connect per screen
        in QApplication.screens() + one screenAdded connect."""
        screens = [MagicMock(name='screen1'), MagicMock(name='screen2')]
        manager._app.screens.return_value = screens
        manager.start()
        try:
            for screen in screens:
                screen.geometryChanged.connect.assert_called_once_with(
                    manager.on_screen_geometry_changed)
            manager._app.screenAdded.connect.assert_called_once()
            manager._app.exec.assert_called_once()  # Qt loop still entered
        finally:
            manager.update_timer.stop()

    def test_late_screen_gets_connected_via_screen_added(self, manager):
        """A monitor plugged after start() is connected too (single
        connect on screenAdded in start(); the slot per new screen)."""
        late = MagicMock(name='late_screen')
        manager._app.screens.return_value = []
        manager._watch_screen_geometry()
        # the slot _watch connected to screenAdded IS the per-screen
        # connector - drive it with the late screen
        slot = manager._app.screenAdded.connect.call_args.args[0]
        slot(late)
        late.geometryChanged.connect.assert_called_once_with(
            manager.on_screen_geometry_changed)


class TestLeg1RepositionHandler:
    def test_handler_repositions_overlay_then_toast_with_visible_crosshair(
            self, manager):
        """One display-change event -> each target repositioned exactly
        once: overlay recompute with init=True (startup top-right
        anchor, reviewer ruling), visible crosshair update_position,
        toast manager AFTER the overlay (it anchors to the overlay
        geometry - reviewer P2-4), all in that order (RED before: no
        handler exists)."""
        overlay, toast, crosshair = mock_subwidgets(manager)
        calls = []
        overlay.set_window_size_and_position.side_effect = \
            lambda *a, **k: calls.append('overlay')
        crosshair.update_position.side_effect = \
            lambda *a, **k: calls.append('crosshair')
        toast.update_position.side_effect = \
            lambda *a, **k: calls.append('toast')

        manager.on_screen_geometry_changed(QRect(0, 0, 1920, 1080))

        overlay.set_window_size_and_position.assert_called_once_with(
            init=True)
        crosshair.update_position.assert_called_once_with()
        toast.update_position.assert_called_once_with()
        assert calls == ['overlay', 'crosshair', 'toast']

    def test_handler_skips_hidden_crosshair(self, manager):
        """Spec pin: crosshair DISABLED (hidden) -> its update_position
        is NEVER called (show_crosshair already recomputes geometry on
        the next show; touching it here would defeat "if enabled")."""
        _overlay, _toast, crosshair = mock_subwidgets(manager)
        crosshair.isVisible.return_value = False

        manager.on_screen_geometry_changed(QRect(0, 0, 1920, 1080))

        crosshair.update_position.assert_not_called()

    def test_handler_skips_hidden_toast_manager(self, manager):
        """No toast on screen -> nothing re-anchored (visibility gate
        like the crosshair)."""
        _overlay, toast, _crosshair = mock_subwidgets(manager)
        toast.isVisible.return_value = False

        manager.on_screen_geometry_changed(QRect(0, 0, 1920, 1080))

        toast.update_position.assert_not_called()


class TestLeg1RealWidgets:
    """Real offscreen widgets driven by a swapped get_current_screen:
    the handler's recompute actually MOVES the geometry onto the new
    screen (the maintainer's shrink 3840x2160 -> 1920x1080)."""

    @pytest.fixture
    def on_new_screen(self, monkeypatch):
        import fst_overlay
        monkeypatch.setattr(fst_overlay, 'get_current_screen',
                            lambda: FakeScreen(NEW_SCREEN))

    def test_overlay_reanchors_into_new_screen_top_right(
            self, qtbot, overlay_fst, on_new_screen):
        overlay = StatusOverlay(overlay_fst)
        qtbot.addWidget(overlay)
        # start where the OLD (bigger) screen put it: the product's own
        # init anchor math on the 3840x2160 screen, box 20x20
        overlay.setGeometry(3840 - 20, 0, 20, 20)
        qtbot.wait(0)  # let the offscreen platform land the geometry
        # QRect.right() = x + width - 1 (pre-existing 1px convention,
        # reviewer P2-7 - the recompute preserves it, no drive-by fix)
        assert overlay.geometry().right() == 3839  # pre-state: off-screen

        on_screen_geometry_changed = GUI_Manager.on_screen_geometry_changed
        manager = SimpleNamespace(
            overlay=overlay, crosshair=None, toast_manager=None)
        on_screen_geometry_changed(manager, QRect(0, 0, 1920, 1080))

        geo = overlay.geometry()
        # anchor math: top_left_x = NEW_SCREEN.right() - x_size = 1919 -
        # 20 = 1899 -> right() = 1899 + 20 - 1 = 1918 (1px convention)
        assert geo.right() == 1918
        assert geo.top() == 0
        # the cycle box is fully inside the NEW screen
        assert geo.left() >= 0 and geo.bottom() <= 1079

    def test_visible_crosshair_recenters_on_new_screen(
            self, qtbot, overlay_fst, on_new_screen):
        crosshair = CrosshairOverlay(overlay_fst)
        qtbot.addWidget(crosshair)
        crosshair.show_crosshair()  # visible -> handler must reposition
        crosshair.setGeometry(1900, 1900, 100, 100)  # stale old-screen spot
        qtbot.wait(0)

        manager = SimpleNamespace(
            overlay=None, crosshair=crosshair, toast_manager=None)
        # bound handler call with a stand-in self (the real GUI_Manager
        # is heavier; this pin locks the crosshair leg only)
        GUI_Manager.on_screen_geometry_changed(
            manager, QRect(0, 0, 1920, 1080))

        # update_position centers the window: top_left = screen
        # center() minus half size. Pin the PLACEMENT (959,539 - 50 =
        # 909,489, derived from the rule): Qt QRect.center() floors the
        # sum of an even-size rect, so center()-equality is 1px off for
        # any even box and would pin Qt's rounding, not the intent.
        geo = crosshair.geometry()
        assert geo.width() == 100 and geo.height() == 100
        assert geo.topLeft() == QPoint(959 - 50, 539 - 50)

    def test_hidden_crosshair_untouched_by_handler(
            self, qtbot, overlay_fst, on_new_screen):
        crosshair = CrosshairOverlay(overlay_fst)
        qtbot.addWidget(crosshair)
        # __init__ leaves it hidden; park geometry somewhere distinct
        crosshair.setGeometry(1900, 1900, 100, 100)
        assert not crosshair.isVisible()
        before = crosshair.geometry()

        manager = SimpleNamespace(
            overlay=None, crosshair=crosshair, toast_manager=None)
        GUI_Manager.on_screen_geometry_changed(
            manager, QRect(0, 0, 1920, 1080))

        assert crosshair.geometry() == before

    def test_hidden_toast_untouched_by_handler(
            self, qtbot, overlay_fst, on_new_screen):
        """Reviewer P2-1 (symmetry with the hidden-crosshair pin): a
        hidden toast manager must keep its geometry - only the mock
        pin killed the gate-drop mutant before; the real widget now
        kills it too."""
        m = GUI_Manager(overlay_fst, MagicMock())
        qtbot.addWidget(m)
        m.toast_manager.show()  # park it somewhere distinct first
        m.toast_manager.move(123, 456)
        m.toast_manager.hide()
        qtbot.wait(0)
        assert not m.toast_manager.isVisible()
        before = m.toast_manager.geometry()

        m.on_screen_geometry_changed(QRect(0, 0, 1920, 1080))

        assert m.toast_manager.geometry() == before

    def test_toast_lands_on_the_recomputed_overlay_geometry(
            self, qtbot, overlay_fst, on_new_screen):
        """Reviewer P2-4 (not just call count): the toast manager lands
        on the NEW overlay geometry - the real end-to-end order proof
        (update_position: right-edge anchor to the overlay right +
        user_padding, top edge below the overlay bottom)."""
        m = GUI_Manager(overlay_fst, MagicMock())
        qtbot.addWidget(m)
        m.overlay.setGeometry(3840 - 20, 0, 20, 20)  # stale old-screen spot
        m.toast_manager.show()
        qtbot.wait(0)

        m.on_screen_geometry_changed(QRect(0, 0, 1920, 1080))

        ov = m.overlay.geometry()
        tg = m.toast_manager.geometry()
        assert ov.right() == 1918  # overlay re-anchored first
        # ToastManager.update_position (:1030-1039) reads the overlay's
        # QRect right()/bottom() directly - no extra offset
        assert tg.x() == ov.right() - m.toast_manager.width() \
            - m.overlay.user_padding
        assert tg.y() == ov.bottom()

