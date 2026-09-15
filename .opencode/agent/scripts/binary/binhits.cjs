#!/usr/bin/env node
// binhits.cjs -- list ALL hit offsets in a binary for one needle.
// Prints every hit offset (+ a tiny ~60-char context) for one needle, capped
// at 60 hits. Use binoff.cjs on an offset for a bigger window.
//
// Usage: node binhits.cjs [--exe <path>] <needle>
//   exe: the binary to scan. Defaults to env OPENCODE_EXE, then to the
//   host default below.
//   e.g. node binhits.cjs compact_memory
"use strict";
const fs = require("fs");
const HOST_EXE = "C:/Users/Wasiejen/AppData/Roaming/npm/node_modules/opencode-ai/bin/opencode.exe";
function usage(code) {
  console.log("usage: node binhits.cjs [--exe <path>] <needle>");
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
const needle = args[0];
if (!needle) usage(2);
const buf = fs.readFileSync(exe);
const nb = Buffer.from(needle, "latin1");
let idx = buf.indexOf(nb, 0), count = 0;
while (idx !== -1) {
  const start = Math.max(0, idx - 40);
  const end = Math.min(buf.length, idx + nb.length + 60);
  process.stdout.write(`${count} @${idx}: ` + buf.toString("latin1", start, end).replace(/[^\x20-\x7e]/g, ".") + "\n");
  count++;
  if (count > 60) break;
  idx = buf.indexOf(nb, idx + nb.length);
}
process.stdout.write(`TOTAL shown: ${count}\n`);
