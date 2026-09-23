# HANDOVER — worker-16 `worker_Q3S_170K` (plan9 unit B: TODO.md shrink curation)

Executed the planner's review in `todo_inbox.md` entry 2026-09-23_02-51
(findings 1–6) on the `opencode_test` checkout (verified, not switched).
No code changes — no gates. Commit: `TODO.md` + `todo_records.md` +
`todo_inbox.md` + this file (named paths only; live maintainer files
untouched — `git status` verified before staging: `knowledge_inbox.md`,
`opencode.jsonc`, `repo_map.md` were live-edited mid-run and NOT staged).

## What changed
1. **Header numbering note:** "used so far up to #84, new entries start at
   #85" → "up to #89, new entries start at #90".
2. **Closed-entry condensation (12 entries)** — for each, the FULL entry
   text was verified absent from `todo_records.md` (scripted greps) →
   appended there FIRST (append-only), then condensed to its one-line
   title in `TODO.md`: **#51, #65, #54, #55, #57, #58, #59, #60, #61, #63,
   #84, #89**. All other closed entries were already one-line records
   (or carried a live `todo_records.md` pointer) — nothing else condensed.
   Stale finding: **#65's** title pointer "see todo_records.md for the
   full entry if needed" pointed at nothing — the append made it true.
3. **Status-marker alignment (review finding 3):**
   - **#66** title "CLOSED 2026-09-16 direct session; verdict LIVE" →
     "open — PENDING RESTART, 2026-09-16 direct session" — the status line
     (PENDING RESTART) is the live state; the body records no verdict
     (no `intercept.log`, no verdict line).
   - **#79** title gains "LANDED 2026-09-22, live acceptance pending".
   - **#80** title gains "fix LANDED 2026-09-22 + plugin reactivated, live
     acceptance (b) verified, close pending maintainer confirm".
   - **#81** title gains "re-pin LANDED 2026-09-22 (af38e2f), gate green" —
     STAYS open as a maintainer call (per spec, not closed).
   - **#82** title gains "scope-toggle LANDED 2026-09-22 via #85 part 1;
     live acceptance + unit-2 suppression question pending".
   - **#85** title marker gains "live verification PENDING post-restart" —
     was already largely aligned (stale finding noted in the curation block).
   Status lines themselves already agreed with the body — only titles changed.
4. **#74:** the single ~4k-char line split into the contract fields (title /
   **Problem / evidence** / **Outcome** / **Acceptance** / **Suggested
   scope** / **Status**) and moved from "FST behavior decisions" to
   "Plugin & gauge" (it is an opencode host-side tool issue). Content
   verbatim — only field breaks inserted.
5. **#75:** the ~90-line running changelog collapsed to per-unit status
   pointers (one line per unit + the numbering NOTE); the full unit
   history (89 lines) appended to `todo_records.md` first.
6. **`todo_inbox.md`:** planner-curation block appended
   (2026-09-23, planner-9, plan9) recording the review as executed, finding
   by finding. Existing inbox entries untouched (append-only).
7. **Mechanical moves done by a node line-index script** (bit-exact moves,
   no re-typed file content); judgment edits (titles, #74 field breaks, #75
   pointer text, curation block) done via the edit tool.

## Measured verification
- **Line counts (wc -l):** `TODO.md` 1132 → 811 (−221); `todo_records.md`
  877 → 1240 (+363); `todo_inbox.md` 134 → 145.
- **Machine ID check (scripted, not counted by eye):** 67 entry IDs present
  in `TODO.md`, ZERO duplicates, none above 89. The 22 IDs absent from
  `TODO.md` are EXACTLY the documented reserved set in the "Closed
  entries" header (2, 5, 10, 12–16, 18–29, 31, 32 — moved to
  `todo_records.md` on 2026-09-10, pre-existing, untouched by this run);
  all 22 verified present in `todo_records.md`. Union = 89 distinct IDs,
  no reuse, no renumbering.
- **Net-open set as it stands:** #56 (deferred), #66 (open — PENDING
  RESTART), #67, #70 follow-ons, #74, #75 (units 1–4 LANDED; live
  acceptance pending for units 2+4), #78, #79 (LANDED, live acceptance
  pending), #80 (LANDED, close pending maintainer confirm), #81 (LANDED,
  maintainer call), #82 (scope-toggle LANDED, live acceptance pending),
  #83 (backstop, maintainer call), #85 (all parts LANDED, live
  verification pending, maintainer call), #86 (deferred), #87 (open,
  maintainer call).
- **Stale/ambiguous findings (left untouched, flagged in the curation
  block):** #68, #69, #71, #73 — their STATUS lines say CLOSED/LANDED but
  their TITLE lines carry no closed/landed/superseded marker, so the
  curation rule ("only condense on a title-line marker; when in doubt →
  leave open") was applied and they stay for the planner's next call.
  Note: the review's "roughly half" estimate assumed ~40 full-text closed
  entries — most were already one-line records at run time, so the
  achievable cut was the 12 full bodies + the #75 changelog (1132 → 811).

## Commit
`TODO.md` + `todo_records.md` + `todo_inbox.md` + this handover file, one
commit on `opencode_test`. Commit hash: recorded by the planner in the
follow-up bookkeeping commit (per the #80/#84 precedent).

## Deliberately NOT done
- No renumbering / ID reuse; no content deletion of any open entry
  (net-open set preserved verbatim — only status/marker lines, the #74
  restructure, and the #75 collapse touched them).
- #68/#69/#71/#73 left with full bodies (title-marker rule above).
- The "Maintainer calls (open, in order)" section item 1 ("none open as of
  2026-09-15") is stale but out of this task's scope — not touched.
- No code, no gates, no branch switch; `.opencode/maintainer/**`,
  `opencode.jsonc`, `ideas.md`, `knowledge_inbox.md`, `repo_opencode.md`,
  `repo_map.md` and the gitignored archive dumps never staged.

Lessons: for long-line TODO curation the read tool truncates >2000-char
lines (#74 was only fully visible via unbounded `rg` output) and a
node line-index script is the drift-safe way to move/condense multi-line
blocks — large oldString edits on dense text are the risk.
