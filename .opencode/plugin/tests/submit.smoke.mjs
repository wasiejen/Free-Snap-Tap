// submit.smoke.mjs — the submit tool (#53 Part B, the approved proposal
// 2026-09-17_agent-feedback-closedown.md): ONE unified append tool for the
// three agent-inbox channels (feedback / knowledge / todo). The context
// object carries a SCRATCHPAD temp `directory` — NEVER the live targets
// (the real .opencode/agent/agent_feedback.md /
// .opencode/agent/knowledge/knowledge_inbox.md / todo_inbox.md are
// DO-NOT-touch for this smoke).
// Run: node .opencode/plugin/tests/submit.smoke.mjs (plain node, exit 0 iff green).
import fs from "node:fs";
import path from "node:path";
import { loadRepo, freshSandbox, makeChecker } from "./_smoke_base.mjs";

const base = freshSandbox("submit");
const { chk, finish } = makeChecker("SUBMIT_SMOKE");

// Mirror of the tool's machine-computed local stamp (minute resolution) —
// used for the minute-boundary-safe expected-entry check (the clock can
// tick mid-call).
const localStamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
};

// The tool's hardcoded channel table mirrored for the expected-value checks
// (the spec pins these three exact paths; the header depth is the
// established form of each channel).
const REL = {
  feedback: ".opencode/agent/agent_feedback.md",
  knowledge: ".opencode/agent/knowledge/knowledge_inbox.md",
  todo: "todo_inbox.md",
};
const HDR = { feedback: "###", knowledge: "##", todo: "##" };
const NO_PARAMS_ERR = "error: none of feedback/knowledge/todo provided — nothing written";
const mkEntry = (key, stamp, role, session, text) => `${HDR[key]} ${stamp} ${role} ${session}\n${text}\n\n`;
const mkBlock = (key, entry) => `${key}\ntarget: ${REL[key]}\nentry: ${entry}`;

