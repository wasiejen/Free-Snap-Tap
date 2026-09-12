# knowledge_plugins.md — opencode plugins (`.opencode/plugin/`)

Gained, verified knowledge for opencode plugins. Format per the README:
**Do** / **Why (evidence)** / **Ref** / **Keys**.

## Plugin context ≠ custom-tool context
- **Do:** a PLUGIN receives a context exposing session operations directly
  (e.g. `ctx.session.get({sessionID})`, `ctx.session.context({sessionID})`);
  a CUSTOM TOOL receives `Tool.Context` (`sessionID` / `messageID` / `agent`).
  Do not conflate the two shapes.
- **Why (evidence):** the current opencode docs describe plugin vs custom-tool
  context differently; using the wrong shape is the common trap.
- **Ref:** `proposals/maintainer/done/knowledge_opencode_tools_plugins.md`
  §1 + §4.
- **Keys:** plugin context, Tool.Context, ctx.session, get, context, v2.

## Compaction hooks (prefer over manual triggering for state preservation)
- **Do:** to preserve durable project state across compaction, use the
  `experimental.session.compacting` hook (inject context that survives
  compaction) and `experimental.compaction.autocontinue` for post-compaction
  continuation. Trigger compaction from a tool only when the agent must
  checkpoint at a specific point.
- **Why (evidence):** both hooks are present in the installed plugin package
  (grep-verified 2026-09-12); the docs recommend the hook for "information
  that should survive compaction."
- **Ref:** `.opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts`
  (~L277-296); knowledge doc §4.
- **Keys:** experimental.session.compacting, autocontinue, hook, compaction,
  durable, prompt.

## The shared gauge core is ONE implementation
- **Do:** for context-usage reads, wrap `.opencode/plugin/scripts/gauge.mjs`
  (`readGauge` / `formatGauge`) — do NOT re-derive the backend chain / window
  rule / readout form. `peek.mjs` and the `ctx_gauge` tool both wrap the same
  core.
- **Why (evidence):** a single shared implementation keeps readouts
  byte-identical across surfaces (smoke-verified vs peek.mjs).
- **Ref:** `ctx_gauge.ts` (imports gauge.mjs); de-peek build (T1); loop-tool-
  batch part 2.
- **Keys:** gauge.mjs, readGauge, formatGauge, peek, byte-identical, readout.

## Production host lacks `node:sqlite`
- **Do:** for cross-process / persistent state in a plugin or tool, use an
  fs/JSON state store (e.g. the `compact_budget.json` pattern under
  `.opencode/temp/`), not `node:sqlite`.
- **Why (evidence):** the production plugin host does not expose
  `node:sqlite` (TODO #37, closed with this finding); a JSON file shared
  in-process is the portable mechanism.
- **Ref:** TODO #37; `compact_memory.ts` budget store.
- **Keys:** node:sqlite, unavailable, JSON store, compact_budget, cross-process,
  temp.

## Plugin scripts run under Node; the probe is the gate
- **Do:** run plugin scripts with Node; verify changes against
  `handover_probe.mjs` (the probe) — keep it green, APPEND-only checks.
- **Why (evidence):** the probe is the shared green gate for plugin/tool
  changes; renumbering is forbidden.
- **Ref:** `repo_commands.md`; `handover_probe.mjs`.
- **Keys:** node, probe, handover_probe.mjs, green gate, append-only.

## Plugins can register tools; client-needing tools belong HERE
- **Do:** a custom tool (`.opencode/tools/*.ts`) does NOT get `context.client`
  (by design — see `knowledge_tools.md`). If a tool needs the SDK client /
  RPC access (e.g. `session.compact`), register it FROM a plugin
  (`.opencode/plugin/*.ts`): the plugin function receives `ctx` which
  carries client/RPC access, and a plugin can register custom tools it
  exposes to agents. The registered tool's `execute` still receives
  sessionID / agent.
- **Why (evidence):** maintainer Q&A (2026-09-12,
  `proposals/maintainer/done/plugin_exposed_custom_tool.md`): the
  custom-tool context is intentionally limited (no client); a custom tool
  CANNOT "start"/obtain a plugin context, but a plugin CAN register tools —
  "Do not use a separate `.opencode/tools/...` tool if it requires
  `context.client`; register that tool from `.opencode/plugins/...`
  instead." A spawned Node process is NOT a plugin context (would need its
  own server connection) — avoid that workaround.
- **Ref:** `proposals/maintainer/done/plugin_exposed_custom_tool.md`;
  `get_context_keys` key dump (clientKeys empty); TODO #52.
- **Keys:** plugin, register tool, context.client, RPC, SDK access,
  .opencode/tools, .opencode/plugin, compact, ctx.

## A plugin can REPLACE the compaction prompt (shape the resume context)
- **Do:** to control what a compaction produces, use the
  `experimental.session.compacting` hook and set `output.prompt` (replaces
  the default compaction prompt ENTIRELY). This is a prompt-level lever —
  it does NOT trigger compaction; the host does that. Useful to bias the
  resume prompt toward durable project state (task status, files touched,
  blockers, next steps) for the multi-agent swarm.
- **Why (evidence):** the installed plugin types expose
  `experimental.session.compacting` (dist L277-296) whose doc says
  `prompt` "replaces the default compaction prompt entirely". A maintainer
  WIP (`custom_compaction.ts`, 2026-09-12) uses it to inject a swarm-oriented
  resume prompt.
- **Ref:** `.opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts`
  (~L277-296); maintainer WIP `custom_compaction.ts` (uncommitted);
  `proposals/maintainer/done/plugin_exposed_custom_tool.md`; TODO #52.
- **Keys:** experimental.session.compacting, output.prompt, compaction,
  resume prompt, swarm, durable state.
