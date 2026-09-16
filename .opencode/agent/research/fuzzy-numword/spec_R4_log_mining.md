# R4 spec (STAGED) — intercept log mining scriptlet

GATE (launch blocked until ALL hold): ≥ ~10 sessions of accumulated
`intercept.log` (or the maintainer asks on demand) — mining a tiny log is
noise, the value is trend + volume.
Design source: `decision-record.md` §5 (R4 = the flywheel: its data drives
the R3/R5 gates and threshold tuning).

## Goal
One committed scriptlet that turns `intercept.log` into a readable evidence
summary, so the convention gets TUNED from data instead of argument.

## Scope
- `node .opencode/agent/scripts/log/summarize_intercept.cjs [logfile]`
  (default `.opencode/temp/intercept.log`; the `log/` subfolder is the home —
  see its README).
- Output (plain text, machine-stable lines):
  - verdict counts (all frozen + new verdicts, zero-included);
  - `fuzzy-rejected` top candidates with d/gap values (threshold-tuning
    input: d<=2 / gap>=2 too tight? corpus too small?);
  - `redundancy-mismatch` lines verbatim (the word-drift evidence — feeds
    R5's alias/letter-fuzzy question);
  - adder-form usage count in pair args (incident-density metric — the
    form's presence is the signal, decision-record §2.5);
  - out-of-sandbox count by path-prefix (validates the scratchpad fix /
    catches new noise sources);
  - per-session_id line counts (convergence habit signal, §6.3: repeated
    resolutions in a session after a prior correction already surfaced the
    canonical form).
- `INVENTORY.md` entry + `log/README.md` pointer (curated collection
  convention — reuse, not throwaway).
- Test: one committed fixture log (a few lines, git-committed under
  `tests/` per the log/ README convention) + a pinned output check in the
  established probe/smoke pattern (worker picks which, pins the choice).

## DoD
Script runs on the real log without error, fixture test green, standard
gate green, INVENTORY updated.

## Worker
`worker_Q4_140K` (small, self-contained — comfortably one context).
