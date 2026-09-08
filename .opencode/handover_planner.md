# HANDOVER PLANNER — Phase 6: opencode planner/worker workflow (Tier 1 + Tier 2)

FIRST read `AGENTS.md` (orientation, conventions, commit routine — do NOT edit
AGENTS.md directly: edit a copy, the maintainer replaces), `TODO.md`, and
`.opencode/prompt_agent_planner.md` (process rules for the planner/worker split).

House rule: when something is unclear, ASK EARLY.

## Current state (2026-09-08, checked against HEAD `65dcebf` + uncommitted worker v2 edits —
the same edits ship in this handover's commit; stamp = last clean commit the planner
reviewed, see worker status bullet below)
- Tier 0 (planner/worker prompts + handover layout + scoped planner edit
  permission) is DONE: `e9da3ef` (layout + prompts + `opencode.jsonc`), `9e9c8b6`
  (docs adapted to the two-party commit routine + archive protocol), `fe06faf`
  (archive + this plan).
- FST code baselines unchanged since Phase 5: **434 passed**, ruff **6 findings**,
  coverage per `archive/260908-phase5-coverage.md` (Phase 5 = DONE, ceiling reached).
- NOTE: the old stamp said `9e9c8b6` — it lagged `fe06faf` by one commit
  (planner session 2026-09-08); no content discrepancy.

## Live status (2026-09-08)
- **Task 1 (Tier 1 plugin) — v1 + v1.1 DONE, live DoD COMPLETE**:
  - v1 static `924c2b0`; live DoD closed by the v1.1 delegation cycle (call
    `P6sRew7hVYZteQh8eEFr4xqQQ8DgpTF`) — all 4 post-restart checklist items
    answered from `plugin.log` (see v2-evidence section below).
  - v1.1 flood filter **`773e1ae`** — `SKIP_EVENT_TYPES =
    {"message.part.delta"}` (98% of live lines/bytes were token-stream deltas;
    maintainer flagged the growth at ~10 min in). Probe 7/7, 434 passed, TODO
    #12 (my spec off-by-one, worker-caught) + #13 (v1 label, cosmetic) appended.
    **Effective at next opencode START** — current session still streams deltas
    into the log (expected; log is scratch + gitignored, deletable anytime).
  - **Task 1 v2 (ownership) — worker-landed 2026-09-08 (handover task):** task gate +
    pre-flight warn + summary mirror + ctxgauge injection; offline probe 19/19, 434
    unchanged; TODO #14 (design flag: transform payload exposes no agent identifier → line
    omitted + payload evidence-logged as kind `transform`) + #15 (instruction tension)
    appended. Details + verbatim evidence: `.opencode/handover_task_to_planner.md`.
    PLANNER-VERIFIED at `2a4996c` (git + EXECUTIVE SUMMARY agree). Lanes
    note (TODO #15): the pre-commit plan-state routine overrides "worker must
    not touch the NAP" — worker may stamp + add ONE status line in its own
    commit; substantive planning stays with the planner.
  - Task 2 (Tier 2) — UNLOCKED (v1 proven in use). v2 spec landed `65dcebf`; v2 worker
    delegated 2026-09-08 — DoD verification cycle next (below).
- **v2 payload map (v1 evidence — design inputs, all observed live)**:
  - task args at `before`/`after` = **`{description, prompt}` — no `subagent_type`**
    in hook payloads (v1 probe's `subagent_type` was fabrication) → v2
    `before-task` validation cannot read the worker choice from args; worker
    attribution only via `event` payloads (`agent`, e.g. `planner_120k_mtp`).
  - `after` metadata = `{parentSessionId, sessionId, model:{providerID,modelID},
    truncated}` — **worker session id reachable**; output field carries the
    worker final message (v2's deterministic mirror source).
  - `plugin.added` ×45 = one burst at session start (provider-catalog
    registration), not repeats — not a filter candidate.
  - `experimental.chat.system.transform` payload shape NOT yet probed — v2
    worker must read it in `.opencode/node_modules` + probe offline.
- **MAINTAINER**: restart opencode ONCE to activate v1.1 + v2 together
  (proof: quiet log + `transform` evidence lines + `warn` shape); commit or
  revert your `opencode.jsonc` edit (+`/tmp/**` planner scope — uncommitted,
  untouched here); AGENTS.md dirt resolved by your `d2de01b`.
- **NEXT SESSION (post-restart) — v2 proof protocol:** ① delegate a small
  handover task whose spec OMITS the "worker writes the summary" line →
  `handover_task_to_planner.md` must be written BY THE PLUGIN (mirror DoD);
  ② check whether the `ctx:` gauge line appears in MY system context (if not,
  the `transform` evidence lines in the log show why — TODO #14); ③ scan the
  fresh log: `transform` lines settle the agent-identifier question, `warn`
  lines prove the pre-flight; ④ THEN start Tier 2 (custom handover tool,
  compaction hooks, resume aid, permission auto-approval) — it builds on the
  v2 live shapes, not guesses.

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
