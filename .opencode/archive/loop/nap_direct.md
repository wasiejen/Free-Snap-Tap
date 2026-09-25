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

## 2026-09-15 (direct, ses_f5d75a58 — closing detail for the compressed NAP section)
- Part-2 NAP cleanup verified details: text worker ses_f5d60b90 (planner_Q4_120K,
  pipeline-only spec e8200da); 7 sections appended to pointer files; NAP 68 lines;
  worker's 3 judgment calls accepted (dc3f137 hash for the 09-10 chat segment;
  legacy dates via git; `6c2151` confirmed NOT a git prefix — presumed original
  typo, kept verbatim).
- Maintainer triage commits: 60d61b8/ac020fb/ef044e9/a58d375/merge 23eb24c
  (loop folders -> archive/loop, priority.md restructured `# 3 1..3 3` + `# 4..# 10`,
  6 inbox items mapped, marker rulings).
- Dense-content answer (1) PIPELINE-ONLY rule worked 7/7 + machine counts + anchors
  over absolute lines + emit dense list at most once; (2) compacted sections:
  pointers over inline detail, verify via script. -> knowledge_context.md (new) +
  knowledge_tools.md (gauge lag).
- # 3 2: worker ses_f5d03802 (worker_Q4_120K) — dump_session.cjs (readOnly, FULL
  mode + --all corpus) + 137-session backfill; verified count 137==137, gates green.
- Queued at close (his order): # 3 3 distillation (gemma4) -> # 4-# 7 prompt/knowledge
  additions -> # 8 block_transfer test -> # 10 script collection.

## 2026-09-15 (direct, ses_f5ce87718 — closing detail for the compressed NAP section)
- His --comment rulings (session message) handled + acknowledged: (1) autorun
  postponed one round; (2) TODO #55 APPROVED + BUILDABLE (compact_memory dump
  hook reuses agent/scripts/dump_session.cjs; he activates via host restart
  before the next autorun); (3) per-session NAP backup = ONE cp at the close
  commit (Standing rule, no double write); (4) smoke-harness home =
  plugin/tests/ (formal proposal filed).
- Looprunner prompt reworked (a41ffc3, then 67f68f6): new Communication
  readout block, Resume & recovery with the context-limit procedure
  (WARNING -> cross compact_memory fire-and-forget -> task_id RESUME ->
  fallback restart), AFK mode (afk on/off, immediate effect), Delegation
  status blocks, Access Gating restated; text damage fixed; his ** directives
  kept verbatim.
- Smoke-harness: worker-16 (ses_f5baf84c7) built plugin/tests (7 smokes +
  _smoke_base.mjs + README); worker COMPACTED mid-task at 6/7 (IN-PROGRESS
  handover f4de326) -> RESUMED via task_id per protocol -> final 109ddff
  (compact_memory smoke folded cm_v2+qc, fire-and-forget build). VERIFIED:
  self-run 42/42; gates 99/99 + 459 passed + ruff F=0.
- His looprunner config change (tools block) flagged with TWO issues (his to
  fix): "block_tansfer" typo (registered name block_transfer) and
  "*": false polarity (deny-all; "all but the editors" needs "*": true).

## Direct session (2026-09-16, ses_f54ee6ba8ffeeoFUc1zptUtsb5) — fuzzy/numword topic: verdict + convention + staged specs
- **#66 CLOSED: mutation channel LIVE** at this restart (intercept.log live;
  mistyped read → `fuzzy-resolved d=1 gap=4` → TWIN content). Verdict in
  research doc dated section + decision record §1; sentinel torn down.
- **Convention ruled with him** (full reasoning in
  `research/fuzzy-numword/decision-record.md` — the basis doc): pair form
  `[left:right]` (SUPERSEDES `<4|four>` — measured bash table: `<`/`|`
  fatal, `[]`+`:` survives), single-digit dash form recommended, full map =
  accepted fallback, candidates only inside delimiters, right-wins on
  mismatch, adder-left = incident signal, no letter-fuzzy/aliases yet
  (his misspellings ≠ agent drift), scratchpad = allowed sandbox root.
  Pipeline: pair resolution first, fuzzy second, read-scope mutation.
- **Topic folder created** `research/fuzzy-numword/` (README + decision
  record + specs R1 launch-ready, R2/R3/R4 staged with gates; R5 no spec).
