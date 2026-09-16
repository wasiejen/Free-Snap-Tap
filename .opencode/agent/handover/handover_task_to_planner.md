# Worker summary — R2 write-scope pair/fuzzy resolution (IN PROGRESS — compaction checkpoint)

STATUS: IN PROGRESS (compaction checkpoint 2026-09-16; baseline green, design settled,
implementation started). Resume: re-read this file + the task spec
(`.opencode/agent/handover/handover_task.md`) + `intercept_observer_core.ts` /
`intercept_observer.ts`; the design below is the committed intent.

## Baseline (verified by RUNNING before any edit)
- probe `node .opencode/plugin/probes/handover_probe.mjs` → **193/193 PASS** (twice —
  once pre-edit, once after the `WRITE_FUZZY_MAX_D` constant addition; still 193/193).
- smoke `node .opencode/plugin/tests/intercept_observer.smoke.mjs` → **31/31 ALL PASS**.
- `grep -c ^export .opencode/plugin/intercept_observer.ts` → **1**.

## What is done (committed)
- `intercept_observer_core.ts`: added `export const WRITE_FUZZY_MAX_D = 1` (write-scope
  fuzzy bar, tighter than read's d<=2). Nothing else yet.

## Design decisions (settled — pin these in the final handover)
1. **Verdicts stay the nine** (byte-identical, `VERDICTS.length === 9` pinned at probe
   171 + smoke). Write-scope REUSES existing verdicts + evidence tokens:
   - write-path pair line: `pair=[l:r] canon=N dist=d gate=mutated|both-exist|none-exist`
     (same form as read R1); write MISMATCH → `... gate=fail-closed` (new token, FAIL-CLOSED,
     never mutate — the asymmetry vs read [191]).
   - fuzzy write line: `fuzzy scope=write orig=... -> ... d=1 gap=...` /
     `fuzzy scope=write orig=... cands=... reason=...` (explicit `scope=write` flag per spec).
   - bash git-ref line: mutated → `pair=[l:r] canon=N dist=0 gate=ref-mutated run=<hexrun>`
     (pair-resolved); gate failed → `... gate=ref-rejected run=<hexrun>` (observed-
     redundancy-ok, no mutation); run < 4 hex chars → **bare R1 log-only form**
     `pair=[l:r] canon=N dist=0` (no gate token — keeps probe [192] byte-exact green).
   - bash mismatch → bare R1 form `pair=[l:r] canon=N dist=d` (redundancy-mismatch, no
     gate attempt — fail-closed).
2. **Ownership (no double-logging):** for `write`/`edit`/`block_transfer` the write
   channel owns ALL pair lines of the call: path fields (write/edit `filePath`,
   block_transfer `srcFile`+`dstFile`) get the gate channel; every OTHER string field
   (`content`, `oldString`, `newString`, `bufferName`, ...) gets the observation-form
   pair line (no gate, no mutation — the content-scope guard: mutation is scope, not
   grammar; `args[1:one]` in content → log line only). `observeArg` then runs with
   skipPairs=true for the whole call. For bash, the git-ref channel owns the pair lines
   only when `args.command` is a string (object form); raw-string bash args keep R1
   observation behavior (no ref-channel mutation of unstructured strings).
3. **Channel line cap:** 3 (MAX_LINES_PER_CALL) for write-channel pair lines (path
   fields first, then content fields); fuzzy: at most one line per path field.
4. **Hook logging order (channel-first):** channel pair/ref lines → observation lines →
   fuzzy lines, for ALL tools. Read order stays compatible (no read pin constrains
   obs-vs-pair relative order; [189] has empty obs). REQUIRED for the smoke pin
   "priority order (pair before dense)" (bash `ls [4:four] 20260916` → the pair line now
   comes from the channel and must log before the dense obs line) and probe [167]/[169]
   (2 lines total, verdict vocab on the first).
5. **Write-path pair gate** (runPairWrite): per path field — any MISMATCH in the field
   → the whole field FAILS CLOSED (no mutation; mismatch lines gate=fail-closed, ok
   lines also gate=fail-closed, no-candidate lines keep gate=left/right-unknown); else
   canonical = all resolved pairs replaced (right-wins), mutate iff canonical EXISTS and
   the pair-form path does NOT (read-scope semantics; both/none → no mutation + gate
   evidence).
6. **Fuzzy write channel** (runFuzzyWrite): runs on the (possibly pair-mutated) result,
   per path field; existsSync fast-path (existing target → no line); `resolveWritePath`
   (new core fn) = the SAME matcher as resolveReadPath with maxD=1 (gap rule unchanged
   FUZZY_MIN_GAP=2, corpus unchanged) → resolved: mutate + fuzzy-resolved scope=write;
   rejected: fuzzy-rejected scope=write (top-3 cands + reason).
7. **Git-ref channel** (runGitRefBash, bash `{command}` strings): checkPairs; any
   mismatch → fail-closed (bare lines); else for each ok pair: substitute into a
   candidate command, extract the maximal hex run spanning the pair's canonical digits
   (scan left/right of the canonical span); run < 4 → bare line; run >= 4 →
   `spawnSync("git", ["rev-parse","--verify",run], {cwd: dir, stdio:"ignore",
   timeout: 2500})` (never throws → false); MUTATE iff ALL ok pairs' runs verify
   (atomic, all-or-nothing for the command); mutated → command = fully substituted,
   lines pair-resolved gate=ref-mutated run=...; else lines gate=ref-rejected run=...
   (for >=4 runs) / bare (for <4).
8. **Core matcher refactor:** `resolveReadPath` body → internal `matchNearPath(argRel,
   corpus, maxD)`; `resolveReadPath` = matchNearPath(…, FUZZY_MAX_D) (byte-identical
   behavior, pins 172-178 safe); new exported `resolveWritePath` = matchNearPath(…,
   WRITE_FUZZY_MAX_D). `checkPairs`/`PairCheck` reused unchanged (no pair-math
   re-derivation).
9. **Probe S20 (13 checks, 195-207, APPENDED after S19, before S5 hygiene — no
   renumbering):** setup = `git init` at the SANDBOX root + one seed commit (via
   `git -c user.name -c user.email`) + a 40-hex tag `1234abcd5678ef901234abcd5678ef901234abcd`
   (ref resolution via tag name is deterministic — a 40-char hex string resolves only as
   that exact tag/sha; the fail ref `9234…` is 1-char-off → deterministic reject).
   Pins: 195 write gate exists→mutated; 196 gate none-exist→2 lines (pair +
   fuzzy-rejected scope=write); 197 both-exist→1 line gate=both-exist; 198 mismatch→
   fail-closed (NOT mutated even though file-8.txt exists — the asymmetry pin);
   199 block_transfer srcFile pair→mutated (dstFile = existing clean path, no line);
   200 write fuzzy d=1 (dedicated `pf/wf/` single-sibling corpus)→mutated +
   fuzzy-resolved scope=write d=1 gap=inf; 201 write fuzzy d=2→fuzzy-rejected
   scope=write reason=d-too-high; 202 write content guard (`content` carries
   `args[1:one]`)→1 log line, args byte-identical; 203 edit content guard
   (`oldString` `a[2:two]b`)→1 log line, args byte-identical; 204 bash ref gate PASS
   (`git log [1:one]234abcd…`→mutated, gate=ref-mutated run=…); 205 bash ref gate FAIL
   (`[9:nine]…`→gate=ref-rejected, no mutation); 206 bash ref mismatch→bare mismatch
   line, no mutation; 207 bash ref no-candidate (`[4:foour]`→gate=right-unknown, no
   mutation). Update: tally line 490 → `S19=13 S20=13 hygiene=6 → "PROBE handover:
   206/206 PASS"` + a S20 entry in the WHAT-IT-RUNS block (after the S19 entry at
   ~line 478) + one `EXTENDED 2026-09-16 (R2…)` line in the file header.
10. **Smoke extension (section 10, before the LIVE-log check):** the DoD controlled
    scratchpad write — fixture `proj/wfx/file-4.txt` (content TWIN); hook `write`
    `{filePath: proj\wfx\file-[4:four].txt, content: "R2-WRITE"}` → mutated to
    `file-4.txt`; the smoke then writes the content to the MUTATED path (simulating the
    tool landing) and asserts: file content == "R2-WRITE", pair-form file absent,
    log line 8 fields tool=write, field 5 = the ORIGINAL arg (pair form), field 6 =
    `pair=[4:four] canon=4 dist=0 gate=mutated`, verdict pair-resolved; plus a
    write-fuzzy d=1 check and a content-guard check. New total 31 + ~6 checks —
    report the final count in the handover.

## Frozen pins that MUST stay green (regression gate)
- probe [192]: bash `echo [4:four]` → exactly ONE line, evidence byte-exact
  `pair=[4:four] canon=4 dist=0`, verdict observed-redundancy-ok, args byte-identical
  (the run<4 → bare-form rule exists FOR this pin).
- probe [167]/[169]: bash `{filePath, command:"ls [4:four] 20260916"}` → args NOT
  mutated, exactly 2 lines total.
- smoke check (2): pair line BEFORE dense line for that bash arg (channel-first order).
- smoke (1): exactly 2 lines; [189]-style read pins (pair line gate tokens, fuzzy
  lines byte-exact `fuzzy orig=…` WITHOUT scope flag); VERDICTS = 9 (probe 171, smoke).
- read-scope behavior FROZEN: runPairRead/runFuzzyRead untouched.

## Remaining work
1. core: matcher refactor (item 8) + header comment update (evidence forms incl.
   `gate=fail-closed|ref-mutated|ref-rejected run=…` and `fuzzy scope=write …`).
2. plugin: `WRITE_PATH_FIELDS`, `runPairWrite`, `runFuzzyWrite`, `runGitRefBash`,
   `gitRevParseVerify` (spawnSync), hook wiring (ownership + channel-first order),
   header doc update. Import spawnSync from node:child_process; resolveWritePath +
   MAX_LINES_PER_CALL from the core.
3. probe S20 per item 9; smoke per item 10.
4. Gate: probe + ALL smokes + pytest + ruff (standard gate). Commit (code + TODO +
   handover in ONE commit). Handover with MEASURED numbers (new probe total 206?,
   smoke total, gate status, the controlled write result).
5. todo_inbox.md: append the residual-hazard note — a `write` of a NEW file with a d<=1
   existing sibling is re-targeted onto the sibling (over-write risk); the spec's strict
   existence gate cannot distinguish "intended new file" from "drifted target" (design
   question for the maintainer, approved-as-is for R2).
