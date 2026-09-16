// compact_memory — the plugin-registered compaction tool (approved proposal
// v2, Parts 1-4: .opencode/proposals/approved/2026-09-12_compact_memory_plugin.md).
// Supersedes the retired custom tool
// .opencode/plugin/deactivated/compact_memory_v1.ts (moved from
// .opencode/tools/compact_memory.ts): the custom-tool context is clientless BY
// DESIGN, so a client-needing tool is registered FROM a plugin — this file's
// plugin function captures `ctx` (which carries the SDK client) and returns
// `tool: { compact_memory: tool({...}) }` (shape per dev_probe_ctx.ts — the
// worked example on this host).
//
// T3 mechanics carried from v1 (byte-identical where pinned):
//   (1) the per-session compaction budget store at
//       .opencode/temp/compact_budget.json, INCREMENT-ON-SUCCESS only — the
//       schema is BUMPED to version 2: each session entry is
//       { count, updated, model } (the model id at the last increment, for
//       transparency — the cap itself lives in the classifier, not in the
//       file); READ LENIENT (v1 files with maxPerSession, entries missing
//       the model key)
//   (2) the COMPACT line in .opencode/temp/ctx.log after each successful
//       compaction (best-effort append, never throws) — the model field is
//       POPULATED from the resolved model id (v1 always wrote it empty, its
//       context had no model)
//   (3) the refusal note (hand over and start fresh) on budget denial
//   (4) the reload directive constant — BYTE-IDENTICAL to v1; it is the
//       DEFAULT response when the `message` arg is absent
//
// Resolution (Part 1): sessionID = args.sessionID ?? c.sessionID (an explicit
// id compacts ANOTHER session). Client path — detected with `typeof` (the SDK
// methods live on the PROTOTYPE — an in-key check sees only `_client`):
// typeof ctx.client?.session?.compact === "function" → v2
// `compact({ sessionID })` (FLAT parameters — the generated v2 types mark the
// options body `never`, so no keep fields); ELSE
// typeof ctx.client?.session?.summarize === "function" → v1
// `summarize({ path: { id }, body })` — THE ACTIVE PATH ON THIS BUILD (the
// client is v1-generation: summarize = function, compact = undefined); ELSE a
// clear error NAMING what was probed (no silent fallback). The body MUST
// carry providerID + modelID — the server's payload schema REQUIRES both
// (the 2026-09-12 live no-op: a missing body was a schema rejection — HTTP
// 404 JSON + a logged WARN, the handler never ran, and this host's client
// does NOT throw on the 404, so the resolved result is verified explicitly —
// a resolved call is success ONLY on the handler's boolean true). Keep
// fields go in the body WHEN GIVEN (unknown fields are ignored by the
// router); on a 404/missing-key/unexpected-field rejection the call is
// retried ONCE without the keep fields and the response reports "keep not
// accepted by this build". An unresolvable model pair → the request is NOT
// sent (a clear failure, no budget burned).
//
// Quant-class compaction budget (Part 2, priority.md #1): the cap is resolved
// AT CALL TIME from the target session's model name — SELF:
// c.extra?.model?.id; CROSS: the LAST entry of
// ctx.client.session.messages({ path: { id } }) (info.modelID — assistant /
// info.model — user); RPC failure / no messages → default cap 1 + a note in
// the response (never a throw). The gate (count from the store vs the cap)
// comes BEFORE any compact call: denial → clear message naming class + cap +
// count, ZERO side effects (no increment, no compact call, no COMPACT line).
//
// NOTE (self-location depth): v1's one-level-up fallback assumed its OLD
// depth (<root>/.opencode/tools/compact_memory.ts); THIS file lives one
// directory deeper at <root>/.opencode/plugin/compact_memory.ts, so the
// fallback is the GRANDPARENT of the file's directory.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tool } from "@opencode-ai/plugin";

