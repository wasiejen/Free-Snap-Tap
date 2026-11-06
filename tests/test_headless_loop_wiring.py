"""U375 - headless mode loop wiring and the mode matrix (#373, B1).

Leg 1 (this section, committed BEFORE any wiring change) = verify-first:
reproduce the B1 claim from agent/research/2026-11-06_fst-architecture-
analysis.md sec 6 + todo_inbox 2026-11-06_17-33 with mocked pynput, and
record what ACTUALLY happens on the pre-wiring code.

CLAIM (B1): headless entry (default, no -tray_icon / -status_indicator)
wires no loop: MainLogic.loop stays None (free_snap_tap.py:66; the loop is
created only in start_async_thread :73 which the headless branch never
calls - it runs asyncio.run(logic.run()) :242 on a FOREIGN loop), so
MainLogic.run() calls set_loop(None) (:109) and every DIRECT
run_coroutine_threadsafe site (macro start fst_keyboard.py:1193,
start_repeat fst_manager.py:441, tap delay/crossover fst_manager.py:987,
mouse->mouse rebind fst_keyboard.py:1079) raises AttributeError. The
pump-entry catch-all (fst_keyboard.py:832) swallows the macro-leg error
AFTER alias_fired but BEFORE the suppression landing -> trigger leaks
un-suppressed, macro plays nothing.

Measured verdict (pre-wiring HEAD e711cdf, these pins green): CONFIRMED
for the macro class and the repeat class; CONFIRMED with a nuance for the
tap-delay class: its AttributeError is caught INSIDE
send_keys_for_tap_group (988-989), so the pump-entry catch never sees it -
the trigger stays SUPPRESSED but the delayed replacement send is lost.
pump_lane legs do NOT crash - they take the documented inline fallback.
Honest corrections to the static wording: the pump thread does not die and
the headless mode does not crash the process - the damage is per-event:
macro triggers leak to the app (loop-None crash class), switch legs lose
their send silently. See the estate handover_u375.md for the full table.

No real input anywhere: pynput controllers mocked via kb_env_ns / om_env,
SendInput never touched.
"""
import asyncio
import threading
import time
from types import SimpleNamespace
from unittest import mock
from unittest.mock import MagicMock

import pytest
from pynput import keyboard as pynput_keyboard

from kb_helpers import build, down

VK_A = 0x41
VK_B = 0x42
VK_O = 0x4F
VK_CTRL = 162  # left_control, per tests/test_macro_suppression.py

WM_KEYDOWN = 256


# ---------------------------------------------------------------------------
# Leg 1 - characterization of the PRE-WIRING headless state (honest verdict)
# ---------------------------------------------------------------------------

def key_data(vk, t):
    return SimpleNamespace(vkCode=vk, time=t, flags=0)


@pytest.fixture
def om_env(fake_fst, monkeypatch):
    """Output_Manager with mocked pynput controllers (shape of
    tests/test_pump_async_lane.py::om_env, defined locally - fixtures do
    not cross test files)."""
    from fst_manager import Output_Manager
    kb_mock = MagicMock()
    ms_mock = MagicMock()
    monkeypatch.setattr('pynput.keyboard.Controller', lambda: kb_mock)
    monkeypatch.setattr('pynput.mouse.Controller', lambda: ms_mock)
    manager = Output_Manager(fake_fst)
    fake_fst.output_manager = manager
    return SimpleNamespace(om=manager, kb=kb_mock, mouse=ms_mock, fst=fake_fst)


def make_run_stub_keyboard():
    """Stand-in FST_Keyboard for driving MainLogic.run() (headless path)
    without pynput, Qt, or focus threads."""
    kb = MagicMock()
    kb.arg_manager.STOPPED = False
    kb.focus_manager.init_focus_task.return_value = False
    seen = {}

    def fake_set_loop(loop):
        seen['set_loop'] = loop

    def fake_start_listener():
        seen['running_loop'] = asyncio.get_running_loop()
        kb.arg_manager.STOPPED = True  # end the outer while at next check

    async def fake_toast_pump():
        await asyncio.sleep(0.05)

    kb.set_loop.side_effect = fake_set_loop
    kb.start_listener.side_effect = fake_start_listener
    kb.toast_pump = MagicMock(side_effect=fake_toast_pump)
    return kb, seen


