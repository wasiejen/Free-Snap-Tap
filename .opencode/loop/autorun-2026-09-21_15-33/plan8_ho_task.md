# Task: #85 part 3 — Unit 2 nudge as a passive ctx-line suffix (no resume) + Direct gates Unit 2 + Direct beats planner in scopeVerdict

Goal: fix the auto_resume Unit 2 scope bug (the live test exposed: Unit 2 re-fires on
stale armed sessions, loops, and `<|Direct|>` doesn't deactivate Unit 2 for the
planner). The fix makes the Unit 2 nudge PASSIVE — appended to the tool-call return
(the same channel as the `ctx:` line), per busy session, with NO resume (no
promptAsync). Plus: Direct suppresses the Unit-2 nudge, and `scopeVerdict` checks
the last own-line toggle first (Direct deactivates Unit 4 for the planner).

## Verified spec-time facts (do not re-derive)
- Root cause: `tick()` (L998) loops over ALL `watches` — Unit 2 fires on ANY watch
  that is `armed && idle && ratio≥threshold && autoCompact on`, with NO "current
  session" concept. So: (1) re-fires on STALE armed sessions; (2) LOOPS (the
  once-per-busy-cycle budget resets on every injected busy, and the nudge itself is
  the busy); (3) Direct only gates Unit 4 (`sendSelfCompact` never consults the
  scope verdict).
- `sendSelfCompact` (L469-498): the current promptAsync path — to be replaced by
  the ctx-line-suffix.
- `scopeVerdict` (L686): currently checks (a) the actual planner FIRST, then (b)
  the last own-line toggle. So the Direct keyword does NOT deactivate Unit 4 for
  the actual planner.
- The `ctx:` line is appended to tool-call returns (the gauge plugin). The Unit 2
  nudge should ride in the same channel.
- Baseline: auto_resume smoke 105/105, probe 241/241, pytest 459+1w, ruff F=0.

## Partial state on disk (2026-09-23, worker-12 death — planner-verified)
- Worker-12 (ses_f33ee8eabffeaE0xuwZ7lc65NR) died mid-task at the context wall
  (final step `reason=length`, output=23,156, total=170,238). No commit, smoke
  untouched, TODO untouched, no handover.
- `.opencode/plugin/auto_resume.ts` carries the COMPLETE uncommitted code-side
  implementation of change 1: the Unit-2 tick leg is removed from `tick()`,
  `onToolAfterNudge` is registered on `tool.execute.after`, the ladder (0.95
  suffix / 0.98 `--maintainer` line), the (c) scope gate (fresh `scopeVerdict`
  per nudge-eligible tool result), the `nudge=` log line with the per-busy-cycle
  dedup (reusing `w.attempts`), and the header rewrite. Planner reviewed the
  diff: complete and coherent. FIRST review it:
  `git diff .opencode/plugin/auto_resume.ts` — keep it, fix any small
  inconsistency, and verify items 2–4 of "The change" are covered (if a piece
  is missing, build it).
- The in-flight smoke section is salvaged VERBATIM at
  `.opencode/loop/autorun-2026-09-21_15-33/plan8_worker12_smoke_draft.md`
  (the unit-2 scenario setup + the DoD checks up to the cut — helpers like
  `statusEv`/`msgUpdated`/`fire`/`toolAfter`/`SUFFIX_95`/`SUFFIX_98`/`nudgeLine`
  included). Use it as the STARTING SKELETON for the smoke's new unit-2
  section; validate every check against the DoD and finish the cut tail
  (it ends mid-scenario at the "fresh busy cycle → dedup resets" arm).
- The smoke file itself is UNCHANGED (105 checks, the OLD unit-2 promptAsync
  checks that must be adapted to the passive mechanism — the draft's DoD
  checks show the intended adaptations).

## Output discipline (plan8 worker-12 lesson — binding)
- NO giant planning/design prose (worker-12 burned ~34k tokens in two
  planning messages). Write the code directly; keep reasoning short.
- Write the smoke section in CHUNKS: ≤ ~8KB (≈2k tokens) per write/edit call;
  append chunk by chunk. Run the smoke EARLY (as soon as the first
  runnable chunk is in) and fix reds incrementally — do not assemble the
  whole section before the first run.
