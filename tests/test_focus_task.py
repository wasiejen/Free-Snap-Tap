"""Behavior tests of Focus_Task polling (fst_tasks.py).

Covers the active-window poll loop: focus-name matching (case-sensitive
substring), window-title sanitization, own-FST-window skip, pause/resume of the
win32 filter on focus loss, the ALWAYS_ACTIVE default-group branch, the
FOCUS_THREAD_PAUSED / MANUAL_PAUSED gating and stop().
gw.getActiveWindow and asyncio.sleep are mocked - the fake sleep yields to the
event loop (future + call_soon) so the coroutine advances; a counter sets
task.stop() after N ticks. No real input, no real time, no Windows APIs.
"""
import asyncio
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from fst_tasks import Focus_Task


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


def fake_windows(monkeypatch, titles):
    """gw.getActiveWindow returns SimpleNamespace(title=...) per call: the
    titles in order, repeating the last one once exhausted; empty list -> None."""
    index = [0]

    def get_active_window():
        if not titles:
            return None
        title = titles[index[0]]
        index[0] = min(index[0] + 1, len(titles) - 1)  # repeat the last one
        return SimpleNamespace(title=title)

    monkeypatch.setattr('fst_tasks.gw.getActiveWindow', get_active_window)
    return index


def driving_sleep(monkeypatch, task, ticks, before_yield=None):
    """Patch asyncio.sleep with a fake that yields to the loop and sets
    task.stop() after `ticks` sleeps. before_yield(n) may run before yielding."""
    state = {'n': 0}

    async def fake_sleep(delay):
        state['n'] += 1
        if before_yield is not None:
            before_yield(state['n'])
        loop = asyncio.get_running_loop()
        future = loop.create_future()
        loop.call_soon(future.set_result, None)
        await future
        if state['n'] >= ticks:
            task.stop()

    monkeypatch.setattr(asyncio, 'sleep', fake_sleep)
    return state


@pytest.mark.asyncio
async def test_focus_found_resumes_groups(monkeypatch):
    fst = make_fst(focus_names=['CS2'], win32_paused=True)
    fake_windows(monkeypatch, ['CS2 2024'])
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=2)

    await task.run()

    assert fst.focus_manager.FOCUS_APP_NAME == 'CS2'
    fst.update_args_and_groups.assert_called_once_with('CS2', startup=False)  # focus-change leg: scoped report
    fst.cli_menu.update_group_display.assert_called_once_with()
    fst.cli_menu.display_focus_found.assert_called_once_with('CS2 2024')
    assert fst.arg_manager.WIN32_FILTER_PAUSED is False
    assert task._stop is True


@pytest.mark.asyncio
async def test_window_title_sanitized_before_matching(monkeypatch):
    fst = make_fst(focus_names=['CS2'])
    fake_windows(monkeypatch, ['CS2™ 2024'])
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=2)

    await task.run()

    # special characters are stripped: matching and display use the clean title
    assert fst.focus_manager.FOCUS_APP_NAME == 'CS2'
    fst.cli_menu.display_focus_found.assert_called_once_with('CS2 2024')


@pytest.mark.asyncio
async def test_focus_matching_is_case_sensitive_substring(monkeypatch):
    fst = make_fst(focus_names=['cs2'])
    fake_windows(monkeypatch, ['CS2 2024'])
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=2)

    await task.run()

    assert fst.focus_manager.FOCUS_APP_NAME == ''
    fst.update_args_and_groups.assert_called_once_with(startup=False)  # fall back to default groups (scoped leg)
    fst.cli_menu.display_focus_not_found.assert_called_once_with()
    assert fst.arg_manager.WIN32_FILTER_PAUSED is True


@pytest.mark.asyncio
async def test_same_focus_again_does_not_reload(monkeypatch):
    fst = make_fst(focus_names=['CS2'])
    fake_windows(monkeypatch, ['CS2 A', 'CS2 B'])
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=4)

    await task.run()

    assert fst.focus_manager.FOCUS_APP_NAME == 'CS2'
    assert fst.update_args_and_groups.call_count == 1
    fst.cli_menu.display_focus_found.assert_called_once_with('CS2 A')


