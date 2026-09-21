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

## ctx_gauge / `ctx:` lines lag ~2 tool calls — plan with margin
- **Do:** treat any gauge readout as a LOWER bound of real usage — plan
  with ~5k margin; trust the freshest reading plus your own tool-call
  count since it. More tool calls (low thinking) between readouts = a more
  exact value.
- **Why (evidence):** maintainer-measured 2026-09-15 (priority.md # 9):
  `ctx_gauge` and the inline `ctx:` replay lag a large context increase by
  ~2 tool calls — planner and worker consistently misjudge how close they
  are to the window end.
- **Ref:** priority.md # 9 (2026-09-15); the same session's stop-line
  incident (real wall ≈ 90% gauge reading, see NAP Standing).
- **Keys:** ctx_gauge, gauge, lag, context window, stop line, 90%,
  margin, REM.

## compact_memory: the pre-compaction dump hook (no-overwrite corpus naming)
- **Do:** the hook fires BEFORE ANY compaction dispatch (just before the
  client call, after the budget gate): `preCompactionDump(root, sessionID,
  count)` runs `dump_session.cjs <sid> --out <relpath>` via execFileSync
  (timeout 60 s, best-effort — NEVER throws / blocks). The name is
  `compaction_dumps/<sid>_c<count>.md` (count = the budget count at dispatch
  time); if that exact file already exists, a `_<YYYYMMDDTHHmmss>` stamp is
  added (BEFORE the `.md`) — one dump never overwrites another. On failure a
  `DUMP-FAIL <sid> <error>` line goes to `.opencode/temp/ctx.log` and the
  dispatch response gains a WARNING line; on success the response is
  UNCHANGED. The dump script's plain `<sid>` mode keeps "current state"
  semantics (refresh may overwrite) — compaction awareness lives ONLY in the
  hook's `compaction_dumps/` namespace.
- **Why (evidence):** TODO #152 (approved 2026-09-15) + the maintainer's
  --comment (no-overwrite across compactions of the same sid); probe S14
  (checks 101-107, 106/106 green 2026-09-15) pins the name function
  byte-exact + the no-overwrite proof; the S13 preamble places a stub dump
  script in the sandbox so the byte-exact dispatch responses stay clean (a
  missing script would append a WARNING).
- **Ref:** `.opencode/plugin/compact_memory.ts` (`preCompactionDumpName` /
  `preCompactionDump`); `handover_probe.mjs` S14; `dump_session.cjs` `--out`.
- **Keys:** compact_memory, pre-compaction dump, compaction_dumps, no
  overwrite, --out, DUMP-FAIL, S14, naming.

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
