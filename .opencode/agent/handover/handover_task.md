# Task: #85 part 3 — Unit 2 nudge as a passive ctx-line suffix (no resume) + Direct gates Unit 2 + Direct beats planner in scopeVerdict

Goal: fix the auto_resume Unit 2 scope bug (the live test exposed: Unit 2 re-fires on
stale armed sessions, loops, and `<|Direct|>` doesn't deactivate Unit 2 for the
planner). The fix makes the Unit 2 nudge PASSIVE — appended to the tool-call return
(the same channel as the `ctx:` line), per busy session, with NO resume (no
promptAsync). Plus: Direct suppresses the Unit-2 nudge, and `scopeVerdict` checks
the last own-line toggle first (Direct deactivates Unit 4 for the planner).

## Verified spec-time facts (do not re-derive)
- Root cause: `tick()` (L998) loops over ALL `watches` — Unit 2 fires on ANY watch
  that is `armed && idle && ratio≥threshold && autoCompact on`, with NO "current
  session" concept. So: (1) re-fires on STALE armed sessions; (2) LOOPS (the
  once-per-busy-cycle budget resets on every injected busy, and the nudge itself is
  the busy); (3) Direct only gates Unit 4 (`sendSelfCompact` never consults the
  scope verdict).
- `sendSelfCompact` (L469-498): the current promptAsync path — to be replaced by
  the ctx-line-suffix.
- `scopeVerdict` (L686): currently checks (a) the actual planner FIRST, then (b)
  the last own-line toggle. So the Direct keyword does NOT deactivate Unit 4 for
  the actual planner.
- The `ctx:` line is appended to tool-call returns (the gauge plugin). The Unit 2
  nudge should ride in the same channel.
- Baseline: auto_resume smoke 105/105, probe 241/241, pytest 459+1w, ruff F=0.

## The change (WHAT — the HOW is yours inside the DoD)
1. **Unit 2 redesign: the nudge is a passive ctx-line suffix.**
   - Drop the `sendSelfCompact` promptAsync path (no resume, no queued turn, no
     busy, no budget reset, no loop).
   - Emit the nudge as a SUFFIX on the tool-call return (the same channel as the
     `ctx:` line the gauge plugin appends), PER busy session, when
     `ratio ≥ saturationThreshold && autoCompact on`.
   - Nudge LADDER: `≥ saturationThreshold (0.95)` → "self-compact now (ratio=…)"
     suffix; `≥ 0.98` → a `--maintainer`-flagged line (e.g. `⚠⚠ --maintainer:
     context saturated at ratio=… — self-compact NOW`).
   - Multiple active workers each get their own nudge independently (per-session).
   - The nudge only fires while the session is actively working (emitting
     tool-call returns) — so a stale/idle session gets no nudge (the
     stale-session revival is gone by construction).
2. **(c) Direct suppresses the Unit-2 nudge.** When the scope verdict is `"none"`
   (Direct), the ctx-line suffix is NOT appended.
3. **(d) `scopeVerdict`: last own-line toggle checked first.** Reorder so the last
   own-line toggle is checked BEFORE the planner test: `<|Direct|>` (or no toggle)
   → `"none"` (wins over the planner test). So Direct deactivates Unit 4 for the
   planner. (Verify the current order first — if it's already toggle-first, no
   change needed; only fix if it's planner-first.)
4. **Unit 4 scope UNCHANGED** (wherever the last busy→idle happened).
5. **NO `<|Off|>`** (Direct already covers it — dropped per maintainer).

## Definition of done (measured)
- A stale armed session (armed at a high ratio, goes idle, stays armed;
  autoCompact flips on) does NOT fire (no nudge, no resume).
- A busy session at `ratio ≥ 0.95` with autoCompact on → the ctx-line suffix is
  appended (the "self-compact now" message); at `≥ 0.98` → the `--maintainer`-
  flagged line.
- Two active busy sessions at the threshold → each gets its own nudge
  (independent).
- Direct (scope "none") → no ctx-line suffix (Unit 2 suppressed) AND no Unit-4
  CONTINUE (Unit 4 deactivated for the planner).
- No `promptAsync` on the Unit-2 path (the nudge is passive).
- auto_resume smoke green (new checks: stale-armed no-fire, ctx-line-suffix at
  0.95/0.98, per-session nudge, Direct suppresses both units) + the existing 105
  checks still pass.
- Full gate green: probe 241/241, all plugin smokes, pytest 459 passed +
  1 warning, ruff F=0.
- TODO.md: #85 → "part 3 (Unit-2 ctx-line-suffix + Direct gates) LANDED" (the hash
  is recorded by the planner in the follow-up bookkeeping commit — do NOT write
  your own commit hash in the same commit).

## DO-NOT-touch
- Do NOT restart opencode (changes take effect on the next restart).
- The maintainer's temp fix `0f192e5` (compact_memory), the live
  `.opencode/temp/compact_budget.json`, `.opencode/maintainer/`,
  `.opencode/agent/prompts/`, the live `opencode.jsonc`.
- The #82 scope-toggle logic (built in part 1; build on it, don't break it).
  `compact_memory.ts` + `context_recovery.ts` (LANDED; untouched here).
- The Unit 4 scope (unchanged — wherever the last busy→idle happened).

## Reading discipline (his note, priority.md 2026-09-22_20-42)
Targeted reads ONLY of the named auto_resume.ts regions (L469-498
sendSelfCompact, L686-700 scopeVerdict, L986-1041 tick, L1043-1075 armEvent) + the
gauge plugin (the ctx: line channel) + the auto_resume smoke. No careless large
greps. Use node for arithmetic.

Worker: `worker_Q3S_170K` (auto_resume.ts Unit-2 ctx-line-suffix + (c) + (d) +
smoke updates).
