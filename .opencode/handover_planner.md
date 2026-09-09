# HANDOVER PLANNER — Phase 6: opencode planner/worker workflow (Tier 1 + Tier 2)

FIRST read `AGENTS.md` (orientation, conventions, commit routine — do NOT edit AGENTS.md
directly), `TODO.md`, and this file. House rule: when something is unclear, ASK EARLY.

## Current state (2026-09-09 — v2.2.2 fix + approved landings committed)
- **ROOT CAUSE FOUND (proof-start read is DONE — TODO #23/#27 closed):** the missing `ctx:`
  line was a gauge READOUT failure, not a transform-scope issue. The plugin.log start segment
  (no 40k-message marker in this retained file; era-phase identified per the worker log ids in
  `.opencode/handover_task.md`) holds all `kind:"gauge"` evidence:
  - Electron era: `input.$` absent → `shell-missing` ×23 (silent before v2.2.1 existed).
  - Terminal/CLI era (maintainer's switch): `input.$` = a LIVE BunShell that REJECTS the v2
    function-call command shape → `no-ctx-output` ×47, preview = `Error: Please use '$' as a
    tagged template function: $(cmd arg1 arg2)`.
  - **Fix = handover.ts v2.2.2:** gauge invocation as tagged template + `ShellLike` structural
    type for `TemplateStringsArray`; the probe's fake shell mirrors the live rejection so the
    string-call regression now FAILS the probe (S4 ok-shapes assert zero gauge lines).
  - Also in the cycle: probe run command switched pinned-electron exe → system `node`
    (maintainer removed the Electron install; node v24.19.0/npm 12.0.2 on PATH — recorded in
    TODO #29), worker stop-line rule appended to `prompt_agent_task.md` (approval 2026-09-09),
    v1.3 skip-set extension landed in handover.ts (file.watcher.updated / file.edited /
    session.idle; message.removed + session.* stay logged — approval 2026-09-09, TODO #17).
  - Worker's first-cycle note (v2.2.1): its closing self-gauge `CTX=109097 (90%) REM=10903` —
    first real stop-line encounter, pre-rule; the new rule codifies exactly that behavior.
- **Verification (measured):** probe 28/28 PASS on system node (`node .opencode\plugin\
  probes\handover_probe.mjs after`, mode=after); FST untouched — **434 passed, ruff 6**
  (no FST files changed this cycle; baselines stand from `6004486`).
- Maintainer's untracked research note `.opencode/plugin/context meter via plugin hook.md`
  stays untracked — his call if it gets versioned (left alone since `60260908`).

## Live status
- Task 1 (Tier 1): DONE + root-caused — only the v2.2.2 PROOF START remains (one opencode
  restart): read that start's `kind:"gauge"` lines (expect ZERO new failures) + the `ctx:`
  items should surface in planner AND worker prompts — proof delegation: one worker turn that
  quotes its `ctx: CTX=…` item verbatim (v2.2 worker-proof protocol, now expected to pass).
- Task 2 (Tier 2 — custom `handover` tool, compaction hooks, resume aid, permission
  auto-approval): NOT STARTED — scoping from the live shapes (written proposal); Tier-2 code
  waits for a Tier-2 spec.

## MAINTAINER CALLS (open — in order)
1. **opencode RESTART — the v2.2.2 proof start.** One action. It also measures the v1.3 log
   profile (baseline segment: 395 lines with 115 event lines of which 90 were the three
   now-skipped noise types, ratio of TODO.md #17 data — expect the same ~79% event-line
   drop in the next start) and puts the worker stop-line rule live for the first delegation.
2. **Deferred FST behavior calls** (post-plugin, bundles of 2-3 — see Maintainer's rules):
   #11 contradiction prevention (off-by-design vs re-enable), #8 `ap`/`ar` semantics,
   #7 empty-macro comment vs behavior, #6+#4 dead-code deletion, #9 except-harden, #1 vk-error
   surfacing (channel call). Default-approved meta/docs work is NOT here — it just gets done.

## NEXT STEPS
1. After his start: read the start segment's `kind:"gauge"` lines + scan MY prompt for a
   `ctx:` item (the planner-side injection was never observed live — check the env/system
   block on resume) → if ok: worker-proof delegation (one turn, quote the line) → then
   archive/close TODO #29 item 4 (the OPEN restart note) + close the cycle in git.
2. Log-growth measurement (v1.3 profile): the plugin.log is RETAINED across starts (append,
   no truncate — confirmed live; no 40k-message marker exists in this file, so the old
   marker-based segment rule does not work on this host) — base = the line count recorded in
   this file's footer (1269); the next start's segment = lines after that count, or delta per
   read.
3. TODO hygiene (planner-owned): nothing outstanding now; worker entries for future
   landings — keep #29 item 4 open until the proof start.
4. Then: **Tier 2 scoping from the LIVE shapes** — written proposal; Tier-2 code waits for a
   Tier-2 spec.

## Context budget
Per AGENTS.md: `& .\.venv\Scripts\python.exe .opencode\ctxgauge\peek.py` (from repo root).
Stop line REM ≤ 15k or ≥ 85 % — wrap up BEFORE the line. Self-run peek until the planner-side
`ctx:` injection itself is observed live (first chance: the proof start's own prompts).

## Log base (measurement)
plugin.log line count at this NAP write = **1269** (retained file, append-only across starts).
