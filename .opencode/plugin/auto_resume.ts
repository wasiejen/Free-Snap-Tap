// auto_resume.ts — UNIT 1+2+3+4 of the auto-resume plugin (approved 2026-09-21,
// .opencode/proposals/approved/2026-09-21_opencode-auto-resume-plugin.md).
//
// UNIT 1 (the testbed):
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
// UNIT 2 (context-limit compaction trigger):
//   A live session crossing 85% of its usable context window queues a
//   SELF-compact instruction via `client.session.promptAsync` — never a
//   synchronous prompt (an immediate injection invalidates the session KV
//   cache → full re-prefill, 3-4 min at 90% fill, the ctx_watchdog failure
//   mode). No host-side compaction command exists (Unit 1 surface report:
//   `session.compact` is undefined), so the queued text instructs the
//   session to call the `compact_memory` tool NOW with NO sessionID
//   (SELF path) and a 1-3 line continuation message, then continue per
//   the post-compaction protocol. The text names the measured ratio.
//   Shared architecture (deep-dive A §3 — one 5s tick = the only
//   decision+send funnel):
//   - EVENTS ONLY ARM per-session watch state (module-level Map keyed by
//     sid): assistant-role message.updated → lastTokenTotal OVERWRITTEN
//     (tokens.total if present, else input+output+cache.read+cache.write;
//     positive only) + the model pair + lastActivityAt; session.status
//     busy → arm the session + reset the once-per-busy-cycle attempts
//     counter; session.status idle → the tick decides.
//   - ONE 5s setInterval (.unref()-ed) evaluates every armed watch:
//     skip if lastTokenTotal <= 0, or attempts already 1 for this busy
//     cycle, or usable window null (model/provider data missing or ANY
//     throw — fail-safe, no intervention), or ratio < 0.85; else
//     re-entrancy latch + gate re-check right before send, then ONE
//     queued promptAsync (latch held until it settles), attempts++.
//   - Decision log lines (Unit 1 lines unchanged in format): `arm=`,
//     `saturation=` (with ratio), `trigger=`, `send-fail=`.
//   - Toggle (maintainer priority #1): an OPTIONAL top-level
//     `autoCompact` flag in `.opencode/temp/compact_budget.json` (the
//     compact_memory budget store — read-only here) gates the trigger:
//     absent/`true` → current behavior; `false` → the tick logs
//     `skip= autoCompact-off sid=<sid> ratio=<3-decimals>` and neither
//     sends nor consumes the once-per-busy-cycle attempts budget; a
//     missing/unreadable/malformed file fails OPEN (current behavior).
//     The file is read per tick (small file — per-tick read is fine).
//
// UNIT 3 (new-planner spawn helper — the shared building block for
// Unit 4's restart branches):
//   The ONE 5s tick (the only decision+send funnel; events stay
//   ARM-only) checks the one-shot trigger file
//   `.opencode/temp/auto_resume_spawn_trigger` (same dir as the log):
//   present + non-empty trimmed → ONE spawn attempt (in-flight latch —
//   no double-spawn), then the file is renamed to `.consumed` EVEN ON
//   FAILURE (a failed trigger never re-fires; re-trigger = write a new
//   file); present but empty trimmed → `spawn-fail= empty trigger` +
//   consumed; absent → nothing. The spawn is `create()` (no args — the
//   body is optional, no path → default directory) + ONE QUEUED
//   `promptAsync` carrying the trigger content as the planner start
//   prompt, with `agent: "planner_Q3S_160K"` and NO `model` field (the
//   agent-configured model applies — the host's opencode.jsonc is the
//   live source of truth). Success → the new sid is self-marked in a
//   module-level `spawned` map (sid → epoch, for Unit 4) + a `spawn=`
//   line. Every failure is a `spawn-fail=` line; the helper NEVER
//   throws outward. The module stays DEFAULT-ONLY exported (a named
//   export breaks the smoke check).
//
// UNIT 4 (the planner liveness watchdog — who watches the top-level
// session): a planner-scoped session going idle (or session.error) is
// routed on the NEXT TICK (the 5s funnel stays the only decision+send
// funnel; events only set state). SCOPE: a sid is scoped iff it is in
// the Unit 3 `spawned` map (the self-mark), OR ANY of its user messages
// (fetched via client.session.messages) contains the literal
// `<|autonom|>` (the looprunner's launch-message marker); the verdict
// is cached per watch as scope: "planner" | "none" | "unknown" (fetch
// pending/failed → unknown, re-checked on the next idle; fail-safe = no
// action); NON-SCOPED sessions are NEVER acted on. ROUTING on the LAST
// assistant message's text parts for
// action:\s*(restart|resume|stop|ask_maintainer) (last match wins):
// stop / ask_maintainer → NO send, `route= stop|ask` line; resume or NO
// recognized line → ONE queued CONTINUE prompt (recoveryCount++, cap 2
// per idle cycle, reset on a fresh busy), `recovery= attempt=N` line;
// restart, or cap exhausted with still no line → SUCCESSOR CHECK (a
// DIFFERENT sid tracked in a session.created event since the closed
// session's lastActivityAt → `skip= successor`) else spawnPlanner with
// the RESTART prompt + `route= restart spawn` line. session.created
// events are tracked (sid → epoch) for that check. OVERLAP-ERA CAVEAT
// (documented, not solved): the looprunner ALSO reacts to
// `action: restart` — the successor check + the 5s tick grace window
// mitigate a double-spawn; the residual race is accepted until the
// maintainer retires the looprunner (his call).
//
// DELIBERATELY ABSENT (later units / prompts): abort escalation,
// subagent special-casing, magic-context handling, busy-silence stall
// detection, NAP/TODO/maintainer file access.
//
// HOOK DISCIPLINE (same as intercept_observer): the handler NEVER throws
// (try/catch swallow — a throw out of a hook would surface to the
// session); the tick callback likewise (an unhandled rejection from a
// timer would take the host down). Best-effort logging only.
import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";
import { appendFileSync, mkdirSync, readFileSync, renameSync } from "node:fs";
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
  "messages",
  "todo",
  "command",
  "summarize",
  "compact",
  "create",
];

