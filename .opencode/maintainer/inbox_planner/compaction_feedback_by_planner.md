Short version, from what my prompt actually says:
What compaction is (per my prompt):
- "Compaction is NOT a restart (clarity, 2026-09-15): it reduces OLD history only — the recent messages stay INTACT and a summary of the dropped head is auto-created; on resume you re-read only the head files" — so it's a trim, not a reset.
- Two paths: SELF (my own session ends after, I resume from committed files) and CROSS (named session, fire-and-forget, "a failed dispatch burns NO budget").
When I use it — my prompt's thresholds:
- ~80%: near-limit triage — if finishing the current work needs more than ~10 tool calls, "stop at the last verified checkpoint and fire compact_memory INSTEAD of starting the unit."
- ~90% (stop line): "if more than ~6 calls remain, close and compact NOW"; otherwise emergency handover → commit → self-compact; "compaction ENABLES further work, it does not end it."
- 95%: commit + self-compact, and "DO NOT DELIBERATE while budget remains — deliberation burns the budget that funds the compaction."
- Early (≥70%): I don't compact yet — I just write a committed handover first, because "a committed handover at 70 % beats an emergency one at a 90 %."
My actual view / the judgment layer:
- I treat the gauge as a lower bound ("readout LAGS true usage by ≈2 tool calls") — so the real trigger is "can the next unit finish before the line," not the raw number.
- The compaction message + committed files matter: a good handover before compaction is what makes the post-compaction resume cheap, since I "re-read only the head files the post-compaction protocol names."
- For workers: compact before resuming via task_id, and dump the session first (dump → compact → resume), so the corpus survives the summary.
So in one sentence: I compact not at a fixed number but at the first honest "this unit won't fit before the stop line" estimate — with committed state as the safety net, and I'd rather over-compact early than die mid-unit.
One tension I notice in my own prompt, worth surfacing: the stop line is 90% but the near-limit triage starts at 80% with a ~10-call estimate — that middle band is where most of the judgment actually lives, and the estimate "is optimistic by construction," so I lean to compacting early there.
▣  Planner_Q3S_170K · Qwen3.8-27B-Q3S · 14.8s
ctx: SESSION=ses_f2c4fb315ffeM2SaIyahfFSrrx CTX=23274 (13%) REM=146726

good. what question would u ask to clarify unclear instructions pertaining compaction?
16:05
+ Thought: 12.2s
Good questions, honestly — here's the shortlist I'd ask, in priority order:
1. Self-compaction message relay. My prompt says the message param is "currently not working" and in the loop I should write it into my stop message for relay. But in a direct session (like this one, no looprunner) — who relays it, and how do I even resume myself? Is the expectation that I just... stop, and you re-engage me manually? That's the biggest gap.
2. My actual budget. The tool reads a budget map with a default for unlisted models — but I don't know my number or how many self-compactions I've left. If the budget is low, the whole "compact early" strategy shifts to "compact only once, deliberately." Can I see it, or should you just tell me?
3. The server-side floor. My prompt says to plan with keepMessages=X to keep my recent work, but the tool description says this build's server ignores keep fields — the floor is server-side. So which is it? If the server decides how much I keep, I should stop planning around keepMessages and instead rely more on committed handover files as the safety net.
4. The ~10-call / ~6-call thresholds. They're marked "starting values, calibrate from measured loopruns" — but I don't see those measurements anywhere in my standing context. Do you have looprun data I should be calibrating against, or are they just placeholders I improvise on?
5. Dump-before-compact for my own session. For workers the protocol is explicit (dump → compact → resume). For myself at 90%, the prompt says "dump your own session first" — but does that mean a full dump_session.cjs run, or is the Work State dump form enough? The distinction matters for how much fine-grained detail survives.
The meta-question behind all of them: compaction is a one-way door in direct sessions (no auto-resume), so the real question is how much I should trust the summary + committed files versus the actual kept messages — and right now that trust level is defined by a number I can't see and a field that may be ignored. That's the one I'd nail down first.

