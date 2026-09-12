# repo_commands.md — repo commands part of `agents_repo.md` (split 2026-09-11)

Sections moved verbatim from the root `agents_repo.md`; the root file is now a
thin index pointing at the parts.

## Environment & shell
The `bash` tool = **PowerShell (pwsh 7.6)** — NOT git-bash. Default = pwsh
(pytest/ruff/git, exe invocation, scalar values); git-bash only for true unix
pipes / grep / heredocs.
- NEVER unix idioms at pwsh level: `ls -la`, `uname`, `grep x f`, `cat > f <<EOF`,
  GNU flags. Aliases `ls`/`rm`/`cp`/`mv` are cmdlets (their flags fail);
  `<<EOF` never parses — here-strings are the only heredoc.
- **Invoke**: `& "path with spaces\exe" args`; chain `a && b` (7+), `;` ignores
  status; FS/cmdlets/params case-insensitive.
- **Vars**: `$v='x'`; `"$v"` interpolates; single quotes verbatim; `"don''t"`.
- **Output**: prefer scalars — `$PWD`, `(Get-Item x).Name`,
  `Get-ChildItem <dir> -File -Name` (`-File`: files only, without it `-Name`
  also lists dirs). Table output (default `gci`, bare `Get-Location`) bakes
  ANSI codes into captured text — `$env:NO_COLOR='1'` won't stop it.
- **Writes**: file tools only — no `>` / `Set-Content` except stdin piping.
- **Timeout**: tool default 120s — pass `timeout` (ms) for heavy ops.
- **Python**: bare `python` on PATH = 3.14, NO repo deps (fake-starts, then
  import-fails). Always `& .\.venv\Scripts\python.exe` (same for `ruff.exe`).
- **Env var**: `FST` = repo root **with trailing `\`** — `${env:FST}tests`
  composes.
- **git-bash**: `bash -c 'uname -a; ls -la'` (single quotes safe in pwsh;
  `bash.exe` on PATH); heredoc = pipe a QUOTED here-string —
  `@'
    cat <<EOF
    body
    EOF
  '@ | bash`
  NEVER use EXPANDABLE `@"..."@` for bash scripts — pwsh expands `$var` FIRST,
  silently emptying bash vars. Inherits cwd (`workdir` applies).
- **Paths from bash**: its `pwd` prints `/c/Users/...` — NEVER paste into pwsh.
  Windows form: `bash -c 'pwd -W'` — it prints **slashes** (`C:/Users/x`, valid
  Windows path; don't expect `C:\`); or translate `/c/Users/x` → `C:\Users\x`;
  pwsh 7.6 has no `ConvertTo-Path`.

## Run / test
- venv with all deps: `.venv` (do NOT reinstall from scratch; `requirements.txt`
  is runtime, `requirements-dev.txt` adds test tooling, `requirements-build.txt`
  is executable-packaging only (Nuitka/PyInstaller) — CI installs runtime+dev only).
- Run tests: `& .\.venv\Scripts\python.exe -m pytest -q`
- Coverage: `& .\.venv\Scripts\python.exe -m pytest -q --cov=fst_data_types --cov=fst_manager --cov=fst_save_file_handler --cov=fst_keyboard --cov=fst_tasks --cov=vk_codes --cov=fst_overlay`
- Lint: `& .\.venv\Scripts\ruff.exe check --select F .` Current expected finding
  count is a moving baseline — see `.opencode/handover/handover_planner.md` and
  relevant `TODO.md` entries.

## Handover file paths
Channel semantics (who writes/reads, canonicality) live in the `AGENTS.md`
interaction-contract table — this section keeps only the concrete repo facts:
- The plan-state file `.opencode/handover/handover_planner.md` is what the
  maintainer calls the **NAP** (**N**ext **A**gent **P**rompt) — "NAP"/"write a
  NAP" means this file. Phase close moves it to
  `.opencode/archive/<YYYY-MM-DD>-<slug>.md` with a STATUS header. All handover
  files live in `.opencode/handover/`.
- Context gauge (self-gauge): prefer the `ctx_gauge` tool when it is in your
  toolset (same readout, in-band — no shell-out); the command below is the
  fallback (the tool is registered host-side and takes effect at the
  maintainer's next process restart): run
  `node .opencode\plugin\scripts\peek.mjs` from the repo root, read-only →
  `SESSION=… CTX=n (p%) REM=m` (window unknown → `CTX=n` only; no finished
  step → `CTX=notAvailable`).
- Durable maintainer TODOs: `TODO.md`.
