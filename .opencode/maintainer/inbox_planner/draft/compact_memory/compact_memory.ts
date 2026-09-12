import { tool } from "@opencode/sdk";

// Define the reusable injection directive string
const SECTION_PLACEHOLDER = "SECTION_TASK_RELOAD"; // Replace with your system prompt section marker
const COMPACTION_RELOAD_DIRECTIVE = `
[SYSTEM CONTEXT DIRECTIVE]
Context was compacted. Refer to System Prompt section ${SECTION_PLACEHOLDER} and re-read any required task-specific files using read_file before continuing.
`.trim();

/**
 * 1. CUSTOM TOOL: Agent Self-Compaction Tool
 */
export const compactMemoryTool = tool({
  name: "compact_memory",
  description: "Triggers immediate session compaction to free context space after ingesting heavy data.",
  parameters: {},
  execute: async (_args, context) => {
    try {
      await context.client.session.compact({
        path: { id: context.sessionId }
      });

      // Returning this string ensures the post-compaction response contains the directive
      return `Context successfully compacted.\n\n${COMPACTION_RELOAD_DIRECTIVE}`;
    } catch (err: any) {
      return `Compaction request failed: ${err.message}`;
    }
  }
});

/**
 * 2. PLUGIN HOOK: Emergency Context Recovery
 */
export const EmergencyCompactionPlugin = {
  name: "emergency-compaction-plugin",

  "session.error": async (error: any, context: any) => {
    const errorMsg = String(error?.message || error);

    // Detect context window overflow errors
    if (
      errorMsg.includes("exceeds the available context size") ||
      errorMsg.includes("context length exceeded") ||
      errorMsg.includes("prompt is too long")
    ) {
      try {
        // Trigger forced compaction
        await context.client.session.compact({
          path: { id: context.sessionId }
        });

        // Inject the directive message directly into the session history after recovery
        await context.client.session.promptAsync({
          path: { id: context.sessionId },
          body: {
            parts: [
              {
                type: "text",
                text: COMPACTION_RELOAD_DIRECTIVE,
                synthetic: true
              }
            ]
          }
        });

        return { handled: true, action: "retry" };
      } catch (compactErr) {
        console.error("Emergency compaction failed:", compactErr);
      }
    }
  }
};
