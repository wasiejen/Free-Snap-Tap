#!/usr/bin/env node
// dump_session.cjs -- READ-ONLY opencode session dump into the repo corpus.
//
// Modes:
//   node dump_session.cjs <sessionID>       LOSSLESS full-detail dump of ONE session
//                                           (pre-compaction mode: every message with
//                                           its full part content — tool
//                                           state.input/state.output verbatim, no
//                                           caps)
//   node dump_session.cjs <sessionID> --lite
//                                           LITE (filtered) markdown dump of ONE
//                                           session: text + reasoning verbatim,
//                                           tool header-only (no input/output),
//                                           step-start/step-finish skipped
//   node dump_session.cjs <sessionID> --json
//                                           RAW JSON dump of ONE session: the session
//                                           row + every message + every part's data
//                                           value, unfiltered, uncapped, structure
//                                           preserved (--out appends .json when the
//                                           relpath has no extension)
//   node dump_session.cjs <sessionID> --out <relpath>
//                                           single-session dump written to
//                                           OUT_DIR/<relpath> instead of <sessionID>.md
//                                           (or <sessionID>.json in --json mode)
//                                           (single-session ONLY; <relpath> must be
//                                           relative, no `..`, safe chars — else exit 2)
//   node dump_session.cjs --all             corpus backfill, SLIM lines (default)
//   node dump_session.cjs --all --slim      corpus backfill, slim (explicit)
//   node dump_session.cjs --all --full      corpus backfill, full detail
//
// Output: <repoRoot>/.opencode/archive/sessions/<sessionID>.md
//         (or OUT_DIR/<relpath> when `--out <relpath>` is given;
//          <sessionID>.json / OUT_DIR/<relpath>.json in --json mode)
// The host DB is LIVE: it is opened readOnly: true and is NEVER written.
// No dependencies beyond node:sqlite / node:fs / node:path.
"use strict";

const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");

const DB = process.env.OPENCODE_DB || "C:/Users/Wasiejen/.local/share/opencode/opencode.db";
const OUT_DIR = path.resolve(__dirname, "..", "..", "..", "archive", "sessions");

// ---------- tiny helpers ----------
function usage(code) {
  console.log(
    "usage:\n" +
      "  node dump_session.cjs <sessionID>               lossless full dump of one session\n" +
      "  node dump_session.cjs <sessionID> --lite        lite (filtered) markdown dump\n" +
      "  node dump_session.cjs <sessionID> --json        raw JSON dump (unfiltered, uncapped)\n" +
      "  node dump_session.cjs <sessionID> --out <relpath>   single-session dump to OUT_DIR/<relpath>\n" +
      "                                                      (relpath relative, no `..`, safe chars — else exit 2;\n" +
      "                                                       --json appends .json when the relpath has no extension)\n" +
      "  node dump_session.cjs --all [--slim]            corpus backfill (slim lines, default)\n" +
      "  node dump_session.cjs --all --full              corpus backfill (full detail)\n" +
      "  env OPENCODE_DB overrides the DB path"
  );
  process.exit(code);
}
function iso(ts) {
  if (typeof ts === "number" && isFinite(ts)) {
    const ms = ts < 1e12 ? ts * 1000 : ts; // opencode stores epoch millis
    return new Date(ms).toISOString();
  }
  return String(ts);
}
function jparse(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}
function jstr(o, max) {
  let s;
  try { s = JSON.stringify(o); } catch (e) { s = String(o); }
  if (s == null) s = "";
  if (max && s.length > max) s = s.slice(0, max) + "...";
  return s;
}
function safeFile(sid) {
  if (!/^[A-Za-z0-9_-]+$/.test(sid)) throw new Error("unsafe session id for filename: " + sid);
  return sid + ".md";
}
function safeJsonFile(sid) {
  if (!/^[A-Za-z0-9_-]+$/.test(sid)) throw new Error("unsafe session id for filename: " + sid);
  return sid + ".json";
}
// --out relpath in --json mode: append `.json` when the basename carries no
// extension (a trailing `.safe-chars` dot-run counts as one).
function jsonOutRel(rel) {
  return /\.[A-Za-z0-9]+$/.test(path.basename(rel)) ? rel : rel + ".json";
}
// Validate a `--out` relpath: relative (no leading `/`, no backslash), no `.` /
// `..` / empty segments (no traversal), safe chars only. Returns true when safe.
function safeRelPath(rel) {
  if (typeof rel !== "string" || rel.length === 0) return false;
  if (rel.startsWith("/") || rel.includes("\\")) return false;
  for (const s of rel.split("/")) {
    if (s === "" || s === "." || s === "..") return false;
    if (!/^[A-Za-z0-9_.-]+$/.test(s)) return false;
  }
  return true;
}
function modelName(v) {
  if (!v) return "?";
  if (typeof v === "string") return v;
  if (typeof v === "object") return v.id || v.name || jstr(v, 60);
  return String(v);
}

