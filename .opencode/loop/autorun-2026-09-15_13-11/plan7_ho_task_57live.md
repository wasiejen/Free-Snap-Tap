# TASK SPEC — plan7: #55-live — dump hook node-resolution fix (live host breaks the dump)

Worker: `worker_Q4_140K`
Branch: stay on the current checkout (`opencode_test`).

## Goal
The pre-compaction dump hook must spawn its dump script with a REAL node
runtime. On the live opencode host `process.execPath` is the opencode CLI
binary, so the spawn runs `opencode.exe dump_session.cjs ...` (the CLI prints
its help, the dump always fails, a WARNING rides every dispatch response).
On plain node (smokes/probe) it works — which is why the smokes stay green.
Fix the resolution; keep the hook contract (dump failure → WARNING, never
blocks) intact.

## Verified facts (planner-measured at spec time, HEAD 3f94875 — do NOT re-derive)
- The spawn site: `.opencode/plugin/compact_memory.ts` line ~279 (inside
  `preCompactionDump`):
  `execFileSync(process.execPath, [scriptPath, sessionID, "--out", name], { timeout: 60_000, stdio: "pipe" });`
- Live evidence (plan7, the worker-9 rescue compaction, 03-49): the dispatch
  returned `WARNING: pre-compaction dump failed for ses_... (Command failed:
  C:\Users\Wasiejen\AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.exe
  C:\Users\...\dump_session.cjs ... <opencode CLI help text>)`; a `DUMP-FAIL`
  line was appended to `.opencode/temp/ctx.log` (the failure-logging path
  works); the compaction itself SUCCEEDED (COMPACT line in ctx.log). So the
  hook contract holds; only the executable resolution is wrong.
- The host's execPath basename here is `opencode.exe`; a plain node runtime's
  is `node` / `node.exe` (also `nodejs.exe` on older Windows installs).

## What to change (the scope)
1. `.opencode/plugin/compact_memory.ts`:
   - Add a small EXPORTED resolver next to the hook code:
     `export function resolveNodeExe(execPath: string = process.execPath): string`
     — returns `execPath` when its basename (lower-cased) STARTS WITH `node`
     (covers node / node.exe / nodejs.exe), otherwise the literal `"node"`
     (resolved from PATH by execFileSync — on Windows PATHEXT finds node.exe).
     One comment: the live opencode host's execPath is the CLI binary, not a
     node runtime; a wrong spawn fails the dump safely (WARNING) but the
     corpus dump would never happen.
   - Use `resolveNodeExe()` at the spawn site (line ~279). Nothing else in
     `preCompactionDump` changes.
2. `.opencode/plugin/tests/compact_memory.smoke.mjs` — add 2-3 chks on the
   exported `resolveNodeExe`:
   - `resolveNodeExe("C:\\Program Files\\nodejs\\node.exe")` returns that same
     path;
   - `resolveNodeExe("C:\\x\\opencode.exe")` returns `"node"`;
   - `resolveNodeExe()` (the live default) returns a string whose basename
     (lower-cased) starts with `node` (under plain-node smokes this is true;
     do NOT pin the exact path).
   Header comment: one line noting the resolver + why.

## Definition of done (measured)
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` → ALL PASS, total =
  old 43 + your new chk count.
- ALL smokes in `.opencode/plugin/tests/` green (run each).
- Standard gates UNCHANGED at the plan7 baseline:
  - `node .opencode/plugin/probes/handover_probe.mjs` → 120+2/120+2 PASS (do NOT
    add probe checks for this — the resolver fallback is not reachable under
    plain node; a probe pin would test the wrong thing)
  - `./.venv/Scripts/python.exe -m pytest -q` → 459 passed + 1 warning
  - `./.venv/Scripts/ruff.exe check --select F .` → 0 findings
- `git status` clean after your commit (code + smoke + TODO.md + handover).

## TODO.md bookkeeping
- This work realizes the APPROVED #55 design (its acceptance already requires
  the live dump to land). Do NOT close #55 — its live acceptance is still
  pending the maintainer's next host restart (the plugin reloads then; the
  first post-restart compaction must produce
  `.opencode/archive/sessions/compaction_dumps/<sid>_c0.md`). In #55 add a
  one-line status note: node-resolution fix landed (commit hash); live
  acceptance still pending the host restart.
- `todo_inbox.md`: append any out-of-scope findings (dated + role-tagged).

## DO-NOT-touch
- The probe file; the two tool files (`.opencode/tools/*.ts`);
  `ctx_watchdog.ts`; everything under `.opencode/agent/prompts/**` (edit-deny)
  and `.opencode/maintainer/**`. No changes to the hook's failure contract
  (WARNING on the response, DUMP-FAIL line, never throws, never blocks).
