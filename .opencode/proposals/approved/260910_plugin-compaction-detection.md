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

comment
- add to the plugin a writeout function that creates in .opencode/temp/session_context/ files for each session id named via session_id for now and appends its lasted output to the appropiate session_id
  - future compaction warning should also be put there
  - (so i can track this behavior)
260910-1954.md in inbox 
- move the gauge and peek mjs script into plugin/scripts/folder and update references
  - you are allowed to update alle prompt files that might be connected to it to change in place

Planner status (2026-09-10, iteration 6):
- **Gauge move — DONE** (`0ce43b8`): `ctxgauge/{gauge,peek}.mjs` →
  `.opencode/plugin/scripts/`; all references updated (plugin import
  `./scripts/gauge.mjs`, probe import, `agents_repo.md` module map + gauge
  command, live prompts reference the gauge via `agents_repo.md` so no direct
  edit needed). The spawn-sqlite3 fallback path inside `gauge.mjs`
  (`DEFAULT_EXE_PATH`, file-relative) was updated in the same commit — without
  that the fallback would silently break. Verified: gauge runs from the new
  path, probe 52/52 PASS.
- **Session context writeout — folded into step 2:** the plugin writes
  `.opencode/temp/session_context/<session_id>` (one file per session, append
  the latest nudge/gauge output; future compaction warnings go to the same
  file). `temp/` is git-ignored. This is observable behavior → still needs your
  approval like the rest of step 2. Step 1 (probe the hook payloads for a
  compaction signal) is unchanged, pre-approved-class meta.
- Note: your draft `proposals/files/agents_repo.md` (live-test set) still
  carries the old `ctxgauge/` gauge path — update when you finalize that set.

- step 2 approved
- step 3 
  - without information which session of planner this actually is it will be hard to attribute a file to a worker or planner session. at least for me. so the benefit of the seperate files vanish.
    - so lets log all into one file which appends with leading data-time format like the general convention. if we find information of current model in use it should be the next entry and then just normal output.
    - if compaction works then the output should be in the same form: data-time + model + compaction info + optional data depending on what data you can find in the hook of the compactiontool.above and tool.before (i assume both will be used?)
