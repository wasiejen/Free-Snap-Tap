"""F-B8 suite-abort guard pin: automatic GC stays off for the whole run.

Abort class (measured 2026-11-16, u-fb8-suiteabort): PySide6 6.11.2 /
shiboken6 dies natively (SIGABRT/SIGSEGV, no faulthandler dump) when a
Python GC sweep runs while a Qt C++ frame is active. pytest-qt 4.5 pumps
app.processEvents() around every test phase and qtbot.wait() runs a nested
QEventLoop, so every test after the first Qt test is an event window.
Full-suite GC stress (gc.set_threshold(10, 5, 5)) aborted 6/6 on unchanged
pre-guard trees; with the conftest F-B8 guard the same stress run is clean.
The conftest guard disables automatic GC for the run and sweeps at safe
points instead (see tests/conftest.py F-B8).

This pin fails if automatic collection is ever re-enabled, which would
silently reopen the suite-abort class.
"""
import gc


def test_automatic_gc_disabled_for_suite_run():
    assert not gc.isenabled(), (
        'F-B8: automatic GC is enabled again - sweeps can land inside Qt '
        'event windows (pytest-qt processEvents / nested QEventLoop) and '
        'abort the suite natively; see tests/conftest.py F-B8'
    )
