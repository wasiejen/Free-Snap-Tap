"""FST-D pins: the two maintainer rulings of 2026-11-17.

Decision 10 (YES): the shipped app freezes its startup object heap once, after
runtime init and before any loop or pump thread starts, so the cyclic collector
never scans the startup graph again - the product-side mitigation of the
F-B8 / ABORT2 abort class (a GC sweep landing inside a Qt C++ frame). Freezing
is NOT disabling: normal GC keeps running, and objects created later (including
the interface's own) stay normally scannable.

Decision 11=a: a config ``<arg>`` line carrying an elevation spelling gets ONE
message - the validator's specific hint - and the runtime stays silent about it
instead of adding a generic 'unknown start argument' line. The same spelling on
the real command line still reports unknown, because no validator hint covered
it there.
"""
import gc
import logging
import types
from pathlib import Path
from types import SimpleNamespace

import pytest

import free_snap_tap
from fst_config_parser import is_elevation_config_arg
from fst_data_types import ConfigError
from fst_manager import Argument_Manager, Config_Manager, Config_Validator

REPO = Path(free_snap_tap.__file__).resolve().parent
ELEVATION_HINT = ('is a start argument for elevation - '
                  'place it on the command line, not in the config')


def warnings_of(content):
    """validator warnings of a config text, as the product sees them"""
    config_manager = Config_Manager()
    numbered = config_manager._combine_multilines_numbered(
        config_manager._clean_comments_numbered(content.splitlines(keepends=True)))
    return [found for found in Config_Validator().validate(numbered)
            if found.severity == Config_Validator.WARNING]


def _entry_block():
    """the __main__ startup block of free_snap_tap.py, as text"""
    source = (REPO / 'free_snap_tap.py').read_text(encoding='utf-8')
    return source[source.index('if __name__ == "__main__":'):]


@pytest.fixture
def arg_manager(fake_fst):
    """an Argument_Manager on the shared fake runtime, like the arg pins"""
    fake_fst.config_manager = SimpleNamespace(file_name='')
    return Argument_Manager(fake_fst)


class TestStartupHeapIsFrozenOnce:
    def test_startup_freezes_the_startup_heap_exactly_once(self, monkeypatch):
        # CONTRACT: one freeze call per process, at startup - not per config
        # reload and not per focus change (the permanent generation is a
        # one-time hand-off of the objects that already exist)
        calls = []
        monkeypatch.setattr(gc, 'freeze', lambda: calls.append(1) or 0)
        free_snap_tap.freeze_startup_heap()
        assert calls == [1]

    def test_freezing_never_touches_the_collector_switch(self, monkeypatch):
        # CONTRACT: freeze != disable - decision 10 approved the freeze only.
        # The suite runs with automatic GC off (the F-B8 guard), so this pin
        # compares the collector state AROUND the call instead of asserting it
        # is on, and it proves the helper flips no switch of its own.
        calls = []
        monkeypatch.setattr(gc, 'freeze', lambda: calls.append('freeze') or 0)
        monkeypatch.setattr(gc, 'disable', lambda: calls.append('disable'))
        monkeypatch.setattr(gc, 'enable', lambda: calls.append('enable'))
        was_enabled = gc.isenabled()
        free_snap_tap.freeze_startup_heap()
        assert calls == ['freeze']
        assert gc.isenabled() is was_enabled

    def test_the_freeze_is_after_init_and_before_any_loop_starts(self):
        # CONTRACT: the placement IS the ruling, and it is a WINDOW, not just
        # "early". The call must land after the runtime exists (keyboard, its
        # startup arg pass, the logic object, the settle sleep) - freezing
        # before that would leave the very graph decision 10 is about unfrozen -
        # and before any thread, asyncio loop or Qt wiring starts, because a
        # running thread allocates into the generation we are moving out of.
        entry = _entry_block()
        assert entry.count('freeze_startup_heap()') == 1
        site = entry.index('freeze_startup_heap()')
        for lands_after in ('FST_Keyboard()', 'update_args_and_groups(startup=True)',
                            'MainLogic(fst_keyboard)', 'sleep(0.5)'):
            assert entry.index(lands_after) < site, lands_after
        for lands_before in ('logic_thread.start()', 'QApplication([])',
                             'logic.run_headless()', 'gui_manager.start()'):
            assert site < entry.index(lands_before), lands_before

    def test_the_entry_path_reaches_the_freeze_in_that_order(self):
        # CONTRACT: a witness, not a text match - run the real entry block up to
        # and including the freeze call against stubs and record the order the
        # path actually takes. A call hidden inside a function that nothing
        # calls, or one moved before init, fails here.
        entry = _entry_block()
        marker = 'freeze_startup_heap()'
        code = entry[:entry.index(marker) + len(marker)]
        steps = []

        class Recorder:
            def __init__(self, name):
                self.name = name

            def __call__(self, *args, **kwargs):
                steps.append(self.name)
                return self

            def __getattr__(self, item):
                return Recorder(f'{self.name}.{item}')

        class StubKeyboard:
            def set_sys_start_arguments(self, args):
                steps.append('keyboard.sys_args')

            def update_args_and_groups(self, startup=False):
                steps.append('keyboard.startup_args')

        namespace = {
            '__name__': '__main__',
            'setup_fst_logging': Recorder('logging'),
            'logger': SimpleNamespace(info=lambda *args: None),
            'handle_elevate_flag': lambda argv: steps.append('elevate') or argv,
            'handle_single_instance_guard': Recorder('single_instance'),
            'set_console_visibility': Recorder('console'),
            'FST_Keyboard': lambda: steps.append('keyboard') or StubKeyboard(),
            'MainLogic': lambda keyboard: steps.append('logic') or object(),
            'sleep': lambda seconds: steps.append('settle'),
            'freeze_startup_heap': Recorder('freeze'),
            'sys': types.SimpleNamespace(argv=['free_snap_tap.py'],
                                         exit=lambda code=0: None),
            'ConfigError': ConfigError,
        }
        exec(compile(code, 'entry_prefix', 'exec'), namespace)
        assert steps == ['logging', 'elevate', 'single_instance', 'console',
                         'keyboard', 'keyboard.sys_args', 'keyboard.startup_args',
                         'logic', 'settle', 'freeze'], steps

    def test_the_product_never_disables_the_collector(self):
        # CONTRACT: gc.disable() was NOT approved. Only the freeze is product
        # behaviour - the suite's own GC guard lives in tests/conftest.py.
        # Every shipped root module is scanned (ABORT2 review taught: a
        # hand-picked module list silently stops covering the rest).
        scanned = sorted(path.name for path in REPO.glob('*.py'))
        assert 'free_snap_tap.py' in scanned and len(scanned) >= 8
        for path in REPO.glob('*.py'):
            text = path.read_text(encoding='utf-8')
            assert 'gc.disable' not in text, path.name


