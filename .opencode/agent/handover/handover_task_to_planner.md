# Worker handover — compaction-unification (DONE — worker-23)

## Result: build complete — all three units green, all commits in place

Task: compaction-unification build (approved proposal A+B+C, source
`.opencode/proposals/approved/2026-09-26_compaction-unification.md`,
maintainer approved in full 2026-09-26). Branch: `opencode_test`
(no branch switch). One behavior by construction: both entry points now
route through the shared plain module `compaction_core.ts`, and
`context_recovery` compacts ONLY — it never resumes.

## Commits
- **Unit 1 (Part A)** — `218a2c1`: NEW `.opencode/plugin/compaction_core.ts`
  (pure module, NO tool registration, T5 per the intercept_observer_core
  pattern): config reader (`compact_budget.json`), the shared budget store
  (read/count/recordSuccess) + cap resolver (model_budget map, CPU denied,
  emergency-1), keepTokens #99 resolution (computed primary from the DB —
  last keepMessages messages, user tokens.input, assistant output+reasoning,
  dual-shape unwrap; budget-file fallback; else omit), summarizer-pair
  resolution CARRYING THE SESSION'S OWN providerID+modelID (the 14-26
  incident fix), the v1 `session.summarize` call, the COMPACT-line writer
  (carries the resolved tokens + source), the verified-success handling
  (`recordVerifiedSuccess`), the shared failure helpers (+ exported
  `localStamp` — the tool's DUMP-* lines share the stamp writer).
  `compact_memory.ts` is now the thin wrapper: tool registration + arg
  validation + SELF/CROSS routing + the budget gate / EMERGENCY-1 arg + the
  v2 compact dispatch + the pre-compaction dump hook + the queued-message
  path (store at queue time, relay-first on resume — NOT regressed).
  Re-exports keep the smoke/probe import surface pinned at the entry
  point.
- **Unit 2 (Part B)** — `d9d93f8`: `context_recovery.ts` local duplicates
  (config reader, budget store, resolveCap, computeKeepTokens, stamps,
  COMPACT line, jsonc strip, model resolution, callSummarize, failure
  helpers) replaced by imports from the core; `COMPACTION_RELOAD_DIRECTIVE`
  + the promptAsync resume REMOVED — grep-verifiable: ZERO occurrences of
  `promptAsync` / `COMPACTION_RELOAD` in the file (comment wording
  adjusted to keep the zero-match true). The hook keeps: the limit
  trigger, the activation-flag read, the once-per-overflow guard, the
  per-fire budget gate, the core call, hand control back.
- **Unit 3 (Part C)** — this commit: new probe section **S32**
  (3 pins, 338-340) in `handover_probe.mjs` after S31:
  - 338: the core loads type-stripped + the 17 expected named exports are
    functions (+ SELF_ROOT) + NO default export (the plain-module
    pattern);
  - 339: EQUIVALENCE — the tool dispatch + the hook fire over the SAME
    session/model fixture (no sandbox opencode.jsonc — the pair comes from
    the session's OWN model) produce the SAME summarize body
    (providerID + modelID + keep { messages: 5 }, no tokens);
  - 340: EQUIVALENCE cap semantics (a cap-2 pinned model): the tool
    dispatches 2 then refuses (no emergency arg — naming the
    availability); the hook fires 2 normal, auto-consumes the emergency 1
    (the ` emergency` line suffix, count → 3), then clean-fails — NO
    prompt anywhere (Part B).
  Re-pins from Unit 2 (probe S11 checks 78/80 no-prompt, context_recovery
  smoke cases 4/6 no-prompt, unused RC_DIRECTIVE const removed) were
  committed with Unit 2. The probe's section-sum annotations updated:
  S32 annotation block added after S31 + EXPECTED OUTPUT now
  `S31=21 S32=3 hygiene=6 → "PROBE handover: 340/340 PASS"` — the
  self-annotated line agrees (measured).

## Verification (measured, at each unit + final)
- Baselines re-verified at start: probe 337/337, pytest 459 passed +1w,
  ruff F=0, cm smoke 74/74, rc smoke 17/17.
- Unit 1 gate: probe 337/337, pytest 459+1w, ruff F=0, cm 74/74.
- Unit 2 gate: probe 337/337, pytest 459+1w, ruff F=0, rc 17/17.
- Final gate (Unit 3): probe **340/340 PASS**, pytest **459 passed +1w**,
  ruff **F=0**, cm smoke **74/74**, rc smoke **17/17**.

## TODO entries
None — no unresolved findings. (The two build details below are
documented design choices, not defects.)

## Deliberately NOT done
- Did NOT flip `emergencyRecovery` in `.opencode/temp/compact_budget.json`
  (DO-NOT-touch — the re-enable is the live acceptance, done by the
  maintainer after verification).
- No changes to: FST product code, `auto_resume.ts`, `ctx_watchdog.ts`,
  `intercept_observer*`, `block_transfer.ts`, `submit.ts`,
  `.opencode/maintainer/**`, `opencode.jsonc`, the agent prompts.
- The emergency-consumption asymmetry (tool: `emergency` ARG required at
  count==cap; hook: auto-consume at count==cap) is BY DESIGN — the arg
  handling stays in the tool, the no-arg auto path in the hook (the spec's
  gate shapes); S32-340 pins both sides.

## Notes / discrepancies (no silent re-derivation)
1. The core's `recordSuccess` uses the tool's model-write form
   (`typeof model === "string" ? model : ...`); the hook's old local copy
   additionally guarded empty strings — behavior UNCHANGED because the
   hook gates `model === ""` before the call (clean fail).
2. The old S11 probe header comment block and the S11 code-header count
   "(11)" predate the 257-261/285/286 additions (annotation says S11=13) —
   pre-existing drift, not touched (the annotation is the source).
3. `localStamp` is now exported from the core (shared stamp writer for the
   tool's DUMP-OK/RETRY/FAIL lines) — a small addition beyond the
   proposal's core list, needed because the dump hook stayed tool-local.

## Lessons
`block_transfer` WRITE/DELETE line-number refs do not survive the
parameter format (they arrive as marker strings); unique line-prefix
markers are the reliable form for span refs.
