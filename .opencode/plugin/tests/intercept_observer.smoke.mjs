// intercept_observer.smoke.mjs — the 5.3 log-only intercept observer + the
// 5.4 read-scope fuzzy resolution + the R2 write-scope pair/fuzzy resolution
// (2026-09-16: the controlled scratchpad write audit, the content-scope
// guard, the d<=1 write-fuzzy bar; M1 2026-09-17 #72: the write fuzzy
// channel EXCLUDED — "new file" is a legal write intent, the d=1 near-miss
// must not hijack; edit keeps the channel; R7 2026-09-17: the SEGMENT-level
// channel — a path is a sequence of folder units, the doubled folder is one
// insertion (seg-d 1), the kind=seg evidence flag; R6 2026-09-25: the
// payload journal (journal_write.log / journal_edit.log — a separate file,
// never an intercept line) + the edit hint channel (edit-hint /
// edit-ambiguous / no-candidate) + the after-hook enrichment (consumed
// once; live acceptance restart-gated))
// (2) 2026-09-25 (#95 sub-item 2): the MUTATING edit-fuzzy oldString
// channel (normalize-then-compare — CRLF/LF + trailing-ws + single-typo;
// d=0/d≤1 exactly-one candidate → oldString mutated to the file's exact
// bytes, the fuzzy-edit line, NO after-hook hint; else fail-closed → the
// R6 hint verdict carrying the best-candidate d) + the journal's edit
// `old` = the ORIGINAL pre-mutation oldString)
// (.opencode/plugin/intercept_observer.ts
// + _core.ts). The plugin factory is called with a SCRATCHPAD sandbox
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
import { REPO_ROOT, SCRATCHPAD, loadRepo, freshSandbox, makeChecker } from "./_smoke_base.mjs";

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
// R8 (#97): the config-root fixture dir — a SIBLING of the scratchpad (so
// paths under it are out-of-sandbox for the note) + cleaned in finally.
const tdir = path.join(path.dirname(SCRATCHPAD), "io_r8_smoke_" + process.pid);
fs.rmSync(tdir, { recursive: true, force: true });
fs.mkdirSync(path.join(tdir, "sub"), { recursive: true });
fs.mkdirSync(path.join(tdir, "sub2"), { recursive: true });

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
      typeof core.matchNearPathSegments === "function" && typeof core.buildCorpus === "function" &&
      Array.isArray(core.VERDICTS));
   chk("VERDICTS vocabulary (exactly the twelve: the six observation + the two fuzzy + pair-resolved + the two R6 edit-hint + the (2) fuzzy-edit)",
     JSON.stringify([...core.VERDICTS]) === JSON.stringify([
       "observed-redundancy-ok", "redundancy-mismatch", "no-candidate",
       "ambiguous", "out-of-sandbox", "path-anomaly",
       "fuzzy-resolved", "fuzzy-rejected", "pair-resolved",
       "edit-hint", "edit-ambiguous", "fuzzy-edit",
     ]));
   chk("the (2) edit-fuzzy core surface (normEditBytes + resolveEditOldString + EDIT_FUZZY_MAX_D=1)",
     typeof core.normEditBytes === "function" && typeof core.resolveEditOldString === "function" && core.EDIT_FUZZY_MAX_D === 1 &&
       core.normEditBytes("a  \r\nb\t\n c ") === "a\nb\n c");

  // ---- factory registration shape
  const hooks = await factory({ directory: proj });
  chk("factory returns the tool.execute.before + tool.execute.after hooks (R6: the hint enrichment after hook)",
    typeof hooks === "object" && Object.keys(hooks).length === 2 &&
      typeof hooks["tool.execute.before"] === "function" && typeof hooks["tool.execute.after"] === "function");
  const before = hooks["tool.execute.before"];
  const after = hooks["tool.execute.after"];

  // ---- (1) suspicious arg → lines in the SANDBOX log, args NOT mutated
  // (filePath stays UNDER the sandbox workspace root → no out-of-sandbox line)
  const args1 = { filePath: proj + "\\sub\\file.txt", command: "ls [4:four] 20260916" };
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
    // this arg fires the pair ([4:four] → ok, rank 3) + dense (20260916 →
    // no-candidate, rank 5) → priority order: ok pair first, dense second
    chk("priority order (pair before dense)", f[7] === "observed-redundancy-ok" && l1[1].split(" | ")[7] === "no-candidate", JSON.stringify(l1.map((l) => l.split(" | ")[7])));
  }

  // ---- (2b) the 3-line cap + priority: this arg fires FIVE observations
  //          (mismatch [5:four], doubled users, the c:\users\users\[5:four]
  //          .txt span is out-of-sandbox, dense 20260916, numword four) —
  //          the cap keeps the top-3 by rank: mismatch, path-anomaly,
  //          out-of-sandbox
  await before({ tool: "bash", sessionID: "ses_smoke_io1", callID: "c1b" }, { args: "c:\\users\\users\\[5:four].txt 20260916 four" });
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
  //          (the pair [9:nine] has no pipe at all now — the form switch)
  await before({ tool: "bash", sessionID: "ses_smoke_io1", callID: "c3" }, { args: { command: "echo a | b [9:nine]" } });
  const l5 = readLines();
  const last5 = l5[l5.length - 1];
  chk("arg containing ' | ' → line still byte-shape (8 fields)", split8(last5).length === 8, JSON.stringify(split8(last5).length));
  chk("the pair [9:nine] was still detected (verdict ok)", last5.split(" | ")[7] === "observed-redundancy-ok" && last5.includes("[9:nine]"), last5);

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

  // (8d) the READ-SCOPE PAIR resolution (R1): a real file under the
  //      sandbox; the [l:r] pair in the read arg → the canonical path
  //      (right-wins); EXISTENCE GATE: the arg is mutated only when the
  //      canonical path EXISTS and the pair-containing path does NOT
  fs.mkdirSync(path.join(proj, "pr"), { recursive: true });
  fs.writeFileSync(path.join(proj, "pr", "file-6.txt"), "x", "utf-8");
  const argsP = { filePath: proj + "\\pr\\file-[6:six].txt" };
  const argsPBefore = JSON.stringify(argsP);
  const countP = readLines().length;
  await before({ tool: "read", sessionID: "ses_smoke_io1", callID: "c10" }, { args: argsP });
  const lP = readLines();
  const fP = split8(lP[lP.length - 1]);
  chk("read pair → filePath MUTATED to the canonical path + pair-resolved line (8 fields, byte-exact evidence)",
    argsP.filePath === proj + "\\pr\\file-6.txt" && lP.length === countP + 1 && fP.length === 8 && fP[3] === "read" &&
      fP[7] === "pair-resolved" && fP[5] === `pair=[6:six] canon=6 dist=0 gate=mutated`, JSON.stringify(fP));

  // (8e) the pair gate FAIL-CLOSED: the canonical path does NOT exist →
  //      args byte-identical + the pair line (gate=none-exist) + the fuzzy
  //      channel still runs on the result (fuzzy-rejected, d>2)
  const argsQ = { filePath: proj + "\\pr\\file-[3:three].txt" };
  const argsQBefore = JSON.stringify(argsQ);
  const countQ = readLines().length;
  await before({ tool: "read", sessionID: "ses_smoke_io1", callID: "c10b" }, { args: argsQ });
  const lQ = readLines();
  const fQpair = split8(lQ[lQ.length - 2]);
  const fQ = split8(lQ[lQ.length - 1]);
  chk("read pair gate fail-closed (canonical absent) → NOT mutated + pair line gate=none-exist + fuzzy-rejected",
    JSON.stringify(argsQ) === argsQBefore && lQ.length === countQ + 2 &&
      fQpair.length === 8 && fQpair[7] === "observed-redundancy-ok" && fQpair[5] === `pair=[3:three] canon=3 dist=0 gate=none-exist` &&
      fQ.length === 8 && fQ[7] === "fuzzy-rejected", JSON.stringify([fQpair, fQ]));

  // ---- (8f) the WRITE-SCOPE resolution (R2, 2026-09-16; M1, 2026-09-17,
  //      #72 — the write fuzzy channel excluded, edit keeps it): the DoD
  //      controlled scratchpad write — the resolved write lands where the
  //      log says (end-to-end audit: field 5 = the ORIGINAL pair-form arg,
  //      field 6 = the gate evidence) + the content-scope guard (the
  //      `args[1:one]` python-slice collision → log line ONLY) + the M1
  //      write exclusion (d=1 near-miss: NOT mutated, zero lines) + the
  //      edit counter-pin (d<=1 bar, scope=write evidence flag)
  fs.mkdirSync(path.join(proj, "wfx"), { recursive: true });
  fs.writeFileSync(path.join(proj, "wfx", "file-4.txt"), "TWIN", "utf-8");
  const argsW = { filePath: proj + "\\wfx\\file-[4:four].txt", content: "R2-WRITE" };
  const argsWBefore = JSON.stringify(argsW);
  const countW = readLines().length;
  await before({ tool: "write", sessionID: "ses_smoke_io1", callID: "c10c" }, { args: argsW });
  // the tool lands the write at the (mutated) path — simulating the host
  fs.writeFileSync(argsW.filePath, argsW.content, "utf-8");
  const lW = readLines();
  const fW = split8(lW[lW.length - 1]);
  chk("write pair gate → filePath MUTATED + the write lands where the log says (file-4.txt = R2-WRITE, pair-form path absent)",
    argsW.filePath === proj + "\\wfx\\file-4.txt" &&
      fs.readFileSync(path.join(proj, "wfx", "file-4.txt"), "utf-8") === "R2-WRITE" &&
      !fs.existsSync(proj + "\\wfx\\file-[4:four].txt"), argsW.filePath);
  chk("write pair gate → audit line (8 fields; field 5 = ORIGINAL pair-form arg; field 6 = gate evidence; pair-resolved)",
    lW.length === countW + 1 && fW.length === 8 && fW[3] === "write" && fW[7] === "pair-resolved" &&
      fW[4] === argsWBefore && fW[5] === "pair=[4:four] canon=4 dist=0 gate=mutated", JSON.stringify(fW));

  const argsC = { filePath: proj + "\\wfx\\file-4.txt", content: "x = args[1:one] + y" };
  const argsCBefore = JSON.stringify(argsC);
  const countC = readLines().length;
  await before({ tool: "write", sessionID: "ses_smoke_io1", callID: "c10d" }, { args: argsC });
  const lC = readLines();
  const fC = split8(lC[lC.length - 1]);
  chk("write content-scope guard: pair in content → log line ONLY, args byte-identical (the args[1:one] collision)",
    JSON.stringify(argsC) === argsCBefore && lC.length === countC + 1 && fC[7] === "observed-redundancy-ok" &&
      fC[5] === "pair=[1:one] canon=1 dist=0", JSON.stringify(fC));

  // M1 (2026-09-17, #72): the write fuzzy channel is EXCLUDED — the d=1
  // near-miss must not hijack the target ("new file" is a legal write
  // intent): args byte-identical + ZERO new log lines
  const argsF = { filePath: proj + "\\wfx\\file-9.txt" };
  const argsFBefore = JSON.stringify(argsF);
  const countF = readLines().length;
  await before({ tool: "write", sessionID: "ses_smoke_io1", callID: "c10e" }, { args: argsF });
  chk("write fuzzy d=1 → NOT mutated + ZERO new log lines (M1, #72: no fuzzy channel for write)",
    JSON.stringify(argsF) === argsFBefore && readLines().length === countF);

  // M1 counter-pin: edit KEEPS the fuzzy channel (same wfx fixture) — d=1 →
  // MUTATED + fuzzy-resolved scope=write
  const argsG = { filePath: proj + "\\wfx\\file-9.txt" };
  const countG = readLines().length;
  await before({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c10f" }, { args: argsG });
  const lG = readLines();
  const fG = split8(lG[lG.length - 1]);
  chk("edit fuzzy d=1 → MUTATED to the existing sibling + fuzzy-resolved scope=write (d=1 gap=inf) (edit keeps the channel — M1)",
    argsG.filePath === proj + "\\wfx\\file-4.txt" && lG.length === countG + 1 && fG[3] === "edit" && fG[7] === "fuzzy-resolved" &&
      fG[5].includes("fuzzy scope=write orig=") && fG[5].includes("-> file-4.txt d=1 gap=inf"), JSON.stringify(fG));

  // ---- (8g) the #73 STRUCTURAL dedup-collapse pre-check (2026-09-17,
  //      the R7 re-pin): the doubled folder (the rel form has no pair —
  //      nearestExistingDir absorbs one) end-to-end: the edit lands where
  //      the log says, the line carries kind=dedup scope=write d=0 (the
  //      collapse fires BEFORE the segment channel — the collapse target
  //      EXISTS)
  fs.mkdirSync(path.join(proj, "sx"), { recursive: true });
  fs.writeFileSync(path.join(proj, "sx", "real-a.txt"), "x", "utf-8");
  fs.writeFileSync(path.join(proj, "sx", "sib-zzz.txt"), "x", "utf-8");
  const argsS = { filePath: proj + "\\sx\\sx\\real-a.txt", oldString: "x", newString: "R7" };
  const countS = readLines().length;
  await before({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c10g" }, { args: argsS });
  // the tool lands the edit at the (mutated) path — simulating the host
  fs.writeFileSync(argsS.filePath, argsS.newString, "utf-8");
  const lS = readLines();
  const fS = split8(lS[lS.length - 1]);
  chk("edit doubled-segment → MUTATED + the edit lands where the log says + fuzzy-resolved kind=dedup scope=write d=0 (#73, the collapse pre-check before the R7 segment channel)",
    argsS.filePath === proj + "\\sx\\real-a.txt" &&
      fs.readFileSync(path.join(proj, "sx", "real-a.txt"), "utf-8") === "R7" &&
      lS.length === countS + 1 && fS.length === 8 && fS[3] === "edit" && fS[7] === "fuzzy-resolved" &&
      // the evidence format is byte-exact; the log FIELD is cap-truncated
      // (MAX_FIELD_CHARS, the `...` marker) — expected via the SAME
      // flattenField the hook's log path uses
      fS[5] === core.flattenField(`fuzzy kind=dedup scope=write orig=${proj}\\sx\\sx\\real-a.txt -> ${proj}\\sx\\real-a.txt d=0`), JSON.stringify(fS));

  // ---- (8h) the #0 numword escape (2026-09-18; approved
  //      2026-09-17_numword-escape-output.md): the sentinel-gated CONTENT
  //      resolution — the ONE legal content mutation:
  //      `[<incident>:<safe-form>:esc]` → the field-2-derived digits (the
  //      safe form: dash digits or numwords); the sentinel never reaches
  //      the content; unmarked / invalid forms are NEVER touched
  const argsE1 = { filePath: proj + "\\wfx\\file-4.txt", oldString: "n [405:four-two-five:esc]", newString: "m [405:4-2-5:esc]" };
  const argsE1Before = JSON.stringify(argsE1);
  const countE1 = readLines().length;
  await before({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c10h" }, { args: argsE1 });
  const lE1 = readLines();
  // line order: escape(oldString) + escape(newString) — the channel lines —
  // then the observation line on the ORIGINAL argStr (observeNumword sees the
  // `four-two-five` token inside the oldString form — it is not a pair span;
  // the observation channel always sees the pre-mutation arg)
  const fE1a = split8(lE1[countE1]);
  const fE1b = split8(lE1[countE1 + 1]);
  const fE1c = split8(lE1[countE1 + 2]);
  const fE1d = split8(lE1[countE1 + 3]);
  chk("escape positive (edit oldString+newString) → both resolved (numword + dash-digit forms) + 2 pair-resolved kind=escape lines + the numword observation on the original arg + the R6 hint (oldString absent → fail-closed no-candidate, LAST line)",
    argsE1.oldString === "n 425" && argsE1.newString === "m 425" && lE1.length === countE1 + 4 &&
      fE1a[7] === "pair-resolved" && fE1a[5] === "kind=escape scope=content orig=[405:four-two-five:esc] value=425 hits=1" &&
      fE1b[7] === "pair-resolved" && fE1b[5] === "kind=escape scope=content orig=[405:4-2-5:esc] value=425 hits=1" &&
      // the log FIELD is cap-truncated (MAX_FIELD_CHARS) — expected via the
      // SAME flattenField the hook's log path uses
      fE1a[4] === core.flattenField(argsE1Before) && fE1c[7] === "no-candidate" && fE1c[5] === "numword four-two-five→425" &&
      fE1d[7] === "no-candidate" && fE1d[5] === "hint reason=no-anchor-line" && fE1d[6] === "edit oldString",
    JSON.stringify([fE1a, fE1b, fE1c, fE1d]));

  const argsE2 = { filePath: proj + "\\wfx\\file-4.txt", content: "x = args[1:one] + y; [316:foo-bar:esc]" };
  const argsE2Before = JSON.stringify(argsE2);
  const countE2 = readLines().length;
  await before({ tool: "write", sessionID: "ses_smoke_io1", callID: "c10i" }, { args: argsE2 });
  const lE2 = readLines();
  const fE2 = split8(lE2[lE2.length - 1]);
  chk("escape negative: unmarked [1:one] pair-logged only (args byte-identical) + INVALID safe form [316:foo-bar:esc] untouched (zero kind=escape lines)",
    JSON.stringify(argsE2) === argsE2Before && lE2.length === countE2 + 1 && fE2[7] === "observed-redundancy-ok" &&
      fE2[5] === "pair=[1:one] canon=1 dist=0" &&
      !lE2.slice(countE2).some((l) => l.includes("kind=escape")), JSON.stringify([argsE2, lE2.slice(countE2)]));

  // ---- (10) the R6 payload journal + edit hint channel (2026-09-25;
  //      observation-only): the journal is a SEPARATE file (journal-only
  //      calls add NO intercept.log line); the hint runs on the effective
  //      edit args (exact-1 silent / >1 ambiguous / 0 → the content
  //      locator) + the after-hook enrichment (consumed once) + the DoD
  //      machine check (the write payload cp'd in place reproduces the
  //      intended file state; the failed edit's payload names the exact
  //      intended edit)
  const jdir = path.join(proj, "jf");
  fs.mkdirSync(jdir, { recursive: true });
  const journalWriteLog = path.join(proj, ".opencode", "temp", "journal_write.log");
  const journalEditLog = path.join(proj, ".opencode", "temp", "journal_edit.log");
  const jRead = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf-8").split(/\r?\n/).filter((l) => l.length > 0) : []);
  const jPayload = (line) => line.split(" | ").slice(4).join(" | ");

  // (10a) journal WRITE: the content is DENSE/NUMWORD-FREE so the write fires
  //        NO observation line (the journal is the only effect); the payload is
  //        self-delimiting JSON (may contain " | " + newline)
  const argsJW = { filePath: jdir + "\\w.txt", content: "part A | part B\npart C" };
  const countJW = readLines().length;
  const jwBefore = jRead(journalWriteLog).length;
  await before({ tool: "write", sessionID: "ses_smoke_io1", callID: "c10a" }, { args: argsJW });
  const jw = jRead(journalWriteLog);
  const jwLine = jw[jwBefore];
  chk("journal write: ONE new line in journal_write.log (5 logical fields; the JSON payload round-trips, may contain ' | ' + newline) + ZERO intercept lines (content dense/numword-free)",
    jw.length === jwBefore + 1 && jwLine.split(" | ").length >= 5 && jwLine.split(" | ")[1] === "ses_smoke_io1" && jwLine.split(" | ")[2] === "write" &&
      jwLine.split(" | ")[3] === jdir + "\\w.txt" && JSON.parse(jPayload(jwLine)) === argsJW.content &&
      readLines().length === countJW, JSON.stringify({ jwLine, n: readLines().length - countJW }));

  // (10b) journal EDIT: one line; payload = JSON {filePath, old, new}; the
  //        EXACT-1 hint is silent (zero intercept lines)
  fs.writeFileSync(path.join(jdir, "e.txt"), "abc", "utf-8");
  const argsJE = { filePath: jdir + "\\e.txt", oldString: "abc", newString: "def" };
  const countJE = readLines().length;
  const jeBefore = jRead(journalEditLog).length;
  await before({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c10b" }, { args: argsJE });
  const je = jRead(journalEditLog);
  const jeLine = je[jeBefore];
  chk("journal edit: ONE new line in journal_edit.log (payload {filePath, old, new}) + exact-1 hint SILENT (zero intercept lines)",
    je.length === jeBefore + 1 && jeLine.split(" | ")[2] === "edit" && jeLine.split(" | ")[3] === jdir + "\\e.txt" &&
      jPayload(jeLine) === JSON.stringify({ filePath: jdir + "\\e.txt", old: "abc", new: "def" }) &&
      readLines().length === countJE, JSON.stringify({ jeLine, n: readLines().length - countJE }));

  // (10c) journal BLOCK_TRANSFER: one line in journal_edit.log (the shared
  //        edit-class file — the tool field disambiguates); target = dstFile
  fs.writeFileSync(path.join(jdir, "a.txt"), "x", "utf-8");
  fs.writeFileSync(path.join(jdir, "b.txt"), "x", "utf-8");
  const argsJB = { srcFile: jdir + "\\a.txt", dstFile: jdir + "\\b.txt", mode: "MOVE", startMarker: "## S", endMarker: "## E", targetMarker: "## T" };
  const jbBefore = jRead(journalEditLog).length;
  await before({ tool: "block_transfer", sessionID: "ses_smoke_io1", callID: "c10c" }, { args: argsJB });
  const jb = jRead(journalEditLog);
  const jbLine = jb[jbBefore];
  chk("journal block_transfer: ONE new line in journal_edit.log (target = dstFile; payload = the anchor fields)",
    jb.length === jbBefore + 1 && jbLine.split(" | ")[2] === "block_transfer" && jbLine.split(" | ")[3] === jdir + "\\b.txt" &&
      jPayload(jbLine) === JSON.stringify({ srcFile: jdir + "\\a.txt", dstFile: jdir + "\\b.txt", mode: "MOVE", startMarker: "## S", endMarker: "## E", targetMarker: "## T" }),
    JSON.stringify(jbLine));

  // (10d) hint EXACT-1 → silent (no HINT line — the edit will succeed). The dense
  //        date in oldString fires an OBSERVATION line (context != 'edit oldString');
  //        the hint channel itself produces nothing (exact-1).
  const htxt = jdir + "\\h.txt";
  fs.writeFileSync(htxt, "alpha 20260915 beta\ngamma 20260916 delta\n", "utf-8");
  const argsHX = { filePath: htxt, oldString: "alpha 20260915 beta", newString: "z" };
  const countHX = readLines().length;
  await before({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c10d" }, { args: argsHX });
  const lHX = readLines();
  chk("hint exact-1 → SILENT (no 'edit oldString' line; the edit will succeed)",
    !lHX.slice(countHX).some((l) => l.split(" | ")[6] === "edit oldString"), `n=${readLines().length - countHX}`);

   // (10e) (2) RE-PIN (was: hint d=1 → edit-hint): oldString ABSENT (raw), a
   //        single candidate at d=1 → NOW MUTATES: oldString → the file's
   //        EXACT bytes (an exact UNIQUE file substring) + the fuzzy-edit
   //        line LAST (byte-exact: orig + len + d + value; context
   //        'edit oldString'); NO after-hook hint stored
   const argsHF = { filePath: htxt, oldString: "alpha 20260915 betaa", newString: "z" };
   const jeBeforeE = jRead(journalEditLog).length;
   const htxtBefore = fs.readFileSync(htxt, "utf-8");
   await before({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c10e" }, { args: argsHF });
   const lHF = readLines();
   const fHF = split8(lHF[lHF.length - 1]);
   const mutCount = (hay, needle) => { let n = 0, p = 0; while (p + needle.length <= hay.length) { const i = hay.indexOf(needle, p); if (i === -1) break; n++; p = i + 1; } return n; };
   chk("(2) single-typo d=1 → MUTATED oldString to the file's exact bytes (exact UNIQUE substring) + fuzzy-edit LAST line (byte-exact; context 'edit oldString') — the dense date in oldString also fires an observation line",
     argsHF.oldString === "alpha 20260915 beta" && htxtBefore.indexOf("alpha 20260915 beta") !== -1 &&
       mutCount(htxtBefore, argsHF.oldString) === 1 &&
       fHF.length === 8 && fHF[3] === "edit" && fHF[7] === "fuzzy-edit" &&
       fHF[5] === "fuzzy-edit orig=alpha 20260915 betaa len=20 d=1 value=alpha 20260915 beta" && fHF[6] === "edit oldString",
     JSON.stringify(fHF));

  // (10f) hint multiple exact → edit-ambiguous with ALL occurrence start lines
  const h2 = jdir + "\\h2.txt";
  fs.writeFileSync(h2, "one 20260915 x\ntwo 20260916 y\none 20260915 x\n", "utf-8");
  const argsHM = { filePath: h2, oldString: "one 20260915 x", newString: "z" };
  await before({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c10f" }, { args: argsHM });
  const lHM = readLines();
  const fHM = split8(lHM[lHM.length - 1]);
  chk("hint multiple exact → edit-ambiguous LAST line 'hint lines=1,3' — the dense date + numword 'one' also fire observation lines",
    fHM.length === 8 && fHM[7] === "edit-ambiguous" && fHM[5] === "hint lines=1,3" && fHM[6] === "edit oldString",
    JSON.stringify(fHM));

  // (10g) hint no candidate → fail-closed no-candidate
  const argsHN = { filePath: htxt, oldString: "zeta 20260917 eta", newString: "z" };
  await before({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c10g" }, { args: argsHN });
  const lHN = readLines();
  const fHN = split8(lHN[lHN.length - 1]);
  chk("hint no candidate → no-candidate LAST line 'hint reason=no-anchor-line' (fail-closed) — the dense date in oldString also fires an observation line",
    fHN.length === 8 && fHN[7] === "no-candidate" && fHN[5] === "hint reason=no-anchor-line" && fHN[6] === "edit oldString",
    JSON.stringify(fHN));

  // (10h) the AFTER-HOOK enrichment: the failed edit's output.output gains
  //        the hint line — consumed once (a second call is a no-op); a
  //        hint-less edit is untouched
   const outM = { title: "edit", output: "ok", metadata: {} };
   await after({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c10e" }, outM); // (2) mutate → NO hint stored → untouched
   const outR = { title: "edit", output: "Error: oldString not found", metadata: {} };
   await after({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c10g" }, outR); // fail-closed → the hint IS stored
   const enriched = outR.output;
   await after({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c10g" }, outR); // consumed once
   const outS = { title: "edit", output: "ok", metadata: {} };
   await after({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c10d" }, outS); // exact-1 silent → nothing cached
   chk("after-hook enrichment ((2) re-pin): mutate (c10e) → UNTOUCHED (no hint stored); fail-closed (c10g) → gains the no-candidate hint line (consumed once); exact-1 silent (c10d) → untouched",
     outM.output === "ok" && enriched === "Error: oldString not found\nhint reason=no-anchor-line" && outR.output === enriched && outS.output === "ok",
     JSON.stringify({ m: outM.output, e: outR.output, s: outS.output }));

  // (10i) the DoD machine check: the controlled FAILED EDIT (10e) produced
  //        the hint line AND a journal line whose payload names the exact
  //        intended edit; the journal WRITE payload (10a) cp'd in place
  //        reproduces the intended file state (byte-identical)
  const doDJ = jRead(journalEditLog)[jeBeforeE];
  const doDP = doDJ ? JSON.parse(jPayload(doDJ)) : null;
  const jwPayload = JSON.parse(jPayload(jRead(journalWriteLog)[jwBefore]));
  const wTarget = jdir + "\\w.txt";
  fs.writeFileSync(wTarget, jwPayload, "utf-8");
   chk("DoD machine check ((2) re-pin): the journal's edit `old` = the ORIGINAL (pre-mutation) oldString — 10e's oldString was MUTATED to the file's exact bytes, yet the journal captures what the model asked for (recovery fallback) + the write payload cp'd in place reproduces the intended file state (byte-identical)",
     doDP !== null && doDP.filePath === htxt && doDP.old === "alpha 20260915 betaa" && doDP.new === "z" &&
       argsHF.oldString === "alpha 20260915 beta" && doDP.old !== argsHF.oldString &&
       fs.readFileSync(wTarget, "utf-8") === argsJW.content,
     JSON.stringify({ doDP, mutated: argsHF.oldString, cp: fs.readFileSync(wTarget, "utf-8") }));

   // ---- (11) (2) the MUTATING edit-fuzzy oldString channel (2026-09-25,
   //      #95 sub-item 2 — normalize-then-compare): the 0-raw-occurrence
   //      case resolves WITHOUT agent action — d=0 (CRLF/LF + trailing-ws)
   //      and d=1 (single typo, outside the anchor) on exactly-one
   //      candidate → oldString MUTATED to the file's exact bytes (the
   //      fuzzy-edit line; NO after-hook hint); else FAIL-CLOSED (the R6
   //      hint verdict carrying the best-candidate d; the after-hook hint
   //      is stored). Directive b: the feedback line is truncated (first
   //      40 chars + ...), the journal carries the FULL original oldString.
   const f2dir = path.join(proj, "f2");
   fs.mkdirSync(f2dir, { recursive: true });
   const cf = path.join(f2dir, "cf.txt"); // CRLF file (the LF query: 0 raw)
   const tw = path.join(f2dir, "tw.txt"); // LF file
   const am = path.join(f2dir, "am.txt"); // two d<=1 candidates (ambiguous)
   const nm = path.join(f2dir, "nm.txt"); // single d=3 near-miss
   const lg = path.join(f2dir, "lg.txt"); // the long oldString (directive b)
   fs.writeFileSync(cf, "alpha one\r\nbeta two\r\ngamma three\r\n", "utf-8");
   fs.writeFileSync(tw, "alpha one\nbeta two\ndelta four\n", "utf-8");
   fs.writeFileSync(am, "alpha 20260915 beta\nalpha 20260915 betz\n", "utf-8");
   fs.writeFileSync(nm, "alpha 20260915 beta\ngamma 20260916 delta\n", "utf-8");
   const lgLine = "the quick brown fox 20260915 jumps over the lazy dog and the cat slept";
   fs.writeFileSync(lg, lgLine + "\n", "utf-8");

   // (11a) CRLF-drift: oldString LF, file CRLF (same content, 0 raw) → d=0
   //        → MUTATE to the file's CRLF bytes (exact unique substring)
   //        + the fuzzy-edit line (byte-exact; context 'edit oldString')
   const argsF1 = { filePath: cf, oldString: "alpha one\nbeta two\ngamma three", newString: "z" };
   await before({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c11a" }, { args: argsF1 });
   const lF1 = readLines();
   const fF1 = split8(lF1[lF1.length - 1]);
   chk("(2) CRLF-drift: 0 raw → d=0 → MUTATED oldString to the file's CRLF bytes (exact UNIQUE substring) + fuzzy-edit LAST line (byte-exact)",
     argsF1.oldString === "alpha one\r\nbeta two\r\ngamma three" &&
       mutCount(fs.readFileSync(cf, "utf-8"), argsF1.oldString) === 1 &&
       fF1.length === 8 && fF1[3] === "edit" && fF1[7] === "fuzzy-edit" &&
       fF1[5] === "fuzzy-edit orig=alpha one beta two gamma three len=30 d=0 value=alpha one beta two gamma three" && fF1[6] === "edit oldString",
     JSON.stringify(fF1));

   // (11b) trailing-whitespace drift: oldString line has trailing ws, the
   //        file line does not → d=0 → MUTATE
   const argsF2 = { filePath: tw, oldString: "beta two   ", newString: "z" };
   await before({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c11b" }, { args: argsF2 });
   const lF2 = readLines();
   const fF2 = split8(lF2[lF2.length - 1]);
   chk("(2) trailing-ws drift: 0 raw → d=0 → MUTATED oldString to the file's exact bytes + fuzzy-edit LAST line (byte-exact)",
     argsF2.oldString === "beta two" &&
       mutCount(fs.readFileSync(tw, "utf-8"), argsF2.oldString) === 1 &&
       fF2.length === 8 && fF2[7] === "fuzzy-edit" &&
       fF2[5] === "fuzzy-edit orig=beta two    len=11 d=0 value=beta two" && fF2[6] === "edit oldString",
     JSON.stringify(fF2));

   // (11c) single typo (outside the anchor — the line carries a dense
   //        span): exactly one candidate at d=1 → MUTATE
   const argsF3 = { filePath: nm, oldString: "alpha 20260915 betaa", newString: "z" };
   await before({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c11c" }, { args: argsF3 });
   const lF3 = readLines();
   const fF3 = split8(lF3[lF3.length - 1]);
   chk("(2) single typo d=1: exactly one candidate → MUTATED oldString to the file's exact bytes + fuzzy-edit LAST line (byte-exact) — the dense date also fires an observation line",
     argsF3.oldString === "alpha 20260915 beta" &&
       mutCount(fs.readFileSync(nm, "utf-8"), argsF3.oldString) === 1 &&
       fF3.length === 8 && fF3[7] === "fuzzy-edit" &&
       fF3[5] === "fuzzy-edit orig=alpha 20260915 betaa len=20 d=1 value=alpha 20260915 beta" && fF3[6] === "edit oldString",
     JSON.stringify(fF3));

   // (11d) fail-closed near-miss: a single candidate at d=3 → NOT mutated;
   //        the no-candidate fail line CARRIES the best-candidate d
   //        (directive a: every attempt is logged with the best-d)
   const argsF4 = { filePath: nm, oldString: "alpha 20260915 zeet", newString: "z" };
   const argsF4Before = JSON.stringify(argsF4);
   await before({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c11d" }, { args: argsF4 });
   const lF4 = readLines();
   const fF4 = split8(lF4[lF4.length - 1]);
   chk("(2) fail-closed near-miss: best d=3 → NOT mutated (byte-identical) + no-candidate LAST line carries 'best-d=3' (directive a) — the dense date also fires an observation line",
     JSON.stringify(argsF4) === argsF4Before && fF4.length === 8 && fF4[7] === "no-candidate" &&
       fF4[5] === "hint reason=d-too-high best-d=3" && fF4[6] === "edit oldString",
     JSON.stringify(fF4));

   // (11e) ambiguous: two candidates at d<=1 → NOT mutated → edit-ambiguous
   //        (the R6 verdict as today; the after-hook hint is stored)
   const argsF5 = { filePath: am, oldString: "alpha 20260915 bety", newString: "z" };
   const argsF5Before = JSON.stringify(argsF5);
   await before({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c11e" }, { args: argsF5 });
   const lF5 = readLines();
   const fF5 = split8(lF5[lF5.length - 1]);
   chk("(2) ambiguous: two candidates at d<=1 → NOT mutated (byte-identical) + edit-ambiguous LAST line 'hint cands=1 1,2 1' — the dense date also fires an observation line",
     JSON.stringify(argsF5) === argsF5Before && fF5.length === 8 && fF5[7] === "edit-ambiguous" &&
       fF5[5] === "hint cands=1 1,2 1" && fF5[6] === "edit oldString",
     JSON.stringify(fF5));

   // (11f) directive (b): a LONG oldString (> 40 chars) → the feedback line
   //        is TRUNCATED (first 40 chars + ... + len + d + the truncated
   //        target; the line does NOT carry the full oldString) while the
   //        journal carries the FULL original oldString (edit `old`)
   const lgQuery = "the quick brovn fox 20260915 jumps over the lazy dog and the cat slept";
   const argsF6 = { filePath: lg, oldString: lgQuery, newString: "z" };
   const jeBeforeF = jRead(journalEditLog).length;
   await before({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c11f" }, { args: argsF6 });
   const lF6 = readLines();
   const fF6 = split8(lF6[lF6.length - 1]);
   const jF6 = jRead(journalEditLog)[jeBeforeF];
   const jF6P = jF6 ? JSON.parse(jPayload(jF6)) : null;
   chk("(2) directive (b): long oldString → the fuzzy-edit line is TRUNCATED (orig=first 40 + ... len=70 d=1 value=first 40 + ...; no full oldString in the line) + the journal's edit `old` = the FULL original oldString — and the mutated oldString is an exact UNIQUE file substring",
     argsF6.oldString === lgLine && mutCount(fs.readFileSync(lg, "utf-8"), argsF6.oldString) === 1 &&
       fF6.length === 8 && fF6[7] === "fuzzy-edit" &&
       fF6[5] === "fuzzy-edit orig=the quick brovn fox 20260915 jumps over ... len=70 d=1 value=the quick brown fox 20260915 jumps over ..." &&
       !fF6[5].includes("the lazy dog") &&
       jF6P !== null && jF6P.old === lgQuery && jF6P.new === "z" && jF6P.filePath === lg,
     JSON.stringify({ fF6, jF6P, mutated: argsF6.oldString }));

  // ---- (12) R8 out-of-sandbox path redirect (#97, 2026-09-25): the 1:1
  //      allowed-root redirect over the TYPED path fields. The factory
  //      found NO opencode.jsonc under the sandbox proj → the FALLBACK
  //      roots [workspace root (proj), SCRATCHPAD_ROOT] apply (the
  //      config-unreadable DoD case — they still redirect). Roots are
  //      resolved ONCE at init; the config-read path is pinned below via
  //      a SECOND factory instance with a crafted config.
  const r8Scratch = "C:/Users/Wasiejen/AppData/Local/Temp/opencode";

  // (12a) pure resolver: 3 forms of ONE root dedupe to one match → the
  //        target; a sibling of TWO distinct roots (same parent) → null
  //        (fail-closed); no mapping → null
  chk("R8 pure resolver: deduped root (3 forms of rootA) → one match → 'C:/x/rootA/other.txt'; sibling of TWO distinct roots → null; no mapping → null",
    core.resolveRedirect("C:/x/other.txt", ["C:/x/rootA", "C:\\X\\ROOTA", "C:/x/rootA/"]) === "C:/x/rootA/other.txt" &&
      core.resolveRedirect("C:/x/both.txt", ["C:/x/rootA", "C:/x/rootB"]) === null &&
      core.resolveRedirect("C:/Windows/System32/cmd.exe", ["C:/x/rootA"]) === null,
    JSON.stringify({
      one: core.resolveRedirect("C:/x/other.txt", ["C:/x/rootA", "C:\\X\\ROOTA", "C:/x/rootA/"]),
      two: core.resolveRedirect("C:/x/both.txt", ["C:/x/rootA", "C:/x/rootB"]),
      none: core.resolveRedirect("C:/Windows/System32/cmd.exe", ["C:/x/rootA"]),
    }));

  // (12b) READ sibling of the workspace root (fallback) → filePath
  //        MUTATED to root+basename + the kind=redirect line FIRST (a
  //        fuzzy-rejected line may follow) + NO out-of-sandbox line (the
  //        note is recomputed on the effective args)
  {
    const a = { filePath: base + "\\io-r8-read-sib.txt" };
    const aBefore = JSON.stringify(a);
    const c0 = readLines().length;
    await before({ tool: "read", sessionID: "ses_smoke_io1", callID: "c12b" }, { args: a });
    const nl = readLines().slice(c0);
    const f = split8(nl[0] ?? "");
    chk("R8 read-sibling (fallback root) → filePath MUTATED to root+basename + kind=redirect FIRST line (8 fields, byte-exact evidence, the log field cap-flattened) + NO out-of-sandbox line",
      a.filePath === proj + "/io-r8-read-sib.txt" && JSON.stringify(a) !== aBefore && f.length === 8 && f[3] === "read" && f[7] === "pair-resolved" &&
        f[5] === core.flattenField(`kind=redirect tool=read arg=filePath orig=${base}\\io-r8-read-sib.txt value=${proj}/io-r8-read-sib.txt`) &&
        !nl.some((x) => split8(x)[7] === "out-of-sandbox"),
      JSON.stringify({ after: a.filePath, nl }));
  }

  // (12c) WRITE sibling of the workspace root (fallback) → exactly ONE
  //        new line (M1: write has no fuzzy channel — the redirect line
  //        only) + args mutated
  {
    const a = { filePath: base + "\\io-r8-write-sib.txt", content: "R8-WRITE" };
    const aBefore = JSON.stringify(a);
    const c0 = readLines().length;
    await before({ tool: "write", sessionID: "ses_smoke_io1", callID: "c12c" }, { args: a });
    const nl = readLines().slice(c0);
    const f = split8(nl[0] ?? "");
    chk("R8 write-sibling (fallback root) → filePath MUTATED + EXACTLY ONE new line: kind=redirect (byte-exact, the log field cap-flattened) — no out-of-sandbox note",
      a.filePath === proj + "/io-r8-write-sib.txt" && JSON.stringify(a) !== aBefore && nl.length === 1 && f.length === 8 && f[3] === "write" && f[7] === "pair-resolved" &&
        f[5] === core.flattenField(`kind=redirect tool=write arg=filePath orig=${base}\\io-r8-write-sib.txt value=${proj}/io-r8-write-sib.txt`),
      JSON.stringify({ after: a.filePath, nl }));
  }

  // (12d) span == root (the fallback SCRATCHPAD root — case/separator
  //        variant) → MUTATED to the root AS CONFIGURED (existsSync
  //        passes case-insensitively → the fuzzy channel is silent)
  {
    const a = { filePath: "C:\\USERS\\wasiejen\\APPDATA\\local\\TEMP\\opencode" };
    const aBefore = JSON.stringify(a);
    const c0 = readLines().length;
    await before({ tool: "read", sessionID: "ses_smoke_io1", callID: "c12d" }, { args: a });
    const nl = readLines().slice(c0);
    const f = split8(nl[0] ?? "");
    chk("R8 span == root (fallback SCRATCHPAD root, case/separator variant) → MUTATED to the root AS CONFIGURED + kind=redirect line (byte-exact, the log field cap-flattened)",
      a.filePath === r8Scratch && JSON.stringify(a) !== aBefore && nl.length === 1 && f.length === 8 && f[7] === "pair-resolved" &&
        f[5] === core.flattenField(`kind=redirect tool=read arg=filePath orig=C:\\USERS\\wasiejen\\APPDATA\\local\\TEMP\\opencode value=${r8Scratch}`),
      JSON.stringify({ after: a.filePath, nl }));
  }

  // (12e) nested non-sibling (under the workspace root, two levels down)
  //        → NO mutation, NO kind=redirect line (fail-closed), no
  //        out-of-sandbox (it is under the root)
  {
    const a = { filePath: proj + "\\deep\\io-r8-file.txt" };
    const aBefore = JSON.stringify(a);
    const c0 = readLines().length;
    await before({ tool: "read", sessionID: "ses_smoke_io1", callID: "c12e" }, { args: a });
    const nl = readLines().slice(c0);
    chk("R8 nested non-sibling (under the workspace root) → NOT mutated + NO kind=redirect line + no out-of-sandbox",
      JSON.stringify(a) === aBefore && !nl.some((x) => x.includes("kind=redirect")) &&
        !nl.some((x) => split8(x)[7] === "out-of-sandbox"),
      JSON.stringify({ args: a, n: nl.length }));
  }

  // ---- (13) Unit 2 (#97, 2026-09-25): the escape RETURN-INFO — the
  //      silent escape mutation gets a FEEDBACK NOTE in the tool result
  //      (the after hook — also on success) + the FULL pre-mutation forms
  //      in the R6 journal (the trailing `pre-escape` field). Uses the
  //      FIRST factory's hooks (dir = proj — the (12f) second factory
  //      below flips the module state).
  const eu2 = path.join(proj, "eu2");
  fs.mkdirSync(eu2, { recursive: true });
  const eu2File = path.join(eu2, "f.txt");
  fs.writeFileSync(eu2File, "alpha line one\nbeta line two\n", "utf-8");
  const formNum = "[405:four-two-five:esc]"; // -> 425 (the (8h) proven form)
  const formDash = "[405:4-2-5:esc]"; // -> 425 (the (8h) proven form)

  // (13a) escape WRITE → content resolved (args mutated) + the after-hook
  //        FEEDBACK note (byte-exact, the truncated first form) + the
  //        journal line carries the trailing pre-escape field (the full
  //        pre-mutation forms)
  {
    const content = `x ${formNum} y`;
    const a = { filePath: eu2File, content };
    const je0 = jRead(journalWriteLog).length;
    await before({ tool: "write", sessionID: "ses_smoke_io1", callID: "c13a" }, { args: a });
    const out = { title: "write", output: "ok", metadata: {} };
    await after({ tool: "write", sessionID: "ses_smoke_io1", callID: "c13a" }, out);
    const note = `escape-resolved: 1 escape form(s) in content (first: ${formNum} len=${formNum.length} -> 425); full pre-mutation forms: .opencode/temp/intercept.log (kind=escape) + .opencode/temp/journal_write.log`;
    const jl = jRead(journalWriteLog)[je0];
    chk("Unit2 escape write → content resolved (args mutated) + the after-hook FEEDBACK note (byte-exact, the truncated first form) + the journal line carries the trailing pre-escape field (full pre-mutation forms)",
      a.content === "x 425 y" && out.output === `ok\n${note}` &&
        jl !== undefined && jl.endsWith(` | pre-escape=${JSON.stringify({ content: [formNum] })}`) &&
        JSON.parse(jl.split(" | ")[4]) === a.content,
      JSON.stringify({ content: a.content, out: out.output, jl }));
  }

  // (13b) escape EDIT (oldString + newString) → BOTH resolved → 2 notes +
  //        the failed-edit HINT — the hint FIRST, then the notes (the
  //        oldString/newString field order); the hint behavior is
  //        unchanged
  {
    const je0 = jRead(journalEditLog).length;
    const a = { filePath: eu2File, oldString: `n ${formDash}`, newString: `m ${formNum}` };
    await before({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c13b" }, { args: a });
    const out = { title: "edit", output: "Error: oldString not found", metadata: {} };
    await after({ tool: "edit", sessionID: "ses_smoke_io1", callID: "c13b" }, out);
    const noteOld = `escape-resolved: 1 escape form(s) in oldString (first: ${formDash} len=${formDash.length} -> 425); full pre-mutation forms: .opencode/temp/intercept.log (kind=escape) + .opencode/temp/journal_edit.log`;
    const noteNew = `escape-resolved: 1 escape form(s) in newString (first: ${formNum} len=${formNum.length} -> 425); full pre-mutation forms: .opencode/temp/intercept.log (kind=escape) + .opencode/temp/journal_edit.log`;
    const jle = jRead(journalEditLog)[je0];
    chk("Unit2 escape edit (old+new) → BOTH resolved (args mutated) + the failed-edit HINT fires FIRST, then the two notes (oldString, newString); hint behavior unchanged; journal pre-escape field carries both forms",
      a.oldString === "n 425" && a.newString === "m 425" &&
        out.output === `Error: oldString not found\nhint reason=d-too-high best-d=11\n${noteOld}\n${noteNew}` &&
        jle !== undefined && jle.endsWith(` | pre-escape=${JSON.stringify({ oldString: [formDash], newString: [formNum] })}`),
      JSON.stringify({ old: a.oldString, nw: a.newString, out: out.output, jle }));
  }

  // (13c) a call with no escape forms → NO note (the after hook leaves the
  //        output byte-identical)
  {
    const a = { filePath: path.join(eu2, "plain.txt"), content: "hello" };
    await before({ tool: "write", sessionID: "ses_smoke_io1", callID: "c13c" }, { args: a });
    const out = { title: "write", output: "ok", metadata: {} };
    await after({ tool: "write", sessionID: "ses_smoke_io1", callID: "c13c" }, out);
    chk("Unit2 no-escape call → NO note (the after hook leaves the output byte-identical)",
      out.output === "ok",
      JSON.stringify(out.output));
  }

  // (13d) the note is consumed ONCE (a second after call with the same
  //        callID → untouched)
  {
    const a = { filePath: path.join(eu2, "once.txt"), content: `y ${formDash}` };
    await before({ tool: "write", sessionID: "ses_smoke_io1", callID: "c13d" }, { args: a });
    const out = { title: "write", output: "ok", metadata: {} };
    await after({ tool: "write", sessionID: "ses_smoke_io1", callID: "c13d" }, out);
    const first = out.output;
    await after({ tool: "write", sessionID: "ses_smoke_io1", callID: "c13d" }, out);
    chk("Unit2 note consumed once: the second after call leaves the output unchanged (one note line only)",
      first !== "ok" && first.startsWith("ok\nescape-resolved: 1 escape form(s) in content") && out.output === first,
      JSON.stringify(out.output));
  }

  // (12f) the CONFIG-READ path: a SECOND factory instance with a crafted
  //        opencode.jsonc under proj2 — the roots come from the config
  //        (permission "allow" keys + the `/**` twin deduped + the
  //        references path + the workspace root). Module state flips to
  //        proj2 → only `before2` may be used from here on.
  const proj2 = path.join(base, "proj2");
  fs.mkdirSync(proj2, { recursive: true });
  const rA = path.join(tdir, "rootA");
  const rB = path.join(tdir, "rootB");
  const rC = path.join(tdir, "sub", "rootC");
  const rRef = path.join(tdir, "sub2", "refroot");
  fs.writeFileSync(path.join(proj2, "opencode.jsonc"),
    JSON.stringify({
      permission: { external_directory: { [rA]: "allow", [rB]: "allow", [rA + "/**"]: "allow", [rC]: "allow" } },
      references: { ref1: { path: rRef } },
    }) + "\n// trailing JSONC comment — must survive the shared parse\n", "utf-8");
  const hooks2 = await factory({ directory: proj2 });
  const before2 = hooks2["tool.execute.before"];
  const log2 = path.join(proj2, ".opencode", "temp", "intercept.log");
  const read2 = () => (fs.existsSync(log2) ? fs.readFileSync(log2, "utf-8").split(/\r?\n/).filter((l) => l.length > 0) : []);

  // (12g) sibling of TWO distinct config roots (rA + rB, same parent) →
  //        NO mutation (fail-closed) + the out-of-sandbox NOTE fires
  //        (tdir is outside the sandbox)
  {
    const a = { filePath: path.join(tdir, "both.txt") };
    const aBefore = JSON.stringify(a);
    const c0 = read2().length;
    await before2({ tool: "read", sessionID: "ses_smoke_io1", callID: "c12g" }, { args: a });
    const nl = read2().slice(c0);
    chk("R8 config: sibling of TWO distinct config roots → NOT mutated (fail-closed) + the out-of-sandbox NOTE fires + no kind=redirect line",
      JSON.stringify(a) === aBefore && !nl.some((x) => x.includes("kind=redirect")) &&
        nl.some((x) => split8(x)[7] === "out-of-sandbox"),
      JSON.stringify({ args: a, nl }));
  }

  // (12h) sibling of exactly ONE config root (rC — its parent dir is not
  //        shared by any other root) → MUTATED to root+basename
  {
    const a = { filePath: path.join(tdir, "sub", "only-c.txt") };
    const aBefore = JSON.stringify(a);
    const c0 = read2().length;
    await before2({ tool: "read", sessionID: "ses_smoke_io1", callID: "c12h" }, { args: a });
    const nl = read2().slice(c0);
    const f = split8(nl[0] ?? "");
    chk("R8 config: sibling of exactly ONE config root → filePath MUTATED to root+basename + kind=redirect FIRST line (byte-exact, the log field cap-flattened) + no out-of-sandbox",
      a.filePath === rC + "/only-c.txt" && JSON.stringify(a) !== aBefore && f.length === 8 && f[3] === "read" && f[7] === "pair-resolved" &&
        f[5] === core.flattenField(`kind=redirect tool=read arg=filePath orig=${path.join(tdir, "sub", "only-c.txt")} value=${rC}/only-c.txt`) &&
        !nl.some((x) => split8(x)[7] === "out-of-sandbox"),
      JSON.stringify({ after: a.filePath, nl }));
  }

  // (12i) case (i) span == root (rC, uppercased — rC's parent dir is NOT
  //        shared by any other root, so the span matches exactly ONE root;
  //        an rA span would ALSO be a sibling of rB → 2 matches →
  //        fail-closed, pinned in (12g)) → the root AS CONFIGURED; a
  //        sibling of the references root (rRef) → root+basename
  {
    const a = { filePath: rC.toUpperCase() };
    const aBefore = JSON.stringify(a);
    const c0 = read2().length;
    await before2({ tool: "read", sessionID: "ses_smoke_io1", callID: "c12i" }, { args: a });
    const nl = read2().slice(c0);
    const f = split8(nl[0] ?? "");
    const b = { filePath: path.join(tdir, "sub2", "ref-sib.txt") };
    const bBefore = JSON.stringify(b);
    const c1 = read2().length;
    await before2({ tool: "read", sessionID: "ses_smoke_io1", callID: "c12j" }, { args: b });
    const nl2 = read2().slice(c1);
    const fb = split8(nl2[0] ?? "");
    chk("R8 config: span == root (case variant) → the root AS CONFIGURED; a sibling of the references root → root+basename (kind=redirect FIRST line, byte-exact, the log field cap-flattened)",
      a.filePath === rC && JSON.stringify(a) !== aBefore && f.length === 8 && f[7] === "pair-resolved" &&
        f[5] === core.flattenField(`kind=redirect tool=read arg=filePath orig=${rC.toUpperCase()} value=${rC}`) &&
        b.filePath === rRef + "/ref-sib.txt" && JSON.stringify(b) !== bBefore && fb.length === 8 && fb[7] === "pair-resolved" &&
        fb[5] === core.flattenField(`kind=redirect tool=read arg=filePath orig=${path.join(tdir, "sub2", "ref-sib.txt")} value=${rRef}/ref-sib.txt`),
      JSON.stringify({ a: a.filePath, b: b.filePath }));
  }

  // ---- (9) the LIVE log is untouched by this smoke
  const liveAfter = fs.existsSync(LIVE_LOG) ? fs.statSync(LIVE_LOG).size : null;
  chk("live .opencode/temp/intercept.log untouched (sandbox-only writes)",
    liveBefore === null ? !fs.existsSync(LIVE_LOG) : liveAfter === liveBefore, `before=${liveBefore} after=${liveAfter}`);
} finally {
  fs.rmSync(base, { recursive: true, force: true });
  fs.rmSync(tdir, { recursive: true, force: true });
}

finish();
