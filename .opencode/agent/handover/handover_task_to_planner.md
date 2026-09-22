# Worker handover — consolidate compaction config into compact_budget.json
STATUS: IN PROGRESS (checkpoint committed at the ~87 % stop line; self-compacted to continue — resume from THIS file + the task spec, not memory)

## Task
Spec: `.opencode/agent/handover/handover_task.md` (commit 91d2d0c) — the source of truth:
config keys, model_budget semantics, DoD, DO-NOT-touch list. All re-verified by this
session BEFORE this checkpoint; nothing re-derived yet at the spec's verified facts.

## Done so far (read-only recon, no code changed)
- Read spec, repo_overview, repo_commands, both smokes, full probe S10/S11/S13/S25
  regions, auto_resume.ts per-tick config pattern (fail-open style to mirror),
  live compact_budget.json (keys: version + sessions ONLY — no config keys yet).
- `classifyQuantClass` referenced only in: compact_memory.ts (live), deactivated
  frozen copies (leave), compact_memory.smoke.mjs, handover_probe.mjs (L2293).
- TODO.md: NO entry for this task yet (file ends at #83; header numbering line
  says "up to #82" — stale). Will add new entry #84 with status LANDED
  (no own commit hash in the same commit — planner records it in bookkeeping).

## Design (settled — implement exactly this)
1. `compact_memory.ts`:
   - Delete `QUANT_CLASS_RULES` + `classifyQuantClass`. New exported
     `resolveCap(root: string, modelName: string): { cap: number; label: string }`:
     `/^cpu/i` → cap 0 label "cpu (excluded)" FIRST (safety invariant); else read
     `model_budget` from `<root>/.opencode/temp/compact_budget.json` (per-call,
     fail-open): exact bare-model-ID key → its cap (label "model_budget");
     else `model_budget.default` key (finite number) → it, else 1 (label
     "model_budget default"). Typo keys simply never match.
   - New `readCompactionConfig(root)` returning `{ keepTokens, keepMessages,
     emergencyRecovery, model_budget }` — fail-open defaults 30_000 / 12 / false /
     {}; validation: keep* = finite number >= 0 else default; emergencyRecovery
     = strictly `true`; model_budget = plain object, finite-number values only
     (skip bad entries). Mirror the auto_resume.ts saturationConfig style.
   - Keep reporting: `tokensToKeep = args?.keepTokens ?? cfg.keepTokens` (same for
     messages) — args still win.
   - execute: step 3 uses `resolveCap(root, model)`. Refusal template keeps
     `model class ${label} (cap ${cap}), used ${count}/${cap}` wording (checks
     pin only "cap N" + "N/N").
   - Budget writes PRESERVE top-level config keys automatically: readBudget returns
     the parsed object (extra keys survive) and writeBudget stringifies it — no
     change needed.
   - Update: header comments (L48-56 classifier paragraph, L16-18 "cap lives in the
     classifier" line), tool description sentence ("per model quant-class" →
     model_budget map), the `DEFAULT_KEEP_TOKENS/MESSAGES` comments (now the
     fail-open defaults of the config keys).
   - PRESERVE: temp fix 0f192e5 (commented promptAsync L576-577) byte-exact,
     #81 pins, everything else.
2. `deactivated/context_recovery.ts` (STAYS in deactivated/):
   - Drop KEEP_TOKENS/KEEP_MESSAGES constants + FLAG_KEY + flagEnabled +
     stripJsoncComments (only used there). New `readRecoveryConfig(root)` from
     compact_budget.json: `{ enabled: boolean (strictly true), keepTokens,
     keepMessages }`, fail-open defaults false/30_000/12 (same validation as
     compact_memory). Hook: after the overflow-marker gate, `const cfg =
     readRecoveryConfig(root); if (!cfg.enabled) return;` then keep = cfg values in
     the compact body + the COMPACT line. Read PER FIRE (mid-run flip = next
     overflow). Update header comments (flag L12-16, keep L23-25).
   - Budget read/write unchanged (v1 lenient shape; writes preserve keys).
