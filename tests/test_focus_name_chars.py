"""#399 - focus group names may contain ':' and '-'.

Maintainer request (inbox 2026-11-03_13-14_fst.md, curated to TODO #399): add
':' and '-' to the allowed characters in a focus group name. The single gate is
FOCUS_NAME_ILLEGAL (fst_manager.py:1078) - the validator warning leg, the scope
derivation, and the runtime name cleaning all share it, so the allowlist is the
one place that changes.

What could break, and is pinned here as unaffected:
- the ':' config separator. A focus HEADER line is detected by startswith
  ('<focus>') long before any ':' split, and the header never reaches
  presort_lines, so a name containing ':' cannot be mistaken for a rebind line
  and cannot swallow the line that follows it.
- name-based lookup: the name -> scope map (config_focus_scopes),
  apply_start_args_by_focus_name and apply_focus_groups all resolve the CLEANED
  name as an opaque string.
- THE HIDDEN COUPLING (reviewer P0/P1, 2026-11-10): the active-window TITLE is
  sanitized SEPARATELY in fst_tasks.py, and matching is
  `cleaned_title.find(config_name)`. If the two patterns differ, widening only
  the name side silently breaks activation for every name containing the
  newly-allowed char - no warning, no ConfigError, the filter just never
  activates. So the sanitizer rule is ONE constant shared by both sides, pinned
  through Focus_Task below.
"""
import pytest

from fst_manager import Config_Manager, Config_Validator
from vk_codes import vk_codes_dict


def violations_of(content):
    cm = Config_Manager()
    numbered = cm._combine_multilines_numbered(
        cm._clean_comments_numbered(content.splitlines(keepends=True)))
    return Config_Validator().validate(numbered)


def write_config(tmp_path, content):
    path = tmp_path / 'config.txt'
    path.write_text(content)
    return str(path)


SECTION = """\
<focus>Half-Life:2-beta
<arg>-tapdelay=8,2
<arg>-nomenu
q : e
"""


class TestValidatorAcceptsTheChars:
    def test_colon_and_dash_focus_name_has_no_violation(self):
        # RED before the fix: one WARNING "invalid focus-name characters
        # removed: ... (removed: '-:')"
        assert violations_of('<focus>Half-Life:2-beta\n') == []

    def test_colon_only_and_dash_only_names_accepted(self):
        assert violations_of('<focus>A:1\n') == []
        assert violations_of('<focus>some-app\n') == []

    def test_multi_name_section_with_colons_accepted(self):
        assert violations_of('<focus>A:1, B-2\n') == []

    def test_other_illegal_chars_still_warn(self):
        # the allowlist widens by two chars only - the rule stays a rule
        violations = violations_of('<focus>Bad*Name\n')
        assert len(violations) == 1
        assert violations[0].severity == Config_Validator.WARNING
        assert 'invalid focus-name characters' in violations[0].message


class TestScopeAndNameResolution:
    def test_scope_keeps_colon_and_dash(self):
        v = Config_Validator()
        assert v._focus_scope_of('<focus>Half-Life:2-beta') == 'Half-Life:2-beta'

    def test_multi_name_scope_first_name_keeps_chars(self):
        v = Config_Validator()
        assert v._focus_scope_of('<focus>A:1, B-2') == 'A:1'

    def test_load_keeps_name_and_its_args_and_group_lines(self, tmp_path):
        # runtime parse: the section key IS the cleaned name, its <arg> line and
        # its rebind line land under that key (a ':' name does not split it)
        cm = Config_Manager(write_config(tmp_path, SECTION))
        multi_focus_dict, default_args, default_lines = cm.load_config()
        assert 'Half-Life:2-beta' in multi_focus_dict
        args, group_lines = multi_focus_dict['Half-Life:2-beta']
        assert args == ['-tapdelay=8,2', '-nomenu']
        # group lines are stored as [line_name, line] pairs ('' = plain group)
        assert group_lines == [['', 'q : e']]
        assert default_args == [] and default_lines == []

    def test_focus_scope_map_maps_the_colon_name(self, tmp_path):
        cm = Config_Manager(write_config(tmp_path, SECTION))
        cm.load_config()
        assert cm.config_focus_scopes['Half-Life:2-beta'] == 'Half-Life:2-beta'

    def test_colon_name_does_not_swallow_the_next_section(self, tmp_path):
        content = SECTION + '<focus>Other\n'
        cm = Config_Manager(write_config(tmp_path, content))
        multi_focus_dict, _, _ = cm.load_config()
        assert multi_focus_dict['Other'] == [[], []]
        assert multi_focus_dict['Half-Life:2-beta'][1] == [['', 'q : e']]


class TestFacadeNameLookup:
    def test_apply_start_args_by_colon_name_works(self, kb_env_ns, tmp_path):
        kb = kb_env_ns.kb
        kb.config_manager.file_name = write_config(tmp_path, SECTION)
        kb.update_focus_groups()
        # no ConfigError('focus group ... not found') for the ':' name, and the
        # section's own start argument took effect
        kb.apply_start_args_by_focus_name('Half-Life:2-beta')
        assert kb.arg_manager.MENU_ENABLED is False

    def test_apply_focus_groups_by_colon_name_builds_its_rebind(self, kb_env_ns, tmp_path):
        kb = kb_env_ns.kb
        kb.config_manager.file_name = write_config(tmp_path, SECTION)
        kb.update_focus_groups()
        kb.apply_start_args_by_focus_name('Half-Life:2-beta')
        kb.apply_focus_groups('Half-Life:2-beta')
        # a Key->Key rebind builds a press AND a release trigger, both on 'q',
        # and the replacement key is 'e'
        assert len(kb._rebind_triggers) == 2
        assert all(t.get_trigger().vk_code == vk_codes_dict['q']
                   for t in kb._rebind_triggers)
        # the replacement key of each rebind is 'e' (Key_Event.get_all()[0])
        assert all(r.replacement.get_all()[0] == vk_codes_dict['e']
                   for r in kb._rebinds)


class TestWindowTitleMatching:
    """The P0 leg (reviewer, 2026-11-10): the config name and the active-window
    TITLE must be sanitized by the SAME pattern, or a name that keeps ':' and
    '-' can never be found in a title that had them stripped."""

    @pytest.mark.asyncio
    async def test_title_and_name_with_colon_and_dash_activate(self, monkeypatch):
        from test_focus_task import driving_sleep, fake_windows, make_fst
        from fst_tasks import Focus_Task
        fst = make_fst(focus_names=['Half-Life:2-beta'])
        fake_windows(monkeypatch, ['Half-Life:2-beta - Steam'])
        task = Focus_Task(fst)
        driving_sleep(monkeypatch, task, ticks=2)

        await task.run()

        assert fst.focus_manager.FOCUS_APP_NAME == 'Half-Life:2-beta'

    @pytest.mark.asyncio
    async def test_plain_hyphenated_title_still_activates(self, monkeypatch):
        # the pre-existing case that must not regress: 'Half-Life' configs
        from test_focus_task import driving_sleep, fake_windows, make_fst
        from fst_tasks import Focus_Task
        fst = make_fst(focus_names=['Half-Life'])
        fake_windows(monkeypatch, ['Half-Life 2'])
        task = Focus_Task(fst)
        driving_sleep(monkeypatch, task, ticks=2)

        await task.run()

        assert fst.focus_manager.FOCUS_APP_NAME == 'Half-Life'
