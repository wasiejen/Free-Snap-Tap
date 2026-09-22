# Task: consolidate ALL compaction config into compact_budget.json

Goal: one config source of truth. Move the compaction knobs out of code and out of
`opencode.jsonc` into `.opencode/temp/compact_budget.json` (optional top-level keys,
per-tick, fail-open defaults). Includes the new `model_budget` map (maintainer GO
2026-09-22). This unblocks him activating the plugin to test.

## Verified current state (spec-time facts — do not re-derive)
- `compact_memory.ts`: `QUANT_CLASS_RULES` (L79-86) = ordered substring table
  (`/cpu/`→0, `/iq4|q4/`→3, `/iq3|q3/`→3, `/iq2|q2/`→1, default 1); `classifyQuantClass`
  (L91-96) resolves the cap; the cap is NOT in the file (L121). Budget store =
  per-session `{count, updated, model}`, increment-on-success (L112-121). The stored
  `model` is the BARE model ID (e.g. `Qwen3.8-27B-Q3S-160K`). Temp fix `0f192e5`
  (the `queueMessage` promptAsync is commented out) is LIVE — preserve it.
- `deactivated/context_recovery.ts`: `KEEP_TOKENS=30000` (L46), `KEEP_MESSAGES=12`
  (L47) hardcoded; `FLAG_KEY="emergencyRecovery"` read from `opencode.jsonc` (L50).
- `auto_resume.ts`: already reads `autoCompact` / `saturationThreshold` (0.95) /
  `outputReserve` (20000) per tick (the 86713d8 change) — leave those alone.
- `compact_budget.json`: top-level keys `["version","sessions"]` (+ the 3 auto_resume keys).

## Config keys (all optional top-level, fail-open defaults)
`autoCompact` (bool, true) · `saturationThreshold` (num, 0.95) · `outputReserve`
(num, 20000) · `keepTokens` (num, 30000) · `keepMessages` (num, 12) ·
`emergencyRecovery` (bool, **false** — MOVED out of opencode.jsonc) ·
`model_budget` (map, see below).

`model_budget` (replaces `QUANT_CLASS_RULES`): map of **bare model ID → cap number**,
plus a **`default`** key (default value 1). Resolution: exact model-ID match → its
cap; unlisted → `model_budget.default`; a typo key simply never matches (fails safe).
**CPU guard (safety invariant):** a model ID matching `/^cpu/i` → cap **0** regardless
of the map (keep the CPU exclusion; it is not a tunable budget).

## The change (the WHAT — the HOW is yours inside the DoD)
1. `compact_memory.ts`: replace `QUANT_CLASS_RULES`/`classifyQuantClass` with
   `resolveCap(modelName)` reading `model_budget` from `compact_budget.json`
   (fail-open: CPU→0; else exact match → cap; else `default` → 1). Read
   `keepTokens`/`keepMessages` from the config (defaults 30000/12). Preserve the
   temp fix `0f192e5` and all #81-pinned behavior.
2. `deactivated/context_recovery.ts` (DO NOT move it out of `deactivated/` — the
   maintainer activates it separately): read `keepTokens`/`keepMessages`/
   `emergencyRecovery` from `compact_budget.json` (instead of the hardcoded constants
   + the opencode.jsonc `FLAG_KEY`), so activation works off the centralized config.
3. Tests: `tests/compact_memory.smoke.mjs` — the existing trap pin
   (`Qwen3.8-27B-IQ4KT-120K` → cap 3) becomes "the configured value for that model ID /
   default"; add cases: `model_budget` exact match, unlisted→default, typo key→default,
   CPU→0, `keepTokens`/`keepMessages` override, `emergencyRecovery` from config.
   `tests/context_recovery.smoke.mjs` — flag + keeps now from config. Use **node** for
   any arithmetic.

## Definition of done (measurable)
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` and
  `node .opencode/plugin/tests/context_recovery.smoke.mjs` → ALL green.
- Full gate green: `node .opencode/plugin/probes/handover_probe.mjs` (241/241, with the
  trap pin updated), all plugin smokes, `pytest -q` (459 passed + 1 warning),
  `ruff check` (F=0).
- TODO.md: this entry → status `LANDED` (the hash is recorded by the planner in the
  follow-up bookkeeping commit — do NOT write your own hash in the same commit).

## DO-NOT-touch
- The temp fix `0f192e5` in compact_memory (the commented-out `queueMessage` promptAsync).
- The #81 pins (probe `[97]` + the compact_memory message pin).
- `auto_resume.ts` (its 3 config keys stay as-is).
- Do NOT move `context_recovery.ts` out of `deactivated/`.
- The LIVE `.opencode/temp/compact_budget.json` (tests use a sandbox copy).
- Anything under `.opencode/maintainer/`, `.opencode/agent/prompts/`, or the live `opencode.jsonc`.

Worker: `worker_Q3S_170K` (multi-file config refactor + test updates).
