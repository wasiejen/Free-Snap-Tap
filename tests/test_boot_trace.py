"""#460 - the startup decision trace: one INFO line + one console echo.

Maintainer confusion class (live report 2026-11-23, RESOLVED diagnosis): the
console was hidden on every launch although the config `<arg>-hide_cmd_window`
line was commented out - his LAUNCHER BAT passes `-hide_cmd_window` as a
command-line argument, and argv args are consumed directly. The flag can
arrive from BOTH channels (command line AND config <arg> lines); the decision
line below is what makes that self-reading from now on: at startup the entry
block logs ONE INFO line into fst.log - echoed to the console BEFORE any
hide - naming the resolved config path (abs), whether the config was present
when the loader opened it, and the FINAL cmd_window decision taken from
arg_manager.CMD_WINDOW_HIDDEN after the whole start-arg pipeline (both
channels already merged there).

The pins run the real entry block (exec harness, the shape of
tests/test_hide_cmd_window.py) against stubs, truncated right before the
GUI/headless mode branch, with the REAL startup_decision_trace behind the
stub name so the traced line text is the product's.
"""
import importlib.util
import os
import textwrap
import types

from fst_data_types import ConfigError
from fst_manager import startup_decision_trace

# the mode branch - everything up to it is the startup + visibility decision
MODE_BRANCH = 'if fst_keyboard.arg_manager.TRAY_ICON'


def _entry_block_through_visibility():
    """The __main__ block from its first line up to (not including) the
    GUI/headless mode branch."""
    spec = importlib.util.find_spec('free_snap_tap')
    with open(spec.origin, encoding='utf-8') as handle:
        lines = handle.read().splitlines()
    start = lines.index('if __name__ == "__main__":') + 1
    body = lines[start:]
    cut = next(n for n, line in enumerate(body) if MODE_BRANCH in line)
    return textwrap.dedent('\n'.join(body[:cut]))


def _without_comments(source):
    """`source` with comment TEXT removed (tokenize: a '#' inside a string
    literal stays put, a trailing comment really goes away, line structure
    is preserved) - shared shape with tests/test_hide_cmd_window.py."""
    import io
    import tokenize
    lines = io.StringIO(source).readlines()
    cuts = {}
    for token in tokenize.generate_tokens(iter(lines).__next__):
        if token.type == tokenize.COMMENT:
            cuts[token.start[0]] = token.start[1]
    kept = []
    for number, line in enumerate(lines, start=1):
        cut = cuts.get(number)
        kept.append(line[:cut] if cut is not None else line)
    return ''.join(kept)


class StubKeyboard:
    """Stand-in for FST_Keyboard: the two attributes the trace reads
    (config_manager.file_name / .config_file_found, arg_manager.CMD_WINDOW_HIDDEN)
    plus the startup call recorder."""

    def __init__(self, steps, cmd_window_hidden, file_name, file_found):
        self._steps = steps
        self.arg_manager = types.SimpleNamespace(
            CMD_WINDOW_HIDDEN=cmd_window_hidden)
        self.config_manager = types.SimpleNamespace(
            file_name=file_name, config_file_found=file_found)

    def set_sys_start_arguments(self, args):
        self._steps.append('keyboard.sys_args')

    def update_args_and_groups(self, startup=False):
        self._steps.append('keyboard.startup_args')


