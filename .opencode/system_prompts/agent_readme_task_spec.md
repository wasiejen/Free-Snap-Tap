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
