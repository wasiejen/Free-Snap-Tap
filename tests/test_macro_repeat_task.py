"""Behavior tests for Macro_Repeat_Task (fst_tasks.py).

Covers the actual repeat loop: the first playback of the alias' key group
happens immediately, the group is replayed on every timeout, the timer
callback is registered with the repeat interval for the overlay, reset()
triggers a replay without stopping the loop and cancel_playback() stops it.
asyncio.wait_for is patched, so no real timing is involved; playback happens
through the mocked FST_Keyboard facade (FakeFST).
"""
import asyncio
import inspect
from unittest.mock import MagicMock, call

import pytest

from fst_data_types import Key_Event
from fst_tasks import Macro_Repeat_Task

VK_A = 0x41


def close_wait(awaitable):
    # the source creates reset_event.wait() per cycle; the patched wait_for
    # never awaits it, so close it to avoid a RuntimeWarning
    if inspect.iscoroutine(awaitable):
        awaitable.close()


def make_repeat_fst(fake_fst):
    """Give the FakeFST the attributes Macro_Repeat_Task touches."""
    group = [Key_Event(VK_A), Key_Event(VK_A, is_press=False)]
    fake_fst.key_group_by_alias = {'al': group}
    fake_fst.start_macro_playback_repeat = MagicMock()
    return group


def build_task(fake_fst, repeat_time=1000, with_overlay=0):
    return Macro_Repeat_Task('al', repeat_time, with_overlay, fake_fst)


@pytest.mark.asyncio
async def test_first_playback_and_repeat_interval(fake_fst, monkeypatch):
    """The alias group is played on start and again on every timeout."""
    group = make_repeat_fst(fake_fst)
    task = build_task(fake_fst, repeat_time=2000)
    intervals = []

    async def fake_wait_for(awaitable, *, timeout):
        close_wait(awaitable)
        intervals.append(timeout)
        if len(intervals) >= 3:
            task.stop_event.set()
        raise asyncio.TimeoutError()

    monkeypatch.setattr(asyncio, 'wait_for', fake_wait_for)
    await task.run()

    assert fake_fst.start_macro_playback_repeat.call_args_list == [call('al', group)] * 3
    # wait timeout is repeat_time ms converted to seconds
    assert intervals == [2.0] * 3
    # without an overlay nothing is registered for display
    fake_fst.timer_callback.assert_not_called()


@pytest.mark.asyncio
async def test_timer_callback_registered_for_interval(fake_fst, monkeypatch):
    group = make_repeat_fst(fake_fst)
    task = build_task(fake_fst, repeat_time=2500, with_overlay=1)

    async def fake_wait_for(awaitable, *, timeout):
        close_wait(awaitable)
        task.stop_event.set()
        raise asyncio.TimeoutError()

    monkeypatch.setattr(asyncio, 'wait_for', fake_wait_for)
    await task.run()

    # 2500 ms repeat -> integer second display, single playback before stop
    fake_fst.timer_callback.assert_called_once_with(
        'al', 2, 12, "rgba(40, 150, 40, 200)", "white")
    assert fake_fst.start_macro_playback_repeat.call_args_list == [call('al', group)]


@pytest.mark.asyncio
async def test_reset_replays_without_stopping(fake_fst, monkeypatch):
    """A set reset_event does not stop the loop: the alias group is replayed
    and the event is cleared so it is re-armable for the next cycle."""
    make_repeat_fst(fake_fst)
    task = build_task(fake_fst, repeat_time=1000)
    waits = []

    async def fake_wait_for(awaitable, *, timeout):
        close_wait(awaitable)
        waits.append(timeout)
        task.reset_event.set()
        if len(waits) >= 2:
            task.stop_event.set()
        return True

    monkeypatch.setattr(asyncio, 'wait_for', fake_wait_for)
    await task.run()

    # one replay per cycle, then stopped - not reset
    assert fake_fst.start_macro_playback_repeat.call_count == 2
    assert not task.reset_event.is_set()
    assert task.stop_event.is_set()


@pytest.mark.asyncio
async def test_cancel_playback_stops_running_loop(fake_fst, monkeypatch):
    group = make_repeat_fst(fake_fst)
    task = build_task(fake_fst, repeat_time=1000, with_overlay=1)
    entered = asyncio.Event()

    async def fake_wait_for(awaitable, *, timeout):
        close_wait(awaitable)
        entered.set()
        await task.stop_event.wait()
        raise asyncio.TimeoutError()

    monkeypatch.setattr(asyncio, 'wait_for', fake_wait_for)
    run = asyncio.create_task(task.run())
    await entered.wait()
    # cancel removes the overlay callback, sets stop and cancels the playback
    task.cancel_playback()
    await run

    # first playback happened before the cancel; no second replay
    assert fake_fst.start_macro_playback_repeat.call_args_list == [call('al', group)]
    fake_fst.remove_callback.assert_called_once_with('al')
    assert task.stop_event.is_set()
    assert not task.reset_event.is_set()


def test_cancel_playback_direct_semantics(fake_fst):
    task = build_task(fake_fst, with_overlay=1)
    task._handle = MagicMock()
    task.cancel_playback()
    assert task.stop_event.is_set()
    task._handle.cancel.assert_called_once_with()
    fake_fst.remove_callback.assert_called_once_with('al')


def test_reset_direct_semantics(fake_fst):
    task = build_task(fake_fst)
    task._handle = MagicMock()
    task.reset()
    assert task.reset_event.is_set()
    assert not task.stop_event.is_set()
    task._handle.cancel.assert_called_once_with()
    # no overlay given -> nothing removed
    fake_fst.remove_callback.assert_not_called()


def test_reset_removes_overlay_callback(fake_fst):
    task = build_task(fake_fst, with_overlay=1)
    task._handle = MagicMock()
    task.reset()
    assert task.reset_event.is_set()
    fake_fst.remove_callback.assert_called_once_with('al')
