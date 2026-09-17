# Proposal — #53 agent-feedback protocol: mandatory close-down step + small submit tool

Date: 2026-09-17 · Direct session ses_f4f539d7c · Deferral lifted by the
maintainer 2026-09-17 ("#53 deferral is lifted - it did not even know anymore
that i deferred it"). Owed per the TODO #53 entry.

## Problem
`.opencode/agent/agent_feedback.md` (maintainer-only friction log) is
OPTIONAL today — and the early-close-at-stop-line discipline discards
optional close-down steps, so friction observations are systematically lost
(the very evidence that feeds this prompt/protocol improvement loop). His
priority #5 additionally sketched convenience tools (feedback-add,
knowledge-add, todo_inbox-add, or one unified `submit` tool).

## Design (two independently-approvable parts)

### Part A — the mandatory close-down step (prompt change)
- All four roles (planner/worker/explorer/looprunner): the close-down phase
  includes, DIRECTLY BEFORE the closing message, a check: "did real friction
  occur this session (slow-down, confusion, unclear rule, missing context,
  a near-miss caught by the log)?" — if yes, append an entry to
  `agent_feedback.md` (full `date_time` + role tag + one-line description);
  if no, no entry (absence is the signal, not a stub line).
- The step is codified in the role prompts' close-down sections (planner
  prompt §Direct-session/autonomous closing, worker prompt §work loop,
  explorer + looprunner analogues) and referenced from `AGENTS.md` §
  agent_feedback (maintainer paste — his file).
- The existing "append-only, maintainer-owned, never edited" semantics stay
  unchanged.

### Part B — the `submit` tool (build)
- ONE unified append tool (his #5 sketch, "unified Submit tool ... all
  optional") rather than three separate tools — one registration, one
  sandbox path, and the #53 feedback case is just its first parameter:
  `submit(feedback?, knowledge?, todo?)` —
  - `feedback` → append to `.opencode/agent/agent_feedback.md`
    (date_time + session id + role auto-prefixed; the agent supplies the
    one-line description only — no hand-formatting, which is exactly the
    friction the entry is about);
  - `knowledge` → append to `.opencode/agent/knowledge/knowledge_inbox.md`
    (the already-ruling inbox-then-curate flow);
  - `todo` → append to `todo_inbox.md` (loose, unnumbered, dated +
    role-tagged — the planner curates and assigns the stable ID, per the
    AGENTS.md Discovery rules).
- All params optional, at least one required; sandbox = repo
  `.opencode/` subtree only (same housekeeping discipline as
  `block_transfer`); the tool NEVER reads the target files (append-only, no
  accidental reads — the #53 requirement).
- Probe section pins the contract (registration shape + arg schema + one
  append behavior per param), per the #60 pattern.

## Scope (suggested)
- `.opencode/tools/submit.ts` (new) + `.opencode/plugin/tests/submit.smoke.mjs`
  + `handover_probe.mjs` new section.
- Role prompts: `prompt_agent_planner.md`, `prompt_agent_task.md`,
  `prompt_agent_explorer.md`, `prompt_agent_looprunner.md` (planner-as-text-
  worker for the prompt text — worker edit-deny).
- `AGENTS.md` §agent_feedback one-line pointer (maintainer paste).

## Recommendation
Approve BOTH parts as one unit (the prompt step without the tool re-creates
the file-fiddling friction; the tool without the step stays unused). If the
unified `submit` scope feels too big for one approval, Part A + a
`feedback`-only tool is the fallback split — but the unified form is what
his #5 sketch describes, and it retires three future one-param tools in one
build.

--comment: approved both parts in one unit
optional addition to part A: instructions for the agent via submit tool (general idea sketch):
- `log immediate friction`
- `After each task, include a "Lessons Learned" and "Tool ROI"`
- `summarizing which tool sequences were most efficient and which failed`
- `what functionality would have been great to have e.g. in a tool, in instruction, in workflow`
do not include verbatim, but if, then implement a best effort and efficient way for the agents to give feedback and that we get actionable feedback and e.g. tool function requests.
