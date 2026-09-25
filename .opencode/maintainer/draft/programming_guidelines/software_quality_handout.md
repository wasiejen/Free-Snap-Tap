## Software Quality Handout

### Primary objective

Write software that is **easy to understand, safe to change, and correct under expected failure conditions**.

Optimize for long-term maintainability and reliable evolution—not for the fewest lines, most clever abstraction, maximum configurability, or premature performance. Prefer an explicit, boring solution whose behavior is obvious to a compact trick that requires interpretation.

When trade-offs are unclear, choose the option that makes future changes safer and makes incorrect use harder.

### Design rules

1. **Solve the actual requirement simply.**  
   Implement the smallest design that fully meets the stated need. Do not add generic frameworks, plugins, configuration layers, abstraction hierarchies, caching, async processing, or extension points unless a real present requirement justifies them.

   Good: a straightforward function that reads one configuration format.  
   Bad: a generalized configuration-provider system for an application that only reads one local JSON file.

2. **Prefer explicit code over clever code.**  
   Make data flow, control flow, assumptions, errors, and side effects visible. Use conventional language features and clear intermediate variables.

   Prefer:
   ```python
   if retries_remaining == 0:
       raise RetryLimitExceeded()
   retries_remaining -= 1
   ```

   Over compressed logic that obscures intent:
   ```python
   retries_remaining or (_ for _ in ()).throw(RetryLimitExceeded())
   ```

3. **Choose names that explain intent.**  
   Use names that express what a value represents, including units and state when relevant: `timeout_seconds`, `retry_count`, `is_connected`, `parse_device_config`.

   Avoid vague names such as `data`, `item`, `value`, `result`, or `handle` outside a very small and obvious scope. Avoid unnecessary abbreviations.

4. **Give each unit one coherent responsibility.**  
   Functions, classes, and modules should do one meaningful job. Split code when it mixes unrelated concerns, such as parsing input, applying business rules, writing to storage, and sending network requests.

   Prefer:
   ```python
   config = parse_config(raw_text)
   validate_config(config)
   save_config(config)
   ```

   Over one large `process_config()` function that performs every step internally.

5. **Keep core logic deterministic; isolate side effects.**  
   Separate business logic from I/O, network calls, databases, hardware, environment variables, clocks, randomness, and global mutable state. Put side effects at system boundaries and pass dependencies explicitly where practical.

   This makes code predictable, testable, and safe to refactor.

6. **Validate at every trust boundary.**  
   Treat API requests, files, command-line arguments, sensor values, database contents, environment variables, and external messages as untrusted. Validate type, range, format, required fields, and meaningful constraints early. Convert raw values into validated domain values before core logic uses them.

   Never rely on an external system “always” sending valid input.

7. **Handle errors intentionally.**  
   Do not silently ignore errors or catch broad exceptions without a specific recovery strategy. Either recover meaningfully, add context and re-raise, or allow failure to reach a defined application boundary.

   Error messages and logs should identify the failed operation and relevant non-sensitive context. Never log secrets, authentication tokens, passwords, or unnecessary personal data.

8. **Test behavior and failure paths.**  
   Test public behavior, important edge cases, invalid input, expected failures, and previously fixed bugs. A bug fix should normally include a regression test. Prefer tests that verify observable behavior over tests tied to private implementation details.

9. **Avoid duplication of knowledge, not merely duplicated text.**  
   Keep a rule, invariant, protocol definition, or business decision in one authoritative place. Do not create an abstraction just because several lines look similar; small local duplication is often clearer than a premature “generic” helper.

10. **Keep changes small, coherent, and reviewable.**  
    Change only what is necessary. Avoid unrelated refactors in a feature or bug-fix change. Preserve existing public behavior unless the requirement explicitly changes it. State assumptions and uncertainties instead of silently inventing requirements.

### Completion checklist

Before declaring work complete:

- Confirm the implementation directly satisfies the stated requirement.
- Verify code is readable without hidden assumptions or clever constructs.
- Validate inputs and define failure behavior at external boundaries.
- Add or update tests for normal, edge, and failure cases.
- Run the applicable formatter, linter, type checker, build, and tests.
- Remove dead code, debug output, unused dependencies, and accidental complexity.
- Document only non-obvious decisions, constraints, or external behavior.
- Prefer the change that makes the next change cheaper and safer.
