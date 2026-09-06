import pytest

from fst_manager import Config_Manager

DEFAULT_CONFIG = """\
# default global arguments
<arg>-tapdelay=8,2
<arg>-crossover=40

# default tap groups
a, d
w, s

<focus>Counter
<arg>-nomenu
caps_lock : shift
(my_rebind) +w : -s
(my_seq) x :: a, b
    : c

<focus>Second
"""

MULTI_FOCUS_CONFIG = """\
<focus>A, B
ab

<focus>C
cd
"""

MULTI_FOCUS_LAST_CONFIG = """\
<focus>C
cd

<focus>A, B
ab
"""


def write_config(tmp_path, content):
    path = tmp_path / 'config.txt'
    path.write_text(content)
    return str(path)


def test_load_config_default_section(tmp_path):
    multi_focus, default_args, default_groups = Config_Manager(write_config(tmp_path, DEFAULT_CONFIG)).load_config()

    assert default_args == ['-tapdelay=8,2', '-crossover=40']
    assert ['', 'a,d'] in default_groups
    assert ['', 'w,s'] in default_groups


def test_load_config_focus_groups(tmp_path):
    multi_focus, _, _ = Config_Manager(write_config(tmp_path, DEFAULT_CONFIG)).load_config()

    assert set(multi_focus) == {'Counter', 'Second'}
    assert multi_focus['Counter'][0] == ['-nomenu']
    assert ['', 'caps_lock : shift'] in multi_focus['Counter'][1]
    assert ['(my_rebind)', '+w : -s'] in multi_focus['Counter'][1]
    assert ['(my_seq)', 'x :: a,b: c'] in multi_focus['Counter'][1]
    assert multi_focus['Second'] == [[], []]


def test_load_config_raises_on_missing_file(tmp_path):
    with pytest.raises(FileNotFoundError):
        Config_Manager(str(tmp_path / 'nope.txt')).load_config()


def test_multi_focus_shares_group(tmp_path):
    multi_focus, _, _ = Config_Manager(write_config(tmp_path, MULTI_FOCUS_CONFIG)).load_config()

    assert set(multi_focus) == {'A', 'B', 'C'}
    assert multi_focus['B'] is multi_focus['A']
    assert multi_focus['A'][1] == [ ['', 'ab'] ]
    assert multi_focus['C'][1] == [ ['', 'cd'] ]


def test_multi_focus_extras_of_last_section_registered(tmp_path):
    multi_focus, _, _ = Config_Manager(write_config(tmp_path, MULTI_FOCUS_LAST_CONFIG)).load_config()

    assert set(multi_focus) == {'A', 'B', 'C'}
    assert multi_focus['B'] is multi_focus['A']
    assert multi_focus['A'][1] == [ ['', 'ab'] ]
    assert multi_focus['C'][1] == [ ['', 'cd'] ]


def test_real_config_parses():
    from pathlib import Path

    cfg = Path(__file__).resolve().parents[1] / 'FSTconfig.txt'
    if not cfg.exists():
        pytest.skip('real config not present')

    cm = Config_Manager(str(cfg))
    multi_focus, default_args, default_lines = cm.load_config()

    assert 'Counter' in multi_focus
    assert '-tapdelay=8,2' in default_args

    cm.presort_lines(default_lines + multi_focus.get('Counter', ([], []))[1])
    assert len(cm.tap_groups_hr) == 2
    assert len(cm.macros_hr) == 4


def test_clean_comments():
    cm = Config_Manager()
    lines = cm._clean_comments([
        '# full line comment\n',
        'a, d\n',
        'd # trailing comment\n',
        '\n',
        '<arg>-NoMenu   # a comment\n',
        '<focus>Game   # the game\n',
    ])

    assert lines == ['a,d', 'd', '<arg>-NoMenu', '<focus>Game']


def test_clean_comments_comment_after_comma():
    cm = Config_Manager()
    assert cm._clean_comments(['e, # comment only\n']) == ['e']


def test_clean_comments_commented_out_keys():
    cm = Config_Manager()
    assert cm._clean_comments(['a, #w, d, #s\n']) == ['a,d']


def test_clean_comments_removes_trailing_comma():
    cm = Config_Manager()
    assert cm._clean_comments(['a, d,\n']) == ['a,d']


