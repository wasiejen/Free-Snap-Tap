# Handover — #78 dump completeness (A `--json` + B lossless full / `--lite` + C hook timeout/diagnostics/retry)

Worker: `worker_Q3S_170K` (ses_f30807a16ffelPQPUBH50wiXBe), 2026-09-23.
Branch `opencode_test` (current checkout, no new branch).
Task spec: `.opencode/agent/handover/handover_task.md` (2f64d76). Scoping:
`.opencode/loop/autorun-2026-09-21_15-33/plan11_78_scope.md`.
Commit: hash below (one code commit — A+B+C + TODO #78 + this handover + the
doc/knowledge updates).

## Executive summary
- **A — `--json` raw mode** (`.opencode/agent/scripts/db/dump_session.cjs`):
  new single-session flag emits `{ session, messages: [{ id,
  time_created, time_updated, data, parts: [{ id, time_created, data }] }],
  orphan_parts }` — every `data` value as parsed JSON (raw string when
  unparseable), unfiltered, uncapped, structure preserved. `--out` appends
  `.json` when the relpath has no extension (default file `<sid>.json`).
  `--json`/`--lite` are single-session only and mutually exclusive (with
  each other and with `--all`/`--full`/`--slim` → exit 2).
- **B — lossless full markdown + `--lite`** (same file): the default
  single-session full mode is now LOSSLESS — tool `state.input`/`state.output`
  emitted verbatim (`[tool input]` / `[tool output]` lines), no caps anywhere
  (meta 600 and the 400 unknown-type caps removed in full mode; unparseable
  parts keep their raw data string; orphan parts rendered). New `--lite`
  filtered preset: text + reasoning verbatim, tool header-only (no
  input/output), step-start/step-finish skipped, other types 400-capped,
  meta 600-capped (the old mid-rendering shape). The `# dumped:` line now
  says `mode=full|lite|slim`; the script's stdout line gained `mode=<mode>`.
- **C — pre-compaction dump hook** (`.opencode/plugin/compact_memory.ts`):
  timeout 60 s → **120 s** (`DUMP_SPAWN_TIMEOUT_MS`); `stdio: "ignore"` →
  **`"pipe"`** (stderr capture); **one retry** on first-attempt failure.
  Log lines in `.opencode/temp/ctx.log`: `DUMP-OK <sid> <relfile> ms=<ms>`
  (the `ms=` prefix replaced the bare `<ms>`), `DUMP-RETRY=1 <sid> ms=<ms>
  err=<one-line>` before the retry, and `DUMP-FAIL <sid> <error> | stderr:
  <captured one-line stderr>` after it. The hook keeps its markdown backup,
  rendered by the new lossless full mode.

## Re-pins (the #81 precedent; the pinned behavior changed by the spec)
- `compact_memory.smoke.mjs`: the DUMP-OK regex re-pinned to `ms=\d+$`; the
  stdio source pin flipped from `stdio: "ignore"` to `stdio: "pipe"`.
- `handover_probe.mjs`: check 255 re-pinned to the `ms=<ms>` DUMP-OK form;
  check 104 (no-script case) extended — the failure shape now includes the
  `DUMP-RETRY=1` line. Probe total UNCHANGED (241).
- Docs kept current: `scripts/db/README.md` (dump_session row),
  `knowledge_tools.md` (hook entry updated + new #78 modes entry).

## Measured verification (session ses_f31a5dee5ffe1DIBxZzEDZF8aF, 58 msgs / 263 parts)
- A: `--json --out scratch_78/a` → `scratch_78/a.json`, `JSON.parse` OK,
  messages=58 / parts=263. **58/58 message + 263/263 part `data` values
  byte-identical to the live DB** (compact `JSON.stringify` of the dumped
  value === the raw DB `data` column string — opencode stores compact JSON).
  The tool spot-check (part prt_0ce5a7744001NN85DPk7ATjZyl, `state.input`)
  is covered by the whole-part byte-identity; note the values are
  JSON-escaped inside the markdown (backslash → `\\`) for substring greps.
- B: full dump (411 751 bytes): **0/263 parts missing or truncated** (every
  text/reasoning body, every tool input/output serialization, every
  step-start/step-finish JSON present); `[tool input]`=62, `[tool output]`=62,
  step-start=57, step-finish=57. Lite dump: `[tool]` headers=62, tool
  input/output=0, step-start/step-finish lines=0, `[text]`=30,
  `[reasoning]`=57.
- C: exercised by the sandbox smokes/probe (stub success → `DUMP-OK … ms=`;
  no-script failure → `DUMP-RETRY=1` + `DUMP-FAIL … | stderr:`). No live
  compaction dispatch was triggered (would need a real self-compact — the
  stall itself only reproduces live).

## Gate (all green, measured 2026-09-23)
- probe: **241/241 PASS** (exit 0)
- smokes: compact_memory **57/57**, auto_resume 121/121, block_transfer
  22/22 + sandbox 52/52, context_recovery ALL PASS, ctx_gauge 3/3,
  gauge_core ALL PASS, intercept_observer 39/39, loop_log 24/24, submit 20/20
- pytest: **459 passed, 1 warning**
- ruff F: **0** ("All checks passed!")

## TODO entries
- `TODO.md` #78 status → **LANDED** (per spec, the code commit hash is
  recorded in YOUR follow-up bookkeeping commit, not mine). No other TODO
  changes; nothing appended to `todo_inbox.md` (no loose findings).

## Deliberately NOT done
- No live hook dispatch / live compaction (out of scope; the spec's
  verification for C = re-pins + gate).
- No `--all --json` / `--all --lite` corpus backfill modes (spec:
  single-session only).
- No NEW probe/smoke checks beyond the re-pins (DoD pins the probe total at
  241/241).
- Untouched per the DO-NOT-touch list: `.opencode/maintainer/**` (the two
  dirty files stay unstaged), the live DB (readOnly helpers only),
  `.opencode/plugin/auto_resume.ts`, `.opencode/agent/prompts/**` (no edit
  access needed; nothing blocked).
- Scratch deleted before close: `.opencode/archive/sessions/scratch_78/`
  (a.json, b_full, b_lite) + the scratchpad verify/output files.

## Commit
Subject: `dump #78 LANDED: --json raw mode + lossless full markdown + --lite
preset + hook timeout/diagnostic/retry`. Files: `dump_session.cjs`,
`compact_memory.ts`, `compact_memory.smoke.mjs`, `handover_probe.mjs`,
`TODO.md`, this handover, `scripts/db/README.md`, `knowledge_tools.md`.
Hash: __FILL_AFTER_COMMIT__

Lessons: the byte-identical dump-verify recipe (compact re-serialization ===
raw `data` column) is actionable for future dump-fidelity checks — appended
to `knowledge_tools.md` (#78 entry).
