# plan9 summary (iteration 9, ses_f57c84fbbffeaLDqNyuJzEw85G, planner Qwen3.8-27B-IQ4KT-140K)

## What closed this iteration
- **Approved research lane LANDED + verified** (RESEARCH ONLY, no build):
  worker-13 (ses_f57bfbc8effeXSe8mY7wuP0Xy7, commit `37b000d`) delivered
  `.opencode/agent/research/` — README (19 lines, layout-rule compliant) +
  `2026-09-16_fuzzy-and-numword-tool-reliability.md` (426 lines, all 5 spec
  sections). Planner verification: scope clean (no code/plugin/prompt
  changes in the commit), citations spot-checked, gates re-run green
  (probe total charcodes [49,50,50] == baseline, pytest 459+1w, ruff F=0).
  Doc length vs spec "~150-300" — substantive, accepted.
- Per the maintainer's instruction the RESEARCH CONTENT is NOT in the NAP —
  the doc is the record. For orientation: the doc ends with ranked
  recommendations (§5.1 prompt-rule floor / §5.2 scriptlet under
  agent/scripts / §5.3 intercept plugin) + §5.4, a one-shot live-host
  verification plan for the `tool.execute.before` mutation-channel gap
  (shaped like #51/#55, runs at the next restart).
- **TODO #64** (stale "84/84" probe baseline in the plugin README, found by
  worker-13 via todo_inbox): handled planner-direct — the number replaced
  by the #58 curate-don't-duplicate pointer (the self-annotated probe header
  total is the source). Inbox curated.
- TODO.md header ID note corrected (max entry was #63, not #59).

## 140K observation (his standing mandate)
TWO concrete dense-digit incidents in this planner session (loop-log INFO
lines): (1) the machine-computed next worker number (10+1) was perceived as
a shifted digit across several outputs — settled only by letter-based
machine output (roman numerals + word spelling): it is `eleven`, hence the
worker ran as worker-13; (2) the probe total was perceived as a 5-char
string with an inserted "zero-plus" — even my TYPED literals were corrupted
(a false "baseline drift" alarm was produced by my own mistyped comparison
string), settled by raw charcodes [49,50,50] from a fresh probe run.
Notable: the corruption hit generation (typed commands), not just perception
— the machine's own output was fine; the inputs I fed it were not. This is
the strongest evidence yet for the research doc's §5.1 prompt-rule floor
and for letter-region (words/roman) as the stable channel.

## Baselines (unchanged, re-verified plan9)
probe one hundred twenty-two (charcodes [49,50,50]) / pytest 459 passed +
1 warning / ruff F=0 / 7 smokes (worker-run, planner-gated).

## Open (all maintainer-blocked — unchanged)
#56 deferred, #53 deferred, #55 live acceptance pending host restart,
fst-rebind-repeat PARKED, #63 smoke-in-gate question, AGENTS.md stopline
paste. **NEW for his direct session** (queued, not autonomously liftable):
the research doc's §5.2/§5.3 approval decision + §5.4 one-shot verification
at the next restart.
