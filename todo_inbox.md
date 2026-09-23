# todo_inbox.md — raw findings inbox

Drop zone for **worker** / **explorer** findings that are not confidently
fixable in-scope or are out of scope. Loose format: dated, role-tagged blocks,
**no numbering**, append only — no curation, no renumbering here.

- **Who writes:** worker/explorer — use the submit.todo tool to append here, NOT `TODO.md`.
- **Who curates:** the planner — curates into `TODO.md`, assigns the stable ID
  at curation time, then trims this inbox.
- Entry shape: `## <YYYY-MM-DD> — <role>` + problem/evidence + files + why it
  matters.

## 2026-09-15 — planner curation (plan3)
- Trimmed all prior blocks (2026-09-10..2026-09-15): the 09-10/09-11/09-12
  blocks were already curated when they landed (records in the NAP history +
  this file's prior state in git log).
- Worker-10 (09-12) block_transfer MOVE/`dstFile` block-loss finding →
  `TODO.md` **#57**.
- Script-collection worker (09-15): branch-name mismatch in the launch
  message → handled (planner prompt "Branch truth" bullet, plan3; the loop
  branches were re-aligned, `opencode_test` fast-forwarded to the loop HEAD);
  stale corpus → one-off `--all --slim` refresh executed (plan3) + cadence
  decision → `TODO.md` **#59**; missing probe command in the gate definition
  → `TODO.md` **#58**.

## 2026-09-16 — planner curation (plan9)
- worker-13 block (stale "84/84" plugin-README baseline) → `TODO.md` #64,
  handled planner-direct (README line now points to the probe's self-annotated
  header total — the #58 curate-don't-duplicate convention).

## 2026-09-16 — worker-13 (looprun autorun-2026-09-16_17-20, plan2/iter2, 5.4 intercept observer)
- Doc discrepancy (maintainer file, flagged only, NOT edited):
  `repo_commands.md` §Run/test quotes probe totals "~376" and "one hundred
  twenty-two (plan7, S1–S16 + hygiene)" — both from the prior looprun and
  mutually inconsistent; the current self-annotation (the declared source) is
  **180/180** (plan2: S18=32, hygiene=6). Refresh the numbers when curation
  runs.
- Observation (loop-folder housekeeping, planner territory): `.opencode/loop/`
  holds the current `autorun-2026-09-16_17-20` plus an un-archived,
  name-mangled prior folder `autorun_2-6_0-9_1-6__1-3_3-3/` (carries
  plan1/plan2 spec+summary copies). Rollover should move it into
  `.opencode/archive/loop/`; the mangled name suggests a failed machine-rename.
- curated (2026-09-16, planner-2): repo_commands totals → TODO #71 (maintainer-file flag); loop-folder observation SUPERSEDED (the "mangled" folder is the maintainer's deliberate rename, perception mitigation — the real finding, loop_log creating spurious folders on it, → TODO #65).

## 2026-09-16 — worker-13 (R1, direct session)
- Doc discrepancy (maintainer file, flagged only, NOT edited):
  `repo_commands.md` §Run/test still says the probe total is "one hundred
  twenty-two (plan7, S1–S16 + hygiene)" — already stale at R1 start (measured
  baseline 180/180) and now 193/193 after the S19 section. The probe's own
  self-annotation (line ~452 of `handover_probe.mjs`) is the source and is
  current; the prose needs the maintainer's refresh (agents do not edit the
  repo parts directly).

## 2026-09-16 — planner curation (direct session, post-R1)
- worker-8 (plan7) feedback-file request → TRIMMED: superseded? — the
  maintainer's own `FB_2026-09-16_block_transfer_status.md` exists (his reorg
  of 2026-09-16); confirm with the maintainer that the ask ("short feedback
  on the tool's current status") is handled — if not, it is a small delegated
  write into `.opencode/maintainer/feedback/`.
- worker-9 (plan7) probe label-alignment note → TRIMMED: superseded — the
  probe's self-annotation (machine-summed) is the label/total source since
  plan2; the note (106-total era, "next free label 124") is history only.
- worker-13 (R1) repo_commands totals → folded into `TODO.md` **#71** (same
  stale-prose flag, refreshed: now 193/193).
- INCIDENT: worker-13 (R1) TRIMMED this file instead of appending (deleted
  header + 2 uncurated blocks, recovered from git aaf6b03 before curation).
  Worker-prompt line added: append-only, never touch existing entries.

## 2026-09-17 — planner curation (post-R2)
- worker (R2) residual hazard (write-fuzzy cannot distinguish a mistyped
  path to an EXISTING file from a deliberate d<=1 NEW filename — a
  legitimate new-file write can be re-targeted to an existing sibling and
  overwrite it; audit lines carry the original arg, verifiable after the
  fact, not preventable at hook level; pinned S20 200/201 + smoke 8f) →
  `TODO.md` **#72** (maintainer decision: accept as designed / mitigate via
  intent signal later).
- worker (R2) ref-gate measurement note (rev-parse 40-hex vacuity →
  for-each-ref membership) → recorded in decision-record §5 R2 (design
  source), trimmed here.

## 2026-09-21 — planner curation (plan1, autorun-2026-09-21_15-33)
- worker_Q3S_160K (auto-resume UNIT 1, ses_f3bbdd89affeigE26tm2lka7AT)
  finding: pre-existing `handover_probe.mjs` check [87] stale pin
  (classifier fixture `iq3` 1 vs 3) → `TODO.md` **#76**, closed same session
  (planner-direct pin fix; probe 235/235 green).

