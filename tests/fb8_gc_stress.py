"""F-B8 GC stress harness - RED leg for the suite-abort class.

NOT collected as tests (no test_* name); loaded only on demand with -p.
Reproduces the full-suite native abort on trees WITHOUT the conftest F-B8
guard (mechanism and history: the F-B8 section in tests/conftest.py):

    PYTHONPATH=tests ./.venv/Scripts/python.exe -m pytest -q -p fb8_gc_stress

measured 6/6 native aborts (exit 3 or 127; faulthandler dump inside
pytest-qt _process_events or the nested QEventLoop exec) on 9699966-era
trees, clean on the guarded tree. The guarded stress run is inert by
construction (gc.disable() neutralizes these thresholds); the GREEN leg is
tests/test_suite_gc_pin.py plus the per-test latch in tests/conftest.py.
"""
import gc


def pytest_configure(config):
    gc.set_threshold(10, 5, 5)
