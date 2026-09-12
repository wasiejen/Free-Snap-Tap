// T3 (iter-13, the loop-tool-batch part 3 — approved design:
// .opencode/proposals/approved/2026-09-12_loop-tool-batch.md): the `loop_log`
// custom tool — the looprun activity log as a DIRECTLY-FIRED tool. Every agent
// used to hand-append its loop-log line (the 8-char status token, the
// role-iteration, the session id, the model, the content — format discipline
// that is error-prone and context-costly); this tool removes the hand-formatting
// AND the per-agent folder-permission management (the single point that grants
// loop-folder write access to all agents at once).
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
//      (`session` omitted/empty -> the literal `unknown`);
//   4. return the folder name + the exact line written (+ the anomaly note).
//
// The five STATUS tokens (exactly, 8-char) are the `status` zod ENUM — a bogus
// token is rejected at PARSE time (the schema), not by a runtime check.
//
// The host names the tool by FILENAME — no `name` field (the committed tool()
// form, cf. ctx_gauge.ts / block_transfer.ts). Registration is the maintainer's
// domain (the live opencode.jsonc + the per-agent tool-access grant — this file
// is deliberately NOT registered in any repo config).
import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
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

export default tool({
  description: `Appends ONE loop-log line to the current looprun's loop_log.md (auto-creates the dated autorun-* folder when .opencode/loop/ is empty); returns the folder + the exact line written. Fire this for your loop-log bookkeeping (START/DONE/RETURN/WARNING/INFO) instead of hand-formatting the line.`,
  args: {
    role: tool.schema
      .string()
      .describe("Your full role token, e.g. 'planner-10', 'worker-13', 'looprunner' (the agent writes its own; the iteration suffix when known)."),
    model: tool.schema
      .string()
      .describe("Your model id, VERBATIM from your own launch context (e.g. 'Qwen3.8-27B-IQ4KT-120K')."),
    status: tool.schema
      .enum(["-->START", "DONE<---", "-RETURN-", "-WARNING", "--INFO--"])
      .describe("Exactly one of the five 8-char loop-log status tokens (a bogus token is rejected at parse time)."),
    content: tool.schema
      .string()
      .describe("The single-line content for this event (task oneliner for START; the final gauge readout for DONE; the returned agent's 'role-N session_id model' for RETURN; the failed session id + cause for WARNING; short run info for INFO)."),
    session: tool.schema
      .string()
      .optional()
      .describe("Your session id, from the SESSION= field of your injected ctx: line. Omitted/empty -> the literal 'unknown' in the line."),
  },

  execute: async (args: any, context: any) => {
    const dir = context?.directory ?? process.cwd();
    const loopRoot = path.join(dir, ".opencode", "loop");

    // Step 2 — locate (or create) the current looprun folder.
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
    const session =
      args.session != null && String(args.session).trim() !== ""
        ? String(args.session)
        : "unknown";
    const line = `${localStamp()} ${args.status} ${args.role} ${session} ${args.model} ${args.content}`;
    appendFileSync(path.join(loopRoot, folderName, "loop_log.md"), line + "\n", "utf-8");

    // Step 4 — return the folder + the exact line written (+ the anomaly note).
    const parts = [`folder: ${folderName}`, `line: ${line}`];
    if (anomaly) parts.push(anomaly);
    return parts.join("\n");
  }
});
