// =============================================================================
// Persistent offline probe for .opencode/plugin/handover_v2.4.ts (v2.5 — the
// de-peek build: native session-gated context gauge, TODO.md #30/#35;
// backend chain node:sqlite → bun:sqlite → spawn-sqlite3, TODO #37).
// REBUILT 2026-09-10 (continuation 2) + EXTENDED 2026-09-10 (#37 S7 backend
// chain section) + EXTENDED 2026-09-10/11 (v2.8: S9 readout append / ctx log /
// deferred delivery + the S8 deferred-delivery ticks): the pre-rebuild probe
// (v2.2.1 era) targeted the DELETED handover.ts, the retired
// experimental.chat.system.transform hook, and the fake-$-shell S4 shapes —
// all void with the shell gauge. PERMANENT repo tooling: RE-RUN, never rebuild
// — exception: the plugin's hook surface changes.
//
// EXACT RUN COMMAND (from the repo root, PowerShell 7 — this IS the run
// command, do not rediscover anything):
//     node .opencode\plugin\probes\handover_probe.mjs
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
//   .opencode/handover_task.md spec (non-empty sentinel), mirror file pre-filled
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
//   S9 readout + ctx log + deferred delivery (10) — the v2.8 build (the
//      re-scoped design of record — see the plugin's v2.8 header block): ONE
//      per-session gauge read per tool.execute.after feeds (1) the MINIMAL
//      readout appended to the tool result, (2) the ladder (unchanged), (3)
//      the single-file ctx log at SANDBOX/.opencode/temp/ctx.log (isomorphic:
//      an entry IFF the readout was appended). Fixture fx_ro.db (window 120K
//      except where noted; ses_ro_absent deliberately NOT in the db); the
//      plugin is re-initialized with a status-aware fake client (a mutable
//      S9_STATUS drives the busy/idle check — direct-map and SDK fields-style
//      shapes):
//      (54) known window: output byte-exact `tool body\n(35%/78K)` + ctx log
//          line 1 `<dt> probe-model-120K_MTP (35%/78K)`, below rung 1
//      (55) unknown window on a trailing-newline output `x\n`: direct concat
//          byte-exact `x\n(46K)` + ctx log line 2 WITH the model
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
//   S5 hygiene (6): every sandbox plugin.log line is JSON.parse-able; <=2000
//      chars with an ISO ts + a string kind; exact kind tallies (warn==2,
//      tool.before==6, tool.after==22, chatmsg==8, gauge==3, event==0,
//      nudge==14); the
//      real handover files byte-identical to pre-run and zero CO-APPENDED live
//      lines (the real plugin.log may only grow — a line carrying a probe
//      fingerprint id s*/c*/d*/t*/e1–e9/f1–f10/ses_fx_*/ses_other/ses_lad_*/
//      ses_ro_* = the probe wrote out of the sandbox); zero new/changed files
//      outside the sandbox (.opencode listing + git status, before vs after);
//      the ctx log path is git-ignored (git check-ignore -q, REPO_ROOT).
//
// EXPECTED OUTPUT:
//   S1=3 S2=4 S3=5 S4=8 S6=8 S7=11 S8=8 S9=10 S5=6  →  "PROBE handover: 63/63 PASS",
//   exit code 0. Anything else with THIS file = behavior drift or broken
//   environment — read the failures, do not "fix" the plugin for the probe.
//   On failure the sandbox root is KEPT (printed) for forensics.
// =============================================================================

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const PLUGIN_TS = path.join(REPO_ROOT, ".opencode", "plugin", "handover_v2.4.ts");

// --------------------------------------------------------------- fixed payloads

const HOV_PROMPT = "Read .opencode/handover_task.md and execute it EXACTLY.";
const ORIGINAL_SPEC =
  "# PROBE DUMMY SPEC\n\nsentinel — NOT the real spec file (the real one lives at <repo root>/.opencode/handover_task.md).\n";
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
const REAL_FILES = ["handover_task.md", "handover_task_to_planner.md", "plugin.log"];
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
const SB_SPEC = path.join(SANDBOX, ".opencode", "handover_task.md");
const SB_MIRROR = path.join(SANDBOX, ".opencode", "handover_task_to_planner.md");
const SB_LOG = path.join(SANDBOX, ".opencode", "plugin.log");
mkdirSync(path.join(SANDBOX, ".opencode"), { recursive: true });
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
const { readGauge, formatGauge, parseWindow, parseModelId, setDbPath, getDbPath, setBackends, getBackends, DEFAULT_BACKENDS, setImportForTest, clearImportForTest, importAttemptsForTest } =
  await import(new URL("../scripts/gauge.mjs", import.meta.url).href);

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

