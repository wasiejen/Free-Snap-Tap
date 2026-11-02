"""U69: Config_Validator - one pin per violation class, the silent-drop case,
the consolidated report, and the reload/startup wiring."""
import pytest

from fst_data_types import ConfigError
from fst_manager import Config_Manager, Config_Validator


def violations_of(content):
    """violations of the cleaned lines, as the validator sees them"""
    cm = Config_Manager()
    numbered = cm._combine_multilines_numbered(
        cm._clean_comments_numbered(content.splitlines(keepends=True)))
    return Config_Validator().validate(numbered)


def errors_of(content):
    return [v for v in violations_of(content) if v.severity == Config_Validator.ERROR]


def warnings_of(content):
    return [v for v in violations_of(content) if v.severity == Config_Validator.WARNING]


def write_config(tmp_path, content):
    path = tmp_path / 'config.txt'
    path.write_text(content)
    return str(path)


VALID_CONFIG = """\
<arg>-tapdelay=8,2
a, d

<focus>Counter
<arg>-nomenu
<scan> v, -shift
(macro) -x :: <scan>, +x|(tr("+x")>100)
(seq) -y :: a, b : c, d
"""


class TestValidConfig:
    def test_valid_config_has_no_violations(self):
        assert violations_of(VALID_CONFIG) == []

    def test_real_config_loads_unchanged(self):
        from pathlib import Path
        cfg = Path(__file__).resolve().parents[1] / 'FSTconfig.txt'
        if not cfg.exists():
            pytest.skip('real config not present')
        cm = Config_Manager(str(cfg))
        assert cm.load_config() is not None
        assert cm.config_warnings == []


class TestArityRule:
    def test_rebind_with_two_replacement_keys_is_error(self):
        violations = errors_of('a : b, c\n')
        assert len(violations) == 1
        assert violations[0].rule == 'arity'
        assert violations[0].line == 1
        assert '::' in violations[0].message

    def test_replacement_commas_inside_parens_stay_one_key(self):
        assert errors_of("-mx1 : -mx1|(set('last',1))\n") == []

    def test_single_key_tap_group_is_warning(self):
        violations = warnings_of('q\n')
        assert len(violations) == 1
        assert violations[0].rule == 'arity'
        assert '2 or more keys' in violations[0].message
        # the config line reference (the report prefix "line N" carries it)
        assert violations[0].line == 1
        assert warnings_of('<focus>G\nq\n')[0].line == 2

    def test_macro_sequence_needing_two_key_groups_is_error(self):
        assert errors_of('(seq) x :: : a\n') == []  # empty middle group: valid macro
        violations = errors_of('(seq) x :: a : b\n')
        assert violations == []  # two key groups: valid sequence


class TestShapeRule:
    def test_modifier_in_tap_group_is_error(self):
        violations = errors_of('-a, d\n')
        assert len(violations) == 1
        assert violations[0].rule == 'shape'

    def test_delay_suffix_in_tap_group_is_error(self):
        violations = errors_of('a|10, d\n')
        assert len(violations) == 1
        assert violations[0].rule == 'shape'

    def test_rebind_without_trigger_is_error(self):
        violations = errors_of('(m) : b\n')
        assert len(violations) == 1
        assert violations[0].rule == 'shape'


class TestVkRule:
    def test_unknown_key_is_error(self):
        violations = errors_of('a, no_such_key\n')
        assert len(violations) == 1
        assert violations[0].rule == 'vk'
        assert 'no_such_key' in violations[0].message

    def test_mouse_and_naga_keys_are_valid(self):
        assert errors_of('naga1 : mm\n') == []

    def test_vk_number_keys_are_valid(self):
        assert errors_of('a, 65\n') == []


