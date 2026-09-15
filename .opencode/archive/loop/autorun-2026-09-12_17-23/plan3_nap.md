
## COMPRESSED 2026-09-15 (Part-2 cleanup, ses_f5d9e86a6) — verbatim section text (no-loss rule)

## 2026-09-11 (iteration 3; ses_f6e137295ffeH81n9i8wLI3cz7) — T4 landed (planner-direct); T5 spec/launch
- **Start state:** HEAD `f3dd195` (iter-2 close); tree = `opencode.jsonc`
  (maintainer, uncommitted by design) + UNTRACKED `.opencode/proposals/
  feedback/2026-09-11_planner-task-scope-reduction.md` (my own iter-2
  feedback proposal — a NEW top-level `feedback/` folder alongside the
  old `maintainer/feedback/`; committed here as bookkeeping, folder
  structure NOT moved — his call) + `draft/block_transfer_tool/` (his live
  draft folder — no action unless inboxed). `--main`/`--maintainer` grep:
  **0 hits**. `inbox_planner/`: draft folders only, no direct items.
  Baselines carried from iter-2 measured: probe **74/74**, pytest
  **451 + 1 #10 warning**, ruff **F=0**.
- **Protocol note:** iter-2 never wrote the `-RETURN-` line for the T3
  worker (`ses_f6e3ee3ffe9D3uMpx9aR0VQ4`) before its own DONE (21-11) —
  noted retroactively as an INFO line in the loop log (append-only, no
  curation).
- **T4 LANDED (planner-direct, this commit):** the L3 standing trigger
  rule — exactly ONE short `## Context-budget trigger (L3)` block in each
  of the 3 acting role prompts (`prompt_agent_planner.md` after
  `Delegate vs. do`, `prompt_agent_task.md` after `Work loop`,
  `prompt_agent_explorer.md` after `Work loop`; looprunner untouched —
  mechanical role). Design text = the approved
  `2026-09-11_compaction-lifecycle.md` L3 verbatim, role-adapted only in
  the keep-point (worker: task spec; planner: last verified NAP state;
  explorer: last verified finding state) + the refusal→handover tail
  (design: budget exhaustion routes into the stop-line/handover
  protocol). NO proposal path inside the blocks (move-robust). Loop log
  START+INFO written. Meta-only (prompts + log) — FST gate untouched;
  will re-verify at the T5 landing.
- **T5 spec committed** (`39ffb39`) + copied to the loop folder as
  `plan3_ho_task.md`; launch saga: launch-1 (`worker-3` session
  `ses_f6e042f6effe62A9iDbtoxFI7M`) reported a server-side
  `context_length_exceeded` at launch, BUT the session actually ran
  (files written 21:58/22:24) and produced a near-complete T5 build
  (296-line `context_recovery.ts` + probe S10/S11) before dying at the
  context limit (no self-compact — the tool was not live yet); launch-2
  (my slimmer retry, session `ses_f6de1d7fdffeZEJWEXNWCrrZnp`) was
  cancelled by the maintainer.
- **Live test results (maintainer-ordered, his instructions `260911-2
  27.md` + note `2026-09-11-_22_-27.md`, both handled → `done/`):**
  (a) `compact_memory` was NOT in any agent toolset before his rewrite
  (tested via a fresh subagent — also absent there); (b) he then
  live-rewrote the tool to the `tool()` import form (his uncommitted
  `compact_memory.ts`, 101-line diff) — now visible to agents but the
  call FAILS: `context.client.session` undefined in the tool env (no
  session client wired into custom tools — maintainer domain); (c) the
  `context_recovery` plugin did NOT fire on the overflow (it is loaded
  via `opencode.jsonc` `plugins:`; host hook dispatch needs
  investigation — maintainer domain); (d) resuming the at-limit
  `ses_f6e042...` session fails (`request exceeds the available context
  size`) — resuming an at-limit session is not a recovery path; (e)
  the maintainer compacted MY session live: 90%/11K → 30%/83K — **L2
  acceptance LIVE PASS** (explicit `sessionID` param worked server-side).
- **T5 work state (WIP rescue committed):** S10 code unchanged since T3
  (proven 74/74 vs the committed T3-shape tool file at HEAD); S11
  UNVERIFIED — the probe cannot run to completion in the live tree
  because the maintainer's uncommitted tool() rewrite breaks S10 check
  67 (export shape) and crashes the probe before S11. Committed as an
  explicit WIP rescue (subject says WIP/unverified) — next session
  re-verifies S10+S10→S11 after his tool file stabilizes, then converts
  to the proper task commit.
- **Maintainer commits during this iteration (his calls, recorded):**
  `3d4cfe2` (block_transfer draft), `5c07ba3` (activation prep:
  `opencode.jsonc` `plugins:`+`tools:` keys, `block_transfer.ts`
  landed, planner-prompt index line for `agent_readme_task_spec.md`),
  `9d514d1` ("Got custom tools running in opencode + draft save" — the
  committed `compact_memory.ts` is still the T3 shape; his tool()
  rewrite remains UNCOMMITTED in the tree — do NOT stage it).
- **Protocol:** the maintainer adopted my iter-2 task-spec-discipline
  feedback proposal as `agent_readme_task_spec.md` (new system_prompts
  file, referenced by the committed planner prompt) — committed in this
  iteration's bookkeeping. His live files to leave untouched:
  `compact_memory.ts` (uncommitted rewrite), `opencode.jsonc` (NEVER
  stage), the `draft/` folders (block_transfer_v2, revert_to_message,
  the name-mangled `260911-<corrupt>_21-50.md`).
- **NEXT (iteration 4, in order):** 1. Re-verify T5 (probe S10+S11,
  pytest 451+#10, ruff F=0) once the maintainer's `compact_memory.ts`
  stabilizes/commits — align S10 to the final tool shape first if it
  changed; then convert the WIP to the task commit. 2. Cycle-2 LIVE
  acceptance still pending: a REAL sub-agent overflow → the recovery
  plugin firing (it did NOT fire — needs the maintainer's host
  investigation) → informed compaction + directive → continuation, OR
  budget-exhausted clean fail + `-WARNING`. Standing maintainer calls
  (unchanged): the 2 proposals at the `proposals/` root (FST behavior
  batch + contradiction block) + TODO #51 (stale probe `"type"` field).
  Baselines carried: probe 74/74 (at HEAD, T3-shape tool file), pytest
  **451 + 1 #10 warning**, ruff **F=0**.
