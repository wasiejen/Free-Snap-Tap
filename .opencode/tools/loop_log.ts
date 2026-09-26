// T3 (iter-13, the loop-tool-batch part 3 — approved design:
// .opencode/proposals/approved/2026-09-12_loop-tool-batch.md): the `loop_log`
// custom tool — the looprun activity log as a DIRECTLY-FIRED tool. Every agent
// used to hand-append its loop-log line (the 8-char status token, the
// role-iteration, the session id, the model, the content — format discipline
// that is error-prone and context-costly); this tool removes the hand-formatting
// AND the per-agent folder-permission management (the single point that grants
// loop-folder write access to all agents at once).
//
// v2 (plan24; the approved design .opencode/proposals/approved/
// 2026-09-12_loop_log-v2.md, parts A–D, built A→B→C→D):
//   Part A — auto-identity: `role`/`model`/`session` are OPTIONAL; each is
//      resolved by a best-effort chain (first hit wins, else the literal
//      `unknown` in the line; NEVER throws — a missing context field just
//      falls through):
//        session: args.session → context.sessionID → context.sessionId
//                 → context.session?.id
//        role:    args.role    → context.agent
//        model:   args.model   → context.agent (the agent-identifier
//                 preference, the maintainer's --todo note) →
//                 context.extra.model.id
//   Part B — write confirmation: after the append the file is READ BACK and
//      the last line byte-compared; the return gains
//        folder: <name> (created)   <- iff THIS call created the folder
//        verified: readback-match   <- or readback-MISMATCH: <actual last line>
//   Part C — lenient status: the `status` arg is a FREE-FORM string,
//      normalized into the established 8-char tokens (the line format is
//      UNCHANGED — existing lines and any consumer stay parseable): lowercase
//      + strip non-alphanumerics, then the keyword check in the order
//      done/return/warn/info/start/correct. No keyword matched -> the tool
//      returns an Error naming the accepted keywords (it writes NOTHING — no
//      folder creation, no append); never a silent INFO fallback. (`restart`
//      normalizes to START — intended.)
//
// Behavior (append-only — the tool NEVER rewrites or curates the file):
//   1. resolve `.opencode/loop/` against `context.directory ?? process.cwd()`;
//   2. NO `autorun-*` folder there  -> create `autorun-<YYYY-MM-DD_HH-MM>`
//      (the name MACHINE-COMPUTED from the local clock, never retyped — the
//      AGENTS.md pattern-5 discipline) + its `loop_log.md`;
//      EXACTLY ONE                -> use it;
//      SEVERAL                    -> use the most-recently-MODIFIED one and
//      surface the anomaly in the return value (NEVER silently resolved,
//      NEVER an arbitrary pick);
//   3. append ONE machine-timestamped line in the established local
//      `YYYY-MM-DD_HH-MM` form:
//        <date_time> <status> <role> <session|unknown> <model> <content>
//      (`role`/`session`/`model` resolved by the Part A chains -> the literal
//      `unknown` when absent everywhere);
//   4. return the folder name (+ the `(created)`/`(existing)` flag, Part B)
//      + the exact line written + the write confirmation (`verified:`,
//      Part B) (+ the anomaly note, appended last).
//
// The six STATUS tokens (exactly, 8-char) are the line's established tokens;
// Part C produces them by normalizing the free-form `status` arg (see the
// Part C note above) — a bogus status is rejected at RUNTIME with an Error
// return that names the accepted keywords (nothing is written).
//
// The host names the tool by FILENAME — no `name` field (the committed tool()
// form, cf. ctx_gauge.ts / block_transfer.ts). Registration is the maintainer's
// domain (the live opencode.jsonc + the per-agent tool-access grant — this file
// is deliberately NOT registered in any repo config).
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { tool } from "@opencode-ai/plugin";

// Local clock, `YYYY-MM-DD_HH-MM` (minute resolution) — the SAME form the
// existing loop-log lines use. Machine-computed; NEVER retyped or compared by
// eye (AGENTS.md pattern 5).
function localStamp(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `_${p(d.getHours())}-${p(d.getMinutes())}`
  );
}

// Part A — best-effort identity resolution (the v2 auto-identity pattern):
// the FIRST source that is a non-blank string wins (its raw, untrimmed value);
// all sources absent/blank -> the literal `unknown`. Never throws — a missing
// context field just falls through to the next source.
function firstKnown(sources: unknown[]): string {
  for (const s of sources) {
    if (s != null && String(s).trim() !== "") return String(s);
  }
  return "unknown";
}

// Part C — lenient status: lowercase + strip everything non-alphanumeric,
// then the keyword check IN THIS ORDER (no keyword is a substring of another,
// so order only matters for the intended `restart` -> START case):
//   done -> DONE<---   return -> -RETURN-   warn -> -WARNING
//   info -> --INFO--   start -> -->START    correct -> CORRECT-
// No keyword matched -> null (the caller returns the Error, writes nothing).
const STATUS_KEYWORDS: ReadonlyArray<readonly [string, string]> = [
  ["done", "DONE<---"],
  ["return", "-RETURN-"],
  ["warn", "-WARNING"],
  ["info", "--INFO--"],
  ["start", "-->START"],
  ["correct", "CORRECT-"],
];

function normalizeStatus(raw: unknown): string | null {
  const norm = String(raw ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [kw, token] of STATUS_KEYWORDS) {
    if (norm.includes(kw)) return token;
  }
  return null;
}

