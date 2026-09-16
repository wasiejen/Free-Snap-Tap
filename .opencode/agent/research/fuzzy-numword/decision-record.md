Session_ID: ses_f54ee6ba8ffeeoFUc1zptUtsb5
Agent: planner (Qwen3.8-27B-IQ4KT-140K), direct session 2026-09-16

# Decision record — fuzzy / numword tool-reliability: convention, pipeline, roadmap

Basis for future work on this topic. Append new dated sections for new rulings;
do not rewrite history.

**Source documents (immutable record, in the parent `../` folder):**
- `2026-09-16_fuzzy-and-numword-tool-reliability.md` (the research doc; §5.4
  verdict section appended 2026-09-16)
- `2026-09-16_fuzzy-numword-addendum.md` (C1-C7 + Q1-Q3 rulings)
- `FB_2026-09-16_number-w2n-convention.md` (his live comments — the direct
  session 2026-09-16 discussed them; ALL comments in that file are acted on
  and recorded here; the `--comment` prefixes stay as his input record, the
  lines are not deleted)
- Landed implementation: `intercept_observer.ts` / `_core.ts` (5.3 log-only
  + read-scope fuzzy, `4719cc5`), scriptlet `numwords.json`/`numword.cjs`/
  `w2n.py` (5.2, S17 pins), probe S17+S18 (baseline 180/180 at this writing).

---

## 1. Verdict (2026-09-16, this session — restart acceptance, TODO #66)

**Mutation channel is LIVE.** At the restart the observer loaded
(`intercept.log` lines appeared); a mistyped read `…/fuzzy_accept/file-4.tx`
was logged `fuzzy orig=…file-4.tx -> file-4.txt d=1 gap=4 | fuzzy-resolved`
and the tool returned the TWIN fixture content. Consequence: the Q3 roadmap
(read scope → write scope) is fully executable; #68 is unblocked pending his
explicit write-scope approval (approval boundary: write-path behavior change).
Sentinel torn down per §5.4 (scratchpad `fuzzy_accept/` deleted this session).
Side finding: the tool result header shows the CORRECTED path, so the mutation
is visible in the agent's own transcript (research §4.3 gap partially
self-heals).

## 2. The conversion rule (what the agent writes) — decisions + reasoning

### 2.1 Single-digit core, dash-separated
- **Rule:** the RECOMMENDED dense form is single-digit units, dash-joined:
  words (`eight-six-one`) or digits (`8-6-1`). A separator ALWAYS between
  units of dense information.
- **Why:** single-digit numerals (0-9) are stable, and single-digit NUMWORDS
  are stable — his observation 2026-09-16, consistent with every measured
  repo incident (94/94, `1-2-2`/`120+2`, 106→120+2 — all multi-digit dense
  strings; no single-digit incident in the record). Multi-digit word forms
  (`eleven`, `ninetyfour`) add check complexity with no measured benefit.
  Dashes also kill the `eight`-vs-`eighteen` ambiguity (dashes delimit, so
  `eight-six-one` is unambiguously 8-6-1). Formalized: every `-` inside the
  delimiters is a unit separator (his rule, FB).
- **Why dash over comma:** dash is the C4 ruling (already pinned in S17
  fixtures, `two-zero`→20 etc.); comma is ALLOWED as an alias separator
  inside the delimiters (his FB 108-142: "seperate by - or ,") but dash is
  the recommended one.

### 2.2 Full grammar stays as ACCEPTED FALLBACK (not recommended)
- **Rule:** the scriptlet/observer still accept teens, tens, tens+unit
  composition (`ninetyfour`→94), the `one`-prefix rule, and the `fourty`
  alias — as inputs, never as recommended output.
- **Why:** his ruling "fallback ok but not as recommended usage" — accepting
  is free (the 26 S17 fixture pins already cover it) and removing accepted
  input would be a behavior restriction that also breaks the pins.
  `fourty` specifically: his own misspelling (FB: "my misspellings ... not
  transferable to agent use") — kept because it is accept-only (never
  mis-resolves: `fourty` can only mean 40), fixture-pinned, and removing one
  word from the map is a three-surface change (map + node + python) for zero
  safety gain.

### 2.3 Candidates only inside the delimiters
- **Rule:** word→digit conversion candidates MUST be delimiter-wrapped. No
  bare-word resolution anywhere in prose, paths, or args. Comma lists
  WITHOUT delimiters are not candidates (his FB: "not distinctive enough").
