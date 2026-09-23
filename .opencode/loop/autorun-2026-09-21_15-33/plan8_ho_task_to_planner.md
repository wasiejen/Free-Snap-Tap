# Worker summary — #85 part 3 (DONE — full gate green)

Task spec: `handover_task.md` (#85 part 3 — Unit 2 nudge as a passive ctx-line
suffix (no resume) + Direct gates Unit 2 + Direct beats planner in
scopeVerdict). Branch: `opencode_test`.
Code commit: `ded7245` (auto_resume.ts + smoke + TODO.md). This follow-up
commit carries only the finalized handover (the #85 commit hash is recorded
by the planner in the bookkeeping, per the task).

Takeover note: I took over from dead worker-12 (no commit, smoke/TODO
untouched). Its complete uncommitted `auto_resume.ts` implementation was on
disk (planner-reviewed) — I kept it, verified changes 2–4 were covered, and
fixed two stale "per-tick" comments (autoCompact/saturationConfig headers —
now "per nudge-eligible call").

## What changed

`.opencode/plugin/auto_resume.ts` (from worker-12's on-disk state, verified):
1. **Unit 2 redesign — passive ctx-line suffix.** The Unit-2 tick leg is
   REMOVED from `tick()`; `sendSelfCompact` (promptAsync) is GONE. New
   `onToolAfterNudge` on `tool.execute.after` (the gauge plugin's `ctx:`
   line channel — the same `output.output` mutation): per busy session, a
   tool result IS the activity evidence. GATES in order (cheap first): watch
   with positive tokens + known model → autoCompact ON (per-call file read)
   → model limits resolve (cached) → usable window > 0 → ratio ≥ threshold →
   the ONE expensive step: fresh `messages()` fetch + `scopeVerdict`; verdict
   "none" (Direct/non-scoped) → no suffix. LADDER (highest rung): ≥ 0.98 →
   `⚠⚠ --maintainer: context saturated at ratio=… — self-compact NOW`; else
   ≥ threshold (default 0.95, per-call configurable) → `self-compact now
   (ratio=…)`. `nudge=` log line ONCE per busy cycle (dedup on `w.attempts`,
   reset on fresh busy — independent of Unit 4's `recoveryCount`). NO
   promptAsync (no resume/queued turn/busy/budget-reset/loop); stale idle
   sessions get no nudge by construction (they emit no tool results). Never
   throws out of the hook.
2. **(c) Direct suppresses the Unit-2 nudge** (verdict "none" → silent, no
   per-tool-result log line — v1.x log-growth discipline).
3. **(d) `scopeVerdict` toggle-first:** the last own-line toggle is checked
   BEFORE the planner test — toggle OFF (`<|Direct|>`) → "none" (beats the
   planner test — a Direct planner is OUT of scope), toggle ON → "autorun"
   (any agent type), NO toggle → falls through to the planner test →
   "planner"/"none". (The on-disk code was planner-first — the reorder was
   needed and done.)
4. **Unit 4 scope UNCHANGED** (wherever the last busy→idle happened). No
   `<|Off|>`.

`.opencode/plugin/tests/auto_resume.smoke.mjs` (baseline 105 checks → 102):
- Unit-2 section rewritten to the passive mechanism (spying `messages`
  script + `toolAfter` driver; scenario sessions stay busy — no idle, an
  idle would route Unit 4). New DoD checks: stale-armed no-fire (+ pin that
  Unit 4 still routes it — `route= stop`), 0.95/0.98 ladder, per-session
  independent nudge, (c) Direct worker no-suffix, no promptAsync on the
  Unit-2 path, per-step suffix re-append + once-per-cycle `nudge=` dedup,
  fresh-busy dedup reset, dual-shape string-busy, throwing-`messages()`
  fail-safe, missing-provider.
- autoCompact + config sections adapted to per-tool-result reads (silent
  suppression when OFF, no `skip=` line; per-call live-edit of
  saturationThreshold/outputReserve; fail-open defaults).
- Old "#80 agent-retention" section (pinned the agent field in the unit-2
  SEND body — the send no longer exists) replaced by the nudge's scope-gate
  checks (spawned / no-toggle worker / no-toggle no-agent → verdict none →
  no suffix; Unit 4 routes all three scope= none, no sends).
- New Direct DoD section: PLANNER + trailing `<|Direct|>` → no ctx-line
  suffix (Unit 2 suppressed) AND no Unit-4 CONTINUE (Unit 4 deactivated for
  the planner) — both units pinned in one scenario.
- `smokeSids` live-log guard extended: 14 new sids + the config-era sids the
  old list was missing (ses_u2_cfa/cfb/cfc/cfd — a small guard gap found and
  fixed in-scope).
- Smoke header (Unit 2 + SCOPE paragraphs) updated to the passive design.

`TODO.md`: #85 title + status line — "part 3 (Unit-2 ctx-line-suffix +
Direct gates) LANDED 2026-09-23" (NO commit hash — the planner records it in
the follow-up bookkeeping commit, per the task).

## Measured verification (all green)

- auto_resume smoke: **102/102 ALL PASS** (baseline 105; 47 promptAsync-era
  checks replaced by 44 adapted/new — net −3; every old intent covered).
- Gate probe: **241/241 PASS** (the probe's kind-tally line self-annotates
  `nudge==14` — the hook is covered).
- All other plugin smokes: block_transfer.sandbox 52/52, block_transfer 22/22,
  compact_memory 57/57, context_recovery ALL PASS, ctx_gauge 3/3, gauge_core
  ALL PASS, intercept_observer 39/39, loop_log 24/24, submit 20/20.
- pytest: **459 passed, 1 warning** in 2.30s.
- ruff `--select F`: **All checks passed** (F=0).

## Commits

- `ded7245` — auto_resume.ts + smoke + TODO.md (the task commit).
- (this) handover-only follow-up commit.

## TODO entries

None new. One in-scope fix noted above (smokeSids guard gap) — closed inline.

## Deliberately NOT done

- Did NOT restart opencode (changes take effect on the next restart —
  DO-NOT-touch). Post-restart live verification stays a maintainer call.
- Untouched: the #82 scope-toggle logic (built on, not broken),
  `compact_memory.ts` + `context_recovery.ts`, the Unit-4 scope, the live
  `.opencode/temp/compact_budget.json`, `opencode.jsonc`,
  `.opencode/maintainer/`, `.opencode/agent/prompts/`.
- No new TODO entries: the two stale "per-tick" comments were fixed inline
  (comments only, pre-approved).

## Friction

(Logged via `submit(feedback=…)`: the salvaged worker-12 draft's line-range
claims for the smoke header were off by one (L5-8 vs actual L4-7) — the
anchor-verified splice caught it before writing; salvaged drafts should
carry explicit final-decision markers on their self-corrections, e.g. the
stale-check `route=` assertion flip.)

Lessons: for a multi-block smoke rewrite, anchor-verified line-range splices
(machine-checked, bottom-up) beat giant exact-match edits — and running the
smoke after the first runnable chunk exposed nothing (stage 1 was green
except the expected old-section reds).
