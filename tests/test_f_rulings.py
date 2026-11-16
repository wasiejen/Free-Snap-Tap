"""F-C4 behavior pins for the three maintainer rulings of 2026-11-16.

Decision 9 in maintainer/inbox_maintainer/2026-11-16_decisions.md:
  9a=a  one delay bound (0..1000) for the validator AND the runtime, and a
        delay of 0 means a delay of 0 ms (no hidden floor anywhere),
  9b    one visible numbering: the violation report, the containers, the menu
        and the status dump show the same number, and a report line names the
        line number plus the declared name when the config gave one,
  hole  a name/prefix cut that leaves an EMPTY component (the ['a', '', 'd']
        class F-C3 measured) is rejected at validation; the runtime keeps a belt.

Every expected value below was measured against the implementation (scratch
driver), not guessed: an earlier draft of this file guessed six of them and the
suite said so.

These are contract pins: they state what the user sees, not how the code is
arranged. The lane (tests/contract_lane.py) drives the real pipeline - config
text in, injected stream out, no OS input.
"""
import logging
import re

import pytest

from contract_lane import tap
from fst_config_parser import (LineNamer, clean_comment_lines, classify_groups,
                               KIND_TAP)
from fst_data_types import ConfigError
from fst_manager import Config_Manager, Config_Validator, Output_Manager

# the maintainer's own repro for 9b: a named tap group above a short line.
# The second line only warns (one valid key), so the load succeeds and the
# containers exist to compare the report against.
NUMBERING_CONFIG = '(*x*) a, d\nb\n'


def cleaned_lines(config_text):
    '''the numbered lines the pipeline hands the validator (its own cleaning)'''
    cm = Config_Manager()
    return cm._combine_multilines_numbered(
        cm._clean_comments_numbered(config_text.splitlines(keepends=True)))


def report_of(config_text):
    return Config_Validator.format_report(
        Config_Validator().validate(cleaned_lines(config_text)))


def container_keys(config_text):
    '''the live container keys of a config that passes validation'''
    cm = Config_Manager()
    cm._file_name = ''
    _, _, lines = cm._parse_lines_for_focus_manager(
        config_text.splitlines(keepends=True))
    cm.presort_lines(lines)
    return ([item[0] for item in cm._tap_groups_hr]
            + [item[0] for item in cm._rebinds_hr]
            + [item[0] for item in cm._macros_hr])


class TestZeroDelayIsTrueZero:
    '''decision 9a=a: delay 0 reaches the wire as 0 ms'''

    def test_the_draw_of_zero_bounds_is_zero(self):
        # CONTRACT: get_random_delay(0, 0) is 0 - no floor, no bump to 1
        draw = Output_Manager.get_random_delay
        assert draw(object(), 0, 0) == 0
        # and a 0 bound stays reachable in a range, not silently raised
        assert min(draw(object(), 0, 10) for _ in range(400)) == 0

    def test_the_event_leg_draws_zero_from_zero_bounds(self, contract, monkeypatch):
        # CONTRACT (the key_event delay leg the ruling is about): with the
        # default per-event range (0, 0) the product's own delay draw really
        # runs on (0, 0) and returns 0 - the call site hands that value to
        # asyncio.sleep(value / 1000), so a delay 0 waits 0 ms. The seam the
        # lane normally collapses is opened here, so the pin proves the ruling
        # and not the harness.
        real_draw = Output_Manager.get_random_delay
        draws = self._instrument(monkeypatch, real_draw)
        self._set_bounds(contract, 0, 0)
        sent = self._play_one_key_event(contract)
        assert sent, 'the key event must still be sent'
        assert draws, 'the delay draw never ran - this pin would be vacuous'
        assert all(entry == (0, 0, 0) for entry in draws), draws

    def test_nodelay_still_means_no_delay_at_all(self, fake_fst):
        # CONTRACT: '-nodelay' keeps its meaning - it switches the delay leg
        # off and leaves the configured range alone (9a=a changed the bound,
        # not that switch). Pinned at the argument level, which is the
        # documented meaning of the flag.
        from fst_manager import Argument_Manager
        fake_fst.config_manager = type('NS', (), {'file_name': ''})()
        manager = Argument_Manager(fake_fst)
        manager.apply_start_arguments(['-macrodelay=50,60', '-nodelay'])
        assert manager.ACT_DELAY is False
        assert (manager.MACRO_MIN_DELAY_IN_MS,
                manager.MACRO_MAX_DELAY_IN_MS) == (50, 60)

    @staticmethod
    def _set_bounds(contract, minimum, maximum, act_delay=True):
        '''the runtime state after '<arg>-macrodelay=MIN,MAX' (and -nodelay),
        written directly so the pin tests the delay leg, not the parser'''
        am = contract.kb.arg_manager
        am.MACRO_MIN_DELAY_IN_MS = minimum
        am.MACRO_MAX_DELAY_IN_MS = maximum
        am.ACT_DELAY = act_delay

    @staticmethod
    def _play_one_key_event(contract):
        '''one real Key_Event through the product's own delay leg'''
        from fst_data_types import Key_Event
        output_manager = contract.kb.output_manager
        key_events = []
        monkey = getattr(output_manager, 'send_key_event', None)
        output_manager.send_key_event = lambda key_event: key_events.append(key_event)
        try:
            contract._loop.run_until_complete(
                output_manager.execute_key_event(Key_Event(0x41)))
        finally:
            output_manager.send_key_event = monkey
        return key_events

    @staticmethod
    def _instrument(monkeypatch, real_draw):
        '''undo the lane's collapsed delay seam for this test and record what
        the product's own draw is asked for and what it returns:
        (min, max, value) per call. The drawn value is exactly what the call
        site hands to asyncio.sleep(value / 1000), so recording it is the
        deterministic way to pin a pause - no wall-clock timing involved'''
        import fst_manager

        draws = []

        def recording_draw(self, max, min=0):
            value = real_draw(self, max, min)
            draws.append((min, max, value))
            return value

        monkeypatch.setattr(fst_manager.Output_Manager, 'get_random_delay',
                            recording_draw)
        return draws


