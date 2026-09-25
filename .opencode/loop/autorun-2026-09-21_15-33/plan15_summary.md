# plan15 summary (planner-15, ses_f27a7d75affeqsh0h1c4LZS3CY, 2026-09-25)

## Unit
TODO #99 (NEW priority.md top item, his live edit 2026-09-25): compaction keep
semantics — `keep.messages` does NOT control the retention (always ~25k base
regardless of X); `keep.tokens` = DIRECT retention on that base (30000 →
~55k = 25k + 30k, his live measurement). His asks: (a) keepTokens fallback
from compact_budget.json, (b) compute the actual keepToken so the last
keepMessages messages are kept exactly.

## Verifications done by the planner (from files)
- Installed SDK summarize body schema = `{ providerID, modelID }` ONLY
  (`types.gen.d.ts` L2175 `SessionSummarizeData`) — the `keep` field in the
  body is UNDOCUMENTED (our old body `keep.messages` was untyped, effect
  unverified — live retention tracked the CONFIG `compaction.keep`).
- Dev-branch host source (his link): V2 token-budget tail
  (`preserve_recent_tokens ?? clamp(0.25*usable, 2k..15k)` + optional
  `tail_turns`) — no message-count knob.
- Budget file (his live edit): `keepTokens: 30000`, `keepMessages: 18`.

## Design (planner call, veto-able)
Resolution at dispatch: COMPUTED primary (last `keepMessages` messages'
token sizes from the DB — user: `tokens.input`, assistant:
`tokens.output + tokens.reasoning`; dual-shape unwrap per #79) → budget
`keepTokens` fallback → omit (host default). Body gains `keep.tokens`
(keeps `keep.messages`); the COMPACT line gains `tok=<n> <source>`
(`computed|budget|none`). context_recovery.ts gets the same resolution.
LIVE fork test (maintainer, post-restart): computed ~27k → post-compaction
≈52k proves the body field is honored; if ignored (tracks the config 30k →
~55k) → his fallback ruling.

## Build
worker-15 (`worker_Q3S_170K` ses_f2796c5d8ffe8toe7k2neU01G1) — saga: 1st
launch self-compacted pre-work (design committed `71127e5`), task_id
resume → plugins + smokes wave (committed `ebf59b2`, checkpoint
`1c646bf`), 2nd task_id resume → probe wave + docs + gate + final handover
(commits `c5859c7` probe, `abb0915` knowledge + TODO + handover).

Gates (PLANNER RE-VERIFIED 2026-09-25, own runs): probe **291/291**,
compact_memory smoke **74/74**, context_recovery smoke **17/17**, pytest
**459 passed + 1 known warning**, ruff **F=0**.

Deviations (flagged in the handover): the recovery budget pin needs the
sandbox config pair (a failed messages read → no pair → CLEAN FAIL before
keep resolution); `keepRes` variable name (design's `resolved` collided
with step-2's model result).

## Bookkeeping
- TODO #99 filed (full entry) + status updated (IMPLEMENTED; the LIVE fork
  test part stays open — maintainer's).
- Knowledge note: `.opencode/agent/knowledge/opencode-plugins/
  2026-09-25_compaction_keep_semantics.md`.
- His live files left uncommitted (priority.md, opencode.jsonc
  `tokens: 0`→`30000`, repo_opencode.md URL).
- Side note recorded in #99 (his observation): history is DROPPED and
  REPLACED by the summary → no bit-rot from a compaction chain, only from
  an N-summarized summary (the budget cap's rationale — his review).

## Next (next planner session)
1. R3 (#95 sub-item 3 — gate CLEARED; absorbs the anchor-drift fix) — spec
   at `.opencode/agent/research/fuzzy-numword/spec_R3_arg_scope_extension.md`
   (worker line is stale — pick a live-roster worker).
2. Then #97 (R8 sandbox redirect + escape return-info), then #98
   (unit-4 compaction-resume A+B+C — approved).
3. #96 live check + #99 live fork test + #93 live overflow acceptance =
   maintainer's at the next host restart.
