# Feature-index map — opencode-auto-resume — RUN C (worker_Q4_140K)

> Planner-verified 2026-09-18 (direct ses_f4a3f85e): six anchor lines spot-checked
> verbatim against `src/index.ts` (21/421/746/1372/1834/2099 all match) + the
> ctx-wrapup block 2306-2345 confirmed. Source run: scratchpad
> `auto-resume-map-runC.md` (commit 517aca5). Phase 2 deep dives scope by the
> line ranges below.

Source repo (READ-ONLY, never executed): `C:/Users/Wasiejen/AppData/Local/Temp/opencode/opencode-auto-resume-master`
Spec: `.opencode/agent/handover/handover_task.md` (Phase 1 feature-index map)
Built: 2026-09-18, static analysis only. Scope: every `###` section under "What it does"
(README 5–258) + "Recovery model" (README 269) + "Architecture" (README 295).
README sections from "Installation" onward are OUT of scope.

## Method

Structure discovery (all read-only greps against `src/index.ts`, run from the plugin repo root):

1. Top-level declarations (line-anchored — every listed line's text is confirmed by the
   grep output itself):
   `grep -n -E "^(const |let|function |async function |export |class |interface |type |//)" src/index.ts`
2. Nested declarations inside the plugin function (2-space body indent):
   `grep -n -E "^ {4,}(async function|function|const|let) [A-Za-z_]" src/index.ts`
3. Banner comments are INDENTED (4 spaces), so a column-0 banner grep finds nothing:
   `grep -n -E "^\s*// ---+" src/index.ts` → e.g. 1751 "Resume: normal stall",
   2095 "Event handler", 2638 "task_complete tool", 2667 "Returned hooks".
4. Event/hook wiring: `grep -n -E "ctx\.event|event\.on|return \{|chat\.message|tool\.execute|command\.execute"`
5. Timers: `grep -n "startTimer()\|setInterval\|setTimeout\|discoverSessions()" src/index.ts`
6. Test-file case names (one command over all 28 test files, bounded head -8 each):
   `for f in src/index.*.test.ts; do echo "== $(basename $f)"; grep -oE "(describe|it)\((\"|'|\`)[^\"'\`]{4,80}" "$f" | sed 's/^[^(]*(//' | head -8; done`
7. Targeted bounded reads (40–160 lines each) verified these anchors: 21-65, 489-613,
   746-830, 921-1015, 1319-1376, 1686-1699, 1698-1797, 1834-1938, 1939-2098, 2099-2173,
   2174-2348, 2349-2508, 2509-2648, 2649-2767.
   Line ranges for pure helpers / constants (10-418) are measured from the top-level
   declaration grep (step 1): the start line contains the symbol name verbatim and the
   end line is the line before the next top-level declaration.
8. `wc -l src/index.ts` → 2767 (matches planner-measured).

## Structural skeleton — src/index.ts (2767 lines)

Monolith: pure top-level helpers (10–418) + ONE giant plugin function (421–2765).

