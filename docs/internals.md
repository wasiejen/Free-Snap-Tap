# Internals - focus polling contract

> Part of the FST docs: [index](README.md) - [features & install](../README.md)

### [Focus polling contract - designed behavior (Item 14)]

FST observes the foreground window with TWO poll loops - this is the documented decision (architecture review Item 14, unit F-B5):

- **Focus poll** - the asyncio task `Focus_Task.run` (`fst_tasks.py`) runs on the logic loop thread: one active-window title query (pygetwindow -> Win32 `GetForegroundWindow` + `GetWindowTextW`), evaluate focus groups, sleep 0.25 s. Focus transitions of up to 250 ms are accepted product behavior.
- **GUI timer** - the overlay (`fst_overlay.py`, `perform_periodic_update`) re-reads in-process flags (pause states, focus name, colors) every 500 ms on the Qt thread. It queries NO windows.

Why NOT event-driven (`SetWinEventHook`): a hook adds a thread/callback surface and a new class of bugs; the practical gain over a 250 ms poll is small and the migration cost is disproportionate. Polling stays the design.

Slow or unresponsive foreground apps: the title read sends a message to the window's OWNING thread, so a hung app stalls the query - and macro/toast scheduling shares the logic loop thread, so it is delayed too. UIPI-blocked titles read as empty. This API set has NO timeout variant for the title read, and a watchdog thread was rejected - the poll stays synchronous.

What the query wrapper `_get_active_window_title` guarantees:

- no foreground window -> `"None"` sentinel -> treated as focus lost (input filter pauses, or default groups take over with `-always_active`).
- a transient raising failure (Win32/ctypes exception) -> the LAST-KNOWN title is kept, so a single bad query can neither kill the focus task (pre-F-B5 it did, and tracking stayed dead until restart) nor toggle the active focus group. An empty last-known title (see UIPI above) degrades to the `"None"` sentinel.
- a true win32 stall (hung owning thread) can still block one poll cycle - bounded only by the app recovering; this is the documented, accepted limit of the design.

### [Delay timing rulings - segment delay and the default pair]

moved from `prefixes-suffixes.md` ([Suffix/Delays]):

  - **A segment delay is deliberately UNBOUNDED** (maintainer decision 12, 
    2026-11-17): a macro may have to wait seconds or minutes for the program in
    front of it, so no limit is imposed on *time*. The delay KNOBS (`-tapdelay`,
    `-macrodelay`, bound 0..1000 ms) are a different concept -
    they set the random delay a line gets when it states none. There is no
    `-sequencedelay` start argument: a per-segment wait uses the `key|*time*`
    suffix, a per-line default uses `-macrodelay`. Two rules come
    with the unbounded value:
      - the config check asks about an obviously large one: above 30000 ms the
        load reports `very long delay (45000 ms) in a|45000 - intentional?` as a
        WARNING. It never rejects the line and never changes the value;
      - a wait never outlives its context: when a focus-group change, a macro
        abort, a pause (ALT+DELETE) or a config reload ends the context a
        playback belongs to, the pending delay is dropped and a key the playback
        still owed is released immediately - a late segment never fires into the
        newly active program.
  - **the shipped DEFAULT delay pair is 2-10 ms** (maintainer decision 16,
    2026-11-23): the pair sits BELOW the ~15.6 ms Windows clock tick, so every
    inter-key gap quantizes to ONE tick - default playback is effectively
    immediate (a long string lands as a burst). For a visible per-key rhythm,
    state a pair whose LOWER bound is above the tick (the parser sorts the
    pair), e.g. `-macrodelay=25,20`.

### [Macro playback design]

moved from `groups-macros.md` ([Macros]):

- will be played as asyncio tasks (interruptible, non-blocking) to not interfere with real input while waiting for the delays
