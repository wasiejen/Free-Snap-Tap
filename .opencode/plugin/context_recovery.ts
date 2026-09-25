// context_recovery — the emergency context-recovery plugin (TODO #93: the
// 2026-09-25 event-hook port of the retired T5 prototype; the deactivated
// copy is removed — this file at .opencode/plugin/context_recovery.ts is
// the single source, auto-loaded by the host — activation = the host
// restart).
//
// On a REAL context-overflow error (the host's session.error event) with
// the `emergencyRecovery` flag ON, it:
//   1. claims the overflow (the once-per-overflow in-memory guard per
//      sessionID — the host emits FOUR session.error events for ONE
//      overflow (its internal tail-strip retries — measured 2026-09-23),
//      so the follow-up events are no-ops; the guard is cleared on the
//      session's EventSessionIdle),
//   2. compacts via the v1-generation client call `session.summarize`
//      (session.compact is undefined on this host) with the
//      config-resolved summarizer pair (the root opencode.jsonc
//      agent.compaction.model "provider/model", falling back to the
//      session's own model read via session.messages) + keep
//      { messages } (keepMessages from the budget file — keepTokens was
//      REMOVED, spec 01: never read, never defaulted, never sent),
//   3. on VERIFIED success only: increments the shared v2 budget store
//      (re-read-then-write, NO await between the read and the write) and
//      appends the COMPACT line to .opencode/temp/ctx.log (the current
//      tool's writer shape: `<stamp>[ <model>] COMPACT <sid>
//      messages=<m>[ emergency]` — messages-only, no tokens= field),
//   4. injects the post-compaction directive as a synthetic text part via
//      promptAsync — the directive IS the retry vehicle (a lost directive
//      degrades to a plain retry — evidence only, never a throw).
//
// Over budget (or an unresolvable model pair, or a failed compact) →
// CLEAN FAIL: no compact, no line, no budget change — the session error
// propagates (the visible hard stop; the -WARNING line is the
// protocol's job, not the plugin's).
//
// WHY the `event` hook (the old design's `"session.error"` hook does NOT
// exist in the current SDK): the installed @opencode-ai/plugin Hooks has
// `event?: (input: { event: Event }) => Promise<void>` — notification-
// only, returns VOID (the old design's {handled, action:"retry"} return
// is impossible — the directive's promptAsync IS the retry vehicle). The
// overflow event exists in the Event union (SDK types.gen.d.ts L518):
//   EventSessionError = { type: "session.error"; properties: {
//     sessionID?: string;  // capital D
//     error?: ProviderAuthError | UnknownError |
//     MessageOutputLengthError | MessageAbortedError | ApiError } }
// The live 2026-09-23 fork-test error was a MessageAbortedError —
// `request (148149 tokens) exceeds the available context size
// (131072 tokens)`.
//
// Activation flag (consolidation 2026-09-22): a top-level BOOLEAN key
// `emergencyRecovery` in <root>/.opencode/temp/compact_budget.json (the
// SAME file as the shared budget store), read PER FIRE (a mid-run flip
// takes effect on the next overflow). ONLY the value `true` enables it —
// missing file / missing key / any other value / unparseable JSON → OFF
// (the hook does NOTHING — the session error propagates).
//
// Budget (the v2 store the compact_memory tool uses — shared by FILE):
// the cap is resolved PER FIRE from the model_budget map (bare model id
// → cap; unlisted / typo'd → model_budget.default, else 1; CPU models
// stay cap 0 — the safety invariant). The auto side (this plugin) is the
// no-arg path of the spec-10 gate:
//   count < cap  → normal increment (count → count+1)
//   count == cap → consumes the configured emergency_budget 1 (count →
//                  cap+1, the ` emergency` suffix on the COMPACT line)
//   count > cap  → CLEAN FAIL (no compact, no line, no increment)
//
// Self-contained by design (the T5 constraint): NO runtime import from
// compact_memory.ts — that would pull the tool registration into a
// hook-only plugin. The config reader / budget store / cap resolver /
// summarizer-pair resolution / v1 call / COMPACT line writer below are
// small local duplicates of the tool's fail-open patterns (the tool's
// file is the source of truth — keep them in step).
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, PluginInput } from "@opencode-ai/plugin";

// ------------------------------------------------------------------ the directive
//
// The current post-compaction wording (the spec-2+11 relay addendum —
// auto_resume.ts POST_COMPACTION_ADDENDUM): the old T5 directive
// referenced the RETIRED looprunner and was replaced per TODO #93 (fact
// 8). Injected as a synthetic text part via promptAsync — the retry
// vehicle (the event hook returns void — there is no {handled, action}
// return).
const COMPACTION_RELOAD_DIRECTIVE =
  "post-compaction: re-read your head files per .opencode/agent/prompts/agent_readme_post_compaction.md and CONTINUE — never re-plan from scratch";

