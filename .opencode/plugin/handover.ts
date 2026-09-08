// Handover plugin v1 — log-only observer.
// Appends one JSON line per observed event to .opencode/plugin.log. No behavior change, no tool output mutation.
import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import { appendFileSync } from "node:fs";
import { join } from "node:path";

const LINE_CAP = 2000;
const CAPS = [500, 150, 60];
const DOT = "\u2026";

let dir: string | undefined;

function logPath(): string {
  dir ??= typeof process?.cwd === "function" ? process.cwd() : undefined;
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
}

export default (async ({ directory }: PluginInput) => {
  dir = str(directory);
  return {
    event: onEvent,
    "tool.execute.before": onToolBefore,
    "tool.execute.after": onToolAfter,
  };
}) satisfies Plugin;
