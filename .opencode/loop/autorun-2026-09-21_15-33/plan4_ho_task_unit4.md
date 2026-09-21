# Task spec — Auto-resume UNIT 4: planner liveness watchdog

Worker: `worker_Q3S_160K` · Iteration: plan4 (looprun autorun-2026-09-21_15-33),
worker-5. Design source (APPROVED): `.opencode/proposals/approved/2026-09-21_opencode-
auto-resume-plugin.md` — the Unit 4 section (lines 92-121) + shared architecture
rules (lines 40-53) BIND. Builds on Units 1-3 as landed (`4b1a965`).

## Goal

On a planner-scoped session going idle (or `session.error`), route by the last
assistant message: recognized `action:` line → `stop`/`ask_maintainer` left
alone, `resume`/no-line → queued continue prompt (backoff, cap 2), `restart`
(or cap exhausted) → successor check → `spawnPlanner` (Unit 3). Smoke-verified
here; live acceptance by the planner after the next host restart.

## Verified facts (planner-measured 2026-09-21 — do NOT re-derive)

- `client.session.messages({ path: { id } })` — sdk.gen.d.ts:170;
  `SessionMessagesData` (types.gen.d.ts 2209-2222: path `{id}`, query
  `{directory?, limit?}`, url `/session/{id}/message`); 200 = `Array<{info:
  Message, parts: Array<Part>}>` (2234-2242). `Message = UserMessage |
  AssistantMessage` with `role: "user" | "assistant"` (types 42/101/128);
  text parts per the established smoke pattern. NOTE: `messages` (list) was
  NOT among the Unit 1 surface candidates (the singular `message` = the
  single-fetch endpoint, sdk.gen.d.ts:178 — different thing).
- The looprunner's launch message carries the literal marker `<|autonom|>`
  (measured in this planner's own launch message; the looprunner prompt
  defines it). Direct/interactive sessions never do.
- Unit 3 `spawned` map (sid → epoch) exists in `auto_resume.ts` (module-level,
  self-marks the plugin's own spawns); Unit 3 `spawnPlanner(startPrompt)` is
  module-internal, called from the tick funnel.
- The Unit 2 `statusOf` shape fix is LANDED (`4b1a965`) — `session.status`
  busy/idle now arms correctly; the Unit 2 `watches` map carries
  `lastActivityAt` (stamped on assistant `message.updated`).
- Post-compaction protocol file: `.opencode/agent/prompts/agent_readme_post_
  compaction.md` (exists, verified).
- Baseline at HEAD `4b1a965`: probe 235/235, pytest 459+1w, ruff F=0, full
  smoke suite green (auto_resume 40/40).

## Design (locked — a deviation is reported, not self-decided)

1. **Surface:** add `messages` to `SESSION_CANDIDATES` (live typeof verdict
   pending; the smoke surface pin gains it).
2. **Scope (planner-scoped sessions):** a sid is scoped iff (a) it is in the
   `spawned` map, OR (b) ANY of its user messages (fetched via
   `client.session.messages`) contains the literal `<|autonom|>`. Cached on
   the watch: `scope: "planner" | "none" | "unknown"` (fetch pending/failed →
   unknown, re-check next idle; fail-safe = no action). Non-scoped sessions
   are NEVER acted on.
3. **Trigger:** scoped session `session.status` idle (via `statusOf`) or
   `session.error` → route on the next tick (the 5s funnel stays the only
   decision+send funnel; events only set state). Track `session.created`
   events (sid → epoch) for the successor check.
4. **Routing (per scoped idle, one decision per idle cycle):** fetch the
   session's messages (fail-safe: no action, `err=` line on failure); no
   assistant messages → no action. Scan the LAST assistant message's text
   parts for `action:\s*(restart|resume|stop|ask_maintainer)` (last match
   wins):
   - `stop` / `ask_maintainer` → NO send, log `route= stop|ask sid=…`.
   - `resume` or NO recognized line → CONTINUE prompt (text below),
     `recoveryCount++` (cap 2 per idle cycle; reset on fresh busy), log
     `recovery= sid=… attempt=N`.
   - `restart`, or cap exhausted with still no line → SUCCESSOR CHECK: a
     different sid in `session.created` tracked since the closing session's
     `lastActivityAt` → `skip= successor sid=…`; else `spawnPlanner`
     (RESTART prompt below) + log `route= restart spawn sid=…`.
5. **Prompt texts (locked, queued `promptAsync`, never synchronous):**
   - CONTINUE: `[auto-resume unit 4 — planner liveness watchdog, session
     ${sid}] Your last turn ended without a recognized action: line
     (compaction, sudden stop, or protocol gap). Follow .opencode/agent/
     prompts/agent_readme_post_compaction.md — re-read the named head files,
     rebuild from the committed state (git log + NAP + TODO), and continue the
     current unit or close it with an action: line.`
   - RESTART (the Unit 3 spawn start prompt): `<|autonom|>` + a short block:
     run autonomously; (auto-resume unit 4 restart branch: the previous
     planner closed with `action: restart`); your iteration number = the
     largest `planner-N` in the current loop folder's `loop_log.md` plus one
     (verify from the log; the counter-mismatch rule applies); rebuild reality
     from committed state (git log, NAP, TODO.md) and continue per your
     planner prompt's autonomous mode.
6. **Overlap-era caveat (document, don't solve):** the looprunner ALSO reacts
   to `action: restart` — the successor check + the 5s tick grace window
   mitigate double-spawn; residual race accepted until the maintainer retires
   the looprunner (his call). Note it in the surface-report section.
7. **Fail-safe:** every section try/catch; the tick never rejects; one
   `err=` line per failed cycle per sid (no log spam).

## Definition of done

- All items landed; standard gate GREEN: probe 235/235, pytest 459+1w, ruff
  F=0; FULL smoke suite run (every `*.smoke.mjs` in `.opencode/plugin/tests/`).
- New UNIT 4 smoke section (~10 checks, mocked `client.session.messages`
  scripted per sid): stop/ask → zero sends; restart w/o successor → spawn;
  restart w/ successor (`session.created` first) → skip; no-line → continue
  attempt 1; second idle → attempt 2; third idle cap-exhausted → restart
  spawn; non-scoped (no marker, not spawned) → zero sends; `spawned`-map scope
  routes without a fetch; `messages()` throwing → no action, no throw.
  Existing 40 checks stay green.
- Surface report `.opencode/agent/knowledge/opencode-plugins/auto-resume-unit1-
  surface-report.md` — append a brief UNIT 4 section (the `messages` endpoint
  facts, the overlap-era caveat).
- `TODO.md` #75 — status line: Unit 4 LANDED + smoke-verified; live
  acceptance PENDING the next host restart (the four acceptance cases in the
  proposal lines 138-142).
- One commit (code + smoke + surface report + TODO + handover files); summary
  to `.opencode/agent/handover/handover_task_to_planner.md` (measured gate
  numbers verbatim, commit hash, deliberately-not-done list).

## DO-NOT-touch

- Units 1-3 behavior (except the `SESSION_CANDIDATES` addition above).
- The tick funnel structure, the `spawnPlanner` body, Unit 2 constants.
- The probe (pins no auto_resume shape — if you believe a pin is needed,
  `todo_inbox.md`; do NOT build one). `.opencode/maintainer/**`, live
  `opencode.jsonc`.
