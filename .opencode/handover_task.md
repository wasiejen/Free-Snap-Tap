# TASK — Phase 6 / Tier 1 — plugin v2.2: ctxgauge injection for ALL sessions ("both")

FIRST read `AGENTS.md`, `.opencode/handover_task_to_planner.md` (the v1.2 worker's
EXECUTIVE SUMMARY — carries the offline Electron `RUN_AS_NODE=1` Node 24 probe
recipe), `.opencode/plugin/handover.ts` (current code = v1.2 skip set + v2
ownership), and `.opencode/archive/260908-v21-session-graph-spec.md` READ-ONLY
(context only — that design is SUPERSEDED by the decision in this spec, NOT an
instruction).

## Decision context (record in your summary as the change rationale)
Maintainer call 2026-09-08: the ctxgauge line should reach WORKERS too, not only the
planner — long thinking worker runs need an early near-limit reminder. Current live
behavior (v2 + v1.2): `onSystemTransform` evidence-logs every transform, then the gate
`str(input?.agent)?.startsWith("planner")` — which can NEVER match, because the live
payload carries no agent identifier (evidence: 60+ `kind:"transform"` lines in this
session's log, all shaped `{sessionID, model:{…}}` — read the live log
`.opencode/plugin.log` read-only, transform lines, to confirm shape). So injection
currently reaches NOBODY. The "both" decision is the formal override of v2's
planner-only design note — the transform hook now injects on EVERY transform
(planner + all child/worker sessions). Consequences (keep as notes, not code):
- no `childSessions` graph needed (v2.1 unneeded — the archived spec is void as code),
- every session pays one bounded peek spawn per LLM call (≤3 s, detached, best-effort),
- `peek.py` has no session-id input (reads the most recently updated session's last
  FINISHED message from opencode's sqlite DB) — an injected number can be another
  session's (adjacent-stale); accepted — this is a reminder, not a control.

## The change (decided — implement exactly this; v1/v1.2/v2 behavior otherwise byte-for-byte)
1. In `onSystemTransform` (`.opencode/plugin/handover.ts`): remove the agent-prefix
   gate — delete the two lines
   `const agent = str(input?.agent); if (!agent || !agent.toLowerCase().startsWith(PLANNER_AGENT_PREFIX)) return;`
   so the flow is: evidence-log (unchanged) → `gaugeReadout()` → append
   `ctx: <line>` to `output.system` when the line resolved and `system` is an array
   (existing mechanics unchanged).
2. Delete the now-unused `PLANNER_AGENT_PREFIX` constant.
3. Update the file-header comment block: one v2.2 line — injection now targets ALL
   sessions (maintainer "both" call 2026-09-08; the payload still carries no agent
   identifier — the gate was dead code; the stale-adjacent caveat is accepted).
4. NOTHING else changes: skip set, pre-flight warn, summary mirror, `gaugeReadout`
   (shell guard, 3 s bound, no child_process), evidence line shape.

## Verification (offline, same Electron `RUN_AS_NODE=1` Node 24 recipe)
- **Regression:** re-run the v2 probe suite scenarios **S1–S3** byte-for-byte (file:
  `git show 2a4996c:.opencode/handover_task.md`) — unchanged expectations.
- **S4 (transform scenarios) — expectations SUPERSEDED by this task:** re-run S4 with
  the new expectations:
  1. transform with the LIVE payload shape (no `agent` field, fake shell present
     returning `CTX=12345 (10%) REM=100000`) → exactly ONE `ctx: CTX=12345 (10%)
     REM=100000` appended to `output.system`, evidence line logged.
  2. transform with a WORKER-shaped agent (`agent: "worker_120K_mtp"`) + shell →
     appended too (the "both" semantics — if the field ever comes back, no gate).
  3. transform, shell present but `CTX=` line absent (e.g. shell returns junk) →
     omitted, no throw, evidence line still logged.
  4. transform, no shell (`input.$` absent) → omitted, no throw, evidence line
     logged.
- **Post-start live verification (planner record):** record this instruction at the
  bottom of the summary, verbatim: "LIVE PROOF PENDING START: the post-restart planner
  session must confirm (a) the `ctx:` line is visible in the PLANNER system context, and
  (b) a delegated worker's summary reports its own `ctx:` line verbatim if present — the
  delegation spec must ask the worker: quote your `ctx:` line if you see one in your
  system context."
- `& .\.venv\Scripts\python.exe -m pytest -q` → **434 passed**;
  `& .\.venv\Scripts\ruff.exe check --select F .` → **6 findings**.

## Summary + commit (NORMAL flow — no deviation this cycle: your summary goes to the
canonical `.opencode/handover_task_to_planner.md` per the standing prompt AND the
plugin mirrors it — both writing the same content is expected)
- Append TODO.md entry **#18** (append-only) with exactly this content (number the
  entry 18 — it must be the next free number; do NOT touch other entries):
  "18. ctxgauge injection: maintainer 'both' decision — gate removed (v2.2) (2026-09-08)

  Decision 2026-09-08: inject the `ctx:` gauge line for ALL sessions (planner + workers);
  this is the formal override of the v2 'planner-only, never inject-for-all' design note
  and supersedes the v2.1 root-only session-graph spec (archived at
  `.opencode/archive/260908-v21-session-graph-spec.md` — now void as code). Accepted
  caveat (on record, from planner measurement): `peek.py` takes no session id — it reads
  the most recently updated session's last FINISHED message from opencode's sqlite DB, so
  an injected number can be another session's (adjacent-stale); accepted — the line is a
  reminder, not a control. Companion call (SEPARATE, maintainer): add a stop-line rule to
  `prompt_agent_task.md` so workers act on the line — not in v2.2, not decided."
- Commit per AGENTS.md: `.opencode/plugin/handover.ts`,
  `.opencode/handover_task.md`,
  `.opencode/handover_task_to_planner.md`, `TODO.md`. NOT: NAP,
  `opencode.jsonc`, `AGENTS.md`, playground files, `plugin.log`. Subject one-liner:
  `Handover plugin v2.2: inject ctxgauge for all sessions (planner + workers)`.
- Do NOT restart/reconfigure opencode.
