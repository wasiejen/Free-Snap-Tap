# EXECUTIVE SUMMARY — Phase 6 / Tier 1 — plugin v2.2: ctxgauge injection for ALL sessions ("both")

## Change rationale (maintainer call 2026-09-08 — recorded per task)

The `ctx:` gauge line should reach WORKERS too, not only the planner — long-thinking worker
runs need an early near-limit reminder. v2's planner-only gate is
`agent?.toLowerCase().startsWith("planner")` — which can NEVER match, because the live
transform payload carries no agent identifier at all. Confirmed from this cycle's
`.opencode/plugin.log` (read-only): **78 `kind:"transform"` lines, every one shaped
`{sessionID, model:{…}}` — no `agent` field** — so v2's injection reached NOBODY; the gate
was dead code. v2.2 is the formal override of v2's planner-only design note: the transform
hook now injects on EVERY transform (planner + all child/worker sessions). Consequences
kept on record (not code): no `childSessions` graph needed — the archived v2.1 spec
(`.opencode/archive/260908-v21-session-graph-spec.md`) is void as code; every session pays
one bounded peek spawn per LLM call (≤3 s, detached, best-effort); `peek.py` takes no
session id — it reads the most recently updated session's last FINISHED message from
opencode's sqlite DB, so the injected number can be another session's (adjacent-stale) —
accepted: this line is a reminder, not a control.

## What changed (minimal-diff; `git diff` verified)

1. `.opencode/plugin/handover.ts` → v2.2 — `onSystemTransform` ONLY:
   - gate deleted (the two lines `const agent = str(input?.agent);` /
     `if (!agent || !agent.toLowerCase().startsWith(PLANNER_AGENT_PREFIX)) return;`) — the
     flow is now: evidence-log (unchanged) → `gaugeReadout()` → append `ctx: <line>` when
     the line resolved AND `output.system` is an array (mechanics byte-identical);
   - now-unused `PLANNER_AGENT_PREFIX` constant deleted;
   - one v2.2 header note (all-sessions injection; the payload still carries no agent
     identifier — the gate was dead code; adjacent-stale caveat accepted — see TODO.md #18).
   NOTHING else touched: skip set, pre-flight warn, summary mirror, `gaugeReadout` (shell
   guard, 3 s bound, no child_process), evidence line shape, event log — all
   byte-for-byte unchanged (verified against the diff).
2. `TODO.md` — #18 appended (task's exact text) and #19 appended (NEW — see "discrepancy
   flagged" below).

## Offline verification — Electron `RUN_AS_NODE=1` (Node 24.15.0, same recipe as v1/v1.1/v2)

Runner: `%LOCALAPPDATA%\Programs\@opencode-aidesktop\OpenCode.exe` +
`ELECTRON_RUN_AS_NODE=1`; probe imports the TS plugin via Node 24 type stripping (same
cosmetic `MODULE_TYPELESS_PACKAGE_JSON` warning as v2). v1.2's scratch probe was deleted,
so the probe was REBUILT to the v2 spec (`git show 2a4996c:.opencode/handover_task.md`) —
temp `.opencode` sandbox root (the real handover files were never touched), one script,
two modes: `before` (pre-edit code) / `after` (v2.2). S1–S3 = v2 spec scenarios,
byte-for-byte, unchanged expectations; S4 = the task's four NEW expectations; S5 = line
validity. (One probe-side bug caught on the first BEFORE run: S1a/S2 counted warn lines
cumulatively across scenarios, and S3 used a non-handover prompt — fixed in the probe
itself before the final runs; the plugin was untouched.)

- **Regression S1 (pre-flight warn): 7/7 PASS on BOTH sides** — spec present → no warn
  (one `tool.before` only); spec renamed away → exactly one `warn` line, exact
  `reason`/`call`/`session`; byte-exact restore in finally.
- **Regression S2 (non-handover): 3/3 PASS on BOTH sides** — no warn, mirror
  byte-untouched, one `tool.before` baseline line.
- **Regression S3 (mirror): 4/4 PASS on BOTH sides** — verbatim overwrite; exact trailer
  with `truncated:true`; empty output → untouched; exactly 3 `tool.after` baseline lines.
- **S4 (transform — the delta):**
  - BEFORE (v1.2 code, documenting the dead gate): **all four shapes OMIT the ctx line** —
    no-agent live shape, `worker_120K_mtp` agent, junk shell, no shell → 4/4 omitted; 4
    evidence lines logged.
  - AFTER (v2.2): (1) LIVE payload shape (no `agent` field, fake shell returns
    `CTX=12345 (10%) REM=100000`) → exactly ONE `ctx: CTX=12345 (10%) REM=100000`
    appended, pre-existing system lines untouched; (2) WORKER-shaped agent
    (`agent:"worker_120K_mtp"`) + shell → appended too (the "both" semantics — no gate if
    the field ever comes back); (3) shell present but `CTX=` absent (junk output) →
    omitted, no throw; (4) no shell (`input.$` absent) → omitted, no throw. Every scenario
    logs exactly one `kind:"transform"` evidence line (4 total). 8/8.
- **S5:** all 11 probe log lines (per mode) `JSON.parse`-able and ≤ 2000 chars. 1/1 per
  mode.
- **Totals: 23/23 checks PASS in BEFORE mode and 23/23 in AFTER mode** (S1–S3 regression
  byte-for-byte; S4 expectations superseded per the task).

## pytest / lint

`& .\.venv\Scripts\python.exe -m pytest -q` → **434 passed** (13 warnings — identical
baseline; no FST code touched). `& .\.venv\Scripts\ruff.exe check --select F .` →
**6 findings** (baseline unchanged).

## Live proof awaits a restart — planner record (recorded verbatim per task)

LIVE PROOF PENDING START: the post-restart planner session must confirm (a) the `ctx:` line is visible in the PLANNER system context, and (b) a delegated worker's summary reports its own `ctx:` line verbatim if present — the delegation spec must ask the worker: quote your `ctx:` line if you see one in your system context.

## TODO.md appended

- **#18** — the task-mandated exact text ("both" decision 2026-09-08; formal override of
  the v2 planner-only note; v2.1 spec void as code; adjacent-stale caveat accepted; the
  SEPARATE companion call — stop-line rule for `prompt_agent_task.md` — explicitly NOT in
  v2.2 and NOT decided).
- **#19** — discrepancy flagged by the worker: the v2 inline comment above
  `onSystemTransform` now reads "the line is omitted … (planner-only, decided call, never
  inject for all). See TODO.md #14" — contradicted by the v2.2 change. LEFT VERBATIM,
  deliberately: the task spec said exactly four edits and said "nothing else changes"
  (same minimal-diff pattern as #13). Rewire it, or keep as a historical record —
  maintainer call.

## Files / commit

- `.opencode/plugin/handover.ts` — v2.2 (gate removed, constant removed, one header
  note; diff-verified nothing else changed).
- `.opencode/handover_task.md` — the v2.2 task file (as written by the planner —
  committed with the handover, per the task's file list).
- `.opencode/handover_task_to_planner.md` — this summary.
- `TODO.md` — #18 + #19 appended.
- **Left untouched / not staged:** `.opencode/handover_planner.md` (NAP), `opencode.jsonc`,
  `AGENTS.md`, playground files, `.opencode/archive/*`, `.opencode/plugin.log`; opencode
  was NOT restarted or reconfigured.
- The committed file does not self-reference the hash — the hash rides on this final
  message / the mirror copy (house pattern). Scratch probe + temp sandbox: temp dirs only
  (cleaned); zero repo side files.
