# TASK T1 — Plugin rename `handover_v2.4.ts` → `ctx_watchdog.ts` (approved: `proposals/approved/2026-09-11_plugin-scope-tool-rename.md` item 2)

FIRST read `AGENTS.md`, `agents_repo.md` (+ the repo parts it names as needed),
this file, and item 2 of the approved proposal above (item 1 is RETIRED —
ignore it). This is a SMALL mechanical task — do not widen it.

## Goal

Rename the live plugin file and update every LIVE reference to it.
Pure rename + comment hygiene — ZERO behavior change, NO SDK verification
needed (the plugin code itself is untouched apart from the header note).

## Scope (planner-verified live-reference set at spec time, HEAD `d69794d` —
re-grep to confirm, and update any live ref the grep finds beyond these)

1. `git mv .opencode/plugin/handover_v2.4.ts .opencode/plugin/ctx_watchdog.ts`
2. The plugin's header block: add ONE short rename line (e.g. "renamed from
   handover_v2.4.ts 2026-09-11 (approved rename)"); the version-history block
   stays untouched.
3. Live references (the exact grep set):
   - `.opencode/plugin/probes/handover_probe.mjs:2` (header comment) and
     `:183` (`PLUGIN_TS` path)
   - `.opencode/plugin/scripts/gauge.mjs:4` (comment)

## Do NOT touch

- `opencode.jsonc` (no config references the filename — re-verify by grep;
  NEVER stage it).
- The maintainer's new prototypes: `.opencode/tools/compact_memory.ts`,
  `.opencode/plugin/context_recovery.ts` (a later task builds on them).
- Historical records: `TODO.md`, `todo_records.md`, `.opencode/handover/`,
  `proposals/`, the loop + archive folders — past-tense records stay as-is.
- Any FST python code.
- Anything under `proposals/maintainer/`.

## Definition of done

1. `node .opencode/plugin/probes/handover_probe.mjs` →
   `PROBE handover: 63/63 PASS`, exit 0 (SAME check count — rename only).
2. `& .\.venv\Scripts\python.exe -m pytest -q` → 451 passed + 1 known #10
   warning (no FST code touched).
3. `& .\.venv\Scripts\ruff.exe check --select F .` → 0.
4. `git grep -n 'handover_v2\.4'` → hits ONLY in the historical-record
   locations listed above (zero live hits).
5. ONE commit: the rename + header note + probe + gauge comment + the summary
   file. Follow the AGENTS.md commit routine (gauge check after commit).

## Approval boundary

Pre-approved by the approved proposal item 2 (meta-only repo-side rename;
observable behavior unchanged; no config edit). If the grep finds a live
reference you did not expect, record it in your summary and update it if it is
unambiguously a live ref of the same kind (path/comment) — otherwise flag it
in `todo_inbox.md` and leave it.

## Worker

`worker_Q4_120K` (fresh session).
