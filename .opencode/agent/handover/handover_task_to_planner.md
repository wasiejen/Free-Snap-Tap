# Handover — plan11 / #90 implementation (spawned-successor inherit + trigger deactivation)

Worker: `worker_Q3S_170K`, 2026-09-23. Branch `opencode_test`.
Task spec: `.opencode/agent/handover/handover_task.md`. Design source:
`.opencode/proposals/approved/2026-09-23_spawned-successor-inherit-deactivate.md`.

## Executive summary
Implemented the approved proposal's Parts A+B+C in
`.opencode/plugin/auto_resume.ts` and re-pinned
`.opencode/plugin/tests/auto_resume.smoke.mjs`:
- **Part A** — the `spawned` self-mark EXCLUSION is removed from `scopeVerdict`
  (now a 1-arg function of the messages only). The `spawned` map is repurposed as
  the LINEAGE-DEPTH map (`sid → depth`). `restartText()` LINE 1 is now the exact
  own-line `<|autonom|>` (prose moved to line 2), so EVERY restart-spawned
  successor derives scope "autorun" from its first user message ALONE
  (restart-safe — no in-memory state). A LINEAGE-DEPTH CAP (N=2) on the
  restart/cap-exhaustion spawn branch replaces the #85 exclusion's loop guard
  (`skip= depth sid=` at depth ≥ 2); a file-trigger spawn stays depth 0.
- **Part B** — `spawnPlanner` RETURNS the new sid (null on every failure path;
  the `spawn-fail=` lines are unchanged). A SUCCESSFUL spawn STICKY-deactivates
  the TRIGGER (`deactivate= sid=` line; a failed spawn changes nothing) and
  `routeScopedIdle` skips the deactivated trigger right after the scope
  recompute (`skip= deactivated sid=` — no send, no re-spawn; the session stays
  manually usable). The flag records the trigger's user-message count at
  deactivation and clears ONLY on a NEW user message carrying an own-line ON
  toggle.
- **Part C** — at init (the factory call) the plugin RESTORES the in-memory
  depth map + deactivation flags from its own `auto_resume.log`: each
  `route= restart spawn sid=X` line paired with the following `spawn= sid=Y`
  → deactivated(X) + depth(Y)=depth(X)+1; an unpaired `spawn=` → depth 0; run
  ONCE per process (best-effort, no log / unreadable → nothing restored).

## Measured verification (standard gate, run ONCE)
- **Probe** `.opencode/plugin/probes/handover_probe.mjs`: `PROBE handover:
  241/241 PASS` (matches the 241/241 baseline — no probe expectation shifted,
  so no probe pins updated).
- **ALL 10 smokes** in `.opencode/plugin/tests/`: auto_resume **118/118** (was
  102/102 — the old #85 spawned-exclusion pins re-pinned to the new behavior +
  the proposal's acceptance pins 1-7 added), block_transfer.sandbox 52/52,
  block_transfer 22/22, compact_memory 57/57, context_recovery ALL PASS,
  ctx_gauge 3/3, gauge_core ALL PASS, intercept_observer 39/39, loop_log 24/24,
  submit 20/20.
- **pytest** `./.venv/Scripts/python.exe -m pytest -q`: **459 passed, 1 warning**
  (the known #10 coroutine warning — matches baseline).
- **ruff** `./.venv/Scripts/ruff.exe check --select F .`: **All checks passed**
  (F=0).

## TODO entries (same commit)
- `TODO.md` #90 → **LANDED** (dense entry; the commit hash is recorded by the
  planner in its follow-up bookkeeping commit — NOT written here).
- `TODO.md` #87 → **closed** one-liner (subsumed by #90); its FULL entry text
  appended to `todo_records.md` FIRST (new dated group heading, plan11 worker),
  with a `**Closed:**` note explaining the Part A resolution.

## Commit subject (this commit)
`auto_resume #90 LANDED: spawned successors inherit Autorun state + trigger deactivates (Parts A+B+C)`

## Deliberately not done
- The file-trigger spawn path is UNCHANGED (no source session → no lineage
  parent → depth 0; a content own-line toggle is still respected) — per
  proposal §Part A.4 and the DO-NOT-touch list.
- No removals of deactivated/commented-out alternative implementations.
- No behavior change beyond the proposal.
- Did NOT touch the DO-NOT-touch set: `compact_memory.ts`, the gauge plugin,
  `.opencode/maintainer/**`, `opencode.jsonc`, the proposal file,
  `.opencode/agent/prompts/**`.
- Excluded from this commit the files modified by other concurrent roles
  (`.opencode/maintainer/ideas/ideas.md`, `.opencode/maintainer/my_todos.md`,
  `.opencode/maintainer/inbox_planner/2026-09-23_15-46.md`,
  `.opencode/agent/agent_feedback.md`,
  `.opencode/loop/autorun-2026-09-21_15-33/loop_log.md`) — they are not part of
  this task.
- LIVE acceptance is pending the next host restart (the running host is
  pre-#90): the post-restart planner verifies the successor in-scope + the
  trigger untouched from `auto_resume.log` (proposal §Acceptance, live item).
