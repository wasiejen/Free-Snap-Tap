# WORKER SUMMARY — compact_memory live acceptance (RESCUED planner-direct)

Worker session `ses_f6765a68bffeudOXmVzLROTYk6` (worker_Q4_120K) executed
Phase A fully (loop START, checkpoint commit `c89646e`, fired
`compact_memory` no-args, session ended after compaction). RESUME via
`task_id` FAILED: `the request exceeds the available context size` — the
post-compact session still exceeds the 120K window. Phase B was therefore
RESCUED planner-direct (planner-1 `ses_f676f6a82ffe960mvrZD9W0DjQ`, the
established T2 rescue pattern): all acceptance points are DB/file facts,
verified below.

## Acceptance results (VERBATIM evidence, measured 2026-09-13)
- **(a) compaction part — PRESENT.** Part `prt_0989b3bb1001BOaL89rlDAXOmT`
  (msg `msg_0989b3bb0001Ofl3cOTgt1kdz6`, t=1789266705329):
  `{"type":"compaction","auto":false}`. Companion assistant message
  `msg_0989b3cca0014UfEP30hIKe0gT` (mode=compaction, agent=compaction,
  summary=true) carries the generated summary text (3649 chars, structured
  Objective/Next Move/Relevant Files — it references
  `agent_readme_post_compaction.md` in its content).
- **(b) `time_compacting` — NULL on the session row** (sesdata.cjs,
  post-completion). Finding: the flag is not persisted after completion
  (transient live flag, or not set for manual compaction) — surfaced to
  maintainer (proposal A, item 2). The compaction PART is the durable
  record.
- **(c) reload directive — PRESENT in the tool output** (verbatim from the
  compact_memory call part):
  `Context successfully compacted: kept last 12 messages / 30000 tokens.`
  + `[SYSTEM CONTEXT DIRECTIVE]` +
  `Context was compacted. Read .opencode\agent\prompts\agent_readme_post_compaction.md and re-read any required task-specific files using read_file before continuing.`
  The summary message is attached to the session (the reload content the
  resumed agent would see). Note: the directive travels in the tool
  response, not inside the DB summary text.
- **(d) budget + COMPACT line — PRESENT.**
  `.opencode/temp/compact_budget.json` (version 2):
  `ses_f6765a68bffeudOXmVzLROTYk6: {count: 1, updated: 2026-09-13T02:31:45.315Z, model: "Qwen3.8-27B-IQ4KT-120K"}`
  `.opencode/temp/ctx.log` line 1701:
  `2026-09-13_04-31 Qwen3.8-27B-IQ4KT-120K COMPACT ses_f6765a68bffeudOXmVzLROTYk6 tokens=30000 messages=12`

## The resume failure (headline finding)
- Resume of the SAME session via the Task tool `task_id` was rejected:
  `the request exceeds the available context size` (opencode.jsonc limit
  for the model = 120K context). The session had 40 messages at fire time
  (heavy prefill). The tool reports keep 12 msgs / 30K tokens, but the
  server's summarize schema carries NO keep key (NAP open question,
  confirmed in practice) → the server likely retained far more than the
  requested keep, so post-compact request = system + (largely) full
  history + summary > 120K.
- Consequence: the codified resume protocol works mechanically (the resume
  call is the right one), but SELF-COMPACTING near the top of the window
  makes the session UNRESUMABLE. Mitigation options → proposal A, item 1
  (lower the worker self-compact trigger well below 80 %, and/or server
  keep support).
- The worker's budget was consumed (1/3) — the session is dead for this
  task regardless.

## Commits
- `c89646e` — worker-1 Phase A checkpoint (START loop line + handover).
- This file + the proposal/NAP/plan1 bookkeeping ride the planner commit.

## Carried baselines (no re-run — task changed no code)
probe 98/98, smoke 23/23, pytest 459+1#10, ruff F=0.

## Deliberately not done
- No retry of the resume (deterministic overflow; burning the worker's
  remaining budget 2/3 on it would not change the server-side keep
  behavior) — surfaced instead as proposal A.
