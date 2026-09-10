import os
import sys
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
        except ValueError:
            raise KeyError(key)


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


@pytest.fixture(autouse=True)
def restore_constants():
    attrs = ['DEBUG', 'DEBUG2', 'DEBUG3', 'DEBUG4', 'DEBUG_NUMPAD', 'FILE_NAME',
             'EXIT_Combination', 'TOGGLE_ON_OFF_Combination', 'MENU_Combination']
    saved = {attr: getattr(CONSTANTS, attr) for attr in attrs}
    yield
    for attr, value in saved.items():
        setattr(CONSTANTS, attr, value)


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
