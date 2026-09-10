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
