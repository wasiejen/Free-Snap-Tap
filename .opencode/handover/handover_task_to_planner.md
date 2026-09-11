# EXECUTIVE SUMMARY — T1: plugin rename `handover_v2.4.ts` → `ctx_watchdog.ts`

**Outcome:** DONE — rename + header note + the 3 live comment/path refs, zero
behavior change. All DoD checks green.

## What changed
- `git mv .opencode/plugin/handover_v2.4.ts .opencode/plugin/ctx_watchdog.ts`
  (100% rename; content untouched apart from the header note below).
- `.opencode/plugin/ctx_watchdog.ts:3` — ONE rename line added to the header
  block: `// renamed from handover_v2.4.ts 2026-09-11 (approved rename).`
  (version-history block untouched).
- `.opencode/plugin/probes/handover_probe.mjs:2` — header comment now points
  at `ctx_watchdog.ts`.
- `.opencode/plugin/probes/handover_probe.mjs:183` — `PLUGIN_TS` path →
  `ctx_watchdog.ts`.
- `.opencode/plugin/scripts/gauge.mjs:4` — header comment path →
  `ctx_watchdog.ts`.

The live-reference set was re-grepped before editing and matched the
planner-verified set exactly (no unexpected live refs found).

## Verification (measured)
- `node .opencode\plugin\probes\handover_probe.mjs` → **`PROBE handover:
  63/63 PASS`**, exit 0 (SAME check count — rename only).
- `& .\.venv\Scripts\python.exe -m pytest -q` → **451 passed, 1 warning**
  (the known #10 `RuntimeWarning: coroutine never awaited` — no FST code
  touched).
- `& .\.venv\Scripts\ruff.exe check --select F .` → **0 findings**.
- `git grep -n 'handover_v2\.4'` → hits ONLY in historical/spec locations:
  `TODO.md`, `todo_records.md`, `.opencode/handover/` (NAP + this task spec),
  `.opencode/proposals/`, `.opencode/loop/` + `.opencode/archive/loop/`
  (past records), plus the intentional rename note in `ctx_watchdog.ts:3`
  (required by the spec). ZERO live path references remain;
  `.opencode/plugin/` tree is clean except that note.
- `opencode.jsonc` re-verified by grep (committed + working tree):
  **zero** references to the plugin filename → no config edit needed, and it
  was NEVER staged.

## Commit
- ONE commit (subject: **"Rename plugin to ctx_watchdog.ts (approved item 2);
  update probe/gauge live refs"**), the first commit after `d69794d` —
  scope exactly the DoD-5 set: the rename, the header note, the probe, the
  gauge comment, and this summary. (Self-hash infeasible — cited by parent +
  unique subject, same convention as the #48 summary. Verify with
  `git log --oneline d69794d..HEAD`.)

## Discrepancies / notes for the planner
1. **Spec file path:** the task spec cites `proposals/approved/…`; the actual
   folder is `.opencode/proposals/approved/2026-09-11_plugin-scope-tool-rename.md`
   (found, read, item 2 confirmed — the rename ruling).
2. **Proposal vs spec on config:** proposal item 2's text says "Rename touches
   `opencode.jsonc` (your live file)"; the spec (planner-verified, later) says
   no config references the filename (opencode auto-loads
   `.opencode/plugin/*.ts`). Grep confirmed the spec: `opencode.jsonc` has
   zero filename refs → no config edit, consistent with the spec.
3. **Uncommitted spec at launch:** the launch message called the T1 spec
   "committed", but at session start `handover_task.md` was modified (M) in
   the working tree, NOT committed (the committed version at `d69794d` was the
   superseded Cycle-1 spec). I left it UNSTAGED (DoD-5 enumerates the commit
   set without it, and it is the planner's handover file). The working-tree
   version is byte-identical to what the looprunner launched against
   (`.opencode/loop/autorun-2026-09-11_17-23/plan2_t1_ho_task.md` untracked
   copy exists too) — the planner/looprunner should commit it (or its NAP)
   to make the spec canonical per the interaction contract.
4. Other working-tree changes I deliberately left alone: `handover_planner.md`
   (NAP — planner-owned), `loop_log.md` + the loop plan files (looprunner-
   owned), `agent_readme_loop.md` (prompt file, not in my task),
   `opencode.jsonc` (never stage).

## TODO entries
- None. No `TODO.md` / `todo_records.md` / `todo_inbox.md` edits — nothing
  out of scope was found, and per the spec the historical records stay
  untouched.

## Deliberately NOT done
- No behavior change: the plugin code is byte-identical to the pre-rename
  file apart from the one header line (probe 63/63 confirms same check count
  and identical pinned outputs).
- `opencode.jsonc` untouched (no refs; never staged).
- Maintainer prototypes `.opencode/tools/compact_memory.ts` +
  `.opencode/plugin/context_recovery.ts` untouched (grep: no `handover_v2.4`
  refs in them).
- Historical records (TODO.md, todo_records.md, `.opencode/handover/`,
  `.opencode/proposals/`, loop + archive folders) untouched — past-tense
  refs to `handover_v2.4` stay as-is per the spec.
- No FST python code touched. Nothing under `proposals/maintainer/` touched.
- No SDK verification (spec: not needed for a rename).
