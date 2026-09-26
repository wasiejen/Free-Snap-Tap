# host-map.md — installed opencode host map (lookup, not re-derivation)

Purpose: planner/worker LOOK UP installed opencode facts here instead of re-deriving
(TODO #101). Every entry is dated + located (file + line, script + query, or dated
vendored/knowledge pointer). Vendored deep-dive content is REFERENCED (pointer +
delta), not re-derived or duplicated.

Provenance: built 2026-09-26 by explorer (session ses_f24bf71beffekwRYMtnlrWy5UG)
from the installed packages under `.opencode/node_modules/@opencode-ai/`
(`@opencode-ai/sdk` 1.18.29, `@opencode-ai/plugin` 1.18.29 — both measured
2026-09-26 per task spec), the live DB `C:/Users/Wasiejen/.local/share/opencode/
opencode.db` (READ-ONLY, via `node .opencode/agent/scripts/db/probe_schema.cjs`),
the repo's own plugins (`\.opencode/plugin/*.ts`, `.opencode/tools/*.ts`,
`opencode.jsonc` read-only), and the vendored files in this folder. One bounded
upstream fetch: opencode.ai/docs/plugins (last updated Sep 25, 2026) — those
lines are marked "upstream (not installed-verified)".

Version caveat (carried, not re-measured): the live host binary is 1.18.31 while
the vendored `.opencode/node_modules` packages are 1.18.29 — both v1-generation
clients; the discrepancy is documented in `auto-resume-unit1-surface-report.md`
(2026-09-21). The static `.d.ts` below describes 1.18.29; where live behavior
differs from static types, the live probe wins (the "live-more-than-static"
pattern, established 2026-09-21).

## 1. SDK surface (v1 client)

Source: `.opencode/node_modules/@opencode-ai/sdk/dist/gen/sdk.gen.d.ts` — FULL
read 2026-09-26 (403 lines). Client entry: `createOpencodeClient(config?: Config &
{directory?})` in `dist/client.d.ts` L5-7 (re-exports `OpencodeClient`, `dist/gen/
types.gen.d.ts`).

`session.*` (class `Session`, sdk.gen.d.ts):

| method | line | method | line |
|---|---|---|---|
| list | 110 | update | 130 |
| create | 114 | children | 134 |
| status | 118 | todo | 138 |
| delete | 122 | init | 142 |
| get | 126 | fork | 146 |
| abort | 150 | unshare | 154 |
| share | 158 | diff | 162 |
| summarize | 166 | messages | 170 |
| prompt | 174 | message | 178 |
| promptAsync | 182 | command | 186 |
| shell | 190 | revert | 194 |
| unrevert | 198 | | |

- **NO `session.compact` in the v1 client** (full read 2026-09-26; matches the
  live `compact=undefined` typeof verdict, 2026-09-21 surface line).
- `session.message` (singular fetch, L178) IS in the static types — the 2026-09-21
  unit-1 report's "NO" was a head-40 grep truncation; live `typeof` already
  confirmed `function` that day (delta recorded here, no re-probe needed).

`app.*` (class `App`): `log` L259, `agents` L263.
`config.*` (class `Config`): `get` L68, `update` L72, `providers` L76.

Other namespaces (one line each, sdk.gen.d.ts): `global.event` L26 (SSE),
`event.subscribe` L375 (SSE), `provider.list` L220 / `provider.auth` L224,
`tool.ids` L82 / `tool.list` L86, `instance.dispose` L92, `path.get` L98,
`vcs.get` L104, `command.list` L204, `find.text` L231 / `find.files` L235 /
`find.symbols` L239, `file.list` L245 / `file.read` L249 / `file.status` L253,
`pty.*` L38-63, `mcp.*` L287-304, `auth.*` (MCP) L265-286, `oauth.*` L206-215,
`lsp.status` L310, `formatter.status` L316, `tui.*` L328-370, `control.*` L318-327,
and the FLAT method `postSessionIdPermissionsPermissionId` L381 (respond to a
permission request — see §4).

### Called by our plugins vs merely available (2026-09-26 greps)

