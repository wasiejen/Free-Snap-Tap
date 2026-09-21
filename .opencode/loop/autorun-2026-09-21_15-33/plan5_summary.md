# plan5 summary — compact_memory unit A (TODO #70 / priority.md #1)

Worker: worker-6 (`worker_Q3S_160K`, ses_f3ab3c67dffeujQ8L1ucfWu8k8) · spec
`7e790d4` · code `6864bc0`.

## What happened
The worker's launch was reported as `context_length_exceeded`, but the
session had finished the ENTIRE build — it died only before its last steps
(final commit + feedback submit). Per the maintainer's ruling (this message
ALWAYS means the sub-agent hit its limit) and his order to resume WITHOUT
compaction, the planner rebuilt reality from files, verified the gate
itself, and landed the final steps.

## Changes (all in `6864bc0`)
- 4-key args schema — providerID/modelID REMOVED from the exposed
  compact_memory parameters (his 26-09-21_03-17 ruling).
- Summarizer resolution: new exported JSONC-safe
  `resolveCompactionModel(configContent, fallback)` — opencode.jsonc
  `agent.compaction.model` ("provider/model", first-slash split, malformed →
  fallback), else the existing session-model fallback. The live config has
  `agent.compaction` commented out → the fallback is the active path
  (same-model summarize — his ruling: better results even if slower).
- `message` now fires ONE queued `promptAsync` to the compacted session after
  the dispatch (no await; WARNING line if promptAsync is absent) — fixes the
  "message does not arrive" defect.
- Dump diagnostics: `DUMP-OK <sid> <relfile> <ms>` line on success + spawn
  `stdio: pipe → ignore` (removes the pipe-buffer deadlock failure mode
  behind the 2× ETIMEDOUT DUMP-FAILs).

## Verification (planner-run, not worker-claimed)
- probe 241/241 (S25 new section, 7 checks; S13/S14 re-pinned; header
  annotation agrees)
- all 10 smokes green (compact_memory 52/52, auto_resume 53/53 unchanged,
  intercept_observer 39/39, submit 20/20, loop_log 24/24, block_transfer
  22/22 + sandbox 52/52, ctx_gauge 3/3, context_recovery + gauge_core ALL PASS)
- pytest 459 passed + 1 warning · ruff F=0

## Friction (submitted)
The spec's DoD demanded the worker include its OWN commit hash in its own
commit — self-referential; the worker burned 15k+ tokens thinking about it.
Spec pattern going forward: the worker commits WITHOUT the self-hash (the
handover carries parent + subject), the planner fills the hash at the close
commit.

## Pending (named verbatim for the reopening session)
1. UNIT B — the auto-compact toggle: optional flag in
   `.opencode/temp/compact_budget.json` gating the auto_resume Unit 2 0.85
   trigger (his #1 bullet; interpretation to confirm in the spec).
2. The research spec he requested: small research on compact_memory +
   block_transfer — up/downs, what is problematic and why, alternatives
   (he wrote "buffer_transfer").
3. LIVE ACCEPTANCE after the next host restart — Unit A: the queued message
   reaches the compacted session; config resolution (commented-out config →
   same-model summarize); DUMP-OK lines. PLUS the still-pending Unit 2
   (`arm=`/`saturation=`/`trigger=` lines) and Unit 4 (route lines)
   acceptances — no host restart since plan4.
