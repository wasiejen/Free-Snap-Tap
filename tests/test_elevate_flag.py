"""--elevate startup lane (maintainer decision 2026-11-16 item 2; posture
approved item 3; research estate 2026-11-13_elevated-input.md section 5):
self-elevation relaunch pins.

Pinned lanes: parse lane (flag accepted at any position, exact-token match
only), strip-before-relaunch (original args kept, flag gone = loop guard),
already-elevated (ONE log line, no relaunch), not-elevated frozen exe
(relaunch once + SystemExit 0), dev mode (hint logged at WARNING = console
+ fst.log, no relaunch, no exit), wrapped admin check (win32 failure =
treated as not elevated), no-flag zero-behavior-change, and the __main__
wiring (lane runs before any UI/hook init and its filtered args feed
set_sys_start_arguments). The cross-product polish unit (2026-11-16) adds
the raw-seam pins (restype c_void_p set before the call, NULL -> 0) and the
SE_ERR_* label table. The pair-approved alias unit (2026-11-16) adds the
'-elevated' startup-alias pins (both spellings trigger the lane, the strip
strips whichever spelling the parent was given)."""
import ctypes
import logging
import os
import sys
from types import SimpleNamespace

import pytest

import fst_manager
from fst_manager import (ELEVATE_FLAG, ELEVATE_DEV_MESSAGE,
                         handle_elevate_flag)

ELEVATED_LINE = '[Elevation] running elevated'
# byte literal on purpose (reviewer P2 2026-11-16): the WIKI documents this
# exact hint; pinning the literal keeps code and docs byte-locked
DEV_HINT = ('[Elevation] dev mode - relaunch the exe manually or use '
            'scheduled task')
FAKE_EXE = 'C:/build/free_snap_tap_nuitka_.exe'
BS = chr(92)


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
            self.runas_result = 42  # any HINSTANCE > 32 = success

        def fake_admin(self):
            self.admin_calls += 1
            if self.admin_raises is not None:
                raise self.admin_raises
            return self.admin_result

        def fake_runas(self, exe_path, parameters, work_dir):
            self.runas_calls.append((exe_path, parameters, work_dir))
            return self.runas_result

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


