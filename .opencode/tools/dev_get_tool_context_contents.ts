//client is only available in context of a plugin - not in tool context

// async execute(_args, context) {
//   return JSON.stringify({
//     contextKeys: Object.keys(context ?? {}),
//     clientKeys: Object.keys(context?.client ?? {}),
//     sessionKeys: Object.keys(context?.client?.session ?? {}),
//   }, null, 2)
// },


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
  async execute(args: any, context: any) {

    return JSON.stringify({
      sessionID:  context.sessionID,
      abort:  context.abort,
      messageID:  context.messageID,
      callID:  context.callID,
      extra:  context.extra,
      agent:  context.agent,
      //messages:  context.messages, // to much info - one example at the end
      metadata:  context.metadata,
      ask:  context.ask,
      directory:  context.directory,
      worktree:  context.worktree,
    }, null, 2)
  }
})
