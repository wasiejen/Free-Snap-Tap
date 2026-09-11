# PROPOSAL — Compaction lifecycle: self-compaction tool + informed overflow recovery (2026-09-11, planner)

Design agreed in chat with the maintainer 2026-09-11 (session
`ses_f6fd8a0caffedqEYeUMCq0x12f`), built from his
`proposals/maintainer/inbox_planner/draft/compact_memory/2026-09-11_13-44.md`
(generic sketches) + today's compaction experiments. Supersedes the
deferred defect pair (nudge delivery — **moot, nudge deleted**; ctx.log
event markers — **included here**) and the custom-tool go/no-go in
`2026-09-11_plugin-scope-tool-rename.md` (this IS the first custom tool;
the gauge tool would follow the same in-process pattern if still wanted —
that proposal's rename item stays open on its own).

## Problem / evidence
- An agent at the context ceiling has NO way to free context — the only
  protocol response was stop + handover (work halts until a fresh session).
  Observed: planner run 2026-09-11 hit 91 %/10K and stopped at the stop line.
- `handover.ts` (v2.8) does neither auto-inject anything after compaction
  nor log the compaction event — the gap in ctx.log (`96%/4K` → `50%/59K`
  with nothing between) shows the event is invisible.
- Blind emergency compaction (opencode.json defaults) has no knowledge of
  the working context — it cuts what the agent was operating on.
- Repeated compaction degrades (summary-of-summary); compaction cannot heal
  a behavioral loop (Pattern 4: compressed context makes loops more
  likely).
- Agent knowledge split: it has CONTENT knowledge of its recent tail (it
  wrote it) but no METERING knowledge (token cost) → it can choose how many
  messages to keep, not how many tokens.
- Revert experiment (same session): an agent whose tail was scrubbed
  showed NO degradation — it behaves exactly like a handed-over session
  (unaware of the last completed action, whose effect is already in the
  world). Tail-cut on overflow ≡ revert ≡ ordinary handover situation.
- Overflow mechanics (maintainer observation): direct run — the context
  error stops execution; sub-agent — the overflow auto-cuts the tail at the
  last tool call/thought block (before any compaction, so no ghost residue
  in the summary), then 4–5 retries, then clean fail back to the looprunner.
- Rebuild profile: system prompt (<10K) + compacted history (keep ≈30K) +
  last 12 messages ≈ 31.7K measured.

## Design — five layers
### L1 Data (always on)
- Keep the v2.8 per-tool readout `(NN%/NNNK)` — it is the sensor.
- ctx.log gains a **tool name** field (free: `tool.execute.after` carries
  it; the plugin already logs it in plugin.log) and a **`COMPACT` line**:
  `date_time <model> COMPACT tokens=<t> messages=<m> (<pre-readout>)` —
  written BY the tool/hook (session id + params; post-compaction size stays
  implicit in the next tool readout, per maintainer).

### L2 Action — `compact_memory` tool (first custom tool)
- `.opencode/tools/compact_memory.ts`, `execute(args, context)`; takes
  **both knobs** `{tokens?, messages?}` passed through to `session.compact`
  `keep` (both exposed so forked sessions can be tested with different
  pairs). `context.sessionId` targets the session (and is logged).
- Return: short result note ("compacted; kept last N messages / T tokens")
  — transient by design (a later compaction absorbs it; the durable record
  is ctx.log) + the re-application directive.
- The tool writes its own COMPACT line (in-process file append, no
  permission system in the way) and **refuses when the session budget is
  exhausted** with "hand over and start fresh" (routes into the existing
  stop-line/handover protocol).

### L3 Decision — standing trigger rule (nudge deleted)
- The compaction trigger lives in the role prompts as a standing rule, not
  as an injected message: **≥80 % with a big unit ahead → `compact_memory`
  before starting it; ≥90 % → compact now, keep back to the task spec.**
- No message channel → no delivery mechanism → the nudge busy-skip defect
  dies with the nudge. Readout = data, rule = decision, tool = action.

### L4 Recovery — single path for sub-agent AND direct run
- On overflow (`session.error`): plugin compacts with **informed keep**
  (gauge trajectory → preserve the working tail; better than opencode.json
  defaults) + injects the re-application directive as a synthetic message +
  retries. The re-prefill is paid once and is the SMALLER one
  (post-compaction) — the accepted trade. Works for sub-agents too: the
  cut-tail state ≡ a handed-over session, so continuing is legitimate and
  cheaper than a fresh restart.
- **Compaction budget: ≤2 per session id (self + emergency combined),
  enforced by the plugin's per-session sqlite state.** Rationale:
  summary-of-summary degradation; a looping agent must be STOPPED by the
  budget (clean fail → loop.log `-WARNING` with failed session id →
  looprunner restarts fresh, better spec/worker), not healed.

### L5 Activation flag
- Emergency recovery path on/off by config (maintainer's `opencode.jsonc`):
  OFF during the experiment phase (hard-death-at-overflow is the visible
  failure mode), ON for production loop-runs and lower-quant models with
  less self-discipline. L2/L3 (tool + rule) are independent of the flag.

## Re-application directive (committed file, pointer-referenced)
The directive does NOT embed the file list — it points at a committed file
so protocol changes (e.g. loop.log v2) never require a code change:
`.opencode/system_prompts/post_compaction_reapply.md`, content:

```
POST-COMPACTION RE-APPLICATION — read this first, act after.
You have just been compacted. Your system prompt (role + AGENTS.md) is intact.
All on-demand instruction files read earlier are OUT of context, and the
compaction summary is a LOSSY compression — protocol details (formats, paths,
commands, baselines) must be re-applied from the files, never from the summary.
STEP 1 — Re-read ALL of these files now, in ONE parallel batch:
  agents_repo.md
  .opencode/system_prompts/repo/repo_map.md
  .opencode/system_prompts/repo/repo_commands.md
  .opencode/system_prompts/repo/repo_testgate.md
  .opencode/system_prompts/repo/repo_gotchas.md
  .opencode/system_prompts/agent_readme_proposals.md
  .opencode/system_prompts/agent_readme_todo.md
  .opencode/system_prompts/agent_readme_loop.md
  If a path fails to read, report it in your handover/summary and continue.
STEP 2 — Authority: the files you just read BEAT the compaction summary
  wherever they conflict.
STEP 3 — Rebuild working state from COMMITTED state per AGENTS.md
  (git log + the state file for your role) — not from the summary.
STEP 4 — Your context-budget readout is stale post-compaction; run the gauge
  (repo_commands.md) and check the stop line before starting new work.
STEP 5 — If you notice yourself repeating similar actions after this
  compaction, STOP and hand over (Pattern 3) — compaction does not heal loops.
Then continue the current task.
```

## Build cycles
- **Cycle 1 (core):** re-application file + `compact_memory` tool (both
  knobs, result note, directive pointer, COMPACT line, budget check) +
  ctx.log tool-name field + standing trigger rule in role prompts.
- **Cycle 2 (recovery):** plugin `session.error` hook (informed keep,
  synthetic directive injection, shared budget, over-budget clean fail,
  activation flag default-OFF) + `-WARNING` line verification on a real
  sub-agent overflow.

## Open empirical tests (gate the claims)
1. Does a post-stop async injection trigger a full re-prefill? (time +
   tokens; direct-run case) — flagged needs-testing by the maintainer.
2. `keep.tokens` vs `keep.messages` semantics (which binds): forked-session
   test with different param pairs via the tool.
3. Verify the sub-agent overflow sequence (tail cut → 4–5 retries → clean
   fail visible to the looprunner) so `-WARNING` fires on it.
4. Tool file-append works in-process + budget enforcement across self +
   emergency compactions.

## Acceptance
- Cycle 1: a forked session self-compacts with explicit params; ctx.log
  shows the COMPACT line (session, params, pre-readout); the agent follows
  the re-application file and resumes from committed state; suite + probe
  green (no FST code touched).
- Cycle 2: an induced overflow in a sub-agent → informed compaction +
  directive → continuation OR (budget exhausted) clean fail + `-WARNING`;
  flag OFF reproduces hard-stop; re-prefill cost measured (test 1).

**Status:** awaiting maintainer approval. Recommendation: approve Cycle 1
now (unblocks the stop-line ceiling and your fork experiments), Cycle 2
after test 1's answer. On approval: retire
`2026-09-11_plugin-scope-tool-rename.md` item 1 (custom tool) — the rename
item survives there; folder moves stay maintainer-side.
