# Deep-Dive A — continuous auto-start (recipe) — opencode-auto-resume

> Planner-verified 2026-09-18 (direct ses_f4a3f85e): spot-checks passed —
> watchdog-guard sites (747/754/759/864/879), the continuing-latch block
> (747-753) and `pluginAbortInFlight` set/exempt (1709/2578) verbatim against
> `src/index.ts`; the §7 fit-assessment registration list matches our live
> `ctx_watchdog.ts` return object (726-731). One worker line-ref error fixed
> in consolidation: §8 item 1 `checkSessionHasActiveTool` "190-190" →
> `1161-1190` (the map-verified range). Source run: scratchpad
> `auto-resume-deepdive-A.md` (commit d8a6ee2).

Worker: worker_Q4_140K, session ses_f49eda7a1ffezGm7zQi15jhpBs (2026-09-18).
Source (READ-ONLY, static analysis, never executed): `C:/Users/Wasiejen/AppData/Local/Temp/opencode/opencode-auto-resume-master`
All `src/index.ts` line refs below were read/verified in this session unless marked *(map)*.
Map: `.opencode/agent/knowledge/opencode-plugins/auto-resume-map.md` (Phase 1, planner-verified).

**Topic:** how the plugin keeps a stalled/dead session moving without user clicks,
without ever fighting the user's ESC.

## 1. Problem map

Four failure modes; each names its trigger + where it is detected/acted.

| # | failure mode | trigger conditions | detection / action |
|---|---|---|---|
| P1 | **Busy-silence stall** — host reports `busy` but nothing happens for ~48s | `w.status === "busy"` AND `now - w.lastActivityAt >= chunkTimeoutMs + gracePeriodMs` (default 45s + 3s), AND not cancelled/completed/aborting (1850-1851), AND no in-flight tool | 5s tick stall branch 1948-1978; action per `busyStallStrategy` (470-474): `continue` → `tryResume` (1970), `abort` → `tryAbortAndResume` (1968), `off` → skip (1950-1953) |
| P2 | **Stale-busy needing abort** — same silence, but the stream connection itself is dead so a plain `continue` prompt cannot land | same as P1 with `busyStallStrategy: "abort"`; also the escalation terminal of the watchdog chain (893) and of the hallucination-loop branch (1765-1780) | `tryAbortAndResume` 1698-1749: `session.abort` (1711) → 2s delay (1722) → `sendContinuePrompt` (1735) |
| P3 | **Orphaned parent with dead child** — child finished/died, parent sits `busy` forever waiting | busy-count edge `prevBusyCount > 1 && currentBusy === 1` (2136) → orphan arm; then `now - orphanWatchStartAt >= subagentWaitMs + gracePeriodMs` (default 15s + 3s, 1855) | arm in event handler (2136-2143); decision in tick (1853-1903): child `crashed` → `recoverSubagent` first (1876), child `idle` + no busy subagent → abort+resume parent (1889); retries exhausted → `gaveUp` (1894-1900). Secondary busy-side path: 1907-1946 (10s probe cooldown 1908) |
| P4 | **User-cancel vs plugin-abort collision** — the plugin's own `session.abort` emits the same `MessageAbortedError` the user's ESC does; without a marker the plugin would latch `userCancelled` on its own sessions and back off permanently | `session.error` with `errorName === "MessageAbortedError"` (2574) | all-sessions latch at 2576-2583 EXCEPT sessions with `pluginAbortInFlight` set (2578); the latch is set at 1709 (before abort), cleared at 1718 (abort failed) / 1747 (finally). Complements: `session.interrupted` 2506-2517, status `"interrupted"` 2123-2130 (both target only the emitting sid) |

Adjacent (same mechanism family, one line each): streaming-failure stall — `session.error` classified by `isStreamingFailure` arms `pendingRecovery` while busy (2595-2609); the tick sends the first recovery (1983-2017) and the watchdog chain in `sendContinuePrompt` owns retries/escalation (853-894). Silent dead stream (map: 318-352, 2257-2304) and subagent-stuck recovery *(map)* reuse the same arm→tick→send chain.

