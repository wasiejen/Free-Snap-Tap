"""F-A2 red-before pins: pump-thread races and lifecycle no-ops (PINS ONLY).

Scope: proposals/2026-11-14_fst-architecture-review.md Items 1/2/3, scheduled
by proposals/2026-11-15_fst-improvement-plan.md Phase A (fix units F-A3 atomic
snapshot swap, F-A4 reload/control marshaling, F-A5 lifecycle state machine).
This file changes NO product behavior: every lane states a requirement its fix
unit has not met yet, so the fix lands on a pin that already names the contract.

Flavors (the estate plan file carries the name/target/flavor table):
  RED  - strict xfail marker naming the fix unit. The requirement assert fails
         on today's code. When the fix lands the test XPASSes, and strict=True
         turns that XPASS into a gate failure - that is the alarm that forces
         the move into a normal test file (repo_testgate.md xfail doctrine).
         A strict marker is chosen over an imperative pytest.xfail call exactly
         for that alarm: a red-before pin whose fix silently turns it green
         without demanding a review is a lost pin.
  CHAR - green characterization pin of TODAY's interleaving. It states no
         approval of the behavior; it documents the window a fix must close.
         It flips RED when the fix lands (red-for-the-fix) and must then be
         rewritten against the fixed contract.

Harness rules: no real LL hooks (the conftest kb_env_* fixtures mock the pynput
controllers and the listener; this file never calls start_listener), no real
console spawn (fst_manager.system replaced by a recorder), no config file in the
product CWD (tmp_path config + monkeypatch.chdir, WM-81/WM-119 class), and no
fixed sleeps for ordering: every ordering fact is a threading.Event handshake,
a bounded wait for a POSITIVE marker, or a bounded scheduler budget. Negative
claims ("the menu was not re-shown", "the loop did not exit") are structural
consequences of a deterministic park, not timed observations.
"""
import asyncio
import builtins
import importlib.util
import subprocess
import textwrap
import threading
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from pynput import keyboard as pynput_keyboard

import fst_manager
from kb_helpers import build

VK_A = 0x41
VK_B = 0x42
VK_C = 0x43

WM_KEYDOWN = 256

# bounded waits for POSITIVE markers only (thread entered the seam / joined)
SEAM_WAIT_SECONDS = 2.0


def key_data(vk, t=1000, flags=0):
    """Minimal KBDLLHOOKSTRUCT stand-in for keyboard_win32_event_filter."""
    return SimpleNamespace(vkCode=vk, time=t, flags=flags)


def cancel_and_close(loop):
    """Teardown helper (same shape as tests/test_headless_loop_wiring.py):
    cancel pending lane/keep-alive tasks BEFORE closing, else loop.close()
    logs 'Task was destroyed but it is pending'."""
    if loop.is_closed():
        return
    for task in asyncio.all_tasks(loop):
        task.cancel()
    pending = [t for t in asyncio.all_tasks(loop) if not t.done()]
    if pending:
        loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
    loop.close()


def press_count(kb_mock, vk):
    """Count presses of one vk on the mocked pynput keyboard controller.
    Method-call arithmetic, never a hand-typed assert_not_called_with (WM-101)."""
    target = pynput_keyboard.KeyCode.from_vk(vk)
    return sum(1 for c in kb_mock.method_calls
               if c[0] == 'press' and c[1] and c[1][0] == target)


# ---------------------------------------------------------------------------
# seam harness: park a rebuild between its container clear and its refill
# ---------------------------------------------------------------------------

