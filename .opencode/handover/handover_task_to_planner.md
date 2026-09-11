# WORKER SUMMARY — plugin v2.8 task: STOPPED AT THE LINE after Part 1 (green committed)

**Status:** Part 1 (spec fold-in) DONE + committed (`66c0ac9`). Part 2 (the build)
NOT STARTED — I hit the AGENTS.md stop line (`REM <= 15k` / `>= 85%`; the live
gauge read at handover write was `CTX=112429 (93%) REM=7571`). Per the task's
own stop-line rule: "commit the green state you have, write the summary with
the exact remainder, stop." This file + the committed fold-in is the resume
contract.

## What changed (committed)
- `66c0ac9` — `.opencode/proposals/approved/260910_plugin-compaction-detection.md`:
  the "Planner status (2026-09-11, iteration 4)" block recording the re-scoped
  v2.8 design of record (01-41 re-scope supersedes the 031 minimal read;
  compaction entirely deactivated; the three consumers; which 031 mechanic
  landed for each; the log path). **DoD1 is satisfied**: the fold-in is
  committed BEFORE any build commit (two-commit plan, as allowed by DoD1).
- Baseline verified pre-change: probe `node .opencode\plugin\probes\handover_probe.mjs`
  = **52/52 PASS, exit 0**. No Python files touched at all (gate
  `pytest -q` = 448 / `ruff check --select F` = 0 is untouched by this task —
  re-verify anyway per DoD5).

## Exact remainder (the whole Part 2 — nothing of it is in the tree yet)
1. **`.opencode/.gitignore`**: append `temp` — **verified NOT currently
   ignored** (`git check-ignore .opencode/temp/ctx.log` exits 1 today;
   `.opencode/temp/` does not even exist yet). Required by DoD4.