def run_startup_block(steps, visibility_calls, cmd_window_hidden,
                      file_name, file_found):
    """Exec the startup block over stubs. `steps` records the ordered events
    ('trace' = the logger.info of the decision line, 'console' = a
    set_console_visibility call); every traced INFO message lands in
    `steps`' companion - see the returned infos."""
    infos = []

    def keyboard():
        steps.append('keyboard')
        return StubKeyboard(steps, cmd_window_hidden, file_name, file_found)

    def console(flag):
        visibility_calls.append(flag)
        steps.append('console')

    def info(message):
        infos.append(message)
        steps.append('trace')

    namespace = {
        '__name__': '__main__',
        'setup_fst_logging': lambda: steps.append('logging'),
        'logger': types.SimpleNamespace(info=info),
        'handle_elevate_flag': lambda argv: steps.append('elevate') or argv,
        'handle_single_instance_guard': lambda: steps.append(
            'single_instance'),
        'set_console_visibility': console,
        'FST_Keyboard': keyboard,
        'MainLogic': lambda keyboard: steps.append('logic') or object(),
        'sleep': lambda seconds: steps.append('settle'),
        'freeze_startup_heap': lambda: steps.append('freeze'),
        'startup_decision_trace': startup_decision_trace,
        'sys': types.SimpleNamespace(argv=['free_snap_tap.py'],
                                     exit=lambda code=0: None),
        'ConfigError': ConfigError,
    }
    code = _entry_block_through_visibility()
    exec(compile(code, 'entry_through_visibility', 'exec'), namespace)
    return infos


def _traced_line(infos):
    """The single startup decision line out of the recorded INFO messages."""
    lines = [line for line in infos if 'cmd_window=' in line]
    assert len(lines) == 1, infos
    return lines[0]


class TestStartupDecisionTrace:
    def test_flag_off_traces_path_exists_and_visible(self, tmp_path, capsys):
        config = tmp_path / 'FSTconfig.txt'
        config.write_text("# Tap Groups\n", encoding='utf-8')
        steps, calls = [], []
        infos = run_startup_block(steps, calls, False, str(config), True)
        line = _traced_line(infos)
        assert f'config_file={os.path.abspath(str(config))}' in line
        assert 'exists=True' in line
        assert 'cmd_window=visible' in line
        # console echo (the maintainer reads the cmd window): same fields
        console_out = capsys.readouterr().out
        assert 'config_file=' in console_out
        assert 'cmd_window=visible' in console_out
        # the CMDHIDE contract stays: flag OFF never touches the window
        assert calls == []

    def test_flag_on_traces_hidden_and_traces_before_the_hide(self, tmp_path,
                                                              capsys):
        config = tmp_path / 'FSTconfig.txt'
        config.write_text("# Tap Groups\n", encoding='utf-8')
        steps, calls = [], []
        infos = run_startup_block(steps, calls, True, str(config), True)
        assert 'cmd_window=hidden' in _traced_line(infos)
        # the echo must be readable: it lands BEFORE the window is hidden
        assert 'cmd_window=hidden' in capsys.readouterr().out
        assert calls == [False]
        assert steps.index('trace') < steps.index('console')

    def test_exists_reports_the_load_decision_not_the_trace_moment(
            self, tmp_path, capsys):
        # the honest #461 partner signal: when the loader found NO config it
        # auto-created one - at trace time the file IS on disk, yet the line
        # must still say exists=False ("your config was not found")
        config = tmp_path / 'FSTconfig.txt'
        config.write_text("# Tap Groups\n", encoding='utf-8')
        steps, calls = [], []
        infos = run_startup_block(steps, calls, False, str(config), False)
        assert 'exists=False' in _traced_line(infos)

    def test_relative_config_name_is_traced_absolute(self, tmp_path,
                                                     monkeypatch):
        # the trace ALWAYS names an abs path, whatever the config manager
        # holds (a relative -file override included)
        monkeypatch.chdir(tmp_path)
        (tmp_path / 'FSTconfig.txt').write_text("# Tap Groups\n",
                                                encoding='utf-8')
        steps, calls = [], []
        infos = run_startup_block(steps, calls, False, 'FSTconfig.txt', True)
        assert f'config_file={os.path.abspath("FSTconfig.txt")}' in _traced_line(infos)

    def test_exactly_one_decision_trace_call_site_in_the_block(self):
        # CONTRACT (structural): ONE startup_decision_trace call site in the
        # startup block - the ruling is ONE line at startup, not one per
        # component
        code = _without_comments(_entry_block_through_visibility())
        assert code.count('startup_decision_trace(') == 1, code
