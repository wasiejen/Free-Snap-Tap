# DRAFT P3 — planner-state-snapshot tool (consolidated init, D16)

## Reasoning
Every planner session pays a 6–8-call init sequence: `git log --oneline -20`, read NAP,
read TODO.md, scan maintainer inbox, read priority.md, scan proposals, marker-sweep grep.
Each call spends prefill + attention from the finite window, each round-trip costs wall
time (serial-slot host — time is the only cost metric, maintainer-verified), and the
sequence is a step-skipping drift risk (an agent under context pressure drops a step —
the inbox scan and marker sweep are the ones that get forgotten). The data is stable,
machine-cheap, and cheap to cap — exactly the consolidation case (guide 3.6/D16: "a
tool that returns 'all' is a context-waster by design"; consolidation "offloads agentic
computation from the agent's context back into the tool calls").

Answer to maintainer comment3: yes — the tool performs the manually-done calls and
returns their combined result as ONE capped digest.

## Design
New host tool `.opencode/tools/state_snapshot.ts` (siblings of block_transfer / ctx_gauge
/ loop_log), registered for the PLANNER role only (worker init is spec + overview —
no init list to consolidate; looprunner has no init reads).

Returns one Markdown digest, hard-capped (~60 lines / ~1.5k tokens), deterministic,
no interpretation — sections:
1. `## git` — `git log --oneline -20`
2. `## nap` — header + current-session section of handover_planner.md (first 40 lines;
   "read the file for the rest" steer if truncated)
3. `## todo` — open-entry count + one line per entry (`#id title`) — capped 15 lines
4. `## maintainer` — pending inbox_planner/ filenames + first line each; priority.md
   first lines
5. `## proposals` — root (pending) filenames only
6. `## markers` — the ready-made marker-sweep output (capped 20 lines)

Response rules per the handout: high-signal fields only, truncation steers ("read
<file> line <n> for the rest" — never a mid-file stop), empty section = "(none)" (the
empty check is part of the job — "no pending maintainer items" is a valid signal).

What it does NOT replace: follow-up deep reads (full TODO entry text, full NAP section,
proposals content) — the digest is the triage layer; the planner still reads what the
digest flags. Trigger discipline in the prompt: "fire state_snapshot at init; act on
sections that need a decision" — the tool never substitutes for the judgment.

## Prompt edits it enables (separate commit each, after the tool lands)
- Planner §Initialization steps 2–4 → one line: "fire `state_snapshot` (consolidated
  init digest); follow up with full reads only where a section needs a decision."
- Looprunner/planner counter-mismatch check reads loop_log — unchanged.

## Verification (D10)
Before/after on real planner launches: init-segment tool-call count (expect 6–8 →
1–2), init-segment tokens (gauge delta over the init span), and step-coverage: inbox +
marker items surface as often as with the manual sequence (the tool includes them —
structural check, plus the first measured looprun). Serial-slot note: one fewer round-
trip per launch = direct wall-time gain per iteration.

## Open
- Tool registration + per-role permission: maintainer call (opencode.jsonc).
- Cap sizes (60/15/40/20) are starting values, not measurements.
