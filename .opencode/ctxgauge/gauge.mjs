// =============================================================================
// Shared context-gauge core (de-peek — TODO.md #30/#35; backend chain — #37):
// ONE implementation imported by BOTH the handover plugin (chat.message
// injection, .opencode/plugin/handover_v2.4.ts) and the self-peek CLI
// (peek.mjs).
//
// READ BACKEND CHAIN (MAINTAINER RULING 2026-09-10, TODO #37) — tried in
// order, the FIRST SUCCESS WINS; the chosen backend is CACHED PER PROCESS
// (keyed by db path; invalidated by setDbPath/setBackends) so the
// repeatedly-firing plugin host does NOT re-try failed imports on every
// fire (a failed import is memoized and re-thrown, never re-imported):
//   1. node:sqlite   — dynamic import, DatabaseSync({ readOnly: true }).
//                      Flag-free on the system node v24.19.0 (the CLI /
//                      probe host, verified) and ALSO exposed by the SYSTEM
//                      bun 1.4.2 — the 2026-09-10 host-proxy check measured
//                      THAT host, NOT the opencode host (see the evidence
//                      block below).
//   2. bun:sqlite    — dynamic import, the NATIVE bun module — the best
//                      zero-spawn hope on the bun-compiled opencode.exe
//                      host. API facts VERIFIED 2026-09-10 against the
//                      SYSTEM bun 1.4.2 (the spec sketch was wrong —
//                      shape surprise, recorded in the worker summary):
//                        - named export `Database`
//                        - constructor option is `readonly: true` (NOT
//                          node:sqlite's `readOnly`, NOT `readWrite`;
//                          bun rejects unknown options — "Misspelled
//                          option" / "bad parameter or other API misuse")
//                        - a native `timeout` (busy-wait ms) option works
//                          in combination with `readonly`
//                        - `prepare().get()` returns a row object, or
//                          NULL (not undefined like node:sqlite) on no row
//                        - `exec("PRAGMA busy_timeout = N;")` + `close()`
//                          work; write attempts on a readonly db throw
//                          "attempt to write a readonly database"; a
//                          readonly open of the LIVE WAL-mode db
//                          (actively written by another process) works
//                      The adapter tries `{ readonly: true, timeout }`
//                      first and falls back to the plain `{ readonly: true }`
//                      form on a constructor SHAPE error only (an open
//                      error such as "unable to open database file" is
//                      never swallowed).
//   3. spawn-sqlite3 — the retired v1.x backend, PROVEN IN PRODUCTION under
//                      the production bun host (maintainer-placed SQLite
//                      CLI at .opencode/plugin/tools/sqlite3.exe — resolved
//                      RELATIVE to this file, never a hardcoded user path).
//                      The v1.x discipline, recovered from git history
//                      (2cf5f33): ARGS ARRAY (no shell — no quoting
//                      surface), the db as a READ-ONLY URI
//                      `file:<path>/?mode=ro` (no journal write while
//                      opencode writes concurrently), the MARKER SQL
//                      (`M|…` / `S|…` rows — the message `data` JSON is
//                      never fetched into JS), NO PRAGMA in the call (its
//                      echo pollutes stdout). Timeout discipline (this
//                      build): ONE attempt, hard 2500 ms KILL
//                      (timeout ⇒ db-error, never a hang; no busy-retry —
//                      the retry applies to the in-process backends only,
//                      per the ruling).
//
// WHY THE CHAIN — PRODUCTION EVIDENCE (2026-09-10, maintainer restart):
// the v2.5 node:sqlite-only core (313e83b) fails on EVERY chat.message fire
// under the production opencode.exe (bun-compiled) host:
//   kind:"gauge" reason:db-error preview:"sqlite-module ResolveMessage: No
//   such built-in module: node:sqlite"
// ⇒ NO `ctx:` line reached ANY agent in production. The opencode-baked bun's
// capability (node:sqlite? bun:sqlite? neither?) is UNVERIFIED and lands
// with the next maintainer restart — until then the chain degrades safely:
// missing module ⇒ next backend; all backends failing ⇒ a db-error evidence
// line that NAMES the failing backend (diagnosable straight from the
// production plugin.log).
//
// NEVER-THROW (preserved across the whole chain): ANY failure in ANY backend
// ⇒ kind:"db-error" with a capped preview that NAMES the failing backend
// (`node:sqlite …` / `bun:sqlite …` / `spawn-sqlite3 …`). NO new `kind`
// vocabulary, NO new gauge-failure reasons. Busy/locked on the in-process
// backends (1+2): `PRAGMA busy_timeout = 2500` via the API + ONE retry;
// the spawn backend keeps its own hard-timeout discipline (above).
//
// QUERIES — two single-row reads per read (json_extract in SQL — the message
// `data` JSON is never fetched or JS-parsed):
//   1. newest session:  SELECT id FROM session ORDER BY time_updated DESC LIMIT 1
//   2. finished step:   the newest session's latest message row whose `data`
//      carries the `"finish"` marker (json_extract of tokens.total/output;
//      the in-flight step has no "finish" field, user rows no tokens at all)
// NULL total (no finished step / empty tokens) → the no-total readout.
//
// TOKEN SEMANTICS (verified 2026-09-10 across all recent step rows — TODO #30):
// total = input + output + cache.read holds EXACTLY ⇒ ctx = total − output =
// the exact prompt size at the latest FINISHED step of the newest session =
// the current context at that moment. The in-flight step has NO "finish"
// field (excluded by the LIKE); user rows carry no token fields.
//
// WINDOW RULE (MAINTAINER CONFIRMED 2026-09-09): llama-swap model names
// encode the window as a trailing `<N>K` or `<N>M` marker — the window is
// N × 1000 (K) or N × 10⁶ (M) EXACTLY: `…-120K_MTP` → 120000, `…-210K` →
// 210000, `…-256K` → 256000, `-1.5M` → 1500000. `-MTP` is a speed note only
// (multi-token prediction), NOT extra capacity. The LAST matching marker
// wins (real ids carry no other K/M markers; `IQ4KT` never matches — no
// dash/underscore precedes its 4). No match ⇒ window UNKNOWN — NEVER a
// hardcoded guess (the retired python peek CLI `12050`-style fallback is the bug
// being removed: a real model such as CPU-Qwen3-0.6B must never read as a
// guessed window).
//
// READOUT FORMS — the ONE string used by the CLI, the plugin's injected text,
// and the T2 nudge text (BYTE-IDENTICAL across the chain — the plugin and
// peek.mjs need no change for the output):
// - window known:      SESSION=<sid> CTX=<ctx> (<pct>%) REM=<window-ctx>
//                       (pct = integer ctx*100//window)
// - window unknown:    SESSION=<sid> CTX=<ctx> — nothing else (no guessed
//                       pct/REM)
// - no total / unreadable db: SESSION=<sid|unknown> CTX=notAvailable —
//   verbatim, never a silent/zero confusion.
//
// SESSION-GATING (the #32 cross-session feed root cause): the result carries
// the id of the session the read came from (sid). The plugin posts its part
// ONLY when sid === the hook's sessionID — a mismatch never posts, and logs
// no line either (a normal multi-session state, not a failure). NOTE the
// deliberate difference to the retired python peek CLI: there is NO fallback to the
// newest finished message of ANOTHER session (that fallback WAS the feed bug).
// =============================================================================

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const BUSY_TIMEOUT_MS = 2500;
const SPAWN_TIMEOUT_MS = 2500;
const MAX_BUFFER = 1024 * 1024;
const THIS_DIR = dirname(fileURLToPath(import.meta.url));

