# orientation.md — preliminary orientation: where this repo / agentic workflow is going

Planner-authored distillation (2026-09-25, planner-18) of the maintainer's
goal sketch across the direct sessions — a working orientation, not a
protocol. The NAP owns the CURRENT state; this file owns the DIRECTION.
Explicit maintainer instructions override both.

**North star (the maintainer's own words, 2026-09-26):** "I want you to learn.
Simple as that." Everything below serves that goal — the tools, knowledge,
and prompts exist so the system (and I) keep getting better.

## What this repo is (two products in one tree)
1. **FST** — the snap-tap / rebind / macro tool (the product code; stable,
   gates green, waiting for the new-project phase).
2. **The agentic workflow** — the opencode meta-layer: the loop protocol,
   compaction/flush machinery, custom tools (block_transfer, loop_log,
   submit, ctx_gauge, compact_memory), plugins (intercept_observer,
   auto_resume, context_recovery), prompts, the knowledge base. The
   workflow is currently the more active product.

## Direction (the goal sketch, in planner words)
- **Toolify the bookkeeping.** Every manual fiddle (loop lines, inbox
  entries, friction entries, gauge peeks) gets a dedicated tool or is
  eliminated. Net-zero standing duties: a new standing duty is added only
  when an existing one is retired or automated.
- **A self-maintaining loop.** The counter-triggered maintenance unit
  (every 5th iteration) cures the knowledge inbox, compresses the NAP,
  retires stale TODOs, and keeps baselines current. TODOs must be able
  to shrink as well as grow.
- **block_transfer becomes the file-manipulation workhorse** — versatile
  like edit, robust to oldstring mismatch (v2 approved 2026-09-25:
  unified anchor semantics, line-number refs, buffers, PEEK/MAP,
  description rework). Test doctrine: a PURE-SCRIPT version for worker
  runs + "new-hire" tests — a worker uses the tool from its description
  WITHOUT reading the code; deliberately file-blind tasks find friction
  points by design.
- **The fuzzy-numword track stays observation-first** — pair channel
  (R1/R2), R6/R7 logging, R8 sandbox redirect + return info; the escape
  channel is GONE (bit-drift retired backend-side, #100).
- **Accumulate knowledge instead of re-deriving** — the one-time host map
  (#101), delegated upstream research (explorer + webfetch; cost lands in
  its context), knowledge curation with a retirement target, and — as an
  open area — a real "find anything" search layer over the knowledge base.
- **Evidence first, files over memory** — rebuild from git/DB/logs; the
  gauge is a lower bound; the first readout after compaction is the
  summarizer's gauge; live acceptance for observer-mediated mutations.
- **The new-project phase (later)** — the programmer role (worker prompt +
  quality floor + greenfield design block; draft exists at
  `prompts/agents/prompt_programmer_additions.md`), the quality-handout
  distill becomes mandatory on activation, first commits become the
  conventions, and possibly the FST-vs-opencode split into two
  trackable repos (his research item).

## Standing rules that shape autonomy (the calibration)
- Pushback over accommodation: disagreement stated BEFORE the refinement;
  "your call" is never a substitute for "I disagree".
- Observation triage: an unmarked maintainer remark → NAP only, no action;
  action requires a marker / inbox item / explicit instruction.
- Serial loop, single slot: same-model delegation (the cache rule),
  compaction over re-fill, never a direct request to the inference server.
- The maintainer's live files (opencode.jsonc, `.opencode/maintainer/**`)
  are never edited or staged by agents; registration is his domain.

## Idle / autonomous initiative (per his standing --maintainer block)
When no actionable item remains: write proposals (always allowed), research
(ideas/feedback/maintainer-files/archive → per-research folder when
worthwhile), bookkeeping-reducing tools, prompt improvements, maintenance
passes, and the pure-script / new-hire test ideas above. This file is the
standing orientation for those sessions.
