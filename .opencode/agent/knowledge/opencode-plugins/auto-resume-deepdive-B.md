# Deep-Dive B — context overflow + error handling (recipe — PLANNER-CONSOLIDATED, 2026-09-21)
> Base text: RUN 6 (his model map: Q3S) of opencode-auto-resume Phase 2; spec
> `.opencode/agent/handover/handover_task.md`. Complementing material from RUN 5
> (Q3XS): the §7.1 fit-assessment dimension table + the §8.10 token double-add
> item. RUN 7_1 (Q2S, run in parallel; its sibling run 7_2 was interrupted to
> speed it up) independently confirmed every RUN-6 anchor with its own reads.
> All three runs verified every scope anchor and independently caught the spec's
> 1084 line-ref drift (actual symbol: 1122-1159) per their §8.1 notes. Every
> `src/index.ts` line ref below remains from its own run's verified session,
> unchanged; the consolidated file was planner spot-verified 2026-09-21
> (anchors 1122, 1288, 2196, 2284, 2574).
> Source (READ-ONLY, static analysis, NEVER executed):
> `C:/Users/Wasiejen/AppData/Local/Temp/opencode/opencode-auto-resume-master` (`src/index.ts`, 2767 lines).
> Map: `.opencode/agent/knowledge/opencode-plugins/auto-resume-map.md` (planner-verified;
> every line range used here was re-verified by me with targeted reads / line-anchored
> greps this session, except the `getUsableContextLimit` start anchor — see §8).
> Deep-Dive A (planner-verified, same knowledge folder): §3 (timer architecture),
> §4 (send path / watchdog chain), §5 (ESC boundary) are REFERENCED below,
> not re-derived.
>
> Method note: all `src/index.ts` refs were verified in THIS session. Test-file
> case names were extracted with a bounded grep loop; the test files use
> bun-style `test("name", ...)` calls — they contain no `it(` at all (§8).
> Code quotes are kept to at most 6 consecutive lines everywhere.

## 1. Problem map