// ------------------------------------------------------------------ root / temp paths
//
// Project root: the factory-captured input.directory; absent → SELF-
// LOCATION (this file always lives at <root>/.opencode/plugin/
// context_recovery.ts — the PARENT of this file's directory), which keeps
// the plugin cwd-independent in the real host.
const SELF_OPENCODE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SELF_ROOT = path.dirname(SELF_OPENCODE_DIR);

function tempDir(root: string): string {
  return path.join(root, ".opencode", "temp");
}

function budgetPath(root: string): string {
  return path.join(tempDir(root), "compact_budget.json");
}

// ------------------------------------------------------------------ the config (read PER FIRE, fail-open)
//
// Top-level keys of <root>/.opencode/temp/compact_budget.json (all
// optional):
//   emergencyRecovery: strictly `true`   (default false — OFF)
//   keepMessages: number >= 0            (default 12 — keepTokens was
//                                         REMOVED, spec 01: never read,
//                                         never defaulted, never sent)
//   emergency_budget: number >= 0        (default 1 — the once-per-
//                                         session emergency compaction on
//                                         top of the model cap)
//   model_budget: { "<bare model ID>": <cap number>, "default": <cap> }
// Read PER FIRE (a mid-run flip takes effect on the next overflow); an
// absent file / unparseable JSON / malformed key fails open to the
// defaults (never a throw).
const DEFAULT_KEEP_MESSAGES = 12;
const DEFAULT_EMERGENCY_BUDGET = 1;
const DEFAULT_MODEL_BUDGET = 1;

type RecoveryConfig = {
  enabled: boolean;
  keepMessages: number;
  emergency_budget: number;
  model_budget: Record<string, number>;
};

function readRecoveryConfig(root: string): RecoveryConfig {
  const cfg: RecoveryConfig = {
    enabled: false,
    keepMessages: DEFAULT_KEEP_MESSAGES,
    emergency_budget: DEFAULT_EMERGENCY_BUDGET,
    model_budget: {},
  };
  try {
    const p = budgetPath(root);
    if (!existsSync(p)) return cfg;
    const parsed = JSON.parse(readFileSync(p, "utf8"));
    if (parsed != null && typeof parsed === "object") {
      if (parsed.emergencyRecovery === true) cfg.enabled = true;
      if (typeof parsed.keepMessages === "number" && Number.isFinite(parsed.keepMessages) && parsed.keepMessages >= 0) cfg.keepMessages = parsed.keepMessages;
      if (typeof parsed.emergency_budget === "number" && Number.isFinite(parsed.emergency_budget) && parsed.emergency_budget >= 0) cfg.emergency_budget = parsed.emergency_budget;
      const mb = parsed.model_budget;
      if (mb != null && typeof mb === "object" && !Array.isArray(mb)) {
        for (const [k, v] of Object.entries(mb)) {
          // cap 0 is meaningful (a model denied by config); a negative is not
          if (typeof v === "number" && Number.isFinite(v) && v >= 0) cfg.model_budget[k] = v;
        }
      }
    }
  } catch {
    // corrupt/unreadable config → defaults (OFF + default keeps) — never throw
  }
  return cfg;
}

// ------------------------------------------------------------------ the v2 budget store (shared by FILE with the tool)
//
// The SAME store the compact_memory tool uses: <root>/.opencode/temp/
// compact_budget.json, shape
//   { "version": 2,
//     "sessions": { "<sid>": { "count": <n>, "updated": "<iso ts>", "model": "<id>" } } }
// Read LENIENT (v1 files with maxPerSession / entries missing the model
// key). Increment on SUCCESS only (a failed compact does not consume
// budget), via re-read-then-write with NO await between the read and the
// write (the only interleaving-safe sequence for a file shared with the
// tool in-process).
type BudgetStoreV2 = {
  version: number;
  sessions: Record<string, { count: number; updated: string; model?: string }>;
};

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
  // re-read-then-write: NO await between the read and the write.
  const store = readBudget(root);
  store.version = 2; // the schema bump lands on the first v2 write
  const entry = store.sessions[sessionID] ?? { count: 0, updated: "", model: "" };
  entry.count = (entry.count ?? 0) + 1;
  entry.updated = new Date().toISOString();
  entry.model = typeof model === "string" && model !== "" ? model : (entry.model ?? "");
  store.sessions[sessionID] = entry;
  writeBudget(root, store);
}

