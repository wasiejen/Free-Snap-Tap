# WORKER SUMMARY — spec 2+11: auto_resume message relay + forced-new-session directive

Status: **LANDED** (hash recorded by the planner's follow-up). Worker worker-10
(Qwen3.8-27B-Q3S-170K), session ses_f2ae69d1cffeFqogBIbH2xyh0F, branch
`opencode_test`, one commit (scoped files only).

## What changed
1. **Item 2 — message relay** (`.opencode/plugin/auto_resume.ts`):
   - The unit-4 CONTINUE path (recovery / self-compact resume — the block that
     serves both `action: resume` and no-line recovery) now reads the stored
     queued message: `readQueuedMessage(sid)` from
     `.opencode/temp/compact_message_<sid>`. When present, the CONTINUE prompt
     text = **stored message FIRST** + the one-line addendum
     (`post-compaction: re-read your head files per
     .opencode/agent/prompts/agent_readme_post_compaction.md and CONTINUE —
     never re-plan from scratch`); otherwise the plain `continueText(sid)`.
   - New `relay= sid=` log line; the file is renamed `.consumed` ONLY after a
     successful promptAsync (a failed send keeps it for the next attempt).
   - Header comment (Unit 4 routing) updated to document item 2.
2. **Item 11 — forced-new-session directive** (`.opencode/plugin/auto_resume.ts`):
   - `restartText(sid, exhausted)`: base text byte-identical (line 1 = the
     own-line toggle, unchanged); when exhausted it appends the directive:
     "compaction budget exhausted — scan the dump of \<closing sid\> to gain
     all relevant knowledge (the auto-dump corpus; `dump_session.cjs` in
     .opencode/agent/scripts/db/ for on-demand dumps); make a clean
     handover/commit if not present; then continue per the NAP."
   - `budgetExhausted(sid)`: reads the SAME `compact_budget.json` (read-only,
     per restart-branch call) — FULLY exhausted = `count > cap` (post-item-10
     state; `count == cap` leaves the emergency available → NOT exhausted).
     Cap resolved exactly as compact_memory's `resolveCap` (CPU guard → 0,
     exact bare-model-id key of `model_budget`, else `model_budget.default`,
     else 1). Fail-open: file missing/unreadable/malformed/no entry → not
     exhausted (no directive). The directive's session id = the CLOSING
     session's sid (the budget store key — the pinned source; ctx.log not
     used).
   - The restart branch (both `action: restart` and cap-exhausted-no-line)
     computes the check, logs `budget= exhausted sid=` when true, and passes
     it to `restartText`.
3. **Narrow exception USED — minimal persistence in
   `.opencode/plugin/compact_memory.ts`**: `queueMessage` now STORES the
   non-empty `message` at queue time — one per-session file
   `.opencode/temp/compact_message_<sessionID>` (`storeMessage` +
   `queuedMessagePath`, best-effort write) — and NO promptAsync at queue time
   (the temp fix 0f192e5's disabled delivery is REPLACED by the relay, per the
   spec's "this replaces the temp fix's disabled delivery" — the commented-out
   promptAsync block was removed). Response lines UNCHANGED (the queued note
   is now true); the old "NOT queued WARNING" branch (promptAsync-unavailable
   client) is GONE — the relay is client-independent. The `message` arg
   description updated to the stored-at-queue-time / relayed-at-resume
   wording. Both call sites pass `root` (not `client`).

## Test re-pins
- **auto_resume.smoke.mjs** (121 → 129): new ITEM 2/ITEM 11 section — relay
  message FIRST + exact addendum (byte pin `stored\naddendum`), relay body
  carries the planner agent, file consumed (`.consumed`), `relay=` line;
  no-stored-message → plain CONTINUE (no addendum, no relay line); exhausted
  (count 3 > cap 2) → directive in the restart prompt (line 1 = toggle
  unchanged) + `budget=` line; count == cap → NOT exhausted → plain restart
  text. New sids added to the live-log `smokeSids` list.
- **compact_memory.smoke.mjs** (65 → 66): temp-fix 0f192e5 pins UPDATED/REPLACED
  per the spec — no-promptAsync-at-queue-time label + NEW persistence pin
  (file content exact); the no-promptAsync-client case re-pinned (message
  STILL stored, response = dispatch + queued note, the WARNING is gone).
- **handover_probe.mjs** #97 (S13): comment + label updated to the item-2
  relay wording; the byte-exact response + empty-prompt-array assertions are
  UNCHANGED — no check count change, probe annotation untouched (246/246).
  (Scope note: the "temp-fix pins" named in the spec's auto_resume.smoke.mjs
  scope item actually live in the compact_memory smoke + probe — that is
  where they were updated.)

## Verification (measured, post-edit)
- `node .opencode/plugin/tests/auto_resume.smoke.mjs` → **129/129 ALL PASS**
  (baseline at start: 121/121 — the spec's "102/102" predates the newer pins).
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` → **66/66 ALL PASS**
  (baseline 65/65).
- `node .opencode/plugin/probes/handover_probe.mjs` → **246/246 PASS**
  (baseline 246/246).
- pytest **459 passed + 1 warning**, ruff **F=0** (baseline run at start; no
  Python files touched since).
- Live maintainer files untouched (uncommitted `opencode.jsonc`, `AGENTS.md`,
  `prompt_agent_task.md`, `agent_feedback.md`, loop_log.md, ideas.md —
  excluded from the commit).

## What the #93 (context_recovery) port MUST carry
- **The limit-run detection** itself (the context-length-exceeded fire) —
  out of scope here; this spec lands only the condition check
  (`budgetExhausted`: count > cap from the shared budget store) + the
  directive construction (`restartText(sid, exhausted)`).
- **The directive hand-off**: when the forced new session fires from a
  fully-exhausted budget, the new planner's start prompt must carry the SAME
  forced-new-session directive (scan the dump of the last session —
  `dump_session.cjs` — make a clean handover/commit if not present, continue
  per the NAP) — the auto-side must reuse the `budgetExhausted` +
  `restartText` logic (mirrored, not duplicated by divergence).
- Also from the item-10 spec: the auto-side emergency-1 consumption (count ==
  cap → consume the 1 WITHOUT the arg; count > cap → refuse/defer to the
  forced-new-session) still rides that port.

## Deliberately not done
- No limit-run detection / no context_recovery changes (the #93 port owns it).
- No budget-file edits (maintainer live); no ctx.log-based exhaustion source
  (the budget store is the pinned source).
- No TODO.md change (status lives in the spec + planner bookkeeping, per spec).

## Friction
- The spec's auto_resume smoke baseline (102/102) was stale at launch (live:
  121/121) — harmless (green), but the launch baselines should be re-measured
  at spec time, not carried forward.
