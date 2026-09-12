// .opencode/tools/dev-tool.ts
import { tool } from "@opencode-ai/plugin"
import { pathToFileURL } from "node:url"
import path from "node:path"
import { stat } from "node:fs/promises"

// const implementation = "C:\\Users\\you\\oc-dev\\implementation.mjs"
const implementation = path.resolve(
  process.env.FST!,
  ".opencode",
  "tools",
  "dev",
  "hot_loaded_tool.ts",
)

export default tool({
  description: "Execute the external development implementation",
  args: {},

  async execute(args, context) {
    // const url =
    //   pathToFileURL(implementation).href +
    //   `?t=${Date.now()}`
    const module = await import(pathToFileURL(implementation).href + `?t=${stat.mtimeMs}`)
    // const module = await import(url)
    return await module.execute(args, context)
  },
})
