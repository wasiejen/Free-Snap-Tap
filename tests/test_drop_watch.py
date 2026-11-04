"""Drop-watch logging lane pins (U345, #291 H1).

The H1 falsifier (handover_u301.md): a release event dies mid-pipeline
inside the win32 filter - pynput's _handler swallows the exception and
the release passes UNFILTERED while FST never recorded it. This lane
makes that observable from inside the game: the filter entry appends a
cheap raw tuple to a bounded ring (deque, no format, no I/O); a leg
exception is caught at the filter entry (so pynput never sees it and
the listener survives) and lands as ONE named drop line in fst.log +
(the dedicated) fst_drop.log while the watch is on.
Controls (usage-doc surface): start argument -drop_watch, numpad
alt+num6 (gated by -debug_numpad); ring/flush; ASCII-only records.
"""
import logging
from types import SimpleNamespace

import fst_manager
from fst_manager import (CONSTANTS, Argument_Manager,
                         set_drop_watch_enabled, toggle_drop_watch,
                         is_drop_watch_enabled)
from vk_codes import vk_codes_dict

VK_A = vk_codes_dict['a']
VK_NUM6 = vk_codes_dict['num6']
VK_ALT = vk_codes_dict['alt']


def key_data(vk, t=1000, flags=0):
    return SimpleNamespace(vkCode=vk, time=t, flags=flags)


def mouse_data(t=1000, flags=0, mouse_data=0):
    return SimpleNamespace(pt=SimpleNamespace(x=0, y=0), mouseData=mouse_data,
                           flags=flags, time=t, dwExtraInfo=0)


def test_keyboard_filter_entry_appends_ring(kb_env_ns):
    kb = kb_env_ns.kb
    kb.keyboard_win32_event_filter(256, key_data(VK_A))
    entry = kb._drop_ring[-1]
    assert (entry[0], entry[1], entry[3]) == (VK_A, True, False)
    # a release appends too
    kb.keyboard_win32_event_filter(257, key_data(VK_A))
    assert kb._drop_ring[-1][1] is False


def test_mouse_move_not_recorded(kb_env_mouse):
    kb = kb_env_mouse
    kb.mouse_win32_event_filter(512, mouse_data())  # WM_MOUSEMOVE
    assert len(kb._drop_ring) == 0
    kb.mouse_win32_event_filter(516, mouse_data())  # middle press
    entry = kb._drop_ring[-1]
    assert (entry[0], entry[1], entry[3]) == (2, True, True)


def test_leg_exception_reported_as_drop(kb_env_ns, caplog):
    kb = kb_env_ns.kb
    kb._win32_event_filter = MagicMock_side_effect(RuntimeError('boom'))
    with caplog.at_level(logging.DEBUG, logger='fst.drop'):
        kb.keyboard_win32_event_filter(257, key_data(VK_A))  # release leg dies
    text = caplog.text
    assert "event drop key vk=65 release" in text
    assert "RuntimeError('boom')" in text
    assert "drops=1" in text


def MagicMock_side_effect(exc):
    from unittest.mock import MagicMock
    m = MagicMock()
    m.side_effect = exc
    return m


def test_watch_on_adds_ring_tail(kb_env_ns, caplog, monkeypatch):
    kb = kb_env_ns.kb
    kb.keyboard_win32_event_filter(256, key_data(VK_A))  # press recorded

    def raise_on_release(vk, t, is_keydown, is_sim, mouse=False):
        if not is_keydown:
            raise RuntimeError('late')
        # pass through the real leg for the press
    kb._win32_event_filter = raise_on_release
    with caplog.at_level(logging.DEBUG, logger='fst.drop'):
        kb.keyboard_win32_event_filter(257, key_data(VK_A))
    drop_lines = [r.getMessage() for r in caplog.records
                  if 'event drop' in r.getMessage()]
    assert len(drop_lines) == 1
    # watch OFF (default): NO ring tail (low-cost single line)
    assert 'ring_tail' not in drop_lines[0]
    # now with the watch ON: the ring tail rides the line
    monkeypatch.setattr(CONSTANTS, 'DROP_WATCH', True)
    kb.keyboard_win32_event_filter(256, key_data(VK_A))
    with caplog.at_level(logging.DEBUG, logger='fst.drop'):
        kb.keyboard_win32_event_filter(257, key_data(VK_A))
    drop_lines = [r.getMessage() for r in caplog.records
                  if 'ring_tail' in r.getMessage()]
    assert len(drop_lines) == 1
    assert '0x41.P' in drop_lines[0]
    assert 'release' in drop_lines[0]


def test_toggle_attaches_drop_file_handler(monkeypatch, tmp_path):
    drop_file = tmp_path / 'fst_drop.log'
    monkeypatch.setattr(fst_manager, 'DROP_LOG_FILE', str(drop_file))
    monkeypatch.setattr(CONSTANTS, 'DROP_WATCH', False)
    set_drop_watch_enabled(True)
    drop = logging.getLogger('fst.drop')
    assert [h.baseFilename for h in drop.handlers] == [str(drop_file)]
    # idempotent re-enable (apply_start_arguments re-runs on focus change)
    set_drop_watch_enabled(True)
    assert len(drop.handlers) == 1
    toggle_drop_watch()
    assert is_drop_watch_enabled() is False
    assert drop.handlers == []


def test_drop_watch_argument_enables(monkeypatch, tmp_path, fake_fst):
    drop_file = tmp_path / 'fst_drop.log'
    monkeypatch.setattr(fst_manager, 'DROP_LOG_FILE', str(drop_file))
    am = Argument_Manager(fake_fst)
    am.apply_start_arguments(['-drop_watch'])
    assert CONSTANTS.DROP_WATCH is True
    drop = logging.getLogger('fst.drop')
    assert [h.baseFilename for h in drop.handlers] == [str(drop_file)]


def test_numpad_num6_toggles(kb_env_plain, monkeypatch, tmp_path):
    drop_file = tmp_path / 'fst_drop.log'
    monkeypatch.setattr(fst_manager, 'DROP_LOG_FILE', str(drop_file))
    monkeypatch.setattr(CONSTANTS, 'DEBUG_NUMPAD', True)
    kb = kb_env_plain
    kb.state_manager.set_real_key_press_state(VK_ALT, True)
    kb.state_manager.set_real_key_press_state(VK_NUM6, True)
    kb.check_debug_numpad_actions()
    assert CONSTANTS.DROP_WATCH is True
    kb.check_debug_numpad_actions()
    assert CONSTANTS.DROP_WATCH is False


def test_stop_listener_writes_summary_once(kb_env_plain, caplog):
    kb = kb_env_plain
    with caplog.at_level(logging.DEBUG, logger='fst.drop'):
        kb.stop_listener()
    assert 'drop_watch stop drops=0' in caplog.text


def test_drop_line_is_ascii_safe(kb_env_ns, caplog):
    kb = kb_env_ns.kb

    def raise_unicode(vk, t, is_keydown, is_sim, mouse=False):
        raise ValueError('gr\u00fc\u00dfe\u00df')  # non-ASCII exception text
    kb._win32_event_filter = raise_unicode
    with caplog.at_level(logging.DEBUG, logger='fst.drop'):
        kb.keyboard_win32_event_filter(256, key_data(VK_A))
    drop_lines = [r.getMessage() for r in caplog.records
                  if 'event drop' in r.getMessage()]
    assert len(drop_lines) == 1
    line = drop_lines[0]
    assert line.encode('ascii')  # records are ASCII-only (ascii() escapes)
    assert 'xfc' in line  # content survives as escapes, no raw bytes
