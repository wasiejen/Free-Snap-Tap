# Task spec S3 — block_transfer v2 Parts D+E+F: WRITE + PEEK + feedback complete

Goal: the bufferless WRITE mode (direct text -> line-anchored region),
the bounded PEEK buffer preview, and the Part F feedback redesign
COMPLETE for all modes + a new probe section — per the approved
proposal `proposals/approved/2026-09-25_block_transfer-v2.md`.
Built ON TOP of S1+S2 (anchor rule + refs/assembly are settled — do
not touch them).

## Scope (verified state at spec time — S1+S2 landed)
- The tool: `.opencode/tools/block_transfer.ts` (post-S2; modes
  MOVE/COPY/APPEND/CUT/PASTE/REPLACE/DELETE/CLEAR).
- Pins: the two smoke files under `.opencode/plugin/tests/`.
- Probe: `.opencode/plugin/probes/handover_probe.mjs` (append-only
  section per the established numbered-check pattern; current count
  297/297).
- Read the post-S2 tool file fully + the probe file's LAST section
  (bounded read: tail, ~60 lines) to copy the check pattern. No SDK
  research.

## What to build
1. **D. `WRITE` mode** — replace a line-anchored region with direct
   text (bufferless — "no DELETE + extra write call").
   - Single ref (startMarker..endMarker form, marker-or-number per
     S2) OR a LIST of regions.
   - LIST form: ALL refs resolved against the PRE-call file state,
     applied HIGHEST LINE -> LOWEST (no shifting); an overlap check —
     error text `overlapping spans (lines 12..40 and 30..55)`
     (teaching, with the ACTUAL line numbers).
   - WRITE CREATES the target file if absent (flagged detail #2,
     approved); PASTE's existing behavior is unchanged.
2. **E. `PEEK` mode** — bounded buffer preview, NEVER the full
   buffer: default = the buffer's line count + 3 head + 3 tail lines
   (each echoed capped ~40 chars; BLANK LINES SKIPPED when picking
   echoed lines); optional `from` + `count` giving a bounded window
   (capped ≤25 lines). Boundary sentence in the description: "full
   content: PASTE it to a file and read."
3. **F. Feedback redesign — ALL modes.** One line per op: resolved
   line range + line count + truncated first-line echo (~40 chars);
   buffer ops add the buffer's line count AFTER the op; multi-op WRITE
   = one line per applied op (descending) + a summary line; errors
   teach (the S1 taxonomy). Finalize for every mode that S1/S2 left
   on the old shape (MOVE/CUT/PASTE/REPLACE/DELETE/CLEAR).
4. **Probe section** in `handover_probe.mjs` (append-only, numbered
   checks per the existing pattern): the new WRITE/PEEK surface +
   the unified feedback shapes (a few pins per mode — the smoke
   carries the breadth).
5. Pins in the smoke: WRITE single + LIST descending + overlap error;
   PEEK shape + blank-skip + window cap; feedback line shapes (all
   modes).

## Definition of done
- Both smokes ALL PASS (existing adapted where the feedback shape
  changed — re-pin convention: semantic kept, not the old string) +
  new pins.
- Probe = 297 + your new checks, ALL PASS (report the measured
  count). pytest 459+1w, ruff F=0.
- Existing single-ref calls keep byte-identical input forms and
  behavior vs S2 (compatibility rule).
- Checkpoint: ONE green commit (code + pins + probe section). TODO +
  handover ride the final commit.

## Do-NOT-touch
`.opencode/maintainer/**`, `opencode.jsonc`, FST product code, other
tools/plugins, the S1/S2 anchor+ref logic (wrong rule? STOP and say so
in your handover).

## Worker
`worker_Q3S_245K_slow` (same-model, serial slot).