@pytest.mark.asyncio
@pytest.mark.parametrize('own', ['FST Status Indicator', 'FST Crosshair', 'FST_Overlay'])
async def test_own_windows_are_skipped(monkeypatch, own):
    fst = make_fst(focus_names=['CS2'])
    fake_windows(monkeypatch, [own])
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=2)

    await task.run()

    assert fst.focus_manager.FOCUS_APP_NAME == ''
    fst.update_args_and_groups.assert_not_called()
    fst.cli_menu.display_focus_not_found.assert_not_called()
    assert fst.arg_manager.WIN32_FILTER_PAUSED is False  # untouched


@pytest.mark.asyncio
async def test_no_match_pauses_filter(monkeypatch):
    fst = make_fst(focus_names=[])
    fake_windows(monkeypatch, ['Unknown Window'])
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=2)  # 0.2 s + 0.25 s sleeps in the pause branch

    await task.run()

    assert fst.focus_manager.FOCUS_APP_NAME == ''
    fst.update_args_and_groups.assert_called_once_with(startup=False)  # default-groups leg: scoped report
    fst.cli_menu.display_focus_not_found.assert_called_once_with()
    assert fst.arg_manager.WIN32_FILTER_PAUSED is True


@pytest.mark.asyncio
async def test_no_match_already_paused_is_noop(monkeypatch):
    fst = make_fst(focus_names=[], win32_paused=True)
    fake_windows(monkeypatch, ['Unknown Window'])
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=2)

    await task.run()

    fst.update_args_and_groups.assert_not_called()
    fst.cli_menu.display_focus_not_found.assert_not_called()
    assert fst.arg_manager.WIN32_FILTER_PAUSED is True


@pytest.mark.asyncio
async def test_always_active_uses_default_groups(monkeypatch):
    fst = make_fst(focus_names=[], always_active=True, win32_paused=True)
    fake_windows(monkeypatch, ['Unknown Window'])
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=2)

    await task.run()

    assert fst.focus_manager.FOCUS_APP_NAME == ''
    fst.update_args_and_groups.assert_called_once_with(startup=False)  # default-groups leg: scoped report
    fst.cli_menu.display_default_active.assert_called_once_with()
    assert fst.arg_manager.WIN32_FILTER_PAUSED is False
    fst.toast_group_activated.assert_called_once_with('default groups')


@pytest.mark.asyncio
async def test_activation_toast_names_the_group(monkeypatch):
    # U290T: activation of a focus group toasts its name (maintainer 8+9)
    fst = make_fst(focus_names=['CS2'], win32_paused=True)
    fake_windows(monkeypatch, ['CS2 2024'])
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=2)

    await task.run()

    fst.toast_group_activated.assert_called_once_with('CS2')


@pytest.mark.asyncio
async def test_activation_toast_not_repeated_for_same_group(monkeypatch):
    fst = make_fst(focus_names=['CS2'])
    fake_windows(monkeypatch, ['CS2 A', 'CS2 B'])
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=4)

    await task.run()

    fst.toast_group_activated.assert_called_once_with('CS2')  # one activation


@pytest.mark.asyncio
async def test_activation_toast_skips_silent_focus_group(monkeypatch):
    """U330 ask 3: a focus group carrying -no_warnings is SILENT - the
    activation toast skips it; the groups still resume (the skip is a toast
    rule, not an activation rule)."""
    fst = make_fst(focus_names=['CS2'], win32_paused=True)
    fst.is_silent_focus_group = MagicMock(return_value=True)
    fake_windows(monkeypatch, ['CS2 2024'])
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=2)

    await task.run()

    fst.is_silent_focus_group.assert_called_once_with('CS2')
    fst.update_args_and_groups.assert_called_once_with('CS2', startup=False)  # focus-change leg: scoped report
    fst.toast_group_activated.assert_not_called()
    assert fst.arg_manager.WIN32_FILTER_PAUSED is False  # still resumed


@pytest.mark.asyncio
async def test_default_groups_activation_toast_skips_silent_default(monkeypatch):
    # the ALWAYS_ACTIVE default-groups branch carries the same skip: the
    # default scope ('') is silent when it carries -no_warnings
    fst = make_fst(focus_names=[], always_active=True, win32_paused=True)
    fst.is_silent_focus_group = MagicMock(return_value=True)
    fake_windows(monkeypatch, ['Unknown Window'])
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=2)

    await task.run()

    fst.is_silent_focus_group.assert_called_once_with('')
    fst.update_args_and_groups.assert_called_once_with(startup=False)  # default-groups leg: scoped report
    fst.toast_group_activated.assert_not_called()


