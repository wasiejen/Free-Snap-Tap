"""single-instance guard pins (maintainer decision 2026-11-16, X-SINGLE):
one FST instance at a time - a second start logs one notice line and
exits 1.

Pinned lanes: real in-process double acquire (kernel 'first' then
'already_running' - a named mutex is inert, no device and no prompt; the
maintainer instruction names this pin and overrides the 'no Windows
APIs' test line for it), the Global-scoped mutex name, the refusal
(WARNING line byte-exact + SystemExit 1), api_error fail-open (NULL
handle and raising seam both continue), the FST_ALLOW_MULTI_INSTANCE
test seam, and the __main__ wiring exec harness (lane-before-guard,
guard-before-console-hide-and-init; the elevation relaunch exit 0 never
reaches the guard).

Discriminator: every pin is red on the pre-guard tree (R1: the module
and its symbols did not exist; the harness pins were additionally run
against the HEAD copy of the __main__ block in scratch - the block had
no guard call, guard_calls=0 there, RED verified 2026-11-16).
"""
import ctypes
import logging
import os
import types
from unittest.mock import MagicMock

import pytest

import fst_single_instance as fsi

BS = chr(92)
NOTICE = '[SingleInstance] another FST is already running - exiting'


class TestRealAcquire:
    """Real kernel32 acquisition with a unique test-scope name."""

    def _close(self, handle):
        if handle:
            ctypes.windll.kernel32.CloseHandle(handle)

    def test_double_acquire_in_process_refuses_second(self):
        name = 'Global' + BS + 'fst_si_test_double_' + str(os.getpid())
        try:
            assert fsi.acquire_single_instance_guard(name) == 'first'
            assert fsi._mutex_handle  # handle kept for the process life
            assert fsi.acquire_single_instance_guard(name) == 'already_running'
        finally:
            self._close(fsi._mutex_handle)
            fsi._mutex_handle = None

    def test_mutex_name_is_global_scoped(self):
        assert fsi.MUTEX_NAME == 'Global' + BS + 'fst_free_snap_tap'


@pytest.fixture()
def seam(monkeypatch):
    """Patch the raw CreateMutexW seam; return {calls, state}."""
    rec = {'calls': []}
    state = {'handle': 1234, 'err': 0, 'raises': None}

    def fake(name):
        rec['calls'].append(name)
        if state['raises'] is not None:
            raise state['raises']
        return state['handle'], state['err']

    monkeypatch.setattr(fsi, '_kernel32_create_mutexw', fake)
    monkeypatch.delenv('FST_ALLOW_MULTI_INSTANCE', raising=False)
    fsi._mutex_handle = None
    rec['state'] = state
    return rec


class TestRefusalPath:
    def test_first_acquire_keeps_handle_and_continues(self, seam):
        fsi.handle_single_instance_guard()
        assert seam['calls'] == [fsi.MUTEX_NAME]
        assert fsi._mutex_handle == 1234

    def test_second_instance_exits_1_with_one_notice(self, seam, caplog):
        seam['state']['handle'] = 999  # ALREADY_EXISTS still hands a handle
        seam['state']['err'] = fsi.ERROR_ALREADY_EXISTS
        with caplog.at_level(logging.WARNING, logger='fst'):
            with pytest.raises(SystemExit) as exc:
                fsi.handle_single_instance_guard()
        assert exc.value.code == 1  # documented startup-error code, calm
        messages = [r.getMessage() for r in caplog.records
                    if r.name == 'fst']
        assert messages == [NOTICE]  # ONE line, byte-exact, WARNING level

    def test_null_handle_fails_open(self, seam, caplog):
        seam['state']['handle'] = None  # API failure, not a refusal
        seam['state']['err'] = 5
        with caplog.at_level(logging.WARNING, logger='fst'):
            fsi.handle_single_instance_guard()  # NO exit - fail open
        joined = ' '.join(r.getMessage() for r in caplog.records
                          if r.name == 'fst')
        assert 'CreateMutexW failed' in joined
        assert 'GetLastError=5' in joined

    def test_raising_seam_fails_open(self, seam, caplog):
        seam['state']['raises'] = OSError('no kernel32 here')
        with caplog.at_level(logging.WARNING, logger='fst'):
            fsi.handle_single_instance_guard()  # NO exit - fail open
        joined = ' '.join(r.getMessage() for r in caplog.records
                          if r.name == 'fst')
        assert 'mutex API failed' in joined
        assert seam['calls'] == [fsi.MUTEX_NAME]

    def test_env_seam_skips_guard(self, seam, monkeypatch):
        monkeypatch.setenv('FST_ALLOW_MULTI_INSTANCE', '1')
        fsi.handle_single_instance_guard()
        assert seam['calls'] == []  # test seam: no acquire attempt at all


