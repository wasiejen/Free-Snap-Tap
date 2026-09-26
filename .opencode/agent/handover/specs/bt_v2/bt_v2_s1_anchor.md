# Task spec S1 — block_transfer v2 Part A: unified anchor rule

Goal: make anchor matching ONE rule for ALL modes — a single exported
pure function with the precisely-defined prefix semantics from the
approved proposal `proposals/approved/2026-09-25_block_transfer-v2.md`
(Part A + his 3 comments addressed). Today the documented contract
("short unique line prefix") deviates per mode (COPY accepts
mid-line substrings, REPLACE needs the exact prefix — friction
`fa6fb38`).

## Scope (verified state at spec time)
- The tool: `.opencode/tools/block_transfer.ts` (219 lines; modes
  MOVE/COPY/CUT/PASTE/REPLACE/DELETE/CLEAR; module-level
  `clipboardBuffers`; `sandboxCheck` helper at ~L11).
- Pins: `.opencode/plugin/tests/block_transfer.smoke.mjs`
  (81 lines, 30/30) and `.opencode/plugin/tests/
  block_transfer.sandbox.smoke.mjs` (166 lines, 53/53).
- Read the tool file fully (it is small) + the two smoke files before
  editing. Do NOT research the SDK — the tool is self-contained
  (no SDK surface used beyond fs + the existing tool() shape).

## What to build
1. Add ONE exported pure function
   `resolveAnchor(fileText: string, anchor: string): number | null`
   (returns the 1-based line number of the EXACT ONE match, else
   null). Isolated, with its own pins — the general behavior (prefix
   -> substring / case-insensitive / fuzzy) must be swappable in
   THIS ONE place without touching the rest of the tool.
   Rule (exactly as approved in the proposal Part A):
   - file split into lines on `\n`; a trailing `\r` on a line is
     ignored for matching (CRLF-tolerant);
   - an anchor A matches line L if L, after removing LEADING
     spaces/tabs, BEGINS with A verbatim (case-sensitive; A is used
     as typed — no trimming of the anchor itself);
   - the line's remainder after A is irrelevant (a longer line still
     matches — that's the prefix);
   - the anchor must match EXACTLY ONE line.
2. Route ALL existing anchor lookups (startMarker / endMarker /
   targetMarker in every mode) through `resolveAnchor` — replacing the
   current per-mode logic (this removes COPY's substring tolerance —
   a flagged, approved decision).
3. Error taxonomy — one line each, teaching (the tool's existing
   error style): `not-found` (the anchor quoted) / `non-unique`
   (match count + the first match line numbers) / `empty-buffer` /
   `ref-out-of-range` (a line-number ref beyond the file's line
   count, with the count). NOTE: Part B/C line-number refs do not
   exist yet — `ref-out-of-range` is prepared for them; implement the
   text now, wire it when refs land. Out-of-sandbox is NOT in this
   taxonomy (handled upstream by the intercept plugin; the existing
   `sandboxCheck` guard stays unchanged as defense-in-depth).
4. Pins: add to `block_transfer.smoke.mjs` — the prefix rule (case
   sensitivity, leading-whitespace trim, CRLF tolerance, longer-line
   prefix match), `not-found`, `non-unique` (count + first match
   lines). Existing pins stay green; where a pin asserts an OLD error
   string that the new taxonomy changes, adapt the assertion minimally
   (re-pin convention — the pin's SEMANTIC is kept, not the old text).

## Definition of done
- `resolveAnchor` exported, own pins present; all modes route through
  it (grep-verify no per-mode duplicate matching logic remains).
- block_transfer smoke ALL PASS (30 existing, adapted where the
  taxonomy changed, + the new pins); sandbox smoke 53/53 ALL PASS.
- Standard gate green per `repo_commands.md` (probe 297/297 — this
  unit adds NO probe checks; pytest 459+1w; ruff F=0).
- Single-ref calls keep byte-identical behavior vs today EXCEPT the
  COPY substring tolerance (approved change).
- Checkpoint: ONE green commit (code + pins + smoke). TODO + handover
  ride the final commit.

## Do-NOT-touch
`.opencode/maintainer/**`, `opencode.jsonc` (maintainer domain — no
registration change needed), `.opencode/plugin/**` except the two
smoke files, `.opencode/plugin/probes/**` (probe section is S3), FST
product code, other tools/plugins, `knowledge/**` (a knowledge entry
goes via the submit todo/knowledge channels if you gain verified
knowledge — the planner curates).

## Worker
`worker_Q3S_245K_slow` (same-model, serial slot).
