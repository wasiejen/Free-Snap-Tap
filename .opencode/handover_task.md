# TASK — Phase 6 / Tier 1 — v2.2.1: gauge-failure evidence logging (+ probe extension)

FIRST read `AGENTS.md`. Then: `.opencode/plugin/handover.ts` (current final code — read it
fully; your SUGGESTED scope below, not exhaustive — the probe file too).

## Why (measured facts — re-verify before you rely on any number)
v2.2's `onSystemTransform` fires on EVERY live turn (104 `kind:"transform"` lines in the
current `.opencode/plugin.log` start segment — the log is at `.opencode/plugin.log`, NOT
`plugin/plugin.log`; TODO #22), yet NO `ctx:` line surfaces in worker or planner prompts
(TODO #23). The readout failure branches are silent by design (best-effort, no logging) —
so the root cause is currently undecidable from here: (a) BunShell spawn problem
(relative path `.venv/Scripts/python.exe .opencode/ctxgauge/peek.py` + `cwd(dir)`), (b) the
3000 ms `GAUGE_TIMEOUT_MS`, (c) non-`CTX=` output (e.g. a python traceback — the TODO #21
class, already fixed at `b8ea40b`), (d) opencode not applying the transform mutation.
DELIVERABLE: one opencode start after your change identifies the branch from the log alone.

## Goal — what "pass" means
1. `handover.ts`: `onSystemTransform` appends ONE `kind:"gauge"` log line when the readout
   is NOT ok, or when ok-but-not-injected (`output.system` not an array); NO line on the
   ok+injected path (happy path must not add log volume). Reason vocabulary (stable, one
   of): `shell-missing` | `timeout` | `no-ctx-output` (raw output did not start with
   `CTX=` — includes empty/traceback — carry a `preview` field: raw output trimmed ≤ 120
   chars, omitted when empty) | `system-not-array`. Line = your one call of `buildLine`
   (existing scalar pattern), session id included.
2. Offline probe `.opencode/plugin/probes/handover_probe.mjs` (permanent tooling — the
   run recipe + expected summary are in its header): extend the S4 transform shapes so the
   failure shapes each assert their new `gauge` line + reason (the current shapes cover
   no-shell / junk-shell; add synthetic shapes where needed) — the OK shapes keep asserting
   injection byte-identically and NO `gauge` line. Update the header's expected-output
   summary to match (recipe integrity is a maintained property of the file — do the math:
   current expectation 23/23 per the v2.2.1 worker summary; report before/after totals).
3. Repo baselines unchanged: `pytest -q` → 434 passed (13 warnings);
   `ruff check --select F .` → 6 findings.

## Hard limits
- No behavior change beyond the evidence log: v2.2 injection semantics on the success path
  stay byte-identical (diff stat for the `gaugeReadout`/`onSystemTransform` region in the
  summary — paste it).
- NO SKIP-SET change (v1.3 is a separate maintainer call), no other hook touched.
- Do not restart/reconfigure opencode.

## Suggested procedure (deviate, note the deviation in the summary)
1. Implement (1). 2. Run probe BEFORE (`before` mode per the header — expect the current
   all-pass), apply, run AFTER (all pass incl. the new expectations). 3. Baselines.
4. Commit: plugin file(s) + probe + this spec + the handover summary. TODO.md: one-line
   records for anything you fixed on the way; leave maintainer-level items OPEN (do not
   invent entries for things you did not find).

## Definition of pass
- Probe before all-pass AND after all-pass with the new `gauge` expectations (both totals
  in the summary).
- `pytest -q` 434 / ruff 6.
- One commit, working tree clean after it (the mirror overwrite is the planner's to book).

## Worker: `worker_120K_mtp`
First run under the relaxed prompts (`prompt_agent_task.md` @ `b8ea40b`). One line in the
summary on how the freedom/spec-friction felt (helped / hindered / neutral) — flag only.
