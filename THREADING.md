# THREADING - the thread and ownership contract

FST runs four threads and shares mutable state between them. This document is
the contract: which threads exist, which object owns each mutable area, who may
write it, and which seams make the sharing safe. It is the prose form of
`fst_runtime_state.py` (`AREAS`), which the suite checks against the real source
(`tests/test_threading_contract.py`), so a claim here cannot silently drift.

Origin: architecture review Item 8, landed as plan unit F-C4. The failure mode
it guards is stated there and is the reason this file exists at all: "every fix
from here on depends on tribal knowledge about which thread may touch what;
new contributors (or agents) will add the next race silently."

Scope discipline from the same review: this is ONE owner map plus the command
seams that already exist. It is not an actor model, and no lock was added to
the hook pump to get here.

## Thread inventory

| Thread | Where it starts | What it runs | Lifetime |
|---|---|---|---|
| Qt / GUI (process main thread) | `free_snap_tap.py` `__main__`, GUI mode: `QApplication([])` then `app.exec()` | tray icon, status indicator, overlay, toast widgets, the Qt slots and QTimers in `fst_overlay.py` | from start until the tray Exit or window close |
| Logic loop | `free_snap_tap.py` `__main__` GUI mode: `Thread(target=logic.start_async_thread, daemon=True)`; the loop itself is created earlier in `MainLogic.__init__` (`asyncio.new_event_loop()`) | `MainLogic.run()` under `loop.run_forever()`; `Focus_Task.run` (`fst_tasks.py`); macro playback and repeat tasks; the toast drain pump task; the config-reload lane; `Lifecycle_Machine._apply` | created at startup, joined and cleaned by `MainLogic.shutdown` / `cleanup` |
| Keyboard hook pump | `fst_keyboard.py` `init_listener` / `start_listener` (`keyboard.Listener`) | `keyboard_win32_event_filter` and therefore `_win32_event_filter`, synchronously inside pynput's `_handler` | started after config load, stopped in `cleanup` |
| Mouse hook pump | same `init_listener` / `start_listener` (`mouse.Listener`) | `mouse_win32_event_filter` | same |

Headless mode (no tray icon and no status indicator) has **no Qt thread**: the
main thread runs `MainLogic.run_headless()`, so the main thread IS the loop
thread, and the two hook pumps are the only other threads. In every mode the
asyncio loop is owned by `MainLogic`, never created implicitly.

## The routing rule (how a thread asks for work elsewhere)

Three seams, one shape. Each runs INLINE when no loop is wired (tests, and the
pre-wire moment at startup) and INLINE when the caller already is the loop
thread, so a request is never lost and can never deadlock against itself:

- `Output_Manager.pump_lane` (`fst_manager.py`) - an ACTION leg the pump must not wait for. The
  pump returns its suppression value immediately; the work is scheduled on the
  loop and its failure is surfaced through `check_result`, never as "scheduled
  means success".
- `FST_Keyboard._run_on_loop_or_inline` - a BLOCKING, non-suppressing leg
  (the config reload: file read plus rebuild). Plain callback via
  `call_soon_threadsafe`, named in the log when it fails.
- `Lifecycle_Machine.post_transition` - a state change request. Applied on the
  loop thread by `_apply` (see `lifecycle` below).

Why the shape exists: a low-level hook callback that blocks past
`LowLevelHooksTimeout` is removed by Windows and the events that follow arrive
UNFILTERED, with suppression dead mid-action. Every "can the pump wait?"
question in this repo has the same answer: no. The routing contract is pinned
in `tests/test_pump_async_lane.py` (`TestFallbackContract`). The reload lane itself (`_schedule_reload`, `_reload_lane`) lives in `fst_keyboard.py`; the config parse and presort machinery it drives is `Config_Manager` in `fst_manager.py`.

## The mutable areas

The same eight rows are machine-readable in `fst_runtime_state.AREAS` with the
file and symbol each claim points at.

