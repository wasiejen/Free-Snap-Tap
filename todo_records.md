# TODO records — closed entries

One-line records; resolution lives in the file / git log. Moved out of `TODO.md` on
2026-09-10 (planner curation per maintainer call — removes ~6 k chars of closed history
from the live file).

**Numbering rule:** every ID used here is RESERVED and never reused — new entries in
`TODO.md` continue from the last used ID (currently #48, next = #49).

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
