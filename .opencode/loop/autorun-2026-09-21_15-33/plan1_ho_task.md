# Task spec — auto-resume plugin, UNIT 1: skeleton logging plugin (the testbed)

Worker: `worker_Q3S_160K`. Branch: stay on the current checkout (`opencode_test`).
Design of record: `.opencode/proposals/approved/2026-09-21_opencode-auto-resume-plugin.md`
— read its "Shared architecture rules" + "Unit 1" sections (lines 40-61); the
reference corpus is referenced by path there, do NOT re-derive it.

## Goal
A small skeleton plugin in `.opencode/plugin/` that (1) logs every event it
receives and (2) probes the live v1 client surface at init. It is the testbed
that validates the v1 API for all later units (Unit 2-4 grow from it).

## Build (the HOW is yours inside the DoD)
1. **New file `.opencode/plugin/auto_resume.ts`** — default-exported Plugin
   factory, the SAME shape as the existing plugins: see the TAIL of
   `.opencode/plugin/intercept_observer.ts` (the last ~15 lines:
   `export default (async (input: PluginInput) => { ... return { hooks } })
   satisfies Plugin;`) — do NOT read the whole file. Hooks installed:
   - `event: onEvent` — the event hook key, verified in the installed types
     (`.opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts`
     `Hooks.event?: (input: { event: Event }) => Promise<void>`, ~line 175).
     Log ONE line per event: `<ISO time> event=<type> sid=<sessionID> <key
     fields>` (key fields: the event's `type`/`properties` bits that exist,
     e.g. status for session.status, tokens for message.updated — keep it
     short). The handler MUST never throw (try/catch swallow, same
     discipline as intercept_observer).
   - **One-shot init surface probe** (runs once at plugin load): log a
     `surface=` line listing `typeof ctx.client.session.<m>` for the
     candidate methods (`prompt, promptAsync, abort, list, get, message,
     todo, command, summarize, compact`) + whether `ctx.client.app.log` is a
     function. Detect with `typeof` ONLY — `Object.keys` misses prototype
     methods (knowledge_plugins.md "The plugin ctx client on THIS host").
     Expected from the 2026-09-12 probe: `summarize`=function, `compact`=
     undefined (v1-generation client) — the probe CONFIRMS live, the report
     records both.
   - Log file: `.opencode/temp/auto_resume.log` (append; create the dir if
     missing — `.opencode/temp/` exists).
   - NO timers, NO sends, NO state machine in this unit — events + probe
     only. (Unit 2 adds the saturation trigger; keep the file structured so
     a 5s tick + gated send path can slot in later.)
2. **Smoke `.opencode/plugin/tests/auto_resume.smoke.mjs`** — follow the
   existing smoke pattern (read the first ~40 lines of
   `tests/_smoke_base.mjs` + one existing smoke such as `loop_log.smoke.mjs`
   for the shape; sandbox/mocks like the other smokes). Checks: the factory
   returns an `event` handler; a mocked `session.status` event produces a log
   line carrying type + sid; the init probe produces the `surface=` line
   against a mocked client; a throwing mock client does not crash the
   handler.
3. **Surface report (static part) — new file**
   `.opencode/agent/knowledge/opencode-plugins/auto-resume-unit1-surface-report.md`:
   the `session.*` method list from the installed `.d.ts` (bounded grep of
   `client.d.ts`/`index.d.ts` in `@opencode-ai/plugin`/`@opencode-ai/sdk` —
   one grep, head -40), the probe design + its expected values, and a
   "LIVE CONFIRMATION PENDING (maintainer restart)" marker. Provenance per
   the folder README (source, verifying session, date).

## Definition of done (measured)
- The smoke run is GREEN (its own readout, all checks pass).
- Standard gate green: `./.venv/Scripts/python.exe -m pytest -q` (459+1w),
  `./.venv/Scripts/ruff.exe check --select F .` (F=0),
  `node .opencode/plugin/probes/handover_probe.mjs` (probe total UNCHANGED —
  this unit adds no probe pins; the gate just stays green).
- The three files above exist + committed, with your executive summary in
  `handover_task_to_planner.md` (commit it with the code).

## DO-NOT-TOUCH
- product code (`fst_*.py`, `tests/`), `opencode.jsonc` (no registration
  needed — plugins auto-discover from `.opencode/plugin/`; no tool
  registration in this unit), AGENTS.md, `.opencode/agent/prompts/**`
  (edit-deny), other plugins (`ctx_watchdog.ts`, `intercept_observer*.ts`,
  `compact_memory.ts`), the probe file, `.opencode/maintainer/**`,
  `.opencode/temp/intercept.log` (another plugin's channel).
- Long write payloads can fail with server-side JSON parse errors (host
  bug, TODO #74): on a `JSON parsing failed: Text: {.` hit, retry once, else
  create via bash heredoc + small edit-append batches (repo_commands.md).

## Pending (maintainer domain — name it in your summary, do NOT do it)
- LIVE ACCEPTANCE after the maintainer's host restart (planner does it):
  (a) `.opencode/temp/auto_resume.log` carries live event lines from a live
  session; (b) the init `surface=` probe line is present; then the live
  confirmation is appended to the surface report.
