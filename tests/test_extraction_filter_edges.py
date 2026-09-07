"""Task-11 remainder: convert_to_vk_code numeric/invalid branches,
extract_data_from_key bare-int delay and '!' modifier, config exception
paths (alias/tap-group/rebind) and the remaining _win32_event_filter
branches (rebind dict KeyError, unfulfilled replacement constraint, empty
macro, EXEC_ONLY_ONE_TRIGGERED_MACRO, tap-loop edge breaks, mouse-rebind
scheduling error).
Real FST_Keyboard with mocked pynput controllers - no live input.
"""
import asyncio
import logging
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from pynput import keyboard as pynput_keyboard

from fst_data_types import Key_Event, Key_Group, Macro
from fst_keyboard import FST_Keyboard

VK_A = 0x41
VK_B = 0x42
VK_MIDDLE = 3


@pytest.fixture
def kb_env(monkeypatch):
    kb_mock = MagicMock()
    ms_mock = MagicMock()
    monkeypatch.setattr('pynput.keyboard.Controller', lambda: kb_mock)
    monkeypatch.setattr('pynput.mouse.Controller', lambda: ms_mock)
    FST_Keyboard.TIME_DIFF = None
    FST_Keyboard.START_TIME = None
    keyboard = FST_Keyboard()
    keyboard._listener = MagicMock()
    keyboard.arg_manager.WIN32_FILTER_PAUSED = False
    keyboard.arg_manager.ACT_DELAY = False
    keyboard.arg_manager.ACT_CROSSOVER = False
    yield SimpleNamespace(kb=keyboard, kb_mock=kb_mock, mouse_mock=ms_mock)
    FST_Keyboard.TIME_DIFF = None
    FST_Keyboard.START_TIME = None


def build(kb, rebinds=None, macros=None, taps=None, aliases=None):
    cm = kb.config_manager
    cm._tap_groups_hr = taps or []
    cm._rebinds_hr = rebinds or []
    cm._macros_hr = macros or []
    cm._alias_hr = aliases or []
    kb.initialize_groups_from_presorted_lines()


def down(kb, vk, t):
    kb._win32_event_filter(vk, t, True, False)


class TestConvertToVkCode:
    def test_numeric_vk_string_in_range_returns_int(self, kb_env):
        kb = kb_env.kb
        assert kb.convert_to_vk_code('255') == 255

    def test_out_of_range_numeric_string_falls_to_implicit_none(self, kb_env):
        # suspected bug #2 (COVERAGE_TRIAGE.md): "300" slips past both branches
        kb = kb_env.kb
        assert kb.convert_to_vk_code('300') is None

    def test_unknown_non_numeric_key_raises_key_error(self, kb_env):
        kb = kb_env.kb
        with pytest.raises(KeyError):
            kb.convert_to_vk_code('zz')


class TestKeyExtraction:
    def test_bare_int_delay_and_bang_release_modifier(self, kb_env):
        # '!' = release modifier, '|50' = bare-int delay constraint
        kb = kb_env.kb
        build(kb, rebinds=[['(r)', [['a'], '!e|50']]])
        # trigger '-a' equivalent stays a Key_Event: single rebind
        assert len(kb._rebinds_dict) == 1
        for rebind in kb._rebinds_dict.values():
            assert rebind.replacement.constraints == [50]

    def test_bare_key_replacement_expands_to_press_and_release(self, kb_env):
        # bare replacement key is a Key -> expanded into two Key_Group rebinds
        kb = kb_env.kb
        build(kb, rebinds=[['(r)', [['a'], 'e']]])
        assert len(kb._rebinds_dict) == 2


class TestConfigExceptionPaths:
    def test_alias_referencing_unknown_alias_raises(self, kb_env):
        kb = kb_env.kb
        with pytest.raises(Exception, match='Alias'):
            build(kb, aliases=[['<bad>', ['<nope>']]])

    def test_tap_group_with_unknown_key_raises(self, kb_env):
        kb = kb_env.kb
        with pytest.raises(Exception):
            build(kb, taps=[['(TAP_1)', ['zz']]])

    def test_rebind_with_unknown_key_raises(self, kb_env):
        kb = kb_env.kb
        with pytest.raises(Exception):
            build(kb, rebinds=[['(r)', [['zz'], 'b']]])


