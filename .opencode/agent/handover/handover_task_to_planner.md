# Worker summary — TODO #99 (IN PROGRESS — checkpoint at 88% context)

worker-15, session ses_f2796c5d8ffe8toe7k2neU01G1, model Qwen3.8-27B-Q3S-170K,
loop autorun-2026-09-21_15-33. 2026-09-25.

## State: NOTHING EDITED YET — full read + design complete, compacting to execute

Read + verified (line refs confirmed against current source):
- `.opencode/plugin/compact_memory.ts` (922 lines): config reader L111-138 (keepMessages
  only), COMPACT line writer `appendCompactLine` L263-279 (`messages=<m>` format),
  keep construction L839-842, summarize call L889, tool arg description L735,
  header comment L83-97 (the stale "keepTokens REMOVED 2026-09-24" note),
  `resolveModel` messages dual-shape pattern L575-579 (#79).
- `.opencode/plugin/context_recovery.ts` (648 lines): config reader L131-158,
  `callSummarize` L477-509 (keep `{ messages }` sent at L487 — the spec's "line ~487"
  confirmed), hook keep L610-620, line writer L248-262, local-duplicate pattern
  (self-contained file, NO import from compact_memory.ts — L66-71).
- Smokes: `tests/compact_memory.smoke.mjs` (573 lines, makeClient already supports
  `spec.messages` / `spec.messagesError`; sandbox store seed L83-87 has model_budget
  only — NO keepTokens/keepMessages) + `tests/context_recovery.smoke.mjs` (268
  lines, one fakeClient with fixed bare-array messages at L36).
- Probe `probes/handover_probe.mjs` (6433 lines): header annotation L759 (total 287),
  S11 section L2211-2517 (checks 76-81, 257-261; rcClient L2265-2279 fixed messages),
  S13 section L2614-3100 (checks 86-99, 222-226), S25 L5623-5721 (no keep/line pins —
  NO re-pin needed), S5 FINGERPRINT array L6389, summary L6421-6433 (self-annotated).
- SDK finding VERIFIED: installed SDK types.gen.d.ts L2175-2189 `SessionSummarizeData`
  body = `{ providerID, modelID }` ONLY — the `keep` field is UNDOCUMENTED (spec
  background confirmed).
- Live budget file `.opencode/temp/compact_budget.json`: `keepTokens: 30000`,
  `keepMessages: 18` (confirmed present).
- Plugin README `.opencode/plugin/README.md`: NO keep-knob line exists (compact_memory
  is not described there) → NO README edit needed (note in final handover).
- Working tree: ONLY maintainer live edits (repo_opencode.md, priority.md,
  opencode.jsonc, loop_log.md) — leave unstaged.

## DESIGN (the resume contract — implement exactly this)

### 1. NEW COMPACT LINE FORMAT (both plugins, pinned in smoke + probe)
`<stamp>[ <model>] COMPACT <sid> keep=<m>m tok=<t> <source>[ emergency][ (<preReadout>)]`
- `<m>` = messagesToKeep (arg when given, else cfg.keepMessages — reporting default
  unchanged); `<t>` = resolved keepTokens; `<source>` ∈ `computed` | `budget` | `none`.
- none path: `tok=- none` (no keep.tokens in the body either).
- emergency suffix position UNCHANGED (after the tok/source fields, before preReadout).

### 2. PURE compute helper (compact_memory.ts EXPORTED for smoke/probe)
```
computeKeepTokens(raw: unknown, keepMessages: number, budgetTokens: number | undefined)
  → { tokens: number | undefined; source: "computed" | "budget" | "none" }
```
- DUAL SHAPE unwrap (the #79 pattern, cf. resolveModel L579): bare array OR
  `{ data: [...] }` wrapper; anything else → null.
- Sum over the last `keepMessages` messages (fewer → all; keepMessages <= 0 → none):
  role `"user"` → `info.tokens.input`; role `"assistant"` → `info.tokens.output +
  info.tokens.reasoning`; other roles → 0. Non-finite / negative / absent token
  values count 0 (fail-open numeric guard).
- sum > 0 → `{ tokens: sum, source: "computed" }`; else budgetTokens finite & > 0 →
  `{ tokens: budgetTokens, source: "budget" }`; else `{ tokens: undefined, source:
  "none" }` (host-config default applies — keep.tokens omitted from the body).

### 3. compact_memory.ts edits
- `CompactionConfig` + `readCompactionConfig`: gain `keepTokens: number | undefined`
  (absent/unreadable → undefined; valid = finite number >= 0 — fail-open pattern of
  the sibling keys; default undefined). Update the config-section comment L83-97
  (keepTokens was removed 2026-09-24, RETURNS 2026-09-25 as the FALLBACK value).
- In execute (step 4, where `keep` is built — L838-842): after `messagesToKeep`,
  resolve: `rawMsgs` = `await client.session.messages({ path: { id: sessionID } })`
  when `typeof client?.session?.messages === "function"`, else null; wrap in
  try/catch (RPC failure → null). `resolved = computeKeepTokens(rawMsgs,
  messagesToKeep, cfg.keepTokens)`; `if (resolved.tokens != null) keep.tokens =
  resolved.tokens;` — `keep.messages` logic UNCHANGED, `keepObj` logic UNCHANGED.
  Pass `resolved` to `appendCompactLine` in BOTH paths (the v2 compact path sends no
  keep fields — body `never` — but the line still reports the resolved value).
- `appendCompactLine(root, context, sessionID, model, messages, resolved, emergency)`:
  new line format per §1 (param order: resolved BEFORE emergency, mirroring the
  messages→emergency order).
- Tool arg description L735 reworded (schema UNCHANGED — still 4 args):
  `"Recent messages to retain (e.g. 18) — drives a keepTokens computation at dispatch
  time: the token size of the last N messages is sent as keep.tokens in the summarize
  body (the host retains the token budget, not the count); the budget file's
  keepTokens is the fallback when the read fails or the sum is 0."`
- Header comment: update the keep-knob note (L86-87 + L41-46 resolution note as
  needed — keep the prose in step with the behavior).

### 4. context_recovery.ts edits (LOCAL DUPLICATES — the file is self-contained)
- `RecoveryConfig` + `readRecoveryConfig`: gain `keepTokens` (same fail-open).
- Local duplicate of `computeKeepTokens` (NOT exported — the file exports the default
  factory ONLY; keep it byte-equivalent in logic to the tool's exported one).
- `callSummarize` signature: `keepMessages: number` → `keep: { messages: number;
  tokens?: number }`; body: `withKeep ? { ...base, keep } : base` (tokens key only
  when present — the none path sends `keep: { messages }` exactly as today).
- In the hook (L610-620): resolve `rawMsgs` via the safe messages read (same pattern
  as the tool), `resolved = computeKeepTokens(rawMsgs, cfg.keepMessages,
  cfg.keepTokens)`, build `keep = { messages: cfg.keepMessages, ...(resolved.tokens !=
  null ? { tokens: resolved.tokens } : {}) }`, pass to callSummarize; `appendCompactLine`
  gains `resolved` (new line format, no preReadout field — the event hook carries none).
- Header comments L18-20, L110-112 (the stale "keepTokens REMOVED" notes) updated.

### 5. compact_memory.smoke.mjs
- New pins (insert before the final `finish()`, keep the existing seed-store restore
  discipline — delete any keepTokens seeded after the case):
  - COMPUTED: `withClient({ summarize: true, messages: { data: [3 msgs with role +
    tokens.info] } })`, exec `{ keepMessages: 2, sessionID: "ses_sm_toks" }` → body
    `keep.tokens` = exact sum of last 2 (user: tokens.input; assistant: tokens.output
    + tokens.reasoning) + `keep.messages === 2`; line `COMPACT ses_sm_toks keep=2m
    tok=<sum> computed$`.
  - BUDGET FALLBACK (messages read fails): seed store `keepTokens: 30000`;
    `withClient({ summarize: true, messagesError: new Error(...) })` SELF exec
    `{ keepMessages: 4 }` (no sessionID — model pair from extra.model, so the failed
    read only kills the computed path) → body `keep.tokens === 30000`; LAST
    `COMPACT ses_sm_self` line (filter+at(-1)) `keep=4m tok=30000 budget$`; restore
    store (delete keepTokens).
  - COMPUTED SUM 0 → BUDGET: messages present (bare entry, no tokens) + seeded
    `keepTokens: 12345` → body 12345, line `tok=12345 budget`; restore.
  - NONE: plain `withClient({ summarize: true })` (no messages, no keepTokens) cross
    exec `{ keepMessages: 5, sessionID: "ses_sm_toknone" }` → `keep.tokens == null` +
    line `keep=5m tok=- none$`.
- Re-pin (all currently `messages=<n>` line pins → `keep=<n>m tok=- none`, since the
  seed store has no keepTokens and the default fakes have no tokens):
  self-success L197 (`keep=7m tok=- none`); emg L432-439 (`keep=2m tok=- none
  emergency` / `keep=2m tok=- none`); emg0 L433 search; emgdf L484 (`keep=1m tok=-
  none emergency`); keepcfg L507/L513 (`keep=9m`/`keep=2m` + `tok=- none`).
  Body pins `keep.tokens == null` (L190, L218, L256) STAY valid (none path) — keep.
- Header comment L12-17: update the "tokens keep knob is GONE" note → #99.

### 6. context_recovery.smoke.mjs
- fakeClient: mutable `let rcMessages = [default entry]` + `let rcMessagesError =
  null`; `messages: (o) => rcMessagesError != null ? Promise.reject(rcMessagesError)
  : Promise.resolve({ data: rcMessages })` (RequestResult wrapper shape).
- New cases (before the final cleanup): COMPUTED (rcMessages = user 1200 input +
  assistant 2500 output + 800 reasoning → sum 4500; fixture `{ version: 2,
  emergencyRecovery: true, sessions: {} }`; session `ses_smoke_tokcomp` → body
  keep { messages: 12, tokens: 4500 }, line `keep=12m tok=4500 computed`); BUDGET
  (rcMessagesError set + fixture `keepTokens: 42000`; session `ses_smoke_tokbud` →
  body tokens 42000, line `keep=12m tok=- … tok=42000 budget`); restore rcMessages /
  error / fixture after each.
- Re-pin lines: case 4 L114 (`keep=12m tok=- none$`), case 6 L147 (`keep=12m tok=-
  none emergency$`), case 10 L214 (`keep=7m tok=- none$`), case 11 L238 (`cfgmodel …
  keep=12m tok=- none$`). Body pins `keep.tokens === undefined` STAY valid.
- Header comment: update the keep notes.

### 7. handover_probe.mjs
- S11 (L2211-2517): rcClient.messages → mutable `rcMessages` / `rcMessagesError`
  (wrapper shape) exactly like the smoke. Re-pin line pins: 78 L2351 (`keep=12m
  tok=- none$`), 80 L2389 (`keep=12m tok=- none emergency$`), 259 L2462 (`keep=7m
  tok=- none$`), 260 L2488 (`keep=12m tok=- none$`); body `keep.tokens === undefined`
  pins STAY valid. NEW checks (append before the S12 header L2519):
  - `285` computed: rcMessages with tokens (sum 4500), session `ses_rc_tokcomp` →
    body keep.tokens 4500 + line `keep=12m tok=4500 computed$`.
  - `286` budget fallback: rcMessagesError + store keepTokens 42000, session
    `ses_rc_tokbud` → body 42000 + line `keep=12m tok=42000 budget$`. Restore after.
- S13 (L2614-3100): re-pin 96 L2903 (`keep=7m tok=- none$`), 223 L3014-3022
  (`keep=2m tok=- none emergency` / `keep=2m tok=- none`), 226 L3091/3097
  (`keep=1m tok=- none emergency$`). Body pins (88 L2757, 89 L2779 `tokens == null`)
  STAY valid (none path). NEW checks (append before the S14 header L3102):
  - `287` computed: `qcExec({ summarize: true, messages: { data: [2+ msgs with
    tokens] } }, { keepMessages: 2, sessionID: "ses_qc_tokcomp" })` → body exact sum
    + line `keep=2m tok=<sum> computed$` (last entry's modelID = an unlisted id, cap 1,
    fresh session).
  - `288` budget: seed store `keepTokens: 30000` + restore
    `model_budget: { "Qwen3.8-27B-IQ4KT-120K": 3, default: 1 }` (cap 3 — after check
    222 the live model is UNLISTED cap 1 and ses_qc_self already has count 1 = cap,
    which would DENY); SELF `qcExec({ summarize: true, messagesError: new
    Error(...) }, { keepMessages: 4 })` → body 30000 + LAST `COMPACT ses_qc_self`
    line `keep=4m tok=30000 budget$`; restore store (delete keepTokens, keep the
    model_budget as 222 left it… S25 check 256 only needs a fresh session + cap >= 1,
    either map works — restore exactly the 222 state to be safe).
- FINGERPRINT array L6389: ADD `ses_rc_tokcomp`, `ses_rc_tokbud`, `ses_qc_tokcomp`,
  `ses_qc_tokbud`.
- Header: S11/S13 section comments gain the new-check descriptions; annotation L759
  → `S11=13 … S13=21 …` → total 291 (`S1=3 S2=4 S3=5 S4=8 S6=8 S6b=6 S7=11 S8=8 S9=12
  S10=9 S11=13 S12=4 S13=21 S14=7 S15=12 S16=6 S17=26 S18=32 S19=13 S20=15 S21=12
  S22=9 S24=6 S25=7 S26=20 S27=8 hygiene=6 → "PROBE handover: 291/291 PASS"`).
  VERIFY the annotation against the actual run output (the probe self-annotates; the
  header annotation is the source — must agree).
- S25: NO change needed (no keep/line pins).

### 8. Docs
- NEW `.opencode/agent/knowledge/opencode-plugins/2026-09-25_compaction_keep_semantics.md`
  (dated note, provenance per the folder README):
  - config `compaction.keep.tokens` (opencode.jsonc) = DIRECT retention added on top of
    a CONSTANT ~25k base (system + summary + minimal tail): tokens=30000 → ~55k
    post-compaction; tokens=0 + keepMessages=X → always ~25k (keep.messages does NOT
    control retention) — measured live 2026-09-25, host v1.18.31.
  - dev-branch host source (packages/opencode/src/session/compaction.ts): V2 keeps a
    token-budget tail (preserve_recent_tokens ?? clamp(0.25*usable, 2k..15k)) +
    optional tail_turns; NO message-count knob anywhere.
  - the summarize BODY `keep` field is UNDOCUMENTED in the installed SDK 1.18.29
    (SessionSummarizeData body = { providerID, modelID } only — types.gen.d.ts L2175);
    the plugin sends keep { messages, tokens? } untyped; live effect PENDING the
    maintainer's post-restart fork test (computed ~27k → ~52k expected; if ignored the
    result tracks the config 30k → ~55k — report verbatim to the handover).
  - #99: resolution = computed primary (last keepMessages messages' tokens) →
    budget-file keepTokens fallback → omit; the COMPACT line carries `keep=<m>m
    tok=<t> <source>` (computed|budget|none).
  - provenance: installed @opencode-ai/sdk 1.18.29 types.gen.d.ts + maintainer live
    measurements 2026-09-25 (host v1.18.31) + maintainer-provided dev-branch link;
    worker-15 ses_f2796c5d8ffe8toe7k2neU01G1.
- Plugin README: NO keep-knob line exists → NO edit (state this in the final handover).

### 9. Gate + close-out
- Gate: `node .opencode/plugin/probes/handover_probe.mjs` → 291/291; BOTH smokes green;
  `./.venv/Scripts/python.exe -m pytest -q` → 459 passed + 1 known warning;
  `./.venv/Scripts/ruff.exe check --select F .` → F=0.
- TODO.md: update #99 status (the entry text — read it on resume; keep the open
  LIVE-fork-test part open, that's the maintainer's).
- Checkpoint commits per verified unit (plugins / smokes / probe+docs / final).
- FINAL handover (this file, overwrite): executive summary + measured gate readouts +
  commit hashes + TODO entries + deliberately-not-done (no live test — the maintainer's
  fork test; no README edit) + discrepancies (none found so far; all spec line refs
  verified).
- Friction check: `submit(feedback=...)` before the handover if any friction.
- Loop log: DONE line via `loop_log` (role worker-15, model Qwen3.8-27B-Q3S-170K,
  session ses_f2796c5d8ffe8toe7k2neU01G1).

## Deliberately NOT done (yet)
- No code/test/doc edits (this checkpoint precedes the edit wave).
- No live verification (the acceptance's LIVE fork test is the maintainer's,
  post-restart).

## Discrepancies
- None so far. All spec line refs verified (context_recovery keep send at L487 ✓,
  SDK schema ✓, live budget file ✓).
