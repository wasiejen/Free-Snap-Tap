# 2026-09-25 — compaction keep semantics (keep.tokens vs keep.messages)

## The retention model

The maintainer's live measurements (2026-09-25, priority.md top item)
established the retention model:

- **`keep.tokens` is a DIRECT retention** on a CONSTANT ~25k base
  (system prompt + summary + minimal tail). With `keepTokens: 30000`,
  the post-compaction session was ~55k (25k base + 30k retention).
  With `keepTokens: 0` and `keepMessages: X`, it was always ~25k
  regardless of X.
- **`keep.messages` does NOT control the retention** — the count is
  cosmetic (the messages are trimmed to the count, but the token
  budget is what determines how much content survives).
- The dev-branch host source (`session/compaction.ts`) confirms: the
  token-budget tail is `preserve_recent_tokens ?? clamp(0.25*usable,
  2k..15k)` + optional `tail_turns` — no message-count knob.

## The summarize body `keep` field is UNDOCUMENTED

The installed SDK (1.18.29) `SessionSummarizeData` body schema is
`{ providerID, modelID }` ONLY (`types.gen.d.ts` L2175). The `keep`
field sent in the summarize body is UNDOCUMENTED. The live effect is
PENDING the maintainer's post-restart fork test:

- **Expected (honored):** a self-compact with computed `keep.tokens`
  ~27k → post-compaction ≈ 25k base + 27k ≈ 52k (NOT 55k, NOT 25k).
- **If ignored:** the result tracks the config-level
  `compaction.keep` in opencode.jsonc (30k → ~55k). Report verbatim
  to the maintainer.

## #99 resolution chain

At dispatch, the plugin resolves `keepTokens` and passes `keep.tokens`
in the summarize body:

1. **COMPUTED** (primary): token size of the last `keepMessages`
   messages from the DB read — user: `info.tokens.input`, assistant:
   `info.tokens.output + info.tokens.reasoning`; dual-shape unwrap
   (bare array | `{ data: [...] }` per #79); non-finite/negative/absent
   count 0 (fail-open); sum > 0 → computed.
2. **BUDGET** (fallback): `keepTokens` from the budget file
   (`.opencode/temp/compact_budget.json`) when the read fails or sum = 0.
3. **NONE** (else): `keep.tokens` omitted from the body (host config
   default applies).

The body ALSO keeps `keep.messages` (the maintainer's config comment:
non-zero tokens wins, but the messages count is still passed).

## COMPACT line format

`<stamp>[ <model>] COMPACT <sid> keep=<m>m tok=<t> <source>[ emergency]`

where:
- `<m>` = keepMessages (resolved, arg or config or default 12)
- `<t>` = resolved tokens number, or `-` when none
- `<source>` ∈ `computed | budget | none`
- `[ emergency]` = the once-per-session emergency suffix (present when
  the emergency slot was consumed)

The model field is POPULATED from the resolved model id (the event hook
carries no hook context — no pre-readout field, omitted).

## Implementation notes

- `computeKeepTokens(raw, keepMessages, budgetTokens)` is a PURE helper
  (exported from `compact_memory.ts`, local duplicate in
  `context_recovery.ts` — self-contained-by-design constraint).
- The messages read is a SAFE try/catch (fail-open) — a failed read
  falls through to the budget path.
- In `context_recovery.ts`, the model pair comes from the SAME messages
  read — a failed read leaves no pair → CLEAN FAIL before the keep
  resolution. The sandbox `opencode.jsonc` config pair (deviation 1)
  lets the budget path execute in tests.
- The `keepTokens` config key in `compact_budget.json` is read at
  dispatch time (fail-open, default undefined).
- SDK schema: the `keep` field is UNDOCUMENTED in the installed SDK.
  The live effect is pending verification.

## Provenance

worker-15, session ses_f2796c5d8ffe8toe7k2neU01G1, model
Qwen3.8-27B-Q3S-170K, loop autorun-2026-09-21_15-33, 2026-09-25.
Task: TODO #99 (planner-15 spec, 2026-09-25).
