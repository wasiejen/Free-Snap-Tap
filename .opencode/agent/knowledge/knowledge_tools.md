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
  boundaries) — it is the primary way an agent learns to use the tool. The
  descriptions injected at launch ARE the actual agent-facing surface (a
  parameter's runtime behavior is invisible to the agent — only its
  description is).
- **Do:** check a description with the "new-hire test": could an agent with no
  prior context use the tool correctly from the description alone? (All five
  custom-tool descriptions passed after the 2026-09-18 rework; residual gaps
  live in the prompts, not the descriptions.)
- **Why (evidence):** the description is what the agent sees; a one-liner
  leaves usage opaque (maintainer inbox item on block_transfer); 2026-09-18
  prompt-rework verified the surface claim (the compact_memory
  providerID/modelID params were an un-reworked placeholder since 2026-09-12,
  invisible to the agent except via their description).
- **Ref:** block_transfer.ts description rewrite; loop_log.ts; 2026-09-18
  prompt-rework session (cured 2026-09-21 from knowledge_inbox).
- **Keys:** description, usage, help, agent-facing, schema, new-hire test,
  placeholder params.

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
- **SELF-path race (measured 2026-09-22, ses_f39d250e):** the fire-and-
  forget dispatch queued the continuation message, which was DELIVERED
  BEFORE the background compaction applied (between the tool call and the
  compaction) → cache invalidation → full re-prefill of the UN-compacted
  history → hard-limit stall (only a user message restarted it); the
  summarizer ran but no compaction landed. FIXED by the maintainer's temp
  fix 0f192e5 (the queued promptAsync commented out) + live-verified the
  same day (gauge 144944→~57k); the temp-fix behavior is gate-pinned via
  TODO #81 — the proper message-path fix is still open. Manual (UI)
  compaction works correctly on this build (96%→~52k).
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
  body, but this host's server schema has no keep key (STALE 2026-09-24, guide section 12: the keep fields DO reach the server and ARE honored via the v1 summarize path - keep.messages only; no args means server default 18; item 1, commit 7f253ea - this clause is superseded, the rest of the sentence still stands) → the retry-once
  drops them; the observed compaction floor is server-side behavior, not the
  keep args; (5) agents NEVER send direct requests (curl/test scripts) to
  the inference server while a session is active — the single slot UNLOADS
  the session's model to serve that request (maintainer note 2026-09-21:
  the direct-probe idea was rejected for exactly this reason; a running
  session keeps whatever model was loaded for it — it was still served by
  the buggy build after his fork switch, until his explicit
  unload + fresh reload moved it to the old ik_llama);
  server-side verification goes through the session's own tool calls or is
  done by the maintainer on his end.
- **Update discipline (his, 2026-09-21):** never adopt a fresh ik_llama
  build immediately — let it rest days so others surface the bugs first
  (#2492/#2470: he hit the tool-call truncation ~48h before the issue was
  filed; A/B in one session confirmed it — see TODO #74).
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
- **Correction (2026-09-24, prompt wave task d):** the 2026-09-15 claim in
  item (1) is stale — `agent.compaction.model` is now COMMENTED OUT in
  `opencode.jsonc` → the compaction summarizer is the SAME model as the
  session's model (the default cross-compact runs on the target's own model,
  so the flush-budget rule of item (2) applies again). Factual source:
  `maintainer/draft/compaction_guide/full_guide.md` §12 Corrections.
- **Correction (2026-09-24, prompt wave task d):** item (3) — "NEVER use
  keepTokens/keepMessages 0" — is stale: `keepTokens` has been REMOVED from
  `compact_memory` (commit 7f253ea); a LOW `keepMessages` is legitimate — the
  compaction floor is ~25-30k at keepMessages=0 (server-side).
  `keepMessages` 18 is the live default in BOTH stores (opencode.json keep
  block + `compact_budget.json`). Factual source: `maintainer/draft/
  compaction_guide/full_guide.md` §12 Corrections.

## ctx_gauge / `ctx:` lines lag ~2 tool calls — plan with margin
- **Do:** treat any gauge readout as a LOWER bound of real usage — plan
  with ~5k margin; trust the freshest reading plus your own tool-call
  count since it. More tool calls (low thinking) between readouts = a more
  exact value.