// ------------------------------------------------------------------ classifier
//
// The quant-class compaction budget — an ORDERED rule table (Part 2,
// priority.md #1). MAINTAINER-EDITABLE: tune the caps here. THE ORDER IS PART
// OF THE SEMANTICS: "Qwen3.8"/"Qwen3.5" contain the substring "Q3", so CPU
// must be tested FIRST, then 4-bit, then 3-bit, then the default — the probe
// pins this with the "Qwen3.8-27B-IQ4KT-120K" trap (it must hit the 4-bit
// row, not the 3-bit one).
const QUANT_CLASS_RULES: Array<{ test: (name: string) => boolean; cap: number; label: string }> = [
  { test: (name) => /^cpu/i.test(name), cap: 0, label: "cpu (excluded)" },
  // case-insensitive: the LIVE model names are UPPERCASE ("Qwen3.8-27B-IQ4KT-120K")
  { test: (name) => /iq4|q4/i.test(name), cap: 3, label: "4-bit quant" },
  { test: (name) => /iq3|q3/i.test(name), cap: 1, label: "3-bit quant" },
  { test: () => true, cap: 1, label: "default" },
];

// Resolves the compaction cap for a model name: the FIRST matching rule wins
// (the table's order is the semantics). Exported for the probe's classifier
// fixtures.
export function classifyQuantClass(modelName: string): { cap: number; label: string } {
  const name = typeof modelName === "string" ? modelName : "";
  for (const rule of QUANT_CLASS_RULES) {
    if (rule.test(name)) return { cap: rule.cap, label: rule.label };
  }
  return { cap: 1, label: "default" };
}

// ------------------------------------------------------------------ responses
//
// NOTE (2026-09-14): the v1-tool reload directive / the one-line trailer are
// RETIRED from the response — with the fire-and-forget dispatch there is no
// synchronous success response to carry them in. The reload invariant is
// carried by the compaction notification → the post-compaction protocol
// (AGENTS.md Pattern 4 + agent_readme_post_compaction.md) + the NAP.

// v1 reporting defaults — the COMPACT line + the success line report THESE
// when the keep args are omitted (the v1 reporting shape is preserved).
const DEFAULT_KEEP_TOKENS = 30_000;
const DEFAULT_KEEP_MESSAGES = 12;

// ------------------------------------------------------------------ budget store (v2 schema)
//
// The compaction budget, keyed by session id, INCREMENT-ON-SUCCESS only —
// the SAME file the T5 emergency hook (context_recovery.ts) reads/writes
// (shared by FILE — the state must live on disk, not in module memory).
// Schema BUMPED to version 2 (read lenient — v1 files carry maxPerSession
// and entries without the model key):
//   { "version": 2,
//     "sessions": { "<sid>": { "count": <n>, "updated": "<iso ts>", "model": "<id>" } } }
// The cap lives in the classifier, NOT in the file; the stored `model` is
// the id at the last increment (transparency).

type BudgetStoreV2 = {
  version: number;
  sessions: Record<string, { count: number; updated: string; model: string }>;
};

// Project root for the store + ctx.log: the tool context carries `directory`
// (the probe passes the sandbox root); absent → SELF-LOCATION (the GRANDPARENT
// of this file's directory — see the depth note in the header).
const SELF_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function resolveRoot(context: any): string {
  if (context != null && typeof context.directory === "string" && context.directory !== "") {
    return context.directory;
  }
  return SELF_ROOT;
}

function tempDir(root: string): string {
  return path.join(root, ".opencode", "temp");
}

function budgetPath(root: string): string {
  return path.join(tempDir(root), "compact_budget.json");
}

function readBudget(root: string): BudgetStoreV2 {
  try {
    const p = budgetPath(root);
    if (existsSync(p)) {
      const parsed = JSON.parse(readFileSync(p, "utf8"));
      if (parsed != null && typeof parsed === "object" && parsed.sessions != null && typeof parsed.sessions === "object") {
        return parsed as BudgetStoreV2;
      }
    }
  } catch {
    // corrupt/unreadable store → treat as fresh (never throw)
  }
  return { version: 2, sessions: {} };
}

