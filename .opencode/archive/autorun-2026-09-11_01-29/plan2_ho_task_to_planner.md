# EXECUTIVE SUMMARY — prompt/repo split build (parts 1+2+5) + session-id rules (2147)

Task: `.opencode/handover/handover_task.md`. META-ONLY (no FST code, no tests, no
plugin, no `opencode.jsonc`, no root `AGENTS.md`, no `TODO.md`). ONE commit (the
commit containing this summary; subject: "Prompt/repo split build: repo-map parts,
feature readmes, prompt indexes, todo_inbox, session-marker rule" — hash verifiable
via `git log -1`; a commit hash cannot be embedded in its own commit).

## Gate (unchanged, measured after all edits)
- `& .\.venv\Scripts\python.exe -m pytest -q` → `448 passed, 1 warning` (the known
  #10 warning).
- `& .\.venv\Scripts\ruff.exe check --select F .` → `All checks passed!` (0 findings).

## 1. Section→part mapping (all 12 original sections, facts verbatim, exactly one home)
| original section | part (`system_prompts/repo/`) |
|---|---|
| What this is | `repo_map.md` |
| Sign convention (IMPORTANT) | `repo_map.md` |
| Module map (repo root) | `repo_map.md` |
| Data flow | `repo_map.md` |
| Worker roster | `repo_map.md` |
| Phase-scoped work | `repo_map.md` |
| Environment & shell | `repo_commands.md` |
| Run / test | `repo_commands.md` |
| Handover file paths | `repo_commands.md` — MOVED from the spec's suggested mapping (the proposal left it unmapped; the gauge command is a hot path for every role and the spec's own example trigger ties the gauge to `repo_commands.md`) |
| Safety limits (repo-specific) | `repo_testgate.md` |
| Test conventions | `repo_testgate.md` |
| Gotchas | `repo_gotchas.md` |

Machine-verified: each of the 12 section bodies (whitespace-normalized) is a
substring of exactly one part; none remains in the root index (node script,
scratchpad). Root `agents_repo.md` is now a 19-line thin index (≤ 35 ✓), entry
point intact (what-this-is + maintainership rule + one "read when …" line per part).

## 2. Verbatim spot-checks (grep hits per part, all = 1)
- `repo_map.md`: `re-emits "idealized" input`, `+key` = key **released**,
  `Focus change re-runs`, `Raw `agent_*` variants`
- `repo_commands.md`: `here-strings are the only heredoc`,
  `CI installs runtime+dev only`, `no finished step`, `N**ext **A**gent`
- `repo_testgate.md`: `mocked-`FakeFST` pattern`, `recreate the pattern if
  needed`, `Do not hard-code test-count assumptions`
- `repo_gotchas.md`: `monkeypatch `_open_config_file``, `qtbot.mouseDClick`,
  `opencode.exe-bun false confidence`

## 3. Files
- NEW parts: `.opencode/system_prompts/repo/repo_{map,commands,testgate,gotchas}.md`
  (102/61/21/45 lines).
- NEW readmes (each ≤ 50 ✓): `.opencode/system_prompts/agent_readme_{proposals,todo,
  loop}.md` (33/29/37 lines).
- `todo_inbox.md` (repo root) — 12-line header + 3 findings I appended this session
  (roster-bullet drift, module-map bullet gap, mid-session inbox item — see §5).
- `agents_repo.md` — rewritten as the thin index.
- `prompt_agent_planner.md` — stale paths fixed (NAP line 13 →
  `.opencode/handover/handover_planner.md`; task spec line 39 →
  `.opencode/handover/handover_task.md`); Autorun-archive bullet replaced: new date
  pattern `autorun-<YYYY-MM-DD_HH-MM>` + ONE `<session_id>.md` marker file (id = the
  `SESSION=` field of the injected `ctx:` launch line; minimal content; file name is
  the info) — spec/summary copy lines kept; roster reference now points at
  `.opencode/system_prompts/repo/repo_map.md`; Instruction index (7 lines) added.
- `prompt_agent_task.md` — stale task-spec path fixed (line 12); inbox rule added
  (Work loop: unfixable/out-of-scope findings → `todo_inbox.md`, NOT `TODO.md`);
  Instruction index (5 lines) added.
- `prompt_agent_explorer.md` — stale task-spec path fixed (line 10); same inbox rule
  (Work loop); safety reference repointed to `repo_testgate.md`; Instruction index
  (5 lines) added.
- `prompt_agent_looprunner.md` — Instruction index (loop-readme line) + session-id
  lookup line in Loop hygiene (`SESSION=` field of `ctx:` lines; one
  `<session_id>.md` marker per planner session in the autorun archive; plain-text
  session log deliberately NOT referenced, per spec §6).
- Stale-path grep over the 4 live prompts + root index: zero
  `.opencode/handover_<name>.md` no-slash forms remain ✓.

## 4. Queued maintainer swap
- `.opencode/proposals/files/AGENTS.md` §Discovery "APPEND" bullet retargeted:
  worker/explorer findings now go to `todo_inbox.md` (loose, unnumbered, dated +
  role-tagged); the planner curates into `TODO.md` and assigns the stable ID at
  curation. Root `AGENTS.md` (agent read-only) still says "to `TODO.md`" — the
  maintainer replaces the root file from this copy when ready.

## 5. Deviations / notes for the planner
1. The spec's "current state" listed 2 stale no-slash paths (planner 13/39); the
   LIVE worker (line 12) and explorer (line 10) prompts also carried
   `.opencode/handover_task.md`. DoD 5 bans the no-slash form across all 4
   prompts, so all 4 were fixed (2 extra edits, same pattern, no behavior change
   to the protocol — just the correct directory).
2. 3 stale no-slash NAP references inside the MOVED sections were fixed to
   `.opencode/handover/handover_planner.md` (Run/test, Test conventions,
   Phase-scoped work) — reference fix only, facts unchanged.
3. `repo_map.md` §Worker-roster still says explorer "findings to `TODO.md`" and the
   explorer prompt still frames `TODO.md` as its core artifact (verbatim rule +
   "keep everything else unchanged" both forbid deeper edits here) — the inbox
   retarget lives in the one added line + `agent_readme_todo.md` + the queued
   swap. Residual tension flagged in `todo_inbox.md`; your call how far the
   explorer-role rewrite goes (likely a follow-up task, needs a spec).
4. Mid-session, maintainer inbox item `inbox_worker/2026-09-11_02-03.md` arrived
   (loop.log START/RETURN/DONE lines for the three roles, log in the autorun
   archive folder). OUT OF SCOPE here — the task spec defers the plain-text
   session log to the compaction-detection task. I did not act on it and did NOT
   move it to `done/` (unhandled); it is recorded in `todo_inbox.md`. Rule needed:
   fold into the compaction-detection task spec or spec separately.
5. The `ctx:` session-id marker practice already exists on disk
   (`.opencode/archive/autorun-260910-2307/ses_f72e…md` and
   `autorun-2026-09-11_01-29/ses_f725…md`) — the prompt/readme wording matches
   established practice.

## 6. Deliberately NOT done
- No FST code / tests / plugin / `opencode.jsonc` / root `AGENTS.md` / `TODO.md` /
  `todo_records.md` / NAP touched. No `proposals/files/*` touched except the one
  allowed AGENTS.md line. Untracked planner files left alone (`archive/…/
  plan2_ho_task.md`, `inbox_planner/2026-09-11_02-03.md`).

## Final gauge (pre-commit, verbatim)
SESSION=ses_f7239dd5fffeUBcphbE8PjuHLX CTX=85762 (71%) REM=34238
