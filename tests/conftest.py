import ctypes
import logging
import os
import sys
import traceback
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

# offscreen Qt platform for the pytest-qt tests (Phase 3) - must be set
# before any PySide6 import happens
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import fst_manager  # noqa: E402
from fst_data_types import ConfigError  # noqa: E402
from fst_keyboard import FST_Keyboard  # noqa: E402
from fst_manager import CONSTANTS  # noqa: E402
from fst_manager import Input_State_Manager  # noqa: E402
from vk_codes import vk_codes_dict  # noqa: E402

VK_A = vk_codes_dict['a']
VK_B = vk_codes_dict['b']
VK_SHIFT = vk_codes_dict['shift']
VK_LEFT_SHIFT = vk_codes_dict['left_shift']


def convert_to_vk_code(key):
    """Same semantics as FST_Keyboard.convert_to_vk_code."""
    try:
        return vk_codes_dict[key]
    except KeyError:
        try:
            key_int = int(key)
            if 0 <= key_int < 256:
                return key_int
            raise ConfigError(f"key '{key}' does not resolve to a vk code", str(key))
        except ValueError:
            raise ConfigError(f"key '{key}' does not resolve to a vk code", str(key))


class FakeFST(SimpleNamespace):
    """Stand-in for FST_Keyboard for Output_Manager/Input_State_Manager unit tests."""

    def __init__(self):
        super().__init__()
        self.state_manager = Input_State_Manager(self)
        self.output_manager = None
        self.arg_manager = SimpleNamespace(
            ACT_DELAY=True,
            ACT_CROSSOVER=False,
            ACT_CROSSOVER_PROPABILITY_IN_PERCENT=50,
            ACT_MIN_DELAY_IN_MS=2,
            ACT_MAX_DELAY_IN_MS=10,
            MACRO_MIN_DELAY_IN_MS=2,
            MACRO_MAX_DELAY_IN_MS=10,
            SAVE_DIR='',
            BACKUP_ROOT_DIR='',
        )
        self.convert_to_vk_code = convert_to_vk_code
        self.loop = None
        self.TIME_DIFF = 0
        self.macro_sequence_alias_list = []
        self.macro_thread_dict = {}
        self.reset_macro_sequence_by_name = MagicMock()
        self.interrupt_macro_by_name = MagicMock()
        self.release_all_currently_pressed_simulated_keys = MagicMock()
        self.toast_callback = MagicMock()
        self.timer_callback = MagicMock()
        self.remove_callback = MagicMock()
        self.remove_all_callback = MagicMock()
        self.check_result = MagicMock()

    def surface_config_error(self, error):
        # delegate to the real FST_Keyboard implementation so the guard's
        # surfacing path (toast vs print) is exercised rather than a copy
        FST_Keyboard.surface_config_error(self, error)


@pytest.fixture(autouse=True)
def redirect_status_file(monkeypatch, tmp_path):
    """F-B4: the status dump (product default: CWD-relative fst_status.log,
    same convention as fst.log) is redirected to tmp_path for EVERY test -
    a suite run never leaves an artifact in the repo root. A test that reads
    the artifact reads fst_manager.STATUS_FILE or patches its own path."""
    monkeypatch.setattr(fst_manager, 'STATUS_FILE',
                        str(tmp_path / 'fst_status.log'))


@pytest.fixture(autouse=True)
def restore_constants():
    attrs = ['DEBUG_NUMPAD', 'TOAST_OFFLOAD', 'DROP_WATCH', 'FILE_NAME',
             'STUCK_TICKET_MS',
             'EXIT_Combination', 'TOGGLE_ON_OFF_Combination', 'MENU_Combination']
    saved = {attr: getattr(CONSTANTS, attr) for attr in attrs}
    yield
    for attr, value in saved.items():
        setattr(CONSTANTS, attr, value)


@pytest.fixture(autouse=True)
def restore_fst_loggers():
    """Save/restore the FST area-logger levels, propagate flags and handlers
    so logging toggles in one test never leak into the next."""
    names = ['fst', 'fst.flow', 'fst.eval', 'fst.state', 'fst.macro', 'fst.config',
             'fst.drop']
    saved = {}
    for name in names:
        lg = logging.getLogger(name)
        saved[name] = (lg.level, lg.propagate, list(lg.handlers))
    yield
    for name, (level, propagate, handlers) in saved.items():
        lg = logging.getLogger(name)
        for handler in lg.handlers[:]:
            lg.removeHandler(handler)
            handler.close()
        for handler in handlers:
            lg.addHandler(handler)
        lg.setLevel(level)
        lg.propagate = propagate


