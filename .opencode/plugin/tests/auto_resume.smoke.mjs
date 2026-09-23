// auto_resume.smoke.mjs — UNIT 1+2+3 of the auto-resume plugin
// (.opencode/plugin/auto_resume.ts; approved 2026-09-21 auto-resume
// proposal). UNIT 1: skeleton logging plugin + v1 client surface probe.
// UNIT 2: #85 part 3 — the context-limit nudge as a PASSIVE ctx-line
// suffix: a live session crossing its saturation threshold (configurable
// per call, default 0.95 of the usable window) gets a nudge SUFFIX on
// its own TOOL-CALL RETURN (the gauge plugin's ctx: line channel — no
// promptAsync, no resume, no busy, no loop), per busy session, with a
// ladder (>= 0.95 "self-compact now"; >= 0.98 --maintainer-flagged);
// scope "none" (Direct) suppresses it (c).
// UNIT 3: the new-planner spawn helper — a one-shot trigger file in the
// log dir, consumed (renamed .consumed) by the tick (5000ms default;
// short tickMs in this smoke) after ONE spawn attempt (create + queued
// promptAsync; #85 part 2: NO agent/model for
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
// a planner constant). SCOPE (#85 part 1, part 3 (d) — the #82
// generalized scope, toggle FIRST): the LAST OWN-LINE toggle in the
// user history decides (`<|autonom|>` / `<|Autorun|>`, case-insensitive;
// OFF = `<|Direct|>`; last-toggle-wins, re-evaluated per idle) — ON →
// "autorun" (ANY agent type), OFF → "none" (beats the planner test — a
// Direct planner is OUT of scope); with NO toggle, the working agent
// (the FIRST user message's agent field) being a planner agent
// (`planner_<model>`) → "planner". Self-spawned sids (the module-level
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

