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
covers the repeat leg. This file closes the remaining gap. The
definition-order axis is pinned where it can matter: the BOTH case at
merged-line (presort) level for {macro rows before rebind rows, rebind
rows before macro rows}, plus BOTH end-to-end section placements of his
shape (default macros + focus rebind, and flipped default rebind +
focus macros). The single-registry controls (rebind-only, macro-only)
hold one row type each - no order axis - so they run once, as controls
that the trigger really fires the macro when unclaimed and the rebind
alone replaces it.

Discrimination (negative control, log in the U402 worker summary):
disabling the rebind leg ('if False and is_trigger_activated(...)' at
the REBINDS HANDLING loop) in a scratch copy of fst_keyboard.py reddens
every both-registries pin WITH the macros playing (['MAC_1', 'MAC_2'])
- the macro genuinely claims this trigger; only the rebind leg ahead of
the macro loop keeps it silent.

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


def _presort(kb, rows):
    kb.config_manager.presort_lines(rows)
    kb.initialize_groups_from_presorted_lines()


def _pump(kb):
    kb._win32_event_filter(VK_NAGA2, 1000, True, False)
    kb._win32_event_filter(VK_NAGA2, 1020, False, False)


def _load_config(kb, tmp_path, text):
    cfg = tmp_path / 'FSTconfig.txt'
    cfg.write_text(text, encoding='utf-8')
    kb.config_manager.file_name = str(cfg)
    kb.update_focus_groups()
    kb.apply_focus_groups('notepad')


@pytest.fixture
def macro_playback(monkeypatch):
    """Record start_macro_playback aliases; returns the played list."""
    played = []
    monkeypatch.setattr(FST_Keyboard, 'start_macro_playback',
                        lambda self, alias, seq: played.append(alias))
    return played


class TestPrecedenceMatrix:
    """Presort-level pins on the merged-line list."""

    def test_rebind_only_sends_replacement(self, kb_env_ns, macro_playback):
        # control, one row type: no definition-order axis
        kb = kb_env_ns.kb
        _presort(kb, [ROW_REBIND])
        _pump(kb)
        code = pynput_keyboard.KeyCode.from_vk
        assert kb_env_ns.kb_mock.press.call_args_list == [call(code(VK_F))]
        assert kb_env_ns.kb_mock.release.call_args_list == [call(code(VK_F))]
        assert macro_playback == []

    def test_macro_only_plays_macro(self, kb_env_ns, macro_playback):
        # control, one row type: the macro fires when no rebind claims it
        kb = kb_env_ns.kb
        _presort(kb, [ROW_MACRO_DOWN, ROW_MACRO_UP])
        # aliases derived from the build (no hard-coded scheme): each macro
        # on this trigger plays exactly once, press leg then release leg
        expected = [m.alias for m in kb._macros_dict.values()]
        assert len(expected) == 2
        _pump(kb)
        assert macro_playback == expected
        assert kb_env_ns.kb_mock.press.call_count == 0
        assert kb_env_ns.kb_mock.release.call_count == 0

    @pytest.mark.parametrize('rows', [ROWS_MACRO_FIRST, ROWS_REBIND_FIRST],
                             ids=['macro_rows_first', 'rebind_rows_first'])
    def test_both_rebind_wins_macro_never_fires(self, kb_env_ns, macro_playback, rows):
        # the definition-order axis lives here: same rows, two orders
        kb = kb_env_ns.kb
        _presort(kb, rows)
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


class TestEndToSectionMerge:
    """His exact shape through the real pipeline, both section placements."""

    def test_default_macros_plus_focus_rebind(self, kb_env_ns, macro_playback,
                                              tmp_path):
        # reported shape: default-section macros defined before a focus rebind
        _load_config(kb_env_ns.kb, tmp_path, (
            "# default group: macros defined BEFORE the focus rebind\n"
            "-naga2 :: c\n"
            "+naga2 :: c\n"
            "\n"
            "<focus> notepad\n"
            "naga2 : f\n"))
        kb = kb_env_ns.kb
        # merge kept both: focus rebind + default macros are in the build
        assert len(kb._rebinds_dict) == 2
        assert len(kb._macros_dict) == 2
        _pump(kb)
        code = pynput_keyboard.KeyCode.from_vk
        assert kb_env_ns.kb_mock.press.call_args_list == [call(code(VK_F))]
        assert kb_env_ns.kb_mock.release.call_args_list == [call(code(VK_F))]
        assert macro_playback == []

    def test_default_rebind_plus_focus_macros(self, kb_env_ns, macro_playback,
                                              tmp_path):
        # flipped placement: default-section rebind, focus-section macros -
        # the README's 'any group placement' side of the rule
        _load_config(kb_env_ns.kb, tmp_path, (
            "# default group: rebind defined FIRST\n"
            "naga2 : f\n"
            "\n"
            "<focus> notepad\n"
            "-naga2 :: c\n"
            "+naga2 :: c\n"))
        kb = kb_env_ns.kb
        assert len(kb._rebinds_dict) == 2
        assert len(kb._macros_dict) == 2
        _pump(kb)
        code = pynput_keyboard.KeyCode.from_vk
        assert kb_env_ns.kb_mock.press.call_args_list == [call(code(VK_F))]
        assert kb_env_ns.kb_mock.release.call_args_list == [call(code(VK_F))]
        assert macro_playback == []
