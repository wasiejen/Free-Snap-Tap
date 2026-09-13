# TASK SPEC — nap-size Part 2: one-time NAP cleanup (approved `2026-09-12_nap-size.md`)

ROLE: you are a PLANNER agent launched in **planner-as-text-worker mode** — IGNORE
your planner prompt (no NAP ownership, no delegation, no loop driving). You work
this spec exactly like a worker: edit, verify the DoD, commit, write the handover.
APPROVAL BOUNDARY: pre-approved meta work — bookkeeping/docs only, no code, no
behavior change.

## Goal
Compress the NAP (`.opencode/agent/handover/handover_planner.md`, ~1367 lines)
down to ≤150 lines by converting every closed session section into ONE
`## Compressed archive` line, preserving all information (it must live in a git
commit, a loop-folder file, a proposal/TODO pointer, or an appended nap file).

## Verified facts (mine — do not re-derive)
- NAP layout (at spec time): line 1 title, line 3 "FIRST read…" line, then the
  CURRENT session section `## 2026-09-13 (iteration 3; ses_f674587…)` (DO-NOT-
  TOUCH — keep byte-identical), then 23 closed session sections
  (`## 2026-09-13 (iteration 1;` down to `## 2026-09-10 (looprun 2, iteration 4)`),
  then `## Compressed archive (one line each — details in git log + TODO/records)`
  (9 existing bullet lines — keep as-is) and `## Standing` (17 lines, STALE).
- Loop folders (pointer targets — check each folder for its `plan<N>_summary.md`
  / `loop_log.md`; if a section's plan summary is missing, the pointer is
  `git log` + the proposal/TODO files named in the section):
  - `.opencode/loop/autorun-2026-09-13_04-27/` — the 09-13 iteration 1 section
    (plan1 + plan2 summaries).
  - `.opencode/archive/loop/autorun-2026-09-10/` — plan03.
  - `.opencode/archive/loop/autorun-2026-09-10-0/` — plan1.
  - `.opencode/archive/loop/autorun-2026-09-10_03-05/` — plan3.
  - `.opencode/archive/loop/autorun-2026-09-10_23-07/` — (no plan summary found).
  - `.opencode/archive/loop/autorun-2026-09-11_01-29/` — plan2/plan4/plan5.
  - `.opencode/archive/loop/autorun-2026-09-11_13-24/` — (no plan summary found).
  - `.opencode/archive/loop/autorun-2026-09-11_17-23/` — the 09-12 looprun
    (plan1–plan14; plan10+1 and plan12 summaries may be missing — check).
  - Sections labeled "direct session" have NO loop folder — pointer = the
    proposal file / git hash / TODO entry named in the section.
- Current baselines (measured 2026-09-13, carried): probe **98/98**, smoke
  **23/23**, pytest **459 + 1 #10**, ruff **F=0**.
- `repo/repo_commands.md` is canonical for gauge/self-gauge commands and file
  paths — the Standing gauge line must agree with it (read it once).
- The 09-12 "iteration 9–14" sections all belong to the 09-11_17-23 folder
  (the looprun continued past midnight).

## Work
1. Read the whole NAP. For EACH closed section (23), write ONE compressed line
   in this exact form:
   `- **<date> <iteration N|direct> (ses_<first 8 chars>):** <one-line outcome
     incl. LANDED/verified/closed state + key commit hash(es)> — details:
     <loop folder + plan file, OR "git log" + proposal/TODO file>`.
   Append them to `## Compressed archive` in reverse chronological order
   (newest first, above the 9 existing lines). The one-liner must carry what a
   future session needs without the section (outcome, hashes, gated items).
2. NO INFORMATION LOST: if a section holds detail NOT recoverable from the
   pointed-to files (design evidence, verbatim rulings, baseline dumps), APPEND
   that excess verbatim (with a `## <date> <section label>` header) to
   `plan<N>_nap.md` in the section's loop folder; direct sessions → APPEND to
   `.opencode/archive/loop/nap_direct.md` (create if absent; append-only).
   When in doubt, append — the archive files are cheap, the NAP is not.
3. `## Standing`: UPDATE IN PLACE — baselines line → the current values (fact
   above); the gauge/self-gauge line → agree with `repo_commands.md`; condense
   or remove stale evidence lines (keep standing RULES that still bind:
   opencode.jsonc live-file discipline, P02 clobber rule, delegation default,
   no plugin.log parsing, TODO curation rule, disclosure line).
4. Knowledge candidates (per the maintainer's comment on the proposal): while
   reading, note verified actionable knowledge NOT already in
   `.opencode/agent/knowledge/` (read those files once for dedup) — LIST them
   in your handover (item + source section + suggested area file). Do NOT write
   into the knowledge base.
5. Result: the NAP contains exactly — title + FIRST-read line, the iteration-3
   section (untouched), `## Compressed archive` (23 new lines + 9 old),
   `## Standing` (condensed).

## Definition of done (measurable)
- `@(Get-Content .opencode/agent/handover/handover_planner.md).Count` ≤ 150.
- The iteration-3 section is byte-identical (`git diff` shows no change to it).
- Exactly 23 new compressed lines; every line's pointer resolves (spot: the
  named file exists / the hash is in `git log`).
- No closed `## 2026-…` section remains outside the archive.
- `git diff --stat` (your commit) touches ONLY: the NAP + `plan<N>_nap.md`
  files + optionally `archive/loop/nap_direct.md` + your handover file. NO FST
  code, NO prompts, NO proposals, NO TODO.
- Working tree afterwards: clean EXCEPT `.opencode/maintainer/priority.md`
  (it has an UNSTAGED maintainer change — NEVER stage, never touch) and the
  loop folder files the planner owns (leave unstaged — the planner commits
  them; if your commit must include the handover file, stage it explicitly).

## DO-NOT-TOUCH
The iteration-3 section; `.opencode/maintainer/**`; loop `loop_log.md` and
`plan*_summary.md` files (append-only nap files are the exception);
`.opencode/proposals/**`; `TODO.md` / `todo_records.md`; FST product code/tests;
`opencode.jsonc`; AGENTS.md. Never `git add -A` — stage explicit paths only.

## Handover (`handover_task_to_planner.md`)
Executive summary; the 23 compressed lines (or "see commit"); per nap-file:
what was appended + why; knowledge-candidate list; the measured line count;
anything you deliberately left in a section's pointer instead of appending.
End your final message with a short pointer to the handover, not a re-dump.
