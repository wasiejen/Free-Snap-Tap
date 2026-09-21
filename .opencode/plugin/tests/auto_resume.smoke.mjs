// auto_resume.smoke.mjs — UNIT 1+2+3 of the auto-resume plugin
// (.opencode/plugin/auto_resume.ts; approved 2026-09-21 auto-resume
// proposal). UNIT 1: skeleton logging plugin + v1 client surface probe.
// UNIT 2: the context-limit compaction trigger — a live session crossing
// 85% of its usable window queues ONE self-compact instruction via
// promptAsync (queued, never synchronous), once per busy cycle.
// UNIT 3: the new-planner spawn helper — a one-shot trigger file in the
// log dir, consumed (renamed .consumed) by the 5s tick after ONE spawn
// attempt (create + queued promptAsync, agent=planner_Q3S_160K, NO model
// field), even on failure.
// UNIT 4: the planner liveness watchdog — a planner-scoped session
// (spawned-map self-mark OR a `<|autonom|>` launch marker in one of its
// user messages) going idle (or session.error) is routed on the next
// tick by the LAST assistant message's action: line: stop / ask → no
// send; resume / no-line → queued CONTINUE prompt (recovery cap 2,
// reset on a fresh busy); restart or cap exhausted → successor check
// (a session.created tracked since lastActivityAt) → skip or
// spawnPlanner (the RESTART prompt).
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
const CANDIDATES = ["prompt", "promptAsync", "abort", "list", "get", "message", "messages", "todo", "command", "summarize", "compact", "create", "app.log"];

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
    messages: function () {},
    todo: function () {},
    command: function () {},
    summarize: function () {},
    create: function () {},
    // NOTE: no `compact` — the v1-generation client surface
  };
  const hooks = await factory({ directory: proj, client: mkClient(v1Session, () => "log") });
  chk("factory returns the event hook (function)", typeof hooks === "object" && typeof hooks.event === "function");
  const l0 = readLines();
  const surf = l0.find((l) => l.includes("surface="));
  chk("init probe logged the surface= line FIRST (one-shot at load)", l0.length >= 1 && surf === l0[0], `n=${l0.length}`);
  chk("surface line carries all twelve candidates incl. create + messages + app.log", surf && CANDIDATES.every((m) => surf.includes(m + "=")), surf ?? "");
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
  // session.status in the LIVE shape (measured 2026-09-21): `status` is
  // an OBJECT `{ type: <s> }`, not a bare string. The STRING-shape
  // acceptance is pinned separately below (dual-shape check).
  const statusEv = (sid, status) => ({ event: { type: "session.status", properties: { sessionID: sid, status: { type: status } } } });
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

  // ---- dual-shape acceptance: a STRING-shape "busy" event (older host
  // shape / mocks) still arms + fires a trigger= line for a >= 0.85
  // session (the LIVE object shape is what statusEv pins above; the
  // idle leg here is sent in the live shape).
  await fire(hooksU2, "ses_u2_str", [
    { event: { type: "session.status", properties: { sessionID: "ses_u2_str", status: "busy" } } },
    msgUpdated("ses_u2_str", "assistant", { total: 80000 }, MODEL),
    statusEv("ses_u2_str", "idle"),
  ]);
  const ok5 = await waitUntil(() => calls.length >= 3 && readLines().some((l) => l.includes("trigger= sid=ses_u2_str")));
  chk("UNIT 2: STRING-shape busy event still arms + fires trigger= for a >= 0.85 session (dual-shape acceptance)",
    ok5 && calls.length === 3 && readLines().some((l) => l.includes("arm= sid=ses_u2_str")), `n=${calls.length}`);

  // ---- fail-safety: a throwing send + a missing provider → no throw,
  // no silent success; send-fail logged (the tick survives)
  const cBeforeFail = calls.length; // baseline before the fail-safe scenarios
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
    calls.length === cBeforeFail && !readLines().some((l) => l.includes("trigger= sid=ses_u2_noprov2")), `n=${calls.length}`);

  // ============================================================
  // UNIT 3 — new-planner spawn helper
  //
  // The factory is re-invoked with a SPYING client: `create` and
  // `promptAsync` record every call (mutable throw flags per scenario).
  // The one-shot trigger file lives in the sandbox logDir (same dir as
  // auto_resume.log). The single 5s tick is the only decision+send
  // funnel — the smoke waits on it (real time).
  // ============================================================
  const triggerFile = path.join(proj, ".opencode", "temp", "auto_resume_spawn_trigger");
  const TRIGGER_TEXT = "UNIT 3 smoke: fresh planner start — resume the loop from the NAP.";

  const createCalls = [];
  const spawnCalls = [];
  let createShouldThrow = false;
  let promptAsyncShouldThrow = false;
  const vSess = {
    prompt: function () {},
    promptAsync: async (args) => {
      if (promptAsyncShouldThrow) throw new Error("queued spawn exploded");
      spawnCalls.push(args);
      return { data: { id: "queued" } };
    },
    abort: function () {},
    list: function () {},
    get: function () {},
    message: function () {},
    todo: function () {},
    command: function () {},
    summarize: function () {},
    create: async () => {
      if (createShouldThrow) throw new Error("create exploded");
      createCalls.push({});
      return { data: { id: "ses_u3_new" } };
    },
  };
  const hooksSpawn = await factory({ directory: proj, client: { session: vSess, provider: { list: providerList }, app: { log: () => "log" } } });
  if (typeof hooksSpawn?.event !== "function") throw new Error("UNIT 3: re-factory did not return the event hook");

  // ---- (1) trigger present (non-empty) → ONE create + ONE queued
  // promptAsync (path.id = the created sid, agent, NO model field,
  // parts[0].text = the trigger content), spawn= line, file renamed
  // to .consumed.
  fs.writeFileSync(triggerFile, TRIGGER_TEXT, "utf-8");
  const okS1 = await waitUntil(() => spawnCalls.length >= 1 && !fs.existsSync(triggerFile));
  const spawnLine = readLines().find((l) => l.includes("spawn= sid=ses_u3_new"));
  chk("UNIT 3: trigger present → ONE create + ONE queued promptAsync (path.id=created sid, agent=planner_Q3S_160K, NO model, parts[0].text=trigger), spawn= line, file renamed .consumed",
    okS1 && createCalls.length === 1 && spawnCalls.length === 1 &&
      spawnCalls[0]?.path?.id === "ses_u3_new" &&
      spawnCalls[0]?.body?.agent === "planner_Q3S_160K" &&
      !("model" in (spawnCalls[0]?.body ?? {})) &&
      Array.isArray(spawnCalls[0]?.body?.parts) && spawnCalls[0].body.parts.length === 1 &&
      spawnCalls[0].body.parts[0].type === "text" && spawnCalls[0].body.parts[0].text === TRIGGER_TEXT &&
      !!spawnLine && spawnLine.includes("agent=planner_Q3S_160K") &&
      fs.existsSync(triggerFile + ".consumed"),
    `create=${createCalls.length} promptAsync=${spawnCalls.length}`);

  // ---- (5) a second tick after consumption → no second spawn (no
  // double-fire: the consumed file never re-fires).
  const cBefore5 = createCalls.length, sBefore5 = spawnCalls.length;
  await sleep(5600); // at least one full tick period after the spawn
  chk("UNIT 3: second tick after consumption → no second spawn (no double-fire)",
    createCalls.length === cBefore5 && spawnCalls.length === sBefore5,
    `create=${createCalls.length} promptAsync=${spawnCalls.length}`);

  // ---- (4) no trigger file → zero create + zero promptAsync calls
  // (regression pin: the trigger is the only spawn entry point).
  chk("UNIT 3: no trigger file → zero create + zero promptAsync calls (regression pin)",
    !fs.existsSync(triggerFile) && createCalls.length === cBefore5 && spawnCalls.length === sBefore5,
    `create=${createCalls.length} promptAsync=${spawnCalls.length}`);

  // ---- (2) create throws → zero promptAsync calls; a spawn-fail= line;
  // the tick/handler survive; the file is consumed EVEN ON FAILURE.
  createShouldThrow = true;
  fs.writeFileSync(triggerFile, TRIGGER_TEXT, "utf-8");
  const cBefore2 = createCalls.length, sBefore2 = spawnCalls.length;
  let threwS2 = false;
  const okS2 = await waitUntil(() => readLines().some((l) => l.includes("spawn-fail= create:")));
  try { await hooksSpawn.event({ event: { type: "session.status", properties: { sessionID: "ses_u3_chk2", status: "idle" } } }); } catch { threwS2 = true; }
  chk("UNIT 3: create throws → zero new promptAsync calls, spawn-fail logged, tick/handler survive, file consumed on failure",
    threwS2 === false && okS2 && createCalls.length === cBefore2 && spawnCalls.length === sBefore2 && !fs.existsSync(triggerFile) && fs.existsSync(triggerFile + ".consumed"),
    `create=${createCalls.length} promptAsync=${spawnCalls.length}`);

  // ---- (3) promptAsync throws → a spawn-fail= line; the tick/handler
  // survive; the file is consumed EVEN ON FAILURE.
  createShouldThrow = false;
  promptAsyncShouldThrow = true;
  fs.writeFileSync(triggerFile, TRIGGER_TEXT, "utf-8");
  const cBefore3 = createCalls.length, sBefore3 = spawnCalls.length;
  let threwS3 = false;
  const okS3 = await waitUntil(() => readLines().some((l) => l.includes("spawn-fail= promptAsync:")));
  try { await hooksSpawn.event({ event: null }); } catch { threwS3 = true; }
  chk("UNIT 3: promptAsync throws → create was called once, spawn-fail logged, tick/handler survive, file consumed on failure",
    threwS3 === false && okS3 && createCalls.length === cBefore3 + 1 && spawnCalls.length === sBefore3 && !fs.existsSync(triggerFile) && fs.existsSync(triggerFile + ".consumed"),
    `create=${createCalls.length} promptAsync=${spawnCalls.length}`);

  // ---- (6) empty trigger → spawn-fail= empty trigger, NO create /
  // promptAsync, file consumed.
  promptAsyncShouldThrow = false;
  const cBefore6 = createCalls.length, sBefore6 = spawnCalls.length;
  fs.writeFileSync(triggerFile, "   \n\t  ", "utf-8"); // whitespace only
  const okS6 = await waitUntil(() => readLines().some((l) => l.includes("spawn-fail= empty trigger")));
  chk("UNIT 3: empty trigger → spawn-fail= empty trigger logged, NO create/promptAsync, file consumed",
    okS6 && createCalls.length === cBefore6 && spawnCalls.length === sBefore6 && !fs.existsSync(triggerFile) && fs.existsSync(triggerFile + ".consumed"),
    `create=${createCalls.length} promptAsync=${spawnCalls.length}`);

  // ---- (7) surface pin updated: `create` is a probed candidate (the v1
  // mock carries it as a function — the live typeof verdict lands in
  // the surface report).
  chk("UNIT 3: surface pin updated — create= in the candidates (v1 mock: create=function)",
    surf && surf.includes("create=function"), surf ?? "");

  // ============================================================
  // UNIT 4 — planner liveness watchdog
  //
  // The factory is re-invoked with a SPYING client: `messages` is
  // scripted PER SID (the SDK list shape Array<{info, parts}>),
  // `create` + `promptAsync` record every call. Scope: a sid is
  // planner-scoped iff it is in the module-level `spawned` map (the
  // UNIT 3 spawn `ses_u3_new` is still self-marked there) OR one of
  // its user messages carries the `<|autonom|>` launch marker. The
  // single 5s tick is the only decision+send funnel — the smoke waits
  // on it (real time). Batch A fires every scenario before one tick
  // pass, so one pass routes them all.
  // ============================================================
  const u4Sends = []; // every promptAsync on this client (CONTINUE + spawn)
  const u4Creates = [];
  const messagesCalls = [];
  const MARK = "<|autonom|>";
  const mkPairs = (entries) => entries.map(([role, text]) => ({ info: { role }, parts: [{ type: "text", text }] }));
  const msgScript = new Map();
  msgScript.set("ses_u4_stop", mkPairs([["user", MARK + " iteration 1"], ["assistant", "Unit closed. action: stop"]]));
  msgScript.set("ses_u4_ask", mkPairs([["user", MARK + " iteration 1"], ["assistant", "Blocked. action: ask_maintainer: which branch?"]]));
  msgScript.set("ses_u4_restart", mkPairs([["user", MARK + " iteration 1"], ["assistant", "Done. action: restart"]]));
  msgScript.set("ses_u4_sux", mkPairs([["user", MARK + " iteration 1"], ["assistant", "Done. action: restart"]]));
  msgScript.set("ses_u4_noline", mkPairs([["user", MARK + " iteration 1"], ["assistant", "Mid-unit, no closing line."]]));
  msgScript.set("ses_u4_plain", mkPairs([["user", "plain direct session, no marker"], ["assistant", "Done. action: stop"]]));
  msgScript.set("ses_u3_new", mkPairs([["user", "plain user message, no marker"], ["assistant", "Working, no closing line."]]));
  msgScript.set("ses_u4_throw", { throw: "messages exploded for ses_u4_throw" });

  const u4Session = {
    prompt: function () {},
    promptAsync: async (args) => { u4Sends.push(args); return { data: { id: "queued" } }; },
    abort: function () {},
    list: function () {},
    get: function () {},
    message: function () {},
    messages: async (args) => {
      messagesCalls.push(args);
      const scripted = msgScript.get(args?.path?.id);
      if (scripted && typeof scripted === "object" && scripted.throw) throw new Error(scripted.throw);
      return scripted ?? [];
    },
    todo: function () {},
    command: function () {},
    summarize: function () {},
    create: async () => { u4Creates.push({}); return { data: { id: "ses_u4_spawn" } }; },
  };
  const hooksU4 = await factory({ directory: proj, client: { session: u4Session, provider: { list: providerList }, app: { log: () => "log" } } });
  chk("UNIT 4: re-factory with the spying client returns the event hook", typeof hooksU4?.event === "function");

  // ---- batch A: every scenario armed (busy → idle) before one tick
  // pass. Order matters only for timestamps: ses_u4_sux's assistant
  // token update stamps its lastActivityAt, and the successor's
  // session.created event lands AFTER it (the successor window).
  // ses_u4_restart / ses_u4_noline carry NO assistant token update →
  // lastActivityAt null → the restart branch's fail-safe side (spawn,
  // even though the successor is tracked in the map).
  await fire(hooksU4, "ses_u4_stop", [statusEv("ses_u4_stop", "busy"), statusEv("ses_u4_stop", "idle")]);
  await fire(hooksU4, "ses_u4_ask", [statusEv("ses_u4_ask", "busy"), statusEv("ses_u4_ask", "idle")]);
  await fire(hooksU4, "ses_u4_restart", [statusEv("ses_u4_restart", "busy"), statusEv("ses_u4_restart", "idle")]);
  await fire(hooksU4, "ses_u4_sux", [
    statusEv("ses_u4_sux", "busy"),
    msgUpdated("ses_u4_sux", "assistant", { total: 100 }),
    statusEv("ses_u4_sux", "idle"),
  ]);
  await hooksU4.event({ event: { type: "session.created", properties: { sessionID: "ses_u4_succ" } } });
  await fire(hooksU4, "ses_u4_noline", [statusEv("ses_u4_noline", "busy"), statusEv("ses_u4_noline", "idle")]);
  await fire(hooksU4, "ses_u4_plain", [statusEv("ses_u4_plain", "busy"), statusEv("ses_u4_plain", "idle")]);
  await fire(hooksU4, "ses_u4_throw", [statusEv("ses_u4_throw", "busy"), statusEv("ses_u4_throw", "idle")]);
  await fire(hooksU4, "ses_u3_new", [statusEv("ses_u3_new", "busy"), statusEv("ses_u3_new", "idle")]);

  const nolineCont = (n) => readLines().some((l) => l.includes(`recovery= sid=ses_u4_noline attempt=${n}`));
  const okA = await waitUntil(
    () =>
      readLines().some((l) => l.includes("route= stop sid=ses_u4_stop")) &&
      readLines().some((l) => l.includes("route= ask sid=ses_u4_ask")) &&
      readLines().some((l) => l.includes("route= restart spawn sid=ses_u4_restart")) &&
      readLines().some((l) => l.includes("skip= successor sid=ses_u4_succ")) &&
      nolineCont(1) &&
      readLines().some((l) => l.includes("recovery= sid=ses_u3_new attempt=1")) &&
      readLines().some((l) => l.includes("err= sid=ses_u4_throw")),
    12000,
  );
  const contSends = () => u4Sends.filter((c) => !(c.body && c.body.agent)).map((c) => c.path?.id);
  const spawnSends = () => u4Sends.filter((c) => c.body?.agent === "planner_Q3S_160K");
  chk("UNIT 4: batch-A scenarios all routed (stop / ask / restart / skip / continue / spawned-scope / err lines present)", okA, okA ? "" : "missing line(s)");
  chk("UNIT 4: action: stop → NO send, route= stop logged", okA && !u4Sends.some((c) => c.path?.id === "ses_u4_stop"), "");
  chk("UNIT 4: action: ask_maintainer → NO send, route= ask logged", okA && !u4Sends.some((c) => c.path?.id === "ses_u4_ask"), "");
  chk("UNIT 4: action: restart without a successor → spawnPlanner (ONE create, agent start prompt, route= restart spawn logged)",
    okA && u4Creates.length === 1 && spawnSends().length === 1 &&
      spawnSends()[0]?.path?.id === "ses_u4_spawn" &&
      (spawnSends()[0]?.body?.parts?.[0]?.text ?? "").startsWith(MARK) &&
      (spawnSends()[0]?.body?.parts?.[0]?.text ?? "").includes("loop_log.md") &&
      (spawnSends()[0]?.body?.parts?.[0]?.text ?? "").includes("auto-resume unit 4 restart branch"),
    `create=${u4Creates.length} spawns=${spawnSends().length}`);
  chk("UNIT 4: action: restart WITH a tracked successor (session.created since lastActivityAt) → skip, no second spawn",
    okA && u4Creates.length === 1 && !u4Sends.some((c) => c.path?.id === "ses_u4_sux"), "");
  chk("UNIT 4: no action: line → CONTINUE attempt 1 (queued, locked text names the post-compaction head)",
    okA && contSends().includes("ses_u4_noline") &&
      ((u4Sends.find((c) => c.path?.id === "ses_u4_noline")?.body?.parts?.[0]?.text) ?? "").includes("agent_readme_post_compaction.md"), "");
  chk("UNIT 4: non-scoped (no marker, not spawned) → zero sends, no route/recovery line (scope=none after ONE fetch)",
    okA && !u4Sends.some((c) => c.path?.id === "ses_u4_plain") &&
      messagesCalls.filter((c) => c?.path?.id === "ses_u4_plain").length === 1 &&
      !readLines().some((l) => l.includes("sid=ses_u4_plain") && (l.includes("route=") || l.includes("recovery="))), "");
  chk("UNIT 4: spawned-map scope (UNIT 3 self-mark, user msg carries NO marker) → routes as planner, CONTINUE attempt 1",
    okA && contSends().includes("ses_u3_new") && readLines().some((l) => l.includes("recovery= sid=ses_u3_new attempt=1")), "");
  chk("UNIT 4: messages() throwing → err= line with the error, no action, no throw",
    okA && !u4Sends.some((c) => c.path?.id === "ses_u4_throw") &&
      readLines().some((l) => l.includes("err= sid=ses_u4_throw") && l.includes("messages exploded for ses_u4_throw")), "");

  // ---- batch B: a SECOND idle (no fresh busy) → the budget accumulates
  // across idles → CONTINUE attempt 2.
  const sBeforeB = u4Sends.length;
  await fire(hooksU4, "ses_u4_noline", [statusEv("ses_u4_noline", "idle")]);
  const okB = await waitUntil(() => u4Sends.length === sBeforeB + 1 && nolineCont(2), 12000);
  chk("UNIT 4: second idle (no fresh busy) → CONTINUE attempt 2", okB && u4Sends.length === sBeforeB + 1, `n=${u4Sends.length}`);

  // ---- batch C: a THIRD idle with the cap exhausted (2 CONTINUEs,
  // still no line) → the restart branch → spawn (lastActivityAt null →
  // fail-safe spawn even though the successor is tracked).
  const sBeforeC = u4Sends.length, cBeforeC = u4Creates.length;
  await fire(hooksU4, "ses_u4_noline", [statusEv("ses_u4_noline", "idle")]);
  const okC = await waitUntil(
    () => u4Creates.length === cBeforeC + 1 && readLines().some((l) => l.includes("route= restart spawn sid=ses_u4_noline")),
    12000,
  );
  chk("UNIT 4: third idle, cap exhausted with still no line → restart branch → spawn", okC && u4Creates.length === cBeforeC + 1, `create=${u4Creates.length}`);
  chk("UNIT 4: send totals — 3 CONTINUE (noline ×2, u3_new ×1) + 2 RESTART spawns, nothing else touched",
    u4Sends.length === 5 && contSends().length === 3 && spawnSends().length === 2 &&
      contSends().every((s) => s === "ses_u4_noline" || s === "ses_u3_new") && u4Creates.length === 2,
    `total=${u4Sends.length} create=${u4Creates.length}`);

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
  const smokeSids = ["ses_smoke_ar1", "ses_throwing", "ses_u2_sat", "ses_u2_low", "ses_u2_over", "ses_u2_nomodel", "ses_u2_noprov", "ses_u2_sendfail", "ses_u2_noprov2", "ses_u2_str", "ses_u3_new", "ses_u3_chk2", "ses_u4_stop", "ses_u4_ask", "ses_u4_restart", "ses_u4_sux", "ses_u4_succ", "ses_u4_noline", "ses_u4_plain", "ses_u4_throw", "ses_u4_spawn"];
  chk("LIVE .opencode/temp/auto_resume.log received no smoke line (sandbox got every smoke line)",
    liveBefore === liveSizeNow || !smokeSids.some((s) => appended.includes(s)), `before=${liveBefore} after=${liveSizeNow}`);
  chk("sandbox log path is under the sandbox", sandboxLog.startsWith(base), sandboxLog);
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}

finish();
