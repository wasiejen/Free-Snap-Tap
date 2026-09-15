# TASK — live acceptance of compact_memory (worker self-compact + resume)

Worker: `worker_Q4_120K`. One goal, two phases (pre-compact / post-resume).

## Goal
Prove the compact_memory fix LIVE on this host (the NAP's pending live
acceptance): a real self-compact must produce (a) a compaction part in the
DB, (b) the `time_compacting` flag set on the session row, (c) the reload
directive attached to the compaction summary, (d) budget increment 1/3 +
COMPACT line — and the planner's resume protocol (same sessionID via
`task_id`) must let you continue from committed state.

## Verified facts (planner-measured 2026-09-13 — do NOT re-research)
- The tool is registered + ACTIVE on this host (maintainer launch message).
  Firing it compacts the session and the session ENDS after the compaction;
  the reload message is attached to the summary (maintainer Q&A:
  `maintainer/inbox_planner/context_async_compaction.md`).
- The default (no-args) directive already contains the post-compaction
  pointer: `.opencode/plugin/compact_memory.ts:102`.
- Budget store: `.opencode/temp/compact_budget.json` (per-session count,
  increment-on-success; your model class Q4 → cap 3).
- COMPACT line: `.opencode/temp/ctx.log`.
- Read-only DB helpers (scratchpad, `node <file> <sessionID>`):
  `C:\Users\Wasiejen\AppData\Local\Temp\opencode\compaudit.cjs` (compaction
  parts + user messages) and `sesdata.cjs` (session row incl.
  `time_compacting` + slim message dump). DB: `C:/Users/Wasiejen/.local/
  share/opencode/opencode.db` (the helpers open it `readOnly`).
- Your session id = the `SESSION=` field of the injected `ctx:` line.
- Carried baselines (no re-run needed — this task changes no code):
  probe 98/98, smoke 23/23, pytest 459+1#10, ruff F=0.

## Phase A (before firing)
1. `loop_log` tool: START line (role `worker-1`, model verbatim, your
   session id).
2. Write `handover_task_to_planner.md` marked **PRE-COMPACT CHECKPOINT**:
   your session id, "about to fire compact_memory (no args)", the 4
   acceptance points (a-d) with the exact helper commands, and the note
   "planner resumes the SAME session via task_id after compaction".
3. COMMIT (handover file + loop log line only).
4. Fire `compact_memory` with NO arguments. Do not plan to do anything
   after this call — the session ends.

## Phase B (after resume — same session, planner re-launched you)
5. Follow `.opencode/agent/prompts/agent_readme_post_compaction.md`
   (STEP 1 parallel batch read; files beat the summary).
6. Verify acceptance points (quote measured values VERBATIM):
   - (a) compaction part exists — run `compaudit.cjs <sessionID>`.
   - (b) `time_compacting` set — run `sesdata.cjs <sessionID>` (session row).
   - (c) reload directive text attached to the summary message (quote it).
   - (d) `compact_budget.json` → your session count == 1; last COMPACT line
     in `ctx.log` (quote both).
7. Write the FINAL `handover_task_to_planner.md` (executive summary: a-d
   with quoted evidence, whether the resume worked per protocol — did the
   reload message land, could you rebuild from committed state — commit
   hashes, carried baselines, what you did not do).
8. `loop_log` DONE line (gauge readout verbatim — `ctx_gauge` tool). COMMIT.

## Definition of done
- Committed final summary reporting a-d with VERBATIM measured values
  (not "looks fine").
- Loop log START + DONE lines present for your session.
- Commit scope: handover/loop files ONLY.

## Approval boundary / DO-NOT-touch
- Firing `compact_memory` on your OWN session: explicitly pre-approved
  (it is the task). Read-only DB access via the scratchpad helpers:
  pre-approved.
- DO-NOT-touch: FST product code, `.opencode/plugin/**`,
  `.opencode/agent/prompts/**`, `.opencode/maintainer/**`,
  `opencode.jsonc`, `TODO.md` (findings → `todo_inbox.md` instead).
