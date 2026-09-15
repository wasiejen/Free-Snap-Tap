#!/usr/bin/env node
// binwin.cjs -- needle context window in a binary.
// Find strings in a binary, print a small context window around each hit
// (keeps the agent's context out of the multi-10s-of-MB binary swamp).
//
// Usage: node binwin.cjs [--exe <path>] <needle...>
//   exe: the binary to scan. Defaults to env OPENCODE_EXE, then to the
//   host default below. Max 3 hits per needle, ~200 chars before + 250 after.
//   e.g. node binwin.cjs compact_memory
//        node binwin.cjs --exe C:/path/to.bin someNeedle
"use strict";
const fs = require("fs");
const HOST_EXE = "C:/Users/Wasiejen/AppData/Roaming/npm/node_modules/opencode-ai/bin/opencode.exe";
function usage(code) {
  console.log("usage: node binwin.cjs [--exe <path>] <needle...>");
  process.exit(code);
}
const args = process.argv.slice(2);
let exeArg = null;
if (args[0] === "--exe") {
  if (args.length < 3) usage(2);
  exeArg = args[1];
  args.splice(0, 2);
}
const exe = exeArg || process.env.OPENCODE_EXE || HOST_EXE;
const needles = args;
if (!needles.length) usage(2);
const buf = fs.readFileSync(exe);
let out = `scanned ${buf.length} bytes\n`;
for (const n of needles) {
  const nb = Buffer.from(n, "latin1");
  let idx = buf.indexOf(nb, 0), count = 0;
  while (idx !== -1 && count < 3) {
    const start = Math.max(0, idx - 200);
    const end = Math.min(buf.length, idx + nb.length + 250);
    out += `\n--- ${JSON.stringify(n)} hit ${count + 1} @${idx} ---\n`;
    out += buf.toString("latin1", start, end).replace(/[^\x20-\x7e]/g, ".") + "\n";
    count++;
    idx = buf.indexOf(nb, idx + nb.length);
  }
  if (count === 0) out += `\n--- ${JSON.stringify(n)}: NO HITS ---\n`;
}
process.stdout.write(out);
