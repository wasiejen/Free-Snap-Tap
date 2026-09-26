# HANDOVER WORKER → PLANNER — bt-v2 S4 (MAP + last_write + description rework)

Worker-21 (`worker_Q3S_245K_slow`, ses_f22c5c7fdffeNsWFzlfdsFterN),
2026-09-26. Task: `.opencode/agent/handover/handover_task.md` (the S4 spec —
Parts G+H+I, the LAST build unit of the block_transfer-v2 wave).

## What changed (ONE code commit: `37c2479`)
- `.opencode/tools/block_transfer.ts` —
  - **G. `MAP` mode** — buffer structure preview: line count + head 3 +
    tail 3 + a HEADING SKELETON (max 10, then `+N more`). Lines echoed
    VERBATIM WITH line numbers (no 40-char cap, blank lines kept).
    Headings = `^#{1,6} ` at column 0 (markdown H1–H6; indented `#`
    EXCLUDED) — no file-type sniffing. Byte-exact shape:
    `Mapped buffer 'b': N line(s) — head: 1: '…', 2: '…', 3: '…' ... tail:
    N-2: '…', N-1: '…', N: '…' — headings: <entries | (none)>`.
    Format decisions (proposal left them open — all byte-pinned): the tail
    never overlaps the head (N ≤ 6 → tail = only the lines beyond the
    head); N ≤ 3 → no tail part; zero headings → `(none)`; cap suffix
    `+N more` (N = the remainder beyond the first 10).
  - **H. `last_write` auto-buffer** — every successful WRITE auto-stores
    its `text` (its lines) in the buffer `last_write`, OVERWRITTEN per
    WRITE. Automatic, NO parameter (poka-yoke). **Silent**: the
    probe-pinned WRITE feedback line is byte-unchanged (probes 305–309
    still pass); documented in the description + the `bufferName` arg.
    An explicit `bufferName` arg does NOT divert the auto-store (pinned).
  - **I. Description rework** per the handout ordering (the
    `2026-09-18_tool-plugin-design-handout.md` checklist): what / WHEN /
    WHEN-NOT lead — WHEN-NOT carries the sharpened boundary vs `edit`
    (edit = exact `oldString` match, string-level; block_transfer =
    line-anchored, ASCII-safe — no non-ASCII / dense-numeral oldString
    problems) + the `write` boundary (whole-file rewrite). MODES covers
    the FINAL 11-mode set (MOVE, COPY, APPEND, CUT, PASTE, REPLACE,
    WRITE, PEEK, MAP, DELETE, CLEAR) incl. the MAP indented-`#` caveat and
    the last_write note; the PEEK "full content: PASTE it to a file and
    read." boundary sentence kept; EXAMPLE moved before EDGE (handout
    order); EDGE's empty-buffer list gains MAP. The pinned first
    one-liner kept byte-identical (sandbox smoke pin 55).
  - Schema: mode enum gains MAP (11 values, spec order); the mode
    one-liner gains MAP + the WRITE last_write note; `bufferName`
    description notes the `last_write` auto-fill.
- `.opencode/plugin/tests/block_transfer.smoke.mjs` — 11 new checks:
  G ×6 (schema MAP; MAP skeleton byte-exact with a >40-char verbatim line
  + the indented-`#` exclusion; the 11-heading cap → first 10 + `+1 more`;
  narrow detection `#tight`/indented excluded; N ≤ 3 short-buffer shape;
  absent-buffer error) + H ×5 (store; overwrite; feedback-line-unchanged;
  explicit-bufferName no-divert; the explicit buffer untouched).
- `.opencode/plugin/tests/block_transfer.sandbox.smoke.mjs` — the
  description mode-list pin RE-PINNED in place to the final 11-mode set
  (was 8 modes; same semantics — "the description names mode X", no new
  check type).

## Measured verification (standard gate, post-commit `37c2479`)
- Probe: **316/316 PASS** — UNCHANGED (this unit adds no probe checks;
  existing 316 all pass, incl. the WRITE feedback 305–309).
- block_transfer smoke: **123/123** (baseline 112 + 11); sandbox smoke:
  **64/64** (baseline 61 + 3 from the re-pinned mode list).
- pytest **459 passed + 1 warning** (the known #10); ruff **F=0**.
- Baselines re-verified PRE-EDIT per the spec: probe 316/316, smokes
  112/112 + 61/61, pytest 459+1w, ruff F=0 — all matched the spec's
  numbers (no stale baseline this time).

## TODO entries
- 1 loose entry appended to `todo_inbox.md`: probe 3483's mode-enum pin
  still lists the pre-S4 10 values (MAP un-pinned at probe level; the
  spec forbade new probe checks in S4). Awaiting planner curation.

## Notes / deliberately not done
1. **Re-pins flagged for ratification:** the sandbox smoke mode-list pin
   (8 → final 11 modes) — same semantics, no new check type; the 11 new
   main-smoke checks are the spec-mandated G/H pins. No other pins were
   stale under this build (nothing else re-pinned).
2. **Probe untouched** (count 316 unchanged, per spec). MAP is pinned at
   smoke level only; probe 3483's enum list is now a SUBSET of the real
   enum (still green — superset check). See the todo_inbox entry.
3. **`last_write` is silent by design** — the WRITE feedback line is
   probe-pinned (305–309), so the auto-store carries no feedback note;
   the description + the `bufferName` arg document it. If the planner
   wants a feedback note, that requires re-pinning the WRITE probes
   (separate decision).
4. **Journal-COLLECT stays DEFERRED** (not in this unit, per spec — the
   R6 family).
5. **S1–S3 logic untouched** — no edits in the shared anchor/ref code;
   the only execute-path changes are the new MAP dispatch block and the
   one `clipboardBuffers["last_write"]` line in WRITE (after the
   successful fs write). No disagreement with the settled logic found.
6. **PLANNER-SIDE (per spec, not done here):** the new-hire test (a
   fresh agent uses every mode from the description alone, file-blind) +
   the held-out multi-step task (3-section assembly via COPY-list +
   APPEND, then a 2-region WRITE-list, verify via PEEK/MAP; measure
   tool calls / errors / tokens, read the raw transcript).

## Friction
- 1 entry via `submit(feedback=...)` to `agent_feedback.md`: the spec
  cited the approved proposal as `proposals/approved/…` — it lives at
  `.opencode/proposals/approved/` (not under `.opencode/agent/`); a
  `find` was needed to locate it.

## Lessons
- When a feedback line is probe-pinned, a new side-effect (auto-buffer)
  rides SILENTLY + gets documented in the description — the description
  is the contract surface, the probe pins the byte shapes.

## Context
Stop-line discipline kept (gauged between units; no compaction needed).
Final gauge readout (VERBATIM):
`SESSION=ses_f22c5c7fdffeNsWFzlfdsFterN CTX=95877 (39%) REM=149123 | 1 compaction left`
