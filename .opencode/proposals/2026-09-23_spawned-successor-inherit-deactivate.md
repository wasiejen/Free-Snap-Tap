# Proposal: plugin-spawned successors inherit the trigger's Autorun state + the trigger deactivates (TODO #90, subsumes #87)

Status: DRAFT (planner-11, 2026-09-23, ses_f318f0d77ffer6kIwqiNvE1xau) — awaiting maintainer
approval BEFORE implementation (observable behavior change; #90 acceptance).

## Problem

His priority.md item 2026-09-23_14-25: a session the auto-resume plugin spawned via
`action: restart` should (1) be tracked (not scope "none"), (2) inherit the trigger
session's Autorun/Direct state, (3) leave the trigger deactivated to prevent an
unintentional resume — with the #85 unbounded-spawn loop prevention preserved.

Current behavior (measured, `.opencode/plugin/auto_resume.ts`, build v=d2b9d510):
- `scopeVerdict` (L807) checks the `spawned` self-mark FIRST → a self-spawned
  successor is scope "none" — never recovered, never re-routed. Live consequence
  (TODO #87): the self-spawned planner-8 session went idle 3× (once after a
  self-compaction close WITHOUT an action line) and the plugin never routed it —
  the L3 self-compaction-continue protocol has no live executor in plugin-driven
  mode; only a maintainer message rescued it.
- The exclusion existed as the #85 part-1 loop prevention ("a freshly-spawned
  successor must not be re-triggered"). The #85 part-2 dead-mark (a failed
  CONTINUE dead-marks the idle cycle; the cap-exhaustion fallback spawn is
  skipped) already breaks the measured failure loop (UnknownError at
  createUserMessage) — the exclusion is no longer the only (or the best) guard.
- The trigger session is NOT re-routed today only by accident: its idle decision
  is consumed (`idlePending` cleared at L1045) and no further idle event arrives
  for a dead session. If the maintainer ever pings the old session, the plugin
  re-scopes it (agent test) and — after a host restart, when the in-memory
  `createdSessions` map is lost — the successor check (L1099) misses the
  successor and spawns a DUPLICATE branch. This is the "unintentional resume"
  his item guards against.