- **Why:** the bare form has the prose-adjacency class (`ten` inside
  "bitten"/"often") that no word-boundary heuristic fully closes; the
  delimiter makes the candidate's extent unambiguous by construction. This
  also retires the bare `file-four.txt → file-4.txt` shape of research §3.4
  in favor of the marker form.

### 2.4 The delimiters: `[left:right]` — outer square brackets, inner colon
- **Rule:** the redundancy pair is `[<left>:<right>]`; short dense forms are
  `[8-6-1]` / `[eight-six-one]`. Derived forms: one number `[6:six]`; dense
  `[861:eight-six-one]`; adder-left `[800+50+11:eight-six-one]`; mixed with
  letters `b[6:six]c[861:eight-six-one]d` → `b6c861d`; file arg
  `file-[4:four].txt` → `file-4.txt`.
- **Why brackets+colon — measured, not argued** (Git-Bash `eval` test,
  unquoted forms, 2026-09-16):
  - `<4|four>` → **syntax error** (exit 2); `<4:four>` → **syntax error** —
    the `< >` outer is a bash redirection killer regardless of the inner.
  - `[4|four]` → **pipe break** (`four]: command not found`, exit 127) —
    the `|` inner is equally fatal.
  - `[4:four]` → **literal** (exit 0). Only candidate that survives unquoted
    bash. (He delegated the choice: "choose whatever makes it less prone to
    collisions".)
  - **Known edge (reproduced):** `[4:four]` is a glob character-class — if a
    single-character file (named `4`, `f`, `o`, `u`, `r`…) exists in the
    cwd, unquoted expansion yields it. Mitigation: prompt rule "quote the
    form when it passes through a bash command"; the form mainly lives in
    tool args (no shell in between). Ultimate fallback if it ever bites:
    bare `4:four` (zero metacharacters anywhere; loses the outer
    distinctiveness).
  - **Why colon over `=`/`,`/`~`:** the left grammar (digits/`+`/`-`) and
    right grammar (words/`-`) never contain a colon, so the split is
    unambiguous by construction; `=` reads as env-var/option, `,` as list,
    `~` as "approximately". The colon reads as "or, i.e." — which is what
    the pair means.
  - **`<>` rejected** (his fallback suggestion): collides with C++ template
    syntax and SQL's not-equal operator; worse, not better.
  - **Platform fact:** `| < > :` are NTFS-illegal in file names (brackets
    are legal) — so the pair can NEVER exist as a real on-disk name; it is
    argument-space only, resolved before any filesystem touch. This settles
    addendum Q2 scope for free: on-disk names stay canonical digit form.
  - **Markdown note:** `[l:r]` in prose renders literal; only
    `[l:r]: dest` (a link-reference definition) would eat it — cosmetic,
    rare, accepted.

### 2.5 The pair's semantics — left/right roles, right-wins
- **Rule:** left ∈ {digits as-seen (drifted state, form a) | adder
  construction, form b | numword}; right = numword form (always). Resolution
  takes the RIGHT side; on left/right mismatch the canonical (right-derived)
  value is used AND the mismatch is logged (`redundancy-mismatch` evidence).
- **Why right-wins:** the word side is the assumed-stable side (single-digit
  numwords are stable — §2.1); his ruling "check left and right and in doubt
  use right".
- **Why the adder-left (form b) is PREFERRED over as-seen (a):** the adder
  deconstruction (`800+50+11`) is the model's NATURAL escape when it cannot
  generate the dense numeral (observed incident class: `89+1=94`); making it
  a legal, checkable form (1) gives a second independent value to verify
  (digit sum vs word — same drift in both is very unlikely), (2) preserves
  technical correctness so the agent need not stress, (3) its mere USE is an
  incident signal — live mismatch/tuning data without mining sessions (the
  research doc line-339 benefit, realized). Form a (as-seen) is the fallback
  when the agent cannot even build the adder: it documents the drifted value.
  Three-part `<left|middle|right>` (his c) and shorthands (d: `[800+50+1]`,
  e: `[8-6-1]` — already the recommended dense form) are RESERVED: documented
  here so they are not lost, implemented only if needed.
- **Why no `+` in the w2n single-token grammar but `+` legal in pair-left:**
  the C4 "no arithmetic" rule binds the scriptlet's `w2n` surface (a bare
  `two+zero` token would be ambiguous with the unit separator); the pair is
  a separate mini-grammar where `+` is input evidence on a bounded side
  (digits only, `\d+(\+\d+)*`), checked against the right side. No conflict.

