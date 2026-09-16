# Worker summary — 5.4 intercept observer: export fix (core split) + read-scope
# fuzzy read (worker-13, ses_f55463549ffelXphfcDlDGMhPJ)

Looprun `autorun-2026-09-16_17-20`, iteration 2 (plan2), branch `opencode_test`.
TASK COMPLETE — all DoD items met (measured verification below).

## What changed (one commit, base `e953a1f` — the commit carrying this file)

**Unit 1 — export fix (core split):**
- NEW `.opencode/plugin/intercept_observer_core.ts` — ALL named exports moved
  here (types, constants, regexes, the six observation functions,
  `resolveNumword`, `classifyContext`, `flattenField`, `underRoot`,
  `loadNumwordMap`, `VERDICTS`/`VERDICT_RANK`, `observeArg`). Pure module, no
  default export, never loaded by the host loader directly. The ported
  sections are byte-identical to the original (diff-verified against git HEAD;
  one transcription slip in `DATE_RUN_RE` — `[12]\d` vs `[2]\d` — was caught
  by that diff and fixed before commit).
- REWRITTEN `.opencode/plugin/intercept_observer.ts` — hook plumbing only
  (dir/map/model-cache state, `getModel`, log appenders, `onToolBefore`) +
  `export default (async (input) => {...}) satisfies Plugin;`. Verified
  `grep -c "^export"` = 1; every `Object.values` entry is a function (the host
  loader contract — the "Plugin export is not a function" root cause, pinned
  by probe check 171).
- The shared numword map home (C3) stays in the PLUGIN file (`MAP_PATH`
  resolved next to it — needed only at plugin start); the core stays path-free.

**Unit 2 — read-scope fuzzy resolution (the "read functionality"):**
- In the CORE (pure, pinned): `buildCorpus(root)` (relative paths, dirs +
  files, `.git`/`node_modules` skipped, cap `CORPUS_MAX_ENTRIES` = 20 000,
  missing root → `[]`), `levenshtein`, `normPathForm`, `relForm`,
  `nearestExistingDir`, and `resolveReadPath(argRel, corpus)` →
  `{kind:"exact"}` (byte- or normalized-equal — untouched, no line) /
  `{kind:"resolved", path, d, gap}` iff d<=2 AND gap>=2 / `{kind:"rejected",
  cands: top-3 [rel,d], reason}` (d-too-high / gap-too-small / empty-corpus).
- In the PLUGIN (wiring): scope `input.tool === "read"` with a STRING
  `output.args.filePath` ONLY; exact/normalized-existing → fast-path (no
  fuzzy); `resolved` → MUTATES `output.args.filePath` to the resolved
  absolute path; BOTH outcomes logged (addendum C6) as the two new verdict
  tokens `fuzzy-resolved` / `fuzzy-rejected` (evidence byte-shapes:
  `fuzzy orig=<arg> -> <rel> d=<n> gap=<g|inf>` /
  `fuzzy orig=<arg> cands=<p1 d1,…> reason=<r>`), same C7 8-field line shape.
  Corpus cached per normalized root with `CORPUS_TTL_MS` = 60 s. The
  observation channel (field 5) is captured BEFORE the mutation — it always
  logs the original arg. Write/edit/delete args are NEVER touched.
- `VERDICTS`/`VERDICT_RANK` extended with the two tokens (the existing six
  stay byte-identical; fuzzy ranks 6/7 are documentary — fuzzy lines log
  separately, never capped into the observation lines).

**Test gates extended:**
- `.opencode/plugin/probes/handover_probe.mjs` — S18 grows 21 → 32 (checks
  171–181): export-fix loader contract; `resolveReadPath` exact / normalize /
  d=1 / d=2 (transposition) / gap<2 / d>2 (top-3 cands) / empty-corpus
  fail-safe; `buildCorpus` shape+cap+skip pins; hook-level mutation
  (fuzzy-resolved, byte-exact evidence), fail-closed no-mutation
  (fuzzy-rejected, cands+reason), exact-existing no-line. All pin values were
  machine-measured before being written into the probe (no hand-computed
  distances). Section annotations + EXPECTED OUTPUT updated and machine-checked
  (annotation sum 180 = the `180/180 PASS` line).
- `.opencode/plugin/tests/intercept_observer.smoke.mjs` — 24 → 29 checks:
  loader-contract shape (default ONLY) + core-surface check; `VERDICTS` now
  the eight; the "clean arg" fixture became an EXISTING file (a nonexistent
  read now gets a fuzzy-rejected line by design); the three new read-scope
  flows (mutation / fail-closed / exact) with byte-exact evidence; the
  live-log-unchanged guard stays the final check.
- `.opencode/plugin/README.md` — the intercept_observer line updated (split +
  read-scope mutation contract).

**Live-acceptance fixtures (5.4 one-shot, created and KEPT):**
`C:/Users/Wasiejen/AppData/Local/Temp/opencode/fuzzy_accept/` —
`file-four.txt` (sentinel, content `ORIGINAL`) + `file-4.txt` (twin, content
`TWIN`). The next-restart acceptance reads the sentinel with a d<=2 mistyped
path and checks returned content + the `fuzzy-resolved` log line (mutation
channel LIVE or NOT). Do not delete until that verdict lands.

## Measured verification (standard gate, all green)
- `grep -c "^export" .opencode/plugin/intercept_observer.ts` = 1; every
  `Object.values` entry a function (node import check + probe check 171).
- Probe: `PROBE handover: 180/180 PASS` (self-annotation machine-checked:
  section sum 180; S18=32).
- Smoke: `INTERCEPT_OBSERVER_SMOKE: ALL PASS (29/29)`.
- pytest: `459 passed, 1 warning` (baseline held). ruff: `All checks passed!`
  (F=0). The 7 other smokes: all OK.

## Queue items (for the planner)
- **Fuzzy scope extension (next candidate unit):** glob / grep /
  section-anchors are NOT in this unit (spec: queue them) — only `read` is
  wired; the core matcher is corpus-root-agnostic and ready for them.
- **Maintainer `--wip` file observed:**
  `.opencode/maintainer/feedback/2026-09-16_number-w2n-convention.md` has
  live `--wip` additions (single-digit stability, digit-separator /
  redundancy ideas). Left untouched (DO-NOT-touch + wip guard); if any of it
  becomes a ruling it belongs in a numword-lane task, not 5.4.
- **Loop-folder housekeeping (observation, planner territory):**
  `.opencode/loop/` holds the current `autorun-2026-09-16_17-20` plus an
  un-archived, name-mangled prior folder
  `autorun_2-6_0-9_1-6__1-3_3-3/` (carries plan1/plan2 spec+summary copies).
  Rollover moves the old folder into `.opencode/archive/loop/` — I did not
  touch loop folders.
- **Stale doc numbers (maintainer file, flagged only):**
  `repo_commands.md` §Run/test still quotes probe totals "~376" /
  "one hundred twenty-two (plan7…)" — both from the prior looprun; the current
  self-annotation (the declared source) is 180/180.

## Deliberately NOT done
- No liveness proof (RESTART-GATED by the spec — pin + gate green is the DoD;
  the live `.opencode/temp/intercept.log` was never touched, smoke/probe
  verified it byte-unchanged).
- `TODO.md` untouched (no curation from a worker role); findings went to
  `todo_inbox.md` (stale `repo_commands.md` totals + the loop-folder
  observation).
- The untracked session compaction dump
  (`.opencode/archive/sessions/compaction_dumps/ses_f5…_c0.md`) and the loop
  folders were left for the planner's bookkeeping commit.
