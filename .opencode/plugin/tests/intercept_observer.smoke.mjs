// intercept_observer.smoke.mjs — the 5.3 log-only intercept observer + the
// 5.4 read-scope fuzzy resolution (.opencode/plugin/intercept_observer.ts +
// _core.ts). The plugin factory is called with a SCRATCHPAD sandbox
// `directory` — the intercept.log lands in the sandbox
// (.opencode/temp/intercept.log under the sandbox project), NEVER the live
// .opencode/temp/ (DO-NOT-touch); the numword map is the REAL shared file
// (.opencode/agent/scripts/numword/numwords.json), read-only.
// The plugin module exports the default factory ONLY (the 2026-09-16 export
// fix — the host loader requires every Object.values entry to be a
// function); the named core surface (types/constants/pure functions) is
// pinned from the SPLIT core file.
// Run: node .opencode/plugin/tests/intercept_observer.smoke.mjs (plain node,
// exit 0 iff green).
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, loadRepo, freshSandbox, makeChecker } from "./_smoke_base.mjs";

const base = freshSandbox("intercept_observer");
const { chk, finish } = makeChecker("INTERCEPT_OBSERVER_SMOKE");

const LIVE_LOG = path.join(REPO_ROOT, ".opencode", "temp", "intercept.log");
// live log state before the smoke (it may or may not exist; it must be
// UNCHANGED by this smoke — the sandbox dir receives the lines)
const liveBefore = fs.existsSync(LIVE_LOG) ? fs.statSync(LIVE_LOG).size : null;

// Fresh sandbox project (the plugin's PluginInput.directory)
const proj = path.join(base, "proj");
fs.mkdirSync(proj, { recursive: true });
const sandboxLog = path.join(proj, ".opencode", "temp", "intercept.log");
const STAMP_RE = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/;

const mod = await loadRepo(".opencode/plugin/intercept_observer.ts");
const core = await loadRepo(".opencode/plugin/intercept_observer_core.ts");
const factory = mod.default;

const readLines = () =>
  fs.existsSync(sandboxLog) ? fs.readFileSync(sandboxLog, "utf-8").split(/\r?\n/).filter((l) => l.length > 0) : [];
const split8 = (line) => line.split(" | ");

