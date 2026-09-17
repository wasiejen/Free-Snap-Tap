# repo_commands.md — repo commands part of `repo_overview.md` (split 2026-09-11)

Sections moved verbatim from the former root file; the overview (`repo_overview.md`, this folder) is now a
thin index pointing at the parts.

## Environment & shell
The `bash` tool = **Git-Bash (bash 3.6, MINGW64)** — `opencode.jsonc` pins
`shell` = `C:/Program Files/Git/bin/bash.exe` (switched from pwsh 2026-09-15,
verified live in a direct session). Unix idioms work natively: `ls -la`,
`uname`, `grep x f`, `cat > f <<EOF`, GNU flags.
- **Invoke**: plain PATH commands (`git`, `node`); quote paths with spaces;
  chain `a && b` (respects status), `;` ignores status.
- **Paths**: `pwd` prints unix form (`/c/Users/...`) — fine INSIDE bash;
  file tools still want Windows form (`C:\Users\...`); the tool's `workdir`
  param accepts Windows paths and resolves them.
- **Vars**: `$v='x'`; `"$v"` interpolates; single quotes verbatim.
- **Output**: `NO_COLOR=1` stops most ANSI baking; prefer `-N`/scalar forms
  where a table would add noise.
- **Writes**: file tools only — no `>` / `cat >` except deliberate stdin
  piping.
- **Timeout**: tool default 120s — pass `timeout` (ms) for heavy ops.
- **Python**: bare `python` on PATH = 3.14, NO repo deps (fake-starts, then
  import-fails). Always `./.venv/Scripts/python.exe` (same for
  `./.venv/Scripts/ruff.exe`) — both verified working under bash.
- **Env var**: `FST` = repo root **with trailing `\`** — `$FSTtests`
  composes (the trailing backslash joins into the next path segment).
- **Temp**: git-bash `$TMP` = the user Windows temp dir (unix form) — the
  pre-approved scratchpad for work outside the repo is `$TMP/opencode`
  (= `C:/Users/Wasiejen/AppData/Local/Temp/opencode`).
- **pwsh** 7.6 is still on PATH (`pwsh`) if ever needed — its old guidance
  (cmdlets, here-strings, `&` invocation) no longer applies to the default
  shell.

## Run / test
- venv with all deps: `.venv` (do NOT reinstall from scratch; `requirements.txt`
  is runtime, `requirements-dev.txt` adds test tooling, `requirements-build.txt`
  is executable-packaging only (Nuitka/PyInstaller) — CI installs runtime+dev only).
- Run tests: `./.venv/Scripts/python.exe -m pytest -q`
- Coverage: `./.venv/Scripts/python.exe -m pytest -q --cov=fst_data_types --cov=fst_manager --cov=fst_save_file_handler --cov=fst_keyboard --cov=fst_tasks --cov=vk_codes --cov=fst_overlay`
- Lint: `./.venv/Scripts/ruff.exe check --select F .` Current expected finding
  count is a moving baseline — see `.opencode/agent/handover/handover_planner.md` and
  relevant `TODO.md` entries.
- Gate probe: `node .opencode/plugin/probes/handover_probe.mjs` (repo root; plain
  system `node`, no venv; one `MODULE_TYPELESS_PACKAGE_JSON` warning on stderr is
  expected and harmless — `.opencode/package.json` must NOT gain a "type" field,
  TODO #51). **The "standard gate" = pytest + ruff + this probe.** The probe
  self-annotates its total: the output line `PROBE handover: <t>/<t> PASS` must
  agree with the header annotation (the section-sum line) — the annotation is
  the source; NO duplicated moving number lives here (curate-don't-duplicate,
  per #58/#64; refreshed 2026-09-17, planner-allowed per maintainer ruling for
  #71).

## Handover file paths
Channel semantics (who writes/reads, canonicality) live in the `AGENTS.md`
interaction-contract table — this section keeps only the concrete repo facts:
- The plan-state file `.opencode/agent/handover/handover_planner.md` is what the
  maintainer calls the **NAP** (**N**ext **A**gent **P**rompt) — "NAP"/"write a
  NAP" means this file. Phase close moves it to
  `.opencode/archive/<YYYY-MM-DD>-<slug>.md` with a STATUS header. All handover
  files live in `.opencode/agent/handover/`.
- Context gauge (self-gauge): prefer the `ctx_gauge` tool when it is in your
  toolset (same readout, in-band — no shell-out); the command below is the
  fallback (the tool is registered host-side and takes effect at the
   maintainer's next process restart): run
   `node .opencode/plugin/scripts/peek.mjs` from the repo root, read-only →
  `SESSION=… CTX=n (p%) REM=m` (window unknown → `CTX=n` only; no finished
   step → `CTX=notAvailable`).
   **Margin rule (maintainer 2026-09-14):** the readout UNDER-reports actual
   usage (a compaction fired at a 95 % nudge landed at 119.6 K of the ~120 K
   window) — add a 5 % margin to the gauge/nudge numbers when making budget
   decisions. A first-ever gauge in a FRESH session can return
   `CTX=notAvailable` (no finished step yet) — the next call reads fine.
- Durable maintainer TODOs: `TODO.md`.
