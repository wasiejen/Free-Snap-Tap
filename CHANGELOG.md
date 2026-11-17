# Changelog

All notable changes to Free-Snap-Tap are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Earlier releases (v1.2.0 and below) are listed in the version history on the
[Wiki](https://github.com/wasiejen/Free-Snap-Tap/wiki).

## [Unreleased]

### Fixed
- A queued macro wait no longer outlives the context it was started in
  (maintainer decision 12, 2026-11-17): a focus-group change, a macro
  abort, a pause (ALT+DELETE) or a config reload now drops a pending
  segment delay and releases a key the playback still owed at that
  moment. Before, a long `key|50000`-style wait could wake up and type
  into whichever program had come to the front in the meantime.
- A config line with an elevation argument (`-elevate`, `--elevate`,
  `-elevated`, `--elevated`) now gets ONE message instead of two:
  the clear hint that it belongs on the command line stays, and the
  extra generic `unknown start argument` line for that same config
  entry is gone (maintainer decision 11, 2026-11-17). On the real
  command line the generic wording still appears, because nothing
  else would explain the typo there.
- A key held by a tap group is now reliably released even when a real press
  of the same key races a config reload / focus change (F-A9, ticket-ledger
  veto consult, ladder R4): previously the rebuild's own release could be
  swallowed by the simulated-key veto leg when the real press re-armed the
  hold in between, and the app kept the key pressed (the FST-404 stuck-key
  class). The release ordering is unchanged; the veto leg now consults the
  ledger first - while FST owes the release, the injected release is
  delivered (never suppressed) and the debt closes at delivery.

### Changed
- A macro segment delay (`key|5000`) stays unbounded, and the docs now say
  so (maintainer decision 12, 2026-11-17): a timeline may legitimately
  wait minutes, so no limit applies to it - unlike the delay knobs
  (`-tapdelay` / `-macrodelay` / `-sequencedelay`), which keep their
  0-1000 ms bound. An obviously large value now gets one warning at
  config load (`very long delay (45000 ms) in a|45000 - intentional?`)
  above 30000 ms; the value itself is accepted as written.
- Startup robustness (maintainer decision 10, 2026-11-17): once startup has
  finished and before any worker or interface loop starts, the program
  hands its finished startup objects to Python's permanent generation,
  so the cyclic garbage collector never scans them again. This mitigates
  the crash class the test suite suffered (a collector pass landing
  inside Qt's C++ event handling) for the shipped app: the objects
  built during startup leave the scanner, while everything created
  afterwards - the interface's own windows included - stays under
  normal garbage collection.
- The start-argument and declared-name grammar now has ONE home too (F-C3,
  review Item 4 follow-up): `fst_config_parser` gained `arg_value` (the
  '-name=value' shape, which `apply_start_arguments` spelled with a
  hand-counted string slice eleven times), `prefix_matches` (the command-line
  world's lenient name test, now a named rule instead of three slice
  accidents), `split_item_prefix` (the `<alias>` / `(name)` prefix rule both
  validator walks re-implemented) and the `START_ARG_FLAGS`/`START_ARG_VALUES`
  vocabulary. The two entry worlds stay distinguishable: the command line keeps
  its branch dispatch (and still accepts `-tray_iconX` where a config `<arg>`
  line reports it unknown - pinned as it behaves today), the config validator
  keeps its table checks and every message unchanged. No behavior change; the
  runtime's section walk still cuts a declared name with `replace()` (it
  removes a repeated token later in the same line) - measured, pinned and left
  for a decision, because merging it would change which keys a real config
  feeds the containers.
- The config grammar has ONE implementation (F-C2, review Item 4): the comment
  cleaning, the ':' continuation join, the bracket-aware comma split, the item
  classification (tap group / rebind / macro / macro sequence / dropped), the
  default `(TAP_n)`/`(REB_n)`/`(MAC_n)`/`(SEQ_n)` naming, the dashed
  start-argument spelling rule, the `<focus>` name sanitizing and the delay
  value parse moved into a new `fst_config_parser` module that both
  `Config_Validator` and `Config_Manager.presort_lines` now consume. Before
  this, the validator and the runtime each carried their own copy of those
  rules and only comments kept them in sync. No behavior change: every
  message, every container and both known drift pairs (the validator accepts
  delay 0 while the runtime keeps `0 < delay <= 1000`; the report and the
  runtime containers count default names differently) are preserved as they
  are and pinned - unifying either pair is a separate decision, not a side
  effect of this refactor.
- The elevation start argument accepts `-elevated` as an alias of `--elevate`
  (WTD cross-product vocabulary parity, pair-approved 2026-11-16); `--elevate`
  stays canonical. An elevation spelling used as a config `<arg>` line
  (`-elevate`, `--elevate`, `-elevated` or `--elevated`) now warns with the
  self-explaining hint "'X' is a start argument for elevation - place it on
  the command line, not in the config" instead of the generic
  unknown-argument warning.
- The focus poll's active-window query is timeout-tolerant (F-B5, review
  Item 14 documented decision): a transient Win32/ctypes failure at the
  query no longer kills the focus task (tracking then stayed dead until
  restart) - the poll keeps the last-known window title and re-checks on
  the next 0.25 s tick. The "no foreground window" -> "None" sentinel
  behavior is unchanged. Polling remains the design (a SetWinEventHook
  migration was evaluated and rejected); contract and limits (a truly
  hung window owner stalls one poll - no timeout variant exists for the
  title read) are documented in `Focus_Task.run` and the WIKI section
  "[Focus polling contract - designed behavior (Item 14)]".