3. `tests/compact_memory.smoke.mjs`:
   - Export check → `typeof mod.resolveCap === "function"`.
   - Seed the sandbox budget file with
     `model_budget: { "Qwen3.8-27B-IQ4KT-120K": 3, "Qwen-IQ3-Test": 5,
     "Qwen-IQ3-Test-typo": 7, "default": 1 }` (merge into storePath early).
   - Classifier block → resolveCap(SANDBOX, ...) cases: exact→5, live-model→3
     (configured value), unlisted→1, typo→1, CPU→0.
   - New: keepTokens/keepMessages override — seed keepTokens 40_000 + keepMessages
     9, execute WITHOUT keep args → COMPACT line tokens=40000 messages=9;
     WITH args → args win. (Existing byte-exact line checks all pass keep args —
     unaffected.)
4. `tests/context_recovery.smoke.mjs`:
   - Flag fixture: sandbox compact_budget.json instead of opencode.jsonc.
     Case 1 no file → OFF. Case 2 write `{emergencyRecovery: true}` → success
     (keep defaults 30_000/12 — assertions unchanged). Case 3 exhausted (merge-
     preserving write). Case 4 non-overflow. Case 5 `{emergencyRecovery: false}`
     → OFF. NEW case 6: keep override `{emergencyRecovery: true, keepTokens:
     45_000, keepMessages: 5}` → compact body.keep {45000,5} + ctx.log line.
   - Remove all opencode.jsonc writes + the JSONC comment fixture.
5. `probes/handover_probe.mjs`:
   - S11: drop the SB_JSONC/JSONC_FIXTURE use — check 77 asserts the budget file
     has NO `emergencyRecovery: true` (file exists with S10 entries → OFF);
     check 78 seeds the budget file `emergencyRecovery: true` (merge, preserve
     sessions) before firing; keep {30_000,12} + directive + line pins UNCHANGED
     (checks 79/80/81 keep passing — rcSeedBudget already merges the whole
     object). rcSeedBudget stays (it preserves top-level keys).
   - S13: L2293 `qcClassify` → `qcResolveCap = qcMod.resolveCap`; add a model_budget
     seed block (same 4-key map as the smoke) right before check 86 (merge into
     the shared sandbox budget file); check 87 → resolveCap(SANDBOX, name)
     fixtures: exact 5 / live-model 3 / unlisted 1 / typo 1 / CPU 0, label
     "model_budget fixtures … configured value for that model ID". Check 95
     label: cap now lives in the file's model_budget map (entry stays
     {count, updated, model}). Header EXPECTED-OUTPUT line L655 stays 241/241
     (S11=6 S13=14 unchanged — only labels/fixturing changed, no new checks).
6. TODO.md: append entry #84 (this task), status LANDED, "hash recorded by the
   planner in the follow-up bookkeeping" — do NOT write my own commit hash there.
   Also fix the stale numbering line ("used so far up to #82, new entries start
   at #83" → up to #83, next #84).

## Constraints honored
- Do NOT touch: live compact_budget.json, .opencode/maintainer/, .opencode/agent/
  prompts/, live opencode.jsonc, auto_resume.ts, deactivated/ location of
  context_recovery.ts, temp fix 0f192e5, #81 pins, the old `.opencode/tools/
  compact_memory.ts` (S10 pins a DIFFERENT file — leave it).
- Git: stage ONLY my files (agent_feedback.md, knowledge_inbox.md,
  maintainer/ideas.md + untracked dumps are OTHER agents' live files — do not
  commit them). One commit: code + tests + probe + TODO.md + handover files.
- node for any arithmetic (none needed — all literals).

## Verification (DoD)
- node .opencode/plugin/tests/compact_memory.smoke.mjs → ALL PASS
- node .opencode/plugin/tests/context_recovery.smoke.mjs → ALL PASS
- node .opencode/plugin/probes/handover_probe.mjs → 241/241
- all other plugin smokes (plugin/tests/*.smoke.mjs)
- ./.venv/Scripts/python.exe -m pytest -q → 459 passed + 1 warning
- ./.venv/Scripts/ruff.exe check --select F . → F=0
