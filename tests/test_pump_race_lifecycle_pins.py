"""Pump-thread race, reload-lane and lifecycle pins (F-A2 pins / F-A3 / F-A4).

Scope: proposals/2026-11-14_fst-architecture-review.md Items 1/2/3, scheduled
by proposals/2026-11-15_fst-improvement-plan.md Phase A (fix units F-A3 atomic
snapshot swap, F-A4 reload/control marshaling, F-A5 lifecycle state machine).
This file changes NO product behavior of its own: each lane states a
requirement, and the pins of a unit flip from strict xfail to green when that
unit lands (the estate plan file carries the per-pin status table).

Lanes: P1 reload race + P4 concurrent rebuilds (F-A3, landed green), P2
pump-thread I/O + the reload lane's asynchrony and coalescing (F-A4, landed
green), P5 which generation a hold release runs against (the P2 seam F-A3
handed to F-A4 - a parity pin, documented in _release_tap_group_holds), P3
lifecycle termination / menu re-show / clean exit code (F-A5, landed green), P6
the lifecycle request channels (F-A5). No strict xfails remain in this file.

Flavors (the estate plan file carries the name/target/flavor table):
  GREEN contract / invariant - the requirement pin itself, now green: F-A3
          (Item 1) and F-A4 (Item 2) landed on 2026-11-15. Each docstring keeps
          the F-A2 measurement it was written against (047be73), so the pin
          still states what it prevents.
  RED  - strict xfail marker naming the fix unit. The requirement assert fails
         on today's code (P3 x3 remain: F-A5). When the fix lands the test
         XPASSes, and strict=True turns that XPASS into a gate failure - that is
         the alarm that forces the move into a normal test file
         (repo_testgate.md xfail doctrine). A strict marker is chosen over an
         imperative pytest.xfail call exactly for that alarm: a red-before pin
         whose fix silently turns it green without demanding a review is a lost
         pin.
  CHAR - green characterization pin of TODAY's interleaving. It states no
         approval of the behavior; it documents the window a fix must close.
         It flips RED when the fix lands (red-for-the-fix) and must then be
         rewritten against the fixed contract (both F-A2 CHAR pins were
         rewritten by F-A3 exactly that way).

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
from unittest.mock import MagicMock, call

import pytest
from pynput import keyboard as pynput_keyboard

import fst_manager
from fst_data_types import ConfigError
from kb_helpers import build

VK_A = 0x41
VK_B = 0x42
VK_C = 0x43

WM_KEYDOWN = 256
WM_KEYUP = 257
LLKHF_INJECTED = 0x10  # the win32 injected/simulated flag bit (U359 contract)

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


# the containers one Runtime_Snapshot generation owns (F-A3): identity of
# these objects is what tells "the live generation was swapped" apart from
# "the live generation was cleared and refilled in place"
SNAPSHOT_CONTAINERS = ('tap_groups', 'tap_owner_by_vk', 'rebinds_dict',
                       'rebind_triggers', 'macros_dict', 'macro_triggers',
                       'all_trigger_events', 'rebinds', 'macros',
                       'macros_alias_dict', 'macro_sequence_alias_list',
                       'key_group_by_alias')


def _snapshot_ids(kb):
    """Object identity of every container of the live generation."""
    rt = kb.runtime
    return {name: id(getattr(rt, name)) for name in SNAPSHOT_CONTAINERS}


# ---------------------------------------------------------------------------
# seam harness: park a rebuild between its container clear and its refill
# ---------------------------------------------------------------------------

class RebuildSeam:
    """Test seam that stops a rebuild mid-flight: after it has released the old
    generation's app-level holds and finished its first key parse, before it has
    built and swapped its new Runtime_Snapshot.

    No product change: the seam wraps the keyboard instance's
    convert_to_vk_code, which initialize_groups_from_presorted_lines calls for
    every key string it parses, but the filter hot path does not call for
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

    def test_event_during_rebuild_is_filtered_by_a_complete_generation(self,
                                                                      kb_env_ns):
        """GREEN contract pin (Item 1 / F-A3 landed). It is the F-A2 RED pin of
        this lane, un-marked: while a rebuild is in flight the pump event must
        behave exactly as it does with the config loaded, which is what
        "old-or-new but never neither" means when the two generations agree
        (here they are the same config, reloaded).

        F-A3 satisfies it: initialize_groups_from_presorted_lines builds a
        complete Runtime_Snapshot off to the side and binds it in ONE
        assignment, so a rebuild parked mid-parse leaves the pump on the old
        generation: 1 replacement press + 1 suppression. F-A2 measured the
        pre-fix state on 047be73 as (0, 0) - the trigger reached the app
        unfiltered - and the strict xfail flipped this pin to green."""
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

        # harness facts: the seam really parked the rebuild, the rebuild
        # completed to a consistent generation, and the mid-rebuild event died
        # no leg (no silent leg death hiding behind the pass).
        assert seam.parsed[:1] == ['a'], seam.parsed
        assert len(kb._rebind_triggers) == 1 and len(kb._rebinds_dict) == 1
        assert drops == [], drops

        assert observed == (1, 1), (
            "the event fired inside the rebuild saw neither generation: "
            f"replacement presses/suppressions = {observed}, expected (1, 1) "
            "as in the fully loaded config (Item 1 / F-A3).")

    def test_a_failed_build_leaves_the_old_generation_live(self, kb_env_ns):
        """GREEN invariant (Item 1 / F-A3, reviewer P2-1 of the F-A3 fire): the
        swap makes a failed build HARMLESS to the pump. When a leg of
        initialize_groups_from_presorted_lines raises (a key name that does not
        resolve - the ConfigError arm of every leg), the bind never happens, so
        the live generation stays the previous COMPLETE one and the filter keeps
        filtering. Pre-F-A3 the same failure left the live containers cleared
        or half-refilled - every later event ran against a broken config.

        The F-A4/F-A5 units may not silently regress this: the assertion is on
        container identity plus the live filter decision, not on log text."""
        kb = kb_env_ns.kb
        _load_rebind_generation(kb)
        before = _snapshot_ids(kb)

        # a bad tap-group line: the key name resolves to no vk code, so the tap
        # leg's ConfigError arm re-raises out of the build
        cm = kb.config_manager
        cm._tap_groups_hr = [['(BAD)', ['nosuchkey_zebra']]]
        with pytest.raises(ConfigError):
            kb.initialize_groups_from_presorted_lines()

        # the live generation is still the good one, object for object
        assert _snapshot_ids(kb) == before, (
            "a failed rebuild changed the live generation: the bind must only "
            "happen for a completely built snapshot (Item 1 / F-A3).")
        assert len(kb._rebind_triggers) == 1 and len(kb._rebinds_dict) == 1

        # and the pump still filters against it
        kb_env_ns.kb_mock.reset_mock()
        kb._listener.suppress_event.reset_mock()
        drops = _fire_pump_press(kb, VK_A, 6000)
        assert (press_count(kb_env_ns.kb_mock, VK_B),
                kb._listener.suppress_event.call_count) == (1, 1)
        assert drops == [], drops

    def test_live_generation_stays_whole_while_a_rebuild_is_in_flight(self,
                                                                     kb_env_ns):
        """GREEN invariant (Item 1 / F-A3), rewritten from the F-A2
        characterization pin exactly as that pin's docstring directed. F-A2
        documented that the live containers were emptied between the clear and
        the refill; F-A3 forbids that, so this pin now holds the swap
        invariant: while the rebuild is parked mid-parse the LIVE generation is
        (a) still complete, (b) built of the very same container objects it had
        before the rebuild started (no clear, no refill, no rebind of the live
        set), and (c) still filters the pump event.

        Anti-vacuity: the last block requires the parked rebuild to actually
        SWAP a new generation in when released - otherwise a pin that never
        rebuilds anything would pass for the wrong reason."""
        kb = kb_env_ns.kb
        _load_rebind_generation(kb)
        before = _snapshot_ids(kb)

        seam = RebuildSeam(kb)
        try:
            seam.start_rebuild()

            live = {
                'tap_groups': len(kb._tap_groups),
                'rebind_triggers': len(kb._rebind_triggers),
                'rebinds': len(kb._rebinds_dict),
                'trigger_events': len(kb._all_trigger_events),
            }
            mid_rebuild = _snapshot_ids(kb)
            kb_env_ns.kb_mock.reset_mock()
            kb._listener.suppress_event.reset_mock()
            drops = _fire_pump_press(kb, VK_A, 5000)
            observed = (press_count(kb_env_ns.kb_mock, VK_B),
                        kb._listener.suppress_event.call_count)

            seam.finish()
        finally:
            seam.release.set()

        # the live generation mid-rebuild: the loaded config, untouched
        assert live == {'tap_groups': 0, 'rebind_triggers': 1,
                        'rebinds': 1, 'trigger_events': 1}, live
        assert mid_rebuild == before, (
            "the live generation's container objects changed while a rebuild "
            "was parked mid-parse: the rebuild mutates the live generation "
            "instead of a private snapshot (Item 1 / F-A3).")
        # and the pump still filters, i.e. it reads that untouched generation
        assert observed == (1, 1), observed
        assert drops == [], drops
        # the released rebuild really swapped a NEW generation in
        assert len(kb._rebind_triggers) == 1, "the released rebuild never completed"
        assert _snapshot_ids(kb) != before, (
            "the completed rebuild did not swap in a new generation: this pin "
            "would also pass if rebuilding did nothing at all")


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