## [1.4.0] - 2026-11-15 (release tag pending)

### Changed (F-C4, maintainer rulings of 2026-11-16)

- `delay` values now use ONE range everywhere, 0 to 1000 ms: the config side
  and the runtime used to disagree, so `-tapdelay=0,10` "passed" validation and
  the runtime quietly turned it into (10, 10) with a console line. A value in
  range is now applied as written, and `delay 0` means 0 ms - a delay of
  (0, 0) really waits 0 between the keys of a tap group or macro (the draw is
  0, no minimum is applied). Values outside 0..1000 are still dropped and the
  console line still says so. `-nodelay` keeps its meaning: the delay leg is
  switched off for the tap-group delay and the configured range is left
  alone (a macro or key event that carries its own delay still waits -
  unchanged behavior).
- Config item numbers now agree between the violation report and the item's
  own entry in the menu and status dump (within one config section - in a
  multi-focus file a section's line can still be numbered differently by the
  report, which walks the whole file, and by that section's own list). A report line used
  to say `line 2 (TAP_2)` for a group the menu and status dump called `(TAP_1)`,
  because a named line consumed a number in one place and not the other; now
  every line of a kind consumes its number in both. Every report line carries
  its line number, and a line that declared a name shows it too:
  `line 1 (TAP_1, "*keep*") [arity] warning: ...`. The menu and the status dump
  still show a declared name instead of a number - only the numbering changed.
- A config line that repeats its own alias or name is now rejected: the runtime
  cuts the declared name out of the line, so a second copy of it used to leave
  an empty key inside the group (a line like `<w> a, <w>, d` inserted `a` then
  nothing then `d`). The config now reports `line 1 <w> [hole] error: <w>
  repeats inside its own line - the name cut leaves an empty key where the
  repeat stood` and does not load. A stray comma in a plain group (a line like
  `a,,d`) is still cleaned and accepted as before - only the name-cut case is
  refused.

### Removed
- `<arg>-default_on` / `-default-on` RETIRED the same day it shipped (TODO
  #423, maintainer resolution of #418 2026-11-11): in the settled model the
  default group IS merged into every focus group and `-default_off` is the
  ONLY opt-out, so the flag has no valid function. It now does nothing and
  the config validation prints a WARNING naming that model (dashed twin
  included; the U418 interaction warnings and the default-vs-focus argument
  pass split are removed with it). Zero migration cost - no config uses it.

### Added
- New start flag `--elevate` (maintainer decision 2026-11-16; elevation
  posture approved): a not-elevated run relaunches the same exe through one
  UAC `runas` prompt, passing every other start argument with the flag
  stripped (loop guard), and exits 0; an already-elevated run logs one
  `[Elevation] running elevated` line and starts normally; under
  python.exe (dev mode) no relaunch is attempted - a hint prints and the
  run continues. The prompt-free route stays the scheduled task with
  `/RL HIGHEST` (WIKI [Start Arguments]).
- Single-instance guard: one FST instance at a time (maintainer decision
  2026-11-16 - a double start doubled the input streams). A second start
  logs one `[SingleInstance] another FST is already running - exiting`
  line and exits with code 1 (no traceback). The guard runs after the
  `--elevate` lane and before any UI/hook init, on a `Global\` named
  mutex (visible across all sessions, session-0 included); a mutex API
  failure fails OPEN - a warning names it and the start continues.
- Every lifecycle transition now logs exactly one `[Lifecycle] <old> -> <new>
  (<reason>)` line (improvement plan 2026-11-15, Phase A unit F-A5): startup,
  pause, reload, menu re-entry and shutdown all pass an explicit lifecycle
  state machine, so what the program was doing at any moment is answerable
  from the log alone.
- New config argument `<arg>-default_off` (dashed twin `-default-off`): the
  focus section it is set in builds from its OWN group lines only - the default
  section's tap groups, rebinds, macros and macro sequences are not merged in
  (TODO #403, proposal 2026-10-31_fst-default-focus-group-deactivation, ruling
  b: default START ARGUMENTS stay merged; `-always_active` focus-loss behavior
  unchanged). Default-section alias definitions (`<name> ...`) are kept, because
  a focus-section line can resolve through them at build time.
- Start arguments accept dashed spellings of underscore args: '-' and '_' are
  interchangeable in the arg NAME (`-always-active` == `-always_active`; names
  without an underscore, like `-tapdelay`, have no dashed twin); the value after
  `=` stays verbatim and truly-unknown args still warn (U361, TODO #356, ruling A 2026-11-04).
- The GUI-branch call site of the startup activation pass (right after the
  startup compliance toast) is now pinned by a main-block wiring test
  (test-only: the branch invocation and its order are observed).

### Fixed
- A failed `restore_backup` can no longer lose your save state (improvement
  plan 2026-11-15, Phase A unit F-A1): the swap of the live save dir with the
  newest backup is atomic - the live dir is renamed aside, the backup is
  copied in, then the temp copy is dropped. If any step fails, the current
  save state is left intact or renamed back, and residue of an interrupted
  restore is detected and recovered on the next attempt.
- Keystroke races during config reload and focus change are closed
  (improvement plan 2026-11-15, Phase A units F-A2/F-A3): the focus-group
  trigger maps and the related runtime state are rebuilt as a snapshot and
  swapped in atomically, and read without locks. The bug class where a
  keystroke landing during an alt+delete reload or a focus switch leaked an
  unsuppressed key or saw a half-rebuilt config is structurally gone.
- alt+delete pause/reload no longer runs any part of the reload on the
  keyboard hook thread (improvement plan 2026-11-15, Phase A unit F-A4): the
  reload lane and the listener stop/start legs moved onto the application's
  asyncio loop, and overlapping reload requests are coalesced into one pass.
  A slow disk or a locked save file can no longer stall the low-level hook
  past the Windows hook timeout, so a reload can no longer make suppression
  die mid-typing.
- The control exits and the menu now do what they promise (improvement plan
  2026-11-15, Phase A unit F-A5): alt+END really quits the process (exit
  code 0, no half-dead instance left behind), alt+PAGE_DOWN really re-shows
  the menu in a running session, and console menu choice 4 shuts down
  through the same clean lifecycle path.
- Screen resolution change now REPOSITIONS the status overlay and,
  while shown, the crosshair (#388, priority item 1): `GUI_Manager`
  connects `QScreen.geometryChanged` for every screen (+ `screenAdded`)
  before entering the Qt event loop; the handler re-derives the overlay
  box (DPR-correct sizes) and re-anchors it at the CURRENT screen's
  top-right (the startup anchor), re-centers a visible crosshair and
  re-anchors a visible toast row, in that order, exactly once per
  event.
- The cycle (colored status dot) can no longer clip at the bottom
  right after a resolution/DPI change: `StatusOverlay.paintEvent` now
  draws from `_cycle_rect()`, a rect whose CENTER is derived from the
  REAL widget size, so any box-size drift (e.g. a Qt DPI re-scale)
  re-centers the cycle; appearance is unchanged while the box matches
  its size vars (`(x_size - s)//2 == p`), and the Leg-1 recompute
  re-derives the cycle extent itself.
- Shutdown now runs `MainLogic.cleanup` EXACTLY ONCE on every exit path
  (#384): the GUI-mode loop thread's `finally: self.cleanup` was a
  bare bound-method reference (latent no-op), no GUI-path caller ever
  invoked loop shutdown, and `cleanup` was unguarded. `MainLogic` gained
  a guarded `cleanup()`, a headless `finally` leg, and a GUI-side
  `shutdown()` (stop + join the loop thread, then cleanup) wired in a
  `finally` around `gui_manager.start()` - tray Exit (SystemExit or
  normal return) and Ctrl+C headless all land on it. The `finally`
  covers the whole Qt wiring, and the cleanup legs are isolated: a
  failing listener leg (e.g. Ctrl+C before the listener exists) can no
  longer abort the flush/close legs.
- Headless mode now runs the SAME asyncio loop as the GUI modes (#373, B1):
  `MainLogic` owns the loop from construction and the headless branch runs
  it through `MainLogic.run_headless()` (`asyncio.Runner(loop_factory)` =
  the exact `asyncio.run` close/cancel semantics, kept on the owned loop),
  so `set_loop` wires a live loop in every mode. Headless before this left
  `FST_Keyboard.loop` None: the DIRECT `run_coroutine_threadsafe` sites
  raised `AttributeError` - macro start and `start_repeat` reached the
  pump-entry catch-all, so macro triggers leaked un-suppressed while
  playing nothing; the tap delay/crossover switch and the mouse->mouse
  rebind leg are caught at their own call sites, so the trigger stayed
  suppressed and the replacement send was lost silently (U375;
  verify-first verdict pins + RED-before wiring pins + the
  headless/tray-only/indicator-only/both mode matrix in
  `tests/test_headless_loop_wiring.py`).
- An empty argv element no longer crashes startup (#362): `apply_start_arguments`
  raised `IndexError` at the loop head (`arg[0]` on `''`); an empty element now
  takes the same path as an unknown argument — one `unknown start argument: `
  warning (empty echo), later arguments still apply, startup continues
  (U366, ruling A 2026-11-06; 3 pins in `test_argument_manager.py`, RED-before).
- Suppression control flow restored at both LL-hook pump entries (#364, #365):
  the U345 entry catch (d5c43ba) swallowed pynput's `SystemHook.SuppressException`
  — the ONLY mechanism by which pynput 1.8.2 consumes a hook event — so every
  event FST decided to suppress still reached the app while the sim replacement
  fired: tap-group keys double-sent (`a,dd` -> `aa`), held macro triggers
  printed their auto-repeats after the write, and the leaked ctrl+trigger chord
  fired the app's own shortcut mid-burst (cut-at-"2026-11"). `SuppressException`
  is now REPORTED (drop-watch keeps counting) AND re-raised; genuine leg
  exceptions stay swallowed (U345 H1 contract). 8 control-flow pins in
  `test_suppression_control_flow.py` (U365, RED 7/7 pre-change).
- The LL-hook pump no longer blocks on the SendInput/file/clipboard-WRITE legs
  of the three hot lanes (#360): tap-group sends, rebind replacement sends and
  the constraint-string action legs (type/write, clipboard copy, file/backup,
  mouse move/scroll/to-var, modifier and simulated-key releases, clear_console)
  route through the asyncio loop lane via a new `Output_Manager.pump_lane` —
  off-loop callers (the hook pumps) return at SCHEDULE time; a pump blocked
  past `LowLevelHooksTimeout` silently removed the LL hook, so suppression
  died mid-macro (leaked trigger key + app-default shortcut, maintainer
  `fst_flow.log` evidence 2026-11-04). Remaining synchronous by design: the
  `paste()` value leg (the eval caller needs the clipboard text back),
  control-action releases (deliberate alt+end/alt+delete combos, not per
  event), and the `-flow`/`-drop_watch` logging legs. Send order stays FIFO
  within the lane (the pre-existing delay/crossover tap-send unit still
  splits at its delay await — unchanged, not a regression); the hold-repeat
  behavior (260428-2341) survives because tap-group state updates stay
  synchronous on the caller; without a wired loop the legs run inline (old
  sync behavior, pinned). New `tests/test_pump_async_lane.py`: 8 lane/timing
  pins (RED pre-change, measured callback 250 ms -> fast return) + 2 fallback
  contract locks.
- U359 macro-suppression regression hunt: the win32 injected-flag decode of the
  keyboard filter was audited against the documented `KBDLLHOOKSTRUCT` contract
  (`LLKHF_INJECTED = 0x10`, `ALTDOWN = 0x20`, `UP = 0x80`) and confirmed CORRECT;
  the U345-era source note claiming `0x04` was wrong and is replaced (a fix
  proposed on that basis was falsified and reverted — `0x04` is a reserved bit,
  it would have classified every FST-injected event as real input). Shipped:
  synthetic raw-hook-event suppression coverage pins for ALL three action
  classes (macros, rebinding, tap groups) — the suppression at macro start, the
  injected-event lane, and the pump contract (a macro task stalled in its write
  lane plus a saturated toast offload queue never block suppression on the hook
  pump) — in both toast-offload modes. The reported leak itself is not
  reproducible at unit level: the leading hypothesis is the LL-hook removal
  class (the hook pump blocked past `LowLevelHooksTimeout` drops events
  unfiltered), pending the live A/B on the maintainer's hardware
  (`-drop_watch`, `-no_toast_offload`, `-flow` window) as the arbiter.
- WIKI suffix-constraint syntax now matches the runtime: state constraints are
  documented parenthesized (`ke1|(-ke2)`); bare suffix segments parse as delay
  numbers, so the old bare `ke1|-ke2` example raised at config load.
- A multi-name section with a blank first name (`<focus> ,Alpha`) is now scoped
  exactly as the validator scopes it — into the default scope `''` — so its
  `-no_warnings` silences the activation announce for every name of the
  section and, as in the validator's own report, the default section's
  warnings too (U330 review).
- A rejected config load now refreshes the focus name→scope map together with
  the warnings and silent-section scopes — no stale map survives from the
  previously loaded config; as with the warning report, the announced groups
  can be silenced by the rejected file's flags (U330 review).
- `Config_Validator` keeps ONE live silent-section set (the private twin and
  its end-of-validate mirror are gone): a reused validator instance always
  reports the current load's silent scopes, never a stale mirror (U330 review).

### Documentation
- README now states the trigger precedence rule (TODO #402, maintainer ruling
  2026-11-10): a rebind outranks a macro on the same trigger regardless of
  definition order and regardless of default-group vs focus-group placement;
  the macro still fires only for triggers no rebind claims. Pinned by
  `tests/test_trigger_precedence.py` (both merged-line orders for the
  both-registries case at presort level, both section placements
  end-to-end; the tree already behaved this way - this unit closes the
  pin gap the maintainer report exposed).

## [1.3.0] - 2026-10-29

### Added
- Area-based logging: an area-logger tree, the `-log` / `-flow` start arguments,
  and log-level toggles via the numpad combo and the tray menu (#131).
- Config and evaluation errors are now written to the log file instead of only
  printed to the console (#131).
- Toast box system (PR #77): toast UI with countdown timers, toast variables,
  and a timer/removal bridge into the overlay.
- Task engine migrated from threads to `asyncio`.
- Mouse scroll and mouse move functions plus new vk aliases.
- `Output_Manager` utilities: clipboard, file, and variable helpers, plus
  save backup/restore invocations with backup messages.
- Multi-focus group support: several focus app names per section, duplicate
  triggers deduplicated, counter behavior tuned.
- Focus group handling refactored; crosshair overlay improved.
- Focus app names sanitized: only alphanumeric characters and spaces accepted.
- The config file is created automatically when it is missing on load.
- Windows CI workflow (GitHub Actions): `pytest -q` plus an informational
  `ruff` check.
- Automated test layer: unit, behavior, and offscreen-Qt GUI suites plus a
  big-config smoke test — 474 tests, coverage triage report.

### Changed
- Roughly 80 console print sites converted to area-loggers; the `DEBUG1-3`
  start flags are removed (#131).
- Repeated rebind triggers now pass through so the target key auto-repeats;
  tap-group keys keep repeat off (maintainer ruling).
- Qt event API migration: deprecated `globalPos()` replaced by
  `globalPosition().toPoint()`.
- Mouse filter hot path: packed-word equality replaced by direct bit tests.
- Strict repr-based equality for the data types; explicit base comparison in
  the filter hot path.
- All tracked text files normalized to LF line endings via `.gitattributes`
  (bat/cmd/ps1 stay CRLF).
- Packaging dependencies (Nuitka/PyInstaller) split into
  `requirements-build.txt`; CI installs runtime and dev requirements only;
  PyQt5 excluded from the build and `pyperclip` added as a runtime dependency.
- License file renamed `LICENCE` to `LICENSE` (content unchanged).
- Version string bumped to `V1.3.0` in the module headers.

### Fixed
- Status-indicator context-menu crash on Qt builds where the context-menu
  event carries no global position (#129).
- The first toast no longer pays the first-call cost: the toast path is
  pre-warmed at GUI init (#130).
- Toast teardown hardened: identity-guarded widget destruction, guard against
  the deleted C++ side during app shutdown, `remove_all_toasts` name parity,
  multi-notch wheel gating.
- Dangling `remove_crosshair()` call from the PyQt5 era removed.
- `Focus_Task` shadowing bug fixed; stop semantics aligned with the `_stop`
  rename.
- `Key_Group.get_vk_codes` attribute typo fixed.
- `ta()` timing for the `'all'` event class fixed (maps to the all-events clock).
- Toggle keys work in macro playback again (routed via the state manager).
- Extra focus names registered immediately; the last config section is no
  longer dropped.
- Mouse-to-mouse rebind async race fixed; mouse-listener suppression tracked.
- Unknown constraint names handled as silent no-ops instead of raising
  `NameError`; state-shorthand constraints fail closed on unknown keys.
- Start-argument parsing hardened (delays, crossover, crosshair, debug).
- Six `ruff` F findings cleared.

### Documentation
- `SPEC_FEATURES.md`: documented-vs-implemented gap matrix.
- WIKI and README: section-3 invocations, numpad combos, vk-0 keys, extra
  start arguments, multi-focus names, and multiline sequence continuation
  documented; wording reworked to the current code state.