| lines | symbol / block |
|---|---|
| 10-14 | `interface Todo` |
| 16-19 | `interface ToolCallRecord` |
| 21-63 | `export interface SessionWatch` — the per-session state machine (status, userCancelled, resumeAttempts, gaveUp, orphanWatchStartAt, pluginAbortInFlight, toolTextAttempts, continueTimestamps, todos, lastTokenTotal, contextWrapupAttempts, toolLoopAttempts, isSubagent, completionSignaled, todoNudgeAttempts, taskCompleteOverrides, doneClaimNoTodosAttempts, lastUserMessageAt, pendingTools/Commands, pendingRecovery{,Reason,At}, recoveryAttempts, watchdogRetryGuard) |
| 65-102 | default options + internal constants (chunkTimeout 45000, checkInterval 5000, activeUserWindow 15min, grace 3000, maxRetries 3, backoff 1000/8000, subagentWait 15000, ABORT_CONTINUE_DELAY 2000, loop 3x/10min, toolTextCheckDelay 3000, maxRecoveryRetries 2, minActivityGap 1000, warmup 15000, silentDeadStreamMinTokens 200, MAX_IDLE_SESSIONS 50, IDLE_CLEANUP_MS 10min, SESSION_DISCOVERY_INTERVAL_MS 60s) |
| 104-120 | prompt constants: TOOL_TEXT_RECOVERY_PROMPT (104), THINKING_TOOL_RECOVERY_PROMPT (108), TOOL_LOOP_RECOVERY_PROMPT (112), CTX_WRAPUP_TRIGGER "ctx-wrapup" (119) |
| 121-157 | pattern tables: TOOL_TEXT_PATTERNS (121), TRUNCATED_XML_PATTERNS (141), READY_TO_CONTINUE_PATTERNS (149) |
| 159-163 | `stripCodeBlocks()` |
| 165-173 | `containsToolCallAsText()` |
| 175-181 | `containsReadyToContinuePattern()` |
| 183-198 | DONE_CLAIM_PATTERNS |
| 200-203 | DONE_WITHOUT_WORK_PROMPT |
| 205-210 | DONE_WITHOUT_DETAILS_PROMPT |
| 213-218 | `containsDoneClaimPattern()` |
| 219-230 | `containsWorkDescription()` |
| 231-263 | `isStreamingFailure()` — name exact-match / message regex w/ substring fallback |
| 265-316 | `getLastAssistantError()` — walks messages newest-first for message/part errors |
| 318-352 | `getLastSilentDeadStream()` — newest assistant msg: finish set, zero text parts, output tokens |
| 354-373 | `toolCallSignature()` — name+args fingerprint for live loop detection |
| 375-385 | `backoffMs()` — exponential backoff with cap |
| 387-399 | `containsActionIntent()` — trailing `:` intent line |
| 401-418 | todo helpers: `isOpenTodo` (401), `getOpenTodos` (405), `buildOpenTodosReminder` (410) |
| 421-2765 | `export const AutoResumePlugin: Plugin = async (ctx, options) => { … }` (the whole plugin) |
| 2767 | `export default AutoResumePlugin` (only 2 exports — exports-guard regression) |

Inside AutoResumePlugin:

| lines | block |
|---|---|
| 421-481 | option parsing (every README option, incl. busyStallStrategy validation 470-473) |
| 483-487 | runtime state: `sessions` Map, `timer`, `discoveryTimer`, `initialised`, `prevBusyCount` |
| 489-497 | `recordContinue()` — continue timestamp ring (loop window) |
| 499-504 | `isHallucinationLoop()` — 3+ continues in window → true |
| 509-528 | `log()` — all logging via `ctx.client.app.log()`, 5s debug dedup |
| 530-539 | `safe()` wrapper |
| 541-588 | `ensureWatch()` — SessionWatch factory + defaults |
| 590-595 | `touchSession()` — resets ONLY that session's timer, only when busy & not cancelled |
| 597-599 | `hasInflightTools()` — primary deterministic in-flight guard (pendingTools/Commands) |
| 601-607 | `busyCount()` |
| 609-619 | `getLoneBusySession()` |
| 621-653 | event accessors: `getSid` (621), `getError` (635), `getStatusType` (643) |
| 654-657 | `short()` (sid abbrev for logs) |
| 659-701 | `cleanupIdleSessions()` — >10min idle or >50 entries |
| 703-745 | prompt-response logging: `getPromptResponsePayload` (703), `logPromptResponse` (720) |
| 746-908 | `sendContinuePrompt()` — the central send path: agent/model/provider extraction from last USER message (761-803), prompt (810), one retry (829), watchdog retry chain (853-904), abort+resume escalation (886-890) |
| 910-919 | `extractMessages()` |
| 921-937 | `hasPendingUserInput()` — awaiting-input gate (trailing pending tool_use) |
| 943-945 | `userRecentlyActive()` — active-user suppression gate |
| 947-962 | `getSessionMessages()` — inflight-deduped message fetch |
| 964-967 | `roleOf()` |
| 969-990 | `lastAssistantEndsWithCelebration()` — 🎉 detector |
| 992-1013 | `getSessionStatusMap()` — polled real statuses |
| 1016-1049 | todo cache (2s TTL) + `fetchSessionTodos()` (1020) |
| 1052-1054 | SUBAGENT_STUCK_MS = 60_000 + SUBAGENT_RECOVERY_PROMPT |
| 1056-1069 | `recoverSubagent()` — recovery prompt to a stuck/crashed child |
| 1071-1084 | `hasBusySubagents()` |
| 1086-1091 | `magicContextDetected` cache |
| 1093-1113 | `isMagicContextInstalled()` — host `config.get().plugin` scan |
| 1122-1159 | `getUsableContextLimit()` — `context − min(20k, output)` per model, cached |
| 1161-1190 | `checkSessionHasActiveTool()` — polled fallback guard |
| 1192-1242 | `checkSubagentStatus()` — crashed/idle/busy classification + stuck child (>60s text, >180s with tool) |
| 1244-1318 | state resets: `resetSessionFlags` (1244), `resetBusyFlags` (1272), `resetIdleFlags` (1304) |
| 1319-1341 | `detectPatternLoop()` — repeating cycle length 2-5, 3x |
| 1349-1355 | `detectLiveToolLoop()` — consecutive or pattern over name+args sigs |
| 1357-1370 | `trackToolCall()` — idle-side name-only loop tracking |
| 1372-1692 | `checkForToolCallAsText()` — THE idle scan mega-function: XML/tool-as-text candidates, thinking-part tool traps, ready-to-continue, done-claim (open todos / no todos), idle open-todos reminder, celebration; gates: awaiting-input, active-user, active-tool, backoff |
| 1698-1749 | `tryAbortAndResume()` — abort → 2s → continue; `pluginAbortInFlight` latch (1709/1747) |
| 1751-1796 | `tryResume()` — "Resume: normal stall" (banner 1751-1753); backoff, hallucination→abort branch, send |
| 1798-1832 | `discoverSessions()` — `session.list()` pickup |
| 1834-2091 | `startTimer()` — the 5s tick loop: status reconcile (1838-1847), orphan watch (1853-1903), subagent-stuck (1905-1946), busy-silence stall + busyStallStrategy (1948-1978), pending-recovery trigger (1983-2017), periodic idle open-todos nudge (2019-2074), cleanup call (2076-2077), discoveryTimer (2084-2090) |
| 2093 | `startTimer()` invocation |
| 2095-2097 | banner "Event handler" |
| 2099-2636 | `handleEvent()` — switch over event types: session.status (2109: busy 2115, interrupted 2123, idle 2131 incl. orphan arm 2135-2143, subagent saturation 2147-2194, parent idle block 2196-2346 [streaming-fail idle 2212-2256, silent dead-stream 2257-2304, context saturation→ctx-wrapup 2306-2345, open-todos nudge 2348-2373, action-intent delayed 2376-2414, toolTextTimer 2416-2419], retry 2421), session.created (2428), session.updated (2443), session.idle legacy (2448), session.interrupted (2506), message.updated (2519: user re-arm 2524-2532, token tracking 2536-2549), todo.updated (2553), session.error (2568: ESC latch 2576-2585, streaming-fail arm 2588-2609), command.executed (2622) |
| 2638-2640 | banner "task_complete tool" |
| 2642-2665 | `taskCompleteTool` — `tool({…})` definition with open-todo rejection |
| 2667-2670 | banner "Returned hooks" |
| 2671-2764 | `return { event, config, tool: {task_complete}, "chat.message" (2691: ESC back-off lift), "tool.execute.before" (2710: pendingTools++, liveToolSigs fingerprint, live loop abort 2732-2748), "command.execute.before" (2751), "tool.execute.after" (2758) }` |

## Feature index

### Stall recovery
Busy-silence detection in the 5s tick loop (idle >= chunkTimeoutMs + gracePeriodMs)
routes through `busyStallStrategy`: "continue" → `tryResume` with exponential backoff
(up to maxRetries, then gaveUp); "abort" → `tryAbortAndResume` first; "off" → skip.
where: src/index.ts lines 1948-1978 (timer branch); 1751-1796 (tryResume); 746-908 (sendContinuePrompt); 470-473 (option)
test: index.continue.test.ts, index.busy-stall-strategy.test.ts, index.backoff.test.ts
confidence: measured

