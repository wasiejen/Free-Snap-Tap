"""FST_Keyboard macro playback scheduling (start_macro_playback), the
macro_task error path, and the check_result done-callback. The asyncio loop
is the test's running loop; pynput controllers are mocked so no real input
is emitted.
"""
import concurrent.futures
import logging
from unittest.mock import MagicMock

import asyncio
import pytest

from fst_data_types import Key_Event

VK_B = 0x42


class TestStartMacroPlayback:
    @pytest.mark.asyncio
    async def test_schedules_macro_task_on_running_loop(self, kb_env_plain, monkeypatch):
        kb = kb_env_plain
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
    async def test_macro_task_logs_and_swallows_errors(self, kb_env_plain):
        kb = kb_env_plain
        kb.loop = asyncio.get_running_loop()

        async def boom(key_event, *args, **kwargs):
            raise RuntimeError('boom')

        kb.output_manager.execute_key_event = boom

        # must not propagate: macro_task catches and logs the exception
        await kb.macro_task([Key_Event(VK_B, constraints=[5, 5])], 'm')


class TestCheckResult:
    """check_result done-callback: task crashes are logged, intentional
    cancels (interrupt/reset) are silent."""

    def _future_with(self, exc):
        fut = MagicMock()
        fut.result.side_effect = exc
        return fut

    def test_task_crash_is_logged(self, kb_env_plain, caplog):
        kb = kb_env_plain
        with caplog.at_level(logging.ERROR, logger='fst.macro'):
            kb.check_result(self._future_with(RuntimeError('boom')))
        assert 'Exception in macro task' in caplog.text

    def test_cancelled_task_is_not_logged_as_error(self, kb_env_plain, caplog):
        kb = kb_env_plain
        with caplog.at_level(logging.ERROR, logger='fst.macro'):
            kb.check_result(self._future_with(asyncio.CancelledError()))
        assert 'Exception in macro task' not in caplog.text
