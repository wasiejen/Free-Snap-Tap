# AGENT HANDOFF — Free Snap Tap

Context for working on this repo. Written so a fresh agent can start with minimal
exploration. If something here conflicts with the code, the code wins — but flag the
discrepancy.

## What this is
A Windows-only snap-tapping / rebind / macro tool. It hooks keyboard (and mouse) input
via pynput's low-level win32 filter, suppresses the original events, and re-emits
"idealized" input. Targets games (CS2, Horizon, etc.) and must not get flagged by
anti-cheat. **Windows only** — pynput selective suppression is not available on Linux;
macOS not supported.

## Run / test
- venv with all deps: `.venv` (do NOT reinstall from scratch; `requirements.txt` is runtime, `requirements-dev.txt` adds test tooling).
- Run tests: `& .\.venv\Scripts\python.exe -m pytest -q`
- Coverage: add `--cov=fst_data_types --cov=fst_manager --cov=fst_save_file_handler`
- Lint baseline: `& .\.venv\Scripts\ruff.exe check --select F .` (currently 5 cosmetic findings: unused imports/vars, f-strings. No undefined-name bugs. See "Open items".)
- **Never run the live listeners in tests.** Always mock pynput controllers (see Phase 2 notes).

## Sign convention (IMPORTANT — used everywhere)
- `-key` = key **pressed** (e.g. `-w`).
- `+key` = key **released** (e.g. `+h`).
- `^key` = toggle.
This is the maintainer's convention and matches `Key_Event._get_sign()` and the config
file. README/WIKI have some stale examples — trust the convention above.

## Module map (repo root)
- `free_snap_tap.py` — entry point. `MainLogic`; GUI mode (PySide6, secondary thread) vs headless (asyncio in main thread).
- `fst_keyboard.py` — `FST_Keyboard` facade. Owns all managers. `init/start/stop_listener`, the win32 `keyboard_win32_event_filter` / `mouse_win32_event_filter` (the hot path: rebinds → toggle → suppression → trigger eval), `initialize_groups_from_presorted_lines` (builds the live group dicts from parsed config), `apply_focus_groups`, `update_args_and_groups`.
- `fst_manager.py` — core logic classes:
  - `CONSTANTS` (global-ish knobs: `DEBUG*`, `FILE_NAME`, control key combos).
  - `Output_Manager` — pynput `keyboard.Controller`/`mouse.Controller`; `check_constraint_fulfillment`, `constraint_evaluation` (parses `tr(...)`, `last(...)`, `p(...)`, `cs(...)`, `dc()`, invocations), `execute_key_event` (async: send + random delay), crossover.
  - `Config_Manager` — file parsing: `load_config` → `_clean_comments` → `_combine_multilines` → `_parse_lines_for_focus_manager`; returns `(multi_focus_dict, default_start_arguments, default_group_lines)`. `presort_lines` classifies lines into `*_hr` containers (tap/rebind/macro/alias) with default names `TAP_1`, `REB_1`, `MAC_1`, `SEQ_1`.
  - `Argument_Manager` — `<arg>` start args, per-focus overrides.
  - `Focus_Group_Manager` — active-window matching (pygetwindow).
  - `Input_State_Manager` — real/simulated/all press-state dicts, `_pressed_keys` set, toggle-state dict, timing dicts `_time_real/_time_simulated/_time_all` (each = [last_pressed, last_released, released, pressed]).
  - `CLI_menu`.
- `fst_data_types.py` — pure data model: `Key_Event`, `Key`, `Key_Group`, `Rebind`, `Macro`, `Tap_Group`. No I/O.
- `fst_overlay.py` — PySide6 GUI: `GUI_Manager`, `StatusOverlay`, `CrosshairOverlay`, `Tray_Icon`, `ToastManager`, `ToastBridge` (thread-safe signals).
- `fst_tasks.py` — asyncio `Focus_Task`, `Macro_Repeat_Task` (alias repeat).
- `fst_save_file_handler.py` — `make_backup` / `restore_backup` (both return `(path, name)` tuple).
- `vk_codes.py` — `vk_codes_dict` string→vk_code map.

