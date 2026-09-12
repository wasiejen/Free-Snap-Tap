# Proposal: `compact_memory` as a plugin-registered tool (unified compaction + quant-class budget)

Status: REWRITTEN v2 (2026-09-12) — AWAITING APPROVAL.

## Rulings (maintainer, 2026-09-12, direct session)
- **Rewrite the proposal** (fresh revision, not an append to v1). This file is
  the v2; the v1 content is superseded (kept in git history).
- **CPU models excluded — by the `CPU-` name prefix.** Rationale (his): the
  small models (e.g. `CPU-Qwen3-0.6B` = 600 M params vs 27 B) are unstable at
  their size, loop very fast, are bad at tool calling and slow; the only upside
  is they can run parallel to the other models — testing showed they have
  problems with tool calling even as looprunner. Compaction on top of that is
  not worth it → cap 0.

## Problem
- The current `compact_memory` (custom tool, `.opencode/tools/compact_memory.ts`)
  cannot compact a live session in this host build: the custom-tool context
  has NO client (key-dump verified) and no HTTP listener exists
  (opencode.exe holds no TCP port; `OPENCODE_PORT` empty) → the tool fails
  with "Unable to connect".
- The budget is a GLOBAL `maxPerSession: 2` — it ignores the session's model
  class: a low-precision 3-bit quantized session gets the same compaction
  budget as a 4-bit one, and the small local models get any at all
  (`priority.md` #1, 2026-09-12: "the important thing is to get the tool
  working to enable longer unsupervised runs").

## Design
One plugin registers the tool — single source of truth; state keyed by the
resolved sessionID (maintainer ruling 2026-09-12: "unify everything as a
plugin — makes state tracking much easier").

### Part 1 — the plugin-registered tool (core)
- `.opencode/plugin/compact_memory.ts` — the plugin function captures `ctx`
  and returns `tool: { compact_memory: tool({...}) }`. **Shape verified
  live**: `plugin/dev_probe_ctx.ts` is the worked example on this host
  (the tool's `execute` gets the tool context `c`; the client is reached
  through the captured `ctx.client`).
- Args (all optional):
  - `sessionID` — defaults to the calling session; explicit = compact ANOTHER
    session (planner/looprunner compacting a sub-agent on request or in
    emergencies).
  - `keepTokens` / `keepMessages` — carried in the call BODY when given.
- Resolution:
  - sessionID: `args.sessionID` → `c.sessionID`.
  - client call: `typeof ctx.client?.session?.compact === "function"` → v2
    `compact({ sessionID })`; ELSE `typeof ...summarize === "function"` → v1
    `summarize({ path: { id }, body })` — **THE ACTIVE PATH ON THIS BUILD**;
    else a clear error naming what was probed (no silent fallback).
  - keep-fields in the body when given; on a 400/unexpected-field error,
    retry ONCE without the keep fields and report "keep not accepted by
    this build" (the generated v2 types mark the body `never`, so the first
    live call confirms the keep shape).

### Part 2 — quant-class compaction budget (NEW — priority.md #1)
- **Classifier** — an ordered rule table at the top of the plugin file
  (maintainer-editable; the ORDER is part of the semantics):

  | rule (tested on the model name) | cap | basis |
  |---|---|---|
  | `^cpu` (case-insensitive prefix) | 0 | excluded — the ruling above |
  | `iq4\|q4` (substring) | 3 | 4-bit quant: higher precision |
  | `iq3\|q3` (substring) | 1 | 3-bit quant: lower precision (may be excluded in future) |
  | (default) | 1 | all other models — preliminary |

  **ORDER MATTERS:** "Qwen3.8"/"Qwen3.5" contain the substring "Q3" —
  `CPU` is checked FIRST, then Q4, then Q3, then default. The probe pins
  this with a fixture name that would misclassify under the wrong order.
- **Model source (verified 2026-09-12):**
  - SELF-compact: `c.extra?.model?.id` — the model is NESTED under `extra` in
    the tool context (live capture `tools/dev/hot_loaded_tool.ts`:
    `extra.model.id = "Qwen3.8-27B-IQ4KT-120K"`, `providerID`, `limit`);
    top-level `modelId`/`model.id` do NOT exist (a top-level key dump shows
    only `extra` — the earlier "no model field" conclusion covered top-level
    keys only).
  - CROSS-session: the target's model is NOT in context →
    `ctx.client.session.messages({ path: { id } })` → `Array<{info, parts}>`
    (v1 types.gen L234) → the LAST entry's `info.modelID`
    (`AssistantMessage`) / `info.model` (`UserMessage`) → classify.
    RPC failure / no messages → default cap 1 + a note in the message
    (never a throw).
- **Gate:** count (from the budget store) vs the cap resolved AT CALL TIME
  from the model class. Denial → a clear message naming class + cap +
  count, NO side effects (no increment, no compact, no COMPACT line).
- **Store** (T3 mechanics carried): `.opencode/temp/compact_budget.json`,
  keyed by sessionID, INCREMENT-ON-SUCCESS-ONLY; schema bump to
  `version: 2` — each session entry is `{ count, updated, model }` (the
  model id at the last increment, for transparency — the cap itself lives in
  the classifier, not in the file).

### Part 3 — T3 state mechanics (carried)
- The COMPACT line in `.opencode/temp/ctx.log` after each successful
  compaction (best-effort append, never throws) — and its model field is
  finally POPULATED from the resolved model id (today it is always empty,
  since `context.modelId`/`context.model.id` don't exist).
- The refusal note (hand over and start fresh) on budget denial; the
  post-compaction reload directive in the success response.

### Part 4 — retirements + registration
- Retire `.opencode/tools/compact_memory.ts` (superseded).
- Drop the HTTP fallback (matched no typed endpoint; no listener in CLI
  mode). `experimental.session.compacting` stays retired from the plan
  (maintainer ruling — the hook does not expose the parameters).
- Registration (maintainer domain): live `opencode.jsonc` `plugins` array
  entry for `.opencode/plugin/compact_memory.ts` (a dropped-in file does NOT
  register without it — verified) + per-agent grants for
  planner/looprunner (the cross-session capability).
- Probe: APPEND-only S-section in `handover_probe.mjs` — fresh import of the
  plugin module, assert the registration shape, exercise `execute` against a
  fixture mock-ctx: the summarize path, the compact path, the no-client
  error path; classifier fixtures (IQ4 → 3, IQ3 → 1, `Q4KM` → 3,
  `CPU-…` → 0, unknown → 1, the "Qwen3.8 contains Q3" trap name → 3); gate
  cases (count = cap−1 allowed, count = cap denied, CPU model always denied,
  increment-on-success only).

## Evidence (measured 2026-09-12)
- Key dump (`dev_get_context_keys`): tool ctx keys = sessionID, abort,
  messageID, callID, **extra**, agent, messages, metadata, ask, directory,
  worktree — NO `client`. `dev_probe_ctx.ts` live output (in its header):
  plugin ctx HAS `client`; `summarize` = function, `compact` = undefined
  (v1-generation client); `Object.keys(client.session)` = `["_client"]` —
  SDK methods live on the PROTOTYPE, detect with `typeof`.
- Live capture `tools/dev/hot_loaded_tool.ts` (real tool execute):
  `extra.model.{id, name, providerID, limit}` + `agent = "agent_Q4_120K"`.
- SDK types (installed): v1 `Session` has NO model field
  (`types.gen.d.ts:465`); the model lives on messages (`UserMessage.model`
  L52, `AssistantMessage.modelID` L108); `session.messages` returns
  `Array<{info, parts}>` (L234); v1 exposes `summarize` ONLY, v2 exposes
  `compact` with flat parameters.
- Model names (live `opencode.jsonc`): `Qwen3.8-27B-IQ4KT-*` → 3,
  `Qwen3.8-27B-IQ3KT-*` → 1, `Gemma4-12B-Q4K*` → 3, `CPU-*` → excluded.

## Acceptance
1. Probe green (new S-section: v1 path, v2 path, no-client error path,
   classifier fixtures incl. the ordering trap, gate allow/deny/increment).
2. Live self-compact of a scratch session → success, budget increment,
   COMPACT line WITH the model field populated.
3. Live cross-session compact (a sub-agent's sessionID) → success, keyed by
   THAT session, cap from THAT session's model.
4. Budget-denied fire → clear denial naming class + cap + count, no side
   effects; a `CPU-` model session → always denied (cap 0).

## Status
REWRITTEN v2 (2026-09-12, direct session ses_f6976031bffeRa8gNNcpy5FoYj) per
the maintainer's rulings (rewrite; `CPU-` prefix exclusion confirmed with the
instability rationale above). AWAITING APPROVAL — the maintainer is checking
this revision now; the build does NOT start before his approval.