class TestAliasRule:
    def test_undefined_alias_is_error(self):
        violations = errors_of('(m) -x :: <missing>\n')
        assert len(violations) == 1
        assert violations[0].rule == 'alias'
        assert '<missing>' in violations[0].message

    def test_alias_defined_in_default_section_is_usable_in_focus(self):
        assert errors_of('<scan> v\n\n<focus>Game\n(m) -x :: <scan>\n') == []

    def test_alias_defined_in_focus_not_usable_in_default_section(self):
        violations = errors_of('(m) -x :: <later>\n\n<focus>Game\n<later> v\n')
        assert len(violations) == 1
        assert violations[0].rule == 'alias'

    def test_alias_reference_in_repeat_call_is_checked(self):
        violations = errors_of("-a :: _|(start_repeat('<nope>',100))\n")
        assert len(violations) == 1
        assert violations[0].rule == 'alias'

    def test_invalid_alias_name_is_error(self):
        violations = errors_of('<bad name> a, b\n')
        assert len(violations) == 1
        assert violations[0].rule == 'alias'


class TestFocusRule:
    def test_empty_focus_name_is_error(self):
        violations = errors_of('<focus>\n')
        assert len(violations) == 1
        assert violations[0].rule == 'focus'

    def test_stripped_focus_characters_are_warning(self):
        violations = warnings_of('<focus>Half-Life\n')
        assert len(violations) == 1
        assert violations[0].rule == 'focus'
        assert 'Half-Life' in violations[0].message
        # the warning names the removed character
        assert "(removed: '-')" in violations[0].message
        multi = warnings_of('<focus>Foo*Bar?Baz\n')
        assert "(removed: '*?')" in multi[0].message


class TestArgRule:
    def test_unknown_start_argument_is_warning(self):
        violations = warnings_of('<arg>-zz\n')
        assert len(violations) == 1
        assert violations[0].rule == 'arg'
        assert '-zz' in violations[0].message

    def test_non_numeric_delay_is_error(self):
        violations = errors_of('<arg>-tapdelay=abc\n')
        assert len(violations) == 1
        assert violations[0].rule == 'arg'

    def test_delay_out_of_range_is_error(self):
        violations = errors_of('<arg>-macrodelay=5000\n')
        assert len(violations) == 1
        assert violations[0].rule == 'arg'

    def test_flag_argument_with_value_is_error(self):
        violations = errors_of('<arg>-nomenu=1\n')
        assert len(violations) == 1
        assert violations[0].rule == 'arg'

    def test_removed_focusapp_argument_is_error(self):
        violations = errors_of('<arg>-focusapp=cs2\n')
        assert len(violations) == 1
        assert violations[0].rule == 'arg'

    def test_valueless_flag_is_valid(self):
        assert errors_of('<arg>-crosshair\n<arg>-status_indicator=10\n') == []


class TestConstraintRule:
    def test_unknown_function_is_warning(self):
        violations = warnings_of('(m) -a :: b|(no_such_fn(1))\n')
        assert len(violations) == 1
        assert violations[0].rule == 'constraint'
        assert 'no_such_fn' in violations[0].message

    def test_known_function_wrong_arity_is_error(self):
        violations = errors_of('(m) -a :: b|(tr("a",1))\n')
        assert len(violations) == 1
        assert violations[0].rule == 'constraint'

    def test_unbalanced_parentheses_in_group_is_error(self):
        violations = errors_of('(m) -a :: b|(tr("a")\n')
        assert len(violations) == 1
        assert violations[0].rule == 'parens'
        assert 'unbalanced' in violations[0].message
        assert 'dropped' in violations[0].message

    def test_unbalanced_parentheses_in_constraint_is_error(self):
        violations = errors_of('(m) -a :: b|(x)y\n')
        assert len(violations) == 1
        assert violations[0].rule == 'constraint'
        assert 'unbalanced' in violations[0].message

    def test_invalid_expression_shape_is_error(self):
        violations = errors_of('(m) -a :: b|(tr("a") >)\n')
        assert len(violations) == 1
        assert violations[0].rule == 'constraint'

    def test_non_numeric_delay_suffix_is_error(self):
        violations = errors_of('(m) -a|-ke2 :: b\n')
        assert len(violations) == 1
        assert violations[0].rule == 'constraint'

    def test_python_builtins_and_bare_names_are_accepted(self):
        content = ('(m) -a :: b|(pow(2,3))\n'
                   '(n) -c :: d|(aiming)\n'
                   '(o) -e :: f|()|(!)|(False)\n')
        assert errors_of(content) == []

    def test_datetime_attribute_chain_is_accepted(self):
        # the maintainer's date line (feedback_fst-observations 2026-11-02):
        # the datetime.* chain is whitelisted, no unknown-function warning
        content = '(m) -x :: b|(write(datetime.datetime.now().strftime("%Y-%m-%d_%H-%M")))\n'
        assert violations_of(content) == []
        assert 'strftime' not in str(violations_of(content))


