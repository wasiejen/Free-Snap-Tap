# plan2 closing summary (looprun autorun-2026-09-17_23-58, iteration 2, ses_f4e47085affelnyR0nKkHeF54M)

**Both units LANDED; gate green (planner re-verified).**

## Unit 1 — submit session/role autofill (maintainer inbox instruction)
- `submit` derives role from `context.agent` + session from
  `context.sessionID`; both args removed from the schema (unknown fields
  still surfaced). Code `86a977f` + bookkeeping `ac8f1c8`.
- Gate at the time: probe two-two-nine annotation-agree, 9/9 smokes
  (submit 20/20), pytest 459+1w, ruff F=0 — planner re-run, green.

## Unit 2 — #0 numword escape (approved proposal, sentinel `esc`)
- `[<digits>:<safe-form>:esc|escape]` in the `content`/`oldString`/
  `newString` of write/edit/block_transfer resolves at the hook to the
  field-2-derived digits (dash-digits or numwords — the existing
  `resolveNumword` grammar); unmarked/invalid forms never touched;
  `pair-resolved kind=escape scope=content` evidence line (nine verdicts
  unchanged — #73 kind=dedup precedent); path channel unaffected (the
  maintainer's ruling pinned in S24).
- Commits: `4e2fd0c` (core `resolveEscapes`/`resolveEscapeSafe` + observer
  `runEscapeContent` pre-step + smoke 39/39) + `67ccd73` (S24 probe section,
  six pins 240-245 — carried by the planner's emergency checkpoint) +
  `281b6d9` (primer "Where it applies" block + decision-record §4
  paste-draft line + final handover).
- Deviation (accepted, pinned in the handover): check 245 redesigned — a
  real on-disk `file-[4:four:esc].txt` fixture is INFEASIBLE on NTFS
  (alternate-data-stream name parsing; measured ENOENT); the sentinel form
  rides a NON-EXISTENT path arg, same ruling pinned.

## Gate (planner re-run, post-landing)
probe 235/235 annotation-agree (two-three-five) · 9/9 smokes
(block_transfer 22/22, bt-sandbox 52/52, compact_memory 46/46,
context_recovery, ctx_gauge 3/3, gauge_core, intercept_observer 39/39,
loop_log 24/24, submit 20/20) · pytest 459 passed + 1 warning · ruff F=0.

## Incidents (both recovered, zero loss)
- worker-2 sandbox stop: out-of-sandbox path from a username bit-shift
  (W→A); full session dump secured + Gemma cross-compaction + task_id
  resume.
- measured gap for TODO #70: cross-compaction still REQUIRES explicit
  providerID + modelID (`no resolvable model` error otherwise) — the
  #70 session-id-only rework is not live yet.

## Carried (MAINTAINER domain — agents cannot do these)
1. `submit` registration in the live `opencode.jsonc` + per-agent grant +
   live acceptance after restart.
2. AGENTS.md paste: the submit one-liner (draft in plan1_summary.md) + the
   escape paste-draft line (decision-record §4).

## Queue (his priority.md order)
1. TODO #70 compact_memory rework (incl. the measured cross-compact gap).
2. Repo-split research.
3. #56 distillation — DEFERRED.

Baselines updated in the NAP Standing (probe two-three-five, intercept
39/39, submit 20/20, BT-SANDBOX 52/52).
