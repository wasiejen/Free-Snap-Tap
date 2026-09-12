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
// clear error NAMING what was probed (no silent fallback). Keep fields go in
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
// the response (never a throw). The gate (count from the store vs the cap)
// comes BEFORE any compact call: denial → clear message naming class + cap +
// count, ZERO side effects (no increment, no compact call, no COMPACT line).
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

// ------------------------------------------------------------------ responses
//
// The reload directive — carried VERBATIM from the v1 tool (the T3 escape
// fix: the escaped backslashes keep the path separators in the emitted
// pointer). BYTE-IDENTICAL: the default response (the `message` arg ABSENT)
// must match v1's success line + directive byte-for-byte.
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

// ------------------------------------------------------------------ the client call
//
// Detected with `typeof` — the SDK methods live on the PROTOTYPE (an in-key
// check sees only `_client`), so a presence test must be typeof-based.

// A 400 / unexpected-field style error — the "keep not accepted by this
// build" retry trigger (the generated v1 body type has no keep fields).
function isKeepRejectedError(err: any): boolean {
  const status = err?.status ?? err?.data?.status;
  if (status === 400) return true;
  const msg = typeof err?.message === "string" ? err.message : "";
  return /unexpected field|unknown field|bad request/i.test(msg);
}

// The v1-generation call (THE ACTIVE PATH ON THIS BUILD):
// summarize({ path: { id }, body }). The keep fields go in the body WHEN GIVEN;
// on a 400/unexpected-field error the call is retried ONCE without them.
// Returns a NOTE ("keep not accepted by this build") when the retry path ran,
// else "".
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

// Resolves the target session's model id (Part 2): SELF (no explicit id, or
// the explicit id == the calling session) → c.extra?.model?.id; CROSS → the
// LAST entry of session.messages({ path: { id } }) — info.modelID (assistant)
// / info.model (user). RPC failure / no messages / no client → "" + a NOTE
// (the default cap 1 applies downstream — never a throw).
async function resolveModel(client: any, toolCtx: any, sessionID: string, isSelf: boolean): Promise<{ model: string; note: string }> {
  if (isSelf) {
    const id = toolCtx?.extra?.model?.id;
    if (typeof id === "string" && id !== "") return { model: id, note: "" };
    return { model: "", note: "model unknown (no extra.model.id in the tool context) — default compaction budget applied" };
  }
  try {
    if (typeof client?.session?.messages !== "function") {
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

// ------------------------------------------------------------------ the plugin
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
            const { model, note: modelNote } = await resolveModel(ctx?.client, c, sessionID, isSelf);
            const { cap, label } = classifyQuantClass(model);

            // 3. the budget gate — BEFORE any compact call: denial has ZERO
            //    side effects (no increment, no compact call, no COMPACT line)
            const count = budgetCount(root, sessionID);
            if (count >= cap) {
              return (
                `Compaction refused: the compaction budget for ${sessionID} is exhausted — ` +
                `model class ${label} (cap ${cap}), used ${count}/${cap}. ` +
                `Hand over and start fresh — write the handover summary and let the loop restart with a fresh session.` +
                (modelNote !== "" ? `\n${modelNote}` : "")
              );
            }

            // 4. resolve the client call path (Part 1) — typeof detection
            //    (the SDK methods live on the prototype)
            let keepNote = "";
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
              keepNote = await callSummarize(client, sessionID, body);
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
            const note = [modelNote, keepNote].filter((s) => s !== "").join("; ");
            const response =
              typeof args?.message === "string" && args.message !== ""
                ? `${args.message}\n${POST_COMPACTION_TRAILER}`
                : `Context successfully compacted: kept last ${messagesToKeep} messages / ${tokensToKeep} tokens.\n\n${COMPACTION_RELOAD_DIRECTIVE}`;
            return note !== "" ? `${response}\n${note}` : response;
          } catch (err: any) {
            return `Compaction request failed: ${err?.message ?? err}`;
          }
        },
      }),
    },
  };
}
