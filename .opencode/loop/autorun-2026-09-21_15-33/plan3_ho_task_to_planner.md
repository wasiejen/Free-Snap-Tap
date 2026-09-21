# Worker summary — auto-resume UNIT 3: new-planner spawn helper

Worker: `worker-3` (`worker_Q3S_160K`), session `ses_f3b555033ffem2gI9qBct1JZwG`,
2026-09-21, plan3 (iteration 3, looprun autorun-2026-09-21_15-33, AFK).
Task spec: `.opencode/agent/handover/handover_task.md` (Auto-resume UNIT 3).

## What changed

One commit on `opencode_test` (parent `992c372` — this summary file rides
in that same commit; subject: "Auto-resume UNIT 3 ..."):

- `.opencode/plugin/auto_resume.ts` — UNIT 3 per the locked design:
  - `spawnPlanner(startPrompt)` — module-INTERNAL (no named export; the
    factory stays the ONLY export): `create()` (no args) → `res.data.id`
    (top-level `id` accepted defensively) → ONE queued `promptAsync`
    with `path.id` = the new sid, `body.parts[0].text` = the start prompt,
    `agent: "planner_Q3S_160K"`, **NO model field** (agent-configured
    model applies). Success → `spawned` map (sid → epoch self-mark for
    Unit 4) + `spawn= sid=… agent=planner_Q3S_160K` line. Every failure
    path (create missing / throw / no id, promptAsync missing / throw) →
    a `spawn-fail= …` line; the helper never throws outward.
  - Trigger funnel in the existing 5s tick (check runs first; events stay
    ARM-only): `.opencode/temp/auto_resume_spawn_trigger` (same dir as the
    log) — present + non-empty trimmed → ONE spawn attempt (module-level
    in-flight latch, no double-fire), then the file is renamed to
    `.consumed` **EVEN ON FAILURE**; empty trimmed → `spawn-fail= empty
    trigger` + consumed; absent → nothing. A best-effort `rename-fail=`
    line covers a rename throw (the latch is the double-fire guard).
  - `SESSION_CANDIDATES` gained `"create"` (one more `typeof` in the
    one-shot `surface=` line).
  - Header comment documents UNIT 3; "DELIBERATELY ABSENT" now says
    "(Unit 4 slots)".
- `.opencode/plugin/tests/auto_resume.smoke.mjs` — UNIT 3 section (7 new
  checks, same spy-client + real-tick pattern as Unit 2): (1) trigger
  present → one `create` + one queued `promptAsync` (path.id = created
  sid, `agent` pinned, NO model key, parts[0].text = trigger content,
  `spawn=` line, file renamed `.consumed`); (2) create throws → zero
  promptAsync, `spawn-fail=`, tick/handler survive, consumed; (3)
  promptAsync throws → `spawn-fail=`, survive, consumed; (4) no trigger
  file → zero create + zero promptAsync (regression pin); (5) second
  tick after consumption → no second spawn; (6) empty trigger →
  `spawn-fail= empty trigger`, no create/promptAsync, consumed; (7)
  surface pin updated — `create` in the `CANDIDATES` list, the v1 mock
  session, and the Unit 1 surface check (all eleven candidates).
- `TODO.md` — #75 status line: Unit 3 LANDED + smoke-verified, live
  acceptance PENDING, next = Unit 4 spec.
- `todo_inbox.md` — one new finding appended (see Discrepancies below).

## Measured verification (2026-09-21, all in this session)

- `node .opencode/plugin/tests/auto_resume.smoke.mjs` →
  `AUTO_RESUME_SMOKE: ALL PASS (39/39)` (32 existing + 7 new).
- `node .opencode/plugin/probes/handover_probe.mjs` → `PROBE handover:
  235/235 PASS` (UNCHANGED — the probe has zero auto_resume refs).
- `./.venv/Scripts/python.exe -m pytest -q` → `459 passed, 1 warning`.
- `./.venv/Scripts/ruff.exe check --select F .` → `All checks passed!`
  (F=0).
- Other smokes: block_transfer 22/22, compact_memory 47/47,
  context_recovery ALL PASS, ctx_gauge 3/3, gauge_core ALL PASS,
  intercept_observer 39/39, loop_log 24/24 (with its ANOMALY note about
  2 autorun folders — pre-existing, not mine), submit 20/20 — ALL green
  EXCEPT `block_transfer.sandbox.smoke.mjs` (one check red, see below).

## Discrepancies / findings

1. **Pre-existing red smoke, OUT OF SCOPE (not caused by Unit 3):**
   `block_transfer.sandbox.smoke.mjs` fails `description: housekeeping
   rule vs write/edit` (smoke line 53). Verified pre-existing by
   re-running with the Unit 3 changes stashed (fails identically at
   HEAD). Root cause: commit `ff4c2fc` (2026-09-18, maintainer) dropped
   the "Housekeeping rule … instead of write/edit" sentence from the
   `block_transfer` description ("prompt text, not contract text") but
   the smoke's description pin was never updated → stale pin. Full
   evidence + suggested fix appended to `todo_inbox.md` (2026-09-21
   worker-3 block). I did NOT touch block_transfer (DO-NOT-touch other
   tools for this task).
2. **Planner agent id re-verified per spec:** live `opencode.jsonc`
   lines 166-170 carry `planner_Q3S_160K` / `llama-swap/Qwen3.8-27B-Q3S-160K`
   — NO drift from the spec's verified facts.
3. **Defensive live-shape handling (no drift observed yet):** the spawn
   helper accepts `res.data.id` (static SDK shape) AND a top-level
   `id` (defensive fallback). The LIVE `create` response shape is not
   yet exercised in a live session (Unit 3 live acceptance runs after
   the next host restart) — noted here for the surface-report
   supplement per the spec's drift clause.
4. **Trigger content is passed TRIMMED** as the start prompt (spec:
   "non-empty trimmed → spawn once with the content as startPrompt" —
   the condition reads trimmed; a start prompt with leading/trailing
   whitespace is meaningless, so the trimmed text is sent). No smoke
   divergence (the smoke trigger carries no edge whitespace).

## Deliberately NOT done

- No config/registration change (the plugin auto-discovers; no new repo
  files — the trigger file lives in git-ignored `.opencode/temp/`).
- No probe change (probe 235/235 must stay unchanged — it does).
- No live acceptance (host restart needed — the planner runs it after
  the next restart per the DoD).
- No named export of `spawnPlanner` (module-internal by design; the
  `spawned` map is therefore not smoke-observable — the spec's 7 checks
  cover everything observable).
- Did not fix the block_transfer sandbox stale pin (out of scope —
  todo_inbox entry filed instead).
- Did not commit the pre-modified `loop_log.md` / `maintainer/ideas.md`
  (loop file / maintainer file — not mine to commit).

## TODO entries

- `TODO.md` #75 status updated (Unit 3 LANDED + smoke-verified; live
  acceptance PENDING; next = Unit 4 spec).
- `todo_inbox.md`: one new unnumbered finding (block_transfer sandbox
  stale description pin) for planner curation.

## Lessons

- The file tools on this host display absolute Windows paths with a `~`
  prefix in their results — purely cosmetic; verify with a relative-path
  grep when it surprises you (I did; all edits landed in the right file).
- Smoke variable names collide ACROSS unit sections in the same try
  block (Unit 2's `ok1`/`ok3`/`threw3` vs new Unit 3 locals) — prefix
  new sections' locals (`okS*`/`threwS*`) to keep node's module scope
  clean.
