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
//   - the arg shape is THREE keys (unit A, 2026-09-21: providerID/modelID
//     REMOVED — the summarizer resolves from the root config's
//     agent.compaction.model, falling back to the session model; 2026-09-24:
//     the tokens keep knob is GONE — keepMessages is the only keep arg).
//   - the sandbox carries a stub dump_session.cjs so the pre-compaction dump hook (4512fe6) succeeds silently (a dump failure would append a WARNING line and break the byte-exact checks) — mirrors the probe S13 preamble.
// Idempotent re-runs: the sandbox is a FRESH scratchpad subdir each run.
// Run: node .opencode/plugin/tests/compact_memory.smoke.mjs (plain node, exit 0 iff green).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT, freshSandbox, loadRepo, makeChecker } from "./_smoke_base.mjs";

const SANDBOX = freshSandbox("compact_memory");
mkdirSync(path.join(SANDBOX, ".opencode", "temp"), { recursive: true });
const { chk, finish } = makeChecker("COMPACT_MEMORY_SMOKE");

// The pre-compaction dump hook (4512fe6, TODO #152) fires on EVERY dispatch
// and spawns <SANDBOX>/.opencode/agent/scripts/db/dump_session.cjs. The stub
// below (mirrors the probe S13 preamble) makes every dump SUCCEED, so the
// hook appends nothing to the byte-exact response checks (a missing script
// would append a WARNING line and break them).
const FAKE_DUMP = `// probe fake dump — mimics dump_session.cjs's __dirname OUT_DIR + --out
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const OUT_DIR = path.resolve(__dirname, "..", "..", "..", "archive", "sessions");
const argv = process.argv.slice(2);
let sid = null, rel = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--out") { rel = argv[++i]; }
  else if (!argv[i].startsWith("-")) { sid = argv[i]; }
}
if (!sid || rel == null) { console.error("fake-dump: need <sid> --out <rel>"); process.exit(2); }
const file = path.join(OUT_DIR, rel);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, "FAKE DUMP of " + sid + "\\n");
`;
const DUMP_SCRIPT = path.join(SANDBOX, ".opencode", "agent", "scripts", "db", "dump_session.cjs");
mkdirSync(path.dirname(DUMP_SCRIPT), { recursive: true });
writeFileSync(DUMP_SCRIPT, FAKE_DUMP, "utf8");

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

// ---- the compaction-config seed (consolidation 2026-09-22): the caps are
// CONFIGURED in the sandbox budget file's top-level model_budget map (bare
// model id → cap + the "default" key). writeBudget stringifies the WHOLE
// parsed object, so this key survives every budget increment below.
writeFileSync(storePath, JSON.stringify({
  version: 2,
  sessions: {},
  model_budget: { "Qwen3.8-27B-IQ4KT-120K": 3, "Qwen-IQ3-Test": 5, default: 1 },
}, null, 2) + "\n");

const mod = await loadRepo(".opencode/plugin/compact_memory.ts");
const factory = mod.default;
chk("default export is the async plugin factory", typeof factory === "function" && factory.constructor.name === "AsyncFunction");
chk("named export resolveCap is a function", typeof mod.resolveCap === "function");
chk("named export readCompactionConfig is a function", typeof mod.readCompactionConfig === "function");

// ---- cap fixtures (model_budget map — the CPU guard is the SAFETY
// INVARIANT; an unlisted / typo'd id simply never matches → the configured
// default)
{
  const c = (name) => mod.resolveCap(SANDBOX, name);
  chk("cap exact model_budget key -> configured 5", c("Qwen-IQ3-Test").cap === 5 && c("Qwen-IQ3-Test").label === "model_budget");
  chk("cap configured model id -> 3 (the configured value for that model ID)", c("Qwen3.8-27B-IQ4KT-120K").cap === 3 && c("Qwen3.8-27B-IQ4KT-120K").label === "model_budget");
  chk("cap unlisted model -> configured default 1", c("Mystery-7B").cap === 1 && c("Mystery-7B").label === "model_budget default");
  chk("cap typo key -> configured default 1 (wrong key never matches)", c("Qwen-IQ3-Test-typO").cap === 1);
  chk("cap CPU -> 0 (excluded — the safety invariant)", c("CPU-Qwen3-0.6B").cap === 0 && c("CPU-Qwen3-0.6B").label === "cpu (excluded)");
}

