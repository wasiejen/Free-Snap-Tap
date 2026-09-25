# Worker summary — TODO #99 (IN PROGRESS — checkpoint before the probe wave)

worker-15, session ses_f2796c5d8ffe8toe7k2neU01G1, model Qwen3.8-27B-Q3S-170K,
loop autorun-2026-09-21_15-33. 2026-09-25.

## State: plugins + smokes DONE + GREEN (commit `ebf59b2`); probe + docs + gate pending

### Done (verified, committed `ebf59b2`)
- **compact_memory.ts**: config `keepTokens` (fail-open, default undefined);
  exported pure `computeKeepTokens` (dual-shape unwrap per #79; user →
  `tokens.input`, assistant → `tokens.output` + `tokens.reasoning`, other
  roles → 0; non-finite/negative/absent count 0; sum > 0 → computed, else
  budgetTokens finite > 0 → budget, else none); execute resolves at
  dispatch (safe `client.session.messages` read in try/catch → fail-open);
  body `keep.tokens` when resolved (`keep.messages` + `keepObj` logic
  UNCHANGED); `appendCompactLine` new signature (resolved BEFORE emergency)
  + new line format `COMPACT <sid> keep=<m>m tok=<t> <source>[ emergency][
  (pre)]`; tool `keepMessages` arg description reworded; header/config/
  line comments updated. NOTE: the execute-local variable is `keepRes`
  (the design's name `resolved` collided with step 2's model-resolution
  result — caught by the smoke, fixed).
- **context_recovery.ts**: local duplicate of `computeKeepTokens` (NOT
  exported — self-contained file); config `keepTokens`; `callSummarize`
  now takes `keep: { messages; tokens? }` (tokens key only when present —
  the none path sends exactly `{ messages }` as before); the hook resolves
  (same safe messages read); `appendCompactLine` new format (no preReadout
  — the event hook carries none); header/config/line comments updated.
- **compact_memory.smoke.mjs: ALL PASS (74/74)** — new pins: computed
  (wrapper-shape `{ data: [...] }`, last 2 of 3 = 6200), budget (seeded
  30000 + `messagesError`), sum-0 → budget (12345), none (body tokens
  `== null` + `tok=- none`); re-pins: self 7m, emg 2m (+emergency), emgdf
  1m, keepcfg 9m/2m; the two cross-model cases now expect
  `rec.messages.length === 2` (the 2nd messages read = the keepTokens
  resolution).
- **context_recovery.smoke.mjs: ALL PASS (17/17)** — fakeClient is now
  mutable (`rcMessages` / `rcMessagesError`, wrapper shape); new cases
  13 (computed 4500) + 14 (budget 42000 — see deviation); re-pins cases
  4/6/10/11 to the new line format.

### Deviations from the design (flag in the final handover)
1. The recovery BUDGET pin (smoke case 14; probe check 286 next) needs the
   sandbox `opencode.jsonc` pair: in context_recovery the model pair comes
   from the SAME messages read — a failed read leaves no pair → CLEAN FAIL
   before the keep resolution ever runs. A sandbox config pair (smoke:
   `budprov/budmodel`) is what lets the budget path execute. The smoke
   case 14 line pins `budmodel` as the model field.
2. `keepRes` variable name in the tool's execute (design said `resolved` —
   collision with the step-2 model result).

