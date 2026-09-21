// auto_resume.ts — UNIT 1 of the auto-resume plugin (approved 2026-09-21,
// .opencode/proposals/approved/2026-09-21_opencode-auto-resume-plugin.md):
// the skeleton logging plugin + the v1 client-surface probe. It is the
// TESTBED that validates the v1 API live for all later units (Unit 2-4
// grow from this file).
//
// WHAT IT IS (Unit 1):
//   (1) EVENT LOG — EVERY event the host delivers is logged as ONE line to
//       `.opencode/temp/auto_resume.log` (append; temp dir mkdir'd
//       recursive): `<ISO time> event=<type> sid=<sessionID> <key fields>`
//       (key fields = the event's properties bits that exist — `status`
//       for session.status, `tokens` for message.updated — kept short).
//   (2) INIT SURFACE PROBE — one-shot at plugin load: logs a `surface=`
//       line with `typeof ctx.client.session.<m>` for the candidate
//       methods (prompt, promptAsync, abort, list, get, message, todo,
//       command, summarize, compact) + whether `client.app.log` is a
//       function. `typeof` ONLY — Object.keys misses prototype methods
//       (knowledge_plugins.md "The plugin ctx client on THIS host").
//
// DELIBERATELY ABSENT here (Unit 2+ slot in at the marked points):
//   - no timers (the single 5s tick = the only decision+send funnel)
//   - no send path (ONE gated send — re-entrancy latch + gate re-check)
//   - no per-session watch objects (events ARM state there)
//   Unit 2 (context-limit compaction trigger) adds: the 5s tick, token
//   tracking on message.updated, and the gated send (queued promptAsync
//   or a host-side command where the probe finds one — see the surface
//   report). Keep this file's shape: probes/log at load, hook handlers
//   pure observers, all state at module level.
//
// HOOK DISCIPLINE (same as intercept_observer): the handler NEVER throws
// (try/catch swallow — a throw out of a hook would surface to the
// session). Best-effort logging only.
import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// The v1 candidate session.* methods probed at init (the design's
// candidate list; the live typeof verdicts land in the surface report).
const SESSION_CANDIDATES: ReadonlyArray<string> = [
  "prompt",
  "promptAsync",
  "abort",
  "list",
  "get",
  "message",
  "todo",
  "command",
  "summarize",
  "compact",
];

let logDir = "";
let logPath = "";

// Append one log line; best-effort — NEVER throws (logging must not
// break the session).
function log(line: string) {
  try {
    mkdirSync(logDir, { recursive: true });
    appendFileSync(logPath, new Date().toISOString() + " " + line + "\n", "utf-8");
  } catch {
    // swallow — a log failure is not a session failure
  }
}

// The short `<key fields>` tail of an event line: the event's properties
// bits that exist, kept short (status for session.status; tokens for
// message.updated). Defensive — unknown shapes yield no extra bits.
function keyFields(props: Record<string, unknown>): string {
  const bits: string[] = [];
  if (props.status != null) bits.push(`status=${String(props.status)}`);
  const m = (props.message ?? props.info) as Record<string, unknown> | undefined;
  if (m && typeof m === "object" && m.tokens != null) {
    bits.push(`tokens=${JSON.stringify(m.tokens)}`);
  }
  return bits.join(" ");
}

// The event hook: log ONE line per event, never throw.
const onEvent = async (input: { event: Event }) => {
  try {
    const ev = input?.event;
    if (!ev || typeof ev.type !== "string") return;
    const props = (ev.properties ?? {}) as Record<string, unknown>;
    const sid = props.sessionID ?? "unknown";
    const extra = keyFields(props);
    log(`event=${ev.type} sid=${sid}${extra ? " " + extra : ""}`);
  } catch {
    // swallow — never throw out of a hook
  }
};

// One-shot init surface probe (runs ONCE at plugin load): the `surface=`
// line. `typeof` ONLY — prototype methods are invisible to Object.keys.
function probeSurface(input: PluginInput) {
  try {
    const client = input?.client as unknown as {
      session?: Record<string, unknown>;
      app?: Record<string, unknown>;
    };
    const parts = SESSION_CANDIDATES.map((m) => `${m}=${typeof client?.session?.[m]}`);
    parts.push(`app.log=${typeof client?.app?.log}`);
    log(`surface= ` + parts.join(" "));
  } catch {
    // swallow — a probe failure must not break plugin load
  }
}

export default (async (input: PluginInput) => {
  logDir = join(input?.directory ?? "", ".opencode", "temp");
  logPath = join(logDir, "auto_resume.log");
  probeSurface(input); // one-shot at load (Unit 2: tick/watch objects slot here)
  return {
    event: onEvent,
  };
}) satisfies Plugin;
