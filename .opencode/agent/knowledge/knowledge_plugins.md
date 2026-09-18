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
- **Ref:** `maintainer/done/knowledge_opencode_tools_plugins.md`
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
  `maintainer/done/plugin_exposed_custom_tool.md`): the
  custom-tool context is intentionally limited (no client); a custom tool
  CANNOT "start"/obtain a plugin context, but a plugin CAN register tools —
  "Do not use a separate `.opencode/tools/...` tool if it requires
  `context.client`; register that tool from `.opencode/plugins/...`
  instead." A spawned Node process is NOT a plugin context (would need its
  own server connection) — avoid that workaround.
- **Ref:** `maintainer/done/plugin_exposed_custom_tool.md`;
  `get_context_keys` key dump (clientKeys empty); TODO #52.
- **Keys:** plugin, register tool, context.client, RPC, SDK access,
  .opencode/tools, .opencode/plugin, compact, ctx.

## The plugin ctx client on THIS host (probe-verified) + detection gotchas
- **Do:** reach the SDK client via the CAPTURED plugin ctx
  (`ctx.client.session.*`). Detect methods with `typeof` — `Object.keys`
  MISSES prototype methods (`Object.keys(client.session)` returns only
  `["_client"]`). On this build `summarize` is a function and `compact` is
  UNDEFINED (v1-generation client). A tool-exposing plugin registers ONLY
  via the live `opencode.jsonc` `plugins` array — a dropped-in file without
  the config entry does not register.
- **Why (evidence):** `dev_probe_ctx.ts` probe (2026-09-12, output in its
  header comment): pluginCtxKeys = client, project, worktree, directory,
  experimental_workspace, serverUrl, $; client exposes 21 keys (session,
  app, event, config, ...); summarizeType=function, compactType=undefined;
  the tool's execute context inside the plugin has NO client (same 11 keys
  as the custom-tool context).
- **Ref:** `.opencode/plugin/dev_probe_ctx.ts`; TODO #52;
  `proposals/2026-09-12_compact_memory_plugin.md`.
- **Keys:** plugin ctx, client, summarize, compact, v1, v2, prototype,
  typeof, plugins array, registration, dev_probe_ctx.

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
  `maintainer/done/plugin_exposed_custom_tool.md`; TODO #52.
- **Keys:** experimental.session.compacting, output.prompt, compaction,
  resume prompt, swarm, durable state.

## compact_memory verified working again + Gemma is the DEFAULT compaction model
- **Do:** compact_memory is back to a working state — use the cross-session
  contract as documented (SELF sync / CROSS fire-and-forget; success = the
  COMPACT line in `.opencode/temp/ctx.log` + the budget increment). The
  DEFAULT compaction model is now Gemma (`opencode.jsonc`
  `agent.compaction.model` = `llama-swap/Gemma4-12B-Q4KXL-MTP-128K`, set
  2026-09-15) → the default cross-compact runs on a DIFFERENT model → no
  flush budget. The summarize body STILL requires `providerID` + `modelID`
  (server payload schema) — pass the explicit pair for cross compaction
  rather than relying on the auto-resolve (the plugin REFUSES to send when
  the pair cannot be resolved).
- **Why (evidence):** maintainer short test 2026-09-15 — cross-session
  compact of `ses_f5dedec39ffeYhwWJNGbjHa4U0` "triggered as expected":
  COMPACT line in `.opencode/temp/ctx.log` 00:38 (tokens=30000 messages=12),
  the target's next read shows 0%/119K (post-compact reset).
- **Ref:** `opencode.jsonc` L12-20 (top-level compaction: auto=false) +
  L118-120 (agent.compaction.model); `compact_memory.ts` L37 / L281 /
  L517-524; `.opencode/temp/ctx.log` 2026-09-15; planner verification
  (2026-09-15, direct session).
- **Keys:** compact_memory, gemma default, agent.compaction.model,
  providerID, modelID, summarize, COMPACT line, verified working.

## Spawning a node script from a plugin: execPath is NOT a node runtime on the live host
- **Do:** when a plugin `execFileSync`s a node script, resolve the executable
  with `resolveNodeExe()` (exported from `compact_memory.ts`): basename
  (lower-cased) starts with `node` → pass through; otherwise the literal
  `"node"` (PATH resolution — on Windows PATHEXT finds node.exe).
