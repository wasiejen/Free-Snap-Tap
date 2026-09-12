# plan6 summary (iteration 6; ses_f6d1d3627ffeSDD7HoxQuvlmCu)

**Maintainer directives (launch block) — all landed:**
1. Clarification: his "live" comment in `compact_memory.ts` = the tool is active/loaded into opencode (not "he actively works on it"); the call still fails in his host env (`context.client.session` undefined — his domain). Recorded in the NAP; the tool file stays read-only.
2. **Early-handover protocol added** for planner + worker (a `## Early handover` block in `prompt_agent_planner.md` + `prompt_agent_task.md`, commit `733ff6e`): readout ≥70 % or the unit clearly cannot finish before the stop line → pause, bring the handover fully current (NAP / IN-PROGRESS worker summary) and COMMIT it, then continue. Effective from iteration 7. (No block for the explorer — not requested.)
3. **Task-spec index trigger strengthened** in the planner prompt: `agent_readme_task_spec.md` is now MANDATORY pre-read before writing/launching any task spec (index line rewritten, typo fixed, pointer in the Delegate-vs-do bullet). Effective from iteration 7.

**T5 re-verify — LANDED + verified (worker-6, task commit `14af171`, close `badf49a`):**
- Gate met (`6ea8c2f` = committed tool() form). Probe S10 re-aligned to the committed shape; S10→S10 (checks 76-81) verified green for the FIRST time; WIP rescue `9e173d1` converted to the proper task commit (not rewritten).
- Gates measured by me: probe **80/80 PASS exit 0** (re-run after the follow-up edit — still green), pytest **451 passed + 1 known #10 warning**, ruff **F=0**.
- Baseline clarified: the probe has 80 checks; the carried "74/74" was the T3-era count (the WIP rescue added the 6 S10→S10 checks + updated the header) — no header edit needed.
- Accepted spec delta: committed `args` is a plain NAME→zod-schema object (opencode tool() convention), not a zod object — check 67 aligned to committed reality, recorded.
- Follow-up (planner-direct, pre-approved): the plugin's stale "byte-identical" header comment fixed (comment-only; the runtime directive is UNCHANGED). The extra looprunner continuation line in the recovery directive is a behavior question → filed as proposal `2026-09-12_recovery-directive-looprunner-line.md` (recommendation: keep).

**Mid-session discovery (the loop's new work):** the maintainer live-edited his draft file `proposals/maintainer/inbox_planner/draft/26-09-11_21-50.md` (uncommitted — left untouched per the draft-folder rule). It now carries THREE item specs, each "file a proposal with intended implementation" + "implicitly approved to work on it (i am away for a while)": (1) `block_transfer.ts` sandboxing + testing + usage instructions, (2) a direct-fire gauge/peek tool (observed ~15k-token saving vs the shell-out habit), (3) loop.log automation as a tool (all agents, auto folder creation). Full detail in the NAP.

**Iteration 7, in order:** 1. file the 3 draft-file proposals (ONE batched file with 3 independently-approvable parts recommended; needs fresh reads of `block_transfer.ts`, the gauge/peek core, the loop protocol). 2. standing maintainer-gated items unchanged (FST behavior batch, contradiction block, #51, the new looprunner-line proposal, Cycle-2 live acceptance at his restart/host fix).

**Proposals now awaiting his ruling (root):** FST behavior batch, contradiction block, looprunner-line (new this iteration).
