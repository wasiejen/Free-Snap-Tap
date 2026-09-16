# R2 spec — write-scope pair/fuzzy resolution

STATUS: LAUNCHED 2026-09-16, direct session ses_f5476dc3affeVynFjtGEdnXQO4.
GATE SATISFIED: R1 green + planner-verified (96bb173, live-accepted) AND
maintainer explicit approval "R2 approved" (2026-09-16). Stay on the current
checkout (opencode_test). Design source: `decision-record.md` §2 + research
doc §2.3/§3.4/§4.2 (read the named sections, grep by heading — the record is
~10k tokens).

## Verified facts (refreshed at launch, post-R1 — build on these)
- Baseline: probe self-annotation **193/193** (S1–S19), smoke **31/31**,
  plugin `grep -c ^export` = 1. Re-verify by RUNNING before any edit
  (machine-read the self-annotation; if it does not match, STOP and report).
- The codebase ALREADY contains R1 (96bb173): the `[l:r]` pair grammar +
  `checkPairs`/`PairCheck` core surface in `intercept_observer_core.ts`, the
  read-scope `runPairRead` channel in `intercept_observer.ts` (pair channel
  runs FIRST in the read pipeline, then fuzzy), `SCRATCHPAD_ROOT`, the nine
  VERDICTS incl. `pair-resolved`. Plug the write channel in ALONGSIDE
  `runPairRead` (same hook); do not re-derive pair math — reuse `checkPairs`.
- C7 log: same 8-field shape, field 5 = original arg captured pre-mutation.
- Read-scope behavior is FROZEN: every R1 pin must stay green (regression
  gate) — write-scope work must not change read behavior or existing pins.

## Goal
The observer resolves pair forms (and, under the gate, fuzzy near-misses) in
WRITE-scope tool args, so a drifted write target lands on the real file —
with the corruption asymmetry of research §2.3 respected: a wrong write is
not self-correcting.

## Scope (design now, line numbers refreshed at launch)
- Tools: `write`, `edit`, `bash` (file-bearing args), `block_transfer`
  (srcFile/dstFile) — the mutating surface.
- **Pair form in a path arg:** resolve → canonical digits (right-wins),
  EXISTENCE GATE strict: canonical path exists AND the pair-form path does
  NOT. On left/right MISMATCH in write scope: **fail-closed** (do NOT
  "helpfully" write the mismatched target — log `redundancy-mismatch` with
  both values; the agent sees the log and decides). Contrast: read scope
  resolves on mismatch (a wrong read is self-correcting, §2.6).
- **Fuzzy near-miss on a write path:** ONLY under the same strict existence
  gate AND d<=1 (tighter than read's d<=2 — the hazard class is different);
  verdict `fuzzy-resolved` with the write-scope flag in evidence.
- Git refs (commit ids in bash args): pair/numword → digit, gated on
  `git rev-parse --verify` (research §3.4 — the gate is mandatory).
- Log: same C7 channel, same 8-field shape, new verdicts pinned in probe.
- **Content-scope guard pin (maintainer's `args[1:one]` case, 2026-09-16):**
  a grammar-VALID pair (digit-left, numword-right, e.g. the python slice
  `args[1:one]`) sitting in a CONTENT arg of an in-scope mutating tool
  (edit oldString / write content) → log line ONLY, byte-exact pass-through,
  NO mutation. This pins that mutation is path/ref-arg-only even for
  mutating-scope tools — the guard is scope, not grammar (the pair form
  collides with python slice syntax in the string space).

## DoD
Probe pins for every gate branch (exists/absent/both/mismatch/ref-gate),
smoke green, standard gate green, correction log auditable end-to-end
(one controlled write against a scratchpad fixture proving a resolved write
lands where the log says it landed).

## Approval boundary
- APPROVED (his "R2 approved", 2026-09-16): pair resolution on
  write/edit/block_transfer path args (strict existence gate, mismatch
  FAILS CLOSED), fuzzy d<=1 on write paths under the same gate, git refs in
  bash args gated on `git rev-parse --verify`, the content-scope guard pin.
- DO-NOT-TOUCH: READ-scope behavior + all R1 pins (frozen regression gate),
  CONTENT args (oldString/newString/write content — never mutated, ever),
  `ctx_watchdog.ts`, `numwords.json` (no new words), AGENTS.md + repo parts +
  anything under `.opencode/maintainer/`, the research/FB docs (read-only
  basis), `prompt_*` files (edit-deny).
- Verdicts: the nine stay byte-identical; new write-scope verdicts only with
  explicit probe pins (or reuse an existing verdict + a `scope=write`
  evidence flag — worker's call, pin the choice in the handover).
- Spec paths are REPO-RELATIVE in every command — no doubled absolute paths.

## Worker
`worker_Q4_140K`.
