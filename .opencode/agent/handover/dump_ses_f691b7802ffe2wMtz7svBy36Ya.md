Gotchas are mainly FST/GUI-related, nothing plugin-specific that would change my approach.

Okay, context check: about 70% used (36K remaining on a 120K window). Task is large (plugin file + probe S13 + bookkeeping). Per L3 rules: when starting a large unit, if the readout is ≥80% → compact first. Currently at 70% — not 80%. Let's proceed efficiently.

Now writing the loop_log START line, then writing the plugin file (unit 1).

Loop log format: role "worker-1", model "Qwen3.8-27B-IQ4KT-120K", status "-->START", content = task one-liner.

Then write .opencode/plugin/compact_memory.ts.

Let me structure the plugin file carefully.

Key details:
1. Header comment explaining the build (proposal reference, T3 inheritance, resolution, quant-class budget, self-placement note).
2. Classifier table at the top (after the header, before the imports? "Ordered rule table at the top of the file" — I'll put it right after the imports; that's the top of the file's code. Actually, to respect "at the top," I'll place the table first among the code definitions, before the store mechanics. Imports must come first (ESM). The table comes after the imports.
3. classifyQuantClass is an exported function.
4. Directive constant (carried over verbatim from v1 — byte-identical).
5. Trailer constant (new, one line).
6. Store (v2 schema).
7. COMPACT line (model is populated from the resolved model).
8. Plugin default export.

Let me write out the code:

// compact_memory — plugin-registered compaction tool (approved proposal v2,
// Parts 1-4: .opencode/proposals/approved/2026-09-12_compact_memory_plugin.md).
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
// methods live on the PROTOTYPE): typeof ctx.client?.session?.compact ===
// "function" → v2 `compact({ sessionID })` (FLAT parameters — the generated
// v2 types mark the options body `never`); ELSE
// typeof ctx.client?.session?.summarize === "function" → v1
// `summarize({ path: { id }, body })` — THE ACTIVE PATH ON THIS BUILD (the
// client is v1-generation: summarize = function, compact = undefined); ELSE
// a clear error NAMING what was probed (no silent fallback). Keep fields go in
// the summarize body WHEN GIVEN (they are NOT in the generated v1 body type —
// providerID/modelID only); on a 400/unexpected-field error the call is
// retried ONCE without the keep fields and the response reports "keep not
// accepted by this build".
//
// Quant-class compaction budget (Part 2, priority.md #1): the cap is resolved
// AT CALL TIME from the target session's model name — SELF:
// c.extra?.model?.id; CROSS: the LAST entry of
// ctx.client.session.messages({ path: { id } }) (info.modelID — assistant /
// info.model — user); RPC failure / no messages → default cap 1 + a note in
// the response (never a throw). The gate (count from the store vs cap) comes
// BEFORE any compact call: denial → clear message naming class + cap + count,
// ZERO side effects (no increment, no compact call, no COMPACT line).
//
// NOTE (self-location depth): v1's one-level-up fallback assumed its OLD
// depth (<root>/.opencode/tools/compact_memory.ts); THIS file lives one
// directory deeper at <root>/.opencode/plugin/compact_memory.ts, so the
// fallback is the GRANDPARENT of the file's directory.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  { test: (name) => /iq4|q4/.test(name), cap: 3, label: "4-bit quant" },
  { test: (name) => /iq3|q3/.test(name), cap: 1, label: "3-bit quant" },
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

Then:

// ------------------------------------------------------------------ responses
//
// The reload directive — carried VERBATIM from the v1 tool (the T3 escape fix:
// the escaped backslashes keep the path separators in the emitted pointer).
// BYTE-IDENTICAL: the default response (the `message` arg ABSENT) must match
// v1's success line + directive byte-for-byte.
const COMPACTION_RELOAD_DIRECTIVE = `
[SYSTEM CONTEXT DIRECTIVE]
Context was compacted. Read .opencode\\agent\\prompts\\agent_readme_post_compaction.md and re-read any required task-specific files using read_file before continuing.
`.trim();

// The ONE-LINE trailer appended when the `message` arg is GIVEN (Part 1): the
// message replaces the directive as the response body, and this fixed line
// keeps the reload invariant alive whatever the caller writes.
const POST_COMPACTION_TRAILER =
  "Post-compaction reminder: re-read .opencode/agent/prompts/agent_readme_post_compaction.md before continuing.";

// v1 reporting defaults — the COMPACT line + the success line report THESE
// when the keep args are omitted (the v1 reporting shape is preserved).
const DEFAULT_KEEP_TOKENS = 30_000;
const DEFAULT_KEEP_MESSAGES = 12;

Store:

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

COMPACT line:

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
    const preField = context != null && typeof context.preReadout === "string" ? context.preReadout : "";
    const line =
      `${localStamp()}${modelField !== "" ? ` ${modelField}` : ""} ` +
      `COMPACT ${sessionID} tokens=${tokens} messages=${messages}` +
      `${preField !== "" ? ` (${preField})` : ""}\n`;
    appendFileSync(p, line, "utf8");
  } catch {
    // best effort — never break the tool over a write failure
  }
}

Client call:

// ------------------------------------------------------------------ the client call
//
// Detected with `typeof` — the SDK methods live on the PROTOTYPE (an in-key
// check sees only `_client`), so a presence test must be typeof-based.

function isKeepRejectedError(err: any): boolean {
  const status = err?.status ?? err?.data?.status;
  if (status === 400) return true;
  const msg = typeof err?.message === "string" ? err.message : "";
  return /unexpected field|unknown field|bad request/i.test(msg);
}

// The v1-generation call (THE ACTIVE PATH ON THIS BUILD): summarize({ path,
// body }). The keep fields go in the body WHEN GIVEN (they are not in the
// generated v1 body type); on a 400/unexpected-field error the call is
// retried ONCE without them. Returns a note ("keep not accepted by this
// build") when the retry path ran.
async function callSummarize(client: any, sessionID: string, body: any): Promise<string> {
  try {
    await client.session.summarize({ path: { id: sessionID }, body });
    return "";
  } catch (err: any) {
    if (body != null && isKeepRejectedError(err)) {
      await client.session.summarize({ path: { id: sessionID } });
      return "keep not accepted by this build (retried without the keep fields)";
    }
    throw err;
  }
}

Model resolution:

// Resolves the target session's model id (Part 2): SELF (no explicit id, or
// the explicit id == the calling session) → c.extra?.model?.id; CROSS → the
// LAST entry of session.messages({ path: { id } }) — info.modelID (assistant)
// / info.model (user). RPC failure / no messages → "" + a NOTE (default cap 1
// applies downstream — never a throw).
async function resolveModel(ctx: any, sessionID: string, isSelf: boolean): Promise<{ model: string; note: string }> {
  if (isSelf) {
    const id = ctx?.extra?.model?.id; // hmm — this is the TOOL context c, not the plugin ctx!
    ...
  }
}

Wait — careful. c.extra?.model?.id — c is the TOOL context passed to execute. The plugin ctx (captured) holds the client. So the model resolution uses c.extra (tool ctx) and ctx.client.session.messages (plugin ctx). So resolveModel needs both:

