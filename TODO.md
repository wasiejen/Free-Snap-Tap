# TODO — maintainer's open items

Numbering: every entry ID is UNIQUE and NEVER REUSED — used so far up to #101, new
entries start at #102 (closed IDs stay reserved in `todo_records.md`).
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


## 53. (closed 2026-09-23, planner-13 bookkeeping; full text in todo_records.md) — Agent-feedback protocol: the mandatory close-down friction step (Part A, 5e29cb0, all 4 role prompts) + the `submit` write-tool (Part B, b83b34f + session/role autofill 86a977f); maintainer-domain tail closed (registration live in the role toolsets, AGENTS.md paste LANDED 2026-09-18, machine-stamped entries firing in live sessions since).

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


## 66. (closed 2026-09-23, planner-13 bookkeeping; full text in todo_records.md) — 5.3+5.4 restart acceptance was stale: the read-scope mutation channel was proven LIVE by #68's one-shot live-acceptance (2026-09-17); the §5.4 sentinel torn down; intercept.log accumulated to 3076 lines / 139 sessions by 2026-09-23.

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
  green + R4 log-volume data). R4 LANDED 2026-09-23 (planner-13,
  worker-13 ses_f30310096, commit dde74b9, planner-verified): the mining
  scriptlet `scripts/log/summarize_intercept.cjs` + fixture pin (6/6 smoke) +
  INVENTORY/README; the gate data is in hand (run output: verdict counts,
  fuzzy-rejected d/gap lines, out-of-sandbox prefixes, per-session counts —
  counts move, the log grows live). Census-basis note (worker finding): the
  spec's "139 distinct session ids" was a substring census; the script's
  field-2 census reads 86 at 3130 lines — the field-2 census is the R4
  per-session basis (the gate is met on either basis). R3 is UNBLOCKED —
  the build awaits maintainer approval (the plugin-scope extension is an
  observable behavior change).

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
- **Status:** LANDED 2026-09-23 (worker_Q3S_170K
   ses_f30807a16ffelPQPUBH50wiXBe — A+B+C per spec 2f64d76: `--json` raw mode
   + lossless full markdown + `--lite` preset + hook 120 s budget / pipe
   stderr capture / one retry; DUMP-OK `ms=` + stdio + S14-104 re-pins
   (recorded in the worker handover); gate green — the code commit hash is
   recorded in the planner's follow-up bookkeeping — Commit **6b33907** (planner-verified 2026-09-23: compact_memory smoke re-run 57/57; `--json` spot-check on the trigger session: 70 msgs / 337 parts, JSON.parse OK, counts exact-match the live DB)). Was SCOPED 2026-09-23
   (plan11, explore ses_f317d80c2ffeMGup4T9z5IvUs2 — findings:
   `.opencode/loop/autorun-2026-09-21_15-33/plan11_78_scope.md`. Headline: his
  cited corpus file is a STALE 2026-09-15 slim backfill — the CURRENT full
  mode emits all 141 parts of that session (30 reasoning + 16 text verbatim);
  residual gaps = tool `state.input`/`state.output` never emitted + 400/600-
  char caps on other types; NO raw-JSON mode exists. Hook timeout = fixed
  60 s (`compact_memory.ts` L359) vs measured 64–87 ms dump wall-times → the
  live DUMP-FAIL ETIMEDOUT is a SPAWN-LEVEL STALL, not budget exhaustion
  (`stdio: "ignore"` hides the child stderr). Ranked recs: (1) add a
  `--json` raw-as-is mode to `dump_session.cjs` (S; hook-default = his call),
  (2) raise/diagnose the hook timeout (S–M), (3) make markdown full mode
  lossless (S) + (4) later an on-demand markdown filter over the raw JSON.)
   Awaiting his ruling on the options. **RULING 2026-09-23 (planner-12 direct): go for 1 + 2, plus 3+4 unified** (his 3/4 intuition confirmed — unfiltered vs filtered = a renderer toggle: 3 = lossless full markdown AT DUMP TIME, 4 = a `--lite` filtered preset on the same script). Spec written (handover_task.md) + `worker_Q3S_170K` launched; the pre-compaction hook keeps its markdown backup rendered with the lossless full mode (raw JSON stays the on-demand `--json` mode — planner call, veto-able).

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

## 80. (closed 2026-09-23 - fix LANDED 4098253 (worker-2) + plugin reactivated, live-accepted: (b) the injected turns keep the session agent (DB, 2026-09-22) + (c) the Direct session idle-untouched under the post-#90 build (scope=none 17:08:57Z, zero recovery/route/spawn); maintainer confirm 2026-09-23; full text in todo_records.md) - auto_resume inject calls lost the session agent → the turns ran as "build" (the prompt-cache invalidation + the planner lost its system prompt); fixed: the injected bodies carry the session's CURRENT agent+model (the last REAL assistant's info — #91: the compaction summary is skipped; else the JSONC configured-model fallback; else the host default — never a planner constant)

## 81. (closed 2026-09-23 - re-pin LANDED af38e2f (worker_Q3S_160K), gate green (probe 241/241, smoke 53/53, pytest 459+1w, ruff F=0), maintainer confirm 2026-09-23; full text in todo_records.md) - probe [97] + the compact_memory smoke message pin red since the maintainer's temp fix 0f192e5 (the queued promptAsync commented out); re-pinned to the temp-fix behavior (the dispatch line + the queued note byte-exact, NO queued promptAsync — NOT deactivated, promptAsync NOT restored)




## 82. (closed 2026-09-23, planner-13 bookkeeping; full text in todo_records.md) — scope toggle (last-toggle-wins, own-line anchor, bidirectional) LANDED as #85 part 1 (97fccfc) + the unit-2 suppression ruling (Direct suppresses Unit 2 = the already-landed #85 part 3 behavior, no code change); FULL live acceptance 2026-09-23 on the #90 spawn tail (own-line toggle judged scope=autorun, route= restart spawn, successor's first message carries the own-line marker, trigger deactivate=).

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

## #87. (closed 2026-09-23 - subsumed by #90; full text in todo_records.md) - Unit-4 cannot revive a dead self-spawned successor (the plugin-driven loop stalls): RESOLVED by #90 Part A — the self-spawned successor is now TRACKED (scope "autorun" via the restart prompt's own-line toggle) and RECOVERED after an idle without an action line (the #87 stall case, inverted); option (b)'s "committed progress" idea is replaced by the lineage-depth cap (N=2) on the spawn branch.

## #88. (LANDED 2026-09-23, worker-14 `worker_Q3S_170K`) — auto_resume smoke wall-time cut 91.4 %: 145.5 s → 12.5 s (his 2026-09-23_00-12 complaint measured at 145.5 s, not ~300 s) — the tick period is now a DEFAULT-PRESERVING factory option (`tickMs`, default 5000 ms — the live tick is unchanged; first factory call sets the module-level tick); the smoke instantiates with `tickMs: 300` and its 7× `sleep(5600)` became `tickWait()` (2 ticks + margin — same "at least one full tick period" pin semantics); no check removed (102/102 before AND after); gate re-verified: probe 241/241, all 10 smokes, pytest 459+1w, ruff F=0. Commit 532ddbc.

## #89. (closed 2026-09-23 - live-accepted plan10; full text in todo_records.md) - autorun-identifiable names for plugin-spawned sessions (title <loop-folder> planner-<N>): LIVE - the first named spawn verified 2026-09-23 13:00:08Z (the spawn= line carries ident=autorun-2026-09-21_15-33 planner-10 + the session title in the DB)



## #90. (closed 2026-09-23, planner-13 bookkeeping; full text in todo_records.md) — spawned successors inherit the trigger's Autorun state + the trigger deactivates (Parts A+B+C, commit c4b244d, worker_Q3S_170K) — FULL live acceptance 2026-09-23 (planner-13, build v=7d2e6207): `route= restart spawn` + `spawn= agent=planner_Q3S_170K ident=autorun-2026-09-21_15-33 planner-13` + `deactivate=` (19:20:55Z) + the restartText own-line `<|autonom|>` as the successor's first message + zero `skip=` depth-cap lines; subsumes #87 (closed).

## 93. Emergency compact backstop: port context_recovery.ts to the `event` hook (2026-09-24 direct; maintainer-ordered next unit)
- **Problem / evidence:** context_recovery.ts (the T5 emergency overflow recovery — the backstop for when the agent fails to self-compact in time) registers a `"session.error"` plugin hook that does NOT exist in the current `@opencode-ai/plugin` SDK (zero matches in the node_modules d.ts) → the hook never fires (silent). Live fork test 2026-09-23 (ses_f2fee1f3fffej3GlGz8jJ5iGwb "compaction agent and context limit testing", fork of planner-13, Qwen3.8-27B-Compaction): 4× overflow errors `request (148149 tokens) exceeds the available context size (131072 tokens)` reached the event stream with `emergencyRecovery: true` ON + the plugin loaded — no COMPACT line, no budget increment, the session died at the wall (`MessageAbortedError`).
- **Outcome:** the backstop fires on an overflow session.error (compact with the configured keep → COMPACT line → reload directive → `{handled:true, action:"retry"}`) + a diagnostic line on EVERY fire (so a future silent failure is visible in one file).
- **Acceptance:** live overflow on a driven/forked session → COMPACT line + budget increment + the session retries and continues (log evidence); smoke pin for the event-hook path (extend the existing probe's faked client to the event shape); standard gate green.
- **Scope:** `.opencode/plugin/deactivated/context_recovery.ts` → `event` hook (`event.properties.sessionID` — capital D — + the `ContextOverflowError` union); flag/budget/keep/COMPACT/directive logic unchanged; move back to `.opencode/plugin/` at landing. PRESTEP to the maintainer's planned integration of context_recovery + compact_memory into ONE plugin (shared compaction functionality) — the integration itself is a separate follow-up task.
- **Status:** LANDED 2026-09-25 (worker, `worker_Q3S_170K`): the event-hook port lives at `.opencode/plugin/context_recovery.ts` (the deactivated copy is removed) — `event` hook (no `"session.error":` key — that hook does not exist in the current SDK), capital-D `sessionID`, the overflow markers, the v1 summarize path with the config-resolved pair (self-contained local copies — no runtime import from compact_memory.ts), the v2 budget gate (normal / emergency-1 / exhausted CLEAN FAIL), the once-per-overflow guard (cleared on EventSessionIdle), the COMPACT line per the current tool's writer (messages-only + the ` emergency` suffix), and the spec-2+11 post-compaction directive via promptAsync (the retry vehicle — the hook returns void, so the old `{handled, action:"retry"}` return is gone). Smoke re-pinned 15/15, probe S11 re-pinned (11 checks: 76-81 + 257-261) — probe 257/257, gate green (commit hash recorded in the planner's follow-up bookkeeping commit — no self-reference). REMAINING (maintainer domain, verbatim): (1) the host restart (plugin activation), (2) the live overflow acceptance on a driven/forked session as the 2026-09-23 fork test (expect: ONE COMPACT line + the budget increment + the session survives/continues — the flag is already `true` in the budget file, no flag work needed). FOLLOW-UP (out of scope): the context_recovery + compact_memory ONE-plugin integration is the next candidate. Architecture ruling: host auto-compaction stays DEACTIVATED by design (`"auto": false` — it fired uncontrollably, `buffer` never worked); the host `compaction` config only supplies defaults (model + keep); the agent-driven compaction stays primary; the emergency compact is the remaining piece. Keep-values (CLARIFIED 2026-09-24 — no drift, by design): our plugins (compact_memory + the emergency backstop) read `compact_budget.json` (keepMessages 12); the host MANUAL compact (usable on any session any time, independent of `auto`) reads the opencode.json `compaction` block (keep.messages 18) — each system its own store; tokens agree (30000).

## #91. (open, 2026-09-23, planner-12 direct; live incident 14:44–14:46Z; HIGH) compaction summary leaks into spawn identity + unit-4 routing (agent=compaction successor; mis-route on a quoted action line)
- **Problem / evidence:** live incident 2026-09-23 14:44–14:46Z (pre-#90 build d2b9d510): planner-11 (ses_f318f0d77…) self-compacted (14:44:19Z) → the compaction summary is stored as an ASSISTANT message with info.agent=compaction + info.model=<session model> (the same-model fallback — agent.compaction.model is commented out). The summary text QUOTES "Previous planner-10 … closed with `action: restart`" (6612 chars). The unit-4 tick (14:46:06Z) then: (1) `lastAssistantAction` scanned the summary (the last assistant message) → found the QUOTED `action: restart` → ROUTE= RESTART SPAWN (mis-route — the planner's actual last real turn, 14:44:12Z, was a 76-char no-action-line close; the loop log records "self-compact + unit-4 resume per maintainer inbox"); (2) `resolveInjectIdentity` → the summary's info → the spawn body agent=compaction + model=Qwen3.8-27B-Q3S-170K (the spawn= line 14:46:06.647Z). "compaction" is NOT an agent defined in the live opencode.jsonc → the successor (ses_f3144d9d6…, ident=…planner-12) ran with the WRONG agent + mode (maintainer: "i started the session prior with autorun but the wrong agent and mode. thus reverted and then started you with direct"). DB evidence: the ses_f318f0d77 message 14:44:19.866Z (assistant / agent=compaction) + the auto_resume.log lines 14:46:06.629–647Z.
- **STILL LATENT in the live build (ef8c6149 = #90):** `lastAssistantInfo` (L921-930) + `resolveInjectIdentity` (L1052-1060) + `lastAssistantAction` (L1065-1077) do NOT skip the compaction agent → recurs whenever an autorun session self-compacts immediately before the idle routing decision (the near-limit protocol makes this common): the successor is spawned with the wrong agent, AND the routing reads action lines QUOTED in the summary instead of the real close.
- **Desired outcome:** identity + routing resolve from the last REAL turn (the compaction summary is never used for either).
- **Fix design (recommended — maintainer call, observable behavior change):** skip assistant messages with info.agent === "compaction" in BOTH `lastAssistantInfo` (→ the spawn/inject identity falls back to the last real assistant message: the planner's agent+model) and `lastAssistantAction` (→ the routing reads the pre-compact close: a no-action-line Work State dump → recovery, as intended). One guard each; smoke fixture: a messages() shape whose last assistant message = a compaction summary (agent=compaction, text quoting "action: restart") → (a) the routing returns null (recovery), (b) the spawn body agent = the preceding real assistant's agent.
- **Acceptance criteria:** the smoke pins above + gate green; LIVE: the next autorun self-compact→idle cycle (a) routes correctly (no mis-spawn from a quoted line), (b) the spawn= line carries agent=planner_* (not compaction).
- **Suggested scope:** `.opencode/plugin/auto_resume.ts` (L921-930, L1052-1060, L1065-1077), `.opencode/plugin/tests/auto_resume.smoke.mjs`.
- **Status:** fix LANDED 2026-09-23 (planner-12 direct, planner-implemented after his "approved") — the one-guard-each fix per the design (skip agent="compaction" in `lastAssistantInfo` + `lastAssistantAction`, auto_resume.ts); smoke re-pinned 121/121 (+3 #91 pins e1/e2) + gate green (probe 241/241, all smokes, pytest 459+1w, ruff F=0). Commit **2fa4bb6**. REMAINING — live acceptance (needs his restart to the new build + the next autorun cycle): a self-compact→idle cycle must (a) route from the real close (no mis-spawn from a quoted line), (b) the spawn= line carries agent=planner_* (not compaction) — this also completes the #90 new-build spawn tail (DONE 2026-09-23). **Spawn-tail live acceptance (planner-13, build v=7d2e6207 live, process start 19:13:25Z):** the `spawn=` line carried `agent=planner_Q3S_170K` (the real agent, not compaction) and `route= restart spawn` came from the real close — no mis-route off the quoted 17:32Z compaction summary in this episode. NOT YET live-discriminated: the failure case needs the compaction summary to be the LAST evaluated turn (a self-compact then idle cycle in an autorun-scoped session) — the maintainer's re-engagement + own-line toggle + real close all followed the 17:32Z summary, so the guard was not the deciding factor here; the guard is smoke-covered (3 pins) and the discriminating cycle will occur naturally under the near-limit protocol.

## #92. (open, 2026-09-23, planner-12 direct; his question; SMALL) pre-compaction hook should save BOTH the lossless full markdown AND a raw `--json` snapshot
- **Problem / evidence:** after #78 the hook keeps only the markdown backup. His question (2026-09-23): with raw JSON as the on-demand `--json` mode (DB-sourced), how do you get the pre-compaction JSON later — "the db is overwritten by the compacted session"? MEASURED on this session (compacted 17:32:02Z): the DB is NOT overwritten — 36 pre-compaction messages + 170 parts are still in the DB, 76 reasoning parts whole-session (the compaction summary is an ADDED assistant message, agent=compaction; planner-11's session showed the same). So on-demand `--json` of a compacted session works TODAY. BUT the DB is a live host-managed store (session deletion / pruning / migration / corruption can lose the rows) — the hook's _c0 snapshot is the only PINNED "state at compaction time" record; markdown-only forfeits the lossless source at exactly that moment.
- **Desired outcome:** every pre-compaction dump writes BOTH: the lossless full markdown (current) + a raw `--json` snapshot (the lossless master — any later filtered view re-derivable from it).
- **Acceptance criteria:** two DUMP-OK lines per dump (md + json); both files land in the archive dir; the #78 diagnostics (ms= / DUMP-RETRY= / DUMP-FAIL + stderr) + the 120 s budget + one retry apply to BOTH dumps; compact_memory smoke re-pinned; gate green.
- **Suggested scope:** `.opencode/plugin/compact_memory.ts` (the preCompactionDump call site — the dump script already has `--json`), `.opencode/plugin/tests/compact_memory.smoke.mjs`.
- **Status:** OPEN — his call (planner recommendation: YES, save both — the measured cost is trivial, < 0.2 s + ~1-2 MB per dump).

## #95. (open, 2026-09-25, planner direct; his rulings 2026-09-25) fuzzy edit-oldstring track — PARENT entry (replaces the stale #67 references — that ID never existed in the committed TODO.md)
- **Problem / evidence:** edit oldString exact-match failure is a very regular problem (his priority.md "fuzzy matching of edit oldstring" + ideas.md L143-158); the #94 worker's anchor-semantics drift finding is queued here (todo_inbox 2026-09-25). Track state: R1/R2 live, R4/R7 landed, R6 STAGED (gate cleared), R3 STAGED, R8 + the escape return-info not staged.
- **Sub-items (order):** (1) R6 as-is (pre-approved per its spec: payload journal + edit hints, observation-only); (2) the MUTATING edit-fuzzy (design pinned below — spec at launch); (3) R3 (gate CLEARED by his ruling 2026-09-25 — bitdrift retired, no correction data, R4 mining retired; absorbs the anchor-drift fix: existing block_transfer modes `includes` + no unique-check → startsWith+unique per #94); (4) R8 sandbox redirect + escape return-info.
- **Pinned design for (2) (agreed 2026-09-25 direct):** oldString miss → the R6 content-locator candidates (anchors = distinctive lines of the oldString) → **normalize BOTH sides before comparing** (`\r\n`→`\n` + strip per-line trailing whitespace) → d=0 normalized → mutate oldString to the file's exact bytes (the CRLF/LF + trailing-whitespace class is unbounded in length — a proportional bar like 1-in-100 REJECTED: a 40-line CRLF drift = 39 chars, far beyond any proportional cap, while normalization removes it exactly); d≤1 normalized → mutate ONLY on exactly-one candidate (typo tolerance, the #72/M1 strict bar); else fail-closed + the edit-hint line; mandatory log line kind=fuzzy-edit orig=/value= (his return-info ruling); no auto-retry beyond the mutation; the R6 journal stays the recovery fallback.
- **Acceptance:** per sub-item (each spec at launch); overall: a controlled CRLF-drift edit and a single-typo edit both resolve without agent action (log evidence), gate green at each landing.
- **Suggested scope:** `.opencode/plugin/intercept_observer.ts` (+ core), `.opencode/plugin/tests/`, `.opencode/plugin/probes/handover_probe.mjs`, the `research/fuzzy-numword/` specs.
- **Status:** OPEN — specs written at launch from this entry.
  2026-09-25 (autorun, ses_f29afbb66ffeRM1EHgBIpTwTg5, planner-14): his
  GO for sub-item (2) — the normalize-then-compare design is CONFIRMED
  (his words: better than the proportional distance rule; go ahead) +
  two directives folded into the (2) spec: (a) resolutions AND failed
  resolutions are LOGGED — every attempt, the line carries the best-
  candidate d (a near-miss d<10 is visible; no d bar on logging),
  (b) the return feedback does NOT carry the full oldstring (context
  saving — a truncated identifier: first ~40 chars + length + d +
   target; the full payload stays in the R6 journal). R6 (sub-item 1)
   LANCHED (worker_Q3S_170K, spec plan14_ho_task.md).
   2026-09-25 (autorun, ses_f29afbb66ffeRM1EHgBIpTwTg5, planner-14,
   post-compaction): sub-item (1) R6 LANDED + planner-verified from file
   evidence (the worker's close-out died silently — the state was
   committed from the working tree): content-locator `locateContent`
   (VERDICTS 11) + the payload journal (journal_write.log /
   journal_edit.log) + the edit-hint channel (edit-hint /
   edit-ambiguous / no-candidate) + the after-hook enrichment (live
   acceptance restart-gated) + the DoD machine check. Gates: probe
   279/279 (baseline 259 + S26's 20), intercept_observer smoke 48/48,
   pytest 459+1w, ruff F=0. Docs: the plugin README recovery protocol +
   decision-record §8.1 addendum. Next: sub-item (2) the edit-fuzzy spec
   (normalize-then-compare).
   2026-09-25 (worker ses_f27bb616dffe8yue93zR3sEwHs, worker_Q3S_170K,
   resumed post-compaction): sub-item (2) the MUTATING edit-fuzzy
   oldString (normalize-then-compare) LANDED: `runEditFuzzy` supersedes
   the R6 hint path for the 0-raw-occurrence case — exactly-one
   candidate at d=0/d≤1 → oldString MUTATED to the file's exact unique
   bytes + the `fuzzy-edit` line (VERDICTS = 12; NO after-hook hint);
   else FAIL-CLOSED (the R6 verdict carrying the best-candidate d —
   directive a; the after-hook hint stored). Directive b: the feedback
   line truncated (first 40 + ...), the journal's edit `old` = the
   ORIGINAL pre-mutation oldString. Code commit 15761d8; the probe/docs
   commit hash is in the worker handover (the planner records it in the
   follow-up — no self-reference). Gates: probe 287/287 (baseline 279 +
   S27's 8; the S26 re-pins 271/275/276), intercept_observer smoke 55/55
   (from 48/48), pytest 459+1w, ruff F=0. Docs:
   spec_sub2_edit_fuzzy_oldstring.md + decision-record §8.2 addendum.
   Next: sub-item (3) R3 (gate cleared — absorbs the anchor-drift fix).

## #94. (LANDED 2026-09-25, planner direct; his approval 2026-09-25) block_transfer REPLACE mode — line-anchored span replacement from a buffer (edit-like, no exact oldString)
- **Problem / evidence:** edit oldString exact-match is a very regular failure (his priority.md "fuzzy matching of edit oldstring"; ideas.md L153-158: "what would be needed to make block_transfer as versatile as edit but less prone to oldstring mismatch?"); block_transfer PASTE is insert-only (append after targetMarker / EOF) — a slot/region replacement needs a MOVE+DELETE composition (two calls, intermediate state); the 2026-09-24 slot-clobber incident (agent_feedback) showed PASTE-as-slot-replacement is a trap.
- **Desired outcome:** one atomic call replaces the line-anchored span (short unique line-prefix anchors — no exact oldstring, no whitespace sensitivity) with the named buffer content; the return string reports what was replaced (perceptibility — the caller cannot see its own args after the call).
- **Acceptance criteria:** smokes 30/30 + 53/53 (from 22/52); probe S15 = 12 checks, total 259; standard gate green; the tool description documents REPLACE; a knowledge note appended.
- **Suggested scope:** `.opencode/tools/block_transfer.ts`, `.opencode/plugin/tests/block_transfer*.smoke.mjs`, `.opencode/plugin/probes/handover_probe.mjs` (S15), `.opencode/agent/knowledge/plugin_tools/`.
- **Status:** LANDED 2026-09-25 (worker, `worker_Q3S_170K`): `REPLACE` mode in `.opencode/tools/block_transfer.ts` (enum + the dispatch branch next to PASTE + the description MODES/ANCHORS/BUFFERS/EDGE text) — the line-anchored span (short UNIQUE line prefixes, `startsWith`, non-unique → an error naming the cause, start..end INCLUSIVE, start ≤ end) of an EXISTING dstFile is replaced atomically by the named buffer (REPLACE never creates a file; the buffer is preserved, PASTE semantics; all checks before any fs write; the return reports the 1-based line span + counts); smokes re-pinned 30/30 (+8) + 53/53 (+1); probe S15 = 12 checks (+262/263), probe total 259/259 (header totals machine-updated); gate green (pytest 459 passed + 1 warning, ruff F=0); knowledge note appended at `.opencode/agent/knowledge/plugin_tools/2026-09-25_block_transfer.replace_mode.md`. (Commit hash recorded in the planner's follow-up bookkeeping commit — no self-reference.) The broader fuzzy-oldstring track (anchor-based fuzzy oldString resolution + the edit/write journal dump per his ideas.md L146-150 + the priority.md fuzzy_numword items) is a SEPARATE track awaiting design ruling.
## #96. (CLOSED 2026-09-25, planner-17 live-verified post-restart; full text in todo_records.md) — auto_resume.log write-volume reduction: delta exclusion + init size guard LANDED (worker-Q3S-170K, 22c36e4/70399ea, smoke 133/133); LIVE-VERIFIED 2026-09-25 (planner-17, post-restart): `log-trim= old=293026007 new=2097152` (12:50:57Z — the 293MB file trimmed to 2MB at init) + zero `message.part.delta` lines appended after the trim (the last delta line predates the trim; the new build's lines are delta-free).

## #97. (open, 2026-09-25, his live priority.md edit labeled "TODO #97"; planner-14 filed) R8 sandbox redirect: out-of-sandbox path args redirected INTO the sandbox (repeated out-of-sandbox accesses stop the session until he intervenes)
- **Problem / evidence:** his priority.md live section 2026-09-25 ("# fuzzy_numword
  R8"): repeated accesses outside the sandbox stop everything until he
  intervenes — e.g. an access to `C:\Users\Wasiejen\AppData\Local\Temp`
  instead of the designated `C:\Users\Wasiejen\AppData\Local\Temp\opencode`;
  the earlier priority.md fuzzy_numword item gives the shape (redirect
  calls like `C:\Users\Asiejen\AppData\Local\Temp\opencode\brtest.mjs`
  into the sandbox). His named basis for the allowed paths: the
  `permission.external_directory` + `references` sections of
  opencode.jsonc (both). This is #95 sub-item (4) first half — the
  escape return-info is the second half (rides the same launch).
- **Desired outcome:** an out-of-sandbox path argument that maps 1:1 into
  a sandbox/allowed path is REDIRECTED (mutated) by the intercept before
  the call runs, with the mandatory log line (kind + orig= + value= per
  his return-info ruling) — the "repeated accesses stop everything"
  loop ends; NO new out-of-sandbox access is ever granted (redirect
  only, never an allow-widening).
- **Acceptance:** a controlled out-of-sandbox path (the Temp-without-
  opencode-suffix case) is redirected + logged; a path with no 1:1
  mapping fails closed (no mutation); probe pins per the established
  pattern; standard gate green.
- **Suggested scope:** `.opencode/plugin/intercept_observer.ts` (+ core —
  the allowed-path resolution from opencode.jsonc
  `permission.external_directory` + `references`),
  `.opencode/plugin/probes/handover_probe.mjs`, the tests.
- **Status:** LANDED (worker-17, 2026-09-25 — commits `07bdd56` (Unit 1
  R8 redirect) + `0d9b8e6` (Unit 2 escape return-info) + `6684991`
  (handover); planner-17 spot-verified: intercept smoke re-run 67/67
  green, probe 303/303, pytest 459 passed + 1 warning, ruff F=0 per the
  handover). The return-info/feedback half landed as Unit 2 (his
  context-saving ruling honored: truncated first form in the feedback,
  full pre-mutation payload in the journal `pre-escape` field).
  Sign-offs (handover §deliberately-not-done): S28 probe section
  placement, `pair-resolved` verdict reuse (the 12-token vocabulary is
  pinned), the redirect note text, the 13b hint token — all accepted by
  planner-17.

## #98. (LANDED, 2026-09-25, worker-16; Parts A+B implemented + smoke re-pinned, Part C not-applicable per the planner ruling) unit-4 resume-after-compaction: line-anchor the action regex (A) + re-arm on COMPACT (B) + prompt note (C)
- **Problem / evidence:** `proposals/approved/2026-09-23_unit4-
  compaction-resume.md` (his `--comment` "approved A, B and C") —
  verified NOT implemented 2026-09-25: `ACTION_RE` (auto_resume.ts
  L267) is still the unanchored `/action:\s*(restart|resume|stop|
  ask_maintainer)/g` (a prose-quoted action line still drives routing —
  the live-verified 2026-09-23 20:14Z mis-route) and there is NO
  ctx.log `COMPACT` tail-read in the tick (a landing compaction is
  silent → the unit-4 recovery-continue promise is non-deterministic).
- **Desired outcome:** per the proposal — Part A: `action:` matches only
  at line start (`/(^|\n)\s*action:\s*(…)/g`, last match still wins);
  Part B: on the 5s tick, tail-read `.opencode/temp/ctx.log` for NEW
  `COMPACT <sid>` lines → `idlePending = true` + `recoveryCount = 0`
  (fresh budget — the context situation changed); Part C: the Work
  State dump form should not quote a literal `action: restart` in
  prose (prompt-text note — planner-as-text-worker, workers have no
  prompt edit access).
- **Acceptance:** per the proposal: smoke pin A (a last assistant
  message with a PROSE-quoted mid-line `action: restart` →
  `lastAssistantAction` null; a standalone line → "restart"), smoke
  pin B (a synthetic ctx.log `COMPACT` line for a watched sid → re-armed
  on the next tick), standard gate green; LIVE: the next self-compact
  → idle cycle routes from the real close (no mis-spawn from a quoted
  line) + a `recovery=`/`route=` line follows the `COMPACT` line
  WITHOUT a user message in between.
- **Suggested scope:** `.opencode/plugin/auto_resume.ts` (L267, the
  tick), `.opencode/plugin/tests/auto_resume.smoke.mjs`; Part C =
  prompt text (planner, not the worker).
- **Status:** LANDED (worker-16, 2026-09-25, commit 4f90218 Part A +
  cf7e6f5 Part B) — Part A: `ACTION_RE` line-anchored (NON-capturing
  `(?:^|\n)` — group 1 stays the action word); Part B: the 5s tick
  tail-reads `.opencode/temp/ctx.log` for NEW `COMPACT <sid>` lines
  (module-level `ctxLogOffset` cursor, partial-line hold-back,
  never-throw) → for a WATCHED sid: `idlePending=true` +
  `recoveryCount=0` BEFORE the routing loop (the silent-compaction gap
  closed). Smoke 139/139 (133 baseline + 6 new: A1/A2/B1/B2/B3 + the
  section re-factory chk; 17 scripted closing texts re-pinned to
  own-line action lines — the pins' routing assertions unchanged).
  Standard gate green: pytest 459 passed + 1 warning, ruff F=0, probe
  291/291 (no probe pin breakage — the existing probe pins use
  standalone `action:` lines). LIVE acceptance (the next self-compact
  routes from the real close; a `recovery=`/`route=` line follows the
  `COMPACT` line WITHOUT a user message in between) = PENDING live
  observation. Part C: not-applicable (the Work State dump form was
  removed in the 2026-09-24 rework — the planner records it in the
  handover).

## #99. (open, 2026-09-25, planner-15; his priority.md top item 2026-09-25) compaction keep: the plugin must pass keepTokens (computed primary, budget-file fallback) — keepMessages alone does not control the retention
- **Problem / evidence:** maintainer live measurements 2026-09-25
  (priority.md top item, his words): "keepToken was worken [worked]. with
  30000 keepToken the newly compacted session was around 55k token. with
  the keepToken 0 and keepMessages X it was always around 25K token after
  compaction. so the 30k keeptoken were a direct retention that added
  25k +30k to the observed 55k" — `keep.tokens` = direct retention on a
  CONSTANT ~25k base (system + summary + minimal tail); the
  `keep.messages` count does NOT control the retention (always ~25k
  regardless of X). Our compact_memory sends only `keep.messages` in the
  summarize body (keepTokens removed 2026-09-24 spec 01 as "never
  respected" — superseded: the respected knob is `keep.tokens`). The
  installed SDK's summarize body schema is `{ providerID, modelID }`
  ONLY (no documented `keep` field — the body field's effect is
  UNVERIFIED; the live retention tracked the CONFIG
  `compaction.keep` in opencode.jsonc). Dev-branch host source
  (maintainer link, `session/compaction.ts`): token-budget tail
  (`preserve_recent_tokens ?? clamp(0.25*usable, 2k..15k)` + optional
  `tail_turns`) — no message-count knob. His ask: "settings for keepToken
  as fallback from compact_budged.json" + "can we caluculate the actual
  keepToken based on the dump and then supply the correct keepToken to
  exactly keep these messages?" — the budget file already carries
  `keepTokens: 30000` + `keepMessages: 18` (his live edit).
- **Desired outcome:** at dispatch the plugin RESOLVES keepTokens and
  passes `keep.tokens` in the summarize body: (1) primary = COMPUTED
  (token size of the last `keepMessages` messages from the DB — user:
  `tokens.input`, assistant: `tokens.output + tokens.reasoning`;
  dual-shape unwrap per #79 — the DB is the clean source of "the dump"),
  (2) fallback = `keepTokens` from the budget file (30000) when the read
  fails / sum 0, (3) else omit (host config default). Body keeps
  `keep.messages` too (his config comment: non-zero tokens wins). The
  resolution source is logged in the COMPACT line. Tool schema unchanged
  (keepMessages stays the agent-facing knob — it drives the
  computation). context_recovery.ts gets the same resolution.
- **Acceptance:** computed / budget / none paths each smoke-pinned;
  COMPACT line carries the resolved tokens + source; standard gate
  green; LIVE (maintainer fork test post-restart): a self-compact with
  a computed keep.tokens (~27k) → post-compaction ≈ 25k base + 27k ≈
  52k (NOT 55k, NOT 25k) proves the body `keep.tokens` is honored; if
  ignored (result tracks the config) → his fallback ruling (config-level
  knob is his file; the plugin's value stays logged as advisory).
- **Suggested scope:** `.opencode/plugin/compact_memory.ts`,
  `.opencode/plugin/context_recovery.ts`,
  `.opencode/plugin/tests/compact_memory.smoke.mjs`,
  `.opencode/plugin/tests/context_recovery.smoke.mjs`,
  `.opencode/plugin/probes/handover_probe.mjs`,
  `knowledge/opencode-plugins/` (dated note).
- **Status:** IMPLEMENTED (worker-15, 2026-09-25, commit c5859c7 +
  ebf59b2) — plugins + smokes + probe all green (291/291, 74/74, 17/17,
  459+1w, F=0). The LIVE fork test (acceptance item: self-compact with
  computed keep.tokens ~27k → post-compaction ≈ 52k, proving the body
  `keep.tokens` is honored) is PENDING the maintainer's post-restart
  fork test — that part stays OPEN. Design call (planner, veto-able):
  computed PRIMARY, budget `keepTokens` the fallback (his question (b)
  is the fix; the budget 30k stays the safety value when the DB read
  fails). SIDE NOTE (his observation, recorded): the history is
  completely DROPPED and REPLACED by the summary → no bit-rot from a
  compaction chain, only from an N-summarized summary (the budget cap's
  rationale — his review).

## #100. (LANDED 2026-09-26, plan18, worker-18 `worker_Q3S_245K_slow`, commit bc374b2; direct session 2026-09-25; maintainer GO 2026-09-25) remove the numword escape channel — bit-drift solved backend-side, the escape's use-case is gone
- **Problem / evidence:** the escape sentinel (`[<incident>:<safe-form>:esc]` in
  write/edit content → the digits, the `kind=escape` channel) existed to
  protect dense values from model bit-drift. Bit-drift no longer occurs
  (maintainer, direct session 2026-09-25: "the bitdrift problematic is
  solved as of now"). It fulfills no usage right now and makes fuzzy-channel
  development more cumbersome (every write/edit change must respect the
  escape path).
- **Desired outcome:** the escape channel is gone (code + pins) while the
  fuzzy track's positive parts stay fully intact: the pair channel
  (R1/R2 — right-side numwords → digits), the shared numword map
  (`.opencode/agent/scripts/numword/numwords.json`), the dense/numword
  observation logging, the R6/R7/R8 channels. The Unit-2 (#97) noteCache /
  after-hook note delivery STAYS (the R8 redirect notes ride it).
- **Scope (agreed, direct session 2026-09-25):**
  - core: `ESCAPE_RE`, `EscapeHit`, `resolveEscapeSafe`, `resolveEscapes`
    (`intercept_observer_core.ts` ~L445-506)
  - plugin: `runEscapeContent` + the `onToolBefore` wiring + the
    `pre-escape=` journal extension (`appendJournal`'s escapeForms param)
    + the `kind=escape` log lines
  - tests: the escape pins (intercept smoke: ~24 escape grep hits incl.
    13a-13d; probe: ~45 grep hits) — removed; one 13-style note-delivery
    pin repurposed to the R8 redirect note (the note mechanism stays)
  - knowledge: the primer `.opencode/agent/research/fuzzy-numword/primer.md`
    → new `.opencode/agent/knowledge/fuzzy-numword/primer.md` (escape
    section annotated removed 2026-09-25) + the subfolder README (≤20
    lines) in the SAME commit; NOT into AGENTS.md (his ruling)
  - DO-NOT-touch: the pair channel, the map, R1/R2/R6/R7/R8,
    auto_resume / compact_memory / context_recovery / block_transfer
    plugins, FST code, `.opencode/maintainer/**`
- **Acceptance criteria:** standard gate green; zero escape code paths
  (grep-clean for `ESCAPE_RE` / `runEscapeContent` / `kind=escape`); the
  pair/fuzzy pins unchanged; the note mechanism still delivers the R8
  redirect notes (smoke pin); the primer present in knowledge/ with its
  README; `numwords.json` untouched.
- **Interaction:** #95 sub-item (3) R3 is UNAFFECTED (still blocked on his
  GO — a separate unit).
- **Status:** LANDED (2026-09-26, plan18, worker-18
  `worker_Q3S_245K_slow`, commit bc374b2): escape channel removed
  (core + plugin + journal extension + pins); grep-clean; smoke 64/64,
  probe 297/297 (baseline 303 − the 6 S24 pins), pytest 459+1w, ruff F=0;
  the 13-style note pins repurposed to the R8 redirect note (mechanism
  stays covered); primer moved to `knowledge/fuzzy-numword/` (+ README,
  escape section annotated removed); numwords.json untouched.

## #102. (open, 2026-09-26, planner-20; maintainer live report 2026-09-26) R8 redirect extension: map the POSIX `/tmp` (and `/var/tmp`) root into the sandbox — unmappable forms STOP the loop
- **Problem / evidence:** maintainer live report (2026-09-26, autorun session):
  "worker keep trying to access the temp/tmp folder directly and are
  stopping the loop repeatedly." Log evidence: `intercept.log` line 4668
  (2026-09-26_07-55, S2 worker `ses_f23d1afbaffeUSeabbt0aArOdj`) — the
  Windows-Root form (`C:\Users\Wasiejen\AppData\Local\Temp\bt_smoke_out.txt`)
  WAS redirected 1:1 (`kind=redirect ... value=C:/Users/Wasiejen/AppData/
  Local/Temp/opencode/...`) — that case WORKS since #97. The POSIX `/tmp/...`
  form (Git-Bash habit; S1 worker friction entry 2026-09-26: "/tmp under
  Git-Bash resolves outside the sandbox") has NO 1:1 mapping onto an allowed
  root -> R8 fails closed -> the permission gate STOPS the session until the
  maintainer intervenes. Worker prompt bullet added (scratchpad discipline,
  2026-09-26) as the immediate mitigation; this unit is the structural fix.
- **Desired outcome:** POSIX `/tmp/<rest>` (and `/var/tmp/<rest>`) map 1:1
  onto the scratchpad root `C:\Users\Wasiejen\AppData\Local\Temp\opencode/<rest>`
  — redirected + logged (`kind=redirect` line) BEFORE the call runs, for ALL
  tools incl. the bash `command` string; no new out-of-sandbox access is ever
  granted (redirect only, never an allow-widening); unmappable forms still
  fail closed.
- **Acceptance criteria:** a controlled `/tmp/x` write+read (bash + a typed
  tool arg) is redirected, the file lands in the sandbox, and the
  `kind=redirect` line carries orig=/value=; a no-mapping path still fails
  closed; probe pins per the established pattern; standard gate green.
- **Suggested scope:** `.opencode/plugin/intercept_observer_core.ts`
  (the redirect resolver / root mapping), `.opencode/plugin/
  intercept_observer.ts` (allowed-root resolution from opencode.jsonc),
  `.opencode/plugin/probes/handover_probe.mjs`, the intercept smoke.
- **Status:** open — spec written by planner-20 (2026-09-26); QUEUED BEFORE
  bt-v2 S3 per the maintainer's live report (loop stops are the current pain).

## #101. (LANDED 2026-09-26, explorer ses_f24bf71beffekwRYMtnlrWy5UG, commit 1081e52; GO 2026-09-25 direct) opencode host map — one-time explorer task: map the installed host internals so planner/worker LOOK UP instead of re-deriving
- **Problem / evidence:** every task re-pays the derivation cost of opencode host facts (SDK v1/v2 shape, plugin hook surface, session/message/part DB schema, permission system, the compaction/summarize path) — knowledge is gathered per task, not accumulated as a map (maintainer observation 2026-09-25: "we derive the same knowledge often again and again").
- **Desired outcome:** a durable, dated host map in the knowledge base of the relevant installed opencode internals (with file/line locators); upstream (web) research delegated to the explorer (cost in its context, finding → knowledge base); the planner reads installed types for VERIFICATION only.
- **Scope (suggested):** explorer task → new `.opencode/agent/knowledge/opencode-plugins/host-map.md`: SDK surface (v1/v2 endpoints from the installed .d.ts), plugin hook registration + ordering, session/message/part DB schema, permission / external_directory mechanics, the compaction/summarize path, tool registration; every entry dated + locator.
- **Acceptance criteria:** the map covers the areas above with locators verified against the installed build; the knowledge folder/README rules are followed; planner spot-check: one host question answered from the map alone.
- **Status:** DONE (explorer 2026-09-26, ses_f24bf71beffekwRYMtnlrWy5UG) — the map is at `.opencode/agent/knowledge/opencode-plugins/host-map.md` (all 6 areas, dated + located; 6 open/unverified items listed there).