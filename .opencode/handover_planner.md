# HANDOVER PLANNER — Phase 6: opencode planner/worker workflow (Tier 1 + Tier 2)

FIRST read `AGENTS.md` (orientation, conventions, commit routine — do NOT edit AGENTS.md
directly), `TODO.md` (#14/#16/#17 carry the plugin evidence), and
`.opencode/prompt_agent_planner.md` (process rules).

House rule: when something is unclear, ASK EARLY.

## Current state (2026-09-08, HEAD `f3063be`)
Session resuming: two handoff-interrupt recoveries on 2026-09-08 (context limit).
Rebuilt from git log + old NAP `fa8aacc` + this session's live log evidence:

- **v1.2 (log-growth fix) LANDED `f3063be`** — skip set now 10 event types (v1.1's
  `message.part.delta` + the 9 cascading UPDATE types measured at 63 % of steady-state
  bytes); writer byte-identical; v2 regression 19/19 + new probe scenarios pass,
  434 passed / ruff 6. **GOES LIVE AT THE NEXT OPENCODE START.**
- **v2 summary mirror PROVEN plugin-owned (proof ① done this session):** the v1.2
  task file explicitly instructed the worker to write its summary to
  `handover_task_to_planner_worker.md` only and NOT touch the canonical file; the worker
  recorded + verified its SHA256 `41E6CE80…70F` unchanged at commit; after the task end the
  plugin overwrote the canonical file with opencode's RAW task-result payload — it carries
  the `<task id=… state=…><task_result>…</task_result></task>` wrapper (no truncation
  trailer). **Expect that wrapper in the canonical file from now on** — the worker's own
  copy (no wrapper) is the `_worker.md` file for this cycle.
- **Proof protocol ②+③ CLOSED by this session's live-log evidence** (the old-profile log
  up to the v1.2 start — quantified in TODO #17): `transform` payload = `{sessionID,
  model:{…}}` — **no agent identifier** (45 evidence lines, kinds transform recorded). So
  the `ctx:` gauge line did NOT arrive in planner context — v2's gate never matched (it was
  written to omit-when-unclear by design: never inject-for-all). `warn` lines: none (spec
  file present → pre-flight correctly silent ✓). task `tool.before`/`tool.after` captured ✓.
- **Found + archived the interrupted session's uncommitted artifact:** a FULL spec for
  **plugin v2.1 — graph-based session discrimination** (was `handover_task.md`, uncommitted
  when that session died at the context limit). Now at
  `.opencode/archive/260908-v21-session-graph-spec.md`. Design: a `childSessions` set
  (registered from every `task` `tool.execute.after` `metadata.sessionId` + every
  `session.created` event) becomes the transform gate — inject ONLY root (planner) sessions,
  the agent-prefix check stays as a zero-cost secondary guard; ≤1 leaked gauge line per
  child is a known residual. Adopting v2.1 = TODO #14 closed structurally + gauge lines in
  PLANNER context (completes the Tier 1 DoD) + Tier 2 builds on v2.1's state; rejecting it
  = injection dropped-by-design (recorded), Tier 2 builds on v2 only. → **MAINTAINER CALL
  1 below.**
- FST code untouched: **434 passed**, ruff **6**, coverage per `archive/260908-phase5-*.md`.

## Live status (2026-09-08)
- **Task 1 (Tier 1 plugin):** v1 `924c2b0` + v1.1 `773e1ae` + v2 `2a4996c` done & LIVE-
  PROVEN (mirror ✓ this session, pre-flight ✓, transform evidence ✓); v1.2 `f3063be`
  offline-verified, **live proof pending one start**; v2.1 SPEC ARCHIVED — maintainer call 1.
- **Growth diagnosis (the maintainer's complaint — solved on paper, live check pending):**
  old-profile log measured ≈0.9 KB/s sustained (571 KB in 5 min over the delegation cycle);
  `message.part.updated` 43 % + `message.updated` 20 % + `session.updated` 9 % cascade (v1.2
  skips all of it); worker-session events ≈ 47 % of a delegation-cycle log; residual
  unfiltered types `file.watcher.updated` (×41) / `file.edited` (×7) / `session.idle` (×1)
  seen live → **v1.3 candidate after post-start measurement (TODO #17)** — decide with data.
- **Task 2 (Tier 2):** NOT STARTED — wait for call 1: builds on v2.1 (graph state) if
  adopted, on v2 only if rejected (then ctx-injection = dropped by design; the Tier 2 item
  list is unchanged — custom `handover` tool, compaction hooks, resume aid, permission
  auto-approval).

## MAINTAINER CALLS (open — answer in order)
1. **v2.1: adopt or reject?** (spec archived + summary note at Current-state).
2. **RESTART opencode** — activates v1.2. Live proof to expect: new-session log contains
   ONLY `session.created`, `transform`, `warn`, `tool.before/after` (+ unseen types); growth
   collapses from ≈0.9 KB/s. If v2.1 was adopted AND delegated before the restart, it lands
   in the same start.
3. Post-start session measures the v1.2 profile → **v1.3 call** (silence the `file.*`
   residual — likely top residual after this).
4. Carried-over maintainer calls: TODO #4/#6 (coverage triage 117 + 302–303), #7 (empty-
   macro comment), #1 (vk resolution), #2 (the 6 lint findings).

## Context budget
Per `AGENTS.md` §Context budget: `.opencode\ctxgauge\peek.py`; stop line REM ≤ 15k or
≥ 85 % — wrap up BEFORE the line. Note: until v2.1 lands the planner receives no auto-`ctx:`
  gauge lines in-system — always self-run the peek (that is exactly the #14 gap).