- **Why (evidence):** on the live opencode host `process.execPath` is the CLI
  binary (`opencode.exe`), not a node runtime — spawning the dump script with
  it ran `opencode.exe dump_session.cjs ...` (the CLI printed its help, the
  dump failed, a WARNING rode every dispatch); the 2026-09-15 live #55 test
  shows exactly this (DUMP-FAIL line + CLI help text); plain-node smokes/probe
  could not catch it (their execPath IS a node runtime).
- **Ref:** `compact_memory.ts` `resolveNodeExe` + the `preCompactionDump`
  spawn site (commit 9fd7557, TODO #55 note 2026-09-16); plan7 spec
  `#57-live`.
- **Keys:** execPath, resolveNodeExe, execFileSync, opencode.exe, dump hook,
  spawn, PATH, PATHEXT.

## Stored tool-call args are POST-mutation — you only see the corrected args
- **Do:** NEVER trust the tool-call args you see in your own context / the
  session dump to diagnose a bitdrift or fuzzy-resolve — the DB stores the
  POST-mutation `state.input` (the corrected path), not what you EMITTED. To
  know what you actually emitted, read `.opencode/temp/intercept.log` (the
  `orig=` field of the `fuzzy-resolved` line + the `path-anomaly`
  `doubled=...` line) — that is the ONLY pre-mutation record. A live mutation
  is indistinguishable from producer drift inside your own session. EXTENDED
  to the escape/numword content channel: the SAME applies to
  `kind=escape scope=content` lines (`orig=[...] value=...`) — and the
  corrected form re-ENTERS your own context on the next pass, so a mutation
  looks like "I typed the corrected value again" (a false repetition loop).
  For any acceptance/diagnosis of escape or fuzzy behavior, check
  intercept.log FIRST; your own perception of your args is not evidence.
- **Why (evidence):** 2026-09-17 (planner ses_f4f539d7c, #73 live acceptance):
  the EMITTED doubled path `.../OpenCodeProjects/OpenCodeProjects/...` was
  fuzzy-resolved (intercept.log `orig=` doubled → corrected, `kind=dedup`),
  but the stored part `state.input` for that SAME read shows the SINGLE
  (corrected) path — queried directly from `opencode.db`. The planner, reading
  back its own "sent" args from context, concluded it had dropped the doubling
  (perceived drift); the log proved the read had arrived correctly doubled —
  while 5 write calls in the same session genuinely arrived single (the log
  shows `orig=` single, no anomaly line) — a REAL emission collapse. Both
  diagnoses were possible ONLY via the log; the stored args could not
  distinguish the two cases. Same class as the R2 display finding (post-
  mutation result shown) — extended to the CALL side. SECOND INSTANCE (the
  escape channel): 2026-09-18 (direct, ses_f4c039ae2ffeRqvdPqGu8IdB37) — the
  planner's live-acceptance writes EMITTED sentinel forms (one short `esc`,
  one `escape` numword form); the file on disk shows the corrected digits,
  and the planner PERCEIVED its own 3 "repeated" writes as literal digit
  strings (a false repetition loop); intercept.log 2026-09-18_12-19 lines
  (4 `kind=escape` verdicts, `hits=2`) prove every write carried the
  sentinels and each was `pair-resolved` (`orig=` = the sentinel form,
  `value=` = the field-2 digits).
  Ruled by the maintainer the same session: the agent CANNOT perceive the
  pre-corrected parts of a tool call — only the corrected form enters the
  context.
- **Ref:** `opencode.db` `part.state.input` for the #73 read;
  `.opencode/temp/intercept.log` 2026-09-17_21-03 lines; planner verification
  (2026-09-17 direct, ses_f4f539d7c); intercept.log 2026-09-18_12-19 lines
  (escape acceptance, ses_f4c039ae2ffeRqvdPqGu8IdB37).
- **Keys:** post-mutation, state.input, intercept.log, orig, display,
  self-diagnosis, bitdrift, producer-drift, indistinguishable, escape,
  numword, sentinel, false-repetition, pre-correction-perception.
