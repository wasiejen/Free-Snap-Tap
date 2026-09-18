# Serial workflow scan — looprunner / planner / worker (+explorer)
Role: prompt-engineer, 2026-09-18. Read-only scan; bounded reads (AGENTS.md via context,
role prompt, handout, guide Part 0/4/5 + D-table, the 4 agent prompts, loop protocol,
repo_overview head). No observed failure transcript was available for this scan — items
marked *(proactive)* are structural, items marked *(failure-anchored)* map to an observed
recurring cost class in the prompts themselves.

NOTE ON LOCATION: requested working folder `.opencode/agent/prompts/_inbox` is edit-DENIED
for this agent (opencode.jsonc deny on `.opencode/agent/prompts/**`, same class as the
worker deny — TODO #54 area). Filed in the scratchpad instead; move it into _inbox if the
folder is meant to be a writable drop point (that would itself be a config decision).

## 1. How the system works (current state)

Four prompt-defined roles, all serial, all file-state-mediated:

```
looprunner ──launch(N, launch text, status block)──▶ planner
planner:  rebuild reality (repo_overview, git log, NAP, TODO, inbox, priority, proposals, marker sweep)
          → write handover_task.md (goal + DoD + boundary + scope + worker)
          → Task-launch worker (ONE at a time)
worker:   repo_overview + spec → edit → verify green → commit (code + TODO + handover)
          → handover_task_to_planner.md → return
planner:  verify vs git log + test baseline (never trust the summary)
          → copy spec/summary into loop folder (plan<N>_ho_task*.md)
          → NAP update + curate TODO → plan<N>_summary.md + exactly one action: line
looprunner: read LAST action: line
          → restart (default) / resume (task_id) / ask_maintainer / stop
          → next iteration, or AFK-forced fresh launch
```

Key mechanisms:
- **Committed files are canonical** (NAP, spec, worker summary, loop_log, plan<N>_summary).
  Agents resume from files + git, never memory.
- **Action-line state machine** in AGENTS.md, read by looprunner; missing/unclear → restart.
- **Context protocol per role**: gauge stop line ~90% (planner/worker), 70% early
  handover, compact_memory (self or cross-session fire-and-forget), post-compaction
  protocol, dump-before-compact for near-limit workers.
- **Friction channel**: submit(feedback) at close, #53 protocol; looprunner logs friction
  as --INFO-- lines (no write access beyond loop_log/compact temp).
- **Access gating** via opencode.jsonc: looprunner write-deny, worker deny on
  .opencode/agent/prompts/** (planner-as-text-worker fallback for prompt text work).

Per-iteration serial cost stack (each planner session pays ALL of it):
1. Full system prompt + repo_overview + 6-8 init reads (git log, NAP, TODO, inbox,
   priority, proposals, marker sweep) — the "rebuild reality" tax.
2. Spec writing (mandatory task_spec readme first).
3. One worker round-trip (worker pays its own init: repo_overview + spec + inbox).
4. Planner verification pass (git log + tests re-run).
5. Ceremony: spec/summary copies, NAP compress, TODO curation, friction check, summary file.
6. Looprunner relays the FULL closing summary into its own window every iteration.

## 2. What to optimize (priority order)

P1. **Parallel delegation rule in the planner prompt** *(proactive; guide S3-P8: 3-5
parallel subagents cut research time up to 90%)*. The planner currently has no rule
permitting or bounding parallel worker launches; serial is the unexamined default. Add:
"launch 2-3 workers in ONE Task message when scopes are file-disjoint and share no test
gate; verify all on return; if any touches a shared module, serial." The TODO.md backlog
entries are mostly independent (self-contained by contract), so this is directly usable.
Prompt edit = observable behavior → maintainer approval needed.
--comment1: this hardware base only supports serial execution. only one slot is available - thus the serial execution. the context window is limited - thus this delegated slot workflow was developed to free up as much as possible for each task.

P2. **Effort-scaling table in planner + worker prompts** *(failure-anchored: D12/F17 —
models demonstrably misjudge effort; a one-line doc fix currently rides the full
spec→worker→verify→NAP pipeline)*. Add: trivial (≤1 file, ≤~15 diff lines) → planner does
it inline, no delegation; small → worker with bounded budget; large → full spec. Add an
`effort:` field to the task spec (D13: objective, output format, tool guidance, boundaries
— effort budget is missing; guide point 7: effort budgets ARE a prompt concern) and a
worker stop-condition tied to it ("if the task exceeds effort N×, stop + handover, do not
silently expand").
--comment2: let us try this. write in .opencode\maintainer\draft\prompt_engineer\_inbox

P3. **Consolidate the planner's init into one tool call (D16)** *(failure-anchored: 6-8
serial reads per session, each spending prefill + attention)*. A "planner-state-snapshot"
plugin tool returning one capped digest: last 20 git log lines, NAP header + current
section, open TODO count + ids, pending inbox items, marker-sweep result. Moves work out
of the agent's context (handout: consolidation "moves work from the agent's context into
the tool"), shrinks the per-iteration rebuild, and removes step-skipping drift. In
prompt-engineer scope (tool/plugin design per the handout). Needs a maintainer call for
registration + the per-role init list edits that reference it.
--comment3: this tool would need to be developed first. so the tool would return the combined data of all the "maually done tool callse into one?"


P4. **Looprunner context burn: full-summary relay** *(failure-anchored: the looprunner's
own stop line is 85% + "you cannot restart yourself" — the driver window is the loop's
single point of failure and it shrinks every iteration by the full summary text)*.
Currently the looprunner prints the FULL closing summary each iteration ("maintainer's
first look"). Cheaper form: 3-5 line digest + pointer to plan<N>_summary.md (AGENTS.md
already makes the committed file canonical). Maintainer decision — the full print is his
explicit readout choice; flag, don't change unilaterally.
--comment4: yes lets fix this and reduce the output

P5. **resume-by-default when the previous close was clean** *(proactive; architecture-
level)*. `restart` re-pays the full rebuild every iteration; `resume` (task_id) exists and
the looprunner already uses it for compaction recovery, but not as the normal path. Risk:
context rot in a long-lived planner session — the tradeoff is a maintainer call, not mine
to settle. Note: "half prefill" on the Q4 model already mitigates restart prefill cost.
--comment5: half prefill is a model setting not to mitigate cost but to increase the limited context size. the cost paid for half prefill speed is actually slower initiation. cost in itself is only time - there are no cost added but energy in this setup

P6. **No regression set for the loop workflow (D10/Part 5)**. Nothing measures a prompt
change to these prompts: no ~10-20 task eval, no tool-call/token/error counters for
iterations. Until this exists, every item above (and every past prompt patch) is
unvalidated. Minimal version: a dated record per looprun (iterations, workers launched,
avg tool calls per worker, restart count, warning count) — the loop_log already carries
most of it; a counting pass over loop_log.md is a script, not a prompt change.
--comment6: needs clarification. i do not know the knowledge files you based your decisions on. explain it to me. measurement of session values of each session/task/workflow? 

Not recommended:
- Splitting the loop into more roles — the 4-role split is already at the right altitude
  (D12: heuristics over procedures; the roles are heuristics).
- Removing the spec/summary copy ceremony (plan<N>_ho_*.md) — cheap insurance for
  post-mortems; keep.

## 3. Verification requirement for any of the above
Per my working loop step 4 + D10: before/after on a small realistic multi-step set,
measured tool-call count / tokens / wall-clock / errors per iteration, read the raw
transcripts, held-out cases included. No item ships on "should be better."

## Discrepancies flagged (none resolved)
- AGENTS.md stop line (85%/REM≤15k) vs planner/worker prompts (90%, "rides a proposal
  until he lands it") — intentional pending state, both files say so.
- Loop log STATUS tokens: `agent_readme_loop.md` examples show `-->START` / `DONE<---`,
  the content descriptions call them `START-->` / `<---DONE` — cosmetic token-ordering
  drift inside the same file (line 57-58 vs 63-64); the 8-char tokens in the table are
  canonical. Low risk, worth a one-line fix next time the file is touched.
