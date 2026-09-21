# Worker summary — compact_memory unit A (priority.md #1, TODO #70)

Worker: `worker-6` (`worker_Q3S_160K`), session `ses_f3ab3c67dffeujQ8L1ucfWu8k8`,
2026-09-21, plan5 (looprun autorun-2026-09-21_15-33). Task spec:
`.opencode/agent/handover/handover_task.md` (committed at 7e790d4).

## What changed

ONE commit on `opencode_test` (parent `7e790d4` — this summary rides in that
same commit; subject "Compact_memory unit A landed: 4-key args +
config-resolved summarizer + queued message + DUMP-OK"). Files:

- `.opencode/plugin/compact_memory.ts`:
  - **A — params + resolution:** args schema is now EXACTLY 4 keys
    (sessionID, keepTokens, keepMessages, message) — providerID/modelID
    removed (schema + read sites). New exported PURE
    `resolveCompactionModel(configContent, fallback) -> { providerID, modelID,
    source: "config" | "fallback" }` (+ exported `stripJsoncComments`, a
    string-state-aware // and /* */ comment stripper). Tool: reads
    `opencode.jsonc` from the root (falls back to `opencode.json`; "" when
    neither) PER CALL, resolves with the existing `resolveModel` result as
    fallback; empty pair → refused exactly as before (no request sent, no
    budget burned). Description + message-arg strings updated.
  - **B — queued message:** when `message` is non-empty, AFTER the dispatch
    (the void path — no await anywhere) exactly ONE queued
    `promptAsync({ path: { id }, body: { parts: [{ type: "text", text }] } })`
    fires to the compacted session (both v2 and v1 branches); the response
    states the message was queued (delivered on its resume) and the message
    is NO LONGER embedded in the response. `typeof promptAsync !==
    "function"` → no prompt sent + a WARNING line in the dispatch response.
  - **C — dump diagnostics:** successful dump appends a
    `DUMP-OK <sid> <relfile> <ms>` line to `.opencode/temp/ctx.log` (same
    local-stamp prefix style as DUMP-FAIL; relfile corpus-relative; ms
    elapsed); spawn `stdio: "pipe"` → `"ignore"` (pipe-buffer deadlock
    failure mode). DUMP-FAIL format + 60 s timeout UNCHANGED.
  - The maintainer's `--comment` block is untouched; `callSummarize`,
    keep-rejected retry, increment-on-success, budget gate, `resolveModel`
    fallback all unchanged.
- `.opencode/plugin/tests/compact_memory.smoke.mjs` — re-pinned (4-key args;
  config set → config pair in body / commented-out → fallback / malformed →
  fallback; old override case removed; message → promptAsync pins incl. the
  no-promptAsync WARNING; DUMP-OK line pin; stdio-ignore pin).
- `.opencode/plugin/probes/handover_probe.mjs` — S13 check 86 updated to the
  4-key args; check 100 (explicit-pair override) REMOVED with a note; check
  97 re-pinned to the new queued-message shape; NEW S25 section (7 checks:
  the new exports, config present, comment+URL-safe parse, fallback battery,
  block comments + first-slash split, DUMP-OK format, tool integration);
  header annotation + EXPECTED OUTPUT + FINGERPRINT updated (241/241).
- `TODO.md` — #70 status line: appended "unit A landed, commit <hash>"
  (literal `<hash>` placeholder per the spec's quoted text — fill in from
  this commit at curation; the commit = the single one on `opencode_test`
  with parent `7e790d4`).

## Measured verification (full standard gate, this commit's state)

- `compact_memory.smoke.mjs`: **52/52 ALL PASS**
- `handover_probe.mjs`: **241/241 PASS** (agrees with the header annotation
  `S13=14 … S25=7 hygiene=6 → 241/241`)
- pytest: **459 passed, 1 warning** (baseline match)
- ruff `--select F`: **0 findings**
- ALL 10 smokes green: auto_resume 53/53 (untouched), block_transfer
  22/22 + sandbox 52/52, compact_memory 52/52, context_recovery ALL PASS,
  ctx_gauge 3/3, gauge_core ALL PASS, intercept_observer 39/39, loop_log
  24/24, submit 20/20.

## What was deliberately NOT done

- No live config change (the live `opencode.jsonc` is READ-ONLY — the config
  is only ever read; the live `agent.compaction` block is still commented
  out, so the fallback path remains the active one).
- Follow-on parts of #70 not in this unit: the budget-file auto-compact
  toggle (auto_resume.ts) and the research spec — per the spec, out of
  scope.
- No branch switch (stayed on `opencode_test`); the 3 pre-existing
  uncommitted maintainer/planner file modifications (repo_map.md,
  maintainer/ideas.md, maintainer/priority.md) were left untouched.
- No `--wip`/access-restriction issues hit.

## Note (spec interpretation)

The DoD's "ONE commit … 'unit A landed, commit <hash>'" is self-referential
(a commit cannot carry its own hash; a 7-hex fixed-point is infeasible) —
resolved by keeping the spec's quoted text verbatim with the literal
`<hash>` placeholder in the status line, the actual commit identifiable via
`git log` (parent `7e790d4`), and this summary in the same commit.
