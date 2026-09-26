# Task spec — loop_log v2 (plan24)

**Worker:** `worker_Q3S_245K_slow` (branch `opencode_test` — stay on the current checkout).
**Approved design (single source):** `.opencode/proposals/approved/2026-09-12_loop_log-v2.md`
(parts A–D, build order A→B→C→D). Read it first — it carries the maintainer's
`--todo` context note (lines ~195-200). Read this spec SECOND; on any conflict
this spec wins (it corrects two stale proposal details, below).

## Verified state (measured at spec time — do not re-derive)
- `.opencode/tools/loop_log.ts` is the **v1 tool** (112 lines): status = strict 5-token
  zod enum; `role` + `model` REQUIRED; `session` optional → literal `unknown`;
  return = `folder: <name>` + `line: <line>` (+ anomaly note for >1 autorun-* folder).
  No auto-identity, no readback, no `CORRECT-`. (The proposal's "Planner verdict
  (2026-09-15)" line claiming parts landed is STALE — the tool on disk is v1;
  the maintainer's 09-18 `--info` confirms.)
- Existing tests to build on (both pin v1 and must be adapted, not deleted):
  - `.opencode/plugin/tests/loop_log.smoke.mjs` (helpers `freshSandbox` /
    `loadRepo` from `_smoke_base.mjs`; sandboxed loop root, fake context object).
  - `.opencode/plugin/probes/handover_probe.mjs` **S16 section** (6 checks,
    lines ~3835-4010): pins the v1 return EXACTLY (`folder: <name>\nline: <line>`,
    no extra fields) + the folder-create/anomaly behavior.
- Current gate: probe **340/340**, loop_log smoke green (its own count in the
  file's readout), all other smokes green, pytest 459+1w, ruff F=0.
- Tool-context fields (evidence-backed 2026-09-12 live capture, maintainer
  `session_info` probe + `hot_loaded_tool.ts`): `context.sessionID` (camelCase),
  `context.agent` (agent identifier e.g. `planner_Q3S_245K_slow`),
  `context.extra.model.id` (model name). NO top-level `modelId`/`model` keys.
  The whole chain stays best-effort (absent → next source → `unknown`; never throw).

## Build (one file changed for code: `.opencode/tools/loop_log.ts`)
- **Part A — auto-identity:** make `role`, `model`, `session` OPTIONAL.
  Resolution chains (first hit wins, else `unknown` in the line):
  - session: `args.session` → `context.sessionID` → `context.sessionId` →
    `context.session?.id`
  - role: `args.role` → `context.agent`
  - model: `args.model` → `context.agent` (agent-identifier preference —
    maintainer `--todo` note: the line's model slot carries the agent
    identifier when available, raw model id only as fallback) →
    `context.extra.model.id`
  - Line format UNCHANGED: `<stamp> <status> <role> <session> <model> <content>`.
- **Part B — write confirmation:** after append, read the file back and
  byte-compare the last line. Return gains two fields:
  - `folder: <name> (created)` / `folder: <name> (existing)` — `(created)` iff
    THIS call created the folder (empty loop root);
  - `verified: readback-match` / `verified: readback-MISMATCH: <actual last line>`.
  The anomaly note (several autorun-* folders) stays, appended after.
- **Part C — lenient status:** `status` becomes a free-form string; normalize:
  lowercase + strip non-alphanumerics, then keyword check in order:
  `done` → `DONE<---`, `return` → `-RETURN-`, `warn` → `-WARNING`,
  `info` → `--INFO--`, `start` → `-->START`, `correct` → `CORRECT-` (Part D).
  No keyword matched → **return an error** naming the accepted keywords
  (`start / done / return / warn / info / correct`), never a silent INFO
  fallback. The 5 tokens + `CORRECT-` are 8-char each; existing lines stay
  parseable. (Note: `restart` normalizes to START — intended.)
- **Part D — `CORRECT-` status:** a clarification line, appended normally
  (append-only stays absolute — no rewrite/delete anywhere). When the status
  normalizes to `CORRECT-`, the return also carries
  `corrects: <previous line of the log>` (byte-exact; the log's last line
  BEFORE this append; empty/absent log → omit the field).
- **Description:** rewrite the tool `description` to state the keywords
  (start/done/return/warn/info/correct), the optional role/model/session
  (auto-filled from host context), and the confirmed return format
  (folder (created|existing) / line / verified / corrects / anomaly).
  The description is the usage channel — keep it tight.

## Definition of done
1. Code: `loop_log.ts` implements A–D; line format byte-unchanged for all
   five old tokens; append-only (no earlier line ever rewritten).
2. Smoke: `.opencode/plugin/tests/loop_log.smoke.mjs` — re-pin the v1 checks
   whose return format changed (the `folder:`/`line:` lines now carry
   `(created|existing)` + `verified:`) and EXTEND with the proposal's
   acceptance matrix: Part A context-set / each-absent / arg-override /
   `unknown` fallbacks; Part B created-vs-existing + mismatch path; Part C
   the normalization table (each keyword in ≥3 spellings incl. case/dash/
   arrow variants, `restart` → START, `bogus`/empty → error naming the
   keywords); Part D `CORRECT-` line + byte-correct `corrects:` previous
   line; line-format byte-match + append-only prefix-unchanged assertion.
   Green readout, all checks counted.
3. Probe: S16 section re-pinned to the v2 return format (same sandbox pattern);
   probe total self-annotated and green (340 unless a check is added/removed —
   then the header total moves with it, per #58).
4. Gate: full probe + ALL smokes + pytest 459+1w + ruff F=0.
5. Commits: checkpoint commit(s) per verified unit; `handover_task_to_planner.md`
   rides the final commit (measured gate numbers, what changed, the S16 re-pin
   list). No TODO entry unless a discrepancy is found (then: todo_inbox via
   submit).

## DO-NOT-TOUCH
- Everything under `.opencode/maintainer/`, `opencode.jsonc` (registration is
  the maintainer's domain), `AGENTS.md`, all prompt files, all other
  tools/plugins/tests, the live `.opencode/loop/` folder (smoke is sandboxed),
  `TODO.md`/handover files except the final-commit handover write.
- The five established status tokens and the line format are a public
  contract (role prompts + consumers reference them) — no token renaming.
