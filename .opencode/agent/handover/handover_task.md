# Task spec — attention-keywords: marker set, priority ladder, inbox cadence

**Source:** `.opencode/proposals/approved/2026-09-12_attention-keywords.md`
(approved by the maintainer; his in-file note lines 43–44 add the `--wip` marker —
it is PART of this task). Prompt/documentation task — NO FST code changes.

## Goal
Codify the maintainer's priority markers so agents triage instead of interrupting:
a marker table, a priority ladder, and an inbox cadence — in the role prompts,
exactly per the proposal's Parts 1–4 plus the `--wip` addition.

## Definition of done (all measurable)
1. **Planner prompt** (`.opencode/agent/prompts/agents/prompt_agent_planner.md`) —
   the canonical home. In its `## maintainer calls/decisions` section (the one that
   currently documents only `--main`/`--maintainer`):
   - the full marker table from proposal Part 1, rows: `--maintainer`/`--main`
     (act FIRST, may interrupt) / `--now` (after the current verified unit, before
     other queued work) / `--todo` (capture into `TODO.md` with the standard entry
     fields, next ID, no immediate work) / `--deferred` (alias `--defer`;
     DEFERRED-flagged TODO entry; picked up only when nothing else is open) /
     `--wip` (the file is live-edited by the maintainer: READ ok, EDIT NO — if a
     task requires editing that file, stop and flag it in the summary/NAP; the
     marker is removed only by the maintainer) / unmarked (background: queue;
     small items ≤ a few lines of effect may be done inline).
   - the priority ladder (proposal Part 2), identical in BOTH the direct and
     autonomous sections: direct maintainer message in a primary session >
     `--maintainer`/`--main` > `--now` > unmarked inbox items (small first) >
     `--todo` capture > `--deferred`.
   - inbox cadence (Part 3): the session-start scan = TRIAGE by the ladder, not
     execution; an inbox item is handled when nothing more important is pending;
     small items (≤ a few lines of effect) may be handled inline.
   - marker removal rule: after a marker item is handled, remove the marker line
     (the existing `--main` rule, generalized); EXCEPTION `--wip` — agents never
     remove it (owner: maintainer).
   - autonomous section: the bare "scan inbox; handle anything there" line becomes
     ladder triage (scan → classify → act per ladder).
2. **Worker prompt** (`.opencode/agent/prompts/agents/prompt_agent_task.md`) —
   ONE guard line in its work-loop section: files marked `--wip` are
   maintainer-live-edited — do not edit them; if the task requires it, stop and
   flag in the summary. (No table — the canonical one is in the planner prompt.)
3. **Looprunner prompt** (`.opencode/agent/prompts/agents/prompt_agent_looprunner.md`)
   — ONE line in its routing/handling section: markers (`--main`, `--now`,
   `--todo`, `--deferred`, `--wip`) ride verbatim with the messages; the
   looprunner does not interpret them.
4. **Grep acceptance:** `--now`, `--deferred`, `--todo`, `--wip` all present in
   the planner prompt; `--wip` in the worker prompt; all five in the looprunner
   one-liner. The marker table exists in exactly ONE place (planner prompt);
   worker/looprunner reference, not restate, it.
5. **Probe gate green:** `node .opencode/plugin/probes/handover_probe.mjs` →
   `PROBE handover: 84/84 PASS` (run under NODE; bun host is the known exception).
6. No new `TODO.md` entries unless you hit something genuinely open (then
   `todo_inbox.md` instead, per protocol).

## Approval boundary
Pre-approved (proposal approved + his addition). Do NOT change observable FST
behavior, `opencode.jsonc`, or anything outside the three prompt files.

## DO-NOT-touch
`.opencode/maintainer/**` (his space — the `--wip` CONCEPT is his, you only
document it), `AGENTS.md` (if you think it needs a marker line, flag it in the
summary instead), the proposal file itself, `TODO.md` closed entries,
`archive/**`, FST product code, `opencode.jsonc`.

## Worker
`worker_Q4_120K` (implementation, stable, 120k window — text-only task).

## Procedure (suggestion, not protocol)
Read the proposal + the three prompts first; edit planner → worker → looprunner;
grep-accept; run the probe; commit per the commit routine (code/none + TODO
delta if any + this spec + your summary file).
