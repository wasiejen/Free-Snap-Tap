# Worker handover — TODO #97 (R8 redirect + escape return-info) — worker-17

**STATE: IN PROGRESS (Unit 1 code done + verified; pins pending; Unit 2 pending).**
Session ses_f271155b4ffeIWwbQEekkRQRA6 compacted at budget — resume via task_id.
Branch: `opencode_test` (verified at start; never switched).

## Done (Unit 1 code — committed in the checkpoint commit below)
- `intercept_observer_core.ts`: exported `normSandboxPath` (extracted from `underRoot`, behavior identical) + pure `resolveRedirect(span, roots)` — case (i) span==root → root as configured; case (ii) direct sibling → root + "/" + basename (case preserved); 0 or >=2 matches after root dedupe → null (fail-closed).
- `intercept_observer.ts`: `resolveAllowedRoots()` (from opencode.jsonc: `permission.external_directory` "allow" keys with `/**` stripped, `references.*.path`, + workspace root; deduped via normSandboxPath; unreadable → fallback [dir, SCRATCHPAD_ROOT]; never throws; reuses `stripJsoncComments` from compact_memory.ts); `REDIRECT_PATH_FIELDS` (read/write/edit filePath + block_transfer srcFile/dstFile — separate table, WRITE_PATH_FIELDS untouched); `runRedirect` (after fuzzy channels; mutates arg; `pair-resolved` verdict REUSED with evidence `kind=redirect tool=<t> arg=<field> orig=<full> value=<full>`; out-of-sandbox NOTE recomputed on effective args when fired; note stored per callID); `noteCache`/`storeNote` (storeHint pattern, multiple notes per callID); factory resolves roots ONCE at init.
- Smoke: `SCRATCHPAD` import + `tdir` fixture scaffold added (config-root dir, sibling of scratchpad, cleaned in finally).

## Measured gate (before adding new pins)
- smoke 55/55 (existing pins unchanged), probe 291/291, ruff `check --select F .` → All checks passed, smoke re-run after the SCRATCHPAD import fix was green.

## REMAINING (resume checklist — in order)
1. **Unit 1 pins — smoke** (insert before the `(9) live log` section; design already worked out):
   - (12a) pure: dedupe 3 root forms → one match `C:/x/rootA/other.txt`; sibling of TWO distinct roots → null; no mapping → null.
   - (12b) READ sibling of workspace root (fallback): span `base\io-r8-read-sib.txt` → mutated `proj + "/io-r8-read-sib.txt"`; kind=redirect line byte-exact (find via `.includes("kind=redirect")` — a fuzzy-rejected line may follow); NO out-of-sandbox line.
   - (12c) WRITE sibling: span `base\io-r8-write-sib.txt` → exactly ONE new line (M1: no fuzzy for write), byte-exact evidence.
   - (12d) span == SCRATCHPAD root case variant (`C:\USERS\wasiejen\APPDATA\local\TEMP\opencode`) → mutated to `C:/Users/Wasiejen/AppData/Local/Temp/opencode`.
   - (12e) nested non-sibling (`proj\deep\io-r8-file.txt`) → no mutation, no kind=redirect line.
   - then SECOND factory instance: `proj2 = base/proj2` + crafted `opencode.jsonc` (JSONC comment inside; roots `tdir/rootA`, `tdir/rootB`, `tdir/rootA/**` (twin), `tdir/sub/rootC`, references `tdir/sub2/refroot`) → use its hooks ONLY afterwards (module state `dir` flips to proj2):
   - (12g) span `tdir/both.txt` (sibling of rA AND rB) → NO mutation + out-of-sandbox note fires (read2 = `proj2/.opencode/temp/intercept.log`).
   - (12h) span `tdir/sub/only-c.txt` (sibling of rC only) → mutated `rC + "/only-c.txt"` + byte-exact line.
   - (12i) span `rA.toUpperCase()` → root as configured; span `tdir/sub2/ref-sib.txt` → `rRef + "/ref-sib.txt"` (references root).
   - finally-block: also `fs.rmSync(tdir, {recursive, force})`.
