//client is only available in context of a plugin - not in tool context

// - sessionID
// - abort
// - messageID
// - callID
// - extra
// - agent
// - messages
// - metadata
// - ask
// - directory
// - worktree

import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "all available keys of the object context returned for debugging and tool/plugin dev",
  args: {},

  async execute(_args, context) {
    return JSON.stringify({
      contextKeys: Object.keys(context ?? {}),
      clientKeys: Object.keys(context?.client ?? {}),
      sessionKeys: Object.keys(context?.client?.session ?? {}),
    }, null, 2)
  },
})
