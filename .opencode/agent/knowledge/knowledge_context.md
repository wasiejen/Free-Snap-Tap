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

## Dense date strings in filenames / edits: script-resolve, never retype
- **Do:** for dated filenames (YYYY-MM-DD_slug) and dated text lines: never
type the date into a path or an edit oldString - resolve the name
programmatically (readdir + filter by a non-date key) and do replacements
with a script that captures the date via regex; verify via git status.
- **Why (evidence):** 2026-09-15 (ses_f5b1f19...): three separate ENOENT /
oldString-mismatch incidents on 2026-09-1x dates (proposal filenames,
TODO.md line) - the digits kept being perceived one apart; a readdir +
codepoint dump showed the typed name and the real name differed in exactly
the date digits.
- **Ref:** plan2 of looprun autorun-2026-09-15_13-11.
- **Keys:** ENOENT, oldString not found, dated filename, readdir, codepoint,
  retyping, script capture.

## Task failure messages: context-limit hits, not failed starts
- **Do:** when the Task tool reports `Task cancelled`,
  `the request exceeds the available context size` (or similar), read it as the
  sub-agent having RUN NORMALLY and hit the context window limit — not as a failed
  launch / provider unload. Diagnose from the loop log (START without DONE for that
  role-N) + the session before treating it as a start failure; recover with the
  compact + `task_id`-resume protocol, never a fresh relaunch of the same task.
- **Why (evidence):** 2026-09-15 plan2 (ses_f5b1f19): two worker launches reporting
  `Task cancelled` and `the request exceeds the available context size` were misread
  as a provider unload / failed starts; the maintainer corrected (direct session +
  inbox_planner/context_limit.md) that both were normal context overflows in running
  sessions (worker2 had reached design + drafted pinning tests before the limit).
- **Ref:** maintainer inbox `context_limit.md` (moved to `done/`, plan3 2026-09-15);
  plan2 NAP CORRECTION block; loop log autorun-2026-09-15_13-11.
- **Keys:** Task cancelled, request exceeds the available context size, context
  limit, failed start, provider unload, misread, resume, task_id.