| endpoint | used by (file:line) | status |
|---|---|---|
| `session.summarize` | compact_memory.ts:584; context_recovery.ts:554 (via callSummarize) | ACTIVE path on this build |
| `session.compact` | compact_memory.ts:943 (typeof probe only) | available = NO on this host (undefined) |
| `session.messages` | compact_memory.ts:641,917; context_recovery.ts:431,685 | live (the keep/model reads run) |
| `session.promptAsync` | ctx_watchdog.ts:448 (deferredDeliver); auto_resume.ts:718; context_recovery.ts:711 | fire-and-forget delivery |
| `session.status` | ctx_watchdog.ts (sessionStatus, header L468: ALL-SESSIONS map `{[sid]: SessionStatus}`) | live |
| `session.create` | auto_resume.ts:695-696 (`{body:{title}}`, spawnPlanner) | live |
| `app.log` | none (probe only: auto_resume.ts:1675) | available = function (live 2026-09-21); our plugins log to files instead |
| `config.get`, `provider.list`, `event.subscribe`, `postSessionIdPermissionsPermissionId` | none | merely available |

Detection gotcha: SDK methods live on the PROTOTYPE — detect with `typeof`,
`Object.keys(client.session)` sees only `["_client"]` (knowledge_plugins.md
L82-99, probe-verified 2026-09-12).

### v2 surface (shipped in the installed package, NOT exposed by the live client)

Source: `dist/v2/gen/sdk.gen.d.ts` (2302 lines; bounded greps/reads 2026-09-26):
`session.summarize` L1185 (params `sessionID`, `providerID?`, `modelID?`,
`auto?`), `session.compact` L1702 (flat `sessionID` only — the options body is
`never`), `session.wait` L1710, `session.context` L1718 (active context =
messages after last compaction), `session.history` L1726 (paged durable events).
The live client is v1-generation (`compact=undefined` measured 2026-09-21) — the
v2 types matter for the `typeof` probe fallback in compact_memory.ts.

## 2. Plugin hook registration + ordering

Source: `.opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts` — FULL read
2026-09-26 (322 lines).

Plugin form: `Plugin = (input: PluginInput, options?: PluginOptions) =>
Promise<Hooks>` (L51). `PluginInput` (L36-46): `client` (the SDK client),
`project`, `directory`, `worktree`, `experimental_workspace.register`,
`serverUrl`, `$` (BunShell). `PluginModule` (L52-56): `{id?, server: Plugin}`.

Hook keys the installed package registers (`Hooks` interface, L173-322, in
declaration order), with input/output shapes (abridged):

| hook | line | input | output (mutable) |
|---|---|---|---|
| `dispose` | 174 | — | — |
| `event` | 175-177 | `{event: Event}` | — (all events, no per-fire context) |
| `config` | 178 | `Config` | — |
| `tool` | 179-181 | `{[name]: ToolDefinition}` | — |
| `auth` | 182 | `AuthHook` | — |
| `provider` | 183 | `ProviderHook` | — |
| `chat.message` | 187-199 | `{sessionID, agent?, model?, messageID?, variant?}` | `{message: UserMessage, parts: Part[]}` |
| `chat.params` | 203-215 | `{sessionID, agent, model, provider, message}` | `{temperature, topP, topK, maxOutputTokens?, options}` |
| `chat.headers` | 216-224 | same as chat.params | `{headers}` |
| `permission.ask` | 225-227 | `Permission` | `{status: "ask"|"deny"|"allow"}` |
| `command.execute.before` | 228-234 | `{command, sessionID, arguments}` | `{parts: Part[]}` |
| `tool.execute.before` | 235-241 | `{tool, sessionID, callID}` | `{args}` |
| `shell.env` | 242-248 | `{cwd, sessionID?, callID?}` | `{env}` |
| `tool.execute.after` | 249-258 | `{tool, sessionID, callID, args}` | `{title, output, metadata}` |
| `experimental.chat.messages.transform` | 259-264 | `{}` | `{messages: {info, parts}[]}` |
| `experimental.chat.system.transform` | 265-270 | `{sessionID?, model}` | `{system: string[]}` |
| `experimental.provider.small_model` | 271-275 | `{provider}` | `{model?}` |
| `experimental.session.compacting` | 283-288 | `{sessionID}` | `{context: string[], prompt?}` |
| `experimental.compaction.autocontinue` | 296-305 | `{sessionID, agent, model, provider, message, overflow}` | `{enabled}` |
| `experimental.text.complete` | 306-312 | `{sessionID, messageID, partID}` | `{text}` |
| `tool.definition` | 316-321 | `{toolID}` | `{description, parameters}` |

