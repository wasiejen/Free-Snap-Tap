# Worker summary — spec item 3: "N compactions left" in the ctx readout

STATUS: LANDED (commit follows this file)

## What changed
The ctx readout now ENDS with the distinct ` | N compactions left` budget suffix,
computed PER CALL from the compact_budget.json store — on the injected
`ctx: SESSION=… CTX=…` line, the peek.mjs self-gauge, and the ctx_gauge tool
(the three all funnel through the shared formatter). Format pinned:
` | 3 compactions left` / ` | 1 compaction left` (singular at 1) /
` | 0 compactions left`.
- `gauge.mjs`: new `compactionsLeftSuffix(sid, modelId)`; `formatGauge` appends it;
  `setBudgetFileForTest`/`getBudgetFile` test hooks (the setDbPath pattern); header
  readout-forms block documented.
- remaining = `max(0, cap − count)` + 1 iff `count === cap && effective
  emergency_budget >= 1` — the key read LENIENTLY (absent → fail-open default 1,
  matching compact_memory's gate ⇒ count === cap + key absent → **1, not 0**).
- cap resolved EXACTLY like compact_memory's resolveCap (CPU invariant 0 first,
  then model_budget[exact bare-model-id key], else default, else 1); the model is
  the read's modelId (bare id = the map's key form), falling back to the budget
  entry's `model` when the read carries none (no-total reads).
- Fail-open: file missing / unreadable / unparseable / root-not-an-object /
  sid "unknown" (db-error read) → NO suffix.

## Deviations from the spec (for planner bookkeeping)
1. **Primary home was mislocated in the spec's verified facts.** The injected
   `ctx:` line is built by `ctx_watchdog.ts` (`onChatMessage`:
   `text: `ctx: ${line}`` with line = `formatGauge(r)`) — NOT by auto_resume.ts's
   unit-2 nudge (that hook only appends its own `self-compact now (ratio=…)`
   suffix and never formats the ctx line; the ~L227/L480 anchors were the
   autoCompact/saturation readers). The suffix therefore lives ONCE in
   `formatGauge` (gauge.mjs) — covering the primary home + the secondary home +
   the ctx_gauge tool; **auto_resume.ts is unchanged**.
2. **Pin homes:** the spec named auto_resume.smoke.mjs for the 3-states+fail-open
   pins — that plugin never formats the readout, so the pins live with the code:
   `gauge_core.smoke.mjs` (6 checks) + `handover_probe.mjs` new S6b section
   (6 checks: the 3 states + emergency_budget-0 + fail-open + no-total
   entry-model fallback).

## Measured verification (gate green, re-run after the edits)
- probe: **252/252 PASS** (pre-change baseline 246/246; +6 = S6b). Every
  pre-existing formatGauge / ctx-line / nudge / ctx_gauge-tool pin stays
  byte-identical — the probe steers the budget store at a never-created sandbox
  path (fail-open) right after the gauge-core import.
- smokes: ALL PASS — auto_resume 129/129, compact_memory 66/66, ctx_gauge 3/3
  (regex pins tolerate the suffix), gauge_core (new pins green), block_transfer
  52/52 + 22/22, context_recovery, intercept_observer 39/39, loop_log 24/24,
  submit 20/20.
- pytest: 459 passed + 1 warning. ruff `--select F`: 0.
- Live end-to-end: `node .opencode/plugin/scripts/peek.mjs` →
  `SESSION=ses_f2ac76fd3ffeh13lUv8xcxy0AL CTX=150383 (88%) REM=19617 | 5 compactions left`
  (my own session: model cap 5, no budget entry → count 0).

## Commit (named paths only — one commit)
`gauge.mjs`, `handover_probe.mjs`, `gauge_core.smoke.mjs`, `peek.mjs`
(doc comment), `ctx_gauge.ts` (description doc line), this handover file.
Maintainer live/uncommitted files (opencode.jsonc, AGENTS.md,
prompt_agent_task.md, agent_feedback.md, loop_log.md, ideas.md, priority.md)
NOT staged, NOT touched.

## Deliberately NOT done
- No changes to auto_resume.ts / ctx_watchdog.ts / compact_memory.ts /
  context_recovery.ts (the readout inherits the suffix via formatGauge; the
  compaction plugins' logic is read-only per the spec).
- `.opencode/temp/compact_budget.json` + `opencode.jsonc` untouched (maintainer
  live — the file carries no `emergency_budget` key; the fail-open default 1
  covers it, verified in pins).
- No TODO.md change (per spec: status lives in the spec + planner bookkeeping).
- The live `ctx:` line's suffix takes effect at the maintainer's next host
  restart (plugin reload); the peek/ctx_gauge paths are live immediately.

Lessons: every ctx readout (injected line, peek, ctx_gauge tool, nudge-ladder
text) funnels through `formatGauge` in gauge.mjs — readout-format changes belong
there, with a setBudgetFileForTest-style hook to keep probe pins deterministic.