| Area | Holder | Owner | Who writes it | Rule |
|---|---|---|---|---|
| `flags` | `FST_Keyboard.arg_manager` (`Argument_Manager`) | loop | loop, keyboard pump, Qt | single-word bool/int control flags. One attribute store is atomic under the GIL and last-writer-wins IS the semantics. A compound read-modify-write on these flags is forbidden until the writers are marshaled (open follow-up below). |
| `containers` | `FST_Keyboard._runtime` (`Runtime_Snapshot`) | loop | loop, keyboard pump, Qt | whole-generation swap, see the seams below. The loop binds it (reload lane, focus coroutine), the pump binds it from the `ConfigError` rebuild leg inside `check_control_actions`, and Qt binds it from the tray Reload (`reload_from_file`). Each bind is one store, so a reader still sees only complete generations; the binders are not serialized with each other (last bind wins) - routing them behind the one reload lane is follow-up 1. (The startup bind runs on the main thread before any other thread exists, so it races nothing.) |
| `input_state` | `FST_Keyboard.state_manager` (`Input_State_Manager`) | keyboard pump | pump, loop, Qt | per-key press/toggle state and key times. The pump feeds every event in, and the control-combo legs it runs bare (return-to-menu, exit, pause) reset the state on the pump too; the loop resets it when a focus app starts listening (`update_args_and_groups` from `_start_listening`) and on a reload that failed with `ConfigError`; Qt resets it from the tray Reload and from the tray pause / return-menu / exit legs, which call those control legs directly (`stop_all_repeating_keys` in `fst_manager.py` is the reset writer). Single store per key; no multi-field read-modify-write. |
| `tickets` | `FST_Keyboard._ledger` (`Ticket_Ledger` in `fst_data_types.py`) | loop | pump, loop | a sibling of the generation, never part of it. Single-store discipline: a thread that did not open a ticket must not read it, mutate two fields and write it back. |
| `display_posts` | `FST_Keyboard._toast_offload` (`Toast_Offload`) | loop | any thread | the designed seam: one `deque.append` per poster (GIL-atomic, no lock, no I/O), drain only on the loop. Overflow drops the oldest; the drop counters are diagnostics, not control flow. |
| `macro_debt` | `FST_Keyboard._macro_held` | loop | loop, keyboard pump, Qt | the press tickets a macro playback injected and has not released yet: `{alias: {vk: Ticket}}`. The loop's macro legs record and pop it; a quit, pause or return-to-menu leg claims it by POPPING, and the pop IS the claim, so a ticket can be claimed once no matter which thread gets it: those legs run on the pump when a control combo triggered them, and on Qt when the tray or menu called the same control leg. It is the ledger's fast index, so the ledger stays the registry and a generation swap never touches it. |
| `lifecycle` | `MainLogic.lifecycle` (`Lifecycle_Machine`) | loop | loop only | ONE writer (`_apply`); everyone else posts. `STOPPING` is terminal. |
| `loop` | `MainLogic.loop` | loop | loop | built in `MainLogic.__init__`, before any thread starts; only the logic thread runs it. Other threads schedule onto it and never run loop code themselves. |
| `task_registry` | `FST_Keyboard._macro_task_dict`, `Output_Manager._repeat_thread_dict` | loop | pump, loop | live asyncio tasks and their handles: added where the leg is detected (sometimes the pump), cancelled on the loop. The name "thread_dict" is historical - they are asyncio handles, not threads. |

Three more holders that are not areas of sharing:

- `FST_Keyboard.TIME_DIFF` / `FST_Keyboard.START_TIME` are CLASS attributes of
  `FST_Keyboard` (`fst_keyboard.py`), initialised by the keyboard pump on the
  first event it sees (`_win32_event_filter`) and read from there. They are
  mutable runtime state living on the class namespace, owned by the pump;
  moving them behind the owner is a follow-up below.
- `FST_Keyboard._drop_ring` (a bounded `deque`) is appended by BOTH pumps, one
  raw tuple per event, and read by the drop ring dump in
  `report_event_drop`. It is
  best-effort diagnostics like the toast counters: append-only, bounded, and
  never read for control flow.
- `MainLogic._cleaned_up` with `MainLogic._cleanup_lock` is the exactly-once
  shutdown seam: the loop-thread `finally`, the headless `finally` and the GUI
  `shutdown()` all call `cleanup()`, the lock makes the check-and-set atomic,
  and every leg is isolated so one failing leg cannot skip the rest.

## The seams that make sharing safe (and what each one guarantees)

- **Snapshot swap (`containers`).** A rebuild builds a complete fresh
  `Runtime_Snapshot` off to the side and binds it with ONE attribute
  assignment; a reader binds `self._runtime` once into a local and reads only
  through that local (`rt = self._runtime` in `_win32_event_filter`). The pump
  therefore only ever sees a generation that is fully old or fully new - never
  a container set that was cleared and is half refilled, and never one event
  split across two generations. Swap granularity is the whole generation (all
  rebuilt containers at once) precisely so a new tap-group set can never be
  paired with an old owner registry. No read-path lock: an attribute bind is
  one step under the GIL. Rebuilds are not serialized with each other; two
  triggers can both build and the last bind wins as a complete generation.
  (`Runtime_Snapshot`.)
