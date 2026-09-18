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
## 2026-09-18_14-29 agent_Q4_140K ses_f4ba3e2eaffeL562KXvPVmB81u
Maintainer-verified (2026-09-18, prompt_engineer scan comments): (1) This host runs ONE llama-swap model slot — subagent execution is inherently SERIAL; parallel Task launches (guide S3-P8 style) are not usable here. The delegated slot workflow exists precisely to free window space per task. (2) "Half prefill" on the Q4 models is a CONTEXT-SIZE setting (enlarges the effective window), not a cost mitigation — its price is slower initiation. (3) The only cost metric on this setup is TIME (energy); no token/money cost. Optimization framing must be time-per-iteration, not token cost.

## 2026-09-18_18-41 prompt_builder_Q4_140K ses_f4ba3e2eaffeL562KXvPVmB81u
2026-09-18 verified (direct session, prompt-engineer rework): the tool DESCRIPTIONS injected at launch are the actual agent-facing surface — the maintainer confirms the compact_memory providerID/modelID params were an un-reworked placeholder since 2026-09-12 (now reworded to override semantics: pair sent verbatim vs auto-resolve, both-or-neither); block_transfer gained its first copy-pasteable example. All five custom-tool descriptions now pass the new-hire test; the residual gaps are in the PROMPTS (fixed same session), not the tool descriptions.

