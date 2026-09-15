#!/usr/bin/env node
// logctx.cjs -- read-only: print context around every needle line in a log.
// Keeps the agent's context out of the multi-MB log swamp: a bounded
// +/-3-line window per hit, each line truncated to 380 chars, hits capped.
//
// Usage: node logctx.cjs [needle="schema rejection"] [maxHits=20]
//   log path: env OPENCODE_LOG, then the host default below.
//   e.g. node logctx.cjs
//        node logctx.cjs "provider error" 5
//        OPENCODE_LOG=C:/path/to.log node logctx.cjs ERROR
"use strict";
const fs = require("fs");
const HOST_LOG = "C:/Users/Wasiejen/.local/share/opencode/log/opencode.log";
const p = process.env.OPENCODE_LOG || HOST_LOG;
const needle = process.argv[2] || "schema rejection";
const maxHits = parseInt(process.argv[3] || "20", 10);
const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
let hits = 0;
for (let i = 0; i < lines.length; i++) {
  if (!lines[i].includes(needle)) continue;
  hits++;
  if (hits > maxHits) continue;
  const lo = Math.max(0, i - 3), hi = Math.min(lines.length - 1, i + 3);
  console.log(`=== HIT at line ${i} (hit ${hits}) ===`);
  for (let j = lo; j <= hi; j++) {
    console.log((j === i ? ">> " : "   ") + lines[j].slice(0, 380));
  }
  console.log("");
}
console.log(`total "${needle}" lines: ${hits} of ${lines.length}` + (hits > maxHits ? ` (showing first ${maxHits})` : ""));
