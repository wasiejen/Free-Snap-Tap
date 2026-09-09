# TASK — v2.2.2 worker proof: quote YOUR `ctx:` gauge line (one-shot, log-free) (2026-09-09)

EVIDENCE-ONLY, read-only turn: NO code edits, NO commits, NO tool calls that read or
analyse any file (specifically DO NOT open or parse `.opencode/plugin.log` — the
maintainer has forbidden it; it loops). There is nothing to commit; the planner updates
the plan state.

## The one fact

Your own system prompt should carry an injected item of the form
`ctx: CTX=<n> (<p>%) REM=<m>` (injected by `.opencode/plugin/handover.ts` v2.2.2 on the
`experimental.chat.system.transform` hook — the maintainer's "inject for ALL sessions"
decision, TODO.md #18; the readout is a tagged-template `input.$` call into
`.venv/Scripts/python.exe .opencode/ctxgauge/peek.py`).

You can see your own system prompt — it is the text you were given when you started
(your role text, the `env` block, any injected items). You do NOT need any tool for
this; just look at the prompt text already in your context.

ACTION:
1. Inspect your own system block for an item starting `ctx:`.
2. Report EXACTLY ONE finding, nothing more:
   - if present, `FOUND: <the verbatim line, e.g. ctx: CTX=12345 (10%) REM=97654>`
   - if absent,  `ABSENT`
3. Do NOT read any file, do NOT run any command, do NOT retry if the item is absent —
   "ABSENT" is itself a complete and correct answer for this probe.

## Return

A one- or two-line final message: the `FOUND: <verbatim line>` or `ABSENT` finding,
plus the token/window arithmetic IF and ONLY IF found (`n + REM ≈ model window?`).
That is the whole task.