// Tick period for this smoke: the factory below is instantiated with a
// SHORT tickMs (the plugin default stays 5000 — live behavior unchanged),
// so the "at least one full tick period" waits are sub-second. waitUntil
// polls up to 8s for a condition.
const TICK = 300;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tickWait = () => sleep(2 * TICK + 200); // at least one full tick period
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
  // tickMs: the test-only short tick (the module-level tick is set by the
  // FIRST factory call — later re-factories don't re-arm it).
  const hooks = await factory({ directory: proj, tickMs: TICK, client: mkClient(v1Session, () => "log") });
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
   // UNIT 2 — #85 part 3: the passive ctx-line suffix (no resume)
   //
   // The factory is re-invoked with a SPYING client: promptAsync
   // records every call (it must stay ZERO on the Unit-2 path — the
   // nudge is passive), `messages` is scripted per sid (the nudge's
   // scope gate does a FRESH fetch per nudge-eligible tool result),
   // the provider mock supplies limit data in the LIVE SDK shape
   // (res.data.all[] → models[modelID].limit.{context,output}; the
   // installed SDK names the method `list`). Default config (no
   // budget file — fail-open): usable = 100000 - min(20000, 16000) =
   // 84000; threshold 0.95 → the suffix fires at >= 79800. The nudge
   // rides the TOOL-CALL RETURN (the gauge plugin's ctx: line channel)
   // — driven via the tool.execute.after hook (synchronous
   // observation — no 5s tick wait). The scenario sessions go busy →
   // tokens (NO idle — an idle would route Unit 4; the passive nudge
   // never needs the tick).
   // ============================================================
   const CONTEXT = 100000, OUTPUT = 16000;
   const USABLE = CONTEXT - Math.min(20000, OUTPUT); // 84000
   const RATIO_HI = (80000 / USABLE).toFixed(3); // 0.952
   const RATIO_98 = (83000 / USABLE).toFixed(3); // 0.988

   const calls = [];
   const TOG = "<|autonom|>";
   const OFF = "<|Direct|>";
   const u2Pairs = (entries) => entries.map(([role, text]) => ({ info: { role }, parts: [{ type: "text", text }] }));
   const u2Script = new Map();
   // The nudge's scope gate needs a FRESH verdict: every nudge-eligible
   // scenario session carries an own-line ON toggle (any agent type —
   // the #82 case) so the verdict is "autorun" (in scope).
   for (const s of ["ses_u2_sat", "ses_u2_low", "ses_u2_over", "ses_u2_nomodel", "ses_u2_noprov", "ses_u2_hi98", "ses_u2_two", "ses_u2_str"])
     u2Script.set(s, u2Pairs([["user", TOG], ["assistant", "Working."]]));

   const v2Session = {
     prompt: function () {},
     promptAsync: async (args) => { calls.push(args); return { data: { id: "queued" } }; },
     abort: function () {},
     list: function () {},
     get: function () {},
     message: function () {},
     messages: async (args) => u2Script.get(args?.path?.id) ?? [],
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
   chk("UNIT 2 #85 part 3: the factory exposes the tool.execute.after hook (the ctx-line channel)", typeof hooksU2?.["tool.execute.after"] === "function");

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
   // The nudge channel: ONE tool result for the session — the hook
   // mutates the output object IN PLACE (the gauge plugin's ctx: line
   // channel — the same mutation as the `(NN% used, NNNK left)`
   // footer). The base output ends with a \n (the common real shape).
   const toolAfter = async (h, sid, base = `tool result for ${sid}\n`) => {
     const output = { title: "bash", output: base, metadata: {} };
     await h["tool.execute.after"]({ tool: "bash", sessionID: sid, callID: "call_x", args: {} }, output);
     return output.output;
   };
   const SUFFIX_95 = `self-compact now (ratio=${RATIO_HI})`;
   const SUFFIX_98 = `⚠⚠ --maintainer: context saturated at ratio=${RATIO_98} — self-compact NOW`;
   const hasSuffix = (s) => s.includes("self-compact now") || s.includes("--maintainer");
   const nudgeLine = (sid) => readLines().filter((l) => l.includes(`nudge= sid=${sid}`)).length;

   // Arm every scenario session: busy → assistant token update (NO
   // idle — the passive nudge never needs the tick; an idle would
   // route Unit 4).
   await fire(hooksU2, "ses_u2_sat", [statusEv("ses_u2_sat", "busy"), msgUpdated("ses_u2_sat", "assistant", { total: 80000 }, MODEL)]);
   await fire(hooksU2, "ses_u2_low", [
     statusEv("ses_u2_low", "busy"),
     msgUpdated("ses_u2_low", "assistant", { total: 50000 }, MODEL),
     // a user-role update must NOT overwrite lastTokenTotal
     msgUpdated("ses_u2_low", "user", { total: 1000000 }),
   ]);
   await fire(hooksU2, "ses_u2_over", [
     statusEv("ses_u2_over", "busy"),
     msgUpdated("ses_u2_over", "assistant", { total: 80000 }, MODEL),
     msgUpdated("ses_u2_over", "assistant", { total: 40000 }), // OVERWRITTEN — not accumulated
   ]);
   await fire(hooksU2, "ses_u2_nomodel", [statusEv("ses_u2_nomodel", "busy"), msgUpdated("ses_u2_nomodel", "assistant", { total: 80000 })]);
   await fire(hooksU2, "ses_u2_noprov", [statusEv("ses_u2_noprov", "busy"), msgUpdated("ses_u2_noprov", "assistant", { total: 80000 }, { providerID: "prov_x", modelID: "model_missing" })]);
   await fire(hooksU2, "ses_u2_hi98", [statusEv("ses_u2_hi98", "busy"), msgUpdated("ses_u2_hi98", "assistant", { total: 83000 }, MODEL)]);
   await fire(hooksU2, "ses_u2_two", [statusEv("ses_u2_two", "busy"), msgUpdated("ses_u2_two", "assistant", { total: 80000 }, MODEL)]);

   // ---- DoD: the ctx-line suffix on the tool-call return at 0.95 /
   // 0.98 (the nudge LADDER — the highest rung met fires)
   const out95 = await toolAfter(hooksU2, "ses_u2_sat");
   chk("UNIT 2 #85 part 3: busy session at ratio >= 0.95 (default) → the ctx-line suffix on the tool result (self-compact now)",
     out95.endsWith(SUFFIX_95), out95.slice(-120));
   chk("UNIT 2 #85 part 3: no promptAsync on the Unit-2 path (the nudge is passive — no resume, no queued turn)",
     calls.length === 0, `n=${calls.length}`);
   chk("UNIT 2 #85 part 3: nudge= log line present for the first suffix (with the ratio)",
     readLines().some((l) => l.includes(`nudge= sid=ses_u2_sat`) && l.includes(RATIO_HI)), "");
   const out98 = await toolAfter(hooksU2, "ses_u2_hi98");
   chk("UNIT 2 #85 part 3: busy session at ratio >= 0.98 → the --maintainer-flagged line on the tool result",
     out98.endsWith(SUFFIX_98), out98.slice(-120));

   // ---- DoD: per-session independent nudge — two active busy sessions
   // at the threshold → EACH gets its own suffix (independent)
   const outTwo = await toolAfter(hooksU2, "ses_u2_two");
   chk("UNIT 2 #85 part 3: two active busy sessions at the threshold → EACH gets its own nudge (independent)",
     out95.endsWith(SUFFIX_95) && outTwo.endsWith(SUFFIX_95) &&
       nudgeLine("ses_u2_sat") === 1 && nudgeLine("ses_u2_two") === 1,
     `sat=${nudgeLine("ses_u2_sat")} two=${nudgeLine("ses_u2_two")}`);

   // ---- (c) Direct suppresses the Unit-2 nudge: a saturated session
   // with a trailing own-line <Direct|> (last-toggle-wins) → verdict
   // "none" → no suffix (even while actively working)
   u2Script.set("ses_u2_direct", u2Pairs([["user", TOG], ["user", OFF], ["assistant", "Working."]]));
   await fire(hooksU2, "ses_u2_direct", [statusEv("ses_u2_direct", "busy"), msgUpdated("ses_u2_direct", "assistant", { total: 80000 }, MODEL)]);
   const outDirect = await toolAfter(hooksU2, "ses_u2_direct");
   chk("UNIT 2 #85 part 3 (c): Direct (scope none) → no ctx-line suffix on the tool result (Unit 2 suppressed while actively working)",
     !hasSuffix(outDirect) && calls.length === 0 && nudgeLine("ses_u2_direct") === 0, outDirect.slice(-80));

   // ---- sub-threshold / model-missing scenarios: no suffix, no send
   const outLow = await toolAfter(hooksU2, "ses_u2_low");
   chk("UNIT 2: sub-threshold session (ratio < 0.95 default) → no suffix (the user-role update did not overwrite — still not the saturation input)",
     !hasSuffix(outLow) && calls.length === 0, outLow.slice(-80));
   const outOver = await toolAfter(hooksU2, "ses_u2_over");
   chk("UNIT 2: lastTokenTotal OVERWRITTEN (80000 then 40000 → below threshold → no suffix)", !hasSuffix(outOver), outOver.slice(-80));
   const outNm = await toolAfter(hooksU2, "ses_u2_nomodel");
   chk("UNIT 2: no model info → no suffix (model limits null — fail-safe, no intervention)", !hasSuffix(outNm), outNm.slice(-80));
   const outNp = await toolAfter(hooksU2, "ses_u2_noprov");
   chk("UNIT 2: provider data missing (model not listed) → no suffix", !hasSuffix(outNp), outNp.slice(-80));
   // ---- a SECOND tool result in the SAME busy cycle → the suffix
   // appends AGAIN (the per-step reminder — unlike the old once-per-
   // cycle send) but only ONE nudge= log line for the cycle (the
   // dedup)
   const outSat2 = await toolAfter(hooksU2, "ses_u2_sat");
   chk("UNIT 2 #85 part 3: second tool result in the same busy cycle → the suffix appends again (the per-step reminder)",
     outSat2.endsWith(SUFFIX_95), outSat2.slice(-80));
   chk("UNIT 2 #85 part 3: once-per-cycle nudge= log line (dedup) — still exactly one for the cycle",
     nudgeLine("ses_u2_sat") === 1, `n=${nudgeLine("ses_u2_sat")}`);

   // ---- fresh busy cycle → the dedup resets → a new nudge= line (the
   // suffix was already per-step — the reset is observable in the log)
   await fire(hooksU2, "ses_u2_sat", [statusEv("ses_u2_sat", "busy")]);
   const outSat3 = await toolAfter(hooksU2, "ses_u2_sat");
   chk("UNIT 2 #85 part 3: fresh busy → the nudge-log dedup resets (a new nudge= line) + the suffix rides the next tool result",
     outSat3.endsWith(SUFFIX_95) && nudgeLine("ses_u2_sat") === 2, `n=${nudgeLine("ses_u2_sat")}`);

   // ---- dual-shape acceptance: a STRING-shape "busy" event (older
   // host shape / mocks) still arms the watch + the nudge fires on
   // the tool result (the LIVE object shape is what statusEv pins
   // above).
   await fire(hooksU2, "ses_u2_str", [
     { event: { type: "session.status", properties: { sessionID: "ses_u2_str", status: "busy" } } },
     msgUpdated("ses_u2_str", "assistant", { total: 80000 }, MODEL),
   ]);
   const outStr = await toolAfter(hooksU2, "ses_u2_str");
   chk("UNIT 2: STRING-shape busy event still arms + the nudge fires on the tool result (dual-shape acceptance)",
     outStr.endsWith(SUFFIX_95) && readLines().some((l) => l.includes("arm= sid=ses_u2_str")), `n=${calls.length}`);

   // ---- fail-safety: a THROWING messages() fetch (the nudge's scope
   // gate) → no suffix, no throw, no send (fail-safe = no nudge); the
   // hook survives. The throwing client replaces the module client for
   // this scenario.
   const u2ScriptThrow = new Map(u2Script);
   u2ScriptThrow.set("ses_u2_sendfail", { throw: "messages exploded for ses_u2_sendfail" });
   const v3Session = {
     prompt: function () {},
     promptAsync: async (args) => { calls.push(args); return { data: { id: "queued" } }; },
     abort: function () {},
     list: function () {},
     get: function () {},
     message: function () {},
     messages: async (args) => {
       const scripted = u2ScriptThrow.get(args?.path?.id);
       if (scripted && typeof scripted === "object" && scripted.throw) throw new Error(scripted.throw);
       return scripted ?? [];
     },
     todo: function () {},
     command: function () {},
     summarize: function () {},
   };
   const hooksU3 = await factory({ directory: proj, client: { session: v3Session, provider: { list: providerList }, app: {} } });
   await fire(hooksU3, "ses_u2_sendfail", [statusEv("ses_u2_sendfail", "busy"), msgUpdated("ses_u2_sendfail", "assistant", { total: 80000 }, MODEL)]);
   let threw3 = false;
   let outFail = "";
   try { outFail = await toolAfter(hooksU3, "ses_u2_sendfail"); } catch { threw3 = true; }
   chk("UNIT 2 #85 part 3: throwing messages() fetch (scope gate) → no suffix, no throw, no send (fail-safe = no nudge)",
     threw3 === false && !hasSuffix(outFail) && calls.length === 0, `n=${calls.length}`);
   await fire(hooksU3, "ses_u2_noprov2", [statusEv("ses_u2_noprov2", "busy"), msgUpdated("ses_u2_noprov2", "assistant", { total: 80000 }, { providerID: "prov_missing", modelID: "model_x" })]);
   const outNp2 = await toolAfter(hooksU3, "ses_u2_noprov2");
   chk("UNIT 2: missing provider data → no suffix, no send, no nudge= line, count unchanged",
     calls.length === 0 && !hasSuffix(outNp2) && !readLines().some((l) => l.includes(`nudge= sid=ses_u2_noprov2`)), `n=${calls.length}`);

   // ---- DoD: stale armed session — armed at a HIGH ratio, goes
   // IDLE, stays armed; autoCompact on (no budget file). The passive
   // nudge CANNOT reach it: an idle session emits no tool results → no
   // nudge, and NO promptAsync (no resume). The old tick design would
   // have fired within 5s — wait one full tick period to pin it.
   u2Script.set("ses_u2_stale", u2Pairs([["user", TOG], ["assistant", "Done. action: stop"]]));
   // re-factor with the v2 spy client (the fail-safety section above
   // re-factored with the throwing v3Session — restore the spy)
   const hooksU2b = await factory({ directory: proj, client: { session: v2Session, provider: { list: providerList }, app: { log: () => "log" } } });
   await fire(hooksU2b, "ses_u2_stale", [statusEv("ses_u2_stale", "busy"), msgUpdated("ses_u2_stale", "assistant", { total: 80000 }, MODEL), statusEv("ses_u2_stale", "idle")]);
   const cBeforeStale = calls.length;
    await tickWait(); // at least one full tick period (the old design fired on the tick)
   chk("UNIT 2 #85 part 3: stale armed session (armed at a high ratio, goes idle, stays armed; autoCompact on) → NO fire (no nudge, no resume — no promptAsync, no nudge= line)",
     calls.length === cBeforeStale && nudgeLine("ses_u2_stale") === 0,
     `n=${calls.length} nudge=${nudgeLine("ses_u2_stale")}`);
   chk("UNIT 2 #85 part 3: the stale session's idle was routed by UNIT 4 (scope unchanged — autorun via the toggle, action: stop → no send), not by Unit 2",
     readLines().some((l) => l.includes("route= stop sid=ses_u2_stale")), "");

   // ---- autoCompact toggle (maintainer priority #1): an OPTIONAL
   // top-level `autoCompact` key in `.opencode/temp/compact_budget.json`
   // (the sandbox's budget file — NEVER the live one) gates the nudge
   // (read PER nudge-eligible tool-result call — a live edit takes
   // effect on the next tool result, no tick): absent/true → the
   // suffix; false → suppressed SILENTLY (no per-tool-result log line);
   // missing/unreadable/malformed file → fail OPEN (the suffix). A
   // FRESH spying client — the fail-safety section above re-factored
   // with the throwing v3Session.
   const tCalls = [];
   const tScript = new Map(u2Script); // the toggle scenarios: own-line ON toggle
   for (const s of ["ses_u2_tgnof", "ses_u2_tgoff", "ses_u2_tgon", "ses_u2_tgmal"])
     tScript.set(s, u2Pairs([["user", TOG], ["assistant", "Working."]]));
   const vTSession = {
     prompt: function () {},
     promptAsync: async (args) => { tCalls.push(args); return { data: { id: "queued" } }; },
     abort: function () {},
     list: function () {},
     get: function () {},
     message: function () {},
     messages: async (args) => tScript.get(args?.path?.id) ?? [],
     todo: function () {},
     command: function () {},
     summarize: function () {},
   };
   const hooksUT = await factory({ directory: proj, client: { session: vTSession, provider: { list: providerList }, app: { log: () => "log" } } });
   const budgetFile = path.join(proj, ".opencode", "temp", "compact_budget.json");
   const writeBudget = (content) => fs.writeFileSync(budgetFile, content, "utf-8");

   // case 1: NO budget file + ratio >= 0.95 (default) → the suffix
   // (explicit status-quo regression — the file is absent in the sandbox)
   fs.rmSync(budgetFile, { force: true });
   await fire(hooksUT, "ses_u2_tgnof", [statusEv("ses_u2_tgnof", "busy"), msgUpdated("ses_u2_tgnof", "assistant", { total: 80000 }, MODEL)]);
   const outTNo = await toolAfter(hooksUT, "ses_u2_tgnof");
   chk("UNIT 2: autoCompact — NO budget file (key absent) → the suffix fires (status quo)",
     hasSuffix(outTNo) && tCalls.length === 0 && nudgeLine("ses_u2_tgnof") === 1, `n=${tCalls.length}`);

   // case 2: autoCompact:false + ratio >= 0.95 (default) → NO suffix
   // (silent suppression — no per-tool-result log line); a flip back ON
   // (file removed) takes effect on the NEXT tool result (per-call
   // read — no tick, no budget-retention semantics)
   writeBudget(JSON.stringify({ autoCompact: false }));
   await fire(hooksUT, "ses_u2_tgoff", [statusEv("ses_u2_tgoff", "busy"), msgUpdated("ses_u2_tgoff", "assistant", { total: 80000 }, MODEL)]);
   const nTOff = tCalls.length;
   const outOff1 = await toolAfter(hooksUT, "ses_u2_tgoff");
   const outOff2 = await toolAfter(hooksUT, "ses_u2_tgoff"); // second tool result, still OFF
   chk("UNIT 2: autoCompact:false + ratio >= 0.95 (default) → NO suffix (even on a second tool result)",
     tCalls.length === nTOff && !hasSuffix(outOff1) && !hasSuffix(outOff2), `n=${tCalls.length}`);
   chk("UNIT 2: autoCompact:false → silent suppression (no nudge= line for the suppressed session)",
     nudgeLine("ses_u2_tgoff") === 0, "");
   fs.rmSync(budgetFile, { force: true }); // flip back ON (key absent)
   const outOff3 = await toolAfter(hooksUT, "ses_u2_tgoff");
   chk("UNIT 2: toggle flipped back ON → the suffix fires on the NEXT tool result (per-call read — no tick needed)",
     hasSuffix(outOff3) && tCalls.length === nTOff && nudgeLine("ses_u2_tgoff") === 1, `n=${tCalls.length}`);

   // case 3: autoCompact:true + ratio >= 0.95 (default) → the suffix
   // (explicit ON)
   writeBudget(JSON.stringify({ autoCompact: true }));
   await fire(hooksUT, "ses_u2_tgon", [statusEv("ses_u2_tgon", "busy"), msgUpdated("ses_u2_tgon", "assistant", { total: 80000 }, MODEL)]);
   const outTOn = await toolAfter(hooksUT, "ses_u2_tgon");
   chk("UNIT 2: autoCompact:true + ratio >= 0.95 (default) → the suffix fires",
     hasSuffix(outTOn) && tCalls.length === nTOff && nudgeLine("ses_u2_tgon") === 1, `n=${tCalls.length}`);

   // case 4: MALFORMED budget file content + ratio >= 0.95 (default) →
   // fail OPEN (the suffix)
   writeBudget("{ this is not valid json !!!");
   await fire(hooksUT, "ses_u2_tgmal", [statusEv("ses_u2_tgmal", "busy"), msgUpdated("ses_u2_tgmal", "assistant", { total: 80000 }, MODEL)]);
   const outTMal = await toolAfter(hooksUT, "ses_u2_tgmal");
   chk("UNIT 2: autoCompact — MALFORMED file → fail OPEN, the suffix fires",
     hasSuffix(outTMal) && tCalls.length === nTOff && nudgeLine("ses_u2_tgmal") === 1, `n=${tCalls.length}`);
   fs.rmSync(budgetFile, { force: true }); // leave the sandbox clean

   // ============================================================
   // UNIT 2 (cont.) — #85 part 3: configurable threshold + output
   // reserve (maintainer ruling 2026-09-22: "only trigger it past the
   // 95% line") — read PER nudge-eligible tool-result call (a live
   // edit takes effect on the next tool result, no tick), fail-open
   // (absent / unparseable / out-of-range → the defaults 0.95 / 20000).
   // Reuses hooksUT + tCalls (same spying client — tScript is mutated
   // in place; no re-factor needed). Node-computed expectations:
   // usable (default reserve) = 84000: 80000/84000 = 0.952 (suffix),
   // 79000/84000 = 0.940 (no suffix — WOULD fire at the old 0.85
   // default); 55000/84000 = 0.655 (suffix at 0.60, no suffix at 0.95);
   // 40000/84000 = 0.476 (no suffix even at 0.60). Usable (reserve 0) =
   // 100000: 96000/100000 = 0.960 (suffix), 82000/100000 = 0.820 (no
   // suffix — whereas 82000/84000 = 0.976 WOULD at the default
   // reserve).
   // ============================================================

   for (const s of ["ses_u2_cfa_low", "ses_u2_cfa_hi", "ses_u2_cfb_edit", "ses_u2_cfb_fire", "ses_u2_cfb_no", "ses_u2_cfc_fire", "ses_u2_cfc_no", "ses_u2_cfd_low", "ses_u2_cfd_hi"])
     tScript.set(s, u2Pairs([["user", TOG], ["assistant", "Working."]]));

   // case (a): NO config → fail-open defaults 0.95 / 20000 — both
   // sessions evaluated on ONE pass: 79000 (0.940) below, 80000 (0.952)
   // above.
   fs.rmSync(budgetFile, { force: true });
   await fire(hooksUT, "ses_u2_cfa_low", [statusEv("ses_u2_cfa_low", "busy"), msgUpdated("ses_u2_cfa_low", "assistant", { total: 79000 }, MODEL)]);
   await fire(hooksUT, "ses_u2_cfa_hi", [statusEv("ses_u2_cfa_hi", "busy"), msgUpdated("ses_u2_cfa_hi", "assistant", { total: 80000 }, MODEL)]);
   const outCfgLow = await toolAfter(hooksUT, "ses_u2_cfa_low");
   const outCfgHi = await toolAfter(hooksUT, "ses_u2_cfa_hi");
   chk("UNIT 2 config: no config → fail-open 0.95/20000 — 80000 (0.952) gets the suffix", hasSuffix(outCfgHi), outCfgHi.slice(-80));
   chk("UNIT 2 config: no config — 79000 (0.940 < 0.95 default) does NOT get the suffix (would at the old 0.85)",
     !hasSuffix(outCfgLow), outCfgLow.slice(-80));
   chk("UNIT 2 config: no config — no nudge= line for the below-threshold session, one for the above (with the ratio)",
     nudgeLine("ses_u2_cfa_low") === 0 && readLines().some((l) => l.includes("nudge= sid=ses_u2_cfa_hi") && l.includes("0.952")), "");

   // case (b): PER-CALL LIVE EDIT — ses_u2_cfb_edit armed at 55000
   // (0.655) while NO config (below the 0.95 default) → no suffix on
   // the tool result; then saturationThreshold 0.60 is written → the
   // NEXT tool result gets the suffix (read per call — no restart, no
   // tick needed).
   const nCfgB0 = tCalls.length;
   await fire(hooksUT, "ses_u2_cfb_edit", [statusEv("ses_u2_cfb_edit", "busy"), msgUpdated("ses_u2_cfb_edit", "assistant", { total: 55000 }, MODEL)]);
   const outCfgB0 = await toolAfter(hooksUT, "ses_u2_cfb_edit");
   chk("UNIT 2 config: armed at 0.655 while no config → no suffix (0.95 default)",
     !hasSuffix(outCfgB0) && tCalls.length === nCfgB0, `n=${tCalls.length}`);
   writeBudget(JSON.stringify({ saturationThreshold: 0.60 }));
   const outCfgB = await toolAfter(hooksUT, "ses_u2_cfb_edit");
   // The next tool result re-evaluates at the new threshold: the armed
   // 0.655 session gets the suffix AND the lingering ses_u2_cfa_low
   // from case (a) (0.940, never suffixed — the same busy cycle keeps
   // its tokens) now crosses 0.60 too.
   const outCfgBLow = await toolAfter(hooksUT, "ses_u2_cfa_low");
   chk("UNIT 2 config: LIVE EDIT saturationThreshold 0.60 → the armed 0.655 session gets the suffix on the NEXT tool result (the lingering 0.940 session crosses too)",
     hasSuffix(outCfgB) && hasSuffix(outCfgBLow) && tCalls.length === nCfgB0, `n=${tCalls.length}`);
   chk("UNIT 2 config: live-edit suffix names ratio 0.655", outCfgB.includes("0.655"), outCfgB.slice(-80));

   // case (b, cont.): threshold 0.60 in force — 55000 (0.655) suffix,
   // 40000 (0.476) does NOT (both on the same pass).
   await fire(hooksUT, "ses_u2_cfb_fire", [statusEv("ses_u2_cfb_fire", "busy"), msgUpdated("ses_u2_cfb_fire", "assistant", { total: 55000 }, MODEL)]);
   await fire(hooksUT, "ses_u2_cfb_no", [statusEv("ses_u2_cfb_no", "busy"), msgUpdated("ses_u2_cfb_no", "assistant", { total: 40000 }, MODEL)]);
   const outCfgBFire = await toolAfter(hooksUT, "ses_u2_cfb_fire");
   const outCfgBNo = await toolAfter(hooksUT, "ses_u2_cfb_no");
   chk("UNIT 2 config: saturationThreshold 0.60 → 55000 (0.655) gets the suffix", hasSuffix(outCfgBFire), outCfgBFire.slice(-80));
   chk("UNIT 2 config: saturationThreshold 0.60 → 40000 (0.476) does NOT", !hasSuffix(outCfgBNo), outCfgBNo.slice(-80));

   // case (c): outputReserve 0 → usable = 100000 - min(0, 16000) =
   // 100000: 96000 (0.960) suffix; 82000 (0.820) does NOT — whereas
   // 82000/84000 = 0.976 WOULD at the default reserve.
   writeBudget(JSON.stringify({ outputReserve: 0 }));
   await fire(hooksUT, "ses_u2_cfc_fire", [statusEv("ses_u2_cfc_fire", "busy"), msgUpdated("ses_u2_cfc_fire", "assistant", { total: 96000 }, MODEL)]);
   await fire(hooksUT, "ses_u2_cfc_no", [statusEv("ses_u2_cfc_no", "busy"), msgUpdated("ses_u2_cfc_no", "assistant", { total: 82000 }, MODEL)]);
   const outCfgCFire = await toolAfter(hooksUT, "ses_u2_cfc_fire");
   const outCfgCNo = await toolAfter(hooksUT, "ses_u2_cfc_no");
   chk("UNIT 2 config: outputReserve 0 → usable 100000 — 96000 (0.960) gets the suffix", hasSuffix(outCfgCFire), outCfgCFire.slice(-80));
   chk("UNIT 2 config: outputReserve 0 — the suffix names ratio 0.960 (usable 100000)", outCfgCFire.includes("0.960"), outCfgCFire.slice(-80));
   chk("UNIT 2 config: outputReserve 0 — 82000 (0.820) does NOT get the suffix (0.976 at the default reserve WOULD)",
     !hasSuffix(outCfgCNo), outCfgCNo.slice(-80));

   // case (d): OUT-OF-RANGE values → fail-open defaults:
   // saturationThreshold "high" (not a number) + outputReserve -5
   // (negative) are both ignored → 79000 (0.940) no suffix, 80000
   // (0.952) suffix at usable 84000 (same pass).
   writeBudget(JSON.stringify({ saturationThreshold: "high", outputReserve: -5 }));
   await fire(hooksUT, "ses_u2_cfd_low", [statusEv("ses_u2_cfd_low", "busy"), msgUpdated("ses_u2_cfd_low", "assistant", { total: 79000 }, MODEL)]);
   await fire(hooksUT, "ses_u2_cfd_hi", [statusEv("ses_u2_cfd_hi", "busy"), msgUpdated("ses_u2_cfd_hi", "assistant", { total: 80000 }, MODEL)]);
   const outCfgDLow = await toolAfter(hooksUT, "ses_u2_cfd_low");
   const outCfgDHi = await toolAfter(hooksUT, "ses_u2_cfd_hi");
   // The fail-open defaults re-arm the default 0.95/20000 math: the
   // lingering ses_u2_cfc_no from case (c) (82000 — 0.820 under reserve
   // 0, but 0.976 at the default reserve 84000) gets the suffix too,
   // alongside ses_u2_cfd_hi.
   const outCfgCNo2 = await toolAfter(hooksUT, "ses_u2_cfc_no");
   chk("UNIT 2 config: out-of-range values (string threshold, negative reserve) → fail-open defaults — 80000 gets the suffix at usable 84000 (the lingering 0.976-at-default session crosses too)",
     hasSuffix(outCfgDHi) && hasSuffix(outCfgCNo2) && outCfgDHi.includes("0.952"), outCfgDHi.slice(-80));
   chk("UNIT 2 config: out-of-range values → 79000 (0.940 < 0.95 default) does NOT get the suffix",
     !hasSuffix(outCfgDLow), outCfgDLow.slice(-80));
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
  // auto_resume.log). The single tick (short tickMs here — 5000ms
  // default in live) is the only decision+send funnel — the smoke
  // waits on it (real time).
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
  await tickWait(); // at least one full tick period after the spawn
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
   // tick (short tickMs here — 5000ms default in live) is the only
   // decision+send funnel — the smoke waits on it (real time). Batch A
   // fires every scenario before one tick pass, so one pass routes them
   // all.
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
   // UNIT 2 #85 part 3 — the nudge's scope gate (the factory is re-
   // invoked with a fresh spying client — promptAsync + messages both
   // spied, messages scripted per sid from the shared msgScript):
   //  - a spawned (OUT-of-scope, #85) session whose first user
   //    message carries the planner agent → verdict "none" (the
   //    self-mark) → no suffix;
   //  - a NON-scoped session whose first user message carries an
   //    agent field (no toggle) → verdict "none" → no suffix;
   //  - a NON-scoped session with NO user agent field (no toggle) →
   //    verdict "none" → no suffix.
   // The old #80 agent-retention checks pinned the agent field in the
   // unit-2 SEND body — the send is gone (#85 part 3: passive nudge,
   // no body): the equivalent pin is the verdict gate on the fresh
   // fetch.
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
   chk("UNIT 2 #85 part 3: re-factory with the scope-gate spying client returns the event hook", typeof hooksU2ag?.event === "function");

   // Every scenario: busy → saturated assistant update (NO idle yet —
   // the nudge fires on the tool result, not the tick). Then the
   // tool-result pass: all three verdicts are "none" → no suffix. Then
   // the idle: Unit 4 routes all three as scope= none (no route line,
   // no send — Unit 4 scope unchanged).
   await fire(hooksU2ag, "ses_u3_new", [statusEv("ses_u3_new", "busy"), msgUpdated("ses_u3_new", "assistant", { total: 80000 }, MODEL)]);
   await fire(hooksU2ag, "ses_u2_agnet", [statusEv("ses_u2_agnet", "busy"), msgUpdated("ses_u2_agnet", "assistant", { total: 80000 }, MODEL)]);
   await fire(hooksU2ag, "ses_u2_agnone", [statusEv("ses_u2_agnone", "busy"), msgUpdated("ses_u2_agnone", "assistant", { total: 80000 }, MODEL)]);
   const outAg1 = await toolAfter(hooksU2ag, "ses_u3_new");
   const outAg2 = await toolAfter(hooksU2ag, "ses_u2_agnet");
   const outAg3 = await toolAfter(hooksU2ag, "ses_u2_agnone");
   chk("UNIT 2 #85 part 3: the nudge's scope gate — spawned / no-toggle worker / no-toggle no-agent saturated sessions → NO suffix (verdict none), zero promptAsync",
     !hasSuffix(outAg1) && !hasSuffix(outAg2) && !hasSuffix(outAg3) && u2agCalls.length === 0, `n=${u2agCalls.length}`);
   await fire(hooksU2ag, "ses_u3_new", [statusEv("ses_u3_new", "idle")]);
   await fire(hooksU2ag, "ses_u2_agnet", [statusEv("ses_u2_agnet", "idle")]);
   await fire(hooksU2ag, "ses_u2_agnone", [statusEv("ses_u2_agnone", "idle")]);
   const okAg = await waitUntil(
     () =>
       readLines().some((l) => l.includes("scope= none sid=ses_u3_new")) &&
       readLines().some((l) => l.includes("scope= none sid=ses_u2_agnet")) &&
       readLines().some((l) => l.includes("scope= none sid=ses_u2_agnone")),
     12000,
   );
   chk("UNIT 2 #85 part 3: unit-4 after the nudge pass — all three scope= none (spawned / no-toggle worker / no-toggle no-agent), no sends, no route/recovery line",
     okAg && u2agCalls.length === 0 &&
       !readLines().some((l) => l.includes("sid=ses_u2_agnet") && (l.includes("route=") || l.includes("recovery="))),
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
  await tickWait(); // at least one full tick period
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
  await tickWait(); // at least one full tick period
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
  await tickWait(); // at least one full tick period
  chk("UNIT 4 #82: mid-sentence quote (case-variant, not whole-line) is NOT a toggle — scope= none, no sends, no re-trigger",
    okMid && u4Sends.length === midBefore &&
      !readLines().some((l) => l.includes("sid=ses_u4_mid") && (l.includes("route=") || l.includes("recovery="))),
     `n=${u4Sends.length}`);

   // ============================================================
   // UNIT 4 #85 part 3 — (c)+(d): a PLANNER session with a trailing
   // own-line <Direct|> → the toggle beats the planner test → scope
   // "none": NO Unit-4 CONTINUE (Unit 4 deactivated for the planner)
   // AND no Unit-2 ctx-line suffix (Unit 2 suppressed) — the DoD
   // Direct check (both units). The module client is the u4 spy
   // (the hooksU4b factory call set it).
   // ============================================================
   msgScript.set("ses_p3_pldirect", [
     { info: { role: "user", agent: PLANNER_A }, parts: [{ type: "text", text: "<|Direct|>" }] },
     { info: { role: "assistant" }, parts: [{ type: "text", text: "Mid-unit, no closing line." }] },
   ]);
   await fire(hooksU4b, "ses_p3_pldirect", [statusEv("ses_p3_pldirect", "busy"), msgUpdated("ses_p3_pldirect", "assistant", { total: 80000 }, MODEL)]);
   const outPlDirect = await toolAfter(hooksU4b, "ses_p3_pldirect");
   chk("UNIT 2 #85 part 3 (c): Direct (scope none) on a PLANNER session → no ctx-line suffix (Unit 2 suppressed — the toggle beats the planner test)",
     !hasSuffix(outPlDirect) && nudgeLine("ses_p3_pldirect") === 0, outPlDirect.slice(-80));
   const directBefore = u4Sends.length;
   await fire(hooksU4b, "ses_p3_pldirect", [statusEv("ses_p3_pldirect", "idle")]);
   const okDirect = await waitUntil(() => readLines().some((l) => l.includes("scope= none sid=ses_p3_pldirect")), 12000);
    await tickWait(); // at least one full tick period (the old code CONTINUEd on the tick)
   chk("UNIT 4 #85 part 3 (d): Direct (scope none) on a PLANNER session → NO Unit-4 CONTINUE (Unit 4 deactivated for the planner — the toggle beats the planner test)",
     okDirect && u4Sends.length === directBefore &&
       !readLines().some((l) => l.includes("sid=ses_p3_pldirect") && (l.includes("route=") || l.includes("recovery="))),
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

   // All four scenarios armed before one tick pass (the single tick —
   // short tickMs here, 5000ms default in live — is the only
   // decision+send funnel; the smoke waits on it).
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
    await tickWait(); // at least one full tick period — no spawn may follow
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
  const smokeSids = ["ses_smoke_ar1", "ses_throwing", "ses_u2_sat", "ses_u2_low", "ses_u2_over", "ses_u2_nomodel", "ses_u2_noprov",     "ses_u2_sendfail", "ses_u2_noprov2", "ses_u2_str", "ses_u2_tgnof", "ses_u2_tgoff", "ses_u2_tgon", "ses_u2_tgmal", "ses_u3_new", "ses_u3_chk2", "ses_u4_stop", "ses_u4_ask", "ses_u4_restart", "ses_u4_sux", "ses_u4_succ", "ses_u4_noline", "ses_u4_plain", "ses_u4_wrap", "ses_u4_throw", "ses_u4_spawn", "ses_u4_cap", "ses_u2_agnet", "ses_u2_agnone", "ses_u4_worker", "ses_u4_worker_on", "ses_u4_pb", "ses_u4_lastoff", "ses_u4_mid", "ses_p2_cur", "ses_p2_rs", "ses_p2_fb", "ses_p2_dm", "ses_p2_spawn", "ses_u2_hi98", "ses_u2_two", "ses_u2_direct", "ses_u2_stale", "ses_u2_cfa_low", "ses_u2_cfa_hi", "ses_u2_cfb_edit", "ses_u2_cfb_fire", "ses_u2_cfb_no", "ses_u2_cfc_fire", "ses_u2_cfc_no", "ses_u2_cfd_low", "ses_u2_cfd_hi", "ses_p3_pldirect"];
  chk("LIVE .opencode/temp/auto_resume.log received no smoke line (sandbox got every smoke line)",
    liveBefore === liveSizeNow || !smokeSids.some((s) => appended.includes(s)), `before=${liveBefore} after=${liveSizeNow}`);
  chk("sandbox log path is under the sandbox", sandboxLog.startsWith(base), sandboxLog);
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}

finish();