// The cap resolver (a local duplicate of compact_memory's resolveCap):
// the CPU guard is a SAFETY INVARIANT (cap 0, tested FIRST — CPU models
// are never compacted); then the EXACT bare-model-id key of the file's
// model_budget map (its configured cap); else model_budget.default (else
// the default 1) — an unlisted / typo'd id simply never matches.
function resolveCap(cfg: RecoveryConfig, modelName: string): { cap: number; label: string } {
  const name = typeof modelName === "string" ? modelName : "";
  if (/^cpu/i.test(name)) return { cap: 0, label: "cpu (excluded)" };
  const mb = cfg.model_budget;
  if (name !== "" && typeof mb[name] === "number") return { cap: mb[name], label: "model_budget" };
  const def = typeof mb.default === "number" ? mb.default : DEFAULT_MODEL_BUDGET;
  return { cap: def, label: "model_budget default" };
}

// ------------------------------------------------------------------ the COMPACT line
//
// Appends the plugin's own COMPACT line to .opencode/temp/ctx.log after a
// successful recovery compaction (in-process file append, never throws).
// Shape = the current tool's writer (compact_memory.ts appendCompactLine):
// `<stamp>[ <model>] COMPACT <sid> messages=<m>[ emergency]` —
// messages-only (no tokens= field since spec 01) + the optional
// ` emergency` suffix (the once-per-session emergency compaction was
// consumed). The model field is POPULATED from the RESOLVED model id
// (the event hook carries no hook context — no pre-readout field,
// omitted).
function localStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

function appendCompactLine(root: string, sessionID: string, model: string, messages: number, emergency: boolean): void {
  try {
    const dir = tempDir(root);
    mkdirSync(dir, { recursive: true });
    const p = path.join(dir, "ctx.log");
    const modelField = typeof model === "string" ? model : "";
    const line =
      `${localStamp()}${modelField !== "" ? ` ${modelField}` : ""} ` +
      `COMPACT ${sessionID} messages=${messages}` +
      (emergency ? " emergency" : "");
    appendFileSync(p, line + "\n", "utf8");
  } catch {
    // best effort — never break the recovery over a write failure
  }
}

// ------------------------------------------------------------------ the summarizer pair (the v1 body REQUIRES providerID + modelID)
//
// Resolution (a local duplicate of the tool's — NO runtime import from
// compact_memory.ts):
//   fallback = the session's own model — the LAST entry of
//     session.messages({ path: { id } }) (DUAL SHAPE: the bare array, or
//     the in-process client's RequestResult wrapper { data: [...] }) —
//     info.modelID + info.providerID (assistant) / the info.model object
//     { id/modelID, providerID } (user); RPC failure / no messages → ""
//     (never a throw)
//   config override = the root opencode.jsonc (JSONC — falling back to
//     opencode.json when absent) agent.compaction.model "provider/model"
//     (split at the FIRST "/"); absent / unparseable / key missing /
//     non-string / malformed → the fallback pair UNCHANGED (source
//     "fallback").

