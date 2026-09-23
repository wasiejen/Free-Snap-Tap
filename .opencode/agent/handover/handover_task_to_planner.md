# HANDOVER worker-13 → planner — R4: intercept.log mining scriptlet (LANDED)

Status: **LANDED** (one commit on `opencode_test` — hash recorded by planner
per DoD-5; it is the commit whose subject starts with
`add summarize_intercept.cjs`).

## What changed
- **`.opencode/agent/scripts/log/summarize_intercept.cjs`** (new) — read-only
  scriptlet: `node …/summarize_intercept.cjs [logfile]` (default
  `.opencode/temp/intercept.log`). Prints the 6 spec'd sections with
  machine-stable lines: (1) verdict counts — the 9 frozen VERDICTS in
  byte-stable order, zero-included, NEW verdicts after; (2) fuzzy-rejected
  per-event `d`/`gap` + best-cand census (threshold-tuning input);
  (3) redundancy-mismatch lines verbatim (380-char cap, logctx convention);
  (4) adder-form usage in pair args (`pair-events` / `adder-left`, decision-record
  §2.5 incident-density metric); (5) out-of-sandbox count by path prefix
  (normalized first 3 segments; short/junk values kept raw so noise sources
  stay visible); (6) per-session_id line counts.
  Generic: no hardcoded counts/session ids; the only constant is the frozen
  VERDICTS mirror (documented as a mirror of
  `.opencode/plugin/intercept_observer_core.ts` `VERDICTS`). Parsed
  right-anchored (verdict/scope/evidence = last 3 fields) so an args-json
  containing ` | ` cannot shift the evidence fields; `<8`-field lines are
  counted `malformed`.
- **`.opencode/agent/scripts/log/tests/`** (new) — `intercept_fixture.log`
  (13 synthetic lines covering every frozen verdict, one NEW verdict, one
  adder-left pair, one malformed line, 3 out-of-sandbox prefix buckets),
  `expected_summary.txt` (byte-exact pin), `summarize_intercept.smoke.cjs`
  (6 checks: in-process byte-exact, CLI exit 0 + byte-exact stdout,
  missing-file exit 1 / empty stdout / stderr names the file).
- **`.opencode/agent/scripts/log/README.md`** — table row + usage + tests/
  pointer. **`.opencode/agent/scripts/INVENTORY.md`** — promoted-table row.

## Pinned-check choice (DoD-3)
Pinned as the **fixture test** (not a probe section). Reason: both probe
homes (`.opencode/plugin/probes/handover_probe.mjs`, `.opencode/plugin/tests/`)
live under `.opencode/plugin/**`, which the task spec lists in DO-NOT-touch;
a self-contained smoke under the scripts `log/` home pins the same output in
the established smoke style (chk/finish, exit 0 iff green) without touching
plugin territory. The standard gate was then verified separately.

## Measured verification (all run from repo root, plain node / venv)
- Fixture smoke: `node .opencode/agent/scripts/log/tests/summarize_intercept.smoke.cjs`
  → **6/6 PASS**, exit 0.
- Real log: `node .opencode/agent/scripts/log/summarize_intercept.cjs` → exit 0,
  all 6 sections. At run time: 3130 lines, 86 sessions, 0 malformed;
  `ambiguous 0` (the frozen zero-included case); pair-events 107, adder-left 2;
  out-of-sandbox 722, top buckets `398 (empty)`, `61 C:/Users/Wasiejen`,
  `30 c/Users/Wasiejen`. (Counts move — the log grows live; the run output is
  reproducible at any moment.)
- Standard gate, measured at commit time:
  - pytest: **459 passed, 1 warning** (matches baseline) ✓
  - ruff `--select F .`: **All checks passed** (F=0) ✓
  - plugin smokes: **9/10 PASS** — `context_recovery.smoke.mjs` FAILs with
    `ERR_MODULE_NOT_FOUND .opencode/plugin/deactivated/context_recovery.ts`
  - `handover_probe.mjs`: **FAILS with the same** `ERR_MODULE_NOT_FOUND`
  - Both failures are the maintainer's UNCOMMITTED `context_recovery.ts` move
    (git: `D .opencode/plugin/deactivated/context_recovery.ts`,
    `?? .opencode/plugin/context_recovery.ts`) — a pre-existing environment
    state named in the task spec's DO-NOT-touch list, NOT caused by this task
    (no `.opencode/plugin/**` file was modified). Gate is otherwise green and
    was green before this task's change; it should read fully green once the
    maintainer commits the move.

## Findings (for #67 / curation — loose todo entries appended via submit)
1. Session-count basis differs from the spec's measured value: the spec says
   "139 distinct session ids" (planner-measured 2026-09-23); the script's
   field-2 census reads **86** distinct session_id values at 3130 lines, and
   a substring census of `ses_*` anywhere in lines reads 120. The script
   counts the session_id FIELD (the per-session metric R4 needs); the spec's
   139 likely used a different measure. Worth a one-line basis note in #67.
2. The `context_recovery.ts` move leaves probe + one smoke red until
   committed (evidence above) — gate baseline is blocked by maintainer state.

## TODO entries
None appended to `TODO.md` directly (planner updates #67); the two findings
above were sent to `todo_inbox.md` via `submit`.

## Deliberately not done
- No probe section / no new file under `.opencode/plugin/**` (DO-NOT-touch;
  see pinned-check choice).
- No edit of the R4 spec's stale `Worker: worker_Q4_140K` line (planner's).
- No staging of the maintainer's live changes (`context_recovery.ts` move,
  `ideas.md`, `my_todos.md`, loop_log.md) — only the five named paths above
  were staged.
