"""--elevate startup lane (maintainer decision 2026-11-16 item 2; posture
approved item 3; research estate 2026-11-13_elevated-input.md section 5):
self-elevation relaunch pins.

Pinned lanes: parse lane (flag accepted at any position, exact-token match
only), strip-before-relaunch (original args kept, flag gone = loop guard),
already-elevated (ONE log line, no relaunch), not-elevated frozen exe
(relaunch once + SystemExit 0), dev mode (hint printed, no relaunch, no
exit), wrapped admin check (win32 failure = treated as not elevated),
no-flag zero-behavior-change, and the __main__ wiring (lane runs before
any UI/hook init and its filtered args feed set_sys_start_arguments)."""
import logging
import sys

import pytest

import fst_manager
from fst_manager import (ELEVATE_FLAG, ELEVATE_DEV_MESSAGE,
                         handle_elevate_flag)

ELEVATED_LINE = '[Elevation] running elevated'
FAKE_EXE = 'C:/build/free_snap_tap_nuitka_.exe'


@pytest.fixture()
def seams(monkeypatch):
    '''patch the two ctypes seams and sys.executable (default: frozen exe);
    return the call recorder'''
    class Seams:
        def __init__(self):
            self.admin_calls = 0
            self.admin_result = True
            self.admin_raises = None
            self.runas_calls = []

        def fake_admin(self):
            self.admin_calls += 1
            if self.admin_raises is not None:
                raise self.admin_raises
            return self.admin_result

        def fake_runas(self, exe_path, parameters):
            self.runas_calls.append((exe_path, parameters))
            return 42  # any HINSTANCE - the return is unused

    seams = Seams()
    monkeypatch.setattr(fst_manager, '_shell32_is_user_an_admin',
                        seams.fake_admin)
    monkeypatch.setattr(fst_manager, '_shell32_runas_relaunch',
                        seams.fake_runas)
    monkeypatch.setattr(sys, 'executable', FAKE_EXE)
    return seams


class TestParseLane:
    def test_no_flag_zero_behavior_change(self, seams):
        '''no flag in argv: the lane touches nothing and returns argv'''
        argv = ['-nomenu', '-flow']
        assert handle_elevate_flag(argv) == argv
        assert handle_elevate_flag([]) == []
        assert seams.admin_calls == 0
        assert seams.runas_calls == []

    def test_flag_accepted_at_any_position(self, seams):
        '''the flag is a whole-arg token - first, middle and last all work;
        the returned args keep the original order of everything else'''
        assert handle_elevate_flag([ELEVATE_FLAG, '-nomenu']) == ['-nomenu']
        assert handle_elevate_flag(
            ['-nomenu', ELEVATE_FLAG, '-flow']) == ['-nomenu', '-flow']
        assert handle_elevate_flag(['-nomenu', ELEVATE_FLAG]) == ['-nomenu']
        assert handle_elevate_flag([ELEVATE_FLAG]) == []

    def test_exact_token_only(self, seams):
        '''single-dash, case-shifted, attached-value and embedded spellings
        are NOT the flag - they stay on the untouched legacy path (the
        start-arg parser still warns about truly-unknown args itself)'''
        for other in ('-elevate', '--ELEVATE', '--elevate=1',
                      '-file=--elevate'):
            assert handle_elevate_flag([other]) == [other]
        assert seams.admin_calls == 0
        assert seams.runas_calls == []


class TestAlreadyElevated:
    def test_one_log_line_no_relaunch(self, seams, caplog):
        '''IsUserAnAdmin True: ONE [Elevation] running elevated line, no
        ShellExecute attempt, execution continues with the flag stripped'''
        seams.admin_result = True
        with caplog.at_level(logging.INFO, logger='fst'):
            rest = handle_elevate_flag(
                ['-nomenu', ELEVATE_FLAG, '-flow'])
        assert rest == ['-nomenu', '-flow']
        assert seams.admin_calls == 1
        assert seams.runas_calls == []
        assert sum(1 for record in caplog.records
                   if record.getMessage() == ELEVATED_LINE) == 1


