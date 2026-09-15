// compact_memory.smoke.mjs — the plugin-registered compaction tool.
// FOLDED from the scratchpad smokes cm_v2_smoke.mjs (no-client core) +
// qc_smoke/smoke.mjs (S13 plugin smoke) per the 2026-09-15_smoke-harness-home
// proposal. Adapted at build time to the 2026-09-14 FIRE-AND-FORGET build of
// .opencode/plugin/compact_memory.ts (the source of truth):
//   - `execute` returns the DISPATCH line (never a success claim); the budget
//     increment + the COMPACT line land ONLY in the async success callback, so
//     side-effect assertions run after a `drain` (~25 ms — local stubs settle
//     on microtasks well before that).
//   - the retry-keep note + the background failure go to console.log /
//     console.error — captured, not returned.
//   - the arg shape is SIX keys (providerID/modelID added for the maintainer's
//     round-2 explicit-pair override — that case replaces cm_v2's retired
//     context.api / context.session.id source checks).
// Idempotent re-runs: the sandbox is a FRESH scratchpad subdir each run.
// Run: node .opencode/plugin/tests/compact_memory.smoke.mjs (plain node, exit 0 iff green).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { freshSandbox, loadRepo, makeChecker } from "./_smoke_base.mjs";

const SANDBOX = freshSandbox("compact_memory");
mkdirSync(path.join(SANDBOX, ".opencode", "temp"), { recursive: true });
const { chk, finish } = makeChecker("COMPACT_MEMORY_SMOKE");

const drain = (ms = 25) => new Promise((r) => setTimeout(r, ms));
// Captures console.log + console.error across an async fn (the fire-and-forget
// notes/errrors are terminal output, not response text).
const captureConsole = (fn) => {
  const logs = [], errors = [];
  const ol = console.log, oe = console.error;
  console.log = (...a) => logs.push(a.map(String).join(" "));
  console.error = (...a) => errors.push(a.map(String).join(" "));
  return Promise.resolve()
    .then(fn)
    .then(
      (res) => { console.log = ol; console.error = oe; return { res, logs, errors }; },
      (err) => { console.log = ol; console.error = oe; throw err; },
    );
};
// The exact dispatch line (byte form per the plugin source — em dash included).
const dispatchLine = (sid, which, model) =>
  `Compaction dispatched for ${sid} (background, fire-and-forget) — the ${which} call was sent (model: ${model}); the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success.`;

const storePath = path.join(SANDBOX, ".opencode", "temp", "compact_budget.json");
const logPath = path.join(SANDBOX, ".opencode", "temp", "ctx.log");
const readStore = () =>
  existsSync(storePath) ? JSON.parse(readFileSync(storePath, "utf8")) : { version: 2, sessions: {} };
const readLog = () => (existsSync(logPath) ? readFileSync(logPath, "utf8") : "");

const mod = await loadRepo(".opencode/plugin/compact_memory.ts");
const factory = mod.default;
chk("default export is the async plugin factory", typeof factory === "function" && factory.constructor.name === "AsyncFunction");
chk("named export classifyQuantClass is a function", typeof mod.classifyQuantClass === "function");

// ---- classifier fixtures (order is part of the semantics — the trap must
// hit the 4-bit row, not the 3-bit one)
{
  const c = mod.classifyQuantClass;
  chk("clf IQ4 -> 3", c("Qwen-IQ4-Test").cap === 3);
  chk("clf IQ3 -> 1", c("Qwen-IQ3-Test").cap === 1);
  chk("clf Q4KM -> 3", c("Gemma-Q4KM-12B").cap === 3);
  chk("clf CPU -> 0 (excluded)", c("CPU-Qwen3-0.6B").cap === 0);
  chk("clf unknown -> 1 (default)", c("Mystery-7B").cap === 1);
  chk("clf trap Qwen3.8-27B-IQ4KT-120K -> 3 (not the 3-bit row)", c("Qwen3.8-27B-IQ4KT-120K").cap === 3);
}

