
## COMPRESSED 2026-09-15 (Part-2 cleanup, ses_f5d9e86a6) — verbatim section text (no-loss rule)

## 2026-09-11 (iteration 2; ses_f6eb9cab5ffebLGhxdSs8jBrGI) — maintainer prototypes landed; spec re-decomposed T1–T5; T1 launched
- **Start state:** HEAD `1db6743` (maintainer "permissions fix … prompts again");
  tree = his live loop-protocol edits (token flip `-->START`/`DONE<---`,
  rollover → planner-at-iter-1, looprunner read-only — since COMMITTED in
  `d69794d`); baselines carried 451 / ruff 0 / probe 63/63; the committed
  iter-1 Cycle-1+rename spec (`handover_task.md`) was the launch target.
- **Worker launches failed (both):** launch 1 → `context_length_exceeded`
  at the server (worker session `ses_f6eb68…` died at launch; -WARNING
  logged). Launch 2 → cancelled by the maintainer. Maintainer mid-run
  message: a prior worker run went into the context window 5–6 times then
  the loop stopped; the worker had done NO work — hung verifying everything
  via the npm files (the spec's SDK type-def verification step). **Directive:
  reduce the scope of each task.**
- **Maintainer prototypes COMMITTED (`d69794d` + `91ace30`):**
  - `.opencode/tools/compact_memory.ts` — the WORKING tool shape
    (`export default {tools:{compact_memory:{description, parameters
    (JSON-schema), execute}}}` — NO `tool()` constructor → the npm
    verification step is MOOT; build on the prototype, don't re-verify).
    Both knobs (`keepTokens`/`keepMessages` → `keep`), `sessionID` arg with
    `context.sessionId` fallback, result note + embedded directive SENTENCE
    (pointer only — the file list lives in the file, per the design).
    MISSING per the approved design: budget check, persisted budget state,
    COMPACT line.
  - `.opencode/plugin/context_recovery.ts` — `session.error` hook prototype
    (overflow message match → `session.compact` keep 30k/12 + `promptAsync`
    synthetic directive → `{handled:true, action:"retry"}`). MISSING:
    DEFAULT EXPORT (named `EmergencyCompactionPlugin` → currently inert,
    not auto-loaded), shared budget with the tool, informed keep, activation
    flag (default OFF), over-budget clean fail.
  - `.opencode/system_prompts/agent_readme_post_compaction.md` — the
    re-application directive file, VERBATIM vs the approved proposal block
    (planner diff-checked). The proposal's path line now names HIS filename
    (his edit in `91ace30` — canonical; the old spec's
    `post_compaction_reapply.md` name is superseded).
  - Loop-protocol files + `opencode.jsonc` (looprunner write access
    commented out) committed.
  - Proposals reordering: P01 + the 260910 pair → `implemented/`
    (maintainer's move; `log-profile-rebaseline.md` still sits in
    `approved/` although already executed — folder moves stay
    maintainer-side, no action).
- **Baselines re-verified at `d69794d` (measured):** probe **63/63**,
  pytest **451 + 1 #10 warning**, ruff **F=0**. Live `handover_v2.4`
  reference set: probe `:2` + `:183`, gauge `:4` — NO config reference →
  the rename stays repo-side only.
- **RE-DECOMPOSED (reduced scope per the maintainer directive; order):**
  T1 plugin rename (spec committed with this block; `plan2_t1_ho_task.md`);
  T2 ctx.log tool-name field (+ probe checks); T3 tool completion (≤2
  persisted budget + COMPACT line + result note — shape per the maintainer
  prototype); T4 standing trigger rule in the 3 acting role prompts (ONE
  short block each); T5 recovery-plugin completion (default export, shared
  budget, informed keep, activation flag default-OFF, over-budget clean
  fail). The Cycle-2 live acceptance (-WARNING on a REAL sub-agent
  overflow) lands at the next maintainer process restart. The superseded
  full spec stays in the loop folder as `plan2_ho_task_superseded.md`.
- **T1 LANDED + verified (`6ea76ed`, worker_Q4_120K fresh session, clean
  run at 41 %):** commit scope = exactly the 4 spec files (renamed plugin
  with the 1-line header note, probe `:2`/`:183`, gauge `:4`, summary);
  gate re-measured BY ME: probe **63/63**, pytest **451 + 1 #10 warning**,
  ruff **F=0**; `git grep handover_v2\.4` → only the intentional header
  note + historical records. Accepted worker notes: (a) spec path
  shorthand `proposals/` = `.opencode/proposals/` — future specs use full
  paths; (b) the T1 spec rode the NEXT bookkeeping commit (launched
  before its commit — my ordering deviation, recorded).
- **Loop-protocol note:** my log lines use the NEW tokens
  (`-->START`/`DONE<---`) to match the maintainer's committed token list +
  the looprunner's live lookup; the stale examples in
  `agent_readme_loop.md` (planner-owned file) fixed in this commit — doc
  fix, pre-approved class.
- **T2 LANDED + verified (`6fca6bb` + worker bookkeeping `dd41f36`,
  worker_Q4_120K fresh, clean run at 54 %):** plugin diff = exactly the
  tool-name field (`appendCtxLog(modelId, tool, readout)`, omit-when-empty)
  + header comment; chosen line shape (T3 must match):
  `<stamp>[ <modelId>][ <tool>] <readout>`; gate re-measured BY ME: probe
  **65/65**, pytest **451 + 1 #10 warning**, ruff **F=0**; worker's loop
  log lines use the NEW tokens correctly. Accepted worker note: only probe
  checks 54/55 were byte-exact on the ctx.log format (my spec said
  54/59-63 — the 59-63 checks assert delivery, not the line bytes).
  PRODUCTION TAIL: live ctx.log lines keep the OLD format until the
  maintainer's next process restart (in-process staleness, expected —
  same as the P02 saga).
- **MAINTAINER DRAFT FOLDER appeared mid-run:**
  `proposals/maintainer/inbox_planner/draft/block_transfer_tool/`
  (`2026-09-11-20-05.md` + `block_tansfer_v2.ts`) — a token-saving
  `block_transfer` tool concept (move/copy a text block between files by
  start/end markers). Per the draft README: HIS live folder, NO action
  unless he moves it to `inbox_planner`; noted for feedback when idle.
  (Potentially useful for context economy — large file relocations burn
  tokens; watch for its inboxing.)
- **T3 LANDED + verified (`ccfedfc`, worker_Q4_120K fresh, clean run;
  worker stopped at ITS stop line 96 %):** gate re-measured BY ME: probe
  **74/74** (new S10 checks 67-75, sandboxed fake client, disk-persistence
  proven via cache-busted re-import), pytest **451 + 1 #10 warning**,
  ruff **F=0**; tool file read through by me — budget = JSON store
  `.opencode/temp/compact_budget.json` (≤2/session, success-only
  increment, gate BEFORE the compact call, hand-over refusal note);
  COMPACT line `<stamp>[ <model>] COMPACT <sid> tokens=<t> messages=<m>
  [ (<pre-readout>)]` (model/pre-readout best-effort from `context` —
  the SDK ToolContext declares neither → both omitted in production
  until the host provides them; session id + params always present);
  ACCEPTED adjacent FIX: the prototype's directive path separators were
  JS escape sequences (`\s`/`\a`) silently stripping the pointer — now
  escaped (sentence unchanged).
- **Curation:** worker's T3 inbox flag → **TODO #51** (stale probe header
  vs `package.json` "type" field — maintainer call; facts verified by
  me: the file carries `"type": "module"`); inbox trimmed to a pointer.
- **STOPPED at the stop line (90 %/11K) — wind-down, not done.**
- **NEXT (iteration 3, in order):** T4 standing trigger rule in the 3
  acting role prompts (ONE short block each — design text is in the
  approved proposal L3; SMALL, planner-direct candidate); T5
  recovery-plugin completion on the maintainer's
  `context_recovery.ts` (default export, shared budget FILE with the
  tool, informed keep, activation flag default-OFF read from config,
  over-budget clean fail); then Cycle-2 live acceptance at the next
  maintainer process restart (real overflow → -WARNING). Standing
  maintainer calls: the 2 proposals at the `proposals/` root (FST
  behavior batch + contradiction block) + new #51.