## Data flow
config file → `Config_Manager.load_config` (parse to dict + arg lines + group lines) →
`presort_lines` (classify into `*_hr`) → `FST_Keyboard.initialize_groups_from_presorted_lines`
(builds `_tap_groups`/`_rebinds_dict`/`_macros_dict` + triggers) → listener running →
each win32 event hits the filter: update state (press states + timings) → check rebinds
(replace/suppress) → check macros (fire, with constraints/eval) → `Output_Manager`
sends events with delays. Focus change re-runs `update_args_and_groups`.

## Test conventions
- Tests live in `tests/`, pure unit scope so far (no real keyboard, no real time, no Windows APIs).
- `tests/test_known_issues.py` = **xfail** file for desired-but-not-yet-true behavior. When fixed, move the test into a normal file and keep it green. A test removed from there was reviewed and **accepted as-is**.
- Current status: **141 passed, 1 xfailed** (Phase 2 behavior tests added 2026-09-06).

## Maintainer decisions on the original known-issues (060926)
- **#1 Key_Event eq vs hash** — **tabled**. eq ignores constraints; hash is repr-based. Keep the xfail until the suite covers dicts/sets of `Key_Event`.
- **#2 shared `constraints=[0,0]` default** — accepted; delays are never mutated individually. Removed from xfail.
- **#3 `Key_Group.__eq__`** — was missing `return` in the else (returned `None`); fixed to `return False`. Now a green test.
- **#4 `Tap_Group` rudimentary** — intentional; tap groups predate the data types and need no object-based `get_vk_codes`. Tap groups must have **≥2 keys**.
- **#5 `make_backup` same-second collision** — fixed: now appends `-1`, `-2`, … until unique (silent).
- **#6 comment cleaning** — fixed in `_clean_comments`: comment-after-comma (`e, # c` → `e`), commented keys (`a,#w,d,#s` → `a,d`), trailing commas removed. Empty results dropped.
- **#7 single-char lines** — fixed: `len(line) > 1` guard removed; single-char keys (and with trailing comment) survive cleaning.

## Open items / next steps
- **Phase 2 (done 2026-09-06):** unit-tested `Output_Manager` + `Input_State_Manager` with mocked pynput controllers + `freezegun` for time-based eval (`tr`/`last`/`dc`/`p`/`cs`) + filter hot path (`fst_keyboard._win32_event_filter`). `fst_manager.py` now ~64% covered. See `tests/test_output_manager.py`, `tests/test_input_state_manager.py`, `tests/test_filter_behavior.py`; gap semantics in `SPEC_FEATURES.md` section 5.
- **Phase 3:** GUI tests with `pytest-qt` (`QT_QPA_PLATFORM=offscreen`); extend the `test_overlay.py` pattern.
- **Phase 4:** coverage report to prioritize remaining hotspots; optionally a GitHub Actions **Windows** runner (project is Windows-only, so CI must be Windows).
- Clean up the 5 ruff `F` findings when convenient (unused `threading.Event`, `QSizePolicy`, f-strings in `free_snap_tap.py`, unused local in `fst_overlay.py`).

## Gotchas
- `Config_Manager.load_config` opens `self._file_name` directly — point it at a `tmp_path` fixture or monkeypatch `_open_config_file`.
- `presort_lines` receives the **cleaned** lines (no spaces after commas inside key groups) — feed cleaned-form strings in tests.
- `Output_Manager.execute_key_event` is `async` and calls `asyncio.sleep` + pynput — mock both when testing.
- `CONSTANTS` is a real module-level class used as a global config holder; tests that mutate it should restore it.
- The repo's `FSTconfig.txt` is the maintainer's live config — `tests/test_config_parse.py::test_real_config_parses` uses it as a regression guard.
