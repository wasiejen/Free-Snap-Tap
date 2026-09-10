"""Shared plain-function helpers for the kb_env-class fixtures
(`kb_env_ns` / `kb_env_mouse` / `kb_env_plain` in tests/conftest.py).

Config-build shorthands and win32 filter-event shorthands, defined once so a
helper fix is applied here instead of in every test file. No fixtures, no
Qt, no I/O.
"""
from unittest.mock import MagicMock


def build(kb, rebinds=None, macros=None, taps=None, aliases=None):
    cm = kb.config_manager
    cm._tap_groups_hr = taps or []
    cm._rebinds_hr = rebinds or []
    cm._macros_hr = macros or []
    cm._alias_hr = aliases or []
    kb.initialize_groups_from_presorted_lines()


def down(kb, vk, t):
    kb._win32_event_filter(vk, t, True, False)


def up(kb, vk, t):
    kb._win32_event_filter(vk, t, False, False)


def hold_keys(kb, *vks):
    for vk in vks:
        kb.state_manager.set_real_key_press_state(vk, True)


def mock_control_handlers(kb):
    for name in ('control_return_to_menu', 'control_exit_program', 'control_toggle_pause'):
        setattr(kb, name, MagicMock())
