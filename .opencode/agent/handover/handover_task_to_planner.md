# Worker summary — spec 10: the emergency-1 compaction budget (change-list item 10)

Status: DONE (LANDED per spec — commit hash recorded by you in the follow-up
bookkeeping, not by me).
Commit: this worker commit (branch `opencode_test`, named-path — the three scoped
files + this summary). Runs AFTER item 1 (7f253ea) — written against the
post-item-1 state.
Worker session: `ses_f2b2edff1ffe60GXyVJGzKg17Z` (worker, Qwen3.8-27B-Q3S-170K).

## What changed

1. `.opencode/plugin/compact_memory.ts`
   - config section: new top-level key `emergency_budget` (number >= 0, fail-open
     default `DEFAULT_EMERGENCY_BUDGET = 1`) in the `CompactionConfig` type, the
     defaults, and the budget-file parsing — parsed exactly like the other keys
     (absent file / malformed key → default 1). The header config comment lists it.
   - gate (`count >= cap` area): four states, per the pinned design —
     - `count < cap` → dispatch normally (increment).
     - `count === cap` AND `args.emergency === true` AND `emergency_budget >= 1`
       → dispatch as EMERGENCY (increment to cap+1; `isEmergency` flag).
     - `count === cap`, no `emergency` arg (and emergency available) → refuse:
       existing text + one line "…available via the `emergency` argument."
     - `count > cap` (or `count === cap` with the emergency unavailable / already
       consumed) → refuse: existing text + one line "…unavailable or already
       consumed — the budget is fully exhausted." (the item 11 directive state).
     - NO store-schema bump: the count tracks it (count > cap = exhausted).
   - tool schema: new arg `emergency: tool.schema.boolean().optional()` — args are
     now exactly `[sessionID, keepMessages, message, emergency]`; description
     string gained the one-sentence emergency budget note.
   - success callbacks (both the v2 compact and the ACTIVE v1 summarize path):
     `recordSuccess` unchanged (increment-on-verified-success) +
     `appendCompactLine(…, isEmergency)`.
   - `appendCompactLine`: new `emergency = false` param — the COMPACT line appends
     ` emergency` after `messages=<m>` only when the emergency was consumed
     (`… COMPACT <sid> messages=<m> emergency [(pre-readout)]`); normal lines are
     byte-identical to before.
   - header comment (Part 2 budget section): the emergency-1 design + the
     auto-side note documented (see the #93 carry-over below).

2. `.opencode/plugin/tests/compact_memory.smoke.mjs` — re-pinned (57 → 65 checks):
   - header comment + registration pin → FOUR keys
     `[sessionID, keepMessages, message, emergency]`.
   - NEW gate-sequence section (8 checks, fixture model_budget `{"Gate-M": 2}` +
     `emergency_budget 1`, cross-read session):
     - calls 1-2 dispatched (count 2 == cap);
     - call 3 no-arg REFUSED (cap 2, 2/2, hand-over note + the `emergency`-arg
       availability line, zero side effects);
     - call 3 `emergency: true` DISPATCHED (count 3 == cap+1) + the COMPACT line
       carries ` emergency` (pinned byte-exact `messages=2 emergency$`);
     - the two normal lines carry NO ` emergency` suffix;
     - call 4 `emergency: true` REFUSED (count 3 > cap 2 — fully exhausted);
     - state survives a FRESH module instance (cache-busted re-import still
       refuses — the count lives on disk);
     - `emergency_budget 0` → call 3 refused (unavailable);
     - key ABSENT → fail-open default 1 (the emergency IS consumed).
     - The fixture (model_budget / emergency_budget) is saved + restored before the
       later tests (their self-model cap-3 pins survive).

3. `.opencode/plugin/probes/handover_probe.mjs` — S13/S25 re-pinned (241 → 246
   checks; the annotation line + S13 header count updated to match):
   - registration pin (check 86) → 4 keys `[sessionID, keepMessages, message,
     emergency]`.
   - NEW checks 222-226 in S13 (the gate-sequence test, fixture model_budget
     `{"Gate-M": 2}` + `emergency_budget 1`): 222 calls 1-2 ok + call 3 no-arg
     denied (availability note); 223 call 3 emergency ok (count cap+1, COMPACT
     line ` emergency`, normal lines suffix-free); 224 call 4 emergency denied
     (fully exhausted) + fresh-module-instance persistence (cache-busted
     re-import, the check-73 pattern); 225 `emergency_budget 0` denied; 226 key
     absent → default 1 consumed.
   - FINGERPRINT array: the new synthetic ids (ses_qc_emg / ses_qc_emg0 /
     ses_qc_emgdf) added (check 43).
   - S25: "3-key args" → "4-key args" in the section header, the tool-path
     preamble comment, and check 256's label (its assertion pins the body,
     unchanged).
   - **S10/S11 left byte-identical** (they pin the frozen artifacts — the spec-01
     carve-out).

## Verification (measured)
Baseline re-run at start (pre-change): probe `241/241 PASS`, smoke `57/57`,
pytest `459 passed, 1 warning`, ruff F=0 — all green.
Post-change (full gate):
- probe full run: `PROBE handover: 246/246 PASS` (annotation line updated to
  S13=19, total 246 — matches the self-annotated output).
- compact_memory smoke: `COMPACT_MEMORY_SMOKE: ALL PASS (65/65)`.
- pytest: `459 passed, 1 warning`.
- ruff `--select F`: `All checks passed!`.

## #93 CARRY-OVER NOTE (required by the spec)
The auto side of the emergency-1 logic is DESIGN ONLY on this build:
`.opencode/plugin/deactivated/context_recovery.ts` is DEACTIVATED (its frozen
smoke pins `tests/context_recovery.smoke.mjs` stay untouched, per the spec's
DO-NOT-touch). When the #93 event-hook port writes the live file, it MUST
implement the same count logic WITHOUT the arg requirement: on its overflow
fire — `count < cap` → consume normally; `count === cap` AND the emergency
available (`emergency_budget >= 1`) → consume the 1 (its blind compaction, keep
per its own config); `count > cap` → refuse / defer to the forced-new-session
(item 11 spec). The live plugin's header comment (Part 2 budget section)
documents this. NOTE: the auto-side consumption would also need the
`appendCompactLine` ` emergency` suffix (the deactivated file has its own line
writer — the port must mirror the pinned format).

## Deliberately NOT done
- `.opencode/plugin/deactivated/context_recovery.ts` + `compact_memory_v1.ts`
  (DO-NOT-touch — the emergency-1 auto side rides the #93 port, see above).
- `.opencode/temp/compact_budget.json`, `opencode.jsonc` (maintainer live files —
  the budget file carries no `emergency_budget` key; the fail-open default 1
  covers its absence, per spec).
- `auto_resume.ts` (the item 2+11 / item 3 specs own it), prompt / knowledge
  files, anything under `.opencode/maintainer/`.
- No `TODO.md` change (the spec: status lives in the spec + your bookkeeping).
- Maintainer's uncommitted live files (opencode.jsonc, AGENTS.md,
  prompt_agent_task.md, agent_feedback.md, loop_log.md, ideas.md) — untouched,
  not staged, not committed (named-path commit only).
