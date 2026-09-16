# TASK SPEC — plan7: #57 block_transfer MOVE dstFile guard (approved data-loss fix)

Worker: `worker_Q4_140K`
Branch: stay on the current checkout (`opencode_test`).

## Goal
A `block_transfer` MOVE with a missing `dstFile` returns the error with the
SOURCE FILE UNTOUCHED. (Today it cuts the block out of the source first and
only then errors — silent data loss of the yanked block.) Approved by the
maintainer (`--comment: approved` on TODO #57, landed in commit 0e7bd8b):
"goal is to prevent unintended destruction of data". Behavior change applies
to INVALID input only (error+source-cut → error-only); all valid-input
semantics stay byte-identical.

## Verified facts (planner-measured at spec time, HEAD 6a9877f — do NOT re-derive)
- `.opencode/tools/block_transfer.ts` (167 lines, read in full by the planner):
  - The source-cut write happens at **lines 120-126** for MOVE/CUT/DELETE
    (`fs.writeFileSync(srcPath, remainingLines.join("\n"))`).
  - The MOVE dstFile requirement is checked at **line 141** — AFTER the cut:
    `if (!args.dstFile) return "Error: 'dstFile' is required for MOVE mode."`
  - The dst sandbox guard at lines 96-99 runs only `if (mode === "MOVE" &&
    args.dstFile)` — a missing dstFile skips it too.
- The probe does NOT pin block_transfer (zero hits for `block_transfer` in
  `handover_probe.mjs`) — the probe total stays 106/106 after this fix.
- Existing smokes (all green at HEAD): `block_transfer.smoke.mjs` (20/20),
  `block_transfer.sandbox.smoke.mjs` (52/52).

## What to change (the scope)
1. `.opencode/tools/block_transfer.ts` — hoist the MOVE dstFile requirement
   check to BEFORE the source-cut write: right after the
   `if (!fs.existsSync(srcPath))` check (line 100) is a natural spot. Keep the
   error string BYTE-IDENTICAL: `"Error: 'dstFile' is required for MOVE mode."`
   One short comment at the guard: a rejected/missing dst must not leave the
   source already cut (mirrors the existing sandbox-guard comment style at
   line 94-95). No other behavior changes.
2. A NEW smoke assertion (in `block_transfer.smoke.mjs` or the sandbox smoke —
   your call, matching each file's existing fixture style): MOVE with
   `dstFile` omitted → returns the exact error string AND the source file on
   disk is byte-identical to before the call.

## Definition of done (measured)
- The new smoke assertion passes; ALL smokes in `.opencode/plugin/tests/`
  green (run each `*.smoke.mjs`).
- Standard gates UNCHANGED at baseline:
  - `node .opencode/plugin/probes/handover_probe.mjs` → 106/106 PASS
  - `./.venv/Scripts/python.exe -m pytest -q` → 459 passed + 1 warning
  - `./.venv/Scripts/ruff.exe check --select F .` → 0 findings
- `git status` clean after your commit (code + TODO.md close-note + handover in
  one commit per the commit routine).

## TODO.md bookkeeping
- Close-note on #57 (one line: guard hoisted pre-write, commit hash). Keep the
  maintainer's `--comment` line in place (he may remove it; do not).
- `todo_inbox.md`: append any out-of-scope findings (dated + role-tagged).
  (His idle-thoughts in the comment — shared sandbox scriptlet for scripts —
  are NOT in scope; do not build them, just note the question if relevant.)

## DO-NOT-touch
- `.opencode/plugin/compact_memory.ts`, the probe file, anything under
  `.opencode/agent/prompts/**` (edit-deny) and `.opencode/maintainer/**`.
- No behavior changes beyond the guard hoist (no buffer-append-on-doubt
  features, no arg-schema changes, no description-text changes).
