# plan23 summary — autorun-2026-09-21_15-33, iteration 23

Session: ses_f219349ffffe1IL7z1xCByoX45, planner-23,
Qwen3.8-27B-Q3S-245K-slow. Launch: auto-resume unit-4 restart branch
(post-restart; `--info`: opencode restarted, compaction unification
approved in full).

## What happened

1. **State rebuild + opening bookkeeping** (`8ea4b2b`): rebuilt from git
   log + NAP + TODO; committed the plan22 closing leftovers that the
   stop-line close had left uncommitted (the plan22 friction entry +
   loop-log DONE line) + the planner-23 START line.

2. **R3 (b)+(d) live re-test (inline spot-check, post-restart)** — the
   last pending R3 live acceptances:
   - **Build canary PASSED:** the anchor channels now run clean (zero new
     `intercept-error` lines — the 14-26 failure mode was the live
     process predating import fix 44c50a2; the current process carries it).
   - **(b) bt anchor-marker PAIR channel: LIVE-ACCEPTED** — the pair-form
     `startMarker` (`Alpha [7:seven] T`) reached the hook VERBATIM +
     resolved: `pair=[7:seven] canon=7 dist=0 gate=mutated line=2
     arg=startMarker ... pair-resolved` (2/2, intercept.log). CORRECTION
     to plan22: the model DOES emit the pair form — the agent perceives
     only the post-mutation canonical form (MEM-0101 false-repeat; the
     worker's 5/5 "can't emit pairs" reading was self-perception, not
     emission).
   - **(d) section-anchor channel: stays schema-shadowed** — `read.offset`
     is integer-typed, so constrained decoding never delivers a string
     anchor (the worker's 7/7 integer-1 stands; my own 1/1 confirms). The
     pure resolver remains probe-pinned (S31 check 319); the live channel
     is dormant on this host. R3 live acceptance is now COMPLETE for this
     model class.
   - Knowledge entry filed (cured into `knowledge_plugins.md`, 2 entries).

3. **Compaction-unification build (A+B+C) — LANDED + verified**
   (worker-23 `worker_Q3S_245K_slow` ses_f2176db5affeHupTUDVa5cZ0vR, spec
   `4a9e87d`):
   - Unit 1 (Part A) `218a2c1`: NEW `.opencode/plugin/compaction_core.ts`
     (pure module, T5 pattern — the intercept_observer_core split): config
     reader, shared budget store + cap resolver, keepTokens #99
     resolution (computed primary), summarizer-pair resolution CARRYING
     THE SESSION'S OWN providerID+modelID (the 14-26 default-agent fix),
     v1 summarize, COMPACT-line writer (tokens + source), verified-success
     handling. `compact_memory.ts` (1006→487 lines) = thin wrapper (dump +
     queued-message stay tool-local, NOT regressed).
   - Unit 2 (Part B) `d9d93f8`: `context_recovery.ts` (728→244 lines)
     imports the core; `COMPACTION_RELOAD_DIRECTIVE` + the promptAsync
     resume REMOVED — grep-verified ZERO occurrences; the hook compacts
     only and hands control back (unit-4 / the planner owns the resume).
   - Unit 3 (Part C) `88f902f`: probe S32 (checks 338-340): core module
     surface; EQUIVALENCE — tool dispatch + hook fire over the same
     session/model → SAME summarize body (session's own pair, keep
     {messages}); cap-semantics equivalence (tool arg path vs hook auto-
     consumed emergency-1) + no-prompt pin.
   - **Planner verification from files:** the 3 commits present;
     `context_recovery.ts` grep-clean (0 promptAsync/COMPACTION_RELOAD);
     core 571 lines + both wrappers import it; S32 pins + the section-sum
     annotation (L936: S32=3 → 340/340) read from the probe file. Worker
     measured gates: probe **340/340**, smokes **74/74 + 17/17** (auto
     resume 139, io 77, bt 123+64, submit 20), pytest **459+1w**, ruff
     **F=0** (per-unit gates green too).

## Bookkeeping
- proposal → `implemented/` with the verdict (build + remaining
  maintainer live acceptance); worker handover copy in the loop folder;
  TODO #95 status updated (R3 live acceptance COMPLETE for this model
  class); knowledge curation (2 entries into `knowledge_plugins.md`);
  plan22 leftovers committed; the worker's block_transfer line-number-ref
  friction entry committed.

## Open (maintainer domain — non-blocking)
- **`emergencyRecovery` re-enable** in `.opencode/temp/compact_budget.json`
  = the compaction-unification live acceptance (+ the live-fire
  observation at the next limit hit: one COMPACT line, no promptAsync,
  agent+model unchanged, unit-4 resumes — the 14-26 incident must not
  recur).
- #99 live fork test (computed keep.tokens ~27k → ≈52k post-compaction).
- #98 live self-compact→idle cycle (routes from the real close; the next
  natural cycle covers it).
- The section-anchor channel (R3 1.3): schema-shadowed on the integer
  `read.offset` — open design question (relax the offset schema to
  string, or leave the channel pinned-only/dormant).

## Next iteration (per the NAP queue)
- **loop_log-v2 build** (`proposals/approved/2026-09-12_loop_log-v2.md` —
  the maintainer moved it back to approved/ 2026-09-26 because it is not
  yet implemented; the 14-26 priority.md "loop.log in sparingly-read
  files" observation is the design input).
