# TASK — TODO #37: gauge backend fallback chain (production bun host lacks `node:sqlite`)

FIRST read `AGENTS.md`, `agents_repo.md`, this file, and `TODO.md` #37 + #30.
Repo root = `$env:FST`.

## Why (verified evidence — TODO #37)
- The v2.5 plugin (`313e83b`) is live in production; the `chat.message` hook FIRES, but
  the gauge read fails on every fire: `kind:"gauge" reason:db-error
  preview:"sqlite-module ResolveMessage: No such built-in module: node:sqlite"`
  (Bun error format = the bun-compiled opencode.exe host). NO `ctx:` line reaches any
  agent in production until this is fixed.
- The core (`.opencode/ctxgauge/gauge.mjs`) currently has ONE backend: dynamic
  `import("node:sqlite")` inside `readGauge` → missing module ⇒ `db-error` (never throws).
- Host facts (measured):
  - system `node` v24.19.0: `node:sqlite` flag-free (probe + `peek.mjs` run on it — keep green);
  - system `bun` 1.4.2 (on PATH): exposes `node:sqlite` (the earlier "host-proxy check PASS"
    measured this WRONG host — not the bun baked into opencode.exe);
  - the bun baked into opencode.exe: NO `node:sqlite` (production evidence above);
    whether it has the native `bun:sqlite` module is UNVERIFIED — that is what this build must find out.
- Retired but PROVEN-in-production backend: spawn `.opencode/plugin/tools/sqlite3.exe`
  (maintainer-placed, v1.x era ran on it under the production bun host). Its code is in git
  history (pre-`313e83b`, e.g. `git show 2cf5f33:.opencode/ctxgauge/gauge.mjs` or the plugin
  at `2cf5f33`) — recover the spawn mechanic from there rather than reinventing it.