### Tool calls as raw text
On idle (delayed `toolTextTimer`), the last 3 messages are scanned for raw XML/JSON
tool-call text (TOOL_TEXT_PATTERNS / TRUNCATED_XML_PATTERNS, incl. tools trapped in
thinking/reasoning parts); on a hit it sends TOOL_TEXT_RECOVERY_PROMPT (or
THINKING_TOOL_RECOVERY_PROMPT) with backoff.
where: src/index.ts lines 1372-1692 (checkForToolCallAsText — the idle scan mega-function); 121-148 (pattern tables); 104-106 (prompts); 2416-2419 + 2494-2501 (idle scheduling, clearTimeout-before-set)
test: index.toolext.test.ts (detection + prompts + gates), index.coverage.test.ts (pattern coverage)
confidence: measured

### Hallucination loop
Two detectors: (a) 3+ `continue` sends within 10min (`continueTimestamps`) → the normal
stall path aborts instead of continuing; (b) tool-loop detection — name-only on idle
scan (3+ same tool or repeating pattern 2-5 ×3) and LIVE in `tool.execute.before`
(name+args fingerprint, 3+ identical-in-5 or pattern) → abort the turn (sanctioned
exception, current call not started) + TOOL_LOOP_RECOVERY_PROMPT, max 2 per busy turn.
where: src/index.ts lines 489-504 (recordContinue/isHallucinationLoop); 1765-1780 (abort branch in tryResume); 1319-1370 (pattern detectors); 2710-2749 (live hook interception)
test: index.it.test.ts (hallucination loop detection), index.live-tool-loop.test.ts (live tool.execute.before)
confidence: measured

### Orphan parent
When busyCount drops >1→1, the lone busy parent gets `orphanWatchStartAt`; after
subagentWaitMs + gracePeriodMs the tick probes subagent status (crashed → recover child
first; idle with no busy child → abort+resume parent), guarded by the active-tool checks.
where: src/index.ts lines 2135-2143 (arm, session.status→idle); 1853-1903 (tick orphan watch); 1071-1084 (hasBusySubagents)
test: index.events.test.ts, index.session-watch.test.ts, index.state-machine.test.ts (orphan references; no dedicated file)
confidence: measured

### Subagent stuck detection
`checkSubagentStatus()` classifies children crashed/idle/busy; a child with no new text
for >1min (SUBAGENT_STUCK_MS 60s; longer when a tool call is in progress) is "stuck" —
`recoverSubagent()` prompts the child before the parent abort+resume fires.
where: src/index.ts lines 1192-1242 (checkSubagentStatus); 1052-1054 (constants); 1056-1069 (recoverSubagent); 1874-1893 + 1931-1945 (tick call sites)
test: none (no dedicated file surfaced; covered inside orphan/integration tests)
confidence: measured

### Streaming failure recovery
`isStreamingFailure()` classifies errors (name exact / message regex with substring
fallback). Armed at `session.error` (busy) and re-checked at idle via
`getLastAssistantError()`; the tick sends the recovery prompt once backoff elapses, the
deferred watchdog in `sendContinuePrompt` retries (watchdogRetryGuard) and escalates
retries→abort+resume→gaveUp. Per-session fields pendingRecovery{,Reason,At},
recoveryAttempts, watchdogRetryGuard on SessionWatch.
where: src/index.ts lines 231-263 (isStreamingFailure); 2588-2609 (error arm); 2212-2256 (idle arm + tryResume); 1983-2017 (tick trigger); 853-908 (watchdog/escalation); 265-316 (getLastAssistantError); 58-62 + 79, 85-98 (fields/defaults)
test: index.streaming-failure.test.ts (isStreamingFailure), index.streaming-failure-idle.test.ts (idle path), index.pending-recovery.test.ts (tick), index.session-error.test.ts (error arm), index.session-watch.test.ts (fields), index.watchdog.test.ts (retry/escalation), index.state-machine.test.ts (full chain)
confidence: measured