class RebuildSeam:
    """Test seam that stops a rebuild mid-flight, after the clear of
    FST_Keyboard.initialize_groups_from_presorted_lines (fst_keyboard.py:401-414)
    and before the refill of the runtime containers.

    No product change: the seam wraps the keyboard instance's
    convert_to_vk_code, which the rebuild calls for every key string it parses
    (fst_keyboard.py:461, :519) but the filter hot path does not call for
    numeric vk events. Only calls from the parked rebuild thread are gated, so
    the pump-thread event the test fires is never blocked by the seam.
    """

    def __init__(self, kb):
        self.kb = kb
        self.rebuild_thread = None
        self.inside = threading.Event()
        self.release = threading.Event()
        self.parsed = []
        self._real = kb.convert_to_vk_code
        kb.convert_to_vk_code = self._gated

    def _gated(self, key_string):
        if threading.current_thread() is self.rebuild_thread:
            self.parsed.append(key_string)
            self.inside.set()
            assert self.release.wait(SEAM_WAIT_SECONDS), "seam release never came"
        return self._real(key_string)

    def start_rebuild(self, thread_name='fst-rebuild-seam'):
        """Run one full rebuild on its own thread and park it at the first key
        it parses. Returns after the park is observed (positive marker, no
        sleep)."""
        self.rebuild_thread = threading.Thread(
            target=self.kb.initialize_groups_from_presorted_lines,
            name=thread_name, daemon=True)
        self.rebuild_thread.start()
        assert self.inside.wait(SEAM_WAIT_SECONDS), (
            "the rebuild never reached convert_to_vk_code - the seam did not "
            "catch it inside the parse")

    def finish(self):
        """Release the parked rebuild and join it (bounded, positive marker)."""
        self.release.set()
        self.rebuild_thread.join(SEAM_WAIT_SECONDS)
        assert not self.rebuild_thread.is_alive(), "parked rebuild outlived the join"
        self.rebuild_thread = None


# ===========================================================================
# P1 - reload race: an event must see a complete generation, never a torn one
#      (review Item 1 / unit F-A3)
# ===========================================================================

REBIND_ONLY = [['(r)', [['-a'], '-b']]]


def _load_rebind_generation(kb):
    """Load one generation of the rebind a -> b and assert it is complete.
    True before and after the fix: the harness precondition, not a claim."""
    build(kb, rebinds=REBIND_ONLY)
    assert len(kb._rebind_triggers) == 1
    assert len(kb._rebinds_dict) == 1
    return kb._rebinds_dict[kb._rebind_triggers[0]].replacement.vk_code


def _fire_pump_press(kb, vk, t):
    """One real keydown through the pump entry point (the same call pynput's
    win32_event_filter makes), with the drop leg spied."""
    drops = []
    kb.report_event_drop = lambda source, vk_code, is_press, is_simulated, \
        is_mouse, exc: drops.append(exc)
    kb.keyboard_win32_event_filter(WM_KEYDOWN, key_data(vk, t))
    return drops


class TestP1ReloadRace:

    @pytest.mark.xfail(
        strict=True,
        reason="F-A3 (Item 1): a keydown landing while "
               "initialize_groups_from_presorted_lines has cleared the runtime "
               "containers but not refilled them is neither filtered by the old "
               "generation nor by the new one - measured 2026-11-15 on 047be73: "
               "replacement presses = 0, suppress_event = 0 (the event reaches "
               "the app unfiltered) instead of 1/1")
    def test_event_during_rebuild_is_filtered_by_a_complete_generation(self,
                                                                      kb_env_ns):
        """RED (Item 1 / F-A3). Old generation = new generation (same config,
        one reload): the pump event must behave exactly as it does with the
        config loaded, which is what "old-or-new but never neither" means when
        the two generations agree.

        Today the pump sees the CLEARED containers: no rebind trigger, so the
        trigger key passes unfiltered and its replacement is never sent - a
        state that belongs to no generation at all. F-A3 swaps a fully built
        snapshot in one assignment, so the pump can only ever hold a complete
        old or a complete new reference."""
        kb = kb_env_ns.kb
        vk_replacement = _load_rebind_generation(kb)

        seam = RebuildSeam(kb)
        try:
            seam.start_rebuild()

            kb_env_ns.kb_mock.reset_mock()
            kb._listener.suppress_event.reset_mock()
            drops = _fire_pump_press(kb, VK_A, 5000)
            observed = (press_count(kb_env_ns.kb_mock, vk_replacement),
                        kb._listener.suppress_event.call_count)

            seam.finish()
        finally:
            seam.release.set()

        # harness facts, true before and after the fix: the seam really parked
        # the rebuild, the rebuild completed to a consistent generation, and the
        # mid-rebuild event died no leg (a silent pass-through, not a crash).
        assert seam.parsed[:1] == ['a'], seam.parsed
        assert len(kb._rebind_triggers) == 1 and len(kb._rebinds_dict) == 1
        assert drops == [], drops

        assert observed == (1, 1), (
            "the event fired inside the rebuild saw neither generation: "
            f"replacement presses/suppressions = {observed}, expected (1, 1) "
            "as in the fully loaded config (Item 1 / F-A3).")

    def test_rebuild_tears_down_the_live_generation_before_refilling_it(self,
                                                                       kb_env_ns):
        """CHAR (red-for-the-fix, Item 1 / F-A3): characterizes the window the
        RED lane above refuses to accept. Documented, not approved: while the
        rebuild is parked between the clear (fst_keyboard.py:401-414) and the
        refill (:516-526), the LIVE containers the pump dereferences per event
        are empty, so the filter behaves as if no config were loaded at all.

        Flips RED when F-A3 lands (build-then-swap keeps the old snapshot live
        until the new one is complete) - rewrite it then as the swap invariant:
        mid-rebuild the pump must still see the old generation."""
        kb = kb_env_ns.kb
        _load_rebind_generation(kb)

        seam = RebuildSeam(kb)
        try:
            seam.start_rebuild()

            live = {
                'tap_groups': len(kb._tap_groups),
                'rebind_triggers': len(kb._rebind_triggers),
                'rebinds': len(kb._rebinds_dict),
                'trigger_events': len(kb._all_trigger_events),
            }
            kb_env_ns.kb_mock.reset_mock()
            kb._listener.suppress_event.reset_mock()
            drops = _fire_pump_press(kb, VK_A, 5000)
            observed = (press_count(kb_env_ns.kb_mock, VK_B),
                        kb._listener.suppress_event.call_count)

            seam.finish()
        finally:
            seam.release.set()

        assert live == {'tap_groups': 0, 'rebind_triggers': 0,
                        'rebinds': 0, 'trigger_events': 0}, live
        assert observed == (0, 0), observed
        assert drops == [], drops
        assert len(kb._rebind_triggers) == 1, "the released rebuild never refilled"


