# Task spec — Auto-resume UNIT 3: new-planner spawn helper

Worker: `worker_Q3S_160K` · Iteration: plan3 (looprun autorun-2026-09-21_15-33)
Design source (APPROVED): `.opencode/proposals/approved/2026-09-21_opencode-auto-resume-plugin.md` —
the Unit 3 section (its lines 85-90) + the shared architecture rules (lines 40-53) BIND.

## Goal

One spawn helper in `.opencode/plugin/auto_resume.ts` that starts a fresh planner
session: create a new session + queue the planner start prompt (QUEUED
`promptAsync`, never synchronous). Shared building block for Unit 4's restart
branches. DoD: invoking the helper produces a running fresh planner session —
smoke-verified here; the LIVE acceptance (one-shot trigger file) is run by the
planner after the next host restart.

## Verified facts (planner, 2026-09-21 — do NOT re-derive)

- `client.session.create()` EXISTS — `sdk.gen.d.ts` line 114; `SessionCreateData`
  (types.gen.d.ts 1811): body optional `{parentID?, title?}`, no path →
  `create()` with no args creates in the default directory; 200 response =
  `Session` (`{id, ...}`, types.gen.d.ts 465). NOT in the Unit 1 live surface
  line (static-only fact) — this build adds `create` to the surface probe; the
  LIVE `typeof` becomes the authority (the live-more-than-static pattern,
  surface report §UNIT 2 supplement).
- `client.session.promptAsync({ path: { id }, body: { parts: [...], agent?,
  model? } })` — sdk.gen.d.ts 180-182 ("start if needed and return
  immediately"); body type `SessionPromptAsyncData` (types.gen.d.ts 2329).
- Live planner agent (opencode.jsonc lines 166-170, verified today): agent id
  `planner_Q3S_160K`, model `llama-swap/Qwen3.8-27B-Q3S-160K`. The maintainer
  edits that file LIVE — re-verify the agent id at build time; note any drift.
- The looprunner today spawns the planner WITHOUT an explicit model — the
  agent-configured model applies (proven path on this host).
- Smoke pattern: factory re-invoked with a SPY client; real 5s tick driven by
  `waitUntil` polling (smoke lines 43-52); the module must export the DEFAULT
  factory ONLY (smoke check line 57 — a named export breaks it).

## Design (locked — a deviation is reported, not self-decided)

1. `spawnPlanner(startPrompt)` — async module-INTERNAL function (no named
   export):
   - `create()` → `res.data.id`; missing `create` / throw / missing id → log
     `spawn-fail= <reason>`, no promptAsync, never throws outward.
   - ONE queued `promptAsync({ path: { id: newSid }, body: { parts:
     [{ type: "text", text: startPrompt }], agent: "planner_Q3S_160K" } })` —
     NO `model` field (the agent-configured model applies; the host is the
     live source of truth).
   - success → record `sid → epoch` in a module-level `spawned` map (the
     self-mark for Unit 4) + log `spawn= sid=<newSid> agent=planner_Q3S_160K`.
   - `promptAsync` throw → log `spawn-fail= <reason>`, no crash.
2. Trigger — the 5s tick (the ONLY decision+send funnel; events stay ARM-only)
   checks `.opencode/temp/auto_resume_spawn_trigger` (same dir as the log,
   `logDir`):
   - present + non-empty trimmed → spawn once with the content as startPrompt
     (in-flight latch — no double-spawn), then RENAME the file to
     `auto_resume_spawn_trigger.consumed` — consumed EVEN ON FAILURE (a failed
     trigger never re-fires; re-trigger = write a new file).
   - present but empty trimmed → log `spawn-fail= empty trigger` + rename to
     consumed.
   - absent → nothing.
3. `SESSION_CANDIDATES` (plugin L59-73): add `"create"` — one more `typeof` in
   the one-shot `surface=` line.

## DoD (measured)

- Smoke `.opencode/plugin/tests/auto_resume.smoke.mjs` extended (UNIT 3
  section, same spy-client + real-tick pattern as Unit 2, lines 136-268):
  1. trigger present (non-empty) → `create` called exactly once; `promptAsync`
     exactly once with `path.id` = the created sid, `body.agent =
     "planner_Q3S_160K"`, NO `model` key, `body.parts[0].text` = the trigger
     content; a `spawn=` line; file renamed to `.consumed`.
  2. `create` throws → zero `promptAsync` calls; a `spawn-fail=` line; the
     tick/handler survive.
  3. `promptAsync` throws → a `spawn-fail=` line; the tick/handler survive.
  4. no trigger file → zero `create` + zero `promptAsync` calls (regression pin).
  5. a second tick after consumption → no second spawn (no double-fire).
  6. empty trigger → `spawn-fail= empty trigger`, file consumed.
  7. surface pin updated: `create=` in the candidates (smoke `CANDIDATES`
     list line 35, the v1 mock session line 62, the Unit 1 check line 79).
  All 32 existing checks stay green → total = 32 + 7 (check 7 replaces the
  surface-candidates pin).
- Gates: probe **235/235 UNCHANGED** (the probe has zero auto_resume refs),
  pytest 459+1w, ruff F=0, all other smokes green.
- The trigger file lives in git-ignored `.opencode/temp/` — no new repo files.

## DO-NOT-touch

`.opencode/maintainer/**` (read-only), the live `opencode.jsonc` (read-only),
NAP/handover files, the probe, other plugins/tools, FST product code,
AGENTS.md, the loop files. Findings you cannot fix → `todo_inbox.md`.
Spec-vs-reality drift (e.g. the live `create` response shape differing from
the static .d.ts) resolved DEFENSIVELY + reported in your handover, with the
fact noted for the surface-report supplement.

## Context map (read only what you need)

- `.opencode/plugin/auto_resume.ts` (367 lines at HEAD): constants L59-80;
  Watch/watches L91-101; `log` L106; `sendSelfCompact` L236-260 (the funnel +
  latch pattern to copy); `tick` L262-284 (wiring point); `probeSurface`
  L339-351; factory L353-367.
- Smoke: L36-135 (mock client + factory + Unit 1 checks), L136-268 (Unit 2
  spy-client section — the pattern to copy).
- Surface report: `.opencode/agent/knowledge/opencode-plugins/auto-resume-unit1-surface-report.md`
  (the §UNIT 2 supplement only).

## Approval boundary

Plugin-internal only — no product behavior, no config/registration change (the
plugin auto-discovers). The queued-prompt rule + tick-only-funnel rule bind.
One green commit: code + smoke + the TODO #75 status line; your summary in
`handover_task_to_planner.md`.