// The opencode.db location (fact-2 of the T1 spec, planner-verified).
export const DEFAULT_DB_PATH = join(os.homedir(), ".local", "share", "opencode", "opencode.db");
// The maintainer-placed SQLite CLI, resolved RELATIVE TO THIS FILE (stable
// for the CLI cwd and the plugin import alike): .opencode/ctxgauge →
// ../plugin/tools. NEVER deleted or moved (maintainer-placed, TODO #30/#37).
export const DEFAULT_EXE_PATH = join(THIS_DIR, "..", "plugin", "tools", "sqlite3.exe");
// The backend chain, in selection order (see the READ BACKEND CHAIN header).
export const DEFAULT_BACKENDS = Object.freeze(["node:sqlite", "bun:sqlite", "spawn-sqlite3"]);

// One process-wide current db path — the override lets the probe point
// the plugin and the CLI at a temp fixture db without any file editing.
// readGauge(p) accepts an explicit db path too (the probe's direct gauge calls).
let dbPath = DEFAULT_DB_PATH;
// The active backend list (setBackends = the probe's chain-restriction hook;
// it also clears the backend cache — a restricted list changes the selection).
let backendList = [...DEFAULT_BACKENDS];
// Per-process cache: db path -> the last SUCCESSFUL backend name. Invalidated
// by setDbPath and setBackends (documented ruling: invalidate on setDbPath).
const backendCache = new Map();
// Dynamic-import memo (per spec, per process): a rejected import is stored
// as a failure marker and RE-THROWN — never re-imported on every fire.
const importCache = new Map();
const importAttemptCount = new Map();

