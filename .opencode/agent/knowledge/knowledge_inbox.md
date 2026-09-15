# knowledge_inbox.md — append-only inbox for new knowledge (his #5, 2026-09-15)

Unsorted, verified, actionable knowledge entries that do not yet have an
obvious area file. APPEND ONLY — the planner cures entries into the area
files (`knowledge_tools.md` / `knowledge_plugins.md` / ...) at session
close or when the placement becomes obvious. Format per the folder README
(Do / Why (evidence) / Ref / Keys) + a date + role tag.

## Edit tool chokes on non-ASCII chars in oldString (built-in tool, not custom)
- **Do:** when the text to replace contains non-ASCII characters (em-dashes,
  quotes, umlauts), do NOT fight the built-in `edit` tool — use
  `block_transfer` (line-anchor based, ASCII-safe) or a small node script
  for the replacement. Avoid non-ASCII in new text where possible
  (maintainer #7, 2026-09-15: "do not use non-ASCII chars if possible").
- **Why (evidence):** maintainer report 2026-09-15 (priority.md #7): the
  planner working on code failed multiple times on non-ASCII `oldString`
  matches and needed a script to replace a text string.
- **Ref:** priority.md #7; `block_transfer` tool (planner/worker toolset).
- **Keys:** edit, oldString, non-ASCII, unicode, em-dash, block_transfer,
  replacement, script fallback.
