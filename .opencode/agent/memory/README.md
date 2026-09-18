# Agent Memory Convention

## Purpose

This directory contains durable, agent-specific memory.

Memory stores knowledge that may improve the same agent's future work across
sessions. It does not replace:
- the repository source code;
- current project state;
- issue trackers or TODO files;
- handoff files;
- universal agent instructions;
- authoritative external documentation.

Each agent owns its own memory namespace. An agent may read its own memory
according to its local README. Reading another agent's memory requires an
explicit task need or an authorized shared-memory mechanism.

## Memory principles

Store only information that is:
- relevant to the agent's defined role;
- likely to be useful again;
- sufficiently reliable to influence future decisions;
- concise enough to retrieve and review;
- traceable to an observation, source, decision, or completed task.

Do not store:
- transient conversation details;
- full transcripts;
- information already maintained authoritatively elsewhere;
- speculative ideas presented as facts;
- secrets, credentials, tokens, or personal sensitive data;
- repository state that can be inspected directly;
- detailed hidden reasoning or chain-of-thought;
- redundant copies of existing memories.

Memory is a curated knowledge base, not a diary.

## Memory lifecycle

Use this lifecycle:

1. OBSERVE: identify a potentially reusable fact, pattern, preference,
   decision, failure, or procedure.
2. QUALIFY: check relevance, reliability, expected future value, and whether
   the information belongs in this agent's namespace.
3. SEARCH: inspect existing memory before writing.
4. DECIDE:
   - ADD when the information is genuinely new;
   - UPDATE when it corrects or usefully extends an existing memory;
   - NO-OP when it is redundant or not durable;
   - FLAG when it conflicts with existing memory or needs human decision.
5. WRITE: add or update one focused memory record.
6. VERIFY: check that the record is accurate, scoped, and properly formatted.
7. RECALL: retrieve memory by meaning, category, keyword, or record ID only
   when relevant to the current task.
8. CURATE: periodically merge duplicates, mark stale entries, and remove
   memories that no longer belong.

Do not append a new entry merely because a new session occurred.

## Memory authority

Each memory entry has an authority level:

- `observed`: directly seen in a tool result, source, test, or interaction;
- `derived`: a reasoned conclusion based on one or more observations;
- `decided`: an explicit project or maintainer decision;
- `learned`: a validated reusable procedure or pattern;
- `preference`: a stable preference explicitly stated by the user or maintainer;
- `hypothesis`: plausible but unverified; never silently treat as fact.

Authority describes the kind of knowledge, not its correctness. Every important
entry also needs a confidence value and, where possible, a source or evidence
locator.

## General record format

Each memory entry must use this format:

### MEM-<stable-id>: <short title>

- Type: `observed | derived | decided | learned | preference | hypothesis`
- Status: `active | review | superseded | deprecated`
- Confidence: `high | medium | low`
- Scope: when and where this memory applies
- Keywords: 3-8 retrieval terms
- Memory: one concise, self-contained statement
- Why it matters: expected future usefulness
- Evidence: source, task, file, test, or interaction reference
- Verified: date or verification event
- Related: IDs of related or conflicting memories
- Review when: condition that should trigger re-checking

Do not include a field merely to fill the template. Use `unknown` when a field
is genuinely unavailable; never invent evidence or dates.

## Dense data and exact values

Treat dates, times, versions, hashes, identifiers, paths, commands, quantities,
and other dense values as high-risk data.

- Copy exact values from tool output or a structured source.
- Do not reconstruct them from memory.
- Preserve the original formatting where it matters.
- Use a source locator or line reference.
- Validate with a deterministic check when possible.
- If uncertain, mark the entry `review` instead of guessing.
- Never change one digit silently while updating a memory.

## Updating and superseding

Prefer updating an existing memory when the identity and scope are the same.

If a new fact contradicts an old one:
1. do not erase the old entry without trace;
2. mark the old entry `superseded` or `review`;
3. create or update the replacement;
4. link both records;
5. record why the replacement is preferred.

The newest entry is not automatically the most reliable entry.

## Retrieval convention

Before using memory:
1. read the relevant agent README;
2. formulate a task-specific retrieval query;
3. search by keywords, title, semantic meaning, and related IDs;
4. load only relevant entries;
5. check status, scope, confidence, and freshness;
6. treat memory as evidence, not unquestionable truth.

When memory conflicts with direct current evidence, current verified evidence
wins unless the memory records an explicit authoritative decision.

## Seeding a new agent memory

When an agent receives an empty memory directory:

1. Read this file.
2. Read the agent-specific README.
3. Do not populate memory with generic facts about the role.
4. Seed only memories learned from actual work, explicit instructions,
   validated sources, or observed recurring patterns.
5. Create at most a small number of high-value initial entries.
6. Add keywords and evidence for every seeded entry.
7. Leave the memory empty if no durable knowledge exists.

An empty memory is valid. Plausible but unverified seed content is harmful.

## Curation budget

At the end of a meaningful task, consider memory curation, but do not perform
it automatically after every message.

A good curation result may be:
- one new entry;
- an update to one existing entry;
- a supersession;
- a conflict flag;
- `NO-OP`.

Prefer a few high-value memories over many low-value ones.

## Safety boundary

Memory does not grant authority.

An entry may inform planning or implementation, but it does not authorize:
- destructive actions;
- external communication;
- security-sensitive operations;
- changes outside the assigned scope;
- overriding current instructions or maintainer decisions.

Always re-check current task instructions and live project state.