### Silent dead stream recovery
Newest assistant message with a finish reason, zero text parts, and >=
silentDeadStreamMinTokens output tokens = dead stream (reasoning-only, finish:"unknown").
On idle the plugin re-checks the live status (busy/retry again → skip, race guard) then
resumes via tryResume; arms pendingRecovery with reason `silent-<finish>`.
where: src/index.ts lines 318-352 (getLastSilentDeadStream); 2257-2304 (idle handler); 82, 468 (option)
test: index.silent-dead-stream.test.ts
confidence: measured

### Context saturation → magic-context wrapup
Token usage tracked from `message.updated` (`lastTokenTotal`); usable window =
context − min(20k, maxOutput), cached per model. On idle: parent sessions only when
magic-context is in the host plugin list → `session.command({command: "ctx-wrapup"})`
(once per session, contextWrapupAttempts < 1); subagents (isSubagent via parentID on
session.created) get opt-in native `session.summarize()` when
subagentNativeCompactionEnabled. Threshold default 0.85.
where: src/index.ts lines 2536-2549 (token tracking); 1122-1159 (getUsableContextLimit); 1093-1113 (isMagicContextInstalled); 2306-2345 (parent → ctx-wrapup command); 2147-2194 (subagent → native summarize); 2428-2439 (isSubagent set); 119 (CTX_WRAPUP_TRIGGER); 475-479 (options)
test: index.context-saturation.test.ts
confidence: measured

### Active-tool safety guard
Before any abort: primary deterministic in-flight counter (`hasInflightTools()` from
`pendingTools`/`pendingCommands` maintained by tool.execute.before/after +
command.execute.before + command.executed), then polled fallback
`checkSessionHasActiveTool()`. Guards sit on every abort path (orphan, stall,
hallucination, tryResume).
where: src/index.ts lines 597-599 (hasInflightTools); 1161-1190 (checkSessionHasActiveTool); 2710-2714 / 2758-2762 / 2751-2756 / 2628-2631 (counter maintenance); call sites 1859, 1868, 1918, 1924, 1956, 1961, 1766, 1772, 1669
test: index.inflight.test.ts (deterministic in-flight tracking)
confidence: measured

### Model, agent & provider preservation
`sendContinuePrompt` walks messages newest-first to the last USER message and extracts
`agent` / `model` (top-level fields, falling back to `msg.info.agent` / `msg.info.model`),
passing both into the `session.prompt` body so resumes keep the user's UI selection.
where: src/index.ts lines 761-803 (extraction); 810-817 (prompt body with agent+model)
test: index.integration.test.ts (Agent Extraction Flow, Prompt Call with Agent), index.it.test.ts (Agent preservation)
confidence: measured

