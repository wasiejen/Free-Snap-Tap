# Handover Summary — auto-resume UNIT 1: skeleton logging plugin (worker_Q3S_160K, ses_f3bbdd89affeigE26tm2lka7AT, 2026-09-21)

## What changed (one commit with this file)
1. **`.opencode/plugin/auto_resume.ts`** (new) — default-exported Plugin
   factory, same shape as the existing plugins. Hooks installed:
   - `event: onEvent` — one log line per event to
     `.opencode/temp/auto_resume.log` (append; temp dir mkdir'd recursive):
     `<ISO time> event=<type> sid=<sessionID> <key fields>` (status for
     session.status, tokens for message.updated — short, defensive).
     Never throws (try/catch swallow, intercept_observer discipline).
   - one-shot init `surface=` probe at load: `typeof
     ctx.client.session.<m>` for prompt, promptAsync, abort, list, get,
     message, todo, command, summarize, compact + `app.log=...`
     (`typeof` only — Object.keys misses prototype methods).
   - NO timers, NO sends, NO state machine (Unit 2 slots in at the marked
     points; module-level state + pure-observer hooks).
2. **`.opencode/plugin/tests/auto_resume.smoke.mjs`** (new) — smoke per the
   existing pattern (scratchpad sandbox `directory`; live log untouched):
   factory shape, `event` hook present, surface line first + all 11 verdicts,
   v1 expectations (summarize=function, compact=undefined, app.log=function),
   session.status + message.updated line shapes, degenerate inputs never
   throw, throwing mock client survives, live-log-untouched + sandbox checks.
3. **`.opencode/agent/knowledge/opencode-plugins/auto-resume-unit1-surface-report.md`**
   (new) — static `session.*` surface from the installed .d.ts (bounded
   grep), probe design + expected values, provenance, and the
   "LIVE CONFIRMATION PENDING (maintainer restart)" marker.
4. **`todo_inbox.md`** (append-only) — one finding: the pre-existing
   handover-probe [87] stale-pin failure (see below).

## Measured verification (DoD)
- **Smoke: GREEN** — `node .opencode/plugin/tests/auto_resume.smoke.mjs` →
  `AUTO_RESUME_SMOKE: ALL PASS (14/14)`.
- **pytest: GREEN** — `./.venv/Scripts/python.exe -m pytest -q` →
  `459 passed, 1 warning` (baseline 459+1w ✓).
- **ruff: GREEN** — `./.venv/Scripts/ruff.exe check --select F .` →
  `All checks passed!` (F=0 ✓).
- **handover_probe: NOT GREEN — pre-existing, out of scope.**
  `node .opencode/plugin/probes/handover_probe.mjs` → exactly ONE failure:
  check [87] classifier fixtures — pin expects `iq3`→1, the current
  `compact_memory.ts` classifier (line 82, per the 2026-09-21 ruling; the
  smoke at line 86 already pins `clf IQ3 -> 3`) returns 3. Verified
  pre-existing at HEAD: the probe references none of UNIT 1's files, and
  `compact_memory.ts` is byte-unchanged (git status). The probe check TOTAL
  is UNCHANGED by this unit (no new pins — DoD satisfied on that count);
  the failure is a stale pin in the probe file, which is DO-NOT-TOUCH for
  this unit. Finding appended to `todo_inbox.md` (unnumbered, for
  curation).
- The three files exist + committed with this summary (single commit,
  subject `add auto-resume UNIT 1: skeleton logging plugin + surface probe + smoke + report`).

## Discrepancy flagged (in the report, not acted)
- Installed `@opencode-ai/sdk` / `@opencode-ai/plugin` under
  `.opencode/node_modules/` = **1.18.29**, while the design doc names the
  host install as `opencode-ai@1.18.31`. Both v1-generation; the live
  `surface=` probe confirms the runtime surface.

## Deliberately NOT done
- No live acceptance (pending: maintainer host restart — the plugin must be
  loaded by the host to log live events + fire the init probe). Planner
  verifies (a) live event lines in `.opencode/temp/auto_resume.log`,
  (b) the `surface=` line, then appends the live confirmation to the
  surface report (its "LIVE CONFIRMATION PENDING" section).
- No `opencode.jsonc` registration (plugins auto-discover from
  `.opencode/plugin/`), no timers/send path/watch objects (Unit 2), no
  edits to product code, probes, other plugins, maintainer files, or
  `compact_memory.ts` (all DO-NOT-TOUCH).

## TODO entries
- `todo_inbox.md` (append-only): the pre-existing probe [87] stale-pin
  failure (`iq3` pin 1 vs classifier 3) — one block, unnumbered, dated
  2026-09-21, worker_Q3S_160K.

## Lessons
Gate baselines in task specs should be machine-verified at spec time: the
spec's DoD assumed the handover probe was green, but it had a pre-existing
stale pin — the worker can only verify and name, not fix, a DO-NOT-TOUCH
failure.
