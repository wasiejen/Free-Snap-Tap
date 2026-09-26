# Proposal — unify compact_memory + context_recovery into one compaction behavior

**Status: awaiting approval** (2026-09-26, planner-21, plan21 — filed at the
maintainer's 14-26 request: "integrate compact_memory and context_recovery
to have the same behavior of both compactions and no further doubling.
No sugarcoating.")

## Problem (measured evidence)
Incident 2026-09-26_14-26 (priority.md observation): the R3 worker
(`worker_Q3S_245K_slow`, ses_f22a9f87) hit its context wall mid-build;
control flow correctly returned to the planner, but `context_recovery`
then did three wrong things:
1. **Double compaction path**: it compacted the session on its own trigger
   (it is the emergency backstop, so far OK) — but it is a SEPARATE
   implementation of the same compaction behavior as the `compact_memory`
   tool.
2. **Independent resume**: on verified success it `promptAsync`-ed a
   reload directive and RESUMED the worker while the planner was active →
   two active sessions on the single model slot (the "orphaned worker"
   ping-pong; the maintainer stopped it by restarting opencode).
3. **Agent/model reset**: the resumed session carried
   `agent=planner_Q3S_170K` + `model=Qwen3.8-27B-Q3S-170K` (verified in the
   DB) — the DEFAULT, not the session's own `worker_Q3S_245K_slow` /
   245K-slow. Every step needed a full prefill (the maintainer measured
   4+ min per thinking+tool-call) because the agent switch invalidates
   the cache.

Root cause: `context_recovery.ts` is **self-contained by design** (the T5
constraint — it may not import `compact_memory.ts`, which would pull tool
registration into a hook-only plugin). Its config reader / budget store /
cap resolver / summarizer-pair resolution / v1 `session.summarize` call /
COMPACT-line writer are "small local duplicates of the tool's fail-open
patterns (the tool's file is the source of truth — keep them in step)" —
and they DRIFTED: it does not supply the session's own providerID/
modelID the way `compact_memory` does, and it does a resume that
`compact_memory` (SELF path) delegates to the auto-resume unit-4 flow.
Two hand-synced copies of one behavior = exactly the doubling the
maintainer wants gone.

## Design (three independently approvable parts)
**A. Shared compaction core (the unification).** New plain module
`.opencode/plugin/compaction_core.ts` — no tool registration (satisfies
T5 the same way `intercept_observer_core.ts` already does for the
observer): the config reader (`compact_budget.json`), the shared budget
store + cap resolver (model_budget map, CPU denied, emergency-1), the
keepTokens/keepMessages resolution (#99 computed-primary / budget
fallback), the summarizer-pair resolution **carrying the session's own
providerID + modelID** (the fix for the default-agent bug), the v1
`session.summarize` call, the ctx.log COMPACT-line writer, and the
verified-success handling (budget increment + line). Then:
- `compact_memory.ts` (the tool) = thin wrapper: arg validation +
  SELF/CROSS routing → core.
- `context_recovery.ts` (the hook) = limit trigger + per-fire budget check
  → core.
One behavior by construction; the hand-synced duplication disappears.

**B. context_recovery compacts ONLY — it never resumes.** Drop the
`COMPACTION_RELOAD_DIRECTIVE` promptAsync from context_recovery entirely.
Its job = make a limit-stuck session RESUMABLE (compact + budget +
COMPACT line), then hand control back. The resume is owned by the
auto-resume unit-4 flow (planner sessions: the liveness-watchdog
recovery path; worker sessions: the planner's `task_id` resume per
protocol — the same path this incident's dead R3 worker should have
taken). No independent resume vehicle inside the backstop.

**C. Equivalence pin (drift guard).** A probe section pinning that BOTH
entry points (the tool's SELF/CROSS and the hook's fire) resolve the
SAME summarizer pair + budget semantics for the same session/model
(same pattern as the R3 S31 equivalence pin against the block_transfer
rule) — so the two wrappers can never silently diverge again.

## Acceptance
- Standard gate green; the new probe pins (core exports + the equivalence
  check) pass.
- LIVE (the maintainer's restart — the proposal builds against the
  current state where `context_recovery` is DEACTIVATED in
  `compact_budget.json` and autoCompact 98% of 240k is armed): an
  emergency fire at the limit produces (a) ONE COMPACT line, (b) NO
  `promptAsync` from context_recovery (verified: no resume lines in
  auto_resume.log / ctx.log attributable to it), (c) the session's
  agent + model UNCHANGED (verified in the DB), (d) the unit-4 flow /
  the planner resumes per protocol — i.e. the 14-26 incident cannot
  recur.

## Notes
- Part B alone would have prevented the incident (no double-active
  session); Part A alone would have prevented the agent/model drift
  (single summarizer resolution). Both are needed for "same behavior,
  no doubling"; C is the guard that keeps them there.
- No FST product code, no auto_resume.ts change (unit-4 stays as-is —
  it is the designated resumer); the re-enable of context_recovery
  IS the live acceptance.

--comment: A,B and C accepted. good work :-)

Planner verdict (2026-09-26, plan23): BUILT — all three parts LANDED
(worker-23 `worker_Q3S_245K_slow` ses_f2176db5affeHupTUDVa5cZ0vR): Part A
`218a2c1` (NEW `compaction_core.ts` — the shared config/budget/cap/
keepTokens(#99)/summarizer-pair(session-own providerID+modelID)/summarize/
COMPACT-line/success-handling core; `compact_memory.ts` thin wrapper,
dump + queued-message stay tool-local), Part B `d9d93f8`
(`context_recovery.ts` imports the core; `COMPACTION_RELOAD_DIRECTIVE` +
the promptAsync resume REMOVED — grep-verified zero; the hook compacts
only), Part C `88f902f` (probe S32 equivalence pins 338-340: core surface,
same summarize body from both entry points, cap-semantics equivalence
incl. the hook's auto-consumed emergency-1 + no-prompt). Gate: probe
340/340, smokes 74/74 + 17/17 (+ auto_resume 139, io 77, bt 123+64, submit
20), pytest 459+1w, ruff F=0. REMAINING (maintainer): the
`emergencyRecovery` re-enable in `compact_budget.json` = the live
acceptance, + the live-fire observation at the next limit hit (the 14-26
incident must not recur: one COMPACT line, no promptAsync, agent+model
unchanged, unit-4 resumes).