// ---- client stubs (recording; error specs per call count)
const makeClient = (spec = {}) => {
  const rec = { summarize: [], compact: [], messages: [] };
  const client = { session: {} };
  if (spec.summarize) client.session.summarize = (o) => {
    rec.summarize.push(o);
    if (spec.summarizeError != null) {
      const e = typeof spec.summarizeError === "function" ? spec.summarizeError(rec.summarize.length) : spec.summarizeError;
      if (e != null) return Promise.reject(e); // null = this call is clean (the retry)
    }
    return Promise.resolve(true); // the handler's real return: boolean true
  };
  if (spec.compact) client.session.compact = (o) => { rec.compact.push(o); return Promise.resolve(true); };
  if (spec.messages != null || spec.messagesError) client.session.messages = (o) => {
    rec.messages.push(o);
    if (spec.messagesError) return Promise.reject(spec.messagesError);
    return Promise.resolve(spec.messages);
  };
  return { client, rec };
};
const toolCtx = (over = {}) => ({ sessionID: "ses_sm_self", directory: SANDBOX, extra: { model: { id: "Qwen3.8-27B-IQ4KT-120K", providerID: "llama-swap" } }, ...over });
const withClient = async (spec = {}) => {
  const { client, rec } = makeClient(spec);
  const reg = await factory({ client });
  const t = reg.tool.compact_memory;
  return { rec, t, exec: (args, extra) => t.execute(args, toolCtx(extra)) };
};

// ---- registration shape (FIRE-AND-FORGET build: SIX args)
{
  const { t } = await withClient({ summarize: true });
  chk("factory returns { tool: { compact_memory } }", t != null);
  chk("reg shape: description string + async execute", typeof t.description === "string" && typeof t.execute === "function" && t.execute.constructor.name === "AsyncFunction");
  chk("reg args: SIX keys (sessionID, providerID, modelID, keepTokens, keepMessages, message)",
    JSON.stringify(Object.keys(t.args)) === JSON.stringify(["sessionID", "providerID", "modelID", "keepTokens", "keepMessages", "message"]),
    JSON.stringify(Object.keys(t.args)));
  chk("reg args: every value is a zod schema (safeParse)", Object.values(t.args).every((s) => typeof s.safeParse === "function"));
}

// ---- self summarize success (the ACTIVE path on this build)
{
  const { rec, exec } = await withClient({ summarize: true });
  const res = await exec({ keepTokens: 42000, keepMessages: 7 });
  await drain();
  chk("summarize dispatched: call recorded (path + body.keep + providerID/modelID)",
    rec.summarize.length === 1 && rec.summarize[0].path.id === "ses_sm_self" &&
    rec.summarize[0].body.keep.tokens === 42000 && rec.summarize[0].body.keep.messages === 7 &&
    rec.summarize[0].body.providerID === "llama-swap" && rec.summarize[0].body.modelID === "Qwen3.8-27B-IQ4KT-120K",
    JSON.stringify(rec.summarize[0]));
  chk("response IS the dispatch line (never a success claim)", res === dispatchLine("ses_sm_self", "summarize", "Qwen3.8-27B-IQ4KT-120K"), JSON.stringify(res.slice(0, 160)));
  const st = readStore();
  chk("budget increment-on-verified-success (count 1 after drain)", st.sessions.ses_sm_self?.count === 1, JSON.stringify(st.sessions.ses_sm_self));
  const line = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_self"));
  chk("COMPACT line written with model field + keep args", line != null && / COMPACT ses_sm_self tokens=42000 messages=7$/.test(line) && line.includes("Qwen3.8-27B-IQ4KT-120K"), JSON.stringify(line));
}

// ---- keep rejected once -> retried without keep (the note is console.log'd)
{
  const boom = Object.assign(new Error("404 unexpected field"), { status: 404 });
  const { rec, exec } = await withClient({ summarize: true, summarizeError: (n) => (n === 1 ? boom : null) });
  const { res, logs } = await captureConsole(async () => {
    const r = await exec({ keepTokens: 101, keepMessages: 3, sessionID: "ses_sm_retry" });
    await drain();
    return r;
  });
  chk("retry once w/o keep (2nd call carries providerID/modelID)",
    rec.summarize.length === 2 && rec.summarize[0].body.keep.tokens === 101 && rec.summarize[1].body.keep == null &&
    rec.summarize[1].body.providerID === "llama-swap" && rec.summarize[1].body.modelID === "Qwen3.8-27B-IQ4KT-120K",
    JSON.stringify(rec.summarize));
  chk("retry note is console.log'd (not in the response)",
    logs.some((l) => l === "compact_memory (ses_sm_retry): keep not accepted by this build (retried without the keep fields)"),
    JSON.stringify(logs));
  chk("response is still the dispatch line + the cross-model note",
    /dispatched/i.test(res) && !/compacted/i.test(res) && res.includes("cross-session model read unavailable"),
    JSON.stringify(res.slice(0, 160)));
  chk("retry success consumed the budget exactly once", readStore().sessions.ses_sm_retry?.count === 1);
}

