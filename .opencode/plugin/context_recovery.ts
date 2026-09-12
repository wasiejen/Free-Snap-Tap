// T5 (Cycle 2, L4 + L5 — approved design:
// .opencode/proposals/approved/2026-09-11_compaction-lifecycle.md): the
// emergency context-recovery plugin, completed on the maintainer's prototype.
//
// On an overflow `session.error` (activation flag ON) it compacts with an
// informed keep, appends its own COMPACT line to .opencode/temp/ctx.log,
// injects the re-application directive as a synthetic message, and returns
// { handled: true, action: "retry" }. Over budget → CLEAN FAIL: the hook
// returns unhandled and the session error propagates (the -WARNING line is
// the looprunner's/protocol's job, not the plugin's).
//
// Activation flag (L5): a top-level BOOLEAN key `emergencyRecovery` in
// <root>/opencode.jsonc, read PER HOOK FIRE (a mid-run flip takes effect on
// the next overflow). ONLY the value `true` enables it — missing file /
// missing key / any other value / unparseable JSONC → OFF (the
// experiment-phase default: the visible hard stop).
//
// Budget: the SAME file the compact_memory tool uses
// (<root>/.opencode/temp/compact_budget.json, ≤2 per session id, self +
// emergency combined) — gated BEFORE the compact call, incremented on
// SUCCESS only, via re-read-then-write (no await between read and write).
//
// Keep: the design's measured rebuild profile (system prompt <10K +
// keep ≈30K + last 12 messages ≈ 31.7K) — it replaces the host's blind
// opencode.json compaction default.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, PluginInput } from "@opencode-ai/plugin";

// The re-application directive — the compact_memory tool's 2-line constant
// (the T3-escaped form: the prototype's single backslashes were JS escape
// sequences that silently stripped the path separators from the emitted
// pointer) plus one looprunner continuation line (added by the T5 build;
// keep/remove = maintainer call, tracked in
// proposals/2026-09-12_recovery-directive-looprunner-line.md).
const COMPACTION_RELOAD_DIRECTIVE = `
[SYSTEM CONTEXT DIRECTIVE]
Context was compacted. Read .opencode\\system_prompts\\agent_readme_post_compaction.md and re-read any required task-specific files using read_file before continuing.
If your role is Looprunner continue the last restart/resume close message of a Planner you have received.
`.trim();

// Informed keep (L4): the design's measured rebuild profile — system prompt
// <10K + keep ≈30K tokens + last 12 messages ≈ 31.7K. Replaces the host's
// blind opencode.json compaction default.
const KEEP_TOKENS = 30_000;
const KEEP_MESSAGES = 12;

// The L5 activation flag key (top level of <root>/opencode.jsonc, boolean).
const FLAG_KEY = "emergencyRecovery";

// ------------------------------------------------------------------ activation flag (L5)
//
// Strip JSONC comments (string-aware: `//` and `/* */` INSIDE a string
// literal are data, not comments) then JSON.parse. ANY failure → OFF.

function stripJsoncComments(src: string): string {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '"') {
      // Copy the string literal verbatim (honoring backslash escapes).
      out += c;
      i += 1;
      while (i < n) {
        const s = src[i];
        out += s;
        i += 1;
        if (s === "\\") {
          if (i < n) {
            out += src[i];
            i += 1;
          }
        } else if (s === '"') {
          break;
        }
      }
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") i += 1; // line comment (keep the newline)
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

function flagEnabled(root: string): boolean {
  try {
    const p = path.join(root, "opencode.jsonc");
    if (!existsSync(p)) return false;
    const obj = JSON.parse(stripJsoncComments(readFileSync(p, "utf8")));
    return obj != null && typeof obj === "object" && obj[FLAG_KEY] === true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ budget (shared with the tool by FILE)
//
// The SAME store the compact_memory tool uses (T3): <root>/.opencode/
// temp/compact_budget.json, shape
//   { "version": 1, "maxPerSession": 2,
//     "sessions": { "<sid>": { "count": <n>, "updated": "<iso ts>" } } }.
// Increment on SUCCESS ONLY (a failed compact does not consume budget),
// via re-read-then-write with NO await between the read and the write (the
// only interleaving-safe sequence for a file shared with the tool
// in-process).

const COMPACT_BUDGET_PER_SESSION = 2;

type BudgetStore = {
  version: number;
  maxPerSession: number;
  sessions: Record<string, { count: number; updated: string }>;
};

// Project root: the factory-captured input.directory; absent → SELF-LOCATION
// (this file always lives at <root>/.opencode/plugin/context_recovery.ts),
// which keeps the plugin cwd-independent in the real host (the same
// fallback the tool uses for its context.directory).
const SELF_OPENCODE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
  // re-read-then-write: NO await between the read and the write.
  const store = readBudget(root);
  const entry = store.sessions[sessionID] ?? { count: 0, updated: "" };
  entry.count = (entry.count ?? 0) + 1;
  entry.updated = new Date().toISOString();
  store.sessions[sessionID] = entry;
  writeBudget(root, store);
}

// ------------------------------------------------------------------ the COMPACT line
//
// Appends the plugin's own COMPACT line to .opencode/temp/ctx.log after a
// successful recovery compaction (in-process file append, never throws).
// Shape = the tool's: `<stamp>[ <model>] COMPACT <sid> tokens=<t>
// messages=<m>[ (<pre-readout>)]` — the model id and the pre-readout are
// BEST-EFFORT fields from the hook context (context.modelId /
// context.model.id, context.preReadout — the SDK's session.error context
// declares neither), OMITTED when absent.

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
    // best effort — never break the recovery over a write failure
  }
}

