# Task spec — opencode-auto-resume Phase 2, Deep-Dive A: continuous auto-start

Worker: `worker_Q4_140K` (single run; Phase 1 map already consolidated).

## Context (verified facts — do not re-derive)
The maintainer copied an open-source opencode plugin (auto-resume of stalled
LLM sessions) into the scratchpad as reference for building our own plugins.
Phase 1 delivered a PLANNER-VERIFIED feature map:
`.opencode/agent/knowledge/opencode-plugins/auto-resume-map.md` — **READ IT
FIRST**; every line range in it is verified. This run extracts the recipe for
the **continuous auto-start** topic: how the plugin keeps a stalled/dead
session moving without user clicks — without ever fighting the user's ESC.

## Source — READ-ONLY, outside our repo (the "plugin repo")
Root: `C:/Users/Wasiejen/AppData/Local/Temp/opencode/opencode-auto-resume-master`
- `src/index.ts` — 2767 lines, one monolith (map verified).
- `src/*.test.ts` — 28 test files.
- **NEVER execute anything from the plugin repo** (no bun/npm/node, no
  `bun test`): static analysis only.

## Scope — read ONLY these `src/index.ts` ranges (map = your index)
1. State machine + options: 21-63 (`SessionWatch`), 421-481 (options, incl.
   `busyStallStrategy` 470-473).
2. Send path: 746-908 (`sendContinuePrompt`: agent/model extraction 761-803,
   prompt 810, one retry 829, watchdog chain 853-904, abort+resume escalation
   886-890).
3. Resume/abort: 1698-1749 (`tryAbortAndResume`), 1751-1796 (`tryResume`).
4. The 5s tick: 1834-2091 (`startTimer` — all sub-blocks; the map's skeleton
   lists them with line refs).
5. Event-side arming: 2123-2143 (status interrupted + orphan arm), 2506-2517
   (`session.interrupted`), 2524-2532 (`message.updated` re-arm), 2576-2585
   (`session.error` latch).
6. Hook: 2691-2708 (`chat.message` re-arm).
7. Loop detectors gating resumes: 489-504 (`recordContinue` /
   `isHallucinationLoop`).
8. Test files — case names ONLY (bounded loop, head -8 per file, Phase-1
   method): `index.continue.test.ts`, `index.busy-stall-strategy.test.ts`,
   `index.backoff.test.ts`, `index.watchdog.test.ts`,
   `index.esc-stops-timers.test.ts`, `index.rearm.test.ts`,
   `index.events.test.ts`, `index.session-watch.test.ts`,
   `index.state-machine.test.ts`.

## Definition of done (measurable)
1. **Recipe file** at `C:/Users/Wasiejen/AppData/Local/Temp/opencode/auto-resume-deepdive-A.md`,
   sections IN THIS ORDER:
   1. **Problem map** — the failure modes this topic addresses (busy-silence
      stall; stale-busy needing abort; orphaned parent with dead child;
      user-cancel vs plugin-abort collision), each with trigger conditions +
      line refs.
   2. **State machine** — the `SessionWatch` fields relevant to auto-start +
      the arm → trigger → send → retry → escalate → gaveUp chain with line
      refs; one compact ASCII flow.
   3. **Timer architecture** — what the 5s tick owns vs what event dispatch
      owns, and the design lesson for plugin builders (why this split).
   4. **Send path** — `sendContinuePrompt` pipeline step by step (extraction,
      retry, watchdog re-arm, escalation).
   5. **ESC boundary** — how user-cancel is distinguished from the plugin's
      own aborts (`userCancelled`, `pluginAbortInFlight`, the `continuing`
      latch + `chat.message` re-arm).
   6. **Recipes** — one block per mechanism: what to reuse/adapt for our
      stack (opencode plugin hooks + `ctx.client.session`), and what its tests
      prove (test file + case-name pattern).
   7. **Fit assessment** — against OUR plugin surface: enumerate what
      `.opencode/plugin/` in our repo registers (read-only grep of our plugin
      files for hook/tool registrations), state what maps and what is missing.
   8. **Unverified / unclear** — explicit list of anything you could not
      confirm (claims + the check you tried).
   Every line ref must be `src/index.ts`-verified by you (read or
   line-anchored grep). Quote at most 6 consecutive lines of code anywhere in
   the file; reference the rest.
2. **Handover summary** in
   `.opencode/agent/handover/handover_task_to_planner.md`: method, coverage
   (scope items 1-8: done/skipped per item), 3-5 notable findings (one line
   each), the recipe file path, the context-gauge line VERBATIM. Do NOT paste
   the recipe into the handover.
3. **Commit** per the commit routine: stage NAMED paths only (the handover
   file — NEVER `git add -A`); subject names the run. **NO TODO.md /
   todo_inbox.md entries** (the recipe is the deliverable; Phase 3 curates
   TODO seeds). Write the recipe file in batches as you go (a dead session
   loses at most a section).

## DO-NOT-touch
- The plugin repo (read-only — no writes/edits/execution of any kind).
- Our repo except the handover summary file: `.opencode/maintainer/**`,
  `.opencode/agent/prompts/**`, `handover_planner.md`, `TODO.md` /
  `todo_inbox.md`, `AGENTS.md`, `.opencode/agent/knowledge/**` (the map is
  read-only for you), `.git/**`.