@pytest.mark.asyncio
async def test_manually_paused_gates_until_resumed(monkeypatch):
    fst = make_fst(focus_names=['CS2'], manual_paused=True)
    fake_windows(monkeypatch, ['CS2 2024'])
    task = Focus_Task(fst)
    driving_sleep(
        monkeypatch, task, ticks=4,
        before_yield=lambda n: setattr(fst.arg_manager, 'MANUAL_PAUSED', False)
        if n >= 2 else None,
    )

    await task.run()

    # while manually paused the window was ignored; after resume it is picked up
    assert fst.focus_manager.FOCUS_APP_NAME == 'CS2'
    fst.update_args_and_groups.assert_called_once_with('CS2', startup=False)  # focus-change leg: scoped report
    assert fst.arg_manager.WIN32_FILTER_PAUSED is False


@pytest.mark.asyncio
async def test_reload_failure_aborts_resume(monkeypatch):
    fst = make_fst(focus_names=['CS2'], win32_paused=True)
    fst.update_args_and_groups.side_effect = RuntimeError('boom')
    fake_windows(monkeypatch, ['CS2 2024'])
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=2)

    await task.run()

    # FOCUS_APP_NAME is set before the reload; the failure aborts the resume
    assert fst.focus_manager.FOCUS_APP_NAME == 'CS2'
    fst.cli_menu.display_focus_found.assert_not_called()
    assert fst.arg_manager.WIN32_FILTER_PAUSED is True


@pytest.mark.asyncio
async def test_missing_window_title_uses_none_branch(monkeypatch):
    fst = make_fst(focus_names=[])
    fake_windows(monkeypatch, [])  # getActiveWindow returns None
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=2)

    await task.run()

    assert fst.arg_manager.WIN32_FILTER_PAUSED is True
    fst.cli_menu.display_focus_not_found.assert_called_once_with()


def test_pause_and_restart_toggle_focus_thread_paused():
    fst = make_fst(focus_names=['CS2'])
    task = Focus_Task(fst)
    assert task.FOCUS_THREAD_PAUSED is False
    task.pause()
    assert task.FOCUS_THREAD_PAUSED is True

    fst.arg_manager.MANUAL_PAUSED = True
    task.restart()
    assert task.FOCUS_THREAD_PAUSED is False
    assert fst.arg_manager.MANUAL_PAUSED is False

    # not paused: restart leaves MANUAL_PAUSED untouched
    fst.arg_manager.MANUAL_PAUSED = True
    task.restart()
    assert fst.arg_manager.MANUAL_PAUSED is True


def test_stop_method_stops_the_run_loop():
    task = Focus_Task(make_fst())
    assert task._stop is False
    task.stop()
    assert task._stop is True


@pytest.mark.asyncio
async def test_reload_failure_names_the_reload_cause(monkeypatch, capsys):
    """U290R: the group-reload failure handler keeps its own message - and the
    activation toast is out of that handler, so a toast failure can never
    print a reload failure there (see the next test)."""
    fst = make_fst(focus_names=['CS2'], win32_paused=True)
    fst.update_args_and_groups.side_effect = RuntimeError('boom-config')
    fake_windows(monkeypatch, ['CS2 2024'])
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=2)

    await task.run()

    out = capsys.readouterr().out
    assert 'reloading of groups files failed' in out
    assert 'boom-config' in out
    assert 'toast' not in out
    fst.toast_group_activated.assert_not_called()  # toast skipped on reload fail


@pytest.mark.asyncio
async def test_toast_failure_not_reported_as_reload_failure(monkeypatch, capsys):
    """U290R: the activation toast used to sit INSIDE the reload handler, so
    a failing toast printed 'reloading of groups files failed' and left the
    user thinking the config reload broke. The toast now has its own handler:
    its failure is named as a toast failure, the groups stay resumed."""
    fst = make_fst(focus_names=['CS2'], win32_paused=True)
    fst.toast_group_activated.side_effect = RuntimeError('toast-broke')
    fake_windows(monkeypatch, ['CS2 2024'])
    task = Focus_Task(fst)
    driving_sleep(monkeypatch, task, ticks=2)

    await task.run()

    out = capsys.readouterr().out
    assert 'focus activation toast failed' in out
    assert 'toast-broke' in out
    assert 'reloading of groups files failed' not in out
    fst.update_args_and_groups.assert_called_once_with('CS2', startup=False)  # focus-change leg: scoped report
    assert fst.arg_manager.WIN32_FILTER_PAUSED is False  # groups stay resumed
