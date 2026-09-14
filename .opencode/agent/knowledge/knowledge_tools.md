# knowledge_tools.md — opencode custom tools (`.opencode/tools/*.ts`)

Gained, verified knowledge for writing and debugging custom tools. Not
instructions/protocol — facts that save lookups. Format per the README:
**Do** / **Why (evidence)** / **Ref** / **Keys**.

## Tool shape: no `name` field — the host registers by FILENAME
- **Do:** default-export `tool({description, args, execute})`; do NOT add a
  `name` field. Name the FILE the way you want the tool called
  (`loop_log.ts` → `loop_log`).
- **Why (evidence):** verified across ctx_gauge / loop_log / block_transfer —
  the host names the tool by filename; the `tool()` form carries no `name`.
- **Ref:** `.opencode/tools/*.ts` headers; loop-tool-batch proposal
  (implemented, 2026-09-12).
- **Keys:** tool(), register, name, filename, custom tool, default export.

## The `description` is the agent-facing usage channel
- **Do:** write `description` as usage documentation (modes, args, semantics,
  boundaries) — it is the primary way an agent learns to use the tool.
- **Why (evidence):** the description is what the agent sees; a one-liner
  leaves usage opaque (maintainer inbox item on block_transfer).
- **Ref:** block_transfer.ts description rewrite; loop_log.ts.
- **Keys:** description, usage, help, agent-facing, schema.

## Context fields a custom tool receives
- **Do:** read `context.sessionID` (CAPITAL `ID`), `context.messageID`,
  `context.agent` directly. Do NOT assume `context.session.id` unless you have
  observed that shape in your specific build.
- **Why (evidence):** verified live via the maintainer's `session_info` probe
  (2026-09-12) — the host populates sessionID / messageID / agent on the tool
  context.
- **Ref:** `session_info.ts` probe output;
  `maintainer/done/knowledge_opencode_tools_plugins.md` §1.
- **Keys:** context, sessionID, messageID, agent, Tool.Context.

## Model identity lives in `context.extra.model` (NOT a top-level field)
- **Do:** read the session's model as `context.extra?.model` — the object
  carries `id` (raw model id, e.g. `Qwen3.8-27B-IQ4KT-120K`), `name`,
  `providerID` (e.g. `llama-swap`), `limit.{context,output}` (the window),
  `capabilities`. Top-level `context.modelId` / `context.model` do NOT
  exist; a key-dump that lists top-level keys only will report "no model
  field" even though `extra` nests the full model.
- **Why (evidence):** live capture printed from a real tool's execute
  (`.opencode/tools/dev/hot_loaded_tool.ts` header comment, session
  ses_f6a7938a0ffeWOfcOHOmX9PR6P, 2026-09-12): `extra.model.id =
  "Qwen3.8-27B-IQ4KT-120K"`, `agent = "agent_Q4_120K"`; maintainer note in
  the loop_log-v2 approval ("context.extra.model.id for the model_name");
  `dev_get_context_keys` confirms `extra` in the top-level key list.
- **Ref:** `.opencode/tools/dev/hot_loaded_tool.ts`; `proposals/approved/
  2026-09-12_loop_log-v2.md` (`--todo` note); TODO #52.
- **Keys:** context.extra, model.id, providerID, limit, window, agent,
  key dump, nested, model_name.

## `context.client` is ABSENT in this host build's tool context (CONFIRMED)
- **Do:** do NOT rely on `context.client` (or `context.api`) for SDK calls
  in a CUSTOM TOOL — the client is intentionally not injected into the tool
  context (by design, not a bug). Prefer direct context fields (sessionID /
  messageID / agent). **A tool that needs the client must be registered from
  a PLUGIN** (see `knowledge_plugins.md`, "Plugins can register tools").