try {
  // ---- shape checks
  chk("default export is an async function (plugin factory)", typeof factory === "function" && factory.constructor.name === "AsyncFunction");
  chk("plugin module exports the default factory ONLY (host loader contract: every Object.values entry a function)",
    Object.keys(mod).length === 1 && Object.values(mod).every((v) => typeof v === "function"), JSON.stringify(Object.keys(mod)));
  chk("named core surface in the SPLIT core module (probe pin surface)",
    typeof core.observeArg === "function" && typeof core.resolveNumword === "function" &&
      typeof core.classifyContext === "function" && typeof core.loadNumwordMap === "function" &&
      typeof core.flattenField === "function" && typeof core.resolveReadPath === "function" &&
      typeof core.buildCorpus === "function" && Array.isArray(core.VERDICTS));
  chk("VERDICTS vocabulary (exactly the eight: the six observation + the two fuzzy)",
    JSON.stringify([...core.VERDICTS]) === JSON.stringify([
      "observed-redundancy-ok", "redundancy-mismatch", "no-candidate",
      "ambiguous", "out-of-sandbox", "path-anomaly",
      "fuzzy-resolved", "fuzzy-rejected",
    ]));

  // ---- factory registration shape
  const hooks = await factory({ directory: proj });
  chk("factory returns the tool.execute.before hook only (log-only, one hook)",
    typeof hooks === "object" && Object.keys(hooks).length === 1 && typeof hooks["tool.execute.before"] === "function");
  const before = hooks["tool.execute.before"];

  // ---- (1) suspicious arg → lines in the SANDBOX log, args NOT mutated
  // (filePath stays UNDER the sandbox workspace root → no out-of-sandbox line)
  const args1 = { filePath: proj + "\\sub\\file.txt", command: "ls 4|four 20260916" };
  const argsBefore = JSON.stringify(args1);
  await before({ tool: "bash", sessionID: "ses_smoke_io1", callID: "c1" }, { args: args1 });
  const argsAfter = JSON.stringify(args1);
  chk("hook NEVER mutates output.args (observation channel, byte-identical before/after)", argsBefore === argsAfter, argsAfter);
  const l1 = readLines();
  chk("suspicious call → lines written to the SANDBOX log (pair + dense)", l1.length === 2, `n=${l1.length}`);
  chk("sandbox log path is under the sandbox (never the live .opencode/temp)", sandboxLog.startsWith(base), sandboxLog);

  // ---- (2) line byte-shape: 8 " | " fields, stamp, session, tool, verdict vocab
  if (l1.length >= 1) {
    const f = split8(l1[0]);
    chk("line splits into exactly 8 ' | ' fields", f.length === 8, JSON.stringify(f.length));
    chk("field 1 = local minute stamp", STAMP_RE.test(f[0]), f[0]);
    chk("field 2 = the hook session id", f[1] === "ses_smoke_io1", f[1]);
    chk("field 3 = model id (unknown for a non-existent smoke session)", typeof f[2] === "string" && f[2] !== "" && f[2] !== "undefined", f[2]);
    chk("field 4 = the tool name", f[3] === "bash", f[3]);
    chk("field 8 = a verdict from the vocabulary", core.VERDICTS.includes(f[7]), f[7]);
    // this arg fires the pair (4|four → ok, rank 3) + dense (20260916 →
    // no-candidate, rank 5) → priority order: ok pair first, dense second
    chk("priority order (pair before dense)", f[7] === "observed-redundancy-ok" && l1[1].split(" | ")[7] === "no-candidate", JSON.stringify(l1.map((l) => l.split(" | ")[7])));
  }

  // ---- (2b) the 3-line cap + priority: this arg fires FIVE observations
  //          (mismatch 5|four, doubled users, the c:\users\users\5 span is
  //          out-of-sandbox, dense 20260916, numword four) — the cap keeps
  //          the top-3 by rank: mismatch, path-anomaly, out-of-sandbox
  await before({ tool: "bash", sessionID: "ses_smoke_io1", callID: "c1b" }, { args: "c:\\users\\users\\5|four.txt 20260916 four" });
  const l1b = readLines().slice(2);
  chk("3-line cap + priority (mismatch, path-anomaly, out-of-sandbox; 2 truncated)",
    l1b.length === 3 && l1b[0].split(" | ")[7] === "redundancy-mismatch" && l1b[1].split(" | ")[7] === "path-anomaly" &&
      l1b[2].split(" | ")[7] === "out-of-sandbox", JSON.stringify(l1b.map((l) => l.split(" | ")[7])));

  // ---- (3) clean arg (an EXISTING file) → NO line (append-only: line count
  //          unchanged; the read-scope fuzzy channel fast-paths exact paths)
  fs.mkdirSync(path.join(proj, "src"), { recursive: true });
  fs.writeFileSync(path.join(proj, "src", "clean.ts"), "x", "utf-8");
  const countBefore = readLines().length;
  await before({ tool: "read", sessionID: "ses_smoke_io1", callID: "c2" }, { args: { filePath: "src/clean.ts" } });
  chk("clean arg (existing file) → NO log line", readLines().length === countBefore, `before=${countBefore} after=${readLines().length}`);

  // ---- (4) garbage input → resolves silently (never throws, never a line)
  let threw = false;
  try {
    await before(undefined, undefined);
    await before({ tool: null, sessionID: null }, { args: null });
    await before({ tool: "x", sessionID: "s", callID: "c" }, { args: 42 });
  } catch {
    threw = true;
  }
  chk("garbage input → hook resolves without throwing", !threw);
  chk("garbage input → no spurious lines (null/undefined args)", readLines().length === countBefore);

  // ---- (5) " | " inside the arg → the line still splits into 8 fields
  await before({ tool: "bash", sessionID: "ses_smoke_io1", callID: "c3" }, { args: { command: "echo a | b 9|nine" } });
  const l5 = readLines();
  const last5 = l5[l5.length - 1];
  chk("arg containing ' | ' → line still byte-shape (8 fields)", split8(last5).length === 8, JSON.stringify(split8(last5).length));
  chk("the pair 9|nine was still detected (verdict ok)", last5.split(" | ")[7] === "observed-redundancy-ok" && last5.includes("9|nine"), last5);

  // ---- (6) unknown numword token → no numword line (twozero is not in the map)
  const count6 = readLines().length;
  await before({ tool: "read", sessionID: "ses_smoke_io1", callID: "c4" }, { args: "twozero plan" });
  chk("twozero (unknown token) → no numword line", readLines().length === count6, `before=${count6} after=${readLines().length}`);

  // ---- (7) out-of-sandbox note (workspace root = the sandbox project dir)
  await before({ tool: "read", sessionID: "ses_smoke_io1", callID: "c5" }, { args: { filePath: "C:\\Windows\\System32\\cmd.exe" } });
  const l7 = readLines();
  chk("out-of-sandbox path → out-of-sandbox verdict line", l7.length === count6 + 1 && l7[l7.length - 1].split(" | ")[7] === "out-of-sandbox",
    l7.length ? l7[l7.length - 1].split(" | ")[7] : "no line");
  // the workspace root itself is NOT out-of-sandbox (under the root)
  const count7 = readLines().length;
  await before({ tool: "read", sessionID: "ses_smoke_io1", callID: "c6" }, { args: { filePath: proj } });
  chk("path under the workspace root → no out-of-sandbox line", readLines().length === count7);

  // ---- (8) the READ-SCOPE fuzzy resolution (lane 5.4, approved 2026-09-16):
  //          a real file under the sandbox; the mistyped siblings live in
  //          the SAME dir (the corpus root — the §2.2 sibling-discrimination
  //          shape; the read-only scope rule: only `read` args are touched)
  fs.mkdirSync(path.join(proj, "fz"), { recursive: true });
  fs.writeFileSync(path.join(proj, "fz", "file.txt"), "x", "utf-8");

  // (8a) d=1 mistyped read → MUTATED to the resolved absolute path + a
  //      fuzzy-resolved 8-field line (byte-exact evidence; single-entry
  //      corpus → gap infinite)
  const argsR = { filePath: proj + "\\fz\\fil.txt" };
  const argsRBefore = JSON.stringify(argsR);
  const countR = readLines().length;
  await before({ tool: "read", sessionID: "ses_smoke_io1", callID: "c7" }, { args: argsR });
  const lR = readLines();
  const fR = split8(lR[lR.length - 1]);
  chk("read d<=2 mistyped → filePath MUTATED to the resolved path",
    argsR.filePath === proj + "\\fz\\file.txt" && JSON.stringify(argsR) !== argsRBefore, argsR.filePath);
  chk("read d<=2 mistyped → fuzzy-resolved line (8 fields, byte-exact evidence)",
    lR.length === countR + 1 && fR.length === 8 && fR[3] === "read" && fR[7] === "fuzzy-resolved" &&
      fR[5] === `fuzzy orig=${proj}\\fz\\fil.txt -> file.txt d=1 gap=inf`, JSON.stringify(fR));

  // (8b) d>2 mistyped read → FAIL-CLOSED: args byte-identical + a
  //      fuzzy-rejected line (top-3 cands + reason)
  const argsJ = { filePath: proj + "\\fz\\zzz-completely-different-abcdef.txt" };
  const argsJBefore = JSON.stringify(argsJ);
  const countJ = readLines().length;
  await before({ tool: "read", sessionID: "ses_smoke_io1", callID: "c8" }, { args: argsJ });
  const lJ = readLines();
  const fJ = split8(lJ[lJ.length - 1]);
  chk("read d>2 mistyped → NOT mutated (fail-closed, byte-identical) + fuzzy-rejected line (cands + reason)",
    JSON.stringify(argsJ) === argsJBefore && lJ.length === countJ + 1 && fJ.length === 8 && fJ[7] === "fuzzy-rejected" &&
      fJ[5] === `fuzzy orig=${proj}\\fz\\zzz-completely-different-abcdef.txt cands=file.txt 29 reason=d-too-high`, JSON.stringify(fJ));

  // (8c) an EXACT existing read path → untouched, no line
  const argsE = { filePath: proj + "\\fz\\file.txt" };
  const argsEBefore = JSON.stringify(argsE);
  const countE = readLines().length;
  await before({ tool: "read", sessionID: "ses_smoke_io1", callID: "c9" }, { args: argsE });
  chk("read exact existing path → untouched + no line", JSON.stringify(argsE) === argsEBefore && readLines().length === countE);

  // ---- (9) the LIVE log is untouched by this smoke
  const liveAfter = fs.existsSync(LIVE_LOG) ? fs.statSync(LIVE_LOG).size : null;
  chk("live .opencode/temp/intercept.log untouched (sandbox-only writes)",
    liveBefore === null ? !fs.existsSync(LIVE_LOG) : liveAfter === liveBefore, `before=${liveBefore} after=${liveAfter}`);
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}

finish();
