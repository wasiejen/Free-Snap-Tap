# WORKER SUMMARY — T1 (iter-10): block_transfer sandbox + agent-facing usage text

Worker: worker-10 (session `ses_f6c5f161fffes1Ze5jsgnZ47D0`), model
`Qwen3.8-27B-IQ4KT-120K`, branch `fst_work`.

## What changed (task commit — hash below, single file + bookkeeping)

`.opencode/tools/block_transfer.ts` only (no FST python code — META task):

1. **Path guard** — new module-level `sandboxCheck(cwd, givenPath)`:
   allowed roots = `[cwd, process.env.TEMP ?? process.env.TMP]` (empties
   filtered); the path is resolved with `path.resolve(cwd, p)` and allowed
   only if it equals a root or starts with `root + path.sep`, compared
   CASE-INSENSITIVELY; violation returns
   `Error: '<path>' is outside the sandbox (allowed: <roots>)`.
   Applied BEFORE any fs access, to EVERY file-path argument:
   - src (COPY/CUT/DELETE/MOVE) — before the `existsSync`/read;
   - dst in PASTE — before the `existsSync`/mkdir/write;
   - dst in MOVE — pre-guarded at the top of the anchor-extraction section
     (before the src cut write), so a rejected dst leaves the source
     UNTOUCHED (verified by smoke: no partial cut).
2. **`description` rewrite** — the 1-liner is now the agent-facing usage
   guide: the six modes + when each is used (MOVE = immediate cut-and-paste;
   COPY/CUT → PASTE for multi-buffer work across files; DELETE = purge
   without outputting; CLEAR = empty a buffer); anchor semantics (short
   UNIQUE line prefixes, block spans start..end INCLUSIVE, optional
   targetMarker for insertion else append to EOF); named buffers (default
   `default`, multiple per session); the sandbox boundary (working dir +
   temp dir only, reads AND writes); the housekeeping rule (use this tool
   for multi-line TODO/log blocks instead of write/edit).
3. **Mode/anchor/buffer semantics UNCHANGED for allowed paths** — the only
   deltas are the guard + description; all allowed-path code paths are
   byte-identical to the iter-4 translation (smoke-verified with
   exact-content checks for all six modes).

## Measured verification (all re-run by me at this HEAD)

- **Smoke** `C:/Users/Wasiejen/AppData/Local/Temp/opencode/bt_sandbox_smoke.mjs`
  (scratchpad, untracked; iter-4 `bt_smoke.mjs` pattern, Node-24
  type-stripped import): **52/52 PASS**, covering: shape/description/args
  (24), sandbox ALLOW read+write in cwd / cwd-subdir / temp / new temp
  subdir (7), functional round-trips of ALL SIX modes with exact-content
  checks incl. targetMarker + append-EOF variants (9), buffer isolation
  two names (1), error paths: missing src file / missing start marker /
  missing end marker / PASTE from empty buffer (4), sandbox REJECT with
  cwd=repo root: `..` traversal src, absolute `C:\Windows\...` src (guard
  fires before reading an EXISTING file), sibling-of-repo-root src, PASTE
  into outside (absolute + relative `..`, dst NOT created), MOVE with dst
  outside (src UNCHANGED, dst not created), DELETE of outside, error-form
  regex (8). First run was 50/51 — the one FAIL was a bug in my own test
  script (forgot to rewrite the fixture before the DELETE round-trip);
  fixed in the script, no tool change needed.
- **Probe** `node .opencode/plugin/probes/handover_probe.mjs`: **80/80 PASS**
  (unchanged — block_transfer is not probe-imported).
- **pytest** `& .\.venv\Scripts\python.exe -m pytest -q`: **459 passed,
  1 warning** (the known #10 warning).
- **ruff** `& .\.venv\Scripts\ruff.exe check --select F .`: **All checks
  passed** (F=0).

## Bugs found

- No tool bugs. The only "bug" is pre-existing and was deliberately NOT
  fixed (approval boundary — it changes allowed-path observable behavior,
  planner decides): **MOVE with `dstFile` missing** cuts the block from the
  source and THEN returns `'dstFile' is required` — the block is silently
  lost. Fix = hoist the `!args.dstFile` check above the src write. Logged
  in `todo_inbox.md` (worker-10, 2026-09-12) and here as the open item.

## Open items / not done (deliberate)

- The MOVE-missing-dstFile data-loss quirk (above) — left unchanged per the
  T1 approval boundary; `todo_inbox.md` entry added for planner curation.
- Did NOT register the tool in any config (maintainer domain), did NOT
  touch the probe / T2-T3 scope / DO-NOT-touch list — diff is exactly
  `block_transfer.ts` + bookkeeping.

## Commit / process notes

- One green commit per the AGENTS.md commit routine (code + todo_inbox +
  this summary + the loop-log lines in ONE commit); the spec's DoD wording
  "task commit + bookkeeping commit" read as loose phrasing — AGENTS.md's
  two-party split is authoritative. Flagging the deviation.
- Final gauge: `SESSION=ses_f6c5f161fffes1Ze5jsgnZ47D0 CTX=63257 (52%)
  REM=56743` (measured before the summary commit; re-measured at the
  post-commit check below).
