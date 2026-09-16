# TODO — maintainer's open items

Numbering: every entry ID is UNIQUE and NEVER REUSED — used so far up to #59, new
entries start at #60 (closed IDs stay reserved in `todo_records.md`).
Closed entries live in `todo_records.md` (one-line records — resolution in file/git log).
Entries follow the AGENTS.md contract (title / evidence / outcome / acceptance / scope / status).

## Maintainer calls (open, in order)

1. (none open as of 2026-09-15 — the #11 call was resolved by his ruling D1-A in the consolidated decision file)
2. Resolved calls (records): v1.3 log-growth confirmation → #17 CLOSED (one-shot read
   executed); v2.5 nudge target scope ruling → #33 (per-session read); Deferred FST
   behavior batch → all 5 Recs approved + LANDED on `fst_work` (unit A `4b93d37` +
   unit B `2891dab`, proposal in `implemented/`); build schedule → complete;
   `handover_task.md` worktree conflict → #49 CLOSED (`b6dc3e7`); Looprunner prompt
   v2 → #39 CLOSED.

## FST behavior decisions (open — maintainer calls unless noted)

## 1. (closed 2026-09-12, iter-9 unit A `4b93d37` on `fst_work`, full text in todo_records.md) — General vk resolution: unknown keys surface as ONE user-visible error at every vk-resolution site (P08 error toast / headless print) via the shared `FST_Keyboard.surface_config_error` helper; both constraint fail-closed guards + `check_for_combination` (+ hot-path resume catch) route through it, dedup + fail-closed preserved; unknown constraint *names* stay silent no-ops by design.
## 7. (closed 2026-09-12, iter-9 unit B `2891dab` on `fst_work`, full text in todo_records.md) — Empty macro: BEHAVIOR WINS — the trigger key IS suppressed for an empty key group (kept); the stale comment reworded to match ("supress" fixed); pinned by the pre-existing `test_empty_macro_sequence_no_playback` (no-playback AND suppression).

## 8. (closed 2026-09-12, iter-9 unit B `2891dab` on `fst_work`, full text in todo_records.md) — `ap`/`ar` "all keys (incl simulated)" = UNION (real OR simulated): both setters write the `all` dict as `is_press or <other side's state>` + the symmetric `vk_code > 0` guard on the real setter; doc comments state the union; 3 new pinning tests (crossing release both directions + vk guard).


## 9. (closed 2026-09-12, iter-9 unit B `2891dab` on `fst_work`, full text in todo_records.md) — Repeat-constraint excepts hardened: `ValueError` added to `toggle_repeat`/`is_repeat_active`/`reset_repeat`/`stop_all_repeat` (+ `stop_repeat` as the fifth consistency site); one pinning test covers all five methods with malformed (1-/3-element) entries.


## 4. (closed 2026-09-12, iter-9 unit B `2891dab` on `fst_work`, full text in todo_records.md) — Dead `elif result is None: pass` branch deleted from `check_constraint_fulfillment` (unreachable — `constraint_evaluation` normalizes None→True); the A→C triage reclassification stays maintainer-side (`COVERAGE_TRIAGE.md` is agent-read-only).


## 6. (closed 2026-09-12 by maintainer ruling — KEEP, full text in todo_records.md) — `fst_keyboard.py` 302-303 (mixed-Key rebind conversion) RULING-KEEP ("keep this until I can test a bit more"): the `###XXX 241022-1341` block stays and is DO-NOT-TOUCH; the triage class correction stays maintainer-side per #4.


## 11. (closed 2026-09-15, see todo_records.md) — General contradiction prevention — maintainer ruling D1-A (2026-09-15_backlog-decisions.md): kept OFF as an intentional decision (no re-enable); decision comment added below the untouched XXX 241016-1101 pin in fst_keyboard.py; the pinning tests stay the semantic pin.

## 48. (closed 2026-09-11, first commit after `00bc24f`, see todo_records.md) — Packed-word equality checks in the mouse filter: X-button mouseData + LLKHF flags (2026-09-10, #42 report-back)

## Docs & misc (open)

## 3. Rework README and WIKI to the current state of the code (2026-09-06) (closed 2026-09-10, see todo_records.md)

## 47. (closed 2026-09-10, see todo_records.md) — Docs: §3 undocumented features (variable system, invocations, extra start args, numpad debug combos) (2026-09-10, from the #3 residual)

## 46. (closed 2026-09-10, see todo_records.md) — Flaky test: `test_crossover_not_taken_on_low_roll` — timing/order-dependent (2026-09-10)