// Fresh, cleaned project dir (EMPTY — no .opencode at all).
const mkproj = (name) => {
  const dir = path.join(base, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
// NOTE: REL entries use forward slashes; on win32 path.join accepts them.
const fpath = (dir, key) => path.join(dir, REL[key]);

const mod = await loadRepo(".opencode/tools/submit.ts");
const t = mod.default;

try {
  // ---- shape checks
  chk("default export = tool() result (object with description string)", t != null && typeof t === "object" && typeof t.description === "string" && t.description.length > 0);
  chk("no stale 'name'/'parameters' keys", t != null && !("name" in t) && !("parameters" in t));
  chk("execute is async fn", t != null && typeof t.execute === "function" && t.execute.constructor.name === "AsyncFunction");
  chk(
    "all 3 channel args optional at parse (feedback/knowledge/todo accept undefined) AND role/session are GONE from the schema (auto-filled from the context)",
    t != null && ["feedback", "knowledge", "todo"].every((k) => t.args[k] != null && t.args[k].safeParse(undefined).success === true) && !("role" in t.args) && !("session" in t.args),
  );

  // ---- (A) feedback single-param, FALLBACK role/session: the context carries
  //      NO agent/sessionID, so the stamp falls back to the literal `agent`
  //      / `unknown` fields — the proof that role/session are auto-filled from
  //      the context (this is the fallback assertion the spec asks for)
  const projA = mkproj("A");
  const argsA = { feedback: "friction: the gauge command took a while to discover" };
  const tA1 = localStamp();
  const retA = await t.execute(argsA, { directory: projA });
  const tA2 = localStamp();
  const fA = fpath(projA, "feedback");
  const bodyA = fs.existsSync(fA) ? fs.readFileSync(fA, "utf-8") : null;
  const okEntryA = (s) => bodyA === mkEntry("feedback", s, "agent", "unknown", argsA.feedback);
  chk("(A) feedback append + FALLBACK: context WITHOUT agent/sessionID stamps `agent`/`unknown`; file created with EXACTLY the entry (### stamp), minute-boundary-safe", okEntryA(tA1) || okEntryA(tA2), `got=${JSON.stringify(bodyA)}`);
  chk("(A) no other target created", !fs.existsSync(fpath(projA, "knowledge")) && !fs.existsSync(fpath(projA, "todo")));
  const okRetA = (s) => retA === mkBlock("feedback", mkEntry("feedback", s, "agent", "unknown", argsA.feedback));
  chk("(A) return = `feedback` + `target:` + `entry:` with entry byte-exact == file content", okRetA(tA1) || okRetA(tA2), `got=${JSON.stringify(retA)}`);

  // ---- (B) knowledge single-param, role/session via the CONTEXT: `## ` stamp
  //      into the knowledge inbox (parent dir auto-created); the stamp is
  //      pinned from the context values (agent/sessionID)
  const projB = mkproj("B");
  const argsB = { knowledge: "probe S16 shows loop_log stamps are minute-resolution" };
  const roleB = "worker-13";
  const sesB = "ses_TEST_71";
  const tB1 = localStamp();
  const retB = await t.execute({ ...argsB }, { directory: projB, agent: roleB, sessionID: sesB });
  const tB2 = localStamp();
  const fB = fpath(projB, "knowledge");
  const bodyB = fs.existsSync(fB) ? fs.readFileSync(fB, "utf-8") : null;
  const okEntryB = (s) => bodyB === mkEntry("knowledge", s, roleB, sesB, argsB.knowledge);
  chk("(B) knowledge append: file created with EXACTLY the entry (## stamp, explicit role/session)", okEntryB(tB1) || okEntryB(tB2), `got=${JSON.stringify(bodyB)}`);
  const okRetB = (s) => retB === mkBlock("knowledge", mkEntry("knowledge", s, roleB, sesB, argsB.knowledge));
  chk("(B) return = `knowledge` + `target:` + `entry:`, byte-exact vs the file entry (minute-boundary-safe)", okRetB(tB1) || okRetB(tB2), `got=${JSON.stringify(retB)}`);

  // ---- (C) todo single-param: `## ` stamp into the repo-root todo_inbox.md
  const projC = mkproj("C");
  const argsC = { todo: "loose finding: the venv python path is not on PATH (use ./.venv/Scripts/python.exe)" };
  const tC1 = localStamp();
  const retC = await t.execute(argsC, { directory: projC });
  const tC2 = localStamp();
  const fC = fpath(projC, "todo");
  const bodyC = fs.existsSync(fC) ? fs.readFileSync(fC, "utf-8") : null;
  const okEntryC = (s) => bodyC === mkEntry("todo", s, "agent", "unknown", argsC.todo);
  chk("(C) todo append: repo-root file created with EXACTLY the entry (## stamp)", okEntryC(tC1) || okEntryC(tC2), `got=${JSON.stringify(bodyC)}`);
  const okRetC = (s) => retC === mkBlock("todo", mkEntry("todo", s, "agent", "unknown", argsC.todo));
  chk("(C) return byte-exact vs the file entry", okRetC(tC1) || okRetC(tC2), `got=${JSON.stringify(retC)}`);

  // ---- (D) no-params / all-empty: the exact error string, NOTHING written
  const projD = mkproj("D");
  const retD = await t.execute({}, { directory: projD });
  chk("(D) none provided -> the exact error string", retD === NO_PARAMS_ERR, `got=${JSON.stringify(retD)}`);
  chk("(D) no file touched (fresh project dir stays empty)", !fs.existsSync(path.join(projD, ".opencode")) && !fs.existsSync(fpath(projD, "todo")));
  const projD2 = mkproj("D2");
  const retD2 = await t.execute({ feedback: "", knowledge: "   ", todo: "" }, { directory: projD2 });
  chk("(D) empty/blank strings count as NOT provided -> same error, no file", retD2 === NO_PARAMS_ERR && !fs.existsSync(path.join(projD2, ".opencode")) && !fs.existsSync(fpath(projD2, "todo")), `got=${JSON.stringify(retD2)}`);

  // ---- (E) multi-param: all three provided in ONE call — one shared stamp,
  //      three files, the return = the three blocks in feedback/knowledge/
  //      todo order
  const projE = mkproj("E");
  const roleE = "probe-smoke";
  const sesE = "ses_TEST_72";
  const argsE = {
    feedback: "multi: friction line",
    knowledge: "multi: knowledge line",
    todo: "multi: finding line",
  };
  const tE1 = localStamp();
  const retE = await t.execute(argsE, { directory: projE, agent: roleE, sessionID: sesE });
  const tE2 = localStamp();
  const bodyE = (k) => { const f = fpath(projE, k); return fs.existsSync(f) ? fs.readFileSync(f, "utf-8") : null; };
  const mkRetE = (s) => ["feedback", "knowledge", "todo"].map((k) => mkBlock(k, mkEntry(k, s, roleE, sesE, argsE[k]))).join("\n");
  const okFilesE = (s) => ["feedback", "knowledge", "todo"].every((k) => bodyE(k) === mkEntry(k, s, roleE, sesE, argsE[k]));
  chk("(E) multi-param: all three files created with byte-exact entries (minute-boundary-safe)", okFilesE(tE1) || okFilesE(tE2), JSON.stringify(["feedback", "knowledge", "todo"].map((k) => bodyE(k))));
  const okRetE = (s) => retE === mkRetE(s);
  chk("(E) return = the three blocks in feedback/knowledge/todo order (byte-exact)", okRetE(tE1) || okRetE(tE2), `got=${JSON.stringify(retE)}`);
  // explicit: the three entries in the three files carry the SAME stamp
  const stampsE = ["feedback", "knowledge", "todo"].map((k) => (bodyE(k) ?? "").split("\n")[0].split(" ")[1]);
  chk("(E) the three entries share ONE stamp (captured once per call)", stampsE.every((s) => /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/.test(s ?? "")) && new Set(stampsE).size === 1, JSON.stringify(stampsE));

  // ---- (F) never-read preservation: pre-seeded sentinel lines stay
  //      BYTE-EXACT before the appended entry; the other targets (not
  //      provided in the call) are byte-identical — the tool appends, never
  //      reads/rewrites
  const projF = mkproj("F");
  const seedF = (k, line) => { const f = fpath(projF, k); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, line + "\n", "utf-8"); };
  seedF("feedback", "SENTINEL fb — pre-existing content must survive byte-exact.");
  seedF("knowledge", "SENTINEL kn — must stay byte-identical.");
  seedF("todo", "SENTINEL todo — must stay byte-identical.");
  const roleF = "worker-14";
  const sesF = "ses_TEST_73";
  const argsF = { feedback: "friction after pre-seed" };
  const tF1 = localStamp();
  const retF = await t.execute(argsF, { directory: projF, agent: roleF, sessionID: sesF });
  const tF2 = localStamp();
  const fbBody = fs.readFileSync(fpath(projF, "feedback"), "utf-8");
  const okFb = (s) => fbBody === "SENTINEL fb — pre-existing content must survive byte-exact.\n" + mkEntry("feedback", s, roleF, sesF, argsF.feedback);
  chk("(F) pre-seeded sentinel stays byte-exact BEFORE the appended entry (append-only)", okFb(tF1) || okFb(tF2), `got=${JSON.stringify(fbBody)}`);
  chk("(F) the other two targets are byte-identical (untouched)", fs.readFileSync(fpath(projF, "knowledge"), "utf-8") === "SENTINEL kn — must stay byte-identical.\n" && fs.readFileSync(fpath(projF, "todo"), "utf-8") === "SENTINEL todo — must stay byte-identical.\n");
  const okRetF = (s) => retF === mkBlock("feedback", mkEntry("feedback", s, roleF, sesF, argsF.feedback));
  chk("(F) return reflects only the provided param (feedback block only, byte-exact, minute-boundary-safe)", okRetF(tF1) || okRetF(tF2), `got=${JSON.stringify(retF)}`);
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}

finish();
