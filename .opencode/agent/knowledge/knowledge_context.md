# knowledge_context.md — working with dense / large content

Gained, verified knowledge for working with dense, numeric, or large
content (header lists, logs, DBs, binaries, compacted sections). Not
protocol — hard-won findings that keep an agent out of the re-read loop.
Format per the README: **Do** / **Why (evidence)** / **Ref** / **Keys**.

## Dense numeric lists: machine counts, single emission, anchors
- **Do:** never count or compare dense numeric lists (line numbers, session
  IDs, dates, section counts) by eye — derive them with a script
  (`grep -c` / `wc -l` / relational `diff`/`test` on counts). Emit a dense
  list at most ONCE per session; if you need it again, it is already in a
  scratch file. Reference sections by unique line anchors (short line
  prefixes), not absolute line numbers — line numbers drift with every edit.
- **Why (evidence):** 2026-09-15 (ses_f5d75a58): the planner repeatedly
  misread section dates in a 35-line header list and looped on re-reading
  the same list ("scroll up"); the maintainer captured it in his example
  file (same session: a worker kept perceiving the number 55 as 56).
  Byte-level comparison (`od -c`) finally resolved what repeated visual
  reads could not — the date was there all along.
- **Ref:** `maintainer/example_for_dense_content_warning.md` (moved to
  `done/` after the reply); the NAP section of ses_f5d75a58.
- **Keys:** dense content, numeric strings, counts, line numbers, misread,
  od, byte compare, anchors, scroll-up loop.

## Pipeline-only rule for big sources (section bodies, DBs, logs, binaries)
- **Do:** never pull a big source into context — work through scripts that
  extract BOUNDED windows (grep with limits, head/tail, window extractors).
  Compressed/compacted sections are dangerous to re-read inline: keep
  POINTERS (file + git hash) and verify with a script instead of re-reading
  the detail. If a task needs a section's content, the content lives in the
  pointer file — read that, not the stale inline copy.
- **Why (evidence):** 2026-09-15: the PIPELINE-ONLY spec (only header lines
  + archive/standing readable, everything else via scripts) produced 7/7
  correct appends + a clean 68-line NAP rewrite; the earlier unbounded
  approach looped on the same list. The 1.6 GB opencode DB is handled only
  through read-only scripts (sesdata.cjs pattern → `dump_session.cjs`).
- **Ref:** the `handover_task.md` spec of ses_f5d75a58 (committed
  e8200da); `.opencode/agent/scripts/README.md`.
- **Keys:** pipeline-only, bounded reads, context budget, dump, corpus,
  pointer, no-loss, compressed sections.
