# HANDOVER PLANNER — Phase 6 (T1 de-peek)

FIRST read AGENTS.md, agents_repo.md, TODO.md, this file.

## 2026-09-09 (2nd planner) — state verified after the previous planner's stop
Rebuilt from `git log` + files (not memory). Verified:
- **Landed + committed (`2cf5f33`):** `ctxgauge/gauge.mjs` core (sqlite3.exe backend per
  maintainer ruling, digit corruption fixed) + `ctxgauge/peek.mjs` CLI, both live-verified.
- **NOT landed (T1 continuation — DELEGATED THIS SESSION to `worker_Q3_210K`):** v2.5 plugin
  wiring in `.opencode/plugin/handover_v2.4.ts` (verified: file header still v2.4.1, the
  `$`/ShellLike/GAUGE_TIMEOUT/withTimeout/gaugePreviewOf machinery is still in the code);
  probe rebuild (verified: header still targets the deleted `handover.ts` + the voided
  Electron run command); `peek.py` deletion (still on disk, tracked); TODO #30/#35
  continuation status lines. Spec = `.opencode/handover_task.md` incl. the PLANNER RULING
  block. Roster choice per TODO #35 "2026-09-09 update" + this NAP (210K class — the
  continuation needs a ≥~50k fresh window; the spec's stale `worker_120K_mtp` line is
  superseded by the planner's roster decision).
- **LIVE BUG EVIDENCE (this session's start):** the injected `ctx:` line said
  `CTX=99291 (99%) REM=709` = the PREVIOUS planner's dying session; this planner's true
  context at that moment was `CTX=25273 (21%) REM=94727` (verified via `peek.mjs`). The
  v2.4.1 cross-session feed bug is live in production — the match-only post is the fix.
- **UNCOMMITTED `opencode.jsonc`** = maintainer model renames (IQ4KT-100K→120K,
  IQ4KT-35K-MTP→50K-MTP, agent key renames Q4_100K→Q4_120K / Q4_35K_MTP→Q4_40K_MTP +
  description updates) — matches the running agent roster. NOT agent-editable (not
  pre-approved; T1 spec excludes it) — flagged to the maintainer, left uncommitted.
- **Worker summary file is STALE** (`handover_task_to_planner.md` = the shell-doc lab
  summary, pre-T1) — the T1 worker died at the context stop-line (TODO #35); the core was
  then written planner-direct.
- **Doc purge #34 (prompt-file lines) = PLANNER-OWNED** (worker is denied
  `.opencode/prompt_**` per opencode.jsonc — the block recorded in #34). Executed in this
  session while the worker runs: `prompt_agent_planner.md` + `prompt_agent_task.md`
  self-peek line → `node .opencode\ctxgauge\peek.mjs` (+ `SESSION=…` wording).
  `agents_repo.md` / root `AGENTS.md` / residual refs (#34 list) = maintainer, flag only.

## NEXT (resume order)
1. Verify the T1 continuation worker: `git log` (one commit, code + TODO + summary), run
   the rebuilt probe (exact command from its own header) → `PROBE handover: N/N PASS`,
   `node .opencode\ctxgauge\peek.mjs` live line, suite 434/434, ruff F=0, peek.py gone
   (`git ls-files`), no python/`$`/python.exe refs in plugin+probe, #30/#35 lines updated,
   `sess` field + db-error vocabulary + v2.5 header in the plugin.
2. Planner bookkeeping commit: this NAP + prompt-file purge (#34) + `TODO.md` curation
   (#35 → its close/advance lines per the verified state).
3. Then T2 = #33 nudge ladder (approved design in TODO #33: all agents, rungs
   50% → 70%/30k → 80%/20k → 90%/10k → final-5k `CTX=… REM=… — stop-line reached`,
   `promptAsync` synthetic, `kind:"nudge"` only, read must reach EVERY acting session —
   it now builds ON the v2.5 match-only post).
4. Maintainer restart = first live v2.5 fire evidence (the ctx: line must carry
   `SESSION=` of the reader's own session — the stale-read bug is gone).

## Standing
- Suite 434/434, ruff F=0 (baseline 2cf5f33). NO parsing `.opencode/plugin.log` (call-1
  one-shot only, default SKIP). v2.4.1 = live plugin (chat.message, prt-/msg- ids) until
  the restart; its readout still works (peek.py on disk) but feeds cross-session (evidence
  above).
- History (v2.x, rulings, #32 root cause): TODO.md + todo_records.md + plugin file header;
  old NAP blocks superseded by this file.