def test_clean_comments_keeps_single_char_line():
    cm = Config_Manager()
    assert cm._clean_comments(['q\n']) == ['q']


def test_clean_comments_keeps_single_char_line_with_trailing_comment():
    cm = Config_Manager()
    assert cm._clean_comments(['q # single tap group is not valid\n']) == ['q']


class TestPresortLines:
    def test_tap_groups_default_name(self):
        cm = Config_Manager()
        cm.presort_lines([('', 'a,d')])
        assert cm.tap_groups_hr == [['(TAP_1)', ['a', 'd']]]

    def test_tap_group_with_evaluation(self):
        cm = Config_Manager()
        cm.presort_lines([('', 'a|(p(shift)),d')])
        assert cm.tap_groups_hr == [['(TAP_1)', ['a|(p(shift))', 'd']]]

    def test_rebind_hr_format(self):
        cm = Config_Manager()
        cm.presort_lines([('', 'caps_lock : shift')])
        assert cm.rebinds_hr == [['(REB_1)', [['caps_lock'], 'shift']]]

    def test_rebind_keeps_given_alias(self):
        cm = Config_Manager()
        cm.presort_lines([('(named_reb)', 'a : b')])
        assert cm.rebinds_hr == [['(named_reb)', [['a'], 'b']]]

    def test_invalid_rebind_not_added(self):
        cm = Config_Manager()
        cm.presort_lines([('', 'a : b, c')])
        assert cm.rebinds_hr == []

    def test_macro_default_name(self):
        cm = Config_Manager()
        cm.presort_lines([('', 'a :: b')])
        assert cm.macros_hr == [['(MAC_1)', [['a'], ['b']]]]

    def test_macro_hr_format(self):
        cm = Config_Manager()
        cm.presort_lines([('(my_macro)', '-space :: a,b')])
        assert cm.macros_hr == [['(my_macro)', [['-space'], ['a', 'b']]]]

    def test_macro_sequence_hr_format(self):
        cm = Config_Manager()
        cm.presort_lines([('', 'x :: a,b : c,d')])
        assert cm.macros_hr == [['(SEQ_1)', [['x'], ['a', 'b'], ['c', 'd']]]]

    def test_alias_hr(self):
        cm = Config_Manager()
        cm.presort_lines([('<run_if_not>', '-shift|(ar(shift)),-c')])
        assert cm.alias_hr == [['<run_if_not>', ['-shift|(ar(shift))', '-c']]]


class TestFileWriting:
    def test_create_new_group_file_writes_default_tap_groups(self, tmp_path):
        path = tmp_path / 'new.cfg'
        cm = Config_Manager(str(path))
        cm.create_new_group_file()
        assert path.exists()
        assert path.read_text().splitlines() == [
            '# Tap Groups', 'a, d', 'w, s', '# Rebinds', '# Macros',
        ]
        assert cm.tap_groups_hr == [['a', 'd'], ['w', 's']]

    def test_create_new_group_file_resets_previous_groups(self, tmp_path):
        path = tmp_path / 'new.cfg'
        cm = Config_Manager(str(path))
        cm.create_new_group_file()
        cm.add_group(['x', 'z'], cm._tap_groups_hr)
        cm.create_new_group_file()
        # previous content is discarded; the default groups are written
        assert path.read_text().splitlines() == [
            '# Tap Groups', 'a, d', 'w, s', '# Rebinds', '# Macros',
        ]

    def test_write_out_new_file_writes_current_tap_groups(self, tmp_path):
        path = tmp_path / 'cfg.txt'
        cm = Config_Manager(str(path))
        cm.add_group(['a', 'd'], cm._tap_groups_hr)
        cm.add_group(['w', 's'], cm._tap_groups_hr)
        cm._write_out_new_file()
        assert path.read_text().splitlines() == [
            '# Tap Groups', 'a, d', 'w, s', '# Rebinds', '# Macros',
        ]

    def test_load_config_missing_file_raises_without_creating_file(self, tmp_path):
        path = tmp_path / 'missing.cfg'
        with pytest.raises(FileNotFoundError):
            Config_Manager(str(path)).load_config()
        # the create_new_group_file() call in the handler sits behind the raise
        assert not path.exists()
