# PROPOSAL — plugin open tails: log-profile rebaseline + residual doc refs (2026-09-11, planner)

Bundles the remaining plugin/gauge decision items (adjacent, one cycle).

## 1. #17 / #30 / #35 — v1.3 log-growth CONFIRMATION (RECOMMEND: do it now if convenient, else SKIP)
- **What:** ONE scoped, one-shot read of the retained `plugin.log`
  post-base segment (the standing no-parse constraint allows exactly this on
  request). Expect the three silenced types at 0 + ≈79 % event-line cut vs
  the old 1036-line/571 KB profile.
- **Why now:** it is the ONLY tail keeping #17/#30/#35 open; v2.8 is
  production-confirmed live (see the feedback rundown), so the measurement
  reflects the real setup. It also refreshes the stale NAP log base (1269).
- **If you SKIP:** the entries stay open with default-SKIP — I will never
  touch the log unprompted.

## 2. #34 — residual `peek.py` / `ctxgauge` doc refs (RECOMMEND: purge)
- **What:** the doc purge half of de-peek — remaining `peek.py` /
  `ctxgauge/` references in the AGENTS.md COPY path + prompts are
  planner/maintainer-owned. The live prompts already route the gauge via
  `agents_repo.md` (clean); the residue is in the maintainer-queued
  AGENTS.md copy (`proposals/files/` — now archived) and any stale NAP/
  doc pointers.
- **Recommendation:** a small cleanup task (meta-only) that purges the
  residue and closes #34's doc half.

**Acceptance:** (1) measured ratio + new log base recorded in the NAP,
entries close; (2) grep-clean `peek.py`/`ctxgauge` references in live doc
surface.

**Status:** awaiting maintainer call (default for item 1: SKIP).