- `restartText()` (L736-743) starts with `<|autonom|> Run autonomously. (...)`
  — the marker sits MID-LINE, so the #82 own-line rule does NOT count it as a
  toggle: a restart-spawned successor derives scope ONLY via the agent-field
  test (planner prefix). For a scope=autorun trigger running a NON-planner agent
  (the #82 generalization — his stated goal: run other agents in a loop), the
  successor falls through to "none" and stalls — the #87 bug, generalized.

## Design (three independently approvable parts)

### Part A — the successor is tracked and inherits the trigger's state

1. **Remove the `spawned` exclusion from `scopeVerdict`** (L807). The `spawned`
   map (L290, set at L663) is REPURPOSED as the lineage-depth map
   (`Map<successorSid, depth>`): the restart/cap-exhaustion spawn stores
   `depth(trigger) + 1`; a trigger session that was never plugin-spawned is
   depth 0; a file-trigger spawn (Unit 3 manual, no source session) is depth 0.
2. **`restartText()`: the marker becomes an EXACT OWN-LINE** (line 1 =
   `<|autonom|>` alone, the prose moves to line 2). Then EVERY restart-spawned
   successor derives scope "autorun" from history via the existing #82
   last-toggle-wins scan — RESTART-SAFE (no in-memory state needed: after a host
   restart the same scan over the successor's first user message gives the same
   verdict). The trigger's current agent+model already rides the spawn body
   (#85 part 2, `resolveInjectIdentity`) — unchanged. A scope=planner trigger
   (no own-line toggle) thus "transmits" its state as autorun-scoped: behaviorally
   identical today (routeScopedIdle treats "planner" and "autorun" alike), and
   the loop self-perpetuates (the successor's own restart spawn carries the
   same text). A Direct (OFF) trigger can never reach the restart branch
   (scope "none" is never routed) — no OFF marker needed.
3. **The replacement bound (mandatory — the exclusion's loop-prevention role):**
   a LINEAGE-DEPTH CAP on the cap-exhaustion fallback spawn (the L1098-1107
   branch): a session at depth >= N does not spawn; `skip= depth sid=` line.
   Recommended N = 2 (original → successor → last; a chain of cap-exhausted
   empty sessions stops at the 3rd generation and the loop stalls visibly for
   the maintainer). After a host restart the lineage map is empty → all depth 0
   (a fresh host lifetime, bounded again). The #85 part-2 dead-mark + the
   per-session cap (2 attempts) stay untouched — the measured #85 failure loop
   (failing sends) is still broken by the dead-mark.
   - Why a depth cap and not nothing: removing the exclusion un-bounds a chain
     where each successor's recovery sends SUCCEED but produce no action line
     (e.g. repeated hard stops): gen1 → 2 recoveries → cap → gen2 → 2 → cap →
     gen3 → ... The #85 part-2 dead-mark does not catch this case (the sends
     don't fail), and the exclusion was what stopped it.
4. The file-trigger spawn path is unchanged (no source session; the maintainer
   may put an own-line toggle in the trigger content if he wants autorun).

**Fixes #87 directly:** a self-spawned successor going idle (e.g. the
self-compaction close without an action line) is now recovered (`recovery=`
continue) — the L3 continue protocol gets its live executor.

### Part B — the trigger deactivates after handing off

1. `spawnPlanner` RETURNS the new sid (string) or null (currently void; all
   failure paths already `spawn-fail=` log). At the restart branch (L1098-1107):
   on a successful spawn, set a STICKY `w.deactivated = true` on the TRIGGER's
   watch (+ a `deactivate= sid=` log line); on a failed spawn, nothing changes
   (current semantics).
2. `routeScopedIdle` checks the flag right after the scope recompute (L1035-1039),
   before the dead-mark/action handling: `skip= deactivated sid=` line, no send,
   no re-spawn. The session stays manually usable (a maintainer ping still gets a
   normal model response — the plugin simply never injects or spawns from it).
3. The flag clears ONLY on an explicit maintainer re-engage: at the moment of
   deactivation record the trigger's user-message count (the fresh fetch is
   already in hand); on a later decision, if a NEW user message arrived AND it
   carries an own-line ON toggle (`<|autonom|>`/`<|Autorun|>`), the flag clears
   (explicit intent wins; the successor check then prevents duplication while
   in-memory state is alive). A plain ping without a toggle keeps the flag.

### Part C — restart-safe restoration (OPTIONAL — his call)

Gap: after a host restart the lineage map + deactivation flags are in-memory
only. A maintainer ping to a replaced trigger then re-scopes it, the successor
check misses (empty `createdSessions`), and the restart branch spawns a
DUPLICATE branch (one-time cost — afterwards the successor check catches it).

Recommended fix (~20 lines): at init (the factory call, L1262) the plugin reads
its own `auto_resume.log` (it already reads the log dir for the spawn title)
and restores: each `route= restart spawn sid=X` line paired with the following
`spawn= sid=Y` line → deactivated(X) + lineage(Y) = lineage(X) + 1; unpaired
`spawn=` lines → depth 0 (file-trigger). Bounded parse (the log lives in the
temp dir; parse the whole file or the tail — worker's discretion).
Alternative: accept the gap (a duplicate spawn is recoverable by hand).

### Interactions / notes

- Unit 2 (the passive ctx-line nudge) is scope-gated via the same
  `scopeVerdict` — the successor automatically inherits the nudge too (the
  "same Autorun/Direct setting transmitted"). A deactivated trigger that the
  maintainer drives by hand still gets the nudge suffix (informational only —
  accepted, not gated).
- `TODO #87` is SUBSUMED: close it when #90 lands (its options (a)-(d) are
  resolved by Parts A+B; option (b)'s "committed progress" idea is replaced by
  the depth cap).
- The #85 smoke pins that assert "a self-spawned successor is scope none" must
  be RE-PINNED to the new behavior (successor in-scope autorun; the loop guard
  pins move to the dead-mark + depth-cap cases).

## Acceptance

Smoke pins (auto_resume.smoke.mjs, standard gate otherwise unchanged):
1. A restart spawn from an autorun-scoped, NON-planner-agent trigger → the
   successor's verdict = "autorun" (`scope=` line) and the successor is
   RECOVERED after an idle without an action line (`recovery=` line) — the
   #87 stall case, inverted.
2. `restartText()` line 1 = exact own-line `<|autonom|>` (byte pin); with the
   in-memory maps emptied, the successor's first user message alone derives
   scope "autorun" (restart-safe derivation pin).
3. Trigger after a successful spawn: the next idle cycle → `skip= deactivated`
   (no `recovery=`, no `route=`); a ping without a toggle stays deactivated; a
   ping WITH an own-line ON toggle clears the flag → routed again (and the
   successor check yields `skip= successor`).
4. Depth cap: a depth-2 session at cap exhaustion → `skip= depth` (no spawn);
   a depth-1 session spawns its depth-2 successor.
5. A failed spawn (create no-id / promptAsync throw) → NO deactivation of the
   trigger.
6. Existing pins stay green (dead-mark, cap-exhaustion skip, #85 part-2/3);
   the old spawned-exclusion pins are re-pinned per (1).
7. The file-trigger path is unchanged (no lineage parent; a content toggle is
   respected).

Live (post-restart, maintainer confirm): the next restart cycle logs the
successor in-scope + the trigger untouched; the maintainer's 14-25 expectation
holds end-to-end.

## Suggested scope

`.opencode/plugin/auto_resume.ts` (scopeVerdict L807, `spawned` map L290/663,
`restartText` L736, `spawnPlanner` L615, `routeScopedIdle` L1012, the restart
branch L1098, the factory L1262); `.opencode/plugin/tests/auto_resume.smoke.mjs`;
TODO #90/#87 status; the NAP. Worker per the live roster (verify before launch).

## Status

DRAFT — awaiting his approval (Parts A+B are the core; Part C is his call:
log-restore or accept the gap). Implementation only after approval (the #90
acceptance criterion).
