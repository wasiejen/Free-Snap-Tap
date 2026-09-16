# plan8 summary — iteration 8 (planner-8, ses_f57dc514dffeO3jFufy9dxV6Lw, Qwen3.8-27B-IQ4KT-140K)

## What landed (commit 384080f, all planner-direct, all previously approved)
- **#54 CLOSED** — the no-circumvent rule is now in all three role prompts:
  `prompt_agent_task.md` + `prompt_agent_explorer.md` (§Honesty guard) and
  `prompt_agent_planner.md` (§Delegate vs. do). Wording = the approved TODO #54
  outcome (deny is a boundary, not an obstacle; blocked → do the rest + note in
  handover, OR close + report if the blocked file IS the work; no partial
  hacks). Grep-verifiable: `rg -n circumvent .opencode/agent/prompts/agents/` →
  5 hits.
- **#51 CLOSED** — `"type": "module"` removed from `.opencode/package.json` per
  his ruling (stale plugin-activation test). Probe header (line ~45) and the
  file now agree; the `MODULE_TYPELESS_PACKAGE_JSON` stderr warning is the
  expected/harmless post-state (verified present live). NOTE: the file is
  **gitignored** (`.opencode/.gitignore:3`) — local live-host file, so this
  change is working-tree only, not in git. The `@opencode-ai/plugin` dep and
  the stale `opencode-context-meter` package name were left untouched (out of
  scope for his ruling — his call at the next restart).
- **#58 CLOSED** — `repo_commands.md` §Run/test now names the probe command and
  defines **"standard gate" = pytest + ruff + probe** (the probe's total is
  self-annotated in its header — the annotation is the source, no duplicated
  moving number, per his "curate, don't duplicate"). His temp-path note landed
  in §Environment & shell as a verified fact: git-bash `$TMP` = user temp dir;
  `$TMP/opencode` = `C:/Users/Wasiejen/AppData/Local/Temp/opencode` (the
  approved scratchpad, `pwd -W` verified).

## Gates (planner re-ran, all green)
- probe: one hundred twenty-two PASS (live total char-code-verified against the
  header section-sum 106+10+6)
- pytest: 459 passed + 1 warning (known #10 coroutine warning)
- ruff F: 0
- all 7 smokes green

## 140K observation (his plan7 request — one concrete instance)
Dense-digit trap, LIVE on this model: while reading the probe total I
repeatedly perceived the digit-string "1-2-2" as the expression "120+2" across
several tool outputs, and almost filed a false "baseline drift" alarm. A
string-compare said `false` (alarm), a char-code/value compare said `true`
(clear) — the plan7 line "120+2" (120 plus 2) and the live "1-2-2" are the
same value, different notation. Rule reinforced: never act on a perceived
dense-numeric mismatch without a machine check (AGENTS.md Pattern 5).

## Open (all blocked on maintainer action — none autonomously liftable)
- #56 (deferred distillation experiments — his --comment points the
  experiments at a direct session)
- #53 (DEFERRED; proposal owed only when the deferral lifts)
- #55 live acceptance — needs his next host restart (first
  `compaction_dumps/` file is the proof)
- fst-rebind-repeat — PARKED for his direct session
- #63 optional (do the plugin smokes join the standard gate?) — his direct
  session; NOT decided unilaterally
- `proposals/approved/2026-09-15_agents-knowledge-stopline.md` — his paste into
  AGENTS.md (his file)

## Queued for plan9 (approved research lane, his #56 --comment / ideas #5-7)
RESEARCH ONLY (no build): (a) fuzzy name resolution on file read / section
grep, (b) num_to_word auto-replace as an opencode intercept plugin
(`hook.execute.before`) to harden tool calls against bitshifts. Output: NEW
`.opencode/agent/research/` folder (README ≤20 lines in the same commit) with
one dated research doc. Per his instruction: research does NOT go in the NAP.
Fresh session preferred (research needs doc reads; keep it under ~50 % window).
