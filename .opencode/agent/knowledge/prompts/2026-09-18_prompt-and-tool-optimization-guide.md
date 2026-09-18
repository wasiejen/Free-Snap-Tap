# Research brief: optimizing system prompts, read-in prompts, and tool descriptions for agents

## Decision framing

- **Research question:** How should the system prompts of our agents be optimized, how should
  prompts that are added via `read` (deferred/JIT context) be structured, and how should tool,
  plugin, and other description surfaces be optimized for better model usage — such that the
  result serves as the knowledge basis for a prompt-engineer skill?
- **Intended receiving agent(s):** the future `prompt-engineer` skill/role (optimizes prompts,
  tool descriptions, plugin descriptions); secondarily the planner (who delegates prompt work).
- **Scope and exclusions:** In scope: system prompts, deferred read-in prompt files, tool
  descriptions and parameter specs, tool responses, plugin/auxiliary description surfaces,
  multi-agent delegation prompts, and the evaluation loop that makes all of this measurable.
  Out of scope: model training/fine-tuning, framework selection, and an audit of this repo's
  current prompts (that is a task for the skill, not this brief).
- **Evidence cutoff / source set:** Four Anthropic engineering posts, retrieved 2026-09-18:
  - **S1** "Effective context engineering for AI agents", published Sep 29, 2025
  - **S2** "Building effective agents", published Dec 19, 2024
  - **S3** "How we built our multi-agent research system", published Jun 13, 2025
  - **S4** "Writing effective tools for agents — with agents", published Sep 11, 2025

  All Anthropic-internal evidence (Claude models, Claude Code, internal evals). Treat transfer
  to other model families — especially local quantized models — as an open question (§
  Conflicts and uncertainties).

---

## Part 0 — The mental model every optimization decision flows from

Everything in this guide is an application of three facts:

1. **Context is a finite resource with diminishing returns.** Models exhibit "context rot":
   as token count in the window grows, accurate recall degrades. Architecturally this follows
   from attention: n tokens create n² pairwise relationships, and training data skews toward
   shorter sequences, so long-range precision degrades as a gradient, not a cliff (S1, §Why
   context engineering matters). Practical consequence: every token added to a system prompt,
   a read-in file, or a tool description is spent from the same "attention budget" that pays
   for the task itself (S1).
2. **The north-star principle:** find the *smallest possible set of high-signal tokens* that
   maximizes the likelihood of the desired outcome (S1, §The anatomy of effective context).
   "Smallest" is not "shortest" — minimal means minimal *information set*, not minimal
   character count; the agent still needs enough upfront to adhere to desired behavior (S1).
3. **Tools and prompts are contracts with a non-deterministic party.** A tool is "a contract
   between deterministic systems and non-deterministic agents" (S4, §What is a tool). The
   description is the only part of the contract the agent reads before acting. Invest in
   agent-computer interfaces (ACI) exactly as software teams invest in human-computer
   interfaces (HCI) (S2, Appendix 2). A useful meta-observation: tools that are ergonomic for
   agents "also end up being surprisingly intuitive to grasp as humans" (S4) — human
   readability is a proxy, not a substitute, for model ergonomics.

**Corollary for description surfaces generally:** system prompts, role prompts, read-in files,
tool descriptions, parameter descriptions, plugin instructions, and error messages are all the
same object class — tokens that steer a non-deterministic reader. One optimization procedure
applies to all of them (Parts 1–5).

---

## Part 1 — System prompt optimization

### 1.1 The right altitude
System prompts should use "simple, direct language that presents ideas at the right altitude"
(F1). Two failure poles, both observed (S1, §The anatomy of effective context):

- **Too low:** hardcoded complex, brittle if-else logic in the prompt to elicit exact behavior.
  Fragile, and maintenance complexity compounds.
- **Too high:** vague high-level guidance that gives no concrete signal for desired outputs,
  or falsely assumes shared context the model does not have.

Optimal: "specific enough to guide behavior effectively, yet flexible enough to provide the
model with strong heuristics to guide behavior" (F2). Encode heuristics and guardrails, not
rigid procedural rules — Anthropic's stated prompting strategy for research agents is
"instilling good heuristics rather than rigid rules" (S3, §Prompt engineering and
evaluations). Note that explicit numeric scaling rules can still be embedded where the model
demonstrably cannot judge effort (S3 principle 3) — the distinction is *heuristics with
explicit guardrails* vs. *step-by-step procedure*.

### 1.2 Structure and sectioning
- Organize into distinct sections with clear delimiters — XML tags (`<instructions>`,
  `<output_description>`) or Markdown headers (`## Tool guidance`, …) (F3). S1 notes exact
  formatting matters less as models improve, so do not over-invest in formatting ceremony;
  invest in section boundaries and content discipline.