// ---- readCompactionConfig fail-open (absent file / malformed keys →
// defaults; valid keys win)
{
  const emptyRoot = freshSandbox("compact_memory_cfg");
  const c0 = mod.readCompactionConfig(emptyRoot);
  chk("cfg absent file -> defaults 12/false/{}", c0.keepMessages === 12 && c0.emergencyRecovery === false && JSON.stringify(c0.model_budget) === "{}");
  const p = path.join(emptyRoot, ".opencode", "temp");
  mkdirSync(p, { recursive: true });
  writeFileSync(path.join(p, "compact_budget.json"), `{"keepMessages": 9, "emergencyRecovery": true, "model_budget": {"M": 5, "bad": "x", "neg": -1}}`, "utf8");
  const c1 = mod.readCompactionConfig(emptyRoot);
  chk("cfg valid keys win + bad values skipped (bad/neg dropped, valid kept)",
    c1.keepMessages === 9 && c1.emergencyRecovery === true && c1.model_budget.M === 5 && c1.model_budget.bad == null && c1.model_budget.neg == null,
    JSON.stringify(c1));
  writeFileSync(path.join(p, "compact_budget.json"), `{ oops — not json`, "utf8");
  const c2 = mod.readCompactionConfig(emptyRoot);
  chk("cfg unparseable file -> defaults (never throws)", c2.keepMessages === 12 && c2.emergencyRecovery === false);
}

// ---- the dump hook's node resolver (the live host's execPath is the opencode
// CLI binary, not a node runtime — a wrong spawn fails the dump safely but the
// corpus dump would never happen; plain node paths must pass through untouched)
{
  const r = mod.resolveNodeExe;
  chk("resolveNodeExe: plain node path passes through unchanged",
    r("C:\\Program Files\\nodejs\\node.exe") === "C:\\Program Files\\nodejs\\node.exe",
    JSON.stringify(r("C:\\Program Files\\nodejs\\node.exe")));
  chk("resolveNodeExe: opencode CLI binary falls back to the PATH 'node'",
    r("C:\\x\\opencode.exe") === "node",
    JSON.stringify(r("C:\\x\\opencode.exe")));
  const live = r();
  chk("resolveNodeExe(): live default basename starts with 'node' (plain-node smoke host)",
    typeof live === "string" && path.basename(live).toLowerCase().startsWith("node"),
    JSON.stringify(live));
}

// ---- client stubs (recording; error specs per call count)
const makeClient = (spec = {}) => {
  const rec = { summarize: [], compact: [], messages: [], prompt: [] };
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
  if (spec.promptAsync) client.session.promptAsync = (o) => { rec.prompt.push(o); return Promise.resolve(true); };
  return { client, rec };
};
const toolCtx = (over = {}) => ({ sessionID: "ses_sm_self", directory: SANDBOX, extra: { model: { id: "Qwen3.8-27B-IQ4KT-120K", providerID: "llama-swap" } }, ...over });
const withClient = async (spec = {}) => {
  const { client, rec } = makeClient(spec);
  const reg = await factory({ client });
  const t = reg.tool.compact_memory;
  return { rec, t, exec: (args, extra) => t.execute(args, toolCtx(extra)) };
};

// ---- registration shape (unit A: THREE args — the override pair is GONE,
// the tokens keep knob is GONE)
{
  const { t } = await withClient({ summarize: true });
  chk("factory returns { tool: { compact_memory } }", t != null);
  chk("reg shape: description string + async execute", typeof t.description === "string" && typeof t.execute === "function" && t.execute.constructor.name === "AsyncFunction");
  chk("reg args: THREE keys (sessionID, keepMessages, message)",
    JSON.stringify(Object.keys(t.args)) === JSON.stringify(["sessionID", "keepMessages", "message"]),
    JSON.stringify(Object.keys(t.args)));
  chk("reg args: every value is a zod schema (safeParse)", Object.values(t.args).every((s) => typeof s.safeParse === "function"));
}

