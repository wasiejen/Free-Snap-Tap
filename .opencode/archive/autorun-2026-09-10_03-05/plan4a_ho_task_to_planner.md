# EXECUTIVE SUMMARY — loop.log protocol (prompt-only): `## Loop log` section + 3 prompt reference lines

Task: `.opencode/handover/handover_task.md`. META-ONLY (no FST code, no plugin, no
observable behavior change — pre-approved class). ONE commit containing this summary
(subject: "Loop-log protocol (prompt-only): agent_readme_loop.md §Loop log section +
3 prompt reference lines" — hash verifiable via `git log -1`; a commit hash cannot be
embedded in its own commit).

## Changes (exactly 4 files)
1. `.opencode/system_prompts/agent_readme_loop.md` — NEW `## Loop log` section (25
   lines), placed after `## Autorun archive` (shared autorun folder). Specifies:
   - location: ONE file per looprun in the autorun archive folder,
     `.opencode/archive/autorun-<YYYY-MM-DD_HH-MM>/loop_log.md`, append only, created
     on first write; loopruns only (interactive sessions have no log); explicitly
     disambiguated from the looprunner's own `.opencode/loop_log.md`.
   - the three line types with the maintainer's fields in ONE consistent line format
     (`date_time TYPE session_id agent_model <extra>`): `START` (looprunner/planner/
     worker, task-oneliner), `RETURN` (planner/looprunner, names the RETURNED agent),
     `DONE` (every agent, final gauge readout `<CTX>%/<REM>K` — verbatim from the
     gauge command, never guessed).
   - one example line per type; `session_id` = the `SESSION=` field of the injected
     `ctx:` line; discipline: append only, NO curation, a dead session loses at most
     its unfinished tail.
2. `.opencode/system_prompts/agents/prompt_agent_planner.md` — ONE new reference line
   in the Autonomous-mode block (right after the Autorun-archive bullet, since the log
   lives in that folder): "**Loop log:** the looprun activity log — its protocol lives
   in `agent_readme_loop.md` §Loop log."
3. `.opencode/system_prompts/agents/prompt_agent_task.md` — ONE new reference line in
   the Instruction index (after `agent_readme_todo.md`): "`agent_readme_loop.md` —
   §Loop log defines the activity-log lines you write at session start and task
   completion."
4. `.opencode/system_prompts/agents/prompt_agent_looprunner.md` — ONE new reference
   added to its existing Instruction-index bullet for `agent_readme_loop.md`
   ("…the §Loop log protocol, closing + interrupt handling") — the bullet already
   names the file, so this is the single reference point.

All three prompt references are naming-only: no field lists, no line formats, no
protocol restatement (AGENTS.md §Role-and-interaction-model: reference, never restate).

## Verification (measured, post-edit, pre-commit)
- **DoD 2 (no restate):** `rg -n "task-oneliner|RETURN|DONE"` over the three prompt
  files → **0 hits** (exit 1).
- **DoD 3 (gate, unchanged, meta-only):**
  - `& .\.venv\Scripts\python.exe -m pytest -q` → `448 passed, 1 warning in 1.90s`
    (the known #10 warning).
  - `& .\.venv\Scripts\ruff.exe check --select F .` → `All checks passed!` (0 findings).

## Deliberately NOT done (per spec out-of-scope)
- No `loop_log.md` created anywhere — the protocol takes effect from the NEXT
  autonomous run; the section's example lines show the shape.
- No `TODO.md` / `todo_records.md` / `todo_inbox.md` changes; no other files touched;
  root `AGENTS.md` untouched (agent-read-only); `.opencode/loop_log.md`
  (looprunner's own bookkeeping) untouched.

## Findings / notes
- None new. No discrepancies found; the spec's field list was followed verbatim.

## Final gauge (pre-commit, verbatim)
SESSION=ses_f71c98666ffeVIdGbgukcbvm9H CTX=27479 (22%) REM=92521
