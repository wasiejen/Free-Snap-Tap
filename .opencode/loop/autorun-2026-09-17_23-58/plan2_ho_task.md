# Task spec — submit tool: session/role autofill from the tool context

Worker: worker_Q4_140K · Iteration: plan2 (looprun autorun-2026-09-17_23-58)
Baselines at spec time (2026-09-18, verified): probe two-two-nine (S1–S23, no S5;
the header annotation total is the source), smokes: all 9 green (submit.smoke.mjs
20/20), pytest 459 passed + 1 warning, ruff F=0.

## Goal
The maintainer's inbox instruction (`.opencode/maintainer/inbox_planner/submit_tool.md`):
"session and role can be auto filled and do not need to be set". The tool's
`execute(args, context)` receives the tool context — `context.sessionID` and
`context.agent` (the role, e.g. `worker_Q4_140K`) are available there (reference:
`.opencode/agent/knowledge/plugin_tool_implementation/tool.context.md`). Derive both
from the context and REMOVE the `role`/`session` parameters from the args schema —
the agent supplies the three channel texts only.

## Scope (3 files)
1. `.opencode/tools/submit.ts`
   - args schema: remove the `role` and `session` entries (feedback/knowledge/todo
     stay).
   - execute: `role` = non-empty string `context.agent` else `"agent"`;
     `session` = non-empty string `context.sessionID` else `"unknown"`
     (the same fallback semantics the defaults had — keeps the smoke harness
     working when it passes a bare `{ directory }`).
   - description: update — role + session are auto-filled from the tool context
     (no parameter); drop the "from the SESSION= field of your injected ctx: line"
     instruction. Keep the one-stamp-per-entry wording accurate.
2. `.opencode/plugin/tests/submit.smoke.mjs` (currently 20/20)
   - the args-optional check (line ~56) now covers the 3 channel args only;
   - every test that passed explicit `role`/`session` args now passes them via
     the context object (`{ directory, agent: <role>, sessionID: <ses> }`) and
     expects the stamped entry from the context values;
   - add (or adapt) ONE assertion proving the fallback: a context WITHOUT
     agent/sessionID stamps `agent` / `unknown` (the existing (A) default test is
     the natural home).
   - keep the smoke self-counting; the total may move — the printed total is the
     source (no external baseline to re-pin).
3. `.opencode/plugin/probes/handover_probe.mjs` — S23 section ONLY
   (section header line ~4671 `S23 submit tool (9)`, checks ~230–238):
   - the args-shape check (line ~4723, `args [feedback, knowledge, todo, role,
     session]`) → re-pin to `[feedback, knowledge, todo]`;
   - where a check exercises execute, pass a context carrying agent/sessionID
     and pin the stamp from it;
   - keep the section's check COUNT and the section-header count in agreement
     (adding a check is allowed if the header count follows); the probe header
     annotation total must agree with the reported total (machine-verified — do
     not retype the number).

## Definition of done
- `role`/`session` are GONE from the submit.ts args schema (grep-verified:
  `grep -n "session" submit.ts` hits only the context-derivation line(s) + the
  stamp code; zero schema entries).
- stamp = `<header> <YYYY-MM-DD_HH-MM> <context.agent|agent> <context.sessionID|unknown>`.
- Standard gate green: `node .opencode/plugin/probes/handover_probe.mjs` (annotation
  agrees) + `node .opencode/plugin/tests/<each>.smoke.mjs` (all 9) + `pytest -q`
  (459+1w) + `ruff check --select F .` (0). Commands/venv per `repo_commands.md`.

## DO-NOT-touch
- `.opencode/agent/prompts/**` (edit-deny for workers — and not needed),
  `.opencode/maintainer/**` (read-only for you), AGENTS.md, WIKI.md, README.md,
- `intercept_observer*.ts`, `compact_memory.ts`, `loop_log.ts`, `block_transfer.ts`,
  `ctx_gauge.ts` + their smokes/probe sections (out of scope),
- TODO.md numbering (the status line you add rides under the existing #53 entry).

## Bookkeeping (rides your commit, per AGENTS.md commit routine)
- `TODO.md` #53: append a one-line status: maintainer inbox instruction
  (session/role autofill) LANDED <hash> (plan2/iter2).
- Write `.opencode/agent/handover/handover_task_to_planner.md`: executive summary,
  measured verification (gate readouts verbatim), commit hash, what was deliberately
  not done. Your final message = a short pointer to that file.
- ONE commit (code + TODO.md + handover files). Stay on the current checkout
  (verify with `git branch -v` first; do not name a branch from memory).
