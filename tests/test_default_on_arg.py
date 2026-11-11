"""#423 - retirement of `-default_on` (shipped the same morning in 321a893).

Settled model (maintainer 2026-11-11, estate TODO #418 resolution + #423):
the default group IS merged into every focus group; `-default_off` is the
ONLY opt-out; `-default_on` has no valid function. He has no configs
using it - zero migration cost.

Retirement: `-default_on` / `-default-on` present -> WARNING naming the
settled model (validator for config sections, print for start args);
the flag changes NOTHING at runtime (no merge lane).

RED-before on the current tree (321a893, log
$TMP/opencode/fst423/red.log): 6 of 10 pins FAIL there - the flag is a
SILENT KNOWN argument (all four warning-lane pins RED) and it toggles
the merge (the U418 S5 lane: test_retired_flag_does_not_reenable_the_merge
AND test_retired_flag_alongside_off_still_suppresses are both
discriminating, not controls). The two -no_warnings suppression pins
pass VACUOUSLY pre-fix (the flag was known and silent, so the config had
zero violations to silence) - the warning EXISTENCE pins are the
non-vacuous ones. Controls green before AND after: global-off
plain-group suppression, no-flag silent config, ALWAYS_ACTIVE still
applies.

DELETED pins (they no longer describe the model, listed per spec #423;
15 tests at 321a893 -> 10 now): the S5 re-enable merge pins, the S2
silent-redundant merge pin, the S7 off-wins pins (runtime order pairs +
validator warning), the parser pass-precedence lane (both tests), the
S10 sys-args re-enable pin, the S7/S8 interaction-warning
suppressibility pins, the dashed-twin sets-the-flag pin, the dashed
no-warning pin, the S8 always_active pair warning, and the
S1 plain-group merge control (its coverage lives on at
test_default_off_arg.py TestDefaultOffBehavior::
test_without_default_off_default_lines_stay_merged).
"""
from fst_manager import Config_Manager, Config_Validator
from vk_codes import vk_codes_dict

VK_M = vk_codes_dict['m']
VK_Q = vk_codes_dict['q']

# the settled model's opt-out (shipped #403, unchanged here)
CONFIG_GLOBAL_OFF = """m : n
<arg>-default_off
<focus>Game
q : e
"""

# retired flag alongside the global off -> merge stays SUPPRESSED
CONFIG_OFF_GROUP_ON = """m : n
<arg>-default_off
<focus>Game
<arg>-default_on
q : e
"""

# retired flag with the default merge already on -> merge unchanged
CONFIG_GROUP_ON_PLAIN = """m : n
<focus>Game
<arg>-default_on
q : e
"""

# retired flag + the focus-loss flag -> only the retirement warning
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


def retired_warnings(violations):
    return [v for v in violations
            if v.severity == Config_Validator.WARNING
            and 'retired' in v.message and 'default_off' in v.message]


class TestRetiredFlagWarns:
    def test_flag_present_warns_naming_the_settled_model(self):
        # RED before: the flag is a silent known argument -> no warning
        assert len(retired_warnings(validate(CONFIG_GROUP_ON_PLAIN))) == 1

    def test_dashed_twin_warns_the_same(self):
        content = CONFIG_GROUP_ON_PLAIN.replace('-default_on', '-default-on')
        assert len(retired_warnings(validate(content))) == 1

    def test_always_active_pair_warns_only_retirement(self):
        # the U418 always_active pair-warning is gone with the feature;
        # only the retirement warning remains
        violations = validate(CONFIG_GROUP_ON_ALWAYS_ACTIVE)
        warns = [v for v in violations if v.severity == Config_Validator.WARNING]
        assert len(retired_warnings(violations)) == 1
        assert len(warns) == 1

    def test_no_warnings_silences_the_retirement_warning(self):
        content = CONFIG_GROUP_ON_PLAIN.replace(
            '<arg>-default_on', '<arg>-no_warnings\n<arg>-default_on')
        assert validate(content) == []

    def test_config_without_the_flag_stays_silent(self):
        assert validate(CONFIG_GLOBAL_OFF) == []

    def test_value_form_stays_unknown_in_both_lanes(self):
        # reviewer P2-4: '-default_on=1' must not get a different verdict
        # per lane - validator reports it unknown (like the parser does),
        # NOT the retirement WARNING
        content = CONFIG_GROUP_ON_PLAIN.replace('-default_on', '-default_on=1')
        violations = validate(content)
        assert retired_warnings(violations) == []
        assert any(v.severity == Config_Validator.WARNING
                   and 'unknown start argument' in v.message
                   for v in violations)


class TestRetiredFlagInert:
    def test_merge_still_happens_with_the_flag_present(self, kb_env_ns, tmp_path):
        # spec #423 positive leg (reviewer P1): retired flag does not
        # suppress - the default merge happens as in the settled model
        kb = kb_env_ns.kb
        load_and_activate(kb, tmp_path, CONFIG_GROUP_ON_PLAIN, 'Game')
        assert trigger_vks(kb) == {VK_M, VK_Q}
        assert kb.arg_manager.DEFAULT_OFF is False

    def test_global_off_still_suppresses_plain_group(self, kb_env_ns, tmp_path):
        # settled-model control (green before AND after)
        kb = kb_env_ns.kb
        load_and_activate(kb, tmp_path, CONFIG_GLOBAL_OFF, 'Game')
        assert trigger_vks(kb) == {VK_Q}

    def test_retired_flag_does_not_reenable_the_merge(self, kb_env_ns, tmp_path):
        # RED before: U418 S5 lane merges; retired, the group stays off
        kb = kb_env_ns.kb
        load_and_activate(kb, tmp_path, CONFIG_OFF_GROUP_ON, 'Game')
        assert trigger_vks(kb) == {VK_Q}
        assert kb.arg_manager.DEFAULT_OFF is True

    def test_retired_flag_alongside_off_still_suppresses(self, kb_env_ns, tmp_path):
        # discriminating pre-fix (RED there): U418 applied -default_off then
        # the group's last-pass -default_on -> merged; retired, suppression stands
        content = CONFIG_OFF_GROUP_ON.replace(
            '<arg>-default_off', '<arg>-default_off\n<arg>-default_on')
        kb = kb_env_ns.kb
        load_and_activate(kb, tmp_path, content, 'Game')
        assert trigger_vks(kb) == {VK_Q}

    def test_parser_level_flag_no_longer_clears_default_off(self, kb_env_ns):
        # RED before: apply(['-default_on']) cleared DEFAULT_OFF
        kb = kb_env_ns.kb
        kb.arg_manager.reset_global_variable_changes()
        try:
            kb.arg_manager.apply_start_arguments(['-default_off'])
            assert kb.arg_manager.DEFAULT_OFF is True
            kb.arg_manager.apply_start_arguments(['-default_on'])
            assert kb.arg_manager.DEFAULT_OFF is True
        finally:
            kb.arg_manager.reset_global_variable_changes()

    def test_always_active_control_still_applies(self, kb_env_ns, tmp_path):
        # ALWAYS_ACTIVE runtime behavior untouched by the retirement
        kb = kb_env_ns.kb
        load_and_activate(kb, tmp_path, CONFIG_GROUP_ON_ALWAYS_ACTIVE, 'Game')
        assert kb.arg_manager.ALWAYS_ACTIVE is True
