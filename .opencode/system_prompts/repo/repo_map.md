# repo_map.md — repo map part of `agents_repo.md` (split 2026-09-11)

Sections moved verbatim from the root `agents_repo.md`; the root file is now a
thin index pointing at the parts.

## What this is
A Windows-only snap-tapping / rebind / macro tool. It hooks keyboard (and mouse)
input via pynput's low-level win32 filter, suppresses the original events, and
re-emits "idealized" input. Targets games (CS2, Horizon, etc.) and must not get
flagged by anti-cheat. **Windows only** — pynput selective suppression is not
available on Linux; macOS not supported.

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
- `.opencode/` — opencode meta files (not FST code):
  `system_prompts/` — `agents/prompt_agent_*.md` (live agent prompts),
  `repo/` (the `agents_repo.md` parts: map/commands/testgate/gotchas),
  `agent_readme_*.md` (protocol readmes: loop / proposals / todo);
  `handover/` — `handover_planner.md` (planner state/continuation file, the
  NAP), `handover_task.md` (current task spec),
  `handover_task_to_planner.md` (worker's latest EXECUTIVE SUMMARY);
  `loop/autorun-…/` — the CURRENT looprun (spec/summary copies + `loop_log.md`);
  older loopruns live in `archive/loop/`.
- `plugin/scripts/` — the context gauge (`peek.mjs` self-peek CLI + `gauge.mjs`
  core, node:sqlite) — moved out of the old `ctxgauge/` dir (2026-09-10, per the
  compaction-detection proposal comment).
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

## Worker roster
The delegate targets live in `opencode.jsonc` (mode `all`) — the maintainer edits
that file live, so **verify the roster there, never trust this section or
memory**. Model notes for choosing (Q4 = 4bit, higher precision; Q3 = 3bit,
faster/weaker):
- **Default** `worker_Q4_120K` — same model as `planner_Q4_120K`, no reload cost,
  high precision: use for normal edits / builds / tests.
- `worker_Q3_*` — faster, medium precision (3bit): use when throughput beats
  precision. The large-context `…210K` variant is for very long / deeply complex
  single tasks only.
- `worker_explorer_*` (explorer mode, `prompt_agent_explorer.md`): audit/map →
  findings to `todo_inbox.md` (the planner curates + assigns the TODO IDs);
  edit allow-list = `TODO.md` / summary / scratchpad only, no code fixes.
  Weaker on detail — ALWAYS check its work.
- Raw `agent_*` variants: same models WITHOUT the worker prompt (ad-hoc, no
  handover protocol). `looprunner_*` / `planner_*` are not workers.

## Phase-scoped work
Phase plans, the progress log, current baselines, and the rules of the current
handoff live in `.opencode/handover/handover_planner.md` (the NAP) — read it first
when you get one. `TODO.md` holds durable maintainer TODOs. This file holds
stable facts and conventions only — never phase progress.
