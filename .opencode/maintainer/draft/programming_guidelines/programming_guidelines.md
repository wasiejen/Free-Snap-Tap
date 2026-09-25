Here is a compact handout I’d actually keep next to a project. It prioritizes the rules that prevent the most bugs and maintenance pain across scripts, services, embedded/IoT code, and larger applications.

## High-leverage programming rules

1. **Make it correct before making it clever.**  
   Prefer explicit, boring code over compact tricks. The next person—including future you—must be able to safely change it.

2. **Keep it simple.**  
   Choose the simplest design that solves today’s real requirement. Avoid speculative frameworks, abstractions, and configurability.  
   *KISS + YAGNI:* solve the problem you have, not the imagined one.

3. **Give things precise names.**  
   A name should reveal purpose and units: `timeout_ms`, `retry_count`, `is_authenticated`, `parse_config()`.  
   Avoid vague names such as `data`, `value`, `tmp`, `handle`, `process` unless their scope is tiny and obvious.

4. **One unit, one job.**  
   A function, class, or module should have one coherent responsibility. If you need “and” to describe what it does, split it.  
   Example: separate `read_sensor()`, `validate_reading()`, `store_reading()`, and `publish_reading()`.

5. **Keep functions small and control flow shallow.**  
   Use guard clauses and early returns to avoid deeply nested `if` blocks. Small functions are easier to test, reuse, and review.

6. **Make invalid states hard to represent.**  
   Validate at boundaries—user input, APIs, files, messages, hardware readings—and convert raw input into trustworthy domain values early. Never assume external input is valid.

7. **Handle failures deliberately.**  
   Do not swallow exceptions. Either:
   - handle the error meaningfully,
   - add useful context and re-raise it, or
   - let it fail loudly at a well-defined boundary.  
   Log enough context to diagnose the failure, but never leak passwords, tokens, or personal data.

8. **Test behavior, especially edges.**  
   Test normal cases, boundaries, malformed input, failure paths, and regressions. Every bug fixed should normally become a test that would have caught it.

9. **Do not copy-paste logic.**  
   When the same *knowledge or business rule* exists in two places, centralize it. But do not force unrelated code into a shared abstraction merely because it looks superficially similar.  
   *DRY means one source of truth—not “never repeat a few lines.”*

10. **Keep side effects at the edges.**  
    Isolate I/O: filesystem, network, database, clock, randomness, hardware, and global state. Keep core logic as deterministic as possible. This improves testing dramatically.

11. **Use version control and make small commits.**  
    Every project gets Git. Each commit should be focused, buildable where practical, and have a message describing intent—not merely the files changed.

12. **Automate the rules.**  
    Use formatter, linter, static type checking where appropriate, tests, and CI. Humans should spend review time on design and correctness, not whitespace or obvious mistakes. Coding standards help produce readable, maintainable, secure, and testable code; a small essential subset is often more useful than a huge rulebook. [swehb.nasa](https://swehb.nasa.gov/spaces/SWEHBVD/pages/102695445/SWE-061+-+Coding+Standards)

## Before you call it done

Use this short checklist:

- Does it solve a clearly stated problem?
- Is the code understandable without a verbal explanation?
- Are names and units unambiguous?
- Are inputs validated and errors handled intentionally?
- Is configuration separate from code, with no secrets or environment-specific constants hardcoded?
- Are important paths and edge cases tested?
- Did formatting, linting, type checks, and tests pass?
- Is there a small, reviewable commit with a meaningful message?
- Did you avoid optimization unless profiling or a real constraint justified it?
- Did you leave the touched code at least slightly cleaner than before?

## The practical priority order

If you only remember five things, use these:

| Priority | Rule | Why it pays off |
|---|---|---|
| 1 | Make behavior explicit and simple | Fewer misunderstandings and less accidental complexity |
| 2 | Validate boundaries and handle failures | Prevents many production bugs and security issues |
| 3 | Write tests for critical behavior and bugs | Makes change safe and prevents regressions |
| 4 | Use meaningful names and small responsibilities | Reduces maintenance and review cost |
| 5 | Automate formatting, static checks, and tests | Catches routine mistakes consistently |

## One useful rule of thumb

> **Optimize for safe change, not for fewer lines of code.**

Most code costs far more to understand, debug, extend, and operate than to write initially. That is why readability, simple design, validation, tests, and feedback loops generally outperform clever algorithms or premature performance tuning in day-to-day development. Guidance from software-engineering sources consistently emphasizes simple solutions, avoiding unnecessary features, separation of concerns, testing, version control, input validation, and profiling before optimization. [datacamp](https://www.datacamp.com/tutorial/coding-best-practices-and-guidelines)
