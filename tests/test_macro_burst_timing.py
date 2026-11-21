"""MACROBURST pins: a macro's per-key spacing must survive a slow foreground app.

The maintainer's live bug (2026-11-21): his date-writing macro "seems as if the
delay waits the time each individual key press and release would take and then
immediately writes everything without delay" - no spacing at the output, after a
wait, on EVERY trigger.

Three hypotheses were measured at `41addc0`; two died.

  1. AN ACCUMULATE-THEN-BURST SITE IN THE EMIT PATH - NO. An 8-key macro driven
     through the production load leg and the real hook entry injects its 16
     events 31..63 ms apart with `-macrodelay=60,20`. There is no batched
     futures list either: the emit path has exactly two delays
     (`Output_Manager.execute_key_event` and the tap switch), each awaited
     between its own two sends, and `macro_task` awaits one event at a time.
  2. LOOP STARVATION - NO (for a burst). The focus poll and the macro do share
     the product loop, but a 500 ms block on that thread inserts ONE long gap
     and the timeline then continues spaced. It cannot batch, because each
     event's sleep only starts after the previous event left: at most one timer
     is ever pending. What a stall DOES cost is that one stall-sized gap in the
     middle of a running macro - which is a real defect and is fixed and pinned
     below (the read now runs off the loop thread).
  3. A SMALL OR ZERO DELAY PAIR - YES, and this is the shape he describes.
     `extract_data_from_key` bakes the knob pair into every event at parse
     time, and the DEFAULT knob pair is `MACRO_MAX=10, MACRO_MIN=2`. A 2..10 ms
     sleep is below the Windows clock tick (~15.6 ms), so a 16-injection macro
     spends ~16 tick-quantized waits (~250 ms of wall time) while each individual
     step lands one tick or less apart - visually one immediate write with a
     hang in front of it. `-macrodelay=0,0` is the pure case (decision 9a: a
     written 0 is a true zero). Whether the default pair should stay 10/2 is a
     product decision, recorded for the maintainer, not decided here.

What these pins lock:

  1. the spacing a macro gets comes from its own delay pair, per event, and the
     whole sequence arrives (no batching in either direction);
  2. a stalled foreground read cannot insert a stall-sized gap into a running
     macro (the RED pin - it fails on the synchronous poll);
  3. the structural half, by thread identity: the blocking win32 read does not
     run on the macro loop thread;
  4. the bake itself: the `<arg>` line's position does not change what the
     events were baked with, and the default pair is named explicitly (the
     number behind the symptom).

No OS input exists on this path - the pynput controllers are the lane's
recorders, so the F-B7 tripwire stays armed.
"""
import asyncio
import random
import threading
import time
from types import SimpleNamespace

import fst_tasks
from contract_lane import FLAGS_REAL, WM_KEYDOWN
from fst_manager import Output_Manager
from vk_codes import vk_codes_dict

VK = vk_codes_dict

# the maintainer's shape: 8 keys -> 16 injections (press + release each)
DATE_MACRO = 'x :: 1, 9, 0, 2, 0, 2, 6, 1\n'
KNOBS = '<arg>-macrodelay=60,20\n'

# The draw is 20..60 ms, so a spaced 16-injection macro spreads over roughly
# 600 ms; a batched one over ~0 ms. Every bound below sits in that gap: it is
# far above anything batching can produce and far below what the configured
# delays produce, so OS clock-tick jitter (15.6 ms by default, 1 ms when some
# other process raises the resolution) cannot decide the verdict.
SPREAD_FLOOR_MS = 150.0        # a spaced run: >= ~600 ms. A burst: ~0 ms.
STALL_BOUND_MS = 200.0         # one stall in the stream: 500 ms. Spacing: ~60 ms.
ZERO_SPREAD_CEILING_MS = 150.0  # a written zero stays immediate.


def restore_the_real_delay_draw(monkeypatch):
    """The lane zeroes `get_random_delay` so the goldens stay deterministic.
    These pins are about timing, so the product's own draw goes back in."""
    monkeypatch.setattr(Output_Manager, 'get_random_delay',
                        lambda self, max, min=0: random.randint(min, max))


def trigger_the_macro(lane, key='x'):
    """One synthetic WM_KEYDOWN at the real hook entry (no listener, no OS)."""
    lane.kb.keyboard_win32_event_filter(
        WM_KEYDOWN, SimpleNamespace(vkCode=VK[key], time=lane._next_time(),
                                    flags=FLAGS_REAL))