Ordering: the interface order above is the declaration order (2026-09-26). Upstream
(opencode.ai/docs/plugins, last updated Sep 25, 2026 — upstream, not
installed-verified): plugins load in the order global config → project config →
global plugin dir → project plugin dir, and "all hooks run in sequence" — no
documented per-hook priority between plugins; `tool.execute.before`/`after`
wrap the execution of the named tool by name. The `event` hook receives the
whole event stream (session.status, message.updated, session.error, session.
created, session.idle, todo.updated, … — the live stream is DENSE, per-part
updates; filter, don't count — unit1 surface report, 2026-09-21).

Registration mechanics (installed, 2026-09-26):
- EVERY `.ts` file in the live plugin dir `.opencode/plugin/` is loaded as a
  plugin at host start (evidence: the permanent startup `failed to load plugin`
  errors for compact_memory.ts and intercept_observer_core.ts — repo_overview.md
  §Safety limits, measured 2026-09-24; auto_resume "auto-discovered and loaded"
  — unit1 surface report 2026-09-21).
- Upstream (not installed-verified): project dir is `.opencode/plugins/`
  (plural) + global `~/.config/opencode/plugins/`; npm packages via the config
  `plugin` array `["pkg" | [pkg, options]]`; JS/TS auto-loaded at startup;
  subfolders not scanned (plugin_tools/2026-09-17_plugin.tool.registration.md).
- Our live `opencode.jsonc` carries NO `plugin` array (grep 2026-09-26) — all six
  plugin files load purely by directory autodiscovery. The 2026-09-12
  knowledge_plugins.md line "a tool-exposing plugin registers ONLY via the live
  opencode.jsonc plugins array" is CONTRADICTED by current live evidence (no
  config entry, everything loads + works) — treat that 2026-09-12 line as stale
  (flagged here 2026-09-26).
- A file with no function default export still triggers a load error:
  `intercept_observer_core.ts` has ONLY named exports (grep 2026-09-26) →
  "Plugin export is not a function" (see §6).
- Activation: new/changed plugins take effect at the NEXT host restart
  (plugin/README.md L37-38).

Which hooks OUR plugins use (return blocks, verified 2026-09-26):