function writeBudget(root: string, store: BudgetStoreV2): void {
  try {
    const dir = tempDir(root);
    mkdirSync(dir, { recursive: true });
    writeFileSync(budgetPath(root), JSON.stringify(store, null, 2) + "\n", "utf8");
  } catch {
    // best effort — a lost increment errs toward ONE extra compaction, never a crash
  }
}

function budgetCount(root: string, sessionID: string): number {
  return readBudget(root).sessions[sessionID]?.count ?? 0;
}

function recordSuccess(root: string, sessionID: string, model: string): void {
  const store = readBudget(root);
  store.version = 2; // the schema bump lands on the first v2 write
  const entry = store.sessions[sessionID] ?? { count: 0, updated: "", model: "" };
  entry.count = (entry.count ?? 0) + 1;
  entry.updated = new Date().toISOString();
  entry.model = typeof model === "string" ? model : (entry.model ?? "");
  store.sessions[sessionID] = entry;
  writeBudget(root, store);
}

// ------------------------------------------------------------------ the COMPACT line
//
// Appends the COMPACT line to `.opencode/temp/ctx.log` after a successful
// compaction (in-process file append — never throws). Shape matches the T2
// line convention — leading `YYYY-MM-DD_HH-MM` local stamp + the optional
// model field (OMITTED when empty) + `COMPACT <session id> tokens=<t>
// messages=<m>` + the optional pre-readout. The model field is POPULATED from
// the RESOLVED model id (Part 3 — v1 always wrote it empty); t/m are the keep
// args WHEN GIVEN, else the v1 reporting defaults (30_000 / 12).

function localStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

function appendCompactLine(root: string, context: any, sessionID: string, model: string, tokens: number, messages: number): void {
  try {
    const dir = tempDir(root);
    mkdirSync(dir, { recursive: true });
    const p = path.join(dir, "ctx.log");
    const modelField = typeof model === "string" ? model : "";
    const preField = context != null && typeof context.preReadout === "string" && context.preReadout !== "" ? context.preReadout : "";
    const line =
      `${localStamp()}${modelField !== "" ? ` ${modelField}` : ""} ` +
      `COMPACT ${sessionID} tokens=${tokens} messages=${messages}` +
      `${preField !== "" ? ` (${preField})` : ""}\n`;
    appendFileSync(p, line, "utf8");
  } catch {
    // best effort — never break the tool over a write failure
  }
}

// ------------------------------------------------------------------ the pre-compaction dump hook
//
// TODO #152 (the "dump function" entry, approved 2026-09-15): before ANY
// compaction dispatch, dump the target session's FULL pre-compaction content
// into the corpus (`.opencode/archive/sessions/`) so the corpus stays complete
// for compacted sessions. The dump is the repo script
// `.opencode/agent/scripts/db/dump_session.cjs <sid> --out <relpath>` (the
// script opens the LIVE host DB `readOnly:true` — it is NEVER written). The
// hook is BEST-EFFORT: it NEVER throws and NEVER blocks the tool — a failure
// appends a DUMP-FAIL line to the ctx log and the dispatch response carries a
// WARNING (the response is UNCHANGED on success — smoke stability).
//
// NO-OVERWRITE naming (the maintainer's --comment): dumps of the same session
// id across compactions are keyed on the tracked compaction budget count
// (`compaction_dumps/<sid>_c<count>.md`); if that exact file already exists on
// disk, a timestamp suffix is added (`..._<YYYYMMDDTHHmmss>.md`) so one dump
// never overwrites another.