// Unit 3 constants: the planner agent id — the live source of truth is
// the host's opencode.jsonc (re-verified 2026-09-21 at build time:
// `planner_Q3S_160K`); NO model field is ever sent (the agent-configured
// model applies), and the one-shot trigger file name (same dir as the
// log — `.opencode/temp/`).
const PLANNER_AGENT_ID = "planner_Q3S_160K";
const SPAWN_TRIGGER_FILE = "auto_resume_spawn_trigger";

// Unit 2 constants (deep-dive B §2): saturation threshold default 0.85;
// usable window = context - Math.min(20_000, output ?? 0) (mirrors
// OpenCode's own overflow math).
const SATURATION_THRESHOLD = 0.85;
const RESERVE_MIN_OUTPUT = 20000;
// The optional autoCompact toggle file (same dir as the log — the
// compact_memory budget store; we only READ its optional top-level
// `autoCompact` key, never write the file).
const COMPACT_BUDGET_FILE = "compact_budget.json";

// The once-per-busy-cycle budget gate: at most ONE self-compact send per
// busy cycle (attempts zeroed when a fresh busy cycle arms the session).
const MAX_ATTEMPTS_PER_BUSY_CYCLE = 1;

// Unit 4 constants: the looprunner's launch-message marker (a
// planner-scoped session carries it in at least one of its user
// messages; direct/interactive sessions never do), the recovery budget
// (at most two queued CONTINUE prompts per idle cycle — a fresh busy
// cycle resets it), and the action-line vocabulary (AGENTS.md
// §Interaction-contract state machine; the LAST match wins).
const AUTONOM_MARKER = "<|autonom|>";
const MAX_RECOVERY_ATTEMPTS = 2;
const ACTION_RE = /action:\s*(restart|resume|stop|ask_maintainer)/g;

let logDir = "";
let logPath = "";
let client: unknown = null;

// Unit 2 module-level state (all state at module level — the file's
// Unit 1 shape): per-session watches, the re-entrancy latch, the
// usable-window cache (read-through, computed once per model, successful
// values only — a fail-safe null is never cached so a transient failure
// can be re-checked on the next tick), the single tick timer.
interface Watch {
  lastTokenTotal: number;
  model: { providerID: string; modelID: string } | null;
  attempts: number;
  lastActivityAt: number | null;
  armed: boolean;
  status: "busy" | "idle" | "";
  // Unit 4: the scope verdict (planner / none / unknown — unknown until
  // the spawned-map check or a messages() fetch settles it), the
  // recovery budget (CONTINUE sends this idle cycle; a fresh busy
  // resets it), and the pending-idle latch (ONE decision per idle
  // cycle — set by an idle event or session.error, cleared when the
  // tick makes its decision or the cycle fails).
  scope: "planner" | "none" | "unknown";
  recoveryCount: number;
  idlePending: boolean;
}
const watches = new Map<string, Watch>();
const sending = new Set<string>();
const usableCache = new Map<string, number>();
let tickTimer: ReturnType<typeof setInterval> | null = null;

