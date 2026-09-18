// #53 Part B (approved 2026-09-17: .opencode/proposals/approved/
// 2026-09-17_agent-feedback-closedown.md — "approved both parts in one
// unit"; Part A, the mandatory close-down prompt step, already landed in
// the role prompts): the `submit` custom tool — ONE unified append tool for
// the three agent-inbox channels. The #53 problem: the maintainer-only
// `agent_feedback.md` friction log was OPTIONAL and the early-close-at-
// stop-line discipline discarded optional close-down steps, so friction
// observations were systematically lost — AND the entry had to be hand-
// formatted (date_time + role tag) and hand-appended (file fiddling,
// accidental reads). This tool removes the hand-formatting AND the file
// fiddling: the agent supplies the text only; the tool machine-stamps each
// entry (date + role + session) and appends it.
//
// Behavior (append-only — the tool NEVER reads or rewrites a target):
//   1. args: `feedback?` / `knowledge?` / `todo?` (all optional strings,
//      at least one required — an EMPTY string counts as NOT provided).
//      role + session for the stamp are AUTO-FILLED from the tool context
//      (role = context.agent else `agent`; session = context.sessionID
//      else `unknown`) — there is NO role/session parameter;
//   2. NONE provided -> return an error string, no file touched;
//   3. for each PROVIDED param, append ONE entry to its HARDCODED target
//      (relative to `context.directory ?? process.cwd()`): entry =
//      `<header> <YYYY-MM-DD_HH-MM> <role> <session>` + the raw text + one
//      trailing blank line;
//        feedback  -> .opencode/agent/agent_feedback.md       (### header)
//        knowledge -> .opencode/agent/knowledge/knowledge_inbox.md (## header)
//        todo      -> todo_inbox.md (repo root)               (## header)
//      the header depth is the established form of each channel (the
//      feedback file is maintainer-curated with ### entries; the two inbox
//      files use ##); a missing target file (or its parent dir) is CREATED
//      carrying only the entry — no header invention;
//   4. return, per provided param: `<param>` + `target: <relative path>` +
//      `entry: <exact text>` (blocks in feedback/knowledge/todo order).
//
// Sandbox discipline: the targets are HARDCODED — there is NO path
// parameter (that is the sandbox). NOTE the deliberate deviation from the
// proposal's ".opencode/ subtree" wording: `todo_inbox.md` sits at the
// repo root (the AGENTS.md Discovery contract file) — the spec
// (handover_task.md, 2026-09-18) ratifies the three exact paths.
//
// The host names the tool by FILENAME — no `name` field (the committed
// tool() form, cf. loop_log.ts / ctx_gauge.ts / block_transfer.ts).
// Registration is the maintainer's domain (the live opencode.jsonc + the
// per-agent tool-access grant — this file is deliberately NOT registered
// in any repo config).
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { tool } from "@opencode-ai/plugin";

// Local clock, `YYYY-MM-DD_HH-MM` (minute resolution) — the SAME stamp form
// the existing inbox/feedback entries use. Machine-computed; NEVER retyped
// or compared by eye (AGENTS.md pattern 5).
function localStamp(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `_${p(d.getHours())}-${p(d.getMinutes())}`
  );
}

// The three HARDCODED channel targets (relative to the project dir) + their
// established header depths. There is NO path parameter — this table IS the
// sandbox.
const CHANNELS = {
  feedback: { rel: ".opencode/agent/agent_feedback.md", header: "###" },
  knowledge: { rel: ".opencode/agent/knowledge/knowledge_inbox.md", header: "##" },
  todo: { rel: "todo_inbox.md", header: "##" },
} as const;
type ChannelKey = keyof typeof CHANNELS;

export default tool({
  description: `Appends ONE machine-stamped entry (<header> <YYYY-MM-DD_HH-MM> <role> <session> + your raw text) to each of the provided inbox channels — feedback (friction points: what slowed/confused this session, one line preferred) -> .opencode/agent/agent_feedback.md; knowledge (verified, actionable knowledge in inbox format) -> .opencode/agent/knowledge/knowledge_inbox.md; todo (a loose finding, unnumbered — the planner assigns IDs at curation) -> todo_inbox.md. Fire it with at least one of feedback/knowledge/todo (several at once allowed; pass an empty string for the ones you skip). The date is stamped automatically and role + session are auto-filled from the tool context (role = context.agent, session = context.sessionID — falling back to 'agent'/'unknown'); the targets are hardcoded and NEVER read — you supply the three channel texts only, no file fiddling.`,
  args: {
    feedback: tool.schema
      .string()
      .optional()
      .describe("Friction description (one line preferred): what slowed down or confused this session, an unclear rule, missing context, a caught near-miss."),
    knowledge: tool.schema
      .string()
      .optional()
      .describe("Verified, actionable knowledge for the knowledge inbox (dated + role-tagged by the stamp; the knowledge curator moves it to the area files)."),
    todo: tool.schema
      .string()
      .optional()
      .describe("A loose finding (unnumbered) for the planner's TODO curation: problem + evidence, desired outcome, acceptance criteria."),
  },

  execute: async (args: any, context: any) => {
    const dir = context?.directory ?? process.cwd();

    // An empty/blank string counts as NOT provided (the same convention as
    // loop_log's session handling).
    const provided = (Object.keys(CHANNELS) as ChannelKey[]).filter(
      (k) => args[k] != null && String(args[k]).trim() !== ""
    );
    if (provided.length === 0) {
      return "error: none of feedback/knowledge/todo provided — nothing written";
    }

    const stamp = localStamp();
    // role + session are AUTO-FILLED from the tool context — the agent never
    // supplies them (the empty/blank string counts as NOT provided, the same
    // convention as loop_log's session handling).
    const role =
      context?.agent != null && String(context.agent).trim() !== "" ? String(context.agent) : "agent";
    const session =
      context?.sessionID != null && String(context.sessionID).trim() !== "" ? String(context.sessionID) : "unknown";

    const blocks: string[] = [];
    for (const key of provided) {
      const { rel, header } = CHANNELS[key];
      const target = path.join(dir, rel);
      mkdirSync(path.dirname(target), { recursive: true }); // missing dir -> create (recursive)
      const entry = `${header} ${stamp} ${role} ${session}\n${String(args[key])}\n\n`;
      appendFileSync(target, entry, "utf-8"); // append-only: the target is NEVER read
      blocks.push(`${key}\ntarget: ${rel}\nentry: ${entry}`);
    }
    return blocks.join("\n");
  }
});
