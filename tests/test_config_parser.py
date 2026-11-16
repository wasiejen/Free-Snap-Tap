"""F-C2 parser-level pins (fst_config_parser): the config grammar's edges.

These pin the GRAMMAR itself (what the one parser decides), which before F-C2
lived twice - in Config_Validator._check_group_line and in
Config_Manager.presort_lines. Where the two lanes still differ on purpose (the
delay bounds, the default-name counting policy) the difference is pinned as a
pair, so a later unification has to be a decision with a failing test behind it
instead of a silent drift.
"""
import pytest

from fst_config_parser import (DELAY_RANGE, RUNTIME_DELAY_RANGE, classify_groups,
                               clean_comment_lines, combine_multiline_continuations,
                               LineNamer, normalize_start_arg_name, parse_int_list,
                               KIND_TAP, KIND_REBIND, KIND_MACRO, KIND_SEQUENCE,
                               KIND_DROPPED)
from fst_manager import Config_Validator

# the same cleaned-line pair the runtime builds before any group is built
NUMBERED = list(enumerate(['a, d\n', 'a : b\n', 'a :: b, c\n'], start=1))


class TestLineGrammar:
    def test_comments_inline_notes_and_commented_keys_clean_to_group_text(self):
        # CONTRACT: comments are presentation only - the line that reaches the
        # grammar is the uncommented text, on its ORIGINAL line number
        cleaned = clean_comment_lines([
            '# whole line comment\n',
            'a : b  # inline note\n',
            'x, #y, z\n',
            'a, #:sep\n',
        ])
        assert cleaned == [(2, 'a : b'), (3, 'x,z'), (4, 'a,:')]

    def test_crlf_and_lf_files_clean_identically(self):
        # CONTRACT: a CRLF file (Notepad reality) parses to exactly the same
        # lines as the LF version - the cleaning strips the carriage return
        lf = clean_comment_lines(['a : b\n', '<focus>game\n'])
        crlf = clean_comment_lines(['a : b\r\n', '<focus>game\r\n'])
        assert crlf == lf

    def test_a_bom_makes_the_first_line_an_ordinary_group_line(self):
        # CONTRACT (characterization, NOT an endorsement): a UTF-8 BOM stays
        # part of the first line, so a BOM'd '<focus>game' is NOT a section
        # header today - it is an ordinary group line and the validator calls
        # it an unknown key. Making the loader BOM-tolerant is a behavior
        # decision (filed), this pin only locks what happens now.
        cleaned = clean_comment_lines(['\ufeff<focus>game\n'])
        assert cleaned == [(1, '\ufeff<focus>game')]
        violations = Config_Validator().validate(cleaned)
        assert violations, 'the BOM line must not silently become a section'

    def test_colon_continuations_join_onto_the_head_keeping_its_number(self):
        # CONTRACT: a line starting with ':' belongs to the sequence above it,
        # and the joined line reports the HEAD's number
        joined = combine_multiline_continuations([(1, 'a :: b'), (2, ': c'), (3, ': d')])
        assert joined == [(1, 'a :: b: c: d')]

    def test_continuation_without_a_head_is_an_indexerror_today(self):
        # CONTRACT (characterization): a continuation as the FIRST content line
        # has no head to join - today this raises IndexError instead of
        # reporting a violation (the crash lands before validation). Pinned so
        # the future fix is a decision with a red test behind it.
        with pytest.raises(IndexError):
            combine_multiline_continuations([(1, ': orphan')])