### ESC cancel respected
`MessageAbortedError` (and `session.interrupted` / status "interrupted") latches
`userCancelled` on ALL sessions regardless of tracked status — except sessions with
`pluginAbortInFlight` (plugin's own aborts). Every send path gates on
`userCancelled`/`completionSignaled`; timers are cleared. Back-off lifts on a genuine new
user message (`chat.message` hook — only when `continuing` is unset, so the plugin's own
recovery prompts don't re-arm; also `message.updated` user role resets the done-claim
budget and stamps active-user recency).
where: src/index.ts lines 2576-2585 (error latch); 2506-2517 (session.interrupted); 2123-2130 (status interrupted); 2691-2708 (chat.message re-arm); 2524-2532 (message.updated re-arm)
test: index.esc-stops-timers.test.ts, index.rearm.test.ts
confidence: measured

### Explicit completion via task_complete
Registered `task_complete` tool: rejects (up to maxRetries overrides) while open todos
remain, otherwise latches `completionSignaled` + `toolTextRecovered` and clears the
tool-text timer — all further continue/sends stop.
where: src/index.ts lines 2642-2665 (tool definition); 2687-2689 (registration in returned object)
test: index.events.test.ts, index.issue16-regression.test.ts, index.plugin.test.ts, index.rearm.test.ts (task_complete references; no dedicated file)
confidence: measured

### 🎉 emoji completion
`lastAssistantEndsWithCelebration()` checks the newest assistant text for a trailing 🎉
(after stripping punctuation). On idle with open todos it is a FALSE POSITIVE (nudge,
no latch); with no open todos it latches completion (toolTextRecovered +
completionSignaled) and resets the tool-text path. Same check in the periodic recheck.
where: src/index.ts lines 969-990 (detector); 2359-2373 (idle usage); 2057-2067 (periodic usage); ~1601-1610 (inside checkForToolCallAsText)
test: index.continue.test.ts (🎉 race condition fix), index.issue16-regression.test.ts (celebration)
confidence: measured

### Ready-to-continue auto-resume
Idle scan matches assistant text against READY_TO_CONTINUE_PATTERNS ("Ready to continue
with task", "Proceeding with task", …) → sends `continue` immediately without waiting
for the user.
where: src/index.ts lines 149-157 (patterns); 175-181 (containsReadyToContinuePattern); ~1581-1598 (candidate source in checkForToolCallAsText)
test: index.toolext.test.ts ("Ready to continue" cases)
confidence: measured

### Action-intent nudge
Delayed (500ms) check on idle: last assistant line ends with `:` (containsActionIntent,
after XML stripping) → send `actionIntentPrompt`. Skipped while session younger than
warmupMs, when awaiting user input, or when the user was recently active; disabled by
`resumeOnActionIntent: false`. Two call sites (session.status→idle and legacy
session.idle).
where: src/index.ts lines 387-399 (containsActionIntent); 2376-2414 (delayed block, session.status idle); 2456-2492 (legacy session.idle block); 454 (option)
test: index.toolext.test.ts (action-intent detection)
confidence: measured

### Done-claim verification
Idle scan matches done-claim phrasing (DONE_CLAIM_PATTERNS): open todos →
DONE_WITHOUT_WORK_PROMPT ("verify and finish"); no open todos and no concrete work
description in the response (containsWorkDescription) → DONE_WITHOUT_DETAILS_PROMPT
(demand a report). Budget `doneClaimNoTodosAttempts` capped at maxRetries across busy
cycles; only a genuine inbound user message re-arms it (message.updated user role); uses
real `todo.updated` state.
where: src/index.ts lines 183-198 (patterns); 200-210 (prompts); 213-230 (detectors); 2524-2532 (re-arm); ~1517-1630 (candidates in checkForToolCallAsText: done-claim-no-todos, idle-with-open-todos-reminder)
test: index.events.test.ts (DONE_WITHOUT*), index.issue16-regression.test.ts (doneClaim)
confidence: measured

### User-input awareness
Two gates computed at idle and shared by every idle nudge: (1) awaiting-input — newest
assistant message holds a `tool_use` part with `state.status: "pending"`
(hasPendingUserInput); (2) recently-active user — inbound user message within
activeUserWindowMs (15min, `lastUserMessageAt` stamped in message.updated) →
userRecentlyActive. Both stand down idle checks, periodic recheck, delayed action-intent
callbacks and the tool-text scan.
where: src/index.ts lines 921-937 (hasPendingUserInput); 943-945 (userRecentlyActive); 2196-2211 (shared idle computation); call sites 2359, 2387-2394, 2464-2472, 2029-2043, 2154-2163; 2528-2532 (stamp); 479 (option)
test: index.toolext.test.ts (awaiting-input gate + active-user suppression cases)
confidence: measured

### False-positive protection during subagent work
Per-session timer reset only (`touchSession` touches the emitting session, only when
busy & not cancelled); with multiple busy sessions the stall branch is skipped
(numBusy > 1) and the periodic nudge skips subagents + any busy session; idle handlers
clear the existing toolTextTimer before arming a new setTimeout (no queued duplicate
continue).
where: src/index.ts lines 590-595 (touchSession); 1905 (numBusy > 1 skip); 2019-2023 (periodic guards incl. isSubagent); 2416-2417 + 2497-2498 (clearTimeout-before-set); 2103-2106 (per-event touch)
test: index.continue.test.ts ("Continue behavior — subagent running")
confidence: measured

### Spurious error suppression
All logging goes through `ctx.client.app.log()` via `log()` (zero console.log in the
happy path; 5s dedup on debug). `session.error` on an already-idle / no-busy-session
state breaks early (busyCount() === 0) and just resets the in-flight counters — no
action, no user-visible noise.
where: src/index.ts lines 509-528 (log, app.log only); 2611-2618 (early break + counter reset in session.error)
test: none (no dedicated file surfaced in the case-name scan; the handler is exercised by index.session-error.test.ts)
confidence: measured

### Session discovery & cleanup
Every 60s (`SESSION_DISCOVERY_INTERVAL_MS`) `discoverSessions()` calls
`session.list()` and picks up sessions missed by event tracking (new watches, status
sync, lazy todo fetch); initial discovery 5s after start. `cleanupIdleSessions()` drops
idle sessions older than 10min (IDLE_CLEANUP_MS) or beyond MAX_IDLE_SESSIONS (50) —
called each tick.
where: src/index.ts lines 1798-1832 (discoverSessions); 2084-2090 (discoveryTimer + initial); 659-701 (cleanupIdleSessions); 100-102 (constants); 2076-2077 (tick call)
test: index.integration.test.ts, index.plugin.test.ts (discovery references; no dedicated file)
confidence: measured

### Recovery model (README 269)
Cross-cutting: the three families are the same code paths partitioned by guard —
(1) idle-boundary nudges = the session.status→idle / session.idle handlers
(2131-2420, 2494-2501) which fire only after OpenCode reports idle; (2) busy-silence
continue = timer branch 1948-1978 gated by busyStallStrategy (stale-busy continue vs
abort-first vs off); (3) abort-first = `tryAbortAndResume` (1698-1749) with
`pluginAbortInFlight` marking, reachable only from orphan / subagent-stuck /
hallucination / streaming-failure-escalation.
where: src/index.ts lines 1948-1978 (family 2); 1698-1749 + 1709, 1747 (family 3 marker); 2131-2420 (family 1 handlers); 470-473 (strategy option)
test: index.state-machine.test.ts (extended transitions across families), index.busy-stall-strategy.test.ts
confidence: measured

### Architecture (README 295)
The diagram's runtime: every SSE event → `handleEvent` (per-session touch, then switch
over session.status/created/updated/idle/interrupted, message.updated, todo.updated,
session.error, command.executed) + the 5s tick loop (status reconcile, orphan watch,
subagent-stuck, stall, pending-recovery, periodic nudge, cleanup) + 60s discovery + the
returned wiring object (event hook, config, task_complete tool, chat.message,
tool.execute.before/after, command.execute.before).
where: src/index.ts lines 2099-2636 (handleEvent); 1834-2091 (tick loop); 2671-2764 (wiring/return object); 2084-2090 (discovery timer)
test: index.events.test.ts (handleEvent per event type), index.integration.test.ts
confidence: measured

---

## Coverage tally

- In-scope README sections: 20 `###` features (What it does) + Recovery model + Architecture = **22 entries**
- mapped (where: non-UNKNOWN): **22 / 22**
- confidence measured: **22 / 22** (no guessed, no UNKNOWN — every range line-verified by targeted read or line-anchored declaration grep)
- test: dedicated file named: 14 entries; shared/multi-file mapping: 8 entries; `none` (no dedicated file in case-name scan): 3 (Subagent stuck detection, Spurious error suppression — note: Session discovery & cleanup maps to integration/plugin tests as shared)
- notable: `checkForToolCallAsText` (1372-1692, ~320 lines) is the single idle-scan mega-function covering tool-as-text + thinking-tool + ready-to-continue + done-claim + open-todos-reminder + celebration; `sendContinuePrompt` (746-908) is the central send path with the watchdog/escalation chain inside it; the state machine is `interface SessionWatch` (21-63).

## Test layout note (cured 2026-09-21 from knowledge_inbox)

The plugin repo's test files (`src/*.test.ts`) use bun-style
`test("name", ...)` with ZERO `it(` occurrences — Method step 6's
`(describe|it)` case-name grep under-counts them; grep `test(` instead for
case-name audits (verified 2026-09-21, Deep-Dive B run, worker_Q3XS_160K).
