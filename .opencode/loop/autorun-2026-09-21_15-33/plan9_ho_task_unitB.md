# TASK: TODO.md shrink curation (execute the review in todo_inbox 2026-09-23_02-51)

**Worker:** worker_Q3S_170K (worker-16). **Branch:** stay on the current
checkout (`opencode_test` — verified, do not switch).

## Goal
Execute a PLANNER's curation review (already done — you execute, you do
not re-decide): read the entry `## 2026-09-23_02-51` in `todo_inbox.md`
FIRST — it is the findings list (6 findings) + the target "net open
set". Shrink `TODO.md` (1125 lines) roughly in half WITHOUT losing any
open content.

## Definition of done
1. Header numbering note: "used so far up to #84, new entries start at
   #85" → "up to #89, new entries start at #90" (#89 is the highest
   existing entry).
2. Closed-entry condensation: for every entry whose TITLE line marks it
   closed / LANDED / superseded, condense the body down to the one-line
   title form — but FIRST verify the full text exists in
   `todo_records.md` (repo root):
   - title already says "full text in todo_records.md" → just drop the
     body (keep the title line);
   - NO such pointer → APPEND the full entry text to `todo_records.md`
     (append-only) FIRST, then condense in `TODO.md`.
   - Only condense entries whose own title line carries a
     closed/landed/superseded marker. When in doubt → LEAVE IT open and
     untouched. Never delete open content.
3. Status-marker alignment (review findings 3): reconcile the drifted
   markers so title truth and status line agree — #66 (title CLOSED
   verdict LIVE vs status PENDING RESTART), #81 (title "(open)" but the
   re-pin LANDED with full gate green — it STAYS open as a maintainer
   call: keep the entry, fix the marker to show the LANDED sub-status),
   #79 (title "(open HIGH)" but LANDED with live-acceptance pending —
   same pattern), #80/#82/#85 (title markers lag their LANDED
   sub-statuses). The review's net-open list is the target: every
   member (#56, #66, #67, #70 follow-ons, #74, #75, #78, #79/#82/#85,
   #80, #81, #83 — plus #86/#87/#88/#89 which post-date the review)
   stays present with a clear status.
4. #74: split the single ~4k-char line into the contract fields (title /
   problem+evidence / desired outcome / acceptance / suggested scope /
   status) and MOVE it out of "FST behavior decisions" (it is an
   opencode host-side tool issue) to the "Plugin & gauge" section.
5. #75: collapse the ~90-line running changelog into a short status
   pointer (per unit, one line each); APPEND the unit-history text to
   `todo_records.md` first.
6. `todo_inbox.md`: APPEND a planner-curation block (2026-09-23,
   planner-9, plan9) recording the 2026-09-23_02-51 review as executed
   (finding by finding, where each landed). Do NOT delete or edit
   existing inbox entries (append-only file).
7. Commit: `TODO.md` + `todo_records.md` + `todo_inbox.md` (named paths
   only). No code changes — no gates. Verification in the handover:
   before/after line counts of TODO.md, the condensed-entry list (IDs),
   the net-open set as it stands, and a machine check that every ID
   1..89 appears exactly once as an entry in TODO.md (script it — do
   not count by eye).

## DO-NOT-touch
- `.opencode/maintainer/**`, `opencode.jsonc`, the maintainer's
  uncommitted live files (verify `git status` before committing — ideas.
  md, knowledge_inbox.md, repo_opencode.md were live-edited mid-run)
  and the archive dumps (gitignored by his dba6973 — still never stage).
- Open entries on the net-open list: content preserved VERBATIM — only
  their status/marker lines change, plus the #74 restructure and the
  #75 collapse (history preserved in todo_records.md).
- No renumbering — IDs are stable and never reused.

## Notes
- Bounded reads: TODO.md is 1125 lines — read it in section windows
  (the section headers at the top of each grep `^## ` output are your
  map), never whole-file. Chunked writes ≤ ~8KB per call.
- The review's findings are the CONTRACT — if a finding turns out stale
  (e.g. an entry already condensed), note it in the handover and move
  on; do not re-derive the review.
