"""#464 toast geometry pins (offscreen): content-fit width, extend direction,
side-mirrored text alignment (maintainer live-acceptance requests L35-37).

Three sub-behaviors, one side computation:
- width: the label box fits the measured text (existing font-metrics path)
  plus a per-side buffer, clamped to [8 short-line chars, TOAST_TEXT_MAX_WIDTH];
  wrapping still caps at MAX (test_toast_rendering.py keeps the wrap pins);
- extend direction: overlay cycle on the LEFT half of its screen -> the toast
  box extends RIGHT from the cycle; RIGHT half keeps the leftward extension;
- mirrored alignment: text right-aligned on the RIGHT half (hugs the cycle),
  left-aligned on the LEFT half - both flip from toast_screen_right().

RED before the implementation (measured on the untouched fst_combined tip):
the module has no toast_screen_right / toast_box_width (import ImportError
kills the whole file) and the label alignment / left-half x pins fail.
Boundary ruling (stated per spec): a cycle centered EXACTLY on the screen
midline counts as the RIGHT half - today's leftward extension is preserved.
"""
from types import SimpleNamespace

from PySide6.QtCore import QPoint, QRect, Qt
from PySide6.QtGui import QFontMetrics

import fst_overlay
from fst_overlay import (TOAST_TEXT_MAX_WIDTH, TOAST_TEXT_MIN_CHARS,
                         TOAST_TEXT_SIDE_PAD, ToastManager, ToastWidget,
                         toast_box_width, toast_font, toast_screen_right)

SCREEN = QRect(0, 0, 1920, 1080)


class FakeMetrics:
    """Deterministic metrics stand-in (same shape as
    tests/test_toast_rendering.py): every char is 8 px wide."""

    def horizontalAdvance(self, text):
        return len(text) * 8


class FakeScreen:
    """Stand-in for QScreen as far as the side computation reads it."""

    def __init__(self, rect):
        self._rect = QRect(rect)

    def geometry(self):
        return QRect(self._rect)

    def name(self):
        return 'FakeScreen'


# ---------------------------------------------------------------- width rule

def test_toast_box_width_rule_pure():
    # tiny text -> the min floor: TOAST_TEXT_MIN_CHARS chars + the per-side
    # buffer on both sides (' mm ' is 4 chars -> below the 8-char floor)
    assert toast_box_width(' hi ', FakeMetrics()) == \
        8 * 8 + 2 * TOAST_TEXT_SIDE_PAD
    # content between floor and cap: measured content + buffer, no clamp
    assert toast_box_width('word' * 7, FakeMetrics()) == \
        28 * 8 + 2 * TOAST_TEXT_SIDE_PAD
    # cap: wrap-capped content (480 px) + buffer clamps back to MAX
    assert toast_box_width('y' * 60, FakeMetrics()) == TOAST_TEXT_MAX_WIDTH
    # multi-line: the WIDEST line sizes the box, not the sum
    assert toast_box_width('ab\n' + 'c' * 20, FakeMetrics()) == \
        20 * 8 + 2 * TOAST_TEXT_SIDE_PAD


