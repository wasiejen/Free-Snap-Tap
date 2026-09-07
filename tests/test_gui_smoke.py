"""Smoke tests for the offscreen Qt environment (Phase 3 preparation).

Pins QT_QPA_PLATFORM=offscreen (set in conftest): a QApplication boots, a
widget can be shown/raised/processed/closed, and - in the first real overlay
test - a ToastBridge signal reaches ToastManager.add_toast end to end.
The ToastBridge/ToastManager wiring mirrors the maintainer's manual
test_overlay.py script; no real time-based GUI loops are run (only small
qtbot.wait() event-processing waits).
"""
from types import SimpleNamespace

import pytest
from PySide6.QtWidgets import QFrame, QWidget

from fst_overlay import ToastBridge, ToastManager, ToastWidget


def test_offscreen_app_boots_and_widget_lifecycle(qtbot, qapp):
    assert qapp is not None
    widget = QWidget()
    widget.resize(200, 100)
    qtbot.addWidget(widget)
    widget.show()
    widget.raise_()
    qtbot.wait(50)
    assert widget.isVisible()

    widget.close()
    qtbot.wait(50)
    assert not widget.isVisible()


class IndicatorOverlay(QFrame):
    """Parent-overlay stand-in: ToastManager only uses geometry() and
    user_padding on it."""

    user_padding = 4


def make_toast_env():
    fst = SimpleNamespace(arg_manager=SimpleNamespace(STATUS_INDICATOR=True))
    manager = ToastManager(fst, IndicatorOverlay())
    bridge = ToastBridge()
    bridge.signal_show_toast.connect(manager.add_toast)
    bridge.signal_show_timer.connect(manager.add_timer)
    bridge.signal_remove_toast.connect(manager.remove_toast)
    return manager, bridge


def test_bridge_show_toast_signal_roundtrip(qtbot):
    manager, bridge = make_toast_env()
    assert manager.main_layout.count() == 0

    bridge.trigger_toast('hello', 3, 12, 'rgba(40, 150, 40, 200)', 'white')
    bridge.trigger_timer('job', 5, 12, 'rgba(40, 40, 40, 200)', 'white')
    qtbot.wait(50)  # process events; below the 100 ms toast tick

    assert sorted(manager.active_toasts) == ['hello', 'job']
    assert manager.main_layout.count() == 2
    assert manager.active_toasts['hello'].label.text() == ' hello '
    assert manager.active_toasts['job'].label.text() == ' job |   5.0s '
    assert manager.isVisible()

    manager.remove_all_toasts(1)
    qtbot.wait(50)
    assert manager.active_toasts == {}


def test_bridge_remove_toast_signal_roundtrip(qtbot):
    manager, bridge = make_toast_env()

    bridge.trigger_toast('hello', 3, 12, 'rgba(40, 150, 40, 200)', 'white')
    assert 'hello' in manager.active_toasts

    bridge.trigger_remove('hello', 1)
    qtbot.wait(50)  # process the deleteLater + destroyed cleanup

    assert manager.active_toasts == {}
    assert manager.main_layout.count() == 0


