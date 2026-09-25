# HANDOVER — worker: TODO #96 auto_resume.log write-volume reduction (2026-09-25, worker_Q3S_170K, ses_f281bdf31ffevhZbHouvrZ3Q1d)

## Executive summary
Per the pinned spec: (1) `onEvent` NEVER logs `message.part.delta`
(~97% of the old log volume — 2,718,066 lines / 231MB at measure);
(2) a size guard at init, BEFORE `restoreLineageFromLog`, trims an
oversized log to its byte TAIL + ONE `log-trim= old=<bytes> new=<bytes>`
line (caps as factory options, defaults 20MB/2MB); (3) the smoke re-pins
129/129 → 133/133 covering all three spec cases. The live 239.6MB file
(264.4MB at my run, ~100MB/day growth) is trimmed by the code at the NEXT
host restart — not by this commit.

## What changed
- `.opencode/plugin/auto_resume.ts` (commit 22c36e4):
  - `onEvent`: early return on `message.part.delta` before the log call.
    `armEvent` is a no-op for the type (no matching branch — the Unit-2
    saturation input is `message.updated` only), so the early return
    changes nothing but the missing log line; every other event type is
    byte-identical in behavior.
  - `trimLogIfNeeded(maxBytes, tailBytes)` (new, right before
    `restoreLineageFromLog`): statSync → absent/unreadable = no-op;
    `size <= maxBytes` = no-op; else keep = min(size, tailBytes), read
    the byte TAIL via openSync/readSync (never reads the whole file —
    the old `readFileSync` of the 233MB log in the #90 restore is now
    bounded by the trim), writeFileSync the tail, then `log()` ONE
    `log-trim= old=<pre-trim size> new=<kept tail size>` line. A
    degenerate-cap guard (tail >= size → no-op) prevents growth;
    best-effort, never throws out of init.
  - factory: `maxLogBytes` / `logTailBytes` options (tickMs pattern:
    number, finite, > 0, else the 20MB/2MB defaults — the live host
    passes nothing → live behavior: trim only when the log outgrew 20MB);
    `trimLogIfNeeded(...)` called BEFORE `restoreLineageFromLog()`.
  - UNIT-1 header doc: the delta exclusion noted.
- `.opencode/plugin/tests/auto_resume.smoke.mjs` (commit 70399ea):
  - (a) two synthetic `message.part.delta` events → ZERO lines; the
    paired `message.updated` in the same batch still logs (+1 chk).
  - (b) seeded oversized log (the smoke's own accumulated log + an end
    marker; small caps 4096/2048 via the factory options) → ONE
    `log-trim=` line with `old=<pre-trim bytes>` and `new=2048`, the
    file ends ~TAIL, the tail carries the seed end marker (+2 chk).
  - (c) lineage restore on a trimmed tail — a FRESH child node process
    (the #90 restore is once-per-process, so the trim-then-restore
    ORDER can only be proven out-of-process): the child seeds an
    oversized log whose TAIL carries two route=/spawn= pairs
    (a→b, b→c: c at depth 2), factories with small caps, then fires
    busy+idle on both restored sessions: `skip= deactivated sid=trim_a`
    (restored STICKY flag) + `skip= depth sid=trim_c depth=2`
    (restored depth — a non-restored c would SPAWN; the discriminator)
    (+1 chk, spawnSync, exit-code + child-log asserted).
  - total 129 → 133.

## Measured verification (re-run at start AND after the change)
- Baseline (before edits): smoke 129/129, probe 279/279, pytest 459
  passed + 1 warning, ruff F=0 — all green, as expected.
- After: `node .opencode/plugin/tests/auto_resume.smoke.mjs` →
  **ALL PASS (133/133)**, exit 0.
- After: `node .opencode/plugin/probes/handover_probe.mjs` →
  **PROBE handover: 279/279 PASS** — UNCHANGED total (the probe has no
  message.part.delta / auto_resume-log-volume dependency), so the
  header annotation did NOT move.
- After: `./.venv/Scripts/python.exe -m pytest -q` → **459 passed,
  1 warning** (the known #10 coroutine warning).
- After: `./.venv/Scripts/ruff.exe check --select F .` → **F=0**
  ("All checks passed!").

## Commits
- 22c36e4 — auto_resume.ts (code only).
- 70399ea — auto_resume.smoke.mjs (re-pins only).
- This bookkeeping commit — TODO.md #96 status + this file.
Staged ONLY the two scoped files (+ bookkeeping here). Pre-existing
working-tree changes (`handover_task.md`, `repo_opencode.md`,
`.opencode/maintainer/priority.md`, `opencode.jsonc`, the loop log)
left untouched / unstaged.

## TODO entries
- #96 status updated: CODE LANDED (commits + gate results); PENDING his
  live check at the next host restart (zero delta lines from the new
  build + the existing file trimmed to ~2MB with the `log-trim=` line)
  — then close.
- No `todo_inbox.md` findings this unit.

## Deliberately NOT done (with reason)
- The live 239.6MB/264.4MB file is NOT trimmed by this commit — per the
  spec the trim fires at the next host restart (the code lands now).
- No change to `ctx_watchdog.ts`, `opencode.jsonc`, `AGENTS.md`,
  `.opencode/maintainer/`, or any other plugin — DO-NOT-TOUCH list.
- No `todo_inbox.md` / `TODO.md` NEW entries: nothing found beyond the
  task scope (the probe total needed no move; no doc/code mismatch).

## Lessons
Embedding a JS child script from a smoke: write it as an array of
lines + `join("\n")` — a template literal would corrupt the child's
`\n` string escapes and regex escapes (they'd be resolved in the
PARENT's literal, not the written file).
