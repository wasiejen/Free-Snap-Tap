# Agent prompt refactor — design rationale & proposal index

Proposal status: **APPROVED** (maintainer, 2026-09-10: apply Option A file set = yes;
trim `agents_repo.md` = yes; no wording to lock in). This folder = restart-loaded files;
apply by overwriting the same-basename live files, then restart opencode.
Applies to: `AGENTS.md`, `agents_repo.md` (targeted trims, §9), and the 4 role prompts
(`prompt_agent_{planner,task,explorer,looprunner}.md`). Each file in this folder is a
drop-in replacement for the same-basename file in `.opencode/system_prompts/agents/`
(or `AGENTS.md` at repo root). Apply + restart opencode when approved.

## 0. TL;DR

The shared protocol (git, commit routine, context budget/stop-line, TODO contract,
approval boundaries, handover-file roles, agent_feedback) is **already auto-loaded into
every session's system prompt via `AGENTS.md`**. The role prompts then *restate* most of
it — which is (a) context waste, (b) the source of drift between copies, and (c) the main
friction the loop has logged.

Fix: make `AGENTS.md` the single source of the shared protocol (add the missing
interaction-contract table + the shared discovery rules), and shrink each role prompt to a
**thin delta** that only adds role-specific behavior and *references* AGENTS.md sections by
name instead of copying them. Net: ~40–50 fewer duplicated lines per role, one place to
edit the protocol, and the looprunner no longer embeds the planner's autonomous contract.

## 1. Verified load model (why this works)

Verified against opencode source (`dev` branch) — not assumed:

- `session/instruction.ts` → `system()` produces the `Instructions from: <path>\n<content>`
  block (the one visible in a live session's context) from the project `AGENTS.md`
  (`findUp`, first match wins) plus the `instructions` array in `opencode.jsonc`.
  It is **cwd/instance-scoped**, not session-scoped.
- `session/prompt.ts` → `runLoop` appends that block to the system prompt **every turn, for
  every session**, including subagent children created by the Task tool.
- `session/system.ts` → `provider(model)` selects the built-in base template; an agent's
  custom `prompt` **replaces that base template**, while AGENTS.md is **added on top**.

Composition: `system prompt = [base template OR agent prompt] + env + skills + mcp + AGENTS.md`.

**Consequences the refactor exploits:**
1. AGENTS.md is *always* in context, for every role, including workers. → role files must
   not restate it.
2. Current role init step "Read AGENTS.md as your first action" is a **redundant
   double-read** (the file is already injected). → drop it; keep only "read `agents_repo.md`"
   (that one is *not* auto-loaded).
3. Editing the protocol in one file propagates to all roles on the next restart. → true SSoT.

## 2. What's wrong today (friction map)

From the role prompts + `.opencode/agent_feedback.md` (the friction log):

- **Double-injection / drift.** The protocol block (stop-line, commit routine, handover
  roles, agent_feedback) appears in AGENTS.md *and* is re-summarized in 3–4 role prompts,
  each slightly differently. Drift → agents see two conflicting "sources of truth."
- **Looprunner embeds the planner's launch text verbatim** (`prompt_agent_looprunner.md`
  lines ~15–54). The autonomous BEHAVIOR (check unfinished work, inbox scan, explorer
  fallback, autorun archive copies, closing-summary format) lives *inside the looprunner's
  embedded quote*, duplicating what the planner must know. The action-line vocabulary is
  defined in two places with subtly different wording. Biggest drift + confusion source.
- **Summary-file clobber (P02, recurring).** The Task-tool result channel can overwrite
  `handover_task_to_planner.md` after the worker commits; the agent has no single place
  saying "the committed copy is canonical, the final message is just a pointer."
- **Explorer honesty failures (logged).** Fabricated the context gauge, and claimed
  TODO.md entries that were never written to disk. The prompt has no explicit
  "report only what is on disk" guard.
- **Over-specified personas.** The explorer's multi-bullet "Core Identity & Temperament" and
  the looprunner's emoticons add framing an intelligent model doesn't need and that invites
  over-thinking.
- **Redundant "Read AGENTS.md" init step** in all three repo roles (§1, consequence 2).

## 3. Design principles