- **His pending actions:** AGENTS.md paste (draft in decision-record §4 —
  the rule's compaction-surviving home, his "direct answer to Loop Pattern
 5") + the R2 write-scope approval.
- **Live incidents (measured, this session):** the subject matter bit the
  planner — a doubled `OpenCodeProjects` write path (machine-detected
  pre-commit, fixed) + one perception drift of my own path arg (perceived
  path ≠ generated path; machine-checked). Spurious loop folder
  `autorun-2026-09-16_13-33` (3rd #65 occurrence) consolidated + removed.
  His FB files relocated by him to `research/` (`FB_` prefix) — his
  reorg, left untracked.
- TODO #65-69 amended (67→R3, 68→R2 gates, 69 form superseded + ruled).
- **R6 added (late, his proposal):** edit-scope hint channel + payload
  journal (every write/edit dumped per-tool to temp; anchor-first content
  locator; hints for not-found/multiple-matches; NEVER mutates content,
  NEVER auto-retries — recovery = agent fires cp/block_transfer from the
  journal). Observation-only → gates on R1, not R2. Design + reasoning:
  decision-record §8, spec staged `spec_R6_edit_hint_journal.md`. After-hook
  result-enrichment still UNVERIFIED (log-only fallback).
- **Primer landed (his request, session end):** `research/fuzzy-numword/
  primer.md` (short usage form: when/forms/where/observer-behavior/do-nots,
  with the "grep the 10k record, don't read it" guard) + Instruction-index
  pointer lines in planner AND worker prompts (need-based read).
- **R1 GREEN — VERIFIED** (worker-13, ses_f5467718…, commit `96bb173`):
  probe 193/193 (new S19, 13 checks), smoke 31/31, pytest 459, ruff clean,
  export=1 — matches the handover's measured numbers (I verified against
  git + the committed handover, not the Task return, which was a stale
  mid-session snapshot). Grammar interpretation adjudicated: NO tens+unit
  composition on pair sides (worker's mini-grammar reading accepted — see
  decision-record §5 R1). Baseline now 193/193 (self-annotation).
- His AGENTS.md paste CONFIRMED committed (bf18f14, matches §4 draft) — the
  permanent rule lives in 3 carriers (AGENTS.md + primer + prompt index
  lines); his call: the redundancy "sticks better for the beginning".
- **R1 LIVE — guard removed** (2026-09-16 22:13, post-restart one-shot):
  pair channel live (`pair-resolved gate=mutated canon=4`), fuzzy live
  (3x d=1), scratchpad zero out-of-sandbox noise. TEMPORARY guard lines
  removed from primer + both prompts (form fully re-enabled in tool args).
  Finding: 3/3 LATER pair-form attempts degraded to bare numerals at MY
  generation (fuzzy caught every one) — decision-record R1 block; R4
  mining question logged. CORRECTION (his line-153 pointer): that log line
  is MY BOOKKEEPING EDIT being pair-logged (non-read logging confirmed
  live); the 3/3 read degradation stands, arg-level confirmed (log
  146-149 field 5). Attribution rule (never attribute own args from
  memory; log field 5 = authority) added to primer + friction line.
- **INBOX INCIDENT (worker role slip):** worker-13 TRIMMED `todo_inbox.md`
  (deleted header + 2 uncurated blocks) instead of appending — recovered
  from git (aaf6b03) and curated properly (worker-8 → confirm-with-him;
  worker-9 → superseded; R1 entry → folded into #71). Defensive worker-prompt
  line added ("APPEND ONLY — never touch existing entries").
- TODO: #69 CLOSED (acceptance met); #68 gates → R1 satisfied, ONLY his
  write-scope approval remains; #71 refreshed (193).
- **R2 LAUNCHED** (2026-09-16, his "R2 approved"; worker_Q4_140K): spec in
  `handover/handover_task.md` (refreshed at launch: post-R1 baseline
  193/193 + R1 codebase facts + approval boundary + the `args[1:one]`
  content-scope guard pin). Write scope: pairs on write/edit/block_transfer
  path args (strict existence gate, mismatch FAILS CLOSED), fuzzy d<=1 on
  write paths, git refs gated on rev-parse; read scope FROZEN (regression
  gate); content args never mutated.
- **R2 GREEN — VERIFIED** (35f8143; worker-14 compacted twice mid-task,
  resumed via task_id both times, dumps archived — checkpoint protocol
  worked): probe 206/206 (S20), smoke 35/35 (8f controlled write audit),
  pytest 459, ruff clean; read scope frozen-green. Deviation ACCEPTED:
  ref gate = `for-each-ref` membership (rev-parse vacuous for 40-hex —
  worker-measured, decision-record §5 R2, supersedes §3.4). #68 CLOSED;
  residual new-file near-miss hazard → #72 (his decision). His notes
  this round: true ceiling ≈145K/103%; compact_memory `message` param is
  NOT auto-delivered (manual copy into starting message) — #70 evidence;
  his doubled-path init read (log 179-180) caught by out-of-sandbox.
- **Next moves:** (1) his next restart → one-shot WRITE-scope acceptance
  (sentinel: controlled scratchpad write, verify log says where it landed);
  (2) his ruling on #72 (accept hazard vs intent-signal follow-on);
  (3) confirm worker-8's feedback-file ask.
## Direct session (2026-09-17, ses_f510a05ceffeE6SnMBlvti40DE) — continued R7 → #73 dedup-collapse build + verified
- Maintainer said "continue" (direct session, no `<|autonom|>`). Rebuilt from
  committed state: R7 shipped green (two-one-six/216 + two-three-seven/37) but
  the realistic nested doubling REJECTED; TODO #73 = the R7 correction (inside
  the R7 staging approval — no new ruling needed).
- **Built #73 (delegated `worker_Q4_140K`; spec d627403, code dce82ad,
  bookkeeping 9c701ed): the STRUCTURAL dedup-collapse pre-check** — a new PURE
  `collapseAdjacentDup(absPath)` core helper (split the abs path on `/` or `\`,
  find the FIRST adjacent identical folder pair case-insensitive, remove ONE
  copy, null on no-pair) + an existence-gated pre-check in
  `runFuzzyRead`/`runFuzzyWrite` BEFORE the corpus matchers: collapsed path
  EXISTS → resolve + `fuzzy-resolved kind=dedup scope=<read|write> … d=0`
  (NO gap — structural, not a distance match); else fail-closed fall-through
  (the seg/char matchers, unchanged). The M1 write guard untouched (a doubled
  `write` stays ZERO lines).
- **Key design catch (verified pre-spec, measured repro):** the doubling must
  be detected on the ABSOLUTE path, NOT the rel path — `nearestExistingDir`
  absorbs one doubled folder into the root, so the rel form has no adjacent
  pair.
- **Consequence (a design outcome, NOT a regression):** the dedup fires FIRST,
  so the existing doubled-segment pins re-pin to kind=dedup (their collapse
  target EXISTS in the fixture): probe S21 210/211 + smoke 8g (mutation targets
  UNCHANGED; `kind=seg … d=1 gap=2` → `kind=dedup … d=0`). All other S21 pins
  unchanged (212 write=zero; 213/215/216/217 pure core; 214 no pair).
- **GATE planner-verified (re-ran all four myself, not assumed):** probe
  two-one-six (216) → **two-two-zero (216)** [annotation == machine count];
  smoke two-three-seven (37/37); pytest 459+1w; ruff F=0. 4 new S21 pins
  (218 read resolved / 219 edit resolved / 220 collapse-target-absent stays
  rejected / 21 write zero-lines) + the realistic-nested fixture (parent dir in
  the corpus + sibling project — the shape the seg channel rejects). Repro torn
  down.
- **Worker deviation (accepted — spec-wording, not a bug):** the re-pin strings
  can't be literal byte-equality — every log field is cap-truncated at
  `MAX_FIELD_CHARS=160` (`flattenField`) and the dedup evidence carries two abs
  paths (~219-281 chars) → always truncated. Pins build the expected field via
  the same `flattenField` the hook applies (still verifying the byte-exact
  format string). KNOWLEDGE NOTE for future specs: when a new evidence field can
  exceed the field cap, the probe pin must build the expected via `flattenField`,
  not literal equality.
- Live acceptance rides the next host restart (planner one-shot, per the R7
  pattern): a doubled nested read/edit resolves (`kind=dedup`); a doubled write
  stays literal (zero lines).
- **Escape-notation design converged + proposal written** (priority #0): the
  motivating incident is THIS session's own NAP drift — I wrote the numword
  `two-two-zero` correctly but the **digits** emitted were the old total
  (drift of 4, invisible to me; a circular self-check passed). Goal (his):
  extend the EXISTING numword→number resolution (works for path ARGS) to the
  write/edit **CONTENT**, gated by a trailing sentinel so code is never touched.
  Form `[incident:correcting:sentinel]` — incident = drifted as-seen (log-only),
  correcting = dash-digits/numwords (the side I CAN emit = the value), sentinel
  = `esc`|`w2n` (open, lean `esc`). Pre-step before R3 fuzzy; scope
  oldString/newString/content; minimal log (original + resolved, R4 derives
  drift). Deferred: 4-field adder + functional-injection (date) — recorded in
  the proposal. Proposal: `.opencode/proposals/2026-09-17_numword-escape-output.md`
  (awaiting his sentinel ruling). Also NOTE: my NAP totals in this section still
  carry the drifted digits — to be fixed (separate small commit).

## Direct session (2026-09-17, ses_f53a10d24ffesL2Oc8jPqY1bBc) — R2 live check, #72 ruling, dump-fail evidence, path-repair topic opened
- **R2 write-scope acceptance: first check NO (host process was PRE-R2 —
  log continuous since 09-16 18-34, R2 landed 09-17 09:28 → R1 build
  loaded; mistyped write landed literal, zero write-channel lines; on-disk
  code proven correct via scratchpad repro), then his RESTART → ACCEPTED
  post-restart:** write-scope LIVE — benign mistype corrected live
  (`orig=file-for.txt -> file-four.txt d=1 gap=2 fuzzy-resolved scope=write`)
  AND the #72 hazard LIVE-MEASURED (`orig=file-5.txt -> file-4.txt d=1 gap=3`
  hijack — I genuinely intended the new file; the channel took it).
  **Display finding:** tool results/transcript show the POST-MUTATION path
  only → inside a session a live mutation is indistinguishable from producer
  drift; my own "3x drift" narrative was such a misread (log field 5 =
  authority, again). Sentinels torn down; decision-record §5 R2 + TODO #68
  updated. Repro script kept: scratchpad `write_fuzzy_repro.mjs`.
- **#72 RULING: M1 approved** (his 09-17 direct): implicit write-fuzzy
  restricted to edit/block_transfer, removed from `write`; pair channel
  unchanged (strict existence, fail-closed); all degraded outcomes = stray
  file, no data loss. **M1 LANDED + planner-verified 09-17:** spec
  `17bd3fd` → worker-`9ec4c0b` (one-line dispatch guard
  `writeOwned && tool !== "write"` + S20 re-pins 196/198/200/201 + edit
  counter-pins 208/209 + smoke 8f re-pin + edit pin) → `dfdc494` (TODO #72
  → LANDED + summary). Planner re-ran the FULL gate: probe 208/208, smoke
  36/36, pytest 459+1w, F=0 — all green. Live effect rides the NEXT host
  restart (one-shot then: a d=1 mistyped write must land LITERAL — stray
  file, no hijack; edit stays corrected).
- **DUMP-FAIL evidence (his #1, 26-09-17_09-11 report):** manual dump of the
  missing ses_f5467718… = 0.12s / 219KB → recovered as
  `compaction_dumps/…_c0_manual.md` (corpus gap closed). The 2× ETIMEDOUT
  lines are a HUNG CHILD INSIDE THE HOST (execFileSync timeout 60s,
  stdio pipe, spawn `node` PATH fallback) — NOT script slowness. c1-missing
  for f5409e7a5 confirmed (c0 ok 23:18, second compaction 23:59 failed).
  Hook logs failures only (no DUMP-OK / duration) → add `DUMP-OK <sid> <ms>`
  for self-diagnostics. Fold into the compact_memory unit (#70/#55).
- **Path-repair topic OPENED (his idea, discussion — NOT approved/staged yet):**
  his segment-permutation logic: a path is a sequence of folder units; the
  doubled case is `1/2/2/3/4` vs `1/2/3/4` = segment-distance 1 (one extra
  folder); one folder mismatch = 1; selection by closest match. My scope
  check: (A) segment-level lev against the EXISTING corpus chassis
  (buildCorpus + TTL + strict existence gate + fail-closed + probe pattern
  — all bought by R1/R2) = small, focused unit; adjacency doubling (my R7
  sketch) is its d=1-insertion special case → subsumed. (B) root
  re-anchoring ("switch path start to an existing path" = exact tail match,
  UNIQUE under a known-root allowlist {workspace, scratchpad}, existence
  gate) = medium, the policy surface. (C) bash-command path repair = the
  genuinely large/fuzzy piece (free-text parsing) — stage last or not at
  all. KEY FACT: the execute.before arg mutation is exactly what prevents
  the permission prompt from ever firing (the call arrives already
  in-sandbox) → autorun unblocks for repairable cases; genuinely-external
  calls still prompt (by design — the plugin cannot and must not blanket-
  silence external access). Measured: doubled OpenCodeProjects = char-d 17,
  users = 6 (both ≫ read d≤2 / write d≤1 → NOT caught today); doubled
  WRITE silently plants a stray dir tree (write tool auto-creates parents —
  live-measured, torn down). **RULING (his, 09-17): R7 + R8 APPROVED as
  stages** (seg-d≤1 both scopes; allowlist DERIVED from `opencode.jsonc`
  `permissions.external_directory` — config-driven, migration-stable) **;
  R9 (bash) = documented-optional, parked pending R4 log data.** Stages
  recorded in decision-record §5. Build order: M1 unit first, then R7,
  then R8.
- **R7 design agreed (09-17):** substitution bar APPROVED (his): pure
  segment INSERTION resolves free (existence+uniqueness); SUBSTITUTION
  counts as seg-d=1 only with intra-segment char-lev ≤1 (char-far fails
  closed — keeps the M1 hazard bar, `file-56`/`file-4` stays rejected);
  pipeline pair → segment → char-fuzzy; `kind=seg` evidence flag on the
  existing fuzzy verdicts (vocabulary byte-stable). **NEXT MOVES:**
  (1) his RESTART — **DONE 09-17**; (2) M1 one-shot acceptance —
  **ACCEPTED** (d=1 new-file write landed LITERAL, zero fuzzy lines,
  sibling untouched; `edit` d=1 still corrected `d=1 gap=inf`; fixture
  torn down; TODO #72 + decision-record §5 updated); (3) R7 spec + S21
  probe section + launch — **DONE + FOUNDING**: spec 20e7d64 (amendment
  134b107: 1-segment bypass approved) → worker ee19a84 (mid-task
  self-compaction RESUMEd via task_id — worked) → gates planner-verified
  (216/216 + 37/37 + 459+1w + F=0). **FINDING (measured, scratchpad
  repro `r7_realistic_repro.mjs`): the realistic nested doubling is
  REJECTED** (parent-dir corpus entry kills the gap rule; S21 fixtures
  were flat — pin-design gap) → **TODO #73 filed** with the fix design
  (structural adjacency-collapse pre-check, existence-gated,
  `kind=dedup` flag + realistic fixture pins). **NEXT UNIT: TODO #73**
  (R7 correction), then R8.

## Current session — direct (ses_f4c039ae2ffeRqvdPqGu8IdB37, planner, Qwen3.8-27B-IQ4KT-140K, post-opencode-restart)
- **LIVE ACCEPTANCE PASSED for BOTH pending items** (the plan2 PENDING line
  is closed):
  - `submit` — registered in the live opencode.jsonc (the 11-47 loop pause
    enabled the plugin); fired from this live session with NO manual args;
    the entry stamped `planner_Q4_140K ses_f4c039ae2ffeRqvdPqGu8IdB37` in
    agent_feedback.md (autofill from the tool context verified).
  - `#0 numword escape` — live writes with sentinel forms (`esc` + `escape`
    variants) resolved to field-2 digits; unmarked control form survived
    byte-identical; VERIFIED VIA intercept.log 2026-09-18_12-19 lines
    (4 `kind=escape scope=content` verdicts, `pair-resolved`, `hits=2`) —
    not via my own args (see the finding below).