async function resolveModel(client: any, toolCtx: any, sessionID: string, isSelf: boolean): Promise<{ model: string; note: string }> {
  if (isSelf) {
    const id = toolCtx?.extra?.model?.id;
    if (typeof id === "string" && id !== "") return { model: id, note: "" };
    return { model: "", note: "model unknown (no extra.model.id in the tool context) — default compaction budget applied" };
  }
  try {
    if (client?.session?.messages == null || typeof client.session.messages !== "function") {
      return { model: "", note: "cross-session model read unavailable (no client.session.messages) — default compaction budget applied" };
    }
    const msgs = await client.session.messages({ path: { id: sessionID } });
    if (Array.isArray(msgs) && msgs.length > 0) {
      const info = msgs[msgs.length - 1]?.info ?? {};
      const id = typeof info.modelID === "string" && info.modelID !== "" ? info.modelID : info.model;
      if (typeof id === "string" && id !== "") return { model: id, note: "" };
    }
    return { model: "", note: "cross-session model read empty (no messages) — default compaction budget applied" };
  } catch {
    return { model: "", note: "cross-session model read FAILED (RPC error) — default compaction budget applied" };
  }
}

Plugin:

export default async function CompactMemoryPlugin(ctx: any) {
  return {
    tool: {
      compact_memory: tool({
        description: "Triggers immediate session compaction to free context space. Budget is per-session and per-model quant-class (CPU models are excluded — see the classifier in this plugin).",
        args: {
          sessionID: tool.schema.string().optional().describe("Session ID to compact (defaults to the calling session; an explicit id compacts ANOTHER session)"),
          keepTokens: tool.schema.number().optional().describe("Number of recent tokens to retain (e.g. 10000 or 30000)"),
          keepMessages: tool.schema.number().optional().describe("Number of recent messages to retain (e.g. 6 or 12)"),
          message: tool.schema.string().optional().describe("Post-compaction continuation message for the target session. Usage: 1-3 lines: what to resume + which files to re-read. ABSENT → the default reload directive is returned."),
        },
        async execute(args: any, c: any) {
          try {
            // 1. resolve the session id (Part 1)
            const sessionID = args?.sessionID ?? c?.sessionID;
            if (typeof sessionID !== "string" || sessionID === "") {
              return "Compaction request failed: no session id available (pass the sessionID argument or a context session id).";
            }

            const root = resolveRoot(c);
            const isSelf = args?.sessionID == null || (typeof c?.sessionID === "string" && args.sessionID === c.sessionID);

            // 2. resolve the model + the quant-class cap AT CALL TIME (Part 2)
            const { model, note } = await resolveModel(ctx?.client, c, sessionID, isSelf);
            const { cap, label } = classifyQuantClass(model);

            // 3. the budget gate — BEFORE any compact call: denial has ZERO
            //    side effects (no increment, no compact call, no COMPACT line)
            const count = budgetCount(root, sessionID);
            if (count >= cap) {
              return `Compaction refused: the compaction budget for ${sessionID} is exhausted — model class ${label} (cap ${cap}), used ${count}/${cap}. Hand over and start fresh — write the handover summary and let the loop restart with a fresh session.${note !== "" ? `\n${note}` : ""}`;
            }

            // 4. resolve the client call path (Part 1) — typeof detection
            //    (SDK methods live on the prototype)
            const client = ctx?.client;
            if (typeof client?.session?.compact === "function") {
              // v2: FLAT parameters — the generated v2 types mark the options
              // body `never` (no keep fields)
              await client.session.compact({ sessionID });
            } else if (typeof client?.session?.summarize === "function") {
              // v1 — THE ACTIVE PATH ON THIS BUILD: keep fields in the body
              // WHEN GIVEN; 400/unexpected-field → retry ONCE without them
              const keep: Record<string, number> = {};
              if (args?.keepTokens != null) keep.tokens = args.keepTokens;
              if (args?.keepMessages != null) keep.messages = args.keepMessages;
              const body = Object.keys(keep).length > 0 ? { keep } : undefined;
              const keepNote = await callSummarize(client, sessionID, body);
              if (keepNote !== "") note = note !== "" ? `${note}; ${keepNote}` : keepNote;
            } else {
              const compactType = typeof client?.session?.compact;
              const summarizeType = typeof client?.session?.summarize;
              return `Compaction request failed: no usable client — probed ctx.client?.session?.compact (type ${compactType}) and ctx.client?.session?.summarize (type ${summarizeType}); neither is a function (the client is not wired for this host build). No compaction was performed.`;
            }

            // 5. success only: persist the increment + write the COMPACT line
            //    (both best-effort — the compaction itself already happened)
            recordSuccess(root, sessionID, model);
            const tokensToKeep = args?.keepTokens ?? DEFAULT_KEEP_TOKENS;
            const messagesToKeep = args?.keepMessages ?? DEFAULT_KEEP_MESSAGES;
            appendCompactLine(root, c, sessionID, model, tokensToKeep, messagesToKeep);

            // 6. the response (Parts 1/3): message ABSENT → the v1 success
            //    line + directive BYTE-IDENTICAL; GIVEN → the message + the
            //    ONE-LINE trailer (the reload invariant survives)
            let response: string;
            if (typeof args?.message === "string" && args.message !== "") {
              response = `${args.message}\n${POST_COMPACTION_TRAILER}`;
            } else {
              response = `Context successfully compacted: kept last ${messagesToKeep} messages / ${tokensToKeep} tokens.\n\n${COMPACTION_RELOAD_DIRECTIVE}`;
            }
            if (note !== "") response += `\n${note}`;
            return response;
          } catch (err: any) {
            return `Compaction request failed: ${err?.message ?? err}`;
          }
        },
      }),
    },
  };
}

Wait — the order issue: computing tokensToKeep/messagesToKeep before appendCompactLine. Fine.

One question: callSummarize(client, sessionID, body) — if body is undefined and the call fails with 400 (no keep to drop), body != null is false → rethrow → top-level catch → error note. Good.

Hmm — also for v2 compact: should it be retried on 400? No keep fields were sent, so there's nothing to drop. Fine.

Edge case: args?.keepTokens = 0? 0 != null → true → keep.tokens = 0. Fine.

Now, one subtle point: the gate runs BEFORE client resolution — meaning that even if the client is broken, if the budget is exhausted → it's refused (no side effects). The spec says "gate (count=cap−1 allowed; count=cap refused with zero side effects; CPU- model always refused)" — the gate is independent. My ordering: gate before the client call. In the CPU-always-refused test (check 94): the client can even be a working summarize client, but the refusal must have zero side effects. Good.

But — check 91 (no-client error path): the self model from extra → IQ4 → cap 3, count 0 → gate passes → client resolution fails → error naming what was probed.

Now — one issue: the note for the SELF model when extra.model.id is absent. In my S13 fixture, extra.model is always present (except when testing this case — not explicitly required). OK.

Another design point: resolveModel(ctx?.client, ...) — I'm passing the plugin ctx's client. But c (tool ctx) has extra. I wrote resolveModel(ctx?.client, c, sessionID, isSelf) — the signature is (client, toolCtx, sessionID, isSelf). OK, consistent.

Now — TypeScript type stripping in plain node: Record<string, number> — fine (type annotations are stripped). Type-only usage is erased. OK.