class TestFilterEdges:
    def test_rebind_trigger_missing_from_dict_is_swallowed(self, kb_env):
        kb = kb_env.kb
        build(kb, rebinds=[['(r)', [['a'], 'b']]])
        del kb._rebinds_dict[kb._rebind_triggers[0]]
        down(kb, VK_A, 1000)
        assert kb_env.kb_mock.press.call_count == 0
        assert kb._listener.suppress_event.call_count == 0

    def test_replacement_constraint_not_fulfilled_suppresses(self, kb_env):
        kb = kb_env.kb
        build(kb, rebinds=[['(r)', [['a'], 'b|(p("shift"))']]])
        down(kb, VK_A, 1000)  # shift not pressed -> replacement constraint fails
        assert kb_env.kb_mock.press.call_count == 0
        assert kb._listener.suppress_event.call_count == 1

    def test_empty_macro_sequence_no_playback(self, kb_env, monkeypatch):
        kb = kb_env.kb
        played = []
        monkeypatch.setattr(FST_Keyboard, 'start_macro_playback',
                            lambda self, alias, seq: played.append(alias))
        build(kb, macros=[['(m)', [['a'], []]]])
        down(kb, VK_A, 1000)
        assert played == []
        assert kb._listener.suppress_event.call_count == 1

    def test_exec_only_one_triggered_macro_breaks_after_first(self, kb_env, monkeypatch):
        kb = kb_env.kb
        kb.arg_manager.EXEC_ONLY_ONE_TRIGGERED_MACRO = True
        played = []
        monkeypatch.setattr(FST_Keyboard, 'start_macro_playback',
                            lambda self, alias, seq: played.append(alias))
        build(kb)
        g1 = Key_Group([Key_Event(VK_A, True)])
        g2 = Key_Group([Key_Event(VK_A, True), Key_Event(VK_B, True)])
        m1 = Macro(g1, [Key_Group([Key_Event(VK_B, True)])])
        m2 = Macro(g2, [Key_Group([Key_Event(VK_B, True)])])
        m1.alias, m2.alias = 'm1', 'm2'
        kb._macro_triggers.extend([g1, g2])
        kb._macros_dict[g1] = m1
        kb._macros_dict[g2] = m2
        kb.state_manager.set_real_key_press_state(VK_B, True)  # hold b
        down(kb, VK_A, 1000)
        # both triggers fire on this event, the flag stops playback after the first
        assert played == ['m1']

    def test_without_exec_only_one_all_triggered_macros_fire(self, kb_env, monkeypatch):
        kb = kb_env.kb
        assert kb.arg_manager.EXEC_ONLY_ONE_TRIGGERED_MACRO is False
        played = []
        monkeypatch.setattr(FST_Keyboard, 'start_macro_playback',
                            lambda self, alias, seq: played.append(alias))
        build(kb)
        g1 = Key_Group([Key_Event(VK_A, True)])
        g2 = Key_Group([Key_Event(VK_A, True), Key_Event(VK_B, True)])
        m1 = Macro(g1, [Key_Group([Key_Event(VK_B, True)])])
        m2 = Macro(g2, [Key_Group([Key_Event(VK_B, True)])])
        m1.alias, m2.alias = 'm1', 'm2'
        kb._macro_triggers.extend([g1, g2])
        kb._macros_dict[g1] = m1
        kb._macros_dict[g2] = m2
        kb.state_manager.set_real_key_press_state(VK_B, True)  # hold b
        down(kb, VK_A, 1000)
        assert played == ['m1', 'm2']

    def test_rebind_into_tap_group_resets_key_replaced(self, kb_env):
        kb = kb_env.kb
        build(kb, taps=[['(TAP_1)', ['b', 'c']]],
              rebinds=[['(r)', [['-a'], '-b']]])
        down(kb, VK_A, 1000)
        # the replacement key enters the tap group: the group sends it, the
        # replaced key flag is reset so the replacement is not sent twice
        kb_env.kb_mock.press.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_B))
        assert kb_env.kb_mock.release.call_count == 0
        assert kb._listener.suppress_event.call_count == 1

    def test_repeated_active_tap_trigger_breaks_without_resend(self, kb_env, monkeypatch):
        kb = kb_env.kb
        played = []
        monkeypatch.setattr(FST_Keyboard, 'start_macro_playback',
                            lambda self, alias, seq: played.append(alias))
        build(kb, taps=[['(TAP_1)', ['a', 'b']]], macros=[['(m)', [['a'], ['c']]]])
        down(kb, VK_A, 1000)   # a becomes the active tap key
        down(kb, VK_A, 1500)   # OS auto-repeat of the held trigger key
        kb_env.kb_mock.press.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_A))
        assert kb_env.kb_mock.release.call_count == 0
        assert played == ['m']
        assert kb._listener.suppress_event.call_count == 2

    def test_mouse_rebind_schedule_error_is_logged(self, kb_env, monkeypatch, caplog):
        kb = kb_env.kb
        kb.loop = MagicMock()
        kb._mouse_listener = MagicMock()

        def raise_error(*args, **kwargs):
            raise RuntimeError('boom')

        monkeypatch.setattr(asyncio, 'run_coroutine_threadsafe', raise_error)
        build(kb, rebinds=[['(r)', [['mm'], 'scroll_vert']]])
        with caplog.at_level(logging.ERROR, logger='fst_keyboard'):
            kb._win32_event_filter(VK_MIDDLE, 1000, True, False, True)
        assert any('mouse_key to mouse_key rebind' in record.message
                   for record in caplog.records)
        kb._mouse_listener.suppress_event.assert_called_once_with()
        kb._listener.suppress_event.assert_not_called()
