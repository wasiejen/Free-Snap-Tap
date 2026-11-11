"""#418 - the approved `-default_on` focus argument (per-group re-enable of
the default-group merge), twin of the shipped `-default_off` (U403/#403).

Ruling (maintainer 2026-11-11, estate TODO #418): -default_on mirrors
-default_off; usable when -default_always_active is NOT set; enables
default-group addition FOR that focus group. Leg-1 reconciliation table
(U418 worker summary): the shipped merge-by-default precedence is kept
(no flip of the live-accepted #403 cells S1-S4/S6); the new cells are
S5 (global -default_off + group -default_on -> MERGE), S7 (group has
both flags -> SUPPRESS, off wins, WARNING) and S8 (-default_on +
-default_always_active effective in the group -> WARNING that names the
two different semantics; ALWAYS_ACTIVE behavior UNTOUCHED).

RED-before (re-captured against the pre-U418 tree via `git archive 0ee5daa`
into scratch - $TMP/opencode/fst418/red2.log): 9 new-behavior pins FAIL on
the pre-U418 tree (-default_on is an unknown argument -> validator warning
and the merge stays suppressed; the interaction warnings do not exist).
The shipped-behavior controls (S1, S4), the two S7 merge-outcomes (the
group's own -default_off suppresses even pre-fix), the ALWAYS_ACTIVE
control and the parser same-pass pin are green before AND after - they
guard the ruling's no-flip boundary. The two -no_warnings suppression pins
are vacuous pre-fix (the warning they suppress did not exist; the
unknown-arg warning they carry is itself suppressed by the same flag) -
the warning EXISTENCE pins are the s7/s8 warn pins.
"""
from fst_manager import Config_Manager, Config_Validator
from vk_codes import vk_codes_dict

VK_M = vk_codes_dict['m']
VK_Q = vk_codes_dict['q']

# S1: shipped merge-by-default (control)
CONFIG_BASE = """m : n
<focus>Game
q : e
"""

# S4: shipped global suppression, plain group (control - live-accepted #403)
CONFIG_GLOBAL_OFF = """m : n
<arg>-default_off
<focus>Game
q : e
"""

# S5: THE FIX - global off, this group re-enables
CONFIG_GLOBAL_OFF_GROUP_ON = """m : n
<arg>-default_off
<focus>Game
<arg>-default_on
q : e
"""

# S2: redundant -default_on with the default already on
CONFIG_GROUP_ON_DEFAULT_ON = """m : n
<focus>Game
<arg>-default_on
q : e
"""

# S7: both flags in ONE group section -> off wins, warn
CONFIG_GROUP_ON_AND_OFF = """m : n
<focus>Game
<arg>-default_on
<arg>-default_off
q : e
"""

# S8: -default_on alongside -default_always_active in the group section
CONFIG_GROUP_ON_ALWAYS_ACTIVE = """m : n
<focus>Game
<arg>-default_always_active
<arg>-default_on
q : e
"""


def write_config(tmp_path, content):
    path = tmp_path / 'config.txt'
    path.write_text(content)
    return str(path)


def trigger_vks(kb):
    return {t.get_trigger().vk_code for t in kb._rebind_triggers}


def load_and_activate(kb, tmp_path, content, focus_name):
    kb.config_manager.file_name = write_config(tmp_path, content)
    kb.update_focus_groups()
    kb.update_args_and_groups(focus_name, startup=False)


def validate(content):
    cm = Config_Manager()
    numbered = cm._combine_multilines_numbered(
        cm._clean_comments_numbered(content.splitlines(keepends=True)))
    return Config_Validator().validate(numbered)


class TestShippedBoundary:
    """No-flip controls (green before AND after U418)."""

    def test_s1_plain_group_merges_default_lines(self, kb_env_ns, tmp_path):
        kb = kb_env_ns.kb
        load_and_activate(kb, tmp_path, CONFIG_BASE, 'Game')
        assert trigger_vks(kb) == {VK_M, VK_Q}

    def test_s4_global_off_plain_group_stays_suppressed(self, kb_env_ns, tmp_path):
        kb = kb_env_ns.kb
        load_and_activate(kb, tmp_path, CONFIG_GLOBAL_OFF, 'Game')
        assert trigger_vks(kb) == {VK_Q}
        assert kb.arg_manager.DEFAULT_OFF is True