// Unit 3 module-level state: the spawned self-mark (sid -> epoch — so
// Unit 4 can recognize a spawn as its own, never as a user session) and
// the in-flight latch (no double-spawn while one spawn attempt is
// running; held until the trigger file is consumed).
const spawned = new Map<string, number>();
let spawnInFlight = false;

// Unit 4 module-level state: the session.created tracking (sid →
// epoch — the successor check: a DIFFERENT sid created since the
// closing session's lastActivityAt means someone already replaced it,
// so the watchdog stays out of the way).
const createdSessions = new Map<string, number>();

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

// Unit 2: normalize the session.status payload to its status string.
// The LIVE shape (measured 2026-09-21) carries `status` as an OBJECT
// `{ type: "busy"|"idle"|"retry"|"interrupted" }`; a bare string is
// accepted defensively (older host shapes / mocks). Anything else →
// null (unknown vocabulary — no state change, no arm/log line; the
// event line falls back to the raw `String()`).
function statusOf(status: unknown): string | null {
  if (typeof status === "string") return status;
  const obj = status as { type?: unknown } | null;
  if (obj && typeof obj === "object" && typeof obj.type === "string") return obj.type;
  return null;
}

// The short `<key fields>` tail of an event line: the event's properties
// bits that exist, kept short (status for session.status; tokens for
// message.updated). Defensive — unknown shapes yield no extra bits.
function keyFields(props: Record<string, unknown>): string {
  const bits: string[] = [];
  if (props.status != null) {
    const s = statusOf(props.status);
    bits.push(`status=${s ?? String(props.status)}`); // normalized value; raw fallback only when normalization yields null
  }
  const m = (props.message ?? props.info) as Record<string, unknown> | undefined;
  if (m && typeof m === "object" && m.tokens != null) {
    bits.push(`tokens=${JSON.stringify(m.tokens)}`);
  }
  return bits.join(" ");
}

// Unit 2: the watch object for a sid (created on first sight).
function getWatch(sid: string): Watch {
  let w = watches.get(sid);
  if (!w) {
    w = {
      lastTokenTotal: 0, model: null, attempts: 0, lastActivityAt: null, armed: false, status: "",
      scope: "unknown", recoveryCount: 0, idlePending: false,
    };
    watches.set(sid, w);
  }
  return w;
}

// Unit 2: the assistant message's token total (deep-dive B §2 step 1):
// `tokens.total` when present, otherwise input + output + cache.read +
// cache.write; only positive numbers are stored; OVERWRITTEN per update
// (the newest assistant message's total — never an accumulator).
function tokenTotal(tokens: Record<string, unknown>): number {
  const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  if (typeof tokens.total === "number" && Number.isFinite(tokens.total)) return tokens.total;
  const cache = (tokens.cache ?? {}) as Record<string, unknown>;
  return num(tokens.input) + num(tokens.output) + num(cache.read) + num(cache.write);
}

// Unit 2: the {providerID, modelID} pair of an assistant message.
// `info.model ?? props.model` when it is a string pair; the LIVE shape
// (measured 2026-09-21, installed 1.18.x AssistantMessage) carries the
// pair at the message's top level — both are accepted.
function modelPair(info: Record<string, unknown>, props: Record<string, unknown>): { providerID: string; modelID: string } | null {
  const obj = (info.model ?? props.model) as Record<string, unknown> | undefined;
  if (obj && typeof obj === "object" && typeof obj.providerID === "string" && typeof obj.modelID === "string") {
    return { providerID: obj.providerID, modelID: obj.modelID };
  }
  if (typeof info.providerID === "string" && typeof info.modelID === "string") {
    return { providerID: info.providerID, modelID: info.modelID };
  }
  return null;
}

