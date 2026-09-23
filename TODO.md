# TODO — maintainer's open items

Numbering: every entry ID is UNIQUE and NEVER REUSED — used so far up to #90, new
entries start at #90 (closed IDs stay reserved in `todo_records.md`).
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

## 64. (closed 2026-09-16, plan9 planner-direct; finding 2026-09-16, worker-13 inbox) — stale "84/84" probe baseline in `.opencode/plugin/README.md` → replaced by the curate-don't-duplicate pointer to the probe's self-annotated header total (the #58 convention)

## 3. Rework README and WIKI to the current state of the code (2026-09-06) (closed 2026-09-10, see todo_records.md)

## 47. (closed 2026-09-10, see todo_records.md) — Docs: §3 undocumented features (variable system, invocations, extra start args, numpad debug combos) (2026-09-10, from the #3 residual)

## 46. (closed 2026-09-10, see todo_records.md) — Flaky test: `test_crossover_not_taken_on_low_roll` — timing/order-dependent (2026-09-10)

## 45. (closed 2026-09-10, see todo_records.md) — Doc errors found adjacent to the #3 rework: WIKI invocation "evaluate to False" claim, WIKI `+a, +b` rebind notation, README "he first" (2026-09-10)

## 40. Explorer run #1 output unreliable — no entries on disk, no commit, fabricated gauge, endpoint 128k ≠ 256K (2026-09-10) (closed 2026-09-10 by maintainer ruling, see todo_records.md)

## 41. (closed 2026-09-10, see todo_records.md) — Production bug: `remove_all_toasts()` control function calls a nonexistent attribute (plural/singular mismatch) (2026-09-10)

## 50. (closed 2026-09-11, see todo_records.md) — repo_map.md refresh — two stale bullets from the split build (2026-09-10, worker findings, iter-3 curation)

## Loop & coordination (open)

