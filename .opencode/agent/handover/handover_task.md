# TASK — compact_memory as a plugin-registered tool (approved proposal v2, Parts 1-4)

Worker: `worker_Q4_120K`. Launch HEAD: see the NAP entry for this spec.

## Goal
Land the approved proposal **`.opencode/proposals/approved/2026-09-12_compact_memory_plugin.md`**
(read it in full FIRST — it is the design contract): a plugin-registered
`compact_memory` tool with a per-model-quant-class compaction budget,
superseding the custom tool `.opencode/tools/compact_memory.ts`.

## Read order (the contract — no broader research)
1. The approved proposal (Parts 1-4 + Evidence + Acceptance).
2. `.opencode/plugin/dev_probe_ctx.ts` — the WORKED example of a plugin-registered
   tool on this host. Build on that exact shape.
3. `.opencode/tools/compact_memory.ts` — the v1 tool being retired: carry its
   T3 mechanics (budget store, the COMPACT line, the directive constant, the
   refusal note) into the new plugin.
4. `.opencode/plugin/probes/handover_probe.mjs` — ONLY: the S10 section
   (~line 1410, checks 67-75), the S12 tail (checks 82-85, ~1790-1883), the
   FINGERPRINT array (check 43, ~line 1943), the header section map (line 271).

## Planner-verified facts (measured at spec time — do not re-derive)
- Baseline at HEAD: probe **84/84** under `node .opencode/plugin/probes/handover_probe.mjs`,
  pytest **459 + 1 #10**, ruff **F=0**.
- Host client is v1-generation: `typeof ctx.client.session.summarize === "function"`,
  `compact` undefined → the summarize path is ACTIVE. SDK methods live on the
  PROTOTYPE → detect with `typeof`, not an in-key.
- Tool context `c`: has `sessionID`, `directory`, `extra` (nested
  `extra.model.{id,name,providerID,limit}`); NO client key — the client comes
  from the plugin-ctx capture (`ctx.client`).
- `session.messages({path:{id}})` → `Array<{info, parts}>`; model = the LAST
  entry's `info.modelID` (assistant) / `info.model` (user).
- Probe: the last numbered check is 85 (S12); the S5 hygiene checks (40-45, 64)
  run LAST and pin the sandbox plugin.log kind tally (42) + the git-status /
  listing isolation (45) → S13 must be a DIRECT import (no hook fires) and all
  its fs writes must be steered into the SANDBOX via `c.directory`.
- The v1 directive constant (tools/compact_memory.ts L28-31, trimmed) is the
  byte-exact default directive.

