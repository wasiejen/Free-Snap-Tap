// example of a plugin that offers a tool
// returns:
// {
//   "pluginCtxKeys": ["client", "project", "worktree", "directory", "experimental_workspace", "serverUrl", "$"],
//   "clientKeys": ["_client", "global", "project", "pty", "config", "tool", "instance", "path", "vcs", "session", "command", "provider", "find", "file", "app", "mcp", "lsp", "formatter", "tui", "auth", "event"],
//   "sessionKeys": ["_client"],
//   "compactType": "undefined",
//   "summarizeType": "function",
//   "toolCtxKeys": ["sessionID", "abort", "messageID", "callID", "extra", "agent", "messages", "metadata", "ask", "directory", "worktree"]
// }
// Notable: client.session exists with only _client key; summarize is a function, compact is undefined.

import { tool } from "@opencode-ai/plugin"

export default async function MyPlugin(ctx: any) {
  return {
    tool: {
      dev_probe_ctx: tool({
        description: "dump plugin ctx + tool context keys (scratch)",
        args: {},
        async execute(_a, c) {
          return JSON.stringify({
            pluginCtxKeys: Object.keys(ctx ?? {}),
            clientKeys: Object.keys(ctx?.client ?? {}),
            sessionKeys: Object.keys(ctx?.client?.session ?? {}),
            compactType: typeof ctx?.client?.session?.compact,
            summarizeType: typeof ctx?.client?.session?.summarize,
            toolCtxKeys: Object.keys(c ?? {}),
          }, null, 2)
        },
      }),
    },
  }
}
