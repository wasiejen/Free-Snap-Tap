# TASK — Compaction-lifecycle CYCLE 1 + plugin rename (approved: `proposals/approved/2026-09-11_compaction-lifecycle.md` "both cycles approved" — this is Cycle 1 only — + `proposals/approved/2026-09-11_plugin-scope-tool-rename.md` item 2)

FIRST read `AGENTS.md`, `agents_repo.md` (repo parts as needed), this file, and the
two approved proposals named above (the design of record — the proposal beats this
spec wherever they conflict; where the proposal is silent, this spec's DoD rules).

## Goal

Build the approved compaction-lifecycle design's Cycle 1 ("core"):
1. **L1 (data):** ctx.log (`.opencode/temp/ctx.log`) gains a **tool name** field on
   its normal lines (free: `tool.execute.after` carries the tool name), plus a new
   **COMPACT line** format: `date_time <model> COMPACT tokens=<t> messages=<m>
   (<pre-readout>)` — written BY THE TOOL (see 2), session id included.
2. **L2 (action):** the FIRST custom tool — `.opencode/tools/compact_memory.ts`,
   `execute(args, context)`:
   - takes BOTH knobs `{tokens?, messages?}` (args), passed through to
     `session.compact`'s `keep` (both exposed so forked sessions can be tested
     with different pairs — the design's open empirical test 2);
   - targets `context.sessionId` (logged);
   - before compacting: checks the per-session compaction budget — **≤2 per
     session id (self + emergency combined)** — and REFUSES with a "hand over and
     start fresh" result note when exhausted (routes into the stop-line/handover
     protocol);
   - on success: writes its own COMPACT line (in-process file append — the
     design explicitly allows this; never throws), increments the budget state;
   - returns a short result note ("compacted; kept last N messages / T tokens")
     + the re-application directive AS A POINTER to the committed file
     (`.opencode/system_prompts/post_compaction_reapply.md`) — do NOT embed the
     directive's content in code (the design's point: protocol changes must not
     require a code change).
   - Budget state must be PERSISTED (a small state store the future Cycle-2
     plugin hook will share — e.g. a json/sqlite file under `.opencode/temp/`;
     your call on the mechanic, record it in your summary) — the in-memory-only
     `nudgeFired` pattern is NOT acceptable for the budget.
3. **Re-application directive file:** write
   `.opencode/system_prompts/post_compaction_reapply.md` VERBATIM per the
   proposal's "Re-application directive" block (planner will diff it against
   the proposal).
4. **L3 (decision):** the standing trigger rule in the THREE acting role
   prompts (`.opencode/system_prompts/agents/prompt_agent_planner.md`,
   `prompt_agent_task.md`, `prompt_agent_explorer.md` — NOT the looprunner):
   exactly ONE short block per prompt (≈3–5 lines), anchored on the design's
   text: "≥80 % with a big unit ahead → `compact_memory` before starting it;
   ≥90 % → compact now, keep back to the task spec" + one line noting the tool
   enforces the ≤2 budget and its refusal means hand over per the stop line.
   Placement: adjacent to each prompt's existing context-budget/stop-line
   reference. Keep it reference-style (short), never restate the protocol.
5. **Rename (approved item 2):** `git mv .opencode/plugin/handover_v2.4.ts` →
   `.opencode/plugin/ctx_watchdog.ts`. Update ALL live references: the probe's
   `PLUGIN_TS` path + its header comment, the `gauge.mjs` line-4 comment. Add a
   one-line rename note to the plugin's header block (version history stays).
   VERIFIED by the planner: NO config references the plugin filename (opencode
   auto-loads `.opencode/plugin/*.ts`) — do NOT touch `opencode.jsonc`.

## Out of scope (do NOT build — Cycle 2 is the next task)

- The plugin `session.error` hook (informed-keep emergency recovery), the
  activation flag, synthetic directive injection, over-budget clean-fail
  wiring, the `-WARNING` verification. Do not add a `session.error` hook.
- Any FST python code (no behavior change — this is meta-only).
- The retired gauge tool (proposal item 1 is RETIRED — the compaction tool is
  the first custom tool).

## SDK facts / verification needed (the maintainer's DRAFT is a generic sketch —
verify, do not trust it)

