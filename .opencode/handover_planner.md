# HANDOVER PLANNER — Phase 6: opencode planner/worker workflow (Tier 1 + Tier 2)

FIRST read `AGENTS.md` (orientation, conventions, commit routine — do NOT edit
AGENTS.md directly: edit a copy, the maintainer replaces), `TODO.md`, and
`.opencode/prompt_agent_planner.md` (process rules for the planner/worker split).

House rule: when something is unclear, ASK EARLY.

## Current state (2026-09-08, checked against HEAD `fe06faf`)
- Tier 0 (planner/worker prompts + handover layout + scoped planner edit
  permission) is DONE: `e9da3ef` (layout + prompts + `opencode.jsonc`), `9e9c8b6`
  (docs adapted to the two-party commit routine + archive protocol), `fe06faf`
  (archive + this plan).
- FST code baselines unchanged since Phase 5: **434 passed**, ruff **6 findings**,
  coverage per `archive/260908-phase5-coverage.md` (Phase 5 = DONE, ceiling reached).
- NOTE: the old stamp said `9e9c8b6` — it lagged `fe06faf` by one commit
  (planner session 2026-09-08); no content discrepancy.

## Live status (2026-09-08)
- **Task 1 (Tier 1 plugin) — v1 static DONE, live DoD pending**: worker
  (`worker_120K_mtp`) landed `.opencode/plugin/handover.ts` (113 lines, hooks
  `event` / `tool.execute.before` / `tool.execute.after`, JSON lines ≤2000 chars,
  gitignored `plugin.log`) at **`924c2b0`**; probe-verified offline (Electron
  `RUN_AS_NODE=1` → Node 24.15 — **no node/bun/npx on PATH here**; the offline
  node route is the reusable trick for any future TS probe). 434 passed.
  Payload findings recorded in `handover_task_to_planner.md`: args arrive on the
  `before` hook's `output`, `after` input has `{tool,sessionID,callID,args}` /
  output `{title,output,metadata}`, `event` = `{type,properties}` (session/agent
  from `properties(.info)`).
- **v1 FULL DoD (next session, post-restart)** — one real planner→worker cycle,
  then read `plugin.log` against the checklist in `handover_task_to_planner.md`
  (task args shape, worker final message in `after.output`, sessionID
  correlation, hook-order/event-noise flags, startup health).
- Task 2 (Tier 2) — gated on v1 in-use proven, waiting.
- **MAINTAINER**: restart opencode (plugin loads at start only — NOT hot-reloaded);
  next session does the live cycle. Also: **pre-existing dirty `AGENTS.md` in
  worktree** (mtime 15:44, before `924c2b0`; +`archive/` in the `.opencode/`
  module-map line) — left uncommitted per the copy-and-replace rule; maintainer:
  apply via your normal replacement, or tell us to revert the file. Not done by
  this planner/worker.

## Task 1 — Tier 1: thin handover plugin
Goal: move handover mechanics from model discipline to deterministic code.
Plugin = `.opencode/plugin/handover.ts` — auto-discovered; `@opencode-ai/plugin`
types already in `.opencode/node_modules`; Bun loads the `.ts` directly (no build
step); **restart opencode after every edit**.

v1 — LOG ONLY (build this first, nothing else):
- hooks `event` + `tool.execute.before` + `tool.execute.after`; append one JSON
  line per event to `.opencode/plugin.log`; guard all fs work — never throw out
  of a hook.
- run ONE real planner→worker cycle; inspect the payload shapes: the `task` call
  args (subagent_type, prompt, sessionID), how the worker's final message arrives
  as the task result, session IDs.
- v1 done = `plugin.log` shows a full cycle; opencode start unaffected.

v2 — OWNERSHIP (only after v1 has seen real payload shapes):
- before `task`: verify `.opencode/handover_task.md` exists + non-empty (log a
  warning otherwise).
- after `task`: overwrite `.opencode/handover_task_to_planner.md` from the
  worker's final message (deterministic mirror; the worker prompt keeps writing
  it itself until the mirror is proven, then drop the worker line).
- ctxgauge injection: append the measured context (`ctxgauge/peek.py` via the `$`
  BunShell) to the planner's system prompt via `experimental.chat.system
  .transform` — check the payload first for how to detect the planner agent, to
  keep the peek cost off worker calls.
- v2 done = one cycle where the summary file was written BY THE PLUGIN + the
  gauge line visible in the planner context.

Rules: the delegation itself stays the built-in `task` tool — the plugin
observes and owns files, it never drives the delegation. `plugin.log` is
gitignored (add the `.opencode/.gitignore` entry). `node_modules` stays local.

## Task 2 — Tier 2: orchestration (ENTER ONLY after Tier 1 v2 is proven in use)
- custom `handover` tool (`tool: {...}` hook): one planner call writes the task
  file + records the delegation — less model bookkeeping.
- `experimental.session.compacting` / `autocontinue`: force
  `handover_planner.md` current before the planner's compaction continues.
- resume aid on session start: surface the latest `handover_task_to_planner.md`
  + `git log -3` to a fresh planner.
- `permission.ask` auto-approval for the planner's scoped file set.
- Rationale: it builds on event shapes — don't guess them, wait for the v1/v2
  logs.

## Open maintainer calls (carried over — NOT agent work)
`TODO.md` #4/#6 (reclassify 117 + 302–303 in `COVERAGE_TRIAGE.md`), #7
(empty-macro comment), #1 (vk resolution) + #2 (the 6 lint findings).

## Context budget
Per `AGENTS.md` §Context budget: `.opencode\ctxgauge\peek.py`; stop line REM ≤
15k or ≥ 85 % — wrap up BEFORE the line (writing this file needs ~10–15k).
