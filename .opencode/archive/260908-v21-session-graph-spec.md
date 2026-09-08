# TASK — Phase 6 / Tier 1 — plugin v2.1: graph-based session discrimination

FIRST read `AGENTS.md`, `.opencode/handover_task_to_planner.md` (v2 EXECUTIVE
SUMMARY — probe recipe + the transform findings incl. TODO #14), the current
`.opencode/plugin/handover.ts` (v2), and `opencode.jsonc` READ-ONLY for the
agent/model config.

## Context (planner's reasoning — this fixes TODO #14 the deterministic way)
v2's ctxgauge gate `startsWith("planner")` can only ever match IF a transform
payload exposed an agent identifier — v2 probed: it does not (SDK types say
transform input ≈ `{sessionID?, model}`, TODO #14 evidence-logged). The
identifiable alternative we decided (and implemented exactly — it survives name
renames and shared planner/worker model IDs, see opencode.jsonc for the
colliding `llama-swap/Qwen3.8-…_MTP` on planner AND default worker):
**session-graph discrimination** — the plugin already sees every delegation:
`task` after metadata = `{parentSessionId, sessionId}`. Children = delegation
sessions → skip injection; root sessions → inject.

## The change (decided — implement exactly this, keep ALL v2 behavior byte-for-byte)
1. Plugin-scope state `childSessions: Set<string>` (the plugin function body
   runs once at opencode start — closure state is fine).
2. Registration (all best-effort, in the existing hooks):
   - every `task`-shaped `tool.execute.after`: add `metadata.sessionId`.
   - every `session.created` `event`: add the created session id. Shape
     evidence: the current `.opencode/plugin.log` contains one live
     `session.created` line (read-only) — verify field names against it + the
     `@opencode-ai/plugin` types before coding.
3. New transform gate — compute in order:
   - `sessionID` missing → omit line (log nothing new), no throw.
   - `sessionID` ∈ childSessions → omit.
   - if an agent-like identifier IS visible in the payload (v2 evidence lines
     will tell; keep the check, zero code cost) and does NOT start with
     `planner` → omit.
   - else → inject the gauge line (v2 mechanism unchanged: `$` shell, 3 s
     bounded, cached, no child_process fallback).
   - The v2 `kind:"transform"` evidence line stays — it is what settles
     payload truth in the post-restart log.
4. Known residual (note it in the summary, do NOT over-engineer): a child's
   first transform may fire before its `session.created` registration is
   visible → at most ONE leaked gauge line per child session, only if the
   `session.created` evidence shows it does not carry the session id early.
5. Keep the v2 task-file gate, warn lines, and summary mirror completely
   unchanged (they already ignore session identity — verify in the probe).

## Verification (offline, same Electron `RUN_AS_NODE=1` Node 24 recipe)
- **Regression: re-run the FULL v2 probe set** (v2 spec's scenarios 1–5 are in
  the git history — `git show 2a4996c:.opencode/handover_task.md` — all must
  still pass byte-for-byte expectations).
- New graph scenarios, each asserted:
  1. transform, root session, no children registered → gauge line appended
     (fake shell).
  2. feed a `task` after with `metadata.sessionId="child-1"` → transform on
     `child-1` → omitted, no throw.
  3. feed a `session.created` event (live-shape) → transform on that session →
     omitted.
  4. transform with `sessionID` missing → omitted, no throw, no new noise lines
     beyond the evidence line.
  5. every `plugin.log` line still `JSON.parse`-able and ≤ 2000 chars.
- `& .\.venv\Scripts\python.exe -m pytest -q` → **434 passed**; ruff `F` → 6.
- No live cycle here — proof needs a maintainer restart with the v2.1 plugin.

## Next-session note (planner's record — say this in the summary)
Post-restart scan must show: `kind:"transform"` lines appear ONLY under root
(planner) sessions — children skipped — which closes TODO #14 structurally.
The v2 proof cycle (mirror written BY THE PLUGIN, gauge line in planner
context) then runs against this code.

## Summary + commit
- EXECUTIVE SUMMARY → `.opencode/handover_task_to_planner.md`: what the
  `session.created` live line actually contained, the gate implementation,
  regression + graph probe results, pytest/ruff, next-session scan instruction.
- You MAY stamp `.opencode/handover_planner.md` (per TODO #15 rule: stamp +
  one status line only — substantive planning stays with the planner).
- Commit per AGENTS.md: `.opencode/plugin/handover.ts`,
  `.opencode/handover_task.md`, `.opencode/handover_task_to_planner.md`,
  `.opencode/handover_planner.md` (stamp/status only), `TODO.md` (append-only
  — TODO #14: mark resolved-by-design, do NOT rewrite the entry, append a
  `resolved-by` pointer). Subject one-liner:
  `Handover plugin v2.1: graph-based session discrimination for ctxgauge gate`.
- Do NOT restart/reconfigure opencode; do NOT edit `opencode.jsonc`.