## 45. (closed 2026-09-10, see todo_records.md) — Doc errors found adjacent to the #3 rework: WIKI invocation "evaluate to False" claim, WIKI `+a, +b` rebind notation, README "he first" (2026-09-10)

## 40. Explorer run #1 output unreliable — no entries on disk, no commit, fabricated gauge, endpoint 128k ≠ 256K (2026-09-10) (closed 2026-09-10 by maintainer ruling, see todo_records.md)

## 41. (closed 2026-09-10, see todo_records.md) — Production bug: `remove_all_toasts()` control function calls a nonexistent attribute (plural/singular mismatch) (2026-09-10)

## 50. (closed 2026-09-11, see todo_records.md) — repo_map.md refresh — two stale bullets from the split build (2026-09-10, worker findings, iter-3 curation)

## Loop & coordination (open)

## 53. Agent-feedback protocol: mandatory close-down step + small write-tool (DEFERRED 2026-09-12, maintainer `deferred:do_later` in `inbox_planner/feedback_protol_tool.md`) — the optional `agent_feedback.md` entries get discarded by the early-close-at-stop-line discipline; make it a NON-optional part of the close-down phase (directly before the closing message), full date_time on each entry, and a small tool that writes the entry (no file fiddling / accidental reads). Proposal owed when the deferral lifts.

## 56. (DEFERRED 2026-09-15, maintainer `--defer` in priority.md) — Distillation worker runs over the session dumps (his # 3 3 mandate)

- **Problem / evidence:** the 137-session corpus (`.opencode/archive/sessions/`,
  backfilled 2026-09-15) is the basis for distilling session history; the
  maintainer deferred the runs 2026-09-15 ("to much work right now") while
  focusing on the proposal/inbox backlog (his #0).
- **Desired outcome (his # 3 3, verbatim gist):** test different distillation
  workers on session dumps — gemma4 workers (`worker_gemma_Q4_128K` /
  `agent_gemma_Q4_128K`, much faster, parallelizable) with a WIDE range of
  scanning perspectives, compared against qwen runs (4x slower); roles/
  skillsets to keep track of them; document what is found; also usable to
  recover the last messages of a failed worker.
- **Acceptance criteria:** when the deferral lifts — ≥2 perspectives run on
  the same dump with ≥1 gemma and ≥1 qwen model; a written comparison (what
  each model found, quality, cost); findings worth keeping in the knowledge
  base; the skillset/roles documented for reuse.
- **Suggested scope:** `skill_session_scan.md` (ALREADY BUILT, plan1 —
  perspectives P1 FRICTION / P2 DECISIONS / P3 KNOWLEDGE + output format);
  `.opencode/archive/sessions/` (read-only dumps); the `worker_gemma_Q4_128K`
  + `worker_Q4_120K` roster; a comparison notes file in the loop folder.
- **Status:** DEFERRED — picked up only when the maintainer lifts the
  `--defer` marker in `priority.md` (# 3 3) or re-prioritizes it.
--comment: can be done when nothing other is actionable. look for a direct session if you want to test and try different goals for the workers to analyse them. 
- but you may as well do some maintenance and curation on knowledge files. repo prompt files, nap, explore new script we could need, ... :-) if you are bored look in my ideas and make some proposels or research how to do this. 
- an option is also; fuzzy name resolution search on read or when searching in files. or num_to_word autoreplace as intercept plugin on hook.execute.before to combine both and make tools calls more reliable even with bitshifts in numbers. worthwhile thing to research. but dont save research in your nap. make e.g. a agent/research folder if you want. see ideas #5 #6 #7

## 39. (closed 2026-09-10, see todo_records.md) — Looprunner prompt v2 proposal — applied + smoke test clean (2026-09-10)

## 49. `handover_task.md` worktree/HEAD conflict (2026-09-10) (closed 2026-09-11, see todo_records.md)

## Plugin & gauge (open)

## 17. (closed 2026-09-11, see todo_records.md) — v1.3 log-growth CONFIRMATION — one-shot read, deferred by the no-`plugin.log` constraint (2026-09-08)

## 30. (closed 2026-09-11, see todo_records.md) — De-peek: replace the peek.py shell-out with an in-plugin `node:sqlite` read (2026-09-09)

## 37. (closed 2026-09-10, see todo_records.md) — Production plugin host lacks `node:sqlite` — the ctx nudge never lands in production (2026-09-10)

## 33. (closed 2026-09-12, see todo_records.md) — v2.5 auto-nudge ladder — LANDED (T2: per-session read, rungs 50/70/80/90/5k, dedup per rung, `promptAsync` synthetic-part delivery, `kind:"nudge"` evidence only; probe 52/52) + production evidence complete (50/70/80 % rungs fired in live planner sessions; the per-session read mechanic reached EVERY acting session per the maintainer's target-scope ruling); the v1.3 log-profile tail resolved via the executed one-shot read (#17 CLOSED). The stale 09-10 "NOT landed" note referred to the pre-wiring state; both T1 (de-peek, #35) and T2 (ladder) are landed.

## 38. (closed 2026-09-10, see todo_records.md) — (TEST) explorer smoke test — jill gemmaQ4-256K first launch

## 35. (closed 2026-09-11, see todo_records.md) — T1 de-peek build — LANDED (continuation 2); tail closed: v1.3 log-profile re-baseline executed (one-shot read → #17) + #34 residual doc refs (closed)

## 51. Stale probe header vs `.opencode/package.json` "type" field (2026-09-11, T3 worker flag)

- **Problem / evidence:** the probe "WHY THAT COMMAND" block
  (`handover_probe.mjs` ≈28) says `.opencode/package.json` "has no 'type'
  field and must not gain one — that would change the plugin's module
  context", but the file NOW carries `"type": "module"` (+ the
  `@opencode-ai/plugin` dep) — verified 2026-09-11.
- **Outcome (goal):** ruling — is `type: module` the intended current
  state? (header then corrected) or does the constraint still bind (field
  removed)?
- **Acceptance:** header and package.json agree; probe green.
- **Scope:** the probe header (comment), `.opencode/package.json`.
- **Status:** OPEN — maintainer call.
--comment: I do not know when i added this. but it was a test to activate a plugin I believe. this plugin "opencode-context-meter" seem to be not in the repo any more. so it might be possible to remove it. the current state is thus stale and not the intended state. you can remove it and we will see on next restart if opencode has something to say about it :-)