class TestOneVisibleNumbering:
    '''decision 9b: one number per line, everywhere, plus the declared name'''

    def test_the_report_names_the_number_the_containers_use(self):
        # CONTRACT (the maintainer's repro): the report no longer says (TAP_2)
        # while the menu knows the same group as (TAP_1)
        assert ('line 2 (TAP_2) [arity] warning: tap group needs 2 or more keys'
                in report_of(NUMBERING_CONFIG))
        assert container_keys(NUMBERING_CONFIG) == ['(*x*)', '(TAP_2)']

    def test_a_declared_name_is_shown_next_to_the_number(self):
        # CONTRACT: '(TAP_n, "declared")' - the number places the line in the
        # sequence, the quoted text is what the user typed and can find again
        assert ('line 1 (TAP_1, "*keep*") [arity] warning'
                in report_of('(*keep*) a\n'))

    def test_every_violation_line_carries_its_line_number(self):
        # CONTRACT: a user must be able to jump to the line - every report line
        # of every rule starts with 'line N'
        report = report_of('<bogus-alias> x\n'
                           '<arg>-no_such_arg\n'
                           'q :: w : e\n'
                           '(unbalanced a, d\n')
        details = [line for line in report.splitlines() if line.startswith('  ')]
        assert len(details) >= 3, report
        assert all(re.match(r'  line \d+ \S', line) for line in details), report

    def test_report_numbers_and_container_keys_agree_for_every_kind(self):
        # CONTRACT (property): across a mixed named/unnamed file, each kind's
        # numbering is the same sequence in the report and in the containers -
        # a declared name consumes its number, the next line gets the next one
        config = ('(*t1*) a, d\ne, f\n'
                  '(*r1*) q : w\nx : y\n'
                  '(*m1*) t :: u, i\nr :: o, p\n')
        assert container_keys(config) == ['(*t1*)', '(TAP_2)',
                                          '(*r1*)', '(REB_2)',
                                          '(*m1*)', '(MAC_2)']
        namer = LineNamer()
        assert namer.report_label(KIND_TAP, '(*t1*)') == '(TAP_1, "*t1*")'
        assert namer.report_label(KIND_TAP, '') == '(TAP_2)'


