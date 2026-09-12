// T2 (iter-10, the loop-tool-batch part 2 — approved design:
// .opencode/proposals/approved/2026-09-12_loop-tool-batch.md): the `ctx_gauge`
// custom tool — the context-gauge readout as a DIRECTLY-FIRED tool. The
// agent fires this for context-budget decisions instead of the bash shell-out
// `node .opencode\plugin\scripts\peek.mjs` (the shell-out costs ~15k tokens
// per readout — the maintainer's observation that motivated the batch).
//
// The tool wraps the ONE shared gauge core (.opencode/plugin/scripts/gauge.mjs
// — backend chain, window rule, readout forms; NOTHING re-derived here) and
// mirrors peek.mjs IN-BAND: the same readout string, and on a db failure the
// core's error text is APPENDED to the line (` — <error>`) where peek.mjs
// writes it to stderr — the line is NEVER replaced by a stack trace (the
// core never throws). The host names the tool by FILENAME — no `name` field
// (the committed tool() form, cf. compact_memory.ts / block_transfer.ts).
// Registration is the maintainer's domain (the live opencode.jsonc — this
// file is deliberately NOT registered in any repo config).
import { tool } from "@opencode-ai/plugin"
import { readGauge, formatGauge } from "../plugin/scripts/gauge.mjs"

export default tool({
  description: `Reads the context usage of the current (or a named) session, read-only.
Returns the \`SESSION=… CTX=… (…%) REM=…\` readout (window unknown → no pct/REM; no total / unreadable db → CTX=notAvailable with the error appended). Fire this for context-budget decisions instead of the peek.mjs shell-out.`,
  args: {
    sessionID: tool.schema.string().optional().describe("Session id to read (the per-session read). Empty/omitted: the newest-updated session (the default peek read)."),
  },

  execute: async (args: any, context: any) => {
    // The shared core read (NEVER throws — a hard failure comes back as
    // kind:"db-error" with the capped, backend-naming error text).
    const r = await readGauge(undefined, args?.sessionID);
    let out = formatGauge(r);
    if (r.kind === "db-error") out += ` — ${r.error}`; // the in-band mirror of peek.mjs's stderr note
    return out;
  }
});
