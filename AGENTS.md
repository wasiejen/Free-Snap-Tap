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
- Coverage: `& .\.venv\Scripts\python.exe -m pytest -q --cov=fst_data_types --cov=fst_manager --cov=fst_save_file_handler --cov=fst_keyboard --cov=fst_tasks --cov=vk_codes --cov=fst_overlay`
- Lint baseline: `& .\.venv\Scripts\ruff.exe check --select F .` (currently 6 cosmetic findings: unused imports/vars, f-strings. No undefined-name bugs. See "Open items".)
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
- Tests live in `tests/`: pure unit scope + offscreen GUI (pytest-qt 4.5.0, `QT_QPA_PLATFORM=offscreen` pinned in `tests/conftest.py`). No real keyboard, no real time, no Windows APIs.
- `tests/test_known_issues.py` = **xfail** file for desired-but-not-yet-true behavior. When fixed, move the test into a normal file and keep it green. A test removed from there was reviewed and **accepted as-is**.
- Current status: **313 passed, 0 xfailed** (Phase 3 GUI tests added 2026-09-07).

## Maintainer decisions on the original known-issues (060926)
- **#1 shared `constraints=[0,0]` default** — accepted; delays are never mutated individually. Removed from xfail.
- **#2 `Key_Group.__eq__`** — was missing `return` in the else (returned `None`); fixed to `return False`. Now a green test.
- **#3 `Tap_Group` rudimentary** — intentional; tap groups predate the data types and need no object-based `get_vk_codes`. Tap groups must have **≥2 keys**.
- **#4 `make_backup` same-second collision** — fixed: now appends `-1`, `-2`, … until unique (silent).
- **#5 comment cleaning** — fixed in `_clean_comments`: comment-after-comma (`e, # c` → `e`), commented keys (`a,#w,d,#s` → `a,d`), trailing commas removed. Empty results dropped.
- **#6 single-char lines** — fixed: `len(line) > 1` guard removed; single-char keys (and with trailing comment) survive cleaning.

## Open items / next steps
- **Phase 2 (done 2026-09-06):** unit-tested `Output_Manager` + `Input_State_Manager`
  with mocked pynput controllers + `freezegun` for time-based eval (`tr`/`last`/`dc`/`p`/`cs`)
  + filter hot path (`fst_keyboard._win32_event_filter`). See `tests/test_output_manager.py`,
  `tests/test_input_state_manager.py`, `tests/test_filter_behavior.py`; gap semantics in
  `SPEC_FEATURES.md` section 5.
- **class-2 coverage (done 2026-09-07):** `Focus_Task` polling (`tests/test_focus_task.py`),
  listener lifecycle + display functions (`test_filter_behavior.py`), `CLI_menu`
  (`tests/test_cli_menu.py`), `Focus_Group_Manager` task methods
  (`tests/test_focus_group_manager.py`). `fst_tasks` at 100%.
- **Phase 3 prep (done 2026-09-07):** offscreen pytest-qt env pinned in `tests/conftest.py`
  (`QT_QPA_PLATFORM=offscreen`); smoke + `ToastBridge` round-trip tests in
  `tests/test_gui_smoke.py`.
- **Resolved 2026-09-07:** known-issue #1 (Key_Event eq/hash) — strict repr-based `__eq__`
  on all data types (eq == hash == repr); the loose vk/press comparison in the filter hot
  path is now explicit (`is_trigger_activated`, repeated-trigger suppression);
  `tests/test_known_issues.py` removed, suite fully green. Also fixed: `Focus_Task`
  `stop` attribute shadowing the `stop()` method (renamed `self._stop`), and
  `ToastManager._handle_destruction` guarded against an already-deleted C++ side.