class TestDefaultOnBehavior:
    """The new cells (RED before the arg exists)."""

    def test_s5_group_default_on_reenables_against_global_off(self, kb_env_ns, tmp_path):
        # RED before: -default_on unknown -> still suppressed
        kb = kb_env_ns.kb
        load_and_activate(kb, tmp_path, CONFIG_GLOBAL_OFF_GROUP_ON, 'Game')
        assert trigger_vks(kb) == {VK_M, VK_Q}
        assert kb.arg_manager.DEFAULT_OFF is False

    def test_s5_intended_combination_has_no_validator_warning(self):
        # global -default_off + group -default_on is the DESIGNED pair
        assert validate(CONFIG_GLOBAL_OFF_GROUP_ON) == []

    def test_s2_redundant_default_on_merges_and_stays_silent(self, kb_env_ns, tmp_path):
        kb = kb_env_ns.kb
        load_and_activate(kb, tmp_path, CONFIG_GROUP_ON_DEFAULT_ON, 'Game')
        assert trigger_vks(kb) == {VK_M, VK_Q}
        assert validate(CONFIG_GROUP_ON_DEFAULT_ON) == []

    def test_s7_off_wins_over_on_in_same_group(self, kb_env_ns, tmp_path):
        kb = kb_env_ns.kb
        load_and_activate(kb, tmp_path, CONFIG_GROUP_ON_AND_OFF, 'Game')
        assert trigger_vks(kb) == {VK_Q}

    def test_s7_off_wins_regardless_of_arg_order(self, kb_env_ns, tmp_path):
        kb = kb_env_ns.kb
        flipped = (CONFIG_GROUP_ON_AND_OFF
                   .replace('<arg>-default_on\n<arg>-default_off',
                            '<arg>-default_off\n<arg>-default_on'))
        load_and_activate(kb, tmp_path, flipped, 'Game')
        assert trigger_vks(kb) == {VK_Q}

    def test_s7_both_flags_warn_names_off_wins(self):
        # RED before: only the unknown-arg warning exists (no 'wins' text)
        warns = [v for v in validate(CONFIG_GROUP_ON_AND_OFF)
                 if v.severity == Config_Validator.WARNING]
        assert any('wins' in v.message for v in warns)

    def test_s8_on_alongside_always_active_warns_and_names_difference(self):
        warns = [v for v in validate(CONFIG_GROUP_ON_ALWAYS_ACTIVE)
                 if v.severity == Config_Validator.WARNING]
        # RED before: only the unknown-arg warning exists (no always_active text)
        assert any('always_active' in v.message for v in warns)

    def test_s8_always_active_control_still_applies(self, kb_env_ns, tmp_path):
        # the ALWAYS_ACTIVE flag itself stays live (controls unchanged)
        kb = kb_env_ns.kb
        load_and_activate(kb, tmp_path, CONFIG_GROUP_ON_ALWAYS_ACTIVE, 'Game')
        assert kb.arg_manager.ALWAYS_ACTIVE is True

    def test_s9_dashed_twin_sets_the_flag(self, kb_env_ns):
        # U361 normalization: '-' == '_' in argument NAMES
        kb = kb_env_ns.kb
        kb.arg_manager.reset_global_variable_changes()
        kb.arg_manager.apply_start_arguments(['-default_off'])
        assert kb.arg_manager.DEFAULT_OFF is True
        kb.arg_manager.apply_start_arguments(['-default-on'])
        assert kb.arg_manager.DEFAULT_OFF is False
        kb.arg_manager.reset_global_variable_changes()

    def test_s9_dashed_twin_has_no_validator_warning(self):
        content = CONFIG_GLOBAL_OFF_GROUP_ON.replace('-default_on', '-default-on')
        assert validate(content) == []


class TestDefaultOnParserPrecedence:
    """Same-apply-pass precedence: -default_off wins over -default_on."""

    def test_off_wins_within_one_apply_pass(self, kb_env_ns):
        kb = kb_env_ns.kb
        kb.arg_manager.reset_global_variable_changes()
        kb.arg_manager.apply_start_arguments(['-default_on', '-default_off'])
        assert kb.arg_manager.DEFAULT_OFF is True
        kb.arg_manager.apply_start_arguments(['-default_off', '-default_on'])
        assert kb.arg_manager.DEFAULT_OFF is True
        kb.arg_manager.reset_global_variable_changes()

    def test_on_clears_default_off_in_a_later_pass(self, kb_env_ns):
        # the group's args pass runs after the default section's args pass -
        # exactly the S5 override path
        kb = kb_env_ns.kb
        kb.arg_manager.reset_global_variable_changes()
        kb.arg_manager.apply_start_arguments(['-default_off'])
        assert kb.arg_manager.DEFAULT_OFF is True
        kb.arg_manager.apply_start_arguments(['-default_on'])
        assert kb.arg_manager.DEFAULT_OFF is False
        kb.arg_manager.reset_global_variable_changes()

    def test_s10_command_line_default_off_group_on_reenables(self, kb_env_ns, tmp_path):
        # precedence chain sys-args < default-section < focus-section:
        # a command-line -default_off is a global like the default section's
        kb = kb_env_ns.kb
        kb.set_sys_start_arguments(['-default_off'])
        try:
            load_and_activate(kb, tmp_path, CONFIG_GROUP_ON_DEFAULT_ON, 'Game')
            assert trigger_vks(kb) == {VK_M, VK_Q}
        finally:
            kb.set_sys_start_arguments([])


class TestInteractionWarningSuppressibility:
    """#418 warnings are WARNING severity -> a section's -no_warnings
    silences them (U290T/U330 machinery; reviewer P2-5 pin)."""

    def test_no_warnings_silences_s7_off_wins_warning(self):
        content = CONFIG_GROUP_ON_AND_OFF.replace('<arg>-default_on',
                                                  '<arg>-no_warnings\n<arg>-default_on')
        assert validate(content) == []

    def test_no_warnings_silences_s8_always_active_warning(self):
        content = CONFIG_GROUP_ON_ALWAYS_ACTIVE.replace(
            '<arg>-default_always_active',
            '<arg>-no_warnings\n<arg>-default_always_active')
        assert validate(content) == []
