# Task spec — TODO #98 (unit-4 resume-after-compaction) — Parts A + B

**Goal:** implement the approved `proposals/approved/2026-09-23_unit4-compaction-resume.md`
(his `--comment` "approved A, B and C") in `.opencode/plugin/auto_resume.ts`:
- **Part A** — line-anchor the action-line regex (the 2026-09-23 20:14Z mis-route cause).
- **Part B** — re-arm unit-4 routing on a NEW ctx.log `COMPACT <sid>` line (the silent-compaction gap).

**Verification facts (measured 2026-09-25 by the planner — do NOT re-derive):**
- `ACTION_RE` is at auto_resume.ts **L269**: `const ACTION_RE = /action:\s*(restart|resume|stop|ask_maintainer)/g;` (still UNANCHORED).
- The scan `lastAssistantAction` (**L1171-1183**): resets `ACTION_RE.lastIndex = 0` (L1178), then a while-loop takes the LAST match (L1181 `found = m[1]`).
- The tick `tick()` (**L1369-1387**): `await checkSpawnTrigger()` then `for (const [sid, w] of watches)` → `routeScopedIdle` for idlePending sids. There is **NO** ctx.log COMPACT tail-read.
- A fresh busy already clears `idlePending` (arm path, **L1411**).
- ctx.log COMPACT line format (measured): `<YYYY-MM-DD_HH-MM> <model> COMPACT <sid> [tok=<n> <source>] messages=<n>` — e.g. `2026-09-25_14-36 Qwen3.8-27B-Q3S-170K COMPACT ses_f2796c5d8ffe8toe7k2neU01G1 messages=10`. File = `.opencode/temp/ctx.log`.
- Baseline (re-measured at launch): auto_resume smoke **133/133**; standard gate **probe 291/291**, pytest **459 passed + 1 warning**, ruff **F=0**.

## Part A — line-anchor the action regex
- Change **L269** to match `action:` ONLY at line start (after any leading whitespace):
  `const ACTION_RE = /(?:^|\n)\s*action:\s*(restart|resume|stop|ask_maintainer)/g;`
- **CRITICAL:** the anchor group MUST be NON-capturing `(?:^|\n)` so the existing `found = m[1]` (L1181) still reads the ACTION WORD (not the anchor). Do NOT use a capturing `(^|\n)` (it would shift the groups and break `found = m[1]`).
- `lastAssistantAction` (L1171-1183) is otherwise UNCHANGED: the last line-start match still wins; a prose-quoted mid-line `action: …` no longer matches.

## Part B — re-arm on a new ctx.log COMPACT line
- On the 5s `tick()` (L1369-1387), **before** the existing `for (const [sid, w] of watches)` idlePending routing loop: tail-read `.opencode/temp/ctx.log` for NEW `COMPACT <sid>` lines since the last tick (keep a module-level last-read byte/line offset; read only new content since it).
- For each such line whose `<sid>` is present in `watches`: set `w.idlePending = true` and `w.recoveryCount = 0` (a FRESH recovery budget — the context situation changed after the compaction). The existing loop then routes the newly-armed sid on the same/next tick.
- Guards: only sids in the `watches` map; the tail-read must NOT throw (wrap in try/catch consistent with the tick's never-throw contract); a fresh busy already clears `idlePending` (existing, L1411) so no double send.

## Smoke pins (`auto_resume.smoke.mjs`, established in-process style)
- **Part A:** (1) a last assistant message with a PROSE-quoted MID-LINE `action: restart` (e.g. `Close with exactly one action: restart line`, no own line) → `lastAssistantAction` returns `null`; (2) a standalone `action: restart` on its OWN line → returns `"restart"`; existing standalone-line pins stay green.
- **Part B:** a synthetic ctx.log carrying a `COMPACT <sid>` line for a watched sid → the next tick re-arms (`idlePending` set, `recoveryCount` reset) → routing proceeds (the in-process test style used by the existing pins).

## DoD (measurable end states)
- Part A + B code in auto_resume.ts (L269 + the tick).
- auto_resume smoke re-pinned GREEN: the new A + B pins plus ALL existing 133 pins; report the new total.
- Standard gate GREEN: pytest 459 passed + 1 warning, ruff F=0, probe **291/291** (Part A only changes line-start matching — existing probe pins use standalone `action:` lines; if any probe pin breaks, flag it as a discrepancy, do NOT weaken it).

## Part C — NOT for this worker (planner-owned)
The Work State dump form that Part C's premise references was removed in the 2026-09-24 rework (his ruling "Order-stop / Work State dump form: removal CONFIRMED"); no live prompt quotes a literal `action: restart` in dump prose, and Part A is the primary defense (makes C moot). The planner records Part C = not-applicable in the handover. (The worker has no prompt edit access anyway.)

## DO-NOT-touch
`.opencode/maintainer/**`, `.opencode/agent/prompts/**`, `opencode.jsonc`, `.opencode/temp/compact_budget.json` (read-only reference), the other plugin files (compact_memory.ts, context_recovery.ts, gauge/ctx_watchdog, block_transfer, intercept_observer), and `.opencode/agent/handover/handover_planner.md` (NAP — planner-only). Stay on the current checkout (`opencode_test`); do NOT switch branches.

## Commit routine
Checkpoint commits per verified unit (code only); `TODO.md` + the handover file (`handover_task_to_planner.md`) ride the FINAL commit (carrying the code commits' hashes, never their own). Append any discrepancy to `TODO.md`.

**Worker:** `worker_Q3S_170K`