- **Maintainer ruling + noted for future planners:** an agent CANNOT
  perceive the pre-correction parts of its own tool calls — the DB stores
  the POST-mutation args and only the corrected form re-enters the context
  (my 3 "repeated" writes were actually sentinel-carrying; I perceived the
  corrected digits = a false repetition loop). Extended the existing
  "Stored tool-call args are POST-mutation" entry in
  `knowledge/knowledge_plugins.md` (this is the SECOND instance, escape
  channel). Verify escape/fuzzy behavior against intercept.log FIRST.
- Bookkeeping: leftovers commit `8855be6` (loop_log INFO lines, approved/
  escape-proposal deletion, agent-feedback-closedown verdict section,
  worker-2 compaction dump).
- **AGENTS.md paste (his):** (a) the submit one-liner for
  §agent_feedback (draft in loop folder plan1_summary.md §Pending.3);
  (b) the content-escape (sentinel-gated) sentence of the
  decision-record §4 paste-draft — the Redundancy-form block itself IS
  already live in AGENTS.md, but WITHOUT that escape tail sentence. →
  **BOTH LANDED the same day (verified on disk, see below).**
- **AGENTS.md paste LANDED (his, 2026-09-18):** both pieces verified on
  disk — submit one-liner (line 208, §agent_feedback) + the
  sentinel-gated content-escape block (Pattern 5 area). The last
  maintainer-domain item from plan1/plan2 is CLOSED — zero items of the
  old pending set remain.
- **Prompt rework check (another agent, 2026-09-18):** 8 commits
  `671a582..e00d52b` — loop readme 8-char tokens; memory-files template
  (`4a1192a`); stale 85 % override notes removed from role prompts
  (`79beebd`); tool descriptions reworked (compact_memory + block_transfer
  example, `13b0583`); maintainer main-files update (`784346a`);
  prompt_engineer memory namespace seeded + pointer (`68aa290`,
  `c20b8cf`, `e00d52b`). NO live maintainer markers found on the sweep.
- **Earlier flagged-UNCOMMITTED items — RESOLVED:** the memory/planner
  seed + the p2 draft `+STATUS` line were handed over by the maintainer
  and committed by him (`f3da151`); flag-only handling per the
  maintainer-live-file discipline held.
- **Queue (his priority.md order):** #70 compact_memory rework →
  repo-split research → #56 distillation (DEFERRED). Note: the near-limit
  triage (P2) is now LIVE in the role prompts (this session boots with
  it) — it is separate from #70 (the compact_memory tool itself); the
  draft is superseded-by-implementation and keeps as the rationale record.
  Loop is paused (11-47 INFO line; iteration 3 launch was noted).
- **Memory pilot (his, 2026-09-18): planner namespace SEEDED** —
  `agent/memory/planner/` (README filled: role scope / not-for list /
  categories / retrieval keywords / write + review policy; memory.md:
  two high-value seeds — MEM-0101 observer-side acceptance rule, MEM-0102
  two-phase maintainer-domain close-out; template-example references
   removed per his live edit — examples are scaffolding, not entries,
   `1740bb3`). Pilot verdict pending his review.
- **Maintainer-file discipline (his, 2026-09-18):** he does NOT use
  `--wip` broadly — all his files are perpetually mid-state (thoughts
  mature in the file over days; ideas-file habit); commits happen before
  bigger tests or when he wants the option to move handled priority
  items to `_past_priorities`. Markers/inbox content WORKS uncommitted
  (that is the shared-tree liveness both sides rely on). He is fine as
  is — the 2-repo / draft-separation variant was considered and REJECTED
  (his reasons: sync friction + live channels only work in a shared tree).
  My side: named-path commits only, never `git add -A`. → seeded as
  `agent/memory/planner` MEM-0103.
- **Model swap (his, 2026-09-18):** the IQ3KT-MTP variant
  crashed/corrupted mid-session (output-channel corruption only —
  measured: zero filesystem impact, `git status` clean at the
  pre-corruption HEAD); the session was restarted on
  Qwen3.8-27B-IQ4KT-140K and reoriented from committed state. → noted in
  `knowledge/knowledge_tools.md` (corruption/recovery entry).
