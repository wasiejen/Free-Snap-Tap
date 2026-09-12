# PROPOSAL — Planner prompt addition: task-scope reduction (2026-09-11, planner)

Status: feedback/proposal for maintainer review. Target: a new section in
`.opencode/system_prompts/agents/prompt_agent_planner.md` (suggested name
"## Task-spec discipline"). Written after the iteration-2 re-decomposition
(T1 rename / T2 one data field / T3 one tool / T4 one prompt rule /
T5 one hook), on which the workers ran focused and clean.

## Prompt addition (proposed text)

### Task-spec discipline — reduce scope, not research
- **Decompose before delegating:** one task = one focused change with ONE
  goal and a measurable definition of done. A build spanning several
  layers/files is a LIST of ordered tasks, never one big spec. Each task
  must be completable and verifiable in a comfortable fraction of the
  worker's context.
- **Never mandate broad research in a spec.** If a shape is already
  demonstrated in the repo (maintainer prototype, existing code, a
  committed reference file), the spec says "build on that shape" — never
  "verify the SDK from the npm type defs". A verification step is either
  small + bounded (one named file, one question) or a separate task.
  Extensive re-research of settled facts is what burned the previous
  worker run (5–6 context cycles, zero work done).
- **The spec is a contract, not an essay:** exact scope, exact DoD
  (measurable end states — probe count, grep-clean, byte-exact format),
  and an explicit **DO-NOT-touch** list (including the maintainer's live
  files and anything under `proposals/maintainer/`). Pin the WHAT and the
  end state; the HOW is the worker's call inside the DoD.
- **Spec size is context.** Keep specs short (usually < 100 lines).
  Every spec line competes with the work for the worker's window.
- **Order + green state:** tasks are ordered so each one leaves the repo
  green; each spec is written against the just-verified state (fresh
  line numbers / reference sets / baselines) and is COMMITTED BEFORE the
  launch — a spec is never launched uncommitted.
- **Claims in a spec are the planner's verified facts** (measured at spec
  time), not assignments for the worker to re-derive.

## Feedback — friction points, iteration 2 (2026-09-11)
1. **Launch failure mode is undocumented in the loop protocol:** worker
   launch 1 died at the server (`context_length_exceeded` on a FRESH
   small session — server-side, cause unknown); retry was cancelled.
   The -WARNING line exists, but who retries / when to stop / whether to
   fall back to another worker is not specced anywhere.
2. **Mid-run live edits vs committed protocol:** the token flip
   (`START-->` → `-->START`) existed only uncommitted when I wrote my log
   lines — I had to guess the working tree over the commit. A one-line
   rule "the working tree wins for protocol files until committed" would
   remove the ambiguity.
3. **Path shorthand cost a worker note:** `proposals/…` in a spec reads
   ambiguously vs `.opencode/proposals/…`; use full paths in specs.
4. **One stale spec claim:** my T2 spec listed byte-exact probe checks
   54–63 where only 54/55 were byte-exact — the worker corrected it.
   Specs must state what was actually verified (item in the addition).
5. **My own deviation:** T1 launched before its spec was committed (the
   spec rode the next bookkeeping commit) — the addition's "committed
   before launch" line closes this.
