# HANDOVER — TODO #81 (worker-1, ses_f36d1ca53ffe0GXACaVwW9iCJO)

Status: DONE — re-pin landed per the maintainer's ruling (re-pin, NOT
deactivate/skip; promptAsync NOT restored). Gate fully green. ONE commit
(see "Commit").

## What changed

`.opencode/plugin/probes/handover_probe.mjs` — check [97] (S13) re-pinned to
the CURRENT post-temp-fix behavior of `queueMessage` (maintainer temp fix
`0f192e5` commented out the `promptAsync` call):
- assertion: response byte-exact (dispatch line + "The message was queued
  for ses_qc_msg (delivered on its resume)." — unchanged) AND
  `rec.prompt.length === 0` (no queued promptAsync — replaced the old
  "exactly ONE queued promptAsync carrying the text part").
- check name + comment updated to name the temp fix + the ruling.
- The check remains a real assertion (not skipped/deactivated).
- Probe header annotation NOT touched: the counted total is unchanged
  (241); the section-sum line (S13=14, … → 241) re-verified by machine sum
  to agree with the `PROBE handover: 241/241 PASS` line.

`.opencode/plugin/tests/compact_memory.smoke.mjs` — the matching message
pin re-pinned the same way:
- chk "message arg: EXACTLY one queued promptAsync …" → "message arg: NO
  queued promptAsync (temp fix 0f192e5 — the prompt is not sent)",
  asserting `rec.prompt.length === 0`.
- The response chk (dispatch line + queued note, byte-exact) and the
  budget chk are unchanged and still pass.
- Section header comment updated to name the temp fix + the ruling.
- The "message WITHOUT promptAsync on the client" block is untouched
  (still green — the WARNING path is independent of the temp fix).

`TODO.md` — entry #81 status → "LANDED 2026-09-22 (worker-1 commit — the
planner records the hash on return, #80 precedent) — re-pinned per the
ruling … gate green: probe 241/241 (header total agrees), smoke 53/53,
pytest 459 passed + 1 warning, ruff F=0." Entry text otherwise kept.
Note: the spec's "LANDED (commit hash)" is not embeddable in the same
commit (the hash cannot reference itself) — same precedent as #80
("planner records the hash in a follow-up").

This handover file (replaces the #80 worker-2 summary — that commit's
records live in `git log` + TODO #80 + the archived NAP state).

## Verification (measured, in order)

Baseline first (pre-edit): probe 240/241 with ONLY [97] red (exact response
carried dispatch line + queued note, `prompt:[]`); smoke: exactly 1 FAIL
(the matching message pin), everything else green — matching the spec's
"Current state".

After the re-pin:
- `node .opencode/plugin/probes/handover_probe.mjs` → **241/241 PASS**;
  self-annotated total agrees with the header (section sums machine-verified
  = 241).
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` → **ALL PASS
  (53/53)**.
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed, 1 warning** (the
  known #10 coroutine warning).
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed (F=0,
  exit 0)**.

## Commit

ONE commit on the current checkout (`opencode_test`), HEAD before commit:
`43eacb6` — the two pin files + `TODO.md` + this handover file, nothing
else. Hash: recorded by the planner on return (a commit hash cannot be
embedded in its own commit — #80 precedent, see the TODO status line).

## Deliberately NOT done

- `.opencode/plugin/compact_memory.ts` — untouched (the live temp fix;
  pinned AROUND it; the promptAsync was NOT restored, no "proper fix").
- `.opencode/plugin/auto_resume.ts`, `.opencode/maintainer/**`,
  `opencode.jsonc`, FST product code/tests — untouched.
- No check deactivated/skipped — both pins are real assertions on the
  current intended behavior.
- `todo_inbox.md` untouched (nothing new to report; #81 was already
  curated there by the planner).