## 2. State machine

Auto-start-relevant fields of `SessionWatch` (interface 21-63; all verified):

| field (line) | role in auto-start |
|---|---|
| `status` (24) | `busy\|idle\|retry\|unknown`; tick skips non-busy (1849); event handlers set it; tick re-polls and reconciles (1843-1847) |
| `lastActivityAt` (23) | recency base for every threshold (stall 1948, subagent 1911); stamped by events and by `chat.message` (2695) |
| `userCancelled` (25) | ESC latch — gates every send (751), every tick branch (1850), abort (1703); lifted ONLY by a genuine user `chat.message` (2704) |
| `completionSignaled` (49) | task_complete/🎉 latch — same gates as userCancelled (751, 2703-2705) |
| `resumeAttempts` (26) / `lastRetryAt` (27) | backoff counter + backoff clock: `backoffMs(resumeAttempts, 1000, 8000)` gate (1761-1763); `>= maxRetries` (3) → `gaveUp` (1972-1976) |
| `gaveUp` (28) | terminal latch per session; stops orphan watch (1894-1900) and stall branch (1972-1976) until re-armed by a new user message / event resets |
| `orphanWatchStartAt` (29) | orphan arm timestamp (2139); reset by `resetIdleFlags` (1304-1310: also resets `aborting`, `idleSince`, and the in-flight counters `pendingTools/Commands`) |
| `aborting` (30) | one abort in flight per session; gates tick (1851) + abort re-entry (1704) |
| `pluginAbortInFlight` (31) | self-identification for the ESC boundary (1709, 1718, 1747; read at 2578) |
| `continuing` (36) | send latch held across the `session.prompt` await (753 → 843); makes re-entrancy impossible except via `watchdogRetryGuard`; also the discriminator for `chat.message` re-arm (2702) |
| `watchdogRetryGuard` (62) | set by the watchdog before its recursive `sendContinuePrompt` (864) so the `continuing` latch does not block the retry; re-arms `pendingRecovery` on re-entry (754-758) |
| `pendingRecovery{,Reason,At}` (58-60) | armed on streaming failure (2599-2601); backoff clock from `pendingRecoveryAt` (1996-2002) |
| `recoveryAttempts` (61) | watchdog-chain counter, owned by the watchdog once `> 0` (1983-2017 comment WP-05); cap `maxRecoveryRetries` (2) → escalate |
| `continueTimestamps` (34) | ring of continue-send timestamps, pruned to `loopWindowMs` (10 min) — feeds `isHallucinationLoop` |

Chain (arm → trigger → send → retry → escalate → gaveUp):

- **ARM (event side, 2095-2636):** status→interrupted latches `userCancelled` (2123-2130); idle + busy-edge arms `orphanWatchStartAt` (2136-2143); `session.error` streaming-failure arms `pendingRecovery` (2595-2609); `message.updated` role=user stamps `lastUserMessageAt` + resets done-claim budget (2524-2532); `chat.message` lifts the cancel latches (2691-2708).
- **TRIGGER (5s tick, 1834-2091):** orphan watch (1853-1903), subagent-stuck (1907-1946), stall branch (1948-1978), pending-recovery first send (1983-2017).
- **SEND:** `tryResume` → backoff gate (1761-1763) → hallucination check (1765-1780) → `sendContinuePrompt` (1787); `tryAbortAndResume` → abort → 2s → `sendContinuePrompt` (1735).
- **RETRY:** transport-level single retry inside `sendContinuePrompt` (829-835); watchdog `setTimeout(3s)` retry loop with backoff (850-879); tick re-trigger while `recoveryAttempts === 0` (1983-2017).
- **ESCALATE:** watchdog exhausted → `tryAbortAndResume` (887); `tryResume` hallucination branch → `tryAbortAndResume` (1780).
- **GAVE UP:** `resumeAttempts >= maxRetries` → `w.gaveUp = true` + warn (1972-1976; orphan variant 1894-1900); watchdog abort failed → gave-up log (890-893).

