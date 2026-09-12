# knowledge/ — area-specific knowledge base

Acquired, VERIFIED, ACTIONABLE knowledge that agents consult when working in a
given area. This is NOT protocol/instructions (that lives in `AGENTS.md` +
`system_prompts/`) — it is hard-won findings that replace re-deriving the same
lookups and keep them out of the working context.

## Principle: keep only what is actionable
- Keep an entry only if it was **useful in the past AND is actionable** — an
  agent can use it for a task or act on it to solve a problem. Knowledge kept
  "for knowledge's sake" is dead weight; discard it.
- Every entry carries a **reference** (where it was found / verified) and
  **key search terms**, so adjacent knowledge stays findable and the entry can
  be re-verified instead of trusted by memory.
- If an entry stops being true or actionable, delete or condense it — never
  let it rot. (Planner curates, same discipline as `TODO.md`.)

## Entry format
```
## <topic>
- **Do:** <the actionable guidance>
- **Why (evidence):** <why it is true; how it was verified>
- **Ref:** <file / commit / session / doc where it was found>
- **Keys:** <search terms>
```

## When to read
When you ENTER an area (writing a tool, touching a plugin, ...), read that
area's file first — it replaces re-deriving the same lookups.

## When to add
When you gain verified, actionable knowledge that would speed up FUTURE work
in the area, append an entry (date + role tag in the Ref). Keep it terse.
One area = one file; create a new file for a new area.

## Files
- `knowledge_tools.md` — opencode custom tools (`.opencode/tools/*.ts`).
- `knowledge_plugins.md` — opencode plugins (`.opencode/plugin/`).