## 52. (closed 2026-09-13, see todo_records.md) — `compact_memory` fails in the current host build — connection error on both paths (2026-09-12) — LANDED (2026-09-12, worker-2, per the approved v2 proposal) + live acceptance DONE (2026-09-13, iteration 1: compaction part + directive + budget 1/3 + COMPACT line verified in the DB); the resume-overflow finding → `proposals/2026-09-13_compact_memory-findings.md` (Item 1 superseded by the 2026-09-15 protocol; Item 2 ruling bundled in 2026-09-15_backlog-decisions.md, Decision 3).

## Closed entries

Moved to `todo_records.md` on 2026-09-10 — one-line records, IDs 2, 5, 10, 12, 13, 14, 15,
16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32 (+ the 260908-0951 dedup block).
All those IDs stay reserved — see the numbering rule in the header.

## (closed 2026-09-15, the first commit after f4de326, worker-16) — Smoke-harness build: the tool/plugin smokes moved from the scratchpad into `.opencode/plugin/tests/` (7 smokes + shared `_smoke_base.mjs` + README, all green; gates 99/99 + 459 passed + ruff F=0) per `approved/2026-09-15_smoke-harness-home.md` — the cm_v2 + qc smokes folded into `compact_memory.smoke.mjs` (assertions adapted to the 2026-09-14 fire-and-forget build, no source change) and the `context_recovery` smoke pinned to the deactivated plugin file (attribution verified).

## 34. (closed 2026-09-10, see todo_records.md) — Stale `peek.py` documentation refs + worker prompt permission block

## 36. (closed 2026-09-09, see todo_records.md) — `agents_repo.md` `Environment & shell` — wrong/stale lines (lab-verified, fixed)

## 42. (closed 2026-09-10, see todo_records.md) — Multi-notch scroll-wheel events (delta ≠ ±120) are untested across all layers; the filter pins wheel phase on single-notch equality (2026-09-10, Audit 3a)

## 43. (closed 2026-09-10, see todo_records.md) — `kb_env` fixture + `build()`/`down()` helpers are copy-pasted (drifted) across 6 test files — no shared conftest location (2026-09-10, Audit 3a)

## 44. (closed 2026-09-10, see todo_records.md) — Stale/unknown focus name → uncaught KeyError in `apply_focus_groups` / `apply_start_args_by_focus_name` (the config is reloaded *before* the lookup) (2026-09-10, Audit 3b)