## Scope (the diff is exactly this + bookkeeping)
1. **NEW `.opencode/plugin/compact_memory.ts`** (proposal Parts 1-3):
   - Shape per dev_probe_ctx.ts: `export default async function
     CompactMemoryPlugin(ctx) { return { tool: { compact_memory: tool({...}) }
     } }`.
   - **Classifier**: ordered rule table at the TOP of the file, maintainer-
     editable, exactly the Part 2 table (`^cpu`→0, `iq4|q4`→3, `iq3|q3`→1,
     default→1) — the ORDER is part of the semantics (CPU first; "Qwen3.8
     contains Q3" trap).
   - Args (all optional): `sessionID`, `keepTokens`, `keepMessages`, `message`
     (usage hint per Part 1: "1-3 lines: what to resume + which files to
     re-read").
   - Resolution + client paths per Part 1: sessionID `args.sessionID ??
     c.sessionID`; `typeof ctx.client?.session?.compact === "function"` → v2
     call; ELSE `typeof ...summarize === "function"` → v1
     `summarize({ path: { id }, body })`; ELSE a clear error NAMING what was
     probed (no silent fallback). keep fields in the body WHEN GIVEN; on a
     400/unexpected-field error retry ONCE without the keep fields and report
     "keep not accepted by this build".
   - Model source per Part 2: SELF `c.extra?.model?.id`; CROSS via
     `session.messages` (last entry); RPC failure / no messages → default cap
     1 + a note, never a throw.
   - Gate + store per Part 2: cap resolved AT CALL TIME; store
     `.opencode/temp/compact_budget.json` schema `version: 2`, entry
     `{ count, updated, model }`, INCREMENT-ON-SUCCESS only; READ lenient (v1
     files, missing model key). Denial → clear message naming class + cap +
     count, ZERO side effects (no increment, no compact call, no COMPACT line).
   - COMPACT line per Part 3: the v1 shape carried (`<stamp>` + model field +
     `COMPACT <sid> tokens=<t> messages=<m>` + optional pre-readout), best-
     effort, never throws; the model field is POPULATED from the resolved
     model id; t/m = the keep args when given, else the v1 defaults
     (30000/12) — v1 reporting shape preserved (planner resolution).
   - Responses per Parts 1/3: `message` ABSENT → the v1 success line + the
     directive BYTE-IDENTICAL (carry the constant verbatim). `message` GIVEN →
     the message + exactly ONE trailer line containing the pointer
     `.opencode/agent/prompts/agent_readme_post_compaction.md` (wording yours,
     one line).
   - Root resolution: `c.directory` → self-location fallback — this file lives
     at `<root>/.opencode/plugin/compact_memory.ts`, so root = the GRANDPARENT
     of the file's directory (note: the v1 file's one-level fallback assumes
     its old depth).
2. **RETIRE the v1 tool**: `git mv .opencode/tools/compact_memory.ts
   .opencode/plugin/deactivated/compact_memory_v1.ts` (the repo deactivation
   convention, cf. `deactivated/handover.ts`). Content FROZEN — add exactly
   two header comment lines: retired/superseded-by + the self-location-depth
   note (the probe drives it with an explicit `directory`, so it stays green).
3. **PROBE `.opencode/plugin/probes/handover_probe.mjs`**:
   - Re-point S10: `TOOL_TS` (line 1420) → the retired path; update the
     section header comment (1410-1412) to say it pins the RETIRED v1
     artifact. S10 check bodies UNCHANGED (v1 code is byte-identical → still
     green).
   - APPEND an **S13** section after the check-85 block, BEFORE the `S5
     hygiene` section, numbered 86+. Direct import of the new plugin module
     (type-stripped, S10 style) + a fixture mock ctx (`directory: SANDBOX`,
     `sessionID`, `extra.model`, a fake client that records calls) covering
     AT LEAST: the registration shape (default factory → `tool.compact_memory`
     with description/args/execute); classifier fixtures (IQ4→3, IQ3→1,
     `Q4KM`→3, `CPU-…`→0, unknown→1, the "Qwen3.8-27B-IQ4KT-120K" trap→3);
     the summarize path (called with path + body, the ACTIVE build shape) +
     the keep retry-once case; the compact path (when `compact` is present);
     the no-client error path (names what was probed); gate (count=cap−1
     allowed; count=cap DENIED with zero side effects; a `CPU-` model ALWAYS
     denied); increment-on-success only (a failing compact does not consume);
     the v2 store schema on disk (`version: 2`, entry `{count, updated,
     model}`); the COMPACT line WITH the model field populated; response
     shapes (default → v1 success line + directive BYTE-EXACT; `message` →
     message + one-line trailer containing the pointer path); cross-session
     model read via a fake `session.messages` (last entry `info.modelID`;
     failing RPC → default cap 1 + note, no throw).
   - New synthetic ids get a fresh prefix (e.g. `ses_qc_*`) and are ADDED to
     the FINGERPRINT array (check 43). S13 writes NOTHING to the sandbox
     plugin.log (no hook fires) → the check-42 tallies stay UNCHANGED.
   - Header: update the section map (line 271) with `S13=<n>` + the new total.
4. **BOOKKEEPING (same commit)**: `TODO.md` — a one-line status on #52 (build
   landed per the approved v2 proposal; live acceptance = his registration +
   restart). Append anything you find-but-cannot-fix to `todo_inbox.md`.

## DO-NOT-TOUCH
- `opencode.jsonc` (his live registration file — its commented tools/plugins
  lines go stale; the planner flags it, the worker does not edit it).
- `.opencode/plugin/context_recovery.ts` (the emergency hook keeps its flat
  cap — a maintainer question, not this build).
- `.opencode/maintainer/**`, `proposals/**`, `archive/**`, the draft folders.
- The S1-S12 check bodies and the S5 hygiene checks (the S10 `TOOL_TS`
  re-point + its header comment are the ONLY permitted edits there).
- FST code — the pytest/ruff baselines must not move.

## DoD (measured end states)
- `node .opencode/plugin/probes/handover_probe.mjs` → `PROBE handover:
  <84+n>/<84+n> PASS`, exit 0 (n = your S13 check count).
- pytest **459 + 1 #10**, ruff **F=0**.
- `git status`: scope = exactly the items above + bookkeeping; the v1 move is
  a 100% rename (the two header lines only).
- `rg "tools/compact_memory" .opencode/plugin/probes/handover_probe.mjs` → 0
  hits.
- One task commit (code + TODO + `handover_task_to_planner.md`), green, with
  measured gate numbers in the summary.