def test_handle_destruction_after_manager_shutdown(qtbot):
    """Toasts destroyed together with their manager must not raise: the
    destroyed signal can fire after the manager's C++ side is already gone."""
    manager, bridge = make_toast_env()

    bridge.trigger_toast('hello', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    assert 'hello' in manager.active_toasts

    manager.deleteLater()  # manager and its still-live toasts go away together
    qtbot.wait(50)

    assert manager.active_toasts == {}  # destroyed signal still cleaned up


def test_add_toast_dedup_removes_existing_first(qtbot):
    manager, bridge = make_toast_env()

    bridge.trigger_toast('hello', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    first = manager.active_toasts['hello']

    bridge.trigger_toast('hello', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    second = manager.active_toasts['hello']

    # dedup: exactly one entry under the ID, holding the NEW toast
    assert list(manager.active_toasts) == ['hello']
    assert second is not first
    # the old toast is still in the layout while its deleteLater is pending
    assert manager.main_layout.count() == 2

    # the old toast's timer was stopped by dismiss(...)
    assert not first.master_timer.isActive()

    qtbot.wait(50)  # process the pending DeferredDelete of the old toast
    with pytest.raises(RuntimeError):  # C++ side gone (C++ method call raises)
        first.label.text()


def test_toast_timer_countdown_ticks(qtbot):
    toast = ToastWidget('job', 3, 12, 'rgba(40, 40, 40, 200)', 'white', timer=1)
    qtbot.addWidget(toast)

    assert toast.remaining_seconds == 3.0
    assert toast.label.text() == ' job |   3.0s '

    toast.handle_tick()  # drive the 100 ms tick directly, no real waiting
    assert toast.remaining_seconds == 2.9
    assert toast.label.text() == ' job |   2.9s '


def test_toast_without_timer_keeps_plain_label(qtbot):
    toast = ToastWidget('hi', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    qtbot.addWidget(toast)

    assert toast.label.text() == ' hi '
    toast.handle_tick()
    assert toast.remaining_seconds == 2.9
    assert toast.label.text() == ' hi '  # no countdown display without timer


def test_toast_tick_to_zero_stops_timer_and_destroys(qtbot):
    manager, bridge = make_toast_env()
    bridge.trigger_timer('job', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    toast = manager.active_toasts['job']

    toast.remaining_seconds = 0.05
    toast.handle_tick()
    assert not toast.master_timer.isActive()

    qtbot.wait(50)  # process the deleteLater from handle_tick
    assert manager.active_toasts == {}
    assert manager.main_layout.count() == 0


def test_remove_toast_non_immediate_delete_label(qtbot):
    manager, bridge = make_toast_env()
    bridge.trigger_toast('hello', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    toast = manager.active_toasts['hello']

    manager.remove_toast('hello')  # immediately defaults to 0

    assert toast.label.text() == ' hello | DELETE '
    assert 'rgba(200, 40, 40, 200)' in toast.styleSheet()
    assert toast.master_timer.interval() == 1000  # re-armed for the 1 s delay
    assert toast.master_timer.isActive()

    # finish the toast without waiting the full second
    toast.master_timer.stop()
    toast.deleteLater()
    qtbot.wait(50)
    assert manager.active_toasts == {}
    assert manager.main_layout.count() == 0


def test_remove_toast_unknown_id_is_noop(qtbot):
    manager, _ = make_toast_env()
    manager.remove_toast('missing')  # must not raise
    assert manager.main_layout.count() == 0


def test_remove_all_toasts_immediate(qtbot):
    manager, bridge = make_toast_env()
    bridge.trigger_toast('a', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    bridge.trigger_toast('b', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    bridge.trigger_timer('c', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    assert manager.main_layout.count() == 3

    manager.remove_all_toasts(1)
    qtbot.wait(50)
    assert manager.active_toasts == {}
    assert manager.main_layout.count() == 0


def test_check_empty_hide_show_cycle(qtbot):
    manager, bridge = make_toast_env()

    bridge.trigger_toast('a', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    assert manager.isVisible()  # add_toast shows the manager

    manager.remove_all_toasts(1)
    qtbot.wait(50)
    assert manager.active_toasts == {}
    assert manager.main_layout.count() == 0

    # check_empty hides only when the layout is actually empty; call it
    # directly - the destroyed-signal hook runs while the dying toast is
    # still in the layout (offscreen destruction ordering)
    manager.check_empty()
    assert not manager.isVisible()

    bridge.trigger_toast('b', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    assert manager.isVisible()  # add_toast re-shows the manager
    assert manager.main_layout.count() == 1
    manager.check_empty()  # non-empty layout: stays visible
    assert manager.isVisible()

    manager.remove_all_toasts(1)
    qtbot.wait(50)
    manager.check_empty()
    assert not manager.isVisible()


def test_toast_widget_eq_id_and_duration(qtbot):
    a = ToastWidget('x', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    b = ToastWidget('x', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    c = ToastWidget('y', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    d = ToastWidget('x', 5, 12, 'rgba(40, 40, 40, 200)', 'white')
    for toast in (a, b, c, d):
        qtbot.addWidget(toast)

    assert a == b
    assert not a == c  # different ID
    assert not a == d  # different duration


def test_bridge_remove_all_toasts_signal(qtbot):
    manager, bridge = make_toast_env()
    bridge.signal_remove_all_toasts.connect(manager.remove_all_toasts)

    bridge.trigger_toast('a', 3, 12, 'rgba(40, 40, 40, 200)', 'white')
    bridge.trigger_toast('b', 3, 12, 'rgba(40, 40, 40, 200)', 'white')

    bridge.trigger_remove_all(1)
    qtbot.wait(50)
    assert manager.active_toasts == {}
    assert manager.main_layout.count() == 0


def test_update_position_anchors_to_overlay(qtbot):
    overlay = IndicatorOverlay()
    overlay.move(300, 200)
    overlay.resize(100, 60)
    fst = SimpleNamespace(arg_manager=SimpleNamespace(STATUS_INDICATOR=True))
    manager = ToastManager(fst, overlay)

    manager.update_position()
    # right edge of the 500 px box anchored to the indicator's right edge
    # (QRect.right()/bottom() are inclusive: x+width-1 / y+height-1)
    assert manager.x() == overlay.geometry().right() - 500 - overlay.user_padding
    # top edge anchored just below the indicator
    assert manager.y() == overlay.geometry().bottom()
