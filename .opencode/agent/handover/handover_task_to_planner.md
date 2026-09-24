# Worker summary — spec 01: remove keepTokens from compact_memory (change-list item 1)

Status: DONE (LANDED per spec — commit hash recorded by you in the follow-up bookkeeping).
Commit: `7f253ea` (branch `opencode_test`, named-path commit — exactly the three scoped files).
Worker session: `ses_f2b47fa1effefej9AVC58Ogj2l` (worker, Qwen3.8-27B-Q3S-170K).

## What changed

1. `.opencode/plugin/compact_memory.ts`
   - config section: `keepTokens` dropped from the `CompactionConfig` type,
     `DEFAULT_KEEP_TOKENS`, and the budget-file parsing — the key is never read /
     defaulted / sent (the budget file's `"keepTokens": 0` is now inert, left in place
     per spec).
   - tool args: `keepTokens` arg removed; keepMessages description re-pinned to
     "Recent messages to retain (e.g. 18) — working, sent in the request body."
   - keep construction: `keep.tokens` never set; `keep.messages` from
     `args.keepMessages` only (args-only behavior kept — item 12 stays out of scope);
     `keepObj` + the retry-once-without-keep logic unchanged; `tokensToKeep` gone.
   - `appendCompactLine`: `tokens` param dropped — the COMPACT line is now
     `COMPACT <sid> [<model>] messages=<m> [(pre-readout)]` (messages reported =
     `args.keepMessages ?? cfg.keepMessages`, same reporting logic as before).
   - Only remaining `keepTokens` string in the file: ONE comment line in the config
     header documenting the removal (allowed by the spec's grep DoD).

2. `.opencode/plugin/tests/compact_memory.smoke.mjs` — fully re-pinned, ZERO
   `keepTokens` hits:
   - defaults pins → `12/false/{}`; fixture JSON drops the keepTokens key.
   - schema pin → exactly `[sessionID, keepMessages, message]` ("THREE keys").
   - body asserts → `keep.messages === N && keep.tokens == null` (L186/L214/L252 area).
   - all call sites drop the keepTokens arg.
   - keepcfg test re-pinned to messages-only: configured `messages=9` when the arg is
     omitted, explicit `messages=2` wins.

3. `.opencode/plugin/probes/handover_probe.mjs` — S13 (active plugin) + S25 re-pinned:
   - registration pin (check 86) → 3 keys `[sessionID, keepMessages, message]` +
     description.
   - body asserts (checks 88/89) → `keep?.messages === N && keep?.tokens == null`.
   - COMPACT-line pin (check 96) → `COMPACT ses_qc_self messages=7` (messages-only
     format), comment + description + regex.
   - all S13 call sites drop keepTokens (88/89/90/92/94/98/99).
   - "4-key args" → "3-key args" in the S25 header, check 256 description, and the
     probe's top annotation block.
   - **S10 and S11 sections left byte-identical** — see Deviation below.

## Verification (measured, post-change — all identical to the re-run baseline)
- probe full run: `PROBE handover: 241/241 PASS` (same total as the baseline run).
- all 10 plugin smokes: exit 0; compact_memory smoke: `COMPACT_MEMORY_SMOKE: ALL PASS (57/57)`.
- pytest: `459 passed, 1 warning in 1.96s` (exact baseline match).
- ruff `--select F`: `All checks passed!`
- `grep -n keepTokens` (the three files): compact_memory.ts = 1 (the removal
  comment), smoke = 0, probe = 14 — all 14 in the untouched S10/S11 sections.

## Deviation from the spec (needs your ruling)
The spec's probe re-pin items — "schema pin L1837 (3 keys → 2)", "COMPACT-line pin
L2193 (tokens=30_000 messages=12 → messages-only)", "comment L2106" — target the
**S10 and S11 sections, which pin RETIRED / DO-NOT-TOUCH artifacts**:
- S10 pins `.opencode/plugin/deactivated/compact_memory_v1.ts` (not in the 3-file
  scope; it still has the keepTokens arg — its line 172).
- S11 pins `.opencode/plugin/deactivated/context_recovery.ts` (explicit DO-NOT-touch;
  its own keepTokens default 30_000/12 + its own `tokens=<t> messages=<m>` line writer
  at L193-202; its removal rides the #93 event-hook port).
Re-pinning those sections to 2-key / messages-only would turn probe checks 67–75 /
78 / 81 RED and break the gate-green DoD. I prioritized the gate-green DoD (the
measurable definition of done) and left S10/S11 untouched. Consequence: the spec's
grep DoD ("zero hits, or at most ONE comment line") is not achievable across all
three files while the gate stays green — 14 literal `keepTokens` occurrences remain
in the probe (13 S10 pins/call sites + 1 S11 comment).
Options: (a) accept as-is (the hits pin frozen artifacts, factually correct);
(b) a follow-up spec that also removes keepTokens from compact_memory_v1.ts and
re-pins S10 (retired artifact — your call, could ride the #93 port wave alongside the
context_recovery S11 re-pin).

## Deliberately NOT done
- `context_recovery.ts`, `compact_memory_v1.ts`, `opencode.jsonc`,
  `.opencode/temp/compact_budget.json` (the inert `"keepTokens": 0` key stays),
  `auto_resume.ts`, prompt/knowledge files, change-list items 10/12, anything under
  `.opencode/maintainer/` — per scope + DO-NOT-touch.
- No `TODO.md` change (the spec says status lives in the spec + your bookkeeping).
- Maintainer's uncommitted live files (opencode.jsonc, AGENTS.md,
  prompt_agent_task.md, agent_feedback.md, loop_log.md) — untouched, not staged, not
  committed.

Lessons: the probe's section→artifact mapping (S10 = retired v1 tool,
S11 = context_recovery, S13 = active plugin, S25 = unit A) is nowhere stated in the
probe header — a future spec author re-pinning "the keepTokens pins" needs to identify
which section pins which file first; a one-line map per section would prevent this.
