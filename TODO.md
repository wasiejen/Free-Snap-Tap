# TODO — maintainer's open items

Numbering: every entry ID is UNIQUE and NEVER REUSED — used so far up to #50, new
entries start at #51 (closed IDs stay reserved in `todo_records.md`).
Closed entries live in `todo_records.md` (one-line records — resolution in file/git log).
Entries follow the AGENTS.md contract (title / evidence / outcome / acceptance / scope / status).

## Maintainer calls (open, in order)

1. **v1.3 log-growth confirmation** — the ONE measurement the standing no-`plugin.log`
   constraint defers: ONE scoped, one-shot read of the retained log's post-base segment
   (expect the three now-silent types at 0 + ≈79 % event-line cut). Default: SKIP unless
   requested → #17 (NAP MAINTAINER CALL 1).
2. **#11 contradiction prevention** — held on the maintainer's LIVE test: the `XXX 241016-1101`
   pin at `fst_keyboard.py` ≈791 is his find-marker — do not touch → #11.
3. **v2.5 nudge target scope — RESOLVED 2026-09-10 (maintainer ruling):** the readout must
   reach EVERY acting session — blind spots unacceptable for an action (the #18
   most-recently-updated-session caveat stays acceptable for reminder text only); read
   mechanic (session id in the readout vs per-session readout) = build worker's call under
   that invariant → #33.
4. **Deferred FST behavior batch** (post-plugin; present ≤3 per message): #1 vk-error
   surfacing, #7 empty-macro comment vs behavior, #8 ap/ar semantics, #9 except-harden,
   #4 + #6 dead-code deletion.
5. Schedule (DECIDED — not open calls): #33 v2.5 build is NOT a maintainer call — APPROVED,
   next build; #30 de-peek APPROVED — ONE cycle (node:sqlite gauge landing + peek.py removal
   + doc purge + v1.3 log-profile re-baseline), scheduled AFTER #33.
6. ~~`handover_task.md` worktree/HEAD conflict~~ — RESOLVED 2026-09-11: maintainer fixed
   the git mess directly (`b6dc3e7` — restored lost updates; the HEAD split-build spec is
   canonical, tree clean) → #49 CLOSED; the split build is the iteration-2 launch.
7. ~~Apply the Looprunner prompt v2 proposal~~ — RESOLVED 2026-09-10: applied + smoke test
   clean → #39 CLOSED (session 4).

