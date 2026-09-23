// auto_resume.smoke.mjs — UNIT 1+2+3 of the auto-resume plugin
// (.opencode/plugin/auto_resume.ts; approved 2026-09-21 auto-resume
// proposal). UNIT 1: skeleton logging plugin + v1 client surface probe.
// UNIT 2: the context-limit compaction trigger — a live session crossing
// its saturation threshold (configurable per tick, default 0.95 of the
// usable window) queues ONE self-compact instruction via promptAsync
// (queued, never synchronous), once per busy cycle.
// UNIT 3: the new-planner spawn helper — a one-shot trigger file in the
// log dir, consumed (renamed .consumed) by the 5s tick after ONE spawn
// attempt (create + queued promptAsync; #85 part 2: NO agent/model for
// the file-trigger spawn — no source session → host default; the Unit
// 4 successor spawn carries the SOURCE session's current agent+model),
// even on failure.
// UNIT 4: the liveness watchdog — an in-scope session going idle (or
// session.error) is routed on the next tick by the LAST assistant
// message's action: line: stop / ask → no send; resume / no-line →
// queued CONTINUE prompt (recovery cap 2, reset on a fresh busy; #85
// part 2: a FAILED send dead-marks the idle cycle — remaining retries
// + the fallback spawn are skipped, cleared on a fresh busy);
// restart or cap exhausted → successor check (a session.created
// tracked since lastActivityAt) → skip or spawnPlanner (the RESTART
// prompt). #85 part 2 (current agent+modelID): the injected bodies
// carry the session's CURRENT agent+model — the last assistant's
// info, the opencode.jsonc agent-config fallback, host default (never
// a planner constant). SCOPE (#85 part 1 — the #82 generalized scope): in-scope
// iff the session's working agent (the FIRST user message's agent
// field) is a planner agent (`planner_<model>`), OR the LAST OWN-LINE
// toggle in the user history is ON (`<|autonom|>` / `<|Autorun|>`,
// case-insensitive; OFF = `<|Direct|>`; last-toggle-wins, re-evaluated
// per idle) — ANY agent type; self-spawned sids (the module-level
// `spawned` self-mark) are NEVER scoped (the #85 loop fix).
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
  // #80: the surface= line carries the v= code version identifier
  // (8-char sha256 prefix of the running source) — the next incident
  // pins WHICH source the logging process actually ran.
  chk("surface line carries the v= code version identifier (8-char sha256 prefix)", surf && /\bv=[0-9a-f]{8}\b/.test(surf), surf ?? "");

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
   // installed SDK names the method `list`). Default config (no budget
   // file — fail-open): usable = 100000 - min(20000, 16000) = 84000;
   // threshold 0.95 → fire at >= 79800.
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
  chk("UNIT 2: idle at ratio >= 0.95 (default) → exactly ONE promptAsync call", ok1 && calls.length === 1, `n=${calls.length}`);
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
  chk("UNIT 2: sub-threshold session (ratio < 0.95 default) → zero promptAsync calls", !sentSids.includes("ses_u2_low"), JSON.stringify(sentSids));
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
  chk("UNIT 2: fresh busy → idle at ratio >= 0.95 (default) → sends again (budget reset)", ok3 && calls.length === 2, `n=${calls.length}`);
  chk("UNIT 2: second send is the same session with the same ratio text",
    calls[1]?.path?.id === "ses_u2_sat" && ((calls[1]?.body?.parts?.[0]?.text ?? "")).includes(RATIO_HI), "");

  // ---- dual-shape acceptance: a STRING-shape "busy" event (older host
  // shape / mocks) still arms + fires a trigger= line for a >= 0.95
  // (default) session (the LIVE object shape is what statusEv pins
  // above; the idle leg here is sent in the live shape).
  await fire(hooksU2, "ses_u2_str", [
    { event: { type: "session.status", properties: { sessionID: "ses_u2_str", status: "busy" } } },
    msgUpdated("ses_u2_str", "assistant", { total: 80000 }, MODEL),
    statusEv("ses_u2_str", "idle"),
  ]);
  const ok5 = await waitUntil(() => calls.length >= 3 && readLines().some((l) => l.includes("trigger= sid=ses_u2_str")));
  chk("UNIT 2: STRING-shape busy event still arms + fires trigger= for a >= 0.95 (default) session (dual-shape acceptance)",
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

  // ---- autoCompact toggle (maintainer priority #1): an OPTIONAL
  // top-level `autoCompact` key in `.opencode/temp/compact_budget.json`
  // (the sandbox's budget file — NEVER the live one) gates the default
  // 0.95 trigger: absent/true → status quo; false → suppressed with a
  // `skip= autoCompact-off` line and the attempts budget NOT consumed;
  // missing/unreadable/malformed file → fail OPEN (status quo).
  // A FRESH spying client — the fail-safety section above re-factored
  // with the throwing v3Session, so the module-level client is NOT the
  // v2 spy anymore.
  const tCalls = [];
  const vTSession = {
    prompt: function () {},
    promptAsync: async (args) => { tCalls.push(args); return { data: { id: "queued" } }; },
    abort: function () {},
    list: function () {},
    get: function () {},
    message: function () {},
    todo: function () {},
    command: function () {},
    summarize: function () {},
  };
  const hooksUT = await factory({ directory: proj, client: { session: vTSession, provider: { list: providerList }, app: { log: () => "log" } } });
  const budgetFile = path.join(proj, ".opencode", "temp", "compact_budget.json");
  const writeBudget = (content) => fs.writeFileSync(budgetFile, content, "utf-8");

  // case 1: NO budget file + ratio >= 0.95 (default) → trigger fires
  // (explicit
  // status-quo regression — the file is absent in the sandbox)
  fs.rmSync(budgetFile, { force: true });
  const nNoFile = tCalls.length;
  await fire(hooksUT, "ses_u2_tgnof", [statusEv("ses_u2_tgnof", "busy"), msgUpdated("ses_u2_tgnof", "assistant", { total: 80000 }, MODEL), statusEv("ses_u2_tgnof", "idle")]);
  const okNoFile = await waitUntil(() => tCalls.length >= nNoFile + 1);
  chk("UNIT 2: autoCompact — NO budget file (key absent) → trigger fires (status quo)",
    okNoFile && tCalls.length === nNoFile + 1 && tCalls[tCalls.length - 1]?.path?.id === "ses_u2_tgnof", `n=${tCalls.length}`);
  chk("UNIT 2: autoCompact — NO budget file → trigger= log line for the send",
    readLines().some((l) => l.includes("trigger= sid=ses_u2_tgnof") && l.includes(RATIO_HI)), "");

  // case 2: autoCompact:false + ratio >= 0.95 (default) → ZERO sends,
  // the skip
  // line present (ratio still observable), the attempts budget NOT
  // consumed (a second idle in the same cycle is skipped again, and a
  // flip back ON sends from the retained budget)
  writeBudget(JSON.stringify({ autoCompact: false }));
  const nOff = tCalls.length;
  await fire(hooksUT, "ses_u2_tgoff", [statusEv("ses_u2_tgoff", "busy"), msgUpdated("ses_u2_tgoff", "assistant", { total: 80000 }, MODEL), statusEv("ses_u2_tgoff", "idle")]);
  await sleep(5600); // at least one full tick period with the toggle OFF
  chk("UNIT 2: autoCompact:false + ratio >= 0.95 (default) → ZERO promptAsync calls", tCalls.length === nOff, `n=${tCalls.length}`);
  chk("UNIT 2: autoCompact:false → skip= autoCompact-off line present (ratio still observable)",
    readLines().some((l) => l.includes("skip= autoCompact-off sid=ses_u2_tgoff") && l.includes(RATIO_HI)), "");
  await fire(hooksUT, "ses_u2_tgoff", [statusEv("ses_u2_tgoff", "idle")]); // second idle, same busy cycle
  await sleep(5600);
  chk("UNIT 2: autoCompact:false — second idle in the same cycle also skipped (attempts budget NOT consumed)",
    tCalls.length === nOff, `n=${tCalls.length}`);
  fs.rmSync(budgetFile, { force: true }); // flip back ON (key absent)
  await fire(hooksUT, "ses_u2_tgoff", [statusEv("ses_u2_tgoff", "idle")]);
  const okOn = await waitUntil(() => tCalls.length >= nOff + 1);
  chk("UNIT 2: toggle flipped back ON → the retained budget sends (once-per-cycle holds)",
    okOn && tCalls.length === nOff + 1 && tCalls[tCalls.length - 1]?.path?.id === "ses_u2_tgoff", `n=${tCalls.length}`);

  // case 3: autoCompact:true + ratio >= 0.95 (default) → trigger fires
  // (explicit ON)
  writeBudget(JSON.stringify({ autoCompact: true }));
  const nOn = tCalls.length;
  await fire(hooksUT, "ses_u2_tgon", [statusEv("ses_u2_tgon", "busy"), msgUpdated("ses_u2_tgon", "assistant", { total: 80000 }, MODEL), statusEv("ses_u2_tgon", "idle")]);
  const okOn2 = await waitUntil(() => tCalls.length >= nOn + 1);
  chk("UNIT 2: autoCompact:true + ratio >= 0.95 (default) → trigger fires",
    okOn2 && tCalls.length === nOn + 1 && tCalls[tCalls.length - 1]?.path?.id === "ses_u2_tgon", `n=${tCalls.length}`);
  chk("UNIT 2: autoCompact:true → trigger= log line for the send",
    readLines().some((l) => l.includes("trigger= sid=ses_u2_tgon") && l.includes(RATIO_HI)), "");

  // case 4: MALFORMED budget file content + ratio >= 0.95 (default) →
  // fail OPEN
  // (trigger fires — the status quo)
  writeBudget("{ this is not valid json !!!");
  const nMal = tCalls.length;
  await fire(hooksUT, "ses_u2_tgmal", [statusEv("ses_u2_tgmal", "busy"), msgUpdated("ses_u2_tgmal", "assistant", { total: 80000 }, MODEL), statusEv("ses_u2_tgmal", "idle")]);
  const okMal = await waitUntil(() => tCalls.length >= nMal + 1);
  chk("UNIT 2: autoCompact — MALFORMED file → fail OPEN, trigger fires",
    okMal && tCalls.length === nMal + 1 && tCalls[tCalls.length - 1]?.path?.id === "ses_u2_tgmal", `n=${tCalls.length}`);
  fs.rmSync(budgetFile, { force: true }); // leave the sandbox clean

  // ============================================================
  // UNIT 2 (cont.) — configurable threshold + output reserve
  // (maintainer ruling 2026-09-22: "only trigger it past the 95% line")
  // Optional top-level keys in the SANDBOX budget file — read per tick,
  // fail-open (absent / unparseable / out-of-range → the defaults
  // 0.95 / 20000). Reuses hooksUT + tCalls (same spying client). Node-
  // computed expectations: usable (default reserve) = 84000:
  // 80000/84000 = 0.952 (fires), 79000/84000 = 0.940 (no fire — WOULD
  // fire at the old 0.85 default); 55000/84000 = 0.655 (fires at 0.60,
  // no fire at 0.95); 40000/84000 = 0.476 (no fire even at 0.60).
  // Usable (reserve 0) = 100000: 96000/100000 = 0.960 (fires),
  // 82000/100000 = 0.820 (no fire — whereas 82000/84000 = 0.976 WOULD
  // fire at the default reserve).
  // ============================================================

  // case (a): NO config → fail-open defaults 0.95 / 20000 — both
  // sessions evaluated on ONE tick: 79000 (0.940) below, 80000 (0.952)
  // above.
  fs.rmSync(budgetFile, { force: true });
  const nCfgA = tCalls.length;
  await fire(hooksUT, "ses_u2_cfa_low", [statusEv("ses_u2_cfa_low", "busy"), msgUpdated("ses_u2_cfa_low", "assistant", { total: 79000 }, MODEL), statusEv("ses_u2_cfa_low", "idle")]);
  await fire(hooksUT, "ses_u2_cfa_hi", [statusEv("ses_u2_cfa_hi", "busy"), msgUpdated("ses_u2_cfa_hi", "assistant", { total: 80000 }, MODEL), statusEv("ses_u2_cfa_hi", "idle")]);
  const okCfgA = await waitUntil(() => tCalls.length >= nCfgA + 1);
  const sentA = tCalls.slice(nCfgA).map((c) => c.path?.id);
  chk("UNIT 2 config: no config → fail-open 0.95/20000 — 80000 (0.952) fires exactly once",
    okCfgA && tCalls.length === nCfgA + 1 && sentA.includes("ses_u2_cfa_hi"), `n=${tCalls.length}`);
  chk("UNIT 2 config: no config — 79000 (0.940 < 0.95 default) does NOT fire (would at the old 0.85)",
    !sentA.includes("ses_u2_cfa_low"), JSON.stringify(sentA));
  chk("UNIT 2 config: no config — saturation= line carries the ratio at the default usable",
    readLines().some((l) => l.includes("saturation= sid=ses_u2_cfa_low") && l.includes("0.940")), "");

  // case (b): per-tick LIVE EDIT — ses_u2_cfb_edit armed at 55000
  // (0.655) while NO config (below the 0.95 default) → one tick of
  // silence; then saturationThreshold 0.60 is written → the NEXT tick
  // fires it (read per tick — no restart needed).
  const nCfgB0 = tCalls.length;
  await fire(hooksUT, "ses_u2_cfb_edit", [statusEv("ses_u2_cfb_edit", "busy"), msgUpdated("ses_u2_cfb_edit", "assistant", { total: 55000 }, MODEL), statusEv("ses_u2_cfb_edit", "idle")]);
  await sleep(5600); // one full tick under the 0.95 default
  chk("UNIT 2 config: live edit — armed at 0.655 while no config → one tick of silence (0.95 default)",
    tCalls.length === nCfgB0, `n=${tCalls.length}`);
  writeBudget(JSON.stringify({ saturationThreshold: 0.60 }));
  const nCfgB = tCalls.length;
  const okCfgB = await waitUntil(() => tCalls.length >= nCfgB + 1);
  // The next tick re-evaluates EVERY armed+idle watch at the new
  // threshold: ses_u2_cfb_edit (0.655) fires AND the lingering
  // ses_u2_cfa_low from case (a) (0.940, never sent — attempts still 0)
  // now crosses 0.60 too (watch insertion order → cfa_low first,
  // cfb_edit last).
  const sentB = tCalls.slice(nCfgB).map((c) => c.path?.id);
  chk("UNIT 2 config: LIVE EDIT saturationThreshold 0.60 → the armed 0.655 session fires on the NEXT tick (the lingering 0.940 session crosses too)",
    okCfgB && tCalls.length === nCfgB + 2 && tCalls[tCalls.length - 1]?.path?.id === "ses_u2_cfb_edit" && sentB.includes("ses_u2_cfa_low"), `n=${tCalls.length}`);
  chk("UNIT 2 config: live-edit send text names ratio 0.655",
    ((tCalls[tCalls.length - 1]?.body?.parts?.[0]?.text ?? "")).includes("0.655"), "");

  // case (b, cont.): threshold 0.60 in force — 55000 (0.655) fires,
  // 40000 (0.476) does NOT (both on the same tick).
  const nCfgB2 = tCalls.length;
  await fire(hooksUT, "ses_u2_cfb_fire", [statusEv("ses_u2_cfb_fire", "busy"), msgUpdated("ses_u2_cfb_fire", "assistant", { total: 55000 }, MODEL), statusEv("ses_u2_cfb_fire", "idle")]);
  await fire(hooksUT, "ses_u2_cfb_no", [statusEv("ses_u2_cfb_no", "busy"), msgUpdated("ses_u2_cfb_no", "assistant", { total: 40000 }, MODEL), statusEv("ses_u2_cfb_no", "idle")]);
  const okCfgB2 = await waitUntil(() => tCalls.length >= nCfgB2 + 1);
  const sentB2 = tCalls.slice(nCfgB2).map((c) => c.path?.id);
  chk("UNIT 2 config: saturationThreshold 0.60 → 55000 (0.655) fires",
    okCfgB2 && tCalls.length === nCfgB2 + 1 && sentB2.includes("ses_u2_cfb_fire"), `n=${tCalls.length}`);
  chk("UNIT 2 config: saturationThreshold 0.60 → 40000 (0.476) does NOT fire", !sentB2.includes("ses_u2_cfb_no"), JSON.stringify(sentB2));

  // case (c): outputReserve 0 → usable = 100000 - min(0, 16000) = 100000:
  // 96000 (0.960) fires with usable 100000 in the text; 82000 (0.820)
  // does NOT — whereas 82000/84000 = 0.976 WOULD fire at the default
  // reserve (both on the same tick).
  writeBudget(JSON.stringify({ outputReserve: 0 }));
  const nCfgC = tCalls.length;
  await fire(hooksUT, "ses_u2_cfc_fire", [statusEv("ses_u2_cfc_fire", "busy"), msgUpdated("ses_u2_cfc_fire", "assistant", { total: 96000 }, MODEL), statusEv("ses_u2_cfc_fire", "idle")]);
  await fire(hooksUT, "ses_u2_cfc_no", [statusEv("ses_u2_cfc_no", "busy"), msgUpdated("ses_u2_cfc_no", "assistant", { total: 82000 }, MODEL), statusEv("ses_u2_cfc_no", "idle")]);
  const okCfgC = await waitUntil(() => tCalls.length >= nCfgC + 1);
  const sentC = tCalls.slice(nCfgC).map((c) => c.path?.id);
  chk("UNIT 2 config: outputReserve 0 → usable 100000 — 96000 (0.960) fires",
    okCfgC && tCalls.length === nCfgC + 1 && sentC.includes("ses_u2_cfc_fire"), `n=${tCalls.length}`);
  chk("UNIT 2 config: outputReserve 0 — send text names the usable window (96000 of 100000)",
    ((tCalls[tCalls.length - 1]?.body?.parts?.[0]?.text ?? "")).includes("96000 of 100000"), "");
  chk("UNIT 2 config: outputReserve 0 — 82000 (0.820) does NOT fire (0.976 at the default reserve WOULD)",
    !sentC.includes("ses_u2_cfc_no"), JSON.stringify(sentC));

  // case (d): OUT-OF-RANGE values → fail-open defaults: saturationThreshold
  // "high" (not a number) + outputReserve -5 (negative) are both ignored
  // → 79000 (0.940) no fire, 80000 (0.952) fires at usable 84000 (same
  // tick).
  writeBudget(JSON.stringify({ saturationThreshold: "high", outputReserve: -5 }));
  const nCfgD = tCalls.length;
  await fire(hooksUT, "ses_u2_cfd_low", [statusEv("ses_u2_cfd_low", "busy"), msgUpdated("ses_u2_cfd_low", "assistant", { total: 79000 }, MODEL), statusEv("ses_u2_cfd_low", "idle")]);
  await fire(hooksUT, "ses_u2_cfd_hi", [statusEv("ses_u2_cfd_hi", "busy"), msgUpdated("ses_u2_cfd_hi", "assistant", { total: 80000 }, MODEL), statusEv("ses_u2_cfd_hi", "idle")]);
  const okCfgD = await waitUntil(() => tCalls.length >= nCfgD + 1);
  // The fail-open defaults re-arm the default 0.95/20000 math: the
  // lingering ses_u2_cfc_no from case (c) (82000 — 0.820 under reserve 0,
  // but 0.976 at the default reserve 84000) fires again, alongside
  // ses_u2_cfd_hi (insertion order → cfc_no first, cfd_hi last).
  const sentD = tCalls.slice(nCfgD).map((c) => c.path?.id);
  chk("UNIT 2 config: out-of-range values (string threshold, negative reserve) → fail-open defaults — 80000 fires at usable 84000 (the lingering 0.976-at-default session crosses too)",
    okCfgD && tCalls.length === nCfgD + 2 && tCalls[tCalls.length - 1]?.path?.id === "ses_u2_cfd_hi" && sentD.includes("ses_u2_cfc_no") && ((tCalls[tCalls.length - 1]?.body?.parts?.[0]?.text ?? "")).includes("80000 of 84000"), `n=${tCalls.length}`);
  chk("UNIT 2 config: out-of-range values → 79000 (0.940 < 0.95 default) does NOT fire",
    !sentD.includes("ses_u2_cfd_low"), JSON.stringify(sentD));
   fs.rmSync(budgetFile, { force: true }); // leave the sandbox clean

   // #85 part 2: the sandbox opencode.jsonc — the JSONC fallback
   // target (comments + trailing commas on purpose: the plugin's
   // parser must handle both). Written BEFORE the first fallback read
   // (the batch-A CONTINUE) so the module-level cache picks up THIS
   // agents map. NEVER the live opencode.jsonc — the sandbox project
   // dir only.
   const sandboxJsonc = path.join(proj, "opencode.jsonc");
   fs.writeFileSync(
     sandboxJsonc,
     '{\n  // sandbox test config for the #85 part 2 fallback lookup\n  "agent": {\n    "worker_fb_test": { "model": "prov_x/model_x", }\n  },\n}\n',
     "utf-8",
   );

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
   // promptAsync (path.id = the created sid, NO agent, NO model —
   // #85 part 2: a file-trigger spawn has no source session → the
   // host default applies, parts[0].text = the trigger content),
   // spawn= line, file renamed to .consumed.
   fs.writeFileSync(triggerFile, TRIGGER_TEXT, "utf-8");
   const okS1 = await waitUntil(() => spawnCalls.length >= 1 && !fs.existsSync(triggerFile));
   const spawnLine = readLines().find((l) => l.includes("spawn= sid=ses_u3_new"));
   chk("UNIT 3: trigger present → ONE create + ONE queued promptAsync (path.id=created sid, NO agent, NO model — host default for a file-trigger spawn, parts[0].text=trigger), spawn= line, file renamed .consumed",
     okS1 && createCalls.length === 1 && spawnCalls.length === 1 &&
       spawnCalls[0]?.path?.id === "ses_u3_new" &&
       !("agent" in (spawnCalls[0]?.body ?? {})) &&
       !("model" in (spawnCalls[0]?.body ?? {})) &&
       Array.isArray(spawnCalls[0]?.body?.parts) && spawnCalls[0].body.parts.length === 1 &&
       spawnCalls[0].body.parts[0].type === "text" && spawnCalls[0].body.parts[0].text === TRIGGER_TEXT &&
       !!spawnLine && !spawnLine.includes("agent=") && !spawnLine.includes("model=") &&
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
   // UNIT 4 — liveness watchdog (#85 part 1: the #82 generalized scope)
   //
   // The factory is re-invoked with a SPYING client: `messages` is
   // scripted PER SID (the SDK list shape Array<{info, parts}>),
   // `create` + `promptAsync` record every call. Scope: a sid is
   // in-scope iff its working agent (the first user message's agent
   // field) is a planner agent OR its last own-line toggle is ON;
   // self-spawned sids are NEVER scoped — the UNIT 3 spawn
   // `ses_u3_new` is still self-marked in the module-level `spawned`
   // map, so it now falls OUT of scope (the #85 loop fix). The single
   // 5s tick is the only decision+send funnel — the smoke waits on it
   // (real time). Batch A fires every scenario before one tick pass,
   // so one pass routes them all.
   // ============================================================
   const u4Sends = []; // every promptAsync on this client (CONTINUE + spawn)
   const u4Creates = [];
   const messagesCalls = [];
   const MARK = "<|autonom|>";
   const PLANNER_A = "planner_Q3S_160K";
   const WORKER_A = "worker_Q3S_160K";
   const PB_A = "prompt_builder_Q3S_160K";
   // `agent` sets the FIRST user message's agent field (the session's
   // working agent — scope rule (a) reads it).
   const mkPairs = (entries, agent) =>
     entries.map(([role, text]) => ({ info: role === "user" && agent ? { role, agent } : { role }, parts: [{ type: "text", text }] }));
   const msgScript = new Map();
   // The batch-A planner scenarios carry the planner agent field (the
   // FIRST user message's `agent` — the scope rule (a)); the old
   // launch-marker text is NO LONGER a scope source (it is not an
   // own-line toggle — #82).
   msgScript.set("ses_u4_stop", mkPairs([["user", MARK + " iteration 1"], ["assistant", "Unit closed. action: stop"]], PLANNER_A));
   msgScript.set("ses_u4_ask", mkPairs([["user", MARK + " iteration 1"], ["assistant", "Blocked. action: ask_maintainer: which branch?"]], PLANNER_A));
   msgScript.set("ses_u4_restart", mkPairs([["user", MARK + " iteration 1"], ["assistant", "Done. action: restart"]], PLANNER_A));
   msgScript.set("ses_u4_sux", mkPairs([["user", MARK + " iteration 1"], ["assistant", "Done. action: restart"]], PLANNER_A));
   msgScript.set("ses_u4_noline", mkPairs([["user", MARK + " iteration 1"], ["assistant", "Mid-unit, no closing line."]], PLANNER_A));
   msgScript.set("ses_u4_plain", mkPairs([["user", "plain direct session, no marker"], ["assistant", "Done. action: stop"]]));
   // wrapper shape (the in-process client's RequestResult { data: [...] }):
   // the plugin must unwrap it — without the unwrap, scope=none, no route line
   msgScript.set("ses_u4_wrap", { data: mkPairs([["user", MARK + " iteration 1"], ["assistant", "Unit closed. action: stop"]], PLANNER_A) });
   // A real spawned session's first user message is the planner start
   // prompt (agent = the spawn agent) — faithful script; the `spawned`
   // self-mark still keeps it OUT of scope (#85).
   msgScript.set("ses_u3_new", mkPairs([["user", "plain user message, no marker"], ["assistant", "Working, no closing line."]], PLANNER_A));
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
  await fire(hooksU4, "ses_u4_wrap", [statusEv("ses_u4_wrap", "busy"), statusEv("ses_u4_wrap", "idle")]);
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
      readLines().some((l) => l.includes("scope= none sid=ses_u3_new")) &&
      readLines().some((l) => l.includes("err= sid=ses_u4_throw")) &&
      readLines().some((l) => l.includes("route= stop sid=ses_u4_wrap")),
    12000,
  );
  // #80: CONTINUE sends now carry agent=planner (scoped sessions) —
  // classify by the locked text, not by an absent agent field.
  const contSends = () =>
    u4Sends.filter((c) => ((c.body?.parts?.[0]?.text ?? "")).includes("agent_readme_post_compaction.md")).map((c) => c.path?.id);
  const spawnSends = () =>
    u4Sends.filter((c) => ((c.body?.parts?.[0]?.text ?? "")).startsWith(MARK) && c.body?.agent === "planner_Q3S_160K");
  chk("UNIT 4: batch-A scenarios all routed (stop / ask / restart / skip / continue / spawned-scope / err lines present)", okA, okA ? "" : "missing line(s)");
  chk("UNIT 4: action: stop → NO send, route= stop logged", okA && !u4Sends.some((c) => c.path?.id === "ses_u4_stop"), "");
  chk("UNIT 4: wrapper shape { data: [...] } (in-process RequestResult) → unwrapped, action: stop → route= stop, NO send",
    okA && !u4Sends.some((c) => c.path?.id === "ses_u4_wrap"), "");
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
  chk("UNIT 4: non-scoped (no marker, not spawned) → zero sends, no route/recovery line (scope= none logged after ONE fetch)",
    okA && !u4Sends.some((c) => c.path?.id === "ses_u4_plain") &&
      messagesCalls.filter((c) => c?.path?.id === "ses_u4_plain").length === 1 &&
      readLines().some((l) => l.includes("scope= none sid=ses_u4_plain")) &&
      !readLines().some((l) => l.includes("sid=ses_u4_plain") && (l.includes("route=") || l.includes("recovery="))), "");
  chk("UNIT 4 #85: spawned session (UNIT 3 self-mark, planner agent in its first user msg) is OUT of scope — scope= none, zero sends, no recovery/route line",
    okA && readLines().some((l) => l.includes("scope= none sid=ses_u3_new")) &&
      !u4Sends.some((c) => c.path?.id === "ses_u3_new") &&
      !readLines().some((l) => l.includes("sid=ses_u3_new") && (l.includes("route=") || l.includes("recovery="))), "");
  chk("UNIT 4: messages() throwing → err= line with the error, no action, no throw",
    okA && !u4Sends.some((c) => c.path?.id === "ses_u4_throw") &&
      readLines().some((l) => l.includes("err= sid=ses_u4_throw") && l.includes("messages exploded for ses_u4_throw")), "");
  // #80: every batch-A CONTINUE send carries the EXPLICIT planner agent
  // (planner-scoped sessions always run as the planner agent).
  chk("UNIT 4 #80: batch-A continue sends carry agent=planner_Q3S_160K (explicit)",
    okA && contSends().length === 1 &&
      u4Sends.filter((c) => ((c.body?.parts?.[0]?.text ?? "")).includes("agent_readme_post_compaction.md"))
        .every((c) => c.body?.agent === "planner_Q3S_160K"),
    `contSends=${contSends().join(",")}`);

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
  chk("UNIT 4: send totals — 2 CONTINUE (noline ×2) + 2 RESTART spawns, nothing else touched (spawned ses_u3_new stays OUT of scope)",
    u4Sends.length === 4 && contSends().length === 2 && spawnSends().length === 2 &&
      contSends().every((s) => s === "ses_u4_noline") && u4Creates.length === 2,
    `total=${u4Sends.length} create=${u4Creates.length}`);

  // ============================================================
  // #80 — recovery cap semantics (on the u4 client, still active):
  // a busy that consumes a still-pending CONTINUE injection (within
  // the TTL) is the injected turn itself — it must NOT reset the
  // recovery cap (that reset is what made the cap unreachable while
  // the plugin keeps injecting); only a REAL new busy resets it.
   // ses_u4_cap: user msg carries the planner agent field (scoped), the
   // last assistant line has NO action: line (always the CONTINUE
   // branch until the cap exhausts).
   // ============================================================
   msgScript.set("ses_u4_cap", mkPairs([["user", MARK + " iteration 1"], ["assistant", "Mid-unit, no closing line."]], PLANNER_A));
  const capRecovery = (n) => readLines().filter((l) => l.includes(`recovery= sid=ses_u4_cap attempt=${n}`)).length;
  const capInjected = () => readLines().filter((l) => l.includes("arm= sid=ses_u4_cap injected")).length;

  // step 1: real busy → CONTINUE attempt 1 (the injection is marked pending)
  await fire(hooksU4, "ses_u4_cap", [statusEv("ses_u4_cap", "busy"), statusEv("ses_u4_cap", "idle")]);
  const okCap1 = await waitUntil(() => capRecovery(1) === 1, 12000);
  chk("UNIT 4 #80: real busy → CONTINUE attempt 1 (pending injection marked)", okCap1 && capRecovery(1) === 1, `n=${capRecovery(1)}`);

  // step 2: the injected busy (consumes the pending mark — NO cap
  // reset) → attempt 2
  await fire(hooksU4, "ses_u4_cap", [statusEv("ses_u4_cap", "busy"), statusEv("ses_u4_cap", "idle")]);
  const okCap2 = await waitUntil(() => capRecovery(2) === 1, 12000);
  chk("UNIT 4 #80: injected busy (pending mark consumed) → NO cap reset → CONTINUE attempt 2",
    okCap2 && capInjected() === 1 && capRecovery(2) === 1,
    `armInjected=${capInjected()} n2=${capRecovery(2)}`);

  // step 3: a second injected busy → cap exhausted (2 CONTINUEs,
  // still no line) → restart branch → spawn (no attempt 3)
  await fire(hooksU4, "ses_u4_cap", [statusEv("ses_u4_cap", "busy"), statusEv("ses_u4_cap", "idle")]);
  const cBeforeCap3 = u4Creates.length;
  const okCap3 = await waitUntil(
    () => readLines().some((l) => l.includes("route= restart spawn sid=ses_u4_cap")) && u4Creates.length === cBeforeCap3 + 1,
    12000,
  );
  chk("UNIT 4 #80: second injected busy → cap exhausted (no attempt 3) → restart branch → spawn",
    okCap3 && capRecovery(3) === 0 && u4Creates.length === cBeforeCap3 + 1,
    `n3=${capRecovery(3)} create=${u4Creates.length}`);

  // step 4: a REAL busy (no pending mark) resets the cap → attempt 1
  // is re-issued
  await fire(hooksU4, "ses_u4_cap", [statusEv("ses_u4_cap", "busy"), statusEv("ses_u4_cap", "idle")]);
  const okCap4 = await waitUntil(() => capRecovery(1) === 2, 12000);
  chk("UNIT 4 #80: real busy (no pending mark) → cap reset → CONTINUE attempt 1 re-issued",
    okCap4 && capRecovery(1) === 2, `n1=${capRecovery(1)}`);
  chk("UNIT 4 #80: exactly the two injected busies were consumed (arm= ... injected ×2)",
    capInjected() === 2, `armInjected=${capInjected()}`);

  // ============================================================
   // #80 — agent retention in the injected promptAsync bodies (the
   // factory is re-invoked with a fresh spying client — promptAsync +
   // messages both spied, messages scripted per sid):
   //  - a spawned (OUT-of-scope, #85) session whose first user
   //    message carries the planner agent → the unit-2 body keeps that
   //    agent via the first-user-agent retention (NOT via the scope —
   //    scope is none for self-spawned sids);
   //  - a NON-scoped session whose first user message carries an
   //    agent field → body.agent = that agent (the session keeps the
   //    agent that ran it);
   //  - a NON-scoped session with NO user agent field → NO agent key
   //    in the body + an agent-omit= attribution line.
   // ============================================================
   msgScript.set("ses_u3_new", mkPairs([["user", "plain direct"], ["assistant", "Done. action: stop"]], PLANNER_A));
  msgScript.set("ses_u2_agnet", [
    { info: { role: "user", agent: "worker_Q3S_160K" }, parts: [{ type: "text", text: "plain" }] },
    { info: { role: "assistant" }, parts: [{ type: "text", text: "Done. action: stop" }] },
  ]);
  msgScript.set("ses_u2_agnone", [
    { info: { role: "user" }, parts: [{ type: "text", text: "plain" }] },
    { info: { role: "assistant" }, parts: [{ type: "text", text: "Done. action: stop" }] },
  ]);
  const u2agCalls = [];
  const u2agSession = {
    prompt: function () {},
    promptAsync: async (args) => { u2agCalls.push(args); return { data: { id: "queued" } }; },
    abort: function () {},
    list: function () {},
    get: function () {},
    message: function () {},
    messages: async (args) => msgScript.get(args?.path?.id) ?? [],
    todo: function () {},
    command: function () {},
    summarize: function () {},
    create: async () => ({ data: { id: "ses_u2ag_spawn" } }),
  };
  const hooksU2ag = await factory({ directory: proj, client: { session: u2agSession, provider: { list: providerList }, app: { log: () => "log" } } });
  chk("UNIT 2 #80: re-factory with the agent-retention spying client returns the event hook", typeof hooksU2ag?.event === "function");

   // Every scenario: busy → saturated assistant update → idle. The
   // tick's unit-2 loop sends the self-compact (agent resolved); then
   // the unit-4 loop routes: ses_u3_new (spawned → OUT of scope, #85)
   // → scope= none, no route line; ses_u2_agnet / ses_u2_agnone (no
   // marker, no toggle) → scope= none, no action.
  await fire(hooksU2ag, "ses_u3_new", [statusEv("ses_u3_new", "busy"), msgUpdated("ses_u3_new", "assistant", { total: 80000 }, MODEL), statusEv("ses_u3_new", "idle")]);
  await fire(hooksU2ag, "ses_u2_agnet", [statusEv("ses_u2_agnet", "busy"), msgUpdated("ses_u2_agnet", "assistant", { total: 80000 }, MODEL), statusEv("ses_u2_agnet", "idle")]);
  await fire(hooksU2ag, "ses_u2_agnone", [statusEv("ses_u2_agnone", "busy"), msgUpdated("ses_u2_agnone", "assistant", { total: 80000 }, MODEL), statusEv("ses_u2_agnone", "idle")]);
  const okAg = await waitUntil(() => u2agCalls.length === 3, 12000);
  chk("UNIT 2 #80: each saturated session got exactly ONE self-compact send (no extras)", okAg && u2agCalls.length === 3, `n=${u2agCalls.length}`);
  const sendFor = (sid) => u2agCalls.find((c) => c.path?.id === sid);
  chk("UNIT 2 #80: spawned (OUT-of-scope, #85) session → the unit-2 body keeps the session's agent (planner_Q3S_160K, first-user-agent retention — NOT the scope) + the ratio text",
    okAg && sendFor("ses_u3_new")?.body?.agent === "planner_Q3S_160K" &&
      ((sendFor("ses_u3_new")?.body?.parts?.[0]?.text) ?? "").includes(RATIO_HI),
    JSON.stringify(sendFor("ses_u3_new")?.body ?? null));
  chk("UNIT 2 #80: non-scoped session with a first-user agent → body carries that agent (worker_Q3S_160K)",
    okAg && sendFor("ses_u2_agnet")?.body?.agent === "worker_Q3S_160K",
    JSON.stringify(sendFor("ses_u2_agnet")?.body?.agent ?? null));
  chk("UNIT 2 #80: non-scoped session with NO user agent → NO agent key in the body + agent-omit= line",
    okAg && sendFor("ses_u2_agnone") && !("agent" in (sendFor("ses_u2_agnone")?.body ?? {})) &&
      readLines().some((l) => l.includes("agent-omit= sid=ses_u2_agnone")),
    JSON.stringify(Object.keys(sendFor("ses_u2_agnone")?.body ?? {})));
  chk("UNIT 2 #80: unit-4 after the sends — ses_u3_new scope= none (spawned → OUT of scope, #85; no route line); the two plain sids scope= none; no extra sends",
    okAg && readLines().some((l) => l.includes("scope= none sid=ses_u3_new")) &&
      !readLines().some((l) => l.includes("sid=ses_u3_new") && (l.includes("route=") || l.includes("recovery="))) &&
      readLines().some((l) => l.includes("scope= none sid=ses_u2_agnet")) &&
      readLines().some((l) => l.includes("scope= none sid=ses_u2_agnone")) &&
      u2agCalls.length === 3,
    `n=${u2agCalls.length}`);

  // ============================================================
  // UNIT 4 #85 part 1 — the #82 generalized scope (one scenario per
  // tick wait). The module-level client is whatever the LAST factory
  // call set (the u2ag client above) — re-factor with the u4 spying
  // client so this section's sends land in u4Sends (the events and
  // watch state are module-level; this restores the send destination).
  // ============================================================
  const hooksU4b = await factory({ directory: proj, client: { session: u4Session, provider: { list: providerList }, app: { log: () => "log" } } });
  chk("UNIT 4 #85: re-factory with the u4 spying client returns the event hook", typeof hooksU4b?.event === "function");

  // (1) an unmarked WORKER session → OUT of scope, and NOT
  // re-triggered on the next tick (the #85 loop: the old code scoped a
  // freshly-spawned session as a planner and re-triggered the spawn
  // every 2nd recovery attempt).
  msgScript.set("ses_u4_worker", mkPairs([["user", "plain worker task"], ["assistant", "Mid-unit, no closing line."]], WORKER_A));
  await fire(hooksU4b, "ses_u4_worker", [statusEv("ses_u4_worker", "busy"), statusEv("ses_u4_worker", "idle")]);
  const okW1 = await waitUntil(() => readLines().some((l) => l.includes("scope= none sid=ses_u4_worker")));
  const wBefore = u4Sends.length, cBeforeW = u4Creates.length;
  // a SECOND idle cycle (fresh busy) — the tick where the old code
  // re-triggered the spawn
  await fire(hooksU4b, "ses_u4_worker", [statusEv("ses_u4_worker", "busy"), statusEv("ses_u4_worker", "idle")]);
  await sleep(5600); // at least one full tick period
  chk("UNIT 4 #85: unmarked worker session OUT of scope — scope= none, zero sends",
    okW1 && !u4Sends.some((c) => c.path?.id === "ses_u4_worker"), `n=${u4Sends.length}`);
  chk("UNIT 4 #85: unmarked worker session NOT re-triggered on the next tick (no recovery/route/spawn — the #85 loop is gone)",
    u4Sends.length === wBefore && u4Creates.length === cBeforeW &&
      !readLines().some((l) => l.includes("sid=ses_u4_worker") && (l.includes("route=") || l.includes("recovery=") || l.includes("spawn="))),
    `n=${u4Sends.length} create=${u4Creates.length}`);

  // (2) a WORKER session toggled ON (own-line `<|Autonom|>`) → IN
  // scope (autorun) — CONTINUE carries the session's OWN agent
  msgScript.set("ses_u4_worker_on", mkPairs([["user", "plain worker task"], ["user", "  <|Autonom|>  "], ["assistant", "Mid-unit, no closing line."]], WORKER_A));
  await fire(hooksU4b, "ses_u4_worker_on", [statusEv("ses_u4_worker_on", "busy"), statusEv("ses_u4_worker_on", "idle")]);
  const okWo = await waitUntil(() => readLines().some((l) => l.includes("recovery= sid=ses_u4_worker_on attempt=1")));
  chk("UNIT 4 #82: worker session + own-line <Autonom|> toggle → IN scope (autorun) — CONTINUE attempt 1",
    okWo && readLines().some((l) => l.includes("scope= autorun sid=ses_u4_worker_on")), "");
  chk("UNIT 4 #82: autorun-scoped CONTINUE body carries the session's OWN agent (worker_Q3S_160K), not the planner",
    okWo && u4Sends.some((c) => c.path?.id === "ses_u4_worker_on" && c.body?.agent === WORKER_A && ((c.body?.parts?.[0]?.text) ?? "").includes("agent_readme_post_compaction.md")),
    JSON.stringify(u4Sends.find((c) => c.path?.id === "ses_u4_worker_on")?.body ?? null));

  // (3) a NON-planner agent (prompt_builder-style) toggled ON → IN
  // scope (the planner-only gate is dropped — ANY agent type runs in a
  // loop when toggled)
  msgScript.set("ses_u4_pb", mkPairs([["user", "plain prompt-builder task"], ["user", "<|Autonom|>"], ["assistant", "Mid-unit, no closing line."]], PB_A));
  await fire(hooksU4b, "ses_u4_pb", [statusEv("ses_u4_pb", "busy"), statusEv("ses_u4_pb", "idle")]);
  const okPb = await waitUntil(() => readLines().some((l) => l.includes("recovery= sid=ses_u4_pb attempt=1")));
  chk("UNIT 4 #82: non-planner agent (prompt_builder-style) + own-line <Autonom|> → IN scope — CONTINUE attempt 1, body carries its own agent",
    okPb && readLines().some((l) => l.includes("scope= autorun sid=ses_u4_pb")) &&
      u4Sends.some((c) => c.path?.id === "ses_u4_pb" && c.body?.agent === PB_A),
    JSON.stringify(u4Sends.find((c) => c.path?.id === "ses_u4_pb")?.body ?? null));

  // (4) last-toggle-wins: own-line <Autonom|> then a LATER own-line
  // <Direct|> → OFF (deactivated mid-session — his stated motivation)
  msgScript.set("ses_u4_lastoff", mkPairs([["user", "task"], ["user", "<|Autonom|>"], ["user", "<|Direct|>"], ["assistant", "Mid-unit, no closing line."]], WORKER_A));
  await fire(hooksU4b, "ses_u4_lastoff", [statusEv("ses_u4_lastoff", "busy"), statusEv("ses_u4_lastoff", "idle")]);
  const loBefore = u4Sends.length;
  const okLo = await waitUntil(() => readLines().some((l) => l.includes("scope= none sid=ses_u4_lastoff")));
  await sleep(5600); // at least one full tick period
  chk("UNIT 4 #82: last-toggle-wins — own-line <Autonom|> then own-line <Direct|> → OFF (scope= none, no sends, no re-trigger)",
    okLo && u4Sends.length === loBefore &&
      !readLines().some((l) => l.includes("sid=ses_u4_lastoff") && (l.includes("route=") || l.includes("recovery="))),
    `n=${u4Sends.length}`);

  // (5) a MID-SENTENCE quote (case-variant, not whole-line) is NOT a
  // toggle — scope stays OUT
  msgScript.set("ses_u4_mid", mkPairs([["user", "please see <Autonom|> in the docs, thanks"], ["assistant", "Mid-unit, no closing line."]], WORKER_A));
  await fire(hooksU4b, "ses_u4_mid", [statusEv("ses_u4_mid", "busy"), statusEv("ses_u4_mid", "idle")]);
  const midBefore = u4Sends.length;
  const okMid = await waitUntil(() => readLines().some((l) => l.includes("scope= none sid=ses_u4_mid")));
  await sleep(5600); // at least one full tick period
  chk("UNIT 4 #82: mid-sentence quote (case-variant, not whole-line) is NOT a toggle — scope= none, no sends, no re-trigger",
    okMid && u4Sends.length === midBefore &&
      !readLines().some((l) => l.includes("sid=ses_u4_mid") && (l.includes("route=") || l.includes("recovery="))),
     `n=${u4Sends.length}`);

   // ============================================================
   // #85 part 2 — the CURRENT session agent+modelID in the injected
   // bodies (the root-cause fix) + the DEAD-MARK on a failed send.
   // The factory is re-invoked with a fresh spying client:
   // promptAsync + messages spied (messages scripted per sid from the
   // shared msgScript), a per-sid throw flag (the dead-mark scenario),
   // create recorded (the no-fallback-spawn pin).
   // ============================================================
   const p2Sends = [];
   const p2Creates = [];
   const p2ThrowSids = new Set();
   const p2Session = {
     prompt: function () {},
     promptAsync: async (args) => {
       if (p2ThrowSids.has(args?.path?.id)) throw new Error("send exploded");
       p2Sends.push(args);
       return { data: { id: "queued" } };
     },
     abort: function () {},
     list: function () {},
     get: function () {},
     message: function () {},
     messages: async (args) => msgScript.get(args?.path?.id) ?? [],
     todo: function () {},
     command: function () {},
     summarize: function () {},
     create: async () => { p2Creates.push({}); return { data: { id: "ses_p2_spawn" } }; },
   };
   const hooksP2 = await factory({ directory: proj, client: { session: p2Session, provider: { list: providerList }, app: { log: () => "log" } } });
   chk("#85 part 2: re-factory with the spying client returns the event hook", typeof hooksP2?.event === "function");

   // (a1) CONTINUE: planner-scoped (first user agent PLANNER_A) but the
   // LAST assistant message carries a DIFFERENT agent+model (a
   // mid-session switch) — the injected body must carry THAT current
   // pair, not a planner constant.
   msgScript.set("ses_p2_cur", [
     { info: { role: "user", agent: PLANNER_A }, parts: [{ type: "text", text: MARK + " iteration 1" }] },
     { info: { role: "assistant", agent: WORKER_A, model: MODEL }, parts: [{ type: "text", text: "Mid-unit, no closing line." }] },
   ]);
   // (a2) SPAWN: planner-scoped, action: restart, the last assistant
   // carries the switched agent+model — the successor keeps them.
   msgScript.set("ses_p2_rs", [
     { info: { role: "user", agent: PLANNER_A }, parts: [{ type: "text", text: MARK + " iteration 1" }] },
     { info: { role: "assistant", agent: WORKER_A, model: MODEL }, parts: [{ type: "text", text: "Done. action: restart" }] },
   ]);
   // (a3) JSONC fallback: the last assistant carries NO agent+model →
   // the working agent (first user) + its CONFIGURED model from the
   // sandbox opencode.jsonc (the parser: comments + trailing commas).
   msgScript.set("ses_p2_fb", [
     { info: { role: "user", agent: "worker_fb_test" }, parts: [{ type: "text", text: "plain task" }] },
     { info: { role: "user" }, parts: [{ type: "text", text: MARK }] },
     { info: { role: "assistant" }, parts: [{ type: "text", text: "Mid-unit, no closing line." }] },
   ]);
   // (b-d) dead-mark: planner-scoped, no closing line; the CONTINUE
   // send THROWS (a dead model — the session never goes busy).
   msgScript.set("ses_p2_dm", mkPairs([["user", MARK + " iteration 1"], ["assistant", "Mid-unit, no closing line."]], PLANNER_A));
   p2ThrowSids.add("ses_p2_dm");

   // All four scenarios armed before one tick pass (the single 5s tick
   // is the only decision+send funnel — the smoke waits on it).
   await fire(hooksP2, "ses_p2_cur", [statusEv("ses_p2_cur", "busy"), statusEv("ses_p2_cur", "idle")]);
   await fire(hooksP2, "ses_p2_rs", [statusEv("ses_p2_rs", "busy"), statusEv("ses_p2_rs", "idle")]);
   await fire(hooksP2, "ses_p2_fb", [statusEv("ses_p2_fb", "busy"), statusEv("ses_p2_fb", "idle")]);
   await fire(hooksP2, "ses_p2_dm", [statusEv("ses_p2_dm", "busy"), statusEv("ses_p2_dm", "idle")]);
   const okP2 = await waitUntil(
     () =>
       readLines().some((l) => l.includes("recovery= sid=ses_p2_cur attempt=1")) &&
       readLines().some((l) => l.includes("route= restart spawn sid=ses_p2_rs")) &&
       readLines().some((l) => l.includes("recovery= sid=ses_p2_fb attempt=1")) &&
       readLines().some((l) => l.includes("send-fail= sid=ses_p2_dm") && l.includes("send exploded")),
     12000,
   );
   const p2Cur = p2Sends.find((c) => c.path?.id === "ses_p2_cur");
   const p2Fb = p2Sends.find((c) => c.path?.id === "ses_p2_fb");
   const p2SpawnSend = p2Sends.find((c) => ((c.body?.parts?.[0]?.text ?? "")).startsWith(MARK));
   const p2SpawnLine = readLines().find((l) => l.includes("spawn= sid=ses_p2_spawn"));
   chk("#85 part 2 (a): all four scenarios routed on one tick pass (continue / restart-spawn / fallback-continue / failed send)",
     okP2, okP2 ? "" : "missing line(s)");
   chk("#85 part 2 (a): CONTINUE body carries the session's CURRENT agent+model (the last assistant's switched pair — not a planner constant)",
     okP2 && p2Cur?.body?.agent === WORKER_A && p2Cur?.body?.agent !== PLANNER_A &&
       p2Cur?.body?.model?.providerID === MODEL.providerID && p2Cur?.body?.model?.modelID === MODEL.modelID &&
       ((p2Cur?.body?.parts?.[0]?.text) ?? "").includes("agent_readme_post_compaction.md"),
     JSON.stringify(p2Cur?.body ?? null));
   chk("#85 part 2 (a): the restart spawn carries the SOURCE session's current agent+model (the successor keeps them — not a planner constant)",
     okP2 && p2SpawnSend?.path?.id === "ses_p2_spawn" && p2SpawnSend?.body?.agent === WORKER_A && p2SpawnSend?.body?.agent !== PLANNER_A &&
       p2SpawnSend?.body?.model?.providerID === MODEL.providerID && p2SpawnSend?.body?.model?.modelID === MODEL.modelID &&
       !!p2SpawnLine && p2SpawnLine.includes("agent=" + WORKER_A) && p2SpawnLine.includes("model=prov_x/model_x"),
     JSON.stringify(p2SpawnSend?.body ?? null));
   chk("#85 part 2 (a): the JSONC fallback — no last-assistant agent+model → the working agent (first user) + its CONFIGURED model from opencode.jsonc",
     okP2 && p2Fb?.body?.agent === "worker_fb_test" && p2Fb?.body?.model?.providerID === "prov_x" && p2Fb?.body?.model?.modelID === "model_x",
     JSON.stringify(p2Fb?.body ?? null));

   // (b) the host re-arms the failed session (a session.error — a dead
   // stream may never emit its idle): the NEXT tick must log the
   // dead-mark skip — no attempt 2, no send.
   const dmSkip = () => readLines().filter((l) => l.includes("skip= dead sid=ses_p2_dm")).length;
   const dmAttempt = (n) => readLines().filter((l) => l.includes(`recovery= sid=ses_p2_dm attempt=${n}`)).length;
   await hooksP2.event({ event: { type: "session.error", properties: { sessionID: "ses_p2_dm" } } });
   const okP2B = await waitUntil(() => dmSkip() >= 1, 12000);
   chk("#85 part 2 (b): a failed CONTINUE dead-marks the session — the next tick logs the dead-mark skip (no attempt 2, no send)",
     okP2B && dmSkip() === 1 && dmAttempt(2) === 0 && !p2Sends.some((c) => c.path?.id === "ses_p2_dm"),
     `skip=${dmSkip()} attempt2=${dmAttempt(2)}`);

   // (c) a SECOND re-arm (what would exhaust the cap in the old code):
   // still only the dead-mark skip — NO recovery attempt 2, NO
   // cap-exhaustion fallback spawn (no doomed successor), the mark
   // persists (no 5s retry loop).
   const cBeforeP2C = p2Creates.length;
   await hooksP2.event({ event: { type: "session.error", properties: { sessionID: "ses_p2_dm" } } });
   const okP2C = await waitUntil(() => dmSkip() >= 2, 12000);
   await sleep(5600); // at least one full tick period — no spawn may follow
   chk("#85 part 2 (c): the cap-exhaustion branch does NOT spawn for a dead-marked session (no doomed successor; the mark persists — no 5s retry loop)",
     okP2C && dmSkip() === 2 && dmAttempt(2) === 0 && p2Creates.length === cBeforeP2C &&
       !readLines().some((l) => l.includes("route= restart spawn sid=ses_p2_dm")) &&
       !p2Sends.some((c) => c.path?.id === "ses_p2_dm"),
     `skip=${dmSkip()} create=${p2Creates.length}`);

   // (d) a FRESH busy (no pending injection — the send failed) clears
   // the dead-mark: the next idle cycle retries normally (the throw
   // flag is lifted — the CONTINUE lands).
   p2ThrowSids.delete("ses_p2_dm");
   const dmArmed = () => readLines().filter((l) => l.includes("arm= sid=ses_p2_dm") && !l.includes("injected")).length;
   const dmInjected = () => readLines().filter((l) => l.includes("arm= sid=ses_p2_dm injected")).length;
   const n1Before = dmAttempt(1);
   await fire(hooksP2, "ses_p2_dm", [statusEv("ses_p2_dm", "busy"), statusEv("ses_p2_dm", "idle")]);
   const okP2D = await waitUntil(() => dmAttempt(1) === n1Before + 1 && p2Sends.some((c) => c.path?.id === "ses_p2_dm"), 12000);
   const p2Dm = p2Sends.find((c) => c.path?.id === "ses_p2_dm");
   chk("#85 part 2 (d): a fresh busy clears the dead-mark — the next idle cycle retries normally (the CONTINUE lands)",
     okP2D && !!p2Dm && p2Dm?.body?.agent === PLANNER_A &&
       dmArmed() === 2 && dmInjected() === 0,
     JSON.stringify(p2Dm?.body ?? null));

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
  const smokeSids = ["ses_smoke_ar1", "ses_throwing", "ses_u2_sat", "ses_u2_low", "ses_u2_over", "ses_u2_nomodel", "ses_u2_noprov",     "ses_u2_sendfail", "ses_u2_noprov2", "ses_u2_str", "ses_u2_tgnof", "ses_u2_tgoff", "ses_u2_tgon", "ses_u2_tgmal", "ses_u3_new", "ses_u3_chk2", "ses_u4_stop", "ses_u4_ask", "ses_u4_restart", "ses_u4_sux", "ses_u4_succ", "ses_u4_noline", "ses_u4_plain", "ses_u4_wrap", "ses_u4_throw", "ses_u4_spawn", "ses_u4_cap", "ses_u2_agnet", "ses_u2_agnone", "ses_u4_worker", "ses_u4_worker_on", "ses_u4_pb", "ses_u4_lastoff", "ses_u4_mid", "ses_p2_cur", "ses_p2_rs", "ses_p2_fb", "ses_p2_dm", "ses_p2_spawn"];
  chk("LIVE .opencode/temp/auto_resume.log received no smoke line (sandbox got every smoke line)",
    liveBefore === liveSizeNow || !smokeSids.some((s) => appended.includes(s)), `before=${liveBefore} after=${liveSizeNow}`);
  chk("sandbox log path is under the sandbox", sandboxLog.startsWith(base), sandboxLog);
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}

finish();
