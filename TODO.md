# TODO — maintainer's open items

Numbering: every entry ID is UNIQUE and NEVER REUSED — used so far up to #77, new
entries start at #78 (closed IDs stay reserved in `todo_records.md`).
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

## 74. (open, 2026-09-21, planner; flagged by his --info note in priority.md + the 2026-09-19..21 worker feedback entries) — **Write tool fails on long content payloads on this host**: JSON parse errors ("Text: {." / "Expected '}'"), once even on a 3-line file — logged by four worker sessions (2026-09-19 long multi-paragraph args; 2026-09-20 Deep-Dive B run #4; 2026-09-21 run #6 "write failed for every payload"; 2026-09-21 run #7_1 three long-content failures). His --info note pointed at the fuzzy_numword intercept path-resolution — CORRECTED same day by him: the intercept is actually live, and two extra test rounds (his handover-file overwrite runs, direct-message specs writing other files) show the write still failing WITH the intercept deactivated; no opencode changes made; the problem predates the new model set (surfaced in Deep-Dive B run 2 with the old models) — so the intercept is NOT the root cause and this is a host-side issue independent of our models; 2026-09-21 (planner direct session): the SAME signature ("JSON parsing failed: Text: {.") hit a GREP tool call — scope extends beyond write; machine check: both error strings are embedded in the installed `opencode.exe` (v1.18.31: "JSON parsing failed: Text" x8, "Invalid input for tool" x2) → the failing parse is inside the opencode server, upstream of every plugin hook (intercept is log-only and sees already-parsed args); candidate captures: provider-side raw response log (maintainer) + `opencode --log-level DEBUG --print-logs` stderr capture (agent-side, flags verified); HIS HYPOTHESIS (2026-09-21, direct): the truncation began after his llama.cpp update — his bit-drift-countermeasure fork `ik_llama` — and OTHER PEOPLE report the same issue → suspected fork-side (provider) bug; isolation test = direct-to-server long-JSON probe bypassing opencode; SECOND LIVE DATA POINT same session: a webfetch call with SHORT args failed with the identical signature → the signature is "assistant response stream cut mid tool-call JSON", long payload is a risk factor, not the sole cause; fork identified as `ikawrakow/ik_llama.cpp` (issue #380 "Drop at the start of generation" confirms known fork-side streaming bugs); ROOT-CAUSE CANDIDATE (his link 2026-09-21): issue #2492 "Truncated tool calls on qwen3.8-flash-next" (opened 2026-09-20, open) — regression attributed to PR #2470; its raw SSE dump shows the tool-call arguments JSON closed MID-VALUE (finish_reason=tool_calls on an incomplete JSON) = exactly our signature; his timeline caveat: PR ~18h old vs his problem ~48h old → "might be not connected"; BISECTION POINT (this session): 4 live failures pre-reload (grep, webfetch, two writes — incl. the short-arg webfetch — all served under the buggy build); after his unload + fresh reload to the old ik_llama: 2 short writes clean + byte-verified (scratchpad flaky_t1/t2.txt); CONSTRAINT (his): agents never send direct requests to the inference server — single slot unloads the session's model (also logged in knowledge_tools.md single-slot section). POST-RELOAD RESULTS (old ik_llama, same session — natural A/B against the 4 pre-reload failures): 70B write clean, 156B write clean, 10,095B write clean (101 lines, tail-verified — far past the 4k acceptance bar; caveat: repetitive filler content — a non-repetitive variant + cross-model coverage remain). NEXT: optional — one non-repetitive ~10k write + one run on another model, then the entry can move toward close pending the fork's #2470 fix. — **Outcome:** host-side fix (maintainer domain); if not fixed, codify the workaround (create via bash printf/heredoc, then small write/edit append batches — see knowledge_tools.md) in the repo docs so runs don't re-discover it. — **Acceptance:** a ~4k+ char write payload succeeds without parse errors (tested across models), OR the workaround is documented and the next long-file run completes with no write-tool failure. — **Suggested scope:** opencode host (maintainer) + repo docs/prompts (agent-side). — **Status:** open; root cause CONFIRMED per timeline (his 2026-09-21: PR #2470 merged ~4 days ago ≈ his ~48h onset; #2492 = same signature) — old ik_llama in place, workaround stays until the fork patches #2470; his update discipline: never adopt a fresh ik_llama build immediately — let it rest so others find the bugs first.

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

