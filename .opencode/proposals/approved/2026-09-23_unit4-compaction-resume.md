# Proposal — unit-4 resume-after-compaction: two live gaps in the
# self-compact → recovery-continue path (2026-09-23, planner-13 direct)

Status: **awaiting approval** (Parts A+B are plugin behavior changes —
maintainer approval required; Part C is a prompt note).

## Problem (live-verified 2026-09-23, build v=7d2e6207, session
ses_f30493f9effeuQRFc3ijNON166 "planner-13")

The protocol promises: a session that self-compacts at the stop line takes the
Work State dump form (no action line) and is RESUMED by unit 4
(recovery-continue). In the live episode it did not resume — the maintainer
had to re-engage manually. Two independent gaps, both evidenced:

**Gap A — the action-line parse is unanchored (this episode's direct cause).**
`lastAssistantAction` scans the last non-compaction assistant message with
`ACTION_RE = /action:\s*(restart|resume|stop|ask_maintainer)/g` — last match
wins ANYWHERE in the text (line 260 / 1073-1085 of auto_resume.ts). The Work
State dump's prose quoted `action: restart` mid-line (Next Move step 7:
"Close with exactly one `action: restart` line") → the plugin parsed the
mid-work dump as a RESTART close → the recovery-CONTINUE branch (line 1181)
was skipped → the restart branch ran on a mid-work idle → the #90 depth cap
(depth=2 = LINEAGE_MAX_DEPTH) stopped it:
`scope= autorun` + `skip= depth sid=... depth=2` (2026-09-23T20:14:19Z, the
session's ONE post-spawn idle, 3 s after the turn ended). The #91 guard
(2fa4bb6) skips only assistant messages with `info.agent === "compaction"` —
a self-authored dump that quotes an action line is not guarded.

**Gap B — no re-evaluation after a compaction lands.**
Unit 4 re-evaluates only on `session.status idle` events (idle sets
`idlePending`; the 5 s tick decides). A compaction landing is SILENT: it
emits no status event, and the summary is NOT a DB message (verified: the
message table of the compacted session is intact — 70 messages from spawn;
the token reduction shows only in the next turn's meta: the 20:18:00Z turn
saw 63.8k input tokens vs ~160k pre-compaction). Episode timing: the idle
(20:14:16Z) was consumed by the mis-parse; the compaction landed the same
minute (ctx.log `COMPACT ses_f30493f9...` line, 2026-09-23_22-14 local); the
next status event was `busy` (the maintainer's message, 20:18:00Z). The
post-compaction state was never re-routed — unit 4 never saw it.

## Design

### Part A — line-anchor the action-line regex (auto_resume.ts)
- Match `action:` only at line start (after any leading whitespace):
  `/(^|\n)\s*action:\s*(restart|resume|stop|ask_maintainer)/g`, last match
  still wins. The protocol's action line is a standalone line, so every
  legitimate close still matches; mid-line / backtick-quoted mentions no
  longer drive routing. Subsumes part of the #91 scenario (a quoted action
  line in any message, not just the compaction summary).
- Smoke pins: a last assistant message with a PROSE-quoted `action: restart`
  (mid-line) → `lastAssistantAction` returns null; a standalone
  `action: restart` line → "restart" (existing pins unchanged).

### Part B — re-arm on compaction (ctx.log COMPACT watch, auto_resume.ts)
- On the existing 5 s tick, tail-read `.opencode/temp/ctx.log` for NEW
  `COMPACT <sid>` lines (the guaranteed line from the compact plugin —
  format verified: `2026-09-23_22-14 Qwen3.8-27B-Q3S-170K COMPACT
  ses_f30493f9... tokens=30000 messages=12`). For each watched sid:
  `idlePending = true` + `recoveryCount = 0` (a FRESH recovery budget — the
  context situation changed after the compaction). The next tick re-fetches
  the messages fresh and re-routes; the #91 guard + Part A protect the
  action parse.
- Guards: only sids in the watch map; a fresh busy clears `idlePending`
  (existing behavior) — no double send; the tail-read is a cheap last-line
  scan of a small file once per tick.
- Effect: "self-compact → unit 4 recovery-continue" becomes deterministic
  regardless of the COMPACT-line / idle-event race.
- Smoke pin: a synthetic ctx.log carrying a COMPACT line for a watched sid →
  the next tick re-arms (`idlePending` set, `recoveryCount` reset) —
  in-process test in the established smoke style.

### Part C — protocol note (prompt, not code)
- The Work State dump form should not quote the literal `action: restart`
  in prose (write "the action line = restart" / "a restart-close" instead).
  Defense-in-depth only — Part A makes it non-critical. Landed via a
  planner-as-text-worker edit of the prompt (workers have no prompt edit
  access).

## Acceptance
- A: the new smoke pins green + the standard gate green (note: the gate
  baseline is currently red on `handover_probe.mjs` +
  `context_recovery.smoke.mjs` — the maintainer's UNCOMMITTED
  `context_recovery.ts` move; fully green once that commits). Live: the next
  self-compact dump close (no action line) gets `recovery= attempt=1` within
  one tick (~10 s), not a mis-route.
- B: the new smoke pin green. Live: after the next self-compact, a
  `recovery=`/`route=` line follows the `COMPACT` line WITHOUT a user message
  in between (the re-route fires on the COMPACT line alone).
- C: prompt diff reviewed by the maintainer.

## Recommendation (priority order)
1. **Part A first** — it is this episode's direct cause and the smaller
   change.
2. **Part B second** — the hardening that makes the protocol's resume
   promise deterministic.
3. Part C optional (cheap, defense-in-depth).

--comment
approved A, B and C
