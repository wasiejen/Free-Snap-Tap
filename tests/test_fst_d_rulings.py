"""FST-D pins: the two maintainer rulings of 2026-11-17.

Decision 10 (YES): the shipped app freezes its startup object heap once, after
runtime init and before any loop or pump thread starts, so the cyclic collector
never scans the startup graph again - the product-side mitigation of the
F-B8 / ABORT2 abort class (a GC sweep landing inside a Qt C++ frame). Freezing
is NOT disabling: normal GC keeps running.

Decision 11=a: a config ``<arg>`` line carrying an elevation spelling gets ONE
message - the validator's specific hint - and the runtime stays silent about it
instead of adding a generic 'unknown start argument' line. The same spelling on
the real command line still reports unknown, because no validator hint covered
it there.
"""
import gc
import logging
from pathlib import Path
from types import SimpleNamespace

import pytest

import free_snap_tap
from fst_config_parser import is_elevation_config_arg
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

    def test_the_freeze_runs_after_init_and_before_any_loop_starts(self):
        # CONTRACT: the placement IS the ruling. The startup heap (keyboard
        # runtime, config containers, logic object) is complete, and no pump
        # thread, asyncio loop or Qt event loop has started yet - freezing while
        # a second thread is allocating would move objects it is using
        entry = _entry_block()
        assert entry.count('freeze_startup_heap()') == 1
        site = entry.index('freeze_startup_heap()')
        for starts_later in ('logic_thread.start()', 'QApplication([])',
                             'logic.run_headless()', 'gui_manager.start()'):
            assert site < entry.index(starts_later), starts_later

    def test_the_product_never_disables_the_collector(self):
        # CONTRACT: gc.disable() was NOT approved. Only the freeze is product
        # behaviour - the suite's own GC guard lives in tests/conftest.py
        for name in ('free_snap_tap.py', 'fst_keyboard.py', 'fst_manager.py',
                     'fst_overlay.py', 'fst_tasks.py', 'fst_config_parser.py'):
            text = (REPO / name).read_text(encoding='utf-8')
            assert 'gc.disable' not in text, name


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

    def test_the_elevation_spelling_rule_has_one_owner(self):
        # CONTRACT: one grammar for the four dash-count/tense spellings - the
        # validator hint and the runtime suppression ask the same question
        for spelling in ('-elevate', '--elevate', '-elevated', '--elevated',
                         '-ELEVATED', '-elevated=1'):
            assert is_elevation_config_arg(spelling), spelling
        for other in ('-elevates', '-zzz', '-', '', '--', 'elevate_me',
                      '-file=-elevated'):
            assert not is_elevation_config_arg(other), other


def _entry_block():
    """the __main__ startup block of free_snap_tap.py, as text"""
    source = (REPO / 'free_snap_tap.py').read_text(encoding='utf-8')
    return source[source.index('if __name__ == "__main__":'):]
