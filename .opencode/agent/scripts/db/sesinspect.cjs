#!/usr/bin/env node
// sesinspect.cjs -- read-only DB inspector for opencode sessions.
// The host DB is LIVE: opened readOnly: true, NEVER written.
//
// Usage:
//   node sesinspect.cjs            -> columns of message/session + the 10
//                                     most recently updated sessions
//   node sesinspect.cjs <sessionID> -> session row + the LAST 14 messages
//                                     (slim JSON, one line each)
//   env OPENCODE_DB overrides the DB path.
"use strict";
const { DatabaseSync } = require("node:sqlite");
const DB = process.env.OPENCODE_DB || "C:/Users/Wasiejen/.local/share/opencode/opencode.db";
const db = new DatabaseSync(DB, { readOnly: true });
const cols = db.prepare("PRAGMA table_info(message)").all().map(c => c.name);
console.log("message cols: " + cols.join(","));
const scols = db.prepare("PRAGMA table_info(session)").all().map(c => c.name);
console.log("session cols: " + scols.join(","));
const sid = process.argv[2];
if (!sid) {
  const rows = db.prepare("SELECT id, time_updated FROM session ORDER BY time_updated DESC LIMIT 10").all();
  for (const r of rows) console.log(JSON.stringify(r));
  process.exit(0);
}
const s = db.prepare("SELECT * FROM session WHERE id = ?").get(sid);
if (s) console.log("SESSION: " + JSON.stringify(s).slice(0, 600));
const rows = db.prepare("SELECT * FROM message WHERE session_id = ? ORDER BY rowid ASC").all(sid);
console.log("message count: " + rows.length);
const last = rows.slice(-14);
for (const m of last) {
  let info = {};
  try { info = JSON.parse(m.data); } catch (e) { info = {}; }
  const slim = {};
  for (const k of ["id", "role", "time_created", "time_updated", "mode", "summary", "finish", "error"]) if (k in info) slim[k] = info[k];
  console.log(JSON.stringify(slim).slice(0, 500));
}
