--comment in future include session_id and agent
- to resume the session if possible or 
- to find the knowledge in the session archive 
  - might then use it to read it in into an same agent to discuss it further

Session_ID: ses_f57c84fbbffeaLDqNyuJzEw85G
Agent: Planner_Q4_140K

# 2026-09-16 — fuzzy name resolution + numword tool-call hardening (RESEARCH)

Research doc for the plan9 approved research lane (maintainer ideas #5/#6/#7,
`.opencode/maintainer/inbox_planner/dense_numbers.md` — the source, --wip).
RESEARCH ONLY: recommends, builds nothing. All plugin/plugin-host facts cited
below were verified at spec time (task spec §Verified facts) or by the
scratchpad experiment in §2.4 / §3.2 — do not re-derive; re-verify at build time.

---

## 1. Problem framing — the dense-digit trap, as measured in this repo

Quantized models bitshift digits: a numeral in a tool argument or a label can
come back one digit off, or a dense digit string can be perceived as a
different expression entirely. Measured incidents in THIS repo:

- **The 94/94 counting incident** (dense_numbers.md 19–21): a worker
  "repeatedly failed to count around the number 94 … everything stuck to it
  89+1 = 94"; dense_numbers.md 72: "all the workers struggled with the old
  94/94 line and had trouble with it".
- **The `1-2-2` vs `120+2` perception** (plan8, loop_log.md 46, 2026-09-16
  INFO line): planner-8 "perceived probe total '1-2-2' as '120+2' across tool
  outputs; string-compare said drift, char-code compare said same value (120+2
  == 1-2-2 == 106+10+6); machine-check before acting on dense-numeric
  mismatches (AGENTS.md P5)". A perception drift the model itself detected
  only by machine-checking.
- **The 106→120+2 label/counter alignment** (TODO #61 + loop_log.md 40): the
  probe baseline moved 106 → 120+2 after +16 checks; worker-9's DONE line
  records "labels 108..123 consecutive (gate-verified positional repair after
  a label rendering artifact)". plan7_summary.md 50–56: the label update "took
  two failed regex passes + a mental-math confusion before machine-checking
  106+16=120+2", and the readout "120+2/120+2 [was] initially parsed as a
  contradiction of the 106" baseline.
- **TODO #61 NUMWORDS NOTE** (TODO.md 315–17, retained after the entry
  closed): "dense X/X numeral pairs are a transcription trap — write them as
  words in prose." The whole #61 entry is written in word-form numerals
  ("one-zero-six", "nine-four", "ninetyfour") — the practice the note demands
  is already in the record.

Two failure shapes are visible in these incidents:
1. **Generation drift** — the model writes 91/95 for 94, `1-2-2` for `120+2`
   (the numeral is wrong at the source).
2. **Perception drift** — the model reads the same numeral differently on
   successive passes (string-compare vs char-code-compare disagreed with
   itself, not with the file).

Any hardening must address BOTH: word-form cross-checks catch perception
drift; existence-gated correction catches generation drift.

---

## 2. Part A — fuzzy name resolution (file read / section grep)

### 2.1 Feasibility in THIS build (verified — do not re-derive)

The interception point exists and is typed: `tool.execute.before` in
`@opencode-ai/plugin` (`index.d.ts` 235–241): input `{tool, sessionID,
callID}`, output `{args: any}`, hook returns `Promise<void>` — **the passed
`output.args` object is the ONLY mutation channel** (no return value is
used; ctx_watchdog.ts 170–178 states the same for its own hooks).
`command.execute.before` (d.ts 228–234) covers the bash variant.

