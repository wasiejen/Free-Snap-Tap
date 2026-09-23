# HANDOVER (worker-15, worker_Q3S_170K) — plan9 unit A: autorun-identifiable names for plugin-spawned sessions

**Status: DONE — all DoD points met.** Branch `opencode_test` (HEAD before this
task: 75566e6). One follow-up commit: code + smoke + TODO #89 + knowledge
entry + this handover (named paths only — the maintainer's live files were
never staged).

## Bounded SDK answer (DoD 2)
**YES — `session.create()` accepts a `title`.** Source: the vendored
`@opencode-ai/sdk` types in the repo,
`.opencode/node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts` L1811-1821 —
`SessionCreateData = { body?: { parentID?: string; title?: string };
path?: never; query?: { directory?: string }; url: "/session" }`. → Built the
create-title mechanism (NOT the prompt-prefix fallback).
**Discrepancy flag:** the task spec says "the repo has NO node_modules; host
install is the npm global" — the npm global (`C:\Users\Wasiejen\AppData\Roaming\npm`)
ships only the `opencode-ai@1.18.32` CLI binary (no SDK package), but the
repo DOES carry a vendored `@opencode/node_modules/@opencode-ai/{sdk,plugin}`
(1.18.29 — the same source the UNIT 1 surface report used). The spec's
"vendored study" pointer was right; its "no node_modules" clause was stale.

## What changed
1. **Plugin (`.opencode/plugin/auto_resume.ts`):** new module-level
   `spawnTitleFor()` (mirrors `.opencode/tools/loop_log.ts` detection:
   readdirSync `autorun-*` folders, exactly-one → it, several →
   most-recently-modified; scans `loop_log.md` for the largest
   `planner-<N>`, + 1) → returns `<loop-folder> planner-<N>` or **null** (no
   loop folder / no `loop_log.md` / no planner-<N> line / unreadable → the
   spawn is exactly as before). In the SHARED `spawnPlanner` helper (both
   spawn paths): the `create()` call now passes `{ body: { title } }` when
   the identifier resolved (defensive `create` cast widened to accept
   options), and the `spawn=` log line gains an `ident=<title>` bit. The
   queued prompt text is UNCHANGED (title mechanism — opencode keeps the
   given title). Imports: +`readdirSync`, `statSync` on the node:fs line.
2. **Smoke (`.opencode/plugin/tests/auto_resume.smoke.mjs`):** the spy
   `create` now records its call ARGS (`createCalls.push(args ?? null)` —
   was `{}`; no existing check depended on the old shape). Two NEW checks
   after UNIT 3 check (7): (8) deterministic loop folder `autorun-test_0-0`
   with a `-->START planner-7` log line → the create body carries title
   `autorun-test_0-0 planner-8` + `ident=` bit in the spawn line + prompt
   text unchanged; (9) same folder, log with NO planner-<N> line → create
   gets NO title, prompt unchanged. The loop dir is removed before UNIT 4
   (sandbox left exactly as the pre-plan9 sections pin it). No existing
   check removed or weakened.
3. **TODO.md:** APPENDED #89 (contract fields; status LANDED — the commit
   hash goes in the PLANNER's bookkeeping commit per the commit-hash rule,
   not in this commit / entry). Header note + closed entries untouched
   (append-only).
4. **Knowledge:** appended one entry to
   `.opencode/agent/knowledge/knowledge_plugins.md` (the SDK answer + the
   vendored-types location — verified, actionable, corrects the spec's
   stale node_modules claim).

## Measured verification (DoD 4 — baselines as of 725ab3a, measured at 75566e6)
- `node .opencode/plugin/tests/auto_resume.smoke.mjs` → **104/104 ALL PASS**
  (baseline 102 + 2 new; both plan9 checks PASS, run twice).
- The other 9 smokes: block_transfer.sandbox 52/52, block_transfer 22/22,
  compact_memory 57/57, context_recovery ALL PASS, ctx_gauge 3/3,
  gauge_core ALL PASS, intercept_observer 39/39, loop_log 24/24, submit 20/20
  (all exit 0).
- Probe: `node .opencode/plugin/probes/handover_probe.mjs` →
  **PROBE handover: 241/241 PASS**.
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed, 1 warning**
  (the known #10 coroutine warning), 2.23 s.
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed**
  (F=0).

## TODO entries
- #89 APPENDED (see above). No other TODO changes; nothing found to
  append to `todo_inbox.md`.

## What was deliberately NOT done
- **Live acceptance** — not mine: the live plugin activates on the next
  host restart; the planner verifies the first named spawn (expected: a
  `spawn= … ident=<loop-folder> planner-<N>` line + the named session in
  the session list).
- The **prompt-prefix fallback** — not used (title is supported); not
  restructured either.
- The #88 tick mechanism (`tickMs`/`tickWait`) untouched; the Unit-2
  ctx-line-suffix code untouched; no spawn-path restructure (identifier
  lives in the shared helper only).
- Live opencode.jsonc / `.opencode/maintainer/**` / the maintainer's
  uncommitted files (knowledge_inbox.md, ideas.md, repo_opencode.md,
  untracked archive dumps) — read ok at most, NEVER staged.
- No switch of checkout (stayed on `opencode_test`).

## Lessons
- Bounded SDK checks: the vendored types in
  `.opencode/node_modules/@opencode-ai/` are the fast path (one grep, one
  answer) — the host npm global is CLI-only; `~/.config` is off-limits.
- Smoke spy clients should record call ARGS, not placeholders — the
  title/prefix assertions needed them (cheap to have been there).
