// context_recovery — the emergency context-recovery plugin (TODO #93: the
// 2026-09-25 event-hook port of the retired T5 prototype; the deactivated
// copy is removed — this file at .opencode/plugin/context_recovery.ts is
// the single source, auto-loaded by the host — activation = the host
// restart).
//
// On a REAL context-overflow error (the host's session.error event) with
// the `emergencyRecovery` flag ON, it:
//   1. claims the overflow (the once-per-overflow in-memory guard per
//      sessionID — the host emits FOUR session.error events for ONE
//      overflow (its internal tail-strip retries — measured 2026-09-23),
//      so the follow-up events are no-ops; the guard is cleared on the
//      session's EventSessionIdle),
//   2. compacts via the SHARED CORE (./compaction_core.ts — the
//      2026-09-26 unification Part A): the config-resolved summarizer
//      pair (the root opencode.jsonc agent.compaction.model "provider/
//      model", falling back to the session's OWN model read via
//      session.messages — the session's own providerID + modelID, the
//      2026-09-26_14-26 incident fix) + keep { messages, tokens? }
//      (keepMessages from the budget file + the dispatch-time keepTokens
//      resolution (#99): the token size of the last keepMessages messages
//      is the primary, the budget file's keepTokens the fallback when
//      the read fails or the sum is 0, else omitted),
//   3. on VERIFIED success only: increments the shared v2 budget store
//      and appends the COMPACT line to .opencode/temp/ctx.log (the
//      core's verified-success handling — increment + line),
//   4. hands control back — it NEVER resumes (2026-09-26 unification
//      Part B: the old reload-directive prompt injection is
//      REMOVED). The hook's job is to make a limit-stuck session
//      RESUMABLE; the resume is owned by the auto-resume unit-4 flow
//      (planner sessions: the liveness-watchdog recovery path; worker
//      sessions: the planner's task_id resume per protocol).
//
// Over budget (or an unresolvable model pair, or a failed compact) →
// CLEAN FAIL: no compact, no line, no budget change — the session error
// propagates (the visible hard stop; the -WARNING line is the
// protocol's job, not the plugin's).
//
// WHY the `event` hook (the old design's `"session.error"` hook does NOT
// exist in the current SDK): the installed @opencode-ai/plugin Hooks has
// `event?: (input: { event: Event }) => Promise<void>` — notification-
// only, returns VOID (the old design's {handled, action:"retry"} return
// is impossible). The overflow event exists in the Event union (SDK
// types.gen.d.ts L518):
//   EventSessionError = { type: "session.error"; properties: {
//     sessionID?: string;  // capital D
//     error?: ProviderAuthError | UnknownError |
//     MessageOutputLengthError | MessageAbortedError | ApiError } }
// The live 2026-09-23 fork-test error was a MessageAbortedError —
// `request (148149 tokens) exceeds the available context size
// (131072 tokens)`.
//
// Activation flag (consolidation 2026-09-22): a top-level BOOLEAN key
// `emergencyRecovery` in <root>/.opencode/temp/compact_budget.json (the
// SAME file as the shared budget store, read PER FIRE through the
// core's config reader), read PER FIRE (a mid-run flip takes effect on
// the next overflow). ONLY the value `true` enables it — missing file /
// missing key / any other value / unparseable JSON → OFF (the hook does
// NOTHING — the session error propagates).
//
// Budget (the v2 store the compact_memory tool uses — shared by FILE
// through the core): the cap is resolved PER FIRE from the model_budget
// map (bare model id → cap; unlisted / typo'd → model_budget.default,
// else 1; CPU models stay cap 0 — the safety invariant). The auto side
// (this plugin) is the no-arg path of the spec-10 gate:
//   count < cap  → normal increment (count → count+1)
//   count == cap → consumes the configured emergency_budget 1 (count →
//                  cap+1, the ` emergency` suffix on the COMPACT line)
//   count > cap  → CLEAN FAIL (no compact, no line, no increment)
//
// Unification note (2026-09-26 Part A): the config reader / budget store /
// cap resolver / keepTokens resolution / summarizer-pair resolution / v1
// call / COMPACT-line writer / failure helpers are NO LONGER local
// duplicates — they live in ./compaction_core.ts (a PURE module with NO
// tool registration — the T5 constraint is satisfied: importing the
// core pulls no tool registration into this hook-only plugin). This
// file keeps ONLY: the overflow marker gate, the activation-flag read,
// the once-per-overflow guard, the per-fire budget gate, and the
// hand-control-back.
import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import {
  budgetCount,
  callSummarize,
  computeKeepTokens,
  readCompactionConfig,
  readRootConfigContent,
  recordVerifiedSuccess,
  resolveCap,
  resolveCompactionModel,
  resolveModel,
  resolveRoot,
} from "./compaction_core.ts";

