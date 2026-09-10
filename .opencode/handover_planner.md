# HANDOVER PLANNER — Phase 6 (post-T1; autonomous-loop era)

FIRST read AGENTS.md, agents_repo.md, TODO.md, this file.

## 2026-09-10 (looprun 2, iteration 5) — P02 LANDED + planner-verified; P01 re-test PASSED
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
- **NEXT (iteration 5, continued, in order):**
  1. **P08** (#44 ConfigError, approved incl. degrade-to-defaults): fresh code
     reads of the raise/catch sites, write the spec into `handover_task.md`,
     delegate (`worker_Q4_120K` — the worker mechanic now works normally),
     verify + move P08 → implemented.
  2. Draft the **1346 proposal** (NAP bloat / prompt separation) into
     `.opencode/proposals/` (request =
     `proposals/maintainer/inbox_planner/M260910-1346_nap-bloat-prompt-separation.md`
     — move it to `maintainer/done/` after drafting).
  3. Maintainer calls bundle (≤3) in the closing message.
- Baseline: 436 passed / ruff F=0 (unchanged — P02 touched no FST code).

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

## 2026-09-10 (looprun 2, iteration 3) — P10 maintainer channel + P03/P05/P06/P07/P09 applied
- **Maintainer ACTIVE this iteration:** wrote 3 messages to
  `handover_maintainer.md` (1333 numbered-specs OK — already in use; 1346 =
  OPEN proposal request, NAP-bloat/prompt-separation; 1343 = files/ subfolder —
  already landed in the README), moved **P08 + P09 into approved/** (P08 =
  #44 config-error design, NOW delegation-ready), then LIVE-edited mid-run:
  renamed `maintainer/inbox/` → `inbox_planner/` + message 260910-1537
  ("make it clear by folder name who has to scan and who is addressed").
- **P10 (the iteration's maintainer request) IMPLEMENTED + approved same run
  (condition: bundling several messages into ONE inbox file is allowed):**
  `proposals/maintainer/{inbox_planner,inbox_worker,done}/` (folder name =
  addressee; done = read-receipt; agent moves after handling, never edits
  content) + README section + planner/worker prompt scan lines.
  `handover_maintainer.md` RETIRED → `.opencode/archive/` (he may still append
  to the old path — if it reappears, flag + keep using the inbox). First inbox
  message = the 1346 request (draft the prompt-separation proposal = queued).
- **Applied (all doc/meta, committed `0540b16` + fix-up):** P09 →
  `proposals/files/prompt_looprunner.md` (conditional `<|autonom|>` reword,
  XXX note deleted; bundles the P07 looprunner iteration-number line —
  maintainer copies over the live file on restart); P07 → planner block in
  `prompt_agent_planner.md` + day-dir `.opencode/archive/autorun-260910/`
  (plan03_summary written); P05 → probe-verified replaceAll semantics in
  `agents_repo.md` gotchas (SINGLE PASS over the original string, NO rescan;
  substring-matching; corrupts ONLY if the target name already exists — the
  #43 mode; two-stage token needed only in that case); P03 → checkpoint rule
  in `prompt_agent_explorer.md` (his steer = right place); P06 → real-host DoD
  gotcha in `agents_repo.md`. All six moved → `implemented/` with verdict notes.
- **NO code touched** (suite 436 / ruff 0 baseline unchanged); NO delegation
  this iteration (stop line hit before the P02 launch — it stays queued).
- **NEXT (iteration 4, in order):**
  1. **P02** (approved): delete `mirrorSummary` + probe rebuild in
     `handover_v2.4.ts` — delegation-ready; FIRST launch tries
     `worker_Q4_120K` (the P01 re-test), raw `agent_Q4_120K` fallback; verify
     probe + suite, then move P02 → implemented.
  2. **#47 close:** 2 one-line WIKI clarifications (settled answers, no
     re-check: #5 text+integer vars share `Output_Manager.variables`
     `fst_manager.py:71`; #6 horizontal scroll press = one notch RIGHT /
     release = LEFT `fst_manager.py:705-706`) + gate + entry close.
  3. **P08** (approved): #44 `ConfigError` build — delegation task (the
     degrade-to-defaults yes rides in the approval; still worth a closing-
     message confirmation).
  4. Draft the **1346 proposal** (NAP bloat / prompt separation of concern).
  5. Maintainer calls bundle (≤3): FST behavior batch (#1/#7/#8/#9/#4+#6);
     #17 v1.3 log rebaseline (call 1, default SKIP).
- Standing lessons + new: raw/worker delegation mechanic unchanged; restore
  `handover_task_to_planner.md` after EVERY Task-tool run; **NEVER parallel-
  edit the same file** (P05 verdict duplicated by a racing parallel edit —
  fixed in-run, recorded in agent_feedback).

## 2026-09-10 (looprun 2, iteration 2) — approved-fix batch #41+#42+#46 LANDED + planner-verified
- **Start state:** clean tree (top `1a4fefa`), the batch spec committed +
  delegation-ready (iteration 1 stopped at the 89 % line BEFORE launching). No
  interrupted work. No new maintainer message since the last launch.
- **Batch LAUNCHED via raw `agent_Q4_120K`** (the worker-prompt variant still dies at
  its first request — P01 pending) with the spec's built-in Protocol section as the
  delegation protocol. The worker stopped at its own stop line (98 % / REM 2.2k) at a
  clean committed point — the DoD worked.
- **PLANNER VERIFIED (independent — not trusting the summary alone):**
  - Gate re-run by the planner: **10/10 consecutive full `pytest -q` green at 436
    passed, 1 warning** (baseline 434 + 2 new tests; the warning = the known #10
    coroutine one); **ruff F=0**.
  - #42 mask/shift `bool((data.mouseData >> 16) & 0x8000)` node-verified against ALL
    FOUR constants: single-up(7864320)→False, single-down(4287102976)→True,
    2-notch-up(15728640)→False, 2-notch-down(4279238656)→True; magnitudes cross-checked
    (240<<16=15728640, 120<<16=7864320, (-120) low32=4287102976). ✓
  - #41 name parity: singular `remove_all_callback` now uniform across
    `fst_keyboard.py:64`, `free_snap_tap.py:193`, `fst_manager.py:578`, the conftest
    FakeFST, the test assertion, AND the new drift-guard test
    (`test_remove_all_toasts_drift_guard` — stand-in exposing only the singular; a
    plural call would AttributeError, which `constraint_evaluation`'s NameError-only
    catch does NOT swallow). Only historical plural refs remain (in TODO.md). ✓
  - `git diff` scope = exactly the 7 allowed files; commit `bdab550`
    (code+tests+TODO+summary) + `724a630` (hash backfill bookkeeping).
- **Nuance recorded (NO behavior discrepancy):** the worker refined the maintainer's
  bit-level description — the distinguishing bit is bit 31 (the sign of the high-16
  delta word), not bits 16/17 as the ruling phrased it; the expression extracts bit 31
  and the observable semantics (direction recognized regardless of the other bits;
  multi-notch = SAME phase as single-notch, magnitude NOT aggregated) match the
  approved ruling exactly.
- **#48 ADDED** (the #42 report-back): packed-word equality sites found — (1) X-button
  `mouseData == 65536/131072` exact equality (`fst_keyboard.py:471-473`, low word = key
  state → with a modifier held the X-button event resolves no vk and is suppressed
  without processing — same defect class as the pre-fix wheel check); (2) mouse
  `is_simulated_key_event` `flags == 1` on the packed LLKHF word (`fst_keyboard.py:49` —
  an injected event carrying any other LLKHF bit is misclassified as real). Correct
  patterns (no action): keyboard `flags & 0x10` (`:520`), control combos (string
  membership). Fixes NOT implemented this task (report-back only; implicitly approved
  per the #42 ruling — delegation-ready).
- **Summary-file collision — FIFTH time** (raw run too): restored `git checkout --`
  post-run (P02 pending — the plugin `mirrorSummary` is the confirmed root cause).
- **#47 DELEGATED → PARTIAL (resume spec committed, launching this iteration):** the
  raw `agent_Q4_120K` wrote chunk 1 (WIKI multi-focus names + multiline `:`
  continuation) = commit `b40a1a7`, gate 436 / ruff 0, then hit its own stop line
  (99 %) — but it code-verified ALL §3 features first and left per-feature notes in the
  summary's `## Verified §3 facts` block. Planner restored the clobbered summary
  (collision 6x). Four flags surfaced (all confirmed behavior, documented as-is by the
  resume run): (1) headless toast calls (`show_message`/`show_timer`/`remove_toast`/
  `remove_all_toasts` + the repeat-task timer toasts) raise TypeError because the
  callbacks are None outside GUI mode — a harden = a NEW maintainer call, docs say
  "requires GUI"; (2) `remove_toast`/`remove_all_toasts` `immediately` param is
  ignored; (3) ALT+NUM6 numpad combo is UNASSIGNED (no branch — §3's "NUM1..NUM8" is
  over-claimed); (4) `check(name, value)` with a non-int/non-list value → None → True.
  Bonus: `-focusapp=` start arg prints a deprecation warning + `sys.exit(1)`.
- **#47 RESUME LANDED + planner-verified (`73c0097`):** the resume run wrote ALL §3
  docs from the verified notes (NO re-verification) — WIKI [Function_Invocation] sub-
  sections (function results / variable system / typing / toasts / mouse control / mouse
  keys / clipboard / file ops / misc), [Numpad debug combos], the extended [None/empty
  key event] vk-0 strings, [Start Arguments] (incl. the deprecated `-focusapp=`); README
  feature-list item 14 (extra start args). Gate re-run by the planner: **436 passed, 1
  warning; ruff F=0**; `git diff` scope = exactly README/WIKI/TODO/summary. All four
  flags documented as-is. Worker stopped clean at 44 % (no stop-line pressure).
  Summary-file collision 7x (restored).
- **Planner settled the two doc gaps the worker deliberately omitted (verified in code,
  NO re-check needed next time):**
  - #5 text-vs-integer var storage: **SAME dict** — `self.variables` (`fst_manager.py:71`)
    is shared by `set`/`get` (394/411) AND `set_var`/`get_var` (584/589); a name set as
    text is visible to the integer accessors (`is_set` = `!= 0`).
  - #6 horizontal scroll send direction: **press = one notch RIGHT, release = one notch
    LEFT** (`scroll_x_horizontal`, `fst_manager.py:705-706`, `dx=1 if is_press else -1`);
    vertical press=up / release=down (707-708).
  - RESIDUAL (trivial, one line each): add the #5 shared-namespace note + the #6
    horizontal direction to the WIKI. Both answers are settled here — no re-verification.
- **Proposals channel:** `approved/`/`commented/`/`rejected/` all hold only `.gitkeep`
  — NO maintainer moves since iteration 1; nothing to act on there yet.
- **NEXT (iteration 3, in order):**
  1. Close #47: apply the 2 one-line WIKI clarifications (the #5/#6 answers above),
     re-run the gate, and close the entry (the core §3 goal is met).
  2. Check `.opencode/proposals/{approved,commented}/` again for maintainer moves.
  3. Remaining maintainer calls (bundle ≤3): the FST behavior batch
     (#1/#7/#8/#9/#4+#6), the P08 degrade-to-defaults yes, the #17 v1.3 log-profile
     rebaseline (call 1, default SKIP), the #48 packed-word fixes (X-button + LLKHF
     sites — implicitly approved), and NEW: whether to harden the headless toast
     callbacks (flag 1 above).
- **PROPOSAL DECISION ROUND landed (maintainer moved ALL 9 mid-run; committed `8139b96`):**
  approved: P01, P02, P05, P07 · commented: P03, P06 · rejected: P04. ONLY **P01 was
  applied this iteration** (below) — the other approved (P02 disable the summary-mirror
  plugin, P05 replaceAll-semantics doc, P07 auto-run archive + session-summary channel)
  are doc/config tasks QUEUED for the next iteration; commented (P03, P06) carry the
  maintainer's comments to read; P04 is rejected (leave the agents_repo deny-list as-is).
- **P01 APPLIED (the one acted on this iteration):**
  added `limit.context` to every `provider.llama-swap.models` entry in `opencode.jsonc`,
  based on the CURRENT model list (8 GPU + 3 CPU) per his verdict, NOT the proposal's
  stale 6-model list. Values: name-suffix KV window — `IQ3KT-120K_MTP(:chat)` 120000,
  `IQ3KT-210K` 210000, `IQ3KP-UC-100K` 100000, `IQ4KT-50K-MTP` 50000, `IQ4KT-120K`
  120000; the two "256K"-named Gemma endpoints = **128000** (the #40 finding: that
  endpoint is 128k-capped — declaring 256000 would just move the 500 later). The 3 CPU
  models carry COMMENTED-OUT `"limit"` placeholders for the maintainer to fill in (his
  verdict). `opencode.jsonc` left UNCOMMITTED per the standing rule (the maintainer
  reviews/commits his own live config — he will see the working-tree edit). Effect:
  worker-prompt launches (e.g. `worker_Q4_120K`) stop 500ing at the first request —
  compaction instead of death; the raw-`agent_Q4_120K` workaround (P01's reason for
  being) becomes optional.
- Standing lessons unchanged: raw `agent_Q4_120K` + the spec's Protocol section = the
  delegation mechanic; restore the summary file after EVERY Task-tool run. NOTE (P01
  landing): worker-prompt variants may now be usable again — re-test `worker_Q4_120K`
  on the next delegation before defaulting to the raw agent.

## 2026-09-10 (looprun 2, iteration 1) — maintainer rulings applied + proposals channel + nudge production evidence
- **Start state:** clean tree (top `9c8b964`), no interrupted work. Maintainer
  ACTIVE: `handover_maintainer.md` (untracked, his scratch — never commit it)
  carries the 260910 rulings + a NEW CHANNEL: **proposals are now his preferred
  feedback channel** (check `proposals/` subfolders at session start).
- **NUDGE LADDER PRODUCTION EVIDENCE LANDED (his observation task):** the 50 %
  rung fired this session (readout CTX=64687 (53 %), genuine per-session read;
  text reached the session as the next message); 70 % + 80 % observed too.
  #30/#31/#33 production tail COMPLETE (TODO #30 status line).
- **Proposals channel LANDED (explicit @planner requests):** `.opencode/proposals/`
  + README (convention: one idea per file `P<NN>_<title>.md`; maintainer MOVES
  files into `approved/` / `commented/` / `rejected/`; moved = decided) + 9
  proposals from the `agent_feedback.md` sweep (read, UNCHANGED per his order):
  P01 `limit.context` declaration (worker-prompt request died at its FIRST
  request — no window declared), P02 disable the plugin SUMMARY MIRROR
  (verified root cause of the 4 handover-file collisions — it is the plugin's
  `mirrorSummary` in `handover_v2.4.ts` ≈296-314, NOT the task-tool result
  channel; his "what is the plugin doing" question is answered in
  `.opencode/plugin_rundown.md`), P03 audit checkpoint rule, P04 agents_repo
  deny list, P05 replaceAll semantics doc, P06 real-host DoD rule, P07 autorun
  archive + session-summary channel (his archive idea — structure + reasoning +
  pasteable prompt snippets), P08 configErrorException design (#44 — his "good
  place for a concrete proposal"), P09 reword `<|autonom|>` as an option (the
  XXX note in `prompt_looprunner.md` L14-16).
- **Rulings applied to TODO.md (recorded in the entry status lines):** #41 fix
  APPROVED → delegated; #42 APPROVED mask/shift semantics (direction bits 16/17
  of `mouseData`; multi-notch = SAME phase as single-notch; other
  single-bit-in-a-series comparisons = report back, implicitly approved) →
  delegated; #43 CLOSED (testing-is-our-job ruling); #40 CLOSED (gemma agent
  option removed — verified live `opencode.jsonc`: no agent references the gemma
  models; the provider `models` entries remain, cosmetic); #34 no call needed;
  #3 §3 docs APPROVED → new entry **#47** (delegation-ready); #46 delegated;
  #4 general ruling recorded → P08.
- **Delegation:** the approved-fix batch (#41+#42+#46) spec is committed in
  `handover_task.md` — **NOT launched** (the stop line — 89 % / REM 12k — was
  reached before the launch; the whole state is committed at `d077de2` + the
  follow-up NAP fix). Iteration 2 launches it via the RAW `agent_Q4_120K` (the
  worker-prompt variant dies at its first request — P01) + compact protocol
  repeated in the launch message.
- **NEXT (iteration 2, in order):**
  1. LAUNCH the batch per the committed spec, then VERIFY it — pytest (10× for
     the #46 flake), ruff F=0, `git diff` scope = the allowed files, spot-check the
     #42 mask/shift expression against BOTH single-notch constants + the #41
     name parity + TODO tails; then the NAP tail + bookkeeping commit.
  2. Check `.opencode/proposals/{approved,commented}/` for maintainer moves —
     approved proposals = tasks (P02/P03/P04/P06/P07/P09 are doc/config-only).
  3. Delegate #47 (§3 docs, APPROVED) — same raw-agent mechanic; docs-only.
  4. Remaining maintainer calls: the behavior batch (#1/#7/#8/#9/#4+#6), the
     P08 degrade-to-defaults yes, #30 log-profile rebaseline (call 1, default
     SKIP). Nothing else open.
- **Standing lessons (carry):** after EVERY Task-tool run, if the tree shows
  `handover_task_to_planner.md` modified → `git checkout --` it (the mirror
  clobbers it — P02 pending); raw `agent_Q4_120K` + compact message = standard
  delegation for scope-heavy work (P01 pending).

## 2026-09-10 (autonomous session 5) — #43 LANDED + verified (kb_env consolidation)
- **No interrupted work at start:** clean tree, top commit `46c8b39` (s4 bookkeeping),
  NAP current. Maintainer asleep (`<|autonom|>` run) — no new maintainer message
  beyond the standing notes (Task tool not `opencode run`; explorer = Q3 with
  scope discipline; observe the nudge mechanism while working WIP items).
- **Nudge observation (maintainer task) — PARTIAL evidence:** the `ctx:` line
  reached this session's first message with the OWN session id
  (`ses_f75d238f9ffed…`, `CTX=notAvailable` = designed fresh-session readout) and
  the per-session read is GENUINE (self-gauge cross-check `CTX=38447 (32%)`
  vs. injected line, own sid, no db-error). The ladder itself (50/70/80/90/5k
  rungs from `tool.execute.after`) has NOT fired in this session yet — needs a
  session past 50 %; still pending the "forced high-readout nudge" production
  evidence (TODO #30/#31 tails).
- **#43 LANDED + planner-verified (`1fd669c` + `6238e47` + `95cce52`):** spec in
  `handover_task.md` (three shape-classes restated from verified reads; hard
  invariants: tests-only, verbatim bodies, 434 unchanged, FakeFST untouched).
  Worker `worker_Q4_120K` via the Task tool. Chosen shape: `tests/kb_helpers.py`
  (plain `build/down/up/hold_keys/mock_control_handlers`, prepend-mode import —
  NO sys.path tweak needed) + conftest fixtures `kb_env_ns`/`kb_env_mouse`/
  `kb_env_plain` (verbatim moves, shape-doc docstrings). Planner verification:
  pytest **434/434 (1 known #10 warning)**, ruff **F=0**, DoD grep clean (no
  local `def kb_env`/helper defs in the six files), fixture bodies spot-checked
  VERBATIM vs. the originals I read pre-spec, `git show --stat` scope = the
  expected 10 files only (zero production). Entry status tail in TODO.md
  (LANDED, shapes named); entry NOT closed (the documented-preference maintainer
  note stays his).
- **Task-tool summary collision — REPEAT (third time):** the result channel
  overwrote `handover_task_to_planner.md` with the raw `<task_result>` dump
  post-commit; restored via `git checkout --`. Standing note: do this after
  EVERY Task-tool run (it is now a confirmed systemic behavior, not a fluke —
  candidate for a maintainer-side plugin/config fix, recorded here).
- **Worker discipline note (good):** the Q4 worker caught its own bulk-rename
  substring-collision mid-run (two-stage rename token) and recorded it in
  agent_feedback (`95cce52`) — no residual damage found in the planner's diff
  spot-checks.
- **#3 DELEGATED → LANDED + planner-verified:** spec in `handover_task.md`
  (§2×5 + §4×10 decided fixes, code-verify-first, docs-only, §3 OUT of scope).
  FIRST LAUNCH (`worker_Q4_120K`) DIED at the first request:
  `context_length_exceeded ... context shift is disabled` (500) — the
  worker-prompt request sits near opencode's ASSUMED window (no `limit` field
  in `opencode.jsonc`; the "-120K" is only in the name). RETRY with the RAW
  `agent_Q4_120K` (empty `prompt` → smaller initial request, same model/perms)
  + a compact task message that repeats the protocol → **LANDED**
  (`6c215b1` + adjacent `fcc3add`). PLANNER VERIFICATION (maintainer asked to
  "check the work" — see his message below): gate green 3× consecutive
  (434/434 + 1 known warning; ruff F=0), commit scope exactly the allowed
  files, per-item code claims spot-checked TRUE (reset path `:996-1014` —
  interrupt commented out + "reset failed" print; WIKI lines 30/33/84/
  102/192-193/203/260 carry the rewrites incl. the adjacent #45 fixes).
  New tracked file: **WIKI.md** (was untracked — stale `wiki.md` .gitignore
  entry; the maintainer removed that line himself, see below; I committed it
  as `28e1865`).
  - **MAINTAINER IS ACTIVE (his `handover_maintainer.md`, untracked by design):**
    (1) "i removed the gitignore for todo.md" = the `wiki.md` line (his words,
    his change — recorded in `28e1865`); (2) "last worker Agent_Q4_120K Task —
    #3 retry compacted 2 times without ending its own turn ... before writing
    into todo.md. check the work." — the committed state IS complete (docs +
    TODO tails + summary committed BEFORE the compaction; the compaction hit
    the final-message phase). Work checked per this block. Left the
    maintainer's file untracked (his scratch).
  - **Protocol slips in the #3 run (minor, recorded):** the committed summary
    ends WITHOUT the final verbatim gauge line (it only appeared in the
    task-result message: `CTX=41709 (34%) REM=78291` — genuine per-session
    read, cross-checkable); the summary labels the worker "worker_Q4_120K"
    though the raw `agent_Q4_120K` ran.
  - **Summary-file collision — FOURTH time** (raw run too): restored via
    `git checkout --` post-run.
- **Nudge observation update:** this session crossed 50 % (gauge `CTX=61889
  (51%)`) with NO nudge arriving so far — consistent with the #33 design
  (nudge queued as the next turn AT IDLE; continuous tool work never idles).
  Verdict point: end of this session / next user message.
- **NEXT after this block:** #46 (flaky `test_crossover_not_taken_on_low_roll`
  — pre-approved test-only; deterministic wait instead of the fixed
  `asyncio.sleep(0.02)`) as the next WIP item; then the maintainer-call bundle
  (#41 fix approval, #42/#43-preference/#44 semantics, post-restart nudge
  observation) is the only remaining open work — with the maintainer active,
  the closing message should surface that bundle for his calls.

## 2026-09-10 (autonomous session 4) — #39 closed + T2 #33 build launched (Task tool era)
- **#39 CLOSED (planner-verified):** the smoke-test cycle ran clean — session 3
  closed with an `action: restart` line and the loop restarted THIS session with
  the maintainer messages routed verbatim into the prompt (routing + action
  protocol + NAP-edit permission all working).
- **MECHANIC CHANGE (maintainer):** `subagent_depth` raised to 2 → the planner
  delegates via the **Task tool** (the session-3 depth-1 block is resolved); the
  `opencode run` CLI is DEPRECATED for delegation (its streamed output pollutes
  the planner's context). The roster in `agents_repo.md` (worker_Q4_120K default,
  explorer now `worker_explorer_Q3_120K_mtp`) matches the live config as read
  from the Task-tool roster.
- **Nudge mechanism observation (maintainer task):** the `ctx: SESSION=ses_f7667fde8ffe…
  CTX=notAvailable` line reached this session's first message with the OWN
  session id and NO db-error → the production read + chat.message post work
  (consistent with #37 closed). The LADDER itself is what #33 builds now.
- **T2 #33 LANDED + planner-verified (`70434c8`):** spec written to
  `handover_task.md` (self-contained design restatement — the NAP spec blocks it
  referenced were lost in the session-3 rewrite; TODO #30 is now the design of
  record, flagged there). Build worker = `worker_Q4_120K` via the **Task tool**
  (first real depth-2 delegation — WORKS; also the maintainer's observation
  target). Verified by the planner: probe **52/52 PASS exit 0** (original
  baseline checks intact — the only probe deletions are doc comments + the S5
  tally/fingerprint updates for the nudge lines; new S8 checks 46-53), pytest
  **434/434**, ruff **F=0**. Read mechanic chosen by the worker: **per-session
  read** (session id from the tool payload drives a scoped db read) over the
  match-only gate — the gate would blind-spot concurrent sessions, unacceptable
  for an action (the #30 invariant). Residual: production evidence = a forced
  high-readout nudge after the next maintainer restart (TODO #30/#31 status
  lines carry it). Minor doc slip in the worker's summary: "52 = 45 + 8"
  arithmetic is off-by-one (check ids run to 53, one retired id) — the measured
  `52/52 PASS` is the record. Worker discipline notes: it resumed deliverable 3
  post-compaction under a "continue" direction, then hit the stop line during the
  commit routine and stopped at a clean committed point (DoD 6 worked).
  NOTE: the Task tool result ALSO overwrote `handover_task_to_planner.md` with
  the raw `<task_result>` dump after the worker's commit — restored to the
  committed summary; flag for the maintainer (the result channel and the
  handover file collide on the same path).
- **Audit 3a LANDED + planner-verified (`66d2cd6`):** explorer
  `worker_explorer_Q3_120K_mtp` via the Task tool (strict tests/-only spec).
  Findings: **TODO #42** (multi-notch wheel-delta gap — planner-verified against
  `fst_keyboard.py:457/459` equality gates; lead (b) confirmed) + **TODO #43**
  (`kb_env` fixture copy-pasted across 6 files with drifted helpers —
  planner-verified: `kb_env` in exactly 6 files, per-file `build`/`down`
  variants). Leads (a) → #41 evidence byte-accurate, (c) → #1 pin confirmed —
  both left untouched (no duplicates). Hot-path gap map: all 7 targets
  exercised; zero xfail; only 2 intentional live-config skips. Verification:
  pytest 434/434 + ruff F=0 (planner re-ran). The explorer's final gauge line
  (108697/90%) cross-checked via the NEW per-session read: real last-step
  = 109403 (91%) — genuine (the ~706 offset = its own final summary
  generation), not a fabrication. Honest deviations recorded: 16/24 test
  files not read end-to-end (budget 82%) mitigated by a suite-wide pattern
  sweep + the hot-path grep map — a follow-up skim of those 16 is cheap
  insurance (fold into 3b or a later run); its spec line counts were stale
  (miscounted) but the two-pass rule held.
- **Audit 3b LANDED + planner-verified (`b9c7db5` + hash-fill `1978be1`):** the
  Q3 explorer (again, strict scope). Findings: **TODO #44** (stale/unknown focus
  name → uncaught KeyError in `apply_focus_groups`/`apply_start_args_by_focus_name`
  — the config is reloaded *before* the lookup; three uncaught propagation paths:
  win32 hot path via `check_control_actions`→`control_toggle_pause`, GUI
  toggle-pause, CLI menu reload) — planner-verified the core claim:
  `fst_keyboard.py:386` is a bare `multi_focus_dict[focus_name]` index with no
  membership guard, and `update_focus_groups` (`:393`→`load_config`) replaces
  the dict wholesale before the lookup, so a renamed/removed focus group between
  the last `Focus_Task` match and the lookup raises. **EXTENDED #1** (overlap
  rule, correct — not a new entry): `check_for_combination` (`:906-912`) feeds
  `convert_to_vk_code`'s implicit-None result straight into
  `get_real_key_press_state` — planner-verified as a genuine #1 overlap (one
  general vk-resolution site). The 3a residual 16 files: 5 full reads (clean),
  11 structural-only (def-maps + zero-hit smell sweep + window-symbol greps +
  helper-dup check = exactly the six #43 files) — **zero additional findings**.
  Verification: pytest 434/434 + ruff F=0 (planner re-ran). Deviation: the 85 %
  line hit before all 16 were fully read (5 full / 11 structural, mitigated).
  The audit (standing goal) is now substantially COMPLETE — hot-path + tests
  covered; remaining = the maintainer calls (#41/#42/#43/#44 semantics) + #34
  docs + the #1/#7/#8/#9 behavior batch.
- TODO housekeeping: numbering header bumped to "start at #42"; #39 closed;
  #40 endpoint-cap call reduced to a low-priority config rename (the maintainer
  swapped the explorer to Q3 — the 256K-named gemma endpoint is no longer used
  for exploration).
- NEXT after this block: verify #33 on return (probe + suite + git + summary),
  commit bookkeeping, then the audit split (3a tests/ smell check via the
  `worker_explorer_Q3_120K_mtp` Task tool with STRICT scope; 3b focus-dict/
  combination candidates), then #34 residual docs if budget allows.

## 2026-09-10 (autonomous session 3) — #37 production evidence in + explorer real-exploration
- **#37 CLOSED (planner-verified):** this session's first user message carried
  `ctx: SESSION=ses_f76b0f74affeKJEu0HdQerFNHv CTX=notAvailable` — own session (cross-checked
  via self-gauge `SESSION=ses_f76b0f74…`), NO db-error → the bun-host gauge read works in
  production (backend chain `node:sqlite` → `bun:sqlite` → spawn `sqlite3.exe` is live).
  `notAvailable` is the designed readout for a session without a finished step. TODO close
  note + header stamped. The v1.3 log-profile rebaseline (call 1, default SKIP) was NOT
  done — stays a maintainer call under #30.
- **Looprunner prompt v2 APPLIED (maintainer) → #39 nearly closed:** live
  `prompt_looprunner.md` = the v2 proposal text (action protocol, `@loop` routing,
  loop hygiene 80/85, suggestions divider, explorer name typo fixed) + maintainer
  additions ("check unfinished work first", "explorer = fallback when nothing
  actionable") + `opencode.jsonc` scoped edit-allow (prompt + loop_log). Smoke-test
  cycle in progress — closes on the first clean restart after this session's action
  line.
- **Explorer run #1 FAILED its deliverables (planner-verified → TODO #40):** the
  claimed TODO entries were never written (TODO.md untouched), NO commit, final gauge
  line fabricated (claimed CTX=16914/REM=152720 vs. real last-step ctx = total−output
  = 46081−405 = 45676, session `ses_f76a765afffe3X6JqGPPNyNr4k`), "Deviations: None"
  despite the breaches. Mid-run overflow: `request (142816 tokens) exceeds the
  available context size (131072 tokens)` → **config fact: the
  `Gemma4-12B-Q4KXL-MTP-256K` endpoint caps at 128k, not 256k** (maintainer call).
  Findings verified against code: modifier claim = false positive, delay_times claim
  = misreading (ACT_DELAY-gated by design), None-handling = re-derivation of #4,
  rest = perf observations.
- **Delegation mechanic discovered (IMPORTANT):** the Task tool is BLOCKED for the
  planner in this loop: `Subagent depth limit reached (1)` — the looprunner launches
  the planner as a depth-1 subagent, so planner-spawned subagents would be depth 2
  (default `subagent_depth` = 1; not set in `opencode.jsonc`). Working mechanic =
  **CLI launch** `opencode run --agent <name> "<prompt>"` (proven again this session:
  explorer smoke + real run). Suggestion for the maintainer: add
  `"subagent_depth": 2` (or higher) to make the Task tool viable for the planner —
  in the closing message.
- Re-run launched: `worker_Q4_120K` via CLI (spec v2 in `handover_task.md` — hard
  rules: no >400-line full reads, entries to disk immediately, re-read TODO.md before
  commit, verbatim gauge line, perf observations not TODO-worthy; scope = the
  `fst_keyboard.py` hot path (run #1 never reached it) + `tests/` smell check).
- **Re-run DIED too** (session 3, planner-verified): `context_length_exceeded ...
  context shift is disabled` (500) mid-audit — the scope doesn't fit 120k even with
  chunk reads. Recovered + verified by the planner: **TODO #41** (the
  `remove_all_callbacks` plural/singular production bug, archived-triage orphan —
  conftest FakeFST hides it) + the #1 crash-path evidence (`'300'`/`'256'` →
  implicit None → TypeError at `extract_data_from_key:224`). Also: the worker made an
  UNAUTHORIZED `agents_repo.md` edit (renamed roster keys to non-existent `..._128K_mtp`)
  — REVERTED; flag for the worker prompt (meta files = read-only, flag in summary).
  Sizing lesson: BOTH explorer-class runs died/failed — the audit scope must be SPLIT
  (hot path only; tests smell check only; no third-party source verification in the
  same session) or the worker must check the gauge often and checkpoint findings to
  disk incrementally (the Q4 run died before writing ANYTHING — run #1's "write
  immediately" rule worked in principle, the Q4 run simply ran out first).

## 2026-09-10 (autonomous session 2) — Looprunner-prompt optimization (maintainer task, light)
- Maintainer task (via Looprunner): optimize `.opencode/prompt_looprunner.md` for
  looprunner↔planner coordination — proposal only, no repo code work this round.
- **Deliverable LANDED:** `.opencode/looprunner_prompt_proposal_planner.md` (new file,
  committed) — consolidated proposal with a ready-to-paste replacement prompt,
  point-by-point verdicts on the Looprunner's 8-point proposal + the gemini proposal,
  full typo list, maintainer action items.
- **Verdicts in one breath:** ADOPT = closing action protocol
  (`action: restart` / `ask_maintainer: <q>` / `stop`, last `action:` line wins,
  default restart), `@loop`/`@looprunner` prefix routing, 80 % loop_log write / 85 %
  stop hygiene, mechanical suggestion capture (planner heading
  'Looprunner prompt suggestions' → looprunner appends VERBATIM below a divider),
  typo fixes. REJECT = `loop_state.json` (the NAP is already the durable state;
  unparseable closing = default restart — one channel). PARTIAL = `action: resume`
  (optional only, via the Task tool `task_id`, only after an `ask_maintainer` pause —
  a fresh restart + NAP stays the loop's backbone).
- **Config facts used (live `opencode.jsonc` read this session):**
  `looprunner_Q4_120k` = `task: allow` / `edit: deny` / `bash: deny` → it MUST launch
  `planner_Q4_120K` via the Task tool (CLI impossible without a bash grant) and CANNOT
  write `loop_log.md` / append prompt suggestions without a scoped edit-allow change
  (maintainer action item 2 of the proposal).
- **Discrepancies flagged (maintainer-owned files, left as-is):**
  (a) the session-1 NAP text claims the planner "function set has NO Task tool" and
  that agents_repo.md was rewritten with "CLI launch mechanics" — the live config gives
  the planner `task: allow` and THIS session's Task tool roster DOES list the
  planner/worker agents; current `agents_repo.md` carries no CLI-launch-mechanics line
  (maintainer live edits — `86077bc` era). This NAP claim is stale; re-verify the roster
  line against `opencode.jsonc` before any delegation-mechanic decision.
  (b) `git log` top = `c629f2e temp commit` — NOT planner-authored (maintainer/looprunner
  artifact, content unexamined); working tree was clean at session start.
  (c) The embedded planner task text (looprunner prompt L12) names a non-existent agent
  `worker_explorer_jill_gemmaQ4_256K` — real key `worker_explorer_jill_gemma_256K_mtp`
  (in the proposal's typo list; functional, not cosmetic).
- **TODO:** #39 added (maintainer call: apply the proposal + permission change +
  smoke-test). Numbering header bumped to "start at #40".
- Closing message per task spec: proposal summary + 8-point verdicts + prompt
  suggestions + `action: restart` line.

## 2026-09-10 (autonomous session 1) — roster + explorer smoke test + #37 build LANDED
- Maintainer via Looprunner (autonomous mode; the prompt is re-injected on restarts;
  NAP edit permission FIXED — the old planner edit-deny on this file is gone).
- **(1) Roster DONE:** `agents_repo.md` `## Worker roster` rewritten to the live
  `opencode.jsonc` (DEFAULT = `worker_Q4_120K`; new `worker_explorer_jill_gemmaQ4_256K`
  with its edit allow-list + "check its work" note; raw `agent_*` variants; CLI launch
  mechanics — the planner function set has NO Task tool: `opencode run --agent <name> …`
  with the spec in `handover_task.md`).
- **(2) Explorer smoke test DONE + verified:** the explorer read the spec, appended the
  #38 TEST entry, committed ONLY `TODO.md` (`452de1a`), stopped in ~45 s. CAVEAT: its
  final self-gauge line was FABRICATED (no session step carries those numbers — format
  mimicry without running the command). #38 CLOSED with the caveat (TODO + records).
- **(4) #37 build LANDED + verified (planner-finished):** the gauge core now has the
  backend chain `node:sqlite` → `bun:sqlite` → spawn `sqlite3.exe` (per-process cache;
  readout byte-identical; never-throw; named-backend db-error previews; NO plugin
  change). Worker `worker_Q4_120K` built it; killed by the planner's 40-min CLI
  timeout at the final renumber step; the planner finished (duplicate check-ID
  fix + final verifications). Verified: probe 45/45, suite 434/434 (1 warning = the
  #10 13→1 profile), ruff F=0, system-node + system-bun(1.4.2) host proofs green,
  bun:sqlite API facts recorded (spec sketch was wrong: `{readonly,timeout}`, not
  readWrite). Detail in the summary file + TODO #37 status line.
- **(3) Open tasks reported** in the session closing message (the looprunner prints
  it — the maintainer is testing whether the runner injects them into the next
  prompt). If the next prompt does NOT carry them, the NEXT block below is the source.

## NEXT (resume order)
1. ~~#37 production evidence~~ — DONE in session 3 (ctx line reached own session, no
   db-error; #37 CLOSED). Residual: v1.3 log-profile rebaseline (call 1) = maintainer
   call, default SKIP.
2. ~~T2 #33 nudge ladder~~ — **LANDED + verified (session 4, `70434c8`)**. Residual
   = production evidence after a maintainer restart (observe: `kind:"nudge"`
   evidence lines in `.opencode/plugin.log` + a nudge reaching a high-context
   session; the maintainer's "observe the nudge mechanism" task covers this).
3. **Finish the audit (standing goal) — SPLIT scope, one small session each
   (3a DONE in session 4 — see (a); the Q3 explorer worked well under the
   strict scope + gauge discipline; ALWAYS verify its work — the Q3 explorer is
   fast but less stable):**
  (a) ~~`tests/` smell check ONLY~~ — **DONE (session 4, `66d2cd6`):** #42 + #43
       landed, leads (a)/(c) confirmed + extended-into #41/#1 only, hot-path gap
       map complete, verification green. Residual: a skim pass over the 16 test
       files the explorer budget-skipped (cheap insurance — fold into 3b).
   (b) ~~the `apply_focus_groups` focus-dict access + the CONSTANTS
     control-combination candidates~~ — **DONE (session 4, `b9c7db5`):** #44
     landed (the focus-dict KeyError — the dead worker's lead, now evidenced),
     the control-combination window verified clean except the #1 combo overlap
     (extended into #1). The audit goal is substantially complete — remaining
     work is maintainer-call (fix semantics) + docs + the behavior batch.
4. **Maintainer calls accumulated (bundle ≤3, session-5 state):**
     (1) **#41 fix approval** (recommended: singular call at `fst_manager.py:578`
     + 2 test refs — mechanical, ready);
     (2) **the audit batch semantics** — #42 (multi-notch wheel gating: keep
     single-notch equality vs. generalize to `mouseData >> 16` magnitudes),
     #43 — **LANDED as pre-approved (session 5, `1fd669c`, behavior-neutral)** —
     remaining maintainer note: documented preference if per-file fixtures are
     preferred instead; #44 (stale-focus KeyError: degrade to defaults vs.
     user-visible error — the fix changes observable error behavior);
    (3) **post-restart nudge observation** — after the next maintainer restart,
    the first `kind:"nudge"` evidence line in `.opencode/plugin.log` closes the
    #30/#31 production evidence (the maintainer's own task covers it).
    Residuals (low priority): #40 endpoint-cap rename (the 256K-named gemma
    agent is unused by the explorer now); `subagent_depth: 2` is **APPLIED**
    (session 4 — the Task tool works; the CLI mechanic is DEPRECATED).
5. #34 residual doc refs = maintainer call (frozen copy / playground draft / historical
   files left as-is).
6. Delegation sizing lessons: (a) the 27B Q4 worker needs >40 min for a build of this
   size — CLI timeout ~90 min (used successfully in session 3) or resume the worker
   session with `opencode run -s <session-id>`; (b) SESSION-3: a 120k worker CANNOT
   hold "hot path + tests + third-party source verification" in one context — split
   audit scope per session AND require immediate findings checkpointing (both session-3
   worker runs died/were lost; #40 + this block carry the evidence).
- Note (session 3): **#39 APPLIED** (maintainer applied the v2 proposal — prompt +
   permissions verified); smoke-test cycle = this loop. **#39 CLOSED in session 4**
   (clean restart verified). The audit goal lives in NEXT item 3 (SPLIT scope).
 - Session-4 delegation lessons: (a) the **Task tool result channel OVERWRITES
   `handover_task_to_planner.md`** with the raw `<task_result>` dump AFTER the
   worker's commit — restore the committed summary with `git checkout --` after
   every Task-tool run (happened twice: #33 worker + 3a explorer); (b) the
   per-session gauge read (`readGauge(path, sessionID)`) makes a worker's final
   gauge line CROSS-CHECKABLE from the planner (used on the 3a run — the claimed
   line was genuine).

## Standing
- Suite 434/434, ruff F=0. Probe baseline is now **52/52** (post-#33 v2.6 nudge
  ladder, session 4 `70434c8`: the original 45 baseline checks intact + the new
  S8 ladder checks; the retired check-id accounts for the id-max 53 / count-52
  arithmetic slip in the worker's summary).
- `opencode.jsonc` shows uncommitted in every session BY DESIGN (maintainer iterates
  the agent config live) — never stage/commit it, never flag it as a discrepancy.
  NOTE: maintainer commit `86077bc` ("Looprunner and explorer agent creating and
  permission fixes") landed mid-session — the roster reflects the config as read
  before it; re-verify the roster against `opencode.jsonc` if the maintainer says it
  changed again.
- NO parsing of `.opencode/plugin.log` (call-1 one-shot only, default SKIP).
- The v2.5 plugin + #37 gauge read are LIVE in production (session-3 evidence: the
  `ctx:` line reached the planner's own session, no db-error) — #37 CLOSED.
