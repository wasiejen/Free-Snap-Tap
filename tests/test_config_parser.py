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
                               arg_value, prefix_matches, split_item_prefix,
                               START_ARG_FLAGS, START_ARG_VALUES,
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


class TestDefaultNumbering:
    '''F-C4 (decision 9b): ONE numbering - this class replaced the F-C2
    policy-pair class, which pinned two different counters (the report counted
    every line, the containers only the unnamed ones)'''

    def test_every_line_of_a_kind_consumes_its_number(self):
        # CONTRACT: a declared name consumes its number too, and the line is
        # still KNOWN by the name it declared (that is the container key, the
        # menu entry and the status dump)
        namer = LineNamer()
        assert namer.name_for(KIND_TAP, '(*named*)') == '(*named*)'
        assert namer.name_for(KIND_TAP, '') == '(TAP_2)'

    def test_the_report_shows_the_number_and_the_declared_name(self):
        # CONTRACT: a violation line names its line by type number, and adds
        # the declared text when there is one - the user can find the number in
        # the menu and the text in the config
        namer = LineNamer()
        assert namer.report_label(KIND_TAP, '(*keep*)') == '(TAP_1, "*keep*")'
        assert namer.report_label(KIND_TAP, '') == '(TAP_2)'

    def test_both_labels_come_from_the_same_counter(self):
        # CONTRACT: one walk, one sequence - the label a line is known by and
        # the label the report shows for it never disagree about the number
        namer = LineNamer()
        assert namer.name_for(KIND_REBIND, '') == '(REB_1)'
        assert namer.report_label(KIND_REBIND, '(*x*)') == '(REB_2, "*x*")'
        # a named line consumes its number too (decision 9b), so the next
        # unnamed line is (REB_4) and not (REB_3)
        assert namer.name_for(KIND_REBIND, '(*y*)') == '(*y*)'
        assert namer.report_label(KIND_REBIND, '') == '(REB_4)'


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


class TestArgGrammar:
    '''F-C3 (review Item 4 inventory): the '-name=value' shape and the name
    matching are the parser's; the two entry worlds keep their own policy'''

    @pytest.mark.parametrize('arg,name,expected', [
        ('-log=debug', '-log', 'debug'),
        ('-file=C:/x/my config.cfg', '-file', 'C:/x/my config.cfg'),
        ('-tapdelay=1,2', '-tapdelay', '1,2'),
        ('-backup_root_dir=D:/bak', '-backup_root_dir', 'D:/bak'),
        ('-log=', '-log', None),          # empty value is not a value arg
        ('-loglevel=debug', '-log', None),
        ('-log', '-log', None),
        ('-log=debug', '-file', None),
    ])
    def test_value_part_of_an_argument(self, arg, name, expected):
        # CONTRACT: '-name=' with a non-empty tail yields that tail verbatim
        # (spaces kept); anything else - including the same name as a longer
        # word - yields None. The CLI chain used to spell this with a
        # hand-counted slice per argument (11 copies).
        assert arg_value(arg, name) == expected

    def test_the_command_line_world_is_lenient_where_the_config_world_is_not(self, fake_fst):
        # CONTRACT (entry worlds stay distinct): '-tray_iconX' works as a
        # START argument (the chain matches the name as a prefix) while the
        # same text in a config '<arg>' line reports 'unknown start argument'.
        # F-C3 kept that difference on purpose and pinned it - unifying it
        # would change which spellings load (decision filed).
        assert prefix_matches('-tray_iconX', '-tray_icon')
        assert not prefix_matches('-tray', '-tray_icon')
        from fst_manager import Argument_Manager
        fake_fst.config_manager = type('NS', (), {'file_name': ''})()
        manager = Argument_Manager(fake_fst)
        manager.apply_start_arguments(['-tray_iconX'])
        assert manager.TRAY_ICON is True
        violations = Config_Validator().validate([(1, '<arg>-tray_iconX')])
        assert [(v.rule, v.severity) for v in violations] == [('arg', 'warning')]

    def test_the_two_tables_are_one_object_shared_with_the_runtime(self):
        # CONTRACT: one flag/value vocabulary for both worlds - and the
        # runtime really reads THAT object. Identity is the point: a second
        # START_ARG_FLAGS defined later in fst_manager would shadow the
        # import and the two entry worlds would silently disagree again.
        import fst_config_parser
        import fst_manager
        assert fst_manager.START_ARG_FLAGS is fst_config_parser.START_ARG_FLAGS
        assert fst_manager.START_ARG_VALUES is fst_config_parser.START_ARG_VALUES
        assert '-crossover' in START_ARG_FLAGS and '-crossover' in START_ARG_VALUES
        assert '-no_such_flag' not in START_ARG_FLAGS | START_ARG_VALUES


class TestItemPrefix:
    '''F-C3: the declared-name prefix rule (alias '<x>' / group '(name)')'''

    @pytest.mark.parametrize('line,expected', [
        ('<world> a, d', ('<world>', 'a, d', True)),
        ('(*keep*) x : y', ('(*keep*)', 'x : y', False)),
        ('(REB_1) a, d', ('(REB_1)', 'a, d', False)),
        ('a, d', ('', 'a, d', False)),
        ('<>x', ('', '<>x', False)),           # bracket at index 1 is text
        ('() x : y', ('', '() x : y', False)),
        ('<world>', ('<world>', '', True)),
    ])
    def test_prefix_split_is_a_slice_and_a_shape_rule(self, line, expected):
        # CONTRACT: a prefix counts only when its closing bracket sits past
        # index 1; the body is the remainder stripped; only '<...>' is an
        # alias definition. Both validator walks use THIS rule.
        assert split_item_prefix(line) == expected

    # F-C4 moved the end-to-end case of this shape to
    # tests/test_f_rulings.py::TestEmptyComponentIsRejected (the validator now
    # refuses the line, so it never reaches the section walk - the belt is
    # pinned there against a direct presort call instead)


class TestDelayBound:
    '''F-C4 (decision 9a=a): ONE bound - this class replaced the F-C2
    drift-pair class, which pinned the validator accepting delay 0 while the
    runtime silently dropped it'''

    def test_the_validator_accepts_delay_zero(self):
        # CONTRACT: '<arg>-tapdelay=0,10' is a valid line - 0 is in range
        violations = Config_Validator().validate([(1, '<arg>-tapdelay=0,10')])
        assert violations == []

    def test_the_runtime_keeps_the_value_as_written(self, fake_fst):
        # CONTRACT: the runtime applies the SAME bound, so the value lands as
        # written - no silent rewrite to (10, 10) any more, and only a console
        # line when a value is genuinely out of range
        from fst_manager import Argument_Manager
        fake_fst.config_manager = type('NS', (), {'file_name': ''})()
        manager = Argument_Manager(fake_fst)
        manager.apply_start_arguments(['-tapdelay=0,10'])
        assert (manager.ACT_MIN_DELAY_IN_MS, manager.ACT_MAX_DELAY_IN_MS) == (0, 10)
        # one bound for both worlds, not two copies that can drift again
        assert RUNTIME_DELAY_RANGE is DELAY_RANGE == (0, 1000)

    # the out-of-range legs (a dropped value, a line of only rejected values)
    # are pinned in tests/test_f_rulings.py::TestDelayValuesLandAsWritten
