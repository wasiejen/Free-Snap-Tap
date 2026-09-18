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
  candidate); NO file content (a form inside a file is just text) — except
  the escape, below.
- bash: QUOTE the form (`git commit -m "[8-6-1]"`) — unquoted `< > |` break
  commands (measured).
- escape (content, since 2026-09-18): a dense value you cannot type
  reliably can still be WRITTEN into `write` / `edit` content —
  `[<incident>:<safe-form>:esc]` → the digits derived from field 2 (the
  safe form: dash digits or numwords — the existing grammar), e.g.
  `[316:3-2-0:esc]` → `320`; the sentinel `esc`/`escape` is
  case-insensitive and is the GATE — unmarked / invalid forms in content
  are never touched; the hook replaces the whole form with the digits
  (the sentinel never reaches the file); a sentinel form in a PATH is
  just text (the path channels ignore it).

## What the observer does
- logs dense/numword/pair args for ALL tools to
  `.opencode/temp/intercept.log`; fail-closed verdicts (`no-candidate`,
  `ambiguous`, `redundancy-mismatch`) are EVIDENCE, not errors — read them,
  re-issue the call corrected, never guess.
- read-scope: fuzzy-resolves mistyped `read` paths (d<=2, gap>=2) and
  resolves `[left:right]` in `read` args (R1 LIVE since the 2026-09-16
  restart — pair channel, scratchpad allowed-root); write tools are never
  touched (R2 pending).

## Attribution rule
Never attribute YOUR OWN tool args from memory: the post-mutation output
(canonical path) sits beside the arg in context and contaminates recall
(measured 2026-09-16: a log line from my own bookkeeping edit was mistaken
for a surviving test form). If in doubt what you actually passed: log field
5 (original arg, captured pre-mutation) is the only authority.

## Do not
Write the form into code; invent new delimiters or separators; add words to
`.opencode/agent/scripts/numword/numwords.json` (one shared map, maintainer
map); treat a log line as a failure of your call.
