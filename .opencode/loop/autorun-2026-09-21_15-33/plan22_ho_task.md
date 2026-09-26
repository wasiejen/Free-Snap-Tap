# Task spec — plan22: post-restart live-verification pass (live acceptances + bt-v2 new-hire / held-out acceptance)

Goal: the maintainer restarted opencode — the live process now runs the full 11-mode
block_transfer + the R3 arg-scope channels + the #102 /tmp redirect (planner-verified:
the live tool schema carries MAP/PEEK/WRITE/APPEND + the `last_write` documentation).
Execute the verification battery that was blocked on that restart.
**VERIFICATION ONLY: no code changes, no gate runs, no commits.**

Worker: `worker_Q3S_245K_slow` — stay on the current checkout (`opencode_test`).

## Setup
- All fixtures under the scratchpad `C:\Users\Wasiejen\AppData\Local\Temp\opencode\`
  (Windows form in the file tools). Create fixtures with the built-in `write` tool.
- The live intercept log = `.opencode/temp/intercept.log` (append-only, git-ignored).
  EVIDENCE PROTOCOL: before each Unit-1 exercise note the current line count
  (`wc -l .opencode/temp/intercept.log`); afterwards capture the NEW lines with a
  bounded read (`sed -n '<n+1>,$p' .opencode/temp/intercept.log | head -20`) and quote
  them VERBATIM in the handover.

## Unit 1 — live acceptances (quote the intercept.log evidence per item)
1. **#102 /tmp redirect (both forms):**
   a. bash: `echo "plan22-acc" > /tmp/plan22_acc.txt`
   b. the built-in `write` tool with `filePath: "/tmp/plan22_acc2.txt"` (content `plan22-acc2`).
   Expect: the files land in the scratchpad (`...\Temp\opencode\plan22_acc.txt` /
   `plan22_acc2.txt`) with the right content; a `kind=redirect` line per call in
   intercept.log carrying orig=/value=. Read both files back (scratchpad paths) to verify.
2. **R3 (a) the grep/glob PAIR channel:** write scratchpad fixture `plan22_r3_file-4.txt`
   (content `x`). Then `grep` with `pattern: "[4:four]"` and
   `path: "C:\Users\Wasiejen\AppData\Local\Temp\opencode\plan22_r3_file-[4:four].txt"`.
   Expect: the grep succeeds (the path MUTATED to `plan22_r3_file-4.txt`) + exactly two
   new log lines: the path line (pair-resolved, gate=mutated) + the pattern line
   (observation-only — the pattern is never mutated).
3. **R3 (b) the section-ANCHOR resolver:** write scratchpad fixture `plan22_r3_anchor.txt`:
   `line-1` / `## Plan22 Only Anchor line-3` / `line-4` (three lines).
   `read` it with `offset: "## Plan22 Only Anchor"` (a STRING — the section anchor) +
   `limit: 50`. Expect: the read succeeds from line 2 + one `anchor-resolved` line
   (anchor=... line=2). Then `read` the same file with `offset: "No Such Anchor X"` →
   expect an `anchor-rejected` matches=0 line and the call to FAIL (the string offset
   runs unmutated) — the failure is the expected outcome.
4. **R3 (c) the bash QUOTED-FORM channel:** bash `command: 'echo "[4:four]"'`.
   Expect: the command MUTATED in place (`echo "4"`), the output prints `4`, one
   `pair-resolved ... kind=quoted` line.
5. **R3 (d) the block_transfer ANCHOR-MARKER channel:** write scratchpad fixture
   `plan22_r3_bt_src.txt` (`intro` / `Sec 4 T line one` / `Other line` / `outro`) and
   `plan22_r3_bt_dst.txt` (content `dst-head`). `block_transfer` MOVE with
   `srcFile: plan22_r3_bt_src.txt`, `dstFile: plan22_r3_bt_dst.txt`,
   `startMarker: "Sec [4:four] T"`, `endMarker: "Other line"`.
   Expect: the MOVE succeeds (startMarker MUTATED to `Sec 4 T`) + one
   `pair-resolved ... gate=mutated ... arg=startMarker` line. Then a second MOVE from
   the same src with `startMarker: "Sec [7:eight] T"` (a mismatch) → expect FAIL-CLOSED
   (an error + a `redundancy-mismatch ... gate=fail-closed` line).