class TestDroppedLineRule:
    def test_line_with_non_empty_middle_group_is_reported(self):
        violations = errors_of('(x) a : b : c\n')
        assert len(violations) == 1
        assert violations[0].rule == 'dropped'
        assert violations[0].line == 1

    def test_dropped_line_survives_as_config_error(self, tmp_path):
        path = write_config(tmp_path, 'a, d\n\n<focus>Game\n(x) a : b : c\n')
        with pytest.raises(ConfigError) as excinfo:
            Config_Manager(path).load_config()
        assert 'line 4' in excinfo.value.reason
        assert 'dropped' in excinfo.value.reason


class TestConsolidatedReport:
    def test_load_config_raises_one_report_with_all_violations(self, tmp_path):
        content = """\
a, no_such_key
q
b : c, d
<focus>Half-Life
"""
        path = write_config(tmp_path, content)
        with pytest.raises(ConfigError) as excinfo:
            Config_Manager(path).load_config()
        report = excinfo.value.reason
        assert report.startswith('4 config violation(s) (2 error(s), 2 warning(s)):')
        for number in ('line 1', 'line 2', 'line 3', 'line 4'):
            assert number in report
        assert 'vk' in report and 'arity' in report and 'focus' in report

    def test_warnings_only_config_loads_and_stores_warnings(self, tmp_path):
        path = write_config(tmp_path, '<focus>Half-Life\n')
        cm = Config_Manager(path)
        multi_focus, _, _ = cm.load_config()
        assert 'HalfLife' in multi_focus
        assert len(cm.config_warnings) == 1


class TestReloadWiring:
    def test_reload_surfaces_error_config_as_config_error(self, kb_env_ns, tmp_path):
        kb = kb_env_ns.kb
        kb.config_manager.file_name = write_config(tmp_path, 'a, no_such_key\n')
        with pytest.raises(ConfigError):
            kb.reload_from_file()

    def test_reload_surfaces_warnings_on_console(self, kb_env_ns, tmp_path, capsys):
        kb = kb_env_ns.kb
        assert kb.toast_callback is None
        kb.config_manager.file_name = write_config(tmp_path, '<focus>Half-Life\n')
        kb.reload_from_file()
        out = capsys.readouterr().out
        assert 'FST config error' in out
        assert 'warning' in out

    def test_reload_surfaces_warnings_as_toast_in_gui_mode(self, kb_env_ns, tmp_path):
        from unittest.mock import MagicMock
        kb = kb_env_ns.kb
        kb.toast_callback = MagicMock()
        kb.config_manager.file_name = write_config(tmp_path, '<focus>Half-Life\n')
        kb.reload_from_file()
        kb.toast_callback.assert_called_once()
        assert 'warning' in kb.toast_callback.call_args.args[0]


