# Free Snap Tap v1.4.0

A reliability, input-fidelity, and quality-of-life release. Suppression and
macro timing are hardened, the config and console start-up are clearer, and
the overlay now follows your display changes. Highlights below; the full list
is in [CHANGELOG.md](CHANGELOG.md).

## Headline features

- **Self-elevation with `--elevate`.** A not-yet-elevated run relaunches the
  same exe through one Windows "run as administrator" prompt (all other start
  arguments carried over, the flag stripped in the child so no relaunch loop),
  then exits 0. An already-elevated run logs `[Elevation] running elevated`
  and starts normally; running from `python.exe` (dev mode) never relaunches.
  `-elevated` is accepted as an alias. For prompt-free autostart use a
  scheduled task with `/RL HIGHEST`.
- **Single-instance guard.** FST runs one instance at a time; a second start
  logs `[SingleInstance] another FST is already running - exiting` and exits 1.
  A mutex-API failure fails open (a warning, then a normal start).
- **Lifecycle logging.** Every state change now logs one
  `[Lifecycle] <old> -> <new> (<reason>)` line, so what FST was doing at any
  moment is answerable from the log alone.
- **`-default_off` / `-default-off`.** A focus section (or the default section)
  can build from its OWN group lines only - the default group's group lines are
  not merged in, so global conveniences cannot collide inside a game profile.
  Default start arguments stay merged. (`-default_on` / `-default-on` shipped
  and was retired the same day; it now only prints a warning.)
- **Dashed spellings.** `-` and `_` are interchangeable in an argument NAME
  (`-always-active` == `-always_active`); the value after `=` stays verbatim.

## Improvements

- **One delay range, 0..1000 ms.** The config side and the runtime now agree;
  a delay of `(0, 0)` really waits 0. A macro segment delay (`key|5000`) stays
  unbounded (a timeline can wait minutes); an obviously large value warns above
  30 s but is still accepted.
- **`-hide_cmd_window` off switch + startup trace.** The console decision is
  made once, after the config loads; without the flag the window is never
  touched. One INFO line (`config_file=… exists=… cmd_window=…`) makes the
  "why is the window hidden / why did it not read my config" question
  self-reading from the log.
- **Config found on every launch route.** The default `FSTconfig.txt` now
  resolves next to the exe/script, never the working directory.
- **Write-time file stamps.** An omitted *time stamp* on `save_into_file` /
  `append_to_file` stamps the line when the write executes, not when the
  constraint is evaluated.
- **Overlay keeps its place.** A resolution or scale change keeps the
  user-dragged overlay position (the same screen fraction, clamped on-screen);
  toast boxes now fit their text and mirror the indicator side.
- **Clearer config reports.** Item numbers agree between the violation report
  and the menu/status dump; every report line carries its line number and a
  declared name. A line that repeats its own alias/name is rejected.

## Bug fixes

- **Input fidelity.** LL-hook pump no longer blocks on the SendInput/file/
  clipboard legs; suppression control flow restored at both pump entries;
  keystroke races during reload/focus change closed; a held tap-group key is
  reliably released through a reload race.
- **No more macro freezes/strays.** A running macro no longer stalls on a slow
  active-window read (the read moved to a worker thread); a queued macro wait
  is dropped when its context ends (focus change, abort, pause, reload).
- **Steady lifecycle.** Shutdown cleanup runs exactly once on every exit path;
  headless mode runs the same asyncio loop as the GUI modes; alt+END really
  quits and alt+PAGE_DOWN really re-shows the menu.
- **Display changes.** A resolution/DPI change repositions the overlay and
  crosshair, and the status cycle no longer clips at the bottom right.
- **Robust start-up & restore.** An empty command-line argument no longer
  crashes start-up; a failed `restore_backup` can no longer lose your save
  state (the swap is atomic and recovers residue).
- **CI.** The test step runs the chunked lane (`python suite_lane.py`), curing
  the abort that killed every push since 2026-11-16.

## Upgrade note

Your config file is now resolved **next to the exe/script**, not the working
directory. A start-up shortcut that landed in `C:\Windows\System32` no longer
starts FST with an empty auto-created config - **the boot shortcut needs no
working-folder fix anymore.** An explicit `-file=` override is still taken
exactly as given.

## Full history

- Per-release detail: [CHANGELOG.md](CHANGELOG.md).
- Earlier versions (v1.2.0 and below): the
  [Wiki](https://github.com/wasiejen/Free-Snap-Tap/wiki).
