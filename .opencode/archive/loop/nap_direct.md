# NAP DIRECT — append-only detail blocks for closed direct-session sections
# (the compressed one-liner lives in the NAP Compressed archive; append only, never rewrite)

## 2026-09-14 direct session ses_f601cfc5dffe9qL2K9XDhuZziP — compressed by ses_f5f0689d9 (2026-09-14); its round-1 cross-compaction state was SUPERSEDED by round 2 (see the new NAP section)

## 2026-09-14 (direct session; ses_f601cfc5dffe9qL2K9XDhuZziP) — rebuild; today's `--comment` (meta-feedback) acknowledged; `# 02` autorun_summary re-run delegated; direct-session rework in dialogue
- **Start:** HEAD `590c498`; DIRECT session. Working tree = his live UNCOMMITTED additions (READ-only, left untouched): `priority.md` +89 (new `# 01`/`# 02`/`# 1`/`# 2` looprunner rework/`# 2` emergency compaction/`# 3` emergency overwrite + the "09-13_13-20 what is stale/handled?" block); `ideas.md` +14 (`# 4` codify knowledge gain + today's `--comment`); NEW `my_todos.md` (`--wip`; llama-swap context-shift resolved for all Qwen3.8; the looprunner stuck quote + his answers = emergency compaction + planner-may-compact-worker; the agent-folder auto-registration finding; today's FST item "my fst macro still outputting the old date format"); `loop_log.md` +1 `--INFO--` line (his Q3-MTP test run 09-13 14-31); `_overall_summary.md` untracked in the current loop folder (his test output — overwritable approved).
- **Markers (session-start grep):** 0 new `--maintainer`/`--now`/`--todo`; live = the standing SWEEP (`summary_summary.md` `--maintainer:--defer`), `--wip` (ideas.md, my_todos.md, the nap-size proposal), `--comment` ×3 (ideas.md today + 2 older in my_todos.md).
- **Priority list state:** his NEW `# 1` (prompt additions) is fully handled at HEAD (`590c498`), but that line is UNCOMMITTED (part of his +89) → no index-only-hunk removal possible until he commits the file; the committed active list (`# 2`–`# 6` + `#7`/`# 8`) has NO fully-handled line → priority.md untouched this session (the convention allows only removal of handled committed lines).
- **Today's `--comment` (ideas.md, 09-14 14-22) — acknowledged, live input to the rework:** his meta-feedback on the "preserve the folder" exchange — instructions are NOT to be read verbatim; act on the best interpretation of his INTENT; in direct sessions flag unclear/incomplete instructions FAST (not after long work with unintended-consequence output). = the direct material for the queued direct-session rework (EARLY-AMBIGUITY rule + CHAT mode).
- **`# 02` DELEGATED + LANDED + verified (this session):** raw `agent_Q4_120K` (no backend model switch, per his `# 01` note; task session `ses_f6010b5d1ffecLhI767G8be6N4`) with read-and-follow of `skill_autorun_summary.md`, target = `autorun-2026-09-13_04-27`, overwriting his test `_overall_summary.md` (approved overwritable — the test run was disposable). The launch SURVIVED (no 4th overflow data point — the overflow is intermittent, not universal). Verified by me against the file: 110 lines, proposal-grade, ALL 5 sections (Done table / Feedback trail (thorough, 8 entries) / Questions+recommendations / Queued next / Baselines+budget), session ids machine-verified by the agent, Done-table claims spot-checked vs loop log + NAP (accurate). His `# 01` critique "should have more detail" is addressed; his observation "no longer a feedback section ... ties into ideas.md # 4" stands — the run produced little feedback BECAUSE the role prompts carry no feedback step (the `skill_feedback.md` skillset + the mandatory-feedback design thread is the queued answer, tied to ideas #4 knowledge-curation concept). Committed as bookkeeping (the loop folder is the canonical record).
- **In dialogue (his items, developed together):** 1. direct-session rework (own protocol file + CHAT/DISCUSS mode + EARLY-AMBIGUITY rule + AUTO-FIRE autorun_summary at direct-session start); 2. looprunner prompt rework PROPOSAL (his `# 2`: fresh planner on launch failure instead of relaunching the same one; the loop-END protocol (planner-initiated stop, critical-error only, incl. the .git/.github change code of conduct); the AGENTS.md auto-load question); 3. HIS RULINGS on the 2 AWAITING-APPROVAL proposals (`2026-09-13_compact_memory-findings.md` item 1 = lower the self-compact trigger to ≤50-60 % as the one-line prompt edit; `2026-09-13_subagent-launch-overflow.md` = host-side check, his my_todos answer says context-shift IS active for all Qwen3.8 → the deaths are prefill-size-specific); 4. the emergency compaction toggle + emergency overwrite = ONE buildable proposal (plugin behavior change → his approval) bundling the old `# 2` open questions (usage guideline + `COMPACTION: n/m` return).
- **Gauge/nudge + reconstruction findings (this session, live-measured):** nudge ≡ gauge + my own unwritten output (turn-2 nudge 14,095 = gauge read 1 exactly; turn-3 nudge 49,395 = gauge read 2 48,776 + 619 = my post-read output landing in the DB). The post-compaction "14K" was the compacted DB state; the +34,681 jump between my two gauge reads was NOT my output — the context reconstruction (system prompt + the kept 30K/12 messages, his host-config keep) materialized in the DB mid-turn. So: the displayed post-compaction context is misleading; the effective floor ≈ system prompt + keep (~49K here). No automatic resume in the direct session (session stayed stopped until he fired a message — the looprun's manual task_id resume was the only path until now).
- **Cross-session compaction test (round 1, this session):** 1. OLD path proven broken live: `compact_memory` with an explicit worker sessionID → "no resolvable model" — `client.session.messages({path:{id}})` RPC exists on the host but yields no usable model pair for the subagent session (read-empty) → summarize NOT sent (the 590c498 planner-compacts-worker feature does not work as-is). 2. HE ADDED (untracked) `.opencode/plugin/compact_memory_test2.ts` (auto-loaded; its tool is in my toolset): `compact_memory_cross_session(sessionID, providerID, modelID)` = FIRE-AND-FORGET — `setTimeout(0)` → `client.session.summarize` with the explicit pair, `.catch(console.error)` (failures visible only in HIS terminal; opencode.log is 1 byte), returns "Compaction scheduled." unconditionally; PLUS a `session.compacted` event hook (250 ms delay → auto-prompt "Compaction completed. Continue the previous task." into the compacted session = his auto-resume experiment; his file comment: "does not restart in the session. message arrives but session ends after compaction"). 3. Test run: scaffold worker `ses_f5fe57943ffelJEfstmSseTGLA` (worker_Q4_120K, 2 turns done: scaffold + gauge×2 = 12,968), tool fired with llama-swap/Qwen3.8-27B-IQ4KT-120K → "Compaction scheduled."; ~102 s later DB check (read-only sqlite3): NO compaction-type part, NO new message, session time_updated UNCHANGED (13:29:32) → the compaction had not landed. 4. HIS REFINED HYPOTHESIS (round 2): the summarize needs THE MODEL (same one I run on — llama-swap serves one request at a time) to generate the summary, so it cannot progress while the planner is generating; compact-an-agent-by-another only works if the two can run in parallel. Nuance for the analysis: during my two bash sleeps (12 s + 90 s) the model WAS idle, so if the RPC was dispatched/queued it had ~102 s of free model time (a 13K-context summarization on the 27B may or may not fit that). THE EXPERIMENT: I end my turn now (model freed); if the compaction lands within minutes → theory confirmed (dispatch-queued or idle-dispatch); if nothing lands after several idle minutes → the dispatch itself failed (check the swallowed console.error in his terminal). On next wake: DB check for the compaction part + the hook's "Compaction completed" user message in the worker session.
- **FLAG (his live draft of `compact_memory.ts`, untouched):** the uncommitted edit has compile-level issues as it stands — `const note: modelNote = …` (a variable name used as a type), `sessionID`/`model`/`providerID` block-scoped inside the if/else but used outside it, the if-branch missing its return, and `ctx?.extra?.model` where the original reads `c?.extra?.model` (the tool call context carries extra.model).
- **Baselines (carried — no FST code touched):** probe **98/98**, smoke **23/23**, pytest **459 + 1 #10**, ruff **F=0**.

## COMPRESSED 2026-09-15 (Part-2 cleanup, ses_f5d9e86a6) — verbatim section text (no-loss rule)

## 2026-09-15 (direct session; ses_f5df3e30cffeCpv0iy41ybL6iA) — bash switch verified; compact_memory re-verified (Gemma now default compaction model); NAP-size discussion: memory folder + consolidation + session-dump designed, Part-2 cleanup APPROVED (backup condition) and delegated
- Shell: bash (git-bash 3.6 MINGW64) switch verified live (pwd/env/git/node/`workdir` w/ Windows path/FST all good) → `repo_commands.md` shell section rewritten + run/test/gauge commands in bash form (`b4a6b93`).
- compact_memory working again (his test: COMPACT line in `ctx.log` for ses_f5dedec…, target reset 0%/119K); default compaction model = Gemma (`agent.compaction.model`, opencode.jsonc) → default cross-compact needs NO flush budget (same-model case now opt-in); knowledge updated (`36f7003`).
- NAP-size proposal discussion (chat): approved design = Part 1+3 (in my prompt) + Part 2 execution. His additions, all agreed: (1) knowledge distillation at compression time → knowledge base; (2) `agent/memory/planner/` — agent-side memory that follows the planner across projects (NAP = repo-local; memory = cross-project; boundary test: "would this be useful in a DIFFERENT repo?"); two-file start `reference.md` + `notes.md`, ~100-line cap + condense rule; (3) human-memory analogy: capture (me, verbatim, multi-cue) / consolidate (SEPARATE worker, periodic, wide view — patterns + exceptions + what-went-wrong) / recall (cue-based: date/ses/git-hash/TODO#N/keywords; grep suffices for now); (4) session corpus: the opencode DB (`~/.local/share/opencode/opencode.db`) already holds EVERYTHING (130 sessions / 6,125 messages / 27,003 parts, 1.6 GB) — the gap is a READABLE dump, not capture; dump script + backfill of all 130 sessions → `.opencode/archive/sessions/` (approved, NEXT SESSION); three-lens consolidation experiment over the corpus (approved, next session, feeds the memory seed).
- NEW TODO (script-numbered, git log `232ccca` for the ID): compact_memory needs a PRE-compaction dump function of the current session (compaction destroys the fine-grained context — a post-hoc dump misses exactly the destroyed content; dump hook belongs in the compaction path: compact_memory tool pre-summarize + `experimental.session.compacting` for host auto). DEFERRED behind the dump script.
- Part-2 cleanup: spec COMMITTED in `handover_task.md` (planner_Q4_120K as text-worker; step 0 = full verbatim backup `.opencode/archive/nap_backup_2026-09-15_pre-cleanup.md` + own commit — maintainer condition; no-loss rule: excess detail appended to loop-folder `plan<N>_nap.md` / `nap_direct.md` BEFORE compressing; Standing to MEASURED baselines; DoD wc≤150). LAUNCHED. On return: verify (wc, 3-line spot-check vs backup, no-loss, baselines) then close this section.
- Context at launch: ~70% (5% gauge margin applied) — if the session ends after verification, resume from: worker handover `handover_task_to_planner.md` + this section.

## COMPRESSED 2026-09-15 (Part-2 cleanup, ses_f5d9e86a6) — verbatim section text (no-loss rule)

## 2026-09-14 (direct session; ses_f5f0689d9ffe0G0Uhvz0AIr5Vh) — cross-session compaction round 2: WORKS — his explicit-pair fix supersedes round 1; `cross_session_compaction_summary.md` handled → done/
- **Inbox (handled):** his round-2 experiment report (5 rounds; scaffold worker `ses_f5f2…` compacted cross-session via explicit `sessionID`+`providerID`+`modelID`, resumed via `task_id`): read + conclusions (below + in the reply); moved → `maintainer/done/` content-untouched (Standing rule).
- **Round 1 RESOLVED (supersedes the closed ses_f601cfc5 section — detail moved to `archive/loop/nap_direct.md`):** the earlier "no compaction landed" was a code defect, not architecture: (a) the main tool's cross-session model resolution (the `session.messages` RPC) returned no usable pair → the request was never sent; (b) `compact_memory_test2.ts` was fire-and-forget — `.catch(console.error)` hid the failure from everyone but his terminal. HIS FIX (uncommitted `compact_memory.ts`; diff = args block + resolution branch only — budget/keep/verify logic untouched): explicit `providerID`/`modelID` args → the cross branch skips the RPC and sends the pair straight to `summarize` (the schema requires both) — the `"cross session compaction detected"` string in his report = his Branch-A `modelNote`. The round-1 model-serialization hypothesis (compact-another needs parallel models) is superseded: llama-swap swaps the model SEQUENTIALLY for the compaction run (his provider-level observation: controller model unloaded → named model booted → control returned before the next delegation) — it works even with the same model, no parallelism needed.
- **Findings endorsed from his report:** (1) `modelID` picks the model that PERFORMS the compaction (decisive = the provider unload/boot; the summary template is fixed, so text cannot discriminate models — his round-4 forensics caveat stands); (2) the target session keeps its agent-model identity across compactions; (3) the post-compaction baseline is governed by `keepTokens`/`keepMessages`, not the compaction model (consistent with my round-1 reconstruction measurement: floor ≈ system prompt + keep); (4) `keep 0/0` = hard reset: context returns to the agent's natural floor (~13K measured ≈ Round-1's 13023), the summary becomes the entire inherited state — "wipe memory, keep identity" — a usable in-place reset for a stuck/reused session; (5) first-ever `ctx_gauge` on a fresh session → `CTX=notAvailable` (corroborated live by THIS session's injected ctx line); (6) flush-delegation rhythm: after a QUEUED compaction the first post-compaction delegation can be consumed by the compaction routine (his round 2), after a synchronous one it runs the task directly (rounds 3/5) → the loop resume rules should budget one flush delegation + a first-gauge baseline check after a cross-session compaction.
- **Flags on his draft (his call — nothing acted):** (a) the explicit pair is passed UNVALIDATED — an omitted pair = explicit failure now (the verified-result path catches the schema rejection; no silent false success), but a WRONG pair lets a foreign model write the summary with no warning; (b) the quant-class cap classifies the PASSED `modelID`, not the target session's model — a mismatched pair could under/over-cap that session's budget (small; foldable into the queued #2 usage guideline). His open questions stay open (summary block placement in the DB, zero-keep summary quality, nonexistent-modelID, providerID validation) — the nonexistent-modelID case is a cheap test worth running next (expect an explicit failure).
- **His `--comment` markers in the draft acknowledged** ("first try at java script … i am frustrated" + "asked another llm to help me xD") — per the marker rule: read + acknowledge, never remove, no action requested.
- **Bookkeeping (this commit):** the closed ses_f601cfc5 section compressed → `Compressed archive` (its round-1 "broken path" claim superseded); the verbatim detail appended to `archive/loop/nap_direct.md` (created).
- **Working tree (his, left untouched):** `compact_memory.ts` M (the fix), `deactivated/compact_memory_test.ts` + `deactivated/compact_memory_test2.ts` M (test files retired from the live plugin dir), untracked `deactivated/compact_memory copy.ts` (his backup), `loop_log.md` M (his 09-13 INFO line).
- **Queued NEXT (carried, unchanged):** direct-session rework; looprunner rework proposal; his rulings (findings proposal item 1 + subagent-launch-overflow); the emergency compaction/overwrite bundle; the self-fallback NAP compression (29 sections).
- **2nd exchange (this session) — his corrections/rulings + the FIX PLAN (stop line hit mid-plan; this bullet is the resume contract):**
  - **Flush-rhythm CORRECTION (his, supersedes my round-2 note above):** the flush delegation is needed ONLY when the compaction model == the initiating agent's model — llama-swap has ONE slot: a same-model cross compaction cannot start until the session switch frees the slot (it lands in the first post-dispatch delegation = the "flush"); a DIFFERENT compaction model → the provider switches on request → NO flush.
  - **ZERO-KEEP USAGE RULING (his, for the queued #2 guideline):** NEVER use keepTokens/keepMessages 0 — the compaction run still costs the full summarize time/energy; a fresh worker session gives the same result cheaper. Corrects my "hard-reset = usable reset" endorsement (the fact stands; the ruling overrides it as practice).
  - **Budget sessionID Q (his) ANSWERED:** the budget tracks the TARGET session — `budgetCount` (L467) + `recordSuccess` (L547) both use the resolved `sessionID` (Branch A = args.sessionID); the initiator's session is never incremented; the protection follows the compacted session, shared across initiator sessions.
  - **His draft's real issues (full-file read, verified):** (1) the `void request.catch(...)` block (L529-536) is broken — it destructures a PROMISE (`const {note, error} = request` → both undefined), the `return` inside the callback is a no-op, and the catch never fires on this host (resolved-404, not throw) → the 09-12 no-op bug class is BACK: "Context successfully compacted" + `recordSuccess` + the COMPACT line all fire at REQUEST time, unverified; (2) `keep` is built (L508-510) but NEVER sent in the body → his "keep arguments work" finding is UNVERIFIED (the observed floors are server-side default behavior — the server schema has no keep key); (3) Branch A bypasses `resolveModel` entirely → the cross messages-RPC model read is dead (pair-less cross stores model ""; the `model === ""` guard at L502 misses `undefined`); (4) the draft is RED against the probe: check 86 (args list now 6 keys, pinned 4), 89 (keep retry-once gone), 94 (failure no longer surfaces in the response), 97 (cross note appended to the message response), 98 (stored model "" vs the RPC-resolved one) — the 98/98 baseline was measured on the COMMITTED code.
  - **Fix design (his permission: "fix any issues" + "spec has to change"; his fire-and-forget intent PRESERVED for the case that needs it):** (a) explicit `providerID`/`modelID` = OVERRIDE; missing/incomplete → `resolveModel` fallback (self: `extra.model`; cross: messages RPC + note) — keeps his tested explicit-pair path, restores the model read; (b) SELF path = SYNCHRONOUS: `await callSummarize` + verified, the spec's byte-identical response (live-acceptance evidence: a self compaction completes within the turn — no hang risk); (c) CROSS path = fire-and-forget DISPATCH (his design — the same-model hang case): `callSummarize` in a promise chain, `recordSuccess` + `appendCompactLine` moved INTO the verified-success `.then` (increment-on-verified-success; failure → `console.error` only, NO increment); the cross response = "Compaction dispatched for <sid> (background, fire-and-forget)… budget + COMPACT line land only on verified success" (NO success claim, NO reload directive — the caller's context is untouched); missing pair normalized to "" (fixes the `undefined === ""` guard gap).
  - **WORK PLAN (resume order, one unit):** 1. Re-read: `compact_memory.ts` (full), probe S13 (L1909-2191), the spec. 2. Apply the code fix (design above). 3. Re-pin S13: check 86 (6 args), 89/92/94/97/98 (cross → dispatch contract; `await new Promise(r => setImmediate(r))` tick(s) so the async side effects land before the assertions), NEW check: explicit pair → `rec.messages` empty + body carries the explicit pair. 4. Probe GREEN (target 98/98 or 99/99 with the new check). 5. Spec `approved/2026-09-12_compact_memory_plugin.md`: Part-1 mechanics revision (explicit pair + self-sync/cross-dispatch + the response contracts) + Status note → MOVE to `implemented/` (live acceptance done — his round-2 run). 6. Knowledge `knowledge_tools.md` entries: the flush rhythm (same/different model); the keep-args status (server has no keep key; the live code sends NO keep; his finding unverified — the cheap discriminating test = does the keep-rejection 404 fire?); Gemma4-12B-Q4KXL-MTP-128K ≈ 4× compaction speed (his numbers: prefill 3400 vs 1200 t/s, generation 200 vs 47 t/s) + 131K window (reference value corrected) → route cross compactions to it (no flush + faster); the ctx_gauge fresh-session first-call `notAvailable` quirk (repo_commands.md L63-64 documents "no finished step → notAvailable" but NOT this manifestation — add one line); the zero-keep ruling. 7. Prompts: looprunner `## Resume rules (compaction-aware)` + planner `Compacted worker = resume, not relaunch` bullet — the flush rule refinement (only same-model cross needs the flush; prefer a different compaction model). 8. NAP + commit.
  - **FIX LANDED (this commit — green checkpoint):** execute() reworked per the design above (explicit pair = override + resolveModel fallback; SELF synchronous/verified byte-identical; CROSS fire-and-forget dispatch with the increment + COMPACT line moved into the verified-success callback; keep sent in the body via callSummarize — the retry-once survives; the broken void-catch block is GONE; the --comment markers kept). S13 re-pinned: 86 (6 args), 89/92/94/97/98 (dispatch contract + qcTick), NEW 100 (explicit pair: verbatim body, NO messages RPC, budget tracks target), FINGERPRINT + ses_qc_pair, header totals S13=15 / 99-99. **Probe 99/99 GREEN.** His draft is now committed code (permission granted); his other live files untouched. Doc unit — PARTIAL (stop line 98%; this commit): spec REVISED (Revision section 2026-09-14: override/self-sync/cross-dispatch/response contract/keep status) + Status → IMPLEMENTED + MOVED `approved/` → `implemented/`; knowledge `knowledge_tools.md` gains TWO entries (the cross-session contract; the flush rhythm + Gemma ~4× + 131K + zero-keep ruling). REMAINING three doc edits DONE in the post-compaction continuation (same session): (1) planner prompt "Compacted worker" bullet — the cross-dispatch fire-and-forget + flush nuance appended; (2) looprunner `## Resume rules (compaction-aware)` — same nuance added; (3) `repo_commands.md` gauge section — the 5% margin rule + the fresh-session first-call `CTX=notAvailable` quirk. **THE FIX UNIT IS COMPLETE** (code + probe 98→99 green `22268de`; spec revised + `implemented/` `e28cca1`; knowledge 2 entries; prompts 3 edits) — no further work queued in this session.
  - **Commit note:** the fix commit touches `compact_memory.ts` — HIS draft, permission granted this session ("you are allowed to fix any issues"); KEEP his `--comment` markers in the file (owner: him); his other live files (loop_log.md, the deactivated test files, `compact_memory copy.ts`) stay untouched.
  - **Post-compaction continuation (this session, ses_f5f0689d):** the "await must go" full fire-and-forget code fix (SELF AND CROSS dispatch; the `COMPACTION_RELOAD_DIRECTIVE`/`POST_COMPACTION_TRAILER` constants retired; the description updated) was still UNCOMMITTED in the working tree when the Gemma compaction happened — verified against the probe and committed as `9da6a3c` (with the probe re-pins). REGRESSION FOUND + FIXED: checks 87 + 90 had reverted to their OLD pins (v1 success line / `/compacted/i` — a concurrent editor save of his during the live edits); re-pinned: 87 (dispatch line BYTE-EXACT + `qcTick` + the budget increment lands after the tick), 90 (flat shape + dispatch line + the model-note BYTE-EXACT — the flat stub has no `messages` method → the "cross-session model read unavailable" note is part of the contract). **Probe 98/98 GREEN** (`9da6a3c`). COUNT CLARIFICATION (machine-verified, node ID-set diff vs `22268de`): the probe has **98 checks total, S13 = 15** (ids 86, 87, 87, 89-98, 99, 100 — the two "87" digits differ, EIGHT-SEVEN classifier / EIGHT-EIGHT summarize path); the commit-message "98→99" was a miscount — NO check was lost. ENV (his change, uncommitted): the shell is now **git bash** (was PowerShell 7) — the PowerShell inline-JS mangling that broke this session's `node -e` commands is gone.
- **Baselines (carried — no FST code touched):** probe **98/98** (98 checks total — see the count clarification above), smoke **23/23**, pytest **459 + 1 #10**, ruff **F=0**.

## COMPRESSED 2026-09-15 (Part-2 cleanup, ses_f5d9e86a6) — verbatim section text (no-loss rule)

## 2026-09-13 (direct session; ses_f652ea3d0ffeblu0lAc5a0w27p) — priority #01: cleanup (old #1 → past); `--comment` marker codified; skillsets built (autorun_summary + feedback)
- **Start:** HEAD `61622b2`; DIRECT session (no loop protocol — the maintainer: preserve the current autorun folder `autorun-2026-09-13_04-27/`, left untouched). Working tree carries his UNCOMMITTED live edits — `priority.md` (new `# 01`/`# 02` + `# 1`/`# 2`/`# 3` items + the "2026-09-13_13-20 ---- what is stale/handled?" block over the old #1-#8), `ideas.md` (`--wip--defer`), NEW `my_todos.md` (`--wip`; his finding: the `.opencode/agent/` folder is auto-registered as an AGENT dir — every md under it becomes a launchable agent type; llama-swap context-shift resolved). None staged except the hunk-staged `priority.md` below.
- **priority #01 cleanup (this commit):** his question "what is stale/handled?" answered — of the old #1-#8 only **# 1 (compact_memory plugin) is FULLY handled** → removed from `priority.md` as an INDEX-ONLY hunk against the HEAD blob (his uncommitted additions stay uncommitted in the working tree; verified `MM` status) + one-line reply appended to `_past_priorities.md`. Status of the REST (kept in the list, per convention): # 2 open (guideline + `COMPACTION: n/m` return + emergency-extend ruling — now EXTENDED by his new `# 2` emergency-compaction-toggle + `# 3` emergency-overwrite items); # 3 PARTIAL (nap-size Part 1 landed `81a47d9`, Part 2 one-time cleanup still queued = the self-fallback item); # 4 open (small, queued); # 5/# 6 open (bundled in the pending proposal B); # 7 open (ruling: explicit coding guidelines?); # 8 open (block_transfer test + usage guide).
- **`--comment` codified (his `# 01` line, this commit):** the planner-prompt marker table gains `--comment` = maintainer COMMENTARY on the content (not an instruction; `--maintainer` = he did/directs something) — read + acknowledge, act only on explicit requests, agents never remove it (owner: maintainer); the session-start marker-grep list gains `--comment`.
- **Skillsets (his `# 01` items, this commit):** NEW `agent/prompts/skill/` (README per the folder rule) with `skill_autorun_summary.md` (scan one autorun loop folder read-only → `_overall_summary.md` in the loop run: done / feedback trail (detailed, his feedback on the test run) / questions+decisions / queued next / budget; his `# 02` = run it on the current autorun) + `skill_feedback.md` (collect feedback from runs + `agent_feedback.md` + handovers + newest NAP section → `maintainer/feedback/<date>_feedback-run.md`; analysed-tracking = append-only `maintainer/feedback/_analysed.md`, his file — agents never edit his lines; actionable follow-ups route to `todo_inbox.md`); the looprunner prompt gains the `## End of loop (autorun_summary skill)` section (on `stop`: launch `agent_Q4_120K` with the read-and-follow instruction; -WARNING fallback). HOST QUIRK (his `my_todos.md` finding, VERIFIED against my own Task-tool agent list): every md under `.opencode/agent/` auto-registers as an agent type (`prompts/skill/skill_*` among them) — the intended launch path is still a generic Q4 agent reading the skill file (no backend model switch, his note); the auto-registration is a side effect only.
- **HIS idle question answered (planner memory folder):** yes — a small `agent/memory/planner/` reference base is useful: stable external paths (opencode.db, `~/.local/share/opencode/log/opencode.log`, host SDK locations) + host facts I otherwise re-derive per session; kept to a pointer file, NOT NAP duplication. (Not built this session — his call on the folder shape.)
- **Baselines (carried — no FST code touched):** probe **98/98**, smoke **23/23**, pytest **459 + 1 #10**, ruff **F=0**.
- **His rulings (2nd exchange, this commit):** `# 02` overwritable (test run was disposable) + the next output must be **proposal-grade formatted** (sections with titles/subtitles) — the skill file updated (this commit); `# 1` items APPROVED ("yes, include it in the prompt") — planner prompt gains planner-as-decider + may-compact-the-worker-session-before-resume (bullet in `Delegate vs. do`); looprunner gains `## Resume rules (compaction-aware)` (resume same session via task_id + post-compaction protocol; looping/repetition/corruption hints → compact the planner session via compact_memory first, then resume; when in doubt resume; -WARNING if the tool is absent). Skillset launch mechanism **DEFERRED** until the repo split (opencode vs. FST) — the folder restructure happens there; smooth loop running = his current first priority.
- **Direct-session rework (his instruction, NEXT unit — stop line, not built):** move the direct-session protocol OUT of the main planner prompt into its own prompt-folder file (keep the main prompt clean); add: an optional CHAT/DISCUSS mode (interactive sounding board over his idle thoughts in ideas.md / my_todos.md / priority.md — honest worth-judgment, sometimes forceful direction; he has the ideas + general knowledge, not the certainty of worth/implementation); an EARLY-AMBIGUITY rule (flag unclear/incomplete instructions FAST in direct sessions; act on the best interpretation of his INTENT, not the literal wording — his meta-feedback on the "preserve the folder" exchange); AUTO-FIRE the autorun_summary skill at direct-session start (the name `autorun_summary` stands — his "what would you call this" answered).
- **His questions answered (reply text, recorded here durably):** (a) memory folder x nap-size proposal = the proposal stays UNCHANGED, but the memory folder carries the stable-fact lines (external paths, host facts) that currently bloat the NAP sections — it COMPLEMENTS Part 2: the one-time cleanup should extract stable facts into the memory file (not just compress them away), and the shrunken session-start prefill is a durable mitigation for the subagent-launch overflow. (b) the `< 40k tokens` in the skill files = a self-imposed bounded-SCAN budget pegged to his 30k reference run (anti-swamp, cf. the dead text workers) — a guardrail, not a technical limit; the real mechanism is the bounded-read rule; softening the number is his call.
- **NEXT (in order):** 1. Direct-session rework (above). 2. Run the autorun_summary skill on the current autorun via a Q4 agent (approved overwritable; proposal-grade format) — the heavy scan belongs in a subagent context, not the planner's. 3. His new `# 2`/`# 2`/`# 3` items (looprunner prompt rework = proposal; emergency compaction toggle + emergency overwrite = one buildable unit bundling old # 2's open questions; the compaction control-flow live test = his side). 4. Queued iter-4 items unchanged (self-fallback NAP compression first if a loop session runs again; his rulings: findings proposal + subagent-launch-overflow; proposal B; the two bigger inbox items). Standing gated (unchanged): #11, #51, #53, #54, the SWEEP, host-side registrations.

## COMPRESSED 2026-09-15 (Part-2 cleanup, ses_f5d9e86a6) — verbatim section text (no-loss rule)

## 2026-09-13 (direct session; ses_f692e1071ffevodtnJTET0DEEs) — compact_memory live no-op bug FIXED (commit follows this section)
- **Root cause (evidence chain, all verified):** the server's `summarize`
  payload schema REQUIRES `providerID`+`modelID` (binary: the handler
  `SessionHttpApi.summarize` ~offset 100639023 reads both from the body;
  the payload struct is `{providerID, modelID, auto?}`). The old body
  (undefined / `{keep}` only) → schema rejection: HTTP 404 JSON
  `{name:"BadRequest"}` + a logged WARN "schema rejection" (6 in
  `~/.local/share/opencode/log/opencode.log` — one per fired tool, both
  test sessions); the handler NEVER ran → no compaction part/message/flag
  in the DB (`time_compacting:null`, tokens monotonically grew); and the
  host SDK client does NOT throw on the 404 (client.gen.js: non-ok → throw
  only if `throwOnError`, otherwise it resolves with the parsed error or
  undefined) → the plugin's await-no-throw = FALSE success + budget burn.
- **Fix (`.opencode/plugin/compact_memory.ts`):** the body ALWAYS carries
  the resolved model pair (self: `extra.model.{id,providerID}`; cross: the
  last message info — assistant `modelID`+`providerID`, user `model`
  object); an unresolvable pair → the request is NOT sent (clear failure,
  no increment, no COMPACT line); the resolved result is VERIFIED
  (success = the handler's boolean `true` / `{data:true}` /
  `{response.ok:true}`; a resolved 404 JSON is a failure carrying the
  server's message); the keep-retry now also triggers on
  "missing key"/`BadRequest` and VALIDATES the retry result.
- **Probe re-pinned** (S13: mock success = `true`; ctx model + cross mocks
  carry providerID; the retry 2nd body keeps the pair; the failing-RPC
  check now pins NO-SEND) + **S11 RC import REPOINTED** to
  `plugin/deactivated/context_recovery.ts` — the maintainer's cleanup
  `4b44d8c` moved the file without repointing the probe, so the probe was
  broken at HEAD (same re-point pattern as `44df939` for the v1 tool).
- **Baselines:** probe **98/98**, smoke **23/23** (smoke is stateful —
  wipe `Temp/opencode/qc_smoke/.opencode` before re-running).
- **NEXT (live acceptance):** a real fire must show the compaction part +
  the `time_compacting` flag (DB: `C:\Users\Wasiejen\.local\share\opencode\
  opencode.db`; read-only helpers in `Temp/opencode/`: sesdata.cjs,
  compaudit.cjs, binhits.cjs, binoff.cjs, logctx.cjs, probe_fix*.cjs,
  smoke_fix.cjs). Open question for him: the keep fields are currently
  IGNORED by the server (the payload schema has no keep key) — the body
  still sends them as a hedge.
- **Inbox (3 new unmarked items, UNHANDLED — queue per the ladder):**
  `maintainer/inbox_planner/analyse_helper_scripts.md`,
  `save_all_plugin_took_testing_files.md`, `snippet_collection.md`.
  `priority.md` was live-edited by him (unstaged M — leave alone).
  The nap-size proposal is ALREADY approved+committed in `4b44d8c` → its
  build is the next buildable task AFTER the live acceptance.
- His `--maintainer` instruction 2026-09-13: "continue with the work on
  the bugfix for the compact_memory. ignore standard protokol for
  compaction" (he compacts his sessions by hand).

## COMPRESSED 2026-09-15 (Part-2 cleanup, ses_f5d9e86a6) — verbatim section text (no-loss rule)

## 2026-09-12 (direct session; ses_f692e1071ffevodtnJTET0DEEs) — priority #1 BUILD DELEGATED: compact_memory plugin (approved proposal v2, Parts 1-4)
- **Start:** HEAD `b684894` (clean); direct session — his message: start on the
  compact_memory plugin (the NAP's NEXT after the approval commit). 0 live
  `--main`/`--maintainer` markers (grep hits all historical: NAP/proposal text,
  prompts, done/, the standing `--defer` SWEEP at `inbox_planner/summary_summary.md`);
  `priority.md` active list = item #1 (compact_memory, his `--wip` line — untouched);
  item #2 empty AT MY FIRST READ. Full-context session (he compacts manually) — stop-
  line discipline relaxed, early-handover still applied.
- **priority.md LIVE-EDITED MID-SESSION (his file — NOT staged, NOT touched, recorded
  for the next session):** between my first read and the spec commit the working tree
  gained: item #2 = POST-BUILD follow-ups ("when compact_memory tool works need a
  guideline for its usage" + Q: does the compact return signal the count, e.g.
  `COMPACTION: 2/3` "needed for agents to help identify their last run" + Q: can an
  emergency compaction extend the max compaction?) + a DUPLICATED item #3 (nap size
  reduction; and "ready made grep command to find maintainer attention markers in the
  planner prompt — planner often tries multiple times to discover discrepancies in the
  command formulation" — the PowerShell `rg` marker-grep struggles of THIS session are
  the living example; the working form: `rg -n --hidden --no-require-git -e '--main'
  -e '--maintainer'` + `-u`/`--no-require-git` is NOT enough for hidden dirs, `--hidden`
  is the flag that found them). His own sequencing: #2 is explicitly AFTER the build
  ("when the tool works") → the build stays approved-scope; my close summary answers
  the #2 questions with recommendations (return-value line: small approved follow-up
  if he says yes; emergency-extend + the context_recovery flat-cap question (d) below
  are rulings). The grep-helper item = queued quick planner-direct prompt fix after
  the build verifies (pre-approved meta class).
- **Baseline re-measured this session:** probe **84/84** under `node .opencode/
  plugin/probes/handover_probe.mjs` (HEAD green); pytest 459+1#10 + ruff F=0 CARRIED
  (no FST code change since the attention-keywords verify).
- **Spec COMMITTED (this commit):** `handover_task.md` = the build per the approved
  proposal `approved/2026-09-12_compact_memory_plugin.md` (Parts 1-4; worker
  `worker_Q4_120K`; dev_probe_ctx.ts shape; probe S13 APPEND-only + S10 TOOL_TS
  re-point; gates: probe 84+n green + pytest 459+1#10 + ruff F=0; diff scope =
  new plugin file + v1 retirement + probe + bookkeeping). **Spec-level gaps
  resolved planner-side (maintainer-vetoable, recorded here):** (a) RETIRE =
  `git mv tools/compact_memory.ts → plugin/deactivated/compact_memory_v1.ts`
  (the repo deactivation convention, cf. `deactivated/handover.ts`) + 2 frozen
  header lines; the probe S10 pins the retired v1 artifact at the new path
  (one-line re-point — the alternative, deleting the file, breaks S10 checks
  67-75); the v1 self-location fallback assumes its old depth (probe drives it
  with an explicit `directory` → stays green; noted in the frozen header).
  (b) COMPACT line keeps the v1 keep-defaults (30000/12) for the reporting
  fields when the keep args are absent (Part 3 "carried" reading; the BODY
  carries keep only when given per Part 1). (c) `opencode.jsonc` DO-NOT-TOUCH
  (his live registration file — its commented tools/plugins lines go stale;
  flagged here, his to update at registration). (d) OPEN QUESTION for him
  (surfaced in the close summary, NOT in the build): `context_recovery.ts`
  (the T5 emergency hook, shares the same budget FILE) keeps its FLAT cap 2
  while the tool uses the quant-class cap — does the emergency path also
  respect the quant class?
- **LAUNCH 1 DIED (worker-1 `worker_Q4_120K`, session
  `ses_f691b7802ffe2wMtz7svBy36Ya` — the dump's filename):** heavy prefill
  (the spec's read order) left him at ~70 % before writing; he underestimated
  his remaining budget by ~5k (his); ran out after writing the plugin + the
  smoke. Loop log carries only the START line (no DONE). His `compact_memory`
  was unavailable in the dead session (the v1 tool cannot compact on this host
  — the very defect this build fixes).
- **WIP RESCUED (this commit):** `.opencode/plugin/compact_memory.ts` (332
  lines — smoke-verified architecture: registration shape, summarize path,
  cross-model read, retry-once, no-client error, CPU denial, message+trailer,
  COMPACT line — ALL PASS) + the dead worker's pre-write thought dump (his
  file, committed as the bounded-read reference) + the worker's loop line.
  Smoke harness lives in the scratchpad: `Temp\opencode\qc_smoke\smoke.mjs`
  (23 checks + sandbox state).
- **SMOKE RE-RUN BY ME: 8 FAILURES** (15 pass): (a) clf IQ4 / clf Q4KM /
  clf trap / gate-3rd-4th — ONE root cause, VERIFIED BY ME: the quant rules
  lack the `i` flag (`compact_memory.ts:71-72` `/iq4|q4/`, `/iq3|q3/` miss
  uppercase `IQ4KT`; the `^cpu` rule has the flag). `clf IQ3` passes TRIVIALLY
  (default cap == q3 cap == 1). (b) retry note emits `err.message` = "null"
  instead of the Part-1 "keep not accepted by this build" wording. (c)
  `fail no increment` = smoke-harness mock bug (`spec.summarizeError is not
  a function` — the harness, not the plugin). (d) v2 schema write (model
  field empty in that case) + lenient v1 read+bump — read against the smoke
  for the exact assertions.
- **PROBE RE-VERIFIED 84/84** (HEAD green; the WIP touched no probe file).
- **HIS IDEA (dump-reference resume) — sound, adopted with discipline:**
  same pattern as the T2/T5 WIP rescues. Discipline: the new worker gets
  BOUNDED reads of the dump ONLY (grep for a question / tail range — 921 raw
  lines, no headings, never the whole file); the spec stays the contract.
  His dump tail already settled the commit strategy (checkpoint-per-unit;
  the v1 MOVE + the S10 TOOL_TS re-point in ONE commit — the move alone
  breaks S10; final commit = bookkeeping close) — recorded in the resume
  spec so the new worker does not re-deliberate it.
- **LAUNCH 2 (this session):** fresh `worker_Q4_120K` with the RESUME spec
  (replaces `handover_task.md`; leaner prefill — the WIP exists, so the
  heavy design reads are targeted-only). On return: verify against git log +
  re-measured gates (smoke 23/23, probe 84+n, pytest, ruff, the rename, the
  TOOL_TS grep), then bookkeeping commit (this NAP current + proposal →
  `implemented/` only AFTER his live acceptance per the proposal's Acceptance
  section — items 2-4 are HIS side: registration in the live opencode.jsonc
  plugins array + per-agent grants + restart + live self/cross fires).
- **NEXT after verify:** close summary to him (incl. the (d) open question +
  the stale opencode.jsonc comment lines) → then the queued loop_log-v2
  (approved) if he wants to continue.
- Baselines (carried; FST untouched): probe **84/84** (re-measured), pytest
  **459 + 1 #10**, ruff **F=0**.

## COMPRESSED 2026-09-15 (Part-2 cleanup, ses_f5d9e86a6) — verbatim section text (no-loss rule)

## 2026-09-12 (direct session; ses_f6976031bffeRa8gNNcpy5FoYj) — attention-keywords close-out; priority #1 (compact_memory quant-class budget) design grounded — awaiting his ruling
- **Start:** HEAD `6b51fe2` (clean); 0 live `--main`/`--maintainer` markers; `--wip` at
  `priority.md:28` (his live WIP item — untouched, per the `--wip` guard); `proposals/
  commented/` empty; inbox = drafts only + `summary_summary.md` (the standing SWEEP item —
  unchanged, still the loop-run side of the book per the prior entry).
- **Close-out (planner-direct, pre-approved meta, this commit):** `proposals/approved/
  2026-09-12_attention-keywords.md` → `implemented/` + Status note (task `20aff36` verified;
  residual live-triage acceptance = the FIRST LOOP ITERATION, his side). TODO untouched;
  baselines unchanged (no code touched): probe 84/84, pytest 459+1#10, ruff F=0.
- **Priority #1 (his new `priority.md` item, `--wip`) — design grounded, AWAITING HIS
  RULING:** the pending proposal `proposals/2026-09-12_compact_memory_plugin.md` (Parts
  1-3, AWAITING APPROVAL) is the base; priority #1 extends it with Part 4 = the per-session
  compaction budget differentiated by the session's model quant class (his item: Q4→3,
  Q3→1, other→1 preliminary, CPU models excluded). Verified facts (measured this session):
  - The v1 `Session` type carries NO model field (`@opencode-ai/sdk/dist/gen/types.gen.
    d.ts:465`); the model lives on MESSAGES (`UserMessage.model.{providerID,modelID}`
    L52; `AssistantMessage.modelID` L108).
  - **Model source RESOLVED by the maintainer (his `--todo` note + the live capture
     in `tools/dev/hot_loaded_tool.ts`):** the model is nested in the tool context —
     `context.extra.model.id` (e.g. `Qwen3.8-27B-IQ4KT-120K`) + `providerID` +
     `limit` (window); `context.agent` = the agent identifier (e.g.
     `agent_Q4_120K`). The earlier "NO model field" key dump listed TOP-LEVEL keys
     only (`extra` was there, nesting the model). SELF-compact reads it directly
     (no RPC). CROSS-session (`sessionID` arg — target's model NOT in context) →
     `client.session.messages({path:{id}})` → `200: Array<{info, parts}>`
     (types.gen L234) → last `info.modelID`/`info.model` → classify; RPC failure /
     no messages → default cap (1) + note. The plugin-ctx client is v1-generation
     (probe-verified: summarize=function, compact=undefined);
     `plugin/dev_probe_ctx.ts` IS the worked example of a plugin-registered tool
     (the Part 1 registration shape — `tool: { name: tool({...}) }` + captured
     `ctx.client` — verified live on this host).
  - Model names (opencode.jsonc): `Qwen3.8-27B-IQ4KT-*` (→3), `Qwen3.8-27B-IQ3KT-*` (→1),
    `Gemma4-12B-Q4K*` (→3), `CPU-*` (excluded). **ORDERING TRAP:** "Qwen3.8"/"Qwen3.5"
    contain the substring "Q3" → classify CPU FIRST, then Q4, then Q3, then default.
  - Budget store today = global `maxPerSession: 2` (`tools/compact_memory.ts:45`); Part 4
    = cap resolved at gate time from the quant class; increment-on-success + COMPACT line
    unchanged; the resolved modelID can ALSO fill the COMPACT line's best-effort model
    field (currently always empty — `context.modelId`/`context.model.id` absent per the
    key dump).
- **RULINGS LANDED (his chat, 2026-09-12, same session):** (1) **rewrite the
  proposal** → `proposals/2026-09-12_compact_memory_plugin.md` REWRITTEN as v2
  (this commit — full revision incl. Part 2 quant-class budget; the v1 text is
  superseded, git history keeps it); (2) **`CPU-` prefix exclusion CONFIRMED**
  with rationale: the small models (0.6 B vs 27 B params) are unstable at
  their size — loop very fast, bad at tool calling, slow; parallelism is the
  only upside, and testing showed tool-calling problems even as looprunner →
  cap 0. Recorded in the proposal's Rulings section.
- **APPROVED (his chat, 2026-09-12, same session):** "yes fold it in and i
  now approve it" — the `message` arg (Part 1: absent → today's directive
  byte-identical; given → message + fixed ONE-LINE reload trailer;
  cross-session resume-note bonus) folded in as the final revision; proposal
  → `proposals/approved/` with the approval line (this commit).
- **NEXT (fresh session — this one is at the stop line):** delegate the
  build — fresh `worker_Q4_120K`, spec per the approved proposal (Parts 1-4;
  `dev_probe_ctx.ts` as the shape reference; probe S-section APPEND-only;
  gates: probe green + pytest 459+1#10 + ruff F=0; diff scope = new plugin
  file + retired `tools/compact_memory.ts` + bookkeeping). Registration
  (live `opencode.jsonc` plugins array + per-agent grants) = HIS side; live
  acceptance after his restart. Then: loop_log-v2 (approved) is the queued
  next unit.
  (Q2 model source RESOLVED by his evidence — see Verified facts; `context.extra.
  model.id` self + `session.messages` cross, the loop_log-v2 "model open" note
  corrected in that proposal.)
- **Bookkeeping landed this session (committed):** knowledge entry
  (`knowledge_tools.md` — model nested in `context.extra.model`); loop_log-v2
  proposal "Open question" corrected (his approval + `--todo` lines untouched —
  his `--todo` directives for Part A: automatic population, `context.agent` for
  the agent, `context.extra.model.id` for the model, "agent replaces role" —
  recorded in-file, to be encoded at Part A spec time); TODO #52 status line
  (model field resolved + priority #1 extension noted).
- **NEXT (after his ruling on Q1/Q2):** extend the proposal with Part 4
  (classifier = an ordered rule table at the top of the plugin file,
  maintainer-editable; caps per his item: `^cpu`→0, `iq4|q4`→3, `iq3|q3`→1,
  default→1; probe pins fixture model names incl. the Q3-substring trap) →
  delegate the build (worker_Q4_120K, `dev_probe_ctx.ts` as the shape
  reference) → verify → registration his side. After that build: loop_log-v2
  (approved, Part A directives above) is the queued next unit. Standing gated,
  unchanged: #11, #51, TODO #54 (wording/placement his call), the SWEEP
  (`summary_summary.md`, loop-run side), live-triage acceptance (first loop
  iteration).
- Baselines (carried; FST code untouched this session): probe 84/84, pytest 459+1#10,
  ruff F=0.

## COMPRESSED 2026-09-15 (Part-2 cleanup, ses_f5d9e86a6) — verbatim section text (no-loss rule)

## 2026-09-12 (direct session; ses_f6a0d11ebffed36PDKoTeWxddD) — .opencode restructure, Part 1 LANDED: agent-side home; host restart required
- **Ruling (his chat, "approved as commented"):** `approved/2026-09-12_opencode-structure.md` approved; direct session ONLY (moving the prompt folder mid-loop risks config mismatch/worker death); Part 4 (2-git separation) DEFERRED per his ruling.
- **Part 1 (planner-direct, pre-approved meta + his approval):** 100% renames `system_prompts/`→`agent/prompts/`, `agent_feedback.md`→`agent/`, `handover/`→`agent/handover/`. Updated live refs: `opencode.jsonc` (8 prompt paths incl. commented block, looprunner read rule, 7 worker/agent deny pairs `.opencode/prompt_**`→`.opencode/agent/prompts/**` + NAP deny, explorer summary allow — the formerly-STALE no-slash forms now point at the real files), AGENTS.md, agents_repo.md, SCRATCH_PAD.md (NAP pointer), 4 plugin files (ctx_watchdog/deactivated-handover `HANDOVER_SPEC_PATH` now = the REAL spec path; context_recovery + compact_memory directive text; probe expectations + sandbox constants SB_SPEC/SB_MIRROR/REAL_FILES follow), moved prompts/repo-parts/knowledge-README cross-refs. History untouched (archive/, records, proposal files, NAP history, agent_feedback log, TODO.md:124 record).
- **Verified (me):** acceptance grep (`system_prompts` / `.opencode[/\\]handover` / `.opencode[/\\]agent_feedback` over live files) = **0 live hits** (all remaining = archive/records/proposal texts/plugin.log); probe **84/84** under NODE (`node .opencode/plugin/probes/handover_probe.mjs` — bun host breaks check [30] by design: bun:sqlite present, check expects its absence).
- **GATED on his host RESTART:** `opencode.jsonc` takes effect at restart — until then the running host holds the OLD paths in memory (this session is unaffected; a fresh host launched before the restart would fail prompt loads). Part 1 acceptance "one full loop iteration after the restart" is his to run.
- **Parts 2+3 DONE (`cc9c67e`):** 12 folder READMEs (≤20 lines: purpose / what /
  what-NOT — usage, not content) + `loop/` created (.gitkeep); standing rule in
  the planner prompt (new `.opencode/` sub-folder ⇒ README in the same commit);
  proposals/README reworked (location = state; proposals ARE the agent→maintainer
  channel — NO fine-grained maintainer inbox; `maintainer/` stays the reverse
  direction); `agent_readme_proposals.md` aligned with the real tree
  (`proposals/feedback/` at the root, not `maintainer/feedback/`; done-moves
  content-untouched — the old "replier: block" wording was stale).
- **Proposal moved to `implemented/`** (Status + Part 4 deferral recorded).
- **maintainer/ lift + priority.md (his chat ruling, same session):** his
  outbox is not nested under the proposals flow and not at the repo root
  (he loses overview at both) → `.opencode/proposals/maintainer/` lifted to
  `.opencode/maintainer/` (directly in his traversal area); `proposals/feedback/`
  moved in (it's his feedback-gathering place); NEW `priority.md` — his simple
  ordered task list (persistent, never to done/, agents READ-ONLY, planner
  reads it at session start = planner prompt init step 4; it orders planning,
  TODO.md stays the detail record). Two directions now = two sibling folders:
  `proposals/` = agent→maintainer, `maintainer/` = maintainer→agent. Refs
  updated: AGENTS.md contract table, planner/worker prompts,
  agent_readme_proposals/task_spec, repo_map bullet, proposals/README (now
  pure agent→maintainer + pointer), stale source pointers in TODO.md /
  compact_memory.ts / knowledge files. opencode.jsonc had NO rules on these
  paths → no new config fragility.
- Restructure complete. Remaining acceptance (his side): host restart, then
  one full loop iteration.
- **repo_overview + priority convention (his chat ruling, same session):**
  (a) root `agents_repo.md` (a 19-line pointer stub) → `.opencode/agent/
  prompts/repo/repo_overview.md` — the repo-docs family is now one folder
  (overview + parts); the name is self-evident and it reads FIRST (role-prompt
  init step 1 + top of post-compaction STEP 1). Refs updated: AGENTS.md (5),
  planner/worker/explorer prompts (command/gauge refs now point precisely at
  `repo_commands.md`), post_compaction, prompts/README, the 4 part headers,
  repo_map bullet. opencode.jsonc: 7 explicit `"agents_repo.md": "deny"`
  EDIT-rules removed — the new location is already covered by the blanket
  `.opencode/agent/prompts/**` deny (no behavior change). Probe 84/84 under
  node. (b) `priority.md` convention relaxed: an agent may only REMOVE a line
  it has FULLY handled, appending a one-line reply per item to
  `_past_priorities.md` (new sibling, append-only, he trims it); partial/
  blocked items stay in the list with status in the NAP. The convention is
  self-documented in `priority.md` itself (any agent reading it learns it).
- His uncommitted working-tree change left alone: `roles/agent_prompt_
  engineer.md` → `prompt_engineer.md` (his rename, not staged).
- **Attention-keywords: DONE + verified (2026-09-12).** Worker launch hit the
  prompts edit-deny (worker tried bash — cancelled by him, nothing landed;
  TODO #54 opened for the no-circumvent rule). Re-delegated as
  PLANNER-AS-TEXT-WORKER (`planner_Q3_120k_mtp`, instructed to ignore its
  planner prompt — the new mode is codified in the planner prompt +
  `cec9570`). Verified against git log: task commit `20aff36` (marker table
  incl. `--wip` + ladder both sections + cadence in planner prompt; `--wip`
  guard in worker prompt; verbatim-riders line in looprunner prompt); probe
  84/84 node (worker-measured), grep acceptance per spec. His mid-session
  commit `1dc86f3` (roles rename + `--defer` marker) noted.
  PENDING (next session): proposal → `implemented/` + Status note; live
  triage acceptance (marked test files) = first loop iteration; TODO #54
  worker-side rule still open (his call on wording/placement).
- Baselines (carried; FST code untouched this session): probe 84/84 (re-measured
  under node), pytest 459+1#10, ruff F=0.

## COMPRESSED 2026-09-15 (Part-2 cleanup, ses_f5d9e86a6) — verbatim section text (no-loss rule)

## 2026-09-12 (direct session; ses_f6a42cb49ffev8w5ITrdSkUpPd) — merge `fst_work`→`opencode_test` done (`ef2f05b`); inbox handled: 5 proposals filed, 6 items → done; sweep PENDING
- **Merge (his chat directive, done, verified):** `fst_work` (38 commits) merged into `opencode_test` @ `ef2f05b`, zero-loss conflict resolution (handover files take the newer fst_work state; planner-8 loop lines already back-filled in the archived loop_log; plan8 files → archive; old `.opencode/loop/` retired). Tree clean; working branch `opencode_test`.
- **Inbox (7 items + the `--todo` in maintainer/README.md) — PROPOSALS FIRST per his ruling ("do the proposal first please"):** 5 proposals filed at `proposals/` root (all awaiting his ruling): `2026-09-12_nap-size.md` (NAP_size #1; NAP measured 963 lines/~25k tokens per session start), `2026-09-12_opencode-structure.md` (NAP_size #3/#4/#5 + README --todo; #5 two-git = recommend DEFER), `2026-09-12_loop-signals.md` (restart_resume + looprunner_afk: `continue`/`fresh` words, bigger-number counter rule, `--request:` channel, `<|afk|>` tag, `|autonom|`→`|autorun|`), `2026-09-12_attention-keywords.md` (marker set + priority ladder + inbox cadence), `2026-09-12_fst-rebind-repeat.md` (rebind repeats let through; est. small-to-medium, ONE worker session). 6 inbox items moved → `maintainer/done/` with replier blocks.
- **DEFERRED (his marker):** feedback_protol_tool → TODO #53 (self-contained).
- **NEXT (in order):** 1. his rulings on the 5 proposals (he is engaged directly — expect inline). 2. THE SWEEP (`summary_summary.md`, still in inbox, `--maintainer: do this first` marker now superseded by "proposals first"): autorun_summary for `archive/loop/autorun-2026-09-11_17-23/` (172KB/35 files, one iteration per unit, compact ~90%, then the 6 older autorun folders). 3. Standing gated: #11, #51, host tool registration (block_transfer/ctx_gauge/loop_log at his restart).
- Baselines (no code touched this session): carried c9d1927 — probe 84/84, pytest 459+1#10, ruff F=0.

## COMPRESSED 2026-09-15 (Part-2 cleanup, ses_f5d9e86a6) — verbatim section text (no-loss rule)

## 2026-09-11 (same direct run, post-compaction chat segment; ses_f6fd8a0caffedqEYeUMCq0x12f) — compaction-lifecycle design agreed + proposal written
- Maintainer ran compaction experiments in this session (keep 30K tokens +
  last 12 messages; reverts to test agent memory). Key established facts:
  per-tool readout works agent-side, invisible in UI by design (ctx.log is
  the maintainer's window); no post-compaction injection or log entry
  exists in handover.ts (gap); sub-agent overflow auto-cuts the tail at the
  last tool call/thought block BEFORE compaction (no ghost residue), 4–5
  retries then clean fail; tail-cut ≡ revert ≡ handover situation (no
  observed degradation).
- Design agreed in chat (five layers: data / tool / standing trigger rule
  with nudge DELETED / single overflow-recovery path for sub-agent + direct
  / activation flag; compaction budget ≤2 per session id; directive points
  at a committed re-application file). Written out as
  `proposals/2026-09-11_compaction-lifecycle.md` — it subsumes the deferred
  nudge-delivery defect (moot) + ctx.log event markers + the custom-tool
  go/no-go (first custom tool; `2026-09-11_plugin-scope-tool-rename.md`
  item 1 to be retired on approval, rename item survives there).
- Both `--main` markers in the maintainer's draft
  `inbox_planner/draft/compact_memory/2026-09-11_13-44.md` handled
  (adapted into the proposal; markers removed, pointer left).
- NEXT: maintainer approval (recommendation: Cycle 1 now, Cycle 2 after
  re-prefill test 1); then delegate builds. Other open proposals
  (FST batch, log-profile, plugin scope, #11) unchanged.

## COMPRESSED 2026-09-15 (Part-2 cleanup, ses_f5d9e86a6) — verbatim section text (no-loss rule)

## 2026-09-11 (DIRECT planner run; ses_f6fd8a0caffedqEYeUMCq0x12f) — inbox 11-11 handled: loop.log v2 + loop/ reorg + #50 + decision proposals
- **Start state:** HEAD `b11e1b8` (maintainer PR merge + `6bcb80f` cleanup: new
  live prompts, AGENTS.md swap done, drafts → `archive/proposals/files/`,
  plan4/5 summaries relocated, `opencode.jsonc` compaction `auto:false` +
  looprunner access gating to `loop/`). Tree clean except the maintainer's
  looprunner-prompt Access-Gating tweak (adopted into the commit below).
  Baseline carried: **451 passed** / ruff F=0 / probe 63/63 (meta-only run —
  no FST code touched; NOT re-gated at the stop line).
- **Folder reorg (maintainer #2):** the 5 `archive/autorun-…/` dirs →
  `archive/loop/` (21 files, zero loss); the CURRENT looprun now lives in
  `.opencode/loop/autorun-2026-09-11_13-24/` (loop_log.md in the NEW format;
  session-id marker files RETIRED — the loop log records session ids).
- **Loop.log v2 protocol (maintainer #1):** `agent_readme_loop.md` §Loop
  folder + §Loop log rewritten: line =
  `date_time <STATUS> <role>[-<iter>] <session_id> <model> <content>`; 8-char
  statuses `START-->` / `-RETURN-` / `--INFO--` / `-WARNING` (failed
  sub-agent `context_length_exceeded` → failed session id + cause) /
  `<---DONE` (verbatim gauge `<CTX>%/<REM>K`); rollover at iteration 1
  (move current → `archive/loop/`, create new); looprunner prompt: lookup
  line = last `START-->` `planner-*` line of `loop/autorun-…/loop_log.md`;
  planner prompt: loop-folder bullet reworded (marker rule dropped).
- **Planner prompt maintainer-calls section REWORKED** (per the embedded
  `--main` instruction, marker line then removed): priority marker rule +
  grep-the-repo-for-`--main` line + autonom → proposals (≤4, overview +
  pointers + ONE recommendation). Identifier VERIFIED unambiguous (no clash
  in FST content; only third-party venv docs) → `--main`/`--maintainer` stays.
- **#50 LANDED + CLOSED** (approved in the inbox; planner-direct, explicit
  task per the maintainer-owned-parts rule): `repo_map.md` — explorer roster
  bullet → `todo_inbox.md` (planner curates); `.opencode/` module-map bullet
  now lists `system_prompts/repo/` parts + `agent_readme_*.md` + the
  `loop/`/`archive/loop/` convention (stale `proposals/files/` draft ref
  dropped). One-line record in `todo_records.md`; next ID = #51.
- **Plugin rundown (maintainer #3):** `proposals/maintainer/feedback/
  2026-09-11_plugin-status-rundown.md` — v2.8 is LIVE + production-confirmed
  (this session's own tool results carry the `(NN%/NNNK)` per-tool readout;
  `ctx.log` writing).
- **Answer to maintainer #4 (plan1_summary points still current?):**
  (1) TODO #49 spec conflict — RESOLVED by `b6dc3e7` (closed); (2) 2306#2
  compaction-detection fold-in — SUPERSEDED (compaction deactivated; the
  v2.8 re-scope in `approved/260910_plugin-compaction-detection.md` is the
  design of record; only the rename tail survives → proposal 3); (3) 2306#1
  custom tool — still OPEN → proposal 3. plan1 "Observations": 2301-rule
  still practiced (the 4 proposals below follow it); `feedback/` folder
  exists again and is now two-way (rundown written there); P01 residue in
  `approved/` — folder moves stay maintainer-side (untouched).
- **`--maintainer` instruction honored — 4 decision proposals at
  `proposals/` root (each with recommendations):**
  `2026-09-11_fst-behavior-batch-decisions.md` (#1 build / #7 behavior-wins /
  #8 union / #9 harden / #4+#6 delete),
  `2026-09-11_log-profile-rebaseline.md` (#17/#30/#35 one-shot log read,
  default SKIP + #34 doc-purge),
  `2026-09-11_plugin-scope-tool-rename.md` (2306#1 custom tool GO + rename
  with it),
  `2026-09-11_contradiction-block-decision.md` (#11 — keep OFF + reword,
  marker untouched).
- **Inbox:** `2026-09-11_11-11.md` → `maintainer/done/` content-untouched.
- **Skipped at the stop line (91 %, REM≈10k) — flagged, not done:**
  `agent_readme_proposals.md` stale lines (retired "replier: block" inbox
  convention; `proposals/files/` "draft test set" now archived;
  `feedback/` is now two-way, not read-only).
- **Friction flags (maintainer's file `opencode.jsonc`, not touched):**
  (a) worker deny pattern `.opencode/prompt_**` no longer matches the moved
  prompt location `system_prompts/agents/` → workers can currently edit
  prompts; (b) the explorer has no write access to `todo_inbox.md` nor to
  `.opencode/loop/` (its loop-log completion rides the planner's RETURN
  line — the protocol was adapted accordingly).
- **NEXT:** maintainer rulings on the 4 proposals (FST batch = the oldest
  open work); then delegate the approved builds. Next autonomous launch
  handles the loop-folder rollover per §Loop folder if it is iteration 1.
  Standing: `opencode.jsonc` uncommitted by design; baselines as carried.
