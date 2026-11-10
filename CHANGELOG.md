# Changelog

All notable changes to Free-Snap-Tap are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Earlier releases (v1.2.0 and below) are listed in the version history on the
[Wiki](https://github.com/wasiejen/Free-Snap-Tap/wiki).

## [Unreleased]

### Added
- Start arguments accept dashed spellings of underscore args: '-' and '_' are
  interchangeable in the arg NAME (`-always-active` == `-always_active`; names
  without an underscore, like `-tapdelay`, have no dashed twin); the value after
  `=` stays verbatim and truly-unknown args still warn (U361, TODO #356, ruling A 2026-11-04).
- The GUI-branch call site of the startup activation pass (right after the
  startup compliance toast) is now pinned by a main-block wiring test
  (test-only: the branch invocation and its order are observed).

### Fixed
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
