# Task spec — compaction-unification build (approved proposal A+B+C)

Source: `.opencode/proposals/approved/2026-09-26_compaction-unification.md`
(read it in full — 94 lines, the design source). Status: maintainer
approved A+B+C in full (2026-09-26). Build against current state.

## Goal (one sentence)
One compaction behavior by construction: a shared plain module
`compaction_core.ts` that BOTH entry points route through, and
`context_recovery` that compacts ONLY — it never resumes.

## Baselines (planner-verified 2026-09-26, commit 8ea4b2b)
probe **337/337**; smokes: compact_memory **74/74**, context_recovery
**17/17**, auto_resume **139/139**, intercept_observer **77/77**,
block_transfer **123/123 + 64/64**, submit **20/20**; pytest
**459 passed + 1 warning**; ruff **F=0**. Re-verify at start; the
measured baseline wins.

## Units (ordered; one green checkpoint commit per verified unit;
TODO + handover ride the FINAL commit)

**Unit 1 (Part A) — the shared core + the thin tool wrapper.**
- NEW `.opencode/plugin/compaction_core.ts` — plain module, NO tool
  registration (the `intercept_observer.ts`/`intercept_observer_core.ts`
  split is the proven pattern; it must not import
  `compact_memory.ts` — the T5 constraint: importing the tool would pull
  tool registration into the hook-only plugin).
- The core carries (source of truth = the tool's current implementations):
  config reader (`compact_budget.json`), the shared budget store
  (read/write/count/recordSuccess) + cap resolver (model_budget map,
  CPU denied, emergency-1), the keepTokens resolution (#99: COMPUTED
  primary from the DB — last `keepMessages` messages, user
  `tokens.input`, assistant `tokens.output + tokens.reasoning`, dual-shape
  unwrap; budget-file `keepTokens` fallback; else omit), the
  summarizer-pair resolution **carrying the session's own providerID +
  modelID** (the 14-26 incident fix), the v1 `session.summarize` call,
  the COMPACT-line writer (the line carries the resolved tokens + source
  — #99), the verified-success handling (budget increment + line), and
  the shared failure helpers.
- `compact_memory.ts` (1006 lines) becomes a thin wrapper: tool
  registration + arg validation + SELF/CROSS routing, then the core.
  STAYS in the tool: the pre-compaction dump (DUMP-OK/FAIL/RETRY lines),
  the queued-message path (store at queue time, relay-first on resume —
  spec 2+11, 526e7e1 — do NOT regress it), and the SELF-path extras.
  The core list above is the proposal's; the dump/queued-message are
  NOT core behavior (proposal Part A list).
- **Unit 1 DoD:** tool behavior unchanged for both SELF and CROSS paths
  (smoke 74/74 stays green, re-pins allowed where the import surface
  moved); the standard gate green.

**Unit 2 (Part B) — context_recovery compacts ONLY.**
- `context_recovery.ts` (728 lines): replace its local duplicates
  (config reader, budget store, resolveCap, computeKeepTokens, stamps,
  COMPACT-line writer, jsonc strip, model resolution, callSummarize,
  failure helpers — currently L126-586) with imports from the core.
  REMOVE `COMPACTION_RELOAD_DIRECTIVE` (L89) and the `promptAsync`
  resume (≈L717) entirely — the hook keeps: the limit trigger, the
  per-fire budget check, the core call, hand control back. NO
  promptAsync anywhere in the file after the change.
- **Unit 2 DoD:** context_recovery smoke green (17/17 baseline,
  re-pins allowed); grep-verifiable: no local re-implementations of the
  core behaviors, no promptAsync/COMPACTION_RELOAD in the file;
  standard gate green.

**Unit 3 (Part C) — the equivalence pin (drift guard).**
- New probe section **S32** in `.opencode/plugin/probes/handover_probe.mjs`
  (after S31, L7153+; the S31 drift-guard equivalence pin L7204-7222 is
  the pattern): pin that BOTH entry points (the tool's and the hook's)
  resolve the SAME summarizer pair + SAME cap semantics for the same
  session/model input, + the core exports exist. Re-pin the
  compact_memory / context_recovery smokes if their import surface
  changed. Update the probe's section-sum annotation lines (L810 /
  L850 / L918 — the annotation is the source; the self-annotated
  `PROBE handover: <t>/<t> PASS` line must agree).
- **Unit 3 DoD:** probe all green with the updated annotation; full
  standard gate green.

## Suggested scope (bounded reads — do NOT read whole files)
- `compact_memory.ts`: L101-320 (config/keep/cap + budget store +
  COMPACT line), L514-793 (failure helpers, callSummarize, resolveModel,
  jsonc/resolveCompactionModel, queued message), L794-1006 (the plugin
  body).
- `context_recovery.ts`: L89-99 (directive), L126-349 (the duplicates),
  L388-586 (model resolution + callSummarize), L610-728 (the fire path).
- `intercept_observer_core.ts` — the tool-free-core pattern reference.
- Probe: S31 section L7153+ (pin pattern) + the annotation lines only.
- Smokes: `.opencode/plugin/tests/compact_memory.smoke.mjs`,
  `.opencode/plugin/tests/context_recovery.smoke.mjs` (re-pin only where
  the import surface moved).

## DO-NOT-touch
FST product code; `auto_resume.ts`; `ctx_watchdog.ts`;
`intercept_observer*`; `block_transfer.ts`; `submit.ts`;
`.opencode/maintainer/**`; `opencode.jsonc`; `.opencode/temp/
compact_budget.json` (do NOT flip `emergencyRecovery` — the re-enable is
the live acceptance, done after verification); the agent prompts.

## Build notes
- Chunk large writes (≤ ~8 KB per write call).
- Gate output is small — read only the PASS/total lines, not full runs.
- Stay on the current checkout (`opencode_test`).
- If you find a discrepancy with this spec's claims, stop and note it in
  `handover_task_to_planner.md` (no silent re-derivation).

## Worker
`worker_Q3S_245K_slow` (verified active in the live opencode.jsonc).