const keep: Record<string, number> = {} — fine.

One concern: import { tool } from "@opencode-ai/plugin" — when the probe imports the plugin .ts file via a file URL, node resolves the bare specifier from .opencode/node_modules. The S10 tool does exactly this and it works. ✓

Now — probe S13. Let me write it out in full.

// ------------------------------------------------------------------ S13 compact_memory plugin tool (15) — the approved v2 proposal (Parts 1-4)
//
// The plugin at .opencode/plugin/compact_memory.ts (the plugin-registered
// compaction tool — the approved v2 proposal): imported DIRECT from the repo
// path (type-stripped, the same way the plugin loads — the file MUST load
// that way; NO HOOK fires — a direct import, so the S5 sandbox plugin.log
// tallies are UNCHANGED) + the `classifyQuantClass` NAMED export (the
// classifier's fixtures) + a FIXTURE mock: the plugin ctx carries a FAKE
// client (records every summarize / compact / messages call; per-test error
// switches) and the tool context carries directory=SANDBOX (steers ALL the
// plugin's fs writes — the v2 budget store + the COMPACT ctx.log line —
// into the sandbox) + sessionID + extra.model (the SELF model source, Part 2).
// Synthetic ids: ses_qc_* (fresh prefix — added to the FINGERPRINT below).
// The S10 section above pins the RETIRED v1 artifact at
// .opencode/plugin/deactivated/compact_memory_v1.ts; this section pins the
// plugin-registered build that supersedes it.
const QC_TS = path.join(REPO_ROOT, ".opencode", "plugin", "compact_memory.ts");
const qcMod = await import(pathToFileURL(QC_TS).href);
const qcFactory = qcMod.default;
const qcClassify = qcMod.classifyQuantClass;
// Byte-identical copy of the plugin's directive constant (the runtime value
// carries the SINGLE backslashes in the path pointer — cf. the RC_DIRECTIVE
// convention above).
const QC_DIRECTIVE =
  "[SYSTEM CONTEXT DIRECTIVE]\nContext was compacted. Read .opencode\\agent\\prompts\\agent_readme_post_compaction.md and re-read any required task-specific files using read_file before continuing.";
// The plugin's ONE-LINE trailer (the message-arg response shape — Part 1).
const QC_TRAILER_POINTER = ".opencode/agent/prompts/agent_readme_post_compaction.md";
const qcBudgetFile = path.join(SANDBOX, ".opencode", "temp", "compact_budget.json");

// Fake client factory: records every call; error switches force the failure
// shapes. `summarize`/`compact` are added ONLY when the fixture says so (the
// prototype-method reality: absence = undefined, detected via typeof).
const qcMakeClient = (spec = {}) => {
  const rec = { summarize: [], compact: [], messages: [] };
  const client = { session: {} };
  if (spec.summarize) {
    client.session.summarize = (options) => {
      rec.summarize.push(options);
      if (spec.summarizeError) return Promise.reject(spec.summarizeError(rec.summarize.length));
      return Promise.resolve({ ok: true });
    };
  }
  if (spec.compact) {
    client.session.compact = (options) => {
      rec.compact.push(options);
      if (spec.compactError) return Promise.reject(spec.compactError(rec.compact.length));
      return Promise.resolve({ ok: true });
    };
  }
  if (spec.messages) {
    client.session.messages = (options) => {
      rec.messages.push(options);
      if (spec.messagesError) return Promise.reject(spec.messagesError);
      return Promise.resolve(spec.messages);
    };
  }
  return { client, rec };
};

// The tool context fixture (the probe passes directory=SANDBOX — ALL fs
// writes land in the sandbox; extra.model = the SELF model source).
const qcToolCtx = (extra = {}) => ({
  sessionID: "ses_qc_self",
  directory: SANDBOX,
  extra: { model: { id: "Qwen3.8-27B-IQ4KT-120K" } },
  ...extra,
});

// One plugin instance per client fixture (the factory captures ctx).
let qcTool;
const qcWith = async (spec = {}) => {
  const { client, rec } = qcMakeClient(spec);
  const reg = await qcFactory({ client });
  qcTool = reg.tool.compact_memory;
  return { rec, exec: (args, toolExtra) => qcTool.execute(args, qcToolCtx(toolExtra)) };
};

Hmm wait — I need to double-check that reg.tool.compact_memory exists. Also qcMakeClient error spec: spec.summarizeError might be a function (call-count-based) or a fixed error. Let me simplify: spec.summarizeError is either an Error or a function(n)→Error. I'll handle both:

const failWith = (spec, n) => (typeof spec === "function" ? spec(n) : spec);
Restructure:

const qcMakeClient = (spec = {}) => {
  const rec = { summarize: [], compact: [], messages: [] };
  const client = { session: {} };
  const errFor = (e) => (typeof e === "function" ? e : () => e);
  if (spec.summarize) {
    client.session.summarize = (options) => {
      rec.summarize.push(options);
      if (spec.summarizeError) return Promise.reject(errFor(spec.summarizeError)(rec.summarize.length));
      return Promise.resolve({ ok: true });
    };
  }
  ...

OK. Now the checks:

86 — the registration shape:
{
  const { rec } = await qcWith({ summarize: true });
  const t = qcTool;
  check(
    "86",
    "S13",
    "registration shape: the default factory returns tool.compact_memory (description + the Part 1 args as NAME → zod schema + async execute)",
    typeof qcFactory === "function" && t != null && typeof t.description === "string" &&
      JSON.stringify(Object.keys(t.args ?? {})) === JSON.stringify(["sessionID", "keepTokens", "keepMessages", "message"]) &&
      Object.values(t.args ?? {}).every((s) => s != null && typeof s.safeParse === "function") &&
      typeof t.execute === "function" && t.execute.constructor.name === "AsyncFunction",
    JSON.stringify({ keys: Object.keys(t ?? {}), args: Object.keys(t?.args ?? {}) }),
  );
}

87 — the classifier's fixtures:
{
  const cases = [
    ["Qwen-IQ4-Test", 3],
    ["Qwen-IQ3-Test", 1],
    ["Gemma-Q4KM-12B", 3],
    ["CPU-Qwen3-0.6B", 0],
    ["Mystery-7B", 1],
    ["Qwen3.8-27B-IQ4KT-120K", 3], // the trap: contains "Q3" (Qwen3.8) — the 4-bit rule must win by ORDER
  ];
  const got = cases.map(([name, want]) => [name, qcClassify(name).cap, qcClassify(name).cap === want]);
  check(
    "87",
    "S13",
    "classifier fixtures: IQ4→3, IQ3→1, Q4KM→3, CPU-…→0, unknown→1, the 'Qwen3.8-…-IQ4KT' trap (contains 'Q3')→3 (the ORDER is the semantics)",
    got.every(([, , ok]) => ok) && typeof qcClassify("CPU-x") === "object",
    JSON.stringify(got),
  );
}
Hmm, that last typeof clause is superfluous. Remove it.

88 — the summarize path (the ACTIVE build shape):
{
  const { rec, exec } = await qcWith({ summarize: true }); // NO compact — the v1-generation client
  const res = await exec({ keepTokens: 42000, keepMessages: 7 }); // self: c.sessionID
  check(
    "88",
    "S13",
    "the summarize path (THE ACTIVE BUILD): called with path.id = the calling session + body.keep {42000,7}; the compact method is NOT touched",
    rec.summarize.length === 1 && rec.summarize[0]?.path?.id === "ses_qc_self" &&
      rec.summarize[0]?.body?.keep?.tokens === 42000 && rec.summarize[0]?.body?.keep?.messages === 7 &&
      rec.compact.length === 0,
    JSON.stringify({ rec: { s: rec.summarize, c: rec.compact }, res: String(res).slice(0, 80) }),
  );
}

89 — keep retry-once:
{
  const boom = Object.assign(new Error("400 Bad Request: unexpected field 'keep'"), { status: 400 });
  const { rec, exec } = await qcWith({
    summarize: true,
    summarizeError: (n) => (n === 1 ? boom : null), // the first call rejects (400/unexpected-field), the retry resolves
  });
  const res = await exec({ keepTokens: 101, keepMessages: 3, sessionID: "ses_qc_retry" });
  check(
    "89",
    "S13",
    "keep retry-once: a 400/unexpected-field summarize is retried ONCE without the keep fields; the response reports 'keep not accepted by this build'; the compaction SUCCEEDS (count 1)",
    rec.summarize.length === 2 && rec.summarize[0]?.body?.keep?.tokens === 101 && (rec.summarize[1]?.body == null || rec.summarize[1]?.body?.keep == null) &&
      String(res).includes("keep not accepted by this build") && /compacted/i.test(res) &&
      (JSON.parse(readFileSync(qcBudgetFile, "utf8")).sessions.ses_qc_retry?.count === 1),
    JSON.stringify({ calls: rec.summarize, res: String(res).slice(0, 120) }),
  );
}

Wait — but qcBudgetFile must exist at that point. ses_qc_retry's store entry: yes, after the successful retry. But note — the budget file is shared, and earlier check 88 already created an entry for ses_qc_self. Reading the file gets both. Fine.

Hmm, one issue: in check 89 the exec passes sessionID "ses_qc_retry" (a cross → model read!). c.sessionID = "ses_qc_self" ≠ "ses_qc_retry" → isSelf false → resolveModel calls client.session.messages — which is NOT defined in this client (no spec.messages) → returns model "" + the note "cross-session model read unavailable". Then cap = default 1, count 0 → allowed. Summarize is called with ses_qc_retry. OK, it works, but the response will carry the note. Fine.

Actually, hmm, wait: this is a subtle behavioral consequence — a cross compact without a messages client always falls back to the default cap 1. That's per spec: "RPC failure / no messages → default cap 1 + note". OK.

90 — the compact path (v2):
{
  const { rec, exec } = await qcWith({ summarize: true, compact: true }); // BOTH present — compact must WIN
  const res = await exec({ keepTokens: 5, keepMessages: 2, sessionID: "ses_qc_v2" });
  check(
    "90",
    "S13",
    "the compact path (v2, when `compact` is present): called with the FLAT { sessionID }; summarize NOT touched; success",
    rec.compact.length === 1 && rec.compact[0]?.sessionID === "ses_qc_v2" && rec.summarize.length === 0 && /compacted/i.test(res),
    JSON.stringify({ compact: rec.compact, summarize: rec.summarize, res: String(res).slice(0, 80) }),
  );
}

91 — the no-client error path:
{
  // The plugin ctx carries NO client (client absent — the v1-generation gap)
  const reg = await qcFactory({});
  const t = reg.tool.compact_memory;
  const pre = ctxLogLines().length;
  const preCalls = null; // no client to record against
  let res = "";
  try {
    res = await t.execute({}, qcToolCtx({ sessionID: "ses_qc_nocli" }));
  } catch (e) {
    res = String(e?.message ?? e);
  }
  check(
    "91",
    "S13",
    "the no-client error path: NO throw; the error NAMES what was probed (compact + summarize, neither a function); ZERO side effects (no COMPACT line, no budget entry)",
    !String(res).includes("Cannot read") && /compact/i.test(res) && /summarize/i.test(res) && /function/i.test(res) &&
      ctxLogLines().length === pre && !(JSON.parse(readFileSync(qcBudgetFile, "utf8")).sessions ?? {})["ses_qc_nocli"],
    JSON.stringify({ res }),
  );
}

Hmm — the budget file: at this point the file exists (from 89). sessions["ses_qc_nocli"] is undefined → falsy. ✓. But note: if the file doesn't exist (if the earlier checks didn't write it) → readFileSync throws. By 91 the file exists (89 wrote it). To be safe, use a helper readQcBudget() with try/catch that returns null.

Actually, let me define a small helper:
const qcBudget = () => {
  try {
    return JSON.parse(readFileSync(qcBudgetFile, "utf8"));
  } catch {
    return null;
  }
};
And use it in 89, 91, 93, 96.

Also — the model for ses_qc_nocli: self? No: sessionID arg "ses_qc_nocli" ≠ c.sessionID "ses_qc_self" → CROSS → messages unavailable → default cap 1 + note → gate passes (0 < 1) → client resolution fails → the error message. Note appended to the error? My no-client error return does NOT append the note (it returns directly). That's fine — "a clear error naming what was probed" is the requirement.

Hmm wait, actually — let me reconsider: should the no-client error be returned before the gate? Consider a CPU cross session without a client: model read fails → default cap 1 (not 0!) → gate passes → no-client error. The "CPU- always refused" guarantee holds when the model is readable; without a client you can't even read the model → default cap 1. Acceptable per spec (the note documents the default budget). Check 94 (CPU always refused) uses a client WITH messages so the model is readable → cap 0 → refused. ✓

92 — the gate count=cap−1 allowed:
Pre-seed the budget file:
{
  // Pre-seed the sandbox store (v2 shape) — the gate reads from DISK
  writeBudgetFixture... 
  const seed = { version: 2, sessions: { ses_qc_gate: { count: 2, updated: "2026-09-12T00:00:00.000Z", model: "Qwen3.8-27B-IQ4KT-120K" } } };
  mkdirSync(path.dirname(qcBudgetFile), { recursive: true });
  writeFileSync(qcBudgetFile, JSON.stringify(seed, null, 2) + "\n", "utf8");
  const { rec, exec } = await qcWith({
    summarize: true,
    messages: [{ info: { modelID: "Qwen3.8-27B-IQ4KT-120K" } }],
  });
  const res = await exec({ keepTokens: 1, keepMessages: 1, sessionID: "ses_qc_gate" });
  const st = qcBudget();
  check(
    "92",
    "S13",
    "gate count=cap-1 ALLOVED (2 < the IQ4 cap 3, the cap resolved AT CALL TIME from the CROSS model read): compact called, count → 3",
    rec.summarize.length === 1 && rec.summarize[0]?.path?.id === "ses_qc_gate" && rec.messages.length === 1 && rec.messages[0]?.path?.id === "ses_qc_gate" &&
      st?.sessions?.ses_qc_gate?.count === 3 && /compacted/i.test(res),
    JSON.stringify({ st: st?.sessions?.ses_qc_gate, res: String(res).slice(0, 80) }),
  );
}

