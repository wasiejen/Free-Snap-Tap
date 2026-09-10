# EXECUTIVE SUMMARY — TODO split part 3 (closed entries → todo_records.md)

Task: `.opencode/handover/handover_task.md` (part 3 only). Meta/file cleanup, no FST
code, no behavior change. ONE commit (the commit containing this summary; subject:
"TODO split part 3: closed entries → todo_records.md, stubs in TODO.md" — hash
verifiable via `git log -1`; a commit hash cannot be embedded in its own commit).

## What changed
- `TODO.md`: 891 → 504 lines. 12 closed entries replaced by one-line stubs in place
  (format `## N. (closed <date>, see todo_records.md) — <original title>`); the open
  entry #48 (misfiled under "Closed entries") moved as a whole block into "FST
  behavior decisions (open — maintainer calls unless noted)" (before "## Docs & misc
  (open)"); the now-mismatched section renamed to
  `## Closed entries (mismatch: contains open entry #35)` (per spec rule: something
  open remained there — #35, judged open below).
- `todo_records.md`: 34 → 446 lines. Existing 34 lines byte-identical (verified as
  prefix); 12 full-text blocks appended at the end, one per moved entry, format
  `## N. <original title> (closed <date>, full text moved from TODO.md)` + original
  body verbatim. Append order: the planner's MOVE-list order (#47, #45, #39, #37,
  #38, #34, #36, #43, #44) then the judged-closed (#46, #41, #42).

## Moved entries (12)
#47, #45, #39, #37, #38, #34, #36, #43, #44 (planner pre-ruling) + #46, #41, #42
(judged closed, below).

## Judged entries (decision + one-line evidence)
- **#46 → CLOSED (moved):** the LANDED tail fully meets the acceptance — event-driven
  bounded wait in BOTH crossover tests, 10 consecutive full `pytest -q` runs green,
  production `send_keys_for_tap_group` untouched; scope == what LANDED.
- **#41 → CLOSED (moved):** acceptance met — `fst_manager.py:578` + conftest FakeFST +
  test assertion all on the singular production name, drift-guard test added, gate
  green (436 passed / ruff F=0).
- **#42 → CLOSED (moved):** multi-notch semantics pinned by the new
  `test_multi_notch_scroll_keeps_single_notch_phase`, single-notch tests green, the
  decided mask/shift semantics named in the LANDED tail; the report-back ruling became
  the separate (still open) entry #48.
- **#40 → LEFT OPEN:** the goal's reliable re-run + tests/ smell-check half is not
  evidenced done — the entry itself lists "Remaining scope: the tests/ smell check +
  the focus-dict/combination candidates"; the maintainer's "CLOSED" tail only resolves
  the gemma agent-config sub-call.
- **#35 → LEFT OPEN:** the T1 build scope LANDED, but the tail still carries the v1.3
  log-profile re-baseline = open maintainer call 1 (default SKIP) — scope broader than
  what LANDED.

## Oddities / stale refs found (reported per spec, NOT edited)
- `todo_records.md` header numbering line is stale ("currently #38, next = #39";
  reality: up to #48, next #49) — left as-is (spec: append-only for that file).
- Maintainer-calls list: NO stale refs — all referenced entries (#17, #11, #33, #1,
  #7, #8, #9, #4, #6, #30) are still open; item 6's #39 ref already reads CLOSED.
- Open #35's body references the old `ctxgauge/` path (moved to `plugin/scripts/` on
  2026-09-10) — stale path inside an open entry; left byte-identical per scope.
- Kept the pre-existing one-line records for #38 and #47 and appended the full text
  (spec pre-ruling; duplicated heading accepted): #38's title therefore occurs 3×
  total (stub + kept record + new block), all other moved titles exactly 2×.

## Verification (scripted, machine-checked — see temp scripts if needed)
- Open entries byte-identical: #1 #7 #8 #9 #4 #6 #11 #3 #40 #35 #17 #30 #33; file
  header (7 lines) and the maintainer-calls section byte-identical.
- #48 block moved verbatim into FST behavior decisions; renamed section heading
  present; entry-id set of TODO.md unchanged (stubs keep their numbers).
- Every moved title: exactly 2 occurrences across TODO.md + todo_records.md
  (3 for #38, accepted); no moved entry's full body remains in TODO.md
  (contiguous body-blob substring check per entry).
- `todo_records.md` old content byte-identical prefix; 12 record headings present.
- `git diff --stat`: exactly `TODO.md` + `todo_records.md` (+ this summary).

## Deliberately not done
- No edits to the maintainer-calls list; no new TODO.md entries (spec: "you add NO
  entries"); `todo_records.md` existing lines untouched; no gate run (meta-only per
  spec); `opencode.jsonc` left in the tree (not staged).

Final gauge (verbatim): `SESSION=ses_f731be360ffe6v9T67ufY3Bt3s CTX=2176 (1%) REM=117824`
(note: the injected plugin nudge at the same time read CTX=84298 (70%) REM=35702 — the
self-gauge is source of truth per AGENTS.md; both are far above the stop line).
