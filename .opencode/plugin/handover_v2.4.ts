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
//   - `tool.execute.after` (handover): summary mirror — OVERWRITES
//     .opencode/handover_task_to_planner.md with the worker final message from `output`
//     VERBATIM (no log truncation ladder — that applies to plugin.log lines only).
//     Empty `output` → file untouched. `metadata.truncated === true` → one trailer line.
//   - `experimental.chat.system.transform`: the raw payload is evidence-logged (kind
//     "transform") so the LIVE shape is visible from the post-restart plugin.log — the SDK
//     types (1.18.29) declare the input as `{sessionID?, model}` with no agent identifier, so
//     v2's planner-only gate (line omitted unless the payload exposes one whose value starts
//     with "planner"; "Planner-only, decided call, never second-guess: inject-for-all would
//     be wrong") is void since the maintainer "both" call 2026-09-08 — injection now runs on
//     EVERY transform, planner and worker sessions (TODO.md #18). One line "ctx: <peek.py
//     output>" is appended to `output.system`, the gauge runs through the PluginInput shell
//     ($) with a bounded wait — if the shell is absent, the line is omitted. See TODO.md #14
//     (evidence-log rationale + the now-overridden v2 design record).
//
// v2.2 (maintainer "both" call, 2026-09-08): the transform hook now injects on EVERY transform —
// planner AND worker sessions — the agent-prefix gate is removed. The live payload carries no
// agent identifier (evidence: 60+ kind:"transform" lines in this cycle's log, all shaped
// `{sessionID, model:{…}}`) — the gate was dead code that reached nobody. Accepted caveat
// (TODO.md #18): `peek.py` takes no session id, so the injected number can be another session's
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
// v2.4.1 (2026-09-10): the 10-09 05:12 live fire hit the Session.updatePart schema wall —
// part.id must start with `prt`, part.messageID with `msg` (the pushed messageID was "": the
// LIVE input of the chat.message hook carries no messageID at all — own plugin.log chatmsg
// evidence). v2.4.1: part id `prt-ctx-<uuid>`; messageID taken from output.message.id
// (UserMessage.id) with input.messageID as fallback; invalid id → skip + one gauge line
// (reason invalid-messageID) instead of an invalid push.

import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

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
const GAUGE_TIMEOUT_MS = 3000;

// BunShell is not re-exported by @opencode-ai/plugin (type is internal to dist/shell), so
// structure-type only the minimal slice v2.2.2 calls: the LIVE shell (terminal/CLI opencode,
// 09-09 start evidence) is a tagged template — shell\`cmd\` → promise with nothrow().text() —
// a plain function call with a string command is rejected by it (see the v2.2.2 header note).
type ShellPromiseLike = {
  nothrow(): ShellPromiseLike;
  text(): Promise<string>;
};
type ShellLike = {
  (strings: TemplateStringsArray): ShellPromiseLike;
  cwd(d: string): ShellLike;
};

let dir: string | undefined;
let shell: ShellLike | undefined;

function specPath(): string {
  return join(dir ?? "", HANDOVER_SPEC_PATH);
}