- The repo's own shared protocol is a live instance of the pattern: one shared file defines
  the protocol once, and role prompts must "reference these sections by name, never restate
  them — restating here creates drift" (repo AGENTS.md, §Editing this file). This is the
  single-source-of-truth rule: every restated paragraph is a drift vector and a token cost.

### 1.3 Minimal-complete, grown from observed failures
The recommended authoring loop (S1, §The anatomy of effective context):

1. Start from a **minimal prompt** and test it with the best available model on the real task.
2. Observe failure modes.
3. Add clear instructions and examples **targeted at the observed failures**.
4. Repeat.

Never pre-load a "laundry list of edge cases" attempting to articulate every possible rule (F4).
Examples (few-shot) remain strongly recommended, but curate "a set of diverse, canonical
examples that effectively portray the expected behavior" rather than exhaustive edge cases
(S1). For an LLM, "examples are the 'pictures' worth a thousand words."

### 1.4 What belongs in the system prompt vs. what does not
Belongs: role identity, decision boundaries, hard guardrails, the interaction protocol with
other agents, output contract, altitude-calibrated heuristics for the role's core decisions.
Does not belong: exhaustive reference material (defer it — Part 2), per-task specifics (put
them in the task spec at delegation time), restatements of shared protocol (reference by name).

---

## Part 2 — Structuring prompts that are added via `read` (deferred context)

This is the single most relevant pattern for this repo: system prompts that say "read
`repo_overview.md` if present before starting real work" and "role prompts reference shared
sections by name". Anthropic calls this family **just-in-time (JIT) context** and
**progressive disclosure** (S1, §Context retrieval and agentic search).

### 2.1 Why defer instead of inline
- An agent in a loop generates more and more potentially relevant data; pre-loading everything
  pollutes the attention budget before the task begins (S1, §Why context engineering matters).
- JIT agents keep **lightweight identifiers** (file paths, queries, links) in context and load
  the referenced content at runtime with tools (S1). Metadata around a reference — folder
  hierarchy, filename, timestamps — itself signals purpose and relevance, so the agent knows
  *when* to load it without reading it (S1).
- **Progressive disclosure:** each exploration step yields context that informs the next
  decision; the agent assembles understanding layer by layer and keeps only what is necessary
  in working memory (S1).
- **Hybrid is often optimal:** load a small, stable, high-signal core upfront (Anthropic's
  Claude Code naively drops CLAUDE.md into context) and let the agent retrieve the rest
  just-in-time. The right split depends on how dynamic the content is: less dynamic → more
  upfront (S1). For this repo: stable protocol inlined (AGENTS.md auto-loaded), volatile
  repo facts deferred (repo_overview.md), skills deferred until the task matches.

### 2.2 The pointer (in the always-loaded prompt) must carry four fields
A pointer to a deferred file is itself a prompt surface and costs tokens. Make it earn them.
Each pointer should state:

1. **Path** — exact location.
2. **Trigger** — when to read it ("if present, before starting real work"; "only when the
   task matches skill X"). Never "read this eventually".
3. **What it gives** — one line on what the reader will get ("the repo map: module map,
   test commands, gotchas"), so the agent can decide whether the trigger fired.
4. **Staleness rule / precedence** — what wins if it conflicts with code or the shared
   protocol (AGENTS.md: "if it conflicts with the code or repo_overview.md, the code wins —
   flag the discrepancy").

### 2.3 How to write the deferred file itself
- **Self-contained at its own trigger level.** A deferred file must be readable by an agent
  that has the always-loaded protocol but has never seen the file. No "as noted above".
- **Sectioned with stable anchors.** Markdown headers (or XML tags) per topic; other prompts
  reference these sections **by name**, so sections need stable names. Renaming a section is a
  breaking change for every prompt that references it.
- **Discoverable by filesystem metadata.** Name and folder should encode purpose
  (`repo_overview.md` under `prompts/repo/` tells the agent "repo docs" before opening). This
  is S1's metadata-as-signal principle applied to prompt files.
- **Tight per the north star.** It is loaded *into* the attention budget at read time; the
  smallest high-signal set that fulfills its stated purpose. If a section is only needed for
  one rare task, split it into its own file with its own pointer rather than bloating the main
  deferred file (progressive disclosure applies recursively).
- **No cycles.** File A tells the agent to read B; B should not depend on having read A's
  sibling C first, unless A says so explicitly. Chain depth beyond 1–2 hops is a smell —
  the agent is being made to re-derive pointers it should have had.
- **Update discipline.** Deferred files rot faster than inlined protocol because nothing
  forces their presence. State a "last verified against <commit/date>" line or a review owner;
  a stale deferred file is worse than none, because the agent trusts the pointer.

### 2.4 Layering model (practical rule of thumb)
- **L0 — inlined in system prompt:** identity, hard guardrails, protocol, pointers. Always
  loaded; smallest possible.
- **L1 — one read, stable:** repo map / role reference (repo_overview.md). Loaded once at
  start of real work.
- **L2 — one read, task-triggered:** skill files, per-role deep references. Loaded only when
  the task matches.
- **L3 — runtime retrieval:** live data (files, logs, web) fetched with tools as needed;
  never pre-loaded in bulk (S1: use targeted queries, head/tail, filters — "without ever
  loading the full data objects into context").

---

## Part 3 — Tool description optimization (tools, plugins, parameters)

### 3.1 Weight of the evidence
"Tool definitions and specifications should be given just as much prompt engineering attention
as your overall prompts" (F5, S2 Appendix 2). On SWE-bench, Anthropic "spent more time
optimizing our tools than the overall prompt" (S2). "Even small refinements to tool
descriptions can yield dramatic improvements" — Claude Sonnet 3.5 reached state-of-the-art on
SWE-bench Verified "after we made precise refinements to tool descriptions" (F6, S4).
A description rewrite produced by a tool-testing agent (tested dozens of times) gave "a 40%
decrease in task completion time for future agents" (F7, S3 principle 5). Descriptions are a
first-class optimization target, not a docstring afterthought.

### 3.2 The two tests for a description
1. **The new-hire test (S4, §Prompt-engineering your tool descriptions):** describe the tool
   as you would to a new hire on the team. Make implicit context *explicit*: specialized query
   formats, definitions of niche terminology, relationships between underlying resources.
   "Put yourself in the model's shoes. Is it obvious how to use this tool, based on the
   description and parameters, or would you need to think carefully about it? If so, then
   it's probably also true for the model" (S2).
2. **The human-arbitration test (S1):** "If a human engineer can't definitively say which
   tool should be used in a given situation, an AI agent can't be expected to do better" (F8).
   Run this test on every pair of similar tools; if the answer is "either one", the boundary
   is broken — fix descriptions or consolidate (3.6).

### 3.3 Anatomy of a good tool description
A good tool definition includes (S2, Appendix 2):
- **Example usage** — at least one concrete, copy-pasteable example.
- **Edge cases** — where it misbehaves, what it returns on empty/error.
- **Input format requirements** — exact shapes, constraints, units, path formats.
- **Clear boundaries from other tools** — what this tool does NOT do, and which sibling tool
  covers that (this is the anti-overlap clause; see 3.6).
Plus, from S4:
- **Make expected inputs and outputs explicit and unambiguous**, enforced with strict data
  models where the API allows.
- **Unambiguously named parameters**: "instead of a parameter named `user`, try `user_id`".
  Think of parameter names and descriptions as "writing a great docstring for a junior
  developer" — extra-important with many similar tools (S2).

### 3.4 Poka-yoke the schema
"Change the arguments so that it is harder to make mistakes" (S2). Canonical evidence: the
SWE-bench agent made mistakes with relative filepaths after moving out of the root directory;
changing the tool to **always require absolute paths** made it "use this method flawlessly"
(F9, S2). Generalize: if a class of mistakes is observed, prefer schema-level elimination
(enumerations, required fields, absolute formats, restricted ranges) over description-level
warning. Warnings in prose are the fallback, not the primary defense.

### 3.5 Output format choices
Some formats are easier for an LLM to produce than others (S2, Appendix 2):
- Give the model enough tokens to "think" before it writes itself into a corner (e.g., a
  whole-file rewrite is easier to emit correctly than a diff, because a diff requires
  pre-counting changed lines in the hunk header).
- Keep the format **close to what the model has seen naturally in text** — code in Markdown
  is easier for the model than code escaped inside JSON.
- Eliminate formatting **overhead**: no maintaining accurate counts, no string-escaping of the
  model's own output.
The same logic applies to tool *responses*: response structure (XML vs JSON vs Markdown)
affects eval performance, there is no one-size-fits-all, and the optimum should be chosen by
evaluation per task (S4, §Returning meaningful context).

### 3.6 Right-sizing the tool set and boundaries
- **More tools do not mean better outcomes.** The common error is wrapping every existing API
  endpoint with a tool. Agents have limited context, computer memory is cheap; a tool that
  returns "all" is a context-waster by design (S4, §Choosing the right tools — address-book
  example: `search_contacts` / `message_contact` beat `list_contacts`).
- **Consolidate chained operations into one tool** (S4 examples): `schedule_event` (finds
  availability + creates) over `list_users` + `list_events` + `create_event`;
  `search_logs` (returns only relevant lines + context) over `read_logs`;
  `get_customer_context` over three getters. Consolidation "offloads agentic computation from
  the agent's context back into the tool calls themselves" and shrinks the loaded description
  surface (S4, §Namespacing your tools).
- **Each tool needs a clear, distinct purpose** (S3 principle 4; S1). "Bad tool descriptions
  can send agents down completely wrong paths."
- **Namespacing** groups related tools under common prefixes (`asana_projects_search`,
  `jira_search`) to delineate boundaries in large tool sets (S4). Whether prefix- or
  suffix-based naming is better "has non-trivial effects" that "vary by LLM — choose a
  naming scheme according to your own evaluations" (F10).

### 3.7 Optimize what the tool *returns*, not just what it says
Descriptions steer before the call; responses steer after. Both are prompt surfaces:
- **High signal only**: prioritize contextual relevance over flexibility; "eschew low-level
  technical identifiers" (uuid, mime_type, pixel-width URLs) in favor of fields that inform
  downstream action (`name`, `image_url`, `file_type`) (F11, S4).
- **Natural identifiers beat cryptic ones**: merely resolving arbitrary UUIDs to meaningful
  names (or a 0-indexed ID scheme) "significantly improves precision in retrieval tasks by
  reducing hallucinations" (F12, S4).
- **Control verbosity**: expose a `response_format` enum (`"concise"` | `"detailed"`) so the
  agent can choose; Anthropic's example used ~⅓ of the tokens in concise mode (72 vs 206
  tokens) while keeping a `detailed` path available for downstream ID-dependent calls (F13,
  S4).
- **Token-limit large outputs**: combine pagination, range selection, filtering, and/or
  truncation with sensible defaults; Claude Code caps tool responses at 25,000 tokens by
  default (S4, §Optimizing tool responses for token efficiency).
- **Truncation and errors are steering surfaces.** A truncated response should carry
  instructions on how to get the rest more efficiently ("make many small, targeted searches
  instead of a single broad search"). Error responses must be "specific and actionable
  improvements, rather than opaque error codes or tracebacks" — a well-worded error can
  teach the correct input format (S4).
- **Description fixes behavior, not just docs**: Claude needlessly appended `2025` to a web
  search `query` parameter, biasing results; "we steered Claude in the right direction by
  improving the tool description" (F14, S4, §Analyzing results). When an observed behavior
  smells like a misunderstanding, suspect the description before the model.

### 3.8 Tool-selection heuristics belong in the prompt
With many tools (especially third-party/MCP ones of "wildly varying quality"), give the agent
explicit selection heuristics in its prompt: examine all available tools first; match tool
usage to user intent; use web search for broad external exploration; prefer specialized tools
over generic ones (S3 principle 4, F15).

### 3.9 Plugin and auxiliary description surfaces
Anything that is loaded into context and steers behavior — plugin instruction text, skill
descriptions (the one-liner that decides whether the skill is loaded), subagent descriptions
(the one-liner that decides whether the subagent is launched), system reminders — obeys the
exact same rules: new-hire test, explicit boundaries, distinct purpose, minimal signal.
Skill/subagent one-liners deserve special care: they are the *only* description the agent
reads before deciding to spend tokens on the full content, so they must contain the trigger
condition, not just the noun phrase.

---

## Part 4 — Multi-agent delegation prompts

Directly transferable to planner/worker/explorer delegation:

1. **Teach the orchestrator how to delegate (F16).** Every delegated task must carry: an
   **objective**, an **output format**, **guidance on tools and sources** to use, and **clear
   task boundaries** (S3 principle 2). Short instructions like "research the X shortage"
   measurably caused duplicated work, gaps, and identical parallel searches. A task spec that
   only states the topic is a broken spec.
2. **Scale effort explicitly (F17).** "Agents struggle to judge appropriate effort for
   different tasks, so we embedded scaling rules in the prompts": simple fact-finding ≈ 1
   agent with 3–10 tool calls; direct comparisons ≈ 2–4 subagents with 10–15 calls each;
   complex research > 10 subagents with divided responsibilities (S3 principle 3). Wherever
   this repo's agents "burn" budget on easy tasks, the fix is an explicit scaling rule in the
   planner prompt, not an appeal to judgment.
3. **Think before acting.** A planning scratchpad (extended/interleaved thinking, or an
   explicit "plan then execute" instruction) improved instruction-following, reasoning, and
   efficiency; subagents re-plan after each tool result to evaluate quality, find gaps, and
   refine the next step (S3 principle 7). For non-thinking models, this translates to
   instruction-level planning checkpoints in the prompt.
4. **Parallelize delegation.** Spawning 3–5 subagents in parallel instead of serially, plus
   3+ parallel tool calls inside subagents, cut research time by up to 90% (S3 principle 8).
5. **Expect emergent behavior.** "Small changes to the lead agent can unpredictably change
   how subagents behave" (S3). Prompt changes must be evaluated at the system level, not per
   file; keep a regression set (Part 5).
6. **Route results through artifacts, not conversation.** Subagents writing structured
   output to persistent artifacts (files) and returning lightweight references avoids
   "game of telephone" loss and token overhead (S3, Appendix; also the repo's own
   handover-file pattern: committed files are canonical).
7. **Effort budgets are a prompt concern.** The multi-agent system's prompts are "frameworks
   for collaboration that define the division of labor, problem-solving approaches, and
   effort budgets" — not just strict instructions (S3).

---

## Part 5 — The evaluation loop (how to know a prompt/description change helps)

Optimization without measurement is confabulation. Anthropic's loop (S3 §Effective
evaluation; S4 §Running an evaluation):

1. **Start small and immediately.** ~20 queries representing real usage patterns is enough
   early on, because early changes have large effects (a prompt tweak moving 30%→80% is
   visible on a handful of cases). Do not wait for a grand eval suite (S3, F18).
2. **Write strong tasks, not toy tasks.** Strong: multi-step, realistic, grounded in real
   data, requiring many tool calls with a verifiable outcome ("Schedule a meeting with Jane
   next week about the Acme project, attach the planning notes, reserve a room"). Weak:
   single-lookup sandbox tasks that don't stress the tool ("Find the cancellation request by
   ID 45892") (S4, F19). Pair each task with a verifiable outcome; keep verifiers tolerant of
   formatting/phrasing variance. Optionally record which tools you *expect* called — but do
   not overspecify valid alternative paths.
3. **Measure beyond accuracy:** total runtime, number of tool calls, token consumption, and
   tool errors per task (S4). Redundant calls → rightsizing pagination/limits; errors on
   invalid parameters → description/example gaps (S4).
4. **Read the transcripts; read the omissions.** "What agents omit in their feedback can
   often be more important than what they include" (S4). Review raw transcripts including
   tool calls/responses to catch behavior the agent never reports. Ask why the agent did or
   didn't call a given tool; that is usually the description problem in plain sight.
5. **LLM-as-judge, done simply, scales.** A single LLM call with a single rubric prompt
   (factual accuracy, citation accuracy, completeness, source quality, tool efficiency)
   outputting 0.0–1.0 scores plus pass/fail was the most consistent configuration and matched
   human judgement best (S3, F20). Use it for hundreds of outputs; keep human testing for
   what automation misses — Anthropic's early agents preferred SEO content farms over
   academic PDFs; only human testers noticed, and the fix was a source-quality heuristic in
   the prompt (S3).
6. **Let agents optimize the descriptions.** Given a prompt + failure mode, Claude models can
   diagnose and improve prompts; a dedicated tool-testing agent that uses a flawed tool then
   rewrites its description found key nuances/bugs and produced the 40% completion-time
   improvement (S3 principle 5, F7). Guard against overfitting with **held-out test sets** —
   Anthropic found further gains even beyond "expert" manual implementations when evaluated
   on held-out tasks (S4, §Collaborating with agents).
7. **Iteration cadence:** the whole point is a *fast* loop — simulate with the exact prompts
   and tools, watch step-by-step, change one thing, re-run the small eval (S3 principle 1,
   "think like your agents"; F21).

---

## Actionable directives

Receiving agent: `prompt-engineer` skill (and planner when delegating prompt work).
Evidence IDs reference the Findings table below.

| ID | Priority | Directive | Applies when | Why | Evidence | Verify | Exceptions / risk |
|---|---|---|---|---|---|---|---|
| D1 | MUST | Before editing any description surface, write down the observed failure mode(s) that justify the edit; start from the current minimal text, not from a blank rewrite | Every prompt/description change | Prevents speculative bloat; changes trace to failures | F2, F4, F21 | Edit diff references a failure; re-run the task that produced it | A scheduled "clean-up" refactor of wording without a failure is allowed only if it reduces length and preserves all triggers/boundaries |
| D2 | MUST | Keep exactly one source of truth per protocol concept; other surfaces reference it by name, never restate it | Any time two surfaces would contain the same rule | Restatement = drift + duplicated token cost | repo AGENTS.md §Editing; F3 | Grep for the concept: one definition, N references | Cross-references break if the target section is renamed — enforce stable section names |
| D3 | MUST | Every pointer to a deferred (read-in) file must state path, trigger, what-it-gives, and precedence/staleness rule | Authoring or editing any pointer in an always-loaded prompt | The pointer is the only description the agent reads before paying the read cost | S1 §JIT/progressive disclosure | A fresh session can decide from the pointer alone whether to read the file | A pointer to a rarely-used file may omit what-it-gives if trigger is extremely specific |
| D4 | MUST | Every deferred file must be self-contained at its trigger level: no "as noted above", stable section names for by-name references, discoverable filename/folder, and a staleness marker | Authoring or editing read-in files | Readers arrive with only the always-loaded context | S1 metadata-as-signal | Read the file in isolation after reading only the system prompt; verify referenced sections exist | Files under 1 hop of pointers may cross-reference siblings if the pointer chain says so |
| D5 | MUST | Every tool description must pass the new-hire test and include: example usage, edge cases, input format requirements, and explicit boundaries vs. sibling tools | Authoring or editing any tool/plugin/skill description | The description is the only contract text the agent reads pre-call | F5, S2 App. 2 | A person with no context can state when to use it, when not to, and format a correct call | One-liner surfaces (skill/subagent descriptions) get only the trigger + boundary clause, depth goes in the full body |
| D6 | MUST | Parameter names must be unambiguous (`user_id` not `user`); describe each as a docstring for a junior developer | Any tool schema change | Removes the most common mis-call class | S4, S2 App. 2 | Schema review checklist | — |
| D7 | MUST | When a mistake class is observed, fix it at the schema level first (poka-yoke: enums, required fields, absolute formats); use description warnings only as fallback | Any recurring tool-error pattern in transcripts | Schema constraints are deterministic; prose is probabilistic | F9 | Same task class re-run; error count drops to ~0 | Some error classes can't be schema-eliminated (e.g., semantic misuse) — description + example then |
| D8 | MUST | Tool responses must be token-efficient: high-signal fields only, natural identifiers over cryptic UUIDs, verbosity control (concise/detailed), limits with pagination/filter/truncate, and actionable error/truncation messages | Designing any tool response | Response text spends the same attention budget; cryptic IDs cause hallucinations | F11, F12, F13 | Token count on a canonical response; precision on retrieval task | Keep a `detailed` path when downstream calls require the IDs |
| D9 | MUST | Run the human-arbitration test on every pair of similar tools: if a human can't say which to use, rewrite boundaries or consolidate | Tool-set review | Agents can't do what humans can't do | F8 | Pairwise matrix review over the tool list | Adjacent tools can coexist if boundaries are explicit and enforced in both descriptions |
| D10 | MUST | Any new/changed prompt or description ships with a small regression set (~10–20 realistic multi-step tasks with verifiable outcomes) and is re-run before/after | Every change | Early changes have large, detectable effects; without this, "improvement" is anecdote | F18, F19 | Eval delta on the set | First-ever prompt for a brand-new agent may start with 3–5 tasks, expanded as the agent matures |
| D11 | SHOULD | Structure system prompts in named sections (Markdown headers or XML tags); invest in section boundaries, not formatting ceremony | Authoring any system prompt | Sections enable by-name reference and pruning | F3 | — | Exact delimiters matter less as models improve (S1) |
| D12 | SHOULD | Encode heuristics + explicit guardrails + explicit effort-scaling numbers where the model demonstrably misjudges effort; avoid step-by-step procedures | Role prompts (planner/worker/explorer) | Heuristics generalize; procedures rot; effort is a measured blind spot | F2, F17 | Failure modes that involved over-/under-investment stop recurring | Scaling numbers should be revised when model or task mix changes |
| D13 | SHOULD | Every delegated task spec must contain: objective, output format, tool/source guidance, and explicit task boundaries | Planner delegating to any subagent | Vague specs cause duplicated work and gaps | F16 | Worker completion without re-asking for scope | Trivial tasks may compress fields, but boundaries stay explicit |
| D14 | SHOULD | Curate a small set of diverse canonical examples over a long edge-case list; add examples only for observed failures | Any few-shot content | Canonical examples portray behavior; edge-case laundry lists bloat and conflict | F4 | Failure-mode list; example set stays small and diverse | — |
| D15 | SHOULD | Give agents explicit tool-selection heuristics in the prompt when the tool set is large or includes third-party tools | Prompt authoring for agents with >~10 tools | Unseen/low-quality descriptions otherwise steer agents astray | F15 | Wrong-tool-call rate in transcripts | — |
| D16 | SHOULD | Prefer consolidated tools that fold a frequently-chained multi-step operation into one call, over one tool per API endpoint | Tool-set design | Offloads agentic computation from context into the tool call; shrinks description surface | S4 §Choosing right tools | Task token/call counts drop without accuracy loss | Consolidate only chains that are actually frequent; speculative consolidation reduces flexibility |
| D17 | SHOULD | Let an agent draft description/prompt rewrites from failure transcripts, but only accept changes validated on held-out tasks | Optimization passes | Agent rewrites found real bugs; held-out sets prevent overfitting to the eval | F7, S4 §Collaborating | Held-out delta ≥ training-set delta in sign and magnitude | — |
| D18 | MAY | Track pairwise/overlap matrix of the whole tool set and prune on schedule | Mature tool sets | Overlap degrades silently as tools accumulate | F8, S4 §Namespacing | — | Pruning tools is a maintainer decision (observable behavior change) |
| D19 | MAY | Choose response structure (XML/JSON/Markdown) and prefix/suffix namespacing by per-model evaluation, not by fashion | Model migration or A/B | These choices measurably vary by model | F10, S4 | Eval per configuration | Default: match the model's dominant training format |

---

## Findings and provenance

| Finding ID | Type | Atomic finding | Source and locator | Confidence | Notes |
|---|---|---|---|---|---|
| F1 | FACT | Context rot: as token count grows, accurate recall from context decreases; every token depletes a finite "attention budget" | S1, §Why context engineering is important | High | Architectural basis: n² attention, short-sequence training bias |
| F2 | FACT | Right-altitude rule: prompts must be specific enough to guide, flexible enough to give strong heuristics; both brittle hardcoded logic and vague assumptions are observed failure modes | S1, §The anatomy of effective context | High | — |
| F3 | FACT | Recommended system-prompt structure: distinct sections via XML tags or Markdown headers; exact formatting "likely becoming less important" | S1, §The anatomy of effective context | High | — |
| F4 | FACT | Do not stuff a laundry list of edge cases; curate diverse canonical examples; start minimal, add instructions/examples from observed failures | S1, §The anatomy of effective context | High | — |
| F5 | FACT | "Tool definitions and specifications should be given just as much prompt engineering attention as your overall prompts"; on SWE-bench more time was spent optimizing tools than the overall prompt | S2, Appendix 2 | High | — |
| F6 | FACT | Precise tool-description refinements were the lever behind Claude Sonnet 3.5's SWE-bench Verified state-of-the-art result | S4, §Prompt-engineering your tool descriptions | High | — |
| F7 | FACT | A tool-testing agent that rewrites a flawed tool's description (after dozens of test runs) yielded a 40% decrease in task completion time for later agents | S3, principle 5 | High | Anthropic-internal measurement |
| F8 | FACT | Human-arbitration test: if a human engineer can't definitively say which tool to use in a situation, an AI agent can't be expected to do better | S1, §The anatomy of effective context | High | Basis for overlap/consolidation work |
| F9 | FACT | SWE-bench agent made relative-path errors after leaving the root; forcing absolute filepaths in the tool made it use them flawlessly | S2, Appendix 2 | High | Canonical poka-yoke evidence |
| F10 | FACT | Prefix- vs suffix-based tool namespacing has non-trivial eval effects that vary by LLM; choose by own evaluation | S4, §Namespacing your tools | High | Basis for D19 |
| F11 | FACT | Tool responses should eschew low-level technical identifiers (uuid, mime_type, px URLs); fields like name/image_url/file_type better inform downstream action | S4, §Returning meaningful context | High | — |
| F12 | FACT | Resolving arbitrary UUIDs to semantic names (or 0-indexed IDs) significantly improves retrieval precision by reducing hallucinations | S4, §Returning meaningful context | High | — |
| F13 | FACT | A `response_format` concise/detailed enum cut an example response from 206 to 72 tokens (~⅓) while keeping IDs available in detailed mode for chained calls | S4, §Returning meaningful context | High | — |
| F14 | FACT | Claude appended `2025` to web-search queries, biasing results; improving the tool description corrected the behavior | S4, §Analyzing results | High | Description-as-behavior-fix example |
| F15 | FACT | With many/unknown-quality tools, explicit heuristics help: examine all tools first, match usage to intent, web for broad external exploration, prefer specialized over generic | S3, principle 4 | High | — |
| F16 | FACT | Each delegated subtask needs objective, output format, tool/source guidance, and clear boundaries; short vague instructions caused duplicated work and gaps | S3, principle 2 | High | Direct basis for task-spec contract |
| F17 | FACT | Agents misjudge effort; explicit scaling rules were embedded in prompts (simple ≈ 1 agent / 3–10 calls; comparisons ≈ 2–4 agents / 10–15 calls; complex > 10 agents) | S3, principle 3 | High | Numbers are Anthropic's, not universal |
| F18 | FACT | Start evaluating immediately with ~20 real-usage queries; early changes have large effects (e.g., 30%→80%) visible on few cases | S3, §Effective evaluation of agents | High | — |
| F19 | FACT | Strong eval tasks are multi-step, realistic, grounded, verifiable; toy single-lookup tasks don't stress tools | S4, §Generating evaluation tasks | High | Includes concrete strong/weak examples |
| F20 | FACT | A single LLM-judge call with one rubric prompt (0.0–1.0 scores + pass/fail) was the most consistent and most human-aligned configuration | S3, §Effective evaluation of agents | High | — |
| F21 | FACT | Anthropic iterated prompts by simulating with the exact prompts + tools and watching agents step-by-step ("think like your agents") | S3, principle 1 | High | Basis of the fast iteration loop |
| F22 | FACT | Multi-agent (Opus 4 lead + Sonnet 4 subagents) outperformed single-agent Opus 4 by 90.2% on Anthropic's internal research eval; token usage alone explains 80% of variance on BrowseComp | S3, §Benefits of a multi-agent system | High | Internal evals; not externally reproducible |
| F23 | FACT | Agents use ~4× the tokens of chat; multi-agent systems ~15×; multi-agent fit = heavy parallelization, info exceeding one context window, many complex tools | S3, §Benefits of a multi-agent system | High | Cost caveat for delegation design |
| F24 | FACT | Subagents returning condensed summaries (often 1,000–2,000 tokens) to a lead agent gives separation of concerns and long-horizon capability | S1, §Sub-agent architectures | High | — |
| F25 | FACT | Small changes to a lead agent can unpredictably change subagent behavior (emergent); prompts for multi-agent systems are "frameworks for collaboration" defining division of labor, approaches, and effort budgets | S3, §Prompt engineering… (closing paragraph) | High | Basis for system-level regression testing |
| F26 | FACT | Claude Code hybrid context strategy: stable CLAUDE.md loaded upfront, glob/grep for just-in-time file retrieval | S1, §Context retrieval and agentic search | High | Template for the repo's AGENTS.md + repo_overview.md split |
| F27 | FACT | Parallelization: 3–5 subagents spawned in parallel + 3+ parallel tool calls per subagent cut research time by up to 90% | S3, principle 8 | High | — |
| F28 | FACT | Truncated/error tool responses should carry steering instructions (e.g., targeted small searches) and specific actionable fixes instead of opaque codes/tracebacks | S4, §Optimizing tool responses for token efficiency | High | — |
| F29 | FACT | Subagent artifacts written to persistent storage + lightweight references back to the coordinator reduce "game of telephone" and token overhead | S3, Appendix | High | Matches repo handover-file pattern |
| F30 | FACT | Claude Code caps tool responses at 25,000 tokens by default | S4, §Optimizing tool responses for token efficiency | High | Concrete default to imitate |

## Conflicts and uncertainties

- **Model transferability.** All evidence is from Anthropic's Claude models and Claude Code.
  This repo runs on local quantized models (e.g., Qwen3.8-27B IQ4KT via llama-swap). Context-rot
  characteristics, format preferences (JSON vs Markdown), and namespacing effects are known to
  vary by model (F10; S4: no one-size-fits-all response structure). Impact: every MUST in
  Parts 1–4 transfers as *method*; every numeric heuristic (F17, F27, F30) transfers only as a
  starting point. What would resolve it: run the Part 5 loop on the local model with
  prefix/suffix and format A/Bs. Safe default until resolved: apply the method, re-measure all
  numbers locally before encoding them into repo prompts.
- **Internal-eval provenance.** Figures like 90.2%, 80%, 40%, 90% come from Anthropic-internal
  evaluations that are not externally reproducible (F22, F7, F27). Impact: use them as
  magnitude hints for "this lever is worth testing", never as guarantees. What would resolve
  it: independent replication (out of scope). Safe default: treat as ordering evidence.
- **Prefix vs suffix namespacing and response format** are explicitly model-dependent with no
  universal winner (F10; S4). Impact: no repo-wide standard can be mandated from these
  sources. What would resolve it: a per-model eval. Safe default: pick one convention and
  re-evaluate at model migration.
- **How much to inline vs. defer** depends on content dynamism and model capability (S1:
  "do the simplest thing that works"; hybrid splits vary). Impact: the L0–L3 layering (Part 2)
  is a heuristic, not a measured optimum. What would resolve it: measure context usage and
  failure rate at different split points on local models. Safe default: the current repo split
  (protocol inlined, repo facts and skills deferred) is consistent with S1's hybrid guidance.
- **Formatting ceremony (XML vs Markdown) may matter less over time** (F3) — but no source
  says it matters *zero*; section boundaries remain recommended. Safe default: keep sections,
  don't gold-plate delimiters.

## Handoff

- **Recommended next action:** package this brief as the knowledge core of a
  `prompt-engineer` skill under `.opencode/skills/` (or the repo's skill convention), with a
  thin procedure on top: (1) take target surface + failure evidence → (2) apply D1–D10
  checklist → (3) produce diff → (4) run the Part 5 small regression set → (5) report delta.
- **Inputs/artifacts the next agent must receive:** this file; read access to all prompt files
  (`.opencode/agent/prompts/**`, `AGENTS.md`, `repo_overview.md`), tool/plugin registration
  sources (descriptions + schemas), and the transcript/log sources for failure mining; a way
  to run the local model on the regression set.
- **Decisions requiring maintainer approval:** none for the skill itself (knowledge artifact).
  Tool-set pruning (D18) and any change to observable agent behavior made while optimizing
  prompts are maintainer decisions per the repo's approval boundaries.
- **Deliberately not concluded:** no audit of this repo's current prompts/tools was performed
  (out of scope — that is the skill's first real task); no local-model A/B measurements exist
  yet; no universal answer on response format or namespacing style.

## Quality gate

- [x] Each MUST directive has direct evidence (D1: F2/F4/F21; D2: F3 + repo protocol;
      D3/D4: S1 JIT section; D5: F5; D6: S4/S2; D7: F9; D8: F11–F13/F30; D9: F8; D10: F18/F19).
- [x] Each directive includes an observable verification method.
- [x] Facts, inferences, and recommendations are labeled separately (Findings table types;
      directives carry priority; inferences marked as notes).
- [x] Conflicts and unknowns are explicit (5 entries above).
- [x] No unsupported exact values or identifiers were generated — all numbers, quotes, and
      dates were copied from the four retrieved sources.
