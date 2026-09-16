# TASK SPEC — plan9 (iteration 9): RESEARCH lane — fuzzy name resolution + numword tool-call hardening

GOAL (approved research lane, maintainer ideas #5/#6/#7 in
`.opencode/maintainer/inbox_planner/dense_numbers.md` — read it, it is the
source; --wip, READ-ONLY, never edit): RESEARCH ONLY (no production build).
Produce a dated research doc covering:
(a) fuzzy name resolution on file read / section grep,
(b) num_to_word / word_to_num auto-replace as an opencode intercept plugin
(`tool.execute.before`), to make tool calls more reliable despite digit
bitshifts in quantized models.

## Output (definition of done — all in ONE commit)
1. NEW folder `.opencode/agent/research/` with:
   - `README.md` ≤ 20 lines: purpose (research docs only — dated findings on
     ideas worth exploring; NOT instructions, NOT a TODO, NOT the knowledge
     base), what goes here (one dated doc per research topic:
     `YYYY-MM-DD_<topic>.md`), what does NOT (implementation, approved
     proposals → `proposals/`, actionable findings → `knowledge/`).
   - ONE dated research doc `2026-09-16_fuzzy-and-numword-tool-reliability.md`
     (~150–300 lines) with these sections:
     1. Problem framing: the dense-digit trap as MEASURED in this repo
        (cite: TODO #61 NUMWORDS NOTE, the 94/94 counting incident from
        dense_numbers.md, the plan8 `1-2-2` vs `120+2` loop-log INFO line in
        `.opencode/loop/autorun-2026-09-15_13-11/loop_log.md`, the
        106→120+2 label/counter alignment). Keep citations short.
     2. Part A — fuzzy name resolution: feasibility in THIS build (facts
        below are verified — do not re-derive), a reference design of the
        matcher (algorithm options + thresholds), the safe-tool-scope
        analysis (read-only tools first: read/glob/grep; why silently
        rewriting write/edit paths is a data-loss hazard), section-grep-by-name
        vs line-number offset design (anchor conventions + resolver shape),
        ambiguity handling = fail-closed (keep original arg + log the
        candidate, never pick a wrong match silently), perf (cache vs crawl).
     3. Part B — numword: the assumption check (are numberwords really more
        stable? evidence FOR: the digit bitshift incidents above; evidence
        AGAINST: word drift exists too — "fourty"/"eigth" appear in the
        maintainer's own notes; conclusion should be about cross-checking,
        not replacement); the general-function idea from dense_numbers.md
        lines 14–17 (`num(five) -> 5`, `num([five,five]) -> 55`, f-string /
        input-string auto-replace, `<five>` markers): feasibility + recommended
        shape (node + python + bash entry points) + map coverage incl. the
        "fourty" alias; the intercept-plugin combination (word→digit replace
        of tool args, gated on existence — e.g. only replace "file-four.txt"
        when "file-4.txt" exists; commit refs only when `git rev-parse`
        confirms).
     4. Risks & non-recommendations (what must NOT be auto-replaced, where
        the correction log should live).
     5. Recommendations ranked (prompt-rule-only / scriptlet under
        `.opencode/agent/scripts/` / plugin — for the maintainer's direct
        session, NOT a build now) + a concrete live-host verification plan
        (one-shot test of `tool.execute.before` args mutation at the next
        restart, shaped like the #51/#55 pending-acceptance pattern).
2. NOTHING else changes (no code, no plugin, no prompts).

## Verified facts (planner-verified at spec time — do not re-research)
- `tool.execute.before` exists in `@opencode-ai/plugin` (types at
  `.opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts` line ~235):
  input `{tool, sessionID, callID}`, output `{args: any}`; hook returns
  `Promise<void>` — the passed `output.args` object is the mutation channel
  (same pattern the ctx_watchdog header documents for `tool.execute.after`:
  "the passed output object is the ONLY mutation channel").
- `command.execute.before` (shell-command variant, d.ts line ~228) also
  exists. `tool.execute.after` (d.ts line ~249) carries `args` in the input.
- Existing in-repo hook usage to study (bounded reads):
  `.opencode/plugin/ctx_watchdog.ts` header (lines ~1–180) — how hooks are
  registered in this repo; `.opencode/plugin/README.md`.
- `@opencode-ai/plugin` types are the authoritative surface:
  `.opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts` (320 lines —
  read the hooks section, lines ~150–280, not the whole file).
- Whether mutated `output.args` actually reaches tool execution CANNOT be
  proven without a host restart (hooks load at plugin registration) — this
  is the live-acceptance gap; the doc must name it (do not try to prove it
  live in this run; design the one-shot verification for the next restart).

## Context discipline (maintainer #6)
- Fresh session; the WHOLE task must finish ≤ ~50 % of your window — budget
  your reads: the files above with the named line ranges, `dense_numbers.md`
  (83 lines, whole is fine), and nothing else at length. First greps carry
  `| head -30`. Do not read the session corpus or DB.
- You may run one-shot experiments in the scratchpad
  (`C:/Users/Wasiejen/AppData/Local/Temp/opencode`) to sanity-check algorithm
  sketches (e.g. a Levenshtein threshold study on real repo paths) — NOTHING
  from the scratchpad gets committed; the repo diff is the two research
  files only.

## DO-NOT-TOUCH
`.opencode/agent/prompts/**`, `.opencode/maintainer/**` (read the one
--wip file named above, never edit), `.opencode/plugin/**` +
`.opencode/tools/**` (production code — read-only references only),
`opencode.jsonc`, `AGENTS.md`, the live opencode host. NO production plugin
file created, NO prompt edited.

## Approval boundary
Research-only: creating the `agent/research/` folder + its README + the one
doc is pre-approved (meta/docs). Anything beyond that (a scriptlet, a
plugin, a prompt rule) is a maintainer call — RECOMMEND it in the doc, do
not build it.

## Procedure (suggestion, not protocol)
1. Read `dense_numbers.md`, then the d.ts hooks section + ctx_watchdog
   header (bounded).
2. Draft the doc section by section; machine-check every citation (grep the
   named line before citing it).
3. Scratchpad experiment for the matcher thresholds if useful.
4. Write README + doc, run the standard gate (it must stay unchanged —
   proof nothing code-touching happened: pytest 459+1w, ruff F=0,
   probe total as in repo_commands.md), commit (code+handover+TODO if any
   discovery) per the commit routine, write `handover_task_to_planner.md`.
