# TASK — numword scriptlet (approved research lane 5.2)

Worker: worker_Q4_140K
Goal: ONE numword map + working word→digit / cross-check entry points in
node + python, fixture-pinned in the probe. Approved (maintainer 2026-09-16,
source doc 540–549; design + grammar rules in the addendum).

## Verified facts (planner-verified — do not re-derive)
- Grammar spec + map coverage:
  `.opencode/agent/research/2026-09-16_fuzzy-and-numword-tool-reliability.md`
  §3.2 (map coverage: units zero..nine, tens ten..ninety incl. the `fourty`
  alias→40, teens eleven..nineteen EXPLICIT (ten+one ≠ eleven), tens+unit
  composition (ninetyfour→94), one-prefix rule ("one-zero-one"→101)) and
  `.opencode/agent/research/2026-09-16_fuzzy-numword-addendum.md` C4 (the
  refined grammar, 2026-09-16 maintainer comments):
  - dash-separated units are the canonical dense form: `two-zero`→20,
    `one-zero-six`→106 — a separator ALWAYS between dense units;
  - numberwords ONLY: NO arithmetic in grammar input — `two+zero` is
    REJECTED as unknown (never guess);
  - the unseparated `twozero` pattern is NOT legal → REJECTED as unknown
    (this was the §2.4 8/9 scratchpad failure — it must stay a loud failure);
  - unknown input → loud error (non-zero exit node / exception python),
    never a best-guess;
  - NO speculative aliases beyond `fourty` (the `eigth` example was
    demonstration, not observed drift — addendum C2).
- Scripts home: `.opencode/agent/scripts/` — README + `INVENTORY.md` are
  updated with every new script (existing convention; INVENTORY is the
  index, keep it current).
- Probe: `.opencode/plugin/probes/handover_probe.mjs` — APPEND-ONLY
  discipline (existing sections untouched). Current total = 122 (the header
  annotation is self-annotated, ~line 376, word-form "one hundred
  twenty-two" per the #61 convention — machine-check any total you touch;
  dense-digit trap, AGENTS.md P5). New section labels continue consecutively
  after the last existing label.
- Standard gate (repo_commands.md §Run/test): `pytest -q`,
  `ruff check --select F .`, `node .opencode/plugin/probes/handover_probe.mjs`.
  Baseline at HEAD: pytest 459 passed + 1 known warning, ruff F=0, probe
  total self-annotated and green.

## Definition of done (measurable)
1. ONE shared map source (a JSON file under the new script folder) read by
   BOTH entry points — the map is defined once.
2. **node**: `node <script> <word-or-wordlist>` → digits (CLI one-liner
   friendly: `node -e`-usable from the module too). `numword_check(digit_str,
   word_str)` → machine-readable agreement / disagreement (shell-usable).
3. **python**: `w2n(word)` importable (f-string-usable) with the SAME map +
   grammar behavior; unknown → exception.
4. Passing cases (each fixture-pinned): `nine`→9, `ninetyfour`→94,
   `fourty`→40, `one-zero-one`→101, `two-zero`→20, `one-zero-six`→106,
   `eleven`→11 (explicit, not composed).
   Failing cases (each fixture-pinned as REJECT): `twozero`, `two+zero`,
   `foour`, `eleventy` (unknown words are loud, never guessed).
5. Probe: new appended section pins the above fixtures (spawn the node
   entry point / run python where the host allows; if python spawn is
   flaky in the probe, pin the node side in the probe and pin the python
   side in a committed fixture run recorded in the section header) — ALL
   green; header annotation total updated by MACHINE-CHECK (never retyped).
6. `INVENTORY.md` + scripts README updated (2 new scripts, one line each).
7. Gate: pytest 459+1w unchanged, ruff F=0, probe green at the new total,
   all 7 plugin smokes still green.
8. Handover to `handover_task_to_planner.md` (summary, measured gate,
   commit hash, fixtures pinned, anything deliberately not done).

## DO-NOT-touch
- `.opencode/maintainer/**` (incl. the --wip `dense_numbers.md` inbox item)
- `ctx_watchdog.ts`, `compact_memory.ts`, existing probe sections (append
  only), the research docs (record, not spec input to rewrite),
  `opencode.jsonc`, `fst_work`/any FST product code — this task touches
  ONLY `.opencode/agent/scripts/` + the probe (append) + INVENTORY/README.
- No FST test-suite changes, no new TODO entries (this lane is recorded in
  the research addendum + your handover).

## Suggested shape (procedure is a suggestion)
- Folder `.opencode/agent/scripts/numword/` (or flat in scripts/ — your
  call): `numwords.json` (the shared map), `numword.cjs` (node: w2n +
  numword_check + CLI), `w2n.py` (python: w2n).
- Grammar implementation detail (split points, one-prefix handling) is yours
  inside the DoD; the fixtures above are the contract.
- Keep per-call cost trivial (the map is small; no startup fs cost beyond
  reading the JSON once).
