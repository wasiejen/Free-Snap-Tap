# block_transfer v2 S3 — WRITE + PEEK + unified Part F feedback (2026-09-26)

## The unified Part F feedback line (all modes)
- **Do:** every mode returns one line per op: `<Verb> <N> line(s) <phrase> (lines <range>, first: '<echo ≤40 chars>')` + for BUFFER ops a `- buffer: <M> line(s)` tail (the buffer's line count AFTER the op). Concrete shapes (probe S30 + smokes pin them byte-exact):
  - MOVE: `Moved 4 lines from 'src' to 'dst' (lines 1..4, first: 'AAA start').`
  - CUT: `Cut 2 lines from 'src' into buffer 'b' (lines 2..3, first: 'line1') - buffer: 2 lines.`
  - DELETE: `Deleted 2 lines from 'src' (lines 2..3, first: 'line1').`
  - PASTE: `Pasted 2 lines from buffer 'b' into 'dst' (lines 1..2, first: 'line1') - buffer: 2 lines.` (range = the buffer's OWN lines 1..N; echo = the buffer's first line)
  - REPLACE: `Replaced 2 lines in 'dst' with buffer 'b' (lines 2..3, first: 'NEW') - buffer: 2 lines.` (range = the replaced span; echo = the buffer's first line = the new content)
  - WRITE: `Wrote 2 lines to 'dst' (lines 2..3, first: 'NEW one').` — multi-region = one line per applied op (DESCENDING) + a summary line `Wrote 2 regions into 'dst' (2 lines total).`
  - CLEAR: `Cleared buffer 'b' - buffer: 0 lines.`
  - COPY/APPEND (S2, unchanged): `Copied 4 lines from 'src' into buffer 'b' (lines 2..5, first: 'E') - buffer: 4 lines.`
  The shared helper is `opLine(verb, count, phrase, rangeText, firstLine, bufferAfter)` in the tool file (bufferAfter = null for non-buffer ops).
- **Why (evidence):** built 2026-09-26 per the approved proposal `2026-09-25_block_transfer-v2.md` Part F (unit S3); verified: smokes 112/112 + 61/61, probe S30 (305-315) + the S15 re-pins (108/110/111/115/116/117/262/263), gate green.
- **Ref:** worker-20 (worker_Q3S_245K_slow) session 2026-09-26 (bt-v2 S3); `.opencode/tools/block_transfer.ts` (the `opLine` helper + the per-mode returns).
- **Keys:** block_transfer, Part F, feedback, opLine, one line per op.

## WRITE mode (Part D) — the bufferless text → region write
- **Do:** `WRITE` = `dstFile` + `text` + ONE span (`startMarker`..`endMarker`, marker-or-number) OR a `regions` LIST of `{ start, end }` objects (all resolved against the PRE-call file state, applied HIGHEST LINE first — no shifting; an overlap of ANY line → `Error: overlapping spans (lines 2..4 and 3..5) in 'dst'.` — the lower span named first). WRITE CREATES the target file if absent: there is NO missing-file guard — an absent file is the EMPTY state for ref resolution (the teaching not-found / out-of-range errors fire as usual, with the file reference), and a successful write creates the file (mkdir + write, like PASTE). PASTE's behavior is unchanged.
- **Why (evidence):** flagged detail #2 of the proposal, approved by the maintainer ("in line with the write tool file creation ability"); implemented 2026-09-26 (unit S3), pinned by probe 305-309 + the smoke D pins.
- **Ref:** worker-20 session 2026-09-26; `.opencode/tools/block_transfer.ts` (the WRITE dispatch block, after REPLACE).
- **Keys:** block_transfer, WRITE, regions, overlap, bufferless, file creation.

## PEEK mode (Part E) — the bounded buffer preview
- **Do:** `PEEK` = `bufferName` (+ optional `from` + `count`, given TOGETHER — either side alone → `Error: 'from' and 'count' must be given together.`). Default = the line count + 3 head + 3 tail NON-BLANK lines, each echoed capped at 40 chars: `Peeked buffer 'b': 8 lines — head: 'a', 'b', 'c' ... tail: 'x', 'y', 'z'` (blank lines are SKIPPED when picking the echoed lines). The `from`+`count` window is capped at 25 lines and echoes the window's lines verbatim (blanks included, as `''`): `Peeked buffer 'b': lines 5..7 of 30 — 'L5', 'L6', 'L7'`. `from` beyond the buffer → the buffer-specific out-of-range error (`Error: line 99 is out of range in buffer 'b' (the buffer has 8 lines).` — NOTE: the settled file-version `refOutOfRangeError` still says "the file has N lines" — the PEEK branch has its own buffer-worded variant). Empty/absent buffer → the verbatim empty-buffer error. The description carries the boundary sentence: "full content: PASTE it to a file and read."
- **Why (evidence):** proposal Part E, built 2026-09-26 (unit S3), pinned by probe 310-312 + the smoke E pins.
- **Ref:** worker-20 session 2026-09-26; `.opencode/tools/block_transfer.ts` (the PEEK dispatch block, after CLEAR).
- **Keys:** block_transfer, PEEK, head/tail, from/count, 25 cap, blank skip.

## The v2 teaching error formats (the S1-deferred switch, landed in S3)
- **Do:** the `non-unique` error carries the match count + the FIRST match line numbers (up to 3 listed, ` …` when more): `Error: Start marker 'DUP' is not unique in 'f.txt' (2 matches: lines 2, 4).` The extraction end-before-start branch (COPY/APPEND + MOVE/CUT/DELETE) now CARRIES THE FILE REFERENCE: `Error: End marker 'ZZ' not found after start marker in 'f.txt'.` The `not-found` format is unchanged (`Error: Start marker 'X' not found in 'f.txt'.`). NOTE: the REPLACE-side start-after-end branch keeps its OWN message (`Error: Start marker 'X' is after end marker 'Y' in 'dst'.` — already file-referenced, smoke-pinned) — the switch deliberately did not unify the two end-before-start wordings.
- **Why (evidence):** proposal Part A taxonomy ("non-unique: match count + the first match line numbers"); deferred in S1 (probe 263 pinned the legacy byte form), performed in S3 with the probe 115/263 + smoke re-pins in the same commit.
- **Ref:** worker-20 session 2026-09-26; `.opencode/tools/block_transfer.ts` (`nonUniqueError` now takes the match list; the two end-before-start branches).
- **Keys:** block_transfer, non-unique, match count, end-before-start, file reference, teaching error.