// The dump stamp `YYYYMMDDTHHmmss` — computed by the CALLER so the name
// function stays pure / clock-free (the probe pins it byte-exact).
function dumpStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// The pure dump-file NAME (no clock inside): `compaction_dumps/<sid>_c<count>.md`,
// or `compaction_dumps/<sid>_c<count>_<stamp>.md` when a stamp is supplied (the
// no-overwrite fallback). Exported for the probe (byte-exact pinning).
export function preCompactionDumpName(sessionID: string, count: number, stamp: string | null): string {
  const core = `compaction_dumps/${sessionID}_c${count}`;
  return stamp != null ? `${core}_${stamp}.md` : `${core}.md`;
}

// Best-effort append of a DUMP-FAIL line to the ctx log (same append style as
// appendCompactLine — never throws).
function appendDumpFailLine(root: string, sessionID: string, error: string): void {
  try {
    const dir = tempDir(root);
    mkdirSync(dir, { recursive: true });
    const p = path.join(dir, "ctx.log");
    const oneLine = String(error).replace(/\s+/g, " ").trim();
    appendFileSync(p, `${localStamp()} DUMP-FAIL ${sessionID} ${oneLine}\n`, "utf8");
  } catch {
    // best effort — never break the tool over a write failure
  }
}

// Resolves the node executable for the dump-script spawn. The live opencode
// host's execPath is the CLI binary, not a node runtime; a wrong spawn fails
// the dump safely (WARNING) but the corpus dump would never happen. Plain
// node runtimes (node / node.exe / nodejs.exe) pass through untouched;
// anything else falls back to "node" (resolved from PATH — on Windows
// PATHEXT finds node.exe). Exported for the smoke checks.
export function resolveNodeExe(execPath: string = process.execPath): string {
  const base = path.basename(execPath).toLowerCase();
  return base.startsWith("node") ? execPath : "node";
}

// The hook: run the dump script for the target session. Returns { ok, file } on
// success or { ok:false, error } on ANY failure (NEVER throws, NEVER blocks).
// The no-overwrite rule: if the base-name target already exists on disk, the
// name is STAMPED so this dump lands in a fresh file.
export function preCompactionDump(root: string, sessionID: string, count: number): { ok: boolean; file?: string; error?: string } {
  const scriptPath = path.join(root, ".opencode", "agent", "scripts", "db", "dump_session.cjs");
  const archiveDir = path.join(root, ".opencode", "archive", "sessions");
  const baseName = preCompactionDumpName(sessionID, count, null);
  const baseTarget = path.join(archiveDir, baseName);
  const stamp = existsSync(baseTarget) ? dumpStamp() : null;
  const name = preCompactionDumpName(sessionID, count, stamp);
  const target = path.join(archiveDir, name);
  try {
    execFileSync(resolveNodeExe(), [scriptPath, sessionID, "--out", name], { timeout: 60_000, stdio: "pipe" });
    return { ok: true, file: target };
  } catch (err: any) {
    const error =
      typeof err?.message === "string" && err.message !== "" ? err.message : err != null ? String(err) : "dump script failed";
    appendDumpFailLine(root, sessionID, error);
    return { ok: false, error };
  }
}

// ------------------------------------------------------------------ the client call
//
// Detected with `typeof` — the SDK methods live on the PROTOTYPE (an in-key
// check sees only `_client`), so a presence test must be typeof-based.

// A 400 / unexpected-field style error — the "keep not accepted by this
// build" retry trigger (the generated v1 body type has no keep fields).
// A 404 / missing-key / unexpected-field style rejection — the "keep not
// accepted by this build" retry trigger. Covers BOTH failure shapes this
// host produces: a THROWN error (throw-on client) and a RESOLVED 404 JSON
// error object / server message string (throw-off client — the active case).
function isKeepRejectedError(err: any): boolean {
  const status = err?.status ?? err?.data?.status;
  if (status === 404) return true;
  if (err?.name === "BadRequest") return true;
  const msg =
    typeof err?.message === "string"
      ? err.message
      : typeof err?.data?.message === "string"
        ? err.data.message
        : typeof err === "string"
          ? err
          : "";
  return /unexpected field|unknown field|bad request|missing key/i.test(msg);
}

