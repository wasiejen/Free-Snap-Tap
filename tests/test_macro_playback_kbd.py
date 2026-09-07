"""FST_Keyboard macro playback scheduling (start_macro_playback) and the
macro_task error path. The asyncio loop is the test's running loop; pynput
controllers are mocked so no real input is emitted.
"""
import concurrent.futures
from unittest.mock import MagicMock

import asyncio
import pytest

from fst_data_types import Key_Event
from fst_keyboard import FST_Keyboard

VK_B = 0x42


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


class TestStartMacroPlayback:
    @pytest.mark.asyncio
    async def test_schedules_macro_task_on_running_loop(self, kb_env, monkeypatch):
        kb = kb_env
        kb.loop = asyncio.get_running_loop()

        async def fake_sleep(t):
            loop = asyncio.get_running_loop()
            fut = loop.create_future()
            loop.call_soon(fut.set_result, None)
            await fut

        monkeypatch.setattr(asyncio, 'sleep', fake_sleep)
        seq = [Key_Event(VK_B, constraints=[5, 5])]

        handle = kb.start_macro_playback('m', seq)

        assert isinstance(handle, concurrent.futures.Future)
        assert handle is kb.macro_thread_dict['m']
        # let the scheduled task run, then cancel any remainder for a clean loop
        for _ in range(10):
            await asyncio.sleep(0)
        if not handle.done():
            handle.cancel()

    @pytest.mark.asyncio
    async def test_macro_task_logs_and_swallows_errors(self, kb_env):
        kb = kb_env
        kb.loop = asyncio.get_running_loop()

        async def boom(key_event, *args, **kwargs):
            raise RuntimeError('boom')

        kb.output_manager.execute_key_event = boom

        # must not propagate: macro_task catches and logs the exception
        await kb.macro_task([Key_Event(VK_B, constraints=[5, 5])], 'm')
