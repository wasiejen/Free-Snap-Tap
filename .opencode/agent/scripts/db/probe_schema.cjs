#!/usr/bin/env node
// probe_schema.cjs -- bounded schema probe (read-only). Columns + counts
// only, NO row data.
// The host DB is LIVE: opened readOnly: true, NEVER written.
//
// Usage: node probe_schema.cjs [table ...]
//   With no table args, probes every table in sqlite_master (excludes the
//   sqlite_ internal pages). With table args, probes only those.
//   env OPENCODE_DB overrides the DB path.
"use strict";
const { DatabaseSync } = require("node:sqlite");
const DB = process.env.OPENCODE_DB || "C:/Users/Wasiejen/.local/share/opencode/opencode.db";
const db = new DatabaseSync(DB, { readOnly: true });
let tables = process.argv.slice(2);
if (!tables.length) {
  tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r => r.name);
}
for (const t of tables) {
  try {
    const cols = db.prepare('PRAGMA table_info("' + t.replace(/"/g, '""') + '")').all().map(c => c.name).join(",");
    const n = db.prepare('SELECT count(*) AS n FROM "' + t.replace(/"/g, '""') + '"').get().n;
    console.log(t + " n=" + n + " cols=" + cols);
  } catch (e) {
    console.log(t + " ERR: " + e.message);
  }
}