## 17. (closed 2026-09-11, see todo_records.md) — v1.3 log-growth CONFIRMATION — one-shot read, deferred by the no-`plugin.log` constraint (2026-09-08)

## 30. (closed 2026-09-11, see todo_records.md) — De-peek: replace the peek.py shell-out with an in-plugin `node:sqlite` read (2026-09-09)

## 37. (closed 2026-09-10, see todo_records.md) — Production plugin host lacks `node:sqlite` — the ctx nudge never lands in production (2026-09-10)

## 33. (closed 2026-09-12, see todo_records.md) — v2.5 auto-nudge ladder — LANDED (T2: per-session read, rungs 50/70/80/90/5k, dedup per rung, `promptAsync` synthetic-part delivery, `kind:"nudge"` evidence only; probe 52/52) + production evidence complete (50/70/80 % rungs fired in live planner sessions; the per-session read mechanic reached EVERY acting session per the maintainer's target-scope ruling); the v1.3 log-profile tail resolved via the executed one-shot read (#17 CLOSED). The stale 09-10 "NOT landed" note referred to the pre-wiring state; both T1 (de-peek, #35) and T2 (ladder) are landed.

## 38. (closed 2026-09-10, see todo_records.md) — (TEST) explorer smoke test — jill gemmaQ4-256K first launch

## 35. (closed 2026-09-11, see todo_records.md) — T1 de-peek build — LANDED (continuation 2); tail closed: v1.3 log-profile re-baseline executed (one-shot read → #17) + #34 residual doc refs (closed)

## 51. (closed 2026-09-16, plan8; 2026-09-11, T3 worker flag) — Stale probe header vs `.opencode/package.json` "type" field

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
- **Status:** CLOSED (2026-09-16, plan8) — the stale `"type": "module"` field
  removed from `.opencode/package.json` per his ruling; probe header and file now
  agree (the expected `MODULE_TYPELESS_PACKAGE_JSON` warning is the pinned
  post-state, header line ~45); gate green (probe 120+2/120+2 machine-verified
  against the header annotation, pytest 459+1w, ruff F=0, all 7 smokes). Left
  untouched (out of scope for his ruling): the `@opencode-ai/plugin` dep and the
  stale `opencode-context-meter` package name — his call at the next restart if
  opencode says anything.

## 52. (closed 2026-09-13, see todo_records.md) — `compact_memory` fails in the current host build — connection error on both paths (2026-09-12) — LANDED (2026-09-12, worker-2, per the approved v2 proposal) + live acceptance DONE (2026-09-13, iteration 1: compaction part + directive + budget 1/3 + COMPACT line verified in the DB); the resume-overflow finding → `proposals/2026-09-13_compact_memory-findings.md` (Item 1 superseded by the 2026-09-15 protocol; Item 2 ruling bundled in 2026-09-15_backlog-decisions.md, Decision 3).

## 65. (closed 2026-09-17, maintainer-ruled — NOT a tool bug, see todo_records.md for the full entry if needed) — loop_log tool folder-detection bug: spurious folders on the maintainer-renamed loop folder (2026-09-16, plan2)
- **Problem / evidence:** the `loop_log` tool did not recognize the
  maintainer-renamed folder `autorun_2-6_0-9_1-6__1-3_3-3` and created TWO
  spurious date-stamped folders in one iteration (autorun-2026-09-16_16-15
  [looprunner INFO], autorun-2026-09-16_17-20 [worker-13 START+DONE]); the
  planner consolidated the lines into the real loop_log.md and deleted the
  folders by hand (twice).
- **Outcome:** folder detection accepts the current loop folder even when its
  name does not match the date pattern (e.g. latest subfolder of
  `.opencode/loop/` carrying a `loop_log.md`; refuse to create a second
  candidate when one already exists).
- **Acceptance:** a `loop_log` call in a renamed folder appends to THAT
  folder's loop_log.md; no spurious folder on the next looprun; probe/smoke
  green.
