# HANDOVER PLANNER — Phase 6 (post-T1; autonomous-loop era)

FIRST read AGENTS.md, agents_repo.md, TODO.md, this file.

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
