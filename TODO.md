# TODO — maintainer's open items

Numbering: every entry ID is UNIQUE and NEVER REUSED — used so far up to #51, new
entries start at #52 (closed IDs stay reserved in `todo_records.md`).
Closed entries live in `todo_records.md` (one-line records — resolution in file/git log).
Entries follow the AGENTS.md contract (title / evidence / outcome / acceptance / scope / status).

## Maintainer calls (open, in order)

1. ~~v1.3 log-growth confirmation~~ — RESOLVED 2026-09-11 (maintainer approved the
   one-shot read in `approved/2026-09-11_log-profile-rebaseline.md`; executed + recorded
   in the NAP) → #17 CLOSED.
2. **#11 contradiction prevention** — held on the maintainer's LIVE test: the `XXX 241016-1101`
   pin at `fst_keyboard.py` ≈821 is his find-marker — do not touch → #11.
3. **v2.5 nudge target scope — RESOLVED 2026-09-10 (maintainer ruling):** the readout must
   reach EVERY acting session — blind spots unacceptable for an action (the #18
   most-recently-updated-session caveat stays acceptable for reminder text only); read
   mechanic (session id in the readout vs per-session readout) = build worker's call under
   that invariant → #33.
4. ~~**Deferred FST behavior batch**~~ — RESOLVED 2026-09-12 (maintainer ruled in
   `approved/2026-09-11_fst-behavior-batch-decisions.md`: all 5 Recs approved; #6 = KEEP
   `fst_keyboard.py:302-303` until more testing; branch directive: new `fst_work` branch)
   → ALL LANDED on branch `fst_work` (iter-9: unit A `4b93d37` + unit B `2891dab`); the proposal moved to `implemented/` with the verdict.
5. ~~Schedule~~ — RESOLVED 2026-09-12 (iter-14 curation): the #30 de-peek + #33 v2.5 schedule
   is fully landed — #30 CLOSED + #33 LANDED (see their entries); the v1.3 log-profile
   re-baseline tail resolved 2026-09-10 (one-shot read, approved/2026-09-11_log-profile-rebaseline.md).
   No further build scheduled.
6. ~~`handover_task.md` worktree/HEAD conflict~~ — RESOLVED 2026-09-11: maintainer fixed
   the git mess directly (`b6dc3e7` — restored lost updates; the HEAD split-build spec is
   canonical, tree clean) → #49 CLOSED; the split build is the iteration-2 launch.
7. ~~Apply the Looprunner prompt v2 proposal~~ — RESOLVED 2026-09-10: applied + smoke test
   clean → #39 CLOSED (session 4).

## FST behavior decisions (open — maintainer calls unless noted)

## 1. (closed 2026-09-12, iter-9 unit A `4b93d37` on `fst_work`, full text in todo_records.md) — General vk resolution: unknown keys surface as ONE user-visible error at every vk-resolution site (P08 error toast / headless print) via the shared `FST_Keyboard.surface_config_error` helper; both constraint fail-closed guards + `check_for_combination` (+ hot-path resume catch) route through it, dedup + fail-closed preserved; unknown constraint *names* stay silent no-ops by design.
## 7. (closed 2026-09-12, iter-9 unit B `2891dab` on `fst_work`, full text in todo_records.md) — Empty macro: BEHAVIOR WINS — the trigger key IS suppressed for an empty key group (kept); the stale comment reworded to match ("supress" fixed); pinned by the pre-existing `test_empty_macro_sequence_no_playback` (no-playback AND suppression).

## 8. (closed 2026-09-12, iter-9 unit B `2891dab` on `fst_work`, full text in todo_records.md) — `ap`/`ar` "all keys (incl simulated)" = UNION (real OR simulated): both setters write the `all` dict as `is_press or <other side's state>` + the symmetric `vk_code > 0` guard on the real setter; doc comments state the union; 3 new pinning tests (crossing release both directions + vk guard).


## 9. (closed 2026-09-12, iter-9 unit B `2891dab` on `fst_work`, full text in todo_records.md) — Repeat-constraint excepts hardened: `ValueError` added to `toggle_repeat`/`is_repeat_active`/`reset_repeat`/`stop_all_repeat` (+ `stop_repeat` as the fifth consistency site); one pinning test covers all five methods with malformed (1-/3-element) entries.


## 4. (closed 2026-09-12, iter-9 unit B `2891dab` on `fst_work`, full text in todo_records.md) — Dead `elif result is None: pass` branch deleted from `check_constraint_fulfillment` (unreachable — `constraint_evaluation` normalizes None→True); the A→C triage reclassification stays maintainer-side (`COVERAGE_TRIAGE.md` is agent-read-only).


## 6. (closed 2026-09-12 by maintainer ruling — KEEP, full text in todo_records.md) — `fst_keyboard.py` 302-303 (mixed-Key rebind conversion) RULING-KEEP ("keep this until I can test a bit more"): the `###XXX 241022-1341` block stays and is DO-NOT-TOUCH; the triage class correction stays maintainer-side per #4.


