# TASK T5 — recovery-plugin completion (Cycle 2, L4 + L5, approved: `.opencode/proposals/approved/2026-09-11_compaction-lifecycle.md`)

FIRST read `AGENTS.md`, `agents_repo.md` (+ the repo parts it names as
needed), this file, the L4/L5 sections of the approved proposal, and the
maintainer's prototype `.opencode/plugin/context_recovery.ts` (54 lines —
the working shape). MEDIUM task: complete the prototype into a live
plugin. Do NOT rewrite from scratch — the export shape below and the
prototype's handler/call shapes are the reference; build on them, never
re-verify the SDK from the npm type defs.

## Goal

Make `.opencode/plugin/context_recovery.ts` a LIVE opencode plugin: on an
overflow `session.error` → (activation flag ON) → budget-gated compaction
with informed keep → synthetic re-application directive → retry. Default
OFF. Over-budget → clean fail (the session error propagates; the
looprunner's `-WARNING` is the planner/looprunner's job, not the
plugin's).

1. **Default export (the plugin is currently INERT):** the live reference
   shape is `.opencode/plugin/ctx_watchdog.ts` (its tail, lines
   707-720): `export default (async (input: PluginInput) => { …; return
   { "session.error": <handler> }; }) satisfies Plugin;` — the factory
   captures `input.directory` (root) + `input.client`; the handler keeps
   the prototype's `(error, context)` shape with `context.sessionId` +
   `context.client`. The named `EmergencyCompactionPlugin` export is
   retired. `import type { Plugin, PluginInput } from
   "@opencode-ai/plugin"` — type-only, stripped by node's native type
   stripping (the live plugin + the S10 tool import rely on exactly this).
2. **Activation flag (L5):** read `<root>/opencode.jsonc` per hook fire.
   Top-level BOOLEAN key `emergencyRecovery`; ONLY the value `true`
   enables. Missing file / missing key / any other value / unparseable →
   OFF (the experiment-phase default — the visible hard stop). JSONC
   handling: strip `//` line + `/* */` block comments (string-aware) then
   `JSON.parse`; any failure → OFF. OFF + overflow → the hook does
   NOTHING (returns unhandled: no compact, no retry).
3. **Budget (shared with the tool by FILE):** the store is the SAME file
   the tool uses (verified in `.opencode/tools/compact_memory.ts`):
   `<root>/.opencode/temp/compact_budget.json`, shape `{ "version": 1,
   "maxPerSession": 2, "sessions": { "<sid>": { "count", "updated" }
   } }`. Gate BEFORE the compact call: exhausted (count ≥ 2) → CLEAN
   FAIL — no compact, no directive, return unhandled, no budget change.
   Increment on SUCCESS only, re-read-then-write (no await between the
   read and the write — the tool's comment explains why).
4. **Informed keep:** `keep: { tokens: 30_000, messages: 12 }` as module
   constants with a comment: the design's measured rebuild profile
   (system prompt <10K + keep ≈30K + last 12 messages ≈ 31.7K) — this
   replaces the host's blind opencode.json default; the prototype's
   stale inline comment ("10,000 tokens") is wrong and goes.
5. **On success** (compact resolved): increment the budget file + append
   the COMPACT line to `<root>/.opencode/temp/ctx.log` (shape verified
   from the tool: `<stamp>[ <model>] COMPACT <sid> tokens=<t>
   messages=<m>[ (<pre-readout>)]` — model/pre-readout best-effort from
   the hook context, OMITTED when absent, never throw) + `promptAsync`
   the synthetic directive.
6. **The directive:** the prototype's directive text has the SAME escape
   bug T3 fixed in the tool (unescaped backslashes in the template
   literal — JS strips them; verified at prototype line 4). Use the
   tool's directive string (`.opencode/tools/compact_memory.ts` lines
   19-21, escaped) — byte-identical to what the tool emits.
7. **Header comment block** (the live-plugin version-record convention):
   what this is, the L4/L5 pointer, the flag key name, the keep
   rationale.

## Probe extension

`.opencode/plugin/probes/handover_probe.mjs` — new S11 section (copy the
S10 sandbox pattern: direct type-stripped import of the `.ts`, fake
client RECORDING `session.compact` / `session.promptAsync` calls,
sandbox root, pre-seeded / cache-busted store for persistence):
1. the file imports and exposes a default factory whose returned hooks
   object carries `"session.error"`.
2. flag OFF (no `opencode.jsonc` in the sandbox) + overflow error → no
   compact, no promptAsync, unhandled.
3. flag ON (fixture `opencode.jsonc` carrying the key AND real `//`
   comments — proves the JSONC path) + overflow + fresh budget →
   `compact` called with EXACTLY keep `{30_000, 12}`; `promptAsync`
   directive byte-matches the tool's string; budget file count=1 ON
   DISK; return `{ handled: true, action: "retry" }`.
4. flag ON + overflow + pre-seeded exhausted budget (count=2) → no
   compact, no promptAsync, unhandled, budget unchanged.
5. flag ON + NON-overflow error → no-op.
6. the COMPACT line is present in the sandbox `ctx.log` after the
   success case (stamp + `COMPACT <sid> tokens=30_000 messages=12`),
   ABSENT after the refusal.
Report the final total probe check count in your summary.

## Do NOT touch

- `ctx_watchdog.ts`, `compact_memory.ts`,
  `.opencode/system_prompts/agent_readme_post_compaction.md` (canonical
  verbatim), the live `opencode.jsonc` (read-only for the plugin; it is
  uncommitted by design — NEVER stage it), FST python + `tests/`, the
  role prompts, the NAP, anything under
  `.opencode/proposals/maintainer/`, the loop folder.

## Definition of done

1. `node .opencode\plugin\probes\handover_probe.mjs` →
   `PROBE handover: N/N PASS`, exit 0; the S10 checks 67-75 UNCHANGED
   (the tool file is untouched).
2. `& .\.venv\Scripts\python.exe -m pytest -q` → 451 passed + 1 known #10
   warning (no FST code touched).
3. `& .\.venv\Scripts\ruff.exe check --select F .` → 0.
4. `context_recovery.ts` has exactly ONE default export; the named
   `EmergencyCompactionPlugin` is gone; its directive string
   byte-matches the tool's.
5. ONE commit: the plugin + the probe + the summary file + your
   `TODO.md`/`todo_inbox.md` entries (if any). Summary
   (`.opencode/handover/handover_task_to_planner.md`): what changed,
   measured probe/pytest/ruff lines VERBATIM, commit hash, final probe
   count, the flag key + keep constants documented, what you deliberately
   did NOT do. Follow the AGENTS.md commit routine (gauge check after
   commit; your loop-log START/DONE lines per the protocol).

## Approval boundary

Pre-approved by the approved proposal (meta-only: the plugin + probe;
no observable FST change; no edit of `opencode.jsonc` — the plugin only
READS it; the flag defaults OFF). If you hit a genuine design fork the
proposal doesn't answer, pick the minimal option, RECORD it in your
summary, and flag it in `todo_inbox.md`.

## Worker

`worker_Q4_120K` (fresh session).
