# Worker summary — auto-resume UNIT 2 fix: live `session.status` shape mismatch

Worker: `worker-4` (`worker_Q3S_160K`), session `ses_f3b10875effejORbTCmqnUVHKM`,
2026-09-21, plan4 (looprun autorun-2026-09-21_15-33).
Task spec: `.opencode/agent/handover/handover_task.md` (committed at `cea5e3b`).
ONE commit on `opencode_test`, parent `cea5e3b` — this summary rides in that same
commit (find it in `git log` by the subject below).

## What changed (all four spec items)

1. **`.opencode/plugin/auto_resume.ts`** — new module-internal
   `statusOf(status: unknown): string | null` (string → as-is; object with a
   string `type` → that `type`; else null). `armEvent`'s `session.status`
   branch uses it: `"busy"` arms (unchanged behavior/log line), `"idle"` sets
   idle (unchanged), any other vocabulary (retry/interrupted/unknown/null) →
   no state change, no log line. `keyFields` prints the normalized value
   (`status=busy`), falling back to the old `String(...)` only when
   `statusOf` yields null (no more `status=[object Object]` lines).
2. **`.opencode/plugin/tests/auto_resume.smoke.mjs`** — `statusEv` now emits
   the LIVE object shape `{ type: <s> }` (all existing Unit 2 checks now pin
   the live shape); ADDED ONE dual-shape acceptance check: a STRING-shape
   `"busy"` event still arms (`arm=` line) + fires `trigger=` for a ≥0.85
   session (new sid `ses_u2_str`). Sid added to the live-log `smokeSids`
   invariant list.
3. **Surface report**
   (`.opencode/agent/knowledge/opencode-plugins/auto-resume-unit1-surface-
   report.md`) — appended `## LIVE ACCEPTANCE supplement — plan4
   (2026-09-21; planner-measured, worker-4 fix)`: (a) the live `{type}`
   shape + the string-mock gap + the fix; (b) `create=function` live verdict
   (log line 148832); (c) Unit 3 LIVE ACCEPTANCE PASSED (17:00Z evidence).
4. **`TODO.md` #75** — Unit 2 status: shape bug found in live acceptance +
   fixed (this commit); live re-acceptance PENDING the next host restart.
   Unit 3 status: LIVE ACCEPTANCE PASSED (17:00Z evidence).

## Measured verification (verbatim)

- **Full smoke suite (every `*.smoke.mjs` in `.opencode/plugin/tests/`):**
  - auto_resume.smoke.mjs: `AUTO_RESUME_SMOKE: ALL PASS (40/40)`
    (39 → 40: the new dual-shape check)
  - block_transfer.sandbox.smoke.mjs: `ALL PASS (52/52)`
  - block_transfer.smoke.mjs: `ALL PASS (22/22)`
  - compact_memory.smoke.mjs: `ALL PASS (47/47)`
  - context_recovery.smoke.mjs: `ALL PASS` (countless format)
  - ctx_gauge.smoke.mjs: `ALL PASS (3/3)`
  - gauge_core.smoke.mjs: `ALL PASS` (countless format)
  - intercept_observer.smoke.mjs: `ALL PASS (39/39)`
  - loop_log.smoke.mjs: `ALL PASS (24/24)`
  - submit.smoke.mjs: `ALL PASS (20/20)`
- **Standard gate:** probe `PROBE handover: 235/235 PASS`;
  pytest `459 passed, 1 warning in 2.10s`; ruff `All checks passed!`
  (F=0). Matches the HEAD-`504105a` baseline exactly; smoke 39→40 is the
  only delta.

## Deviation from the spec (noted, per design)

- The pre-existing fail-safe smoke check asserted a hardcoded
  `calls.length === 2` ("count unchanged"); with the new dual-shape send
  the legitimate baseline is 3. I changed the assertion to a snapshot
  taken just before the fail-safe section (`cBeforeFail`) — same semantics
  ("no send from the fail-safe scenarios"), now count-independent. No
  check was weakened.

## Deliberately NOT done

- **Live re-acceptance of the Unit 2 trigger is PENDING the next host
  restart** — the live plugin instance still runs the old build until the
  host picks up this commit (expect `arm=`/`saturation=`/`trigger=` lines
  after that; recorded in TODO #75 + surface report).
- No probe pin added (spec DO-NOT-touch: the probe pins no auto_resume event
  shape — and none was needed).
- No changes to Unit 3 spawn code, the 5s tick funnel, the `spawned` map,
  trigger-file logic, or Unit 2 constants (threshold 0.85, once-per-cycle
  budget) — shape handling only.
- NOT committed (pre-existing dirty files outside this task, left as found):
  `.opencode/agent/agent_feedback.md`, `.opencode/maintainer/ideas/ideas.md`,
  `.opencode/loop/autorun-2026-09-21_15-33/loop_log.md`.
- Observation (no action needed): `block_transfer.sandbox.smoke.mjs` was
  flagged "pre-existing red / out of scope" in TODO #75's Unit 3 close —
  it is now GREEN (52/52) on this run; whoever fixed it should close that
  todo_inbox entry (2026-09-21) at curation.