def _drain_lane(loop):
    """Bounded FIFO sync point with the loop thread.

    run_coroutine_threadsafe schedules through call_soon_threadsafe, so the
    sentinel coroutine lands on the ready queue AFTER every callback submitted
    before it; resolving its future therefore proves those callbacks ran. No
    sleeps, no polling, no wall-clock assumption."""
    async def _sentinel():
        return True

    return asyncio.run_coroutine_threadsafe(
        _sentinel(), loop).result(SEAM_WAIT_SECONDS)


def _loop_thread_ident(loop):
    """The ident of the thread that runs `loop`, asked THROUGH the loop (the
    same FIFO guarantee as _drain_lane makes the answer well-defined)."""
    async def _ask():
        return threading.get_ident()

    return asyncio.run_coroutine_threadsafe(
        _ask(), loop).result(SEAM_WAIT_SECONDS)


class TestP2PumpThreadIo:

    def test_resume_leg_touches_no_file_or_process_on_the_calling_thread(
            self, kb_env_ns, monkeypatch, tmp_path):
        """GREEN contract pin (Item 2 / F-A4 landed; the F-A2 RED pin of this
        lane, un-marked). alt+delete's resume leg must not open the config file,
        must not clear the console through a shell spawn, and must not reach a
        process at all on the thread that answers the hook; the work belongs on
        the asyncio loop lane.

        F-A2 measured the pre-fix state on 047be73: 1 open (the config file)
        plus 1 system('cls||clear', a cmd spawn) ON THE CALLER. Now the same
        I/O runs on the loop thread - so this pin asserts BOTH sides: nothing on
        the caller, and the file read really happening on the other thread (a
        reload that silently vanished would also satisfy an empty caller list).

        The leg runs for real against a tmp config file (no load_config stub:
        stubbing the file read would erase exactly what the probe measures), and
        a live loop thread is wired so the marshaled work has somewhere to land.

        Scope note (reviewer P2-2 of the F-A2 fire): an open counts as product
        I/O only when it targets THIS test's config file; the recorder is
        process-global, so an unrelated framework open on this thread must never
        read as pump-thread config I/O. Shell and process calls always count."""
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

            loop_ident = _loop_thread_ident(loop)

            recorder = _IoRecorder(monkeypatch)
            caller_ident = threading.get_ident()
            recorder.calls.clear()

            kb.control_toggle_pause()

            # bounded FIFO sync point: the sentinel lands on the loop ready
            # queue AFTER the reload callback, so when it resolves the lane
            # work has run (no sleeps, no polling)
            _drain_lane(loop)

            on_caller = [c for c in recorder.by_thread(caller_ident)
                         if c[1] != 'open' or c[2].endswith(config_path.name)]
            config_reads = [c for c in recorder.calls
                            if c[1] == 'open' and c[2].endswith(config_path.name)]
        finally:
            loop.call_soon_threadsafe(loop.stop)
            pump.join(SEAM_WAIT_SECONDS)
            cancel_and_close(loop)

        # harness facts: the reload really happened (the config file was read
        # and the groups rebuilt from it), and the un-pause flags flipped
        assert kb.arg_manager.WIN32_FILTER_PAUSED is False
        assert kb.arg_manager.MANUAL_PAUSED is False
        assert kb._tap_groups, (
            "the resume leg performed no config reload at all: the path this "
            "probe measures was not exercised")
        assert config_reads, (
            "no read of the config file was recorded anywhere: the reload lane "
            "did not run, so an empty caller list would be vacuous")
        assert not pump.is_alive()

        # the positive half of the contract: the file read ran on the LOOP
        # thread, i.e. the work moved instead of vanishing
        assert all(c[0] == loop_ident for c in config_reads), (config_reads,
                                                               loop_ident)

        kinds = sorted({c[1] for c in on_caller})
        assert on_caller == [], (
            f"the resume leg performed {kinds} work on the calling (pump) "
            f"thread: {on_caller} - config I/O and console/CLI redraw belong on "
            "the loop lane (Item 2 / F-A4).")

    def test_resume_call_returns_before_the_reload_lands(self, kb_env_ns,
                                                        monkeypatch, tmp_path):
        """GREEN (Item 2 / F-A4), the pump-side half of the contract: the hook
        pump must be answered BEFORE the reload work has finished, because that
        is the whole point (LowLevelHooksTimeout, fst_manager.py:876-888).

        Deterministic, not racy: the lane work is gated inside its first step
        (load_config), so while it waits there the pump-side state is provably
        still paused; releasing the gate and draining the lane then proves the
        same call completes the reload."""
        monkeypatch.chdir(tmp_path)
        config_path = tmp_path / 'FSTconfig.txt'
        config_path.write_text('# Tap Groups\na, d\n')

        kb = kb_env_ns.kb
        kb.config_manager.file_name = str(config_path)
        kb.arg_manager.WIN32_FILTER_PAUSED = True
        kb.arg_manager.MANUAL_PAUSED = True

        inside = threading.Event()
        gate = threading.Event()
        real_load = kb.config_manager.load_config

        def gated_load():
            inside.set()
            assert gate.wait(SEAM_WAIT_SECONDS), 'the reload lane never started'
            return real_load()

        monkeypatch.setattr(kb.config_manager, 'load_config', gated_load)

        loop = asyncio.new_event_loop()
        pump = threading.Thread(target=loop.run_forever,
                                name='fst-loop-standin', daemon=True)
        pump.start()
        kb.set_loop(loop)
        try:
            kb.control_toggle_pause()

            # the caller is back while the lane is still inside the reload
            assert inside.wait(SEAM_WAIT_SECONDS), (
                "the reload never ran on the loop lane: the caller executed it "
                "inline (Item 2 / F-A4).")
            assert kb.arg_manager.WIN32_FILTER_PAUSED is True, (
                "the un-pause flags flipped on the caller: the pump flips them "
                "only when the new generation is in place (Item 2 / F-A4).")

            gate.set()
            _drain_lane(loop)
        finally:
            gate.set()
            loop.call_soon_threadsafe(loop.stop)
            pump.join(SEAM_WAIT_SECONDS)
            cancel_and_close(loop)

        assert kb.arg_manager.WIN32_FILTER_PAUSED is False
        assert kb.arg_manager.MANUAL_PAUSED is False
        assert kb._tap_groups, "the lane reload never completed"

    def test_overlapping_resume_requests_coalesce_into_one_reload(
            self, kb_env_ns, monkeypatch, tmp_path):
        """GREEN (Item 2 / F-A4): the documented coalescing guard - one PENDING
        reload request max. Two alt+delete requests that arrive before the lane
        started its pass produce exactly ONE reload (a reload re-reads the
        current config and focus app, so a coalesced request loses nothing).

        Deterministic: the loop is wired but not yet running, so both callbacks
        are submitted while the first request is still pending; the lane is
        started afterwards and drained."""
        monkeypatch.chdir(tmp_path)
        config_path = tmp_path / 'FSTconfig.txt'
        config_path.write_text('# Tap Groups\na, d\n')

        kb = kb_env_ns.kb
        kb.config_manager.file_name = str(config_path)
        kb.arg_manager.WIN32_FILTER_PAUSED = True
        kb.arg_manager.MANUAL_PAUSED = True

        reloads = []
        real_load = kb.config_manager.load_config

        def counting_load():
            reloads.append(threading.get_ident())
            return real_load()

        monkeypatch.setattr(kb.config_manager, 'load_config', counting_load)

        loop = asyncio.new_event_loop()
        kb.set_loop(loop)  # not running yet: both requests are PENDING
        try:
            kb.control_toggle_pause()
            kb.control_toggle_pause()
            assert kb._reload_pending is True

            pump = threading.Thread(target=loop.run_forever,
                                    name='fst-loop-standin', daemon=True)
            pump.start()
            _drain_lane(loop)
            # a request AFTER the pass completed must still reload (the guard
            # coalesces PENDING requests, it never latches the lane off): the
            # first pass un-paused, so ask for a pause + resume again
            kb.arg_manager.WIN32_FILTER_PAUSED = True
            kb.arg_manager.MANUAL_PAUSED = True
            kb.control_toggle_pause()
            _drain_lane(loop)
            loop.call_soon_threadsafe(loop.stop)
            pump.join(SEAM_WAIT_SECONDS)
        finally:
            cancel_and_close(loop)

        assert len(reloads) == 2, (
            f"expected one coalesced pass plus one later pass, got {len(reloads)}"
            " - the reload lane either does not coalesce or latches off")
        assert kb.arg_manager.WIN32_FILTER_PAUSED is False

    def test_a_failed_schedule_does_not_latch_the_reload_lane_off(
            self, kb_env_ns):
        """GREEN (Item 2 / F-A4, reviewer P1-2): one refused callback must not
        coalesce every later request away. If the loop rejects
        call_soon_threadsafe, the pending flag goes back to False, so the next
        alt+delete schedules a reload instead of being silently swallowed."""
        kb = kb_env_ns.kb
        kb.arg_manager.WIN32_FILTER_PAUSED = True
        kb.arg_manager.MANUAL_PAUSED = True

        attempts = []

        class _RefusingLoop:
            '''not an asyncio loop: it only refuses scheduling, so no reload can
            run and no real I/O happens (the lane never receives a callback).'''

            def call_soon_threadsafe(self, callback, *args, **kwargs):
                attempts.append(callback)
                raise ValueError('simulated scheduling refusal')

        kb.set_loop(_RefusingLoop())
        try:
            kb.control_toggle_pause()
            assert kb._reload_pending is False, (
                "a refused schedule left the pending flag set: the reload lane "
                "is latched off for every later request (Item 2 / F-A4).")
            # the lane is still reachable: the next request schedules again
            kb.control_toggle_pause()
        finally:
            kb.set_loop(None)

        assert len(attempts) == 2, attempts
        # nothing ran, so the pump-side state is untouched
        assert kb.arg_manager.WIN32_FILTER_PAUSED is True
        assert kb.arg_manager.MANUAL_PAUSED is True


