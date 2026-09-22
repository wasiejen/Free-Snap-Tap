# Task: #85 part 2 — current session agent+modelID in injected bodies + dead-mark on failed send

Goal: fix the auto_resume UnknownError (a plugin-caused stale agent ID) + stop the
spurious fallback spawn. Two changes in `auto_resume.ts`, both verified below.

## Verified spec-time facts (do not re-derive)
- Root cause: `PLANNER_AGENT_ID = "planner_Q3S_160K"` (auto_resume.ts L158,
  hardcoded) no longer matches the live roster (`planner_Q3S_170K`, the only
  planner agent). Every planner-scoped CONTINUE (L805-808) and spawn (L512/L519)
  sends a non-existent `agent` → `promptAsync`/`createUserMessage` throws
  `UnknownError`. Confirmed: 3 stale refs in auto_resume.ts (L76/L155 comments +
  L158 constant); no other stale agent/model hardcodes in plugin/tool code.
- Sequence (maintainer's live observation, matches the code): no-`action:`-line
  idle → 2 CONTINUE attempts (cap `MAX_RECOVERY_ATTEMPTS`=2) both fail
  (`send-fail=`) → cap exhausted → no successor → ONE `route= restart spawn`
  (a new session, not a loop — part 1 removed the loop).
- `resolveInjectAgent` (L682-699): planner-scoped → hardcoded `PLANNER_AGENT_ID`
  (no fetch); non-planner → first-user-message agent (`firstUserAgent`,
  L665-672). Neither is the CURRENT session agent+model.
- The last assistant message's `info.agent` + `info.model` is the session's
  CURRENT working agent+model (reflects mid-session switches); the per-tick
  fetch (L762-770) already retrieves the messages → no extra round-trip.
- Baseline: auto_resume smoke **97/97**, probe **241/241**, pytest 459+1w,
  ruff F=0.

## The change (WHAT — the HOW is yours inside the DoD)
1. **Current agent+modelID in injected bodies (root-cause fix).** Replace the
   hardcoded `PLANNER_AGENT_ID` for injected bodies (CONTINUE L805-808, spawn
   L512/L519) with the session's CURRENT agent + modelID, resolved at fire-time
   (only when a send is actually queued, NOT per-tick):
   - Source: the last assistant message's `info.agent` + `info.model` (the
     session's working agent+model; reflects mid-session switches; preserves the
     resume cache; works for ANY agent, not just `planner_*`).
   - For a SPAWN: the current agent+modelID of the SOURCE session (the one being
     replaced) carries over to the successor.
   - Fallback order (never a planner constant): last-assistant `info` → if
     absent, look up the agent in `opencode.jsonc` → if still absent, send NO
     `agent`/`model` field (host default applies).
   - Remove the now-dead `PLANNER_AGENT_ID` constant (L158) + update the
     L76/L155 comments.
   - The `opencode.jsonc` lookup is cached (not re-read every tick) and read
     only when the fallback fires.
2. **Dead-mark on a failed send (safety).** When a CONTINUE send fails
   (`send-fail=`, L812-813), dead-mark the session for the current idle cycle
   (cleared on a fresh busy — the same reset axis as `recoveryCount`). A
   dead-marked session:
   - skips the remaining recovery retries this idle cycle, AND
   - skips the cap-exhaustion fallback spawn (L819-826) — no doomed successor.
   - A dead model (session never goes busy) → the mark persists (no fresh busy)
     → no 5s retry loop.

## Definition of done (measurable)
- A CONTINUE/spawn body carries the session's current `agent` + `model`
  (verified: a session switched to a non-planner agent → the injected body
  carries that agent+model, not a planner constant).
- A failed CONTINUE dead-marks the session: the next tick logs the dead-mark
  skip, and the cap-exhaustion branch does NOT spawn (no `route= restart spawn`
  for a dead-marked session).
- A fresh busy clears the dead-mark (the next idle cycle retries normally).
- auto_resume smoke green (new checks: current-agent+model body, dead-mark skip,
  no-fallback-spawn, fresh-busy-clear) + the existing 97 checks still pass.
- Full gate green: probe 241/241, all plugin smokes, pytest 459 passed +
  1 warning, ruff F=0.
- TODO.md: #85 → "part 2 (current-agent+modelID + dead-mark) LANDED" (the hash is
  recorded by the planner in the follow-up bookkeeping commit — do NOT write your
  own hash in the same commit).

## DO-NOT-touch
- Do NOT restart opencode (changes take effect on the next restart; the live
  plugin keeps running the old code).
- The maintainer's temp fix `0f192e5` (compact_memory), the live
  `.opencode/temp/compact_budget.json`, `.opencode/maintainer/`,
  `.opencode/agent/prompts/`, the live `opencode.jsonc`.
- The #82 scope-toggle logic (built in part 1; build on it, don't break it).
  `compact_memory.ts` + `context_recovery.ts` (LANDED; untouched here).
- `PLANNER_AGENT_ID` is ONLY for injected bodies — keep any other use intact
  (verify L512/L519 are the spawn-body uses).

## Reading discipline (his note, priority.md 2026-09-22_20-42)
Targeted reads ONLY of the named auto_resume.ts regions (L155-175 the constant,
L480-560 the spawn, L655-700 the agent resolution, L780-830 the unit-4 routing) +
the auto_resume smoke. No careless large greps. Use node for arithmetic.

Worker: `worker_Q3S_170K` (auto_resume.ts current-agent+modelID + dead-mark +
smoke updates).