// ---------- parse args ----------
const argv = process.argv.slice(2);
let wantAll = false, wantFull = false, wantSlim = false, wantJson = false, wantLite = false, target = null, outRel = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--all") wantAll = true;
  else if (a === "--full") wantFull = true;
  else if (a === "--slim") wantSlim = true;
  else if (a === "--json") wantJson = true;
  else if (a === "--lite") wantLite = true;
  else if (a === "-h" || a === "--help") usage(0);
  else if (a === "--out") {
    i++;
    outRel = argv[i];
    if (outRel == null || outRel === "") { console.error("--out requires a <relpath> argument"); usage(2); }
  }
  else if (a.startsWith("-")) { console.error("unknown flag: " + a); usage(2); }
  else {
    if (target) { console.error("multiple session IDs given"); process.exit(2); }
    target = a;
  }
}
if (wantAll && target) { console.error("--all and a session ID are mutually exclusive"); process.exit(2); }
if (wantAll && outRel != null) { console.error("--out is single-session mode only (cannot combine with --all)"); process.exit(2); }
if (wantJson && wantAll) { console.error("--json is single-session mode only (cannot combine with --all)"); process.exit(2); }
if (wantLite && wantAll) { console.error("--lite is single-session mode only (cannot combine with --all)"); process.exit(2); }
if (wantJson && wantLite) { console.error("--json and --lite are mutually exclusive (raw JSON vs markdown)"); process.exit(2); }
if ((wantJson || wantLite) && (wantFull || wantSlim)) { console.error("--json/--lite cannot combine with --full/--slim (corpus modes)"); process.exit(2); }
if (!wantAll && !target) usage(2);
if (target && outRel != null && !safeRelPath(outRel)) {
  console.error("unsafe --out relpath (must be relative, no `..`, safe chars only): " + outRel);
  process.exit(2);
}
const fullCorpus = wantFull && !wantSlim; // corpus full detail is opt-in

// ---------- open DB read-only (LIVE) ----------
const db = new DatabaseSync(DB, { readOnly: true });
const qSession = db.prepare("SELECT * FROM session WHERE id = ?");
const qSessions = db.prepare("SELECT id FROM session ORDER BY time_created ASC, rowid ASC");
const qMessages = db.prepare(
  "SELECT id, time_created, time_updated, data FROM message WHERE session_id = ? ORDER BY time_created ASC, rowid ASC"
);
const qParts = db.prepare(
  "SELECT id, message_id, time_created, data FROM part WHERE session_id = ? ORDER BY time_created ASC, rowid ASC"
);

// ---------- renderers ----------
function header(s) {
  const L = [];
  L.push("# session " + s.id);
  L.push("# title: " + (s.title == null ? "" : String(s.title)));
  L.push("# agent: " + (s.agent == null ? "" : s.agent) + "  model: " + (s.model == null ? "" : s.model));
  L.push("# parent: " + (s.parent_id == null ? "" : s.parent_id));
  L.push("# created: " + iso(s.time_created) + "  updated: " + iso(s.time_updated));
  L.push("# compacting: " + iso(s.time_compacting) + "  archived: " + iso(s.time_archived));
  L.push("# tokens in/out/reasoning: " + s.tokens_input + "/" + s.tokens_output + "/" + s.tokens_reasoning);
  return L;
}

// slim line for one message (sesdata proven shape)
function slimLine(m, info) {
  const slim = {};
  for (const k of ["role", "mode", "agent", "summary", "finish", "error", "tokens", "modelID", "providerID"])
    if (info && k in info) slim[k] = info[k];
  if (slim.error) slim.error = jstr(slim.error, 300);
  if (slim.tokens && typeof slim.tokens === "object") slim.tokens = jstr(slim.tokens, 200);
  return iso(m.time_created) + " | " + jstr(slim, 420);
}

// one part's rendered lines. `lite` = the filtered preset (#78 unit B):
// text/reasoning verbatim, tool header-only (no input/output),
// step-start/step-finish SKIPPED, other types 400-capped. Default (full) =
// LOSSLESS: tool state.input/state.output verbatim, no caps, unparseable
// parts keep their raw data string.
function partBlock(p, lite) {
  const d = jparse(p.data);
  if (!d) {
    return lite ? ["  part " + p.id + " (unparsed)"] : ["  part " + p.id + " (unparsed): " + p.data];
  }
  if (d.type === "text" && typeof d.text === "string") return ["  [text]", d.text];
  if (d.type === "reasoning" && typeof d.text === "string") return ["  [reasoning]", d.text];
  if (d.type === "tool") {
    const st = d.state || {};
    const L = ["  [tool] " + (d.tool || "?") + " callID=" + (d.callID || "?") + " status=" + (st.status || "?")];
    if (!lite) {
      if (st.input != null) L.push("  [tool input] " + jstr(st.input));
      if (st.output != null) L.push("  [tool output] " + jstr(st.output));
    }
    return L;
  }
  if (lite && (d.type === "step-start" || d.type === "step-finish")) return [];
  return ["  [" + d.type + "] " + jstr(d, lite ? 400 : undefined)];
}

