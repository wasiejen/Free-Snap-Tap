# Task: make unit-2 saturation threshold + output reserve configurable

Goal: the auto_resume **unit 2** (context-saturation trigger) fires too early — at
ratio 0.85 of a usable window that already subtracts `min(20000, output)`, so on a
170k-context model it fires at ~127.5k and wastes ~28% of the usable window. Make the
threshold and the reserve **configurable** (per-tick, fail-open) and **raise the default
threshold to 0.95** (maintainer ruling 2026-09-22: "only trigger it past the 95% line";
he will raise it further toward ~0.98 once the limit-detection backstop exists).

## Verified current state (spec-time facts — do not re-derive)
- `.opencode/plugin/auto_resume.ts`:
  - L140 `const SATURATION_THRESHOLD = 0.85;` and L141 `const RESERVE_MIN_OUTPUT = 20000;`
  - L193 `const usableCache = new Map<string, number>();` (caches the FINAL usable number).
  - L305-351 `getUsable(model)`: fetches provider list → model entry → `limit.{context,output}`;
    returns `context - Math.min(RESERVE_MIN_OUTPUT, output)`; fail-safe null; caches the number.
  - L359-369 `autoCompactEnabled()`: per-tick READ-ONLY parse of `.opencode/temp/compact_budget.json`
    (fail-open: missing/malformed/key-absent → ON). This is the pattern to reuse.
  - L752-774 `tick()`: per armed+idle watch → `getUsable(w.model)` → `ratio = lastTokenTotal/usable`
    → if `ratio >= SATURATION_THRESHOLD` and `autoCompactEnabled()` → `sendSelfCompact` (once per busy cycle).
- Budget file live shape: top-level keys `["version","sessions"]` (no `autoCompact`/threshold keys yet).
- Test pattern: `tests/auto_resume.smoke.mjs` UNIT-2 section (~L140-350) uses a **sandbox** budget
  file (never the live one) and a mocked provider; the current checks assume the 0.85 threshold +
  20000 reserve.

## The change (the WHAT — the HOW is yours inside the DoD)
1. Add optional top-level keys to the per-tick config (reuse the `autoCompactEnabled` parse):
   `saturationThreshold` (number, valid 0 < t < 1; **default 0.95**) and
   `outputReserve` (non-negative number; **default 20000**). Fail-open: absent / unparseable /
   out-of-range → the default. Read per tick (so a live edit takes effect next tick), read-only.
2. Cache the **model limits** `{context, output}` (stable) instead of the final usable: rename
   `usableCache` → `limitsCache` and `getUsable` → `getModelLimits(model)`: `Promise<{context,output}|null>`.
   In `tick()` compute per tick: `usable = context - Math.min(reserve, output)`; guard `usable > 0`.
3. Fire when `ratio >= threshold` (the configurable value) and `autoCompactEnabled()`.
4. Update the file's header comments (L137-149 region) to describe the configurable keys + defaults.
5. `tests/auto_resume.smoke.mjs` UNIT-2 section: update the existing fire/no-fire token
   expectations for the **new 0.95 default** and add cases: (a) no config → 0.95/20000 fail-open;
   (b) `saturationThreshold` set → fires at that value; (c) `outputReserve` set → usable uses it;
   (d) out-of-range value → fail-open default. Use **node** for the token arithmetic (never
   hand-compute).

## Definition of done (measurable)
- `node .opencode/plugin/tests/auto_resume.smoke.mjs` → ALL green (baseline 76/76, + your new checks).
- Full gate green: `node .opencode/plugin/probes/handover_probe.mjs` (241/241), all plugin smokes,
  `pytest -q` (459 passed + 1 warning), `ruff check` (F=0).
- `auto_resume.ts` loads (the `surface= v=` hash CHANGES — expected for a source change); confirm no
  OTHER probe pin breaks.
- TODO.md: this entry → status `LANDED` (the hash is recorded by the planner in the follow-up
  bookkeeping commit — do NOT write your own hash into the same commit).

## DO-NOT-touch
- `.opencode/plugin/compact_memory.ts` (maintainer temp-fix 0f192e5 — hands off).
- The probe's [97] compact-memory message pin and the #80 agent-retention checks — this change is
  unit-2-only.
- Unit 3 / unit 4 / the scope-verdict code paths.
- The LIVE `.opencode/temp/compact_budget.json` (tests use a sandbox copy — keep it that way).
- Anything under `.opencode/maintainer/`, `.opencode/agent/prompts/`, or the live `opencode.jsonc`.

Worker: `worker_Q3S_170K` (precise single-file plugin change + test updates).
