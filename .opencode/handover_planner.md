# HANDOVER PLANNER — Phase 6 (T1 de-peek)

FIRST read AGENTS.md, agents_repo.md, TODO.md, this file.

## 2026-09-09 — T1 residue committed (this commit). Worker died compacted; problem solved per maintainer ruling.
- RULING: sqlite via `.opencode/plugin/tools/sqlite3.exe` (maintainer-placed, SQLite 3.53.4 JSON1) — node:sqlite unreliable in the bun-compiled opencode.exe host.
- Core `ctxgauge/gauge.mjs` REWRITTEN + committed: sqlite3.exe spawn (args array, `file:…?mode=ro`, marker SQL `M|sid|model|total|output`+`S|sid`, NO PRAGMA in call — echo pollutes stdout, one busy-retry, 2500ms, kinds ok/no-total/db-error) + corruption fixed (105→100/1000) + last-marker window rule (trailing `<N>K`×1000, `-MTP` speed-only, no match=unknown). Verified node v24 + bun 1.4.2 identical live lines + 14/14 unit checks. peek.mjs async, verified.
- peek.py STILL ON DISK = live v2.4.1 readout (old "DELETED" claim was wrong — TODO #30 corrected). Delete it in the continuation commit with the wiring.

## NEXT (resume order)
1. Delegate T1 continuation → `worker_210K`. Spec = `.opencode/handover_task.md` incl. the new PLANNER RULING block (do NOT re-derive the read mechanic — core is final). Scope: v2.5 wiring in `.opencode/plugin/handover_v2.4.ts` (import core; MATCH-ONLY post: `readGauge().sid===input.sessionID` else silent (no post, no log); post any valid form; `sess` field on chatmsg line; gauge vocab db-error(+preview)/parts-not-array/invalid-messageID; DELETE $/ShellLike/GAUGE_TIMEOUT/withTimeout/gaugePreviewOf; v2.5 header) + probe rebuild (fixture DB via sqlite3.exe; no python/node:sqlite) + suite 434/434 + ruff F=0 + TODO lines + peek.py deletion.
2. Verify worker (git log + probe N/N + suite), then doc purge #34 (prompt files: self-peek → `node .opencode\ctxgauge\peek.mjs`; check planner perms — worker denied `prompt_**`; agents_repo.md/AGENTS.md = maintainer, flag only), then maintainer restart = first live fire evidence.
3. Then T2 = #33 nudge ladder (approved design in TODO #33; all agents, rungs 50%→70%/30k→80%/20k→90%/10k→final-5k `CTX=… REM=… — stop-line reached`, promptAsync synthetic, kind:nudge only, read must reach EVERY acting session).

## Standing
- Suite 434/434, ruff F=0. NO parsing `.opencode/plugin.log` (call-1 one-shot only, default SKIP). v2.4.1 = live plugin (chat.message, prt-/msg- ids).
- History (v2.x, rulings, #32 root cause): TODO.md + todo_records.md + plugin file header; old NAP blocks superseded by this file.
