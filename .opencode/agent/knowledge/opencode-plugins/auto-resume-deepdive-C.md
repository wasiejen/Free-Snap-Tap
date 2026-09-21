# Deep-Dive C — generally-useful mechanisms (recipe; vendor of scratchpad copy)
> Planner-vendored 2026-09-21 from the canonical run artifact
> (`auto-resume-deepdive-C.md`, worker_Q3S_160K session ses_f3e0a156bffeQYDNsR9B4AfIbb,
> commit b1a790d handover verified by the planner against source ground truth
> before vendoring). Content below is byte-identical to the run artifact
> (no rewrites); provenance note above only.
---
Run date 2026-09-21, worker_Q3S_160K. Source repo READ-ONLY, static analysis only
(`wc -l src/index.ts` = 2767 measured this session).
Shared machinery REFERENCED by pointer, not re-derived: timer architecture / send path
/ watchdog chain (Deep-Dive A §3–§4), ESC boundary + arm/tick handoff (A §5, B §4.3),
phase-1 feature-index map (`auto-resume-map.md`).
Every line ref below verified THIS session by bounded direct read (1372–1692 full;
180–232, 965–994, 1272–1318, 2044–2075, 2348–2380, 2635–2699 partials) or line-anchored
symbol grep (doneClaimNoTodosAttempts / checkingToolText / todoCheckAttempts /
taskCompleteOverrides / toolLoopAttempts). Discrepancies recorded in section 8.
## 1. Problem map

One row per C mechanism. Gate refs are pointers into shared machinery
(defines cited once; see Deep-Dives A/B where marked). All action sites live in
the idle scan mega-function unless noted.

| # | mechanism | trigger conditions | detection / action location (verified this run) | key gates (order as hit) |
|---|-----------|--------------------|--------------------------------------------------|--------------------------|
| 1 | tool-as-text recovery | last-3 assistant msgs hold raw XML/JSON tool-call text OR trailing tool_use part | checkForToolCallAsText 1372–1692, candidate 1488–1513 (+loop variant); prompt consts 104–106 *(map)* | latches 1374 → status-idle 1375 → reentry latch 1376 → backoff 1381–1385 → attempts cap 1387 → awaiting-input 1393 → active-user 1398 → minActivityGap 1656 → inflight guard 1664–1673 before abort branch |
| 2 | ready-to-continue auto-resume | READY_TO_CONTINUE_PATTERNS match recent assistant text with open todos pending; variant: todos all-closed but never closed out (≥2 sees) | same fn, 1515–1551 | same outer gate stack; todoCheckAttempts counter 1522 |
| 3 | done-claim verification | DONE_CLAIM_PATTERNS match recent assistant text; split: open todos vs none + work-description filter | same fn 1553–1576 (+ready-to-continue embedded choice 1540–1545); patterns/detectors 183–229 verified | doneClaimNoTodosAttempts < maxRetries gate 1568; increment only at dispatch decision 1643 |
| 4 | idle open-todos reminder | no other candidate found AND open todos AND busyCount() === 0 | same fn fallback 1616–1631; buildOpenTodosReminder *(map 410)* | todoNudgeAttempts >= maxRetries skip 1638 (reset each busy cycle, resetBusyFlags 1296) |
| 5 | celebration completion latch | trimmed+de-punctuated assistant text ends 🎉 AND no prio-0 recovery candidate active | inline variant 1601–1614 (mega-fn); detector def 969–990 reused at idle handler 2360 and periodic tick 2057 | open-todos false-positive guard: NO latch while any todo open (all three sites) |
| 6 | task_complete explicit stop | model invokes the registered tool `task_complete` (no args) | definition 2642–2665 inside returned hooks block (banner 2638–2640), registration 2687–2689 of return obj 2671–2764 *(map)* | parent-only open-todo rejection while taskCompleteOverrides < maxRetries (2651); subagents bypass rejection entirely |
## 2. Idle-scan mega-function decomposition — checkForToolCallAsText (1372–1692 verified full read)

