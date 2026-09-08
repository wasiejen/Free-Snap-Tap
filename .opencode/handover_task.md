# TASK — Phase 6 / Tier 1 — handover plugin v1 (LOG ONLY)

FIRST read `AGENTS.md` (conventions, commit routine). The `customize-opencode`
skill documents the plugin API surface (auto-loaded if relevant). Authoritative
plugin types: `.opencode/node_modules/@opencode-ai/plugin/` — read the type
declarations there to confirm export shapes and hook signatures BEFORE writing.

## Goal
Create `.opencode/plugin/handover.ts` — a log-only opencode plugin. It does
exactly one thing: append one JSON line per observed event to
`.opencode/plugin.log`. No behavior change, no file ownership (that is v2), no
driving delegation — it observes the built-in `task` tool and bus events.

## Deliverables
1. `.opencode/plugin/handover.ts`
   - Default export a `Plugin` function:
     `(async ({ client, project, directory, $ }) => ({ ...hooks })) satisfies Plugin`,
     `Plugin`/hook types from `@opencode-ai/plugin`. The export is a function,
     not a plain object.
   - Register ONLY these hooks (v1): `event`, `tool.execute.before`,
     `tool.execute.after`.
   - Each hook appends one compact JSON line, e.g.
     `{"ts":"<ISO>","kind":"event"|"tool.before"|"tool.after","session":..., "agent":..., ...}`.
     Extract whatever session/agent identifiers the input payloads expose
     (inspect the types — e.g. `sessionID` on tool payloads; record what you
     actually find). For `tool.*` hooks include the tool name; for `task` tool
     calls include the args (`subagent_type`, `prompt`, session fields) — that
     payload shape is the point of v1.
   - Truncation: cap any single stringified field at ~500 chars (append `…`),
     and keep the whole line < ~2000 chars — the log must stay grep-able.
   - Safety: every fs operation wrapped (try/catch or `.catch(()=>{})`); a hook
     must NEVER throw, reject, or delay observably; lazy-open the stream/file
     (no file IO at plugin-init), write best-effort only.
   - Self-contained, < ~150 lines, minimal comments (no brand text or filler).
2. `.opencode/.gitignore` — append one line `plugin.log` (keep existing entries).
3. NO FST code or test changes. NO `opencode.jsonc` changes (auto-discovery of
   `.opencode/plugin/*.ts` applies; note the escape hatches
   `OPENCODE_DISABLE_DEFAULT_PLUGINS` / `OPENCODE_PURE` exist if the plugin ever
   breaks opencode start).

## Verification
1. Plugin goes LIVE only at opencode START — a real planner→worker cycle cannot
   be captured in the current session. Your verification is a STATIC PROBE:
   - Runner, in order of preference: `bun` on PATH → `node --experimental-strip-types`
     (check `node -v` first; needs ≥22) → `npx -y tsx`. Pick whichever runs first
     locally (avoid downloading when avoidable — ask early per AGENTS.md house rule
     if all three are absent).
   - Write a throwaway probe script (NOT committed): import the plugin default
     export, call it with a minimal fake `PluginInput` (e.g. `{ client: {},
     project: {}, directory: process.cwd(), $: null }`), assert the returned hook
     set matches exactly {`event`, `tool.execute.before`, `tool.execute.after`},
     then invoke each with a minimal fake payload (a `task`-shaped before/after,
     a sample event). The probes must not throw, and `.opencode/plugin.log` must
     end up with parseable JSON lines (`JSON.parse` each in a one-liner).
   - Delete the probe file and `.opencode/plugin.log` before committing (log is
     gitignored either way, but leave the tree clean).
2. Suite baseline must stay green — this commit touches no FST code, but prove
   it: `& .\.venv\Scripts\python.exe -m pytest -q` → expect **434 passed**.
3. Record in your summary: which runner ran the probe, the exact hook keys the
   module exported, and the JSON lines the probe produced — they are the first
   v1 payload evidence.

## DoD check / what the planner needs from you
- v1's FULL DoD ("plugin.log shows a full planner→worker cycle; opencode start
  unaffected") is completed in the NEXT session after the maintainer restarts
  opencode — say so explicitly in the summary, plus list exactly what to look
  for in the post-restart log (task call args shape, worker-final-message arrival,
  session IDs, and anything to flag: hook ordering, `event` payload volume/noise).
- No discrepancies against `@opencode-ai/plugin` types → nothing to append to
  TODO.md; if you find any (e.g. hook signature differs from the skill docs),
  append a new numbered TODO.md entry per AGENTS.md and flag it in the summary.

## Summary + commit
- Write your EXECUTIVE SUMMARY to `.opencode/handover_task_to_planner.md`:
  files changed, probe runner + result, hook export keys, captured JSON lines,
  pytest result, discrepancies, and the post-restart checklist above.
- Commit per AGENTS.md conventions, subject one-liner (imperative), e.g.:
  `Add handover plugin v1: log-only opencode event capture`.
  Files: `.opencode/plugin/handover.ts`, `.opencode/.gitignore`,
  `TODO.md` (append-only if a discrepancy surfaced), `.opencode/handover_task.md`,
  `.opencode/handover_task_to_planner.md`.
- Do NOT touch `.opencode/handover_planner.md` (planner-owned) and do NOT restart
  or reconfigure opencode.
