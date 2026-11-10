"""U402 (#402): macro vs rebind on the same trigger - the rebind wins.

Maintainer report (2026-11-09): with both a default-group macro on
-naga2 / +naga2 and a focus-group rebind 'naga2 : f' he saw the macro
always play and the rebind never apply. Ruling (maintainer 2026-11-10,
estate TODO #402): a rebind outranks a default-group macro on the same
trigger and the definition order must not matter; the macro still fires
when no rebind claims the trigger.

The filter's dispatch order (rebind loop before macro loop,
FST_Keyboard._win32_event_filter) already produces that precedence on
this tree - the 2026-09 repeat pin
test_filter_behavior.py::TestRebindRepeat::
test_rebind_and_macro_trigger_repeats_target_only_macro_never_fires
covers the repeat leg. This file closes the remaining matrix gap:
{rebind-only, macro-only, both} x {macro rows before rebind rows,
rebind rows before macro rows} at merged-line (presort) level, plus the
end-to-end default-section + focus-section merge of his exact shape.

Discrimination: with the rebind leg disabled in a scratch copy of
fst_keyboard.py the macro plays there and the 'both' rows go RED
(negative control, captured in the U402 worker summary) - the macro
genuinely claims the trigger; it loses only to rebind precedence.

Real FST_Keyboard with mocked pynput controllers - no live input.
"""
from unittest.mock import call

import pytest
from pynput import keyboard as pynput_keyboard

from fst_keyboard import FST_Keyboard

VK_NAGA2 = 125
VK_F = 0x46

ROW_MACRO_DOWN = ('', '-naga2::c')
ROW_MACRO_UP = ('', '+naga2::c')
ROW_REBIND = ('', 'naga2:f')

ROWS_MACRO_FIRST = [ROW_MACRO_DOWN, ROW_MACRO_UP, ROW_REBIND]
ROWS_REBIND_FIRST = [ROW_REBIND, ROW_MACRO_DOWN, ROW_MACRO_UP]

ROW_SETS = [ROWS_MACRO_FIRST, ROWS_REBIND_FIRST]


def _rows_subset(rows, keep_rebind, keep_macro):
    return [row for row in rows
            if (row == ROW_REBIND and keep_rebind)
            or (row != ROW_REBIND and keep_macro)]


def _presort(kb, rows):
    kb.config_manager.presort_lines(rows)
    kb.initialize_groups_from_presorted_lines()


def _pump(kb):
    kb._win32_event_filter(VK_NAGA2, 1000, True, False)
    kb._win32_event_filter(VK_NAGA2, 1020, False, False)


@pytest.fixture
def macro_playback(monkeypatch):
    """Record start_macro_playback aliases; returns the played list."""
    played = []
    monkeypatch.setattr(FST_Keyboard, 'start_macro_playback',
                        lambda self, alias, seq: played.append(alias))
    return played


class TestPrecedenceMatrix:
    """Presort-level matrix: merged-line order must not change the outcome."""

    @pytest.mark.parametrize('rows', ROW_SETS,
                             ids=['macro_rows_first', 'rebind_rows_first'])
    def test_rebind_only_sends_replacement(self, kb_env_ns, macro_playback, rows):
        kb = kb_env_ns.kb
        _presort(kb, _rows_subset(rows, keep_rebind=True, keep_macro=False))
        _pump(kb)
        code = pynput_keyboard.KeyCode.from_vk
        assert kb_env_ns.kb_mock.press.call_args_list == [call(code(VK_F))]
        assert kb_env_ns.kb_mock.release.call_args_list == [call(code(VK_F))]
        assert macro_playback == []

    @pytest.mark.parametrize('rows', ROW_SETS,
                             ids=['macro_rows_first', 'rebind_rows_first'])
    def test_macro_only_plays_macro(self, kb_env_ns, macro_playback, rows):
        kb = kb_env_ns.kb
        _presort(kb, _rows_subset(rows, keep_rebind=False, keep_macro=True))
        _pump(kb)
        # no rebind replacement was claimed, the macro fires on press AND release
        assert macro_playback == ['MAC_1', 'MAC_2']
        assert kb_env_ns.kb_mock.press.call_count == 0
        assert kb_env_ns.kb_mock.release.call_count == 0

    @pytest.mark.parametrize('rows', ROW_SETS,
                             ids=['macro_rows_first', 'rebind_rows_first'])
    def test_both_rebind_wins_macro_never_fires(self, kb_env_ns, macro_playback, rows):
        kb = kb_env_ns.kb
        _presort(kb, _rows_subset(rows, keep_rebind=True, keep_macro=True))
        # the trigger sits in BOTH registries (Key-expanded rebind = press+release)
        assert len(kb._rebinds_dict) == 2
        assert len(kb._macros_dict) == 2
        _pump(kb)
        code = pynput_keyboard.KeyCode.from_vk
        # ruling: the rebind output replaces both legs, the macro never plays
        assert kb_env_ns.kb_mock.press.call_args_list == [call(code(VK_F))]
        assert kb_env_ns.kb_mock.release.call_args_list == [call(code(VK_F))]
        assert macro_playback == []
        # both source events stay suppressed on the listener
        assert kb._listener.suppress_event.call_count == 2


class TestEndToFocusMerge:
    """His exact shape through the real pipeline: default-section macros
    (defined before) merged with a focus-section rebind by apply_focus_groups."""

    CONFIG = (
        "# default group: macros defined BEFORE the focus rebind\n"
        "-naga2 :: c\n"
        "+naga2 :: c\n"
        "\n"
        "<focus> notepad\n"
        "naga2 : f\n"
    )

    def test_default_macros_plus_focus_rebind(self, kb_env_ns, macro_playback,
                                              tmp_path):
        kb = kb_env_ns.kb
        cfg = tmp_path / 'FSTconfig.txt'
        cfg.write_text(self.CONFIG, encoding='utf-8')
        kb.config_manager.file_name = str(cfg)
        kb.update_focus_groups()
        kb.apply_focus_groups('notepad')
        # merge kept both: focus rebind + default macros are in the build
        assert len(kb._rebinds_dict) == 2
        assert len(kb._macros_dict) == 2
        _pump(kb)
        code = pynput_keyboard.KeyCode.from_vk
        assert kb_env_ns.kb_mock.press.call_args_list == [call(code(VK_F))]
        assert kb_env_ns.kb_mock.release.call_args_list == [call(code(VK_F))]
        assert macro_playback == []