## 54. (open, maintainer call 2026-09-12) — Rule: never circumvent access restrictions; blocked-file protocol for agents

- **Problem / evidence:** worker_Q4_120K (attention-keywords task, 2026-09-12) had no
  edit access to `.opencode/agent/prompts/**` (opencode.jsonc edit-deny) and tried to
  circumvent via bash; task cancelled by the maintainer before anything landed.
- **Desired outcome:** the rule is codified in the role prompts: (1) an agent NEVER
  circumvents access restrictions (no bash/write workarounds around edit-denies);
  (2) when blocked on a file the task needs: do the work as far as possible and note
  the block in `handover_task_to_planner.md`, OR — if the blocked files ARE the main
  body of the work — close the session and report the fact back (no partial hacks).
- **Acceptance criteria:** the rule present in `prompt_agent_task.md` (honesty guard /
  work loop) and in the planner's delegation section; grep-verifiable; zero
  circumvention attempts in subsequent loop logs.
- **Suggested scope:** `prompt_agent_task.md`, `prompt_agent_planner.md`, possibly
  AGENTS.md (maintainer's call — it is his file).
- **Status:** open — maintainer call 2026-09-12 (wording per his direct-session
  instructions).
--comment: approved

## 55. (open, maintainer call 2026-09-15) — `compact_memory` needs a dump function of the current session

- **Problem / evidence:** compaction (host default AND `compact_memory`) irreversibly
  destroys the fine-grained session context — the pre-compaction messages are gone once
  the summarize lands. A post-compaction dump of that session would miss EXACTLY the
  content that was destroyed. Maintainer 2026-09-15 (direct session, chat mode):
  "moment when we compact, we destroy exactly this ... i have only access to the
  default compact and this would irreversible destroy some part of the sessions
  context. mark this down: compact_memory needs a dump function of the current
  session." Related: the session-corpus discussion 2026-09-15 (readable dumps of all
  sessions from the opencode DB — 130 sessions / 6,125 messages / 27,003 parts verified
  in `~/.local/share/opencode/opencode.db` — as the consolidation basis; a post-hoc
  dump script by session_id was the interim idea).
- **Desired outcome:** `compact_memory` (and eventually the host auto-compaction path)
  dumps the session's FULL pre-compaction content into the session corpus BEFORE the
  compaction runs — so the corpus stays complete even for compacted sessions.
- **Acceptance criteria:** after any compaction of session X via `compact_memory`,
  `.opencode/archive/sessions/<date>_<X>.md` exists and contains the pre-compaction
  messages; the dump runs BEFORE the summarize dispatch; a dump failure does not block
  the compaction (note/WARNING logged); probe stays green (append-only checks).
- **Suggested scope:** `.opencode/plugin/compact_memory.ts` (dump hook before
  summarize); the session-dump script shared with the backfill idea (read-only DB →
  markdown, tool outputs condensed); `.opencode/archive/sessions/`.
- **Status:** BUILD LANDED (plan4, 2026-09-15): the hook is in
  `compact_memory.ts` (`preCompactionDump`, fires before ANY dispatch,
  no-overwrite `compaction_dumps/<sid>_c<count>.md` naming), `dump_session.cjs`
  gained `--out`, probe S14 (101-107) green. Live acceptance PENDING the
  maintainer's host restart — a single compact_memory call must then produce
  `.opencode/archive/sessions/compaction_dumps/<sid>_c0.md`. Still OPEN.
  History: APPROVED + BUILDABLE (maintainer ruling 2026-09-15, direct session:
  "todo 55 can be done and will be activated before the next autorun"); NOTE
  2026-09-15: the corpus `.opencode/archive/sessions/` was backfilled
  (137 sessions).

## 57. (closed 2026-09-16, worker-8, plan7/iter7; 2026-09-15, worker T1 block_transfer sandbox, curated plan3) — block_transfer MOVE silently deletes a block when `dstFile` is missing

- **Problem / evidence:** in `.opencode/tools/block_transfer.ts`, MOVE mode
  extracts the source block (CUT) BEFORE the `'dstFile' is required for MOVE
  mode.` check runs — so a MOVE with `dstFile` missing deletes the block from
  the source file and only THEN errors: silent data loss of the yanked block.
  Pre-existing (pre-T1). Recorded by worker-10 (2026-09-12).
- **Desired outcome:** the `dstFile` requirement is checked before ANY source
  write — a missing `dstFile` yields the error with the source file untouched.
  Valid-input semantics stay byte-identical.
