# Task spec — R6: edit-scope hint channel + payload journal (TODO #95, sub-item 1)

GOAL: build R6 exactly as the staged spec directs — read it FIRST, it is
the contract: `.opencode/agent/research/fuzzy-numword/spec_R6_edit_hint_journal.md`
(the design rationale: `decision-record.md` §8 in the same folder — read
that section only).

VERIFIED FACTS (measured at spec time, 2026-09-25 — do not re-derive):
- HEAD `c82f788`; stay on the current checkout (verify `git branch -v`,
  never trust a branch name from memory).
- The staged spec's gate (R1 green + planner-verified) is CLEARED —
  R1/R2 live.
- Probe total = the probe's self-annotated header total (machine-read,
  never retype; post-#94 state = 259).
- Smoke baselines: intercept_observer 39/39, block_transfer 30/30 +
  53/53, auto_resume 129/129, compact_memory 66/66, context_recovery
  15/15; pytest 459 passed + 1 warning; ruff F=0.
- Loader contract: plugin `grep -c ^export` = 1 (per the staged spec).
- The content-locator principle = the existing path matcher's shape
  (anchor/candidate + d/gap rule, fail-closed) — build on THAT shape,
  do not re-derive the distance math.
- `tool.execute.after` result mutability = UNVERIFIED (staged spec
  fact #2): check the installed host bundle types at build time; if
  the failed result cannot be enriched → the hint is LOG-ONLY (the
  staged spec's fallback — still green) — record WHICH path landed in
  the handover.

CONTEXT DISCIPLINE: the target areas are named in the staged spec's
scope list — the content-locator primitive lands in the core file
(`intercept_observer_core.ts`, next to the existing path matcher), the
journal + hint wiring in `intercept_observer.ts`. First greps bounded
(`| head -30`); locate probe/smoke sections by name (S-section, check
number) — do not read whole probe files.

SCOPE + DoD + approval boundary: per the staged spec (probe pins per
surface, journal line shapes, hint verdicts, the recovery-protocol
doc, the controlled failed-edit machine check). Checkpoint commits per
verified unit; TODO + handover ride the FINAL commit (hashes recorded
in the planner's bookkeeping commit — never self-referenced).

DO-NOT-TOUCH (staged spec + host rules): oldString/newString mutation,
auto-retry, the R2 write-scope surfaces, `ctx_watchdog.ts`, AGENTS.md,
`.opencode/maintainer/`; the temp journal files stay git-ignored.
`.opencode/agent/prompts/**` = edit-deny for workers — if prompt/doc
text seems needed, do NOT circumvent; note the block in the handover
(no-circumvent rule). The recovery-protocol doc (staged scope #4) goes
into the plugin README + the decision record — not into prompt files.

WORKER: worker_Q3S_170K. (The staged spec's `worker_Q4_140K` line is a
stale roster entry — that agent no longer exists in the live
opencode.jsonc.)