def drive_headless_run(logic, seen):
    """Mirror the headless branch: run MainLogic.run() on the loop the
    branch drives (pre-wiring: a fresh FOREIGN loop, what asyncio.run
    makes; post-wiring: the owned MainLogic.loop), pump turns until the
    listener start marker lands, then cancel - run() parks forever in
    `while True: await asyncio.sleep(3600)` (the product's keep-alive)."""
    loop = logic.loop if logic.loop is not None else asyncio.new_event_loop()
    loop.create_task(logic.run())
    try:
        async def spin():
            for _ in range(100):
                await asyncio.sleep(0)
                if 'running_loop' in seen:
                    return
        loop.run_until_complete(spin())
    finally:
        for t in asyncio.all_tasks(loop):
            t.cancel()
        loop.run_until_complete(asyncio.gather(
            *[t for t in asyncio.all_tasks(loop)], return_exceptions=True))
        loop.close()
    return loop


class TestLeg1HeadlessLoopNone:
    """Pre-wiring state pins - these document what the B1 claim ACTUALLY
    is on HEAD; Leg 2 rewires (loop owned in __init__) and this class
    keeps the loop-None safety-net legs that stay valid after the fix."""

    def test_run_coroutine_threadsafe_on_none_raises_attribute_error(self):
        """Probe pin of the B1 crash class (matches the explorer probe
        $TMP/opencode/u374/rc_none.py on this venv, Python 3.12): passing
        the None loop does not fail with a helpful error - it raises
        AttributeError inside asyncio."""
        async def coro():
            pass

        with pytest.raises(AttributeError):
            asyncio.run_coroutine_threadsafe(coro(), None)

    def test_headless_run_calls_set_loop_with_none(self):
        """Claim part (a) CONFIRMED: on the pre-wiring headless path
        MainLogic.loop is None, so MainLogic.run() hands None to
        FST_Keyboard.set_loop while a real event loop IS running - the
        running loop is simply never assigned to self.loop."""
        from free_snap_tap import MainLogic

        kb, seen = make_run_stub_keyboard()
        logic = MainLogic(kb)
        assert logic.loop is None  # claim part (a): created nowhere
        loop = drive_headless_run(logic, seen)
        # run() reached listener start ON the driven live loop ...
        assert seen['running_loop'] is loop
        # ... but set_loop still got None (the wiring gap)
        assert seen['set_loop'] is None
        assert logic.loop is None

    def test_headless_run_wires_toast_pump_task(self):
        """Counter-claim check (honest scope): the headless path is not
        dead - MainLogic.run() creates the toast pump task on the running
        loop (U345 H2), so the legs that go through pump_lane/get_running
        _loop work; only the sites that read self.loop see None."""
        from free_snap_tap import MainLogic

        kb, seen = make_run_stub_keyboard()
        logic = MainLogic(kb)
        drive_headless_run(logic, seen)
        assert hasattr(logic, 'toast_pump_task')
        assert logic.toast_pump_task is not None
        kb.toast_pump.assert_called_once()

    def test_macro_trigger_loop_none_leaks_unsuppressed(self, kb_env_ns,
                                                          monkeypatch):
        """Claim part (b) CONFIRMED (macro class): the ctrl+o trigger press
        runs start_macro_playback -> run_coroutine_threadsafe(coro, None)
        -> AttributeError; it escapes the filter AFTER alias_fired=True but
        BEFORE the suppression landing, the pump-entry catch-all swallows
        it, and the wrapper returns None = pynput passes the real key
        UNFILTERED to the app while the macro plays nothing."""
        kb = kb_env_ns.kb
        assert kb.loop is None  # FST_Keyboard default, the headless state
        build(kb, macros=[['(m1)', [['-o', '-ctrl'], ['-o', '+ctrl']]]])
        drops = []
        monkeypatch.setattr(
            kb, 'report_event_drop',
            lambda source, vk, press, sim, mouse, exc: drops.append(exc))

        kb.keyboard_win32_event_filter(WM_KEYDOWN, key_data(VK_CTRL, 1000))
        result = kb.keyboard_win32_event_filter(WM_KEYDOWN, key_data(VK_O, 1100))

        # leak: the wrapper returns None (pynput passes the event on) and
        # the trigger suppression NEVER lands (the pump died mid-leg)
        assert result is None
        assert kb._listener.suppress_event.call_count == 0
        # macro plays nothing: playback crashed at scheduling
        assert kb_env_ns.kb_mock.press.call_count == 0
        assert kb._macro_task_dict == {}
        # the death is recorded once as an AttributeError drop
        assert len(drops) == 1
        assert isinstance(drops[0], AttributeError)

    def test_tap_switch_delay_leg_loop_none_loses_send(self, kb_env_ns):
        """Claim part (c) CONFIRMED with nuance (tap-delay class): the
        AttributeError of the delayed/crossover send is caught INSIDE
        send_keys_for_tap_group (no pump-entry drop) - the switch send is
        lost while the trigger stays suppressed. The loop-None fallback
        can run plain inline sends but NEVER the delay/crossover
        coroutine, so the replacement vanishes silently."""
        kb = kb_env_ns.kb
        kb.arg_manager.ACT_DELAY = True
        build(kb, taps=[['(TAP_1)', ['a', 'b']]])

        down(kb, VK_A, 1000)   # first press: inline press lands, last=A
        down(kb, VK_B, 1200)   # SWITCH with A still held, ACT_DELAY on
                               # -> coroutine leg -> AttributeError caught
                               # inside send_keys_for_tap_group

        # the delayed switch send (release A + press B) vanished: the key
        # B press never touched the controller at all (NOTE: kb_mock is a
        # MagicMock - a typo'd assert_not_called_with would silently pass)
        assert mock.call.press(pynput_keyboard.KeyCode.from_vk(VK_B)) \
            not in kb_env_ns.kb_mock.method_calls
        # B stayed suppressed (trigger eaten, replacement lost)
        assert kb._listener.suppress_event.called

    def test_start_repeat_loop_none_raises_through_eval(self, om_env):
        """Claim part (b) CONFIRMED (repeat class): start_repeat schedules
        directly (fst_manager.py:441, no try/except), so with the loop
        None the AttributeError propagates out of the whole constraint
        eval - in the real flow up into the pump-entry catch-all = the
        same trigger-leak class as the macro leg."""
        om_env.fst.loop = None
        with pytest.raises(AttributeError):
            om_env.om.constraint_evaluation(
                "start_repeat('m1', 100)",
                SimpleNamespace(vk_code=VK_A, is_press=True))


