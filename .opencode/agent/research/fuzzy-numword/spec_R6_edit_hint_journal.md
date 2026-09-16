# R6 spec (STAGED) — edit-scope hint channel + payload journal

GATE (launch blocked until): R1 green + planner-verified. R6 is
observation-only throughout (journal + hints, NO mutation, NO auto-retry) —
it does NOT need the R2 write-scope approval. Design source:
`decision-record.md` §8 (read it first — the reasoning is there).

## Verified facts (at spec time)
- Baseline probe total per the self-annotation (machine-read, never
  retype); loader contract: plugin `grep -c ^export` = 1.
- `tool.execute.before` mutation channel = LIVE (verdict 2026-09-16).
  `tool.execute.after` result-surface mutability = **UNVERIFIED** — check
  the installed host bundle types at build time; if the failed result
  cannot be enriched, the hint is LOG-ONLY (fallback, still green).
- The content-locator principle is demonstrated by the existing path
  matcher (anchor/candidate + d<=2 gap>=2, fail-closed) — build on that
  shape, do not re-derive distance math.

## Scope
1. **Content locator primitive** (core, shared): dense/non-dense segment
   split of a query string; anchor = longest non-dense run (first+last line
   for multi-line queries); candidate lines by anchor; exact-then-fuzzy
   within candidates (d/gap rule, same thresholds as path matching);
   all-dense query → bounded whole-file fuzzy (file-size cap) → fail-closed
   `no-candidate`.
2. **Payload journal** (plugin layer): EVERY `write`/`edit`/`block_transfer`
   call appends one line: `.opencode/temp/journal_write.log` /
   `journal_edit.log` (one file per tool — his ruling; date-stamped names
   for natural cap; git-ignored). Line: timestamp | session | tool |
   target | payload (write = full content; edit = filePath+old+new;
   block_transfer = src/dst+anchors). Never fails the call (best-effort).
3. **Edit hint channel** (before hook, `edit` only): exact `oldString` in
   file → no work. Absent → locator runs (ALL edit failures — his compute
   ruling, no trigger restriction) → log line with candidate line + d +
   gap + context snippet. Multiple exact matches → line with ALL candidate
   line numbers. VERDICTS (new, pinned): `edit-hint` / `edit-ambiguous` /
   (journal lines carry the existing verdict shape). NEVER mutates
   oldString; NEVER auto-retries.
4. **Recovery protocol (doc, not code):** journal + hint together = the
   one-command fallback (`cp` payload in place; block_transfer-PASTE the
   section by anchor); the agent/rescue session fires it. Documented in the
   plugin README + this record.
5. **Probe pins:** locator (anchor hit / multi-line / all-dense fallback /
   ambiguous / no-candidate), journal line shape per tool, hint (not-found
   with candidate / multiple matches / exact = silent), after-hook
   enrichment verdict (live or log-only — record which).

## DoD
Probe green at the new self-annotation total; smoke green; standard gate
green; a controlled failed edit produces the hint line AND a journal line
whose payload `cp`'d in place reproduces the intended file state (machine-
checked).

## Approval boundary
- PRE-APPROVED: journal + hints (observation-only; his ruling this session).
- DO-NOT-TOUCH: oldString/newString mutation (refused by design — §8),
  auto-retry, R2 write-scope surfaces, `ctx_watchdog.ts`, AGENTS.md,
  `.opencode/maintainer/`, temp journal files must stay git-ignored.

## Worker
`worker_Q4_140K`.