// Unit 2: the usable context window for a model pair
// (deep-dive B §2 step 2): client provider list → provider by id →
// model entry → entry.limit.{context,output};
// usable = context - Math.min(20_000, output ?? 0). Fail-safe NULL on
// missing model/provider data, missing/zero context limit, or ANY
// throw (the saturation check simply does not fire — no intervention).
// Successful values are cached per providerID/modelID for the plugin's
// life; nulls are not (transient failures stay re-checkable).
async function getUsable(model: { providerID: string; modelID: string }): Promise<number | null> {
  const key = model.providerID + "/" + model.modelID;
  const cached = usableCache.get(key);
  if (cached !== undefined) return cached;
  try {
    const prov = (client as { provider?: { list?: unknown; get?: unknown } } | null)?.provider;
    // The installed SDK names it `provider.list()`; `get` is accepted as
    // well (defensive across v1-generation clients).
    const fn = (typeof prov?.list === "function" ? prov.list : typeof prov?.get === "function" ? prov.get : null) as
      | ((...args: unknown[]) => Promise<unknown>)
      | null;
    if (!fn || !prov) return null;
    const res = await fn.call(prov);
    const d = (res as { data?: unknown } | null)?.data;
    // Live shape: res.data.all[] — bare arrays accepted defensively too.
    const arr: unknown[] =
      Array.isArray(d) ? (d as unknown[]) : Array.isArray((d as { all?: unknown[] })?.all) ? (d as { all: unknown[] }).all : Array.isArray(res) ? (res as unknown[]) : [];
    for (const p of arr) {
      if (!p || typeof p !== "object") continue;
      const pr = p as { id?: unknown; models?: unknown };
      if (pr.id !== model.providerID) continue;
      let entry: Record<string, unknown> | null = null;
      if (Array.isArray(pr.models)) {
        for (const m of pr.models) {
          if (m && typeof m === "object" && (m as { id?: unknown }).id === model.modelID) {
            entry = m as Record<string, unknown>;
            break;
          }
        }
      } else if (pr.models && typeof pr.models === "object") {
        const e = (pr.models as Record<string, unknown>)[model.modelID];
        if (e && typeof e === "object") entry = e as Record<string, unknown>;
      }
      if (!entry) return null;
      const lim = (entry.limit ?? {}) as { context?: unknown; output?: unknown };
      if (typeof lim.context !== "number" || !Number.isFinite(lim.context) || lim.context <= 0) return null;
      const out = typeof lim.output === "number" && Number.isFinite(lim.output) && lim.output > 0 ? lim.output : 0;
      const usable = lim.context - Math.min(RESERVE_MIN_OUTPUT, out);
      if (!(usable > 0)) return null;
      usableCache.set(key, usable);
      return usable;
    }
    return null;
  } catch {
    return null;
  }
}

// Unit 2: the optional autoCompact toggle (maintainer priority #1) — a
// per-tick read of `.opencode/temp/compact_budget.json` (the
// compact_memory budget store — READ-ONLY here, never written; small
// file, a per-tick read is fine). Lenient parse: file missing /
// unreadable / JSON parse failure → ON (fail-open, status quo); key
// absent → ON; key present → Boolean(value).
function autoCompactEnabled(): boolean {
  try {
    const data: unknown = JSON.parse(readFileSync(join(logDir, COMPACT_BUDGET_FILE), "utf-8"));
    if (typeof data !== "object" || data === null) return true; // scalar root → no key → ON
    const v = (data as Record<string, unknown>)["autoCompact"];
    if (v === undefined) return true; // key absent → ON (status quo)
    return Boolean(v);
  } catch {
    return true; // missing / unreadable / malformed → fail OPEN (status quo)
  }
}

// Unit 2: the queued self-compact instruction (the locked design's text:
// names the measured ratio; compact_memory SELF path with no sessionID;
// a 1-3 line continuation message; continue per the post-compaction
// protocol).
function selfCompactText(sid: string, tokens: number, usable: number, ratio: number): string {
  const pct = (ratio * 100).toFixed(1);
  return (
    `[auto-resume unit 2 — context-limit trigger, session ${sid}] Measured context saturation: ratio=${ratio.toFixed(3)} ` +
    `(${pct}% of the usable window: ${tokens} of ${usable} tokens).\n` +
    "Call the `compact_memory` tool NOW with NO sessionID (SELF path); its continuation message must be 1-3 lines: " +
    "what to resume next and which head files to re-read (task spec / handover files / AGENTS.md as applicable).\n" +
    "After the compaction summary lands, continue per your post-compaction protocol from committed state — never from the summary alone."
  );
}

