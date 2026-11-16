"""F-B5 poll-contract pins (review Item 14, documented-decision form).

Pins the timeout-tolerant active-window query wrapper in fst_tasks.py and
the failure-mode map it freezes: the AttributeError "None" sentinel stays
the documented fallback for "no foreground window", every OTHER raising
failure falls back to the last-known title (stale value) or to the "None"
sentinel before the first successful poll, and the query stays at its
single production call site inside the wrapper (grep-count pin).
gw.getActiveWindow is mocked - no Windows APIs, no real time.
"""
import asyncio
import logging
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import MagicMock

import pytest

import fst_tasks
from fst_tasks import Focus_Task

REPO_ROOT = Path(__file__).resolve().parent.parent


def make_fst(focus_names=(), always_active=False, win32_paused=False,
             manual_paused=False):
    """Stand-in for FST_Keyboard with only the attributes Focus_Task.run touches."""
    return SimpleNamespace(
        arg_manager=SimpleNamespace(
            MANUAL_PAUSED=manual_paused,
            ALWAYS_ACTIVE=always_active,
            WIN32_FILTER_PAUSED=win32_paused,
        ),
        focus_manager=SimpleNamespace(
            multi_focus_dict_keys=list(focus_names),
            FOCUS_APP_NAME='',
        ),
        update_args_and_groups=MagicMock(),
        cli_menu=MagicMock(),
        toast_group_activated=MagicMock(),
        is_silent_focus_group=MagicMock(return_value=False),
    )


def driving_sleep(monkeypatch, task, ticks):
    """Patch asyncio.sleep with a fake that yields to the loop and sets
    task.stop() after `ticks` sleeps (same driver as tests/test_focus_task.py)."""
    state = {'n': 0}

    async def fake_sleep(delay):
        state['n'] += 1
        loop = asyncio.get_running_loop()
        future = loop.create_future()
        loop.call_soon(future.set_result, None)
        await future
        if state['n'] >= ticks:
            task.stop()

    # the SAME asyncio module object fst_tasks imports - one global patch
    monkeypatch.setattr(asyncio, 'sleep', fake_sleep)
    return state


def fake_windows_then_raise(monkeypatch, titles, exc):
    """Titles in order, then EVERY later getActiveWindow call raises exc
    (stall-simulation: the raising failure classes of the query path)."""
    index = [0]

    def get_active_window():
        if index[0] < len(titles):
            title = titles[index[0]]
            index[0] += 1
            return SimpleNamespace(title=title)
        raise exc

    monkeypatch.setattr('fst_tasks.gw.getActiveWindow', get_active_window)


def fake_windows_then_none(monkeypatch, titles):
    """Titles in order, then EVERY later getActiveWindow call returns None
    (the GetForegroundWindow()==0 case -> AttributeError on .title)."""
    index = [0]

    def get_active_window():
        if index[0] < len(titles):
            title = titles[index[0]]
            index[0] += 1
            return SimpleNamespace(title=title)
        return None

    monkeypatch.setattr('fst_tasks.gw.getActiveWindow', get_active_window)


# --- wrapper unit pins (direct failure-mode map) -------------------------

def test_wrapper_maps_no_foreground_window_to_none_sentinel(monkeypatch):
    # GetForegroundWindow()==0 -> getActiveWindow() None -> .title AttributeError
    monkeypatch.setattr('fst_tasks.gw.getActiveWindow', lambda: None)
    assert fst_tasks._get_active_window_title('CS2 2024') == "None"


def test_wrapper_falls_back_to_stale_title_on_pygetwindow_exception(monkeypatch):
    def boom():
        raise fst_tasks.gw.PyGetWindowException('Win32 error simulated')
    monkeypatch.setattr('fst_tasks.gw.getActiveWindow', boom)
    assert fst_tasks._get_active_window_title('CS2 2024') == 'CS2 2024'


def test_wrapper_falls_back_to_stale_title_on_oserror(monkeypatch):
    def boom():
        raise OSError('ctypes-level failure simulated')
    monkeypatch.setattr('fst_tasks.gw.getActiveWindow', boom)
    assert fst_tasks._get_active_window_title('Notepad') == 'Notepad'


