# PROPOSAL — plugin scope: custom gauge tool + rename (2026-09-11, planner)

Two plugin-scope decisions that were never ruled (the plan1_summary
"waiting for approval" item 3 — still open; see also the feedback rundown).

## 1. Custom gauge tool (2306#1) (RECOMMEND: GO)
- **What:** a TS file in `.opencode/tools/` (filename = tool name) whose
  `execute(args, context)` receives `context.sessionID` — no shell, no
  spawn. It wraps `scripts/gauge.mjs` + a per-session sqlite query (the
  plugin persists everything needed: ctx/window/pct/REM, fired rungs, the
  ctx time series). ~60-100 lines + probe cases + one permission line in
  `opencode.jsonc` (your file).
- **Why:** the agent can end its turn on a FRESH self-read even when a stale
  injected gauge read says otherwise — your stated goal; it also exposes
  "rung 4 already fired" / compaction state on demand.
- **Sequencing:** standalone now (compaction detection is deactivated, so
  the original "after #2" dependency is gone).

## 2. Rename the plugin to `ctx_watchdog.ts` (RECOMMEND: with the tool build, else SKIP)
- **What:** the plugin no longer does handovers (mirror removed in P02);
  the `handover_v2.4.ts` name is stale. Rename touches `opencode.jsonc`
  (your live file) — you edit it, or give explicit go and I wire the
  plugin file + probe + imports and you flip the config line.
- **Recommendation:** fold into the custom-tool cycle (one build, one
  probe pass) — or skip the rename; it is cosmetic.

**Acceptance:** tool returns the full per-session picture (verified via
probe + one live call); rename (if done) leaves probe + suite green and
the plugin loading from its new path.

**Status:** awaiting maintainer go/no-go (my recommendation: GO on both,
one cycle).
