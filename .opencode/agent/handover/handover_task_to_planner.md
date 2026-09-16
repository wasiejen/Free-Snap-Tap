# Worker summary — R2 write-scope pair/fuzzy resolution (COMPLETE)

STATUS: COMPLETE — full standard gate green (measured below). Code commits:
`f0b857a` (WRITE_FUZZY_MAX_D constant + checkpoint) and `deb4927` (channels, S20
probe pins, smoke 8f); this file + the todo_inbox entries + the loop log ride
the FINAL bookkeeping commit (see `git log` — the commit right after `deb4927`).
Branch: `opencode_test`. Read scope + all R1 pins FROZEN and green.

## Measured verification (full standard gate, run after all edits)
- probe `node .opencode/plugin/probes/handover_probe.mjs` → **206/206 PASS**
  (self-annotation section sum machine-verified = 206; S20 = 13 new checks,
  labels 195-207, all green; every R1 pin — incl. [167]/[169]/[189]/[192] —
  stays byte-exact green).
- smoke `node .opencode/plugin/tests/intercept_observer.smoke.mjs` →
  **35/35 ALL PASS** (31 baseline + 4 new in section 8f).
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed**, 1 warning.
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed**.
- `grep -c ^export .opencode/plugin/intercept_observer.ts` → **1** (export
  contract; also pinned by the smoke).
- Baseline before edits (previous session, run twice): probe 193/193,
  smoke 31/31.

## The DoD controlled scratchpad write (end-to-end audit)
smoke 8f: fixture `proj/wfx/file-4.txt`; hook `write` with
`{filePath: …\wfx\file-[4:four].txt, content: "R2-WRITE"}` → `filePath`
MUTATED to `…\wfx\file-4.txt`; the simulated tool lands the content at the
MUTATED path; asserted: file content == `R2-WRITE`, the pair-form path
absent, and the log line (8 fields) carries field 5 = the ORIGINAL pair-form
arg and field 6 = `pair=[4:four] canon=4 dist=0 gate=mutated`, verdict
pair-resolved. **The resolved write lands exactly where the log says it
lands.**

## What changed (as implemented)
- `intercept_observer_core.ts`: `WRITE_FUZZY_MAX_D = 1`; the read matcher
  body refactored into internal `matchNearPath(argRel, corpus, maxD)` with
  `resolveReadPath` (maxD=2, byte-identical behavior) and new exported
  `resolveWritePath` (maxD=1); header evidence-forms extended
  (`gate=fail-closed|ref-mutated|ref-rejected run=…`, `fuzzy scope=write …`).
- `intercept_observer.ts`: `WRITE_PATH_FIELDS` (write/edit `filePath`,
  block_transfer `srcFile`+`dstFile`); `runPairWrite` (per path field:
  mismatch FAILS CLOSED — `gate=fail-closed`, never a mutated write target;
  else mutate iff canonical exists AND pair-form path does not — same strict
  gate as read; content/other string fields get the observation-form pair
  line ONLY, never mutated — the content-scope guard, the `args[1:one]`
  python-slice collision); `runFuzzyWrite` (d<=1, `scope=write` evidence
  flag); `runGitRefBash` + `gitRefExists` (see deviation 1); hook ownership
  (write tools own ALL pair lines of the call; bash owns them when
  `command` is a string — `observeArg` skipPairs; raw-string args keep R1
  behavior) and channel-first logging order (channel → obs → fuzzy).
  The nine VERDICTS stay byte-identical (pinned).
- probe S20 (13 checks, appended, no renumbering): write gate
  exists→mutated / none-exist→2 lines / both-exist→1 line / mismatch
  fail-closed asymmetry / block_transfer srcFile; write fuzzy d=1→mutated +
  d=2→rejected (`scope=write`); content guards (write `content`, edit
  `oldString`); bash ref gate PASS/FAIL, mismatch, no-candidate.
- smoke 8f (4 checks): the controlled write audit above, the content-scope
  guard, the write-fuzzy d=1.

## Deviations from the pre-compaction design (discovered during the gate run)
1. **The ref gate is `git for-each-ref --format=%(refname:short)` +
   membership, NOT `git rev-parse --verify`.** Measured: git parses a pure
   40-hex string as an OBJECT name — `rev-parse --verify <40hex>` exits 0
   for ANY 40-hex string (even a non-existent sha) and never consults a ref
   whose name is exactly 40 hex chars; `^{}`/`^{commit}` peels do not fix
   it (the ref is ignored, with an ambiguity warning). The for-each-ref
   membership check is a true existence test (covers all namespaces),
   fail-closed on any spawn failure, bounded (2500 ms timeout). All
   comments/docs updated to match.
2. **The S20 tag constants were regenerated machine-side**: the first
   hand-typed hex literals bit-drifted to 48 chars (and contained a
   6-digit run that fired the OBS dense channel — a second log line). The
   final tags (`1b2c3d4a…` / `9b2c3d4a…`, 40 chars, 1-char diff, no 6+
   digit run) were built and verified by a node script (lengths,
   suffix==TAG.slice(1), diff count) and the probe file patched by script —
   no further dense-string retyping. Probe comment records the 6-digit-run
   constraint.
3. Smoke grew 31→35 (+4, not ~6 as estimated pre-compaction — the
   controlled write is two asserts on one fixture, not three).

## TODO / inbox entries (APPENDED, unnumbered — planner curates)
- `todo_inbox.md` (2026-09-17, worker): the residual hazard of the approved
  design — a `write` to a NEW file whose name is a d<=1 near-miss of an
  existing sibling gets re-targeted onto the sibling (over-write risk); the
  strict existence gate cannot distinguish intended-new from drifted-target;
  the `fuzzy scope=write`/`gate=mutated` lines carry the original arg
  (auditable after the fact, not preventable at hook level). Pinned as
  behavior (probe S20 200/201, smoke 8f), not bug.
- `todo_inbox.md` (same entry, second bullet): the rev-parse 40-hex
  measurement note (why the gate is for-each-ref) for the research record.
- The stale `repo_commands.md` probe-total prose is already tracked as
  TODO #71 (maintainer-file flag) — the total moved again (193→206);
  flagged only, not edited (maintainer file).

## Deliberately NOT done
- No live/host run against the target app — plugin-level verification only
  (sandboxed probe/smoke), per the repo safety limits.
- Read scope untouched (frozen); glob/grep/section-anchors still queued
  (out of R2 scope).
- No fix for the new-file near-miss hazard (design question for the
  maintainer; appended to the inbox).
- No NAP edits (planner-owned); no pushes (maintainer-only).