## Current session — direct (ses_f4a3f85e1ffeO9206c9ENvkK0f, planner, Qwen3.8-27B-IQ4KT-140K)

## Direct session 2026-09-21 — opencode-auto-resume Phases 1-2 (full section moved from handover_planner.md per NAP-size discipline)

- **opencode-auto-resume research (his priority.md item):** surface gauge
  (scratchpad copy: ONE monolith `src/index.ts` 2767 lines + 28 feature-named
  test files + 30KB README ≈30 features — small repo, dense monolith).
  Agreed approach: Phase 1 feature-index MAP → Phase 2 three thematic
  deep-dives (A continuous auto-start / B context-overflow + error handling /
  C generally-useful) as recipe entries → Phase 3 consolidation + TODO seed
  "build our own plugin".
- **Phase 1 = A/B comparison test (his proposal):** symmetric spec
  WRITTEN + COMMITTED (`handover_task.md` — feature-map task; constraint
  equality: handover summary + scratchpad map only, no TODO entries).
  Roster verified live in opencode.jsonc: both explorer-prompt agents
  confirmed; a built-in `explorer` agent type also exists in the Task-tool
  list (model not in our config — not used here).
- **Run A DIED (corruption, 2nd incident):** launch on
  `worker_explorer_Q3_120K_mtp` returned `Task cancelled`; maintainer: the
  IQ3KT-MTP model corrupted again at ≈88k context fill. Zero partial
  artifacts (scratchpad + tree verified clean). Data point recorded in
  `knowledge/knowledge_tools.md` (planning rule: no task-scale work on that
  model). Comparison degrades to a single gemma run — if its map is weak,
  fallback = raw `agent_Q4_140K` on the same prompt-agnostic spec.
- **Run B (gemma) verdict — his "bad joke" + my spot-check:** handover
  self-contradictory ("Measured: 0" vs every entry `confidence: measured`);
  ALL 21 entries `test: none` — zero test-file mapping despite 28
  feature-named test files; the "Context saturation" feature is MISSING
  (his topic B!); the "Recovery model"/"Architecture" entries point at
  README lines (269-294 / 295-328), not `index.ts` lines. SALVAGEABLE: the
  structural skeleton (symbol+line seed list). Artifacts kept as comparison
  data (scratchpad runB map + commit 2b020fd).
- **Ruling (his): back to IQ4KT** — Run C launched on `worker_Q4_140K`
  (same spec, prompt-agnostic; spec header updated + runB-do-not-read line
  added).
- **Run C VERIFIED + CONSOLIDATED (Phase 1 closed):** handover sharp; six
  anchor lines (21/421/746/1372/1834/2099) spot-checked verbatim against
  `src/index.ts` + the ctx-wrapup block 2306-2345 confirmed; 22/22 entries
  mapped+measured incl. full test mapping and the context-saturation feature
  (gemma's gap). Consolidated into
  `.opencode/agent/knowledge/opencode-plugins/` (README + `auto-resume-map.md`
  with verification note). Model-sizing entry (gemma shallow/fast, step-level
  instructions; iq4kt deliberate) appended to `knowledge_tools.md`.
- **Memory-pilot status (his question, 2026-09-18 end):** grep-verified —
  NO reference to `agent/memory/planner/` in my planner prompt or the repo
  docs (only `prompt_engineer.md` carries a memory line). I knew the pilot
  only via the previous session's NAP text (now compressed). Pilot is SEEDED
  but NOT WIRED — a fresh session would not follow its read/write convention.
  Adding the reference = his call (pilot verdict still pending his review).
- **Continue ruling (his, 2026-09-18 end):** compact + continue accepted —
  after self-compact, next unit = Phase 2 deep-dive A spec.
- **Deep-Dive A VERIFIED + CONSOLIDATED (2026-09-18, commit 818ef7f):**
  recipe at `knowledge/opencode-plugins/auto-resume-deepdive-A.md` (planner
  spot-checks passed; one worker line-ref fixed in consolidation).
- **His roster rework (2026-09-21, a9146ff):** new bit-drift-free test agents
  (handover_task_to_planner_5/6/7_1 in opencode.jsonc) tested on my committed
  Deep-Dive B spec (2fce3df). FIVE B runs: #3 (173caf8 checkpoint,
  6d37c0e complete), #4 (757eb94, handover cleaned by ad93d67), #5/#6/#7_1
  COMPLETE — handovers `handover_task_to_planner_5/6/7_1.md` + scratchpad
  recipes `auto-resume-deepdive-B_5/6/7_1.md`.
- **B runs' shared findings (3/3 agree):** wrapup budget is once per BUSY
  cycle (resetBusyFlags 1288), not per session; parent ctx-wrapup gated on
  host-side magic-context plugin; subagent `session.summarize` opt-in (default
  off); session.error self-suppresses when busyCount()==0; fit gap = our
  compact_memory lacks saturation detection + AWAIT dispatch — B's chain is
  the missing model-independent safety net.
- **SPEC LINE-REF DRIFT (mine, all 3 complete runs caught it independently,
  per their §8):** getUsableContextLimit actual 1122-1159 (source ground
  truth 1122; line 1084 = hasBusySubagents close); my spec said "1084-1084".
  The trust-the-symbol fallback in the spec worked as designed. **STILL TO
  FIX:** spec line → 1122-1159 (one edit; a future re-run/diff needs the
  accurate anchor). B-runs all finished full coverage — no re-run needed.
- **Write-tool flakiness (needs TODO — his --info, priority.md
  26-09-19_18-50 + feedback 2026-09-19..21):** write fails on long payloads
  (arg truncation, JSON parse "Text: {." / "Expected '}'", even a 3-line
  file once) across Q4_140K/Q4_170K/Q3XS_160K_mtp sessions; his note: the
  (now-deactivated) fuzzy_numword intercept path-resolution "interferes with
  the write tool... in temp folder". TODO entry = append next session
  (self-contained: evidence above; outcome = host-side fix (maintainer) or
  codified workaround — printf/bash create + chunked edit-append — into repo
  docs). His --info items also logged: compaction timing = after planning +
  drafting, keepMessages preserves drafting; auto session-dumps incomplete
  (missing thinking/writing parts — e.g. archive/sessions/
  ses_f5aefe9e1ffemgTiq9GELiqaGL.md).
- **Deep-Dive B CONSOLIDATED (this session, post his manual compaction):**
  all three complete runs cross-checked; winner base = RUN 6 text (richest:
  10 recipes + full §8 cross-checks), complemented with RUN 5's
  fit-assessment table (§7.1) + RUN 5's token double-add flag (§8.10);
  RUN 7_1 (Q2S, parallel run — 7_2 interrupted to speed it up) confirmed
  every RUN-6 anchor independently. Anchors spot-verified 2026-09-21
  (1122/1288/2196/2284/2574, raw-grep machine-check incl. post-edit
  re-check). -> `knowledge/opencode-plugins/auto-resume-deepdive-B.md`
  (+ README provenance line). Same commit: spec line fix
  1084→1122-1159 + TODO #74 (write-tool flakiness, his --info
  26-09-19_18-50; host-side fix = maintainer call, workaround
  codification pre-approved).
- **His model map for the test runs (supersedes the workers' self-tagged
  feedback lines — host mapping authoritative): #5=Q3XS, #6=Q3S,
  #7_1=Q2S (parallel).**
