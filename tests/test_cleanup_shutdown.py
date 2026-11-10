"""U384 - MainLogic.cleanup runs exactly once on every shutdown path (#384).

RED-before pins, run against the untouched base (fst_combined tip
dcc48f7) BEFORE the fix; the measured RED evidence lives in the estate
worker handover (agent/handover/handover_task_to_planner.md, U384):

- GUI path: the __main__ GUI branch entered the Qt event loop and never
  handed shutdown back to MainLogic. The loop thread's
  `finally: self.cleanup` is a bound-method reference WITHOUT parens
  (latent no-op), and a daemon thread killed at process exit runs NO
  finally at all - on the base cleanup NEVER runs on GUI close, and no
  shutdown() leg exists (AttributeError = the RED marker there).
- Headless path: run_headless caught KeyboardInterrupt and returned;
  no cleanup leg - listeners were never stopped, the input buffer was
  never flushed through cleanup.
- cleanup() itself was unguarded: two callers would run the legs twice
  (base: direct double call -> stop_listener call_count == 2).

Post-change contract (green on the u384 branch): MainLogic.cleanup runs
EXACTLY ONCE on every shutdown path - guarded cleanup; the loop-thread
finally (run_forever stop); the headless finally; and the main-block GUI
leg logic.shutdown() (stop + join the loop thread, then guarded
cleanup). No real input anywhere: pynput controllers mocked via
MagicMock stand-ins, no listener is ever started or stopped for real.
"""
import asyncio
import importlib.util
import textwrap
import threading
import time
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest


def cancel_and_close(loop):
    """Teardown helper (shape of tests/test_headless_loop_wiring.py):
    cancel pending tasks BEFORE closing, else loop.close() logs ERROR
    'Task was destroyed but it is pending'."""
    if loop.is_closed():
        return
    for t in asyncio.all_tasks(loop):
        t.cancel()
    pending = [t for t in asyncio.all_tasks(loop) if not t.done()]
    if pending:
        loop.run_until_complete(asyncio.gather(*pending,
                                               return_exceptions=True))
    loop.close()


def make_run_stub_keyboard():
    """Stand-in FST_Keyboard for driving the real MainLogic.run() without
    pynput, Qt, or focus threads (shape of the U375 file)."""
    kb = MagicMock()
    kb.arg_manager.STOPPED = False
    kb.focus_manager.init_focus_task.return_value = False
    seen = {}

    def fake_start_listener():
        seen['running_loop'] = asyncio.get_running_loop()

    async def fake_toast_pump():
        await asyncio.sleep(0.05)

    kb.start_listener.side_effect = fake_start_listener
    kb.toast_pump = MagicMock(side_effect=fake_toast_pump)
    return kb, seen


# ---------------------------------------------------------------------------
# Headless shutdown path
# ---------------------------------------------------------------------------


class TestHeadlessCleanupPath:
    def test_run_headless_keyboard_interrupt_runs_cleanup(self):
        """Ctrl+C headless exit: run_headless catches KeyboardInterrupt and
        must then run cleanup ONCE (listeners stopped via the keyboard
        facade, input buffer flushed); the Runner still closes the owned
        loop (asyncio.run parity kept from U375).
        RED before: no cleanup leg in run_headless -> stop_listener and
        flush_the_input_buffer are never called."""
        from free_snap_tap import MainLogic

        kb = MagicMock()
        logic = MainLogic(kb)

        async def stub_run():
            raise KeyboardInterrupt  # the console-interrupt surface

        logic.run = stub_run
        logic.run_headless()  # must NOT raise

        assert kb.stop_listener.call_count == 1
        assert kb.cli_menu.flush_the_input_buffer.call_count == 1
        assert logic.loop.is_closed()


# ---------------------------------------------------------------------------
# GUI loop-thread shutdown path
# ---------------------------------------------------------------------------


