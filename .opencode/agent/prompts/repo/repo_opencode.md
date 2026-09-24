# repo_opencode — opencode host specifics (need-to-know index)
Keep this an INDEX: short facts + pointers, not copies. The details live in
`.opencode/agent/knowledge/` (`opencode-plugins/` deep-dives + the area
files) — read those on need-to-know.

## Host paths
- Log: `C:\Users\Wasiejen\.local\share\opencode\log\opencode.log`
- npm install (opencode CLI): `C:\Users\Wasiejen\AppData\Roaming\npm`
- SDK type defs (installed): `.opencode\node_modules\@opencode-ai\sdk\dist\gen\`
  (types.gen.d.ts = the `Event` union + the error classes; the plugin hooks
  are in `@opencode-ai/plugin` dist/index.d.ts — `event?: (input: { event:
  Event }) => Promise<void>`, notification-only).
- Live config: `opencode.jsonc` (repo root) — the agent roster, permissions,
  the compaction defaults block. LIVE-edited by the maintainer: verify the
  roster before a delegation; never stage/flag his live files.

## Plugins (ours)
- Auto-loaded from `.opencode/plugin/*.ts` — there is NO registration key in
  opencode.jsonc (measured: zero `plugin` hits in the file); the folder IS
  the registration (a file move in/out of `deactivated/` = activate/deactivate).
- Smokes: `.opencode/plugin/tests/`; the probe:
  `.opencode/plugin/probes/handover_probe.mjs`.

## Behavior index (pointers, need-to-know)
- Plugin architecture + the v1 SDK shapes (the `{ data }` unwrap, the
  `summarize` vs `compact` client surface, the `Event` union):
  `knowledge/opencode-plugins/` (surface report + deep-dives A/B/C) +
  `knowledge_tools.md`.
- Compaction mechanics (budgets, keep, dumps, the auto-resume interplay):
  AGENTS.md `# Compaction Guidelines` +
  `.opencode/maintainer/draft/compaction_guide/full_guide.md`.
- auto_resume internals (units, scope, the spawn/restart path): TODO
  #75/#85/#90/#91 + `knowledge/opencode-plugins/auto-resume-*`.
- The single backend slot: NEVER launch raw inference-server requests — all
  model traffic via opencode sessions (`knowledge_tools.md`).
