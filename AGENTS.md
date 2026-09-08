# AGENT HANDOFF — Free Snap Tap

Context for working on this repo. Written so a fresh agent can start with minimal
exploration. If something here conflicts with the code, the code wins — but flag the
discrepancy.

## Editing this file
- Do not edit `AGENTS.md` directly — edit a copy and the maintainer will replace it.

## What this is
A Windows-only snap-tapping / rebind / macro tool. It hooks keyboard (and mouse) input
via pynput's low-level win32 filter, suppresses the original events, and re-emits
"idealized" input. Targets games (CS2, Horizon, etc.) and must not get flagged by
anti-cheat. **Windows only** — pynput selective suppression is not available on Linux;
macOS not supported.

## Environment & shell
- The agent runs on **Windows** with a **PowerShell (pwsh)** shell. **Heredocs do not
  exist in PowerShell** — `<<EOF` / `cat > file <<EOF` will NOT parse; never emit them.
  Write multi-line content with the file tools (or `Set-Content`), then edit the file.
- Python **3.12** (CI-pinned; CI runs on `windows-latest`).
- **House rule:** when something is unclear, ASK EARLY — do not decide unilaterally
  or spend a long time exploring an ambiguity.

## Git conventions
- Commit message: one-line subject (imperative) naming the main change. If the commit
  covers **more than one theme** (normal — maintainer works several problems at once),
  add up to ~3 short body lines, one per theme: e.g. `- <theme 1> …  - <bug fixed> …  - <change integrated> …`.
  Multi-theme commits are fine, never split commits just for message style.
  Goal: `git log` must stay readable as a small work summary on its own.

## Commit routine (BEFORE EVERY commit, no exceptions)
Plan state (`.opencode/handover_planner.md`, the NAP) and `TODO.md` updates happen
**before** committing — so an interrupted agent can resume from a committed state with
relatively current data, without re-exploring. In the planner/worker split the commits
are two-party:
1. **The worker** commits its code + `TODO.md` + the task's handover files
   (`.opencode/handover_task.md`, `.opencode/handover_task_to_planner.md`) in one
   commit. `git log` + `TODO.md` is the durable record of what happened.
2. **The planner** updates `.opencode/handover_planner.md` — what is done, the next
   task(s), current baselines (test count, lint count, coverage) and what is about to
   be committed (subject + file set; the hash only exists after committing) — and
   commits that plan-state file with its bookkeeping. A single agent doing both roles
   commits everything (code + `TODO.md` + the state file) in one commit.
3. **Append every discrepancy found during the work to `TODO.md`** — doc/code
   mismatches, suspected bugs, stale baselines — as a new numbered entry in
   `TODO.md` style (`## <n>. <summary> (<date>)`). Append only, never rewrite
   existing entries.
4. **Post-commit context check** — see `## Context budget` below.

## Run / test
- venv with all deps: `.venv` (do NOT reinstall from scratch; `requirements.txt` is runtime, `requirements-dev.txt` adds test tooling, `requirements-build.txt` is executable-packaging only (Nuitka/PyInstaller) — CI installs runtime+dev only).
- Run tests: `& .\.venv\Scripts\python.exe -m pytest -q`
- Coverage: `& .\.venv\Scripts\python.exe -m pytest -q --cov=fst_data_types --cov=fst_manager --cov=fst_save_file_handler --cov=fst_keyboard --cov=fst_tasks --cov=vk_codes --cov=fst_overlay`
- Lint baseline: `& .\.venv\Scripts\ruff.exe check --select F .` (currently 6 cosmetic findings: unused imports/vars, f-strings. No undefined-name bugs. List + rules in `TODO.md` #2.)
- **Never run the live listeners in tests.** Always mock pynput controllers (mocked-`FakeFST` pattern in `tests/conftest.py`).

## Context budget (NAP threshold)
- Check between logical chunks (before heavy steps) AND after every commit (step 4 of
  the commit routine): `& .\.venv\Scripts\python.exe .opencode\ctxgauge\peek.py` (from
  the repo root, read-only) → `CTX=n (p%) REM=m`.
- **Line:** stop working when ≤ 15k tokens remain **or** 85% used — whichever comes first. Writing the NAP needs another ~10k (simple tasks) to ~15k (complex: thinking + lookups), so wrap up BEFORE the line.
- **Not enough context left** (at the line, or a check says the next tasks will not fit):
  write all open tasks into the NAP (the update rides in the NEXT commit), stop at a
  clean point, and **inform the user** — never start new work.
- With the gauge result, give an **estimate of the tokens still needed to finish the current plan** (rough budgets: file read/inspect ≈ 1–3k per call; heavy edits / a big test run ≈ 3–8k each; small reply turn ≈ 0.3k; NAP writing ≈ 10–15k). Report estimate vs remaining window, so the user can decide to switch to the same model's larger-context variant (slower, no MTP) and finish the task.

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
- `playground/` — maintainer's personal live bug probes (raw win32 mouse filter, live overlay/toast
  flow against a dummy FST). Not part of the test suite (`pytest.ini` `testpaths = tests`); never
  import them from package code, and exclude from EXE packaging. Run directly from the repo root.
