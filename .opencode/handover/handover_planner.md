# HANDOVER PLANNER — Phase 6 (post-T1; autonomous-loop era)

FIRST read AGENTS.md, agents_repo.md, TODO.md, this file.

## 2026-09-12 (iteration 7; ses_f6cee5235ffeTa34Ob0pHMrmg6) — maintainer rulings landed; compact_memory v2 integrated (maintainer marker, planner-direct); FST batch delegated on the new `fst_work` branch
- **Start state:** HEAD `018c696` (iter-6 close) + maintainer commit `b74a2eb` (02:51, "commit drafts and moves into inbox and approval" — landed MID-SESSION, after my first `git status`): his rulings batch — the FST behavior proposal → `approved/` with ALL 5 Recs approved (## 5 = KEEP `fst_keyboard.py:302-303` "until I can test a bit more"); the looprunner-line proposal → `approved/` with a "-keep" ruling line; the 3 tool items moved draft → `inbox_planner/26-09-11_21-50.md` (INBOXED); NEW `inbox_planner/compact_memory_v2test.ts` carrying a `--maintainer:` PRIORITY marker (a more-robust session-context handling example); NEW `draft/one_shot_prompt.md` (his saved one-shot test prompts — draft-folder rule, left untouched). **Discrepancy (recorded, sole durable record here):** an uncommitted working-tree edit of the ROOT FST proposal (captured in my session diff, never committed — the canonical `approved/` copy lacks the line) carried the explicit instruction "create a new branch for these edits (e.g. fst_work) or something more discriptive". HONORED: branch `fst_work` created from the iter-7 meta commit on `opencode_test`. If he did NOT want the branch: the work product is identical — rebase/merge it away.
- **Maintainer marker HANDLED (planner-direct, this commit):** `.opencode/tools/compact_memory.ts` **v2** — session id from MULTIPLE sources (arg → context.sessionId → context.sessionID → context.session.id), client from context.client → context.api, + LOCAL HTTP fallback `POST http://localhost:<OPENCODE_PORT|4096>/api/session/compact` when no client exposes `session.compact` (endpoint shape per the v2test — the live acceptance is his host domain); all args now `.optional()` (the v2test shape — makes the fallbacks reachable in the host) + the sessionID description copy-paste bug fixed (it said "messages to retain"). ALL T3 mechanics untouched (budget gate before the compact call, COMPACT line, directive, return strings). GATES measured by me: probe **80/80 PASS, exit 0** (committed shape invariant — the probe's fake client always exposes `session.compact`, so the fallback path is NOT probe-pinned: gap recorded, NO probe check added — adding one would renumber checks 76-81, which the KEEP proposal + this NAP reference); scratchpad smoke **6/6 PASS** (no-client path never throws + compact-related note, budget untouched + no COMPACT line on failure; `context.api` and `context.session.id` sources honored).
- **Ruling bookkeeping (this commit):** looprunner-line proposal → `implemented/` with the KEEP verdict (its acceptance clause; runtime string + probe check 78 unchanged); `compact_memory_v2test.ts` → `maintainer/done/` with a replier comment block (its marker is historical now); staged the root deletions of BOTH moved proposals (adopting his moves); TODO.md: maintainer-calls item 4 RESOLVED + #1/#7/#8/#9/#4 Status = RULING/IN PROGRESS on `fst_work`; #6 = CLOSED by the ruling (KEEP).
- **FST batch DELEGATED:** `fst_work` created from the iter-7 meta commit. Unit A = TODO #1 (vk-error surfacing — the largest sub-build; P08-style user-visible error at every vk-resolution site, constraint path reuses it) — spec in `handover_task.md` (loop-folder copy `plan7_ho_task.md`), delegated to `worker_Q4_120K`. Unit B = the #7 + #9 + #4 small bundle (second worker, after A verifies). #6 OUT OF SCOPE (kept per ruling).
- **NOT DONE (stop-line discipline, REM≈12K at this commit):** the inboxed `26-09-11_21-50.md` UNHANDLED — the batch proposal for the 3 tool items NOT yet filed (needs fresh reads: `block_transfer.ts`, the gauge core `plugin/scripts/peek.mjs` + `gauge.mjs`, `agent_readme_loop.md` §Loop log + the role prompts' loop lines); the work is implicitly approved by him — file the batch proposal FIRST (ONE file, 3 independently-approvable parts, each with the intended implementation), then delegate. Tool registration itself is maintainer-host-side (the repo `opencode.jsonc` `tools:`/`plugins:` keys are commented out — his live file, never stage).
- **OPEN / maintainer-gated (carried):** the contradiction-block proposal at the proposals root (#11 HOLDING — his live `XXX 241016-1101` test) + TODO #51 (stale probe "type" field) + the 3 tool builds (implicit approval, proposals pending).
- Baselines: probe **80/80** (re-measured at the live tree after v2), pytest **451 + 1 #10 warning** (carried — meta-only, NOT re-run this commit), ruff **F=0** (carried — NOT re-run).
- **NEXT (iteration 8, in order):** 1. VERIFY/RESUME FST unit A on `fst_work` (gate = pytest 451 + the new pinning tests, ruff F=0, commit scope); then unit B (#7+#9+#4); when ALL sub-builds green → the approved FST batch proposal → `implemented/` with the verdict. 2. FILE the 3-item batch proposal (→ `approved/`, it is pre-approved) for the inboxed tool items + delegate the builds. 3. Standing: #51 + #11.

## 2026-09-12 (iteration 6; ses_f6d1d3627ffeSDD7HoxQuvlmCu) — T5 re-verified (probe 80/80, WIP→task commit `14af171`); maintainer directives landed (early-handover protocol, task-spec index trigger)
- **Start state:** HEAD `3f2d8e9` (iter-5 close) + maintainer commits `23babb9` (draft update) + `6ea8c2f` ("Commit tool to loop() change" — the tool() form of `compact_memory.ts` NOW COMMITTED; tree clean). T5 re-verify GATE MET (the committed file carries `export default tool(`; I read the whole file — shape matches the spec's assumptions except the args delta below). Launch-message maintainer points: (a) his "live" comment in the tool file means the tool is ACTIVE/LOADED into opencode — NOT "he actively works on it" (the call itself still fails in his host env: `context.client.session` undefined — maintainer domain); (b) add an early-handover protocol for planner + worker; (c) reminder to read `agent_readme_task_spec.md` before writing specs + explicit allowance to edit the planner prompt to make that loading more likely (prompt changes take effect next iteration).
- **Maintainer directives LANDED (my commit `733ff6e`):** (a) a `## Early handover` block in `prompt_agent_planner.md` + `prompt_agent_task.md`: readout ≥70 % — or the current/next unit clearly cannot finish before the stop line — → PAUSE, bring the handover fully current (planner: the NAP; worker: `handover_task_to_planner.md` marked IN PROGRESS) and COMMIT it, then continue. NO block for the explorer (not requested — his call if wanted). Effective from the next session. (b) Planner-prompt Instruction index: the `agent_readme_task_spec.md` line is now MANDATORY-pre-read for any task spec (typo fixed) + a pointer in the Delegate-vs-do spec bullet.
- **T5 re-verify LANDED + verified (worker-6 `ses_f6d164ae0ffev8jZTJg6zt7DIW`, clean run, stopped at its own stop line 88 %; task commit `14af171`, close `badf49a`):** gate verified at launch by the worker; probe S10 re-aligned to the committed tool() shape (check 67 export-shape + arg names, `cmTool` access, check 73 fresh-module execute, header); S10→S10 (checks 76-81) verified green for the FIRST time (never run at `9e173d1`); the WIP rescue `9e173d1` converted to the proper task commit (NOT rewritten). GATES MEASURED BY ME: probe **80/80 PASS, exit 0** (re-run again after the comment fix below — still 80/80), pytest **451 passed + 1 known #10 warning**, ruff **F=0**. Baseline clarification (worker's scripted count audit): the probe has 80 checks (75 literal + 5 dynamic S8 rungs; section sum verified); the carried "74/74" was the T3-era count (before the rescue added the 6 S10→S10 checks and updated the header to 80/80) — the header needed no reconciliation.
- **Spec delta ACCEPTED (recorded per the spec's approval boundary):** check 67's arg-name assert uses `Object.keys(cmTool.args ?? {})` + a per-value `safeParse` guard, NOT the spec's `args?.shape` — the committed `args` is a PLAIN object of NAME → zod schema (opencode tool() convention, zod 4.1.8), not a zod object. Everything else in the committed tool matches the spec (default export `{description, args, execute}`; arg names; budget store / COMPACT line / directive strings unchanged from T3). Spec-discipline lesson: verify the committed shape before prescribing probe access in a spec.
- **S10→S10 first-run finding + follow-up (this run):** check 78 went red on first full run — the plugin's `COMPACTION_RELOAD_DIRECTIVE` carries ONE EXTRA line vs the tool's directive: "If your role is Looprunner continue the last restart/resume close message of a Planner you have received." (added by the T5 WIP build, never verified; the approved design does NOT mandate byte-identity — it mandates the pointer at the re-application file). The probe was re-aligned to the committed plugin's runtime string (byte-verified 297 chars). FOLLOW-UP LANDED (planner-direct, pre-approved comment-only): the plugin's now-false "byte-identical" header comment fixed (runtime string UNCHANGED — probe stays green); the keep/remove decision for the looprunner line surfaced at `proposals/2026-09-12_recovery-directive-looprunner-line.md` (recommendation: KEEP — role-conditioned → inert for all other roles, matches loop semantics; removal is an observable behavior change → maintainer call).
- **Curation:** the worker's 2 `todo_inbox.md` items → pointers, no TODO.md entries (comment fix + proposal; spec-delta process note recorded here).
- **Minor finding (no action):** the worker's committed summary records the launch HEAD as `73ff6e` — the actual hash is `733ff6e` (one-char transcription; cosmetic, the summary is a historical record; the task hash is correctly recorded in the DONE line + close commit).
- **OPEN / maintainer-gated (carried):** the 2 root proposals (FST behavior batch + contradiction block) + TODO #51 (stale probe "type" field) + the NEW looprunner-line proposal + Cycle-2 LIVE acceptance (a real sub-agent overflow → the recovery plugin fires — it did NOT fire live; the hook dispatch + the tool's `context.client.session` gap are the maintainer's host domain; takes effect at his process restart / host fix).
- **MID-SESSION DISCOVERY (maintainer live-edited his draft file `proposals/maintainer/inbox_planner/draft/26-09-11_21-50.md` during this run — UNCOMMITTED, left untouched per the draft-folder rule; the file is NOT mine to stage):** it now carries THREE item specs, each with "(file a proposal with intended implementation)" + "implicitly approved to work on it (i am away for a while)": **#1** `block_transfer.ts` — add sandboxing (writing limited to the opencode working dir + temp dir, e.g. via the Windows TMP/TEMP env in the path checks), test extensively (use `agent_TempOnly` for testing if needed), + write/rewrite agent-facing usage instructions (the tool description if that suffices). **#2** wrap the peek/gauge readout into a SIMPLE TOOL agents can fire directly (observed ~15000-token difference vs the shell-out peek habit — "clean up the usage"). **#3** loop.log automation as a tool (args: role, model, status, content; auto-create the dated `loop/autorun-…/` folder if `loop/` is empty; usable by ALL agents without per-agent write-access management; the prompts' loop-tool-use text can be simplified). DEFERRED (his note): a unified location for custom-tool usage info (append-on-demand like the agent_readmes).
- **NEXT (iteration 7, in order):** 1. FILE PROPOSALS for the 3 draft-file items above (implicitly approved by the maintainer — file creation is the pre-approved channel; recommendation: ONE batched proposal file with 3 independently-approvable parts, each with the intended implementation; needs fresh reads: `block_transfer.ts`, the peek/gauge core (`ctxgauge/`, `handover_v2.4`/`ctx_watchdog.ts` delivery path), `agent_readme_loop.md` §Loop log + the role prompts' loop lines). 2. Then the standing maintainer-gated items remain blocked: the 2 root proposals + #51 + the looprunner-line proposal. If he rules REMOVE on the looprunner line: plugin constant + probe check 78 + the plugin header in one commit, probe green.
- Baselines carried: probe **80/80** (at HEAD, committed tool() shape), pytest **451 + 1 #10 warning**, ruff **F=0**.

## 2026-09-12 (iteration 5; ses_f6d394ee1ffeE49CoI3UdAUCbl) — T5 re-verify gate NOT met (compact_memory.ts still uncommitted); re-verify spec made execution-ready; loop blocked on maintainer
- **Start state:** HEAD `0c0de11` (iter-4 close); tree = the maintainer's UNCOMMITTED `compact_memory.ts` tool() rewrite ONLY — **confirmed UNCHANGED vs iter-4** (his own inline comment: "live right now but does not work: context.client.session undefined — maintainer host domain"); NEW untracked `inbox_planner/draft/wait_tool.md` (his DRAFT concept note for a "wait/sweep" agent tool — draft-folder rule, **no action unless he inboxes it**). `--main`/`--maintainer` grep: **0 live markers** (every hit = historical NAP text / the planner-prompt rule text / the draft-folder `block_transfer_tool` deferral note at `2026-09-11-20-05.md:97`). `inbox_planner/` = draft folders only (no direct items).
- **Gate re-checked — NOT met:** T5 re-verify stays blocked on the maintainer **committing** `compact_memory.ts` in the tool() form. Decisive point (carried, re-derived this run): re-aligning probe S10 check 67 to the tool() shape NOW would make the committed probe **RED at HEAD** (the committed `compact_memory.ts` is still the T3 JSON-schema shape → `default.tools.compact_memory`), violating the green-at-HEAD invariant; the probe also CRASHES against the live tool() form (check 68 `cmTool.execute` on an undefined `cmTool`). So the re-align + full probe run + WIP→commit conversion cannot land until his tool file commits.
- **Re-verify spec made EXECUTION-READY (planner-direct, this commit):** `handover_task.md` REPLACED the stale T5 **build** spec (its DoD "S10 checks 67-75 UNCHANGED" is wrong — the tool() rewrite breaks check 67) with a **re-verify** spec: a GATE (`git status` clean on `compact_memory.ts` + `git show HEAD:…` contains `export default tool(`; unmet → do NO work, report + stop) + the exact check-67 re-alignment (`cmTool = toolMod.default` at ~1409, the `parameters?.properties` arg assert → `Object.keys(cmTool.args?.shape ?? {})` at ~1415, the budget-check call site `freshMod.default.tools.compact_memory.execute` → `freshMod.default.execute` at ~1515) + full probe run (S10 + S10→S10, reconcile the stale header total) + pytest/ruff + the WIP→proper-task-commit conversion (`9e173d1` NOT rewritten). Meta-only, pre-approved.
- **Work assessment:** every open item is maintainer-gated — T5 (gate above), the 2 proposals at the `proposals/` root (FST behavior batch + contradiction block), TODO #51 (probe "type" field), #1/#7/#8/#9/#4/#6 (behavior rulings), #10 (HOLDING). **No delegateable work.**
- **Minor observation (re-verify scope, not a bug):** the probe header total-count comment (`handover_probe.mjs:241`, reads "80/80 PASS") is stale vs the carried 74/74 baseline — the re-verify reconciles it to the measured `N/N` when it runs the full probe.
- **NEXT (iteration 6):** when the maintainer **commits** `compact_memory.ts` (tool() form) → LAUNCH the re-verify spec (`handover_task.md`, fresh `worker_Q4_120K`), verify (commit scope + probe N/N + pytest 451/#10 + ruff 0), convert WIP→commit. Standing calls unchanged: the 2 proposals at the root + TODO #51.
- Baselines carried (meta-only run, FST gate NOT re-run; probe NOT re-run — the live tool() form crashes it at check 68): probe **74/74** (at HEAD, T3-shape tool file), pytest **451 + 1 #10 warning**, ruff **F=0**.

## 2026-09-12 (iteration 4; ses_f6d472e56ffeJUAKrfcs4BOjYN) — maintainer marker handled: block_transfer.ts → tool() form (planner-direct); T5 still blocked; early handover per maintainer
- **Maintainer directive for this run (launch block):** last handover was an emergency one (he live-compacted iter-3: 90%/11K → 30%/83K); check the gauge more often; do an emergency handover early. FOLLOWED — no worker launched, gauge checked between every chunk.
- **Start state:** HEAD `7edca3d` (iter-3 close); tree = the maintainer's UNCOMMITTED `compact_memory.ts` tool() rewrite only (his live file — left untouched, NOT staged); `inbox_planner/` = draft folders only (no direct items); `--main` grep: 0 live items; **`--maintainer` PRIORITY MARKER found at `block_transfer.ts:8`** ("needs to be translated from the non tool() format into this to be registered as plugin" + his open question: how does the `enum` of line 27 translate).
- **SDK fact (verified in `@opencode-ai/plugin` 1.18.29 `dist/tool.d.ts`, installed under `.opencode/node_modules/`):** `tool.schema` = the FULL zod namespace → **`tool.schema.enum([...])` is the enum answer** (his line-27 question, resolved); `tool({description, args, execute})` RETURNS `{description, args, execute}` — NO `name` field (the host names tools by FILENAME — proven by the maintainer's live `compact_memory.ts`, which carries no name and registers as `compact_memory`).
- **MAINTAINER MARKER HANDLED (planner-direct, this commit):** `block_transfer.ts` translated to the `tool()` form on the maintainer's live `compact_memory.ts` as the shape reference: marker comment block removed, `parameters` JSON-schema → `args` zod shape (`mode` = required `tool.schema.enum([...6 modes])`, the other 6 args `.optional().describe(…)` with the original descriptions verbatim), `name` dropped, `};` → `});`; **execute body byte-unchanged**. Planner-direct rationale: single file, mechanical once the SDK shape was verified inline, verified inline (the delegate threshold is for scope I could not verify in-session).
- **Verification (measured by me):** smoke script (scratchpad `bt_smoke.mjs`, Node-24 type-stripped import, behavior-based via `safeParse` — zod-internal-agnostic): **20/20 PASS** — shape (tool() result, no stale `name`/`parameters`, async execute, mode required+enum-gated, 6 optional args) + functional COPY→PASTE (target-marker + EOF paths), MOVE, empty-buffer error path, src/dst content checks. `git diff` scope = exactly the translation. Probe re-run at the live tree: **S10 check 67 FAIL + crash at check-68 setup (`cmTool` undefined)** — PRE-EXISTING (probe S10 targets the committed T3 `default.tools.compact_memory` shape; the live file is the maintainer's `tool()` rewrite), NOT caused by this change (`block_transfer.ts` is not probe-imported).
- **T5 state (unchanged, sharpens the re-verify spec):** re-verification stays blocked on the maintainer stabilizing/committing `compact_memory.ts` (its rewrite is still uncommitted + the call fails `context.client.session` undefined — maintainer host domain). NEW fact for the re-align spec: S10 check 67 + the downstream `cmTool` access (`toolMod.default?.tools?.compact_memory`) must be re-pointed at `toolMod.default` DIRECTLY (the tool() form's default export IS the tool); the budget-store/COMPACT-line/directive mechanics inside the rewrite (checks 68-75 targets) are UNCHANGED (read through this run).
- **Notes:** (a) the `--main:` line in `draft/block_transfer_tool/2026-09-11-20-05.md:97` is a deferral note inside the maintainer's DRAFT folder — no action unless he inboxes the folder (draft-folder rule). (b) Production tail: the translated tool takes effect at the maintainer's next process restart (tools load at startup) — same tail as T2/P02.
- **NEXT (iteration 5, in order):** 1. Re-verify T5 once the maintainer's `compact_memory.ts` stabilizes/commits — re-align S10 check 67 + access to the tool() shape, full probe run (S10 + S10→S11), then convert the WIP rescue to the task commit. 2. Cycle-2 LIVE acceptance (real sub-agent overflow → recovery plugin fires — it did NOT fire, hook dispatch = maintainer host domain) → informed compaction + directive → continuation, OR budget-exhausted clean fail + `-WARNING`. Standing maintainer calls (unchanged): the 2 proposals at the `proposals/` root (FST behavior batch + contradiction block) + TODO #51 (stale probe `"type"` field).
- Baselines carried (meta-only run, FST gate NOT re-run): probe **74/74** (at HEAD, T3-shape tool file), pytest **451 + 1 #10 warning**, ruff **F=0**.

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

## 2026-09-11 (new looprun, iteration 1; ses_f6ef5418effeloEwm4zr53XpXa) — approval moves landing; #17/#30/#35 closed; Cycle-1 + rename build
- **Start state:** HEAD `5a39c3f` (NAP disclosure commit); tree carried the
  maintainer's uncommitted approval moves: 3 proposals root → `approved/`
  (compaction-lifecycle / log-profile-rebaseline / plugin-scope-tool-rename)
  + new `inbox_planner/draft/README.md` (draft folder = HIS live folder —
  do not remove files; action items get moved to inbox_planner by him;
  optional read+feedback via `maintainer/feedback/`). `--main` grep: 0 hits.
  Baselines carried: **451 passed** / ruff F=0 / probe 63/63.
- **Rulings read:** (1) compaction-lifecycle = **both cycles approved** (his
  comment at the file tail); per its "On approval" clause,
  `plugin-scope-tool-rename` **item 1 (custom gauge tool) is RETIRED** —
  `compact_memory` is the first custom tool (the gauge tool would follow the
  same in-process pattern if still wanted). (2) The rename item (item 2) is
  approved (file in `approved/`); VERIFIED the proposal's "touches
  opencode.jsonc" note is stale — NO config references the plugin filename
  (repo opencode.jsonc has no plugin key; global `~/.config/opencode/
  opencode.jsonc` no match) → the rename is repo-side only. (3) log-profile
  rebaseline approved → the one-shot read is authorized.
- **Loop rollover (iteration 1 per §Loop folder):** `autorun-2026-09-11_13-24`
  → `archive/loop/`; new current looprun `loop/autorun-2026-09-11_17-23/`
  (machine-generated name) with loop_log v2 START line.
- **#17/#30/#35 CLOSED (planner-direct, this commit):** approved one-shot
  scoped read of `.opencode/plugin.log` post-base segment (base 1269 → new
  base **2474**): the three silenced types (`file.watcher.updated` /
  `file.edited` / `session.idle`) = **0** — the growth driver is gone;
  residual event lines are low-frequency lifecycle only (54 of 1205 lines:
  message.removed 25, session.created 13, session.error 12, session.compacted
  1, todo.updated 1, permission.asked/replied 1+1). #34 residual doc refs:
  live prompts + repo parts grep-clean; the AGENTS.md copy in
  `proposals/files/` is archived (folder empty); `playground/` residue stays
  (maintainer-personal, excluded per the date-sweep scope rule). Full entry
  text moved to `todo_records.md`; TODO maintainer-calls item 1 struck.
- **CYCLE-1 + RENAME SPEC committed** in `handover_task.md` (copy in the
  loop folder as `plan1_ho_task.md`), delegated to `worker_Q4_120K` per the
  approved `2026-09-11_compaction-lifecycle.md` build cycles + the approved
  rename: re-application directive file + `compact_memory` tool (both knobs,
  result note, directive pointer, COMPACT line, budget check) + ctx.log
  tool-name field + standing trigger rule in the 3 acting role prompts +
  plugin rename `handover_v2.4.ts` → `ctx_watchdog.ts` (+ probe/gauge refs)
  + probe extension. The maintainer's draft
  (`inbox_planner/draft/compact_memory/compact_memory.ts`) is a GENERIC
  SKETCH — the approved design supersedes it (knobs, file-pointer directive,
  budget, cycle split); the draft's `session.compact`/`promptAsync` call
  shapes are the reference for the SDK wiring. NOT in this task: the Cycle-2
  recovery path (session.error hook + activation flag + -WARNING verification).
- **STOPPED at the stop line (93 %, REM≈8K) — wind-down, not done:** the
  worker launch did NOT happen this session (starting the build past the line
  was a rule violation). The spec is committed + delegation-ready — iteration
  2 opens by LAUNCHING it per the committed spec (`handover_task.md`, copy in
  the loop folder), fresh `worker_Q4_120K` (maintainer rule: always a new
  agent, never a resume), then VERIFY (commit scope + probe N/N + gate 451/
  ruff 0 + spot-checks: rename grep-clean, directive file verbatim vs the
  proposal, 3 prompt blocks only, budget persistence mechanic recorded).
  Skipped as optional: the draft-folder feedback note (his README invites it
  when idle) + the probe-count check for the launch.
- **NEXT (iteration 2, in order):** 1. LAUNCH + VERIFY the Cycle-1 + rename
  build per the committed spec (above); 2. then Cycle 2 (recovery path:
  session.error hook, informed keep, synthetic directive injection, shared
  budget, over-budget clean fail, activation flag default-OFF, -WARNING
  verification) — spec needs fresh reads of the hook surface; 3. the live
  evidence (the tool actually compacts a session + the agent follows the
  re-application file) lands at the next maintainer process restart — the
  next run confirms from its own tool results. Standing maintainer calls
  unchanged (FST behavior batch + contradiction block = the 2 proposals still
  at the proposals/ root, awaiting his ruling).

## 2026-09-11 (same direct run, post-compaction chat segment; ses_f6fd8a0caffedqEYeUMCq0x12f) — compaction-lifecycle design agreed + proposal written
- Maintainer ran compaction experiments in this session (keep 30K tokens +
  last 12 messages; reverts to test agent memory). Key established facts:
  per-tool readout works agent-side, invisible in UI by design (ctx.log is
  the maintainer's window); no post-compaction injection or log entry
  exists in handover.ts (gap); sub-agent overflow auto-cuts the tail at the
  last tool call/thought block BEFORE compaction (no ghost residue), 4–5
  retries then clean fail; tail-cut ≡ revert ≡ handover situation (no
  observed degradation).
- Design agreed in chat (five layers: data / tool / standing trigger rule
  with nudge DELETED / single overflow-recovery path for sub-agent + direct
  / activation flag; compaction budget ≤2 per session id; directive points
  at a committed re-application file). Written out as
  `proposals/2026-09-11_compaction-lifecycle.md` — it subsumes the deferred
  nudge-delivery defect (moot) + ctx.log event markers + the custom-tool
  go/no-go (first custom tool; `2026-09-11_plugin-scope-tool-rename.md`
  item 1 to be retired on approval, rename item survives there).
- Both `--main` markers in the maintainer's draft
  `inbox_planner/draft/compact_memory/2026-09-11_13-44.md` handled
  (adapted into the proposal; markers removed, pointer left).
- NEXT: maintainer approval (recommendation: Cycle 1 now, Cycle 2 after
  re-prefill test 1); then delegate builds. Other open proposals
  (FST batch, log-profile, plugin scope, #11) unchanged.

## 2026-09-11 (DIRECT planner run; ses_f6fd8a0caffedqEYeUMCq0x12f) — inbox 11-11 handled: loop.log v2 + loop/ reorg + #50 + decision proposals
- **Start state:** HEAD `b11e1b8` (maintainer PR merge + `6bcb80f` cleanup: new
  live prompts, AGENTS.md swap done, drafts → `archive/proposals/files/`,
  plan4/5 summaries relocated, `opencode.jsonc` compaction `auto:false` +
  looprunner access gating to `loop/`). Tree clean except the maintainer's
  looprunner-prompt Access-Gating tweak (adopted into the commit below).
  Baseline carried: **451 passed** / ruff F=0 / probe 63/63 (meta-only run —
  no FST code touched; NOT re-gated at the stop line).
- **Folder reorg (maintainer #2):** the 5 `archive/autorun-…/` dirs →
  `archive/loop/` (21 files, zero loss); the CURRENT looprun now lives in
  `.opencode/loop/autorun-2026-09-11_13-24/` (loop_log.md in the NEW format;
  session-id marker files RETIRED — the loop log records session ids).
- **Loop.log v2 protocol (maintainer #1):** `agent_readme_loop.md` §Loop
  folder + §Loop log rewritten: line =
  `date_time <STATUS> <role>[-<iter>] <session_id> <model> <content>`; 8-char
  statuses `START-->` / `-RETURN-` / `--INFO--` / `-WARNING` (failed
  sub-agent `context_length_exceeded` → failed session id + cause) /
  `<---DONE` (verbatim gauge `<CTX>%/<REM>K`); rollover at iteration 1
  (move current → `archive/loop/`, create new); looprunner prompt: lookup
  line = last `START-->` `planner-*` line of `loop/autorun-…/loop_log.md`;
  planner prompt: loop-folder bullet reworded (marker rule dropped).
- **Planner prompt maintainer-calls section REWORKED** (per the embedded
  `--main` instruction, marker line then removed): priority marker rule +
  grep-the-repo-for-`--main` line + autonom → proposals (≤4, overview +
  pointers + ONE recommendation). Identifier VERIFIED unambiguous (no clash
  in FST content; only third-party venv docs) → `--main`/`--maintainer` stays.
- **#50 LANDED + CLOSED** (approved in the inbox; planner-direct, explicit
  task per the maintainer-owned-parts rule): `repo_map.md` — explorer roster
  bullet → `todo_inbox.md` (planner curates); `.opencode/` module-map bullet
  now lists `system_prompts/repo/` parts + `agent_readme_*.md` + the
  `loop/`/`archive/loop/` convention (stale `proposals/files/` draft ref
  dropped). One-line record in `todo_records.md`; next ID = #51.
- **Plugin rundown (maintainer #3):** `proposals/maintainer/feedback/
  2026-09-11_plugin-status-rundown.md` — v2.8 is LIVE + production-confirmed
  (this session's own tool results carry the `(NN%/NNNK)` per-tool readout;
  `ctx.log` writing).
- **Answer to maintainer #4 (plan1_summary points still current?):**
  (1) TODO #49 spec conflict — RESOLVED by `b6dc3e7` (closed); (2) 2306#2
  compaction-detection fold-in — SUPERSEDED (compaction deactivated; the
  v2.8 re-scope in `approved/260910_plugin-compaction-detection.md` is the
  design of record; only the rename tail survives → proposal 3); (3) 2306#1
  custom tool — still OPEN → proposal 3. plan1 "Observations": 2301-rule
  still practiced (the 4 proposals below follow it); `feedback/` folder
  exists again and is now two-way (rundown written there); P01 residue in
  `approved/` — folder moves stay maintainer-side (untouched).
- **`--maintainer` instruction honored — 4 decision proposals at
  `proposals/` root (each with recommendations):**
  `2026-09-11_fst-behavior-batch-decisions.md` (#1 build / #7 behavior-wins /
  #8 union / #9 harden / #4+#6 delete),
  `2026-09-11_log-profile-rebaseline.md` (#17/#30/#35 one-shot log read,
  default SKIP + #34 doc-purge),
  `2026-09-11_plugin-scope-tool-rename.md` (2306#1 custom tool GO + rename
  with it),
  `2026-09-11_contradiction-block-decision.md` (#11 — keep OFF + reword,
  marker untouched).
- **Inbox:** `2026-09-11_11-11.md` → `maintainer/done/` content-untouched.
- **Skipped at the stop line (91 %, REM≈10k) — flagged, not done:**
  `agent_readme_proposals.md` stale lines (retired "replier: block" inbox
  convention; `proposals/files/` "draft test set" now archived;
  `feedback/` is now two-way, not read-only).
- **Friction flags (maintainer's file `opencode.jsonc`, not touched):**
  (a) worker deny pattern `.opencode/prompt_**` no longer matches the moved
  prompt location `system_prompts/agents/` → workers can currently edit
  prompts; (b) the explorer has no write access to `todo_inbox.md` nor to
  `.opencode/loop/` (its loop-log completion rides the planner's RETURN
  line — the protocol was adapted accordingly).
- **NEXT:** maintainer rulings on the 4 proposals (FST batch = the oldest
  open work); then delegate the approved builds. Next autonomous launch
  handles the loop-folder rollover per §Loop folder if it is iteration 1.
  Standing: `opencode.jsonc` uncommitted by design; baselines as carried.

## 2026-09-11 (looprun 3, iteration 5; ses_f714b3128ffeILuAaWp2YUqnLt) — TODO curation + #48 delegated
- **Start state:** HEAD `449556f` (iter-4 close); planner/worker inboxes EMPTY (no
  maintainer messages; `approved/` unchanged); baseline = iter-4 measured
  (448 passed + 1 #10 warning / ruff F=0 / probe 63/63); launch
  `CTX=notAvailable` (fresh session). FIRST run under the loop.log protocol —
  `autorun-2026-09-10_03-05/loop_log.md` created with the planner START line
  (the looprunner's own START for this iter was never written — protocol
  predates its existence); session marker added per convention.
- **Curation (planner-direct, `a683047`):** (1) ADOPTED uncommitted worktree
  edits present at start (author unknown — post-iter-4-close; an interrupted
  step or the maintainer): TODO #3 + #40 collapsed to one-line closed
  records (full text moved to `todo_records.md` with dated records), the
  records-header numbering line fixed (#49 → #50, next #51 — already matching
  the TODO.md header). Content verified contract-compliant; no open content
  lost. (2) Resolved the flagged "Closed entries (mismatch: contains open
  entry #35)" section: open #35 moved into `## Plugin & gauge (open)` with its
  stale "IN PROGRESS — read mechanic not landed" title refreshed (continuation
 2 LANDED per its own status tail; body untouched); section heading now plain
  `## Closed entries`.
- **#48 LANDED + verified (`dac7314`, worker_Q4_120K fresh session, clean run
  at 45 % at its end):** per the committed spec — mouse
  `is_simulated_key_event` → `bool(flags & 1)` (bit 0 = LLKHF_INJECTED),
  X-button vk mapping → `(data.mouseData >> 16) == 1/2` (high word; the low
  word key state must not matter — mirrors the #42 wheel idiom); 3 new tests
  in `TestMouseWin32Filter` (nonzero-low-word x1 down/up + x2 down → vk 4/5;
  x3 identifier 196608 → suppress regression guard; flags 1/0x21 simulated +
  0/0x20 real); the existing x-button/passthrough tests unchanged. Planner
  verification (measured by me): commit scope = exactly the 5 spec files
  (code + tests + TODO + records + summary); gate **451 passed + 1 known
  #10 warning, ruff F=0**; #48 closed with the full record moved to
  `todo_records.md`. ACCEPTED deviation: the close record cites the commit by
  parent + subject ("first commit after `00bc24f`", subject "Mouse filter:
  packed-word equality → bit tests (TODO #48)") — a commit cannot contain its
  own SHA; the repo convention (date + gate + subject) holds.
- Baselines: **451 passed** / ruff F=0 / probe 63/63 (post-#48; +3 tests).
- **Work assessment:** every remaining open TODO is maintainer-gated —
  FST behavior batch #1/#7/#8/#9/#4+#6 (semantics rulings), #11 (HOLDING on
  his live test), #17/#35/#30 tails (call 1, default SKIP), #50
  (maintainer-owned repo part). No delegation-ready work remains.
- **NEXT (iteration 6):** none delegateable — the loop is blocked on
  maintainer rulings (bundled in the closing action line).

## 2026-09-11 (looprun 3, iteration 4; ses_f71d36a2affeVrJfwDARNwG7lo) — deferred pair in order: loop.log prompt task, then the re-scoped plugin task
- **Start state:** HEAD `7264b1f` (iter-3 close); tree clean; planner/worker
  inboxes EMPTY (no maintainer messages); baseline re-measured **448 passed +
  1 known warning (#10), ruff F=0**; launch `CTX=notAvailable` (fresh session).
  Looprun archive folder = `autorun-2026-09-10_03-05/` (carries the iter-2/3
  session markers + plan2/plan3 copies — the folder predates the dense-date
  rename, name kept as history).
- **Curation (planner-direct):** the residual `todo_inbox.md` worker block
  (date-sweep regex note) trimmed to a one-line pointer — process note, no
  repo file to fix, already recorded in the iter-3 deviation block; NOT a
  TODO entry. Numbering unchanged (next = #51).
- **LOOP.LOG TASK LANDED + verified (`4163894`, worker_Q4_120K, clean run at
  its end 24 %):** `agent_readme_loop.md` `## Loop log` section (location =
  the looprun autorun folder's `loop_log.md`; the START/RETURN/DONE lines
  with the maintainer's fields in one consistent format; verbatim-gauge DONE;
  append-only) + exactly one reference line in each of the 3 live prompts.
  Planner verification: commit scope = the 4 files + summary; restate-grep
  (`task-oneliner|RETURN|DONE`) over the prompts = 0 hits; gate unchanged
  (448 / ruff 0, meta-only). The protocol takes effect from the NEXT
  autonomous run (no `loop_log.md` created this run).
- **PLUGIN v2.8 LANDED + verified (fold-in `66c0ac9` + build commit; full
  record in `handover_task_to_planner.md`):** worker run 2 died on
  `context_length_exceeded` mid-run having left the build nearly complete
  UNCOMMITTED; planner verified the work coherent, ran the probe: 62/63 —
  the ONE failure (check 60) was a PROBE off-by-one (`lBefore` measured after
  the synchronous log write) — planner one-line inline fix (the direct-edit
  allowance). Final verification (planner, measured): probe **63/63 PASS
  exit 0**; gate **448 passed + 1 known warning, ruff F=0**; DoD-3 grep clean
  (single `promptAsync` call site inside the setImmediate-deferred fn);
  `temp` git-ignored (probe check 64). Landed = the locked plan from the
  run-1 summary (resume contract, commit `3b1589c`): v2.8 header block,
  restructured `onToolAfter` (ONE read → readout append `(NN%/NNNK)` in
  place + ladder + single-file log `.opencode/temp/ctx.log`
  `<datetime> [model] (readout)` IFF appended), race-free delivery
  (`setImmediate` + `session.status()` busy-skip, both carriers). **Production
  tail PENDING:** takes effect at the next maintainer process restart — the
  next run confirms from its own appended tool results (no action needed).
- **NOTE:** the 50% ladder rung fired in THIS session at the first gauge
  (readout CTX=60054 (50%)) — production evidence of the current
  fire-and-forget delivery; the plugin build's idle-deferral replaces that
  path.
- Baselines: 448 passed / ruff F=0 / probe 52/52 (meta tasks; re-verify after
  the plugin build).

## 2026-09-10 (looprun 3, iteration 3; ses_f7210e535ffe3ac5bYAzqFwQe5) — todo_inbox curated; date sweep LANDED + verified; loop.log/plugin deferred
- **Start state:** HEAD `d848e34` (iter-2 close); tree clean; planner inbox empty;
  `approved/` = compaction-detection + split (split already landed) + P01. CTX
  30 % at start. (Date note: today verified spelled-out via `Get-Date` = Friday,
  September 10, 2026 — the dense day digits in this NAP block were
  perception-unstable for the writer; trust machine output.)
- **Curation (`0520818`):** `todo_inbox.md` (REPO ROOT — not in handover/) → TODO
  **#50** (repo_map.md refresh: explorer-roster bullet + `.opencode/` module-map
  bullet; maintainer-owned parts → awaiting maintainer refresh or explicit task).
  The 02-03 loop.log finding needed no action (already ruled, iter-2). Numbering
  next = #51.
- **DATE SWEEP LANDED + verified (`ccd4840`, worker_Q4_120K, clean run):** per the
  committed spec (`0520818`): 14 `git mv` renames (9 `done/` files, 4 archive dirs,
  2 archive-root files — all dense `YYMMDD` → `YYYY-MM-DD[_HH-MM]`) + 3 convention
  lines (`proposals/README.md:33`, `files/agents_repo.md:168`,
  `files/prompt_agent_planner.md:22`) + **Pattern 5 "The Dense Numeric String"**
  appended to `proposals/files/AGENTS.md` after Pattern 4 (the 01-16
  loop-prevention example; the copy's handover-path line was ALREADY the fixed
  single path — the iter-2 copy-side flag is resolved; root `AGENTS.md:118` double
  path stays — agent-read-only, maintainer fixes at the swap).
  Planner verification: commit scope = exactly the sweep + agent_feedback entry +
  todo_inbox note + summary; archive integrity (git ls-files before/after — every
  tracked file present under its rule-derived name, **zero data loss**); Pattern 5
  spot-check; gate re-run **448 passed + 1 warning (#10), ruff F=0** (measured by me).
  - **Deviations ACCEPTED:** (1) MY spec table was stale: one source name did not
    exist + one row duplicated, hiding a 4th dense dir that was an EMPTY UNTRACKED
    dir — the worker machine-verified it empty and removed it via `fs.rmdirSync`
    (safe; `git mv` cannot move an empty dir). Lesson: generate rename tables from
    a disk scan, or add a disk-verification pass to sweep DoDs. (2) DoD scan regex
    `\b26\d{4}\b` structurally misses M-prefixed names — worker ran a broader pass
    (0 hits); todo_inbox note: future sweep specs use the broader regex/lookaround.
- **DEFERRED (next iteration, in order):** 1. **loop.log prompt task** (02-03
  ruling, iter-2 block): START (date_time/session_id/agent_model/task-oneliner) on
  looprunner+planner+worker startup; RETURN (same triple) on sub-agent return for
  planner+looprunner; DONE (+ `<CTX>%/<REM>K`) on task completion, every agent;
  the log lives in the looprun's autorun folder. Prompt-only: protocol text in
  `agent_readme_loop.md` (single source of truth), 3 live prompts get a short
  reference line (planner/task/looprunner) — reference, never restate. 2.
  **Re-scoped plugin task (01-41)**: CONSTANT per-tool ctx readout appended to
  EVERY `tool.execute.after` result (linear, cache-safe — the 031 option-2
  mechanic; very minimal like `(80%/15K)`), threshold nudges STAY as messages but
  idle-deferred (031 option 1), context logging moves to the appended tool returns;
  fold-in spec update into
  `proposals/approved/260910_plugin-compaction-detection.md` + build (needs fresh
  code reads of the nudge delivery path; probe extension). Standing maintainer
  calls otherwise unchanged (FST behavior batch #1/#7/#8/#9/#4+#6 is the oldest
  open work).
- Baselines unchanged: **448 passed** / ruff F=0 / probe 52/52 (meta-only).
- **STOPPED at 81 % CTX** (wind-down nudge; REM ≈22k): the loop.log spec+launch
  fits in a fresh session easily; the plugin spec+build needs a full session.

## 2026-09-11 (new looprun 3, iteration 2 per launch; ses_f725ba15effe6Od7tQ9XO2QuYE) — inbox 01-16/031 handled; #49 closed; split build LAUNCHED
- **Start state:** HEAD `b6dc3e7` (maintainer "cleaned up commit mess" — restored lost
  updates from a parallel-editing revert; 2 new inbox files + `260910-2336`→done + the
  AGENTS.md handover-path table fix). Tree clean; `handover_task.md` = the COMMITTED
  split-build spec (unstarted — maintainer: "start the still open and not start
  handover_task.md").
- **Inbox handled (both → `maintainer/done/` content-untouched):**
  - `2026-09-11_01-16` (new naming pattern `YYYY-MM-DD_HH-MM` replacing the dense
    `YYMMDD-HHMM`; repo-wide EXCEPT FST py files + outputs; add a small loop-prevention
    example): ADOPTED. Planner-direct (pre-worker, so the split build carries it):
    spec §4 pattern (2×), `agents_repo.md` archive-line, this looprun's archive folder
    (`autorun-2026-09-11_01-29/` + session marker — the 2147 option-2 convention,
    approved, applied early). REMAINING SWEEP = separate task AFTER the split build
    (scope decision, recorded for the spec): RENAME — inbox `done/` files, archive
    folders, dated archive files; CONTENT — live prompts, repo files (post-split),
    `proposals/README.md`, `proposals/files/*`; EXCLUDED — WIKI (documents FST OUTPUT
    naming `save-YYMMDD-HHMMSS`/`date()`), `built_*.bat` (FST build outputs), FST py,
    `SCRATCH_PAD.md` (maintainer personal), `proposals/implemented/*` + archive content
    (history), `playground/` (maintainer personal). AGENTS.md is agent-read-only →
    the loop-prevention example goes to the `proposals/files/AGENTS.md` copy (queued
    maintainer swap) — verdict on his question: it is NOT one of the existing patterns
    1–4; add as a short new example (dense unbroken numeric strings tokenize
    unstably → comparison errors; example: dates).
  - `260911-0031` (nudge race: `promptAsync` mid-turn busts the KV cache; gemini's two
    options; maintainer PREFERS option 1 = defer until idle/setImmediate, "even if the
    message might arrive later"): ADOPTED — plugin task, spec AFTER the date sweep
    (needs fresh code reads of the nudge delivery path; observable plugin behavior —
    approved by this message).
  - **`2026-09-11_01-41` (→ `done/` content-untouched) — RE-SCOPES the plugin task:**
    (1) the "adapt handover plugin as a tool" idea was a miscommunication — he meant the
    PEEK functionality; TABLED regardless → the 2306#1 assessment record is corrected
    (queued: note it where the 2306#1 reply lives). (2) NUDGE REDESIGN (supersedes the
    031 minimal read): the PRIORITY is a CONSTANT ctx readout appended to EVERY
    `tool.execute.after` result (option-2 mechanic from the 031 note — linear,
    cache-safe), NOT threshold-gated, very minimal format like `(80%/15K)` — reason:
    **compaction is now ENTIRELY DEACTIVATED** (the window can't be exceeded; current
    ctx data is what matters — the planner can gauge a worker's last state from it, e.g.
    for restart-after-interruption). The threshold nudges STAY as messages (emergency
    reset/instruction access points) but delivered race-free (option 1 = idle-deferred).
    Context LOGGING moves to the appended tool returns (not the nudge messages). Include
    all of this in the appropriate files — he names
    `proposals/approved/260910_plugin-compaction-detection.md` → the plugin task now =
    fold-in spec update + build, still AFTER the date sweep.
  - **Worker-launch note:** the first split-build Task call landed on an EXISTING
    75k-token worker session (maintainer cancelled it — no partial work, tree clean).
    Maintainer rule: **always start a NEW agent, never restart/resume one** → the
    relaunch below is a fresh call, no `task_id`.
- **#49 CLOSED** (maintainer resolved via `b6dc3e7`; one-line record in
  `todo_records.md`; numbering now up to #49, next #50).
- **FLAG (maintainer's file, not touched):** `AGENTS.md` line "Handover files live in
  `.\.opencode\handover\handover`" — the doubled dir does not exist (real dir =
  `.opencode\handover`; the interaction-contract table above it is correct). The
  `proposals/files/AGENTS.md` copy carries the same line → include the fix in the
  queued swap (date task).
- **LAUNCHED + VERIFIED:** split build (committed spec `8b4123b` + the §4 pattern
  revision) via `worker_Q4_120K` (FRESH session after the cancelled old-session launch;
  clean run, 75 % at its end). Planner verification: commit `04b1f4d` scope = exactly
  the Boundary files + summary (15 files; `opencode.jsonc`/root AGENTS.md/TODO/records/
  NAP untouched); gate re-run **448 passed + 1 warning (#10), ruff F=0**; spot-checks
  passed (forbidden `.opencode/handover_<name>` form = 0 hits over prompts+index;
  Instruction-index present in all 4 prompts; planner marker rule at 39-41 with the NEW
  pattern; looprunner session-id line; task+explorer inbox rule; AGENTS.md-copy diff =
  exactly the one-line APPEND retarget; root index 19 lines; readmes 33/29/37 lines;
  distinctive-string distribution across the 4 parts). Deviations ACCEPTED: (1) 2 extra
  stale-path fixes in the worker/explorer prompts (DoD 5 justifies — it bans the form
  across all 4); (2) 3 stale no-slash NAP refs inside the MOVED sections fixed
  (reference-only); (3) "Handover file paths" → `repo_commands.md` (the proposal's
  mapping left it unmapped; gauge trigger ties it to repo_commands — mapping table
  recorded in the summary). Baselines unchanged (meta-only).
  - **Worker's open item (your call was mine to take):** the explorer-role TODO.md
    framing tension (repo_map roster + explorer prompt are verbatim-locked; the inbox
    retarget lives in the added line + readme + queued swap) → follow-up spec, NOT
    done here (recorded in `todo_inbox.md`).
  - **`todo_inbox.md` now carries 3 worker findings + 1 tension flag** — curate into
    TODO.md with stable IDs (next = #50) at iteration-3 start.
- **Inbox `2026-09-11_02-03` handled (both copies → `done/` content-untouched; the
  worker copy suffixed `_worker` to avoid a name collision in the flat done/ dir):**
  loop.log protocol — START (date_time/session_id/agent_model/task-oneliner) on
  looprunner+planner+worker startup, RETURN (same triple) on sub-agent return for
  planner+looprunner, DONE (+ `<CTX>%/<REM>K`) on task completion for every agent;
  the log lives in the corresponding `.opencode/archive/autorun*` folder. RULING:
  implement as a SEPARATE prompt-only task (3 live prompts + `agent_readme_loop.md` —
  cheap, via system prompts per his note); the plugin's context-logging (01-41:
  base it on the appended tool returns) stays in the plugin task; usefulness
  comparison ("doubles a bit the feature of the log of the handover plugin — lets
  see what is more useful") after both land. The worker copy's tail line "this is a
  new commit!" read as a maintainer note to the (then-running) worker — no action
  needed, the worker finished clean.
- **NEXT (iteration 3, in order):** 1. curate `todo_inbox.md` (IDs #50+); 2. write +
  launch the date-sweep spec (scope decision recorded above); 3. write + launch the
  loop.log prompt task; 4. write + launch the re-scoped plugin task (01-41: constant
  per-tool ctx readout + idle-deferred threshold nudges + logging on tool returns +
  fold into `proposals/approved/260910_plugin-compaction-detection.md`). Standing
  maintainer calls otherwise unchanged (FST behavior batch #1/#7/#8/#9/#4+#6 is the
  oldest open work).

## 2026-09-10 (new looprun, iteration 1 per launch; ses_f729fdeecffeL1itaHiEEsKjYG) — inbox feedback given; loop paused for approval
- **Start state (fresh session):** HEAD `8b4123b` (split-build spec committed, both
  proposals in `approved/`, 2147/2301 handled). Maintainer's UNCOMMITTED worktree
  moves: `handover_task.md` reverted to the part-3 spec (byte-identical to
  `854bb68` — that task is LANDED/verified), `2147` re-inboxed (original text,
  replier block removed), `2301` deleted from `done/`, the first session marker
  (`autorun-260910-2307/ses_f72e53…md`) deleted, new inbox `2306`; AGENTS.md /
  looprunner prompt / opencode.jsonc = EOL-noise only (empty diffs).
- **Inbox handled (feedback → `plan1_summary.md`, files moved to `done/`
  content-untouched per the README convention):** `2147` — both points already
  implemented in the committed split spec (§4 marker option 2, §6 looprunner lookup);
  open question: the marker deletion — rejection of the convention or cleanup?
  `2306#1` — custom-tool idea assessed: NOT too much effort (small tool in
  `.opencode/tools/` wrapping gauge core + per-session sqlite-log query; context
  carries the sessionID; in-memory plugin state not shareable but all needed values
  are persisted), worth doing AFTER #2. `2306#2` — confirmed real: `nudgeFired`
  per-session once-only dedup (`handover_v2.4.ts:322`) means already-fired rungs
  never re-fire post-compaction; the drop-detection mechanic = the approved
  compaction-detection proposal's step-1 inference fallback → fold-in spec, needs
  approval (observable plugin behavior).
- **TODO #49 ADDED:** handover_task.md worktree≠HEAD conflict (maintainer call).
- **NO code touched; baselines unchanged.** No spec copy into the autorun archive
  (spec state disputed — recorded instead; copy at launch).
- **NEXT (on maintainer approval, in order):** 1. resolve #49 (restore HEAD spec
  recommended) → LAUNCH split build (`worker_Q4_120K`) — lands 2147 + parts 1/2/5;
  2. compaction-detection fold-in spec (#2: per-session ctx tracking + rung re-arm +
  compaction mark in nudge/peek) → delegate; 3. custom-tool gauge (go per summary).
  Standing maintainer-calls otherwise unchanged (FST behavior batch #1/#7/#8/#9/
  #4+#6 is still the oldest open work).

## 2026-09-10 (looprun 2, iteration 6b — FRESH restart of the interrupted iter 6) — part 3 LANDED + verified; P02 saga CLOSED; gauge moved
- **Start state (fresh session, maintainer restart after compaction storm):**
  the iteration-6 launch died in compaction before the part-3 worker's first
  tool call (no partial work; spec intact at `f6075a2`). Since then the
  maintainer COMMITTED his meta batch (`7af23c1`/`ccda5d5`/`8feb14b`/
  `d2ffdb9`): new live prompt set in `system_prompts/agents/` + draft copies in
  `proposals/files/`, handover files restructured to `.opencode/handover/`,
  BOTH proposal drafts moved to `commented/` with NEW maintainer comments,
  autocompaction relaxed (keeps ≥60k on compaction). Tree was clean except
  `opencode.jsonc` (by design) + an EMPTY 0-byte
  `inbox_planner/260910-2147.md` (left untouched — flagged in the closing
  message; not a processed read-receipt).
- **Path repair (`0ce43b8`, planner-direct, pre-approved class):** the
  restructure had gone stale: (a) task spec + `agents_repo.md` (module map,
  handover section) pointed at the dead `.opencode/handover_*.md` / prompt
  paths — fixed; (b) the maintainer's comment ask "move the gauge into
  `plugin/scripts/`" — DONE: `ctxgauge/{gauge,peek}.mjs` →
  `.opencode/plugin/scripts/` incl. the file-relative `DEFAULT_EXE_PATH`
  (spawn-sqlite3 fallback — would silently break otherwise); verified: gauge
  runs, probe **52/52**. Live prompts reference the gauge via `agents_repo.md`
  (no direct prompt edits needed).
- **Part 3 LANDED + planner-verified (`854bb68`, worker_Q4_120K, clean run,
  no compaction):** 12 entries moved (the 9 pre-ruled + #46/#41/#42 judged
  CLOSED — all three backed by the iter-2 "approved-fix batch LANDED" record);
  #40/#35 judged OPEN (rationale in the committed summary — consistent: #40's
  smell-check half + #35's v1.3 rebaseline remain). #48 relocated into FST
  behavior decisions; the "Closed entries" section renamed to flag the
  still-open #35. Independent spot-checks: scope = exactly the 3 files; stubs
  present for all 12; distinctive body strings absent from TODO.md; open
  entries + maintainer-calls list untouched; `todo_records.md` old content a
  byte-identical prefix. TODO.md 891→504 lines.
- **P02 FUNCTIONAL PROOF: PASSED — saga CLOSED.** First Task-tool run after a
  fresh process did NOT clobber `handover_task_to_planner.md` after the
  worker's commit (git status clean post-run). The `mirrorSummary` removal
  (`adc9965`) works; the iter-5 8th collision was in-process staleness only.
  Standing clobber-restore rule retired (see Standing).
- **Commented proposals REVISED + moved back to proposals/ root (pending
  maintainer ruling):** (1) split proposal — replied to his questions:
  `todo_inbox.md` YES (new part 5: workers append, planner curates + assigns
  IDs), `todo_wip.md` SKIP (NAP = single WIP source), topic split NOT YET
  (sections suffice; revisit at ≈20 open entries), prompt changes = parts
  1+2 (+ one AGENTS.md APPEND-rule line for part 5); (2) compaction
  detection — gauge move noted DONE (`0ce43b8`), the `session_context/`
  per-session writeout folded into step 2 (still approval-gated), step 1
  probe unchanged.
- **Bookkeeping (`<this commit>`):** `todo_records.md` header numbering line
  fixed (#38→#48, next #49); TODO #30 scope line re-pointed to
  `plugin/scripts/` (its only forward-looking stale path; the other
  ctxgauge mentions are past-tense history — left as-is).
- **NEXT (iteration 7, in order):**
  1. Maintainer rulings on the two revised proposals (split parts 1+2+5;
     compaction-detection steps 2+3; rename to `ctx_watchdog.ts` touches
     `opencode.jsonc` → his edit or explicit go).
  2. The FST behavior batch is still the oldest open work (#1/#7/#8/#9/
     #4+#6) — needs his semantics rulings before it can be built.
  3. If green-light: light explorer pass for NEW issues (audit 3a/3b done;
     #48 is the only open audit residual).
- Baseline unchanged: **448 passed** / ruff F=0 (meta-only since; no code
  touched this iteration).

## 2026-09-10 (looprun 2, iteration 5) — P02 + P08 LANDED + verified; P01 re-test PASSED; maintainer meta batch processed
- **Start state:** clean tree (top `1ed1108`), only `opencode.jsonc` modified BY
  DESIGN. No interrupted planner/worker work. The launch-message XXX note = the
  iteration-4 maintainer message RE-ROUTED verbatim — already applied (`c4ad33c`),
  nothing new to do. Proposals channel: no new maintainer moves since iteration 4
  (approved/ = P01/P02/P08; inbox_planner = the 1346 request).
- **P02 LANDED + planner-verified (`adc9965`):** spec as committed in
  `handover_task.md`. **LAUNCHED via `worker_Q4_120K` (Task tool) — the P01
  re-test: PASSED** (worker-prompt launch survived its first request; the
  `limit.context` declaration works — the raw-agent workaround is now optional,
  keep it as fallback only). Worker completed clean (64 % at its last gauge).
- **Planner verification (independent):** commit scope = exactly plugin + probe +
  summary; `mirrorSummary` grep on the plugin = 0 hits; probe re-run 52/52 exit 0
  (S3 08/09/10/12 now pin the NO-WRITE behavior = regression guard); gate re-run
  **436 passed, 1 warning (known #10); ruff F=0**.
- **8th summary-file collision — with a twist (recorded in the P02 verdict):**
  post-run the file held the raw `<task_result>` dump again, BUT the opencode
  process had the OLD plugin code loaded in memory (worker's edit only takes
  effect from the next process start; looprunner↔planner↔worker share ONE
  process). Restored via `git checkout --`. **Functional proof = the first
  Task-tool run after a FRESH process** (maintainer restart of the loop). If it
  still collides after a fresh process → root cause = the task-tool RESULT
  channel itself (opencode core) → maintainer-side fix.
- P02 moved → `proposals/implemented/` with the planner verdict (incl. the
  in-process-staleness nuance + the worker's deactivated-code flag).
- **PC restart mid-run:** first P08 launch interrupted (worker never executed,
  no partial work) — state checked, spec already committed (`93b7b6`),
  re-launched clean.
- **P08 LANDED + planner-verified (`6622b80`):** spec committed as `93b7b6`
  (verified site map); worker `worker_Q4_120K` **compacted 3× mid-run**
  (maintainer `compaction_warning` item) — work check found no damage:
  independently re-verified (commit scope = exactly the 10 intended files;
  gate re-run **448 passed (436 + 12 new `tests/test_config_error.py`), 1
  warning (#10); ruff F=0**). Accepted deviation: fail-closed
  `constraint_evaluation` ConfigError guard (`fst_manager.py:676`) — out-of-
  list latent-crash fix; #1 stays OPEN for the console-print-no-toast part.
  **#44 CLOSED** (design approval incl. degrade-to-defaults = the maintainer's
  ruling). P08 → `implemented/` with verdict.
- **Maintainer meta batch (18:06–18:18, uncommitted — do NOT touch/commit):**
  adapted the planner + looprunner prompts (next session picks up the new
  planner prompt); deleted `looprunner_prompt_proposal_planner.md`,
  `plugin_rundown.md`, `proposals/files/prompt_looprunner.md`. Inbox items:
  - `1806` (folder-check ping) → `done/` with reply;
  - `1818` (prompt feedback + feedback-folder process) → reply in
    `proposals/maintainer/feedback/260910-1818.md` (process endorsed; folder
    created as `proposals/maintainer/feedback/` — **path needs maintainer
    confirm**);
  - `compaction_warning` (check P08 work + plugin compaction-detection feature)
    → reply in `feedback/compaction_warning.md` (verified ✓) + proposal
    `proposals/260910_plugin-compaction-detection.md` (probe-first; rename
    suggestion `ctx_watchdog.ts`);
  - `1813` (prompt/TODO/meta split; supersedes + integrates the `1346` item)
    → proposal `proposals/260910_prompt-and-todo-split.md` (4 parts, each
    independently approvable; parts 3+4 pre-approved-class). 1813 + 1346 →
    `done/` with pointers.
- **Production compaction event:** THIS planner session was auto-compacted
  mid-run (CTX 74 % → 43 % between two tool calls) — first direct
  planner-loop observation of the ~50-60 % auto-compaction; evidence for the
  compaction-detection proposal.
- Baseline: **448 passed** / ruff F=0 (post-P08).
- **NEXT (iteration 6, in order):**
  1. P02 functional proof: first Task-tool run after a FRESH process (needs
     maintainer loop restart) — if it still collides → root cause = task-tool
     RESULT channel (opencode core) → maintainer-side fix.
  2. After maintainer rulings: build the approved split parts (TODO/records +
     NAP trim first — pre-approved class), then the prompt-index build (parts
     1+2 touch the live prompt = maintainer edit or explicit go).
  3. If compaction-detection approved: run the probe step (log hook events).
  4. Confirm the feedback-folder path (one line with the maintainer).

## 2026-09-10 (looprun 2, iteration 4) — P09+P07 applied to the LIVE looprunner prompt + #47 CLOSED
- **Start state:** dirty tree = `opencode.jsonc` (maintainer's live P01 edit,
  uncommitted BY DESIGN — never stage/flag it) + `.opencode/prompt_looprunner.md`
  (the looprunner had APPENDED the P09/P07 suggestion block below its divider,
  uncommitted). No interrupted planner/worker work otherwise.
- **Maintainer launch message = the XXX note itself** ("make autonom an option
  instead of stating it as an always-true fact") = approved P09. Applied AHEAD
  of his copy-on-restart (identical content — his later copy is a no-op): the
  live `prompt_looprunner.md` now carries the approved replacement (autonom
  stated conditionally on the `<|autonom|>` marker, XXX note deleted, P07
  iteration-number line added). Commit `c4ad33c`. The looprunner's uncommitted
  append was superseded (the text lives in `proposals/files/prompt_looprunner.md`
  + the git diff history). Note for the next planner: the new embedded planner
  text no longer routes the XXX line into launches.
- **#47 CLOSED (planner-direct; both residuals = settled answers, no re-check):**
  WIKI [Variable system] + shared text/integer name-space line (`is_set` True for
  a stored text — a text is never equal to 0); WIKI [Mouse keys] + horizontal
  scroll direction line (press = one notch RIGHT, release = LEFT). Gate: 436
  passed, 1 known warning; ruff F=0. One-line record in `todo_records.md`.
- **P02 SPEC committed** in `handover_task.md` (delegation-ready, self-contained:
  scope + DoD incl. probe-count arithmetic + the "your commit = last write to the
  summary file" rule). Launch is iteration 5 item 1 — FIRST try `worker_Q4_120K`
  (the P01 re-test: worker-prompt launches should survive now that `limit.context`
  is declared); raw `agent_Q4_120K` + compact protocol as fallback.
- NO FST code touched; baseline intact (436 / ruff 0).
- **NEXT (iteration 5, in order):**
  1. LAUNCH P02 per the committed spec, then VERIFY (probe N/N exit 0 + the
     mirror check gone by grep + gate 436/ruff 0 + `git diff` scope = plugin +
     probe + summary + functional proof: `handover_task_to_planner.md` NOT
     modified after the worker's commit — the first clean run closes the P02
     collision saga; restore via `git checkout --` if it still happens). Move
     P02 → `proposals/implemented/` with a verdict note.
  2. **P08** (#44 ConfigError, approved incl. degrade-to-defaults): the spec
     needs FRESH code reads of the raise/catch sites (`fst_keyboard.py:386/1021`,
     `convert_to_vk_code`, `check_for_combination`, CLI menu, GUI toggle handlers,
     hot-path wrap) — write it, then delegate (worker_Q4_120K; the design is the
     approved `proposals/approved/P08_configerror-design.md`).
  3. Draft the **1346 proposal** (NAP bloat / prompt separation of concern) into
     `.opencode/proposals/` (the request sits in
     `proposals/maintainer/inbox_planner/M260910-1346_nap-bloat-prompt-separation.md`
     — move it to `maintainer/done/` after drafting).
  4. Maintainer calls bundle (≤3) in the closing message.
- **Maintainer calls (standing, bundle ≤3):** (1) the FST behavior batch
  (#1/#7/#8/#9/#4+#6 — semantics decisions); (2) headless-toast hardening:
  headless toast invocations (`show_message`/`show_timer`/`remove_toast`/
  `remove_all_toasts`) raise TypeError (callbacks None outside GUI — the #47
  flag 1) — harden to a printed no-op vs. keep "requires GUI" docs-as-is;
  (3) #17 v1.3 log-profile rebaseline (call 1, default SKIP).

## Compressed archive (one line each — details in git log + TODO/records)
- **iter 3:** P10 maintainer inbox channel built (`inbox_planner`/`inbox_worker`/
  `done`; agent moves after handling, never edits) + P03/P05/P06/P07/P09 applied
  (`0540b16` + fix-up); P08+P09 moved to approved/ by the maintainer;
  `handover_maintainer.md` retired → archive; NO code touched.
- **iter 2:** approved-fix batch #41+#42+#46 LANDED + verified (`bdab550`/
  `724a630`; 436 passed); #48 ADDED (packed-word equality report-back — X-button
  `mouseData` equality + LLKHF `flags == 1`, implicitly approved, delegation-
  ready); #47 §3 docs LANDED (`b40a1a7` + resume `73c0097`) incl. 4 behavior
  flags documented as-is (headless-toast TypeError = the standing call).
- **iter 1:** maintainer rulings applied to TODO; proposals channel + 9 drafts
  P01–P09 created; P01 `limit.context` applied (opencode.jsonc left uncommitted
  by design); batch spec committed, launch deferred to iter 2 (stop line).
- **session 5:** #43 LANDED (kb_env consolidation → `tests/kb_helpers.py` +
  conftest fixtures, `1fd669c`…); #3 fix-list LANDED (`6c2151`/`fcc3add`,
  docs-only); WIKI.md tracked (`28e1865`); summary collision 3rd/4th time.
- **session 4:** #39 closed (clean restart); T2 #33 nudge ladder LANDED
  (`70434c8`, probe 52/52); audit 3a (`66d2cd6` → #42/#43) + 3b (`b9c7db5` →
  #44 + #1 overlap extension); Task-tool era begins (subagent_depth 2, CLI
  delegation deprecated); Task-tool clobber mechanic documented (restore after
  every run).
- **session 3:** #37 closed (production `ctx:` line reached own session, no
  db-error); looprunner v2 prompt applied by the maintainer; explorer run #1
  failed (fabricated gauge, no entries) → #40 + sizing lesson (split scope,
  checkpoint findings); CLI-delegation mechanic discovered.
- **session 2:** looprunner-prompt optimization proposal (consolidated verdicts;
  adopted closing action protocol `action: restart/ask_maintainer/stop`).
- **session 1:** agents_repo roster synced to live opencode.jsonc; #38 explorer
  smoke test (PASSED w/ fabricated-gauge caveat); #37 gauge build LANDED
  (backend chain node:sqlite → bun:sqlite → spawn sqlite3.exe).

## Standing
- Baselines: pytest **448 passed** / 1 known #10 warning; ruff **F=0**; probe
  **52/52** (post-#33 ladder).
- Maintainer-inbox handling: move the file to `maintainer/done/` CONTENT-UNTOUCHED;
  the reply/feedback is recorded in the NAP + summary (the README says so — the
  earlier `---`/`replier:` append practice was cleaned up by the maintainer
  260910 night; the `proposals/maintainer/feedback/` folder no longer exists).
- `opencode.jsonc` uncommitted BY DESIGN (maintainer iterates live) — never
  stage, never flag.
- The maintainer's meta batch is now COMMITTED by him (`7af23c1`…`d2ffdb9`);
  his live files (new prompt set, `proposals/files/` drafts, `opencode.jsonc`)
  — never stage/flag; draft copies in `proposals/files/` may carry stale paths
  until he finalizes the set (the gauge move is one such pending update).
- P02 saga CLOSED (iter 6b functional proof PASSED — no clobber after a
  fresh-process Task-tool run). If a clobber EVER recurs, restore via
  `git checkout --` and re-open the investigation.
- Gauge lives in `.opencode/plugin/scripts/` (self-gauge:
  `node .opencode\plugin\scripts\peek.mjs`; the file-relative
  `DEFAULT_EXE_PATH` inside `gauge.mjs` must be re-checked if that dir moves).
- Delegation: Task tool (`subagent_depth` 2), default `worker_Q4_120K` (P01
  re-test PASSED — worker-prompt launches work); raw `agent_*` = fallback;
  explorer `worker_explorer_Q3_120K_mtp` (fast, less stable — ALWAYS verify its
  work).
- NO parsing of `.opencode/plugin.log` (call-1 one-shot only, default SKIP).
- TODO.md curation: open items + one-line records in TODO.md; full text of
  closed entries in `todo_records.md` (formalized by split proposal part 3).
- **Disclosure (dc3f137):** the `git add -A` there also staged the maintainer's live `opencode.jsonc` (compaction.keep now system:true / tokens:60000 / messages:20) and his new draft `draft/compact_memory/compact_memory.ts` (72 lines) - both were in the working tree at commit time. Nothing was reverted; maintainer decides whether that belongs in the git record.
