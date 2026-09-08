# TASK — Phase 6 / Tier 1 — plugin v2: ownership (deterministic handover)

FIRST read `AGENTS.md`, then `.opencode/handover_task_to_planner.md` (v1.1 summary +
probe recipe), then the current `.opencode/plugin/handover.ts` (v1.1).

## Goal
Add the v2 ownership behaviors to the plugin — deterministic handover file
handling + planner context gauge — WITHOUT touching the built-in `task` tool
(the plugin observes and owns files; it never drives delegation). Keep the
v1.1 log (incl. the `message.part.delta` filter) untouched.

## Deliverables (implement exactly these four things; nothing else)

1. **Task-file gate (both `tool.execute.before` and `.after`, only for
   handover delegations):** treat a `task` call as a HANDOVER delegation iff
   `args.prompt` contains the string `.opencode/handover_task.md`. Non-handover
   delegations (explore, reviewer, user ad-hoc) must be completely
   unobservable in v2 behavior (no file writes, no warns).
2. **Pre-flight check (`tool.execute.before`, handover only):** if
   `.opencode/handover_task.md` is missing or empty → append a WARN line to
   `plugin.log`: `{"ts":…,"kind":"warn","reason":"handover-task-file-missing-or-empty","call":…,"session":…}`.
   NEVER block or mutate the delegation — observation only.
3. **Summary mirror (`tool.execute.after`, handover only):** overwrite
   `.opencode/handover_task_to_planner.md` with the worker final message from
   the `output` field, VERBATIM — the log-truncation ladder applies to
   `plugin.log` lines only, NOT to this file. If `output` is empty → do not
   touch the file. If `metadata.truncated` is true → append one trailer line
   `\n\n[TRUNCATED by opencode tool_output cap — see plugin.log call <callID>]`.
   All fs writes best-effort: never throw out of the hook.
4. **ctxgauge injection (`experimental.chat.system.transform`):** append one
   line — exactly `ctx: <output of .opencode/ctxgauge/peek.py>` (the gauge
   emits `CTX=n (p%) REM=m …`) — to the planner's system prompt. Rules:
   - First READ the hook signature from `@opencode-ai/plugin` in
     `.opencode/node_modules` and probe the input payload OFFLINE before
     implementing — do not guess.
   - Run the gauge via the `PluginInput` shell (`$`): detached/best-effort —
     a hook must never block on it. If the shell is absent at runtime, the
     line is simply omitted (do not fall back to node child_process in v2).
   - Planner-only gating: use whatever agent identifier the transform input
     exposes. **Decided (planner call, do not second-guess): if the payload
     exposes no clean agent identifier, DO NOT inject for all agents —
     omit the line and record a design-flag in your summary.**

## Verification (offline, same recipe as v1/v1.1)
- Runner: no node/bun on PATH → Electron `RUN_AS_NODE=1` Node 24 (v1 recipe).
- Probe scenarios, each asserted:
  1. `before(task)` handover-shape with spec present → no warn line; with the
     spec file temporarily renamed away (try/finally restore, leave the tree
     EXACTLY as found) → exactly one warn line, valid JSON.
  2. `before(task)` non-handover prompt → no warn, no file writes.
  3. `after(task)` handover-shape with synthetic final message + `truncated:
     false` → mirror file overwritten with exactly that content (try/finally
     restore the pre-probe file content). Same with `truncated: true` → trailer
     present. With `output` empty → mirror file untouched.
  4. `system.transform`: per the probed signature — if injection implemented:
     gauge line appended for the planner shape; omitted for non-planner /
     no-shell shapes (no throw).
  5. All `plugin.log` lines from the probe: `JSON.parse`-able, ≤ 2000 chars.
- `& .\.venv\Scripts\python.exe -m pytest -q` → expect **434 passed**.
- Do NOT run a live cycle here — v2's real proof needs opencode started with
  the v2 plugin (maintainer restart), exactly as v1's live DoD worked. Note
  that in the summary.

## DoD for next session (planner's record — say this in the summary)
One real delegation where the mirror write happened **BY THE PLUGIN** (that
cycle's task spec drops the "worker writes the summary" line) + the gauge line
visible in the planner context. Both prove against a fresh quiet
(v1.1-filtered) log.

## Summary + commit
- EXECUTIVE SUMMARY → `.opencode/handover_task_to_planner.md`: the transform
  hook signature you found + what you implemented, probe results per scenario
  1–5, pytest result, the design-flags (incl. agent-identifier findings — the
  `agent` field evidence from v1 logs is in the v1.1 summary), effective-at-
  next-restart note, TODO append.
- Commit per AGENTS.md: files `.opencode/plugin/handover.ts`,
  `.opencode/handover_task.md`, `.opencode/handover_task_to_planner.md`,
  `TODO.md` (append-only). Subject one-liner:
  `Add handover plugin v2: task gate, summary mirror, ctxgauge injection`.
- Do NOT touch `.opencode/handover_planner.md`; do NOT restart/reconfigure
  opencode; do NOT edit `opencode.jsonc` (it has an uncommitted maintainer
  edit — leave it alone).
