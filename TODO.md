# TODO — maintainer's open items

Numbering: every entry ID is UNIQUE and NEVER REUSED — used so far up to #44, new
entries start at #45 (closed IDs stay reserved in `todo_records.md`).
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
6. ~~Apply the Looprunner prompt v2 proposal~~ — RESOLVED 2026-09-10: applied + smoke test
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

## 45. (closed 2026-09-10) Doc errors found adjacent to the #3 rework: WIKI invocation "evaluate to False" claim, WIKI `+a, +b` rebind notation, README "he first" (2026-09-10)

One-line record: fixed in the adjacent commit of the #3 docs rework — WIKI [Suffixes] function-invocation description corrected (invocations always evaluate to True and the suffixed key_event is still played — all invocations return True in `constraint_evaluation`, cf. WIKI's own "ALL INVOCATIONS will always result in True"); WIKI [Rebinds] example `+a, +b` → `+a : +b` (the 2nd of the two Key:Key rebinds, `fst_keyboard.py` Key-pair expansion); README config comment "before he first <focus>" → "before the first <focus>".

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

## 41. Production bug: `remove_all_toasts()` control function calls a nonexistent attribute (plural/singular mismatch) (2026-09-10)

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
- **Status:** OPEN — maintainer call (fixing the AttributeError changes observable
  behavior; the archived triage also marked it "for the maintainer"). Fix is
  recommended and mechanical if approved.

## Loop & coordination (open)

## 39. (closed 2026-09-10) Looprunner prompt v2 proposal — applied + smoke test clean (2026-09-10)

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
- **Scope:** `.opencode/plugin/handover_v2.4.ts` (readout ≈301), `.opencode/ctxgauge/`,
  `prompt_agent_planner.md`, `prompt_agent_task.md`, the AGENTS.md copy.
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

## 37. (closed 2026-09-10) Production plugin host lacks `node:sqlite` — the ctx nudge never lands in production (2026-09-10)

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
  434/434 + ruff F=0. Production evidence (a forced high-readout nudge after a
  maintainer restart) PENDING.
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

## 38. (closed 2026-09-10) (TEST) explorer smoke test — jill gemmaQ4-256K first launch

CLOSED (planner verified, 2026-09-10): smoke test PASSED — the explorer read the spec,
appended this entry, committed ONLY `TODO.md` (`452de1a`), stopped fast (~45 s session).
CAVEAT recorded: its final self-gauge line `CTX=14329 (11%) REM=241058` is FABRICATED —
no finished step of its session carries that ctx, and the numbers are internally
inconsistent for any window (14329/256k would be 5 % / REM 241671): it pattern-matched
the required final-line format without running the command. Fast-but-dumb signal for
the maintainer (check explorer work; the number itself is unverifiable).

## Closed entries

Moved to `todo_records.md` on 2026-09-10 — one-line records, IDs 2, 5, 10, 12, 13, 14, 15,
16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32 (+ the 260908-0951 dedup block).
All those IDs stay reserved — see the numbering rule in the header.

## 34. (closed 2026-09-10) Stale `peek.py` documentation refs + worker prompt permission block

CLOSED — all agent-facing docs now self-peek via `node .opencode\ctxgauge\peek.mjs`
(readout `SESSION=… CTX=… (…) REM=…`): prompt files (`a235886`, planner execution — the
worker was blocked by the `.opencode/prompt_**` deny) + `agents_repo.md` gauge line
(~164) and module-map line (~122) (explicit maintainer instruction, 2026-09-10).
Residual refs (frozen `deactivated/handover.ts` copy, `playground/outline_rework_prompts.md`
draft, historical files/records) = LEFT AS HISTORICAL (maintainer call, same instruction).

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

## 36. (closed 2026-09-09) `agents_repo.md` `Environment & shell` — wrong/stale lines (lab-verified, fixed)

One-line record: the section (previously 48 lines) was validated in fresh-worker
first-shot batteries (T1–T10, pwsh + git-bash) and compacted 48→24 lines; round 2
ended 10/10 first-shot. Corrected/verified facts now in the section: `ConvertTo-Path`
does NOT exist in pwsh 7.6 (the old text suggested it — guaranteed first-shot failure);
`$env:NO_COLOR='1'` does NOT suppress ANSI codes in table output; env var `FST` value
carries a trailing `\`; bare `python` on PATH = 3.14.3 without repo deps (fake-starts,
then import-fails — always venv exe); scalar listing recipe needs `-File`; `pwd -W`
prints forward slashes. Status: closed — section committed as tested.

## 42. Multi-notch scroll-wheel events (delta ≠ ±120) are untested across all layers; the filter pins wheel phase on single-notch equality (2026-09-10, Audit 3a)

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
- **Status:** OPEN — NEW (Audit 3a exploration; entries verified from lead (b),
  independently re-derived). MAINTAINER CALL if the fix changes the gating
  behavior (aggregation vs. single-unit vs. documented drop); if the maintainer
  rules current equality gating intended, pin that decision explicitly.

## 43. `kb_env` fixture + `build()`/`down()` helpers are copy-pasted (drifted) across 6 test files — no shared conftest location (2026-09-10, Audit 3a)

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
- **Status:** OPEN — test-suite hygiene, pre-approved class (no observable
  behavior change — pure test refactoring); the `kb_env` variants' DIFFERENCES
  (SimpleNamespace vs. raw yield) must be preserved or each file migrated
  deliberately. MAINTAINER NOTE: if the maintainer prefers per-file fixtures for
  independence, close this with a "documented preference" note instead.
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

## 44. Stale/unknown focus name → uncaught KeyError in `apply_focus_groups` / `apply_start_args_by_focus_name` (the config is reloaded *before* the lookup) (2026-09-10, Audit 3b)

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
- **Status:** OPEN — MAINTAINER CALL for the chosen fallback (silent-default vs.
  surfaced error — the #1 user-visible-error solution should cover the surfaced
  variant). Overlaps: none of the open entries cover this path (#1 is vk
  resolution; #8 is the state-dict handling; this is the focus-dict lookup).
