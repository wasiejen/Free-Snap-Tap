# TASK: reduce the auto_resume smoke wall-time (his 2026-09-23_00-12)

**Worker:** worker_Q3S_170K (worker-14). **Branch:** stay on the current
checkout (`opencode_test` — verify with `git branch -v`).

## Goal
`.opencode/plugin/tests/auto_resume.smoke.mjs` is slow in wall-time (his
complaint: "for fuck sake" — tests take ~300s). Reduce the wall-time
substantially WITHOUT cutting a single check.

## Definition of done
1. Measured before/after wall-time (`time node
   .opencode/plugin/tests/auto_resume.smoke.mjs`) — the reduction is
   reported with both numbers; target: at least 50 % off, more if the
   profile allows.
2. Smoke still **102/102** (no check removed; wait-MECHANISM changes are
   fine, check SEMANTICS are not).
3. Full gate green: probe 241/241, ALL other smokes, pytest 459+1w,
   ruff F=0.
4. The product change (if any) is DEFAULT-PRESERVING: the live tick stays
   5000 ms; a new factory option (if you add one) must default to the
   current behavior and be test-only in effect.
5. Commits: code + smoke in one commit (imperative subject), TODO.md close
   note + handover + friction in one follow-up commit. Handover to
   `.opencode/agent/handover/handover_task_to_planner.md` (numbers, commit
   hashes, what was deliberately not done).

## Context (bounded reads — do NOT read whole files before grepping)
- Smoke: 1221 lines. The waits: `sleep(5600)` ×7 (L379, 629, 987, 1023,
  1035, 1060, 1176 — "at least one full tick period") + `sleep(200)` (L79).
  Sections: UNIT 2 (L157, cont. L459, scope gate L897), UNIT 3 (L569),
  UNIT 4 (L682, scope L967, (c)+(d) L1042).
- Plugin: `.opencode/plugin/auto_resume.ts` — tick hardcoded at
  `setInterval(..., 5000)` L1215-1217; default-export factory at L1208
  (a NAMED export breaks the smoke — keep default-only, L104).
- First PROFILE: measure the total wall, then which sections dominate
  (time each section or add temporary timestamps — remove them before
  committing). Do not optimize from assumptions.

## Suggested levers (your call — this is a suggestion, not a protocol)
1. Make the tick period a factory option (default 5000 — live behavior
   unchanged); the smoke instantiates with a short tick (e.g. 250-500 ms)
   → the 5.6 s waits collapse.
2. Replace fixed sleeps with polling on the expected log line / state
   (poll every 50 ms, bounded deadline) — faster and robust to tick
   timing.
3. Do NOT parallelize sections unless state isolation is trivially
   preserved (the spy clients are shared/re-factored between sections).

## Discipline (memories — worker-12 died at the context wall)
- Read by SECTION (the line anchors above), not whole files; greps
  output-limited (`| head -30`).
- No long planning-prose turns (worker-12 burned ~34k tokens on two
  planning messages); keep tool-call turns short.
- If you must rewrite a big block, write in ≤ ~8 KB chunks.
- PAUSE + handover early if you approach the stop line (gauge in your
  context); do not die mid-unit.

## Approval boundary
Pre-approved (test-harness performance + default-preserving plugin
option): proceed without maintainer calls. Anything that changes LIVE
plugin behavior (tick default, nudge logic, routing) = STOP and report in
the handover.
