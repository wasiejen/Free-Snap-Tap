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
//     the line is omitted unless the payload exposes one whose value starts with "planner".
//     On match: one line "ctx: <peek.py output>" is appended to `output.system`, the gauge
//     runs through the PluginInput shell ($) with a bounded wait — if the shell is absent, the
//     line is omitted. Planner-only, decided call, never second-guess: inject-for-all would
//     be wrong, hence this design-flag + payload capture. See TODO.md #14.
//
// v2.2 (maintainer "both" call, 2026-09-08): the transform hook now injects on EVERY transform —
// planner AND worker sessions — the agent-prefix gate is removed. The live payload carries no
// agent identifier (evidence: 60+ kind:"transform" lines in this cycle's log, all shaped
// `{sessionID, model:{…}}`) — the gate was dead code that reached nobody. Accepted caveat
// (TODO.md #18): `peek.py` takes no session id, so the injected number can be another session's
// (adjacent-stale) — the line is a reminder, not a control.

import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LINE_CAP = 2000;
const CAPS = [500, 150, 60];
const DOT = "\u2026";
const SKIP_EVENT_TYPES = new Set([
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
const GAUGE_CMD = ".venv/Scripts/python.exe .opencode/ctxgauge/peek.py";

// BunShell is not re-exported by @opencode-ai/plugin (type is internal to dist/shell), so
// structure-type only the minimal slice v2 calls: cwd(...) → shell, shell(cmd) → promise with
// nothrow().text().
type ShellPromiseLike = {
  nothrow(): ShellPromiseLike;
  text(): Promise<string>;
};
type ShellLike = {
  (command: string): ShellPromiseLike;
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

// v2 — ctxgauge readout via the PluginInput shell. Detached best effort: bounded wait, no
// child_process fallback, any failure → undefined (line omitted). The tag call is a static
// tagged template — exactly the declared BunShell call shape.
async function gaugeReadout(): Promise<string | undefined> {
  if (typeof shell !== "function") return undefined;
  try {
    const text = await withTimeout(
      shell.cwd(dir ?? "")(`.venv/Scripts/python.exe .opencode/ctxgauge/peek.py`).nothrow().text(),
      GAUGE_TIMEOUT_MS,
    );
    const line = (typeof text === "string" ? text : "").trim();
    return line.startsWith("CTX=") ? line : undefined;
  } catch {
    return undefined;
  }
}

// v2 — ctxgauge injection. The payload is evidence-logged FIRST (kind "transform") so the
// post-restart log shows exactly what opencode exposes at this call site. The SDK types
// declare no agent identifier — if none arrives, the line is omitted (planner-only, decided
// call, never inject-for-all). See TODO.md #14.
async function onSystemTransform(
  input: { sessionID?: string; agent?: string; model?: unknown },
  output: { system?: unknown },
): Promise<void> {
  try {
    append(buildLine("transform", { session: str(input?.sessionID), agent: str(input?.agent) }, { payload: input }));
    const line = await gaugeReadout();
    if (line && Array.isArray(output?.system)) output.system.push(`ctx: ${line}`);
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
    "experimental.chat.system.transform": onSystemTransform,
  };
}) satisfies Plugin;
