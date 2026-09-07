# NEXT AGENT PROMPT — Phase 4: coverage triage report (+ optional Windows CI)

You are continuing work on the Free Snap Tap repo, branch `opencode_test` (do NOT push).
FIRST read `AGENTS.md` (orientation, module map, sign convention `-`=pressed/`+`=released/
`^`=toggle, run/test commands, maintainer's recorded decisions, PySide6/pytest-qt gotchas)
and `TODO.md`.

**House rule from the maintainer: when something is unclear, ASK EARLY — do not decide
unilaterally or spend a long time exploring an ambiguity.**

Current state (verified 2026-09-07, HEAD `3066ecb`):
- Suite: **313 passed, 0 xfailed**. Run: `& .\.venv\Scripts\python.exe -m pytest -q`
- Lint baseline: `& .\.venv\Scripts\ruff.exe check --select F .` → **6 findings** (free_snap_tap
  2×F541, fst_manager F401 `Event`, fst_overlay F401 `QSizePolicy` + F841
  `cube_distance_down`, test_pynput_mouse F841 — leave that maintainer file alone).
  No NEW findings allowed.
- Coverage (`--cov=fst_data_types --cov=fst_manager --cov=fst_save_file_handler
  --cov=fst_keyboard --cov=fst_tasks --cov=vk_codes --cov=fst_overlay`):
  `fst_tasks` 100%, `fst_save_file_handler` 100%, `vk_codes` 100%, `fst_overlay` 99%
  (only the blocking `contextMenuEvent`/`exec_` line remains — leave it),
  `fst_data_types` 93%, `fst_manager` 79%, `fst_keyboard` 73%, total 84%.
- Verified missing-line snapshot (2026-09-07, re-derive — do not trust blindly):
  - `fst_manager.py` (274): 76, 91, 110, 114-119, 139, 145, 148, 186, 189, 195, 198,
    268-269, 285, 314, 326, 334-343, 352, 364-367, 379, 392, 394, 397, 407, 413-417,
    437-449, 454, 458-462, 467-469, 473-478, 481-482, 485-486, 489-490, 501-506,
    509-514, 517-518, 521-522, 525-526, 529-530, 533-534, 537-538, 541-543, 546-549,
    552-563, 571-572, 575-576, 579-580, 585-586, 589-594, 597-599, 602-604, 607-610,
    613, 616-618, 621-627, 630-634, 641, 680, 684, 692, 707, 731, 738, 750-751,
    770-771, 777, 802, 866, 891, 1002-1071, 1192-1216, 1296, 1300, 1335, 1356, 1362,
    1370, 1392, 1400, 1421-1422, 1426-1427, 1429-1431, 1444, 1446, 1448, 1503, 1512,
    1630-1632, 1690, 1694-1698, 1768, 1776, 1789, 1847, 1930
  - `fst_keyboard.py` (176): 121, 136, 144-153, 180, 189, 213-214, 267-269, 279-281,
    302-303, 338-340, 374, 384-390, 393, 396-404, 407, 482-484, 519-532, 582, 587,
    603, 624, 644-647, 658, 667, 682, 687, 706, 709, 716, 719, 727, 733, 735, 746,
    754-755, 768-804, 819, 821, 834-837, 840, 852-858, 876, 888, 901, 935-949,
    952-960, 963-968, 973-993, 1010, 1014, 1017-1024, 1027, 1030-1031
  - `fst_data_types.py` (18): 42, 47, 51, 55, 124, 144, 160, 181, 190, 223, 236, 245,
    248, 254, 288, 312, 357, 361
- Phase 3 (done 2026-09-07): offscreen pytest-qt GUI tests for `fst_overlay.py`;
  bugs found & fixed while testing (see AGENTS.md "Open items" — toast dict cleanup,
  dict-based `check_empty`, removed dangling `remove_crosshair()` call).

## Task A: coverage triage report (the deliverable)

Goal: a prioritized triage of the **remaining uncovered lines** in
`fst_manager.py`, `fst_keyboard.py` and `fst_data_types.py` — the plan for a future
coverage push. `fst_overlay.py` is DONE — do not add GUI tests. **No new tests in
this phase; no source changes** — the deliverable is the report.

1. Re-generate the report:
   `& .\.venv\Scripts\python.exe -m pytest -q --cov=fst_manager --cov=fst_keyboard --cov=fst_data_types --cov-report=term-missing`
   and confirm it matches the snapshot above (if it differs, the snapshot in this
   prompt is stale — ASK before proceeding if the diff is unexpected).
2. Walk **every** uncovered line range. Map each to its function/class by reading the
   source (the file's structure — AGENTS.md has a module map). Classify each block:
   - **A. testable now** — pure logic or mockable deps (the mocked-pynput +
     `freezegun` patterns from `tests/` are established; `msvcrt` can be
     monkeypatched — but NEVER run a live `msvcrt.getch()` wait in a test).
   - **B. testable with more mocking** — Windows APIs / pygetwindow / `startfile` /
     clipboard / threads: name the mock needed.
   - **C. deliberately not covered** — debug-print branches, maintainer-only paths,
     code whose only caller is dead code, or blocks that would require a real
     display/anti-cheat environment. Justify each.
3. Write the report to a NEW file `COVERAGE_TRIAGE.md` (repo root, LF) with:
   - one table per module: `lines | function | class | why / mock needed | effort (S/M/L)`
   - a "recommended order" section: top 5–10 blocks for Phase 5 by value/effort,
     with the exact uncovered lines each would close;
   - totals per class (how many lines each class covers) — the ceiling.
4. **Do NOT write tests and do NOT change source.** If triage reveals a suspected
   bug, record it in the report and your final message — do not fix it.

## Task B: optional Windows CI — ONLY if the user explicitly approves

The project is Windows-only (pynput selective suppression, msvcrt) → the runner MUST
be Windows. If approved:
- Add `.github/workflows/ci.yml` (LF): `windows-latest`, `actions/setup-python` with
  **Python 3.12** (the venv runs 3.12.9), `pip install -r requirements.txt
  -r requirements-dev.txt`, then the exact suite command
  (`&` not needed in bash — `python -m pytest -q`; use `python -m pytest -q` via
  `py`/`python` shell). No display server needed: `tests/conftest.py` pins
  `QT_QPA_PLATFORM=offscreen`.
- Lint step: **ASK the maintainer first how strict** — the baseline has 6 findings.
  Options: informational only, or hard-fail when the count exceeds 6.
- Verify locally that the exact workflow commands run green in the venv before
  committing.
- Commit the file on `opencode_test`; do NOT push (the remote is `wasiejen/Free-Snap-Tap`).

## Rules
- **Report + (maybe) workflow file only — do NOT change source or test code.**
- `FSTconfig.txt` and `FSTconfig_test.txt` are the maintainer's live files — never edit.
- Never commit `.coverage` / coverage HTML artifacts (check `.gitignore`; if missing,
  ASK before adding entries — do not add on your own).
- Do NOT edit README/WIKI/`SPEC_FEATURES.md`/`TODO.md`/`AGENTS.md` (the maintainer
  updates AGENTS.md status lines himself).
- Git note: source files are stored CRLF in the index (autocrlf); the new report and
  workflow files are LF.
- Commit per logical chunk on `opencode_test`; do NOT push.

## Definition of done
- `& .\.venv\Scripts\python.exe -m pytest -q` fully green, unchanged (313 passed).
- `& .\.venv\Scripts\ruff.exe check --select F .` — same 6 findings, no new ones.
- `COVERAGE_TRIAGE.md` committed, classifying 100% of the uncovered lines of the three
  modules (nothing left unclassified, no "etc.").
- Final report: the triage summary inline (top Phase 5 candidates + the coverage
  ceiling per class), any suspected bugs found (unfixed), plus — only if done — the
  CI workflow location and the maintainer decision it depended on.
- **Phase 5 (coverage push per the triage) starts only after the user confirms
  Phase 4 is done.**
