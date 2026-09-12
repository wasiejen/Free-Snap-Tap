import type { Plugin } from "@opencode-ai/plugin"

export const CustomCompactionPlugin: Plugin = async (ctx) => {
  return {
    "experimental.session.compacting": async (input, output) => {
      // Replace the entire compaction prompt
      output.prompt = `
You are generating a continuation prompt for a multi-agent swarm session.

Summarize:
1. The current task and its status
2. Which files are being modified and by whom
3. Any blockers or dependencies between agents
4. The next steps to complete the work

Format as a structured prompt that a new agent can use to resume work.
`
    },
  }
}
