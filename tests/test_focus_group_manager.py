"""Unit tests of the Focus_Task lifecycle methods of Focus_Group_Manager
(fst_manager.py): init/pause/start/restart/stop_focus_task and
update_groups_from_config.

start_focus_task needs a running asyncio loop and spawns the real
Focus_Task.run() - so gw.getActiveWindow and asyncio.sleep are mocked the same
way as in tests/test_focus_task.py.
"""
import asyncio
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from fst_manager import Focus_Group_Manager
from fst_tasks import Focus_Task


@pytest.fixture
def fst():
    """Stand-in for FST_Keyboard with the attributes Focus_Task.run touches."""
    return SimpleNamespace(
        arg_manager=SimpleNamespace(MANUAL_PAUSED=False, ALWAYS_ACTIVE=False,
                                    WIN32_FILTER_PAUSED=False),
        focus_manager=SimpleNamespace(multi_focus_dict_keys=['CS2'],
                                      FOCUS_APP_NAME=''),
        update_args_and_groups=MagicMock(),
        cli_menu=MagicMock(),
    )


@pytest.fixture
def active_fgh(fst):
    fgh = Focus_Group_Manager(fst)
    fgh.multi_focus_dict = {'cs2': ([], [])}
    fgh.init_focus_task()
    return fgh


def stop_spawned_task(monkeypatch, fgh, window_title='Other'):
    """Patch gw + asyncio.sleep so the spawned Focus_Task can be stopped
    after its first poll."""
    monkeypatch.setattr('fst_tasks.gw.getActiveWindow',
                        lambda: SimpleNamespace(title=window_title))

    async def fake_sleep(delay):
        loop = asyncio.get_running_loop()
        future = loop.create_future()
        loop.call_soon(future.set_result, None)
        await future
        fgh._focus_task.stop()

    monkeypatch.setattr(asyncio, 'sleep', fake_sleep)


def test_init_focus_task_creates_task_when_focus_names_present(fst):
    fgh = Focus_Group_Manager(fst)
    fgh.multi_focus_dict = {'cs2': ([], [])}

    assert fgh.init_focus_task() is True
    assert fgh.focus_active is True
    assert isinstance(fgh._focus_task, Focus_Task)


def test_init_focus_task_without_focus_names(fst):
    fgh = Focus_Group_Manager(fst)

    assert fgh.init_focus_task() is False
    assert fgh.focus_active is False
    assert fgh._focus_task is None


def test_pause_focus_task_pauses_running_task(active_fgh):
    active_fgh.pause_focus_task()
    assert active_fgh._focus_task.FOCUS_THREAD_PAUSED is True


def test_pause_focus_task_without_task_is_noop(fst):
    fgh = Focus_Group_Manager(fst)
    fgh.pause_focus_task()


@pytest.mark.asyncio
async def test_start_focus_task_starts_running_task(active_fgh, monkeypatch):
    stop_spawned_task(monkeypatch, active_fgh)

    active_fgh.start_focus_task()

    assert isinstance(active_fgh.task, asyncio.Task)
    await active_fgh.task
    assert active_fgh.task.done()
    assert active_fgh._focus_task._stop is True


@pytest.mark.asyncio
async def test_start_focus_task_without_active_focus_does_nothing(fst):
    fgh = Focus_Group_Manager(fst)
    fgh.init_focus_task()  # no focus names -> inactive

    fgh.start_focus_task()
    assert fgh.task is None


@pytest.mark.asyncio
async def test_start_focus_task_restarts_done_task(active_fgh, monkeypatch):
    stop_spawned_task(monkeypatch, active_fgh)
    done = MagicMock()
    done.done.return_value = True
    active_fgh.task = done

    active_fgh.start_focus_task()

    assert active_fgh.task is not done
    assert isinstance(active_fgh.task, asyncio.Task)
    await active_fgh.task
    assert active_fgh.task.done()


@pytest.mark.asyncio
async def test_start_focus_task_keeps_running_task(active_fgh, monkeypatch):
    stop_spawned_task(monkeypatch, active_fgh)

    active_fgh.start_focus_task()
    first = active_fgh.task
    assert not first.done()

    active_fgh.start_focus_task()  # still running: nothing is started again
    assert active_fgh.task is first

    await first
    assert first.done()


def test_restart_focus_task_resumes_paused_task(active_fgh, fst):
    fst.arg_manager.MANUAL_PAUSED = True
    active_fgh._focus_task.pause()

    active_fgh.restart_focus_task()

    assert active_fgh._focus_task.FOCUS_THREAD_PAUSED is False
    assert fst.arg_manager.MANUAL_PAUSED is False


def test_restart_focus_task_without_task_is_noop(fst):
    fgh = Focus_Group_Manager(fst)
    fgh.restart_focus_task()


def test_stop_focus_task_stops_running_task(active_fgh):
    active_fgh.task = MagicMock()
    active_fgh.task.done.return_value = False

    active_fgh.stop_focus_task()

    assert active_fgh._focus_task._stop is True


def test_stop_focus_task_done_task_is_noop(active_fgh):
    active_fgh.task = MagicMock()
    active_fgh.task.done.return_value = True

    active_fgh.stop_focus_task()

    assert active_fgh._focus_task._stop is False


def test_stop_focus_task_without_task_is_noop(fst):
    fgh = Focus_Group_Manager(fst)
    fgh.stop_focus_task()


def test_update_groups_from_config_stores_update(fst):
    fgh = Focus_Group_Manager(fst)
    # the caller (FST_Keyboard.update_focus_groups) passes the load_config()
    # 3-tuple as a single argument
    fgh.update_groups_from_config(({'cs2': (['--act'], ['-a:b'])},
                                   ['--act 50'], ['-a:b']))

    assert fgh.multi_focus_dict == {'cs2': (['--act'], ['-a:b'])}
    assert list(fgh.multi_focus_dict_keys) == ['cs2']
    assert fgh.default_start_arguments == ['--act 50']
    assert fgh.default_group_lines == ['-a:b']
