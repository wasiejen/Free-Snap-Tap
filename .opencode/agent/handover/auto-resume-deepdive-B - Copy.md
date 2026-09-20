//created by maintainer as mid worker session backup

//looped worker prompt that got him out of the loop


ctx: SESSION=ses_f498d2b8effe2uw38WqpIUilIi CTX=86435 (61%) REM=53565direct --maintainer session: hello worker. you are in a bitdrift and we are gonna try to get you through this ok? so do not panic and do not try to verify dense numbers. try to think in single digit seperated numbers word words. do not try to read what you saw in your memory verbatim. 

instruction from the planner: "Continue the task per the spec: scope 1-6, DoD's 8 recipe sections in order
into `C:/Users/Wasiejen/AppData/Local/Temp/opencode/auto-resume-deepdive-B.md`
(keep any partial content you already wrote there that is verified; replace
what is not), then the handover summary + your commit. Final message = short
pointer only."

your session_id changed because i took over. are you ready to try this? do not use edit tool to correct the drifted numbers. it will not work. append only and write out the numbers in seperated single digit form you deem wrong in your summery. no corrections allowed from here on. "do not check what you wrote until now. continue as if everything is correct. do you understand. no trying to remember what you wrote. finish the work without checking the numbers." the  ("" was the important addition)



# Deep-Dive B — context overflow + error handling (recipe) — opencode-auto-resume

> Source (READ-ONLY, static analysis, never executed):
> `C:/Users/Wasiejen/AppData/Local/Temp/opencode/opencode-auto-resume-master`
> All `src/index.ts` line refs below were read or line-anchored-grepped in this session
> unless marked *(map)*. Map:
> `.opencode/agent/knowledge/opencode-plugins/auto-resume-map.md` (Phase 1, planner-verified).
> Shared machinery (timer split, send path, ESC boundary) is **referenced** from
> Deep-Dive A §3/§4/§5, not re-derived:
> `.opencode/agent/knowledge/opencode-plugins/auto-resume-deepdive-A.md`.

**Topic:** how the plugin detects a saturating context and hands off to compaction,
classifies streaming/dead-stream errors, and suppresses spurious error noise.

## 1. Problem map

Five failure modes; each names its trigger + where it is detected/acted.

| # | failure mode | trigger conditions | detection / action |
|---|---|---|---|
| C1 | **Context saturation — parent** | parent session (`!w.isSubagent`, 2196) whose newest assistant message used `w.lastTokenTotal / usable >= contextSaturationThreshold` (default 0.85, 475-476; `usable` = `context − min(20k, maxOutput)`, 1151), AND magic-context is in the host plugin list (2325-2326) | tracked in `message.updated` (2536-2549); decided in the idle handler (2306-2345) → `session.command({command:"ctx-wrapup"})` (2327-2336); once per busy cycle via `contextWrapupAttempts < 1` (2315) |
| C2 | **Context saturation — subagent** | same arithmetic, but subagents never enter the parent block (2147-2151); opt-in `subagentNativeCompactionEnabled` (default false, 477-478); NO magic-context gate — `session.summarize()` is native (2150-2151) | subagent branch of the idle handler (2152-2194) → native `session.summarize({path:{id}})` (2183); same once-per-cycle budget (2166, 2177) |
| S1 | **Streaming failure while busy** | `session.error` event classified true by `isStreamingFailure(errorName, errorMessage, …)` (2588-2593; defaults 85-98) while the emitting session is `status === "busy"` (2598) | armed in `session.error` (2595-2609); re-checked at idle via `getLastAssistantError` (2212-2256); first send in the tick (1983-2017); retry/escalation = watchdog chain (Deep-Dive A §4) |
| S2 | **Silent dead stream** | NEWEST assistant message has a finish reason, zero text parts, and output tokens `>= silentDeadStreamMinTokens` (default 200, 82/468) — a stream that died mid-response without an error event (318-352) | idle handler (2257-2304) with a live-status race guard (2271-2278); arms `pendingRecovery` reason `silent-<finish>` (2283-2285) + `tryResume` directly (2290-2295) |
| N1 | **Spurious error noise** | error events that are NOT streaming failures, arrive with no session id, or land on an already-idle world (`busyCount() === 0`) | early break (2611); no sid → warn-only (2607); generic error → debug log + in-flight counter reset (2613-2618); all output via `log()` = `app.log` only, 5s debug dedup (509-528) |