// ---- self summarize success (the ACTIVE path on this build)
{
  const { rec, exec } = await withClient({ summarize: true });
  const res = await exec({ keepMessages: 7 });
  await drain();
  chk("summarize dispatched: call recorded (path + body.keep.messages only, NO tokens key + providerID/modelID)",
    rec.summarize.length === 1 && rec.summarize[0].path.id === "ses_sm_self" &&
    rec.summarize[0].body.keep.messages === 7 && rec.summarize[0].body.keep.tokens == null &&
    rec.summarize[0].body.providerID === "llama-swap" && rec.summarize[0].body.modelID === "Qwen3.8-27B-IQ4KT-120K",
    JSON.stringify(rec.summarize[0]));
  chk("response IS the dispatch line (never a success claim)", res === dispatchLine("ses_sm_self", "summarize", "Qwen3.8-27B-IQ4KT-120K"), JSON.stringify(res.slice(0, 160)));
  const st = readStore();
  chk("budget increment-on-verified-success (count 1 after drain)", st.sessions.ses_sm_self?.count === 1, JSON.stringify(st.sessions.ses_sm_self));
  const line = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_self"));
  chk("COMPACT line written with model field + keep args (messages only)", line != null && / COMPACT ses_sm_self messages=7$/.test(line) && line.includes("Qwen3.8-27B-IQ4KT-120K"), JSON.stringify(line));
  const dumpFile = path.join(SANDBOX, ".opencode", "archive", "sessions", "compaction_dumps", "ses_sm_self_c0.md");
  chk("dump hook fired on the tool path: compaction_dumps/ses_sm_self_c0.md exists (the stub dump, no WARNING appended)", existsSync(dumpFile), dumpFile);
  const DT = "\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}";
  const dumpOk = readLog().trim().split("\n").find((l) => l.includes("DUMP-OK ses_sm_self"));
  // #78 re-pin: the elapsed-ms field gained the `ms=` prefix (was bare `<ms>`)
  chk("DUMP-OK line on success: `<stamp> DUMP-OK ses_sm_self compaction_dumps/ses_sm_self_c0.md ms=<ms>`",
    dumpOk != null && new RegExp(`^${DT} DUMP-OK ses_sm_self compaction_dumps/ses_sm_self_c0\\.md ms=\\d+$`).test(dumpOk),
    JSON.stringify(dumpOk));
}

