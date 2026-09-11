# TASK — loop.log protocol (prompt-only): `agent_readme_loop.md` section + 3 prompt reference lines

FIRST read `AGENTS.md`, `agents_repo.md`, and this file. Source of the
protocol: maintainer inbox `2026-09-11_02-03` (in `maintainer/done/`) — a
looprun-level activity log so the loop (and the maintainer after the fact)
can see who ran when, on what. Planner ruling (NAP iter-2 block): implement as
a SEPARATE prompt-only task — the protocol text lives in
`agent_readme_loop.md` (single source of truth), the 3 live prompts get a
SHORT REFERENCE LINE ONLY — reference, never restate (AGENTS.md
§Role-and-interaction-model rule: prompts reference shared sections by name).
This is **meta-only** work: no FST code, no plugin, no observable behavior
change — pre-approved class.

## The protocol (what the section must specify)
- **Log location:** ONE file per looprun, in that looprun's autorun archive
  folder — `.opencode/archive/autorun-<YYYY-MM-DD_HH-MM>/loop_log.md` (append
  only; created on first write).
- **Three line types** (fields the maintainer named — pick ONE consistent
  line format for all three and show an example in the section):
  - `START` — written by looprunner, planner, and worker, each at its own
    session/task start: `date_time`, `session_id`, `agent_model`,
    task-oneliner.
  - `RETURN` — written by planner and looprunner, each when a sub-agent
    returns: same triple (date_time, the returned agent's session_id,
    agent_model).
  - `DONE` — written by EVERY agent on task completion, additionally carrying
    the final gauge readout (`<CTX>%/<REM>K` — verbatim from the gauge
    command, never guessed).
- **Discipline:** append-only; no curation of this file; a dead session loses
  at most its unfinished tail; the `session_id` is the `SESSION=` field of
  the injected `ctx:` line. Keep the section SHORT (≤ ~30 lines).

## Edits (exactly 4 files)
1. `.opencode/system_prompts/agent_readme_loop.md` — add a `## Loop log`
   section (placement: after `## Autorun archive` — the two sections share
   the autorun folder; or another fitting spot, your call) specifying the
   protocol above.
2. `.opencode/system_prompts/agents/prompt_agent_planner.md` — ONE short
   reference line pointing at the Loop-log section (e.g. inside the
   Instruction-index or the Autonomous-mode block — where it reads naturally).
3. `.opencode/system_prompts/agents/prompt_agent_task.md` — ONE short
   reference line (same rule).
4. `.opencode/system_prompts/agents/prompt_agent_looprunner.md` — ONE short
   reference line (same rule).

The reference lines must NOT restate the protocol (no field lists, no line
formats) — one sentence max each, naming the section.

## Out of scope
- Do NOT create `loop_log.md` now — the protocol takes effect from the NEXT
  autonomous run (the current run predates it; the section's example line
  shows the shape).
- No `TODO.md` / `todo_records.md` changes; no other files; root `AGENTS.md`
  is agent-read-only.

## Definition of done
1. `agent_readme_loop.md` carries the `## Loop log` section: location, the
   three line types with the maintainer's fields, the verbatim-gauge rule for
   DONE, the append-only discipline, and one example line per type.
2. Each of the 3 live prompts carries exactly ONE new short reference line;
   a grep for the protocol field names (`task-oneliner`, `RETURN`, `DONE`) in
   the three prompt files returns 0 hits (reference only, no restate).
3. Gate re-run (meta-only, must be unchanged): `& .\.venv\Scripts\python.exe
   -m pytest -q` = **448 passed** + 1 known #10 warning;
   `& .\.venv\Scripts\ruff.exe check --select F .` = **0**.
4. ONE commit: the 4 files + your summary file. Commit message: one-line
   imperative subject.

## Context gauge / stop line
Per AGENTS.md §Context budget — self-gauge `node .opencode\plugin\scripts\peek.mjs`
between chunks and after the commit; stop line `REM ≤ 15k` or `≥ 85 %`.
Findings you cannot fix in scope → APPEND to `todo_inbox.md` (never
`TODO.md`).
