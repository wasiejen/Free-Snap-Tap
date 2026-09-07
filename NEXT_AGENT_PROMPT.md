# NEXT AGENT PROMPT — Phase 5: coverage push (per the Phase 4 triage)

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

Current state (2026-09-07):
- Suite: **313 passed**. Run: `& .\.venv\Scripts\python.exe -m pytest -q`
- Lint baseline: `& .\.venv\Scripts\ruff.exe check --select F .` → **6 findings** (unchanged;
  fixing them is `TODO.md` #2 — cosmetic only — NOT part of this phase).
- Remaining uncovered lines are fully classified in `COVERAGE_TRIAGE.md` (tables per module):
  A (testable now) = 299 lines, B (more mocking) = 50 lines, C (deliberately not covered) = 119.
- Coverage run: `& .\.venv\Scripts\python.exe -m pytest -q --cov=fst_data_types --cov=fst_manager --cov=fst_save_file_handler --cov=fst_keyboard --cov=fst_tasks --cov=vk_codes --cov=fst_overlay`
  (before Phase 5: `fst_manager` 79 %, `fst_keyboard` 73 %, `fst_data_types` 93 %).

## Task: close the triage blocks in the "Recommended order" section

1. `keyboard_win32_event_filter` body — 12 lines (519, 520, 522–526, 528–532).
2. `is_simulated` contradiction block — 26 lines (768, 770–775, 777–778, 780, 782–784,
   787–789, 793–794, 797–798, 800, 802–803, 834–835, 837); flipping `CONSTANTS.DEBUG2` in one
   case also takes 795, 799, 804.
3. Constraint-function suite — 62 lines (see the report for the exact list; one table-driven
   file through `constraint_evaluation` with `FakeFST`, `tmp_path` for file functions).
4. `Output_Manager` tail — 15 lines (76, 91, 114–119, 139, 145, 148, 692, 707, 770–771, 777).
5. `fst_data_types` properties/setters — 14 lines (module then 100 % minus 4 abstract stubs).
6. Control actions — 33 lines (952–955, 957–960, 963–968, 973–982, 984–985, 988, 990–993,
   1030–1031).
7. Mouse/clipboard/backup constraint functions (class B) — 50 lines; mocks named per row in
   the report (mocked `mouse.Controller`, `pyperclip`, `fst_manager.mb`/`rb`, `system`).
8. Macro/repeat machinery — 22 lines (fst_keyboard 852, 854–858, 901; fst_manager 326,
   334–337, 339–340, 343, 365–366, 1694–1698).
9. Facade wiring — 23 lines (384–390, 393, 396–404, 407, 1017–1024, 1027, 121, 136).
10. Start-args remainder + small data holders — 22 lines (1335, 1362, 1392, 1400, 1421–1422,
    1426–1427, 1429–1431, 1444, 1446, 1448, 1296, 1300, 1503, 1512, 1630–1632, 802).
11. Then the 70-line remainder listed at the end of that section (display_groups, numpad
    actions, `convert_to_vk_code` numeric branch, config exception paths, small filter
    branches, `_clean_comments` 866, `flush_the_input_buffer` 1930 with monkeypatched
    `msvcrt.kbhit`/`getch` — NEVER a live `getch()`).

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
- `TODO.md`: append-only (per-commit discrepancies, see post-commit routine) — never
  rewrite existing entries.
- Never commit coverage artifacts: `.coverage` is gitignored, `coverage.json` is NOT —
  keep it local only (ask before adding a `.gitignore` entry).
- New files are LF (source files are CRLF in the index, autocrlf). Commit per logical chunk
  on `opencode_test`; do NOT push. Follow the `AGENTS.md` **Git conventions**: if a commit
   spans multiple themes, add up to ~3 short body lines, one per theme (bug fixed / idea
   implemented / change integrated) — the commit message is your own future work log.
- **Post-commit routine (after EVERY commit):**
  1. Update this file (NAP) with current progress — done / next task(s) / current
     baselines (test count, lint count, coverage) / HEAD commit — so an interrupted
     agent can resume from here with relatively current data.
  2. Append every discrepancy found at commit time (doc/code mismatch, suspected bug,
     stale baseline) to `TODO.md` as a new numbered entry — append only, never
     rewrite existing entries.
  3. Run `& .\.venv\Scripts\python.exe ..\ctxgauge\peek.py` from the repo root and judge
     whether the remaining context is still enough for the next tasks. **If not:**
     finish this file with all open tasks written down, stop at a clean point, and
     inform the user — never start new work.

## Definition of done
- `& .\.venv\Scripts\python.exe -m pytest -q` fully green (test count may grow).
- `& .\.venv\Scripts\ruff.exe check --select F .` — still exactly 6 findings, no new ones.
- Coverage run above: every A + B line from the triage is covered (ceiling: the three
  modules at 94.6 %); C lines remain by design.
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