2. **`.opencode/plugin/handover_v2.4.ts`** — v2.8 build (all below is LOCKED,
   no re-design needed; details also in the committed Part 1 block):
   - **v2.8 header block** after the v2.7 block (same style) recording: the
     re-scoped design of record; the three consumers; the mechanics chosen;
     the SDK type facts below.
   - **SDK type facts (verified in `@opencode-ai/plugin/dist/index.d.ts` +
     `@opencode-ai/sdk/dist/gen/types.gen.d.ts`):**
     `tool.execute.after` input `{tool, sessionID, callID, args}`, output
     `{title, output: string, metadata}`, hook returns `Promise<void>` —
     the passed `output` object is the ONLY mutation channel (031 option 2
     = in-place `output.output` mutation; no return value used).
     `client.session.status()` → GET `/session/status` → `{ [sessionID]:
     SessionStatus }` ALL-SESSIONS map, `SessionStatus.type` ∈ `"idle" |
     "busy" | "retry"`; default fields-style result carries the map under
     `.data` (the 031 sketch's `ns.status({path:{id}})` is NOT the SDK
     signature — no path argument). `promptAsync` payload shape unchanged
     (one options object, synthetic text part).
   - **Restructure `onToolAfter`**: the existing tool.after log line is
     written FIRST (byte-stable vs v2.7 — logs the pre-append output), then
     ONE `readGauge(undefined, sid)` (the v2.6 per-session mechanic) feeds:
     (1) readout append, (2) the ladder (rung compute/dedup/evidence line
     unchanged — refactor `nudgeLadder` to take the read instead of doing
     its own), (3) the ctx log entry. Never throws; silent on no-signal.
   - **Readout append (consumer 1):** minimal form `(NN%/NNNK)` when window
     known (pct = `Math.floor(ctx*100/window)` — same formula as the gauge;
     remK = `Math.max(0, Math.round((window-ctx)/1000))`); `(NNNK)` when
     window unknown (`Math.round(ctx/1000)`). `no-total` / `db-error` →
     append NOTHING (silent, never throw, NO per-failure log line). Non-string
     `output.output` (defensive; SDK declares string) → silent skip. Append
     rule: empty string → readout alone; string ending `\n` → direct concat;
     else → `"\n" + readout`.
   - **Deferred delivery (consumer 2):** `deliverNudge` NEVER calls
     promptAsync synchronously anymore — `setImmediate(() =>
     void deferredDeliver(...))`; inside: busy-check first — if
     `session.status()` (absent fn / failing / unknown shape → undefined)
     says `type === "busy"` for this sid → **skip silently** (the nudge
     evidence line was already appended at fire; no NEW failure reason);
     else promptAsync fire-and-forget exactly as v2.6 (rejection →
     delivery-rejected line, sync throw → delivery-threw line — both now
     occur inside the deferred fn, still evidence-logged).
   - **Single-file ctx log (consumer 3):** path **`.opencode/temp/ctx.log`**
     (append-only; `mkdirSync(recursive: true)` the temp dir; best-effort,
     never throws). Entry = local datetime `YYYY-MM-DD_HH-MM` (the general
     convention) + the model if discoverable (the gauge read's `modelId`,
     field omitted when empty) + the SAME minimal readout as (1). Entry is
     written **IFF the readout was actually appended** (log ⟷ appended tool
     returns stay isomorphic — the maintainer's "base the logging on the
     directly appended tool returns"). Non-ok reads → no entry.
     Needs `dirname` added to the `node:path` import.
3. **`.opencode/plugin/probes/handover_probe.mjs`** — extend (currently 52):
   - New **S9 section** (fixture `fx_ro.db` in the sandbox): sessions
     `ses_ro_k` ctx 42012 window 120K → readout `(35%/78K)` below rung 1;
     `ses_ro_u` ctx 45678 model `CPU-Qwen3-0.6B` (no window marker) →
     `(46K)`; `ses_ro_nom` ctx 24056 model NULL → `(24K)` with the model
     FIELD OMITTED in the log; `ses_ro_empty` INFLIGHT row (no finish) →
     no-total; `ses_ro_absent` (not in the db) → per-session read no-total;
     `ses_ro_n1..n5` ctx 61020/61030/61040/61050/61060 → rung 1, readout
     `(50%/59K)`, formatGauge readouts e.g. `SESSION=ses_ro_n1 CTX=61020
     (50%) REM=58980`.
   - New checks (id the section S9, ~10): known-window append byte-exact
     `tool body\n(35%/78K)` + log line 1 `^<dt> probe-model-120K_MTP
     \(35%/78K\)$`; unknown-window append on trailing-newline output `x\n`
     → `x\n(46K)` + log line 2 with model; no-total → NO append / NO log /
     no nudge line; missing session → same; non-string output → no throw,
     object untouched, NO log entry (isomorphism); **deferred delivery**:
     after `await afterFeed`, promptAsync NOT called synchronously (0 calls)
     while the nudge evidence line IS synchronous, then exactly 1 call after
     `await tick()` (setTimeout ~25 ms) with the synthetic payload; busy
     (direct-map status fake) → 0 calls after tick, evidence line fired,
     readout append + log entry unaffected; status ABSENT → deferral alone
     still delivers; busy via SDK `{data: {sid: {type:"busy"}}}` fields-style
     fake → 0 calls; idle → 1 call.
   - **S8 must gain `await tick()` after every `afterLad` before asserting
     `nudged`** (46, 47-51, 52, 53) — delivery is no longer synchronous.
   - Update S5: kind tallies → tool.after 12→22, nudge 9→14 (rest unchanged:
     warn 2, tool.before 6, chatmsg 8, gauge 3, event 0); add the new
     fingerprint ids (f1-f10, ses_ro_*) to check 43; add a git-ignore check
     for `.opencode/temp/ctx.log` (`git check-ignore -q` exit 0, cwd
     REPO_ROOT).
   - Header doc: add the S9 line + update the EXPECTED OUTPUT totals
     (52 → 63 if the plan above lands: S9=10 + S5 5→6).
4. **Verify:** probe ALL PASS exit 0 (record the new total); `&
   .\.venv\Scripts\python.exe -m pytest -q` = 448 passed (+1 known #10
   warning); `& .\.venv\Scripts\ruff.exe check --select F .` = 0; `git
   status` clean WITH `.opencode/temp/ctx.log` present (create the dir +
   file for the check; the live plugin will append after the next
   maintainer restart). Grep-verify: no synchronous `promptAsync` call
   path inside `tool.execute.after` (DoD3).
5. **Commit:** ONE build commit (plugin + probe + gitignore) + this summary
   file; `opencode.jsonc` never staged.

## Friction / findings
- Nothing unfixable in scope found. One note for the planner: the task file
  references the design sources as `proposals/...` but they live under
  `.opencode/proposals/...` (the spec's relative names resolve from
  `.opencode/`). Also `dist/gen/types.gen.d.ts` (named in the spec) holds the
  SDK API types; the HOOK shape itself lives in
  `@opencode-ai/plugin/dist/index.d.ts` — both read and pinned above.
