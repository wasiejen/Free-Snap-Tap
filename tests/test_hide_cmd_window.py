"""CMDHIDE - the startup console-visibility ruling, pinned at the entry block.

Live bug (maintainer report, root-caused 2026-11-21): the entry block called
`set_console_visibility(False)` UNCONDITIONALLY between the single-instance
guard and the config parse, and the post-parse block only RE-SHOWED the
console (`if CMD_WINDOW_HIDDEN: pass / else: set_console_visibility(True)`) -
on a console host that does not reliably bring a hidden window back, a
`-hide_cmd_window`-less user was left with a hidden console and no way back.
Ruling: the flag decides ONCE, after the parse - ON hides exactly once, OFF
makes ZERO visibility calls (the window is never touched), and the runtime
switch stays the tray menu's 'Toggle Console' (pinned in
tests/test_gui_manager.py::test_toggle_console_on_left_click_hides_console).

The pins run the real entry block (exec harness, the shape of
tests/test_fst_d_rulings.py::TestStartupHeapIsFrozenOnce and
tests/test_elevate_flag.py::TestMainBlockWiring) against stubs, truncated
right before the GUI/headless mode branch, and record the calls.
"""
import importlib.util
import textwrap
import types

from fst_data_types import ConfigError

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


def _entry_block_full():
    """The WHOLE __main__ block (the mode branch, the Qt/headless wiring and
    the shutdown tail included) - what the structural pin below scans."""
    spec = importlib.util.find_spec('free_snap_tap')
    with open(spec.origin, encoding='utf-8') as handle:
        lines = handle.read().splitlines()
    start = lines.index('if __name__ == "__main__":') + 1
    return textwrap.dedent('\n'.join(lines[start:]))


def _without_comments(source):
    """`source` with comment TEXT removed (tokenize: a '#' inside a string
    literal stays put, a trailing comment really goes away, line structure
    is preserved)."""
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
    """Stand-in for FST_Keyboard that records the startup call order."""

    def __init__(self, steps, cmd_window_hidden):
        self._steps = steps
        self.arg_manager = types.SimpleNamespace(
            CMD_WINDOW_HIDDEN=cmd_window_hidden)
        # the #460 boot trace reads these (the block now calls
        # startup_decision_trace through the namespace stub)
        self.config_manager = types.SimpleNamespace(
            file_name='FSTconfig.txt', config_file_found=True)

    def set_sys_start_arguments(self, args):
        self._steps.append('keyboard.sys_args')

    def update_args_and_groups(self, startup=False):
        self._steps.append('keyboard.startup_args')


def run_entry_block(cmd_window_hidden, steps, visibility_calls):
    """Exec the startup block over stubs. `steps` records the path order,
    `visibility_calls` every set_console_visibility argument."""

    def keyboard():
        steps.append('keyboard')
        return StubKeyboard(steps, cmd_window_hidden)

    def console(flag):
        visibility_calls.append(flag)
        steps.append('console')

    namespace = {
        '__name__': '__main__',
        'setup_fst_logging': lambda: steps.append('logging'),
        'logger': types.SimpleNamespace(info=lambda *args: None),
        'handle_elevate_flag': lambda argv: steps.append('elevate') or argv,
        'handle_single_instance_guard': lambda: steps.append(
            'single_instance'),
        'set_console_visibility': console,
        'FST_Keyboard': keyboard,
        'MainLogic': lambda keyboard: steps.append('logic') or object(),
        'sleep': lambda seconds: steps.append('settle'),
        'freeze_startup_heap': lambda: steps.append('freeze'),
        # #460: the startup decision line now precedes the visibility call -
        # stub it so this harness stays about the visibility contract only
        'startup_decision_trace': lambda cm, hidden: 'startup trace stub',
        'sys': types.SimpleNamespace(argv=['free_snap_tap.py'],
                                     exit=lambda code=0: None),
        'ConfigError': ConfigError,
    }
    code = _entry_block_through_visibility()
    exec(compile(code, 'entry_through_visibility', 'exec'), namespace)


class TestStartupVisibilityRuling:
    def test_flag_off_makes_zero_visibility_calls(self):
        # CONTRACT: without -hide_cmd_window the startup path NEVER touches
        # the console window - no hide, no re-show, nothing to bring back.
        steps, calls = [], []
        run_entry_block(False, steps, calls)
        assert calls == []
        assert 'console' not in steps, steps

    def test_flag_on_hides_exactly_once_and_never_shows(self):
        # CONTRACT: with -hide_cmd_window the console is hidden EXACTLY ONCE
        # (one call, argument False = hide) and never re-shown at startup.
        # The post-parse placement assert is what makes this pin discriminate
        # too (the pre-fix path hid before the parse, so the count alone
        # passed on the old code - reviewer P2-6 / my own disclosure).
        steps, calls = [], []
        run_entry_block(True, steps, calls)
        assert calls == [False], calls
        assert steps.index('console') > steps.index('keyboard.startup_args')

    def test_no_visibility_call_before_the_config_parse_completes(self):
        # CONTRACT (ordering, the core of the ruling): the visibility call
        # comes AFTER the config parse (update_args_and_groups) - never
        # before it, so a rejected config still prints to a live console and
        # a flag-OFF run never hides anything on the way.
        steps, calls = [], []
        run_entry_block(True, steps, calls)
        assert steps.index('console') > steps.index(
            'keyboard.startup_args'), steps
        steps_off, calls_off = [], []
        run_entry_block(False, steps_off, calls_off)
        assert calls_off == []
        assert 'console' not in steps_off, steps_off

    def test_the_entry_block_has_no_re_show_call_at_all(self):
        # CONTRACT (structural): the WHOLE entry block - the startup prefix,
        # the GUI/headless wiring and the shutdown tail - keeps exactly ONE
        # visibility call site (the flag-ON hide) and no re-show call, so the
        # dead else-branch cannot come back unnoticed anywhere in the block.
        code = _without_comments(_entry_block_full())
        assert code.count('set_console_visibility(') == 1, code
        assert 'set_console_visibility(True)' not in code
