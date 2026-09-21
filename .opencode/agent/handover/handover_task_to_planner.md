# Worker summary — auto-resume UNIT 4: planner liveness watchdog

Worker: `worker-5` (`worker_Q3S_160K`), session `ses_f3af705fdffeRiYr9H7FflN0o7`,
2026-09-21, plan4 (iteration 5, looprun autorun-2026-09-21_15-33, AFK).
Task spec: `.opencode/agent/handover/handover_task.md` (committed at b1ae759).

## What changed

One commit on `opencode_test` (parent `b1ae759` — this summary file rides
in that same commit; subject: "Auto-resume UNIT 4: planner liveness
watchdog (scope + action: routing + restart branch)"):

- `.opencode/plugin/auto_resume.ts` — UNIT 4 per the locked design:
  - **Surface:** `messages` added to `SESSION_CANDIDATES` (the plural
    list endpoint — distinct from the singular `message` single-fetch;
    the live typeof verdict lands in the surface-report supplement).
  - **Scope:** a sid is planner-scoped iff it is in the Unit 3 `spawned`
    map (no fetch) OR any of its user messages carries the literal
    `<|autonom|>` (fetched via `client.session.messages({path:{id}})` —
    ONE round trip serves both the scope marker scan and the routing
    scan). Cached per watch: `scope: "planner" | "none" | "unknown"`
    (fetch pending/failed → unknown, re-checked next idle; fail-safe =
    no action). Non-scoped sessions are never acted on.
  - **Trigger:** scoped session `session.status` idle OR
    `session.error` → `idlePending` latch (ONE decision per idle cycle;
    a fresh busy resets `recoveryCount` and clears the latch).
    `session.created` events tracked (sid → epoch, `props.time.created`
    when a number else observe-time) for the successor check.
  - **Routing** (next tick; the 5s funnel stays the only decision+send
    funnel) on the LAST assistant message's text parts, regex
    `action:\s*(restart|resume|stop|ask_maintainer)` (last match wins):
    - `stop` / `ask_maintainer` → no send, `route= stop|ask sid=…`.
    - `resume` or no line → queued CONTINUE prompt (locked text naming
      `agent_readme_post_compaction.md`), `recoveryCount++` (cap 2 per
      idle cycle; reset on fresh busy), `recovery= sid=… attempt=N`.
    - `restart`, or cap exhausted with still no line → SUCCESSOR CHECK
      (different sid tracked in `session.created` since the closing
      session's `lastActivityAt` → `skip= successor sid=…`; lastActivityAt
      null → fail-safe spawn) else `spawnPlanner` (RESTART prompt:
      `<|autonom|>` + iteration-counter rule + rebuild-from-committed-
      state block) + `route= restart spawn sid=…`.
  - **Fail-safe:** every section try/catch; the tick never rejects; one
    `err= sid=… <msg>` line per failed cycle per sid (no log spam).
  - Header comment: new UNIT 4 block + the overlap-era caveat
    (documented, not solved); the DELIBERATELY-ABSENT list updated.
  - Units 1-3 behavior unchanged except the `SESSION_CANDIDATES`
    addition; tick funnel structure, `spawnPlanner` body, Unit 2
    constants untouched.
- `.opencode/plugin/tests/auto_resume.smoke.mjs` — new UNIT 4 section
  (13 checks; `client.session.messages` scripted per sid; batch A fires
  all scenarios before one tick pass): stop/ask → zero sends + route
  lines; restart w/o successor → spawn (ONE create, agent start prompt
  carrying `<|autonom|>` + `loop_log.md` rule); restart w/ successor
  (`session.created` first) → skip, no second spawn; no-line → continue
  attempt 1 (locked text pinned); second idle → attempt 2; third idle
  cap-exhausted → restart spawn; non-scoped (no marker, not spawned) →
  zero sends, no route/recovery line, exactly one fetch; spawned-map
  scope (the UNIT 3 self-marked `ses_u3_new`, user msg carries NO
  marker) → routes as planner, attempt 1; `messages()` throwing →
  `err=` line, no action, no throw; send totals pinned (3 CONTINUE +
  2 RESTART spawns, nothing else touched). Surface pin updated (12
  candidates incl. `messages`; v1 mock carries it). `smokeSids` array
  extended for the live-log invariance check.
- `.opencode/agent/knowledge/opencode-plugins/auto-resume-unit1-surface-
  report.md` — appended `## UNIT 4 supplement`: the `messages` endpoint
  facts (sdk/types line refs, plural-vs-singular distinction, live
  typeof verdict pending), the implemented scope rule, the overlap-era
  caveat, the routing summary.
- `TODO.md` #75 — status line: Unit 4 LANDED + smoke-verified; LIVE
  ACCEPTANCE PENDING the next host restart (the four acceptance cases,
  proposal lines 138-142).

## Measured verification (verbatim)

- `node .opencode/plugin/tests/auto_resume.smoke.mjs` →
  `AUTO_RESUME_SMOKE: ALL PASS (53/53)` (40 existing + 13 new).
- FULL smoke suite (every `*.smoke.mjs` in `.opencode/plugin/tests/`):
  all 10 GREEN — auto_resume 53/53, block_transfer.sandbox 52/52,
  block_transfer 22/22, compact_memory 47/47, context_recovery ALL
  PASS, ctx_gauge 3/3, gauge_core ALL PASS, intercept_observer 39/39,
  loop_log 24/24, submit 20/20.
- `node .opencode/plugin/probes/handover_probe.mjs` →
  `PROBE handover: 235/235 PASS`.
- `./.venv/Scripts/python.exe -m pytest -q` → `459 passed, 1 warning in 2.10s`.
- `./.venv/Scripts/ruff.exe check --select F .` → `All checks passed!`

## Discrepancy found (planner curation)

- The Unit 3 status line in TODO #75 still records "one pre-existing red
  smoke OUT OF SCOPE: block_transfer.sandbox stale description pin" —
  this run measured `BT-SANDBOX-SMOKE: ALL PASS (52/52)`. That pin must
  have been fixed since (not by this task; nothing in this commit
  touches it). The todo_inbox entry (2026-09-21) can likely be closed —
  flagged here, not edited (curator territory).

## Deliberately NOT done

- Live acceptance (the four cases, proposal lines 138-142) — PENDING
  the next host restart; that is the planner's job.
- The overlap-era double-spawn race — documented in the header comment +
  surface report per spec item 6; NOT solved (maintainer's call re:
  retiring the looprunner).
- No probe pin for the auto_resume shape (spec DO-NOT-touch: the probe
  pins no auto_resume shape; I do not believe one is needed — no
  todo_inbox entry filed, no pin built).
- `session.error` trigger is IMPLEMENTED (sets the same idlePending
  latch) but not smoke-pinned — it is not in the spec's smoke case
  list; the latch it sets is pinned via the idle events.
- The live `messages=function` typeof verdict — pending the next host
  restart (noted in the surface-report supplement).
- No changes to `.opencode/maintainer/**` or the live `opencode.jsonc`
  (DO-NOT-touch); no edits to any other in-flight file (git status
  showed maintainer/planner files modified by other sessions — left
  untouched and uncommitted).

## Lessons

- The `glob` tool returned no matches for `.opencode/**` patterns
  (hidden-dir exclusion?) — `ls` via bash worked; logged to
  agent_feedback.
