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

### Bulk rename: two-stage token vs. prefix collision — worker 2026-09-10
- **Friction:** bulk-renaming `kb_env` → `kb_env_ns`/`kb_env_mouse`/`kb_env_
  plain` across six test files with the edit tool's replaceAll. Direct
  replacement is risky if the tool rescans its own output (the new name
  contains the source token as a prefix), so I used a two-stage token
  (`kb_env` → `ZZ...` → final name). That worked — except in one file the final
  name had ALREADY been written by an earlier edit (`facade_kb(kb_env_plain,
  ...)`), so stage 1 corrupted it to `ZZ..._plain` and needed a corrective
  edit.
- **Cost:** ~3 extra edit calls + a per-file occurrence-count verification
  script + sustained doubt about whether any rename had double-applied
  (≈2–3k context, several minutes).
- **Suggested change:** pin the fact either way: if the edit tool's replaceAll
  is a single pass that never rescans replaced output, say so in AGENTS.md /
  agents_repo.md (direct `kb_env` → `kb_env_ns` is then safe and the two-stage
  dance is skipped); if it CAN rescan, recommend scripting whole-file renames
  as one single-pass substitution (pwsh/node) instead of staged edits.

### Task-tool result channel overwrites the worker summary file — planner 2026-09-10 (session 4)
- **Friction:** after TWO Task-tool runs (`worker_Q4_120K` #33 build + the Q3
  explorer 3a/3b), `.opencode/handover_task_to_planner.md` was left MODIFIED in
  the working tree with the raw `<task id=…><task_result>` dump of the
  subagent's final message — overwriting the worker's committed executive
  summary, AFTER the worker had already committed it.
- **Cost:** one recovery step per run (`git checkout -- <file>`), a dirty tree
  at the point I wanted to commit my own bookkeeping, and a real risk of
  staging the wrong version into the planner commit.
- **Suggested change:** the result channel should not write the handover path
  (or the worker prompt should note that its summary file gets clobbered
  post-commit and the committed version is canonical — the planner prompt
  should carry the restore step as a standing post-Task-tool rule).

### NAP rewrite lost design blocks that TODO entries reference — planner 2026-09-10 (session 4)
- **Friction:** TODO #30's "Full design" pointed at NAP blocks
  (`## v2.4.1 LIVE + v2.5 NUDGE LADDER spec` + `## Live status`) that no longer
  existed — lost in the session-3 NAP rewrite. The design of record had to be
  re-established from the TODO entry + re-stated in the task spec.
- **Cost:** discovery time + an explicit discrepancy flag + a self-contained
  spec that duplicates the TODO text.
- **Suggested change:** when rewriting the NAP, keep (or move to
  `.opencode/archive/`) any block that a TODO entry references by name; or
  keep durable design specs in dedicated files (not the per-handoff NAP) and
  have TODO entries reference those files.


### Task tool depth-blocked for the loop-runner-launched planner — planner 2026-09-10
- **Friction:** the planner's `task: allow` permission is useless while the
  looprunner launches the planner via the Task tool: spawning a worker hits
  `Subagent depth limit reached (1)` (default `subagent_depth` = 1; the planner is
  already depth 1). The fallback is CLI launch (`opencode run --agent <name>`),
  which the planner prompt/agents_repo do not document for this architecture.
- **Cost:** one failed Task attempt + config re-verification + writing the mechanic
  into the NAP by hand; every future delegation cycle must remember the CLI route.
- **Suggested change:** add `"subagent_depth": 2` (top-level) to `opencode.jsonc`
  (makes the Task tool work for the planner in-loop), OR document the CLI launch
  mechanic in `prompt_agent_planner.md`/`agents_repo.md` as the in-loop delegation
  path. (Carried to the maintainer in the session-3 closing message too.)

### Worker runs die from context overflow with no checkpoint — planner 2026-09-10
- **Friction:** both worker runs this session (gemma explorer 128k endpoint; Q4 120k)
  died/failed mid-task on context limits; the Q4 run died on
  `context_length_exceeded ... context shift is disabled` (500) after an hour of
  disciplined chunked reads — with ZERO findings written to disk. The worker prompts'
  stop-line rule (REM ≤ 15k) cannot trigger if the request 500s first: there is no
  "checkpoint findings to disk after each verified finding" rule for long audits.
- **Cost:** ~1.5 worker sessions lost; the one genuinely valuable finding
  (`remove_all_callbacks` mismatch) survived only because the planner re-verified it
  from the CLI transcript.