- **Why (evidence):** the `get_context_keys` probe (definitive key dump,
 2026-09-12) returned `clientKeys: []` and `sessionKeys: []` — i.e.
  `context?.client` is undefined, so `client` is ABSENT (not "present but
  lacking .app"). The earlier `context.client.app` throw was `client` itself
  being undefined. Maintainer Q&A (2026-09-12): the documented custom-tool
  context is intentionally limited — the SDK client is not injected there.
  This is why compact_memory's client path fails here → it fell to the HTTP
  fallback → no listener on 4096 → "Unable to connect" (TODO #52).
- **Ref:** `get_context_keys.ts` run in session ses_f6b7c5242ffeZpNl0Ar8mILWua;
  `maintainer/done/plugin_exposed_custom_tool.md`; TODO #52.
- **Keys:** context.client, context.api, get_context_keys, contextKeys,
  clientKeys, sessionKeys, absent, intentionally, plugin registration, guard.

## Installed SDK method shape — grep the `.d.ts`, don't trust examples
- **Do:** before writing any SDK/session call, grep the installed types:
  `.opencode/node_modules/@opencode-ai/sdk/dist/{gen,v2/gen}/*.d.ts` for the
  method name + url.
- **Why (evidence):** the method is version-dependent. Verified (2026-09-12):
  **v1** exposes only `session.summarize` (url `/session/{id}/summarize`) — NO
  `compact`; **v2** exposes `summarize` + `compact` (url
  `/api/session/{sessionID}/compact`, FLAT `parameters`). Mixing generations
  (v1 shape + v2 method) is a bug.
- **Ref:** grep of `.opencode/node_modules/@opencode-ai/sdk/dist/`; TODO #52.
- **Keys:** sdk.gen.d.ts, summarize, compact, session, url, version, v1, v2.

## HTTP fallback only works with a live server
- **Do:** only use an HTTP call if a server is actually listening. Verify
  first: `Get-NetTCPConnection -LocalPort <port> -State Listen`. The CLI does
  not necessarily start a server. The documented endpoint is
  `POST /api/session/{sessionID}/compact`.
- **Why (evidence):** running via the CLI does not imply a listener on 4096; a
  request with no listener fails with "Unable to connect."
- **Ref:** `maintainer/done/knowledge_opencode_tools_plugins.md` §5;
  live `Get-NetTCPConnection` check (2026-09-12).
- **Keys:** http, localhost, 4096, listener, Get-NetTCPConnection, fallback.

## Registration is the maintainer's domain
- **Do:** do NOT register tools in a repo config that gets staged. The live
  `opencode.jsonc` + per-agent tool-access grant is the maintainer's; the repo
  copy is commented out by design. A new/changed tool takes effect at the
  maintainer's next process restart.
- **Why (evidence):** registration is host-side and outside the repo's
  committed scope.
- **Ref:** loop-tool-batch proposal, "Registration is the maintainer's domain"
  (each part).
- **Keys:** opencode.jsonc, register, grant, restart, host-side.

## File-path tools need a sandbox guard
- **Do:** for any tool that reads/writes paths, resolve each path
  (`path.resolve(cwd, p)`) and allow it only if it equals or lies under an
  allowed root (cwd + `TEMP`/`TMP`), case-insensitive (Windows) — BEFORE any
  filesystem access, so a violation performs no read or write.
- **Why (evidence):** block_transfer was found with no sandboxing (arbitrary
  read+write); the guard closed the hole with no behavior change for allowed
  paths.
- **Ref:** block_transfer.ts `sandboxCheck`; loop-tool-batch part 1.
- **Keys:** sandbox, path.resolve, allowed root, TEMP, TMP, guard.

## Probe pattern for a tool
- **Do:** verify a tool by importing the module fresh and asserting the
  `tool()` shape (description/args/execute, no `name`) + behavior against a
  temp FIXTURE (never the live folder/db). Update the probe header total —
  APPEND-only checks, never renumber.
- **Why (evidence):** the S10/S12 probe sections are the established pattern;
  fixture-based so a probe never mutates real state.
- **Ref:** `handover_probe.mjs` S10/S12; ctx_gauge probe.
- **Keys:** probe, fixture, import fresh, shape, header total, S10, S12.

## compact_memory: the cross-session contract (SELF sync / CROSS dispatch)
- **Do:** cross-compact ANOTHER session with an explicit `providerID` +
  `modelID` pair (the OVERRIDE — no model read; the pair goes verbatim in
  the summarize body). Pair-less cross reads the target's model via the
  messages RPC. The budget is tracked per TARGET session (not the initiator).
  SELF compaction is synchronous + verified (byte-identical success line);
  CROSS is a fire-and-forget DISPATCH — the response says "dispatched", the
  budget increment + the COMPACT line land ONLY on verified success, and a
  failed cross compaction burns no budget (check the terminal for
  "background compaction FAILED" / `ctx.log`).
- **Why (evidence):** the maintainer's round-2 live run (2026-09-14, scaffold
  worker cross-compact + resume) + probe S13 (15 checks, 98→99): the
  same-model hang case is real (llama-swap single slot) → the dispatch
  avoids blocking the controller's turn.
- **Ref:** `proposals/implemented/2026-09-12_compact_memory_plugin.md`
  (Revision 2026-09-14); `handover_probe.mjs` S13; commit `22268de`.
- **Keys:** compact_memory, cross-session, dispatch, fire-and-forget,
  explicit pair, budget, target session, increment-on-verified-success.

## llama-swap single slot: the flush rhythm + the compaction model choice
- **Do:** when compacting ANOTHER session: (1) PREFER a DIFFERENT compaction
  model — `Gemma4-12B-Q4KXL-MTP-128K` runs ~4× faster on this host (his
  numbers: prefill ~3400 vs ~1200 t/s; generation ~200 vs ~47 t/s) with a
  131K window → the provider switches on request, the compaction lands in
  the call window, NO flush needed (2026-09-15: Gemma is now the DEFAULT
  compaction model — `agent.compaction.model` in `opencode.jsonc` — so the
  default cross-compact already gets this; the flush budget applies only
  when the pair names the target's own model); (2) if compaction model == the target's
  active model (the single slot can't start the compaction until the session
  switch frees it), budget ONE FLUSH delegation after the dispatch — the
  first post-dispatch delegation can be consumed by the compaction routine;
  (3) NEVER use keepTokens/keepMessages 0 (usage ruling 2026-09-14: the
  compaction run still costs the full summarize time/energy — a fresh worker
  session gives the same result cheaper); (4) the keep args ARE sent in the
  body, but this host's server schema has no keep key → the retry-once
  drops them; the observed compaction floor is server-side behavior, not the
  keep args.
- **Why (evidence):** the maintainer's round-2 experiment (2026-09-14, his
  report `maintainer/done/cross_session_compaction_summary.md`): round 2
  (queued, same model) — the first delegation was consumed by the compaction;
  rounds 3/5 (synchronous) — the task ran directly. Provider-level
  observation: the model swap is SEQUENTIAL (controller model unloaded →
  named model booted → control returned) — no parallelism needed.
- **Ref:** `maintainer/done/cross_session_compaction_summary.md`; the NAP
  section 2026-09-14 (the 2nd-exchange bullet).
- **Keys:** flush, delegation, single slot, llama-swap, Gemma, compaction
  model, keep, zero-keep, 131K, sequential swap.