class TestElevatedAlias:
    '''pair-approved 2026-11-16 (WTD cross-product vocabulary parity):
    '-elevated' is an accepted alias of the canonical '--elevate' in the
    STARTUP lane. Docs and messages keep the canonical spelling.'''

    @pytest.mark.parametrize('spelling', [ELEVATE_FLAG, '-elevated'])
    def test_both_spellings_trigger_the_lane(self, seams, spelling):
        '''either spelling runs the lane (mocked IsUserAnAdmin called
        once) and the flag comes back stripped'''
        seams.admin_result = True
        rest = handle_elevate_flag(['-nomenu', spelling, '-flow'])
        assert rest == ['-nomenu', '-flow']
        assert seams.admin_calls == 1
        assert seams.runas_calls == []

    @pytest.mark.parametrize('spelling', [ELEVATE_FLAG, '-elevated'])
    def test_relaunch_strips_whichever_spelling_was_used(self, seams,
                                                         spelling):
        '''loop guard per spelling: the relaunched child gets the other
        args, never the elevation flag the parent was given'''
        seams.admin_result = False
        with pytest.raises(SystemExit) as caught:
            handle_elevate_flag([spelling, '-file=my config.txt'])
        assert caught.value.code == 0
        assert seams.runas_calls == [
            (FAKE_EXE, '"-file=my config.txt"', os.getcwd())]

    def test_both_spellings_together_strip_both(self, seams):
        '''an argv carrying both spellings at once leaves the child with
        neither'''
        seams.admin_result = True
        assert handle_elevate_flag(
            [ELEVATE_FLAG, '-elevated', '-flow']) == ['-flow']

    def test_alias_is_exact_token_and_case_sensitive(self, seams):
        '''the alias matches exactly like the canonical flag: single-dash
        past tense only - '-elevate', '-ELEVATED', an attached value and
        an embedded occurrence stay on the untouched legacy path'''
        for other in ('-elevate', '-ELEVATED', '-elevated=1',
                      '-file=-elevated'):
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
            (FAKE_EXE, '-nomenu "-file=my config.txt"', os.getcwd())]

    def test_trailing_backslash_arg_quoting_is_crt_safe(self, seams):
        '''reviewer P1 (2026-11-16): a spaced dir value with a TRAILING
        BACKSLASH (-save_dir=/-backup_root_dir= users write this) must go
        through the MSVC quoting rules (list2cmdline) - hand-rolled
        space-quoting reaches the child corrupted; byte-exact pin of the
        lpParameters build'''
        seams.admin_result = False
        spaced_dir = '-backup_root_dir=C:' + BS + 'My Backups' + BS
        with pytest.raises(SystemExit) as caught:
            handle_elevate_flag([ELEVATE_FLAG, spaced_dir])
        assert caught.value.code == 0
        assert seams.runas_calls == [
            (FAKE_EXE,
             '"-backup_root_dir=C:' + BS + 'My Backups' + BS + BS + '"',
             os.getcwd())]

    def test_flag_only_argv_relaunches_with_empty_parameters(self, seams):
        seams.admin_result = False
        with pytest.raises(SystemExit) as caught:
            handle_elevate_flag([ELEVATE_FLAG])
        assert caught.value.code == 0
        assert seams.runas_calls == [(FAKE_EXE, '', os.getcwd())]

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

    def test_declined_uac_warns_but_still_exits_0(self, seams, caplog):
        '''reviewer P2 (2026-11-16): ShellExecuteW <= 32 (5 = the declined
        prompt) must log a named warning line - the exit code stays 0 per
        spec, but the log keeps the failure distinguishable. The polish unit
        adds the SE_ERR_* NAME so the log says which failure it was; the
        numeric phrase stays pinned as shipped'''
        seams.admin_result = False
        seams.runas_result = 5  # SE_ERR_ACCESSDENIED
        with caplog.at_level(logging.WARNING, logger='fst'):
            with pytest.raises(SystemExit) as caught:
                handle_elevate_flag([ELEVATE_FLAG])
        assert caught.value.code == 0
        assert 'runas relaunch returned 5' in caplog.text
        # failure-mapping pin: the readable diagnostic names the code
        assert '(SE_ERR_ACCESSDENIED)' in caplog.text


class TestDevMode:
    def test_dev_mode_logs_hint_at_warning_and_continues(self, seams, capsys,
                                                        caplog, monkeypatch):
        '''python.exe (sys.executable name) + not elevated: no ShellExecute
        attempt, no exit - the hint is logged and the run continues with the
        flag stripped. Polish unit P2 (2026-11-16): the hint routes through
        the 'fst' area logger (so it mirrors to fst.log and survives
        pythonw.exe) at WARNING - the level the product's console handler
        passes, which is what keeps the user-facing line console-visible'''
        seams.admin_result = False
        monkeypatch.setattr(sys, 'executable', 'C:/Python312/python.exe')
        with caplog.at_level(logging.WARNING, logger='fst'):
            rest = handle_elevate_flag([ELEVATE_FLAG, '-flow'])
        assert rest == ['-flow']
        assert seams.admin_calls == 1
        assert seams.runas_calls == []
        # byte literal pin (not the module constant) + identity lock
        assert ELEVATE_DEV_MESSAGE == DEV_HINT
        hints = [record for record in caplog.records
                 if record.getMessage() == DEV_HINT]
        assert len(hints) == 1
        # WARNING = the 'fst' console handler's floor (setup_fst_logging):
        # at this level the line reaches console AND fst.log, print reached
        # the console only
        assert hints[0].levelno == logging.WARNING
        assert hints[0].name == 'fst'
        assert capsys.readouterr().out == ''

    def test_dev_mode_already_elevated_wins_the_elevated_lane(
            self, seams, caplog, monkeypatch):
        '''elevated-state check runs BEFORE the dev-mode branch: an
        elevated python.exe logs the elevated line, logs no hint'''
        seams.admin_result = True
        monkeypatch.setattr(sys, 'executable', 'C:/Python313/python.EXE')
        with caplog.at_level(logging.INFO, logger='fst'):
            rest = handle_elevate_flag([ELEVATE_FLAG])
        assert rest == []
        assert seams.runas_calls == []
        assert ELEVATED_LINE in caplog.text
        assert ELEVATE_DEV_MESSAGE not in caplog.text


