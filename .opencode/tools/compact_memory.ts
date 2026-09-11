// T3 (L2 — approved design: .opencode/proposals/approved/2026-09-11_compaction-lifecycle.md):
// the `compact_memory` custom tool, completed on the maintainer's prototype. The
// prototype's export shape (default export → tools.compact_memory), its arg names
// (keepTokens/keepMessages/sessionID) and its `context.client.session.compact({path, body})`
// call shape are the maintainer's and stay. This build adds, per the approved design:
//   (1) the persisted ≤2-per-session compaction budget (a JSON state store under
//       .opencode/temp/ — shared with the future T5 emergency hook by FILE),
//   (2) the tool's own COMPACT line appended to .opencode/temp/ctx.log after each
//       successful compaction (in-process file append; best-effort, never throws),
//   (3) the refusal note (hand over and start fresh) when the budget is exhausted.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tool } from "@opencode-ai/plugin"

// Define the reusable injection directive string. NOTE (T3): the prototype's
// single backslashes were JS escape sequences (`\s`, `\a`) that silently
// STRIPPED the path separators from the emitted pointer — they are now escaped
// so the pointer reaches the agent verbatim (the sentence itself is unchanged).
const COMPACTION_RELOAD_DIRECTIVE = `
[SYSTEM CONTEXT DIRECTIVE]
Context was compacted. Read .opencode\\system_prompts\\agent_readme_post_compaction.md and re-read any required task-specific files using read_file before continuing.
`.trim();

// ------------------------------------------------------------------ budget store
//
// The compaction budget: ≤2 per session id, self + emergency COMBINED (the design's
// L4 — the T5 recovery hook shares this SAME file, so the state must live on disk,
// not in module memory). Mechanic: a small JSON state store at
// `<root>/.opencode/temp/compact_budget.json`, shape
//   { "version": 1, "maxPerSession": 2,
//     "sessions": { "<sid>": { "count": <n>, "updated": "<iso ts>" } } }
// Increment happens on SUCCESS ONLY (a failed compact does not consume budget),
// via re-read-then-increment (no await between the read and the write — the only
// interleaving-safe sequence for a file shared with the T5 hook in-process).

const COMPACT_BUDGET_PER_SESSION = 2;

type BudgetStore = {
  version: number;
  maxPerSession: number;
  sessions: Record<string, { count: number; updated: string }>;
};

// Project root for the store + ctx.log: the SDK ToolContext carries `directory`
// (the probe passes the sandbox root); absent → SELF-LOCATION (this file always
// lives at <root>/.opencode/tools/compact_memory.ts), which keeps the tool
// cwd-independent in the real opencode host.
const SELF_OPENCODE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolveRoot(context: any): string {
  if (context != null && typeof context.directory === "string" && context.directory !== "") {
    return context.directory;
  }
  return path.dirname(SELF_OPENCODE_DIR);
}

function tempDir(root: string): string {
  return path.join(root, ".opencode", "temp");
}

function budgetPath(root: string): string {
  return path.join(tempDir(root), "compact_budget.json");
}

function readBudget(root: string): BudgetStore {
  try {
    const p = budgetPath(root);
    if (existsSync(p)) {
      const parsed = JSON.parse(readFileSync(p, "utf8"));
      if (parsed != null && typeof parsed === "object" && parsed.sessions != null && typeof parsed.sessions === "object") {
        return parsed as BudgetStore;
      }
    }
  } catch {
    // corrupt/unreadable store → treat as fresh (never throw)
  }
  return { version: 1, maxPerSession: COMPACT_BUDGET_PER_SESSION, sessions: {} };
}

function writeBudget(root: string, store: BudgetStore): void {
  try {
    const dir = tempDir(root);
    mkdirSync(dir, { recursive: true });
    writeFileSync(budgetPath(root), JSON.stringify(store, null, 2) + "\n", "utf8");
  } catch {
    // best effort — a lost increment errs toward ONE extra compaction, never a crash
  }
}

function budgetExhausted(root: string, sessionID: string): boolean {
  return (readBudget(root).sessions[sessionID]?.count ?? 0) >= COMPACT_BUDGET_PER_SESSION;
}

function recordSuccess(root: string, sessionID: string): void {
  const store = readBudget(root);
  const entry = store.sessions[sessionID] ?? { count: 0, updated: "" };
  entry.count = (entry.count ?? 0) + 1;
  entry.updated = new Date().toISOString();
  store.sessions[sessionID] = entry;
  writeBudget(root, store);
}