- Read the smoke file SECTIONALLY: the helpers at the top + the UNIT 2
  section (locate it by its section markers — grep the markers first, then
  read that bounded range). NOT the whole file (worker-12's full read was
  ~60KB).

## The change (WHAT — the HOW is yours inside the DoD)
1. **Unit 2 redesign: the nudge is a passive ctx-line suffix.**
   - Drop the `sendSelfCompact` promptAsync path (no resume, no queued turn, no
     busy, no budget reset, no loop).
   - Emit the nudge as a SUFFIX on the tool-call return (the same channel as the
     `ctx:` line the gauge plugin appends), PER busy session, when
     `ratio ≥ saturationThreshold && autoCompact on`.
   - Nudge LADDER: `≥ saturationThreshold (0.95)` → "self-compact now (ratio=…)"
     suffix; `≥ 0.98` → a `--maintainer`-flagged line (e.g. `⚠⚠ --maintainer:
     context saturated at ratio=… — self-compact NOW`).
   - Multiple active workers each get their own nudge independently (per-session).
   - The nudge only fires while the session is actively working (emitting
     tool-call returns) — so a stale/idle session gets no nudge (the
     stale-session revival is gone by construction).
2. **(c) Direct suppresses the Unit-2 nudge.** When the scope verdict is `"none"`
   (Direct), the ctx-line suffix is NOT appended.
3. **(d) `scopeVerdict`: last own-line toggle checked first.** Reorder so the last
   own-line toggle is checked BEFORE the planner test: `<|Direct|>` (or no toggle)
   → `"none"` (wins over the planner test). So Direct deactivates Unit 4 for the
   planner. (Verify the current order first — if it's already toggle-first, no
   change needed; only fix if it's planner-first.)
4. **Unit 4 scope UNCHANGED** (wherever the last busy→idle happened).
5. **NO `<|Off|>`** (Direct already covers it — dropped per maintainer).

## Definition of done (measured)
- A stale armed session (armed at a high ratio, goes idle, stays armed;
  autoCompact flips on) does NOT fire (no nudge, no resume).
- A busy session at `ratio ≥ 0.95` with autoCompact on → the ctx-line suffix is
  appended (the "self-compact now" message); at `≥ 0.98` → the `--maintainer`-
  flagged line.
- Two active busy sessions at the threshold → each gets its own nudge
  (independent).
- Direct (scope "none") → no ctx-line suffix (Unit 2 suppressed) AND no Unit-4
  CONTINUE (Unit 4 deactivated for the planner).
- No `promptAsync` on the Unit-2 path (the nudge is passive).
- auto_resume smoke green (new checks: stale-armed no-fire, ctx-line-suffix at
  0.95/0.98, per-session nudge, Direct suppresses both units) + the existing
  checks still pass — with the OLD unit-2 promptAsync checks ADAPTED to the
  passive mechanism (the draft shows the intended adaptations; the other
  units' checks stay as-is). Report the final check total in the handover.
- Full gate green: probe 241/241, all plugin smokes, pytest 459 passed +
  1 warning, ruff F=0.
- TODO.md: #85 → "part 3 (Unit-2 ctx-line-suffix + Direct gates) LANDED" (the hash
  is recorded by the planner in the follow-up bookkeeping commit — do NOT write
  your own commit hash in the same commit).

## DO-NOT-touch
- Do NOT restart opencode (changes take effect on the next restart).
- The maintainer's temp fix `0f192e5` (compact_memory), the live
  `.opencode/temp/compact_budget.json`, `.opencode/maintainer/`,
  `.opencode/agent/prompts/`, the live `opencode.jsonc`.
- The #82 scope-toggle logic (built in part 1; build on it, don't break it).
  `compact_memory.ts` + `context_recovery.ts` (LANDED; untouched here).
- The Unit 4 scope (unchanged — wherever the last busy→idle happened).

## Reading discipline (his note, priority.md 2026-09-22_20-42)
Targeted reads ONLY of the named auto_resume.ts regions (L469-498
sendSelfCompact, L686-700 scopeVerdict, L986-1041 tick, L1043-1075 armEvent) + the
gauge plugin (the ctx: line channel) + the auto_resume smoke. No careless large
greps. Use node for arithmetic.

Worker: `worker_Q3S_170K` (auto_resume.ts Unit-2 ctx-line-suffix + (c) + (d) +
smoke updates).
