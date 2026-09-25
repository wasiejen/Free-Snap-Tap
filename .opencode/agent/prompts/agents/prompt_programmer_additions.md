# prompt_programmer_additions.md — programming role additions (DRAFT 2026-09-25, planner-17)

Assembly (when the role is created): the programmer role's prompt = the
current worker prompt text (it lives inline in the live `opencode.jsonc`
— the maintainer's file — copy it at creation time; do NOT maintain a copy
here) + the sections of this file. This file carries only the
programming additions; the task spec keeps carrying the task's contract
(scope, DoD, pins, gate, DO-NOT-touch) — this is a floor, the spec is the
ceiling.

When to use the role: programming tasks that create or reshape code
architecture (new projects, FST product code, multi-module changes) —
not plugin/tool work, where the worker + spec already carry the quality
constraints.

## Quality floor — mandatory (programming)
- Optimize for safe change and readability, not minimal line count.
  Prefer explicit, conventional, boring code over compact tricks or
  speculative abstractions.
- Implement the smallest design that satisfies the current requirement.
  Do not add generic extension points, frameworks, caching, async, or
  configurability without a stated need.
- Keep domain logic deterministic where possible. Isolate I/O, network,
  filesystem, database, time, randomness, and mutable global state at
  explicit boundaries.
- Treat all external input as untrusted: validate and normalize it at the
  boundary before core logic uses it.
- Handle failure intentionally. Never silently ignore errors or
  broad-catch exceptions without a defined recovery path, useful
  non-sensitive context, and appropriate logging.
- Preserve existing behavior and local conventions unless the task
  explicitly changes them. Keep the diff narrow; do not mix unrelated
  refactors into the task.
- In a new project, the conventions of the FIRST commits become the
  conventions — choose naming, module boundaries, error policy, and test
  layout deliberately before code fossilizes them.
- Before completion: test normal and failure paths; run the applicable
  format/lint/type/build/test checks; remove debug/dead code; document
  only non-obvious decisions and public behavior.

## New component design (greenfield tasks)
Before implementing a new module or subsystem, state briefly (in the
handover):
1. The public interface and expected inputs/outputs.
2. Which module owns domain logic and which modules perform side effects.
3. Validation and failure behavior at each external boundary.
4. The tests that prove normal operation and expected failures.
Choose a direct design with the fewest moving parts. Do not invent future
extension points unless the requirement names the extension.

## Verification hierarchy (programming tasks)
Measured evidence in this order: unit tests / gate → runtime probe →
file state (git) → the agent's summary. A summary never substitutes for
the first three; report the measured numbers, not the impression.