- **Suggested change:** for audit/exploration tasks, add to the worker prompt (or the
  task spec): "after EACH verified finding, write it to TODO.md immediately (a
  checkpoint is the unit of work — a dead session must lose at most one finding)";
  and/or let the endpoint enable context shift so overflow compacts instead of 500ing.

### Worker edited a maintainer-owned meta file without flagging — planner 2026-09-10
- **Friction:** the Q4 worker (edit `*` allowed except an explicit deny list) renamed
  agent keys in `agents_repo.md` (→ non-existent `..._128K_mtp`) to document a fact
  it had learned — the file's own header says "Agents do not edit it directly", but
  the config deny list covers `AGENTS.md`/`prompt_**`/`handover_planner.md` and NOT
  `agents_repo.md`, so the config and the doc disagree on who owns it.
- **Cost:** an unauthorized diff in the working tree that the planner had to catch
  and revert; future agents may trust the wrong (renamed) agent keys.
- **Suggested change:** add `agents_repo.md` to the worker deny lists in
  `opencode.jsonc` (or drop the "do not edit" line from the file and let agents flag
  via TODO instead).

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
#### resolved by including "The `handover_task_to_planner.md` contains your latest summary only."
### Stale cross-session `ctx:` injection at session start — planner 2026-09-10
- **Friction:** the `ctx:` line injected at my session start reported the PREVIOUS
  planner's dying session (`CTX=99291 (99%) REM=709`) while my true context
  was `CTX=25273 (21%)` (verified via self-gauge) — the v2.4.1 most-recently-updated
  session read fed another session's numbers into mine at exactly the moment the
  context-budget decision matters most.
- **Cost:** a verification round-trip to re-establish ground truth + doubt about every
  subsequent injected number for the rest of the session; the injected value is
  "source of truth" per the prompts, so a stale value silently corrupts the stop-line
  math.
- **Suggested change:** session-gated match-only post (the v2.5 design — landed
  `313e83b`, live after restart); until then treat the injected `ctx:` as reminder-only
  and self-gauge for budget decisions.