// The minimal client surface the recovery needs (structural — this file
// imports no SDK runtime and the smoke/probe can fake it; the .d.ts
// signature is the source of truth). NO prompt channel — the hook never
// resumes (Part B).
type RecoveryClient = {
  session?: {
    summarize: (options: { path: { id: string }; body: Record<string, unknown> }) => Promise<unknown> | unknown;
    messages?: (options: { path: { id: string } }) => Promise<unknown> | unknown;
  };
};

// ------------------------------------------------------------------ the overflow markers
//
// The prototype's working marker set (the observed provider error texts
// — the live 2026-09-23 fork-test error text matches marker 1). The
// SDK's session.error event carries the typed error union (
// MessageAbortedError & co.) whose text lives in data.message (the
// prototype's shape carried it top-level in error.message — both are
// checked; String(error) for a bare object is harmless — no marker
// matches).
function isOverflowError(error: any): boolean {
  const msg =
    typeof error?.data?.message === "string" && error.data.message !== ""
      ? error.data.message
      : String(error?.message ?? error ?? "");
  return (
    msg.includes("exceeds the available context size") ||
    msg.includes("context length exceeded") ||
    msg.includes("prompt is too long")
  );
}

// ------------------------------------------------------------------ the once-per-overflow guard
//
// The host emits FOUR session.error events for ONE overflow (its
// internal tail-strip retries — measured 2026-09-23): an in-memory Set
// of claimed sessionIDs (module state — the host runs one plugin
// instance). Claimed on fire, BEFORE the compact call (the burst events
// land while the first fire's summarize is in flight), cleared on the
// session's EventSessionIdle (type "session.idle" — it is in the Event
// union) — a LATER overflow may fire again (the budget state on disk
// still gates it).

const claimedOverflows = new Set<string>();


