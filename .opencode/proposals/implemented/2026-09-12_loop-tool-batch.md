# 2026-09-12 — loop-tool batch: block_transfer sandbox + ctx_gauge tool + loop_log tool

**Status:** approved (pre-approved by the maintainer's inbox note — see Status section).
One file, three independently-approvable parts; each carries its intended
implementation. Source items: `maintainer/inbox_planner/26-09-11_21-50.md`
(items #1, #2, #3 — the "deferred" unified-usage-location note stays deferred).

---

## Part 1 — `block_transfer`: sandboxing + usage text

**Problem.** `.opencode/tools/block_transfer.ts` (translated to the `tool()` form,
iter-4) has NO sandboxing: the resolved `srcFile`/`dstFile` paths are read and
written anywhere on the filesystem (`fs.readFileSync` / `fs.writeFileSync` /
`fs.mkdirSync` on arbitrary resolved paths — inbox item #1: "writing is possible
everywhere"). And the 1-line `description` does not tell an agent the anchor
semantics, the buffer lifecycle, or the sandbox boundary — usage is opaque
(inbox item: "write an instruction that is helpful for an agent to use it").

**Intended implementation** (single file: `block_transfer.ts`):
- **One path guard**, applied to EVERY file-path argument (src and dst, all
  modes) BEFORE any filesystem access — no partial writes:
  - allowed roots = `[context.directory ?? process.cwd(), process.env.TEMP ??
    process.env.TMP]` (Windows; the maintainer's suggested TMP/TEMP check);
  - the given path is resolved (`path.resolve(cwd, p)` — collapses `..`) and
    allowed only if it equals an allowed root or lies beneath it
    (comparison case-INSENSITIVE — Windows paths);
  - violation returns `Error: '<path>' is outside the sandbox (allowed:
    <root1>, <root2>)` and performs no read or write.
  - Reads are sandboxed too (the pain point was writing; sandboxing reads costs
    nothing and closes the arbitrary-read hole — if the maintainer objects,
    reads can be allowed outside the roots by dropping one check).
- **Rewritten `description`** = the agent-facing usage text (the tool
  description is the usage channel, per the inbox item). Content: the six
  modes and when each is used (MOVE = immediate cut-and-paste; COPY/CUT →
  PASTE for multi-buffer work across files; DELETE = purge without outputting;
  CLEAR = empty a buffer), anchor selection (short UNIQUE line prefixes for
  `startMarker`/`endMarker`; the block spans start..end INCLUSIVE; optional
  `targetMarker` for insertion, else append to EOF), named buffers
  (default `default`, multiple buffers per session), the sandbox boundary
  (working dir + temp dir only), and the housekeeping rule (use this tool for
  moving/copying/deleting multi-line blocks / TODO / log sections instead of
  `write`/`edit` — the inbox's generic example rule).
- **Extensive testing**: scratchpad smoke script (Node-24 type-stripped import,
  behavior-based, the iter-4 `bt_smoke.mjs` pattern), matrix:
  - sandbox allow: cwd file, cwd subdir, temp dir, temp subdir (write + read);
  - sandbox reject: `..` traversal out of cwd, absolute path outside cwd
    (e.g. `C:\Windows\...`), a sibling of the repo root — for src reads AND
    dst writes (incl. MOVE with dst outside, PASTE into outside);
  - functional round-trips for all six modes; buffer isolation (two names);
    error paths (missing file, missing start/end marker, PASTE from empty
    buffer, mkdir-of-new-subdir INSIDE the sandbox still works);
  - fixes any bug found, in the same commit.
  - `agent_TempOnly` sub-agent testing only if in-session testing is
    insufficient (per the inbox item).

**Acceptance.** Smoke N/N PASS (measured, reported); `git diff` scope =
`block_transfer.ts` only (the smoke script lives in the scratchpad, untracked);
mode/anchor/buffer semantics unchanged for allowed paths; the probe stays green
(`block_transfer.ts` is not probe-imported — re-run confirms 80/80); pytest
459 + 1 #10 / ruff F=0 unchanged (meta-only run).

---

## Part 2 — `ctx_gauge`: the peek readout as a directly-fired tool

**Problem.** Agents self-gauge by shelling out
`node .opencode\plugin\scripts\peek.mjs` through the bash tool; the maintainer
observes a ~15,000-token difference vs the direct readout and agents lean on
the peek habit even during long thinking (inbox item #2). Wrap the shared
gauge core into a simple tool the agent fires directly — "clean up the usage".

**Intended implementation**:
- New `.opencode/tools/ctx_gauge.ts` in the `tool()` form (shape reference:
  `compact_memory.ts` v2 / `block_transfer.ts` — host names the tool by
  filename, no `name` field):
  - `import { readGauge, formatGauge } from "../plugin/scripts/gauge.mjs"` —
    the ONE shared read implementation (backend chain, window rule, readout
    forms — nothing re-derived);
  - args: optional `sessionID` (string) — empty/omitted = the newest-session
    default (byte-identical core path); a value = the v2.6 per-session read;
  - `execute`: `const r = await readGauge(undefined, sessionID); return
    formatGauge(r)` — and for `kind === "db-error"` append ` — <error>`
    (in-band mirror of peek.mjs's stderr addition — the line is never
    replaced by a stack trace);
  - `description` (1–2 lines): read the context usage of the current (or a
    named) session, read-only; returns the `SESSION=… CTX=… (…%) REM=…`
    readout; fire this for context-budget decisions instead of the peek.mjs
    shell-out.
- **Probe**: new appended section (S12, check numbers continue after the
  current 80 — APPEND ONLY, never renumber): import the tool module fresh
  (the S10 check-73 pattern), assert the `tool()` result shape
  (`description`/`args`/`execute`, no `name`), the optional-`sessionID` args
  shape, and execute behavior against a temp FIXTURE db via `setDbPath`
  (known readout form `SESSION=… CTX=… (…%) REM=…` + the db-error path
  `CTX=notAvailable` on a bad db path); the probe header total updated to the
  measured N/N.
- **Prompts** (planner-applied after the probe is green, separate
  bookkeeping commit, pre-approved meta class): the self-gauge references in
  the acting role prompts + `repo_commands.md` gain one line — prefer the
  `ctx_gauge` tool when it is in the toolset; the peek.mjs shell-out stays the
  fallback (the tool is registered host-side).
- **Registration is the maintainer's domain**: the live `opencode.jsonc`
  `tools:` key (the repo copy is commented out by design and NEVER staged);
  the tool takes effect at the maintainer's next process restart.

**Acceptance.** Full probe green at the NEW measured total; the tool's readout
is byte-identical to `peek.mjs` output for the same fixture db (the smoke
compares both); diff scope = the new tool file + the probe (+ header total)
+ the one-line prompt/doc notes; pytest 459 + 1 #10 / ruff F=0 unchanged
(meta-only).

---

## Part 3 — `loop_log`: the loop log as a tool

**Problem.** Every agent hand-appends its loop-log lines (8-char status token,
`role-iteration`, session id, model, content — format discipline that is
error-prone and context-costly); the dated folder creation at rollover is
planner work; per-agent write access to the loop folder needs per-agent
permission management on the host (inbox item #3: "usable by all agents
without explicit management of writing access and folder permission for each
agent").

**Intended implementation**:
- New `.opencode/tools/loop_log.ts` in the `tool()` form:
  - args (the maintainer's four + the session id the line format requires):
    `role` (string — the agent writes its own `planner-10` / `worker-9` /
    `looprunner` form), `model` (string — the agent's model id, verbatim from
    its own launch context), `status` (enum — exactly the five current
    tokens: `-->START`, `DONE<---`, `-RETURN-`, `-WARNING`, `--INFO--`),
    `content` (string), `session` (optional string — the agent's own session
    id from its injected `ctx:` line; omitted → `unknown`);
  - `execute`:
    1. resolve `.opencode/loop/` against `context.directory` (fallback
       `process.cwd()`);
    2. if NO `autorun-*` folder exists there → create
       `autorun-<YYYY-MM-DD_HH-MM>` — the name MACHINE-COMPUTED from the
       local clock, never retyped (pattern-5 discipline) — and create its
       `loop_log.md`; if exactly one exists → use it (the protocol invariant:
       exactly one current looprun folder at any time); if several exist →
       use the most-recently-modified and say so in the return (anomaly
       surfaced, not silently resolved);
    3. append ONE line, machine-timestamped with the same local
       `YYYY-MM-DD_HH-MM` form the existing lines use:
       `<date_time> <status> <role> <session|unknown> <model> <content>`
       (append-only — the tool never rewrites or curates);
    4. return the folder name + the line it wrote (the agent sees what landed).
- **Prompt simplification** (planner-applied after verification, separate
  bookkeeping commit, pre-approved meta class): `agent_readme_loop.md` §Loop
  log + the loop lines in the three acting role prompts (planner / worker /
  looprunner) — write loop-log lines via the `loop_log` tool; the format
  description stays as the fallback for when the tool is not registered.
- **Registration is the maintainer's domain** (live `opencode.jsonc` + the
  per-agent tool-access grant — the tool is the single point that removes the
  per-agent folder-permission management); takes effect at his next restart.

**Acceptance.** Scratchpad smoke (context object with a scratchpad `directory`
— the iter-4 smoke pattern, NOT the live loop folder): creates the dated
folder + `loop_log.md` when empty (machine-named, verified by listing, never
retyped); appends the exact line form (byte-compared to a hand-built
expected line for the same args); appends when the folder exists; the status
enum rejects a bogus token at parse time; pytest/ruff unchanged (meta-only);
the probe stays green.

---

## Status / approval

Pre-approved: the maintainer's inbox items #1–#3 each carry "(file a proposal
with intended implementation) - implicitly approved to work on it (i am away
for a while)" (`maintainer/inbox_planner/26-09-11_21-50.md` — moved to
`maintainer/done/` content-untouched when filed). Each part is independently
approvable; a maintainer veto on any part stops only that part. Build order:
Part 1 → Part 2 → Part 3 (one task spec each, written against the
just-verified state per `agent_readme_task_spec.md`; specs committed before
launch).

## Verdict (implemented 2026-09-12, looprun autorun-2026-09-11_17-23)
- **Part 1 — LANDED** (T1, iter-10, task commit `f95e9de`): the `sandboxCheck`
  path guard (roots = cwd + `TEMP ?? TMP`, case-insensitive, before EVERY fs
  access, MOVE dst pre-guarded = no partial cut) + the description rewritten as
  the usage guide; smoke 52/52, probe 80/80, pytest 459+1#10, ruff F=0;
  allowed-path semantics byte-identical. Open tail (maintainer call): the
  pre-existing MOVE-dstFile-missing data-loss quirk (a one-line check-hoist
  changes observable behavior).
- **Part 2 — LANDED** (T2, iter-10+1, task commit `fbe0cef`; planner-rescued
  after the worker session died at `context_length_exceeded`): `ctx_gauge.ts`
  wrapping the gauge core (optional `sessionID`, db-error in-band) + probe S12
  (APPEND-only, checks 82-85); smoke 3/3 (LIVE byte-identity vs `peek.mjs` in
  one window), probe 84/84.
- **Part 3 — LANDED** (T3, iter-13, task commit `6ebe288`): `loop_log.ts`
  (five-token zod status enum rejected at parse time; `context.directory ??
  cwd`; machine-computed `autorun-<date>` folder when `loop/` empty; multi-
  folder anomaly surfaced, not silently resolved; append-only exact line form)
  + scratchpad smoke 24/24; probe stays 84/84 (smoke-based acceptance).
- **Prompt/doc preference lines — APPLIED** by the planner in the batch-close
  bookkeeping commits: Part 2 = `repo_commands.md` + the worker/explorer
  honesty-guard gauge lines; Part 3 = `agent_readme_loop.md` §Loop log + the
  planner/worker/looprunner loop lines (prefer the `ctx_gauge`/`loop_log`
  tools when in the toolset; the shell-out/format descriptions stay the
  fallbacks).
- **Remaining tail (maintainer host-side):** tool REGISTRATION —
  `block_transfer` / `ctx_gauge` / `loop_log` all take effect at his next
  process restart.
