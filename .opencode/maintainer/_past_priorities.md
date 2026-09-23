# _past_priorities — handled items from `priority.md` (append-only log)

Agents append ONE line per handled item, format:
`- <item as it was in the list> — <short reply>` (done / done, commit X /
see proposals/implemented/<file> / see TODO.md #N). No re-reading, no
re-editing of old entries. The maintainer owns this file — he erases entries
when he wants. The convention itself lives in `priority.md` (section
"How this works").
- # 1 compact_memory plugin that also exposes a tool (quant-class budget + CPU exclusion + optional post-compaction instruction) - done: build e07ae33, bugfix 2ace5e1, live self-compact acceptance bdc4504 (probe 98/98); residual acceptance items 3-4 (cross-session + budget-denied fire) maintainer-side; trail: proposals/approved/2026-09-12_compact_memory_plugin.md + TODO #52
- # 3 1 nap size reduction — done: Part 2 complete (NAP 1460 → 68 lines; 32 sections compressed no-loss to pointer files; Standing to measured baselines; full backup at `archive/nap_backup_2026-09-15_pre-cleanup.md`) — commit b36d4c7
- # 3 2 session dump scripts — done: `.opencode/agent/scripts/dump_session.cjs` (read-only DB; single-session FULL mode for pre-compaction dumps + `--all` corpus mode) + corpus backfilled (137 sessions → `.opencode/archive/sessions/`) — commits ab1451d + e877364; unblocks the TODO #55 dump hook (still his call)
- # 4 (planner prompt: ready-made grep command for maintainer attention markers) — done: the READY-MADE marker-sweep command lives in the planner prompt §maintainer-calls (landed plan1/looprun-1 iter-1); grep-verified in the live prompt
- # 6 (limit output lines for first greps; context is the precious resource; name the AREA in big files by lines) — done: "Context discipline on delegation" in the planner prompt (spec names the area + bounded range, first greps carry `| head -30`, read only relevant sections)
- # 9 (ctx_gauge / inline readout runs ~2 tool calls late, ~5k low) — done: "Gauge-lag rule (maintainer #9)" in the planner prompt + NAP Standing (plan with ~5k margin against the injected ctx: line)
- # 10 (script collection from temp/opencode; overview + categories + readmes) — done: `.opencode/agent/scripts/` (INVENTORY.md + README.md + db/binary/log subfolders each with README) LANDED + verified plan3 (commit 2933dd0..d352e4a); worker prompt pointers present
- 2026-09-23_04-20 marker-sweep noise — done: the fixed sweep command (include-filter before the patterns) is committed in the planner prompt (8f21b1e); re-verified clean by planner-9 2026-09-23 (no plugin.log noise, only legitimate .md hits)