// The resolved result of a summarize/compact call — this host's client does
// NOT throw on a 404 (it resolves with the parsed error object or undefined),
// so a resolved promise is NOT success: success is the handler's boolean
// `true` (full style: { data: true } / { response.ok: true }); anything else
// is a failure carrying the server's message (the ROOT of the 2026-09-12
// live no-op — the old code treated every resolved call as a success).
function compactionFailure(result: any): string {
  if (result === true) return "";
  if (result != null && typeof result === "object") {
    if (result.data === true) return "";
    if (result.response != null && result.response.ok === true) return "";
    const err = result.error;
    const msg =
      typeof err?.data?.message === "string"
        ? err.data.message
        : typeof err?.message === "string"
          ? err.message
          : typeof err === "string"
            ? err
            : "";
    return msg !== "" ? msg : "the server rejected the compaction request (no usable success result)";
  }
  return "the server rejected the compaction request (no usable success result)";
}

function errorMessage(err: any): string {
  const msg =
    typeof err?.data?.message === "string"
      ? err.data.message
      : typeof err?.message === "string"
        ? err.message
        : err != null && typeof err !== "object"
          ? String(err)
          : "";
  return msg !== "" ? msg : "unknown error";
}

// The v1-generation call (THE ACTIVE PATH ON THIS BUILD):
// summarize({ path: { id }, body }). The body ALWAYS carries providerID +
// modelID (REQUIRED by the server payload schema — an unresolvable pair is
// refused BEFORE any call); the keep fields go in the body WHEN GIVEN; on a
// 404/missing-key/unexpected-field rejection the call is retried ONCE without
// the keep fields. Returns { note, error }: error "" = success — the result
// was VERIFIED (a resolved 404 is a failure, never a silent success).
async function callSummarize(
  client: any,
  sessionID: string,
  ref: { providerID: string; modelID: string },
  keep: Record<string, number> | undefined,
): Promise<{ note: string; error: string }> {
  const base: Record<string, unknown> = {};
  if (ref.providerID !== "") base.providerID = ref.providerID;
  if (ref.modelID !== "") base.modelID = ref.modelID;
  const hasKeep = keep != null && Object.keys(keep).length > 0;
  const attempt = (withKeep: boolean): Promise<any> =>
    client.session.summarize({ path: { id: sessionID }, body: withKeep ? { ...base, keep } : base });
  const NOTE = "keep not accepted by this build (retried without the keep fields)";
  try {
    let error = compactionFailure(await attempt(hasKeep));
    if (error !== "" && hasKeep && isKeepRejectedError({ message: error })) {
      const error2 = compactionFailure(await attempt(false));
      if (error2 === "") return { note: NOTE, error: "" };
      error = error2;
    }
    return { note: "", error };
  } catch (err: any) {
    if (hasKeep && isKeepRejectedError(err)) {
      try {
        const error2 = compactionFailure(await attempt(false));
        if (error2 === "") return { note: NOTE, error: "" };
        return { note: "", error: error2 };
      } catch (err2: any) {
        return { note: "", error: errorMessage(err2) };
      }
    }
    return { note: "", error: errorMessage(err) };
  }
}