## Goal
The gauge read succeeds under the PRODUCTION opencode.exe (bun) host, so the injected
`ctx:` line (and the T2 nudge ladder #33, which depends on the read) can actually fire.
ONE implementation, never-throw preserved, readout forms byte-identical.

## Design (PLANNER RULING — deviate only with a recorded reason in the summary)
Backend selection chain in `gauge.mjs`, tried in order, first success wins:
1. `node:sqlite` (current — system node + modern bun hosts);
2. `bun:sqlite` (native bun module — best zero-spawn hope on the opencode bun;
   Bun ≥1.1.x ships it. API sketch — VERIFY against system bun before coding:
   `new Database(path, { create: false, readWrite: false })` ≈ read-only (NO `readOnly`
   option like node:sqlite), `db.run(sql)` ≈ `db.exec`, `db.prepare(sql).get()`,
   `db.close()`);
3. spawn `.opencode/plugin/tools/sqlite3.exe` (the proven production last resort;
   resolve the path RELATIVE to the core file's location — `ctxgauge/` and `plugin/`
   are siblings under `.opencode/` — never a hardcoded user path; reuse the v1.x
   marker-SQL / args-array / `file:...?mode=ro` discipline from git history, with a
   hard timeout kill (~2500 ms budget total; timeout ⇒ `db-error`, never a hang).

Requirements:
- **Never-throw preserved.** Any failure in any backend ⇒ `kind:"db-error"` with a capped
  preview that NAMES the failing backend (`node:sqlite …` / `bun:sqlite …` /
  `spawn-sqlite3 …`) so the production evidence line is diagnosable. NO new `kind`
  vocabulary, NO new gauge-failure reasons beyond that.
- **Readout forms + `formatGauge` byte-identical** (window-known / unknown / notAvailable,
  `SESSION=` prefix) — the plugin and `peek.mjs` must not need changes for the output.
- **Result shape** stays compatible (ok/no-total/db-error fields) — the plugin only calls
  `readGauge()` + `formatGauge()`. The plugin file itself should stay UNCHANGED; if a
  trivial change proves necessary, note it in the summary.
- **Cache the chosen backend per process** (the plugin host fires repeatedly — do not
  re-try failed imports every fire). The cache must invalidate on `setDbPath` (probe
  fixtures) or be keyed by path — your call, document it.
- **Busy handling** (PRAGMA busy_timeout 2500 via the API + ONE retry on busy/locked)
  applies to the in-process backends (1, 2); the spawn backend keeps its own timeout
  discipline (see above).
- **Update the gauge.mjs header block** (READ BACKEND section) to document the chain +
  the host facts + the production evidence.
- **Probe extension:** the chain is now contract — the probe (same file
  `.opencode/plugin/probes/handover_probe.mjs`, keep the sandboxed-init design: temp
  fixture db, real-file byte-identity S5 hygiene, zero writes outside the sandbox) must
  force + verify EACH backend against the temp fixture: a test hook to restrict the
  backend list (like `setDbPath` — e.g. `setBackends([...])`, cleared/restored between
  sections — your call on the exact hook; the probe runs under system node, so backends 2/3
  are exercised by FORCING them, not by host absence; if `bun:sqlite` cannot be exercised
  under node, verify backend 3 end-to-end with the REAL sqlite3.exe on the fixture and
  unit-mock the bun:sqlite adapter shape). Existing 33 checks stay green (adapt where the
  read mechanic changed).

## Verification / definition of done
1. **Three host proofs, recorded in the summary:**
   - system node: `node .opencode\ctxgauge\peek.mjs` → live `SESSION=…` line (paste it);
   - system bun 1.4.2 proxy: run the core under `bun` (import + `readGauge()` against the
     LIVE db read-only — green on SOME backend; ALSO probe `import("bun:sqlite")` +
     read-only open semantics directly and record the exact API facts you verified);
   - spawn backend: forced by the probe against the fixture (end-to-end, real exe).
   Note explicitly in the summary: system bun is only a PROXY — the opencode-baked-bun
   verdict lands with the maintainer restart; if `bun:sqlite` is absent there too, backend
   3 (spawn, v1.x-proven in production) is the guard.
2. **Probe green:** exact command from the probe's own header → `PROBE handover: N/N PASS`
   (N ≥ 33 + the new backend checks), exit 0.
3. **No regression:** `& .\.venv\Scripts\python.exe -m pytest -q` = 434/434 +
   `& .\.venv\Scripts\ruff.exe check --select F .` = 0 (the task touches no FST python —
   the suite is the no-regression proof).
4. **TODO.md #37:** status line → "build landed (chain node:sqlite → bun:sqlite →
   spawn sqlite3.exe; probe extended; bun proxy check <pass/fail>) — production evidence
   PENDING maintainer restart (a `ctx: SESSION=<own sid> CTX=…` line must reach the
   planner's own session with NO db-error line)". Do NOT close #37.
5. **Commit** per the AGENTS.md routine: code + TODO.md + the summary file in ONE commit,
   one-line imperative subject. Never push.

## Approval boundary
- **Pre-approved:** everything above (the #37 build — maintainer-directed this session),
  probe extension, the #37 status line, the summary file, gauge.mjs header docs.
- **NOT pre-approved (stop + flag in the summary):** FST python changes; `opencode.jsonc`;
  `agents_repo.md`; `AGENTS.md`; DELETING or MOVING `.opencode/plugin/tools/sqlite3.exe`
  (it is the maintainer-placed last-resort backend NOW — use it, keep it in place);
  reading/analyzing `plugin.log` content (the probe's S5 byte-identity snapshots are the
  standing exception); anything observable beyond the read mechanic (new log files, env
  vars, config keys, new failure kinds).
- **Shape surprises** (bun:sqlite API differs from the sketch; spawn timeout/lock
  behavior) → safest silent fallback, record it in the summary + TODO, keep suite green.
  Never let the gauge throw into a hook.

## Worker
`worker_Q4_120K` (same model as the planner — the SQL/JSON detail work, 4bit precision;
maintainer default). Write the EXECUTIVE SUMMARY to
`.opencode/handover_task_to_planner.md` (OVERWRITE — latest summary only): the chain as
implemented + cache location, the bun:sqlite API facts you verified (with the system-bun
version), probe result (exact N/N), the live peek.mjs line, measured suite/ruff, TODO
entries touched, what was deliberately NOT done. Keep the final message SHORT (one-line
pointer to the file — the repeated-final-message loop cost a previous cycle).