class TestShell32Seam:
    '''the raw ctypes seam (the lane pins patch it away, so these drive it
    directly against a fake windll: no real shell32 call happens and the
    F-B7 tripwire is never reached)'''

    def test_relaunch_seam_sets_void_pointer_restype_before_the_call(
            self, monkeypatch):
        '''polish P2 (2026-11-16): ShellExecuteW returns an HINSTANCE-cast
        INT_PTR, so ctypes' default c_int truncates the x64 high dword and a
        healthy relaunch could read <= 32 (a false 'no elevated instance
        started' warning after a good relaunch). The seam pins restype =
        c_void_p BEFORE the call and maps a NULL (None) return to 0 = the
        failure band.
        Discriminator: the shipped seam never touches restype, so the fake
        records 'ctypes-default' there = RED before the fix.'''
        recorded = {}

        class FakeShellExecute:
            restype = 'ctypes-default'

            def __call__(self, *args):
                recorded['restype_at_call'] = self.restype
                recorded['args'] = args
                return None  # NULL HINSTANCE -> the seam maps it to 0

        fake_shell32 = SimpleNamespace(ShellExecuteW=FakeShellExecute())
        monkeypatch.setattr(ctypes, 'windll',
                            SimpleNamespace(shell32=fake_shell32),
                            raising=False)

        assert fst_manager._shell32_runas_relaunch(
            FAKE_EXE, '-flow', 'C:/wd') == 0
        assert recorded['restype_at_call'] is ctypes.c_void_p
        assert recorded['args'] == (None, 'runas', FAKE_EXE, '-flow',
                                    'C:/wd', 1)

    def test_se_err_name_labels_the_sdk_table_and_falls_back_honestly(self):
        '''the failure diagnostic reads the SDK table (SE_ERR_* from
        shellapi.h, ERROR_BAD_FORMAT from winerror.h); a code outside it
        keeps its number instead of inventing a symbol'''
        assert fst_manager._se_err_name(5) == 'SE_ERR_ACCESSDENIED'
        assert fst_manager._se_err_name(2) == 'SE_ERR_FNF'
        assert fst_manager._se_err_name(11) == 'ERROR_BAD_FORMAT'
        assert fst_manager._se_err_name(32) == 'SE_ERR_DLLNOTFOUND'
        assert fst_manager._se_err_name(0) == 'code 0'
        assert fst_manager._se_err_name(17) == 'code 17'


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
        init_state = {'console': False, 'keyboard': False}

        def lane(argv):
            seen['lane_argv'] = list(argv)
            # ORDER pin (reviewer P2 2026-11-16): when the lane runs, the
            # console toggle and the keyboard/UI construction must not have
            # happened yet (the dev-mode hint would land in a hidden console)
            seen['console_at_lane'] = init_state['console']
            seen['keyboard_at_lane'] = init_state['keyboard']
            return [arg for arg in argv if arg != ELEVATE_FLAG]

        def console(flag):
            init_state['console'] = True

        def keyboard():
            init_state['keyboard'] = True
            return kb

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
            'set_console_visibility': console,
            'handle_elevate_flag': lane,
            'handle_single_instance_guard': lambda: None,
            'FST_Keyboard': keyboard,
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
# the startup freeze is a step of the entry block, so an exec harness of that block
        # must supply it (decision 10, 2026-11-17)
            'freeze_startup_heap': lambda: None,
        }
        with pytest.raises(SystemExit):
            exec(code, globs)
        assert seen['lane_argv'] == ['-nomenu', ELEVATE_FLAG, '-flow']
        assert seen['console_at_lane'] is False
        assert seen['keyboard_at_lane'] is False
        kb.set_sys_start_arguments.assert_called_once_with(
            ['-nomenu', '-flow'])
