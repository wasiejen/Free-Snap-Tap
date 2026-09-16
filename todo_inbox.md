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

## 2026-09-16 — worker-8 (plan7/iter7, #57 fix)
- Unhandled maintainer ask from the #57 `--comment` (left in place per the
  spec): "can you write a short feedback in maintainer/feedback folder what
  the current status of the tool is?" — OUT OF SCOPE for the approved fix
  (worker `maintainer/**` access is read-only; the spec's DO-NOT-touch covers
  it). Not done here; the planner may delegate it (a small write into
  `.opencode/maintainer/feedback/`). The comment's idle-thoughts (shared
  sandbox scriptlet for scripts) are likewise not built — noted only, per the
  spec. Files: `TODO.md` #57 `--comment`, `.opencode/tools/block_transfer.ts`.

## 2026-09-16 — worker-9 (plan7/iter7, #60 probe pins)
- Factual note on the `handover_probe.mjs` label/counter alignment (machine-resolved
  during #60, NOT fixed, per spec): HEAD e29e2da has 101 `check("NNN"` calls but the
  reported total is 106 — the difference is 5 table labels (47-51) emitted via a
  different call form (a naive `check("NNN"` grep misses them; the #60 spec predicted
  this). The label range 1..107 has exactly one gap (44), so the reported total (106)
  and the max label (107) can never be equal unless the gap is filled or the table
  labels are counted. #60's new labels continue from the real max label: 108..123
  (consecutive, machine-verified). Next free label = 124.

## 2026-09-16 — worker-13 (plan9/iter9, research lane)
- Stale doc baseline in `.opencode/plugin/README.md` line 9: it says
  "probes/ — the test gates (handover_probe.mjs, 84/84 under NODE)", but the
  current probe total is 120+2 (machine-verified plan9: `PROBE handover:
  120+2/120+2 PASS`; the header annotation "one hundred twenty-two" in
  repo_commands.md is the source). Fix = one-line baseline update in the
  plugin README — out of scope for the research lane (`.opencode/plugin/**`
  is DO-NOT-TOUCH there); delegate as a one-liner with any build that
  touches the plugin folder.
