# Task spec — opencode-auto-resume Phase 2, Deep-Dive B: context overflow + error handling

Worker: `worker_Q4_140K` (single run; A/B comparison phase is over).

## Context (verified facts — do not re-derive)
The maintainer copied an open-source opencode plugin (auto-resume of stalled
LLM sessions) into the scratchpad as reference for building our own plugins.
Two artifacts already exist and are PLANNER-VERIFIED:
- Feature map: `.opencode/agent/knowledge/opencode-plugins/auto-resume-map.md`
  — **READ IT FIRST**; its line ranges are verified (if a range and a symbol
  name disagree, trust the symbol — find it by line-anchored grep — and note
  the discrepancy in §8).
- Deep-Dive A recipe: `.opencode/agent/knowledge/opencode-plugins/auto-resume-deepdive-A.md`
  — read §3 (timer architecture), §4 (send path / watchdog chain), §5 (ESC
  boundary) for the shared machinery; **REFERENCE those sections, do not
  re-derive them**.
This run extracts the recipe for the **context-overflow + error-handling**
topic: how the plugin detects a saturating context and hands off to
compaction, classifies streaming/dead-stream errors, and suppresses spurious
error noise.

## Source — READ-ONLY, outside our repo (the "plugin repo")
Root: `C:/Users/Wasiejen/AppData/Local/Temp/opencode/opencode-auto-resume-master`
- `src/index.ts` — 2767 lines, one monolith (map verified).
- `src/*.test.ts` — 28 test files.
- **NEVER execute anything from the plugin repo** (no bun/npm/node, no
  `bun test`): static analysis only.

## Scope — read ONLY these `src/index.ts` ranges (anchors + map-verified refs)
1. Context tracking → saturation: 2536-2549 (token tracking in
   `message.updated`), 1084-1084 (`getUsableContextLimit`), 1093-1113
   (`isMagicContextInstalled`), 2306-2345 (parent → ctx-wrapup command),
   2147-2194 (subagent → native `session.summarize`), 2428-2439
   (`isSubagent` set), 119 (`CTX_WRAPUP_TRIGGER`), 475-479 (options).
2. Error classification: 231-263 (`isStreamingFailure`), 265-316
   (`getLastAssistantError`), 318-352 (`getLastSilentDeadStream`), 82 + 468
   (`silentDeadStreamMinTokens` option).
3. Arming + triggering: 2568-2618 (`session.error` handler: ESC latch
   2576-2585, streaming-fail arm 2588-2609, early-break + counter reset),
   2212-2256 (idle streaming-fail arm + `tryResume`), 2257-2304 (idle
   silent-dead-stream handler), 1983-2017 (tick pending-recovery first
   send — handoff to the watchdog chain is Deep-Dive A §4: reference it).
4. Error hygiene: 509-528 (`log()` — app.log only, 5s dedup), 509-528 +
   2611-2618 (spurious error suppression / early break).
5. State-machine fields (21-63 `SessionWatch`, the B-relevant subset):
   `lastTokenTotal`, `contextWrapupAttempts`, `pendingRecovery{,Reason,At}`,
   `recoveryAttempts`, `watchdogRetryGuard`, `doneClaimNoTodosAttempts`.
6. Test files — case names ONLY (bounded loop, head -8 per file, Phase-1
   method): `index.context-saturation.test.ts`,
   `index.streaming-failure.test.ts`, `index.streaming-failure-idle.test.ts`,
   `index.pending-recovery.test.ts`, `index.session-error.test.ts`,
   `index.silent-dead-stream.test.ts`. (Shared files already covered by
   Deep-Dive A: `index.watchdog.test.ts`, `index.state-machine.test.ts`,
   `index.session-watch.test.ts` — skip them.)

## Definition of done (measurable)
1. **Recipe file** at `C:/Users/Wasiejen/AppData/Local/Temp/opencode/auto-resume-deepdive-B.md`,
   sections IN THIS ORDER:
   1. **Problem map** — the failure modes this topic addresses (context
      saturation — parent vs subagent path; streaming failure while busy;
      silent dead stream; spurious error noise), each with trigger
      conditions + line refs.
   2. **Context saturation chain** — the full path step by step: token
      tracking → usable-window computation (the `context − min(20k, output)`
      formula and its caching) → magic-context host detection → parent
      `session.command({command:"ctx-wrapup"})` vs subagent opt-in native
      `session.summarize` → thresholds/options + once-per-session budget.
   3. **Error classification** — `isStreamingFailure` (name exact-match /
      message regex with substring fallback — quote the pattern lists
      briefly), `getLastAssistantError` (walk semantics),
      `getLastSilentDeadStream` (the three-way criterion: finish reason +
      zero text parts + token floor) — exact field checks each.
   4. **Arm → tick → handoff (the B-specific parts)** — where B's failures
      arm (session.error / idle handlers), the tick's first send and its
      `recoveryAttempts === 0` condition, and the handoff to the watchdog
      chain — ONE pointer to Deep-Dive A §4, not a re-derivation.
   5. **Error hygiene** — logging discipline + spurious-error suppression
      (early break, counter reset), and why the design avoids user-visible
      noise.
   6. **Recipes** — one block per mechanism: what to reuse/adapt for our
      stack + what its tests prove (test file + case-name pattern).
   7. **Fit assessment** — against OUR stack, with a FOCUS on
      `.opencode/plugin/compact_memory.ts` (our compaction plugin,
      read-only): compare its detection (how it knows a session needs
      compaction), trigger (tool-call vs the reference's idle-boundary
      command/summarize), and model-pair resolution against the reference's
      ctx-wrapup/summarize chain; state what B would add to our stack.
   8. **Unverified / unclear** — explicit list (claims + the check you
      tried).
   Every line ref must be `src/index.ts`-verified by you (read or
   line-anchored grep). Quote at most 6 consecutive lines of code anywhere
   in the file; reference the rest.
2. **Handover summary** in
   `.opencode/agent/handover/handover_task_to_planner.md`: method, coverage
   (scope items 1-6: done/skipped per item), 3-5 notable findings (one line
   each), the recipe file path, the context-gauge line VERBATIM. Do NOT
   paste the recipe into the handover.
3. **Commit** per the commit routine: stage NAMED paths only (the handover
   file — NEVER `git add -A`); subject names the run. **NO TODO.md /
   todo_inbox.md entries** (the recipe is the deliverable; Phase 3 curates
   TODO seeds). Write the recipe file in batches as you go (a dead session
   loses at most a section).

## DO-NOT-touch
- The plugin repo (read-only — no writes/edits/execution of any kind).
- Our repo except the handover summary file: `.opencode/maintainer/**`,
  `.opencode/agent/prompts/**`, `handover_planner.md`, `TODO.md` /
  `todo_inbox.md`, `AGENTS.md`, `.opencode/agent/knowledge/**` (map +
  Deep-Dive A recipe are read-only for you), `.git/**`.
