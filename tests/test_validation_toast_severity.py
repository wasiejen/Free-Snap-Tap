"""#400 - validation toast color reflects severity.

Maintainer request (inbox 2026-11-03_13-14_fst.md, curated to TODO #400): if
only warnings turn up on validation, the toast must turn YELLOW instead of
staying red - red keeps the serious report.

Three severity states, one color each (fst_keyboard.py, GUI mode only - the
headless leg prints):
  ERROR present      -> ConfigError -> surface_config_error   RED   200, 40, 40
  warnings only      -> surface_config_warning_report        YELLOW 200, 180, 0
  clean (no violation -> surface_config_ok                    GREEN  40, 150, 40

The yellow leg landed with U330 ask 1; this file pins the full severity trio
with a mocked toast bridge, so a future change to any one color fails loudly
and the warnings-only path can never regress to the error color.
"""
from unittest.mock import MagicMock

from fst_data_types import ConfigError
from fst_manager import Config_Manager, Config_Validator

RED = "rgba(200, 40, 40, 200)"
YELLOW = "rgba(200, 180, 0, 200)"
GREEN = "rgba(40, 150, 40, 200)"


def violations_of(content):
    cm = Config_Manager()
    numbered = cm._combine_multilines_numbered(
        cm._clean_comments_numbered(content.splitlines(keepends=True)))
    return Config_Validator().validate(numbered)


def toast_of(kb):
    """(text, bg, fg) of the single toast call - fails if not exactly one."""
    kb.toast_callback.assert_called_once()
    text, _duration, _size, bg, fg = kb.toast_callback.call_args.args
    return text, bg, fg


class TestSeverityColors:
    def test_error_leg_toast_is_red(self, kb_env_ns):
        kb = kb_env_ns.kb
        kb.toast_callback = MagicMock()
        kb.surface_config_error(ConfigError('bad key name', 'no_such_key'))
        text, bg, fg = toast_of(kb)
        assert 'bad key name' in text
        assert bg == RED
        assert fg == 'white'

    def test_warnings_only_leg_toast_is_yellow_not_red(self, kb_env_ns):
        kb = kb_env_ns.kb
        kb.toast_callback = MagicMock()
        warnings = [v for v in violations_of('<focus>Bad*Name\n')
                    if v.severity == Config_Validator.WARNING]
        assert warnings, 'fixture must produce warnings'
        kb.surface_config_warning_report(Config_Validator.format_report(warnings))
        text, bg, fg = toast_of(kb)
        assert 'warning' in text.lower()
        assert bg == YELLOW
        assert bg != RED, 'a warnings-only pass must never use the error color'

    def test_clean_leg_toast_is_green(self, kb_env_ns):
        kb = kb_env_ns.kb
        kb.toast_callback = MagicMock()
        assert violations_of('a, d\n') == []  # the clean premise
        kb.surface_config_ok()
        text, bg, fg = toast_of(kb)
        assert 'OK' in text
        assert bg == GREEN

    def test_the_three_severity_colors_are_distinct(self, kb_env_ns):
        # one color per state: a copy-paste of any one call's color into another
        # breaks this pin
        kb = kb_env_ns.kb
        colors = {}
        for name, action in (
                ('error', lambda: kb.surface_config_error(ConfigError('e', 'x'))),
                ('warning', lambda: kb.surface_config_warning_report('w report')),
                ('clean', kb.surface_config_ok)):
            kb.toast_callback = MagicMock()
            action()
            colors[name] = toast_of(kb)[1]
        assert colors == {'error': RED, 'warning': YELLOW, 'clean': GREEN}
        assert len(set(colors.values())) == 3


class TestValidatorDrivenSeverity:
    def test_validator_error_rises_to_a_red_config_error(self, kb_env_ns, tmp_path):
        # the real validator leg: an ERROR raises ConfigError, which is the
        # payload the red toast surfaces (the yellow report never sees an error)
        kb = kb_env_ns.kb
        kb.toast_callback = MagicMock()
        path = tmp_path / 'config.txt'
        path.write_text('b : c, d\n<focus>Bad*Name\n')
        kb.config_manager.file_name = str(path)
        raised = None
        try:
            kb.config_manager.load_config()
        except ConfigError as error:
            raised = error
        assert raised is not None
        kb.surface_config_error(raised)
        _text, bg, _fg = toast_of(kb)
        assert bg == RED

    def test_validator_warnings_only_report_never_rasises(self, kb_env_ns, tmp_path):
        path = tmp_path / 'config.txt'
        path.write_text('<focus>Bad*Name\na, d\n')
        cm = Config_Manager(str(path))
        cm.load_config()  # no raise
        assert cm.config_warnings and not any(
            v.severity == Config_Validator.ERROR for v in cm.config_warnings)
