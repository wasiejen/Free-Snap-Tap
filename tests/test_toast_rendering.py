"""Toast rendering-shape pins (offscreen): multi-line toast texts must fit.

The ToastManager box is fixed at 500 px and the toast text is self-drawn by
the ToastWidget label - text wider than the box used to be cut at the window
width (maintainer observation). Fix: the label wraps near the box width
(wordWrap on, fixed width TOAST_TEXT_MAX_WIDTH < 500) and honors embedded
newlines. The wrapped height comes from the height-for-width layout, so
these pins SHOW the widget (offscreen activation computes geometry
synchronously) and assert shape-based (height growth, width bounds) - no
exact pixel/font assumptions, the offscreen font is the fallback font.
"""
from types import SimpleNamespace

from fst_overlay import (TOAST_TEXT_MAX_WIDTH, ToastManager, ToastWidget,
                         wrap_toast_text)


class FakeMetrics:
    """Deterministic metrics stand-in: every char is 8 px wide."""

    def horizontalAdvance(self, text):
        return len(text) * 8


def test_wrap_toast_text_pure_function():
    # fits exactly: returned as-is, whitespace preserved
    assert wrap_toast_text(' hi ', 480, FakeMetrics()) == ' hi '
    assert wrap_toast_text('first\nsecond', 480, FakeMetrics()) == 'first\nsecond'
    # a 60-char line fits 480 px exactly: hard break at 60, text kept whole
    lines = wrap_toast_text('x' * 100, 480, FakeMetrics()).split('\n')
    assert [len(line) for line in lines] == [60, 40]
    # greedy fill: the second word goes to a new line (61 chars > 60)
    assert wrap_toast_text('a' * 30 + ' ' + 'b' * 30, 480,
                           FakeMetrics()) == 'a' * 30 + '\n' + 'b' * 30


def make_toast(qtbot, text, timer=0):
    toast = ToastWidget(text, 3, 12, 'rgba(40, 40, 40, 200)', 'white',
                        timer=timer)
    qtbot.addWidget(toast)
    toast.show()  # offscreen: activates the layout, geometry computed
    return toast


def test_label_wordwrap_at_box_width(qtbot):
    toast = make_toast(qtbot, 'hi')

    assert toast.label.wordWrap() is True
    assert toast.label.width() == TOAST_TEXT_MAX_WIDTH
    assert TOAST_TEXT_MAX_WIDTH < 500  # must fit inside the manager box


def test_long_text_wraps_not_cut(qtbot):
    short = make_toast(qtbot, 'hi')
    long = make_toast(qtbot, 'x' * 400)

    # one line -> baseline; 400 chars must render as several wrapped lines
    single_line_height = short.label.height()
    assert long.label.height() > 2 * single_line_height
    # the wrapped widget stays inside the fixed manager box (no overflow)
    assert long.width() <= 500
    assert long.label.width() == TOAST_TEXT_MAX_WIDTH


def test_explicit_newlines_render_multiline(qtbot):
    short = make_toast(qtbot, 'hi')
    multiline = make_toast(qtbot, 'first\nsecond')

    assert multiline.label.text() == ' first\nsecond '
    assert multiline.label.height() > short.label.height()


def test_timer_countdown_text_wraps_too(qtbot):
    plain = make_toast(qtbot, 'hi')
    long_timer = make_toast(qtbot, 'y' * 400, timer=1)

    # countdown display uses the same wrapping label
    joined = long_timer.label.text().replace('\n', '')
    assert 'y' * 400 in joined
    assert '3.0s' in joined
    assert long_timer.label.height() > 2 * plain.label.height()
    long_timer.master_timer.stop()  # stop the tick so the widget stays alive


def test_manager_box_stays_fixed_500(qtbot):
    overlay = SimpleNamespace(user_padding=4, geometry=lambda: None)
    fst = SimpleNamespace(arg_manager=SimpleNamespace(STATUS_INDICATOR=True))
    manager = ToastManager(fst, overlay)
    qtbot.addWidget(manager)

    assert manager.width() == 500
