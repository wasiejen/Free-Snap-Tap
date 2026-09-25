# Task spec — TODO #96: auto_resume.log write-volume reduction (SSD wear)

## Goal
`.opencode/temp/auto_resume.log` = 239.6MB / 2,813,277 lines at ~4 days uptime.
**97.4% of the bytes = `event=message.part.delta` lines** (2,718,066 lines /
231.0MB) — the event hook `onEvent` logs ONE line per event, incl. every
streamed token delta (~100MB/day of small appends). Stop the per-token growth,
bound long-term growth with a size guard, and auto-trim the existing file on
the next host restart (no manual step).

## Design (pinned — from TODO #96; verify line refs against current source)
1. **`onEvent` NEVER logs `message.part.delta`.** All other event types
   unchanged. The Unit-2 saturation INPUT is `message.updated` ONLY (the arm
   path is unaffected) — confirm `onEvent` (auto_resume.ts ~L1468-1480) skips
   `message.part.delta`; the `message.updated` handling (~L1447-1464) stays.
2. **Size guard at init, BEFORE `restoreLineageFromLog`** (auto_resume.ts
   ~L1508-1544 — today it reads the whole 233MB): if log size > 20MB, keep the
   byte TAIL (last 2MB) and append ONE `log-trim= old=<bytes> new=<bytes>` line.
   Caps are FACTORY OPTIONS (defaults 20MB/2MB; the smoke passes small values —
   the `tickMs` factory-option pattern at ~L1573-1574). absent/unreadable file
   → no-op. `log()` is a per-line `appendFileSync` (~L352-359) → the file is
   never held open → a synchronous init-trim is safe.
   - Documented accepted consequence: the #90 lineage restore then sees only
     the surviving tail — an older `route=`/`spawn=` pair cut by the trim
     resets depth to 0 (best-effort by design).
3. **Smoke re-pins** (baseline 129/129):
   - a synthetic `message.part.delta` event → ZERO log lines for it (a paired
     `message.updated` in the same batch still logs);
   - a seeded oversized log → trimmed to the tail + the `log-trim=` line
     present;
   - the lineage restore still works on a trimmed tail.

## Definition of done
- zero `message.part.delta` lines appended after a live restart (maintainer's
  live check);
- the existing 233MB file trimmed to ~2MB on the next restart with the
  `log-trim=` line;
- smoke green (re-pinned) + standard gate green (probe, pytest, ruff).

## Approval boundary
- PRE-APPROVED (maintainer launch directive, his item 3, 2026-09-25): the log
  reduction. No observable tool behavior change (plugin-internal logging
  only).
- DO-NOT-TOUCH: `ctx_watchdog.ts`, `AGENTS.md`, `.opencode/maintainer/`,
  `opencode.jsonc`, the other plugins, and every file outside the scope below.
  The live 233MB file is trimmed at the next host restart, NOT by this commit
  (the code lands; the trim fires on restart).

## Scope
- `.opencode/plugin/auto_resume.ts` (`onEvent`, the init trim guard, the
  factory-option caps, the `log-trim=` line).
- `.opencode/plugin/tests/auto_resume.smoke.mjs` (re-pins per (3); the smoke's
  small-value factory options).

## Worker
`worker_Q3S_170K`.