// ------------------------------------------------------------------ the plugin
export default (async (input: PluginInput) => {
  const root = resolveRoot(input);
  // The client is captured from the plugin input — the event hook
  // carries no per-fire context (the SDK signature is
  // event: (input: { event }) => Promise<void>).
  const client = (input?.client ?? undefined) as unknown as RecoveryClient | undefined;
  return {
    event: async ({ event }: { event: any }) => {
      // EventSessionIdle → clear the guard for that session (a NEW
      // overflow later may fire again — the budget state on disk still
      // gates it).
      if (event != null && event.type === "session.idle") {
        const idleId = typeof event.properties?.sessionID === "string" ? event.properties.sessionID : "";
        if (idleId !== "") claimedOverflows.delete(idleId);
        return;
      }
      // Not a session.error event → nothing to do.
      if (event == null || event.type !== "session.error") return;
      const props = event.properties != null && typeof event.properties === "object" ? event.properties : {};
      // Not an overflow → UNHANDLED (the marker gate is in-memory — it
      // comes first so non-overflow errors never touch the fs).
      if (!isOverflowError(props.error)) return;
      // Fail-closed: the sessionID is required (capital-D per the SDK
      // type).
      const sessionID = typeof props.sessionID === "string" && props.sessionID !== "" ? props.sessionID : "";
      if (sessionID === "") return;
      // The activation flag, read PER FIRE (the core's config reader —
      // `emergencyRecovery` is the hook's key): missing file / missing
      // key / any other value / unparseable → OFF (the hook does NOTHING
      // — the session error propagates, the visible hard stop).
      const cfg = readCompactionConfig(root);
      if (!cfg.emergencyRecovery) return;
      // The once-per-overflow guard: already claimed this overflow (the
      // host's burst) → no-op (no fs, no client call).
      if (claimedOverflows.has(sessionID)) return;
      claimedOverflows.add(sessionID); // claim BEFORE the compact call (the burst events land while it is in flight)
      if (client?.session == null) return;
      // The model pair: fallback = the session's own model (the core's
      // resolveModel CROSS branch — toolCtx undefined, the event-hook
      // analogue: no calling-session fallback); config override = the
      // root opencode.jsonc agent.compaction.model (the JSONC-safe
      // resolver).
      const fallback = await resolveModel(client, undefined, sessionID, false);
      const pair = resolveCompactionModel(readRootConfigContent(root), { providerID: fallback.providerID, modelID: fallback.model });
      const model = pair.modelID;
      const providerID = pair.providerID;
      // The v1 summarize body REQUIRES providerID + modelID: an
      // unresolvable pair → the request is NOT sent (CLEAN FAIL — no
      // budget, no line; the session error propagates).
      if (model === "" || providerID === "") return;
      // The v2 budget gate BEFORE the compact call (the auto / no-arg
      // path): count < cap → normal; count == cap → the configured
      // emergency_budget 1 (count → cap+1, the ` emergency` line
      // suffix); count > cap (or no emergency slot) → CLEAN FAIL — no
      // compact, no line, no increment (the looping agent is stopped by
      // the budget, not healed).
      const { cap } = resolveCap(root, model);
      const count = budgetCount(root, sessionID);
      let isEmergency = false;
      if (count < cap) {
        isEmergency = false;
      } else if (count === cap && cfg.emergency_budget >= 1) {
        isEmergency = true;
      } else {
        return;
      }
      // #99 (2026-09-25): the dispatch-time keepTokens resolution (the
      // core's): the token size of the last keepMessages messages is the
      // PRIMARY; the budget file's keepTokens is the FALLBACK when the
      // read fails or the sum is 0; else NONE (keep.tokens omitted — the
      // host config default applies). Never throws.
      let rawMsgs: unknown = null;
      if (typeof client.session.messages === "function") {
        try {
          rawMsgs = await client.session.messages({ path: { id: sessionID } });
        } catch {
          rawMsgs = null; // RPC failure → the budget/none path (fail-open)
        }
      }
      const resolved = computeKeepTokens(rawMsgs, cfg.keepMessages, cfg.keepTokens);
      const keep: Record<string, number> = { messages: cfg.keepMessages };
      if (resolved.tokens != null) keep.tokens = resolved.tokens;
      // The compaction call — AWAITED (unlike the tool's fire-and-forget
      // execute: the event hook is a server-side listener — NO turn
      // awaits it, and the overflowing turn is already ABORTED (the
      // model slot is free), so the tool's single-slot deadlock cannot
      // form here). Verified success only: increment + COMPACT line
      // (the core's verified-success handling; a failed compact
      // consumes NO budget and changes nothing — the session error
      // propagates).
      const { note, error } = await callSummarize(client, sessionID, { providerID, modelID: model }, keep);
      if (error !== "") {
        console.error("Emergency compaction failed:", error);
        return;
      }
      if (note !== "") console.log(`context_recovery (${sessionID}): ${note}`);
      recordVerifiedSuccess(root, undefined, sessionID, model, keep.messages, resolved, isEmergency);
      // Hand control back — NO resume (2026-09-26 unification Part B):
      // the hook made the session RESUMABLE (compact + budget + COMPACT
      // line); the resume is owned by the auto-resume unit-4 flow
      // (planner: the liveness-watchdog recovery path; worker: the
      // planner's task_id resume per protocol).
    },
  };
}) satisfies Plugin;