```
 events (ARM)                          5s tick (TRIGGER)                      SEND/RETRY/ESCALATE
 status idle ──┐                    ┌ orphan armed ──────> probe child ──> recover child
 status interrupted ─┐              │                        └ no child ──> abort+resume(P2)
 session.error(fail) ─┼-- latches --> busy silent >=48s -- strategy: continue -> tryResume --> backoff? --> sendContinuePrompt
 orphan edge(2->1) ───┘   (SessionWatch)      abort    -> tryAbortAndResume        (retry x1 on error)
                                                             ^                         |
                                                            +--- watchdog 3s: busy? OK : retry(<=2, backoff)
 tick re-trigger while recoveryAttempts==0 -----------------+                          +--- exhausted -> tryAbortAndResume -> gaveUp
```

## 3. Timer architecture

**What the 5s tick owns** (`startTimer`, 1834-2091 — the ONLY place side-effecting sends for the busy family originate):
- status reconcile: polls the host status map every tick and overwrites drifting `w.status` (1838-1847) — events are assumed lossy/laggy, the poll is the correction;
- orphan-watch decision (1853-1903) and subagent-stuck decision (1907-1946) — both need a polled child-status probe (`checkSubagentStatus` *(map)* 1192-1242), so they cannot live in the event path;
- busy-silence stall branch (1948-1978);
- pending-recovery FIRST send (1983-2017) — deliberately only while `recoveryAttempts === 0` so the watchdog chain owns the counter afterwards (WP-05, 1983-1987 + 853-879);
- periodic idle open-todos nudge (2019-2074) and `cleanupIdleSessions` (2076-2077).
- Separate 60s `discoveryTimer` → `session.list()` pickup (2084-2090) + initial discovery at 5s (2090).

**What event dispatch owns** (`handleEvent`, 2095-2636):
- all ARMS (status transitions, orphan arm, pending-recovery arm, cancel latches, user-recency stamps — see §2);
- per-session one-shot `setTimeout`s stored ON the watch (`toolTextTimer`, idle scan *(map)* 2416-2419; action-intent 500ms *(map)* 2376-2414) — cleared explicitly on every cancel path (2128, 2513) so a cancelled session cannot still fire a queued send;
- `chat.message` hook re-arm (2691-2708).

**Design lesson (why this split):**
1. Events are cheap, immediate, per-session → detect and arm; the tick is the single gated funnel where polling-backed decisions (real status, child probes) and budget checks (backoff, caps, `gaveUp`) run. No event handler ever sends directly for the busy family — this is what prevents double-sends when several events arrive in one tick window.
2. Never trust event state alone: the tick re-polls the host status map and reconciles (1843-1847), and the send path re-checks cancel right before sending (809) — every stage re-validates because the host and the plugin's shadow state can both be stale.
3. Final backstop is inside the funnel itself: `userCancelled || completionSignaled` at 751 + the `continuing` latch at 747-750 make `sendContinuePrompt` safe to call from ANY caller (tick, watchdog, orphan, recovery) — callers never re-check everything themselves.
4. Hygiene: both `setInterval`s are `.unref()`-ed (2081, 2087) so the plugin never keeps the process alive; per-session one-shots live on the watch and are cleared on cancel (cancellation actually KILLS pending sends, not just future ones).
5. Deterministic in-flight counters (`pendingTools`/`pendingCommands` maintained by `tool.execute.before/after` hooks *(map)* 2710/2758) are checked FIRST, with a polled API fallback (`checkSessionHasActiveTool` *(map)* 1161-1190) for sessions discovered without hook data — every abort path carries both guards (1859/1868, 1918/1924, 1956/1961, 1766/1772).

## 4. Send path — `sendContinuePrompt` (746-908) step by step

