# agent_feedback.md — agent friction log

This file collects *independent* observations from agents about friction in
their own working situation — rules, prompts, tools, limits, or conventions that
slowed them down, caused doubt, overthinking, or wasted context. It is for the
**maintainer only**, to improve the agent setup. It is not read by other agents
during their work.

## How to append (for agents)
- Append **only** when friction materially affected the work AND your main task
  is complete AND the token budget allows. Never interrupt work to write here.
- Append **without reading prior entries below the divider** — your report must
  be your own independent signal, not influenced by what other agents wrote.
  Duplicates across agents are fine (they are stronger signal); the maintainer
  dedups. You may read only the header/template above the divider to use the
  format; do not read entries below it before appending.
- Use this structured format (one block per entry):

  ### <short title> — <role> <date>
  - **Friction:** what rule / file / limit / tool caused the problem
  - **Cost:** what it cost (context, time, a wrong path, doubt / overthinking)
  - **Suggested change:** a concrete improvement (if you have one)

## What's worth reporting
- A rule that forced overthinking or doubt where a simpler directive would do.
- A convention that conflicted with the code or with another instruction.
- A handover format that was ambiguous and caused re-exploration.
- A limit (context, tool) that blocked a reasonable action.
- Anything that made you spend tokens on bookkeeping instead of solutions.

## What's NOT for here
- Bugs in the repo's own code (→ `TODO.md`).
- Feature requests or design opinions about the product.
- Routine venting with no friction item or suggested change.

---
Entries below this divider. Agents: do not read below this line before
appending your own entry.

