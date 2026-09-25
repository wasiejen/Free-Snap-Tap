# Proposal: block_transfer v2 — unified refs, assembly, WRITE, PEEK/MAP, feedback redesign

**Status: AWAITING APPROVAL** (filed 2026-09-25, planner-17; direct design
session `ses_f27282d2dfferl9gScrfLt2AxV`, 5 rounds with the maintainer;
interface rules per `knowledge/plugin_tools/2026-09-18_tool-plugin-design-
handout.md`; his idea basis: `maintainer/draft/block_transfer_tool/
2026-09-25_15-23-upgrade.md`).

## Problem
Measured this session (planner-17 usage):
1. **Anchor-matching inconsistency**: COPY accepted an anchor appearing
   mid-line (substring), while REPLACE with the SAME string failed until
   the exact leading-space prefix was supplied — the documented contract
   is "short unique line prefix", the implementation deviates per mode
   (friction entry `fa6fb38`).
2. **No direct text→buffer path**: composing a one-line replacement
   required a scratchpad temp file + COPY round-trip (no way to put text
   into a buffer directly; no append/assembly across calls).
3. **Buffer content is invisible**: feedback carries counts only
   (`Copied 46 lines ...`) — no line ranges on COPY/PASTE, no way to see
   what a buffer holds without PASTE-ing to a file and reading it
   (section identity had to be verified by re-reading the source file).

## Design (parts are independently approvable)
**Wave 1 — core:**
- **A. Anchor semantics: one rule, all modes.** Recommended: line-
  *prefix*, whitespace-trimmed, case-sensitive; unique match required.
  Error taxonomy (one line each, teaching): `not-found` (marker quoted) /
  `non-unique` (match count) / `empty-buffer` / `out-of-sandbox`.
  (Aligns implementation with the documented contract; changes the
  current COPY substring-tolerant matching — flagged as a decision.)
- **B. Line-number references.** Each side of a block ref is a marker
  string OR an integer line number (1-based, absolute) — type-
  disambiguated at the schema level (poka-yoke). Single ref or list.
- **C. Assembly.** `COPY` accepts a LIST of refs (or a `text` key):
  sections are appended to the buffer joined by EXACTLY ONE newline
  (default, no parameter; documented). `COPY` keeps today's REPLACE
  semantics. New mode **`APPEND`** (same ref-or-text input): appends to
  the buffer, creates it if absent — stepwise assembly without flags.
- **D. `WRITE` mode** — replace a line-anchored region with direct text
  (bufferless; his "no DELETE + extra write call"). LIST form: ALL refs
  resolved against the pre-call file state, applied HIGHEST LINE →
  LOWEST (no shifting), with an overlap check (`overlapping spans (lines
  12..40 and 30..55)`). Flagged detail: WRITE creates the target file if
  absent (PASTE's existing behavior unchanged).
- **E. `PEEK` mode** — bounded buffer preview, NEVER the full buffer:
  default = line count + 3 head + 3 tail lines (each capped ~40 chars,
  blank lines skipped when picking echoed lines); optional `from` +
  `count` (capped ≤25) bounded window. Boundary in the description:
  "full content: PASTE it to a file and read."
- **F. Feedback redesign (all modes).** One line per op: resolved line
  range + line count + truncated first-line echo (~40 chars); buffer ops
  add the buffer's line count AFTER the op; multi-op WRITE = one line per
  applied op (descending) + a summary line; errors teach (Part A).
- **I. Description rework** per the handout ordering (what / when /
  when-NOT / copy-pasteable example / edge cases); sharpened boundary vs
  `edit`: edit = exact `oldString` match (string-level), block_transfer
  = line-anchored (ASCII-safe — no non-ASCII/dense-numeral oldString
  problems).

**Wave 2 — additive:**
- **G. `MAP` mode** — buffer structure: line count + head 3 + tail 3 +
  heading skeleton (max ~10, `+N more`), lines echoed VERBATIM with line
  numbers. Detection rule narrow + documented: `^#{1,6} ` at column 0
  (markdown H1–H6; indented `#` excluded). No file-type sniffing — a `#`
  comment in a code buffer is self-evident from the verbatim echo;
  one-line description caveat.
- **H. `last_write` auto-buffer** — block_transfer's own WRITE text is
  auto-stored in the `last_write` buffer (overwritten per WRITE;
  automatic, no parameter — poka-yoke) for direct reuse when anchor
  resolution fails. Built-in write/edit calls are already captured by
  the R6 journal (`journal_write/edit.log`) — journal-as-source
  (COLLECT-from-journal) stays DEFERRED (separate decision, R6 family).

**Deferred (separate decisions, agreed):** in-line fuzzy anchors (too
much work for small gain — revisit if long-line cases surface);
journal-COLLECT (see H); his #8 failed-write buffering (R8 family).

## Compatibility
Single-ref calls keep byte-identical input forms and behavior (zero
migration); the 7 existing mode names survive (MOVE, COPY, CUT, PASTE,
REPLACE, DELETE, CLEAR); existing pins (block_transfer 30/30 + sandbox
53/53) stay green; the final mode set: MOVE, COPY, APPEND, CUT, PASTE,
REPLACE, PEEK, MAP, DELETE, CLEAR.

## Acceptance
- Existing pins unchanged/green; new pins per part (A: prefix rule +
  not-found/non-unique errors; B: number-refs; C: COPY-list join + APPEND
  create/append; D: WRITE single + list descending + overlap error;
  E: PEEK shape + blank-skip + window cap; F: feedback line shapes;
  G: MAP skeleton + cap; H: `last_write` store/overwrite) + a new probe
  section (append-only, established pattern) + standard gate green.
- **Verify before done (handout):** ≥ one multi-step HELD-OUT task
  (e.g. assemble a 3-section file from two sources via COPY-list +
  APPEND, then a 2-region WRITE-list, verify via PEEK/MAP), measuring
  tool calls / errors / tokens; read the raw transcript; the description
  passes the new-hire test (a fresh agent can use every mode from the
  description alone).

## Flagged details (recommendations — veto on review)
1. Part A rule = prefix + whitespace-trim + case-sensitive (vs the
   current mixed behavior).
2. Part D: WRITE creates the target file if absent.
3. Part H: the buffer name `last_write` (placeholder — any stable name).
