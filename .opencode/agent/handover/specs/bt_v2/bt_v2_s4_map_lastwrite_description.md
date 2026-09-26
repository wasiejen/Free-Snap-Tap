# Task spec S4 — block_transfer v2 Parts G+H+I: MAP + last_write + description

Goal: the Wave-2 additions (MAP structure preview, the `last_write`
auto-buffer) and the Part I description rework — per the approved
proposal `.opencode/proposals/approved/2026-09-25_block_transfer-v2.md`.
Built ON TOP of S1+S2+S3 (all core parts settled — do not touch
them). This is the LAST build unit; the new-hire + held-out
verification is PLANNER-side AFTER this unit (see DoD).

## Scope (verified state at spec time — S1+S2+S3 landed)
- The tool: `.opencode/tools/block_transfer.ts` (post-S3; modes
  MOVE/COPY/APPEND/CUT/PASTE/REPLACE/WRITE/PEEK/DELETE/CLEAR).
- Pins: the two smoke files under `.opencode/plugin/tests/`.
- Read the post-S3 tool file fully (small) + the current tool
  description text in the file. No SDK research.

## What to build
1. **G. `MAP` mode** — buffer structure: line count + head 3 + tail 3
   + a HEADING SKELETON (max ~10 headings, then `+N more`), lines
   echoed VERBATIM WITH line numbers. Detection rule narrow +
   documented: `^#{1,6} ` at column 0 (markdown H1-H6; indented `#`
   EXCLUDED). No file-type sniffing — a `#` comment in a code buffer
   is self-evident from the verbatim echo; a one-line caveat in the
   description.
2. **H. `last_write` auto-buffer.** block_transfer's OWN WRITE text
   is auto-stored in a buffer named `last_write` (overwritten per
   WRITE; automatic, NO parameter — poka-yoke) for direct reuse when
   anchor resolution fails. (Journal-COLLECT stays DEFERRED — not
   here.)
3. **I. Description rework** of the tool's description, per the
   handout ordering (`knowledge/plugin_tools/2026-09-18_tool-plugin-
   design-handout.md`): what / when / when-NOT / a copy-pasteable
   example / edge cases. Sharpened boundary vs `edit`: edit = exact
   `oldString` match (string-level); block_transfer = line-anchored
   (ASCII-safe — no non-ASCII / dense-numeral oldString problems).
   The final mode set in the description: MOVE, COPY, APPEND, CUT,
   PASTE, REPLACE, WRITE, PEEK, MAP, DELETE, CLEAR.
4. Pins in the smoke: MAP skeleton + the ~10 cap + verbatim echo with
   line numbers + indented-`#` exclusion; `last_write` store +
   overwrite.

## Definition of done
- Both smokes ALL PASS (existing + new pins). Standard gate green per
  `repo_commands.md` (probe count unchanged — this unit adds NO probe
  checks; pytest 459+1w; ruff F=0).
- The description covers every mode + the boundary vs edit + the
  PEEK "full content" boundary sentence.
- Checkpoint: ONE green commit (code + pins). TODO + handover ride
  the final commit.
- **PLANNER-SIDE (not yours):** the new-hire test (a fresh agent uses
  every mode from the description ALONE — file-blind task) + the
  held-out multi-step task (assemble a 3-section file from two
  sources via COPY-list + APPEND, then a 2-region WRITE-list, verify
  via PEEK/MAP; measure tool calls / errors / tokens, read the raw
  transcript) — the planner launches these after verifying this unit.

## Do-NOT-touch
`.opencode/maintainer/**`, `opencode.jsonc`, FST product code, other
tools/plugins, the S1-S3 logic (wrong behavior? STOP and say so in
your handover).

## Worker
`worker_Q3S_245K_slow` (same-model, serial slot).