**LIVE-ACCEPTANCE GAP (named, per spec):** whether a mutated `output.args`
actually reaches tool execution CANNOT be proven without a host restart
(hooks load at plugin registration — plugin/README.md: "changes activate at
host restart"). This run does not try to prove it live; §5.4 designs the
one-shot verification for the next restart.

The quoted example in dense_numbers.md (lines 27–59) uses a DIFFERENT hook
shape (`toolCall.name`, `toolCall.arguments`, `return toolCall`) — that is
pseudocode from another SDK surface. In this build the signature is
`(input, output)`, the tool name is `input.tool`, and the mutation is on
`output.args`. Any build must follow the installed types (AGENTS.md pattern:
"grep the .d.ts, don't trust examples" — knowledge_tools.md).

### 2.2 Reference matcher design

Algorithm options, cheapest first:
1. **Exact match** — fast path, zero cost; most calls hit this.
2. **Normalize** — Windows case-insensitivity, `/` vs `\` slash form, trim.
   Cheap; catches the largest share of "real" mismatches before any distance
   math (a case-only miss is not a typo at all).
3. **Levenshtein on the FULL relative path** against a bounded corpus.
   Full-path, not basename: a basename match collides across sibling
   directories; the path prefix carries most of the discriminative weight.
4. (Alternative, rejected for this build) Jaro-Winkler / bigram similarity —
   higher per-query cost, no measured benefit at the observed drift
   distances (single-digit bitshifts are d=1..2).

Threshold (from the §2.4 experiment on 37 real repo paths):
- **Accept when** `d == 0` (after normalization), **or** `d <= 2` **and** the
  gap to the second-closest real path is `>= 2`.
- The measured gap in sparse directories was 5–13 for d=1..2 perturbations —
  far above the accept bar. In dense sibling sets the gap narrows toward 1;
  the gap test is what keeps the matcher honest there.
- `d > 2` or `gap < 2` → **fail-closed** (§2.5).

### 2.3 Safe-tool-scope analysis

**Read-only tools first: `read`, `glob`, `grep`.** A wrong fuzzy match on a
READ costs at most a confusing result the agent notices and re-issues. There
is no write, no state change, no data loss.

**Silently rewriting WRITE/EDIT/DELETE paths is a data-loss hazard:** the
agent believes it is editing `file-a.md` while the tool writes `file-b.md`.
The corruption lands in the file nobody suspected, and the correction is
invisible unless a correction log is read. The asymmetry is total — a read
mistake is self-correcting, a write mistake is not. **Scope rule: fuzzy
resolution for read-only tools ONLY; write/edit/delete tools get EXACT paths
only (no fuzzy at all).** (The numword §3.4 existence-gate softens this for
word→digit, but the fuzzy distance-match must stay read-scoped.)

### 2.4 Experiment (scratchpad, machine-run — nothing committed from it)

Corpus: 37 real relative paths (`.opencode/agent/prompts/repo`,
`agent/handover`, the current loop folder, the maintainer inbox). Queries =
real paths perturbed with single-digit bitshifts, deletions, transpositions,
digit-for-letter, case noise:

- d=1 perturbations (deletion, digit shift, digit-for-letter, trailing
  space, case): top-1 = the real path in every case, gap to top-2 = 5–7.
- d=2 (transposition, double digit change): top-1 correct, gap 6–13.
- The `handover_task.md` / `handover_task_to_planner.md` sibling pair: even
  a perturbed query of the longer sibling resolved to the correct file with
  gap 8 — the path prefix discriminates.
- word_to_num grammar (units 0–9, tens incl. `fourty` alias, tens+unit
  composition, `one`-prefix 101-rule): **8/9 pass**; the single failure is
  `twozero` (a units+unit pattern the naive grammar has no rule for) → the
  grammar needs an explicit, tested spec before it becomes a rule (§3.2).

Read latency: Levenshtein over a 37-file corpus is sub-millisecond per query
in node; a 5k-file corpus stays in the low single-digit milliseconds —
irrelevant next to the model call it decorates.

### 2.5 Ambiguity handling = FAIL-CLOSED

- Keep the ORIGINAL argument (the tool runs with what the model asked for —
  the normal "file not found" / no-match error surfaces, which is HONEST).
- Log the candidate(s): one line, original arg + top-N candidates + their
  distances + the reason it was not applied (d too high / gap too small).
- **Never pick a wrong match silently.** A silent wrong read is worse than an
  error: the agent proceeds on the wrong file's contents and the mistake
  propagates into its reasoning. The correction log is the only channel
  between the matcher and the agent (§4.2 names where it lives).

### 2.6 Section-grep-by-name vs line-number offset

The `read` tool takes line `offset`/`limit` — dense numerals, exactly the
trap. The design alternative: the agent names a **section anchor** (a short
UNIQUE line prefix — the same anchor convention `block_transfer` already
uses for its start/end markers), and a resolver maps anchor → first line
number BEFORE the read executes.

Resolver shape (read-only tool, in the same `tool.execute.before` scope):
1. Extract the anchor argument (a new optional arg, or a `<anchor>` marker —
   the `<five>`-style delimiting convention from dense_numbers.md 73/81).
2. Grep the target file for the anchor line-prefix; count matches.
3. Exactly one match → rewrite `output.args.offset` to that line number
   (and clamp `limit` if the model gave one). Zero matches or ≥2 →
   fail-closed (keep the original args, log the match count + the matching
   lines).
4. The grep is bounded to the named file (no repo crawl) — one file read per
   call, same cost the agent would pay to find the section itself.

Line-number offsets remain the FALLBACK (they always work); the anchor is
the safer PRIMARY form for anything dense-numeric.

### 2.7 Perf: cache vs crawl

- **Cache:** walk the repo once per process start (or a short TTL), store
  relative paths in a plain array; per-call work = string distance over the
  array. The repo here is small (hundreds of files) — the walk is
  milliseconds even cold.
- **Crawl-per-call** rejected: repeated fs walks add latency, and the result
  is identical to the cache for the lifetime of a tool call.
- The cache must be INVALIDATED or TTL-bounded (new files appear during a
  session) — a stale cache that misses a just-written file silently
  fail-closes (safe direction: no match → original arg, not a wrong match).

---

## 3. Part B — numword (word→digit auto-replace as an intercept)

### 3.1 The assumption check — are numberwords really more stable?

The whole idea rests on the assumption (dense_numbers.md 83: "this is all
based on the assumption that numberwords have less bitdrift"). Measured
evidence on both sides:

**FOR (digit bitshift is real and recurring in this repo):** §1 incidents —
94/94 counting failure, `1-2-2`/`120+2` perception, the 106→120+2 label
repair with two failed regex passes.

**AGAINST (word drift exists too — the maintainer's own notes show it):**
- "fourtyfour is as clear as 44 (i presume?)" (dense_numbers.md 71) — the
  note itself flags the spelling.
- "b<six>c<eigth><six><one>d → b6c861d" (dense_numbers.md 81) — "eigth" is
  a misspelling of "eight" in the maintainer's own example.

--comment: these both are my OWN examples given to clarify what i mean, NOT observed. The misspellings are entirely my own and i meant eight and fortyfour. (english is not my native language ;-P)

So numberwords are not drift-FREE; they drift differently (letter
substitution / missing letter instead of digit substitution, e.g. `eigth`,
`fourty`). **Conclusion: the value of numword is CROSS-CHECKING, not
replacement.** Two encodings of the same value (digit + word) let a mismatch
be DETECTED — the maintainer's own rule (dense_numbers.md 75): "if there is
doubt about a number write them both … if there is a mismatch then it is at
least clear that there is one" (his caveat stands: word-priority "is just a
guess — needs to be observed"). A system that silently replaces one form with
the other hides the mismatch; a system that checks both and logs a
disagreement catches the drift.

---

--comment: so yes the conclusion is right but based on false examples that i created as demonstration and did not observe
- the value is redundancy of information see #9 ideas.md

# 9 general recommendation/consensus for file_naming and fuzzy matching is to not use files only seperated by numbers, but by words
- e.g. plan<number>>_ho_task.md is only seperated by one digit and a bitdrift results in a succesful read if file is already there
  - plan_9_nine_ho_task might be better - double informtion redundancy (minimal extra effort and high value)
  - plan_9_ho_task_research_fuzzy - readable and very hard to mismatch, but single digit write fail will lead to a mis reference to another planner
  - plan_9_nine_ho_task_research_fuzzy - safe for fuzzy read path match and write path match (if existing)
  - autoreplce numword->num on writeout  
    - plan_<nine>_nine_ho_task_research_fuzzy -> if bitdrift in words are less this makes this safer
    - plan_<9|nine>_nine_ho_task_research_fuzzy 
      - -> added intended number might further stabilise the use for writing
        - take the first option if both match, else word_to_num the second option
          - or plan_<9|nine>_ho_task_research_fuzzy could be resolved to plan_9_nine_ho_task_research_fuzzy automatically IF both match
            - same information density as plan_<9|nine>_nine_ho_task_research_fuzzy?
- my old naming for inbox items with pure date is such a bad example.
  - date + topic on the other hand is safe for read matching g - topic delivers information to seperate from other file names
    - and also generally safe for write matching when no closer neightbors exist

---

### 3.2 The general function idea (dense_numbers.md 14–17)

`num(five) -> 5`, `num([five,five]) -> 55`, f-string / input-string
auto-replace, `<five>` markers. Feasibility: YES — a small pure function,
no host dependency, trivially testable (fixture pattern per knowledge_tools.md).

Recommended shape — ONE map, three entry points (so the map is defined once
and the entries only format it):
- **node:** the map as a JSON/JS object + a `w2n(word)` function; shell use
  via `node -e` one-liner or a committed scriptlet under
  `.opencode/agent/scripts/` (reuse, not throwaway — scripts/ INVENTORY).
- **python:** a `w2n()` function importable into f-strings
  (`f"section {w2n('five')}"`).
- **bash:** a `w2n()` shell function delegating to the node one-liner
  (Git-Bash on this host; do not maintain a third copy of the map in awk).

--comment: what is awk?

Map coverage (required before it is a rule):
- units `zero..nine`; tens `ten..ninety` **including the `fourty` alias**
  (both spellings map to 40 — the observed drift must be a legal input, not
  an error); teens `eleven..nineteen` as explicit entries (composition
  `ten+one` does NOT yield eleven — the grammar must say so);
- tens+unit composition: `ninetyfour -> 94` (split-point search);
- the `one`-prefix rule for 101-style ("one-zero-one" — the #61 word-form);
- the §2.4 failure list shows WHY the grammar must be explicit: the naive
  version passed 8/9 and failed exactly on the units+unit pattern
  (`twozero`) — an untested grammar is an untested rule.

--- 

--comment: (`twozero`) -> (`two-zero`) or (`two+zero`): general recommendation is seperation of units of dense information, so a seperator should always be there
- but "+" could be interpreted as a deconstruction. i have not observed a case where the the deconstructed number into multiple adder. 50+5 = 54 (normally the sum is the wrong part), the models are aware of what number they mean, but can not write it (just an observation)
  - but to be safe only allow number words, no additions or subtractions

---
`<five>` markers: the delimiting convention (dense_numbers.md 73/81) makes
the replace target unambiguous — a bare word `four` inside prose ("for"
adjacency is harmless, but `ten` inside "bitten"/"often" is not) cannot be
safely global-replaced; the marker (or a strict word-boundary + existence
gate) is required for any auto-replace.

### 3.3 What the word→digit replace is FOR

The concrete cases from the notes: `file-four.txt -> file-4.txt`
(dense_numbers.md 42, 80) and commit refs `b<six>c<eigth><six><one>d ->
b6c861d` (line 81). Both are NAME-space corrections (a tool argument points
at something that exists under the digit form). That is what makes them
safe — see the gate.

### 3.4 The intercept-plugin combination — GATED on existence

`tool.execute.before` (input `{tool, sessionID, callID}`, output `{args}`):
for each allowed tool, scan the string arguments for numberword tokens (bare
word OR `<word>` marker) and replace word→digit **only when the replacement
is confirmed to exist**:

- **File paths:** replace `file-four.txt` → `file-4.txt` **IFF** `file-4.txt`
  exists AND `file-four.txt` does NOT. If both exist → no replace (the word
  form is a real name, not a drift). If neither exists → no replace (nothing
  to point at; let the normal error surface).
- **Commit refs / git hashes:** replace the word form → digit form **IFF**
  `git rev-parse --verify <candidate>` confirms the ref exists. No gate, no
  replace.
- **Numbers in command payloads / prose:** NO replace (§4).

This existence-gate is the safety core: the replace is only ever
"pointing at the thing that exists under the other form", never a guess.
Fail-closed everywhere the gate is inconclusive. Best-effort: the hook never
throws into the delegation (established pattern, ctx_watchdog.ts 13–14).

---

--commit: so only when there is not other neighbor with the same variation depth (no idea if this is the right term for this - definitely not i quess)
- does is also handle `file-5.txt` → `file-4.txt`, if there is no other file with the structure → `file-<number>.txt` in the path? 
  - perturbations would be d=1 if i remember the upper part correctly. but if there is a file e.g. `file-6.txt` (with same bitdrift distance and same pertubation count)
    - so 2 neighbors with the same number of pertubations and same bitshift distance
      - (i normally only see bitshift by one - my example in the file dense_numbers.md 89+1 = 94 was grapped from though of many attemps to resolve the this by trying a lot of different deconstructions into adders - drift is normally one and this example could be an attempt to lose the sticking 94)
      - (might be worth a scan of the session for attempts of <num>+<num>=<num> via grep or similar tools to see if their are more examples of this)
        - and normally in the same areas the attemps in different ways to resolve it. e.g. using words and we could scan how this fares but grepping the windows into files. let the gemma4 model then run over it (it has higher kv quant resolution and should not be as effected by this or at least if, then on other numbers :-) )
        - then we have a base if a bitdrift of 1 is the representive for it
        - so a file neighbor file with name `file-7.txt` could be excluded because the bitdrift it to high, maybe to be safe difference needs to be >2 or >3 to remove potential neightbors
        - (but might make this too compliated right now)
        
- writing option <4|four> or simply 4|four might be worth it to get redundancy and more information about the intended file
  - so `file-4|four.txt` → `file-4.txt`
- how to handle multi digits?
  - `file-fourfour.txt` misses the seperation and it is unclear if `file-4four.txt` `file-44.txt` or `file-four4.txt` is meant.
  - using "|" as reduancy marker might make this easier
    - `file-44|four-four.txt` or `file-44<>four-four.txt` or other variant (whichever is better for automatic replacement in repo over every file later)
      - the reduncy marker makes it clear that their is a replacement to be done and it let us use seperated numwords on the right and gives us extra information even if the four-four is also drifting
    - **ADDED BENEFIT: we could log discrepencies of left and right side and thus track potential mismatches!!!!**
      - we could check/control these files later
      - we could rename them to reduce confusion for later agents
      - we could tune the matching mappings of words to numbers, because we get live mismatch data without needing to search for them in sessions
      - we could observe how often this happens and thus i have some measurements when i try to influence this via agent settings, model settings or system prompt instruction
    - maybe here additions would be able to provide more redundancy
      - e.g.`file-39+5|four-four.txt` if 44 can not be thought or written about
        - discrepency is as clear as before, but now we have real redundency and can be quite sure what was meant, because to have the same bitdrift in adder notation AND numword is very very unlikely (when adder notation used both must be the same?). your take on it? 
        - the agents try it anyway and to codify adder deconstruction might be a natural way out -> clear action without being technically incorrect and thus do not need to stress about it
  - idea needs to be refined i guess
    - outer signaling `b<six>c<eigth><six><one>d -> b6c861d` would be better in such cases?
      - `b6c861d|b-six-c-eigth-six-one-d -> b6c861d`
        - might still work - maybe with outr brackets for a cleaning delimination to other text parts?
          - `<b6c861d|b-six-c-eigth-six-one-d> -> b6c861d` 
            - yeah i like this idea. your take on it?
            - but this prohibits adder construction as fallback?
              - maybe we need the rule to not include non num chars?
                - `b<6|six>c<861|eight-six-one>d -> b6c861d` 
                - `b<4+2|six>c<800+50+11|eight-six-one>d -> b6c861d` 
                  - this could work
                  - my intuition would be to restrict numword to single digit nums (zero to nine) but might not be optimal for token usage? 
                  - 

---

### 3.5 Interaction with Part A

In the same hook, per argument: (1) numword word→digit (existence-gated),
THEN (2) fuzzy distance-match (read-scope only, threshold §2.2, fail-closed).
Order matters: the exact-word fix runs first so the fuzzy matcher sees the
canonical digit form; a fuzzy match on top of a just-replaced arg must still
respect the gap rule (the replace may itself be wrong — the gate made it
safe, but the matcher must not "help" further on a write-scoped tool, which
it won't per §2.3).

---

## 4. Risks & non-recommendations

### 4.1 What must NOT be auto-replaced

- **Write/edit/delete path arguments** — no fuzzy; word→digit only under the
  §3.4 existence gate (both-forms-absent or both-forms-present → never
  touch).
- **Command payloads / quoted strings** where the word is DATA not a NAME
  (`bash "echo four"`) — the gate cannot know intent; content replacement
  changes observable behavior (approval boundary: needs a maintainer call,
  not pre-approved).
- **Version numbers, floats, timestamps inside code or config** —
  word→digit there is ambiguous (`four.point`? `ninetyfour` as a year?).
- **Numbers inside assertions / test expectations / gate baselines** —
  replacing there silently changes what is being verified (the whole
  machine-check culture in §1 becomes unevaluable).
- **Git refs without the `rev-parse` gate** — a wrong hash is a wrong
  commit; the gate is mandatory, not optional.
- **Anything whose replacement form ALREADY EXISTS as a distinct real name**
  (both forms present → the word form is intentional).

---

--comment: see above comment about redundency markers and delimination to other string content - might solve this and expand its scope on write, but general yes - be conservative if unsure
- my earlier comment aim to add redundency and this fuzzy match might not be as needed or at least not as often
  - yes this needs also to be logged when a closest neightbor was selected or when the tool call failed to resolve to a neightbor


simple path checks could also be done to catch common error i observed like wrong base path 
- e.g. c:\users\users\wasiejen with a doubled users part
- sandboxing can be done here also, to prevent access outside of sandbox and thus prevent loop stopping access request in opencode
  - should only have sandboxing in one place i think to now doublecheck and have a stale check prevent read and write :-)


---


### 4.2 Where the correction log lives

- Append-only, machine-written, agent-readable: a line per correction in
  the plugin's own evidence log channel (the `.opencode/plugin.log`
  convention the watchdog already owns) OR a sibling append-only file under
  `.opencode/temp/` (git-ignored) if the correction volume would pollute
  plugin.log. NEVER inside repo files, never in TODO.md.
- Line shape (one line): `<tool> | original-arg | corrected-arg |
  gate-evidence (exists-check / rev-parse output) | timestamp`.
- The log must be reachable by the AGENT (it is the only feedback the
  correction gets — a silent correction is an untrustworthy correction).
- The FAIL-CLOSED candidates from Part A log to the same channel (one
  channel for all matcher activity — see, audit, trust-or-reject in one
  place).

---

--comment this would not prove that the correction where necessary, thus only an incident indicator and not an indicator for a realy problem (agent could be over cautious to prevent rejection of tool calls if they might type something wrong)
- definitely another log file and not plugin.log
  - for me add session_id, model_id and maybe close snippet of string with the pre replacement to have some context where it happened. e.g. in session_id, in git commit id, in dateformat

---

### 4.3 Other risks

- **Hook fires on EVERY tool call** — the work per call must stay sub-
  millisecond (exact-match fast path first; the fs-existence checks only on
  the rare word-token hit; the corpus cache from §2.7).
- **The correction changes what the model sees** — the tool runs with the
  corrected arg, but the model's transcript shows what it asked for. The
  log line bridges the gap; without it, a later "why did read return
  file-4.txt's content when I asked for file-four.txt" is undiagnosable.
- **The mutation channel is unproven in this build** (§2.1 gap) — everything
  above is contingent on the §5.4 one-shot test passing at the next restart.
  If it fails, the whole plugin recommendation falls back to §5.1–5.2
  (prompt rule + scriptlet), which need no hook at all.

---

## 5. Recommendations, ranked + live-host verification plan

Ranked for the maintainer's DIRECT session — NONE of these is built now
(approval boundary: research only).

### 5.1 (cheapest, zero-risk baseline) Prompt-rule-only
Keep/strengthen the existing AGENTS.md P5-style rule (machine-check dense-
numeric comparisons; never compare/type dense digit strings by eye) + the
"write both number and numberword in doubt" rule (dense_numbers.md 75–76).
The plan8 INFO line already codifies the machine-check reflex. Cost: a line
in a prompt. Catches perception drift; does nothing for generation drift at
tool-call time. **Recommended: yes — the floor under everything else.**

### 5.2 (medium, no host dependency) Scriptlet under `.opencode/agent/scripts/`
One committed pair (node `numword.cjs` + python `w2n.py` sharing one map
source) implementing the TESTED grammar: units, tens + `fourty` alias, teens
as explicit entries, tens+unit composition, `one`-prefix rule — plus a
cross-check helper `numword_check(digit_str, word_str)` that returns
agreement / disagreement (the §3.1 conclusion: cross-checking, not
replacement). Fixture-tested in the established probe pattern; usable from
shell one-liners, f-strings, and the agent's machine-check habit (§1's "let
the machine do the math"). No hook, no restart, no mutation channel — works
today. **Recommended: yes — the workhorse if the plugin stays unapproved.**

### 5.3 (heaviest, maintainer call) The intercept plugin
A `tool.execute.before` plugin combining Part A (read-scoped fuzzy path /
section-anchor resolution, threshold + gap rule, fail-closed with
candidate-log) and Part B (existence-gated word→digit for paths and
git-refs only). Requires the §5.4 live-acceptance first. Heaviest because:
restart-gated, mutation-channel-unproven, and every correction is a
behavior change that must be auditable (§4.2). **Recommended: only after
5.4 passes AND the maintainer approves the scope (read-only fuzzy +
gated-word fix).**

### 5.4 One-shot live-host verification plan (next restart, #51/#55-shaped)

The #51/#55 pending-acceptance pattern: the change lands committed; the
acceptance check runs ONCE at the maintainer's next restart; the evidence
is read from the log. Shaped for this gap (does a mutated `output.args`
reach tool execution?):

1. **Landed (this research lane's follow-up, if approved):** a minimal
   dev-scope plugin (or a guarded hunk in the watchdog, per maintainer
   preference) with a `tool.execute.before` hook gated to ONE sentinel:
   when `input.tool === "read"` AND `output.args.filePath` equals a named
   scratchpad fixture path, the hook (a) appends a log line to
   `.opencode/plugin.log` carrying the ORIGINAL `filePath` verbatim, and
   (b) mutates `output.args` to the fixture's CORRECTED twin (e.g.
   `file-four.txt` → `file-4.txt`, both fixtures pre-created in the
   scratchpad so the read succeeds either way).
2. **Run (at the next restart, one session, one call):** the worker issues
   exactly that one `read` of the sentinel path. Nothing else changes.
3. **Acceptance (machine-checked from the log + the tool result):**
   - plugin.log carries the sentinel line with the original arg;
   - the tool RESULT is the corrected fixture's content (the read landed
     at the corrected path) → **mutation channel LIVE**;
   - if the result is the original fixture's content (or the original path
     errors) → **mutation channel NOT live in this build** — recorded as a
     finding, recommendation 5.3 is dead-on-arrival, 5.1/5.2 carry the
     lane.
4. **Tear-down:** the sentinel hook is removed (or its gate emptied) in the
   same follow-up commit that records the verdict — the verification is
   one-shot by design; no permanent mutation machinery stays armed.
5. **Verdict lands** as a one-line TODO/knowledge entry + the research doc
   gains a dated verdict section (the doc stays the record).

---

## Appendix — sources (all machine-checked at write time)

- dense_numbers.md 14–17 (general function), 19–21 (94/94), 27–59 (quoted
  interceptor example — different SDK shape, see §2.1), 70–83 (word-form
  rules, fourty/eigth, assumption line 83).
- TODO.md 304–317 (#61 entry, word-form numerals, NUMWORDS NOTE 315–17),
  TODO.md 103–122 (#51 close pattern).
- loop_log.md 40 (worker-9 DONE line, 106 baseline vs 120+2), 46 (plan8 INFO
  line, the `1-2-2`/`120+2` perception).
- plan7_summary.md 50–56 (two failed regex passes; the "contradiction"
  parse of 120+2 vs 106).
- index.d.ts 235–241 (`tool.execute.before`), 228–234
  (`command.execute.before`), 249–258 (`tool.execute.after` — `args` in the
  input, evidence the args surface exists both ways).
- ctx_watchdog.ts 13–14 (best-effort, never-throw), 170–178 (mutation-
  channel statement).
- plugin/README.md (restart-gated activation; probe gate must stay green).
- repo_commands.md 46–50 (standard gate definition; probe total
  "one hundred twenty-two").
- Scratchpad experiment `fuzzy_numword_exp2.cjs` + the 9-case word_to_num
  check (8/9; failure = `twozero` units+unit pattern) — scratchpad only,
  not committed.


--comment really nice work!
- check my comments and check if these would improve the design and if what consequences this would have for the scope
  - create a addendum to the research of what you find (seperate file also in research)

approval:
- generally everything you can do via scripts that improve this are approved to test (write only in temp) and if tested also to use as first test in live work on read actions
  - so 5.1, 5.2 approved, 5.3 as general intercept plugin without correction is also approved as functional test to work for all relevant tools (or all if possible). + logging mechanism
    - functional prototyp for the intercept
     - seperate from watchdog (functional seperation)
     - seperate log file (functional seperation also as reason )

---

## Dated verdict (2026-09-16) — §5.4 one-shot: mutation channel LIVE

Restart acceptance (TODO #66) at the 2026-09-16 restart (direct session
ses_f54ee6ba8): (1) `intercept.log` lines appeared — observer LOADED;
(2) mutation verdict: a mistyped read `…fuzzy_accept/file-4.tx` logged
`fuzzy orig=…file-4.tx -> file-4.txt d=1 gap=4 | fuzzy-resolved` and the
tool returned the TWIN fixture content → **a mutated `output.args` reaches
tool execution**. The §5.3 intercept is fully viable; the Q3 roadmap (read
→ write scope) is executable. The scratchpad sentinel was torn down per
§5.4 step 4. Full record, the convention decisions of the direct session
(`[left:right]` form, right-wins semantics, R1-R5 roadmap), and the staged
specs: `.opencode/agent/research/fuzzy-numword/decision-record.md`.
