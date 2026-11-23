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

#463 SUPERSESSION (maintainer ruling 2026-11-23, live-acceptance file
L34): the corner re-anchor above is superseded for a USER-DRAGGED
overlay - a dragged position now survives a resolution/scale change as
the SAME RELATIVE position (the top-left fractions of the old screen
geometry applied to the new geometry, clamped fully on-screen,
TestRelativePosition below). The startup-corner semantics stay for the
DEFAULT (never-dragged) case: the handler now calls
set_window_size_and_position(relative=True) - DPR re-derive + relative
remap, corner anchor while _rel_frac is None. The Leg-1 pins below keep
detection, order, visibility gates, the never-dragged default landing,
crosshair re-center and the toast re-anchor (the #398 behaviors).

Offscreen Qt (conftest pins QT_QPA_PLATFORM=offscreen); real widgets,
geometryChanged never emitted - the handler is driven directly (the
Qt-level emission is live-acceptance territory). FakeScreen stands in
for get_current_screen() (module-level function - monkeypatchable).
"""
from types import SimpleNamespace

import pytest
from PySide6.QtCore import QPoint, QRect, Qt
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
        once: overlay recompute with relative=True (DPR re-derive + the
        #463 relative remap - SUPERSEDES the Leg-1 init=True corner
        call, the named re-pin per maintainer ruling 2026-11-23),
        visible crosshair update_position, toast manager AFTER the
        overlay (it anchors to the overlay geometry - reviewer P2-4),
        all in that order (RED before: the handler still calls
        init=True - corner re-anchor)."""
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
            relative=True)
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

    def test_never_dragged_overlay_reanchors_into_new_screen_top_right(
            self, qtbot, overlay_fst, on_new_screen):
        """#463 DEFAULT-case pin (startup default behavior unchanged):
        an overlay the user never moved (_rel_frac stays None) keeps the
        pinned Leg-1 startup-corner landing - this test passes before
        AND after #463 by design (the contract that must not regress;
        the discriminating relative pins live in TestRelativePosition).
        The Leg-1 real-widget proof that the handler's recompute moves
        the geometry onto the new screen is unchanged."""
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