# ===========================================================================
# P3 - lifecycle: the loop observes stop / menu / exit requests (Item 3 / F-A5)
# ===========================================================================

class _SecondPark(Exception):
    """Raised by the test-side park seam when MainLogic.run() parks a SECOND
    time after the lifecycle event was delivered: the request was never
    observed by the loop."""


def _patch_park(monkeypatch, on_first_park):
    """Seam on MainLogic's waitable park (MainLogic._park): the first park
    delivers the lifecycle event (what the hotkey leg does), the second park
    proves the loop re-entered its park WITHOUT observing that request.

    Pre-F-A5 this seam replaced asyncio.sleep to catch the unwaitable
    'while True: await asyncio.sleep(3600)' keep-alive. F-A5 replaced that park
    with a wakeable one, so the seam targets the park coroutine itself - the
    observation point is the same, the product no longer needs a 3600 s sleep
    to be observable."""
    from free_snap_tap import MainLogic

    parks = []

    async def fake_park(self, observed):
        parks.append(observed)
        if len(parks) == 1:
            on_first_park()
            return None
        raise _SecondPark()

    monkeypatch.setattr(MainLogic, '_park', fake_park)
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
    """Name kept from F-A2, where these were the red-before pins of the then
    write-only lifecycle flags. After F-A5 they are green contract pins of the
    lifecycle machine; the class and test names stay so the estate plan table
    remains traceable."""

    def test_stopped_terminates_the_loop_thread_run(self, monkeypatch):
        """GREEN contract pin (Item 3 / F-A5 landed; the F-A2 RED pin of this
        lane, un-marked). The stop request that alt+END writes - STOPPED plus a
        posted STOPPING transition - must terminate MainLogic.run() on its own:
        the loop re-reads its lifecycle state between parks, and the park is
        wakeable.

        F-A2 measured the pre-fix state on 047be73: run() re-entered 'while
        True: await asyncio.sleep(3600)' and parked again with STOPPED already
        set, so the headless process kept running until Ctrl+C (the half-dead
        process Item 3 reports)."""
        from free_snap_tap import MainLogic

        kb, seen = _make_run_stub_keyboard()
        logic = MainLogic(kb)

        def hotkey_exit():
            kb.arg_manager.STOPPED = True

        _patch_park(monkeypatch, hotkey_exit)
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

    def test_menu_flag_reshows_the_menu_on_the_loop_thread(self, monkeypatch):
        """GREEN contract pin (Item 3 / F-A5 landed; the F-A2 RED pin of this
        lane, un-marked). A return-to-menu request that lands while the loop
        thread is parked must re-enter the MENU state on the loop thread:
        cli_menu.display_menu runs again and the listeners restart on the way
        out of the menu (the SAME startup flow, not a second implementation).

        F-A2 measured the pre-fix state on 047be73: the display_menu call count
        stayed 0 and no listener restart happened - the process slept with both
        listeners stopped. Note what the fix means for the flag: MENU_ENABLED is
        already True after the startup menu, so the real request channel is the
        MENU transition control_return_to_menu posts; the flag edge here still
        carries the startup wish, and _observe_state reconciles it (edge, not
        level, or the menu would re-show on every wake)."""
        from free_snap_tap import MainLogic

        kb, seen = _make_run_stub_keyboard()
        logic = MainLogic(kb)
        assert kb.cli_menu.display_menu.call_count == 0

        def hotkey_return_to_menu():
            kb.arg_manager.MENU_ENABLED = True
            kb.arg_manager.WIN32_FILTER_PAUSED = True

        _patch_park(monkeypatch, hotkey_return_to_menu)
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

    def test_headless_clean_stop_exits_with_code_zero(self):
        """GREEN contract pin (Item 3 / F-A5 landed; the F-A2 RED pin of this
        lane, un-marked). Exec harness of the __main__ block (shape of
        tests/test_headless_loop_wiring.py::TestLeg2LoopWiring): the headless
        branch runs run_headless(); when that returns CLEANLY (the product's
        orderly stop, no exception) the script exits 0.

        F-A2 measured the pre-fix state on 047be73: the block ended in an
        unconditional sys.exit(1) for EVERY exit shape, so a clean alt+END stop
        was indistinguishable from a crash for a caller or a supervisor. A
        startup ConfigError still exits 1, and an uncaught error still exits 1
        through the interpreter - only the clean path changed."""
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

    def test_two_concurrent_rebuilds_leave_one_complete_generation(self,
                                                                  kb_env_ns):
        """GREEN contract pin (Item 1 / F-A3 landed; the F-A2 RED pin of this
        lane, un-marked). Both rebuilds come from the SAME presorted lines, so
        every legal end state is exactly one generation: one tap group object,
        both vks owned by it. Deterministic interleaving: rebuild A is parked at
        the seam inside its parse, rebuild B runs to completion on the main
        thread, then A is released. F-A2 measured the pre-fix interleaving on
        047be73 as 2 Tap_Group objects for a config that declares 1, with the
        FST-404 owner registry pointing both vks at the other generation's
        object (one group owned nothing, the other never consulted).

        F-A3's build-new-then-single-assignment swap makes the outcome legal by
        construction: each rebuild fills its own private containers, so the last
        bind wins as a complete snapshot and the pump only ever holds complete
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

    def test_last_rebuild_wins_as_one_whole_generation(self, kb_env_ns):
        """GREEN invariant (Item 1 / F-A3), rewritten from the F-A2
        characterization pin exactly as that pin's docstring directed. F-A2
        documented the shared-mutation outcome (one live list holding two mixed
        generations); F-A3 forbids it, so this pin holds the ordering invariant
        instead: with rebuild B completed mid-flight and the parked rebuild A
        binding last, the live view is A's WHOLE snapshot - one group, both vks
        owned by that same group, and B's generation gone from the live view
        (last writer wins by REPLACEMENT, never by merge or partial overwrite).

        Anti-vacuity: B's generation must have been live and complete first
        (asserted inside the try), so "the live view no longer contains it" can
        only be the second bind, not a failed first one."""
        kb = kb_env_ns.kb
        _load_tap_generation(kb)

        seam = RebuildSeam(kb)
        try:
            seam.start_rebuild()
            kb.initialize_groups_from_presorted_lines()
            # the generation rebuild B completed on its own: the live view
            # until the parked rebuild A binds its own snapshot
            gen_b = kb._tap_groups[0]
            groups_b = kb._tap_groups
            assert kb._tap_owner_by_vk[VK_A] is gen_b
            seam.finish()
        finally:
            seam.release.set()

        assert len(kb._tap_groups) == 1, (
            f"two concurrent rebuilds left {len(kb._tap_groups)} live tap "
            "groups: the second rebuild merged into the live generation "
            "instead of replacing it (Item 1 / F-A3).")
        assert kb._tap_groups is not groups_b, (
            "the released rebuild did not swap a new generation in - the live "
            "container objects are still rebuild B's")
        live_group = kb._tap_groups[0]
        assert live_group is not gen_b
        # the single-owner registry (FST-404) and the group list belong to ONE
        # generation: every vk resolves to the very group the live list holds
        # (identity math: Tap_Group.__eq__ is value-based, so two generations
        # of the same config line compare equal - only 'is' tells them apart)
        assert kb._tap_owner_by_vk[VK_A] is live_group
        assert kb._tap_owner_by_vk[VK_B] is live_group


# ===========================================================================
# P5 - which generation a hold release runs against (F-A3 handed this to F-A4)
# ===========================================================================

class TestP5HoldReleaseGeneration:
    """The generation question F-A3 handed to F-A4 (reviewer P2-2 of the F-A3
    fire): `_release_tap_group_holds` mutates Tap_Group objects of the generation
    that is live at call time - during a rebuild that is the OLD one, because
    the new snapshot is not bound yet and its groups hold nothing.

    F-A4 chose DOCUMENT + PIN over rerouting: "release the new generation" is
    not a meaningful route (nothing to release there), and the mutation race is
    state-legal - release_hold() clears active_key FIRST and every tap decision
    in the filter treats an unheld group as legal (active_key None = no veto).
    The full argument lives in
    FST_Keyboard._release_tap_group_holds.__doc__; these pins hold the
    observable contract so a later lane change cannot silently move the release
    off the caller (FST-404's ruling) or lose it."""

    def test_a_rebuild_releases_the_old_generation_hold_on_the_caller(
            self, kb_env_ns):
        """The release sweep stays SYNCHRONOUS on the calling thread even though
        F-A4 moved everything else about a reload to the loop lane: the held key
        must reach the app before the rebuild continues, or the app keeps a
        pressed key no record claims (FST-404)."""
        kb = kb_env_ns.kb
        build(kb, taps=TAP_ONLY)
        old_group = kb._tap_groups[0]
        old_id = id(old_group)
        old_group.update_tap_states(VK_A, True)
        old_group.set_last_key_send(VK_A)

        kb_env_ns.kb_mock.reset_mock()
        before = _snapshot_ids(kb)
        # the rebuild leg itself (kb_helpers.build preset the presorted lines;
        # apply_focus_groups would re-read the focus manager, which build() does
        # not populate)
        kb.initialize_groups_from_presorted_lines()

        # one synchronous release of the held vk on the controller, emitted on
        # THIS thread (the mock controller records it inline)
        assert kb_env_ns.kb_mock.release.call_args_list == [
            call(pynput_keyboard.KeyCode.from_vk(VK_A))], \
            kb_env_ns.kb_mock.release.call_args_list
        # it ran against the OLD generation object, and that group is unheld now
        assert old_group.get_last_key_send() is None

        # the live generation is the new complete one, and its group starts clean
        assert _snapshot_ids(kb) != before, "the rebuild never swapped a generation"
        new_group = kb._tap_groups[0]
        assert id(new_group) != old_id
        assert new_group.get_last_key_send() is None
        assert kb._tap_owner_by_vk[VK_A] is new_group

        # and the pump still filters against the new generation: no leg died
        drops = _fire_pump_press(kb, VK_A, 9000)
        assert drops == [], drops

    def test_the_cleared_owner_does_not_veto_the_injected_release(self,
                                                                 kb_env_ns):
        """The contract release_hold() exists for (FST-404): the owner's
        bookkeeping is cleared BEFORE the caller emits the release, so the
        simulated-key veto leg lets that injected release reach the app.

        Pinned as a pair so the first half cannot pass vacuously: with the hold
        still armed the SAME injected release IS suppressed (the veto is live),
        after the clear it is not. The residual re-arm window F-A4 documents in
        _release_tap_group_holds (a pump leg re-arming active_key between the
        clear and the send re-applies the veto) is pre-existing, ruled open in
        todo_inbox.md, and deliberately NOT closed by this unit."""
        kb = kb_env_ns.kb
        build(kb, taps=TAP_ONLY)
        group = kb._tap_groups[0]
        group.update_tap_states(VK_A, True)
        group.set_last_key_send(VK_A)

        def fire_simulated_release():
            kb_env_ns.kb_mock.reset_mock()
            kb._listener.suppress_event.reset_mock()
            drops = []
            kb.report_event_drop = lambda source, vk_code, is_press, \
                is_simulated, is_mouse, exc: drops.append(exc)
            kb.keyboard_win32_event_filter(
                WM_KEYUP, key_data(VK_A, 7000, LLKHF_INJECTED))
            return kb._listener.suppress_event.call_count, drops

        # armed hold: the veto leg is live and eats the injected release
        assert group.get_active_key() == VK_A
        suppressed, drops = fire_simulated_release()
        assert suppressed == 1 and drops == [], (suppressed, drops)

        # cleared owner: the same event passes through to the app
        group.release_hold()
        assert group.get_active_key() is None
        suppressed, drops = fire_simulated_release()
        assert suppressed == 0 and drops == [], (suppressed, drops)


# ===========================================================================
# P6 - the request channels F-A5 added (pump legs -> lifecycle machine)
# ===========================================================================

class TestP6LifecycleWiring:
    """F-A5 (Item 3): the legs that run off the loop thread no longer write
    lifecycle flags and hope - they POST a transition into the loop's machine
    and return. A machine with no loop wired (these pins, and every unwired
    caller in the suite) applies requests inline, which is what makes the
    request observable without a running loop."""

    def _machine(self, kb):
        from free_snap_tap import Lifecycle_Machine
        machine = Lifecycle_Machine()
        kb.set_lifecycle(machine)
        return machine

    def test_alt_end_posts_stopping_and_never_exits_from_the_caller(self,
                                                                   kb_env_plain):
        """alt+END (control_exit_program) must not exit the process from the
        hook pump: no bare exit()/sys.exit on the calling thread, only a
        STOPPING request plus the legacy STOPPED flag for the filter."""
        from fst_data_types import Lifecycle_State
        kb = kb_env_plain
        machine = self._machine(kb)
        try:
            kb.control_exit_program('unit')
        except SystemExit as error:
            raise AssertionError(
                "control_exit_program raised SystemExit on the calling thread - "
                "the pump must post STOPPING and let the loop thread shut the "
                f"program down (Item 3 / F-A5): {error!r}")
        assert machine.state is Lifecycle_State.STOPPING, machine.state
        assert kb.arg_manager.STOPPED is True

    def test_alt_page_down_and_alt_delete_post_menu_and_pause(self, kb_env_plain):
        """alt+PAGE_DOWN posts MENU (the request the MENU_ENABLED flag could
        never carry, because it is already True after the startup menu) and
        alt+delete's pause leg posts PAUSED. The resume leg's RUNNING post lives
        inside the lane reload body (_reload_now), which the F-A4 pins of the
        P2 lane drive."""
        from fst_data_types import Lifecycle_State
        kb = kb_env_plain
        machine = self._machine(kb)

        kb.control_return_to_menu()
        assert machine.state is Lifecycle_State.MENU, machine.state
        assert kb.arg_manager.MENU_ENABLED is True

        # control_return_to_menu paused the filter, so a bare toggle from here
        # would take the RESUME leg; the pause leg is what this assert measures
        kb.arg_manager.WIN32_FILTER_PAUSED = False
        kb.arg_manager.MANUAL_PAUSED = False
        kb.control_toggle_pause()      # from unpaused -> the pause branch
        assert machine.state is Lifecycle_State.PAUSED, machine.state
        assert kb.arg_manager.WIN32_FILTER_PAUSED is True

    def test_stopping_is_terminal_for_a_late_request(self, kb_env_plain):
        """STOPPING is terminal (F-A5 recheck P2): a resume/menu request that
        was already in flight when the stop landed must not flip the machine
        back, because the audit line is what an operator reads while the loop
        thread is on its way out."""
        from fst_data_types import Lifecycle_State
        kb = kb_env_plain
        machine = self._machine(kb)
        kb.control_exit_program('unit')
        assert machine.state is Lifecycle_State.STOPPING, machine.state
        for late in (Lifecycle_State.RUNNING, Lifecycle_State.MENU,
                     Lifecycle_State.PAUSED):
            kb.post_lifecycle(late, f'late {late.value} request')
            assert machine.state is Lifecycle_State.STOPPING, late

    def test_machine_requests_from_another_thread_land_on_the_loop_thread(
            self, kb_env_ns):
        """The routing contract of Lifecycle_Machine.post_transition (the same
        shape F-A4 defined for the reload lane): a request from a foreign thread
        is applied on the loop thread, not on the poster - and the poster does
        not wait for it."""
        from free_snap_tap import Lifecycle_Machine
        from fst_data_types import Lifecycle_State
        kb = kb_env_ns.kb
        machine = Lifecycle_Machine()
        kb.set_lifecycle(machine)

        loop = asyncio.new_event_loop()
        machine.attach(loop, asyncio.Event())
        pump = threading.Thread(target=loop.run_forever,
                                name='fst-loop-standin', daemon=True)
        pump.start()
        try:
            applied = []
            real_apply = machine._apply

            def spy(state, reason, source):
                applied.append(threading.get_ident())
                real_apply(state, reason, source)

            machine._apply = spy
            poster = threading.get_ident()
            kb.post_lifecycle(Lifecycle_State.STOPPING, 'test request')
            _drain_lane(loop)
        finally:
            loop.call_soon_threadsafe(loop.stop)
            pump.join(SEAM_WAIT_SECONDS)
            cancel_and_close(loop)

        assert applied and all(ident != poster for ident in applied), applied
        assert machine.state is Lifecycle_State.STOPPING


# ===========================================================================
# P7 - the menu's stop request survives the menu tail (F-A5 reviewer P0)
# ===========================================================================

class TestP7MenuStopWins:
    """Menu choice 4 ("End the program") returns NORMALLY from display_menu
    after posting STOPPING. The listening pass must then NOT start the
    listeners and must NOT post RUNNING over the stop (F-A5 reviewer P0 found
    exactly that clobber: the menu tail's unconditional RUNNING post restarted
    the listeners and run() parked forever, and every mock in the suite hid it
    because no test wired a real machine to a real menu outcome)."""

    def _menu_outcome_run(self, monkeypatch, outcome, posts_stop):
        from free_snap_tap import Lifecycle_Machine, MainLogic
        from fst_data_types import Lifecycle_State
        kb, seen = _make_run_stub_keyboard()
        logic = MainLogic(kb)
        machine = Lifecycle_Machine()
        kb.set_lifecycle(machine)
        kb.arg_manager.MENU_ENABLED = True   # the startup asks for the menu
        # the stub leaves WIN32_FILTER_PAUSED as an unset MagicMock attribute,
        # which is truthy; _observe_state reconciles that flag, so the pin sets
        # the value the product would have (a bool)
        kb.arg_manager.WIN32_FILTER_PAUSED = False

        def menu():
            if posts_stop:
                # what CLI_menu.display_menu does on choice 4 (fst_manager.py)
                kb.arg_manager.STOPPED = True
                machine.post_transition(Lifecycle_State.STOPPING,
                                        'menu choice 4 - End the program')
            return outcome

        kb.cli_menu.display_menu.side_effect = menu

        parks = []

        async def counting_park(self, observed):
            parks.append(observed)
            if len(parks) > 1:
                raise _SecondPark()

        monkeypatch.setattr(MainLogic, '_park', counting_park)
        try:
            logic.loop.run_until_complete(logic.loop.create_task(logic.run()))
            parked_again = False
        except _SecondPark:
            parked_again = True
        finally:
            cancel_and_close(logic.loop)
        return kb, machine, parked_again, seen

    def test_menu_choice_four_stop_survives_the_menu_tail(self, monkeypatch,
                                                          capsys):
        """The stop wins: no listener start, no 'started' print, the machine
        ends STOPPING and run() returns instead of parking again."""
        from fst_data_types import Lifecycle_State
        kb, machine, parked_again, _ = self._menu_outcome_run(
            monkeypatch, 'stop', posts_stop=True)

        assert not parked_again, (
            "run() parked after the menu asked to stop: the menu tail posted "
            "RUNNING over the STOPPING (F-A5 reviewer P0).")
        assert machine.state is Lifecycle_State.STOPPING, machine.state
        assert kb.start_listener.call_count == 0, (
            "the listeners started although the menu asked to end the program")
        assert 'Free Snap Tap started' not in capsys.readouterr().out

    def test_menu_start_still_launches_the_listeners(self, monkeypatch, capsys):
        """The other menu outcome keeps working (anti-vacuity for the pin
        above): a start choice launches the listeners, prints the started line,
        and the machine moves back to RUNNING."""
        from fst_data_types import Lifecycle_State
        kb, machine, parked_again, _ = self._menu_outcome_run(
            monkeypatch, 'start', posts_stop=False)

        assert parked_again, (
            "a menu start must reach the park - run() ended early, so the pin "
            "above could pass for the wrong reason")
        assert machine.state is Lifecycle_State.RUNNING, machine.state
        assert kb.start_listener.call_count == 1
        assert 'Free Snap Tap started' in capsys.readouterr().out


# ===========================================================================
# P8 - the REAL wake path of the park (F-A5 reviewer P2-3)
# ===========================================================================

class TestP8ParkWakePath:
    """The pins above replace MainLogic._park to observe the loop's DECISION;
    these drive the real park coroutine, because the clear-then-compare
    handshake (no lost wake-up) is F-A5's core mechanism and must not be
    simulated away."""

    def test_the_park_wakes_on_a_transition_posted_while_it_waits(self):
        from fst_data_types import Lifecycle_State
        kb, _ = _make_run_stub_keyboard()
        logic = _logic_with_attached_park(kb)
        machine = logic.lifecycle

        async def drive():
            task = logic.loop.create_task(
                logic._park(Lifecycle_State.RUNNING))
            await asyncio.sleep(0)          # let the park clear + start waiting
            assert not task.done(), (
                "the park returned without waiting - it saw a state change that "
                "never happened")
            machine.post_transition(Lifecycle_State.STOPPING, 'test wake')
            await asyncio.wait_for(task, timeout=SEAM_WAIT_SECONDS)

        try:
            logic.loop.run_until_complete(drive())
        finally:
            cancel_and_close(logic.loop)

        assert machine.state is Lifecycle_State.STOPPING

    def test_the_park_does_not_wait_when_a_transition_landed_before_it(self):
        """The clear-then-compare leg: a request that arrived between the loop
        body and the park must not be lost in the clear - the park returns
        immediately instead of sleeping the heartbeat out."""
        from fst_data_types import Lifecycle_State
        kb, _ = _make_run_stub_keyboard()
        logic = _logic_with_attached_park(kb)
        logic.lifecycle.post_transition(Lifecycle_State.STOPPING, 'before the park')

        async def drive():
            await asyncio.wait_for(
                logic._park(Lifecycle_State.RUNNING), timeout=SEAM_WAIT_SECONDS)

        try:
            logic.loop.run_until_complete(drive())
        finally:
            cancel_and_close(logic.loop)

        assert logic.lifecycle.state is Lifecycle_State.STOPPING


def _logic_with_attached_park(kb):
    """MainLogic with its park armed: the wake event is created on the loop
    thread inside run(); these pins drive _park directly, so they attach the
    pair themselves."""
    from free_snap_tap import MainLogic
    import asyncio as _asyncio

    logic = MainLogic(kb)
    logic._wake = _asyncio.Event()
    logic.lifecycle.attach(logic.loop, logic._wake)
    return logic
