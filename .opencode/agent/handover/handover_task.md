# Task: #85 part 1 — generalize unit-4 scope; keep spawned + unmarked worker sessions OUT of scope

Goal: fix the auto_resume unbounded session-spawn loop by generalizing the unit-4
scope so (a) any agent can run in a loop when toggled with `<|Autorun|>`, and
(b) freshly-spawned sessions + unmarked worker sessions stay OUT of scope. This is
the CORE of #85. Part 2 (global cap + dead-mark) follows once this is green.

## Verified spec-time facts (do not re-derive)
- #85 bug (2026-09-22): the live auto_resume plugin created a NEW session every
  ~10s (every 2nd `recovery` attempt), each logged `scope= planner` +
  `recovery= attempt 1` then `attempt 2`, each failing `UnknownError` at
  `SessionPrompt.createUserMessage`. Freshly-spawned sessions were mis-scoped as
  `planner` → re-triggered the spawn → unbounded loop. (auto_resume.log evidence.)
- #82 (the scope toggle, already LANDED): the `<|Autorun|>` own-line toggle
  (last-toggle-wins, re-evaluated per user message) gates the autorun scope ON/OFF.
- `auto_resume.ts`: the tick function runs unit-2 (saturation) + unit-4 (liveness
  watchdog) + the scope; the spawn path is unit-4 "restart→spawn"; the recovery path
  logs `recovery= attempt N`. It reads autoCompact/saturationThreshold/outputReserve
  from `compact_budget.json` per tick.
- Baseline: auto_resume smoke **89/89**; probe **241/241**; pytest 459+1w; ruff F=0.

## The change (WHAT — the HOW is yours inside the DoD)
1. **Unit-4 scope = actual PLANNER sessions (always) ∪ sessions whose `<|Autorun|>`
   toggle is ON (#82 own-line).** Detect "planner" from the session's `agent` field
   (source it from the DB / session metadata — verify the exact field); use the #82
   toggle for all other agent types. Drop the planner-only gate so unit 4 follows the
   #82 scope for ANY agent type (so a prompt_builder / future researcher toggled with
   `<|Autorun|>` runs in a loop like a planner).
2. **Freshly-spawned sessions + unmarked worker sessions must be OUT of scope** (not a
   planner, not `<|Autorun|>`-marked). Identify the exact mechanism the current scope
   uses to (mis)classify a session as `planner` and make sure spawned / unmarked
   worker sessions are excluded so they are never re-triggered.
3. **Smoke updates** (`tests/auto_resume.smoke.mjs`): a spawned session is OUT of
   scope; a worker session is OUT unless `<|Autorun|>`-toggled; a non-planner agent
   (prompt_builder-style) is IN scope when `<|Autorun|>`-toggled; the existing 89
   scope checks still pass.

## Definition of done (measurable)
- A smoke check proves NO unbounded spawning: a freshly-spawned session is out of
  scope and is not re-triggered on the next tick (the loop condition is gone).
- auto_resume smoke green (new scope checks + the existing 89 pass).
- Full gate green: probe 241/241, all plugin smokes, pytest 459 passed + 1 warning,
  ruff F=0.
- TODO.md: #85 → status note "part 1 (scope) LANDED" (the hash is recorded by the
  planner in the follow-up bookkeeping commit — do NOT write your own hash in the
  same commit).

## DO-NOT-touch
- Do NOT restart opencode (changes take effect on the next restart; the live plugin
  keeps running the old code).
- The maintainer's temp fix `0f192e5` (compact_memory), the live
  `.opencode/temp/compact_budget.json`, `.opencode/maintainer/`,
  `.opencode/agent/prompts/`, the live `opencode.jsonc`.
- The #82 scope toggle logic (build on it, don't break it). `compact_memory.ts` and
  `context_recovery.ts` (LANDED; untouched here).

## Reading discipline (his note, priority.md 2026-09-22_20-42)
Targeted reads ONLY of the named `auto_resume.ts` regions (tick function, scope
logic, spawn path, recovery path) + the auto_resume smoke. No careless large greps
(e.g. 20k from TODO.md). Use node for any arithmetic.

Worker: `worker_Q3S_170K` (auto_resume.ts scope refinement + smoke updates).
