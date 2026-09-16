# Worker Summary — plan9 iteration 9 (worker-13, ses_f57bfbc8effeXSe8mY7wuP0Xy7, Qwen3.8-27B-IQ4KT-140K)

## What changed (ONE commit, per spec — research only)
- NEW folder `.opencode/agent/research/` (pre-approved meta/docs):
  - `README.md` (19 lines): purpose = dated research findings on ideas worth
    exploring; NOT instructions, NOT a TODO, NOT the knowledge base; naming
    `YYYY-MM-DD_<topic>.md`; what does NOT go here (implementation, approved
    proposals → `.opencode/proposals/`, verified findings →
    `agent/knowledge/`, handover files → `agent/handover/`).
  - `2026-09-16_fuzzy-and-numword-tool-reliability.md` (the dated research
    doc, all 5 spec sections):
    1. **Problem framing** — the dense-digit trap as measured here: the
       94/94 counting incident (dense_numbers.md 19–21/72), the plan8
       `1-2-2` vs `120+2` perception (loop_log.md 46 INFO line), the
       106→120+2 label/counter alignment (loop_log.md 40, plan7_summary.md
       50–56, TODO #61), the NUMWORDS NOTE (TODO.md 315–17). Two failure
       shapes named: generation drift vs perception drift.
    2. **Part A — fuzzy name resolution** — feasibility on the verified hook
       surface (`tool.execute.before`, index.d.ts 235–241; mutation channel
       ctx_watchdog.ts 170–178; the quoted dense_numbers.md example is a
       DIFFERENT SDK shape — flagged); reference matcher (exact → normalize
       → Levenshtein on FULL relative paths; accept d==0 or d≤2 with gap≥2);
       safe-tool-scope = read-only tools only (write-scope fuzzy = silent
       data-loss hazard); section-grep-by-name vs offset (anchor = short
       unique line prefix, resolver fail-closed); ambiguity = fail-closed
       (keep original arg + log candidates); perf = cache the corpus,
       never crawl per call.
    3. **Part B — numword** — assumption check: word drift exists too
       ("fourty"/"eigth" in the maintainer's own notes) → the value is
       CROSS-CHECKING, not replacement; the general function (dense_numbers.md
       14–17) as one shared map with node/python/bash entry points, the
       `fourty` alias required, explicit grammar (scratchpad run 8/9 —
       failed `twozero`, units+unit pattern → grammar must be specified +
       fixture-tested); intercept combination = word→digit replace GATED on
       existence (path replaced IFF the digit form exists AND the word form
       does not; git refs IFF `git rev-parse --verify` confirms).
    4. **Risks & non-recommendations** — must-NOT auto-replace: write/edit/
       delete paths (except the existence-gated case), command payloads /
       quoted strings (data vs name), versions/floats/timestamps in code,
       assertion numbers, git refs without the rev-parse gate, anything
       where the replacement form already exists as a distinct name; the
       correction log lives in the plugin evidence channel (plugin.log or a
       git-ignored temp sibling), one line per correction, agent-readable.
    5. **Recommendations ranked** — 5.1 prompt-rule-only (floor, zero risk)
       / 5.2 scriptlet under `.opencode/agent/scripts/` (workhorse, no host
       dependency) / 5.3 the intercept plugin (heaviest, maintainer call)
       + the one-shot live-host verification plan shaped like #51/#55:
       sentinel `read` at the next restart, the hook logs the original arg
       and mutates `output.args` to the corrected twin, acceptance = the
       tool result reflects the corrected path (else: mutation channel NOT
       live in this build → 5.3 dead, 5.1/5.2 carry the lane), tear-down
       in the verdict commit.
- Loop record riding the same commit (tracked-folder convention):
  `plan9_ho_task.md` (the spec copy dropped in the loop folder) +
  `loop_log.md` (my START line).
- `todo_inbox.md` +1 (worker-13, 2026-09-16): stale baseline in
  `.opencode/plugin/README.md` line 9 ("84/84 under NODE" vs current 120+2)
  — one-line fix, delegated with any build touching the plugin folder
  (DO-NOT-TOUCH for this lane).

## Measured verification (all green, machine-run this session)
- pytest: `459 passed, 1 warning` (baseline 459+1w unchanged)
- ruff: `All checks passed!` (F=0)
- probe: `PROBE handover: 120+2/120+2 PASS` (total = 120+2 "one hundred
  twenty-two" per repo_commands.md)
- scratchpad experiments (`fuzzy_numword_exp2.cjs` + 9-case word_to_num,
  scratchpad only — NOT committed): Levenshtein on 37 real repo paths —
  every single-digit bitshift (d=1..2) resolves to the true path with gap
  to the 2nd candidate 5–13; word_to_num naive grammar 8/9 (failure
  `twozero` → the explicit-grammar finding above).

## Deliberately NOT done (per spec / approval boundary)
- No production code, no plugin, no prompts, no scripts created — the
  scriptlet / plugin / prompt rule are RECOMMENDED in the doc, not built
  (maintainer calls).
- Did not attempt to prove live that a mutated `output.args` reaches tool
  execution (impossible without a host restart) — the doc names the
  live-acceptance gap and designs the one-shot verification for the next
  restart (§5.4).
- Did not touch `.opencode/plugin/**`, `.opencode/tools/**`, prompts,
  maintainer inbox, `opencode.jsonc`, `AGENTS.md` (read-only references
  only; `dense_numbers.md` read, never edited).

Commit: (hash appended by the planner at bookkeeping, or see `git log` —
subject "plan9 research lane: fuzzy + numword tool-reliability doc").
