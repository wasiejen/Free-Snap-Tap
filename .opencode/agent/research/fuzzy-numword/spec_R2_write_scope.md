# R2 spec (STAGED) — write-scope pair/fuzzy resolution

GATE (launch blocked until ALL hold): R1 green + verified by planner, AND
the maintainer's explicit approval of write-scope (approval boundary:
write-path behavior change is NOT pre-approved — he pre-ruled "write scope
follows, one step after the other", the spec still needs his sign-off).
Design source: `decision-record.md` §2 + research doc §2.3/§3.4/§4.2.

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

## DoD
Probe pins for every gate branch (exists/absent/both/mismatch/ref-gate),
smoke green, standard gate green, correction log auditable end-to-end
(one controlled write against a scratchpad fixture proving a resolved write
lands where the log says it landed).

## Worker
`worker_Q4_140K`.
