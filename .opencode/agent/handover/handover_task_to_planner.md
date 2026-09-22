# Worker handover — #85 part 1: generalize the auto_resume unit-4 scope
STATUS: DONE — part 1 (scope) LANDED, full gate green, committed with this file.

## What changed
One theme (the spec, d1566eb): the auto_resume unit-4 scope is now
`real PLANNER sessions (always) ∪ sessions whose #82 `<|Autorun|>` own-line
toggle is ON (last-toggle-wins, ANY agent type)`, and freshly-spawned +
unmarked worker sessions are OUT of scope. The #85 unbounded-spawn loop
condition is gone: a self-spawned successor is never re-scoped as a
planner, so it can never be re-triggered on a later tick.

- `.opencode/plugin/auto_resume.ts`
  - **Scope verdict (`scopeVerdict`, new — replaces `userHasMarker`):**
    - self-spawned sids (the Unit 3 `spawned` self-mark) → **NEVER scoped**
      (the mark changed from an INCLUSION to an EXCLUSION — this was the
      exact mechanism that mis-scoped freshly-spawned sessions as
      `planner` in the #85 loop);
    - else the session's working agent — the FIRST user message's `agent`
      field (the DB `session.agent` mirror — VERIFIED 2026-09-22 against
      `opencode.db`: the `session`/`session_v2` tables carry an `agent`
      column, but the SDK `Session` type and the in-process plugin host
      (no `node:sqlite`, TODO #37) expose no session-level field, so the
      message field is the client-reachable source) is a PLANNER agent
      (prefix `planner_<model>` — survives model-generation renames, e.g.
      the live host's current `planner_Q3S_170K`);
    - else the last own-line toggle in the user history is ON (#82
      design, implemented here: `<|autonom|>` / `<|Autorun|>` both ON,
      case-insensitive, whole-line trim-exact only; OFF = `<|Direct|>`;
      last-toggle-wins; restart-safe — no in-memory state).
  - The verdict is RECOMPUTED from the fresh `messages()` fetch on every
    idle routing (last-toggle-wins can flip with a new user message);
    `Watch.scope` gains `"autorun"`; the `scope=` log line lands on change
    only (no per-tick spam).
  - `resolveInjectAgent`: planner-scoped → the planner agent (unchanged);
    autorun-scoped sessions fall through to the session's OWN first-user
    agent (a toggled worker/prompt_builder keeps running as itself).
  - Header/section comments updated (unit-3 `spawned`-mark purpose,
    unit-4 SCOPE paragraph, toggle-marker constants).
- `.opencode/plugin/tests/auto_resume.smoke.mjs` (89 → 97 checks)
  - Baseline scenarios updated to the new scope semantics: the unit-4
    planner scenarios now carry the planner agent field in their first
    user message (the old launch-marker text is no longer a scope
    source — it is not an own-line toggle); the spawned `ses_u3_new`
    check FLIPPED from "routes as planner" to "OUT of scope — scope= none,
    zero sends, no recovery/route line"; the send totals re-counted
    (2 CONTINUE + 2 spawns, no u3_new send).
  - NEW checks (the spec's item 3 + the DoD):
    - unmarked WORKER session OUT of scope — and NOT re-triggered on the
      next tick (second idle cycle: no recovery/route/spawn — the #85
      loop condition is gone, the DoD proof);
    - WORKER session + own-line `<|Autonom|>` (trim-padded) → IN scope
      (`scope= autorun`), CONTINUE attempt 1, body carries the session's
      OWN agent (worker), not the planner;
    - NON-planner agent (prompt_builder-style) + own-line `<|Autonom|>` →
      IN scope, body carries its own agent (the planner-only gate is
      dropped);
    - last-toggle-wins: own-line `<|Autonom|>` then later own-line
      `<|Direct|>` → OFF (no sends, no re-trigger);
    - mid-sentence quote (case-variant, not whole-line) is NOT a toggle.
  - One harness fix: the new section re-factors with the u4 spying
    client (the module-level `client` is set by the LAST factory call —
    the u2ag client otherwise receives the section's sends).

## Measured verification (this checkout, plain system node / repo venv)
- `node .opencode/plugin/tests/auto_resume.smoke.mjs` → **ALL PASS (97/97)**
  (baseline before change: 89/89).
- All 10 plugin smokes green: block_transfer.sandbox 52/52, block_transfer
  22/22, compact_memory 57/57, context_recovery PASS, ctx_gauge 3/3,
  gauge_core PASS, intercept_observer 39/39, loop_log 24/24, submit 20/20.
- Standard gate: probe `handover_probe.mjs` → **241/241 PASS**;
  `pytest -q` → **459 passed, 1 warning**; `ruff check --select F` →
  **All checks passed (F=0)**. All match the spec baselines.

## Commit
Code + TODO.md + this handover in ONE commit (see `git log -1`; the hash
is recorded by the planner in the follow-up bookkeeping commit per the
spec's DoD rule — deliberately NOT written here).

## TODO entries / inbox
- `TODO.md` **#85** → status "part 1 (scope) LANDED" (heading updated too);
  part 2 (global cap + dead-mark) left OPEN per the spec.
- `TODO.md` **#82** → status note: the scope-toggle portion LANDED as part
  of #85 part 1 (smoke pins acceptance criteria (i)/(ii) + the own-line/
  case rules); remaining: live acceptance (his post-restart test) + the
  unit-2-suppression question (his call).
- `todo_inbox.md` (append) — **stale `PLANNER_AGENT_ID` finding**: the
  live `opencode.jsonc` now carries only `planner_Q3S_170K` (verified:
  config read + live DB `session.agent` values), but the spawn path +
  injected bodies still send `agent: "planner_Q3S_160K"` — an agent the
  host cannot resolve, consistent with the #85 `UnknownError` at
  `createUserMessage` on every spawned session's start prompt. NOT fixed
  here (spec change-list is scope-only; the constant is a pinned copy of
  a live-config value the maintainer owns) — his call (re-pin vs derive).

## Deliberately NOT done (per spec)
- No restart of opencode (the live plugin keeps running the old code until
  the maintainer's next restart — the live behavior flips then).
- Part 2 (#85): no global cap, no dead-mark — follows once this is green.
- `PLANNER_AGENT_ID` / spawn-path agent constant: untouched (see inbox).
- DO-NOT-touch list respected: temp fix 0f192e5, live compact_budget.json,
  `.opencode/maintainer/`, `.opencode/agent/prompts/`, live opencode.jsonc,
  `compact_memory.ts`, `context_recovery.ts` — none edited.

## Discrepancy flagged (spec vs code)
The spec's "verified spec-time facts" list **#82 as LANDED** ("the
`<|Autorun|>` own-line toggle … already gates the autorun scope"), but the
committed code (and TODO #82, "implementation pending") had NO toggle
implementation — the live scope was still the old all-parts
`userHasMarker` scan + the `spawned` self-mark. This task implemented the
agreed #82 toggle design as part of the scope rework (the spec's own smoke
requirement — "a non-planner agent IN scope when `<|Autorun|>`-toggled" —
requires it). #82's remaining scope (live acceptance + unit-2
suppression) is noted in TODO #82.

## Lessons
Smoke harness gotcha worth a line in the testgate part: the auto_resume
module's `client` is module-level and set by the LAST factory call — a
smoke section reusing an older spying client after a re-factory gets its
sends delivered to the NEW client (re-factor before the section).