- **Scope:** `.opencode/tools/loop_log.ts` (+ its smoke if any). Restart-gated.
- **Status:** CLOSED 2026-09-17 (maintainer-ruled, direct session): the cause
  was the maintainer HIMSELF — he had been testing another date format on the
  autorun folder to reduce bitdrift, which the tool's date-pattern detection
  did not recognize. He re-unified both folders into the old date style and
  changed the minute value to remove the previously observed 3→5 bitdrift. No
  tool change needed; the "spurious folder" events were expected behavior on
  a non-matching folder name.

## 66. 5.3+5.4 restart acceptance (CLOSED 2026-09-16 direct session; verdict LIVE)
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

## 68. Write-scope fuzzy (step 2 of the Q3 roadmap; GATED; 2026-09-16)
- **Problem / evidence:** maintainer ruling (addendum Q3, 2026-09-16): read
  AND write scope, one step after the other — "too useful to degrade to
  observer permanently". Write-scope needs the mutation-channel verdict
  (#66) AND its own approval (write-scope fuzzy on edit/write/delete is a
  data-loss hazard per research §2.3 — the existence-gate + correction-log
  discipline of §4.2 must be specced).
- **Outcome:** spec for write-scope resolution (scope rule, existence gate,
  correction log, fail-closed) → maintainer approval → build.
- **Acceptance:** approved spec + landed build + gate green (per spec).
- **Scope:** research doc §2.3/§3.4/§4.2 as the design source; staged spec
  `research/fuzzy-numword/spec_R2_write_scope.md`.
- **Status:** CLOSED 2026-09-16 — approved ("R2 approved") + build landed
 GREEN (35f8143: probe 206/206 S20, smoke 35/35 8f, pytest 459, ruff
  clean); acceptance met per spec. Deviation accepted: ref gate =
  `for-each-ref` membership (rev-parse 40-hex ambiguity measured,
  decision-record §5). **ONE-SHOT ACCEPTANCE MET 2026-09-17** (direct
  session, post-restart): write-scope LIVE — benign mistype corrected
  (`file-for→file-four d=1 gap=2`) AND the #72 hazard live-measured
  (`file-5→file-4 d=1 gap=3` hijack); display finding: tool results show
  the POST-MUTATION path (log field 5 = sole authority — decision-record
  §5 R2). Residual hazard → #72 (M1 ruling recorded).

## 69. Redundancy form codification: `[left:right]` (SUPERSEDES the `<4|four>` Q2 form; 2026-09-16 direct session)
- **Problem / evidence:** the addendum Q2 form `<4|four>` (angle brackets +
  pipe) was REJECTED by measurement 2026-09-16 (direct session): unquoted
  in Git-Bash, `<...>` = syntax error (exit 2) and `|` = pipe break (exit
 127) — both measured; `[left:right]` survives (exit 0) with one known
  glob edge (single-char cwd file) mitigated by a quote-when-bash rule.
  Full table + reasoning: `research/fuzzy-numword/decision-record.md` §2.4.
  His FB grammar comments (`<8-6-1>` fallback, adder-left `[800+50+11:…]`,
  right-wins, "to be discussed in direct session") were DISCUSSED and
  ruled: single-digit dash form recommended, full map = accepted fallback,
  pair-left ∈ {as-seen | adder | numword}, right = numword, right-wins.
- **Outcome:** codify the convention where it survives compaction of ANY
  agent: (a) AGENTS.md — maintainer PASTE (draft in decision-record §4,
  his action); (b) the observer form switch + read-scope resolution =
  spec_R1 (launch-ready); (c) role-prompt pointer lines (planner-direct or
  planner-as-text-worker, after R1 — worker edit-deny on prompts/).
- **Acceptance:** his AGENTS.md paste landed + R1 green + pointer lines in
  planner/worker/looprunner prompts.
- **Scope:** AGENTS.md (maintainer), spec_R1 build, `prompt_agent_*.md`
  pointer lines.
