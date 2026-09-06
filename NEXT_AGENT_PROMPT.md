# NEXT AGENT PROMPT — coverage top-up before Phase 3

You are continuing work on the Free Snap Tap repo, branch `opencode_test` (do NOT push).
FIRST read `AGENTS.md` (orientation, module map, sign convention `-`=pressed/`+`=released/
`^`=toggle, run/test commands, maintainer's recorded decisions) and `TODO.md`.

Current state (verified 2026-09-06/07):
- Suite: **145 passed, 1 xfailed** (`tests/test_known_issues.py` — Key_Event eq/hash,
  still open by maintainer decision #1). Run: `& .\.venv\Scripts\python.exe -m pytest -q`
- Lint baseline: `& .\.venv\Scripts\ruff.exe check --select F .` → exactly 5 pre-existing
  findings (free_snap_tap 2×F541, fst_manager F401 Event, fst_overlay F401 QSizePolicy +
  F841). No NEW findings allowed.
- Coverage of logic/building-block modules:
  `fst_data_types` 91%, `fst_save_file_handler` 100%, `vk_codes` 100%,
  `fst_manager` 64%, `fst_keyboard` 62%, `fst_tasks` 14%, total ~65%
  (`pytest -q --cov=fst_data_types --cov=fst_manager --cov=fst_save_file_handler --cov=fst_keyboard --cov=fst_tasks --cov=vk_codes`).
- All 15 `SPEC_FEATURES.md` §4 items are decided (see the file; decisions 2026-09-06).
  Decisions are final — do not re-litigate. Maintainer's own `TODO.md` items (general
  vk-resolution error feedback; README/WIKI rework) are NOT in scope for this run.

## Task: bounded coverage top-up (class 1 only)

Write unit tests for these pure-logic gaps ONLY — no real input, no real time, no
Windows APIs, no GUI:

1. **`Macro_Repeat_Task` internals** (`fst_tasks.py`) — actual repeat loop: replays the
   alias' key groups every `repeat_time` ms, `cancel_playback()` stops it, reset/first
   playback semantics. `fst_keyboard.start_macro_playback_repeat` + an alias entry in
   `key_group_by_alias` drive it; mock `fst_keyboard` (use `tests/conftest.py` `FakeFST`
   where it fits), `pytest-asyncio`, patch `asyncio.sleep` for timing.
2. **Control actions** (`fst_keyboard.check_control_actions` / `check_for_combination`) —
   ALT+END exit, ALT+PAGE_DOWN menu, ALT+DELETE pause toggle via `CONSTANTS` combinations
   (restore them afterwards — autouse fixture in conftest already saves them);
   `-nocontrols`/`CONTROLS_ENABLED` gate.
3. **`Argument_Manager.apply_start_arguments` branches** (`fst_manager.py`) — `-file=`,
   `-nomenu`, `-nocontrols`, `-delay`/`-nodelay`, `-tapdelay=`/`-macrodelay=`/`-aliasdelay=`
   (incl. invalid delay strings), `-crossover`/`-crossover=N` (incl. out-of-range),
   `-exec_one_macro`, `-crosshair=`, `-save_dir=`/`-backup_root_dir=`.
4. **Tap-group file save / `Config_Manager` write paths** — `_write_out_new_file`,
   `create_new_group_file`, `save_config` (whatever exists) against a `tmp_path`;
   `make_backup`/`restore_backup` collision suffixes are already covered.
5. **Mouse win32 filter basics** (`fst_keyboard.mouse_win32_event_filter`) — msg →
   vk_code mapping (1-5 buttons, x1/x2, scroll), movement returns False, simulated-flag
   passthrough. Build `SimpleNamespace` msg/data objects.

Conventions (already established in `tests/`):
- Mock pynput `keyboard.Controller`/`mouse.Controller` (see `kb_env`/`om_env` fixtures);
  never start live listeners.
- `freezegun` for wall-clock eval; `pytest-asyncio` for async; `FakeFST` from conftest
  for `Output_Manager`/`Input_State_Manager`.
- Add new tests to the existing files (`test_output_manager.py`, `test_filter_behavior.py`,
  `test_input_state_manager.py`, `test_config_parse.py`) or new files if cleaner — keep
  one file per module under test.

Rules:
- **Tests only — do NOT change source code.** If a test reveals genuinely wrong behavior,
  do not fix it: record it in your final report and (if you must keep the suite green)
  leave the test out rather than asserting buggy behavior.
- Never commit `.coverage` or `FSTconfig_test.txt` (both gitignored).
- Do NOT edit README/WIKI/`SPEC_FEATURES.md`/`TODO.md` (except: append new findings to
  your report, not to the files).
- Commit per logical chunk on `opencode_test`; do NOT push.

Definition of done:
- `& .\.venv\Scripts\python.exe -m pytest -q` fully green (xfails only for genuinely
  open items) with the new tests.
- `& .\.venv\Scripts\ruff.exe check --select F .` — same 5 baseline findings, no new ones.
- Report: new coverage numbers per module, what you covered, any code discrepancies or
  suspected bugs found (unfixed), what remains (should be only class 2: `Focus_Task`
  window polling, `CLI_menu`, listener lifecycle, display functions — deferred to
  Phase 3/4).
- After the report: **start Phase 3** per `AGENTS.md` open items (GUI tests with
  `pytest-qt`, `QT_QPA_PLATFORM=offscreen`, extend the `test_overlay.py` pattern) —
  only if the user confirms.