// ---- v2 compact path (flat parameters; no keep fields)
{
  const { rec, exec } = await withClient({ summarize: true, compact: true });
  const res = await exec({ keepTokens: 5, keepMessages: 2, sessionID: "ses_sm_v2" });
  await drain();
  chk("compact branch wins: flat call, no summarize",
    rec.compact.length === 1 && rec.compact[0].sessionID === "ses_sm_v2" && rec.summarize.length === 0,
    JSON.stringify(rec.compact));
  chk("v2 response: dispatch line naming the compact call", res.includes(dispatchLine("ses_sm_v2", "compact", "Qwen3.8-27B-IQ4KT-120K")) && !/compacted/i.test(res), JSON.stringify(res.slice(0, 160)));
  chk("v2 success consumed the budget (model recorded)", readStore().sessions.ses_sm_v2?.count === 1 && readStore().sessions.ses_sm_v2?.model === "Qwen3.8-27B-IQ4KT-120K");
}

// ---- the explicit providerID+modelID override (round-2 path — replaces
// cm_v2's retired context.api / context.session.id source checks)
{
  const { rec, exec } = await withClient({ summarize: true });
  const res = await exec({ sessionID: "ses_sm_explicit", providerID: "llama-swap", modelID: "Qwen3.8-27B-IQ4KT-120K", keepTokens: 7, keepMessages: 3 });
  await drain();
  chk("explicit pair: body carries the override verbatim (no model read performed)",
    rec.summarize.length === 1 && rec.summarize[0].path.id === "ses_sm_explicit" &&
    rec.summarize[0].body.providerID === "llama-swap" && rec.summarize[0].body.modelID === "Qwen3.8-27B-IQ4KT-120K" &&
    rec.summarize[0].body.keep.tokens === 7 && rec.summarize[0].body.keep.messages === 3,
    JSON.stringify(rec.summarize[0]));
  chk("explicit pair: dispatch line names the override model", res === dispatchLine("ses_sm_explicit", "summarize", "Qwen3.8-27B-IQ4KT-120K"), JSON.stringify(res.slice(0, 160)));
  chk("explicit pair: budget incremented under the target id", readStore().sessions.ses_sm_explicit?.count === 1);
}

// ---- no-client core (cm_v2 folded): never throws, names the probes, ZERO
// side effects
{
  const reg = await factory({}); // no client, no api
  let threw = false, res = "";
  try {
    res = await reg.tool.compact_memory.execute({ keepTokens: 30000, keepMessages: 12, sessionID: "ses_sm_nocli" }, toolCtx({ sessionID: "ses_sm_nocli" }));
    await drain();
  } catch (e) { threw = true; res = String(e); }
  chk("no-client path never throws", !threw, res);
  chk("no-client error names what was probed",
    /Compaction request failed/.test(res) && /compact/i.test(res) && /summarize/i.test(res) && /function/i.test(res),
    res);
  chk("no-client: budget NOT consumed", readStore().sessions.ses_sm_nocli == null, JSON.stringify(readStore().sessions));
  chk("no-client: no COMPACT line", !readLog().includes("COMPACT ses_sm_nocli"));
}

// ---- gate: CPU is always denied (cap 0), zero side effects
{
  const { rec, exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "CPU-Qwen3-0.6B" } }] });
  const res = await exec({ sessionID: "ses_sm_cpu" });
  await drain();
  chk("cpu denied: no call, no budget entry, cap 0 named",
    rec.summarize.length === 0 && readStore().sessions.ses_sm_cpu == null && /refused/i.test(res) && res.includes("cap 0") && /hand over/i.test(res),
    res);
}

// ---- gate: cross-session model read (LAST entry of the messages RPC)
{
  const { rec, exec } = await withClient({ summarize: true, messages: [{ info: { model: "user-x" } }, { info: { modelID: "Qwen3.8-27B-IQ3KT-210K", providerID: "llama-swap" } }] });
  const res = await exec({ keepTokens: 1, keepMessages: 1, sessionID: "ses_sm_cross" });
  await drain();
  const st = readStore();
  chk("cross model read: last entry, IQ3 cap 1, one increment",
    rec.messages.length === 1 && rec.messages[0].path.id === "ses_sm_cross" &&
    st.sessions.ses_sm_cross?.model === "Qwen3.8-27B-IQ3KT-210K" && st.sessions.ses_sm_cross?.count === 1 && /dispatched/i.test(res) && !/compacted/i.test(res),
    JSON.stringify(st.sessions.ses_sm_cross));
}

