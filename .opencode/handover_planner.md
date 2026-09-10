# HANDOVER PLANNER — Phase 6 (post-T1; autonomous-loop era)

FIRST read AGENTS.md, agents_repo.md, TODO.md, this file.

## 2026-09-10 (looprun 2, iteration 6) — split proposal part 3+4: part 3 delegated (P02 fresh-process proof run), part 4 = this trim
- **Start state:** safe. Tree top `2e235cd`; the ONLY deltas are the
  maintainer's own uncommitted meta batch + the by-design `opencode.jsonc`
  (never stage either): M `prompt_agent_planner.md` / `prompt_looprunner.md`,
  D `looprunner_prompt_proposal_planner.md` / `plugin_rundown.md` /
  `proposals/files/prompt_looprunner.md` /
  `inbox_planner/M260910-1346_nap-bloat-prompt-separation.md`, untracked inbox
  files `260910-1818.md` + `compaction_warning.md` (inbox_planner) +
  `compaction_warning_see_inbox_planner.md` (inbox_worker) — their REPLIES are
  committed (`2e235cd`: done/ + feedback/); leave the files as-is. NO
  interrupted planner/worker work.
- **Launch-message XXX note** = the iteration-4 maintainer message re-routed a
  THIRD time — already applied (conditional-autonom wording verified present in
  the live `prompt_looprunner.md`, XXX note gone, `c4ad33c`). Nothing to do.
- **Proposals channel:** NO maintainer moves — both drafts still in the
  proposals/ root (`260910_prompt-and-todo-split.md`,
  `260910_plugin-compaction-detection.md`); `approved/` holds only P01 (applied).
- **Work chosen:** the split proposal's **pre-approved parts 3+4** (no maintainer
  call needed; parts 1+2 wait on his ruling):
  - **Part 3 (TODO split) DELEGATED** to `worker_Q4_120K` (Task tool — spec
    committed in `handover_task.md`): MOVE = #47/#45/#39/#37/#38/#34/#36/#43/
    #44 (full text → `todo_records.md`, one-line stubs in TODO.md); LEAVE OPEN =
    #1/#7/#8/#9/#4/#6/#11/#17/#30/#3; WORKER JUDGES = #46/#41/#42/#40/#35;
    misfiled-open #48 → FST-behavior section. Meta-only, commit scope = the two
    md files + summary.
  - **Part 4 (NAP trim) PLANNER-DIRECT** = this rewrite: all iteration blocks
    older than the last two condensed to one line each (see the archive below).
- **P02 FUNCTIONAL PROOF in flight:** this launch is the FIRST Task-tool run
  after a FRESH process (PC restart + loop restart) → if
  `handover_task_to_planner.md` is NOT clobbered after the worker's commit, the
  P02 collision saga is CLOSED; if it IS clobbered, root cause = the task-tool
  RESULT channel itself (opencode core) → maintainer-side fix (restore via
  `git checkout --` either way; verdict recorded on return).
- **NEXT (iteration 7, in order):**
  1. VERIFY the part-3 return: `git show --stat` scope, stub/records grep, the
     judged-entry report (#46/#41/#42/#40/#35) → settle any residual ambiguity
     (open entries never deleted), bookkeeping commit.
  2. P02 verdict → update Standing + (if still colliding) a maintainer call in
     the closing message.
  3. Maintainer calls bundle (≤3 per message, closing message): (a) rulings on
     the two proposal drafts (split parts 1+2 = his live prompt; compaction
     detection); (b) confirm the feedback-folder path
     `proposals/maintainer/feedback/`; (c) the FST behavior batch (#1/#7/#8/
     #9/#4+#6); (d) headless-toast harden-vs-docs; (e) #17 v1.3 rebaseline
     (default SKIP).
  4. If budget remains: light explorer pass for NEW issues (the standing audit
     goal is substantially complete — 3a/3b done; #48 is the only open audit
     residual and it is implicitly approved, not audited).

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
- `opencode.jsonc` uncommitted BY DESIGN (maintainer iterates live) — never
  stage, never flag.
- Maintainer's uncommitted meta batch (prompt edits + deletions + untracked inbox
  files — see the iteration-6 start state) — never stage/flag; the processed
  replies are committed.
- After EVERY Task-tool run: if `git status` shows `handover_task_to_planner.md`
  modified → `git checkout --` it (the P02 mirror removal only takes effect from
  a FRESH process; the functional proof rides on iteration 6).
- Delegation: Task tool (`subagent_depth` 2), default `worker_Q4_120K` (P01
  re-test PASSED — worker-prompt launches work); raw `agent_*` = fallback;
  explorer `worker_explorer_Q3_120K_mtp` (fast, less stable — ALWAYS verify its
  work).
- NO parsing of `.opencode/plugin.log` (call-1 one-shot only, default SKIP).
- TODO.md curation: open items + one-line records in TODO.md; full text of
  closed entries in `todo_records.md` (formalized by split proposal part 3).
