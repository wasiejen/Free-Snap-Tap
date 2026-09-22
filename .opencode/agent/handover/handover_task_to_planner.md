# Worker handover — consolidate compaction config into compact_budget.json
STATUS: DONE — task complete, full gate green, committed with this file.

## What changed
One theme (the spec, commit 91d2d0c): `compact_budget.json` is now the SINGLE
compaction-config source. Top-level optional fail-open keys: `keepTokens`
(30_000), `keepMessages` (12), `emergencyRecovery` (strictly true, default
false), `model_budget` (bare model ID → cap + `default` key, default 1).

- `.opencode/plugin/compact_memory.ts`
  - `QUANT_CLASS_RULES` + `classifyQuantClass` REMOVED → `resolveCap(root,
    modelName)`: CPU `/^cpu/i` → cap 0 FIRST (the safety invariant), then the
    EXACT bare-model-id key of the file's `model_budget` map (label
    "model_budget"), else `model_budget.default` (else 1, label "model_budget
    default"). Read PER CALL (a mid-run edit applies to the next call).
  - New `readCompactionConfig(root)`: fail-open reader for the four keys
    (bad values skipped: non-number / negative / non-object; unparseable
    file → defaults; never throws).
  - Keep reporting: `args?.keepTokens ?? cfg.keepTokens` (args still win);
    same for messages. The COMPACT line + the no-args reporting now carry the
    configured values.
  - Budget writes need no special handling: `writeBudget` stringifies the
    WHOLE parsed object, so the config keys survive every increment.
  - Header comments + the tool description updated (quant-class → model_budget).
  - PRESERVED: temp fix 0f192e5 (the commented-out promptAsync) byte-exact,
    all #81 pins, the no-overwrite dump hook, the fire-and-forget paths.
- `.opencode/plugin/deactivated/context_recovery.ts` (STAYS in deactivated/)
  - `KEEP_TOKENS`/`KEEP_MESSAGES` constants, `FLAG_KEY`, `flagEnabled`,
    `stripJsoncComments` (only used there) REMOVED → local self-contained
    `readRecoveryConfig(root)` (deliberately NO runtime import from
    compact_memory.ts — that would pull the tool registration into a
    hook-only plugin): `{ enabled, keepTokens, keepMessages }` from the SAME
    budget file, read PER HOOK FIRE. The compact body + the COMPACT line use
    the configured keeps.
- `.opencode/plugin/tests/compact_memory.smoke.mjs` (57/57)
  - Sandbox budget file seeded with `model_budget:
    { "Qwen3.8-27B-IQ4KT-120K": 3, "Qwen-IQ3-Test": 5, default: 1 }`.
  - Classifier block → `resolveCap` fixtures (exact→5 / live model→3
    "configured value" / unlisted→1 / typo→1 / CPU→0) + a `readCompactionConfig`
    fail-open battery (absent file / valid+bad keys / unparseable).
  - NEW keep-override case: file `keepTokens: 40_000, keepMessages: 9` →
    COMPACT line `tokens=40000 messages=9` when args omitted; explicit args
    still win (555/2); keys removed again after the case.
  - The lenient-v1-read fixture now carries a `model_budget` key (a real v1
    file never had one — the point is the lenient read + the bump on write).
- `.opencode/plugin/tests/context_recovery.smoke.mjs` (ALL PASS, +1 case)
  - Flag fixture moved from sandbox `opencode.jsonc` to sandbox
    `compact_budget.json` (the `sessions` key is included so the flag
    survives the recordSuccess write — case 3 hits the BUDGET gate, not the
    flag gate). Case 2 keep defaults 30_000/12 unchanged.
  - NEW case 6: `{emergencyRecovery: true, keepTokens: 45_000,
    keepMessages: 5}` → compact body `{45000, 5}` + ctx.log line
    `tokens=45000 messages=5` + budget count 1.
- `.opencode/plugin/probes/handover_probe.mjs` (241/241)
  - S11: the JSONC fixture dropped; `rcSetFlag(enabled)` merges the
    `emergencyRecovery` key into the shared budget file. Check 77 asserts
    the flag key is absent/not-true; check 78 seeds it ON (keep 30_000/12
    pins UNCHANGED — no keep keys in the file); 79-81 unchanged (the
    merge-preserving seed keeps the flag through the exhaustion case).
  - S13: L2293 `qcClassify` → `qcResolveCap` (root = SANDBOX); check 87
    seeds `model_budget` into the shared sandbox file (merge) and re-pins
    to the "configured value" fixtures (exact 5 / live model 3 / unlisted 1
    / typo 1 / CPU 0); check 92 label → "configured cap 3" (assertions
    unchanged — 3/3 still); check 95 comment → "the cap lives in the file's
    model_budget map". No checks added/removed → total stays 241.
- `TODO.md` — new entry #84 (this task) added with status LANDED (the
  spec's "this entry" did not exist yet — the file ended at #83; the
  numbering line corrected up to #83/next #84); #83 gained a NOTE that the
  live `emergencyRecovery` flag now lives in compact_budget.json. The commit
  hash is for the planner's follow-up bookkeeping, not written here.

## Measured verification (all run on this host, after the final edits)
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` → ALL PASS (57/57)
- `node .opencode/plugin/tests/context_recovery.smoke.mjs` → ALL PASS
- `node .opencode/plugin/probes/handover_probe.mjs` → PROBE handover: 241/241 PASS
- all 10 plugin smokes → ALL PASS (89/89, 52/52, 22/22, 57/57, —, 3/3, —, 39/39, 24/24, 20/20)
- `./.venv/Scripts/python.exe -m pytest -q` → 459 passed, 1 warning in 2.23s
- `./.venv/Scripts/ruff.exe check --select F .` → All checks passed! (F=0)

## Commit
Code + tests + probe + TODO.md + this handover in ONE commit (staged
explicitly — the other agents' live files: agent_feedback.md,
knowledge_inbox.md, maintainer/ideas.md + the untracked compaction dumps —
were NOT staged). Hash: recorded by the planner in the follow-up
bookkeeping commit (a self-reference is impossible — this file rides in the
same commit). Preceded by checkpoint commit 340e9a6 (IN PROGRESS handover at
the ~87 % stop line, before the self-compaction).

## Deliberately NOT done
- No touch to: the live `.opencode/temp/compact_budget.json`,
  `.opencode/maintainer/`, `.opencode/agent/prompts/`, the live
  `opencode.jsonc`, `auto_resume.ts`, the old `.opencode/tools/
  compact_memory.ts` (S10 pins a different file), the temp fix 0f192e5, the
  #81 pins.
- `context_recovery.ts` was NOT re-activated / merged with compact_memory
  (that is the contingent Task 3, gated on the maintainer's live
  `session.error` hook verification — #83).
- No changes to auto_resume's existing config keys (autoCompact /
  saturationThreshold / outputReserve already per-tick fail-open there).

Lessons: the flag+budget in ONE file means a lenient store read without a
`sessions` key drops the top-level keys — both the smoke and the probe now
seed `sessions` explicitly so the flag-gate vs budget-gate distinction is
real; a worker reading "set this entry to LANDED" should expect the entry
may not exist yet (created #84 instead).
