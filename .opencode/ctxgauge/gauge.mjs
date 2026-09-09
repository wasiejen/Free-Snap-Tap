// =============================================================================
// Shared context-gauge core (de-peek — TODO.md #30/#35): ONE implementation
// imported by BOTH the handover plugin (chat.message injection,
// .opencode/plugin/handover_v2.4.ts) and the self-peek CLI (peek.mjs).
//
// READ BACKEND — sqlite3.exe (MAINTAINER RULING 2026-09-09, supersedes the
// original node:sqlite design): the plugin host (opencode.exe, a compiled
// bun binary) cannot rely on node:sqlite — the T1 worker could not solve a
// working sqlite call via node modules in that host. The maintainer placed
// SQLite 3.53.4 (64-bit, JSON1 built in) at `.opencode/plugin/tools/sqlite3.exe`
// (next to the plugin). The gauge spawns it with an ARGS ARRAY (no shell —
// no quoting surface): verified working under BOTH node v24.19.0 (the CLI /
// probe host) and bun 1.4.2 (the closest host stand-in for opencode.exe),
// 2026-09-09 (spawn probe, args array, timeout 3000, live db read ok).
//
// The CLI argument is the DB as a READ-ONLY URI (`file:<path>/?mode=ro`) —
// no journal write while opencode writes concurrently. NO PRAGMA in the
// call: `PRAGMA busy_timeout = N;` ECHOES `N` as a stdout line and pollutes
// the marker parse (measured 2026-09-09). Concurrency resilience = one retry
// on a busy/locked error (read-only SELECTs).
//
// MARKER SQL (the ONLY query; two statements, marker-prefixed rows — an
// empty first result simply omits the M row, so the output is never
// ambiguous):
//   M|<sid>|<model-json>|<tokens.total>|<tokens.output>   (0 or 1 row)
//   S|<newest-session-id>                                  (0 or 1 row)
// total/output come from json_extract (JSON1) — the message `data` JSON is
// NEVER fetched or JS-parsed. NULL (missing tokens) → the no-total readout.
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
// hardcoded guess (the retired peek.py `12050`-style fallback is the bug
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
// deliberate difference to the retired peek.py: there is NO fallback to the
// newest finished message of ANOTHER session (that fallback WAS the feed bug).
// =============================================================================

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const execFileAsync = promisify(execFile);
const READ_TIMEOUT_MS = 2500;
const MAX_BUFFER = 1024 * 1024;

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
// The maintainer-placed CLI, resolved RELATIVE TO THIS FILE (stable for the
// CLI cwd and the plugin import alike): .opencode/ctxgauge → ../plugin/tools
export const DEFAULT_EXE_PATH = join(THIS_DIR, "..", "plugin", "tools", "sqlite3.exe");

// The opencode.db location (fact-2 of the T1 spec, planner-verified).
export const DEFAULT_DB_PATH = join(os.homedir(), ".local", "share", "opencode", "opencode.db");

// One process-wide current db/exe path — the overrides let the probe point
// the plugin and the CLI at a temp fixture db without any file editing.
// readGauge(p) accepts an explicit db path too (the probe's direct gauge calls).
let dbPath = DEFAULT_DB_PATH;
let exePath = DEFAULT_EXE_PATH;
export function setDbPath(p) {
  dbPath = p;
}
export function getDbPath() {
  return dbPath;
}
export function setExePath(p) {
  exePath = p;
}
export function getExePath() {
  return exePath;
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

// The MARKER SQL — the only query (see the header). The finish marker is
// `%"finish"%` inside the SQL literal (double quotes — no SQL escaping needed).
const GAUGE_SQL =
  "SELECT 'M', s.id, s.model, json_extract(m.data, '$.tokens.total'), json_extract(m.data, '$.tokens.output') " +
  "FROM message m JOIN session s ON s.id = m.session_id " +
  "WHERE s.id = (SELECT id FROM session ORDER BY time_updated DESC LIMIT 1) " +
  "AND m.data LIKE '%\"finish\"%' ORDER BY m.time_created DESC LIMIT 1; " +
  "SELECT 'S', id FROM session ORDER BY time_updated DESC LIMIT 1;";

function uriRo(p) {
  return `file:${p.replace(/\\/g, "/")}?mode=ro`;
}

async function runOnce(exe, dbArg) {
  const res = await execFileAsync(exe, [dbArg, GAUGE_SQL], {
    timeout: READ_TIMEOUT_MS,
    maxBuffer: MAX_BUFFER,
  });
  return String(res.stdout);
}

// Reads the db (never throws — a hard failure returns kind:"db-error").
// busy/locked errors are retried ONCE; anything else fails fast (no point
// retrying a CANTOPEN / missing exe).
export async function readGauge(dbPathOverride) {
  const p = dbPathOverride ?? dbPath;
  if (!existsSync(exePath)) {
    return { ok: false, kind: "db-error", sid: "unknown", modelId: "", error: `exe-missing ${exePath}` };
  }
  const dbArg = uriRo(p);
  let stdout;
  try {
    stdout = await runOnce(exePath, dbArg);
  } catch (e) {
    if (/busy|locked/i.test(String(e))) {
      // busy/locked on the first attempt (opencode writes concurrently): retry ONCE.
      try {
        stdout = await runOnce(exePath, dbArg);
      } catch (e2) {
        return { ok: false, kind: "db-error", sid: "unknown", modelId: "", error: String(e2).slice(0, 120) };
      }
    } else {
      return { ok: false, kind: "db-error", sid: "unknown", modelId: "", error: String(e).slice(0, 120) };
    }
  }
  // Parse the marker rows (M row absent = no finished step in the newest session).
  let sid = "unknown";
  let modelId = "";
  let total = Number.NaN;
  let output = Number.NaN;
  for (const line of stdout.split(/\r?\n/)) {
    if (line.startsWith("S|")) {
      sid = line.slice(2);
    } else if (line.startsWith("M|")) {
      const parts = line.slice(2).split("|");
      // sid | model... | total | output  — total/output are the LAST two fields
      // (a model id containing '|' is then still safe).
      if (parts.length >= 4) {
        sid = parts[0];
        modelId = parseModelId(parts.slice(1, parts.length - 2).join("|"));
        total = Number(parts[parts.length - 2]);
        output = Number(parts[parts.length - 1]);
      }
    }
  }
  if (Number.isNaN(total)) {
    return { ok: false, kind: "no-total", sid, modelId };
  }
  if (Number.isNaN(output)) output = 0;
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
