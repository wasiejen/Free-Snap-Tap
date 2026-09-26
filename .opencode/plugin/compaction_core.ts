// compaction_core.ts — the shared compaction core (approved proposal
// .opencode/proposals/approved/2026-09-26_compaction-unification.md, Part A —
// ONE compaction behavior BY CONSTRUCTION: both entry points route through
// this module).
//
// WHY THIS FILE EXISTS: compact_memory.ts (the tool) and context_recovery.ts
// (the hook) carried hand-synced DUPLICATES of one behavior (the config
// reader / the budget store / the cap resolver / the keepTokens resolution /
// the summarizer-pair resolution / the v1 summarize call / the COMPACT-line
// writer / the verified-success handling) — and they DRIFTED (the
// 2026-09-26_14-26 incident: the hook's pair resolution did not carry the
// session's own providerID + modelID the way the tool's does, and its
// promptAsync resume ran against the default agent/model). The
// unification moves the shared behavior here; the entry points keep ONLY
// their entry-specific logic (the tool: tool registration + arg validation
// + SELF/CROSS routing + the pre-compaction dump + the queued message + the
// v2 compact dispatch; the hook: the limit trigger + the per-fire budget
// gate + hand-control-back).
//
// T5 CONSTRAINT (satisfied the way intercept_observer_core.ts already does):
// this is a PURE module — NO tool registration, NO default export — so it
// is NEVER loaded by the host plugin loader directly (the loader normalizes
// a plugin module via Object.values(module) and EVERY value must be a
// function). compact_memory.ts (the tool file, which registers the tool)
// and context_recovery.ts (the hook-only plugin) both IMPORT this module —
// importing it pulls NO tool registration into the hook-only plugin.
//
// SOURCE OF TRUTH: every behavior below is carried VERBATIM from the tool's
// pre-unification implementation (compact_memory.ts) — the tool's file was
// the source of truth ("keep them in step"); the unification makes that
// invariant structural (one implementation, two thin entry points).

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ------------------------------------------------------------------ compaction config
//
// ALL compaction config lives in the SAME file as the budget store:
// <root>/.opencode/temp/compact_budget.json — top-level keys (all optional,
// fail-open defaults):
//   keepMessages: number >= 0          (default 12)
//   keepTokens: number >= 0            (default undefined — the FALLBACK
//    value for the dispatch-time keepTokens resolution (2026-09-25, #99 —
//    RETURNS after the 2026-09-24 removal): the token size of the last
//    keepMessages messages is the primary, this value the fallback when
//    the read fails or the sum is 0)
//   emergency_budget: number >= 0      (default 1 — the once-per-session
//    emergency compaction on top of the model cap, change-list item 10)
//   emergencyRecovery: strictly true   (default false — the context_recovery
//    hook's activation flag, read PER FIRE)
//   model_budget: { "<bare model ID>": <cap number>, "default": <cap number> }
// — the cap for an unlisted / typo'd model id is model_budget.default (else
// the default 1). Read PER CALL (a mid-run edit applies to the next call);
// an absent file / unparseable JSON / malformed key fails open to the
// defaults (never a throw).
const DEFAULT_KEEP_MESSAGES = 12;
const DEFAULT_EMERGENCY_BUDGET = 1;
const DEFAULT_MODEL_BUDGET = 1;

type CompactionConfig = {
  keepMessages: number;
  keepTokens: number | undefined;
  emergency_budget: number;
  emergencyRecovery: boolean;
  model_budget: Record<string, number>;
};

