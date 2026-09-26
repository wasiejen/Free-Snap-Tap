# HANDOVER — block_transfer v2, unit S1 (Part A: unified anchor rule) — 2026-09-26

Worker: worker_Q3S_245K_slow, session ses_f249c8026ffeIXec8cQW3sInJ7.
Commit: the single commit of this task adds exactly the files below (tool + two
smoke files + this handover + the loop-log/feedback/todo lines) — verify the
hash with `git log -1` (reported in the closing message). No other file
touched. Stayed on `opencode_test` as instructed.

## Deliverable

`.opencode/tools/block_transfer.ts` — ONE rule for all modes:

1. **`resolveAnchor(fileText, anchor): number | null`** — exported, pure: the
   1-based line number of the EXACT ONE match, else null. The rule lives in
   its matcher **`matchAnchorLines(fileText, anchor): number[]`** (also
   exported — returns ALL match line numbers; `resolveAnchor` is the
   exactly-one contract on it). The matching rule (prefix after leading
   spaces/tabs trim, case-sensitive, anchor used as typed, CRLF-tolerant,
   longer-line-prefix matches, exactly-one) is implemented in
   `matchAnchorLines` ONLY — the one swappable place, per the approved
   proposal Part A.
2. **All modes route through it** — every startMarker / endMarker /
   targetMarker lookup (PASTE, REPLACE, MOVE, COPY, CUT, DELETE) goes
   through `resolveAnchorOrError` (internal helper: resolveAnchor + the
   teaching error on failure). Grep-verified: the only remaining
   `startsWith` in the file are the sandbox guard (L18) and the matcher
   itself (L53). Removed per spec: COPY's mid-line substring tolerance
   (approved decision), REPLACE's bare startsWith (no leading-whitespace
   trim), the per-mode duplicate findIndex/filter logic.
3. **Error taxonomy** (one line each, teaching): `not-found` (anchor quoted,
   with the file) / `non-unique` (anchor quoted, with the file — legacy byte
   form, see "Deviations") / `empty-buffer` (kept verbatim) /
   `ref-out-of-range` — PREPARED as exported `refOutOfRangeError(fileRef,
   lineNo, lineCount)` per spec: the text exists now, wiring lands with the
   Part B/C refs. Out-of-sandbox stays out of the taxonomy (intercept
   plugin's layer); `sandboxCheck` unchanged.
4. **Pins** — `block_transfer.smoke.mjs` gained 15 checks (10 own
   `resolveAnchor` pins: lineNo, leading-whitespace trim, anchor-as-typed,
   case-sensitivity, CRLF tolerance, longer-line prefix, mid-line NO,
   not-found null, non-unique null; + 5 taxonomy pins via execute():
   not-found, non-unique start, non-unique end, legacy end-before-start,
   PASTE targetMarker not-found no-silent-append). `block_transfer.sandbox.
   smoke.mjs`: ONE re-pin (the missing-end-marker error now carries the file
   — semantic kept, old "after start marker" wording dropped for the true
   not-found case). All 30 existing smoke pins stayed green UNMODIFIED.

## Verification (measured this session, standard gate)

- `block_transfer.smoke.mjs`: **45/45 ALL PASS** (30 existing + 15 new).
- `block_transfer.sandbox.smoke.mjs`: **53/53 ALL PASS**.
- Probe: `PROBE handover: 297/297 PASS` (no probe check added, none broken).
- pytest: **459 passed, 1 warning**. ruff F: **0** ("All checks passed!").
- DoD behavior check: single-ref calls byte-identical vs today EXCEPT the
  flagged/approved changes (below); the probe's byte-exact pins (incl. 114,
  115, 262, 263) are the proof of the byte-identical paths.

## Deviations / notes for the planner (spec-claim conflicts found)

1. **Probe 263 + the spec's richer non-unique format conflict** (the one
   real discrepancy): the spec's taxonomy says `non-unique` carries "match
   count + the first match line numbers", but probe 263 pins byte-exact
   `Error: Start marker 'DUP' is not unique in bt/bt-rep-nq.txt.` — probes
   are do-not-touch this unit (probe section = S3) and the gate must stay
   297/297. Resolution: kept the legacy byte-exact form (in
   `nonUniqueError`), the count/first-match-lines detail is deferred to the
   S3 probe re-pin. **TODO-inbox entry filed** (dated 2026-09-26) with the
   exact strings, scope, and acceptance for the S3 switch.
2. **Probe 115 pins the legacy end-before-start error** — likewise kept
   byte-exact (`Error: End marker '...' not found after start marker.`) for
   the extraction modes when the end resolves BEFORE the start (both markers
   resolve file-wide under the unified rule). Its not-found twin now uses the
   unified `not found in <file>` string (one sandbox re-pin).
3. **PASTE/MOVE targetMarker no longer silently appends at EOF** when the
   marker is absent — it now returns the not-found error (spec item 2 names
   targetMarker for routing; the old silent-append was the old per-mode
   logic). No pin/probe covered the old silent path; new smoke pin covers
   the error.
4. One own-pin bug caught by the first green run (bad case-sensitivity
   fixture — anchor "two" matched the lowercase line it was meant to miss);
   fixed fixture, re-ran green.

## Deliberately NOT done

- No description change (Part I is separate; the probe + sandbox smoke pin
  the one-liner verbatim).
- No probe edits (S3), no Part B/C refs, no APPEND/WRITE/PEEK/MAP modes, no
  feedback-redesign (Parts F/I), no opencode.jsonc / maintainer / FST code /
  knowledge-file edits. `refOutOfRangeError` is un-wired by design.

## Friction check (#53)

Filed via submit: the `/tmp` intercept (POSIX `/tmp` under Git-Bash resolves
outside the sandbox — scratchpad is `$TMP/opencode` only). Everything else
went clean; the spec's verified scope state held exactly (line counts,
pin counts, branch).

Gauge (verbatim, before commit):
`SESSION=ses_f249c8026ffeIXec8cQW3sInJ7 CTX=87386 (35%) REM=157614 | 1 compactions left`

Lessons: when a spec names a richer error format, grep the probe for the
old byte-exact string FIRST — the probe section is the immovable constraint
in v2 waves (this will recur for Parts B–F error/feedback formats).