async def _wall(seconds):
    start = time.monotonic()
    while time.monotonic() - start < seconds:
        await asyncio.sleep(0.02)


def let_the_loop_run(loop, seconds):
    """Real wall time on the PRODUCT loop (the lane's own convention: it is a
    separate event loop, driven from this thread by run_until_complete), so the
    product's own sleeps really wait."""
    loop.run_until_complete(_wall(seconds))


class WallClock:
    """Stamps at the product's own send seam - the last point before the
    (mocked) controller. The order is the app's order; the stamps are the
    spacing the maintainer's fingers feel."""

    def __init__(self, output_manager):
        self._real_send = output_manager.send_key_event
        self.stamps = []
        output_manager.send_key_event = self._send

    def _send(self, key_event):
        self.stamps.append(time.monotonic())
        return self._real_send(key_event)

    def gaps_ms(self):
        return [(b - a) * 1000.0 for a, b in zip(self.stamps, self.stamps[1:])]


def test_an_eight_key_macro_injects_spaced_not_batched(contract, monkeypatch):
    """CONTRACT: a macro's own delays sit BETWEEN its injections - the sum is
    never paid up front and the sequence never arrives as one instant burst."""
    restore_the_real_delay_draw(monkeypatch)
    contract.load(KNOBS + DATE_MACRO)
    assert contract.kb.arg_manager.MACRO_MAX_DELAY_IN_MS == 60
    assert contract.kb.arg_manager.MACRO_MIN_DELAY_IN_MS == 20

    clock = WallClock(contract.kb._output_manager)
    contract._reset_clock()
    trigger_the_macro(contract)
    let_the_loop_run(contract._loop, 1.2)

    assert len(clock.stamps) == 16, clock.stamps
    spread_ms = (clock.stamps[-1] - clock.stamps[0]) * 1000.0
    # the anti-burst claim: the sequence occupies the time its own delays ask
    # for, instead of arriving at once
    assert spread_ms >= SPREAD_FLOOR_MS, (spread_ms, clock.gaps_ms())


def test_a_stalled_foreground_read_does_not_stall_a_running_macro(
        contract, monkeypatch):
    """CONTRACT: the active-window read (`GetWindowTextW` messages the FOREGROUND
    app's owning thread; the API set has no timeout variant) must not be able to
    freeze a macro that is mid-timeline on the same loop. A 500 ms stall in the
    read may not reappear as a 500 ms hole in the injection stream.

    The stall is armed to land IN THE MIDDLE of the timeline, which is the live
    shape: the finger presses, the macro starts spacing itself out, and the
    0.25 s poll performs its read while the timeline is still running.

    Thread shape is the product's too: one driver runs the product loop (its
    loop thread), the trigger enters on this thread the way the hook pump hands
    work over with `run_coroutine_threadsafe`.

    Isolated on purpose: an unknown title would ALSO make the poll rebuild the
    generation, and that rebuild legitimately flushes playbacks (decision 12,
    pinned in the contract lane) - a different contract. Only that rebuild leg
    is stubbed here, so the only thing this pin can fail on is thread/timing.
    """
    restore_the_real_delay_draw(monkeypatch)
    stall = {'armed': False, 'done': False}

    def sometimes_hung_query(stale_title):
        # one read, mid-macro, takes half a second: what a busy or hung
        # foreground owning thread does to GetWindowTextW
        if stall['armed'] and not stall['done']:
            stall['done'] = True
            time.sleep(0.5)
        return stale_title or 'None'

    monkeypatch.setattr(fst_tasks, '_get_active_window_title',
                        sometimes_hung_query)
    contract.load(KNOBS + DATE_MACRO)
    monkeypatch.setattr(contract.kb, 'update_args_and_groups',
                        lambda *args, **kwargs: None)
    clock = WallClock(contract.kb._output_manager)
    loop = contract._loop

    driver = threading.Thread(target=lambda: let_the_loop_run(loop, 2.5),
                              name='loop-driver')
    driver.start()
    handles = {}
    loop.call_soon_threadsafe(lambda: handles.update(
        poll=loop.create_task(fst_tasks.Focus_Task(contract.kb).run())))
    # let the poll complete its first (instant) query and go to sleep
    time.sleep(0.05)

    # the live shape: press, then the poll's read lands mid-timeline
    contract._reset_clock()
    contract.kb.arg_manager.WIN32_FILTER_PAUSED = False
    stall['armed'] = True
    trigger_the_macro(contract)

    driver.join(10)
    assert not driver.is_alive(), 'the loop driver never returned'
    assert stall['done'], 'the poll never performed a read during the macro'

    loop.call_soon_threadsafe(lambda: handles['poll'].cancel())
    let_the_loop_run(loop, 0.05)

    assert len(clock.stamps) == 16, clock.stamps
    gaps = clock.gaps_ms()
    # the draw is 20..60 ms; the stall is 500 ms. A read that shares the loop
    # thread shows up as a gap of that order; an off-loop read cannot.
    assert max(gaps) < STALL_BOUND_MS, (
        'a stalled foreground read left a stall-sized hole in the macro: %r'
        % gaps)


