# NEXT AGENT PROMPT — Phase 5: coverage push (per the Phase 4 triage)

> **STATUS (archived 2026-09-08):** Phase 5 coverage work = **DONE**, ceiling reached
> (434 passed; per-module numbers below). Remaining items are maintainer calls only
> (`TODO.md` #4/#6/#7 + the #1/#2 baseline) — NOT agent work. To resume this phase:
> read this file, then re-establish it as the live `.opencode/handover_planner.md`
> with a fresh task list.
>
> **Boot note:** the current workflow is the planner/worker split — see `AGENTS.md`
> and `.opencode/prompt_agent_planner.md`. The rules below are historical (Phase 5)
> and are superseded where they conflict.

**Scope: Phase 5 coverage work ONLY.** Tasks defined in other docs (e.g. the `TODO.md` #2
ruff cleanup) follow that doc's rules — this file's "tests only / do NOT change source"
rules do NOT apply to them.

You are continuing work on the Free Snap Tap repo, branch `opencode_test` (do NOT push —
pushing is the maintainer's job; he pushed `d161e5a` on 2026-09-07).
FIRST read `AGENTS.md` (orientation, module map, sign convention `-`=pressed/`+`=released/
`^`=toggle, run/test commands, maintainer's recorded decisions, PySide6/pytest-qt gotchas),
`TODO.md` and **`COVERAGE_TRIAGE.md` — that report IS the plan for this phase.**

**House rule from the maintainer: when something is unclear, ASK EARLY — do not decide
unilaterally or spend a long time exploring an ambiguity.**

Current state (2026-09-08, checked against HEAD `fffea8b`; `opencode_test` is 4 commits
ahead of origin — docs `fdf6048`, `3a589ba`, tests `0025a57`, `fffea8b`; pushing is the
maintainer's job). **Phase 5 coverage work is DONE** — every reachable A+B line covered.
- Suite: **434 passed** (`& .\.venv\Scripts\python.exe -m pytest -q`) (313 before Phase 5).
- Lint: `& .\.venv\Scripts\ruff.exe check --select F .` → **6 findings** — the `TODO.md` #2
  baseline restored (the 3 F401s of `ca61a26` went away in `0025a57`).
- Coverage run: `& .\.venv\Scripts\python.exe -m pytest -q --cov=fst_data_types --cov=fst_manager --cov=fst_save_file_handler --cov=fst_keyboard --cov=fst_tasks --cov=vk_codes --cov=fst_overlay`
  → **TOTAL 96 %**: `fst_data_types` 99 % (the 4 abstract stubs remain, by design),
  `fst_manager` 93 % (86 miss = 85 C + unreachable 117), `fst_keyboard` 96 % (28 miss =
  26 C + unreachable 302–303), `fst_overlay` 99 % (line 589 only —
  `StatusOverlay.contextMenuEvent` blocking `exec_`, untestable offscreen by design),
  `fst_save_file_handler` / `fst_tasks` / `vk_codes` 100 %.
  (Before Phase 5: `fst_manager` 79 %, `fst_keyboard` 73 %, `fst_data_types` 93 %.)
- Remaining miss lines = C (by design) + 2 dead pairs: 117 (`fst_manager`, see
  Discrepancies #1) and 302–303 (`fst_keyboard`, dead — `TODO.md` #6). Ceiling reached:
  3 modules at 2099/2217 (94.7 %) — includes 4 C lines covered as by-products (795/799/804,
  341).

## Task: close the triage blocks in the "Recommended order" section

(done = commit that closed the block; all on `opencode_test`)

1. ~~`keyboard_win32_event_filter` body — 12 lines (519, 520, 522–526, 528–532).~~
   **done `d94af46`** — `tests/test_filter_simulated.py`.
2. ~~`is_simulated` contradiction block — 26 lines (768, 770–775, 777–778, 780, 782–784,
   787–789, 793–794, 797–798, 800, 802–803, 834–835, 837); flipping `CONSTANTS.DEBUG2` in one
   case also takes 795, 799, 804.~~ **done `d94af46`** — incl. the 795/799/804 DEBUG2 by-product.
3. ~~Constraint-function suite — 62 lines (see the report for the exact list; one table-driven
   file through `constraint_evaluation` with `FakeFST`, `tmp_path` for file functions).~~
   **done `2007698`** (extended `test_output_manager.py`).
4. ~~`Output_Manager` tail — 15 lines (76, 91, 114–119, 139, 145, 148, 692, 707, 770–771, 777).~~
   **done `2007698`**. (The "None → pass" line 117 in here is unreachable — see Discrepancies.)
5. ~~`fst_data_types` properties/setters — 14 lines (module then 100 % minus 4 abstract stubs).~~
   **done `2007698`** (new `test_data_types.py`) — module now 99 % with exactly the 4 stubs left.
6. ~~Control actions — 33 lines (952–955, 957–960, 963–968, 973–982, 984–985, 988, 990–993,
   1030–1031).~~ **done `ca61a26`** (new `tests/test_control_actions.py`).
7. ~~Mouse/clipboard/backup constraint functions (class B) — 50 lines; mocks named per row in
   the report (mocked `mouse.Controller`, `pyperclip`, `fst_manager.mb`/`rb`, `system`).~~
   **done `99b5e37`**.
8. Macro/repeat machinery — 22 lines (fst_keyboard 852, 854–858, 901; fst_manager 326,
   334–337, 339–340, 343, 365–366, 1694–1698). — **partially done**: the `fst_manager` half
   (repeat machinery) **done `99b5e37`**; the `fst_keyboard` half (852, 854–858, 901) is
   **covered on disk by the untracked** `tests/test_macro_playback_kbd.py` (2 green tests,
   `start_macro_playback` on the running loop + `macro_task` error path) — NOT committed yet.
   Before committing it, drop the file's unused `SimpleNamespace` import (3rd of the three new
   F401 findings; the other two sit in `test_control_actions.py` / `test_facade_wiring.py`).
9. ~~Facade wiring — 23 lines (384–390, 393, 396–404, 407, 1017–1024, 1027, 121, 136).~~
   **done `ca61a26`** (new `tests/test_facade_wiring.py`).
10. ~~Start-args remainder + small data holders — 22 lines (1335, 1362, 1392, 1400, 1421–1422,
    1426–1427, 1429–1431, 1444, 1446, 1448, 1296, 1300, 1503, 1512, 1630–1632, 802).~~
    **done `99b5e37`**.
11. The 70-line remainder listed at the end of the triage section — **partially done**:
    `display_groups` 1192–1216, `_clean_comments` 866, `flush_the_input_buffer` 1930
    (monkeypatched `msvcrt` — `99b5e37`) and `check_debug_numpad_actions` 935–949
    (`ca61a26`). **Remaining testable lines — done `fffea8b`** (new
    `tests/test_extraction_filter_edges.py`, 16 tests — the bullets below):
    - `convert_to_vk_code` 144–153 — numeric vk strings + `ValueError` → `KeyError`; NOTE
      out-of-range numeric strings ("300") fall off to implicit `None` (suspected bug #2 —
      document, do NOT fix).
    - `extract_data_from_key` 189 — bare-int delay constraint (`w|50`); 213–214 — `!`
      modifier (release).
    - Config exception paths: alias except 267–269, tap-group except 279–281, rebind except
      338–340 (each: print + re-raise), mixed `Key` rebind 302–303 (`w : +e` → converted to
      `Key`).
    - Filter branches: rebind `KeyError` 644–645 (trigger group present but key missing),
      rebind replacement constraint not fulfilled → suppress 658, empty-macro `pass` 709,
      `EXEC_ONLY_ONE_TRIGGERED_MACRO` break 719, tap-loop `key_replaced` reset 735, tap-loop
      2nd `break` 746, `run_coroutine_threadsafe` except 754–755 (monkeypatch to raise —
      NEVER a live `msvcrt.getch()`).

## Next steps — all done (Phase 5 complete)

1. ~~Remove the three unused `SimpleNamespace` imports~~ — **done `0025a57`**. Lint 8/9 → 6.
2. ~~Commit `tests/test_macro_playback_kbd.py`~~ — **done `0025a57`** (task 8 complete,
   `fst_keyboard` 852, 854–858, 901). Suite 416 → 418.
3. ~~Cover the task-11 remainder~~ — **done `fffea8b`** (new
   `tests/test_extraction_filter_edges.py`, 16 tests). Result as expected; note the NAP's
   "32 lines" is 31 testable statement lines (144–153 holds 8, not 10 — 147/149 were already
   covered) and 302–303 proved dead, not testable (see `TODO.md` #6).
4. Per the post-commit routine — **done `fffea8b`**: `TODO.md` #4–#7 appended (117
   unreachable, lint regression, 302–303 dead, empty-macro comment mismatch); this file
   kept current.
5. Final report per the Definition of done — see Progress log Phase 5 #5.

Remaining maintainer calls (NOT agent work): reclassify 117 + 302–303 in `COVERAGE_TRIAGE.md`
(`TODO.md` #4/#6); empty-macro suppress comment (#7); `TODO.md` #1 (general vk resolution)
and #2 (the original 6 lint findings).

## Rules
- **Tests only.** New test files in `tests/` (or extend existing ones). Do NOT change source
  modules. If a test exposes a bug: do NOT fix it — record it and ASK.
- Never run live listeners, live `msvcrt.getch()`, real pynput input or real Windows APIs —
  mock/monkeypatch (the needed mocks are named in the `COVERAGE_TRIAGE.md` tables).
- Established patterns: mocked pynput controllers + `FakeFST` (`tests/conftest.py`),
  `freezegun`, real `FST_Keyboard` with stubbed managers (`tests/test_filter_behavior.py`
  `kb_env`), offscreen pytest-qt only for `fst_overlay` (Phase 3 — done, do NOT add GUI tests).
- Do NOT test C-class lines (debug prints / dead code / abstract stubs) unless a test
  naturally flips a debug flag.
- Suspected bugs already recorded in `COVERAGE_TRIAGE.md` (unfixed): the
  `remove_all_toasts()` `AttributeError`, the `convert_to_vk_code` implicit-`None` for
  out-of-range numeric strings, the dead code blocks — leave them; they are maintainer calls.
- `FSTconfig.txt` / `FSTconfig_test.txt`, README/WIKI/`SPEC_FEATURES.md`, `AGENTS.md`,
   `COVERAGE_TRIAGE.md` (the plan — if it proves wrong, ASK) — never edit.
- `TODO.md`: append-only (per-commit discrepancies, see commit routine) — never
  rewrite existing entries.
- Never commit coverage artifacts: `.coverage` is gitignored, `coverage.json` is NOT —
  keep it local only (ask before adding a `.gitignore` entry).
- New files are LF (source files are CRLF in the index, autocrlf). Commit per logical chunk
  on `opencode_test`; do NOT push. Follow the `AGENTS.md` **Git conventions**: if a commit
   spans multiple themes, add up to ~3 short body lines, one per theme (bug fixed / idea
   implemented / change integrated) — the commit message is your own future work log.
- **Commit routine (BEFORE EVERY commit, no exceptions):** NAP and `TODO.md` updates
  go into the same commit as the work — an interrupted agent resumes from a committed
  NAP.
  1. Update this file (NAP) with current progress — done / next task(s) / current
     baselines (test count, lint count, coverage) / the change set about to be
     committed (describe subject + files; the hash only exists after committing).
  2. Append every discrepancy found during the work (doc/code mismatch, suspected bug,
     stale baseline) to `TODO.md` as a new numbered entry — append only, never
     rewrite existing entries.
  3. Commit code changes + this file + `TODO.md` together in that single commit.
  4. **Post-commit context check:** run `& .\.venv\Scripts\python.exe .opencode\ctxgauge\peek.py`
     from the repo root and judge whether the remaining context is still enough for the
     next tasks. **If not:** finish this file with all open tasks written down (that
     update rides in the NEXT commit), stop at a clean point, and inform the user —
     never start new work.

## Definition of done
- `& .\.venv\Scripts\python.exe -m pytest -q` fully green (test count may grow).
- `& .\.venv\Scripts\ruff.exe check --select F .` — exactly 6 findings (the original six,
  see `TODO.md` #2). Currently 8/9 — the 2 new F401s of `ca61a26` (third one untracked in
  the WIP file) must go away before the phase closes; fixing `TODO.md` #2's own 6 remains the
  maintainer's.
- Coverage run above: every A + B line from the triage is covered (ceiling: the three
  modules at 94.6 % — true ceiling 2097/2217 after the line-117 reclassification, see
  Discrepancies #1); C lines remain by design.
- Final report: which blocks were closed (with the before/after coverage per module), any
  suspected bugs found (unfixed), new test files + test count, suite + lint status.

## Progress log (phases so far)

- **Phase 2 (done 2026-09-06):** unit-tested `Output_Manager` + `Input_State_Manager`
  with mocked pynput controllers + `freezegun` for time-based eval (`tr`/`last`/`dc`/`p`/`cs`)
  + filter hot path (`fst_keyboard._win32_event_filter`). See `tests/test_output_manager.py`,
  `tests/test_input_state_manager.py`, `tests/test_filter_behavior.py`; gap semantics in
  `SPEC_FEATURES.md` section 5.
- **class-2 coverage (done 2026-09-07):** `Focus_Task` polling (`tests/test_focus_task.py`),
  listener lifecycle + display functions (`test_filter_behavior.py`), `CLI_menu`
  (`tests/test_cli_menu.py`), `Focus_Group_Manager` task methods
  (`tests/test_focus_group_manager.py`). `fst_tasks` at 100 %.
- **Phase 3 prep (done 2026-09-07):** offscreen pytest-qt env pinned in `tests/conftest.py`
  (`QT_QPA_PLATFORM=offscreen`); smoke + `ToastBridge` round-trip tests in
  `tests/test_gui_smoke.py`.
- **Resolved 2026-09-07:** known-issue #1 (Key_Event eq/hash) — strict repr-based `__eq__`
  on all data types (eq == hash == repr); the loose vk/press comparison in the filter hot
  path is now explicit (`is_trigger_activated`, repeated-trigger suppression);
  `tests/test_known_issues.py` removed, suite fully green. Also fixed: `Focus_Task`
  `stop` attribute shadowing the `stop()` method (renamed `self._stop`), and
  `ToastManager._handle_destruction` guarded against an already-deleted C++ side.
- **Phase 3 (done 2026-09-07):** offscreen GUI tests for `fst_overlay.py` (34 % → 99 %)
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
- **Phase 5 #1 (done 2026-09-07):** `d94af46` — triage tasks 1+2: new
  `tests/test_filter_simulated.py` (152 lines) covers the `keyboard_win32_event_filter`
  body (keydown/keyup/syskey, `LLKHF_INJECTED`) and the `_win32_event_filter` `is_simulated`
  tap-group contradiction block; one case flips `CONSTANTS.DEBUG2`, also covering 795/799/804.
- **Phase 5 #2 (done 2026-09-07):** `2007698` — triage tasks 3+4+5: extended
  `test_output_manager.py` (+195 lines) with the variable/string/file/date/callback
  constraint functions + delay/scroll/async tail; new `test_data_types.py` covers the
  remaining property getters and typed setters (module now at the 4-abstract-stubs
  ceiling). Discrepancy found + recorded in the commit message: line 117 ("None → pass") is
  unreachable — `constraint_evaluation` normalizes `None` → `True` (fst_manager.py:691)
  before returning.
- **Phase 5 #3 (done 2026-09-07):** `99b5e37` — triage task 7 (class-B
  mouse/clipboard/backup/clear-console constraint functions, 50 lines), task 8's
  `fst_manager` half (repeat machinery: `is_repeat_active`, `toggle_repeat` restart,
  `stop_all_repeat` broken entry, `stop_all_repeating_keys`), task 10 (start-args + small
  data holders), and the easy slice of task 11 (`display_groups`, `_clean_comments` ':',
  `flush_the_input_buffer` with monkeypatched `msvcrt`). Touched
  `test_output_manager.py`, `test_argument_manager.py`, `test_cli_menu.py`,
  `test_config_parse.py`, `test_input_state_manager.py`.
- **Phase 5 #4 (done 2026-09-07):** `ca61a26` — triage tasks 6+9: control actions
  (`control_return_to_menu` / `control_exit_program` / `control_toggle_pause` resume+pause),
  `check_debug_numpad_actions` (task-11 slice), facade wiring (`apply_focus_groups`,
  `update_args_and_groups`, `apply_start_args_by_focus_name`, `set_loop`, property
  getters); new `tests/test_control_actions.py` + `tests/test_facade_wiring.py`.
  Discrepancy introduced: both files import unused `SimpleNamespace` → 2 new F401
  (lint 6 → 8, see Discrepancies #2).
- **Phase 5 WIP (committed 2026-09-08):** `0025a57` — task 8's `fst_keyboard` half
  (`tests/test_macro_playback_kbd.py`, 2 tests) + removal of the three unused
  `SimpleNamespace` imports (lint 9 → 6, `TODO.md` #2 baseline restored).
- **Phase 5 #5 / closeout (done 2026-09-08):** `fffea8b` — task-11 remainder: new
  `tests/test_extraction_filter_edges.py` (16 tests) — `convert_to_vk_code` numeric
  ("255"→255, "300"→implicit None = suspected bug #2) + ValueError→KeyError, bare-int delay
  `w|50` + `!` release modifier, alias/tap-group/rebind except paths, rebind-dict KeyError
  swallow, replacement-constraint suppression (658), empty macro (709),
  `EXEC_ONLY_ONE_TRIGGERED_MACRO` break (719), tap-loop `key_replaced` reset (735) + 2nd
  break (746), mouse-rebind `run_coroutine_threadsafe` except (754–755, monkeypatched to
  raise). Suite 418 → 434; `fst_keyboard` 91% → 96 % (28 miss = 26 C + dead 302–303).
  Findings: 302–303 dead code (`TODO.md` #6), empty-macro comment mismatch (#7).
