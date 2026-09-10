# PROPOSAL — plugin compaction detection (+ rename) (2026-09-10)

**From:** maintainer inbox item `compaction_warning` (260910) — "could we add
into our handover.ts plugin ... the function to use the hook tool.after or
tool.before and look for compaction information and when found inform the
current running session about it?"

**Problem:** opencode's automatic compaction fires around 50-60% context
(maintainer observation, both planner and worker sessions). Compaction is
silent to the session — the context-cliff risk from AGENTS.md (corrupted
continuity after compaction, esp. on quantized models). The plugin's nudge
system sees raw context growth but not that the session's view was just
compacted.

**Proposal (3 steps, in order):**
1. **Probe first (no behavior change):** the plugin logs every hook event it
   receives (event name + a compact payload digest) to a scratch file for one
   full session (planner + one worker). Determine whether opencode exposes
   compaction events/metrics in `tool.before`/`tool.after`/message hooks. If
   NO compaction signal exists in the payloads → report back, and fall back to
   **inference** (context size that drops sharply between two gauge samples
   while the session is alive = compacted).
2. **Detect + inform:** on compaction (signal or inference), inject a nudge
   into the current session: "compaction detected (~N tokens compacted /
   estimated)" + a reminder of the AGENTS.md loop-breaking protocols (rebuild
   state from the plan file, do not trust pre-compaction assumptions).
3. **Record:** append the compaction to the gauge state file so the planner
   can see worker compaction counts at task result (the maintainer already
   tracks these manually — "worker compact 3 times").

**Rename:** the plugin no longer does handovers (mirror removed in P02).
Suggested name: `ctx_watchdog.ts`. Renaming touches `opencode.jsonc`
(maintainer's live file) → maintainer does it or approves it here.

**Acceptance:** (probe) scratch log exists showing whether a compaction hook
exists; (build) a session that crosses compaction receives the nudge within
the next tool result; gauge state file carries the compaction count; gate
(436+ tests, ruff F=0) unaffected; probe 52/52 rebuilt if the probe asserts
change.

**Status:** awaiting maintainer approval (step 1 is pre-approved-class meta,
2-3 need approval as observable behavior — the nudge text IS observable).