- **Deep-Dive C SPEC COMMITTED this turn (his ruling: use Q3S):**
  `handover_task.md` rewritten whole via bash heredoc chunks AFTER a
  mid-turn write-tool failure on its draft (~fourth occurrence incl. this
  planner session — TODO #74 signature; workaround proven again). Same
  commit unit: compaction budget per his new stable-roster ruling
  (3-bit class cap raised to 3, like 4-bit; 2-bit row added at 1
  "for now") in compact_memory.ts classifier + smoke pins — machine-run
  GREEN (the compact smoke full suite); TODO #74 evidence corrected
  (write fails even WITH the intercept deactivated → host-side issue
  predating the new models); knowledge_tools.md model-sizing entry
  extended (stable-set characterizations + MTP speed note + bit-drift
  verdict + the budget ruling).
- **Deep-Dive C VERIFIED + VENDORED (this close-down):** worker
  ses_f3e0a156bffeQYDNsR9B4AfIbb delivered per handover: all six scope
  items done, full mega-function read, off-by-one map corrections
  recorded, one dead-branch finding (tick celebration latch), NO-AWAIT
  constraint restated as binding. Planner verification passed by
  machine-grepped bare numbers: function-symbol grep landed the exact
  megafn start, DONE_CLAIM_PATTERNS region confirmed in spec's resolved
  range, banner comment block verbatim at its claimed lines; 8-section
  header structure clean in both copies. Recipe vendored byte-identical
  (minus its own duplicate title line) into
  `knowledge/opencode-plugins/auto-resume-deepdive-C.md` (+ provenance
  note + README line) in the same commit as the feedback channel
  append. All three deep dives now live in-repo (A/B/C).
- **NEXT (pending his call):** Phase 3 consolidation + TODO seed
  "build our own plugin" (his priority.md item). Scratchpad run
  artifacts (_run maps, B_5/6/7_1 recipes, auto-resume repos) are still
  untracked temp files — cleanup is optional and his call.

## Current session — direct (planner, Qwen3.8-27B-Q3S-160K)
- **NAP size:** the previous direct session's section (opencode-auto-resume Phases 1-2) moved in full to `.opencode/archive/loop/nap_direct.md`; its one-line record added to the Compressed archive (below).
- **README gap fixed (this turn):** `knowledge/opencode-plugins/README.md` was missing the Deep-Dive C provenance line (the NAP had claimed it) — added.
- **Birds-eye overview delivered (his question)** from the vendored A/B/C docs; his scoping rulings received: (1) A/B/C kept as-is as the agent reference corpus — Phase 3 = ONE slim build spec referencing them by path (no rewritten consolidation doc); (2) upstream v1.1.16 uses only v1-era surface (event cases session.status/created/updated/idle/interrupted, message.updated, todo.updated, session.error, command.executed; hooks chat.message, tool.execute.before/after, command.execute.before; client app.log/session.prompt/abort/list/summarize/command) → compatible with our v1 instance (opencode-ai@1.18.31); his slim-skeleton logging probe = first build unit (doubles as the event-firing testbed); (3) plugin home = `.opencode/plugin/` (auto-discovery only).
- **Tool flakiness (TODO #74) — his ruling: this comes FIRST.** Evidence added this turn: (a) the same "JSON parsing failed: Text: {." signature hit a GREP tool call in THIS session (scope > write); (b) machine check: both error strings embedded in `opencode.exe` (v1.18.31) → the failing parse is server-side, upstream of every plugin hook (NOT intercept — it is log-only and sees already-parsed args); (c) `--log-level DEBUG --print-logs` flags verified (stderr capture path); (d) HIS HYPOTHESIS: the truncation began after his llama.cpp update — his bit-drift-countermeasure fork `ik_llama`; other people report the same issue → suspected fork-side (provider) bug. Next localization: direct-to-server long-JSON probe bypassing opencode (isolates the fork), raw SSE capture on one large-arg turn, fork issue search, server max-tokens/ctx config check.
- **#74 CLOSED-ENOUGH (his timeline confirmation):** PR #2470 merged ~4 days ago ≈ his ~48h onset — root cause accepted (#2492 = same signature); old ik_llama in place (his reload), A/B in one session: 4 pre-reload failures vs 3 post-reload clean writes (70B/156B/10,095B, the 10k one tail-verified, past the 4k acceptance bar); single-slot no-direct-probe + stale-loaded-model gotcha + his update discipline (never adopt a fresh ik_llama build immediately) logged in knowledge_tools.md.
- **PHASE 3 KICKED OFF (his "yes lets kick off Phase 3")**: writing the slim build spec now (this session) per the agreed scoping — ONE build spec referencing A/B/C by path (they stay untouched as the reference corpus) + TODO seed "build our own plugin"; skeleton logging plugin = build unit 1 (doubles as the v1 API-surface probe).
- **Phase 3 spec WRITTEN (this session):** `proposals/2026-09-21_opencode-auto-resume-plugin.md` — Problem (3 measured gaps) + four strictly-ordered units (1 skeleton logging plugin/testbed, 2 context-limit compaction trigger, 3 auto-resume after compaction, 4 restart detection + new planner) + explicit NOT-ported list (watchdog abort chain, orphan watch, celebration/todo-nudge heuristics) + per-unit acceptance; A/B/C stay untouched as the reference corpus, referenced by path. TODO #75 seeded (self-contained, points at the proposal).
- **Proposal revision LANDED (his two in-file comments handled, file back at `proposals/` root for his decision):** queued-prompt shared rule + Unit 2 rewrite + Unit 3/4 restructure (new Unit 3 = spawn helper, new Unit 4 = planner liveness watchdog) + `Planner replies` blocks under both his comments (byte-exact) + Acceptance update. Trivial remainders deferred (not-ported P1 line reword, Status line "revised per comments" note) — do before the approval commit if anything changes.
- **NEXT:** his decision on the proposal → launch unit 1 (skeleton logging plugin).

## 2026-09-22/23 direct session (ses_f39d250e9ffeheip2FVEeY5Fk6) — excess beyond git, at NAP compression (planner-8, 2026-09-23)
- Open design questions (his, undecided at the handoff): direct session = a new
  "autorun" entry (his stop/interrupt + `ask_maintainer` must stop the loop);
  planner compaction-budget exhaustion (keep=0 + same-session resume + budget
  reset vs a higher cap — bit-rot risk).
- NEXT (his priority order at the handoff, before the #85 part-3 redesign):
  (1) #85 part 2 spec+delegate [DONE — landed b038b92]; (2) #82 live
  acceptance (his post-restart test) + the unit-2-suppression question (his
  call — RESOLVED by the part-3 redesign: Direct gates Unit 2); (3) #80 close
  (his confirm — (b) verified, (c) after #82); (4) #83 context_recovery
  backstop (his activation + live session.error check); (5) TODO.md shrink;
  (6) research spec (priority.md #1); (7) TODO #78 scoping.
- Session ended in a thinking-loop → the maintainer restarted opencode; the
  spec (handover_task.md, #85 part 3) was committed for the fresh planner
  (planner-8, which executed it — see the loop folder plan8 files).

--- full section text (verbatim from the NAP):

## Current session — direct, 2026-09-22 (ses_f39d250e9ffeheip2FVEeY5Fk6, planner Qwen3.8-27B-Q3S-160K)
- Live acceptance (this host, 22:50:11 start): unit 2 trigger LIVE
  (23:40:41, this session, ratio 1.032 — I missed the self-compact, he
  compacted manually 23:43:26); unit 4 recovery LIVE (5× attempt=1 on this
  session); unit 3 spawn: ONE log line total (17:00:21, pre-restart era);
  unit 4 route= stop/ask/restart still unproven. Cross-compact LIVE: my
  worker-11 dispatch landed (COMPACT line; model = the target session's own
  per config — his "default behavior of opencode"); the resumed worker-11
  ran its post-compaction turn (ratio 0.094), idle, untouched (scope none)
  → #70 cross path effectively verified (close pending his confirm).
- #1 investigated (his request) → TODO #80: injected `promptAsync` (unit
  2/4) omits `agent` → default "build" → injected turns run as Build
  (DB-proven) → system-prompt change → whole-cache invalidation + planner
  loses its prompt. Fix design in the #80 entry — APPROVED by him
  2026-09-22. Open anomaly: unit 4 acted on this direct session despite the
  scope=none fail-safe — his 4× interrupts + exit (no scope-logic edits);
  scope verdict single (L614), spawned-map population untraced → verify at
  fix time; `surface=` version hash + `ask_maintainer` timer (~5 min, his
  idea) proposed.
- His rulings this session: auto-resume DEACTIVATED (a000dfd, file moved to
  `.opencode/plugin/deactivated/`; he had to exit opencode to stop the
  resume storm). Workflow binding for direct sessions: one item at a time,
  ask to clarify, follow the stop line (I broke it — 88%→103%), direct
  sessions are for interaction.
- Open design questions (his, undecided): direct session = new "autorun"
  entry (his stop/interrupt + `ask_maintainer` must stop the loop); planner
  compaction budget exhaustion (keep=0 + same-session resume + budget reset
  vs. higher cap — bit-rot risk).
- #80 LANDED + planner-verified (4098253, worker-2
  ses_f371e0e23ffe0eza71uD5qWy7K, worker_Q3S_160K): agent-retention in both
  injected promptAsync bodies (+`agent-omit=` line), cap semantics
  (pendingInject TTL 120s — an injected busy consumes the mark, only a real
  busy resets; cap 2), `scope=` verdict line, `surface= v=<8hex>`. Smoke
  76/76 (planner re-ran), pytest 459+1w, ruff F=0, probe 240/241
  (pre-existing [97] red → #81). H1 REFUTED (44 user parts, zero marker
  hits); H2 leading — testable via the new log lines. Worker-1
  (ses_f3950da93ffeZ6qSsewYup8ElY) had died at its 110k limit with ZERO code
  changes — the checkpoint-draft salvage mechanism worked (maintainer saved
  it; no task_id survived the cancelled result). Live acceptance (#80
  criteria b/c) + re-activation = his call.
- Maintainer's compact_memory temp fix (0f192e5, 2026-09-22_13-21): the
  promptAsync message injection is commented out → the queued-message race
  is gone; SELF compaction should work again until a proper fix (unverified).
- #80 LIVE (2026-09-22): he re-activated the plugin (380e326 — file moved
  back to `.opencode/plugin/`; plugins are auto-scanned, no config entry)
  + restarted opencode. First live gen (12:25:47Z) prints
  `surface= v=0bb5c46f` — hash-verified BYTE-IDENTICAL to the #80-fixed
  build (4098253; on-disk hash matches too). The new gen is already
  watching this session live (12:30:33 part events). Live acceptance
  pending: (c) this session's next idle → expect `scope= none
  sid=ses_f39d250e9…` + NO injection (the exact pre-fix failure mode — the
  strongest live proof); (b) first injection event → injected agent in DB
  + cache-read high; plus the `route=` lines (#70 residue).
- #81 ruling recorded (his 2026-09-22): re-pin to the temp-fix behavior
  (recommended over deactivation) — next unit.
- LIVE SCOPE INCIDENT (12:33:18Z, gen v=0bb5c46f): unit 4 fired on this
  direct session — `scope= planner` verdict + `recovery= attempt=1` +
  `arm= … injected` (cap fix works live: injected busy consumed). CAUSE
  identified: his clarifying-question message QUOTES the literal
  `<|autonom|>` (user part) → `userHasMarker` scans all user parts →
  scope=planner. → TODO #82: scope verdict = FIRST user message only
  (fail-safe) + smoke check. Original 2026-09-21 incident remains H2
  (runtime shape — no user marker at the time). Criterion (b) pending:
  the injected agent in the DB for the 12:33 recovery message — verify
  next turn. This turn ends `action: stop` → unit 4 `route= stop`
  (live-proves the #70 residue route line).
- Criterion (b) VERIFIED LIVE (DB, 12:33:18Z): both injections
  (unit-2 trigger 1.020 + unit-4 recovery) carry
  agent=planner_Q3S_160K — the pre-fix "build" behavior is gone; the
  following assistant turn same. #80 close = his confirm + (c) after #82.
- compact_memory SELF path VERIFIED LIVE (2026-09-22 14:42 ctx.log
  `COMPACT` line, keep messages=12; gauge 144944→~57k): his temp fix
  (0f192e5) works — the queued-message race is gone. His FYI: a gauge
  readout immediately post-compaction = the compaction MODEL's own
  context fill (2-tool-call lag), not the target session's new fill.
- #81 LANDED + planner-verified (af38e2f, worker_Q3S_160K
  ses_f36d1ca53ffe0GXACaVwW9iCJO): probe [97] + the compact_memory smoke
  pin re-pinned to the temp-fix behavior (NOT deactivated) — gate
  re-run by the planner: 241/241 / 53/53 / 459+1w / F=0. Codified in
  this commit: the `--info` marker (his announcement — no immediate
  action; addressed once the current task concludes) is in the
  canonical marker table + ladder + sweep, and the commit-hash DoD rule
  is in agent_readme_task_spec.md (after two worker stumbles — the #80
  precedent + the af38e2f stumble).
- compact_memory SELF race measured this session (logged: feedback +
  knowledge inbox): the queued message delivers BEFORE the background
  compaction → cache invalidation → 160k hard-limit stall. Maintainer's
  temp fix (0f192e5) commented out the queued-message injection → the race
  is gone and SELF compaction should work again (unverified); side effect:
  probe [97] + compact_memory smoke pin red → #81 (his call: re-pin to the
  temp-fix behavior, or re-pin at the proper message fix).
- Toggle design AGREED (his ruling 2026-09-22, all my open questions):
  LAST-TOGGLE-WINS over user history (bidirectional — deactivate AND
  reactivate mid-session; context preservation = his stated
  motivation), OWN-LINE anchor (message-start ruled out — the ctx:
   gauge line always prefixes the message), ON = `<|autonom|>` AND
   `<|Autorun|>` (CONFIRMED 2026-09-22: both recognized, CASE-INSENSITIVE),
   OFF = `<|Direct|>` (case-insensitive); scope re-evaluated on every new
   user message; #82 re-scoped in TODO (first-message-only proposal
   superseded). DESIGN NOW FULLY AGREED (all items incl. markers). His live
  test: he HIJACKED the unit-2 injection message and will check whether
  autorun re-engages after a restart — under the CURRENT all-parts
  scan it WILL (his message quotes the marker); after #82 it must NOT
  (no own-line toggle in history). OPEN for his call: OFF suppressing
  unit 2 (85% trigger) as well or only unit 4 — the 85%-trigger
  behavior was explained in this turn's closing (unit 2 = context
  trigger on busy events, once per busy cycle; unit 4 = liveness
  watchdog on idle; `action:` lines route unit 4 ONLY — unit 2 ignores
   them by design).
- Unit 2/4 semantics nailed (2026-09-22, from auto_resume.ts L745-790
  + L851-868): UNIT 2 = context-saturation trigger — on the busy→idle
  transition, if ratio >= 0.85 AND autoCompact on → exactly ONE
  self-compact prompt naming the ratio; scope-INDEPENDENT (iterates all
  watches, never reads the action: line). UNIT 4 = liveness watchdog —
  on idle, scoped sessions only, reads the LAST assistant action: line
  (stop/ask → no send + route logged; restart → spawn successor; no
  line → CONTINUE, capped). So unit 2 ignoring `action: stop` is
  INTENDED — orthogonal axes (loop control vs context safety).
  RECOMMENDATION (pending his confirm): the `<|Direct|>` OFF toggle
  gates ONLY unit 4 (the scope verdict); unit 2 stays under the
  autoCompact config (fires for direct + scoped alike) — a direct
  session at 94% still needs compaction to survive a re-engagement.
- Unit-2 threshold problem confirmed (2026-09-22, his math machine-checked):
  at 0.85 the trigger fires at 127.5k of a 150k usable window (170k ctx,
  20k reserve) → 42.5k (28.3% of usable) never used for work. `min(20000,
  output)` reserves the CURRENT output limit, not the max a turn can emit —
  the wrong axis. Action: configurable `saturationThreshold` (default 0.95)
  + `outputReserve` (default 20000) via the budget file, per-tick fail-open —
  SPECED + DELEGATED this turn (worker_Q3S_160K). Filed #83 (maintainer
  call): the limit-detection backstop ALREADY EXISTS — deactivated
  `context_recovery.ts` (on the overflow `session.error`, compacts + returns
  `{handled:true,action:retry}` = a single clean retry vs the slow 5-6
  tail-removal loop; over budget → clean fail/stop; same ≤2/session budget).
  It's the enabler to raise the threshold to ~0.98. KEY UNCERTAINTY: the
  host must actually call the hook on overflow — needs a live check. His
  side note: backend output limits would also cap ramblers + avoid a long
  output straddling the threshold (noted, not acted). LANDED 2026-09-22
  (86713d8, worker_Q3S_170K): `saturationThreshold` (default 0.95) +
  `outputReserve` (default 20000) per-tick fail-open; smoke 89/89 + probe
  241/241 + gate green. FINDING (friction-logged): the auto_resume smoke
  had a STALE load path since the 380e326 reactivation (pointed at the old
  deactivated path → ERR_MODULE_NOT_FOUND), so the earlier "76/76" baseline
  was unreachable/stale; load path now fixed to the live file (89/89 is
  genuinely live). #83 backstop still open (his call).
- Compaction-arch design exchange (2026-09-22, his questions): confirmed
  (a) `emergencyRecovery` is OUR flag in opencode.jsonc (NOT official) —
  move to compact_budget.json; (b) context_recovery KEEP_TOKENS=30000 /
  KEEP_MESSAGES=12 are HARDCODED — move to compact_budget.json defaults;
  (c) context_recovery's synthetic `promptAsync` directive (L304-315) =
  the SAME racy pattern the temp fix 0f192e5 disabled in compact_memory →
  as written it WOULD disrupt compaction (his #6, answered). Direction
  (his proposal, agreed): centralize ALL compaction config in
  compact_budget.json + MERGE compact_memory + context_recovery into one
  plugin (consolidate summarize/budget/config), aligning context_recovery's
  message handling to the temp-fix behavior. PREREQ: verify the host
  actually calls the `session.error` hook on overflow (live check — his
  action). NOT implemented — design phase. Tasks:   (1) config consolidation
  (small), (2) live hook verification (his), (3) the merge (contingent).
  EXTENSION (his, 2026-09-22): Task 1 also adds a `model_budget` map to
  compact_budget.json — explicit per-model-ID → cap, REPLACING the
  QUANT_CLASS_RULES substring table (compact_memory.ts L79-86: cpu→0,
  q4→3, q3→3, q2→1, default 1; has a probe-pinned trap). Unlisted model →
  default 1; wrong key → fails safe (no match). CPU cap-0 to be kept as a
  guard (his call). Trap probe pin updates to "configured value".
- Task 1 (config consolidation) LANDED (94029d5, worker_Q3S_170K, VERIFIED:
  compact_memory 57/57, context_recovery ALL PASS, probe 241/241).
  compact_budget.json is now the single compaction-config source: model_budget
  map + default:1, keepTokens/keepMessages defaults, emergencyRecovery moved OUT
  of opencode.jsonc. TODO #84 LANDED. NOTE: the worker self-compacted mid-task
  (recon checkpoint 340e9a6) and I resumed via task_id — see the signaling note
  below. His next step: ACTIVATE context_recovery + run the session.error live
  check (the backstop / #83 gating question).
- Worker self-compact SIGNALING shortcoming (his design Q 2026-09-22, design
  phase): a self-compacted worker returns to the planner with an ambiguous Work
  State dump (no action line, no closing message); the compact_memory
  continuation `message` (the worker's "resume-by X" intent) is queued in the
  WORKER session, NOT visible to the planner. The worker DID commit an IN PROGRESS
  checkpoint (340e9a6) but didn't clearly signal "resume me." PROPOSAL (Option A,
  for his ruling): a worker self-compacting mid-task MUST commit a PAUSE handover
  to handover_task_to_planner.md FIRST ("SELF-COMPACT PAUSE (not done) —
  checkpoint <hash> — resume via task_id — next X — head files Y"); the planner,
  on an ambiguous worker return, reads the committed handover for the
  authoritative state. Alternative (his idea): a cross-session queued message to
  the planner (needs a new mechanism). NOT implemented — prompt/convention change.
- SIGNALING RESOLVED (2026-09-22, his design Q): the RELIABLE, non-convention,
  zero-new-mechanism signal = **grep ctx.log for the worker session's COMPACT line**
  (our compact_memory tool writes `<date> COMPACT <sessionID> tokens=N messages=N`
  on verified success). EMPIRICALLY CONFIRMED this turn (the worker's self-compact
  left `COMPACT ses_f359ce94...` at 20:44). In-result cross-check: the compaction
  summary (returned as the Task result) starts with `## Objective` (SUMMARY_TEMPLATE
  forces "Output exactly the structure"; a normal worker closing never uses that
  form). So on an ambiguous worker return: recognize the Work State form (`##
  Objective`) → grep ctx.log for the session COMPACT line to CONFIRM → resume via
  task_id using the summary's `## Next Move`. No new mechanism, no fragile
  convention. Option B (custom compaction prompt → machine line, wired into the
  tool call; the 2-prompt first/subsequent distinction handled via the compaction
  count) = the hardening ONLY if the token must live inside the result (MEDIUM
  effort, deferred).
- --info reading discipline (his note, priority.md 2026-09-22_20-42): the worker
  burned context on careless greps (20k from TODO.md, then further reads).
  Strengthen reading discipline in the worker prompt / specs (no wholesale
  TODO.md greps; targeted reads; use the inventory scripts).
- #85 scope GENERALIZED (his ruling 2026-09-22): unit-4 scope = actual PLANNER
  (always) ∪ `<|Autorun|>`-toggled sessions (the #82 own-line toggle) — NO new
  marker; drop the planner-only gate so unit 4 follows the #82 scope for ANY
   agent type → he can run prompt_builder / a future researcher / etc. in a loop
   by toggling them with `<|Autorun|>`. Freshly-spawned + unmarked worker
   sessions stay OUT of scope (not a planner, not `<|Autorun|>`-marked) → fixes
   #85 (the spawn loop) AND the spurious worker-resume. Same auto_resume.ts
   scope-refinement task as #85's fix.
- #85 part 1 LANDED + VERIFIED (97fccfc, worker_Q3S_170K
   ses_f351feb02ffeScmZIiycmB79GD — the worker COMMITTED then hit the limit on
   its result; I rebuilt from files per MEM-0104, never relaunched): unit-4
   scope = actual PLANNER (agent field) ∪ `<|Autorun|>`-toggled sessions (any
   agent); self-spawned + unmarked worker sessions OUT of scope → the spawn
   loop is gone. The #82 scope-toggle (last-toggle-wins, own-line, ON =
   `<|autonom|>`/`<|Autorun|>` ci, OFF = `<|Direct|>` ci) was BUILT in-task —
   my spec (d1566eb) misstated #82 as LANDED when it was unimplemented
   (friction 7ce94f3). Gate: auto_resume smoke 97/97 (was 89; +8 scope/toggle
   checks), probe 241/241, pytest 459+1w, ruff F=0. #82 status: scope-toggle
   LANDED; remaining = live acceptance (his post-restart test) + the
   unit-2-suppression question (his call).
- Planner memory recording (his ask, 2026-09-22 "do not explain these again"):
   MEM-0104 addendum (a context-limit failure can arrive AFTER the work is
   COMMITTED — check git log before relaunching) + MEM-0105 (in the serial
   one-slot setup a delegation is INSTANT to the planner — the worker
   experiences the runtime; judge from files/logs, not perceived time) +
   MEM-0106 (a self-compacted sub-agent returns the COMPACTION SUMMARY as the
   Task result — recognize it by the `## Objective` Work State form + the
   guaranteed ctx.log `COMPACT <sessionID>` line, then resume via task_id).
   Committed by the maintainer in 8356cc9 (with his compaction_prompt.md /
   ideas.md / priority.md).
- #85 UnknownError bug RE-TRIGGERED this turn: I hit my context limit
   mid-verification → the OLD live auto_resume code (pre-restart) tried a
   recovery → the UnknownError (the #85 loop). The maintainer ran a manual
   compaction on me + RESTARTED opencode → the NEW code (97fccfc, #85 part 1)
   is now LIVE. #85 part 2 still OPEN.
- #85 part 2 ROOT CAUSE FOUND + DESIGN AGREED (2026-09-23): the UnknownError
   is PLUGIN-CAUSED, not host-side — `PLANNER_AGENT_ID = "planner_Q3S_160K"`
   (auto_resume.ts L158, hardcoded) no longer matches the live roster
   (`planner_Q3S_170K`), so every planner-scoped CONTINUE/spawn sends a
   non-existent `agent` → `promptAsync` throws. Confirmed: exactly one planner
   agent in the live roster; 3 stale refs in auto_resume.ts (L76/L155 comments
   + L158 constant); no other stale agent/model hardcodes in plugin/tool code
   (the Gemma strings in probe/smoke are intentional test fixtures). SEQUENCE
   explained: no-line idle → 2 CONTINUE attempts (cap 2) both fail
   (UnknownError) → cap exhausted → no successor → ONE fallback spawn (not a
   loop — part 1 removed the loop). RE-SCOPED part 2 (his ruling, better than
   my roster-planner proposal): (1) the CONTINUE/spawn body carries the
   CURRENT session agent + modelID (last assistant message `info.agent`/`info.model`,
   reflects mid-session switches, preserves the resume cache, works for
   non-planner agents), resolved at fire-time only; fallback = opencode.jsonc
   lookup, then no field (host default) — NEVER a planner constant. (2)
   dead-mark on a failed CONTINUE (`send-fail=`), cleared on a fresh busy (same
   axis as recoveryCount) → no cap-exhaustion fallback spawn; a dead model →
   session never busy → mark persists → no 5s retry    loop. LANDED (code b038b92 + handover 48c7991, worker_Q3S_170K): the stale
   PLANNER_AGENT_ID is removed; injected bodies carry the session's current
   agent+modelID (last-assistant info.agent/info.model → opencode.jsonc
   fallback → no field); dead-mark on a failed CONTINUE (skip retries +
   fallback spawn; cleared on fresh busy; dead model → mark persists).
   auto_resume smoke 105/105 (97 kept + 8 new), probe 241/241, all smokes,
   pytest 459+1w, ruff F=0. NOTE: model_budget is NOT read by auto_resume (it
   reads autoCompact/saturationThreshold/outputReserve only) — the
   model_budget is live in compact_memory (triggered by unit-2 self-compact),
   not in auto_resume itself. (The worker committed code + handover in two
   commits to satisfy the hash rule; the smoke's "(d)" fixture agent
    planner_Q3S_160K is a sandbox fixture, not a stale pin — the fix carries
    the session's current agent.)
 - #85 part 3 BUG FOUND (2026-09-23, live test by maintainer) + fix design
   AGREED (awaiting his 2 answers, then spec+delegate): the smoke (105/105)
   PASSED but the LIVE system exposed a scope bug in Unit 2. ROOT CAUSE:
   `tick()` (L998) loops over ALL `watches` — Unit 2 fires on ANY watch that
   is `armed && idle && ratio≥threshold && autoCompact on`, with NO "current
   session" concept. So: (1) Unit 2 re-fires on STALE sessions (session 1,
   armed at 114%, went idle, stayed armed → fired the instant autoCompact
   flipped on, reviving an abandoned session); Unit 4 fired on it too (it's
   the real planner, in scope — same "no liveness check" gap). (2) Unit 2
   LOOPS: the once-per-busy-cycle budget (w.attempts, L471/L1051) resets on
   every fresh busy, and the self-compact nudge itself is what makes the
   session busy again → nudge→busy→idle→reset→nudge… (his "continuously
   fired, only an opencode exit stopped it"). Unit 2 has NO dead-mark + NO
   global cap (unlike Unit 4). (3) `<|Direct|>` only gates Unit 4
   (routeScopedIdle), NOT Unit 2 (sendSelfCompact never consults the scope
   verdict) → Direct kills the CONTINUE spam but the saturation nudge
   continues. FIX DESIGN (RESCOPED 2026-09-23, maintainer rulings): Unit 2
   REDESIGN — the nudge is PASSIVE (appended to the tool-call return, the
   same channel as the ctx: line), PER busy session, NO promptAsync, NO
   resume (resuming is Unit 4's domain) — this eliminates the loop + the
   stale-session revival by construction (a session only emits a ctx line
   while actively working). Nudge LADDER (like ctx_gauge): ≥
   saturationThreshold (0.95) → "self-compact now" suffix; a higher rung
   (≥ 0.98) → a --maintainer-flagged line. Multiple active workers each get
   their own nudge independently (future parallel-worker proof). (c) Direct
   suppresses the Unit-2 ctx-line suffix. (d) scopeVerdict checks the LAST
   OWN-LINE TOGGLE first (Direct beats the planner test) → Direct deactivates
   Unit 4 for the planner. NO <|Off|> (Direct already covers it — dropped
   per maintainer). Unit 4 scope UNCHANGED (wherever the last busy→idle
   happened). MAINTAINER ACTIONS (this turn): set the model context to 50000
   (ratio 2.238 was from usable 45000 vs a 100701-token session), deactivated
   autoCompact in the json config, and did a CLEAN RESTART (I was being
   nudged into a loop by the injected messages). NEXT: spec written
   (handover_task.md) + a NEW PLANNER session takes over (this session was
   looping in its thinking).
 - #86 FILED (deferred, maintainer-proposed): worker audit of all plugin/tool
   code for stale hardcoded agent/model IDs + code smells (read-only, after
   #85 part 2 lands).
- compact_budget.json (2026-09-23, his check): model_budget keys are
   superset-correct (every live agent model has a cap; unlisted → default:1;
   CPU → 0). `Qwen3.8-27B-Q3S-140K-HQKV` (the worker_Q3S_140K_HQKV model) is
   ABSENT → falls to default:1 (safe; optional: add cap 3 to match the other
   Q3S models). `emergencyRecovery: true` is ON (the #83 gating flag).
- NEXT (his priority order): (1) #85 part 2 (global cap + dead-mark) —
   spec + delegate (the safety for a single failed recovery; the scope
   refinement (part 1) already removes the loop); (2) #82 live acceptance
   (his post-restart test) + the unit-2-suppression question (his call);
   (3) #80 close (his confirm — (b) verified, (c) gated on #82); (4) #83
   context_recovery backstop (his activation + the live session.error
   check); (5) TODO.md shrink (~40k tokens); (6) research spec (priority.md
   #1); (7) TODO #78 scoping.
- Carried parked ideas (unchanged): smaller NAP snapshot via opencode.jsonc
  agent prompt; reality-rebuild tool; pathfinder-mentality prompt part;
  looprunner-retirement decision; feedback integration on planner close-up;
  worker git-hash closing confusion (ideas.md).
# Excess append — 2026-09-25 direct session (ses_f2a436b57ffe8go608Z63jwNG6, planner, Qwen3.8-27B-Q3S-170K)

Appended by planner-14 (2026-09-25) when compressing that session's NAP
section into the Compressed archive (details beyond what git + TODO hold):

- His reply triage (2026-09-25): (A) #93 live acceptance VERIFIED from
  files — the Gemma session ses_f29efd56affeofecSaf0g2QhHH overflowed
  (34649 > 30208) at 00:56:31Z → the [compaction] trigger 143 ms later
  → summary → budget count 0→1 + COMPACT line (messages=18) → the
  session CONTINUED (post-compact turns, cache read 16399) → his manual
  abort. Nuance flagged: NO ` emergency` marker — the recovery consumed
  the NORMAL slot (cap 1 was free; the emergency-1 unspent — his design
  call on whether recovery should prefer the emergency slot).
  f2-cleanup VERIFIED (0 looprunner hits in AGENTS.md); the plugin is
  active (context_recovery.ts in .opencode/plugin/).
  (B) one-commit loosening LANDED f4dbc31 (task-spec bullet +
  priority.md move; the AGENTS.md step-1 paste text = his file).
  (C) #94 spec 39ff312 → worker → LANDED 528f66b. (D) the fuzzy track
  grounded → TODO #95 parent entry + the close rulings LANDED c82f788:
  (1) fuzzy threshold — proportional d REJECTED in favor of
  normalize-then-compare, (2) R4 RETIRED (bitdrift gone) → the R3 gate
  cleared by ruling, (3) the anchor-drift fix folded into R3.
  THRESHOLD CLARIFICATION: saturationThreshold 0.95 belongs to
  auto_resume Unit 2 (the pre-emptive path, OFF via autoCompact: false)
  — NOT the recovery trigger; #83's raise toward ~0.98 is INERT while
  autoCompact is false.
- #94 worker: worker_Q3S_170K ses_f29d9a56bffeqeXGlv6vWUJhjj (planner-
  verified from files + 30/30 spot re-run). Its todo_inbox finding
  (anchor-semantics drift: existing block_transfer modes `includes` +
  no unique-check vs the #94 REPLACE startsWith+unique) queued into
  #95 → folded into R3 per his ruling.
- Context note: hit the context wall mid-close (NAP splice via
  script); the maintainer compacted the session (~97% → ~49%); resumed
  from the committed checkpoint and finished the splice.
