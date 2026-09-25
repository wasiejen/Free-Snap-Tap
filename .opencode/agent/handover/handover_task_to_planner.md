# HANDOVER — R6: edit-scope hint channel + payload journal (TODO #95, sub-item 1) (planner-written from file evidence; the worker's close-out died silently, 2026-09-25)

## Executive summary
R6 is the observation-only unit of the fuzzy edit-oldstring track: on a failed
`edit`, the hook resolves the miss with a CONTENT locator and LOGS a hint
(never mutates `oldString`, never auto-retries), and EVERY
`write`/`edit`/`block_transfer` call appends one line to a PAYLOAD JOURNAL
(a separate file, never an intercept line). The journal + hint together are
the one-command recovery fallback (`cp` the payload in place, or the hinted
edit / block_transfer-PASTE the section by anchor) — fired by the agent or a
rescue session. Three surfaces:
1. **Content locator** (`intercept_observer_core.ts`: `locateContent`) —
   anchor/candidate + d<=2 gap>=2 over FILE LINES, fail-closed; the unifying
   primitive for the edit hints, the R3 section-anchor resolver, and
   block_transfer section recovery. VERDICTS = 11 total.
2. **Payload journal** — `journal_write.log` (write = full content) /
   `journal_edit.log` (edit = `{filePath, old, new}`; block_transfer =
   src/dst+anchors — the shared edit-class file, the tool field disambiguates).
   Date-stamped, git-ignored, best-effort (never fails the call).
3. **Edit hint channel** (before hook, `edit` only) — exact-1 `oldString`
   silent; absent → `edit-hint` (single candidate: line + d + gap + snippet) /
   `edit-ambiguous` (multiple: ALL candidate line numbers) / `no-candidate`
   (anchor absent). 8-field line, context `edit oldString`. A dense date /
   numword in `oldString` ALSO fires an observation line — the hint is the
   LAST line. Plus the **after-hook enrichment** (the failed edit's
   `output.output` gains the hint line — consumed once; live acceptance
   restart-gated) and the **DoD machine check**.

## What changed (one green commit: code + probe + smoke + docs + TODO + this handover)
- `.opencode/plugin/intercept_observer_core.ts` — the `locateContent`
  content-locator primitive (dense/non-dense segment split; anchor = longest
  non-dense run, first+last line for multi-line; exact-then-fuzzy within
  candidates; all-dense → bounded whole-file fuzzy under the 256 KiB cap →
  fail-closed).
- `.opencode/plugin/intercept_observer.ts` — the payload journal (append to
  `journal_write.log` / `journal_edit.log` per tool), the edit-hint channel
  (before hook), and the `tool.execute.after` enrichment (hint cached per
  callID, appended to the failed result's `output.output`, consumed once).
- `.opencode/plugin/probes/handover_probe.mjs` — S26 section (20 checks,
  257-276): the locator (257-266), the journal per tool (267-269) + git-ignore
  (270), the hint verdicts (271-274), the after-hook enrichment (275), the DoD
  machine check (276). Self-annotation total 259 → 279.
- `.opencode/plugin/tests/intercept_observer.smoke.mjs` — the R6 smoke checks
  (39 → 48).
- `.opencode/plugin/README.md` — the recovery protocol (doc, not code).
- `.opencode/agent/research/fuzzy-numword/decision-record.md` — §8.1 LANDED
  addendum.

## Note on completion (worker silent death)
worker-14 (`worker_Q3S_170K`, ses_f299d233effezQzd4la8UBVxki) self-compacted
once, resumed, did the major build, then DIED silently (no 2nd COMPACT line,
empty Task result, no commit/handover/DONE). The staged state was on disk
(uncommitted). The planner (this session, post-compaction) verified it from
file evidence and completed it:
- **Smoke** was 39/48 → fixed to **48/48**. Root causes (all CHECK-side, the
  code was correct): (a) journal checks asserted whole-file line counts
  instead of per-scenario deltas (the sandbox journal accumulates across the
  run); (b) the hint checks asserted a total line-count `nL+1` when a dense
  date / numword in `oldString` fires an extra observation line — changed to
  assert the hint-specific LAST line (context `edit oldString`); (c)
  `JSON.parse(...) === {literal-object}` (reference identity, always false in
  JS) → string compare `jPayload(line) === JSON.stringify({...})`.
- **Probe S26** was 8-fail (267-274, 276) → fixed to green. Same three
  patterns ported into the probe, plus the 267 write fixture: its content
  `"line one | two\nline two"` contained the numwords one/two (firing an
  observation line) → changed to the smoke's dense/numword-free
  `"part A | part B\npart C"` (the 276 DoD expected string updated to match).

## Measured verification (re-run this session, not trusted)
- `node .opencode/plugin/probes/handover_probe.mjs` → **PROBE handover:
  279/279 PASS**, exit 0 (baseline 259 + S26's 20).
- `node .opencode/plugin/tests/intercept_observer.smoke.mjs` → **ALL PASS
  (48/48)**, exit 0.
- pytest: **459 passed, 1 warning** (the known #10 coroutine warning).
- ruff `--select F`: **F=0** ("All checks passed!").

## Commit facts
ONE green commit staged by explicit pathspec. The maintainer's live
`.opencode/maintainer/priority.md` (his file, modified in the working tree) is
NOT staged (left exactly as found). The commit hash rides the planner's
follow-up bookkeeping (no self-reference).

## TODO entries
- #95 status → sub-item (1) R6 LANDED + verified (the two directives for
  sub-item (2) are already folded into the entry; (2) is next).
- TODO header numbering corrected (#97 → #98 used; next #99).
- No new `todo_inbox.md` entries this unit.

## Deliberately NOT done (with reason)
- **Live acceptance of the after-hook enrichment** — restart-gated (the
  result-surface mutability is unverified in the installed host bundle); the
  smoke/probe pin the mechanism, live fires after the next host restart.
- **Sub-item (2) the mutating edit-fuzzy** (normalize-then-compare) — the next
  unit; spec written at launch from the #95 entry. R3 / R8 / the escape
  return-info follow per the #95 order.
