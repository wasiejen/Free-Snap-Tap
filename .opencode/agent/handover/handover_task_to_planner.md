# HANDOVER — explorer task #101 (opencode host map) — 2026-09-26

Worker: explorer_Q3S_170K, session ses_f24bf71beffekwRYMtnlrWy5UG.
Commit: the single commit of this task adds exactly these three files (map +
TODO note + this handover) — verify the hash with `git log -1` (reported in
the closing message). No other file touched.

## Deliverable

`.opencode/agent/knowledge/opencode-plugins/host-map.md` — all 6 spec areas,
every entry dated + located; vendored deep-dives REFERENCED (pointer + delta),
not re-derived or bulk-copied. Provenance header names source + verifying
session/date per the folder README.

## Areas covered

1. **SDK surface** — full read of `sdk.gen.d.ts` (403 lines): complete
   `session.*` table with lines (incl. `session.message` L178 — correcting the
   2026-09-21 head-40 grep's "NO"), NO v1 `session.compact`, `app.*`
   (log/agents), `config.*` (get/update/providers), all other namespaces one
   line each, the flat `postSessionIdPermissionsPermissionId` L381; v2 surface
   (summarize L1185 / compact L1702 flat / wait / context / history); a
   called-vs-available table for our plugins with file:line locators.
2. **Hook registration + ordering** — full `Hooks` interface read
   (plugin/dist/index.d.ts L173-322) with per-hook input/output shapes +
   lines; PluginInput/Plugin forms; ordering (declaration order + upstream
   load order, marked upstream); registration mechanics (directory
   autodiscovery proven by the live load errors; NO `plugin` array in our
   opencode.jsonc; the stale 2026-09-12 "plugins-array-only" knowledge line
   flagged); per-plugin hook-usage table (ctx_watchdog L726-731, auto_resume
   L1710-1715 incl. the ctx-line nudge, intercept_observer L1124-1127,
   context_recovery event-only L620-727, compact_memory tool-only L794-804).
3. **DB schema** — live probe 2026-09-26 (read-only): session(324) +
   session_v2(215) with full column lists (v2 delta named), message(16566),
   part(74275), permission(0), event(70154), event_sequence, session_message,
   todo, auxiliary tables. `data` JSON shapes pointed to the vendored
   deep-dives (unit-2 supplement, keep-semantics #99, Deep-Dive B §3.2/§3.3,
   knowledge_plugins post-mutation state.input) — not re-derived.
4. **Permission / external_directory** — config locators (opencode.jsonc
   L23-34 allow-map, L192-210 inactive commented block, per-agent edit-deny
   maps e.g. L265-277); installed surface (permission.ask hook L225-227,
   client responder L381, ToolContext.ask tool.d.ts L23-32); zero plugin usage
   (grep); R8 as the live shadow implementation (intercept_observer.ts
   L245-247/281-289/1063-1082/1123 + core L497-538); enforcement algorithm
   marked unverified (live behavior only).
5. **Compaction / summarize** — built on vendored A/B/C + keep-semantics:
   our two triggers (tool SELF/CROSS + context_recovery overflow hook,
   AWAITED-safe rationale), v1 summarize active path + body-requires-pair,
   #99 keepTokens resolution order (computed → budget → none) as it stands,
   `keep` UNDOCUMENTED (types.gen.d.ts L2175-2186 spot-verified today), live
   compaction config (L47-58 + maintainer 2026-09-25 comment), 2026-09-25
   retention measurements, summarizer-model resolution (agent.compaction.
   model commented out → own model), budget/COMPACT-line verification,
   pre-compaction dump, the two unused experimental compaction hooks (+
   upstream semantics), v2 SDK endpoints.
6. **Tool registration** — both paths: file-named `.opencode/tools/*.ts`
   (no `name`, filename = tool name; live set of 6) and plugin-registered
   `tool: {…}` (client-capture rationale); `tool()`/ToolContext shapes from
   the installed tool.d.ts; live tool-context dump pointer (callID/extra are
   live-more-than-static); BOTH load-error anomalies carried as dated facts
   (repo_overview 2026-09-24) — with the intercept_observer_core root cause
   identified today (no default export, only named exports); restart-gated
   activation; no-`node:sqlite` note.

## Locators spot-checked (beyond the full reads of the three small .d.ts)

- types.gen.d.ts L2175-2186 (SessionSummarizeData body = {providerID, modelID})
- ctx_watchdog.ts L719-732 (return block + deferredDeliver L440-465)
- auto_resume.ts L1698-1716 (return block), L695-718 (create/promptAsync)
- compact_memory.ts L794-804 (tool registration), L450-474 (dump)
- context_recovery.ts L613-728 (event-only return, full handler)
- intercept_observer.ts L240-289, L1055-1128 (R8 + return block)
- intercept_observer_core.ts — `rg "export default"` → none (root cause)
- opencode.jsonc L1-80, L236-355 (permission/compaction/agent blocks)
- DB schema via `node .opencode/agent/scripts/db/probe_schema.cjs` (read-only)

## Upstream fetches

ONE, bounded: https://opencode.ai/docs/plugins/ (last updated Sep 25, 2026).
Used for: load order, the `plugin` npm array, plugin dir names (`.opencode/
plugins` plural), the event list, app.log shape, compaction-hook semantics
(output.prompt replaces entirely; context ignored), plugin-tool name
precedence. Every such line is marked "upstream (not installed-verified)" in
the map. No other page crawled.

## Marked unverified (in the map's closing section)

1. host-side permission enforcement algorithm / ask flow (live behavior only)
2. per-session `permission` column semantics (session/session_v2)
3. per-hook execution priority beyond plugin load order
4. whether `.opencode/plugins/` (plural) is also scanned on this host
5. the #99 formal fork-test line (superseded by the 2026-09-25 maintainer
   comment — kept as a stale-marker, not a pending item)
6. the stale 2026-09-12 "plugins-array-only" registration line

## Deliberately left out

- No re-derivation of any vendored deep-dive content (pointers + delta only).
- No DB `data`-column probing (shapes only from the vendored docs, per spec).
- No opencode.jsonc edits, no code edits, no gate runs, no live DB writes, no
  backend-inference traffic.
- The two load-error anomalies are DOCUMENTED as dated facts (repo_overview
  owns the FIX PENDING item) — no fix attempted (out of scope).

## Friction check (#53)

None material — the task spec's verified starting points all held; the one
surprise (intercept_observer_core's missing default export) was confirmed in
one grep and folded into the map, not a process friction.

Gauge (verbatim, before commit):
`SESSION=ses_f24bf71beffekwRYMtnlrWy5UG CTX=145241 (85%) REM=24759 | 5 compactions left`
