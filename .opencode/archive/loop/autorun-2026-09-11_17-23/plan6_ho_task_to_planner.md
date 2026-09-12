# EXECUTIVE SUMMARY — T5 (re-verify): recovery-plugin verification + WIP→commit conversion (Cycle 2, L4+L5)

**Outcome:** DONE — GATE verified met at launch (clean tree; `git show HEAD:.opencode/tools/compact_memory.ts` contains `export default tool(`); probe S10 re-aligned to the committed tool() shape; the S10→S10 section verified green for the FIRST time (never run at `9e173d1`); WIP rescue `9e173d1` converted to a proper task commit (NOT rewritten). All DoD items green.

## GATE (verified FIRST, before any work)

1. `git status --porcelain` → empty (clean tree; `compact_memory.ts` NOT in unstaged).
2. `git show HEAD:.opencode/tools/compact_memory.ts` → contains `export default tool(` (commit `6ea8c2f`).
→ gate MET; work proceeded.

## Committed tool shape (re-confirmed vs the spec's assumptions)

Runtime-verified via a scratch type-stripped import of the committed file (plain
system node 24.19.0, the probe's host): `tool()` from `@opencode-ai/plugin` returns
its input verbatim (`tool.schema = z`), so the default export is exactly
`{ description, args, execute }`:
- `description`: string ✓
- `execute`: function ✓
- `args`: **DELTA vs the spec** — a PLAIN object of NAME → zod schema
  (`{ keepTokens: ZodNumber, keepMessages: ZodNumber, sessionID: ZodString }`,
  zod 4.1.8; opencode tool() convention), NOT a zod object. The spec's prescribed
  `Object.keys(cmTool.args?.shape ?? {})` would yield `[]`. Aligned the probe to
  the committed reality (recorded in `todo_inbox.md` per the spec's approval
  boundary).
- Budget store / COMPACT line / directive strings: UNCHANGED from the T3 build —
  checks 68-75 needed no target changes.

## Exact check-67 diff (the probe re-alignment)

`cmTool` access (~line 1409):
```diff
-  cmTool = toolMod.default?.tools?.compact_memory;
+  cmTool = toolMod.default;
```
Check 67 label + arg-name assert + evidence (~lines 1406-1418):
```diff
-    "tool file imports (type-stripped, direct) and exposes default.tools.compact_memory (description + async execute + the prototype's arg names)",
-    cmTool != null && typeof cmTool.description === "string" && typeof cmTool.execute === "function" &&
-      JSON.stringify(Object.keys(cmTool.parameters?.properties ?? {})) === JSON.stringify(["keepTokens", "keepMessages", "sessionID"]),
-    JSON.stringify(Object.keys(toolMod.default?.tools ?? {})),
+    "tool file imports (type-stripped, direct) and exposes the tool() default export (description + async execute + the prototype's arg names as args NAME → zod schema)",
+    cmTool != null && typeof cmTool.description === "string" && typeof cmTool.execute === "function" &&
+      JSON.stringify(Object.keys(cmTool.args ?? {})) === JSON.stringify(["keepTokens", "keepMessages", "sessionID"]) &&
+      Object.values(cmTool.args ?? {}).every((s) => s != null && typeof s.safeParse === "function"),
+    JSON.stringify(Object.keys(toolMod.default ?? {})),
```
(added the per-value `safeParse` guard so check 67 pins the tool() shape, not just
the names). Check 73 fresh-module call site (~line 1515):
```diff
-  const a4 = await freshMod.default.tools.compact_memory.execute({ … }, cmCtx());
+  const a4 = await freshMod.default.execute({ … }, cmCtx());
```
Header comment (WHAT-IT-RUNS check-67 description) updated to the tool() shape.

## S10→S10 finding (first-ever run of checks 76-81)

Check 78 went RED on the first full run: the probe's `RC_DIRECTIVE` (a
"byte-identical copy of the tool's directive") did not match the plugin's
`promptAsync` text. Root cause: the committed plugin's
`COMPACTION_RELOAD_DIRECTIVE` carries the tool's 2-line directive **plus a
looprunner continuation line** ("If your role is Looprunner continue the last
restart/resume close message of a Planner you have received.") — added by the T5
WIP build, never verified (the S10→S10 section was never run before this
re-verify). Per spec ("the PLUGIN is NOT changed by this task — only the PROBE
is re-aligned"): the probe's `RC_DIRECTIVE` + check-78 label + header line were
re-aligned to the committed plugin's runtime string (byte-verified equal, 297
chars, via a scratch fire of the hook). CONSEQUENCE: the plugin's own header
comment (context_recovery.ts lines 31-34: "byte-identical to the compact_memory
tool's constant") is now FALSE — finding recorded in `todo_inbox.md` (decision:
fix the comment, or make the directive byte-identical — the latter is a behavior
change → maintainer call).

## Verification (measured, pre-commit; verbatim)

- `node .opencode\plugin\probes\handover_probe.mjs` → **`PROBE handover: 80/80 PASS`**, exit 0.
- `& .\.venv\Scripts\python.exe -m pytest -q` → **`451 passed, 1 warning in 2.62s`** (the known #10 warning: `RuntimeWarning: coroutine 'Output_Manager.execute_key_event' was never awaited`, `tests/test_extraction_filter_edges.py::test_mouse_rebind_schedule_error_is_logged`; no FST code touched).
- `& .\.venv\Scripts\ruff.exe check --select F .` → **`All checks passed!`** (F=0).

## Header total reconciliation

The spec expected the stale header total to be reconciled from "80/80" to a
measured 74/74. MEASURED reality: **N=80 — the header was already correct.**
Count audit (scripted): 75 literal `check()` calls + 5 dynamic S8 rung checks
(47-51) = 80; per-section breakdown (S1=3 S2=4 S3=5 S4=8 S6=8 S7=11 S8=8 S9=12
S10=9 S11=6 S5=6) sums to 80 and matches the check-id groups (id 44 absent by
design). The carried "74/74" figure was the T3-era baseline (74 = 80 − the 6
S10→S10 checks added by the WIP rescue, whose worker already updated the header
to 80/80). No header edit was made — nothing to reconcile.

## Commit

The task commit (this file + the probe re-alignment + the loop-log START line +
the `todo_inbox.md` entries) is the single new commit after launch-HEAD
`73ff6e` (subject names the T5 re-verify); its exact hash is recorded in the
loop-log `DONE<---` line + the close commit. The WIP-rescue commit `9e173d1`
is NOT rewritten (remains in history; its probe diff + `context_recovery.ts`
now carry verified status via this commit).

## TODO / discrepancy entries

- `TODO.md`: unchanged (no numbered entry touched; nothing to close).
- `todo_inbox.md`: one dated worker block appended (2 items): (1) the stale
  plugin "byte-identical" comment + the decision needed (fix comment vs make
  directive byte-identical — the latter needs approval); (2) the spec delta
  (`args` plain-object vs zod-object assumption — no action, recorded per the
  spec's approval boundary).

## Deliberately NOT done (per spec boundaries)

- `context_recovery.ts` (the plugin) — untouched, per spec (the directive
  question is a maintainer call — inbox entry).
- `ctx_watchdog.ts`, the live `opencode.jsonc`, FST python + `tests/`, the role
  prompts, the NAP, `.opencode/proposals/maintainer/`, everything in the loop
  folder except the append-only `loop_log.md` START line (ordered by the launch
  message; the DONE line rides the close commit, loop precedent `7edca3d`).
- The committed `compact_memory.ts` — read-only (the gate reads it; not edited).
- Cycle-2 LIVE acceptance (a real sub-agent overflow → the plugin fires) —
  still maintainer host domain (per the iter-3/4 findings: the hook did not
  fire live; hook dispatch + the tool's `context.client.session` gap are the
  maintainer's live environment, not probe-reachable).