// Unit 2: the ONE gated send path — re-entrancy latch + gate re-check
// right before send, then ONE queued promptAsync (latch held until the
// send settles). Never a synchronous prompt (KV-cache invalidation).
async function sendSelfCompact(sid: string, w: Watch, ratio: number, usable: number) {
  if (sending.has(sid) || w.attempts >= MAX_ATTEMPTS_PER_BUSY_CYCLE || !w.armed || w.status !== "idle" || w.lastTokenTotal <= 0) return;
  w.attempts += 1; // consume the once-per-busy-cycle budget
  sending.add(sid); // re-entrancy latch
  log(`trigger= sid=${sid} ratio=${ratio.toFixed(3)} tokens=${w.lastTokenTotal} usable=${usable}`);
  try {
    const sess = (client as { session?: { promptAsync?: (args: unknown) => Promise<unknown> } } | null)?.session;
    if (!sess || typeof sess.promptAsync !== "function") {
      log(`send-fail= sid=${sid} promptAsync missing`);
      return;
    }
    // Queued (promptAsync): the synthetic part lands as the next turn at
    // idle — the race-free channel (no KV-cache invalidation, no re-prefill).
    await sess.promptAsync({ path: { id: sid }, body: { parts: [{ type: "text", text: selfCompactText(sid, w.lastTokenTotal, usable, ratio) }] } });
  } catch (e) {
    log(`send-fail= sid=${sid} ${(e as { message?: string } | null)?.message ?? "unknown"}`);
  } finally {
    sending.delete(sid);
  }
}

// Unit 3: the new-planner spawn helper (module-INTERNAL — the factory
// stays the ONLY export): create a fresh session, then ONE queued
// promptAsync carrying the planner start prompt. QUEUED, never
// synchronous (KV-cache invalidation). NO `model` field: the
// agent-configured model applies (the host is the live source of
// truth). Never throws outward; every failure is a `spawn-fail=` line.
async function spawnPlanner(startPrompt: string) {
  const sess = (client as {
    session?: { create?: () => Promise<unknown>; promptAsync?: (args: unknown) => Promise<unknown> };
  } | null)?.session;
  if (!sess || typeof sess.create !== "function") {
    log("spawn-fail= create missing");
    return;
  }
  let newSid: unknown;
  try {
    // No args: body is optional, no path → the default directory.
    const res = await sess.create();
    // The static SDK shape is res.data.id (Session); a top-level id is
    // accepted defensively (live-shape drift).
    const d = (res as { data?: Record<string, unknown> } | null)?.data;
    newSid = d?.id ?? (res as { id?: unknown } | null)?.id;
  } catch (e) {
    log(`spawn-fail= create: ${(e as { message?: string } | null)?.message ?? "unknown"}`);
    return;
  }
  if (typeof newSid !== "string" || newSid === "") {
    log("spawn-fail= create no id");
    return;
  }
  if (typeof sess.promptAsync !== "function") {
    log("spawn-fail= promptAsync missing");
    return;
  }
  try {
    await sess.promptAsync({
      path: { id: newSid },
      body: { parts: [{ type: "text", text: startPrompt }], agent: PLANNER_AGENT_ID },
    });
  } catch (e) {
    log(`spawn-fail= promptAsync: ${(e as { message?: string } | null)?.message ?? "unknown"}`);
    return;
  }
  spawned.set(newSid, Date.now()); // the self-mark (Unit 4)
  log(`spawn= sid=${newSid} agent=${PLANNER_AGENT_ID}`);
}

// Unit 3: rename the trigger file to its consumed name; best-effort —
// a rename failure is a `rename-fail=` line (the file then stays
// present; the in-flight latch is the double-fire guard while one
// attempt runs).
function renameTrigger(triggerPath: string) {
  try {
    renameSync(triggerPath, triggerPath + ".consumed");
  } catch (e) {
    log(`rename-fail= ${(e as { message?: string } | null)?.message ?? "unknown"}`);
  }
}

// Unit 3: the one-shot trigger check (the 5s tick is the ONLY
// decision+send funnel — events stay ARM-only): the trigger file
// present + non-empty trimmed → ONE spawn attempt (in-flight latch —
// no double-spawn) with the (trimmed) content as the start prompt,
// then the file is renamed to `.consumed` EVEN ON FAILURE (a failed
// trigger never re-fires; re-trigger = write a new file); present but
// empty trimmed → `spawn-fail= empty trigger` + consumed; absent →
// nothing. Never throws out.
async function checkSpawnTrigger() {
  if (!logDir) return;
  const triggerPath = join(logDir, SPAWN_TRIGGER_FILE);
  let content: string;
  try {
    content = readFileSync(triggerPath, "utf-8");
  } catch {
    return; // absent → nothing (ENOENT is the expected case)
  }
  if (content.trim() === "") {
    log("spawn-fail= empty trigger");
    renameTrigger(triggerPath);
    return;
  }
  if (spawnInFlight) return; // one spawn attempt at a time
  spawnInFlight = true;
  try {
    await spawnPlanner(content.trim());
  } catch {
    log("spawn-fail= spawn unknown"); // defensive — spawnPlanner never throws
  } finally {
    renameTrigger(triggerPath); // consumed EVEN ON FAILURE
    spawnInFlight = false;
  }
}