## 11. General contradiction prevention disabled (`XXX 241016-1101`, `fst_keyboard.py` ≈821) — HOLDING (2026-09-08)

`###XXX 241016-1101 general contradiction prevention disabled to test` — the ≈821-840
contradiction block of `_win32_event_filter` no longer suppresses (`to_be_suppressed` is
not set), and the Phase-5 tests (`tests/test_filter_simulated.py`) now pin that
non-suppression. Clarify + document as final decision: if it stays off, reword the
XXX/"to test" comment so it reads as an intentional decision; if it was meant to be
reenabled, that is the call.

- **Status:** HOLDING — the maintainer's LIVE test decides (DECISION); the
  `XXX 241016-1101` pin at ≈821 is HIS find-marker — do not remove or reword it on his
  behalf. Content verbatim from the 2026-09-08 record.

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

## 39. (closed 2026-09-10, see todo_records.md) — Looprunner prompt v2 proposal — applied + smoke test clean (2026-09-10)

## 49. `handover_task.md` worktree/HEAD conflict (2026-09-10) (closed 2026-09-11, see todo_records.md)

## Plugin & gauge (open)

## 17. (closed 2026-09-11, see todo_records.md) — v1.3 log-growth CONFIRMATION — one-shot read, deferred by the no-`plugin.log` constraint (2026-09-08)

## 30. (closed 2026-09-11, see todo_records.md) — De-peek: replace the peek.py shell-out with an in-plugin `node:sqlite` read (2026-09-09)

## 37. (closed 2026-09-10, see todo_records.md) — Production plugin host lacks `node:sqlite` — the ctx nudge never lands in production (2026-09-10)

## 33. v2.5 auto-nudge ladder build (folded in: the former TOP-of-file note) — STATUS: APPROVED — NEXT BUILD

- **Problem / evidence:** the chat.message ctx line only covers USER messages — an
  unsupervised agent gets no mid-run context signal and walks blindly into its limit
  (self-peek is the only mid-run signal today). The former top-of-file note (2026-09-10)
  added: at <5k REM the agent is nudged with the VERBATIM self-gauge
  `CTX=… REM=… — stop-line reached` (working past the line is a rule violation — the
  planner decides continuation) → the FINAL 5 k rung of the ladder.
