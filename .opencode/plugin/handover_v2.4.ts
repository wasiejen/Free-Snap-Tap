// Handover plugin v2 — deterministic handover file ownership, built on the unchanged v1/v1.1
// log observer.
//
// v1.1 log (kept verbatim): `event`, `tool.execute.before`, `tool.execute.after` append one
// capped JSON line to .opencode/plugin.log (delta filter + truncation ladder unchanged).
//
// v1.2 (growth fix): the skip set now covers the cascading UPDATE event types (measured 63% of
// steady-state log bytes); session.created, transform, warn, tool.before/after remain logged, and
// UNSEEN event types remain logged — the skip list is opt-out only (shape learning for new
// opencode event types is preserved).
//
// v2 additions (all best-effort; no hook ever throws out into a delegation, and v2 behavior is
// restricted to handover delegations — a `task` call whose `args.prompt` contains
// ".opencode/handover_task.md"):
//   - `tool.execute.before` (handover): pre-flight — spec file missing or empty → one warn
//     line to plugin.log. Observation only: never blocks or mutates the delegation.
//   - `tool.execute.after` (handover): summary mirror — OVERWROTE
//     .opencode/handover_task_to_planner.md with the worker final message from `output`
//     VERBATIM. REMOVED in v2.7 (P02) — see the v2.7 block below; historical record kept.
//   - `experimental.chat.system.transform`: the raw payload is evidence-logged (kind
//     "transform") so the LIVE shape is visible from the post-restart plugin.log — the SDK
//     types (1.18.29) declare the input as `{sessionID?, model}` with no agent identifier, so
//     v2's planner-only gate (line omitted unless the payload exposes one whose value starts
//     with "planner"; "Planner-only, decided call, never second-guess: inject-for-all would
//     be wrong") is void since the maintainer "both" call 2026-09-08 — injection now runs on
//     EVERY transform, planner and worker sessions (TODO.md #18). One line "ctx: <gauge
//     output>" is appended to `output.system`, the gauge runs through the PluginInput shell
//     with a bounded wait — if the shell is absent, the line is omitted. See TODO.md #14
//     (evidence-log rationale + the now-overridden v2 design record).
//
// v2.2 (maintainer "both" call, 2026-09-08): the transform hook now injects on EVERY transform —
// planner AND worker sessions — the agent-prefix gate is removed. The live payload carries no
// agent identifier (evidence: 60+ kind:"transform" lines in this cycle's log, all shaped
// `{sessionID, model:{…}}`) — the gate was dead code that reached nobody. Accepted caveat
// (TODO.md #18): the retired python peek CLI takes no session id, so the injected number can be another session's
// (adjacent-stale) — the line is a reminder, not a control.
//
// v2.2.1 (2026-09-08): evidence-log the gauge-readout FAILURE — v2 left every readout-failure
// branch silent by design (TODO.md #23), so the silent branch was undecidable from the log: one
// opencode start can now identify it. One kind:"gauge" line per failed readout (reason
// shell-missing | timeout | no-ctx-output | system-not-array, session id included; no-ctx-output
// carries a `preview` = raw output or error text, trimmed and capped 120 chars, omitted when
// empty) — NO line on the ok+injected path (the happy path must not add log volume).
//
// v2.2.2 (2026-09-09): the 09-09 proof start root-caused the missing ctx: line (TODO.md #23/#27
// closed by its gauge lines): under the electron opencode the PluginInput $ was absent
// (shell-missing); under the terminal/CLI opencode the $ IS a live BunShell that REJECTS a plain
// function call with a string command — the cwd-bound shell must be called as a TAGGED TEMPLATE.
// The gaugeReadout call shape changed accordingly (evidence preview in this cycle's
// .opencode/plugin.log start segment, reason no-ctx-output).
//
// v1.3 (2026-09-09): maintainer-approved extension of the log-event SKIP-SET (TODO.md #17): the
// three steady-state noise types measured in the 09-09 start segment (file.watcher.updated +
// file.edited + session.idle); message.removed and the session.* types remain logged as signal.
//
// v2.3 (2026-09-10, REJECTED before any restart — root cause found by the maintainer 09-10): the
// transform hook fires on EVERY LLM build (context-meter.log: per-turn fires, seconds apart) — so
// v2's output.system.push() and v2.3's system/prompt mutations changed the prompt on EVERY build
// = prompt-cache invalidation every turn (the slowdown + looping the maintainer observed). The
// trigger was never the problem; mutating anything in front of the newest message is. v2.3 died
// in deactivated/.
//
// v2.4 (2026-09-10, LIVE — maintainer direction after the cache root cause): per-message injection
// with CACHE DISCIPLINE. Trigger = chat.message (maintainer-tested: fires EVERY message turn; the
// key in the returned hooks object IS the trigger — the callback body must match that hook's
// payload shape). Target = the JUST-RECEIVED LAST MESSAGE: append-only, one text part
// (`ctx: <peek line>`) pushed onto output.parts — no existing part, no system item, nothing earlier
// in the prompt is ever touched (the cacheable prefix stays byte-stable). Evidence log stays per
// fire (kind "chatmsg"; the v2 "transform" kind is historical); gauge-failure lines unchanged
// (v2.2.1 vocabulary + one new reason parts-not-array).
//
// v2.5 (2026-09-10, de-peek core, TODO.md #30): the ctx readout leaves the shell. The
// BunShell machinery (GAUGE_TIMEOUT_MS, ShellLike, withTimeout, gaugePreviewOf, the
// tagged-template gauge call) is DELETED — the readout is the shared gauge core
// (./scripts/gauge.mjs, built-in node:sqlite, read-only, never-throw: kind "db-error"
// is the silent production fallback if the bun-compiled host lacks the module), ONE
// implementation with the self-peek CLI (the retired python peek CLI deleted).
// SESSION-GATED MATCH-ONLY POST
// (the #32 cross-session feed): the core's result carries the sid of the session it read
// — the part is pushed ONLY when sid === input.sessionID; a mismatch returns SILENTLY
// (no post, no gauge line — a normal multi-session state, not a failure). On a match ANY
// valid readout form is posted (known window / unknown-window `CTX=<ctx>` /
// `CTX=notAvailable`) — an honest own-session result is information, not error. The
// kind:"chatmsg" evidence line stays per fire and GAINS a `sess` field (the read session
// id, so a post and its source sit side by side in the log). Gauge-failure vocabulary:
// db-error (capped preview — the read failed even after busy_timeout + one retry) + the
// unchanged parts-not-array / invalid-messageID; the shell-era reasons (shell-missing /
// timeout / no-ctx-output / system-not-array) are GONE.
//
// v2.4.1 (2026-09-10): the 10-09 05:12 live fire hit the Session.updatePart schema wall —
// part.id must start with `prt`, part.messageID with `msg` (the pushed messageID was "": the
// LIVE input of the chat.message hook carries no messageID at all — own plugin.log chatmsg
// evidence). v2.4.1: part id `prt-ctx-<uuid>`; messageID taken from output.message.id
// (UserMessage.id) with input.messageID as fallback; invalid id → skip + one gauge line
// (reason invalid-messageID) instead of an invalid push.
//
// v2.6 (2026-09-10, auto-nudge ladder — TODO #30/#33, the APPROVED design of record): EVERY
// acting session gets staged mid-run context warnings BEFORE its stop line (85% / REM<=15k).
// Fire point = tool.execute.after (agent-independent — planner + workers + all agents).
// READ-MECHANIC CHOICE (recorded ruling under the #30 invariant — "the readout must reach
// EVERY acting session; blind spots are unacceptable for an ACTION"): PER-SESSION READ via
// the core's optional sessionID parameter on readGauge (the gauge.mjs v2.6 block). The
// chatmsg-style match-only gate would blind-spot concurrent sessions (when session A's tool
// completes, the newest-updated session is often session B) — rejected.
// Rungs (condition = pct OR REM, whichever hits first; the HIGHEST rung met fires; dedup =
// at most ONE nudge per rung per session, in-memory `nudgeFired` map keyed by session id):
//   1: pct >= 50 (context watch) | 2: pct >= 70 or REM <= 30k | 3: pct >= 80 or REM <= 20k
//   (wind-down — commit routine, prep the NAP) | 4: pct >= 90 or REM <= 10k (critical —
//   commit + write the NAP NOW) | 5: REM < 5k (stop line — the nudge carries the VERBATIM
//   gauge readout + "stop line reached: further work needs planner approval").
// Unknown window (no pct/REM) and no-total/db-error reads NEVER fire — SILENT (the
// chat.message gauge lines stay the failure channel; no NEW gauge-failure reasons).
// Delivery: client.session.promptAsync({ path: { id }, body: { parts: [{ type: "text",
// text, synthetic: true }] } }) — the SDK's SessionPromptAsyncData takes ONE options
// object (the design sketch's (sessionID, {parts}) two-arg shape is NOT the SDK signature;
// the .d.ts wins — hard rule #3). FIRE-AND-FORGET: never awaited in the hook; rejections
// and sync-throws are caught and evidence-logged (kind nudge, reason delivery-*). The
// synthetic part queues as the next turn at idle and must NOT render as the maintainer's
// message in the TUI.
// Evidence: kind:"nudge" lines ONLY ({session, rung, readout}); otherwise SILENT (no line
// for a non-fire — v1.x log-growth discipline). The chat.message ctx: line STAYS UNCHANGED.
//
// v2.7 (2026-09-10, P02 — maintainer-approved in the proposals channel): the `tool.execute.after`
// summary mirror (the after-hook write to handover_task_to_planner.md) is REMOVED. It OVERWROTE
// .opencode/handover_task_to_planner.md with the worker's RAW final message after EVERY Task-tool
// run — 7 confirmed collisions across sessions, each costing the planner a `git checkout --`
// recovery. The mirror's original purpose (avoid the "write file + final message" doubling) was
// resolved on the worker-prompt side (the worker writes its own summary file, 52eb0aa) — the
// mirror was pure damage. The COMMITTED summary file is canonical; the plugin never touches it
// anymore. Survivors: the `tool.execute.before` pre-flight warn, the tool.after log line, the
// nudge ladder, and the chat.message ctx: line (the probe pins the new no-write behavior, S3).