// Unit 4: the queued CONTINUE prompt (locked text — the no-line /
// resume branch): the planner's last turn ended without a recognized
// action: line (compaction, sudden stop, or protocol gap) — re-read
// the post-compaction head files, rebuild from committed state,
// continue or close with an action: line.
function continueText(sid: string): string {
  return (
    `[auto-resume unit 4 — planner liveness watchdog, session ${sid}] Your last turn ended without a recognized action: line ` +
    "(compaction, sudden stop, or protocol gap). Follow .opencode/agent/prompts/agent_readme_post_compaction.md — " +
    "re-read the named head files, rebuild from the committed state (git log + NAP + TODO), and continue the current " +
    "unit or close it with an action: line."
  );
}

// Unit 4: the RESTART start prompt for the spawnPlanner call (the
// restart branch / cap-exhausted branch): carries the looprunner
// launch marker + the iteration-counter rule + the rebuild-from-
// committed-state directive.
function restartText(): string {
  return (
    `<|autonom|> Run autonomously. (auto-resume unit 4 restart branch: the previous planner closed with ` +
    "`action: restart`.) Your iteration number = the largest `planner-N` in the current loop folder's `loop_log.md` " +
    "plus one (verify from the log; the counter-mismatch rule applies). Rebuild reality from committed state " +
    "(git log, NAP, TODO.md) and continue per your planner prompt's autonomous mode."
  );
}

// Unit 4: the SDK list shape of a messages() result —
// Array<{info: Message, parts: Array<Part>}> (SessionMessagesData,
// 200 = the array of message+parts pairs). Defensive: a non-array
// or malformed entry yields no role / no text.
type MsgPair = { info?: Record<string, unknown>; parts?: Array<Record<string, unknown>> };

function msgPairs(msgs: unknown): MsgPair[] {
  return Array.isArray(msgs) ? (msgs as MsgPair[]) : [];
}

function textParts(pair: MsgPair): string[] {
  const out: string[] = [];
  for (const p of pair.parts ?? []) {
    if (p && typeof p === "object" && p.type === "text" && typeof p.text === "string") out.push(p.text);
  }
  return out;
}

// Unit 4: scope marker scan — true iff ANY user message of the pair
// list carries the looprunner launch marker (the scope rule (b)).
function userHasMarker(msgs: unknown): boolean {
  for (const pair of msgPairs(msgs)) {
    if (!pair.info || pair.info.role !== "user") continue;
    for (const t of textParts(pair)) {
      if (t.includes(AUTONOM_MARKER)) return true;
    }
  }
  return false;
}

// Unit 4: the routing scan — the LAST assistant message's text parts,
// the LAST match of the action-line regex wins; null = no assistant
// message or no recognized line.
function lastAssistantAction(msgs: unknown): string | null {
  let last: MsgPair | null = null;
  for (const pair of msgPairs(msgs)) {
    if (pair.info && pair.info.role === "assistant") last = pair;
  }
  if (!last) return null;
  const text = textParts(last).join("\n");
  ACTION_RE.lastIndex = 0; // global regex — reset before each scan
  let m: RegExpExecArray | null;
  let found: string | null = null;
  while ((m = ACTION_RE.exec(text)) !== null) found = m[1];
  return found;
}

// Unit 4: the successor check — a DIFFERENT sid tracked in a
// session.created event since the closing session's lastActivityAt
// (the most recent such creation wins); null when lastActivityAt is
// unknown (fail-safe: spawn) or no successor was created.
function findSuccessor(closingSid: string, since: number | null): string | null {
  if (since == null) return null;
  let best: string | null = null;
  let bestEpoch = -1;
  for (const [sid, epoch] of createdSessions) {
    if (sid === closingSid) continue;
    if (epoch >= since && epoch > bestEpoch) {
      best = sid;
      bestEpoch = epoch;
    }
  }
  return best;
}