# ===========================================================================
# P2 - the pump thread must do no file or process work (Item 2 / F-A4)
# ===========================================================================

class _IoRecorder:
    """Records open()/os.system()/subprocess use with the calling thread ident.

    open is wrapped, not replaced, so the real config load still works - the
    probe measures who performed the work, not whether it succeeded. system is
    replaced (a real 'cls||clear' would spawn cmd from the test process).
    subprocess is replaced by a loud refusal: nothing in the tested leg may
    reach a process spawn at all."""

    def __init__(self, monkeypatch):
        self.calls = []
        real_open = builtins.open

        def recording_open(file, *args, **kwargs):
            self.calls.append((threading.get_ident(), 'open', str(file)))
            return real_open(file, *args, **kwargs)

        def recording_system(command):
            self.calls.append((threading.get_ident(), 'system', str(command)))
            return 0

        def refusing(name):
            def _refuse(*args, **kwargs):
                self.calls.append((threading.get_ident(),
                                   'subprocess.' + name, str(args[:1])))
                raise AssertionError('subprocess.' + name
                                     + ' reached from the tested leg')
            return _refuse

        monkeypatch.setattr(builtins, 'open', recording_open)
        monkeypatch.setattr(fst_manager, 'system', recording_system)
        for name in ('run', 'Popen', 'call'):
            monkeypatch.setattr(subprocess, name, refusing(name))

    def by_thread(self, ident):
        return [c for c in self.calls if c[0] == ident]


