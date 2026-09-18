# Task spec — #0 numword escape: resolve a sentinel-marked number in write/edit CONTENT

Worker: worker_Q4_140K · Iteration: plan2 (looprun autorun-2026-09-17_23-58)
Design source (APPROVED): `.opencode/proposals/approved/2026-09-17_numword-escape-output.md`
— read it FIRST (Part 1-5 bind; Part 6 docs; deferred A/B are NOT in v1).
Maintainer rulings on the proposal (its `--comment` block, bind):
sentinel = `esc`, catch case variants ("escape", "ESC", "ESCAPE", "Escape" … all the
same); and the escape must not break any channel where numwords already work (a
sentinel-carrying form in a path param must not fail path resolution).

Baselines at spec time (2026-09-18, machine-verified): probe two-two-nine (S1–S23, no
S5; annotation line 611 is the source, machine-agree), smokes: all 9 green
(intercept_observer.smoke.mjs 37/37), pytest 459 passed + 1 warning, ruff F=0.

## Goal
An agent that cannot reliably emit a dense digit string can still WRITE one into
file content: `[<incident>:<safe-form>:esc]` in the `content` / `oldString` /
`newString` of `write` / `edit` / `block_transfer` is resolved at the hook — the
whole form is replaced by the digits derived from field 2 (the safe form); the
sentinel never reaches the file. Unmarked / invalid forms are NEVER touched.

## Scope (6 files)
1. `.opencode/plugin/intercept_observer_core.ts` (812 lines) — add ONE pure
   function, e.g. `resolveEscapes(text, map)`:
   - form: `[<incident>:<safe-form>:<sentinel>]`; incident = digits only
     (`[0-9]+`); sentinel = `esc` or `escape`, case-insensitive (one regex —
     `esc` with an optional `ape` tail, `i` flag);
   - safe-form = dash-separated single digits (`3-2-0`) or numwords
     (`three-two-zero`) — reuse the EXISTING grammar/resolver in this file
     (`resolveNumword` / the pair-side numword validator; do not re-derive a
     second grammar);
   - field 2 invalid → that form is NOT a match (left byte-identical);
   - returns the transformed text + a hit list (original form + resolved digits
     per hit) for the log line.
2. `.opencode/plugin/intercept_observer.ts` (715 lines) — wire it:
   - for tools `write` / `edit` / `block_transfer`, run the escape resolution on
     the string args named `content`, `oldString`, `newString` (in practice
     write + edit; block_transfer carries none of these names → natural no-op);
   - a hit MUTATES the arg (sentinel-gated — this is the one content mutation
     legal under the content-scope guard) and logs ONE 8-field line reusing the
     `pair-resolved` verdict with evidence `kind=escape scope=content orig=<form>
     value=<digits> hits=<n>` (the nine-verdict vocabulary stays unchanged —
     the #73 `kind=dedup` precedent);
   - resolution runs BEFORE the existing pair observation on those fields (the
     observation then sees the resolved text — Part 3 pipeline order);
   - path fields are untouched by this channel (R1/R2 semantics unchanged); a
     sentinel form in a path must not change path-channel outcomes (add a probe
     pin proving the path channel ignores the escape form, per the maintainer
     ruling);
   - update the header comment: the content-scope guard (lines ~47-51) gains the
     escape exception; the verdict-vocabulary block (lines ~109-110) notes
     `kind=escape`.
3. `.opencode/plugin/probes/handover_probe.mjs` — new section S24 (append-only;
   checks continue after the last S23 check ID; NOTE the pre-existing S23 inline
   label off-by-one (labels 230-238, run IDs 231-239) — keep your inline labels
   correct, do not fix the pre-existing quirk):
   - (a) write `content` with `[<digits>:<dash-form>:esc]` → content resolved,
     sentinel stripped, `kind=escape` evidence line;
   - (b) edit `oldString` + `newString` with the numword-form variant → both
     resolved;
   - (c) UNMARKED `[a:b]` / plain code content → NOT resolved (zero escape lines);
   - (d) invalid safe-form (`[316:foo-bar:esc]`) → NOT resolved;
   - (e) sentinel-carrying form in a `read`/`write` PATH → path channel
     outcomes unchanged (no escape line for the path);
   - (f) case variants (`ESC` / `Escape` / `escape`) → resolved (one check).
   Header annotation: S24 count + the section-sum total — machine-verify the
   total against the reported total (never retype the number).
4. `.opencode/plugin/tests/intercept_observer.smoke.mjs` (37/37) — +1 content
   escape positive +1 unmarked negative (total 39/39).
5. `.opencode/agent/research/fuzzy-numword/primer.md` — read ONLY the
   "Where it applies" section; add the escape form there (one short block:
   form, example `[316:3-2-0:esc]` → `320`, content scope, case variants).
6. `.opencode/agent/research/fuzzy-numword/decision-record.md` — §4 carries the
   AGENTS.md paste draft (grep for the paste-draft block); APPEND one line to
   that block naming the escape form (his paste action stays his).

## Definition of done
- All six acceptance pins above green in the probe; smoke 39/39; standard gate
  green (probe annotation-agree + all 9 smokes + `pytest -q` 459+1w +
  `ruff check --select F .` 0; commands per `repo_commands.md`).
- `grep -n "esc" intercept_observer_core.ts` shows the resolution is
  map/grammar-driven (no hardcoded numeral tables beyond the existing map use).

## DO-NOT-touch
- `.opencode/agent/prompts/**`, `.opencode/maintainer/**`, AGENTS.md itself
  (the paste draft in decision-record §4 only), `.opencode/tools/**`,
  `compact_memory.ts`, other probe sections / smokes (S24 + the intercept smoke
  only), the FST product code (Python).

## Bookkeeping (AGENTS.md commit routine)
- `TODO.md`: no new entry — #0 is not a TODO ID; note in your handover instead.
  If you find an out-of-scope discrepancy, append it to `todo_inbox.md` (loose,
  unnumbered, dated + role-tagged).
- `.opencode/agent/handover/handover_task_to_planner.md`: executive summary,
  measured gate readouts (verbatim), commit hash, deviations. Final message =
  short pointer only.
- Stay on the current checkout (`git branch -v` first). One code commit +
  bookkeeping commit if it carries its own hash (the #53 Part B precedent).