- The maintainer's reference draft: `proposals/maintainer/inbox_planner/draft/
  compact_memory/compact_memory.ts` — READ IT (its `context.client.session
  .compact(...)` + `promptAsync` call shapes are the best available wiring
  reference), but the design supersedes it: it has NO knobs, NO budget, an
  embedded directive, and a hook (Cycle 2). DO NOT edit anything in the draft
  folder.
- The live plugin imports `type { Plugin, PluginInput } from "@opencode-ai/plugin"`
  (the draft's `@opencode/sdk` may or may not be the right specifier for the
  TOOL export). The plugin's header (≈line 165) cites the SDK type facts
  verified from `@opencode-ai/plugin/dist/index.d.ts` +
  `@opencode-ai/sdk/dist/gen/types.gen.d.ts`. Locate those installed type defs
  (opencode install / global `~/.config/opencode/node_modules`) and verify
  BEFORE writing the tool: (a) which module exports the `tool()` constructor
  for a `.opencode/tools/*.ts` file, (b) the exact `execute(args, context)`
  signature + what `context` provides (`sessionId`, `client`), (c) the
  `session.compact` parameter shape (does `keep` take `{tokens, messages,
  system?}` — the repo `opencode.jsonc` `compaction.keep` shows the config
  shape). Record the verified facts in your summary.
- The probe host is the system `node` (v24) importing the TS files DIRECTLY
  (type-stripping, flag-free — the plugin already loads this way at
  `handover_probe.mjs:313`); the tool file must load the same way.

## Current state (planner-verified at spec time)

- Plugin: `.opencode/plugin/handover_v2.4.ts` (715 lines; v2.8 header block;
  ctx.log writer `appendCtxLog(modelId, readout)` ≈516 → `localStamp()
  [model] readout`; gauge core `scripts/gauge.mjs` shared; nudge ladder
  in-memory `nudgeFired` Map ≈541).
- Probe: `.opencode/plugin/probes/handover_probe.mjs` — 63 checks, sandboxed
  (its own temp dir), `PROBE handover: 63/63 PASS` exit 0 baseline.
- Baselines: pytest **451 passed + 1 known #10 warning**; `ruff check
  --select F .` = **0**; probe **63/63**.
- `ctx.log` sample line: `2026-09-10_19-06 Qwen3.8-27B-IQ4KT-120K (50%/59K)`
  (tool-name field to be added — exact shape your call, pinned by the probe).

## Definition of done

1. `node .opencode/plugin/probes/handover_probe.mjs` → `PROBE handover: N/N
   PASS`, exit 0, with N > 63 and NEW checks covering at least: the tool file
   imports + exposes `compact_memory`; `execute` calls `session.compact` with
   the passed-through `keep` knobs (fake client captures the call); the
   COMPACT line is written (session id + params + pre-readout present); the
   budget allows 2 compactions and refuses the 3rd with the hand-over note;
   the ctx.log normal lines carry the tool name; the tool's return contains
   the re-application file pointer; the tool never throws (error paths return
   notes).
2. pytest suite unchanged green: `& .\.venv\Scripts\python.exe -m pytest -q`
   → 451 passed + 1 known #10 warning (no FST code touched).
3. `& .\.venv\Scripts\ruff.exe check --select F .` → 0.
4. Grep-clean rename: NO `handover_v2.4` references left in
   `.opencode/plugin/` (probe/gauge included) — historical references in
   `TODO.md` / `todo_records.md` / NAP / `proposals/` / `archive/` are
   PAST-TENSE RECORDS and stay untouched.
5. `post_compaction_reapply.md` matches the proposal block verbatim.
6. Exactly one short standing-rule block added per acting prompt (3 files);
   nothing else in those prompts changed; `prompt_agent_looprunner.md`
   untouched.
7. Your commit: code + probe + prompts + directive file + `TODO.md` (add
   nothing — the entries close on the planner's verification; append to
   `todo_inbox.md` only if you find something worth flagging) + the summary
   file, ONE commit. NEVER stage `opencode.jsonc` (uncommitted by design) or
   anything under `proposals/maintainer/`.

## Approval boundary

Pre-approved by the two `approved/` proposals named above (meta-only: plugin /
tool / probe / role prompts / a system-prompt file — NO FST behavior change,
NO opencode.jsonc edit, NO observable FST change). If you hit a genuine design
fork the proposals don't answer, pick the minimal option, RECORD the decision
+ rationale in your summary, and flag it in `todo_inbox.md`.

## Worker

`worker_Q4_120K` (default — same model, high precision; the prior plugin
builds landed on this worker).
