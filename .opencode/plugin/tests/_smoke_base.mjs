// _smoke_base.mjs — shared boilerplate for the plugin/tool smokes in THIS
// folder. NOT a smoke itself — every <tool>.smoke.mjs imports it instead of
// copy-pasting (approved proposal: 2026-09-15_smoke-harness-home.md, Part 3).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The repo root resolved from THIS file's location (tests/ -> plugin/ ->
// .opencode/ -> root) — every smoke runs from any cwd.
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The host's runtime scratchpad — fixture writes only (each smoke creates and
// cleans its own subdir there; it is NEVER a source path). Deliberately fixed:
// the task spec (2026-09-15) allows the runtime sandbox path as-is.
export const SCRATCHPAD = "C:/Users/Wasiejen/AppData/Local/Temp/opencode";

// Type-stripped import of a repo source file (plain node 24 strips the TS
// types — no loader flag needed). `rel` is relative to the repo root.
export const loadRepo = (rel) => import(pathToFileURL(path.join(REPO_ROOT, rel)).href);

// A fresh, cleaned sandbox subdir under the scratchpad (idempotent re-runs).
export const freshSandbox = (name) => {
  const dir = path.join(SCRATCHPAD, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

// The assert / fail-count pattern shared by all smokes: chk logs PASS/FAIL,
// finish prints the verdict line and exits 0 iff nothing failed.
export const makeChecker = (label) => {
  const fails = [];
  let total = 0;
  const chk = (name, cond, detail = "") => {
    total += 1;
    const ok = !!cond;
    console.log((ok ? "PASS" : "FAIL") + "  " + name + (detail !== "" ? `  [${detail}]` : ""));
    if (!ok) fails.push(name);
  };
  const finish = () => {
    console.log(fails.length === 0 ? `${label}: ALL PASS (${total}/${total})` : `${label}: FAILURES: ` + fails.join(" | "));
    process.exit(fails.length === 0 ? 0 : 1);
  };
  return { chk, finish };
};
