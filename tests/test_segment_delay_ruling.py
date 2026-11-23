"""FST-E (decision 12) pins: the segment-delay ruling and its authoring warning.

Ruling (maintainer 2026-11-17, item 12): a macro segment delay (``key|<ms>``)
stays UNBOUNDED. A timeline may have to wait seconds or minutes for the program
in front of it, so no bound is imposed on it - unlike the config delay KNOBS
(``-tapdelay`` / ``-macrodelay`` / ``-sequencedelay``), which set a random default
and keep their 0..1000 ms bound (decision 9a).

What the ruling asks for instead of a bound is an authoring signal: the config
check WARNS (never rejects, never rewrites) once per segment delay above
SEGMENT_DELAY_WARN_MS, so a mistyped ``|300000`` stops being invisible.
"""
import re
from pathlib import Path

from fst_config_parser import DELAY_RANGE, SEGMENT_DELAY_WARN_MS
from fst_manager import Config_Manager, Config_Validator

WIKI = Path(__file__).resolve().parents[1] / 'WIKI.md'


def violations_of(content):
    """the validator's findings for a config text, as the product sees them"""
    config_manager = Config_Manager()
    numbered = config_manager._combine_multilines_numbered(
        config_manager._clean_comments_numbered(content.splitlines(keepends=True)))
    return Config_Validator().validate(numbered)


def warnings_of(content):
    return [v for v in violations_of(content)
            if v.severity == Config_Validator.WARNING]


def errors_of(content):
    return [v for v in violations_of(content)
            if v.severity == Config_Validator.ERROR]


class TestLongSegmentDelayAsksTheAuthor:
    def test_a_segment_delay_above_the_bound_asks_once(self):
        # CONTRACT: an obviously large wait gets exactly one warning and stays
        # legal - it is an authoring question, not a rejection
        found = warnings_of('(m) x :: -a|30001\n')
        assert len(found) == 1, found
        assert found[0].rule == 'delay', found
        assert '30001 ms' in found[0].message, found[0].message
        assert 'intentional' in found[0].message, found[0].message
        assert errors_of('(m) x :: -a|30001\n') == []

    def test_a_segment_delay_at_the_bound_stays_silent(self):
        # CONTRACT: the bound is exclusive - 30000 ms is still "normal", so a
        # user who deliberately picks 30 s is not nagged
        assert violations_of('(m) x :: -a|30000\n') == []

    def test_every_offending_segment_asks_its_own_line(self):
        # CONTRACT: one warning per offending segment, each naming its own value
        # - a macro with two long waits gets two lines, never a merged summary
        found = warnings_of('(m) x :: -a|40000|-b|50000\n')
        delays = [v for v in found if v.rule == 'delay']
        assert len(delays) == 2, found
        assert any('40000 ms' in v.message for v in delays), delays
        assert any('50000 ms' in v.message for v in delays), delays

    def test_the_long_value_is_accepted_and_never_rewritten(self):
        # CONTRACT: no bound, no clamp, no silent fix-up - the value the author
        # wrote is the value the containers hold (the F-C4 silent-rewrite class)
        config_manager = Config_Manager()
        config_manager.presort_lines([('', '(m) x :: -a|40000')])
        assert '-a|40000' in repr(config_manager._macros_hr), config_manager._macros_hr

    def test_a_negative_segment_delay_is_untouched_as_before(self):
        # CONTRACT (characterization, measured before the change): a negative
        # segment delay was silent and stays silent - decision 12 asked for a
        # large-value signal only, not a new validity rule
        assert violations_of('(m) x :: -a|-5\n') == []

    def test_the_warning_names_the_delay_knobs_as_a_different_thing(self):
        # CONTRACT: the message must not read like the bounded knob rule, or the
        # user will look for a knob that bounds segment delays (there is none)
        message = warnings_of('(m) x :: -a|99000\n')[0].message
        assert '-tapdelay' in message and 'unbounded' in message, message

    def test_the_bound_is_one_number_and_is_not_the_knob_bound(self):
        # CONTRACT: two different product rules, one constant each
        assert SEGMENT_DELAY_WARN_MS == 30000
        assert DELAY_RANGE == (0, 1000)
        assert SEGMENT_DELAY_WARN_MS > DELAY_RANGE[1]


class TestUnrelatedValidationIsUnmoved:
    def test_a_tap_group_delay_suffix_still_rejects(self):
        # CONTRACT: tap groups never take a delay suffix - that error is the
        # user's guide to where delays belong, and it stays the only message
        found = violations_of('a|5000, d\n')
        assert len(found) == 1 and found[0].rule == 'shape', found

    def test_a_non_numeric_constraint_still_rejects(self):
        # CONTRACT: a constraint that is neither a number nor "(...)" stays an
        # error - the new delay check does not soften it
        found = violations_of('(m) x :: -a|abc\n')
        assert len(found) == 1 and found[0].rule == 'constraint', found


class TestTheRulingIsDocumented:
    def test_the_wiki_states_the_unbounded_ruling_and_its_two_safety_rules(self):
        # CONTRACT: the ruling is only "deliberate" if the user can read it. The
        # [Suffix/Delays] section carries: unbounded on purpose, the authoring
        # warning bound, and the pending-delay flush that makes a long wait safe.
        text = WIKI.read_text(encoding='utf-8')
        start = text.index('### [Suffix/Delays]')
        rest = text[start + len('### [Suffix/Delays]'):]
        cut = rest.index('\n###') if '\n###' in rest else len(rest)
        # wrap-tolerant: the doc may re-flow, the claims must survive it
        section = ' '.join(rest[:cut].split())
        # every claim the ruling has, each in its own sentence, so deleting one
        # of them fails this pin instead of silently shortening the doc
        for claim in ('UNBOUNDED',                      # the ruling itself
                      '0..1000',                        # the knob bound, and
                      'KNOBS',                          # that it is NOT the segment rule
                      str(SEGMENT_DELAY_WARN_MS),       # the authoring-warning bound
                      'intentional',                    # it asks, it does not reject
                      'never rejects',                  # ... and never rejects
                      'never changes the value',        # ... and never rewrites
                      'focus-group change',             # the four context ends,
                      'macro abort',                    # named for the user rather
                      'pause',                          # than as an implementation
                      'config reload',                  # detail
                      'pending delay is dropped',       # the flush, part 1
                      'released immediately'):          # the flush, part 2
            assert claim in section, (claim, section[:400])
        assert re.search(r'UNBOUNDED.*decision 12', section, re.S), section[:400]
