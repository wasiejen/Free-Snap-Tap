# P02 — disable the plugin's "summary mirror" (root cause of the 4 handover-file collisions)

**Proposal:** remove the `mirrorSummary` behavior from `.opencode/plugin/handover_v2.4.ts`
(the v2 summary-mirror on `tool.execute.after` for handover Task tools).

**Context:** the mirror's original purpose (avoid "write file + final message" doubling)
was resolved on the worker-prompt side (the worker no longer emits a final summary
message, `52eb0aa`) — but the mirror stayed LIVE and after EVERY Task-tool run
overwrites `.opencode/handover_task_to_planner.md` with the worker's raw final message
(4 confirmed occurrences, agent_feedback s4+s5). Each occurrence costs the planner a
`git checkout --` recovery and risks staging the wrong version into the bookkeeping
commit. Verified in source: `mirrorSummary()` (handover_v2.4.ts ≈296-314) writes the
file verbatim, best-effort, no gate.

**Proposed action:** delete `mirrorSummary` + its call in `onToolAfter` + any probe
check that pins the mirror; keep the `tool.execute.before` spec pre-flight warning.
The worker writes its own summary file — the COMMITTED version is canonical.

**Impact / risk:** collision gone at the source; zero agent-behavior change; probe
baseline 52/52 drops by the number of retired mirror checks.

**Verdict:**
- approved

**Planner verdict (LANDED, iter 5 looprun 2, `adc9965`, planner-verified):**
- Worker `worker_Q4_120K` via the Task tool — **the P01 re-test PASSED** (worker-prompt
  launch survived its first request; `limit.context` is working).
- `mirrorSummary` + the mirror-only `mirrorPath` helper + the unused `writeFileSync`
  import deleted; header v2.7 records the rationale (removed symbol deliberately NOT
  spelled out so the acceptance grep stays 0-hit). KEPT intact: pre-flight warning,
  tool.after logging, nudge ladder, chatmsg ctx line.
- Probe S3 rebuilt **in place** (checks 08/09/10/12 now pin the NO-WRITE behavior =
  P02's regression guard; 11 unchanged) → N stays 52/52. Collateral
  `readMirror() === STALE_SENTINEL` pins in S2 04/05/06 reported, kept (still true +
  meaningful).
- Planner re-ran: probe 52/52 exit 0; pytest 436/1 warning; ruff F=0; commit scope =
  exactly plugin + probe + summary.
- **FUNCTIONAL PROOF PENDING — in-process staleness:** the adc9965-era run still
  clobbered the summary (8th collision) with the raw `<task_result>` dump — the opencode
  process had the OLD plugin code loaded in memory (the worker's edit only takes effect
  from the next process start; the looprunner↔planner↔worker share one process).
  Proof = the FIRST Task-tool run after a FRESH process (maintainer restart of the
  loop) leaves `handover_task_to_planner.md` untouched post-run. If it collides again
  after a fresh process → root cause is the task-tool RESULT channel itself (opencode
  core), i.e. a maintainer-side fix, not the plugin.
- Worker flag (no action): `.opencode/plugin/deactivated/handover.ts` still contains
  mirrorSummary/mirrorPath — deactivated code, removal is a maintainer call.