--comment
1. yes that needs fixing - i wrote it down and will be fixed - the message will be relayed as the first message on resume with additional short instructions on post compaction protokol 
2. will be added ad indirect information as additon to the ctx_gauge, flag it distincly as e.g. 1 compaction left (budget threshold is unknown to the model - does not need the info)

3. tool description needs fixing - wrote it down 
 - keepMessages and keepToken work so it is a stale description
4. mention of starting values will be removed. act on it as if they are the calibrated instruction
5. also stale - a dump is created automatically on self or cross compact

--maintainer: keepTokens need to be set as default 0 and not be accessiable via the compact tool: whenever keepToken is != 0 keepMessages will be ignored entirely!

## Consolidated change list — the trusted compaction system (planner, 2026-09-24, grounded in files)

Grounded status: opencode.json compaction block = tokens off + messages 18 (the
tokens-override rule is commented in-file); `agent.compaction.model` commented out (=
same-model summarizer); compact_budget.json (temp/) = keepTokens 0, keepMessages 18,
emergencyRecovery true, model_budget (planner model cap 5). Live plugin path = v1
`client.session.summarize` — keep fields reach the server ONLY via the tool ARGS (no
args → server default 18); the budget file's keep values currently feed only the COMPACT
log line.

1. **keepTokens: default 0, inaccessible via the tool** (his --maintainer item = top item)
   - compact_memory.ts: L87 `DEFAULT_KEEP_TOKENS = 30_000` → 0/remove; L713 drop the
     keepTokens tool arg; L803 drop `keep.tokens`; L802-805 send `keep.messages` only
     (args ?? cfg).
   - context_recovery.ts (live): the recovery keepTokens default → 0; drop the keep
     body's `tokens:` field (deactivated copy L274) — rides the #93 event-hook port.
   - compact_budget.json: key already 0 — can drop the key once the plugin stops reading it.
   - Re-pins: compact_memory.smoke.mjs (L109 30000 default pin, L112/115 fixtures,
     L173-174 4-key schema pin, L186/214/252 `body.keep.tokens` asserts, many call sites);
     context_recovery.smoke.mjs L80-84 fixture; handover_probe.mjs (L1837 schema pin,
     L2193 COMPACT-line pin `tokens=30_000`, L2389-2391 registration pin, call sites).