class TestP2PumpThreadIo:

    @pytest.mark.xfail(
        strict=True,
        reason="F-A4 (Item 2): control_toggle_pause runs its resume leg "
               "inline on the calling (hook pump) thread - measured 2026-11-15 "
               "on 047be73: 1 builtins.open (the config file) plus 1 os.system "
               "('cls||clear', a cmd spawn) on the caller - so one slow disk or "
               "editor state can cost the LowLevelHooksTimeout budget and the "
               "hook itself; the consequence is documented at "
               "fst_manager.py:876-888 - the inline leg is "
               "fst_keyboard.py:1373-1386, the file read is fst_manager.py:1643, "
               "the shell spawn is fst_manager.py:2729)")
    def test_resume_leg_touches_no_file_or_process_on_the_calling_thread(
            self, kb_env_ns, monkeypatch, tmp_path):
        """RED (Item 2 / F-A4). The pump-thread contract: alt+delete's resume
        leg must not open files, must not clear the console through a shell
        spawn, and must not reach a process at all on the thread that answers
        the hook - F-A4 marshals config I/O, the group rebuild and the CLI
        redraw through loop.call_soon_threadsafe instead.

        The leg runs for real against a tmp config file (no load_config stub:
        stubbing the file read would erase exactly what the probe measures), and
        a live loop thread is wired so the marshaled shape the fix introduces
        has somewhere to land - without it the pin could never go green.

        Scope note (reviewer P2-2): an open counts as product I/O only when it
        targets THIS test's config file; the recorder is process-global, so an
        unrelated framework open on this thread must never read as pump-thread
        config I/O - that would keep the pin red after F-A4 and hide its XPASS.
        Shell and process calls always count, whatever their argument."""
        monkeypatch.chdir(tmp_path)
        config_path = tmp_path / 'FSTconfig.txt'
        config_path.write_text('# Tap Groups\na, d\n')

        kb = kb_env_ns.kb
        kb.config_manager.file_name = str(config_path)
        kb.arg_manager.WIN32_FILTER_PAUSED = True
        kb.arg_manager.MANUAL_PAUSED = True

        loop = asyncio.new_event_loop()
        pump = threading.Thread(target=loop.run_forever,
                                name='fst-loop-standin', daemon=True)
        pump.start()
        kb.set_loop(loop)
        try:
            # pre-state: the leg really reloads (harness fact, both sides true)
            assert kb._rebinds_dict == {} and kb._tap_groups == []

            recorder = _IoRecorder(monkeypatch)
            caller_ident = threading.get_ident()
            recorder.calls.clear()

            kb.control_toggle_pause()

            on_caller = [c for c in recorder.by_thread(caller_ident)
                         if c[1] != 'open' or c[2].endswith(config_path.name)]
            reload_ran = any(c[1] == 'open' and c[2].endswith(config_path.name)
                             for c in recorder.calls)
        finally:
            loop.call_soon_threadsafe(loop.stop)
            pump.join(SEAM_WAIT_SECONDS)
            cancel_and_close(loop)

        # harness facts, true before and after the fix (reviewer P2-1: the
        # reload is proven by its OUTCOME - the groups rebuilt from the config
        # file - not by which thread the read ran on, because after F-A4 the
        # read moves off this thread and may land after this leg returns)
        assert kb.arg_manager.WIN32_FILTER_PAUSED is False
        assert kb.arg_manager.MANUAL_PAUSED is False
        assert reload_ran or kb._tap_groups, (
            "the resume leg performed no config reload at all: the path this "
            "probe measures was not exercised")
        assert not pump.is_alive()

        kinds = sorted({c[1] for c in on_caller})
        assert on_caller == [], (
            f"the resume leg performed {kinds} work on the calling (pump) "
            f"thread: {on_caller} - config I/O and console/CLI redraw belong on "
            "the loop lane (Item 2 / F-A4).")


# ===========================================================================
# P3 - lifecycle flags are write-only: nothing re-checks them (Item 3 / F-A5)
# ===========================================================================

class _SecondPark(Exception):
    """Raised by the test-side keep-alive sleep when MainLogic.run() parks a
    SECOND time after the lifecycle flag was set: the flag was never re-read."""


def _patch_keep_alive(monkeypatch, on_first_park):
    """Replace the asyncio sleep for the duration of one test so the product's
    keep-alive park (free_snap_tap.py:256-257, 'await asyncio.sleep(3600)')
    becomes a deterministic observation point: the first park delivers the
    lifecycle event (the hotkey handler's flag write), the second park proves
    the flag was not observed. Short delays (the toast pump) delegate to the
    real sleep."""
    parks = []
    real_sleep = asyncio.sleep

    async def fake_sleep(delay, *args, **kwargs):
        if delay >= 3600:
            parks.append(delay)
            if len(parks) == 1:
                on_first_park()
                return None
            raise _SecondPark()
        return await real_sleep(delay, *args, **kwargs)

    monkeypatch.setattr(asyncio, 'sleep', fake_sleep)
    return parks


def _make_run_stub_keyboard():
    """Stand-in FST_Keyboard for driving MainLogic.run() (same shape as
    tests/test_headless_loop_wiring.py - fixtures do not cross test files)."""
    kb = MagicMock()
    kb.arg_manager.STOPPED = False
    kb.arg_manager.MENU_ENABLED = False
    kb.focus_manager.init_focus_task.return_value = False

    seen = {}

    def fake_start_listener():
        seen['listener_thread'] = threading.current_thread().name

    async def fake_toast_pump():
        await asyncio.sleep(0.05)

    kb.start_listener.side_effect = fake_start_listener
    kb.toast_pump = MagicMock(side_effect=fake_toast_pump)
    return kb, seen


