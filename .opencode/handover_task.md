# TASK — clear the 6 ruff `F` findings (TODO.md #2) (2026-09-10)

Read `AGENTS.md` + `agents_repo.md` first. Lint-cleanup task, **cosmetic only, zero
behavior change**.

## Goal
Make the FST lint baseline zero: `& .\.venv\Scripts\ruff.exe check --select F .` currently
reports exactly **6 findings** (planner-measured this morning) and must end at **0**.

## The 6 findings (verified against the live code today)
1. `free_snap_tap.py:150` — F541 f-string without placeholders: `logger.info(f"--- FST startet ---")` → drop the `f`.
2. `free_snap_tap.py:159` — F541 f-string without placeholders: `logger.info(f"--- logic gestartet ---")` → drop the `f`.
3. `fst_manager.py:8` — F401 unused import `from threading import Event` (the comment
   "to play aliases…" belongs to the *usage* intent — deleting the import line deletes
   the comment too; that is fine).
4. `fst_overlay.py:7` — F401 `QSizePolicy` imported but unused → remove it from the
   `PySide6.QtWidgets` import list (keep the other names, same order).
5. `fst_overlay.py:412` — F841 `cube_distance_down = cube_distance + spacing` assigned,
   never read → delete the line. **Do NOT** "fix" it by using it anywhere — dead stays dead.
6. `playground/pynput_mouse_probe.py:140` — F841 `key_event_time = data.time` unused →
   delete the line.

## Definition of done (what "pass" means)
1. `& .\.venv\Scripts\ruff.exe check --select F .` → clean (exit 0, zero findings).
2. `& .\.venv\Scripts\python.exe -m pytest -q` → **all green** (measure and report your
   before-run count; the after-run count must equal it — record both in the summary).
3. Diff scope = only the 6 finding sites in the 3+1 files listed above. No reformatting,
   no drive-by fixes, no other lint categories.

## Approval boundary
Pre-approved class (lint fixes / dead-code removal, no observable behavior change).
Do **NOT** touch: `handover_planner.md`, `AGENTS.md`, `agents_repo.md`, the plugin
(`.opencode/plugin/`), tests, `FSTconfig.txt`/`FSTconfig_test.txt`, anything else in the
repo. If a site turns out NOT to be purely cosmetic (a symbol turns out referenced),
STOP that site, keep the rest, and flag it in the summary — do not force it.

## Suggested scope (non-binding)
`free_snap_tap.py`, `fst_manager.py`, `fst_overlay.py`, `playground/pynput_mouse_probe.py`.

## Verification commands (from repo root)
- `& .\.venv\Scripts\ruff.exe check --select F .`
- `& .\.venv\Scripts\python.exe -m pytest -q`

## Commit routine
One commit covering: the code changes + the `TODO.md` entry #2 marked CLOSED with the
commit hash + this task's worker summary file. Do NOT touch `.opencode/handover_task.md`
(it is planner-owned). Commit subject: one-line imperative, e.g.
`fix: clear the 6 ruff F findings (TODO #2)`.

## Return
Write the EXECUTIVE SUMMARY to `.opencode/handover_task_to_planner.md` (changes made per
file, ruff findings before/after, pytest count before/after, commit hash, anything flagged
as non-cosmetic, what was deliberately not done). The file you return ends that work —
this is a first test of the new worker prompt, so keep the summary tight and factual.
