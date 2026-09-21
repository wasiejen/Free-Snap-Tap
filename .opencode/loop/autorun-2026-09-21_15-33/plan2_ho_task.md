# TASK SPEC — auto-resume UNIT 2: context-limit compaction trigger

Worker: `worker_Q3S_160K`. Goal: add the Unit 2 mechanism to the existing
`.opencode/plugin/auto_resume.ts` per the APPROVED proposal — a live session
crossing 85 % of its usable context window queues a self-compact instruction
via `compact_memory` (SELF path), once per busy cycle, unattended.

## Verified facts (planner-verified at spec time — do NOT re-derive)

- Design of record: `.opencode/proposals/approved/2026-09-21_opencode-auto-resume-plugin.md`
  — read the shared-architecture rules (lines 40-51) + the Unit 2 section
  (lines 63-83). Everything else in that file is out of scope.
- Live v1 surface (unit-1 report, read whole — 83 lines):
  `.opencode/agent/knowledge/opencode-plugins/auto-resume-unit1-surface-report.md`
  Key verdicts: `session.compact` = **undefined** (NO host-side compaction
  command exists — the trigger CANNOT use one); `promptAsync` / `message` /
  `app.log` all functions; the event stream is DENSE (per-part updates) —
  filter, don't count raw lines.
- Upstream mechanism to adapt (read §2 only, lines 75-161):
  `.opencode/agent/knowledge/opencode-plugins/auto-resume-deepdive-B.md`
  Token tracking (`lastTokenTotal` OVERWRITTEN per assistant `message.updated`,
  never accumulated); usable window = `context - Math.min(20_000, output ?? 0)`
  from `client.provider.get()` model entries (`limit.{context,output}`),
  cached per `providerID/modelID`, fail-safe null on any missing data/throw
  (skip, no intervention); threshold default 0.85; once-per-busy-cycle budget
  (counter zeroed when a fresh busy cycle arms the session).
- SDK shapes (already grepped, installed 1.18.29):
  `client.session.promptAsync({path:{id}, body:{parts:[{type:"text",text}]}})`
  (`types.gen.d.ts` 2329 — `parts` is REQUIRED; do NOT set `noReply`);
  `client.provider.get()` lists providers → models with `limit` (optional).
- The plugin file (read whole — 117 lines): `.opencode/plugin/auto_resume.ts`
  — Unit 1: event log + one-shot surface probe; state at module level, hooks
  are pure observers that NEVER throw (try/catch swallow), log via
  `appendFileSync` to `.opencode/temp/auto_resume.log`.
- The smoke (read whole — 113 lines): `.opencode/plugin/tests/auto_resume.smoke.mjs`
  — factory invoked with a SCRATCHPAD-sandboxed `{directory, client}` (mock
  client; the live log must stay UNCHANGED — the sandbox dir receives the
  lines). `makeChecker` from `_smoke_base.mjs`; run with plain node, exit 0
  iff green.

## Locked design (WHAT to build; HOW inside the DoD is yours)

Mechanism: since there is NO host-side compaction command, the trigger is a
QUEUED `client.session.promptAsync` — never a synchronous prompt (cache
invalidation → 3-4 min re-prefill, the old ctx_watchdog failure mode). The
queued text instructs the receiving session to call the `compact_memory`
tool NOW with NO sessionID (SELF path) and a 1-3 line continuation message
(what to resume + which head files to re-read), then continue the current
unit per the post-compaction protocol. The text names the measured ratio.

1. **Per-session watch object** (module-level Map keyed by sid):
   `lastTokenTotal` (assistant-role `message.updated` only; tokens from
   `info.tokens ?? props.tokens`, total = `tokens.total` if present else
   input+output+cache.read+cache.write; positive numbers only; OVERWRITTEN),
   the model pair (`{providerID, modelID}` from `info.model ?? props.model`
   when present), the once-per-busy-cycle attempts counter, `lastActivityAt`.
2. **One 5s tick = the only decision+send funnel** (timers `.unref()`-ed;
   the shared architecture rule): events only ARM watch state; the tick
   evaluates every armed watch object. On `session.status` busy → arm the
   session (reset the attempts counter). On idle → the tick decides:
   - skip if `lastTokenTotal <= 0`, or attempts already 1 for this busy
     cycle, or usable window null (model/provider data missing or any throw)
   - else if `lastTokenTotal / usable >= 0.85` → re-entrancy latch + gate
     re-check right before send, then ONE `promptAsync` (latch holds until
     it settles), increment attempts.
3. **Logging**: keep every Unit 1 line unchanged in format; add SHORT
   decision lines (e.g. `arm=`, `saturation=` with ratio, `trigger=`,
   `send-fail=`).
4. **Never throw out of any hook** (Unit 1 discipline); all new state at
   module level; keep the file's Unit 1 shape.
5. NO magic-context check, NO abort escalation, NO subagent special-casing,
   NO aborts, NO NAP/TODO/maintainer-file access — those are Unit 4 / prompts.

## Definition of done (measurable)

- `auto_resume.smoke.mjs` EXTENDED with Unit 2 cases (mock client spying on
  `promptAsync`; a mock `provider.get()` supplying `limit` data):
  1. assistant `message.updated` tracks/overwrites `lastTokenTotal`
     (not accumulated);
  2. idle at ratio < 0.85 → zero `promptAsync` calls;
  3. idle at ratio >= 0.85 → exactly ONE `promptAsync` call whose body text
     carries the ratio and the `compact_memory` self-compact instruction;
     `trigger=` log line present;
  4. second idle in the SAME busy cycle → no second send;
  5. fresh `busy` → `idle` at ratio >= 0.85 → sends again (budget reset);
  6. no model info / provider data missing / usable null → no send, no
     throw;
  7. ALL Unit 1 checks stay green (surface line first, etc.).
  Smoke exits 0; its self-reported count grows accordingly.
- Standard gate green, unchanged expectations: `pytest -q` (459 passed +
  1 warning), `ruff check --select F .` (F=0),
  `node .opencode/plugin/probes/handover_probe.mjs` (235/235 — plugin-only
  change, NO probe pins added in this unit; the smoke is the testbed).
- No product-code (`src/`, `tests/`) changes.

## Approval boundary

Plugin-only change inside the approved proposal's Unit 2 — pre-approved, no
maintainer call needed. Do NOT touch: `src/`, `tests/`, the probe,
`compact_memory.ts`, `.opencode/maintainer/**`, NAP/TODO (your summary goes
to `handover_task_to_planner.md` per protocol; commit code + smoke together).
LIVE ACCEPTANCE (a live session crossing 85 % self-compacting once per busy
cycle, no re-prefill stall) is OUT of scope for this build — the
planner/maintainer runs it after this lands; your smoke must pin the exact
send conditions so that run can be verified from the log.

## Context discipline

Read ONLY: the proposal sections named above, deep-dive B lines 75-161, the
surface report (83 lines), `auto_resume.ts` (117 lines), the smoke (113
lines), `_smoke_base.mjs` helpers as needed. Do NOT re-derive the SDK (the
shapes are above). Greps with output limits.
