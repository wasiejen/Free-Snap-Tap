# TASK SPEC — plan7: #60 probe pins for block_transfer + loop_log

Worker: `worker_Q4_140K`
Branch: stay on the current checkout (`opencode_test`).

## Goal
Add APPEND-ONLY probe sections pinning the two custom tools that have smokes
but ZERO probe pinning (drift would be silent today): `block_transfer`
(section S15) and `loop_log` (section S16) in
`.opencode/plugin/probes/handover_probe.mjs`. Both tools are imported DIRECT,
type-stripped — the SAME way the probe already loads `compact_memory.ts` and
`ctx_gauge.ts` (see the S12/S13 load pattern in the file).

## Verified facts (planner-measured at spec time, HEAD d067695 — do NOT re-derive)
- Probe baseline: `node .opencode/plugin/probes/handover_probe.mjs` →
  **106/106 PASS** (re-verified after the #57 fix). Header line 18 annotates
  S14 as "checks 101-107"; the max check label in the file is 107 while the
  reported total is 106 — the label set and the counter are NOT perfectly
  aligned (a few check() calls use label forms a naive grep misses). BEFORE
  adding checks: machine-verify the real max label
  (e.g. `node -e` scan of `check("NNN"` calls) and CONTINUE from there;
  AFTER: the reported total must be exactly 106 + (checks you added) and the
  header annotation must agree with the REPORTED total (the #61 discipline:
  self-count and annotation agree at HEAD).
- `block_transfer.ts` (post-#57, read in full by the planner):
  - registration: `export default tool({...})` (no name field — filename
    naming, same as loop_log/ctx_gauge); args: `mode` zod enum
    ["MOVE","COPY","CUT","PASTE","DELETE","CLEAR"] + 5 OPTIONAL strings
    (srcFile, dstFile, startMarker, endMarker, targetMarker) + optional
    `bufferName`.
  - semantics: block = startMarker line .. endMarker line INCLUSIVE (endMarker
    searched only AFTER startMarker); missing startMarker/endMarker → error
    naming the marker; PASTE/MOVE insert RIGHT AFTER targetMarker, or at EOF
    when omitted/absent; buffer default `'default'`; success messages
    `Moved|Copied|Cut|Deleted|Pasted <n> lines ...`;
    **MOVE with missing dstFile → the exact byte string
    `Error: 'dstFile' is required for MOVE mode.` WITH THE SOURCE FILE
    UNTOUCHED** (the #57 post-fix pin — check is hoisted pre-write);
    sandbox: every path resolves inside `context.directory` or the TEMP roots
    or the call is rejected BEFORE any fs access with
    `Error: '<path>' is outside the sandbox (allowed: <roots>)`.
  - the module keeps in-memory `clipboardBuffers` — drive multiple execute()
    calls on ONE loaded instance (COPY into a buffer, then PASTE/CLEAR from
    it); CLEAR returns `Clipboard buffer '<name>' cleared.`
- `loop_log.ts` (112 lines, read in full by the planner):
  - args: `role` string, `model` string, `status` zod enum of the FIVE 8-char
    tokens `-->START` `DONE<---` `-RETURN-` `-WARNING` `--INFO--` (a bogus
    token is rejected at PARSE time by the schema — pin via
    `args.status.safeParse` on the loaded tool, not by calling execute),
    `content` string, `session` OPTIONAL string.
  - behavior: loop root = `<context.directory>/.opencode/loop`; zero
    `autorun-*` folders → CREATES `autorun-<YYYY-MM-DD_HH-MM>` (local clock,
    minute resolution — pin the STAMP FORMAT with a regex, never the exact
    value); exactly one → used; several → most-recently-MODIFIED + an
    `ANOMALY:` note in the return; line form
    `<stamp> <status> <role> <session|unknown> <model> <content>`
    (session omitted/empty → the literal `unknown`); return is
    `folder: <name>\nline: <exact line>` (+ `\nANOMALY: ...` when applicable);
    append-only (the file gains exactly one line per call).
  - the probe drives it with `context.directory = <probe sandbox>` — the
    sandbox is inside TEMP, so the created folder + `loop_log.md` land in the
    sandbox (never in the repo's real `.opencode/loop/`).

## What to change (the scope)
1. `handover_probe.mjs` — APPEND section **S15 (block_transfer)**: the
   registration shape + arg schema (enum values + optionality), the anchor
   semantics (inclusive end, end-after-start), the #57 pin (MOVE missing
   dstFile → exact error + byte-identical source), the sandbox rejection
   (outside path → exact error prefix + no file created/modified), one
   COPY→PASTE roundtrip + CLEAR (buffer lifecycle), targetMarker insertion
   point vs EOF append. Fixture files live in the probe sandbox; create them
   fresh (the sandbox is a fresh mkdtemp each run).
2. APPEND section **S16 (loop_log)**: the registration shape + the status
   ENUM pin (5 tokens; a bogus one fails safeParse), the line format (stamp
   regex + field order + the `unknown` session fallback), the return shape
   (`folder: …\nline: …`), auto-creation of the dated folder when the loop
   root is empty (stamp FORMAT only), append-only (file gains exactly one
   line), and the SEVERAL-folders anomaly note (create two dummy `autorun-*`
   dirs in the sandbox, call once, expect the `ANOMALY:` note + the
   most-recently-modified folder used).
3. Header: add the S15/S16 entries to the per-section comment list (the block
   that ends at the S14 entry, ~line 282 ff.) AND the EXTENDED changelog line
   at lines 5-24 (one line, the S15/S16 ranges you actually used + the new
   total). Update the total annotation so it agrees with the probe's reported
   total.
4. ADJACENT (pre-approved comment fix, same file): the "EXACT RUN COMMAND"
   header block (lines 26-28) still says "PowerShell 7" + backslash paths —
   the shell switched to Git-Bash 2026-09-15 (verified in repo_commands.md).
   Correct that block to the bash form (`node .opencode/plugin/probes/handover_probe.mjs`
   from the repo root) with one comment line noting the switch.

## Definition of done (measured)
- `node .opencode/plugin/probes/handover_probe.mjs` → ALL PASS, reported total
  = 106 + (your new check count); header annotation agrees with the reported
  total (state both numbers in the handover).
- ALL smokes in `.opencode/plugin/tests/` still green (run each).
- `./.venv/Scripts/python.exe -m pytest -q` → 459 passed + 1 warning;
  `./.venv/Scripts/ruff.exe check --select F .` → 0 findings.
- `git status` clean after your commit (probe + TODO.md close-note + handover
  in one commit per the commit routine).

## TODO.md bookkeeping
- Close-note on #60 (one line: S15/S15 landed, new probe total, commit hash).
- `todo_inbox.md`: append any out-of-scope findings (dated + role-tagged) —
  e.g. anything about the 106-vs-107 label/counter misalignment you
  machine-resolve while working (a short factual note, not a fix).

## DO-NOT-touch
- The two tool files (`.opencode/tools/*.ts`) — read-only reference here; the
  smokes; `compact_memory.ts` / `ctx_watchdog.ts`; existing probe checks
  (append-only discipline — never renumber or reword an existing check);
  everything under `.opencode/agent/prompts/**` (edit-deny) and
  `.opencode/maintainer/**`.