@pytest.fixture
def fake_fst():
    return FakeFST()


@pytest.fixture
def mock_pynput_controllers(monkeypatch):
    """Replace pynput controllers so no real input can ever be emitted."""
    monkeypatch.setattr('pynput.keyboard.Controller', lambda: MagicMock())
    monkeypatch.setattr('pynput.mouse.Controller', lambda: MagicMock())


@pytest.fixture
def kb_env_ns(monkeypatch):
    """Real FST_Keyboard with mocked pynput controllers, yielded as
    SimpleNamespace(kb, kb_mock, mouse_mock); arg flags pre-set to the
    filter-active state (WIN32_FILTER_PAUSED/ACT_DELAY/ACT_CROSSOVER=False);
    _listener mocked, _mouse_listener NOT set."""
    kb_mock = MagicMock()
    ms_mock = MagicMock()
    monkeypatch.setattr('pynput.keyboard.Controller', lambda: kb_mock)
    monkeypatch.setattr('pynput.mouse.Controller', lambda: ms_mock)
    FST_Keyboard.TIME_DIFF = None
    FST_Keyboard.START_TIME = None
    keyboard = FST_Keyboard()
    keyboard._listener = MagicMock()
    keyboard.arg_manager.WIN32_FILTER_PAUSED = False
    keyboard.arg_manager.ACT_DELAY = False
    keyboard.arg_manager.ACT_CROSSOVER = False
    yield SimpleNamespace(kb=keyboard, kb_mock=kb_mock, mouse_mock=ms_mock)
    FST_Keyboard.TIME_DIFF = None
    FST_Keyboard.START_TIME = None


@pytest.fixture
def kb_env_mouse(monkeypatch):
    """Real FST_Keyboard yielded raw; _listener AND _mouse_listener mocked;
    arg flags pre-set to the filter-active state
    (WIN32_FILTER_PAUSED/ACT_DELAY/ACT_CROSSOVER=False)."""
    kb_mock = MagicMock()
    ms_mock = MagicMock()
    monkeypatch.setattr('pynput.keyboard.Controller', lambda: kb_mock)
    monkeypatch.setattr('pynput.mouse.Controller', lambda: ms_mock)
    FST_Keyboard.TIME_DIFF = None
    FST_Keyboard.START_TIME = None
    keyboard = FST_Keyboard()
    keyboard._listener = MagicMock()
    keyboard._mouse_listener = MagicMock()
    keyboard.arg_manager.WIN32_FILTER_PAUSED = False
    keyboard.arg_manager.ACT_DELAY = False
    keyboard.arg_manager.ACT_CROSSOVER = False
    yield keyboard
    FST_Keyboard.TIME_DIFF = None
    FST_Keyboard.START_TIME = None


@pytest.fixture
def kb_env_plain(monkeypatch):
    """Real FST_Keyboard yielded raw; _listener and _mouse_listener mocked;
    arg flags left as constructed (no pre-setting)."""
    kb_mock = MagicMock()
    ms_mock = MagicMock()
    monkeypatch.setattr('pynput.keyboard.Controller', lambda: kb_mock)
    monkeypatch.setattr('pynput.mouse.Controller', lambda: ms_mock)
    FST_Keyboard.TIME_DIFF = None
    FST_Keyboard.START_TIME = None
    keyboard = FST_Keyboard()
    keyboard._listener = MagicMock()
    keyboard._mouse_listener = MagicMock()
    yield keyboard
    FST_Keyboard.TIME_DIFF = None
    FST_Keyboard.START_TIME = None


# --- F-B7 test-isolation tripwire (2026-11-16) --------------------------------
#
# PREVENTIVE HARDENING (reported incident RETRACTED): a "pytest emits real
# input into the live desktop" report was investigated; the cause turned out
# to be the maintainer's own rotated-tablet buttons pressed under his arm
# during WTD testing, not the suite. The tripwire still guards the hazard
# class: a session-scoped autouse patch makes every real OS input/launch
# primitive raise (TestIsolationViolation + call stack) instead of typing
# into the desktop. Any offender the tripwire names must be converted to the
# fake harness (fake_fst / kb_env_* / mock_pynput_controllers, or synthetic
# event objects routed through the filter entry). Escape hatches:
#   @pytest.mark.allow_real_input - tripwire off for one test (justify it);
#   @pytest.mark.live_desktop     - skipped unless FST_RUN_LIVE_DESKTOP=1.


