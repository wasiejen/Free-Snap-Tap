#!/usr/bin/env node
// sesdata.cjs -- read-only: message data JSON slim dump for one session.
// The host DB is LIVE: opened readOnly: true, NEVER written.
//
// Usage: node sesdata.cjs <sessionID>
//   Prints the session row (id, time_compacting, time_archived, agent, model,
//   title), the message count, then one slim JSON line per message
//   (role/mode/agent/summary/finish/error/tokens/modelID/providerID).
//   env OPENCODE_DB overrides the DB path.
"use strict";
const { DatabaseSync } = require("node:sqlite");
const DB = process.env.OPENCODE_DB || "C:/Users/Wasiejen/.local/share/opencode/opencode.db";
const db = new DatabaseSync(DB, { readOnly: true });
const sid = process.argv[2];
if (!sid) { console.error("usage: node sesdata.cjs <sessionID>"); process.exit(2); }
const s = db.prepare("SELECT id, time_compacting, time_archived, agent, model, title FROM session WHERE id = ?").get(sid);
console.log("SESSION: " + JSON.stringify(s));
const rows = db.prepare("SELECT id, time_created, data FROM message WHERE session_id = ? ORDER BY time_created ASC, rowid ASC").all(sid);
console.log("message count: " + rows.length);
for (const m of rows) {
  let info = {};
  try { info = JSON.parse(m.data); } catch (e) { info = { parseError: String(e) }; }
  const slim = {};
  for (const k of ["role", "mode", "agent", "summary", "finish", "error", "tokens", "modelID", "providerID"]) if (k in info) slim[k] = info[k];
  if (info.error) slim.error = JSON.stringify(info.error).slice(0, 300);
  console.log(m.time_created + " | " + JSON.stringify(slim).slice(0, 420));
}