// Strips // line + /* */ block comments from JSONC content, string-state
// aware (a local duplicate of the tool's exported stripJsoncComments —
// a // inside a string literal — e.g. a URL — must NOT start a comment;
// a quote inside a comment must not open a string).
function stripJsoncComments(content: string): string {
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

// Resolves the summarizer model pair from root-config content — PURE (a
// local duplicate of the tool's exported resolveCompactionModel):
// agent.compaction.model = "provider/model" → the config pair split at
// the FIRST "/" (both halves non-empty); any other shape (absent
// content, unparseable JSONC, key missing, non-string, malformed) → the
// fallback pair UNCHANGED, source "fallback".
function resolveCompactionModel(
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

// The root config content for the summarizer resolution (a local
// duplicate of the tool's readRootConfigContent — never throws):
// opencode.jsonc (JSONC), falling back to opencode.json when absent
// ("" when neither — the resolver then takes the fallback path).
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

// The session's own model pair via the messages RPC (a local duplicate of
// the tool's resolveModel CROSS branch — the event hook carries no tool
// context; never throws).
async function resolveSessionModel(client: any, sessionID: string): { model: string; providerID: string } {
  try {
    if (typeof client?.session?.messages !== "function") return { model: "", providerID: "" };
    const raw = await client.session.messages({ path: { id: sessionID } });
    // DUAL RESPONSE SHAPE: the in-process client resolves SDK calls to a
    // RequestResult wrapper ({ data: [...] }); the bare array is the
    // older / faked shape. Normalize to the bare array before the logic.
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
      return { model: id, providerID: pid };
    }
  } catch {
    return { model: "", providerID: "" };
  }
  return { model: "", providerID: "" };
}

// ------------------------------------------------------------------ the v1 client call
//
// The live client is v1-generation: `session.summarize` (session.compact
// is undefined on this host). The body ALWAYS carries providerID +
// modelID (REQUIRED by the server payload schema — an unresolvable pair
// is refused BEFORE any call, by the hook); the keep fields (messages
// only — spec 01) go in the body WHEN GIVEN; on a 404/missing-key/
// unexpected-field rejection the call is retried ONCE without the keep
// fields. A resolved promise is NOT success: success is the handler's
// boolean true (this host's client does NOT throw on a 404 — it resolves
// with the parsed error object). (A local duplicate of the tool's
// callSummarize / compactionFailure / isKeepRejectedError /
// errorMessage.)
// The minimal client surface the recovery needs (structural — this file
// imports no SDK runtime and the smoke/probe can fake it; the .d.ts
// signature is the source of truth).
type RecoveryClient = {
  session?: {
    summarize: (options: { path: { id: string }; body: Record<string, unknown> }) => Promise<unknown> | unknown;
    promptAsync: (options: {
      path: { id: string };
      body: { parts: Array<{ type: string; text: string; synthetic?: boolean }> };
    }) => Promise<unknown> | unknown;
    messages?: (options: { path: { id: string } }) => Promise<unknown> | unknown;
  };
};

// A 404 / missing-key / unexpected-field style rejection — the "keep not
// accepted by this build" retry trigger. Covers BOTH failure shapes this
// host produces: a THROWN error (throw-on client) and a RESOLVED 404
// JSON error object / server message string (throw-off client — the
// active case).
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

// The resolved result of a summarize call — this host's client does NOT
// throw on a 404 (it resolves with the parsed error object or
// undefined), so a resolved promise is NOT success: success is the
// handler's boolean `true` (full style: { data: true } /
// { response.ok: true }); anything else is a failure carrying the
// server's message.
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

async function callSummarize(
  client: RecoveryClient,
  sessionID: string,
  ref: { providerID: string; modelID: string },
  keepMessages: number,
): Promise<{ note: string; error: string }> {
  const base: Record<string, unknown> = {};
  if (ref.providerID !== "") base.providerID = ref.providerID;
  if (ref.modelID !== "") base.modelID = ref.modelID;
  const attempt = (withKeep: boolean): Promise<any> =>
    client.session.summarize({ path: { id: sessionID }, body: withKeep ? { ...base, keep: { messages: keepMessages } } : base });
  const NOTE = "keep not accepted by this build (retried without the keep fields)";
  try {
    let error = compactionFailure(await attempt(true));
    if (error !== "" && isKeepRejectedError({ message: error })) {
      const error2 = compactionFailure(await attempt(false));
      if (error2 === "") return { note: NOTE, error: "" };
      error = error2;
    }
    return { note: "", error };
  } catch (err: any) {
    if (isKeepRejectedError(err)) {
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

// ------------------------------------------------------------------ the overflow markers
//
// The prototype's working marker set (the observed provider error texts
// — the live 2026-09-23 fork-test error text matches marker 1). The
// SDK's session.error event carries the typed error union (
// MessageAbortedError & co.) whose text lives in data.message (the
// prototype's shape carried it top-level in error.message — both are
// checked; String(error) for a bare object is harmless — no marker
// matches).
function isOverflowError(error: any): boolean {
  const msg =
    typeof error?.data?.message === "string" && error.data.message !== ""
      ? error.data.message
      : String(error?.message ?? error ?? "");
  return (
    msg.includes("exceeds the available context size") ||
    msg.includes("context length exceeded") ||
    msg.includes("prompt is too long")
  );
}

// ------------------------------------------------------------------ the once-per-overflow guard
//
// The host emits FOUR session.error events for ONE overflow (its
// internal tail-strip retries — measured 2026-09-23): an in-memory Set
// of claimed sessionIDs (module state — the host runs one plugin
// instance). Claimed on fire, BEFORE the compact call (the burst events
// land while the first fire's summarize is in flight), cleared on the
// session's EventSessionIdle (type "session.idle" — it is in the Event
// union) — a LATER overflow may fire again (the budget state on disk
// still gates it).

const claimedOverflows = new Set<string>();

// ------------------------------------------------------------------ the plugin
export default (async (input: PluginInput) => {
  const root =
    typeof input?.directory === "string" && input.directory !== "" ? input.directory : SELF_ROOT;
  // The client is captured from the plugin input — the event hook
  // carries no per-fire context (the SDK signature is
  // event: (input: { event }) => Promise<void>).
  const client = (input?.client ?? undefined) as unknown as RecoveryClient | undefined;
  return {
    event: async ({ event }: { event: any }) => {
      // EventSessionIdle → clear the guard for that session (a NEW
      // overflow later may fire again — the budget state on disk still
      // gates it).
      if (event != null && event.type === "session.idle") {
        const idleId = typeof event.properties?.sessionID === "string" ? event.properties.sessionID : "";
        if (idleId !== "") claimedOverflows.delete(idleId);
        return;
      }
      // Not a session.error event → nothing to do.
      if (event == null || event.type !== "session.error") return;
      const props = event.properties != null && typeof event.properties === "object" ? event.properties : {};
      // Not an overflow → UNHANDLED (the marker gate is in-memory — it
      // comes first so non-overflow errors never touch the fs).
      if (!isOverflowError(props.error)) return;
      // Fail-closed: the sessionID is required (capital-D per the SDK
      // type).
      const sessionID = typeof props.sessionID === "string" && props.sessionID !== "" ? props.sessionID : "";
      if (sessionID === "") return;
      // The activation flag, read PER FIRE: missing file / missing key /
      // any other value / unparseable → OFF (the hook does NOTHING —
      // the session error propagates, the visible hard stop).
      const cfg = readRecoveryConfig(root);
      if (!cfg.enabled) return;
      // The once-per-overflow guard: already claimed this overflow (the
      // host's burst) → no-op (no fs, no client call).
      if (claimedOverflows.has(sessionID)) return;
      claimedOverflows.add(sessionID); // claim BEFORE the compact call (the burst events land while it is in flight)
      if (client?.session == null) return;
      // The model pair: fallback = the session's own model (the messages
      // RPC); config override = the root opencode.jsonc
      // agent.compaction.model (the JSONC-safe resolver).
      const fallback = await resolveSessionModel(client, sessionID);
      const pair = resolveCompactionModel(readRootConfigContent(root), { providerID: fallback.providerID, modelID: fallback.model });
      const model = pair.modelID;
      const providerID = pair.providerID;
      // The v1 summarize body REQUIRES providerID + modelID: an
      // unresolvable pair → the request is NOT sent (CLEAN FAIL — no
      // budget, no line; the session error propagates).
      if (model === "" || providerID === "") return;
      // The v2 budget gate BEFORE the compact call (the auto / no-arg
      // path): count < cap → normal; count == cap → the configured
      // emergency_budget 1 (count → cap+1, the ` emergency` line
      // suffix); count > cap (or no emergency slot) → CLEAN FAIL — no
      // compact, no line, no increment (the looping agent is stopped by
      // the budget, not healed).
      const { cap } = resolveCap(cfg, model);
      const count = budgetCount(root, sessionID);
      let isEmergency = false;
      if (count < cap) {
        isEmergency = false;
      } else if (count === cap && cfg.emergency_budget >= 1) {
        isEmergency = true;
      } else {
        return;
      }
      // The keep: keepMessages ONLY (spec 01: keepTokens never read,
      // never defaulted, never sent).
      const keepMessages = cfg.keepMessages;
      // The compaction call — AWAITED (unlike the tool's fire-and-forget
      // execute: the event hook is a server-side listener — NO turn
      // awaits it, and the overflowing turn is already ABORTED (the
      // model slot is free), so the tool's single-slot deadlock cannot
      // form here). Verified success only: increment + COMPACT line +
      // directive (a failed compact consumes NO budget and changes
      // nothing — the session error propagates).
      const { note, error } = await callSummarize(client, sessionID, { providerID, modelID: model }, keepMessages);
      if (error !== "") {
        console.error("Emergency compaction failed:", error);
        return;
      }
      if (note !== "") console.log(`context_recovery (${sessionID}): ${note}`);
      recordSuccess(root, sessionID, model);
      appendCompactLine(root, sessionID, model, keepMessages, isEmergency);
      // The directive — the retry vehicle (a lost directive degrades to
      // a plain retry — evidence only, never a throw).
      try {
        await client.session.promptAsync({
          path: { id: sessionID },
          body: {
            parts: [
              {
                type: "text",
                text: COMPACTION_RELOAD_DIRECTIVE,
                synthetic: true,
              },
            ],
          },
        });
      } catch (promptErr: any) {
        console.error("Emergency recovery directive delivery failed:", promptErr);
      }
    },
  };
}) satisfies Plugin;
