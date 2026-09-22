# Task spec — TODO #80: auto_resume fix (approved design)

**Worker:** worker_Q3S_110K_mtp. **Branch:** stay on the current checkout
(`opencode_test` — verify with `git branch -v` before committing).

## Context (planner-verified facts — do not re-derive)
- The plugin is DEACTIVATED: it lives at `.opencode/plugin/deactivated/auto_resume.ts`
  and is not in the live config. It must stay deactivated.
- Root cause (proven, DB + code): the Unit 2 `promptAsync` (L387) + Unit 4 (L643)
  omit the `agent` field → the server defaults to "build" → the injected turn
  runs as Build → system-prompt change → whole prompt-cache invalidation.
  The Unit 3 spawn (L432) passes `agent: PLANNER_AGENT_ID` correctly — use it
  as the pattern.
- `session.agent` (DB) tracks the LAST prompt's agent — do NOT use it as the
  agent source (proven lock-in: planner-6's record = "build").
- `spawned` Map (L194): populated ONLY by `spawnPlanner` (L438), checked at the
  scope verdict (L614: `spawned.has(sid) || userHasMarker(msgs)`).
- `recoveryCount` (L182, init L249, cap check L631-633): reset on every fresh
  busy (L722) → the cap is unreachable while the plugin keeps injecting
  (live: 4× `attempt=1`).
- The `surface=` one-shot init probe: L795-805 (`log("surface= " + …)` at L805).
- Smoke suite: `.opencode/plugin/tests/auto_resume.smoke.mjs` — 63 checks green
  (eaef397).

## Changes (ordered)
1. **Agent preservation** — the Unit 2 (L387) + Unit 4 (L643) `promptAsync`
   bodies carry an explicit `agent`:
   - scoped sessions (`w.scope === "planner"`): `PLANNER_AGENT_ID`;
   - other sessions: the first user message's `info.agent` from the existing
     `messages()` fetch. If no user message carries an agent field → omit the
     field (server default) and log one line.
2. **Recovery-cap semantics** — the cap is per-session cumulative: injected
   (plugin-generated) recovery prompts do NOT reset `recoveryCount`; only a
   genuine (non-injected) fresh busy cycle resets it (L722). Cap value stays
   2. How you distinguish injected vs. genuine is your call (e.g. track
   injected sids, or match the injection prefix).
3. **Scope verification** — the 2026-09-22 mis-scoping (Unit 4 injected 5× on
   a direct session with no user marker and not in `spawned`:
   ses_f39d250e9ffeheip2FVEeY5Fk6, 23:40-23:58) is NOT reproducible from the
   committed code (all 15 user text parts checked). In your handover state
   EITHER (a) a code-level explanation + fail-safe fix, OR (b) the evidence +
   your hypothesis (e.g. mid-window running variant / SDK shape). No forced
   code change for (b).
4. **`surface=` version identifier** — the `surface=` init line (L805) carries
   an identifier of the running code version so future incidents are
   attributable to a code state. Mechanism is your call (content hash / short
   git hash / version constant) — must be cheap and never throw.

## Smoke (extend the existing suite)
New checks on top of the 63:
- the Unit 2 injection body carries `agent` — scoped: `PLANNER_AGENT_ID`;
  unscoped: first user message's agent;
- the Unit 4 injection body carries `agent`;
- an injected recovery does NOT reset the cap: two consecutive injected
  busy/idle cycles → cap reached (attempt 2, no further injection); a genuine
  user prompt between → reset;
- the `surface=` line carries the version identifier;
- a scope=none session ends idle untouched (strengthen the existing check
  with the mis-scoping scenario if change 3 yields a code fix).

## Definition of done
- Smoke suite green (the 63 + the new ones); repo commit gate per
  `repo_commands.md` green (probe / pytest / ruff).
- The plugin stays deactivated (in `deactivated/`, not added to opencode.jsonc).
- `TODO.md` entry #80 status line updated: "implementation LANDED (commit
  <hash>); live acceptance pending re-activation (maintainer call)".
- Handover `.opencode/agent/handover/handover_task_to_planner.md`: what
  changed, the item-3 verdict (explanation or evidence + hypothesis), smoke
  count, gate result, commit hash, deliberately-not-done list.
- ONE commit: code + smoke + TODO.md + handover files (commit routine).

## DO-NOT-touch
- re-activating the plugin; anything under `.opencode/maintainer/**`;
- the FST product code (plugin-only task);
- live opencode instances (no live listeners — smoke only);
- `.opencode/agent/prompts/**` (edit-deny — you lack access there; report, don't work around).

## Baselines
- Smoke 63/63 (eaef397); branch `opencode_test` @ 0273249; gate baseline per
  `repo_commands.md` (probe 241/241, pytest 459+1w, ruff F=0).
