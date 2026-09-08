# HANDOVER PLANNER — Phase 6: opencode planner/worker workflow (Tier 1 + Tier 2)

FIRST read `AGENTS.md` (orientation, conventions, commit routine — do NOT edit AGENTS.md
directly), `TODO.md`, and this file. House rule: when something is unclear, ASK EARLY.

## Current state (2026-09-08, post-restart proof session — result in)
- **v2.2 live result: the `ctx:` line is NOT FOUND in worker OR planner prompts**
  (`TODO.md` #23 — maintainer call: transform scope for subagent invocations vs accept
  lineless). Evidence this start (whole `.opencode/plugin.log` = the start segment; first
  line 18:26:38Z): the hook fires EVERY turn — final tally **104 `kind:"transform"` lines**,
  all the LIVE shape `{sessionID, model:{…}}` (no agent id — #14 confirmed live); the worker
  child session logged 23–35× for ITS transforms. Both my prompts scanned (this planner, the
  delegated worker — zero `ctx:` items). **Root cause undetermined — two candidates:**
  (i) `gaugeReadout()` silently fails live (spawn/shell/3000 ms timeout/non-`CTX=` output —
  failure is UNLOGGED by design; the pre-fix `peek.py` crash of #21 — now a proven silent-failure
  branch on every session's first in-flight turn; **fixed directly by the planner at
  `b8ea40b`** — fallback to the newest finished message + explicit JSON model-id parse),
  or (ii) opencode drops transformed-system mutation at subagent calls (or all calls).
  **v2.2.1 evidence-log task IN FLIGHT** (kind `"gauge"` per failed readout; probe extended) —
  one restart resolves the branch.
- **NEW WORK MODE (maintainer call, post-proof-cycle):** agents get more freedom — the
  planner does small obvious fixes directly (rule of thumb: diff ≤ ~15 lines and ≤ 3 files,
  no heavy runs), workers fix local bugs IN SCOPE instead of TODO-logging them (TODO.md =
  OPEN items + one-line fix records), task specs = goal + definition of pass + SUGGESTED
  procedure (worker deviates and notes it). Prompts updated at `b8ea40b` — note THIS session
  still runs the old planner text. This cycle's task is the first under the new worker text —
  watch the worker summary for whether the freedom helps or harms (flag for the maintainer).
- **Maintainer config change at `0bd75bf` (after the previous NAP):** `opencode.jsonc` gained
  a `Looprunner` primary agent (Gemma 4-12B, all permissions denied, prompt = "start the
  planner repeatedly"), worker temperatures now 0.3 (120K) / 0.5 (210K), scratchpad
  reference now a live Windows Temp path. This start's Looprunner experiment spawned 5
  sessions before mine — 4 planner variants (`planner_120k_mtp` ×2, `planner_runner_120k_mtp`
  ×1, one unattributed) + 1 `worker_120K_mtp` child (created 18:32:24Z by a planner
  delegation) — all ABORTED with `MessageAbortedError` (maintainer experimentation; 0
  commits; the first parallel planner delegation — log lines 19/46/93 — spawned the aborted
  worker).
  **MAINTAINER: ignore the Looprunner for now — not working as intended, not running.**
- v1.3 data — START SEGMENT FINAL TALLY (395 lines, mid-~19:05Z; loop not running): events =
   115 in exactly the 7 UNSKIPPED types — `file.watcher.updated` 58, `session.idle` 20,
   `file.edited` 12, `message.removed` 10, `session.created` 7, `session.error` 7,
   `session.deleted` 1 (0 lines of the 10 v1.2-skip types). Plus transform 104, tool.before
   91, tool.after 85. Proposal for the v1.3 call: skip `file.watcher.updated` + `file.edited`
   + `session.idle` (the steady-state noise); keep `message.removed`/`session.*` as signal.
- FST code untouched: **434 passed, ruff 6** — reconfirmed live at commit `6004486`
  (worker proof cycle).

## Live status
- Task 1 (Tier 1): plugin-side DONE and proven LIVE (hook fires every turn, every session);
  the "both" injection is **NOT FOUND in worker AND planner prompts** (TODO #23). Root-cause
  cycle IN FLIGHT = v2.2.1 evidence-log + probe extension (worker task) — ONE opencode start
  after it is read: which readout-branch silently failed (or opencode drops the mutation).
- Task 2 (Tier 2 — custom `handover` tool, compaction hooks, resume aid, permission
  auto-approval): NOT STARTED — starts after the root-cause cycle resolves (the branch it
  lands on changes what Tier 2 builds).

## MAINTAINER CALLS (open — in order)
1. ~~RESTART opencode once~~ — DONE (the 18:26:38Z start).
2. **Worker stop-line rule — draft pending approval** (append to `prompt_agent_task.md`; the
   new prompt already ends the summary with the self-gauge, so only the explicit rule text is
   new): "Stop line (REM ≤ 15k or ≥ 85 %, whichever first): do NOT start new work. Finish the
   current step only if it is small and completes before the line — otherwise stop
   immediately and end with the EXECUTIVE SUMMARY ending on the verbatim `CTX=… REM=… —
   stop-line reached` self-gauge. The planner decides continuation; working past the line is
   a rule violation." — approve / amend / drop.
3. **v1.3 skip-set extension — propose with the segment's final numbers** (tally in Current
   state): skip `file.watcher.updated` + `file.edited` + `session.idle` (steady-state noise:
   58/12/20 of the 115 event lines this start); KEEP `message.removed` + `session.*` as
   signal. Approve / amend.
4. ~~Looprunner during delegations~~ — maintainer: ignored (not running, not working as
   intended).

## NEXT STEPS
1. v2.2.1 worker returns → verify commit + baselines + probe before/after, integrate,
   bookkeeping commit. THEN ask the maintainer for the one opencode start.
2. After the start: read `kind:"gauge"` lines + a worker's ctx-quote → root cause = {spawn/
   shell problem, 3000 ms timeout, non-CTX output (preview says which — peek.py output
   visible there), system-not-array, ok+injected (→ #23 false alarm), or zero gauge lines
   AND line still missing → opencode-level transform-drop, escalate}.
3. Then: **Tier 2 scoping from the LIVE shapes** — written proposal, decisions are the
   maintainer's; no Tier-2 code before a Tier-2 spec exists.
4. Bookkeeping hygiene: the mirror file (`.opencode/handover_task_to_planner.md`) is the
   worker's in its cycle; if still dirty at my bookkeeping moment, commit it with the
   plan-state (stable by then).

## Context budget
Per AGENTS.md: `& .\.venv\Scripts\python.exe .opencode\ctxgauge\peek.py` (from repo root).
Stop line REM ≤ 15k or ≥ 85 % — wrap up BEFORE the line. Self-run peek until the
planner-side `ctx:` injection itself is observed (proven only for workers so far).
