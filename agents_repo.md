# agents_repo.md — repo-specific map for Free Snap Tap

Read this **after** `AGENTS.md`. It holds everything repo-specific: what this
project is, environment/shell, commands, module map, data flow, test
conventions, and gotchas. It is the general map that saves every agent from
re-discovering the repo on each run. If anything here conflicts with the code,
the code wins — but flag the discrepancy.

This file is maintained by the maintainer. Agents do not edit it directly. If
you find a stale or missing stable repo fact, flag it in your summary or
`TODO.md`; edit this file only if explicitly tasked.

## What this is
A Windows-only snap-tapping / rebind / macro tool. It hooks keyboard (and mouse)
input via pynput's low-level win32 filter, suppresses the original events, and
re-emits "idealized" input. Targets games (CS2, Horizon, etc.) and must not get
flagged by anti-cheat. **Windows only** — pynput selective suppression is not
available on Linux; macOS not supported.

## Environment & shell
- The agent runs on **Windows** with a **PowerShell (pwsh)** shell. **Heredocs do
  not exist in PowerShell** — `<<EOF` / `cat > file <<EOF` will NOT parse; never
  emit them. Write multi-line content with the file tools (or `Set-Content`),
  then edit the file.
- Python **3.12** (CI-pinned; CI runs on `windows-latest`).

## Safety limits (repo-specific)
- **Never run the live listeners in tests.** Always mock pynput controllers
  (mocked-`FakeFST` pattern in `tests/conftest.py`). This is the live/destructive
  probe restriction referenced from `AGENTS.md` — live listeners are not
  permitted unless explicitly requested by the maintainer.

## Run / test
- venv with all deps: `.venv` (do NOT reinstall from scratch; `requirements.txt`
  is runtime, `requirements-dev.txt` adds test tooling, `requirements-build.txt`
  is executable-packaging only (Nuitka/PyInstaller) — CI installs runtime+dev only).
- Run tests: `& .\.venv\Scripts\python.exe -m pytest -q`
- Coverage: `& .\.venv\Scripts\python.exe -m pytest -q --cov=fst_data_types --cov=fst_manager --cov=fst_save_file_handler --cov=fst_keyboard --cov=fst_tasks --cov=vk_codes --cov=fst_overlay`
- Lint: `& .\.venv\Scripts\ruff.exe check --select F .` Current expected finding
  count is a moving baseline — see `.opencode/handover_planner.md` and relevant
  `TODO.md` entries.

## Sign convention (IMPORTANT — used everywhere)
- `-key` = key **pressed** (e.g. `-w`).
- `+key` = key **released** (e.g. `+h`).
- `^key` = toggle.
This is the maintainer's convention and matches `Key_Event._get_sign()` and the
config file. README/WIKI have some stale examples — trust the convention above.

## Module map (repo root)
- `free_snap_tap.py` — entry point. `MainLogic`; GUI mode (PySide6, secondary
  thread) vs headless (asyncio in main thread).
- `fst_keyboard.py` — `FST_Keyboard` facade. Owns all managers.
  `init/start/stop_listener`, the win32 `keyboard_win32_event_filter` /
  `mouse_win32_event_filter` (the hot path: rebinds → toggle → suppression →
  trigger eval), `initialize_groups_from_presorted_lines` (builds the live group
  dicts from parsed config), `apply_focus_groups`, `update_args_and_groups`.
- `fst_manager.py` — core logic classes:
  - `CONSTANTS` (global-ish knobs: `DEBUG*`, `FILE_NAME`, control key combos).
  - `Output_Manager` — pynput `keyboard.Controller`/`mouse.Controller`;
    `check_constraint_fulfillment`, `constraint_evaluation` (parses `tr(...)`,
    `last(...)`, `p(...)`, `cs(...)`, `dc()` invocations), `execute_key_event`
    (async: send + random delay), crossover.
  - `Config_Manager` — file parsing: `load_config` → `_clean_comments` →
    `_combine_multilines` → `_parse_lines_for_focus_manager`; returns
    `(multi_focus_dict, default_start_arguments, default_group_lines)`.
    `presort_lines` classifies lines into `*_hr` containers
    (tap/rebind/macro/alias) with default names `TAP_1`, `REB_1`, `MAC_1`,
    `SEQ_1`.
  - `Argument_Manager` — `<arg>` start args, per-focus overrides.
  - `Focus_Group_Manager` — active-window matching (pygetwindow).
  - `Input_State_Manager` — real/simulated/all press-state dicts,
    `_pressed_keys` set, toggle-state dict, timing dicts
    `_time_real/_time_simulated/_time_all` (each = [last_pressed,
    last_released, released, pressed]).
  - `CLI_menu`.
- `fst_data_types.py` — pure data model: `Key_Event`, `Key`, `Key_Group`,
  `Rebind`, `Macro`, `Tap_Group`. No I/O.
- `fst_overlay.py` — PySide6 GUI: `GUI_Manager`, `StatusOverlay`,
  `CrosshairOverlay`, `Tray_Icon`, `ToastManager`, `ToastBridge`
  (thread-safe signals).
- `fst_tasks.py` — asyncio `Focus_Task`, `Macro_Repeat_Task` (alias repeat).
- `fst_save_file_handler.py` — `make_backup` / `restore_backup` (both return
  `(path, name)` tuple).