// ---- keep rejected once -> retried without keep (the note is console.log'd)
{
  const boom = Object.assign(new Error("404 unexpected field"), { status: 404 });
  const { rec, exec } = await withClient({ summarize: true, summarizeError: (n) => (n === 1 ? boom : null) });
  const { res, logs } = await captureConsole(async () => {
    const r = await exec({ keepMessages: 3, sessionID: "ses_sm_retry" });
    await drain();
    return r;
  });
  chk("retry once w/o keep (2nd call carries providerID/modelID)",
    rec.summarize.length === 2 && rec.summarize[0].body.keep.messages === 3 && rec.summarize[0].body.keep.tokens == null && rec.summarize[1].body.keep == null &&
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
  const res = await exec({ keepMessages: 2, sessionID: "ses_sm_v2" });
  await drain();
  chk("compact branch wins: flat call, no summarize",
    rec.compact.length === 1 && rec.compact[0].sessionID === "ses_sm_v2" && rec.summarize.length === 0,
    JSON.stringify(rec.compact));
  chk("v2 response: dispatch line naming the compact call", res.includes(dispatchLine("ses_sm_v2", "compact", "Qwen3.8-27B-IQ4KT-120K")) && !/compacted/i.test(res), JSON.stringify(res.slice(0, 160)));
  chk("v2 success consumed the budget (model recorded)", readStore().sessions.ses_sm_v2?.count === 1 && readStore().sessions.ses_sm_v2?.model === "Qwen3.8-27B-IQ4KT-120K");
}

// ---- the config-resolved summarizer (unit A: agent.compaction.model — the
// root config is read PER CALL from the sandbox root: opencode.jsonc first,
// opencode.json second, "" when neither; the file is removed after each case
// so the other cases see the fallback path)
const CFG_PATH = path.join(SANDBOX, "opencode.jsonc");
{
  const { rec, exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "Session-Model-120K", providerID: "llama-swap" } }] });
  writeFileSync(CFG_PATH, `{\n  // root config (JSONC)\n  "agent": { "compaction": { "model": "llama-swap/Gemma4-12B-Q4KXL-MTP-128K" } }\n}`, "utf8");
  const res = await exec({ sessionID: "ses_sm_cfg", keepMessages: 3 });
  await drain();
  rmSync(CFG_PATH, { force: true });
  chk("config set: summarize body carries the CONFIG pair (not the session model)",
    rec.summarize.length === 1 && rec.summarize[0].path.id === "ses_sm_cfg" &&
    rec.summarize[0].body.providerID === "llama-swap" && rec.summarize[0].body.modelID === "Gemma4-12B-Q4KXL-MTP-128K" &&
    rec.summarize[0].body.keep.messages === 3 && rec.summarize[0].body.keep.tokens == null,
    JSON.stringify(rec.summarize[0]));
  chk("config set: dispatch line names the config model + budget under the target id",
    res === dispatchLine("ses_sm_cfg", "summarize", "Gemma4-12B-Q4KXL-MTP-128K") && readStore().sessions.ses_sm_cfg?.count === 1,
    JSON.stringify(res.slice(0, 160)));
}
{
  const { rec, exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "IQ4-fb", providerID: "llama-swap" } }] });
  writeFileSync(CFG_PATH, `{\n  // "agent": {\n  //   "compaction": { "model": "llama-swap/Gemma4-12B-Q4KXL-MTP-128K" }\n  // },\n  "models": {}\n}`, "utf8");
  await exec({ sessionID: "ses_sm_cfgco", keepMessages: 1 });
  await drain();
  rmSync(CFG_PATH, { force: true });
  chk("config commented-out: the FALLBACK session-model pair is used (comment-aware JSONC parse)",
    rec.summarize.length === 1 && rec.summarize[0].body.providerID === "llama-swap" && rec.summarize[0].body.modelID === "IQ4-fb",
    JSON.stringify(rec.summarize[0]));
}
{
  const { rec, exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "IQ4-fb", providerID: "llama-swap" } }] });
  writeFileSync(CFG_PATH, "{ oops — not json", "utf8");
  await exec({ sessionID: "ses_sm_cfgbad", keepMessages: 1 });
  await drain();
  rmSync(CFG_PATH, { force: true });
  chk("config malformed (unparseable): the FALLBACK session-model pair is used (never throws)",
    rec.summarize.length === 1 && rec.summarize[0].body.providerID === "llama-swap" && rec.summarize[0].body.modelID === "IQ4-fb",
    JSON.stringify(rec.summarize[0]));
}

