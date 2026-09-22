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
//       transparency — the CAP itself lives in the file's top-level
//       model_budget map, resolved per call); READ LENIENT (v1 files with
//       maxPerSession, entries missing the model key)
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
// Compaction budget (Part 2, priority.md #1): the cap is resolved AT CALL
// TIME from the target session's model name — SELF: c.extra?.model?.id;
// CROSS: the LAST entry of ctx.client.session.messages({ path: { id } })
// (DUAL SHAPE: the bare array, or the in-process client's RequestResult
// wrapper { data: [...] }) — info.modelID — assistant / info.model — user;
// RPC failure / no messages → the configured default cap + a note in the
// response (never a throw). The cap comes from the budget file's
// model_budget map (bare model id → cap; unlisted / typo'd id →
// model_budget.default, else 1; CPU models stay cap 0 — the safety
// invariant). The gate (count from the store vs the cap) comes BEFORE any
// compact call: denial → clear message naming class + cap + count, ZERO
// side effects (no increment, no compact call, no COMPACT line).
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

// ------------------------------------------------------------------ compaction config
//
// ALL compaction config lives in the SAME file as the budget store:
// <root>/.opencode/temp/compact_budget.json — top-level keys (all optional,
// fail-open defaults):
//   keepTokens: number >= 0            (default 30_000)
//   keepMessages: number >= 0          (default 12)
//   emergencyRecovery: strictly true   (default false)
//   model_budget: { "<bare model ID>": <cap number>, "default": <cap number> }
// — the cap for an unlisted / typo'd model id is model_budget.default (else
// the default 1). Read PER CALL (a mid-run edit applies to the next call);
// an absent file / unparseable JSON / malformed key fails open to the
// defaults (never a throw). (Consolidation 2026-09-22 — replaces the old
// QUANT_CLASS_RULES substring table: the caps are now CONFIGURED per bare
// model id, not derived from quant substrings.)
const DEFAULT_KEEP_TOKENS = 30_000;
const DEFAULT_KEEP_MESSAGES = 12;
const DEFAULT_MODEL_BUDGET = 1;

type CompactionConfig = {
  keepTokens: number;
  keepMessages: number;
  emergencyRecovery: boolean;
  model_budget: Record<string, number>;
};

// Reads the compaction config from the budget file (fail-open). Exported for
// the smoke checks.
export function readCompactionConfig(root: string): CompactionConfig {
  const cfg: CompactionConfig = {
    keepTokens: DEFAULT_KEEP_TOKENS,
    keepMessages: DEFAULT_KEEP_MESSAGES,
    emergencyRecovery: false,
    model_budget: {},
  };
  try {
    const p = budgetPath(root);
    if (!existsSync(p)) return cfg;
    const parsed = JSON.parse(readFileSync(p, "utf8"));
    if (parsed != null && typeof parsed === "object") {
      if (typeof parsed.keepTokens === "number" && Number.isFinite(parsed.keepTokens) && parsed.keepTokens >= 0) cfg.keepTokens = parsed.keepTokens;
      if (typeof parsed.keepMessages === "number" && Number.isFinite(parsed.keepMessages) && parsed.keepMessages >= 0) cfg.keepMessages = parsed.keepMessages;
      if (parsed.emergencyRecovery === true) cfg.emergencyRecovery = true;
      const mb = parsed.model_budget;
      if (mb != null && typeof mb === "object" && !Array.isArray(mb)) {
        for (const [k, v] of Object.entries(mb)) {
          // cap 0 is meaningful (a model denied by config); a negative is not
          if (typeof v === "number" && Number.isFinite(v) && v >= 0) cfg.model_budget[k] = v;
        }
      }
    }
  } catch {
    // corrupt/unreadable config → defaults (never throw)
  }
  return cfg;
}

