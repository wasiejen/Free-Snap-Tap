# TASK — curate TODO.md to goal-oriented entries (maintainer priority, 2026-09-10)

Read `AGENTS.md` (TODO.md entry contract + curation rules + approval boundaries),
`agents_repo.md`, and the NAP (`.opencode/handover_planner.md`) first — the NAP gives you the
live status of many entries (closed items, the maintainer calls, what's queued next).

## Goal
TODO.md is 487 lines of accumulated cycle history. Curation target: a compact,
goal-oriented file where **every remaining entry is self-contained enough to be delegated
by ID alone** (contract: title / problem+evidence / desired outcome — goal not steps /
acceptance criteria / suggested scope / status + decision-needed flag), organized thematically.

## Operations
1. **Close (condense to a one-line close record)**: entries whose resolution already lives in
   this file — pattern is `## N. ... ` followed somewhere by `CLOSED ...` / `Fixed ...` /
   `Resolved ...` (planner/maintainer notes) and duplicates: the block after the `## 260908-0951
   copied from NAP` header is verbatim duplicate content of numbered entries. Closed records =
   exactly one line: `## N. <title> — CLOSED (<closer/commit/date>) — <one-clause what>`.
   Known close candidates (verify against the file, don't trust this list): 12, 13, 15, 16, 21
   (code half closed by #24 — leave the v2-schema note as a pointer into #30), 22, 23, 24, 25,
   26, 27, 28, 29, 31, 32 (root-cause record), and all `260908-0951` sub-items after dedup.
   A close line must point at the closer (commit hash where one exists, else date + who).
2. **Rewrite open entries in place (keep their #id)**: 1, 3, 4, 6, 7, 8, 9, 10 (CLOSE now —
   fixed inline `ea3d920`: 3×`globalPos()` → `globalPosition().toPoint()`, 434/434, warning
   gone 13→1; verify by grepping for `globalPos` before closing), 11 (status: maintainer holds —
   pin `XXX 241016-1101` at `fst_keyboard.py` ≈791 is his find-marker, decision waits on his
   live test — mark it as HOLDING/DECISION and leave content verbatim), 30 (status: APPROVED by
   maintainer call this cycle — plan as ONE cycle: node:sqlite gauge landing + peek.py removal
   + doc purge + v1.3 log-profile re-baseline; see the #30 carry-over arithmetic caveat — keep
   it).
3. **New entry #33 — v2.5 auto-nudge ladder build**: fold in the maintainer notes currently at
   the very TOP of TODO.md (lines 1–6, "addition to plugin tool.message ctx gauge reply" + the
   <5K note — that block becomes entry #33 and is removed from the top). Contract form, content:
   per-agent nudge ladder fired from `tool.execute.after` (plugin is agent-independent), rungs
   50 % (generic) → 70 %/REM 30 k → 80 %/20 k → 90 %/10 k — pct OR REM whichever first, ≤1 nudge
   per rung per session — plus a FINAL 5 k rung whose text is the verbatim self-gauge
   `CTX=… REM=… — stop-line reached` requesting further approval; delivered via
   `client.session.promptAsync` synthetic text part; evidence `kind:"nudge"` lines, silent
   otherwise. Full design lives in the NAP (v2.4.1/v2.5 blocks + `## Live status`); point there
   from the entry. Status: APPROVED — next build.
4. **Structure**: group thematically (e.g. FST behavior decisions / plugin & gauge / docs &
   misc) or keep numeric order — your call — but add one section at the very top:
   `## Maintainer calls (open, in order)` — the open decision items in priority order, each
   one line pointing to its #entry: (1) #33 v2.5 build is NOT a call — approved; (2) #11 held on
   maintainer's live test (XXX 241016-1101 pin); (3) the deferred FST behavior batch: #1, #7, #8,
   #9, #4, #6 (post-plugin); (4) #30 approved, scheduled after #33.
5. **Hard invariants:**
   - NEVER silently delete open/unresolved content — every original numbered entry (1–32) and
     both top notes must appear in the change log you produce (below), with outcome
     CLOSED | DEDUP-INTO | KEPT.
   - Entry IDs 1–33 never reused, only entries are created as #33 — no other new entries.
   - Decision-needed statuses must survive verbatim in meaning (an open maintainer call may
     not be silently dropped into a close record).
   - Target ≤ 300 lines from 487 — NEVER at the cost of an invariant above.
   - ONLY TODO.md + your summary file are touched. No code, no plugin, no handover_planner.md,
     no AGENTS.md/agents_repo.md, no tests to run (say so in the summary).

## Definition of done
1. `git diff --stat` (before commit) shows exactly `TODO.md` + `.opencode/handover_task_to_planner.md`.
2. Line count 487 → ≤ 300 (report both).
3. Every remaining numbered entry has the six contract fields (title / evidence / outcome /
   acceptance / scope / status).
4. `## Maintainer calls (open, in order)` section present at top.
5. Committed: `docs: curate TODO.md to goal-oriented entries` (TODO.md + summary file).

## Approval boundary
Pre-approved (meta-file curation, zero behavior change). If you find an entry whose status you
cannot determine from the file + NAP, KEEP it fully intact and flag it in the summary — do not
guess-close.

## Return
EXECUTIVE SUMMARY to `.opencode/handover_task_to_planner.md`: before/after line counts, the
FULL change log (every entry 1–32 + the two top notes → outcome), what was deliberately not
closed and why, and the guard below.
**Guard:** this file currently holds the previous task's summary (including the maintainer's
format-test header at its top). If the working-tree file differs from `git HEAD` (uncommitted
maintainer content — check with `git status .opencode/handover_task_to_planner.md` before you
write), preserve that uncommitted content VERBATIM at the very top of the file, above your new
summary.
