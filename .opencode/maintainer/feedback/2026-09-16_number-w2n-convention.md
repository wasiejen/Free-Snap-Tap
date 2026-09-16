# Feedback — the number/w2n convention as landed (2026-09-16, plan2)

Reply to your launch message: "give me a feedback in my maintainer/feedback
folder on what the convention for number and w2n has landed. cases for one
number, multiple numbers, numbers with letters mixed in."

Source of truth (all machine-checked at write time): the ONE shared map
`.opencode/agent/scripts/numword/numwords.json` + its two entry points
`numword.cjs` (node CLI/module) and `w2n.py` (python), grammar = research
§3.2 + addendum C4 (dash-separated units, numberwords-only, unknown → loud
error). The intercept observer plugin reads the SAME map (no second copy).

## One number (a single value)

| value | word form | note |
|---|---|---|
| 0–9 | `zero`..`nine` | exact unit words |
| 10 | `ten` | NOT `onezero` / `onezero`-style concatenation |
| 10s (10,20,...) | `twenty`,`thirty`,`forty`,... | `fourty` accepted as ALIAS → 40 |
| 10–19 (teens) | `eleven`..`nineteen` | EXPLICIT words — `tenone` is not a rule; teens are their own map entries |
| 21–99 | tens+unit composed: `ninetyfour` → 94 | unique split point only; an AMBIGUOUS split is unknown, never a guess |
| 101 etc. | see "multiple numbers" (one-prefix) | `one` prefix + dashes |

Rule of the grammar: composition is tried as a tens-prefix + unit-suffix
split; exactly one valid split → value, zero → unknown, >1 → ambiguous
(never a best-guess).

## Multiple numbers (dense multi-digit values)

- **Canonical dense form = dash-separated single-digit units** (C4 ruling):
  `two-zero` → 20, `one-zero-one` → 101. A separator ALWAYS between dense
  units (the one-prefix rule).
- **Wordlist form = comma list of single words**: `five,five` → 55 (the
  scriptlet's CLI surface; the observer does not parse comma lists).
- **Rejected forms (loud failure, never a best-guess)**:
  - `twozero` — unseparated concatenation → UNKNOWN (the §2.4 8/9 failure
    stays a loud failure; exit 1 on CLI)
  - `two+zero` — no arithmetic in grammar input → UNKNOWN
  - any unknown word → LOUD error (CLI non-zero exit / python
    `ValueError`), and the observer logs `no-candidate` instead of guessing.
- Cross-check (not replacement): `numword_check(digit_str, word_str)` →
  `AGREE 94` (exit 0) / `DISAGREE <digits>` (exit 1) / `UNKNOWN <word>`
  (exit 2) — the §3.1 conclusion: cross-checking, not auto-replacement.

## Numbers with letters mixed in

The grammar is **numberwords-only**: the resolvers accept pure word tokens
(lowercased `[a-z-]+`). A mixed letter+digit token is OUT of grammar — the
convention for those strings is: word the digit part IN PLACE, keep the
letters as-is:

- `Q4` → `Qfour`; `file4` → `filefour`; `IQ4KT` → `IQfourKT`
- the word part (`four`) resolves on its own; the mixed token as a whole is
  NOT resolvable by the tools and the observer logs it as dense/shape
  `no-candidate` evidence (it sees the digits, not a resolution)
- the `|`-pair redundancy form (`4|four`) is the CROSS-CHECK shape the
  observer left/right-checks (verdict `observed-redundancy-ok` /
  `redundancy-mismatch`); as a NAME format (auto-replace-on-write) it is
  still open (addendum open question 2 — write-scope, needs the mutation-
  channel proof) — not part of the landed convention.

## What is NOT in the convention (deliberately)

- No hundreds/thousands grammar (the map holds units/tens/teens only —
  everything denser uses the dash-separated unit form or a comma wordlist).
- No arithmetic, no concatenation without separators, no best-guesses —
  unknown is always loud.
- One shared map: `numwords.json` is read by BOTH entry points and the
  plugin — a change to one word is a change to all three surfaces.
