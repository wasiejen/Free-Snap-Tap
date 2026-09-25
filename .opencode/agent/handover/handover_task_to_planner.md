# Worker summary — TODO #99 (FINAL)

worker-15, session ses_f2796c5d8ffe8toe7k2neU01G1, model Qwen3.8-27B-Q3S-170K,
loop autorun-2026-09-21_15-33. 2026-09-25.

## State: DONE + GREEN — all units committed; LIVE fork test pending (maintainer's)

### Done (verified, committed)

- **compact_memory.ts** (commit `ebf59b2`): config `keepTokens` (fail-open,
  default undefined); exported pure `computeKeepTokens` (dual-shape unwrap
  per #79; user → `tokens.input`, assistant → `tokens.output` +
  `tokens.reasoning`, other roles → 0; non-finite/negative/absent count 0;
  sum > 0 → computed, else budgetTokens finite > 0 → budget, else none);
  execute resolves at dispatch (safe `client.session.messages` read in
  try/catch → fail-open); body `keep.tokens` when resolved (`keep.messages`
  + `keepObj` logic UNCHANGED); `appendCompactLine` new signature (resolved
  BEFORE emergency) + new line format `COMPACT <sid> keep=<m>m tok=<t>
  <source>[ emergency][ (<preReadout>)]`; tool `keepMessages` arg
  description reworded; header/config/line comments updated. NOTE: the
  execute-local variable is `keepRes` (the design's name `resolved`
  collided with step 2's model-resolution result — caught by the smoke,
  fixed).
- **context_recovery.ts** (commit `ebf59b2`): local duplicate of
  `computeKeepTokens` (NOT exported — self-contained file); config
  `keepTokens`; `callSummarize` now takes `keep: { messages; tokens? }`
  (tokens key only when present — the none path sends exactly `{ messages }`
  as before); the hook resolves (same safe messages read);
  `appendCompactLine` new format (no preReadout — the event hook carries
  none); header/config/line comments updated.
- **compact_memory.smoke.mjs** (commit `ebf59b2`): ALL PASS (74/74).
  New pins: computed (wrapper-shape `{ data: [...] }`, last 2 of 3 = 6200),
  budget (seeded 30000 + `messagesError`), sum-0 → budget (12345), none
  (body tokens `== null` + `tok=- none`); re-pins: self 7m, emg 2m
  (+emergency), emgdf 1m, keepcfg 9m/2m; the two cross-model cases now
  expect `rec.messages.length === 2` (the 2nd messages read = the
  keepTokens resolution).
- **context_recovery.smoke.mjs** (commit `ebf59b2`): ALL PASS (17/17).
  fakeClient is now mutable (`rcMessages` / `rcMessagesError`, wrapper
  shape); new cases 13 (computed 4500) + 14 (budget 42000 — see
  deviation); re-pins cases 4/6/10/11 to the new line format.
- **handover_probe.mjs** (commit `c5859c7`): S11 mutable `rcClient`
  (`rcMessages` / `rcMessagesError`); re-pins 78/80/259/260 to the new
  line format `keep=<m>m tok=<t> <source>`; new checks 285 (computed
  4500, wrapper shape) + 286 (budget 42000, config pair); S13 re-pins
  96/223/226 to the new format; new checks 287 (computed 4500, tool
  path) + 288 (budget 30000, SELF cap-3 restore); FINGERPRINT +3 ids
  (`ses_rc_tokcomp`, `ses_rc_tokbud`, `ses_qc_tokcomp`); header S11
  11→13, S13 19→21; annotation 287→291.
- **Knowledge note**:
  `.opencode/agent/knowledge/opencode-plugins/2026-09-25_compaction_keep_semantics.md`
  (retention model, SDK UNDOCUMENTED `keep` field, resolution chain,
  line format, implementation notes, provenance).
- **TODO.md** #99 status updated: IMPLEMENTED (worker-15, 2026-09-25,
  commit c5859c7 + ebf59b2); LIVE fork test part stays OPEN
  (maintainer's).

### Full gate (measured, this session)

| gate | result |
|---|---|
| probe | **291/291 PASS** |
| compact_memory.smoke.mjs | **74/74 PASS** |
| context_recovery.smoke.mjs | **17/17 PASS** |
| pytest | **459 passed, 1 warning** |
| ruff F | **0** (All checks passed) |

### Deviations from the design (flagged)

1. The recovery BUDGET pin (smoke case 14; probe check 286) needs the
   sandbox `opencode.jsonc` pair: in context_recovery the model pair comes
   from the SAME messages read — a failed read leaves no pair → CLEAN FAIL
   before the keep resolution ever runs. A sandbox config pair (smoke:
   `budprov/budmodel`, probe: `cfgprov/cfgmodel`) is what lets the budget
   path execute. The smoke case 14 line pins `budmodel` as the model
   field; probe check 286 pins `cfgmodel`.
2. `keepRes` variable name in the tool's execute (design said `resolved` —
   collision with the step-2 model result).

### Deliberately NOT done

- **No live verification** — the acceptance's LIVE fork test is the
  maintainer's (post-restart). The plugin's behavior is fully
  smoke/probe-pinned; the live effect of the `keep.tokens` body field
  is UNVERIFIED (the SDK schema is UNDOCUMENTED).
- **No plugin-README edit** — no keep-knob line exists there (the
  plugin README does not document the compaction knobs).

### Discrepancies

- None beyond deviations 1-2 above. All spec line refs verified
  (context_recovery keep send, SDK schema, live budget file, probe
  section line refs).

### Commit hashes

- `ebf59b2` — plugins + smokes (the #99 implementation)
- `c5859c7` — probe (re-pins + new checks 285-288 + FINGERPRINT + header)
- (this commit) — knowledge note + TODO.md + final handover

### Friction check

- None notable. The `tokens` field position (`entry.info.tokens` vs
  top-level `entry.tokens`) caused a quick probe fix (checks 285/287
  initially placed `tokens` at the wrong level) — resolved in one
  re-run.

### Lessons

- The `computeKeepTokens` function expects `tokens` INSIDE `info`
  (`entry.info.tokens.input`, `entry.info.tokens.output`,
  `entry.info.tokens.reasoning`), not at the top level of the message
  entry. Probe/smoke fixtures must match this shape.