93 — the gate count=cap refused, zero side effects:
{
  // ses_qc_gate is now count 3 == cap 3 → the next call is REFUSED
  const { rec, exec } = await qcWith({
    summarize: true,
    messages: [{ info: { modelID: "Qwen3.8-27B-IQ4KT-120K" } }],
  });
  const pre = ctxLogLines().length;
  const res = await exec({ keepTokens: 1, keepMessages: 1, sessionID: "ses_qc_gate" });
  const st = qcBudget();
  check(
    "93",
    "S13",
    "gate count=cap REFUSED (3 == cap 3): the denial NAMES class + cap + count; ZERO side effects (no compact call, no COMPACT line, count unchanged)",
    rec.summarize.length === 0 && ctxLogLines().length === pre && st?.sessions?.ses_qc_gate?.count === 3 &&
      /refused/i.test(res) && /4-bit/.test(res) && res.includes("cap 3") && res.includes("3/3") && /hand over/i.test(res) && /start fresh/i.test(res),
    JSON.stringify({ res, st: st?.sessions?.ses_qc_gate }),
  );
}
Label "4-bit quant" → /4-bit/ ✓. The message contains "cap 3" and "3/3": my refusal message: model class 4-bit quant (cap 3), used 3/3. ✓

94 — CPU- always refused:
{
  const { rec, exec } = await qcWith({
    summarize: true,
    messages: [{ info: { modelID: "CPU-Qwen3-0.6B" } }],
  });
  const pre = ctxLogLines().length;
  const res = await exec({ sessionID: "ses_qc_cpu" });
  const st = qcBudget();
  check(
    "94",
    "S13",
    "a CPU- model session is ALWAYS refused (cap 0, even at count 0): zero side effects (no compact call, no COMPACT line, NO budget entry created)",
    rec.summarize.length === 0 && ctxLogLines().length === pre && st?.sessions?.ses_qc_cpu == null &&
      /refused/i.test(res) && res.includes("cap 0") && /hand over/i.test(res),
    JSON.stringify({ res, st }),
  );
}

