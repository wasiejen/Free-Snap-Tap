# Task spec — TODO #99: keepTokens into the summarize call (computed primary, budget-file fallback)

## Background (measured live 2026-09-25, maintainer — read first)
- Host v1.18.31 compaction keep knobs (config `compaction.keep` in
  opencode.jsonc): `keep.tokens` WORKS — it is a DIRECT retention added on
  top of the base: tokens=30000 → ~55k context after compaction = ~25k base
  + 30k retained. tokens=0 + keepMessages=X → ALWAYS ~25k regardless of X
  (the messages count does not control the retention; the base is constant:
  system + summary + minimal tail).
- The summarize request body typed schema (installed SDK 1.18.29,
  `.opencode/node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts`
  `SessionSummarizeData`) = `{ providerID, modelID }` ONLY — no `keep`
  field is documented. Our plugin currently sends `keep: { messages }` in
  the body (untyped — its effect is UNVERIFIED; the live retention tracked
  the CONFIG, not the body).
- Dev-branch host source (maintainer-provided link,
  `packages/opencode/src/session/compaction.ts`): the V2 compaction keeps a
  token-budget tail — `preserve_recent_tokens ?? clamp(0.25*usable, 2k..15k)`
  + optional `tail_turns`; there is NO message-count knob anywhere.
- `compact_budget.json` (maintainer-set, live): `keepTokens: 30000`,
  `keepMessages: 18`. The plugin's budget reader currently reads
  `keepMessages` only.

## Goal
At dispatch time the plugin RESOLVES keepTokens and passes it in the
summarize body as `keep.tokens`, so the retention is under our control
(the budget file is the single compaction-config source, #84 precedent):

1. **Primary = COMPUTED:** the token size of the last `keepMessages`
   messages, read from the session's messages at dispatch time
   (`client.session.messages()` — dual-shape unwrap per #79). Per-message
   size: role "user" → `info.tokens.input`; role "assistant" →
   `info.tokens.output + info.tokens.reasoning`. Sum over the last
   `keepMessages` messages (if fewer exist, all of them).
   ("based on the dump" per his item = the same data; the DB is the clean
   source — do NOT parse the dump markdown.)
2. **Fallback = BUDGET:** `keepTokens` from the budget file (present:
   30000) when the messages read fails or the computed sum is 0.
3. **Else = NONE:** omit `keep.tokens` from the body (host config default
   applies).
The body sends `keep.tokens` AND `keep.messages` (his config comment:
non-zero tokens wins; messages stays for forward compat). The tool schema
UNCHANGED (keepMessages is still the agent-facing semantic knob — it
drives the computation).

Resolution source is logged: the COMPACT line gains the resolved tokens +
source, e.g. `... keep=18m tok=27431 computed` / `tok=30000 budget` /
`tok=- none` (exact format your call, pinned in smoke + probe).

## Scope (verify line refs against current source)
- `.opencode/plugin/compact_memory.ts` — budget reader gains `keepTokens`
  (number >= 0; absent/unreadable → undefined; the existing fail-open
  pattern); a PURE compute helper (messages + keepMessages + budgetTokens
  → `{ tokens, source }`); the summarize body gains `keep.tokens`; the
  COMPACT line writer gains the resolved value; the tool `keepMessages`
  description reworded (it is translated to keepTokens — the host
  respects tokens, not the count).
- `.opencode/plugin/context_recovery.ts` — the SAME resolution (it sends
  `keep.messages` only today, line ~487); it has the client for the
  messages read.
- `.opencode/plugin/tests/compact_memory.smoke.mjs` — the fake client
  gains a `messages()` fake (RequestResult `{ data: [...] }` shape with
  tokens info) + captures the summarize body's `keep.tokens`; new pins:
  computed path (sum exact), budget fallback (messages read fails), none
  path (both unavailable), COMPACT line format. Re-pin the changed line
  pins.
- `.opencode/plugin/tests/context_recovery.smoke.mjs` — same shape.
- `.opencode/plugin/probes/handover_probe.mjs` — re-pin the
  compact_memory + context_recovery sections (S13/S25-era + S11) to the
  new body/line shapes; header total machine-updated.
- Docs: a dated note in `knowledge/opencode-plugins/` (the keep
  semantics: config `keep.tokens` = direct retention on a constant base;
  `keep.messages` does not control retention; body `keep` field is
  UNDOCUMENTED in the installed SDK — effect live-verified by the
  maintainer's fork test after restart) + the plugin README keep-knob
  line if it exists.

## Acceptance
- computed / budget / none paths each pinned (smoke), standard gate green
  (probe totals updated, all smokes, pytest 459+1w, ruff F=0), the COMPACT
  line carries the resolved tokens + source.
- LIVE (maintainer, post-restart fork test — NOT yours): a self-compact
  with a computed keep.tokens (~27k) → post-compaction context ≈ 25k base
  + 27k ≈ 52k (NOT 55k, NOT 25k) → proves the body `keep.tokens` is
  honored. If the body is IGNORED (result tracks the config 30k → ~55k),
  report it verbatim in the handover — the fallback ruling is his
  (config-level knob is his file; the plugin's computed value stays logged
  as advisory).

## Worker
`worker_Q3S_170K` (roster-verified live in opencode.jsonc L207).
