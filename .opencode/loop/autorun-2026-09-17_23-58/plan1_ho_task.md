# Task spec — the `submit` tool (Part B, approved #53 proposal)

Approved: `proposals/approved/2026-09-17_agent-feedback-closedown.md` — his
ruling: "approved both parts in one unit". Part A (the mandatory friction
close-down step) is ALREADY LANDED in the 4 role prompts — do NOT touch
`.opencode/agent/prompts/**`.

## Goal
ONE unified append tool `submit(feedback?, knowledge?, todo?)` — all three
params optional, at least one required. The tool machine-stamps each entry
(date + role + session), appends to a HARDCODED target file, and NEVER reads
the targets (append-only). It removes the file-fiddling friction the #53
entry is about — the agent supplies the text only.

## Behavior (exact)
- Tool form: the committed `tool()` form — build on `.opencode/tools/loop_log.ts`
  (same `import { tool } from "@opencode-ai/plugin"`, same
  `context.directory ?? process.cwd()` resolution, same machine-stamp helper,
  host names the tool by FILENAME — no `name` field).
- Args (zod via `tool.schema`, mirroring loop_log's schema style):
  - `feedback` (optional string): friction description (one line preferred).
  - `knowledge` (optional string): verified actionable knowledge (inbox format).
  - `todo` (optional string): a loose finding (unnumbered).
  - `role` (optional string, default `agent`): role token for the stamp.
  - `session` (optional string, default `unknown`): session id for the stamp.
- Runtime:
  - NONE of feedback/knowledge/todo provided → return an error string, no
    file touched.
  - For each PROVIDED param, append ONE entry to its hardcoded target
    (relative to `context.directory`), entry = stamp line + the raw text +
    one trailing blank line:
    - feedback → `.opencode/agent/agent_feedback.md`, stamp `### <YYYY-MM-DD_HH-MM> <role> <session>`
    - knowledge → `.opencode/agent/knowledge/knowledge_inbox.md`, stamp `## <YYYY-MM-DD_HH-MM> <role> <session>`
    - todo → `todo_inbox.md` (repo root), stamp `## <YYYY-MM-DD_HH-MM> <role> <session>`
  - Target file missing → create it carrying only the entry (no header invention).
  - The tool NEVER reads a target (append-only by fs use: `appendFileSync`).
  - Sandbox discipline: the targets are HARDCODED — there is NO path
    parameter (that is the sandbox; note the deviation from the proposal's
    ".opencode/ subtree" wording — `todo_inbox.md` sits at the repo root).
  - Return, per provided param: `target: <relative path>` + `entry: <exact text>`.
- `description` field: usage guidance (what to fire it for; auto-stamping;
  the three channels).

## Files
- NEW `.opencode/tools/submit.ts`
- NEW `.opencode/plugin/tests/submit.smoke.mjs` — build on
  `.opencode/plugin/tests/loop_log.smoke.mjs` (same `loadRepo` /
  `freshSandbox` / `makeChecker` base from `./_smoke_base.mjs`): shape
  checks (tool() result, no stale name/parameters keys, execute async, all
  args optional at parse), the no-params error, one append behavior per
  param in a sandbox project dir, a multi-param call, and the never-read
  preservation (a pre-seeded sentinel line stays byte-exact before the
  appended entry).
- `.opencode/plugin/probes/handover_probe.mjs` — APPEND a new section (the
  NEXT FREE section number — the last existing one is S21; verify by grep
  and let the machine compute the new number, never retype it) pinning: the
  registration shape (3 shape checks), the arg schema (5 optional accepts),
  the no-params error, one append behavior per param, the never-read
  preservation. Update the header self-annotation (section-sum line + the
  expected `PROBE handover: N/N PASS` string) — the annotation is the source
  (curate-don't-duplicate).

## Definition of done (measured)
1. `node .opencode/plugin/tests/submit.smoke.mjs` green (exit 0).
2. All 7 pre-existing smokes in `.opencode/plugin/tests/` still green (run each).
3. `node .opencode/plugin/probes/handover_probe.mjs` → all checks pass and
   the reported total agrees with the updated header annotation
   (launch total = two-two-zero; new total = launch total + new-section
   check count — machine-verify the sum, never eyeball it).
4. `./.venv/Scripts/python.exe -m pytest -q` → 459 passed + 1 warning.
5. `./.venv/Scripts/ruff.exe check --select F .` → F=0.
6. `TODO.md` #53: append ONE status line to the entry: "Part B (submit tool)
   LANDED <hash> — probe + smoke green; registration + per-agent tool grant =
   maintainer restart; live acceptance pending."
7. `handover_task_to_planner.md` written (executive summary per AGENTS.md
   §Handover-files: what changed, measured verification, commit hash, what
   deliberately NOT done); final message = a short pointer to it.
8. ONE green commit (submit.ts + smoke + probe + TODO.md + handover files);
   subject names the submit tool (#53 Part B).

## DO-NOT-touch
- `.opencode/agent/prompts/**` (Part A already landed; worker edit-deny).
- `.opencode/maintainer/**`, `AGENTS.md` (his files).
- The EXISTING content of the three target files (append-only; never
  rewrite — the never-read rule).
- `intercept_observer*` / the fuzzy plugin files (a different topic).
- Stay on the current checkout (verify `git branch -v`; do NOT switch).

## Baselines at launch (planner-verified 2026-09-18, machine-checked)
probe two-two-zero/two-two-zero (annotation agrees with section sum) ·
smoke three-seven/three-seven (7 smokes) · pytest 459 passed + 1 warning ·
ruff F=0.
