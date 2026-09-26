// =============================================================================
// Persistent offline probe for .opencode/plugin/ctx_watchdog.ts (v2.5 — the
// de-peek build: native session-gated context gauge, TODO.md #30/#35;
// backend chain node:sqlite → bun:sqlite → spawn-sqlite3, TODO #37).
// REBUILT 2026-09-10 (continuation 2) + EXTENDED 2026-09-10 (#37 S7 backend
// chain section) + EXTENDED 2026-09-10/11 (v2.8: S9 readout append / ctx log /
// deferred delivery + the S8 deferred-delivery ticks) + EXTENDED 2026-09-11
// (L1: the ctx log tool-name field — S9 checks 54/55 byte-shapes updated +
// new 65/66) + EXTENDED 2026-09-11 (L2: the compact_memory custom tool —
// the new S10 section, checks 67-75; the tool file is imported DIRECT,
// type-stripped, the same way the plugin loads) + EXTENDED 2026-09-11
// (T5 L4+L5: the emergency recovery plugin — the new S11 section, checks
// 76-81; the plugin file is imported DIRECT, type-stripped, the same way
// the probe loads the tool) + EXTENDED 2026-09-12 (T2 loop-tool-batch part
// 2: the ctx_gauge custom tool — the new S12 section, checks 82-85; the
// tool file is imported DIRECT, type-stripped, the same way the probe
// loads the tool) + EXTENDED 2026-09-15 (T4: the compact_memory
// pre-compaction dump hook, TODO #152 — the new S14 section, checks 101-107;
// the dump script's --out flag; the S13 preamble places a stub dump script so
// the byte-exact dispatch responses stay clean) + EXTENDED 2026-09-16 (#60:
// the block_transfer + loop_log probe pins — the new S15 section, checks
// 108-10.17, and the new S16 section, checks 10.18-123; both tool files
// imported DIRECT, type-stripped, the S12/S13 load pattern) + EXTENDED
// 2026-09-16 (lane 5.2: the numword scriptlet — the new S17 section, checks
// 124-149; the shared numwords.json map + the node CLI spawned via
// execFileSync + the python twin via the repo venv + the module required
// DIRECT via createRequire) + EXTENDED 2026-09-16 (lane 5.3: the log-only
// intercept observer — the S18 section, checks 150-181; the plugin file is
// imported DIRECT, type-stripped, the NAMED core is pinned from the SPLIT
// core file (intercept_observer_core.ts — the 2026-09-16 export fix: the
// host loader requires EVERY Object.values(module) entry to be a function,
// so the plugin file exports the default factory ONLY), the read-scope
// fuzzy resolution (lane 5.4) is pinned (matcher exact/normalize/d1/d2/
// gap<2/d>2/cand-shape + the hook mutation / fail-closed / exact flows),
// the numword map is the REAL shared file, the hook writes to a sandbox
// project dir) + EXTENDED 2026-09-16 (R1: the [left:right] pair pipeline —
// the new S19 section, checks 182-194: the grammar switch (adder-sum /
// right-wins / multi-pair / old-form-dead / form negatives / numword-left /
// fourty), the read-scope pair mutation (existence gate: mutated /
// fail-closed none-exist / fail-closed both-exist / right-wins mutation),
// the non-read log-only rule, the SCRATCHPAD_ROOT sandbox allowance; S18's
// pair pins 157-160/165/167 were switched to the new form and its VERDICTS
// pin grew to 9) + EXTENDED 2026-09-25 (R8, #97: the out-of-sandbox path
// redirect — the new S28 section, checks 285-296: the pure 1:1 resolver
// (case (i) span == root / case (ii) direct sibling / 0 or >=2 fail-closed
// / root dedupe / degenerate inputs) + the hook e2e over the FALLBACK roots
// [workspace root, SCRATCHPAD_ROOT] (read/write sibling, span == root,
// no-mapping note, nested non-sibling); the config-read path is smoke-
// pinned) + EXTENDED 2026-09-26 (#102: the POSIX temp-root → scratchpad
// prefix mapping — the new S29 section, checks 297-304: the pure resolver
// (/tmp/<rest> + /var/tmp/<rest> + bare root + double-slash/backslash
// forms + no-mapping fail-closed) + the hook e2e (typed /tmp + /var/tmp
// redirect, the BASH `command`-string redirect — two mapped spans, the
// unmapped-span fail-closed, the mixed mapped/unmapped command): the
// pre-rebuild
// probe
// (v2.2.1 era) targeted the DELETED handover.ts, the retired
// experimental.chat.system.transform hook, and the fake-$-shell S4 shapes —
// all void with the shell gauge. PERMANENT repo tooling: RE-RUN, never rebuild
// — exception: the plugin's hook surface changes.
//
// EXACT RUN COMMAND (from the repo root — the shell switched to Git-Bash on
// 2026-09-15, so the command is the bash form; this IS the run command, do
// not rediscover anything):
//     node .opencode/plugin/probes/handover_probe.mjs
//
// WHY THAT COMMAND:
//   - the probe runs under plain system `node` (v24.19.0 on this host — the
//     Node 24+ line): native TypeScript type-stripping (the .ts plugin is
//     imported directly, no compile step, no flags, no bun) AND flag-free
//     built-in `node:sqlite` (the probe BUILDS its temp fixture DBs with
//     DatabaseSync — NO python, NO live DB anywhere in the probe; the S7
//     backend-chain section additionally exercises the spawn backend
//     END-TO-END with the REAL maintainer-placed sqlite3.exe — READ-ONLY
//     URIs against the sandbox fixtures, never the live db). One
//     MODULE_TYPELESS_PACKAGE_JSON warning on stderr is expected and
//     harmless (`.opencode/package.json` has no "type" field and must not
//     gain one — that would change the plugin's module context).
//   - the probe runs under NODE, so the chain backends that need a different
//     host (bun:sqlite) are exercised by FORCING them via the core's
//     setBackends hook: backend 2's ADAPTER shape is verified with a
//     unit-mock module (the real bun:sqlite API was verified separately
//     against the system bun 1.4.2 — host proof 2, see the worker summary),
//     and backend 3 is verified end-to-end with the real exe.
//   - the gauge's source in EVERY S4/S6 shape is a temp fixture sqlite DB
//     built by this probe itself (opencode-like schema per the T1 spec fact 2:
//     `session`(id, time_updated, model JSON) + `message`(session_id,
//     time_created, data JSON with tokens+finish)) in the sandbox, pointed at
//     via the core's setDbPath / readGauge(path) — the core and the plugin
//     share ONE module instance (same resolved file), so the plugin's
//     chat.message read hits the same fixture.
//   - one file, self-contained, re-runnable from the repo root.
//
// WHAT IT RUNS:
//   The plugin is initialized with directory=<temp sandbox root> (os.tmpdir,
//   mkdtemp), so ALL its fs writes land in the sandbox: dummy
//   .opencode/agent/handover/handover_task.md spec (non-empty sentinel), mirror file pre-filled
//   with STALE content, empty plugin.log. The real .opencode/ files are NEVER
//   touched (S5 verifies byte-identity + zero writes outside the sandbox).
//   S1 pre-flight warn (3): spec present → no warn; renamed away → exactly ONE
//      byte-exact warn + byte-exact restore; emptied → exactly one new warn +
//      byte-exact restore
//   S2 non-handover delegations invisible (4): task w/o spec in prompt;
//      non-task tool w/ spec-ish prompt; task w/ missing args (no throw);
//      cumulative tally
//   S3 mirror DISABLED (P02, v2.7) (5): the plugin NEVER touches the mirror file —
//      non-empty output / truncated:true / empty output all leave it byte-identical
//      to the pre-filled sentinel; exactly 3 tool.after log lines (logging is
//      unchanged); final mirror state == pre-filled sentinel
//   S4 chat.message shapes (8) — v2.5 native gauge, session-gated match-only
//      post (the v2.2.1 fake-shell shapes are GONE):
//      (t1) ok-match: the posted part is BYTE-EXACT
//          `ctx: SESSION=ses_fx_ok CTX=10000 (3%) REM=246000` (id prt-ctx-,
//          messageID from output.message.id, sessionID echo, prior part kept)
//          + chatmsg evidence carries sess=ses_fx_ok + ZERO gauge lines
//      (t2) unknown-window match: `ctx: SESSION=ses_fx_unk CTX=50` posted
//          (honest own-session result — information, not error)
//      (t3) notAvailable match: `ctx: SESSION=ses_fx_empty CTX=notAvailable`
//          posted
//      (t4) mismatch-silent: sid ses_fx_ok vs sessionID ses_other → NO post,
//          NO gauge line (the per-fire chatmsg evidence line is still logged —
//          with the sess field — a mismatch is a normal multi-session state)
//      (t5) db-error: missing fixture db → no throw, no post + ONE gauge line
//          {reason:db-error, session, preview = the core's own error text
//          capped 120} byte-exact
//      (t6) parts-not-array: match + parts not an array → no throw + ONE gauge
//          line {reason:parts-not-array, session}
//      (t7) invalid-messageID: match + a non-msg message id → no throw + ONE
//          gauge line {reason:invalid-messageID, session, message}
//      (t8) no-throw: hook called with empty {} / {} → resolves
//   S6 gauge core shapes (8) — direct core calls against the fixtures:
//      known-window byte-exact + field values / unknown-window byte-exact /
//      notAvailable byte-exact / missing-db db-error (no throw,
//      formatGauge = `SESSION=unknown CTX=notAvailable`) / SESSION= prefix on
//      every readout / parseWindow cases (256K, 210K, 1.5M, 120K_MTP, no-match,
//      non-string) / parseModelId (JSON id / plain / malformed / empty) /
//      setDbPath+getDbPath global plumbing with explicit-path override
//   S6b item 3 (2026-09-24): the "N compactions left" budget suffix on the
//      readout line (6): the 3 states (count < cap → plural ` | N
//      compactions left` / count === cap + key ABSENT → ` | 1 compaction
//      left` (the fail-open default-1 emergency — NOT 0) / count > cap →
//      ` | 0 compactions left`) + the emergency_budget-0 explicit case +
//      the fail-open no-suffix form (the probe default budget path is a
//      never-created sandbox file → every pre-existing readout pin stays
//      byte-identical) + the no-total entry-model fallback
//   S7 backend chain (11) — the #37 chain IS contract: each backend is
//      FORCED via setBackends([...]) and verified against the sandbox
//      fixtures (the list is cleared/restored between sections):
//      (29) node:sqlite forced → byte-identical readout + fields
//      (30) bun:sqlite forced, module ABSENT on the node host → db-error
//           NAMING the backend, no throw
//      (31) failed import is memoized — NOT re-tried on subsequent fires
//           (per-process cache; importAttemptsForTest counter)
//      (32) bun:sqlite ADAPTER shape via a unit-mock module:
//           Database(path, {readonly:true,timeout:2500}) + PRAGMA exec +
//           prepare().get() ×2 (ordered) + close; readout byte-identical
//      (33) unit-mock bun:sqlite no-row (get() → null, bun's no-row value)
//           → no-total form byte-identical
//      (34-36) spawn-sqlite3 forced, END-TO-END with the REAL exe on the
//           fixtures: ok / unknown-window / no-total — all byte-identical
//      (37) full chain, missing db → db-error naming the DEEPEST failing
//           backend (spawn-sqlite3), notAvailable form
//      (38) fallback: a working backend whose module later fails falls
//           through to the next backend (spawn ok); the failed import is
//           not re-tried (attempts +1 total)
//      (39) hook restore: getBackends() back to the default chain order,
//           setDbPath/getDbPath plumbing intact, read byte-identical
//   S8 nudge ladder (8) — the v2.6 auto-nudge ladder (TODO #30/#33, the
//      APPROVED design of record), fired from tool.execute.after with a
//      PER-SESSION read against the fx_lad.db fixture (window 120K — one
//      session per rung + two delivery-failure sessions); the plugin is
//      re-initialized with a FAKE client that records every promptAsync
//      call; evidence = kind:"nudge" lines only (silent on every non-fire).
//      v2.8: delivery is DEFERRED (setImmediate + the busy check) — every
//      check awaits a ~25 ms tick() before asserting promptAsync calls:
//      (46) below the first rung (49%) → SILENT (no line, no call)
//      (47-51) rungs 1-5 each fire EXACTLY ONCE: byte-exact nudge line
//          {session, rung, readout} + promptAsync payload
//          {path:{id}, body:{parts:[{type:"text", synthetic:true, text =
//          readout + " — " + rung instruction}]}} (after the tick)
//      (52) per-rung dedup: a second fire at the same rung posts NOTHING
//      (53) delivery failures evidence-logged (delivery-threw /
//          delivery-rejected, preview capped) — never thrown
//   S9 readout + ctx log + deferred delivery (12) — the v2.8 build (the
//      re-scoped design of record — see the plugin's v2.8 header block): ONE
//      per-session gauge read per tool.execute.after feeds (1) the MINIMAL
//      readout appended to the tool result, (2) the ladder (unchanged), (3)
//      the single-file ctx log at SANDBOX/.opencode/temp/ctx.log (isomorphic:
//      an entry IFF the readout was appended). The ctx log line carries the
//      tool-name field (the tool.execute.after tool — OMITTED when the
//      payload has none, mirroring the model field; L1 of the
//      compaction-lifecycle proposal). Fixture fx_ro.db (window 120K
//      except where noted; ses_ro_absent deliberately NOT in the db); the
//      plugin is re-initialized with a status-aware fake client (a mutable
//      S9_STATUS drives the busy/idle check — direct-map and SDK fields-style
//      shapes):
//      (54) known window: output byte-exact `tool body\n(35% used, 78K left)` + ctx log
//          line 1 `<dt> probe-model-120K_MTP task (35% used, 78K left)`, below rung 1
//      (55) unknown window on a trailing-newline output `x\n`: direct concat
//          byte-exact `x\n(46K used)` + ctx log line 2 WITH the model + tool
//      (56) no-total (in-flight step, no finish): NO append / NO log /
//          no nudge line
//      (57) missing session (not in the db): per-session read no-total → same
//      (58) non-string output.output (defensive — the SDK declares string):
//          no throw, object untouched, NO log entry (isomorphism)
//      (59) DEFERRED delivery (rung 1, status unknown): after the awaited
//          afterFeed promptAsync NOT called synchronously (0 calls) while the
//          nudge evidence line IS synchronous; exactly 1 call after the tick
//          with the byte-shape synthetic payload (readout byte-exact)
//      (60) BUSY (direct-map status fake): 0 calls after the tick, evidence
//          line fired, readout append + log entry unaffected
//      (61) status ABSENT (fn returns undefined): the deferral alone still
//          delivers — exactly 1 call after the tick
//      (62) BUSY via the SDK fields-style fake `{data: {sid: {type:"busy"}}}`:
//          0 calls after the tick
//      (63) IDLE (fields-style): exactly 1 call after the tick
//      (65) ctx log tool-name field PRESENT: byte-shape
 //          `<dt> CPU-Qwen3-0.6B task (46K used)` (the fake tool name)
 //      (66) ctx log tool-name field OMITTED: payload without a `tool` key →
 //          byte-shape `<dt> CPU-Qwen3-0.6B (46K used)`
 //   S10 compact_memory v1 tool (9) — the L2 approved design (the
  //      compaction-lifecycle proposal): the RETIRED v1 tool file
  //      .opencode/plugin/deactivated/compact_memory_v1.ts is imported DIRECT
  //      from the repo path (type-stripped, the same way the plugin loads —
  //      the tool file
 //      MUST load that way) and driven with a FAKE client (records every
 //      session.compact call; a mutable FAIL switch) + a FAKE context
 //      (directory=SANDBOX steers ALL the tool's fs writes — the budget
 //      store + the COMPACT ctx.log line — into the sandbox; sessionId per
 //      the prototype's working shape, modelId/preReadout = the best-effort
 //      L1 fields):
 //      (67) the tool file imports and exposes the tool() default export
  //          (description + async execute + the prototype's arg names as a
  //          plain-object args of NAME → zod schema; the T3 prototype's
  //          default.tools.compact_memory shape is GONE — re-aligned
  //          2026-09-12 to the committed tool() form, T5 re-verify)
 //      (68) execute calls session.compact with the PASSED-THROUGH keep
 //          knobs (the fake client captures the call) + path.id
 //      (69) the sessionID arg ABSENT → the context.sessionId fallback
 //          targets the compact call
 //      (70) the COMPACT line is written after success — byte-shape
 //          `<dt> <model> COMPACT <sid> tokens=<t> messages=<m>
 //          (<pre-readout>)` (best-effort fields PRESENT when carried)
 //      (71) the same line with model + pre-readout ABSENT → BOTH fields
 //          OMITTED (the T2 omit-when-empty convention), never thrown
 //      (72) the budget allows EXACTLY 2 compactions per session id and
 //          REFUSES the 3rd with the hand-over note (NO compact call on
 //          the 3rd)
 //      (73) the budget state is PERSISTED to disk: compact_budget.json
 //          carries count==2 AND a FRESH module instance (cache-busted
 //          re-import) still refuses — persistence, not in-memory
 //      (74) a FAILING session.compact returns the error note (no throw)
 //          and does NOT consume the budget (the next call compacts)
 //      (75) the success return carries the re-application file pointer;
  //          the refusal return carries the hand-over note
  //   S11 emergency recovery plugin (13) — TODO #93: the 2026-09-25
  //      event-hook port of the T5 prototype (re-pin): the plugin file
  //      .opencode/plugin/context_recovery.ts is imported DIRECT from the
  //      repo path (type-stripped, the same way the plugin loads) and
  //      driven with a FAKE client (records every session.summarize /
  //      session.promptAsync / session.messages call) + FAKE SDK events
  //      (the current host's delivery shape: { type: "session.error",
  //      properties: { sessionID, error } } / { type: "session.idle",
  //      properties: { sessionID } }) + a sandbox root (directory=SANDBOX
  //      steers the flag read, the budget store, and the COMPACT ctx.log
  //      line into the sandbox); the activation flag is the top-level
  //      `emergencyRecovery` key in the SHARED compact_budget.json (the
  //      SAME file the S10/S13 tools use); the v2 budget gate (the
  //      model_budget map — default cap 1, the messages-resolved
  //      "smoke-model" UNLISTED):
  //      (76) the file imports and exposes a default factory whose
  //          returned hooks object carries the `event` hook (NO
  //          "session.error" key — that hook does not exist in the
  //          current SDK)
  //      (77) flag OFF (no emergencyRecovery: true key) + overflow
  //          event → no summarize, no promptAsync, no budget entry
  //      (78) flag ON + overflow event + fresh budget (cap 1) → the
  //          summarize body carries the messages-resolved pair + keep
  //          { messages: 12 } (tokens UNRESOLVED → tok=- none), the
  //          directive byte-matches the ported constant (the spec-2+11
  //          relay wording), budget count==1 ON DISK, the COMPACT line
  //          `<dt> smoke-model COMPACT ses_rc_ok keep=12m tok=- none`
  //      (79) the once-per-overflow guard: 3 more burst events for the
  //          same overflow → no-ops (exactly ONE compact), budget
  //          unchanged
  //      (80) EventSessionIdle clears the guard: the next overflow → the
  //          emergency slot (count 1 == cap 1): count → 2, the line
  //          carries the ` emergency` suffix
  //      (81) budget exhausted (count 2 > cap 1) → CLEAN FAIL: no
  //          summarize, no promptAsync, no new COMPACT line, budget
  //          unchanged
  //      (257) flag ON + NON-overflow error → no-op
  //      (258) flag value `false` → OFF
  //      (259) keep override: keepMessages 7 in the budget file → body
  //          keep { messages: 7 } (tokens UNRESOLVED → tok=- none) + the
  //          line `keep=7m tok=- none`
  //      (260) config pair override: the sandbox opencode.jsonc
  //          agent.compaction.model → the summarize body carries the
  //          CONFIG pair + the line's model field (file removed
  //          afterwards)
  //      (261) unresolvable model pair (no session.messages) → the
  //          request is NOT sent (CLEAN FAIL)
  //      (285) keepTokens computed: messages return token data (wrapper
  //          shape, last 12 = all 2) → body keep.tokens 4500 (computed)
  //          + the line `keep=12m tok=4500 computed`
  //      (286) keepTokens budget fallback: messages read FAILS + budget
  //          store keepTokens 42000 + sandbox config pair (deviation 1)
  //          → body keep.tokens 42000 (budget) + the line
  //          `keep=12m tok=42000 budget`
  //   S12 ctx_gauge tool (4) — the loop-tool-batch part 2 approved design
//      (the peek readout as a directly-fired tool): the tool file
//      .opencode/tools/ctx_gauge.ts is imported DIRECT from the repo path
//      (type-stripped, the same way the probe loads compact_memory.ts — the
//      tool file MUST load that way); the tool wraps the SAME gauge-core
//      module instance (its relative import resolves to the same file), so
//      the setDbPath steering below reaches its reads; the tool is READ-ONLY
//      (no fs writes, no plugin hooks — the S5 tallies are unaffected):
//      (82) the tool file imports and exposes the tool() default export
//          (description string + the optional sessionID arg as a zod schema
//          — undefined parses, a non-string rejects + async execute, NO
//          name field — the host names the tool by filename)
//      (83) execute on the FX_OK fixture (steered via setDbPath): the
//          default newest-session read is BYTE-EXACT (the S4/S7 readout
//          form) and the sessionID arg is passed through (the per-session
//          read of the older fixture session)
//      (84) db-error (the never-created MISSING_DB): no throw, the line is
//          NEVER replaced — `SESSION=unknown CTX=notAvailable` + the
//          APPENDED ` — <error>` note (the in-band mirror of peek.mjs's
//          stderr addition)
//      (85) hook restore (cf. check 39): the global db path is back where
//          S12 found it; a global read and an explicit-path read of the
 //          restored path agree byte-exact (no drift left by S12)
//   S13 compact_memory plugin tool (21) — the approved v2 proposal + the
//      2026-09-14 maintainer adaptation (explicit pair override; SELF sync,
//      CROSS fire-and-forget dispatch — see the spec's revision note) (the
//      plugin-registered compact_memory, quant-class budget; supersedes the
//      v1 pinned by S10): the plugin file is imported DIRECT (type-stripped)
//      — no hook fires (S5 tallies unaffected); ALL fs writes steered into
//      the sandbox via directory=SANDBOX; fake client records
//      summarize/compact/messages; fresh ses_qc_* ids (in the FINGERPRINT):
//      (86) registration shape (4 args — the override pair is GONE, unit A); (87)
//      classifier fixtures incl. the trap; (88) summarize path (SELF sync) +
//          default response BYTE-EXACT; (89) keep retry-once (cross dispatch,
//          async-verified); (90) compact flat; (91) no-client error naming
//          both probes; (92) gate (cap−1 dispatched, cap denied, zero side
//          effects); (93) CPU always denied; (94) increment-on-verified-
//          success only (cross dispatch); (95) v2 store schema on disk (model
//          populated); (96) COMPACT line WITH model; (97) message + dispatch
//          line (cross, NO trailer); (98) cross-session model read (the LAST
//          entry, pair-less); (100 REMOVED 2026-09-21 unit A — the explicit
//          pair override is GONE, the S25 section pins the config resolver);
//          (99) failing RPC (default cap + note, no throw);
//          (222) emergency-1 gate part 1 (item 10: fixture {Gate-M: 2} +
//          emergency_budget 1 — calls 1-2 dispatched, call 3 no-arg DENIED
//          naming the `emergency`-arg availability, zero side effects);
//          (223) call 3 emergency:true DISPATCHES (count → cap+1, the
//          COMPACT line carries ` emergency`, the normal lines carry NO
//          suffix); (224) call 4 emergency:true DENIED (fully exhausted) +
//          the state survives a FRESH module instance (cache-busted
//          re-import); (225) emergency_budget 0 → DENIED; (226) key ABSENT
//          → fail-open default 1 (the emergency is consumed);
//          (287) keepTokens computed (tool path): messages return token
//          data (wrapper shape, last 2) → body keep.tokens 4500
//          (computed) + the line `keep=2m tok=4500 computed`;
//          (288) keepTokens budget fallback (tool path): messages read
//          FAILS + store keepTokens 30000 + model_budget cap 3 → body
//          keep.tokens 30000 (budget) + the line `keep=4m tok=30000 budget`
//   S14 compact_memory pre-compaction dump hook (7) — TODO #152 (approved
//      2026-09-15): BEFORE ANY dispatch the hook dumps the target session's
//      full pre-compaction content into the corpus via the dump script
//      (<root>/.opencode/agent/scripts/db/dump_session.cjs <sid> --out
//      <relpath>); NO-OVERWRITE naming keyed on the budget count
//      (compaction_dumps/<sid>_c<count>.md, a timestamp suffix when the name
//      already exists); best-effort — a failure appends DUMP-FAIL to the
//      ctx.log + a WARNING to the dispatch response (UNCHANGED on success):
//      (101) preCompactionDumpName byte-exact (the normal c0/c7 case);
//      (102) preCompactionDumpName byte-exact (the stamped fallback, fixed
//          stamp — NO clock inside the function);
//      (103) preCompactionDump is a function (the exported hook);
//      (104) sandbox root WITHOUT the script → no throw, {ok:false}, a
//          DUMP-FAIL line appended to the sandbox ctx.log;
//      (105) the FAKE script (mimicking the real one's __dirname OUT_DIR +
//          --out handling): hook call #1 (count 0) creates
//          compaction_dumps/<sid>_c0.md with the marker content;
//      (106) hook call #2 (same count) → the base name EXISTS now → the
//          STAMPED name (<sid>_c0_<YYYYMMDDTHHmmss>.md) is created instead;
//      (107) no-overwrite proof: file #1 is BYTE-IDENTICAL after call #2
//   S15 block_transfer tool (12) — the #60 probe pin (part 1 of 2): the
//      named-clipboard block mover (.opencode/tools/block_transfer.ts,
//      post-#57) imported DIRECT (type-stripped, the S12/S13 load pattern);
//      ONE loaded instance drives the whole section (the in-memory
//      clipboardBuffers); all writes steered to the sandbox (directory=
//      SANDBOX, inside TEMP — the tool's own allowed root):
//      (108) registration shape: the tool() default export (description +
//          the 7 args in order — the mode enum, 6 optional strings — async
//          execute, NO name field);
//      (109) COPY: the inclusive anchor span + the byte-exact `Copied`
//          return + the source byte-identical;
//      (10.10) PASTE round-trip (fresh dst, EOF append): byte-exact return +
//          the dst carries the inclusive block byte-exact;
//      (10.11) PASTE with targetMarker: the block lands RIGHT AFTER the
//          target line (vs the EOF append of 10.10), byte-exact file;
//      (10.12) the #57 post-fix pin: MOVE without dstFile → the exact
//          `Error: 'dstFile' is required for MOVE mode.` + the source
//          byte-identical (the guard is hoisted pre-write);
//      (10.13) the sandbox guard: MOVE with an outside dst → the byte-exact
//          `Error: '<path>' is outside the sandbox (allowed: <roots>)`
//          BEFORE any fs access (source untouched, no file created);
//      (10.14) the missing start marker → the byte-exact error naming the
//          marker + the file;
//      (10.15) the end marker present ONLY before the start → the byte-exact
//          `... not found after start marker.` (the end search starts at the
//          start line);
//      (10.16) the buffer lifecycle end: the byte-exact CLEAR return + a
//          PASTE of the cleared buffer → the byte-exact empty-buffer error
//          (no file written);
//      (10.17) MOVE success: byte-exact `Moved` return + the source cut to
//          its byte-exact remainder + the dst carrying the inclusive block;
//      (262) TODO #94: REPLACE happy path: the anchored span of the existing
//          dst replaced IN PLACE by the buffer — byte-exact dst + byte-exact
//          `REPLACED` report + the buffer preserved (a later PASTE still
//          reports its 2 lines);
//      (263) TODO #94: REPLACE non-unique start anchor → the byte-exact
//          non-unique error + the dst byte-identical (no write)
//   S16 loop_log tool (6) — the #60 probe pin (part 2 of 2): the looprun
//      activity log as a directly-fired tool (.opencode/tools/loop_log.ts,
//      T3 loop-tool-batch part 3) imported DIRECT (type-stripped); driven
//      with sandbox roots (the created autorun-* folder + loop_log.md land
//      in the sandbox, never the repo's real .opencode/loop/); the folder
//      stamp is local-clock — pinned by FORMAT only (the AGENTS.md
//      pattern-5 discipline):
//      (10.18) registration shape: the tool() default export (description +
//          the 5 args in order — role/model/content required strings, the
//          status ENUM of the five 8-char tokens, session optional — async
//          execute, NO name field);
//      (10.19) the empty loop root → auto-created
//          `autorun-<YYYY-MM-DD_HH-MM>` (stamp format pinned) + loop_log.md
//          (one line); the return is EXACTLY `folder: <name>\nline: <line>`
//          (no ANOMALY);
//      (120) the line format `<stamp> <status> <role> <session|unknown>
//          <model> <content>` (field order byte-exact) + the omitted session
//          → the literal `unknown`;
//      (121) the session passthrough (4th field) + append-only (the file
//          gains EXACTLY one line per call) + the single-folder reuse (no
//          ANOMALY);
//      (122) the empty-string session → the literal `unknown` (the
//          fallback covers omitted AND empty);
//      (123) the SEVERAL-folders anomaly: the most-recently-MODIFIED
//          folder is used + the byte-exact `ANOMALY:` note as the 3rd
//          return line (the other folder untouched)
//   S17 numword scriptlet (26) — the lane-5.2 pin (approved 2026-09-16): the
//      ONE shared map (numwords.json) + the node entry point (CLI spawned,
//      module required DIRECT) + the python twin (spawned via the repo venv
//      python — the fixture run is LIVE in the probe):
//      (124) the shared map is complete: units zero..nine, tens ten..ninety
//          incl. the `fourty` alias → 40, teens eleven..nineteen EXPLICIT;
//      (125-131) node CLI pass fixtures: nine→9, ninetyfour→94, fourty→40,
//          one-zero-one→101, two-zero→20, one-zero-six→106, eleven→11
//          (exit 0, digit string byte-exact);
//      (132-135) node CLI reject fixtures: twozero / two+zero / foour /
//          eleventy → exit 1 + `unknown` on stderr (loud, never guessed);
//      (136-142) python w2n pass fixtures: the same 7, byte-exact stdout;
//      (143-146) python w2n reject fixtures: the same 4 → ValueError (non-zero
//          exit);
//      (147) the module (node -e usable): w2n agrees with every pass fixture;
//      (148) the module: every reject fixture throws (loud);
//      (149) numword_check: AGREE 20 (code 0) / DISAGREE 9 (code 1) /
//          UNKNOWN eleventy (code 2) — machine-readable shell contract
//   S18 intercept observer (32) — the lane-5.3 log-only pin + the lane-5.4
//      read-scope fuzzy resolution (approved 2026-09-16): the NAMED core
//      (pure functions over arg strings + the ONE shared numword map —
//      addendum C3) from intercept_observer_core.ts + the C7 8-field line
//      shape + the never-mutates (observation channel) / never-throws hook
//      discipline + the read-scope mutation contract:
//      (150-151) the ONE shared map home: the REAL numwords.json loads; a
//          missing path → null (numword checks silently off);
//      (152-154) resolveNumword: every 5.2 pass fixture → value; every 5.2
//          reject fixture → unknown (loud, never a guess); a multi-split
//          word (synthetic map) → ambiguous WITH candidates;
//      (155-156) observeDense (>=6-digit run gate) + observeNumword (map hit
//          → value; twozero unknown → none; map null → none);
//      (157-160) observePairs: agree (dist=0) / mismatch (dist=1) / unknown
//          word (gate=word-unknown) — byte-exact evidence; a shell pipe
//          (spaces) and a word-first order are NOT pairs;
//      (161-163) observePathAnomaly (doubled segment) + observeSandbox
//          (outside/under/null root) + underRoot (JSON-escaped `\\` collapse,
//          case-insensitive);
//      (164) classifyContext: date / session-id / commit-ref / path / arg;
//      (165-166) observeArg: 5 firing classes → capped at 3 lines in
//          priority order; clean/empty arg → no line;
//      (167-169) the HOOK (real factory, sandbox project dir): output.args
//          byte-identical (observation channel never mutated); garbage input
//          → never throws; the log line is EXACTLY 8 " | " fields
//          (stamp/sid/model-unknown/tool/verdict vocabulary) + the LIVE log
//          untouched;
//      (170) the intercept log path is git-ignored;
//      (171) the EXPORT FIX: the plugin module exports the default factory
//          ONLY (every Object.values entry is a function — the host loader
//          contract; the ~16 named exports moved to the core file);
//      (172-178) the read-scope FUZZY MATCHER (core.resolveReadPath, pure
//          over a relative-path corpus — research §2.2/§2.5): exact (byte-
//          equal rel) → {exact}; normalize (case/backslash/trim) → {exact};
//          d=1 → {resolved,d:1,gap>=2}; d=2 (transposition) → {resolved,
//          d:2,gap>=2}; gap<2 (two close siblings) → {rejected,
//          reason:gap-too-small, top-3 cands [rel,d]}; d>2 → {rejected,
//          reason:d-too-high, top-3 cands}; empty corpus → {rejected,
//          reason:empty-corpus} (fail-safe: never resolves);
//      (179-181) the HOOK read-scope (real factory, sandbox project dir,
//          real corpus under a sub-root): a d<=2 mistyped read filePath is
//          MUTATED to the resolved absolute path + a fuzzy-resolved 8-field
//          line; a d>2 read is FAIL-CLOSED (args byte-identical) + a
//          fuzzy-rejected line (top-3 cands + reason); an exact existing
//          path → untouched + no fuzzy line + the LIVE log still untouched.
//   S19 [l:r] pair pipeline (13) — the R1 pin (approved 2026-09-16; design
//      source: research/fuzzy-numword/decision-record.md §2.4-§2.6): the
//      [left:right] grammar (no inner spaces, exactly one colon; left ∈
//      digits-as-seen | adder-sum | numword form incl. the `fourty` alias;
//      right = numword form ONLY; the OLD digit|word pipe form is dead) +
//      the read-scope pair mutation (existence gate, right-wins canonical)
//      + the non-read log-only rule + the SCRATCHPAD_ROOT allowance:
//      (182) adder-left [800+50+11:eight-six-one] → ok (the SUM is the left
//          value), byte-exact evidence;
//      (183) mismatch right-wins [121:one-two-zero] → redundancy-mismatch,
//          canon=120 (ALWAYS the right-derived value);
//      (184) multi-pair per arg → 2 independent ok lines (one per pair);
//      (185) form negatives: old pipe form (dead), inner spaces, 2-colon →
//          none;
//      (186) numword-left [four:four] → ok; unknown left [foour:four] →
//          no-candidate gate=left-unknown;
//      (187) the `fourty` alias on a pair side → [40:fourty] ok;
//      (188) HOOK read gate: canonical exists + pair path absent → filePath
//          MUTATED to the canonical + a pair-resolved 8-field line (exactly
//          ONE line — no double-logging);
//      (189) HOOK read gate fail-closed: canonical absent → NOT mutated +
//          pair line gate=none-exist + the fuzzy channel still runs on the
//          result (fuzzy-rejected — the fixed pipeline order);
//      (190) HOOK read gate both-exist (brackets legal on-disk) → NOT
//          mutated + pair line gate=both-exist;
//      (191) HOOK read right-wins mutation: [7:eight] mismatch → MUTATED to
//          file-8.txt + pair-resolved dist=1;
//      (192) HOOK non-read (bash): pair logged ONLY, args byte-identical;
//      (193) SCRATCHPAD_ROOT: constant pin + slash/backslash-case/deep
//          scratchpad paths → no out-of-sandbox; C:\Windows control fires;
//      (194) HOOK scratchpad: bash arg under the scratchpad → zero lines.
//   S20 write-scope pair/fuzzy (15) — the R2 pin (approved 2026-09-16) +
//      the M1 write-fuzzy exclusion (approved 2026-09-17, #72); design
//      source: research/fuzzy-numword/decision-record.md §2 + research doc
//      §2.3/§3.4): the strict existence gate at the MUTATING surface + the
//      mismatch fail-closed asymmetry + the d<=1 write-fuzzy bar on
//      edit/block_transfer ONLY (`write` excluded — "new file" is a legal
//      intent, the d=1 near-miss must not hijack; scope=write flag — the
//      nine verdicts stay byte-identical) + the content-scope guard + the
//      bash git-ref gate (git for-each-ref existence):
//      (195) HOOK write pair gate: canonical exists + pair-form absent →
//          filePath MUTATED + pair-resolved gate=mutated (byte-exact);
//      (196) HOOK write pair gate fail-closed: canonical absent → NOT
//          mutated + gate=none-exist + NO fuzzy line (M1: the write fuzzy
//          channel is gone — zero new lines beyond the pair line);
//      (197) HOOK write pair gate both-exist → NOT mutated + gate=both-exist
//          (one line, the fuzzy fast-paths the existing original);
//      (198) HOOK write MISMATCH ASYMMETRY: [7:eight] + file-8.txt exists →
//          NOT mutated + redundancy-mismatch gate=fail-closed (contrast the
//          read scope, S19 pin 191) + NO fuzzy line (M1);
//      (199) HOOK block_transfer: srcFile pair MUTATED + dstFile
//          byte-identical;
//      (200) HOOK write fuzzy d=1 (file-9.txt, single-sibling dir) → NOT
//          mutated + ZERO new log lines (M1, 2026-09-17, #72: no fuzzy
//          channel for write — the d=1 near-miss must not hijack);
//      (201) HOOK write fuzzy d=2 (file-56.txt) → NOT mutated + ZERO new
//          log lines (M1 — nothing is logged for a bare write miss);
//      (202) content-scope guard (write): pair in content → log line ONLY,
//          args byte-identical (the `args[1:one]` python-slice collision);
//      (203) content-scope guard (edit): pair in oldString → log line ONLY,
//          args byte-identical;
//      (204) HOOK bash git-ref gate PASS: 40-hex tag ref verifies → command
//          MUTATED + pair-resolved gate=ref-mutated run=<tag> (byte-exact);
//      (205) HOOK bash git-ref gate FAIL: 1-char-off ref unverified → NOT
//          mutated + gate=ref-rejected run=<failref>;
//      (206) HOOK bash git-ref mismatch → NOT mutated + bare mismatch line
//          (no gate attempt);
//      (207) HOOK bash git-ref no-candidate ([4:foour]) → gate=right-unknown,
//          NOT mutated (gate not attempted);
//      (208) HOOK edit fuzzy d=1 (file-9.txt, the wf fixture) → MUTATED to
//          file-4.txt + fuzzy-resolved scope=write d=1 gap=inf (edit KEEPS
//          the fuzzy channel — M1);
//      (209) HOOK edit fuzzy d=2 (file-56.txt) → NOT mutated +
//          fuzzy-rejected scope=write reason=d-too-high (edit keeps the
//          d<=1 bar — M1).
//   S21 R7 segment-level channel (12) — the R7 pin (2026-09-17; design
//      source: research/fuzzy-numword/decision-record.md §5 R7) + the #73
//      STRUCTURAL dedup-collapse pre-check (2026-09-17): a path is a
//      sequence of FOLDER UNITS (distance per segment; the doubled folder
//      = one INSERTION); the substitution bar (a segment substitution
//      counts as seg-d 1 ONLY when intra-segment lev <= 1 — a char-far
//      sub is non-substitutable); the >=2-segment hook gate (1-segment
//      args BYPASS the segment matcher — the char channel owns them, the
//      S18/S20 pins); the kind=seg / kind=dedup evidence flags (the
//      9-verdict vocabulary is untouched) + the M1 exclusion extends to
//      the segment + dedup channels. The dedup pre-check (before the
//      corpus matchers): an adjacent identical FOLDER pair in the
//      ABSOLUTE path → collapse one copy; the collapsed path EXISTS →
//      kind=dedup d=0 (NO gap field); absent → fail-closed fall-through:
//      (210) HOOK read doubled-seg → MUTATED + kind=dedup scope=read d=0
//          (the #73 collapse fires first — the collapse target EXISTS);
//      (211) HOOK edit doubled-seg → MUTATED + kind=dedup
//          scope=write d=0;
//      (212) HOOK write doubled-seg → NOT mutated + ZERO lines (M1);
//      (213) PURE lev-1 folder mismatch → resolved d=1 (the substitution
//          bar);
//      (214) HOOK char-far folder mismatch → NOT mutated + fuzzy-rejected
//          (seg-rejected → the char fallback also rejects — NO kind=seg);
//      (215) PURE seg-d=2 (two insertions) → rejected d-too-high;
//      (216) PURE tie at seg-d=1 → rejected gap-too-small;
//      (217) PURE 2-seg filename typo → resolved d=1 (the segment
//          channel subsumes the char-close name typo);
//      (218) HOOK read doubled-NESTED (the realistic shape, the collapse
//          target EXISTS) → MUTATED + kind=dedup scope=read d=0;
//      (219) HOOK edit doubled-nested → MUTATED + kind=dedup
//          scope=write d=0;
//      (220) HOOK read doubled-nested, collapse target ABSENT → NOT
//          mutated + fuzzy-rejected (NO kind=dedup — the fail-closed
//          fall-through);
//      (221) HOOK write doubled-nested → NOT mutated + ZERO lines (M1
//          extends to the dedup pre-check).
//   S22 submit tool (9) — the #53 Part B pin (2026-09-18; approved
//      2026-09-17_agent-feedback-closedown.md part 2): ONE unified append
//      tool for the three agent-inbox channels — the registration shape
//      (3 shape checks: the tool() default export (description + the 3
//      channel args IN ORDER) / NO stale name+parameters keys (the host names
//      the tool by FILENAME) / execute an AsyncFunction), the arg schema
//      (the 3 channel args feedback/knowledge/todo ALL optional-
//      accept: undefined AND a string — the at-least-one-required rule
//      is a RUNTIME rule, not a schema one), the no-params error ({} AND
//      all-empty-string args → the exact error string + NO target
//      created — nothing written), one append behavior per param (the
//      entry = <header> <stamp> <role> <session> + the raw text + one
//      trailing blank line, appended to the HARDCODED target; the stamp
//      is minute-resolution, pinned by FORMAT + the before/after trick;
//      the return per param = <param> + target: <rel> + entry: <exact
//      text>; feedback → .opencode/agent/agent_feedback.md ### /
//      knowledge → .opencode/agent/knowledge/knowledge_inbox.md ## /
//      todo → the PROJECT-ROOT todo_inbox.md ## — the no-path-parameter
//      IS the sandbox: the deliberate deviation from the proposal
//      (the proposal's quoted ".opencode/ subtree" wording — the quote
//      marks are literal file content), ratified by the spec), and the
//      never-read preservation (all three targets pre-seeded with
//      sentinels; ONE feedback append → the sentinel BYTE-EXACT before
//      the appended entry; the unprovided targets byte-identical — the
//      tool appends, it NEVER reads or rewrites):
//      (230) registration shape (1 of 3): the tool() default export
//           (description + the 3 channel args in order + an execute function);
//      (231) registration shape (2 of 3): NO stale name/parameters keys;
//      (232) registration shape (3 of 3): execute is an AsyncFunction;
//      (233) arg schema: all 3 channel args optional-accept (undefined AND a string);
//      role/session absent from the schema (auto-filled from the tool context);
//      (234) no-params error: {} and all-empty-string → the exact error string +
//           NO target created (nothing written);
//      (235) feedback append: target created carrying ONLY the entry (### stamp),
//           return byte-exact, the other two targets absent;
//      (236) knowledge append: target created carrying ONLY the entry (## stamp),
//           return byte-exact, the other two targets absent;
//      (237) todo append: project-root target created carrying ONLY the entry
//           (## stamp), return byte-exact, the other two targets absent;
//      (238) never-read preservation: pre-seeded sentinel byte-exact before the
//           appended entry + the unprovided targets byte-identical.
//   S25 compact_memory unit A (7) — 2026-09-21 (priority.md #1): the 3-key
//      args + the config-resolved summarizer + the DUMP-OK line (the
//      S13 check 100 explicit-pair override pin is REMOVED):
//      (250) the new exports: resolveCompactionModel + stripJsoncComments;
//      (251) config present: agent.compaction.model → the config pair,
//          source 'config';
//      (252) comment + URL-safe parse: a // inside a string literal does
//          NOT start a comment (JSONC string-state-aware strip);
//      (253) the fallback battery (absent / no-key / non-string / no-'/' /
//          empty halves / unparseable → the fallback pair UNCHANGED);
//      (254) block comments + the FIRST-slash split ('prov/one/two');
//      (255) the DUMP-OK line on a successful dump (the DUMP-FAIL prefix
//          style, the numeric ms field);
//      (256) tool integration: the sandbox opencode.jsonc config model →
//          the summarize body carries the config pair (3-key args).
//   S26 R6 edit hint channel + payload journal (20) — 2026-09-25 (TODO #95
//      sub-item 1; design source: research/fuzzy-numword/decision-record.md
//      §8): the CONTENT locator primitive (core — anchor/candidate +
//      d<=2 gap>=2 over file lines, fail-closed), the payload journal
//      (journal_write.log / journal_edit.log — a separate file, never an
//      intercept line), the edit hint channel (edit-hint / edit-ambiguous /
//      no-candidate), the after-hook enrichment:
//      (257-258) the locator: single-line exact; multi-line exact (anchor =
//          first + last line);
//      (259-260) the locator fuzzy bar: d=1 (gap inf); d=2 (gap 4);
//      (261) the locator ambiguous (two candidates, gap 0 < 2);
//      (262-264) the locator fail-closed: no-anchor-line / d-too-high /
//          empty-arg;
//      (265) the all-dense query: present dense line → exact; absent →
//          rejected d-too-high;
//      (266) the file-size cap: within → found; beyond → rejected;
//      (267) journal write: one line (JSON payload round-trips) + zero
//          intercept lines;
//      (268) journal edit: one line ({filePath, old, new}) + the exact-1
//          hint is silent;
//      (269) journal block_transfer: one line in journal_edit.log (the tool
//          field disambiguates; the anchors payload);
//      (270) the journal paths are git-ignored (check-ignore, both files);
//      (271) ((2) re-pin) absent oldString, single candidate d=1 → now
//          MUTATES: fuzzy-edit line (byte-exact) + oldString mutated to the
//          file's exact bytes (no after-hook hint);
//      (272) hint multiple exact: two occurrences → edit-ambiguous
//          'hint lines=1,3' (UNCHANGED by (2));
//      (273) hint no candidate: anchor absent → no-candidate
//          'hint reason=no-anchor-line' (UNCHANGED by (2) — no candidate →
//          no best-d);
//      (274) hint fuzzy ambiguous: two candidates, same d → edit-ambiguous
//          'hint cands=1 1,2 1' (UNCHANGED by (2) — not exactly-one);
//      (275) after-hook enrichment ((2) re-pin): c271 now a mutation (no
//          hint stored) → re-point at the fail-closed c273 (no-candidate
//          hint, consumed once; mutation / hint-less / non-edit untouched);
//      (276) DoD machine check ((2) re-pin): the fail-closed c273's no-
//          candidate line + journal payload (the journal's edit `old` = the
//          ORIGINAL pre-mutation oldString); the write payload cp check
//          stays.
//   S27 (2) the MUTATING edit-fuzzy oldString (8) — 2026-09-25 (TODO #95
//      sub-item 2; design source: research/fuzzy-numword/decision-record.md
//      §8.2 + spec_sub2_edit_fuzzy_oldstring.md): the 0-raw-occurrence case
//      resolves WITHOUT agent action (normalize-then-compare; d = the MAX
//      Levenshtein over the scored line-pairs) — exactly-one candidate at
//      d=0/d≤1 → oldString MUTATED to the file's exact unique bytes (the
//      fuzzy-edit line; NO after-hook hint); else FAIL-CLOSED (the R6 hint
//      verdict carrying the best-candidate d — directive a — the after-
//      hook hint is stored); directive b: the feedback line is truncated
//      (first 40 chars + ...), the journal carries the FULL original
//      oldString:
//      (277) CRLF-drift: 0 raw → d=0 → MUTATE (line + exact-unique
//          substring);
//      (278) trailing-ws drift: 0 raw → d=0 → MUTATE;
//      (279) single typo: exactly one candidate d=1 → MUTATE;
//      (280) fail-closed near-miss: best d=3 → NOT mutated (the fail line
//          carries 'best-d=3' — directive a);
//      (281) ambiguous: two candidates d<=1 → NOT mutated (edit-ambiguous);
//      (282) directive (b): long oldString → the line is TRUNCATED (no full
//          oldString), the journal carries the FULL original;
//      (283) after-hook: mutate → no enrichment; fail → enrichment
//          consumed once;
//      (284) the fuzzy-edit line shape byte-exact (8 fields).
//   S28 R8 the out-of-sandbox path redirect (12) — 2026-09-25 (TODO #97
//      unit 1): an out-of-sandbox TYPED path span that maps EXACTLY ONCE to
//      an allowed root (after root dedupe) is REDIRECTED (mutated) before
//      the call runs; 0 or >=2 → fail-closed (no mutation). The pure 1:1
//      resolver (case (i) span == root → the root as configured; case (ii)
//      direct sibling → root + separator + basename; the root dedupe; the
//      degenerate inputs) is pinned PURE; the hook-level e2e pins run over
//      the FALLBACK roots [workspace root (ioSandboxProj), SCRATCHPAD_ROOT]
//      (the probe's sandbox proj has no opencode.jsonc — the config-read
//      path is smoke-pinned via a second factory instance with a crafted
//      config):
//      (285) case (i): span == root (case/separator variant) → the root as
//          configured (exactly one match);
//      (286) case (ii): a direct sibling → root + '/' + the span's basename
//          (case preserved);
//      (287) no mapping (0 matches) → null (fail-closed);
//      (288) a sibling of TWO distinct roots (same parent) → null
//          (fail-closed — never picks one);
//      (289) root dedupe: 3 forms of ONE root → ONE match (the first
//          configured form wins);
//      (290) a child of the root and a two-levels-down sibling → null (not
//          a 1:1 mapping);
//      (291) degenerate inputs (empty span / empty root list) → null
//          (never throws);
//      (292) hook e2e READ sibling of the workspace root → MUTATED + the
//          kind=redirect line (byte-exact, cap-flattened) + NO out-of-
//          sandbox line (the note recomputes on the effective args);
//      (293) hook e2e WRITE sibling → MUTATED + EXACTLY ONE new line
//          (M1: write has no fuzzy channel);
//      (294) hook e2e span == root (case variant) → the root as configured;
//      (295) hook e2e no mapping (an existing out-of-sandbox path) → NOT
//          mutated + the out-of-sandbox NOTE fires (as today);
//      (296) hook e2e nested non-sibling (under the root) → NOT mutated +
//          NO kind=redirect line + no out-of-sandbox.
//   S5 hygiene (6): every sandbox plugin.log line is JSON.parse-able; <=2000
//      chars with an ISO ts + a string kind; exact kind tallies (warn==2,
//      tool.before==6, tool.after==24, chatmsg==8, gauge==3, event==0,
//      nudge==14); the
//      real handover files byte-identical to pre-run and zero CO-APPENDED live
//      lines (the real plugin.log may only grow — a line carrying a probe
//      fingerprint id s*/c*/d*/t*/e1–e9/f1–f14/ses_fx_*/ses_other/ses_lad_*/
//      ses_ro_* = the probe wrote out of the sandbox); zero new/changed files
//      outside the sandbox (.opencode listing + git status, before vs after);
//      the ctx log path is git-ignored (git check-ignore -q, REPO_ROOT).
//
// EXPECTED OUTPUT:
//   S1=3 S2=4 S3=5 S4=8 S6=8 S6b=6 S7=11 S8=8 S9=12 S10=9 S11=13 S12=4 S13=21 S14=7 S15=12 S16=6 S17=26 S18=32 S19=13 S20=15 S21=12 S22=9 S25=7 S26=20 S27=8 S28=12 S29=8 hygiene=6  →  "PROBE handover: 305/305 PASS",
//   exit code 0. Anything else with THIS file = behavior drift or broken
//   environment — read the failures, do not "fix" the plugin for the probe.
//   On failure the sandbox root is KEPT (printed) for forensics.
// =============================================================================

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const PLUGIN_TS = path.join(REPO_ROOT, ".opencode", "plugin", "ctx_watchdog.ts");

// --------------------------------------------------------------- fixed payloads

const HOV_PROMPT = "Read .opencode/agent/handover/handover_task.md and execute it EXACTLY.";
const ORIGINAL_SPEC =
  "# PROBE DUMMY SPEC\n\nsentinel — NOT the real spec file (the real one lives at <repo root>/.opencode/agent/handover/handover_task.md).\n";
// P02 (v2.7): the mirror is DISABLED — the plugin must NEVER touch this file, so the
// sentinel must survive the whole probe byte-for-byte.
const STALE_SENTINEL = "STALE MIRROR SENTINEL — the plugin must NOT touch this file (mirror disabled, P02).\n";
// v2.5 S4 expected posted text (byte-exact, straight from the core's readout forms)
const CTX_OK = "ctx: SESSION=ses_fx_ok CTX=10000 (3%) REM=246000";
const CTX_UNKNOWN = "ctx: SESSION=ses_fx_unk CTX=50";
const CTX_UNAVAILABLE = "ctx: SESSION=ses_fx_empty CTX=notAvailable";
const cap120 = (s) => (s.length <= 120 ? s : s.slice(0, 119) + "\u2026");

// ------------------------------------------------------------------ real files

const REAL_OP = path.join(REPO_ROOT, ".opencode");
const REAL_FILES = ["agent/handover/handover_task.md", "agent/handover/handover_task_to_planner.md", "plugin.log"];
const readOrNull = (p) => (existsSync(p) ? readFileSync(p).toString("utf8") : null);
const snapshotReal = () => Object.fromEntries(REAL_FILES.map((f) => [f, readOrNull(path.join(REAL_OP, f))]));
const PRE_REAL = snapshotReal();

const listOpencode = () => {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name.startsWith("_exported")) continue;
        walk(path.join(d, e.name));
      } else {
        out.push(path.relative(REAL_OP, path.join(d, e.name)));
      }
    }
  };
  walk(REAL_OP);
  return out.sort();
};
const PRE_OP_LISTING = listOpencode();
const gitStatus = () => execFileSync("git", ["status", "--porcelain=v1"], { cwd: REPO_ROOT, encoding: "utf8" });
const PRE_GIT_STATUS = gitStatus();

// ------------------------------------------------------------------ the probe

const results = [];
const check = (id, section, label, cond, detail = "") => {
  const ok = Boolean(cond);
  results.push({ id, section, label, ok, detail: ok ? "" : String(detail).slice(0, 500) });
  console.log(`${ok ? "PASS" : "FAIL"} [${id}] ${label}${ok ? "" : ` — ${String(detail).slice(0, 300)}`}`);
};

// temp sandbox root — the plugin is initialized with directory=SANDBOX, so every
// fs write it performs lands here, never in the repo. The fixture DBs live here too.
const SANDBOX = mkdtempSync(path.join(os.tmpdir(), "fst_handover_probe_"));
const SB_SPEC = path.join(SANDBOX, ".opencode", "agent", "handover", "handover_task.md");
const SB_MIRROR = path.join(SANDBOX, ".opencode", "agent", "handover", "handover_task_to_planner.md");
const SB_LOG = path.join(SANDBOX, ".opencode", "plugin.log");
mkdirSync(path.join(SANDBOX, ".opencode", "agent", "handover"), { recursive: true });
writeFileSync(path.join(SANDBOX, "sandbox_root_marker.txt"), "sandbox\n");
writeFileSync(SB_SPEC, ORIGINAL_SPEC);
writeFileSync(SB_MIRROR, STALE_SENTINEL);
writeFileSync(SB_LOG, "");

const logLines = () => readFileSync(SB_LOG, "utf8").split("\n").filter((l) => l.length > 0);
const linesOfKind = (k) => logLines().filter((l) => {
  try {
    return JSON.parse(l).kind === k;
  } catch {
    return false;
  }
});
const readMirror = () => readFileSync(SB_MIRROR, "utf8");

// ------------------------------------------------------- fixture DBs (node:sqlite)
//
// opencode-like schema per the T1 spec fact 2: `session`(id TEXT, time_updated
// INTEGER ms, model TEXT = JSON {"id":...}) + `message`(session_id TEXT,
// time_created INTEGER ms, data TEXT = JSON). NO python, NO sqlite3.exe, NO
// live DB. The gauge's finish marker is the `"finish"` field inside data JSON
// (the in-flight step carries none; user rows carry no tokens at all).
const FIN_OK = JSON.stringify({
  role: "assistant",
  finish: "stop",
  tokens: { total: 12345, input: 10001, output: 2345, reasoning: 0, cache: { write: 0, read: 0 } },
});
const FIN_UNKNOWN = JSON.stringify({
  role: "assistant",
  finish: "stop",
  tokens: { total: 50, input: 50, output: 0, reasoning: 0, cache: { write: 0, read: 0 } },
});
const INFLIGHT = JSON.stringify({ role: "assistant", tokens: { total: 0, input: 0, output: 0 } });
const USER_ROW = JSON.stringify({ role: "user", parts: [] });

function buildFixtureDb(p, sessions) {
  const db = new DatabaseSync(p);
  db.exec("CREATE TABLE session (id TEXT PRIMARY KEY, time_updated INTEGER, model TEXT); CREATE TABLE message (session_id TEXT, time_created INTEGER, data TEXT);");
  const insS = db.prepare("INSERT INTO session (id, time_updated, model) VALUES (?, ?, ?)");
  const insM = db.prepare("INSERT INTO message (session_id, time_created, data) VALUES (?, ?, ?)");
  for (const s of sessions) {
    insS.run(s.id, s.time_updated, s.model);
    for (const m of s.messages ?? []) insM.run(s.id, m.time_created, m.data);
  }
  db.close();
}
const FX_OK = path.join(SANDBOX, "fx_ok.db");
buildFixtureDb(FX_OK, [
  { id: "ses_fx_ok", time_updated: 3000, model: JSON.stringify({ id: "probe-model-256K_MTP", providerID: "fx" }),
    messages: [ { time_created: 200, data: FIN_OK }, { time_created: 100, data: USER_ROW } ] },
  { id: "ses_fx_old", time_updated: 1000, model: JSON.stringify({ id: "probe-model-120K_MTP", providerID: "fx" }),
    messages: [ { time_created: 50, data: FIN_OK } ] },
]);
const FX_UNKNOWN = path.join(SANDBOX, "fx_unknown.db");
buildFixtureDb(FX_UNKNOWN, [
  { id: "ses_fx_unk", time_updated: 3000, model: JSON.stringify({ id: "CPU-Qwen3-0.6B", providerID: "fx" }),
    messages: [ { time_created: 10, data: FIN_UNKNOWN } ] },
]);
const FX_NOTAL = path.join(SANDBOX, "fx_notal.db");
buildFixtureDb(FX_NOTAL, [
  { id: "ses_fx_empty", time_updated: 3000, model: JSON.stringify({ id: "probe-model-120K_MTP", providerID: "fx" }),
    messages: [ { time_created: 20, data: INFLIGHT } ] },
]);
const MISSING_DB = path.join(SANDBOX, "missing_fx.db"); // never created — the db-error shape

// the core — SAME module instance the plugin imports (same resolved file), so
// setDbPath below steers the plugin's chat.message read to the fixtures.
const { readGauge, formatGauge, parseWindow, parseModelId, setDbPath, getDbPath, setBackends, getBackends, DEFAULT_BACKENDS, setImportForTest, clearImportForTest, importAttemptsForTest, setBudgetFileForTest, getBudgetFile, compactionsLeftSuffix } =
  await import(new URL("../scripts/gauge.mjs", import.meta.url).href);

// Item 3 (2026-09-24): the "N compactions left" suffix reads the budget
// store PER formatGauge call — steered to a NEVER-CREATED sandbox path so
// every pre-existing formatGauge / ctx-line pin stays byte-identical
// (fail-open → no suffix); the S6b section points it at fixture budget
// files for its own pins.
setBudgetFileForTest(path.join(SANDBOX, "missing_budget.json"));

// the plugin, loaded from the REAL repo path (Node 24 strips the TS types)
const plugin = (await import(pathToFileURL(PLUGIN_TS).href)).default;
const hooks = await plugin({ directory: SANDBOX });
const HOV_ARGS = { prompt: HOV_PROMPT };
const beforeFeed = (sess, call, tool, inArgs, outArgs) =>
  hooks["tool.execute.before"]({ tool, sessionID: sess, callID: call, args: inArgs }, { args: outArgs });
const afterFeed = (sess, call, inArgs, out) =>
  hooks["tool.execute.after"]({ tool: "task", sessionID: sess, callID: call, args: inArgs }, out);
const chatFeed = (input, output) => hooks["chat.message"](input, output);

// ------------------------------------------------------------------ S1 pre-flight (3)

// 01 — spec present + handover delegation → no warn, one tool.before (c1)
await beforeFeed("s1", "c1", "task", HOV_ARGS, HOV_ARGS);
check(
  "01",
  "S1",
  "spec present: handover before → zero warn lines, tool.before logged (c1)",
  linesOfKind("warn").length === 0 && linesOfKind("tool.before").some((l) => l.includes('"call":"c1"')),
  `warn=${linesOfKind("warn").length} tool.before=${linesOfKind("tool.before").length}`,
);

// 02 — spec renamed away → exactly ONE warn line, byte-exact fields + byte-exact restore
{
  const SPEC_BAK = SB_SPEC + ".bak";
  renameSync(SB_SPEC, SPEC_BAK);
  await beforeFeed("s1", "c2", "task", HOV_ARGS, HOV_ARGS);
  renameSync(SPEC_BAK, SB_SPEC);
  const warns = linesOfKind("warn");
  const w2 = warns.length === 1 ? (() => { try { return JSON.parse(warns[0]); } catch { return {}; } })() : {};
  check(
    "02",
    "S1",
    "spec renamed away: exactly one byte-exact warn + spec restored byte-exact",
    warns.length === 1 && w2.kind === "warn" && w2.reason === "handover-task-file-missing-or-empty" && w2.call === "c2" && w2.session === "s1" && readFileSync(SB_SPEC, "utf8") === ORIGINAL_SPEC,
    warns.join(" | ") + ` restore=${readFileSync(SB_SPEC, "utf8") === ORIGINAL_SPEC}`,
  );
}

// 03 — emptied spec → exactly one NEW warn line (total 2, call c3) + byte-exact restore
{
  writeFileSync(SB_SPEC, "");
  await beforeFeed("s1", "c3", "task", HOV_ARGS, HOV_ARGS);
  const warns3 = linesOfKind("warn");
  const w3 = (() => { try { return JSON.parse(warns3[1] ?? ""); } catch { return {}; } })();
  writeFileSync(SB_SPEC, ORIGINAL_SPEC);
  check(
    "03",
    "S1",
    "empty spec: exactly one new warn line (total 2, call c3) + spec restored byte-exact",
    warns3.length === 2 && w3.call === "c3" && w3.session === "s1" && readFileSync(SB_SPEC, "utf8") === ORIGINAL_SPEC,
    warns3.join(" | "),
  );
}

// ------------------------------------------------------------------ S2 non-handover invisible (4)

// 04 — task, non-handover prompt (gate: no spec path in the prompt)
{
  const P2 = { prompt: "explore the code (no handover spec in prompt)" };
  await beforeFeed("s2", "c4", "task", P2, P2);
  check("04", "S2", "task w/o spec in prompt: no new warn, mirror untouched", linesOfKind("warn").length === 2 && readMirror() === STALE_SENTINEL, `warn=${linesOfKind("warn").length}`);
}

// 05 — non-task tool carrying the handover-ish prompt (tool gate comes first)
{
  const P3 = { command: "echo hi", prompt: HOV_PROMPT };
  await beforeFeed("s2", "c5", "bash", P3, P3);
  check("05", "S2", "non-task tool (bash) w/ spec-ish prompt: invisible (no warn, mirror untouched)", linesOfKind("warn").length === 2 && readMirror() === STALE_SENTINEL, `warn=${linesOfKind("warn").length}`);
}

// 06 — task with NO args at all (the hook must not throw)
{
  let threw = false;
  try {
    await hooks["tool.execute.before"]({ tool: "task", sessionID: "s2", callID: "c6" }, {});
  } catch {
    threw = true;
  }
  check("06", "S2", "task w/ missing args: resolves (no throw), invisible", !threw && linesOfKind("warn").length === 2 && readMirror() === STALE_SENTINEL, `threw=${threw} warn=${linesOfKind("warn").length}`);
}

// 07 — cumulative tally after S1–S2
check("07", "S2", "cumulative after S1–S2: warn==2, tool.before==6", linesOfKind("warn").length === 2 && linesOfKind("tool.before").length === 6, `warn=${linesOfKind("warn").length} tool.before=${linesOfKind("tool.before").length}`);

// ------------------------------------------------------------------ S3 mirror DISABLED (P02, v2.7) (5)

// 08 — non-empty handover output: the mirror file is UNTOUCHED (the after-hook mirror
//      write is removed — the sentinel must survive byte-for-byte)
await afterFeed("s3", "d1", HOV_ARGS, { title: "worker final", output: "VERBATIM worker summary line one\nline two\n", metadata: {} });
check("08", "S3", "handover after (non-empty output): mirror UNTOUCHED (byte-identical to the pre-filled sentinel — mirror disabled)", readMirror() === STALE_SENTINEL, readMirror());

// 09 — truncated:true: STILL untouched (no trailer is written anywhere)
await afterFeed("s3", "d2", HOV_ARGS, { title: "worker final", output: "TRUNCATED BODY\n", metadata: { truncated: true } });
check("09", "S3", "handover after (truncated:true): mirror still untouched (no trailer written)", readMirror() === STALE_SENTINEL, readMirror());

// 10 — empty output → untouched
await afterFeed("s3", "d3", HOV_ARGS, { title: "worker final", output: "", metadata: {} });
check("10", "S3", "handover after (empty output): mirror untouched", readMirror() === STALE_SENTINEL, readMirror());

// 11 — exactly three tool.after log lines in this phase (logging is unchanged by P02)
check("11", "S3", "mirror phase logged exactly 3 tool.after lines (d1..d3)", linesOfKind("tool.after").length === 3, `tool.after=${linesOfKind("tool.after").length}`);

// 12 — final mirror state byte-exact: the file the plugin was initialized with is still
//      there, byte-for-byte — the plugin never wrote it
check("12", "S3", "final mirror state byte-identical to the pre-filled sentinel", readMirror() === STALE_SENTINEL, readMirror());

// ------------------------------------------------------------------ S4 chat.message shapes (8) — v2.5 native gauge

// 13 — ok-match: the posted part is BYTE-EXACT, prior part kept, chatmsg evidence
//      carries sess, ZERO gauge lines
{
  setDbPath(FX_OK);
  const parts = [{ id: "prt-orig-1", sessionID: "ses_fx_ok", messageID: "msg_t1", type: "text", text: "orig" }];
  let threw = false;
  try {
    await chatFeed({ sessionID: "ses_fx_ok", agent: "worker_q4_120k", model: { id: "probe-model-256K_MTP" } }, { message: { id: "msg_t1" }, parts });
  } catch {
    threw = true;
  }
  const p1 = parts[1];
  const evs = linesOfKind("chatmsg");
  const ev1 = (() => { try { return JSON.parse(evs[0] ?? ""); } catch { return {}; } })();
  check(
    "13",
    "S4",
    "ok-match: posted part byte-exact `ctx: SESSION=ses_fx_ok CTX=10000 (3%) REM=246000` (prt-ctx-, msg echo, prior kept), sess evidence, zero gauge lines",
    !threw && parts.length === 2 && p1 && typeof p1.id === "string" && p1.id.startsWith("prt-ctx-") && p1.sessionID === "ses_fx_ok" && p1.messageID === "msg_t1" && p1.type === "text" && p1.text === CTX_OK && parts[0].text === "orig" && evs.length === 1 && ev1.sess === "ses_fx_ok" && ev1.session === "ses_fx_ok" && ev1.agent === "worker_q4_120k" && ev1.message === "msg_t1" && linesOfKind("gauge").length === 0,
    JSON.stringify({ threw, parts, ev1, gauge: linesOfKind("gauge") }),
  );
}

// 14 — unknown-window match: `CTX=<ctx>` only (no guessed pct/REM) — posted
{
  setDbPath(FX_UNKNOWN);
  const parts = [];
  await chatFeed({ sessionID: "ses_fx_unk" }, { message: { id: "msg_t2" }, parts });
  check(
    "14",
    "S4",
    "unknown-window match: posted byte-exact `ctx: SESSION=ses_fx_unk CTX=50`, zero gauge lines",
    parts.length === 1 && parts[0].text === CTX_UNKNOWN && parts[0].messageID === "msg_t2" && linesOfKind("gauge").length === 0,
    JSON.stringify({ parts, gauge: linesOfKind("gauge") }),
  );
}

// 15 — notAvailable match: the honest no-total form posts too
{
  setDbPath(FX_NOTAL);
  const parts = [];
  await chatFeed({ sessionID: "ses_fx_empty" }, { message: { id: "msg_t3" }, parts });
  check(
    "15",
    "S4",
    "notAvailable match: posted byte-exact `ctx: SESSION=ses_fx_empty CTX=notAvailable`, zero gauge lines",
    parts.length === 1 && parts[0].text === CTX_UNAVAILABLE && parts[0].messageID === "msg_t3" && linesOfKind("gauge").length === 0,
    JSON.stringify({ parts, gauge: linesOfKind("gauge") }),
  );
}

// 16 — mismatch-silent: sid ses_fx_ok vs sessionID ses_other → NO post, NO gauge
//      line (the per-fire chatmsg evidence is still logged — with the sess field)
{
  setDbPath(FX_OK);
  const parts = [];
  let threw = false;
  try {
    await chatFeed({ sessionID: "ses_other" }, { message: { id: "msg_t4" }, parts });
  } catch {
    threw = true;
  }
  const evs = linesOfKind("chatmsg");
  const ev4 = (() => { try { return JSON.parse(evs[3] ?? ""); } catch { return {}; } })();
  check(
    "16",
    "S4",
    "mismatch (ses_fx_ok vs ses_other): NO post, NO gauge line; chatmsg evidence logged with sess=ses_fx_ok",
    !threw && parts.length === 0 && linesOfKind("gauge").length === 0 && evs.length === 4 && ev4.session === "ses_other" && ev4.sess === "ses_fx_ok",
    JSON.stringify({ threw, parts, ev4, gauge: linesOfKind("gauge") }),
  );
}

// 17 — db-error: the read failed (missing fixture db) → no throw, no post + ONE gauge
//      line {reason:db-error, session, preview = the core's own error text capped 120}
{
  const badRes = await readGauge(MISSING_DB);
  const badPreview = badRes.error ? cap120(String(badRes.error).trim()) : undefined;
  setDbPath(MISSING_DB);
  const parts = [];
  let threw = false;
  try {
    await chatFeed({ sessionID: "ses_fx_ok" }, { message: { id: "msg_t5" }, parts });
  } catch {
    threw = true;
  }
  const g = (() => { const gs = linesOfKind("gauge"); return gs.length === 1 ? JSON.parse(gs[0]) : {}; })();
  check(
    "17",
    "S4",
    "db-error (missing db): no throw, no post + gauge line {reason:db-error, session:ses_fx_ok, preview=core error capped 120} byte-exact",
    !threw && parts.length === 0 && g.kind === "gauge" && g.reason === "db-error" && g.session === "ses_fx_ok" && g.preview === badPreview,
    JSON.stringify({ threw, parts, g, expectedPreview: badPreview, coreResult: badRes }),
  );
}

// 18 — parts-not-array: match + parts not an array → no throw + ONE gauge line
{
  setDbPath(FX_OK);
  let threw = false;
  try {
    await chatFeed({ sessionID: "ses_fx_ok" }, { message: { id: "msg_t6" }, parts: "not-an-array" });
  } catch {
    threw = true;
  }
  const gs = linesOfKind("gauge");
  const g = (() => { try { return JSON.parse(gs[1] ?? ""); } catch { return {}; } })();
  check(
    "18",
    "S4",
    "parts-not-array: no throw, no post + gauge line {reason:parts-not-array, session:ses_fx_ok} byte-exact",
    !threw && g.kind === "gauge" && g.reason === "parts-not-array" && g.session === "ses_fx_ok" && !("preview" in g) && gs.length === 2,
    JSON.stringify({ threw, gs }),
  );
}

// 19 — invalid-messageID: match + a non-msg message id → no throw + ONE gauge line
{
  setDbPath(FX_OK);
  let threw = false;
  try {
    await chatFeed({ sessionID: "ses_fx_ok" }, { message: { id: "badid" }, parts: [] });
  } catch {
    threw = true;
  }
  const gs = linesOfKind("gauge");
  const g = (() => { try { return JSON.parse(gs[2] ?? ""); } catch { return {}; } })();
  check(
    "19",
    "S4",
    "invalid-messageID: no throw, no post + gauge line {reason:invalid-messageID, session:ses_fx_ok, message:badid} byte-exact",
    !threw && g.kind === "gauge" && g.reason === "invalid-messageID" && g.session === "ses_fx_ok" && g.message === "badid" && gs.length === 3,
    JSON.stringify({ threw, gs }),
  );
}

// 20 — no-throw guarantee: the hook called with empty input/output → resolves
{
  setDbPath(FX_OK);
  let threw = false;
  try {
    await chatFeed({}, {});
  } catch {
    threw = true;
  }
  check("20", "S4", "hook with empty {} / {}: resolves (no throw)", !threw, `threw=${threw}`);
}

// ------------------------------------------------------------------ S6 gauge core shapes (8)

// 21 — known-window: byte-exact readout + the structured fields
{
  const r = await readGauge(FX_OK);
  check(
    "21",
    "S6",
    "known-window: formatGauge byte-exact + kind ok + sid/modelId/total/output/ctx/window fields",
    formatGauge(r) === "SESSION=ses_fx_ok CTX=10000 (3%) REM=246000" && r.ok === true && r.kind === "ok" && r.sid === "ses_fx_ok" && r.modelId === "probe-model-256K_MTP" && r.total === 12345 && r.output === 2345 && r.ctx === 10000 && r.window === 256000,
    JSON.stringify(r),
  );
}

// 22 — unknown-window: `CTX=<ctx>` only (no guessed pct/REM), window undefined
{
  const r = await readGauge(FX_UNKNOWN);
  check(
    "22",
    "S6",
    "unknown-window (no K/M marker in model id): formatGauge byte-exact, ok, window undefined",
    formatGauge(r) === "SESSION=ses_fx_unk CTX=50" && r.ok === true && r.kind === "ok" && r.ctx === 50 && r.window === undefined,
    JSON.stringify(r),
  );
}

// 23 — notAvailable: no finished step in the newest session → no-total
{
  const r = await readGauge(FX_NOTAL);
  check(
    "23",
    "S6",
    "notAvailable (no finished step): formatGauge byte-exact, kind no-total, sid carried, modelId empty (no step row)",
    formatGauge(r) === "SESSION=ses_fx_empty CTX=notAvailable" && r.ok === false && r.kind === "no-total" && r.sid === "ses_fx_empty" && r.modelId === "",
    JSON.stringify(r),
  );
}

// 24 — missing db: db-error (no throw), formatGauge = SESSION=unknown CTX=notAvailable
{
  const r = await readGauge(MISSING_DB);
  check(
    "24",
    "S6",
    "missing db: kind db-error, no throw, sid unknown, non-empty error, formatGauge byte-exact",
    r.ok === false && r.kind === "db-error" && r.sid === "unknown" && r.modelId === "" && typeof r.error === "string" && r.error !== "" && formatGauge(r) === "SESSION=unknown CTX=notAvailable",
    JSON.stringify(r),
  );
}

// 25 — SESSION= prefix: every readout form is prefixed with the read session id
{
  const lines = [formatGauge(await readGauge(FX_OK)), formatGauge(await readGauge(FX_UNKNOWN)), formatGauge(await readGauge(FX_NOTAL)), formatGauge(await readGauge(MISSING_DB))];
  check(
    "25",
    "S6",
    "SESSION= prefix on every readout form (known / unknown / notAvailable / db-error)",
    lines.every((l) => l.startsWith("SESSION=")),
    lines.join(" | "),
  );
}

// 26 — parseWindow cases: the ONLY parser (last marker wins, no fallback)
check(
  "26",
  "S6",
  "parseWindow: 256K → 256000, 210K → 210000, 1.5M → 1500000, 120K_MTP → 120000, no-match → undefined, non-string → undefined",
  parseWindow("probe-model-256K") === 256000 && parseWindow("x-210K") === 210000 && parseWindow("x-1.5M") === 1500000 && parseWindow("probe-model-120K_MTP") === 120000 && parseWindow("CPU-Qwen3-0.6B") === undefined && parseWindow(undefined) === undefined && parseWindow("IQ4KT") === undefined,
  JSON.stringify({ a: parseWindow("probe-model-256K"), b: parseWindow("x-210K"), c: parseWindow("x-1.5M"), d: parseWindow("probe-model-120K_MTP"), e: parseWindow("CPU-Qwen3-0.6B"), f: parseWindow(undefined), g: parseWindow("IQ4KT") }),
);

// 27 — parseModelId: session.model column JSON {"id":...} / plain id / malformed / empty
check(
  "27",
  "S6",
  "parseModelId: JSON id, plain id, malformed JSON → '', empty → ''",
  parseModelId('{"id":"a-120K"}') === "a-120K" && parseModelId("plain-id") === "plain-id" && parseModelId("{bad json") === "" && parseModelId("") === "" && parseModelId(undefined) === "",
  JSON.stringify({ a: parseModelId('{"id":"a-120K"}'), b: parseModelId("plain-id"), c: parseModelId("{bad json"), d: parseModelId(""), e: parseModelId(undefined) }),
);

// 28 — setDbPath/getDbPath global plumbing + explicit-path override wins
{
  setDbPath(FX_UNKNOWN);
  const viaGlobal = await readGauge();
  const viaOverride = await readGauge(FX_OK);
  const pass = getDbPath() === FX_UNKNOWN && viaGlobal.sid === "ses_fx_unk" && viaOverride.sid === "ses_fx_ok";
  setDbPath(FX_OK);
  check(
    "28",
    "S6",
    "setDbPath/getDbPath steer the global read; readGauge(path) override wins",
    pass,
    JSON.stringify({ getDbPath: getDbPath(), viaGlobal: viaGlobal.sid, viaOverride: viaOverride.sid }),
  );
}

// ------------------------------------------------------------------ S6b item 3 (2026-09-24): the "N compactions
// left" budget suffix on the readout line (6) — the formatGauge extension:
// remaining = max(0, cap - count) PLUS 1 iff the once-per-session emergency
// compaction is still available (count === cap && the effective
// emergency_budget >= 1 — the key read LENIENTLY: absent → the fail-open
// default 1, matching compact_memory's gate). The cap is resolved EXACTLY
// like compact_memory's resolveCap (CPU invariant 0, then the model_budget
// map's exact bare-model-id key, else default, else 1). The budget store is
// steered at fixture files via setBudgetFileForTest (the setDbPath pattern);
// the FX_OK fixture read carries sid ses_fx_ok + model probe-model-256K_MTP.

const BUDGET_FX = path.join(SANDBOX, "budget_fx.json");
const MB_FX = { "probe-model-256K_MTP": 3, default: 1 };
const setBudgetFx = (count, eb, sid = "ses_fx_ok") => {
  const rec = { model_budget: MB_FX, sessions: { [sid]: { count, updated: "fx", model: "probe-model-256K_MTP" } } };
  if (eb !== undefined) rec.emergency_budget = eb;
  writeFileSync(BUDGET_FX, JSON.stringify(rec), "utf-8");
  setBudgetFileForTest(BUDGET_FX);
};
const FX_OK_LINE = "SESSION=ses_fx_ok CTX=10000 (3%) REM=246000";

// 28.1 — state 1: count 0 < cap 3 → 3 remaining (plural form)
{
  setBudgetFx(0);
  const r = await readGauge(FX_OK);
  check(
    "28.1",
    "S6b",
    "state 1 (count 0 < cap 3): the known-window line ends ` | 3 compactions left`",
    formatGauge(r) === `${FX_OK_LINE} | 3 compactions left`,
    JSON.stringify(formatGauge(r)),
  );
}

// 28.2 — state 2: count === cap, the emergency_budget key ABSENT → the
//      fail-open default 1 IS available → 1 remaining (singular form; the
//      spec pin: NOT 0)
{
  setBudgetFx(3);
  const r = await readGauge(FX_OK);
  check(
    "28.2",
    "S6b",
    "state 2 (count === cap, key absent → default 1): the line ends ` | 1 compaction left` (singular)",
    formatGauge(r) === `${FX_OK_LINE} | 1 compaction left`,
    JSON.stringify(formatGauge(r)),
  );
}

// 28.3 — state 3: count 4 > cap 3 → fully exhausted → 0 remaining
{
  setBudgetFx(4);
  const r = await readGauge(FX_OK);
  check(
    "28.3",
    "S6b",
    "state 3 (count > cap — fully exhausted): the line ends ` | 0 compactions left`",
    formatGauge(r) === `${FX_OK_LINE} | 0 compactions left`,
    JSON.stringify(formatGauge(r)),
  );
}

// 28.4 — state 2b: count === cap + emergency_budget 0 EXPLICIT → the
//      emergency is unavailable → 0 remaining (the lenient read distinguishes
//      0 from absent)
{
  setBudgetFx(3, 0);
  const r = await readGauge(FX_OK);
  check(
    "28.4",
    "S6b",
    "state 2b (count === cap, emergency_budget 0 explicit): the line ends ` | 0 compactions left`",
    formatGauge(r) === `${FX_OK_LINE} | 0 compactions left`,
    JSON.stringify(formatGauge(r)),
  );
}

// 28.5 — fail-open: the budget file MISSING (the never-created sandbox path
//      the probe default) → NO suffix — the line is byte-identical to the
//      pre-item-3 form
{
  setBudgetFileForTest(path.join(SANDBOX, "missing_budget.json"));
  const r = await readGauge(FX_OK);
  check(
    "28.5",
    "S6b",
    "fail-open (budget file missing): NO suffix — the known-window line is byte-identical to the pre-item-3 form",
    formatGauge(r) === FX_OK_LINE,
    JSON.stringify(formatGauge(r)),
  );
}

// 28.6 — no-total read (no finished step → modelId ""): the cap falls back
//      to the session entry's `model` (the model at the last increment) —
//      the suffix still resolves (count 0 < cap 3 → 3)
{
  setBudgetFx(0, undefined, "ses_fx_empty");
  const r = await readGauge(FX_NOTAL);
  check(
    "28.6",
    "S6b",
    "no-total read (modelId '' → entry-model fallback): `SESSION=ses_fx_empty CTX=notAvailable | 3 compactions left`",
    formatGauge(r) === "SESSION=ses_fx_empty CTX=notAvailable | 3 compactions left",
    JSON.stringify(formatGauge(r)),
  );
}

// restore the probe-default budget steering for every later section
setBudgetFileForTest(path.join(SANDBOX, "missing_budget.json"));

// ------------------------------------------------------------------ S7 backend chain (11) — the #37 chain IS contract
//
// The chain: node:sqlite → bun:sqlite → spawn-sqlite3, first success wins,
// per-process cached. The probe host is NODE, so bun:sqlite is exercised by
// FORCING it (module absent → the named db-error path; adapter shape → a
// unit-mock module) and spawn-sqlite3 END-TO-END with the REAL maintainer-
// placed sqlite3.exe (read-only URIs on the sandbox fixtures). setBackends
// clears/restores the restriction between sections; the core's cache is
// keyed by db path and invalidated by setDbPath/setBackends.

// The unit-mock of the bun:sqlite API surface (the REAL API was verified
// separately against the system bun 1.4.2 — host proof 2): it records every
// call so check 32 can assert the adapter's exact shape.
class MockBunDatabase {
  constructor(p2, opts) {
    MOCK_LOG.push({ op: "construct", path: p2, opts: opts ? { ...opts } : undefined });
  }
  exec(sql) {
    MOCK_LOG.push({ op: "exec", sql });
  }
  prepare(sql) {
    MOCK_LOG.push({ op: "prepare", sql });
    return {
      get() {
        if (String(sql).includes("tokens.total")) return { sid: "ses_fx_ok", model: JSON.stringify({ id: "probe-model-256K_MTP" }), total: 12345, output: 2345 };
        return { id: "ses_fx_ok" };
      },
    };
  }
  close() {
    MOCK_LOG.push({ op: "close" });
  }
}
const MOCK_LOG = [];

// 29 — backend 1 forced: the readout forms are chain-invariant (byte-identical)
{
  setBackends(["node:sqlite"]);
  const r = await readGauge(FX_OK);
  check(
    "29",
    "S7",
    "chain/node:sqlite (forced): FX_OK byte-identical readout + fields (chain-invariant form)",
    formatGauge(r) === "SESSION=ses_fx_ok CTX=10000 (3%) REM=246000" && r.ok === true && r.kind === "ok" && r.sid === "ses_fx_ok" && r.modelId === "probe-model-256K_MTP" && r.total === 12345 && r.output === 2345 && r.ctx === 10000 && r.window === 256000,
    JSON.stringify(r),
  );
}

// 30 — backend 2 forced, module ABSENT on the node host → db-error NAMING the
//      backend (the production-diagnosability contract), no throw
{
  setBackends(["bun:sqlite"]);
  let threw = false;
  let r;
  try {
    r = await readGauge(FX_OK);
  } catch {
    threw = true;
  }
  check(
    "30",
    "S7",
    "chain/bun:sqlite (forced, module absent on the node host): db-error naming the backend, no throw, notAvailable form",
    !threw && r.ok === false && r.kind === "db-error" && r.sid === "unknown" && typeof r.error === "string" && r.error.startsWith("bun:sqlite ") && formatGauge(r) === "SESSION=unknown CTX=notAvailable",
    JSON.stringify(r),
  );
}

// 31 — per-process cache: a failed import is memoized, NOT re-tried on
//      subsequent fires (the plugin host fires repeatedly)
{
  const a0 = importAttemptsForTest("bun:sqlite");
  await readGauge(FX_OK);
  await readGauge(FX_OK);
  const a1 = importAttemptsForTest("bun:sqlite");
  check("31", "S7", "per-process cache: failed bun:sqlite import NOT re-tried on subsequent fires (attempts unchanged)", a1 === a0, `attempts ${a0} -> ${a1}`);
}

// 32 — backend 2's ADAPTER shape via a unit-mock module (the real bun:sqlite
//      API was verified separately against the system bun 1.4.2 — host proof
//      2): the adapter must drive Database(path, {readonly:true,timeout:2500})
//      + the busy_timeout PRAGMA + prepare().get() ×2 (ordered) + close, and
//      the readout must be byte-identical to backend 1's form.
{
  MOCK_LOG.length = 0;
  setImportForTest("bun:sqlite", { Database: MockBunDatabase });
  const r = await readGauge(FX_OK);
  const construct = MOCK_LOG.find((l) => l.op === "construct");
  const execs = MOCK_LOG.filter((l) => l.op === "exec");
  const prepares = MOCK_LOG.filter((l) => l.op === "prepare");
  const closes = MOCK_LOG.filter((l) => l.op === "close");
  check(
    "32",
    "S7",
    "unit-mock bun:sqlite: adapter drives Database(path,{readonly:true,timeout:2500}) + PRAGMA exec + prepare().get() x2 (ordered) + close; readout byte-identical",
    formatGauge(r) === "SESSION=ses_fx_ok CTX=10000 (3%) REM=246000" && r.ok === true && r.ctx === 10000 && r.window === 256000 &&
      construct !== undefined && construct.path === FX_OK && construct.opts !== undefined && construct.opts.readonly === true && construct.opts.timeout === 2500 &&
      execs.length === 1 && execs[0].sql === "PRAGMA busy_timeout = 2500;" &&
      prepares.length === 2 && !String(prepares[0].sql).includes("tokens.total") && String(prepares[1].sql).includes("tokens.total") &&
      closes.length === 1,
    JSON.stringify({ r, MOCK_LOG }),
  );
}

// 33 — unit-mock bun:sqlite, no finished step: bun's no-row value is NULL
//      (node:sqlite's is undefined — both must read as "no row" → no-total)
{
  class MockBunNoStep extends MockBunDatabase {
    prepare(sql) {
      const s = super.prepare(sql);
      return { get() { if (String(sql).includes("tokens.total")) return null; return { id: "ses_fx_empty" }; } };
    }
  }
  setImportForTest("bun:sqlite", { Database: MockBunNoStep });
  const r = await readGauge(FX_OK);
  check(
    "33",
    "S7",
    "unit-mock bun:sqlite no finished step (get() → null): no-total form byte-identical",
    r.ok === false && r.kind === "no-total" && r.sid === "ses_fx_empty" && r.modelId === "" && formatGauge(r) === "SESSION=ses_fx_empty CTX=notAvailable",
    JSON.stringify(r),
  );
}

// 34-36 — backend 3 forced, END-TO-END with the REAL sqlite3.exe (read-only
//      URIs on the sandbox fixtures): ok / unknown-window / no-total
{
  clearImportForTest("bun:sqlite");
  setBackends(["spawn-sqlite3"]);
  const r = await readGauge(FX_OK);
  check(
    "34",
    "S7",
    "chain/spawn-sqlite3 (forced, REAL exe end-to-end on the fixture): byte-identical readout + fields",
    formatGauge(r) === "SESSION=ses_fx_ok CTX=10000 (3%) REM=246000" && r.ok === true && r.kind === "ok" && r.sid === "ses_fx_ok" && r.modelId === "probe-model-256K_MTP" && r.total === 12345 && r.output === 2345 && r.ctx === 10000 && r.window === 256000,
    JSON.stringify(r),
  );
}
{
  const r = await readGauge(FX_UNKNOWN);
  check(
    "35",
    "S7",
    "spawn-sqlite3: FX_UNKNOWN byte-identical `SESSION=ses_fx_unk CTX=50` (unknown window via the real exe)",
    formatGauge(r) === "SESSION=ses_fx_unk CTX=50" && r.ok === true && r.ctx === 50 && r.window === undefined,
    JSON.stringify(r),
  );
}
{
  const r = await readGauge(FX_NOTAL);
  check(
    "36",
    "S7",
    "spawn-sqlite3: FX_NOTAL no-total byte-identical (M row absent via the real exe)",
    r.ok === false && r.kind === "no-total" && r.sid === "ses_fx_empty" && formatGauge(r) === "SESSION=ses_fx_empty CTX=notAvailable",
    JSON.stringify(r),
  );
}

// 37 — full chain, missing db: every backend fails → db-error naming the
//      DEEPEST failing backend (spawn-sqlite3 — the production last resort)
{
  setBackends([...DEFAULT_BACKENDS]);
  const r = await readGauge(MISSING_DB);
  check(
    "37",
    "S7",
    "full chain, missing db: db-error (no throw) naming the deepest failing backend (spawn-sqlite3), notAvailable form",
    r.ok === false && r.kind === "db-error" && r.sid === "unknown" && typeof r.error === "string" && r.error.startsWith("spawn-sqlite3 ") && formatGauge(r) === "SESSION=unknown CTX=notAvailable",
    JSON.stringify(r),
  );
}

// 38 — fallback: a working backend whose module LATER fails (host change)
//      must fall through to the next backend — and the re-attempted import
//      failure is memoized (attempts +1 exactly once across the 2 reads)
{
  const a0 = importAttemptsForTest("bun:sqlite");
  setImportForTest("bun:sqlite", { Database: MockBunDatabase });
  setBackends(["bun:sqlite", "spawn-sqlite3"]);
  const r1 = await readGauge(FX_OK); // ok via the (mock) bun:sqlite — cached for FX_OK
  clearImportForTest("bun:sqlite"); // the module "disappears" (real node import → fails)
  const r2 = await readGauge(FX_OK); // bun re-import fails → falls through to spawn → ok
  const a1 = importAttemptsForTest("bun:sqlite");
  const r3 = await readGauge(FX_OK); // cached spawn — NO new bun import attempt
  const a2 = importAttemptsForTest("bun:sqlite");
  check(
    "38",
    "S7",
    "fallback: working backend whose module later fails falls through to spawn (ok); failed import not re-tried (attempts +1 total)",
    r1.ok === true && r2.ok === true && r3.ok === true && a1 === a0 + 1 && a2 === a1,
    JSON.stringify({ r1: r1.kind, r2: r2.kind, r3: r3.kind, a0, a1, a2 }),
  );
}

// 39 — hook restore: the default chain order is back, the setDbPath plumbing
//      is intact, and the read is still byte-identical (the S4/S6 paths never
//      change because of the chain machinery)
{
  clearImportForTest("bun:sqlite");
  setBackends([...DEFAULT_BACKENDS]);
  const r = await readGauge(FX_OK);
  check(
    "39",
    "S7",
    "hook restore: getBackends() back to the default chain order; setDbPath/getDbPath plumbing intact; read byte-identical",
    JSON.stringify(getBackends()) === JSON.stringify(["node:sqlite", "bun:sqlite", "spawn-sqlite3"]) && getDbPath() === FX_OK && formatGauge(r) === "SESSION=ses_fx_ok CTX=10000 (3%) REM=246000",
    JSON.stringify({ backends: getBackends(), dbPath: getDbPath(), r }),
  );
}

// ------------------------------------------------------------------ S8 nudge ladder (8)
//
// The v2.6 auto-nudge ladder (TODO #30/#33 — the APPROVED design of record):
// fired from tool.execute.after with a PER-SESSION read (the payload's session
// id must exist in the fixture db — fx_lad.db, window 120K, one session per
// rung + two delivery-failure sessions). The plugin is RE-INITIALIZED with a
// fake client (module-level swap; the original hooks object stays valid) that
// records every promptAsync call. Evidence = kind:"nudge" lines ONLY —
// SILENT on every non-fire.
const LAD_ROW = (sid, ctx) => ({
  id: sid,
  time_updated: 3000,
  model: JSON.stringify({ id: "probe-model-120K_MTP", providerID: "fx" }),
  messages: [
    {
      time_created: 20,
      data: JSON.stringify({
        role: "assistant",
        finish: "stop",
        // total = input + output + cache.read(0); ctx = total - output (the verified token semantics)
        tokens: { total: ctx + 101, input: ctx, output: 101, reasoning: 0, cache: { write: 0, read: 0 } },
      }),
    },
  ],
});
const FX_LAD = path.join(SANDBOX, "fx_lad.db");
buildFixtureDb(FX_LAD, [
  LAD_ROW("ses_lad_0", 59_901), // 49% — below the first rung
  LAD_ROW("ses_lad_1", 61_001), // 50% — rung 1
  LAD_ROW("ses_lad_2", 84_001), // 70% — rung 2
  LAD_ROW("ses_lad_3", 96_001), // 80% — rung 3
  LAD_ROW("ses_lad_4", 108_001), // 90% — rung 4
  LAD_ROW("ses_lad_5", 116_001), // REM 3999 < 5k — rung 5
  LAD_ROW("ses_lad_6", 96_001), // rung 3 — the delivery-threw shape
  LAD_ROW("ses_lad_7", 96_001), // rung 3 — the delivery-rejected shape
]);
const LAD_RO = {
  ses_lad_1: "SESSION=ses_lad_1 CTX=61001 (50%) REM=58999",
  ses_lad_2: "SESSION=ses_lad_2 CTX=84001 (70%) REM=35999",
  ses_lad_3: "SESSION=ses_lad_3 CTX=96001 (80%) REM=23999",
  ses_lad_4: "SESSION=ses_lad_4 CTX=108001 (90%) REM=11999",
  ses_lad_5: "SESSION=ses_lad_5 CTX=116001 (96%) REM=3999",
};
setDbPath(FX_LAD);
const nudged = [];
const fakeClient = {
  session: {
    promptAsync: (options) => {
      nudged.push(options);
      return Promise.resolve({ ok: true });
    },
  },
};
await plugin({ directory: SANDBOX, client: fakeClient });
const nudgeLines = () => linesOfKind("nudge").map((l) => JSON.parse(l));
const afterLad = (sid, call) => afterFeed(sid, call, {}, { output: "x" });
// v2.8 — delivery is DEFERRED (setImmediate + the busy check): every check
// awaits this tick before asserting promptAsync calls.
const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));

// 46 — below the first rung (49% / REM 60k): SILENT — no nudge line, no promptAsync call
{
  await afterLad("ses_lad_0", "e1");
  await tick();
  check(
    "46",
    "S8",
    "below the first rung (49%): SILENT — no nudge line, no promptAsync call",
    nudgeLines().length === 0 && nudged.length === 0,
    `nudge=${nudgeLines().length} calls=${nudged.length}`,
  );
}

// 47-51 — rungs 1-5: each fires EXACTLY ONCE with the byte-exact evidence line
//      {session, rung, readout} and the byte-shape promptAsync payload
//      (path.id = the session, ONE synthetic text part, text = readout + " — "
//      + the rung instruction)
{
  const RUNGS = [
    ["47", "ses_lad_1", "1", "e2", "context watch"],
    ["48", "ses_lad_2", "2", "e3", "context high"],
    ["49", "ses_lad_3", "3", "e4", "wind-down"],
    ["50", "ses_lad_4", "4", "e5", "CRITICAL"],
    ["51", "ses_lad_5", "5", "e6", "stop line reached"],
  ];
  for (const [id, sid, rung, call, marker] of RUNGS) {
    const nBefore = nudgeLines().length;
    const cBefore = nudged.length;
    await afterLad(sid, call);
    await tick();
    const nl = nudgeLines().slice(nBefore);
    const o = nl.length === 1 ? nl[0] : {};
    const c = nudged.length === cBefore + 1 ? nudged[cBefore] : null;
    const p0 = c?.body?.parts?.[0];
    const ro = LAD_RO[sid];
    const payloadOk =
      c?.path?.id === sid &&
      Array.isArray(c?.body?.parts) &&
      c.body.parts.length === 1 &&
      p0?.type === "text" &&
      p0?.synthetic === true &&
      typeof p0?.text === "string" &&
      p0.text.startsWith(`${ro} \u2014 `) &&
      p0.text.includes(marker);
    check(
      id,
      "S8",
      `rung ${rung} fires exactly once: byte-exact nudge line {session,rung,readout} + promptAsync payload (synthetic text part, marker "${marker}")`,
      nl.length === 1 && o.session === sid && o.rung === rung && o.readout === ro && payloadOk,
      JSON.stringify({ nl: nl.length, o, c }).slice(0, 400),
    );
  }
}

// 52 — per-rung dedup: a second tool fire at the same (already fired) rung
//      posts NOTHING — no nudge line, no promptAsync call
{
  const nBefore = nudgeLines().length;
  const cBefore = nudged.length;
  await afterLad("ses_lad_1", "e7");
  await tick();
  check(
    "52",
    "S8",
    "per-rung dedup: second fire at an already-fired rung posts nothing (no line, no call)",
    nudgeLines().length === nBefore && nudged.length === cBefore,
    `nudge=${nudgeLines().length - nBefore} calls=${nudged.length - cBefore}`,
  );
}

// 53 — delivery failures are EVIDENCE-LOGGED, never thrown: a sync throw in
//      promptAsync → kind nudge reason delivery-threw; a rejected promise →
//      reason delivery-rejected; both carry session/rung/preview (capped)
{
  await plugin({ directory: SANDBOX, client: { session: { promptAsync: () => { throw new Error("boom-threw"); } } } });
  await afterLad("ses_lad_6", "e8");
  await tick(); // the deferred fn runs here — the delivery-threw line lands synchronously-ish inside it
  const lt = nudgeLines().filter((o) => o.session === "ses_lad_6" && o.reason);
  await plugin({ directory: SANDBOX, client: { session: { promptAsync: () => Promise.reject(new Error("boom-rejected")) } } });
  await afterLad("ses_lad_7", "e9");
  await tick(); // the deferred fn + the .catch evidence line (microtask) both land before this
  const lr = nudgeLines().filter((o) => o.session === "ses_lad_7" && o.reason);
  check(
    "53",
    "S8",
    "delivery failures evidence-logged (delivery-threw + delivery-rejected, rung 3, preview capped), never thrown",
    lt.length === 1 && lt[0].reason === "delivery-threw" && lt[0].rung === "3" && String(lt[0].preview ?? "").includes("boom-threw") &&
      lr.length === 1 && lr[0].reason === "delivery-rejected" && lr[0].rung === "3" && String(lr[0].preview ?? "").includes("boom-rejected"),
    JSON.stringify({ lt, lr }),
  );
  await plugin({ directory: SANDBOX, client: fakeClient }); // restore the recording client
}

// ------------------------------------------------------------------ S9 readout + ctx log + deferred delivery (12) — v2.8
//
// The v2.8 build (the re-scoped design of record — the plugin's v2.8 header
// block): ONE per-session gauge read per tool.execute.after feeds (1) the
// MINIMAL readout appended to the tool result IN PLACE, (2) the ladder
// (unchanged), (3) the single-file ctx log at SANDBOX/.opencode/temp/ctx.log
// (isomorphic: an entry IFF the readout was appended). Fixture fx_ro.db
// (window 120K except where noted); ses_ro_absent is deliberately NOT in the
// db (the per-session no-total shape). The plugin is RE-INITIALIZED with a
// status-aware fake client: a mutable S9_STATUS drives the busy/idle check
// (direct-map and the SDK fields-style `{data: {…}}` shapes both accepted).
const RO_ROW = (sid, ctx, model) => ({
  id: sid,
  time_updated: 3000,
  model: model == null ? null : JSON.stringify({ id: model, providerID: "fx" }),
  messages: [
    {
      time_created: 20,
      data: JSON.stringify({
        role: "assistant",
        finish: "stop",
        tokens: { total: ctx + 101, input: ctx, output: 101, reasoning: 0, cache: { write: 0, read: 0 } },
      }),
    },
  ],
});
const FX_RO = path.join(SANDBOX, "fx_ro.db");
buildFixtureDb(FX_RO, [
  RO_ROW("ses_ro_k", 42_012, "probe-model-120K_MTP"), // known window → (35% used, 78K left), below rung 1
  RO_ROW("ses_ro_u", 45_678, "CPU-Qwen3-0.6B"), // no window marker → (46K used)
  RO_ROW("ses_ro_nom", 24_056, null), // model NULL → (24K used) (the model-FIELD-omitted log shape; built per the locked fixture spec)
  { id: "ses_ro_empty", time_updated: 3000, model: JSON.stringify({ id: "probe-model-120K_MTP", providerID: "fx" }), messages: [{ time_created: 20, data: INFLIGHT }] }, // no finish → no-total
  RO_ROW("ses_ro_n1", 61_020, "probe-model-120K_MTP"), // rung 1 ×5 — the deferred-delivery sessions
  RO_ROW("ses_ro_n2", 61_030, "probe-model-120K_MTP"),
  RO_ROW("ses_ro_n3", 61_040, "probe-model-120K_MTP"),
  RO_ROW("ses_ro_n4", 61_050, "probe-model-120K_MTP"),
  RO_ROW("ses_ro_n5", 61_060, "probe-model-120K_MTP"),
]);
const RO_RO = {
  ses_ro_n1: "SESSION=ses_ro_n1 CTX=61020 (50%) REM=58980",
  ses_ro_n2: "SESSION=ses_ro_n2 CTX=61030 (50%) REM=58970",
  ses_ro_n3: "SESSION=ses_ro_n3 CTX=61040 (50%) REM=58960",
  ses_ro_n4: "SESSION=ses_ro_n4 CTX=61050 (50%) REM=58950",
  ses_ro_n5: "SESSION=ses_ro_n5 CTX=61060 (50%) REM=58940",
};
setDbPath(FX_RO);
let S9_STATUS; // the fake session.status() return (direct map / fields-style / undefined)
const s9Calls = [];
const s9Client = {
  session: {
    promptAsync: (options) => {
      s9Calls.push(options);
      return Promise.resolve({ ok: true });
    },
    status: () => S9_STATUS,
  },
};
await plugin({ directory: SANDBOX, client: s9Client });
const SB_CTXLOG = path.join(SANDBOX, ".opencode", "temp", "ctx.log");
const ctxLogLines = () => (existsSync(SB_CTXLOG) ? readFileSync(SB_CTXLOG, "utf8").split("\n").filter((l) => l.length > 0) : []);
const DT = "\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}";
const s9Nudge = (sid) => nudgeLines().filter((o) => o.session === sid);

// 54 — known window: the append is BYTE-EXACT + the ctx log line 1 is
//      byte-shape `<YYYY-MM-DD_HH-MM> probe-model-120K_MTP task (35% used, 78K left)`
//      (the tool-name field is present — the probe's fake tool name)
{
  const pre = ctxLogLines().length; // S8's feeds already wrote entries (consumer 3 is unconditional) — delta-based
  const out = { title: "t", output: "tool body", metadata: {} };
  await afterFeed("ses_ro_k", "f1", {}, out);
  const ll = ctxLogLines();
  const last = ll.length > 0 ? ll[ll.length - 1] : "";
  check(
    "54",
    "S9",
    "known window: output byte-exact `tool body\\n(35% used, 78K left)` + NEW ctx log line `<dt> probe-model-120K_MTP task (35% used, 78K left)`, below rung 1 (no nudge)",
    out.output === "tool body\n(35% used, 78K left)" && ll.length === pre + 1 && new RegExp(`^${DT} probe-model-120K_MTP task \\(35% used, 78K left\\)$`).test(last) && s9Nudge("ses_ro_k").length === 0,
    JSON.stringify({ out: out.output, ll }),
  );
}

// 55 — unknown window on a TRAILING-NEWLINE output: direct concat byte-exact
//      `x\n(46K used)` + the ctx log line 2 carries the model (CPU-Qwen3-0.6B) +
//      the tool name
{
  const pre = ctxLogLines().length;
  const out = { title: "t", output: "x\n", metadata: {} };
  await afterFeed("ses_ro_u", "f2", {}, out);
  const ll = ctxLogLines();
  const last = ll.length > 0 ? ll[ll.length - 1] : "";
  check(
    "55",
    "S9",
    "unknown window (trailing-newline output): byte-exact `x\\n(46K used)` direct concat + NEW ctx log line `<dt> CPU-Qwen3-0.6B task (46K used)` (model + tool carried)",
    out.output === "x\n(46K used)" && ll.length === pre + 1 && new RegExp(`^${DT} CPU-Qwen3-0.6B task \\(46K used\\)$`).test(last),
    JSON.stringify({ out: out.output, ll }),
  );
}

// 56 — no-total (in-flight step, no finish marker): NO append (the output is
//      untouched), NO ctx log entry, no nudge line — silent
{
  const out = { title: "t", output: "untouched\n", metadata: {} };
  const lBefore = ctxLogLines().length;
  await afterFeed("ses_ro_empty", "f3", {}, out);
  check(
    "56",
    "S9",
    "no-total (in-flight step): NO append (output untouched), NO ctx log entry, no nudge line — silent",
    out.output === "untouched\n" && ctxLogLines().length === lBefore && s9Nudge("ses_ro_empty").length === 0,
    JSON.stringify({ out: out.output, log: ctxLogLines().length }),
  );
}

// 57 — missing session (ses_ro_absent NOT in the db): the per-session read is
//      no-total → NO append, NO log entry, no nudge line
{
  const out = { title: "t", output: "also untouched", metadata: {} };
  const lBefore = ctxLogLines().length;
  await afterFeed("ses_ro_absent", "f4", {}, out);
  check(
    "57",
    "S9",
    "missing session (not in the db): per-session read no-total → NO append, NO log entry, no nudge line",
    out.output === "also untouched" && ctxLogLines().length === lBefore && s9Nudge("ses_ro_absent").length === 0,
    JSON.stringify({ out: out.output, log: ctxLogLines().length }),
  );
}

// 58 — non-string output.output (defensive — the SDK declares string): NO
//      throw, the object UNTOUCHED, NO log entry (the log ⟷ appended-returns
//      isomorphism holds even when the read itself was ok)
{
  const obj = { nested: true };
  const out = { title: "t", output: obj, metadata: {} };
  const lBefore = ctxLogLines().length;
  let threw = false;
  try {
    await afterFeed("ses_ro_k", "f5", {}, out);
  } catch {
    threw = true;
  }
  check(
    "58",
    "S9",
    "non-string output: no throw, object untouched, NO ctx log entry (isomorphism)",
    !threw && out.output === obj && ctxLogLines().length === lBefore,
    JSON.stringify({ threw, out: out.output, log: ctxLogLines().length }),
  );
}

// 59 — DEFERRED delivery (rung 1, status unknown): after the awaited afterFeed
//      promptAsync is NOT called synchronously (0 calls) while the nudge
//      evidence line IS synchronous; exactly 1 call with the byte-shape
//      synthetic payload after the tick (readout byte-exact = formatGauge)
{
  S9_STATUS = undefined; // status() returns undefined → unknown shape → deliver
  const out = { title: "t", output: "n1 body", metadata: {} };
  const lBefore = ctxLogLines().length; // captured BEFORE the feed (the append + log entry land inside it)
  await afterFeed("ses_ro_n1", "f6", {}, out);
  const n1 = s9Nudge("ses_ro_n1");
  const syncOk = n1.length === 1 && n1[0].readout === RO_RO.ses_ro_n1 && s9Calls.length === 0;
  await tick();
  const c = s9Calls.length === 1 ? s9Calls[0] : null;
  const p0 = c?.body?.parts?.[0];
  const textOk = p0?.text === `${RO_RO.ses_ro_n1} \u2014 context watch: past 50% of the context window; gauge-check between steps and keep new work small.`;
  check(
    "59",
    "S9",
    "deferred delivery (status unknown): 0 sync promptAsync calls + synchronous nudge line (byte-exact formatGauge readout); exactly 1 call after tick (synthetic payload) + append + log entry",
    syncOk && out.output === "n1 body\n(50% used, 59K left)" && s9Calls.length === 1 && c?.path?.id === "ses_ro_n1" && c.body.parts.length === 1 && p0?.type === "text" && p0?.synthetic === true && textOk && ctxLogLines().length === lBefore + 1,
    JSON.stringify({ syncCalls: s9Calls.length, c }),
  );
}

// 60 — BUSY (direct-map status fake): the nudge evidence line FIRES
//      (synchronous), the readout append + the ctx log entry are UNTOUCHED,
//      but 0 promptAsync calls after the tick (the skip adds NO new reason)
{
  S9_STATUS = { ses_ro_n2: { type: "busy" } };
  const out = { title: "t", output: "n2 body\n", metadata: {} };
  const lBefore = ctxLogLines().length; // the entry is written synchronously INSIDE afterFeed — measure before
  await afterFeed("ses_ro_n2", "f7", {}, out);
  const fired = s9Nudge("ses_ro_n2").length === 1;
  await tick();
  check(
    "60",
    "S9",
    "busy (direct-map status): evidence line fired, readout appended + log entry written, 0 promptAsync calls after tick (silent skip, no new reason)",
    fired && out.output === "n2 body\n(50% used, 59K left)" && ctxLogLines().length === lBefore + 1 && s9Calls.length === 1,
    JSON.stringify({ fired, out: out.output, calls: s9Calls.length, log: ctxLogLines().length }),
  );
}

// 61 — status ABSENT (the fn returns undefined): the deferral alone still
//      delivers — exactly 1 call after the tick
{
  S9_STATUS = undefined;
  const out = { title: "t", output: "n3 body", metadata: {} };
  await afterFeed("ses_ro_n3", "f8", {}, out);
  await tick();
  check(
    "61",
    "S9",
    "status absent (fn returns undefined): deferral alone still delivers — exactly 1 call after tick",
    s9Calls.length === 2 && s9Calls[1]?.path?.id === "ses_ro_n3" && out.output === "n3 body\n(50% used, 59K left)",
    JSON.stringify({ calls: s9Calls.length }),
  );
}

// 62 — BUSY via the SDK fields-style fake `{data: {sid: {type:"busy"}}}`:
//      the `.data` carrier is accepted — 0 calls after the tick
{
  S9_STATUS = { data: { ses_ro_n4: { type: "busy" } } };
  const out = { title: "t", output: "n4 body", metadata: {} };
  await afterFeed("ses_ro_n4", "f9", {}, out);
  await tick();
  check(
    "62",
    "S9",
    "busy (SDK fields-style {data:{…}}): 0 promptAsync calls after tick; evidence line fired",
    s9Calls.length === 2 && s9Nudge("ses_ro_n4").length === 1 && out.output === "n4 body\n(50% used, 59K left)",
    JSON.stringify({ calls: s9Calls.length }),
  );
}

// 63 — IDLE (fields-style `{data: {sid: {type:"idle"}}}`): idle is not busy —
//      exactly 1 call after the tick
{
  S9_STATUS = { data: { ses_ro_n5: { type: "idle" } } };
  const out = { title: "t", output: "n5 body", metadata: {} };
  await afterFeed("ses_ro_n5", "f10", {}, out);
  await tick();
  check(
    "63",
    "S9",
    "idle (fields-style status): exactly 1 call after tick (idle delivers)",
    s9Calls.length === 3 && s9Calls[2]?.path?.id === "ses_ro_n5" && out.output === "n5 body\n(50% used, 59K left)",
    JSON.stringify({ calls: s9Calls.length }),
  );
}

// 65 — ctx log tool-name field PRESENT: the probe's fake tool name (`task`,
//      carried by the afterFeed payload) appears on the line — byte-shape
//      `<dt> CPU-Qwen3-0.6B task (46K used)`
{
  const out = { title: "t", output: "f13 body", metadata: {} };
  const pre = ctxLogLines().length;
  await afterFeed("ses_ro_u", "f13", {}, out);
  const ll = ctxLogLines();
  const last = ll.length > 0 ? ll[ll.length - 1] : "";
  check(
    "65",
    "S9",
    "ctx log tool-name field PRESENT: NEW line `<dt> CPU-Qwen3-0.6B task (46K used)` (the fake tool `task` from the payload)",
    ll.length === pre + 1 && new RegExp(`^${DT} CPU-Qwen3-0.6B task \\(46K used\\)$`).test(last) && out.output === "f13 body\n(46K used)",
    JSON.stringify({ out: out.output, ll }),
  );
}

// 66 — ctx log tool-name field OMITTED: a payload WITHOUT the `tool` key (the
//      hook called directly, afterFeed minus the tool) → the field is absent
//      (mirroring the model-field convention) — byte-shape `<dt> CPU-Qwen3-0.6B (46K used)`
{
  const out = { title: "t", output: "f14 body", metadata: {} };
  const pre = ctxLogLines().length;
  await hooks["tool.execute.after"]({ sessionID: "ses_ro_u", callID: "f14", args: {} }, out);
  const ll = ctxLogLines();
  const last = ll.length > 0 ? ll[ll.length - 1] : "";
  check(
    "66",
    "S9",
    "ctx log tool-name field OMITTED (no tool in the payload): NEW line `<dt> CPU-Qwen3-0.6B (46K used)`",
    ll.length === pre + 1 && new RegExp(`^${DT} CPU-Qwen3-0.6B \\(46K used\\)$`).test(last) && out.output === "f14 body\n(46K used)",
    JSON.stringify({ out: out.output, ll }),
  );
}

// ------------------------------------------------------------------ S10 compact_memory v1 tool (9) — L2 (the approved design)
//
// The RETIRED v1 custom tool at
// .opencode/plugin/deactivated/compact_memory_v1.ts (retired 2026-09-12 from
// its former tools/ home, superseded by the plugin-registered
// .opencode/plugin/compact_memory.ts — pinned by S13): this section pins the
// RETIRED v1 ARTIFACT (T3, the compaction-lifecycle proposal L2): imported
// DIRECT from the repo path (type-stripped, the same way the plugin loads —
// the tool file MUST load that way) and driven with a FAKE client (records
// every session.compact call; a mutable FAIL switch forces the failure shape)
// + a FAKE context: directory=SANDBOX steers ALL the tool's fs writes (the
// budget store + the COMPACT ctx.log line) into the sandbox; sessionId is the
// prototype's working shape (modelId/preReadout are the best-effort L1 fields
// — carried in check 70, absent in all others).
const TOOL_TS = path.join(REPO_ROOT, ".opencode", "plugin", "deactivated", "compact_memory_v1.ts");
const cmCompactCalls = [];
const cmFail = { fail: false, error: "boom-compact" };
const cmClient = {
  session: {
    compact: (options) => {
      cmCompactCalls.push(options);
      if (cmFail.fail) return Promise.reject(new Error(cmFail.error));
      return Promise.resolve({ ok: true });
    },
  },
};
const cmCtx = (extra = {}) => ({ sessionId: "ses_cm_1", directory: SANDBOX, client: cmClient, ...extra });
let cmTool;
const cmExec = (args, extra) => cmTool.execute(args, cmCtx(extra));

// 67 — the tool file imports (type-stripped, direct) and exposes the tool()
//      default export: { description, args (plain object NAME → zod schema),
//      execute } — the maintainer's committed tool() form (the T3 prototype's
//      default.tools.compact_memory shape is GONE)
{
  const toolMod = await import(pathToFileURL(TOOL_TS).href);
  cmTool = toolMod.default;
  check(
    "67",
    "S10",
    "tool file imports (type-stripped, direct) and exposes the tool() default export (description + async execute + the prototype's arg names as args NAME → zod schema)",
    cmTool != null && typeof cmTool.description === "string" && typeof cmTool.execute === "function" &&
      JSON.stringify(Object.keys(cmTool.args ?? {})) === JSON.stringify(["keepTokens", "keepMessages", "sessionID"]) &&
      Object.values(cmTool.args ?? {}).every((s) => s != null && typeof s.safeParse === "function"),
    JSON.stringify(Object.keys(toolMod.default ?? {})),
  );
}

// 68 — execute calls session.compact with the PASSED-THROUGH keep knobs (the
//      fake client captures the call) + the sessionID arg as path.id
{
  const before = cmCompactCalls.length;
  const res = await cmExec({ keepTokens: 42000, keepMessages: 7, sessionID: "ses_cm_1" });
  const calls = cmCompactCalls.slice(before);
  check(
    "68",
    "S10",
    "execute calls session.compact with the PASSED-THROUGH keep knobs + path.id (the sessionID arg)",
    calls.length === 1 && calls[0]?.path?.id === "ses_cm_1" && calls[0]?.body?.keep?.tokens === 42000 && calls[0]?.body?.keep?.messages === 7,
    JSON.stringify({ calls, res: String(res).slice(0, 80) }),
  );
}

// 69 — the sessionID arg ABSENT → the context.sessionId fallback targets the
//      compact call (the prototype's fallback shape)
{
  const before = cmCompactCalls.length;
  await cmExec({ keepTokens: 101, keepMessages: 3 }, { sessionId: "ses_cm_fb" });
  const calls = cmCompactCalls.slice(before);
  check(
    "69",
    "S10",
    "sessionID arg absent: the context.sessionId fallback targets the compact call",
    calls.length === 1 && calls[0]?.path?.id === "ses_cm_fb" && calls[0]?.body?.keep?.tokens === 101 && calls[0]?.body?.keep?.messages === 3,
    JSON.stringify(calls),
  );
}

// 70 — the COMPACT line after success, the best-effort model + pre-readout
//      fields PRESENT (the context carries them): byte-shape
//      `<dt> probe-model-120K_MTP COMPACT ses_cm_line tokens=50123 messages=9 (87% used, 52K left)`
{
  const pre = ctxLogLines().length;
  await cmExec({ keepTokens: 50123, keepMessages: 9, sessionID: "ses_cm_line" }, { modelId: "probe-model-120K_MTP", preReadout: "87% used, 52K left" });
  const ll = ctxLogLines();
  const last = ll.length > 0 ? ll[ll.length - 1] : "";
  check(
    "70",
    "S10",
    "COMPACT line after success (model + pre-readout PRESENT): `<dt> probe-model-120K_MTP COMPACT ses_cm_line tokens=50123 messages=9 (87% used, 52K left)`",
    ll.length === pre + 1 && new RegExp(`^${DT} probe-model-120K_MTP COMPACT ses_cm_line tokens=50123 messages=9 \\(87% used, 52K left\\)$`).test(last),
    JSON.stringify({ pre, ll: ll.slice(-1) }),
  );
}

// 71 — the same line with model + pre-readout ABSENT from the context → BOTH
//      fields OMITTED (the T2 omit-when-empty convention), never thrown
{
  const pre = ctxLogLines().length;
  await cmExec({ keepTokens: 1, keepMessages: 1, sessionID: "ses_cm_bare" });
  const ll = ctxLogLines();
  const last = ll.length > 0 ? ll[ll.length - 1] : "";
  check(
    "71",
    "S10",
    "COMPACT line best-effort OMITTED (no model / no pre-readout in the context): `<dt> COMPACT ses_cm_bare tokens=1 messages=1`",
    ll.length === pre + 1 && new RegExp(`^${DT} COMPACT ses_cm_bare tokens=1 messages=1$`).test(last),
    JSON.stringify(ll.slice(-1)),
  );
}

// 72 — the budget allows EXACTLY 2 compactions per session id and REFUSES the
//      3rd with the hand-over note (NO compact call on the 3rd)
{
  const before = cmCompactCalls.length;
  const a1 = await cmExec({ keepTokens: 10, keepMessages: 2, sessionID: "ses_cm_budget" });
  const a2 = await cmExec({ keepTokens: 10, keepMessages: 2, sessionID: "ses_cm_budget" });
  const cAfter2 = cmCompactCalls.length;
  const a3 = await cmExec({ keepTokens: 10, keepMessages: 2, sessionID: "ses_cm_budget" });
  check(
    "72",
    "S10",
    "budget: 2 compactions allowed, the 3rd REFUSED with the hand-over note and NO compact call",
    cAfter2 === before + 2 && cmCompactCalls.length === cAfter2 && /compacted/i.test(a1) && /compacted/i.test(a2) && /hand over/i.test(a3) && /start fresh/i.test(a3),
    JSON.stringify({ calls: cmCompactCalls.length - before, a1: String(a1).slice(0, 60), a2: String(a2).slice(0, 60), a3 }),
  );
}

// 73 — the budget state is PERSISTED to disk (persistence, not in-memory):
//      compact_budget.json carries count==2 after the calls AND a FRESH module
//      instance (cache-busted re-import of the SAME tool file) still refuses
//      the next call with NO compact call — an in-memory store would grant the
//      re-imported module a fresh budget.
{
  const stateFile = path.join(SANDBOX, ".opencode", "temp", "compact_budget.json");
  let st = null;
  try {
    st = JSON.parse(readFileSync(stateFile, "utf8"));
  } catch {
    st = null;
  }
  const freshMod = await import(pathToFileURL(TOOL_TS).href + "?cm_reimport=1");
  const before = cmCompactCalls.length;
  const a4 = await freshMod.default.execute({ keepTokens: 10, keepMessages: 2, sessionID: "ses_cm_budget" }, cmCtx());
  check(
    "73",
    "S10",
    "budget PERSISTED to disk (compact_budget.json count==2) and honored by a FRESH module instance (4th call refused, no compact call)",
    st != null && st?.sessions?.ses_cm_budget?.count === 2 && cmCompactCalls.length === before && /hand over/i.test(a4),
    JSON.stringify({ st, calls: cmCompactCalls.length - before, a4: String(a4).slice(0, 80) }),
  );
}

// 74 — a FAILING session.compact returns the error note (never throws) and
//      does NOT consume the budget (the very next call compacts fine)
{
  cmFail.fail = true;
  let threw = false;
  let res = "";
  try {
    res = await cmExec({ keepTokens: 10, keepMessages: 2, sessionID: "ses_cm_fail" });
  } catch {
    threw = true;
  }
  cmFail.fail = false;
  const before = cmCompactCalls.length;
  const ok = await cmExec({ keepTokens: 10, keepMessages: 2, sessionID: "ses_cm_fail" });
  check(
    "74",
    "S10",
    "failing session.compact: error note (no throw), budget NOT consumed (the next call compacts)",
    !threw && /compaction request failed/i.test(res) && String(res).includes("boom-compact") && cmCompactCalls.length === before + 1 && /compacted/i.test(ok),
    JSON.stringify({ threw, res: String(res), ok: String(ok).slice(0, 60) }),
  );
}

// 75 — the success return carries the re-application file pointer (the
//      prototype's directive SENTENCE — with the T3 escape fix, the path
//      separators survive); the refusal return carries the hand-over note
//      (the exhausted ses_cm_budget is reused — no compact call)
{
  const before = cmCompactCalls.length;
  const ok = await cmExec({ keepTokens: 10, keepMessages: 2, sessionID: "ses_cm_ptr" });
  const ref = await cmExec({ keepTokens: 10, keepMessages: 2, sessionID: "ses_cm_budget" });
  check(
    "75",
    "S10",
    "success return carries the re-application file pointer; refusal return carries the hand-over note",
    String(ok).includes(".opencode\\agent\\prompts\\agent_readme_post_compaction.md") && /hand over and start fresh/i.test(ref) && cmCompactCalls.length === before + 1,
    JSON.stringify({ ok: String(ok).slice(0, 160), ref }),
  );
}

// ------------------------------------------------------------------ S11 emergency recovery plugin (11) — TODO #93: the 2026-09-25 event-hook port of the T5 prototype
//
// The plugin at .opencode/plugin/context_recovery.ts (TODO #93 — the
// event-hook port; the deactivated copy is REMOVED): imported DIRECT from
// the repo path (type-stripped, the same way the plugin loads — the file
// MUST load that way) and driven with a FAKE client (records every
// session.summarize / session.promptAsync / session.messages call) +
// FAKE SDK events (the current host's delivery shape — { type:
// "session.error", properties: { sessionID, error } } / { type:
// "session.idle", properties: { sessionID } }; the "session.error" hook
// does NOT exist in the current SDK — the hooks object carries `event`
// only) + a sandbox root (directory=SANDBOX steers the flag read, the
// budget store, and the COMPACT ctx.log line into the sandbox). The
// activation flag is the top-level `emergencyRecovery` key in the SHARED
// compact_budget.json (the SAME file the S10/S13 tools use): key absent /
// not `true` → OFF (checks 77/258); the store setter MERGES (the S10
// session entries survive). The v2 budget gate (checks 78/80/81): the cap
// is the sandbox model_budget map (default 1 — the messages-resolved
// "smoke-model" is UNLISTED); count < cap → normal (count+1); count ==
// cap → the emergency 1 (count → cap+1, the ` emergency` line suffix);
// count > cap → CLEAN FAIL. The once-per-overflow guard (check 79): the
// host emits FOUR session.error events for ONE overflow (its internal
// tail-strip retries — measured 2026-09-23) — exactly ONE compact;
// EventSessionIdle (check 80) clears the guard.
const RC_TS = path.join(REPO_ROOT, ".opencode", "plugin", "context_recovery.ts");
// The ported plugin's directive constant (the current post-compaction
// wording — the spec-2+11 relay addendum; the old T5 looprunner
// directive is RETIRED per TODO #93 fact 8).
const RC_DIRECTIVE =
  "post-compaction: re-read your head files per .opencode/agent/prompts/agent_readme_post_compaction.md and CONTINUE — never re-plan from scratch";
const RC_BUDGET = path.join(SANDBOX, ".opencode", "temp", "compact_budget.json");
// The store setter MERGES (the S10 session entries + any previously
// seeded top-level keys survive).
const rcSetStore = (mutate) => {
  let store = null;
  try {
    store = JSON.parse(readFileSync(RC_BUDGET, "utf8"));
  } catch {
    store = null;
  }
  if (store == null || typeof store !== "object" || store.sessions == null || typeof store.sessions !== "object") {
    store = { version: 2, sessions: {} };
  }
  mutate(store);
  mkdirSync(path.dirname(RC_BUDGET), { recursive: true });
  writeFileSync(RC_BUDGET, JSON.stringify(store, null, 2) + "\n", "utf8");
};
const rcSetFlag = (enabled) => rcSetStore((store) => { store.emergencyRecovery = enabled; });
const rcReadBudget = () => {
  try {
    return JSON.parse(readFileSync(RC_BUDGET, "utf8"));
  } catch {
    return null;
  }
};
const rcCalls = { summarize: [], prompt: [] };
let rcMessages = [{ info: { modelID: "smoke-model", providerID: "smoke-provider" } }];
let rcMessagesError = null;
const rcClient = {
  session: {
    summarize: (options) => {
      rcCalls.summarize.push(options);
      return Promise.resolve(true);
    },
    promptAsync: (options) => {
      rcCalls.prompt.push(options);
      return Promise.resolve({ ok: true });
    },
    messages: (options) => {
      if (rcMessagesError != null) return Promise.reject(rcMessagesError);
      return Promise.resolve(rcMessages);
    },
  },
};
const rcMod = await import(pathToFileURL(RC_TS).href);
const rcFactory = rcMod.default;
const rcHooks = typeof rcFactory === "function" ? await rcFactory({ directory: SANDBOX, client: rcClient }) : null;
// The SDK Event shape (the current host's delivery form — capital-D
// sessionID; the live overflow error is a MessageAbortedError whose text
// lives in data.message).
const rcFireError = (sessionId, error) =>
  (rcHooks?.event ?? (async () => undefined))({ event: { type: "session.error", properties: { sessionID: sessionId, error } } });
const rcFireIdle = (sessionId) =>
  (rcHooks?.event ?? (async () => undefined))({ event: { type: "session.idle", properties: { sessionID: sessionId } } });
const rcOVF = (text) => ({ name: "MessageAbortedError", data: { message: text } });

// 76 — the plugin file imports (type-stripped, direct) and exposes a
//      DEFAULT FACTORY whose returned hooks object carries the `event`
//      hook (NO "session.error" key — that hook does not exist in the
//      current SDK)
{
  check(
    "76",
    "S11",
    'plugin file imports (type-stripped, direct) and exposes a default factory whose hooks object carries the `event` hook (no "session.error" key)',
    rcHooks != null && typeof rcHooks.event === "function" && !("session.error" in (rcHooks ?? {})),
    JSON.stringify({ factory: typeof rcFactory, keys: rcHooks == null ? null : Object.keys(rcHooks) }),
  );
}

// 77 — flag OFF (no `emergencyRecovery: true` key in the shared budget
//      file) + an overflow event → the hook does NOTHING: no summarize, no
//      promptAsync, no budget entry (the session error propagates — the
//      visible hard stop)
{
  const store77 = rcReadBudget();
  const before = { s: rcCalls.summarize.length, p: rcCalls.prompt.length };
  await rcFireError("ses_rc_off", rcOVF("context length exceeded"));
  const after77 = rcReadBudget();
  check(
    "77",
    "S11",
    "flag OFF (no emergencyRecovery: true key in the shared budget file) + overflow event: no summarize, no promptAsync, no budget entry",
    (store77 == null || store77.emergencyRecovery !== true) && rcCalls.summarize.length === before.s && rcCalls.prompt.length === before.p && (after77 == null || after77.sessions?.ses_rc_off == null),
    JSON.stringify({ flag: store77?.emergencyRecovery, ds: rcCalls.summarize.length - before.s, dp: rcCalls.prompt.length - before.p }),
  );
}

// 78 — flag ON (top-level `emergencyRecovery: true` in the shared budget
//      file) + an overflow event + fresh budget (cap = model_budget
//      default 1 — "smoke-model" UNLISTED) → success: the summarize body
//      carries the MESSAGES-RESOLVED fallback pair (no sandbox
//      opencode.jsonc) + keep { messages: 12 } (the fail-open default —
//      no keep keys in the fixture; tokens UNRESOLVED → `tok=- none`), the
//      directive BYTE-MATCHES the ported constant (synthetic text part),
//      the budget file carries count==1 ON DISK (model recorded), and the
//      COMPACT line `<stamp> smoke-model COMPACT ses_rc_ok keep=12m tok=- none`
{
  rcSetStore((store) => { store.emergencyRecovery = true; store.model_budget = { default: 1 }; });
  const before = { s: rcCalls.summarize.length, p: rcCalls.prompt.length };
  await rcFireError("ses_rc_ok", rcOVF("request (148149 tokens) exceeds the available context size (131072 tokens)"));
  const sc = rcCalls.summarize.at(-1);
  const pc = rcCalls.prompt.at(-1);
  const budget = rcReadBudget();
  const okLine = ctxLogLines().find((l) => l.includes("COMPACT ses_rc_ok"));
  check(
    "78",
    "S11",
    "flag ON + overflow event + fresh budget (cap 1, default): the summarize body carries the messages-resolved pair + keep { messages: 12 } (tokens UNRESOLVED → tok=- none), the directive byte-exact (the ported constant), budget count==1 on disk (model recorded), the COMPACT line `<dt> smoke-model COMPACT ses_rc_ok keep=12m tok=- none`",
    rcCalls.summarize.length === before.s + 1 && sc?.path?.id === "ses_rc_ok" &&
      sc?.body?.providerID === "smoke-provider" && sc?.body?.modelID === "smoke-model" &&
      sc?.body?.keep?.messages === 12 && sc?.body?.keep?.tokens == null &&
      rcCalls.prompt.length === before.p + 1 && pc?.path?.id === "ses_rc_ok" && pc?.body?.parts?.length === 1 &&
      pc?.body?.parts?.[0]?.type === "text" && pc?.body?.parts?.[0]?.synthetic === true && pc?.body?.parts?.[0]?.text === RC_DIRECTIVE &&
      budget?.sessions?.ses_rc_ok?.count === 1 && budget?.sessions?.ses_rc_ok?.model === "smoke-model" &&
      okLine != null && new RegExp(`^${DT} smoke-model COMPACT ses_rc_ok keep=12m tok=- none$`).test(okLine),
    JSON.stringify({ sc, p0text: pc?.body?.parts?.[0]?.text?.slice(0, 60), budget: budget?.sessions?.ses_rc_ok, line: okLine }),
  );
}

// 79 — the once-per-overflow guard: the host's 4-event burst (its internal
//      tail-strip retries — measured 2026-09-23) → exactly ONE compact
//      (the first fire); the 3 follow-up events are no-ops, the budget
//      UNCHANGED (count==1)
{
  const before = { s: rcCalls.summarize.length, p: rcCalls.prompt.length };
  for (let i = 0; i < 3; i++) await rcFireError("ses_rc_ok", rcOVF("exceeds the available context size"));
  const count = rcReadBudget()?.sessions?.ses_rc_ok?.count;
  check(
    "79",
    "S11",
    "once-per-overflow guard: 3 more burst events for the same overflow → no-ops (exactly ONE compact total), budget unchanged (count==1)",
    rcCalls.summarize.length === before.s && rcCalls.prompt.length === before.p && count === 1,
    JSON.stringify({ ds: rcCalls.summarize.length - before.s, dp: rcCalls.prompt.length - before.p, count }),
  );
}

// 80 — EventSessionIdle clears the guard: after the idle, the next
//      overflow fires again — now the EMERGENCY slot (count 1 == cap 1):
//      summarize again, count → 2, and the COMPACT line carries the
//      ` emergency` suffix
{
  await rcFireIdle("ses_rc_ok");
  const before = { s: rcCalls.summarize.length, p: rcCalls.prompt.length };
  await rcFireError("ses_rc_ok", rcOVF("exceeds the available context size"));
  const budget = rcReadBudget();
  const emgLine = ctxLogLines().find((l) => l.includes("COMPACT ses_rc_ok") && l.includes(" emergency"));
  check(
    "80",
    "S11",
    "EventSessionIdle clears the guard: the next overflow fires again — the EMERGENCY slot (count 1 == cap 1): count → 2, the line carries the ` emergency` suffix",
    rcCalls.summarize.length === before.s + 1 && rcCalls.prompt.length === before.p + 1 &&
      budget?.sessions?.ses_rc_ok?.count === 2 &&
      emgLine != null && new RegExp(`^${DT} smoke-model COMPACT ses_rc_ok keep=12m tok=- none emergency$`).test(emgLine),
    JSON.stringify({ ds: rcCalls.summarize.length - before.s, count: budget?.sessions?.ses_rc_ok?.count, line: emgLine }),
  );
}

// 81 — budget exhausted (count 2 > cap 1) → CLEAN FAIL: after the idle,
//      the overflow → no summarize, no promptAsync, NO new COMPACT line,
//      the budget UNCHANGED (the looping agent is stopped by the budget,
//      not healed — the -WARNING is the protocol's job)
{
  await rcFireIdle("ses_rc_ok");
  const before = { s: rcCalls.summarize.length, p: rcCalls.prompt.length };
  const linesBefore = ctxLogLines().filter((l) => l.includes("COMPACT ses_rc_ok")).length;
  await rcFireError("ses_rc_ok", rcOVF("prompt is too long"));
  const budget = rcReadBudget();
  const linesAfter = ctxLogLines().filter((l) => l.includes("COMPACT ses_rc_ok")).length;
  check(
    "81",
    "S11",
    "budget exhausted (count 2 > cap 1): CLEAN FAIL — no summarize, no promptAsync, no new COMPACT line, budget unchanged",
    rcCalls.summarize.length === before.s && rcCalls.prompt.length === before.p && budget?.sessions?.ses_rc_ok?.count === 2 && linesAfter === linesBefore,
    JSON.stringify({ ds: rcCalls.summarize.length - before.s, dp: rcCalls.prompt.length - before.p, count: budget?.sessions?.ses_rc_ok?.count, newLines: linesAfter - linesBefore }),
  );
}

// 257 — flag ON + NON-overflow error → NO-OP: no summarize, no
//       promptAsync, no budget entry (the overflow marker gate comes
//       first — in-memory, so a non-overflow error never touches the fs)
{
  const before = { s: rcCalls.summarize.length, p: rcCalls.prompt.length };
  await rcFireError("ses_rc_non", rcOVF("connection refused: unrelated transport error"));
  const after257 = rcReadBudget();
  check(
    "257",
    "S11",
    "flag ON + NON-overflow error: no-op (no summarize, no promptAsync, no budget entry)",
    rcCalls.summarize.length === before.s && rcCalls.prompt.length === before.p && (after257 == null || after257.sessions?.ses_rc_non == null),
    JSON.stringify({ ds: rcCalls.summarize.length - before.s, dp: rcCalls.prompt.length - before.p }),
  );
}

// 258 — flag value `false` → OFF (missing file / missing key / any other
//       value / unparseable — only strictly `true` enables)
{
  rcSetFlag(false);
  const before = { s: rcCalls.summarize.length, p: rcCalls.prompt.length };
  await rcFireError("ses_rc_false", rcOVF("context length exceeded"));
  check(
    "258",
    "S11",
    "flag value `false` → OFF (no summarize, no promptAsync)",
    rcCalls.summarize.length === before.s && rcCalls.prompt.length === before.p,
    JSON.stringify({ ds: rcCalls.summarize.length - before.s, dp: rcCalls.prompt.length - before.p }),
  );
}

// 259 — the keep override: keepMessages 7 in the budget file (keepTokens
//       REMOVED — spec 01: never read, never defaulted, never sent) → the
//       summarize body keep { messages: 7 } (tokens UNRESOLVED → tok=- none)
//       + the COMPACT line `keep=7m tok=- none`
{
  rcSetStore((store) => { store.emergencyRecovery = true; store.keepMessages = 7; store.model_budget = { default: 1 }; });
  const before = { s: rcCalls.summarize.length, p: rcCalls.prompt.length };
  await rcFireError("ses_rc_keep", rcOVF("context length exceeded"));
  const sc259 = rcCalls.summarize.at(-1);
  const budget259 = rcReadBudget();
  const keepLine = ctxLogLines().find((l) => l.includes("COMPACT ses_rc_keep"));
  check(
    "259",
    "S11",
    "keep override: keepMessages 7 in the budget file → summarize body keep { messages: 7 } (tokens UNRESOLVED → tok=- none) + the COMPACT line `keep=7m tok=- none`",
    sc259?.path?.id === "ses_rc_keep" && sc259?.body?.keep?.messages === 7 && sc259?.body?.keep?.tokens == null &&
      budget259?.sessions?.ses_rc_keep?.count === 1 &&
      keepLine != null && new RegExp(`^${DT} smoke-model COMPACT ses_rc_keep keep=7m tok=- none$`).test(keepLine),
    JSON.stringify({ keep: sc259?.body?.keep, line: keepLine }),
  );
}

// 260 — the config pair override: the sandbox opencode.jsonc
//       agent.compaction.model (JSONC) → the summarize body carries the
//       CONFIG pair (over the messages-resolved fallback) and the COMPACT
//       line's model field — the file is removed afterwards
{
  const CFGP = path.join(SANDBOX, "opencode.jsonc");
  rcSetStore((store) => { store.emergencyRecovery = true; store.model_budget = { default: 1 }; delete store.keepMessages; });
  writeFileSync(CFGP, `{\n  "agent": { "compaction": { "model": "cfgprov/cfgmodel" } }\n}`, "utf8");
  const before = { s: rcCalls.summarize.length, p: rcCalls.prompt.length };
  await rcFireError("ses_rc_cfg", rcOVF("context length exceeded"));
  rmSync(CFGP, { force: true });
  const sc260 = rcCalls.summarize.at(-1);
  const budget260 = rcReadBudget();
  const cfgLine = ctxLogLines().find((l) => l.includes("COMPACT ses_rc_cfg"));
  check(
    "260",
    "S11",
    "config pair override: the sandbox opencode.jsonc agent.compaction.model → the summarize body carries the CONFIG pair + the COMPACT line's model field (the file is removed afterwards)",
    rcCalls.summarize.length === before.s + 1 && sc260?.path?.id === "ses_rc_cfg" &&
      sc260?.body?.providerID === "cfgprov" && sc260?.body?.modelID === "cfgmodel" &&
      budget260?.sessions?.ses_rc_cfg?.count === 1 && budget260?.sessions?.ses_rc_cfg?.model === "cfgmodel" &&
      cfgLine != null && new RegExp(`^${DT} cfgmodel COMPACT ses_rc_cfg keep=12m tok=- none$`).test(cfgLine),
    JSON.stringify({ body: sc260?.body, line: cfgLine }),
  );
}

// 261 — an UNRESOLVABLE model pair (a client with no session.messages) →
//       the request is NOT sent: no summarize, no promptAsync, no budget
//       entry, no COMPACT line (CLEAN FAIL — the v1 summarize body
//       REQUIRES providerID + modelID)
{
  rcSetStore((store) => { store.emergencyRecovery = true; store.model_budget = { default: 1 }; });
  const rcBareClient = {
    session: {
      summarize: (options) => { rcCalls.summarize.push(options); return Promise.resolve(true); },
      promptAsync: (options) => { rcCalls.prompt.push(options); return Promise.resolve({ ok: true }); },
    },
  };
  const rcBareHooks = await rcFactory({ directory: SANDBOX, client: rcBareClient });
  const before = { s: rcCalls.summarize.length, p: rcCalls.prompt.length };
  await (rcBareHooks?.event ?? (async () => undefined))({ event: { type: "session.error", properties: { sessionID: "ses_rc_nomodel", error: rcOVF("context length exceeded") } } });
  const budget261 = rcReadBudget();
  check(
    "261",
    "S11",
    "unresolvable model pair (no session.messages): the request is NOT sent — no summarize, no promptAsync, no budget entry, no COMPACT line (CLEAN FAIL)",
    rcCalls.summarize.length === before.s && rcCalls.prompt.length === before.p &&
      (budget261 == null || budget261.sessions?.ses_rc_nomodel == null) && !ctxLogLines().some((l) => l.includes("COMPACT ses_rc_nomodel")),
    JSON.stringify({ ds: rcCalls.summarize.length - before.s, dp: rcCalls.prompt.length - before.p }),
  );
}

// 285 — keepTokens computed: the fake client's messages return token data
//       (wrapper shape, last 12 = all 2) → the summarize body carries
//       keep.tokens 4500 (computed) + the COMPACT line
//       `keep=12m tok=4500 computed`
{
  rcMessages = { data: [
    { info: { role: "user", tokens: { input: 1200 } } },
    { info: { modelID: "smoke-model", providerID: "smoke-provider", role: "assistant", tokens: { output: 2500, reasoning: 800 } } },
  ] };
  rcSetStore((store) => { store.emergencyRecovery = true; store.model_budget = { default: 1 }; delete store.keepMessages; delete store.keepTokens; });
  const before285 = { s: rcCalls.summarize.length, p: rcCalls.prompt.length };
  await rcFireError("ses_rc_tokcomp", rcOVF("context length exceeded"));
  const sc285 = rcCalls.summarize.at(-1);
  const tokLine = ctxLogLines().find((l) => l.includes("COMPACT ses_rc_tokcomp"));
  check(
    "285",
    "S11",
    "keepTokens computed: messages return token data (wrapper shape, last 12 = all 2) → body keep.tokens 4500 (computed) + the COMPACT line `keep=12m tok=4500 computed`",
    sc285?.path?.id === "ses_rc_tokcomp" && sc285?.body?.keep?.messages === 12 && sc285?.body?.keep?.tokens === 4500 &&
      tokLine != null && new RegExp(`^${DT} smoke-model COMPACT ses_rc_tokcomp keep=12m tok=4500 computed$`).test(tokLine),
    JSON.stringify({ keep: sc285?.body?.keep, line: tokLine }),
  );
  rcMessages = [{ info: { modelID: "smoke-model", providerID: "smoke-provider" } }];
}

// 286 — keepTokens budget fallback: the messages read FAILS (rcMessagesError)
//       + the budget store carries keepTokens 42000 + the sandbox
//       opencode.jsonc pair (deviation 1: the model pair comes from the
//       SAME messages read — a failed read leaves no pair → CLEAN FAIL
//       before the keep resolution; the config pair lets the budget path
//       execute) → the body carries keep.tokens 42000 (budget) + the
//       COMPACT line `keep=12m tok=42000 budget`
{
  rcMessagesError = new Error("boom-rc-msgs");
  const CFGP286 = path.join(SANDBOX, "opencode.jsonc");
  rcSetStore((store) => { store.emergencyRecovery = true; store.model_budget = { default: 1 }; store.keepTokens = 42000; delete store.keepMessages; });
  writeFileSync(CFGP286, `{\n  "agent": { "compaction": { "model": "cfgprov/cfgmodel" } }\n}`, "utf8");
  const before286 = { s: rcCalls.summarize.length, p: rcCalls.prompt.length };
  await rcFireError("ses_rc_tokbud", rcOVF("context length exceeded"));
  rmSync(CFGP286, { force: true });
  const sc286 = rcCalls.summarize.at(-1);
  const budLine = ctxLogLines().find((l) => l.includes("COMPACT ses_rc_tokbud"));
  check(
    "286",
    "S11",
    "keepTokens budget fallback: messages read FAILS + budget store keepTokens 42000 + sandbox config pair → body keep.tokens 42000 (budget) + the COMPACT line `keep=12m tok=42000 budget`",
    sc286?.path?.id === "ses_rc_tokbud" && sc286?.body?.keep?.messages === 12 && sc286?.body?.keep?.tokens === 42000 &&
      sc286?.body?.providerID === "cfgprov" && sc286?.body?.modelID === "cfgmodel" &&
      budLine != null && new RegExp(`^${DT} cfgmodel COMPACT ses_rc_tokbud keep=12m tok=42000 budget$`).test(budLine),
    JSON.stringify({ keep: sc286?.body?.keep, line: budLine }),
  );
  rcMessagesError = null;
  rcSetStore((store) => { delete store.keepTokens; });
}

// ------------------------------------------------------------------ S12 ctx_gauge tool (4) — the loop-tool-batch part 2 (the approved design)
//
// The custom tool at .opencode/tools/ctx_gauge.ts (T2, the loop-tool-batch
// proposal part 2): the peek readout as a directly-fired tool. Imported
// DIRECT from the repo path (type-stripped, the same way the probe loads
// compact_memory.ts — the tool file MUST load that way). The tool wraps the
// ONE shared gauge core — the SAME module instance this probe imported at
// the top (the tool's relative import resolves to the same file), so the
// setDbPath steering below reaches the tool's reads. The tool is READ-ONLY:
// no fs writes, no plugin hooks, no sandbox log lines — the S5 tallies are
// unaffected.
const CG_TOOL_TS = path.join(REPO_ROOT, ".opencode", "tools", "ctx_gauge.ts");
let cgTool;
const dbPathBeforeS12 = getDbPath(); // the hook-restore capture (cf. check 39)

// 82 — the tool file imports (type-stripped, direct) and exposes the tool()
//      default export: description (non-empty string) + args carrying the
//      OPTIONAL sessionID (a zod schema: undefined parses, a non-string
//      rejects) + execute (async) + NO `name` field (the host names the
//      tool by FILENAME)
{
  const toolMod = await import(pathToFileURL(CG_TOOL_TS).href);
  cgTool = toolMod.default;
  const sch = cgTool?.args?.sessionID;
  check(
    "82",
    "S12",
    "tool file imports (type-stripped, direct) and exposes the tool() default export (description + optional sessionID arg + async execute, NO name field)",
    cgTool != null && typeof cgTool.description === "string" && cgTool.description.length > 0 &&
      JSON.stringify(Object.keys(cgTool.args ?? {})) === JSON.stringify(["sessionID"]) &&
      sch != null && typeof sch.safeParse === "function" && sch.safeParse(undefined).success === true && sch.safeParse(42).success === false &&
      typeof cgTool.execute === "function" && cgTool.execute.constructor.name === "AsyncFunction" &&
      !("name" in cgTool),
    JSON.stringify({ keys: Object.keys(cgTool ?? {}), desc: typeof cgTool?.description, schOk: sch?.safeParse?.(undefined)?.success, async: cgTool?.execute?.constructor?.name }),
  );
}

// 83 — execute against the FX_OK fixture (steered via setDbPath): the
//      NEWEST-SESSION default read is BYTE-EXACT (the same readout form the
//      S4/S7 sections pin on the core — the tool must not drift) AND the
//      sessionID arg is PASSED THROUGH (the per-session read of the older
//      fixture session ses_fx_old, window 120K)
{
  setDbPath(FX_OK);
  const def = await cgTool.execute({}, {});
  const per = await cgTool.execute({ sessionID: "ses_fx_old" }, {});
  check(
    "83",
    "S12",
    "execute on the fixture (setDbPath): default newest-session read BYTE-EXACT `SESSION=ses_fx_ok CTX=10000 (3%) REM=246000`; sessionID arg passed through (ses_fx_old → `SESSION=ses_fx_old CTX=10000 (8%) REM=110000`)",
    def === "SESSION=ses_fx_ok CTX=10000 (3%) REM=246000" && per === "SESSION=ses_fx_old CTX=10000 (8%) REM=110000",
    JSON.stringify({ def, per }),
  );
}

// 84 — the db-error path (setDbPath to the never-created MISSING_DB): NO
//      throw, the line is NEVER replaced — `SESSION=unknown CTX=notAvailable`
//      + the APPENDED ` — <error>` note (the in-band mirror of peek.mjs's
//      stderr addition; the core's own capped error text)
{
  setDbPath(MISSING_DB);
  let threw = false;
  let res = "";
  try {
    res = await cgTool.execute({}, {});
  } catch (e) {
    threw = true;
    res = String(e?.message ?? e);
  }
  check(
    "84",
    "S12",
    "db-error (missing db): no throw; the line is NOT replaced — `SESSION=unknown CTX=notAvailable` + the appended ` — <error>` note (in-band mirror of peek.mjs's stderr)",
    !threw && res.startsWith("SESSION=unknown CTX=notAvailable — ") && res.length > "SESSION=unknown CTX=notAvailable — ".length,
    JSON.stringify({ threw, res }),
  );
}

// 85 — hook restore (cf. check 39): the global db path is back where S12
//      found it (the plumbing intact) and a global read and an explicit-path
//      read of the SAME restored path agree byte-exact (S12 left no drift in
//      the core)
{
  setDbPath(dbPathBeforeS12);
  const g = await readGauge();
  const e = await readGauge(dbPathBeforeS12);
  check(
    "85",
    "S12",
    "hook restore: the global db path is back where S12 found it; global read == explicit-path read of the restored path (byte-exact, no drift)",
    getDbPath() === dbPathBeforeS12 && g.kind === e.kind && g.sid === e.sid && formatGauge(g) === formatGauge(e),
    JSON.stringify({ getDbPath: getDbPath(), before: dbPathBeforeS12, g: formatGauge(g), e: formatGauge(e) }),
  );
}

// ------------------------------------------------------------------ S13 compact_memory plugin tool (15) — the approved v2 proposal + the 2026-09-14 maintainer adaptation (explicit pair; SELF sync / CROSS dispatch)
//
// The plugin-registered compact_memory (the model_budget compaction budget —
// consolidated 2026-09-22 into the shared budget file; approved proposal
// .opencode/proposals/approved/2026-09-12_compact_memory_plugin.md, supersedes
// the v1 artifact pinned by S10): the plugin file is imported DIRECT
// (type-stripped) — NO hook fires, the S5 tallies are unaffected; ALL the
// tool's fs writes are steered into the sandbox via the tool context's
// directory=SANDBOX; the fake client records every session.summarize /
// session.compact / session.messages call. Fresh ses_qc_* ids (in the
// FINGERPRINT array, check 43). The budget store file is SHARED with S10/S11
// (the v2 reader is lenient; S13's version-2 writes happen after S10/S11's
// checks have run).
const QC_PLUGIN_TS = path.join(REPO_ROOT, ".opencode", "plugin", "compact_memory.ts");
const qcMod = await import(pathToFileURL(QC_PLUGIN_TS).href);
// The cap resolver (consolidation 2026-09-22): reads the model_budget map
// from the SHARED sandbox budget file (root = SANDBOX — every qcExec below
// steers the tool context's directory there too).
const qcResolveCap = (name) => qcMod.resolveCap(SANDBOX, name);
const QC_DIRECTIVE =
  "[SYSTEM CONTEXT DIRECTIVE]\nContext was compacted. Read .opencode\\agent\\prompts\\agent_readme_post_compaction.md and re-read any required task-specific files using read_file before continuing.";
const qcMakeClient = (spec = {}) => {
  const rec = { summarize: [], compact: [], messages: [], prompt: [] };
  const client = { session: {} };
  // The success value is the handler's real return: boolean `true` (the
  // server handler ends with `return true` — the 2026-09-12 bugfix verifies
  // the resolved result, so the mock must resolve `true`, not an ok flag).
  if (spec.compact) client.session.compact = (o) => { rec.compact.push(o); return Promise.resolve(true); };
  if (spec.summarize) client.session.summarize = (o) => {
    rec.summarize.push(o);
    if (spec.summarizeError != null) {
      const e = typeof spec.summarizeError === "function" ? spec.summarizeError(rec.summarize.length) : spec.summarizeError;
      if (e != null) return Promise.reject(e); // null = this call is clean (the retry)
    }
    return Promise.resolve(true);
  };
  if (spec.messages != null || spec.messagesError) client.session.messages = (o) => {
    rec.messages.push(o);
    if (spec.messagesError) return Promise.reject(spec.messagesError);
    return Promise.resolve(spec.messages);
  };
  if (spec.promptAsync) client.session.promptAsync = (o) => { rec.prompt.push(o); return Promise.resolve(true); };
  return { client, rec };
};
const qcCtx = (over = {}) => ({ sessionID: "ses_qc_self", directory: SANDBOX, extra: { model: { id: "Qwen3.8-27B-IQ4KT-120K", providerID: "llama-swap" } }, ...over });
const qcExec = async (spec, args, over) => {
  const { client, rec } = qcMakeClient(spec);
  const t = (await qcMod.default({ client })).tool.compact_memory;
  const res = await t.execute(args, qcCtx(over));
  return { rec, res };
};
const qcStore = () => JSON.parse(readFileSync(path.join(SANDBOX, ".opencode", "temp", "compact_budget.json"), "utf8"));
// Drains the event loop twice (macrotasks) — the CROSS fire-and-forget path
// verifies its call and lands the side effects (increment + COMPACT line) in
// a promise chain; the setImmediate ticks fire after that chain settles.
const qcTick = async () => {
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
};
// The pre-compaction dump hook (S14, TODO #152) fires on EVERY dispatch below
// (just before the client call). The stub dump script at the sandbox script
// path keeps the S13 dispatch responses BYTE-EXACT — a dump SUCCESS appends
// nothing to the response (a missing script would append a WARNING and break
// the byte-exact checks 87/90/97). S14 removes and re-places the stub to
// exercise the hook directly.
const QC_FAKE_DUMP = `// probe fake dump — mimics dump_session.cjs's __dirname OUT_DIR + --out
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const OUT_DIR = path.resolve(__dirname, "..", "..", "..", "archive", "sessions");
const argv = process.argv.slice(2);
let sid = null, rel = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--out") { rel = argv[++i]; }
  else if (!argv[i].startsWith("-")) { sid = argv[i]; }
}
if (!sid || rel == null) { console.error("fake-dump: need <sid> --out <rel>"); process.exit(2); }
const file = path.join(OUT_DIR, rel);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, "FAKE DUMP of " + sid + "\\n");
`;
const QC_DUMP_SCRIPT = path.join(SANDBOX, ".opencode", "agent", "scripts", "db", "dump_session.cjs");
mkdirSync(path.dirname(QC_DUMP_SCRIPT), { recursive: true });
writeFileSync(QC_DUMP_SCRIPT, QC_FAKE_DUMP, "utf8");

// 86 — the registration shape: the default factory (the plugin ctx capture)
//      returns tool.compact_memory — description + the 4 optional args
//      (sessionID/keepMessages/message/emergency — item 10) as zod schemas
//      + execute
{
  const { client } = qcMakeClient({ summarize: true });
  const reg = await qcMod.default({ client });
  const t = reg?.tool?.compact_memory;
  check(
    "86",
    "S13",
    "registration shape: default factory → tool.compact_memory (description + args [sessionID, keepMessages, message, emergency] as zod schemas + execute)",
    t != null && typeof t.description === "string" && typeof t.execute === "function" &&
      JSON.stringify(Object.keys(t.args)) === JSON.stringify(["sessionID", "keepMessages", "message", "emergency"]) &&
      Object.values(t.args).every((s) => s != null && typeof s.safeParse === "function"),
    JSON.stringify({ tools: Object.keys(reg?.tool ?? {}), args: Object.keys(t?.args ?? {}) }),
  );
}

// 87 — the cap fixtures (consolidation 2026-09-22): the caps are CONFIGURED
//      in the shared sandbox budget file's model_budget map (bare model id
//      → cap + the "default" key): exact key→5, the live model id
//      "Qwen3.8-27B-IQ4KT-120K"→3 (the configured value for that model ID),
//      CPU-…→0 (the SAFETY INVARIANT, never config-driven), unknown→1, typo
//      key→1 (a wrong key simply never matches)
{
  // seed the model_budget map into the shared budget file (merge — the
  // S10/S11 session entries survive)
  const seedStore = qcStore();
  seedStore.model_budget = { "Qwen3.8-27B-IQ4KT-120K": 3, "Qwen-IQ3-Test": 5, default: 1 };
  writeFileSync(path.join(SANDBOX, ".opencode", "temp", "compact_budget.json"), JSON.stringify(seedStore, null, 2) + "\n", "utf8");
  const caps = {
    exact: qcResolveCap("Qwen-IQ3-Test").cap,
    live: qcResolveCap("Qwen3.8-27B-IQ4KT-120K").cap,
    cpu: qcResolveCap("CPU-Qwen3-0.6B").cap,
    unknown: qcResolveCap("Mystery-7B").cap,
    typo: qcResolveCap("Qwen-IQ3-Test-typO").cap,
  };
  check(
    "87",
    "S13",
    "cap fixtures (model_budget map in the budget file): exact key→5, the live model id→3 (the configured value for that model ID), CPU-…→0 (the safety invariant), unknown→1, typo key→1 (never matches)",
    caps.exact === 5 && caps.live === 3 && caps.cpu === 0 && caps.unknown === 1 && caps.typo === 1,
    JSON.stringify(caps),
  );
}
// 88 — the summarize path (THE ACTIVE BUILD SHAPE, SELF dispatch): called
//      with path.id + body.keep WHEN GIVEN; the response (the message arg
//      ABSENT) is the dispatch line BYTE-EXACT — NO success claim; the
//      budget increment + the COMPACT line land ASYNCHRONOUSLY (the tick)
{
  const { rec, res } = await qcExec({ summarize: true }, { keepMessages: 7 });
  await qcTick();
  check(
    "88",
    "S13",
    "summarize path (the ACTIVE build shape, SELF dispatch): called with path.id + body.keep.messages (NO tokens key); the response is the dispatch line BYTE-EXACT; the budget increment lands after the tick",
    rec.summarize.length === 1 && rec.summarize[0]?.path?.id === "ses_qc_self" &&
      rec.summarize[0]?.body?.keep?.messages === 7 && rec.summarize[0]?.body?.keep?.tokens == null &&
      res === `Compaction dispatched for ses_qc_self (background, fire-and-forget) — the summarize call was sent (model: Qwen3.8-27B-IQ4KT-120K); the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success.` &&
      qcStore().sessions.ses_qc_self?.count === 1,
    JSON.stringify({ calls: rec.summarize, res: String(res).slice(0, 120) }),
  );
}

// 89 — the keep retry-once (cross dispatch): a 404/unexpected-field error on
//      the FIRST call → the call is retried ONCE WITHOUT the keep fields
//      (the 2nd body keeps providerID + modelID and drops the keep fields) —
//      the CROSS path is fire-and-forget, so the retry + the budget increment
//      are verified ASYNCHRONOUSLY after the tick; the response is the
//      dispatch line (NO "keep not accepted" — that note lands in the
//      terminal log)
{
  const boom = Object.assign(new Error("400 unexpected field"), { status: 404 });
  const { rec, res } = await qcExec({ summarize: true, summarizeError: (n) => (n === 1 ? boom : null) }, { keepMessages: 3, sessionID: "ses_qc_retry" });
  await qcTick();
  check(
    "89",
    "S13",
    "keep retry-once (cross dispatch): 404/unexpected-field → the 2nd call keeps providerID+modelID and drops the keep fields; the response is the dispatch line; the budget lands after the tick",
    rec.summarize.length === 2 && rec.summarize[0]?.body?.keep?.messages === 3 && rec.summarize[0]?.body?.keep?.tokens == null &&
      rec.summarize[1]?.body?.keep == null && rec.summarize[1]?.body?.providerID === "llama-swap" &&
      rec.summarize[1]?.body?.modelID === "Qwen3.8-27B-IQ4KT-120K" &&
      /dispatched/i.test(res) && qcStore().sessions.ses_qc_retry?.count === 1,
    JSON.stringify({ n: rec.summarize.length, res: String(res).slice(0, 160) }),
  );
}

// 90 — the compact flat path (the v2 client shape): compact present →
//      compact({sessionID}) with FLAT parameters, summarize NOT called
{
  const { rec, res } = await qcExec({ summarize: true, compact: true }, { keepMessages: 2, sessionID: "ses_qc_flat" });
  await qcTick();
  check(
    "90",
    "S13",
    "compact flat path (compact present): compact({sessionID}) FLAT, summarize NOT called; the response is the dispatch line BYTE-EXACT; the budget increment lands after the tick",
    rec.compact.length === 1 &&
      rec.compact[0]?.sessionID === "ses_qc_flat" &&
      !("path" in (rec.compact[0] ?? {})) &&
      rec.summarize.length === 0 &&
      qcStore().sessions.ses_qc_flat?.count === 1 &&
      res === `Compaction dispatched for ses_qc_flat (background, fire-and-forget) — the compact call was sent (model: Qwen3.8-27B-IQ4KT-120K); the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success.\ncross-session model read unavailable (no client.session.messages) — the calling session's model is used for the budget class`,
    JSON.stringify({ compact: rec.compact, res: String(res).slice(0, 120) }),
  );
}

// 91 — the no-client error: NEITHER probe is a function → a clear error
//      NAMING both probed methods + the typeof result (no silent fallback)
{
  const t = (await qcMod.default({})).tool.compact_memory;
  const res = await t.execute({}, qcCtx({ sessionID: "ses_qc_nocli" }));
  check(
    "91",
    "S13",
    "no-client error: names both probed methods (compact + summarize) + the typeof result, no compaction performed",
    /Compaction request failed/.test(res) && /compact/i.test(res) && /summarize/i.test(res) && /function/i.test(res),
    res,
  );
}

// 92 — the gate (configured cap 3 in the model_budget map, increment-on-
//      verified-success): count=cap−1 (the 3rd call) is DISPATCHED;
//      count=cap (the 4th) is DENIED naming class+cap+count with ZERO
//      side effects (no compact call, no increment, no line); the cross
//      increments land in the background chain (the tick drains it before
//      the 4th call sees count=cap)
{
  const { client, rec } = qcMakeClient({ summarize: true });
  const t = (await qcMod.default({ client })).tool.compact_memory;
  const run = async (args) => { const r = await t.execute(args, qcCtx({})); await qcTick(); return r; };
  await run({ keepMessages: 1, sessionID: "ses_qc_gate" });
  await run({ keepMessages: 1, sessionID: "ses_qc_gate" });
  const res3 = await run({ keepMessages: 1, sessionID: "ses_qc_gate" }); // count=cap−1 → dispatched
  const callsBefore4 = rec.summarize.length;
  const res4 = await t.execute({ keepMessages: 1, sessionID: "ses_qc_gate" }, qcCtx({})); // count=cap → denied
  const st = qcStore();
  check(
    "92",
    "S13",
    "gate (configured cap 3, cross dispatch): count=cap−1 dispatched (the 3rd); count=cap DENIED (the 4th) naming class+cap+count with ZERO side effects; the increments land only on the verified background success",
    /dispatched/i.test(res3) && rec.summarize.length === 3 && rec.summarize.length === callsBefore4 &&
      /refused/.test(res4) && res4.includes("cap 3") && res4.includes("3/3") &&
      st.sessions.ses_qc_gate?.count === 3,
    JSON.stringify({ calls: rec.summarize.length, res4: String(res4).slice(0, 160) }),
  );
}

// 93 — the CPU model is ALWAYS denied (the cap-0 ruling, cross read): refused
//      naming cap 0, zero side effects (no compact call, no store entry)
{
  const { rec, res } = await qcExec({ summarize: true, messages: [{ info: { modelID: "CPU-Qwen3-0.6B" } }] }, { sessionID: "ses_qc_cpu" });
  const st = qcStore();
  check(
    "93",
    "S13",
    "CPU model ALWAYS denied (cap 0, cross read): refused naming cap 0, zero side effects (no call, no store entry)",
    /refused/.test(res) && res.includes("cap 0") && rec.summarize.length === 0 && st.sessions.ses_qc_cpu == null,
    JSON.stringify({ res: String(res).slice(0, 160) }),
  );
}

// 94 — increment-on-verified-success ONLY (cross dispatch): a FAILING
//      summarize (a plain error, not a keep-rejection) → the dispatch
//      response (NO success claim — the outcome is verified asynchronously),
//      the budget is NOT consumed (no store entry after the tick; the
//      failure lands in the terminal log — "background compaction FAILED")
{
  const { rec, res } = await qcExec({ summarize: true, summarizeError: new Error("boom-qc") }, { keepMessages: 1, sessionID: "ses_qc_fail" });
  await qcTick();
  const st = qcStore();
  check(
    "94",
    "S13",
    "increment-on-verified-success only (cross dispatch): a failing summarize → the dispatch response (no success claim), NO increment after the tick",
    /dispatched/i.test(res) && rec.summarize.length === 1 && st.sessions.ses_qc_fail == null,
    JSON.stringify({ res: String(res).slice(0, 160) }),
  );
}

// 95 — the v2 store schema ON DISK: version 2 + the entry shape {count,
//      updated, model} with the model POPULATED (the resolved model id at the
//      last increment — the CAP lives in the file's top-level model_budget
//      map, resolved per call)
{
  const st = qcStore();
  const e = st.sessions.ses_qc_gate;
  check(
    "95",
    "S13",
    "v2 store schema on disk: version 2 + entry {count, updated, model} with the model POPULATED",
    st.version === 2 && e?.count === 3 && e?.model === "Qwen3.8-27B-IQ4KT-120K" && !Number.isNaN(Date.parse(e?.updated ?? "")),
    JSON.stringify({ version: st.version, e }),
  );
}

// 96 — the COMPACT line WITH the model field POPULATED (the sandbox ctx.log):
//      `<dt> Qwen3.8-27B-IQ4KT-120K COMPACT ses_qc_self keep=7m tok=- none`
{
  const line = ctxLogLines().find((l) => l.includes("COMPACT ses_qc_self"));
  check(
    "96",
    "S13",
    "COMPACT line WITH the model field populated (sandbox ctx.log): `<dt> Qwen3.8-27B-IQ4KT-120K COMPACT ses_qc_self keep=7m tok=- none`",
    line != null && new RegExp(`^${DT} Qwen3\\.8-27B-IQ4KT-120K COMPACT ses_qc_self keep=7m tok=- none$`).test(line),
    JSON.stringify(line),
  );
}

// 97 — the message response shape (cross dispatch, the message arg GIVEN,
//      unit A → item 2, 2026-09-24): the response is the dispatch line +
//      the queued note (the message itself is NOT in the response); NO
//      promptAsync at queue time (the maintainer's temp fix 0f192e5 stays
//      in place) — the message is STORED per-session under
//      .opencode/temp/ and is delivered at RESUME time by the auto-resume
//      unit-4 CONTINUE relay (empty prompt array at queue time —
//      unchanged)
{
  const { rec, res } = await qcExec({ summarize: true, messages: [{ info: { modelID: "IQ4-x", providerID: "llama-swap" } }], promptAsync: true }, { message: "resume unit-3", sessionID: "ses_qc_msg" });
  await qcTick();
  check(
    "97",
    "S13",
    "message (unit A → item 2): response = dispatch line + the queued note (byte-exact) + NO promptAsync at queue time (the message is STORED — delivered at RESUME time by the auto-resume relay)",
    res === `Compaction dispatched for ses_qc_msg (background, fire-and-forget) — the summarize call was sent (model: IQ4-x); the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success.\nThe message was queued for ses_qc_msg (delivered on its resume).` &&
      rec.prompt.length === 0,
    JSON.stringify({ res: String(res).slice(0, 160), prompt: rec.prompt }),
  );
}

// 98 — the cross-session model read (pair-less cross): the target's model is
//      NOT in context → session.messages({path:{id}}) → the LAST entry's
//      info.modelID (the assistant message) resolves the budget class + the
//      stored model; the dispatch verifies asynchronously (the tick)
{
  const { rec, res } = await qcExec({ summarize: true, messages: [{ info: { model: "user-x" } }, { info: { modelID: "Qwen3.8-27B-IQ3KT-210K", providerID: "llama-swap" } }] }, { keepMessages: 1, sessionID: "ses_qc_cross" });
  await qcTick();
  const st = qcStore();
  check(
    "98",
    "S13",
    "cross-session model read (pair-less cross): the LAST entry's info.modelID resolves the target's model (stored after the tick, count 1)",
    rec.messages[0]?.path?.id === "ses_qc_cross" && st.sessions.ses_qc_cross?.model === "Qwen3.8-27B-IQ3KT-210K" && st.sessions.ses_qc_cross?.count === 1 && /dispatched/i.test(res),
    JSON.stringify(st.sessions.ses_qc_cross),
  );
}

// 100 — REMOVED 2026-09-21 (unit A, priority.md #1): the explicit
//      providerID+modelID override is GONE from the args — the summarizer
//      resolves from the root config's agent.compaction.model (pinned in S25).

// 99 — the failing RPC: session.messages THROWS → NO throw, the request is NOT sent (no resolvable model pair — the server
//      requires both; a send would be a guaranteed schema rejection, the
//      2026-09-12 live no-op) + the note in the response, NO increment
{
  let threw = false;
  let res = "";
  let rec = null;
  try {
    const r = await qcExec({ summarize: true, messagesError: new Error("boom-rpc-qc") }, { keepMessages: 1, sessionID: "ses_qc_rpc" });
    res = r.res;
    rec = r.rec;
  } catch {
    threw = true;
  }
  const st = qcStore();
  check(
    "99",
    "S13",
    "failing RPC: NO throw, the request is NOT sent (no resolvable model) + the note in the response, NO increment",
    !threw && /no resolvable model/i.test(res) && /NOT sent/i.test(res) && /model read/.test(res) &&
      rec.summarize.length === 0 && st.sessions.ses_qc_rpc == null,
    String(res).slice(0, 160),
  );
}

// 222 — the EMERGENCY-1 gate sequence, part 1 (item 10, 2026-09-24): the
//      fixture model_budget { "Gate-M": 2 } + emergency_budget 1 — calls
//      1-2 DISPATCH (count 2 == cap); call 3 (no arg) is DENIED naming
//      class+cap+count + the `emergency`-arg availability note, with ZERO
//      side effects (no call, no increment). The cross read of the last
//      messages-RPC entry resolves the Gate-M model (cap 2).
{
  const stEmg = qcStore();
  stEmg.model_budget = { "Gate-M": 2, default: 1 };
  stEmg.emergency_budget = 1;
  writeFileSync(path.join(SANDBOX, ".opencode", "temp", "compact_budget.json"), JSON.stringify(stEmg, null, 2) + "\n", "utf8");
  const { client, rec } = qcMakeClient({ summarize: true, messages: [{ info: { modelID: "Gate-M", providerID: "llama-swap" } }] });
  const t = (await qcMod.default({ client })).tool.compact_memory;
  const run = async (args) => { const r = await t.execute(args, qcCtx({})); await qcTick(); return r; };
  const r1 = await run({ keepMessages: 2, sessionID: "ses_qc_emg" });
  const r2 = await run({ keepMessages: 2, sessionID: "ses_qc_emg" });
  const r3 = await run({ keepMessages: 2, sessionID: "ses_qc_emg" });
  const st = qcStore();
  check(
    "222",
    "S13",
    "emergency-1 gate part 1 (fixture {Gate-M: 2}, emergency_budget 1): calls 1-2 dispatched (count 2 == cap); call 3 (no arg) DENIED naming class+cap+count + the `emergency`-arg availability note, zero side effects",
    /dispatched/i.test(r1) && /dispatched/i.test(r2) && rec.summarize.length === 2 &&
      /refused/.test(r3) && r3.includes("cap 2") && r3.includes("2/2") && /hand over/i.test(r3) &&
      r3.includes("`emergency` argument") && st.sessions.ses_qc_emg?.count === 2,
    JSON.stringify({ r3: String(r3).slice(0, 220) }),
  );
}

// 223 — the EMERGENCY-1 gate sequence, part 2: at count == cap the
//      `emergency` arg DISPATCHES the once-per-session emergency (count →
//      cap+1 = 3); the COMPACT line carries the ` emergency` suffix; the
//      earlier NORMAL lines carry NO suffix
{
  const { client } = qcMakeClient({ summarize: true, messages: [{ info: { modelID: "Gate-M", providerID: "llama-swap" } }] });
  const t = (await qcMod.default({ client })).tool.compact_memory;
  const r3e = await t.execute({ keepMessages: 2, sessionID: "ses_qc_emg", emergency: true }, qcCtx({}));
  await qcTick();
  const st = qcStore();
  const lineEmg = ctxLogLines().find((l) => l.includes("COMPACT ses_qc_emg keep=2m tok=- none emergency"));
  const lineNorm = ctxLogLines().filter((l) => l.includes("COMPACT ses_qc_emg keep=2m tok=- none") && !l.includes(" emergency"));
  check(
    "223",
    "S13",
    "emergency-1: at count == cap the `emergency` arg dispatches the once-per-session emergency (count → cap+1 = 3); the COMPACT line carries ` emergency`; the normal lines carry NO suffix",
    /dispatched/i.test(r3e) && st.sessions.ses_qc_emg?.count === 3 && lineEmg != null &&
      new RegExp(`^${DT} Gate-M COMPACT ses_qc_emg keep=2m tok=- none emergency$`).test(lineEmg) &&
      lineNorm.length === 2 && lineNorm.every((l) => new RegExp(`^${DT} Gate-M COMPACT ses_qc_emg keep=2m tok=- none$`).test(l)),
    JSON.stringify({ lineEmg, lineNorm }),
  );
}

// 224 — the EMERGENCY-1 gate sequence, part 3: call 4 with the `emergency`
//      arg is DENIED (count 3 > cap 2 — FULLY exhausted, the item 11
//      directive state) and the state SURVIVES a fresh module instance
//      (cache-busted re-import — the count lives on disk, not in module
//      memory): the re-imported tool still refuses
{
  const { client } = qcMakeClient({ summarize: true, messages: [{ info: { modelID: "Gate-M", providerID: "llama-swap" } }] });
  const t = (await qcMod.default({ client })).tool.compact_memory;
  const r4 = await t.execute({ keepMessages: 2, sessionID: "ses_qc_emg", emergency: true }, qcCtx({}));
  await qcTick();
  const st = qcStore();
  const freshMod = await import(pathToFileURL(QC_PLUGIN_TS).href + "?qc_emg_reimport=1");
  const freshT = (await freshMod.default({ client })).tool.compact_memory;
  const rFresh = await freshT.execute({ keepMessages: 2, sessionID: "ses_qc_emg", emergency: true }, qcCtx({}));
  check(
    "224",
    "S13",
    "emergency-1: call 4 with `emergency` DENIED (count 3 > cap 2 — fully exhausted); the state survives a FRESH module instance (cache-busted re-import still refuses)",
    /refused/.test(r4) && r4.includes("cap 2") && r4.includes("3/2") && /fully exhausted/i.test(r4) && st.sessions.ses_qc_emg?.count === 3 &&
      /refused/.test(rFresh) && /fully exhausted/i.test(rFresh),
    JSON.stringify({ r4: String(r4).slice(0, 220), rFresh: String(rFresh).slice(0, 220) }),
  );
}

// 225 — emergency_budget 0: the emergency is NOT available — at count == cap
//      the `emergency` arg is DENIED (a fresh session is drained to the cap
//      first)
{
  const stE0 = qcStore();
  stE0.emergency_budget = 0;
  writeFileSync(path.join(SANDBOX, ".opencode", "temp", "compact_budget.json"), JSON.stringify(stE0, null, 2) + "\n", "utf8");
  const { client } = qcMakeClient({ summarize: true, messages: [{ info: { modelID: "Gate-M", providerID: "llama-swap" } }] });
  const t = (await qcMod.default({ client })).tool.compact_memory;
  const run = async (args) => { const r = await t.execute(args, qcCtx({})); await qcTick(); return r; };
  const a1 = await run({ keepMessages: 1, sessionID: "ses_qc_emg0" });
  const a2 = await run({ keepMessages: 1, sessionID: "ses_qc_emg0" });
  const r0 = await run({ keepMessages: 1, sessionID: "ses_qc_emg0", emergency: true });
  const st = qcStore();
  check(
    "225",
    "S13",
    "emergency_budget 0: at count == cap the `emergency` arg is DENIED (no emergency available — the unavailable/consumed note)",
    /dispatched/i.test(a1) && /dispatched/i.test(a2) &&
      /refused/.test(r0) && r0.includes("cap 2") && r0.includes("2/2") && /hand over/i.test(r0) &&
      /unavailable or already consumed/i.test(r0) && st.sessions.ses_qc_emg0?.count === 2,
    JSON.stringify({ r0: String(r0).slice(0, 220) }),
  );
}

// 226 — the emergency_budget key ABSENT: the fail-open default 1 applies —
//      at count == cap the `emergency` arg DISPATCHES (a fresh session is
//      drained to the cap first), count → cap+1, the COMPACT line carries
//      ` emergency`
{
  const stEd = qcStore();
  delete stEd.emergency_budget;
  writeFileSync(path.join(SANDBOX, ".opencode", "temp", "compact_budget.json"), JSON.stringify(stEd, null, 2) + "\n", "utf8");
  const { client } = qcMakeClient({ summarize: true, messages: [{ info: { modelID: "Gate-M", providerID: "llama-swap" } }] });
  const t = (await qcMod.default({ client })).tool.compact_memory;
  const run = async (args) => { const r = await t.execute(args, qcCtx({})); await qcTick(); return r; };
  await run({ keepMessages: 1, sessionID: "ses_qc_emgdf" });
  await run({ keepMessages: 1, sessionID: "ses_qc_emgdf" });
  const rD = await run({ keepMessages: 1, sessionID: "ses_qc_emgdf", emergency: true });
  const st = qcStore();
  const lineD = ctxLogLines().find((l) => l.includes("COMPACT ses_qc_emgdf keep=1m tok=- none emergency"));
  check(
    "226",
    "S13",
    "emergency_budget key ABSENT → fail-open default 1: at count == cap the `emergency` arg dispatches (count → cap+1), the COMPACT line carries ` emergency`",
    /dispatched/i.test(rD) && st.sessions.ses_qc_emgdf?.count === 3 && lineD != null &&
      new RegExp(`^${DT} Gate-M COMPACT ses_qc_emgdf keep=1m tok=- none emergency$`).test(lineD),
    JSON.stringify({ rD: String(rD).slice(0, 120), lineD }),
  );
}

// 287 — keepTokens computed (S13 tool path): the fake client's messages
//       return token data (wrapper shape, last 2) → the summarize body
//       carries keep.tokens 4500 (computed) + the COMPACT line
//       `keep=2m tok=4500 computed` (model field `QC-TokModel` — unlisted,
//       cap 1, fresh session)
{
  const { rec, res } = await qcExec(
    { summarize: true, messages: { data: [
      { info: { role: "user", tokens: { input: 1200 } } },
      { info: { modelID: "QC-TokModel", providerID: "llama-swap", role: "assistant", tokens: { output: 2500, reasoning: 800 } } },
    ] } },
    { keepMessages: 2, sessionID: "ses_qc_tokcomp" },
  );
  await qcTick();
  const st287 = qcStore();
  const tokLine287 = ctxLogLines().find((l) => l.includes("COMPACT ses_qc_tokcomp"));
  check(
    "287",
    "S13",
    "keepTokens computed (tool path): messages return token data (wrapper shape, last 2) → body keep.tokens 4500 (computed) + the COMPACT line `keep=2m tok=4500 computed`",
    rec.summarize.length === 1 && rec.summarize[0]?.body?.keep?.messages === 2 && rec.summarize[0]?.body?.keep?.tokens === 4500 &&
      rec.summarize[0]?.body?.modelID === "QC-TokModel" &&
      st287.sessions.ses_qc_tokcomp?.count === 1 &&
      tokLine287 != null && new RegExp(`^${DT} QC-TokModel COMPACT ses_qc_tokcomp keep=2m tok=4500 computed$`).test(tokLine287),
    JSON.stringify({ keep: rec.summarize[0]?.body?.keep, line: tokLine287 }),
  );
}

// 288 — keepTokens budget fallback (S13 tool path): the messages read
//       FAILS + the budget store carries keepTokens 30000 + the model_budget
//       map is restored to { Qwen3.8-27B-IQ4KT-120K: 3, default: 1 } (cap 3
//       — after checks 222-226 the live model is UNLISTED cap 1 and
//       ses_qc_self already has count 1 → a SELF compaction would be DENIED
//       at cap 1) → the body carries keep.tokens 30000 (budget) + the
//       COMPACT line `keep=4m tok=30000 budget` (model field
//       `Qwen3.8-27B-IQ4KT-120K`)
{
  const st288 = qcStore();
  st288.keepTokens = 30000;
  st288.model_budget = { "Qwen3.8-27B-IQ4KT-120K": 3, default: 1 };
  writeFileSync(path.join(SANDBOX, ".opencode", "temp", "compact_budget.json"), JSON.stringify(st288, null, 2) + "\n", "utf8");
  const { rec, res } = await qcExec({ summarize: true, messagesError: new Error("boom-qc-msgs") }, { keepMessages: 4 });
  await qcTick();
  const st288b = qcStore();
  const budLine288 = ctxLogLines().find((l) => l.includes("COMPACT ses_qc_self") && l.includes("keep=4m tok=30000 budget"));
  check(
    "288",
    "S13",
    "keepTokens budget fallback (tool path): messages read FAILS + store keepTokens 30000 + model_budget cap 3 → body keep.tokens 30000 (budget) + the COMPACT line `keep=4m tok=30000 budget`",
    rec.summarize.length === 1 && rec.summarize[0]?.body?.keep?.messages === 4 && rec.summarize[0]?.body?.keep?.tokens === 30000 &&
      st288b.sessions.ses_qc_self?.count === 2 &&
      budLine288 != null && new RegExp(`^${DT} Qwen3\\.8-27B-IQ4KT-120K COMPACT ses_qc_self keep=4m tok=30000 budget$`).test(budLine288),
    JSON.stringify({ keep: rec.summarize[0]?.body?.keep, line: budLine288 }),
  );
  delete st288b.keepTokens;
  writeFileSync(path.join(SANDBOX, ".opencode", "temp", "compact_budget.json"), JSON.stringify(st288b, null, 2) + "\n", "utf8");
}

// ------------------------------------------------------------------ S14 compact_memory pre-compaction dump hook (7) — TODO #152 (approved 2026-09-15): the no-overwrite corpus dump before ANY dispatch
//
// Reuses S13's type-stripped plugin import (qcMod — the SAME import
// mechanism, a fresh module instance of the real plugin file). The hook is
// driven DIRECT (not via the tool path): preCompactionDump steers ALL its fs
// writes through its root parameter (here SANDBOX — the dump script is FAKE,
// the repo corpus is NEVER touched).
let s14File1 = null;
let s14Body1 = null;

// 101 — preCompactionDumpName BYTE-EXACT, the normal case (stamp = null):
//      compaction_dumps/<sid>_c<count>.md
{
  check(
    "101",
    "S14",
    "preCompactionDumpName byte-exact (normal, stamp null): compaction_dumps/<sid>_c<count>.md (count 0 and 7)",
    qcMod.preCompactionDumpName("ses_pc_name", 0, null) === "compaction_dumps/ses_pc_name_c0.md" &&
      qcMod.preCompactionDumpName("ses_pc_name", 7, null) === "compaction_dumps/ses_pc_name_c7.md",
    JSON.stringify([qcMod.preCompactionDumpName("ses_pc_name", 0, null), qcMod.preCompactionDumpName("ses_pc_name", 7, null)]),
  );
}

// 102 — preCompactionDumpName BYTE-EXACT, the stamped fallback: the stamp is
//      a CALLER-supplied string (NO clock inside the function — byte-exact
//      pinning is possible)
{
  check(
    "102",
    "S14",
    "preCompactionDumpName byte-exact (stamp supplied): compaction_dumps/<sid>_c<count>_<stamp>.md",
    qcMod.preCompactionDumpName("ses_pc_name", 3, "20260915T131530") === "compaction_dumps/ses_pc_name_c3_20260915T131530.md",
    JSON.stringify(qcMod.preCompactionDumpName("ses_pc_name", 3, "20260915T131530")),
  );
}

// 103 — the exported hook: preCompactionDump is a function
{
  check(
    "103",
    "S14",
    "preCompactionDump is a function (the exported hook the probe drives directly)",
    typeof qcMod.preCompactionDump === "function",
    String(typeof qcMod.preCompactionDump),
  );
}

// 104 — the no-script case: the S13 stub is REMOVED from the sandbox script
//      path → the hook must NOT throw, returns { ok:false, error }, and
//      appends a DUMP-RETRY= line (#78: the ONE retry) + a DUMP-FAIL line
//      carrying the captured stderr to the sandbox ctx.log (best-effort
//      logging) — RE-PINNED 2026-09-23 (#78: the retry is part of the
//      failure shape now)
{
  rmSync(QC_DUMP_SCRIPT, { force: true });
  let r = null;
  let threw = false;
  try {
    r = qcMod.preCompactionDump(SANDBOX, "ses_pc_noscript", 0);
  } catch {
    threw = true;
  }
  const ctxLog = readFileSync(path.join(SANDBOX, ".opencode", "temp", "ctx.log"), "utf8");
  check(
    "104",
    "S14",
    "sandbox root WITHOUT the script → NO throw, {ok:false} with an error, a DUMP-RETRY= line (the #78 one-retry) + a DUMP-FAIL line (the captured stderr detail) appended to the sandbox ctx.log",
    !threw && r != null && r.ok === false && r.error != null && /DUMP-RETRY=1 ses_pc_noscript/.test(ctxLog) && /DUMP-FAIL ses_pc_noscript/.test(ctxLog),
    JSON.stringify({ threw, r, retryTail: ctxLog.split("\n").filter((l) => l.includes("DUMP-RETRY")).slice(-1), dumpFailTail: ctxLog.split("\n").filter((l) => l.includes("DUMP-FAIL")).slice(-1) }),
  );
}

// 105 — the FAKE dump script (mimicking the real one's __dirname-derived
//      OUT_DIR + --out handling) is placed at the sandbox script path →
//      hook call #1 (count 0): { ok:true } + compaction_dumps/ses_pc_ok_c0.md
//      created WITH the marker content
{
  writeFileSync(QC_DUMP_SCRIPT, QC_FAKE_DUMP, "utf8");
  const r1 = qcMod.preCompactionDump(SANDBOX, "ses_pc_ok", 0);
  s14File1 = path.join(SANDBOX, ".opencode", "archive", "sessions", "compaction_dumps", "ses_pc_ok_c0.md");
  s14Body1 = existsSync(r1?.file ?? "") ? readFileSync(r1.file, "utf8") : null;
  check(
    "105",
    "S14",
    "FAKE script in place: hook call #1 (count 0) → {ok:true} + compaction_dumps/ses_pc_ok_c0.md created with the marker content",
    r1.ok === true && r1.file === s14File1 && existsSync(s14File1) && s14Body1 === "FAKE DUMP of ses_pc_ok\n",
    JSON.stringify({ r1, expected: s14File1, body1: s14Body1 }),
  );
}

// 106 — hook call #2 (SAME count 0): the base name EXISTS on disk now → the
//      name is STAMPED → the hook creates a DIFFERENT file,
//      ses_pc_ok_c0_<YYYYMMDDTHHmmss>.md
{
  const r2 = qcMod.preCompactionDump(SANDBOX, "ses_pc_ok", 0);
  const stampRe = /^ses_pc_ok_c0_\d{8}T\d{6}\.md$/;
  check(
    "106",
    "S14",
    "hook call #2 (same count 0): base name exists → the STAMPED name ses_pc_ok_c0_<YYYYMMDDTHHmmss>.md is created (a different file)",
    r2.ok === true && r2.file != null && r2.file !== s14File1 && stampRe.test(path.basename(r2.file)) && existsSync(r2.file),
    JSON.stringify({ r2, base: s14File1 }),
  );
}

// 107 — the NO-OVERWRITE proof: file #1 (ses_pc_ok_c0.md) is BYTE-IDENTICAL
//      after the stamped call #2 — one dump never overwrites another
{
  const body1Now = existsSync(s14File1) ? readFileSync(s14File1, "utf8") : null;
  check(
    "107",
    "S14",
    "no-overwrite proof: file #1 (ses_pc_ok_c0.md) is BYTE-IDENTICAL after the stamped call #2",
    body1Now !== null && body1Now === s14Body1 && s14Body1 === "FAKE DUMP of ses_pc_ok\n",
    JSON.stringify({ now: body1Now, before: s14Body1 }),
  );
}

// ------------------------------------------------------------------ S15 block_transfer tool (12) — the #60 probe pin (part 1 of 2): the named-clipboard block mover
//
// The custom tool at .opencode/tools/block_transfer.ts (post-#57: the MOVE
// dstFile requirement is hoisted PRE-WRITE): imported DIRECT from the repo
// path (type-stripped, the S12/S13 load pattern — the tool file MUST load
// that way). The module keeps its in-memory `clipboardBuffers` — ONE loaded
// instance is driven across the section (the buffer-lifecycle checks build
// on each other's state, as a real session does). All fs writes are steered
// into the sandbox (context.directory=SANDBOX — the sandbox is inside TEMP,
// which the tool's own sandbox check allows); the one deliberate outside
// path (check 10.13) is rejected BEFORE any fs access. Plain tool() object:
// no plugin hooks, no sandbox plugin.log lines — the S5 tallies are
// unaffected.
const BT_TOOL_TS = path.join(REPO_ROOT, ".opencode", "tools", "block_transfer.ts");
const BT_CTX = { directory: SANDBOX };
const BT_DIR = path.join(SANDBOX, "bt");
mkdirSync(BT_DIR, { recursive: true });
const btWrite = (name, body) => {
  const p = path.join(BT_DIR, name);
  writeFileSync(p, body);
  return p;
};
let btTool;

// 108 — the tool file imports (type-stripped, direct) and exposes the tool()
//      default export: description (non-empty string) + the 9 args IN ORDER
//      (mode = the 8-value enum; srcFile/dstFile/bufferName OPTIONAL strings;
//      startMarker/endMarker/targetMarker OPTIONAL marker-string-or-integer
//      refs — Part B poka-yoke: 42 is a LINE NUMBER (accepted), 2.5 rejected;
//      refs = OPTIONAL array of marker-or-number refs + text = OPTIONAL
//      string — Part C) + async execute + NO `name` field (the host names
//      the tool by FILENAME)
//      [re-pinned 2026-09-26 per block_transfer v2 S2 (Parts B+C): the args
//      list gains refs+text, the marker args carry the string|integer union,
//      the mode enum gains APPEND]
{
  const toolMod = await import(pathToFileURL(BT_TOOL_TS).href);
  btTool = toolMod.default;
  const argKeys = Object.keys(btTool?.args ?? {});
  const modeSch = btTool?.args?.mode;
  const optionalStr = (k) => {
    const s = btTool?.args?.[k];
    return s != null && typeof s.safeParse === "function" && s.safeParse(undefined).success === true && s.safeParse(42).success === false;
  };
  const optionalRef = (k) => {
    const s = btTool?.args?.[k];
    return s != null && typeof s.safeParse === "function" &&
      s.safeParse(undefined).success === true &&
      s.safeParse("AAA").success === true &&
      s.safeParse(42).success === true &&
      s.safeParse(2.5).success === false;
  };
  const refsSch = btTool?.args?.refs;
  const textSch = btTool?.args?.text;
  check(
    "108",
    "S15",
    "tool file imports (type-stripped, direct) and exposes the tool() default export (description + args [mode, srcFile, dstFile, startMarker, endMarker, targetMarker, refs, text, bufferName] + async execute, NO name field)",
    btTool != null && typeof btTool.description === "string" && btTool.description.length > 0 &&
      JSON.stringify(argKeys) === JSON.stringify(["mode", "srcFile", "dstFile", "startMarker", "endMarker", "targetMarker", "refs", "text", "bufferName"]) &&
      modeSch != null && typeof modeSch.safeParse === "function" &&
      modeSch.safeParse(undefined).success === false &&
      ["MOVE", "COPY", "APPEND", "CUT", "PASTE", "REPLACE", "DELETE", "CLEAR"].every((v) => modeSch.safeParse(v).success === true) &&
      modeSch.safeParse("move").success === false && modeSch.safeParse("MOVE ").success === false && modeSch.safeParse("BOGUS").success === false &&
      ["srcFile", "dstFile", "bufferName"].every(optionalStr) &&
      ["startMarker", "endMarker", "targetMarker"].every(optionalRef) &&
      refsSch != null && typeof refsSch.safeParse === "function" &&
      refsSch.safeParse(undefined).success === true &&
      refsSch.safeParse([1, "BT-START"]).success === true &&
      refsSch.safeParse([1.5]).success === false &&
      textSch != null && typeof textSch.safeParse === "function" &&
      textSch.safeParse(undefined).success === true && textSch.safeParse("x").success === true &&
      typeof btTool.execute === "function" && btTool.execute.constructor.name === "AsyncFunction" &&
      !("name" in btTool),
    JSON.stringify({ keys: argKeys, mode: ["MOVE", "move", "MOVE ", "BOGUS"].map((v) => modeSch?.safeParse?.(v)?.success), async: btTool?.execute?.constructor?.name, nameIn: "name" in (btTool ?? {}) }),
  );
}

// 109 — COPY: the anchor span is INCLUSIVE (the start line through the end
//      line) and the source is UNTOUCHED: the byte-exact Part F feedback
//      line (re-pinned 2026-09-26 per block_transfer v2 S2 — the resolved
//      range + the truncated first-line echo + the buffer count AFTER the
//      op; the S3 feedback redesign completes the other modes) + the
//      source file byte-identical after the call
{
  const src = btWrite("bt1.txt", "alpha\nBT-START block\nline-2\nline-3\nBT-END block\nomega");
  const before = readFileSync(src, "utf8");
  const res = await btTool.execute(
    { mode: "COPY", srcFile: "bt/bt1.txt", startMarker: "BT-START", endMarker: "BT-END", bufferName: "bt1" },
    BT_CTX,
  );
  check(
    "109",
    "S15",
    "COPY: the inclusive anchor span (BT-START..BT-END = 4 lines) + byte-exact Part F feedback `Copied 4 lines from 'bt/bt1.txt' into buffer 'bt1' (lines 2..5, first: 'BT-START block') - buffer: 4 lines.` + source byte-identical",
    res === "Copied 4 lines from 'bt/bt1.txt' into buffer 'bt1' (lines 2..5, first: 'BT-START block') - buffer: 4 lines." && readFileSync(src, "utf8") === before,
    JSON.stringify({ res, changed: readFileSync(src, "utf8") !== before }),
  );
}

// 10.10 — PASTE (the round-trip, fresh dst, targetMarker omitted → EOF
//      append): the byte-exact `Pasted 4 lines` return + the dst carries the
//      inclusive 4-line block BYTE-EXACT
{
  const res = await btTool.execute({ mode: "PASTE", dstFile: "bt/bt1-dst-eof.txt", bufferName: "bt1" }, BT_CTX);
  const dst = path.join(BT_DIR, "bt1-dst-eof.txt");
  const body = existsSync(dst) ? readFileSync(dst, "utf8") : null;
  check(
    "110",
    "S15",
    "PASTE round-trip (fresh dst, EOF): byte-exact return + dst content = the inclusive block byte-exact (`BT-START block`..`BT-END block`)",
    res === "Pasted 4 lines from buffer 'bt1' into 'bt/bt1-dst-eof.txt'." &&
      body === "BT-START block\nline-2\nline-3\nBT-END block",
    JSON.stringify({ res, body }),
  );
}

// 10.11 — PASTE with a targetMarker (an EXISTING dst): the block is inserted
//      RIGHT AFTER the target line — the insertion point vs the EOF append of
//      check 10.10: byte-exact resulting file + byte-exact return
{
  btWrite("bt1-dst-t.txt", "head\nBT-TARGET line\ntail");
  const res = await btTool.execute(
    { mode: "PASTE", dstFile: "bt/bt1-dst-t.txt", targetMarker: "BT-TARGET", bufferName: "bt1" },
    BT_CTX,
  );
  const body = readFileSync(path.join(BT_DIR, "bt1-dst-t.txt"), "utf8");
  check(
    "111",
    "S15",
    "PASTE with targetMarker: the block lands RIGHT AFTER the target line (not at EOF) — byte-exact file + byte-exact return",
    res === "Pasted 4 lines from buffer 'bt1' into 'bt/bt1-dst-t.txt'." &&
      body === "head\nBT-TARGET line\nBT-START block\nline-2\nline-3\nBT-END block\ntail",
    JSON.stringify({ res, body }),
  );
}

// 10.12 — the #57 post-fix pin: MOVE with a MISSING dstFile → the exact byte
//      string `Error: 'dstFile' is required for MOVE mode.` WITH THE SOURCE
//      FILE UNTOUCHED (the check is hoisted pre-write — no partial cut)
{
  const src = btWrite("bt-move-nodst.txt", "x1\nBTM-START block\nx2\nBTM-END block\nx3");
  const before = readFileSync(src, "utf8");
  const res = await btTool.execute(
    { mode: "MOVE", srcFile: "bt/bt-move-nodst.txt", startMarker: "BTM-START", endMarker: "BTM-END" },
    BT_CTX,
  );
  check(
    "112",
    "S15",
    "#57 pin: MOVE without dstFile → byte-exact `Error: 'dstFile' is required for MOVE mode.` + source byte-identical (the guard is hoisted pre-write)",
    res === "Error: 'dstFile' is required for MOVE mode." && readFileSync(src, "utf8") === before,
    JSON.stringify({ res, changed: readFileSync(src, "utf8") !== before }),
  );
}

// 10.13 — the sandbox guard: MOVE with a dst OUTSIDE cwd+TEMP is rejected
//      BEFORE any fs access (the pre-write guard): the byte-exact
//      `Error: '<path>' is outside the sandbox (allowed: <roots>)` + the
//      source byte-identical + the outside file never created
{
  const src = btWrite("bt-sandbox-src.txt", "s1\nBTE-START block\ns2\nBTE-END block\ns3");
  const before = readFileSync(src, "utf8");
  const OUTSIDE = path.join(path.dirname(os.tmpdir()), "bt_outside_probe.txt");
  const roots = [SANDBOX, process.env.TEMP ?? process.env.TMP].filter((r) => typeof r === "string" && r.length > 0);
  const res = await btTool.execute(
    { mode: "MOVE", srcFile: "bt/bt-sandbox-src.txt", startMarker: "BTE-START", endMarker: "BTE-END", dstFile: OUTSIDE },
    BT_CTX,
  );
  check(
    "113",
    "S15",
    "sandbox rejection: MOVE with an outside dst → byte-exact `Error: '<path>' is outside the sandbox (allowed: <roots>)` BEFORE any fs access (source byte-identical, outside file absent)",
    res === `Error: '${OUTSIDE}' is outside the sandbox (allowed: ${roots.join(", ")})` &&
      readFileSync(src, "utf8") === before && !existsSync(OUTSIDE),
    JSON.stringify({ res, outsideExists: existsSync(OUTSIDE) }),
  );
}

// 10.14 — anchor errors, the missing start marker: COPY with a startMarker
//      absent from the file → the byte-exact error naming the marker + the
//      file
{
  btWrite("bt-err.txt", "p1\nZZ-END before\np3\nYY-START after\np5");
  const res = await btTool.execute(
    { mode: "COPY", srcFile: "bt/bt-err.txt", startMarker: "NOPE-MISSING", endMarker: "ZZ-END", bufferName: "bt-err" },
    BT_CTX,
  );
  check(
    "114",
    "S15",
    "missing start marker → byte-exact `Error: Start marker 'NOPE-MISSING' not found in bt/bt-err.txt.`",
    res === "Error: Start marker 'NOPE-MISSING' not found in bt/bt-err.txt.",
    JSON.stringify({ res }),
  );
}

// 10.15 — anchor errors, the end-after-start rule: the endMarker EXISTS in
//      the file but ONLY before the startMarker → the byte-exact
//      `... not found after start marker.` error (the end search starts at
//      the start line)
{
  const res = await btTool.execute(
    { mode: "COPY", srcFile: "bt/bt-err.txt", startMarker: "YY-START", endMarker: "ZZ-END", bufferName: "bt-err" },
    BT_CTX,
  );
  check(
    "115",
    "S15",
    "end marker present ONLY before the start → byte-exact `Error: End marker 'ZZ-END' not found after start marker.` (the end search starts at the start line)",
    res === "Error: End marker 'ZZ-END' not found after start marker.",
    JSON.stringify({ res }),
  );
}

// 10.16 — the buffer lifecycle end: CLEAR returns the byte-exact
//      `Clipboard buffer 'bt1' cleared.` and a subsequent PASTE of the SAME
//      (now empty) buffer → the byte-exact empty-buffer error (no file
//      written)
{
  const r1 = await btTool.execute({ mode: "CLEAR", bufferName: "bt1" }, BT_CTX);
  const r2 = await btTool.execute({ mode: "PASTE", dstFile: "bt/bt1-dst-cleared.txt", bufferName: "bt1" }, BT_CTX);
  const created = existsSync(path.join(BT_DIR, "bt1-dst-cleared.txt"));
  check(
    "116",
    "S15",
    "buffer lifecycle end: byte-exact CLEAR return + PASTE of the cleared buffer → byte-exact empty-buffer error (no file written)",
    r1 === "Clipboard buffer 'bt1' cleared." &&
      r2 === "Error: Clipboard buffer 'bt1' is empty. Perform a COPY or CUT first." && !created,
    JSON.stringify({ r1, r2, created }),
  );
}

// 10.17 — MOVE (the full success path): the block is CUT from the source
//      (byte-exact remainder) and inserted into a fresh dst at EOF
//      (targetMarker omitted) with the byte-exact `Moved 3 lines` return
{
  btWrite("bt-move.txt", "m1\nBTMV-START block\nm2\nBTMV-END block\nm3");
  const res = await btTool.execute(
    { mode: "MOVE", srcFile: "bt/bt-move.txt", startMarker: "BTMV-START", endMarker: "BTMV-END", dstFile: "bt/bt-move-dst.txt" },
    BT_CTX,
  );
  const srcBody = readFileSync(path.join(BT_DIR, "bt-move.txt"), "utf8");
  const dstBody = readFileSync(path.join(BT_DIR, "bt-move-dst.txt"), "utf8");
  check(
    "117",
    "S15",
    "MOVE success: byte-exact `Moved 3 lines from 'bt/bt-move.txt' to 'bt/bt-move-dst.txt'` + source cut to `m1`+`m3` + dst = the inclusive block",
    res === "Moved 3 lines from 'bt/bt-move.txt' to 'bt/bt-move-dst.txt'." &&
      srcBody === "m1\nm3" && dstBody === "BTMV-START block\nm2\nBTMV-END block",
    JSON.stringify({ res, srcBody, dstBody }),
  );
}

// 262 — TODO #94: REPLACE (the happy path): the line-anchored span of an
//      EXISTING dst is replaced IN PLACE by the named buffer's content —
//      byte-exact dst + byte-exact `REPLACED` report + the buffer PRESERVED
//      (a later PASTE of the same buffer still reports its 2 lines). Fresh
//      buffer `bt-rep` — the `bt1` buffer was CLEARED at check 116.
{
  const dst = btWrite("bt-rep.txt", "head\nREP-A old one\nREP-B old two\ntail");
  btWrite("bt-rep-src.txt", "RS-A new one\nRS-B new two");
  await btTool.execute(
    { mode: "COPY", srcFile: "bt/bt-rep-src.txt", startMarker: "RS-A", endMarker: "RS-B", bufferName: "bt-rep" },
    BT_CTX,
  );
  const res = await btTool.execute(
    { mode: "REPLACE", dstFile: "bt/bt-rep.txt", startMarker: "REP-A", endMarker: "REP-B", bufferName: "bt-rep" },
    BT_CTX,
  );
  const body = readFileSync(dst, "utf8");
  const rPreserve = await btTool.execute({ mode: "PASTE", dstFile: "bt/bt-rep-preserve.txt", bufferName: "bt-rep" }, BT_CTX);
  check(
    "262",
    "S15",
    "REPLACE happy path: the span (REP-A..REP-B inclusive) of the existing dst is replaced by the buffer — byte-exact dst + byte-exact `REPLACED lines 2..3 (2 lines) in 'bt/bt-rep.txt' with buffer 'bt-rep' (2 lines).` + the buffer PRESERVED (the later PASTE reports its 2 lines)",
    res === "REPLACED lines 2..3 (2 lines) in 'bt/bt-rep.txt' with buffer 'bt-rep' (2 lines)." &&
      body === "head\nRS-A new one\nRS-B new two\ntail" &&
      rPreserve === "Pasted 2 lines from buffer 'bt-rep' into 'bt/bt-rep-preserve.txt'.",
    JSON.stringify({ res, body, rPreserve }),
  );
}

// 263 — TODO #94: REPLACE (the non-unique anchor): the startMarker matches
//      MORE THAN ONE line → the byte-exact non-unique error + the dst
//      byte-identical (no write)
{
  const dst = btWrite("bt-rep-nq.txt", "head\nDUP-A line one\nDUP-B line two\ntail");
  const before = readFileSync(dst, "utf8");
  const res = await btTool.execute(
    { mode: "REPLACE", dstFile: "bt/bt-rep-nq.txt", startMarker: "DUP", endMarker: "DUP-B", bufferName: "bt-rep" },
    BT_CTX,
  );
  check(
    "263",
    "S15",
    "REPLACE non-unique start anchor: 'DUP' matches 2 lines → byte-exact `Error: Start marker 'DUP' is not unique in bt/bt-rep-nq.txt.` + the dst byte-identical (no write)",
    res === "Error: Start marker 'DUP' is not unique in bt/bt-rep-nq.txt." && readFileSync(dst, "utf8") === before,
    JSON.stringify({ res, changed: readFileSync(dst, "utf8") !== before }),
  );
}

// ------------------------------------------------------------------ S16 loop_log tool (6) — the #60 probe pin (part 2 of 2): the looprun activity log as a directly-fired tool
//
// The custom tool at .opencode/tools/loop_log.ts (T3, the loop-tool-batch
// part 3): the loop-log line every agent used to hand-format, now
// machine-formatted. Imported DIRECT (type-stripped, the S12/S13 load
// pattern). The probe drives it with context.directory = sandbox roots —
// the loop root <dir>/.opencode/loop, the created autorun-* folder, and the
// loop_log.md all land in the sandbox (the repo's real .opencode/loop/ is
// NEVER touched; S5 hygiene verifies zero writes outside the sandbox). The
// folder stamp is local-clock, minute resolution — pinned by FORMAT (regex),
// never the exact value (the AGENTS.md pattern-5 discipline). Plain tool()
// object: no plugin hooks — the S5 tallies are unaffected.
const LL_TOOL_TS = path.join(REPO_ROOT, ".opencode", "tools", "loop_log.ts");
const LL_A = path.join(SANDBOX, "ll-a"); // the single-folder case (checks 10.19-122)
const LL_MULTI = path.join(SANDBOX, "ll-multi"); // the several-folders anomaly case (check 123)
const STAMP_RE = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/;
let llTool;
let llFolderA = null;
let llRetA = null;

// 10.18 — the tool file imports (type-stripped, direct) and exposes the
//      tool() default export: description (non-empty string) + the 5 args IN
//      ORDER (role/model/content REQUIRED strings, the status ENUM of the
//      five 8-char tokens — a bogus one fails safeParse, session OPTIONAL) +
//      async execute + NO `name` field (the host names the tool by FILENAME)
{
  const toolMod = await import(pathToFileURL(LL_TOOL_TS).href);
  llTool = toolMod.default;
  const argKeys = Object.keys(llTool?.args ?? {});
  const statusSch = llTool?.args?.status;
  const reqStr = (k) => {
    const s = llTool?.args?.[k];
    return s != null && typeof s.safeParse === "function" && s.safeParse(undefined).success === false && s.safeParse("x").success === true;
  };
  const sessionSch = llTool?.args?.session;
  check(
    "118",
    "S16",
    "tool file imports (type-stripped, direct) and exposes the tool() default export (description + args [role, model, status, content, session?] + async execute, NO name field)",
    llTool != null && typeof llTool.description === "string" && llTool.description.length > 0 &&
      JSON.stringify(argKeys) === JSON.stringify(["role", "model", "status", "content", "session"]) &&
      statusSch != null && typeof statusSch.safeParse === "function" &&
      statusSch.safeParse(undefined).success === false &&
      ["-->START", "DONE<---", "-RETURN-", "-WARNING", "--INFO--"].every((v) => statusSch.safeParse(v).success === true) &&
      statusSch.safeParse("BOGUS").success === false && statusSch.safeParse("-->START ").success === false && statusSch.safeParse("").success === false &&
      ["role", "model", "content"].every(reqStr) &&
      sessionSch != null && typeof sessionSch.safeParse === "function" && sessionSch.safeParse(undefined).success === true && sessionSch.safeParse("ses_ll_01").success === true && sessionSch.safeParse(42).success === false &&
      typeof llTool.execute === "function" && llTool.execute.constructor.name === "AsyncFunction" &&
      !("name" in llTool),
    JSON.stringify({ keys: argKeys, status: ["-->START", "BOGUS", ""].map((v) => statusSch?.safeParse?.(v)?.success), async: llTool?.execute?.constructor?.name, nameIn: "name" in (llTool ?? {}) }),
  );
}

// 10.19 — the empty loop root: the tool CREATES `autorun-<YYYY-MM-DD_HH-MM>`
//      (the stamp pinned by FORMAT — local clock, minute resolution, never
//      the exact value) + its loop_log.md (exactly one line); the return is
//      EXACTLY two lines `folder: <name>` + `line: <line>` (no ANOMALY for a
//      fresh single folder)
{
  llRetA = await llTool.execute(
    { role: "probe-s16", model: "probe-model", status: "-->START", content: "probe start line" },
    { directory: LL_A },
  );
  const lines = String(llRetA).split("\n");
  llFolderA = lines[0]?.startsWith("folder: ") ? lines[0].slice("folder: ".length) : null;
  const logFile = path.join(LL_A, ".opencode", "loop", llFolderA ?? "", "loop_log.md");
  const logBody = existsSync(logFile) ? readFileSync(logFile, "utf8") : null;
  check(
    "119",
    "S16",
    "empty loop root → auto-created `autorun-<YYYY-MM-DD_HH-MM>` (stamp format pinned) + loop_log.md (one line); return EXACTLY `folder: <name>\\nline: <line>` (no ANOMALY)",
    lines.length === 2 && llFolderA !== null && llFolderA.startsWith("autorun-") && STAMP_RE.test(llFolderA.slice("autorun-".length)) &&
      lines[1].startsWith("line: ") && !String(llRetA).includes("ANOMALY") &&
      logBody !== null && logBody.endsWith("\n") && logBody.split("\n").filter((l) => l.length > 0).length === 1,
    JSON.stringify({ lines, logBody }),
  );
}

// 120 — the line format: `<stamp> <status> <role> <session|unknown>
//      <model> <content>` (the field order byte-exact, the stamp the same
//      format as the folder name; the session was OMITTED in the call → the
//      literal `unknown` in the 4th field), and the return's `line:` field
//      carries EXACTLY the line that landed in the file
{
  const logFile = path.join(LL_A, ".opencode", "loop", llFolderA ?? "", "loop_log.md");
  const logBody = existsSync(logFile) ? readFileSync(logFile, "utf8") : null;
  const lineOnly = logBody === null ? null : logBody.replace(/\n$/, "");
  const lineRe = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2} -->START probe-s16 unknown probe-model probe start line$/;
  check(
    "120",
    "S16",
    "line format `<stamp> <status> <role> <session|unknown> <model> <content>` (field order byte-exact; omitted session → literal `unknown`) + the return's `line:` field == the file's line (byte-exact)",
    lineOnly !== null && lineRe.test(lineOnly) && STAMP_RE.test(lineOnly.slice(0, 16)) &&
      llRetA != null && llRetA.split("\n")[1] === `line: ${lineOnly}`,
    JSON.stringify({ lineOnly, retLine: llRetA?.split("\n")[1] }),
  );
}

// 121 — the session passthrough + append-only + single-folder reuse: call
//      #2 with an explicit session → the NEW line carries it in the 4th
//      field (field order intact); the file gains EXACTLY one line; the SAME
//      folder is used (the exactly-one-folder rule — still no ANOMALY)
{
  const logFile = path.join(LL_A, ".opencode", "loop", llFolderA ?? "", "loop_log.md");
  const countLines = () => readFileSync(logFile, "utf8").split("\n").filter((l) => l.length > 0).length;
  const beforeCount = countLines();
  const res2 = await llTool.execute(
    { role: "probe-s16", model: "probe-model", status: "DONE<---", content: "probe done line", session: "ses_ll_01" },
    { directory: LL_A },
  );
  const lines2 = String(res2).split("\n");
  const afterCount = countLines();
  const allLines = readFileSync(logFile, "utf8").split("\n").filter((l) => l.length > 0);
  const lastLine = allLines[allLines.length - 1] ?? "";
  check(
    "121",
    "S16",
    "call #2 (session `ses_ll_01` given): the new line carries it in the 4th field (field order byte-exact); the file gains EXACTLY one line; the SAME folder is reused (no ANOMALY)",
    lines2.length === 2 && lines2[0] === `folder: ${llFolderA}` && !String(res2).includes("ANOMALY") &&
      afterCount === beforeCount + 1 &&
      /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2} DONE<--- probe-s16 ses_ll_01 probe-model probe done line$/.test(lastLine) &&
      lines2[1] === `line: ${lastLine}`,
    JSON.stringify({ lines2, beforeCount, afterCount, lastLine }),
  );
}

// 122 — the empty-string session: `session: ""` → the 4th field is the
//      literal `unknown` again (the fallback covers omitted AND empty); the
//      file gains exactly one more line
{
  const logFile = path.join(LL_A, ".opencode", "loop", llFolderA ?? "", "loop_log.md");
  const countLines = () => readFileSync(logFile, "utf8").split("\n").filter((l) => l.length > 0).length;
  const beforeCount = countLines();
  const res3 = await llTool.execute(
    { role: "probe-s16", model: "probe-model", status: "-WARNING", content: "probe warning line", session: "" },
    { directory: LL_A },
  );
  const afterCount = countLines();
  const allLines = readFileSync(logFile, "utf8").split("\n").filter((l) => l.length > 0);
  const lastLine = allLines[allLines.length - 1] ?? "";
  check(
    "122",
    "S16",
    "session: '' (empty) → the 4th field is the literal `unknown` (the fallback covers omitted AND empty); exactly one more line; the SAME folder",
    String(res3).split("\n")[0] === `folder: ${llFolderA}` &&
      afterCount === beforeCount + 1 &&
      /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2} -WARNING probe-s16 unknown probe-model probe warning line$/.test(lastLine),
    JSON.stringify({ res3, beforeCount, afterCount, lastLine }),
  );
}

// 123 — the SEVERAL-folders anomaly: two dummy autorun-* dirs in a fresh
//      loop root (their mtimes pinned explicitly — the probe never trusts
//      the wall clock for the outcome) → the MOST-RECENTLY-MODIFIED folder
//      is used AND the byte-exact ANOMALY note is the 3rd return line (the
//      other folder stays untouched)
{
  const dOld = path.join(LL_MULTI, ".opencode", "loop", "autorun-2026-09-01_09-05");
  const dNew = path.join(LL_MULTI, ".opencode", "loop", "autorun-2026-09-14_10-05");
  mkdirSync(dOld, { recursive: true });
  mkdirSync(dNew, { recursive: true });
  utimesSync(dOld, Date.UTC(2026, 8, 1, 9, 5) / 1000, Date.UTC(2026, 8, 1, 9, 5) / 1000);
  utimesSync(dNew, Date.UTC(2026, 8, 14, 10, 5) / 1000, Date.UTC(2026, 8, 14, 10, 5) / 1000);
  const res = await llTool.execute(
    { role: "probe-s16", model: "probe-model", status: "--INFO--", content: "probe anomaly line" },
    { directory: LL_MULTI },
  );
  const lines = String(res).split("\n");
  const expectedAnomaly =
    "ANOMALY: 2 autorun-* folders exist in the loop dir; used the most-recently-modified (autorun-2026-09-14_10-05). The protocol invariant is EXACTLY ONE current looprun folder — rollover is planner work.";
  const logFile = path.join(dNew, "loop_log.md");
  const logBody = existsSync(logFile) ? readFileSync(logFile, "utf8") : null;
  const oldTouched = existsSync(path.join(dOld, "loop_log.md"));
  check(
    "123",
    "S16",
    "SEVERAL autorun-* folders → the most-recently-MODIFIED one is used + the byte-exact ANOMALY note as the 3rd return line (the other folder untouched)",
    lines.length === 3 && lines[0] === "folder: autorun-2026-09-14_10-05" && lines[2] === expectedAnomaly &&
      logBody !== null && lines[1] === `line: ${logBody.replace(/\n$/, "")}` && logBody.endsWith("\n") && !oldTouched,
    JSON.stringify({ lines, logBody, oldTouched, expectedAnomaly }),
  );
}

// ------------------------------------------------------------------ S17 numword scriptlet (26)
//
// The lane-5.2 scriptlet (.opencode/agent/scripts/numword/): ONE shared map
// (numwords.json) read by BOTH entry points. The node CLI is SPAWNED (the
// committed scriptlet IS the contract — no in-probe re-implementation), the
// python twin is spawned via the repo venv python, and the module is required
// DIRECT via createRequire (node -e usable). Grammar: research §3.2 +
// addendum C4 — unknown input is LOUD, never a best-guess.

const NUMWORD_DIR = path.join(REPO_ROOT, ".opencode", "agent", "scripts", "numword");
const NUMWORD_JS = path.join(NUMWORD_DIR, "numword.cjs");
const NUMWORDS_JSON = path.join(NUMWORD_DIR, "numwords.json");
const VENV_PY = path.join(REPO_ROOT, ".venv", "Scripts", "python.exe");
const runNumword = (args) => {
  try {
    const stdout = execFileSync(process.execPath, [NUMWORD_JS, ...args], { encoding: "utf8" });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
};
const runPyW2n = (word) => {
  const code = "import sys; sys.path.insert(0, sys.argv[1]); from w2n import w2n; sys.stdout.write(w2n(sys.argv[2]))";
  try {
    const stdout = execFileSync(VENV_PY, ["-c", code, NUMWORD_DIR, word], { encoding: "utf8" });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
};
const NW_PASS = [
  ["nine", "9"],
  ["ninetyfour", "94"],
  ["fourty", "40"],
  ["one-zero-one", "101"],
  ["two-zero", "20"],
  ["one-zero-six", "106"],
  ["eleven", "11"],
];
const NW_REJECT = ["twozero", "two+zero", "foour", "eleventy"];
let n17 = 124;

// 124 — the shared map is complete (the ONE source both entry points read)
{
  const m = JSON.parse(readFileSync(NUMWORDS_JSON, "utf8"));
  const units = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const tens = ["ten", "twenty", "thirty", "forty", "fourty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const teens = ["eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  check(
    "124",
    "S17",
    "shared numwords.json complete: units zero..nine, tens ten..ninety + fourty alias (40), teens eleven..nineteen (19)",
    units.every((u) => u in m.units) && tens.every((t) => t in m.tens) && teens.every((t) => t in m.teens) &&
      m.units.zero === 0 && m.units.nine === 9 && m.tens.forty === 40 && m.tens.fourty === 40 && m.teens.eleven === 11 && m.teens.nineteen === 19,
    JSON.stringify(Object.keys(m)),
  );
  n17++;
}

// 125-131 — node CLI pass fixtures (exit 0, the digit string byte-exact)
for (const [w, d] of NW_PASS) {
  const r = runNumword([w]);
  check(
    String(n17),
    "S17",
    `node CLI ${w} → ${d} (exit 0)`,
    r.code === 0 && r.stdout.trim() === d,
    `code=${r.code} stdout='${r.stdout.trim()}' stderr='${r.stderr.trim().slice(0, 120)}'`,
  );
  n17++;
}

// 132-135 — node CLI reject fixtures (loud: non-zero exit + unknown on stderr)
for (const w of NW_REJECT) {
  const r = runNumword([w]);
  check(
    String(n17),
    "S17",
    `node CLI ${w} → LOUD reject (exit 1, unknown on stderr)`,
    r.code === 1 && /unknown/i.test(r.stderr),
    `code=${r.code} stdout='${r.stdout.trim()}' stderr='${r.stderr.trim().slice(0, 120)}'`,
  );
  n17++;
}

// 136-142 — python w2n pass fixtures (same map + grammar behavior)
for (const [w, d] of NW_PASS) {
  const r = runPyW2n(w);
  check(
    String(n17),
    "S17",
    `python w2n(${w}) → ${d}`,
    r.code === 0 && r.stdout.trim() === d,
    `code=${r.code} stdout='${r.stdout.trim()}' stderr='${r.stderr.trim().slice(0, 120)}'`,
  );
  n17++;
}

// 143-146 — python w2n reject fixtures (loud: ValueError, non-zero exit)
for (const w of NW_REJECT) {
  const r = runPyW2n(w);
  check(
    String(n17),
    "S17",
    `python w2n(${w}) → ValueError (loud)`,
    r.code !== 0 && /ValueError/.test(r.stderr),
    `code=${r.code} stdout='${r.stdout.trim()}' stderr='${r.stderr.trim().slice(0, 120)}'`,
  );
  n17++;
}

// 147-149 — the node module (node -e usable): w2n parity + loud throws +
//      numword_check shell contract
{
  const nw = createRequire(import.meta.url)(NUMWORD_JS);
  check(
    String(n17),
    "S17",
    "module (node -e usable): w2n agrees with every pass fixture",
    NW_PASS.every(([w, d]) => nw.w2n(w) === d),
    JSON.stringify(NW_PASS.map(([w]) => [w, nw.w2n(w)])),
  );
  n17++;
  check(
    String(n17),
    "S17",
    "module: every reject fixture throws (loud, never guessed)",
    NW_REJECT.every((w) => {
      try {
        nw.w2n(w);
        return false;
      } catch {
        return true;
      }
    }),
    JSON.stringify(NW_REJECT),
  );
  n17++;
  const c1 = nw.numword_check("20", "two-zero");
  const c2 = nw.numword_check("5", "nine");
  const c3 = nw.numword_check("9", "eleventy");
  check(
    String(n17),
    "S17",
    "numword_check: AGREE 20 (code 0) / DISAGREE 9 (code 1) / UNKNOWN eleventy (code 2)",
    c1.out === "AGREE 20" && c1.code === 0 && c2.out === "DISAGREE 9" && c2.code === 1 && c3.out === "UNKNOWN eleventy" && c3.code === 2,
    JSON.stringify([c1, c2, c3]),
  );
  n17++;
}

// ------------------------------------------------------------------ S18 intercept observer (32)
//
// The lane-5.3 log-only intercept observer + lane-5.4 read-scope fuzzy
// resolution (.opencode/plugin/intercept_observer.ts + _core.ts, approved
// 2026-09-16): the C7 8-field line-shape pin + the NAMED core (pure
// functions over arg strings + the shared numword map + the read-scope
// matcher — pinned WITHOUT a full PluginInput harness; the hook-level checks
// use the real factory against a SANDBOX project dir). The plugin file is
// imported DIRECT, type-stripped (the S12/S13 load pattern); the named core
// is imported from the SPLIT core file (the 2026-09-16 export fix — the
// plugin file exports the default factory ONLY, so every ioCore.* named
// reference below reads from the core module, ioCore.* from the plugin). The
// numword map is the REAL shared file (read-only — ONE map home, addendum
// C3); the hook's intercept.log lands in the sandbox, never the live
// .opencode/temp/.

const OBS_TS = path.join(REPO_ROOT, ".opencode", "plugin", "intercept_observer.ts");
const OBS_CORE_TS = path.join(REPO_ROOT, ".opencode", "plugin", "intercept_observer_core.ts");
const ioMod = await import(pathToFileURL(OBS_TS).href); // default factory ONLY
const ioCore = await import(pathToFileURL(OBS_CORE_TS).href); // the named core
const ioMap = ioCore.loadNumwordMap(NUMWORDS_JSON);
const ioSandboxProj = path.join(SANDBOX, "obsproj");
mkdirSync(ioSandboxProj, { recursive: true });
const ioLogPath = path.join(ioSandboxProj, ".opencode", "temp", "intercept.log");
const LIVE_IO_LOG = path.join(REPO_ROOT, ".opencode", "temp", "intercept.log");
const liveIoBefore = existsSync(LIVE_IO_LOG) ? readFileSync(LIVE_IO_LOG, "utf8") : null;
const ioHooks = await ioMod.default({ directory: ioSandboxProj });
const ioBefore = ioHooks["tool.execute.before"];
const ioStampRe = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/;
const ioReadLines = () => (existsSync(ioLogPath) ? readFileSync(ioLogPath, "utf8").split(/\r?\n/).filter((l) => l.length > 0) : []);
let n18 = 150;

// 150 — the ONE shared map home (C3): the plugin loads the REAL numwords.json
{
  check(
    String(n18),
    "S18",
    "loadNumwordMap(real shared numwords.json) → the map with units/tens/teens (ONE map home)",
    ioMap !== null && ioMap.units && ioMap.tens && ioMap.teens && ioMap.units.nine === 9 && ioMap.tens.fourty === 40,
    JSON.stringify(ioMap === null ? null : Object.keys(ioMap)),
  );
  n18++;
}

// 151 — map read failure → null (numword checks silently off, never a throw)
check(
  String(n18),
  "S18",
  "loadNumwordMap(missing path) → null (numword checks silently off)",
  ioCore.loadNumwordMap(path.join(SANDBOX, "no_such_numwords.json")) === null,
);
n18++;

// 152 — resolveNumword agrees with every 5.2 pass fixture (shared C4 grammar)
check(
  String(n18),
  "S18",
  "resolveNumword: every 5.2 pass fixture → value (nine→9 … eleven→11)",
  NW_PASS.every(([w, d]) => {
    const r = ioCore.resolveNumword(w, ioMap);
    return r.kind === "value" && r.value === d;
  }),
  JSON.stringify(NW_PASS.map(([w]) => ioCore.resolveNumword(w, ioMap))),
);
n18++;

// 153 — resolveNumword: every 5.2 reject fixture → unknown (loud, never a guess)
check(
  String(n18),
  "S18",
  "resolveNumword: every 5.2 reject fixture (twozero/two+zero/foour/eleventy) → unknown",
  NW_REJECT.every((w) => ioCore.resolveNumword(w, ioMap).kind === "unknown"),
  JSON.stringify(NW_REJECT.map((w) => ioCore.resolveNumword(w, ioMap))),
);
n18++;

// 154 — resolveNumword: a multi-split word → ambiguous WITH candidates
//      (synthetic map — the real map has no ambiguous split)
{
  const ambMap = { units: { a: 1, aa: 5 }, tens: { a: 10, aa: 20 }, teens: {} };
  const amb = ioCore.resolveNumword("aaa", ambMap);
  check(
    String(n18),
    "S18",
    "resolveNumword: multi-split → ambiguous with candidates [15,21] (never a guess)",
    amb.kind === "ambiguous" && JSON.stringify(amb.candidates) === JSON.stringify(["15", "21"]),
    JSON.stringify(amb),
  );
  n18++;
}

// 155 — observeDense: a >=6-digit run fires the gate line; 5 digits do not
{
  const d1 = ioCore.observeDense("20260916");
  const d2 = ioCore.observeDense("12345");
  check(
    String(n18),
    "S18",
    "observeDense: 8-digit run → no-candidate gate line (8d=20260916); 5-digit run → none",
    d1.length === 1 && d1[0].verdict === "no-candidate" && d1[0].evidence.includes("8d=20260916") && d2.length === 0,
    JSON.stringify([d1, d2]),
  );
  n18++;
}

// 156 — observeNumword: map hit → value; twozero (unknown) → none; map null → none
{
  const n1 = ioCore.observeNumword("use four for plan", ioMap);
  const n2 = ioCore.observeNumword("twozero plan", ioMap);
  const n3 = ioCore.observeNumword("use four", null);
  check(
    String(n18),
    "S18",
    "observeNumword: map hit four→4; twozero (unknown) → none; map null → none",
    n1.length === 1 && n1[0].verdict === "no-candidate" && n1[0].evidence.includes("four→4") && n2.length === 0 && n3.length === 0,
    JSON.stringify([n1, n2, n3]),
  );
  n18++;
}

// 157 — observePairs agree: [4:four] → observed-redundancy-ok (byte-exact
//      evidence — the R1 form switch: [left:right], no inner spaces, exactly
//      one colon; the OLD digit|word pipe form is dead)
{
  const p1 = ioCore.observePairs("[4:four]", ioMap);
  check(
    String(n18),
    "S18",
    "observePairs: [4:four] → observed-redundancy-ok, evidence 'pair=[4:four] canon=4 dist=0'",
    p1.length === 1 && p1[0].verdict === "observed-redundancy-ok" && p1[0].evidence === "pair=[4:four] canon=4 dist=0",
    JSON.stringify(p1),
  );
  n18++;
}

// 158 — observePairs mismatch: [5:four] → redundancy-mismatch (dist=1,
//      right-wins — the canonical is the right-derived value)
{
  const p2 = ioCore.observePairs("[5:four]", ioMap);
  check(
    String(n18),
    "S18",
    "observePairs: [5:four] → redundancy-mismatch, evidence 'pair=[5:four] canon=4 dist=1' (right-wins canon)",
    p2.length === 1 && p2[0].verdict === "redundancy-mismatch" && p2[0].evidence === "pair=[5:four] canon=4 dist=1",
    JSON.stringify(p2),
  );
  n18++;
}

// 159 — observePairs unknown word: [4:foour] → no-candidate gate=right-unknown
{
  const p3 = ioCore.observePairs("[4:foour]", ioMap);
  check(
    String(n18),
    "S18",
    "observePairs: [4:foour] (unresolvable right) → no-candidate gate=right-unknown",
    p3.length === 1 && p3[0].verdict === "no-candidate" && p3[0].evidence === "pair=[4:foour] gate=right-unknown",
    JSON.stringify(p3),
  );
  n18++;
}

// 160 — observePairs negatives: the OLD tight digit|word pipe form is DEAD
//      (no longer detected) and a word-first right ([four:4] — digits on the
//      right are NOT the numword form) is not a pair
{
  const p4 = ioCore.observePairs("4|four", ioMap);
  const p5 = ioCore.observePairs("[four:4]", ioMap);
  check(
    String(n18),
    "S18",
    "observePairs negatives: old pipe form '4|four' (dead) and digit-right '[four:4]' → none",
    p4.length === 0 && p5.length === 0,
    JSON.stringify([p4, p5]),
  );
  n18++;
}

// 161 — observePathAnomaly: doubled segment → path-anomaly; clean path → none
{
  const a1 = ioCore.observePathAnomaly("c:\\users\\users\\x");
  const a2 = ioCore.observePathAnomaly("c:\\users\\x");
  check(
    String(n18),
    "S18",
    "observePathAnomaly: users\\users → path-anomaly 'doubled=users'; clean path → none",
    a1.length === 1 && a1[0].verdict === "path-anomaly" && a1[0].evidence === "doubled=users" && a2.length === 0,
    JSON.stringify([a1, a2]),
  );
  n18++;
}

// 162 — observeSandbox: outside the root → out-of-sandbox; under → none;
//      root null → none (note-only, no enforcement — addendum C6)
{
  const s1 = ioCore.observeSandbox("C:\\Windows\\System32\\cmd.exe", "C:\\repo");
  const s2 = ioCore.observeSandbox("C:\\repo\\sub\\file.txt", "C:\\repo");
  const s3 = ioCore.observeSandbox("C:\\Windows\\x", null);
  check(
    String(n18),
    "S18",
    "observeSandbox: outside root → out-of-sandbox; under root → none; root null → none",
    s1.length === 1 && s1[0].verdict === "out-of-sandbox" && s2.length === 0 && s3.length === 0,
    JSON.stringify([s1, s2, s3]),
  );
  n18++;
}

// 163 — underRoot: a JSON-escaped `\\` span collapses to single separators
//      (case-insensitive; a JSON-stringified arg must not false the root)
{
  const u1 = ioCore.underRoot("C:\\\\Users\\\\Wasiejen\\\\proj\\\\x.txt", "C:/Users/Wasiejen/proj");
  const u2 = ioCore.underRoot("C:\\\\Users\\\\other\\\\x.txt", "C:/Users/Wasiejen/proj");
  check(
    String(n18),
    "S18",
    "underRoot: JSON-escaped double-backslash span under the root (case-insensitive); different branch → false",
    u1 === true && u2 === false,
    JSON.stringify({ u1, u2 }),
  );
  n18++;
}

// 164 — classifyContext: date / session-id / commit-ref / path / arg
{
  const c1 = ioCore.classifyContext("2026-09-16");
  const c2 = ioCore.classifyContext("ses_f5605f805ffeElHB9mgtksjye1");
  const c3 = ioCore.classifyContext("a".repeat(40));
  const c4 = ioCore.classifyContext("C:\\Users\\x\\y");
  const c5 = ioCore.classifyContext("hello world");
  check(
    String(n18),
    "S18",
    "classifyContext: date / session-id / commit-ref / path / arg (first match wins)",
    c1 === "date" && c2 === "session-id" && c3 === "commit-ref" && c4 === "path" && c5 === "arg",
    JSON.stringify([c1, c2, c3, c4, c5]),
  );
  n18++;
}

// 165 — observeArg: FIVE firing classes → capped at 3, priority order
{
  const cap = ioCore.observeArg("c:\\users\\users\\[5:four].txt 20260916 four", ioMap, "C:\\repo");
  check(
    String(n18),
    "S18",
    "observeArg: 5 firing classes → capped at 3 lines, priority mismatch → path-anomaly → out-of-sandbox",
    cap.length === 3 && cap[0].verdict === "redundancy-mismatch" && cap[1].verdict === "path-anomaly" && cap[2].verdict === "out-of-sandbox",
    JSON.stringify(cap.map((o) => o.verdict)),
  );
  n18++;
}

// 166 — observeArg clean: no firing class → no line (the log is quiet by default)
check(
  String(n18),
  "S18",
  "observeArg: clean arg → no lines; empty arg → no lines",
  ioCore.observeArg("hello world", ioMap, "C:\\repo").length === 0 && ioCore.observeArg("", ioMap, "C:\\repo").length === 0,
);
n18++;

// 167 — the HOOK: never mutates output.args (byte-identical before/after)
//      and writes its lines to the SANDBOX project dir
{
  const ioArgs = { filePath: ioSandboxProj + "\\sub\\file.txt", command: "ls [4:four] 20260916" };
  const ioArgsBefore = JSON.stringify(ioArgs);
  await ioBefore({ tool: "bash", sessionID: "ses_fx_io1", callID: "c1" }, { args: ioArgs });
  check(
    String(n18),
    "S18",
    "hook NEVER mutates output.args (byte-identical before/after) + writes the sandbox intercept.log",
    JSON.stringify(ioArgs) === ioArgsBefore && existsSync(ioLogPath) && ioLogPath.startsWith(SANDBOX),
    JSON.stringify({ argsAfter: JSON.stringify(ioArgs), log: ioLogPath }),
  );
  n18++;
}

// 168 — the HOOK: garbage input → never throws (best-effort house rule)
{
  let ioThrew = false;
  try {
    await ioBefore(undefined, undefined);
    await ioBefore({ tool: null, sessionID: null }, { args: null });
    await ioBefore({ tool: "x", sessionID: "s", callID: "c" }, { args: 42 });
  } catch {
    ioThrew = true;
  }
  check(
    String(n18),
    "S18",
    "hook: garbage input (undefined/null/42) → never throws",
    !ioThrew,
  );
  n18++;
}

// 169 — the log line BYTE-SHAPE (C7): 8 " | " fields, minute stamp, session,
//      model (unknown for the non-existent probe session), tool, verdict
//      vocabulary; the LIVE log stays byte-identical
{
  const ioLines = ioReadLines();
  const ioF = ioLines.length >= 2 ? ioLines[0].split(" | ") : [];
  const liveIoAfter = existsSync(LIVE_IO_LOG) ? readFileSync(LIVE_IO_LOG, "utf8") : null;
  check(
    String(n18),
    "S18",
    "log line: exactly 8 ' | ' fields, stamp/sid/model-unknown/tool/verdict-vocab; 2 lines for the fixture; live log untouched",
    ioLines.length === 2 && ioF.length === 8 && ioStampRe.test(ioF[0]) && ioF[1] === "ses_fx_io1" && ioF[2] === "unknown" &&
      ioF[3] === "bash" && ioCore.VERDICTS.includes(ioF[7]) && liveIoBefore === liveIoAfter,
    JSON.stringify({ lines: ioLines.length, fields: ioF.length, live: [liveIoBefore, liveIoAfter].map((x) => (x === null ? null : x.length)) }),
  );
  n18++;
}

// 170 — the intercept log path is GIT-IGNORED (the `temp` entry — same as
//      the ctx log; the separate-file ruling, addendum C7)
{
  let ioIgnored = true;
  try {
    execFileSync("git", ["check-ignore", "-q", ".opencode/temp/intercept.log"], { cwd: REPO_ROOT });
  } catch {
    ioIgnored = false;
  }
  check(String(n18), "S18", "the intercept log path is git-ignored (git check-ignore -q .opencode/temp/intercept.log)", ioIgnored);
  n18++;
}

// 171 — the EXPORT FIX (2026-09-16): the plugin module exports the default
//      factory ONLY — every Object.values entry is a function (the host
//      loader contract; the "Plugin export is not a function" regression
//      pin) and the named core surface lives in the SPLIT core module
{
  const ioVals = Object.values(ioMod);
  check(
    String(n18),
    "S18",
    "export fix: plugin module = default factory ONLY (every Object.values entry a function); named core in the core module (VERDICTS = 6 + 2 fuzzy + pair-resolved + the two R6 edit-hint tokens + the (2) fuzzy-edit mutation token)",
    ioVals.length === 1 && ioVals.every((v) => typeof v === "function") &&
      typeof ioMod.default === "function" &&
      typeof ioCore.resolveReadPath === "function" && typeof ioCore.buildCorpus === "function" &&
      typeof ioCore.observeArg === "function" && Array.isArray(ioCore.VERDICTS) && ioCore.VERDICTS.length === 12,
    JSON.stringify({ pluginKeys: Object.keys(ioMod), verdicts: ioCore.VERDICTS.length }),
  );
  n18++;
}

// 172 — resolveReadPath: byte-equal relative path → {kind:"exact"} (untouched, no line)
check(
  String(n18),
  "S18",
  "resolveReadPath: byte-equal rel path → exact",
  JSON.stringify(ioCore.resolveReadPath("sub/file.txt", ["sub/file.txt", "other/thing.txt"])) === '{"kind":"exact"}',
);
n18++;

// 173 — resolveReadPath: case / backslash / trim noise → normalized-equal →
//      exact (a case-only miss is not a typo, research §2.2)
check(
  String(n18),
  "S18",
  "resolveReadPath: case/backslash/trim noise → normalized-exact",
  JSON.stringify(ioCore.resolveReadPath("SUB\\File.TXT ", ["sub/file.txt", "other/thing.txt"])) === '{"kind":"exact"}',
);
n18++;

// 174 — resolveReadPath: d=1 (deletion) → resolved {path, d:1, gap:8}
check(
  String(n18),
  "S18",
  "resolveReadPath: d=1 → resolved d=1 gap=8 (the full rel path discriminates)",
  JSON.stringify(ioCore.resolveReadPath("sub/fil.txt", ["sub/file.txt", "other/thing.txt"])) ===
    JSON.stringify({ kind: "resolved", path: "sub/file.txt", d: 1, gap: 8 }),
);
n18++;

// 175 — resolveReadPath: d=2 (transposition) → resolved {path, d:2, gap:7}
check(
  String(n18),
  "S18",
  "resolveReadPath: d=2 (transposition fiel) → resolved d=2 gap=7",
  JSON.stringify(ioCore.resolveReadPath("sub/fiel.txt", ["sub/file.txt", "other/thing.txt"])) ===
    JSON.stringify({ kind: "resolved", path: "sub/file.txt", d: 2, gap: 7 }),
);
n18++;

// 176 — resolveReadPath: two close siblings (gap<2) → FAIL-CLOSED rejected
//      reason=gap-too-small + the top-3 cands [rel,d] shape (never picks)
check(
  String(n18),
  "S18",
  "resolveReadPath: gap<2 → rejected gap-too-small, cands [[a/f.txt,1],[a/g.txt,2]]",
  JSON.stringify(ioCore.resolveReadPath("a/fi.txt", ["a/f.txt", "a/g.txt"])) ===
    JSON.stringify({ kind: "rejected", cands: [["a/f.txt", 1], ["a/g.txt", 2]], reason: "gap-too-small" }),
);
n18++;

// 177 — resolveReadPath: d>2 → FAIL-CLOSED rejected reason=d-too-high, the
//      top-3 cands [rel,d] sorted by d (all three of the 3-entry corpus)
check(
  String(n18),
  "S18",
  "resolveReadPath: d>2 → rejected d-too-high, cands top-3 [[x/y.txt,6],[sub/file.txt,7],[other/thing.txt,10]]",
  JSON.stringify(ioCore.resolveReadPath("zzz/qqq.txt", ["sub/file.txt", "other/thing.txt", "x/y.txt"])) ===
    JSON.stringify({ kind: "rejected", cands: [["x/y.txt", 6], ["sub/file.txt", 7], ["other/thing.txt", 10]], reason: "d-too-high" }),
);
n18++;

// 178 — buildCorpus: relative paths (dirs + files), .git/node_modules
//      skipped, the cap arg enforced, missing root → [] (empty corpus →
//      resolveReadPath NEVER resolves — the fail-safe); CORPUS_MAX_ENTRIES = 20k
{
  const fzCorpus = path.join(ioSandboxProj, "corpus");
  mkdirSync(path.join(fzCorpus, ".git"), { recursive: true });
  mkdirSync(path.join(fzCorpus, "node_modules"), { recursive: true });
  mkdirSync(path.join(fzCorpus, "a"), { recursive: true });
  writeFileSync(path.join(fzCorpus, ".git", "head"), "x", "utf8");
  writeFileSync(path.join(fzCorpus, "node_modules", "pkg.js"), "x", "utf8");
  writeFileSync(path.join(fzCorpus, "a", "b.txt"), "x", "utf8");
  writeFileSync(path.join(fzCorpus, "top.txt"), "x", "utf8");
  const c1 = ioCore.buildCorpus(fzCorpus);
  const c2 = ioCore.buildCorpus(fzCorpus, 2);
  const c3 = ioCore.buildCorpus(path.join(ioSandboxProj, "no_such_root"));
  const e1 = ioCore.resolveReadPath("a/b.txt", c3);
  check(
    String(n18),
    "S18",
    "buildCorpus: rel paths [a, a/b.txt, top.txt], .git/node_modules skipped, cap 2 → 2 entries, missing root → [] (empty corpus → never resolves)",
    JSON.stringify(c1) === JSON.stringify(["a", "a/b.txt", "top.txt"]) && c2.length === 2 && c3.length === 0 &&
      ioCore.CORPUS_MAX_ENTRIES === 20_000 && e1.kind === "rejected" && e1.reason === "empty-corpus",
    JSON.stringify({ c1, c2: c2.length, c3, cap: ioCore.CORPUS_MAX_ENTRIES }),
  );
  n18++;
}

// fixture for the read-scope hook checks: a real file under the sandbox
// project — the corpus root is its directory, so the mistyped sibling
// queries match against the SAME dir (the §2.2 sibling-discrimination shape)
const ioFzDir = path.join(ioSandboxProj, "fz");
mkdirSync(ioFzDir, { recursive: true });
writeFileSync(path.join(ioFzDir, "file.txt"), "x", "utf8");

// 179 — the HOOK read-scope: a d<=2 mistyped read filePath is MUTATED to the
//      resolved absolute path + a fuzzy-resolved 8-field line (byte-exact
//      evidence: `fuzzy orig=<arg> -> file.txt d=1 gap=inf` — single-entry
//      corpus, so the gap is infinite)
{
  const r1 = { filePath: ioFzDir + "\\fil.txt" };
  const nLines1 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io1", callID: "c179" }, { args: r1 });
  const r1Lines = ioReadLines();
  const r1f = r1Lines[r1Lines.length - 1].split(" | ");
  check(
    String(n18),
    "S18",
    "hook read-scope: mistyped read filePath MUTATED to the resolved path + fuzzy-resolved line (8 fields, byte-exact evidence)",
    r1.filePath === ioFzDir + "\\file.txt" && r1Lines.length === nLines1 + 1 && r1f.length === 8 &&
      ioStampRe.test(r1f[0]) && r1f[1] === "ses_fx_io1" && r1f[3] === "read" &&
      r1f[4] === JSON.stringify({ filePath: ioFzDir + "\\fil.txt" }) &&
      r1f[5] === `fuzzy orig=${ioFzDir}\\fil.txt -> file.txt d=1 gap=inf` &&
      r1f[6] === "path" && r1f[7] === "fuzzy-resolved",
    JSON.stringify({ after: r1.filePath, n: r1Lines.length - nLines1, f: r1f }),
  );
  n18++;
}

// 180 — the HOOK read-scope fail-closed: a d>2 read filePath is NOT mutated
//      (byte-identical) + a fuzzy-rejected 8-field line (top-3 cands +
//      reason=d-too-high — the conservative channel, both logged)
{
  const r2 = { filePath: ioFzDir + "\\zzz-completely-different-abcdef.txt" };
  const r2Before = JSON.stringify(r2);
  const nLines2 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io1", callID: "c180" }, { args: r2 });
  const r2Lines = ioReadLines();
  const r2f = r2Lines[r2Lines.length - 1].split(" | ");
  check(
    String(n18),
    "S18",
    "hook read-scope fail-closed: d>2 read NOT mutated (byte-identical) + fuzzy-rejected line (cands + reason)",
    JSON.stringify(r2) === r2Before && r2Lines.length === nLines2 + 1 && r2f.length === 8 &&
      r2f[3] === "read" && r2f[7] === "fuzzy-rejected" &&
      r2f[5] === `fuzzy orig=${ioFzDir}\\zzz-completely-different-abcdef.txt cands=file.txt 29 reason=d-too-high` &&
      r2f[6] === "path",
    JSON.stringify({ argsAfter: JSON.stringify(r2), f: r2f }),
  );
  n18++;
}

// 181 — the HOOK read-scope exact: an EXISTING filePath → untouched (no
//      mutation, no fuzzy line) and the LIVE intercept.log is still
//      byte-identical after all the new hook checks
{
  const r3 = { filePath: ioFzDir + "\\file.txt" };
  const r3Before = JSON.stringify(r3);
  const nLines3 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io1", callID: "c181" }, { args: r3 });
  const liveIoAfter2 = existsSync(LIVE_IO_LOG) ? readFileSync(LIVE_IO_LOG, "utf8") : null;
  check(
    String(n18),
    "S18",
    "hook read-scope exact: existing path untouched + no fuzzy line; LIVE log still byte-identical",
    JSON.stringify(r3) === r3Before && ioReadLines().length === nLines3 && liveIoBefore === liveIoAfter2,
    JSON.stringify({ n: ioReadLines().length - nLines3, liveSame: liveIoBefore === liveIoAfter2 }),
  );
  n18++;
}

// ------------------------------------------------------------------ S19 [l:r] pair pipeline (13)
//
// The R1 (2026-09-16) read-scope [left:right] pair resolution + the form
// switch + the sandbox scratchpad root (spec: the R1 task; design source:
// research/fuzzy-numword/decision-record.md §2.4-§2.6). Extends S18 (which
// stays the lane-5.3/5.4 pin): the grammar pins are core-level (checkPairs /
// observePairs / resolvePairLeft over the REAL shared map); the read-mutation
// pins use the same real factory + sandbox project dir as S18 (the pf/
// fixture files are the existence-gate corpus — created BEFORE the checks so
// every check sees the same four entries).

const ioPfDir = path.join(ioSandboxProj, "pf");
mkdirSync(ioPfDir, { recursive: true });
writeFileSync(path.join(ioPfDir, "file-2.txt"), "x", "utf8");
writeFileSync(path.join(ioPfDir, "file-4.txt"), "x", "utf8");
writeFileSync(path.join(ioPfDir, "file-8.txt"), "x", "utf8");
writeFileSync(path.join(ioPfDir, "file-[2:two].txt"), "x", "utf8"); // brackets are legal on NTFS — the both-exist case
let n19 = 182;

// 182 — checkPairs: the adder-left (form b) — the SUM is the left value
{
  const p = ioCore.observePairs("[800+50+11:eight-six-one]", ioMap);
  check(
    String(n19),
    "S19",
    "adder-left: [800+50+11:eight-six-one] → observed-redundancy-ok, evidence 'pair=[800+50+11:eight-six-one] canon=861 dist=0'",
    p.length === 1 && p[0].verdict === "observed-redundancy-ok" && p[0].evidence === "pair=[800+50+11:eight-six-one] canon=861 dist=0",
    JSON.stringify(p),
  );
  n19++;
}

// 183 — checkPairs: a mismatch is RIGHT-WINS — the canonical is ALWAYS the
//      right-derived value (canon=120, NOT the drifted left 121)
{
  const p = ioCore.observePairs("[121:one-two-zero]", ioMap);
  check(
    String(n19),
    "S19",
    "mismatch right-wins: [121:one-two-zero] → redundancy-mismatch, evidence 'pair=[121:one-two-zero] canon=120 dist=1'",
    p.length === 1 && p[0].verdict === "redundancy-mismatch" && p[0].evidence === "pair=[121:one-two-zero] canon=120 dist=1",
    JSON.stringify(p),
  );
  n19++;
}

// 184 — multi-pair per arg → independent resolution, one observation each
{
  const p = ioCore.observePairs("[1:one] x [2:two]", ioMap);
  check(
    String(n19),
    "S19",
    "multi-pair: [1:one] x [2:two] → 2 independent ok lines (one per pair)",
    p.length === 2 && p[0].verdict === "observed-redundancy-ok" && p[0].evidence === "pair=[1:one] canon=1 dist=0" &&
      p[1].verdict === "observed-redundancy-ok" && p[1].evidence === "pair=[2:two] canon=2 dist=0",
    JSON.stringify(p),
  );
  n19++;
}

// 185 — form negatives: the OLD tight digit|word pipe form is DEAD (not
//      detected), inner spaces are rejected, and a second colon is rejected
{
  const p1 = ioCore.observePairs("4|four 30 | grep x", ioMap);
  const p2 = ioCore.observePairs("[4 :four] [4: four] [4:four:two]", ioMap);
  check(
    String(n19),
    "S19",
    "form negatives: old pipe form (dead), inner-space forms, and a 2-colon form → none",
    p1.length === 0 && p2.length === 0,
    JSON.stringify([p1, p2]),
  );
  n19++;
}

// 186 — the numword LEFT form (a map word) + an unknown left → no-candidate
//      gate=left-unknown (never a guess on either side)
{
  const p1 = ioCore.observePairs("[four:four]", ioMap);
  const p2 = ioCore.observePairs("[foour:four]", ioMap);
  check(
    String(n19),
    "S19",
    "numword-left: [four:four] → ok canon=4; unknown left [foour:four] → no-candidate gate=left-unknown",
    p1.length === 1 && p1[0].verdict === "observed-redundancy-ok" && p1[0].evidence === "pair=[four:four] canon=4 dist=0" &&
      p2.length === 1 && p2[0].verdict === "no-candidate" && p2[0].evidence === "pair=[foour:four] gate=left-unknown",
    JSON.stringify([p1, p2]),
  );
  n19++;
}

// 187 — the `fourty` alias (a map word on the tens side) resolves on a pair
//      side — the spec grammar includes it
{
  const p = ioCore.observePairs("[40:fourty]", ioMap);
  check(
    String(n19),
    "S19",
    "fourty alias: [40:fourty] → observed-redundancy-ok, evidence 'pair=[40:fourty] canon=40 dist=0'",
    p.length === 1 && p[0].verdict === "observed-redundancy-ok" && p[0].evidence === "pair=[40:fourty] canon=40 dist=0",
    JSON.stringify(p),
  );
  n19++;
}

// 188 — the HOOK read-scope pair: the canonical path EXISTS and the
//      pair-containing path does NOT → filePath MUTATED to the canonical +
//      a pair-resolved 8-field line (byte-exact evidence); exactly ONE new
//      line (the read channel owns the pair line — no double-logging)
{
  const r1 = { filePath: ioPfDir + "\\file-[4:four].txt" };
  const nLines1 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io2", callID: "c188" }, { args: r1 });
  const r1Lines = ioReadLines();
  const r1f = r1Lines[r1Lines.length - 1].split(" | ");
  check(
    String(n19),
    "S19",
    "hook read pair gate: canonical exists → filePath MUTATED to the canonical path + pair-resolved line (8 fields, byte-exact)",
    r1.filePath === ioPfDir + "\\file-4.txt" && r1Lines.length === nLines1 + 1 && r1f.length === 8 &&
      ioStampRe.test(r1f[0]) && r1f[1] === "ses_fx_io2" && r1f[3] === "read" &&
      r1f[4] === JSON.stringify({ filePath: ioPfDir + "\\file-[4:four].txt" }) &&
      r1f[5] === "pair=[4:four] canon=4 dist=0 gate=mutated" &&
      r1f[6] === "path" && r1f[7] === "pair-resolved",
    JSON.stringify({ after: r1.filePath, n: r1Lines.length - nLines1, f: r1f }),
  );
  n19++;
}

// 189 — the HOOK read-scope pair gate FAIL-CLOSED: the canonical path does
//      NOT exist → args byte-identical + the pair line (gate=none-exist) +
//      the fuzzy channel STILL RUNS on the result (d>2 → fuzzy-rejected —
//      the fixed pipeline order, decision-record §2.6)
{
  const r2 = { filePath: ioPfDir + "\\file-[7:seven].txt" };
  const r2Before = JSON.stringify(r2);
  const nLines2 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io2", callID: "c189" }, { args: r2 });
  const r2Lines = ioReadLines();
  const r2p = r2Lines[r2Lines.length - 2].split(" | ");
  const r2f = r2Lines[r2Lines.length - 1].split(" | ");
  check(
    String(n19),
    "S19",
    "hook read pair gate fail-closed: canonical absent → NOT mutated (byte-identical) + pair line gate=none-exist + fuzzy-rejected on the result",
    JSON.stringify(r2) === r2Before && r2Lines.length === nLines2 + 2 &&
      r2p.length === 8 && r2p[7] === "observed-redundancy-ok" && r2p[5] === "pair=[7:seven] canon=7 dist=0 gate=none-exist" &&
      r2f.length === 8 && r2f[7] === "fuzzy-rejected",
    JSON.stringify({ argsAfter: JSON.stringify(r2), n: r2Lines.length - nLines2, f: [r2p[7], r2f[7]] }),
  );
  n19++;
}

// 190 — the HOOK read-scope pair gate FAIL-CLOSED: BOTH the canonical and
//      the pair-containing path exist (brackets are legal on-disk) → the
//      real file wins: NOT mutated + the pair line gate=both-exist
{
  const r3 = { filePath: ioPfDir + "\\file-[2:two].txt" };
  const r3Before = JSON.stringify(r3);
  const nLines3 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io2", callID: "c190" }, { args: r3 });
  const r3Lines = ioReadLines();
  const r3f = r3Lines[r3Lines.length - 1].split(" | ");
  check(
    String(n19),
    "S19",
    "hook read pair gate both-exist: canonical + pair path both on disk → NOT mutated + pair line gate=both-exist (1 line — fuzzy fast-path)",
    JSON.stringify(r3) === r3Before && r3Lines.length === nLines3 + 1 && r3f.length === 8 &&
      r3f[7] === "observed-redundancy-ok" && r3f[5] === "pair=[2:two] canon=2 dist=0 gate=both-exist",
    JSON.stringify({ argsAfter: JSON.stringify(r3), n: r3Lines.length - nLines3, f: r3f }),
  );
  n19++;
}

// 191 — the HOOK read-scope pair RIGHT-WINS mutation: a mismatched pair
//      ([7:eight] — left 7, right 8) mutates to the right-derived canonical
//      (file-8.txt) + pair-resolved with dist=1 flagged in the evidence
{
  const r4 = { filePath: ioPfDir + "\\file-[7:eight].txt" };
  const nLines4 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io2", callID: "c191" }, { args: r4 });
  const r4Lines = ioReadLines();
  const r4f = r4Lines[r4Lines.length - 1].split(" | ");
  check(
    String(n19),
    "S19",
    "hook read pair right-wins mutation: [7:eight] mismatch → MUTATED to file-8.txt + pair-resolved 'dist=1 gate=mutated'",
    r4.filePath === ioPfDir + "\\file-8.txt" && r4Lines.length === nLines4 + 1 && r4f.length === 8 &&
      r4f[7] === "pair-resolved" && r4f[5] === "pair=[7:eight] canon=8 dist=1 gate=mutated",
    JSON.stringify({ after: r4.filePath, n: r4Lines.length - nLines4, f: r4f }),
  );
  n19++;
}

// 192 — the HOOK NON-READ tool: a pair in a bash arg → logged ONLY
//      (observation channel), output.args NEVER mutated (the write/edit/
//      delete scope rule extends to every non-read tool)
{
  const b1 = { command: "echo [4:four]" };
  const b1Before = JSON.stringify(b1);
  const nLines5 = ioReadLines().length;
  await ioBefore({ tool: "bash", sessionID: "ses_fx_io2", callID: "c192" }, { args: b1 });
  const b1Lines = ioReadLines();
  const b1f = b1Lines[b1Lines.length - 1].split(" | ");
  check(
    String(n19),
    "S19",
    "hook non-read pair: bash [4:four] → observed-redundancy-ok line (log-only) + args byte-identical (no mutation)",
    JSON.stringify(b1) === b1Before && b1Lines.length === nLines5 + 1 && b1f.length === 8 &&
      b1f[3] === "bash" && b1f[7] === "observed-redundancy-ok" && b1f[5] === "pair=[4:four] canon=4 dist=0",
    JSON.stringify({ argsAfter: JSON.stringify(b1), n: b1Lines.length - nLines5, f: b1f }),
  );
  n19++;
}

// 193 — the SANDBOX scratchpad root (R1): SCRATCHPAD_ROOT is the approved
//      external dir; slash form, backslash+mixed-case form, and a deep path
//      are NOT out-of-sandbox (noise removed — measured); a genuinely
//      outside path still fires (the control)
{
  const s1 = ioCore.observeSandbox("C:/Users/Wasiejen/AppData/Local/Temp/opencode/x.txt", "C:\\repo");
  const s2 = ioCore.observeSandbox("c:\\users\\wasiejen\\appdata\\local\\temp\\opencode\\y.txt", "C:\\repo");
  const s3 = ioCore.observeSandbox("C:/Users/Wasiejen/AppData/Local/Temp/opencode/sub/deep/z.bin", "C:\\repo");
  const s4 = ioCore.observeSandbox("C:\\Windows\\System32\\cmd.exe", "C:\\repo");
  check(
    String(n19),
    "S19",
    "sandbox scratchpad: SCRATCHPAD_ROOT constant + slash/backslash-case/deep scratchpad paths → no out-of-sandbox; C:\\Windows control still fires",
    ioCore.SCRATCHPAD_ROOT === "C:/Users/Wasiejen/AppData/Local/Temp/opencode" &&
      s1.length === 0 && s2.length === 0 && s3.length === 0 && s4.length === 1 && s4[0].verdict === "out-of-sandbox",
    JSON.stringify({ root: ioCore.SCRATCHPAD_ROOT, n: [s1.length, s2.length, s3.length, s4.length] }),
  );
  n19++;
}

// 194 — the HOOK scratchpad: a bash arg under the scratchpad → NO lines at
//      all (the out-of-sandbox noise is gone at the hook level, too)
{
  const nLines6 = ioReadLines().length;
  await ioBefore({ tool: "bash", sessionID: "ses_fx_io2", callID: "c194" }, { args: "C:/Users/Wasiejen/AppData/Local/Temp/opencode/probe-sentinel.txt" });
  check(
    String(n19),
    "S19",
    "hook scratchpad: bash arg under the scratchpad → zero lines (no out-of-sandbox noise)",
    ioReadLines().length === nLines6,
    `n=${ioReadLines().length - nLines6}`,
  );
  n19++;
}

// ------------------------------------------------------------------ S20 write-scope pair/fuzzy (15)
//
// The R2 (2026-09-16) write-scope pair/fuzzy resolution + the bash git-ref
// channel (spec: the R2 task; design source: research/fuzzy-numword/
// decision-record.md §2 + the research doc §2.3/§3.4): the strict existence
// gate at the mutating surface (write/edit/block_transfer path fields), the
// MISMATCH fail-closed asymmetry (a wrong write is not self-correcting —
// never a mutated write target), the d<=1 write-fuzzy bar (the `scope=write`
// evidence flag — the nine VERDICTS stay byte-identical), the content-scope
// guard (pairs in content args → log line ONLY, never mutated), and the
// git-ref gate (git for-each-ref — MANDATORY; a ref run < 4 hex chars
// → the bare log-only form, the gate is not even attempted). M1 (2026-09-17,
// #72, maintainer ruling): the fuzzy channel is EXCLUDED for `write` —
// "new file" is a legal write intent, so a d=1 near-miss must never hijack
// an existing sibling; edit/block_transfer keep the channel (pins 208/209),
// the pair channel is unchanged for all three tools.

// git repo at the SANDBOX root: one seed commit + a 40-hex TAG — the
// ref-gate pins resolve via the tag name (deterministic: a 40-char hex
// string resolves only as that exact tag/sha; the 1-char-off fail ref is a
// deterministic reject regardless of the seed commit's sha)
execFileSync("git", ["init", "-q"], { cwd: SANDBOX, stdio: "ignore" });
writeFileSync(path.join(SANDBOX, "s20-seed.txt"), "s20\n", "utf8");
execFileSync("git", ["add", "s20-seed.txt"], { cwd: SANDBOX, stdio: "ignore" });
execFileSync("git", ["-c", "user.name=probe", "-c", "user.email=probe@probe", "commit", "-q", "-m", "s20 seed"], { cwd: SANDBOX, stdio: "ignore" });
// NOTE: the tags carry NO 6+ digit run — a dense run in the command string
// would fire the OBS dense channel (a second line) and break the "exactly
// one line" pins (measured: 1234abcd…ef901234… contains the run 901234)
const TAG40 = "1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a";
const FAILREF = "9b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a";
execFileSync("git", ["tag", TAG40], { cwd: SANDBOX, stdio: "ignore" });
// the write-fuzzy fixture: a dedicated single-sibling dir (gap=inf — no
// second-best to narrow the gap)
const ioWfDir = path.join(ioPfDir, "wf");
mkdirSync(ioWfDir, { recursive: true });
writeFileSync(path.join(ioWfDir, "file-4.txt"), "x", "utf8");
let n20 = 195;

// 195 — the HOOK write-scope pair gate: canonical EXISTS + pair-form path
//      absent → filePath MUTATED + a pair-resolved line (byte-exact gate
//      evidence; field 5 = the ORIGINAL pair-form arg)
{
  const w1 = { filePath: ioPfDir + "\\file-[4:four].txt" };
  const nL1 = ioReadLines().length;
  await ioBefore({ tool: "write", sessionID: "ses_fx_io2", callID: "c195" }, { args: w1 });
  const w1Lines = ioReadLines();
  const w1f = w1Lines[w1Lines.length - 1].split(" | ");
  check(
    String(n20),
    "S20",
    "hook write pair gate: canonical exists → filePath MUTATED + pair-resolved 'gate=mutated' (field 5 = original arg)",
    w1.filePath === ioPfDir + "\\file-4.txt" && w1Lines.length === nL1 + 1 && w1f.length === 8 &&
      w1f[3] === "write" && w1f[4] === JSON.stringify({ filePath: ioPfDir + "\\file-[4:four].txt" }) &&
      w1f[5] === "pair=[4:four] canon=4 dist=0 gate=mutated" && w1f[7] === "pair-resolved",
    JSON.stringify({ after: w1.filePath, n: w1Lines.length - nL1, f: w1f }),
  );
  n20++;
}

// 196 — the HOOK write-scope pair gate FAIL-CLOSED: canonical ABSENT → NOT
//      mutated (byte-identical) + the pair line gate=none-exist + NO fuzzy
//      line (M1, 2026-09-17, #72: the write fuzzy channel is excluded —
//      exactly ONE line for the call)
{
  const w2 = { filePath: ioPfDir + "\\file-[7:seven].txt" };
  const w2Before = JSON.stringify(w2);
  const nL2 = ioReadLines().length;
  await ioBefore({ tool: "write", sessionID: "ses_fx_io2", callID: "c196" }, { args: w2 });
  const w2Lines = ioReadLines();
  const w2p = w2Lines[w2Lines.length - 1].split(" | ");
  check(
    String(n20),
    "S20",
    "hook write pair gate fail-closed: canonical absent → NOT mutated + 'gate=none-exist' + NO fuzzy line (M1: zero lines beyond the pair line)",
    JSON.stringify(w2) === w2Before && w2Lines.length === nL2 + 1 &&
      w2p[7] === "observed-redundancy-ok" && w2p[5] === "pair=[7:seven] canon=7 dist=0 gate=none-exist",
    JSON.stringify({ argsAfter: JSON.stringify(w2), n: w2Lines.length - nL2, f: w2p }),
  );
  n20++;
}

// 197 — the HOOK write-scope pair gate: BOTH the canonical and the pair-form
//      path exist (brackets legal on-disk, S19 fixture) → the real file wins:
//      NOT mutated + the pair line gate=both-exist (exactly ONE line — the
//      fuzzy channel fast-paths the existing original)
{
  const w3 = { filePath: ioPfDir + "\\file-[2:two].txt" };
  const w3Before = JSON.stringify(w3);
  const nL3 = ioReadLines().length;
  await ioBefore({ tool: "write", sessionID: "ses_fx_io2", callID: "c197" }, { args: w3 });
  const w3Lines = ioReadLines();
  const w3f = w3Lines[w3Lines.length - 1].split(" | ");
  check(
    String(n20),
    "S20",
    "hook write pair gate both-exist: NOT mutated + 'gate=both-exist' (one line, no fuzzy line)",
    JSON.stringify(w3) === w3Before && w3Lines.length === nL3 + 1 &&
      w3f[5] === "pair=[2:two] canon=2 dist=0 gate=both-exist" && w3f[7] === "observed-redundancy-ok",
    JSON.stringify({ argsAfter: JSON.stringify(w3), n: w3Lines.length - nL3, f: w3f }),
  );
  n20++;
}

// 198 — the HOOK write-scope MISMATCH ASYMMETRY (§2.3): [7:eight] mismatches
//      and the canonical file-8.txt EXISTS — the write scope FAILS CLOSED
//      (NOT mutated, gate=fail-closed; contrast the read scope which
//      resolves on mismatch — the S19 pin 191) + NO fuzzy line (M1)
{
  const w4 = { filePath: ioPfDir + "\\file-[7:eight].txt" };
  const w4Before = JSON.stringify(w4);
  const nL4 = ioReadLines().length;
  await ioBefore({ tool: "write", sessionID: "ses_fx_io2", callID: "c198" }, { args: w4 });
  const w4Lines = ioReadLines();
  const w4m = w4Lines[w4Lines.length - 1].split(" | ");
  check(
    String(n20),
    "S20",
    "hook write mismatch FAIL-CLOSED: [7:eight] + file-8.txt exists → NOT mutated + redundancy-mismatch 'gate=fail-closed' + NO fuzzy line (M1)",
    JSON.stringify(w4) === w4Before && w4Lines.length === nL4 + 1 &&
      w4m[7] === "redundancy-mismatch" && w4m[5] === "pair=[7:eight] canon=8 dist=1 gate=fail-closed",
    JSON.stringify({ argsAfter: JSON.stringify(w4), n: w4Lines.length - nL4, f: w4m }),
  );
  n20++;
}

// 199 — the HOOK block_transfer: the srcFile pair is gated (mutated); the
//      clean dstFile (an existing path) stays byte-identical (no line)
{
  const b2 = { srcFile: ioPfDir + "\\file-[8:eight].txt", dstFile: ioPfDir + "\\file-4.txt" };
  const b2Before = JSON.stringify(b2);
  const nL5 = ioReadLines().length;
  await ioBefore({ tool: "block_transfer", sessionID: "ses_fx_io2", callID: "c199" }, { args: b2 });
  const b2Lines = ioReadLines();
  const b2f = b2Lines[b2Lines.length - 1].split(" | ");
  check(
    String(n20),
    "S20",
    "hook block_transfer: srcFile pair MUTATED (gate=mutated) + dstFile byte-identical (one line)",
    b2.srcFile === ioPfDir + "\\file-8.txt" && b2.dstFile === JSON.parse(b2Before).dstFile &&
      b2Lines.length === nL5 + 1 && b2f[3] === "block_transfer" &&
      b2f[5] === "pair=[8:eight] canon=8 dist=0 gate=mutated" && b2f[7] === "pair-resolved",
    JSON.stringify({ after: b2, n: b2Lines.length - nL5, f: b2f }),
  );
  n20++;
}

// 200 — the HOOK write-scope FUZZY exclusion (M1, 2026-09-17, #72): a
//      mistyped write path with a d=1 existing sibling (single-sibling dir —
//      gap=inf) → NOT mutated + ZERO new log lines (the d=1 near-miss must
//      not hijack — "new file" is a legal write intent)
{
  const f1 = { filePath: ioWfDir + "\\file-9.txt" };
  const f1Before = JSON.stringify(f1);
  const nL6 = ioReadLines().length;
  await ioBefore({ tool: "write", sessionID: "ses_fx_io2", callID: "c200" }, { args: f1 });
  const f1Lines = ioReadLines();
  check(
    String(n20),
    "S20",
    "hook write fuzzy d=1: file-9.txt → NOT mutated + ZERO new log lines (M1: no fuzzy channel for write)",
    JSON.stringify(f1) === f1Before && f1Lines.length === nL6,
    JSON.stringify({ argsAfter: JSON.stringify(f1), n: f1Lines.length - nL6 }),
  );
  n20++;
}

// 201 — the HOOK write-scope FUZZY exclusion (M1): a d=2 write path → NOT
//      mutated + ZERO new log lines (same exclusion as 200 — nothing is
//      logged for a bare write miss; the d<=1 bar question is moot for
//      write until the channel exists again)
{
  const f2 = { filePath: ioWfDir + "\\file-56.txt" };
  const f2Before = JSON.stringify(f2);
  const nL7 = ioReadLines().length;
  await ioBefore({ tool: "write", sessionID: "ses_fx_io2", callID: "c201" }, { args: f2 });
  const f2Lines = ioReadLines();
  check(
    String(n20),
    "S20",
    "hook write fuzzy d=2: file-56.txt → NOT mutated + ZERO new log lines (M1: no fuzzy channel for write)",
    JSON.stringify(f2) === f2Before && f2Lines.length === nL7,
    JSON.stringify({ argsAfter: JSON.stringify(f2), n: f2Lines.length - nL7 }),
  );
  n20++;
}

// 202 — the CONTENT-SCOPE GUARD (write): a grammar-valid pair in the CONTENT
//      arg (`args[1:one]` — the python-slice collision, the maintainer's
//      2026-09-16 case) → ONE log line ONLY, args byte-identical (no
//      mutation — the guard is scope, not grammar)
{
  const c1 = { filePath: ioPfDir + "\\file-4.txt", content: "x = args[1:one] + y" };
  const c1Before = JSON.stringify(c1);
  const nL8 = ioReadLines().length;
  await ioBefore({ tool: "write", sessionID: "ses_fx_io2", callID: "c202" }, { args: c1 });
  const c1Lines = ioReadLines();
  const c1f = c1Lines[c1Lines.length - 1].split(" | ");
  check(
    String(n20),
    "S20",
    "content-scope guard (write): pair in content → log line ONLY (observation form), args byte-identical",
    JSON.stringify(c1) === c1Before && c1Lines.length === nL8 + 1 &&
      c1f[7] === "observed-redundancy-ok" && c1f[5] === "pair=[1:one] canon=1 dist=0",
    JSON.stringify({ argsAfter: JSON.stringify(c1), n: c1Lines.length - nL8, f: c1f }),
  );
  n20++;
}

// 203 — the CONTENT-SCOPE GUARD (edit): a pair in oldString → ONE log line
//      ONLY, args byte-identical (oldString/newString are NEVER mutated, ever)
{
  const c2 = { filePath: ioPfDir + "\\file-4.txt", oldString: "a[2:two]b", newString: "a2b" };
  const c2Before = JSON.stringify(c2);
  const nL9 = ioReadLines().length;
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io2", callID: "c203" }, { args: c2 });
  const c2Lines = ioReadLines();
  const c2f = c2Lines[c2Lines.length - 2].split(" | ");
  const c2h = c2Lines[c2Lines.length - 1].split(" | ");
  check(
    String(n20),
    "S20",
    "content-scope guard (edit): pair in oldString → log line ONLY, args byte-identical (+ the R6 hint line LAST — oldString absent from the file → fail-closed no-candidate)",
    JSON.stringify(c2) === c2Before && c2Lines.length === nL9 + 2 &&
      c2f[7] === "observed-redundancy-ok" && c2f[5] === "pair=[2:two] canon=2 dist=0" &&
      c2h[7] === "no-candidate" && c2h[5] === "hint reason=no-anchor-line" && c2h[6] === "edit oldString",
    JSON.stringify({ argsAfter: JSON.stringify(c2), n: c2Lines.length - nL9, f: c2f, h: c2h }),
  );
  n20++;
}

// 204 — the HOOK bash git-ref gate PASS: the pair → digit, the maximal hex
//      run (the 40-hex tag) exists as a ref → the command is MUTATED +
//      pair-resolved 'gate=ref-mutated run=<tag>' (byte-exact)
{
  const g1 = { command: `git log [1:one]b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a` };
  const nL10 = ioReadLines().length;
  await ioBefore({ tool: "bash", sessionID: "ses_fx_io2", callID: "c204" }, { args: g1 });
  const g1Lines = ioReadLines();
  const g1f = g1Lines[g1Lines.length - 1].split(" | ");
  check(
    String(n20),
    "S20",
    "hook bash git-ref gate PASS: ref verifies → command MUTATED + pair-resolved 'gate=ref-mutated run=<tag40>'",
    g1.command === `git log ${TAG40}` && g1Lines.length === nL10 + 1 &&
      g1f[3] === "bash" && g1f[5] === `pair=[1:one] canon=1 dist=0 gate=ref-mutated run=${TAG40}` &&
      g1f[7] === "pair-resolved",
    JSON.stringify({ after: g1.command, n: g1Lines.length - nL10, f: g1f }),
  );
  n20++;
}

// 205 — the HOOK bash git-ref gate FAIL: the 1-char-off ref does NOT
//      ref does not exist → NOT mutated (byte-identical) + the pair line
//      'gate=ref-rejected run=<failref>' (observed-redundancy-ok — the gate
//      is mandatory, research §3.4)
{
  const g2 = { command: `git log [9:nine]b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a` };
  const g2Before = JSON.stringify(g2);
  const nL11 = ioReadLines().length;
  await ioBefore({ tool: "bash", sessionID: "ses_fx_io2", callID: "c205" }, { args: g2 });
  const g2Lines = ioReadLines();
  const g2f = g2Lines[g2Lines.length - 1].split(" | ");
  check(
    String(n20),
    "S20",
    "hook bash git-ref gate FAIL: ref unverified → NOT mutated + 'gate=ref-rejected run=<failref>'",
    JSON.stringify(g2) === g2Before && g2Lines.length === nL11 + 1 &&
      g2f[5] === `pair=[9:nine] canon=9 dist=0 gate=ref-rejected run=${FAILREF}` && g2f[7] === "observed-redundancy-ok",
    JSON.stringify({ argsAfter: JSON.stringify(g2), n: g2Lines.length - nL11, f: g2f }),
  );
  n20++;
}

// 206 — the HOOK bash git-ref MISMATCH: [9:eight] fails closed — the bare
//      log-only line (no gate attempt, no mutation; the mismatch evidence
//      carries both values — the agent decides)
{
  const g3 = { command: `git log [9:eight]b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a` };
  const g3Before = JSON.stringify(g3);
  const nL12 = ioReadLines().length;
  await ioBefore({ tool: "bash", sessionID: "ses_fx_io2", callID: "c206" }, { args: g3 });
  const g3Lines = ioReadLines();
  const g3f = g3Lines[g3Lines.length - 1].split(" | ");
  check(
    String(n20),
    "S20",
    "hook bash git-ref mismatch: NOT mutated + bare 'redundancy-mismatch' line (no gate attempt)",
    JSON.stringify(g3) === g3Before && g3Lines.length === nL12 + 1 &&
      g3f[5] === "pair=[9:eight] canon=8 dist=1" && g3f[7] === "redundancy-mismatch",
    JSON.stringify({ argsAfter: JSON.stringify(g3), n: g3Lines.length - nL12, f: g3f }),
  );
  n20++;
}

// 207 — the HOOK bash git-ref NO-CANDIDATE: [4:foour] (unknown word) →
//      no-candidate gate=right-unknown, NOT mutated, the gate is not even
//      attempted (no candidate ref exists)
{
  const g4 = { command: "git log [4:foour]234abcd" };
  const g4Before = JSON.stringify(g4);
  const nL13 = ioReadLines().length;
  await ioBefore({ tool: "bash", sessionID: "ses_fx_io2", callID: "c207" }, { args: g4 });
  const g4Lines = ioReadLines();
  const g4f = g4Lines[g4Lines.length - 1].split(" | ");
  check(
    String(n20),
    "S20",
    "hook bash git-ref no-candidate: 'gate=right-unknown', NOT mutated (gate not attempted)",
    JSON.stringify(g4) === g4Before && g4Lines.length === nL13 + 1 &&
      g4f[5] === "pair=[4:foour] gate=right-unknown" && g4f[7] === "no-candidate",
    JSON.stringify({ argsAfter: JSON.stringify(g4), n: g4Lines.length - nL13, f: g4f }),
  );
  n20++;
}

// 208 — the HOOK EDIT-scope FUZZY (M1: edit KEEPS the channel): the wf
//      fixture's d=1 sibling (file-9.txt vs file-4.txt, single-sibling dir —
//      gap=inf) → MUTATED to the real path + fuzzy-resolved scope=write
{
  const e1 = { filePath: ioWfDir + "\\file-9.txt" };
  const nL14 = ioReadLines().length;
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io2", callID: "c208" }, { args: e1 });
  const e1Lines = ioReadLines();
  const e1f = e1Lines[e1Lines.length - 1].split(" | ");
  check(
    String(n20),
    "S20",
    "hook edit fuzzy d=1: file-9.txt → MUTATED to file-4.txt + fuzzy-resolved 'scope=write … d=1 gap=inf' (edit keeps the channel — M1)",
    e1.filePath === ioWfDir + "\\file-4.txt" && e1Lines.length === nL14 + 1 &&
      e1f[3] === "edit" && e1f[7] === "fuzzy-resolved" &&
      e1f[5].includes("fuzzy scope=write orig=") && e1f[5].includes("-> file-4.txt d=1 gap=inf"),
    JSON.stringify({ after: e1.filePath, n: e1Lines.length - nL14, f: e1f }),
  );
  n20++;
}

// 209 — the HOOK EDIT-scope FUZZY bar (M1: edit keeps the d<=1 bar): d=2 →
//      NOT mutated + fuzzy-rejected scope=write reason=d-too-high
{
  const e2 = { filePath: ioWfDir + "\\file-56.txt" };
  const e2Before = JSON.stringify(e2);
  const nL15 = ioReadLines().length;
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io2", callID: "c209" }, { args: e2 });
  const e2Lines = ioReadLines();
  const e2f = e2Lines[e2Lines.length - 1].split(" | ");
  check(
    String(n20),
    "S20",
    "hook edit fuzzy d=2: file-56.txt vs file-4.txt → NOT mutated + fuzzy-rejected scope=write reason=d-too-high (edit keeps the bar — M1)",
    JSON.stringify(e2) === e2Before && e2Lines.length === nL15 + 1 &&
      e2f[3] === "edit" && e2f[7] === "fuzzy-rejected" && e2f[5].includes("scope=write") &&
      e2f[5].includes("cands=file-4.txt 2") && e2f[5].includes("reason=d-too-high"),
    JSON.stringify({ argsAfter: JSON.stringify(e2), n: e2Lines.length - nL15, f: e2f }),
  );
  n20++;
}

// ------------------------------------------------------------------ S21 R7 segment-level channel (12)
//
// The R7 (2026-09-17) segment-level matcher: a path is a sequence of
// FOLDER UNITS; distance counts per segment (one extra / one mismatched
// folder = 1); the substitution bar (a segment substitution counts as
// seg-d 1 ONLY when the two names are char-close — intra-segment
// levenshtein <= 1); the >=2-segment hook gate (a 1-segment arg BYPASSes
// the segment matcher — the char channel owns bare filenames, the S18/S20
// evidence pins; the doubling case is structurally >=2); the kind=seg
// evidence flag (the 9-verdict vocabulary is untouched); the M1 exclusion
// extends to the segment channel. The #73 (2026-09-17) STRUCTURAL
// dedup-collapse pre-check (before the corpus matchers): an adjacent
// identical FOLDER pair in the ABSOLUTE path (the rel form has no pair —
// nearestExistingDir absorbs one) → collapse one copy; the collapsed path
// EXISTS → kind=dedup d=0 (NO gap field — structural, not a distance
// match); absent → fail-closed fall-through:
// (210) HOOK read doubled-seg → MUTATED + kind=dedup scope=read d=0 (the
//       #73 collapse fires first — the collapse target EXISTS);
// (211) HOOK edit doubled-seg → MUTATED + kind=dedup scope=write d=0;
// (212) HOOK write doubled-seg → NOT mutated + ZERO lines (M1);
// (213) PURE lev-1 folder mismatch → resolved d=1 (the substitution bar);
// (214) HOOK char-far folder mismatch → NOT mutated + fuzzy-rejected
//       (seg-rejected → the char fallback also rejects, NO kind=seg);
// (215) PURE seg-d=2 (two insertions) → rejected d-too-high;
// (216) PURE two candidates tied at seg-d=1 → rejected gap-too-small;
// (217) PURE 2-segment filename typo → resolved d=1 (the segment channel
//       subsumes a char-close name typo inside a folder);
// (218) HOOK read doubled-NESTED (the realistic shape, the collapse
//       target EXISTS) → MUTATED + kind=dedup scope=read d=0;
// (219) HOOK edit doubled-nested → MUTATED + kind=dedup scope=write d=0;
// (220) HOOK read doubled-nested, collapse target ABSENT → NOT mutated +
//       fuzzy-rejected (NO kind=dedup — the fail-closed fall-through);
// (221) HOOK write doubled-nested → NOT mutated + ZERO lines (M1 extends
//       to the dedup pre-check).
// fixture: doubled-folder + mismatched-folder shapes under the sandbox
// + the realistic nested-doubling shape (the seg channel REJECTS it —
// the target's parent DIR is a corpus entry, keeping the best at
// seg-d 2 → the target at seg-d 1 → gap 1 < FUZZY_MIN_GAP)
const ioSegDir = path.join(ioSandboxProj, "seg");
mkdirSync(path.join(ioSegDir, "dd"), { recursive: true });
mkdirSync(path.join(ioSegDir, "mm", "sub"), { recursive: true });
writeFileSync(path.join(ioSegDir, "dd", "real-a.txt"), "x", "utf8");
writeFileSync(path.join(ioSegDir, "dd", "sib-zzz.txt"), "x", "utf8");
writeFileSync(path.join(ioSegDir, "mm", "sub", "x.txt"), "x", "utf8");
writeFileSync(path.join(ioSegDir, "mm", "other-zz.txt"), "x", "utf8");
let n21 = 210;

// 210 — #73 pin (R7 re-pin): HOOK READ doubled segment — the STRUCTURAL
//      dedup-collapse pre-check fires FIRST (the collapse target EXISTS —
//      the doubled folder; the rel form has no pair): MUTATED + kind=dedup
//      scope=read d=0 (the segment channel is never reached)
{
  const s1 = { filePath: ioSegDir + "\\dd\\dd\\real-a.txt" };
  const nL1 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io2", callID: "c210" }, { args: s1 });
  const s1Lines = ioReadLines();
  const s1f = s1Lines[s1Lines.length - 1].split(" | ");
  check(
    String(n21),
    "S21",
    "hook read doubled-seg: dd\\dd\\real-a.txt → MUTATED to dd\\real-a.txt + fuzzy-resolved kind=dedup scope=read d=0 (the #73 collapse pre-check fires before the segment channel)",
    s1.filePath === ioSegDir + "\\dd\\real-a.txt" && s1Lines.length === nL1 + 1 &&
      s1f[3] === "read" && s1f[7] === "fuzzy-resolved" &&
      // the evidence format is byte-exact; the log FIELD is cap-truncated
      // (MAX_FIELD_CHARS, the `...` marker) — expected via the SAME
      // flattenField the hook's log path uses
      s1f[5] === ioCore.flattenField(`fuzzy kind=dedup scope=read orig=${ioSegDir}\\dd\\dd\\real-a.txt -> ${ioSegDir}\\dd\\real-a.txt d=0`),
    JSON.stringify({ after: s1.filePath, n: s1Lines.length - nL1, f: s1f }),
  );
  n21++;
}

// 211 — #73 pin (R7 re-pin): HOOK EDIT doubled segment (write scope KEEPS
//      the channel) → MUTATED + kind=dedup scope=write d=0
{
  const s2 = { filePath: ioSegDir + "\\dd\\dd\\real-a.txt" };
  const nL2 = ioReadLines().length;
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io2", callID: "c211" }, { args: s2 });
  const s2Lines = ioReadLines();
  const s2f = s2Lines[s2Lines.length - 1].split(" | ");
  check(
    String(n21),
    "S21",
    "hook edit doubled-seg: MUTATED to dd\\real-a.txt + fuzzy-resolved kind=dedup scope=write d=0 (the #73 collapse pre-check fires before the segment channel)",
    s2.filePath === ioSegDir + "\\dd\\real-a.txt" && s2Lines.length === nL2 + 1 &&
      s2f[3] === "edit" && s2f[7] === "fuzzy-resolved" &&
      s2f[5] === ioCore.flattenField(`fuzzy kind=dedup scope=write orig=${ioSegDir}\\dd\\dd\\real-a.txt -> ${ioSegDir}\\dd\\real-a.txt d=0`),
    JSON.stringify({ after: s2.filePath, n: s2Lines.length - nL2, f: s2f }),
  );
  n21++;
}

// 212 — R7 pin 3: HOOK WRITE doubled segment → the M1 exclusion extends to
//      the segment channel: NOT mutated + ZERO new log lines
{
  const s3 = { filePath: ioSegDir + "\\dd\\dd\\real-a.txt", content: "x" };
  const s3Before = JSON.stringify(s3);
  const nL3 = ioReadLines().length;
  await ioBefore({ tool: "write", sessionID: "ses_fx_io2", callID: "c212" }, { args: s3 });
  check(
    String(n21),
    "S21",
    "hook write doubled-seg: NOT mutated + ZERO new log lines (M1 — the exclusion extends to the segment channel)",
    JSON.stringify(s3) === s3Before && ioReadLines().length === nL3,
    JSON.stringify({ argsAfter: JSON.stringify(s3), n: ioReadLines().length - nL3 }),
  );
  n21++;
}

// 213 — R7 pin 4: PURE lev-1 folder mismatch — a segment SUBSTITUTION at
//      the intra-seg char bar (OpenCodeProject vs OpenCodeProjects, lev 1)
//      → resolved seg-d 1 (the substitution bar)
{
  const s4 = ioCore.matchNearPathSegments(
    "OpenCodeProject/Free-Snap-Tap/x.txt",
    ["OpenCodeProjects/Free-Snap-Tap/x.txt", "zzz/qqq/w.txt"],
  );
  check(
    String(n21),
    "S21",
    "pure lev-1 folder mismatch: OpenCodeProject/… → resolved d=1 (the substitution bar: intra-seg lev <= 1 counts as seg-d 1)",
    JSON.stringify(s4) === '{"kind":"resolved","path":"OpenCodeProjects/Free-Snap-Tap/x.txt","d":1,"gap":4}',
    JSON.stringify(s4),
  );
  n21++;
}

// 214 — R7 pin 5: HOOK char-far folder mismatch (zzz vs sub — the
//      substitution is NON-substitutable) → NOT mutated + fuzzy-rejected
//      (the seg channel rejects at seg-d 2; the char fallback ALSO rejects
//      at d=3 — the line is the char-form rejection, NO kind=seg)
{
  const s5 = { filePath: ioSegDir + "\\mm\\zzz\\x.txt" };
  const s5Before = JSON.stringify(s5);
  const nL4 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io2", callID: "c214" }, { args: s5 });
  const s5Lines = ioReadLines();
  const s5f = s5Lines[s5Lines.length - 1].split(" | ");
  check(
    String(n21),
    "S21",
    "hook char-far folder mismatch: mm\\zzz\\x.txt → NOT mutated + fuzzy-rejected (seg-rejected → the char fallback also rejects; NO kind=seg)",
    JSON.stringify(s5) === s5Before && s5Lines.length === nL4 + 1 &&
      s5f[3] === "read" && s5f[7] === "fuzzy-rejected" &&
      !s5f[5].includes("kind=seg") && s5f[5].includes("reason=d-too-high"),
    JSON.stringify({ argsAfter: JSON.stringify(s5), n: s5Lines.length - nL4, f: s5f }),
  );
  n21++;
}

// 215 — R7 pin 6: PURE seg-d=2 (two INSERTIONS: px/qa before a/b.txt) →
//      rejected d-too-high (the seg-d<=1 bar)
{
  const s6 = ioCore.matchNearPathSegments("px/qa/a/b.txt", ["a/b.txt", "zz/w.txt"]);
  check(
    String(n21),
    "S21",
    "pure seg-d=2 (two insertions): px/qa/a/b.txt → rejected d-too-high (the seg-d<=1 bar)",
    JSON.stringify(s6) === '{"kind":"rejected","cands":[["a/b.txt",2],["zz/w.txt",5]],"reason":"d-too-high"}',
    JSON.stringify(s6),
  );
  n21++;
}

// 216 — R7 pin 7: PURE two candidates TIED at seg-d=1 (a/b.txt vs
//      b/b.txt and c/b.txt) → rejected gap-too-small (the gap rule)
{
  const s7 = ioCore.matchNearPathSegments("a/b.txt", ["b/b.txt", "c/b.txt"]);
  check(
    String(n21),
    "S21",
    "pure tie at seg-d=1: a/b.txt vs [b/b.txt, c/b.txt] → rejected gap-too-small (the gap rule)",
    JSON.stringify(s7) === '{"kind":"rejected","cands":[["b/b.txt",1],["c/b.txt",1]],"reason":"gap-too-small"}',
    JSON.stringify(s7),
  );
  n21++;
}

// 217 — R7 pin 8: PURE 2-segment filename typo (sub/file-x.txt vs
//      sub/file-4.txt — the folder matches, the name is a char-close
//      substitution) → resolved seg-d 1: the segment channel SUBSUMES a
//      char-close name typo inside a folder (the 1-segment form is the
//      char channel's — the bypass rule, the S18/S20 pins)
{
  const s8 = ioCore.matchNearPathSegments("sub/file-x.txt", ["sub/file-4.txt"]);
  check(
    String(n21),
    "S21",
    "pure 2-seg filename typo: sub/file-x.txt → resolved d=1 gap=inf (the segment channel subsumes the char-close name typo)",
    s8.kind === "resolved" && s8.path === "sub/file-4.txt" && s8.d === 1 && s8.gap === Infinity,
    JSON.stringify(s8),
  );
  n21++;
}

// #73 (2026-09-17): the REALISTIC nested-doubling fixture — a target whose
// PARENT DIR is a corpus entry + a sibling project (replicating the
// scratchpad repro: OpenCodeProjects/Free-Snap-Tap/TODO.md +
// OpenCodeProjects/SiblingProj/whatever.md). The seg channel REJECTS this
// shape (the parent-dir corpus entry keeps the best at seg-d 2 → the
// target at seg-d 1 → gap 1 < FUZZY_MIN_GAP) — only the structural
// collapse resolves it
const ioRnDir = path.join(ioSegDir, "rn");
mkdirSync(path.join(ioRnDir, "OpenCodeProjects", "Free-Snap-Tap"), { recursive: true });
mkdirSync(path.join(ioRnDir, "OpenCodeProjects", "SiblingProj"), { recursive: true });
writeFileSync(path.join(ioRnDir, "OpenCodeProjects", "Free-Snap-Tap", "TODO.md"), "x", "utf8");
writeFileSync(path.join(ioRnDir, "OpenCodeProjects", "SiblingProj", "whatever.md"), "x", "utf8");

// 218 — #73 pin 1: HOOK READ doubled NESTED (the realistic shape — the
//      collapse target EXISTS) → MUTATED + kind=dedup scope=read d=0
{
  const r1 = { filePath: ioRnDir + "\\OpenCodeProjects\\OpenCodeProjects\\Free-Snap-Tap\\TODO.md" };
  const nR1 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io2", callID: "c218" }, { args: r1 });
  const r1Lines = ioReadLines();
  const r1f = r1Lines[r1Lines.length - 1].split(" | ");
  check(
    String(n21),
    "S21",
    "hook read doubled-nested (the realistic shape): MUTATED to the collapsed path + fuzzy-resolved kind=dedup scope=read d=0 (the seg channel REJECTS this shape — the parent-dir corpus entry kills the gap)",
    r1.filePath === ioRnDir + "\\OpenCodeProjects\\Free-Snap-Tap\\TODO.md" && r1Lines.length === nR1 + 1 &&
      r1f[3] === "read" && r1f[7] === "fuzzy-resolved" &&
      r1f[5] === ioCore.flattenField(`fuzzy kind=dedup scope=read orig=${ioRnDir}\\OpenCodeProjects\\OpenCodeProjects\\Free-Snap-Tap\\TODO.md -> ${ioRnDir}\\OpenCodeProjects\\Free-Snap-Tap\\TODO.md d=0`),
    JSON.stringify({ after: r1.filePath, n: r1Lines.length - nR1, f: r1f }),
  );
  n21++;
}

// 219 — #73 pin 2: HOOK EDIT doubled NESTED → MUTATED + kind=dedup
//      scope=write d=0 (the write scope keeps the channel — M1)
{
  const r2 = { filePath: ioRnDir + "\\OpenCodeProjects\\OpenCodeProjects\\Free-Snap-Tap\\TODO.md" };
  const nR2 = ioReadLines().length;
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io2", callID: "c219" }, { args: r2 });
  const r2Lines = ioReadLines();
  const r2f = r2Lines[r2Lines.length - 1].split(" | ");
  check(
    String(n21),
    "S21",
    "hook edit doubled-nested: MUTATED to the collapsed path + fuzzy-resolved kind=dedup scope=write d=0",
    r2.filePath === ioRnDir + "\\OpenCodeProjects\\Free-Snap-Tap\\TODO.md" && r2Lines.length === nR2 + 1 &&
      r2f[3] === "edit" && r2f[7] === "fuzzy-resolved" &&
      r2f[5] === ioCore.flattenField(`fuzzy kind=dedup scope=write orig=${ioRnDir}\\OpenCodeProjects\\OpenCodeProjects\\Free-Snap-Tap\\TODO.md -> ${ioRnDir}\\OpenCodeProjects\\Free-Snap-Tap\\TODO.md d=0`),
    JSON.stringify({ after: r2.filePath, n: r2Lines.length - nR2, f: r2f }),
  );
  n21++;
}

// 220 — #73 pin 3: HOOK READ doubled NESTED where the collapse target is
//      ABSENT (OpenCodeProjects/TODO.md does not exist) → NOT mutated +
//      fuzzy-rejected, NO kind=dedup line (the fail-closed fall-through;
//      the seg AND char channels both reject → the char-form line)
{
  const r3 = { filePath: ioRnDir + "\\OpenCodeProjects\\OpenCodeProjects\\TODO.md" };
  const r3Before = JSON.stringify(r3);
  const nR3 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io2", callID: "c220" }, { args: r3 });
  const r3Lines = ioReadLines();
  const r3f = r3Lines[r3Lines.length - 1].split(" | ");
  check(
    String(n21),
    "S21",
    "hook read doubled-nested, collapse target ABSENT: NOT mutated + fuzzy-rejected (NO kind=dedup — the fail-closed fall-through; NO kind=seg either)",
    JSON.stringify(r3) === r3Before && r3Lines.length === nR3 + 1 &&
      r3f[3] === "read" && r3f[7] === "fuzzy-rejected" &&
      !r3f[5].includes("kind=dedup") && !r3f[5].includes("kind=seg"),
    JSON.stringify({ argsAfter: JSON.stringify(r3), n: r3Lines.length - nR3, f: r3f }),
  );
  n21++;
}

// 221 — #73 pin 4: HOOK WRITE doubled NESTED → NOT mutated + ZERO new log
//      lines (M1 — the exclusion extends to the dedup pre-check:
//      runFuzzyWrite is never called for `write`)
{
  const r4 = { filePath: ioRnDir + "\\OpenCodeProjects\\OpenCodeProjects\\Free-Snap-Tap\\TODO.md", content: "x" };
  const r4Before = JSON.stringify(r4);
  const nR4 = ioReadLines().length;
  await ioBefore({ tool: "write", sessionID: "ses_fx_io2", callID: "c221" }, { args: r4 });
  check(
    String(n21),
    "S21",
    "hook write doubled-nested: NOT mutated + ZERO new log lines (M1 — the exclusion extends to the dedup pre-check)",
    JSON.stringify(r4) === r4Before && ioReadLines().length === nR4,
    JSON.stringify({ argsAfter: JSON.stringify(r4), n: ioReadLines().length - nR4 }),
  );
  n21++;
}

// ------------------------------------------------------------------ S22 submit tool (9) — the #53 Part B pin (2026-09-18): the unified append tool for the three agent-inbox channels
//
// The custom tool at .opencode/tools/submit.ts (approved
// 2026-09-17_agent-feedback-closedown.md, Part B): ONE unified append tool
// for the three agent-inbox channels — feedback (the #53 friction log),
// knowledge (the knowledge inbox), todo (the loose-findings inbox). The
// tool machine-stamps each entry (<header> <YYYY-MM-DD_HH-MM> <role>
// <session> + the raw text + one trailing blank line) and APPENDS it to
// its HARDCODED target — the NO-path-parameter IS the sandbox (note the
// deliberate deviation from the proposal's ".opencode/ subtree" wording:
// todo_inbox.md sits at the project root — the spec ratifies the three
// exact paths). Imported DIRECT (type-stripped, the S12/S13/S16 load
// pattern). Driven with context.directory = sandbox roots — the targets
// land in the sandbox, the real .opencode/agent/agent_feedback.md /
// knowledge_inbox.md / todo_inbox.md are NEVER touched (S5 hygiene
// verifies zero writes outside the sandbox). The stamp is local-clock,
// minute resolution — pinned by FORMAT (regex) + the minute-boundary
// before/after trick, never the exact value. role + session are AUTO-FILLED from the tool context (context.agent / context.sessionID, falling back to `agent`/`unknown`) — the agent supplies the three channel texts only; there is NO role/session parameter. Plain tool() object: no
// plugin hooks — the S5 tallies are unaffected.
const SUB_TOOL_TS = path.join(REPO_ROOT, ".opencode", "tools", "submit.ts");
const SUB_FB = path.join(SANDBOX, "submit-fb"); // no-params error + the feedback append (checks 230/231)
const SUB_KN = path.join(SANDBOX, "submit-kn"); // the knowledge append (check 234)
const SUB_TODO = path.join(SANDBOX, "submit-todo"); // the todo append (check 235)
const SUB_KEEP = path.join(SANDBOX, "submit-keep"); // the never-read preservation (check 238)
const SUB_NO_PARAMS_ERR = "error: none of feedback/knowledge/todo provided — nothing written";
const SUB_REL = {
  feedback: ".opencode/agent/agent_feedback.md",
  knowledge: ".opencode/agent/knowledge/knowledge_inbox.md",
  todo: "todo_inbox.md",
};
const SUB_HDR = { feedback: "###", knowledge: "##", todo: "##" };
const subEntry = (k, s, role, ses, text) => `${SUB_HDR[k]} ${s} ${role} ${ses}\n${text}\n\n`;
const subBlock = (k, entry) => `${k}\ntarget: ${SUB_REL[k]}\nentry: ${entry}`;
const subStampNow = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
};
let n22 = 230;
let subTool;

// 230 — registration shape (1 of 3): the tool file imports (type-stripped,
//      direct) and exposes the tool() default export: description
//      (non-empty string) + the 3 channel args IN ORDER
//      (feedback/knowledge/todo — role/session are GONE, auto-filled from
//      the tool context) + an execute function
{
  const toolMod = await import(pathToFileURL(SUB_TOOL_TS).href);
  subTool = toolMod.default;
  const argKeys = Object.keys(subTool?.args ?? {});
  check(
    String(++n22),
    "S23",
    "submit tool file imports (type-stripped, direct) and exposes the tool() default export (description + args [feedback, knowledge, todo] + execute; role/session GONE from the schema)",
    subTool != null && typeof subTool.description === "string" && subTool.description.length > 0 &&
      JSON.stringify(argKeys) === JSON.stringify(["feedback", "knowledge", "todo"]) &&
      typeof subTool.execute === "function",
    JSON.stringify({ keys: argKeys, descType: typeof subTool?.description }),
  );
}

// 231 — registration shape (2 of 3): NO stale `name`/`parameters` keys —
//      the host names the tool by FILENAME (the committed tool() form)
{
  check(
    String(++n22),
    "S22",
    "NO stale `name`/`parameters` keys (the host names the tool by FILENAME)",
    subTool != null && !("name" in subTool) && !("parameters" in subTool),
    JSON.stringify({ nameIn: "name" in (subTool ?? {}), parametersIn: "parameters" in (subTool ?? {}) }),
  );
}

// 232 — registration shape (3 of 3): execute is an ASYNC function
{
  check(
    String(++n22),
    "S22",
    "execute is an AsyncFunction",
    subTool != null && typeof subTool.execute === "function" && subTool.execute.constructor.name === "AsyncFunction",
    subTool?.execute?.constructor?.name,
  );
}

// 233 — the arg schema: ALL 3 channel args are OPTIONAL (each accepts undefined
//      AND a string — the at-least-one-required rule is a RUNTIME rule,
//      not a schema constraint)
{
  const optAccept = (k) => {
    const s = subTool?.args?.[k];
    return s != null && typeof s.safeParse === "function" && s.safeParse(undefined).success === true && s.safeParse("x").success === true;
  };
  check(
    String(++n22),
    "S22",
    "arg schema: all 3 channel args (feedback/knowledge/todo) optional-accept (undefined AND a string); role/session absent from the schema",
    ["feedback", "knowledge", "todo"].every(optAccept) && !("role" in (subTool?.args ?? {})) && !("session" in (subTool?.args ?? {})),
    JSON.stringify({ args: ["feedback", "knowledge", "todo"].map((k) => ({ k, ok: optAccept(k) })), roleIn: "role" in (subTool?.args ?? {}), sessionIn: "session" in (subTool?.args ?? {}) }),
  );
}

// 234 — the no-params error: execute({}) AND all-empty-string args return
//      the EXACT error string and create NO target (the fresh sandbox
//      project dir stays empty — nothing written)
{
  const noArgsRet = await subTool.execute({}, { directory: SUB_FB });
  const emptyRet = await subTool.execute({ feedback: "", knowledge: "  ", todo: "" }, { directory: SUB_FB });
  check(
    String(++n22),
    "S22",
    "no-params ({} and all-empty-string) → the EXACT error string + NO target created (nothing written)",
    noArgsRet === SUB_NO_PARAMS_ERR && emptyRet === SUB_NO_PARAMS_ERR &&
      !existsSync(path.join(SUB_FB, ".opencode")) && !existsSync(path.join(SUB_FB, "todo_inbox.md")),
    JSON.stringify({ noArgsRet, emptyRet }),
  );
}

// 235 — the feedback append (1 of 3): a fresh sandbox project dir — the
//      tool CREATES .opencode/agent/agent_feedback.md (parent dirs
//      auto-created) carrying ONLY the entry: `### <stamp> probe-s21
//      ses_fx_sub` + the raw text + one trailing blank line (the stamp
//      minute-resolution, pinned by the before/after trick); the return is
//      `feedback` + `target: <rel>` + `entry: <exact text>` byte-exact;
//      the other two targets are ABSENT
{
  const t1 = subStampNow();
  const ret = await subTool.execute(
    { feedback: "probe feedback line" },
    { directory: SUB_FB, agent: "probe-s21", sessionID: "ses_fx_sub" },
  );
  const t2 = subStampNow();
  const f = path.join(SUB_FB, SUB_REL.feedback);
  const body = existsSync(f) ? readFileSync(f, "utf8") : null;
  const okEntry = (s) => body === subEntry("feedback", s, "probe-s21", "ses_fx_sub", "probe feedback line");
  const okRet = (s) => ret === subBlock("feedback", subEntry("feedback", s, "probe-s21", "ses_fx_sub", "probe feedback line"));
  check(
    String(++n22),
    "S22",
    "feedback append: target created carrying ONLY the entry (### stamp, format pinned) + return byte-exact (`feedback` + `target:` + `entry:`) + the other two targets absent",
    (okEntry(t1) || okEntry(t2)) && (okRet(t1) || okRet(t2)) &&
      !existsSync(path.join(SUB_FB, SUB_REL.knowledge)) && !existsSync(path.join(SUB_FB, SUB_REL.todo)),
    JSON.stringify({ ret, body }),
  );
}

// 236 — the knowledge append (2 of 3): the same contract for
//      .opencode/agent/knowledge/knowledge_inbox.md with the `## ` header
//      (the established form of the inbox channel)
{
  const t1 = subStampNow();
  const ret = await subTool.execute(
    { knowledge: "probe knowledge line" },
    { directory: SUB_KN, agent: "probe-s21", sessionID: "ses_fx_sub" },
  );
  const t2 = subStampNow();
  const f = path.join(SUB_KN, SUB_REL.knowledge);
  const body = existsSync(f) ? readFileSync(f, "utf8") : null;
  const okEntry = (s) => body === subEntry("knowledge", s, "probe-s21", "ses_fx_sub", "probe knowledge line");
  const okRet = (s) => ret === subBlock("knowledge", subEntry("knowledge", s, "probe-s21", "ses_fx_sub", "probe knowledge line"));
  check(
    String(++n22),
    "S22",
    "knowledge append: target created carrying ONLY the entry (## stamp) + return byte-exact + the other two targets absent",
    (okEntry(t1) || okEntry(t2)) && (okRet(t1) || okRet(t2)) &&
      !existsSync(path.join(SUB_KN, SUB_REL.feedback)) && !existsSync(path.join(SUB_KN, SUB_REL.todo)),
    JSON.stringify({ ret, body }),
  );
}

// 237 — the todo append (3 of 3): the same contract for the PROJECT-ROOT
//      todo_inbox.md with the `## ` header (the repo-root location is the
//      ratified deviation from the proposal's ".opencode/ subtree" wording)
{
  const t1 = subStampNow();
  const ret = await subTool.execute(
    { todo: "probe todo line" },
    { directory: SUB_TODO, agent: "probe-s21", sessionID: "ses_fx_sub" },
  );
  const t2 = subStampNow();
  const f = path.join(SUB_TODO, SUB_REL.todo);
  const body = existsSync(f) ? readFileSync(f, "utf8") : null;
  const okEntry = (s) => body === subEntry("todo", s, "probe-s21", "ses_fx_sub", "probe todo line");
  const okRet = (s) => ret === subBlock("todo", subEntry("todo", s, "probe-s21", "ses_fx_sub", "probe todo line"));
  check(
    String(++n22),
    "S22",
    "todo append: project-root target created carrying ONLY the entry (## stamp) + return byte-exact + the other two targets absent",
    (okEntry(t1) || okEntry(t2)) && (okRet(t1) || okRet(t2)) &&
      !existsSync(path.join(SUB_TODO, SUB_REL.feedback)) && !existsSync(path.join(SUB_TODO, SUB_REL.knowledge)),
    JSON.stringify({ ret, body }),
  );
}

// 238 — the never-read preservation: ALL THREE targets pre-seeded with
//      sentinel lines; ONE feedback append → the feedback file = the
//      sentinel bytes + the entry (the sentinel BYTE-EXACT before the
//      appended entry) and the knowledge/todo files byte-identical to the
//      pre-seed (untouched) — the tool appends, never reads/rewrites
{
  const seed = (dir, k, line) => {
    const f = path.join(dir, SUB_REL[k]);
    mkdirSync(path.dirname(f), { recursive: true });
    writeFileSync(f, line + "\n", "utf8");
  };
  seed(SUB_KEEP, "feedback", "SENTINEL fb — the pre-seeded line must survive byte-exact.");
  seed(SUB_KEEP, "knowledge", "SENTINEL kn — must stay byte-identical.");
  seed(SUB_KEEP, "todo", "SENTINEL todo — must stay byte-identical.");
  const t1 = subStampNow();
  await subTool.execute(
    { feedback: "probe keep line" },
    { directory: SUB_KEEP, agent: "probe-s21", sessionID: "ses_fx_sub" },
  );
  const t2 = subStampNow();
  const fb = readFileSync(path.join(SUB_KEEP, SUB_REL.feedback), "utf8");
  const okFb = (s) => fb === "SENTINEL fb — the pre-seeded line must survive byte-exact.\n" + subEntry("feedback", s, "probe-s21", "ses_fx_sub", "probe keep line");
  check(
    String(++n22),
    "S22",
    "never-read preservation: pre-seeded sentinel BYTE-EXACT before the appended entry (append-only) + the unprovided targets byte-identical (untouched)",
    (okFb(t1) || okFb(t2)) &&
      readFileSync(path.join(SUB_KEEP, SUB_REL.knowledge), "utf8") === "SENTINEL kn — must stay byte-identical.\n" &&
      readFileSync(path.join(SUB_KEEP, SUB_REL.todo), "utf8") === "SENTINEL todo — must stay byte-identical.\n",
    JSON.stringify({ fb }),
  );
}

// ------------------------------------------------------------------ S25 compact_memory unit A (7) — 2026-09-21 (priority.md #1): the 4-key args (the 3-key args + the item-10 `emergency` arg) + the config-resolved summarizer (the exported pure resolver, JSONC-safe) + the DUMP-OK line
//
// Reuses S13's type-stripped plugin import (qcMod) and the sandbox: the
// resolver is PURE (driven directly over string fixtures); the DUMP-OK pin
// drives the exported preCompactionDump with the S14 stub dump script (still
// in place from check 105); the tool-integration pin writes a SANDBOX
// opencode.jsonc (removed afterwards) and drives the tool path with the
// 4-key args.
{
  check(
    "250",
    "S25",
    "exports: resolveCompactionModel + stripJsoncComments are functions (the new unit A surface)",
    typeof qcMod.resolveCompactionModel === "function" && typeof qcMod.stripJsoncComments === "function",
    JSON.stringify({ r: typeof qcMod.resolveCompactionModel, s: typeof qcMod.stripJsoncComments }),
  );
}
{
  const fb = { providerID: "llama-swap", modelID: "Session-Model-120K" };
  const cfg = qcMod.resolveCompactionModel(
    `{\n  // root config (JSONC)\n  "agent": { "compaction": { "model": "llama-swap/Gemma4-12B-Q4KXL-MTP-128K" } }\n}`,
    fb);
  check(
    "251",
    "S25",
    "config present: agent.compaction.model 'provider/model' → the config pair, source 'config'",
    cfg.source === "config" && cfg.providerID === "llama-swap" && cfg.modelID === "Gemma4-12B-Q4KXL-MTP-128K",
    JSON.stringify(cfg),
  );
}
{
  const fb = { providerID: "llama-swap", modelID: "Session-Model-120K" };
  const urlCfg = qcMod.resolveCompactionModel(
    `{\n  /* block comment */\n  "website": "https://example.com/docs//compaction?x=1", // line comment\n  "agent": { "compaction": { "model": "prov-x/model-y" } }\n}`,
    fb);
  check(
    "252",
    "S25",
    "comment + URL-safe parse: a // inside a string literal does NOT start a comment (the config pair still resolves)",
    urlCfg.source === "config" && urlCfg.providerID === "prov-x" && urlCfg.modelID === "model-y",
    JSON.stringify(urlCfg),
  );
}
{
  const fb = { providerID: "llama-swap", modelID: "Session-Model-120K" };
  const cases = {
    absent: qcMod.resolveCompactionModel("", fb),
    noKey: qcMod.resolveCompactionModel(`{ "agent": { "other": 1 } }`, fb),
    notString: qcMod.resolveCompactionModel(`{ "agent": { "compaction": { "model": 42 } } }`, fb),
    noSlash: qcMod.resolveCompactionModel(`{ "agent": { "compaction": { "model": "Gemma4-12B" } } }`, fb),
    emptyLeft: qcMod.resolveCompactionModel(`{ "agent": { "compaction": { "model": "/model-y" } } }`, fb),
    emptyRight: qcMod.resolveCompactionModel(`{ "agent": { "compaction": { "model": "prov-x/" } } }`, fb),
    badJson: qcMod.resolveCompactionModel("{ oops", fb),
  };
  check(
    "253",
    "S25",
    "fallback battery: absent / no-key / non-string / no-'/' / empty halves / unparseable → the fallback pair UNCHANGED, source 'fallback'",
    Object.values(cases).every((r) => r.source === "fallback" && r.providerID === "llama-swap" && r.modelID === "Session-Model-120K"),
    JSON.stringify(cases),
  );
}
{
  const fb = { providerID: "llama-swap", modelID: "Session-Model-120K" };
  const multi = qcMod.resolveCompactionModel(`{\n/* c1 */ "agent": { "compaction": { "model": "prov/one/two" } } /* c2 */\n}`, fb);
  check(
    "254",
    "S25",
    "block comments + the FIRST-slash split: 'prov/one/two' → providerID 'prov', modelID 'one/two'",
    multi.source === "config" && multi.providerID === "prov" && multi.modelID === "one/two",
    JSON.stringify(multi),
  );
}
{
  const r = qcMod.preCompactionDump(SANDBOX, "ses_qc_dumpok", 0);
  const line = ctxLogLines().find((l) => l.includes("DUMP-OK ses_qc_dumpok"));
  check(
    "255",
    "S25",
    "DUMP-OK line on success: `<dt> DUMP-OK ses_qc_dumpok compaction_dumps/ses_qc_dumpok_c0.md ms=<ms>` (the #78 ms= form, the DUMP-FAIL prefix style)",
    r.ok === true && line != null && new RegExp(`^${DT} DUMP-OK ses_qc_dumpok compaction_dumps/ses_qc_dumpok_c0\\.md ms=\\d+$`).test(line),
    JSON.stringify(line),
  );
}
{
  const CFGP = path.join(SANDBOX, "opencode.jsonc");
  writeFileSync(CFGP, `{\n  "agent": { "compaction": { "model": "llama-swap/Gemma4-12B-Q4KXL-MTP-128K" } }\n}`, "utf8");
  const { rec, res } = await qcExec({ summarize: true, messages: [] }, { sessionID: "ses_qc_cfgbody" });
  await qcTick();
  rmSync(CFGP, { force: true });
  check(
    "256",
    "S25",
    "tool integration: the sandbox opencode.jsonc agent.compaction.model → the summarize body carries the config pair (the 4-key args — no providerID/modelID keys)",
    rec.summarize.length === 1 && rec.summarize[0]?.body?.providerID === "llama-swap" &&
      rec.summarize[0]?.body?.modelID === "Gemma4-12B-Q4KXL-MTP-128K" && /dispatched/i.test(res),
    JSON.stringify({ body: rec.summarize[0]?.body, res: String(res).slice(0, 120) }),
  );
}

// ------------------------------------------------------------------ S26 R6 edit hint channel + payload journal (20) — 2026-09-25 (TODO #95 sub-item 1; design source: research/fuzzy-numword/decision-record.md §8 + spec_R6_edit_hint_journal.md)
//
// The R6 observation-only unit: (a) the CONTENT locator primitive
// (ioCore.locateContent — the anchor/candidate + d<=2 gap>=2 shape over FILE
// LINES, fail-closed — the unifying primitive for the edit hints, the R3
// section-anchor resolver, and the block_transfer section recovery); (b)
// the PAYLOAD JOURNAL (every write/edit/block_transfer call appends one line
// to journal_write.log / journal_edit.log — a SEPARATE file, never an
// intercept line); (c) the EDIT HINT channel (edit only: exact-1 silent, >1
// ambiguous with ALL lines, 0 → the locator — edit-hint / edit-ambiguous /
// no-candidate verdicts); (d) the AFTER-HOOK enrichment (the hint is cached
// per callID and appended to the failed result's output.output — consumed
// once; live acceptance is restart-gated).

const ioAfter = ioHooks["tool.execute.after"];
const ioHintDir = path.join(ioSandboxProj, "hfx");
mkdirSync(ioHintDir, { recursive: true });
const ioJWriteLog = path.join(ioSandboxProj, ".opencode", "temp", "journal_write.log");
const ioJEditLog = path.join(ioSandboxProj, ".opencode", "temp", "journal_edit.log");
const ioJRead = (p) => (existsSync(p) ? readFileSync(p, "utf8").split(/\r?\n/).filter((l) => l.length > 0) : []);
const ioJPayload = (line) => line.split(" | ").slice(4).join(" | ");
const ioHintFiles = {
  hb: path.join(ioHintDir, "hb.txt"), // single-candidate d=1 fixture
  hc: path.join(ioHintDir, "hc.txt"), // two identical candidates (ambiguous)
  hd: path.join(ioHintDir, "hd.txt"), // two raw occurrences (multiple-exact)
  he: path.join(ioHintDir, "he.txt"), // no-anchor fixture
};
writeFileSync(ioHintFiles.hb, "alpha 20260915 beta\nomega 20260916 psi\n", "utf8");
writeFileSync(ioHintFiles.hc, "alpha 20260915 beta\nalpha 20260915 beta\n", "utf8");
writeFileSync(ioHintFiles.hd, "alpha 20260915 beta\ngamma 20260915 delta\nalpha 20260915 beta\n", "utf8");
writeFileSync(ioHintFiles.he, "zzz qqq www\n", "utf8");
let n26 = 257;
let ioJwBefore = -1;
let ioJeBeforeE = -1;
let ioJeC273 = -1; // ((2) re-pin) the journal line index of the FAIL-closed c273 call (276 uses it)

// 257 — locateContent: single-line exact → {kind:exact, lines:[N]}
{
  const r = ioCore.locateContent("four five six", "one two three\nfour five six\n");
  check(
    String(n26),
    "S26",
    "locateContent: single-line exact → {kind:exact, lines:[2]}",
    JSON.stringify(r) === '{"kind":"exact","lines":[2]}',
    JSON.stringify(r),
  );
  n26++;
}

// 258 — locateContent: multi-line query (anchor = first + last line) → the
//      EXACT block start
{
  const r = ioCore.locateContent("aaa 111 bbb\nccc 222 ddd", "aaa 111 bbb\nccc 222 ddd\neee 333 fff\n");
  check(
    String(n26),
    "S26",
    "locateContent: multi-line exact → the block start {kind:exact, lines:[1]}",
    JSON.stringify(r) === '{"kind":"exact","lines":[1]}',
    JSON.stringify(r),
  );
  n26++;
}

// 259 — locateContent fuzzy: d=1, single candidate → resolved (gap infinite)
{
  const r = ioCore.locateContent("alpha 20260915 betaa", "alpha 20260915 beta\n");
  check(
    String(n26),
    "S26",
    "locateContent fuzzy d=1 (single candidate) → {kind:resolved, line:1, d:1, gap:Infinity}",
    r.kind === "resolved" && r.line === 1 && r.d === 1 && r.gap === Infinity,
    JSON.stringify(r),
  );
  n26++;
}

// 260 — locateContent fuzzy bar: d=2 accepted when the gap to the second-
//      best >= 2 (d 2 vs 3… measured gap 4)
{
  const r = ioCore.locateContent("alpha 20260915 bex", "alpha 20260915 beta\nalpha 20260915 qqqqqq\n");
  check(
    String(n26),
    "S26",
    "locateContent fuzzy d=2 (gap >= 2) → {kind:resolved, line:1, d:2, gap:4}",
    r.kind === "resolved" && r.line === 1 && r.d === 2 && r.gap === 4,
    JSON.stringify(r),
  );
  n26++;
}

// 261 — locateContent ambiguous: two candidates at the same d (gap 0 < 2)
//      → top-3 [line, d]
{
  const r = ioCore.locateContent("alpha 20260915 betx", "alpha 20260915 beta\nalpha 20260915 beta\n");
  check(
    String(n26),
    "S26",
    "locateContent ambiguous (gap 0 < 2) → {kind:ambiguous, cands:[[1,1],[2,1]]}",
    r.kind === "ambiguous" && JSON.stringify(r.cands) === "[[1,1],[2,1]]",
    JSON.stringify(r),
  );
  n26++;
}

// 262 — locateContent fail-closed: the anchor is in no file line
{
  const r = ioCore.locateContent("alpha 20260915 beta", "zzz qqq www\n");
  check(
    String(n26),
    "S26",
    "locateContent fail-closed: anchor absent → {kind:rejected, reason:no-anchor-line}",
    r.kind === "rejected" && r.reason === "no-anchor-line",
    JSON.stringify(r),
  );
  n26++;
}

// 263 — locateContent fail-closed: candidates exist but the best d > 2
{
  const r = ioCore.locateContent("alpha 20260915 zzzz", "alpha 20260915 beta\n");
  check(
    String(n26),
    "S26",
    "locateContent fail-closed: best d > 2 → {kind:rejected, reason:d-too-high}",
    r.kind === "rejected" && r.reason === "d-too-high",
    JSON.stringify(r),
  );
  n26++;
}

// 264 — locateContent fail-closed: empty / whitespace-only query
{
  const r1 = ioCore.locateContent("", "x\n");
  const r2 = ioCore.locateContent("   \n  ", "x\n");
  check(
    String(n26),
    "S26",
    "locateContent fail-closed: empty / whitespace-only query → {kind:rejected, reason:empty-arg}",
    r1.kind === "rejected" && r1.reason === "empty-arg" && r2.kind === "rejected" && r2.reason === "empty-arg",
    JSON.stringify([r1, r2]),
  );
  n26++;
}

// 265 — locateContent all-dense query (no word span → bounded whole-file
//      scan): an exact dense line → {exact}; absent → rejected d-too-high
{
  const r1 = ioCore.locateContent("20260915 12345678", "20260915 12345678\nother\n");
  const r2 = ioCore.locateContent("20260915 99999999", "20260915 12345678\nother\n");
  check(
    String(n26),
    "S26",
    "locateContent all-dense: present dense line → {kind:exact, lines:[1]}; absent → rejected d-too-high",
    r1.kind === "exact" && JSON.stringify(r1.lines) === "[1]" && r2.kind === "rejected" && r2.reason === "d-too-high",
    JSON.stringify([r1, r2]),
  );
  n26++;
}

// 266 — locateContent file-size cap (LOCATOR_MAX_FILE_CHARS): the target
//      within the cap → found; beyond the cap → rejected (a truncated scan
//      can only MISS a candidate, never invent one)
{
  const big = "alpha 20260915 beta\n" + "x".repeat(262144 + 500);
  const big2 = "x".repeat(262144 + 500) + "\nalpha 20260915 beta";
  const r1 = ioCore.locateContent("alpha 20260915 beta", big);
  const r2 = ioCore.locateContent("alpha 20260915 beta", big2);
  check(
    String(n26),
    "S26",
    "locateContent cap: within the 256 KiB cap → {kind:exact, lines:[1]}; beyond → rejected no-anchor-line",
    r1.kind === "exact" && JSON.stringify(r1.lines) === "[1]" && r2.kind === "rejected" && r2.reason === "no-anchor-line",
    JSON.stringify([r1, r2]),
  );
  n26++;
}

// 267 — journal WRITE: ONE line in journal_write.log (5 logical fields —
//      stamp|session|tool|target|payload; the JSON payload is
//      self-delimiting and may contain " | " + newlines) + ZERO intercept
//      lines (the journal is a separate file)
{
  const w1 = { filePath: ioHintDir + "\\jw.txt", content: "part A | part B\npart C" };
  const nL1 = ioReadLines().length;
  ioJwBefore = ioJRead(ioJWriteLog).length;
  await ioBefore({ tool: "write", sessionID: "ses_fx_io3", callID: "c267" }, { args: w1 });
  const j1 = ioJRead(ioJWriteLog);
  const f1 = j1[ioJwBefore].split(" | ");
  check(
    String(n26),
    "S26",
    "journal write: ONE new line in journal_write.log (JSON payload round-trips, may contain ' | ' + newline) + ZERO intercept lines",
    j1.length === ioJwBefore + 1 && ioStampRe.test(f1[0]) && f1[1] === "ses_fx_io3" && f1[2] === "write" &&
      f1[3] === ioHintDir + "\\jw.txt" && JSON.parse(ioJPayload(j1[ioJwBefore])) === w1.content &&
      ioReadLines().length === nL1,
    JSON.stringify({ j1: f1, n: ioReadLines().length - nL1 }),
  );
  n26++;
}

// 268 — journal EDIT: ONE line in journal_edit.log (target = filePath;
//      payload = JSON {filePath, old, new} — the effective args) + the
//      EXACT-1 hint is silent (zero intercept lines)
{
  const e1 = { filePath: ioHintFiles.hb, oldString: "alpha 20260915 beta", newString: "z" };
  const nL2 = ioReadLines().length;
  const jeBefore = ioJRead(ioJEditLog).length;
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io3", callID: "c268" }, { args: e1 });
  const j2 = ioJRead(ioJEditLog);
  const jeLine = j2[jeBefore];
  const f2 = jeLine.split(" | ");
  const lNew2 = ioReadLines().slice(nL2);
  check(
    String(n26),
    "S26",
    "journal edit: ONE new line in journal_edit.log (payload {filePath, old, new}) + exact-1 hint SILENT (no 'edit oldString' line)",
    j2.length === jeBefore + 1 && f2[1] === "ses_fx_io3" && f2[2] === "edit" && f2[3] === ioHintFiles.hb &&
      ioJPayload(jeLine) === JSON.stringify({ filePath: ioHintFiles.hb, old: "alpha 20260915 beta", new: "z" }) &&
      !lNew2.some((l) => l.split(" | ")[6] === "edit oldString"),
    JSON.stringify({ jeLine: f2, n: lNew2.length }),
  );
  n26++;
}

// 269 — journal BLOCK_TRANSFER: ONE line in journal_edit.log (the shared
//      edit-class file — the spec names two files for three tools; the tool
//      field disambiguates); target = dstFile; payload = the anchor fields +
//      ZERO intercept lines (both paths exist → the fuzzy channel fast-paths)
{
  const a1 = path.join(ioHintDir, "a.txt");
  const b1 = path.join(ioHintDir, "b.txt");
  writeFileSync(a1, "x", "utf8");
  writeFileSync(b1, "x", "utf8");
  const bt1 = { srcFile: a1, dstFile: b1, mode: "MOVE", startMarker: "## S", endMarker: "## E", targetMarker: "## T" };
  const nL3 = ioReadLines().length;
  const jbBefore = ioJRead(ioJEditLog).length;
  await ioBefore({ tool: "block_transfer", sessionID: "ses_fx_io3", callID: "c269" }, { args: bt1 });
  const j3 = ioJRead(ioJEditLog);
  const jbLine = j3[jbBefore];
  const f3 = jbLine.split(" | ");
  check(
    String(n26),
    "S26",
    "journal block_transfer: ONE new line in journal_edit.log (target = dstFile; payload = the anchor fields) + ZERO intercept lines",
    j3.length === jbBefore + 1 && f3[1] === "ses_fx_io3" && f3[2] === "block_transfer" && f3[3] === b1 &&
      ioJPayload(jbLine) === JSON.stringify({ srcFile: a1, dstFile: b1, mode: "MOVE", startMarker: "## S", endMarker: "## E", targetMarker: "## T" }) &&
      ioReadLines().length === nL3,
    JSON.stringify({ jbLine: f3, n: ioReadLines().length - nL3 }),
  );
  n26++;
}

// 270 — the journal paths are git-ignored (the `temp` entry covers both
//      files; check-ignore tests the rule, not the file)
{
  let ok1 = true, ok2 = true;
  try { execFileSync("git", ["check-ignore", "-q", ".opencode/temp/journal_write.log"], { cwd: REPO_ROOT }); } catch { ok1 = false; }
  try { execFileSync("git", ["check-ignore", "-q", ".opencode/temp/journal_edit.log"], { cwd: REPO_ROOT }); } catch { ok2 = false; }
  check(
    String(n26),
    "S26",
    "the journal paths are git-ignored (git check-ignore -q, both files)",
    ok1 && ok2,
    `write=${ok1} edit=${ok2}`,
  );
  n26++;
}

// 271 — ((2) re-pin, 2026-09-25, #95 sub-item 2): oldString ABSENT (raw), a
//      single fuzzy candidate d=1 → now MUTATES: the fuzzy-edit LAST line
//      (byte-exact) + oldString MUTATED to the file's exact bytes (the edit
//      will now succeed — NO after-hook hint)
{
  const h1 = { filePath: ioHintFiles.hb, oldString: "alpha 20260915 betaa", newString: "z" };
  ioJeBeforeE = ioJRead(ioJEditLog).length;
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io3", callID: "c271" }, { args: h1 });
  const l4 = ioReadLines();
  const f4 = l4[l4.length - 1].split(" | ");
  check(
    String(n26),
    "S26",
    "(2) re-pin: absent oldString, single candidate d=1 → now MUTATES — fuzzy-edit LAST line (byte-exact; context 'edit oldString') + h1.oldString mutated to the file's exact bytes — the dense date also fires an observation line",
    f4.length === 8 && f4[3] === "edit" && f4[7] === "fuzzy-edit" &&
      f4[5] === "fuzzy-edit orig=alpha 20260915 betaa len=20 d=1 value=alpha 20260915 beta" && f4[6] === "edit oldString" &&
      h1.oldString === "alpha 20260915 beta",
    JSON.stringify(f4),
  );
  n26++;
}

// 272 — hint multiple exact: two raw occurrences → edit-ambiguous with ALL
//      occurrence start lines
{
  const h2 = { filePath: ioHintFiles.hd, oldString: "alpha 20260915 beta", newString: "z" };
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io3", callID: "c272" }, { args: h2 });
  const l5 = ioReadLines();
  const f5 = l5[l5.length - 1].split(" | ");
  check(
    String(n26),
    "S26",
    "hint multiple exact: two occurrences → edit-ambiguous LAST line 'hint lines=1,3'",
    f5.length === 8 && f5[7] === "edit-ambiguous" &&
      f5[5] === "hint lines=1,3" && f5[6] === "edit oldString",
    JSON.stringify(f5),
  );
  n26++;
}

// 273 — hint no candidate: the anchor is in no file line → fail-closed
//      no-candidate (UNCHANGED by (2) — no candidate → no best-d; the
//      ((2) re-pin) journal-line marker for 276 is captured here)
{
  const h3 = { filePath: ioHintFiles.he, oldString: "alpha 20260915 beta", newString: "z" };
  ioJeC273 = ioJRead(ioJEditLog).length;
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io3", callID: "c273" }, { args: h3 });
  const l6 = ioReadLines();
  const f6 = l6[l6.length - 1].split(" | ");
  check(
    String(n26),
    "S26",
    "hint no candidate: anchor absent → no-candidate LAST line 'hint reason=no-anchor-line' (fail-closed)",
    f6.length === 8 && f6[7] === "no-candidate" &&
      f6[5] === "hint reason=no-anchor-line" && f6[6] === "edit oldString",
    JSON.stringify(f6),
  );
  n26++;
}

// 274 — hint fuzzy ambiguous: two candidates at the same d (gap 0 < 2) →
//      edit-ambiguous with the top-3 [line, d]
{
  const h4 = { filePath: ioHintFiles.hc, oldString: "alpha 20260915 betx", newString: "z" };
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io3", callID: "c274" }, { args: h4 });
  const l7 = ioReadLines();
  const f7 = l7[l7.length - 1].split(" | ");
  check(
    String(n26),
    "S26",
    "hint fuzzy ambiguous: two candidates, same d → edit-ambiguous LAST line 'hint cands=1 1,2 1'",
    f7.length === 8 && f7[7] === "edit-ambiguous" &&
      f7[5] === "hint cands=1 1,2 1" && f7[6] === "edit oldString",
    JSON.stringify(f7),
  );
  n26++;
}

// 275 — the AFTER-HOOK enrichment (live acceptance restart-gated) —
//      ((2) re-pin): c271 is now a MUTATION (no hint stored) → re-point at
//      the FAIL-closed c273 (no-candidate): the failed edit's output.output
//      gains the no-candidate hint line — consumed once (a second call is a
//      no-op); a mutation, a hint-less edit, and a non-edit call are
//      untouched
{
  const outM = { title: "edit", output: "ok", metadata: {} };
  await ioAfter({ tool: "edit", sessionID: "ses_fx_io3", callID: "c271" }, outM); // mutate → NO hint stored → untouched
  const outR = { title: "edit", output: "Error: oldString not found", metadata: {} };
  await ioAfter({ tool: "edit", sessionID: "ses_fx_io3", callID: "c273" }, outR); // fail-closed → the hint IS stored
  const enriched = outR.output;
  await ioAfter({ tool: "edit", sessionID: "ses_fx_io3", callID: "c273" }, outR); // consumed once
  const outS = { title: "edit", output: "ok", metadata: {} };
  await ioAfter({ tool: "edit", sessionID: "ses_fx_io3", callID: "c268" }, outS); // exact-1 silent → nothing cached
  const outN = { title: "bash", output: "ls", metadata: {} };
  await ioAfter({ tool: "bash", sessionID: "ses_fx_io3", callID: "c267" }, outN); // not an edit → no-op
  check(
    String(n26),
    "S26",
    "after-hook enrichment ((2) re-pin): mutate (c271) → UNTOUCHED (no hint stored); fail-closed (c273 no-candidate) → gains the hint line (consumed once); a hint-less edit + a non-edit call are untouched",
    outM.output === "ok" &&
      enriched === "Error: oldString not found\nhint reason=no-anchor-line" &&
      outR.output === enriched && outS.output === "ok" && outN.output === "ls",
    JSON.stringify({ m: outM.output, e: outR.output, s: outS.output, n: outN.output }),
  );
  n26++;
}

// 276 — the DoD machine check — ((2) re-pin): the controlled FAILED EDIT is
//      now the FAIL-closed c273 (no-candidate; c271 mutates): the fail line
//      AND the journal line (the journal's edit `old` = the ORIGINAL
//      pre-mutation oldString) name the exact intended edit; the journal
//      WRITE payload (267) cp'd in place reproduces the intended file state
//      (byte-identical)
{
  const doDLine = ioJRead(ioJEditLog)[ioJeC273];
  const doDJ = doDLine ? JSON.parse(ioJPayload(doDLine)) : null;
  const jwPayload = JSON.parse(ioJPayload(ioJRead(ioJWriteLog)[ioJwBefore]));
  const wTarget = ioHintDir + "\\jw.txt";
  writeFileSync(wTarget, jwPayload, "utf8");
  const cpBack = readFileSync(wTarget, "utf8");
  check(
    String(n26),
    "S26",
    "DoD machine check ((2) re-pin): the fail-closed c273's no-candidate line + journal payload {filePath, old, new} name the exact intended edit (journal `old` = the ORIGINAL oldString); the write journal payload cp'd in place reproduces the intended file state (byte-identical)",
    doDJ !== null && doDJ.filePath === ioHintFiles.he && doDJ.old === "alpha 20260915 beta" && doDJ.new === "z" &&
      ioReadLines().some((l) => l.endsWith("edit oldString | no-candidate") && l.includes("hint reason=no-anchor-line")) &&
      cpBack === "part A | part B\npart C",
    JSON.stringify({ doDJ, cpBack }),
  );
  n26++;
}

// ------------------------------------------------------------------ S27 (2) the MUTATING edit-fuzzy oldString (8) — 2026-09-25 (TODO #95 sub-item 2; design source: research/fuzzy-numword/decision-record.md §8.2 + spec_sub2_edit_fuzzy_oldstring.md)
//
// The (2) MUTATING unit (normalize-then-compare): the 0-raw-occurrence case
// resolves WITHOUT agent action — normalize BOTH sides (CRLF/LF + per-line
// trailing whitespace), d = the MAX Levenshtein over the scored line-pairs;
// exactly-one candidate at d=0 or d≤1 → oldString MUTATED to the file's
// exact unique bytes (the fuzzy-edit line; NO after-hook hint — the edit
// succeeds); else FAIL-CLOSED (the R6 hint verdict carrying the best-
// candidate d — directive a; the after-hook hint is stored). Directive b:
// the feedback line is truncated (first 40 chars + ...), the journal
// carries the FULL original oldString.

const ioF2Dir = path.join(ioSandboxProj, "f2");
mkdirSync(ioF2Dir, { recursive: true });
const ioF2 = {
  cf: path.join(ioF2Dir, "cf.txt"), // CRLF file (the LF query: 0 raw)
  tw: path.join(ioF2Dir, "tw.txt"), // LF file (trailing-ws drift)
  am: path.join(ioF2Dir, "am.txt"), // two d<=1 candidates (ambiguous)
  nm: path.join(ioF2Dir, "nm.txt"), // d=1 typo + d=3 near-miss candidates
  lg: path.join(ioF2Dir, "lg.txt"), // the long oldString (directive b)
};
writeFileSync(ioF2.cf, "alpha one\r\nbeta two\r\ngamma three\r\n", "utf8");
writeFileSync(ioF2.tw, "alpha one\nbeta two\ndelta four\n", "utf8");
writeFileSync(ioF2.am, "alpha 20260915 beta\nalpha 20260915 betz\n", "utf8");
writeFileSync(ioF2.nm, "alpha 20260915 beta\ngamma 20260916 delta\n", "utf8");
const ioLgLine = "the quick brown fox 20260915 jumps over the lazy dog and the cat slept";
writeFileSync(ioF2.lg, ioLgLine + "\n", "utf8");
const ioMutCount = (hay, needle) => {
  let n = 0,
    p = 0;
  while (p + needle.length <= hay.length) {
    const i = hay.indexOf(needle, p);
    if (i === -1) break;
    n++;
    p = i + 1;
  }
  return n;
};
let n27 = 277;
let ioF77 = null; // the c277 fuzzy-edit line (284 checks its byte-exact shape)

// 277 — (2) CRLF-drift: oldString LF, file CRLF (same content, 0 raw) →
//      d=0 → MUTATE to the file's CRLF bytes (an exact UNIQUE file
//      substring) + the fuzzy-edit LAST line (byte-exact)
{
  const h77 = { filePath: ioF2.cf, oldString: "alpha one\nbeta two\ngamma three", newString: "z" };
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io3", callID: "c277" }, { args: h77 });
  const l77 = ioReadLines();
  ioF77 = l77[l77.length - 1].split(" | ");
  check(
    String(n27),
    "S27",
    "(2) CRLF-drift: 0 raw → d=0 → MUTATED oldString to the file's CRLF bytes (exact UNIQUE substring) + fuzzy-edit LAST line (byte-exact)",
    h77.oldString === "alpha one\r\nbeta two\r\ngamma three" &&
      ioMutCount(readFileSync(ioF2.cf, "utf8"), h77.oldString) === 1 &&
      ioF77.length === 8 && ioF77[3] === "edit" && ioF77[7] === "fuzzy-edit" &&
      ioF77[5] === "fuzzy-edit orig=alpha one beta two gamma three len=30 d=0 value=alpha one beta two gamma three" && ioF77[6] === "edit oldString",
    JSON.stringify(ioF77),
  );
  n27++;
}

// 278 — (2) trailing-whitespace drift: oldString line has trailing ws, the
//      file line does not → d=0 → MUTATE to the file's exact bytes
{
  const h78 = { filePath: ioF2.tw, oldString: "beta two   ", newString: "z" };
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io3", callID: "c278" }, { args: h78 });
  const l78 = ioReadLines();
  const f78 = l78[l78.length - 1].split(" | ");
  check(
    String(n27),
    "S27",
    "(2) trailing-ws drift: 0 raw → d=0 → MUTATED oldString to the file's exact bytes (exact UNIQUE substring) + fuzzy-edit LAST line (byte-exact)",
    h78.oldString === "beta two" &&
      ioMutCount(readFileSync(ioF2.tw, "utf8"), h78.oldString) === 1 &&
      f78.length === 8 && f78[7] === "fuzzy-edit" &&
      f78[5] === "fuzzy-edit orig=beta two    len=11 d=0 value=beta two" && f78[6] === "edit oldString",
    JSON.stringify(f78),
  );
  n27++;
}

// 279 — (2) single typo (outside the anchor — the line carries a dense
//      span): exactly one candidate at d=1 → MUTATE
{
  const h79 = { filePath: ioF2.nm, oldString: "alpha 20260915 betaa", newString: "z" };
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io3", callID: "c279" }, { args: h79 });
  const l79 = ioReadLines();
  const f79 = l79[l79.length - 1].split(" | ");
  check(
    String(n27),
    "S27",
    "(2) single typo d=1: exactly one candidate → MUTATED oldString to the file's exact bytes (exact UNIQUE substring) + fuzzy-edit LAST line (byte-exact) — the dense date also fires an observation line",
    h79.oldString === "alpha 20260915 beta" &&
      ioMutCount(readFileSync(ioF2.nm, "utf8"), h79.oldString) === 1 &&
      f79.length === 8 && f79[7] === "fuzzy-edit" &&
      f79[5] === "fuzzy-edit orig=alpha 20260915 betaa len=20 d=1 value=alpha 20260915 beta" && f79[6] === "edit oldString",
    JSON.stringify(f79),
  );
  n27++;
}

// 280 — (2) fail-closed near-miss: a single candidate at d=3 → NOT mutated
//      (byte-identical); the no-candidate fail line CARRIES the best-
//      candidate d (directive a: every attempt is logged with the best-d)
{
  const h80 = { filePath: ioF2.nm, oldString: "alpha 20260915 zeet", newString: "z" };
  const h80Before = JSON.stringify(h80);
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io3", callID: "c280" }, { args: h80 });
  const l80 = ioReadLines();
  const f80 = l80[l80.length - 1].split(" | ");
  check(
    String(n27),
    "S27",
    "(2) fail-closed near-miss: best d=3 → NOT mutated (byte-identical) + no-candidate LAST line carries 'best-d=3' (directive a) — the dense date also fires an observation line",
    JSON.stringify(h80) === h80Before && f80.length === 8 && f80[7] === "no-candidate" &&
      f80[5] === "hint reason=d-too-high best-d=3" && f80[6] === "edit oldString",
    JSON.stringify(f80),
  );
  n27++;
}

// 281 — (2) ambiguous: two candidates at d<=1 → NOT mutated (byte-
//      identical) → edit-ambiguous (the R6 verdict as today; the after-
//      hook hint is stored)
{
  const h81 = { filePath: ioF2.am, oldString: "alpha 20260915 bety", newString: "z" };
  const h81Before = JSON.stringify(h81);
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io3", callID: "c281" }, { args: h81 });
  const l81 = ioReadLines();
  const f81 = l81[l81.length - 1].split(" | ");
  check(
    String(n27),
    "S27",
    "(2) ambiguous: two candidates at d<=1 → NOT mutated (byte-identical) + edit-ambiguous LAST line 'hint cands=1 1,2 1' — the dense date also fires an observation line",
    JSON.stringify(h81) === h81Before && f81.length === 8 && f81[7] === "edit-ambiguous" &&
      f81[5] === "hint cands=1 1,2 1" && f81[6] === "edit oldString",
    JSON.stringify(f81),
  );
  n27++;
}

// 282 — (2) directive (b): a LONG oldString (> 40 chars) → the feedback
//      line is TRUNCATED (first 40 chars + ... + len + d + the truncated
//      target — the line does NOT carry the full oldString) while the
//      journal carries the FULL original oldString (edit `old`); the
//      mutated oldString is an exact UNIQUE file substring
{
  const ioLgQuery = "the quick brovn fox 20260915 jumps over the lazy dog and the cat slept";
  const h82 = { filePath: ioF2.lg, oldString: ioLgQuery, newString: "z" };
  const je82Before = ioJRead(ioJEditLog).length;
  await ioBefore({ tool: "edit", sessionID: "ses_fx_io3", callID: "c282" }, { args: h82 });
  const l82 = ioReadLines();
  const f82 = l82[l82.length - 1].split(" | ");
  const j82 = ioJRead(ioJEditLog)[je82Before];
  const j82P = j82 ? JSON.parse(ioJPayload(j82)) : null;
  check(
    String(n27),
    "S27",
    "(2) directive (b): long oldString → the fuzzy-edit line is TRUNCATED (no full oldString in the line) + the journal's edit `old` = the FULL original oldString + the mutated oldString is an exact UNIQUE file substring",
    h82.oldString === ioLgLine && ioMutCount(readFileSync(ioF2.lg, "utf8"), h82.oldString) === 1 &&
      f82.length === 8 && f82[7] === "fuzzy-edit" &&
      f82[5] === "fuzzy-edit orig=the quick brovn fox 20260915 jumps over ... len=70 d=1 value=the quick brown fox 20260915 jumps over ..." &&
      !f82[5].includes("the lazy dog") &&
      j82P !== null && j82P.old === ioLgQuery && j82P.new === "z" && j82P.filePath === ioF2.lg,
    JSON.stringify({ f82, j82P, mutated: h82.oldString }),
  );
  n27++;
}

// 283 — (2) the AFTER-HOOK: a mutate call → NO enrichment (no hint
//      stored); a fail-closed call → enrichment (the fail line's hint,
//      consumed once)
{
  const outM = { title: "edit", output: "ok", metadata: {} };
  await ioAfter({ tool: "edit", sessionID: "ses_fx_io3", callID: "c277" }, outM); // mutate → NO hint stored → untouched
  const outR = { title: "edit", output: "Error: oldString not found", metadata: {} };
  await ioAfter({ tool: "edit", sessionID: "ses_fx_io3", callID: "c280" }, outR); // fail-closed → the hint IS stored
  const enriched = outR.output;
  await ioAfter({ tool: "edit", sessionID: "ses_fx_io3", callID: "c280" }, outR); // consumed once
  check(
    String(n27),
    "S27",
    "(2) after-hook: mutate (c277) → UNTOUCHED (no hint stored); fail-closed (c280 near-miss) → gains the best-d hint line (consumed once)",
    outM.output === "ok" &&
      enriched === "Error: oldString not found\nhint reason=d-too-high best-d=3" && outR.output === enriched,
    JSON.stringify({ m: outM.output, e: outR.output }),
  );
  n27++;
}

// 284 — (2) the mandatory fuzzy-edit line SHAPE, byte-exact on the c277
//      mutate call (8 fields: stamp|session|model|edit|args|evidence|
//      'edit oldString'|'fuzzy-edit')
{
  check(
    String(n27),
    "S27",
    "(2) fuzzy-edit line shape byte-exact (8 fields; the c277 mutate call)",
    ioF77 !== null && ioF77.length === 8 && ioStampRe.test(ioF77[0]) && ioF77[1] === "ses_fx_io3" &&
      ioF77[3] === "edit" &&
      ioF77[5] === "fuzzy-edit orig=alpha one beta two gamma three len=30 d=0 value=alpha one beta two gamma three" &&
      ioF77[6] === "edit oldString" && ioF77[7] === "fuzzy-edit",
    JSON.stringify(ioF77),
  );
  n27++;
}

// ------------------------------------------------------------------ S28 R8 out-of-sandbox path redirect (#97, 2026-09-25)
//
// The 1:1 allowed-root redirect over the TYPED path fields: the pure
// resolver is pinned over the SPLIT core; the hook e2e pins use the S18
// factory — the probe's sandbox proj has NO opencode.jsonc → the FALLBACK
// roots [workspace root (ioSandboxProj), SCRATCHPAD_ROOT] apply (the
// config-read path is smoke-pinned via a second factory instance with a
// crafted config). The log field is cap-flattened (MAX_FIELD_CHARS) — the
// expected evidence goes through the SAME flattenField.
let n28 = 285;

// 285 — case (i): span == root (normalized — case/separator variant) →
//      the root AS CONFIGURED (exactly one match; the other root unrelated)
check(
  String(n28),
  "S28",
  "resolveRedirect case (i): span == root (case/variant) → the root as configured (one match wins)",
  ioCore.resolveRedirect("C:\\Users\\Wasiejen\\AppData\\local\\TEMP\\opencode", ["C:/Users/Wasiejen/AppData/Local/Temp/opencode", "C:/other/root"]) === "C:/Users/Wasiejen/AppData/Local/Temp/opencode",
);
n28++;

// 286 — case (ii): a direct sibling → root + separator + the span's
//      basename (case preserved)
check(
  String(n28),
  "S28",
  "resolveRedirect case (ii): direct sibling → root + '/' + basename (case preserved)",
  ioCore.resolveRedirect("C:/Users/Wasiejen/AppData/Local/Temp/MY-FILE.txt", ["C:/Users/Wasiejen/AppData/Local/Temp/opencode"]) === "C:/Users/Wasiejen/AppData/Local/Temp/opencode/MY-FILE.txt",
);
n28++;

// 287 — no mapping (0 matches) → null (fail-closed)
check(
  String(n28),
  "S28",
  "resolveRedirect: no mapping (0 matches) → null (fail-closed)",
  ioCore.resolveRedirect("C:/Windows/System32/cmd.exe", ["C:/Users/Wasiejen/AppData/Local/Temp/opencode", "C:/repo"]) === null,
);
n28++;

// 288 — >=2 matches: a sibling of TWO distinct roots (same parent) → null
check(
  String(n28),
  "S28",
  "resolveRedirect: a sibling of TWO distinct roots (same parent) → null (fail-closed — never picks one)",
  ioCore.resolveRedirect("C:/x/other.txt", ["C:/x/rootA", "C:/x/rootB"]) === null,
);
n28++;

// 289 — root dedupe: 3 forms of ONE root → ONE match → the first configured
//      form wins
check(
  String(n28),
  "S28",
  "resolveRedirect root dedupe: 3 forms of one root → ONE match → 'C:/x/rootA/other.txt' (the first configured form)",
  ioCore.resolveRedirect("C:/x/other.txt", ["C:/x/rootA", "C:\\X\\ROOTA", "C:/x/rootA/"]) === "C:/x/rootA/other.txt",
);
n28++;

// 290 — a child of the root and a two-levels-down sibling → null (not a
//      1:1 mapping)
check(
  String(n28),
  "S28",
  "resolveRedirect: a child of the root and a two-levels-down sibling → null (not a 1:1 mapping)",
  ioCore.resolveRedirect("C:/Users/Wasiejen/AppData/Local/Temp/opencode/deep/f.txt", ["C:/Users/Wasiejen/AppData/Local/Temp/opencode"]) === null &&
    ioCore.resolveRedirect("C:/Users/Wasiejen/AppData/Local/Temp/other/dir/f.txt", ["C:/Users/Wasiejen/AppData/Local/Temp/opencode"]) === null,
);
n28++;

// 291 — degenerate inputs (empty span / empty root list) → null (never
//      throws)
check(
  String(n28),
  "S28",
  "resolveRedirect: empty span or empty root list → null (never throws)",
  ioCore.resolveRedirect("", ["C:/x/rootA"]) === null && ioCore.resolveRedirect("C:/x/y.txt", []) === null,
);
n28++;

// 292 — e2e READ sibling of the workspace root (the fallback root) →
//      MUTATED to root+basename + the kind=redirect line FIRST (a fuzzy-
//      rejected line may follow) + NO out-of-sandbox line
{
  const a = { filePath: SANDBOX + "\\r8-read-sib.txt" };
  const aBefore = JSON.stringify(a);
  const n0 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io3", callID: "c292" }, { args: a });
  const nl = ioReadLines().slice(n0);
  const f = nl[0] ? nl[0].split(" | ") : [];
  check(
    String(n28),
    "S28",
    "hook R8 read-sibling (fallback root) → MUTATED to root+basename + kind=redirect FIRST line (byte-exact, cap-flattened) + NO out-of-sandbox line",
    a.filePath === ioSandboxProj + "/r8-read-sib.txt" && JSON.stringify(a) !== aBefore && f.length === 8 &&
      f[1] === "ses_fx_io3" && f[3] === "read" && f[7] === "pair-resolved" &&
      f[5] === ioCore.flattenField(`kind=redirect tool=read arg=filePath orig=${SANDBOX}\\r8-read-sib.txt value=${ioSandboxProj}/r8-read-sib.txt`) &&
      !nl.some((x) => x.split(" | ")[7] === "out-of-sandbox"),
    JSON.stringify({ after: a.filePath, nl }),
  );
  n28++;
}

// 293 — e2e WRITE sibling → exactly ONE new line (M1: write has no fuzzy
//      channel — the redirect line only) + args mutated
{
  const a = { filePath: SANDBOX + "\\r8-write-sib.txt", content: "R8" };
  const aBefore = JSON.stringify(a);
  const n0 = ioReadLines().length;
  await ioBefore({ tool: "write", sessionID: "ses_fx_io3", callID: "c293" }, { args: a });
  const nl = ioReadLines().slice(n0);
  const f = nl[0] ? nl[0].split(" | ") : [];
  check(
    String(n28),
    "S28",
    "hook R8 write-sibling (fallback root) → MUTATED + EXACTLY ONE new line: kind=redirect (byte-exact, cap-flattened) — no out-of-sandbox note",
    a.filePath === ioSandboxProj + "/r8-write-sib.txt" && JSON.stringify(a) !== aBefore && nl.length === 1 && f.length === 8 &&
      f[3] === "write" && f[7] === "pair-resolved" &&
      f[5] === ioCore.flattenField(`kind=redirect tool=write arg=filePath orig=${SANDBOX}\\r8-write-sib.txt value=${ioSandboxProj}/r8-write-sib.txt`),
    JSON.stringify({ after: a.filePath, nl }),
  );
  n28++;
}

// 294 — e2e span == root (the fallback workspace root, case variant) →
//      the root AS CONFIGURED (existsSync passes case-insensitively → the
//      fuzzy channel is silent → exactly one line)
{
  const a = { filePath: ioSandboxProj.toUpperCase() };
  const aBefore = JSON.stringify(a);
  const n0 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io3", callID: "c294" }, { args: a });
  const nl = ioReadLines().slice(n0);
  const f = nl[0] ? nl[0].split(" | ") : [];
  check(
    String(n28),
    "S28",
    "hook R8 span == root (case variant) → MUTATED to the root AS CONFIGURED + kind=redirect line (byte-exact, cap-flattened)",
    a.filePath === ioSandboxProj && JSON.stringify(a) !== aBefore && nl.length === 1 && f.length === 8 && f[7] === "pair-resolved" &&
      f[5] === ioCore.flattenField(`kind=redirect tool=read arg=filePath orig=${ioSandboxProj.toUpperCase()} value=${ioSandboxProj}`),
    JSON.stringify({ after: a.filePath, nl }),
  );
  n28++;
}

// 295 — e2e no mapping (an existing out-of-sandbox path) → NOT mutated
//      (byte-identical) + the out-of-sandbox NOTE fires (exactly one line,
//      as today)
{
  const a = { filePath: "C:/Windows/System32/cmd.exe" };
  const aBefore = JSON.stringify(a);
  const n0 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io3", callID: "c295" }, { args: a });
  const nl = ioReadLines().slice(n0);
  check(
    String(n28),
    "S28",
    "hook R8 no mapping → NOT mutated (byte-identical) + the out-of-sandbox NOTE fires (exactly one line, as today)",
    JSON.stringify(a) === aBefore && nl.length === 1 && nl[0].split(" | ")[7] === "out-of-sandbox" && !nl.some((x) => x.includes("kind=redirect")),
    JSON.stringify(nl),
  );
  n28++;
}

// 296 — e2e nested non-sibling (under the workspace root, two levels
//      down) → NOT mutated + NO kind=redirect line + no out-of-sandbox
{
  const a = { filePath: ioSandboxProj + "\\deep\\r8-file.txt" };
  const aBefore = JSON.stringify(a);
  const n0 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io3", callID: "c296" }, { args: a });
  const nl = ioReadLines().slice(n0);
  check(
    String(n28),
    "S28",
    "hook R8 nested non-sibling (under the workspace root) → NOT mutated + NO kind=redirect line + no out-of-sandbox",
    JSON.stringify(a) === aBefore && !nl.some((x) => x.includes("kind=redirect")) && !nl.some((x) => x.split(" | ")[7] === "out-of-sandbox"),
    JSON.stringify({ args: a, n: nl.length }),
  );
  n28++;
}

// ------------------------------------------------------------------ S29 R8 POSIX temp-root → scratchpad redirect (#102, 2026-09-26)
//
// The POSIX temp-root prefix mapping: /tmp/<rest> + /var/tmp/<rest> (and
// the bare root — the case (i) analogy) map 1:1 onto SCRATCHPAD_ROOT[/
// <rest>] — root substitution, the FULL remainder kept, case preserved.
// A CODE constant of the rule (opencode.jsonc names the Windows roots
// only — NOT config-derived; the mapping is root-list-independent).
// Pure resolver pins over the SPLIT core; the hook e2e pins use the S18
// factory (the probe's sandbox proj has NO opencode.jsonc — the FALLBACK
// roots apply). NEW surface: the BASH `command`-string redirect — mapped
// POSIX spans substituted in place (same 1:1 resolver, same kind=redirect
// line); unmapped spans stay byte-identical (fail-closed — the
// out-of-sandbox note stays for them).
let n29 = 297;

// 297 — pure: /tmp/<rest> + /var/tmp/<rest> → SCRATCHPAD_ROOT/<rest>
//      (the full remainder kept, case preserved)
check(
  String(n29),
  "S29",
  "resolveRedirect #102: /tmp/x + /var/tmp/y → scratchpad/<rest>; nested remainder kept; case preserved",
  ioCore.resolveRedirect("/tmp/x.txt", []) === "C:/Users/Wasiejen/AppData/Local/Temp/opencode/x.txt" &&
    ioCore.resolveRedirect("/var/tmp/y.txt", []) === "C:/Users/Wasiejen/AppData/Local/Temp/opencode/y.txt" &&
    ioCore.resolveRedirect("/tmp/a/b/c.txt", []) === "C:/Users/Wasiejen/AppData/Local/Temp/opencode/a/b/c.txt" &&
    ioCore.resolveRedirect("/tmp/My-File.TXT", []) === "C:/Users/Wasiejen/AppData/Local/Temp/opencode/My-File.TXT",
);
n29++;

// 298 — pure: the bare root → the scratchpad root itself (case (i)
//      analogy); double-slash + backslash forms normalized
check(
  String(n29),
  "S29",
  "resolveRedirect #102: bare /tmp → the scratchpad root; /tmp//x/ → scratchpad/x; \\tmp\\z.txt (backslashes) → scratchpad/z.txt",
  ioCore.resolveRedirect("/tmp", []) === "C:/Users/Wasiejen/AppData/Local/Temp/opencode" &&
    ioCore.resolveRedirect("/tmp//x/", []) === "C:/Users/Wasiejen/AppData/Local/Temp/opencode/x" &&
    ioCore.resolveRedirect("\\tmp\\z.txt", []) === "C:/Users/Wasiejen/AppData/Local/Temp/opencode/z.txt",
);
n29++;

// 299 — pure fail-closed: other POSIX/temp roots and /tmpfile/... have no
//      1:1 mapping → null (no mutation, as before)
check(
  String(n29),
  "S29",
  "resolveRedirect #102: no-mapping fail-closed — /tmpfile/..., /usr/local/..., /etc/... → null",
  ioCore.resolveRedirect("/tmpfile/q.txt", ["C:/x/rootA"]) === null &&
    ioCore.resolveRedirect("/usr/local/bin/x", ["C:/x/rootA"]) === null &&
    ioCore.resolveRedirect("/etc/hostname", []) === null,
);
n29++;

// 300 — e2e READ typed /tmp/x → MUTATED to scratchpad/<rest> + the
//      kind=redirect line FIRST (a fuzzy-rejected line may follow) + NO
//      out-of-sandbox line
{
  const a = { filePath: "/tmp/s29-read.txt" };
  const aBefore = JSON.stringify(a);
  const n0 = ioReadLines().length;
  await ioBefore({ tool: "read", sessionID: "ses_fx_io3", callID: "c300" }, { args: a });
  const nl = ioReadLines().slice(n0);
  const f = nl[0] ? nl[0].split(" | ") : [];
  check(
    String(n29),
    "S29",
    "hook #102 typed READ /tmp/x → MUTATED to scratchpad/<rest> + kind=redirect FIRST line (byte-exact, cap-flattened) + NO out-of-sandbox line",
    a.filePath === "C:/Users/Wasiejen/AppData/Local/Temp/opencode/s29-read.txt" && JSON.stringify(a) !== aBefore && f.length === 8 &&
      f[3] === "read" && f[7] === "pair-resolved" &&
      f[5] === ioCore.flattenField(`kind=redirect tool=read arg=filePath orig=/tmp/s29-read.txt value=C:/Users/Wasiejen/AppData/Local/Temp/opencode/s29-read.txt`) &&
      !nl.some((x) => x.split(" | ")[7] === "out-of-sandbox"),
    JSON.stringify({ after: a.filePath, nl }),
  );
  n29++;
}

// 301 — e2e WRITE typed /var/tmp/x → exactly ONE new line (M1: write has
//      no fuzzy channel — the redirect line only) + args mutated
{
  const a = { filePath: "/var/tmp/s29-write.txt", content: "S29" };
  const aBefore = JSON.stringify(a);
  const n0 = ioReadLines().length;
  await ioBefore({ tool: "write", sessionID: "ses_fx_io3", callID: "c301" }, { args: a });
  const nl = ioReadLines().slice(n0);
  const f = nl[0] ? nl[0].split(" | ") : [];
  check(
    String(n29),
    "S29",
    "hook #102 typed WRITE /var/tmp/x → MUTATED + EXACTLY ONE new line: kind=redirect (byte-exact, cap-flattened) — no out-of-sandbox note",
    a.filePath === "C:/Users/Wasiejen/AppData/Local/Temp/opencode/s29-write.txt" && JSON.stringify(a) !== aBefore && nl.length === 1 && f.length === 8 &&
      f[3] === "write" && f[7] === "pair-resolved" &&
      f[5] === ioCore.flattenField(`kind=redirect tool=write arg=filePath orig=/var/tmp/s29-write.txt value=C:/Users/Wasiejen/AppData/Local/Temp/opencode/s29-write.txt`),
    JSON.stringify({ after: a.filePath, nl }),
  );
  n29++;
}

// 302 — e2e BASH command with TWO mapped spans (/tmp + /var/tmp) → both
//      substituted in place (source order) + ONE kind=redirect line per
//      span (byte-exact, cap-flattened) + NO out-of-sandbox line
{
  const a = { command: "cp /tmp/s29-a.txt /var/tmp/s29-b.txt" };
  const aBefore = JSON.stringify(a);
  const n0 = ioReadLines().length;
  await ioBefore({ tool: "bash", sessionID: "ses_fx_io3", callID: "c302" }, { args: a });
  const nl = ioReadLines().slice(n0);
  const S = "C:/Users/Wasiejen/AppData/Local/Temp/opencode";
  check(
    String(n29),
    "S29",
    "hook #102 bash command (two mapped spans) → substituted in place + TWO kind=redirect lines (byte-exact, cap-flattened) + no out-of-sandbox",
    a.command === `cp ${S}/s29-a.txt ${S}/s29-b.txt` && JSON.stringify(a) !== aBefore &&
      nl.some((x) => x.includes(ioCore.flattenField(`kind=redirect tool=bash arg=command orig=/tmp/s29-a.txt value=${S}/s29-a.txt`))) &&
      nl.some((x) => x.includes(ioCore.flattenField(`kind=redirect tool=bash arg=command orig=/var/tmp/s29-b.txt value=${S}/s29-b.txt`))) &&
      nl.filter((x) => x.includes("kind=redirect")).length === 2 &&
      !nl.some((x) => x.split(" | ")[7] === "out-of-sandbox"),
    JSON.stringify({ after: a.command, nl }),
  );
  n29++;
}

// 303 — e2e BASH unmapped span (/etc/hostname) → NOT mutated
//      (byte-identical) + NO kind=redirect line + the out-of-sandbox NOTE
//      fires (as today)
{
  const a = { command: "cat /etc/hostname" };
  const aBefore = JSON.stringify(a);
  const n0 = ioReadLines().length;
  await ioBefore({ tool: "bash", sessionID: "ses_fx_io3", callID: "c303" }, { args: a });
  const nl = ioReadLines().slice(n0);
  check(
    String(n29),
    "S29",
    "hook #102 bash unmapped span → NOT mutated (byte-identical) + NO kind=redirect line + the out-of-sandbox NOTE fires (as today)",
    JSON.stringify(a) === aBefore && !nl.some((x) => x.includes("kind=redirect")) && nl.some((x) => x.split(" | ")[7] === "out-of-sandbox"),
    JSON.stringify(nl),
  );
  n29++;
}

// 304 — e2e BASH MIXED command (one mapped /tmp span + one unmapped /etc
//      span) → the mapped span substituted, the unmapped span left
//      byte-identical + exactly ONE kind=redirect line + the
//      out-of-sandbox NOTE fires (the note is recomputed on the
//      EFFECTIVE args — it fires for the unmapped span)
{
  const a = { command: "cat /tmp/s29-m.txt && cat /etc/s29-u" };
  const aBefore = JSON.stringify(a);
  const n0 = ioReadLines().length;
  await ioBefore({ tool: "bash", sessionID: "ses_fx_io3", callID: "c304" }, { args: a });
  const nl = ioReadLines().slice(n0);
  const S = "C:/Users/Wasiejen/AppData/Local/Temp/opencode";
  check(
    String(n29),
    "S29",
    "hook #102 bash mixed (mapped /tmp + unmapped /etc) → mapped span substituted, unmapped byte-identical + ONE kind=redirect line + out-of-sandbox NOTE fires",
    a.command === `cat ${S}/s29-m.txt && cat /etc/s29-u` && JSON.stringify(a) !== aBefore &&
      nl.filter((x) => x.includes("kind=redirect")).length === 1 &&
      nl.some((x) => x.includes(ioCore.flattenField(`kind=redirect tool=bash arg=command orig=/tmp/s29-m.txt value=${S}/s29-m.txt`))) &&
      nl.some((x) => x.split(" | ")[7] === "out-of-sandbox"),
    JSON.stringify({ after: a.command, nl }),
  );
  n29++;
}

// ------------------------------------------------------------------ S5 hygiene (6)

// 40 — every sandbox plugin.log line parses as JSON (no stray/blank/garbled lines)
{
  const bad = logLines().filter((l) => {
    try {
      JSON.parse(l);
      return false;
    } catch {
      return true;
    }
  });
  check("40", "S5", "every sandbox plugin.log line is JSON.parse-able", bad.length === 0, bad.slice(0, 3).join(" | "));
}

// 41 — every line <= 2000 chars with an ISO ts + a string kind
{
  const bad = logLines().filter((l) => {
    if (l.length > 2000) return true;
    try {
      const o = JSON.parse(l);
      return typeof o.ts !== "string" || Number.isNaN(Date.parse(o.ts)) || typeof o.kind !== "string";
    } catch {
      return true;
    }
  });
  check("41", "S5", "every line <= 2000 chars, ISO ts + string kind", bad.length === 0, bad.slice(0, 3).join(" | "));
}

// 42 — exact kind tallies (no stray lines either): warn==2 (S1), tool.before==6
//      (S1 3 + S2 3), tool.after==24 (S3 3 + S8 9 + S9 12), chatmsg==8 (the 8
//      S4 fires — per fire, mismatch included), gauge==3 (db-error +
//      parts-not-array + invalid-messageID), event==0, nudge==14 (S8 9: the 5
//      rung fires + the 2 delivery-failure sessions × {fire line + failure
//      line} = 5 + 4; S9 5: the rung-1 fires on ses_ro_n1..n5)
{
  const tally = (k) => linesOfKind(k).length;
  check(
    "42",
    "S5",
    "kind tallies exact: warn==2, tool.before==6, tool.after==24, chatmsg==8, gauge==3, event==0, nudge==14",
    tally("warn") === 2 && tally("tool.before") === 6 && tally("tool.after") === 24 && tally("chatmsg") === 8 && tally("gauge") === 3 && tally("event") === 0 && tally("nudge") === 14,
    `warn=${tally("warn")} tool.before=${tally("tool.before")} tool.after=${tally("tool.after")} chatmsg=${tally("chatmsg")} gauge=${tally("gauge")} event=${tally("event")} nudge=${tally("nudge")}`,
  );
}

// 43 — zero co-appended LIVE lines: the real handover files must be byte-identical, and the
//      real plugin.log must only GROW. The LIVE session's own plugin legitimately appends its
//      own lines while this probe runs — those are not probe writes. The probe's fingerprint
//      is its synthetic ids (s1–s3/c1–c6/d1–d3/t1–t8/ses_fx_*/ses_other): if any appended
//      real-log line carries one, the probe wrote out of the sandbox.
{
  const POST = snapshotReal();
  const handoverDiff = REAL_FILES.filter((f) => f !== "plugin.log" && (PRE_REAL[f] ?? null) !== (POST[f] ?? null));
  const preLog = PRE_REAL["plugin.log"] ?? "";
  const postLog = POST["plugin.log"] ?? "";
  const monotonic = postLog.length >= preLog.length && (preLog === "" || postLog.startsWith(preLog));
  const newLines = monotonic ? postLog.slice(preLog.length).split("\n").filter((l) => l.length > 0) : [];
  const FINGERPRINT = ["s1", "s2", "s3", "c1", "c2", "c3", "c4", "c5", "c6", "d1", "d2", "d3", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f13", "f14", "ses_fx_ok", "ses_fx_unk", "ses_fx_empty", "ses_fx_old", "ses_other", "ses_lad_0", "ses_lad_1", "ses_lad_2", "ses_lad_3", "ses_lad_4", "ses_lad_5", "ses_lad_6", "ses_lad_7", "ses_ro_k", "ses_ro_u", "ses_ro_nom", "ses_ro_empty", "ses_ro_absent", "ses_ro_n1", "ses_ro_n2", "ses_ro_n3", "ses_ro_n4", "ses_ro_n5", "ses_cm_1", "ses_cm_fb", "ses_cm_line", "ses_cm_bare", "ses_cm_budget", "ses_cm_fail", "ses_cm_ptr", "ses_rc_off", "ses_rc_ok", "ses_rc_exh", "ses_rc_non", "ses_rc_keep", "ses_rc_cfg", "ses_rc_nomodel", "ses_qc_self", "ses_qc_retry", "ses_qc_flat", "ses_qc_nocli", "ses_qc_gate", "ses_qc_cpu", "ses_qc_fail", "ses_qc_msg", "ses_qc_cross", "ses_qc_rpc", "ses_qc_pair", "ses_qc_emg", "ses_qc_emg0", "ses_qc_emgdf", "ses_pc_noscript", "ses_pc_ok", "ses_qc_dumpok", "ses_qc_cfgbody", "ses_rc_tokcomp", "ses_rc_tokbud", "ses_qc_tokcomp"];
  const probeWroteLive = newLines.some((l) => FINGERPRINT.some((fid) => l.includes(`"session":"${fid}"`) || l.includes(`"call":"${fid}"`) || l.includes(`"sess":"${fid}"`)));
  check(
    "43",
    "S5",
    "zero co-appended live lines: handover files byte-identical; plugin.log append-only; no probe-id lines in the appended tail",
    handoverDiff.length === 0 && monotonic && !probeWroteLive,
    `handoverDiff=${handoverDiff.join(",")} monotonic=${monotonic} probeWroteLive=${probeWroteLive}`,
  );
}

// 45 — zero writes outside the sandbox: .opencode listing + git status unchanged
{
  const listingDiff = listOpencode().filter((p) => !PRE_OP_LISTING.includes(p));
  const gitChanged = gitStatus() !== PRE_GIT_STATUS;
  check("45", "S5", "sandbox isolation: .opencode listing + git status unchanged (no new/changed files outside sandbox)", listingDiff.length === 0 && !gitChanged, `new: ${listingDiff.join(", ")}; gitChanged=${gitChanged}`);
}

// 64 — the ctx log path is GIT-IGNORED: `git check-ignore -q .opencode/temp/ctx.log`
//      exits 0 from REPO_ROOT (the `temp` entry in .opencode/.gitignore — the DoD4
//      requirement; the file itself may or may not exist yet — check-ignore tests
//      the rule)
{
  let ignored = true;
  try {
    execFileSync("git", ["check-ignore", "-q", ".opencode/temp/ctx.log"], { cwd: REPO_ROOT });
  } catch {
    ignored = false;
  }
  check("64", "S5", "the ctx log path is git-ignored (git check-ignore -q .opencode/temp/ctx.log exits 0)", ignored);
}

// ------------------------------------------------------------------ summary

const total = results.length;
const okCount = results.filter((r) => r.ok).length;
if (okCount === total) {
  rmSync(SANDBOX, { recursive: true, force: true });
  console.log(`PROBE handover: ${total}/${total} PASS`);
  process.exit(0);
} else {
  console.log(`PROBE handover: FAILED — ${total - okCount} check(s) failed; sandbox kept at ${SANDBOX}`);
  for (const r of results.filter((x) => !x.ok)) console.log(`  FAIL [${r.id}] ${r.label} — ${r.detail}`);
  process.exit(1);
}
