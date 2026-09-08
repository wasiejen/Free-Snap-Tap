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
- **Mid-cycle maintainer config edit (live `opencode.jsonc`, uncommitted):** Looprunner
  COMMENTED OUT (his "ignore" call implemented by him); my planner `permission` now
  `edit:"allow"` + bash allow + webfetch allow (work-mode call implemented by him; the old
  `edit` deny-map with the `/tmp/**` pattern is gone — TODO #25 moot pending his commit).
  Takes effect at the next opencode start; my live process still runs the start-time config.
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
- **v2.2.1 delivered (`23b06ed`)** — gauge-failure evidence logging: `kind:"gauge"` line per
  failed readout (reasons `shell-missing` | `timeout` | `no-ctx-output` (+`preview` ≤ 120 —
  also carries spawn-error text, the vocabulary's spawn-gap recorded #27) | `system-not-array`);
  success path byte-identical, SKIP-SET untouched. Probe before 23/23 → after 28/28 (S4 4→9
  shapes); FST baselines held (434 / ruff 6, worker re-verified). Planner direct fix in the
  same cycle: unused `GAUGE_CMD` const removed (#28, default-approved cleanup) — probe
  re-verified 28/28 by the planner. Worker's FIRST cycle under the relaxed prompts — flag:
  spec framing neutral-to-helpful, nothing obstructed (helped/harmed watch = OK so far).
- **MAINTAINER DECISION REVIEW (this session):** three standing rules codified in the PLANNER
  PROMPT (`74f6f02`): (1) default-approval — obvious non-FST-behavior / docs / cleanup changes
  need no call, just do; (2) decision bundling — max 2-3 items per message, each with a short
  recommendation; (3) TODO ownership — planner organizes; entries land only when the work
  cannot happen now (call needed / blocked / awaiting data). #15 call: workers do not touch
  the plan file (worker-prompt clause + deny scope @ `6523406`) — TODO #26 closed #15 + #25.

## Live status
- Task 1 (Tier 1): plugin-side DONE, LIVE-proven v2.2 **and** v2.2.1 evidence logging
  (`23b06ed`); the "both" injection is still **NOT FOUND in worker AND planner prompts**
  (TODO #23). Root cause = the next opencode START is the read itself: that segment's
  `kind:"gauge"` lines name the branch — spawn error (preview carries the error text) /
  timeout / non-`CTX=` output (preview shows the raw, incl. python traceback) /
  system-not-array / NONE at all AND line still missing → opencode-level transform-drop,
  escalate. (TODO #27 holds this exact call for after the start.)
- Task 2 (Tier 2 — custom `handover` tool, compaction hooks, resume aid, permission
  auto-approval): NOT STARTED — starts after the root-cause cycle resolves (the branch it
  lands on changes what Tier 2 builds).

## MAINTAINER CALLS (open — in order)
1. **opencode RESTART — the proof start** (TODO #27). One action: it (a) is the read of the
   root cause for the missing `ctx:` line, (b) activates his own `6523406` config
   (worker deny scopes incl. `handover_planner.md`, Looprunner off, planner edit:allow +
   bash + webfetch) and the codified prompts (`74f6f02`). Takes effect at next opencode
   start; this live process still runs the start-time config.
2. **Worker stop-line rule — draft pending approval** (append to `prompt_agent_task.md`; the
   new prompt already ends the summary with the self-gauge, so only the explicit rule text is
   new): "Stop line (REM ≤ 15k or ≥ 85 %, whichever first): do NOT start new work. Finish the
   current step only if it is small and completes before the line — otherwise stop
   immediately and end with the EXECUTIVE SUMMARY ending on the verbatim `CTX=… REM=… —
   stop-line reached` self-gauge. The planner decides continuation; working past the line is
   a rule violation." — approve / amend / drop.
3. **v1.3 skip-set extension — proposed with the segment's final numbers** (tally in Current
   state): skip `file.watcher.updated` + `file.edited` + `session.idle` (steady-state noise:
   58/12/20 of the 115 event lines this start); KEEP `message.removed` + `session.*` as
   signal. Approve / amend. Land on disk AFTER the proof start so that segment stays v2.2.1-only;
   the following start then measures the v1.3 profile (TODO #17 pattern — decide with data).
4. ~~Looprunner~~ — maintainer: ignored (not running, not working as intended); he also
   commented it out in the live `opencode.jsonc` (config-edit bullet above).
5. **Deferred FST behavior calls** (post-plugin, bundles of 2-3 — see Maintainer's rules):
   #11 contradiction prevention (off-by-design vs re-enable), #8 `ap`/`ar` semantics,
   #7 empty-macro comment vs behavior, #6+#4 dead-code deletion, #9 except-harden, #1 vk-error
   surfacing (channel call). Default-approved meta/docs work is NOT here — it just gets done.

## NEXT STEPS
1. Worker v2.2.1 returned (`23b06ed`), verified (commit on branch, tree clean apart from
   the mirror + the maintainer's untracked research note `.opencode/plugin/context meter via
   plugin hook.md` — left alone deliberately; NOT committed, not deleted — his call if he
   wants it versioned). Bookkeeping commit = this file + GAUGE_CMD removal + mirror.
2. **MAINTAINER: opencode RESTART** (the proof start, MAINTAINER CALL 1). Nothing else
   needed from him this cycle; calls 2 (stop-line draft) and 3 (v1.3) are ASKED IN CHAT now.
3. After his start: read the start segment's `kind:"gauge"` lines + scan MY prompt for a
   `ctx:` item → root-cause branch per Live status Task 1 → close/advance TODO #23/#27.
4. v1.3 approval → spec the one-line-per-type SKIP-SET worker task → worker → the FOLLOWING
   start measures the v1.3 profile (TODO #17 pattern).
5. TODO hygiene (planner-owned, default-approved): dedupe the `260908-0951` copied block
   (its 1→#4 dup, 2→#5 resolved, 3=coverage-state record kept as #4 context, 4→#6+#7),
   close #14 (superseded by #18 'both'), #13 header-label refresh when `handover.ts` is
   next touched, #21 v2-schema note stays parked.
6. Then: **Tier 2 scoping from the LIVE shapes** — written proposal; Tier-2 code waits for
   a Tier-2 spec.

## Context budget
Per AGENTS.md: `& .\.venv\Scripts\python.exe .opencode\ctxgauge\peek.py` (from repo root).
Stop line REM ≤ 15k or ≥ 85 % — wrap up BEFORE the line. Self-run peek until the
planner-side `ctx:` injection itself is observed (proven only for workers so far).
