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

## 2026-09-17 — worker (R2 write-scope pair/fuzzy, looprun autorun-2026-09-16_21-21)
- Residual hazard of the APPROVED write-scope design (flagged only, no fix
  in scope): the write-fuzzy channel (and the pair gate) cannot distinguish
  "a mistyped path to an EXISTING file" from "a deliberately NEW filename
  that happens to sit within d<=1 of an existing sibling". Consequence: a
  legitimate `write` to a new path whose name is a d<=1 near-miss of an
  existing file (e.g. intending to create `file-5.txt` next to
  `file-4.txt`) gets MUTATED to the existing sibling and the new content
  overwrites it. The read scope has no such hazard (reads are
  non-destructive); the mitigation would need an intent signal the
  interceptor does not have (e.g. the agent confirming the log line before
  the write lands — the `fuzzy scope=write` / `gate=mutated` audit lines
  carry the ORIGINAL arg, so the re-targeting is verifiable after the fact,
  but not preventable at the hook level). Pinned as behavior, not bug:
  probe S20 (checks 200/201) + smoke 8f.
- Measurement note for the ref-gate design (why `git for-each-ref` and not
  `git rev-parse --verify`): git parses a pure 40-hex string as an OBJECT
  name — `rev-parse --verify <40hex>` exits 0 for ANY 40-hex string
  (including a non-existent sha) and never consults a ref whose name is
  exactly 40 hex chars; `^{}`/`^{commit}` peels do not fix it (the ref is
  ignored for the same reason, with an ambiguity warning). The gate is
  therefore `git for-each-ref --format=%(refname:short)` + membership
  (measured 2026-09-17, git on this host).
