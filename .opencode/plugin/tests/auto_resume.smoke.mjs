// auto_resume.smoke.mjs — UNIT 1 skeleton logging plugin + v1 client
// surface probe (.opencode/plugin/auto_resume.ts; approved 2026-09-21
// auto-resume proposal). The plugin factory is called with a SCRATCHPAD
// sandbox `directory` — auto_resume.log lands in the sandbox
// (.opencode/temp/auto_resume.log under the sandbox project), NEVER the
// live .opencode/temp/. Run: node .opencode/plugin/tests/auto_resume.smoke.mjs
// (plain node, exit 0 iff green).
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, loadRepo, freshSandbox, makeChecker } from "./_smoke_base.mjs";

const base = freshSandbox("auto_resume");
const { chk, finish } = makeChecker("AUTO_RESUME_SMOKE");

const LIVE_LOG = path.join(REPO_ROOT, ".opencode", "temp", "auto_resume.log");
// live log state before the smoke (it may or may not exist yet; it must be
// UNCHANGED by this smoke — the sandbox dir receives the lines)
const liveBefore = fs.existsSync(LIVE_LOG) ? fs.statSync(LIVE_LOG).size : null;

const proj = path.join(base, "proj");
fs.mkdirSync(proj, { recursive: true });
const sandboxLog = path.join(proj, ".opencode", "temp", "auto_resume.log");

const mod = await loadRepo(".opencode/plugin/auto_resume.ts");
const factory = mod.default;

const readLines = () =>
  fs.existsSync(sandboxLog) ? fs.readFileSync(sandboxLog, "utf-8").split(/\r?\n/).filter((l) => l.length > 0) : [];

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z /;
const CANDIDATES = ["prompt", "promptAsync", "abort", "list", "get", "message", "todo", "command", "summarize", "compact", "app.log"];

// A minimal mock client; app.log present only when a fn is passed.
const mkClient = (session, appLog) => ({
  session,
  app: appLog === undefined ? {} : { log: appLog },
});

try {
  // ---- shape checks
  chk("default export is an async function (plugin factory)", typeof factory === "function" && factory.constructor.name === "AsyncFunction");
  chk("plugin module exports the default factory ONLY (host loader contract)",
    Object.keys(mod).length === 1 && Object.values(mod).every((v) => typeof v === "function"), JSON.stringify(Object.keys(mod)));

  // ---- factory + one-shot init probe (mocked v1-generation client:
  // summarize is a function, compact is absent, app.log is a function)
  const v1Session = {
    prompt: function () {},
    promptAsync: function () {},
    abort: function () {},
    list: function () {},
    get: function () {},
    message: function () {},
    todo: function () {},
    command: function () {},
    summarize: function () {},
    // NOTE: no `compact` — the v1-generation client surface
  };
  const hooks = await factory({ directory: proj, client: mkClient(v1Session, () => "log") });
  chk("factory returns the event hook (function)", typeof hooks === "object" && typeof hooks.event === "function");
  const l0 = readLines();
  const surf = l0.find((l) => l.includes("surface="));
  chk("init probe logged the surface= line FIRST (one-shot at load)", l0.length >= 1 && surf === l0[0], `n=${l0.length}`);
  chk("surface line carries all ten candidates + app.log", surf && CANDIDATES.every((m) => surf.includes(m + "=")), surf ?? "");
  chk("probe verdicts by typeof (v1 client: summarize=function, compact=undefined, app.log=function)",
    surf && surf.includes("summarize=function") && surf.includes("compact=undefined") && surf.includes("app.log=function"), surf ?? "");

  // ---- event logging: one line per event, type + sid + key fields
  const n1 = readLines().length;
  await hooks.event({ event: { type: "session.status", properties: { sessionID: "ses_smoke_ar1", status: "idle" } } });
  const l1 = readLines();
  const ev = l1.find((l) => l.includes("event=session.status"));
  chk("session.status event → exactly ONE line with type + sid + status", l1.length === n1 + 1 && !!ev && ev.includes("sid=ses_smoke_ar1") && ev.includes("status=idle"), ev ?? `n=${l1.length}`);
  chk("log line carries an ISO timestamp prefix", !!ev && ISO_RE.test(ev), ev ?? "");

  const n2 = readLines().length;
  await hooks.event({ event: { type: "message.updated", properties: { sessionID: "ses_smoke_ar1", message: { tokens: { input: 10, output: 2 } } } } });
  const l2 = readLines();
  const ev2 = l2.find((l) => l.includes("event=message.updated"));
  chk("message.updated event → line with sid + tokens", l2.length === n2 + 1 && !!ev2 && ev2.includes("sid=ses_smoke_ar1") && ev2.includes('tokens={"input":10,"output":2}'), ev2 ?? `n=${l2.length}`);

  // ---- robustness: degenerate event inputs never throw (swallow
  // discipline) and log nothing bogus
  const n3 = readLines().length;
  await hooks.event({});
  await hooks.event({ event: null });
  await hooks.event({ event: {} });
  await hooks.event({ event: { type: 123 } });
  chk("degenerate event inputs never throw and log nothing", readLines().length === n3, `n=${readLines().length}`);

  // ---- throwing mock client: factory load + handler survive
  const throwingClient = new Proxy({}, { get: () => { throw new Error("boom"); } });
  let threw = false;
  let hooks2 = null;
  try { hooks2 = await factory({ directory: proj, client: throwingClient }); } catch { threw = true; }
  chk("throwing client does not crash factory load (probe swallowed)", threw === false && typeof hooks2?.event === "function");
  threw = false;
  try {
    await hooks2.event({ event: { type: "session.status", properties: { sessionID: "ses_throwing", status: "idle" } } });
  } catch {
    threw = true;
  }
  chk("handler never throws", threw === false);

  // ---- the live log is untouched (the sandbox received every line)
  const liveAfter = fs.existsSync(LIVE_LOG) ? fs.statSync(LIVE_LOG).size : null;
  chk("LIVE .opencode/temp/auto_resume.log untouched by the smoke", liveAfter === liveBefore, `before=${liveBefore} after=${liveAfter}`);
  chk("sandbox log path is under the sandbox", sandboxLog.startsWith(base), sandboxLog);
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}

finish();
