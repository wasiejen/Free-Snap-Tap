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

from fst_overlay import (TOAST_FONT_FAMILIES, TOAST_QSS_FONT_FAMILIES,
                         TOAST_TEXT_MAX_WIDTH, ToastManager, ToastWidget,
                         toast_font, wrap_toast_text)


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


def test_wrap_path_keeps_space_runs_like_fits_path():
    # U290R: the wrap-path token loop split on single spaces and dropped the
    # empty tokens, so "a  b" collapsed to "a b" while wrapping - the fits
    # path returned the paragraph verbatim and the two paths diverged
    text = 'a' * 10 + '  ' + 'b' * 10 + ' ' + 'c' * 40  # 63 chars > 60
    out = wrap_toast_text(text, 480, FakeMetrics())
    assert out == 'a' * 10 + '  ' + 'b' * 10 + '\n' + 'c' * 40
    # a leading run that JOINS the first word is kept (no standalone line)
    assert wrap_toast_text('  ' + 'd' * 58 + ' x', 480, FakeMetrics()).startswith('  ')
    # a leading run that cannot join is dropped at the break: a
    # whitespace-only line would render as a blank line in the toast (P2)
    lines = wrap_toast_text('  ' + 'x' * 70, 60, FakeMetrics()).split('\n')
    assert all(line.strip() for line in lines)
    # a trailing run stays on the last line (only the run that causes a break
    # is consumed - the fits path keeps trailing whitespace verbatim)
    assert wrap_toast_text('word ' + 'x' * 40 + ' ', 60,
                           FakeMetrics()).endswith(' ')


def test_toast_font_mirrors_the_stylesheet_chain():
    # U290R: the pre-wrap metrics used a Consolas-only QFont while the label
    # stylesheet carries a fallback chain - on a machine without Consolas the
    # measured width came from a font the text never rendered in
    assert toast_font(12).families() == list(TOAST_FONT_FAMILIES)
    assert toast_font(12).pixelSize() == 12
    toast = ToastWidget('hi', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    # the stylesheet chain is single-sourced from the metrics chain
    assert TOAST_QSS_FONT_FAMILIES in toast.styleSheet()
    assert "font-family: 'Consolas';" not in toast.styleSheet()
    toast.master_timer.stop()
    toast.deleteLater()


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
