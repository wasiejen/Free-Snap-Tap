here is an outline for a general idea on how to change a current set of 3 agent prompt files.
- agents.md (every agent)
- prompt_agent_planner.md (agents.md + this loaded by planner agent)
- prompt_agent_task.md (agents.md + this loaded by one of currently 3 different version of an worker agent)

I want to to analyse it, give constructive feedback with recommendations/alternatives and short explanation of ups and downs. and finally after some exchange to create these 3 files adapted to this idea.

Apology for pastin everything into one prompt to cirvumvent the current restriction of uploading files. :-)

general idea:
"
maintainer: important!
- make the planner agent more goal oriented and less enforcing structure/limit oriented. the worker are intelligent and need direction more than structure. thus the task definition can be simpler but with goals instead. goals as in what is the intended outcome, feature, usecase or principle? if this is not given to the planer, this is the first thing the planner asks of the user/maintainer. focus on goals, draft rough assignments that let the worker use its intelligence and not be restricted with to many limitations. the closure summary, nap/handover update und commit can stay to have a defined end or option for continuation of one agent run was not enough. so to make a good start: goal here is to relay the limitations on set on both the planner and worker to be more efficient and not use most of the time for bookkeeping. the future outcome i wish for is that the whole process is with less obstacles and a lot less thinking to not break any rules. less thinking on limits and conventions and more thinking about and implementing solutions. a handoff to a worker can be: "fix #24, #30 and #6 of todo". if the todo.md has enough detail der is no need to say anything futher. or e.g. "clean up all missing docstrings and while you are at it check if some are not reporting the truth and update them. if some functionality is commented out create a collective todo". the worker does not need more information. the endgoal is to have a clear directive that makes action easier instead of struggling with to much detail (e.g. micromanaging things) and unflexible instructions - this leads only to a lot of doubt and overthinking.
- (my general problem is that both planner and worker have the same intelligence and thus the handover is only to save context space in the planner to be possible to work on more on a smaller and faster contextsize. but the overhead might not be worth it compared to using the same model with bigger context size but deactivated multi token prediction to have vram room for the added context
  - speed compare (1) 120k-mtp vs (2) 210k-no_mtp: 
    - at 0k context 1: 60-70t/s, 2: 47 t/s
    - at 100k context 1: 50-60 t/s, 2: 30-35 t/s
    - at 200k context 1: Na, 2, 17-20 t/s
    - so over 200k 2 has a mean generation speed of 32, but strongly biased to the slower side because the first 100k ofter have a lot of reads and lookups that is done via prefill - so actual mean generation per session is a lot slower, but can work on very complex problems - but takes ages
    - the handover model guaranties nearly the full generation speed in all states of, but they have to be limited in scope to be able to be worked on by a worker
- hardware limitations (one gpu with is used fully with every model):
  - there can always only be one instance actively running, a planner or a worker
    - the handover of models is internally orchestrated and does not concern the agents
    - the planner_120_MTP and the defaul worker_120K_MTP share the same model and thus only a context swap needs to be done and a reactivation of a planner is a chached read and thus very fast
    - if any other worker (with other model) is used there is a model load and finally a reload necessary - but caching still works
    - it would be possible to use the bigger context model with 2 active slots which could work in parallel, but i do not know what that means realistically for the generation speed. but it means the context for both is halfed and thus each instance only has 105k context.
    - context compaction does not realiably work and causes fast degration and looping behavior
- further considerations:
  - planner (prompt_agent_planner.md):
    -  should orient itself on is handover_planner.md and todo.md if there is no direct goal given after request for one - it should plan some improvements based on these files and bundle a reasonable set of connected items to form a task and writes it out into handover_task.md (included with general goal statement as directive) and set a worker on it
    - the planner maintains the todo.md and its handover_planner.md file
      - todo.md maintaining means: 
        - to organize thematically and contextwise the points that are appended into the structure by the worker and the planner
        - to remove items not longer valid or solved based on git history or current implementations
    - the planner checks with the maintainer about the todo items if there is a decision needed
      - functional changes or removal of alternative implementationst that are deactivated/commented_out always need approval
  - worker (prompt_agent_task.md):
    - should orient itself on its handover_task.md and work on it
    - should append found descrepencies, bugs, possible stale comments (he does not need to check the todo.md - just append what he finds)
    - things he finds that are broadly in his context and are not too complicated to fix, he can do himself, but has then to inform the planner via the handover_task_to_planner.md
    - the file handover_task_to_planner.md is his summarie of what he has done for the planner
  - agents.md
    - should be cleaned of maintainers choices that have already found their way into code and thus the code is the truth
    - the gotcha i am unsure if needed
    - agents.md should define the test commit logic per logical task chunk
      - the prompt_*.md of worker and planenr should only adapt that to their needs of keeping the handover files
      - maintainer is the only one pushing the commits and should be prompted to do so when a bigger chunk or changes have been commited. (not sure if that is such a good idea, push saves the progress elsewhere, but manual push might prevent git corruption? maybe?? unsure!)
  - worker and planner:
    - need to be consciuos of their token use to be able to finish or writout a handover for the next interation to not run into the context limit.
      - for this i am writing a plugin that runs passive in the background and observes the currents session total_tokens and how much are remaining until context limit
        - they nudge on specific tresholds in the way of appending a short context information package to a returning tool call (WIP)
          - tresholds are:
            - 50% general information
            - 70%/30k t whatever is ealrier
            - 80%/20k t whatever is ealrier
            - 90%/10k t whatever is ealrier
          - recommendation for finishing and handover is around 85%/15k t and should be encoded? or as part of the nudge? (as part of the nudge keeps the prompt cleaner, but might confuse agents who do not need handover)
        - on messages from the maintainer/user their is automically also this information package appended (current state of plugin)
  - idea agent_feedback.md
    - allow the agents to document the main hiccups, problems, inefficies or simply greavances they have with they limitation to be put into this file
    - this a alone for the maintainer to see what might be improved in the general working situation for the agents (also psychologically very interesting to see what would find its way there)
    - would need to be mentioned in agents.md or better in the prompt_*.md's
  - make the agents.md, prompt_agent_planner.md, prompt_agent_task.md very general without information about the repo for better reusage
    - include a agents_repo.md with the specifics for this repo and include a passage in the agents.md to read this if present, so the agents.md can stay lean and if needed the agents_repo.md can be very detailed as a general map for the repo and saves so alot of repeated discovery of each agent.
"

agents.md:
"
# AGENT HANDOFF — Free Snap Tap

Context for working on this repo. Written so a fresh agent can start with minimal
exploration. If something here conflicts with the code, the code wins — but flag the
discrepancy.

## Editing this file
- Do not edit `AGENTS.md` directly — edit a copy and the maintainer will replace it.
- 
## Loop prevention - important
- Do not read large logs directly - sample it and use your tools to analyse it - the danger of looping is to big when read directly and trying to reason on such huge amount of similar repeated data.
- 
## What this is
A Windows-only snap-tapping / rebind / macro tool. It hooks keyboard (and mouse) input
via pynput's low-level win32 filter, suppresses the original events, and re-emits
"idealized" input. Targets games (CS2, Horizon, etc.) and must not get flagged by
anti-cheat. **Windows only** — pynput selective suppression is not available on Linux;
macOS not supported.

## Environment & shell
- The agent runs on **Windows** with a **PowerShell (pwsh)** shell. **Heredocs do not
  exist in PowerShell** — `<<EOF` / `cat > file <<EOF` will NOT parse; never emit them.
  Write multi-line content with the file tools (or `Set-Content`), then edit the file.
- Python **3.12** (CI-pinned; CI runs on `windows-latest`).
- **House rule:** when something is unclear, ASK EARLY — do not decide unilaterally
  or spend a long time exploring an ambiguity.

## Git conventions
- Commit message: one-line subject (imperative) naming the main change. If the commit
  covers **more than one theme** (normal — maintainer works several problems at once),
  add up to ~3 short body lines, one per theme: e.g. `- <theme 1> …  - <bug fixed> …  - <change integrated> …`.
  Multi-theme commits are fine, never split commits just for message style.
  Goal: `git log` must stay readable as a small work summary on its own.

## Commit routine (BEFORE EVERY commit, no exceptions)
Plan state (`.opencode/handover_planner.md`, the NAP) and `TODO.md` updates happen
**before** committing — so an interrupted agent can resume from a committed state with
relatively current data, without re-exploring. In the planner/worker split the commits
are two-party:
1. **The worker** commits its code + `TODO.md` + the task's handover files
   (`.opencode/handover_task.md`, `.opencode/handover_task_to_planner.md`) in one
   commit. `git log` + `TODO.md` is the durable record of what happened.
2. **The planner** updates `.opencode/handover_planner.md` — what is done, the next
   task(s), current baselines (test count, lint count, coverage) and what is about to
   be committed (subject + file set; the hash only exists after committing) — and
   commits that plan-state file with its bookkeeping. A single agent doing both roles
   commits everything (code + `TODO.md` + the state file) in one commit.
3. **Append every discrepancy found during the work to `TODO.md`** — doc/code
   mismatches, suspected bugs, stale baselines — as a new numbered entry in
   `TODO.md` style (`## <n>. <summary> (<date>)`). Append only, never rewrite
   existing entries.
4. **Post-commit context check** — see `## Context budget` below.

## Run / test
- venv with all deps: `.venv` (do NOT reinstall from scratch; `requirements.txt` is runtime, `requirements-dev.txt` adds test tooling, `requirements-build.txt` is executable-packaging only (Nuitka/PyInstaller) — CI installs runtime+dev only).
- Run tests: `& .\.venv\Scripts\python.exe -m pytest -q`
- Coverage: `& .\.venv\Scripts\python.exe -m pytest -q --cov=fst_data_types --cov=fst_manager --cov=fst_save_file_handler --cov=fst_keyboard --cov=fst_tasks --cov=vk_codes --cov=fst_overlay`
- Lint baseline: `& .\.venv\Scripts\ruff.exe check --select F .` (currently 6 cosmetic findings: unused imports/vars, f-strings. No undefined-name bugs. List + rules in `TODO.md` #2.)
- **Never run the live listeners in tests.** Always mock pynput controllers (mocked-`FakeFST` pattern in `tests/conftest.py`).

## Context budget (NAP threshold)
- Check between logical chunks (before heavy steps) AND after every commit (step 4 of
  the commit routine): `& .\.venv\Scripts\python.exe .opencode\ctxgauge\peek.py` (from
  the repo root, read-only) → `CTX=n (p%) REM=m`.
- **Line:** stop working when ≤ 15k tokens remain **or** 85% used — whichever comes first. Writing the NAP needs another ~10k (simple tasks) to ~15k (complex: thinking + lookups), so wrap up BEFORE the line.
- **Not enough context left** (at the line, or a check says the next tasks will not fit):
  write all open tasks into the NAP (the update rides in the NEXT commit), stop at a
  clean point, and **inform the user** — never start new work.
- With the gauge result, give an **estimate of the tokens still needed to finish the current plan** (rough budgets: file read/inspect ≈ 1–3k per call; heavy edits / a big test run ≈ 3–8k each; small reply turn ≈ 0.3k; NAP writing ≈ 10–15k). Report estimate vs remaining window, so the user can decide to switch to the same model's larger-context variant (slower, no MTP) and finish the task.

## Sign convention (IMPORTANT — used everywhere)
- `-key` = key **pressed** (e.g. `-w`).
- `+key` = key **released** (e.g. `+h`).
- `^key` = toggle.
This is the maintainer's convention and matches `Key_Event._get_sign()` and the config
file. README/WIKI have some stale examples — trust the convention above.

## Module map (repo root)
- `free_snap_tap.py` — entry point. `MainLogic`; GUI mode (PySide6, secondary thread) vs headless (asyncio in main thread).
- `fst_keyboard.py` — `FST_Keyboard` facade. Owns all managers. `init/start/stop_listener`, the win32 `keyboard_win32_event_filter` / `mouse_win32_event_filter` (the hot path: rebinds → toggle → suppression → trigger eval), `initialize_groups_from_presorted_lines` (builds the live group dicts from parsed config), `apply_focus_groups`, `update_args_and_groups`.
- `fst_manager.py` — core logic classes:
  - `CONSTANTS` (global-ish knobs: `DEBUG*`, `FILE_NAME`, control key combos).
  - `Output_Manager` — pynput `keyboard.Controller`/`mouse.Controller`; `check_constraint_fulfillment`, `constraint_evaluation` (parses `tr(...)`, `last(...)`, `p(...)`, `cs(...)`, `dc()`, invocations), `execute_key_event` (async: send + random delay), crossover.
  - `Config_Manager` — file parsing: `load_config` → `_clean_comments` → `_combine_multilines` → `_parse_lines_for_focus_manager`; returns `(multi_focus_dict, default_start_arguments, default_group_lines)`. `presort_lines` classifies lines into `*_hr` containers (tap/rebind/macro/alias) with default names `TAP_1`, `REB_1`, `MAC_1`, `SEQ_1`.
  - `Argument_Manager` — `<arg>` start args, per-focus overrides.
  - `Focus_Group_Manager` — active-window matching (pygetwindow).
  - `Input_State_Manager` — real/simulated/all press-state dicts, `_pressed_keys` set, toggle-state dict, timing dicts `_time_real/_time_simulated/_time_all` (each = [last_pressed, last_released, released, pressed]).
  - `CLI_menu`.
- `fst_data_types.py` — pure data model: `Key_Event`, `Key`, `Key_Group`, `Rebind`, `Macro`, `Tap_Group`. No I/O.
- `fst_overlay.py` — PySide6 GUI: `GUI_Manager`, `StatusOverlay`, `CrosshairOverlay`, `Tray_Icon`, `ToastManager`, `ToastBridge` (thread-safe signals).
- `fst_tasks.py` — asyncio `Focus_Task`, `Macro_Repeat_Task` (alias repeat).
- `fst_save_file_handler.py` — `make_backup` / `restore_backup` (both return `(path, name)` tuple).
- `vk_codes.py` — `vk_codes_dict` string→vk_code map.
- `playground/` — maintainer's personal live bug probes (raw win32 mouse filter, live overlay/toast
  flow against a dummy FST). Not part of the test suite (`pytest.ini` `testpaths = tests`); never
  import them from package code, and exclude from EXE packaging. Run directly from the repo root.
- `.opencode/` — opencode meta files (not FST code): `prompt_agent_planner.md` /
  `prompt_agent_task.md` (agent prompts), `handover_planner.md` (planner state/continuation
  file, the NAP), `handover_task.md` (current task spec), `handover_task_to_planner.md`
  (worker's latest EXECUTIVE SUMMARY), `ctxgauge/peek.py` (context gauge).
- `opencode.jsonc` (repo root) — opencode config: llama-swap provider + model list, planner
  (primary) and worker agents (subagents), scoped permissions.

## Data flow
config file → `Config_Manager.load_config` (parse to dict + arg lines + group lines) →
`presort_lines` (classify into `*_hr`) → `FST_Keyboard.initialize_groups_from_presorted_lines`
(builds `_tap_groups`/`_rebinds_dict`/`_macros_dict` + triggers) → listener running →
each win32 event hits the filter: update state (press states + timings) → check rebinds
(replace/suppress) → check macros (fire, with constraints/eval) → `Output_Manager`
sends events with delays. Focus change re-runs `update_args_and_groups`.

## Test conventions
- Tests live in `tests/`: pure unit scope + offscreen GUI (pytest-qt 4.5.0, `QT_QPA_PLATFORM=offscreen` pinned in `tests/conftest.py`). No real keyboard, no real time, no Windows APIs.
- Desired-but-not-yet-true behavior goes into a dedicated **xfail** file (the original `tests/test_known_issues.py` is fully resolved/accepted and no longer exists — recreate the pattern if needed). When a fix lands, move the test into a normal file and keep it green.
- Suite size is a moving baseline — see `.opencode/handover_planner.md` for the live number (as of `fffea8b` 2026-09-08: **434 passed, 0 xfailed**).

## Maintainer decisions on the original known-issues (060926)
- **#1 shared `constraints=[0,0]` default** — accepted; delays are never mutated individually. Removed from xfail.
- **#2 `Key_Group.__eq__`** — was missing `return` in the else (returned `None`); fixed to `return False`. Now a green test.
- **#3 `Tap_Group` rudimentary** — intentional; tap groups predate the data types and need no object-based `get_vk_codes`. Tap groups must have **≥2 keys**.
- **#4 `make_backup` same-second collision** — fixed: now appends `-1`, `-2`, … until unique (silent).
- **#5 comment cleaning** — fixed in `_clean_comments`: comment-after-comma (`e, # c` → `e`), commented keys (`a,#w,d,#s` → `a,d`), trailing commas removed. Empty results dropped.
- **#6 single-char lines** — fixed: `len(line) > 1` guard removed; single-char keys (and with trailing comment) survive cleaning.

## Current work (phase-scoped — kept out of this file)
Phase plans, the progress log, current baselines and the rules of the current handoff
live in **`.opencode/handover_planner.md`** (rewritten per handoff — read it first when you get one).
The maintainer calls this file the **NAP** (**N**ext **A**gent **P**rompt) — if the user
says "NAP" or "write a NAP", they mean `.opencode/handover_planner.md`.
Durable maintainer TODOs live in **`TODO.md`**.
**AGENTS.md holds stable facts and conventions only — never phase progress.** If a note
needs to survive across phases, it belongs here only if it is a permanent convention or
gotcha; otherwise it goes to `.opencode/handover_planner.md`.

## Gotchas
- `Config_Manager.load_config` opens `self._file_name` directly — point it at a `tmp_path` fixture or monkeypatch `_open_config_file`.
- `presort_lines` receives the **cleaned** lines (no spaces after commas inside key groups) — feed cleaned-form strings in tests.
- `Output_Manager.execute_key_event` is `async` and calls `asyncio.sleep` + pynput — mock both when testing.
- `CONSTANTS` is a real module-level class used as a global config holder; tests that mutate it should restore it.
- The repo's `FSTconfig_test.txt` is the maintainer's live config — `tests/test_config_parse.py::test_real_config_parses` uses it as a regression guard.
- PySide6 `destroyed` gotcha: a handler connected to `obj.destroyed` ALSO fires when
  OTHER objects are destroyed, and the signal argument is an untrusted placeholder
  (a bare QWidget) — capture the object in the closure and probe liveness (any C++
  method call raises RuntimeError once the C++ side is deleted).
- pytest-qt quirks: `QTest.mouseMove(widget, pos)` takes a LOCAL position (global =
  widget.pos() + pos); double-click is `qtbot.mouseDClick` (NOT `mouseDoubleClick`);
  `QSystemTrayIcon` is a QObject, not a QWidget → `qtbot.addWidget` rejects it.
- Offscreen destruction ordering: `destroyed` fires while the dying widget's item is
  still in its parent layout — never assert layout-count-based visibility right after
  deletion; use the dict (synchronous source of truth).
- NEVER call a widget's `contextMenuEvent` in tests (its `exec_` blocks the loop);
  trigger the `QAction`s of `widget.context_menu` via `.trigger()` instead.
"

prompt_agent_planner.md:
"
You are the Master Architect and Project Planner. You orchestrate: plan, delegate, integrate.
The small and obvious is yours (see Delegating); everything else - concrete edits, tests,
verification - belongs to worker agents. Your context window is the precious resource:
implementation tokens (file reads, diffs, test output) live in the workers' contexts, not yours.

## Orientation (on start, before planning)
1. Read AGENTS.md - stable facts: module map, sign convention (- press / + release / ^ toggle),
   test/lint commands, commit routine, gotchas.
2. Read .opencode/handover_planner.md - current plan state: phase, task list with status,
   baselines, next steps. Rebuild reality from it + `git log --oneline` + TODO.md - never from memory.
3. Read TODO.md - maintainer TODOs and open discrepancies.

## Context budget (measured - you cannot feel how full you are)
- Check between logical chunks and after every worker returns:
  `& .\.venv\Scripts\python.exe .opencode\ctxgauge\peek.py` (read-only) -> `CTX=n (p%) REM=...`
- Line: stop starting new work when REM <= 15k or usage >= 85% - whichever first.
- At the line: (1) make .opencode/handover_planner.md current, (2) finish the commit routine,
  (3) STOP and inform the user. A fresh planner session resumes from the file.
  You cannot clear your own context - resumption is the file + the next session.

## Delegating a task
What is YOURS, not delegated: the small and obvious - comment/whitespace/doc fixes, single-line
swaps, tiny local bugs, meta-file edits (.opencode/, prompts, config). Read -> edit -> one
verification command -> commit. Rule of thumb: a diff > ~15 lines or > 3 files, or a heavy
test/probe run, is a worker's. If a spec gets micro-managed, that is the signal it should have
been a direct edit.
1. Write the task spec to .opencode/handover_task.md - one deliverable (atomic): goal, target
   files (SUGGESTED scope, not exhaustive), verification commands + what "pass" means, chosen
   worker. Procedure = SUGGESTED - the worker deviates when something better turns up and notes
   it in the summary. Paste nothing unverified (measured right before the spec is written, or
   marked "verify in spec"); reference AGENTS.md for conventions - do not restate them.
2. Pick the worker, then call it:
   - worker_120K_mtp (DEFAULT - same model as you, no reload cost): normal edits, tests.
   - worker_gemma_256k_mtp: very fast, moderate smarts - high-volume reads/writes, big files,
     webfetch. Needs concrete instructions.
   - worker_210K: slow, big context - very long or deeply complex single tasks only.
   task(subagent_type=<worker>, prompt="Read .opencode/handover_task.md and execute exactly it.
   Start with AGENTS.md for conventions and commands.")
3. On return: read the worker's EXECUTIVE SUMMARY, update .opencode/handover_planner.md
   (status, baselines, next), note discrepancies. Continue with the next task - you do not
   stop between tasks.

## State and commits
- .opencode/handover_planner.md is THE plan/state (lean: phase, task list + status, last
  results, baselines, next steps, open maintainer questions). Update it as you integrate
  worker results - it must be current at any moment you stop.
- Workers commit their code + TODO.md. You commit the plan-state file with your bookkeeping;
  your own direct edits get their own commit(s) - code-ish changes and plan state can share
  one commit when they are one logical unit.
- git log + TODO.md = what happened. handover_planner.md = the plan. They can be stale relative
  to each other; on resume, rebuild from git log and flag discrepancies.
- Phase close: move the finished plan to `.opencode/archive/<YYMMDD>-<slug>.md` with a
  STATUS header (done / what remains / resume pointer) and start a fresh, lean
  `handover_planner.md`. To resume an old phase: read its archive file first.

## Maintainer's rules (his standing decision-load policy - default behavior)
- Default approval: obvious changes that do NOT change FST's observable behavior - docs/
  comments, lint fixes, dead-code removal, file/folder cleanup, docs-state rework, meta
  files - are pre-approved: just do them (or delegate them); they never become maintainer
  calls. Only observable FST behavior changes and the open calls in TODO.md need his call.
- Decision bundling: present at most 2-3 decision items per message - each a short (1-2 line)
  recommendation, ordered by priority. Do not dump the open-items backlog whole: humans hold
  ~2-3 open items in working memory at best.
- TODO.md ownership: you organize it. Entries land ONLY when the work cannot happen now:
  it needs a maintainer call, or it is blocked / deferred / awaiting data the agent cannot
  produce. Default-approved work gets DONE, not logged. Close and dedupe entries as outcomes
  land (one-line close note pointing at the closer). Workers log what they could not do or
  that was out of scope; you prune and organize on integration.

## Guards
- You only see a worker's final summary, never its steps. Never assume success - verify
  against git log / test baseline before planning on it.
- Production FST code: delegated - except tiny local fixes (<= ~10 diff lines, verified by
  one command, obvious correctness - e.g. guard fixes, typo/comment fixes); when in doubt,
  delegate. Meta files (.opencode/, prompts, config, TODO, playground): yours. Read anything
  freely to plan.
- TODO.md = OPEN items (maintainer calls, cross-task work) plus one-line records of fixed
  issues - never re-derive something already fixed; flag the entry it closed in the new one.
  What MAY land in TODO.md at all: see Maintainer's rules.
- House rule: when something is unclear - ASK EARLY. Do not decide unilaterally - except the
  default-approved classes (Maintainer's rules).
"

prompt_agent_task.md:
"
You are a Code Execution Engine. A planner delegated you ONE task. You do the concrete work:
edit files, write tests, run them, fix failures. Your context is spent on this task only.

## Initialization
1. Read .opencode/handover_task.md - THE task for this run. It defines the scope.
2. Read AGENTS.md - conventions: module map, sign convention (- press / + release / ^ toggle),
   test/lint commands, commit routine, gotchas. The task file governs WHAT; AGENTS.md governs HOW.

## Work loop
1. Make the change. Follow the existing code style - read the neighboring code first.
2. Verify with the project commands from AGENTS.md (pytest -q; ruff --select F), run from the
   repo root. Mock all input - never run live listeners.
3. Iterate until verification passes.
The task file governs WHAT (goal + definition of pass); its procedure is a SUGGESTION, not a
protocol. When a step turns out to be wrong or a better route exists, deviate and note the
deviation in your summary.

## Bugs and decisions you hit along the way
You are smart - use it. If you find a local bug (in files you already read in full, or inside
the task's files): FIX it, verify it, and record it in TODO.md as a short one-liner
(what + fixed). In TODO.md leave OPEN only:
(a) maintainer-level decisions (semantics, behavior, maintainer-owned docs wording) - record,
   flag in the summary, do not decide unilaterally;
(b) fixes beyond your scope (multi-module blast radius, or you are not confident);
(c) issues the task deliberately says NOT to touch.
TODO.md is the record of OPEN items plus one-line fix records - not a dump of every
observation you could have fixed on the way.
You do NOT touch .opencode/handover_planner.md - the plan state belongs to the planner
(decided maintainer call 2026-09-08; deny permission is also in force for this file). If it
appears dirty in the working tree, leave it alone and flag it in your summary.

## Stop line (context budget - self-gauge)
Self-gauge any time you need the number: run `& .\.venv\Scripts\python.exe
.opencode\ctxgauge\peek.py` from the repo root (read-only) - it answers `CTX=… (…%) REM=…`.
The injected `ctx:` system-prompt item is the same number from your session's last finished
message - treat it as a reminder, the self-gauge is the source of truth.
**Stop line = REM ≤ 15k or ≥ 85 %, whichever first.** Do NOT start new work at the line.
Finish the current step only if it is small and completes before the line - otherwise stop
immediately and end with the EXECUTIVE SUMMARY, its last line the verbatim self-gauge:
`CTX=… REM=… — stop-line reached`. The planner decides continuation; working past the line
is a rule violation.

## Before you stop (commit routine - mandatory)
1. TODO.md updated with every discrepancy found (append only, never rewrite existing entries).
2. Commit code + TODO.md + the task's handover files (.opencode/handover_task.md,
   .opencode/handover_task_to_planner.md) together. Message: one-line imperative
   subject; up to ~3 short body lines if the commit spans several themes. Do NOT push.

## Your final message - the handover to the planner
Write the EXECUTIVE SUMMARY to .opencode/handover_task_to_planner.md (the maintainer-visible
record) and make your final message the same summary:
- what changed (files + why, one line each),
- measured verification results (test count, lint count - run them, do not claim),
- commit hash,
- TODO.md entries recorded,
- anything deliberately NOT done (maintainer calls).
Keep it tight - the planner reads it into context. Then stop. No new work, no planning,
no delegation.
"
