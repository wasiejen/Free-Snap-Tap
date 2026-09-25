request:
  that is what my agent says about this when comparing to what is actually in use already:
  ... your reply ...
  Read it. My honest take, no sugarcoating:
  ...
  
  are you in line with this? just because it is already done does not mean that the next agent will follow the same style - especially if a new project starts. i think it is more in line that this is like an observed behavior - if the code already exhibits these attributes i will be following indirectly to match the style. is it useful to make such a handout a mandatory read for an agent or really only when a new project begins?
  
  how would such a destill look like that my agent destriped


answer:
  I’m broadly in line with your agent’s diagnosis, but I would not draw the conclusion that the handout has no value outside existing repositories. The key distinction is between a **reference document**, a **persistent behavioral contract**, and a **task-specific instruction**.
  
  Your concern is valid: existing code style is only an indirect signal. It works well when the repository is mature, internally consistent, and the agent actually inspects comparable code before editing. It works poorly for greenfield work, thin repositories, mixed-quality legacy code, or tasks that create a new subsystem. In those cases, a compact always-present quality floor is useful.
  
  The best setup is therefore not “full handout mandatory everywhere” versus “only use it for new projects.” It is:
  
  - Keep a small, binding quality floor in every programming-agent prompt.
  - Keep repository-specific constraints in `AGENTS.md` or the task specification.
  - Keep the longer rationale/examples as an on-demand reference document.
  - Elevate selected rules into the task spec whenever they matter to the architecture.
  
  This aligns with the practical context-engineering principle of providing the minimal context that fully specifies expected behavior, then adding clear instructions or examples in response to observed failure modes. It also supports building rules files gradually rather than continuously loading broad guidance. [anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
  
  ## Where I agree—and disagree
  
  Your agent is right about the **marginal value** of repeating obvious rules verbatim:
  
  - “Use good names.”
  - “Keep functions focused.”
  - “Avoid needless duplication.”
  - “Run tests.”
  
  Those are valuable engineering principles, but a 1,000-token document restating them usually does not reliably alter a competent agent’s behavior—especially if the repository already has clear conventions, linters, tests, and reviewable task boundaries.
  
  It is also right that a long mandatory read can compete with more actionable context:
  
  - the actual task requirement and definition of done;
  - existing module patterns;
  - architectural boundaries;
  - “do not touch” areas;
  - commands that establish correctness;
  - known traps and failure modes.
  
  However, I disagree with the implication that “already present in the code” means “safe to omit.” Existing code is not a normative specification. It may be inconsistent, accidentally coupled, under-tested, or simply not representative of a new component. An agent can imitate local syntax while still introducing poor boundary handling, hidden global state, overly broad exception handling, or an over-generalized architecture.
  
  So the right question is not, “Is this already done in the repository?” It is:
  
  > **Does this instruction prevent a failure mode that this particular agent, repository, or task repeatedly exhibits?**
  
  If yes, make it persistent and testable. If no, move it to a reference or task-level instruction.
  
  ## Recommended policy
  
  | Context | What the agent should receive |
  |---|---|
  | Every programming task | A compact, binding quality floor of roughly 150–250 tokens |
  | Existing, well-structured repository | `AGENTS.md`, local examples, test/build commands, and the specific task contract |
  | Greenfield project or new subsystem | The compact floor plus an explicit architectural task spec: module boundaries, error policy, data ownership, public API, persistence/I/O approach |
  | Risky boundary work | Specific instructions for validation, failure semantics, retries, logging, security, and tests |
  | Large unfamiliar changes | The longer handout or selected reference sections, explicitly linked by the planner |
  | Repeated failure pattern | A short, imperative rule added permanently, plus an automated check where possible |
  
  The important part is to phrase persistent rules as **verifiable constraints**, not aspirations.
  
  Weak:
  
  > Prefer maintainable code.
  
  Better:
  
  > Keep domain logic deterministic and separate it from I/O. Do not introduce hidden global state. Validate untrusted input at the boundary. Do not catch broad exceptions unless the boundary has an explicit fallback and logging policy.
  
  Prompting guidance also supports using specific requirements, preconditions/postconditions, and explicit exception behavior rather than generic advice. [arxiv](https://arxiv.org/html/2601.13118v1)
  
  ## Suggested distilled version
  
  This is the version I would put into the worker prompt or a mandatory “Quality floor” section of `AGENTS.md`. It is intentionally imperative and compact—about 190 tokens.
  
  ```md
  ## Quality floor — mandatory
  
  - Optimize for safe change and readability, not minimal line count. Prefer explicit, conventional, boring code over compact tricks or speculative abstractions.
  - Implement the smallest design that satisfies the current requirement. Do not add generic extension points, frameworks, caching, async, or configurability without a stated need.
  - Keep domain logic deterministic where possible. Isolate I/O, network, filesystem, database, time, randomness, hardware, and mutable global state at explicit boundaries.
  - Treat all external input as untrusted: validate and normalize it at the boundary before core logic uses it.
  - Handle failure intentionally. Never silently ignore errors or broad-catch exceptions without a defined recovery path, useful non-sensitive context, and appropriate logging.
  - Preserve existing behavior and local conventions unless the task explicitly changes them. Keep the diff narrow; do not mix unrelated refactors into the task.
  - Before completion: test normal and failure paths; run required format/lint/type/build/test checks; remove debug/dead code; document only non-obvious decisions or public behavior.
  ```
  
  ## Why this version works
  
  It retains the parts most likely to affect agent behavior even in a new or inconsistent project:
  
  - **Explicit over clever** blocks unreadable compression and artificial abstraction.
  - **Smallest current design** prevents speculative architecture, which is a common agent tendency when asked to “make it extensible.”
  - **Deterministic core and explicit boundaries** makes code easier to test, debug, and refactor.
  - **Trust-boundary validation** protects integrations, APIs, files, queues, hardware readings, and configuration.
  - **Intentional failure semantics** prevents the particularly dangerous pattern of swallowing errors and returning plausible-but-wrong results.
  - **Narrow diffs and verification** constrain scope creep and connect quality rules to observable evidence.
  
  The naming, single-responsibility, and DRY rules can remain in the longer reference because they are useful in planning/review and when a task explicitly needs them. But they do not need to consume every worker launch unless your evaluations show a specific recurring failure there.
  
  ## A stronger greenfield add-on
  
  For a new project or genuinely new module, add this short task-specific block after the quality floor:
  
  ```md
  ## New component design
  
  Before implementation, state briefly:
  1. The public interface and expected inputs/outputs.
  2. Which module owns domain logic and which modules perform side effects.
  3. Validation and failure behavior at each external boundary.
  4. The tests that prove normal operation and expected failures.
  
  Choose a direct design with the fewest moving parts. Do not invent future extension points unless the requirement names the extension.
  ```
  
  That is more effective than making the full philosophy handout mandatory. It turns the principles into design artifacts that can be inspected: interface, ownership, failure contract, and test plan.
  
  ## Bottom line
  
  Make the **distilled quality floor mandatory for all programming tasks**, including existing repositories. Use the full handout as a planner/reviewer reference and require it for greenfield, architecture-heavy, or unfamiliar-code work only.
  
  That gives you a stable cross-project behavioral baseline without spending attention on rules the task, repository, linters, and tests already enforce. The real goal is not that the agent reads a document; it is that it consistently produces code whose assumptions, side effects, failures, and verification are explicit.
