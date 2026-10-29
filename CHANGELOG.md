# Changelog

All notable changes to Free-Snap-Tap are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Earlier releases (v1.2.0 and below) are listed in the version history on the
[Wiki](https://github.com/wasiejen/Free-Snap-Tap/wiki).

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