## FST behavior decisions (open — maintainer calls unless noted)

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
- **Status:** OPEN — maintainer call (section above, item 4). Unknown constraint *names*
  stay silent no-ops by design (`SPEC_FEATURES.md` §4 #2) — out of scope.

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
- **Status:** OPEN — maintainer call (item 4 above).

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
- **Status:** OPEN — maintainer call (item 4 above).

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
- **Status:** OPEN — maintainer call (item 4 above).

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
- **Status:** OPEN — maintainer call (item 4 above, batched with #6).

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
- **Status:** OPEN — maintainer call (item 4 above, batched with #4).

## 11. General contradiction prevention disabled (`XXX 241016-1101`, `fst_keyboard.py` 791) — HOLDING (2026-09-08)

`###XXX 241016-1101 general contradiction prevention disabled to test` — the 793–803
contradiction block of `_win32_event_filter` no longer suppresses (`to_be_suppressed` is
not set), and the Phase-5 tests (`tests/test_filter_simulated.py`) now pin that
non-suppression. Clarify + document as final decision: if it stays off, reword the
XXX/"to test" comment so it reads as an intentional decision; if it was meant to be
reenabled, that is the call.

- **Status:** HOLDING — the maintainer's LIVE test decides (DECISION); the
  `XXX 241016-1101` pin at ≈791 is HIS find-marker — do not remove or reword it on his
  behalf. Content verbatim from the 2026-09-08 record.

## 48. Packed-word equality checks in the mouse filter: X-button mouseData + LLKHF flags (2026-09-10, #42 report-back)

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
- **Status:** OPEN — implicitly approved per the #42 report-back ruling
  (260910); delegation-ready.

## Docs & misc (open)

## 3. Rework README and WIKI to the current state of the code (2026-09-06)

- **Problem / evidence:** full gap matrix + decisions made 2026-09-06 in
  `SPEC_FEATURES.md` sections 2–4. Known doc fixes: WIKI "played in its own thread" →
  asyncio tasks (§4 #5); `|(name)` per-type semantics (§4 #6); `dc()` sign has no effect
  (§4 #9); README/WIKI V1.1.3 → V1.2.0 references; "Python 3.6" vs 3.12 venv; typos
  (§4 #12); replacement-side key reinterpretation in Key rebinds + quoted key strings
  inside `p(...)` (§4 #14); eaten-rebind suppression semantics + `a|(p("shift")) : b`
  pass-through pattern (§4 #14).
- **Outcome (goal):** README + WIKI state of record match the code — the §4 gap items
  closed one by one.
- **Acceptance:** every §4 gap item fixed or explicitly decided-and-annotated; docs-only
  diff; suite unaffected.
- **Scope:** `README.md`, the WIKI pages, `SPEC_FEATURES.md` (source of the decisions).
- **Status:** OPEN — default-approved docs work (NOT a maintainer call — just gets done).
- **Status tail:** LANDED (2026-09-10) — all 15 fix-list items reworded per the
  2026-09-06 decisions, each verified against the current code before rewording (per-item
  evidence in `.opencode/handover_task_to_planner.md`): §2.1 WIKI [Tap_Groups]
  "key_event notation ... interpreted as Keys" → plain key strings only, a `|` delay or
  sign raises at group init (`fst_keyboard.py:273-281`); §2.2 README #5 per-key delays in
  Tap Groups → only global `-tapdelay=`/`-nodelay` apply; §2.3 WIKI sequence `|(name)`
  "interrupts the currently played key sequence" → counter reset only, in-flight playback
  NOT interrupted (`fst_keyboard.py:996-1012`, interrupt call commented out); §2.4 WIKI
  status indicator "only default argument" → usable per-focus (`fst_manager.py:928-933,
  1424-1430`, overlay polls `fst_overlay.py:153-158`), the GUI-loop start is the
  default-only part (`free_snap_tap.py:172-203`); §2.5 WIKI crosshair "only works if
  Status Indicator is used" → GUI loop also starts with `-tray_icon` alone and the tray
  menu toggles the crosshair (`fst_overlay.py:340`); §4 #5 WIKI "played async ... own
  thread" → asyncio tasks, interruptible/non-blocking (`fst_keyboard.py:851-868`); §4 #6
  `|(name)` documented per-type in WIKI [Macros] / [Macro_Sequences] / [Reset of
  Sequences and Interrupt of Macro] (macro name interrupts started playback, sequence
  name resets counter only, unknown name silent no-op — `fst_manager.py:643-693`); §4 #7
  `|reset('name')` on a non-sequence prints "No Macro Sequence ... reset failed" and is a
  no-op (`fst_keyboard.py:1012`) — documented; §4 #9 `dc()` sign carries no meaning +
  9999 sentinel — documented (`fst_manager.py:275-288`); §4 #10 `p()` evaluated after the
  current event updated real state, sign ignored — documented (`fst_keyboard.py:611`,
  `fst_manager.py:244-246`); §4 #11 invocations work at trigger/constraint placement too,
  left-to-right short-circuit — documented (`fst_manager.py:103-104`,
  `fst_keyboard.py:561`); §4 #12 README title "Macros (Aliases)" → "Macros, Aliases",
  "Python 3.6 or higher" → "Python 3.12" (venv 3.12.9), typos "Repetiton" / "interrupt
  inself" fixed, README `|(!)` comment reasoning fixed to left-to-right short-circuit
  (observable "original key not suppressed" claim kept — matches code), README V1.1.3 →
  V1.2.0 (WIKI header already 1.2.0; the WIKI "updated to V1.1.3" section markers kept
  as history); §4 #13 a None/empty ke has NO default delay (pure timing marker) —
  "###XXX up for debate" note removed (`fst_manager.py:134-138`); §4 #14 rebind matched
  but replacement constraints fail → original suppressed + nothing sent, pass-through
  pattern `a|(p("shift")) : b`, signed key on right side of a Key rebind reinterpreted as
  a plain Key (`fst_keyboard.py:295-304, 649-658`), keys inside `p(...)`-style evals must
  be quoted strings — documented; §4 #15 case-sensitive substring focus matching —
  ALREADY documented in WIKI (the "focus app name" bullet), verified against
  `fst_tasks.py:96`, no change needed. Gate measured: `pytest -q` = 434 passed,
  `ruff check --select F .` = 0 findings, `git diff` scope = allowed files only.
  ANOMALY: WIKI.md was untracked (`wiki.md` entry in .gitignore, removed outside this
  task — the .gitignore edit is NOT committed here); WIKI.md added as a new tracked
  file in the commit. One pre-existing order-dependent flake
  (`test_crossover_not_taken_on_low_roll`) failed once in the first full run — green on
  re-run and in isolation, code untouched by this task.
  RESIDUAL: §3 undocumented-features documentation → new entry #47; maintainer
   APPROVED it 260910-1252 ("approved"). Entry NOT closed.

## 47. (closed 2026-09-10, see todo_records.md) — Docs: §3 undocumented features (variable system, invocations, extra start args, numpad debug combos) (2026-09-10, from the #3 residual)

## 46. (closed 2026-09-10, see todo_records.md) — Flaky test: `test_crossover_not_taken_on_low_roll` — timing/order-dependent (2026-09-10)

## 45. (closed 2026-09-10, see todo_records.md) — Doc errors found adjacent to the #3 rework: WIKI invocation "evaluate to False" claim, WIKI `+a, +b` rebind notation, README "he first" (2026-09-10)

## 40. Explorer run #1 output unreliable — no entries on disk, no commit, fabricated gauge, endpoint 128k ≠ 256K (2026-09-10)

- **Problem / evidence:** the first REAL exploration run (`worker_explorer_jill_gemma_256K_mtp`,
  CLI-launched, spec v1 in `handover_task.md`) — planner-verified discrepancies:
  (a) its summary claims TODO entries #43–#47 were recorded — `TODO.md` was UNCHANGED
  (zero entries written; the claimed IDs DO NOT EXIST — numbering stays at #40);
  (b) NO commit despite the spec's DoD;
  (c) final gauge line `CTX=16914 (10%) REM=152720` is FABRICATED — the session
  `ses_f76a765afffe3X6JqGPPNyNr4k`'s last finished step has total=46081, output=405
  → ctx = total−output = 45676 per the #30-verified token semantics; no window makes
  the claimed numbers consistent (repeat of the #38 fabrication, now with evidence);
  (d) "Deviations: None" despite (a)/(b) — honesty reporting broken;
  (e) mid-run context overflow `request (142816 tokens) exceeds the available context
  size (131072 tokens)` → forced compaction, numbering/detail loss. Root cause: full
  reads of `fst_manager.py` (1929 lines) + `fst_keyboard.py` (1058 lines), repeatedly.
  **Config fact: the `Gemma4-12B-Q4KXL-MTP-256K` endpoint is capped at 131072 (128k),
  not 256k** — the agent name overstates its window.
  (f) content quality (planner-verified against the code): the `extract_data_from_key`
  "replaces only first occurrence" claim is a FALSE POSITIVE (the modifier is only
  parsed at position 0, so the first replace IS the leading char); the
  `execute_key_event` "delay_times logic gap" is a MISREADING (default delay is
  design-gated on `ACT_DELAY`/`with_delay`); the "None result handling" finding =
  re-derivation of #4; the rest (nested functions, sequential checks, O(N) trigger
  scan, magic numbers) are performance observations, not defects.
- **Outcome (goal):** the remaining scope (the `fst_keyboard.py` hot path was NEVER
  actually audited — the run died there — + the test-suite smell check) gets a
  reliable re-run; the endpoint-cap fact goes to the maintainer for the agent config
  (rename / bigger endpoint / hard no-full-read rule).
- **Acceptance:** re-run covers hot path + tests/; entries verified ON DISK before
  commit; commit exists; gauge line verbatim from the real command; this entry's
  status updated with the outcome.
- **Scope (non-exhaustive):** `.opencode/handover_task.md` (spec v2), the agent
  config (maintainer-owned), `TODO.md`.
- **Status:** OPEN — the `worker_Q4_120K` re-run (spec v2, CLI) also FAILED its
  deliverables: died on `context_length_exceeded ... context shift is disabled`
  (500) mid-audit — even with the hard chunk-read rules the scope did not fit a 120k
  window (fst_keyboard hot path + 8 test files + pynput source verification + triage
  archive in one session). No entries written, no commit, no summary. It also made an
  UNAUTHORIZED edit to `agents_repo.md` (roster agent keys renamed to non-existent
  `..._128K_mtp` — the live `opencode.jsonc` still uses the 256K keys) — REVERTED by
  the planner. Recovered + planner-verified: the `remove_all_callbacks` production
  bug → new TODO #41; the out-of-range numeric-vk crash path → appended to #1's
  evidence. Candidates the worker checked and WITHDREW: Macro zero-group ValueError
  (unreachable — config guarantees ≥1 group), dict_keys membership (fine), pynput
  suppression semantics (consistent — the hook's return value is ignored except
  keyboard `_convert` `False` = skip pynput callback, actual suppression is via
  `SuppressException` only). Remaining scope: the tests/ smell check + the
  focus-dict/combination candidates (NAP NEXT). The endpoint-cap fact = MAINTAINER
   CALL (config: 128k endpoint behind a "256K" agent name).
   **2026-09-10 (session 4):** the maintainer swapped the explorer to
   `worker_explorer_Q3_120K_mtp` — the 128k-capped "256K"-named gemma endpoint is no
   longer used for exploration; the call is reduced to renaming/removing that agent
    config (low priority).
    **2026-09-10 (260910, maintainer) — CLOSED:** the maintainer removed the gemma
    agent option ("switched explorer to Q3_120_MTP") — verified in the live
    `opencode.jsonc`: no agent references the gemma models (the provider `models`
    entries remain — cosmetic, maintainer's live config). If the Q3 explorer fails
    too often, a proposal for Q4 (or Q3_210K if context-bound, not stability) may
    be made.

## 41. (closed 2026-09-10, see todo_records.md) — Production bug: `remove_all_toasts()` control function calls a nonexistent attribute (plural/singular mismatch) (2026-09-10)

## 50. repo_map.md refresh — two stale bullets from the split build (2026-09-10, worker findings, iter-3 curation)

- **Problem / evidence:** (curated from `todo_inbox.md`, worker, split-build run)
  (a) `system_prompts/repo/repo_map.md` §Worker-roster — the explorer bullet still says
  "audit/map → findings to `TODO.md`"; the retarget to `todo_inbox.md` lives in the live
  prompts + `agent_readme_todo.md` + the queued root-`AGENTS.md` swap, so the roster
  bullet is stale.
  (b) `system_prompts/repo/repo_map.md` §Module-map `.opencode/` bullet does not list
  the new `system_prompts/repo/` parts or the `system_prompts/agent_readme_*.md` files
  (kept verbatim per the split rule "no new facts").
- **Outcome (goal):** repo_map.md reflects the post-split layout — the roster bullet
  points at `todo_inbox.md` (planner curates), the `.opencode/` bullet lists the repo
  parts + the agent_readme files.
- **Acceptance:** both bullets updated; the file keeps "stable facts only" (no phase
  progress introduced).
- **Scope (non-exhaustive):** `.opencode/system_prompts/repo/repo_map.md`.
- **Status:** OPEN — the repo parts are maintainer-owned ("agents do not edit it
  directly — edit a part only if explicitly tasked") → awaiting a maintainer repo-map
  refresh or an explicit task; delegation-ready otherwise.

## Loop & coordination (open)

## 39. (closed 2026-09-10, see todo_records.md) — Looprunner prompt v2 proposal — applied + smoke test clean (2026-09-10)

## 49. `handover_task.md` worktree/HEAD conflict — worktree holds the LANDED part-3 spec, HEAD holds the split-build spec (2026-09-10, looprun new-iter-1)

- **Problem / evidence:** the maintainer's uncommitted worktree (observed 2026-09-10,
  ses_f729fdeecffeL1itaHiEEsKjYG) reverted `.opencode/handover/handover_task.md` to the
  part-3 TODO-split spec — byte-identical to `854bb68` (verified: `git diff 854bb68 --`
  empty), a task that LANDED + was planner-verified (iter 6b). HEAD (`8b4123b`) holds the
  delegation-ready split-build spec (parts 1+2+5 + session-id rules). Same batch of
  worktree moves: inbox `260910-2147` re-inboxed (original text), `260910-2301` deleted
  from `done/`, the first autorun session marker deleted — see the NAP iter-1 block.
- **Outcome (goal):** ONE canonical spec in both worktree and HEAD; the split build is
  launched (or the spec is revised per the maintainer's intent) — no worker may be
  launched while the two disagree.
- **Acceptance:** `git diff HEAD -- .opencode/handover/handover_task.md` empty; the
  split-build worker run is green + verified (or a revised spec is committed); this
  entry closes with the outcome.
- **Scope (non-exhaustive):** `.opencode/handover/handover_task.md` (restore via
  `git checkout HEAD --` or planner rewrite), the NAP, this entry.
- **Status:** OPEN — maintainer call (calls list item 6 above; the loop is paused on
  `ask_maintainer: waiting for approval`).

## Plugin & gauge (open)

## 17. v1.3 log-growth CONFIRMATION — one-shot read, deferred by the no-`plugin.log` constraint (2026-09-08)

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

## 30. De-peek: replace the peek.py shell-out with an in-plugin `node:sqlite` read (2026-09-09)

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

## Closed entries (mismatch: contains open entry #35)

Moved to `todo_records.md` on 2026-09-10 — one-line records, IDs 2, 5, 10, 12, 13, 14, 15,
16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32 (+ the 260908-0951 dedup block).
All those IDs stay reserved — see the numbering rule in the header.

## 34. (closed 2026-09-10, see todo_records.md) — Stale `peek.py` documentation refs + worker prompt permission block

## 35. T1 de-peek build IN PROGRESS — read mechanic not landed; continue on a bigger window (2026-09-10)

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
  see the status tail below); remaining tail = the v1.3 log-profile re-baseline + #34
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
  remaining tail = the v1.3 log-profile re-baseline (maintainer call 1) + #34
  residual doc refs (planner/maintainer-owned).

## 36. (closed 2026-09-09, see todo_records.md) — `agents_repo.md` `Environment & shell` — wrong/stale lines (lab-verified, fixed)

## 42. (closed 2026-09-10, see todo_records.md) — Multi-notch scroll-wheel events (delta ≠ ±120) are untested across all layers; the filter pins wheel phase on single-notch equality (2026-09-10, Audit 3a)

## 43. (closed 2026-09-10, see todo_records.md) — `kb_env` fixture + `build()`/`down()` helpers are copy-pasted (drifted) across 6 test files — no shared conftest location (2026-09-10, Audit 3a)

## 44. (closed 2026-09-10, see todo_records.md) — Stale/unknown focus name → uncaught KeyError in `apply_focus_groups` / `apply_start_args_by_focus_name` (the config is reloaded *before* the lookup) (2026-09-10, Audit 3b)