def test_the_delay_pair_an_event_carries_is_the_knob_pair(contract):
    """CONTRACT (the number behind the symptom): a macro event's delay pair is
    baked from the knob at parse time, and the bake does not depend on where the
    `<arg>` line sits. The default pair is 10/2 ms - below the Windows clock
    tick, which is why an untouched config reads as one immediate write. If that
    default ever changes, this pin names the old value."""
    contract.load(KNOBS + DATE_MACRO)
    baked = [list(ke.constraints)
             for macro in contract.kb._runtime.macros
             for group in macro._key_groups
             for ke in group.key_events]
    assert baked and all(pair == [60, 20] for pair in baked), baked

    contract.load(DATE_MACRO)          # no <arg> line at all
    defaults = [list(ke.constraints)
                for macro in contract.kb._runtime.macros
                for group in macro._key_groups
                for ke in group.key_events]
    assert defaults and all(pair == [10, 2] for pair in defaults), defaults

    contract.load('<arg>-macrodelay=0,0\n' + DATE_MACRO)
    zeros = [list(ke.constraints)
             for macro in contract.kb._runtime.macros
             for group in macro._key_groups
             for ke in group.key_events]
    assert zeros and all(pair == [0, 0] for pair in zeros), zeros


def test_a_written_zero_stays_a_true_zero_burst(contract, monkeypatch):
    """CONTRACT (decision 9a, characterization): with `-macrodelay=0,0` and no
    segment delay written, the macro really is immediate - the zero is honoured,
    not floored. Pinned so the spacing work above cannot quietly reintroduce a
    minimum delay."""
    restore_the_real_delay_draw(monkeypatch)
    contract.load('<arg>-macrodelay=0,0\n' + DATE_MACRO)
    clock = WallClock(contract.kb._output_manager)
    contract._reset_clock()
    trigger_the_macro(contract)
    let_the_loop_run(contract._loop, 0.6)

    assert len(clock.stamps) == 16, clock.stamps
    spread_ms = (clock.stamps[-1] - clock.stamps[0]) * 1000.0
    assert spread_ms < ZERO_SPREAD_CEILING_MS, spread_ms



def test_the_active_window_read_does_not_run_on_the_macro_loop_thread(
        contract, monkeypatch):
    """CONTRACT (the structural half, proven by thread identity rather than by
    source text): the blocking win32 read and the macro timeline do not share a
    thread, so the read's duration is not the timeline's latency."""
    seen = {}

    def recording_query(stale_title):
        seen['thread'] = threading.get_ident()
        return 'Notepad'

    monkeypatch.setattr(fst_tasks, '_get_active_window_title', recording_query)

    loop = contract._loop
    loop_thread = {}

    async def note_loop_thread():
        loop_thread['id'] = threading.get_ident()

    loop.run_until_complete(note_loop_thread())

    focus_task = fst_tasks.Focus_Task(contract.kb)
    poll = loop.create_task(focus_task.run())
    for _ in range(200):
        loop.run_until_complete(asyncio.sleep(0.005))
        if 'thread' in seen:
            break
    focus_task.stop()
    poll.cancel()
    try:
        loop.run_until_complete(poll)
    except asyncio.CancelledError:
        pass

    assert 'thread' in seen, 'the focus poll never queried the active window'
    assert seen['thread'] != loop_thread['id'], (
        'the blocking win32 read still runs on the macro loop thread')
