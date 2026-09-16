Session_ID: ses_f5605f805ffeElHB9mgtksjye1
Agent: planner-1 (Qwen3.8-27B-IQ4KT-140K)

# 2026-09-16 — addendum: maintainer comment review (design + scope impact)

Addendum to `2026-09-16_fuzzy-and-numword-tool-reliability.md` (the source doc,
kept as the record — corrections live here, not by rewriting it). Per the
source doc's closing comment (540–549): check his comments, assess design
improvement + scope consequences, record them here.

**Approval state (source doc 540–549):** 5.1 approved, 5.2 approved, 5.3
approved as a FUNCTIONAL PROTOTYPE — general intercept WITHOUT correction
(log-only observation) for all relevant tools (all if possible) + logging
mechanism; separate from the watchdog; separate log file. Scripts that improve
this: approved to test (write only in temp); if tested, usable as first test in
live work on read actions.

## Per-comment responses

### C1 (doc 1–4) — session_id + agent in future research docs
Already present in the source doc header (6–7). Codified as a folder
convention: one line added to `research/README.md` — every research doc lists
`Session_ID:` + `Agent:` at the top (resume path + session-archive lookup).

### C2 (doc 208/223) — §3.1 "AGAINST" evidence was illustrative, not observed
Accepted: the measured drift evidence in this repo is DIGIT-side only; the
word-drift examples (`eigth`, `fourtyfour`) were his demonstration, not
observations. Consequences:
- §3.1's "measured evidence on both sides" framing is reframed by this
  addendum as: digit drift measured (recurs), word drift demonstrated (the
  letter-substitution risk is real by construction, just not yet observed here).
