// =============================================================================
// Shared context-gauge core (de-peek — TODO.md #30/#35): ONE implementation
// imported by BOTH the handover plugin (chat.message injection,
// .opencode/plugin/handover_v2.4.ts) and the self-peek CLI (peek.mjs).
//
// READ BACKEND — built-in `node:sqlite` (MAINTAINER RE-RULING 2026-09-10,
// supersedes the 2026-09-09 spawn-CLI backend block): `node:sqlite`
// (`DatabaseSync`) is flag-free on node v24.19.0 (the CLI / probe host,
// verified). The module is imported DYNAMICALLY inside readGauge — the
// bun-compiled opencode.exe plugin host is the KNOWN RISK (it may lack
// `node:sqlite`): a missing/unsupported module never breaks the plugin
// import, it just maps to kind "db-error" (the production guard — the
// bun 1.4.2 host-proxy check + the maintainer's restart + one-shot log read
// are the production evidence).
//
// The DB is opened READ-ONLY (`{ readOnly: true }`) — no journal write while
// opencode writes concurrently. Concurrency resilience (the ~2500 ms budget,
// never throw): `PRAGMA busy_timeout = 2500` via exec (the API way) + ONE
// retry on a busy/locked error. Any hard failure (missing file, missing
// module, lock that beats both) returns kind:"db-error" with a capped error
// preview — the gauge NEVER throws into a hook.
//
// QUERIES (json_extract in SQL — the message `data` JSON is never fetched or
// JS-parsed; both are single-row `prepare().get()` reads):
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
// and the T2 nudge text:
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

import os from "node:os";
import { join } from "node:path";

const BUSY_TIMEOUT_MS = 2500;

// The opencode.db location (fact-2 of the T1 spec, planner-verified).
export const DEFAULT_DB_PATH = join(os.homedir(), ".local", "share", "opencode", "opencode.db");

// One process-wide current db path — the override lets the probe point
// the plugin and the CLI at a temp fixture db without any file editing.
// readGauge(p) accepts an explicit db path too (the probe's direct gauge calls).
let dbPath = DEFAULT_DB_PATH;
export function setDbPath(p) {
  dbPath = p;
}
export function getDbPath() {
  return dbPath;
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

// Result shapes (one implementation shared by plugin + CLI + probe):
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

function attemptRead(DatabaseSync, p) {
  let db;
  try {
    db = new DatabaseSync(p, { readOnly: true });
    db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS};`);
    const newest = db.prepare(SQL_NEWEST_SESSION).get();
    const step = db.prepare(SQL_FINISHED_STEP).get();
    return { newest, step };
  } finally {
    try {
      db?.close();
    } catch {
      // best effort — the read outcome has already been captured
    }
  }
}

// Reads the db (never throws — a hard failure returns kind:"db-error").
// Dynamic import: a host WITHOUT `node:sqlite` (the bun-compiled opencode.exe
// risk) gets db-error instead of a broken module import.
export async function readGauge(dbPathOverride) {
  const p = dbPathOverride ?? dbPath;
  let DatabaseSync;
  try {
    DatabaseSync = (await import("node:sqlite")).DatabaseSync;
  } catch (e) {
    return { ok: false, kind: "db-error", sid: "unknown", modelId: "", error: `sqlite-module ${String(e).slice(0, 120)}` };
  }
  if (typeof DatabaseSync !== "function") {
    return { ok: false, kind: "db-error", sid: "unknown", modelId: "", error: "sqlite-missing" };
  }
  let newest, step;
  try {
    ({ newest, step } = attemptRead(DatabaseSync, p));
  } catch (e) {
    if (/busy|locked/i.test(String(e?.message ?? e))) {
      // busy/locked on the first attempt (opencode writes concurrently) and
      // the busy_timeout budget exhausted: retry ONCE before giving up.
      try {
        ({ newest, step } = attemptRead(DatabaseSync, p));
      } catch (e2) {
        return { ok: false, kind: "db-error", sid: "unknown", modelId: "", error: String(e2?.message ?? e2).slice(0, 120) };
      }
    } else {
      return { ok: false, kind: "db-error", sid: "unknown", modelId: "", error: String(e?.message ?? e).slice(0, 120) };
    }
  }
  const rawSid = newest?.id;
  const sid = typeof rawSid === "string" && rawSid !== "" ? rawSid : "unknown";
  const total = step?.total == null ? Number.NaN : Number(step.total);
  if (Number.isNaN(total)) {
    return { ok: false, kind: "no-total", sid, modelId: step ? parseModelId(step.model) : "" };
  }
  const output = step.output == null || Number.isNaN(Number(step.output)) ? 0 : Number(step.output);
  const modelId = parseModelId(step.model);
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