Signature `(sid, w)`; async; wrapped in try/catch with `finally { checkingToolText = false }`
(1686–1691). Priority semantics: lower number wins; classes — 0 recovery prompts,
1 soft continues/done-claims, 2 nudges (action-intent, open-todos reminder).
The celebration branch only proceeds when no prio-0 candidate exists.

### 2.0 Pre-scan gate ladder (1373–1389)
Reads/writes: userCancelled, toolTextRecovered, status, checkingToolText (W at
1377), toolTextAttempts, lastRetryAt (via backoffMs pointer 375–385 *(map)*).
Order: sid-string guard → cancel/recovered latches → status must be idle → reentry
latch set BEFORE any await (prevents overlapping scans from the delayed timer) →
backoff vs lastRetryAt → attempts >= maxRetries cap → debug log.

### 2.1 Fetch + shared suppression gates (1391–1403)
`getSessionMessages(sid)` inflight-deduped fetch *(pointer A §3)*, then
hasPendingUserInput(messages) (def 921–937 *(map)*) and userRecentlyActive(w)
(def 943–945 *(map)*) each clear the latch and bail. Scan window =
`messages.slice(-3)` (1403); per-part role resolved as `msg.role ?? msg.info.role`.

### 2.2 Top-level tool field tracking, NO candidate produced (1417–1436)
Walks `msg.toolCall.name` and `msg.tool_calls[].name` (not parts) feeding
trackToolCall(w, name) only (def 1357–1370 *(map)*) — populates the loop ring so
the part-level checks below can detect loops even for messages whose tools are
carried on top-level fields instead of parts.
### 2.3 tool_use part candidates (1462–1486)
Per trailing tool_use part in recent assistant msgs:
- isLoop && toolLoopAttempts < 2 → W toolLoopAttempts++, candidate
  {TOOL_LOOP_RECOVERY_PROMPT, source "tool-loop", prio 0}
- else → candidate {continuePrompt, source "tool-use", prio 1}
Reads: toolLoopAttempts; Writes: toolLoopAttempts (+recentToolCalls via trackToolCall
pointer). Loop cap 2 per session cycle (zeroed in resetBusyFlags 1287).

### 2.4 XML / tool-as-text candidates incl. thinking-part trap (1488–1513)
containsToolCallAsText(text) (def 165–173 *(map)*; pattern tables TOOL_TEXT_PATTERNS
121–148 TRUNCATED_XML *(map)*). Name extraction regex tries `<function=X`,
`<invoke name="X`, `"name": "X"` (1489); matched name feeds trackToolCall →
isLoop && toolLoopAttempts < 2 swaps the prompt to TOOL_LOOP_RECOVERY_PROMPT
(source "tool-text-loop", prio 0). The base candidate fires for BOTH text and
reasoning parts: `isReasoning ? thinkingToolRecoveryPrompt : toolTextRecoveryPrompt`
(prompt consts 104–106 + 108 *(map)*), prio 0 — so a trapped tool call inside
thinking/reasoning parts recovers with the same priority as visible text.
### 2.5 Ready-to-continue candidate, todo-completed branch, embedded done choice (1515–1551)
Gate: containsReadyToContinuePattern(text) (def 175–181 verified at read window
180–181; patterns 149–157 *(map)*).
- Todos all closed but present (`!hasOpenTodos && todos.length > 0`) → W
  todoCheckAttempts++; from >= 2 emits continue {prio 1} ("todo-completed-continue"),
  first sees skip-and-log (prevents nagging before the agent catches up).
- Otherwise one candidate chosen by second test:
  containsDoneClaimPattern(text) → DONE_WITHOUT_WORK_PROMPT / source "done-claim";
  else continuePrompt / source "ready-to-continue". Prio 1 either way.
Reads: w.todos (+isOpenTodo def 401 *(map)*); Writes: todoCheckAttempts (zeroed in
resetBusyFlags 1282 AND send path 844 — both grepped this run).

