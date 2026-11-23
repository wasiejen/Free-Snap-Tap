"""U388 Leg 2 - the cycle (status dot) never clips bottom-right after a
box-size drift / resolution change (TODO #388). PAIR MODE, protocol:
agent/handover/protocols/protocol_fst-resolution-reset.md (estate).

Root cause (Leg 0, reviewer-verified): paintEvent drew the cycle from
the STORED box vars - drawEllipse(x_size - p - s, p, s, s),
x_size = 2p+s -> symmetric margins iff the paint state matches the
real widget rect; after a display change the box drifts (Qt DPI
re-scale / external resize) with nothing re-deriving it -> the cycle
overruns the bottom-right (maintainer report).

Cure: paintEvent draws from _cycle_rect(), which takes the DPR-correct
cycle extent s (= user_size, recomputed by the Leg-1 recompute) and
CENTER-derives x/y from the REAL widget size:
    x = (width()-s)//2, y = (height()-s)//2
Appearance-parity while the box matches its vars:
    (x_size - s)//2 = ((2p+s) - s)//2 = p = x_size - p - s
(independently re-derived by the reviewer at STEP-0; dpr-independent -
truncation lands at the int() sites in set_window_size_and_position).

RED-before pins, run against branch tip 2d07079 (Leg-1 state, base
86d8394 for the paint path) BEFORE the Leg-2 code:
- drift pin: the REAL painted pixels of a box that changed size
  without a recompute come out off-center on the base (bbox center
  7.5 vs widget center 15.5 on a 24->32 drift) -> fails;
- _cycle_rect() does not exist on the base -> AttributeError.
"""
from types import SimpleNamespace

import pytest
from PySide6.QtCore import QRect
from PySide6.QtGui import QPainter, QPaintEvent
from unittest.mock import MagicMock

import fst_overlay
from fst_overlay import StatusOverlay


class FakeScreen:
    """Stand-in for QScreen as far as the positioning code reads it
    (local copy - fixtures do not cross test files)."""

    def __init__(self, rect, dpr=1.0, name='FakeScreen'):
        self._rect = rect
        self._dpr = dpr
        self._name = name

    def geometry(self):
        return QRect(self._rect)

    def size(self):
        return QRect(self._rect)

    def devicePixelRatio(self):
        return self._dpr

    def name(self):
        return self._name


@pytest.fixture
def overlay_fst():
    """Stand-in fst (same local-fixture rule as the Leg-1 file)."""
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


class TestLeg2CycleClip:
    def test_cycle_bounds_stay_centered_after_box_drift(
            self, qtbot, overlay_fst, monkeypatch):
        """The drift channel: the box changed size WITHOUT a
        set_window_size_and_position recompute (the DPI re-scale
        shape). Seam: QPainter.drawEllipse is recorded (tuple ints) -
        the pin asserts the DRAWN BOUNDS math, which is what clips the
        cycle. Documented var set s=12, p=2, stale box vars 16x16;
        box drifts to 32x32 -> the cycle must draw centered:
        (x,y) = ((32-12)//2, (32-12)//2) = (10,10), right/bottom edge
        21 < 32 (inside, no clip). RED on base: paintEvent anchors at
        the stale x_size -> drawn (2,2,12,12), center 7.5 vs 15.5.
        (A QImage pixel-scan variant aborted the process in shiboken
        GC while pytest rendered the RED traceback - the draw-args
        seam keeps the failure frame pure ints.)"""
        drawn = []

        def spy(self_p, *args):
            if len(args) == 4:
                drawn.append(tuple(args))  # base form (x, y, w, h)
            else:
                r = args[0]
                drawn.append((r.x(), r.y(), r.width(), r.height()))

        monkeypatch.setattr(QPainter, 'drawEllipse', spy)
        overlay = StatusOverlay(overlay_fst)
        qtbot.addWidget(overlay)
        overlay.user_size = 12
        overlay.user_padding = 2
        overlay.x_size = 16
        overlay.y_size = 16
        overlay.setGeometry(0, 0, 16, 16)
        # drift: box grows to 32 with NO recompute (paint state stale)
        overlay.resize(32, 32)

        overlay.paintEvent(QPaintEvent(QRect(0, 0, 32, 32)))

        assert drawn == [(10, 10, 12, 12)], \
            f'cycle drawn at {drawn}; box 32, s 12 -> centered (10,10)'

    def test_cycle_rect_math_at_dpr2_on_a_shrunk_screen(
            self, qtbot, overlay_fst, monkeypatch):
        """No-clip math proof at a DPR that truncates (dpr=2.0) on a
        shrunk screen: derived rule s = int(10*2) = 20, p = int(5*2) =
        10, box = 2p+s = 40. _cycle_rect() must be QRect(10,10,20,20):
        symmetric margins, fully inside the real widget, cycle center
        == box center. RED before: _cycle_rect does not exist."""
        monkeypatch.setattr(fst_overlay, 'get_current_screen',
                            lambda: FakeScreen(QRect(0, 0, 1280, 720),
                                               dpr=2.0))
        overlay = StatusOverlay(overlay_fst)
        qtbot.addWidget(overlay)

        assert overlay.user_size == 20      # int(10 * 2.0)
        assert overlay.user_padding == 10   # int(5 * 2.0)
        assert overlay.width() == 40 and overlay.height() == 40

        r = overlay._cycle_rect()
        assert r == QRect(10, 10, 20, 20)
        # containment inside the REAL widget + symmetric margins
        assert r.x() == overlay.width() - 1 - r.right() == 10
        assert r.y() == overlay.height() - 1 - r.bottom() == 10
        assert r.right() <= overlay.width() - 1
        assert r.bottom() <= overlay.height() - 1

    def test_cycle_rect_tracks_live_widget_width_on_parity_state(
            self, qtbot, overlay_fst):
        """Appearance-parity cross-check on the default offscreen state
        (dpr=1.0, s=10, p=5, box=20): the derived rect equals the OLD
        stored-var anchor (p, p, s, s) = (5,5,10,10) - proving the
        cure is appearance-identical while the vars match the box
        (the (2p+s-s)//2 == p identity at work)."""
        overlay = StatusOverlay(overlay_fst)
        qtbot.addWidget(overlay)
        assert overlay.user_padding == 5 and overlay.user_size == 10
        assert overlay.width() == 20
        assert overlay._cycle_rect() == QRect(5, 5, 10, 10)
