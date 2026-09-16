# Numeral convention — PRIMER (short usage form for agents)

Full record + reasoning: `decision-record.md` NEXT TO THIS FILE — it is
LARGE (~10k tokens): GREP it by section, do not read it whole.

## When
Passing DENSE numerals — paths with digits, commit/session ids, probe
totals, dates, line numbers — where bit-drift is a risk. Single-digit
numerals (0-9) and single-digit numwords are stable; multi-digit dense
strings drift. In doubt, use a pair.

## Forms (delimiters `[...]`, unit separator `-`)
- dense value: `[8-6-1]` or `[eight-six-one]` (single-digit units)
- redundancy pair: `[left:right]` — left = digits as seen OR adder
  (`800+50+11`); right = ALWAYS numwords. Resolution takes the RIGHT side;
  a left/right mismatch logs and right wins.
- mixed with letters: `b[6:six]c[861:eight-six-one]d` → `b6c861d`

## Where it applies
- YES: tool arguments (paths, git refs), commit messages, prose/TODO.
- NO: code content (string literals, identifiers) — the form is argument-
  space; NO bare words without delimiters (a bare `four` is never a
  candidate); NO file content (a form inside a file is just text).
- bash: QUOTE the form (`git commit -m "[8-6-1]"`) — unquoted `< > |` break
  commands (measured).

## What the observer does
- logs dense/numword/pair args for ALL tools to
  `.opencode/temp/intercept.log`; fail-closed verdicts (`no-candidate`,
  `ambiguous`, `redundancy-mismatch`) are EVIDENCE, not errors — read them,
  re-issue the call corrected, never guess.
- read-scope: fuzzy-resolves mistyped `read` paths (d<=2, gap>=2) and (from
  R1) resolves `[left:right]` in `read` args; write tools are never touched
  (R2 pending).
- pair detection switches to the `[left:right]` form with R1; until then a
  pair arg may simply not be logged — the convention is still the right
  thing to write.

## Do not
Write the form into code; invent new delimiters or separators; add words to
`.opencode/agent/scripts/numword/numwords.json` (one shared map, maintainer
map); treat a log line as a failure of your call.
