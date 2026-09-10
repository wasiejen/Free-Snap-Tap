# TASK — Audit 3a: test-suite smell check (tests/ ONLY — strict scope)

FIRST read `AGENTS.md`, `agents_repo.md`, this file, and `TODO.md` — especially
entry **#40** (what went wrong in the dead runs + the known findings list) and
**#41** (the plural-mock issue your lead (a) belongs to). Repo root = the
directory containing `agents_repo.md`.

## Goal
A tight smell check of `tests/`: find CONCRETE test-suite issues — pinned
suspicious behavior, xfail/skip, duplicated helpers, stale/misleading comments,
and coverage gaps in the hot-path functions (paths where a regression would NOT
be caught). Findings only — you do NOT fix anything.

## Scope (STRICT — deviating is a rule violation)
- Read: files in `tests/` + `pytest.ini` only. The two >400-line files
  (`test_output_manager.py` 577, `test_filter_behavior.py` 473): read in TWO
  passes (offset/limit), never one call.
- Production code (`fst_*.py`, `free_snap_tap.py`): **Grep for symbol locations
  only** (to check whether a hot-path function is covered by a test). NO
  >40-line production reads at all.
- Hot-path targets for the gap map: `keyboard_win32_event_filter`,
  `mouse_win32_event_filter`, `initialize_groups_from_presorted_lines`,
  `apply_focus_groups`, `update_args_and_groups`, `constraint_evaluation`,
  `execute_key_event`.

## Known leads (verify + EXTEND the owning entry if confirmed — do NOT re-derive)
a) The plural-mock hiding (`tests/conftest.py:69` +
   `tests/test_output_manager.py:534`) — belongs to **#41**; only confirm #41's
   evidence is accurate, do not duplicate it.
b) Multi-notch scroll coverage: the dead worker noted only SINGLE-notch scroll
   is tested — if confirmed as a real gap, it is a NEW entry.
c) `test_extraction_filter_edges.py` ≈61-64 pins the implicit-None
   `convert_to_vk_code` behavior — evidence of **#1**; confirm, do not
   re-derive.
Known open issues — DO NOT re-derive: #1, #3, #4, #6, #7, #8, #9, #11 (the
`XXX 241016-1101` pin is the maintainer's find-marker — do not touch),
#30/#34/#35/#39/#40/#41. If your finding overlaps an open entry, EXTEND that
entry instead.

## What is TODO-worthy (rule 6 of the dead-run spec — it still holds)
A CONCRETE defect only: a test bug, a pin of behavior that is actually a
production bug, a test gap that would let a hot-path regression through,
duplicated helpers, stale/misleading test comments. Performance observations
and style are NOT TODO items — list them under "Not TODO-ified (and why)" in
the summary instead.

## Definition of done
1. Every verified finding is a self-contained `TODO.md` entry (AGENTS.md
   contract: title / problem+evidence with file+lines / desired outcome /
   acceptance / scope / status; flag `maintainer call` when the fix would change
   observable behavior). Entry IDs start at **#42** — unique, never reuse.
2. **Write each entry to `TODO.md` IMMEDIATELY after verifying it** — never
   batch all entries at the end (the dead-run failure mode).
3. Before committing, re-read `TODO.md` and confirm your entries are on disk.
4. Verification MEASURED: `& .\.venv\Scripts\python.exe -m pytest -q` → exact
   count (baseline 434/434); `& .\.venv\Scripts\ruff.exe check --select F .` →
   0.
5. Summary in `.opencode/handover_task_to_planner.md` (OVERWRITE): files mapped
   (one line each), findings + TODO IDs, measured verification lines VERBATIM,
   commit hash, "Not TODO-ified (and why)", honest deviations, LAST line =
   VERBATIM output of `node .opencode/ctxgauge/peek.mjs` (actually run it —
   fabricating it is a rule violation, evidence #38/#40).
6. Commit `TODO.md` + the summary. No push. If there are NO verified findings:
   say so in the summary, commit the summary alone (note "no findings" in the
   commit subject).

## Hard rules (each answers a dead-run failure mode)
1. Gauge-check `node .opencode/ctxgauge/peek.mjs` every ~2 file reads; read
   nothing > 400 lines in one call.
2. Do NOT touch: `tests/` contents, FST code, `handover_planner.md`,
   `opencode.jsonc`, `playground/`, docs. Findings only — no fixes.
3. `Deviations` must list EVERY rule you bent or broke (honesty > appearance).
4. pwsh shell; python = `& .\.venv\Scripts\python.exe` only (agents_repo.md
   `Environment & shell`).