- `vk_codes.py` — `vk_codes_dict` string→vk-code map.
- `playground/` — maintainer's personal live bug probes (raw win32 mouse
  filter, live overlay/toast flow against a dummy FST). Not part of the test
  suite (`pytest.ini` `testpaths = tests`); never import them from package code,
  and exclude from EXE packaging. If the maintainer explicitly requests a live
  probe, run these directly from the repo root; otherwise do not execute them.
- `.opencode/` — opencode meta files (not FST code): `prompt_agent_planner.md` /
  `prompt_agent_task.md` (agent prompts), `handover_planner.md` (planner
  state/continuation file, the NAP), `handover_task.md` (current task spec),
  `handover_task_to_planner.md` (worker's latest EXECUTIVE SUMMARY),
  `ctxgauge/peek.py` (context gauge).
- `opencode.jsonc` (repo root) — opencode config: llama-swap provider + model
  list, planner (primary) and worker agents (subagents), scoped permissions.

## Data flow
config file → `Config_Manager.load_config` (parse to dict + arg lines + group
lines) → `presort_lines` (classify into `*_hr`) →
`FST_Keyboard.initialize_groups_from_presorted_lines` (builds `_tap_groups`/
`_rebinds_dict`/`_macros_dict` + triggers) → listener running → each win32 event
hits the filter: update state (press states + timings) → check rebinds
(replace/suppress) → check macros (fire, with constraints/eval) →
`Output_Manager` sends events with delays. Focus change re-runs
`update_args_and_groups`.

## Test conventions
- Tests live in `tests/`: pure unit scope + offscreen GUI (pytest-qt 4.5.0,
  `QT_QPA_PLATFORM=offscreen` pinned in `tests/conftest.py`). No real keyboard,
  no real time, no Windows APIs.
- Desired-but-not-yet-true behavior goes into a dedicated **xfail** file (the
  original `tests/test_known_issues.py` is fully resolved/accepted and no longer
  exists — recreate the pattern if needed). When a fix lands, move the test into
  a normal file and keep it green.
- Suite size is a moving baseline — see `.opencode/handover_planner.md` for the
  current expected count. Do not hard-code test-count assumptions here.

## Worker roster (referenced by the planner)
- `worker_120K_mtp` (DEFAULT — same model as the planner, no reload cost):
  normal edits, tests.
- `worker_gemma_256k_mtp`: fast-throughput, high-volume reads/writes, big files,
  webfetch. Needs concrete instructions.
- `worker_210K`: slow, big context — very long or deeply complex single tasks
  only.

## Handover file paths (referenced from AGENTS.md)
- Plan-state file (planner-owned): `.opencode/handover_planner.md` — the
  maintainer calls this the **NAP** (**N**ext **A**gent **P**rompt). If the user
  says "NAP" or "write a NAP", they mean this file. Rewritten per handoff — read
  it first when you get one. Phase close moves it to
  `.opencode/archive/<YYMMDD>-<slug>.md` with a STATUS header.
- Task spec file (planner writes, worker reads): `.opencode/handover_task.md`.
- Worker summary file (worker writes, planner reads):
  `.opencode/handover_task_to_planner.md` — the EXECUTIVE SUMMARY.
- Context gauge: run `& .\.venv\Scripts\python.exe .opencode\ctxgauge\peek.py`
  from the repo root, read-only → `CTX=n (p%) REM=m`.
- Durable maintainer TODOs: `TODO.md`.

## Gotchas
- `Config_Manager.load_config` opens `self._file_name` directly — point it at a
  `tmp_path` fixture or monkeypatch `_open_config_file`.
- `presort_lines` receives the **cleaned** lines (no spaces after commas inside
  key groups) — feed cleaned-form strings in tests.
- `Output_Manager.execute_key_event` is `async` and calls `asyncio.sleep` +
  pynput — mock both when testing.
- `CONSTANTS` is a real module-level class used as a global config holder; tests
  that mutate it should restore it.
- The repo's `FSTconfig_test.txt` is the maintainer's live config —
  `tests/test_config_parse.py::test_real_config_parses` uses it as a regression
  guard.
- PySide6 `destroyed` gotcha: a handler connected to `obj.destroyed` ALSO fires
  when OTHER objects are destroyed, and the signal argument is an untrusted
  placeholder (a bare QWidget) — capture the object in the closure and probe
  liveness (any C++ method call raises RuntimeError once the C++ side is
  deleted).
- pytest-qt quirks: `QTest.mouseMove(widget, pos)` takes a LOCAL position
  (global = widget.pos() + pos); double-click is `qtbot.mouseDClick` (NOT
  `mouseDoubleClick`); `QSystemTrayIcon` is a QObject, not a QWidget →
  `qtbot.addWidget` rejects it.
- Offscreen destruction ordering: `destroyed` fires while the dying widget's item
  is still in its parent layout — never assert layout-count-based visibility
  right after deletion; use the dict (synchronous source of truth).
- NEVER call a widget's `contextMenuEvent` in tests (its `exec_` blocks the
  loop); trigger the `QAction`s of `widget.context_menu` via `.trigger()`
  instead.

## Phase-scoped work
Phase plans, the progress log, current baselines, and the rules of the current
handoff live in `.opencode/handover_planner.md` (the NAP) — read it first when
you get one. `TODO.md` holds durable maintainer TODOs. This file holds stable
facts and conventions only — never phase progress.
