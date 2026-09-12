# PLANNER-AS-TEXT-WORKER SUMMARY — attention-keywords: marker set + priority ladder + inbox cadence

Session `ses_f69895339ffe1gJaUk4OblfuJp`, model `Qwen3.8-27B-IQ3KT-120K_MTP`,
branch `opencode_test`. Spec: `.opencode/agent/handover/handover_task.md` (the
approved proposal `2026-09-12_attention-keywords.md` incl. his `--wip` note).
Pure prompt/text task — NO FST code, NO `opencode.jsonc`, no access
restrictions circumvented, DO-NOT-touch list honored.

## What changed (task commit = this file + the three prompt files)

- **Planner prompt** (`agents/prompt_agent_planner.md`, canonical home):
  - `## maintainer calls/decisions`: the single-line `--main`/`--maintainer`
    rule became the FULL marker table (canonical; rows: `--maintainer`/`--main`,
    `--now`, `--todo`, `--deferred` (alias `--defer`), `--wip`, no-marker
    background) + **Priority ladder** + **Inbox cadence** (session-start scan =
    TRIAGE by the ladder, not execution; small items ≤ a few lines of effect
    inline) + **Marker removal** rule (generalized `--main` rule; EXCEPTION
    `--wip` — agents never remove it, owner: maintainer) + the session-start
    grep sweep now covers the whole marker set, with a verified-2026-09-12
    no-clash note (all marker hits measured to live in `.opencode/**`
    docs/agent files only — no FST product content clash).
  - `## Autonomous mode`: the bare "scan inbox; handle anything there" line is
    now ladder triage (scan → classify → act per ladder).
  - **Priority ladder one-liner, IDENTICAL text in BOTH sections** (§Autonomous
    mode line 54 and §Direct session line 75): direct maintainer message in a
    primary session > `--maintainer`/`--main` > `--now` > unmarked inbox items
    (small first) > `--todo` capture > `--deferred`.
- **Worker prompt** (`agents/prompt_agent_task.md`): ONE guard bullet in
  §Work loop — `--wip` files are maintainer-live-edited: READ ok, never EDIT,
  if the task requires it stop + flag in the summary; pointer to the canonical
  table (no restatement).
- **Looprunner prompt** (`agents/prompt_agent_looprunner.md`): ONE line in
  §Maintainer messages (routing) — the five markers (`--main`, `--now`,
  `--todo`, `--deferred`, `--wip`) ride VERBATIM with the messages; the
  looprunner does not interpret them.

## Measured verification

- **Grep acceptance (git grep, worktree):** `--now`/`--deferred`/`--todo`/`--wip`
  all present in the planner prompt (table rows + ladder lines); `--wip` in the
  worker prompt (line 45); all five markers in the looprunner one-liner (line
  35). Table rows (`| … |`) exist ONLY in the planner prompt (8 rows);
  worker/looprunner prompts carry ZERO table rows → the marker table lives in
  exactly ONE place, referenced but not restated elsewhere.
- **Probe gate:** `node .opencode/plugin/probes/handover_probe.mjs` →
  `PROBE handover: 84/84 PASS`, exit 0 (run under NODE, AFTER the edits).
  Pre-edit baseline at HEAD was likewise 84/84 — the probe verifies
  ctx_watchdog behavior and is insensitive to the prompt text; green is the
  spec gate.

## Commits

- **Task commit:** the commit containing this summary + the three prompt files
  (subject "Attention-keywords: marker set, priority ladder, inbox cadence in
  the role prompts"). No self-hash (the hash exists only after this file is
  committed) — identify it by its file set.
- **`cec9570`** (separate, committed first): a PRE-EXISTING pending unit found
  uncommitted in the worktree at start — the planner-prompt
  Planner-as-text-worker-mode hunk (delegation bullet + mode section) + the
  open `TODO.md` #54 entry, left pending since the maintainer's direct session
  (after `db5d1ec`/`00cdc09`). Committed as its own unit so this task's commit
  stayed single-theme (AGENTS.md commit routine); NOT my implementation — the
  wording is the direct session's, verbatim as found.

## TODO entries

- NONE added (spec DoD 6 — nothing genuinely open was hit; spec already covers
  the design). No `todo_inbox.md` entries.
- Note for the planner: `TODO.md` #54 remains OPEN (its worker-side acceptance —
  the circumvention rule in `prompt_agent_task.md` — is not written yet).

## Deliberately NOT done

- #54's worker-side circumvention rule was NOT added to the worker prompt —
  outside this spec's DoD (the worker gets exactly the one `--wip` guard line).
- Looprunner prompt: a pre-existing stray empty bullet (`- ` alone, in the
  routing list just above the new marker line) left untouched — out of scope;
  flagged for the planner's curation call.
- Pre-existing uncommitted items left EXACTLY as found (not mine, not this
  spec's): the maintainer's live edit of
  `.opencode/maintainer/inbox_planner/summary_summary.md` (line 1 now
  `--maintainer:--defer please do this first…` — a live double marker for a
  planner-session triage per the new rules; maintainer space, DO-NOT-touch) and
  the in-progress `roles/agent_prompt_engineer.md` → `roles/prompt_engineer.md`
  rename (deleted + untracked new file).
- No NAP update (planner-as-text-worker mode: spec-driven, no plan state of my
  own to record — the planner owns the NAP; flagged for him to note this
  landing).

## Final gauge (verbatim, pre-commit)

`SESSION=ses_f69895339ffe1gJaUk4OblfuJp CTX=79126 (65%) REM=40874`
