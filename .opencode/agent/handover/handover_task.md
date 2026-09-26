# Task spec S2 — block_transfer v2 Parts B+C: line-number refs + assembly

Goal: block references may be line NUMBERS (not just marker strings),
and buffers can be composed directly (COPY-list / `text` key / new
APPEND mode) — the "no scratchpad round-trip" path from the approved
proposal `proposals/approved/2026-09-25_block_transfer-v2.md`
(Parts B+C). Built ON TOP of S1 (Part A `resolveAnchor` — the
matching rule is settled; do not touch it).

## Scope (verified state at spec time — S1 landed)
- The tool: `.opencode/tools/block_transfer.ts` (post-S1; modes
  MOVE/COPY/CUT/PASTE/REPLACE/DELETE/CLEAR; `resolveAnchor` exported).
- Pins: `.opencode/plugin/tests/block_transfer.smoke.mjs` +
  `.opencode/plugin/tests/block_transfer.sandbox.smoke.mjs`.
- Read the post-S1 tool file fully (small) + the smoke files. No
  SDK research.

## What to build
1. **B. Line-number references.** EVERY side of a block ref
   (startMarker / endMarker / targetMarker — and the new list forms in
   C) is a marker string OR an integer line number (1-based,
   absolute). Type-disambiguated at the SCHEMA level (poka-yoke: the
   schema tells the two apart — no runtime string sniffing). A single
   ref or a list. A numeric ref resolves to that exact line of the
   PRE-call file state (no marker lookup). The S1 `ref-out-of-range`
   error wires in here (line number beyond the file's line count,
   with the count).
2. **C. Assembly.**
   - `COPY` accepts a LIST of refs (marker-or-number each) OR a
     `text` key (direct text -> buffer). LIST: sections are appended
     to the buffer joined by EXACTLY ONE `\n` (default, no parameter;
     document it in the description + code comment). `COPY` keeps
     today's REPLACE-into-buffer semantics for a single ref.
   - New mode **`APPEND`** (same ref-or-text input as COPY): appends
     to the named buffer, creates it if absent — stepwise assembly
     without flags.
   - Per-op feedback per proposal Part F (one line): resolved line
     range + line count + truncated first-line echo (~40 chars);
     buffer ops ADD the buffer's line count AFTER the op. (Full Part F
     for ALL modes is S3 — here, only the ops this unit adds/touches.)
3. Pins in `block_transfer.smoke.mjs`: number refs (single + as list
   items, 1-based, absolute), out-of-range error, COPY-list join
   (EXACTLY one `\n` between sections), COPY `text` key, APPEND create
   + append, feedback line shape for the touched ops.

## Definition of done
- Schema carries the ref type distinction; numeric refs work on all
  ref sides (incl. targetMarker); out-of-range error live.
- COPY-list / text / APPEND work as specced; single-ref calls keep
  byte-identical input forms and behavior vs S1 (compatibility rule).
- Existing pins green + new pins; both smokes ALL PASS.
- Standard gate green per `repo_commands.md` (probe 297/297 — this
  unit adds NO probe checks; pytest 459+1w; ruff F=0).
- Checkpoint: ONE green commit (code + pins). TODO + handover ride
  the final commit.

## Do-NOT-touch
`.opencode/maintainer/**`, `opencode.jsonc`, `.opencode/plugin/**`
except the two smoke files, `.opencode/plugin/probes/**` (S3), FST
product code, other tools/plugins, the S1 `resolveAnchor` rule itself
(if you believe the rule is wrong, STOP and say so in your handover —
do not unilaterally re-derive it).

## Worker
`worker_Q3S_245K_slow` (same-model, serial slot).
