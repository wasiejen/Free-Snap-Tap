# 2026-09-15 — backlog decisions (one ruling file, per his #0 "combine adjacent items")

Status: AWAITING YOUR CALLS — each decision is independent; a short comment
per section (or "all as recommended") closes them. Sources stay at the
locations referenced; I close them on your ruling.

## Decision 1 — #11 contradiction block: keep OFF (A) or re-enable (B)
Source: `2026-09-12_contradiction-block-decision.md` (+ TODO #11, HOLDING).
Your comment there (quoted verbatim below; the line is removed from the
source as acknowledged, per your 09-15 ruling): "still had no time to test it yet if the
current behavior is the intented or not. i changed sometimes the way it works
to test things out - but seemed to work fine."
- **A (RECOMMENDED):** keep OFF as a documented decision — reword the
  "disabled to test" comment to an intentional-decision line (the
  `XXX 241016-1101` marker stays untouched), tests stay the semantic pin,
  #11 closes.
- **B:** re-enable the block — pinning tests flip + re-test pass.

## Decision 2 — loop-signals remaining parts: build Part 2, or retire 1+2+4
Source: `approved/2026-09-12_loop-signals.md` (Part 3 AFK already noted
SUPERSEDED by your 09-15 looprunner rework — afk on/off shipped instead).
- **Part 1** (action words `continue`/`fresh` replacing `restart`/`resume`)
  + **Part 4** (`<|autonom|>` → `<|autorun|>`): NOT implemented; the current
  state machine (restart/resume/ask/stop) plus your rework (context-limit
  procedure, `--loop` status blocks, AFK) already cover the observed pain.
- **Part 2** (counter mismatch: keep the BIGGER iteration number, never
  clobber `plan<N>_*`; `--request:` lines between planner ↔ looprunner):
  NOT implemented; the file-clobber risk is real and unaddressed.
- **RECOMMENDED: build Part 2 only** (small prompt edit: looprunner + planner
  + agent_readme_loop.md), retire Parts 1+4 as superseded. (Prompts are your
  live set — your OK is the gate.)

## Decision 3 — compact_memory findings: Item 2 flag semantics + closure
Source: `2026-09-13_compact_memory-findings.md` (your comment: "this is also
no longer up to date ... i honestly do not understand ## Item 2").
- Item 1 (resume overflow) is SUPERSEDED (the 09-15 protocol; see the file's
  revision). Item 2 asks whether `time_compacting` is expected to persist for
  manual (tool-initiated) compactions — it read NULL after completion.
- **RECOMMENDED: treat the compaction PART in the DB as the durable
  acceptance criterion (already how we operate: part + COMPACT line in
  temp/ctx.log); the flag is NOT required** → the whole file closes with your
  one move (implemented/ or rejected/ — your call, both are "done" for us).

## Decision 4 — action item (no decision needed): paste the AGENTS.md text
Source: `2026-09-15_agents-knowledge-stopline.md` — the exact wording for
your AGENTS.md: (1) the ≈90 % stop line + worker dump protocol replacing the
85 % line in §Context budget; (2) the knowledge-base section (your #5).
Both items are ALREADY LIVE in the role prompts; pasting makes AGENTS.md
agree with them. Then the prompts' "overrides AGENTS.md" notes can be
retired in a later cleanup.