| plugin (file) | hooks | locators |
|---|---|---|
| ctx_watchdog.ts | `event`, `tool.execute.before`, `tool.execute.after`, `chat.message` | return L726-731 |
| auto_resume.ts | `event`, `tool.execute.after` (the ctx-line nudge, `onToolAfterNudge`, #85 part 3) | return L1710-1715 |
| intercept_observer.ts | `tool.execute.before`, `tool.execute.after` (R6 failed-edit hint enrichment) | return L1124-1127 |
| context_recovery.ts | `event` ONLY (session.error overflow → compact; session.idle clears the guard) | return L620-727 |
| compact_memory.ts | `tool: { compact_memory }` ONLY (tool-only plugin) | L794-804 |
| `.opencode/tools/*.ts` (file-named tools, not plugins) | — | see §6 |

Unused-but-available (no plugin registers them): `config`, `chat.params`,
`chat.headers`, `permission.ask`, `command.execute.before`, `shell.env`,
`tool.definition`, all `experimental.*` (incl. both compaction hooks).
The "ctx nudge" of the spec = auto_resume's `tool.execute.after` suffix channel
(L1714) + ctx_watchdog's event-driven gauge readout.

## 3. DB schema (live DB)

Source: `node .opencode/agent/scripts/db/probe_schema.cjs` run 2026-09-26
(script opens the live DB `C:/Users/Wasiejen/.local/share/opencode/opencode.db`
READ-ONLY). Row counts as of that date.

| table | rows | columns |
|---|---|---|
| `session` | 324 | id, project_id, workspace_id, parent_id, slug, directory, path, title, version, share_url, summary_additions, summary_deletions, summary_files, summary_diffs, metadata, cost, tokens_input, tokens_output, tokens_reasoning, tokens_cache_read, tokens_cache_write, revert, permission, agent, model, time_created, time_updated, time_compacting, time_archived |
| `session_v2` | 215 | same as `session` PLUS fork_session_id, fork_boundary, time_suspended, resume_attempts, time_idle, time_viewed, idle_outcome |
| `message` | 16566 | id, session_id, time_created, time_updated, `data` (JSON) |
| `part` | 74275 | id, message_id, session_id, time_created, time_updated, `data` (JSON) |
| `permission` | 0 | id, project_id, action, resource, time_created, time_updated |
| `event` | 70154 | id, aggregate_id, seq, type, data, created |
| `event_sequence` | 324 | aggregate_id, seq, owner_id |
| `session_message` | 11411 | id, session_id, type, seq, time_created, time_updated, `data` (JSON) |
| `todo` | 71 | session_id, content, status, priority, position, time_created, time_updated |
| auxiliary | — | account(0), account_state(0), control_account(0), credential(0), instruction_blob(0), instruction_entry(0), instruction_state(0), kv(2), migration(47), project(3), project_directory(1), session_inbox(0), session_pending(0), session_share(0), workspace(0), worktree(1) |

Notes (2026-09-26): the DB is MIXED-generation — both v1 `session` (324 rows)
and `session_v2` (215 rows) exist; `event`/`event_sequence`/`session_message`
are the v2 event-style store. The per-session `permission` column on
session/session_v2 has UNVERIFIED semantics (the `permission` table itself has 0
rows).

`data` JSON shapes (documented in the vendored files — NOT re-derived here):
- Message `info`: `role` (read `msg.role ?? info.role`), assistant carries
  TOP-LEVEL `providerID`/`modelID` (no `model` sub-object), `tokens {total?,
  input, output, reasoning, cache{read, write}}` — unit1 surface report
  "UNIT 2 supplement" (2026-09-21).
- Token reads for keep computation: user `info.tokens.input`, assistant
  `info.tokens.output + info.tokens.reasoning` — 2026-09-25_compaction_
  keep_semantics.md (#99).
- Error fields: `msg.error ?? info.error` → `{name, message: err.data.message ??
  err.message}`; retry parts `type === "retry"` with `error`; finish =
  `msg.finish ?? info.finish ?? info.finishReason` — Deep-Dive B §3.2/§3.3
  (vendored 2026-09-21).
- Part kinds: `type:"text"` (non-empty `text`), `type:"tool_use"`
  (`state.status: "pending"` = awaiting user input), `part.state.input` =
  POST-mutation tool args (the pre-mutation form lives only in intercept.log)
  — knowledge_plugins.md "Stored tool-call args are POST-mutation".
- Live event `message.updated` carries `properties.sessionID` (more than the
  static types) — unit1 surface report UNIT 2 supplement (2026-09-21).

## 4. Permission / external_directory mechanics

Config shape (`opencode.jsonc`, read-only, 2026-09-26):
- Root `permission.external_directory` L23-34: an allow-map of absolute paths —
  workspace root, scratchpad `C:/Users/Wasiejen/AppData/Local/Temp/opencode`,
  `C:/Users/Wasiejen/.local/share/opencode/log`, npm global
  (`C:/Users/Wasiejen/AppData/Roaming/npm` + `/**` +
  `node_modules/opencode-ai/**`). Comment at L32: db path "still to add or
  better in watcher ignore?" — open.
- A commented-out per-tool permission block L192-210 (`"*": "deny"` + allows
  incl. `loop_log`/`compact_memory`) — INACTIVE.
- Per-agent `permission` maps (e.g. explorer L265-277): `edit: {"*": "allow" +
  explicit denies (AGENTS.md, .opencode/agent/prompts/**,
  handover/handover_planner.md, .git/**, .github/**)}`, plus
  `task`/`bash`/`webfetch: allow`. The edit-deny list IS the explorer/worker
  allow-list the role prompts reference.

Installed surface (2026-09-26):
- `permission.ask` hook (plugin index.d.ts L225-227): a plugin MAY veto/allow a
  permission ask (`output.status = "ask"|"deny"|"allow"`).
- Client method `postSessionIdPermissionsPermissionId` (sdk.gen.d.ts L381):
  respond to a permission request from the client side.
- `ToolContext.ask(input: {permission, patterns: string[], always: string[],
  metadata})` (plugin/dist/tool.d.ts L23-32): a tool can REQUEST permission at
  execution time.
- Live DB: `permission` table 0 rows (id, project_id, action, resource,
  time_created, time_updated); per-session `permission` column (semantics
  unverified).

Plugin usage (grep 2026-09-26): NO active plugin registers `permission.ask`; NO
tool calls `ToolContext.ask`. Enforcement is host-side; our plugins only
SHADOW it:
- **R8 (the live example)** — intercept_observer.ts L245-247, L281-289,
  L1063-1082, L1123 + intercept_observer_core.ts L497-538 (#97, 2026-09-25):
  the allowed-root basis is resolved ONCE at plugin init from
  `permission.external_directory` keys with value "allow" (a dir key and its
  `/**` twin dedupe to ONE root) + `references.*.path` values + the workspace
  root (config unreadable → fallback [workspace root, scratchpad], fail-open,
  never throws). On a typed path field outside all roots, R8 applies a 1:1
  allowed-root redirect (AFTER the fuzzy channels; fail-CLOSED when no 1:1
  mapping — no mutation); the out-of-sandbox note is recomputed on the
  effective args; the redirect note is delivered via the after hook. This is
  where our codebase's external_directory semantics live.
- Upstream: opencode.ai has a Permissions doc page (not fetched — bounded
  research limit). The exact host-side enforcement algorithm (pattern
  matching, ask flow, TUI prompt behavior) is **unverified — live behavior
  only**.

## 5. Compaction / summarize path

Builds ON the vendored files (reference, not re-derived):
`auto-resume-deepdive-A/B/C.md` (reference-plugin compaction triggers, vendored
2026-09-21), `auto-resume-unit1-surface-report.md` (client surface),
`2026-09-25_compaction_keep_semantics.md` (#99, 2026-09-25).

Reference plugin (opencode-auto-resume) trigger model — Deep-Dive B §2
(pointer): idle-boundary saturation at `session.status → idle`; parent →
`session.command({command:"ctx-wrapup"})` ONLY when magic-context is installed;
subagent → native `session.summarize()` (opt-in, no magic-context needed);
usable-window formula `context − min(20k, output)`; once-per-busy-cycle budget.
(No re-derivation — see that file for line refs.)

Our installed/live path (2026-09-26 unless noted):
- **Triggers:** (a) model-driven `compact_memory` tool call (SELF: own session
  ends; CROSS: fire-and-forget dispatch — an await would deadlock on the single
  llama-swap slot; success verified ASYNCHRONOUSLY) — compact_memory.ts
  L794-804 (args: `sessionID?`, `keepMessages?`, `message?`, `emergency?`);
  (b) `context_recovery.ts` event hook (#93): on a REAL context-overflow
  `session.error` with the `emergencyRecovery` flag ON — the host emits FOUR
  session.error events per ONE overflow (measured 2026-09-23, file header);
  once-per-overflow in-memory guard, cleared on `session.idle`; the summarize
  call here IS AWAITED (server-side listener — no turn awaits it, the
  overflowing turn is already aborted, so the single-slot deadlock cannot form
  — file L693-700), then a synthetic `promptAsync` reload directive (L711-722).
- **Client path:** v1 `session.summarize({path:{id}, body})` is THE ACTIVE
  path; v2 `session.compact({sessionID})` is probe-only (typeof at
  compact_memory.ts:943 — undefined on this host). The v1 body REQUIRES
  `providerID` + `modelID` (server payload schema; a missing body was a live
  404 no-op on 2026-09-12) — compact_memory.ts header L20-40.
- **keep resolution (#99, as of 2026-09-25):** at dispatch, `keepTokens`
  resolves 1. COMPUTED (token size of the last `keepMessages` messages from the
  messages RPC — dual-shape unwrap bare array / `{data:[...]}`; fail-open),
  2. BUDGET (`keepTokens` from `.opencode/temp/compact_budget.json` when the read
  fails or sum = 0), 3. NONE (field omitted → host config default). The body
  ALSO keeps `keep.messages` (arg/config/default 12). Implemented in
  compact_memory.ts (`computeKeepTokens` L~180-188) and duplicated locally in
  context_recovery.ts (L677-692, self-contained-by-design).
- **The `keep` field is UNDOCUMENTED in the installed SDK:** `SessionSummarizeData`
  body schema is `{providerID, modelID}` ONLY — types.gen.d.ts L2175-2186
  (spot-verified 2026-09-26).
- **Live config** (opencode.jsonc L47-58, read 2026-09-26): `compaction: {auto:
  false, keep: {system: true, tokens: 30000, messages: 22}, buffer: 2000}`;
  maintainer comment 2026-09-25: "messages are ignored by V2 summerize -> only
  keepToken is respected".
- **Live retention model** (2026-09-25 measurements, keep-semantics file):
  `keep.tokens` is a DIRECT retention on a constant ~25k base (25k + 30k →
  ~55k); `keep.messages` does NOT control retention (count is cosmetic); dev-
  branch host source `session/compaction.ts`: `preserve_recent_tokens ??
  clamp(0.25*usable, 2k..15k)` + optional `tail_turns` — no message-count knob.
- **Summarizer model:** root `agent.compaction.model` is CURRENTLY COMMENTED
  OUT (correction 2026-09-24, knowledge_plugins.md) → the default summarizer is
  the session's OWN model. Resolution: context_recovery = config pair (JSONC-
  safe resolver) → fallback session model via `session.messages`;
  compact_memory SELF = tool ctx `extra.model`, CROSS = last entry of
  `session.messages` (unresolvable pair → request NOT sent).
- **Budget + verification:** per-session quant-class cap (cpu 0 / 4-bit 3 /
  3-bit 1 / default — classifyQuantClass, compact_memory.ts L196-202) + ONE
  emergency slot (`emergency` arg / `emergency_budget` config); increment
  ON VERIFIED SUCCESS to the shared v2 store (entries `{count, updated, model}`
  + top-level `model_budget` map); the `COMPACT` line in
  `.opencode/temp/ctx.log` lands only on verified success — format
  `<stamp>[ <model>] COMPACT <sid> keep=<m>m tok=<t> <source>[ emergency]`
  (source ∈ computed|budget|none; keep-semantics file, 2026-09-25).
- **Pre-compaction dump:** before any dispatch (compact_memory.ts L450-474,
  #78: one retry, 120 s spawn budget, `resolveNodeExe` — see
  knowledge_plugins.md "Spawning a node script", 2026-09-15/16).
- **Available but UNUSED hooks:** `experimental.session.compacting` (plugin
  index.d.ts L283-288: `output.context` appended to the compaction prompt;
  `output.prompt` replaces it ENTIRELY — when set, `context` is ignored —
  upstream doc Sep 25 2026, not installed-verified) and
  `experimental.compaction.autocontinue` (L296-305: `output.enabled=false`
  skips the synthetic user continue turn). No plugin registers either (2026-
  09-26).
- **v2 SDK (shipped, not exposed live):** `session.summarize` L1185
  (providerID/modelID/auto), `session.compact` L1702 (flat), `session.wait`
  L1710, `session.context` L1718, `session.history` L1726 —
  dist/v2/gen/sdk.gen.d.ts (2026-09-26).

## 6. Tool registration

Two registration paths on the installed host (2026-09-26):

1. **File-named custom tools** — `.opencode/tools/*.ts`:
   `export default tool({description, args, execute})`, NO `name` field; the
   host names the tool by FILENAME (tools/README.md L3-7; knowledge_tools.md).
   Live set: `block_transfer.ts`, `ctx_gauge.ts`,
   `dev_get_tool_context_contents.ts`, `loop_log.ts`, `session_info.ts`,
   `submit.ts`. Custom tools are auto-discovered (subfolders excluded); no
   config entry needed (plugin_tools/2026-09-17_plugin.tool.registration.md;
   upstream dir name `.opencode/tools`). Custom tool context has NO client BY
   DESIGN (knowledge_plugins.md L61-80, maintainer ruling 2026-09-12).
   Live tool-context keys (2026-09-17 dump, plugin_tools/2026-09-17_tool.
   context.md): `sessionID`, `abort`, `messageID`, `callID`, `extra`
   (`model` with `limit.{context,output}`, `bypassAgentCheck`, `promptOps`),
   `agent`, `directory`, `worktree`, `metadata`, `ask` — note `callID` and
   `extra.*` are LIVE-MORE-THAN-STATIC (tool.d.ts ToolContext L2-24 has no
   callID/extra).
2. **Plugin-registered tools** — `tool: { name: tool({...}) }` in the returned
   Hooks object (compact_memory.ts L794-804). The tool's `execute` still
   receives the plain tool context (no client); the CLIENT-NEEDING tool is
   registered FROM a plugin precisely so the plugin function captures
   `ctx.client` (compact_memory.ts header L1-12; knowledge_plugins.md
   L61-80). The `tool()` shape: `tool({description, args: ZodRawShape,
   execute(args, context)})` → `ToolDefinition` (plugin/dist/tool.d.ts
   L47-59); `ToolContext` (L2-24): sessionID, messageID, agent, directory,
   worktree, abort, `metadata(...)`, `ask(...)`.
   Upstream (Sep 25 2026, not installed-verified): a plugin tool that shares a
   built-in tool's name takes PRECEDENCE.

Load-error anomalies (kept as dated facts — repo_overview.md §Safety limits,
measured 2026-09-24; still open per that doc as of 2026-09-26):
- **compact_memory.ts**: every start logs `failed to load plugin` with
  `The "paths[0]" property must be of type string, got object` — yet the
  `compact_memory` tool WORKS (a self-compact ran under the same failing
  start).
- **intercept_observer_core.ts**: `Plugin export is not a function` — root
  cause identified 2026-09-26: the file has NO default export (only named
  exports: constants + pure functions; grep) — the host loads every file in
  the plugin dir as a plugin. The hooks actually live in `intercept_observer.
  ts` (proper `satisfies Plugin` default export L1120-1128), which loads and
  intercepts live (intercept.log grows).
- Maintainer confirmed (2026-09-24) no alternative plugin versions exist —
  the files load despite the errors. FIX PENDING (separate item).

Activation: new/changed tools take effect at the NEXT host restart
(tools/README.md L5-6; plugin/README.md L37-38).

Cross-process state note: the production plugin host does NOT expose
`node:sqlite` (knowledge_plugins.md L42-51, TODO #37) — plugins/tools use
fs/JSON stores (the `compact_budget.json` pattern).

## Unverified / open (carried into this map, 2026-09-26)

1. Exact host-side permission enforcement algorithm + ask flow — config
   semantics only; live behavior only (§4).
2. `session`/`session_v2` per-session `permission` column semantics (§3).
3. Per-hook execution priority beyond plugin load order — upstream says
   "run in sequence"; no per-hook order doc found (§2).
4. Whether `.opencode/plugins/` (plural, upstream dir) is also scanned on this
   host — live evidence only proves the singular `.opencode/plugin/` (§2).
5. The summarize body `keep` field: the 2026-09-25 knowledge file's formal
   fork-test expectation is superseded by the maintainer's 2026-09-25 config
   comment (keep.tokens respected, keep.messages ignored) — the fork-test
   line itself is stale (§5).
6. The 2026-09-12 "plugins-array-only registration" knowledge line is stale
   relative to the no-config-array live setup (§2).
