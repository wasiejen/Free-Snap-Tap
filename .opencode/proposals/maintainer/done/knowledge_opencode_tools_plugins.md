Yes—your conclusion is essentially correct: **use the SDK/client supplied by OpenCode’s plugin context**, not a separately created HTTP client. The important detail is that a custom tool receives the current session ID as `context.sessionID`—capital `ID`—not usually as `context.sessionId`, `context.sessionID` only in some builds, or `context.session.id`.

The current documentation describes custom-tool context and the plugin context differently, so it is important to distinguish them:

- **Custom tool:** receives a `Tool.Context`, including the current `sessionID`.
- **Plugin:** receives a context that exposes session operations directly.
- **External SDK client:** useful when connecting to an already-running OpenCode server, but not normally necessary from inside a loaded tool or plugin.

The current OpenCode documentation lists the custom-tool locations and confirms that custom tools receive session-related execution context.  The SDK documentation exposes session operations through the type-safe client. [opencode](https://opencode.ai/docs/custom-tools/)

## 1. Use `context.sessionID`

For a custom tool, start with this:

```ts
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Trigger session compaction",
  args: {
    keepTokens: tool.schema.number().optional(),
    keepMessages: tool.schema.number().optional(),
  },

  async execute(args, context) {
    const sessionID = context.sessionID

    if (!sessionID) {
      return "No current OpenCode session ID was provided."
    }

    return `Current session: ${sessionID}`
  },
})
```

Your current fallback resolver should therefore put `context.sessionID` first:

```ts
const sessionID =
  args?.sessionID ??
  context?.sessionID ??
  context?.sessionId ??
  context?.session?.id
```

However, the likely correct value in the current custom-tool API is simply:

```ts
context.sessionID
```

Do not expect the session ID to be available as:

```ts
context.session.id
```

unless you have explicitly observed that shape in your particular OpenCode build.

A session ID typically looks similar to:

```text
ses_abc123...
```

You should not invent one or derive it from the terminal process. It is assigned by OpenCode and supplied to the tool invocation.

## 2. The SDK call shape depends on the API version

Your call:

```ts
await client.session.compact({
  path: { id: sessionID },
  body: {
    keep: {
      tokens: tokensToKeep,
      messages: messagesToKeep,
    },
  },
})
```

appears to be from an older or different generated SDK API.

The SDK documentation currently lists the session API as:

```ts
session.summarize({ path, body })
```

rather than `session.compact(...)`. [opencode](https://opencode.ai/docs/sdk/)

The newer V2 documentation describes session methods with a flatter input shape:

```ts
await ctx.session.get({ sessionID })
await ctx.session.context({ sessionID })
```

and lists session operations such as `create`, `get`, `prompt`, `interrupt`, and `wait`. [opencode](https://opencode.ai/v2/docs/build/plugins)

That means you should inspect the SDK version actually installed in your project rather than rely on examples from another OpenCode generation. For example:

```powershell
npm ls @opencode-ai/sdk @opencode-ai/plugin
```

Then inspect the generated types:

```powershell
Get-ChildItem node_modules\@opencode-ai -Recurse -Filter "*.d.ts" |
  Select-String -Pattern "compact|summarize|sessionID"
```

The exact method name and argument shape are version-dependent.

## 3. Recommended custom-tool implementation

First, make the current session ID work independently of compaction:

```ts
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
```

Install this as a custom tool, for example:

```text
.opencode/tools/session-info.ts
```

or globally on Windows:

```text
%USERPROFILE%\.config\opencode\tools\session-info.ts
```

The custom-tool documentation lists both project-local and global tool directories. [opencode](https://opencode.ai/docs/custom-tools/)

Once that works, add the client call. For an older SDK shape, it may look like this:

```ts
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Trigger session compaction",
  args: {
    keepTokens: tool.schema.number().optional(),
  },

  async execute(args, context) {
    const sessionID = context.sessionID

    if (!sessionID) {
      throw new Error("OpenCode did not provide context.sessionID")
    }

    const client = context.client

    if (!client) {
      throw new Error("This OpenCode host does not expose context.client")
    }

    await client.session.summarize({
      path: { id: sessionID },
      body: {
        keep: {
          tokens: args.keepTokens ?? 15000,
        },
      },
    })

    return `Compaction requested for ${sessionID}`
  },
})
```

But do not assume that `session.summarize` is definitely correct for your installed version. Verify the type definition or use TypeScript autocomplete.

Your version may instead expose one of these forms:

```ts
await context.client.session.compact({
  path: { id: context.sessionID },
  body: {
    keep: {
      tokens: 15000,
    },
  },
})
```

or:

```ts
await context.client.session.summarize({
  sessionID: context.sessionID,
  keep: {
    tokens: 15000,
  },
})
```

The generated SDK types are authoritative for your installation.

## 4. Plugin context is cleaner

If your functionality does not need to be an LLM-callable tool, implementing it as a plugin is usually cleaner. The plugin context is itself an OpenCode client/context object, and the V2 plugin documentation shows session access directly through `ctx.session`. [opencode](https://opencode.ai/v2/docs/build/plugins)

A plugin can inspect the session like this:

```ts
export default async function MyPlugin(ctx: any) {
  const sessionID = "ses_..."

  const session = await ctx.session.get({ sessionID })
  const messages = await ctx.session.context({ sessionID })

  console.log(session)
  console.log(messages)
}
```

For a compaction-related plugin, the preferred design is often **not** to manually trigger compaction. Instead, use the compaction hook to inject durable context:

```ts
export default async function CompactionPlugin(ctx: any) {
  return {
    "experimental.session.compacting": async (
      input: { sessionID: string },
      output: { context: string[]; prompt?: string },
    ) => {
      output.context.push(`
Important persistent state:
- Current task status: ...
- Files being modified: ...
- Pending decisions: ...
      `)
    },
  }
}
```

OpenCode documents this hook specifically for adding information that should survive compaction. [opencode](https://opencode.ai/docs/plugins.md)

This is preferable when your goal is to preserve project-specific state. Calling compaction from a tool is more appropriate when you explicitly want the agent to create a checkpoint at a particular point.

## 5. Why your HTTP fallback fails

Running OpenCode through the CLI does not necessarily mean that a server is listening on port 4096.

The SDK’s “create client” mode starts a server and a client together, while the “client only” mode connects to an already-running server.  If your CLI process was not started with a server/listen option, a request to: [opencode](https://opencode.ai/docs/sdk/)

```text
http://localhost:4096
```

will fail because nothing is listening there.

The documented manual endpoint is:

```text
POST /api/session/{sessionID}/compact
```

For example:

```powershell
$body = '{"keep":{"tokens":15000}}'

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:4096/api/session/$sessionID/compact" `
  -ContentType "application/json" `
  -Body $body
```

The current compaction documentation says that this request is asynchronous: the response confirms that the request was admitted, but does not wait for the summary to finish. [opencode](https://opencode.ai/v2/docs/compaction)

To determine whether a server is listening on Windows:

```powershell
Get-NetTCPConnection -LocalPort 4096 -State Listen
```

or:

```powershell
Test-NetConnection 127.0.0.1 -Port 4096
```

If there is no listener, the HTTP approach cannot work until you start OpenCode in server mode or otherwise expose its server.

## 6. Important issue in your current design

This part is potentially problematic:

```ts
const client = context?.client || context?.api
```

If `context.client` is available, it may be the correct SDK client. But `context.api` is not necessarily interchangeable with the SDK client. It may be an internal or legacy object with a different method layout.

I would avoid silently treating both as equivalent:

```ts
const client = context?.client

if (!client?.session) {
  return "The current OpenCode tool host does not expose context.client.session."
}
```

Then inspect the actual available methods during development:

```ts
return JSON.stringify({
  contextKeys: Object.keys(context ?? {}),
  clientKeys: Object.keys(context?.client ?? {}),
  sessionKeys: Object.keys(context?.client?.session ?? {}),
}, null, 2)
```

Do not leave this diagnostic tool enabled in production if it may expose sensitive runtime information.

## Recommended approach

For your use case, I would proceed in this order:

1. Create a diagnostic tool that returns `context.sessionID`.
2. Confirm that the tool runs inside the same OpenCode session you want to compact.
3. Inspect the installed SDK types to determine whether the operation is named `compact`, `summarize`, or something else.
4. Call the SDK through `context.client`, using the current `context.sessionID`.
5. If the objective is merely to preserve state across compaction, use `experimental.session.compacting` instead of manually initiating compaction.
6. Use the HTTP API only when OpenCode is explicitly running a server and you know its listening address.

The core correction to your code is probably:

```ts
const sessionID = args?.sessionID ?? context?.sessionID
```

followed by the method exposed by the SDK version actually installed—not necessarily `client.session.compact()`.

---
replier: planner (ses_f6b7c5242ffeZpNl0Ar8mILWua, 2026-09-12)
Handled: folded into TODO #52 — installed-SDK evidence added (v1 = summarize only, url /session/{id}/summarize; v2 = summarize + compact, url /api/session/{sessionID}/compact, flat parameters); the tool's current call mixes generations and its HTTP-fallback URL matches neither typed endpoint; context.client confirmed undefined in this host build (probe); context.sessionID-first resolution + drop silent context.api equivalence taken into the #52 scope; the installed xperimental.session.compacting hook noted as candidate alternative design. The context.sessionID/context.agent field evidence was already folded into the loop_log-v2 proposal (Part A + open question).
Moved to done/ per inbox protocol.