2. **Message relay on resume** (his #1): the queued message becomes the FIRST message on
   resume (+ short post-compaction protocol addendum), or an addendum to the auto-resume
   unit-4 recovery message. Today: `queueMessage` exists (compact_memory.ts L844/L874) but
   the promptAsync part is disabled (temp fix 0f192e5) — implement in auto_resume.ts
   (unit-4 recovery / restart branch).
3. **Budget-left info** (his #3 + --comment #2): ctx_gauge readout gets a DISTINCT suffix
   (e.g. "1 compaction left"). Data source ready: the budget store compact_budget.json
   (v2: per-session count + model_budget caps); auto_resume.ts already reads the file per
   nudge-eligible call (L227/L480) — the unit-2 nudge is the alternative home.
4. **Tool description stale** (his #4): compact_memory.ts L710-715 — drop the "server
   ignores the keep fields" note; describe keepMessages as working + the tokens≠0-
   ignores-messages server rule (why tokens is gone); reframe from emergency-only to
   maintenance/default.
5. **Planner prompt "starting value" wording** (his #5): remove the "(starting value …
   calibrate from measured loopruns)" notes — act on ~10/~6 calls as the calibrated
   instruction.
6. **Dump guideline** (his #6, autodump he's on): the live pre-compaction dump hook is in
   compact_memory.ts (L789-795, DUMP-OK/RETRY/FAIL) — the prompt protocols "dump before
   compact" are stale: planner prompt (worker near-limit protocol + the self-compact dump
   line "if the pre-compaction hook is not live yet"), worker prompt order-stop→dump step;
   AGENTS.md "(message is currently not working…)" rides item 2 (his paste).
7. **Prompt updates with the new compaction model** (his #7, handout.md as basis): planner
   + worker prompts — default-compact policy, distilled→drop mid-unit, wall-time/speed
   numbers, bit-rot rationale, three paths + the emergency-1 race, keepMessages heuristic,
   restart exception, stop lines as triage. Stale fixes: Gemma flush notes (planner L179,
   looprunner L122, repo_custom_tools L60); knowledge: knowledge_tools.md L181 (the
   never-keep-0 ruling — stale) + L171-174 and knowledge_plugins.md L119-124 (Gemma default
   summarizer — stale: agent.compaction.model commented out).
8. **Looprunner removal** (his #8): the role is retired (auto-resume plugin covers
   launch/relay/restart) — prompt_agent_looprunner.md (file), planner prompt L65/84/85/209/
   265, agent_readme_loop.md (looprunner-centric; the loop-folder/loop-log conventions
   still hold for the planner), agent_readme_post_compaction.md STEP 1 list, AGENTS.md
   role table + interaction contract (his paste), repo_custom_tools L34, repo_map L105,
   skill/README L9. Scope call his: retire the whole role vs keep the bookkeeping.
9. (his #9 = item 1's plugin side — merged into item 1.)
10. **EMERGENCY-1 MECHANISM** (his design, not on his list): a budget key (e.g.
    `"emergency_budget": 1`) or cap+1 rule; semantics: total 6, the 1 consumed ONLY after
    the normal 5 are drained, usable by EITHER system (self `emergency` param —
    keepMessages-capable — or auto-at-limit — blind 18), once. Today: no emergency key in
    the budget file, no `emergency` tool arg, the budget gate (L780-787) refuses at the cap
    with "hand over and start fresh".
11. **FORCED-NEW-SESSION DIRECTIVE** (his design): when both budgets are exhausted → new
    planner + directive to scan the last session's dump for relevant knowledge + clean
    handover/commit if not present. Implement in the auto_resume.ts restart branch
    (restartText); today the refusal text (L782-784) is the only hint.
12. **KEEPMESSAGES SINGLE SOURCE** (grounded finding, his call): the active v1 path sends
    keep only from ARGS — no args → server default (18); the budget file's keepMessages
    feeds only the log line. Option: the plugin always sends `messages = args ?? cfg`
    (budget file authoritative). No live drift today (both stores 18).
13. **Guide/handout corrections** (done this session): emergency-1 semantics + live values
    appended as full_guide.md §12 / handout.md "Corrections".
14. **BIT-ROT MONITORING** (deferred): the ctx.log COMPACT lines already count generations
    per session — use them + loop-log anomalies as the stability evidence for raising the
    cap.
15. **LIVE ACCEPTANCE** (after the builds): one live self-compact verifying — the COMPACT
    line reports the kept messages, gauge before/after floor, DUMP-OK line, keepMessages
    honored (no tokens override), and the "N compaction left" suffix once item 3 lands.
16. **REGISTRATION (maintainer domain — name in the close-out):** the `emergency` arg, the
    retired looprunner agent, the handout embedding in the system prompt (opencode.jsonc —
    his live file).

Discrepancies surfaced (evidence-attached):
- "default is currently 12 full messages" (chat) vs live stores = 18 in BOTH (as of
  2026-09-24) — 12 is no longer in either store; guide corrected.
- knowledge_plugins.md / knowledge_tools.md "Gemma is the DEFAULT compaction model
  (agent.compaction.model set)" vs opencode.jsonc L144-145 (commented out) — stale.

## Rulings (maintainer, 2026-09-24 close)
- **Item 12: RESOLVED — keep args-only** (no cfg-merge; no args → server default;
  both stores 18 so no drift). No build needed.
- **Item 8: CONFIRMED — looprunner to be COMPLETELY removed** (the prompt-wave
  spec's assumption holds; the AGENTS.md rows ride its paste list).
- **Guide's final home: AGENTS.md** (every agent needs it) — the handout (~950
  tokens) becomes an AGENTS.md section (his paste — test first, shrink later);
  the whole compaction-guide content is REMOVED from the planner + worker
  prompts (they keep only role-specific triage/handover mechanics + a pointer).
- **Spec wave codified:** pre-writing a committed queue of specs (multiple
  files) is an allowed + recommended method — landed in
  agent_readme_task_spec.md (this commit).