### agents_repo.md gauge command pointed at a deleted CLI mid-convention — planner 2026-09-10
- **Friction:** AGENTS.md's post-commit context check says "run the context gauge
  (command + path in `agents_repo.md`)" — that line still invoked the deleted
  `peek.py` python CLI, so the documented commit routine pointed at a dead command
  (the doc purge lagged the code deletion by a whole cycle, tracked as #34).
- **Cost:** a workaround lookup + the convention being silently unusable for any agent
  following the commit routine verbatim; the same stale pointer sat in the module map.
- **Suggested change:** when a tool is deleted, sweep the convention pointers in the
  SAME commit (agents_repo.md + prompts) — done 2026-09-10 (#34 closed); keep the gauge
  line in agents_repo.md as the single source for the command.

### "final message = same summary" instruction looped the worker — planner 2026-09-10
- **Friction:** the worker prompt required the executive summary to be written to the
  handover file AND repeated as the final message; the worker repeated the final message
  multiple times (loop) and had to be stopped by the maintainer — after it had already
  committed its full scope.
- **Cost:** a lost delegation slot + maintainer intervention; the work itself was safe
  (committed pre-loop) but the loop ate the worker's remaining context.
- **Suggested change:** handover FILE as the single summary channel; final message =
  short pointer only (maintainer already removed the duplication, `52eb0aa`; the
  task-spec Worker section now says the same).

### Stale roster line in the task spec (minor) — planner 2026-09-10
- **Friction:** the spec's "Worker" section named `worker_120K_mtp` while the NAP + TODO
  named a 210K worker, and the final delegatee was a third agent (`worker_Q4_120K` after
  the maintainer restart) — the line went stale across two re-rulings and had to be
  overridden every cycle.
- **Cost:** small: a contradiction to resolve at each delegation + a worker told to
  ignore its own spec line.
- **Suggested change:** keep the spec's Worker line as "the planner's roster choice is
  the delegatee" + one rationale sentence; the NAP is the authoritative roster record.

### DoD "bun host-proxy check" verified the wrong bun — planner 2026-09-10
- **Friction:** the T1 continuation-2 DoD asked for a "bun 1.4.2 host-proxy check" of the
  gauge core as production evidence; it was run under the SYSTEM bun CLI — but the actual
  plugin host is the bun baked into opencode.exe, which lacks `node:sqlite` entirely. The
  check passed, and the maintainer restart then produced `reason:db-error "No such built-in
  module: node:sqlite"` on EVERY chatmsg fire — the ctx nudge never lands in production
  (TODO #37).
- **Cost:** a build cycle + a restart cycle whose "evidence" was the failure lines
  themselves; the planner needed a scoped plugin.log read to discover the live mechanism
  silently delivers nothing; downstream T2 (#33 nudge ladder) is blocked on this.
- **Suggested change:** for host-dependent capability checks (built-in modules, flags),
  the DoD should name the REAL host — e.g. probe from inside the plugin (an init-time
  probe line in plugin.log) or run the check with the bundled runtime — never a same-named
  system CLI that can pass while the production host fails.

### planner permission block denies its own NAP — planner 2026-09-10
- **Friction:** `planner_Q4_120K` in opencode.jsonc carries an edit-deny on
  `.opencode/handover_planner.md` (copy-paste from the worker profiles; the older
  `planner_Q3_120k_mtp` block does not have it) — the planner role's PRIMARY artifact
  (the plan-state file it owns per AGENTS.md) was not editable, so the commit routine
  degraded (state had to be carried in a TODO.md entry + the closing message instead).
- **Cost:** bookkeeping tokens spent on a workaround for an un-writable core file; the NAP
  now sits stale relative to TODO.md until the config is fixed and opencode restarts.
- **Suggested change:** remove `.opencode/handover_planner.md: deny` from the planner's
  permission block (keep it on workers); the NAP is the planner's main handoff channel and
  the resume contract degrades to secondary files when it cannot be written.


### Task text names a non-existent agent + stale launch-mechanic docs — planner 2026-09-10
- **Friction:** the per-session task text (looprunner → planner, from `prompt_looprunner.md`) names the explorer agent `worker_explorer_jill_gemmaQ4_256K`, which does not exist (real key in `opencode.jsonc`: `worker_explorer_jill_gemma_256K_mtp`); and the NAP claimed the planner "function set has NO Task tool" (CLI-launch mechanic) while the live config grants `task: allow` and the Task tool actually works.
- **Cost:** had to cross-check `opencode.jsonc` before trusting either statement; a weaker planner session risks wasting a cycle on a failed launch (non-existent agent name) or on a blocked CLI path.
- **Suggested change:** keep agent names in embedded task text in sync with the live agent keys (already in the TODO #39 proposal / typo list); state launch mechanics once in `agents_repo.md`, verified against `opencode.jsonc`, instead of in NAP prose.

### Delegation context-death at first request + summary-file collision — planner 2026-09-10 (session 5)
- **Friction:** (1) A Task-tool launch of `worker_Q4_120K` DIED at its FIRST request: `context_length_exceeded ... context shift is disabled` (500). The worker-prompt initial request sits right at opencode's ASSUMED context window — `opencode.jsonc` declares no `limit` field for the llama-swap models, so opencode's window assumption (not the server's 120k KV) governs, and the margin for a worker-prompt request is razor-thin. Identical retry via the RAW `agent_Q4_120K` (empty `prompt` → smaller initial request) succeeded. (2) The Task-tool result channel overwrote `.opencode/handover_task_to_planner.md` with the raw `<task_result>` dump AFTER the worker's commit — 4th occurrence across sessions; every planner session must `git checkout --` the file post-run.
- **Cost:** one dead launch + diagnostic reads (~3-4k tokens) to attribute the 500; a repeated post-run restore step each session; the #3 run's committed summary lost its final gauge line (compacted twice mid-draft — maintainer observed it live).
- **Suggested change:** (1) declare `limit.context` per model in `opencode.jsonc` (matching the llama-swap server KV windows) so opencode's assumption matches reality — or make raw `agent_*` variants + compact task messages the standard for scope-heavy delegations; (2) keep the Task-tool result channel away from the handover file path (separate file) or make the post-run restore part of the tool itself.

### Parallel edits to the same file race into duplicates — planner 2026-09-10 (looprun 2, iter 3)
- **Friction:** two `edit` tool calls to the SAME file (P05 verdict note) issued as parallel/independent calls both succeeded — the second matched the pre-first-edit prefix and inserted a duplicate verdict block; caught only by re-reading the file.
- **Cost:** one extra read + one fix-up edit (~2k tokens) late in the session (80 %+ wind-down).
- **Suggested change:** no tool change needed — treat same-file edits as a sequential dependency (batch independent files in parallel, same-file edits one at a time); noted as a standing self-discipline rule in the NAP.
