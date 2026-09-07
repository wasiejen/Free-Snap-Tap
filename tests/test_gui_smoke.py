"""Smoke tests for the offscreen Qt environment (Phase 3 preparation).

Pins QT_QPA_PLATFORM=offscreen (set in conftest): a QApplication boots, a
widget can be shown/raised/processed/closed, and - in the first real overlay
test - a ToastBridge signal reaches ToastManager.add_toast end to end.
The ToastBridge/ToastManager wiring mirrors the maintainer's manual
test_overlay.py script; no real time-based GUI loops are run (only small
qtbot.wait() event-processing waits).
"""
from types import SimpleNamespace

from PySide6.QtWidgets import QFrame, QWidget

from fst_overlay import ToastBridge, ToastManager


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

    # clean up before app shutdown: destroying a toast after its manager's
    # C++ side is gone makes _handle_destruction hit a deleted layout
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
