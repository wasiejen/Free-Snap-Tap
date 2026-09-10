# plan1_summary — looprun (new) iteration 1, 2026-09-10, ses_f729fdeecffeL1itaHiEEsKjYG

## State rebuilt (committed files + worktree)
- HEAD `8b4123b`: split-build spec (parts 1+2+5 + session-id rules) committed; both
  proposals in `approved/`; inbox 2147/2301 handled+answered.
- Maintainer's UNCOMMITTED moves since (worktree): (1) `handover_task.md` reverted to the
  old part-3 spec — byte-identical to `854bb68` (that task LANDED + was verified in
  iter 6b); (2) `2147` moved back to `inbox_planner/` with the ORIGINAL text (the
  replier block removed); (3) `2301` deleted from `done/` entirely; (4) the first
  session marker `archive/autorun-260910-2307/ses_f72e53…md` deleted; (5) new inbox
  item `2306`; (6) AGENTS.md / looprunner prompt / opencode.jsonc show "modified" but
  EMPTY diffs (EOL noise only — no content change).

## Inbox feedback
**260910-2147 (session-id rules):** both points are already implemented — option 2 was
chosen (a `<session_id>.md` marker file inside `autorun-<YYMMDD-HHmm>/`, name = the info;
folder names stay clean) and the looprunner lookup line ("session ids live in the
`SESSION=` field of the injected `ctx:` lines + as marker file names in the autorun
archive folder") — both are sections 4 + 6 of the committed split-build spec
(`8b4123b`), landing with that task's commit. OPEN for you: you deleted the first
real marker (from the session that wrote the spec). If that was a rejection of the
convention, spec §4 needs revising; if it was cleanup, the spec stands. Until the
split build lands, the live prompts still carry the old autorun rule (no marker).

**260910-2306#1 (register the gauge as a custom tool):** assessed — NOT too much
effort, worth doing. Facts: custom tools are TS files in `.opencode/tools/` (filename =
tool name) whose `execute(args, context)` receives `context.sessionID` — so no shell
call, no spawn. The tool CANNOT read the plugin's in-memory state (separate module),
but everything needed is already persisted per session in the plugin's sqlite log:
current ctx/window/pct/REM, the rung ladder's fired rungs, the ctx time series. So a
small tool (~60–100 lines wrapping `scripts/gauge.mjs` + a DB query filtered on the
current sessionID) returns the full picture incl. "rung 4 already fired" /
"compaction drop detected" — enabling exactly your goal: the agent ends its turn even
when a stale gauge read says otherwise. Cost: the tool file, probe cases in
`handover_probe.mjs`, one permission line in `opencode.jsonc` (your file). Sequencing:
after 2306#2 lands, so the compaction detection exists in the log first.
**260910-2306#2 (re-arm thresholds after compaction):** confirmed real — the ladder's
per-session dedup (`nudgeFired` map, `handover_v2.4.ts:322/395-415`) fires each rung at
most ONCE per session; after a compaction the ctx drops (e.g. 74%→43%) and rungs
already fired never re-fire even as the context regrows past them. Your proposed
mechanic is exactly the inference fallback already designed in the approved
`260910_plugin-compaction-detection.md` step 1 (sharp ctx drop between samples =
compacted) — so this is a fold-in to that proposal: track per-session last ctx; on a
drop, re-arm the fired rungs at/above the post-drop level, mark "compaction detected"
in the nudge text AND in the peek/ctx readout. This is a plugin behavior change →
needs your approval (spec first).

## Observations (no action taken)
- `handover_task.md` worktree≠HEAD conflict — recorded as TODO #49 (maintainer call).
- `2301` deletion: the standing rule it codified (open decisions → context-rich
  proposal drafts) is already practiced (both 260910 proposals follow it). If the
  deletion rejects the rule itself, say so in one word; otherwise I keep it as
  practice.
- `proposals/maintainer/feedback/` folder no longer exists (it was "pending your
  confirm" since 1818) — inbox handling now follows the README: move to `done/`
  content-untouched, feedback recorded in NAP/summary. Both inbox files moved per
  that convention.
- `P01_limit-context-declaration.md` still sits in `approved/` though applied
  (looprun-2 residue) — left untouched (folder moves are your side of the channel).
- LIVE RE-ORG while closing: you re-inboxed `2301`, a new `260910-0301` appeared,
  then both vanished before I could read them — NOT processed here; the next
  session's inbox scan picks up whatever you leave there.

## Waiting for approval (the loop pauses here)
1. **Spec conflict (TODO #49):** restore the HEAD split-build spec
   (`git checkout HEAD -- .opencode/handover/handover_task.md`) and launch
   `worker_Q4_120K` on it — or tell me the revision you want. My recommendation:
   restore + launch (it also lands the 2147 implementation).
2. **2306#2:** approve the compaction-detection fold-in spec (per-session ctx
   tracking + threshold re-arm + compaction mark in nudge/peek) as the next task.
3. **2306#1:** go/no-go for the custom-tool build after #2 (my recommendation: go).

action: ask_maintainer: waiting for approval
