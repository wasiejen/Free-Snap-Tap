# Worker summary — #85 part 2 (IN PROGRESS at this commit)

Task spec: `handover_task.md` (#85 part 2 — current session agent+modelID in
injected bodies + dead-mark on failed send). Branch: `opencode_test`.

## What changed

`.opencode/plugin/auto_resume.ts`:
1. **Root-cause fix — current agent+modelID in injected bodies.** Removed the
   dead `PLANNER_AGENT_ID` constant (`planner_Q3S_160K`, stale vs the live
   roster `planner_Q3S_170K`) and its `resolveInjectAgent` planner branch +
   the now-dead `Watch.userAgent` cache. New fire-time resolution
   `resolveInjectIdentity(msgs)` (NEVER a planner constant):
   (1) last assistant message's `info.agent` + `info.model` (the current
   working pair — reflects mid-session switches);
   (2) if absent: first user agent (working agent) + that agent's configured
   model from `opencode.jsonc` — new string-aware JSONC parser (comments +
   trailing commas, verified against the live file), module-level CACHED
   agents map, read only when the fallback fires;
   (3) if still absent: no agent/model fields (host default) +
   `agent-omit=` line.
   Applied to: unit-2 self-compact (fire-time `fetchMsgs` — only when a send
   is actually queued, never per tick), unit-4 CONTINUE (same fresh routing
   fetch — no extra round trip), and the spawn (`spawnPlanner(startPrompt,
   sourceMsgs?)` — the Unit-4 restart/cap-exhausted branch passes the SOURCE
   session's fresh fetch, so the successor keeps the closing session's
   current agent+model; the file-trigger spawn has no source → no
   agent/model fields → host default). `spawn=` line now carries the
   resolved agent/model bits.
2. **Dead-mark on a failed send (safety).** New `Watch.deadMarked`: set on a
   failed CONTINUE send (both `send-fail=` paths — the catch and
   promptAsync-missing), cleared on a fresh busy (same reset axis as
   `recoveryCount`; NOT cleared on an injected busy). A dead-marked session
   skips the remaining recovery retries AND the cap-exhaustion fallback
   spawn (early return with `skip= dead sid=` line — no doomed successor); a
   dead model (never goes busy) → the mark persists → no 5s retry loop.

`.opencode/plugin/tests/auto_resume.smoke.mjs`:
- Updated the one check that pinned the dead behavior: UNIT 3 trigger spawn
  now expects NO agent / NO model (host default — it has no source session).
- Added the sandbox `opencode.jsonc` fixture (comments + trailing commas on
  purpose) before the first fallback read (module-level cache).
- New `#85 part 2` section (8 checks): (a) CONTINUE body carries the
  session's CURRENT switched agent+model (not a planner constant); (a)
  restart spawn carries the SOURCE session's current agent+model; (a) JSONC
  fallback (working agent + configured model from opencode.jsonc); (b) a
  failed CONTINUE dead-marks (next tick logs `skip= dead`, no attempt 2, no
  send); (c) cap-exhaustion branch does NOT spawn for a dead-marked session
  (mark persists, no retry loop); (d) a fresh busy clears the dead-mark
  (normal retry, CONTINUE lands).
- New sids added to the live-log guard list.

`TODO.md`: #85 title + status → "part 2 (current-agent+modelID + dead-mark)
LANDED 2026-09-23" (no commit hash in this commit — planner records it).

## Measured verification (at this commit)

- **auto_resume smoke: 105/105 PASS** (existing 97 — the one stale
  trigger-spawn agent pin updated per the fix — + 8 new checks). Run:
  `node .opencode/plugin/tests/auto_resume.smoke.mjs` (300s timeout).
- TS import check clean (node 24 type-stripping, default export only).

## Still pending (next unit of this session)

- Full gate: handover_probe (expect 241/241), all other plugin smokes,
  pytest (expect 459 passed + 1 warning), ruff F=0.
- Final handover update (gate numbers) + final commit + friction check.

## What was deliberately NOT done

- No opencode restart (the live plugin keeps the old code until his restart).
- DO-NOT-touch list respected: temp fix 0f192e5, compact_budget.json,
  .opencode/maintainer/, .opencode/agent/prompts/, live opencode.jsonc
  (read-only for structure verification), #82 scope-toggle logic,
  compact_memory.ts, context_recovery.ts.
- `PLANNER_AGENT_ID` had no other uses (verified: only the injected-body
  paths — spawn body, spawn log line, resolveInjectAgent planner branch).