// Resolves the compaction cap for a model name: the CPU guard is a SAFETY
// INVARIANT (cap 0, tested FIRST — CPU models are never compacted); then the
// EXACT bare-model-id key of the file's model_budget map (its configured
// cap); else model_budget.default (else the default 1) — an unlisted /
// typo'd id simply never matches. Exported for the probe's cap fixtures.
export function resolveCap(root: string, modelName: string): { cap: number; label: string } {
  const name = typeof modelName === "string" ? modelName : "";
  if (/^cpu/i.test(name)) return { cap: 0, label: "cpu (excluded)" };
  const mb = readCompactionConfig(root).model_budget;
  if (name !== "" && typeof mb[name] === "number") return { cap: mb[name], label: "model_budget" };
  const def = typeof mb.default === "number" ? mb.default : DEFAULT_MODEL_BUDGET;
  return { cap: def, label: "model_budget default" };
}

// ------------------------------------------------------------------ responses
//
// NOTE (2026-09-14): the v1-tool reload directive / the one-line trailer are
// RETIRED from the response — with the fire-and-forget dispatch there is no
// synchronous success response to carry them in. The reload invariant is
// carried by the compaction notification → the post-compaction protocol
// (AGENTS.md Pattern 4 + agent_readme_post_compaction.md) + the NAP.

// Keep reporting defaults — the COMPACT line reports the keep ARGS WHEN
// GIVEN, else the fail-open defaults (keepTokens / keepMessages in the
// budget file — see the compaction-config section above).

// ------------------------------------------------------------------ budget store (v2 schema)
//
// The compaction budget, keyed by session id, INCREMENT-ON-SUCCESS only —
// the SAME file the T5 emergency hook (context_recovery.ts) reads/writes
// (shared by FILE — the state must live on disk, not in module memory).
// Schema BUMPED to version 2 (read lenient — v1 files carry maxPerSession
// and entries without the model key):
//   { "version": 2,
//     "sessions": { "<sid>": { "count": <n>, "updated": "<iso ts>", "model": "<id>" } } }
// The cap lives in the file's TOP-LEVEL model_budget map (resolved per
// call — see the compaction-config section); the session entry stores only
// count/updated/model (the model = the id at the last increment —
// transparency).

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