class TestRelativePosition:
    """#463 (maintainer ruling 2026-11-23): a USER-DRAGGED overlay
    survives a resolution/scale change at the same RELATIVE position -
    top_left lands at clamp(fx*W', fy*H') of the new screen geometry.
    RED before the implementation (measured on the untouched base):
    - the fraction pin dies with AttributeError (no _rel_frac),
    - the two placement pins land the box back at the startup corner
      (1899, 0) - the superseded Leg-1 re-anchor, not the fraction.
    The never-dragged DEFAULT case (TestLeg1RealWidgets above) passes
    before AND after - startup default unchanged, by design.
    Drag capture placement (worker decision, spec "keep fractions
    current"): mouseMoveEvent during the drag AND mouseReleaseEvent at
    drag end, both against the screen the overlay sits on
    (_current_screen, the existing cursor-screen selection)."""

    @pytest.fixture
    def on_old_screen(self, monkeypatch):
        """Construct + drag on a STABLE FakeScreen(3840x2160) instance:
        the identity keeps the drag's screen-change check quiet (the
        product compares screens by identity)."""
        import fst_overlay
        old = FakeScreen(OLD_SCREEN)
        monkeypatch.setattr(fst_overlay, 'get_current_screen',
                            lambda: old)
        return old

    def _drag_to(self, qtbot, overlay, target):
        """Real qtbot drag (press/move/release). QTest mouse positions
        are LOCAL (global = widget.pos() + local); the drag handler
        re-centers the box under the cursor, so
        local = target - pos + size//2 lands the top-left on target."""
        qtbot.mousePress(overlay, Qt.LeftButton)
        qtbot.mouseMove(
            overlay,
            QPoint(target.x() - overlay.x() + overlay.x_size // 2,
                   target.y() - overlay.y() + overlay.y_size // 2))
        qtbot.mouseRelease(overlay, Qt.LeftButton)

    def _change_to_new_screen(self, monkeypatch, overlay):
        """The resolution-change event on the NEW (smaller) screen -
        same direct-drive shape as the Leg-1 real-widget pins."""
        import fst_overlay
        monkeypatch.setattr(fst_overlay, 'get_current_screen',
                            lambda: FakeScreen(NEW_SCREEN))
        manager = SimpleNamespace(overlay=overlay, crosshair=None,
                                  toast_manager=None)
        GUI_Manager.on_screen_geometry_changed(
            manager, QRect(0, 0, 1920, 1080))

    def test_drag_updates_stored_fraction(self, qtbot, overlay_fst,
                                          on_old_screen):
        """Fraction-capture pin (the drag-update placement itself):
        never-dragged -> _rel_frac is None (default state); after a
        real drag to (960, 540) on 3840x2160 the stored fractions are
        exactly (960/3840, 540/2160) = (0.25, 0.25)."""
        overlay = StatusOverlay(overlay_fst)
        qtbot.addWidget(overlay)
        assert overlay._rel_frac is None
        self._drag_to(qtbot, overlay, QPoint(960, 540))
        assert overlay.geometry().topLeft() == QPoint(960, 540)

        assert overlay._rel_frac == (0.25, 0.25)

    def test_dragged_overlay_lands_at_same_relative_position(
            self, qtbot, overlay_fst, on_old_screen, monkeypatch):
        """The #463 fraction-math pin (spec acceptance): drag to (x, y)
        on W x H -> geometry change to W' x H' -> top_left =
        (x/W*W', y/H*H'), clamp not needed on this fixture."""
        overlay = StatusOverlay(overlay_fst)
        qtbot.addWidget(overlay)
        self._drag_to(qtbot, overlay, QPoint(960, 540))

        self._change_to_new_screen(monkeypatch, overlay)

        # rule-derived: x = 960/3840*1920 = 480, y = 540/2160*1080 = 270
        geo = overlay.geometry()
        assert geo.topLeft() == QPoint(480, 270)
        assert geo.width() == 20 and geo.height() == 20
        # fully inside the NEW screen
        assert geo.left() >= 0 and geo.right() <= 1919
        assert geo.top() >= 0 and geo.bottom() <= 1079

    def test_relative_position_clamps_fully_on_screen(            self, qtbot, overlay_fst, on_old_screen, monkeypatch):
        """Edge clamp case (spec acceptance): a drag to (3820, 2130) -
        flush bottom-right on 3840x2160 - lands clamped on 1920x1080,
        box fully on-screen (right/bottom edges flush with the new
        screen)."""
        overlay = StatusOverlay(overlay_fst)
        qtbot.addWidget(overlay)
        self._drag_to(qtbot, overlay, QPoint(3820, 2130))
        assert overlay.geometry().topLeft() == QPoint(3820, 2130)

        self._change_to_new_screen(monkeypatch, overlay)

        # unclamped rule: x = 3820/3840*1920 = 1910, y =
        # 2130/2160*1080 = 1065; clamp bounds: max_x = 1920 - 20 = 1900,
        # max_y = 1080 - 20 = 1060
        geo = overlay.geometry()
        assert geo.topLeft() == QPoint(1900, 1060)
        assert geo.right() == 1919 and geo.bottom() == 1079

    def test_plain_click_keeps_the_never_dragged_default(
            self, qtbot, overlay_fst, on_old_screen, monkeypatch):
        """P1 recheck pin (review of 85bda0d): press + release with ZERO
        cursor movement is not a drag - _rel_frac must stay None and a
        later resolution change must land the pinned startup corner
        (right() - x_size, the 1px convention), NOT a baked corner
        fraction. RED before the movement gate (measured): the release
        stored (3819/3840, 0); the remap rule gives round(0.99453125 *
        1920) = round(1909.5) = 1910 -> clamp(1900) -> top-left
        (1900, 0), while the never-dragged default lands (1899, 0)."""
        overlay = StatusOverlay(overlay_fst)
        qtbot.addWidget(overlay)
        assert overlay.geometry().topLeft() == QPoint(3819, 0)

        qtbot.mousePress(overlay, Qt.LeftButton)
        qtbot.mouseRelease(overlay, Qt.LeftButton)

        assert overlay._rel_frac is None

        self._change_to_new_screen(monkeypatch, overlay)

        geo = overlay.geometry()
        assert geo.topLeft() == QPoint(NEW_SCREEN.right() - 20, 0)  # (1899, 0)

