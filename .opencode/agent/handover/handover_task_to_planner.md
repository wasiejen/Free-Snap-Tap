# Worker summary — #0 numword escape output (worker-2, ses_f4e084942ffeSedvBfOKl2ehQY, plan2/iter2) — IN PROGRESS (checkpoint)

State at this checkpoint (context-budget early handover, 73% used). If this
session dies, a fresh worker resumes from here.

## Done (verified)
- `intercept_observer_core.ts` — `resolveEscapes(text, map)` + `resolveEscapeSafe`
  (pure, exported): form `[<digits>:<safe-form>:esc|escape>]` (one regex, `i`
  flag — case variants); field 2 = dash-separated single digits OR numwords
  (reuses the existing `resolveNumword` grammar — no second table); invalid
  field 2 → form left byte-identical; returns transformed text + hit list
  (raw + value per hit).
- `intercept_observer.ts` — `runEscapeContent(output, tool)` wired for
  write/edit/block_transfer on the string args `content`/`oldString`/
  `newString` (block_transfer carries none → natural no-op); runs FIRST
  (before the pair observation — Part 3 order); a hit mutates the arg +
  logs ONE 8-field line per hit, verdict `pair-resolved`, evidence
  `kind=escape scope=content orig=<form> value=<digits> hits=<n>` (n = hits
  in that field); nine-verdict vocabulary unchanged (#73 kind=dedup
  precedent). Path fields untouched. Header comments updated (the
  (3a) content-scope guard gains the escape exception; the verdict-vocabulary
  block notes kind=escape).
- `intercept_observer.smoke.mjs` — +2 checks (8h): escape positive (edit
  oldString+newString, numword + dash-digit forms; 3 lines = 2 escape + the
  numword observation on the original arg — observeArg always sees the
  pre-mutation argStr, field 5 stays the original arg via flattenField) +
  escape negative (unmarked `[1:one]` pair-logged only, invalid
  `[316:foo-bar:esc]` untouched). **39/39 GREEN.**
- Probe regression check (no S24 yet): `PROBE handover: 229/229 PASS` —
  agrees with the header annotation (line 611, `S21=12 S22=9 hygiene=6 →
  "PROBE handover: 229/229 PASS"`; note: the S23 submit section is annotated
  as `S22=9` — the pre-existing inline label off-by-one the spec names; do
  not "fix" it).

## Remaining
1. `handover_probe.mjs` — new S24 section (append-only, after the S23
   section, before S5 hygiene; run IDs 240-245, inline labels = run IDs
   (correct, per the spec's quirk note)); 6 checks: (a) write content
   dash-form → resolved + kind=escape line; (b) edit oldString+newString
   numword-form → both resolved (expect the numword observation line on the
   original argStr too — see smoke 8h); (c) unmarked → zero escape lines;
   (d) invalid safe-form → untouched; (e) sentinel form in a read/write
   PATH → path channel outcomes unchanged (byte-identical, no escape line —
   create a real bracketed file `file-[4:four:esc].txt` in ioPfDir so read
   fast-paths); (f) case variants ESC/Escape → resolved. Header: S24
   annotation block after the S23 block (~line 598) + the section-sum line
   611 gains `S24=6` and the total (229+6=235 — machine-verify, never
   retype).
2. `primer.md` "Where it applies" — the escape form block (form,
   `[316:3-2-0:esc]` → `320`, content scope, case variants).
3. `decision-record.md` §4 paste-draft block (the fenced block at ~line
   204-214) — APPEND one line naming the escape form (his paste stays his).
4. Full gate: probe (235/235 + annotation agree) + all 9 smokes (intercept
   39/39) + `pytest -q` (459+1w) + `ruff check --select F .` (0) — commands
   per repo_commands.md. DoD grep: `grep -n "esc" intercept_observer_core.ts`
   map/grammar-driven.
5. Final handover (this file) + code commit + bookkeeping (the #53 Part B
   precedent: one code commit + bookkeeping if it carries its own hash).

## Deviations / notes so far
- Smoke positive check pins 3 lines (2 escape + 1 numword observation) —
  observeNumword sees the `four-two-five` token inside the oldString escape
  form on the ORIGINAL argStr (escape forms are not pair spans). Consistent
  with "field 5 = original arg" + the observation channel logging incident
  data; the pair observation on the field (runPairWrite) sees the RESOLVED
  text (no pair there after resolution).
- worker-1's handover claims a 239/239 probe total; the committed annotation
  + spec baseline + a fresh run all say 229 (239 is the last S23 RUN ID,
  the inline-label quirk). The spec baseline (229) is the authority.