### 2.6 The pipeline — two channels, fixed order
- **Rule:** numword/pair resolution runs FIRST (existence-gated), THEN fuzzy
  distance-match on the result (read-scope). Separate evidence channels in
  the log; the mutation is read-scoped (R1). Order is research §3.5.
- **Why:** the fuzzy matcher must see the canonical digit form (a fuzzy pass
  on top of a just-resolved arg must not "help" further); the two channels
  catch different drift shapes (word↔digit vs near-miss path) and their logs
  must stay separable for R4 mining.
- **Scope boundary (blind spot closed):** the form is legal in TOOL ARGS,
  commit text, and prose. It is NEVER resolved inside file content (a form in
  a file you read is just text) and must NOT be typed into code content
  (string literals, identifiers — that's a new confusion class; the observer
  resolves args only, so the rule is one prompt line, not enforcement).
  Multiple forms per argument: resolved independently, one log line each
  (pinned in the probe).

### 2.7 What is deliberately NOT built (yet)
- **No letter-fuzzy for misspelled numwords.** Reasoning: the observed
  "misspellings" (`eigth`, `fourtyfour`) are the maintainer's own, not agent
  drift — not transferable (his ruling). He has never observed an agent
  miswrite a numberword. Unknown word → loud `no-candidate` log line. If the
  log accumulates word-mismatch lines, letter-fuzzy restarts WITH DATA
  (candidate set = the map, same Levenshtein mechanism as path fuzzy) — R5.
- **No `eigth` alias** (same reasoning as §2.2 for `fourty`, minus the
  fixture pin — simply not added).
- **No bare-word or no-delimiter candidates** (§2.3).

### 2.8 Sandbox / path checks
- **Rule:** allowed roots for the out-of-sandbox check = repo root + the
  scratchpad `C:/Users/Wasiejen/AppData/Local/Temp/opencode` (approved
  external dir — the flag on it was pure noise, measured this session: the
  own acceptance test fired `out-of-sandbox` on the scratchpad sentinel).
- **Why:** a warning that fires on every legitimate scratchpad use teaches
  nobody to read the warning. Path sanity (doubled segments — the
  `OpenCodeProjects\OpenCodeProjects` worker incident 2026-09-16 16:52,
  logged as `path-anomaly`) stays log-only per C6. The 3rd measurement of
  this incident class is THIS session's own planner write path (doubled
  `OpenCodeProjects`, machine-detected pre-commit, fixed per P5) — the
  subject matter biting the planner is expected; the log exists for it.

## 3. Fallbacks & contingencies
- **Mutation channel regresses / dies** (host update, loader change): the
  observer degrades to log-only exactly like today (5.1+5.2 carry the lane —
  prompt rule + scriptlet need no hook). The convention rule in AGENTS.md
  stays valid regardless of plugin state: it is a WRITING convention, the
  plugin is its enforcer.
- **Bracket glob edge bites in bash** → the quoting rule already in the
  prompt; ultimate fallback bare `4:four` (§2.4).
- **Log shows word mismatches** → R5 (letter-fuzzy against the map,
  alias additions) — evidence-gated, never speculative.
- **Log shows heavy `fuzzy-rejected`** → threshold (d<=2 / gap>=2) or corpus
  tuning from R4 data.
- **Agents never converge on canonical form** (habit signal, §6.3) → the
  AGENTS.md rule gets reinforced / the pair made cheaper; measured via the
  log, not argued.

## 4. AGENTS.md paste draft (maintainer action)
His ruling: the short rule lives in AGENTS.md (auto-loaded into every
session, survives any compaction) as a direct answer to Loop Pattern 5.
Draft to paste into/after the Pattern 5 block ("do not edit this file
directly — edit a copy; the maintainer replaces it" — so this rides his
paste, like the stop-line change):

```
* **Redundancy form (bit-drift-safe numerals):** when a dense numeral is at
  risk, write the pair `[left:right]` — left = digits as seen OR an adder
  construction (`800+50+11`), right = dash-separated single-digit numwords
  (`eight-six-one`); the resolver takes the RIGHT side on mismatch. Short
  dense form without a pair: `[8-6-1]`. The form is legal in tool args /
  commit text / prose — NEVER inside code content, NEVER bare in prose, and
  quote it when it passes through a bash command (`< >` and `|` are bash
  metacharacters — measured). Full grammar + pipeline + verdict log:
  `.opencode/agent/research/fuzzy-numword/decision-record.md`.
```

