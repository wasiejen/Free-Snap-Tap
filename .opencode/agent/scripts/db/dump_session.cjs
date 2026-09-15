#!/usr/bin/env node
// dump_session.cjs -- READ-ONLY opencode session dump into the repo corpus.
//
// Modes:
//   node dump_session.cjs <sessionID>       full-detail dump of ONE session
//                                           (pre-compaction mode: metadata line(s)
//                                           + every message with its text/reasoning)
//   node dump_session.cjs <sessionID> --out <relpath>
//                                           full dump of ONE session written to
//                                           OUT_DIR/<relpath> instead of <sessionID>.md
//                                           (single-session ONLY; <relpath> must be
//                                           relative, no `..`, safe chars — else exit 2)
//   node dump_session.cjs --all             corpus backfill, SLIM lines (default)
//   node dump_session.cjs --all --slim      corpus backfill, slim (explicit)
//   node dump_session.cjs --all --full      corpus backfill, full detail
//
// Output: <repoRoot>/.opencode/archive/sessions/<sessionID>.md
//         (or OUT_DIR/<relpath> when `--out <relpath>` is given)
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
      "  node dump_session.cjs <sessionID>               full dump of one session\n" +
      "  node dump_session.cjs <sessionID> --out <relpath>   full dump to OUT_DIR/<relpath>\n" +
      "                                                      (single-session only; relpath relative,\n" +
      "                                                       no `..`, safe chars — else exit 2)\n" +
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
let wantAll = false, wantFull = false, wantSlim = false, target = null, outRel = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--all") wantAll = true;
  else if (a === "--full") wantFull = true;
  else if (a === "--slim") wantSlim = true;
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

// full body for one message + its parts
function fullBody(m, info, parts) {
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
    if (Object.keys(meta).length) L.push("meta: " + jstr(meta, 600));
  }
  for (const p of parts) {
    const d = jparse(p.data);
    if (!d) { L.push("  part " + p.id + " (unparsed)"); continue; }
    if (d.type === "text" && typeof d.text === "string") {
      L.push("  [text]");
      L.push(d.text);
    } else if (d.type === "reasoning" && typeof d.text === "string") {
      L.push("  [reasoning]");
      L.push(d.text);
    } else if (d.type === "tool") {
      const st = d.state || {};
      L.push("  [tool] " + (d.tool || "?") + " callID=" + (d.callID || "?") + " status=" + (st.status || "?"));
    } else {
      L.push("  [" + d.type + "] " + jstr(d, 400));
    }
  }
  if (!parts.length) L.push("  (no parts)");
  return L;
}

function renderSession(sid, isFull) {
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
  L.push("# dumped: " + new Date().toISOString() + "  mode=" + (isFull ? "full" : "slim"));
  L.push("");
  if (isFull) {
    for (const m of msgs) {
      L.push.apply(L, fullBody(m, jparse(m.data), byMsg[m.id] || []));
      L.push("");
    }
  } else {
    for (const m of msgs) L.push(slimLine(m, jparse(m.data)));
  }
  if (orphans.length) L.push("# orphan parts: " + orphans.length);
  return { text: L.join("\n") + "\n", nmsg: msgs.length, npart: parts.length };
}

function writeOne(sid, isFull, outRel) {
  const r = renderSession(sid, isFull);
  // default: OUT_DIR/<sid>.md (the "current state" refresh — refreshes may
  // overwrite it by design); --out: OUT_DIR/<relpath> (validated at parse).
  const file = outRel != null ? path.join(OUT_DIR, outRel) : path.join(OUT_DIR, safeFile(sid));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, r.text, "utf8");
  return { file, bytes: r.text.length, nmsg: r.nmsg, npart: r.npart };
}

// ---------- main ----------
if (target) {
  const r = writeOne(target, true, outRel);
  console.log(
    "dumped " + target + " messages=" + r.nmsg + " parts=" + r.npart +
      " bytes=" + r.bytes + " -> " + r.file
  );
  process.exit(0);
}

const sessions = qSessions.all().map(r => r.id);
let wrote = 0, failed = 0, totalBytes = 0;
for (const sid of sessions) {
  try {
    const r = writeOne(sid, fullCorpus);
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
