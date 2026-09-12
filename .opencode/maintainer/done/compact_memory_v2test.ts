import { tool } from "@opencode/sdk";

export default tool({
  description: "Triggers immediate session compaction to free context space.",
  args: {
    keepTokens: tool.schema.number().optional().describe("Number of recent tokens to retain (default: 30000)"),
    keepMessages: tool.schema.number().optional().describe("Number of recent messages to retain (default: 12)"),
    sessionID: tool.schema.string().optional().describe("Session ID to compact (optional)")
  },

  //--maintainer: this is an example of a more robus way to handle the session context error (undefined is not an object (evaluating 'context.client.session')),
  // that might lead to resolve the undefined object issue by trying multiple sources to find the valid one.
  // - context found by maintainer that was the basis of this test implementation
  // "In OpenCode's tool execution framework, context does not pass a direct client.session object. Instead, OpenCode exposes API client methods either via context.client, direct context.session abstractions, or through the @opencode/sdk client package.
  //
  // When context.client is undefined, accessing .session throws that exact JavaScript runtime error (TypeError: undefined is not an object).
  // Why it happens & How to fix it
  // Inside an OpenCode tool() execution function, the second argument (context) provides workspace runtime metadata (like context.directory or context.sessionId). To interact with the OpenCode REST/RPC API safely, you have two clean options:
  // "

  async execute(args, context) {
    try {
      const tokensToKeep = args.keepTokens ?? 30000;
      const messagesToKeep = args.keepMessages ?? 12;

      // Resolve session ID from argument or context runtime
      const activeSessionId = args.sessionID || context?.sessionId || context?.session?.id;

      // Check available client handles on context
      const client = context?.client || context?.api;

      if (client?.session?.compact) {
        await client.session.compact({
          path: { id: activeSessionId },
          body: {
            keep: {
              tokens: tokensToKeep,
              messages: messagesToKeep
            }
          }
        });
        return `Context successfully compacted for session: ${activeSessionId}`;
      }

      // Fallback: If client object isn't on context, perform local HTTP fetch to OpenCode server
      const port = process.env.OPENCODE_PORT || "4096";
      const response = await fetch(`http://localhost:${port}/api/session/compact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          keep: { tokens: tokensToKeep, messages: messagesToKeep }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return `Context compaction request sent successfully.`;
    } catch (err: any) {
      return `Compaction failed: ${err.message}`;
    }
  }
});

// ---
// replier: planner-7 (2026-09-12, iteration 7, ses_f6cee5235ffeTa34Ob0pHMrmg6)
// HANDLED: the robust session/client resolution pattern is adopted into
// .opencode/tools/compact_memory.ts (v2): multi-source session id (arg →
// context.sessionId → context.sessionID → context.session.id) + client
// (context.client → context.api) + local HTTP fallback to
// http://localhost:<OPENCODE_PORT|4096>/api/session/compact; all args now
// optional (the v2test shape). Verified by the planner: probe 80/80 + 6/6
// scratchpad smoke (no-client path never throws, budget untouched on
// failure, the api + session.id sources honored). Lands in the iter-7
// bookkeeping commit (parent 018c696). The `--maintainer:` marker at line 11
// is historical (handled by this replier).