function mirrorPath(): string {
  return join(dir ?? "", ".opencode", "handover_task_to_planner.md");
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

// v2 — summary mirror: the plugin OWNS handover_task_to_planner.md. Verbatim worker final
// message, full text — no ladder/truncation. Best-effort fs.
async function mirrorSummary(
  input: ToolPayload,
  output: { title?: unknown; output?: unknown; metadata?: unknown },
): Promise<void> {
  try {
    if (!isHandoverTask(input?.tool, input?.args)) return;
    const finalMessage = output?.output;
    if (typeof finalMessage !== "string" || finalMessage.length === 0) return;
    const truncated = (output?.metadata as { truncated?: unknown } | undefined)?.truncated === true;
    const content = truncated
      ? finalMessage + `\n\n[TRUNCATED by opencode tool_output cap — see plugin.log call ${str(input?.callID) ?? ""}]`
      : finalMessage;
    writeFileSync(mirrorPath(), content, "utf8");
  } catch {
    // best-effort fs — never throw out of the hook
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("gauge timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

// v2.2.1 — the readout outcome is classifiable instead of a silent `undefined` for every
// failure mode (v2, TODO.md #23): shell-missing = the PluginInput shell is absent;
// timeout = the bounded wait fired (withTimeout's "gauge timeout" rejection); no-ctx-output =
// the raw output did not start with "CTX=" (includes empty — the preview is omitted then) or
// the command promise rejected with a foreign error (e.g. a BunShell spawn failure — the error
// text rides the preview: it is the only evidence slot in the stable 4-reason vocabulary, and
// it is what makes the spawn/suspect-(a) branch distinguishable in the log from non-CTX=
// output). ok-but-uninjectable (output.system not an array) is reported by onSystemTransform
// as system-not-array.
type GaugeReadout =
  | { ok: true; line: string }
  | { ok: false; reason: "shell-missing" | "timeout" | "no-ctx-output"; preview?: string };

// v2.2.1 — raw-output evidence for the gauge line: trimmed, capped at 120 chars (the
// buildLine ladder is [500,150,60] — 120 lands unchanged), omitted (undefined) when empty.
function gaugePreviewOf(raw: string): string | undefined {
  const t = raw.trim();
  return t === "" ? undefined : cap(t, 120);
}

// v2 — ctxgauge readout via the PluginInput shell. Detached best effort: bounded wait, no
// child_process fallback. The tag call is a static tagged template — exactly the declared
// BunShell call shape. v2.2.1: the failure outcome is reported (see GaugeReadout).
async function gaugeReadout(): Promise<GaugeReadout> {
  if (typeof shell !== "function") return { ok: false, reason: "shell-missing" };
  try {
    const text = await withTimeout(
      // v2.2.2 — TAGGED TEMPLATE, not a function call: the live BunShell (terminal/CLI opencode)
      // rejects `shell.cwd(d)(cmdString)` with "Please use '$' as a tagged template function"
      // (09-09 start-segment evidence, preview reason no-ctx-output). Static single command —
      // keep it a literal; interpolated parts would be parsed by the shell.
      shell.cwd(dir ?? "")`.venv/Scripts/python.exe .opencode/ctxgauge/peek.py`.nothrow().text(),
      GAUGE_TIMEOUT_MS,
    );
    const line = (typeof text === "string" ? text : "").trim();
    if (line.startsWith("CTX=")) return { ok: true, line };
    const preview = gaugePreviewOf(line);
    return preview === undefined
      ? { ok: false, reason: "no-ctx-output" }
      : { ok: false, reason: "no-ctx-output", preview };
  } catch (e) {
    if (e instanceof Error && e.message === "gauge timeout") return { ok: false, reason: "timeout" };
    // foreign rejection (spawn-failure class): classifiable no-ctx-output, error text as preview
    const preview = gaugePreviewOf(String(e));
    return preview === undefined
      ? { ok: false, reason: "no-ctx-output" }
      : { ok: false, reason: "no-ctx-output", preview };
  }
}

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
async function onChatMessage(
  input: { sessionID?: string; agent?: string; model?: unknown; messageID?: string },
  output: { message?: unknown; parts?: unknown },
): Promise<void> {
  try {
    const midFromOutput = (output?.message as { id?: unknown } | undefined)?.id;
    const mid = str(input?.messageID) ?? (typeof midFromOutput === "string" ? midFromOutput : undefined);
    append(
      buildLine(
        "chatmsg",
        {
          session: str(input?.sessionID),
          agent: str(input?.agent),
          message: mid,
          midSource: str(input?.messageID) ? "input" : typeof midFromOutput === "string" && mid !== undefined ? "output.message" : "none",
        },
        { payload: input },
      ),
    );
    const readout = await gaugeReadout();
    if (readout.ok) {
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
        text: `ctx: ${readout.line}`,
      });
    } else {
      append(buildLine("gauge", { reason: readout.reason, session: str(input?.sessionID), preview: readout.preview }, {}));
    }
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
  await mirrorSummary(input, output);
}

export default (async (input: PluginInput) => {
  dir = str(input?.directory);
  // BunShell arrives at runtime (PluginInput.$) but is not re-exported by the package — cast
  // through unknown; only the structural slice above is ever used.
  shell = (input?.$ ?? undefined) as unknown as ShellLike | undefined;
  return {
    event: onEvent,
    "tool.execute.before": onToolBefore,
    "tool.execute.after": onToolAfter,
    "chat.message": onChatMessage,
  };
}) satisfies Plugin;
