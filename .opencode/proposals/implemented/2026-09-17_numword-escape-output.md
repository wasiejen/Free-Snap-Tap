# Proposal — numword escape notation: resolve a number in write/edit **content** so the agent writes what it intended

Date: 2026-09-17 · Direct session ses_f510a · Converged with the maintainer (see his
priority.md #0, lines 38-56).

## Problem (evidenced this session)
The agent can reliably emit the **numword / dash-separated single-digit** form, but NOT the
**dense digit string**. In output — files, prose, TODO, NAP, and the write/edit **content** —
a numeral form is "just text" (decision-record §2.6: never resolved), so the agent must emit
the digits itself, and for a dense multi-digit value it cannot do so reliably. There is
currently **no way to write into a file a number the agent cannot directly emit.**

Concrete incident (measured this session, ses_f510a):
- The new probe total is `two-two-zero`. I wrote the **numword correctly** but the **digits I
  emitted were the OLD total** (`two-one-six`) — a drift of **4**, the largest observed, and
  invisible to me. My own verification "passed" because it hardcoded the *same* drifted digits
  in the check (a circular check that never compared against the true value).
- Related crossover: the smoke total `37` (`three-seven`) drifted to `two-three-seven` (=237)
  in the same NAP section — a byproduct of that same confusion.

The numword→number resolution **already works for input** (read/write **path** args — R1/R2,
LIVE). The gap is **content**: the value being written. The escape closes that gap.

## Design
Split into independently-approvable parts. Core idea: extend the EXISTING numword→number
resolution to the write/edit content, **gated by an explicit sentinel** so normal code is
never touched.

### Part 1 — The form (the notation)
```
[ <incident> : <correcting> : <sentinel> ]
```
- **field 1 — incident:** the as-seen / drifted dense value the agent wrote best-effort
  (e.g. `316`). **Log-only, never authoritative.**
- **field 2 — correcting:** the side the agent CAN emit reliably: dash-separated single
  digits (`3-2-0`) **OR** numwords (`three-two-zero`) — the existing safe forms (single-digit
  units, clear `-` separation, decision-record §2.1). **This is the value.**
- **field 3 — sentinel:** the escape instruction ("resolve this in content"). Trailing — so
  the first value is always the incident, then the correcting, last the sentinel.
  **Two options (maintainer to decide; lean `esc`):**
  - `esc` — mnemonic: "it escapes the thinking-loop trap by giving an out."
  - `w2n` — self-documenting if you know the underlying function (numword→number); slightly
    cryptic otherwise.
- **Example:** `[316:3-2-0:esc]` → the file gets `320` (from `3-2-0`), **not** `316`.
  Equivalently `[316:three-two-zero:esc]` → `320`.

### Part 2 — Resolution rule + scope
- The **correcting side (field 2)** resolves to the written digits — the SAME computation a
  normal `[left:right]` replacement already does (safe side → digits). Field 1 is not used
  for the value.
- **Clean replacement:** the escape form is replaced by the resolved digits in the content;
  the sentinel is stripped (it never reaches the file).
- **Scope (tools):** `write`, `edit`, `block_transfer`.
- **Scope (parameters):** `oldString`, `newString`, `content` — the text being written. Kept
  distinct from the **path** parameter (which already resolves on its own via R1/R2).
- **bash: deferred** — the adder construction is often doable in bash itself (`node -e` /
  arithmetic), so a model aware of the drift can compute there. Revisit if a bash incident
  recurs.

### Part 3 — Pipeline order (pre-step)
The escape resolution runs **FIRST** (match-gated), exactly like the path channel, **then** the
existing anchor/fuzzy matching (R3) runs on the result. If the incident drifted, the distance
for the subsequent fuzzy match is smaller → more reliable. This is the same "numword/pair
resolution first, then fuzzy" order as decision-record §2.6, and it pre-applies to
`oldString` the way it already does for paths (R3's section-anchor resolver, still thin).

### Part 4 — Safety gate
In content, **only forms carrying the sentinel** are resolved. An unmarked `[a:b]`, a string
literal, or normal code is **never touched** — no risk of unknowingly rewriting code. Field 2
must be a **valid** safe-form (dash-digits or numwords from the grammar); a code string like
`[foo:bar:esc]` does not match. The clash surface is the exact
`<digits>:<dash-digits|numwords>:<sentinel>` structure — negligible in real code.

### Part 5 — Log
Minimal: record the **original escape string** + the **resolved value** (the same computation a
normal replacement already does). The incident-vs-resolved drift is **derived in R4 mining**,
not pre-computed here. This also seeds the R4 drift-candidate list ("numbers that tend to
drift").

### Part 6 — Documentation
One line in the primer (`research/fuzzy-numword/primer.md`, "Where it applies" + a short
"escape" note) and one line in the AGENTS.md paste draft, per the existing convention.

## Acceptance
- **Probe pins** (`handover_probe.mjs`):
  - a write/edit content containing `[incident:safe:esc]` → content resolved to the
    safe-derived digits; sentinel stripped; evidence line present.
  - an **unmarked** `[a:b]` / code-like content → NOT resolved (no mutation, zero lines).
  - a code string with an **invalid** field 2 (`[foo:bar:esc]`) → NOT resolved.
  - `oldString` carrying the escape form → pre-resolved before the (R3) fuzzy match.
- **Smoke** (`intercept_observer.smoke.mjs`): one content-escape positive + one unmarked
  negative.
- **Full gate green:** probe + smoke + pytest + ruff (re-pin any existing pin whose fixture
  would now match the escape grammar — expected none, since the gate requires the sentinel).

## Deferred / ideas (discussed 2026-09-17, recorded so they are not lost — NOT in v1)
### A. The 4-field adder form
`[ incident : adder : safe-side : sentinel ]` e.g. `[316:300+20:3-2-0:esc]`.
- **Ups:** the adder (`300+20` = 320) is a THIRD independent value — the model's natural
  escape when it cannot generate the dense numeral (decision-record §2.5); the right-most
  value is "always the highest probability of being right," so it adds a second cross-check
  and confirmation data. More clarity for high-stakes numbers (a probe total, a date).
- **Downs:** a fourth field widens the grammar and moves the sentinel away from a clean
  "last = flag" position; parsing gets more involved; the extra redundancy is worth it only
  for the rare high-stakes case, not routine.
- **Decision: DEFER** (maintainer 2026-09-17). Revisit with R4 drift data — if the log shows
  incident-vs-safe mismatches are common, the adder earns its place.

### B. Functional injection (the sentinel as a function declarator)
Generalize field 3 from a fixed escape flag to a **function name**: `[ ... : <fn> ]` where
`<fn>` transforms the form into the output — `esc` = resolve the numword, `date` = inject the
current date, `datetime` = inject the current date-time, etc.
- **Ups:** one uniform mechanism for "write a value I can't emit" **and** "write a
  computed/injected value" (current date, timestamps); it would fold the separate `[date:]`
  idea (priority #0 lines 53-54) into the same grammar.
- **Downs:** it turns a small, well-understood escape into a **function surface** — every new
  `<fn>` is a new behavior to spec, gate, pin, and (worse) a new thing the model must remember
  and apply correctly. It "gets psychologically heavier" (maintainer 2026-09-17): the 3rd
  field stops being a simple flag and becomes a mini-language. Scope-creep risk for a feature
  that mostly needs the plain escape.
- **Decision: DEFER** (maintainer 2026-09-17). The plain `esc` escape ships first; the
  functional generalization is recorded here so it is not lost, and can be revisited if the
  date/timestamp need becomes concrete.

## Status
Awaiting maintainer decision.
- **Open:** sentinel = `esc` vs `w2n` (maintainer to rule; lean `esc`).
- Deferred items A + B are recorded, not approved.

--comment: lets use "esc" 
  - i like the nmenonic of having an escape for the inability to emit/produce a number :-)
  - and catch their variants like "escape", "ESC", "ESCAPE", "Escape" and treat them as same

- should also resolve without a problem in all places that these numwords can be used already. so e.g. in path parameter if an agent uses it their - it should not fail because of the presense of the sentinel

## Planner verdict (2026-09-18, looprun autorun-2026-09-17_23-58, plan2)
- **Shipped (v1 scope; deferred A/B unchanged):** sentinel `esc`/`escape`
  (one regex, `i` flag — case variants); core `resolveEscapes`/
  `resolveEscapeSafe` (pure, reuses the `resolveNumword` grammar — no second
  table); observer `runEscapeContent` pre-step on the `content`/`oldString`/
  `newString` of write/edit/block_transfer (runs FIRST — Part 3 order); the
  `pair-resolved` verdict reused with `kind=escape scope=content` (the nine
  verdicts unchanged — #73 precedent); the path channel unaffected (the
  maintainer ruling pinned in S24).
- Commits: `4e2fd0c` (core + observer + smoke 39/39) + `67ccd73` (S24 section,
  six pins, carried by the planner's emergency checkpoint) + `281b6d9`
  (primer block + decision-record §4 paste-draft line + final handover).
- Deviation (accepted): check 245 redesigned — a real on-disk
  `file-[4:four:esc].txt` fixture is INFEASIBLE on NTFS (after the first
  colon the name parses as an alternate-data-stream name; second colon →
  ENOENT, measured). The sentinel form now rides a NON-EXISTENT path arg;
  the same ruling is pinned (path channels treat it as plain text).
- Gate (planner re-verified, 2026-09-18): probe two-three-five (235/235,
  annotation-agree) + 9/9 smokes + pytest 459 passed + 1 warning + ruff F=0.
- Session incidents: worker-2 sandbox stop (username bit-shift W→A produced
  an out-of-sandbox path) + context_length_exceeded at resume → full dump +
  Gemma cross-compaction + task_id resume; nothing lost. Measured gap for
  the TODO #70 rework: cross-compaction still REQUIRES explicit
  providerID/modelID (no resolvable-model error otherwise).
- Pending (maintainer domain): the AGENTS.md paste (the paste-draft line in
  decision-record §4 — his action).
