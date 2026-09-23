#!/usr/bin/env node
// summarize_intercept.smoke.cjs -- the fixture pin for summarize_intercept.cjs
// (the R4 log-mining scriptlet, spec_R4_log_mining.md). Self-contained:
// no plugin code, no live db -- it runs against the committed fixture log
// and asserts the byte-exact expected output. Pinned checks:
//   (1) in-process summarize(fixture) === expected_summary.txt
//   (2) CLI run on the fixture (child node, repo-root cwd): stdout ===
//       expected_summary.txt, exit 0
//   (3) missing log file: exit 1, empty stdout, error on stderr
// Run: node .opencode/agent/scripts/log/tests/summarize_intercept.smoke.cjs
//   (plain node, exit 0 iff green)
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync, execFile } = require("child_process");

// repo root = five levels up (tests -> log -> scripts -> agent -> .opencode -> root)
const ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const FIX = path.join(__dirname, "intercept_fixture.log");
// forward slashes on purpose: the path lands in the output header and must
// match expected_summary.txt byte-exact (path.join would give backslashes
// on this host).
const FIXREL = ".opencode/agent/scripts/log/tests/intercept_fixture.log";
const EXPECT = path.join(__dirname, "expected_summary.txt");
const SCRIPT = path.join(__dirname, "..", "summarize_intercept.cjs");
const expected = fs.readFileSync(EXPECT, "utf8").trim();

let failed = 0;
function chk(label, ok, detail) {
  console.log((ok ? "PASS " : "FAIL ") + label + (ok ? "" : " — " + String(detail).slice(0, 400)));
  if (!ok) failed++;
}

// (1) in-process: module summarize() on the fixture text
const mod = require(SCRIPT);
const inproc = mod.summarize(fs.readFileSync(FIX, "utf8"), FIXREL).trim();
chk("in-process summarize(fixture) === expected", inproc === expected,
  "diff at char " + inproc.split("\n").findIndex((l, i) => l !== expected.split("\n")[i]));

// (2) CLI: child node on the fixture, repo-root cwd, relative fixture path
//     (the path lands in the output header -- it must be the relative one)
let cliOut = "", cliErr = "", cliCode = 0;
try {
  cliOut = execFileSync(process.execPath, [SCRIPT, FIXREL], { cwd: ROOT, encoding: "utf8" });
} catch (e) {
  cliCode = e.status;
  cliOut = e.stdout || "";
  cliErr = e.stderr || "";
}
chk("cli exit 0", cliCode === 0, "code=" + cliCode + " err=" + cliErr);
chk("cli stdout === expected", cliOut.trim() === expected, "len " + cliOut.length + " vs " + expected.length);

// (3) missing file: exit 1, empty stdout, error on stderr
let missOut = "", missErr = "", missCode = 0;
execFile(process.execPath, [SCRIPT, "definitely_missing_intercept.log"], { cwd: ROOT, encoding: "utf8" },
  (err, out, stderr) => {
    missCode = err ? (err.status !== undefined ? err.status : err.code) : 0;
    missOut = out || "";
    missErr = stderr || "";
    chk("missing-file exit 1", missCode === 1, "code=" + missCode);
    chk("missing-file empty stdout", missOut.trim() === "", missOut);
    chk("missing-file stderr names the file", missErr.includes("definitely_missing_intercept.log"), missErr);
    finish();
  });

function finish() {
  if (failed) {
    console.log("SMOKE summarize_intercept: " + failed + " check(s) FAILED");
    process.exit(1);
  }
  console.log("SMOKE summarize_intercept: all checks passed");
}
