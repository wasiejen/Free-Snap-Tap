# DRAFT — prompt-surface rework plan (efficiency + de-ambiguation + single-source)
Basis: this session's bounded reads (AGENTS.md, all 4 agent prompts, loop/task-spec/
post-compaction/todo/proposals readmes heads, repo_custom_tools, knowledge guide Parts
0–5, handout) + maintainer direction 2026-09-18 (cut to what the hardware supports —
serial slot; make surfaces inline with each other; shrink per-session window; rework
custom-tool descriptions). Hardware facts (maintainer-verified): ONE llama-swap slot,
serial execution only; cost metric = time.

Measured surface sizes (words, wc -w): AGENTS.md 2019 · planner 2960 · looprunner 1796 ·
worker 1442 · explorer 646 · loop-readme 707 · task-spec 270. A planner session loads
AGENTS.md + planner prompt + launch text ≈ 4979 words BEFORE any file read; worker ≈
3461. Dedup wins are PER-SESSION × every launch, so they scale with looprun length.

## Track A — dedup / de-ambiguation (no new behavior; each item = one commit per surface)
A1. **Friction check #53** restated near-verbatim in planner §Friction check, worker
   §Checkpoint & handoff, explorer §Handoff. Canonical home: AGENTS.md §agent_feedback
   (section exists, 1 line today) — move the full rule there; roles keep ONLY their
   channel note (looprunner: --INFO-- line instead of submit). Saves ~250 words/looprun.