- **Acceptance criteria:** a smoke/assertion proves MOVE with missing
  `dstFile` → error + source file unchanged; the existing block_transfer
  smokes stay green.
- **Suggested scope:** `.opencode/tools/block_transfer.ts` (hoist the
  `!args.dstFile` check to the top of the anchor-extraction section, before
  any write); a smoke in `.opencode/plugin/tests/`.
- **Status:** CLOSED (2026-09-16, worker-8, plan7/iter7) — guard hoisted pre-write: the `!args.dstFile` check now runs before the source-cut write (invalid-input-only change, exact error string kept); 2 new smoke assertions (22/22), gates 106/106 + 459 passed + ruff F=0; commit 733ca7a.
--comment: approved: you are free to improve the tool. goal is to prevent unintended destruction of data. when in doubt it saves it in buffer - or might be better to append it to buffer? do we have a buffer clear function if needed? can you write a short feedback in maintainer/feedback folder what the current status of the tool is? adaptions of tools you use are generally approved. if they have the potential to work outside of sandbox definition then these sandbox safeguards need to be implemented. (the same rule apply to the scripts - everything than can change data needs a sandbox safeguard - maybe just a shared scriptlet that every script imports and checks the given paths? do only one script to maintain of these safeguards need adaptation) (sry idle thoughts :-) )

## 58. (open, 2026-09-15, script-collection worker, curated plan3) — standard gate definition lacks the probe command

- **Problem / evidence:** the standing gate baseline mentions "probe 99/99",
  but the probe command is not defined in `repo_commands.md` §Run / test
  (pytest + ruff only) — the worker had to infer it from the launch baseline
  (worker script-collection, 2026-09-15).
- **Desired outcome:** the gate definition lists all three commands
  (`pytest -q`, `ruff check --select F .`,
  `node .opencode/plugin/probes/handover_probe.mjs`) so "standard gate" is
  unambiguous for every spec/launch.
- **Acceptance criteria:** `repo_commands.md` §Run / test names the probe
  command with the current baseline (99/99 as of 2026-09-15).
- **Suggested scope:** `.opencode/agent/prompts/repo/repo_commands.md`
  (maintainer-owned file — he edits it or tasks the planner).
- **Status:** OPEN — maintainer (his file).
--commment: approved. you work with the commands. add to them as need be - but curate them to not dublicate. (a worker also mentioned that tmp is not longer available as path shorthand - could be due to the switch to git bash as shell - might be good idea to include $TMP/opencode as temp path variable in git bash - works for me at least)

## 59. (open, 2026-09-15, script-collection worker, curated plan3) — session-corpus refresh cadence

- **Problem / evidence:** the corpus `.opencode/archive/sessions/` goes stale
  between backfills (e.g. `ses_f5d03802...` was dumped mid-session: 59 msgs
  vs 65 in the DB); the pre-compaction dump hook covers new sessions only.
  PLAN3 (2026-09-15) ran a one-off `dump_session.cjs --all --slim` refresh
  (147 sessions, 0 failures).