def test_wrapper_first_failure_without_stale_uses_none_sentinel(monkeypatch):
    # documented degradation (reviewer P2-1): stale '' means EITHER "no
    # successful poll yet" OR "last-known title was empty" (UIPI-blocked
    # titles read as empty) - both fall back to the "None" sentinel
    def boom():
        raise RuntimeError('any other raising failure')
    monkeypatch.setattr('fst_tasks.gw.getActiveWindow', boom)
    assert fst_tasks._get_active_window_title('') == "None"


def test_wrapper_returns_title_on_normal_path(monkeypatch):
    monkeypatch.setattr(
        'fst_tasks.gw.getActiveWindow',
        lambda: SimpleNamespace(title='CS2 2024'))
    assert fst_tasks._get_active_window_title('stale') == 'CS2 2024'


def test_wrapper_warns_once_per_failure_streak(monkeypatch, caplog):
    # reviewer P2-2: a persistent failure repeats at the 4 Hz poll rate -
    # only the FIRST failure of a streak warns; the next success re-arms
    calls = {'n': 0}

    def fake_window():
        calls['n'] += 1
        if calls['n'] == 4:
            return SimpleNamespace(title='CS2 2024')  # the re-arm success
        raise RuntimeError('simulated query failure')

    monkeypatch.setattr('fst_tasks.gw.getActiveWindow', fake_window)
    with caplog.at_level(logging.DEBUG, logger='fst.macro'):
        fst_tasks._query_streak_warned = False  # own the module flag (fixture)
        fst_tasks._get_active_window_title('CS2 2024')  # fail 1 -> warning
        fst_tasks._get_active_window_title('CS2 2024')  # fail 2 -> debug only
        fst_tasks._get_active_window_title('CS2 2024')  # fail 3 -> debug only
        assert fst_tasks._get_active_window_title('CS2 2024') == 'CS2 2024'
        fst_tasks._get_active_window_title('CS2 2024')  # fail 4 -> warning again
    warnings = [r for r in caplog.records
                if r.name == 'fst.macro' and r.levelno == logging.WARNING]
    assert len(warnings) == 2  # exactly the first failure of each streak


# --- end-to-end poll pins (Focus_Task.run through the wrapper) -----------

@pytest.mark.asyncio
async def test_poll_survives_raising_query_and_keeps_focus(monkeypatch):
    # stall-simulation: tick 1 activates CS2, ticks 2+ raise every poll -
    # the stale-title fallback must keep the group active and the loop alive
    fake_windows_then_raise(
        monkeypatch, ['CS2 2024'],
        fst_tasks.gw.PyGetWindowException('Win32 error simulated'))
    fst = make_fst(focus_names=['CS2'], win32_paused=False)
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=4)

    await task.run()  # raises on the pre-F-B5 code: the poll task died

    assert task._stop is True  # the run loop finished normally
    assert fst.focus_manager.FOCUS_APP_NAME == 'CS2'
    fst.update_args_and_groups.assert_called_once_with('CS2', startup=False)
    fst.cli_menu.display_focus_not_found.assert_not_called()
    assert fst.arg_manager.WIN32_FILTER_PAUSED is False


@pytest.mark.asyncio
async def test_poll_none_window_transition_keeps_documented_semantics(monkeypatch):
    # preserved current fallback: after a good poll, a None result is the
    # "None" sentinel -> window-change branch -> focus not found -> pause
    fake_windows_then_none(monkeypatch, ['CS2 2024'])
    fst = make_fst(focus_names=['CS2'], win32_paused=False)
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=3)  # +1 inner sleep on the pause leg

    await task.run()

    assert fst.focus_manager.FOCUS_APP_NAME == ''
    fst.cli_menu.display_focus_not_found.assert_called_once_with()
    assert fst.arg_manager.WIN32_FILTER_PAUSED is True


# --- grep-count pin: one query, inside the wrapper, used by run() --------

def test_active_window_query_has_single_wrapper_call_site():
    src = (REPO_ROOT / 'fst_tasks.py').read_text(encoding='utf-8')
    # the raw win32-backed query exists exactly once (inside the wrapper) ...
    assert src.count('gw.getActiveWindow') == 1
    # ... and the poll loop reaches it ONLY through the wrapper
    assert src.count('active_window = _get_active_window_title(') == 1