1. **Re-entrancy guard** (747-750): `w.continuing && !w.watchdogRetryGuard` → skip. One send in flight per session; the ONLY exception is the watchdog's own recursive retry, which sets `watchdogRetryGuard` first (864).
2. **Cancel/completion gate** (751): `userCancelled || completionSignaled` → silent return. (Backstop — valid for every caller.)
3. **Latch** (752-753): `w.continuing = true` — held across the message fetch AND the prompt await; this is also what `chat.message` uses to recognize the plugin's own prompts (2696-2702).
4. **Watchdog re-arm** (754-759): if re-entered via the watchdog guard, keep `pendingRecovery = true` (so the retried prompt's own deferred watchdog continues the escalation chain, WP-05), then clear the guard.
5. **Agent/model extraction** (761-803): fetch messages (`getSessionMessages`), walk NEWEST-FIRST to the first `role === "user"` message; read `agent` from the top-level field with fallback to `msg.info.agent` (773-781) and `model` from top-level with fallback to `msg.info.model`, validated as `{providerID, modelID}` strings (783-800). Result: the recovery prompt keeps the user's UI agent/model selection instead of silently falling back to host defaults.
6. **Pre-send cancel re-check** (806-809): ESC may have landed while step 5 was fetching — never send into a cancelled session.
7. **Send** (810-817): `ctx.client.session.prompt({ path: { id }, body: { parts: [{type:"text", text}], agent, model } })` — awaited (not fire-and-forget) so the response/error is observable.
8. **Bookkeeping** (818-824): log the response; `recordContinue(sid)` (489-497: push timestamp, prune older than `loopWindowMs`); `w.lastRetryAt = now` (backoff clock for both the stall branch and the watchdog).
9. **One transport retry** (825-840): on `session.prompt` throw, re-send the identical body once (829-832); if the retry also throws, re-throw (839) — the CALLER logs/handles; `recordContinue` + `lastRetryAt` also run after a successful retry (834-835).
10. **Finally** (841-846): `continuing = false`; `todoCheckAttempts = 0`; clear `toolTextTimer` (a fresh send obsoletes any queued idle scan).
11. **Deferred watchdog** (850-907), `setTimeout(toolTextCheckDelayMs)` = 3s after send returns:
    - `status === "busy"` → success log (899-906) — the send worked.
    - not busy + `pendingRecovery` + (`userCancelled || completionSignaled`) → **disarm** (856-860): clear reason, `recoveryAttempts = 0` — otherwise the retry would burn an attempt on a dead session and re-fire on re-engagement.
    - not busy + `pendingRecovery` + `recoveryAttempts < maxRecoveryRetries` (2) → `recoveryAttempts++`, set `watchdogRetryGuard`, log backoff, recurse into `sendContinuePrompt` with the plain `continuePrompt` (871-872); if that throws → `recoveryAttempts = 0` (873-878) so the TIMER loop re-initiates fresh; clear the guard (879).
    - not busy + `pendingRecovery` + attempts exhausted → clear the latch (882), escalate to `tryAbortAndResume` (887); if abort+resume fails and nothing is aborting → gave-up log (890-893).
    - not busy, no `pendingRecovery` → warn only (896-898) — plain continues are NOT auto-retried here; they rely on the tick's backoff/stall branch.

Note: `w.pendingRecovery` must have been armed at send time for the watchdog to do anything beyond a warn — the plain stall path (`tryResume`) therefore self-heals on the NEXT tick, while streaming-failure recovery self-heals within the watchdog chain (853-894).

## 5. ESC boundary — user-cancel vs the plugin's own aborts

**User-cancel signals (three, all latch `userCancelled`):**
1. `session.error` with `errorName === "MessageAbortedError"` (2574) — the host's broadcast for an aborted message; handler loops **ALL tracked sessions** and latches each one that is NOT `pluginAbortInFlight` (2576-2583), sets status idle + `resetIdleFlags`.
2. `session.interrupted` event (2506-2517) — latches only the emitting sid.
3. `session.status` → `"interrupted"` (2123-2130) — same, emitting sid; also refreshes `prevBusyCount` (2129) so the orphan arm (2136) does not mis-fire right after a user cancel.

All three also: status → idle, `resetIdleFlags` (1304-1310: clears `aborting`, `orphanWatchStartAt`, stamps `idleSince`, zeroes the in-flight counters), and clear the per-session `toolTextTimer` (2128/2513) — a queued idle scan cannot fire after ESC.

**Why the plugin's own aborts do not count as user cancels:** `tryAbortAndResume` calls `session.abort` (1710) — the host responds with the SAME `MessageAbortedError`. The distinguishing marker is `pluginAbortInFlight` (field 31): set BEFORE the abort call (1709), cleared on the abort-failure path (1718) and in `finally` (1747). The all-sessions error latch skips any watch with the marker (2578). Timing window: between the abort landing and the `finally` clear, a genuine user ESC on ANOTHER session still latches that other session — the exemption is per-session, not global.

**The `continuing` latch + `chat.message` re-arm (2691-2708):** every prompt sent through `session.prompt` — including the plugin's recovery prompts — arrives back as a `chat.message`. The hook:
- always stamps `lastActivityAt` (2695);
- if `w.continuing` is set (plugin send in flight, held across the await — §4.3) → `return` without lifting anything (2702);
- otherwise the message is a genuine user (or external client) prompt → lift `userCancelled` AND `completionSignaled`, re-arming auto-resume for the new work round (2703-2705, issue #16).

`message.updated` role=user (2524-2532) deliberately does NOT lift `userCancelled` — it only resets the done-claim nudge budget and stamps user recency (active-user suppression). Lifting belongs to `chat.message` exclusively.

**Backstop re-checks on the outbound side** (cancel can land between decision and send):
- before `session.prompt` (809) — the message-fetch await is the race window;
- during the abort→continue 2s delay (1728-1732) — stand down instead of sending into a cancelled session;
- in the watchdog (856-860) — disarm rather than retry.

Net contract: a user ESC permanently pauses auto-start for that session; the only release is a real new user message, and the plugin can never mistake its own aborts (or its own prompts) for user input.

## 6. Recipes (per mechanism: what to reuse/adapt + what its tests prove)

**R1 — Busy-silence stall with a strategy option (P1/P2).**
Reuse: threshold formula `now - lastActivityAt >= chunkTimeout + grace`; the three-way
`busyStallStrategy` option normalized at parse time (`abort`/`off` pass, anything else →
`continue`, 470-474); the double tool guard before ANY action (deterministic hook counters
first, polled API fallback second); backoff + `maxRetries` + `gaveUp` latch.
Adapt: our `ctx_watchdog` already receives `session.status` events — arm the watch there,
decide in a tick.
Tests prove: `index.busy-stall-strategy.test.ts` ("busyStallStrategy" — the option's
three-way routing); `index.continue.test.ts` ("single session", "repeated continues until
done", "periodic idle recheck"); `index.backoff.test.ts` ("formula verification", "cap
enforcement", "config variations", "edge cases", "integration with the timer loop").

**R2 — The gated send funnel (send → one retry → watchdog chain).**
Reuse: agent/model extraction from the last USER message (761-803 — preserves the user's
UI selection); pre-send cancel re-check (809); exactly one transport retry (829); the
`continuing` latch with the explicit `watchdogRetryGuard` re-entry exception (747, 864);
the deferred 3s watchdog that VERIFIES the send made the session busy and chains
retry (≤ `maxRecoveryRetries`, backoff) → escalate (850-894).
Adapt: we currently deliver via `promptAsync` (fire-and-forget) in ctx_watchdog — the
watchdog chain needs the awaited `session.prompt` response/error; decide prompt vs
promptAsync per path.
Tests prove: `index.watchdog.test.ts` ("WP-05 watchdog — recovery retry & escalation" —
the retry/escalate/gave-up chain); `index.state-machine.test.ts` ("retry path",
"abort+resume path", "gave up path").

**R3 — Abort+resume with self-identification (P2/P4).**
Reuse: `pluginAbortInFlight` set BEFORE `session.abort`, cleared in `finally` (1709/1747);
the fixed 2s delay between abort and continue (1722, `ABORT_CONTINUE_DELAY_MS`); cancel
re-check DURING the delay (1728-1732); local `busy → idle` after a successful abort (1724);
sid validation + clean no-leak return on abort failure (1699-1702, 1714-1719); reset
`orphanWatchStartAt` on success (1737).
Adapt: our plugins never call `session.abort` today — it is the first use of that
capability; keep it behind the same cancel gates.
Tests prove: `index.state-machine.test.ts` ("abort+resume path", "user cancel
interruption", "concurrent busy interruption"); `index.esc-stops-timers.test.ts` (ESC
beats a plugin abort in flight).

**R4 — Loop detector gating resumes.**
Reuse: timestamp ring with window pruning (`recordContinue`, 489-497); the detector
`isHallucinationLoop` = `>= loopMaxContinues` (3) continues in `loopWindowMs` (10 min)
(499-504); on hit, the normal stall path ABORTS instead of continuing, still guarded by
the in-flight checks (1765-1780).
Adapt: name it per-send, not per-message — the ring counts the plugin's OWN continue
sends (pushed at 823/834), so a user typing "continue" repeatedly cannot trip it.
Tests prove: `index.continue.test.ts` ("repeated continues until done"); hallucination
cases live in `index.it.test.ts` / `index.live-tool-loop.test.ts` *(map)* — the 9-file
case-name scan above did not surface those two.

**R5 — Orphan parent watch (P3).**
Reuse: arm on the busy-count EDGE in the event handler (`prevBusyCount > 1 &&
currentBusy === 1`, 2136-2143 — `prevBusyCount` refreshed at busy 2121, interrupted
2129, idle 2143); decide in the tick after `subagentWait + grace` (1853-1903);
child classification first: `crashed` → recover the CHILD before touching the parent
(1874-1876); `idle` + no busy child → abort+resume parent (1883-1890); re-stamp
`orphanWatchStartAt` when a guard trips (wait longer instead of burning a retry,
1861/1871); `gaveUp` on exhaustion (1894-1900).
Adapt: subagent semantics differ in our stack (worker sessions under the planner) —
the edge-detection + tick-decision shape carries over; the child probes are the
host-specific part.
Tests prove: `index.events.test.ts` (per-event-type cases incl. `session.status` — the
arm side), `index.session-watch.test.ts` (watch fields incl. pending recovery),
`index.state-machine.test.ts` (extended transitions); no dedicated orphan file *(map)*.

**R6 — The ESC boundary contract (P4).**
Reuse: three cancel signals → one `userCancelled` latch (2123-2130, 2506-2517,
2576-2585); the all-sessions error latch with the `pluginAbortInFlight` exemption
(2578); per-session `toolTextTimer` clear on cancel (2128, 2513); the `chat.message`
`continuing` discriminator for re-arm (2702) — the plugin's own prompts are invisible to
the re-arm; exclusive lift site is `chat.message` (2703-2705), NOT `message.updated`
(2524-2532).
Tests prove: `index.esc-stops-timers.test.ts` ("ESC stops every timer-driven send" —
the exhaustive stop side); `index.rearm.test.ts` ("Re-arm on user message: contract
assertions on source" + "behavioral tests" — the contract side; the source-assertion
style is itself a reusable technique: pin the guard's existence in the source).

**R7 — Meta-recipe: the timer/event split (architecture).**
Reuse: arm in events, act in ONE tick funnel; per-tick status reconcile poll (1843-1847);
`continuing` latch as the final backstop inside the funnel (§4); unref'd intervals
(2081/2087); per-session one-shot timers stored on the watch and cleared on cancel;
60s `session.list()` discovery as a safety net for missed events (1798-1832,
2084-2090).
Tests prove: `index.state-machine.test.ts` ("Extended state machine transitions" —
cross-family coverage incl. "streaming failure recovery path"); `index.events.test.ts`
(one describe per event type).

## 7. Fit assessment (against OUR `.opencode/plugin/` surface)

Active registrations (read-only grep of our plugin dir; `deactivated/` is inert):
- `compact_memory.ts` → `tool: { compact_memory }` only (461-464) — a tool-only plugin;
  probes host version via `client.session.compact` vs `.summarize` presence (29-34, 581, 607).
- `ctx_watchdog.ts` → `event` (onEvent), `tool.execute.before`, `tool.execute.after`,
  `chat.message` (726-731); delivers ladder prompts via `client.session.promptAsync`
  (114, 723-725); maintains a noise-filtered event log (203-218).
- `intercept_observer.ts` → `tool.execute.before` only (763-768) — observation, no sends.
- `tools/`, `scripts/` = binaries/helpers, not plugins.

What MAPS directly:
- **Event source** — `event` hook already in use (ctx_watchdog `onEvent`): `session.status`,
  `message.updated`, `session.error`, `session.interrupted` all arrive; arming (§5) is
  droppable in as-is.
- **`chat.message` re-arm** — hook already registered; add the `continuing`-discriminated
  lift (R6) where `onChatMessage` already handles messages.
- **Deterministic in-flight counters** — `tool.execute.before/after` + `command.executed`
  hook surface exists (ctx_watchdog registers before/after); `pendingTools/Commands`
  maintenance is the same shape as the reference's 2710/2758 hooks.
- **Client capability** — `ctx.client.session.*` is proven in-repo: `promptAsync`
  (ctx_watchdog), `compact`/`summarize` + `messages` (compact_memory). `session.prompt`
  (awaited) and `session.abort` are used in the reference on the same client — the
  version probe at compact_memory 29-34 is the in-repo pattern for verifying their
  presence before relying on them.
- **Tool registration** — a `task_complete`-style explicit-completion tool maps onto the
  `compact_memory` tool pattern if we want that latch too.

What is MISSING (must be built):
- **Per-session watch store** — no `SessionWatch`-equivalent anywhere in our active
  plugins (ctx_watchdog keeps gauge state per session, not a state machine).
- **The 5s tick** — no `setInterval` in any active plugin; ctx_watchdog is fully
  event-driven. The reconcile-poll + single-funnel tick (§3) is new infrastructure.
- **`session.abort` usage** — first use in our stack; must carry the
  `pluginAbortInFlight` marker + guard stack (R3) from day one.
- **Backoff / loop-ring / gaveUp machinery** — none in-repo.
- **`session.list()` discovery** (60s pickup) — a client call we have never made.
- **Prompt-vs-promptAsync decision** — the watchdog chain (§4.11) needs the awaited
  `session.prompt`; our one existing delivery path is fire-and-forget.

## 8. Unverified / unclear

1. `getSessionStatusMap` (992-1013), `checkSubagentStatus` (1192-1242),
   `checkSessionHasActiveTool` (1161-1190) — used only as named by the Phase-1 map;
   bodies NOT read in this session (outside scope ranges). Their exact probe payloads are
   unverified. *(check tried: scoped reads only; map cites the ranges.)*
2. `resetBusyFlags` / `resetSessionFlags` (1244-1303) — map only; I verified
   `resetIdleFlags` (1304-1310) but not the busy-side resets' exact fields.
3. `session.prompt` vs `promptAsync` availability on OUR opencode host — cannot execute
   anything (spec forbids); the reference targets some opencode SDK version. In-repo
   evidence only shows `promptAsync`, `compact`, `summarize`, `messages` exist.
4. Test files — case NAMES only (spec scope 8); the assertions inside each case
   (what exactly is pinned) are unverified.
5. `w.isSubagent = true` at 2140 — set on the session that just went idle (the finishing
   child), inferred from position (`lone` = the surviving parent); I did not trace every
   `isSubagent` consumer, only the ones inside my scope reads (1983, 2020).
6. The legacy `session.idle` handler (2494-2501 *(map)*) and the `session.status` "retry"
   branch (2421 *(map)*) — event-side but outside the spec's item-5 ranges; assumed
   secondary/legacy per the map, not re-verified.
7. Whether `MessageAbortedError` is emitted per-session or globally by the host — the
   code's all-sessions loop (2576-2583) implies the ERROR event may lack a reliable sid;
   I could not verify host behavior statically beyond the accessor `getError` (635
   *(map)*).