// ------------------------------------------------------------------ S9 readout + ctx log + deferred delivery (10) — v2.8
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
  RO_ROW("ses_ro_k", 42_012, "probe-model-120K_MTP"), // known window → (35%/78K), below rung 1
  RO_ROW("ses_ro_u", 45_678, "CPU-Qwen3-0.6B"), // no window marker → (46K)
  RO_ROW("ses_ro_nom", 24_056, null), // model NULL → (24K) (the model-FIELD-omitted log shape; built per the locked fixture spec)
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
//      byte-shape `<YYYY-MM-DD_HH-MM> probe-model-120K_MTP (35%/78K)`
{
  const pre = ctxLogLines().length; // S8's feeds already wrote entries (consumer 3 is unconditional) — delta-based
  const out = { title: "t", output: "tool body", metadata: {} };
  await afterFeed("ses_ro_k", "f1", {}, out);
  const ll = ctxLogLines();
  const last = ll.length > 0 ? ll[ll.length - 1] : "";
  check(
    "54",
    "S9",
    "known window: output byte-exact `tool body\\n(35%/78K)` + NEW ctx log line `<dt> probe-model-120K_MTP (35%/78K)`, below rung 1 (no nudge)",
    out.output === "tool body\n(35%/78K)" && ll.length === pre + 1 && new RegExp(`^${DT} probe-model-120K_MTP \\(35%/78K\\)$`).test(last) && s9Nudge("ses_ro_k").length === 0,
    JSON.stringify({ out: out.output, ll }),
  );
}

// 55 — unknown window on a TRAILING-NEWLINE output: direct concat byte-exact
//      `x\n(46K)` + the ctx log line 2 carries the model (CPU-Qwen3-0.6B)
{
  const pre = ctxLogLines().length;
  const out = { title: "t", output: "x\n", metadata: {} };
  await afterFeed("ses_ro_u", "f2", {}, out);
  const ll = ctxLogLines();
  const last = ll.length > 0 ? ll[ll.length - 1] : "";
  check(
    "55",
    "S9",
    "unknown window (trailing-newline output): byte-exact `x\\n(46K)` direct concat + NEW ctx log line `<dt> CPU-Qwen3-0.6B (46K)` (model carried)",
    out.output === "x\n(46K)" && ll.length === pre + 1 && new RegExp(`^${DT} CPU-Qwen3-0.6B \\(46K\\)$`).test(last),
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
    syncOk && out.output === "n1 body\n(50%/59K)" && s9Calls.length === 1 && c?.path?.id === "ses_ro_n1" && c.body.parts.length === 1 && p0?.type === "text" && p0?.synthetic === true && textOk && ctxLogLines().length === lBefore + 1,
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
    fired && out.output === "n2 body\n(50%/59K)" && ctxLogLines().length === lBefore + 1 && s9Calls.length === 1,
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
    s9Calls.length === 2 && s9Calls[1]?.path?.id === "ses_ro_n3" && out.output === "n3 body\n(50%/59K)",
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
    s9Calls.length === 2 && s9Nudge("ses_ro_n4").length === 1 && out.output === "n4 body\n(50%/59K)",
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
    s9Calls.length === 3 && s9Calls[2]?.path?.id === "ses_ro_n5" && out.output === "n5 body\n(50%/59K)",
    JSON.stringify({ calls: s9Calls.length }),
  );
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
//      (S1 3 + S2 3), tool.after==22 (S3 3 + S8 9 + S9 10), chatmsg==8 (the 8
//      S4 fires — per fire, mismatch included), gauge==3 (db-error +
//      parts-not-array + invalid-messageID), event==0, nudge==14 (S8 9: the 5
//      rung fires + the 2 delivery-failure sessions × {fire line + failure
//      line} = 5 + 4; S9 5: the rung-1 fires on ses_ro_n1..n5)
{
  const tally = (k) => linesOfKind(k).length;
  check(
    "42",
    "S5",
    "kind tallies exact: warn==2, tool.before==6, tool.after==22, chatmsg==8, gauge==3, event==0, nudge==14",
    tally("warn") === 2 && tally("tool.before") === 6 && tally("tool.after") === 22 && tally("chatmsg") === 8 && tally("gauge") === 3 && tally("event") === 0 && tally("nudge") === 14,
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
  const FINGERPRINT = ["s1", "s2", "s3", "c1", "c2", "c3", "c4", "c5", "c6", "d1", "d2", "d3", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "ses_fx_ok", "ses_fx_unk", "ses_fx_empty", "ses_fx_old", "ses_other", "ses_lad_0", "ses_lad_1", "ses_lad_2", "ses_lad_3", "ses_lad_4", "ses_lad_5", "ses_lad_6", "ses_lad_7", "ses_ro_k", "ses_ro_u", "ses_ro_nom", "ses_ro_empty", "ses_ro_absent", "ses_ro_n1", "ses_ro_n2", "ses_ro_n3", "ses_ro_n4", "ses_ro_n5"];
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
