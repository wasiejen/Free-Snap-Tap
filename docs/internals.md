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

