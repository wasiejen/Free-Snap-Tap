# TASK — Explorer re-run (v2): fst_keyboard.py hot path + test-suite smell check

FIRST read `AGENTS.md`, `agents_repo.md`, this file, and `TODO.md` — especially
entry **#40** (what went wrong in run #1) and the open items (known issues list
below). Repo root = the directory containing `agents_repo.md`.

## Why this run exists
Run #1 (the gemma explorer) FAILED its deliverables: the claimed TODO entries were
never written, nothing was committed, the final gauge line was fabricated, and the
run died from context overflow (full reads of two large files → 142816 tokens > the
endpoint's 131072 cap → forced compaction). Its findings were planner-verified as
mostly false positives / misreadings / duplicates (details in TODO #40). Your job:
complete the REMAINING scope with strict discipline. You are a reliable worker —
the bar is "verifiable on disk", not "described in the summary".

## Scope (remaining — do NOT re-audit fst_manager.py; run #1 + planner covered it)
1. `fst_keyboard.py` hot path: `keyboard_win32_event_filter` /
   `mouse_win32_event_filter` (rebinds → toggle → suppression → trigger eval),
   `initialize_groups_from_presorted_lines`, `apply_focus_groups`,
   `update_args_and_groups`.
2. Test-suite smell check in `tests/`: skipped/xfail tests, tests pinning
   suspicious behavior, duplicated helpers, stale comments, and test gaps in the
   filter paths above (paths where a regression would NOT be caught).

## Hard rules (each one answers a run-#1 failure mode — deviating is a rule violation)
1. **Never read a file with more than 400 lines in one Read call.** Use Grep to
   locate a symbol, then Read with offset/limit for the targeted range (≤ 200 lines
   per call). This keeps your context in the safe zone (your window is 120k).
2. **Write each TODO entry to `TODO.md` immediately after verifying it** — do not
   batch all entries at the end. Entry IDs start at **#41**. The run-#1 claimed IDs
   #43–#47 do NOT exist — do not use them and do not "restore" them.
3. **Before committing, re-read `TODO.md`** and confirm your entries are on disk.
   The commit must include `TODO.md` + the summary file. No commit = task not done.
4. The LAST line of your summary is the VERBATIM output of the command
   `node .opencode/ctxgauge/peek.mjs` — actually run it in the bash tool and paste
   the exact printed line. Fabricating it is a rule violation (TODO #38 + #40).
5. The summary's "Deviations" section must list EVERY hard rule you bent or broke
   (honesty > appearance).
6. A finding is TODO-worthy only if it is a CONCRETE defect: a bug, an
   unhandled/propagating error, a comment/behavior mismatch, dead code, or a test
   gap that would let a regression through. Performance observations without
   evidence are NOT TODO items — list them under "Not TODO-ified (and why)" in the
   summary instead.
7. Known open issues — DO NOT re-derive: #1 (vk resolution), #3 (docs), #4 + #6
   (dead code), #7 (empty macro), #8 (ap/ar dict), #9 (repeat excepts), #11
   (contradiction prevention — the `XXX 241016-1101` pin is the maintainer's
   find-marker, do not touch), #30/#34/#35/#39/#40 (loop/gauge housekeeping).
   If your finding overlaps an open entry, EXTEND that entry instead.

## Definition of done
1. Hot path + `tests/` audited; every verified finding is a self-contained
   `TODO.md` entry (AGENTS.md contract: title / problem+evidence with file+lines /
   desired outcome / acceptance / scope / status; flag `maintainer call` when the
   fix would change observable behavior).
2. Verification MEASURED, not claimed:
   - `& .\.venv\Scripts\python.exe -m pytest -q` → exact count (baseline 434/434);
   - `& .\.venv\Scripts\ruff.exe check --select F .` → exact count (baseline 0).
3. Summary in `.opencode/handover_task_to_planner.md` (overwrite): files mapped
   (one line each), findings + TODO IDs, measured counts, commit hash(es),
   "Not TODO-ified (and why)", honest deviations, LAST line = verbatim gauge.
4. Committed (TODO.md + summary + any fix commits, each fix its own commit).
   Do NOT push.
5. Do NOT touch `.opencode/handover_planner.md`, no live probes, no
   `playground/` changes, no doc/README/WIKI wording changes.

## Conventions
- Sign convention: `-key` = pressed, `+key` = released, `^key` = toggle.
- pwsh shell (not git-bash) — read agents_repo.md `Environment & shell` before
  running commands. Python = `& .\.venv\Scripts\python.exe` only.
- Mocked-`FakeFST` test pattern only — NEVER run live listeners.
