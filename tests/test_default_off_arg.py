"""#403 - the approved `-default_off` focus argument (default-group-line
suppression per focus group).

Forensic verdict (Leg 1, no code): this argument NEVER EXISTED in this repo's
history - `git log --all -S 'default_off'` and `-G'[Dd]efault[_-][Oo]ff'` hit
only the two tap-reconcile commits (the phrase "default off", not an argument),
and `apply_focus_groups` (fst_keyboard.py) still merges
`default_lines + focus_group_lines` unconditionally. The name came from the
maintainer's own comment on the APPROVED proposal
(estate proposals/implemented/2026-10-31_fst-default-focus-group-deactivation.md
L57 "a) '-default_off' maybe? ... approved" and L67 "-default_always_active is
only deactivated per focus group via '-default_off'"), and only the SIBLING
argument landed (`-default_always_active`, commit bfde688 U290T(3)) - the
opt-out half of the approved design was never built. So this file is
RED-before for the missing approved behavior, not a restore of deleted code.

Approved design being implemented (proposal parts a+b, maintainer comments):
- one new `<arg>`: `-default_off` (dashed twin `-default-off` via U361
  normalization), settable in the default section or a focus section;
- it drops the default GROUP LINES for the applied focus group only
  (b: "only drop group lines. start arguments can be overwritten ...");
- `-always_active` (focus-loss behavior) stays untouched (c).
"""
from fst_manager import Config_Manager, Config_Validator
from vk_codes import vk_codes_dict

VK_M = vk_codes_dict['m']
VK_Q = vk_codes_dict['q']


def write_config(tmp_path, content):
    path = tmp_path / 'config.txt'
    path.write_text(content)
    return str(path)


def trigger_vks(kb):
    return {t.get_trigger().vk_code for t in kb._rebind_triggers}


CONFIG_BASE = """\
m : n
<focus>Game
q : e
"""

CONFIG_OFF = """\
m : n
<focus>Game
<arg>-default_off
q : e
"""


def load_and_activate(kb, tmp_path, content, focus_name):
    kb.config_manager.file_name = write_config(tmp_path, content)
    kb.update_focus_groups()
    kb.update_args_and_groups(focus_name, startup=False)


class TestDefaultOffBehavior:
    def test_default_off_drops_default_group_lines_for_that_group(self, kb_env_ns, tmp_path):
        # RED before the arg exists: 'm' (default line) is still built
        kb = kb_env_ns.kb
        load_and_activate(kb, tmp_path, CONFIG_OFF, 'Game')
        assert trigger_vks(kb) == {VK_Q}

    def test_without_default_off_default_lines_stay_merged(self, kb_env_ns, tmp_path):
        # guard pin: the approved default behavior must not change
        kb = kb_env_ns.kb
        load_and_activate(kb, tmp_path, CONFIG_BASE, 'Game')
        assert trigger_vks(kb) == {VK_M, VK_Q}

    def test_default_off_keeps_default_start_arguments(self, kb_env_ns, tmp_path):
        # approved ruling (b): lines only - start arguments stay merged
        kb = kb_env_ns.kb
        content = CONFIG_OFF.replace('<focus>Game',
                                     '<arg>-nomenu\n<focus>Game')
        load_and_activate(kb, tmp_path, content, 'Game')
        assert kb.arg_manager.MENU_ENABLED is False
        assert trigger_vks(kb) == {VK_Q}

    def test_default_off_resets_for_a_section_without_it(self, kb_env_ns, tmp_path):
        kb = kb_env_ns.kb
        content = ("""m : n\n<focus>Game\n<arg>-default_off\nq : e\n"""
                   """<focus>Other\nk : l\n""")
        kb.config_manager.file_name = write_config(tmp_path, content)
        kb.update_focus_groups()
        kb.update_args_and_groups('Game', startup=False)
        assert trigger_vks(kb) == {VK_Q}
        kb.update_args_and_groups('Other', startup=False)
        assert VK_M in trigger_vks(kb)

    def test_default_section_itself_keeps_its_lines(self, kb_env_ns, tmp_path):
        # focus_name '' = the default section / focus loss: never self-removed
        kb = kb_env_ns.kb
        content = CONFIG_OFF.replace('<focus>Game', '<arg>-default_off\n<focus>Game')
        kb.config_manager.file_name = write_config(tmp_path, content)
        kb.update_focus_groups()
        kb.update_args_and_groups('', startup=False)
        assert VK_M in trigger_vks(kb)

    def test_default_off_does_not_change_always_active(self, kb_env_ns, tmp_path):
        # (c): -always_active semantics untouched - the flag lives on its own
        kb = kb_env_ns.kb
        load_and_activate(kb, tmp_path, CONFIG_OFF, 'Game')
        assert kb.arg_manager.DEFAULT_OFF is True
        assert kb.arg_manager.ALWAYS_ACTIVE is False
        kb.update_args_and_groups('', startup=False)
        assert kb.arg_manager.DEFAULT_OFF is False


class TestDefaultOffRegistration:
    def test_underscore_spelling_has_no_validator_warning(self):
        cm = Config_Manager()
        numbered = cm._combine_multilines_numbered(
            cm._clean_comments_numbered(CONFIG_OFF.splitlines(keepends=True)))
        assert Config_Validator().validate(numbered) == []

    def test_dashed_spelling_has_no_validator_warning(self):
        cm = Config_Manager()
        content = CONFIG_OFF.replace('-default_off', '-default-off')
        numbered = cm._combine_multilines_numbered(
            cm._clean_comments_numbered(content.splitlines(keepends=True)))
        assert Config_Validator().validate(numbered) == []

    def test_dashed_spelling_sets_the_flag(self, kb_env_ns):
        # U361 normalization: '-' == '_' in argument NAMES
        kb = kb_env_ns.kb
        kb.arg_manager.reset_global_variable_changes()
        kb.arg_manager.apply_start_arguments(['-default-off'])
        assert kb.arg_manager.DEFAULT_OFF is True
        kb.arg_manager.reset_global_variable_changes()
        assert kb.arg_manager.DEFAULT_OFF is False