### 2.6 Standalone done-claim candidate (1553–1576)
Fires ONLY when no bestCandidate yet AND containsDoneClaimPattern(text):
- open todos exist → immediate assignment (no prio compare)
  {DONE_WITHOUT_WORK_PROMPT, "done-claim-no-emoji", prio 1};
- no open todos AND containsWorkDescription(allAssistantText) (def 219–229
  verified: backticked dotted filename / bare slash-path / report headers —
  satisfies the demand itself, #26 guard per comment 219–220) → SKIP entirely;
- else if doneClaimNoTodosAttempts < maxRetries →
  {DONE_WITHOUT_DETAILS_PROMPT, "done-claim-no-todos", prio 1}.
The counter increments later at dispatch decision (1643), not here.
### 2.7 Action-intent candidate (1580–1599)
Gate: option resumeOnActionIntent true. Re-walks ALL messages newest-first for the
last assistant msg (wider than the recent-3 window of §2.1), accumulates part.text,
containsActionIntent (def 387–399 *(map)*: trailing `:` intent line after XML strip).
→ candidate {actionIntentPrompt, "action-intent", prio 2} via normal prio compare
(lowest-priority class — a recovery candidate always preempts it). Note: the
DELAYED 500 ms version in handleEvent (2376–2414 and legacy 2456–2492 *(map)*)
coexists; this in-scan one runs immediately.

### 2.8 Celebration check — INLINE variant (1601–1614)
Computed on `allAssistantText` = EVERY accumulated assistant text from the
recent-3 scan (§2.1 loop appends every text/reasoning/tool_use pseudo-text
part): trim → strip trailing `.!?+` → endsWith 🎉, AND
(!bestCandidate || bestCandidate.priority > 0) — i.e. suppressed whenever any
prio-0 recovery is pending. Branches:
- open todos remain → log only ("NOT latching completion"); NO early return —
  control falls through to the §2.9 fallback / any existing soft candidate;
- none → W toolTextRecovered=true, completionSignaled=true, clearTimeout
  (toolTextTimer), EARLY RETURN before any send.
This inline copy differs semantically from the shared detector (see section 4
and §8.4 — different message scope).
### 2.9 Idle open-todos reminder fallback (1616–1631)
Only when no candidate yet: hasOpenTodos && busyCount() === 0 →
buildOpenTodosReminder(todos) {prio 2, source
"idle-with-open-todos-reminder"}; hasOpenTodos && busyCount() > 0 → debug-log
only (subagents running — stand down). busyCount def 601–607 *(map)*.

### 2.10 Dispatch funnel: per-source budgets, gap guard, abort-or-send (1633–1685)
No candidate → return (1633). Then PER-SOURCE budget handling (1635–1647):
- reminder: todoNudgeAttempts >= maxRetries → skip-and-return
- done-claim-no-todos: W doneClaimNoTodosAttempts++
- everything else: W toolTextRecovered=true AND toolTextAttempts++
Activity-gap guard (1656–1661): Date.now − lastActivityAt < minActivityGapMs
const → skip (other plugin/user just acted). Send branch (1663–1684):
isHallucinationLoop(sid) (def 499–504 pointer A §2) → deterministic
hasInflightTools(w) FIRST (pointer), then polled checkSessionHasActiveTool
fallback → tryAbortAndResume if clear (pointer B §4.3); otherwise
sendContinuePrompt(sid, prompt, w) with catch→warn log; reminder counter
todoNudgeAttempts++ AFTER successful send (1679).
State fields written across the fn: checkingToolText, toolLoopAttempts,
toolTextRecovered, completionSignaled, toolTextTimer, toolTextAttempts,
todoCheckAttempts, todoNudgeAttempts, doneClaimNoTodosAttempts (+recentToolCalls
ring via trackToolCall).
## 3. task_complete tool (verified read 2635–2699)

Registration: banner 2638–2640 → `const taskCompleteTool = tool({...})` 2642–2665
→ inside the RETURNED hooks object 2671+: `config`, then
`tool: { "task_complete": taskCompleteTool }` at 2687–2689 (banner
"Returned hooks" 2667–2669). Siblings of the same return object: event hook
2672, chat.message 2691, tool.execute.before/after + command hooks
(pointer map row 2671–2764, Deep-Dives A/B already cover them).
Description text (liftable verbatim for a clone):
"Signal that all work is complete and stop automatic continuation prompts.
Call this ONLY after finishing everything requested." Args: `{}` — no inputs.
Behavior contract (execute body, verified line by line):
1. `w = sessions.get(ctx.sessionID)`; unknown session → skip ALL state logic,
   still return acknowledgment string ("no crash" contract).
2. Rejection gate is PARENT-only (`if (!w.isSubagent)`): openTodos filtered as
   status pending|in_progress from w.todos.
3. Reject while budget remains: openTodos > 0 && taskCompleteOverrides < maxRetries
   → W overrides++, log with count, RETURN rejection text
   ("You have N unfinished task(s)..."). No latch fields touched on reject.
4. After cap: overrides >= maxRetries falls through to success even with open
   todos (bounded retries are exactly maxRetries = 3 const 65–102 *(map)*).
5. Success: W toolTextRecovered=true, completionSignaled=true,
   clearTimeout(toolTextTimer), ack returned for BOTH parent and subagent
   paths — subagents never face step 2-4 at all.
Gates consumed downstream: both latches front-gate the mega-fn (1374), the
idle-handler nudge block (2359 chain verified §2.8-era read 2348–2380), and the
stall timer per issue16 FIX A3 pin.
Test pins (case names collected scope item 5): events file "task_complete tool"
block — blocks with unknown sid / on subagent sets completionSignaled /
unknown sessionID no-crash / open todos block+message / after maxRetries
accepts / "taskCompleteOverrides persists across busy/idle cycle"; rearm
file "re-arm also lifts the task_complete latch".
## 4. Celebration mechanics (verified reads 965–994 detector; three use sites)

Detector `lastAssistantEndsWithCelebration(sid)` def 969–990: walks messages
newest-first, FIRST assistant message wins (loop returns immediately); joins
its TEXT parts only; trim; strip trailing `[.!?]+`; endsWith '🎉'. Any error
→ false ("don't block continue").
Use site A — in-scan inline variant 1601–1614 (§2.8): different input scope
(all accumulated recent text vs newest-only message); open-todos → log only,
fall through (reminder or existing soft candidate may still fire); clean 🎉
→ double-latch + timer clear + early return (no send ever made from this fn
after a clean celebration).
Use site B — idle handler 2348–2373 (verified): lazy todo fetch when cache empty
(fetchSessionTodos pointer map todo-cache row); full gate line 2359
(open>0 && currentBusy===0 && !awaitingUserInput && !userRecentlyActive &&
!completionSignaled && !userCancelled && todoNudgeAttempts < maxRetries);
celebration true → buildOpenTodosReminder + tryResume(reason
"idle with open todos (celebration false positive)") + nudge counter ++;
else identical reminder without that label. Both branches SEND the same
reminder text — comment pins intent: 🎉 with open todos is a FALSE POSITIVE,
never latches completionSignaled here.
Use site C — periodic tick recheck 2044–2074 (verified): reachable ONLY with
open.length > 0 (early continue at 2052), nudge cap 2053, backoff off
lastRetryAt 2054–2056; celebration true → log + SKIP this cycle's nudge
(no reminder sent on tick path — differs from site B which does send);
else tryResume periodic reminder + counter iff actually sent.
Anti-race behavior pinned by tests (case names, scope item 5):
- index.continue.test.ts: "🎉 in last assistant message WITH open todos
  → continue sent (FIX #16: 🎉 is a false…"
- index.issue16-regression.test.ts: "FIX B4: 🎉 with open todos does NOT
  latch completionSignaled (nudge sent)";
  "FIX B4: 🎉 with NO open todos correctly blocks continue".
The three sites intentionally diverge (send-nudge / skip-cycle / fall-through)
— a port must choose ONE policy per call context rather than copy-paste.
## 5. Done-claim machinery (verified reads 180–232 region; consumer greps)

Patterns DONE_CLAIM_PATTERNS 183–198 (spec range "~183–230" resolved by symbol
grep to exactly 183–198; see §8.1). Two families: line-anchored
`/^...[.!]*$/im` end-of-response claims ("task done", "done", "all done",
"finished", "complete", "task complete(d)", "all tasks ...") and mid-text
`\b` forms ("done with task/work/implementation", "finished the ...",
"(all|everything) is (complete|done|finished)", "nothing else left").
containsDoneClaimPattern(text) 213–217: splits text, tests LAST 5 LINES joined
only — position matters, not just presence anywhere.
Prompts: DONE_WITHOUT_WORK_PROMPT 200–203 (verify-and-finish, names the todo
list); DONE_WITHOUT_DETAILS_PROMPT 205–211 (hard demand for a detailed
report: full path + exact changes per file, every verification command +
result, final outcome; explicitly forbids short acknowledgments — see
recipe §6.3).
Budget field doneClaimNoTodosAttempts — all consumers this run:
interface decl 52, default 575, gate 1568, increment 1643 (dispatch decision),
log ref 1649, reset at 2530 ONLY (message.updated user-role inbound-message
re-arm block 2524–2532 *(map)*).
The cap across busy cycles is EXPLICIT non-reset design: resetBusyFlags
(1272–1302 verified) zeroes resume/toolText/todoCheck/checkingToolText/
toolLoop/contextWrapup/pending-recovery/watchdog state AND
todoNudgeAttempts (comment 1295: fresh budget each genuine busy→work cycle)
but deliberately SKIPS doneClaimNoTodosAttempts — comment 1297–1299:
resetting it here let the details prompt refire unboundedly across
cycles (#26); preserve also covers userCancelled/completionSignaled/idleSince/
continuing (1301). Consequence: max 3 details prompts per session per
genuine work round; only an inbound user message re-arms (2530).
Test pins: events file "done-claim text detection (no tool call)" block —
details prompt capped across busy cycles (no reset on busy); work-description
response → NO details prompt (#26); inbound user message re-arms after cap;
issue16 FIX A6 "DONE_CLAIM_PATTERNS includes broadened patterns".
## 6. Recipes per mechanism — reuse/adapt for OUR stack

### 6.1 task_complete-style stop tool
Portable as-is: the registration shape (`return { ..., tool: { name:
tool({...}) } }`) is exactly what our compact_memory.ts already does
(pointer A §7; header of that file), and execute returns synchronously with
local-state latching — ZERO client calls inside, so the no-await
fire-and-forget constraint (§7 binding row) never applies to this tool body
itself. Needs host-side adaptation: (a) a per-session watch store does not
exist in any active plugin yet (pointer A §7 missing-list); (b) the rejection
gate needs open-todo state from the host todo API — availability on OUR
build UNVERIFIED (see §8.6); without it, drop step 2-4 and keep pure latch +
timer-clear (taskCompleteOverrides then moot — maintainer decision).
Tests prove: events task_complete block incl.
"open todos after maxRetries → accepts completion" and
"persists across busy/idle cycle"; rearm "re-arm also lifts the
task_complete latch" — i.e. the reference pins bounded-reject-then-accept
AND explicit-lift-on-new-user-round both.
### 6.2 Celebration false-positive guard
Logic portable as-is: NEVER latch a completion signal while any open item
remains in the authoritative backlog; strip trailing punctuation before
matching; error-safe detector returning false. Host adaptation: the
"completion" analog in our stack = handoff commit + final pointer /
compaction dispatch; the matching race there would be auto-stopping
(e.g. an autonomous wrapup trigger) when queued work remains. Cheapest win
is adopting the gate ORDER: backlog check strictly before latch, at every
call site — and picking ONE policy per context, since the reference's own
three sites diverge (send-nudge vs skip-cycle vs fall-through).
Tests prove: continue FIX #16 case (🎉+openTodos still nudged) and issue16
FIX B4 pair (no-latch / blocks-continue) pin both directions of the race.
### 6.3 Done-claim persistent budget
Pattern portable as-is into any watchdog/nudge ladder state: attempt counter
that is deliberately NOT zeroed by the busy→idle reset (documented why),
capped (maxRetries analogue), incremented only at the dispatch DECISION
point (not at detection), and re-armed solely by a genuine inbound user
message. This is exactly the discipline our compact_memory budget already
follows increment-on-verified-success style (pointer B §7) — same thinking,
new axis. Adaptation: discriminating user-vs-model prompts needs a flag in
the chat.message payload; OUR live probe record says the hook carries no
messageID (ctx_watchdog header v1-era note) and no `continuing` analogue
confirmed (§8.7) — conservative default until proven: treat all
model-originated turns as non-re-arming.
Text asset portable nearly verbatim: DONE_WITHOUT_DETAILS_PROMPT wording
maps 1:1 onto our handover-summary conventions (per-file path + exact
changes, commands run + results, final outcome, short acks banned) — lift
for any future nudge prompt that demands a report.
Tests prove: events block pins cap-across-cycles, work-description skip
(#26) and user-message re-arm; issue16 FIX A6 pins pattern stability.
### 6.4 Mega-function architecture (the general recipe)
Ordering law, reusable for ANY idle-boundary engine we build:
cheap deterministic gates first (cancel / recovered-latch / status /
reentry-latch set before first await), then ONE async fetch, then per-part
classification feeding a single best-candidate picked by priority class,
then per-source budgets, then pre-send guards (activity gap, inflight
counters) inside the send branch itself, with finally-release of the
reentry latch. What ports as-is: gate ordering, priority-class selection
(recovery < soft < nudge), per-source caps, minActivityGap concept.
What needs building first: the watch store + delayed-timer plumbing
(pointer A §7 missing-list) — AND every outbound send must be
fire-and-forget promptAsync-style with async success verification
(the reference awaits session.command/summarize inline inside its idle
handlers; on our single llama-swap slot an awaited send from within an
active turn's context would deadlock — pointer A §7 last row, B §7 trigger
row documenting the measured live evidence).
## 7. Fit assessment against OUR stack (read-only; compact_memory.ts focus)

Measured this session in .opencode/plugin/: active files = compact_memory.ts
(654 lines), ctx_watchdog.ts (732 lines), intercept_observer(+_core).ts,
probes/, scripts/, tools/, tests/, deactivated/. Symbol spot-checks confirm
A/B line refs still land (typeof v2/v1 client probes at compact_memory
header block ~30–33; ctx_watchdog chat.message trigger +
client.session.promptAsync delivery noted in that file's header
comments 93–124 *(measured this run)*).
Binding constraint (unchanged since A §7 / B §7): NO-AWAIT
fire-and-forget dispatch on the single llama-swap model slot — any
reference mechanism whose action path contains `await`-ed host calls
(command / summarize / prompt) inside an idle or event handler must be
rewritten to a fire-and-forget dispatch with ASYNCHRONOUS success
verification before it can serve us; latching local state and tool-exec
returns are exempt (no host round-trip needed).
| mechanism | portability verdict |
|---|---|
| task_complete tool shape (§3/§6.1) | HIGH for the tool surface itself — identical registration pattern we already ship; sync execute is deadlock-free by construction. Blockers: watch store absent; rejection data source (host todo API) unverified → pure-latch fallback needs a maintainer call. |
| Celebration guard logic (§4/§6.2) | Logic HIGH (pure decision order); trigger LOW-MED for auto-stop use — our stop decisions today are model-driven role-prompt stops (AGENTS.md stop line), so this is hardening, not plumbing; message-scope detector reads need getSessionMessages-style fetch which IS proven in-repo via compact_memory's cross-session path (pointer B §7). |
| Done-claim persistent budget (§5/§6.3) | MED-HIGH as counter discipline for future nudge/compact loops (local state only, no host dependency); re-arm discrimination BLOCKED until the chat.message payload flag question resolves (§8.7). Details-report text asset: lift as-is. |
| Mega-function ordering law (§6.4) | Blueprint only — requires watch-store + delayed-timer infra absent from every active plugin (pointer A §7 missing-list); all outbound sends fire-and-forget per binding constraint. |
Bottom line: NONE of C's mechanisms replaces anything current in
compact_memory/ctx_watchdog; they add one reusable guard (backlog-before-
latch), one bounded-budget pattern, one report-demand template, and one
ordering blueprint — with zero behavioral changes made in this task
(docs-only scope honored).
## 8. Unverified / unclear (incl. spec/map line-ref discrepancies)

1. Spec item 4 range "~183–230" vs symbol grep: DONE_CLAIM_PATTERNS is
   exactly 183–198; detectors/prompts extend to 229 (read verified
   180–232 window covers it). Trust-the-symbol applied — minor.
2. Map off-by-one refs: DONE_WITHOUT_DETAILS_PROMPT listed 205–210 but
   string literal closes on 211; containsWorkDescription listed 219–230
   but body ends at 229 (230 is blank). Cosmetic only.
3. Observed dead branch: periodic tick celebration latch site C else-branch
   (2062–2065 latches toolTextRecovered/completionSignaled when openCount
   == 0) is UNREACHABLE inside that loop because 2052 already early-
   continues whenever open.length === 0. Defensive duplication of the
   mega-fn behavior; no execution evidence either way.
4. Inline 🎉 variant (§2.8) checks the trailing emoji against ALL
   accumulated recent assistant text, while lastAssistantEndsWithCelebration
   checks newest assistant message ONLY — two different truths can hold
   simultaneously at one idle boundary. No collected case name distinguishes
   them (static analysis only).
5. lastRetryAt writers: read sites verified (mega-fn gate 1382, periodic
   backoff 2054); zero-site resetBusyFlags 1274; primary WRITER sits inside
   sendContinuePrompt (pointer A §4) which was NOT re-read this session per
   shared-machinery rule.
6. Host todo availability for a ported task_complete rejection gate:
   unverified whether our opencode build exposes the reference's
   fetchSessionTodos/todo.updated equivalents. Check tried: none possible
   statically (host-side; reference execution forbidden by spec).
7. chat.message payload flag for user-vs-model discrimination on OUR host:
   ctx_watchdog header records live probes (no messageID in LIVE input);
   presence of any `continuing` analogue unknown — block on it until probed.
8. Line-count drift on our own plugin: compact_memory.ts measured 654 lines
   THIS session vs "651 lines" recorded in Deep-Dive B §7 header — small
   post-B edits or counting difference; spot-checks above show its key
   symbols intact, A/B line refs may be ±a few lines stale.
9. Test case names were collected via ONE bounded head-limited loop with
   regex (describe|it|test) over the seven C-relevant files; assertion
   bodies inside cases are NOT read (Phase method limit — same class as
   A §8 item 4 / B §8 item 6). toolext (41 total matches), continue (21) and
   coverage/plugin/rearm captures are head-truncated beyond what §2/§3/
   §4/§5 quote verbatim; every name cited above is verbatim from captured
   output. issue16 (18) and events (49) captures are complete.
10. All six scope items covered and marked done:
    1 mega-fn decomposition DONE (§2 full read 1372–1692);
    2 task_complete DONE (§3 read 2635–2699 + consumer greps);
    3 celebration DONE (§4 detector + three use sites all read);
    4 done-claim DONE (§5 patterns/prompts/detectors read + all budget
      consumers grepped incl. preserve-comment context 1272–1318);
    5 test case names DONE (single bounded loop, corrected regex);
    6 fit assessment DONE (§7, our plugins read-only grounded this session).
<!--END OF RECIPE (Deep-Dive C run, worker_Q3S_160K, 2026-09-21)-->