export function setDbPath(p) {
  dbPath = p;
  backendCache.clear();
}
export function getDbPath() {
  return dbPath;
}
export function setBackends(list) {
  backendList = Array.isArray(list) ? [...list] : [...DEFAULT_BACKENDS];
  backendCache.clear();
}
export function getBackends() {
  return [...backendList];
}

// Probe-only test hooks (the production host never calls these):
export function setImportForTest(spec, moduleValue) {
  importCache.set(spec, moduleValue);
}
export function clearImportForTest(spec) {
  importCache.delete(spec);
}
export function importAttemptsForTest(spec) {
  return importAttemptCount.get(spec) ?? 0;
}

function importModule(spec) {
  const hit = importCache.get(spec);
  if (hit !== undefined) {
    if (hit !== null && typeof hit === "object" && hit.__failed) throw hit.err;
    return hit;
  }
  importAttemptCount.set(spec, (importAttemptCount.get(spec) ?? 0) + 1);
  const pr = import(spec).then(
    (m) => m,
    (e) => {
      importCache.set(spec, { __failed: true, err: e });
      throw e;
    },
  );
  importCache.set(spec, pr);
  return pr;
}

// Model id -> window. The ONLY parser — LAST marker wins, no fallback (see
// the WINDOW RULE header block).
export function parseWindow(modelId) {
  if (typeof modelId !== "string") return undefined;
  const re = /[-_](\d+(?:\.\d+)?)(K|M)(?![0-9])/g;
  let m = null;
  let last = null;
  while ((m = re.exec(modelId)) !== null) last = m;
  if (last == null) return undefined;
  return Math.round(parseFloat(last[1]) * (last[2] === "K" ? 1000 : 1000 * 1000));
}

// session.model column -> model id. opencode >= v2 schema: JSON {"id":...};
// pre-v2 rows may carry the plain id string — accept both, never throw.
export function parseModelId(raw) {
  if (typeof raw !== "string" || raw === "") return "";
  if (raw.startsWith("{")) {
    try {
      const o = JSON.parse(raw);
      return o != null && typeof o.id === "string" ? o.id : "";
    } catch {
      return "";
    }
  }
  return raw;
}

// Result shapes (one implementation shared by plugin + CLI + probe —
// UNCHANGED by the chain; the db-error `error` text now NAMES the backend):
//   ok         : { ok:true,  kind:"ok",        sid, modelId, total, output, ctx, window }
//   no total   : { ok:false, kind:"no-total",  sid, modelId }            // read ok, no total
//   unreadable : { ok:false, kind:"db-error",  sid:"unknown", modelId:"", error }

// The ONE readout form (see the header). sid missing/undefined -> "unknown".
export function formatGauge(r) {
  let out;
  if (r.ok) {
    const w = r.window;
    out =
      w == null || w <= 0
        ? `CTX=${r.ctx}`
        : `CTX=${r.ctx} (${Math.floor((r.ctx * 100) / w)}%) REM=${w - r.ctx}`;
  } else {
    out = "CTX=notAvailable";
  }
  return `SESSION=${r.sid ?? "unknown"} ${out}`;
}

// The two single-row reads (see the header). json_extract never fetches the
// `data` JSON into JS; a missing/NULL token field reads as null.
const SQL_NEWEST_SESSION = "SELECT id FROM session ORDER BY time_updated DESC LIMIT 1";
const SQL_FINISHED_STEP =
  "SELECT s.id AS sid, s.model AS model, " +
  "json_extract(m.data, '$.tokens.total') AS total, " +
  "json_extract(m.data, '$.tokens.output') AS output " +
  "FROM message m JOIN session s ON s.id = m.session_id " +
  "WHERE s.id = (SELECT id FROM session ORDER BY time_updated DESC LIMIT 1) " +
  'AND m.data LIKE \'%"finish"%\' ORDER BY m.time_created DESC LIMIT 1';

