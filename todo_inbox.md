# todo_inbox.md — raw findings inbox

Drop zone for **worker** / **explorer** findings that are not confidently
fixable in-scope or are out of scope. Loose format: dated, role-tagged blocks,
**no numbering**, append only — no curation, no renumbering here.

- **Who writes:** worker/explorer — this is their APPEND target, NOT `TODO.md`.
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

## 2026-09-21 — worker_Q3S_160K (auto-resume UNIT 1, ses_f3bbdd89affeigE26tm2lka7AT)
- Pre-existing gate failure (NOT caused by UNIT 1): `handover_probe.mjs`
  check [87] FAILS — classifier fixtures expect `iq3`→1 but the current
  `compact_memory.ts` classifier (line 82, `/iq3|q3/` → cap 3, per the
  2026-09-21 ruling — `compact_memory.smoke.mjs` line 86 already pins
  `clf IQ3 -> 3`) returns 3. Only the probe pin (line 2377,
  `caps.iq3 === 1`) is stale. Verified pre-existing at this session's HEAD:
  the probe references none of UNIT 1's files, and `compact_memory.ts` was
  untouched. Both the probe file and `compact_memory.ts` are DO-NOT-TOUCH
  for UNIT 1, so left as-is. Rest of the gate green: UNIT 1 smoke 14/14,
  pytest 459 passed + 1 warning, ruff F=0.