def test_tiny_text_gets_small_box(qtbot):
    metrics = QFontMetrics(toast_font(12))
    toast = ToastWidget('mm', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    qtbot.addWidget(toast)
    toast.show()

    floor = (metrics.horizontalAdvance('x' * TOAST_TEXT_MIN_CHARS)
             + 2 * TOAST_TEXT_SIDE_PAD)
    # the maintainer case: 'mm' gets a small box, not the 480 px box
    assert toast.label.width() < TOAST_TEXT_MAX_WIDTH
    assert toast.label.width() == floor
    # reviewer P2-9 companion: a host-independent band, so a constant edit
    # cannot silently move the floor (64 px = 8 chars at 7 px + buffers on
    # the live Consolas, 104 px measured on the offscreen fallback font)
    assert 64 <= toast.label.width() <= 160


def test_long_text_caps_at_max_and_wraps(qtbot):
    toast = ToastWidget('x' * 400, 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    qtbot.addWidget(toast)
    toast.show()

    assert toast.label.width() == TOAST_TEXT_MAX_WIDTH
    assert '\n' in toast.label.text()  # still wrapped at MAX


def test_width_scales_with_text_length(qtbot):
    # deterministic across host fonts: the monospace advance at 12 px sits
    # in ~7-14 px, so 20 chars stay inside (floor, MAX) at either end
    tiny = ToastWidget('mm', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    medium = ToastWidget('x' * 20, 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    long = ToastWidget('x' * 400, 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    for t in (tiny, medium, long):
        qtbot.addWidget(t)
        t.show()

    assert tiny.label.width() < medium.label.width() < long.label.width()
    assert long.label.width() == TOAST_TEXT_MAX_WIDTH


# ------------------------------------------------------- side helper (source)

def test_toast_screen_right_helper_half_boundary():
    # cycle center LEFT of the screen center -> left half (False: the box
    # extends RIGHT, the text left-aligns)
    assert toast_screen_right(QRect(100, 200, 20, 20), SCREEN) is False
    assert toast_screen_right(QRect(1800, 200, 20, 20), SCREEN) is True
    # stated boundary: a cycle whose (QRect-truncated) center x equals the
    # screen center x is the RIGHT half - today's leftward extension is
    # preserved there. A 20-px box at x=950 spans [950,969] -> center 959 =
    # SCREEN.center().x()
    mid = SCREEN.center().x()
    assert toast_screen_right(QRect(mid - 9, 0, 20, 20), SCREEN) is True
    # one pixel left of the midline center (x=949 spans [949,968] -> 958)
    # -> left half
    assert toast_screen_right(QRect(mid - 10, 0, 20, 20), SCREEN) is False


# ---------------------------------------------------------- manager placement

def make_manager(qtbot, monkeypatch, rect, screen=SCREEN):
    """Real ToastManager on a geometry-holder overlay + a faked current
    screen (the FakeScreen pattern of tests/test_resolution_reposition.py;
    patched on the get_screen_at seam the manager resolves the CYCLE's
    screen through, #464 reviewer P2-4)."""
    state = {'rect': QRect(rect)}
    overlay = SimpleNamespace(user_padding=4, geometry=lambda: state['rect'])
    monkeypatch.setattr(fst_overlay, 'get_screen_at',
                        lambda point: FakeScreen(screen))
    fst = SimpleNamespace(arg_manager=SimpleNamespace(STATUS_INDICATOR=True))
    manager = ToastManager(fst, overlay)
    qtbot.addWidget(manager)
    return manager, state


def test_update_position_extends_left_on_right_half(qtbot, monkeypatch):
    # the #398/#463 anchor, unchanged on the right half: right edge of the
    # 500 px box at the indicator right edge (QRect.right() is inclusive)
    manager, _ = make_manager(qtbot, monkeypatch, QRect(1800, 200, 20, 20))

    manager.update_position()

    assert manager.x() == 1819 - 500 - 4
    assert manager.y() == 219  # bottom() = 200 + 20 - 1


def test_update_position_extends_right_on_left_half(qtbot, monkeypatch):
    # mirror (#464): left edge of the box anchored to the indicator left
    # edge + padding, the box extends RIGHT away from the screen edge
    manager, _ = make_manager(qtbot, monkeypatch, QRect(100, 200, 20, 20))

    manager.update_position()

    assert manager.x() == 100 + 4
    assert manager.y() == 219


def test_add_toast_mirrors_box_and_text_per_side(qtbot, monkeypatch):
    right, _ = make_manager(qtbot, monkeypatch, QRect(1800, 200, 20, 20))
    right.add_toast('hello', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    # right half: text right-bounded (the maintainer ask - today it is
    # left-bounded) and the box hugs the right (cycle) side
    assert right.active_toasts['hello'].label.alignment() \
        == Qt.AlignRight | Qt.AlignVCenter
    # (the right-half item flag pre-dates #464 - a regression pin: it now
    # flips with the side, the left leg below is the discriminating one)
    assert right.main_layout.itemAt(0).alignment() & Qt.AlignRight

    left, _ = make_manager(qtbot, monkeypatch, QRect(100, 200, 20, 20))
    left.add_toast('hello', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    # left half: both flip from the SAME side computation
    assert left.active_toasts['hello'].label.alignment() \
        == Qt.AlignLeft | Qt.AlignVCenter
    assert left.main_layout.itemAt(0).alignment() & Qt.AlignLeft


def test_resolution_flip_remirrors_live_toasts(qtbot, monkeypatch):
    # the #463 re-anchor drives update_position after the overlay moved -
    # a live toast re-mirrors with the side, it does not strand
    manager, state = make_manager(qtbot, monkeypatch, QRect(1800, 200, 20, 20))
    manager.add_toast('hello', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    assert manager.active_toasts['hello'].label.alignment() \
        == Qt.AlignRight | Qt.AlignVCenter
    assert manager.main_layout.itemAt(0).alignment() & Qt.AlignRight

    state['rect'] = QRect(100, 200, 20, 20)  # the cycle now sits left
    manager.update_position()

    assert manager.x() == 104
    assert manager.active_toasts['hello'].label.alignment() \
        == Qt.AlignLeft | Qt.AlignVCenter
    assert manager.main_layout.alignment() & Qt.AlignLeft
    # reviewer P1 companion: the PER-ITEM flag is what places the fixed-width
    # box inside the 500 px window - the layout flag alone never moves it
    assert manager.main_layout.itemAt(0).alignment() & Qt.AlignLeft
    assert not manager.main_layout.itemAt(0).alignment() & Qt.AlignRight


# ------------------------------------------------- dismiss re-fit + screen seam

def test_dismiss_refits_the_box_to_the_delete_text(qtbot):
    # reviewer P2-5: ' | DELETE ' outgrows a shrunk build-time box - the
    # pre-fix code set it raw and wordWrap grew the box to two lines for the
    # 1 s farewell (reviewer measured label h 12 -> 26 on 'mm'); dismiss now
    # re-wraps and re-fits, so the DELETE line stays one line
    toast = ToastWidget('mm', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    qtbot.addWidget(toast)
    toast.show()
    build_width = toast.label.width()

    toast.dismiss(0)
    toast.master_timer.stop()  # keep the widget alive for teardown

    assert 'DELETE' in toast.label.text()
    assert '\n' not in toast.label.text()
    assert toast.label.width() > build_width  # grew to fit, not wrapped


def test_get_screen_at_prefers_the_cycle_screen(monkeypatch):
    # reviewer P2-4: the side follows the screen the CYCLE is on, not the
    # cursor's screen - Qt resolves the point, the cursor-based
    # get_current_screen() stays the fallback for the None case
    from PySide6.QtWidgets import QApplication

    widget_screen = FakeScreen(SCREEN)
    monkeypatch.setattr(QApplication, 'screenAt',
                        staticmethod(lambda point: widget_screen))
    assert fst_overlay.get_screen_at(QPoint(500, 500)) is widget_screen

    monkeypatch.setattr(QApplication, 'screenAt',
                        staticmethod(lambda point: None))
    fallback = FakeScreen(QRect(0, 0, 800, 600))
    monkeypatch.setattr(fst_overlay, 'get_current_screen', lambda: fallback)
    assert fst_overlay.get_screen_at(QPoint(500, 500)) is fallback
