# EXECUTIVE SUMMARY — clear the 6 ruff `F` findings (TODO #2)

Worker `worker_120K_mtp`, 2026-09-10. Task spec: `.opencode/handover_task.md` (read-only for this
worker; its changes remain dirty in the work tree and are NOT part of this commit).

## Result
Done. `ruff check --select F .` → 6→0 clean (exit 0). pytest 434→434 passed (13 warnings
unchanged). Single commit, subject `fix: clear the 6 ruff F findings (TODO #2)` (identifying data
under "Flags" — chicken-egg note).

## Changes (7 lines, 4 files)
- `free_snap_tap.py:150` — F541: `f"--- FST startet ---"` → drop the `f`.
- `free_snap_tap.py:159` — F541: `f"--- logic gestartet ---"` → drop the `f`.
- `fst_manager.py:8` — F401: removed the `from threading import Event` import line (unused;
  grep-verified no other `Event` reference in the module; its inline comment goes with it per
  spec — the comment stated *usage* intent, not a live hook).
- `fst_overlay.py:7` — F401: removed `QSizePolicy` from the `QtWidgets` import list (only other
  occurrences repo-wide: this import, the task file, TODO.md — no live use).
- `fst_overlay.py:412` (original) — F841: removed `cube_distance_down = cube_distance + spacing`
  (never read; all references are commented-out painter lines — left verbatim, "dead stays dead").
- **Cascade:** `fst_overlay.py:412` (original) — removed `cube_distance = self.crosshair_size
  // 20 + spacing`, which the instructed #5-delete made dead (its only live reader was the
  removed `cube_distance_down` assignment; remaining references are the same commented-out
  painter lines). Verified no live reference before deleting. See Flags (2).
- `playground/pynput_mouse_probe.py:140` — F841: removed `key_event_time = data.time` (playground
  file; never read — the same name in `fst_keyboard.py`/`fst_manager.py` is an unrelated local
  used there).

Diff scope = exactly these 7 lines in these 4 files. No reformatting, no other lint categories,
nothing else touched.

## Verification (measured, not assumed)
- BEFORE: `ruff check --select F .` → 6 findings (exact file:line match to the spec's list);
  `pytest -q` → **434 passed, 13 warnings in 2.43s**.
- AFTER: `ruff check --select F .` → **0 findings, exit 0**; `pytest -q` → **434 passed,
  13 warnings in 1.90s**. Warnings byte-identical profile (the `QMouseEvent.globalPos()`
  notes' line refs, from the 535/549 pre-edit lines → 535/547 (post two removed lines),
  same 13-warning baseline, incl. the known TODO #10 state).
 

## Commit
One commit covering the 4 code files + `TODO.md` (entry #2 closed with a same-commit self
reference) + this file. Pre-existing dirty files `.opencode/handover_task.md` (planner-owned
spec, left verbatim) and `SCRATCH_PAD.md` (scratch) were NOT staged/committed.

Identifying data for the commit (self-hash is unrecordable in-tree — see Flags 1):
- subject: `fix: clear the 6 ruff F findings (TODO #2)`
- parent: `ff86d9b` (HEAD when the worker started)
- themes staged: the 4 code files, `TODO.md`, this file — nothing else.

## Flags (ambiguities/conflicts found — per the maintainer's note for this test run)
1. **Self-hash chicken-egg (spec vs git reality).** The spec asks for TODO #2 to be "marked
   CLOSED with the commit hash" inside the one commit that contains it. A commit cannot contain
   its own hash (the hash depends on the content). Resolved per repo precedent (TODO #13/#28
   closures were likewise resolved via follow-up references/`git log`): the entry is closed
   in-tree with a same-commit self reference; the planner can record the hash in its
   bookkeeping. If a hash in-tree is wanted, it needs a two-commit variant (code+summary →
   note-with-hash) — maintainer call, one instruction sentence to change.
2. **Cascade vs DoD#3 scope.** DoD#3 says diff = "only the 6 finding sites"; removing the
   instructed `cube_distance_down` line makes the line above it dead, so 0 findings (DoD#1, the
   stated goal) requires removing it too. Treated as the same dead-code class, flagged in the
   TODO #2 closure note. Not referenced by anything in live code; no behavior change.
3. **Dirty planner-owned file at start:** `.opencode/handover_task.md` was already modified in
   the work tree when the worker started (the spec file itself); left unstaged/uncommitted.
   `SCRATCH_PAD.md` also dirty — not the worker's, left alone.

## Not done / deliberate omissions
- Nothing in the 4-file scope beyond the 6 sites + the one cascading line (see Flag 2).
- `QSizePolicy` import line, commented-out painter lines (423–425/437–439 post-edit), TODO #10
  (`globalPos` deprecation), TODO #1 (general vk surfacing) — all untouched, all out of scope.
- Plan-state file: worker did not touch it (denied + task's DO NOT TOUCH list).

## Deviations from suggested procedure
- Procedure as written was correct for all 6 sites; only deviation = the cascading `cube
  distance` deletion (Flag 2), which the spec's "dead stays dead" principle covers and its DoD
  did not anticipate.
- No opportunistic out-of-scope fixes were made.
