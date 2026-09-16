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

---
--comment: to be discussed in direct session
--comment: observation: 
single digit numbers are stable. 0-1-2-3-4-5-6-7-8-9, so
- so my observsation also did not see any instability in single digit numwords
- we could also add a fallback to eable <8-6-1> to be tanslated to 861
number words higher than this songle digit do not really add benefit, only complexity in checking, as fall back ok but not as recommendated usage (my optionon)
- writing eleven or one-one. i think one-one is less likely to make problems

to deliniate such numbers to convert via w2n they need to be seperated.
- formalized this could be: all "-" (interseperator) in < > are seperators of numwords
  - `b<six>c<eigth><six><one>d -> b6c861d` without the use of numwords interseperators
  - `b<six>c<eigth-six-one>d -> b6c861d` or shorthand
    - `b6c861d|b-six-c-eigth-six-one-d -> b6c861d` this is harder to parse because beginning and end in a string must, so not valid 
  - this is WITHOUT redundancy
- WITH redudancy it would be
  - `b<6|six>c<861|eight-six-one>d -> b6c861d` the idea is to check left and right and in doubt use right
  - now the next consideration is the natural tendency for deconstruction of the number as adder
    - e.g 861 -> 800+50+11
    - if we now allow on the left side of the check the + operator to enable the agent to actually represent the number in this was, he is technically still correct and does not have to try to write what he actually meant
    - the usage of this format is in itself a strong suggestion that the model struggled with it
    - but we get extra redundancy by enabling the agent to represent the number als technicalle correct as possible
  - `b<4+2|six>c<800+50+11|eight-six-one>d -> b6c861d` 
  - `b<3+3|six>c<800+55+6|eight-six-one>d -> b6c861d` 
    - when both match we can be resonable sure that his IS the intended number

---

## Multiple numbers (dense multi-digit values)

- **Canonical dense form = dash-separated single-digit units** (C4 ruling):
  `two-zero` → 20, `one-zero-one` → 101. A separator ALWAYS between dense
  units (the one-prefix rule).

---

--comment: also no - how would `b6c861d` be represented? `bsixceight-six-oned`? 
  - we can not seperate from the letters without creating doubt if there might really be a "-"
  - so `b-six-c-eight-six-one-d` might be possible but introduces risk
  - `b<six>c<eigth-six-one>d -> b6c861d` is cleaner in my opionion.
  - 
---

- **Wordlist form = comma list of single words**: `five,five` → 55 (the
  scriptlet's CLI surface; the observer does not parse comma lists).
---

--comment: no would not allow it, not destinctive enough to be recognised as intended candidate for replacement
- <five-five> on the other hand is clear.
- <five,five> would also be clear but only if they have outer seperation to other elements on the string

---
- **Rejected forms (loud failure, never a best-guess)**:
  - `twozero` — unseparated concatenation → UNKNOWN (the §2.4 8/9 failure
    stays a loud failure; exit 1 on CLI)
  - `two+zero` — no arithmetic in grammar input → UNKNOWN
  - any unknown word → LOUD error (CLI non-zero exit / python
    `ValueError`), and the observer logs `no-candidate` instead of guessing.
- Cross-check (not replacement): `numword_check(digit_str, word_str)` →
  `AGREE 94` (exit 0) / `DISAGREE <digits>` (exit 1) / `UNKNOWN <word>`
  (exit 2) — the §3.1 conclusion: cross-checking, not auto-replacement.
--comment: agree on rejected forms
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

---

--comment: 
- drop all except one number words. makes this a lot easier.
- candidate for conversions need to be in <numword>
- seperate by - or , and only allowed are numwords zero to nine.
- if redundancy form is defined by the presense of "|" in < > and right side keeps this conventions <left|right>
  - and left side can be 
  - a) written as seen (drifed state)
  - b) a best adder construction of the value the agent wants to write
    - b has the upsite of gaining real double values that can be checked and be pretty certain about
    - b loses the original drifted value for documentation
      - c) we could add <left|middle|right>
        - left or middle: original value
        - middle or left: adder construction
        - right: numword construction
        - so e.g. <860|800+55+6|eigth-six-one>

- comment to b) loses in length when writing but gains in confidense for the model because it can write the closest approximation he naturally does via adder construction. agents normally try to do this to find a way to perceive the number they can not generate in this context - natural continuation of this or usage of this.
- d) we can even offer a shorthand for this <800+55+6> 
  - e) if single digits are stable in numerical form then <8,6,1> or <8-6-1> might be a good shorthand
  
but this leads to the problem of that chars exist in program code. are the < > blocked in the tools we use or the cli and commands? that there might be misrecognitions?

- prefered version is b; fallback a; c,d,e optional but somewhere documented in code to not get lost
- "<", ">" the prefered outer deliminators - if these introduce some ambiquity in some code or tools with recular code or espressions - what about "<>" at stat and front "<>"


example for path checks/sandboxing.
26-09-16_16-52:
worker run in path denial: Read ~\Projects\OpenCodeProjects\OpenCodeProjects\Free-Snap-Tap\Free-Snap-Tap\.opencode\agent\prompts\repo\repo_overview.md 
- doubling of folder path again