2. **Unit 1 pins — probe** (NEW section `S28` inserted AFTER S27 (ends ~L6458) BEFORE S5 hygiene (~L6460); counter `let n28 = 285`; 12 checks 285-296):
   - 285-291 PURE: case (i) w/ 2-root list; case (ii) `MY-FILE.txt` case preserved; no mapping null; two-distinct-roots null; dedupe 3 forms → first configured form; child + 2-levels-down sibling null; empty span / empty roots null.
   - 292 e2e READ sibling of ioSandboxProj: span `SANDBOX + "\\r8-read-sib.txt"` → `ioSandboxProj + "/r8-read-sib.txt"`, byte-exact line, no out-of-sandbox (find via includes; fuzzy-rejected may follow).
   - 293 e2e WRITE sibling: `SANDBOX + "\\r8-write-sib.txt"` → exactly ONE new line byte-exact.
   - 294 e2e span == root: `ioSandboxProj.toUpperCase()` → ioSandboxProj, one line.
   - 295 e2e no mapping: `C:/Windows/System32/cmd.exe` → byte-identical + exactly one out-of-sandbox line.
   - 296 e2e nested non-sibling: `ioSandboxProj + "\\deep\\r8-file.txt"` → no mutation, no kind=redirect line.
   - HEADER updates: (a) EXTENDED line at top (after the R1 line ~L43); (b) S28 description in the section list (after S27 ~L759, before S5 hygiene ~L760); (c) EXPECTED OUTPUT line (~L772): `S27=8 S28=12 hygiene=6  →  "PROBE handover: 303/303 PASS"` (291+12).
3. Run full gate (smoke 63/63, probe 303/303, pytest, ruff) → **Unit 1 checkpoint commit** (code + smoke + probe).
4. **Unit 2** (spec §Unit 2):
   - `runEscapeContent(output, tool, callID)`: on a hit, `storeNote(callID, ...)` — text drafted: `escape-resolved: <n> escape form(s) in <field> (first: <raw40 truncated + ... > len=<L> -> <value>); full pre-mutation forms: .opencode/temp/intercept.log (kind=escape) + .opencode/temp/journal_<write|edit>.log` (one note per mutated field; content/oldString/newString order).
   - journal: capture pre-escape content fields before `runEscapeContent` in onToolBefore; after, compute per-field raw hit forms (`resolveEscapes(pre, map).hits.map(h => h.raw)` for fields whose value changed); extend `appendJournal(..., escapeForms?)` → append trailing ` | pre-escape=<JSON field→forms map>` ONLY when non-empty (existing payload pins byte-identical).
   - `onToolAfter`: keep the edit-hint logic UNCHANGED, then deliver `noteCache` notes for ANY tool (also on success), hint first then notes joined "\n", consumed once, best-effort.
   - smoke pins: escape write → after-hook note (byte-exact) + journal `pre-escape` field; escape edit (old+new) → notes; no-escape call → no note; hint+note combined on a failing edit (both, hint first); consumed once.
   - gate → **Unit 2 checkpoint commit**.
5. Final: standard gate green, TODO.md #97 note (status LANDED is planner bookkeeping), final handover (exec summary, per-unit changes, measured gate totals, commit hashes, TODO entries, not-done list), friction via submit, DONE loop-log line.

## Deliberately not done / decisions to confirm
- Probe section label: spec said "S18-adjacent section (established pattern)" — I placed it as `S28` AFTER S27 / before S5 hygiene (the established append pattern of S26/S27 — inserting physically next to S18 would shift S19-S27's check-number counters). Flagging in case planner meant a literal S18-adjacent block.
- Redirect line verdict: reuses `pair-resolved` (the `kind=escape`/`kind=dedup` precedent — the 12-token VERDICTS vocabulary is pinned by smoke/probe, so no new token).
- Redirect feedback note text = the `kind=redirect` evidence string (unpinned by spec; paths kept in full — not a dense payload).

## NOT done at all (per DO-NOT-touch)
opencode.jsonc, compact_memory.ts (only imported), auto_resume/compact_memory/context_recovery/block_transfer/loop_log, FST code, maintainer files (left dirty as found).