// Resolves the target session's model PAIR (id + providerID — the server's
// summarize payload REQUIRES both): SELF (no explicit id, or the explicit id
// == the calling session) → c.extra?.model ({ id, providerID }); CROSS → the
// LAST entry of session.messages({ path: { id } }) — info.modelID +
// info.providerID (assistant) / the info.model object { id/modelID,
// providerID } (user). RPC failure / no messages / no client → "" + a NOTE
// (the default cap 1 applies downstream — never a throw).
async function resolveModel(
  client: any,
  toolCtx: any,
  sessionID: string,
  isSelf: boolean,
): Promise<{ model: string; providerID: string; note: string }> {
  const self = toolCtx?.extra?.model;
  const selfId = typeof self?.id === "string" && self.id !== "" ? self.id : typeof self?.modelID === "string" ? self.modelID : "";
  const selfPid = typeof self?.providerID === "string" ? self.providerID : "";
  if (isSelf) {
    if (selfId !== "") return { model: selfId, providerID: selfPid, note: "" };
    return { model: "", providerID: "", note: "model unknown (no extra.model.id in the tool context) — default compaction budget applied" };
  }
  try {
    if (typeof client?.session?.messages !== "function") {
      // No messages RPC on the client (the v1 host client HAS it — this branch
      // is the best-effort path): a cross compact of a sibling session on this
      // host is most likely the SAME model, so fall back to the CALLING
      // session's model for the budget class; absent → default cap + note.
      if (selfId !== "") {
        return { model: selfId, providerID: selfPid, note: "cross-session model read unavailable (no client.session.messages) — the calling session's model is used for the budget class" };
      }
      return { model: "", providerID: "", note: "cross-session model read unavailable (no client.session.messages) — default compaction budget applied" };
    }
    const msgs = await client.session.messages({ path: { id: sessionID } });
    if (Array.isArray(msgs) && msgs.length > 0) {
      const info = msgs[msgs.length - 1]?.info ?? {};
      let id = "";
      let pid = "";
      if (typeof info.modelID === "string" && info.modelID !== "") {
        id = info.modelID;
        pid = typeof info.providerID === "string" ? info.providerID : "";
      } else if (info.model != null) {
        if (typeof info.model === "string") {
          id = info.model;
        } else if (typeof info.model === "object") {
          id = typeof info.model.id === "string" ? info.model.id : typeof info.model.modelID === "string" ? info.model.modelID : "";
          pid = typeof info.model.providerID === "string" ? info.model.providerID : "";
        }
      }
      if (id !== "") return { model: id, providerID: pid, note: "" };
    }
    return { model: "", providerID: "", note: "cross-session model read empty (no messages) — default compaction budget applied" };
  } catch {
    return { model: "", providerID: "", note: "cross-session model read FAILED (RPC error) — default compaction budget applied" };
  }
}