class TestElevationInConfigGetsOneMessage:
    @pytest.mark.parametrize('spelling', ['-elevate', '--elevate',
                                          '-elevated', '--elevated'])
    def test_config_elevation_line_reports_the_hint_and_no_generic(
            self, spelling, arg_manager, caplog):
        # CONTRACT (decision 11=a): the user gets ONE line for that config line
        # - the validator's specific hint - and the runtime adds nothing
        with caplog.at_level(logging.WARNING):
            found = warnings_of(f'<focus>App\n<arg>{spelling}\n')
            arg_manager.apply_start_arguments([spelling], from_config=True)
        hints = [item.message for item in found if ELEVATION_HINT in item.message]
        assert len(hints) == 1, found
        assert not [item.message for item in found
                    if 'unknown start argument' in item.message], found
        assert 'unknown start argument' not in caplog.text

    @pytest.mark.parametrize('spelling', ['-elevate', '--elevate',
                                          '-elevated', '--elevated'])
    def test_the_same_spelling_on_the_command_line_still_reports_unknown(
            self, spelling, arg_manager, caplog):
        # CONTRACT: the suppression is scoped to config-derived tokens, because
        # only there did a validator hint already answer the user. A bare
        # command-line typo stays a real unknown start argument.
        with caplog.at_level(logging.WARNING):
            arg_manager.apply_start_arguments([spelling])
        assert f'unknown start argument: {spelling}' in caplog.text

    def test_an_unrelated_unknown_config_argument_still_reports_unknown(
            self, arg_manager, caplog):
        # CONTRACT: only the elevation spellings are suppressed - the generic
        # unknown-argument line keeps working for every other config token
        with caplog.at_level(logging.WARNING):
            arg_manager.apply_start_arguments(['-zzz'], from_config=True)
        assert 'unknown start argument: -zzz' in caplog.text

    def test_the_default_on_retirement_message_stays_its_own_line(
            self, arg_manager, caplog, capsys):
        # CONTRACT: the -default_on precedent is untouched by decision 11=a - it
        # keeps its own retirement line and never becomes a generic unknown
        with caplog.at_level(logging.WARNING):
            arg_manager.apply_start_arguments(['-default_on'], from_config=True)
        assert 'unknown start argument' not in caplog.text
        assert '-default_on is retired' in capsys.readouterr().out

    def test_a_section_that_suppresses_warnings_keeps_its_silence(
            self, arg_manager, caplog):
        # CONTRACT (disclosed consequence of 11=a): '<arg>-no_warnings' in the
        # same section opts that section out of warning output, and the hint is
        # a warning - so the elevation line there yields no validator message,
        # and the runtime stays silent as well. Before 11=a the user got the
        # generic line as the only survivor of a section they had asked to be
        # quiet about; the suppression opt-out is now respected end to end.
        found = warnings_of('<focus>App\n<arg>-no_warnings\n<arg>-elevated\n')
        assert found == []
        with caplog.at_level(logging.WARNING):
            arg_manager.apply_start_arguments(['-elevated'], from_config=True)
        assert 'unknown start argument' not in caplog.text

    def test_the_elevation_spelling_rule_has_one_owner(self):
        # CONTRACT: one grammar for the four dash-count/tense spellings - the
        # validator hint and the runtime suppression ask the same question
        for spelling in ('-elevate', '--elevate', '-elevated', '--elevated',
                         '-ELEVATED', '-elevated=1', '-elevated '):
            assert is_elevation_config_arg(spelling), spelling
        # '-elevated = x' is NOT an elevation spelling in either lane: the
        # validator splits the name at '=' after stripping the whole token, so
        # the name keeps its inner space and falls through to the generic
        # unknown-argument branch - this predicate matches it exactly
        for other in ('-elevates', '-zzz', '-', '', '--', 'elevate_me',
                      '-file=-elevated', '-elevater', '-elevated = x'):
            assert not is_elevation_config_arg(other), other
