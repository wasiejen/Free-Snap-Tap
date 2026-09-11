# TASK T5 (re-verify) — recovery-plugin verification + WIP→commit conversion (Cycle 2, L4+L5)

FIRST read `AGENTS.md`, `agents_repo.md` (+ the repo parts it names as needed),
this file, the L4/L5 sections of the approved proposal
(`.opencode/proposals/approved/2026-09-11_compaction-lifecycle.md`), the
COMMITTED `.opencode/tools/compact_memory.ts`, and the WIP-rescue commit
`9e173d1` (its `context_recovery.ts` + probe S10/S10→S10 diff).

## GATE (verify FIRST, before ANY work)

This re-verify is blocked until the maintainer has **committed**
`.opencode/tools/compact_memory.ts` in the `tool()` form (his live rewrite).
Confirm the gate is met, in order:
1. `git status` → `compact_memory.ts` is NOT in the "Changes not staged" list
   (i.e. it is committed, not the maintainer's uncommitted live edit).
2. `git show HEAD:.opencode/tools/compact_memory.ts` contains
   `export default tool(` (the committed file IS the tool() form).
If the gate is **NOT met** → do NO work: report "T5 re-verify still gated on the
maintainer committing `compact_memory.ts` (tool() form)" and STOP (leave the tree
clean). Do not launch, do not edit, do not commit.

## Why the probe needs re-alignment (context)

The T5 build is already a WIP rescue (`9e173d1`): `context_recovery.ts` (the
recovery plugin, 296 lines) + the probe S10/S10→S10 checks. S10 (checks 67-75) was
proven 74/74 against the **committed T3 JSON-schema shape** of
`compact_memory.ts` at HEAD. The maintainer then REWROTE `compact_memory.ts` to
the `tool()` form (still uncommitted as of this spec). The `tool()` form's default
export **IS the tool** (`{ description, args (zod object), execute }`) — NOT
`{ tools: { compact_memory: { … } } }`. So S10 check 67 (the export-shape check)
and the downstream `cmTool` access are broken against the tool() shape and must be
re-aligned. Checks 68-75 (budget store / COMPACT line / directive mechanics) and
all of S10→S10 are UNCHANGED.

## Work (execution-ready)

1. **Re-align S10 check 67 + the `cmTool` access** in
   `.opencode/plugin/probes/handover_probe.mjs` to the tool() shape:
   - `cmTool = toolMod.default` (currently `toolMod.default?.tools?.compact_memory`
     at ~line 1409).
   - Check 67's arg-name assertion `cmTool.parameters?.properties` (line ~1415)
     → `Object.keys(cmTool.args?.shape ?? {})` (the zod `args` object's `.shape`),
     still `["keepTokens","keepMessages","sessionID"]`; KEEP the
     `typeof cmTool.description === "string"` + `typeof cmTool.execute ===
     "function"` asserts; update check 67's label + its evidence line to the tool()
     shape.
   - The S10 budget-persistence check (~line 1515):
     `freshMod.default.tools.compact_memory.execute(…)` →
     `freshMod.default.execute(…)`.
   - **FIRST re-confirm the COMMITTED `compact_memory.ts` shape** (it may differ
     slightly from the uncommitted rewrite): if `description` / `args` / `execute`
     are named differently in the committed file, align the probe to the committed
     reality, not to this spec — and record the delta in your summary.
2. **Full probe:** `node .opencode\plugin\probes\handover_probe.mjs` →
   `PROBE handover: N/N PASS`, exit 0 (S10 checks 67-75 green against the committed
   tool() shape AND S10→S10 green). Reconcile the probe header's total-count
   comment (it currently reads a stale figure) to the measured `N/N`.
3. **Gate:** `& .\.venv\Scripts\python.exe -m pytest -q` → 451 passed + 1 known
   #10 warning; `& .\.venv\Scripts\ruff.exe check --select F .` → F=0 (no FST
   code touched).
4. **Convert the WIP rescue to the PROPER task commit:** one commit carrying the
   probe re-alignment (+ any S10→S10 completion still open at `9e173d1`) with a
   subject naming the T5 re-verify. The WIP-rescue commit `9e173d1` stays as
   history — do NOT rewrite/fixup/amend it.

## Do NOT touch

`ctx_watchdog.ts`, the live `opencode.jsonc` (NEVER stage it — it is uncommitted
by design; the plugin only READS it), FST python + `tests/`, the role prompts,
the NAP, anything under `.opencode/proposals/maintainer/`, the loop folder. The
PLUGIN (`context_recovery.ts`) is NOT changed by this task — it was built in the
WIP rescue; only the PROBE is re-aligned. The committed `compact_memory.ts` is
read-only for this task (the gate reads it; it is NOT edited). If the committed
tool shape changed the directive / budget / COMPACT-line strings vs the WIP,
the probe's S10 checks 68-75 targets update to match — record any such change in
your summary.

## Definition of done

1. `node .opencode\plugin\probes\handover_probe.mjs` → `PROBE handover: N/N
   PASS`, exit 0 (S10 checks 67-75 re-aligned to the committed tool() shape;
   S10→S10 green; header total reconciled).
2. pytest 451 + 1 known #10 warning; ruff F=0.
3. ONE commit (probe re-alignment + any S10→S10 completion + summary + your
   `TODO.md` / `todo_inbox.md` entries if any); the WIP-rescue commit `9e173d1`
   is NOT rewritten.
4. Summary (`.opencode/handover/handover_task_to_planner.md`): measured
   probe / pytest / ruff lines VERBATIM, the exact check-67 diff, the commit
   hash, the final probe count, what you deliberately did NOT do. Follow the
   AGENTS.md commit routine (gauge after commit; your loop-log START/DONE lines
   per the protocol).

## Approval boundary

Pre-approved (meta-only: the probe; no observable FST change; the plugin + tool
already exist — this task re-aligns the probe and converts the WIP to a proper
commit). If the committed `compact_memory.ts` shape differs from this spec's
assumption, align to it and RECORD the delta in your summary + `todo_inbox.md`.

## Worker

`worker_Q4_120K` (fresh session — never a resume).
