// not testd yet - very likely does not work
// would be nice to have for prototyping
// import a lot of libs and then freely change the loaded tool to let the agents probe the api


import { Plugin } from "@opencode/plugin"
import { pathToFileURL } from "node:url"
import path from "node:path"
import { stat } from "node:fs/promises"

//const implementation = String.raw`C:\Users\Jens\oc-dev\implementation.mjs`
const implementation = path.resolve(
  process.env.FST!,
  ".opencode",
  "plugin",
  "dev",
  "dev_plugin_hot_loaded.ts",
)

export default Plugin.define({
  id: "fst.dev_plugin_hot_loaded",

  async setup(ctx) {
    let loaded: {
      execute: (args: unknown, context: unknown) => Promise<unknown>
    } | undefined

    let loadedMtime = 0

    async function dev_plugin_hot_loaded() {
      const mtime = (await stat(implementation)).mtimeMs

      if (!loaded || mtime !== loadedMtime) {
        const url = `${pathToFileURL(implementation).href}?mtime=${mtime}`
        loaded = await import(url)
        loadedMtime = mtime
      }

      return loaded
    }

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "hot_tool",
        description: "Execute the externally reloadable implementation",
        input: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },

        // async execute(input, toolContext) {
        //   const sessionID = (toolContext as any).sessionID

        //   if (!sessionID) {
        //     return { content: "No session ID in tool context" }
        //   }

        //   const session = await ctx.session.get({ sessionID })

        //   return {
        //     content: JSON.stringify(session),
        //   }
        // }
        async execute(input, toolContext) {
          const implementation = await getImplementation()

          return await implementation.execute(input, {
            ...toolContext,
            // The V2 tool context may provide session information here.
            // Inspect toolContext if necessary.
          })
        },
      })
    })
  },
})
