# TASK SPEC — TODO #94: block_transfer REPLACE mode (line-anchored span replacement from a buffer)

## Goal
Add a `REPLACE` mode to the block_transfer tool: atomically replace the
line-anchored span (startMarker..endMarker inclusive) of ONE file with the
contents of a named clipboard buffer. This gives edit-like region
replacement WITHOUT an exact oldString match (anchors = short unique line
prefixes) and completes the tool's replacement semantics (PASTE is
insert-only). Maintainer-approved 2026-09-25 (REPLACE region mode; PASTE
stays insert; multi-block deferred).

## Verified facts (measured at spec time, 2026-09-25)
- Tool: `.opencode/tools/block_transfer.ts` (176 lines). Mode enum L40:
  `["MOVE","COPY","CUT","PASTE","DELETE","CLEAR"]`; all args optional
  (L41-46); `clipboardBuffers: Record<string,string[]>` module-level (L6);
  `sandboxCheck(cwd, givenPath)` (L11-22) called BEFORE any fs access;
  dispatch = if-chain in execute (CLEAR L56, PASTE L62…).
- PASTE semantics to mirror: missing dstFile →
  `Error: 'dstFile' is required for PASTE mode.`; empty buffer →
  `Error: Clipboard buffer '<b>' is empty. Perform a COPY or CUT first.`;
  the buffer is PRESERVED after the write (not consumed).
- Anchor semantics (existing): short UNIQUE line prefixes; the block spans
  start..end INCLUSIVE; a non-unique anchor → an error naming the cause.
- Smokes (fresh 2026-09-25): `.opencode/plugin/tests/block_transfer.smoke.mjs`
  = 22/22; `block_transfer.sandbox.smoke.mjs` = 52/52.
- Probe: S15 "block_transfer tool (10)" in
  `.opencode/plugin/probes/handover_probe.mjs` (section starts ~L3151);
  probe total baseline **257** (the self-annotated header total is the
  source — machine-verified on your run).
- Tool description L25-38: the MODES/ANCHORS/BUFFERS/SANDBOX/EDGE/EXAMPLE
  blocks — REPLACE must be documented there.

## Design (WHAT is pinned; HOW is your call within the DoD)
- New mode `REPLACE`. Required args: `dstFile`, `startMarker`, `endMarker`;
  `bufferName` default `default` — the replacement content is ALWAYS the
  named buffer (NO inline text arg — the content channel stays buffers-only,
  consistent with PASTE).
- Behavior: resolve dstFile + sandbox-check BEFORE any fs access; read the
  lines; find the start line = the line STARTING WITH startMarker (0
  matches → not-found error; ≥2 → non-unique error); the end line the same;
  require startIdx <= endIdx (else error); replace lines[startIdx..endIdx]
  INCLUSIVE with the buffer lines; write back; the buffer stays (PASTE
  semantics).
- dstFile missing → ERROR (REPLACE never creates a file — there is no span
  to replace in a nonexistent file).
- The return string MUST report what was replaced (perceptibility
  requirement — the caller cannot perceive its own args after the call),
  e.g. `REPLACED lines <s>..<e> (<n> lines) in <dstFile> with buffer '<b>'
  (<m> lines).`
- Error style = the existing `Error: '...'` naming the cause. New edges:
  missing dstFile / startMarker / endMarker (per-arg message), anchor not
  found, non-unique anchor, start after end, empty buffer (reuse the PASTE
  message), file does not exist, out-of-sandbox.
- Schema: add `REPLACE` to the args.mode enum + its `.describe()` text;
  update the description's MODES paragraph + the EDGE line ("an empty
  REPLACE buffer" joins the list).

## Scope (non-exhaustive)
1. `.opencode/tools/block_transfer.ts` — enum, description, the REPLACE
   branch (dispatch next to PASTE; all sandbox checks before fs access).
2. `.opencode/plugin/tests/block_transfer.smoke.mjs` — +8 REPLACE checks:
   happy path (exact return string); buffer preserved after REPLACE;
   missing dstFile; missing startMarker; anchor not found; non-unique
   anchor; start after end; single-line span (start == end, same line).
3. `.opencode/plugin/tests/block_transfer.sandbox.smoke.mjs` — +1: REPLACE
   with an out-of-sandbox dstFile → the exact error form, no write.
4. `.opencode/plugin/probes/handover_probe.mjs` — S15 +2 checks (REPLACE
   happy path: the span replaced + the report line; REPLACE non-unique
   anchor → the error) with SAFE NEW IDs (probe IDs are NOT centralized —
   run the probe first and extract the max used ID); update the S15 header
   count + the file's self-annotated totals (machine-verified on your run).
5. Knowledge: append a dated entry per the folder README format to
   `.opencode/agent/knowledge/plugin_tools/` (a new dated file is fine):
   the REPLACE mode + when to use REPLACE vs PASTE vs MOVE + the slot-file
   lesson (slot/region replacement = REPLACE or write-overwrite; PASTE is
   insert-only — the 2026-09-24 slot-clobber incident).
6. `TODO.md` #94 status + your handover file.

## DO-NOT-touch
`.opencode/maintainer/**` (his live files — uncommitted edits are pending
in the tree: the draft move, ideas.md, priority.md — leave them exactly as
found), `opencode.jsonc`, `AGENTS.md`, the other tools in
`.opencode/tools/`, probe sections S10/S11 (frozen), and any file not in
the scope.

## Definition of done
- `node .opencode/plugin/tests/block_transfer.smoke.mjs` → ALL PASS
  (**30/30**)
- `node .opencode/plugin/tests/block_transfer.sandbox.smoke.mjs` → ALL
  PASS (**53/53**)
- Probe: S15 = 12 checks, total **259**, exit 0, header totals updated
  (machine-verified)
- Standard gate green: pytest **459 passed + 1 warning**, ruff **F=0**
- `grep -n "REPLACE" .opencode/tools/block_transfer.ts` shows the enum,
  the branch, and the description text
- Commit: ONE green commit (code + smokes + probe + knowledge); `TODO.md`
  + the handover file ride the same commit (single-unit task — the
  checkpoint-commit rule permits this shape). The handover carries NO
  self-hash (status `LANDED`; the hash rides the planner's follow-up
  bookkeeping commit).
- Handover to `.opencode/agent/handover/handover_task_to_planner.md`
  (executive summary + measured gate evidence).

## Worker
`worker_Q3S_170K` — stay on the current checkout (`opencode_test`); first
greps carry output limits (`| head -30`); read only the named sections.
