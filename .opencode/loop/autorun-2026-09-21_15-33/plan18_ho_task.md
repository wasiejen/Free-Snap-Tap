# Task spec — #100: remove the numword escape channel (plan18)

Worker: `worker_Q3S_245K_slow` (same model as the planner — the cache rule).
Stay on the current checkout (`opencode_test`).

## Goal
Remove the escape channel from the intercept_observer plugin entirely —
code + journal extension + pins — while the fuzzy track's positive parts
stay fully intact: the pair channel (R1/R2), the shared numword map,
dense/numword observation logging, the R6/R7/R8 channels, and the
Unit-2 noteCache/after-hook note delivery (R8 redirect notes ride it).
The escape's use-case (bit-drift protection) is retired backend-side —
it fulfills no usage right now.

## Scope (planner-verified; TODO #100 is the full record)
1. **Core** (`intercept_observer_core.ts`): remove `ESCAPE_RE`, `EscapeHit`,
   `resolveEscapeSafe`, `resolveEscapes` (around L445-506 — re-grep for
   current positions; bounded grep first: `grep -n "ESCAPE\|EscapeHit\|
   resolveEscape" | head -30`).
2. **Plugin** (`intercept_observer.ts`): remove `runEscapeContent`, its
   `onToolBefore` wiring, the `pre-escape=` journal extension (the
   `escapeForms` param of `appendJournal` + its call sites), and the
   `kind=escape` log lines.
3. **Tests:** remove the escape pins — smoke (≈24 escape grep hits incl.
   13a-13d) and probe (≈45 hits). REPURPOSE one 13-style note-delivery pin
   to the R8 redirect note (the note mechanism stays and must stay
   covered).
4. **Knowledge:** move `.opencode/agent/research/fuzzy-numword/primer.md`
   → `.opencode/agent/knowledge/fuzzy-numword/primer.md`, annotating the
   escape section "removed 2026-09-25"; add the subfolder README (≤20
   lines: purpose, what goes here, what does NOT) in the SAME commit.
   NOT into AGENTS.md (maintainer ruling).

## Definition of done (measurable)
- Grep-clean across the plugin dir + tests: `ESCAPE_RE` / `runEscapeContent`
  / `kind=escape` / `pre-escape=` → zero hits.
- Standard gate green — report the MEASURED numbers in the handover
  (pre-#100 baselines: intercept smoke 67/67, probe 303, pytest 459+1w,
  ruff F=0; the smoke total will DROP by the removed escape pins — the
  new total is yours to report).
- The repurposed note pin covers R8 redirect note delivery and is green.
- Pair/fuzzy pins unchanged and green; `numwords.json` untouched.
- Primer present in `knowledge/fuzzy-numword/` with its README (same commit).
- Checkpoint commits per verified unit (code only); `TODO.md` status →
  LANDED + this handover ride the FINAL commit (code commits' hashes,
  never its own).

## DO-NOT-touch
- The pair channel (R1/R2), the numword map, R6/R7/R8, noteCache/
  after-hook; the auto_resume / compact_memory / context_recovery /
  block_transfer plugins; FST code; `.opencode/maintainer/**`;
  `opencode.jsonc` (registration is the maintainer's domain — register
  nothing).

## Context discipline
- The four named areas above are the whole task — bounded greps first
  (output-limited), section-only reads; do not re-derive the fuzzy track
  history (it is in the primer + knowledge base).
