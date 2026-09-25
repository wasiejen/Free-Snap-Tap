# Worker summary — TODO #98 (unit-4 resume-after-compaction, Parts A+B) — FINAL

worker-16, session ses_f2741890affeDWi2GqkunKqIeX, model Qwen3.8-27B-Q3S-170K,
loop autorun-2026-09-21_15-33. 2026-09-25.

## State: DONE + GREEN — Parts A+B implemented, all gates green, Part C = not-applicable

### Done (verified, committed)

**Part A — line-anchored action regex** (commit `4f90218`):
- `.opencode/plugin/auto_resume.ts` L269→L274: `ACTION_RE` is now
  `/(?:^|\n)\s*action:\s*(restart|resume|stop|ask_maintainer)/g` —
  `action:` matches ONLY at line start (after any leading whitespace).
  The anchor group is **NON-capturing** `(?:^|\n)`, so the existing
  `found = m[1]` (the scan in `lastAssistantAction`) still reads the
  ACTION WORD, not the anchor. `lastAssistantAction` itself is
  otherwise UNCHANGED (last line-start match still wins).
- `.opencode/plugin/tests/auto_resume.smoke.mjs`: the spec's "all
  existing 133 pins stay green" required RE-PINNING, not zero changes —
  17 scripted closing messages carried a MID-LINE `action: …` (e.g.
  `"Done. action: restart"`) whose routing assertion depends on the
  match; each was moved to an OWN-LINE action line
  (`"Done.\naction: restart"`), pin intent unchanged (stop → route= stop,
  restart → spawn, etc.). Left as-is (irrelevant to their assertions):
  ses_u4_plain / ses_u2_agnet / ses_u2_agnone (scope=none — no route
  line either way), TRIG re-set L1535 + child msgA (skip= deactivated
  fires before the action scan).
- New pins (section `#98 (A)`, fresh spying client):
  - **A1**: last assistant message QUOTES `action: restart` MID-LINE
    (no own line) → NOT an action line → CONTINUE attempt 1, NO restart
    spawn (the `lastAssistantAction` null path).
  - **A2**: standalone `action: restart` on its OWN line → still the
    action word (non-capturing anchor) → restart spawn (ONE create,
    restart body).

**Part B — re-arm on a NEW ctx.log COMPACT line** (commit `cf7e6f5`):
- `.opencode/plugin/auto_resume.ts`:
  - module-level `ctxLogOffset` tail cursor (near the other module
    state; always on a line boundary — newline is one UTF-8 byte — so a
    byte offset is a character boundary; a size REGRESSION resets it to
    0).
  - `COMPACT_SID_RE = /\bCOMPACT\s+(ses_[A-Za-z0-9_]+)/` (measured line
    format `<ts> <model> COMPACT <sid> [tok=…] messages=…`).
  - `tailCompactRearm()` (directly above `tick()`): stat the sandbox-
    scoped `.opencode/temp/ctx.log`, read ONLY the new bytes since the
    cursor (`openSync`/`readSync` from the offset, the
    `trimLogIfNeeded` style), hold back a partial trailing line (no
    newline yet) for the next tick, and for each NEW `COMPACT <sid>`
    line whose sid is in `watches`: `idlePending = true` +
    `recoveryCount = 0` (a FRESH recovery budget) + a `rearm= compact
    sid=…` log line. Never throws (every fs call guarded; the tick
    wraps the call in its own try/catch too).
  - `tick()` calls it BEFORE the existing
    `for (const [sid, w] of watches)` idlePending routing loop → the
    newly-armed sid routes on the same tick (a fresh busy still clears
    `idlePending` — the existing arm path — so no double send).
- New pins (section `#98 (A)`, after A2): a synthetic sandbox
  ctx.log (NEVER the live one) with a `COMPACT <sid>` line:
  - **B1**: a watched sid's NEW COMPACT line re-arms on the next tick
    (`rearm=` line; NO fresh busy/idle event — the silent-compaction
    gap closed).
  - **B2**: the re-arm RESETS the budget — a SECOND `recovery= attempt=1`
    (NOT attempt 2 — the reset is the discriminator) → a second queued
    CONTINUE, no restart spawn.
  - **B3**: an UNWATCHED sid in the same ctx.log batch is NOT armed
    (no rearm/scope/route/recovery line for it).

### Measured verification (2026-09-25)

- auto_resume smoke: **139/139 ALL PASS** (baseline 133/133 measured at
  launch + 6 new pins: A re-factory chk, A1, A2, B1, B2, B3).
- pytest: **459 passed, 1 warning** (baseline held).
- ruff (`--select F`): **All checks passed** (F=0).
- handover probe: **291/291 PASS** (baseline held — NO probe pin
  broke; the existing probe pins use standalone `action:` lines, as the
  spec predicted).

### Commits

- `4f90218` — #98 part A: line-anchor ACTION_RE (line-start only) +
  smoke re-pins (code only).
- `cf7e6f5` — #98 part B: re-arm unit-4 routing on a NEW ctx.log COMPACT
  line (code only).
- This summary + the TODO.md #98 status update ride the FINAL commit
  (this file never carries its own hash).

### TODO entries

- #98 header → LANDED (worker-16, both commit hashes) + Status field
  rewritten with the gate numbers, the LIVE-acceptance-pending note,
  and the Part C not-applicable ruling. No other TODO.md entries
  touched; nothing appended to todo_inbox.md (no out-of-scope findings).

### Deliberately NOT done

- **Part C** (planner-owned; spec marks it not-applicable): the Work
  State dump form that Part C's premise references was removed in the
  2026-09-24 rework (the maintainer's ruling "Order-stop / Work State
  dump form: removal CONFIRMED"); no live prompt quotes a literal
  `action: restart` in dump prose, and Part A is the primary defense
  (makes C moot). The worker has no prompt edit access anyway. The
  planner records Part C = not-applicable in the handover/NAP.
- DO-NOT-touch list respected: `.opencode/maintainer/**`,
  `.opencode/agent/prompts/**`, `opencode.jsonc`,
  `.opencode/temp/compact_budget.json` (read-only reference), the other
  plugin files, the NAP. Stayed on `opencode_test` (no branch switch).
- LIVE acceptance (the next self-compact routes from the real close; a
  `recovery=`/`route=` line follows the `COMPACT` line without a user
  message in between) is PENDING live observation — out of a worker
  session's reach.

### Notes / procedure deviations

- The spec's smoke-pin clause "the new A + B pins plus ALL existing 133
  pins" was executed as RE-PINNING (the 17 mid-line scripted texts
  above) — without it the batch-A/#85/#90 pins would have gone red (a
  mid-line `action:` is no longer a match, by design). No pin was
  removed or weakened; every routing assertion kept its intent.
- `COMPACT_SID_RE` character class includes `_` (not just
  `[A-Za-z0-9]`): measured mid-implementation — a sid like
  `ses_p98_compact` truncated at the first underscore and the re-arm
  silently no-op'd (caught by a throwaway standalone probe, deleted
  after; the smoke B-pins are the permanent cover).
- Temporary debug instrumentation in `auto_resume.ts` was fully reverted
  (restored from a byte-copy; the committed file contains no DBG lines).

Lessons: smoke specs that pin routing behavior via scripted assistant
texts should state the text FORMAT contract (own-line vs mid-line)
explicitly — the regex's anchor change silently invalidates mid-line
fixtures (17 re-pins needed here).
