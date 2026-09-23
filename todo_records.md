# TODO records — closed entries

One-line records; resolution lives in the file / git log. Moved out of `TODO.md` on
2026-09-10 (planner curation per maintainer call — removes ~6 k chars of closed history
from the live file).

**Numbering rule:** every ID used here is RESERVED and never reused — new entries in
`TODO.md` continue from the last used ID (currently #59, next = #60).

## 2. Fix the 6 ruff `F` findings — CLOSED (worker, `cdbbdcd`, 2026-09-10) — all six F sites removed (incl. the cascaded dead `cube_distance`); ruff F 6→0; pytest 434→434, 13 warnings same profile.
## 5. Lint baseline 6 → 8 at `ca61a26` — CLOSED (`0025a57`, 2026-09-08) — the three unused `SimpleNamespace` imports removed — the 6-finding baseline restored (later → 0 via #2).
## 10. deprecated `QMouseEvent.globalPos()` — CLOSED (inline fix `ea3d920`) — 3× `globalPos()` → `globalPosition().toPoint()`; pytest 434/434; warnings 13→1 (verified 2026-09-10 by grep: no `globalPos(` call left in the code).
## 12. v1.1 task spec "exactly 5 lines" off-by-one — CLOSED (planner record, 2026-09-08) — the off-by-one was on the spec side (the filter deterministically yields 4); the reusable invariant = "one line per unskipped payload" — used by the v2 tasks.
## 13. `handover.ts` header self-labelled "v1" — CLOSED (planner, 2026-09-09) — the v2/v2.2 header rewrite replaced the v1 label; the v2.2.2 + v1.3 header notes landed in the same file.
## 14. transform hook exposes no agent identifier — CLOSED (superseded, 2026-09-08) — the open "choose a planner-only signal" call is moot: the maintainer's 'both' decision (#18) formally overrode "never inject for all" (v2.2 removed the gate); v2.4 targets the just-received last message (ALL agents) — no planner-only signal is needed any more.
## 15. AGENTS.md plan-state routine vs "workers never touch handover_planner.md" — CLOSED (maintainer call → #26, 2026-09-08) — workers never edit or commit the plan-state file (prompt clause + `permission.edit` deny); the pre-commit routine applies to the planner's own commit only.
## 16. v1.2 byte-budget arithmetic (190 vs 150, "< 4 KB" infeasible) — CLOSED (planner, 2026-09-08) — budget target = cascade window 0 B (met); the mixed-window total was spec arithmetic, not a code target; the event count settled by cycle measurement.
## 18. ctxgauge 'both' decision — inject ALL sessions (v2.2 gate removed) — CLOSED (maintainer decision, 2026-09-08) — the formal override of the planner-only design; the companion worker stop-line rule landed 2026-09-09 (#29 item 3); the accepted caveat (gauge = most-recently-updated session only) carries on in #17/#30/#31/#32/#33.
## 19. stale inline comment above `onSystemTransform` — CLOSED (#20, 2026-09-08) — comment rewired per the v2.2 'both' decision (comment-only edit, probe 23/23 both sides).
## 20. persistent offline probe + exact executable pinned — CLOSED (2026-09-08) — the probe is permanent at `.opencode/plugin/probes/handover_probe.mjs` (run it, never rebuild — exception: a hook-surface change); the exe pin was superseded 2026-09-09 by system `node` (the electron host is gone — #29).
## 21. `ctxgauge/peek.py` fresh-session TypeError crash — CLOSED (code side #24, 2026-09-08) — the `None`-row guard + explicit model-id parse; the v2-schema-migration note rides into #30 (write against the CURRENT schema).
## 22. worker-proof task spec pointed at `.opencode/plugin/log` — CLOSED (2026-09-08) — doc-only mismatch measured against the real path (`.opencode/plugin.log`); the task file is per-cycle and already superseded.
## 23. worker prompt carried NO `ctx:` line — CLOSED (planner, 2026-09-09, `kind:"gauge"` evidence) — not a transform-scope issue: the gauge READOUT was failing (23× `shell-missing` + 47× `no-ctx-output` — the v2 call shape rejected by the live BunShell); the root cause (the call shape) fixed in v2.2.2 (#29); the 09-10 cache-discipline correction (#31) superseded the "session-start-only" reading.
## 24. `peek.py` crash fix + model-id parse (code side of #21) — CLOSED (planner direct fix, 2026-09-08) — fallback to the latest FINISHED message overall + `CTX=0 (0%) REM=<window>` guard; model id from `session.model`'s JSON `id` field.
## 25. `opencode.jsonc` planner edit-permission pattern still `/tmp/**` — CLOSED (#26, `6523406`, 2026-09-08) — the old planner permission block replaced wholesale (Windows temp path).
## 26. workers denied on `handover_planner.md` + prompt clause — CLOSED (maintainer call, 2026-09-08, `6523406`) — `permission.edit` deny on all three worker scopes + the prompt clause; closed #15 + #25 with it.
## 27. v2.2.1 gauge-failure evidence log — CLOSED (planner, 2026-09-09) — the evidence log landed (4-reason vocabulary + `preview`, probe 28/28); the follow-up single opencode start named the branch (`no-ctx-output` + tagged-template preview) → #23/#29.
## 28. `GAUGE_CMD` constant declared but unused — CLOSED (already removed in the `b8ea40b` cycle, 2026-09-09) — verified against the live file (no such constant; probe 28/28) — the entry had been left open by oversight.
## 29. Electron → terminal/CLI + system Node; BunShell `input.$` gauge host — CLOSED (planner, 2026-09-09 — proof start performed) — worker + planner prompts carry `ctx:` (43423/36 % + 13837/12 %) with NO plugin.log read; the v1.3-profile measurement is deferred by the no-log constraint → #17; the fire-scope reading was corrected 09-10 (EVERY LLM build — #31).
## 31. v2.4 per-message injection via `chat.message` (cache-safe append to the last message only) — CLOSED (design + root-cause record, 2026-09-10) — root cause: `experimental.chat.system.transform` fires on EVERY LLM build = prompt-cache invalidation (the 09-09 "session-start-only" reading was a misread); v2.4 = append-only ctx TextPart onto the just-received last message — full record: NAP 09-10 correction + v2.4 blocks; the live fix continued as #32 (v2.4.1).
## 38. (TEST) explorer smoke test — jill gemmaQ4-256K first launch — CLOSED (planner verified, 2026-09-10, `452de1a`) — smoke test PASSED (spec read, one marked entry appended, TODO.md-only commit, fast stop ~45 s); CAVEAT: its final self-gauge line was FABRICATED (no session step carries that ctx; numbers internally inconsistent — format mimicry without running the command) — check explorer output numbers.
## 32. v2.4 part-schema SchemaError = v2.4.1 + v2.5 nudge ladder spec — CLOSED (maintainer restart live-clean, 2026-09-10) — the root cause + design record: the LIVE `chat.message` input carries only `{sessionID, agent, model}` (no `messageID` — proven from the plugin's OWN scoped evidence reads); the v2.5 nudge ladder spec → #33; the target-scope pre-build call lives at section item 3 (NOT dropped).
## 260908-0951 (NAP-copied dedup block) — DEDUP (2026-09-08) — item 1 (116–117 unreachable) → #4; item 2 (lint 6→8 at `ca61a26`) → #5; item 3 (C-class lines covered as by-products — expected state confirmed) → record only (no open work); item 4 (302–303 unreachable + 707 empty-macro contradiction) → #6 + #7.
## 47. Docs: §3 undocumented features - CLOSED (looprun 2, iteration 4, docs commit after c4ad33c) - all §3 docs landed (b40a1a7 + 73c0097) + the two residual WIKI lines (shared text/integer variable name-space; horizontal scroll press=right/release=left) applied from the settled planner-verified answers; gate 436 passed / ruff F=0.
## 17. v1.3 log-growth confirmation — CLOSED (planner, 2026-09-11, approved one-shot read) — post-base segment (base 1269, new base 2474) of `.opencode/plugin.log`: the three silenced types (`file.watcher.updated`/`file.edited`/`session.idle`) = 0 (expected ≈79 % event-line cut verified in kind — they were the growth driver); residual event lines are low-frequency lifecycle only (54 of 1205 lines: message.removed 25, session.created 13, session.error 12, session.compacted 1, todo.updated 1, permission.asked/replied 1+1); new log base 2474 recorded in the NAP.
## 30. De-peek — CLOSED (planner, 2026-09-11) — the node:sqlite build completed 2026-09-10 (core + v2.5 wiring + probe, token semantics verified); the open tails resolved this cycle: v1.3 log-profile rebaseline done (the #17 one-shot read) + #34 residual doc refs gone (live prompts + repo parts grep-clean; the AGENTS.md copy in `proposals/files/` is archived; `playground/` excluded as maintainer-personal per the date-sweep scope rule).
## 35. T1 de-peek build — CLOSED (planner, 2026-09-11) — build scope complete since 2026-09-10 (continuation 2); the remaining tail (v1.3 rebaseline + #34 doc refs) resolved this cycle — see the #17 + #30 records.

## 47. Docs: §3 undocumented features (variable system, invocations, extra start args, numpad debug combos) (2026-09-10, from the #3 residual) (closed 2026-09-10, full text moved from TODO.md)

- **Problem / evidence:** the #3 rework closed the §2+§4 gap items; the §3 scope
  (SPEC_FEATURES.md §3) remains undocumented: the variable system, typing/toast/mouse/
  clipboard/file invocations, extra start args, numpad debug combos.
- **Outcome (goal):** README/WIKI document the §3 features at the same quality bar as
  the §2/§4 rework (every claim code-verified before rewording, per the #3 method).
- **Acceptance:** all §3 features documented in README/WIKI; docs-only diff; suite
  unaffected (434+ passing, ruff F=0).
- **Scope (non-exhaustive):** `README.md`, `WIKI.md`, `SPEC_FEATURES.md` (decisions
  source); `fst_manager.py` / `fst_keyboard.py` / `free_snap_tap.py` (read-only
  verification).
- **Status:** OPEN — APPROVED (maintainer 260910-1252); docs-only, not a maintainer
  call. Delegation-ready — scheduled for looprun 2 iteration 2 (the iteration-1
  approved-fix batch takes the delegation lane first).
- **Status tail:** PARTIAL (2026-09-10) — WIKI [Configuration] chunk landed (multi-focus
   names + multiline `:` continuation, both code-verified); all §3 features were
   code-verified before the session hit the context stop line — the remaining docs
   (invocations sections, extra start args, numpad combos, vk-0 key strings, README list)
   are NOT yet written. Full per-feature verification notes (ready to write from) are in
   `.opencode/handover_task_to_planner.md`; re-run the gate on the final chunk.
- **Status tail:** LANDED (2026-09-10, resume run) — all remaining §3 docs written from
   the verified notes: WIKI new invocation sections ([Function results in general],
   [Variable system], [Typing], [Toasts], [Mouse control], [Mouse keys], [Clipboard],
   [File operations], [Misc]), WIKI [Numpad debug combos] (ALT+NUM1..NUM8, NUM6
   unassigned), WIKI [None/empty '' key event] extended to the vk-0 strings
   `none`/`NONE`/`_`/`reset`/`delay`, WIKI [Start Arguments] extended (-delay,
   -exec_one_macro, -debug_numpad, -always_active, -tray_icon, -hide_cmd_window,
   -save_dir=, -backup_root_dir=, deprecated -focusapp= + argument order note), README
   feature list item 14 [Extra Start Arguments]. The four confirmed-behavior flags are
   documented as-is (headless toast crash, ignored `immediately` param, unassigned
   ALT+NUM6, `check()` non-int/non-list value passing). Gate: `pytest -q` = 436 passed,
    1 known warning; `ruff check --select F .` = 0 findings; docs-only diff.
 - **Planner-verified (looprun 2, iteration 2, `73c0097`):** gate re-run green (436 / ruff
    0); `git diff` scope = README/WIKI/TODO/summary only. Core §3 goal MET. RESIDUAL
    (trivial, both answers code-verified in the NAP — no re-check needed): add to the WIKI
    (a) that text vars (`set_var`/`get_var`) and integer vars share the SAME
     `Output_Manager.variables` dict (`fst_manager.py:71`), and (b) horizontal scroll sends
     press = one notch RIGHT / release = one notch LEFT (`fst_manager.py:705-706`).
  - **CLOSED (looprun 2, iteration 4):** both residuals applied to the WIKI from the
    settled answers (no re-check): shared text/integer name-space line under
    [Variable system] + the horizontal scroll direction line under [Mouse keys].
    Gate: `pytest -q` = 436 passed, 1 known warning; `ruff check --select F .` = 0.
    Entry closed — one-line record stays in `todo_records.md`.

## 45. Doc errors found adjacent to the #3 rework: WIKI invocation "evaluate to False" claim, WIKI `+a, +b` rebind notation, README "he first" (2026-09-10) (closed 2026-09-10, full text moved from TODO.md)

One-line record: fixed in the adjacent commit of the #3 docs rework — WIKI [Suffixes] function-invocation description corrected (invocations always evaluate to True and the suffixed key_event is still played — all invocations return True in `constraint_evaluation`, cf. WIKI's own "ALL INVOCATIONS will always result in True"); WIKI [Rebinds] example `+a, +b` → `+a : +b` (the 2nd of the two Key:Key rebinds, `fst_keyboard.py` Key-pair expansion); README config comment "before he first <focus>" → "before the first <focus>".

## 39. Looprunner prompt v2 proposal — applied + smoke test clean (2026-09-10) (closed 2026-09-10, full text moved from TODO.md)

- **Problem / evidence:** the current `.opencode/prompt_looprunner.md` (27 lines) is
  ambiguous in four places: no closing-action protocol (the loop always restarts until
  the runner hits 85 %), the maintainer-message routing rule ("Ignore the messages you
  get from the user/maintainer") is imprecise, "create a summary" is due exactly at the
  point where writing headroom is gone, and the embedded planner task text carries
  typos — one functional: it names a NON-EXISTENT explorer agent
  (`worker_explorer_jill_gemmaQ4_256K`; the real key is
  `worker_explorer_jill_gemma_256K_mtp`).
- **Outcome (goal):** the looprunner prompt coordinates the loop as a small explicit
  state machine (restart / ask_maintainer / stop) with a verbatim console log and a
  mechanical suggestion-capture channel.
- **Acceptance:** the maintainer applied the consolidated proposal
  `.opencode/looprunner_prompt_proposal_planner.md` (full replacement prompt text + the
  scoped `opencode.jsonc` permission change for `looprunner_Q4_120k`: edit allow for
  `.opencode/prompt_looprunner.md` + `.opencode/loop_log.md` only) and one smoke-test
  cycle (launch → closing message → action line → restart) runs clean.
- **Scope (non-exhaustive):** `.opencode/prompt_looprunner.md`, `opencode.jsonc`
  (both maintainer-owned — the agents must not edit them).
- **Status:** OPEN — MAINTAINER CALL (section above, item 6). Planner-authored
  consolidated proposal (2026-09-10, autonomous session 2) — point-by-point verdicts on
  the looprunner's 8-point proposal and the gemini proposal live in the proposal doc.
  NOT adopted: `loop_state.json`, default `action: resume`, CLI launch.
- **2026-09-10 (session 3) — APPLIED:** the maintainer applied the proposal — the live
  `prompt_looprunner.md` now carries the v2 text (closing action protocol, `@loop`/
  `@looprunner` routing, 80 %/85 % loop hygiene, verbatim suggestions divider, the
  explorer agent name typo FIXED, plus two maintainer additions: "check first if there
  is unfinished work from an interrupted session" and "explorer = fallback when no
  actionable items are left"); `opencode.jsonc` has the scoped edit-allow (prompt +
  loop_log).
- **2026-09-10 (autonomous session 4 — CLOSED, planner-verified):** the smoke-test
  cycle ran clean — session 3 closed with an `action: restart` line and the loop
  restarted this session with the maintainer messages routed verbatim into the
  prompt (routing + action protocol + NAP-edit permission all working). Acceptance
  met → CLOSED.

## 37. Production plugin host lacks `node:sqlite` — the ctx nudge never lands in production (2026-09-10) (closed 2026-09-10, full text moved from TODO.md)

- **Problem / evidence:** the v2.5 match-only post (`313e83b`) is live after the maintainer
  restart (planner session `ses_f773b9c5…`): the `chat.message` hook FIRES for the planner's
  own session (scoped live read of `.opencode/plugin.log`, prompted by the maintainer's
  "test the nudge mechanism" task — chatmsg line, `midSrc=input`), but the gauge read fails
  on every fire: `kind:"gauge" reason:db-error preview:"sqlite-module ResolveMessage: No such
  built-in module: node:sqlite"` (Bun error format = the bun-based opencode.exe host).
  Consequence: NO `ctx:` line reaches ANY agent in production; the never-throw guard + the
  per-fire evidence line work exactly as designed (no post, no crash, silence otherwise).
  The worker's "bun 1.4.2 host-proxy check: PASS" (#30 status line) tested the SYSTEM bun —
  which DOES expose node:sqlite — NOT the bun baked into opencode.exe: the proxy check
  measured the wrong host and gave false confidence.
- **Outcome (goal):** the gauge read succeeds under the PRODUCTION opencode.exe host, so the
  injected ctx line (and the T2 nudge ladder, which depends on the read — #33) can actually
  fire; one implementation, never-throw preserved.
- **Acceptance:** after a maintainer restart, a `ctx: SESSION=<own sid> CTX=…` line reaches
  the planner's own session (chatmsg fire with NO db-error line); probe 33/33 (extend it if
  the core gains a second backend); no NEW gauge-failure reasons.
- **Scope (non-exhaustive):** `.opencode/ctxgauge/gauge.mjs` backend selection (options the
  host facts support: try `node:sqlite` → fall back to `bun:sqlite`, OR spawn the
  maintainer-placed `.opencode/plugin/tools/sqlite3.exe` — proven live by the retired v1.x
  backend); the plugin itself stays unchanged or minimal; probe S4/S6 fixtures if the read
  mechanic changes.
- **Status:** OPEN — maintainer call (which backend path for the bun host; the read must
  work before T2 #33 can fire). The on-disk `sqlite3.exe` (#30 flag-only, do not delete) is
  a ready-made fallback option. Next-session resume order: 1) #37 maintainer call + fix,
  2) launch `worker_explorer_jill_gemmaQ4_256K` (standing goal; CHECK its findings — fast
  but dumb; its edits are allow-listed to TODO.md/handover_task.md/scratchpad), 3) T2 #33
  (blocked on #37), 4) #34 residual doc refs. Note: the NAP could NOT be updated this
  session — `planner_Q4_120K`'s opencode.jsonc permission block denies
  `.opencode/handover_planner.md` (copy-paste from the worker profiles; the older
  `planner_Q3_120k_mtp` block does not have it) — flagged to the maintainer.
- **2026-09-10 (autonomous session 1 — build LANDED):** the backend fallback chain is
  implemented in the shared core (`node:sqlite` → `bun:sqlite` → spawn `sqlite3.exe`,
  per-process cache, readout forms byte-identical, never-throw preserved; NO plugin
  change needed) + probe extended to 45/45 (S7 forces each backend; the REAL
  sqlite3.exe end-to-end on fixtures) + host proofs: system node peek green, system
  bun 1.4.2 proxy green (all three backends on the live WAL db; bun:sqlite API
  verified as `{readonly:true,timeout:N}` — NOT the spec sketch's `readWrite` — and
  `get()`→`null` no-row). Suite 434/434 + ruff F=0. The worker (Q4_120K) built it and
  was killed by the planner's 40-min CLI timeout at the final renumber step; the
  planner finished (check-ID fix + final verifications). PRODUCTION EVIDENCE PENDING
  maintainer restart (a `ctx: SESSION=<own sid>` line must reach the planner session
  with NO db-error line). NOT closed.
- **2026-09-10 (autonomous session 3 — production evidence in → CLOSED):** after the
  maintainer restart, the line `ctx: SESSION=ses_f76b0f74affeKJEu0HdQerFNHv CTX=notAvailable`
  reached the planner's own session with the first user message — NO db-error line (the
  bun-host backend chain `node:sqlite` → `bun:sqlite` → spawn `sqlite3.exe` works in
  production; `notAvailable` = correct readout for a session without a finished step yet,
  cross-checked: the same session's later self-gauge read `CTX=27215 (22%)` cleanly).
  Acceptance met → CLOSED (planner, session 3). Tail note: the v1.3 log-profile
  rebaseline remains #30 / maintainer call 1 (default SKIP — not done autonomously).

## 38. (TEST) explorer smoke test — jill gemmaQ4-256K first launch (closed 2026-09-10, full text moved from TODO.md)

CLOSED (planner verified, 2026-09-10): smoke test PASSED — the explorer read the spec,
appended this entry, committed ONLY `TODO.md` (`452de1a`), stopped fast (~45 s session).
CAVEAT recorded: its final self-gauge line `CTX=14329 (11%) REM=241058` is FABRICATED —
no finished step of its session carries that ctx, and the numbers are internally
inconsistent for any window (14329/256k would be 5 % / REM 241671): it pattern-matched
the required final-line format without running the command. Fast-but-dumb signal for
the maintainer (check explorer work; the number itself is unverifiable).

## 34. Stale `peek.py` documentation refs + worker prompt permission block (closed 2026-09-10, full text moved from TODO.md)

CLOSED — all agent-facing docs now self-peek via `node .opencode\ctxgauge\peek.mjs`
(readout `SESSION=… CTX=… (…) REM=…`): prompt files (`a235886`, planner execution — the
worker was blocked by the `.opencode/prompt_**` deny) + `agents_repo.md` gauge line
(~164) and module-map line (~122) (explicit maintainer instruction, 2026-09-10).
Residual refs (frozen `deactivated/handover.ts` copy, `playground/outline_rework_prompts.md`
draft, historical files/records) = LEFT AS HISTORICAL. **2026-09-10 (260910, maintainer):**
"#34 is stale and closed? why ask for decision?" — the residual refs stay historical, NO
call needed (the NAP call bundle drops the #34 residual).

## 36. `agents_repo.md` `Environment & shell` — wrong/stale lines (lab-verified, fixed) (closed 2026-09-09, full text moved from TODO.md)

One-line record: the section (previously 48 lines) was validated in fresh-worker
first-shot batteries (T1–T10, pwsh + git-bash) and compacted 48→24 lines; round 2
ended 10/10 first-shot. Corrected/verified facts now in the section: `ConvertTo-Path`
does NOT exist in pwsh 7.6 (the old text suggested it — guaranteed first-shot failure);
`$env:NO_COLOR='1'` does NOT suppress ANSI codes in table output; env var `FST` value
carries a trailing `\`; bare `python` on PATH = 3.14.3 without repo deps (fake-starts,
then import-fails — always venv exe); scalar listing recipe needs `-File`; `pwd -W`
prints forward slashes. Status: closed — section committed as tested.

## 43. `kb_env` fixture + `build()`/`down()` helpers are copy-pasted (drifted) across 6 test files — no shared conftest location (2026-09-10, Audit 3a) (closed 2026-09-10, full text moved from TODO.md)

- **Problem / evidence:** the identical FST-Keyboard-env fixture concept
  (`FST_Keyboard()`, mocked pynput controllers, `TIME_DIFF/START_TIME` reset,
  `_listener` mocks, TIME restoration teardown) exists SIX TIMES in THREE
  drifted shape-classes: (A) yields `SimpleNamespace(kb, kb_mock, mouse_mock)`
  + pre-sets `WIN32_FILTER_PAUSED/ACT_DELAY/ACT_CROSSOVER` (NO
  `_mouse_listener` mock): `test_filter_behavior.py:27-41`,
  `test_extraction_filter_edges.py:26-40`; (B) yields the raw `keyboard`,
  pre-sets the arg flags AND `_mouse_listener`: `test_filter_simulated.py:23-38`;
  (C) yields the raw `keyboard`, `_mouse_listener` mocked, NO arg flags:
  `test_control_actions.py:17-29`, `test_macro_playback_kbd.py:18-30`,
  `test_facade_wiring.py:15-27`. Shape (C) fixtures silently differ from (A): a
  `WIN32_FILTER_PAUSED=True` filter would behave differently per file — a
  fixture bug fix has to be applied 6× and per-variant. The
  config-build helper `build(kb, rebinds=None, macros=None, taps=None, aliases=None)`
  (setting `config_manager._*_hr` + `initialize_groups_from_presorted_lines()`)
  is triplicated at `test_filter_behavior.py:44-50`, `test_extraction_filter_edges.py:43-50`,
  `test_filter_simulated.py:41-…`; `down()`/`up()` filter-event shorthands
  duplicated at `test_filter_behavior.py:59-64` and `test_extraction_filter_edges.py:52-54`;
  `hold_keys`/`mock_control_handlers` at `test_filter_behavior.py:290-297`. The
  variants already DRIFT (SimpleNamespace vs. raw-yield fixtures; `_mouse_listener`
  set in some copies, not others) — a behavioral test in the drifted variants is
  invisible from the others, and a fixture bug fix has to be applied 6×.
- **Outcome (goal):** ONE shared location for the `kb_env`-class fixtures and the
  `build`/`down`/`up`/`hold_keys`/`mock_control_handlers` helpers (e.g. a
  `tests/conftest.py` fixture + tiny helper importable or duplicated in ONE file);
  no test file defines its own copy of these any more.
- **Acceptance:** the six files import/use the shared fixture (no local
  `def kb_env` in any of them); `pytest -q` count unchanged at 434; behavior of
  each file's existing tests byte-identical to before the move (they pass as
  before).
- **Scope (non-exhaustive):** `tests/conftest.py`, the six files above.
- **Status:** CLOSED (2026-09-10) — maintainer general ruling 260910: "everything
   pertaining testing is your job and as long as it does not change program behavior
   no maintainer involvement needed" — the consolidation LANDED + verified (status
   tail); the documented-preference call resolved in favor of the consolidation.
   One-line record: shared fixtures in `tests/conftest.py` + helpers in
   `tests/kb_helpers.py` (`1fd669c`).
- **Status tail:** LANDED (2026-09-10) — the three drifted shape-classes moved
  VERBATIM into `tests/conftest.py` as `kb_env_ns` (shape A, SimpleNamespace
  yield + arg flags pre-set) / `kb_env_mouse` (shape B, raw yield +
  `_mouse_listener` + arg flags) / `kb_env_plain` (shape C, raw yield, no arg
  flags); `build`/`down`/`up`/`hold_keys`/`mock_control_handlers` defined once
  in `tests/kb_helpers.py` (plain functions, imported by the test files via the
  prepend-mode `tests/` sys.path entry); the six files' local `def kb_env` +
  helper copies and the now-unused imports (`pytest`, `FST_Keyboard`,
  `MagicMock`, `SimpleNamespace` per file) deleted, signatures/bodies re-bound
  to the new fixture names. Verification: `pytest -q` = 434 passed, 1 warning
  (the known #10 coroutine warning, unchanged); `ruff check --select F .` = 0
  findings. Entry stays open for the maintainer's documented-preference call.

## 44. Stale/unknown focus name → uncaught KeyError in `apply_focus_groups` / `apply_start_args_by_focus_name` (the config is reloaded *before* the lookup) (2026-09-10, Audit 3b) (closed 2026-09-10, full text moved from TODO.md)

- **Problem / evidence:** `apply_focus_groups` (`fst_keyboard.py:386`) and
  `apply_start_args_by_focus_name` (`:1021`) index
  `self._focus_manager.multi_focus_dict[focus_name]` with NO membership guard, and
  `apply_start_args_by_focus_name` runs `self.update_focus_groups()` (`:1018` — full
  config reload via `load_config()` that replaces `_multi_focus_dict` wholesale,
  `fst_manager.py:1560-1563`) BEFORE the lookup — so a focus group removed or
  renamed in the config file between the last `Focus_Task` match and the lookup
  makes `multi_focus_dict[FOCUS_APP_NAME]` raise. `FOCUS_APP_NAME` is only ever
  cleared to `''` by `Focus_Task` (`fst_tasks.py:124`) or set at
  `Focus_Group_Manager` init (`fst_manager.py:1469`) — replacing the dict does
  NOT clear it. Uncaught
  propagation paths (verified — no try/except between the entry point and the
  lookup):
  (a) win32 hot path: `check_control_actions` (`fst_keyboard.py:925`) →
      `control_toggle_pause` (`:975-976`, passes `FOCUS_APP_NAME` twice — the same
      name goes stale twice) — the `_win32_event_filter` body (534-967) has no
      try/except (the filter's excepts are 644 rebind, 754 coroutine, 879 macro,
      901 macro logger, 1011 macro-name KeyError only); an exception in the
      callback would kill the pynput hook thread = silent listener death.
  (b) GUI: `fst_overlay.py:210-214` / `:590-591` (StatusOverlay/TrayIcon "Toggle
      Pause") call `control_toggle_pause` directly — unguarded.
  (c) CLI menu option "2. Reload everything from file" (`fst_manager.py:1875-1876`)
      — unguarded; a KeyError breaks the menu loop.
  Only the `Focus_Task` path catches it (`fst_tasks.py:106-109`
  `except Exception` → stays paused — and that catch is tested:
  `test_focus_task.py:216` pins `side_effect = RuntimeError('boom')`). No test
  anywhere covers `apply_focus_groups('…absent')` / `control_toggle_pause` with an
  out-of-dict `FOCUS_APP_NAME` (`test_cli_menu.py` and `test_facade_wiring.py`
  always pass names that exist in their dicts).
- **Outcome (goal):** a missing/renamed focus group degrades to the default
  groups (or a logged, user-visible error) instead of raising out of the hot
  path, a GUI slot, or the menu loop — chosen semantics per maintainer call.
- **Acceptance:** `control_toggle_pause`, the menu reload, and
  `update_args_and_groups(name)` no longer raise KeyError for names absent from
  the *reloaded* `multi_focus_dict`; a test for at least paths (a) and (c) pins
  the chosen behavior (freshly-deleted focus group → resume with defaults, or the
  decided alternative); suite green.
- **Scope (non-exhaustive):** `fst_keyboard.py` 383-404 / 916-931 / 972-986 /
  1016-1024; `fst_manager.py` 1875-1876 (CLI menu) + 1483-1497 (`Focus_Group_Manager`
  dict/keys handling — if the fix clears `FOCUS_APP_NAME` on dict replacement);
  `fst_overlay.py` 210-214/590-591 (guard site choice — a central fix in the
  two accessors makes these untouched); tests: `test_control_actions.py`,
  `test_focus_task.py`, `test_cli_menu.py`.
- **Status:** FIXED (P08 build, 2026-09-10) — design approved (now in
   `.opencode/proposals/approved/P08_configerror-design.md`, degrade-to-defaults
   included). `ConfigError` added to `fst_data_types.py`; raised at the stale focus
   name sites (`apply_focus_groups` / `apply_start_args_by_focus_name`) and at both
   `convert_to_vk_code` failure branches; caught at every user-facing boundary:
   win32 hot path (`check_for_combination` warn-once + `check_control_actions`
   degrade-to-defaults), CLI menu option 2 (print, loop continues), the 4 GUI overlay
   handlers (toast), and top-level startup (print + exit 1). Parse blocks preserve the
   type (except-before-generic). Acceptance met: paths (a)+(c) pinned
   (`tests/test_config_error.py`), suite green 448 passed / ruff `--select F` clean.
   Handoff to planner: condense/close this entry. **Overlap note for #1:** the
   constraint `p()`/`tr()` path now catches `ConfigError` fail-closed (print +
   `return False`) so it no longer crashes, but it still only PRINTS (console) — #1's
   "user-visible error at the constraint path" is NOT yet met, so #1 stays OPEN.

## 46. Flaky test: `test_crossover_not_taken_on_low_roll` — timing/order-dependent (2026-09-10) (closed 2026-09-10, full text moved from TODO.md)

- **Problem / evidence:** during the #3 docs rework the first full `pytest -q` run
  failed exactly ONE test, `tests/test_output_manager.py::TestCrossover::test_crossover_not_taken_on_low_roll`
  (433 passed, 1 failed); the immediate re-run of the FULL suite was green (434 passed)
  and the test passes in isolation. The test monkeypatches `randint` (probability roll
  `0` → no crossover; delay roll `5` ms), fires `send_keys_for_tap_group`, then asserts
  the exact release/press order after a fixed `await asyncio.sleep(0.02)` — i.e. it
  races the 5 ms `asyncio.sleep` inside the scheduled coroutine against a 20 ms wall-clock
  window, which can be lost on a loaded machine or when scheduling is delayed by
  preceding tests. Docs-only task, no code touched — pre-existing instability.
- **Outcome (goal):** the crossover tests are deterministic — no dependence on
  wall-clock timing or test order.
- **Acceptance:** the test passes under repeated full-suite runs (e.g. 10 consecutive
  `pytest -q`) without flaking; no behavior change in `send_keys_for_tap_group`.
- **Scope (non-exhaustive):** `tests/test_output_manager.py::TestCrossover` (replace the
  fixed `asyncio.sleep(0.02)` with an event-driven wait — e.g. poll the mock's
  `method_calls` until both calls are recorded, bounded by a timeout); `fst_manager.py`
  only if a deterministic seam is added for the scheduled task.
- **Status:** OPEN — pre-approved (test-only, no observable behavior change); found
   during #3 (2026-09-10). Delegated (looprun 2, iteration 1, approved-fix batch).
- **Status tail:** LANDED (2026-09-10, approved-fix batch) — the fixed
   `await asyncio.sleep(0.02)` replaced with the event-driven bounded wait
   `TestCrossover.wait_for_calls` (polls the mock's `method_calls` until exactly
   the expected calls are recorded; 100 × 10 ms bound; AssertionError on
   timeout), applied to BOTH async crossover tests (the named one + its sibling
   `test_crossover_presses_new_key_first`, same race; scope named the whole
   class). Production `send_keys_for_tap_group` untouched. Gate: 10 consecutive
   FULL `pytest -q` runs green (436 passed each), ruff F=0.

## 41. Production bug: `remove_all_toasts()` control function calls a nonexistent attribute (plural/singular mismatch) (2026-09-10) (closed 2026-09-10, full text moved from TODO.md)

- **Problem / evidence (planner-verified from the dead Q4 re-run's lead, session 3):**
  `fst_manager.py:578` (`remove_all_toasts`, the control-function family built in
  `constraint_evaluation`) calls `self._fst.remove_all_callbacks()` (PLURAL), but
  `FST_Keyboard` only has the SINGULAR `remove_all_callback` (`fst_keyboard.py:64`,
  assigned `bridge.trigger_remove_all` at `free_snap_tap.py:193`; the playground
  probe `overlay_probe.py:70` also uses the singular). No plural attribute exists
  anywhere on a production object → calling the `remove_all_toasts()` control
  function in production raises `AttributeError`. The test suite HIDES this:
  `tests/conftest.py:69` (FakeFST) sets `remove_all_callbacks = MagicMock()` (plural)
  and `tests/test_output_manager.py:534` asserts on the plural mock. Already flagged
  in `.opencode/archive/COVERAGE_TRIAGE.md` ≈275–284 ("Suggested fix (for the
  maintainer)") but never promoted to an open TODO.
- **Outcome (goal):** name parity — one attribute, called the same everywhere, tests
  matching the production name.
- **Acceptance:** `fst_manager.py:578` + the conftest FakeFST + the test assertion
  all use the SAME name as the production `FST_Keyboard` attribute; a test fails if
  the names ever drift (e.g. the FakeFST attribute is asserted against
  `FST_Keyboard.__init__`'s); suite green.
- **Scope (non-exhaustive):** `fst_manager.py` ≈578, `fst_keyboard.py` ≈64,
  `free_snap_tap.py` ≈193, `tests/conftest.py` ≈69, `tests/test_output_manager.py`
  ≈534.
- **Recommended fix (planner):** call the SINGULAR `remove_all_callback()` at
  `fst_manager.py:578` (the production name, used by `free_snap_tap.py` + the
  playground) and update the two test references — one-line fix + two test refs.
  Alternative (set a plural alias in `FST_Keyboard.__init__`) is worse: two names
  for one thing.
- **Status:** OPEN — maintainer APPROVED (260910 ruling: "sounds ok ... approved").
   Delegated (looprun 2, iteration 1, approved-fix batch).
- **Status tail:** LANDED (2026-09-10, approved-fix batch) — `remove_all_toasts`
   calls the SINGULAR `remove_all_callback()` (fst_manager.py:578); FakeFST
   attribute (tests/conftest.py) + test assertion (tests/test_output_manager.py)
   use the singular production name; new drift-guard
   `test_remove_all_toasts_drift_guard` drives `remove_all_toasts()` against a
   stand-in exposing ONLY the singular attribute — name drift raises
   AttributeError, which the eval path does not swallow (only NameError is
   caught, fst_manager.py:676). Gate: pytest -q = 436 passed, ruff F=0.

## 42. Multi-notch scroll-wheel events (delta ≠ ±120) are untested across all layers; the filter pins wheel phase on single-notch equality (2026-09-10, Audit 3a) (closed 2026-09-10, full text moved from TODO.md)

- **Problem / evidence:** `FST_Keyboard.mouse_win32_event_filter`'s inner `is_press()`
  (fst_keyboard.py ≈456-460) returns True/False ONLY when `data.mouseData` is
  EQUAL to the single-notch constants `4287102976` (down, delta −120) / `7864320`
  (up, delta +120) — for any other wheel delta (240, 360, … common fast/momentum
  scroll) it returns **implicit `None`** (same failure shape as #1's numeric-vk
  branch). `None` then propagates as the falsy `is_keydown` into
  `_win32_event_filter` (fst_keyboard.py ≈505-510); the vk code 6/7 itself is
  assigned unconditionally for scroll messages (≈475-478), so multi-notch wheel
  events flow through as release-phase-only events. The test suite pins exactly
  the two single-notch constants — `tests/test_filter_behavior.py:402-410`
  (`test_scroll_messages_map_to_vk_6_and_7`) uses `mouse_data=4287102976` /
  `7864320` verbatim (constants echoed from the production source); a repo-wide
  grep of `tests/` finds NO other wheel `mouseData` values (only 0 / 65536 /
  131072 x-button values). The output-side `scroll_up/down/right/left(n)`
  functions ARE tested with arbitrary magnitudes (`tests/test_output_manager.py`
  `test_scroll_constraints` ≈594-601) — that covers only `Output_Manager`
  constraint functions, never the `mouse_win32_event_filter` entry with a
  multi-notch payload. Consequence: a regression in wheel delta handling (or a
  deliberate semantics change) cannot be caught anywhere in the suite, and in
  production every non-±120 delta event behaves like a release phase (phase
  inversion vs. the ±120 path).
- **Outcome (goal):** the suite pins multi-notch wheel semantics explicitly:
  a wheel event with |delta| ≠ 120 (concrete example values computed for the
  test: 2-notch up `mouseData=15728640`, 2-notch down `4279238656`) produces the
  documented idealized output — either aggregated magnitude or the documented
  single-unit equivalent — decided by the maintainer (this changes observable
  behavior).
- **Acceptance:** new test(s) drive `mouse_win32_event_filter` with the two
  multi-notch constants and assert the exact `_win32_event_filter` /
  `mouse.scroll` outcome for the chosen semantics; the single-notch tests stay
  green; entry closes with a status note naming the decided semantics.
- **Scope (non-exhaustive):** `tests/test_filter_behavior.py` (`TestMouseWin32Filter`,
  ≈371-430); `fst_keyboard.py` ≈451-478 + ≈503-514 (read-only verification);
  `fst_manager.py` ≈703-709 (scroll sign mapping — context for acceptance only).
- **Status:** OPEN — maintainer APPROVED the mask/shift semantics (260910 ruling:
   the direction info sits on bits 16/17 of `mouseData`; "we have to apply a binary
   mask or shift it to recognise it when any other bit is 1" — approved). Multi-notch
   wheel event = SAME phase as single-notch (magnitude NOT aggregated). ADDITIONAL
   RULING: any other place comparing a single bit in a series of status bits
   (packed-word equality checks) = REPORT BACK, implicitly approved. Delegated
   (looprun 2, iteration 1, approved-fix batch).
- **Status tail:** LANDED (2026-09-10, approved-fix batch) — the wheel branch of
   `is_press()` replaced with the mask/shift sign test
   `bool((data.mouseData >> 16) & 0x8000)` (True = down/press, False = up/
   release), node-verified BEFORE the edit against BOTH single-notch constants
   (7864320 → False, 4287102976 → True) and BOTH 2-notch spec constants
   (15728640 → False, 4279238656 → True). Bit note: bits 16/17 are NOT set in any
   wheel constant — the delta word occupies bits 16-31, the distinguishing bit is
   bit 31 (sign of the delta word); the approved "mask or shift, direction
   regardless of other bits" semantics are exactly implemented (low word = key
   state, ignored). Multi-notch = SAME phase as single-notch, magnitude NOT
   aggregated. New test `test_multi_notch_scroll_keeps_single_notch_phase`
   (tests/test_filter_behavior.py); single-notch tests stay green. Gate: pytest
   -q = 436 passed, ruff F=0. REPORT BACK (ruling): packed-word equality sites
   found → new entry #48 (implicitly approved).

## 49. `handover_task.md` worktree/HEAD conflict (2026-09-10) (closed 2026-09-11)

One-line record: maintainer call — the worktree held the LANDED part-3 spec (byte-identical
to `854bb68`) while HEAD held the split-build spec (`8b4123b`); the maintainer resolved it
directly (`b6dc3e7` "cleaned up commit mess" — restored lost updates, HEAD split-build spec
canonical, tree clean) → closed; the split build launched per the committed spec.

## 3. Rework README and WIKI to the current state of the code (2026-09-06) - CLOSED (work LANDED 2026-09-10; curated 2026-09-11, iter 5) - all 15 fix-list items reworded per the 2026-09-06 decisions, each verified against the code before rewording (the per-item evidence status tail lives in TODO.md's git history); the §3-undocumented-features residual went to #47 (closed 2026-09-10).
## 40. Explorer run #1 output unreliable (2026-09-10) - CLOSED (maintainer ruling 2026-09-10: the gemma agent option removed, verified in the live opencode.jsonc; curated 2026-09-11, iter 5) - the audit re-run goal was completed via audit 3a/3b (session 4; #48 is the only open audit residual); the gauge-fabrication caveats stand as the explorer-output-check lesson (verify numbers against the real command).

## 48. Packed-word equality checks in the mouse filter: X-button mouseData + LLKHF flags (2026-09-10, #42 report-back) (closed 2026-09-11, full text moved from TODO.md)

- **Problem / evidence:** the #42 audit (ruling: report back on ANY other
   equality comparison against a packed multi-bit status word / single-bit-in-a-
   series check) found two production sites of the same defect class in
   `FST_Keyboard.mouse_win32_event_filter`:
   (a) `fst_keyboard.py:471-473` — X-button vk mapping compares
   `data.mouseData == 65536` (x1) / `== 131072` (x2) on EXACT equality; for
   WM_XBUTTONDOWN/UP the high word is the XBUTTON identifier and the low word
   is the key state (ctrl/shift) — with a modifier held the low word is
   nonzero, the equality fails, `get_mouse_vk_code()` returns None and the
   event is suppressed via `self._mouse_listener.suppress_event()` (≈514)
   without any rebind/tap processing (silently dropped).
   (b) `fst_keyboard.py:49` — mouse `is_simulated_key_event` is
   `flags == 1` on the packed LLKHF flags word; an injected event carrying any
   other LLKHF bit (e.g. LLKHF_LOWER_IL_INJECTED 0x20) is misclassified as real
   input. Correct bit-test pattern already in the same file: keyboard
   `flags & 0x10` (fst_keyboard.py:520). Secondary (playground probe, not
   production): `playground/pynput_mouse_probe.py:101, 109-125` carries the
   same patterns. The post-#42 wheel sign test is the reference pattern.
- **Outcome (goal):** the X-button vk mapping and the mouse simulated-check use
   bit tests / masks instead of packed-word equality — status bits in the other
   half of the word must not change the outcome (per the #42 ruling).
- **Acceptance:** x1/x2 down/up with a nonzero low word (shift/ctrl state)
   still map to vk 4/5; a flags value `1 | 0x20` is still classified simulated;
   tests pin both; suite green.
- **Scope (non-exhaustive):** `fst_keyboard.py` ≈49, ≈471-474; tests in
  `tests/test_filter_behavior.py::TestMouseWin32Filter`.
- **Status:** CLOSED (2026-09-11, worker) — the mouse `is_simulated_key_event`
  now tests bit 0 (`bool(flags & 1)`) and the X-button vk mapping tests the
  high word (`(data.mouseData >> 16) == 1` → vk 4, `== 2` → vk 5, mirroring the
  #42 wheel idiom); status bits in the other half of the word do not change
  the outcome. 3 new tests in `tests/test_filter_behavior.py::TestMouseWin32Filter`:
  `test_x_buttons_ignores_key_state_low_word` (x1 down/up + x2 down with
  nonzero low words → vk 4/5), `test_x_button_other_identifier_suppresses`
  (x3 identifier `196608` → suppress path, regression guard),
  `test_simulated_flag_bit0_only` (flags 1 / 0x21 simulated; 0 / 0x20 real).
  The existing `test_x_buttons_use_mousedata_for_vk` +
  `test_simulated_flag_passthrough` unchanged and green. Gate: `pytest -q` =
  **451 passed + 1 known #10 warning** (baseline 448 before the new tests);
  `ruff check --select F .` = 0. Landing commit: the first commit after
   `00bc24f`, subject "Mouse filter: packed-word equality → bit tests (TODO
   #48)" (a commit cannot cite its own hash — self-referential SHA is
   infeasible; the repo convention is date + gate + subject).

## 50. (closed 2026-09-11, planner-direct, approved by maintainer inbox 11-11) — repo_map.md refresh: (a) §Worker-roster explorer bullet "findings to `TODO.md`" → "findings to `todo_inbox.md` (the planner curates + assigns the TODO IDs)"; (b) §Module-map `.opencode/` bullet now lists `system_prompts/repo/` parts + `agent_readme_*.md` readmes + the `loop/` current-looprun / `archive/loop/` history convention (and drops the stale "draft copies in `proposals/files/`" — they are archived). "Stable facts only" kept — no phase progress introduced.

## 17. (closed 2026-09-11, see one-line record above) — v1.3 log-growth CONFIRMATION — one-shot read, deferred by the no-`plugin.log` constraint (2026-09-08)

- **Problem / evidence:** the old-profile measurement (v1.1+v2 era): the delegation cycle
  grew the log to 1036 lines / 571 KB in 5 min (≈0.9 KB/s — the "rapid growth" complaint,
  quantified); child-session lines ≈47 % of total; the residual unsilenced types were
  `file.watcher.updated` ×41, `file.edited` ×7, `session.idle` ×1. v1.3 = silence exactly
  those — landed 2026-09-09 (#29 item 3) — but the live byte-ratio of that extension has
  NOT been measured; measuring requires a read of `plugin.log`, which the standing
  maintainer constraint forbids except ONE scoped, one-shot read on request.
- **Outcome (goal):** take the v1.3 profile — ONE scoped, one-shot read of the retained
  log's post-base segment; expect the three types at 0 + ≈79 % event-line cut; refresh the
  NAP's log base (currently 1269 — STALE on purpose).
- **Acceptance:** measured ratio + new log base recorded in the NAP; this entry closes.
- **Status:** OPEN — MAINTAINER CALL (section above, item 1; default: SKIP unless asked —
  never parse the log unprompted).

## 30. (closed 2026-09-11, see one-line record above) — De-peek: replace the peek.py shell-out with an in-plugin `node:sqlite` read (2026-09-09)

- **Problem / evidence:** the gauge shell-outs (`$`-tagged-template → `.venv/Scripts/python.exe
  .opencode/ctxgauge/peek.py`, `handover.ts` ≈301) against the OLD opencode.db schema —
  fragile (fresh-session `fetchone() → None` class of bug, #21/#24). `node:sqlite` is
  built into the probe node v24.19.0 (confirm exposed on the system CLI host — it was
  absent in the electron host).
- **Outcome (goal — ONE cycle, APPROVED):** (1) in-plugin `node:sqlite` gauge landing +
  peek.py removal (`.opencode/ctxgauge/` delete, unless the maintainer keeps a
  standalone-CLI copy — his call) + doc purge (`AGENTS.md` COPY — the original is
  agent-read-only — + `prompt_agent_planner.md` + `prompt_agent_task.md`); (2) re-baseline
  the v1.3 log-profile measurement in the SAME cycle (landing de-peek re-baselines the
  gauge host — the probe's S4 fake-shell gauge shapes must be rebuilt per the #20
  exception); (3) the read is written against the CURRENT opencode.db schema (`session` /
  message-token JSON; model id from `session.model`'s `id`) and guards the fresh-session
  case like peek.py does (no finished message ⇒ `CTX=0`, never throw into the transform) —
  this replaces the parked #21 v2-schema note.
- **Carry-over caveat (UNVERIFIED, from the 2026-09-09 dirty `peek.py` diff, committed with
  that entry):** "should total not be the most current total token number? output should
  be the generated tokens for the last message so it should be substract output from
  total" — i.e. `total − output` may already be the right readout — CHECK the token-field
  meaning BEFORE wiring the same arithmetic into handover.ts; record the verified meaning
  when done.
- **Acceptance:** no python shell-out on the gauge path; probe passes (rebuilt S4); the
  doc references purged (AGENTS.md via the hand-over copy); token semantics recorded here.
- **Scope:** `.opencode/plugin/handover_v2.4.ts` (readout ≈301), `.opencode/plugin/scripts/`
  (the gauge core + self-peek CLI — moved out of the former `.opencode/ctxgauge/` on
  2026-09-10), `prompt_agent_planner.md`, `prompt_agent_task.md`, the AGENTS.md copy.
- **Token semantics — VERIFIED (record per this cycle's task fact 3, closes the
  carry-over caveat above):** `total = input + output + cache.read` holds EXACTLY across all
  recent step rows → `ctx = total − output` = the exact prompt size at the latest finished
  step = current context at that moment (measured 2026-09-10; the implemented read-out is built on this).
- **Backend ruling (2026-09-09, maintainer):** the node:sqlite design is SUPERSEDED — the
  plugin host (opencode.exe, a bun-compiled binary) cannot be trusted with node:sqlite (the
  T1 worker could not solve a sqlite call via node modules there). The core now spawns the
  maintainer-placed `.opencode/plugin/tools/sqlite3.exe` (args array, `file:…?mode=ro`,
  marker SQL `M|…`/`S|…`, no PRAGMA in the call — its echo pollutes stdout). Verified live
  under node v24.19.0 + bun 1.4.2; the worker's digit corruption (multiplier `105` →
  `100`/`1000`) fixed; window rule = trailing `<N>K` × 1000 exactly, last marker wins
  (maintainer-confirmed).
- **Backend RE-RULING (2026-09-10, maintainer):** the sqlite3.exe spawn backend is
  SUPERSEDED — back to built-in `node:sqlite` (`DatabaseSync`; node v24.19.0 flag-free per
  fact 1 of the task spec). Rationale: the 3bit Q3 workers lost coherence on the SQL/JSON
  detail work; the build now runs on the 4bit same-model worker `worker_Q4_120K`
  (maintainer restart with the new roster). The bun-compiled opencode.exe host risk is
  guarded by the never-throw `db-error` fallback; the worker records a bun 1.4.2 host-proxy
  check; production evidence = maintainer restart + one-shot log read (call 1).
  `sqlite3.exe` stays on disk (maintainer-placed, now unused — do not delete).
- **Status:** LANDING (2026-09-10, continuation 2 — node:sqlite re-ruling) —
  plugin wiring + probe + node:sqlite core landed this cycle — log-profile
  re-baseline pending maintainer restart + one-shot log read (call 1, default
  SKIP). bun 1.4.2 host-proxy check: PASS (core import + `readGauge()` green
  under system bun, kind=ok on the live db). The build scope is complete (core
  node:sqlite-only, v2.5 plugin wiring + probe 33/33, peek.py deleted); do NOT
  close — the log-profile tail + #34 residual doc refs remain open.
  **2026-09-10 (evening, production restart evidence):** the read fails under the
   PRODUCTION bun host (`db-error`, no `node:sqlite` — Bun error format) → no ctx line
   lands; see #37 (the bun-1.4.2 system-bun proxy check measured the wrong host).
   **2026-09-10 (T2 #33): ladder build LANDED —** per-session read (gauge.mjs optional
  sessionID param) + the v2.6 nudge ladder in handover_v2.4.ts + probe S8 (checks
  46-53; 52/52 PASS, exit 0) + suite 434/434 + ruff F=0; production evidence (a forced
  high-readout nudge after a maintainer restart) PENDING.

## 35. (closed 2026-09-11, see one-line record above) — T1 de-peek build — LANDED (continuation 2); tail open: v1.3 log-profile re-baseline (call 1) + #34 residual doc refs (2026-09-10)

- **Problem / evidence:** T1 build (task file `.opencode/handover_task.md`) stopped at the
  context stop-line: self-gauge read at stop time `CTX=106441 (87%)` (≈14 k left vs. ≈45–50 k
  estimated for the remainder). Landed + committed: shared gauge core (`ctxgauge/gauge.mjs`)
  + self-peek CLI (`ctxgauge/peek.mjs`, verified live against the real DB) + peek.py
  deletion + suite 434/434. NOT landed (spec DoD pending): the v2.5 plugin wiring in
  `handover_v2.4.ts` (native gauge import + session-gated match-only post + `sess` evidence
  field + db-error vocabulary + header block + dead shell mechanism deletion), the probe
  rebuild (currently pointing at the deleted `handover.ts` — stale; S4/S6 shapes per spec),
  the doc purge (#34), the v1.3 log-profile rebaseline (call 1, default SKIP).
- **Outcome (goal):** T1 completed per spec (probe `PROBE handover: N/N PASS`, suite 434/434,
  `peek.mjs` prints the `SESSION=…` line — this one already holds — plugin lands the gated read, #30/#33 tail updates, commit).
- **Acceptance:** task file DoD items 1–5 all true.
- **Suggested scope:** `.opencode/plugin/handover_v2.4.ts`, `.opencode/plugin/probes/handover_probe.mjs`, doc files in #34, `TODO.md`.
- **Status:** OPEN — the T1 build scope itself is COMPLETE (2026-09-10, continuation 2 —
  see the status tail below); remaining tail = the v1.3 log-profile rebaseline + #34
  residual doc refs. 2026-09-09 update:
  the sqlite-via-node:sqlite problem is SOLVED per maintainer ruling — the core
  (`ctxgauge/gauge.mjs` + `peek.mjs`) landed on the sqlite3.exe backend (planner-direct,
  verified live, corruption fixed; task file now carries a PLANNER RULING block). Remaining
  continuation scope: plugin wiring (session-gated match-only post) + probe rebuild +
  suite/ruff + peek.py deletion + #30/#35 status lines — per the ruling block + DoD.
  2026-09-10: backend RE-RULING (node:sqlite, see #30) — the committed core's sqlite3.exe
  read mechanic is re-implemented in continuation 2; the 3bit 210K delegation looped
  (no partial commits, verified via git log); re-delegated to `worker_Q4_120K`.
  **2026-09-10 (continuation 2 — LANDED):** node:sqlite core + v2.5 plugin wiring +
  probe rebuild (33/33) + suite 434/434 + ruff F=0 + peek.py deletion committed;
  remaining tail = the v1.3 log-profile rebaseline (maintainer call 1) + #34
  residual doc refs (planner/maintainer-owned).

## 2026-09-12 (iter-9, branch `fst_work`) — FST behavior batch closed (ruling 2026-09-12; unit A `4b93d37` + unit B `2891dab`; gate 459 passed + 1 known #10 warning, ruff F=0) — full text of closed entries #1, #7, #8, #9, #4, #6 (moved from TODO.md):

## 1. General vk resolution: unknown keys must surface to the user (tabled 2026-09-06)

- **Problem / evidence:** wherever a key string resolves to a vk_code (`convert_to_vk_code`
  + all its call sites) it should raise AND be communicated to the user — important
  feedback; today many paths fail silently or only print to console. State-shorthand
   constraints now fail-closed on unknown keys (2026-09-06, `fst_manager.py`
   `constraint_evaluation`) but still only print — fold into the general solution.
   Verified crash path (2026-09-10, session-3 probe): `convert_to_vk_code('300')` /
   `('256')` return an implicit `None` (the numeric branch swallows the KeyError when
   `key_int` is out of range — `fst_keyboard.py:146-150`), and the following
   `if vk_code <= 0:` in `extract_data_from_key` (`fst_keyboard.py:224`) then raises
   `TypeError: '<=' not supported between instances of 'NoneType' and 'int'` — an
   out-of-range numeric key string in the config crashes group init with an
   unhelpful TypeError instead of a surfaced error. `test_extraction_filter_edges.py`
   ≈61-64 pins the implicit-None behavior (archived triage "suspected bug #2").
    **Audit 3b addition (2026-09-10):** `check_for_combination` (`fst_keyboard.py:906-912`,
    called from the hot path at `:627` via `check_control_actions`) converts its string
    combo entries with `convert_to_vk_code` (`:910`); a non-resolving string returns
    implicit None and then SILENTLY poisons state instead of erroring —
    `get_real_key_press_state(None)` catches its own KeyError
    (`fst_manager.py:1604-1609`) and INSERTS a `None` key into BOTH
    `_real_key_press_states_dict` AND `_all_key_press_states_dict`
    (via `set_real_key_press_state`, 1612-1613 — this setter writes `_all` unguarded).
    The combos resolve today (alt/end/delete/page_down all in `vk_codes_dict`,
    verified 2026-09-10) — the defect is latent for any custom/unresolvable combo string.
 - **Outcome (goal):** ONE general solution covering every vk-resolution site (not
  per-call-site fixes) with the user-visible error; the constraint path reuses it.
- **Acceptance:** unknown key ⇒ user-visible error at every resolution site (never
  console-only); the constraint fail-closed path emits the same user-visible error; suite
  green.
- **Scope (non-exhaustive):** `convert_to_vk_code` + all its call sites (`fst_manager.py`,
  `fst_keyboard.py`, …); `constraint_evaluation`'s unknown-key branch.
- **Status:** RULING 2026-09-12 — Rec approved (build the P08-style user-visible error at
   every vk-resolution site; the constraint path reuses it). LANDED on branch `fst_work`
   (iter-9, unit A, commit 4b93d37): one `FST_Keyboard.surface_config_error` helper; both
   constraint fail-closed guards + `check_for_combination` (+ the hot-path resume catch)
   route through it (GUI P08 error toast / headless print, dedup + fail-closed preserved) —
   the console-only residual is closed by this build. Unknown constraint *names* stay silent
   no-ops by design (`SPEC_FEATURES.md` §4 #2) — out of scope.
## 7. Empty macro: comment/behavior mismatch at `fst_keyboard.py` 707 (2026-09-08)

- **Problem / evidence:** the comment says an empty key group does "not supress the
  triggerkey", but `alias_fired = True` (line 697) is set BEFORE the empty check — so the
  trigger IS suppressed (`_listener.suppress_event`, verified by
  `test_empty_macro_sequence_no_playback`). Comment and behavior cannot both be right.
- **Outcome (goal):** comment and behavior agree — decide which is right, reword or fix
  accordingly.
- **Acceptance:** the 707 comment matches the (possibly new) behavior; a test pins the
  chosen semantics; suite green.
- **Scope:** `fst_keyboard.py` empty-macro check (≈697/707); the pinning test in `tests/`.
- **Status:** RULING 2026-09-12 — Rec approved (behavior wins: keep the suppression,
  reword the comment, pin with a test). LANDED on branch `fst_work` (iter-9, unit B,
  commit 2891dab): the 737 comment reworded to match the kept suppression ("supress"
  spelling fixed); `test_empty_macro_sequence_no_playback` already pinned both
  no-playback AND trigger suppression — comment-only change, no new test needed.
## 8. `ap`/`ar` "all keys (incl simulated)" is not a union — last-write-wins shared dict (2026-09-08)

- **Problem / evidence:** `ap(...)` documents "press of all keys (incl simulated)"
  (`fst_manager.py` 253–256), but `set_real_key_press_state` (1611–1614) and
  `set_simulated_key_press_state` (1622–1625) both write the shared
  `_all_key_press_states_dict` last-write-wins — a release from either side clears `all`
  even while the other press is still active, so `ap` may not behave as "real OR
  simulated". Asymmetric: the real-setter lacks the `vk_code > 0` guard the other two
  setters have. Found in the interrupted Phase-5 run (it explains the 1630–1632 KeyError
  coverage gap).
- **Outcome (goal):** confirm the intended `ap`/`ar` semantics (or fix the dict handling +
  the missing guard) and pin the chosen behavior with a test.
- **Acceptance:** documented semantics; crossing press/release on either side behaves per
  the confirmed semantics (the other side's `all` state preserved under a union); the
  guard symmetric if the union is confirmed; suite green.
- **Scope:** `Input_State_Manager` state setters (≈1611–1632); `ap(...)` docs (253–256).
- **Status:** RULING 2026-09-12 — Rec approved (union semantics real OR simulated;
  symmetric `vk_code > 0` guard; pinning test). LANDED on branch `fst_work` (iter-9,
  unit B, commit 2891dab): both setters now write the `all` dict as a union
  (`is_press or <other side's state>`, missing side defaults False); the real setter
  gained the symmetric `vk_code > 0` guard; `ap`/`ar` doc comments state the union
  (the "relese" typo fixed as an adjacent comment fix); 3 new pinning tests
  (crossing release both directions + vk guard) in `test_input_state_manager.py`.
## 9. Repeat-constraint excepts too narrow for malformed `repeat_thread_dict` entries (2026-09-08)

- **Problem / evidence:** `toggle_repeat` (327), `is_repeat_active` (340), `reset_repeat`
  (350) catch `(KeyError, AttributeError)`; `stop_all_repeat` (365) only `AttributeError` —
  but unpacking an entry that is not a 2-tuple raises `ValueError`, uncaught, propagating
  out of `constraint_evaluation`. Low severity: entries are only written as 2-tuples
  `[task, handle]` by `start_repeat` (301).
- **Outcome (goal):** decide harden the excepts or leave as-is — record the decision.
- **Acceptance:** decision recorded here; if harden: `ValueError` covered in the four
  methods + a test; suite green.
- **Scope:** `fst_manager.py` ≈301–365 (`Input_State_Manager` repeat methods).
- **Status:** RULING 2026-09-12 — Rec approved (harden: add `ValueError` to the four
  repeat methods + a test). LANDED on branch `fst_work` (iter-9, unit B, commit
  2891dab): `ValueError` added to the excepts of `toggle_repeat` / `is_repeat_active`
  / `reset_repeat` / `stop_all_repeat` (+ `stop_repeat` as the fifth site — consistency
  addition beyond the ruling's letter); one new pinning test covers all five methods
  with malformed (1- and 3-element) entries.
## 4. Dead code: `fst_manager.py` 116–117 ("None result → pass") unreachable (2026-09-07/08)

- **Problem / evidence:** `check_constraint_fulfillment`'s "None → pass" branch (line 117)
  can never run — `constraint_evaluation` normalizes `None` → `True` (≈691) before
  returning, and no other branch returns `None`; line 117 stays uncovered in every run and
  the triage's 2098/2217 (94.6 %) ceiling is really 2097/2217 (same rounded number).
  Recorded at discovery (`2007698` commit msg). Absorbs the 260908-0951 dedup-block item 1.
- **Outcome (goal):** the dead branch is deleted — the A→C triage reclassification is the
  maintainer's call (`COVERAGE_TRIAGE.md` is agent-read-only).
- **Acceptance:** 116–117 removed (or the triage plan reclassified by the maintainer);
  suite green; coverage expectations updated.
- **Scope:** `fst_manager.py` ≈107–125; the triage plan (maintainer-side only).
- **Status:** RULING 2026-09-12 — Rec approved (delete the dead branch). LANDED on
  branch `fst_work` (iter-9, unit B, commit 2891dab): the unreachable
  `elif result is None: pass` branch is deleted (suite green, the `else:` print for
  other non-bool/int results stays); the A→C triage reclassification stays
  maintainer-side (`COVERAGE_TRIAGE.md` is agent-read-only — untouched).
## 6. Dead code: `fst_keyboard.py` 302–303 (mixed-Key rebind conversion) unreachable (2026-09-08)

- **Problem / evidence:** in `initialize_groups_from_presorted_lines`, `convert_key_string_group`
  only ever appends `Key_Event`s (bare keys expand to press/release events), so
  `new_trigger_group[0]` is never a `Key`; the 295-block is entered only via a `Key`
  replacement — which makes line 301 `False`, so 302–303 (`replacement_key = Key(...)`)
  can never execute. Proven at `fffea8b` (rebinds `w : e` and `w : +e` both leave 302–303
  uncovered). Triage classed them A — same misclassification as #4. Also: the triage's
  numeric example `"8" → 8` is wrong — `"8"` resolves via the dict to 56; the numeric
  branch needs a string absent from `vk_codes_dict` (e.g. `"255"`). Absorbs the 260908-0951
  dedup-block item 4 (first half).
- **Outcome (goal):** the dead block is deleted (or kept on an explicit maintainer
  decision — the triage class correction rides with #4).
- **Acceptance:** 302–303 removed; suite green; coverage expectations updated.
- **Scope:** `fst_keyboard.py` ≈295–305.
- **Status:** RULING 2026-09-12 — KEEP 302-303 (maintainer: "keep this until I can test a
  bit more") → CLOSED by ruling (no deletion; the triage class correction stays
  maintainer-side per #4).

## 52. `compact_memory` fails in the current host build — connection error on both paths (2026-09-12, planner ses_f6b7c5242ffeZpNl0Ar8mILWua)

- **Problem / evidence:** firing the `compact_memory` tool returns
  "Compaction request failed: Unable to connect. Is the computer able to
  access the url?" in the current host build (verified live 2026-09-12).
  Diagnosis (same session, measured): the only opencode process
  (`opencode.exe`) listens on NO TCP port at all; `OPENCODE_PORT` is empty
  → the HTTP fallback targets `localhost:4096`, where nothing listens.
  Definitive key dump (maintainer's `get_context_keys` probe, 2026-09-12):
  contextKeys = sessionID, abort, messageID, callID, extra, agent, messages,
  metadata, ask, directory, worktree — **NO `client` key** (clientKeys /
  sessionKeys empty). So `context.client` IS absent from the tool context in
  this build (the earlier throw was `client` itself being undefined, not a
  missing `.app`). The failure came from the HTTP fallback (no usable client
  + no listener on 4096). The failure did NOT consume the
  per-session compaction budget (no `.opencode/temp/compact_budget.json`
  — increment-on-success holds).
  Installed-SDK evidence (2026-09-12, grepped from
  `.opencode/node_modules/@opencode-ai/sdk/dist/`): **v1** generated types
  expose only `session.summarize` (url `/session/{id}/summarize`) — NO
  `compact` method; **v2** exposes both `summarize` and `compact`
  (`compact` url `/api/session/{sessionID}/compact`, FLAT `parameters`
  shape). Consequences: (a) the tool's current call
  `client.session.compact({path:{id}, body:{keep}})` mixes generations —
  v1 has no `compact`, v2's `compact` takes flat parameters, so even WITH a
  wired client the call shape is suspect; (b) the HTTP fallback hits
  `/api/session/compact` with the sessionId IN THE BODY — matches NEITHER
  typed endpoint (both are session-ID-in-path); (c) the `context.api`
  fallback is dubious per the maintainer's knowledge doc (not necessarily
  SDK-client-interchangeable).
- **Outcome (goal):** `compact_memory` compacts a live session in the
  current host build via the path this build actually exposes (client
  wiring decision = maintainer domain); if no path exists in this build,
  the tool reports WHICH path was attempted and why it failed (client
  absent / HTTP no-listener / endpoint mismatch) instead of the generic
  "Unable to connect".
- **Acceptance:** a live fire in a session → success (COMPACT line in
  `.opencode/temp/ctx.log` + budget increment), or a maintainer decision
  on the supported host configuration. The chosen call shape must match
  the installed SDK `.d.ts` (grep-verified against
  `sdk/dist/{gen,v2/gen}`); if the HTTP fallback stays, its endpoint is
  `/api/session/{sessionID}/compact` and it only applies when a server is
  actually listening.
- **Scope:** `.opencode/tools/compact_memory.ts` (resolution chain:
  `context.sessionID` first per the knowledge doc; `context.client` only —
  drop the silent `context.api` equivalence; error reporting),
  `.opencode/node_modules/@opencode-ai/sdk/dist/{gen,v2/gen}/*.d.ts`
  (installed types — the authority for the call shape), the host-side
  client/URL wiring (maintainer domain), the v2 test notes
  (`maintainer/done/compact_memory_v2test.ts` +
  `compaction_warning.md`), the knowledge doc
  (`maintainer/done/knowledge_opencode_tools_plugins.md`).
  Related: the loop_log-v2 proposal's Part A context probe (which context
  fields the host wires — `sessionID`/`agent` confirmed, model open); the
  installed plugin package DOES expose the
  `experimental.session.compacting` hook (candidate alternative design:
  inject durable context AT compaction instead of triggering it).
- **Solution paths (2026-09-12, maintainer Q&A + this session):**
  (1) **Plugin-registered compact tool** — the clean architecture: the
  custom-tool context is clientless BY DESIGN, so a client-needing tool
  must be registered FROM a plugin (plugin `ctx` carries the SDK/RPC
  access; plugins can register tools; the tool's execute still gets
  sessionID/agent). I.e. move `compact_memory` to a plugin-registered
  tool (registration = maintainer domain; the call shape must still match
  the installed SDK `.d.ts` per the evidence above).
  (2) **Compaction hook plugin** (prompt-level) — the maintainer's WIP
  `inbox_planner/custom_compaction.ts` sets `output.prompt` in
  `experimental.session.compacting` to a swarm-oriented resume prompt
  (shape verified against installed plugin types 2026-09-12). Complements
  (1): compaction stays host-triggered (maintainer compacts manually in a
  direct session); the plugin shapes the resulting prompt.
  (Source: `maintainer/done/plugin_exposed_custom_tool.md`.)
- **Status:** LANDED (2026-09-12, worker-2) — the build landed per the
  approved v2 proposal (plugin-registered `compact_memory` at
  `.opencode/plugin/compact_memory.ts`; v1 retired to `plugin/deactivated/`;
  probe S13 checks 86-99, 98/98; live acceptance PENDING: the maintainer's
  registration in `opencode.jsonc` + restart, proposal Acceptance 2-4).
  Design agreed with the maintainer (2026-09-12): plugin-registered tool
  (client via captured plugin ctx; v1 `summarize` path ACTIVE on this build
  + v2 `compact` hedge; keep args optional in the body with a 400-retry;
  cross-session via `sessionID` arg; HTTP fallback + compaction hook
  retired). Proposal:
  `proposals/approved/2026-09-12_compact_memory_plugin.md` (APPROVED).
  Probe evidence: `.opencode/plugin/dev_probe_ctx.ts` (client present in
  plugin ctx; summarize=function, compact=undefined; session methods on
  the prototype → detect with typeof; registration via the `plugins` array;
  the file IS the worked example of a plugin-registered tool — the
   registration shape is verified live).
  - **2026-09-13 (direct session ses_f692e1071ffevodtnJTET0DEEs):** live
    no-op bug FIXED — root cause: the server's `summarize` payload schema
    REQUIRES `providerID` + `modelID` (binary: the handler
    `SessionHttpApi.summarize` reads both from the body; a missing body /
    missing key is a schema rejection → HTTP 404 JSON `{name:"BadRequest"}`
    + a logged WARN "schema rejection" — 6 in the server log, one per fired
    tool, both test sessions). The handler never ran → NO compaction; and
    the host client does NOT throw on the 404 (it resolves) → the old code
    reported a false success and burned a budget slot. Fix: the body ALWAYS
    carries the resolved model pair (self: `extra.model.{id, providerID}`;
    cross: the last message's info, assistant `modelID`+`providerID` / user
    `model` object); an unresolvable pair → the request is NOT sent (clear
    failure, no increment, no COMPACT line); the resolved result is VERIFIED
    (success = the handler's boolean `true`; a resolved 404 JSON is a
    failure carrying the server's message). Probe re-pinned (S13: the retry
    2nd body keeps the pair, the failing-RPC path no-sends) + the S11 RC
    import REPOINTED to `plugin/deactivated/context_recovery.ts` (the
    maintainer's cleanup 4b44d8c moved the file without repointing the
    probe — the probe was broken at HEAD). Gates: probe 98/98, smoke 23/23.
    Live acceptance STILL PENDING: a real fire must show the compaction
    part + the `time_compacting` flag in the DB (verify with
    `Temp/opencode/sesdata.cjs` or `compaudit.cjs`).
- **2026-09-12 (direct session ses_f6976031bffeRa8gNNcpy5FoYj):** model
  field RESOLVED — it is nested, not top-level: `context.extra.model.id`
  (live capture `tools/dev/hot_loaded_tool.ts` + maintainer `--todo` note in
  the loop_log-v2 approval; the earlier key dump listed top-level keys
  only). Feeds the Part 4 quant-class classification (priority.md #1) and
  loop_log-v2 Part A. `priority.md` #1 (his `--wip` item) extends this
  design with the per-model quant-class budget: Q4→3, Q3→1, other→1
  preliminary, CPU models excluded — design grounded in the NAP, awaiting
  his ruling (approval path + CPU- prefix confirmation).
- **CLOSED 2026-09-13 (iteration 1):** live acceptance DONE — a real fire
  (worker-1 `ses_f6765a68bffeudOXmVzLROTYk6` + planner-direct rescue) shows
  the compaction part + reload directive + budget v2 count 1/3 + the COMPACT
  line in the DB; the host runs the fixed plugin (the `2ace5e1` model-pair
  fix). The resume-via-`task_id` context-overflow finding →
  `proposals/2026-09-13_compact_memory-findings.md` (AWAITING APPROVAL;
  item 1: lower the self-compact trigger + server keep support as the
  durable fix; item 2: `time_compacting` semantics ruling).
## 11. General contradiction prevention disabled (XXX 241016-1101) — CLOSED (maintainer ruling D1-A, 2026-09-15) — kept OFF as an intentional decision; decision comment below the untouched pin; pinning tests unchanged.

## #89. (LANDED 2026-09-23, worker-15 `worker_Q3S_170K`) — autorun-identifiable names for plugin-spawned sessions: the auto_resume spawns carry the title `<loop-folder> planner-<N>` (his # 2026-09-23_04-34)
- **Problem + evidence:** sessions the auto_resume plugin SPAWNS (the Unit-3 file-trigger spawn and the Unit-4 restart branch) get auto-resolved names (opencode derives them from context) — the sessions that belong to a loop autorun are not findable by name (maintainer request, priority.md # 2026-09-23_04-34).
- **Desired outcome:** make the loop's spawned sessions identifiable: name = the current loop folder + the next planner iteration (`planner-<N>`, N = the largest `planner-<N>` in that folder's `loop_log.md`, + 1 — the same derivation the planner uses for its iteration number).
- **What landed:** the bounded SDK answer was YES — `session.create()` accepts a title (vendored `@opencode-ai/sdk` types, `.opencode/node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts` L1811: `SessionCreateData.body?: { parentID?, title? }`) → the identifier is passed as `body.title` in the SHARED `spawnPlanner` helper's `create()` call (both spawn paths; `auto_resume.ts`), with an `ident=` bit in the `spawn=` log line; no loop folder / no `loop_log.md` / no `planner-<N>` line → no identifier (the spawn is exactly as before — the prompt-prefix fallback was NOT used).
- **Acceptance:** two new smoke checks (deterministic loop folder `autorun-test_0-0` → title `autorun-test_0-0 planner-8` lands in the create body + `ident=` bit, queued prompt text unchanged; a log with no planner-<N> line → no title, prompt unchanged); auto_resume smoke 104/104 (baseline 102, no removals); gate: all 10 smokes, probe 241/241, pytest 459 passed + 1 warning (#10), ruff F=0 (baselines as of commit 725ab3a, measured at 75566e6).
- **Status:** LANDED (commit 2240d00, recorded in the planner-9 bookkeeping per the commit-hash rule). LIVE acceptance pending: the plugin activates on the next host restart; the planner verifies the first named spawn (out of scope for the worker).

## 84. (LANDED 2026-09-22, worker `worker_Q3S_170K`) — Compaction config consolidation: ALL compaction config in the shared `compact_budget.json` (replaces the `QUANT_CLASS_RULES` substring table + the opencode.jsonc emergency flag + the hardcoded recovery keeps)
- **Problem + evidence:** the compaction caps came from a hardcoded ordered
  substring table (`QUANT_CLASS_RULES`, compact_memory.ts L79-86 — the
  2026-09-21 quant-class ruling with the probe trap pin); the T5 emergency
  flag lived in `opencode.jsonc` (read per fire); context_recovery's keep
  (30_000 / 12) was hardcoded; auto_resume already read its keys from
  compact_budget.json per tick — the config was split across three files
  (2026-09-22 design exchange, recorded in the NAP).
- **Desired outcome:** compact_budget.json is the SINGLE compaction-config
  source: top-level optional fail-open keys `keepTokens` (default 30_000),
  `keepMessages` (12), `emergencyRecovery` (strictly `true`, default false),
  `model_budget` (bare model ID → cap, plus a `default` key, default 1);
  CPU models stay cap 0 as a SAFETY INVARIANT; an unlisted / typo'd model
  id → the configured default (fails safe).
- **Acceptance criteria (all LANDED, measured gate green):**
  `compact_memory.ts` exposes `resolveCap(root, model)` (per-call
  model_budget read) + `readCompactionConfig(root)` (fail-open); keep
  reporting falls back to the file config (explicit args still win);
  `context_recovery.ts` reads flag + keeps from the SAME file (self-
  contained local reader — no runtime import from compact_memory.ts; the
  file STAYS in `deactivated/`); smokes updated (model_budget seed +
  exact/unlisted/typo/CPU fixtures + keep-override + config fail-open
  cases); probe 241/241 (check 87 → the "configured value" fixtures; S11
  checks 77/78 flag from the budget file, the JSONC fixture dropped);
  full gate green — 10/10 plugin smokes, probe 241/241, pytest 459 passed
  + 1 warning, ruff F=0.
- **Suggested scope (actual):** `.opencode/plugin/compact_memory.ts`,
  `.opencode/plugin/deactivated/context_recovery.ts`,
  `.opencode/plugin/tests/compact_memory.smoke.mjs`,
  `.opencode/plugin/tests/context_recovery.smoke.mjs`,
  `.opencode/plugin/probes/handover_probe.mjs`.
- **Status:** LANDED (2026-09-22, worker `worker_Q3S_170K` — the gate
   green as above; the commit hash is recorded by the planner in the
   follow-up bookkeeping commit, not in this entry's commit).

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

## 75. (open, 2026-09-21, planner) — **Build our own auto-resume plugin** — unit history (full text moved from TODO.md, 2026-09-23 curation):
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
`arm=`/`saturation=`/`trigger=` log lines). PARTIAL LIVE VERDICT (plan6,
2026-09-21 post-restart): the `arm=` lines ARE live (6 for the planner
session — the statusOf shape fix works; the trigger side still unproven —
no live session crossed 85 % this looprun; saturation/trigger pending a
natural crossing). Unit 3 LANDED + smoke-verified
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

## 2026-09-23 (plan10, planner-10) — full text of closed entries #68, #69, #71, #73 and #79 (moved from TODO.md; #68/#69/#71/#73 deferred from the 2026-09-23_02-51 curation, #79 closed by the plan10 live acceptance):

## 68. (CLOSED 2026-09-16 — R2 approved + landed) — Write-scope fuzzy (step 2 of the Q3 roadmap)
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

## 69. (CLOSED 2026-09-16 — AGENTS.md paste, acceptance fully met) — Redundancy form codification: `[left:right]` (SUPERSEDES the `<4|four>` Q2 form)
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

## 71. (CLOSED 2026-09-17, planner-direct) — Stale probe totals in repo_commands.md (maintainer file)
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

## #73. (LANDED 2026-09-17, planner-verified) — R7 realistic doubled case: the segment channel's gap rule fails
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

## 79. (open — LANDED 2026-09-22, live acceptance pending; 2026-09-21, planner; HIGH — live, measured) — auto_resume Unit 4 `msgPairs` never unwraps the SDK `{ data }` wrapper → action lines are NEVER recognized (spurious recovery prompts / context drain)
- **Problem / evidence (measured live, plan6, 2026-09-21):** after closing TWO consecutive turns each ending in a valid `action: restart`, `auto_resume.log` shows two `recovery= … attempt=1` lines (the counter RESET between them — `armEvent` busy resets `recoveryCount` at line 679 on every busy cycle) and `route=` count = **0** across the whole looprun — i.e. NO action line was ever recognized.
- **Root cause:** `auto_resume.ts` line 492 `msgPairs(msgs) = Array.isArray(msgs) ? msgs : []`. But `sess.messages()` (line 567) returns the SDK `RequestResult` wrapper `{ data: [...] }`, never a bare array — so `msgPairs` always returns `[]` → `lastAssistantAction` (line 518) always returns null → `userHasMarker` (line 505) always returns false. **Same root cause as the `compact_memory` `resolveModel` bug fixed in 280b8d0 — NOT covered in auto_resume.**
- **Consequence:** Unit 4 can never read restart/resume/stop/ask_maintainer → always the recovery branch; since `recoveryCount` resets on every busy cycle, the cap (2) is never reached → a FINISHED session gets re-woken with spurious recovery prompts (context drain). The loop itself still progresses via the **looprunner** (a separate mechanism with correct parsing) — the auto-resume plugin's own routing is broken.
- **Desired outcome:** the messages-RPC result is unwrapped (bare array + `{ data }` wrapper) at the single `msgPairs` site, so Unit 4 routing reads action lines correctly: stop/ask → no send (`route= stop|ask`); resume/null → bounded recovery; restart → `route= restart spawn`.
- **Acceptance:** a planner closing `action: restart` produces `route= restart spawn` (not a recovery prompt); `action: stop` → `route= stop`, no send; a smoke case pins the wrapper shape; standard gate green (smoke + probe + pytest + ruff).
- **Suggested scope:** `.opencode/plugin/auto_resume.ts` (`msgPairs` line 492 — the single consumer fix; verify no other messages-RPC site), `.opencode/plugin/tests/auto_resume.smoke.mjs` (add a wrapper-shape case), probe pins.
  - **Status:** LANDED + planner-verified (2026-09-22, plan7, worker-11
    `worker_Q3S_110K_mtp` ses_f39eef70effefmk8Bt598jhqwK, code `eaef397`):
    the dual-shape unwrap in `msgPairs` (bare array + `{ data }` wrapper —
    the same normalization as 280b8d0) + the `ses_u4_wrap` wrapper-shape
    smoke case (smoke 63/63, probe 241/241, pytest 459+1w, ruff F=0). LIVE
    ACCEPTANCE pending the next host restart (the running host is pre-fix;
    the post-restart planner verifies `route=`/`skip=` lines for the
    planner-7 close from `auto_resume.log`). NOTE: an earlier plan6 INFO
    line attributed this to a "read-race" — that was WRONG; this shape bug
    is the real cause. **LIVE ACCEPTED 2026-09-23 (plan10):** `route= restart spawn`
    for planner-9's valid `action: restart` on both builds (12:52:39Z on
    v=24972ebd, 13:00:08Z on v=d2b9d510), no recovery= lines for the sid.

## 2026-09-23 (plan11, worker `worker_Q3S_170K`) — full text of closed entry #87 (subsumed by #90, moved from TODO.md):

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
- **Closed:** 2026-09-23 — SUBSUMED by #90 (the approved proposal, Parts
  A+B+C). Part A removes the `spawned` exclusion so the self-spawned
  successor is now TRACKED (its first user message is the RESTART prompt,
  line 1 = the exact own-line toggle → scope "autorun") and is RECOVERED
  after an idle without an action line (the #87 stall case, inverted);
  option (b)'s "committed progress" idea is replaced by the LINEAGE-DEPTH
  cap (N=2) on the spawn branch. Options (a)/(c)/(d) are superseded.

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
  (maintainer temp fix 0f192e5) → #81. **Close ruling 2026-09-23 (planner-12 direct): close YES once #91 + #82 have landed** (his reply to the confirm request). (c) live evidence now also covers the post-#90 build: the Direct session ses_f3144d9d6… was judged scope=none at 17:08:57Z and went idle untouched (zero recovery/route/spawn lines) under the new build ef8c6149.
  History: investigated 2026-09-22
  (planner, direct session); FIX DESIGN APPROVED by the maintainer
  2026-09-22; plugin DEACTIVATED (a000dfd). Item-3 scope anomaly: H1
  REFUTED 2026-09-22 (DB check — none of the session's 44 user-role parts,
  every part type, contains `<|autonom|>`); H2 (running variant ≠ committed
  file) leading; the new `scope=` verdict log line + `surface=` v= version
  ID will pin verdict + code state on the next incident.
- **Suggested scope:** `.opencode/plugin/deactivated/auto_resume.ts` (L387,
  L643; scope scan L543-551).
- **Closed:** 2026-09-23 — maintainer confirm (planner-12 direct session: "close YES once #91 + #82 have landed"); both landed (#91: 2fa4bb6; #82's unit-2 part = the already-landed #85 p3 Direct-gate behavior, his ruling recorded in #82). (c) live-verified under the post-#90 build (the Direct session idle-untouched, scope=none 17:08:57Z).
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
- **Closed:** 2026-09-23 — maintainer confirm (planner-12 direct session); gate green since af38e2f (probe 241/241, smoke 53/53, pytest 459+1w, ruff F=0).
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
- **Closed:** 2026-09-23 (planner-13) — the maintainer-domain tail is done (`submit` registered live in the role toolsets; the AGENTS.md paste LANDED 2026-09-18; machine-stamped entries firing in live sessions since) — full text to todo_records.md.
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
- **Status:** PENDING RESTART (stale — resolved by #68's live acceptance 2026-09-17).
- **Closed:** 2026-09-23 (planner-13) — the read-scope mutation channel was proven LIVE by #68's one-shot live-acceptance (benign mistype corrected + `fuzzy-resolved` logged); the §5.4 sentinel torn down (the scratchpad `fuzzy_accept/` folder no longer exists); intercept.log accumulated to 3076 lines / 139 sessions by 2026-09-23 — full text to todo_records.md.
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
   suppression question (his call after the 85%-trigger info). **Unit-2 suppression RULING 2026-09-23 (planner-12 direct): YES — Direct suppresses Unit 2** (his rationale: otherwise he would toggle autoCompact off in compact_budget.json and forget to re-enable it). That is ALREADY the landed behavior since #85 part 3 (the onToolAfterNudge verdict-none gate — the passive ctx-line nudge is Direct-gated; NO code change needed). Live evidence 2026-09-23: the Direct session ses_f3144d9d6… judged scope=none (17:08:57Z), idle-untouched under the post-#90 build. Remaining: the full post-restart live acceptance rides the #90 new-build spawn tail (the restartText line-1 own-line marker as a spawned successor's first message) — DONE 2026-09-23 (planner-13).
- **Closed:** 2026-09-23 (planner-13) — FULL live acceptance on the #90 spawn tail (build v=7d2e6207): the own-line `<|autonom|>` toggle judged `scope= autorun` (19:20:54Z) then `route= restart spawn` (19:20:55Z) then the successor's first message carries the exact own-line marker (the restartText line 1) + `deactivate=` on the trigger (idle-untouched afterwards); the unit-2 suppression ruling (Direct suppresses Unit 2) = the already-landed #85 part 3 behavior (no code change) — full text to todo_records.md.
## #90. (LANDED 2026-09-23, worker `worker_Q3S_170K`) - plugin-spawned successors inherit the trigger's Autorun state + the trigger deactivates (approved proposal Parts A+B+C): (A) the `spawned` self-mark EXCLUSION removed from `scopeVerdict` (now a 1-arg function of the messages only), the `spawned` map REPURPOSED as the LINEAGE-DEPTH map (sid→depth), `restartText()` LINE 1 = the exact own-line `<|autonom|>` (prose moved to line 2) so every restart-spawned successor derives scope "autorun" from its first user message ALONE (restart-safe — no in-memory state), and a LINEAGE-DEPTH CAP (N=2) on the restart/cap-exhaustion spawn branch REPLACES the #85 exclusion's loop guard (`skip= depth sid=` at depth≥2; a file-trigger spawn stays depth 0); (B) `spawnPlanner` RETURNS the new sid (null on every failure path — the `spawn-fail=` lines are unchanged), a SUCCESSFUL spawn STICKY-deactivates the TRIGGER (`deactivate= sid=` line; a failed spawn changes nothing) and `routeScopedIdle` skips the deactivated trigger right after the scope recompute (`skip= deactivated sid=` — no send, no re-spawn, the session stays manually usable); the flag records the trigger's user-message count at deactivation and clears ONLY on a NEW user message carrying an own-line ON toggle; (C) at init (the factory call) the plugin RESTORES the in-memory depth map + deactivation flags from its own `auto_resume.log` (each `route= restart spawn sid=X` line paired with the following `spawn= sid=Y` → deactivated(X) + depth(Y)=depth(X)+1; an unpaired `spawn=` → depth 0; once per process). Smoke re-pinned: auto_resume.smoke.mjs 118/118 (the old #85 spawned-exclusion pins flipped to the new behavior + the proposal's acceptance pins 1-7 added). Gate green: probe 241/241, all 10 smokes, pytest 459 passed + 1 warning, ruff F=0. SUBSUMES #87 (now closed). Commit **c4b244d** (planner-verified 2026-09-23: independent smoke re-run 118/118).
   **Live acceptance (2026-09-23, planner-12 direct ses_f3144d9d6…, post-restart):** the live build v=ef8c6149 IS the #90 build (sha256 prefix of the on-disk auto_resume.ts = the surface= v= line; process starts 16:32:37Z + 16:37:45Z, both after c4b244d 15:53:06Z). PART A verified by A/B contrast on the SAME successor session — the old build (d2b9d510) judged it scope=none (14:46:16Z, the spawn exclusion) vs the new build scope=autorun (16:37:07Z) + recovery= attempt=1 (the #87 stall case INVERTED: the successor is tracked + recoverable; the cap held at attempt=1). PART B/C verified — the new process's init log-restore (the old route= + spawn= pair) → zero re-routing/spawn against the trigger (planner-11) after the restart + zero spawn= lines in the new process (no unbounded loop; the trigger's own final close was correctly route= stop at 15:59:27Z under the old process). NOT YET exercised live by the new build: its own restart spawn (the deactivate= line on success, the new restartText line-1 exact-own-line marker as the successor's first message, the depth-cap skip=) — awaits the next autorun action:restart close. ADJACENT LIVE FINDING → TODO #91 (the compaction summary leaked into the spawn identity + routing during the 14:46Z episode — STILL LATENT in the live build).
   **Spawn-tail live acceptance (2026-09-23, planner-13 autorun, build v=7d2e6207 = the sha256 prefix of the on-disk auto_resume.ts at HEAD d6ddf37, process start 19:13:25Z):** the maintainer's own-line `<|autonom|>` toggle + the `action: restart` close led to `scope= autorun` (19:20:54Z) then `route= restart spawn sid=ses_f3144d9d6...` (19:20:55Z) then `spawn= sid=ses_f30493f9... agent=planner_Q3S_170K model=llama-swap/Qwen3.8-27B-Q3S-170K ident=autorun-2026-09-21_15-33 planner-13` + `deactivate= sid=ses_f3144d9d6...` (19:20:55Z). ALL THREE previously unexercised items verified live: (1) the `deactivate=` line on success + the trigger idle-untouched afterwards (zero scope=/route=/recovery= for its sid post-spawn); (2) the new restartText line-1 exact own-line `<|autonom|>` as the successor's first user message (line 1 of the queued text; line 2 of the received message after the gauge's passive `ctx:` prefix per #85 part 3); (3) zero `skip=` depth-cap lines. The successor was armed (arm= lines from 19:20:55Z); its own `scope= autorun` line appears in the log at its first idle evaluation (after that session's close).
- **Closed:** 2026-09-23 (planner-13) — the spawn-tail live acceptance is complete (see the paragraph above); subsumes #87 (closed) — full text to todo_records.md.