// ------------------------------------------------------------------ the plugin
export default async function CompactMemoryPlugin(ctx: any) {
  return {
    tool: {
      compact_memory: tool({
        description: "Triggers session compaction to free context space. The compaction runs as a BACKGROUND fire-and-forget dispatch (it never blocks the session — an await here would deadlock on the single llama-swap model slot); success is verified asynchronously: the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success. Budget is per-session and per-model quant-class (CPU models are excluded — see the classifier in this plugin).",
        args: {
          sessionID: tool.schema.string().optional().describe("Session ID to compact (defaults to the calling session; an explicit id compacts ANOTHER session)"),
          providerID: tool.schema.string().optional().describe("ProviderID to be submitted when using a sessionID - has to be the ID corresponding to the SessionID - in doubt 'llama-swap'"),
          modelID: tool.schema.string().optional().describe("modelID to be submitted when using a sessionID - has to be the ID corresponding to the SessionID - in doubt 'llama-swap'"),
          keepTokens: tool.schema.number().optional().describe("Number of recent tokens to retain (e.g. 10000 or 30000)"),
          keepMessages: tool.schema.number().optional().describe("Number of recent messages to retain (e.g. 6 or 12)"),
          message: tool.schema.string().optional().describe("Post-compaction continuation message for the target session. Usage: 1-3 lines: what to resume + which files to re-read. ABSENT → the default reload directive is returned."),

        },
        async execute(args: any, c: any) {
          try {

            //--comment my first try at java script ... i am frustrated with this progamming lanuage - why not clean python!
            // // 1. resolve the session id (Part 1)
            // let sessionID
            // let providerI
            // let model
            // let note
            // let modelNote

            // if (args?.sessionID) {
            //   const sessionID = args.sessionID;
            //   const providerID = args.providerID
            //   const model = args.modelID
            //   const note = "cross sesseion compaction detected"
            //   const modelNote = note
            // } else {
            //   const sessionID = c.sessionID
            //   if (typeof sessionID !== "string" || sessionID === "") {
            //   return "Compaction request failed: no session id available (pass the sessionID argument or a context session id).";
            // }
            //   const isSelf = args?.sessionID == null || (typeof c?.sessionID === "string" && args.sessionID === c.sessionID);
            //   const { model, providerID, note: modelNote } = await resolveModel(ctx?.client, c, sessionID, isSelf);
            // }

            //--comment asked another llm to help me with this xD
           // 1. resolve the session id (Part 1): an explicit id compacts
            //    ANOTHER session (or itself); absent → the calling session
            const explicitID =
              typeof args?.sessionID === "string" && args.sessionID !== "" ? args.sessionID : null;
            const ctxID = typeof c?.sessionID === "string" && c.sessionID !== "" ? c.sessionID : null;
            const sessionID = explicitID ?? ctxID;
            if (sessionID == null) {
              return "Compaction request failed: no session id available (pass the sessionID argument or a context session id).";
            }
            const isSelf = sessionID === c?.sessionID;

            // 2. resolve the model pair — an EXPLICIT providerID+modelID pair
            //    (BOTH given, non-empty) is an OVERRIDE (the maintainer's
            //    round-2 tested cross path); otherwise resolveModel (self:
            //    extra.model; cross: the messages-RPC read of the LAST entry —
            //    never a throw, a NOTE on degradation)
            const explicitProvider = typeof args?.providerID === "string" ? args.providerID.trim() : "";
            const explicitModel = typeof args?.modelID === "string" ? args.modelID.trim() : "";
            let model = "";
            let providerID = "";
            let modelNote = "";
            if (explicitProvider !== "" && explicitModel !== "") {
              providerID = explicitProvider;
              model = explicitModel;
            } else {
              const resolved = await resolveModel(ctx?.client, c, sessionID, isSelf);
              model = resolved.model;
              providerID = resolved.providerID;
              modelNote = resolved.note;
            }

            const root = resolveRoot(c);

            // 3. the quant-class cap + the budget gate — BEFORE any compact
            //    call: denial has ZERO side effects (no increment, no compact
            //    call, no COMPACT line)
            const { cap, label } = classifyQuantClass(model);
            const count = budgetCount(root, sessionID);
            if (count >= cap) {
              return (
                `Compaction refused: the compaction budget for ${sessionID} is exhausted — ` +
                `model class ${label} (cap ${cap}), used ${count}/${cap}. ` +
                `Hand over and start fresh — write the handover summary and let the loop restart with a fresh session.` +
                (modelNote !== "" ? `\n${modelNote}` : "")
              );
            }

            // Pre-compaction dump hook (TODO #152): before ANY dispatch, dump
            // the target session's full pre-compaction content into the corpus
            // so it stays complete for compacted sessions. Best-effort — NEVER
            // throws / NEVER blocks; on failure the dispatch response carries a
            // WARNING (the response is UNCHANGED on success).
            const dump = preCompactionDump(root, sessionID, count);
            const dumpWarning = dump.ok ? "" : `\nWARNING: pre-compaction dump failed for ${sessionID} (${dump.error})`;

            // 4. the client call path (Part 1) — typeof detection (the SDK
            //    methods live on the prototype). Keep fields go in the body
            //    WHEN GIVEN; on a 404/missing-key/unexpected-field rejection
            //    callSummarize retries ONCE without them.
            const client = ctx?.client;
            const keep: Record<string, number> = {};
            if (args?.keepTokens != null) keep.tokens = args.keepTokens;
            if (args?.keepMessages != null) keep.messages = args.keepMessages;
            const keepObj = Object.keys(keep).length > 0 ? keep : undefined;
            const tokensToKeep = args?.keepTokens ?? DEFAULT_KEEP_TOKENS;
            const messagesToKeep = args?.keepMessages ?? DEFAULT_KEEP_MESSAGES;

            // NO AWAIT on the compaction call — for SELF and CROSS alike
            // (maintainer ruling 2026-09-14, live evidence: an `await` in
            // execute deadlocks — the summarize model is normally == the
            // session's LOADED model and llama-swap has ONE slot, so the
            // request queues behind the very turn that issued it; the turn
            // cannot end until the await returns; the session is frozen
            // until a manual interrupt frees the slot). The call is
            // DISPATCHED and verified ASYNCHRONOUSLY: the budget increment
            // + the COMPACT line land ONLY in the verified-success callback
            // (increment-on-verified-success); a failure logs to the
            // terminal and burns no budget. The response is the dispatch
            // line — NEVER a success claim.
            if (typeof client?.session?.compact === "function") {
              // v2: FLAT parameters — the generated v2 types mark the options
              // body `never` (no keep fields).
              void Promise.resolve(client.session.compact({ sessionID }))
                .then((result: any) => {
                  const error = compactionFailure(result);
                  if (error !== "") {
                    console.error(`compact_memory: background compaction FAILED for ${sessionID}: ${error}`);
                    return;
                  }
                  recordSuccess(root, sessionID, model);
                  appendCompactLine(root, c, sessionID, model, tokensToKeep, messagesToKeep);
                })
                .catch((err: unknown) =>
                  console.error(
                    `compact_memory: background compaction rejected for ${sessionID}:`,
                    err instanceof Error ? err.message : String(err),
                  ),
                );
              const dispatch =
                `Compaction dispatched for ${sessionID} (background, fire-and-forget) — the compact call was sent ` +
                `(model: ${model}); the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success.` +
                dumpWarning;
              const body =
                typeof args?.message === "string" && args.message !== "" ? `${args.message}\n${dispatch}` : dispatch;
              return modelNote !== "" ? `${body}\n${modelNote}` : body;
            } else if (typeof client?.session?.summarize === "function") {
              // v1 — THE ACTIVE PATH ON THIS BUILD: the body MUST carry
              // providerID + modelID (REQUIRED by the server payload schema)
              if (model === "" || providerID === "") {
                return (
                  `Compaction request failed: no resolvable model for ${sessionID} (the server requires providerID + modelID in the summarize body) — the request was NOT sent.` +
                  (modelNote !== "" ? `\n${modelNote}` : "")
                );
              }
              void callSummarize(client, sessionID, { providerID, modelID: model }, keepObj)
                .then(({ note, error }) => {
                  if (error !== "") {
                    console.error(`compact_memory: background compaction FAILED for ${sessionID}: ${error}`);
                    return;
                  }
                  if (note !== "") console.log(`compact_memory (${sessionID}): ${note}`);
                  recordSuccess(root, sessionID, model);
                  appendCompactLine(root, c, sessionID, model, tokensToKeep, messagesToKeep);
                })
                .catch((err: unknown) =>
                  console.error(
                    `compact_memory: background compaction rejected for ${sessionID}:`,
                    err instanceof Error ? err.message : String(err),
                  ),
                );
              const dispatch =
                `Compaction dispatched for ${sessionID} (background, fire-and-forget) — the summarize call was sent ` +
                `(model: ${model}); the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success.` +
                dumpWarning;
              const body =
                typeof args?.message === "string" && args.message !== "" ? `${args.message}\n${dispatch}` : dispatch;
              return modelNote !== "" ? `${body}\n${modelNote}` : body;
            } else {
              const compactType = typeof client?.session?.compact;
              const summarizeType = typeof client?.session?.summarize;
              return `Compaction request failed: no usable client — probed ctx.client?.session?.compact (type ${compactType}) and ctx.client?.session?.summarize (type ${summarizeType}); neither is a function (the client is not wired for this host build). No compaction was performed.`;
            }
          } catch (err: any) {
            return `Compaction request failed: ${err?.message ?? err}`;
          }
        },
      }),
    },
  };
}
