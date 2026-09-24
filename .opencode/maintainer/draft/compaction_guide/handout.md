# Compaction — agent handout (short)

Full reference: `.opencode/maintainer/draft/compaction_guide/full_guide.md`.
Numbers below are current for the planner model (170k window) on this host; mechanics apply to
every agent, numbers are per model.

## What it is
Compaction trims OLD history: the last `keepMessages` messages stay INTACT (tool calls + outputs),
a same-model summary of the whole session replaces the dropped part (tool outputs stripped,
thoughts compacted). It is NOT a restart — after it, re-read your head files (NAP, handover/task
files, TODO) and CONTINUE; never re-plan from scratch.

## Cost and gain (wall-time is the metric — no money cost)
- One compaction ≈ 3-4 min (90-120s + ~60-70s reload). Filling a 170k window takes 30-45 min.
- Generation slows as context fills (~60 t/s early → ~32 t/s near the limit). So accumulated
  tool output is a double cost: it eats the window AND slows every token after it.
- **Compaction almost always REDUCES total wall-time** — it reclaims speed (~2-3x on the
  remaining work), extends the window, and avoids a fresh session that re-derives everything.
- Floor: ~25-30k at keepMessages=0. keepMessages is the dial.

## Budgets (per model, per session — check your own, don't hardcode)
- `normal`: 5 self-triggered compactions (keepMessages-capable, default 12).
- `emergency`: 1 — SHARED between your self-triggered emergency (planned `emergency` param) and
  the AUTO one at the limit (blind, 18-msg default, you cannot trigger it). First-come-first-
  served.
- **Why the cap exists: BIT-ROT** — the unknown behavior shift of N-times-chained summaries.
  A safety measure against an unknown; may be raised once stability is proven.
- Both exhausted → the next limit hit forces a clean NEW session (new planner + directive to
  scan the last session's dump). You are never hard-killed at the wall.

## When to use
- **DEFAULT: compact (normal) until the 5 are spent.** It is a routine speed/maintenance tool,
  not an emergency valve.
- Trigger: your tool output is **DISTILLED** — you have read the files, formed the plan, and the
  raw output is dead weight. Can be MID-UNIT.
- Trigger: the remaining work is long enough that the speed-up beats the ~3-min overhead.
- At the stop line / >95% / mid-handover: spend the emergency 1 **PROACTIVELY**, with the
  keepMessages you want — the auto one will take it blindly (18 msgs) if you wait.
- keepMessages: keep what you would have to RE-DERIVE (drafts, plan, rationale, in-flight
  state); a full committed handover → keep less; **when in doubt → keep more**.

## Guardrails
- **COMMIT first** when the current work depends on early-message knowledge — compaction strips
  the head of the session, and the summary may not carry it at full fidelity. Compaction
  follows a commit, never precedes one it depends on.
- Do not rely on the auto one for a keepMessages you need.
- The gauge readout LAGS true usage by ~2 tool calls — treat it as a lower bound.
- Stop lines are triage thresholds (80% estimate the finish, 90% stop starting new work +
  compact to continue, 95% commit + compact NOW) — not the only compaction moments.
- A dump is created automatically on self/cross compaction; the last session's dump is the
  recovery source for a forced new session.

## Corrections (2026-09-24; supersede earlier text)
- Emergency 1: consumed ONLY after the normal 5 are drained (total 6), either system, once —
  not first-come-first-served.
- Live defaults: keepTokens = 0 / being removed from both stores; keepMessages = 18 in BOTH
  stores (the "12" above is stale). `agent.compaction.model` commented out → same-model
  summarizer.
- The trusted-system change list (grounded): `maintainer/inbox_planner/
  compaction_feedback_by_planner.md` (planner-consolidated, 2026-09-24).