Failure modes addressed by this topic (every claim below is from this session's reads):

1. **Context saturation — parent path.** An idle parent session whose last
   assistant message used at least `contextSaturationThreshold` (default 0.85,
   option 475-476) of the model's usable window gets the host command
   `session.command({command:"ctx-wrapup"})` — but ONLY if the magic-context
   plugin is installed in the host config, and only ONCE per busy cycle
   (the counter is zeroed in `resetBusyFlags`, 1288).
   Block: 2306-2345 inside the `session.status -> idle` handler; gate conditions
   2313-2319 (`lastTokenTotal > 0`, `contextWrapupAttempts < 1`, not cancelled,
   not completion-signaled, user not recently active); usable-window check
   2320-2324; magic-context gate 2325-2326 (not installed = no intervention,
   early break); counter increment 2327; command send 2333-2336 with the
   trigger constant `CTX_WRAPUP_TRIGGER` (value `ctx-wrapup`, line 119).
2. **Context saturation — subagent path.** Subagents never reach the parent
   block (`if (!w.isSubagent)` opens at 2196); their saturation safety net is a
   separate block 2147-2194: the same token/threshold test, but the action is
   native `session.summarize()` (2183), gated by the opt-in option
   `subagentNativeCompactionEnabled` (default false, 477-478). No
   magic-context detection — native summarize works with or without it
   (comment 2150-2151). Subagent-specific gates: awaiting-user-input skip
   (2154-2161), recently-active-user skip (2162-2163), plus the shared gates
   (2164-2170). `isSubagent` is set at `session.created` from a non-empty
   `parentID` (2428-2440; the parentID extraction is 2434-2438).
3. **Streaming failure while busy.** A host error broadcast
   (`session.error`) that classifies as a streaming failure (231-257) arms a
   pending-recovery flag when the session is busy (2588-2609). If the session
   was already idle (or the error surfaced after idle), an idle-time scan via
   `getLastAssistantError` over message history arms and sends the continue
   prompt immediately (2212-2256).
4. **Silent dead stream.** The unclassified twin: a stream that died
   mid-response leaving the newest assistant message with a finish reason,
   ZERO text parts, and output tokens at or above
   `silentDeadStreamMinTokens` (default 200, option 468-469) (318-347; idle
   handler 2257-2304 incl. the live-status race guard 2269-2281).
5. **Spurious error noise.** `session.error` events that outlive the busy
   state (after user ESC, host re-broadcasts) must not trigger recovery or
   user-visible noise: early break at `busyCount() === 0` (2611) plus
   in-flight counter reset (2615-2618); all logging goes through `app.log`
   only (509-528) with 5s debug-level dedup.

The prerequisite for #1/#2 is passive token capture on `message.updated`
(2519-2550): for assistant messages, the token info (from `info.tokens` or
`tokens`) sets `w.lastTokenTotal` + stamps `lastActivityAt` (2536-2549).
The plugin keeps NO live usable-window value — the window is computed
lazily when needed (step 2 below).

## 2. Context saturation chain (step by step)

Step 1 — token tracking (2519-2550, `message.updated` case).
- Role read from `info.role` with `props.role` fallback (2523); user-role
  updates do the done-claim re-arm and user-recency stamp (2524-2533) and are
  NOT the saturation input; non-assistant breaks (2535).
- Tokens read from `info.tokens ?? props.tokens` (2536); the total is
  `tokens.total` when present, otherwise the sum
  `input + output + cache.read + cache.write` (2539-2544).
- Only stored when the total is a positive number (2545); `w.lastTokenTotal`
  is OVERWRITTEN per update (2548) — it is the newest assistant message's
  total (the session's running total under provider reporting), never a
  cumulative accumulator across turns.
- `lastActivityAt` is stamped on the same branch (2547).

Step 2 — usable-window computation (1115-1159, `getUsableContextLimit`).
- Model resolution: walk messages newest-first to the FIRST user message and
  read `msg.model ?? msg.info.model`, validated as a
  `{providerID, modelID}` string pair; invalid = return null (1124-1137).
- The per-model window: fetch host providers
  (`client.provider.get()`, typed loosely — the call goes through a cast,
  1141-1145), find the provider by id, find the model entry, read
  `entry.limit.{context, output}` (1146-1149); require a positive numeric
  context (1150).
- Formula (mirrors OpenCode's own overflow math per the doc comment
  1117-1120): `usable = context - Math.min(20_000, output ?? 0)` (1151).
- Caching: a plain `Map` keyed `providerID/modelID` (1115); read-through
  with no invalidation — computed once per model for the plugin's life
  (1139-1140, 1152).
- Fail-safe everywhere: null on missing model, missing provider data,
  missing/zero context limit, or ANY throw (1154-1158) — the saturation check
  simply does not fire (no intervention).

Step 3 — magic-context host detection (1086, 1093-1113,
`isMagicContextInstalled`).
- Cached in a module-level `magicContextDetected: boolean | null` (1086).
- Reads `client.config.get()`, walks `data.plugin`; each entry is a string or
  a tuple — the spec is `p` or `p[0]`; installed iff some spec
  lowercased contains `magic-context` (1096-1106).
- Fail-safe: unavailable list or ANY throw returns false WITHOUT caching
  (1099-1102, 1108-1112) so a transient failure can be re-checked on the
  next idle.

Step 4 — parent trigger (2306-2345), fires from `session.status -> idle`.
- Shared idle gate (computed once for the whole parent block, 2196-2211):
  `hasPendingUserInput` over the session's messages (trailing pending
  tool_use) stands down ALL idle checks including saturation (2203-2211).
- Outer gate for the three idle checks (streaming-fail, dead-stream,
  saturation): not awaiting input, not already `pendingRecovery`, not
  completion-signaled, not user-cancelled, not aborting (2212-2218).
- Saturation specifics (2312-2345): gate 2313-2319; `getUsableContextLimit`
  2320; fire when `lastTokenTotal / usable >= threshold` (2321-2324);
  `isMagicContextInstalled` (2325) — if NOT installed the whole handler case
  BREAKS (2326): the ctx-wrapup command does not exist, so native
  compaction must not be used either (its setup disables native compaction —
  double-compression risk, comment 2308-2311); else
  `contextWrapupAttempts++` (2327) — the once-per-busy-cycle budget
  (zeroed by resetBusyFlags, 1288); warn log
  with the ratio and percent (2328-2331); a cancel re-check right before the
  call (2332) that breaks if landed mid-wait; then the awaited command
  `session.command({path:{id}, body:{command: CTX_WRAPUP_TRIGGER, arguments: ""}})`
  (2333-2336). Any throw is swallowed to a debug log (2339-2345).

Step 5 — subagent trigger (2147-2194), fires from the SAME idle handler,
before the parent block (subagents are handled first, 2152).
- Gates (2152-2170): awaiting-user-input skip (2154-2161, its own
  `hasPendingUserInput` computation), recently-active-user skip (2162-2163),
  then `lastTokenTotal > 0`, `contextWrapupAttempts < 1`, not cancelled, not
  completion-signaled, not aborting (2164-2170).
- Same usable + threshold math (2171-2175); NO magic-context check.
- Action only when `subagentNativeCompactionEnabled` (2176): increment the
  once-per-session counter (2177), warn log (2178-2181), cancel re-check
  (2182), then awaited `session.summarize({path:{id}})` (2183).
- Wraparound try/catch per sub-block: errors go to debug only (2187-2193).

Step 6 — thresholds, options, budget.
- `contextSaturationThreshold` option, default 0.85 (475-476).
- `subagentNativeCompactionEnabled` option, default false (opt-in, 477-478).
- `silentDeadStreamMinTokens` option, default 200 (468-469).
- `activeUserWindowMs` option (default 15min per the map, 479-480) drives the
  recently-active gate.
- The budget gate is `contextWrapupAttempts < 1` on BOTH paths (2166
  subagent gate, 2315 parent gate) — once per busy cycle, because
  `resetBusyFlags` zeroes the counter (1288) whenever a fresh busy
  cycle arms the session (1272-1302). This matches the test name
  "at most one parent wrapup per busy cycle".

## 3. Error classification (exact field checks)

### 3.1 `isStreamingFailure` (231-257)
- Signature (231-236): `(errorName, errorMessage, errorNames =
  DEFAULT_STREAMING_FAILURE_ERROR_NAMES, messagePatterns =
  DEFAULT_STREAMING_FAILURE_MESSAGE_PATTERNS)` — both lists are injectable,
  which is how the options (450-453) plug in.
- Both inputs empty → false (237).
- NAME match (240-242): exact, CASE-SENSITIVE membership in the list.
- MESSAGE match (245-253): the message is lowercased ONCE; for each pattern
  the code tries `new RegExp(pattern, "i")` against the lowercased message;
  on an invalid regex it FALLS BACK to a plain case-insensitive substring
  `includes` check (248-252) — pattern robustness, a mis-configured pattern
  degrades to substring matching instead of throwing.
- Default name list (85-91): `ProviderError`, `APIError`, `StreamError`,
  `ConnectionError`, `TimeoutError`.
- Default message patterns (93-98): `streaming response failed`,
  `stream.*fail`, `connection.*reset`, `connection.*closed` (the `*` entries
  are regex; the first is also a valid plain string).

### 3.2 `getLastAssistantError` (265-309)
Walk semantics (doc comment 259-263 states the priority order):
- Walk messages NEWEST-FIRST (268); role read as `msg.role` with
  `info.role` fallback (270-272); non-assistant messages are skipped
  (273).
- Message-level error FIRST: `msg.error ?? info.error` (276-278); if
  present, return `{ name: err.name ?? "", message: err.data.message ??
  err.message ?? "" }` (280-284) — i.e. `data.message` wins over
  `message`.
- Else scan that message's parts NEWEST-FIRST for a part with
  `type === "retry"` carrying an `error` field (287-306) — the SDK
  RetryPart surface; same extraction (292-304).
- A clean assistant message does NOT stop the walk — the function returns
  the error of the NEWEST assistant message that has one (any of the three
  sources), and null only after walking everything (308).
- All field access is defensive (undefined coalescing throughout) — a
  malformed message list cannot throw.

### 3.3 `getLastSilentDeadStream` (318-347) — the three-way criterion
Walks messages newest-first (321); role check as in 3.2 (323-325). For the
first assistant message that has a finish reason:
- finish read as `msg.finish ?? info.finish ?? info.finishReason`
  (328-330); no finish → continue walking back (331).
- Criterion 1 (finish): any truthy finish value — INCLUDING
  `stop`/terminal (the handler's tests confirm: "returns finish reason
  even when terminal (stop) - no text parts"; "idle with finish=stop and
  no text → recovery armed").
- Criterion 2 (no text): a `hasText` part is any part with `type ===
  "text"` and a non-empty string `text` (334-337); reasoning parts do NOT
  count; if any text part exists → return null (338) — a delivered answer
  ends the check (never walk past the final answer to an intermediate
  tool-call step).
- Criterion 3 (token floor, applied by the CALLER, 2265-2267): output
  tokens = `msg.tokens.output ?? 0` PLUS `info.tokens.output ?? 0`
  (340-343); the handler requires `dead.outputTokens >=
  silentDeadStreamMinTokens` (default 200, 82, option 468-469).
- Returns `{ finish, outputTokens }` (344); the handler arms the recovery
  reason as the string `silent-<finish>` (2284).

## 4. Arm → tick → handoff (the B-specific parts)

### 4.1 Where B's failures arm
**(a) `session.error` handler (2568-2620).**
- Error extraction: `getError(ev)` (2569); `errorName` from
  `errorObj.name` (2570); `errorMessage` from `data.message` with
  `String(data)` fallback (2571-2573).
- `MessageAbortedError` (2574): ESC latch on ALL tracked sessions that are
  not `pluginAbortInFlight`, then info log `User abort (ESC)` and break
  (2576-2585) — the full latch mechanics are Deep-Dive A §5; B only needs
  that ESC errors are EXEMPT from recovery (never armed as failures).
- Otherwise, `isStreamingFailure(...)` on the extracted pair (2588-2593).
  If classified AND a session id is present AND that session's watch status
  is `busy` (2598): arm `pendingRecovery = true`,
  `pendingRecoveryReason = errorName`, `pendingRecoveryAt = now`
  (2599-2601) with a state-transition debug line (2602); info log in the
  busy case (2603) and in the non-busy/no-watch case (2605); missing sid →
  warn only (2607). Note: an error on a session that is NOT busy (or whose
  watch is missing) is logged but NOT armed here — that is what the idle
  path below is for.
- Then the hygiene gate (2611-2618) — see §5.

**(b) Idle streaming-failure check (2212-2256)** — re-detects failures
that were not armed by the error event (error landed after idle, or the
broadcast was missed):
- Inside the shared parent idle gate (2212-2218: not awaiting input, not
  already pending-recovery, not completion-signaled, not cancelled, not
  aborting).
- `getLastAssistantError(getSessionMessages(sid))` (2220-2222) — message
  history is the source of truth; then `isStreamingFailure` (2223-2231) with
  the configured name/message lists (450-453).
- On match: arm the same three fields (2232-2234), state-transition +
  info logs (2235-2241), then
  `await tryResume(sid, w, "Streaming failure on idle", continuePrompt)`
  (2242-2247) — the idle path SENDS immediately (subject to tryResume's
  own backoff, A §3/§4), it does not merely wait for the tick.
- `MessageAbortedError` here is deliberately NOT classified (name not in
  the list, empty message) — confirmed by the test "idle with
  MessageAbortedError → NOT classified as streaming failure, no prompt".

**(c) Idle silent-dead-stream check (2257-2304)** — same outer gate:
- `getLastSilentDeadStream(getSessionMessages(sid))` (2262-2264); fire
  only when `dead && dead.outputTokens >= silentDeadStreamMinTokens`
  (2265-2267).
- Race guard (2269-2281): re-poll the host status map — if the session is
  busy or retry again, SKIP (the stream may simply still be live; the
  event and the poll disagree).
- Else arm `pendingRecovery` with reason `silent-<finish>` (2283-2285),
  info log (2286-2289), and `await tryResume(sid, w,
  "Silent dead stream (<finish>)", continuePrompt)` (2290-2295).

### 4.2 The tick's first send (1983-2017)
In the 5s tick loop, per session, before the idle nudges (1983):
- Condition set (1984-1994): `pendingRecovery && status === "idle" &&
  !userCancelled && !aborting && !continuing && !gaveUp &&
  recoveryAttempts === 0`. The `recoveryAttempts === 0` clause is the
  whole handoff contract: the tick only initiates the FIRST recovery
  send; after that the deferred watchdog chain inside
  `sendContinuePrompt` owns the counter (comment 1991-1993; the chain
  itself is Deep-Dive A §4 step 11 — RETRIED up to
  `maxRecoveryRetries` (default 2, 79), then escalates
  to abort+resume, then gives up; NOT re-derived here).
- Backoff (1996-2002): `elapsed = now - pendingRecoveryAt` must be at or
  above `backoffMs(recoveryAttempts, baseBackoffMs, maxBackoffMs)` —
  with attempts always 0 here, that is the base 1000ms (the backoff
  helper itself is the map's 375-385 / A §4 territory). Not elapsed →
  `continue` (retry next tick).
- Send (2004-2011): info log with reason/attempt/maxRetries (2004),
  `recoveryAttempts++` (2006) BEFORE the send, then
  `await sendContinuePrompt(sid, continuePrompt, w)`.
- Failure path (2012-2015): on throw, warn log and
  `recoveryAttempts = 0` — so the TIMER loop can initiate again next tick
  with a fresh backoff; the watchdog only owns the counter while a send
  is actually in flight / verified.

### 4.3 Handoff summary (one pointer, no re-derivation)
B's three arm sites all end in the SAME funnel: arm the
`pendingRecovery` triple (event/idle) → tick sends once when backoff
elapses and attempts are 0 → `sendContinuePrompt`'s deferred watchdog
retries/escalates (Deep-Dive A §4). Cancellation and completion are
re-checked at every stage (A §5 boundary).

## 5. Error hygiene (logging discipline + spurious-error suppression)

- **Single logging channel** (`log()`, 509-528): every log line goes to
  `ctx.client.app.log({body:{service:"auto-resume", level, message}})`
  (524) — app.log only; the ONLY console output in the whole plugin is the
  failure fallback inside `log()` itself (526, if app.log throws) and the
  opt-in `dbg()` (481, `console.log` only when the `debug` option is on).
- **Debug-level dedup** (512-522): identical debug messages within a 5s
  window (`LOG_DEDUP_WINDOW_MS`, 507) are suppressed (key `level:msg`,
  513-516) — comment: log storms during DB contention; the dedup map is
  pruned to the newest 100 entries past 200 (518-521). info/warn/error are
  NEVER deduped (511) — visibility must not be throttled.
- **Spurious `session.error` suppression** (2611-2618): after the
  MessageAborted and streaming-failure branches, the handler hits
  `if (busyCount() === 0) break` (2611) — an error that outlived all busy
  sessions performs NO action and emits no debug log; only when something
  is still busy does it log (2613) and RESET the emitting session's
  in-flight counters `pendingTools = 0; pendingCommands = 0` (2615-2618)
  so a stray error cannot leave a phantom in-flight state that would
  block later abort guards.
- **Why user-visible noise is avoided by design:** (a) errors that arrive
  after the session is no longer busy are dead ends — break, no arm, no
  send; (b) ESC aborts are classified first (2574-2586) and latched as
  user-cancel, never as recoverable failures; (c) recovery activity is
  logged at info/warn level in app.log (a developer log, not a UI
  surface) and the sent prompt is the plain `continue` string
  (456-457 default) — no banners, toasts, or special phrasing reach the
  user; (d) the watchdog's disarm-on-cancel (A §4 step 11) and the tick's
  `recoveryAttempts === 0` gate (1993) mean a dead session burns zero
  attempts — no retry storms after the fact.

## 6. Recipes (one block per mechanism: reuse/adapt + what its tests prove)

**R1 — Token capture on `message.updated` (2536-2549).**
Reuse: per-update OVERWRITE of a single `lastTokenTotal` (newest assistant
message's reported total, with the `total ?? input+output+cache.read+
cache.write` fallback), stamped only when positive. Adapt: we already have
a per-session context gauge (the injected `ctx:` readout) — this is the
reference's raw input layer, and its value is a model-independent
saturation signal that a gauge nudge cannot provide. Tests: no dedicated
file; exercised indirectly by `index.context-saturation.test.ts`
("tokens below threshold → no intervention", "custom threshold option is
respected").

**R2 — Usable-window formula + per-model cache (1115-1159).**
Reuse: `usable = context - min(20_000, output)` read from host provider
limits, cached per `providerID/modelID`, null-fail-safe (no intervention
on any lookup failure). Adapt: our compaction plugin resolves model pairs
but never reads window sizes — adopting this gives a concrete
"percent-of-window" trigger instead of our model-judged stop line.
Tests: `index.context-saturation.test.ts` — "provider limits unavailable
→ no intervention (fail-safe)".

**R3 — Host-feature detection with fail-safe no-cache (1086, 1093-1113).**
Reuse: scan `config.get().data.plugin` for a substring, cache a
true/false ONCE, but never cache failures (retry next time). Adapt:
directly applicable to any of our plugins that must condition on host
state (e.g. "is another compaction feature active — don't double-fire").
Tests: `index.context-saturation.test.ts` — "magic-context NOT in config
→ no intervention (fail-safe)", "config.get fails → no intervention
(fail-safe)".

**R4 — Parent saturation → host command (2306-2345).**
Reuse: gate stack (tokens present, once-per-busy-cycle budget, not
cancelled/completed, user not recently active) + threshold + feature gate
+ cancel re-check right before the call + fire-and-forget-awaited
`session.command`. Adapt: our stack has no `ctx-wrapup` command; the
pattern maps to "fire OUR OWN trigger mechanism (compact_memory-style
dispatch) from an idle-boundary event hook", once per busy cycle.
Tests: `index.context-saturation.test.ts` — "saturated parent +
magic-context detected → session.command(ctx-wrapup)", "userCancelled →
no intervention", "at most one parent wrapup per busy cycle".

**R5 — Subagent saturation → native summarize (2147-2194).**
Reuse: same math, different actuator: native `session.summarize()` — no
host-feature gate needed; opt-in option defaulting OFF. `isSubagent`
derived at `session.created` from `parentID` (2428-2440). Adapt: this is
the closest analog to our existing `compact_memory` summarize path — the
reference proves the idle-boundary, auto-fired variant of exactly the
call we already make manually.
Tests: `index.context-saturation.test.ts` — "saturated subagent + native
compaction enabled → session.summarize", "…disabled → no intervention",
"…enabled without magic-context → native summarize (no MC detection
needed)", "nested session.created parent metadata routes a subagent to
native summarize".

**R6 — Streaming-failure classifier (231-257, 85-98, 450-453).**
Reuse: two-stage classification — case-SENSITIVE exact name list, then
case-INSENSITIVE regex over the message with substring fallback on
invalid regex; both lists injectable via options. Adapt: the pattern
robustness (invalid regex degrades instead of throwing) is worth copying
verbatim for any error-name table in our stack.
Tests: `index.streaming-failure.test.ts` — 24 cases in one describe:
name-match exactness/case-sensitivity, each default pattern, uppercase/
mixed-case message matches, invalid-regex substring fallback, empty/
null inputs, custom-config override.

**R7 — Message-history error walk + idle arm/send (265-309, 2212-2256).**
Reuse: newest-first walk returning the newest assistant message carrying
`msg.error`/`info.error`/retry-part `error` — the message list as source
of truth for what already happened (events are lossy); on match, arm
AND send through the shared funnel (`tryResume`).
Tests: `index.streaming-failure-idle.test.ts` — 8 `getLastAssistantError`
cases (nested info.error, retry-part scan, last-not-earliest, data.message
fallback, priority order) + 7 idle-handler cases (arm+send on message.
error/info.error/retry-part; ESC NOT classified; no re-arm when already
armed).

**R8 — Silent-dead-stream detector + token floor + race guard
(318-347, 2257-2304, 468-469, 82).**
Reuse: the three-way criterion (finish reason present, zero text parts,
output tokens >= floor, floor optionable default 200) + the live-status
re-poll before acting (busy/retry again = skip). Adapt: the floor is the
key anti-false-positive — short empty turns are normal.
Tests: `index.silent-dead-stream.test.ts` — 24 cases: finish shapes
(`finish`/`info.finish`), terminal `stop` still counts, text-part
suppression, token combining across msg/info, exact-threshold arm,
below-threshold no-arm, the REGRESSION case (tool-call step then final
text answer → no recovery), and the busy-again race guard.

**R9 — Arm → tick → watchdog handoff (2588-2609, 1983-2017 + A §4).**
Reuse: the three-field `pendingRecovery{,Reason,At}` arm; the tick's
FIRST-send-only contract (`recoveryAttempts === 0`) with backoff; the
reset-to-zero on send-failure so the timer can re-initiate. Adapt: the
clean ownership split — events/idle ARM, the tick makes ONE gated send,
the send path's deferred watchdog owns retries/escalation — is the
transferable architecture.
Tests: `index.pending-recovery.test.ts` — 19 cases across 8 describes:
each guard (not-idle, cancelled, in-flight, gaveUp, not-armed,
`recoveryAttempts > 0` = watchdog owns the counter), backoff window,
once-per-tick trigger, per-session isolation, clear-on-busy / clear-on-
command.executed / clear-on-escalation, and failed-send reset.

**R10 — Hygiene: app.log channel + debug dedup + early break
(509-528, 2611-2618).**
Reuse: all logging through ONE app.log channel with service tag;
debug-only 5s dedup with bounded map; `busyCount() === 0` early break +
counter reset as the noise suppressor. Adapt: our plugins currently
mix console and file logging — centralizing on app.log with dedup would
apply directly.
Tests: no dedicated file (map confirms); `index.session-error.test.ts`
covers the suppression behavior — "TC-06: streaming failure with
busyCount === 0 → logged, break before recovery state".

## 7. Fit assessment (against OUR stack — focus `.opencode/plugin/compact_memory.ts`)

Reference (this run's verified facts, compact_memory.ts, 651 lines):

**Detection — how a session is known to need compaction.**
- The plugin measures NOTHING itself. "Knowing" is delegated: (a) the
  calling model decides (tool description, 465: "use it at the stop line
  / near-limit triage (self) or before a task_id resume of a session that
  died at its limit (cross)") — on this host, supported by the injected
  context-gauge readout; (b) a hard budget gate at call time:
  `classifyQuantClass(model)` cap (CPU 0, 4-bit 3, 3-bit 1, default 1 —
  76-82) vs the on-disk per-session count (120-183, v2 schema, shared
  file with the deactivated `context_recovery.ts` T5 hook, 110-118);
  denial = zero side effects + "hand over and start fresh" (535-547).
- Contrast with the reference: model-INDEPENDENT — passive token capture
  (2536-2549), usable-window formula (1122-1159), 0.85 threshold,
  evaluated at the idle boundary, once per busy cycle (1288). The
  reference does not trust the model to notice saturation at all.

**Trigger — tool-call vs idle-boundary command/summarize.**
- Ours: an explicit `compact_memory` tool call from the model
  (execute, 475-647) → fire-and-forget dispatch, NO await — an awaited
  call deadlocks on the single llama-swap model slot (569-581, documented
  live evidence); client-path probe by `typeof` — v2
  `session.compact({sessionID})` flat, else v1 `session.summarize`
  (the ACTIVE path on this build, 581-643); success verified
  ASYNCHRONOUSLY (budget increment + COMPACT line in ctx.log only on
  verified success, 591-592/623-624); pre-compaction dump before any
  dispatch (549-555, TODO #152); keep fields sent with one retry without
  them on rejection (362-403).
- Reference: host-side and automatic at `session.status -> idle`:
  parent → `session.command({command:"ctx-wrapup"})` (requires
  magic-context installed in host config, 2325-2336); subagent → native
  `session.summarize` (opt-in, 2176-2183); both AWAITED inline (their
  host has no single-slot deadlock issue); zero model participation.

**Model-pair resolution.**
- Ours: SELF → `toolCtx.extra.model`; CROSS → last entry of
  `session.messages` (info.modelID/info.providerID or info.model object);
  explicit providerID+modelID override (518-526); degradation never
  throws (notes instead, 423/432-434/454-456); an unresolvable pair
  means the request is NOT sent (610-614) — the v1 summarize body REQUIRES
  both ids (370-378, 405-411).
- Reference: sends NO model pair — the host's default compaction model
  applies for both `ctx-wrapup` and native summarize.

**What B would add to our stack.**
1. A model-independent saturation safety net: token capture +
   usable-window math + threshold at an idle-boundary hook, firing the
   SAME `session.summarize` call our plugin already makes — as a
   DISPATCH (not an await, per our slot constraint), success-verified
   async, exactly like the existing v1 path. This covers the failure
   class the model itself cannot see (stalled/died session that never
   calls the tool).
2. A trigger-side budget: the reference's once-per-busy-cycle
   `contextWrapupAttempts` (zeroed at 1288) would complement — not
   replace — our per-session per-quant-class CALL budget; both would
   live in the same shared file (already shared with the T5 hook).
3. Error classification + suppressed auto-recovery (R6-R10): streaming
   failure / silent dead stream currently end in handoff+restart for us;
   the classifier + arm/tick/watchdog chain + app.log-only logging with
   dedup would automate the recovery and silence the noise.
4. Host-feature detection (R3) as the anti-double-compression gate
   whenever two compaction mechanisms coexist in the host config.

### 7.1 Dimension-by-dimension table (carried from RUN 5)
| dimension | reference (B) | our `compact_memory` | verdict |
|---|---|---|---|
| **Detection** | plugin-side, AUTONOMOUS: token tracking from `message.updated` (`lastTokenTotal`, 2536-2549) + `usable = context − min(20k, output)` from `provider.get` (1122-1159) + threshold 0.85 at the idle boundary | NONE plugin-side — the tool is invoked explicitly; the "needs compaction" decision lives in the model/role prompt (stop line ≈90 %, cross-session dispatch per planner), and is backed only by budget verification on call (cap/class resolution at call time, 535-547) | B adds a self-detecting saturation layer: the session compacts ITSELF when it saturates, without a human deciding "compact now". Our side has no equivalent signal path today. |
| **Trigger** | idle-boundary HOST calls: parent → `session.command({command:"ctx-wrapup"})` (2333-2336 — requires the third-party magic-context plugin registered on the host), subagent → native `session.summarize({path:{id}})` (2183, opt-in, no magic-context needed) | in-TURN tool execution → `summarize({path:{id}, body:{providerID, modelID}})` (607-631, THE ACTIVE PATH on this build); no host event wiring | On our host only the `summarize` path is live. Note: the reference passes NO model in its summarize body (native resolution); ours MUST carry `providerID`+`modelID` (server payload schema, 608-615). Our dispatch is fire-and-forget + verified-async; the reference awaits its command/summarize call inside the idle handler. |
| **Model-pair resolution** | `getUsableContextLimit`: model read from the LAST USER message (`m.model ?? m.info.model`, 1128-1131) → `provider.get()` for the LIMITS only (no pair is passed to summarize) | `resolveModel`: SELF = `c.extra?.model.id`; CROSS = last entry of `session.messages({path:{id}})` (`info.modelID` assistant / `info.model` user); explicit `providerID`+`modelID` args OVERRIDE (513-531); RPC failure → degradation NOTE, never throw; unresolvable → request NOT sent (no budget burned) | Ours is the stronger, already-proven implementation for this build. If a detection trigger (from column 1) were built, it could reuse `resolveModel`'s cross-session read for the summarize body, and the reference's per-model LIMIT cache for the threshold math. |
| **Budget / cap** | once per busy cycle: `contextWrapupAttempts < 1`, increment-before-call, reset in `resetBusyFlags` (1288) | per-session quant-class cap (cpu 0 / 4-bit 3 / 3-bit 1, 76-82), increment-ON-VERIFIED-SUCCESS to a disk store (108-118, 535-547) | Different purposes: the reference prevents repeated wrapup commands within a work cycle; ours caps TOTAL compactions per session (and denies further handoff pressure). They compose, not collide. |
| **Cancel / user gates** | `!userCancelled && !completionSignaled` + a second cancel `break` right before the call (2316-2317, 2332; subagent: 2167-2168, 2182) | none — the tool call itself IS user-driven, no ESC race on dispatch (it returns text synchronously, the dispatch is background) | If an autonomous trigger is added, the cancel gates become mandatory (a compaction dispatched into a user-cancelled session would fight the user). |

## 8. Unverified / unclear (claim + the check tried)

1. **Spec line-1084 anchor for `getUsableContextLimit`** — the spec says
   "1084-1084 (getUsableContextLimit)"; line 1084 is actually the closing
   brace of `hasBusySubagents`. Symbol-anchored read (1080-1165) places
   `getUsableContextLimit` at 1122-1159 (map agrees). Trust-the-symbol
   applied; all its refs in this recipe use 1115-1159.
2. **`getLastSilentDeadStream` walk-back vs its doc comment** — the
   comment (311-317) says "Only the newest assistant message is
   evaluated", but the code does `if (!finish) continue` (331), walking
   back through assistant messages that LACK a finish reason — so an
   intermediate tool-call step (finish, no text) could be reported when
   every NEWER assistant message has no finish. Check tried: read the
   function + scanned the 6 test files' case names — the regression test
   covers "newest has text → no recovery" and "no finish on the newest
   → no recovery", but NO case covers a newer assistant message that
   lacks a finish over a dead older one. Static analysis only; nothing
   executed.
3. **Token-total fallback semantics (2539-2544)** — the fallback sums
   `input + output + cache.read + cache.write`; whether the primary
   `tokens.total` already includes the cache components (making the two
   readings equivalent) cannot be verified without a live session's
   token payload. Both shapes were read; equivalence is unproven.
4. **`break` inside the idle handler skips the rest of the case** — the
   cancel re-check (2332/2182) and the not-magic-context gate (2326) use
   `break`, which exits the whole `session.status` switch case, so the
   remaining idle work for that event (open-todos nudge 2348+,
   action-intent 2376-2414, toolTextTimer 2416-2419) is skipped on those
   paths. Check tried: read the enclosing structure (2131-2426); no
   runtime observation.
5. **`session.error` never arms the dead-stream path** — only the idle
   handler evaluates `getLastSilentDeadStream`. That a dead stream is
   detectable only from MESSAGE state (not from any error event name) is
   a code reading + TC-04 ("generic error on busy session → no streaming
   classification"); no comment states the intent.
6. **Test-file call style** — the 6 in-scope test files use bun-style
   `test("name", ...)` with zero `it(` occurrences (verified by per-file
   counts); the Phase-1 map's case-name command greps `describe|it` and
   would have under-counted them.
7. **"Once per session" vs once per busy cycle** — the map's feature
   index says "once per session, contextWrapupAttempts < 1"; a
   symbol-anchored grep (`contextWrapupAttempts`) finds `resetBusyFlags`
   zeroing it (1288) on every busy arm — the budget is once per busy
   CYCLE, matching the test name "at most one parent wrapup per busy
   cycle". This recipe uses the cycle wording.
8. **Prior run-5 B recipe** (`auto-resume-deepdive-B_5.md` on the
   scratchpad) — an earlier independent extraction of the same topic
   exists; this run 6 did not read, reuse, or diff against it (its
   header was the only part seen).
9. **`session.summarize` body/pair in the reference** — the reference
   calls `summarize({path:{id}})` with no body (2183); on WHICH host
   model the native summarize runs is unspecified in the source (assumed
   host default). No check possible without executing (forbidden here).

10. **Token double-add in `getLastSilentDeadStream` (342-343, caught by RUN 5,
    carried into this consolidation):** `outputTokens = (msg.tokens?.output ?? 0) +
    (info?.tokens?.output ?? 0)` — if the host ever sets BOTH token sources, the
    floor comparison double-counts. Unverified (static analysis only); the case
    names cover the two SHAPE cases but not a both-tokens fixture. (RUN 6's own
    §8.3 covers the related-but-different token-total fallback semantics.)

<!-- END OF RECIPE (run 6, base of the consolidation) -->
