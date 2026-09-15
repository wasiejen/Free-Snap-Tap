# handover_task_to_planner — worker-16 (IN PROGRESS, early handover at 70 % ctx)

Task: smoke-harness build per `.opencode/agent/handover/handover_task.md`
+ approved proposal `2026-09-15_smoke-harness-home.md`.

## Done (committed, all green)
- `.opencode/plugin/tests/` created: `README.md` (≤20 lines) + `_smoke_base.mjs`
  (shared: REPO_ROOT from file location, SCRATCHPAD runtime fixture path,
  `loadRepo` type-stripped import, `freshSandbox`, `makeChecker`) — commit 6c38fd4.
- `gauge_core.smoke.mjs` green (from scratchpad `pw_test.mjs`; stale
  `.opencode/ctxgauge/gauge.mjs` ref rewired to `.opencode/plugin/scripts/gauge.mjs`;
  added the missing exit code).
- `loop_log.smoke.mjs` green 24/24 (from scratchpad `loop_log_smoke.mjs`, sandboxed).

## Remaining (order of build)
1. `block_transfer.smoke.mjs` (from `bt_smoke.mjs`) — shape + functional round-trips.
2. `block_transfer.sandbox.smoke.mjs` (from `bt_sandbox_smoke.mjs`) — ALLOW/REJECT
   matrices; outsideDir must become `path.dirname(REPO_ROOT)` (computed, not hardcoded).
3. `compact_memory.smoke.mjs` — FOLD `cm_v2_smoke.mjs` + `qc_smoke/smoke.mjs` (the
   proposal allows the fold). KEY ADAPTATION: the live plugin is now
   fire-and-forget (2026-09-14 maintainer ruling): `execute` returns a
   "Compaction dispatched for <sid> (background, fire-and-forget) — the
   summarize/compact call was sent (model: <m>)..." line and the budget
   increment + COMPACT line land only in the async success callback → the smoke
   needs a drain (`setTimeout ~25 ms`) before side-effect assertions; response
   assertions must expect "dispatched" (not "compacted"/the retired directive
   string); the retry-keep note + failure text now go to console.log/console.error
   (capture them); registration shape now has SIX args
   (sessionID, providerID, modelID, keepTokens, keepMessages, message). cm_v2's
   `context.api`/`context.client` source checks belong to the RETIRED v1 tool —
   replace with an explicit providerID+modelID override case (the round-2 path).
   cm_v2's no-client core (never throws / compact note / no budget / no COMPACT
   line) folds into the no-client section. Also add fresh-sandbox cleanup so
   re-runs are idempotent (the originals were not).
4. `context_recovery.smoke.mjs` (from `t5_smoke.mjs`) — rewire import to
   `.opencode/plugin/deactivated/context_recovery.ts` (verified: attribution
   holds, it IS the T5 emergency hook; the file matches all t5 assertions:
   keep {30_000,12}, budget count 1, flag semantics, clean fail on exhaustion).
5. `ctx_gauge.smoke.mjs` (from `ctx_gauge_smoke.mjs`) — live smoke: byte-identity
   vs peek.mjs child + wellformed + db-error in-band (verified gauge.mjs still
   exports setDbPath/getDbPath; the tool still appends ` — <error>`).
6. Gates (probe 99/99, pytest 459+1#10, ruff F=0), TODO close-note, final handover.

## Constraints honored so far
- Scratchpad READ-ONLY for source files; fixtures only in per-smoke subdirs.
- No tool/plugin source touched; no proposals/, opencode.jsonc, maintainer/,
  prompts/, NAP, or .opencode/loop/ touched.