- **Why (evidence):** maintainer-measured 2026-09-15 (priority.md # 9):
  `ctx_gauge` and the inline `ctx:` replay lag a large context increase by
  ~2 tool calls — planner and worker consistently misjudge how close they
  are to the window end.
- **After a compaction:** the FIRST gauge readout reflects the COMPACTING
  model's own context fill, not the compacted session's new fill
  (measured 2026-09-22: readout 57570/35% right after a compaction of a
  144944-token session; re-confirmed 2026-09-25, ses_f27282d2: the resume
  `ctx:` line read 62%/142769 while the settled readout was 24% — it was
  the COMPACTING model's own gauge, per the maintainer's explanation).
  NEVER trust the first readout after a compaction — budget decisions
  start from the 2nd readout or later.
- **Ref:** priority.md # 9 (2026-09-15); the same session's stop-line
   incident (real wall ≈ 90% gauge reading, see NAP Standing).
- **Keys:** ctx_gauge, gauge, lag, context window, stop line, 90%,
  margin, REM, post-compaction.

## compact_memory: the pre-compaction dump hook (no-overwrite corpus naming)
- **Do:** the hook fires BEFORE ANY compaction dispatch (just before the
  client call, after the budget gate): `preCompactionDump(root, sessionID,
  count)` runs `dump_session.cjs <sid> --out <relpath>` via execFileSync
  (#78 2026-09-23: timeout **120 s** — was 60 s; `stdio: "pipe"` — was
  "ignore"; best-effort — NEVER throws / blocks). The name is
  `compaction_dumps/<sid>_c<count>.md` (count = the budget count at dispatch
  time); if that exact file already exists, a `_<YYYYMMDDTHHmmss>` stamp is
  added (BEFORE the `.md`) — one dump never overwrites another. Log lines in
  `.opencode/temp/ctx.log` (#78 forms): success =
  `<stamp> DUMP-OK <sid> <relfile> ms=<ms>` (the `ms=` prefix replaced the
  bare `<ms>`); first-attempt failure =
  `<stamp> DUMP-RETRY=1 <sid> ms=<ms> err=<one-line>` (then ONE retry);
  final failure = `DUMP-FAIL <sid> <error> | stderr: <captured one-line
  stderr>` + the dispatch response gains a WARNING line; on success the
  response is UNCHANGED. The hook's markdown backup renders with the
  LOSSLESS full mode of the dump script (raw JSON is the on-demand
  `--json` mode). The dump script's plain `<sid>` mode keeps "current state"
  semantics (refresh may overwrite) — compaction awareness lives ONLY in the
  hook's `compaction_dumps/` namespace.
- **Why (evidence):** TODO #152 (approved 2026-09-15) + the maintainer's
  --comment (no-overwrite across compactions of the same sid); the #78
  ruling (planner-12 direct, 2026-09-23) on the live
  `DUMP-FAIL … spawnSync node ETIMEDOUT` = a SPAWN-LEVEL STALL (measured dump
  wall-times 64–87 ms vs the 60 s budget — the raise + retry + stderr
  capture diagnose it). Probe S14 (checks 101-107; 104 re-pinned 2026-09-23
  for the DUMP-RETRY= line) pins the name function byte-exact + the
  no-overwrite proof; the S13 preamble places a stub dump script in the
  sandbox so the byte-exact dispatch responses stay clean (a missing script
  would append a WARNING).
- **Ref:** `.opencode/plugin/compact_memory.ts` (`preCompactionDumpName` /
  `preCompactionDump` / `runDumpSpawn`); `handover_probe.mjs` S14 + S25 (255
  re-pinned for `ms=`); `compact_memory.smoke.mjs` (DUMP-OK + stdio pins
  re-pinned); `dump_session.cjs` `--out`; #78 worker session
  ses_f30807a16ffelPQPUBH50wiXBe (2026-09-23).
- **Keys:** compact_memory, pre-compaction dump, compaction_dumps, no
  overwrite, --out, DUMP-OK, DUMP-RETRY, DUMP-FAIL, stderr, 120 s, S14,
  naming, #78.

## The IQ3KT-MTP model variant crashed/corrupted — recovery from committed state
- **Do:** when a session (or a worker launched on the 3bit-MTP variant)
  shows output corruption (garbled streams, false-repeats, broken prose),
  FIRST verify the filesystem (`git status` + `git log`) before assuming
  file impact — both measured 2026-09-18 incidents were confined to the
  OUTPUT channel: zero partial writes, zero repo content damage. Then
  rebuild reality from committed state (git log + NAP + TODO) — the
  mid-turn work was lost only from the session context, never from the
  tree. Model switching between variants is the maintainer's operation
  (live opencode.jsonc); do not try to "fix" it from a session.
  **Planning rule (2nd incident):** do NOT delegate task-scale work to the
  IQ3KT-MTP variant (`worker_explorer_Q3_120K_mtp`) — it corrupts at ≈88k
  context FILL (maintainer-measured; the 140k window is not usable); if it
  must be probed at all, keep the task's tool-call budget far below the
  fill point.
- **Why (evidence):** 2026-09-18, direct session
  ses_f4c039ae2ffeRqvdPqGu8IdB37 — the IQ3KT-MTP variant crashed/corrupted
  (maintainer report + the corrupted turn visible in-session); the
  maintainer restarted the session on a different model; the recovery
  check found `git status` clean at the pre-corruption HEAD — no files
  were touched by the corrupted turn. 2nd incident same day, direct
  session ses_f4a3f85e1ffeO9206c9ENvkK0f — a subagent launch on the
  variant (`worker_explorer_Q3_120K_mtp`, feature-map task, spec
  adc3500) returned `Task cancelled`; maintainer: corrupted again at
  ≈88k context fill; zero partial artifacts (scratchpad + tree checked
  clean).
- **Ref:** direct session ses_f4c039ae2ffeRqvdPqGu8IdB37 (incident 1);
  direct session ses_f4a3f85e1ffeO9206c9ENvkK0f (incident 2, subagent
  launch); maintainer reports; recovery git checks 2026-09-18.
- **Keys:** mtp, iq3kt, corruption, crash, model-swap, recovery,
  git-status, output-channel, worker-verification.

## Model sizing for analysis tasks (feature-map runs A/B/C, 2026-09-18)
- **Do:** match the model to the analysis scale. Dense-monomith
  mapping/verification (2767-line single file + 28 test files) → IQ4KT-class
  (27B) with a contract spec: Run C delivered 22/22 verified entries incl.
  full test mapping, planner spot-check passed. Gemma-12B
  (`worker_gemma_Q4_128K`) is FAST (<1 min) but SHALLOW: it reads the whole
  README in one go, runs ~3 broad greps, drops DoD sub-items (every entry
  `test: none`, one key feature missing), and its handover bookkeeping was
  self-contradictory — use it only with STEP-LEVEL instructions (one exact
  command per sub-deliverable, explicit "do not stop before X"), not contract
  specs. Maintainer's characterization: gemma = "distracted squirrel", needs
  strong directional guidelines; IQ4KT is deliberate (partly the worker
  prompt).
- **Why (evidence):** runs A (mtp — corrupted ≈88k fill, zero output), B
  (gemma — thin map, see NAP runB verdict), C (iq4kt — verified, committed
  as `knowledge/opencode-plugins/auto-resume-map.md`).
- **Update 2026-09-21 (maintainer roster rework, his direct session):** new
  bit-drift-free stable set replaces the IQ3KT class for task-scale work —
  Q3S (quant 3 small): best overall for deep/complex coding and code analysis
  (proven by our Deep-Dive runs), slowest of the three, biggest general
  knowledge base, AND best at recovering from write-tool failures;
  Q3XS ("extra small" — little brother of Q3S): faster, a touch less general
  knowledge, coding still fine; Q2S (little brother of Q3XS): least
  impressed on quality but reliable and surprisingly stable, scalable to a
  large context (~262k) — suited for large-file handling / webfetch
  summarization with clear instructions; MTP builds run roughly 30–40 %
  faster without quality loss but with a hit on context size; parallel
  execution only works when the PLANNER runs the same model (no such
  planner agent exists yet). BITDRIFT VERDICT: every old-generation model
  mangled dense line-number citations; this quant-3 / quant-2 set showed
  none so far across all test runs → pick from this set first. Compaction
  budget ruling: quant-3 cap raised to quant-4's value (three);
  quant-2 cap = one (for now) — classifier + smoke pins updated in this
  commit.
- **Keys:** gemma, iq4kt, model-sizing, delegation, step-level-instructions,
  contract-spec, explorer, feature-map.

## Escape sentinel in edit content + heredoc limits (2026-09-18, Deep-Dive A run)
- **Do:** the content-escape sentinel (`[<form>:esc]` in edit/write
  oldString/newString) RESOLVES — verified in `.opencode/temp/intercept.log`
  (kind=escape, scope=content, verdict pair-resolved; 5 attempts). When a
  worker reports "the sentinel was a no-op", check the intercept log FIRST
  (grep `kind=escape`) — the log is the ground truth; the observed real
  failure mode was the worker typing the SAME digits on both sides (identical
  after resolution → edit error unrelated to the escape). Corollary for
  planner/worker: to MATCH a literal escape form that sits IN the file, anchor
  the edit elsewhere (you cannot type the bracket form into oldString — it
  resolves before matching).
- **Do:** multi-section file authoring (>~90 lines) via the write/edit tools,
  NOT bash heredocs — heredocs that long silently truncate mid-content with
  no error (worker-reported, Deep-Dive A: lost a whole section).
- **Do (maintainer move, observed 2026-09-18):** a LIVE escape form can only
  reach a file via bash (unresolved) or the maintainer's own editor; the
  maintainer may render a form INERT by breaking the sentinel (e.g. dashes
  around it) — an inert form is then matchable/removable literally via
  oldString. Recognize both forms in files; never try to "fix" an inert one.
- **Keys:** escape, sentinel, intercept-log, edit, oldString, heredoc,
  truncation, dense-numeral, verification.

## The built-in `edit` tool chokes on non-ASCII chars in oldString (cured 2026-09-21 from knowledge_inbox)
- **Do:** when the text to replace contains non-ASCII characters (em-dashes,
  curly quotes, umlauts), do NOT fight the built-in `edit` — use
  `block_transfer` (line-anchor based, ASCII-safe) or a small node script for
  the replacement. Avoid non-ASCII in new text where possible (maintainer #7:
  "do not use non-ASCII chars if possible").
- **Why (evidence):** maintainer report 2026-09-15 (priority.md #7): the
  planner working on code failed multiple times on non-ASCII `oldString`
  matches and needed a script.
- **Ref:** priority.md #7; `block_transfer` tool.
- **Keys:** edit, oldString, non-ASCII, unicode, em-dash, block_transfer,
  replacement, script fallback.

## Model config facts: "half prefill" = context size; the cost metric is TIME (cured 2026-09-21 from knowledge_inbox)
- **Do:** treat "half prefill" on the Q4 models as a CONTEXT-SIZE setting
  (enlarges the effective window), not a cost mitigation — its price is slower
  initiation. Frame every optimization as time-per-iteration: the only cost
  metric on this setup is TIME (energy); there is no token/money cost.
- **Why (evidence):** maintainer-verified 2026-09-18 (prompt-engineer scan
  comments).
- **Ref:** knowledge_inbox entry 2026-09-18_14-29 (agent_Q4_140K); the model
  config in `opencode.jsonc`.
- **Keys:** half-prefill, context size, cost, time, energy, optimization
  framing.

## dump_session.cjs modes (#78, 2026-09-23): --json raw / lossless full / --lite + the byte-identical verify recipe
- **Do:** the single-session modes are: default = LOSSLESS full markdown
  (every part's content — tool `state.input`/`state.output` emitted verbatim,
  no caps, orphan parts rendered); `--lite` = the filtered preset (text +
  reasoning verbatim, tool header-only, step-start/step-finish skipped,
  other types 400-capped, meta 600-capped); `--json` = RAW JSON document
  (`{session, messages: [{…, parts: [{id, time_created, data}]}],
  orphan_parts}`) — the `data` values are the parsed part/message `data`
  column (raw string when unparseable), uncapped, `--out` appends `.json`
  when the relpath has no extension; `--json`/`--lite` are single-session
  only (mutually exclusive with each other and with --all/--full/--slim).
  To verify a dump against the LIVE DB (read-only): re-serialize each
  dumped `data` value compactly (`JSON.stringify(parsed)`) and compare it
  to the raw DB `data` column string — measured 263/263 parts + 58/58
  messages byte-identical (opencode stores compact JSON, so the compact
  re-serialization round-trips exactly). For a substring spot-check inside
  the markdown, remember the values are JSON-escaped there (backslashes →
  `\`).
- **Why (evidence):** #78 spec (handover_task.md 2f64d76) + scoping
  plan11_78_scope.md; verified 2026-09-23 on
  ses_f31a5dee5ffe1DIBxZzEDZF8aF (58 msgs / 263 parts: 62 tool with
  input/output, 57 step-start, 57 step-finish, 57 reasoning, 30 text).
- **Ref:** `.opencode/agent/scripts/db/dump_session.cjs`; verify script
  (deleted scratch): scratch_78/a.json + b_full + b_lite, 2026-09-23,
  worker ses_f30807a16ffelPQPUBH50wiXBe.
- **Keys:** dump_session, --json, --lite, lossless, byte-identical,
  JSON.stringify, part data, #78.

## Same-model delegation — a model change drops the cache (maintainer-verified 2026-09-25)
- **Do:** launch workers on the SAME model as the planner (for the 245k
  slow planner: `worker_Q3S_245K_slow` — the roster default). A model
  change drops the KV cache and a full re-prefill is paid on the switch
  back; same-model back-and-forth is ~5 s or less per switch. Prefer
  self-compaction (same model) over any smaller-window model: the
  post-compaction restart beats re-filling a nearly full 230/245k
  window. The slow model is the SAME quality as the fast one (a bit more
  stable per the maintainer) — no quality trade for the cache win.
- **Why (evidence):** maintainer-verified 2026-09-25 (autorun message to
  planner-18): "always use the same model you use right now … on model
  change the cache is dropped and a full refill is paid … the longer the
  context window the more important it is to use the same model."
- **Ref:** maintainer autorun message 2026-09-25 (planner-18);
  `repo_map.md` Worker roster (default line, his a87a64e update);
  `opencode.jsonc` (245k context limit).
- **Keys:** same-model, delegation, cache, re-prefill, single slot, 245k,
  worker model choice, compaction vs refill.

## Out-of-sandbox access = LOOP FULL STOP (interactive TUI allow/deny)
- **Do:** treat any out-of-sandbox path access as a hard loop stop — it
  fires an interactive allow/deny request on the maintainer's TUI and
  halts the loop until he answers. Allowed without a stop: the DB and
  every `external_directory` path in `opencode.json`. Design tests (the
  block_transfer sandbox guard, the R8 redirect) to exercise the guard
  logic WITHOUT triggering a real out-of-sandbox access; a deliberate
  boundary probe will pause the loop on the maintainer (acceptable
  friction discovery — plan for it, don't surprise it).
- **Why (evidence):** maintainer clarification 2026-09-26 (autorun,
  planner-18): "if any worker tries to access outside of sandbox, the
  loop will stop. full stop. this triggers a request in my TUI to allow
  or deny it and will not allow continuation until I answer."
- **Ref:** maintainer autorun message 2026-09-26; `opencode.json`
  `permission.external_directory` (the allowed set).
- **Keys:** sandbox, out-of-sandbox, loop stop, TUI, allow/deny,
  external_directory, permission, block_transfer, R8.

## Large block removal: block_transfer over giant oldString edits (worker-18, 2026-09-26)
- **Do:** for 100+-line block removals, use `block_transfer` DELETE/CUT
  with short unique line-prefix anchors instead of `edit` with a giant
  oldString — exact-literal reproduction of a large block from memory is
  a transcription risk.
- **Why (evidence):** worker-18 (#100) hit the risk once on the 45-check
  S24 probe block, fell back to anchors, and finished clean.
- **Ref:** plan18 handover (910e767); commit bc374b2.
- **Keys:** block_transfer, DELETE, CUT, line-prefix, oldString,
  transcription risk, large removal.
