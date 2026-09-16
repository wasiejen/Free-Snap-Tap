# Worker summary — R1: read-scope `[left:right]` pair resolution + form switch + sandbox fix
# (worker-13, Qwen3.8-27B-IQ4KT-140K, direct session ses_f54677188ffeVjBr0O8pXp5cXT)

Looprun `autorun-2026-09-16_21-21`, branch `opencode_test`.
TASK COMPLETE — all DoD items met (measured verification below).
One commit, base `aaf6b03` — the commit carrying this file.

## Baseline re-verification (per launch context)
Ran the probe BEFORE any edit: `PROBE handover: 180/180 PASS`; the
self-annotation (probe line 452) machine-summed to 180. Matches the spec's
verified facts — proceeded.

## What changed (the 4 plugin files + the 2 test files)
**`intercept_observer_core.ts` (the pure core):**
- **Form switch (scope 1):** `PAIR_RE` now `[left:right]` — no inner spaces,
  exactly one colon (structural: left grammar + right grammar never contain
  `:`; a second colon or an inner space kills the match). left ∈ digits
  as-seen | adder `\d{1,12}(\+\d{1,12})*` (each addend capped at 12 digits —
  the old form's bound, safe-integer range) | numword form; right = numword
  form ONLY. The old tight `digit|word` pipe form is DEAD — no longer
  detected (pin S18-160 + S19-185).
- **New pure surface:** `PairCheck` (raw/left/right/start/end/leftVal/
  rightVal/verdict/canonical/dist), `resolvePairWord` (single map word —
  units/tens/teens incl. the `fourty` alias — or dash-separated single
  units; NO tens+unit composition, NO arithmetic on the side — that is the
  scriptlet's w2n surface; unknown → null, never a guess), `resolvePairLeft`
  (digits as-seen | adder SUM | numword form), `checkPairs` (every pair, up
  to 3 — the call's line cap; independent resolution; right-wins: the
  canonical is ALWAYS the right-derived value; either side unresolved →
  no-candidate). `observePairs` reworked on `checkPairs` (evidence
  `pair=[l:r] canon=<right-derived> dist=<d>` / `gate=right-unknown|
  left-unknown`). `observeNumword`'s consumed-token logic now uses the pair
  SPANS (no word inside `[l:r]` double-logs as a bare numword).
- **VERDICTS:** `pair-resolved` appended (9th; the original six stay
  byte-identical and in order; `ambiguous` stays vocabulary-stable but is
  unreachable for the new form — no composition on the pair sides).
- **Sandbox fix (scope 3):** `SCRATCHPAD_ROOT =
  "C:/Users/Wasiejen/AppData/Local/Temp/opencode"` (exported constant)
  accepted alongside the workspace root in `observeSandbox` (underRoot
  normalizes case/backslashes, so slash + backslash-mixed-case forms both
  clear).
- **`observeArg`** gained a 4th optional param `skipPairs` (the read channel
  owns the pair line for a read with a string filePath — no double-logging).

**`intercept_observer.ts` (the plugin hook):**
- **Read-scope pair channel (scope 2):** `runPairRead` — for `read` + string
  `filePath`: every pair resolves independently (one log line each); the
  canonical path replaces each RESOLVED pair with its right-derived digits
  (an unresolved pair stays in place → gate fail-closes); EXISTENCE GATE:
  `output.args.filePath` is mutated to the canonical ONLY when the canonical
  path EXISTS and the pair-containing path does NOT (both-exist / none-exist
  → fail-closed, original arg, gate evidence `gate=mutated|both-exist|
  none-exist` in field 6). Mutation → new verdict `pair-resolved`; gate-fail
  → the pair verdict (ok/mismatch) with the gate evidence.
- **Pipeline order (decision-record §2.6):** pair channel runs FIRST (may
  mutate), then the fuzzy matcher sees the (possibly mutated) result — a
  gate-failed read still gets its fuzzy line (pin S19-189). Non-read tools:
  pair logging ONLY (observation channel; args never mutated).
- Hook plumbing: `argStr` still captured BEFORE any mutation (field 5 = the
  original arg); pair lines log with the original arg; header comments
  updated (channel (2a)/(2b) + evidence/verdict shapes).

**Test gates (scope 4+5):**
- `handover_probe.mjs` — S18's pair pins switched to the new form (157–160:
  agree / mismatch right-wins / unknown-right / negatives incl. old-form-dead
  + digit-right; 165/167 fixtures → `[5:four].txt` / `[4:four]`; 171 VERDICTS
  = 9). NEW S19 section, checks 182–194 (13): adder-sum, right-wins
  mismatch, multi-pair (one line each), form negatives (old-form dead / inner
  space / 2-colon), numword-left + unknown-left, `fourty` alias, HOOK read
  gate mutated / fail-closed none-exist (+fuzzy-rejected on the result) /
  fail-closed both-exist / right-wins mutation (dist=1), HOOK non-read
  log-only, SCRATCHPAD_ROOT (constant pin + 3 path forms + control), HOOK
  scratchpad zero-lines. Self-annotation updated: `S19=13 →
  "PROBE handover: 193/193 PASS"` (machine-summed). Choice pinned here: NEW
  S19 (S18 stays the lane-5.3/5.4 pin; S18's pair pins were mandatory
  updates because the old form is dead).
- `intercept_observer.smoke.mjs` — 29 → 31 checks: VERDICTS pin → the nine;
  the old-form fixtures switched to the new form (case 1/2b/5 — the 2b
  cap+priority pin is unchanged: mismatch → path-anomaly → out-of-sandbox);
  NEW (8d) pair round-trip: canonical exists → filePath MUTATED to
  `pr\file-6.txt` + `pair-resolved` (byte-exact `pair=[6:six] canon=6 dist=0
  gate=mutated`) and (8e) gate fail-closed: canonical absent → args
  byte-identical + pair line `gate=none-exist` + fuzzy-rejected (pipeline
  order).

## Measured verification (standard gate per repo_commands.md — all green)
- Probe: `PROBE handover: 193/193 PASS` (NEW self-annotation total 193;
  machine-summed section line = 193; passed on the first run after the edits
  — no pin rework).
- Smoke: `INTERCEPT_OBSERVER_SMOKE: ALL PASS (31/31)`.
- pytest: `459 passed, 1 warning` (unchanged-green). ruff: `All checks
  passed!` (F=0).
- Plugin loader contract: `grep -c "^export" .opencode/plugin/
  intercept_observer.ts` = 1 (default factory only — pinned by S18-171,
  now "VERDICTS = 6 + 2 fuzzy + pair-resolved").
- C7 line shape unchanged (8 fields); new verdicts only.

## Grammar interpretation note (planner awareness)
The spec's pair-side grammar "numword dash form (map words, `fourty` alias,
`-`-separated single units)" was implemented as: a single MAP WORD (any of
units/tens/teens, incl. `fourty`) OR dash-separated single units (all parts
in `map.units`) — deliberately WITHOUT the tens+unit composition
(`ninetyfour` → not a pair-side value → `no-candidate`), which belongs to
the scriptlet's w2n surface (decision-record §2.2's composition acceptance
is the scriptlet/observer w2n surface, not the pair mini-grammar §2.5).
Pinned at S19-187 (`[40:fourty]` ok) and S18-160 (digit-right rejected).
If the ruling was that compositions count on pair sides too, that's a one-
line core change (`resolvePairWord` falling back to the `resolveNumword`
tens+unit split) + pin updates.

