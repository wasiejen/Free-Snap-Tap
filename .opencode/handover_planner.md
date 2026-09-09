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

## 09-10 correction + v2.4 LIVE (supersedes the 09-09 single-fire reading — same evidence, wrong target)

- **ROOT CAUSE (maintainer 09-10, cache discipline):** `experimental.chat.system.transform`
  fires on EVERY LLM BUILD — proven by context-meter.log (per-turn fires, seconds apart in
  live sessions). v2's `output.system.push()` and v2.3's per-build system/prompt mutations
  therefore changed the prompt on EVERY build = prompt-cache invalidation every turn — the
  slowdown / looping / "corruption" the maintainer observed was a CACHE problem, not a
  hook-problem: **the "only session-start fire" reading (09-09 proof-start claim above, then
  maintained) was a misread — the trigger always worked; the injection targeted the wrong
  place (the system prompt, which the cache forbids mutating).**
- v2.3 (this cycle's edit) REJECTED before a single restart — same root cause. The maintainer
  line-421 experiment (`chat.message` key on the transform body) proves the hook KEY in the
  returned object IS the trigger — the callback body must match the hook's payload shape
  (transform body on a chat.message payload = no-op, not a drop-in).
- **v2.4 LIVE (`.opencode/plugin/handover.ts`, restored top-level from the deactivated copy):**
  trigger = `chat.message` (maintainer-tested: fires EVERY message turn); target = the
  JUST-RECEIVED LAST MESSAGE — append-only: one NEW TextPart (`ctx: <peek line>`, SDK TextPart
  shape) pushed onto `output.parts`; NEVER touches the system array or any existing part →
  the cacheable prefix stays byte-stable. Evidence log: per-fire kind `chatmsg`; gauge-failure
  vocabulary unchanged + new reason `parts-not-array`. Loader NON-RECURSIVE (context-meter's
  log froze when its .ts moved into a child folder; deactivated/ + probes/ child files stay
  inert) ⇒ the plugin file must live TOP-LEVEL.
- TODO.md #31: root-cause + design record (same facts as here).
- PROOF START pending (maintainer restart — do not start until run): fresh opencode start →
  next user message carries a `ctx: CTX=...` chunk appended INSIDE the just-received user
  message; number advances turn over turn; speed sane (no more cache invalidation). v2.4 has
  NO session-start system item — first-turn coverage depends on chat.message firing before the
  first LLM build (unproven timing; self-peek covers precision regardless).

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
5. [ACTION — right after the v2.4 restart] v2.4 PROOF START: maintainer restarts opencode
   (v2.4 file live top-level; v2.3 copy + context-meter stay OFF — their child-folder
   deactivation IS the deactivation). After ≥2 user messages, confirm from my OWN prompt: a
   `ctx: CTX=...` chunk appended INSIDE the just-received user message, advancing turn over
   turn — and report back the observed numbers (vs my own peek) before planning any Tier 2
   context hooking (de-peek TODO #30 then re-baselines on the per-fire call cost).

## Context budget
Per AGENTS.md: `& .\.venv\Scripts\python.exe .opencode\ctxgauge\peek.py` (from repo root); stop
line REM ≤ 15 k or ≥ 85 % (see the 09-10 correction block above — v2.4 state). v2.4: the `ctx:`
reminder arrives APPENDED to the last-received message per turn (chat.message — the 09-09
"session-start only" line was the misread); reminder-not-control unchanged (TODO #18) —
self-peek remains the precise fallback (drifts with peek.py's DB read; the injected number and
peek's are two moments apart).

## Log base (measurement)
plugin.log line count at LAST measurement = **1269** — STALE and UNUPDATED on purpose:
refreshing it needs a log read, which is held by the maintainer constraint (MAINTAINER CALL 1).
Do NOT treat 1269 as current; if call 1 is taken, the segment base is whatever count that read
records FIRST.
