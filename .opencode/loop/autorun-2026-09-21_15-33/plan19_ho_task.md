# TASK SPEC — #101 opencode host map (explorer task)

Goal: build the durable, dated host map in the knowledge base so planner/worker
LOOK UP installed opencode facts instead of re-deriving them (TODO #101).

Deliverable (one file): `.opencode/agent/knowledge/opencode-plugins/host-map.md`
(existing folder — no new README needed). Read the folder README first and
follow the knowledge format (dated entries, evidence-backed).

## The 6 areas to cover (one section each)
1. **SDK surface** — the v1 `session.*`/`app.*`/`config.*` endpoint surface
   from the installed `.d.ts` (method + line). Note which are actually called
   by our plugins (`.opencode/plugin/*.ts`) vs merely available.
2. **Plugin hook registration + ordering** — the hook keys the installed
   plugin package registers (from `plugin/dist/index.d.ts`), their input/
   output shapes, and which hooks our own plugins use (auto_resume,
   compact_memory, intercept_observer, block_transfer, loop_log, the ctx
   nudge). Registration mechanics (how a plugin file is loaded/registered).
3. **DB schema** — session/message/part (+ permission/event) columns from
   the live DB via `node .opencode/agent/scripts/db/probe_schema.cjs`
   (bounded, read-only). Note the `data` JSON shape for message/part only if
   already documented in the vendored deep-dives — do not re-derive.
4. **Permission / external_directory mechanics** — how `permission` and
   `external_directory` in `opencode.jsonc` are enforced (read our plugins'
   usage + the vendored knowledge files; the R8 redirect is a live example in
   `intercept_observer_core.ts`). Mark anything not verifiable from files as
   "unverified — live behavior only".
5. **Compaction / summarize path** — build ON the vendored deep-dives A/B/C
   + `2026-09-25_compaction_keep_semantics.md`; do NOT re-derive. Add only
   what is missing for the map (e.g. the keepTokens/keepMessages resolution
   order as it stands after #99).
6. **Tool registration** — how our tools are registered (the `tool()` form,
   the plugin export shape, the two known load-error anomalies from
   repo_overview.md §Safety limits — kept as dated facts).

## Upstream research (secondary, bounded)
Only where the installed build leaves a gap: webfetch the official opencode
docs (opencode.ai/docs, GitHub anakin-tech or opencode-ai) to fill it.
Every upstream-sourced line: date-stamped + marked "upstream (not
installed-verified)". No deep multi-page crawling — a handful of targeted
fetches, output bounded.

## Verified starting points (planner facts, 2026-09-26 — do not re-derive)
- Installed SDK + plugin under `.opencode/node_modules/@opencode-ai/`,
  BOTH at 1.18.29 (measured today). The live host binary is 1.18.31 (a
  1.18.29/1.18.31 discrepancy is already documented in the unit-1 surface
  report — carry that caveat forward, don't re-measure).
- Key locators: `.opencode/node_modules/@opencode-ai/sdk/dist/gen/
  sdk.gen.d.ts` (endpoints), `.../sdk/dist/client.d.ts` (`createOpencodeClient`),
  `.opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts` (`Hooks`).
- Live DB: `C:/Users/Wasiejen/.local/share/opencode/opencode.db` — READ-ONLY,
  never write (the probe script opens it readOnly).
- Vendored starting points (build on, don't re-derive): `auto-resume-map.md`,
  `auto-resume-deepdive-A/B/C.md`, `auto-resume-unit1-surface-report.md`,
  `2026-09-25_compaction_keep_semantics.md` (all in the same folder), plus
  `knowledge/plugins` area files for hook-usage facts.

## Context discipline (binding)
- NEVER read whole `.d.ts`/DB dumps — bounded greps with output caps
  (`| head -30` first), targeted line ranges after. The `.d.ts` files are
  large; the DB is live and big.
- Every map entry: date (2026-09-26 for fresh findings) + a locator
  (file + line, or script + query).
- This is a RESEARCH + one-file task: no code, no gate, no probe changes.

## Definition of done
- `host-map.md` exists in the folder, covers all 6 areas, every entry
  dated + located; vendored deep-dive content is REFERENCED/summarized, not
  re-deriving and not duplicated in bulk (a pointer + the delta).
- Knowledge format per the folder README; no other file touched except
  `TODO.md` (#101 status → one-line pointer; full detail stays in the map)
  and the handover summary.
- `handover_task_to_planner.md`: areas covered, locators spot-checked,
  upstream fetches used (or not needed), anything marked unverified, what
  you deliberately left out.
- ONE commit at the end (research task — no code units): the map + TODO
  note + handover. Message subject: one-line imperative naming the map.

## DO-NOT-touch
- The live DB (read-only), `.opencode/maintainer/**`,
  `.opencode/agent/prompts/**` (edit-denied), `AGENTS.md`, `.git/**`,
  any `.opencode/plugin/*.ts` or test (no code edits), `opencode.jsonc`
  (maintainer's live file — read ok, edit NO).
- No live-listener / FST execution, no requests to the backend inference
  server (opencode sessions only).

Worker: `explorer_Q3S_170K`. This is research, not a build.