// full body for one message + its parts (`lite` = the filtered preset)
function fullBody(m, info, parts, lite) {
  const L = [];
  L.push(
    "## " + m.id +
      " | role=" + (info && info.role ? info.role : "?") +
      " | agent=" + (info && info.agent ? info.agent : "?") +
      " | model=" + modelName((info && info.modelID) || (info && info.model)) +
      " | " + iso(m.time_created)
  );
  if (info) {
    const meta = {};
    for (const k of ["mode", "summary", "finish", "error", "tokens"]) if (k in info) meta[k] = info[k];
    if (Object.keys(meta).length) L.push("meta: " + jstr(meta, lite ? 600 : undefined));
  }
  for (const p of parts) L.push.apply(L, partBlock(p, lite));
  if (!parts.length) L.push("  (no parts)");
  return L;
}

// RAW JSON dump (#78 unit A): the session row + every message row + every
// part's `data` value (parsed when parseable, the raw string otherwise),
// unfiltered, uncapped, structure preserved.
function renderJson(sid) {
  const s = qSession.get(sid);
  if (!s) { console.error("no such session: " + sid); process.exit(1); }
  const msgs = qMessages.all(sid);
  const parts = qParts.all(sid);
  const byMsg = {};
  const orphans = [];
  for (const p of parts) {
    if (p.message_id) (byMsg[p.message_id] = byMsg[p.message_id] || []).push(p);
    else orphans.push(p);
  }
  const partJson = (p) => {
    const d = jparse(p.data);
    return { id: p.id, time_created: p.time_created, data: d != null ? d : p.data };
  };
  const doc = {
    session: s,
    messages: msgs.map((m) => {
      const md = jparse(m.data);
      return {
        id: m.id,
        time_created: m.time_created,
        time_updated: m.time_updated,
        data: md != null ? md : m.data,
        parts: (byMsg[m.id] || []).map(partJson),
      };
    }),
    orphan_parts: orphans.map(partJson),
  };
  return { text: JSON.stringify(doc, null, 2) + "\n", nmsg: msgs.length, npart: parts.length };
}

// mode: "full" (lossless) | "lite" (filtered) | "slim"
function renderSession(sid, mode) {
  const s = qSession.get(sid);
  if (!s) { console.error("no such session: " + sid); process.exit(1); }
  const msgs = qMessages.all(sid);
  const parts = qParts.all(sid);
  const byMsg = {};
  const orphans = [];
  for (const p of parts) {
    if (p.message_id) (byMsg[p.message_id] = byMsg[p.message_id] || []).push(p);
    else orphans.push(p);
  }
  const L = [];
  for (const h of header(s)) L.push(h);
  L.push("# messages: " + msgs.length + "  parts: " + parts.length);
  L.push("# dumped: " + new Date().toISOString() + "  mode=" + mode);
  L.push("");
  if (mode !== "slim") {
    const lite = mode === "lite";
    for (const m of msgs) {
      L.push.apply(L, fullBody(m, jparse(m.data), byMsg[m.id] || [], lite));
      L.push("");
    }
  } else {
    for (const m of msgs) L.push(slimLine(m, jparse(m.data)));
  }
  if (orphans.length) {
    L.push("# orphan parts: " + orphans.length);
    // lossless: the orphan part data is rendered too (the filtered/slim
    // views keep the count line only)
    if (mode === "full") for (const p of orphans) L.push.apply(L, partBlock(p, false));
  }
  return { text: L.join("\n") + "\n", nmsg: msgs.length, npart: parts.length };
}

function writeOne(sid, mode, outRel) {
  const r = mode === "json" ? renderJson(sid) : renderSession(sid, mode);
  // default: OUT_DIR/<sid>.md (or <sid>.json in --json mode — the "current
  // state" refresh, refreshes may overwrite it by design); --out:
  // OUT_DIR/<relpath> (validated at parse; --json appends .json).
  const file = outRel != null
    ? path.join(OUT_DIR, mode === "json" ? jsonOutRel(outRel) : outRel)
    : path.join(OUT_DIR, mode === "json" ? safeJsonFile(sid) : safeFile(sid));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, r.text, "utf8");
  return { file, bytes: r.text.length, nmsg: r.nmsg, npart: r.npart };
}

// ---------- main ----------
if (target) {
  const mode = wantJson ? "json" : wantLite ? "lite" : "full";
  const r = writeOne(target, mode, outRel);
  console.log(
    "dumped " + target + " messages=" + r.nmsg + " parts=" + r.npart +
      " bytes=" + r.bytes + " mode=" + mode + " -> " + r.file
  );
  process.exit(0);
}

const sessions = qSessions.all().map(r => r.id);
let wrote = 0, failed = 0, totalBytes = 0;
for (const sid of sessions) {
  try {
    const r = writeOne(sid, fullCorpus ? "full" : "slim");
    wrote++;
    totalBytes += r.bytes;
  } catch (e) {
    failed++;
    console.error("failed " + sid + ": " + e.message);
  }
}
console.log(
  "corpus: sessions=" + sessions.length + " files=" + wrote + " failed=" + failed +
    " bytes=" + totalBytes + " mode=" + (fullCorpus ? "full" : "slim") + " -> " + OUT_DIR
);
process.exit(failed === 0 ? 0 : 1);