class _MainGlobals(dict):
    """Globals for the __main__-block exec harness (reviewer P2-5): any name a
    future unit introduces into the block resolves to a named MagicMock instead
    of raising NameError, so a harness gap can never masquerade as this pin's
    expected red. The names the block MUST behave a certain way are all stubbed
    explicitly below."""

    def __missing__(self, key):
        # exec() resolves every name through __getitem__, so __missing__ sits
        # in front of the builtins fallback: hand back the real builtin when the
        # name is one (len, print, ...), a mock only for a product name.
        if hasattr(builtins, key):
            return getattr(builtins, key)
        return MagicMock(name=key)


class TestP3LifecycleNoOps:

    @pytest.mark.xfail(
        strict=True,
        reason="F-A5 (Item 3): setting arg_manager.STOPPED (what alt+END's "
               "control_exit_program does) does not terminate MainLogic.run() - "
               "measured 2026-11-15 on 047be73: run() re-enters "
               "'while True: await asyncio.sleep(3600)' and parks again, so the "
               "headless process keeps running until Ctrl+C")
    def test_stopped_terminates_the_loop_thread_run(self, monkeypatch):
        """RED (Item 3 / F-A5). The keep-alive sits INSIDE 'while not
        STOPPED' (free_snap_tap.py:226-257) but nothing re-reads the flag after
        startup, so the stop request that alt+END writes is never observed by
        the loop thread - the half-dead process Item 3 reports. F-A5 moves the
        flags into a RUNNING/PAUSED/MENU/STOPPING machine that the loop thread
        re-checks, so run() returns on its own."""
        from free_snap_tap import MainLogic

        kb, seen = _make_run_stub_keyboard()
        logic = MainLogic(kb)

        def hotkey_exit():
            kb.arg_manager.STOPPED = True

        _patch_keep_alive(monkeypatch, hotkey_exit)
        try:
            task = logic.loop.create_task(logic.run())
            exited = True
            try:
                logic.loop.run_until_complete(task)
            except _SecondPark:
                exited = False
        finally:
            cancel_and_close(logic.loop)

        # harness facts, true before and after the fix
        # (reviewer P2-4: only THAT the listener leg ran, never which thread
        # answered it - F-A5 may restart the listeners off the loop thread)
        assert seen.get('listener_thread') is not None
        assert kb.arg_manager.STOPPED is True
        assert kb.start_listener.call_count >= 1

        assert exited, (
            "run() parked a second time with STOPPED already set - the loop "
            "thread never observes the stop flag (Item 3 / F-A5).")

    @pytest.mark.xfail(
        strict=True,
        reason="F-A5 (Item 3): arg_manager.MENU_ENABLED (what alt+PAGE_DOWN's "
               "control_return_to_menu writes) does not re-show the menu - "
               "measured 2026-11-15 on 047be73: cli_menu.display_menu call "
               "count stays 0 and no listener restart happens, the process "
               "sleeps with both listeners stopped")
    def test_menu_flag_reshows_the_menu_on_the_loop_thread(self, monkeypatch):
        """RED (Item 3 / F-A5). control_return_to_menu stops both listeners,
        sets MENU_ENABLED and pauses the filter (fst_keyboard.py:1352-1361);
        the startup menu leg already passed and the loop is parked in the
        keep-alive, so the menu is never displayed again and the process keeps
        running with nothing listening. F-A5's machine re-enters the MENU state
        on that flag: display_menu again, listeners restarted on re-entry."""
        from free_snap_tap import MainLogic

        kb, seen = _make_run_stub_keyboard()
        logic = MainLogic(kb)
        assert kb.cli_menu.display_menu.call_count == 0

        def hotkey_return_to_menu():
            kb.arg_manager.MENU_ENABLED = True
            kb.arg_manager.WIN32_FILTER_PAUSED = True

        _patch_keep_alive(monkeypatch, hotkey_return_to_menu)
        try:
            task = logic.loop.create_task(logic.run())
            parked_twice = False
            try:
                logic.loop.run_until_complete(task)
            except _SecondPark:
                parked_twice = True
        finally:
            cancel_and_close(logic.loop)

        # harness facts, true before and after the fix: the return-to-menu
        # request landed while the loop thread was parked in its keep-alive,
        # and the run task is still alive (return-to-menu is not a stop).
        assert parked_twice, "run() exited on its own: this lane measured nothing"
        assert kb.arg_manager.MENU_ENABLED is True
        # (reviewer P2-4: only THAT the listener leg ran, never which thread
        # answered it - F-A5 may restart the listeners off the loop thread)
        assert seen.get('listener_thread') is not None
        assert kb.start_listener.call_count >= 1

        assert kb.cli_menu.display_menu.call_count >= 1, (
            "MENU_ENABLED was set while the loop thread was parked, yet the CLI "
            "menu was never re-displayed and no listener restart followed "
            "(Item 3 / F-A5).")

    @pytest.mark.xfail(
        strict=True,
        reason="F-A5 (Item 3): the headless entry exits with code 1 after a "
               "clean stop - measured 2026-11-15 on 047be73: SystemExit code 1 "
               "from the unconditional 'sys.exit(1)' at the end of the "
               "__main__ block (free_snap_tap.py:375), so a clean alt+END stop "
               "is indistinguishable from a crash for a caller or a supervisor")
    def test_headless_clean_stop_exits_with_code_zero(self):
        """RED (Item 3 / F-A5). Exec harness of the __main__ block (shape of
        tests/test_headless_loop_wiring.py::TestLeg2LoopWiring): the headless
        branch runs run_headless(); when that returns CLEANLY (the product's
        orderly stop, no exception) the script must exit 0. Today the block ends
        in an unconditional sys.exit(1) for every shape of exit."""
        logic_mock = MagicMock()

        def clean_stop():
            """run_headless returning normally = the orderly stop path."""

        logic_mock.run_headless.side_effect = clean_stop

        kb = MagicMock()
        kb.arg_manager.TRAY_ICON = False
        kb.arg_manager.STATUS_INDICATOR = False
        kb.arg_manager.CMD_WINDOW_HIDDEN = True

        spec = importlib.util.find_spec('free_snap_tap')
        with open(spec.origin, encoding='utf-8') as handle:
            lines = handle.read().splitlines()
        marker = 'if __name__ == "__main__":'
        code = compile(textwrap.dedent('\n'.join(
                          lines[lines.index(marker) + 1:])),
                       spec.origin, 'exec')

        globs = _MainGlobals({
            '__name__': '__main__',
            'setup_fst_logging': lambda: None,
            'logger': MagicMock(),
            'set_console_visibility': lambda flag: None,
            'FST_Keyboard': lambda: kb,
            'sys': SimpleNamespace(
                argv=['free_snap_tap.py'],
                exit=lambda code=0: (_ for _ in ()).throw(SystemExit(code))),
            'ConfigError': fst_manager.ConfigError,
            'MainLogic': lambda keyboard: logic_mock,
            'sleep': lambda seconds: None,
            'Thread': MagicMock(),
            'QApplication': lambda args: MagicMock(),
            'GUI_Manager': lambda keyboard, app: MagicMock(),
            'ToastBridge': lambda: MagicMock(),
            'surface_startup_config_result': lambda keyboard: None,
            'surface_startup_activation': lambda keyboard: None,
        })
        with pytest.raises(SystemExit) as stop:
            exec(code, globs)

        # harness fact, true before and after the fix: the headless branch ran
        assert logic_mock.run_headless.call_count == 1

        assert stop.value.code == 0, (
            f"a clean headless stop exited with code {stop.value.code!r}; an "
            "orderly stop must be distinguishable from a failure (Item 3/F-A5).")