## 5. Roadmap R1-R5 (specs in this folder; gates explicit)
- **R1 — read-scope pair resolution + form switch** (`spec_R1_*.md`) —
  **GREEN 2026-09-16, commit 96bb173** (probe 193/193 S19, smoke 31/31,
  pytest 459, ruff clean, export=1): observer resolves `[l:r]` in `read`
  args (existence-gated, right-wins, `pair-resolved` verdict), pair grammar
  switches from the old tight `digit|word` pipe form to `[l:r]` (logging for
  ALL tools switches too), scratchpad allowed-root fix, probe/smoke pins.
  LIVENESS ACCEPTED 2026-09-16 22:13 (post-restart one-shot, scratchpad
  sentinel): pair channel live (`pair=[4:four] canon=4 dist=0 gate=mutated`
  → `pair-resolved`), fuzzy channel live (3x d=1 gap=3), scratchpad
  zero out-of-sandbox noise. **Producer-level finding (measured this
  round):** 3/3 LATER pair-form attempts degraded to bare numerals at the
  planner's OWN generation (`file-[5:four].txt` -> `file-5.txt`); the first
  fresh call carried the form. Fuzzy caught every degradation (d=1) — the
  channels are complementary at producer level. Open question for R4
  log-mining: is the pair form itself a bit-drift target at producer level,
  and does repetition (vs first use) increase the drift?
  **Correction + confirmation (maintainer pointer at log line 153, 2026-09-16
  late):** the `pair=[5:four] ... redundancy-mismatch` line is my
  BOOKKEEPING EDIT (the finding text itself) being pair-logged — NOT a
  surviving test form. Non-read pair logging confirmed LIVE: my own edits
  produced mismatch / ok / no-candidate pair lines with zero tool
  interference. The 3/3 test-read degradation stands, arg-level confirmed
  (log 146-149, field 5 = original arg captured pre-mutation).
  **Attribution rule (lesson, applies to ALL agents):** never attribute
  your own tool args from memory — the post-mutation output (canonical
  path) sits beside the arg in context and contaminates recall; log field 5
  is the only authority. **Grammar interpretation adjudicated (worker note,
  accepted):** pair sides accept a single MAP WORD (units/tens/teens incl.
  `fourty`) OR dash-separated single units — NO tens+unit composition on
  pair sides (`ninetyfour` → `no-candidate`); composition stays the
  scriptlet/observer w2n surface (§2.2 vs the §2.5 pair mini-grammar).
  Pinned S19-187 / S18-160.
- **R2 — write-scope** (`spec_R2_*.md`) — **GREEN 2026-09-16, commit
  35f8143** (probe 206/206 S20, smoke 35/35 incl. 8f controlled write
  audit, pytest 459, ruff clean): form/fuzzy resolution on
  write/edit/block_transfer path args under the strict existence gate;
  fail-closed on pair-mismatch in write scope (no corrupting the wrong
  file "helpfully"); fuzzy d<=1 with `scope=write` evidence; git refs in
  bash args; content args NEVER mutated (the `args[1:one]` guard pin
  landed, S20). **Deviation accepted (worker-measured, planner-approved):**
  the ref gate is `git for-each-ref --format=%(refname:short)` membership,
  NOT `rev-parse --verify` — git parses a pure 40-hex string as an OBJECT
  name, so `rev-parse --verify <40hex>` exits 0 for ANY 40-hex string
  (incl. non-existent) and never consults a 40-hex-named ref; the
  spec's gate was vacuous for exactly the drift case (supersedes §3.4's
  rev-parse formulation). LIVENESS: restart-gated (next host restart →
  one-shot write-scope acceptance).
- **R3 — arg-scope extension** (`spec_R3_*.md`, staged): glob/grep
  path+pattern args, section-anchor resolver (research §2.6), bash command
  args via `command.execute.before` (quoted forms), block_transfer anchors.
  GATE: R2 green + R4 log volume justifying the surface.
- **R4 — log mining** (`spec_R4_*.md`, staged): `summarize_intercept.cjs`
  scriptlet (verdict counts, reject ratios, mismatch lines with context,
  adder-form usage = incident density) under the scripts collection; runs on
  the corpus-refresh cadence. GATE: ≥ ~10 sessions of accumulated log (or on
  demand). This is the flywheel: R4 data drives the R5/R3 gates and
  threshold tuning.
