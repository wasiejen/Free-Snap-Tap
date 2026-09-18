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
  precisely to free window space per task. The built-in Task description is NOT
  editable (maintainer 2026-09-18: "i can do nothing about it") — the mitigation
  is the serial-slot line in the planner prompt, not a description patch.
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

### MEM-0107: Canonical-home map — where each shared protocol fact lives (post-rework)

- Type: `derived`
- Status: `active`
- Confidence: `high`
- Scope: deciding where a new shared rule goes, or fixing a drift/restatement finding
- Keywords: canonical-home, dedup, single-source, triage, friction, no-circumvent, marker-table, action-states, gauge-lag
- Memory: the 2026-09-18 rework fixed the single-source layout: near-limit triage +
  compaction tiers + Work State dump → planner prompt §Context-budget trigger;
  friction #53 → planner prompt §Friction check; no-circumvent #54 → planner prompt
  §Delegate vs do; marker table + priority ladder → planner prompt §maintainer
  calls/decisions; action-line states → agent_readme_loop.md §Action line (inlined
  there because the looprunner loads no AGENTS.md); gauge-lag note → the ctx_gauge
  tool description. The worker/explorer/looprunner prompts carry POINTERS, not
  restatements. A new shared rule goes into ONE of these homes; the roles get a
  pointer line.
- Why it matters: the restatement/drift vector is the main token cost of this prompt
  set; the map prevents a future session from putting a new shared rule in a role
  prompt (where it gets copied again).
- Evidence: rework commits of 2026-09-18 (git log; the D2 check "grep the concept:
  one definition, N references" passes on the named sections)
- Verified: 2026-09-18
- Related: MEM-0103, MEM-0104, MEM-0106
- Review when: a canonical home moves (rename/merge of a section) or a new shared
  rule has no home

### MEM-0108: Description layering + opencode.jsonc working agreement

- Type: `decided`
- Status: `active`
- Confidence: `high`
- Scope: editing tool/plugin descriptions or subagent registrations
- Keywords: description, layering, opencode.jsonc, housekeeping-rule, trigger, live-file, flag-dont-edit
- Memory: a tool/plugin description is CONTRACT text — what/how/params/returns/edge
  cases only. Workflow-preference or trigger sentences ("use X instead of Y for …")
  do NOT belong there; they live in repo_custom_tools.md (deferred) or the role
  prompt (precedent: the block_transfer housekeeping directive was removed from the
  description, 2026-09-18). opencode.jsonc is the maintainer's LIVE file: flag stale
  subagent descriptions/model facts, do not edit them (he fixes them himself — e.g.
  the worker_gemma_Q4_128K description); verify the roster there at launch, never
  trust memory.
- Why it matters: description reworks keep being tempted to re-add directives, and
  editing his live config is the one surface where my change would collide with his.
- Evidence: direct session 2026-09-18 (maintainer: rework descriptions OK;
  "the stale discription I have fixed in the opencode.json")
- Verified: 2026-09-18
- Related: MEM-0101
- Review when: the maintainer changes description policy or takes over reworks

### MEM-0109: Verification state for prompt changes (no harness yet)

- Type: `learned`
- Status: `active`
- Confidence: `high`
- Scope: closing out any prompt/description change with a verification claim
- Keywords: verification, wc, d2-grep, probe, gate, harness, restart, unresloved, p3, p6
- Memory: as of 2026-09-18 there is NO eval harness for prompt changes — the
  verification ladder is: (1) static: wc -w before/after per surface + the D2 grep
  check (one definition, N references); (2) structural: every pointer resolvable by
  the ROLE that reads it (check the role's loading/grants in opencode.jsonc first —
  the looprunner lesson, MEM-0103); (3) gate: `node .opencode/plugin/probes/
  handover_probe.mjs` must stay green (235/235 PASS measured after the 2026-09-18
  rework). Runtime before/after deltas are UNRESOLVED until the P6 loop_stats draft
  lands (`.opencode/proposals/draft/2026-09-18_p6-looprun-measurement.md`; the P3
  snapshot-tool draft sits beside it, P2 superseded-by-implementation). Prompt/config
  changes activate only at the maintainer's NEXT HOST RESTART — say so on every
  landing.
- Why it matters: without this, every prompt change ships an unverified "should be
  better" claim, and the next session re-derives the same ladder or forgets the
  restart.
- Evidence: rework session 2026-09-18 (gate run after commit 79beebd; the three
  drafts in .opencode/proposals/draft/)
- Verified: 2026-09-18
- Related: MEM-0102
- Review when: the P6 harness lands, or the probe total changes (update the 235
  figure from the probe's own output — never from memory)