- **Status:** CLOSED 2026-09-16 — acceptance fully met: AGENTS.md paste
  landed (bf18f14); R1 GREEN (96bb173, probe 193/193); pointer lines in
  planner+worker prompt index (3e0406c). NOTE: ALL FB-file comments are
  acted on and recorded in the decision record (§6.5) — do not re-act the
  `--comment` markers there (they are his input record).

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
- **Status:** OPEN (approved — priority.md #1, top of his active list). unit A landed, commit <hash>.
  **Unit A build in flight (plan5, 2026-09-21, looprun 2026-09-21_15-33):**
  the param rework + config resolution + queued message + DUMP-OK
  diagnostics — spec committed this iteration; follow-on: the auto-compact
  toggle unit, the research spec, live acceptance post-restart.

## 71. Stale probe totals in repo_commands.md (maintainer file — needs his tasking; 2026-09-16)
- **Problem / evidence:** `repo_commands.md` §Run/test still quotes "~376"
  and "one hundred twenty-two (plan7…)" — mutually inconsistent stale
  numbers; the declared source (the probe's self-annotation) is 180/180
  (plan2). Worker-13 flagged; the file is maintainer-maintained (agents do
  not edit the repo parts directly).
- **Outcome:** refresh the section to the curate-don't-duplicate pointer
  (per #64 convention: point at the self-annotation, no moving number).
- **Acceptance:** section reads the pointer; no duplicated total.
- **Scope:** `repo_commands.md` §Run/test (maintainer or an explicitly
  tasked agent).
- **Status:** CLOSED (2026-09-17, planner-direct — maintainer ruled the
  planner is allowed to update this file): §Run/test now carries the
  curate-don't-duplicate pointer (no duplicated moving number at all — the
  probe's self-annotation is the sole source), per the #58/#64 convention.

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

## #73 — R7 realistic doubled case: the segment channel's gap rule fails
## when the target's parent DIR is a corpus entry (measured 09-17)
- **Problem + evidence:** the shipped R7 (ee19a84; gates 216/216 + 37/37
  green) does NOT resolve the realistic nested doubling. Repro
  (scratchpad `r7_realistic_repro.mjs`, still there): repo
  `Projects/OpenCodeProjects/{Free-Snap-Tap/TODO.md, SiblingProj/…}` +
  doubled arg `…/OpenCodeProjects/OpenCodeProjects/Free-Snap-Tap/TODO.md`
  → `fuzzy-rejected` for read AND edit. Root cause: the corpus (built
  from the nearest existing ancestor) contains the target's parent DIR
  entry at seg-d=2; the target sits at seg-d=1 → gap 1 <
  FUZZY_MIN_GAP=2 → `gap-too-small`. S21 pins 210/211 pass only because
  their fixture corpus is FLAT files (second-best at seg-d=3) — the
  pin-fixture design gap is the planner's (spec'd the shapes, not the
  corpus realism).
- **Desired outcome:** the doubled-folder case (the maintainer's most
  observed error) resolves at hook level in a real nested repo.
- **Design (planner 09-17):** a STRUCTURAL pre-check before corpus
  matching in `runFuzzyRead`/`runFuzzyWrite`: if the arg's segments
  contain an adjacent identical pair (case-insensitive), collapse one
  copy; the collapsed path must EXIST (strict gate, no corpus, no gap
  rule) → resolve; else fail-closed and fall through to the existing
  matchers. Verdict reuses `fuzzy-resolved` with a `kind=dedup` evidence
  flag (9-verdict vocabulary untouched; `write` stays M1-excluded).
  S21 gains the REALISTIC nested fixture pin (parent-dir corpus entry +
  sibling project) for read + edit + write-zero-lines.
- **Acceptance:** the 3 repro cases behave per the design (read/edit
  resolved, write zero lines); new S21 realistic pin green; full gate
  green; repro torn down.
- **Suggested scope:** `intercept_observer_core.ts` (the collapse
  helper), `intercept_observer.ts` (pre-check in both fuzzy runners),
  the S21 section.
- **Status:** LANDED + planner-verified (2026-09-17, ses_f510a…, code
  dce82ad, bookkeeping 9c701ed): the `collapseAdjacentDup` existence-gated
  pre-check in `runFuzzyRead`/`runFuzzyWrite` (BEFORE the seg/char matchers)
  resolves the realistic nested doubling with a `kind=dedup` evidence line
  (d=0, no gap); a doubled `write` stays ZERO lines (M1 extends to the dedup).
  Gate: probe two-one-six → two-two-zero (216), smoke 37/37, pytest 459+1w,
  ruff F=0; S21 8 → 12 (re-pins 210/211 + smoke 8g to kind=dedup, 4 new pins
  218 read / 219 edit / 220 collapse-target-absent stays rejected / 21 write
  zero-lines + realistic-nested fixture). Repro torn down. **LIVE ACCEPTED
  (2026-09-17, ses_f4f539d7c… post-restart one-shot, scratchpad fixture, torn
  down):** doubled nested `read` resolved `kind=dedup scope=read d=0` (log
  `orig=` doubled → corrected, file content returned); doubled `edit` resolved
  `kind=dedup scope=write d=0` (applied to the real file). Doubled `write`
  NOT live-proven via the planner's own emission — 5/5 attempts collapsed the
  doubled segment at emission (log-verified `orig=` single each time; the
  single writes landed literal + zero lines, M1 guard held). Hook-level
  doubled-write coverage stands on pins 21/218–220 (same runner as the
  live-proven edit path — the guard is the shared dispatch condition).
  Emission data point: the collapse bias is STRONGEST on write calls
  (read doubled 1st try, edit 3rd, write 5/5 collapsed).

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
- **Status:** CLOSED (2026-09-16, plan8 planner-direct, approved 2026-09-15) —
  the no-circumvent rule is codified in all three role prompts:
  `prompt_agent_task.md` + `prompt_agent_explorer.md` (§Honesty guard) +
  `prompt_agent_planner.md` (§Delegate vs. do) — grep-verifiable
  (`rg -n circumvent .opencode/agent/prompts/agents/` → 5 hits).

## 55. (closed 2026-09-17, live-accepted in direct session ses_f4f539d7c…; maintainer call 2026-09-15) — `compact_memory` needs a dump function of the current session

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
- **Status:** **LIVE ACCEPTED 2026-09-17** (direct session
  `ses_f4f539d7cffeVeRhsFQRdoSRUC`, post-restart — the acceptance was the
  session's own self-compact call): `compaction_dumps/ses_f4f539d7cffeVeRhsFQRdoSRUC_c0.md`
  produced with the FULL pre-compaction content (75 messages / 360 parts,
  mode=full, dumped 19:33:00 — BEFORE the summarize landed; the post-dump
  compaction ran clean, COMPACT line in `.opencode/temp/ctx.log` at 21-33,
  gauge back from 84% to 27%). All acceptance criteria met: dump exists,
  pre-compaction messages intact, no-overwrite `_c0` naming, compaction not
  blocked. BUILD LANDED (plan4, 2026-09-15): the hook is in
  `compact_memory.ts` (`preCompactionDump`, fires before ANY dispatch,
  no-overwrite `compaction_dumps/<sid>_c<count>.md` naming), `dump_session.cjs`
  gained `--out`, probe S14 (101-107) green.
   NOTE 2026-09-16 (worker-10, plan7/iter7): node-resolution fix landed (commit
   9fd7557) — the dump hook spawns via `resolveNodeExe()` (the live host's
   execPath is the CLI binary — the wrong spawn failed every dump with a
   WARNING); live acceptance still pending the host restart.
   History: APPROVED + BUILDABLE (maintainer ruling 2026-09-15, direct session:
  "todo 55 can be done and will be activated before the next autorun"); NOTE
  2026-09-15: the corpus `.opencode/archive/sessions/` was backfilled
  (137 sessions).
   NOTE 2026-09-16 (plan1): his approval comment on this entry handled — the
   approval is recorded in the entry history + `priority.md` (#55 approved
   block); the approved follow-up improvements (count-aware dump,
   provider/model fallback, reworded params) are queued in the NAP.

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
  NOTE 2026-09-16 (plan1): his approval comment on this entry handled — the
  status feedback he requested is in
  `.opencode/maintainer/feedback/2026-09-16_block_transfer_status.md`
  (answers the buffer / sandbox / shared-scriptlet questions).

## 58. (closed 2026-09-16, plan8; 2026-09-15, script-collection worker, curated plan3) — standard gate definition lacks the probe command

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
- **Status:** CLOSED (2026-09-16, plan8) — `repo_commands.md` §Run/test now
  names the probe command and defines **"standard gate" = pytest + ruff +
  probe** (the probe's total is self-annotated in its header — the annotation
  is the source, no duplicated moving number); his temp-path note landed in
  §Environment & shell as verified fact (git-bash `$TMP/opencode` =
  `C:/Users/Wasiejen/AppData/Local/Temp/opencode`, the approved scratchpad).
  His "add to them as need be — curate, don't duplicate" ruling is the standing
  convention for this file. The #63 optional question (do the plugin smokes
  join the standard gate?) was NOT decided unilaterally — it stays open for
  his direct session.

## 59. (closed 2026-09-16, plan6; 2026-09-15, script-collection worker, curated plan3) — session-corpus refresh cadence

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

## 60. (closed 2026-09-16, worker-9, plan7/iter7; 2026-09-15, planner plan5) — `block_transfer` + `loop_log` lack probe pinning

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
- **Status:** CLOSED 2026-09-16 (worker-9, plan7/iter7) — S15 (10 checks) + S16 (6 checks) appended; probe total 106 -> 120+2 all green (header annotation agrees with the reported total), all 7 smokes green, pytest 459+1 warning, ruff F=0; fix commit 75be075.

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

## 76. (closed 2026-09-21, plan1, planner-direct; finding 2026-09-21 worker_Q3S_160K auto-resume UNIT 1 gate run, via todo_inbox.md) — stale classifier pin in `handover_probe.mjs`: check [87] expected `iq3`→1 but the `compact_memory.ts` classifier (the 2026-09-21 quant-class budget ruling) returns 3 → probe pin updated to 3; probe 235/235 green. Pre-existing (the probe references no UNIT 1 file; `compact_memory.ts` untouched).

## 77. (closed 2026-09-21, plan3, planner-direct; finding 2026-09-21 worker-3 UNIT 3 gate run, via todo_inbox.md) — stale description pin in `block_transfer.sandbox.smoke.mjs`: line 53 expected the "Housekeeping rule … instead of write/edit" sentence that the maintainer's commit `ff4c2fc` (2026-09-18) deliberately dropped from the `block_transfer` description → pin re-pointed to the new first sentence (the one-liner); smoke 52/52 ALL PASS. Pre-existing since ff4c2fc (worker-3 verified by stash; the Unit 3 commit touches neither file).

## 75. (open, 2026-09-21, planner) — **Build our own auto-resume plugin** (opencode-auto-resume research, Phase 3 seed):
the looprunner is a mechanical relay; the maintainer wants infinite direct
planner sessions (his ideas.md item 2026-09-18). Three measured gaps: no
auto-resume after compaction, no auto compaction trigger on context limit, no
auto-restart on `action: restart`. A working reference exists and is
vendored in-repo (opencode-auto-resume v1.1.16, v1-era API surface, verified
compatible with our opencode-ai@1.18.31). — **Desired outcome:** a plugin in
`.opencode/plugin/` that keeps a direct planner session running through
compaction and restart without the looprunner. — **Acceptance criteria:** the
four-unit acceptance list in `proposals/2026-09-21_opencode-auto-resume-plugin.md`
(unit 1 = skeleton logging plugin/testbed; unit 2 = context-limit compaction
trigger; unit 3 = auto-resume after compaction; unit 4 = restart detection +
new planner; each unit leaves the repo green). — **Suggested scope:**
`.opencode/plugin/auto_resume.ts` (new), `knowledge/opencode-plugins/`
(surface report append), the proposal file itself. — Units are independently
approvable, strict build order, unit 1 launchable on approval. **Status 2026-09-21:** Unit 1
LANDED + planner-verified (worker d322927, gate green: smoke 14/14, probe
235/235, pytest 459+1w, ruff F=0); LIVE ACCEPTANCE PASSED same day (post-restart:
the init `surface=` line + 12,629 live event lines in
`.opencode/temp/auto_resume.log`; verdict in the unit-1 surface report).
Unit 2 LANDED + planner-verified (2026-09-21, plan2, worker
`worker_Q3S_160K` ses_f3b8c19e9ffe2IoV4S9lrx0vSi, code `d90973b`): the
context-limit compaction trigger — queued `promptAsync` self-compact
instruction (`compact_memory` SELF path) at ratio >= 0.85 of the usable
window, once per busy cycle, one 5s tick as the sole gated send funnel
(smoke 32/32 all 7 DoD cases pinned; gate re-verified by the planner:
probe 235/235, pytest 459+1w, ruff F=0). Three spec-vs-reality
discrepancies resolved defensively (SDK `provider.list()` not `get()`;
model pair top-level on the message, not `info.model`; smoke live-log
invariant) — facts cured into the unit-1 surface report §UNIT 2 supplement.
LIVE ACCEPTANCE for Unit 2: the shape bug was FOUND in live acceptance
(the live `session.status` carries `status` as OBJECT `{type}` while
`armEvent` compared strings → zero `arm=`/`saturation=`/`trigger=` lines
in the whole log) and FIXED this commit (`statusOf()` normalization +
dual-shape smoke pin; verdict in the unit-1 surface report
§LIVE ACCEPTANCE supplement). Live re-acceptance PENDING the next host
restart (a live session crossing 85 % must self-compact once per busy
cycle, no re-prefill stall — verified from
`arm=`/`saturation=`/`trigger=` log lines). Unit 3 LANDED + smoke-verified
(2026-09-21, plan3, worker
`worker_Q3S_160K` ses_f3b555033ffem2gI9qBct1JZwG, the single UNIT 3 commit
on `opencode_test` — see the committed handover summary): the new-planner
spawn helper — the 5s tick (the only decision+send funnel; events stay
ARM-only) checks the one-shot trigger file
`.opencode/temp/auto_resume_spawn_trigger` (same dir as the log); a
present non-empty trigger spawns ONCE (in-flight latch — no double-fire),
then the file is renamed `.consumed` EVEN ON FAILURE (re-trigger = write
a new file); the spawn = `create()` (no args) + ONE QUEUED `promptAsync`
with `agent: "planner_Q3S_160K"` and NO model field (the agent-configured
model applies — the host's opencode.jsonc is the live source of truth,
re-verified at build time: no drift); success → the new sid self-marked
in a module-level `spawned` map (sid → epoch, for Unit 4) + `spawn=`
line; every failure → `spawn-fail=` line, the helper never throws
outward; `create` added to the init surface candidates (the live typeof
verdict is pending for the surface-report supplement). Smoke 39/39 (32
existing + 7 new UNIT 3 checks; surface pin updated to carry create);
gate: probe 235/235 UNCHANGED, pytest 459+1w, ruff F=0 (one pre-existing
red smoke OUT OF SCOPE: block_transfer.sandbox stale description pin —
todo_inbox entry 2026-09-21). LIVE ACCEPTANCE for Unit 3 PASSED (planner-run 2026-09-21 17:00Z: the
one-shot trigger file → `spawn= sid=ses_f3b16aa46ffe07iI4CSrScxeWK
agent=planner_Q3S_160K` (log line 163103) + `.consumed` rename + the
spawned session wrote
`.opencode/temp/auto_resume_unit3_live_acceptance.txt`; verdict in the
unit-1 surface report §LIVE ACCEPTANCE supplement). Unit 4 LANDED +
smoke-verified (2026-09-21, plan4, worker-5 `worker_Q3S_160K`
ses_f3af705fdffeRiYr9H7FflN0o7): the planner liveness watchdog — a
planner-scoped session (Unit 3 `spawned` self-mark OR a `<|autonom|>`
launch marker in a user message; cached `scope: planner|none|unknown`)
going idle / `session.error` is routed on the next tick by the LAST
assistant message's `action:` line (last match wins): `stop` /
`ask_maintainer` → left alone (`route= stop|ask`); `resume` / no line →
queued CONTINUE prompt (recovery cap 2 per idle cycle, reset on a fresh
busy, `recovery= attempt=N`); `restart` / cap exhausted with still no
line → successor check (`session.created` tracked since
lastActivityAt → `skip= successor`) else `spawnPlanner` (RESTART
prompt, `route= restart spawn`); one `err=` line per failed cycle per
sid; the tick never rejects. `messages` added to the init surface
candidates (live typeof verdict pending the next restart). Smoke
53/53 (40 existing + 13 new UNIT 4 checks); gate: probe 235/235,
pytest 459+1w, ruff F=0; full smoke suite green (10/10). LIVE
ACCEPTANCE PENDING the next host restart (the four acceptance cases in
the proposal lines 138-142). NOTE: unit numbering
per the revised proposal — Unit 3 = new-planner spawn helper (shared
building block), Unit 4 = planner liveness watchdog (auto-resume after
compaction is its first branch); the "unit 3 = auto-resume / unit 4 =
restart detection" wording above is the pre-revision numbering.