// ---- no-client core (cm_v2 folded): never throws, names the probes, ZERO
// side effects
{
  const reg = await factory({}); // no client, no api
  let threw = false, res = "";
  try {
    res = await reg.tool.compact_memory.execute({ keepMessages: 12, sessionID: "ses_sm_nocli" }, toolCtx({ sessionID: "ses_sm_nocli" }));
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
  const res = await exec({ keepMessages: 1, sessionID: "ses_sm_cross" });
  await drain();
  const st = readStore();
  chk("cross model read: last entry, IQ3 cap 1, one increment",
    rec.messages.length === 1 && rec.messages[0].path.id === "ses_sm_cross" &&
    st.sessions.ses_sm_cross?.model === "Qwen3.8-27B-IQ3KT-210K" && st.sessions.ses_sm_cross?.count === 1 && /dispatched/i.test(res) && !/compacted/i.test(res),
    JSON.stringify(st.sessions.ses_sm_cross));
}

// ---- gate: cross-session model read — DUAL SHAPE: the in-process client's
// RequestResult wrapper { data: [...] } resolves IDENTICALLY to the bare
// array (the bare-array case above stays the regression pin)
{
  const { rec, exec } = await withClient({ summarize: true, messages: { data: [{ info: { modelID: "Qwen3.8-27B-IQ3KT-210K", providerID: "llama-swap" }, parts: [] }] } });
  const res = await exec({ keepMessages: 1, sessionID: "ses_sm_crosswrap" });
  await drain();
  const st = readStore();
  chk("cross model read ({ data } wrapper): same resolution — model + providerID, empty note, IQ3 cap 1, one increment",
    rec.messages.length === 1 && rec.messages[0].path.id === "ses_sm_crosswrap" &&
    st.sessions.ses_sm_crosswrap?.model === "Qwen3.8-27B-IQ3KT-210K" && st.sessions.ses_sm_crosswrap?.count === 1 &&
    /dispatched/i.test(res) && !/compacted/i.test(res) && !/model read/i.test(res),
    JSON.stringify(st.sessions.ses_sm_crosswrap));
}

// ---- cross read FAILED (RPC error): the request is NOT sent, note in response
{
  const { exec } = await withClient({ summarize: true, messagesError: new Error("boom-rpc") });
  let threw = false, res = "";
  try { res = await exec({ keepMessages: 1, sessionID: "ses_sm_rpc" }); await drain(); } catch { threw = true; }
  chk("rpc fail: not sent, never throws, note names the read failure, no budget",
    !threw && /no resolvable model/i.test(res) && /NOT sent/i.test(res) && /model read/i.test(res) && readStore().sessions.ses_sm_rpc == null,
    String(res).slice(0, 160));
}

// ---- the `message` arg (unit A): the queued promptAsync is COMMENTED OUT
// (maintainer temp fix 0f192e5, 2026-09-22 — it killed the SELF-compaction
// queued-message race): NO prompt is sent, but the response STILL carries
// the queued note. RE-PINNED 2026-09-22 per the maintainer's ruling
// (pin the current behavior — do NOT deactivate/skip, do NOT restore the
// promptAsync; TODO #81)
{
  const { rec, exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "IQ4-x", providerID: "llama-swap" } }], promptAsync: true });
  const res = await exec({ message: "resume unit-3", sessionID: "ses_sm_msg" });
  await drain();
  chk("message arg: NO queued promptAsync (temp fix 0f192e5 — the prompt is not sent)",
    rec.prompt.length === 0,
    JSON.stringify(rec.prompt));
  chk("message arg: response = the dispatch line + the queued note (the message itself NOT in the response)",
    res === `${dispatchLine("ses_sm_msg", "summarize", "IQ4-x")}\nThe message was queued for ses_sm_msg (delivered on its resume).` && !res.startsWith("resume unit-3"),
    JSON.stringify(res));
  chk("message arg: budget incremented under the target id", readStore().sessions.ses_sm_msg?.count === 1);
}
// ---- message WITHOUT promptAsync on the client: NO prompt sent, the
// dispatch response carries the WARNING
{
  const { rec, exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "IQ4-y", providerID: "llama-swap" } }] });
  const res = await exec({ message: "resume unit-4", sessionID: "ses_sm_nomsg" });
  await drain();
  chk("no promptAsync: NO prompt sent, the response carries the NOT-queued WARNING",
    rec.prompt.length === 0 && res.includes("WARNING: the message was NOT queued for ses_sm_nomsg (client.session.promptAsync unavailable)."),
    JSON.stringify(res));
}