- **P1 — Single source of truth.** One home per shared rule: the protocol lives in
  `AGENTS.md`; role files *reference* it by section name, never copy it.
- **P2 — A role = verb + artifact + contract.** Define each role by its primary verb, the
  artifact it produces, and who consumes it. Fewer "don'ts", clearer identity. Agents are
  intelligent — tell them what to produce and who reads it, not 12 prohibitions.
- **P3 — One interaction contract.** The looprunner↔planner↔worker surface is described
  **once**, in a compact table (channels, owner, consumer, canonicality + the action-line
  state machine). Kills the two-places drift.
- **P4 — The looprunner is a relay, not a participant.** No repo work, no planning logic.
  The autonomous BEHAVIOR contract moves into the **planner** prompt (triggered by
  `<|autonom|>`), so the looprunner's embedded launch text shrinks to the mechanical minimum.
- **P5 — Identity in one line.** Drop persona blocks. A crisp verb+artifact is more
  stabilizing than a personality for a quantized model.
- **P6 — Save context without losing readability.** AGENTS.md stays the human/maintainer
  reference *and* the machine core; role files shrink. No new file required for this to work.

## 4. Role taxonomy (verb + artifact + contract)

| role | verb | produces | consumed by |
|---|---|---|---|
| looprunner | drive the loop (launch / relay / action) | loop_log entries, restart decisions | (none — mechanical) |
| planner | plan, delegate, verify, own goal + plan state | task spec, NAP (plan state), closing summary + action line | workers (task spec), looprunner (action line), next planner session (NAP) |
| worker | implement one task, edit → verify → green | a green commit + `handover_task_to_planner.md` | planner (summary) |
| explorer | audit + map, classify gaps | prioritized `TODO.md` entries + `handover_task_to_planner.md` | planner (findings) |

## 5. The interaction contract (the centerpiece — lives in AGENTS.md)

Described **once**; all roles reference it. Two parts: the channel table + the action-line
state machine.

**Channels** (the *committed* version of a file is canonical unless noted):

| channel | path | written by | read by | canonical when |
|---|---|---|---|---|
| task spec | `.opencode/handover_task.md` | planner | worker | committed |
| worker summary | `.opencode/handover_task_to_planner.md` | worker | planner | committed (the Task-tool result may clobber it post-commit — committed copy wins) |
| plan state / NAP | `.opencode/handover_planner.md` | planner | planner (next session), looprunner (indirect) | committed |
| action line | last `action:` line of planner's closing message | planner | looprunner | last one in the message |
| iteration N | top of looprunner's launch message | looprunner | planner | the launch message |
| maintainer → role | `.opencode/proposals/maintainer/inbox_<role>/` | maintainer | named role | moved to `maintainer/done/` after handling |

**Action-line state machine** (defined once, both looprunner and planner read it):
- `action: restart` — fresh planner session (default; missing/unclear → restart)
- `action: resume` — resume the last sub-agent session via `task_id` (no task re-injection)
- `action: ask_maintainer: <q>` — pause the loop until the maintainer answers
- `action: stop` — goal reached / unrecoverable