// Best-effort append of a DUMP-OK line to the ctx log (unit A, 2026-09-21):
// same local-stamp prefix style as the DUMP-FAIL line —
// `<stamp> DUMP-OK <sid> <relfile> <ms>` (relfile = the corpus-relative dump
// path, ms = elapsed milliseconds). Never throws.
function appendDumpOkLine(root: string, sessionID: string, relFile: string, ms: number): void {
  try {
    const dir = tempDir(root);
    mkdirSync(dir, { recursive: true });
    const p = path.join(dir, "ctx.log");
    appendFileSync(p, `${localStamp()} DUMP-OK ${sessionID} ${relFile} ${ms}\n`, "utf8");
  } catch {
    // best effort — never break the tool over a write failure
  }
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
    // stdio "ignore" (unit A, 2026-09-21): the "pipe" setting buffered the
    // child's output into a dead pipe inside the host — a pipe-buffer
    // deadlock failure mode (the ETIMEDOUT evidence: the hung child in
    // host; the script runs 0.12 s standalone).
    const t0 = Date.now();
    execFileSync(resolveNodeExe(), [scriptPath, sessionID, "--out", name], { timeout: 60_000, stdio: "ignore" });
    appendDumpOkLine(root, sessionID, name, Date.now() - t0);
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
// LAST entry of session.messages({ path: { id } }) (DUAL SHAPE: bare array,
// or the in-process client's RequestResult wrapper { data: [...] }) —
// info.modelID + info.providerID (assistant) / the info.model object
// { id/modelID, providerID } (user). RPC failure / no messages / no client →
// "" + a NOTE
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
    const raw = await client.session.messages({ path: { id: sessionID } });
    // DUAL RESPONSE SHAPE (2026-09-21): the in-process client resolves SDK
    // calls to a RequestResult wrapper ({ data: [...] }); the bare array is
    // the older / faked shape. Normalize to the bare array before the logic.
    const msgs = Array.isArray(raw) ? raw : (raw != null && typeof raw === "object" && Array.isArray(raw.data) ? raw.data : null);
    if (msgs != null && msgs.length > 0) {
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

// ------------------------------------------------------------------ the config summarizer (unit A, 2026-09-21,
// priority.md #1)
//
// The providerID / modelID ARGS are REMOVED: the summarizer pair resolves
// from the root config's agent.compaction.model ("provider/model"), falling
// back to the compacting session's own model (the resolveModel result). The
// parser is JSONC-safe — // line + /* */ block comments are stripped with a
// string-state-aware scan (a // inside a string literal — e.g. a URL — must
// NOT start a comment; a quote inside a comment must not open a string).
// Absent file / unparseable / key missing / malformed → the fallback pair
// UNCHANGED (source "fallback").

// Strips // line + /* */ block comments from JSONC content, string-state
// aware (quoted regions survive byte-exact; backslash escapes handled).
// Exported for the probe (the comment + URL-safe parse pin).
export function stripJsoncComments(content: string): string {
  if (typeof content !== "string") return "";
  let out = "";
  let i = 0;
  const n = content.length;
  let str: string | null = null; // the open quote char, or null
  while (i < n) {
    const ch = content[i];
    if (str !== null) {
      out += ch;
      if (ch === "\\" && i + 1 < n) { out += content[i + 1]; i += 2; continue; }
      if (ch === str) str = null;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") { str = ch; out += ch; i += 1; continue; }
    if (ch === "/" && i + 1 < n && content[i + 1] === "/") {
      while (i < n && content[i] !== "\n") i += 1; // drop to the newline (kept next pass)
      continue;
    }
    if (ch === "/" && i + 1 < n && content[i + 1] === "*") {
      i += 2;
      while (i < n && !(content[i] === "*" && i + 1 < n && content[i + 1] === "/")) i += 1;
      i += 2; // drop the closing */
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

// Resolves the summarizer model pair from root-config content — PURE (no fs,
// no clock, probe-pinnable): agent.compaction.model = "provider/model" → the
// config pair split at the FIRST "/" (both halves non-empty — a missing "/"
// or an empty half is malformed → the fallback). Any other shape (absent
// content, unparseable JSONC, key missing, non-string, malformed) → the
// fallback pair UNCHANGED, source "fallback".
export function resolveCompactionModel(
  configContent: string,
  fallback: { providerID: string; modelID: string },
): { providerID: string; modelID: string; source: "config" | "fallback" } {
  const fb = {
    providerID: typeof fallback?.providerID === "string" ? fallback.providerID : "",
    modelID: typeof fallback?.modelID === "string" ? fallback.modelID : "",
  };
  let cfg: any = null;
  try {
    cfg = JSON.parse(stripJsoncComments(configContent));
  } catch {
    cfg = null; // unparseable → fallback (never throws)
  }
  const model = cfg != null && typeof cfg === "object" ? cfg?.agent?.compaction?.model : null;
  if (typeof model !== "string" || model === "") return { ...fb, source: "fallback" };
  const slash = model.indexOf("/");
  if (slash <= 0 || slash >= model.length - 1) return { ...fb, source: "fallback" };
  return { providerID: model.slice(0, slash), modelID: model.slice(slash + 1), source: "config" };
}

// The queued continuation message (unit A, 2026-09-21): when `message` is
// non-empty, AFTER the compaction dispatch (the void path — no await
// anywhere) fire EXACTLY ONE queued promptAsync to the compacted session
// (the auto_resume.ts queued-prompt pattern — delivered on its resume).
// typeof promptAsync !== "function" → NO prompt sent: the dispatch response
// gains a WARNING line saying the message was not queued.
function queueMessage(client: any, sessionID: string, message: unknown, dispatch: string, modelNote: string): string {
  let body = dispatch;
  if (typeof message === "string" && message !== "") {
    if (typeof client?.session?.promptAsync === "function") {
      void Promise.resolve(
        //--maintainer 2026-09-22_11-53: deactivated to enable compaction until a way is found to send the message without interfering with the compaction
        //client.session.promptAsync({ path: { id: sessionID }, body: { parts: [{ type: "text", text: message }] } }),
      ).catch((err: unknown) =>
        console.error(
          `compact_memory: message queue FAILED for ${sessionID}:`,
          err instanceof Error ? err.message : String(err),
        ),
      );
      body += `\nThe message was queued for ${sessionID} (delivered on its resume).`;
    } else {
      body += `\nWARNING: the message was NOT queued for ${sessionID} (client.session.promptAsync unavailable).`;
    }
  }
  return modelNote !== "" ? `${body}\n${modelNote}` : body;
}

// The root config content for the summarizer resolution: opencode.jsonc
// (JSONC), falling back to opencode.json when absent ("" when neither — the
// resolver then takes the fallback path). Never throws.
function readRootConfigContent(root: string): string {
  for (const name of ["opencode.jsonc", "opencode.json"]) {
    const p = path.join(root, name);
    try {
      if (existsSync(p)) return readFileSync(p, "utf8");
    } catch {
      return ""; // unreadable → fallback
    }
  }
  return "";
}

// ------------------------------------------------------------------ the plugin
export default async function CompactMemoryPlugin(ctx: any) {
  return {
    tool: {
      compact_memory: tool({
        description: "Compacts a session to free context space. Two paths: SELF (sessionID omitted) — your own session ENDS after the compaction; you resume from committed files via the post-compaction protocol. CROSS (explicit sessionID) — a fire-and-forget dispatch: it returns immediately and never blocks (an await would deadlock on the single llama-swap model slot); success is verified ASYNCHRONOUSLY — the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success, and a failed dispatch burns NO budget. The budget is per TARGET session, per model — the cap comes from the compact_budget.json model_budget map (bare model id → cap; unlisted models get the configured default; CPU models denied — cap 0). Use it at the stop line / near-limit triage (self) or before a task_id resume of a session that died at its limit (cross); do NOT use it as a restart substitute — the recent head stays INTACT and a summary of the dropped tail is auto-created. The summarizer model pair is NOT an argument: it resolves from the root opencode.jsonc agent.compaction.model when set, else from the compacting session's own model.",
        args: {
          sessionID: tool.schema.string().optional().describe("Session to compact. Omit = your own session (the SELF path). An explicit id = ANOTHER session (the CROSS fire-and-forget path)."),
          keepTokens: tool.schema.number().optional().describe("Recent tokens to retain (e.g. 30000). Note: this build's server ignores the keep fields (the compaction floor is server-side) — they are sent, dropped on rejection, and never block the call."),
          keepMessages: tool.schema.number().optional().describe("Recent messages to retain (e.g. 12) — same note as keepTokens."),
          message: tool.schema.string().optional().describe("Post-compaction continuation message (1-3 lines: what to resume + which files to re-read) — queued as a direct prompt to the compacted session (delivered on its resume; never awaited). ABSENT → nothing is queued."),

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

            // 2. resolve the model pair — resolveModel is the FALLBACK (self:
            //    extra.model; cross: the messages-RPC read of the LAST entry —
            //    never a throw, a NOTE on degradation); the summarizer pair
            //    then resolves from the root config's agent.compaction.model
            //    when set (unit A, 2026-09-21: providerID/modelID are NOT
            //    arguments — the config is the only override)
            const root = resolveRoot(c);
            const resolved = await resolveModel(ctx?.client, c, sessionID, isSelf);
            let model = resolved.model;
            let providerID = resolved.providerID;
            const modelNote = resolved.note;
            const cfgPair = resolveCompactionModel(readRootConfigContent(root), { providerID, modelID: model });
            if (cfgPair.source === "config") {
              providerID = cfgPair.providerID;
              model = cfgPair.modelID;
            }

            // 3. the configured cap + the budget gate — BEFORE any compact
            //    call: denial has ZERO side effects (no increment, no compact
            //    call, no COMPACT line). The config (keep defaults + the
            //    model_budget caps) is read PER CALL from the budget file.
            const cfg = readCompactionConfig(root);
            const { cap, label } = resolveCap(root, model);
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
            const tokensToKeep = args?.keepTokens ?? cfg.keepTokens;
            const messagesToKeep = args?.keepMessages ?? cfg.keepMessages;

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
              return queueMessage(client, sessionID, args?.message, dispatch, modelNote);
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
              return queueMessage(client, sessionID, args?.message, dispatch, modelNote);
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