## 2026-09-21 — worker-3 (plan3, autorun-2026-09-21_15-33, auto-resume UNIT 3)
- (curated 2026-09-22, planner, direct session) block_transfer stale smoke
  pin → CLOSED: verified by grep that the chk line no longer exists in
  `block_transfer.sandbox.smoke.mjs` and "Housekeeping" is absent from
  `.opencode/tools/block_transfer.ts` — the pin was removed out-of-band; no
  TODO needed.

## 2026-09-22 — worker-2 (TODO #80, ses_f371e0e23ffe0eza71uD5qWy7K)
- (curated 2026-09-22, planner, direct session) probe [97] +
  compact_memory smoke pin red (maintainer temp fix 0f192e5) → `TODO.md`
  **#81** (maintainer call: re-pin to the temp-fix behavior, or re-pin when
  the compact_memory message feature gets its proper fix).

## 2026-09-22 — worker (configurable unit-2 threshold, ses_f35f82abdffeyz62ZF4NLW3qZy)
- Stale smoke load path found + FIXED in the task commit: `tests/auto_resume.smoke.mjs`
  still loaded `.opencode/plugin/deactivated/auto_resume.ts` — the plugin was
  reactivated (moved to `.opencode/plugin/auto_resume.ts`) in commit 380e326
  WITHOUT updating the test, so the smoke crashed with ERR_MODULE_NOT_FOUND
  before any check (the spec's "baseline 76/76" was unreachable on the current
  checkout). The load path now points at the live file. Suggest: close with a
  one-line record, or fold into the #83 bookkeeping.

## 2026-09-22 — worker_Q3S_170K (TODO #85 part 1, ses_f351feb02ffeScmZIiycmB79GD)
- Stale `PLANNER_AGENT_ID` in `.opencode/plugin/auto_resume.ts` (value
  `planner_Q3S_160K`, pinned 2026-09-21 per the constant's own comment): the
  LIVE `opencode.jsonc` agent list now carries only `planner_Q3S_170K`
  (verified 2026-09-22 by reading the live config; the live DB
  `session.agent` values for current planner sessions are
  `planner_Q3S_170K` too — no `planner_Q3S_160K` agent exists on the host
  anymore). The spawn path (unit 3 trigger + unit 4 restart branch) and the
  injected CONTINUE bodies for planner-scoped sessions still send
  `agent: "planner_Q3S_160K"` — an agent id the host cannot resolve, which is
  consistent with the #85 `UnknownError` at `SessionPrompt.createUserMessage`
  on every spawned session's start prompt (the #85 part-1 scope fix stops the
  re-trigger loop, but a re-triggered spawn would STILL fail on the stale
  agent). NOT fixed in the #85 part-1 commit (the spec's change list is
  scope-only; the constant is a pinned copy of a live-config value the
  maintainer owns). Needs his call: re-pin the constant (code + smoke pins)
  to the current live agent id, or derive the planner agent from the host
  agent list at spawn time (no such client surface was visible in the Unit-1
  surface report — would need a check). Files: `.opencode/plugin/auto_resume.ts`
  (L146 + spawn path + resolveInjectAgent), `tests/auto_resume.smoke.mjs`
  (the `planner_Q3S_160K` pins), live `opencode.jsonc` (source of truth).
## 2026-09-23_01-08 planner_Q3S_170K ses_f39d250e9ffeheip2FVEeY5Fk6
#86 (new, deferred, maintainer-proposed): worker audit of ALL `.opencode/plugin/` + `.opencode/agent/scripts/` tools/plugins for (a) stale hardcoded agent IDs (like the found `auto_resume.ts` PLANNER_AGENT_ID `planner_Q3S_160K`), (b) hardcoded model IDs not matching the live backend/roster, (c) general code smells (magic numbers, duplicated config, dead constants). Acceptance: a prioritized list of findings (ID + file + line + suggested fix) filed to todo_inbox.md; no behavior change (audit only). Scope: read-only scan; the found `auto_resume.ts` case is already handled by #85 part 2. Deferred (runs after #85 part 2 lands).

## 2026-09-23_02-51 agent_Q3S_170K ses_f34432f48ffeVEdDfSMaZrfTxu
TODO.md curation review (2026-09-23, planner direct, from the maintainer's "read TODO.md and give feedback" request): (1) header numbering note stale — says new entries start at #85 but #85 exists → should be #86. (2) ~40 full-text CLOSED entries (#1, #3, #4, #6-#11, #17, #30-#52, #65, #76, #77 and more) still sit inside the "open" sections, against the header rule that closed entries move to todo_records.md as one-line records — curation would cut roughly half the file (1058 lines). (3) Status markers drifted: #66 title says "CLOSED ... verdict LIVE" but its status line says "PENDING RESTART"; #81 title "(open)" but body LANDED with full gate green (effectively closable); #79 title "(open HIGH)" but LANDED with only live acceptance pending; #80/#82/#85 title markers lag their LANDED sub-statuses. (4) #74 is one ~4k-char line (exceeds the reader cap) — split into the contract's fields. (5) #75 is a ~90-line running changelog, not an open item — collapse to a status pointer per unit, move unit history to todo_records.md / the surface report. (6) #74 sits under "FST behavior decisions" but is an opencode host-side tool issue — wrong section. Net open set after curation: #56 (deferred), #66 (clarify status), #67, #70 follow-ons, #74, #75, #78, #79/#82/#85 (live acceptance pending), #80 (maintainer confirm + open design questions), #81 (close), #83 (backstop, maintainer call).