// Unit 4: the ONE per-scoped-idle routing decision (the 5s tick is the
// only decision+send funnel — events stay ARM-only). ONE decision per
// idle cycle: idlePending is cleared when the decision is made (or the
// cycle fails); it is only SET again by the next idle event /
// session.error. A latched (in-flight send) tick leaves it set — the
// decision is retried next tick. Never throws out; one `err=` line per
// failed cycle per sid (no log spam).
async function routeScopedIdle(sid: string, w: Watch) {
  if (sending.has(sid)) return; // in-flight send — retry next tick (latch)
  let msgs: unknown;
  try {
    const sess = (client as { session?: { messages?: (args: unknown) => Promise<unknown> } } | null)?.session;
    if (!sess || typeof sess.messages !== "function") {
      log(`err= sid=${sid} messages missing`);
      w.idlePending = false;
      return;
    }
    msgs = await sess.messages({ path: { id: sid } });
  } catch (e) {
    log(`err= sid=${sid} ${(e as { message?: string } | null)?.message ?? "unknown"}`);
    w.idlePending = false;
    return;
  }
  // Scope verdict (cached; the fetch above serves BOTH the scope marker
  // scan and the routing scan — one round trip).
  if (w.scope === "unknown") {
    if (spawned.has(sid) || userHasMarker(msgs)) w.scope = "planner";
    else {
      w.scope = "none"; // non-scoped: NEVER acted on (fail-safe = no action)
      w.idlePending = false;
      return;
    }
  }
  w.idlePending = false; // the decision for this idle cycle is made below
  const action = lastAssistantAction(msgs);
  if (action === "stop") {
    log(`route= stop sid=${sid}`); // left alone (the action state machine)
    return;
  }
  if (action === "ask_maintainer") {
    log(`route= ask sid=${sid}`); // left alone (waiting on the maintainer)
    return;
  }
  if (action === "resume" || (action === null && w.recoveryCount < MAX_RECOVERY_ATTEMPTS)) {
    w.recoveryCount += 1;
    log(`recovery= sid=${sid} attempt=${w.recoveryCount}`);
    sending.add(sid); // re-entrancy latch (held until the send settles)
    try {
      const sess = (client as { session?: { promptAsync?: (args: unknown) => Promise<unknown> } } | null)?.session;
      if (!sess || typeof sess.promptAsync !== "function") {
        log(`send-fail= sid=${sid} promptAsync missing`);
        return;
      }
      // QUEUED (promptAsync): the synthetic part lands as the next turn
      // at idle — the race-free channel (never a synchronous prompt).
      await sess.promptAsync({ path: { id: sid }, body: { parts: [{ type: "text", text: continueText(sid) }] } });
    } catch (e) {
      log(`send-fail= sid=${sid} ${(e as { message?: string} | null)?.message ?? "unknown"}`);
    } finally {
      sending.delete(sid);
    }
    return;
  }
  // restart, or cap exhausted with still no line → successor check.
  const successor = findSuccessor(sid, w.lastActivityAt);
  if (successor) {
    log(`skip= successor sid=${successor}`); // someone already replaced it
    return;
  }
  log(`route= restart spawn sid=${sid}`);
  await spawnPlanner(restartText()); // Unit 3 helper (never throws outward)
}

// Unit 2+3+4: the ONE 5s tick — the only decision+send funnel. Unit 3's
// trigger check runs first (the spawn is a high-priority action), then
// Unit 2 evaluates every armed watch, then Unit 4 routes every scoped
// session with a pending idle decision. Never throws out (an unhandled
// rejection from the timer would take the host down).
async function tick() {
  try {
    await checkSpawnTrigger(); // Unit 3 — the trigger check first
  } catch {
    // swallow — the timer callback must never reject
  }
  try {
    for (const [sid, w] of watches) {
      try {
        if (!w.armed || w.status !== "idle") continue;
        if (w.lastTokenTotal <= 0 || w.attempts >= MAX_ATTEMPTS_PER_BUSY_CYCLE || sending.has(sid)) continue;
        if (!w.model) continue;
        const usable = await getUsable(w.model);
        if (usable === null) continue;
        const ratio = w.lastTokenTotal / usable;
        if (ratio < SATURATION_THRESHOLD) {
          log(`saturation= sid=${sid} ratio=${ratio.toFixed(3)} tokens=${w.lastTokenTotal} usable=${usable}`);
          continue;
        }
        if (!autoCompactEnabled()) {
          // Toggle OFF: suppressed — no send, and the once-per-busy-cycle
          // attempts budget is NOT consumed (kept for a later ON state).
          log(`skip= autoCompact-off sid=${sid} ratio=${ratio.toFixed(3)}`);
          continue;
        }
        await sendSelfCompact(sid, w, ratio, usable);
      } catch {
        // swallow — one session's failure must not block the others
      }
    }
  } catch {
    // swallow — the timer callback must never reject
  }
  try {
    for (const [sid, w] of watches) {
      try {
        if (!w.idlePending) continue;
        await routeScopedIdle(sid, w); // Unit 4 — one decision per idle cycle
      } catch {
        // swallow — one session's failure must not block the others
      }
    }
  } catch {
    // swallow — the timer callback must never reject
  }
}

