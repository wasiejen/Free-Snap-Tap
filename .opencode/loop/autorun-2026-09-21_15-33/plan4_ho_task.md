# Task spec — Auto-resume UNIT 2 fix: live `session.status` shape mismatch

Worker: `worker_Q3S_160K` · Iteration: plan4 (looprun autorun-2026-09-21_15-33)
Design source: `.opencode/proposals/approved/2026-09-21_opencode-auto-resume-plugin.md`
(Unit 2 section + shared architecture rules BIND — the funnel stays the 5s tick;
events stay ARM-only).

## Goal

Unit 2's context-limit trigger has NEVER fired live. The live `session.status`
event carries `status` as an OBJECT `{type: "busy"|"idle"|...}`, but `armEvent`
compares `props.status === "busy"` / `=== "idle"` (strings) → zero `arm=` lines,
the idle transition is never registered, the tick never evaluates. Fix the shape
handling, re-pin the smoke to the live shape, and append the live-acceptance
findings to the surface report.

## Verified facts (planner-measured 2026-09-21 — do NOT re-derive)

- Live log `.opencode/temp/auto_resume.log`: EVERY `session.status` line ends in
  `status=[object Object]` (e.g. 16:51:43.577Z, this planner session's own
  busy/idle); the WHOLE log has ZERO `arm=` / `saturation=` / `trigger=` lines.
- `auto_resume.ts`: `armEvent` (423-454) — the `session.status` branch (424-435)
  compares `props.status === "busy"` (425) / `=== "idle"` (431); `keyFields`
  (154-162) does `String(props.status)` → the `[object Object]` line.
- The live object's field is `type`; vocabulary `"idle" | "busy" | "retry"` (+
  `"interrupted"` in the reference plugin) — the `SessionStatus` comment in
  `ctx_watchdog.ts` (~line 175, the SDK `client.session.status()` map) is the
  in-repo measured fact.
- The smoke `statusEv` helper (`auto_resume.smoke.mjs:175`) mocks the STRING
  shape — why the smoke was green while the live path was dead. String-shape
  events also appear at smoke lines 90, 119, 328 (Unit 1 checks — leave them).
- Surface line `2026-09-21T16:42:39.969Z` (post-restart, log line 148832) carries
  `create=function` — the Unit 3 pending surface verdict, now settled.
- UNIT 3 LIVE ACCEPTANCE PASSED (planner-run 17:00Z): trigger file → `spawn=
  sid=ses_f3b16aa46ffe07iI4CSrScxeWK agent=planner_Q3S_160K` (log line 163103) +
  `.consumed` rename + the spawned session WROTE the marker
  `.opencode/temp/auto_resume_unit3_live_acceptance.txt`
  (`unit3-live-acceptance ses_f3b16aa46ffe07iI4CSrScxeWK 2026-09-21 17:00:55 UTC`).
- Baseline at HEAD `504105a`: probe 235/235, pytest 459+1w, ruff F=0,
  auto_resume smoke 39/39.

## Design (locked — a deviation is reported, not self-decided)

1. `auto_resume.ts` — a small module-internal `statusOf(status: unknown):
   string | null`: string → as-is; object with a string `type` → that `type`;
   else null. `armEvent`'s `session.status` branch uses it: `"busy"` arms
   (unchanged behavior/log line); `"idle"` sets idle (unchanged); any other
   value (retry/interrupted/unknown/null) → NO state change, no log line.
   `keyFields` prints the normalized value (`status=busy`), falling back to the
   old `String(...)` only when `statusOf` yields null.
2. `auto_resume.smoke.mjs` — `statusEv` (175) emits the LIVE object shape
   `{ type: <s> }` (the existing Unit 2 checks then pin the live shape); ADD ONE
   check that a STRING-shape `"busy"` event still arms + fires a `trigger=`
   line for a ≥0.85 session (dual-shape acceptance, new sid).
3. Surface report `.opencode/agent/knowledge/opencode-plugins/auto-resume-unit1-
   surface-report.md` — APPEND a dated section (2026-09-21 plan4 live
   acceptance): (a) the live `session.status` `{type}` shape + the string-mock
   gap (log evidence lines); (b) `create=function` live verdict; (c) Unit 3
   LIVE ACCEPTANCE PASSED with the evidence above.
4. `TODO.md` #75 — status line: Unit 3 LIVE ACCEPTANCE PASSED (evidence);
   Unit 2: shape bug found in live acceptance + fixed (this commit); live
   re-acceptance PENDING the next host restart (expect `arm=`/`saturation=`/
   `trigger=` lines).

## Definition of done

- All four items landed; standard gate GREEN: probe 235/235, pytest 459+1w,
  ruff F=0 — plus the FULL smoke suite run (every `*.smoke.mjs` in
  `.opencode/plugin/tests/`, not only auto_resume — the #77 lesson).
- One commit: code + TODO + handover files; summary to
  `.opencode/agent/handover/handover_task_to_planner.md` (measured gate
  numbers, commit hash, deliberately-not-done list).

## DO-NOT-touch

- Unit 3 spawn code, the tick funnel, the `spawned` map, trigger-file logic.
- Unit 2 constants (threshold 0.85, once-per-cycle budget) — shape only.
- The probe (it pins no auto_resume event shape — if you believe a pin is
  needed, put it in `todo_inbox.md`; do NOT build one).
- `.opencode/maintainer/**` and the live `opencode.jsonc`.