- **Outcome (goal — approved design):** a per-session nudge ladder fired from
  `tool.execute.after` (the plugin is agent-independent — ALL agents, planner + workers),
  rungs **50 % (generic) → 70 % / REM ≤30k → 80 % / ≤20k (wind-down — just before the 85 %
  line) → 90 % / ≤10k (critical — commit + write the NAP NOW)** — condition = pct OR REM,
  whichever first, ≤1 nudge per rung per session — PLUS the final 5 k rung above,
  requesting further approval. Delivered via `client.session.promptAsync(...)` synthetic
  text part (fire-and-forget; queues as the next turn at idle; the TUI never renders it
  as the maintainer's message). Evidence: `kind:"nudge"` log lines — SILENT otherwise
  (the v1.x skip-set log-growth discipline applies). The chat.message ctx line STAYS.
- **Target-scope pre-build call — RESOLVED 2026-09-10 (maintainer ruling):** the readout
  must reach EVERY acting session (blind spot unacceptable for an action — the #18
  most-recently-updated-session caveat stays acceptable for reminder text only); the read
  mechanic (session id carried in the readout vs a per-session read) is the build worker's
  call under that invariant.
- **Full design:** NAP `## v2.4.1 LIVE + v2.5 NUDGE LADDER spec` + `## Live status` blocks
  (09-10); #32 holds the root-cause record. **Discrepancy (2026-09-10, session 4):** those
  NAP blocks are GONE from the live NAP (lost in the session-3 rewrite) — the approved
  design is fully restated in this entry's Outcome block and in the session-4 task spec
  (`.opencode/handover_task.md`); treat THAT as the design of record.
- **Acceptance:** the ladder fires per rung (probe: extend the bun probe — fake client +
  fake shell); one maintainer restart + a forced high-readout scenario shows the first
  nudge land; no NEW gauge-failure reasons (the silent path stays silent);
  `kind:"nudge"` evidence lines only.
- **Status:** LANDED (2026-09-10, T2 #33) — the v2.6 ladder is in
  `handover_v2.4.ts` (per-session read mechanic, rungs 50/70/80/90/5k, dedup per rung,
  `promptAsync` synthetic-part delivery fire-and-forget, `kind:"nudge"` evidence only,
  silent otherwise); probe extended with S8 (checks 46-53) → 52/52 PASS, exit 0; suite
   434/434 + ruff F=0. **2026-09-10 (looprun 2, iteration 1) — PRODUCTION EVIDENCE
   LANDED:** the 50% rung nudge fired in this planner session (readout CTX=64687
   (53%), genuine per-session read; the nudge text reached the session as the next
   message; 70%/80% rungs also observed). The #30/#31/#33 production-evidence tail
   is COMPLETE; only the v1.3 log-profile rebaseline (call 1, default SKIP) remains.
- **Read-mechanic half (built by T1): NOT landed (2026-09-10)** — T1 stopped at the context
  stop-line (#35): the session-gated readout is designed, and its read form + the honest
  unknown-window / notAvailable forms + `SESSION=<sid>` carry landed in the committed shared
  core (`ctxgauge/gauge.mjs`); the PLUGIN wiring (v2.5 match-only post) is NOT landed — the
  live plugin is unchanged (its old shell readout now points at the deleted peek file → a
  restart before v2.5 lands yields kind:gauge no-ctx-output failure lines — no ctx: line for
  agents, never a throw). The ladder
  (T2) remains pending as scheduled — it now also waits on the #30-core plugin wiring.
  - **Discrepancy (2026-09-09, shell-doc lab):** self-peek `node .opencode\ctxgauge\peek.mjs`
    reports the wrong window — `CTX=58271 (582%) REM=-47771` on this 120k-window session
    (window read ≈10.5k; pct/REM both nonsense, negative REM). The plugin's `chat.message`
    ctx line computed the SAME session correctly at the same time (`CTX=24187 (20%) REM=95813`
    ⇒ 120k window). Shared gauge core / peek window read needs a fix before self-peek
    numbers are trusted; the true readout here was ≈`CTX=58271 (~49%) REM≈62k`.

## 38. (closed 2026-09-10, see todo_records.md) — (TEST) explorer smoke test — jill gemmaQ4-256K first launch

## 35. (closed 2026-09-11, see todo_records.md) — T1 de-peek build — LANDED (continuation 2); tail open: v1.3 log-profile re-baseline (call 1) + #34 residual doc refs (2026-09-10)

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

## 52. `compact_memory` fails in the current host build — connection error on both paths (2026-09-12, planner ses_f6b7c5242ffeZpNl0Ar8mILWua)

- **Problem / evidence:** firing the `compact_memory` tool returns
  "Compaction request failed: Unable to connect. Is the computer able to
  access the url?" in the current host build (verified live 2026-09-12).
  Diagnosis in the same session: the only opencode process (`opencode.exe`,
  the npm `opencode-ai` bin) listens on NO TCP port at all
  (`Get-NetTCPConnection` — no listener for that PID); `OPENCODE_PORT` is
  empty, so the HTTP fallback targets `localhost:4096`, where nothing
  listens; the SDK-client path (`context.client.session.compact`) is
  therefore either not wired or points at an unreachable URL in this
  build. 2026-09-12 follow-up (maintainer probe via a modified
  `session_info`): accessing `context.client.app` throws "undefined is not
  an object" — **`context.client` is UNDEFINED in this host build**, so the
  client path is unavailable and the failure came from the HTTP fallback
  (localhost:4096, no listener). The failure did NOT consume the per-session compaction budget
  (no `.opencode/temp/compact_budget.json` was created — the
  increment-on-success design holds).
- **Outcome (goal):** `compact_memory` compacts a live session in the
  current host build, or the tool reports WHICH resolution path failed
  (client vs HTTP + port) so the wiring can be fixed without blind
  guessing.
- **Acceptance:** a live fire in a session → success (COMPACT line in
  `.opencode/temp/ctx.log` + budget increment), or a maintainer decision
  on the supported host configuration.
- **Scope:** `.opencode/tools/compact_memory.ts` (error reporting), the
  host-side client/URL wiring (maintainer domain), the v2 test notes
  (`proposals/maintainer/done/compact_memory_v2test.ts` +
  `compaction_warning.md`). Related: the loop_log-v2 proposal's Part A
  context probe has the same unknown (which context fields the host
  actually wires).
- **Status:** OPEN — maintainer call.

## Closed entries

Moved to `todo_records.md` on 2026-09-10 — one-line records, IDs 2, 5, 10, 12, 13, 14, 15,
16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32 (+ the 260908-0951 dedup block).
All those IDs stay reserved — see the numbering rule in the header.

## 34. (closed 2026-09-10, see todo_records.md) — Stale `peek.py` documentation refs + worker prompt permission block

## 36. (closed 2026-09-09, see todo_records.md) — `agents_repo.md` `Environment & shell` — wrong/stale lines (lab-verified, fixed)

## 42. (closed 2026-09-10, see todo_records.md) — Multi-notch scroll-wheel events (delta ≠ ±120) are untested across all layers; the filter pins wheel phase on single-notch equality (2026-09-10, Audit 3a)

## 43. (closed 2026-09-10, see todo_records.md) — `kb_env` fixture + `build()`/`down()` helpers are copy-pasted (drifted) across 6 test files — no shared conftest location (2026-09-10, Audit 3a)

## 44. (closed 2026-09-10, see todo_records.md) — Stale/unknown focus name → uncaught KeyError in `apply_focus_groups` / `apply_start_args_by_focus_name` (the config is reloaded *before* the lookup) (2026-09-10, Audit 3b)
