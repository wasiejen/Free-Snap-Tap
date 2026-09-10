# TASK — Audit 3b: focus-dict + control-combination hot windows + 3a residual skim

FIRST read `AGENTS.md`, `agents_repo.md`, this file, and `TODO.md` open items.
Repo root = the directory containing `agents_repo.md`.

## Why this run exists
The dead session-3 worker was checking two hot-path candidates when it died, and
the 3a explorer budget-skipped 16 test files. This run closes both tails. Findings
only — you do NOT fix anything.

## Scope (STRICT — deviating is a rule violation)
1. **`apply_focus_groups` focus-dict access** — `fst_keyboard.py:383-404`
   (read this window + the two call sites ≈404 / ≈976): look for
   KeyError-on-missing-focus, None-deref, or dict-mutation-vs-copy bugs in how
   the focus groups are selected/applied.
2. **CONSTANTS / control-combination candidates** — the control-handling
   windows: `fst_keyboard.py` ≈626 ("CONTROL HANDLING"), ≈915-930, ≈976-985;
   `fst_manager.py` `Argument_Manager.CONTROLS_ENABLED` (≈1257, ≈1306, ≈1373)
   and the Output_Manager control path ≈1887-1915. Look for: disabled-state
   leaks (controls still active when `CONTROLS_ENABLED` is False), missing
   resets, and comment/behavior mismatches.
3. **3a residual skim** — the 3a run's file map is in
   `.opencode/handover_task_to_planner.md`; skim EVERY `tests/` file it did NOT
   cover end-to-end (it named 16): look only for the concrete smells — pinned
   suspicious behavior, duplicated helpers (beyond the #43 known drift),
   stale/misleading comments, and gaps vs. the windows in (1)/(2).

Production reads: targeted windows ONLY (offset/limit, ≤ 100 lines per call,
Grep first). Test files: full reads allowed (they are all < 600 lines; if one
is bigger, two passes).

## Known open issues — DO NOT re-derive
#1, #3, #4, #6, #7, #8, #9, #11 (the `XXX 241016-1101` pin is the maintainer's
find-marker — do not touch it), #30/#34/#35/#39/#40/#41/#42/#43. If your finding
overlaps an open entry, EXTEND that entry instead.

## What is TODO-worthy (rule 6 still holds)
A CONCRETE defect only: a bug, an unhandled/propagating error, a
comment/behavior mismatch, dead code, or a test gap that would let a
regression through. Performance observations are NOT TODO items — list them
under "Not TODO-ified (and why)" in the summary.

## Definition of done
1. Every verified finding → self-contained `TODO.md` entry (AGENTS.md
   contract), entry IDs start at **#44** (unique, never reuse — #42/#43
   already exist). Write each entry to disk IMMEDIATELY after verifying it.
2. Before committing, re-read `TODO.md` (a targeted `rg '^## 4[4-9]\.' TODO.md`
   grep counts as the on-disk confirmation) and confirm your entries are there.
3. Verification MEASURED: `& .\.venv\Scripts\python.exe -m pytest -q` →
   baseline 434/434; `& .\.venv\Scripts\ruff.exe check --select F .` → 0.
4. Summary in `.opencode/handover_task_to_planner.md` (OVERWRITE): files mapped
   (one line each), findings + TODO IDs, measured verification lines VERBATIM,
   commit hash, "Not TODO-ified (and why)", honest deviations, LAST line =
   VERBATIM `node .opencode/ctxgauge/peek.mjs` (actually run it).
5. Commit `TODO.md` + summary (or summary alone if zero findings — say so in
   the commit subject). No push.

## Hard rules
1. Gauge-check `node .opencode/ctxgauge/peek.mjs` every ~2 reads; nothing
   > 400 lines in one call.
2. Do NOT touch: code, `tests/` contents, `handover_planner.md`,
   `opencode.jsonc`, `playground/`, docs. Findings only.
3. `Deviations` lists EVERY rule bent or broken. pwsh shell; python =
   `& .\.venv\Scripts\python.exe` only.