### Pending (post-compaction work plan — line refs verified this session;
re-read the probe ranges before editing)
1. **Probe** `.opencode/plugin/probes/handover_probe.mjs`:
   - **S11**: `rcClient.messages` → mutable `rcMessages` /
     `rcMessagesError` (wrapper `{ data: [...] }` shape, exactly like the
     smoke). Re-pin line pins: 78 (chk label + regex, L2344/L2351 →
     `keep=12m tok=- none`), 80 (L2389 → `keep=12m tok=- none emergency`),
     259 (L2459/L2462 → `keep=7m tok=- none`), 260 (L2488 →
     `keep=12m tok=- none`). Update the spec-01 notes in the 78/259
     comments. NEW checks before the S12 header (L2519):
     - `285` computed: `rcMessages` = [user 1200 input, assistant 2500
       output + 800 reasoning] (sum 4500; last 12 → all 2), fresh
       `rcSetStore` (emergencyRecovery true, model_budget { default: 1 },
       delete keepMessages/keepTokens), session `ses_rc_tokcomp` → body
       keep.tokens 4500 + messages 12 + line `keep=12m tok=4500 computed`
       (model field `smoke-model`); restore `rcMessages`.
     - `286` budget fallback: `rcMessagesError = new Error(...)`, store
       `keepTokens: 42000`, **sandbox `opencode.jsonc` pair
       `cfgprov/cfgmodel` (deviation 1)** , session `ses_rc_tokbud` →
       body tokens 42000 + line `keep=12m tok=42000 budget` (model field
       `cfgmodel`); restore `rcMessagesError = null`, remove config,
       `delete store.keepTokens`.
   - **S13**: re-pin 96 (L2902-2903 → `keep=7m tok=- none`), 223
     (L3014-3022 → `keep=2m tok=- none emergency` / `keep=2m tok=- none`),
     226 (L3091/3097 → `keep=1m tok=- none emergency`). Body pins 88
     (L2757) / 89 (L2779) `tokens == null` STAY valid (none path). NEW
     checks before the S14 header (L3102):
     - `287` computed: `qcExec({ summarize: true, messages: { data:
       [user 1200 input, assistant modelID "QC-TokModel" 2500 out + 800
       reasoning] } }, { keepMessages: 2, sessionID: "ses_qc_tokcomp" })`
       → body keep.tokens 4500 + messages 2 + LAST line `keep=2m
       tok=4500 computed` (model field `QC-TokModel` — unlisted, cap 1,
       fresh session).
     - `288` budget: seed store `keepTokens: 30000` AND restore
       `model_budget: { "Qwen3.8-27B-IQ4KT-120K": 3, default: 1 }` (cap 3
       — after checks 222-226 the live model is UNLISTED cap 1 and
       `ses_qc_self` already has count 1 = cap → a SELF compaction would
       be DENIED), SELF `qcExec({ summarize: true, messagesError: new
       Error(...) }, { keepMessages: 4 })` → body keep.tokens 30000 +
       messages 4 + LAST `COMPACT ses_qc_self` line `keep=4m tok=30000
       budget` (model field `Qwen3.8-27B-IQ4KT-120K`); restore store
       (`delete keepTokens`, keep the 222-restored model_budget).
   - **FINGERPRINT** (L6389): ADD `ses_rc_tokcomp`, `ses_rc_tokbud`,
     `ses_qc_tokcomp`, `ses_qc_tokbud`.
   - **Header**: S11 block (L244-290): count 11→13, line formats
     `keep=<m>m tok=- none`, + checks 285/286 descriptions; S13 block
     (L314-342): count 19→21, + checks 287/288 descriptions; annotation
     (L759) → `S1=3 S2=4 S3=5 S4=8 S6=8 S6b=6 S7=11 S8=8 S9=12 S10=9
     S11=13 S12=4 S13=21 S14=7 S15=12 S16=6 S17=26 S18=32 S19=13 S20=15
     S21=12 S22=9 S24=6 S25=7 S26=20 S27=8 hygiene=6` → total **291**
     (`PROBE handover: 291/291 PASS`). VERIFY the annotation against the
     actual run output (the probe self-annotates; the header is the
     source — must agree).
2. **Knowledge note** `.opencode/agent/knowledge/opencode-plugins/
   2026-09-25_compaction_keep_semantics.md` (content per the pre-compact
   design §8: config keep.tokens = direct retention on a constant ~25k
   base; keep.messages does NOT control retention; the summarize BODY
   `keep` field is UNDOCUMENTED in installed SDK 1.18.29 (SessionSummarize
   Data = { providerID, modelID } — types.gen.d.ts L2175); live effect
   PENDING the maintainer's post-restart fork test (computed ~27k → ~52k
   expected; if ignored it tracks the config 30k → ~55k — report
   verbatim); #99 resolution chain + line format; provenance worker-15
   ses_f2796c5d8ffe8toe7k2neU01G1).
3. **TODO.md** #99 status update (keep the open LIVE-fork-test part open
   — that's the maintainer's).
4. **Gate**: probe 291/291; both smokes green (re-run); `./.venv/
   Scripts/python.exe -m pytest -q` → 459 passed + 1 known warning;
   `./.venv/Scripts/ruff.exe check --select F .` → F=0.
5. **Close-out**: FINAL handover (this file, overwrite) — executive
   summary + measured gate readouts + commit hashes (checkpoint `ebf59b2`
   + final) + deviations 1-2 + TODO entries + deliberately-not-done (no
   live test — the maintainer's fork test; no plugin-README edit — no
   keep-knob line exists there) + discrepancies (none found so far; all
   spec line refs verified) + friction check (`submit(feedback=...)`)
   before the handover if any; loop_log DONE line (role worker-15, model
   Qwen3.8-27B-Q3S-170K, session ses_f2796c5d8ffe8toe7k2neU01G1); final
   message = pointer + hashes + gate readout.

## Deliberately NOT done (yet)
- Probe edits, knowledge note, TODO.md, full gate, final handover.
- No live verification (the acceptance's LIVE fork test is the
  maintainer's, post-restart).

## Discrepancies
- None beyond deviations 1-2 above. All spec line refs verified
  (context_recovery keep send at L487 ✓, SDK schema ✓, live budget file
  ✓, probe section line refs re-verified this session ✓).
