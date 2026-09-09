# TODO — maintainer's open items

Numbering: every entry ID is UNIQUE and NEVER REUSED — used so far up to #33, new
entries start at #34 (closed IDs stay reserved in `todo_records.md`).
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

## FST behavior decisions (open — maintainer calls unless noted)

## 1. General vk resolution: unknown keys must surface to the user (tabled 2026-09-06)

- **Problem / evidence:** wherever a key string resolves to a vk_code (`convert_to_vk_code`
  + all its call sites) it should raise AND be communicated to the user — important
  feedback; today many paths fail silently or only print to console. State-shorthand
  constraints now fail-closed on unknown keys (2026-09-06, `fst_manager.py`
  `constraint_evaluation`) but still only print — fold into the general solution.
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
- **Status:** APPROVED (maintainer call this cycle) — planned as ONE cycle, scheduled
  AFTER #33.

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
  (09-10); #32 holds the root-cause record.
- **Acceptance:** the ladder fires per rung (probe: extend the bun probe — fake client +
  fake shell); one maintainer restart + a forced high-readout scenario shows the first
  nudge land; no NEW gauge-failure reasons (the silent path stays silent);
  `kind:"nudge"` evidence lines only.
- **Status:** APPROVED — NEXT BUILD (not a maintainer call — all pre-build calls resolved).

## Closed entries

Moved to `todo_records.md` on 2026-09-10 — one-line records, IDs 2, 5, 10, 12, 13, 14, 15,
16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32 (+ the 260908-0951 dedup block).
All those IDs stay reserved — see the numbering rule in the header.
