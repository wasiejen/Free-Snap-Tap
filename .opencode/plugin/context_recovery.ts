// Define the reusable injection directive string
const COMPACTION_RELOAD_DIRECTIVE = `
[SYSTEM CONTEXT DIRECTIVE]
Context was compacted. Read .opencode\system_prompts\agent_readme_post_compaction.md and re-read any required task-specific files using read_file before continuing.
`.trim();

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
          path: { id: context.sessionId },
          body: {
              keep: {
                tokens: 30000, // Retain only the last 10,000 tokens during emergency compaction
                messages: 12
              }
            }
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