**Surface rules:** the summary *file* is the single summary channel — the agent's final
message is a short pointer (path), never a re-dump (closes the "final message = same
summary" loop). Committed state is the resume contract: a fresh session rebuilds reality
from files + `git log`, never from memory.

## 6. Granularity options (answering "split into more granular files?")

- **Option A (recommended, do now) — AGENTS.md is the core, role files are thin deltas.**
  Zero config change. Works with the current auto-load. Removes double-injection and the
  redundant "Read AGENTS.md" step. **This is what the 6 files in this folder implement.**
- **Option B (optional, later) — also auto-load `agents_repo.md`.** Add
  `"agents_repo.md"` to the `instructions` array in `opencode.jsonc`. Then repo roles also
  drop the "read agents_repo.md" step. *Trade-off:* it injects ~250 lines of repo facts into
  *every* session, including the looprunner (which does no repo work) — so probably not worth
  it. Not recommended unless repo facts bloat the worker context enough to matter.
- **Option C — compose a separate `core/protocol.md` via `{file:}` in each agent `prompt`.**
  `prompt` is a single `{file:}` or a string, and `{file:path}` substitutes in config strings,
  so `prompt: "{file:core/protocol.md}\n{file:role/planner.md}"` composes two files. Cleaner
  SSoT, but it would *re-inject* the core on top of the auto-loaded AGENTS.md (double) unless
  you also move the core *out of* AGENTS.md. Not worth the config risk for the same outcome A
  already gives. Revisit only if AGENTS.md becomes too large.

**Recommendation: implement A now. Keep B and C documented for later.**

## 7. Context budget, before → after (estimates)

Current sizes (lines, from the live files): explorer 55, worker/task 79, planner 80,
looprunner 97, AGENTS 117, agents_repo ~250.

Per repo-role session (planner/worker/explorer): AGENTS.md is injected regardless. Today the
role prompt *adds* ~80 lines that mostly restate AGENTS.md. After: the role prompt adds ~30–45
lines of genuinely role-specific content. → ~35–45 fewer injected lines per repo role, and the
protocol has one home. The looprunner drops from ~97 to ~45 by shedding the embedded autonomous
contract.

## 8. Per-file change summary

- `AGENTS.md` (proposed): keep the loop-breaking protocols, git, commit routine, context
  budget, TODO contract, push policy, approval boundaries, handover roles. **Add** the
  interaction-contract table (§5) and the shared discovery/adjacent-fixes rules (so worker and
  explorer both reference one block). **Move** agent_feedback here (currently only in role
  prompts). Add a one-line safety pointer to `agents_repo.md`.
- `prompt_agent_planner.md`: one-line identity; **autonomous-mode section** (resume-from-NAP,
  check unfinished work, inbox scan, autorun archive copies, explorer fallback, closing-summary
  + action-line requirement) — moved *out* of the looprunner; goal-first; delegate-or-do
  threshold; verify-never-assume; TODO curation + maintainer-call bundling. References the
  contract, does not restate the protocol.
- `prompt_agent_task.md` (worker): one-line identity; work loop (style-first, verify to green,
  iterate); checkpoint rule; **honesty guard** (report only what is on disk; verbatim gauge
  line); handoff = write the summary file, final message is a pointer.
- `prompt_agent_explorer.md`: one-line identity; audit+map loop; **per-finding checkpoint**
  (write to TODO.md immediately — the unit of work); the same **honesty guard**; read-mostly
  edit allow-list (TODO.md + summary + scratchpad).
- `prompt_agent_looprunner.md`: mechanical relay only — launch planner (iteration N + verbatim
  maintainer messages), read the last `action:` line, display the summary, do the action, relay.
  Embedded launch text trimmed to the mechanical minimum; autonomous behavior removed (now in
  the planner). Loop hygiene (ctx at 80%/85%, launch-fail retry, no-progress stop) kept.

## 9. `agents_repo.md` — targeted trims only (not a full rewrite)

`agents_repo.md` is ~250 lines of single-sourced repo facts (module map, data flow, test
conventions, gotchas, env/shell) — high value, no duplication, so **leave the facts verbatim**.
Documented trims (apply by hand, low risk):
- "Worker roster" duplicates `opencode.jsonc` and already says "verify the roster THERE, never
  trust this section" → reduce to a pointer + model/quantization notes only.
- "Handover file paths" now overlaps the AGENTS.md interaction-contract table → keep only the
  concrete path strings, point to the table for semantics.

## 10. Risks & maintainer decisions

- **R1 — `{file:}` compose (Option C) not chosen**, so no config edit needed. Applying these
  files is: overwrite `AGENTS.md` + the 4 prompts, restart. No `opencode.jsonc` change.
- **R2 — Looprunner embedded-text change was historically delicate** (byte-verbatim constraints
  noted in `agent_feedback.md`). This proposal intentionally changes that text (moves the
  autonomous contract to the planner). The maintainer should confirm the loop's launch/relay
  flow still reads cleanly — the action-line vocabulary now lives in AGENTS.md and both sides
  read the same table.
- **R3 — Explorer/worker honesty guard** is a hard new rule. Confirm it reads as a guardrail,
  not a personality (P5).
- **Decisions needed:** (1) approve Option A file set; (2) keep or take the §9 `agents_repo.md`
  trims; (3) any wording the maintainer wants locked (e.g. the exact action-line vocabulary).
