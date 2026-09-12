# Proposal: `compact_memory` as a plugin-registered tool (unified compaction)

Status: AWAITING APPROVAL

## Problem
- The current `compact_memory` (custom tool, `.opencode/tools/compact_memory.ts`)
  cannot compact a live session in this host build: the custom-tool context
  has NO client (key-dump verified) and no HTTP listener exists
  (opencode.exe holds no TCP port; `OPENCODE_PORT` empty).
- Evidence (2026-09-12, session ses_f6b7c5242ffeZpNl0Ar8mILWua):
  - `get_context_keys` probe: tool contextKeys = sessionID, abort, messageID,
    callID, extra, agent, messages, metadata, ask, directory, worktree —
    no client.
  - `dev_probe_ctx` plugin probe (`.opencode/plugin/dev_probe_ctx.ts`,
    output in its header comment): the PLUGIN ctx HAS a client
    (pluginCtxKeys: client, project, worktree, directory,
    experimental_workspace, serverUrl, $); `client.session.summarize` is a
    FUNCTION, `client.session.compact` is UNDEFINED → this host exposes a
    **v1-generation client**; the tool's execute context inside the plugin
    still has NO client → the client must be captured from the plugin ctx
    (closure). Gotcha: `Object.keys(client.session)` = `["_client"]` — SDK
    methods live on the PROTOTYPE, so detect with `typeof`, not key listing.
  - The current tool's call `client.session.compact({path:{id}, body:{keep}})`
    matches NEITHER installed generation (v1: `summarize` only; v2:
    `compact({sessionID})` with `body?: never`).

## Design
One plugin registers the tool — single source of truth; state keyed by the
resolved sessionID (maintainer ruling 2026-09-12: "unify everything as a
plugin — makes state tracking much easier").

**Part 1 — the plugin-registered tool (core).**
- `.opencode/plugin/compact_memory.ts` — plugin returning
  `tool: { compact_memory: tool({...}) }` (shape verified against installed
  types: `Hooks.tool?: { [key]: ToolDefinition }`, plugin dist L179).
- Args (all optional):
  - `sessionID` — defaults to the calling session; explicit = compact
    ANOTHER session (planner/looprunner compacting a sub-agent on request
    or in emergencies).
  - `keepTokens` / `keepMessages` — the agent's keep judgment, carried in
    the call BODY when given (all optional).
- Resolution (robustness on the real axis — maintainer ruling: "use the one
  that actually exists, both implemented in case I switch machines/versions";
  no speculative field-spelling variants, per the key-dump knowledge):
  - sessionID: `args.sessionID` → `context.sessionID`.
  - call: `typeof ctx.client?.session?.compact === "function"` → v2
    `compact({ sessionID })`; ELSE `summarize` → v1
    `summarize({ path: { id }, body })` — THE ACTIVE PATH ON THIS BUILD;
    else a clear error naming what was probed (no silent fallback).
  - keep-fields in the body when given; on a 400/unexpected-field error,
    retry ONCE without the keep fields and report "keep not accepted by
    this build" (the generated v2 types mark the body `never`, so the
    first live call confirms the keep shape).

**Part 2 — T3 state mechanics (ported unchanged).**
- Budget gate `.opencode/temp/compact_budget.json` (keyed by sessionID),
  increment-on-success, COMPACT line in `.opencode/temp/ctx.log`,
  post-compaction directive in the response.

**Part 3 — retirements + registration.**
- Retire `.opencode/tools/compact_memory.ts` (superseded).
- Drop the HTTP fallback (matched no typed endpoint; no listener in CLI
  mode). Retire `experimental.session.compacting` from the plan (maintainer
  ruling — the hook does not expose the parameters).
- Registration (maintainer domain): live `opencode.jsonc` `plugins` array
  entry for `.opencode/plugin/compact_memory.ts` (a dropped-in file does NOT
  register without it — verified this session); per-agent grants for
  planner/looprunner (the cross-session capability).
- Probe: APPEND-only S-section in `handover_probe.mjs` — fresh import of the
  plugin module, assert the tool-registration shape, exercise execute
  against fixture mock-ctx for the summarize path, the compact path, and
  the no-client error path.

## Acceptance
1. Probe green (new S-section: v1 path, v2 path, no-client error path).
2. Live self-compact of a scratch session → success, budget increment,
   COMPACT line.
3. Live cross-session compact (a sub-agent's sessionID) → success, keyed by
   THAT session.
4. Budget-denied fire → clear denial, no side effects.

## Status
AWAITING APPROVAL. Probe results folded in (2026-09-12): this build = v1
client (`summarize`); the v2 `compact` branch stays as the
machine/version hedge. The v2 keep-in-body shape is the one open
wire-format question — Part 1's 400-retry makes both outcomes safe.
