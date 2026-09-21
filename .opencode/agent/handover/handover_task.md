# Task Spec — opencode-auto-resume Phase 2, Deep-Dive C: generally-useful mechanisms
Run date 2026-09-21. Worker: **worker_Q3S_160K** (maintainer choice: Q3S = best
overall for deep code analysis; see knowledge_tools.md model-sizing entry).
Source (READ-ONLY, static analysis, NEVER executed — no bun/npm/node in the
plugin repo): `C:/Users/Wasiejen/AppData/Local/Temp/opencode/opencode-auto-resume-master`.
Before touching the plugin, read FIRST (reference material, not re-research):
- The verified map `.opencode/agent/knowledge/opencode-plugins/auto-resume-map.md`
- The Deep-Dive A and B recipes in the same folder — shared machinery
  (timer architecture, send path / watchdog chain, ESC boundary, arm/tick
  handoff) is REFERENCED by pointer only; never re-derived.
SCOPE — six items against src/index.ts exact ranges (IF a named line ref does
not contain its symbol, TRUST THE SYMBOL via symbol-name grep and record the
discrepancy in recipe section 8 — this worked across all prior runs):
1. THE idle-scan mega-function `checkForToolCallAsText()` (map range
   1372-1692): DECOMPOSE IT per sub-candidate — every internal check/block
   gets its own entry (symbol name + verified range + role + gates + which
   state fields it reads/writes). Sub-candidates per the map: XML/tool-as-text
   candidates, thinking-part tool traps, ready-to-continue, done-claim
   (open-todos vs no-todos), idle open-todos reminder, celebration.
2. The `task_complete` tool: its registration inside the returned hooks
   block (banner region near 2638) + the behavior contract — rejects while
   open todos exist (bounded retries, overrides per its field consumers)
   + the test-file references named in the map's feature row.
3. Celebration mechanics (~969 region): locate by symbol/string anchor
   ("celebrat" or the emoji constant), verify the anti-race behavior pinned
   by its test files (index.continue / index.issue16-regression case names).
4. Done-claim machinery: the DONE_CLAIM_PATTERNS definition region
   (~183-230, locate by symbol) + consumers of budget field
   `doneClaimNoTodosAttempts` (capped at maxRetries across busy cycles per
   the map).
5. Test files, case NAMES ONLY (Phase method, bounded: one per-file grep
   head-limited loop over the C-relevant named files). Regex MUST be
   `(describe|it|test)` — these files use vitest-style `test(` calls with
   zero `it(` (the bare describe|it regex under-collects; lesson from
   Deep-Dive B run notes §8.6).
6. Fit assessment focus: our `.opencode/plugin/compact_memory.ts` +
   ctx_watchdog (read-only); the binding constraint we keep: NO-AWAIT
   fire-and-forget dispatch on the single llama-swap model slot
   (Deep-Dive A §7 + B §7).
DELIVERABLE — ONE canonical output path only (no suffixed variants):
`C:/Users/Wasiejen/AppData/Local/Temp/opencode/auto-resume-deepdive-C.md`.
Sections IN ORDER:
 1. Problem map (one table row per mechanism: trigger conditions +
    detection/action location + key gates).
 2. Idle-scan mega-function decomposition (the sub-candidate entries).
 3. task_complete.
 4. Celebration.
 5. Done-claim.
 6. Recipes per mechanism: reuse/adapt for OUR stack (what is portable as-is
    vs what needs host-side adaptation; the no-await dispatch shape is
    binding), each WITH "tests prove" evidence (case names collected in
    scope item 5).
 7. Fit assessment against our stack (focus compact_memory.ts, read-only).
 8. Unverified / unclear (incl. any spec line-ref discrepancies found,
    same house form as runs A and B).
DEFINITION OF DONE:
- Every src/index.ts line ref verified by bounded direct read or
  line-anchored grep this session; every mismatch recorded in section 8
  (trust-the-symbol rule above).
- All six scope items covered, marked done/not-done explicitly.
- Recipe written via CHUNKED APPENDS: small writes of at most ~35 content
  lines each, then edit-append with a unique marker line — long write
  payloads are flaky on this host (TODO #74); after writing verify:
  `wc -l` + count of section headers matches 8 sections.
- Handover summary to `.opencode/agent/handover/handover_task_to_planner.md`
  (it currently holds Deep-Dive A's committed copy — overwriting it per
  the channel convention is expected; the git copy stays canonical).
- ONE commit staging NAMED paths only (never git add -A): the handover file
  rides along; the recipe file lives in the scratchpad (outside the repo).
- NO TODO.md / todo_inbox.md entries (Phase 3 curates TODO seeds).
DO-NOT-TOUCH / CONTEXT DISCIPLINE:
- The plugin repo is READ-ONLY; never execute anything inside it.
- Nothing under `.opencode/maintainer/**`.
- First greps carry an output limit (`| head -30` style).
- Read only the listed ranges plus symbol-anchored lookups you actually use.
APPROVAL BOUNDARY: documentation-only task deliverables — pre-approved class;
zero behavioral changes anywhere (repo plugins included), no new tests here.