- **R5 — letter-fuzzy / aliases** (no spec — deliberately): only if R4 shows
  word-mismatch lines. Design in reserve: Levenshtein over the map words
  (same mechanism as path fuzzy), aliases added per observed case.
- **R6 — edit-scope hint channel + payload journal** (`spec_R6_*.md`, staged
  — added 2026-09-16 late, see §8): observation-only throughout (journal on
  every write/edit/block_transfer, anchor-first content locator, edit hints
  for not-found + multiple-matches, no mutation, no auto-retry). GATE: R1
  green (does NOT need the R2 write-scope approval). Direct answer to Loop
  Pattern 3 (the failed-edit retry loop), like §4 answers Pattern 5.

## 6. Blind spots closed this session (and their standing status)
1. Scope boundary args-vs-content — closed (§2.6); rides the AGENTS.md paste.
2. Multi-form args — closed (§2.6); probe-pinned in R1.
3. Convergence habit signal — OPEN (watch): after a few sessions, check the
   log for repeated `pair-resolved` on args where a prior correction already
   surfaced the canonical form (agents re-typing the drifted form = the rule
   is not landing).
4. Rule propagation — closed by his AGENTS.md ruling (§4); until the paste
   lands, the role prompts carry a pointer line (R1 scope) and this record
   is the detailed basis.
5. FB file comments — all acted on, recorded here (§2-§5); markers left in
   place as his input record (they are line-prefixes on his text; deleting
   the lines would delete the record). Sweep triage: already handled
   2026-09-16 direct session — do not re-act.

## 7. Open questions
None blocking. Next maintainer decision: the R2 approval (write-scope spec
is staged). R3/R4 gates are data-driven.

## 8. R6 — edit-scope hint channel + payload journal (discussed 2026-09-16
late, direct session; spec staged as `spec_R6_*.md`)
His proposal: intercept `oldString` (and the write payload) — on mismatch,
resolve first, else buffer/dump the payload with a reference for the agent.
Decisions + reasoning from the exchange:
- **Compute is NOT the constraint** (his ruling): tool-call rounds (~2s)
  + context burn are the expensive resources; CPU idles. Consequence: NO
  dense-trigger restriction — the hint channel runs on ALL edit failures.
- **Anchor-first content locator** (his anchor insight, the unifying
  primitive): split the query into dense (numerals/dates/ids) vs non-dense
  (words) segments; anchor = longest non-dense run; find candidate lines by
  anchor; exact-then-fuzzy (d/gap rule) ONLY within candidates; all-dense
  query → bounded whole-file fuzzy → fail-closed. Same principle as
  full-path matching. One primitive, three consumers: (a) R6 edit hints,
  (b) R3 section-anchor resolver, (c) block_transfer section recovery.
- **Payload journal on EVERY write/edit** (his ruling: "one file per tool
  and we have a fallback"): `.opencode/temp/journal_write.log` /
  `journal_edit.log` (date-stamped names = natural cap; git-ignored), one
  line per call: write = full content, edit = filePath+old+new,
  block_transfer = src/dst+anchors. Value: a write is a big GENERATION —
  a failed call or a dead session must not force a full regeneration
  ("rewriting doubles this; dump and copy is cheap").
- **Recovery semantics (pinned): the hook NEVER auto-retries.** The journal
  line + hint line give the agent / rescue session the one-command fallback
  (`cp` payload in place, or block_transfer-PASTE the section by anchor);
  the agent fires it. Fail-closed discipline applied to recovery.
- **Content is never mutated** — hint, never fix (a wrong replacement in
  the right file with plausible surroundings is the hardest corruption to
  notice; the agent's one-call retry with the hint keeps the machine-check
  culture). "Multiple matches" gets the same hint (candidate line numbers —
  kills the "provide more context" loop).
- **Placement correction (mine, superseding the §5 first pass):** R6 is
  observation-only throughout (journal + hints, no mutation, no auto-retry)
  → **gates on R1 green, NOT R2**. R2 (write-scope mutation) unchanged.
  After-hook result-enrichment (hint inside the error text) = spec-time
  type check against the installed host bundle; log-only is the fallback
  (the after-hook result surface is UNVERIFIED as of this writing).