- **Desired outcome:** a documented cadence / trigger for corpus refreshes
  (suggestion: before the #56 distillation runs start; after heavy loopruns).
- **Acceptance criteria:** the cadence decision recorded (NAP Standing or the
  scripts README); the corpus refreshable via one documented command
  (`node .opencode/agent/scripts/db/dump_session.cjs --all --slim`).
- **Suggested scope:** the decision record; `.opencode/archive/sessions/`.
- **Status:** CLOSED (planner call, plan6 2026-09-16) — cadence recorded in
  the NAP Standing: refresh BEFORE the #56 distillation runs start + after
  heavy loopruns; command `node .opencode/agent/scripts/db/dump_session.cjs
  --all --slim`.

## 60. (open, 2026-09-15, planner plan5) — `block_transfer` + `loop_log` lack probe pinning

- **Problem / evidence:** the custom tools `block_transfer` and `loop_log`
  (`.opencode/tools/*.ts`) have smoke tests (`plugin/tests/block_transfer*.smoke.mjs`,
  `loop_log.smoke.mjs`) but ZERO handover-probe pinning (`grep block_transfer
  handover_probe.mjs` = 0 hits) — contrast `compact_memory` (S10–S14) and
  `ctx_gauge` (S12): their contracts can drift silently with no gate signal.
- **Desired outcome:** a probe section pinning both tools' contracts
  (registration shape, arg schemas, core behavior — sandbox validation for
  block_transfer, the 8-char status tokens + line format for loop_log),
  APPEND-only per the probe discipline.
- **Acceptance criteria:** probe total grows by the new section's check
  count, all green; both smoke tests still pass; header annotation updated.
- **Suggested scope:** `.opencode/plugin/probes/handover_probe.mjs`,
  `.opencode/tools/{block_transfer,loop_log}.ts` (read-only reference).
- **Status:** OPEN — delegate-able (worker task, medium).

## 63. (closed 2026-09-16, plan7 worker-7; finding 2026-09-15 worker-5, planner plan5) — compact_memory smoke: 4 failures at HEAD (dump-hook sandbox gap)

- **Problem / evidence:** `node .opencode/plugin/tests/compact_memory.smoke.mjs`
  → 4 failures that EXIST at clean HEAD (proven by the worker via `git stash`
  before his commit `28783a7`). Suspect cause: the pre-compaction dump hook
  (TODO #55 build, `4512fe6`) writes dump files, and the smoke sandbox /
  mocks do not account for that path (or vice versa). NOTE: the smoke tests
  are NOT in the standard gate (pytest + ruff + probe) — this is why the
  failures went undetected through plan4.
- **Desired outcome:** the 4 smoke failures fixed (either the hook respects
  the smoke sandbox, or the smoke fixtures/mocks are updated for the hook);
  `node .opencode/plugin/tests/compact_memory.smoke.mjs` green.
- **Acceptance criteria:** all plugin smoke tests green (`node
  .opencode/plugin/tests/<name>.smoke.mjs` for each); standard gates
  unchanged (probe 106/106, pytest 459+1w, ruff F=0).
- **Suggested scope:** `.opencode/plugin/compact_memory.ts` (the dump-hook
  call site), `.opencode/plugin/tests/compact_memory.smoke.mjs`,
  `.opencode/agent/scripts/db/dump_session.cjs` (read-only reference).
- **Status:** CLOSED (2026-09-16, plan7 worker-7) — fixed by the smoke stub: the sandbox now carries a byte-identical `dump_session.cjs` stub from the probe S13 preamble (handover_probe.mjs 1983-2015) so the dump hook (4512fe6) succeeds silently + 1 new chk pins the hook firing on the tool path (`compaction_dumps/ses_sm_self_c0.md`); smoke 43/43, all 7 smokes green, gates unchanged (probe 106/106, pytest 459+1w, ruff F=0); fix + this note ride the plan7 closing commit (subject "close #63: compact_memory smoke adapts to the pre-compaction dump hook"). DECISION NEEDED (optional): should the smoke suite join the standard gate in repo_commands.md? (relates to #58's gate-definition entry.)

## 62. (closed 2026-09-16, planner plan6) — LANDED (planner-direct): all three lines present in BOTH role prompts — (1) compaction is NOT a restart (recent messages INTACT, summary auto-created, re-read only the named head files), (2) above 90 % → EMERGENCY handover + commit + self-compact IF budget available, (3) above 95 % → commit + self-compact, DO NOT DELIBERATE while budget remains (`keepMessages` keeps the last N messages INTACT) — in `prompt_agent_planner.md` §Context-budget trigger and `prompt_agent_task.md` §Context-budget trigger + §compact_memory. Adjacent stale-ref fixes rode the same commit: stopline proposal name → `2026-09-15_agents-knowledge-stopline.md`, `dump_session.cjs` path → `scripts/db/`.

## 61. (closed 2026-09-15, planner plan5; title reworded plan6) — probe baseline corrected: post-S14 baseline is one-zero-six, not the plan3/plan4-era nine-four

The plan3/plan4 NAP baseline line said ninetyfour — the plan3-era probe,
whose header annotation and per-section list sum AGREED at ninetyfour
(machine-verified plan6 at `a15828c`). After S14 (plan4 build `4512fe6`,
checks 101-107) the self-counted baseline is one-zero-six
(one-zero-six/one-zero-six); annotation and self-count agree at HEAD
(machine-verified plan6; plan5 gate one-zero-six PASS). The original
"annotation stale by 5 hygiene checks (40–43/45/64)" narrative is NOT
corroborated by the commits — the annotation was self-consistent at every
commit checked (`a15828c`/`4512fe6`/`4340043`/HEAD); superseded, original
text recoverable in git (`0761e42`/`4b4153f`). NUMWORDS NOTE retained:
dense X/X numeral pairs are a transcription trap — write them as words in
prose.