# ===========================================================================
# P4 - two rebuild triggers may run concurrently (Item 1 / F-A3)
# ===========================================================================

TAP_ONLY = [['(TAP_1)', ['a', 'b']]]


def _load_tap_generation(kb):
    """Load one generation holding one tap group (a, b) and assert it is
    complete. True before and after the fix: the harness precondition."""
    build(kb, taps=TAP_ONLY)
    assert len(kb._tap_groups) == 1
    assert len(kb._tap_owner_by_vk) == 2
    return kb._tap_groups[0]


class TestP4ConcurrentRebuilds:

    @pytest.mark.xfail(
        strict=True,
        reason="F-A3 (Item 1): two rebuild triggers (focus change on the loop "
               "thread + alt+delete reload on the pump, or two focus switches) "
               "run initialize_groups_from_presorted_lines concurrently with no "
               "snapshot boundary - measured 2026-11-15 on 047be73: the "
               "interleaving leaves 2 Tap_Group objects in _tap_groups for a "
               "config that declares 1, and _tap_owner_by_vk points the vks at "
               "the other generation's object, so one group owns nothing and "
               "the other is never consulted")
    def test_two_concurrent_rebuilds_leave_one_complete_generation(self,
                                                                  kb_env_ns):
        """RED (Item 1 / F-A3). Both rebuilds come from the SAME presorted
        lines, so every legal end state is exactly one generation: one tap
        group object, both vks owned by it. Deterministic interleaving: rebuild
        A is parked at the seam (already past its clear), rebuild B runs to
        completion on the main thread, then A is released and appends into the
        same list objects.

        F-A3's build-new-then-single-assignment swap makes the outcome legal by
        construction: each rebuild fills its own private containers, so the last
        swap wins as a complete snapshot and the pump only ever holds complete
        references."""
        kb = kb_env_ns.kb
        _load_tap_generation(kb)

        seam = RebuildSeam(kb)
        try:
            seam.start_rebuild()

            # rebuild B: the second trigger (e.g. alt+delete on the pump) runs
            # the same presorted lines to completion while A is parked
            kb.initialize_groups_from_presorted_lines()
            complete_after_B = list(kb._tap_groups)
            owners_after_B = dict(kb._tap_owner_by_vk)

            seam.finish()

            owned = {vk: kb._tap_owner_by_vk.get(vk) for vk in (VK_A, VK_B)}
        finally:
            seam.release.set()

        # harness facts, true before and after the fix: rebuild B on its own
        # left exactly one complete generation, so the extra generation counted
        # below can only have come from the released rebuild A.
        assert seam.parsed[:2] == ['a', 'b'], seam.parsed
        assert len(complete_after_B) == 1, complete_after_B
        assert all(owners_after_B[vk] is complete_after_B[0]
                   for vk in (VK_A, VK_B)), owners_after_B
        assert kb._tap_groups, "the interleaving lost every tap group"
        assert None not in owned.values(), owned

        assert len(kb._tap_groups) == 1, (
            f"two concurrent rebuilds of one config produced "
            f"{len(kb._tap_groups)} tap group objects: the swap is not atomic "
            "(Item 1 / F-A3).")
        assert all(owner is kb._tap_groups[0] for owner in owned.values()), owned

    def test_concurrent_rebuilds_share_one_mutable_generation(self, kb_env_ns):
        """CHAR (red-for-the-fix, Item 1 / F-A3): characterizes today's
        interleaving so the fix cannot silently change it unobserved. The two
        rebuilds mutate the SAME list/dict objects (fst_keyboard.py:402-408
        clears, :521-526 appends), so the result is a mixed generation: the
        config declares one tap group, the live filter holds two, and the
        single-owner registry (FST-404) resolves both vks to the FIRST appended
        object, leaving the second group appended-but-never-consulted.

        Flips RED when F-A3 lands (each rebuild fills private containers and one
        assignment swaps them in) - rewrite it then as the last-writer-wins
        snapshot invariant."""
        kb = kb_env_ns.kb
        _load_tap_generation(kb)

        seam = RebuildSeam(kb)
        try:
            seam.start_rebuild()
            kb.initialize_groups_from_presorted_lines()
            # the generation rebuild B completed on its own: the one the filter
            # would consider correct if rebuild A had never been scheduled
            gen_b = kb._tap_groups[0]
            assert kb._tap_owner_by_vk[VK_A] is gen_b
            seam.finish()
            foreign = [g for g in kb._tap_groups if g is not gen_b]
        finally:
            seam.release.set()

        assert len(kb._tap_groups) == 2, (
            "the shared-mutation interleaving did not reproduce: the fix this "
            "characterization documents may have landed - rewrite the pin")
        assert len(foreign) == 1
        # the single-owner registry (FST-404) resolves every vk to the first
        # appended object, so the appended-but-unowned group is never consulted
        # (identity math: Tap_Group.__eq__ is value-based, so two generations
        # of the same config line compare equal - only 'is' tells them apart)
        assert kb._tap_owner_by_vk[VK_A] is gen_b
        assert kb._tap_owner_by_vk[VK_B] is gen_b
        assert all(owner is not foreign[0]
                   for owner in kb._tap_owner_by_vk.values())