- The CROSS-CHECK conclusion survives independently: the redundancy rationale
  is the `dense_numbers.md` 75 rule itself ("write both, a mismatch is at
  least visible") + the ideas.md #9 bit-rot context — it does not depend on
  having observed word drift.
- Scope: unchanged for 5.2 — `numword_check` stays a DETECTOR (agreement /
  disagreement), never a silent rewriter.

### C3 (doc 260) — "what is awk?"
awk = the classic Unix text-processing tool (field/column transforms,
shell one-liners). The doc's point was "do not maintain a THIRD copy of the
numword map in yet another tool" — bash delegates to the node one-liner
(`.opencode/agent/scripts/` stays the single map home). No design change.

### C4 (doc 275–278) — separators between dense units; numberwords only
Adopted as the 5.2 grammar rule set:
- Multi-digit values: dash-separated units are the canonical dense form
  (`two-zero` → 20; the `one-zero-six` word-form of #61 is the same rule).
  A separator should ALWAYS be present between units of dense information.
- Numberwords only: NO `+`/`-` arithmetic in the grammar input — `two+zero`
  is rejected (explicit unknown, not a guess), because `+` risks reading as
  deconstruction and no observed case needs it.
- The unseparated `twozero` pattern (the §2.4 8/9 failure) is NOT legal
  grammar input → `w2n` returns unknown (loud error), never a best-guess.
- 5.2 fixture set therefore includes the negative cases: `two-zero` (pass 20),
  `two+zero` (unknown), `twozero` (unknown).
- Related naming insight (doc 226–240): number-only-separation is the
  dangerous name shape (`plan9` vs `plan10` bitshift → successful read of the
  wrong sibling). Redundancy naming (`plan_9_nine_...`) is the durable fix;
  see C5 / open question 1.

### C5 (doc 317–356, the `--commit:` block) — same-depth neighbors + redundancy markers
My take, per his ask:
- **Agree with the redundancy marker.** A `<digit|word>` pair in a name is a
  live mismatch detector: the pair's two halves can be checked and their
  disagreement LOGGED (doc 335: the added benefit) — that is tuning data for
  the map without mining sessions.
- **Prototype scope (conservative, per C6):** the 5.3 functional prototype
  detects and LOGS `|`-redundancy pairs (left/right check) in paths/args; it
  does NOT auto-resolve or rename. Replacement/renaming is write-scope
  behavior → next maintainer decision (open question 2).
- **Multi-digit ambiguity** (`four-four` vs `4four` vs `four4`): the C4
  dash-separated convention makes `four-four` the canonical word form; the
  prototype logs, does not resolve.
- **Adder-deconstruction observation** (`50+5 = 54` — the sum is the wrong
  part; the model knows the number but cannot write it, doc 276): recorded as
  an incident CLASS. His suggested corpus scan (grep session dumps for
  `<num>+<num>=<num>` attempt clusters) is queued as a small temp script
  (approved for temp testing) feeding #56 distillation when the deferral
  lifts — not done now (the deferral binds).

### C6 (doc 395–403) — be conservative if unsure; log both outcomes
Adopted: the prototype NEVER resolves — it observes and logs only. The log
line carries the fail-closed reason (no candidate / ambiguous / gate
inconclusive). His two extras are in scope as LOG-ONLY checks:
- **Simple path sanity** (doubled segments, e.g. `c:\users\users\...`) —
  cheap, high-value, pure observation.
- **Single sandbox check** — the prototype notes out-of-sandbox paths in the
  log; it does not enforce (enforcement stays where it is today; one check,
  no stale duplicates — his point 403).
- His note that redundancy markers reduce the need for fuzzy matching:
  accepted — naming-convention redundancy is the durable layer; the matcher
  (when it ever activates) is the backstop, and stays read-scoped.

### C7 (doc 426–428) — the log is an incident indicator; separate file; richer lines
Accepted: the log proves an incident OCCURRED, not that a correction was
necessary (over-cautious agents produce false-positive lines — the log lets
us measure both sides later).
- **Separate log file** (not plugin.log — his ruling + approval):
  `.opencode/temp/intercept.log` (append-only, git-ignored, the §4.2 temp
  channel), written by the prototype plugin.
- **Line shape (extended per his comment):**
  `<timestamp> | <session_id> | <model_id> | <tool> | <original-arg> |
  <candidates + distances OR gate evidence> | <context: what the arg is —
  path / commit-ref / date / session-id> | <verdict: observed-redundancy-ok |
  redundancy-mismatch | no-candidate | ambiguous | out-of-sandbox |
  path-anomaly>`.

## Scope after the comments — the approved build plan
1. **5.1** prompt-rule baseline — already live (AGENTS.md P5 + knowledge
   machine-check reflex); no new work. Reaffirmed as the floor.
2. **5.2** scriptlet (approved, no host dependency): node `numword.cjs` +
   python `w2n.py` under `.opencode/agent/scripts/`, ONE shared map source,
   the C4 grammar (dash-separated dense units, numberwords-only, unknown →
   loud error, `fourty` alias, teens explicit, one-prefix rule), plus
   `numword_check(digit_str, word_str)` cross-check; fixture-pinned in the
   established probe pattern including the C4 negative cases.
3. **5.3** functional prototype (approved): a SEPARATE plugin file (own
   registration, functionally separate from the watchdog — his ruling), a
   `tool.execute.before` hook that mutates NOTHING (log-only observation),
   active for all relevant tools (read/glob/grep + bash; write/edit tools
   observed too, so the same evidence channel sees them — "all if possible").
   Logged per C7: dense-digit args, numword tokens, `|`-redundancy pairs with
   left/right check, path sanity (doubled segments), out-of-sandbox paths.
   Separate log file (C7). **Restart-gated:** the build lands committed +
   smoke/pinned; live acceptance is ONE restart (the #51/#55 pattern).
4. **Corpus scan** (C5 suggestion) — queued, temp-script, feeds #56 when the
   deferral lifts.

## Open questions for the next direct session
1. **Naming convention:** do loop/plan files adopt redundancy naming
   (`plan_<N>_<Nword>_...`)? Touches the loop protocol + prompts — his call.
2. **`|`-redundancy as first-class name format:** auto-replace-on-write of
   `file-4|four.txt` → `file-4.txt` is write-scope; needs a decision AND the
   §5.4 mutation-channel proof (next restart) before it can even be prototyped
   live.
3. **§5.4 one-shot verdict** (source doc): scheduled for the next host
   restart — if the mutation channel is NOT live, 5.3 stays a log-only
   observer permanently (still useful: the incident data stream), and the
   redundancy-naming route (Q1/Q2) becomes the primary hardening path.
