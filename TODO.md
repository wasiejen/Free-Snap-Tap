# TODO — maintainer's open items

## 1. General vk resolution: unknown keys must surface to the user (tabled 2026-09-06)

Wherever a key string is resolved to a vk_code (`convert_to_vk_code` and all its call
sites), an unknown key should raise an error and be **directly communicated to the
user** — it is important feedback, and many paths today fail silently or only print
to console. Needs a **general** solution covering every vk-resolution site, not
per-call-site fixes.

Related: state-shorthand constraints now fail-closed on unknown keys (2026-09-06,
`fst_manager.py` `constraint_evaluation`) but still only print — fold into the general
solution. Unknown constraint *names* are silent no-ops by design (see
`SPEC_FEATURES.md` §4 #2 decision).

## 2. Fix the 6 ruff `F` findings — cosmetic only, no behavior change (2026-09-07)

`ruff check --select F .` baseline has 6 findings; fix them (remove unused imports/vars,
clean up the f-strings) — none may change program behavior. Keep the suite green after.
List: free_snap_tap 2×F541 (f-strings), fst_manager F401 (`threading.Event` import),
fst_overlay F401 (`QSizePolicy`) + F841 (`cube_distance_down`), playground/pynput_mouse_probe F841.

## 3. Rework README and WIKI to the current state of the code (2026-09-06)

Full gap matrix + decisions made 2026-09-06 in `SPEC_FEATURES.md` sections 2–4.
Known doc fixes include: WIKI "played in its own thread" → asyncio tasks (§4 #5),
`|(name)` per-type semantics (§4 #6), `dc()` sign has no effect (§4 #9), README/WIKI
V1.1.3 → V1.2.0 references, "Python 3.6" vs 3.12 venv, typos (§4 #12), replacement-side
key reinterpretation in Key rebinds + quoted key strings inside `p(...)` (§4 #14),
eaten-rebind suppression semantics + `a|(p("shift")) : b` pass-through pattern (§4 #14).

## 4. Dead code: `fst_manager.py` 116–117 ("None result → pass") unreachable (2026-09-07)

`check_constraint_fulfillment`'s "None → pass" branch (line 117) can never run:
`constraint_evaluation` normalizes `None` → `True` (line 692) before returning. Triage
(`COVERAGE_TRIAGE.md`) classified it as class A — reclassification to C is your call, the
plan file is agent-read-only. Line 117 stays uncovered in every run.

## 5. Lint baseline 6 → 8 at `ca61a26`, restored at `0025a57` (2026-09-08)

Two new F401s (unused `SimpleNamespace`) in `test_control_actions.py` /
`test_facade_wiring.py` (+1 in the then-untracked `test_macro_playback_kbd.py`) broke the
6-finding baseline; `0025a57` removed the three imports — baseline restored.

## 6. Dead code: `fst_keyboard.py` 302–303 (mixed-Key rebind conversion) unreachable (2026-09-08)

In `initialize_groups_from_presorted_lines`, `convert_key_string_group` only ever appends
`Key_Event`s (bare keys expand to press/release events), so `new_trigger_group[0]` is never
a `Key`; the block at line 295 is entered only via a `Key` replacement — which makes line
301 `False`, so 302–303 (`replacement_key = Key(...)`) can never execute. Proven at
`fffea8b` (rebinds `w : e` and `w : +e` both leave 302–303 uncovered). Triage listed them as
class A ("mixed Key rebind `w : +e`") — same misclassification as entry #4. Also: triage's
numeric example `"8" → 8` is wrong — `"8"` resolves via the dict to 56; the numeric branch
needs a string absent from `vk_codes_dict` (e.g. `"255"`).

## 7. Empty macro: comment/behavior mismatch at `fst_keyboard.py` 707 (2026-09-08)

The comment says an empty key group is ignored and does "not supress the triggerkey", but
`alias_fired = True` (line 697) is set before the empty check, so the trigger key IS
suppressed (`_listener.suppress_event`, verified by `test_empty_macro_sequence_no_playback`).
Either the comment or the behavior is stale — your call.

## 8. `ap`/`ar` "all keys (incl simulated)" state is not a union — last-write-wins shared dict (2026-09-08)

`ap(...)` is documented as "press of all keys (incl simulated)" (`fst_manager.py` 253–256),
but `set_real_key_press_state` (1611–1614) and `set_simulated_key_press_state` (1622–1625)
both write the shared `_all_key_press_states_dict` last-write-wins — a release from either
side clears the `all` state even if the other side's press is still active, so `ap` may not
behave as "real OR simulated". Found during the interrupted Phase-5 run (it explains the
1630–1632 KeyError coverage gap; the run noted it only as a test-design remark). Also
asymmetric: `set_real_key_press_state` lacks the `vk_code > 0` guard the other two setters
have. Confirm intended semantics (or fix).

## 9. Repeat-constraint excepts too narrow for malformed `repeat_thread_dict` entries (2026-09-08)

`toggle_repeat` (327), `is_repeat_active` (340), `reset_repeat` (350) catch
`(KeyError, AttributeError)`, `stop_all_repeat` (365) only `AttributeError` — but unpacking
an entry that is not a 2-tuple raises `ValueError`, which is uncaught and would propagate
out of `constraint_evaluation`. Noted during the interrupted Phase-5 run while writing the
coverage test for 365–366. Low severity: entries are only written by `start_repeat` (301)
as 2-tuples `[task, handle]`. Decide whether to harden the excepts or leave as-is.

## 10. `fst_overlay.py` 549: deprecated `QMouseEvent.globalPos()` (2026-09-08)

Every `pytest -q` run emits the `DeprecationWarning: 'QMouseEvent.globalPos() const'` from
`fst_overlay.py:549` (12-warning baseline noted in the Phase-5 run). Replace with the Qt6
API (`event.position()` / `globalPosition()`) — cosmetic, no behavior change; same spirit
as `TODO.md` #2.

## 11. General contradiction prevention still disabled (XXX 241016-1101, `fst_keyboard.py` 791) (2026-09-08)

`###XXX 241016-1101 general contradiction prevention disabled to test` — the 793–803
contradiction block of `_win32_event_filter` no longer suppresses (`to_be_suppressed` is
not set), and the Phase-5 tests (`tests/test_filter_simulated.py`) now pin that
non-suppression. Clarify + document as final decision: if it stays off, reword the
XXX/"to test" comment so it reads as an intentional decision; if it was meant to be
reenabled, that is the call.

## 260908-0951 copied from NAP - to be sorted in and dedubled:
1. **Triage misclassification: `fst_manager.py` lines 116–117 (`check_constraint_fulfillment`,
   class A "None result → pass") are unreachable.** `constraint_evaluation` maps `None` →
   `True` (`fst_manager.py:691`) before returning, and no other branch returns `None` — the
   `pass` body (line 117) can never execute. It is dead code (class C), not testable-A. The
   triage's 2098/2217 (94.6 %) ceiling is therefore 2097/2217 ≈ 94.6 % — same rounded
   number, but line 117 will remain uncovered in every run. Recorded in the `2007698`
   commit message at discovery; `COVERAGE_TRIAGE.md` is read-only here, reclassifying 117 to
   C is the maintainer's call — ask him, don't edit the plan file.
2. **Lint baseline regressed 6 → 8 at `ca61a26`** (DoD says "exactly 6"): 2×F401
   (`SimpleNamespace` unused) in `test_control_actions.py` / `test_facade_wiring.py`, plus a
   3rd in the untracked WIP file. Fix = delete the three import lines (Next steps 1-2) —
   restores the 6-finding baseline.
  3. **C-class lines covered as by-products** (as the triage anticipated): `fst_keyboard`
   795/799/804 (via a `DEBUG2` flip in `d94af46`) and `fst_manager` 341 (via a `DEBUG3` flip
   in `99b5e37`). They were C but no longer miss — expected remaining C: `fst_manager` 85,
   `fst_keyboard` 26, `fst_data_types` 4, plus `fst_overlay` 589 (offscreen-by-design `exec_`).
   Expected state confirmed by the `fffea8b` coverage run.
4. **Found 2026-09-08 (`fffea8b`): `fst_keyboard` 302–303 are unreachable dead code** —
   triage classed them A (recipe `w : +e`): `convert_key_string_group` only ever appends
   `Key_Event`s, so line 297 (`not isinstance(new_trigger_group[0], Key)`) is always true and
   the line-295 block is entered only via a `Key` replacement — which makes line 301 false,
   so 302–303 can never run. `TODO.md` #6. Also found: the empty-macro comment at 707
   contradicts the behavior (`alias_fired` suppresses the trigger anyway) — `TODO.md` #7.

## 12. v1.1 task spec "exactly 5 lines" is off-by-one against its own payload list (2026-09-08)

`.opencode/handover_task.md` (v1.1) asks the probe log to "end with exactly 5 lines" from the
payloads `message.part.delta` x3, `message.updated` x1, `plugin.added` x1, `tool.before` x1,
`tool.after` x1 — with the delta filter that deterministically yields **4** log lines. The
offline probe therefore asserts 4 lines plus all-synthesized-absence. Off-by-one on the
spec side, not the filter; the invariant to reuse in v2 tasks is "one line per unskipped
payload", not a hard-coded count.

## 13. `.opencode/plugin/handover.ts` header still self-labelled "v1" (2026-09-08)

After the v1.1 delta-filter patch the line-1 header comment still reads "Handover plugin v1
— log-only observer" while the commit subject is v1.1. Left verbatim because the patch was
deliberately minimal ("that is the ONLY behavioral change"). Cosmetic; update the label —
and re-check the "log-only" tag as behaviour accumulates in v2 — whenever.

CLOSED (planner, 2026-09-09): the v2/v2.2 header rewrite already replaced the v1 label; this
commit lands the v2.2.2 + v1.3 header notes in the same file.

## 14. ctxgauge injection: `experimental.chat.system.transform` exposes no agent identifier — line omitted, evidence-logged (2026-09-08)

v2 (Phase 6 / Tier 1, deliverable 4) implemented the transform hook with the pre-set
planner-call from its task file: if the payload exposes no clean agent identifier, DO NOT
inject for all agents — omit the line and record a design-flag. Evidence:
- SDK types (`@opencode-ai/plugin` 1.18.29, `.opencode/node_modules`): transform input =
  `{sessionID?: string; model: Model}` — no `agent` field (read from source per the task;
  offline probe can only exercise synthetic shapes, never the live payload).
- Identifier convention from the live v1 log (v1.1 summary evidence): assistant-message
  `message.updated` lines carry `info.agent` = config agent name (`planner_120k_mtp` /
  `worker_120K_mtp`) — but it is unproven that opencode hands the transform call one.
- v2 therefore registers the hook, evidence-logs the raw payload as `kind:"transform"`
  lines in `plugin.log`, and gates on `agent.toLowerCase().startsWith("planner")` — the exact
  shape observed live in v1 logs, so if the identifier DOES arrive the injection fires with
  zero code change. Otherwise: line omitted, no throw (offline-verified). The post-restart
  planner reads one turn's worth of `transform` lines → the identifier question is answered
  by log, not by guessing.

Follow-up (planner call, after restart+log-read): choose a different planner-only signal —
the spec forbids inject-for-all; nothing was added on that front by v2.

## 15. Instruction conflict: AGENTS.md plan-state pre-commit vs worker's "do not touch handover_planner.md" (2026-09-08)

AGENTS.md §Commit routine, step 1 says update the plan-state file BEFORE committing; the
Phase-6 worker task said instead, flat out: do not touch `.opencode/handover_planner.md`. The
v2 implementation resolved it: worker updated the stamp + one status bullet under
`## Live status` only, folded into the worker's own single commit (no separate plan-state
commit — bookkeeping stays the planner's). If the maintainer meant "never, under no worker",
this entry is the correction point — decide which instruction wins and make it explicit, the
conflict recurs with every delegated handover.

## 16. v1.2 byte-budget spec arithmetic mismatch + literal "< 4 KB" mixed-window budget infeasible (2026-09-08)

The v1.2 task file's byte-budget scenario is self-inconsistent: it says "feed 190 events
(10 per each of the 10 skipped types + 10 per each of 5 retained types …)" — the described
composition is **150** events (100 + 50), and `message.part.delta` appears in **both** the
skip set (v1.1 filter) and the task's own "retained" list. Additionally, "assert total log
bytes for this scenario < 4 KB" is infeasible as a mixed-window total: the 40 retained lines
that MUST be logged floor at ≈ 4.8 KB of JSON chrome alone (measured: 7,980 B retained window
byte-identical before/after the edit) — the check failed against the UNCHANGED v2 code as well
(25,330 B BEFORE mixed window). Worker measured (Electron Node 24.15.0 probe, temp sandbox
root, 150-event composition as listed in the task):
- BEFORE (v2 code): cascade window 17,350 B (90 lines — the residual growth bug) + retained
  7,980 B = 25,330 B mixed.
- AFTER (v1.2): cascade window **0 B** (all 100 cascade events skipped) + retained 7,980 B
  (writer byte-identical) = 7,980 B mixed.

Planner call: define the budget target — the cascade-only window meets "< 4 KB" (17,350 B →
0 B) — or the mixed-window total needs a different threshold — and settle the 190 vs 150
event count.

Resolved (planner, 2026-09-08, same day): budget target = **cascade window 0 B** (met);
the "< 4 KB mixed-window total" was spec arithmetic, not a code target — no code change
from it. See #17 for the cycle measurement.

## 17. plugin.log: delegation-cycle events from CHILD sessions flow through; `file.*` types not in the v1.2 skip set (2026-09-08)

Cycle measurement under the OLD profile (v1.1 + v2, live until the v1.2 start), this
post-restart session: the v1.2 delegation cycle (planner's own calls + 1 worker
delegation, worker ≈ `worker_120K_mtp`) grew the log to **1036 lines / 571 KB in 5 min
(≈0.9 KB/s sustained — the maintainer's "rapid growth" complaint, quantified)**.
Breakdown by source session: the worker (CHILD) session contributed **573 lines ≈ 47 %**
— every event fired inside a delegation lands in the same plugin.log. Newly SEEN event
types in that window that are NOT in the v1.2 skip set (v1.2 therefore does not silence
them): `file.watcher.updated` ×41, `file.edited` ×7 (both with empty/minimal
`properties`), `session.idle` ×1 (a distinct event type — NOT covered by the v1.2 skip of
`session.status`). Evidence: the pre-v1.2-start lines of `.opencode/plugin.log` (scratch,
gitignored — the per-type × per-source tally survives as this entry until the maintainer
wipes the log). Post-start follow-up: the next planner session measures the v1.2 profile
and decides **v1.3** = silence the residual `file.*` cascade + `session.idle` (expect it
as the next-biggest chunk; it is one line per type in the skip set — decide with data, do
not pre-empt). Also record if measured growth under the old profile shows file.watcher as
the single biggest residual contributor.

## 18. ctxgauge injection: maintainer 'both' decision — gate removed (v2.2) (2026-09-08)

Decision 2026-09-08: inject the `ctx:` gauge line for ALL sessions (planner + workers);
this is the formal override of the v2 'planner-only, never inject-for-all' design note
and supersedes the v2.1 root-only session-graph spec (archived at
`.opencode/archive/260908-v21-session-graph-spec.md` — now void as code). Accepted
caveat (on record, from planner measurement): `peek.py` takes no session id — it reads
the most recently updated session's last FINISHED message from opencode's sqlite DB, so
an injected number can be another session's (adjacent-stale); accepted — the line is a
reminder, not a control. Companion call (SEPARATE, maintainer): add a stop-line rule to
`prompt_agent_task.md` so workers act on the line — not in v2.2, not decided.

## 19. `handover.ts` v2.2: inline comment above `onSystemTransform` now stale — left verbatim (minimal-diff spec) (2026-09-08)

The comment block directly above `onSystemTransform` (the v2 "ctxgauge injection" note)
still reads "if none arrives, the line is omitted (planner-only, decided call, never
inject for all). See TODO.md #14" — contradicted by the v2.2 change (the gate is removed;
the file-header v2.2 note states the override). Left verbatim because the task mandated
exactly four edits (minimal-diff, same pattern as #13). Rewire it (or leave as
historical record) — worker did not touch it.

## 20. Persistent offline probe + exact executable pinned (2026-09-08)

Offline Electron probes used to be scratch: rebuild from memory + re-discovering the
Electron executable cost a full cycle ≈10 min + a large context slice. The harness is
now permanent at `.opencode/plugin/probes/handover_probe.mjs` with the exact run
command + pinned executable in its header — future plugin task specs run it, never
rebuild it (exception: plugin hook-surface change). Also resolves #19 (stale v2
comments rewritten per the v2.2 'both' decision; comment-only edit, 23/23 both sides).

## 21. `ctxgauge/peek.py` crashes with TypeError on a fresh session (2026-09-08)

First gauge run of the v2.2 worker-proof worker session failed with
`TypeError: cannot unpack non-iterable NoneType object`: it crashes when the newest
session has no *finished* assistant message yet (fresh subagent start — the in-flight
message carries no `"finish"` field, so the `like '%"finish"%'` query matches nothing
and `fetchone()` returns `None`). Second run (after the first turn persisted) works.
Also written against the old opencode.db schema: `session.model` is now a JSON column
(`{"id":"Qwen3.8-27B-IQ3KT-120K_MTP",...}` on opencode 1.18.29); the 120K-window regex
happens to work on the raw JSON (it finds `-120K` in the id) but matches by accident.
Guard the `None` row and parse the model id explicitly — or point it at `session_message`/
v2 schema.

## 22. v2.2 worker-proof task spec: plugin log path wrong (2026-09-08)

`.opencode/handover_task.md` (phase 6 worker proof) points at `.opencode/plugin/plugin.log`;
the log actually lives at `.opencode/plugin.log` (the `plugin/` directory holds only
`handover.ts` + `probes/`). Doc-only mismatch — measured against the real path.

## 23. v2.2 worker-side proof result: `ctx:` line NOT FOUND in worker prompt (2026-09-08)

The worker subagent session's system prompt carried NO `ctx: CTX=…` item (searched the
full prompt: worker role text, env block, AGENTS.md instructions, skills list — absent),
while `plugin.log` shows 23 LIVE `kind=transform` entries for that session
(`ses_f7d9e3249ffebZTCKtnsEL4YHn`, created 18:57:22.872Z, transforms 18:57:22.984Z →
19:01:26.857Z). So the hook fired for the worker session but the line never surfaced
to the worker model — either `onSystemTransform` does not apply to subagent model
invocations, or the injected line is not carried to them. Untouched per task (measurement
only). Maintainer call: investigate the transform scope or accept workers are lineless.

CLOSED (planner, 2026-09-09, data: the 09-09 opencode start segment's `kind:"gauge"`
evidence lines): not a transform-scope issue — the gauge READOUT was failing every time.
Start segment: 23× `shell-missing` (electron-era segments — `PluginInput.$` absent there)
+ 47× `no-ctx-output`, preview `Error: Please use '$' as a tagged template function: ...`
(terminal/CLI era — the v2 function-call command shape `shell.cwd(d)(string)` is rejected by
the live BunShell, which wants a tagged template). Root cause = the gauge call shape, not the
transform hook. Fixed v2.2.2 (tagged-template call) — see #29. Remaining: one opencode start
with zero new gauge-failure lines + the `ctx:` item visible in the agents' prompts.

## 24. Fixed: `ctxgauge/peek.py` fresh-session crash + model-id parsing (TODO #21, code side closed) (2026-09-08)

Planner direct fix (work-mode call: small meta-file fixes are the planner's). `peek.py` now
falls back to the latest FINISHED message overall when the newest session has none yet
(`fetchone() -> None`), and prints `CTX=0 (0%) REM=<window>` if no finished message exists at
all; the model id is parsed from the `session.model` JSON `id` field instead of the
coincidental raw-JSON regex match. TODO #21's v2-schema-migration note stays open for when it
actually breaks.

## 25. opencode.jsonc: planner edit-permission scratchpad pattern still `/tmp/**` on win32 (2026-09-08)

`0bd75bf` moved the `external_directory` allow + the `references.scratchpad` path to
`C:\Users\Wasiejen\AppData\Local\Temp\opencode`, but the planner agent's
`permission.edit` allow pattern is still `/tmp/**` — write attempts to the scratchpad are
denied on win32. Update the pattern to the same Windows path.

CLOSED by #26 (`6523406` replaced the old planner permission block wholesale).

## 26. Fixed/closed #15 (+ #25): worker does not touch `handover_planner.md` — deny enforced + prompt clause (2026-09-08)

Maintainer call (2026-09-08): `.opencode/handover_planner.md` belongs to the planner;
workers never edit or commit it. Made explicit in `prompt_agent_task.md` (planner-owned,
leave dirty copies alone + flag) AND structurally: all three worker `permission.edit`
scopes carry `".opencode/handover_planner.md": "deny"` (`opencode.jsonc` @ `6523406`,
same commit removes the old planner deny-map incl. the TODO #25 `/tmp/**` pattern → #25
closed by this entry too; scratchpad now plain Windows temp dir on win32 + on `bash`, and
AGENTS.md pre-commit plan-state routine applies to the planner's own commit only —
workers commit code + TODO.md + their task files).

## 27. v2.2.1 gauge-failure evidence log landed — follow-up = one opencode start (2026-09-08)

Worker delivered per its handover spec ("gauge-failure evidence logging"):
`handover.ts onSystemTransform` appends ONE `kind:"gauge"` line per failed readout or per
ok-but-uninjectable readout (`output.system` not an array); the ok+injected path stays
silent. Stable reason vocabulary: `shell-missing` | `timeout` | `no-ctx-output` (carries
`preview` = raw output or error text, trimmed ≤ 120 chars, omitted when empty) |
`system-not-array`; session id included. In-scope judgment: a BunShell SPAWN failure (the
task's branch-(a) suspect — relative path + cwd) surfaces as `no-ctx-output` with the
ERROR TEXT in `preview` — the fixed 4-reason vocabulary has no spawn reason and `preview`
is the only evidence field; spawn failures stay distinguishable in the log from non-`CTX=`
output by the preview content. Probe extended 23 → 28 checks (S4 = 9 shapes; tallies now
include gauge==7): pre-run old probe vs v2.2 = 23/23 PASS, post-run new probe vs v2.2.1 =
28/28 PASS. **OPEN follow-up (planner, after ONE opencode start):** read the
`kind:"gauge"` lines in `.opencode/plugin.log` → identify the #23 silent-failure branch
(spawn error / timeout / non-`CTX=` output / `system-not-array`, or ok+injected ⇒ #23
false alarm ⇒ escalate to transform-drop).

CLOSED (planner, 2026-09-09): the one opencode start happened (the 09-09 terminal/CLI
start); its `kind:"gauge"` lines named the branch — no-ctx-output + BunShell
tagged-template error preview (plus the earlier shell-missing era). See #23/#29.

## 28. `handover.ts`: `GAUGE_CMD` constant declared but unused (v2 leftover) (2026-09-08)

`.opencode/plugin/handover.ts` line 63 declares `GAUGE_CMD = ".venv/Scripts/python.exe
.opencode/ctxgauge/peek.py"`, but `gaugeReadout` calls the same literal inline — the
constant is dead (pre-existing since the v2 readout; the v2.2.1 cycle left it verbatim per
the minimal-diff hard limit). Wire the constant into the readout or delete it — cosmetic,
maintainer's call.

CLOSED (planner, 2026-09-09): GAUGE_CMD was already removed in the b8ea40b cycle
(default-approved cleanup; the current file carries no GAUGE_CMD constant — verified against
the live file, probe 28/28). Entry left open by oversight in that cycle.

## 29. Environment change: opencode Electron → terminal/CLI + full system Node.js; BunShell `input.$` is the gauge host (2026-09-09)

Maintainer switch (announced 2026-09-09): the Electron `opencode.exe` install is GONE —
opencode now runs as the terminal/CLI, with a full system Node.js on PATH
(v24.19.0 + npm 12.0.2 measured). Consequences, evidence-based from this session:

1. **The plugin input `$` IS a live BunShell under the new host — but tagged-template only.**
   `shell.cwd(d)(commandString)` is rejected with `Error: Please use '$' as a tagged template
   function: $`cmd arg1 arg2`` — exactly the 09-09 start segment's 47 `no-ctx-output` preview
   lines. This IS the v2 ctx: missing line (closed TODO.md #23 + #27): the v2 readout used a
   plain function call; the live host (unlike the electron host that simply LACKED `input.$`,
   giving the 23 `shell-missing` lines) wants the command as a tagged template.
2. **Fixed v2.2.2 (this commit):** the `ShellLike` call shape + `gaugeReadout` now use the
   tagged-template form `` shell.cwd(dir ?? "")`<cmd>` ``; the probe's fake BunShell mirrors
   the live rejection (a regression to the string-call form now FAILS the probe's S4 ok-shapes
   instead of passing silently). Probe run command switched from the pinned electron exe to
   system `node` (node >= 24 does the same native TS type-stripping).
3. **Landed maintainer approvals (2026-09-09):** worker stop-line rule appended to
   `prompt_agent_task.md`; v1.3 skip-set extension landed in handover.ts
   (`file.watcher.updated` + `file.edited` + `session.idle`; `message.removed`/`session.*`
   stay logged as signal — the v1.3 log-growth measurement rides the NEXT start).
4. **OPEN: one more opencode RESTART (the v2.2.2 proof start)** — expect ZERO new
   `kind:"gauge"` failure lines for the ok shapes (readouts now ok ⇒ the injected
   `ctx: CTX=… REM=…` items should be visible in planner AND worker prompts; the old
    worker-proof delegation can quote the line). Also measures the v1.3 log profile.
    FST code is NOT part of any of this (434 passed / ruff 6 untouched).

CLOSED (planner, 2026-09-09 — proof start performed): the worker one-shot quoted its own
prompt verbatim — `ctx: CTX=43423 (36%) REM=76577` — and the planner's own prompt carried
`ctx: CTX=13837 (12%) REM=106163`: injection proven on both sides with NO plugin.log read
(a failed readout injects nothing — line presence entails readout-ok). The zero-new-gauge-
failure + v1.3-profile half is UNMEASURED: maintainer constraint (2026-09-09, standing) —
do NOT parse/work on plugin.log; the v2.x digs on that file LOOPED (maintainer counted
4-5 repetitions) and the reading stays a one-shot MAINTAINER CALL (NAP). Fire scope
confirmed by the maintainer the same day: the transform fires at session creation / first
round ONLY — no per-turn re-fire — and a worker's number = the planner session's
last-updated snapshot (the #18 caveat, behaviorally confirmed — the worker's 43423 equals
the planner's own peek at worker-creation).

## 30. Replace the peek.py shell-out with an in-plugin `node:sqlite` read (maintainer task, 2026-09-09)

Integrate the context-gauge lookup directly into `.opencode/plugin/handover.ts` using
Node.js's built-in `node:sqlite` (probe node here v24.19.0, system CLI host — confirm the
module is exposed there; it was absent in the electron host's older node) instead of the
`$`-tagged-template shell-out to `.venv/Scripts/python.exe .opencode/ctxgauge/peek.py`
(currently `handover.ts` ≈line 301). When landed:
1. the need for `peek.py` is OVER — delete `.opencode/ctxgauge/` (or keep the file only if
   the maintainer prefers it as a standalone CLI fallback — his call).
2. Purge the peek.py usage references in the agent-facing docs: `AGENTS.md` (context-budget
   section + module map — edit a COPY per AGENTS.md's own rule, maintainer replaces the file)
   + `prompt_agent_planner.md` + `prompt_agent_task.md`.
3. **Beyond those, de-peeking ripples into:** the v1.3 skip-set landing (TODO #29.3 — it is
   still gated on the proof start, so landing de-peek first re-baselines the gauge's host;
   probe's S4 fake-shell gauge shapes must be rebuilt per the TODO #20 exception) — so de-peek
   landing and the v1.3 start measurement should be planned as one cycle, not two.
4. The gauge's sqlite access replaces peek.py's old-schema fragility (TODO #21/#24: v2-schema
   migration was parked) — write the read against the CURRENT opencode.db schema (`session` /
   message token JSON, model id from `session.model`'s `id`) and guard the fresh-session case
   the same way peek.py does (no finished message ⇒ `CTX=0`, never throw into the transform).

Carried-over maintainer note, UNVERIFIED, from the 2026-09-09 dirty `peek.py` diff (now
committed with this entry): "should total not be the most current total token number? output
should be the generated tokens for the last message so it should be substract output from
total" — i.e. `total - output` may already be the right readout, or the token JSON may mean
something different. CHECK BEFORE wiring the same arithmetic into handover.ts; record the
verified meaning of the token fields in the entry when done.
