# todo_inbox.md — raw findings inbox

Drop zone for **worker** / **explorer** findings that are not confidently
fixable in-scope or are out of scope. Loose format: dated, role-tagged blocks,
**no numbering**, append only — no curation, no renumbering here.

- **Who writes:** worker/explorer — this is their APPEND target, NOT `TODO.md`.
- **Who curates:** the planner — curates into `TODO.md`, assigns the stable ID
  at curation time, then trims this inbox.
- Entry shape: `## <YYYY-MM-DD> — <role>` + problem/evidence + files + why it
  matters.

## 2026-09-10 — planner curation (iter 3)
- Worker block (2026-09-10) curated: the two `repo_map.md` findings → `TODO.md`
  **#50** (repo-map refresh; maintainer-owned file). The 02-03 loop.log item was
  already ruled in the NAP iter-2 block (separate prompt-only task; both file
  copies in `maintainer/done/`) — no further action.

## 2026-09-10 — worker (date-convention sweep)
- (curated iter 4, 2026-09-11) Process note, no repo file to fix: future sweep
  specs use a broader name-scan regex / lookaround (the `\b26\d{4}\b` DoD regex
  misses M-prefixed names). Recorded in the NAP iter-3 deviation block; not a
  TODO entry.

## 2026-09-11 — worker (T3, compact_memory)
- (curated 2026-09-11, iter-2) → `TODO.md` **#51** (stale probe header vs
  package.json "type" field — maintainer call).

## 2026-09-12 — worker (T5 re-verify)
- **Stale plugin comment (doc/code mismatch, out of T5 re-verify scope):**
  `.opencode/plugin/context_recovery.ts` lines 31-34 claim the directive
  constant is "byte-identical to the compact_memory tool's constant" — the
  committed plugin's `COMPACTION_RELOAD_DIRECTIVE` (lines 35-39) is NOT: it
  carries one extra line vs the tool (`.opencode/tools/compact_memory.ts`) —
  the looprunner continuation line ("If your role is Looprunner continue the
  last restart/resume close message of a Planner you have received."). The
  extra line was added by the T5 WIP-rescue build (9e173d1) and never
  verified (the probe's S10→S10 section was never run); the WIP probe had
  assumed byte-identity with the tool, so check 78 went red on first run.
  This re-verify aligned the PROBE to the committed plugin's runtime string
  (byte-verified, 297 chars); the plugin itself is out of scope ("the plugin
  is NOT changed by this task"). Decision needed: (a) fix the stale comment
  (pre-approved meta edit), or (b) make the directive byte-identical to the
  tool's (removing the looprunner line is an observable behavior change →
  needs maintainer approval). Files: `.opencode/plugin/context_recovery.ts`,
  `.opencode/tools/compact_memory.ts`, `.opencode/plugin/probes/handover_probe.mjs`.
- **Spec delta, no action (recorded per the spec's approval boundary):** the
  re-verify spec assumed the committed tool's `args` is a zod OBJECT (it
  prescribed `Object.keys(cmTool.args?.shape ?? {})` for check 67). The
  committed reality: `args` is a PLAIN object of NAME → zod schema (opencode
  tool() convention; `tool(schema.number())` etc. — no `.shape` member,
  `Object.keys(args.shape ?? {})` would be `[]`). The probe was aligned to
  the committed reality: `Object.keys(cmTool.args ?? {})` + a per-value
  `safeParse` guard. The committed tool otherwise matches the spec's
  assumptions (default export = `{description, args, execute}`; arg names
  keepTokens/keepMessages/sessionID; budget store / COMPACT line / directive
  strings unchanged from T3).