class TestMainBlockWiring:
    """Exec harness (shape of tests/test_headless_loop_wiring.py): order
    pins for the guard inside the __main__ block."""

    def _run_block(self, lane_body=None, guard_body=None):
        import importlib.util
        import textwrap
        spec = importlib.util.find_spec('free_snap_tap')
        with open(spec.origin, encoding='utf-8') as fh:
            lines = fh.read().splitlines()
        marker = 'if __name__ == "__main__":'
        start = lines.index(marker) + 1
        code = compile(textwrap.dedent('\n'.join(lines[start:])),
                       spec.origin, 'exec')

        kb = MagicMock()
        kb.arg_manager.TRAY_ICON = False
        kb.arg_manager.STATUS_INDICATOR = False
        kb.arg_manager.CMD_WINDOW_HIDDEN = True
        state = {'console': False, 'keyboard': False, 'lane': False,
                 'guard': 0, 'console_at_guard': None,
                 'keyboard_at_guard': None, 'lane_at_guard': None}

        def lane(argv):
            state['lane'] = True
            if lane_body is not None:
                lane_body(argv)
            return list(argv)

        def guard():
            state['guard'] += 1
            state['console_at_guard'] = state['console']
            state['keyboard_at_guard'] = state['keyboard']
            state['lane_at_guard'] = state['lane']
            if guard_body is not None:
                guard_body()

        class FakeThread:
            def __init__(self, target=None, daemon=None):
                self.target = target

            def start(self):
                pass

        globs = {
            '__name__': '__main__',
            'setup_fst_logging': lambda: None,
            'logger': MagicMock(),
            'set_console_visibility': lambda flag: state.update(console=True),
            'handle_elevate_flag': lane,
            'handle_single_instance_guard': guard,
            'FST_Keyboard': lambda: state.update(keyboard=True) or kb,
            'sys': types.SimpleNamespace(
                argv=['free_snap_tap.py', '-nomenu'],
                exit=lambda code=0: (_ for _ in ()).throw(SystemExit(code))),
            'ConfigError': __import__('fst_data_types').ConfigError,
            'MainLogic': lambda k: MagicMock(),
            'sleep': lambda s: None,
            'Thread': FakeThread,
            'QApplication': lambda args: MagicMock(),
            'GUI_Manager': lambda k, app: MagicMock(),
            'ToastBridge': lambda: MagicMock(),
            'surface_startup_config_result': lambda k: None,
            'surface_startup_activation': lambda k: None,
# the startup freeze is a step of the entry block, so an exec harness of that block
        # must supply it (decision 10, 2026-11-17)
            'freeze_startup_heap': lambda: None,
        }
        with pytest.raises(SystemExit) as exc:
            exec(code, globs)
        return exc.value, state

    def test_guard_runs_after_lane_before_console_and_init(self):
        exc, state = self._run_block()
        assert exc.code == 0
        assert state['guard'] == 1
        assert state['lane_at_guard'] is True      # lane first (race-free)
        assert state['console_at_guard'] is False  # notice stays visible
        assert state['keyboard_at_guard'] is False # before any UI/hook init

    def test_elevation_relaunch_exits_before_guard(self):
        def relaunch(argv):
            raise SystemExit(0)  # the lane exits inside, args never return
        exc, state = self._run_block(lane_body=relaunch)
        assert exc.code == 0
        assert state['guard'] == 0  # launcher NEVER touches the mutex

    def test_guard_refusal_exits_1_before_any_init(self):
        def refuse():
            raise SystemExit(1)  # the real handler's refusal shape
        exc, state = self._run_block(guard_body=refuse)
        assert exc.code == 1
        assert state['console'] is False    # console never even hidden
        assert state['keyboard'] is False   # no UI/hook init happened