Unit-1 DoD: all five items executed; the handover quotes each item's new intercept.log
line(s) verbatim + the expected-vs-observed verdict. A deviation is a FINDING — report it,
do not fix it.

## Unit 2 — NEW-HIRE test: all 11 modes, description-only, file-blind
You are the "new hire": use `block_transfer` STRICTLY from the tool description in your
context. **DO NOT read** `.opencode/tools/block_transfer.ts`,
`.opencode/plugin/tests/block_transfer*.smoke.mjs`,
`.opencode/plugin/probes/handover_probe.mjs`, or any `knowledge/plugin_tools/` note —
the goal is to surface the friction a fresh agent would hit. Reading your fixture files
with `read` is allowed.

Cover each of the 11 modes (MOVE, COPY, APPEND, CUT, PASTE, REPLACE, WRITE, PEEK, MAP,
DELETE, CLEAR) with at least one successful call each, in any order, on scratchpad
fixtures (reuse the Unit-1 fixtures or write your own). Also trigger at least one error
case on purpose (e.g. a non-unique anchor) to exercise the error messages.

Unit-2 DoD: the handover carries a per-mode table: mode → key args → the tool's feedback
line (verbatim) → PASS / FRICTION. Plus a friction list: every error message, description
ambiguity, or rework you had to do (a friction entry is a SUCCESS of the test — record it,
do not hide it; work around it without reading the code).

## Unit 3 — HELD-OUT multi-step assembly (fresh task, no rework)
Build `plan22_h_out.md` in the scratchpad EXACTLY per this sequence (block_transfer for
steps 2-5; the built-in `write` is allowed only for the initial files in step 1):
1. Built-in `write` `plan22_h_srcA.md`: `# Alpha` / `alpha line one` / `alpha line two` /
   `# Beta` / `beta line one`. Built-in `write` `plan22_h_srcB.md`: `# Delta` /
   `delta line one`. Built-in `write` `plan22_h_out.md`: `# Assembled` / `tail line`.
2. `COPY` srcA `refs: [1,2,3]` → buffer `hb`.
3. `APPEND` srcA `refs: [4,5]` to `hb`; then `APPEND` srcB `refs: [1,2]` to `hb`
   (the buffer is then 7 lines: # Alpha, alpha one, alpha two, # Beta, beta one,
   # Delta, delta one).
4. `PASTE` `hb` into `plan22_h_out.md` after `targetMarker: "# Assembled"` (the file is
   then 9 lines, last = `tail line`).
5. `WRITE` on `plan22_h_out.md` with `regions: [{start:2,end:2},{start:9,end:9}]` and
   `text: "FINAL LINE"`.
6. Verify: `MAP` buffer `hb` (expect a heading skeleton # Alpha / # Beta / # Delta),
   `PEEK` the auto-buffer `last_write`, and `read` the final file.

Final expected content of `plan22_h_out.md` (9 lines): `# Assembled` / `FINAL LINE` /
`alpha line one` / `alpha line two` / `# Beta` / `beta line one` / `# Delta` /
`delta line one` / `FINAL LINE`.
Unit-3 DoD: the final file matches exactly (verified by `read`); the handover records the
call sequence (one line per call: mode + key args + feedback).

## Handover (`.opencode/agent/handover/handover_task_to_planner.md`)
- Unit 1: per item — the call(s) + the quoted log line(s) + expected-vs-observed.
- Unit 2: the per-mode table + the friction list.
- Unit 3: the call sequence + the final-file verification (the `read` output) + any deviation.
- The scratchpad files left in place (list them — the planner reads them as evidence).
- The final gauge readout (the `ctx_gauge` tool or `node .opencode/plugin/scripts/peek.mjs`) verbatim.
- NO commit (nothing changes in the repo); the handover file is the only artifact.

## DO-NOT-TOUCH
Code files (plugins, tools, tests, probes, FST), prompts, `TODO.md` / the NAP (planner's
files), `.opencode/maintainer/**`, `opencode.jsonc`; intercept.log is read-only; no gate
runs; no commits; never read the block_transfer implementation files (Unit 2 constraint).
