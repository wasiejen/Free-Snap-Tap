# HANDOVER PLANNER — Phase 6 (T1 de-peek)

FIRST read AGENTS.md, agents_repo.md, TODO.md, this file.

## 2026-09-10 (late) — T1 continuation 2 LANDED + planner-verified; #34 prompt lines done
- `worker_Q4_120K` completed the FULL scope and committed BEFORE it looped in the
  final-message phase (maintainer stopped it; the repeated-final-message instruction was
  removed from the worker prompt — `52eb0aa` — the handover FILE is now the primary
  channel, final message stays short; the spec's Worker section was updated to match).
- Committed (`313e83b`): node:sqlite core (dynamic import → `db-error` on an unsupported
  host, never-throw), v2.5 plugin wiring (match-only post + `sess` evidence field +
  db-error vocabulary + dead `$`/BunShell machinery deleted), probe rebuild (fixtures via
  node:sqlite), peek.py deletion, TODO #30/#35 lines, summary file.
- **PLANNER VERIFIED (self-run):** probe `PROBE handover: 33/33 PASS`; `peek.mjs` live
  line sane (`SESSION=ses_f77d57… CTX=65345 (54%) REM=54655`); suite 434 passed /
  ruff F=0; grep clean (no `peek.py`/`python.exe`/`sqlite3.exe` on the gauge path —
  only constraint comments + the v2.5 "DELETED" header note + the probe's git-status
  sandbox check); bun 1.4.2 host-proxy check = PASS (worker, recorded in the summary —
  the opencode.exe host risk stays guarded by the `db-error` fallback regardless).
- #34 prompt-file lines DONE (planner, this bookkeeping commit): both prompt files now
  self-peek via `node .opencode\ctxgauge\peek.mjs` with the `SESSION=…` wording.
- T2 is UNBLOCKED — it builds directly on the committed v2.5 match-only post.

## 2026-09-10 — RE-RULING node:sqlite (maintainer) + new roster; T1 continuation 2 delegated
- **RE-RULING (maintainer 2026-09-10):** the gauge backend goes BACK to built-in
  `node:sqlite` (`DatabaseSync`) — the 2026-09-09 sqlite3.exe ruling is superseded.
  Rationale: 3bit Q3 workers lost coherence on the SQL/JSON detail work. Known risk
  (unchanged): the bun-compiled opencode.exe plugin host — guarded by the never-throw
  `db-error` fallback; the worker MUST run a bun 1.4.2 host-proxy check of the core and
  record pass/fail (fail → fallback is the production guard; do NOT chase a bun
  workaround); production evidence = maintainer restart + one-shot log read (call 1).
  `sqlite3.exe` stays on disk (maintainer-placed, now unused — flag, don't delete).
- **ROSTER:** the maintainer restarted with a new default worker `worker_Q4_120K` (same
  model as the planner, 4bit IQ4KT-120K, high precision). The looped/cancelled delegation
  to worker_Q3_210K left NO partial commits (verified via git log).
- **T1 continuation 2 DELEGATED to `worker_Q4_120K`**; spec = `handover_task.md` with the
  updated PLANNER RULING block (node:sqlite substitutions: core read-mechanic swap, probe
  fixture via node:sqlite, bun host-proxy check in DoD, sqlite3.exe flag-only).

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

## NEXT — SUPERSEDED (continuation 2 landed + verified, see the 2026-09-10 (late) block)
Historical resume order of the 2nd-planner block:
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

## NEXT (resume order)
1. **MAINTAINER RESTART** = first live v2.5 fire evidence: the injected `ctx:` line must
   carry the `SESSION=` of the READER's OWN session (the cross-session feed bug —
   evidenced above at this session's start — is dead by design). Note: THIS planner
   session still runs the plugin as loaded at the last restart (v2.4.1 code) — since
   `peek.py` was deleted mid-session its shell readout has degraded (no ctx: line,
   `no-ctx-output` gauge lines, never a throw); v2.5 loads on the NEXT restart.
2. After the restart: the one-shot log read (maintainer call 1, default SKIP) → v1.3
   log-profile re-baseline + v2.5 first-fire evidence → closes the #17/#30 tails.
3. #34 residual refs = maintainer call (per the #34 status line: update the
   `agents_repo.md` gauge line + module-map line — recommended; leave the frozen copy /
   playground draft / historical files as-is).
4. **T2 = #33 nudge ladder** (approved design in TODO #33): all agents, rungs 50% →
   70%/30k → 80%/20k → 90%/10k → final-5k `CTX=… REM=… — stop-line reached`,
   `promptAsync` synthetic, `kind:"nudge"` only, the read must reach EVERY acting
   session; the probe extends the 33-check probe with fake-client + nudge shapes.

## Standing
- Suite 434/434, ruff F=0 (baseline 313e83b). NO parsing `.opencode/plugin.log` (call-1
  one-shot only, default SKIP). v2.5 COMMITTED (313e83b) — live after the next
  maintainer restart; until then v2.4.1 code runs in already-loaded sessions with a
  degraded (dead peek.py) readout.
- History (v2.x, rulings, #32 root cause): TODO.md + todo_records.md + plugin file header;
  old NAP blocks superseded by this file.
