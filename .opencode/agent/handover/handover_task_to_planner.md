# HANDOVER — TODO #93: port context_recovery.ts to the `event` hook (worker, `worker_Q3S_170K`, 2026-09-25)

## Executive summary
The emergency compact backstop is ported from the retired T5 prototype to the current
SDK's `event` hook and activated as the live plugin at `.opencode/plugin/context_recovery.ts`
(the deactivated copy is REMOVED — the single source). On a REAL overflow (the host's
`session.error` event, the overflow-marker-gated, `emergencyRecovery` flag read per fire) it:
claims the overflow (once-per-overflow in-memory guard, cleared on `EventSessionIdle`),
compacts via the v1 `session.summarize` call with the config-resolved summarizer pair
(root opencode.jsonc `agent.compaction.model`, falling back to the session's own model
read via `session.messages` — self-contained local copies, NO runtime import from
`compact_memory.ts`), and on VERIFIED success only: increments the shared v2 budget store
(read-then-write, no await) + appends the COMPACT line (the current tool's writer shape:
`<stamp>[ <model>] COMPACT <sid> messages=<m>[ emergency]` — messages-only) + injects the
spec-2+11 post-compaction directive as a synthetic text part via `promptAsync` (the retry
vehicle — the hook returns void, so the old `{handled, action:"retry"}` return is gone).
Over budget / unresolvable pair / failed compact → CLEAN FAIL (no compact, no line, no
increment — the error propagates).

## What changed (ONE commit: code + smoke + probe + TODO.md + this handover)
- `.opencode/plugin/context_recovery.ts` — NEW (the ported plugin; the hook registers
  `event` only — no `"session.error":` key; capital-D `sessionID`; the prototype's
  overflow markers preserved).
- `.opencode/plugin/deactivated/context_recovery.ts` — REMOVED.
- `.opencode/plugin/tests/context_recovery.smoke.mjs` — re-pinned to the new file + the
  event shape (faked client: `summarize`/`promptAsync`/`messages`; faked
  `EventSessionError`/`EventSessionIdle` SDK events, live error shape
  `{ name: "MessageAbortedError", data: { message } }`): flag-off, non-overflow, non-error
  event, the budget states (normal / emergency / exhausted), the keep (override + no
  tokens key), the line format (incl. the ` emergency` suffix), the once-guard (4-event
  burst), the idle clear, the directive byte-exact, the config-pair override, the
  unresolvable-pair clean fail.
- `.opencode/plugin/probes/handover_probe.mjs` — S11 re-pinned (11 checks: 76-81 updated
  to the ported file + event shape + v2 gate, new 257-261 for non-overflow / flag-false /
  keep-override / config-pair / unresolvable-pair; check IDs verified safe against the
  extracted used-ID set). The header's S11 map + the self-annotated total updated
  (S11=6 → S11=11, 252 → 257). The S10 section (the retired v1) is UNTOUCHED (byte-
  identical — verified: it is not in this commit's diff). The S5 fingerprint array gained
  the 3 new S11 session ids (`ses_rc_keep`/`ses_rc_cfg`/`ses_rc_nomodel`).
- `TODO.md` #93 — status → LANDED (the commit hash is recorded in the planner's
  follow-up bookkeeping commit — no self-reference here).

## Implementation decisions (deviations worth a look, all inside the spec)
1. **`isOverflowError` text extraction extended to `error.data.message`** (checked
   FIRST; the prototype's `error.message` fallback stays). The SDK's typed error union
   (`MessageAbortedError` & co. — spec fact 2) carries the text in `data.message`, NOT
   top-level `message` — with the prototype's extraction alone, `String(error)` →
   `[object Object]` and the hook could NEVER match a live overflow. The three markers
   are unchanged (fact 9); the live 2026-09-23 fork-test text matches marker 1 via
   `data.message`. The smoke/probe fakes use the live shape.
2. **The summarize call is AWAITED in the hook** (unlike the tool's fire-and-forget
   execute): the event hook is a server-side listener — NO turn awaits it, and the
   overflowing turn is already ABORTED (the single llama-swap slot is free), so the
   tool's deadlock (spec-era maintainer ruling 2026-09-14) cannot form here. Awaiting is
   what makes "on SUCCESS only" (fact 5) synchronous and lets the directive land AFTER
   the verified compaction. The verified-success check mirrors the tool
   (`compactionFailure` — a resolved promise is success only on the handler's boolean
   true), and the keep-rejection retry-once mirrors `callSummarize`.
3. **The guard is claimed BEFORE the compact call** (the burst events land while the
   first fire's summarize is in flight) and only AFTER the flag read (flag-off fires
   never claim — a mid-run flag flip still recovers on the next overflow).
4. **Budget gate = the tool's spec-10 gate, no-arg path**: `count < cap` → normal
   (count+1); `count == cap && emergency_budget >= 1` → emergency (count → cap+1,
   ` emergency` suffix); else → CLEAN FAIL. The cap resolves against the
   config-overridden model (the tool's ordering), CPU guard first (safety invariant).
5. **Directive = the spec-2+11 relay wording verbatim** (auto_resume
   `POST_COMPACTION_ADDENDUM`): "post-compaction: re-read your head files per
   .opencode/agent/prompts/agent_readme_post_compaction.md and CONTINUE — never re-plan
   from scratch" (the retired looprunner line is gone — fact 8).

## Measured verification (all re-run; baseline re-run AT START, not trusted)
Baseline (start, 2026-09-25): probe 252/252, compact_memory smoke 66/66,
auto_resume smoke 129/129, context_recovery smoke ALL PASS (old shape), pytest
459 passed + 1 warning, ruff F=0 — matches the spec's baseline.
After the change:
- probe: **257/257 PASS** (header self-annotation agrees; S10 untouched)
- compact_memory smoke: **66/66** (unchanged)
- auto_resume smoke: **129/129** (unchanged)
- context_recovery smoke: **15/15** (new count — the old smoke was uncounted)
- pytest: **459 passed, 1 warning**
- ruff: **F=0** ("All checks passed!")

## Commit facts
ONE commit (code + smoke + probe + TODO.md + this handover). Staged explicitly — the
working tree's foreign append-only changes at session start
(`.opencode/agent/agent_feedback.md`, `.opencode/loop/.../loop_log.md`,
`.opencode/maintainer/ideas/ideas.md` — not written by this session) are NOT included.
The hash is recorded in the planner's follow-up bookkeeping commit (no self-reference).

## TODO entries
- #93 status → LANDED (this commit's contents; the hash in the planner's bookkeeping).
- No new `todo_inbox.md` entries.

## Deliberately NOT done
- The context_recovery + compact_memory ONE-plugin integration (the follow-up the spec
  names — the next candidate; the recovery stays self-contained per the T5 constraint).
- The S10 section / the retired v1 artifact (byte-identical — the v1 removal is the
  maintainer's call, per the spec).
- `opencode.jsonc`, `.opencode/maintainer/**`, `compact_memory.ts`, the live
  `.opencode/temp/compact_budget.json` — all DO-NOT-TOUCH, untouched.

## Maintainer-domain pending items (verbatim, per the spec)
1. **the host restart (plugin activation)** — moving
   `deactivated/context_recovery.ts` → `.opencode/plugin/context_recovery.ts` IS the
   activation (opencode.jsonc has no `plugin` key — files in `.opencode/plugin/*.ts` are
   auto-loaded); it takes effect at the next process start.
2. **the live overflow acceptance on a driven/forked session as the 2026-09-23 fork
   test** (expect: ONE COMPACT line + the budget increment + the session
   survives/continues — the flag is already `true` in the budget file, no flag work
   needed).
