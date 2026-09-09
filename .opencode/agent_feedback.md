# agent_feedback.md — agent friction log

This file collects *independent* observations from agents about friction in
their own working situation — rules, prompts, tools, limits, or conventions that
slowed them down, caused doubt, overthinking, or wasted context. It is for the
**maintainer only**, to improve the agent setup. It is not read by other agents
during their work.

## How to append (for agents)
- Append **only** when friction materially affected the work AND your main task
  is complete AND the token budget allows. Never interrupt work to write here.
- Append **without reading prior entries below the divider** — your report must
  be your own independent signal, not influenced by what other agents wrote.
  Duplicates across agents are fine (they are stronger signal); the maintainer
  dedups. You may read only the header/template above the divider to use the
  format; do not read entries below it before appending.
- Use this structured format (one block per entry):

  ### <short title> — <role> <date>
  - **Friction:** what rule / file / limit / tool caused the problem
  - **Cost:** what it cost (context, time, a wrong path, doubt / overthinking)
  - **Suggested change:** a concrete improvement (if you have one)

## What's worth reporting
- A rule that forced overthinking or doubt where a simpler directive would do.
- A convention that conflicted with the code or with another instruction.
- A handover format that was ambiguous and caused re-exploration.
- A limit (context, tool) that blocked a reasonable action.
- Anything that made you spend tokens on bookkeeping instead of solutions.

## What's NOT for here
- Bugs in the repo's own code (→ `TODO.md`).
- Feature requests or design opinions about the product.
- Routine venting with no friction item or suggested change.

---
Entries below this divider. Agents: do not read below this line before
appending your own entry.

### Delegation slots serialize parallel workers - planner 2026-09-10
- **Friction:** `.opencode/handover_task.md` + `handover_task_to_planner.md` are single slots — two workers cannot run in parallel (summary file + one commit lane collide), and the spec file is overwritten per cycle.
- **Cost:** a queued docs task sat behind the plugin/curation workers while one worker was idle; spec history exists only in git, not in a live file a next delegation could cite by entry.
- **Suggested change:** allow suffixed slots per concurrent delegation (`handover_task_<slug>.md` + matching summary file), OR a "spec-in-prompt" mode where the delegation prompt carries the spec and the slot file only holds summaries.

### Gauge number can be another session's at the stop-line - planner 2026-09-10
- **Friction:** the injected `ctx:` line and the self-peek both read the most-recently-updated session — across planner/worker delegation cycles the displayed number is often a WORKER's context, not mine (this session: nudged number jumped 76% → 63% → 83% across different sessions).
- **Cost:** the stop-line decision (REM ≤ 15k / ≥ 85%) must be made on a number I cannot fully trust → either end conservatively (wasted budget, early stops) or risk overrun; both outcomes feel like rule noise.
- **Suggested change:** name the session the gauge read (`SESSION=` line — already the lean in the call-4 (a) ruling, rides with the v2.5/#33 gauge work); until then treat any displayed number lower than mine as a lower bound.

### Summary-file double contract during maintainer format experiments - planner 2026-09-10
- **Friction:** the slot's contract "file = latest EXEC summary, replaced per task" collided with the maintainer's live format test sitting UNCOMMITTED in that same file — worker specs needed an extra guard clause ("preserve uncommitted content verbatim") to survive.
- **Cost:** extra spec line + a worker status-check branch per task that could otherwise run the default; this cycle the guard worked (content preserved), but the ambiguity is visible in the spec.
- **Suggested change:** settle one rule: `handover_task_to_planner.md` = latest summary only (older ones live in git); maintainer format experiments go in a separate scratch file so the worker contract never faces a dirty shared slot.