95 — increment-on-success only:
{
  const { rec, exec } = await qcWith({
    summarize: true,
    summarizeError: new Error("boom-qc"), // a NON-400 failure → no retry, the error note
  });
  let threw = false, res = "";
  try {
    res = await exec({ keepTokens: 1, keepMessages: 1, sessionID: "ses_qc_fail" });
  } catch {
    threw = true;
  }
  const st1 = qcBudget();
  check(
    "95",
    "S13",
    "increment-on-success ONLY: a failing summarize (non-400) returns the error note (no throw), NO retry, NO increment, NO COMPACT line",
    !threw && /compaction request failed/i.test(res) && String(res).includes("boom-qc") &&
      st1?.sessions?.ses_qc_fail == null && ctxLogLines().length === ctxLogLines().length,
    ...
Oops — ctxLogLines().length === ctxLogLines().length is meaningless; capture pre. Let me fix:

{
  const pre = ctxLogLines().length;
  const { rec, exec } = await qcWith({ summarize: true, summarizeError: new Error("boom-qc") });
  let threw = false, res = "";
  try {
    res = await exec({ keepTokens: 1, keepMessages: 1, sessionID: "ses_qc_fail" });
  } catch {
    threw = true;
  }
  const st = qcBudget();
  check(
    "95",
    "S13",
    "increment-on-success ONLY: a FAILING summarize (non-400 'boom-qc') → the error note (no throw), NOT retried, NO increment, NO COMPACT line",
    !threw && /compaction request failed/i.test(res) && String(res).includes("boom-qc") &&
      rec.summarize.length === 1 && st?.sessions?.ses_qc_fail == null && ctxLogLines().length === pre,
    JSON.stringify({ threw, res, calls: rec.summarize.length, st }),
  );
}

96 — the v2 store schema + lenient v1 read:
{
  // (a) the v2 schema after a success: version 2 + entry { count, updated, model }
  const { rec, exec } = await qcWith({ summarize: true });
  await exec({ keepTokens: 1, keepMessages: 1 }); // self → ses_qc_self, the model is extra.model.id
  const st = qcBudget();
  const entry = st?.sessions?.ses_qc_self;
  const isoOk = entry != null && typeof entry.updated === "string" && !Number.isNaN(Date.parse(entry.updated));
  const schemaOk = st?.version === 2 && entry != null && typeof entry.count === "number" && isoOk && entry.model === "Qwen3.8-27B-IQ4KT-120K";
  // (b) READ LENIENT: a v1-shape store (maxPerSession, entries WITHOUT the model key) is read fine — the next success increments to 2 and the file is BUMPED to version 2
  const v1File = { version: 1, maxPerSession: 2, sessions: { ses_qc_v1: { count: 1, updated: "2026-09-01T00:00:00.000Z" } } };
  writeFileSync(qcBudgetFile, JSON.stringify(v1File, null, 2) + "\n", "utf8");
  const b2 = await qcWith({ summarize: true, messages: [{ info: { modelID: "Qwen-IQ4-X" } }] });
  const res2 = await b2.exec({ keepTokens: 1, keepMessages: 1, sessionID: "ses_qc_v1" });
  const st2 = qcBudget();
  check(
    "96",
    "S13",
    "the v2 store schema on disk (version 2, entry { count, updated (ISO), model = the resolved id }) + READ LENIENT (a v1 file w/ maxPerSession + a model-less entry → incremented to 2, the file bumped to version 2)",
    schemaOk && /compacted/i.test(res2) && st2?.version === 2 && st2?.sessions?.ses_qc_v1?.count === 2 && st2?.sessions?.ses_qc_v1?.model === "Qwen-IQ4-X",
    JSON.stringify({ st: entry, v1: st2?.sessions?.ses_qc_v1, res2: String(res2).slice(0, 60) }),
  );
}

Note: part (a) uses the self path (ses_qc_self) with the default model → model field "Qwen3.8-27B-IQ4KT-120K". ✓

97 — the COMPACT line WITH the model field populated:
{
  const pre = ctxLogLines().length;
  const { rec, exec } = await qcWith({ summarize: true });
  await exec({ keepTokens: 50123, keepMessages: 9, sessionID: "ses_qc_line" });
Wait — sessionID "ses_qc_line" ≠ ses_qc_self → cross → messages needed. Provide a messages fixture returning the IQ4 model. Then the line: <dt> Qwen3.8-27B-IQ4KT-120K COMPACT ses_qc_line tokens=50123 messages=9.

  const { exec } = await qcWith({ summarize: true, messages: [{ info: { modelID: "Qwen3.8-27B-IQ4KT-120K" } }] });
  await exec({ keepTokens: 50123, keepMessages: 9, sessionID: "ses_qc_line" });
  const ll = ctxLogLines();
  const last = ll.length > 0 ? ll[ll.length - 1] : "";
  check(
    "97",
    "S13",
    "the COMPACT line WITH the model field POPULATED from the resolved model id: `<dt> Qwen3.8-27B-IQ4KT-120K COMPACT ses_qc_line tokens=50123 messages=9` (no pre-readout → omitted)",
    ll.length === pre + 1 && new RegExp(`^${DT} Qwen3.8-27B-IQ4KT-120K COMPACT ses_qc_line tokens=50123 messages=9$`).test(last),
    JSON.stringify({ pre, last }),
  );
}

I need DT — defined in the probe; used in S9/S10/S11 checks as a regex for the stamp. Let me find its definition.

98 — the response shape:
{
  const a = await qcWith({ summarize: true });
  const resDefault = await a.exec({ keepTokens: 1, keepMessages: 1, sessionID: "ses_qc_resp" });
Hmm — cross → messages… to avoid the note, use the SELF default (no sessionID arg) for the default-shape check → self, no note. But note — the gate: ses_qc_self's count has already been incremented in check 96a (count 1). Cap 3 → still allowed (count 1 < 3… wait 96a did a self exec → ses_qc_self count 1). OK, allowed.

  const { exec } = await qcWith({ summarize: true });
  const resDefault = await exec({}); // SELF, NO keep args, NO message
  const defaultOk = resDefault === `Context successfully compacted: kept last 12 messages / 30_000 tokens.\n\n${QC_DIRECTIVE}`;
  const b = await qcWith({ summarize: true });
  const resMsg = await b.exec({ message: "resume the unit-3 probe edits", sessionID: "ses_qc_msg" });
Wait — ses_qc_msg is cross → the messages fixture is needed to avoid the note. Provide messages. Then the response = message + trailer + note? The note is "" if messages return a model. Let me provide a messages fixture.

Actually, the trailer check: resMsg should be exactly resume the unit-3 probe edits\n<trailer> (2 lines). The trailer contains the pointer.

  const msgOk = resMsg.startsWith("resume the unit-3 probe edits\n") &&
    resMsg.split("\n").length === 2 &&
    resMsg.includes(QC_TRAILER_POINTER) &&
    !resMsg.includes(QC_DIRECTIVE);
  check(
    "98",
    "S13",
    "the response shapes: message ABSENT → the v1 success line + the directive BYTE-EXACT (default keep 30_000/12); message GIVEN → the message + EXACTLY ONE trailer line containing the post-compaction pointer (the directive is replaced)",
    defaultOk && msgOk,
    JSON.stringify({ resDefault, resMsg }),
  );
}

Wait — resDefault with no keep args: body = undefined → summarize is called with { path: { id }, body: undefined }. Fine. But — hmm, exec({}) — the args are {}: args?.keepTokens ?? 30_000 → 30_000. The success line "kept last 12 messages / 30_000 tokens" ✓.

But note — the model note: self → extra.model.id present → note "" → resDefault is exactly success+directive ✓.

Also — !resMsg.includes(QC_DIRECTIVE) — the trailer doesn't contain the directive text ✓.

99 — the cross-session model read (the LAST entry's info.modelID):
{
  const { rec, exec } = await qcWith({
    summarize: true,
    messages: [
      { info: { model: "user-model-x" } },
      { info: { modelID: "Qwen3.8-27B-IQ3KT-210K" } }, // the LAST entry (assistant) wins
    ],
  });
  const res = await exec({ keepTokens: 1, keepMessages: 1, sessionID: "ses_qc_cross" });
  const st = qcBudget();
  check(
    "99",
    "S13",
    "the CROSS-session model read: session.messages({ path: { id } }) is called for the target; the LAST entry's info.modelID (IQ3) sets the budget class — the store entry's model = THAT id; compacted under THAT session",
    rec.messages.length === 1 && rec.messages[0]?.path?.id === "ses_qc_cross" &&
      rec.summarize.length === 1 && rec.summarize[0]?.path?.id === "ses_qc_cross" &&
      st?.sessions?.ses_qc_cross?.model === "Qwen3.8-27B-IQ3KT-210K" && st?.sessions?.ses_qc_cross?.count === 1 && /compacted/i.test(res),
    JSON.stringify({ st: st?.sessions?.ses_qc_cross, res: String(res).slice(0, 80) }),
  );
}

100 — the failing cross RPC:
{
  const { rec, exec } = await qcWith({
    summarize: true,
    messagesError: new Error("boom-qc-rpc"),
  });
  let threw = false, res = "";
  try {
    res = await exec({ keepTokens: 1, keepMessages: 1, sessionID: "ses_qc_rpc" });
  } catch {
    threw = true;
  }
  const st = qcBudget();
  check(
    "100",
    "S13",
    "a FAILING cross-session messages RPC → NO throw: the default cap 1 applies (count 0 < 1 → allowed), a NOTE names the failure, the store entry's model is EMPTY",
    !threw && /compacted/i.test(res) && /model read/i.test(res) &&
      rec.summarize.length === 1 && rec.summarize[0]?.path?.id === "ses_qc_rpc" &&
      st?.sessions?.ses_qc_rpc?.count === 1 && (st?.sessions?.ses_qc_rpc?.model === "" || st?.sessions?.ses_qc_rpc?.model == null),
    JSON.stringify({ threw, res: String(res).slice(0, 120), st: st?.sessions?.ses_qc_rpc }),
  );
}

My note text: "cross-session model read FAILED (RPC error) — default compaction budget applied" → /model read/ ✓.

Now — wait, check 100: the messages spec. My qcMakeClient: if (spec.messages) — messagesError present but spec.messages absent (undefined) → the messages function is NOT added! I need: add messages if spec.messages != null or spec.messagesError is set. Fix:
if (spec.messages != null || spec.messagesError) {
  client.session.messages = (options) => { ... return Promise.resolve(spec.messages ?? []); };
}

Now — the FINGERPRINT addition. The new IDs: ses_qc_self, ses_qc_retry, ses_qc_v2, ses_qc_nocli, ses_qc_gate, ses_qc_cpu, ses_qc_fail, ses_qc_v1, ses_qc_line, ses_qc_resp… wait, I dropped ses_qc_resp in 98 (the self default uses ses_qc_self, and the message case uses ses_qc_msg). Let me finalize the ID list:
- ses_qc_self (86? no — 86 has no exec… actually the 86 qcWith doesn't call exec. ses_qc_self is used in 88, 96a, 98a)
- ses_qc_retry (89)
- ses_qc_v2 (90)
- ses_qc_nocli (91)
- ses_qc_gate (92, 93)
- ses_qc_cpu (94)
- ses_qc_fail (95)
- ses_qc_v1 (96b)
- ses_qc_line (97)
- ses_qc_msg (98b)
- ses_qc_cross (99)
- ses_qc_rpc (100)

12 IDs → added to the FINGERPRINT array.

Check count: 86..100 = 15 checks. S13=15. Total 99.

Now — the DT constant. Let me grep for the DT definition in the probe.

Also — I need to verify that ctxLogLines() exists (used in S9/S10 — yes, it's used in check 70 etc.).

Another important constraint: S13 writes to the sandbox's budget file — check 45 compares the .opencode listing + git status — the sandbox is outside the repo (os.tmpdir) ✓.

And check 43: the handover files byte-identical — S13 doesn't touch them ✓.

Now — one more thing to double-check: the S10 section currently references cmCtx = (extra = {}) => ({ sessionId: "ses_cm_1", ... }) — the v1 tool reads context.sessionId (camelCase). The v1 code is frozen, and the probe drives it explicitly. ✓ No change needed.

Now — the S10 header comment edit (lines 1410-1419):
Current:
// ------------------------------------------------------------------ S10 compact_memory tool (9) — L2 (the approved design)
//
// The custom tool at .opencode/tools/compact_memory.ts (T3, the compaction-
// lifecycle proposal L2): imported DIRECT from the repo path (type-stripped,
// the same way the plugin loads — the tool file MUST load that way) and driven
// with a FAKE client (records every session.compact call; a mutable FAIL switch
// forces the failure shape) + a FAKE context: directory=SANDBOX steers ALL the
// tool's fs writes (the budget store + the COMPACT ctx.log line) into the
// sandbox; sessionId is the prototype's working shape (modelId/preReadout are
// the best-effort L1 fields — carried in check 70, absent in all others).
const TOOL_TS = path.join(REPO_ROOT, ".opencode", "tools", "compact_memory.ts");
New (pinning the retired artifact):
// ------------------------------------------------------------------ S10 RETIRED v1 compact_memory tool (9) — pins the retired artifact
//
// The RETIRED v1 custom tool at
// .opencode/plugin/deactivated/compact_memory_v1.ts (moved from
// .opencode/tools/compact_memory.ts — the T3 compaction-lifecycle proposal
// L2, superseded by the plugin-registered build pinned in S13): imported
// DIRECT from the repo path (type-stripped, the same way the plugin loads —
// the file MUST load that way) and driven with a FAKE client (records every
// session.compact call; a mutable FAIL switch forces the failure shape) + a
// FAKE context: directory=SANDBOX steers ALL the tool's fs writes (the
// budget store + the COMPACT ctx.log line) into the sandbox; sessionId is the
// prototype's working shape (modelId/preReadout are the best-effort L1
// fields — carried in check 70, absent in all others). The check bodies are
// UNCHANGED — the v1 code is byte-identical at the new path.
const TOOL_TS = path.join(REPO_ROOT, ".opencode", "plugin", "deactivated", "compact_memory_v1.ts");

Header section map (line 271):
Current:
//   S1=3 S2=4 S3=5 S4=8 S6=8 S7=11 S8=8 S9=12 S10=9 S11=6 S12=4 S5=6  →  "PROBE handover: 84/84 PASS",
New:
//   S1=3 S2=4 S3=5 S4=8 S6=8 S7=11 S8=8 S9=12 S10=9 S11=6 S12=4 S13=15 S5=6  →  "PROBE handover: 99/99 PASS",
Let me verify 99 with node (Pattern 1). 3+4+5+8+8+11+8+12+9+6+4+15+6 = let me compute: 3+4=7; +5=12; +8=20; +8=28; +11=39; +8=47; +12=59; +9=68; +6=74; +4=78; +15=93; +6=99. Yes, 99. I'll still run node to be safe.

Also add to the header's "WHAT IT RUNS" list (after the S12 block, before the S5 block) an S13 description entry + a line in the EXTENDED changelog at the top. Minimal:

Changelog (after the line "loads the tool"):
// EXTENDED 2026-09-12 (the compact_memory plugin build — the new S13 section,
// checks 86-100; the plugin file is imported DIRECT, type-stripped, NO hook
// fires (the S5 tallies are unchanged); the S10 TOOL_TS is re-pointed to the
// retired v1 artifact at .opencode/plugin/deactivated/compact_memory_v1.ts):
Hmm, the top banner is a comment about the probe's history; appending fits the convention.

WHAT-IT-RUNS S13 entry (after the S12 block, before "S5 hygiene (6)"):
//   S13 compact_memory plugin tool (15) — the approved v2 proposal (Parts
//      1-4): the plugin file .opencode/plugin/compact_memory.ts is imported
//      DIRECT (type-stripped; NO hook fires — a direct import) + the
//      classifyQuantClass NAMED export; driven with a FIXTURE mock (plugin
//      ctx carrying a FAKE client that records summarize/compact/messages
//      calls; the tool ctx with directory=SANDBOX + sessionID + extra.model):
//      (86) the registration shape (the default factory → tool.compact_memory)
//      (87) the classifier fixtures (IQ4→3, IQ3→1, Q4KM→3, CPU-…→0,
//          unknown→1, the "Qwen3.8 contains Q3" trap→3)
//      (88) the summarize path (THE ACTIVE BUILD — path + body.keep)
//      (89) the keep retry-once (a 400/unexpected-field → retried WITHOUT
//          the keep fields + "keep not accepted by this build")
//      (90) the compact path (v2 flat { sessionID }, when `compact` is
//          present)
//      (91) the no-client error path (NAMES what was probed, zero side
//          effects)
//      (92-94) the gate (count=cap−1 allowed; count=cap REFUSED with ZERO
//          side effects; a CPU- model ALWAYS refused)
//      (95) increment-on-success only (a failing compact does not consume)
//      (96) the v2 store schema on disk (version 2, entry { count, updated,
//          model }) + the lenient v1 read
//      (97) the COMPACT line WITH the model field POPULATED
//      (98) the response shapes (default → the v1 success line + directive
//          BYTE-EXACT; message → the message + ONE trailer line with the
//          post-compaction pointer)
//      (99-100) the CROSS-session model read (the LAST entry's info.modelID;
//          a failing RPC → default cap 1 + a note, no throw)

Now, the S10 description in the header list too (the lines 173-206 block) — the spec says only the section map is mandatory; I'll leave the S10 header-list text as-is (it describes the retired tool's checks, still accurate). Hmm — it says "the tool file .opencode/tools/compact_memory.ts is imported DIRECT" — that becomes stale. The S10 section-header comment (in the body) is explicitly being updated. For consistency, I should also update the header-list S10 mention (a one-line touch): "the RETIRED v1 tool file (now .opencode/plugin/deactivated/compact_memory_v1.ts)". That's within the spirit of "update the section header comment to say it pins the RETIRED v1 artifact." I'll do a minimal edit there.

Let me check the exact current text at lines 173-182:
  //   S10 compact_memory tool (9) — the L2 approved design (the
  //      compaction-lifecycle proposal): the tool file
  //      .opencode/tools/compact_memory.ts is imported DIRECT from the repo
  //      path (type-stripped, the same way the plugin loads — the tool file
  //      MUST load that way) and driven with a FAKE client ...
Minimal edit: change "the tool file\n// .opencode/tools/compact_memory.ts is imported DIRECT" → "the RETIRED v1 tool file\n// .opencode/plugin/deactivated/compact_memory_v1.ts is imported DIRECT". That removes another "tools/compact_memory" occurrence. DoD requires zero hits of rg "tools/compact_memory" in the probe — so I MUST fix every occurrence. Let me grep all of them after the edits.

Now, the v1 file move + the two header lines:
git mv .opencode/tools/compact_memory.ts .opencode/plugin/deactivated/compact_memory_v1.ts
Then edit the top of the file to prepend exactly two lines:
// RETIRED 2026-09-12 — superseded by .opencode/plugin/compact_memory.ts (the
// plugin-registered build, the approved v2 proposal) — content FROZEN below.
// NOTE (self-location depth): the one-level-up SELF_OPENCODE_DIR fallback in
// this file assumes its OLD depth (.opencode/tools/); at its new
// deactivation depth it is one level short — the probe drives it with an
// explicit directory, so it stays green.
Wait — that's four lines. "Add exactly two header comment lines." So exactly two lines:

Line 1: // RETIRED 2026-09-12 — superseded by .opencode/plugin/compact_memory.ts (the plugin-registered build, approved v2 proposal) — content FROZEN below; the probe drives it with an explicit directory (its one-level-up self-location fallback assumed the OLD .opencode/tools/ depth — one level short at the new depth).

Hmm, that crams both notes into one line. "Add exactly two header comment lines: retired/superseded-by + the self-location-depth note" — two lines, one per topic:

Line 1: // RETIRED 2026-09-12 — superseded by .opencode/plugin/compact_memory.ts (the plugin-registered build per the approved v2 proposal) — content FROZEN below.
Line 2: // NOTE (self-location depth): the one-level-up SELF_OPENCODE_DIR fallback assumes this file's OLD depth (.opencode/tools/) — at the new deactivation depth it is one level short; the probe drives the tool with an explicit directory, so it stays green.

Exactly two lines.

Now — does the v1 file's self-location fallback actually break in the probe? The probe's cmCtx always passes directory: SANDBOX → resolveRoot uses the sandbox → the fallback is never used. ✓ (The spec confirms: "the probe drives it with an explicit directory, so it stays green.")

Does the v1 file need to be parseable as a .ts import at the new location? Yes — S10 imports it. The content is byte-identical + two comment lines → still parseable. ✓

Now — one more scope item: "the probe drives it" — also confirm S10's check 73 cache-busted re-import: import(pathToFileURL(TOOL_TS).href + "?cm_reimport=1") — the new path works. ✓

Now, let me think about the unit 1 checkpoint: write the plugin file. Can I verify the plugin file alone before the probe is updated? I could run a quick node smoke test: import the plugin, run the factory, call execute with a fake client — a scratch test in the temp dir (a scratchpad). That de-risks before the probe work. Good idea — the scratchpad is C:/Users/Wasiejen/AppData/Local/Temp/opencode. But note: the plugin writes to c.directory — I'll point directory to a scratch temp folder. Let me write a small smoke script.

Actually — a simpler de-risk: after writing the plugin file, I'll run the probe as-is (still 84 checks) — it should still be green (the S10 path is unchanged until unit 2). That verifies the repo is intact but doesn't exercise the new plugin. A scratch smoke is worth it for the core flow. I'll do a compact smoke: registration + summarize call + gate refusal + CPU refusal + cross model + retry. Keep it small.

Now — the context budget. About 70% (36K remaining). Writing the plugin file + probe S13 (a large block, ~15 checks) + edits will consume a fair amount. I'll be efficient: write the plugin file in a single write call, run the smoke, commit unit 1; then unit 2 (git mv + 2 lines), commit; unit 3 (probe edit), commit; unit 4 (TODO + summary + final commit).

Hmm, the spec says "finish with a single task commit: code + TODO.md + your summary." But also "checkpoint per unit (the spec's own units 1-4); commit only when green." So: green checkpoint commits per unit, then… the final "single task commit" — contradiction? Re-reading the launch message: "checkpoint per unit (the spec's own units 1-4); commit only when green. Finish with a single task commit: code + TODO.md + your summary written to handover_task_to_planner.md."

I think the intent is: checkpoint commits during the work are allowed/encouraged (green only), and the LAST commit must include TODO.md + the summary file. If the units 1-3 checkpoints are separate commits, the final commit (unit 4) = TODO + summary (and any remaining). Or: do all the work and make a single commit containing everything. The worker prompt says "checkpoint per unit: after each verified change, commit (green)." And the launch says finish with a single task commit containing code + TODO + summary. If I checkpoint units 1-3 separately, the final commit contains only TODO + summary — is that "a single task commit: code + TODO + summary"? The code is in the earlier commits. Hmm.

Given the ambiguity, the safest reading that satisfies both: make checkpoint commits per unit (code), and the final commit adds TODO.md + the summary. The "single task commit" phrasing most reasonably means "don't scatter bookkeeping across multiple commits; the final commit closes the task with the bookkeeping." The DoD says "one task commit (code + TODO + handover_task_to_planner.md), green" — hmm, that reads as one commit containing code + TODO + summary.

But the DoD also (in the launch instruction) says checkpoint per unit. If I make separate unit commits, the final state is: unit 1 commit, unit 2 commit, unit 3 commit, final commit (TODO + summary). The DoD's "one task commit (code + TODO + summary)" would be violated literally.

Alternative: checkpoint = get it to a safe, committed state… the Discovery section of AGENTS.md says "checkpoint per unit: after each verified change (worker)… commit (green) so a dead session loses at most one change."

I'll follow the worker-prompt + AGENTS.md rule (checkpoint per unit, green commits) and make the final commit the bookkeeping close-out (TODO.md + handover_task_to_planner.md). The launch instruction "finish with a single task commit: code + TODO.md + your summary" — if the units are already committed, the final commit contains TODO + summary; the code is in the unit commits. I'll note this in the summary (the commit list). Hmm, but the risk: the planner wanted exactly one commit. Re-reading the launch: "checkpoint per unit (the spec's own units 1-4); commit only when green." — explicit. And "finish with a single task commit: code + TODO.md + your summary written to …" — "finish with a single task commit" probably means "one final commit that closes the task (not several bookkeeping commits)."

Decision: checkpoint commits for units 1, 2, 3 (each green + verified), and the final unit-4 commit = TODO.md + handover_task_to_planner.md (the bookkeeping close). I'll document all commit hashes in the summary. This follows the stronger, repeated rule (checkpoint per unit; AGENTS.md's commit routine says the worker commits code + TODO + handover in one commit — "the worker commits its own code + TODO.md + the task's handover file in one commit" — hmm, that says one commit for code + TODO + handover!).

Ugh. AGENTS.md: "the worker commits its own code + TODO.md + the task's handover file in one commit." That's the standard routine. But checkpoint-per-unit conflicts with "one commit" for long tasks; the checkpoint rule exists to lose at most one unit. The practical reading: the routine describes what a single commit contains when the work is one commit; for multi-unit work, checkpoint commits are the explicit instruction from the launch. The final commit must contain TODO + the summary; the code can ride in the checkpoint commits.

Final decision: unit 1 commit (plugin file), unit 2 commit (retirement move + header lines + S10 re-point — wait, the S10 re-point belongs to unit 3's scope, but if I don't re-point, S10 breaks the moment the file is moved! After git mv, the probe points at a non-existent path → the probe is RED. So the move and the re-point must be in the same commit (green). So unit 2 = move + S10 re-point (both required for green). Unit 3 = S13 addition + FINGERPRINT + header map. Unit 4 = TODO + summary.

Actually, the spec's own units: 1 = the new plugin file; 2 = the v1 retirement (move + header lines); 3 = the probe (S10 re-point + S13 + fingerprint + header); 4 = bookkeeping. But unit 2 alone breaks the probe (S10 red). The spec says "commit only when green." So the practical grouping: unit 1 (plugin file — the probe is still green, the file is new and not yet imported), unit 2+3a (move + S10 re-point — green), 3b (S13 — green), 4 (bookkeeping). Four commits. Fine.

Let me get started. First, the loop_log START.
