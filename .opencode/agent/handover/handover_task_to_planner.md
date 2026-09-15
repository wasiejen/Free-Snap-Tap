# handover_task_to_planner — worker-4 (DONE — final)

Task: compact_memory pre-compaction dump hook (plan4), spec
`handover_task.md` (loop copy `plan4_ho_task.md`). Session
ses_f59c0d40affePju49VV2U179cp (resumed once after a cross-compact; post-
compaction protocol followed, all 8 instruction files re-read).

## Result: COMPLETE — all DoD criteria met, gates green

### Files changed (the exact spec scope)
- `.opencode/plugin/compact_memory.ts` — the hook (spec design implemented
  verbatim):
  - `preCompactionDumpName(sessionID, count, stamp)` — pure, clock-free,
    exported for the probe: `compaction_dumps/<sid>_c<count>.md`, stamp
    (caller-supplied `YYYYMMDDTHHmmss`) inserted BEFORE the `.md`.
  - `preCompactionDump(root, sessionID, count)` — runs
    `dump_session.cjs <sid> --out <name>` via execFileSync (60 s timeout);
    no-overwrite: if the base target exists on disk, the name is stamped;
    best-effort — NEVER throws; on failure appends
    `DUMP-FAIL <sid> <one-line error>` to `<root>/.opencode/temp/ctx.log`
    (same append style as `appendCompactLine`) and returns
    `{ok:false, error}`.
  - Call site at the shared hook point (after the budget gate, just before
    the client-call comment): `preCompactionDump(root, sessionID, count)`
    with `count = budgetCount(root, sessionID)` (line 528). On `!ok`, a
    `\nWARNING: pre-compaction dump failed for <sid> (<error>)` line is
    appended to BOTH dispatch responses (compact + summarize branches); on
    success the response is UNCHANGED. Dispatch itself untouched.
- `.opencode/agent/scripts/db/dump_session.cjs` — the new optional
  `--out <relpath>` flag (single-session only): writes to
  `OUT_DIR/<relpath>` (parent dirs created); relpath validated (relative,
  no leading `/`, no backslash, no `.`/`..`/empty segments, safe chars —
  else exit 2); `--all` + `--out` → exit 2; usage text + header updated.
  Default `<sid>` mode and the `readOnly:true` DB open are unchanged.
- `.opencode/plugin/probes/handover_probe.mjs` — append-only S14 section
  (checks 101-107) + header total line (106/106) + header comment + the
  S13-preamble stub (see deviation below) + 2 new FINGERPRINT ids
  (`ses_pc_noscript`, `ses_pc_ok`).
- `.opencode/agent/scripts/db/README.md` — `--out` in the dump_session.cjs
  row + a usage example + a note that the no-overwrite awareness lives in
  the plugin hook, not the script.
- `.opencode/agent/knowledge/knowledge_tools.md` — new entry (Do/Why/Ref/
  Keys): the pre-compaction dump hook contract + the no-overwrite naming.
- `TODO.md` — the line-152 entry (#55) Status → BUILD LANDED (plan4); the
  entry stays OPEN; no other TODO entry touched.

### Verification (measured, this session, from the repo root)
- `node .opencode/plugin/probes/handover_probe.mjs` →
  **`PROBE handover: 106/106 PASS`**, exit 0.
  N = 94 (the true baseline — machine-verified in this session by running
  a temp copy of the HEAD probe: 94 checks, the baseline header total
  matches its runtime count) + 7 (S14 checks 101-107, the only ids added —
  machine-verified id-set diff: ADDED = 101..107 exactly, nothing removed,
  no duplicates). The spec's baseline line "94/94" is the reconciled typo
  noted in the launch (the baseline is 94/94); the DoD formula N = 94 + 7
  = 106 holds exactly.
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed, 1 warning**
  (baseline match).
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed
  (F=0)** (baseline match).
- `git diff --stat` scope = exactly the six named files (+ this summary);
  the maintainer's live edits (`.opencode/maintainer/ideas.md`,
  `my_todos.md`) and the loop log are present in the tree but NOT staged.
- The live host DB was never opened write: the script opens
  `readOnly:true` (unchanged); the probe runs the FAKE script in its
  sandbox only.

### One deliberate deviation (documented)
The S13 PREAMBLE now places a stub `dump_session.cjs` at the SANDBOX
script path before the S13 dispatches run. Why: the hook fires on EVERY
dispatch; a dump SUCCESS appends nothing to the response (byte-exact
checks 87/90/97 stay green), but a MISSING script would append the
WARNING and break those three byte-exact checks. S14 removes the stub
(check 104, the no-script/DUMP-FAIL case) and re-places it (checks
105-107, the fake-script no-overwrite proof). The stub mimics the real
script's `__dirname`-derived OUT_DIR + `--out` handling; it only ever
writes inside the sandbox.

### Deliberately NOT done
- Host-side activation (the maintainer's domain): `opencode.jsonc`
  untouched; the hook takes effect at his next host restart.
- Live acceptance is PENDING that restart: a single compact_memory call
  must then produce
  `.opencode/archive/sessions/compaction_dumps/<sid>_c0.md` (recorded in
  the TODO #55 status).
- No corpus refresh, no FST product code, no prompt edits, no scratchpad
  originals touched.

### Commit
The commit that stages this file: six named files + `TODO.md` + the two
handover files (find it via `git log` for "pre-compaction dump hook").