A2. **No-circumvent (TODO #54)** in planner §Delegate vs do, worker §Honesty guard,
   explorer §Honesty guard (3 copies, ~175 words). Canonical: AGENTS.md §Approval-
   boundaries (the deny is a boundary — the rule belongs with the boundaries); roles keep
   one line each.
A3. **"Compaction is NOT a restart"** verbatim in planner L3 + worker §compact_memory
   (~70 words × 2). Canonical once (AGENTS.md §Context budget); roles keep mechanics.
A4. **Gauge-lag rule (#9)** verbatim in planner + worker prompts AND in
   repo_custom_tools.md. Canonical home: the **ctx_gauge tool description** (registered
   tools see it every call; repo_custom_tools.md already says the description is
   authoritative) — then delete from both role prompts + the readme. Tool-source edit
   (.opencode/tools or plugin — locate at draft time) needs maintainer approval.
A5. **Priority ladder** appears twice inside the planner prompt (autonomous + direct
   session, identical line). Dedupe: once + "applies to both modes".
A6. **Loop-signals (counter mismatch + `--request:`)** in looprunner prompt, planner
   prompt, AND agent_readme_loop.md §Iteration semantics (3 copies). The readme is the
   loop protocol's canonical home — roles keep one pointer line. Saves ~120 words.
A7. **Looprunner loop-log section** (~180 words) restates agent_readme_loop §Loop log
   and carries three bold maintainer rulings mid-section. **Ambiguity:** "ALWAYS write
   your loop-log lines via the loop_log tool" (L78) vs "you are exempted from the
   writing into the log" (L91) read as contradictory. Consolidate the looprunner-
   specific content (its own status lines, tool-use mandate, folder-creation exemption)
   into the readme as a looprunner subsection; prompt section shrinks to ~40 words.
   Drafted clarification: the exemption is from FOLDER MANAGEMENT, not from writing its
   own lines — maintainer to confirm.
A8. **Explorer L3 section is stale** — pre-2026-09-15 ruling (no 90% stop line, no 70%
   early handover, no dump protocol; still "≥90% → compact now"). Update to the same
   canonical text as worker/planner once the ruling lands in AGENTS.md (Track B2).
A9. **Terminology collision:** worker prompt "ON RESUME (the planner restarts the SAME
   session)" — `restart` is the action-line verb for a NEW session (AGENTS.md). Rename
   to "resumes the same session via task_id". One word, removes a real mis-read risk.
A10. **Pointer compression (knowledge base + fuzzy-numword):** the two pointer
   paragraphs are near-identical in planner + worker, and the numeral-convention pointer
   duplicates what AGENTS.md already auto-loads. Compress each to: convention = AGENTS.md
   (already loaded); primer = form details; decision-record.md = grep by section.
   Saves ~80 words/role.
A11. **Stale agent id:** planner prompt §Delegate vs do names `planner_Q4_120K` — the
   registered roster (Task tool listing) has `planner_Q4_140K` and no `planner_Q4_120K`.
   Verify against repo_map.md roster; fix the name or drop the inline ids in favor of
   "roster in repo_map.md".
A12. **agent_readme_loop.md token drift:** content descriptions say `START-->` /
   `<---DONE` while the canonical 8-char tokens (table + examples) are `-->START` /
   `DONE<---`. Align descriptions to the tokens.

## Track B — behavior changes (maintainer approval + his files)
B1. **P2 near-limit triage** — separate draft (this folder). Canonical text lands in
    AGENTS.md §Context budget (his edit), role sections shrink to pointer + mechanics.
B2. **Land the 90% stop-line ruling** (planner prompt says it "rides a proposal until he
    lands it") — then delete the stale 85%/REM≤15k line from AGENTS.md §Context budget.
    **Open:** does the 90% line apply to the LOOPRUNNER (still 85%, L148/187)? One-line
    maintainer call — if yes, looprunner drops its 85% text and points to AGENTS.md.
B3. **P4 looprunner digest** — separate draft (this folder): per-iteration window burn
    in the driver (the single point of failure, no self-restart).
B4. **Numerals block in AGENTS.md** (~230 words incl. 6 worked examples + content-escape
    syntax) is auto-loaded into EVERY session of EVERY role. Keep the 3-line rule +
    pointer; move the example block + escape syntax to the deferred primer (the form is
    rare-use; the harness implements the escape, the text is documentation — verify at
    draft time). Saves ~150 words per session × all roles. Largest single per-session win.
B5. **Serial-slot override line:** the built-in Task tool description instructs
    "Launch multiple agents concurrently whenever possible" — on this host that is
    impossible (single slot; launches queue). One line in the planner prompt (§Delegate
    vs do): "one model slot — launches run ONE at a time; queue, never parallelize."
    Prompt-side mitigation for a built-in description we cannot edit; flag the
    contradiction to the maintainer (maybe it is configurable).
B6. **Custom-tool description reworks** (per maintainer: make self-explanatory, drop
    prompt-like instructions):
    - block_transfer: the description carries a HOUSEKEEPING RULE directive ("use this
      tool … instead of write/edit") — that is prompt text, already in worker prompt +
      repo_custom_tools.md. Remove from the description (new-hire test: describe, don't
      direct). Saves ~30 words × every session the tool is registered in.
    - ctx_gauge: add the gauge-lag line (A4 — becomes canonical home).
    - compact_memory / loop_log / submit: read against the handout at draft time;
      current wording passes the new-hire test — likely no change (say so, don't touch).

## What deliberately stays
- The L0/L1/L2 layering (AGENTS.md inlined, repo facts deferred, readmes pointer-indexed)
  already matches the guide's model — the rework is dedup + de-ambiguation inside that
  layering, not a restructure of it.
- The marker table + ready-made sweep command stay in the planner prompt (canonical home
  is correct; worker/looprunner already reference it).
- The AFK-mode section stays single-home (looprunner).

## Targets (estimates; verify by wc -w per commit)
planner 2960 → ~2100 · looprunner 1796 → ~1350 · worker 1442 → ~1050 · explorer 646 →
~500 · AGENTS.md 2019 → ~2050 (grows with canonical text it absorbs from A1/A2/A3 + B1/
B2; the win is the COMBINED per-session total and the drift removal, not this file's size).

## Sequencing (each item = one commit per surface, one failure anchor each)
1. B2 land ruling (unblocks A8, B1 placement) → 2. B1 triage → 3. A1+A2+A3+A5 (AGENTS.md
   canonical cluster + role pointers, one commit per surface) → 4. A7+A12 (loop protocol
   pair) → 5. A4+B6 tool-description pair (approval) → 6. A6+A10+A11 pointer/copy trims
   (one commit per surface) → 7. B3 digest → 8. B4 numerals trim → 9. A8 explorer L3.

## Verification
Per commit: wc -w before/after (machine-measured) + grep for the deduped concept
(expect 1 definition, N references — the D2 check). Per looprun after the pass: the P6
script's table — tool calls/iteration and wall time should drop or hold; any worker
behavior regression (missed inbox/marker step) would show as a new WARNING class.
UNRESOLVED without that: the "fewer words = better" claim — words are static; time is
the metric (serial host), so the P6 baseline before the pass matters.

## Needs reads before drafting (bounded, at draft time)
post_compaction readme (174 words), todo readme (190), repo_map/commands/testgate/
gotchas parts (for A11 roster + sweep-command home), the tool/plugin sources for
ctx_gauge + block_transfer descriptions, the primer (escape-syntax move, B4).
