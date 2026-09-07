"""FST_Keyboard facade wiring: focus-group application, arg/group refresh,
start-arg application by focus name and the small property getters.

The config load is stubbed so apply/update paths never open a file, and the
pynput controllers are mocked so no real input can be emitted.
"""
from unittest.mock import MagicMock

import pytest

from fst_keyboard import FST_Keyboard


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
    keyboard._mouse_listener = MagicMock()
    yield keyboard
    FST_Keyboard.TIME_DIFF = None
    FST_Keyboard.START_TIME = None


@pytest.fixture
def facade_kb(kb_env, monkeypatch):
    kb = kb_env
    # default: an empty config so no file is opened on reload
    monkeypatch.setattr(kb.config_manager, 'load_config', lambda: ({}, [], []))
    return kb


def cs2_config():
    return ({'cs2': (['-nomenu'], [['', 'a : b']])}, [], [])


class TestPropertyGetters:
    def test_output_manager_property(self, kb_env):
        assert kb_env.output_manager is kb_env._output_manager

    def test_key_group_by_alias_property(self, kb_env):
        assert kb_env.key_group_by_alias == kb_env._key_group_by_alias


class TestApplyFocusGroups:
    def test_default_focus_uses_only_default_lines(self, facade_kb):
        facade_kb.apply_focus_groups('')
        assert facade_kb._rebinds_dict == {}

    def test_named_focus_merges_focus_lines(self, facade_kb):
        facade_kb.focus_manager.multi_focus_dict = {'cs2': ([], [['', 'a : b']])}
        facade_kb.apply_focus_groups('cs2')
        assert facade_kb._rebind_triggers != []


class TestUpdateFocusGroups:
    def test_update_focus_groups_from_config(self, facade_kb):
        facade_kb.config_manager.load_config = cs2_config
        facade_kb.update_focus_groups()
        assert facade_kb.focus_manager.multi_focus_dict.get('cs2') == \
            (['-nomenu'], [['', 'a : b']])


class TestUpdateArgsAndGroups:
    def test_default_focus(self, facade_kb):
        facade_kb.update_args_and_groups('')
        assert facade_kb._state_manager._pressed_keys == set()

    def test_named_focus(self, facade_kb, monkeypatch):
        monkeypatch.setattr(facade_kb.config_manager, 'load_config', cs2_config)
        facade_kb.update_args_and_groups('cs2')
        assert facade_kb.arg_manager.MENU_ENABLED is False


class TestSetLoop:
    def test_set_loop_stores_loop(self, facade_kb):
        loop = object()
        facade_kb.set_loop(loop)
        assert facade_kb.loop is loop


class TestApplyStartArgsByFocusName:
    def test_default_focus_applies_sys_args(self, facade_kb):
        facade_kb.set_sys_start_arguments(['-nomenu'])
        facade_kb.apply_start_args_by_focus_name('')
        assert facade_kb.arg_manager.MENU_ENABLED is False

    def test_named_focus_applies_focus_args(self, facade_kb, monkeypatch):
        monkeypatch.setattr(facade_kb.config_manager, 'load_config', cs2_config)
        facade_kb.apply_start_args_by_focus_name('cs2')
        assert facade_kb.arg_manager.MENU_ENABLED is False


class TestSetSysStartArguments:
    def test_set_sys_start_arguments(self, facade_kb):
        facade_kb.set_sys_start_arguments(['-nomenu'])
        assert facade_kb.arg_manager.sys_start_args == ['-nomenu']


class TestReleaseAllSimulatedFacade:
    def test_release_delegates_to_managers(self, facade_kb):
        facade_kb.release_all_currently_pressed_simulated_keys()
        assert facade_kb.output_manager.variables == {}