class TestIsolationViolation(RuntimeError):
    """A test reached a real OS input/launch primitive while tripwired."""

    __test__ = False  # not a test class - imported by test modules


_TRIPWIRE_ALLOW = {'allow': False}


def _make_tripwire(label, original):
    """Wrap one real primitive; raise unless the test opted out."""
    def _tripwire(*args, **kwargs):
        if _TRIPWIRE_ALLOW['allow']:
            return original(*args, **kwargs)
        stack = ''.join(traceback.format_stack()[:-1])
        raise TestIsolationViolation(
            f'F-B7 TestIsolationViolation: {label} was called by the test '
            f'process - this path emits REAL OS input/launches. Convert it '
            f'to the fake harness.\nCall stack:\n{stack}'
        )
    return _tripwire


@pytest.fixture(scope='session', autouse=True)
def os_input_tripwire():
    """Patch the real OS input primitives for the whole suite run (F-B7).

    Pinned sites (the choke points of every pynput/ctypes.windll send):
    - pynput keyboard/mouse win32 backends + pynput._util.win32 SendInput
    - pynput.mouse win32 Controller SetCursorPos (class-bound at import)
    - ctypes.windll.user32: SendInput/keybd_event/mouse_event/SetCursorPos/
      SetForegroundWindow
    - ctypes.windll.shell32.ShellExecuteW (elevate relaunch leg)

    Accepted gaps (reviewer P2, 2026-11-16): a separate module-level
    ctypes.WinDLL('user32') instance (fst_overlay.py) is NOT covered - it
    only calls window-visibility APIs today; extend this list if a future
    direct WinDLL input call lands. _TRIPWIRE_ALLOW is process-global (not
    thread-local): an allow_real_input window also unlocks concurrent
    background threads - accepted blast radius (armed by default, tests).
    """
    import pynput._util.win32 as pwu
    import pynput.keyboard._win32 as kw
    import pynput.mouse._win32 as mw

    patches = []

    def _patch(obj, attr, label, wrap=None):
        original = getattr(obj, attr)
        replacement = _make_tripwire(label, original)
        if wrap is not None:
            replacement = wrap(replacement)
        setattr(obj, attr, replacement)
        patches.append((obj, attr, original))

    user32 = ctypes.windll.user32
    for _name in ('SendInput', 'keybd_event', 'mouse_event', 'SetCursorPos',
                  'SetForegroundWindow'):
        _patch(user32, _name, f'ctypes.windll.user32.{_name}')
    _patch(ctypes.windll.shell32, 'ShellExecuteW',
           'ctypes.windll.shell32.ShellExecuteW')
    _patch(kw, 'SendInput', 'pynput.keyboard._win32.SendInput')
    _patch(mw, 'SendInput', 'pynput.mouse._win32.SendInput')
    _patch(pwu, 'SendInput', 'pynput._util.win32.SendInput')
    # pynput.mouse binds SetCursorPos as a name-mangled class attr at import;
    # the ctypes FuncPtr is not a descriptor, so keep the wrapper static
    _patch(mw.Controller, '_Controller__SetCursorPos',
           'pynput.mouse._win32.Controller.__SetCursorPos', staticmethod)
    yield
    for _obj, _attr, _original in reversed(patches):
        setattr(_obj, _attr, _original)


@pytest.fixture(autouse=True)
def tripwire_allow_list(request):
    """Honor the allow_real_input marker for one test (F-B7)."""
    was_allowed = _TRIPWIRE_ALLOW['allow']
    _TRIPWIRE_ALLOW['allow'] = (
        request.node.get_closest_marker('allow_real_input') is not None)
    yield
    _TRIPWIRE_ALLOW['allow'] = was_allowed


def pytest_collection_modifyitems(config, items):
    """Skip live_desktop tests by default (F-B7): they need real OS input.

    With FST_RUN_LIVE_DESKTOP=1 they run but the tripwire stays armed - a
    live_desktop test must ALSO carry @pytest.mark.allow_real_input."""
    if os.environ.get('FST_RUN_LIVE_DESKTOP') == '1':
        return
    skip_live = pytest.mark.skip(
        reason='live_desktop: needs real OS input on a live desktop '
               '(set FST_RUN_LIVE_DESKTOP=1 to run)')
    for item in items:
        if 'live_desktop' in item.keywords:
            item.add_marker(skip_live)
