// auto_resume.smoke.mjs — UNIT 1+2 of the auto-resume plugin
// (.opencode/plugin/auto_resume.ts; approved 2026-09-21 auto-resume
// proposal). UNIT 1: skeleton logging plugin + v1 client surface probe.
// UNIT 2: the context-limit compaction trigger — a live session crossing
// 85% of its usable window queues ONE self-compact instruction via
// promptAsync (queued, never synchronous), once per busy cycle.
// The plugin factory is called with a SCRATCHPAD sandbox `directory` —
// auto_resume.log lands in the sandbox (.opencode/temp/auto_resume.log
// under the sandbox project), NEVER the live .opencode/temp/. Run:
// node .opencode/plugin/tests/auto_resume.smoke.mjs (plain node, exit 0
// iff green).
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

// Unit 2 helpers: the tick fires every 5s — poll up to 8s for a condition.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitUntil = async (cond, ms = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (cond()) return true;
    await sleep(200);
  }
  return !!cond();
};

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

  // ============================================================
  // UNIT 2 — context-limit compaction trigger
  //
  // The factory is re-invoked with a SPYING client: promptAsync records
  // every call; the provider mock supplies limit data in the LIVE SDK
  // shape (res.data.all[] → models[modelID].limit.{context,output}; the
  // installed SDK names the method `list`). usable = 100000 -
  // min(20000, 16000) = 84000; threshold 0.85 → fire at >= 71400.
  // The single 5s tick is the only decision+send funnel — the smoke
  // waits on it (real time; the timer is unref'd).
  // ============================================================
  const CONTEXT = 100000, OUTPUT = 16000;
  const USABLE = CONTEXT - Math.min(20000, OUTPUT); // 84000
  const RATIO_HI = (80000 / USABLE).toFixed(3); // 0.952

  const calls = [];
  const v2Session = {
    prompt: function () {},
    promptAsync: async (args) => { calls.push(args); return { data: { id: "queued" } }; },
    abort: function () {},
    list: function () {},
    get: function () {},
    message: function () {},
    todo: function () {},
    command: function () {},
    summarize: function () {},
  };
  const providerList = async () => ({
    data: {
      all: [{ id: "prov_x", name: "Prov X", models: { model_x: { id: "model_x", limit: { context: CONTEXT, output: OUTPUT } } } }],
      default: {},
      connected: ["prov_x"],
    },
    error: undefined,
  });
  const hooksU2 = await factory({ directory: proj, client: { session: v2Session, provider: { list: providerList }, app: { log: () => "log" } } });
  chk("UNIT 2: re-factory with the spying client returns the event hook", typeof hooksU2?.event === "function");

  const MODEL = { providerID: "prov_x", modelID: "model_x" };
  // Assistant-message event in the LIVE shape (role + top-level
  // providerID/modelID + tokens; sessionID on properties).
  const msgUpdated = (sid, role, tokens, model) => ({
    event: {
      type: "message.updated",
      properties: {
        sessionID: sid,
        message: { role, ...(tokens ? { tokens } : {}), ...(model ? { providerID: model.providerID, modelID: model.modelID } : {}) },
      },
    },
  });
  const statusEv = (sid, status) => ({ event: { type: "session.status", properties: { sessionID: sid, status } } });
  const fire = async (h, sid, evs) => { for (const e of evs) await h.event(e); };

  // Arm every scenario session: busy → assistant token update(s) → idle
  await fire(hooksU2, "ses_u2_sat", [statusEv("ses_u2_sat", "busy"), msgUpdated("ses_u2_sat", "assistant", { total: 80000 }, MODEL), statusEv("ses_u2_sat", "idle")]);
  await fire(hooksU2, "ses_u2_low", [
    statusEv("ses_u2_low", "busy"),
    msgUpdated("ses_u2_low", "assistant", { total: 50000 }, MODEL),
    statusEv("ses_u2_low", "idle"),
    // a user-role update must NOT overwrite lastTokenTotal
    msgUpdated("ses_u2_low", "user", { total: 1000000 }),
  ]);
  await fire(hooksU2, "ses_u2_over", [
    statusEv("ses_u2_over", "busy"),
    msgUpdated("ses_u2_over", "assistant", { total: 80000 }, MODEL),
    msgUpdated("ses_u2_over", "assistant", { total: 40000 }), // OVERWRITTEN — not accumulated
    statusEv("ses_u2_over", "idle"),
  ]);
  await fire(hooksU2, "ses_u2_nomodel", [statusEv("ses_u2_nomodel", "busy"), msgUpdated("ses_u2_nomodel", "assistant", { total: 80000 }), statusEv("ses_u2_nomodel", "idle")]);
  await fire(hooksU2, "ses_u2_noprov", [statusEv("ses_u2_noprov", "busy"), msgUpdated("ses_u2_noprov", "assistant", { total: 80000 }, { providerID: "prov_x", modelID: "model_missing" }), statusEv("ses_u2_noprov", "idle")]);

  // ---- tick 1: exactly ONE send, the saturated session
  const ok1 = await waitUntil(() => calls.length >= 1);
  chk("UNIT 2: idle at ratio >= 0.85 → exactly ONE promptAsync call", ok1 && calls.length === 1, `n=${calls.length}`);
  const c0 = calls[0] ?? {};
  chk("UNIT 2: send targets the saturated session (path.id)", c0.path?.id === "ses_u2_sat", JSON.stringify(c0.path ?? null));
  const text0 = c0.body?.parts?.[0]?.text ?? "";
  chk("UNIT 2: queued text names the measured ratio", text0.includes(RATIO_HI), text0.slice(0, 120));
  chk("UNIT 2: queued text instructs the compact_memory SELF path (no sessionID)",
    /compact_memory/.test(text0) && /NO sessionID/i.test(text0) && /SELF path/i.test(text0), text0.slice(0, 120));
  chk("UNIT 2: body has exactly ONE text part, no noReply",
    Array.isArray(c0.body?.parts) && c0.body.parts.length === 1 && c0.body.parts[0].type === "text" && !("noReply" in (c0.body ?? {})),
    JSON.stringify(Object.keys(c0.body ?? {})));
  chk("UNIT 2: trigger= log line present for the send (with the ratio)", readLines().some((l) => l.includes(`trigger= sid=ses_u2_sat`) && l.includes(RATIO_HI)), "");
  const sentSids = calls.map((c) => c.path?.id);
  chk("UNIT 2: sub-threshold session (ratio < 0.85) → zero promptAsync calls", !sentSids.includes("ses_u2_low"), JSON.stringify(sentSids));
  chk("UNIT 2: user-role update did not arm a send (not the saturation input)", !sentSids.includes("ses_u2_low"), JSON.stringify(sentSids));
  chk("UNIT 2: lastTokenTotal OVERWRITTEN (80000 then 40000 → below threshold → no send)", !sentSids.includes("ses_u2_over"), JSON.stringify(sentSids));
  chk("UNIT 2: no model info → usable null → no send", !sentSids.includes("ses_u2_nomodel"), JSON.stringify(sentSids));
  chk("UNIT 2: provider data missing (model not listed) → usable null → no send", !sentSids.includes("ses_u2_noprov"), JSON.stringify(sentSids));

  // ---- tick 2: a second idle in the SAME busy cycle → no second send
  await sleep(5600); // at least one full tick period after tick 1
  chk("UNIT 2: second idle in the same busy cycle → no second send", calls.length === 1, `n=${calls.length}`);

  // ---- fresh busy cycle → budget reset → sends again
  await fire(hooksU2, "ses_u2_sat", [statusEv("ses_u2_sat", "busy"), statusEv("ses_u2_sat", "idle")]);
  const ok3 = await waitUntil(() => calls.length >= 2);
  chk("UNIT 2: fresh busy → idle at ratio >= 0.85 → sends again (budget reset)", ok3 && calls.length === 2, `n=${calls.length}`);
  chk("UNIT 2: second send is the same session with the same ratio text",
    calls[1]?.path?.id === "ses_u2_sat" && ((calls[1]?.body?.parts?.[0]?.text ?? "")).includes(RATIO_HI), "");

  // ---- fail-safety: a throwing send + a missing provider → no throw,
  // no silent success; send-fail logged (the tick survives)
  const v3Session = {
    prompt: function () {},
    promptAsync: async () => { throw new Error("queued send exploded"); },
    abort: function () {},
    list: function () {},
    get: function () {},
    message: function () {},
    todo: function () {},
    command: function () {},
    summarize: function () {},
  };
  const hooksU3 = await factory({ directory: proj, client: { session: v3Session, provider: { list: providerList }, app: {} } });
  await fire(hooksU3, "ses_u2_sendfail", [statusEv("ses_u2_sendfail", "busy"), msgUpdated("ses_u2_sendfail", "assistant", { total: 80000 }, MODEL), statusEv("ses_u2_sendfail", "idle")]);
  await fire(hooksU3, "ses_u2_noprov2", [statusEv("ses_u2_noprov2", "busy"), msgUpdated("ses_u2_noprov2", "assistant", { total: 80000 }, { providerID: "prov_missing", modelID: "model_x" }), statusEv("ses_u2_noprov2", "idle")]);
  let threw3 = false;
  const ok4 = await waitUntil(() => readLines().some((l) => l.includes("send-fail= sid=ses_u2_sendfail")));
  chk("UNIT 2: promptAsync throw → send-fail logged, tick/handler survive", threw3 === false && ok4, ok4 ? "" : "no send-fail line");
  chk("UNIT 2: send-fail line carries the error message", readLines().some((l) => l.includes("send-fail= sid=ses_u2_sendfail") && l.includes("queued send exploded")), "");
  chk("UNIT 2: missing provider data → usable null → no send, no trigger line, count unchanged",
    calls.length === 2 && !readLines().some((l) => l.includes("trigger= sid=ses_u2_noprov2")), `n=${calls.length}`);

  // ---- the live log received NO smoke line. The LIVE plugin instance
  // (this host) keeps appending ITS OWN live-session lines in real time
  // while the smoke runs, so the live size may legitimately grow — the
  // invariant is that no SMOKE session line ever lands in it (the
  // sandbox received every smoke line).
  const liveSizeNow = fs.existsSync(LIVE_LOG) ? fs.statSync(LIVE_LOG).size : 0;
  let appended = "";
  if (liveBefore !== null && liveSizeNow > liveBefore) {
    const buf = Buffer.alloc(liveSizeNow - liveBefore);
    const fd = fs.openSync(LIVE_LOG, "r");
    try { fs.readSync(fd, buf, 0, buf.length, liveBefore); } finally { fs.closeSync(fd); }
    appended = buf.toString("utf-8");
  } else if (liveBefore === null && liveSizeNow > 0) {
    appended = fs.readFileSync(LIVE_LOG, "utf-8"); // did not exist before — all new
  }
  const smokeSids = ["ses_smoke_ar1", "ses_throwing", "ses_u2_sat", "ses_u2_low", "ses_u2_over", "ses_u2_nomodel", "ses_u2_noprov", "ses_u2_sendfail", "ses_u2_noprov2"];
  chk("LIVE .opencode/temp/auto_resume.log received no smoke line (sandbox got every smoke line)",
    liveBefore === liveSizeNow || !smokeSids.some((s) => appended.includes(s)), `before=${liveBefore} after=${liveSizeNow}`);
  chk("sandbox log path is under the sandbox", sandboxLog.startsWith(base), sandboxLog);
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}

finish();
