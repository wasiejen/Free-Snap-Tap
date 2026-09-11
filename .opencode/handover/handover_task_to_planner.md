# EXECUTIVE SUMMARY — T3: `compact_memory` tool completion (L2, approved `2026-09-11_compaction-lifecycle.md`)

**Outcome:** DONE — the prototype is complete per the approved design: persisted
≤2-per-session budget + the tool's own COMPACT line + result/pointer/refusal notes.
All DoD checks green (measured pre-commit; the single task commit carries this file).

## Budget-store mechanic + path (RECORDED per spec)

- **Mechanic: a small JSON state store** (not sqlite — the minimal host-independent
  option; the probe host is plain node and the store is a ~3-line read/increment/write,
  no query surface needed. T5's emergency hook shares the store **by file**).
- **Path:** `<root>/.opencode/temp/compact_budget.json`, shape:
  ```json
  { "version": 1, "maxPerSession": 2,
    "sessions": { "<sid>": { "count": <n>, "updated": "<iso ts>" } } }
  ```
- Rules: ≤2 per session id, **self + emergency combined**; **increment on SUCCESS
  only** (a failed compact consumes nothing); exhausted → the hand-over refusal note,
  **no** `session.compact` call. The increment is **re-read-then-write with no await
  between** (the only interleaving-safe sequence for a file shared with the future T5
  hook in-process). Missing/corrupt store → treated as fresh (never throws).
- **Root resolution:** `context.directory` if the tool context carries it (the SDK
  `ToolContext` declares it; the probe passes the sandbox) — else **self-location**
  (the tool file always lives at `<root>/.opencode/tools/compact_memory.ts`), which
  keeps it cwd-independent in the real opencode host.

## Final COMPACT line shape (RECORDED per spec)

```
<YYYY-MM-DD_HH-MM>[ <modelId>] COMPACT <sessionID> tokens=<t> messages=<m>[ (<pre-readout>)]
```
- Appended by the tool to `.opencode/temp/ctx.log` (in-process `appendFileSync`,
  `mkdir -p`, wrapped in try/catch — **never throws**). Same local-stamp +
  omit-when-empty convention as the T2 line.
- `<t>`/`<m>` = the keep knobs actually passed to `session.compact` (args or the
  prototype defaults 30000/12); `<sessionID>` = the resolved target (arg or the
  `context.sessionId` fallback).
- Samples (probe-verified byte-shapes):
  - `2026-09-11_21-05 probe-model-120K_MTP COMPACT ses_cm_line tokens=50123 messages=9 (87%/52K)`
  - `2026-09-11_21-05 COMPACT ses_cm_bare tokens=1 messages=1` (model + pre-readout omitted)

## Verified `context` fields (RECORDED per spec)

- **In the probe (fake context):** `client` (captures `session.compact`), `sessionId`,
  `directory` (sandbox steering), and the optional best-effort `modelId` +
  `preReadout`. All six spec'd behaviors verified against it (checks 67–75).
- **Best-effort (omitted when absent, never thrown):** model id from
  `context.modelId` (string) else `context.model.id`; pre-readout from
  `context.preReadout` (string, wrapped in parentheses on the line). The SDK's
  `ToolContext` (`@opencode-ai/plugin` 1.18.29) declares **neither** a model id nor a
  readout — so in the real opencode host these fields will be **omitted** from the
  line (best-effort by design); the line always carries stamp + `COMPACT <sid>
  tokens=<t> messages=<m>`.
- **Session id:** the prototype's working shape `context.sessionId` is kept as the
  primary fallback; I added `context.sessionID` as a SECONDARY fallback (the SDK
  types use that spelling) — a one-token defensive extension, recorded here.
- A missing/unresolvable session id returns a failure note (never throws).

## What changed

- `.opencode/tools/compact_memory.ts` — built ON the prototype (export shape, arg
  names `keepTokens`/`keepMessages`/`sessionID`, and the
  `context.client.session.compact({path:{id}, body:{keep:{tokens,messages}}})` call
  shape all unchanged):
  - budget gate BEFORE the compact call; `recordSuccess` AFTER it;
  - the COMPACT-line append after success (shape above);
  - success note = the prototype's sentence + `kept last <N> messages / <T> tokens`
    + the unchanged directive pointer; refusal note = "Compaction refused: … budget
    … exhausted … **Hand over and start fresh** — …"; error note = the prototype's
    `Compaction request failed: <msg>`.
  - **FIX (in-scope, prototype bug):** the directive template literal's single
    backslashes were JS escapes (`\s`, `\a`) that **silently stripped the path
    separators** from the emitted pointer (runtime string became
    `.opendocesystem_promptagent_readme_post_compaction.md`). Now escaped — the
    sentence is unchanged; probe check 75 pins the correct pointer.
- `.opencode/plugin/probes/handover_probe.mjs` — NEW **S10** section (checks
  **67–75**, sandboxed fake client + fake context, tool imported DIRECT /
  type-stripped): import+exposure / passed-through keep knobs /
  `context.sessionId` fallback / COMPACT line with + without the best-effort fields /
  budget 2-allow-3rd-refuse-no-call / **disk-persistence proven by a cache-busted
  re-import** (fresh module instance still refused) / failing-compact no-throw +
  no-budget-consumption / pointer + hand-over notes. Header block (EXTENDED line,
  S10 WHAT-IT-RUNS, EXPECTED OUTPUT 65→74) and check 43's fingerprint list
  (`ses_cm_*` ids) updated.
- `.opencode/loop/autorun-2026-09-11_17-23/loop_log.md` — `-->START` line (this
  session) + `DONE<---` line with the final gauge readout.

## Verification (measured, pre-commit)

- `node .opencode\plugin\probes\handover_probe.mjs` → **`PROBE handover: 74/74
  PASS`**, exit 0 (N=74 > 65; baseline before the change was 65/65 green).
- `& .\.venv\Scripts\python.exe -m pytest -q` → **451 passed, 1 warning** (the known
  #10 warning — no FST code touched).
- `& .\.venv\Scripts\ruff.exe check --select F .` → **All checks passed (0 findings)**.
- S5 sandbox hygiene still green: zero writes outside the sandbox, plugin.log kind
  tallies unchanged (the tool section writes nothing to plugin.log), git status /
  .opencode listing unchanged during the probe run.

## TODO / discrepancy entries

- `TODO.md`: unchanged (no numbered entry touched; nothing to close).
- `todo_inbox.md`: one dated worker block appended — the probe header (line ~28)
  claims `.opencode/package.json` "has no 'type' field and must not gain one", but
  the file currently carries `"type": "module"` (stale header text vs code; out of
  my scope — the probe file's historical header I did not rewrite).

## Deliberately NOT done (per spec boundaries)

- T4 (role-prompt standing trigger rule) and T5 (the plugin recovery hook + shared
  enforcement at the hook level) — later tasks; the budget STORE is shared-ready
  (file-based, root-independent, re-read-increment).
- `opencode.jsonc` (left locally modified, NEVER staged), anything under
  `.opencode/proposals/maintainer/` (left untracked/untouched),
  `.opencode/plugin/ctx_watchdog.ts` + the probe's existing checks, FST python code.
- The proposal's live acceptance (a forked session self-compacting with explicit
  params) — that is the maintainer's live test; the probe covers the tool
  sandboxed. Git emitted the pre-existing LF→CRLF warning on the edited files
  (repo-wide checkout behavior, unchanged by this task).