export default tool({
  description: `Appends ONE loop-log line to the current looprun's loop_log.md (auto-creates the dated autorun-* folder when .opencode/loop/ is empty); returns the folder + the exact line written. Fire this for your loop-log bookkeeping (START/DONE/RETURN/WARNING/INFO) instead of hand-formatting the line.`,
  args: {
    role: tool.schema
      .string()
      .optional()
      .describe("Your full role token, e.g. 'planner-10', 'worker-13', 'looprunner'. OPTIONAL — auto-filled from the host context.agent when omitted; the literal 'unknown' when absent everywhere."),
    model: tool.schema
      .string()
      .optional()
      .describe("Your model id, VERBATIM from your own launch context (e.g. 'Qwen3.8-27B-IQ4KT-120K'). OPTIONAL — auto-filled with the agent-identifier preference (context.agent first, context.extra.model.id as fallback); the literal 'unknown' when absent everywhere."),
    status: tool.schema
      .string()
      .describe("Free-form status word (Part C): must contain one of the keywords start / done / return / warn / info / correct (checked in that order) -> the established 8-char tokens (-->START / DONE<--- / -RETURN- / -WARNING / --INFO-- / CORRECT-). Case/dash/arrow variants all normalize (e.g. 'restart' -> -->START); an unrecognized status returns an error naming the keywords (never a silent INFO fallback, nothing is written)."),
    content: tool.schema
      .string()
      .describe("The single-line content for this event (task oneliner for START; the final gauge readout for DONE; the returned agent's 'role-N session_id model' for RETURN; the failed session id + cause for WARNING; short run info for INFO)."),
    session: tool.schema
      .string()
      .optional()
      .describe("Your session id, from the SESSION= field of your injected ctx: line. OPTIONAL — auto-filled from the host context (sessionID → sessionId → session.id) when omitted/empty; the literal 'unknown' in the line when absent everywhere."),
  },


  execute: async (args: any, context: any) => {
    // Part C — normalize the status FIRST (a bogus status writes NOTHING —
    // no folder creation, no append; never a silent INFO fallback).
    const status = normalizeStatus(args.status);
    if (status === null) {
      return `Error: unrecognizable status ${JSON.stringify(args.status)} — accepted keywords: start / done / return / warn / info / correct (no keyword matched; nothing was written).`;
    }

    const dir = context?.directory ?? process.cwd();
    const loopRoot = path.join(dir, ".opencode", "loop");

    // Step 2 — locate (or create) the current looprun folder.
    // (Part B: an EMPTY root means THIS call creates the folder.)
    let loopDirs: string[] = [];
    if (existsSync(loopRoot)) {
      loopDirs = readdirSync(loopRoot, { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name.startsWith("autorun-"))
        .map((e) => e.name)
        .sort(); // deterministic base order (the anomaly case re-sorts by mtime)
    }

    let folderName: string;
    let anomaly: string | null = null;

    if (loopDirs.length === 0) {
      // No current looprun folder -> create the dated one (machine-named).
      folderName = "autorun-" + localStamp();
      mkdirSync(path.join(loopRoot, folderName), { recursive: true });
    } else if (loopDirs.length === 1) {
      folderName = loopDirs[0];
    } else {
      // SEVERAL -> the most-recently-MODIFIED (surfacied, not silently resolved).
      const byMtime = loopDirs
        .map((name) => ({ name, mtime: statSync(path.join(loopRoot, name)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
      folderName = byMtime[0].name;
      anomaly = `ANOMALY: ${loopDirs.length} autorun-* folders exist in the loop dir; used the most-recently-modified (${folderName}). The protocol invariant is EXACTLY ONE current looprun folder — rollover is planner work.`;
    }

    // Step 3 — build and append the ONE machine-timestamped line (append-only).
    // Part A — auto-identity (best-effort chains; absent everywhere -> unknown).
    const session = firstKnown([
      args.session,
      context?.sessionID,
      context?.sessionId,
      context?.session?.id,
    ]);
    const role = firstKnown([args.role, context?.agent]);
    const model = firstKnown([
      args.model,
      context?.agent, // the agent-identifier preference (before the raw model id)
      context?.extra?.model?.id,
    ]);
    const line = `${localStamp()} ${status} ${role} ${session} ${model} ${args.content}`;
    const logPath = path.join(loopRoot, folderName, "loop_log.md");
    appendFileSync(logPath, line + "\n", "utf-8");

    // Part B — write confirmation: read the file back and byte-compare the
    // last line against the line just written (a mismatch surfaces the file's
    // ACTUAL last line — never silent).
    const readback = readFileSync(logPath, "utf-8");
    const rbLines = readback.split("\n").filter((l) => l !== "");
    const rbLast = rbLines.length > 0 ? rbLines[rbLines.length - 1] : "";
    const verified =
      rbLast === line
        ? "verified: readback-match"
        : `verified: readback-MISMATCH: ${rbLast}`;

    // Step 4 — return folder (with the created/existing flag) + line + the
    // write confirmation (+ the anomaly note, appended last).
    const parts = [
      `folder: ${folderName} ${loopDirs.length === 0 ? "(created)" : "(existing)"}`,
      `line: ${line}`,
      verified,
    ];
    if (anomaly) parts.push(anomaly);
    return parts.join("\n");
  }
});