// ---- gate: allow-allow-allow then deny (IQ4 cap 3), increment-on-verified-success
{
  const { rec, exec } = await withClient({ summarize: true });
  let res3 = "";
  for (let i = 0; i < 3; i++) {
    res3 = await exec({ keepMessages: 1, sessionID: "ses_sm_gate" });
    await drain();
  }
  const res4 = await exec({ keepMessages: 1, sessionID: "ses_sm_gate" });
  await drain();
  chk("gate: 3rd allowed (dispatched), 4th denied (cap 3, 3/3, hand-over note)",
    rec.summarize.length === 3 && /dispatched/i.test(res3) && /refused/i.test(res4) && res4.includes("cap 3") && res4.includes("3/3") && /hand over/i.test(res4),
    res4.slice(0, 160));
  chk("gate: exactly 3 increments", readStore().sessions.ses_sm_gate?.count === 3);
}

// ---- keep defaults from the budget file config (consolidation 2026-09-22):
// keepMessages seeds the COMPACT line when the arg is omitted; the explicit
// arg STILL wins over the file config (the key is removed again after the
// case so the later fixtures see the defaults)
{
  const st = readStore();
  st.keepMessages = 9;
  writeFileSync(storePath, JSON.stringify(st, null, 2) + "\n");
  const { exec } = await withClient({ summarize: true });
  await exec({ sessionID: "ses_sm_keepcfg" });
  await drain();
  const line = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_keepcfg"));
  chk("config keep: COMPACT line reports the configured messages=9 when the arg is omitted",
    line != null && /COMPACT ses_sm_keepcfg messages=9$/.test(line),
    JSON.stringify(line));
  await exec({ keepMessages: 2, sessionID: "ses_sm_keepargs" });
  await drain();
  const line2 = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_keepargs"));
  chk("config keep: explicit keep arg still wins over the file config",
    line2 != null && /COMPACT ses_sm_keepargs messages=2$/.test(line2),
    JSON.stringify(line2));
  const st2 = readStore();
  delete st2.keepMessages;
  writeFileSync(storePath, JSON.stringify(st2, null, 2) + "\n");
}

// ---- failing background compaction: NO increment, the failure is console.error'd
{
  const { rec, exec } = await withClient({ summarize: true, summarizeError: new Error("boom-plain") });
  const { res, errors } = await captureConsole(async () => {
    const r = await exec({ keepMessages: 1, sessionID: "ses_sm_fail" });
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
  // the synthetic v1 fixture also carries the top-level model_budget config
  // (a real v1 file never had it — the point is the LENIENT read of the
  // old shape + the bump on write; the config key is read alongside)
  const v1 = { version: 1, maxPerSession: 2, model_budget: { "Qwen-IQ4-X": 3, default: 1 }, sessions: { ses_sm_v1: { count: 1, updated: "2026-09-01T00:00:00.000Z" } } };
  writeFileSync(storePath, JSON.stringify(v1, null, 2) + "\n");
  const { exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "Qwen-IQ4-X", providerID: "llama-swap" } }] });
  const res = await exec({ keepMessages: 1, sessionID: "ses_sm_v1" });
  await drain();
  const st2 = readStore();
  chk("lenient v1 read + bump on write (count 1 -> 2, model from the messages read)",
    /dispatched/i.test(res) && st2.version === 2 && st2.sessions.ses_sm_v1.count === 2 && st2.sessions.ses_sm_v1.model === "Qwen-IQ4-X",
    JSON.stringify(st2));
}

// ---- the dump spawn's stderr capture (#78: "ignore" → "pipe" — a DUMP-FAIL
// now carries the child's stderr; the child writes one stdout line + repo
// files, so no pipe-buffer risk at the measured tens-of-ms dump cost; pinned
// on the source — the live spawn is exercised by the DUMP-OK case above)
{
  const src = readFileSync(path.join(REPO_ROOT, ".opencode", "plugin", "compact_memory.ts"), "utf8");
  const spawnIdx = src.indexOf("execFileSync(resolveNodeExe()");
  const spawn = src.slice(spawnIdx, spawnIdx + 260);
  chk("dump spawn: stdio 'pipe' (stderr capture for the DUMP-FAIL detail)",
    spawnIdx >= 0 && /stdio:\s*"pipe"/.test(spawn),
    spawn);
}

finish();
