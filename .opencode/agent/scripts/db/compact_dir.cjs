#!/usr/bin/env node
// compact_dir.cjs -- read-only: dump the compaction summary + reload
// directive for a session.
// The host DB is LIVE: opened readOnly: true, NEVER written.
//
// Usage: node compact_dir.cjs <sessionID>
//   Prints every message that is a compaction marker: the assistant
//   mode=compaction summary message and the user summary message (with its
//   full message.data), plus each of their parts (truncated to 4000 chars).
//   env OPENCODE_DB overrides the DB path.
"use strict";
const { DatabaseSync } = require("node:sqlite");
const DB = process.env.OPENCODE_DB || "C:/Users/Wasiejen/.local/share/opencode/opencode.db";
const db = new DatabaseSync(DB, { readOnly: true });
const sid = process.argv[2];
if (!sid) { console.error("usage: node compact_dir.cjs <sessionID>"); process.exit(2); }
const msgs = db.prepare("SELECT id, time_created, data FROM message WHERE session_id = ? ORDER BY time_created ASC, rowid ASC").all(sid);
for (const m of msgs) {
  let info;
  try { info = JSON.parse(m.data); } catch (e) { continue; }
  const isComp = info.role === "assistant" && info.mode === "compaction";
  const isSumUser = info.role === "user" && info.summary !== undefined;
  if (!isComp && !isSumUser) continue;
  console.log("=== message " + m.id + " t=" + m.time_created + " role=" + info.role + " (summary-msg=" + (isSumUser ? "yes" : "no") + ") ===");
  if (isSumUser) console.log("message.data (full): " + m.data);
  const parts = db.prepare("SELECT id, data FROM part WHERE message_id = ? ORDER BY time_created ASC, rowid ASC").all(m.id);
  for (const p of parts) {
    const raw = p.data;
    let type = "?";
    try { type = JSON.parse(raw).type; } catch (e) {}
    console.log("--- part " + p.id + " type=" + type + " (" + raw.length + " chars) ---");
    console.log(raw.length > 4000 ? raw.slice(0, 4000) + "\n[TRUNCATED]" : raw);
  }
}
