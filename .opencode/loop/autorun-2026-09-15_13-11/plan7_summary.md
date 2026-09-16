# WORKER SUMMARY — plan7 (#63 compact_memory smoke fix, dump-hook sandbox gap)

Worker: worker-7 (iteration 7, autorun-2026-09-15_13-11), model
Qwen3.8-27B-IQ4KT-140K, session ses_f5878dd29ffebiDRSRQ3vq34hj.
Status: **DONE** — all spec baselines hit (measured below).

## What changed
Single file: `.opencode/plugin/tests/compact_memory.smoke.mjs` (3 edits, exactly
the spec's scope):
1. **Sandbox stub** — after the sandbox setup and before the first
   `withClient(...).exec`, the smoke writes a stub `dump_session.cjs` (byte-
   identical to the probe S13 preamble `QC_FAKE_DUMP`,
   `handover_probe.mjs` 1983-2015) at
   `<SANDBOX>/.opencode/agent/scripts/db/dump_session.cjs`. The pre-compaction
   dump hook (4512fe6, TODO #152 build) fires on EVERY dispatch and spawns
   `node <sid> --out <rel>` (verified in `compact_memory.ts`
   `preCompactionDump`, lines 270-287); with the stub present every dump
   SUCCEEDS and the hook appends nothing to the tool response (no WARNING
   line) — the 4 former byte-exact failures pass again.
2. **New chk** in the "self summarize success" section — after dispatch +
   drain, `compaction_dumps/ses_sm_self_c0.md` exists under
   `<SANDBOX>/.opencode/archive/sessions`. Pins that the hook fires on the
   TOOL PATH (the probe only exercises it via direct `preCompactionDump`
   calls).
3. **Header comment** — ONE line added to lines 1-16 noting the stub
   (mirrors the probe S13 preamble).

Check total: **42 → 43** (old total measured at HEAD = 42 chk lines; new =
43 = old + 1, exactly the spec's formula).

## Measured verification (all run from the repo root, post-edit)
- Baseline BEFORE the edit (measured at clean HEAD, not taken from the spec):
  exactly the spec'd 4 FAILs, 42 checks, exit 1 — matches the spec's verified
  facts.
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` →
  `COMPACT_MEMORY_SMOKE: ALL PASS (43/43)`, **exit 0** (the 4 former failures
  PASS + the new chk PASSES).
- Every OTHER smoke in `.opencode/plugin/tests/` green (each run separately):
  - block_transfer.sandbox.smoke.mjs → ALL PASS (52/52), exit 0
  - block_transfer.smoke.mjs → ALL PASS (20/20), exit 0
  - context_recovery.smoke.mjs → ALL PASS, exit 0
  - ctx_gauge.smoke.mjs → ALL PASS (3/3), exit 0
  - gauge_core.smoke.mjs → ALL PASS, exit 0
  - loop_log.smoke.mjs → ALL PASS (24/24), exit 0
- `node .opencode/plugin/probes/handover_probe.mjs` → `PROBE handover: 106/106 PASS`
- `./.venv/Scripts/python.exe -m pytest -q` → `459 passed, 1 warning in 2.37s`
  (the known #10 coroutine warning)
- `./.venv/Scripts/ruff.exe check --select F .` → `All checks passed!` (exit 0)

## Commit
The single plan7 commit (code + TODO.md close-note + this handover, per the
commit routine) on `opencode_test`:
subject: `close #63: compact_memory smoke adapts to the pre-compaction dump hook`.
**NOTE (spec deviation, one word on honesty):** the spec asked for the
"commit hash" inside the TODO close-note — but the close-note rides in the
SAME single commit, so a self-referential hash is impossible (an amend would
change the hash again). Per the #62 precedent ("rode the same commit") the
close-note names the commit by its subject instead. After landing:
`git log --grep "#63" --oneline -1` yields the hash.

## TODO.md bookkeeping
- **#63: CLOSED** — one-line close note in its Status field (fixed by the
  smoke stub; smoke 43/43, all smokes green, gates unchanged). The
  "DECISION NEEDED (optional)" paragraph (smoke-in-standard-gate, relates to
  #58) is LEFT IN PLACE per the spec.
- `todo_inbox.md`: **nothing appended** — no out-of-scope findings (the
  spec's planner-verified facts held exactly; no plugin/probe/base change was
  needed; the only deviation is the self-hash note above).

## Deliberately NOT done (per the spec)
- No change to `.opencode/plugin/compact_memory.ts` (behavior pinned by probe
  S13/S14 — the smoke adapts to the hook, never the reverse).
- No change to the probe file, `_smoke_base.mjs`, or anything under
  `.opencode/agent/prompts/**` (edit-deny) / `.opencode/maintainer/**`.
- No gate-definition changes (#58, maintainer-owned); no stub refactoring
  beyond the byte-exact assertions.

## Final gauge (verbatim, `node .opencode/plugin/scripts/peek.mjs`)
SESSION=ses_f5878dd29ffebiDRSRQ3vq34hj CTX=48202 (34%) REM=91798
