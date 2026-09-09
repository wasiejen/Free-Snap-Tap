# HANDOVER PLANNER — Phase 6: opencode planner/worker workflow (Tier 1 + Tier 2)

FIRST read `AGENTS.md` (orientation, conventions, commit routine — do NOT edit AGENTS.md
directly), `TODO.md`, and this file. House rule: when something is unclear, ASK EARLY.

## Cycle start 2026-09-10 — first planner session under the new prompts (ff86d9b)

- The new agent-prompt reorg is LIVE (planner prompt + `prompt_agent_task.md` + `AGENTS.md`
  split into repo-agnostic / `agents_repo.md` + `.opencode/agent_feedback.md` optional
  friction file — all `ff86d9b`). THIS session is the planner side of the first test; the
  worker side was tested by delegating TODO #2 (see below).
- **TODO #2 CLOSED (`cdbbdcd`, verified by planner):** ruff F baseline is now **0 findings**;
  suite **434→434** (13 warnings, same profile — the `globalPos` refs at TODO #10 shifted
  535/549 → 535/547 by the deleted lines, baseline intact). Lint baseline home = this file:
  **ruff F = 0 (2026-09-10)**.
- **Worker flags from the first prompt-test cycle** (spec-template fixes, each a one-liner
  for the maintainer; recorded 2026-09-10):
  a) *Self-hash chicken-egg:* the spec asked TODO #2 "CLOSED with the commit hash" inside
  the same commit — impossible (a commit can't contain its own hash). Worker resolved per
  repo precedent (#13/#28): closed in-tree with a self-reference, hash known from `git log`.
  Template fix: say so explicitly (or mandate the two-commit variant).
  b) *DoD tension:* goal (0 findings) vs suggested scope (the 6 sites) conflicted when the
  instructed deletion cascaded (`fst_overlay.py`: removing `cube_distance_down` also deaded
  `cube_distance`; diff was 7 lines). Worker resolved goal-first — correct. Template fix:
  make explicit the goal (clean baseline) outranks the site list.
  c) *`agent_feedback.md` path:* worker reported the file "doesn't exist" — it does
  (`.opencode/agent_feedback.md`, added by `ff86d9b`); the worker looked at the repo root
  because BOTH prompt templates reference it without a path. Fix: name the full path in
  both prompts.
- `SCRATCH_PAD.md` dirty (+25 lines, maintainer scratch) — worker correctly left it
  uncommitted; it is not part of any agent commit.
- Open MAINTAINER CALLS unchanged (1–4 in the block below); next action stays **build v2.5**
  on call 4 (lean: option a) or on instruction.

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

## v2.4.1 LIVE + v2.5 NUDGE LADDER spec (2026-09-10 — supersedes the v2.4 LIVE block above)

- **v2.4's first live fire was a schema error, now fixed (v2.4.1):** `Session.updatePart`
  rejected the pushed part — id `text-ctx-…` (must start `prt`) + EMPTY messageID (must start
  `msg`). Root cause (scoped evidence: this cycle's `chatmsg` lines in plugin.log, 2-line reads
  only — the standing no-dig constraint stays intact, see #32): the LIVE `chat.message` input
  has NO `messageID` — it carries only `{sessionID, agent, model}`. v2.4.1 (LIVE at
  `.opencode/plugin/handover_v2.4.ts`; the old buggy `handover.ts` top-level copy is deleted,
  file renamed by the maintainer's deactivate-restart flow): part id `prt-ctx-<randomUUID>`;
  messageID from `output.message.id` (primary) / `input.messageID` (fallback); invalid id →
  skip + `gauge` line `invalid-messageID`; `chatmsg` evidence extended with `midSource`.
- **Proven live-clean by maintainer restart 2026-09-10:** user messages carry the `ctx: CTX=…`
  line (visible in the maintainer's TUI), opencode.log shows ZERO new SchemaError lines after
  the fix (log mtime 07:39 local pre-dates the 07:40 messages — nothing new written).
  Proof-start requirement satisfied → this NAP replaces NEXT-STEPS 5.
- **v2.5 auto-nudge ladder — APPROVED by maintainer call 2026-09-10 (see #32):** unsupervised
  agents get no mid-run context signal (chat.message covers user messages only). Design:
  nudges fired from `tool.execute.after` (in-flight), rate-limited gauge readouts, via
  `client.session.promptAsync(...)` with a `synthetic: true` text part (queues as the next
  turn at session idle; TUI never renders it as the maintainer's message). Per-session ladder,
  condition pct OR REM whichever first, ≤1 nudge per rung per session: **50 %** (generic) →
  **70 % / ≤30k** → **80 % / ≤20k** (shortly before the 85 % NAP line — wind-down option) →
  **90 % / ≤10k** (critical — commit + NAP now). ALL agents (planner + workers — plugin is
  agent-independent). The chat.message ctx line STAYS.
- **OPEN before v2.5 build (maintainer call 4):** the gauge reads only the MOST-RECENTLY-
  UPDATED session (TODO #18) — a nudge is an action, so its readout must name a session:
  extend the gauge output with the session id, or read per session. See MAINTAINER CALLS.

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
4. **v2.5 nudge target scope** — the gauge reads only the newest-updated session (TODO #18
   caveat; accepted for DISPLAY, not for an action). The nudge must target a session, so
   decide: (a) gauge extended to carry its readout session's id (`SESSION=` line, one read =
   newest session, nudges that session only — cheap, but a quiet worker behind an active
   planner is never read), or (b) per-session readout (one line per session with a finished
   message — every agent watched, heavier read). My lean: (a) — cheapest read, and it tracks the currently-active session (the one actually
   burning context right now); a quiet worker behind an active planner is the accepted blind
   spot (workers self-peek per their prompts — the same #18 caveat, now scoped to an action).
   (b) removes the blind spot but reads every session per gauge hit. Call it before I build
   v2.5 (or tell me to start (a) as-is — it is one extra parse branch, not a flag).

## NEXT STEPS
1. [DONE, this session] v2.2.2 worker proof — worker quoted its own ctx: line verbatim (FOUND
   43423/36%). TODO.md #29 item 4 CLOSED. The proof start is satisfied; nothing further owed.
2. [DEFERRED — maintainer constraint] v1.3 log-growth / kind:gauge tally — do NOT parse
   plugin.log; see MAINTAINER CALL 1 (only a one-shot read, if asked).
3. Tier 2 scoping from the LIVE shapes — written proposal; Tier-2 code waits for a Tier-2 spec.
4. TODO #30 de-peek (node:sqlite gauge) — LOGGED, not started; one cycle (with the v1.3
   start-measurement).
5. [DONE, 2026-09-10] v2.4 proof start + SchemaError repair (v2.4.1) — live-clean by
   maintainer restart (see the v2.4.1 block above); offline probe 3/3 cases + zero new
   SchemaError lines.
6. [ACTION] **Build v2.5 auto-nudge ladder** (approved spec in the v2.4.1 block + TODO #32):
   `tool.execute.after`-gated `promptAsync` synthetic nudges, ladder 50 % → 70 %/30k →
   80 %/20k → 90 %/10k, per-session ladder, rate-limited readouts, `kind:"nudge"` evidence
   lines (silent otherwise — the log-growth discipline from the v1.x skip set applies).
   BLOCKED ON MAINTAINER CALL 4 (nudge target scope a/b) — start on the call, or (a) if told
   to. Probe: extend the bun probe (fake client + fake shell), then one maintainer restart +
   a forced high-readout scenario to watch the first nudge land.

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
