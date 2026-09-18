# Planner memory

## Role

This memory belongs to the `planner` agent (plan / delegate / verify / own
goal + plan state — NAP).

The planner's primary responsibilities here are:
- turning goal + TODO + NAP into delegated units with a measurable
  definition of done, then verifying the result against the measured gate;
- closing units — including the maintainer-domain handoff pieces (registration,
  pastes, live acceptance) that the planner cannot perform itself.

This memory is useful when the agent must:
- plan or verify acceptance tests for observer-mediated mechanisms
  (mutation/escape features whose evidence lives in intercept.log);
- write the close-out pending list for maintainer-domain handoffs, and the
  verification steps for the session that reopens them;
- decide where a durable fact belongs (prompt / knowledge / NAP / memory) so
  the single-source layout does not drift again.

It is not the place for:
- repository state — TODO.md / priority.md / NAP hold the current facts;
  memory holds durable verified ones, and references, never re-states them;
- restatements of prompt/AGENTS.md protocol text (authoritative home = there;
  this holds the rulings and placements about it);
- other agents' namespaces (each role owns its own; read another's only with
  an explicit task need);
- unit-level progress or commit details (git log + the loop-folder summaries
  are the audit trail).

## What this agent should remember

Prioritize memories about:
- validation/acceptance-test design rulings learned from measured incidents;
- the maintainer-domain handoff pattern and the planner-side re-verification
  step (who does what, in which phase, closed by what evidence);
- durable placement rulings for durable facts (anti-drift / anti-restatement);
- cross-session model-behavior facts that change HOW to verify a report
  (e.g. which channels of an agent's own output are unreliable evidence);
- maintainer rulings on process (the ones that supersede an older convention
  or that close off a recurring proposal class).

Do not prioritize:
- single-unit progress, baselines, or queue positions (NAP/TODO own those);
- facts the prompt or AGENTS.md already carries authoritatively;
- unverified speculation about model behavior that belongs in a probe or a
  log-mining task instead.

## Memory categories

- `procedure`: validated workflows for recurring planner actions (acceptance
  design, close-out, placement decisions);
- `incident-derived`: facts from measured incidents that still change a
  future decision (the incident is archived; the fact outlives it);
- `placement`: rulings on where a durable fact lives — the guard against
  restatement/drift in this repo.

## Retrieval keywords

Use these and close variants (search the current task's concept, not only
exact wording):

- `acceptance`: live-acceptance, intercept.log, observer, post-mutation,
  false-repeat;
- `handoff`: pending, maintainer-domain, registration, paste, restart,
  close-out;
- `drift`: bit-drift, dense-numerals, annotation-agreement,
  worker-report;
- `placement`: canonical-home, single-source, restatement, knowledge.

## Agent-specific write policy

Create a memory when:
- a unit closed with a durable, verified lesson that the prompts / knowledge
  base / NAP do not already carry authoritatively (check all three BEFORE
  writing — a duplicate in memory is a restatement drift by definition);
- the maintainer ruled on process in a way that supersedes an older
  convention (then record WHICH file carried the older convention).

Update memory when:
- a placement moves (prompt section renamed/merged — re-point the entry), or
- a new incident refines an existing entry's scope or evidence — same entry,
  evidence line grows (do NOT mint a parallel entry for the same fact).

Must flag for review when:
- an entry conflicts with current prompt/AGENTS.md text — current evidence
  wins, the entry gets `status: review`, never the reverse silently;
- the entry references files/homes that no longer resolve.

## Agent-specific review policy

Re-check memories when:
- a live acceptance or a gate run contradicts an entry's claimed behavior;
- a home file (prompt / knowledge / NAP section) the entry points at moves or
  disappears;
- the same failure repeats — the entry failed at recall; either move it to a
  higher-recall home or sharpen its keywords, one of the two;
- the entry's own `Review when` condition has become plausible — re-verify
  against logs/DB, never against memory of the value (same post-compaction
  discipline as for the NAP).

## Typical memory query

When starting a unit with an acceptance phase:
`acceptance intercept.log observer post-mutation false-repeat`

When closing a unit with maintainer-domain pending:
`handoff pending maintainer-domain registration paste restart close-out`

When deciding where a new durable fact goes:
`placement canonical-home single-source restatement`

Load only memories relevant to the current goal; verify dense values against
the evidence locator before acting on them.
