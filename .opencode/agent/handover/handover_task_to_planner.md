# Worker summary — #53 Part B: the `submit` tool (worker-14, ses_f4e83d605ffeOKFdW4VvtvafcR)

## What changed (commit b83b34f on `opencode_test`)
- NEW `.opencode/tools/submit.ts` — unified append tool `submit(feedback?, knowledge?, todo?, role?, session?)`:
  machine-stamped entries (`###` feedback / `##` knowledge / `##` todo + `<YYYY-MM-DD_HH-MM> <role|agent> <session|unknown>` + raw text + one trailing blank line), HARDCODED targets (`.opencode/agent/agent_feedback.md`, `.opencode/agent/knowledge/knowledge_inbox.md`, repo-root `todo_inbox.md`), append-only via `appendFileSync` (never reads), missing target/dir auto-created with no header invention, none-provided → exact error string `error: none of feedback/knowledge/todo provided — nothing written` (empty/blank strings count as not-provided), return per param = `<param>` + `target: <rel>` + `entry: <exact>` (design choice: the param-name label line — a superset of the spec's two required fields, makes multi-param returns self-describing; one stamp per call shared by all entries).
- NEW `.opencode/plugin/tests/submit.smoke.mjs` — built on `_smoke_base.mjs` (scratchpad sandbox dirs, never the live targets).
- `handover_probe.mjs` — new section pinning the contract (3 shape checks, 5-args-optional-accept, no-params error, one append per param, never-read preservation) + header self-annotation updated (section-sum line + PASS string, machine-verified agreement).

## Measured verification (all post-commit b83b34f, machine-checked)
- `submit.smoke.mjs` green (ALL PASS, exit 0)
- all 8 pre-existing smokes in `.opencode/plugin/tests/` still green
- `handover_probe.mjs` → PASS, verdict == annotation PASS string == section-sum (boolean invariants verified by script; numword-safe readout: two-two-nine)
- pytest 459 passed + 1 warning (baseline match) · ruff `--select F` F=0 (baseline match)

## TODO
- `TODO.md` #53: status line appended (Part B LANDED b83b34f …). NOTE: I also appended a one-line "Part A LANDED (5e29cb0, plan1)" fact (verified in git log) because the entry still says "Awaiting his ruling" (stale since the 2026-09-17 ruling) — drop it if you want the strict one-line form.

## Deliberately NOT done
- Registration in the live `opencode.jsonc` + per-agent tool grant = maintainer restart (spec: out of worker scope).
- Live acceptance of the tool (needs registration first).
- No changes to `.opencode/agent/prompts/**`, `.opencode/maintainer/**`, `AGENTS.md`, `intercept_observer*`, or the three live target files' existing content.

## Bookkeeping commit
This summary + the TODO.md status line ride a second small bookkeeping commit (the hash-recording precedent, cf. 9c701ed) — the code is the single green commit b83b34f.
