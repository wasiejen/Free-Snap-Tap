// does not restart in the session. message arrives but session ends after compaction
import { tool } from "@opencode-ai/plugin"

export default async function CompactMemoryPlugin(ctx: any) {
  return {
    event: async ({ event }: any) => {
      if (event.type !== "session.compacted") {
        return
      }

      const sessionID = event.properties?.sessionID
      if (!sessionID) return

      console.log("Compaction completed:", sessionID)

      await new Promise((resolve) => setTimeout(resolve, 250))

      await ctx.client.session.prompt({
        path: { id: sessionID },
        body: {
          parts: [
            {
              type: "text",
              text: "Compaction completed. Continue the previous task.",
            },
          ],
        },
      })
    },

    tool: {
      compact_memory: tool({
        description: "Compact the current session",
        args: {
          providerID: tool.schema.string(),
          modelID: tool.schema.string(),
        },

        async execute(args: any, callContext: any) {
          const sessionID = callContext.sessionID

          setTimeout(() => {
            void ctx.client.session.summarize({
              path: { id: sessionID },
              body: {
                providerID: args.providerID,
                modelID: args.modelID,
              },
            }).catch(console.error)
          }, 0)

          return "Compaction scheduled."
        },
      }),
    },
  }
}
