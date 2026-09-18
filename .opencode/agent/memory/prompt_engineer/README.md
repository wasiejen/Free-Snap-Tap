# Prompt_Engineer Memory

## Role

This memory belongs to the `prompt_engineer` agent.

The agent's primary responsibility is:
- Make this repo's prompt surfaces (role/system prompts, tool & plugin
  descriptions, parameter schemas, response text, subagent one-liners) smaller,
  clearer, and measurably better for agent usage.
- Land evaluated changes only — each edit traces to an observed failure or an
  explicit maintainer request, verified before/after where measurable.

This memory is useful when the agent must:
- decide where a protocol fact belongs (canonical home vs. pointer);
- judge a prompt/description surface for clarity, bloat, or drift;
- re-propose (or not) a previously ruled design (e.g. worker budgets, parallel
  delegation, block compressions);
- frame an optimization for this host's constraints (serial slot, time-only cost).

It is not the place for:
- knowledge owned by `agent/knowledge/` (findings live there — pointer, don't copy);
- repo protocol state (AGENTS.md, role prompts, git log — inspect directly);
- loop runtime state (NAP, loop log, plan summaries);
- transient task context of a single session.

## What this agent should remember

Prioritize memories about:
- maintainer rulings and design decisions + their rationale (what was rejected and why);
- host/setup constraints that shape prompt design (hardware, cost model, config asymmetries);
- surface verdicts: what was judged on a specific prompt/description surface and why;
- failure modes of prompt text (dangling references, stale roster ids, term collisions) and proven mitigations.

Do not prioritize:
- repo facts verifiable by grep/git (authoritative elsewhere);
- unverified speculation about model behavior;
- restatements of AGENTS.md protocol sections.

## Memory categories

Use these categories:

- `rulings`: maintainer decisions from direct sessions — what was approved, rejected, or corrected, with rationale.
- `setup-constraints`: host/hardware/config facts that must inform prompt design (slot, cost model, per-role loading asymmetries).
- `surface-verdicts`: judgments on a specific prompt/description surface + the reasoning, so the surface isn't re-litigated.
- `craft-rules`: validated procedures (new-hire test, canonical-home dedup, restart-to-activate) only when learned beyond the knowledge guides.

## Retrieval keywords

Use these keywords and close variants:

- `looprunner`: the loop-driver role (self-contained prompt, no AGENTS.md)
- `serial|single-slot`: hardware constraint on subagent launches
- `canonical-home|dedup`: where a shared protocol fact should live
- `new-hire`: the clarity test for tool/agent descriptions
- `numerals|bit-drift`: the AGENTS.md dense-numeral block and its verdict
- `stop-line|compaction`: context-budget rulings per role
- `effort|triage`: worker effort-budget rulings

Search by the current task's concept, not only by exact wording.

## Agent-specific write policy

This agent may create a memory when:
- a ruling, constraint, or verdict is durable AND its rationale is not visible in the files it changed;
- a rework session learns a setup asymmetry that would otherwise be re-discovered (or re-broken) next session.

This agent should update memory when:
- the same surface/subject is worked again and the new state corrects or extends an entry;
- a calibrated value replaces a starting value (e.g. triage thresholds from measured loopruns).

This agent must flag for review when:
- a memory conflicts with the current file state or config (current verified evidence wins);
- the maintainer's live config (opencode.jsonc) has changed since the entry was written.

## Agent-specific review policy

Re-check memories when:
- the referenced prompt file or config block changed (grep the surface);
- a new failure contradicts an entry's stated mitigation;
- a harness/measurement exists that was absent when the entry was written.

## Typical memory query

When starting relevant work, search for:

`<role-or-surface> <decision-area>` — e.g. `looprunner self-contained`,
`description new-hire`, `effort triage worker`.

Load only memories relevant to the current goal.