class TestLoopThreadCleanupPath:
    def test_start_async_thread_cleanup_on_loop_stop(self):
        """GUI-mode logic thread: when run_forever returns (the GUI-side
        shutdown() stops the loop, or a test-side stop as here), the
        thread's finally must run cleanup ONCE and close the loop.
        RED before: `finally: self.cleanup` (no parens) is a no-op ->
        stop_listener never called, the loop left unclosed."""
        from free_snap_tap import MainLogic

        kb, seen = make_run_stub_keyboard()
        logic = MainLogic(kb)
        th = threading.Thread(target=logic.start_async_thread, daemon=True)
        th.start()
        try:
            t_end = time.monotonic() + 2.0
            while 'running_loop' not in seen and time.monotonic() < t_end:
                time.sleep(0.005)
            assert 'running_loop' in seen
            logic.loop.call_soon_threadsafe(logic.loop.stop)
            th.join(2)
            assert not th.is_alive()
            assert kb.stop_listener.call_count == 1
            assert kb.cli_menu.flush_the_input_buffer.call_count == 1
            assert logic.loop.is_closed()
        finally:
            # RED-run hygiene: the pre-fix thread never closes, so the
            # ledger stays clean regardless of which leg failed
            cancel_and_close(logic.loop)


# ---------------------------------------------------------------------------
# Main-block GUI leg (exec harness, shape of
# tests/test_headless_loop_wiring.py::_exec_main_block)
# ---------------------------------------------------------------------------


class TestGuiMainBlockShutdown:
    @staticmethod
    def _exec_gui_main_block(order, gui_start_side_effect):
        spec = importlib.util.find_spec('free_snap_tap')
        with open(spec.origin, encoding='utf-8') as fh:
            lines = fh.read().splitlines()
        marker = 'if __name__ == "__main__":'
        start = lines.index(marker) + 1
        code = compile(textwrap.dedent('\n'.join(lines[start:])),
                       spec.origin, 'exec')

        kb = MagicMock()
        kb.arg_manager.TRAY_ICON = True
        kb.arg_manager.STATUS_INDICATOR = False
        kb.arg_manager.CMD_WINDOW_HIDDEN = True

        def _offload(bridge):
            order.append('offload')

        kb.init_toast_offload.side_effect = _offload

        class FakeThread:
            def __init__(self, target=None, daemon=None):
                self.target = target

            def start(self):
                pass  # never runs the logic thread

        logic = MagicMock()
        logic.shutdown.side_effect = lambda *a: order.append('shutdown')

        gui_created = []
        gui_stub = MagicMock()

        def fake_start(*a):
            order.append('qt_loop')
            if gui_start_side_effect is not None:
                raise gui_start_side_effect

        gui_stub.start.side_effect = fake_start

        globs = {
            '__name__': '__main__',
            'asyncio': SimpleNamespace(run=lambda coro: coro.close()),
            'setup_fst_logging': lambda: None,
            'logger': MagicMock(),
            'set_console_visibility': lambda flag: None,
            'FST_Keyboard': lambda: kb,
            'sys': SimpleNamespace(argv=['free_snap_tap.py'],
                                   exit=lambda code=0: (_ for _ in ()).throw(
                                       SystemExit(code))),
            'ConfigError': __import__('fst_data_types').ConfigError,
            'MainLogic': lambda k: logic,
            'sleep': lambda s: None,
            'Thread': FakeThread,
            'QApplication': lambda args: gui_created.append('app') or MagicMock(),
            'GUI_Manager': lambda k, app: gui_created.append('gui') or gui_stub,
            'ToastBridge': lambda: MagicMock(),
            'surface_startup_config_result': lambda k: order.append('compliance'),
            'surface_startup_activation': lambda k: order.append('activation'),
        }
        with pytest.raises(SystemExit):
            exec(code, globs)
        return logic

    def test_gui_branch_shuts_logic_down_after_normal_qt_loop_return(self):
        """app.quit() without a raising slot makes gui_manager.start()
        RETURN; the GUI branch must still hand shutdown to the logic
        (logic.shutdown(), exactly once) before the script-exit line.
        RED before: no shutdown leg exists -> AttributeError on the
        mocked logic AND the order lacks 'shutdown'."""
        order = []
        logic = self._exec_gui_main_block(order, None)
        logic.shutdown.assert_called_once_with()
        # 'offload' = init_toast_offload wiring leg recorded by the
        # harness (same shape as the U375 headless branch pin)
        assert order == ['offload', 'compliance', 'activation', 'qt_loop',
                         'shutdown']

    def test_gui_branch_shuts_logic_down_through_systemexit(self):
        """The tray Exit shape (GUI_Manager.exit_program): control_exit_program
        -> app.quit() -> sys.exit(0) raises SystemExit INSIDE the Qt slot;
        gui_manager.start() does NOT return normally - the shutdown leg
        must ride a finally so it runs on the raising path too.
        RED before: no shutdown leg -> call_count 0."""
        order = []
        logic = self._exec_gui_main_block(order, SystemExit(0))
        logic.shutdown.assert_called_once_with()
        assert 'shutdown' in order
        assert order[-1] == 'shutdown'