// ------------------------------------------------------------------ the hook

// The minimal client surface the recovery needs (the SDK's client —
// PluginInput.client / the hook context's client — is the generated opencode
// client; only session.compact + session.promptAsync are used — kept
// structural so this file imports no SDK runtime and the probe can fake it;
// the .d.ts signature is the source of truth).
type RecoveryClient = {
  session?: {
    compact: (options: { path: { id: string }; body: { keep: { tokens: number; messages: number } } }) => Promise<unknown> | unknown;
    promptAsync: (options: {
      path: { id: string };
      body: { parts: Array<{ type: string; text: string; synthetic?: boolean }> };
    }) => Promise<unknown> | unknown;
  };
};

// The prototype's overflow markers (its working shape — the observed
// provider error texts).
function isOverflowError(error: any): boolean {
  const msg = String(error?.message || error);
  return (
    msg.includes("exceeds the available context size") ||
    msg.includes("context length exceeded") ||
    msg.includes("prompt is too long")
  );
}

// The live-plugin shape (ctx_watchdog.ts tail, lines 707-720): a default
// factory that captures input.directory (root) + input.client and returns
// the hooks object. The handler keeps the prototype's (error, context)
// shape with context.sessionId + context.client.
export default (async (input: PluginInput) => {
  const root =
    typeof input?.directory === "string" && input.directory !== "" ? input.directory : path.dirname(SELF_OPENCODE_DIR);
  const fallbackClient = (input?.client ?? undefined) as unknown as RecoveryClient | undefined;
  return {
    "session.error": async (error: any, context: any) => {
      // Not an overflow → UNHANDLED (the marker gate is in-memory — it comes
      // first so non-overflow errors never touch the fs).
      if (!isOverflowError(error)) return;
      // L5 flag OFF (read PER FIRE: missing file / missing key / any other
      // value / unparseable) → the hook does NOTHING (no compact, no
      // retry) — the session error propagates (the visible hard stop).
      if (!flagEnabled(root)) return;
      const sessionId = typeof context?.sessionId === "string" ? context.sessionId : "";
      if (sessionId === "") return;
      // The hook context's client (the prototype's working shape); the
      // factory-captured input.client is the fallback for hosts whose
      // session.error context carries none.
      const client: RecoveryClient | undefined = (context?.client as RecoveryClient | undefined) ?? fallbackClient;
      if (client?.session == null) return;
      // Budget gate BEFORE the compact call: exhausted (count ≥ 2, self +
      // emergency combined) → CLEAN FAIL — no compact, no directive,
      // unhandled, no budget change. The looping agent is STOPPED by the
      // budget, not healed.
      if (budgetExhausted(root, sessionId)) return;
      try {
        await client.session.compact({
          path: { id: sessionId },
          body: {
            keep: {
              tokens: KEEP_TOKENS,
              messages: KEEP_MESSAGES,
            },
          },
        });
      } catch (compactErr) {
        // A failed compact consumes NO budget and changes nothing — the
        // session error propagates (the visible hard stop).
        console.error("Emergency compaction failed:", compactErr);
        return;
      }
      // Success only: persist the budget increment + write the COMPACT line
      // (both best-effort — the compaction itself already happened).
      recordSuccess(root, sessionId);
      appendCompactLine(root, context, sessionId, KEEP_TOKENS, KEEP_MESSAGES);
      try {
        await client.session.promptAsync({
          path: { id: sessionId },
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
      } catch (promptErr) {
        // The compaction happened; a lost directive degrades to a plain
        // retry — evidence only, never a throw.
        console.error("Emergency recovery directive delivery failed:", promptErr);
      }
      return { handled: true, action: "retry" };
    },
  };
}) satisfies Plugin;