// ------------------------------------------------------------------ the COMPACT line
//
// Appends the tool's own COMPACT line to `.opencode/temp/ctx.log` after a
// successful compaction (in-process file append — the design explicitly allows
// it; never throws). Shape matches the T2 line convention — leading
// `YYYY-MM-DD_HH-MM` local stamp + the optional model field (OMITTED when
// empty) — with the design's L1 content: `COMPACT <session id> tokens=<t>
// messages=<m>` + the PRE-compaction readout in parentheses. The model id and
// the pre-readout are BEST-EFFORT fields from the tool's `context`
// (`context.modelId` / `context.model.id`, `context.preReadout`) — the SDK's
// ToolContext declares neither, so BOTH are omitted when unavailable, never
// thrown.

function localStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

function modelIdOf(context: any): string {
  if (context != null && typeof context.modelId === "string" && context.modelId !== "") return context.modelId;
  const mid = context?.model?.id;
  if (typeof mid === "string" && mid !== "") return mid;
  return "";
}

function preReadoutOf(context: any): string {
  if (context != null && typeof context.preReadout === "string" && context.preReadout !== "") return context.preReadout;
  return "";
}

function appendCompactLine(root: string, context: any, sessionID: string, tokens: number, messages: number): void {
  try {
    const dir = tempDir(root);
    mkdirSync(dir, { recursive: true });
    const p = path.join(dir, "ctx.log");
    const modelField = modelIdOf(context);
    const preField = preReadoutOf(context);
    const line =
      `${localStamp()}${modelField !== "" ? ` ${modelField}` : ""} ` +
      `COMPACT ${sessionID} tokens=${tokens} messages=${messages}` +
      `${preField !== "" ? ` (${preField})` : ""}\n`;
    appendFileSync(p, line, "utf8");
  } catch {
    // best effort — never break the tool over a write failure
  }
}

/**
 * 1. CUSTOM TOOL: Agent Self-Compaction Tool
 */
// -- maintainer: adapted to the tool() function and is now visible to agents (tested) and live right now
// but does not work: returns "undefined is not an object (evaluating 'context.client.session'""
export default tool({
  description: "Triggers immediate session compaction to free context space.",
  args: {
    keepTokens: tool.schema.number().describe("Number of recent tokens to retain (e.g. 10000 or 30000)"),
    keepMessages: tool.schema.number().describe("Number of recent messages to retain (e.g. 6 or 12)"),
    sessionID: tool.schema.string().describe("Number of recent messages to retain (e.g. 6 or 12)"),
  },

  execute: async (args: any, context: any) => {
    try {
      // Extract with fallback defaults if the agent omits an argument
      const tokensToKeep = args?.keepTokens ?? 30000;
      const messagesToKeep = args?.keepMessages ?? 12;
      const sessionID = args?.sessionID ?? context?.sessionId ?? context?.sessionID;

      if (typeof sessionID !== "string" || sessionID === "") {
        return "Compaction request failed: no session id available (pass the sessionID argument or a context session id).";
      }

      // The budget gate (≤2 per session id, self + emergency combined) comes
      // BEFORE the compact call: exhausted → the hand-over note, no compact.
      const root = resolveRoot(context);
      if (budgetExhausted(root, sessionID)) {
        return `Compaction refused: the session compaction budget (${COMPACT_BUDGET_PER_SESSION} per session, self + emergency combined) is exhausted for ${sessionID}. Hand over and start fresh — write the handover summary and let the loop restart with a fresh session.`;
      }

      await context.client.session.compact({
        path: { id: sessionID },
        body: {
          keep: {
            tokens: tokensToKeep,
            messages: messagesToKeep
          }
        }
      });

      // Success only: persist the budget increment + write the COMPACT line
      // (both best-effort — the compaction itself already happened).
      recordSuccess(root, sessionID);
      appendCompactLine(root, context, sessionID, tokensToKeep, messagesToKeep);

      // Returning this string ensures the post-compaction response contains the directive
      return `Context successfully compacted: kept last ${messagesToKeep} messages / ${tokensToKeep} tokens.\n\n${COMPACTION_RELOAD_DIRECTIVE}`;
    } catch (err: any) {
      return `Compaction request failed: ${err.message}`;
    }
  }
});