class TestClassification:
    @pytest.mark.parametrize('body,expected', [
        ('a, d', KIND_TAP),
        ('q : w', KIND_REBIND),
        ('q :: w, e', KIND_MACRO),
        ('q :: w : e', KIND_SEQUENCE),
        ('(*name*) style is stripped before this point', KIND_TAP),
    ])
    def test_each_shape_gets_one_type(self, body, expected):
        # CONTRACT: one shape, one type - the validator's report and the
        # runtime's containers read the same decision
        assert classify_groups(body)[0] == expected

    def test_the_dropped_shape_is_dropped_and_named_identically(self):
        # CONTRACT: ':" with a non-empty middle group after a "::" is the
        # dropped shape: presort_lines keeps it out of every container AND the
        # validator names it with rule 'dropped' - one classifier, two voices
        assert classify_groups('a : b : c')[0] == KIND_DROPPED
        violations = Config_Validator().validate([(1, 'a : b : c')])
        assert [(v.rule, v.severity) for v in violations] == [('dropped', 'error')]

    def test_whitespace_and_missing_spaces_do_not_change_the_type(self):
        # CONTRACT: spacing is free - 'a::b : c' is the same sequence as
        # 'a :: b : c' (groups are stripped per item)
        tight = classify_groups('a::b : c')
        spaced = classify_groups('a :: b : c')
        assert tight[0] == spaced[0] == KIND_SEQUENCE
        assert tight[1] == spaced[1]

    def test_a_lone_colon_is_a_rebind_shape_with_an_empty_trigger(self):
        # CONTRACT: ':' alone stays the rebind shape with both sides empty -
        # the SHAPE call is the parser's, the "rebind without trigger key"
        # error is the validator's rule on top of it
        kind, groups = classify_groups(':')
        assert (kind, groups) == (KIND_REBIND, ['', ''])
        violations = Config_Validator().validate([(1, ':')])
        assert 'shape' in [v.rule for v in violations]


class TestDefaultNamePolicies:
    def test_validator_numbers_every_line_named_or_not(self):
        # CONTRACT (policy pair 1/2): the violation report numbers every line
        # of a type, so a declared name still consumes its (TAP_n) number
        namer = LineNamer(count_named=True)
        assert namer.name_for(KIND_TAP, '(*named*)') == '(*named*)'
        assert namer.name_for(KIND_TAP, '') == '(TAP_2)'

    def test_containers_number_only_the_unnamed_lines(self):
        # CONTRACT (policy pair 2/2): the runtime containers number only the
        # lines that carry no name, so their (TAP_1) can differ from the
        # report's (TAP_2) for the same line - a known drift, pinned as intent
        namer = LineNamer(count_named=False)
        assert namer.name_for(KIND_TAP, '(*named*)') == '(*named*)'
        assert namer.name_for(KIND_TAP, '') == '(TAP_1)'


class TestStartArgumentSpelling:
    @pytest.mark.parametrize('arg,expected', [
        ('-always-active', '-always_active'),
        ('-debug-numpad', '-debug_numpad'),
        ('-always_active', '-always_active'),
        ('-tap-delay=1,2', '-tap_delay=1,2'),
    ])
    def test_dashed_spellings_match_their_underscore_names(self, arg, expected):
        # CONTRACT: '-' and '_' are one spelling in an argument NAME (U361
        # ruling A); the text after '=' is untouched ('1,2' stays as written)
        assert normalize_start_arg_name(arg) == expected

    def test_a_name_without_leading_dash_is_left_alone(self):
        # CONTRACT: the parser never rewrites a name the user did not mark as
        # an argument - 'always-active' stays as written for the report
        assert normalize_start_arg_name('always-active') == 'always-active'

    def test_delay_values_parse_or_report_none(self):
        # CONTRACT: a delay value is a comma list of ints, spaces ignored;
        # anything that is not a number reports None (the caller words it)
        assert parse_int_list('1, 2') == [1, 2]
        assert parse_int_list('1,x') is None
        assert parse_int_list('') is None


class TestDelayBoundDrift:
    def test_the_validator_accepts_delay_zero(self):
        # CONTRACT (drift pair 1/2): '<arg>-tapdelay=0,10' raises no violation,
        # because the validator's bound is DELAY_RANGE checked inclusively
        violations = Config_Validator().validate([(1, '<arg>-tapdelay=0,10')])
        assert violations == []

    def test_the_runtime_still_drops_delay_zero(self, fake_fst):
        # CONTRACT (drift pair 2/2): the same argument at runtime keeps only
        # RUNTIME_DELAY_RANGE values, so '-tapdelay=0,10' ends up (10, 10) -
        # the delay-0 drift Item 4 names. Unifying the bounds is a maintainer
        # decision; until then the pair above/below locks both halves.
        from fst_manager import Argument_Manager
        fake_fst.config_manager = type('NS', (), {'file_name': ''})()
        manager = Argument_Manager(fake_fst)
        manager.apply_start_arguments(['-tapdelay=0,10'])
        assert (manager.ACT_MIN_DELAY_IN_MS, manager.ACT_MAX_DELAY_IN_MS) == (10, 10)
        assert RUNTIME_DELAY_RANGE[0] == 1 and DELAY_RANGE[0] == 0
