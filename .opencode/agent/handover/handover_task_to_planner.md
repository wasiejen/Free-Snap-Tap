# handover_task_to_planner — worker-16 (IN PROGRESS, updated pre-compaction at ~80 % ctx)

Task: smoke-harness build per `.opencode/agent/handover/handover_task.md`
+ approved proposal `2026-09-15_smoke-harness-home.md`.

## Done (committed, all green — run: `node .opencode/plugin/tests/<file>`)
- 6c38fd4 — `tests/` home: `README.md` (≤20 lines) + `_smoke_base.mjs`
  (REPO_ROOT from file location, SCRATCHPAD runtime fixture path, `loadRepo`
  type-stripped import, `freshSandbox`, `makeChecker`) + `gauge_core.smoke.mjs`
  (green; from `pw_test.mjs`, stale `ctxgauge/` ref rewired; added missing
  exit code) + `loop_log.smoke.mjs` (24/24 green).
- 65375c0 — `block_transfer.smoke.mjs` (20/20 green) +
  `block_transfer.sandbox.smoke.mjs` (52/52 green; outsideDir now
  `path.dirname(REPO_ROOT)`, computed).
- 844df06 — `context_recovery.smoke.mjs` (green; import rewired to
  `.opencode/plugin/deactivated/context_recovery.ts`, attribution verified,
  sandbox opencode.jsonc fixture — live config never touched) +
  `ctx_gauge.smoke.mjs` (3/3 green, LIVE db byte-identity vs peek.mjs child).

## Remaining (the big unit — I compacted before it at ~80 % ctx)
1. **`compact_memory.smoke.mjs`** — FOLD `cm_v2_smoke.mjs` + `qc_smoke/smoke.mjs`
   (both scratchpad, read-only). Source of truth for behavior:
   `.opencode/plugin/compact_memory.ts` (ALREADY fully read; key facts):
   - default export = factory `CompactMemoryPlugin(ctx)` →
     `{ tool: { compact_memory } }`; named export `classifyQuantClass`.
   - FIRE-AND-FORGET build (2026-09-14 ruling): `execute` returns
     `Compaction dispatched for <sid> (background, fire-and-forget) — the
     summarize call was sent (model: <m>)...` (or `the compact call was sent`
     on the v2 branch); budget increment + COMPACT line land ONLY in the async
     success callback → smoke needs a `drain` (~25 ms setTimeout) before
     side-effect assertions; response checks expect "dispatched" (the old
     success/directive strings + /compacted/i are STALE).
   - args shape is SIX keys (sessionID, providerID, modelID, keepTokens,
     keepMessages, message) — update the reg-shape check.
   - retry-keep note ("keep not accepted by this build (retried without the
     keep fields)") goes to console.log; a failed compaction goes to
     console.error — capture console output for those assertions.
   - cm_v2's `context.api`/`context.client` source checks belong to the RETIRED
     v1 tool — replace with an explicit providerID+modelID override case.
   - cm_v2 no-client core (never throws / compact note / no budget / no COMPACT
     line) + qc's no-client "names the probes" check → one no-client section
     (factory({})). qc gate/cpu/cross/rpc-fail/v2-schema/v1-lenient/COMPACT-line
     cases carry over (cross/rpc use the messages-RPC fallback to extra.model).
   - fresh-sandbox cleanup for idempotent re-runs (originals were not clean).
   - sandbox = scratchpad subdir `compact_memory` (`.opencode/temp` created).
2. Gates: `node .opencode/plugin/probes/handover_probe.mjs` (expect 99/99),
   `./.venv/Scripts/python.exe -m pytest -q` (expect 459 passed + 1 known #10
   warning), `./.venv/Scripts/ruff.exe check --select F .` (expect F=0).
3. `TODO.md` one-line close-note (points at proposal + final commit hash),
   final handover (this file), one commit.

## Constraints honored so far
- Scratchpad READ-ONLY for source files; fixtures only in per-smoke subdirs.
- No tool/plugin source touched; no proposals/, opencode.jsonc, maintainer/,
  prompts/, NAP, or .opencode/loop/ touched.
- Discrepancy notes for the final summary: (a) compact_memory smokes needed
  assertion updates to the fire-and-forget build (test-side, no source change);
  (b) pw_test gained an explicit exit code; (c) context_recovery smoke is
  pinned to the DEACTIVATED plugin file (attribution verified at build time).
