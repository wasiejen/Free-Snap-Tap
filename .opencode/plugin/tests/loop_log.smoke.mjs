// loop_log.smoke.mjs — the loop_log tool (scratchpad origin: loop_log_smoke.mjs,
// T3 smoke, iter-13; moved per the 2026-09-15_smoke-harness-home proposal).
// The context object carries a SCRATCHPAD temp `directory` — NEVER the live
// .opencode/loop/ (the live loop folder is DO-NOT-touch for this smoke).
// Run: node .opencode/plugin/tests/loop_log.smoke.mjs (plain node, exit 0 iff green).
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, SCRATCHPAD, loadRepo, freshSandbox, makeChecker } from "./_smoke_base.mjs";

const base = freshSandbox("loop_log");
const { chk, finish } = makeChecker("LOOP_LOG_SMOKE");

// Mirror of the tool's machine-computed local stamp (minute resolution) — used
// for the minute-boundary-safe expected-line check (the clock can tick mid-call).
const localStamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
};

// Fresh, cleaned project dir (EMPTY — no .opencode at all).
const mkproj = (name) => {
  const dir = path.join(base, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const mod = await loadRepo(".opencode/tools/loop_log.ts");
const t = mod.default;

// Parse the tool's return `folder: X\nline: Y\n[ANOMALY: ...]` into fields.
const parseRet = (r) => {
  const m = {};
  for (const l of r.split("\n")) {
    const i = l.indexOf(": ");
    if (i === -1) continue;
    const k = l.slice(0, i);
    const v = l.slice(i + 2);
    if (k === "folder") m.folder = v;
    else if (k === "line") m.line = v;
    else m[k] = v; // e.g. "ANOMALY"
  }
  return m;
};

try {
  // ---- shape checks
  chk("default export = tool() result (object with description string)", t != null && typeof t === "object" && typeof t.description === "string");
  chk("no stale 'name'/'parameters' keys", t && !("name" in t) && !("parameters" in t));
  chk("execute is async fn", typeof t.execute === "function" && t.execute.constructor.name === "AsyncFunction");

  // ---- status enum: reject a bogus token at PARSE time; accept the five
  chk("status enum rejects a bogus token at parse time", t.args.status.safeParse("BOGUS").success === false);
  const five = ["-->START", "DONE<---", "-RETURN-", "-WARNING", "--INFO--"];
  chk("status enum accepts all five tokens", five.every((s) => t.args.status.safeParse(s).success));
  chk("role is required (rejects undefined)", t.args.role.safeParse(undefined).success === false);
  chk("model is required (rejects undefined)", t.args.model.safeParse(undefined).success === false);
  chk("content is required (rejects undefined)", t.args.content.safeParse(undefined).success === false);
  chk("session is optional (accepts undefined)", t.args.session.safeParse(undefined).success === true);

  // ---- (A) empty dir -> creates the dated folder + loop_log.md + exact line
  const projA = mkproj("A");
  const ctxA = { directory: projA };
  const argsA = { role: "worker-13", model: "Qwen3.8-27B-IQ4KT-120K", status: "-->START", content: "T3 smoke create + exact line", session: "ses_TEST123" };
  const tB = localStamp();
  const retA = await t.execute(argsA, ctxA);
  const tA = localStamp();
  const pA = parseRet(retA);
  const loopRootA = path.join(projA, ".opencode", "loop");
  const subA = fs.existsSync(loopRootA)
    ? fs.readdirSync(loopRootA, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
    : [];
  chk("(A) exactly one autorun-* folder created", subA.length === 1, JSON.stringify(subA));
  chk("(A) folder name form autorun-<date>_<HH-MM>", subA.length === 1 && /^autorun-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/.test(subA[0]), subA[0]);
  chk("(A) return folder == the created folder", pA.folder === subA[0]);
  const logA = path.join(loopRootA, subA[0], "loop_log.md");
  chk("(A) loop_log.md created", fs.existsSync(logA));
  const mkLineA = (stamp) => `${stamp} ${argsA.status} ${argsA.role} ${argsA.session} ${argsA.model} ${argsA.content}`;
  chk("(A) written line minute-boundary-safe (== before or after)", pA.line === mkLineA(tB) || pA.line === mkLineA(tA), `got=${pA.line}`);
  const fileA = fs.readFileSync(logA, "utf-8").split(/\r?\n/).filter((l) => l.length > 0);
  chk("(A) file holds exactly the one written line", fileA.length === 1 && fileA[0] === pA.line);

  // ---- (B) append-when-exists: a second call appends (order preserved, not rewritten)
  const argsB = { ...argsA, status: "--INFO--", content: "T3 smoke append second line" };
  const tB2 = localStamp();
  const retB = await t.execute(argsB, ctxA);
  const tA2 = localStamp();
  const pB = parseRet(retB);
  chk("(B) the same folder is reused", pB.folder === subA[0]);
  const mkLineB = (stamp) => `${stamp} ${argsB.status} ${argsB.role} ${argsB.session} ${argsB.model} ${argsB.content}`;
  chk("(B) appended line minute-boundary-safe", pB.line === mkLineB(tB2) || pB.line === mkLineB(tA2));
  const fileB = fs.readFileSync(logA, "utf-8").split(/\r?\n/).filter((l) => l.length > 0);
  chk("(B) both lines present, order preserved (file not rewritten)", fileB.length === 2 && fileB[0] === pA.line && fileB[1] === pB.line, JSON.stringify(fileB));

  // ---- (C) session omitted -> the literal 'unknown' in the line
  const projC = mkproj("C");
  const argsC = { role: "worker-13", model: "Qwen3.8-27B-IQ4KT-120K", status: "--INFO--", content: "T3 smoke unknown session" }; // no session
  const tC1 = localStamp();
  const retC = await t.execute(argsC, { directory: projC });
  const tC2 = localStamp();
  const pC = parseRet(retC);
  chk("(C) session omitted -> literal 'unknown' in the line", pC.line.includes(" unknown "), pC.line);
  const mkLineC = (stamp) => `${stamp} ${argsC.status} ${argsC.role} unknown ${argsC.model} ${argsC.content}`;
  chk("(C) unknown-line form minute-boundary-safe", pC.line === mkLineC(tC1) || pC.line === mkLineC(tC2));

  // ---- (D) bogus status: parse fails -> nothing written (a fresh dir stays empty)
  const projD = mkproj("D");
  const bogusRejected = t.args.status.safeParse("BOGUS").success === false; // parse attempt ONLY — execute is never called
  chk("(D) bogus token rejected at parse, no folder/line written", bogusRejected && !fs.existsSync(path.join(projD, ".opencode")));

  // ---- (E) multi-folder anomaly: two autorun-* dirs, distinct mtimes
  const projE = mkproj("E");
  const loopE = path.join(projE, ".opencode", "loop");
  fs.mkdirSync(loopE, { recursive: true });
  const dir1 = path.join(loopE, "autorun-2020-01-01_09-00");
  const dir2 = path.join(loopE, "autorun-2020-01-01_09-05");
  fs.mkdirSync(dir1, { recursive: true });
  fs.mkdirSync(dir2, { recursive: true });
  const older = new Date("2020-01-01T09:00:00Z");
  const newer = new Date("2020-01-01T09:05:00Z");
  fs.utimesSync(dir1, older, older); // explicit, far-apart mtimes -> deterministic
  fs.utimesSync(dir2, newer, newer);
  const argsE = { role: "worker-13", model: "Qwen3.8-27B-IQ4KT-120K", status: "--INFO--", content: "T3 smoke anomaly case", session: "ses_TEST456" };
  const retE = await t.execute(argsE, { directory: projE });
  const pE = parseRet(retE);
  chk("(E) the line lands in the most-recently-modified folder", pE.folder === path.basename(dir2) && fs.readFileSync(path.join(dir2, "loop_log.md"), "utf-8").includes(pE.line), pE.folder);
  chk("(E) the other folder is untouched (no loop_log.md)", !fs.existsSync(path.join(dir1, "loop_log.md")));
  chk("(E) the return value mentions the anomaly", /ANOMALY/.test(retE) && /2 autorun-\* folders/.test(retE) && retE.includes(pE.folder), retE);
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}

finish();
