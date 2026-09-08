# HANDOVER PLANNER — Phase 6: opencode planner/worker workflow (Tier 1 + Tier 2)

FIRST read `AGENTS.md` (orientation, conventions, commit routine — do NOT edit AGENTS.md
directly), `TODO.md` (#14/#18/#20 carry the plugin decisions), and
`.opencode/prompt_agent_planner.md` (process rules).

House rule: when something is unclear, ASK EARLY.

## Current state (2026-09-08, HEAD `24a5d88`)
Rebuilt across two context-limit interruptions. The plugin is now: v2 (task gate, pre-flight
warn, summary mirror) + v1.2 (10-type skip set) + **v2.2 (ctxgauge injection for ALL
sessions — the maintainer "both" call, gate removed; TODO #18)** + comment fixes (#19).
- **v2.2 LANDS OFFLINE-PROVEN, LIVE AT THE NEXT OPENCODE START.** Until then the gauge
  reaches nobody (the old gate was dead code — payload has no agent identifier, evidence:
  78 transform lines, all `{sessionID, model:{…}}`).
- **Offline probe is now PERSISTENT** (maintainer feedback, TODO #20):
  `.opencode/plugin/probes/handover_probe.mjs` (committed; exact run command + PINNED
  opencode Electron executable in its header — DO NOT hunt, DO NOT rebuild: every
  plugin spec runs it (expect 23/23) and nothing else; exception = hook-surface change).
  A prior cycle burned ≈10 min + a big context slice on exactly the rebuild/hunt the
  persistence removes.
- v1.2 live-verified (post-restart segment: 25 lines / 14 KB, zero cascade; `transform`
  fires exactly once per LLM turn — the injection-timing evidence). Residual
  `file.watcher.updated` (7) + `file.edited` (2) in an idle planner cycle → v1.3 call
  waits for the first post-start delegation-cycle data (TODO #17).
- Proof-protocol results (this phase): mirror written BY THE PLUGIN ✓ (v1.2 cycle —
  hash-proven); transform payload shape ✓ (no agent id — why the old gate never fired);
  `warn` absent when spec present ✓; task before/after captured ✓.
- FST code untouched: **434 passed**, ruff **6**, coverage per `archive/260908-phase5-*.md`.

## Live status (2026-09-08)
- Task 1 (Tier 1): DONE on the plugin-side surface — everything decided through the "both"
  call has shipped: `f3063be` (v1.2 skip), `add2303` (v2.2 both-injection), `24a5d88`
  (persistent probe + #19 comments). Remaining = LIVE proof at one start (below).
- Task 2 (Tier 2: custom `handover` tool, compaction hooks, resume aid, permission
  auto-approval): NOT STARTED — starts AFTER the post-start proof cycle; it builds on the
  v2.2 live shapes. The v2.1 session-graph spec (`.opencode/archive/260908-v21-session-
  graph-spec.md`) is VOID as code (superseded by "both") — keep as context only.

## MAINTAINER CALLS (open — in order)
1. **RESTART opencode once** — activates v2.2 (v1.2 already live since the 2026-09-08
   restart). One start is enough: no more pending plugin changes before it.
2. **Worker stop-line (still undecided):** add a "stop and hand back at ≤15k REM or ≥85 %"
   rule to `prompt_agent_task.md` so workers ACT on the `ctx:` line (the line exists, the
   rule does not — raw info to workers until it is). Planner can draft it.
3. Carried-over: TODO #4/#6 (coverage triage 117 + 302–303), #7 (empty-macro comment),
   #1 (vk resolution), #2 (the 6 lint findings).

## NEXT SESSION (post-restart) — the proof cycle, then Tier 2
1. Delegate a SMALL handover task whose spec additionally asks the worker: **"quote your
   `ctx:` line verbatim if you see one in your system context"** (include the line in the
   summary) — that is the live "both" proof for workers (child sessions); the planner side
   rides the same hook (offline S4 shape-1 covers the exact live payload).
2. Same cycle gives the v1.3 data (measure that log segment: if `file.watcher.updated` /
   `file.edited` are the top residual → one-line skip-set extension, decide with the
   maintainer; if not → close #17).
3. THEN start Tier 2 scoping from the live shapes.

## Context budget
Per `AGENTS.md` §Context budget: `.opencode\ctxgauge\peek.py`; stop line REM ≤ 15k or
≥ 85 % — wrap up BEFORE the line. Note: post-start, planner/worker `ctx:` lines should
appear in-system automatically (v2.2) — self-run the peek anyway until proven.