- `.opencode/` — opencode meta files (not FST code): `prompt_agent_planner.md` /
  `prompt_agent_task.md` (agent prompts), `handover_planner.md` (planner state/continuation
  file, the NAP), `handover_task.md` (current task spec), `handover_task_to_planner.md`
  (worker's latest EXECUTIVE SUMMARY), `archive/` (finished-phase planner files),
  `ctxgauge/peek.py` (context gauge).
- `opencode.jsonc` (repo root) — opencode config: llama-swap provider + model list, planner
  (primary) and worker agents (subagents), scoped permissions.

## Data flow
config file → `Config_Manager.load_config` (parse to dict + arg lines + group lines) →
`presort_lines` (classify into `*_hr`) → `FST_Keyboard.initialize_groups_from_presorted_lines`
(builds `_tap_groups`/`_rebinds_dict`/`_macros_dict` + triggers) → listener running →
each win32 event hits the filter: update state (press states + timings) → check rebinds
(replace/suppress) → check macros (fire, with constraints/eval) → `Output_Manager`
sends events with delays. Focus change re-runs `update_args_and_groups`.

## Test conventions
- Tests live in `tests/`: pure unit scope + offscreen GUI (pytest-qt 4.5.0, `QT_QPA_PLATFORM=offscreen` pinned in `tests/conftest.py`). No real keyboard, no real time, no Windows APIs.
- Desired-but-not-yet-true behavior goes into a dedicated **xfail** file (the original `tests/test_known_issues.py` is fully resolved/accepted and no longer exists — recreate the pattern if needed). When a fix lands, move the test into a normal file and keep it green.
- Suite size is a moving baseline — see `.opencode/handover_planner.md` for the live number (as of `fffea8b` 2026-09-08: **434 passed, 0 xfailed**).

## Maintainer decisions on the original known-issues (060926)
- **#1 shared `constraints=[0,0]` default** — accepted; delays are never mutated individually. Removed from xfail.
- **#2 `Key_Group.__eq__`** — was missing `return` in the else (returned `None`); fixed to `return False`. Now a green test.
- **#3 `Tap_Group` rudimentary** — intentional; tap groups predate the data types and need no object-based `get_vk_codes`. Tap groups must have **≥2 keys**.
- **#4 `make_backup` same-second collision** — fixed: now appends `-1`, `-2`, … until unique (silent).
- **#5 comment cleaning** — fixed in `_clean_comments`: comment-after-comma (`e, # c` → `e`), commented keys (`a,#w,d,#s` → `a,d`), trailing commas removed. Empty results dropped.
- **#6 single-char lines** — fixed: `len(line) > 1` guard removed; single-char keys (and with trailing comment) survive cleaning.

## Current work (phase-scoped — kept out of this file)
Phase plans, the progress log, current baselines and the rules of the current handoff
live in **`.opencode/handover_planner.md`** (rewritten per handoff — read it first when you get one).
The maintainer calls this file the **NAP** (**N**ext **A**gent **P**rompt) — if the user
says "NAP" or "write a NAP", they mean `.opencode/handover_planner.md`.
Durable maintainer TODOs live in **`TODO.md`**.
**AGENTS.md holds stable facts and conventions only — never phase progress.** If a note
needs to survive across phases, it belongs here only if it is a permanent convention or
gotcha; otherwise it goes to `.opencode/handover_planner.md`.

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