class TestRelaunch:
    def test_not_elevated_frozen_relaunches_once_and_exits_0(self, seams):
        '''not elevated + frozen exe: ONE runas relaunch of the SAME exe
        with the original args minus the flag (loop guard) + SystemExit 0.
        The quoted arg pins lpParameters quoting for spaced args'''
        seams.admin_result = False
        with pytest.raises(SystemExit) as caught:
            handle_elevate_flag(
                ['-nomenu', ELEVATE_FLAG, '-file=my config.txt'])
        assert caught.value.code == 0
        assert seams.runas_calls == [
            (FAKE_EXE, '-nomenu "-file=my config.txt"')]

    def test_flag_only_argv_relaunches_with_empty_parameters(self, seams):
        seams.admin_result = False
        with pytest.raises(SystemExit) as caught:
            handle_elevate_flag([ELEVATE_FLAG])
        assert caught.value.code == 0
        assert seams.runas_calls == [(FAKE_EXE, '')]

    def test_admin_check_failure_treated_as_not_elevated(self, seams,
                                                         caplog):
        '''wrapped IsUserAnAdmin: a win32 failure logs a warning and the
        lane proceeds as NOT elevated (honest runas prompt over a false
        elevated claim)'''
        seams.admin_result = False
        seams.admin_raises = OSError('win32 unavailable')
        with caplog.at_level(logging.WARNING, logger='fst'):
            with pytest.raises(SystemExit) as caught:
                handle_elevate_flag(['-nomenu', ELEVATE_FLAG])
        assert caught.value.code == 0
        assert seams.admin_calls == 1
        assert 'IsUserAnAdmin failed' in caplog.text
        assert len(seams.runas_calls) == 1


class TestDevMode:
    def test_dev_mode_prints_hint_and_continues(self, seams, capsys,
                                                monkeypatch):
        '''python.exe (sys.executable name) + not elevated: no ShellExecute
        attempt, no exit - the hint prints and the run continues with the
        flag stripped'''
        seams.admin_result = False
        monkeypatch.setattr(sys, 'executable', 'C:/Python312/python.exe')
        rest = handle_elevate_flag([ELEVATE_FLAG, '-flow'])
        assert rest == ['-flow']
        assert seams.admin_calls == 1
        assert seams.runas_calls == []
        assert ELEVATE_DEV_MESSAGE in capsys.readouterr().out

    def test_dev_mode_already_elevated_wins_the_elevated_lane(
            self, seams, caplog, monkeypatch, capsys):
        '''elevated-state check runs BEFORE the dev-mode branch: an
        elevated python.exe logs the elevated line, prints no hint'''
        seams.admin_result = True
        monkeypatch.setattr(sys, 'executable', 'C:/Python313/python.EXE')
        with caplog.at_level(logging.INFO, logger='fst'):
            rest = handle_elevate_flag([ELEVATE_FLAG])
        assert rest == []
        assert seams.runas_calls == []
        assert ELEVATED_LINE in caplog.text
        assert ELEVATE_DEV_MESSAGE not in capsys.readouterr().out


class TestMainBlockWiring:
    def test_main_block_runs_the_lane_before_init_and_feeds_filtered_args(
            self):
        '''__main__ wiring pin (exec harness, shape of
        tests/test_headless_loop_wiring.py::_exec_main_block): the lane
        sees the raw argv[1:] and set_sys_start_arguments receives the
        lane's filtered args'''
        import importlib.util
        import textwrap
        import types
        from unittest.mock import MagicMock

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
        seen = {}

        def lane(argv):
            seen['lane_argv'] = list(argv)
            return [arg for arg in argv if arg != ELEVATE_FLAG]

        class FakeThread:
            def __init__(self, target=None, daemon=None):
                self.target = target

            def start(self):
                pass

        logic_mock = MagicMock()
        globs = {
            '__name__': '__main__',
            'setup_fst_logging': lambda: None,
            'logger': MagicMock(),
            'set_console_visibility': lambda flag: None,
            'handle_elevate_flag': lane,
            'FST_Keyboard': lambda: kb,
            'sys': types.SimpleNamespace(
                argv=['free_snap_tap.py', '-nomenu', ELEVATE_FLAG, '-flow'],
                exit=lambda code=0: (_ for _ in ()).throw(SystemExit(code))),
            'ConfigError': __import__('fst_data_types').ConfigError,
            'MainLogic': lambda k: logic_mock,
            'sleep': lambda s: None,
            'Thread': FakeThread,
            'QApplication': lambda args: MagicMock(),
            'GUI_Manager': lambda k, app: MagicMock(),
            'ToastBridge': lambda: MagicMock(),
            'surface_startup_config_result': lambda k: None,
            'surface_startup_activation': lambda k: None,
        }
        with pytest.raises(SystemExit):
            exec(code, globs)
        assert seen['lane_argv'] == ['-nomenu', ELEVATE_FLAG, '-flow']
        kb.set_sys_start_arguments.assert_called_once_with(
            ['-nomenu', '-flow'])