class TestComplianceResultToast:
    """U290T(3): a reload of a clean config emits exactly one green OK
    toast; the warnings-only reload keeps its single report toast."""

    def test_reload_clean_config_emits_ok_toast(self, kb_env_ns, tmp_path):
        from unittest.mock import MagicMock
        kb = kb_env_ns.kb
        kb.toast_callback = MagicMock()
        kb.config_manager.file_name = write_config(tmp_path, 'a, d\n')
        kb.reload_from_file()
        kb.toast_callback.assert_called_once_with(
            "[FST] config OK - reload valid", 3, 12,
            "rgba(40, 150, 40, 200)", "white")

    def test_reload_clean_config_ok_on_console(self, kb_env_ns, tmp_path, capsys):
        kb = kb_env_ns.kb
        assert kb.toast_callback is None
        kb.config_manager.file_name = write_config(tmp_path, 'a, d\n')
        kb.reload_from_file()
        out = capsys.readouterr().out
        assert 'config OK' in out

    def test_warnings_only_reload_keeps_single_toast(self, kb_env_ns, tmp_path):
        from unittest.mock import MagicMock
        kb = kb_env_ns.kb
        kb.toast_callback = MagicMock()
        kb.config_manager.file_name = write_config(tmp_path, '<focus>Half-Life\n')
        kb.reload_from_file()
        # the warning report toast is THE result toast - no OK on warnings
        kb.toast_callback.assert_called_once()

    def test_startup_warnings_re_surface_as_report_toast(self, kb_env_ns, tmp_path):
        # U290R: the GUI startup load runs BEFORE the toast bridge is wired,
        # so its warning report went console-only; the startup branch
        # re-surfaces the stored warnings through the bridge
        from unittest.mock import MagicMock
        import free_snap_tap
        kb = kb_env_ns.kb
        kb.config_manager.file_name = write_config(tmp_path, '<focus>Half-Life\n')
        kb.reload_from_file()  # no bridge yet: console leg, warnings stored
        kb.toast_callback = MagicMock()  # the bridge, wired after the load
        free_snap_tap.surface_startup_config_result(kb)
        kb.toast_callback.assert_called_once()
        assert 'warning' in kb.toast_callback.call_args.args[0]

    def test_startup_clean_pass_gets_ok_toast(self, kb_env_ns, tmp_path):
        from unittest.mock import MagicMock
        import free_snap_tap
        kb = kb_env_ns.kb
        kb.config_manager.file_name = write_config(tmp_path, 'a, d\n')
        kb.reload_from_file()
        kb.toast_callback = MagicMock()
        free_snap_tap.surface_startup_config_result(kb)
        kb.toast_callback.assert_called_once_with(
            "[FST] config OK - reload valid", 3, 12,
            "rgba(40, 150, 40, 200)", "white")


class TestCheckSuppressionAndDefaultAlwaysActiveArgs:
    """U290T(3): config-line options - validator accepts both new flags
    without an unknown-arg warning; -no_warnings drops the WARNING
    violations of its section (default scope counts as a section) and
    never the ERROR severity; -default_always_active is a plain flag."""

    def test_flags_accepted_without_unknown_arg_warning(self):
        content = ('<focus>Game\n'
                   '<arg>-no_warnings\n'
                   '<arg>-default_always_active\n')
        assert violations_of(content) == []

    def test_suppresses_warnings_in_default_scope(self):
        content = '<arg>-no_warnings\n<focus>Half-Life\n'
        assert warnings_of(content) == []

    def test_suppresses_warnings_in_its_section(self):
        content = '<focus>Game\n<arg>-no_warnings\n<focus>Half-Life\n'
        assert warnings_of(content) == []

    def test_other_sections_keep_their_warnings(self):
        content = ('<focus>Game\n<arg>-no_warnings\n'
                   '<focus>Other\n<focus>Half-Life\n')
        warnings = warnings_of(content)
        assert len(warnings) == 1
        assert warnings[0].scope == 'Other'

    def test_errors_in_suppressed_section_stay(self):
        content = '<focus>Game\n<arg>-no_warnings\na, no_such_key\n'
        assert len(errors_of(content)) == 1

    def test_load_with_suppression_yields_no_stored_warnings(self, tmp_path):
        path = write_config(tmp_path, '<arg>-no_warnings\n<focus>Half-Life\n')
        cm = Config_Manager(path)
        cm.load_config()
        assert cm.config_warnings == []
