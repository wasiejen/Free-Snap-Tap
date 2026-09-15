#!/usr/bin/env node
// binoff.cjs -- offset window extractor for a binary.
// Print a raw text window at an absolute byte offset (use with binhits/binwin
// offsets). Non-printable bytes become ".".
//
// Usage: node binoff.cjs <offset> [before=100] [after=1500] [--exe <path>]
//   exe: the binary to read. Defaults to env OPENCODE_EXE, then to the
//   host default below.
//   e.g. node binoff.cjs 123456
//        node binoff.cjs 123456 50 200 --exe C:/path/to.bin
"use strict";
const fs = require("fs");
const HOST_EXE = "C:/Users/Wasiejen/AppData/Roaming/npm/node_modules/opencode-ai/bin/opencode.exe";
function usage(code) {
  console.log("usage: node binoff.cjs <offset> [before=100] [after=1500] [--exe <path>]");
  process.exit(code);
}
const args = process.argv.slice(2);
let exeArg = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--exe") {
    if (i + 1 >= args.length) usage(2);
    exeArg = args[i + 1];
    args.splice(i, 2);
    i--;
  }
}
if (!args.length) usage(2);
const exe = exeArg || process.env.OPENCODE_EXE || HOST_EXE;
const off = parseInt(args[0], 10);
const before = parseInt(args[1] || "100", 10);
const after = parseInt(args[2] || "1500", 10);
const buf = fs.readFileSync(exe);
const start = Math.max(0, off - before);
const end = Math.min(buf.length, off + after);
process.stdout.write(buf.toString("latin1", start, end).replace(/[^\x20-\x7e]/g, "."));
