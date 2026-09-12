maintainer question:
the probe for the keys actually returned:
"contextKeys: sessionID, abort, messageID, callID, extra, agent, messages, metadata, ask, directory, worktree
clientKeys: [] — context.client does not exist
sessionKeys: [] — (because client is undefined)"

answer:
That result is conclusive: you are running a **custom tool**, not a plugin context with an SDK client.

Your tool context provides:

```ts
context.sessionID
context.messageID
context.agent
context.directory
context.worktree
```

but it provides **no `context.client`**, so neither of these can work:

```ts
context.client.app.log(...)
context.client.session.compact(...)
```

The documented custom-tool context is intentionally limited; the SDK client is not injected there. [opencode](https://opencode.ai/docs/ru/custom-tools/)

For now, use the session ID directly:

```ts
export default tool({
  description: "Show current session ID",
  args: {},

  async execute(_args, context) {
    return `Current session ID: ${context.sessionID}`
  },
})
```

To compact the session from that tool, you must either:

1. Start/use an OpenCode server and create an SDK client yourself, or
2. Move the functionality into a proper plugin, where the plugin context provides the client/RPC access.

A custom tool can still call the HTTP API if you explicitly start OpenCode’s server and connect to it, but the CLI-only process does not expose that client automatically.

So your current findings mean: **session ID retrieval works; SDK access does not exist in this tool context.**



maintainer question : 
sooo. is it possible to start a plugin via a custom tool? :-)

answer:
Not directly. A custom tool cannot “start” or obtain the context of a plugin; plugins are loaded and initialized by OpenCode when the process starts. Plugins can, however, **register custom tools themselves**, so the usual solution is to move your tool into a plugin. [open-code](https://open-code.ai/de/docs/plugins)

```ts
// .opencode/plugins/my-plugin.ts
import { tool } from "@opencode-ai/plugin"

export default async function MyPlugin(ctx: any) {
  return {
    tool: {
      compact_session: tool({
        description: "Compact the current session",
        args: {},
        async execute(_args, context) {
          // Plugin-level ctx may expose RPC/client operations.
          return `Session: ${context.sessionID}`
        },
      }),
    },
  }
}
```

Then let the agent call `compact_session` directly.

A workaround is for the custom tool to spawn a separate Node process, but that process would not become an OpenCode plugin context—it would only be an external program. It would need to connect to a running OpenCode server independently.

So the clean architecture is:

```text
plugin
 ├─ registers custom tool
 ├─ receives plugin context / SDK access
 └─ tool execution receives sessionID
```

Do not use a separate `.opencode/tools/...` tool if it requires `context.client`; register that tool from `.opencode/plugins/...` instead.

---
replier: planner (ses_f6b7c5242ffeZpNl0Ar8mILWua, 2026-09-12)
ABSORBED: (a) the key-dump result you quote matches our probe run —
custom-tool context confirmed clientless by design; (b) the
"client-needing tools register FROM a plugin" architecture recorded in
.opencode/agent/knowledge/ (knowledge_tools.md client entry + two
knowledge_plugins.md entries: plugin-registered tools + compaction-hook
prompt shaping); (c) TODO #52 now carries both solution paths (1)
plugin-registered compact tool and (2) your WIP
custom_compaction.ts hook plugin (shape verified against installed
plugin types, 2026-09-12). Marker line in custom_compaction.ts removed
per protocol; that file left untracked (your WIP). Moved to done/.