class TestEmptyComponentIsRejected:
    '''the ['a', '', 'd'] hole class F-C3 measured and filed'''

    def test_a_stray_comma_is_normalized_away_and_still_accepted(self):
        # CONTRACT (unchanged, and deliberately so): a stray comma in a plain
        # group is normalized by the line cleaner and the line still loads -
        # the maintainer's own big config relies on that shape today, so the
        # 'hole' ruling covers the CUT-produced class (a repeated declared
        # name), not this one.
        assert clean_comment_lines(['a,,d\n', 'a, ,d\n', 'a,d,\n']) == [
            (1, 'a,d'), (2, 'a,d'), (3, 'a,d')]

    def test_a_space_component_is_a_key_error_not_a_hole(self):
        # CONTRACT (measured split behavior): split_key_group keeps a ' '
        # component, so it reports as an unresolvable key, not as a hole
        violations = Config_Validator().validate([(1, 'a, ,d')])
        assert [(v.rule, v.severity) for v in violations] == [('vk', 'error')]

    def test_the_repeated_declared_name_is_refused_and_no_stream_is_produced(
            self, contract):
        # CONTRACT (the F-C3 measured hole, end to end): a line that repeats
        # its own declared name is rejected with a clear line, and the stream
        # stays unaffected - the config is never loaded
        with pytest.raises(ConfigError) as exc:
            contract.run_contract('<w> a, <w>, d\nq : <w>\n', tap('q'))
        assert '[hole] error' in str(exc.value)

    def test_the_runtime_belt_drops_an_empty_component_and_says_so(self, caplog):
        # CONTRACT (defense in depth): if an empty component reaches the
        # containers anyway - here by handing presort_lines the pair the
        # runtime's replace()-cut produces, without the validator in front of
        # it - it is dropped and logged as a violation, never handed on as a
        # phantom key
        cm = Config_Manager()
        cm._file_name = ''
        with caplog.at_level(logging.WARNING):
            cm.presort_lines([['<w>', 'a,,d']])
        assert cm._alias_hr == [['<w>', ['a', 'd']]]
        assert '[hole] empty key component' in caplog.text
        # the accepted stray-comma shape must not be logged as an error or
        # blame the validator - the maintainer's own config uses that shape
        assert 'bypassed' not in caplog.text
        assert not [r for r in caplog.records if r.levelno >= logging.ERROR], \
            caplog.text

    def test_a_clean_group_is_still_accepted(self):
        # CONTRACT: the rule targets empty components only - normal groups,
        # parenthesised chords and aliases stay valid
        assert Config_Validator().validate(cleaned_lines('a, d, f\n')) == []
        assert Config_Validator().validate(cleaned_lines('<w> a, d\n')) == []
        assert classify_groups('a, (b, c), d')[0] == KIND_TAP


class TestDelayValuesLandAsWritten:
    '''decision 9a=a at the argument level (the runtime half of the pair)'''

    def test_zero_survives_the_runtime_filter(self, fake_fst):
        # CONTRACT: '-tapdelay=0,10' lands as (0, 10) - the silent rewrite to
        # (10, 10) is gone; a lone 0 means 0 to 0
        manager = self._manager(fake_fst)
        manager.apply_start_arguments(['-tapdelay=0,10'])
        assert (manager.ACT_MIN_DELAY_IN_MS, manager.ACT_MAX_DELAY_IN_MS) == (0, 10)
        manager2 = self._manager(fake_fst)
        manager2.apply_start_arguments(['-tapdelay=0'])
        assert (manager2.ACT_MIN_DELAY_IN_MS, manager2.ACT_MAX_DELAY_IN_MS) == (0, 0)

    def test_only_an_out_of_range_value_is_dropped_and_said(self, fake_fst, capsys):
        # CONTRACT: the range check stays (negative and > 1000 are refused) and
        # says so with the bound that is in force
        manager = self._manager(fake_fst)
        manager.apply_start_arguments(['-tapdelay=-5,20'])
        assert (manager.ACT_MIN_DELAY_IN_MS, manager.ACT_MAX_DELAY_IN_MS) == (20, 20)
        assert 'delay not in range 0<=delay<=1000 ms' in capsys.readouterr().out

    def test_a_line_of_only_rejected_values_leaves_the_range_unchanged(
            self, fake_fst, capsys):
        # CONTRACT: when nothing in the value list survives, the previous range
        # stays and the console says the range was NOT changed
        manager = self._manager(fake_fst)
        manager.apply_start_arguments(['-tapdelay=-5,1001'])
        assert (manager.ACT_MIN_DELAY_IN_MS, manager.ACT_MAX_DELAY_IN_MS) == (2, 10)
        assert 'no valid tap delay - delay range unchanged' in capsys.readouterr().out

    @staticmethod
    def _manager(fake_fst):
        from fst_manager import Argument_Manager
        fake_fst.config_manager = type('NS', (), {'file_name': ''})()
        return Argument_Manager(fake_fst)