- **Reload coalescing.** `FST_Keyboard._reload_lock` guards only a
  test-and-set of `_reload_pending` - held for microseconds, never across I/O,
  and NOT on the filter read path. A reload requested during a pending reload
  is coalesced; the flag clears when the work starts, so the state on disk is
  always reached by at most one further pass.
- **Toast offload (`display_posts`).** Posters append, the loop drains into the
  Qt bridge, so the bridge is never touched from a pump thread.
  `CONSTANTS.TOAST_OFFLOAD` is on by default, so posters take the queue; the
  `-no_toast_offload` start argument (`fst_manager.py`) flips it back to the
  legacy direct emit from the poster thread; with
  no bridge (headless) posts are drop-counted no-ops.
- **Lifecycle (`lifecycle`).** The audit trail is one `[Lifecycle] old -> new
  (reason)` log line per applied transition; the pre-F-A5 write-only flags
  could not show who moved the state. `FST_Keyboard.set_lifecycle` hands the
  handle to the legs; `post_lifecycle` is the posting door.
- **Ticket ledger (`tickets`, `fst_data_types.py`).** Transitions are `open` / `mark` / `close`,
  readers get new snapshot lists, compaction prunes in place, so a list a
  concurrent writer holds is never the discarded one.

## The pump hot-path contract (the rule to keep)

The keyboard and mouse pumps run the filter synchronously inside the OS hook
callback. On that path:

1. Bind the runtime generation once per event into a local; read containers
   through the local. Never read `self._runtime` twice in one operation.
2. Container access is dict/`get` only. No new attribute construction, no
   allocation-heavy work per event.
3. No lock acquisition, no file or window I/O, no `sleep`, no waiting on the
   loop. Anything blocking is routed with `pump_lane` /
   `_run_on_loop_or_inline`.
4. `SystemHook.SuppressException` is pynput's suppression control flow, not a
   leg death: it is reported and re-raised, never swallowed (swallowing passes
   the event unfiltered).
5. A genuine leg exception is reported through `report_event_drop` (the drop
   ring counts it) rather than escaping into pynput's handler.

`tests/test_threading_contract.py` pins rules 1 and 3 structurally: the filter
contains exactly one read of `self._runtime` (the bind, wherever it sits), and
no lock acquisition anywhere on the pump path - so adding a lock to the hot
path, or reading the attribute a second time, fails the suite instead of
passing quietly. Rule 2 (dict/`get` access only) is a review rule, not a pinned
one: nothing in the suite measures allocation.

## What this deliberately does not do

- No lock layer over the flags. Marshaling every flag write to the loop thread
  would move tray and menu reactions behind a queue; the current single-store
  writes are safe, and Item 8 rated the conversion as optional polish. It is a
  named follow-up, not a silent omission.
- No signal-driven GUI. `fst_overlay.py` `perform_periodic_update` re-reads
  in-process flags every 500 ms (`update_timer.start(500)`) and queries no
  windows; it works and converting it is polish.
- No actor model, no queue per holder. One owner map, the existing command
  seams, and pins that keep the pump cheap.

## Named follow-ups (each needs its own unit)

1. Marshal the three generation binders (`containers`) behind the one reload
   lane, so a rebuild is serialized instead of last-bind-wins. The binds are
   individually safe today; the missing part is serialization between them.
2. Marshal the control-flag writers (`flags`) so a compound update becomes
   legal; today the rule is "one store per flag" and that rule is load-bearing.
3. Move `FST_Keyboard.TIME_DIFF` / `START_TIME` behind the owner so the class
   namespace stops carrying mutable runtime state.
4. Replace the GUI 500 ms flag poll with signals now that state has a named
   owner (optional polish, per Item 8).

## Verification

`tests/test_threading_contract.py` asserts: every area's holder is reachable
through `FST_Keyboard.runtime_owner` (identity with the live holder); every
area in the map has an owner role, at least one documented writer and a rule;
the eight documented areas are present by name; every `file + symbol` citation
in the map still resolves in the product source; `fst_runtime_state` itself
imports no threading and creates no lock; and the pump hot-path contract above
holds in the filter source.
