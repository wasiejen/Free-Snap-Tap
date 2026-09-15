# TASK — helper-script collection: curate the scratchpad scripts into the repo (maintainer #10 + #4 inbox)

Worker: `worker_Q4_120K`. Planner: plan3 (autorun-2026-09-15_13-11), iteration 3
launch — spec written in plan1, unchanged otherwise.

## Goal
The agents keep rewriting the same throwaway helper scripts every session
(binary window extractors, DB inspectors, log-window greppers). Build a
curated, documented, tested helper-script collection in the repo so future
sessions REUSE it instead of re-deriving it. This is the maintainer's
`# 10 script collection` (priority.md) + inbox `analyse_helper_scripts.md`
+ inbox `snippet_collection.md` (his words: "ready made scripts that are
tested and usage is documented", "especially important are scripts to deal
with dense content").

## Source material
- Scratchpad: `C:/Users/Wasiejen/AppData/Local/Temp/opencode/` — the scripts
  created across sessions. SIX of them are quoted VERBATIM in
  `.opencode/maintainer/done/analyse_helper_scripts.md` (lines 19-132):
  `binwin.cjs` (needle context windows in a binary), `binoff.cjs` (offset
  window in a binary), `binhits.cjs` (all hit offsets + tiny context),
  `sesinspect.cjs` (read-only DB session inspector), `sesdata.cjs`
  (slim message-data dump), `logctx.cjs` (context around log lines).
  MORE scripts likely exist there — inventory the whole folder.
- Repo home (already exists): `.opencode/agent/scripts/` — `dump_session.cjs`
  + `README.md` (it is the pattern to follow: env-overridable host paths,
  read-only DB, no dependencies beyond node:sqlite/node:fs/node:path).

## Work (suggestion, not protocol)
1. INVENTORY the scratchpad folder machine-generated (file list + first
   comment line per .cjs/.mjs/.ps1 — never full-read the scripts into
   context; bounded head).
2. SELECT the useful ones: dedup against `.opencode/agent/scripts/`, keep
   scripts that do ONE thing well; prefer the dense-content ones.
3. MOVE (copy into the repo; do NOT delete the scratchpad originals —
   that is the maintainer's call) into `.opencode/agent/scripts/<category>/`
   subfolders with self-explanatory names (suggest: `db/`, `binary/`,
   `log/` — your call on the exact split).
4. GENERALIZE each moved script: machine-specific hardcoded paths (DB, log,
   exe) become argv/env-overridable with the current host value as default
   (the `dump_session.cjs` OPENCODE_DB pattern).
5. TEST each moved script from the repo (read-only mode; exit 0; expected
   output shape) — record the test command + result per script.
6. SNIPPET collection (inbox `snippet_collection.md`): a
   `grep_snippets.md` (location: next to the scripts README — your call)
   with ready-made, OUTPUT-LIMITED grep/navigation commands for big
   files/folders, INCLUDING the maintainer-marker sweep command (copy it
   from the planner prompt §maintainer calls/decisions).
7. READMES: top-level `.opencode/agent/scripts/README.md` (update) + one per
   category folder — usage, args, one example each, self-explanatory.

## Definition of done (acceptance)
- Scratchpad inventory documented (file list + one-line purpose) in the
  scripts README (or a sibling `INVENTORY.md`).
- Every selected script: in the repo, generalized (no hardcoded host paths
  beyond env-overridable defaults), tested from the repo with the test
  command + result recorded in its README.
- `grep_snippets.md` present with the marker sweep + ≥4 other
  output-limited navigation recipes.
- NO product code touched; NO `.opencode/agent/prompts/**` touched (you have
  edit-deny there — do not even try it, TODO #54); no scratchpad original
  deleted.
- Standard gate still green (run it, report the numbers in the handover).

## Approval boundary
Meta files only (`.opencode/agent/scripts/**` + the snippet file) —
pre-approved class. Anything beyond that scope → note it in the handover,
do not do it.

## Notes
- Context discipline (maintainer #6): first greps output-limited
  (`| head -30`); read only what the task names; dense content via scripts.
- Findings you cannot act on → `todo_inbox.md` (unnumbered).
- Prompt reference (the one-line "look here for helper scripts" pointers in
  the role prompts) is PLANNER-side work — the next planner unit adds them
  after this lands; do not attempt prompt edits.