// Unit 2: events only ARM the watch state (never decide, never send —
// the tick is the only decision+send funnel).
function armEvent(type: string, sid: string, props: Record<string, unknown>) {
  if (type === "session.status") {
    const status = statusOf(props.status); // live object shape {type} normalized to its string
    if (status === "busy") {
      const w = getWatch(sid);
      w.armed = true;
      w.attempts = 0; // a fresh busy cycle resets the once-per-cycle budget
      w.recoveryCount = 0; // Unit 4: a fresh busy cycle resets the recovery budget
      w.idlePending = false; // a fresh busy cycle: no pending decision
      w.status = "busy";
      log(`arm= sid=${sid}`);
    } else if (status === "idle") {
      const w = getWatch(sid);
      w.status = "idle"; // the tick decides
      w.idlePending = true; // Unit 4: the tick routes scoped sessions
    }
    // any other vocabulary (retry/interrupted/unknown/null): no state
    // change, no log line — the tick stays the only decision+send funnel
    return;
  }
  // Unit 4: a session.error is a trigger too (a dead stream may never
  // emit its idle) — the tick routes it like an idle.
  if (type === "session.error") {
    const w = getWatch(sid);
    w.idlePending = true;
    return;
  }
  // Unit 4: track session.created events (sid → epoch) for the
  // successor check. The sid comes from properties.sessionID when
  // present (the live hook shape), else from the carried info object.
  if (type === "session.created") {
    const info = (props.info ?? props.message) as Record<string, unknown> | undefined;
    const createdSid =
      typeof props.sessionID === "string" && props.sessionID !== "unknown"
        ? (props.sessionID as string)
        : typeof info?.id === "string"
          ? (info.id as string)
          : null;
    if (createdSid) {
      const t = props.time as Record<string, unknown> | undefined;
      const epoch = typeof t?.created === "number" && Number.isFinite(t.created) ? (t.created as number) : Date.now();
      createdSessions.set(createdSid, epoch);
    }
    return;
  }
  if (type !== "message.updated") return;
  const info = (props.message ?? props.info) as Record<string, unknown> | undefined;
  if (!info) return;
  // Only assistant-role updates are the saturation input (deep-dive B
  // §2 step 1); user-role updates are NOT tracked here.
  if ((info.role ?? props.role) !== "assistant") return;
  const w = getWatch(sid);
  const tokens = (info.tokens ?? props.tokens) as Record<string, unknown> | undefined;
  if (tokens && typeof tokens === "object") {
    const total = tokenTotal(tokens);
    if (Number.isFinite(total) && total > 0) {
      w.lastTokenTotal = total; // OVERWRITTEN per update
      w.lastActivityAt = Date.now();
    }
  }
  const model = modelPair(info, props);
  if (model) w.model = model;
}

// The event hook: log ONE line per event (Unit 1, format unchanged), arm
// Unit 2 watch state, never throw.
const onEvent = async (input: { event: Event }) => {
  try {
    const ev = input?.event;
    if (!ev || typeof ev.type !== "string") return;
    const props = (ev.properties ?? {}) as Record<string, unknown>;
    const sid = props.sessionID ?? "unknown";
    const extra = keyFields(props);
    log(`event=${ev.type} sid=${sid}${extra ? " " + extra : ""}`);
    armEvent(ev.type, sid, props);
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
  client = input?.client ?? null;
  probeSurface(input); // one-shot at load
  if (!tickTimer) {
    tickTimer = setInterval(() => {
      void tick(); // the 5s tick — the only decision+send funnel
    }, 5000);
    tickTimer.unref(); // must not keep the host process alive
  }
  return {
    event: onEvent,
  };
}) satisfies Plugin;