# ---------------------------------------------------------------------------
# Leg 2 pins - wired-loop parity (RED-before: written against the
# pre-wiring code, these MUST fail until MainLogic owns the loop).
# ---------------------------------------------------------------------------


class TestLeg2LoopWiring:
    """Post-wiring contract: MainLogic owns ONE loop from construction in
    every startup mode, the headless branch runs THAT loop, and
    FST_Keyboard receives the live loop before the listener starts, so
    the direct run_coroutine_threadsafe sites schedule instead of
    raising."""

    def test_mainlogic_owns_loop_from_construction(self):
        from free_snap_tap import MainLogic

        kb = MagicMock()
        logic = MainLogic(kb)
        assert logic.loop is not None
        assert isinstance(logic.loop, asyncio.AbstractEventLoop)

    def test_headless_branch_runs_owned_loop_and_wires_keyboard(self):
        """The headless startup must run on the OWNED MainLogic.loop (RED
        pre-wiring: run_headless does not exist / loop is None). run() is
        stubbed here - the run() side wiring (set_loop(self.loop) reaching
        a live loop) is pinned by test_run_headless_wires_set_loop_to_owned
        _loop below; this pin locks run_headless: owned loop runs it, the
        loop is closed on shutdown (asyncio.run parity)."""
        from free_snap_tap import MainLogic

        kb = MagicMock()
        logic = MainLogic(kb)
        seen = {}

        async def stub_run():
            seen['running_loop'] = asyncio.get_running_loop()

        logic.run = stub_run
        logic.run_headless()
        assert seen['running_loop'] is logic.loop
        # the owned loop was closed on shutdown (asyncio.run parity)
        assert logic.loop.is_closed()

    def test_run_headless_wires_set_loop_to_owned_loop(self):
        """Full headless path (real MainLogic.run on the owned loop): set
        _loop must hand FST_Keyboard the loop that actually runs, and it
        must be MainLogic.loop - the macro/repeat sites read that
        attribute, so this IS the B1 fix at the wiring level. run() parks
        in the keep-alive sleep, so the test schedules loop.stop() 0.2 s
        in (the test-side Ctrl+C: run_until_complete then raises
        RuntimeError before run() returns; the real Ctrl+C raises
        KeyboardInterrupt, which run_headless handles)."""
        from free_snap_tap import MainLogic

        kb, seen = make_run_stub_keyboard()
        logic = MainLogic(kb)
        logic.loop.call_later(0.2, logic.loop.stop)
        with pytest.raises(RuntimeError):
            logic.run_headless()
        assert seen['set_loop'] is logic.loop
        assert seen['running_loop'] is logic.loop
        assert logic.loop.is_closed()

    def test_wired_macro_trigger_schedules_on_lane(self, kb_env_ns):
        """The fix at the lane level: with FST_Keyboard.loop wired to a
        live loop, the macro trigger suppresses the source event
        synchronously on the pump AND the macro task runs on the lane
        thread - the leak pin above and this pin differ ONLY in the loop
        wiring, which is exactly the parity claim."""
        kb = kb_env_ns.kb
        loop = asyncio.new_event_loop()
        th = threading.Thread(target=loop.run_forever, daemon=True)
        th.start()
        try:
            kb.set_loop(loop)
            build(kb, macros=[['(m1)', [['-o', '-ctrl'], ['-o', '+ctrl']]]])
            press_seen = []
            kb_env_ns.kb_mock.press.side_effect = \
                lambda kc: press_seen.append(threading.current_thread().name)

            kb.keyboard_win32_event_filter(WM_KEYDOWN, key_data(VK_CTRL, 1000))
            kb.keyboard_win32_event_filter(WM_KEYDOWN, key_data(VK_O, 1100))

            assert kb._listener.suppress_event.call_count == 1  # no leak
            assert 'm1' in kb._macro_task_dict                 # scheduled
            # lane execution: the macro's first send lands on the lane
            t_end = time.monotonic() + 2.0
            while not press_seen and time.monotonic() < t_end:
                time.sleep(0.005)
            assert press_seen, 'macro never played on the lane'
            assert press_seen[0] != threading.current_thread().name
        finally:
            loop.call_soon_threadsafe(loop.stop)
            th.join(2)
            loop.close()

    def test_main_block_headless_branch_uses_run_headless(self):
        """Entry-shape pin (RED pre-wiring: the branch still calls
        asyncio.run(logic.run())): the headless else-branch must wire the
        toast offload with NO bridge and hand startup to
        MainLogic.run_headless() - the one place that runs the owned
        loop. Exec harness borrowed from
        tests/test_config_validator.py::TestGuiBranchWiring."""
        logic_mock = MagicMock()
        order, _kb, _gui, _created = self._exec_main_block(
            tray=False, indicator=False, logic_factory=lambda k: logic_mock)
        logic_mock.run_headless.assert_called_once()
        # offload wired WITHOUT a bridge (posts become drop-counted no-ops)
        assert order == ['offload_none', 'run_headless']

    @staticmethod
    def _exec_main_block(tray, indicator, logic_factory):
        import importlib.util
        import textwrap
        import types

        spec = importlib.util.find_spec('free_snap_tap')
        with open(spec.origin, encoding='utf-8') as fh:
            lines = fh.read().splitlines()
        marker = 'if __name__ == "__main__":'
        start = lines.index(marker) + 1
        code = compile(textwrap.dedent('\n'.join(lines[start:])),
                       spec.origin, 'exec')

        kb = MagicMock()
        kb.arg_manager.TRAY_ICON = tray
        kb.arg_manager.STATUS_INDICATOR = indicator
        kb.arg_manager.CMD_WINDOW_HIDDEN = True
        order = []

        def _offload(bridge):
            order.append('offload_none' if bridge is None else ('offload', bridge))

        kb.init_toast_offload.side_effect = _offload

        class FakeThread:
            def __init__(self, target=None, daemon=None):
                self.target = target

            def start(self):
                pass

        def run_headless():
            order.append('run_headless')

        logic_mock = logic_factory(kb) if logic_factory else MagicMock()
        logic_mock.run_headless.side_effect = run_headless

        gui_created = []
        gui_stub = MagicMock()

        def fake_asyncio_run(coro):
            order.append('asyncio.run')
            coro.close()

        globs = {
            '__name__': '__main__',
            'asyncio': SimpleNamespace(run=fake_asyncio_run),
            'setup_fst_logging': lambda: None,
            'logger': MagicMock(),
            'set_console_visibility': lambda flag: None,
            'FST_Keyboard': lambda: kb,
            'sys': types.SimpleNamespace(argv=['free_snap_tap.py'],
                                         exit=lambda code=0: (_ for _ in ()).throw(SystemExit(code))),
            'ConfigError': __import__('fst_data_types').ConfigError,
            'MainLogic': logic_factory or (lambda k: logic_mock),
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
        return order, kb, gui_stub, gui_created

    def test_main_block_both_modes_shows_tray_and_overlay(self):
        order, kb, gui_stub, gui_created = self._exec_main_block(
            tray=True, indicator=True, logic_factory=None)
        assert gui_created == ['app', 'gui']
        gui_stub.tray_icon.show.assert_called_once()
        gui_stub.overlay.show.assert_called_once()
        gui_stub.start.assert_called_once()  # Qt event loop entered

    def test_main_block_tray_only_shows_no_overlay(self):
        order, kb, gui_stub, gui_created = self._exec_main_block(
            tray=True, indicator=False, logic_factory=None)
        gui_stub.tray_icon.show.assert_called_once()
        gui_stub.overlay.show.assert_not_called()

    def test_main_block_indicator_only_shows_no_tray(self):
        order, kb, gui_stub, gui_created = self._exec_main_block(
            tray=False, indicator=True, logic_factory=None)
        gui_stub.tray_icon.show.assert_not_called()
        gui_stub.overlay.show.assert_called_once()


# ---------------------------------------------------------------------------
# Leg 3 - mode matrix on the real Qt objects (offscreen): no crash per mode
# ---------------------------------------------------------------------------


@pytest.fixture
def overlay_fst():
    """Stand-in fst for the real GUI_Manager (shape of
    tests/test_gui_manager.py::fst, defined locally)."""
    return SimpleNamespace(
        arg_manager=SimpleNamespace(
            MANUAL_PAUSED=False,
            WIN32_FILTER_PAUSED=False,
            CROSSHAIR_ENABLED=False,
            STATUS_INDICATOR=True,
            ALWAYS_ACTIVE=False,
            TRAY_ICON=True,
            STATUS_INDICATOR_SIZE=10,
        ),
        focus_manager=SimpleNamespace(FOCUS_APP_NAME=''),
        config_manager=SimpleNamespace(file_name=''),
        open_config_file=MagicMock(),
        reload_from_file=MagicMock(),
        control_toggle_pause=MagicMock(),
        control_return_to_menu=MagicMock(),
        control_exit_program=MagicMock(),
        display_internal_repr_groups=MagicMock(),
        toast_callback=MagicMock(),
    )


class TestModeMatrixQt:
    """Real Tray_Icon/StatusOverlay/ToastManager under offscreen Qt for
    each GUI mode combo: the exact show sequence free_snap_tap's GUI
    branch performs + perform_periodic_update passes (crash check only -
    no feature claims)."""

    def _make_manager(self, qtbot, fst, tray, indicator):
        from unittest.mock import MagicMock as MM
        fst.arg_manager.TRAY_ICON = tray
        fst.arg_manager.STATUS_INDICATOR = indicator
        from fst_overlay import GUI_Manager
        m = GUI_Manager(fst, MM())
        qtbot.addWidget(m)
        return m, fst

    def _entry_show_sequence(self, m, fst, tray, indicator):
        # the GUI branch of free_snap_tap: show tray per flag, overlay per
        # flag, then the periodic update tick (update_timer's slot)
        if tray:
            m.tray_icon.show()
        if indicator:
            m.overlay.show()
        m.perform_periodic_update()

    def test_indicator_only_mode_starts_without_tray(self, qtbot, overlay_fst):
        m, fst = self._make_manager(qtbot, overlay_fst,
                                     tray=False, indicator=True)
        self._entry_show_sequence(m, fst, tray=False, indicator=True)
        assert m.overlay.isVisible()  # indicator-only: the dot is visible
        # color pass runs with the tray present-but-hidden: no crash
        fst.arg_manager.MANUAL_PAUSED = True
        m.perform_periodic_update()
        assert m.overlay.color_name == 'red'

    def test_tray_only_mode_starts(self, qtbot, overlay_fst):
        m, fst = self._make_manager(qtbot, overlay_fst,
                                     tray=True, indicator=False)
        self._entry_show_sequence(m, fst, tray=True, indicator=False)
        assert m.tray_icon is not None
        # honest matrix fact (pre-existing quirk, crash-only rule -> noted,
        # not fixed): StatusOverlay.__init__ calls self.show() itself, so
        # the tray-only product shows the indicator dot even with
        # -status_indicator OFF until a manual toggle; the periodic update
        # only reacts to TRANSITIONS of the flag, and at init flag == False
        # == manager.status, so nothing hides it.
        assert m.overlay.isVisible() is True

    def test_both_modes_start_with_update_color_pass(self, qtbot, overlay_fst):
        m, fst = self._make_manager(qtbot, overlay_fst,
                                     tray=True, indicator=True)
        self._entry_show_sequence(m, fst, tray=True, indicator=True)
        assert m.overlay.isVisible()
        fst.arg_manager.ALWAYS_ACTIVE = True
        fst.arg_manager.MANUAL_PAUSED = False
        # focus_name '' + ALWAYS_ACTIVE -> blue pass recolors BOTH widgets
        fst.focus_manager.FOCUS_APP_NAME = 'x'  # force a change detection
        m.perform_periodic_update()
        fst.focus_manager.FOCUS_APP_NAME = ''
        m.perform_periodic_update()
        assert m.tray_icon.color == 'blue'
        assert m.overlay.color_name == 'blue'