## 53. Agent-feedback protocol: mandatory close-down step + small write-tool (DEFERRED 2026-09-12, **DEFERRAL LIFTED 2026-09-17** — direct session; maintainer: "it did not even know anymore that i deferred it") — the optional `agent_feedback.md` entries get discarded by the early-close-at-stop-line discipline; make it a NON-optional part of the close-down phase (directly before the closing message), full date_time on each entry, and a small tool that writes the entry (no file fiddling / accidental reads). **Proposal FILED 2026-09-17** (`proposals/2026-09-17_agent-feedback-closedown.md` —
Part A: mandatory close-down prompt step, full date_time auto-stamped; Part B:
unified `submit` tool per his #5 sketch; recommendation: both as one unit)
— **ruled 2026-09-17: approved both parts in one unit**.
**Status 2026-09-18 (plan1, looprun 2026-09-17_23-58):** Part A LANDED
(5e29cb0 — friction close-down step in all 4 role prompts) + Part B LANDED
(b83b34f — `submit` tool + 20/20 smoke + probe S23 pin; gate re-verified
green by planner: probe annotation-agree, all 9 smokes, pytest 459+1w,
ruff F=0). REMAINING (maintainer domain): registration in live
`opencode.jsonc` + per-agent tool grant at restart; live acceptance after
restart. **Status 2026-09-18 (plan2/iter2):** maintainer inbox instruction
(session/role autofill) LANDED (86a977f — `submit` derives role from
context.agent / session from context.sessionID; role+session REMOVED from the
args schema; smoke 20/20 + probe S23 re-pinned to 3 args + context stamps;
gate green: probe two-two-nine (2-2-9) annotation-agree [worker's "239/239"
was a dense-numeral drift — the planner's re-run measured 2-2-9], all 9
smokes, pytest 459+1w, ruff F=0).

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
- an option is also; fuzzy name resolution search on read or when searching in files. or num_to_word autoreplace as intercept plugin on hook.execute.before to combine both and make tools calls more reliable even with bitshifts in numbers. worthwhile thing to research. but dont save research in your nap. make e.g. a agent/research folder if you want. see ideas #5 #6 #7

## 39. (closed 2026-09-10, see todo_records.md) — Looprunner prompt v2 proposal — applied + smoke test clean (2026-09-10)

## 49. `handover_task.md` worktree/HEAD conflict (2026-09-10) (closed 2026-09-11, see todo_records.md)

## Plugin & gauge (open)

## 74. (open, 2026-09-21, planner; flagged by his --info note in priority.md + the 2026-09-19..21 worker feedback entries) — **Write tool fails on long content payloads on this host**

**Problem / evidence:** JSON parse errors ("Text: {." / "Expected '}'"), once even on a 3-line file — logged by four worker sessions (2026-09-19 long multi-paragraph args; 2026-09-20 Deep-Dive B run #4; 2026-09-21 run #6 "write failed for every payload"; 2026-09-21 run #7_1 three long-content failures). His --info note pointed at the fuzzy_numword intercept path-resolution — CORRECTED same day by him: the intercept is actually live, and two extra test rounds (his handover-file overwrite runs, direct-message specs writing other files) show the write still failing WITH the intercept deactivated; no opencode changes made; the problem predates the new model set (surfaced in Deep-Dive B run 2 with the old models) — so the intercept is NOT the root cause and this is a host-side issue independent of our models; 2026-09-21 (planner direct session): the SAME signature ("JSON parsing failed: Text: {.") hit a GREP tool call — scope extends beyond write; machine check: both error strings are embedded in the installed `opencode.exe` (v1.18.31: "JSON parsing failed: Text" x8, "Invalid input for tool" x2) → the failing parse is inside the opencode server, upstream of every plugin hook (intercept is log-only and sees already-parsed args); candidate captures: provider-side raw response log (maintainer) + `opencode --log-level DEBUG --print-logs` stderr capture (agent-side, flags verified); HIS HYPOTHESIS (2026-09-21, direct): the truncation began after his llama.cpp update — his bit-drift-countermeasure fork `ik_llama` — and OTHER PEOPLE report the same issue → suspected fork-side (provider) bug; isolation test = direct-to-server long-JSON probe bypassing opencode; SECOND LIVE DATA POINT same session: a webfetch call with SHORT args failed with the identical signature → the signature is "assistant response stream cut mid tool-call JSON", long payload is a risk factor, not the sole cause; fork identified as `ikawrakow/ik_llama.cpp` (issue #380 "Drop at the start of generation" confirms known fork-side streaming bugs); ROOT-CAUSE CANDIDATE (his link 2026-09-21): issue #2492 "Truncated tool calls on qwen3.8-flash-next" (opened 2026-09-20, open) — regression attributed to PR #2470; its raw SSE dump shows the tool-call arguments JSON closed MID-VALUE (finish_reason=tool_calls on an incomplete JSON) = exactly our signature; his timeline caveat: PR ~18h old vs his problem ~48h old → "might be not connected"; BISECTION POINT (this session): 4 live failures pre-reload (grep, webfetch, two writes — incl. the short-arg webfetch — all served under the buggy build); after his unload + fresh reload to the old ik_llama: 2 short writes clean + byte-verified (scratchpad flaky_t1/t2.txt); CONSTRAINT (his): agents never send direct requests to the inference server — single slot unloads the session's model (also logged in knowledge_tools.md single-slot section). POST-RELOAD RESULTS (old ik_llama, same session — natural A/B against the 4 pre-reload failures): 70B write clean, 156B write clean, 10,095B write clean (101 lines, tail-verified — far past the 4k acceptance bar; caveat: repetitive filler content — a non-repetitive variant + cross-model coverage remain). NEXT: optional — one non-repetitive ~10k write + one run on another model, then the entry can move toward close pending the fork's #2470 fix.
**Outcome:** host-side fix (maintainer domain); if not fixed, codify the workaround (create via bash printf/heredoc, then small write/edit append batches — see knowledge_tools.md) in the repo docs so runs don't re-discover it.
**Acceptance:** a ~4k+ char write payload succeeds without parse errors (tested across models), OR the workaround is documented and the next long-file run completes with no write-tool failure.
**Suggested scope:** opencode host (maintainer) + repo docs/prompts (agent-side).
**Status:** open; root cause CONFIRMED per timeline (his 2026-09-21: PR #2470 merged ~4 days ago ≈ his ~48h onset; #2492 = same signature) — old ik_llama in place, workaround stays until the fork patches #2470; his update discipline: never adopt a fresh ik_llama build immediately — let it rest so others find the bugs first.

## 17. (closed 2026-09-11, see todo_records.md) — v1.3 log-growth CONFIRMATION — one-shot read, deferred by the no-`plugin.log` constraint (2026-09-08)

## 30. (closed 2026-09-11, see todo_records.md) — De-peek: replace the peek.py shell-out with an in-plugin `node:sqlite` read (2026-09-09)

## 37. (closed 2026-09-10, see todo_records.md) — Production plugin host lacks `node:sqlite` — the ctx nudge never lands in production (2026-09-10)

## 33. (closed 2026-09-12, see todo_records.md) — v2.5 auto-nudge ladder — LANDED (T2: per-session read, rungs 50/70/80/90/5k, dedup per rung, `promptAsync` synthetic-part delivery, `kind:"nudge"` evidence only; probe 52/52) + production evidence complete (50/70/80 % rungs fired in live planner sessions; the per-session read mechanic reached EVERY acting session per the maintainer's target-scope ruling); the v1.3 log-profile tail resolved via the executed one-shot read (#17 CLOSED). The stale 09-10 "NOT landed" note referred to the pre-wiring state; both T1 (de-peek, #35) and T2 (ladder) are landed.

## 38. (closed 2026-09-10, see todo_records.md) — (TEST) explorer smoke test — jill gemmaQ4-256K first launch

## 35. (closed 2026-09-11, see todo_records.md) — T1 de-peek build — LANDED (continuation 2); tail closed: v1.3 log-profile re-baseline executed (one-shot read → #17) + #34 residual doc refs (closed)

## 51. (closed 2026-09-16, plan8; 2026-09-11, T3 worker flag) — Stale probe header vs `.opencode/package.json` "type" field

## 52. (closed 2026-09-13, see todo_records.md) — `compact_memory` fails in the current host build — connection error on both paths (2026-09-12) — LANDED (2026-09-12, worker-2, per the approved v2 proposal) + live acceptance DONE (2026-09-13, iteration 1: compaction part + directive + budget 1/3 + COMPACT line verified in the DB); the resume-overflow finding → `proposals/2026-09-13_compact_memory-findings.md` (Item 1 superseded by the 2026-09-15 protocol; Item 2 ruling bundled in 2026-09-15_backlog-decisions.md, Decision 3).

## 65. (closed 2026-09-17, maintainer-ruled — NOT a tool bug, see todo_records.md for the full entry if needed) — loop_log tool folder-detection bug: spurious folders on the maintainer-renamed loop folder (2026-09-16, plan2)

## 66. 5.3+5.4 restart acceptance (open — PENDING RESTART, 2026-09-16 direct session)
- **Problem / evidence:** the observer plugin failed to LOAD on the first
  live check ("Plugin export is not a function" — fixed by the core split,
  `4719cc5`); the read-scope mutation channel (5.4 one-shot) is still
  unproven. No `.opencode/temp/intercept.log` exists yet.
- **Outcome:** at the next restart: (1) first `intercept.log` lines appear
  (dense/numword/dense-date triggers — any session with dense args);
  (2) the mutation-channel verdict: read the scratchpad sentinel
  `C:/Users/Wasiejen/AppData/Local/Temp/opencode/fuzzy_accept/file-four.txt`
  via a d<=2 mistyped path → if the tool result is the TWIN content
  (`file-4.txt`) AND a `fuzzy-resolved` line is logged → mutation channel
  LIVE (write-scope #68 unblocked); else NOT live (5.3 stays log-only,
  redundancy-naming route #69 becomes primary). Record the verdict in
  TODO + the research doc; then tear down the sentinel per §5.4.
- **Acceptance:** verdict line in TODO.md + one line in the research doc
  dated section; fixture state noted.
- **Scope:** none (read the log + one controlled read) — planner at the
  restart.
- **Status:** PENDING RESTART.

## 67. Fuzzy scope extension: glob / grep / section-anchor resolvers (2026-09-16, plan2 queue)
- **Problem / evidence:** plan2 wired ONLY `read` (+string filePath) — the
  core matcher (`resolveReadPath`, corpus cache) is corpus-root-agnostic and
  ready for more read-scope tools (research §2.3/§2.6).
- **Outcome:** extend the hook scope to `glob`/`grep` path args and add the
  section-anchor resolver (anchor line-prefix → offset, exactly-one-match,
  fail-closed on 0/≥2 — §2.6), fail-closed + both-outcomes logged, probe
  pins per the established pattern.
- **Acceptance:** probe green (self-annotation updated), smoke green,
  standard gate unchanged.
- **Scope:** `intercept_observer_core.ts` + `intercept_observer.ts` + probe
  S18 section.
- **Status:** OPEN (this is the scope of staged spec R3,
  `research/fuzzy-numword/spec_R3_arg_scope_extension.md`; gated on R1 + R2
  green + R4 log-volume data).

## 68. (closed 2026-09-16, full text in todo_records.md) - Write-scope fuzzy (R2): approved + build landed green (35f8143) + one-shot live-accepted 2026-09-17 (benign mistype corrected; the #72 hazard live-measured; residual hazard -> #72 M1)

## 69. (closed 2026-09-16, full text in todo_records.md) - Redundancy form codification (the [left:right] pair convention, supersedes the Q2 angle-pipe form): AGENTS.md paste landed (bf18f14) + R1 green (96bb173) + role-prompt pointer lines (3e0406c); acceptance fully met

## 70. compact_memory rework: config-resolved summarizer + queued message + dump diagnostics (2026-09-16, new priority.md item; re-scoped 2026-09-21 by his priority.md #1)
- **Problem / evidence:** maintainer priority.md addition: context_limit
  error → compact the worker (use the Gemma compaction model per
  opencode.jsonc `agent.compaction`); the flow is SERIAL (compaction active
  = planner inactive — no sleep/wait polling); cross-compaction needs only
  the target session_id (providerID/modelID to be REMOVED from the
  compact_memory parameter list — resolved from opencode.jsonc; the
  parameter descriptions were "described badly" — #55 item). Plan2 hit the
  friction live: the dispatch resolved the SUMMARIZER to the same model as
  the target session (Qwen) and I had to wait for the single slot. HIS
  2026-09-21 priority.md #1 ADDITIONS: (1) BOTH providerID and modelID
  REMOVED from the exposed parameter list — the summarizer resolves from
  opencode.jsonc `agent.compaction.model` ("provider/model"); absent /
  malformed → the COMPACTING session's own model (his ruling: same-model
  compaction gives better results even if slower); the LIVE config has
  `agent.compaction` commented out → the fallback path is currently
  active; (2) the `message` arg does NOT arrive in the compacted session
  (it only rides the caller's tool result) — change to a direct QUEUED
  prompt message (promptAsync, no await — delivered on resume);
  (3) DUMP-FAIL evidence (ctx.log 2026-09-16/17: 2× `spawnSync node
  ETIMEDOUT`; measured: the dump script is 0.12 s standalone — a HUNG
  CHILD INSIDE THE HOST, not script slowness; the hook logs failures
  only, no DUMP-OK line → add DUMP-OK + duration for self-diagnosis;
  defensive spawn stdio pipe→ignore); (4) auto-compaction on context
  limit = an option togglable via a parameter in the budget file
  (`.opencode/temp/compact_budget.json`); (5) research spec requested: a
  small research on compact_memory + block_transfer (he wrote
  "buffer_transfer") — up/downs, what is problematic and why,
  alternatives.
- **Outcome (goal):** param rework landed (4-key schema:
  sessionID/keepTokens/keepMessages/message; config resolution with
  session-model fallback) + the message queued to the compacted session +
  DUMP-OK diagnostics + (follow-on) the budget-file auto-compact toggle +
  (follow-on) the requested research spec; probe/smoke green; live
  acceptance after a host restart.
- **Acceptance:** param rework landed + probe/smoke green; a cross-compact
  dispatch needs only the session_id; the queued message reaches the
  compacted session (live, post-restart); the toggle readable from the
  budget file (follow-on unit); the research spec filed + run (follow-on
  unit).
- **Scope:** `.opencode/plugin/compact_memory.ts`,
  `.opencode/plugin/tests/compact_memory.smoke.mjs`,
  `.opencode/plugin/probes/handover_probe.mjs`, (follow-on:
  `.opencode/plugin/auto_resume.ts` + the budget store).
- **Status:** OPEN (approved — priority.md #1, top of his active list).
  **Unit A LANDED (2026-09-21, plan5, worker-6 `worker_Q3S_160K`
  ses_f3ab3c67dffeujQ8L1ucfWu8k8, code `6864bc0` — the planner verified the
  full gate and landed the commit after the worker's context-limit death):**
  4-key args (providerID/modelID removed) + config-resolved summarizer
  (opencode.jsonc `agent.compaction.model` → session-model fallback; the
  live config is commented out → fallback active = same-model summarize) +
  queued promptAsync message + DUMP-OK line + stdio ignore (probe 241/241,
  all 10 smokes, pytest 459+1w, ruff F=0). FOLLOW-ONS: the auto-compact
  budget-file toggle (unit B), the research spec (compact_memory +
  block_transfer up/downs), live acceptance after the next host restart.
  **Unit A build in flight (plan5, 2026-09-21, looprun 2026-09-21_15-33):**
  the param rework + config resolution + queued message + DUMP-OK
  diagnostics — spec committed this iteration; follow-on: the auto-compact
  toggle unit, the research spec, live acceptance post-restart.
  **Live acceptance ATTEMPTED (2026-09-21, plan6, post-restart, planner-run):**
  (a) DUMP-OK LIVE PASS — the pre-compaction dump hook fired on a live
  dispatch (ctx.log `DUMP-OK ses_f3b16aa46… 76` + `compaction_dumps/
  ses_f3b16aa46…_c0.md` created); (b) config resolution — the live
  `agent.compaction` is COMMENTED OUT (opencode.jsonc line ~130) → the
  same-model fallback is the active path (the dispatch reached it);
  (c) CROSS MODEL-READ LIVE BUG FOUND: two live cross dispatches failed
  `no resolvable model … request was NOT sent` + `cross-session model read
  empty (no messages)` for sessions that DO have messages — root cause
  measured: the in-process client resolves SDK calls to a RequestResult
  wrapper `{ data: [...] }`, never a bare array (precedent: auto_resume.ts
  383-386 unwraps `create()` as `res.data.id ?? res.id`; SDK types
  `SessionMessagesResponses = { 200: Array<{info, parts}> }`) —
  `resolveModel` ran `Array.isArray` on the raw result → always "no
  messages" (smoke fakes returned bare arrays, so the gate stayed green).
  **FIXED (280b8d0, worker-7, planner re-verified): dual-shape unwrap in
  resolveModel + smoke wrapper case (smoke 53/53, probe 241/241, pytest
  459+1w, ruff F=0).** LIVE RE-ACCEPTANCE (cross model resolution + queued
  message + COMPACT line) PENDING the NEXT host restart (the fix is not
   live yet). Unit B: spec committed (1c599a6); worker-8 DIED mid-run
   (host stream-cut mid tool-call emission — the #74 family; no file
   changes, nothing lost) → UNIT B LAUNCH-READY for the next iteration.
   **Unit B LANDED (2026-09-22, plan7, worker-10 `worker_Q3S_160K`
   ses_f3a03af20ffe1bRa56xVl143VG, code `d4ef76e` — planner re-verified:
   smoke 62/62, probe 241/241, pytest 459+1w, ruff F=0):**
   `autoCompactEnabled()` per-tick reader (fail-open: missing/unreadable/
   malformed file or absent key → ON; key present → Boolean) + the tick
   gate (`skip= autoCompact-off` line, no send, the once-per-busy-cycle
   attempts budget NOT consumed when OFF); live `compact_budget.json`
   untouched. Worker-9's cancelled partial (header comment + constant —
   maintainer interrupt, the #79 ping-pong incident) was carried by
   worker-10. Live acceptance pending the next host restart. Follow-on:
   the requested research spec (compact_memory + block_transfer up/downs).

## 71. (closed 2026-09-17, planner-direct, full text in todo_records.md) - Stale probe totals in repo_commands.md: section now carries the curate-don't-duplicate pointer (per #58/#64; maintainer ruled the planner is allowed to update the file)

## 72. Write-scope residual hazard: new-file near-miss (maintainer decision; 2026-09-17)
- **Problem / evidence:** the write-fuzzy channel (and the pair gate) cannot
  distinguish "a mistyped path to an EXISTING file" from "a deliberately
  NEW filename that happens to sit within d<=1 of an existing sibling" —
  a legitimate new-file write (e.g. creating `file-5.txt` next to
  `file-4.txt`) can be mutated onto the sibling and overwrite it. Read
  scope has no such hazard (non-destructive). Pinned as behavior: S20
  checks 200/201 + smoke 8f (worker R2, commit 35f8143).
- **Outcome (decision needed):** accept as designed (audit lines carry
  the ORIGINAL arg — re-targeting verifiable after the fact), OR mitigate
  later with an intent signal the interceptor does not currently have
  (e.g. agent confirms the log line before the write lands — R6-era
  surface).
- **Acceptance:** your ruling recorded; if mitigate: spec'd as a follow-on
  stage (R6-adjacent), not built before approval.
- **Status:** RULING 2026-09-17 (direct session): **M1 approved** — restrict
  the implicit write-fuzzy to `edit`/`block_transfer` (no new-file intent is
  legal there → redirect is unambiguous); `write` loses the implicit channel
  (new-file IS a legal intent → every degraded outcome becomes a visible
  stray file, never a silent overwrite); the pair channel stays unchanged
  (strict existence, fail-closed). **M1 LANDED (commit 9ec4c0b, 2026-09-17,
  worker):** dispatch guard in intercept_observer.ts (write excluded from the
  fuzzy channel); S20 re-pinned (196/198 no fuzzy line, 200/201 NOT mutated +
  zero lines) + new edit counter-pins 208/209; probe 208/208, smoke 36/36,
   pytest 459+1w, ruff F=0. **LIVE ACCEPTED 2026-09-17 (post-restart one-
   shot, scratchpad fixture, torn down):** the d=1 new-file write landed
   LITERAL (zero fuzzy lines — the guard live; the d=1 sibling untouched —
   the hazard is dead) AND the `edit` d=1 typo was still corrected
   (`fuzzy scope=write … d=1 gap=inf`, no stray file). Follow-on: R7
   (segment resolver) + R8 (root re-anchoring) STAGED + design agreed
   (substitution bar approved 09-17, decision-record §5); R9 documented-
   optional. See NAP 2026-09-17 direct session.

## #73. (closed 2026-09-17, full text in todo_records.md) - R7 realistic doubled case: the collapse-adjacent-dup existence-gated pre-check (dce82ad) resolves the doubled-folder case (kind=dedup evidence); live-accepted 2026-09-17 (read/edit proven live; doubled-write pinned 21/218-220)

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

## 54. (closed 2026-09-16, plan8 planner-direct; maintainer call 2026-09-12) — Rule: never circumvent access restrictions; blocked-file protocol for agents

## 55. (closed 2026-09-17, live-accepted in direct session ses_f4f539d7c…; maintainer call 2026-09-15) — `compact_memory` needs a dump function of the current session

## 57. (closed 2026-09-16, worker-8, plan7/iter7; 2026-09-15, worker T1 block_transfer sandbox, curated plan3) — block_transfer MOVE silently deletes a block when `dstFile` is missing

## 58. (closed 2026-09-16, plan8; 2026-09-15, script-collection worker, curated plan3) — standard gate definition lacks the probe command

## 59. (closed 2026-09-16, plan6; 2026-09-15, script-collection worker, curated plan3) — session-corpus refresh cadence

## 60. (closed 2026-09-16, worker-9, plan7/iter7; 2026-09-15, planner plan5) — `block_transfer` + `loop_log` lack probe pinning

## 63. (closed 2026-09-16, plan7 worker-7; finding 2026-09-15 worker-5, planner plan5) — compact_memory smoke: 4 failures at HEAD (dump-hook sandbox gap)

## 62. (closed 2026-09-16, planner plan6) — LANDED (planner-direct): all three lines present in BOTH role prompts — (1) compaction is NOT a restart (recent messages INTACT, summary auto-created, re-read only the named head files), (2) above 90 % → EMERGENCY handover + commit + self-compact IF budget available, (3) above 95 % → commit + self-compact, DO NOT DELIBERATE while budget remains (`keepMessages` keeps the last N messages INTACT) — in `prompt_agent_planner.md` §Context-budget trigger and `prompt_agent_task.md` §Context-budget trigger + §compact_memory. Adjacent stale-ref fixes rode the same commit: stopline proposal name → `2026-09-15_agents-knowledge-stopline.md`, `dump_session.cjs` path → `scripts/db/`.

## 61. (closed 2026-09-15, planner plan5; title reworded plan6) — probe baseline corrected: post-S14 baseline is one-zero-six, not the plan3/plan4-era nine-four

## 76. (closed 2026-09-21, plan1, planner-direct; finding 2026-09-21 worker_Q3S_160K auto-resume UNIT 1 gate run, via todo_inbox.md) — stale classifier pin in `handover_probe.mjs`: check [87] expected `iq3`→1 but the `compact_memory.ts` classifier (the 2026-09-21 quant-class budget ruling) returns 3 → probe pin updated to 3; probe 235/235 green. Pre-existing (the probe references no UNIT 1 file; `compact_memory.ts` untouched).

## 77. (closed 2026-09-21, plan3, planner-direct; finding 2026-09-21 worker-3 UNIT 3 gate run, via todo_inbox.md) — stale description pin in `block_transfer.sandbox.smoke.mjs`: line 53 expected the "Housekeeping rule … instead of write/edit" sentence that the maintainer's commit `ff4c2fc` (2026-09-18) deliberately dropped from the `block_transfer` description → pin re-pointed to the new first sentence (the one-liner); smoke 52/52 ALL PASS. Pre-existing since ff4c2fc (worker-3 verified by stash; the Unit 3 commit touches neither file).

## 78. (open, 2026-09-21, planner; his --info note in priority.md) — Dump completeness: the session dumps filter out parts (thinking/writing)
- **Problem / evidence:** his --info (priority.md, 2026-09-21): "automatic
  dumps which were generated by the dumping script to backup all sessions
  seemed to not include any thinking, writing or other parts at all" (e.g.
  `.opencode/archive/sessions/ses_f5aefe9e1ffemgTiq9GELiqaGL.md`); "the
  current dumping in the compact tool seems to filter out some parts. if
  they are in json maybe it is best to just dump this directly as it is to
  preserve the structure"; dumps in general should be COMPLETE — filtering
  out tool calls can be done by scripts on a need basis.
- **Desired outcome:** dumps (the `dump_session.cjs` corpus dumps AND the
  compact pre-dump hook) preserve ALL part types (incl. reasoning); a raw
  JSON dump mode that preserves structure as-is; the markdown filtering
  stays available as an on-demand script concern.
- **Acceptance:** a dump of a session containing reasoning parts shows
  them (or the explicit JSON mode exists); his ruling recorded
  (markdown-completeness vs raw-JSON-as-is as the default).
- **Suggested scope:** `.opencode/agent/scripts/db/dump_session.cjs` (+ the
  `preCompactionDump` call site in compact_memory.ts),
  `.opencode/archive/sessions/` (read-only reference).
- **Live evidence #2 (plan6, 2026-09-21):** the compact pre-dump hook
  ALSO times out on large sessions — `DUMP-FAIL ses_f3a51aedcffeSa0cwt8PmwlXAr
  spawnSync node ETIMEDOUT` (ctx.log) on a ~90 % session while a small
  session dumped in 76 ms (`DUMP-OK`) — the dump's spawn timeout does not
  scale with session size (same script family as the corpus dumps).
- **Status:** OPEN — needs scoping (measure what dump_session.cjs currently
  drops + the spawn timeout behavior; his lean: dump raw as it is).

## 79. (closed 2026-09-23 - live-accepted, full text in todo_records.md) - auto_resume Unit 4 msgPairs never unwrapped the SDK { data } wrapper -> action lines were NEVER recognized (spurious recovery prompts / context drain); fixed eaef397 (dual-shape unwrap + ses_u4_wrap smoke) + LIVE ACCEPTED 2026-09-23 (route= restart spawn for a valid action: restart on both builds: v=24972ebd 12:52:39Z + v=d2b9d510 13:00:08Z, no recovery= lines for the sid)

## 75. (open, 2026-09-21, planner) — **Build our own auto-resume plugin** (opencode-auto-resume research, Phase 3 seed).
- **Problem / evidence:** the looprunner is a mechanical relay; the maintainer wants infinite direct planner sessions (his ideas.md item 2026-09-18). Three measured gaps: no auto-resume after compaction, no auto compaction trigger on context limit, no auto-restart on `action: restart`. A working reference exists and is vendored in-repo (opencode-auto-resume v1.1.16, v1-era API surface, verified compatible with our opencode-ai@1.18.31).
- **Desired outcome:** a plugin in `.opencode/plugin/` that keeps a direct planner session running through compaction and restart without the looprunner.
- **Acceptance criteria:** the four-unit acceptance list in `proposals/2026-09-21_opencode-auto-resume-plugin.md` (unit 1 = skeleton logging plugin/testbed; unit 2 = context-limit compaction trigger; unit 3 = auto-resume after compaction; unit 4 = restart detection + new planner; each unit leaves the repo green).
- **Suggested scope:** `.opencode/plugin/auto_resume.ts` (new), `knowledge/opencode-plugins/` (surface report append), the proposal file itself. Units are independently approvable, strict build order.
- **Status per unit** (full unit history in `todo_records.md` — appended by the 2026-09-23 curation):
  - Unit 1 (skeleton logging plugin/testbed): LANDED + planner-verified; LIVE ACCEPTANCE PASSED post-restart (init `surface=` line + live event lines; verdict in the unit-1 surface report).
  - Unit 2 (context-limit compaction trigger, `d90973b`): LANDED + planner-verified; the live `statusOf` shape bug found in live acceptance + fixed; LIVE re-acceptance PENDING the next host restart (`arm=` lines verified live; saturation/trigger pending a natural 85 % crossing).
  - Unit 3 (new-planner spawn helper): LANDED + smoke-verified; LIVE ACCEPTANCE PASSED (planner-run 2026-09-21: one-shot trigger file → `spawn=` line + `.consumed` rename + the spawned session wrote the acceptance file; verdict in the unit-1 surface report).
  - Unit 4 (planner liveness watchdog): LANDED + smoke-verified; LIVE ACCEPTANCE PENDING the next host restart (the four acceptance cases in the proposal lines 138-142).
- **NOTE:** unit numbering per the revised proposal — Unit 3 = new-planner spawn helper (shared building block), Unit 4 = planner liveness watchdog (auto-resume after compaction is its first branch); the "unit 3 = auto-resume / unit 4 = restart detection" wording is the pre-revision numbering.

## 80. (open — fix LANDED 2026-09-22 + plugin reactivated, live acceptance (b) verified, close pending maintainer confirm; 2026-09-22, planner; HIGH) auto_resume inject calls lose the session agent → turns run as "build"
- **Problem + evidence:** the Unit 2 (L387) + Unit 4 (L643) `promptAsync`
  calls in `.opencode/plugin/deactivated/auto_resume.ts` send NO `agent`
  field (the Unit 3 spawn does, L432). opencode's prompt path defaults a
  missing agent to "build" → the injected turn runs as Build (DB, 2026-09-22
  direct session ses_f39d250e9ffeheip2FVEeY5Fk6: injected user msgs + the
  following assistant turns carry agent=build/mode=build, 23:58 ×4;
  planner-6's session record agent=build). Impact: per-injected-turn
  system-prompt change → whole prompt-cache invalidation + the planner loses
  its system prompt (the planner-worker workflow is broken for those turns).
- **Related open anomaly:** unit 4 acted on a direct (non-autorun) session
  despite the scope=none fail-safe (5× `recovery= attempt=1`; the cap resets
  on each injected busy → unreachable as-is). NO user text part of that
  session carries `<|autonom|>` (all 15 checked) and the spawned map never
  held it. Maintainer 2026-09-22: the 5 injections = his 4 interrupt
  attempts + 1 initial — he tried to interrupt 4 times, then exited
  opencode; NO scope-logic edits. The scope verdict is single (L614:
  `spawned.has` || `userHasMarker`; the spawned-map population path is
  untraced — likely a Map) → verify at fix time. Resolve before
  re-activation (suggested: a version hash in the `surface=` line).
- **Desired outcome:** injected messages preserve the session's agent (cache
  warm, role prompt intact); a direct session ends idle untouched.
- **Acceptance criteria:** (a) the unit 2/4 `promptAsync` body carries an
  explicit agent — scoped sessions: the spawn-side `PLANNER_AGENT_ID`; other
  sessions: the first user message's agent from the existing `messages()`
  fetch (`session.agent` is UNRELIABLE — it tracks the LAST prompt; proven
  lock-in to "build" on planner-6); (b) live (post re-activation): the
  injected message + turn show the session's original agent in the DB and
  cache-read tokens stay high (no full re-prefill); (c) a direct session ends
  idle with no recovery/trigger injection.
- **Open design questions (maintainer, undecided):** recovery-cap semantics
  (reset-on-busy makes the cap unreachable while the plugin keeps injecting);
  direct session = new "autorun" entry with direct interaction (his
  stop/interrupt + `ask_maintainer` must stop the loop — NEW (his idea
  2026-09-22): an `ask_maintainer` timer, e.g. 5 min — if he is not
  available, the loop/autorun resumes after the timeout); planner
  compaction budget exhaustion (keep=0 + same-session resume + budget reset
  vs. higher cap — bit-rot risk).
- **Status:** implementation LANDED (4098253, worker-2
  ses_f371e0e23ffe0eza71uD5qWy7K); plugin REACTIVATED 2026-09-22
  (380e326) — live gen `surface= v=0bb5c46f` hash-verified byte-identical
  to the #80-fixed build; **(b) VERIFIED LIVE 2026-09-22 12:33:18Z
  (DB): both the unit-2 + unit-4 injections carry
  agent=planner_Q3S_160K (pre-fix behavior: agent=build) and the
  following assistant turn does too — injected turns keep the session
  agent; (c) now gated on #82 (his marker-quote message flipped the
  scope live — a design gap, not a fix failure); close pending his
  confirm. Gate note: probe 240/241 — check [97] pre-existing red
  (maintainer temp fix 0f192e5) → #81.
  History: investigated 2026-09-22
  (planner, direct session); FIX DESIGN APPROVED by the maintainer
  2026-09-22; plugin DEACTIVATED (a000dfd). Item-3 scope anomaly: H1
  REFUTED 2026-09-22 (DB check — none of the session's 44 user-role parts,
  every part type, contains `<|autonom|>`); H2 (running variant ≠ committed
  file) leading; the new `scope=` verdict log line + `surface=` v= version
  ID will pin verdict + code state on the next incident.
- **Suggested scope:** `.opencode/plugin/deactivated/auto_resume.ts` (L387,
  L643; scope scan L543-551).

## 81. (open — re-pin LANDED 2026-09-22 (af38e2f), gate green; maintainer call — close pending his confirm; 2026-09-22, worker-2 via inbox) probe [97] + compact_memory smoke pin red since temp fix 0f192e5
- **Problem + evidence:** `handover_probe.mjs` check [97] (unit A: "exactly
  ONE queued promptAsync carrying the text part") and the matching
  `compact_memory.smoke.mjs` message pin FAIL at HEAD (probe 240/241, only
  [97] red; the smoke: 1 FAIL, everything else pass). Pre-existing — NOT
  the #80 work (the probe does not load auto_resume.ts): the maintainer's
  temp fix `0f192e5` (2026-09-22) commented out the `promptAsync` call in
  `compact_memory.ts` `queueMessage` (to stop the queued-message race — the
  SELF compaction incident); the pins still expect the pre-fix behavior.
- **Desired outcome:** the gate green again — either re-pin probe [97] +
  the smoke to the temp-fix behavior (no queued promptAsync; the queued-note
  line is still emitted), or re-pin them when the compact_memory message
  feature gets its proper fix.
- **Acceptance criteria:** probe 241/241 + `compact_memory.smoke.mjs`
  green; TODO #80's live acceptance then re-runnable against a full-green
  gate.
- **Suggested scope:** `.opencode/plugin/probes/handover_probe.mjs` (check
  [97]), `.opencode/plugin/tests/compact_memory.smoke.mjs`;
  `compact_memory.ts` only if the message path is restored.
- **Status:** LANDED 2026-09-22 (af38e2f, worker_Q3S_160K — the planner records
  ses_f36d1ca53ffe0GXACaVwW9iCJO — planner re-verified: probe 241/241, smoke 53/53, pytest 459+1w, ruff F=0; hash recorded in the planner's bookkeeping commit, #80 precedent) — re-pinned per the ruling (NOT
  deactivated/skipped, promptAsync NOT restored): probe [97] + the smoke
  message pin now assert the temp-fix behavior (dispatch line + the
  queued note byte-exact, NO queued promptAsync); gate green: probe
  241/241 (header total agrees), smoke 53/53, pytest 459 passed +
  1 warning, ruff F=0.

## 82. (open — scope-toggle LANDED 2026-09-22 via #85 part 1; live acceptance + unit-2 suppression question pending; 2026-09-22, planner live; HIGH) scope verdict: last-toggle-wins over user history, own-line anchor, bidirectional (on/off markers)
- **Problem + evidence:** live incident 2026-09-22T12:33:18Z (gen
  v=0bb5c46f — the verified #80-fixed build, post-380e326 re-activation):
  unit 4 injected a recovery prompt into the direct (no-launch) session
  ses_f39d250e9ffeheip2FVEeY5Fk6. Log: `scope= planner sid=…` →
  `recovery= attempt=1` → `arm= … injected` (the cap fix worked — the
  injected busy was consumed, no reset). CAUSE identified live: the
  maintainer's clarifying-question message contained the literal
  `<|autonom|>` (a user text part) — `userHasMarker` scans ALL user
  parts, so any later user message quoting the marker flips a direct
  session to scope=planner. (The original 2026-09-21 incident — 9×
  recovery with NO user marker in history at the time — remains H2,
  runtime-shape, unresolved.)
- **Desired outcome (his ruling 2026-09-22 — SUPERSEDES the
  first-message-only proposal):** scope is re-evaluated on EVERY new
  user message — LAST TOGGLE WINS over the user history (restart-safe:
  the same scan derives the state after a process restart). Toggle
  markers count ONLY on their own line (message-start anchors ruled
  out — the injected `ctx:` gauge line always prefixes the message, so
   the marker never sits at the start). ON: `<|autonom|>` (the existing
   launch marker) AND `<|Autorun|>` — CONFIRMED 2026-09-22: both count as
   ON, CASE-INSENSITIVE (his original german wordplay was `autonom`; both
   spellings stick); OFF: `<|Direct|>` (case-insensitive). Bidirectional:
   he can deactivate AND reactivate mid-session without starting a new
   session (context preservation — his stated motivation).
- **Acceptance criteria:** own-line match only (mid-sentence or
  bullet-prefixed markers never toggle); smoke: (i) mid-sentence quote
  → scope unchanged; (ii) own-line `<|Direct|>` then own-line
  `<|autonom|>` → last wins (ON); (iii) restart derives the same state
  from history (no in-memory persistence). Live: his post-restart test
  on this session — under the CURRENT code (all-parts scan) autorun WILL
  re-engage (any quote counts); after #82 it must NOT (his message
  carries no own-line toggle). `route= stop` live-proven by this
  session's `action: stop` turns (#70 residue). OPEN (his call, after
  the 85%-trigger info given 2026-09-22): does OFF also suppress unit 2
  (context trigger) or only unit 4?
- **Suggested scope:** `userHasMarker` / scope verdict in
  `.opencode/plugin/auto_resume.ts` (L614, L543-551) + smoke section.
 - **Status:** design AGREED 2026-09-22 (his ruling on all open
   questions); the SCOPE-TOGGLE portion LANDED as part of #85 part 1
   (2026-09-22, worker worker_Q3S_170K — the last-toggle-wins own-line
   evaluation is in the auto_resume.ts scope verdict, and the smoke pins
   acceptance (i) mid-sentence quote, (ii) last-toggle-wins ON, plus the
   own-line/trim + case-insensitive rules and the restart-safe derivation);
   remaining: live acceptance (his post-restart test) + the unit-2-
   suppression question (his call after the 85%-trigger info).

## 83. (open, 2026-09-22, planner; maintainer call — enabler for a ~0.98 threshold) unit-2 backstop: catch the ACTUAL context-limit hit cleanly (revive context_recovery.ts)
- **Problem + evidence:** the pre-emptive trigger (now configurable, default
  0.95 via the #82-adjacent change) still fires BEFORE the limit, so a
  chunk of the window is never used. He wants to "use as much of the
  context window as possible" → move the threshold toward ~0.98 and rely
  on a CLEAN catch of the real limit hit. That mechanism ALREADY EXISTS
  (verified 2026-09-22): `.opencode/plugin/deactivated/context_recovery.ts`
  (324 lines, T5 approved design 2026-09-11, built on the maintainer's
  prototype) — a hook firing on the overflow `session.error` (activation
  flag `emergencyRecovery: true` in opencode.jsonc, read per fire; only
  `true` enables it), which compacts with an informed keep (30k tokens /
  12 messages), appends its COMPACT line to ctx.log, injects the
  re-application directive, and returns `{handled:true, action:"retry"}` —
  a SINGLE clean retry that replaces the slow "opencode removes the tail
  (last message in generation) and retries 5-6 times" loop. Over budget →
  CLEAN FAIL (returns unhandled, the error propagates). Budget: the SAME
  `compact_budget.json`, ≤2 per session id (self + emergency combined).
  A smoke test exists: `tests/context_recovery.smoke.mjs`. It is
  currently DEACTIVATED.
- **Desired outcome:** the pre-emptive threshold can be raised toward ~0.98
  (configurable) because the actual limit hit is caught cleanly (one
  compact + single retry) instead of the slow tail-removal loop; and an
  over-budget session gets a clean STOP (no runaway retries).
- **Acceptance criteria:** `emergencyRecovery: true` activates it; on an
  overflow `session.error` it compacts + returns a single retry (not 5-6
  tail loops); over budget → clean fail (error propagates; the -WARNING is
  the looprunner's/protocol's job); the shared ≤2/session budget is
  respected (re-read-then-write, no await between); smoke green.
- **Suggested scope:** re-activate + adapt
  `.opencode/plugin/deactivated/context_recovery.ts` to the CURRENT
  compact_memory summarize path (v1-generation client, config-resolved
  summarizer); wire the `emergencyRecovery` flag. KEY UNCERTAINTY: the
  host must actually CALL this hook on overflow — needs a LIVE
  verification (the prototype was working at build time, but the build
  changed since). Effort MEDIUM (the code exists but predates the current
  compact_memory design and is deactivated).
- **Status:** the paired configurable-threshold change LANDED
  (2026-09-22, worker: `saturationThreshold` (0 < t < 1, default 0.95) +
  `outputReserve` (>= 0, default 20_000) as per-tick fail-open keys in the
  budget file; smoke 89/89 + full gate green; commit hash recorded in the
   planner's follow-up bookkeeping). The BACKSTOP part remains open —
   maintainer call (needs his flag in the live opencode.jsonc + the live
   host-call verification). This is the enabler for raising the threshold
   to ~0.98. NOTE (2026-09-22, #84): the `emergencyRecovery` flag now lives
   in the shared compact_budget.json (not opencode.jsonc) — the live-flag
   part of this entry must be set there.

## 84. (LANDED 2026-09-22, worker `worker_Q3S_170K`) — Compaction config consolidation: ALL compaction config in the shared `compact_budget.json` (replaces the `QUANT_CLASS_RULES` substring table + the opencode.jsonc emergency flag + the hardcoded recovery keeps)

## #85. (part 1 (scope) LANDED 2026-09-22 / part 2 (current-agent+modelID + dead-mark) LANDED 2026-09-23 / part 3 (Unit-2 ctx-line-suffix + Direct gates) LANDED 2026-09-23; live verification PENDING post-restart, HIGH priority — maintainer call) — auto_resume unbounded session-spawn loop
- **Problem + evidence:** on 2026-09-22 (~19:57–20:00Z) the LIVE auto_resume
  plugin created a NEW session every ~10s (every 2nd recovery attempt — 2
  attempts per session at 5s each, confirmed by the session naming) —
  auto_resume.log shows the `ses_f354e4cb… / ses_f354e259… / ses_f354dfe7… / …`
  series, each logged as `scope= planner` + `recovery= attempt 1` then
  `attempt 2`, each failing with `UnknownError` at `SessionPrompt.createUserMessage`.
  The maintainer saw `UnknownError` every 5s in the terminal and had to RESTART
  opencode to stop it. (Diagnosed from auto_resume.log this turn, 2026-09-22.)
- **Desired outcome:** auto_resume must never create sessions unboundedly. A
  spawn / continue / recovery that keeps failing (or keeps re-triggering on
  freshly-spawned sessions) must STOP: a GLOBAL cap (not just per-session) + a
  dead-mark (a session whose recovery/continue attempt fails is marked dead and
  skipped on later cycles), and freshly auto-spawned sessions must NOT be
  re-scoped as in-scope planners.
- **Acceptance criteria:** (a) under load a failing spawn/continue is globally
  capped and the offending session is dead-marked + skipped (no per-cycle
  retry); (b) auto-spawned sessions are not re-scoped as planners; (c) an
  `UnknownError` on a failed `createUserMessage` discards the session (no
  retry loop); (d) a test/repro showing the loop stops after the cap.
- **Suggested scope:** `.opencode/plugin/auto_resume.ts` — the spawn path
  (unit-4 "restart→spawn") + the recovery path; the global cap + dead-mark; the
  scope logic. TIES IN with the earlier design issue (unit-4 scope / the
  spurious worker resume / the action-line dilemma) — all resolved by one scope
  refinement (below).
- **GENERALIZED SCOPE (his ruling 2026-09-22):** unit-4 scope = actual PLANNER
  sessions (always) ∪ sessions started/toggled via `<|Autorun|>` (the #82
  own-line toggle). NO new marker needed — the #82 toggle already gates scope
  ON/OFF; unit 4 just follows it for ANY agent type (drop the planner-only
  gate). This lets him run other agents (prompt_builder, a future researcher,
  etc.) in a loop by toggling them with `<|Autorun|>`. Bonus: freshly-spawned
  sessions + unmarked worker sessions stay OUT of scope (not a planner, not
  `<|Autorun|>`-marked) → fixes the #85 loop AND the spurious worker-resume.
 - **Status:** part 1 (scope) LANDED 2026-09-22 (worker worker_Q3S_170K —
   the #82 generalized scope in auto_resume.ts + smoke: real-planner-via-
   agent-field ∪ last-own-line-toggle-ON for ANY agent type; the `spawned`
   self-mark is now an EXCLUSION, so a self-spawned successor is never
    re-scoped → the #85 loop condition is gone — smoke 97/97 + gate green:
    probe 241/241, all smokes, pytest 459+1w, ruff F=0; the commit hash is
    recorded by the planner in the follow-up bookkeeping commit). PART 2
    (current-agent+modelID in the injected bodies + dead-mark on a failed
    send) LANDED 2026-09-23 (worker worker_Q3S_170K — the hardcoded
    PLANNER_AGENT_ID is replaced by the session's CURRENT agent+modelID,
    resolved at fire-time: last-assistant info → opencode.jsonc agent-
    config fallback (cached) → host default (NEVER a planner constant); a
    failed CONTINUE dead-marks the idle cycle — remaining retries + the
     cap-exhaustion fallback spawn are skipped (no doomed successor),
     cleared on a fresh busy — auto_resume smoke 105/105; the commit hash
     is recorded by the planner in the follow-up bookkeeping commit).
     PART 3 (the live test exposed the Unit-2 tick design: re-fire on
     stale armed sessions + a self-loop) LANDED 2026-09-23 (worker
     worker_Q3S_170K — the Unit-2 tick leg is REMOVED: the nudge is a
     PASSIVE ctx-line SUFFIX on the session's OWN tool-call return (the
     gauge plugin's ctx: line channel — tool.execute.after), per busy
     session, ladder (>= 0.95 "self-compact now" / >= 0.98 --maintainer-
     flagged), scope "none" (Direct) suppresses it (c); NO promptAsync on
     the Unit-2 path (no resume, no loop, stale sessions unreachable by
     construction); scopeVerdict checks the LAST OWN-LINE TOGGLE FIRST —
     Direct deactivates Unit 4 for the planner (d); the Unit-4 scope is
      unchanged — auto_resume smoke 102/102 (baseline 105: the old
      promptAsync-era checks adapted to the passive mechanism) — ded7245
      (code + smoke + TODO) + 5992f38 (handover), recorded by planner-8 in
      the 2026-09-23 bookkeeping commit). The post-restart live
      verification stays a maintainer call.
     The orphan-session cleanup is DONE (the maintainer removed all the
  - **LIVE EVIDENCE 2026-09-23 (plan10, new build v=d2b9d510):** the Unit-4 restart branch fired correctly on planner-9 close (`route= restart spawn` 13:00:08Z -> the named spawn `ident=autorun-2026-09-21_15-33 planner-10`, session ses_f31a5dee5ffe1DIBxZzEDZF8aF); the trigger session was NOT re-routed afterwards (no recovery=/route= lines for its sid) and no unbounded-spawn loop recurred. His 2026-09-23_14-25 item now directs a change to the spawned-exclusion design (TODO #90).
     new sessions, 2026-09-22).

## #86. (DEFERRED — maintainer-proposed 2026-09-23, curated from todo_inbox 2026-09-23_01-08) — worker audit of ALL `.opencode/plugin/` + `.opencode/agent/scripts/` tools/plugins
- **Problem:** stale hardcoded agent ID found in `auto_resume.ts`
  (`PLANNER_AGENT_ID planner_Q3S_160K` — already handled by #85 part 2);
  likely the same class elsewhere: hardcoded agent/model IDs not matching
  the live backend/roster, magic numbers, duplicated config, dead
  constants.
- **Desired outcome:** a prioritized findings list — ID + file + line +
  suggested fix — filed to `todo_inbox.md`. No behavior change (read-only
  audit).
- **Acceptance:** findings list covering `.opencode/plugin/*.ts` +
  `.opencode/plugin/tests/` + `.opencode/agent/scripts/` (node/cjs); no
  edits; the `auto_resume.ts` PLANNER_AGENT_ID case excluded (handled by
  #85 part 2).
- **Suggested scope:** explorer or worker, read-only grep-driven scan.
- **Status:** DEFERRED — picked up only when nothing else is open (his
  2026-09-23_01-08 inbox entry; runs after #85 part 3 lands — now clear
  of that constraint).

## #87. (open — maintainer call) — Unit-4 cannot revive a dead self-spawned successor: the plugin-driven loop stalls (finding 2026-09-23, planner-8)
- **Problem + evidence:** `scopeVerdict`'s FIRST check is the `spawned`
  self-mark (`auto_resume.ts` L754; set in `spawnPlanner` L612; NO
  clear/expiration path) → any session the plugin spawned itself
  (Unit-3/4 `spawnPlanner`) is scope "none" — never recovered, never
  restart-spawned (#85 part-1 loop-prevention: "a freshly-spawned
  successor must not be re-triggered"). Measured live (2026-09-23):
  planner-8's session (ses_f33f1eb98ffeFvrnTdmTzmyE2x) was spawned by the
  Unit-4 RESTART branch (log `spawn=` 02:17:49Z; its first user message
  is the locked restartText); it went idle 3× — once after a self-
  compaction close WITHOUT an action line — and the plugin never routed
  it (log: `scope= none` 03:00:03Z; no `recovery=`/`route=` lines for the
  sid). Consequence: the L3 self-compaction continue protocol ("the
  looprunner RESUMEs via task_id") has no live looprunner in
  plugin-driven mode — only a maintainer message rescued the session.
  NOTE: a toggle in a maintainer message (`<|Autorun|>`) does NOT re-scope
  a self-spawned session (the spawned check precedes the toggle check).
- **Desired outcome:** his ruling on dead-successor semantics (options
  below); then spec + landing.
- **Options (his ruling):** (a) keep the stall — a dead loop is visible,
  he restarts (no code); (b) bounded restart-spawn of a dead self-spawned
  successor (e.g. ONE re-spawn per successor, or only if the session made
  a committed progress since spawn — preserving #85's loop prevention);
  (c) keep the looprunner in the loop after a plugin spawn (hand off to
  the looprunner instead of self-spawning — it already has
  resume-from-death semantics); (d) re-arm on a fresh busy after
  compaction (clear the spawned mark on the self-spawned session's first
  busy — revives L3 continuation; risks the #85 loop unless bounded).
- **Acceptance:** ruling recorded; spec written; the behavior change is
  approved BEFORE implementation (observable behavior).
- **Status:** open — maintainer call (he is AFK; recorded for the next
  direct session).

## #88. (LANDED 2026-09-23, worker-14 `worker_Q3S_170K`) — auto_resume smoke wall-time cut 91.4 %: 145.5 s → 12.5 s (his 2026-09-23_00-12 complaint measured at 145.5 s, not ~300 s) — the tick period is now a DEFAULT-PRESERVING factory option (`tickMs`, default 5000 ms — the live tick is unchanged; first factory call sets the module-level tick); the smoke instantiates with `tickMs: 300` and its 7× `sleep(5600)` became `tickWait()` (2 ticks + margin — same "at least one full tick period" pin semantics); no check removed (102/102 before AND after); gate re-verified: probe 241/241, all 10 smokes, pytest 459+1w, ruff F=0. Commit 532ddbc.

## #89. (closed 2026-09-23 - live-accepted plan10; full text in todo_records.md) - autorun-identifiable names for plugin-spawned sessions (title <loop-folder> planner-<N>): LIVE - the first named spawn verified 2026-09-23 13:00:08Z (the spawn= line carries ident=autorun-2026-09-21_15-33 planner-10 + the session title in the DB)


## #90. (open - maintainer item 2026-09-23_14-25; design needed; related #87) - plugin-spawned successors should be tracked (not scope "none") and inherit the trigger session's Autorun/Direct state
- **Problem / evidence:** his priority.md item 2026-09-23_14-25: "spawned new session by the auto-resume plugin should be tracked also and not set to 'none' - they should inherit the settings/state from the session that triggered the new session via action: restart - so in the next session the same Autorun / Direct setting will be transmitted - and deactivated for the old session (i assume to prevent an unintentional resume) (if not already the case)". Current behavior: the `spawned` self-mark (set in `spawnPlanner`, checked FIRST in the scope verdict, auto_resume.ts) is an EXCLUSION (the #85 part-1 loop prevention) -> a plugin-spawned successor is scope "none" and is never re-routed (measured live 2026-09-23: the self-spawned planner-8 session stalled at scope=none - TODO #87).
- **Desired outcome (his words, parsed):** a spawned successor (1) is tracked/in-scope, (2) inherits the trigger session's last own-line Autorun/Direct state, (3) the trigger session is deactivated (its scope off) to prevent an unintentional resume - with the #85 unbounded-spawn loop prevention preserved.
- **Acceptance:** the design ruling/spec is approved BEFORE implementation (observable behavior change); the #85 global cap + dead-mark stay effective; smoke pins for the inherit + deactivate behavior.
- **Suggested scope:** `auto_resume.ts` (scope verdict + `spawnPlanner`) + the auto_resume smoke.
- **Status:** open - design needed; this item is his steer on the #87 dead-successor question (recorded for the next direct session) - #87 stays open until the ruling is recorded and a spec is approved.