import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import { appendFileSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
// v2.5 — the native context gauge core (de-peek, TODO.md #30): ONE implementation
// shared with the self-peek CLI (./scripts/peek.mjs). Reads the opencode db via
// built-in node:sqlite (read-only, busy_timeout + one retry, NEVER throws — the
// db-error kind is the fallback; see the v2.5 header block).
import { readGauge, formatGauge } from "./scripts/gauge.mjs";

const LINE_CAP = 2000;
const CAPS = [500, 150, 60];
const DOT = "\u2026";
const SKIP_EVENT_TYPES = new Set([
  // v1.3 (09-09, maintainer-approved) — the three steady-state noise types of the 09-09 start
  // segment; keep message.removed / session.* logged as signal (TODO.md #17)
  "file.watcher.updated",
  "file.edited",
  "session.idle",
  "message.part.delta", // v1.1
  // v1.2 — the cascading UPDATE event types (log-growth fix); see the v1.2 header note
  "message.part.updated",
  "message.updated",
  "session.updated",
  "session.status",
  "session.diff",
  "plugin.added",
  "catalog.updated",
  "reference.updated",
  "integration.updated",
]);

// v2 — handover ownership
const HANDOVER_SPEC_PATH = ".opencode/handover_task.md";

// v2.5 — the $/BunShell machinery (ShellPromiseLike/ShellLike, the `shell` global,
// GAUGE_TIMEOUT_MS, withTimeout, GaugeReadout, gaugePreviewOf, gaugeReadout) is DELETED
// with the shell gauge — the native gauge core needs no host capability.

let dir: string | undefined;

function specPath(): string {
  return join(dir ?? "", HANDOVER_SPEC_PATH);
}

function logPath(): string {
  return join(dir ?? "", ".opencode", "plugin.log");
}

function cap(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + DOT;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

function toStr(v: unknown, n: number): string | undefined {
  if (v == null) return undefined;
  try {
    const s = JSON.stringify(v, (_k, x) => (typeof x === "string" ? cap(x, n) : x));
    return s == null ? undefined : cap(s, n);
  } catch {
    return undefined;
  }
}

function buildLine(kind: string, scalar: Record<string, string | undefined>, big: Record<string, unknown>): string {
  for (const n of CAPS) {
    const rec: Record<string, string> = { ts: new Date().toISOString(), kind };
    for (const [k, v] of Object.entries(scalar)) if (v) rec[k] = cap(v, n);
    for (const [k, v] of Object.entries(big)) {
      const s = toStr(v, n);
      if (s != null) rec[k] = s;
    }
    const line = JSON.stringify(rec);
    if (line.length <= LINE_CAP) return line;
  }
  const rec: Record<string, string> = { ts: new Date().toISOString(), kind };
  for (const [k, v] of Object.entries(scalar)) if (v) rec[k] = cap(v, CAPS[CAPS.length - 1]);
  return JSON.stringify(rec);
}

function append(line: string): void {
  try {
    appendFileSync(logPath(), line + "\n", "utf8");
  } catch {
    // best effort only — never break the hook over a write failure
  }
}

async function onEvent(input: { event?: unknown }): Promise<void> {
  try {
    const ev = (input?.event ?? {}) as Record<string, unknown>;
    const type = str(ev.type);
    if (type && SKIP_EVENT_TYPES.has(type)) return;
    const props = (ev.properties ?? {}) as Record<string, unknown>;
    const info = (props.info ?? {}) as Record<string, unknown>;
    append(
      buildLine(
        "event",
        {
          type: str(ev.type) ?? "unknown",
          session: str(props.sessionID) ?? str(info.sessionID),
          agent: str(props.agent) ?? str(info.agent),
        },
        { properties: props },
      ),
    );
  } catch {
    // never throw
  }
}

type ToolPayload = { tool?: string; sessionID?: string; callID?: string; args?: unknown };

// v2 — handover gate: a `task` delegation counts as HANDOVER only when its prompt
// references the spec file. Anything else (explore, reviewer, ad-hoc) is invisible to v2.
function isHandoverTask(tool: unknown, args: unknown): boolean {
  if (str(tool) !== "task") return false;
  const prompt = (args as Record<string, unknown> | undefined)?.prompt;
  return typeof prompt === "string" && prompt.includes(HANDOVER_SPEC_PATH);
}

function isEnoent(e: unknown): boolean {
  return (e as { code?: unknown } | undefined)?.code === "ENOENT";
}

// v2 — pre-flight: spec file missing or empty → one warn line. Observation only.
async function preflightHandover(input: ToolPayload, output: { args?: unknown }): Promise<void> {
  try {
    if (!isHandoverTask(input?.tool, output?.args)) return;
  } catch {
    return; // observation only — a gate must never break the delegation
  }
  try {
    const content = readFileSync(specPath(), "utf8");
    if (content.trim() === "") {
      append(
        buildLine(
          "warn",
          {
            reason: "handover-task-file-missing-or-empty",
            call: str(input?.callID),
            session: str(input?.sessionID),
          },
          {},
        ),
      );
    }
  } catch (e) {
    if (isEnoent(e)) {
      append(
        buildLine(
          "warn",
          {
            reason: "handover-task-file-missing-or-empty",
            call: str(input?.callID),
            session: str(input?.sessionID),
          },
          {},
        ),
      );
    }
    // other fs errors: swallow — observation only
  }
}

// v2.6 — the auto-nudge ladder (the v2.6 header block is the design of record): fire point
// tool.execute.after, PER-SESSION read (the blind-spot-free mechanic), kind:"nudge"
// evidence lines only, promptAsync fire-and-forget delivery.

// The minimal client surface the ladder needs (SDK: PluginInput.client is the generated
// opencode client; only session.promptAsync is used — kept structural so this file imports
// no SDK runtime and the probe can fake it; the .d.ts signature is the source of truth).
type PromptAsyncClient = {
  session?: {
    promptAsync?: (options: {
      path: { id: string };
      body: { parts: Array<{ type: string; text: string; synthetic?: boolean }> };
    }) => Promise<unknown> | unknown;
  };
};

let client: PromptAsyncClient | undefined;

// Per-session rung state: sessionID -> the rungs already fired for it (dedup: at most one
// nudge per rung per session; the map lives for the plugin process lifetime — bounded by
// the number of sessions, negligible).
const nudgeFired = new Map<string, Set<number>>();

// The HIGHEST rung met by a readout (0 = none). pct/REM exist only for a known window
// (kind ok) — unknown window / no-total / db-error never fire (the stop line is defined in
// pct/REM; an honest no-signal read is not a signal).
function computeRung(g: { ok?: boolean; kind?: string; ctx?: number; window?: number }): number {
  if (g.kind !== "ok" || g.ok !== true) return 0;
  const w = g.window;
  if (w == null || w <= 0) return 0;
  const ctx = g.ctx ?? 0;
  const pct = Math.floor((ctx * 100) / w); // the exact formatGauge pct formula
  const rem = w - ctx;
  if (rem < 5000) return 5;
  if (pct >= 90 || rem <= 10_000) return 4;
  if (pct >= 80 || rem <= 20_000) return 3;
  if (pct >= 70 || rem <= 30_000) return 2;
  if (pct >= 50) return 1;
  return 0;
}

// One line per rung — the VERBATIM gauge readout (formatGauge) + the rung's instruction
// (short and actionable — the design leaves the per-rung text to the build).
function nudgeText(rung: number, readout: string): string {
  switch (rung) {
    case 1:
      return `${readout} — context watch: past 50% of the context window; gauge-check between steps and keep new work small.`;
    case 2:
      return `${readout} — context high: wrap the current step, start the commit routine, begin the handover summary.`;
    case 3:
      return `${readout} — wind-down, just before the stop line: run the commit routine now, write the handover summary + TODO.md, prep the NAP.`;
    case 4:
      return `${readout} — CRITICAL: commit + write the handover summary NOW; do not start new work.`;
    case 5:
      return `${readout} — stop line reached: further work needs planner approval (working past the line is a rule violation); write the handover summary and stop.`;
    default:
      return readout;
  }
}

// Fire-and-forget delivery — NEVER awaited in the hook (the tool must not block on it);
// a missing client (probe without a fake) is a no-op — the nudge line is the record.
// Rejections and sync-throws are caught and evidence-logged (kind nudge, delivery-*).
function deliverNudge(sid: string, rung: number, text: string): void {
  try {
    const ns = client?.session;
    const fn = ns?.promptAsync;
    if (typeof fn !== "function") return;
    const p = fn.call(ns, { path: { id: sid }, body: { parts: [{ type: "text", text, synthetic: true }] } });
    if (p && typeof (p as Promise<unknown>).catch === "function") {
      (p as Promise<unknown>).catch((e) => {
        append(
          buildLine(
            "nudge",
            { session: sid, rung: String(rung), reason: "delivery-rejected", preview: cap(String((e as { message?: unknown })?.message ?? e), 120) },
            {},
          ),
        );
      });
    }
  } catch (e) {
    append(
      buildLine(
        "nudge",
        { session: sid, rung: String(rung), reason: "delivery-threw", preview: cap(String((e as { message?: unknown })?.message ?? e), 120) },
        {},
      ),
    );
  }
}

// The ladder, run on EVERY tool.execute.after (agent-independent). NEVER throws; SILENT on
// every non-fire (missing session id, no-total/db-error read, below the first rung, an
// already-fired rung — no log line, the v1.x log-growth discipline).
async function nudgeLadder(sessionID: string | undefined): Promise<void> {
  try {
    const sid = str(sessionID);
    if (!sid) return;
    const g = await readGauge(undefined, sid);
    const rung = computeRung(g);
    if (rung < 1) return;
    let fired = nudgeFired.get(sid);
    if (fired?.has(rung)) return;
    if (!fired) {
      fired = new Set<number>();
      nudgeFired.set(sid, fired);
    }
    fired.add(rung);
    const readout = formatGauge(g);
    append(buildLine("nudge", { session: sid, rung: String(rung), readout }, {}));
    deliverNudge(sid, rung, nudgeText(rung, readout));
  } catch {
    // never throw out of the hook
  }
}

// v2.5 — the shell-era gaugeReadout (GaugeReadout + withTimeout + gaugePreviewOf) is DELETED
// (v2.5 header block) — the native gauge core replaces it and never throws.

// v2.4 — per-message context injection (the only channel the cache allows: append to the newest
// message, never mutate anything in front of it). Evidence-logged FIRST (kind "chatmsg") so the
// LIVE chat.message payload is visible in the post-restart plugin.log — the SDK types
// (dist/gen/types.gen.d.ts) declare input {sessionID, agent?, model?, messageID?, variant?} and
// output {message: UserMessage, parts: Part[]}. The appended part is a NEW TextPart (SDK shape
// id/sessionID/messageID/type/text — types.gen.d.ts:142); existing parts are never edited
// (content is final the moment this hook runs). v2.2.1: readout-failure / uninjected cases log
// exactly ONE kind:"gauge" line (vocabulary + the new parts-not-array reason, session id
// included); the ok+injected path stays silent (no log growth).
//
// v2.4.1 (2026-09-10): the 10-09 05:12 live fire failed Session.updatePart schema validation —
// "Expected a string starting with prt at [part][id]" and "starting with msg at [messageID]".
// Root cause (proven, not guessed): (a) the part id used the `text-ctx-` prefix — the id must
// start with `prt`; (b) input.messageID does NOT exist at this hook — the LIVE chatmsg payload
// lines (this file's own plugin.log evidence, 10-09 05:11/05:12) carry ONLY sessionID/agent/
// model — so messageID was pushed as "" and failed the `msg` prefix. The valid id is
// output.message.id (UserMessage.id, types.gen.d.ts:40) — it is the PRIMARY source; input
// messageID remains a fallback if a future opencode version fills it. Skip (log reason
// invalid-messageID, never throw, no invalid push) when no valid msg-prefix id resolves;
// randomUUID-based part id keeps starts-with-prt and collision-free.
//
// v2.5 (2026-09-10, de-peek): the readout is the native gauge core (no shell) and the post is
// SESSION-GATED MATCH-ONLY — see the v2.5 header block at the top for the full change (native
// read, match-only post, `sess` evidence field, db-error failure vocabulary).
async function onChatMessage(
  input: { sessionID?: string; agent?: string; model?: unknown; messageID?: string },
  output: { message?: unknown; parts?: unknown },
): Promise<void> {
  try {
    const midFromOutput = (output?.message as { id?: unknown } | undefined)?.id;
    const mid = str(input?.messageID) ?? (typeof midFromOutput === "string" ? midFromOutput : undefined);
    // v2.5 — the native read (never throws: the db-error kind IS the fallback). The chatmsg
    // evidence line stays per fire and GAINS `sess` (the read session id, so a post and its
    // source sit side by side in the log).
    const g = await readGauge();
    const line = formatGauge(g);
    append(
      buildLine(
        "chatmsg",
        {
          session: str(input?.sessionID),
          agent: str(input?.agent),
          message: mid,
          midSource: str(input?.messageID) ? "input" : typeof midFromOutput === "string" && mid !== undefined ? "output.message" : "none",
          sess: g.sid,
        },
        { payload: input },
      ),
    );
    if (g.kind === "db-error") {
      // v2.5 — the read failed even after busy_timeout + one retry: one evidence line with a
      // capped preview (the old preview-field contract), no post.
      const err = typeof g.error === "string" ? g.error.trim() : "";
      append(
        buildLine(
          "gauge",
          { reason: "db-error", session: str(input?.sessionID), preview: err === "" ? undefined : cap(err, 120) },
          {},
        ),
      );
      return;
    }
    // v2.5 — MATCH-ONLY post (the #32 cross-session feed): a mismatch is a NORMAL multi-session
    // state — no post, no log (silence where silent); on equality ANY valid form posts
    // (known-window / unknown-window / notAvailable — an honest own-session result is
    // information, not error).
    if (g.sid !== input?.sessionID) return;
    if (!Array.isArray(output?.parts)) {
      append(buildLine("gauge", { reason: "parts-not-array", session: str(input?.sessionID) }, {}));
      return;
    }
    const sid = str(input?.sessionID) ?? "";
    if (!mid || !mid.startsWith("msg") || !sid) {
      append(buildLine("gauge", { reason: "invalid-messageID", session: sid, message: mid ?? "" }, {}));
      return;
    }
    (output.parts as unknown[]).push({
      id: `prt-ctx-${randomUUID()}`,
      sessionID: sid,
      messageID: mid,
      type: "text",
      text: `ctx: ${line}`,
    });
  } catch {
    // never throw
  }
}

async function onToolBefore(input: ToolPayload, output: { args?: unknown }): Promise<void> {
  try {
    append(
      buildLine(
        "tool.before",
        { tool: str(input?.tool), session: str(input?.sessionID), call: str(input?.callID) },
        { args: output?.args },
      ),
    );
  } catch {
    // never throw
  }
  await preflightHandover(input, output);
}

async function onToolAfter(
  input: ToolPayload,
  output: { title?: unknown; output?: unknown; metadata?: unknown },
): Promise<void> {
  try {
    append(
      buildLine(
        "tool.after",
        {
          tool: str(input?.tool),
          session: str(input?.sessionID),
          call: str(input?.callID),
          title: str(output?.title),
        },
        { args: input?.args, output: output?.output, metadata: output?.metadata },
      ),
    );
  } catch {
    // never throw
  }
  // v2.6 — the auto-nudge ladder (every session, every tool — agent-independent).
  await nudgeLadder(input?.sessionID);
}

export default (async (input: PluginInput) => {
  dir = str(input?.directory);
  // v2.5 — the PluginInput.$ (BunShell) is no longer read: the native gauge core
  // needs no host capability (v2.5 header block).
  // v2.6 — the client (SDK: PluginInput.client) feeds the ladder's fire-and-forget
  // promptAsync delivery; absent (probe w/o fake) → delivery is a silent no-op.
  client = (input?.client ?? undefined) as unknown as PromptAsyncClient | undefined;
  return {
    event: onEvent,
    "tool.execute.before": onToolBefore,
    "tool.execute.after": onToolAfter,
    "chat.message": onChatMessage,
  };
}) satisfies Plugin;
