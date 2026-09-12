import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Show the current OpenCode session ID",
  args: {},

  async execute(_args, context) {
    return JSON.stringify({
      sessionID: context.sessionID,
      messageID: context.messageID,
      agent: context.agent,
    }, null, 2)
  },
})
