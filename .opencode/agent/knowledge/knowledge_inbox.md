# knowledge_inbox.md — append-only inbox for new knowledge (his #5, 2026-09-15)

Unsorted, verified, actionable knowledge entries that do not yet have an
obvious area file. APPEND ONLY — the planner cures entries into the area
files (`knowledge_tools.md` / `knowledge_plugins.md` / ...) at session
close or when the placement becomes obvious. Format per the folder README
(Do / Why (evidence) / Ref / Keys) + a date + role tag.

_Curation log (planner):_
- 2026-09-21: "Edit tool chokes on non-ASCII chars" → `knowledge_tools.md`; "single slot serial / half-prefill / cost = time" → `knowledge_tools.md` (model-config facts; the serial-slot half was already covered by the single-slot entry); "tool descriptions = agent-facing surface" → merged into the `description` entry in `knowledge_tools.md` (new-hire test); "plugin repo test( vs it( layout" → `opencode-plugins/auto-resume-map.md` test-layout note.
## 2026-09-21_17-20 worker_Q3S_160K ses_f3b8c19e9ffe2IoV4S9lrx0vSi
auto-resume plugin facts (verified live/static, worker_Q3S_160K, 2026-09-21): (1) installed @opencode-ai/sdk 1.18.29 client provider namespace = list() (NOT get()) returning {data: {all: Provider[], default, connected}}; Provider = {id, models: {[modelID]: {limit: {context, output}}}} — the client method wraps the 200 body in res.data. (2) LIVE message.updated event: properties.sessionID IS present (the static .d.ts only shows properties.info — the live host sends more, same pattern as session.message being callable); the assistant message object carries role + top-level providerID/modelID + tokens {total?, input, output, reasoning, cache{read, write}} — there is no model sub-object. (3) The live .opencode/temp/auto_resume.log keeps growing in real time while the host runs (the live plugin logs every event) — a smoke asserting "live log size unchanged" WILL fail on any multi-second smoke; the correct invariant is "no smoke-session line in the newly appended bytes".