## Deliberately NOT done
- **No liveness proof** — RESTART-GATED as before; the live
  `.opencode/temp/intercept.log` was never touched (probe hygiene 43/45 pin
  sandbox isolation). The 5.4 scratchpad sentinel pair
  (`fuzzy_accept/file-four.txt` + `file-4.txt`) is still live for the
  fuzzy one-shot acceptance; the pair channel accepts on the same restart.
- **`TODO.md` untouched** (no curation from a worker role). For planner
  curation: **TODO #69** (redundancy form codification) — its acceptance
  ("his AGENTS.md paste landed + R1 green + pointer lines") is now fully met
  (paste confirmed per launch commit aaf6b03; pointer lines in commit
  3e0406c; R1 green this commit) → close/record candidate. **TODO #68**
  (write-scope fuzzy) gate "R1 green first" is now satisfied — launchable on
  the maintainer's write-scope approval only.
- **Pre-existing dirty files left UNCOMMITTED** (not mine; DO-NOT-TOUCH):
  `.opencode/agent/research/fuzzy-numword/spec_R1_read_scope_pair_resolution.md`
  (wording rephrase, modified before my session), `.opencode/maintainer/
  ideas.md` + `priority.md` (maintainer files). Left for the planner/
  maintainer's bookkeeping.
- `todo_inbox.md` (repo root, NEW file): one entry — `repo_commands.md`
  §Run/test probe-total prose is stale (120 → now 193; the annotation is
  the source and is current). Maintainer-maintained part, flagged only.
- The `--wip` / edit-deny boundaries were honored: no write/edit/delete
  scope (R2), no `ctx_watchdog.ts`, no `numwords.json` change, no maintainer
  files, no research/FB edits, no `prompt_*` edits.
