# TASK (RESUME) — compact_memory plugin: finish from the WIP (units 1-4)

Worker: `worker_Q4_120K` (resuming the dead session
`ses_f691b7802ffe2wMtz7svBy36Ya` — his thought dump is the reference below).

## State at resume (planner-verified at launch — do not re-derive)
- The WIP plugin is COMMITTED: `.opencode/plugin/compact_memory.ts` (332
  lines). Read it in full — it is your starting point; its architecture is
  smoke-verified (registration shape, summarize path, cross-model read,
  retry-once, no-client error, CPU denial, message+trailer, COMPACT line).
- Smoke harness: `C:\Users\Wasiejen\AppData\Local\Temp\opencode\qc_smoke\
  smoke.mjs` (23 checks; `node` from anywhere; its sandbox state sits beside
  it — delete the sandbox `qc_smoke/.opencode` before re-runs if state
  interferes). RE-RUN IT FIRST. Planner-measured failures at launch: **8**
  (clf IQ4 / clf Q4KM / clf trap / gate-3rd-4th / retry note / fail-no-
  increment / v2 schema / lenient v1 read).
- ROOT CAUSE of the 4 classifier failures (planner-verified): the quant
  rules lack the `i` flag — `compact_memory.ts:71-72` (`/iq4|q4/`,
  `/iq3|q3/`) do not match the UPPERCASE live names (`Qwen3.8-27B-IQ4KT-
  120K`); the `^cpu` rule has the flag. `clf IQ3` passed only trivially
  (default cap == q3 cap == 1).
- Probe green **84/84** at the resume HEAD (the WIP touched no probe file).
- Thought dump (dead worker's pre-write planning): `.opencode/agent/handover/
  dump_ses_f691b7802ffe2wMtz7svBy36Ya.md` (921 raw lines, NO headings).
  **BOUNDED READS ONLY** — grep for a specific question or read a tail/head
  range; NEVER the whole file. Its tail already settled the commit strategy
  (below) — do not re-deliberate it.

## Contract (unchanged from the original spec at `git show a162f2a:.opencode/
agent/handover/handover_task.md` — same scope, same DoD, same DO-NOT-TOUCH)
The approved proposal `proposals/approved/2026-09-12_compact_memory_plugin.md`
stays the design authority; read it for TARGETED questions only (you do not
need to re-read the v1 tool or dev_probe_ctx — the WIP already embodies them).

## Work (resume units)
1. **Fix the 8 smoke failures** until the harness is fully green: the
   classifier `i` flags; the retry-note wording (Part 1: report "keep not
   accepted by this build", not a raw `err.message` = "null"); the smoke's
   OWN mock bug in `fail no increment` (`spec.summarizeError is not a
   function` — the harness is yours to fix); the v2-schema model field +
   the lenient v1 read (read the smoke's exact assertions first).
2. **Retire v1**: `git mv .opencode/tools/compact_memory.ts .opencode/plugin/
   deactivated/compact_memory_v1.ts` + the two frozen header lines + the probe
   S10 `TOOL_TS` re-point (line ~1420) + its section-header comment — ALL IN
   ONE COMMIT (the move alone breaks S10 → probe red).
3. **Probe S13** appended after the check-85 block, before S5-hygiene (86+):
   the fixture list from the original spec's unit 3 (git show above) = the
   proposal's Part 4 probe bullet; direct import, SANDBOX-steered, no hook
   fires; fresh `ses_qc_*` ids ADDED to the FINGERPRINT array (check 43);
   header section map updated (line 271) with `S13=<n>` + new total.
4. **Bookkeeping**: `TODO.md` #52 one-line status + your summary to
   `.opencode/agent/handover/handover_task_to_planner.md` (measured gates,
   the commit list incl. the WIP-rescue hashes, failures found+fixed) — the
   FINAL commit.

## Commit strategy (settled by the dead worker's dump-tail decision — keep it)
Green checkpoint commit per unit; unit 2's move + re-point together; the
final commit carries TODO + the summary. Document all hashes in the summary.

## DoD (measured end states)
- Smoke harness: all checks PASS under node (record the final N/N; if you
  ADD checks to the harness, say so in the summary).
- `node .opencode/plugin/probes/handover_probe.mjs` → `PROBE handover:
  <84+n>/<84+n> PASS`, exit 0.
- pytest **459 + 1 #10**, ruff **F=0**.
- `git status`: scope = plugin file + retirement move + probe + bookkeeping;
  the v1 move a 100% rename (two header lines only).
- `rg "tools/compact_memory" .opencode/plugin/probes/handover_probe.mjs` →
  0 hits.

## DO-NOT-TOUCH (carried)
`opencode.jsonc` (his live registration file), `.opencode/plugin/
context_recovery.ts`, `.opencode/maintainer/**`, `proposals/**`, `archive/**`,
the S1-S12 check bodies (the S10 re-point is the only permitted edit there),
FST code.
