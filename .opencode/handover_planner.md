# HANDOVER PLANNER — Phase 6: opencode planner/worker workflow (Tier 1 + Tier 2)

FIRST read `AGENTS.md` (orientation, conventions, commit routine — do NOT edit AGENTS.md
directly), `TODO.md`, and this file. House rule: when something is unclear, ASK EARLY.

## Current state (2026-09-09 — v2.2.2 PROOF START SATISFIED: worker + planner both carry the ctx: line)

- **Proof start (the v2.2.2 opencode restart) is SATISFIED by PROMPT EVIDENCE — no log read
  (maintainer constraint, below):**
  - Planner (THIS session's own system block) carries the injected item
    `ctx: CTX=13837 (12%) REM=106163`.
  - Worker (one-shot `worker_120K_mtp` sub-session) quotes its OWN prompt verbatim:
    `ctx: CTX=43423 (36%) REM=76577`.
  - ⇒ the transform fires at EVERY SESSION START (root planner AND each worker sub-session),
    and — MAINTAINER-CONFIRMED 2026-09-09 — ONLY there: it fires at session creation / the
    first round of actions, and does NOT re-fire per turn WITHIN a session. Consequence (the
    #18 reminder-not-control caveat, now behaviorally confirmed): the number does not move
    during a session's own run — long sessions / workers self-peek when precision matters
    (the prompts say so) — and a worker's number = the last-updated session's snapshot, i.e.
    the planner session's last message (peek.py takes no session id). Drift evidence: this
    start 13837 vs 28557 @0560ecf vs worker 43423 — and the worker's 43423 matches the
    planner's OWN peek at worker-creation, corroborating the snapshot read.
  - The secondary "expect ZERO new kind:gauge failure lines" check was NOT run — but a failed
    readout never produces an injected line, so the line being PRESENT in BOTH prompts already
    entails readout-ok. The log tally is NOT measured (constraint, below).

- **MAINTAINER CONSTRAINT (2026-09-09 — standing, do NOT re-open unasked):** do NOT parse /
  work on `.opencode/plugin.log`. The v2.x "why is ctx: missing" diagnosis re-parsed it and
  LOOPED (maintainer counts 4-5 times). Consequence: the v1.3 log-growth measurement (old-
  profile ≈0.9 KB/s → v1.3 expected ≈79 % event-line cut) and the kind:gauge tally are
  UNMEASURED this start. To take the log profile again = MAINTAINER CALL 1 below — ONE
  scoped, one-shot read, only if he asks. The electron→terminal background (TODO #29) stands;
  the v2.2.2 root-cause fix already landed and is proven by the present ctx: line.

- Carried, unchanged from the 09-09 NAP: de-peek TODO #30 (node:sqlite gauge in handover.ts)
  is LOGGED, not started — its landing re-baselines the gauge host + the v1.3 profile, so
  plan landing + the v1.3 start-measurement as ONE cycle, not two.

## Live status
- Task 1 (Tier 1): DONE + root-caused + **PROOF START SATISFIED** (planner AND worker ctx:
  present — TODO.md #23/#27/#29-item-4 all closed). No further work owed by Tier 1. The v1.3
  log-growth CONFIRMATION is DEFERRED by the no-log-read constraint — it is not a blocker for
  Tier 2 (the v1.3 skip-set fix is already in handover.ts; only its live byte-ratio is unmeasured).
- Task 2 (Tier 2 — custom handover tool, compaction hooks, resume aid, permission
  auto-approval): NOT STARTED — scoping from the live shapes (written proposal); Tier-2 code
  waits for a Tier-2 spec.

## MAINTAINER CALLS (open — in order)
1. **v1.3 log-growth confirmation** — the ONE measurement the no-log constraint defers. Want
   it? = ONE scoped, one-shot read of the retained plugin.log's post-base segment (expect
   the three now-silent types at 0 and ≈79 % event-line drop). Default: SKIP unless you ask.
2. **Deferred FST behavior calls** (post-plugin; present ≤3 per message): #11 contradiction
   prevention, #8 ap/ar semantics, #7 empty-macro comment vs behavior, #6+#4 dead-code
   deletion, #9 except-harden, #1 vk-error surfacing. Default-approved meta/docs work is NOT
   here — it just gets done.
3. **TODO #30 de-peek (node:sqlite)** — plan as one cycle (re-baselines the gauge host + the
   v1.3 profile); NOT started; do not start before call-2 batches unless requested.

## NEXT STEPS
1. [DONE, this session] v2.2.2 worker proof — worker quoted its own ctx: line verbatim (FOUND
   43423/36%). TODO.md #29 item 4 CLOSED. The proof start is satisfied; nothing further owed.
2. [DEFERRED — maintainer constraint] v1.3 log-growth / kind:gauge tally — do NOT parse
   plugin.log; see MAINTAINER CALL 1 (only a one-shot read, if asked).
3. Tier 2 scoping from the LIVE shapes — written proposal; Tier-2 code waits for a Tier-2 spec.
4. TODO #30 de-peek (node:sqlite gauge) — LOGGED, not started; one cycle (with the v1.3
   start-measurement).

## Context budget
Per AGENTS.md: `& .\.venv\Scripts\python.exe .opencode\ctxgauge\peek.py` (from repo root); stop
line REM ≤ 15 k or ≥ 85 %. The injected `ctx:` item now arrives at EVERY session start (planner
+ worker) — and NOWHERE ELSE (no per-turn re-fire — maintainer-confirmed), so self-peek is the
precise-fallback — use it to decide, not the injected reminder snapshot (drifts with peek.py's
DB read; the injected number and peek's are two moments apart).

## Log base (measurement)
plugin.log line count at LAST measurement = **1269** — STALE and UNUPDATED on purpose:
refreshing it needs a log read, which is held by the maintainer constraint (MAINTAINER CALL 1).
Do NOT treat 1269 as current; if call 1 is taken, the segment base is whatever count that read
records FIRST.
