# Task spec — NAP Part-2 cleanup (approved `2026-09-12_nap-size.md`)

**Role:** planner-as-text-worker — IGNORE the planner prompt; act as a plain
text worker on this spec (no NAP ownership, no delegation, no loop driving).
**Shell:** git-bash (unix idioms; `workdir` param for dirs).

## Goal
Apply the approved Part-1 format to the existing NAP
`.opencode/agent/handover/handover_planner.md` (verified today: **1451 lines**):
compress the 26 detailed session sections (L5–1392) + re-format the 7 legacy
`**iter N:**` / `**session N:**` entries (in the `## Compressed archive`
section, L1393+) into strict one-line entries; refresh `## Standing` (L1425+)
to measured baselines. NO information may be lost.

## Part-1 line format (the proposal L26-31 is the rule)
`- <date> <iteration/direct> (ses_…) — <one-line outcome> — details: <pointer> + git <hash>`
Every line carries: date, iteration/direct + session id, one-line outcome,
pointer (loop-folder file and/or `.opencode/archive/loop/nap_direct.md`), git hash.

## Steps (order matters)
0. **BACKUP FIRST (maintainer condition):** copy the full current NAP verbatim
   to `.opencode/archive/nap_backup_2026-09-15_pre-cleanup.md` and COMMIT it
   alone (`backup: full NAP verbatim before Part-2 cleanup`). Plain file —
   the maintainer reads files, not git.
1. For EACH of the 26 sections + 7 legacy entries:
   a. Locate its detail: loop folders live in `.opencode/loop/autorun-*/`
      (current: `autorun-2026-09-13_04-27`) and `.opencode/archive/loop/autorun-*`
      (09-10/09-11); sections carry date + iteration + ses id in their header —
      grep the ses id / iteration inside the matching folder. Detail = that
      folder's `plan<N>_summary.md` + `loop_log.md`; direct sessions →
      `.opencode/archive/loop/nap_direct.md`.
   b. **NO-LOSS RULE:** if the section holds facts NOT covered by those files
      (baselines, hashes, rulings, findings) — APPEND the excess to the folder's
      `plan<N>_nap.md` (create if absent) BEFORE compressing; for sections with
      NO loop folder at all (several 09-12 sessions) or direct sessions: append
      the full detail to `.opencode/archive/loop/nap_direct.md` under a
      `## <date> <iter/direct> (ses_…)` header, then compress.
   c. Replace the section with its one-line entry in `## Compressed archive`.
   d. Fold the 7 legacy entries into the same strict format (date/ses from the
      corresponding section headers before you delete them).
2. **Standing — update IN PLACE (Part 3):** replace baselines with MEASURED
   values (run them, do not trust memory):
   - probe: `node .opencode/plugin/probes/handover_probe.mjs`
   - tests: `./.venv/Scripts/python.exe -m pytest -q`
   - lint: `./.venv/Scripts/ruff.exe check --select F .`
   Fix known-stale lines: `opencode.jsonc` is now COMMITTED (drop the
   "uncommitted BY DESIGN" line); gauge fallback in bash form
   (`node .opencode/plugin/scripts/peek.mjs`); condense lines that are pure
   history. Keep lines that are still load-bearing.
3. Keep L1 title + `## Compressed archive` + `## Standing` headers. Do NOT add
   a 2026-09-15 session section — the planner adds it after verifying you.

## Definition of done
- `wc -l` of the NAP **≤ 150** (script-checked, report the number).
- Every compressed line matches the Part-1 format (date + ses/iter + outcome +
  pointer + hash); 3 lines of your choice re-verified: the pointer file exists
  and contains the detail.
- Backup committed (separate commit) BEFORE the cleanup commit.
- Baselines in Standing = your measured numbers (report them).
- One green commit for the cleanup: `NAP: Part-2 cleanup — 26 sections compressed (no-loss rule), Standing to measured baselines`.

## DO-NOT-touch
`.opencode/maintainer/**`, `opencode.jsonc`, product code (`fst_*`, `tests/`),
`.opencode/agent/prompts/**`, `knowledge/**`, `TODO.md`, `loop_log.md` files
(read-only for you), `.opencode/loop/autorun-2026-09-13_04-27/loop_log.md`.

## Handover
Write `handover_task_to_planner.md`: backup path + commit, per-section map
(section → pointer file, note where excess was appended), measured baselines,
final wc -l, cleanup commit hash, anything you could not resolve.
