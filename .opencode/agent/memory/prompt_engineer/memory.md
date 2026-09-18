# Prompt_Engineer memory

Seeded 2026-09-18 from the first rework session (direct session with the
maintainer: serial-workflow scan + prompt-surface rework). The researcher
example entry that shipped in the template is superseded by this seed (it was
scaffolding for another role's namespace).

### MEM-0101: Subagent launches are serial — one llama-swap model slot

- Type: `decided`
- Status: `active`
- Confidence: `high`
- Scope: any prompt work proposing delegation/launch behavior on this host
- Keywords: llama-swap, single-slot, serial, task-launch, parallel, delegation
- Memory: This host runs ONE llama-swap model slot — subagent Task launches run
  one at a time; the built-in Task description's "launch multiple agents
  concurrently" guidance does NOT apply here. The delegated-slot workflow exists
  precisely to free window space per task.
- Why it matters: kills a class of otherwise-attractive proposals (parallel
  delegation rules) at the idea stage; effort framing must be wall-clock.
- Evidence: maintainer comment 1, direct session 2026-09-18 (serial-workflow
  scan); slot facts also in `.opencode/agent/knowledge/knowledge_tools.md`
- Verified: 2026-09-18
- Related: MEM-0102
- Review when: multi-slot hardware or provider change

### MEM-0102: Cost metric is time only; half-prefill buys window, not speed

- Type: `decided`
- Status: `active`
- Confidence: `high`
- Scope: framing all prompt/tool optimizations for this host
- Keywords: cost, time, energy, half-prefill, context-size, initiation, slow-start
- Memory: The only cost metric on this setup is TIME (wall clock / energy) — no
  token or money cost. "Half prefill" on the Q4 models is a CONTEXT-SIZE setting
  (larger effective window) whose price is slower initiation — it is NOT a cost
  mitigation.
- Why it matters: optimization claims must be framed as wall-clock per
  iteration, not token savings; "cheaper prefill" arguments are invalid here.
- Evidence: maintainer comment 5, direct session 2026-09-18
- Verified: 2026-09-18
- Related: MEM-0101
- Review when: provider/model hardware change

### MEM-0103: The looprunner loads no AGENTS.md — its prompt must be self-contained

- Type: `observed`
- Status: `active`
- Confidence: `high`
- Scope: editing `prompt_agent_looprunner.md` or its read grants
- Keywords: looprunner, agents.md, self-contained, opencode.jsonc, load_agents_md, dangling-reference
- Memory: the looprunner agent has `load_agents_md: false` in opencode.jsonc AND
  its read allow-list excludes AGENTS.md — any AGENTS.md reference in its prompt
  surface is unresolvable. Protocol facts it needs (e.g. the action-line states)
  must be inlined in its prompt or in `agent_readme_loop.md` (which it CAN read).
- Why it matters: dangling cross-references are a silent failure class in prompt
  rework; this per-role loading asymmetry is invisible unless the config is checked.
- Evidence: opencode.jsonc looprunner block, checked against the prompt in the
  rework session 2026-09-18
- Verified: 2026-09-18
- Related: MEM-0104
- Review when: the looprunner block in opencode.jsonc changes (grants or flags)

### MEM-0104: Looprunner rulings 2026-09-18 (no self-compaction; 90%; summary-run close)

- Type: `decided`
- Status: `active`
- Confidence: `high`
- Scope: editing the looprunner prompt or its recovery/lifecycle behavior
- Keywords: looprunner, self-compaction, stop-line, 90%, loop_log, friction, summary-run
- Memory: the looprunner MUST write its own lines via the loop_log tool (an
  earlier "exemption" applied only when it lacked tool access); it does NO
  self-compaction — conserve context and last as long as possible (it cannot
  restart itself; only the maintainer can); stop line 90 %; at stop (or the stop
  line) it closes the loop with the autorun_summary run. The #53 friction check
  applies to it via submit when the tool is available (otherwise --INFO-- +
  readout note).
- Why it matters: prevents re-introducing self-compaction or the exemption in a
  future rework; the 85-vs-90 history stays resolved in one place.
- Evidence: maintainer message, direct session 2026-09-18; landed in
  prompt_agent_looprunner.md
- Verified: 2026-09-18
- Related: MEM-0103
- Review when: the maintainer revises the looprunner lifecycle (e.g. grants it a
  restart capability)

### MEM-0105: AGENTS.md numerals block — judged minimal-complete; do not drop, do not re-litigate compression

- Type: `learned`
- Status: `active`
- Confidence: `high`
- Scope: any future proposal to compress or edit the bit-drift block in AGENTS.md
  (Pattern 5 + redundancy form + content escape)
- Keywords: numerals, bit-drift, numword, few-shot, agents.md, compression, dense-numerals
- Memory: the block is a measured-incident mitigation (a worker misperceived 55
  as 56; the ENOENT date-string cluster — knowledge_context.md). Its 5 examples
  are a curated diverse few-shot set that TEACHES the quantized model the legal
  forms — they are the mitigation, not bloat. Verdict 2026-09-18: keep as-is.
  Compression is allowed only if the presentation improves WITHOUT dropping any
  form/example; trimming the example set requires a regression harness (the P6
  loop_stats draft) to measure the degradation.
- Why it matters: the block will keep tempting "context-reduction" passes; this
  records the final verdict + rationale so it is not re-litigated or silently
  dropped.
- Evidence: direct session 2026-09-18 (block + primer read; maintainer: "only
  not dropping it is important"); incident evidence in knowledge_context.md
- Verified: 2026-09-18
- Related: none
- Review when: a regression harness exists, or a new bit-drift incident
  implicates the block

### MEM-0106: Worker effort-ceiling rejected — near-limit triage is the approved form

- Type: `decided`
- Status: `active`
- Confidence: `high`
- Scope: any future proposal adding worker effort budgets or ceilings
- Keywords: effort, ceiling, triage, worker, context-limit, underestimation
- Memory: the maintainer rejected a tool-call CEILING for workers (too
  restrictive — workers have done a good job so far). The observed failure is
  the inverse: workers UNDERestimate remaining effort as the context limit
  approaches. The approved fix is a near-limit triage rule: at ≥80 % readout,
  estimate the tool calls still needed before starting a unit; estimates near
  the limit are optimistic by construction (round up); if the estimate exceeds
  ~10 calls (starting value) stop at the last checkpoint and compact instead;
  at ≥90 %, if >~6 remain, close and compact now. Canonical home: planner prompt
  §Context-budget trigger.
- Why it matters: prevents re-proposing ceiling designs and records the exact
  failure being treated (underestimation near the limit, not over-effort).
- Evidence: maintainer comments 2 + ruling, direct session 2026-09-18; landed in
  prompt_agent_planner.md
- Verified: 2026-09-18
- Related: MEM-0102
- Review when: the 10/6 starting values are calibrated from a measured looprun
  (P6 loop_stats)
