# Worker summary — #0 numword escape output (worker-2, plan2/iter2) — COMPLETE

Session: ses_f4e084942ffeSedvBfOKl2ehQY (post cross-compaction resume; the
pre-compaction stop was an out-of-sandbox path — username bit-shift W→A —
and then context_length_exceeded at 101%; resumed from committed state, all
gates re-verified on the current tree in the final session, not trusted).

## What changed (all committed except this bookkeeping commit)
- `intercept_observer_core.ts` — `resolveEscapes(text, map)` +
  `resolveEscapeSafe` (pure, exported): form
  `[<digits>:<safe-form>:esc|escape>]` (ONE regex, `i` flag — case
  variants); field 2 = dash-separated single digits OR numwords (reuses the
  existing `resolveNumword` grammar — no second table, DoD grep-verified:
  line 442 `ESCAPE_RE`, 456-462 grammar-driven); invalid field 2 → form
  left byte-identical; returns transformed text + hit list (raw + value per
  hit). — commit 4e2fd0c
- `intercept_observer.ts` — `runEscapeContent(output, tool)` for
  write/edit/block_transfer on the string args `content`/`oldString`/
  `newString` (block_transfer carries none → natural no-op); runs FIRST
  (before the pair observation — Part 3 order); a hit mutates the arg +
  logs ONE 8-field line per hit, verdict `pair-resolved`, evidence
  `kind=escape scope=content orig=<form> value=<digits> hits=<n>`; nine-
  verdict vocabulary unchanged (#73 kind=dedup precedent). Path fields
  untouched. Header comments updated ((3a) content-scope guard gains the
  escape exception; verdict block notes kind=escape). — commit 4e2fd0c
- `intercept_observer.smoke.mjs` — +2 checks (8h): escape positive (edit
  oldString+newString, numword + dash-digit forms; 3 lines = 2 escape + the
  numword observation on the ORIGINAL argStr — observeArg always sees the
  pre-mutation argStr; field 5 stays the original arg via flattenField) +
  escape negative (unmarked `[1:one]` pair-logged only, invalid
  `[316:foo-bar:esc]` untouched). 39/39. — commit 4e2fd0c
- `handover_probe.mjs` — new S24 section (append-only, run IDs 240-245,
  inline labels = run IDs, the S23 inline-label quirk left untouched) + the
  header annotation block + the section-sum total (machine-verified
  sum = 235). Checks: (240) write content dash-form → resolved + kind=
  escape line (byte-exact); (241) edit oldString+newString numword-form →
  both resolved + numword observation on the original arg; (242) unmarked
  pair-form content → NOT resolved (args byte-identical, pair line only);
  (243) invalid safe form → untouched (zero lines); (245→labeled 245)
  sentinel form in a read/write PATH → path channels treat it as plain text
  (read: ONE fuzzy-rejected line — the channel ran normally; write: zero
  lines — M1; zero kind=escape); (245 case) case variants ESC/Escape/
  escape → all resolved (3 kind=escape lines, hits=3). — committed at
  planner emergency checkpoint 67ccd73 (the section was in the working
  tree at the stop line; the planner carried it)
- `primer.md` "Where it applies" — the escape block (form, example
  `[316:3-2-0:esc]` → `320`, content scope, case variants) + the NO-bullet
  gains the "except the escape, below" pointer so the section stays
  accurate. — THIS commit
- `decision-record.md` §4 — ONE line appended to the AGENTS.md paste-draft
  fenced block naming the content escape (the maintainer's paste stays his).
  — THIS commit

## Measured verification (verbatim, final session, current tree)
- `PROBE handover: 235/235 PASS` — agrees with the header annotation
  (`... S21=12 S22=9 S24=6 hygiene=6 → "PROBE handover: 235/235 PASS"`;
  the section-sum total was machine-computed, never retyped).
- All 9 smokes green: `BT-SANDBOX-SMOKE: ALL PASS (52/52)`; `BLOCK_TRANSFER_
  SMOKE: ALL PASS (22/22)`; `COMPACT_MEMORY_SMOKE: ALL PASS (46/46)`;
  `CONTEXT_RECOVERY_SMOKE: ALL PASS`; `CTX_GAUGE_SMOKE: ALL PASS (3/3)`;
  `GAUGE_CORE_SMOKE: ALL PASS`; `INTERCEPT_OBSERVER_SMOKE: ALL PASS (39/39)`;
  `LOOP_LOG_SMOKE: ALL PASS (24/24)`; `SUBMIT_SMOKE: ALL PASS (20/20)`.
- `459 passed, 1 warning in 2.01s` (pytest -q, venv).
- `All checks passed!` (ruff check --select F ., exit 0).
- DoD grep: `grep -n "esc" intercept_observer_core.ts` → ESCAPE_RE +
  resolveEscapeSafe over the shared map (no hardcoded numeral tables).

## Commits
- 4e2fd0c — core + observer + smoke + handover(IN PROGRESS checkpoint)
- 67ccd73 — S24 probe section (planner emergency checkpoint) + session dump
  + NAP/loop state
- this bookkeeping commit — primer + decision-record + this file (its hash:
  the commit whose tree carries this file, subject "handover: #0 numword
  escape complete — docs + final summary").

## TODO entries
- None new (spec: #0 is not a TODO ID). No todo_inbox additions — nothing
  out-of-scope found beyond what was already recorded (the S23 inline-label
  quirk is spec-named and left untouched by design).

## Deviations
- Check 245 redesign (the notable one): the spec's suggested fixture
  (a real on-disk `file-[4:four:esc].txt`) is INFEASIBLE on NTFS — after
  the first colon the rest of the name parses as an alternate-data-stream
  name, which may not carry a SECOND colon → `ENOENT` on create (measured).
  Reworked: the sentinel form rides a NON-EXISTENT path arg (dash-digit safe
  form `4-4`, keeping the numword observation quiet); the pin proves the
  same ruling — path channels treat the form as plain text (read: exactly
  one fuzzy-rejected line, the channel ran normally; write: zero lines per
  M1; args byte-identical; zero kind=escape lines).
- Session incidents: the sandbox-path stop (W→A bit-shift) and the
  context_length_exceeded cross-compaction — both resumed from committed
  state; nothing was lost (the S24 section rode the planner's checkpoint).
- Carried from the IN-PROGRESS checkpoint: worker-1's claimed 239/239 probe
  total vs the committed annotation's 229 — the spec baseline (229) was the
  authority; 239 is the last S23 RUN ID (the inline-label quirk).
- Smoke positive check pins 3 lines (2 escape + 1 numword observation on
  the ORIGINAL argStr) — consistent with "field 5 = original arg" + the
  observation channel logging incident data.

## Deliberately NOT done
- Deferred A/B proposal items (not in v1). No live-listener / real-input
  verification (repo safety limit). No AGENTS.md edit (the paste draft in
  decision-record §4 only — his paste). No FST product (Python) changes.
- The loop folder's `loop_log.md` DONE line for this task was appended
  (append-only) but NOT staged — the loop file is the planner/looprunner's
  committed channel; carry it with your bookkeeping.
