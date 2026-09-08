# HANDOVER PLANNER — Phase 6: opencode planner/worker workflow (Tier 1 + Tier 2)

FIRST read `AGENTS.md` (orientation, conventions, commit routine — do NOT edit AGENTS.md
directly), `TODO.md`, and this file. House rule: when something is unclear, ASK EARLY.

## Current state (2026-09-08, post-restart proof session)
- **v2.2 is LIVE-PROVEN at this start.** The start segment (whole `.opencode/plugin/plugin.log`,
  gitignored — first line ts 18:26:38Z matches commit `0bd75bf`; nothing newer yet exists).
  Transform hook fired **42×** across **6 sessions**, every payload the LIVE shape
  `{sessionID, model:{…}}` — no agent identifier, exactly what the offline probe S4 shape 1
  validated. Planner-side injection proven (log + offline S4); **worker side IN FLIGHT**:
  the proof task delegated to `worker_120K_mtp` (spec = current `handover_task.md`) — quotes
  its own `ctx:` line verbatim + reports the newest transform line in the log (child-session
  evidence).
- **Maintainer config change at `0bd75bf` (after the previous NAP):** `opencode.jsonc` gained
  a `Looprunner` primary agent (Gemma 4-12B, all permissions denied, prompt = "start the
  planner repeatedly"), worker temperatures now 0.3 (120K) / 0.5 (210K), scratchpad
  reference now a live Windows Temp path. This start's Looprunner experiment spawned 5
  sessions before mine — 4 planner variants (`planner_120k_mtp` ×2, `planner_runner_120k_mtp`
  ×1, one unattributed) + 1 `worker_120K_mtp` child (created 18:32:24Z by a planner
  delegation) — all ABORTED with `MessageAbortedError` (maintainer experimentation; 0
  commits; the first parallel planner delegation — log lines 19/46/93 — spawned the aborted
  worker).
  ⚠ parallel handover delegations would clobber the mirror — if this ever runs under
  concurrent planner instances, the proof task's DoD breaks.
- v1.3 data (post-start, under the v1.2 skip set), segment tally at 18:47Z: events = 59:
  `session.idle` 19, `file.watcher.updated` 16, `message.removed` 10, `session.error` 7,
  `session.created` 6, `session.deleted` 1 — residual event types = exactly those 6 (the
  10 v1.2-skip types: 0 lines). Looprunner storm explains the `session.*` counts;
  `file.watcher.updated` = repo/git-index noise. Final numbers after the worker cycle →
  v1.3 call with the maintainer.
- FST code untouched: **434 passed**, ruff **6**, baselines confirmed by the v2.2.1 worker.

## Live status
- Task 1 (Tier 1): plugin-side DONE (v1.2 skip / v2.2 both / #19 comments / #20 probe
  persistence). Worker-side proof IN FLIGHT (see Current state).
- Task 2 (Tier 2 — custom `handover` tool, compaction hooks, resume aid, permission
  auto-approval): NOT STARTED — starts after the proof cycle lands; builds on the live
  shapes now captured in the log.

## MAINTAINER CALLS (open — in order)
1. ~~RESTART opencode once~~ — DONE at the 18:26:38Z start; v2.2 committed before it is live.
2. **Worker stop-line rule — draft pending approval** (append to `prompt_agent_task.md`):
   "Stop line (REM ≤ 15k or ≥ 85 %, whichever first): do NOT start new work. Finish the
   current step only if it is small and completes before the line — otherwise stop
   immediately and end with the EXECUTIVE SUMMARY, ending on a final self
   `& .\.venv\Scripts\python.exe .opencode\ctxgauge\peek.py` run quoted verbatim
   (`CTX=… REM=…` — 'stop-line reached'). The planner decides continuation; a worker that
   keeps working past the line is a rule violation." — approve / amend / drop.
3. **v1.3 skip-set extension — propose with the segment's final numbers** (residual
   `file.*` cascade + `session.idle`; the Looprunner storm skews `session.*` — may wait one
   quiet cycle before deciding).
4. **Looprunner during delegations:** confirm it is paused while a handover task runs
   (this start's parallel planner instances delegated once already — no commit, but the
   mirror would clobber). Ask, do not assume.

## NEXT SESSION / next steps
1. Worker returns → read the summary (mirror + chat message), verify the commit
   (`git log` + `git show --stat`) + baselines, count the worker-session transform lines in
   plugin.log. If the worker QUOTES a `ctx:` line → **Tier 1 complete, both sides live**.
   If NOT FOUND → next task = diagnose `gaugeReadout` (shell present? 3000 ms timeout?
   cwd? — probe S4 covers the shape, live log shows whether the gauge ran).
2. Re-measure the segment (final v1.3 numbers) → present the v1.3 proposal with Call #3.
3. Then: **Tier 2 scoping from the LIVE shapes** — a written proposal, decisions
   go to the maintainer. No Tier-2 code until a Tier-2 spec exists.
4. Bookkeeping hygiene: `.opencode/handover_task_to_planner.md` will be dirty after the
   worker returns (the mirror overwrites it post-commit — expected; committed with the next
   bookkeeping or worker cycle).

## Context budget
Per AGENTS.md: `& .\.venv\Scripts\python.exe .opencode\ctxgauge\peek.py` (from repo root).
Stop line REM ≤ 15k or ≥ 85 % — wrap up BEFORE the line. Self-run peek until the
planner-side `ctx:` injection itself is observed (proven only for workers so far).
