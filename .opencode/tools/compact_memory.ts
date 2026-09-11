// Define the reusable injection directive string
const COMPACTION_RELOAD_DIRECTIVE = `
[SYSTEM CONTEXT DIRECTIVE]
Context was compacted. Read .opencode\system_prompts\agent_readme_post_compaction.md and re-read any required task-specific files using read_file before continuing.
`.trim();

/**
 * 1. CUSTOM TOOL: Agent Self-Compaction Tool
 */

export default {
  tools: {
    compact_memory: {
      description: "Triggers immediate session compaction to free context space.",
      parameters: {
        type: "object",
        properties: {
          keepTokens: {
            type: "number",
            description: "Number of recent tokens to retain (e.g. 10000 or 30000)"
          },
          keepMessages: {
            type: "number",
            description: "Number of recent messages to retain (e.g. 6 or 12)"
          },
          sessionID: {
            type: "string",
            description: "String of the Session ID to be compacted (e.g. ses_f6ebb2c22ffeyEOWXquADsZ091)"
          }
        }
      },
      execute: async (args: any, context: any) => {
        try {
          // Extract with fallback defaults if the agent omits an argument
          const tokensToKeep = args.keepTokens ?? 30000;
          const messagesToKeep = args.keepMessages ?? 12;
          const sessionID = args.sessionID ?? context.sessionId;

          await context.client.session.compact({
            path: { id: sessionID },
            body: {
              keep: {
                tokens: tokensToKeep,
                messages: messagesToKeep
              }
            }
          });

          // Returning this string ensures the post-compaction response contains the directive
          return `Context successfully compacted.\n\n${COMPACTION_RELOAD_DIRECTIVE}`;
        } catch (err: any) {
          return `Compaction request failed: ${err.message}`;
        }
      }
    }
  }
};
