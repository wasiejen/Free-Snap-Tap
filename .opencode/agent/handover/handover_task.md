# Task spec — NAP Part-2 continuation (PIPELINE-ONLY; approved `2026-09-12_nap-size.md`)

**Role:** planner-as-text-worker — IGNORE the planner prompt; act as a plain
text worker on this spec (no NAP ownership, no delegation, no loop driving).
**Shell:** git-bash (unix idioms). **Working dir:** repo root.
**PIPELINE-ONLY RULE:** NEVER read the NAP section bodies. Your only NAP
content reads: the header lines (`grep '^## '` output) and the archive+
Standing block (L1402-1460, ~60 lines). Everything else goes through scripts.

## Verified state (planner-measured 2026-09-15 — do NOT re-derive)
- NAP `handover_planner.md` = **1460 lines**: 32 detail sections (headers at
  L5..L1353), `## Compressed archive` at L1402 (1 line already in new format,
  L1403 `ses_f601cfc5`; + 8 legacy multi-line entries L1404-1432),
  `## Standing` L1434-1460 (STALE baselines).
- 26 of 32 sections are ALREADY no-loss-appended to pointer files (checkpoint
  `1f5ccf8`). `Temp/opencode/nap_line_data.tsv` holds their data (26 rows:
  date, label, ses, hash, pointer). **POINTER (col 5) + HASH (col 4) are
  usable; label + ses columns are partly mangled** (ses truncated at the first
  uppercase — take the full ses id from the header line instead).
- Full pre-cleanup NAP backup is committed (`3446f75`) — backup condition MET,
  do not redo it.
- 7 sections remain un-appended (NAP header line → target pointer file):
  L1002 `ses_f71d36a2` → `archive/loop/autorun-2026-09-10_03-05/plan4_nap.md`
  L1046 `ses_f7210e535` → `.../autorun-2026-09-10_03-05/plan3_nap.md`
  L1097 `ses_f725ba15` → `.../autorun-2026-09-10_23-07/plan2_nap.md`
  L1193 `ses_f729fdee` → `.../autorun-2026-09-10-0/plan1_nap.md`
  L1223 looprun2-iter6b (no ses) → `.../autorun-2026-09-10/plan6b_nap.md`
  L1283 looprun2-iter5 (no ses) → `.../autorun-2026-09-10/plan5_nap.md`
  L1353 looprun2-iter4 (no ses) → `.../autorun-2026-09-10/plan4_nap.md`
- Planner-measured baselines (this session): probe **99/99**, pytest
  **459 passed + 1 warning (#10 known)**, ruff **F=0**.

## Phase A — append the remaining 7 (script-driven)
1. Edit `Temp/opencode/nap_append.sh`:
   a. add the missing mapping in `resolve()`:
      `ses_f71d36a2) echo "$A/autorun-2026-09-10_03-05/plan4_nap.md" ;;`
   b. idempotency: before appending a section, if the target already contains
      the section's exact `## ` header line → print `skip <header>` and do not
      append; still write its TSV row (for skipped sections, reuse the
      existing TSV row for that section if present, else re-derive).
   c. keep the append header byte-exact as it is now:
      `## COMPRESSED 2026-09-15 (Part-2 cleanup, ses_f5d9e86a6) — verbatim section text (no-loss rule)`
2. Run it. Expect exactly **7 appends** + a TSV of **32 rows**. If a section
   you expected appended is reported `skip` (or vice versa), STOP and write
   the discrepancy to the handover — do not guess.
3. Verify each of the 7 targets: `tail -n 3` shows the appended section
   header; `grep -c 'COMPRESSED 2026-09-15'` per target is sane (≥1).

## Phase B — rewrite the NAP (header-line driven)
4. `grep '^## ' .opencode/agent/handover/handover_planner.md` → the 32 header
   lines (plus the archive/standing headers). This is your only NAP read
   besides step 5's existing archive/standing text.
5. Build the new NAP (write the full new file, replacing the old):
   - keep the first 3 lines (title + FIRST-read line) verbatim.
   - `## Compressed archive (one line each — details in git log + TODO/records)`
     — one line per section, newest first, strict Part-1 format:
     `- <date> <label> (ses_<full id>) — <outcome, verbatim from the header after the em dash> — details: <pointer> + git <hash>`
     pointer from TSV col 5 (or the mapping above for the 7 new ones); hash
     from TSV col 4 (or the first hash found in the appended text). No ses in
     the header → `(no-ses)`.
   - keep the existing L1403 line (ses_f601cfc5, already new format).
   - fold the 8 legacy entries (L1404-1432: iter 3/2/1, session 5/4/3/2/1)
     into the same strict one-line form: date via
     `git log -1 --format='%ad' --date=short <first hash in the entry>`;
     ses = `(legacy, no-ses)`; outcome condensed to one line keeping the key
     facts (hashes, TODO ids, verdicts); pointer = `git <hashes>`.
   - `## Standing` — update IN PLACE:
     - baselines = YOUR measured values (run all three; expected 99/99,
       459+1#10, F=0 — report actuals):
       probe `node .opencode/plugin/probes/handover_probe.mjs`;
       pytest `./.venv/Scripts/python.exe -m pytest -q`;
       ruff `./.venv/Scripts/ruff.exe check --select F .`
     - DROP the stale `opencode.jsonc uncommitted BY DESIGN` line (now
       committed); gauge line in bash form
       (`node .opencode/plugin/scripts/peek.mjs`).
     - condense pure-history lines; keep the still load-bearing ones (inbox
       convention, delegation rules, disclosure line, P02 clobber rule,
       TODO curation rule).
6. Do NOT add a 2026-09-15 current-session section — the planner adds it
   after verifying you.

## Definition of done
- `wc -l` of the NAP **≤ 150** (report the number).
- every archive line in strict format; 3 lines of your choice re-verified:
  pointer file exists and contains that section's detail.
- TSV = 32 rows; the 7 appends verified per step 3.
- one green commit staging ONLY the NAP + the 7 target pointer files:
  `NAP: Part-2 cleanup complete — 32 sections compressed (no-loss rule), Standing to measured baselines`

## DO-NOT-touch
`.opencode/maintainer/**`, `opencode.jsonc`, product code (`fst_*`, `tests/`),
`.opencode/agent/prompts/**`, `knowledge/**`, `TODO.md`, `loop_log.md` files,
the NAP section bodies (they move only via the script), the backup file
`archive/nap_backup_2026-09-15_pre-cleanup.md`.

## Handover
Write `handover_task_to_planner.md`: the 7 appends (target + verified tail),
final wc -l, measured baselines, commit hash, one folded legacy line as
example, anything you could not resolve.
