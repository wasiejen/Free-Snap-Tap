# Free Snap Tap v1.4.0

A reliability, input-fidelity, and quality-of-life release. Suppression and
macro timing are hardened, start-up is clearer, and the overlay now follows
your display changes. Highlights below; the full list is in
[CHANGELOG.md](CHANGELOG.md).

## Headline features

- **Self-elevation with `--elevate`.** A not-yet-elevated run relaunches the
  same exe through one Windows "run as administrator" prompt (other start
  arguments carried over, the flag stripped in the child, then exit 0); an
  already-elevated run logs `[Elevation] running elevated` and starts normally.
  `-elevated` is an alias; `python.exe` (dev) never relaunches. For prompt-free
  autostart use a scheduled task with `/RL HIGHEST`.
- **Single-instance guard.** One instance at a time - a second start logs
  `[SingleInstance] another FST is already running - exiting` and exits 1; a
  mutex failure fails open.
- **Lifecycle logging.** Every state change logs one
  `[Lifecycle] <old> -> <new> (<reason>)` line.
- **`-default_off` / `-default-off`.** A focus section builds from its own group
  lines only (default group's lines not merged in); default start arguments stay
  merged. `-default_on` shipped and was retired the same day (warning only).
- **Dashed spellings.** `-` and `_` are interchangeable in an argument name
  (`-always-active` == `-always_active`); the value after `=` stays verbatim.

## Improvements

- **One delay range, 0..1000 ms** (config and runtime now agree; `(0, 0)` waits
  0); a macro segment delay (`key|5000`) stays unbounded, warning above 30 s.
- **`-hide_cmd_window` off switch + startup trace.** The console decision is made
  once, after the config loads; one INFO line (`config_file=… exists=…
  cmd_window=…`) makes the hidden-window / config question self-reading.
- **Config found on every launch route** - `FSTconfig.txt` resolves next to the
  exe/script, never the working directory.
- **Write-time file stamps** - an omitted *time stamp* on `save_into_file` /
  `append_to_file` stamps when the write executes, not at constraint-eval time.
- **Overlay keeps its place** across a resolution/scale change (same screen
  fraction, clamped on-screen); toast boxes fit their text and mirror the
  indicator side.
- **Clearer config reports** - item numbers agree between the report and the
  menu/dump, every line carries its line number and declared name, and a line
  that repeats its own alias/name is rejected.

## Bug fixes

- **Input fidelity:** the LL-hook pump no longer blocks on the SendInput/file/
  clipboard legs; suppression control flow restored; keystroke races during
  reload/focus change closed; a held tap-group key releases through a reload race.
- **No more macro freezes/strays:** a running macro no longer stalls on a slow
  active-window read (moved to a worker thread); a queued macro wait is dropped
  when its context ends.
- **Steady lifecycle:** shutdown cleanup runs exactly once; headless runs the
  same asyncio loop as the GUI; alt+END really quits, alt+PAGE_DOWN re-shows the
  menu.
- **Display changes:** a resolution/DPI change repositions overlay + crosshair;
  the status cycle no longer clips.
- **Robust start & restore:** an empty command-line argument no longer crashes
  start-up; a failed `restore_backup` can no longer lose your save state.
- **CI:** the test step runs the chunked lane (`python suite_lane.py`), curing
  the abort that killed every push since 2026-11-16.

## Upgrade note

Your config file is now resolved **next to the exe/script**, not the working
directory - a boot shortcut that landed in `C:\Windows\System32` no longer
starts FST with an empty auto-created config, so **it needs no working-folder
fix anymore.** An explicit `-file=` override is still taken exactly as given.

## Full history

- Per-release detail: [CHANGELOG.md](CHANGELOG.md).
- Earlier versions (v1.2.0 and below): the
  [Wiki](https://github.com/wasiejen/Free-Snap-Tap/wiki).