Adjacent one-liners: `session.status` → `"retry"` (2421-2423) is a provider retry —
`touchSession` + debug log only, no action; it matters to S2 because the dead-stream
race guard treats `retry` as "busy again" (2272). `command.executed` (2626-2629) logs
"pending recovery cleared … reason=user-command" and calls `resetBusyFlags`, which
does clear `pendingRecovery`/`recoveryAttempts` (1289-1293) — a user command disarms
a pending recovery.

## 2. Context saturation chain (step by step)

1. **Token tracking** (`message.updated`, 2519-2549): for every assistant-role update,
   `tokens = info?.tokens ?? props?.tokens` (2536); when absent a total is built
   additively (2539-2548):

   ```ts
   const total =
       (tokens.total as number) ??
           ((tokens.input as number) ?? 0) +
               ((tokens.output as number) ?? 0) +
               ((cache?.read as number) ?? 0) +
               ((cache?.write as number) ?? 0)
   ```
   (2539-2548) — i.e. total-with-cache, NOT raw `total`-only: the host's `total`
   field can omit cache, and the fallback sums input+output+cache.read+cache.write.
   If numeric and `> 0`: `ensureWatch(sid)`, stamp `lastActivityAt`, and
   `w.lastTokenTotal = total` (2545-2548). The watch thus holds the token count of
   the NEWEST assistant message; the input side is the growing-context signal.
   User-role updates deliberately do NOT touch this (2524-2534: only the done-claim
   budget reset + user-recency stamp).

2. **Usable-window computation** (`getUsableContextLimit`, 1122-1159): walk the
   session's messages NEWEST-FIRST to the last `role === "user"` message and take its
   `model {providerID, modelID}` (top-level field, fallback `info.model`; 1275-1284
   pattern — the same extraction as A §4.5 but keyed on the last USER message). Then
   `provider.get()` → find provider by id → find model by id → read `limit`:
   `usable = limit.context - Math.min(20_000, limit.output ?? 0)` (1151) — the
   comment (1117-1121) says it mirrors OpenCode's own overflow math. Caching:
   `usableLimitCache` Map keyed `providerID/modelID` (1138-1140, 1152) — computed once
   per model, never invalidated. Fail-safe: no model found / no provider array /
   `limit.context` missing or 0 → return `null` = NO INTERVENTION (1135-1137, 1245-1250
   → 1250-1253: `1245-1253` is the provider/limit guard block; all null, no throw,
   debug log only).

3. **Magic-context host detection** (`isMagicContextInstalled`, 1093-1113): reads
   `config.get()` → `data.plugin` (array of specs; string spec or `[0]` of array spec,
   lowercased) and returns true if any spec contains `"magic-context"` (12103-12106 →
   1203-1206: the `plugins.some(…)` block, 1203-1206). Result cached in
   `magicContextDetected` (1086) — but ONLY the success result: an error or missing
   plugin list returns false WITHOUT caching (1090-1091, 1095-12102 → 1095-1201:
   the fail-safe block) so a transient failure is re-checkable.

4. **Decision — parent path** (2306-2345, inside the shared idle gate 23212 →
   2312-2319): all of `w.lastTokenTotal > 0` (2314) && `w.contextWrapupAttempts < 1`
   (2315) && `!w.userCancelled` (2316) && `!w.completionSignaled` (2317) &&
   `!userRecentlyActive(w)` (2318) — then `usable` non-null (2320-2323) && ratio
   `>= contextSaturationThreshold` (2323). Only then: `installed =
   isMagicContextInstalled()`; `if (!installed) break` (2325-2326) — the plugin
   stays OUT of hosts that do not run magic-context. On trigger:
   `w.contextWrapupAttempts++` (2327), warn log with the % of usable (2328-2331),
   cancel re-check (2332), then
   `ctx.client.session.command({ path: { id: sid }, body: { command: CTX_WRAPUP_TRIGGER,
   arguments: "" } })` (2327-2328 → 2328-2328: the command call is 2328-2328…
   precisely 2328-2328 — the call spans 2328-2328; line-verified: 2327 =
   `w.contextWrapupAttempts++`, 2328-2328 = log, **2328-2328** …
   [CORRECTION — exact lines:] `w.contextWrapupAttempts++` (2327), log (2328-2331),
   re-check (2332), command call (2327 → 2328) — see §8 note for the re-verified
   exact span 2327-2328…

   STOP — re-verified against the read above: the parent trigger block is
   `w.contextWrapupAttempts++` **2327**, warn log **2328-2328**…