// The spawn backend's MARKER SQL (v1.x discipline — see the header): two
// statements, marker-prefixed rows; an empty first result simply omits the M
// row, so the output is never ambiguous.
const GAUGE_SQL_MARKER =
  "SELECT 'M', s.id, s.model, json_extract(m.data, '$.tokens.total'), json_extract(m.data, '$.tokens.output') " +
  "FROM message m JOIN session s ON s.id = m.session_id " +
  "WHERE s.id = (SELECT id FROM session ORDER BY time_updated DESC LIMIT 1) " +
  "AND m.data LIKE '%\"finish\"%' ORDER BY m.time_created DESC LIMIT 1; " +
  "SELECT 'S', id FROM session ORDER BY time_updated DESC LIMIT 1;";

// ---------------------------------------------------------------------------
// The backends — each returns the SAME raw shape:
//   { sid: string|undefined, model: string|null, total: number|null, output: number|null }
// and THROWS on any hard failure (the chain maps that to the named db-error).

// In-process helper shared by backends 1+2: open (READ-ONLY), the busy_timeout
// PRAGMA via the API, the two single-row reads, ONE retry on busy/locked,
// best-effort close.
function readApiDb(openFn) {
  const attempt = () => {
    let db;
    try {
      db = openFn();
      db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS};`);
      const newest = db.prepare(SQL_NEWEST_SESSION).get();
      const step = db.prepare(SQL_FINISHED_STEP).get();
      return {
        sid: typeof newest?.id === "string" && newest.id !== "" ? newest.id : undefined,
        model: step != null && typeof step.model === "string" ? step.model : null,
        total: step?.total == null ? null : Number(step.total),
        output: step?.output == null ? null : Number(step.output),
      };
    } finally {
      try {
        db?.close();
      } catch {
        // best effort — the read outcome has already been captured
      }
    }
  };
  try {
    return attempt();
  } catch (e) {
    if (/busy|locked/i.test(String(e?.message ?? e))) {
      // busy/locked on the first attempt (opencode writes concurrently) and
      // the busy_timeout budget exhausted: retry ONCE before giving up.
      return attempt();
    }
    throw e;
  }
}

// Backend 1 — node:sqlite (DatabaseSync, readOnly). Flag-free on the system
// node v24.19.0; also exposed by the SYSTEM bun 1.4.2 (NOT the opencode host).
async function readNodeSqlite(p) {
  const mod = await importModule("node:sqlite");
  const DatabaseSync = mod?.DatabaseSync;
  if (typeof DatabaseSync !== "function") throw new Error("DatabaseSync export missing");
  return readApiDb(() => new DatabaseSync(p, { readOnly: true }));
}

// Backend 2 — bun:sqlite (the native bun module). API facts verified on the
// system bun 1.4.2 — see the READ BACKEND CHAIN header (the spec's
// `{ create: false, readWrite: false }` sketch was WRONG for bun 1.4.2:
// the option is `readonly`, unknown options are rejected).
async function readBunSqlite(p) {
  const mod = await importModule("bun:sqlite");
  const Database = mod?.Database ?? (typeof mod?.default === "function" ? mod.default : mod?.default?.Database);
  if (typeof Database !== "function") throw new Error("Database export missing");
  const open = () => {
    try {
      return new Database(p, { readonly: true, timeout: BUSY_TIMEOUT_MS });
    } catch (e) {
      // shape-surprise fallback: a host whose bun rejects the combined
      // options falls back to the plain readonly form — but ONLY for a
      // constructor shape error; an OPEN error (missing file, …) propagates.
      if (/bad parameter|api misuse|misspelled/i.test(String(e?.message ?? e))) return new Database(p, { readonly: true });
      throw e;
    }
  };
  return readApiDb(open);
}

// Backend 3 — spawn-sqlite3 (the v1.x discipline, recovered from git
// history 2cf5f33; see the READ BACKEND CHAIN header for the full rationale).
const uriRo = (p) => `file:${p.replace(/\\/g, "/")}?mode=ro`;
// The sqlite3 CLI prints NULL as an EMPTY field (and honors a NULLVALUE of
// "NULL" only if configured) — treat both as "no value" → no-total. (The
// v1.x `Number("") → 0` would have misread that as total 0 — hardened here.)
const parseMarkerNumber = (v) => {
  if (typeof v !== "string" || v === "" || v === "NULL") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};
async function readSpawnSqlite3(p) {
  if (!existsSync(DEFAULT_EXE_PATH)) throw new Error(`exe-missing ${DEFAULT_EXE_PATH}`);
  let res;
  try {
    res = await execFileAsync(DEFAULT_EXE_PATH, [uriRo(p), GAUGE_SQL_MARKER], {
      timeout: SPAWN_TIMEOUT_MS, // hard KILL — a stuck child becomes a db-error, never a hang
      maxBuffer: MAX_BUFFER,
      encoding: "utf8",
    });
  } catch (e) {
    const isTimeout = e?.killed === true || /timed?\s*out/i.test(String(e?.message ?? ""));
    const detail = isTimeout ? `timeout ${SPAWN_TIMEOUT_MS}ms kill` : String(e?.stderr ?? "").trim() || String(e?.message ?? e);
    throw new Error(String(detail).replace(/\r?\n+/g, " | ").slice(0, 106));
  }
  let sid;
  let model = null;
  let total = null;
  let output = null;
  for (const line of String(res.stdout).split(/\r?\n/)) {
    if (line.startsWith("S|")) {
      sid = line.slice(2) || undefined;
    } else if (line.startsWith("M|")) {
      const parts = line.slice(2).split("|");
      // sid | model... | total | output — total/output are the LAST two
      // fields (a model id containing '|' is then still safe).
      if (parts.length >= 4) {
        sid = parts[0] || sid;
        model = parts.slice(1, parts.length - 2).join("|") || null;
        total = parseMarkerNumber(parts[parts.length - 2]);
        output = parseMarkerNumber(parts[parts.length - 1]);
      }
    }
  }
  return { sid, model, total, output };
}

const BACKENDS = {
  "node:sqlite": readNodeSqlite,
  "bun:sqlite": readBunSqlite,
  "spawn-sqlite3": readSpawnSqlite3,
};

function orderedBackendsFor(p) {
  const cached = backendCache.get(p);
  if (cached !== undefined && backendList.includes(cached)) {
    // The last successful backend is tried FIRST (the per-process cache);
    // the rest follow the chain order.
    return [cached, ...backendList.filter((n) => n !== cached)];
  }
  return [...backendList];
}

// raw (any backend) -> the shared result shapes.
function gaugeFromRaw(raw) {
  const sid = typeof raw.sid === "string" && raw.sid !== "" ? raw.sid : "unknown";
  const total = raw.total == null ? Number.NaN : Number(raw.total);
  if (Number.isNaN(total)) {
    return { ok: false, kind: "no-total", sid, modelId: parseModelId(raw.model) };
  }
  const output = raw.output == null || Number.isNaN(Number(raw.output)) ? 0 : Number(raw.output);
  const modelId = parseModelId(raw.model);
  return {
    ok: true,
    kind: "ok",
    sid,
    modelId,
    total,
    output,
    ctx: total - output,
    window: parseWindow(modelId),
  };
}

// Reads the db (NEVER throws — a hard failure returns kind:"db-error").
// Walks the backend chain in order (the per-path cached backend first); the
// FIRST SUCCESS wins and is cached for the rest of the process. Every
// backend failure is collected; if ALL fail, the result names the DEEPEST
// failing backend (the last in the chain — the production last resort).
export async function readGauge(dbPathOverride) {
  const p = dbPathOverride ?? dbPath;
  const failures = [];
  for (const name of orderedBackendsFor(p)) {
    const impl = BACKENDS[name];
    if (impl === undefined) {
      failures.push({ name, error: "unknown-backend" });
      continue;
    }
    try {
      const raw = await impl(p);
      backendCache.set(p, name);
      return gaugeFromRaw(raw);
    } catch (e) {
      failures.push({ name, error: String(e?.message ?? e).replace(/\r?\n+/g, " | ").slice(0, 106) });
    }
  }
  const last = failures.length > 0 ? failures[failures.length - 1] : { name: "chain", error: "no backends configured" };
  return {
    ok: false,
    kind: "db-error",
    sid: "unknown",
    modelId: "",
    error: `${last.name} ${last.error}`.slice(0, 120),
  };
}