// Reads the compaction config from the budget file (fail-open). Exported for
// the entry points + the smoke / probe checks.
export function readCompactionConfig(root: string): CompactionConfig {
  const cfg: CompactionConfig = {
    keepMessages: DEFAULT_KEEP_MESSAGES,
    keepTokens: undefined,
    emergency_budget: DEFAULT_EMERGENCY_BUDGET,
    emergencyRecovery: false,
    model_budget: {},
  };
  try {
    const p = budgetPath(root);
    if (!existsSync(p)) return cfg;
    const parsed = JSON.parse(readFileSync(p, "utf8"));
    if (parsed != null && typeof parsed === "object") {
      if (typeof parsed.keepMessages === "number" && Number.isFinite(parsed.keepMessages) && parsed.keepMessages >= 0) cfg.keepMessages = parsed.keepMessages;
      // keepTokens: the FALLBACK value (#99) — absent / non-finite /
      // negative → undefined (never a default — the none path omits
      // keep.tokens)
      if (typeof parsed.keepTokens === "number" && Number.isFinite(parsed.keepTokens) && parsed.keepTokens >= 0) cfg.keepTokens = parsed.keepTokens;
      if (typeof parsed.emergency_budget === "number" && Number.isFinite(parsed.emergency_budget) && parsed.emergency_budget >= 0) cfg.emergency_budget = parsed.emergency_budget;
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

// The dispatch-time keepTokens resolution (#99, 2026-09-25) — PURE (no fs,
// no client, no clock — probe-pinnable): the token size of the LAST
// `keepMessages` messages (fewer → all of them; keepMessages <= 0 → no sum)
// with the DUAL SHAPE unwrap per #79 (the bare array, or the in-process
// client's RequestResult wrapper { data: [...] } — anything else → no sum).
// Per-message size: role "user" → info.tokens.input, role "assistant" →
// info.tokens.output + info.tokens.reasoning, other roles → 0 (non-finite /
// negative / absent token values count 0 — fail-open). sum > 0 → computed;
// else the budget file's keepTokens (finite, > 0) → budget; else none (the
// host config default applies — keep.tokens is omitted from the body).
// Exported for the entry points + the smoke / probe pins.
export function computeKeepTokens(
  raw: unknown,
  keepMessages: number,
  budgetTokens: number | undefined,
): { tokens: number | undefined; source: "computed" | "budget" | "none" } {
  const msgs = Array.isArray(raw)
    ? raw
    : raw != null && typeof raw === "object" && Array.isArray(raw.data)
      ? raw.data
      : null;
  let sum = 0;
  if (msgs != null && keepMessages > 0) {
    const last = msgs.slice(Math.max(0, msgs.length - keepMessages));
    for (const entry of last) {
      const info = entry?.info;
      if (info == null) continue;
      const tokens = info.tokens;
      const role = typeof info.role === "string" ? info.role : "";
      // fail-open numeric guard: non-finite / negative / absent → 0
      const take = (n: unknown): number => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0);
      if (role === "user") sum += take(tokens?.input);
      else if (role === "assistant") sum += take(tokens?.output) + take(tokens?.reasoning);
    }
  }
  if (sum > 0) return { tokens: sum, source: "computed" };
  if (typeof budgetTokens === "number" && Number.isFinite(budgetTokens) && budgetTokens > 0) {
    return { tokens: budgetTokens, source: "budget" };
  }
  return { tokens: undefined, source: "none" };
}

// Resolves the compaction cap for a model name: the CPU guard is a SAFETY
// INVARIANT (cap 0, tested FIRST — CPU models are never compacted); then the
// EXACT bare-model-id key of the file's model_budget map (its configured
// cap); else model_budget.default (else the default 1) — an unlisted /
// typo'd id simply never matches. Exported for the entry points + the probe's
// cap fixtures.
export function resolveCap(root: string, modelName: string): { cap: number; label: string } {
  const name = typeof modelName === "string" ? modelName : "";
  if (/^cpu/i.test(name)) return { cap: 0, label: "cpu (excluded)" };
  const mb = readCompactionConfig(root).model_budget;
  if (name !== "" && typeof mb[name] === "number") return { cap: mb[name], label: "model_budget" };
  const def = typeof mb.default === "number" ? mb.default : DEFAULT_MODEL_BUDGET;
  return { cap: def, label: "model_budget default" };
}


// ------------------------------------------------------------------ budget store (v2 schema)
//
// The compaction budget, keyed by session id, INCREMENT-ON-SUCCESS only —
// shared by FILE with BOTH entry points (the state lives on disk, not in
// module memory). Schema version 2 (read lenient — v1 files carry
// maxPerSession and entries without the model key):
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

// Project root for the store + ctx.log: the entry-point context carries
// `directory` (the probe / smoke passes the sandbox root); absent →
// SELF-LOCATION (the GRANDPARENT of this file's directory — this file
// lives at <root>/.opencode/plugin/compaction_core.ts, the same depth as
// the two entry files).
export const SELF_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function resolveRoot(context: any): string {
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

export function budgetCount(root: string, sessionID: string): number {
  return readBudget(root).sessions[sessionID]?.count ?? 0;
}

// INCREMENT-ON-SUCCESS only (a failed compact consumes NO budget).
// Re-read-then-write with NO await between the read and the write (the only
// interleaving-safe sequence for a file shared in-process).
export function recordSuccess(root: string, sessionID: string, model: string): void {
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
// model field (OMITTED when empty) + `COMPACT <session id> keep=<m>m
// tok=<t> <source>` (#99, 2026-09-25: the resolved keepTokens + its source —
// `computed` = the sum of the last m messages' tokens, `budget` = the
// budget file's keepTokens fallback, `none` = neither available (tok=-))
// + the optional ` emergency` suffix (the once-per-session emergency
// compaction was consumed — item 10, 2026-09-24) + the optional pre-readout
// (the tool's context carries it — the hook's context does not). The model
// field is POPULATED from the RESOLVED model id; m is the keep arg WHEN
// GIVEN, else the config keepMessages (default 12).

// The local `YYYY-MM-DD_HH-MM` stamp (the T2 line convention) — exported
// so the tool's DUMP-* lines share the SAME stamp writer.
export function localStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

export function appendCompactLine(
  root: string,
  context: any,
  sessionID: string,
  model: string,
  messages: number,
  resolved: { tokens: number | undefined; source: "computed" | "budget" | "none" },
  emergency = false,
): void {
  try {
    const dir = tempDir(root);
    mkdirSync(dir, { recursive: true });
    const p = path.join(dir, "ctx.log");
    const modelField = typeof model === "string" ? model : "";
    const preField = context != null && typeof context.preReadout === "string" && context.preReadout !== "" ? context.preReadout : "";
    const tok = resolved?.tokens != null ? String(resolved.tokens) : "-";
    const source =
      resolved?.source === "computed" || resolved?.source === "budget" ? resolved.source : "none";
    const line =
      `${localStamp()}${modelField !== "" ? ` ${modelField}` : ""} ` +
      `COMPACT ${sessionID} keep=${messages}m tok=${tok} ${source}` +
      (emergency ? " emergency" : "") +
      `${preField !== "" ? ` (${preField})` : ""}\n`;
    appendFileSync(p, line, "utf8");
  } catch {
    // best effort — never break the compaction over a write failure
  }
}

// The VERIFIED-SUCCESS handling (shared by both entry points): the budget
// increment + the COMPACT line, in that order — called ONLY from a
// verified-success callback (increment-on-verified-success).
export function recordVerifiedSuccess(
  root: string,
  context: any,
  sessionID: string,
  model: string,
  messages: number,
  resolved: { tokens: number | undefined; source: "computed" | "budget" | "none" },
  isEmergency = false,
): void {
  recordSuccess(root, sessionID, model);
  appendCompactLine(root, context, sessionID, model, messages, resolved, isEmergency);
}

// ------------------------------------------------------------------ the summarizer pair (the v1 body REQUIRES providerID + modelID)
//
// The summarizer model pair resolves from the root config's
// agent.compaction.model ("provider/model"), falling back to the
// compacting session's own model (the resolveModel result — the
// 2026-09-26_14-26 incident fix: the session's OWN providerID + modelID,
// never a default-agent reset). The parser is JSONC-safe — // line +
// /* */ block comments are stripped with a string-state-aware scan (a //
// inside a string literal — e.g. a URL — must NOT start a comment; a quote
// inside a comment must not open a string). Absent file / unparseable /
// key missing / malformed → the fallback pair UNCHANGED (source
// "fallback").

// Strips // line + /* */ block comments from JSONC content, string-state
// aware (quoted regions survive byte-exact; backslash escapes handled).
// Exported for the entry points + the probe (the comment + URL-safe parse
// pin).
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

// The root config content for the summarizer resolution: opencode.jsonc
// (JSONC), falling back to opencode.json when absent ("" when neither — the
// resolver then takes the fallback path). Never throws.
export function readRootConfigContent(root: string): string {
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

// Resolves the target session's model PAIR (id + providerID — the server's
// summarize payload REQUIRES both): SELF (no explicit id, or the explicit id
// == the calling session) → c.extra?.model ({ id, providerID }); CROSS → the
// LAST entry of session.messages({ path: { id } }) (DUAL SHAPE: bare array,
// or the in-process client's RequestResult wrapper { data: [...] }) —
// info.modelID + info.providerID (assistant) / the info.model object
// { id/modelID, providerID } (user). RPC failure / no messages / no client →
// "" + a NOTE (the default cap 1 applies downstream — never a throw).
//
// The hook (context_recovery) calls this with toolCtx = undefined and
// isSelf = false — the CROSS branch with no calling-session fallback, the
// event-hook analogue of the tool's cross-session read.
export async function resolveModel(
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
      // No messages RPC on the client (the v1 host client HAS it — this
      // branch is the best-effort path): a cross compact of a sibling session
      // is most likely the SAME model, so fall back to the CALLING session's
      // model for the budget class; absent → default cap + note.
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
export function isKeepRejectedError(err: any): boolean {
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
export function compactionFailure(result: any): string {
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

export function errorMessage(err: any): string {
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
export async function callSummarize(
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