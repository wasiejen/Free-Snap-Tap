# DRAFT P2 (v2) — near-limit triage, replacing the effort-ceiling design
STATUS 2026-09-18: IMPLEMENTED directly in the role prompts per maintainer direction
(canonical text in `prompt_agent_planner.md` §Context-budget trigger, word-for-word;
worker/explorer point at it). This draft is superseded — keep only as the rationale
record.
Supersedes the v1 draft (`maintainer/draft/prompt_engineer/_inbox/2026-09-18_p2_effort-
scaling.md`, ceiling design) per maintainer feedback 2026-09-18: workers perform well;
the ceiling would unduly constrain them. The observed failure is the inverse — the worker
UNDERestimates remaining effort as the context limit approaches. So the fix is a
near-limit triage rule, not a global budget. No `effort:` spec field (dropped).

## The rule (canonical text — proposed home: AGENTS.md §Context budget; his file)
> Before starting any unit at a readout ≥ 80 %: estimate the tool calls still needed to
> finish the current work. If the estimate exceeds ~10 (starting value — covers gauge
> lag + compaction + final-handover overhead; calibrate via the P6 measurement), stop
> at the last verified checkpoint and fire `compact_memory` instead of starting the unit.
> At ≥ 90 % (emergency tier): same estimate — if more than ~6 calls remain, close and
> compact NOW. Estimates at ≥ 80 % are optimistic by construction (context rot + gauge
> lag): when in doubt, round up and compact.

Three refinements to the proposed "90% + 6 calls" version, each anchored in the existing
prompt text:
1. **Triage fires at the existing 80 % tier, not a new 90 % checkpoint.** The
   80/90/95 tier structure already exists in the worker/planner L3 sections — the rule
   plugs in ("big unit ahead, ≥80% → compact before starting" becomes "estimate remaining
   calls; >10 → compact; else continue"). By the time the readout says 90 %, the true
   context is ≈ 92–95 % (gauge lag ≈ 2 calls / ~5k, maintainer #9) — normal compaction is
   already past; that is the emergency tier.
2. **~10 / ~6 are starting values, labeled as such** (role-prompt guardrail: never
   present as local measurements). The P6 looprun measurement (separate draft) calibrates
   them from real runs.
3. **Pessimism line is the actual anti-underestimation mechanism** — it names the failure
   (optimistic estimates near the limit) explicitly, which a bare threshold does not.

## Where it lands
- Canonical text: AGENTS.md §Context budget (maintainer edit; wording above).
- Worker prompt §Context-budget: the 80 % bullet becomes the triage sentence + pointer
  ("canonical: AGENTS.md §Context budget"). Same for planner §Context-budget trigger.
  Explorer §Context-budget: gets the same pointer — this also fixes the STALE explorer
  section (it still carries the pre-2026-09-15 80/90 scheme without the ruling).
- No changes to the 70 % early-handover rule, the 95 % no-deliberate rule, or the
  dump-before-compact protocol — the triage coexists with them.

## Verification
Next ≥3 worker/planner sessions reaching ≥80 %: check via loop_log + compaction dumps
whether triage fired (compaction BEFORE the 90 % emergency tier) — expected delta:
fewer emergency handovers at 90/95 %, no task abandonment. Calibrate the 10/6 values
from the first measured runs (P6 script).
