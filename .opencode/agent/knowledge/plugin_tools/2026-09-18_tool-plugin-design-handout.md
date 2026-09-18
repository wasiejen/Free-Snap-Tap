# Handout: designing tools & plugins for agent usage

Audience: planner and worker agents implementing tools, plugin tools, and plugin
description surfaces. Deep rationale lives in the sibling guide
`2026-09-18_prompt-and-tool-optimization-guide.md`; this file is the working checklist.

## First principles
1. Descriptions and responses are **prompt surfaces**: every token you declare or return
   spends the same finite attention budget as the system prompt. Optimize for signal, not completeness.
2. The description is the **only contract text the agent reads before calling**. Invest in
   it like a human-facing API — and more, because there is no human to ask.

## Description (the tool/plugin one-liner + body)
Must contain, in this order:
1. What it does — one imperative sentence.
2. **When to use it** — the trigger condition.
3. **When NOT to use it** — explicit boundary vs. every similar sibling tool.
4. At least **one concrete example call** (copy-pasteable).
5. Edge cases and error behavior (empty result, bad input, truncation).

Rules:
- Write it for a new hire. Make implicit context explicit: query formats, niche terminology,
  relationships between resources.
- If a human can't definitively say which of two tools to use, an agent can't either —
  fix the boundary wording or consolidate the tools.
- Observed misbehavior → suspect the description before the model. Small description
  refinements have produced large measured gains; description rewrites validated on tests
  cut task time 40% (Anthropic-internal figure — directionally real, re-measure locally).
- One-liner surfaces (plugin descriptions, subagent descriptions) decide whether the full
  content gets spent at all: put the **trigger condition** in the one-liner, not just a noun phrase.

## Parameters
- **Unambiguous names**: `user_id`, not `user`; `mode`, not `flag`; `sessionID`, not `id` when
  several ids exist.
- Every parameter description = a docstring for a junior developer: purpose, allowed values,
  units, defaults, and what happens when omitted.
- **Poka-yoke at the schema level before prose level**: enum over free text, required over
  optional, absolute paths over relative, bounded ranges over "small number". Eliminate the
  mistake class structurally; use description warnings only as fallback.
- Few parameters. If callers routinely chain several tools to assemble one input, build the
  consolidated tool instead.

## Return messages
- **High signal only.** Fields that inform the next action (`name`, `path`, `status`) over
  raw identifiers (`uuid`, `mime_type`, `image_url_256px`).
- **Natural names beat cryptic IDs** — resolving UUIDs to semantic names measurably reduces
  hallucinations in retrieval.
- **Verbosity control**: expose a `response_format` (`concise` | `detailed`) enum when
  downstream calls need the ids; concise can be ~⅓ of the tokens.
- **Cap large outputs**: pagination, range selection, filtering, truncation with sensible
  defaults (Anthropic default: 25,000 tokens per response). Never return "all".
- **Truncation steers**: the truncated response must say how to get the rest efficiently
  ("use a narrower filter / smaller range"), not just stop mid-output.
- **Errors teach**: state what was invalid and show a correctly formatted example. Never
  opaque codes or raw tracebacks.
- Response structure (JSON / Markdown / XML) affects accuracy; the optimum varies by model
  and task — pick the format closest to what the model has seen naturally, and verify by test
  rather than by taste.

## Toolset design
- Few, thoughtful tools targeting real workflows beat one thin wrapper per API endpoint.
- Every tool has **one clear, distinct purpose**; overlapping tools distract and get
  mis-selected.
- Group related tools under a common prefix (`repo_search`, `repo_edit`); prefix- vs
  suffix-style measurably varies by model — decide by your own evaluation.
- Consolidate frequently-chained operations into one call (e.g. `get_customer_context` over
  three getters) — this moves work from the agent's context into the tool.

## Anti-patterns (reject in review)
- Returning full lists / "all" when a search or filter would do.
- Cryptic identifiers as the primary payload.
- Error messages that are codes or tracebacks.
- Descriptions without an example or without a not-to-use clause.
- A parameter the model can almost always fill wrong.
- A new tool duplicating a sibling's purpose with different wording.

## Verify before done
1. Run the tool through ≥ a handful of realistic **multi-step** tasks (not single-lookup
   toys), on held-out cases you did not tune against.
2. Measure: task success, number of tool calls, tokens consumed, error count.
3. **Read the raw transcripts**, not just the agent's self-report — what the agent omits or
   fails to explain is where the description is broken.
4. Pattern map: redundant calls → rightsize limits/pagination; wrong/invalid parameters →
   description or example gap; wrong tool chosen → boundary/naming problem.
5. Let an agent draft description fixes from the failure transcripts; accept only changes
   validated on held-out tasks (guards against overfitting to the eval).
