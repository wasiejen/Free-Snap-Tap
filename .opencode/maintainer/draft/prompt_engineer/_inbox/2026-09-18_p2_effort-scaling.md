# DRAFT P2 — effort scaling (approved in maintainer comment2, 2026-09-18)

Failure anchor: `agent_readme_task_spec.md` line 13 records the observed incident — a
worker run burned "5–6 context cycles, zero work done" on re-research; D12/F17: models
demonstrably misjudge effort. No spec today carries any effort budget, so the only stop
signal is the context % line — by then the session is already near its wall.

Three surfaces, each minimal. Tool-call numbers are the guide's F17 starting values
(research subagents); label them starting points and calibrate after the first measured
looprun — do not present them as local measurements.

## 1. `agents/prompt_agent_planner.md` — §Delegate vs. do
Old:
```
- Do it yourself only if it is small and obvious (a direct edit you can verify inline).
- Delegate everything larger (>~15 diff lines, >3 files, or a heavy run) via the Task tool.
```
New (third bullet added):
```
- Do it yourself only if it is small and obvious (a direct edit you can verify inline).
- Delegate everything larger (>~15 diff lines, >3 files, or a heavy run) via the Task tool.
- **Effort scale (F17/D12):** the spec names the expected size as a tool-call budget
  (guide starting points: small ≈ 3–10 calls, medium ≈ 10–15; bigger → decompose into
  ordered tasks, per agent_readme_task_spec.md). A worker that clearly outgrows the named
  size stops at its last verified checkpoint and hands over IN PROGRESS — it does not
  silently expand scope to fill the window.
```

## 2. `agent_readme_task_spec.md` — new bullet (after "Spec size is context")
```
- **Effort field:** every spec names the expected effort as a tool-call budget — the
  worker's STOP signal, not a target to fill. Outgrown budget = checkpoint + IN-PROGRESS
  handover + size mismatch in the summary (planner re-plans, usually by decomposing).
```

## 3. `agents/prompt_agent_task.md` — §Work loop, new bullet (after "Context discipline")
```
- **Effort scale:** the spec's effort field is a ceiling, not a target. If the work is
  clearly larger than the named budget, STOP at the last verified checkpoint, write the
  handover IN PROGRESS (done / left / why it is bigger), and report the size mismatch —
  do not silently expand scope (F17/D12).
```

## Verification (D10, minimal for a prompt change)
Run one small + one medium real task after landing; measure: did the worker stop at the
budget or run to the wall (loop_log DONE gauge line + tool-call count from the session
dump)? Expected delta: outgrown tasks end in an IN-PROGRESS handover + a re-plan, not a
dead-at-95% session. Calibrate the 3–10 / 10–15 starting points from the first measured
run and record the local value as measured.

## Deliberately not done
- No parallel-launch rule (P1) — maintainer comment1: hardware single slot, serial only.
- No wall-clock budgets (minutes) — the host's cost metric is time, but per-task wall
  clocks are not reliably knowable to the agent; tool calls are the observable unit.