// ---- cross read FAILED (RPC error): the request is NOT sent, note in response
{
  const { exec } = await withClient({ summarize: true, messagesError: new Error("boom-rpc") });
  let threw = false, res = "";
  try { res = await exec({ keepTokens: 1, keepMessages: 1, sessionID: "ses_sm_rpc" }); await drain(); } catch { threw = true; }
  chk("rpc fail: not sent, never throws, note names the read failure, no budget",
    !threw && /no resolvable model/i.test(res) && /NOT sent/i.test(res) && /model read/i.test(res) && readStore().sessions.ses_sm_rpc == null,
    String(res).slice(0, 160));
}

// ---- the `message` arg shape (continuation message + dispatch line)
{
  const { exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "IQ4-x", providerID: "llama-swap" } }] });
  const res = await exec({ message: "resume unit-3", sessionID: "ses_sm_msg" });
  await drain();
  chk("message arg: 'resume unit-3\\n' + the exact dispatch line", res === `resume unit-3\n${dispatchLine("ses_sm_msg", "summarize", "IQ4-x")}`, JSON.stringify(res));
  chk("message arg: budget incremented under the target id", readStore().sessions.ses_sm_msg?.count === 1);
}

// ---- gate: allow-allow-allow then deny (IQ4 cap 3), increment-on-verified-success
{
  const { rec, exec } = await withClient({ summarize: true });
  let res3 = "";
  for (let i = 0; i < 3; i++) {
    res3 = await exec({ keepTokens: 1, keepMessages: 1, sessionID: "ses_sm_gate" });
    await drain();
  }
  const res4 = await exec({ keepTokens: 1, keepMessages: 1, sessionID: "ses_sm_gate" });
  await drain();
  chk("gate: 3rd allowed (dispatched), 4th denied (cap 3, 3/3, hand-over note)",
    rec.summarize.length === 3 && /dispatched/i.test(res3) && /refused/i.test(res4) && res4.includes("cap 3") && res4.includes("3/3") && /hand over/i.test(res4),
    res4.slice(0, 160));
  chk("gate: exactly 3 increments", readStore().sessions.ses_sm_gate?.count === 3);
}

// ---- failing background compaction: NO increment, the failure is console.error'd
{
  const { rec, exec } = await withClient({ summarize: true, summarizeError: new Error("boom-plain") });
  const { res, errors } = await captureConsole(async () => {
    const r = await exec({ keepTokens: 1, keepMessages: 1, sessionID: "ses_sm_fail" });
    await drain();
    return r;
  });
  const crossNote = "cross-session model read unavailable (no client.session.messages) — the calling session's model is used for the budget class";
  chk("fail: the response is STILL the dispatch line + cross note (never a success claim, never a failure)",
    res === `${dispatchLine("ses_sm_fail", "summarize", "Qwen3.8-27B-IQ4KT-120K")}\n${crossNote}`, JSON.stringify(res.slice(0, 160)));
  chk("fail: console.error names the session + the server message",
    errors.some((l) => l.includes("FAILED for ses_sm_fail") && l.includes("boom-plain")),
    JSON.stringify(errors));
  chk("fail: NO budget increment, NO COMPACT line, exactly one call attempted",
    rec.summarize.length === 1 && readStore().sessions.ses_sm_fail == null && !readLog().includes("COMPACT ses_sm_fail"));
}

// ---- v2 schema + lenient v1 read (the schema bump lands on the next write)
{
  const st = readStore();
  const e = st.sessions.ses_sm_gate;
  chk("v2 schema: version 2, count 3, parseable ts, model recorded",
    st.version === 2 && e.count === 3 && !Number.isNaN(Date.parse(e.updated)) && e.model === "Qwen3.8-27B-IQ4KT-120K",
    JSON.stringify({ v: st.version, e }));
  const v1 = { version: 1, maxPerSession: 2, sessions: { ses_sm_v1: { count: 1, updated: "2026-09-01T00:00:00.000Z" } } };
  writeFileSync(storePath, JSON.stringify(v1, null, 2) + "\n");
  const { exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "Qwen-IQ4-X", providerID: "llama-swap" } }] });
  const res = await exec({ keepTokens: 1, keepMessages: 1, sessionID: "ses_sm_v1" });
  await drain();
  const st2 = readStore();
  chk("lenient v1 read + bump on write (count 1 -> 2, model from the messages read)",
    /dispatched/i.test(res) && st2.version === 2 && st2.sessions.ses_sm_v1.count === 2 && st2.sessions.ses_sm_v1.model === "Qwen-IQ4-X",
    JSON.stringify(st2));
}

finish();