- **Phase 3 (done 2026-09-07):** offscreen GUI tests for `fst_overlay.py` (34% → 99%)
  with pytest-qt: ToastManager/ToastWidget depth (`tests/test_gui_smoke.py`),
  StatusOverlay drag/menu/double-click (`test_status_overlay.py`), Tray_Icon signals
  (`test_tray_icon.py`), CrosshairOverlay (`test_crosshair.py`), GUI_Manager periodic
  update/wiring/exit/start (`test_gui_manager.py`), console helpers
  (`test_console_helpers.py`). Fixed while testing: dangling `remove_crosshair()`
  call (dead PyQt5-era leftover that crashed `StatusOverlay.close_overlay`), toast
  dict cleanup (PySide6 routes `destroyed` globally → identity-guarded
  `_handle_destruction` with liveness probe), dict-based `check_empty` (offscreen
  destruction ordering). Left untested: `contextMenuEvent` (blocking `exec_`).
- **Phase 4 (done 2026-09-07):** coverage triage report `COVERAGE_TRIAGE.md` (committed +
  pushed, `d161e5a`). Remaining 468 uncovered lines classified: A (testable now) = 299,
  B (more mocking) = 50, C (deliberately not covered: 63 debug-print, 52 dead-code,
  4 abstract-stub lines) = 119. No Windows CI added (not approved by maintainer).
- **Phase 5 (next):** coverage push per `COVERAGE_TRIAGE.md` "Recommended order" (blocks 1–10
  + 70-line remainder; all S/M effort). Ceiling A+B = 349 lines → 94.6 % of the three modules.
  Suspected bugs found by the triage (recorded in the report, NOT fixed):
  - `remove_all_toasts()` constraint calls `self._fst.remove_all_callbacks()`
    (`fst_manager.py:579`) — no production object has that attribute (real `FST_Keyboard`
    sets `remove_all_callback`, singular) → uncaught `AttributeError` in the win32 hot path;
    masked in tests because `tests/conftest.py::FakeFST` defines the plural name.
  - `convert_to_vk_code` (`fst_keyboard.py:144–153`) returns implicit `None` for out-of-range
    numeric key strings (e.g. `"300"`) → caller `extract_data_from_key` line 224 raises
    `TypeError` instead of `KeyError`.
  - Dead code: `split_ignore_brackets2` (`fst_manager.py:996–1071`, never called),
    `get_coordinates` (`fst_keyboard.py:481–484`, never called), `Config_Manager.parse_line`
    (`fst_manager.py:890–891`, empty stub).
- Clean up the 6 ruff `F` findings when convenient (free_snap_tap 2×F541, fst_manager
  F401 `threading.Event`, fst_overlay F401 `QSizePolicy` + F841, test_pynput_mouse F841
  — maintainer's file).

## Gotchas
- `Config_Manager.load_config` opens `self._file_name` directly — point it at a `tmp_path` fixture or monkeypatch `_open_config_file`.
- `presort_lines` receives the **cleaned** lines (no spaces after commas inside key groups) — feed cleaned-form strings in tests.
- `Output_Manager.execute_key_event` is `async` and calls `asyncio.sleep` + pynput — mock both when testing.
- `CONSTANTS` is a real module-level class used as a global config holder; tests that mutate it should restore it.
- The repo's `FSTconfig_test.txt` is the maintainer's live config — `tests/test_config_parse.py::test_real_config_parses` uses it as a regression guard.
- PySide6 `destroyed` gotcha: a handler connected to `obj.destroyed` ALSO fires when
  OTHER objects are destroyed, and the signal argument is an untrusted placeholder
  (a bare QWidget) — capture the object in the closure and probe liveness (any C++
  method call raises RuntimeError once the C++ side is deleted).
- pytest-qt quirks: `QTest.mouseMove(widget, pos)` takes a LOCAL position (global =
  widget.pos() + pos); double-click is `qtbot.mouseDClick` (NOT `mouseDoubleClick`);
  `QSystemTrayIcon` is a QObject, not a QWidget → `qtbot.addWidget` rejects it.
- Offscreen destruction ordering: `destroyed` fires while the dying widget's item is
  still in its parent layout — never assert layout-count-based visibility right after
  deletion; use the dict (synchronous source of truth).
- NEVER call a widget's `contextMenuEvent` in tests (its `exec_` blocks the loop);
  trigger the `QAction`s of `widget.context_menu` via `.trigger()` instead.