# ---------------------------------------------------------------------------
# Double-cleanup guard
# ---------------------------------------------------------------------------


class TestCleanupGuard:
    def test_cleanup_runs_exactly_once_on_double_call(self, capsys):
        """The guard itself: two cleanup() calls (the loop-thread finally
        AND a main-thread caller can both reach it) run the resource legs
        ONCE. RED before: cleanup is unguarded -> call_count 2 each.
        The capsys pins keep the two shutdown prints on the normal path
        and pin the second call silent (reviewer P2-4: the degraded
        join-timeout path must not claim the thread exited)."""
        from free_snap_tap import MainLogic

        kb = MagicMock()
        logic = MainLogic(kb)
        logic = MainLogic(kb)
        logic.cleanup()
        logic.cleanup()
        assert kb.stop_listener.call_count == 1
        assert kb.cli_menu.flush_the_input_buffer.call_count == 1
        assert logic.loop.is_closed()
        out = capsys.readouterr().out
        assert 'Cleaning up resources...' in out
        assert 'Secondary thread fully exited.' in out
        # the second, guarded call printed nothing more
        assert out.count('Cleaning up resources...') == 1

    def test_cleanup_leg_failure_does_not_block_remaining_legs(self):
        """U384 reviewer P1 cure (RED against branch tip 8034889 before
        the cure): Ctrl+C headless BEFORE run() reaches init_listener ->
        stop_listener hits the never-initialized None listener and
        raises. The flag was set before the legs, so the flush leg never
        ran, the loop stayed open, and a second cleanup() no-oped
        forever. Isolated legs: a raising listener leg must still let
        flush + loop close run, and the exactly-once guard still holds
        afterwards (second call no-ops)."""
        from free_snap_tap import MainLogic

        kb = MagicMock()
        kb.stop_listener.side_effect = RuntimeError('listener not started')
        logic = MainLogic(kb)
        logic.cleanup()  # must NOT raise out of the shutdown finally
        assert kb.cli_menu.flush_the_input_buffer.call_count == 1
        assert logic.loop.is_closed()
        logic.cleanup()
        assert kb.cli_menu.flush_the_input_buffer.call_count == 1

    def test_headless_path_then_shutdown_cleanup_still_once(self):
        """Cross-path composition: the headless finally already ran
        cleanup; a later shutdown() (loop thread never registered) and a
        stray cleanup() must both no-op - the legs run exactly ONCE.
        RED before: shutdown() does not exist (AttributeError) and the
        unguarded cleanup re-runs the legs."""
        from free_snap_tap import MainLogic

        kb = MagicMock()
        logic = MainLogic(kb)

        async def stub_run():
            raise KeyboardInterrupt

        logic.run = stub_run
        logic.run_headless()
        logic.shutdown()
        logic.cleanup()
        assert kb.stop_listener.call_count == 1
        assert kb.cli_menu.flush_the_input_buffer.call_count == 1
