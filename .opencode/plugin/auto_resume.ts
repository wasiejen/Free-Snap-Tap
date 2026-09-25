// auto_resume.ts — UNIT 1+2+3+4 of the auto-resume plugin (approved 2026-09-21,
// .opencode/proposals/approved/2026-09-21_opencode-auto-resume-plugin.md).
//
// UNIT 1 (the testbed):
//   (1) EVENT LOG — EVERY event the host delivers is logged as ONE line to
//       `.opencode/temp/auto_resume.log` (append; temp dir mkdir'd
//       recursive) — EXCEPT `message.part.delta` (#96: the per-token
//       stream delta, ~97% of the old log volume — NEVER logged):
//       `<ISO time> event=<type> sid=<sessionID> <key fields>`
//       (key fields = the event's properties bits that exist — `status`
//       for session.status, `tokens` for message.updated — kept short).
//   (2) INIT SURFACE PROBE — one-shot at plugin load: logs a `surface=`
//       line with `typeof ctx.client.session.<m>` for the candidate
//       methods (prompt, promptAsync, abort, list, get, message, todo,
//       command, summarize, compact) + whether `client.app.log` is a
//       function. `typeof` ONLY — Object.keys misses prototype methods
//       (knowledge_plugins.md "The plugin ctx client on THIS host").
//
// UNIT 2 (context-limit nudge — #85 part 3: the PASSIVE ctx-line suffix):
//   The live test (2026-09-22) exposed the old queued-promptAsync design:
//   the tick looped EVERY armed watch (no current-session concept) — the
//   nudge RE-FIRED on stale armed sessions and LOOPS (the once-per-
//   busy-cycle budget reset on every injected busy — the nudge itself
//   was the busy). #85 part 3 makes the Unit 2 nudge PASSIVE: a SUFFIX
//   appended to the session's OWN TOOL-CALL RETURN (the same channel the
//   gauge plugin uses for its `ctx:` line — the tool.execute.after
//   output.output mutation), PER busy session, when
//   `ratio >= saturationThreshold && autoCompact on`. NO promptAsync
//   (no resume, no queued turn, no busy, no budget reset, no loop).
//   - A tool result IS the activity evidence: the suffix appends on the
//     session's own tool returns while it is actively working; a
//     stale/idle session emits no tool results → no nudge (the stale-
//     session revival is gone by construction). Multiple active workers
//     each get their own nudge independently (per-session).
//   - LADDER (the HIGHEST rung met fires): ratio >= 0.98 → the
//     `--maintainer`-flagged line (`⚠⚠ --maintainer: context saturated
//     at ratio=<3-decimals> — self-compact NOW`); else ratio >= the
//     per-call threshold (default 0.95) → `self-compact now
//     (ratio=<3-decimals>)`. No host-side compaction command exists
//     (Unit 1 surface report: `session.compact` is undefined) — the
//     suffix reminds the session to self-compact per its own protocol
//     (the compact_memory tool, SELF path, no sessionID).
//   - SCOPE GATE (c): the suffix is NOT appended when the scope verdict
//     is "none" (Direct / non-scoped). The verdict is RECOMPUTED from a
//     FRESH messages() fetch per nudge-eligible tool result (last-
//     toggle-wins can flip with a new user message — a mid-turn
//     `<|Direct|>` must suppress immediately; the tick-era cached
//     w.scope is too stale for that).
//   - Shared event architecture (deep-dive A §3 — events stay ARM-only;
//     the tool result hook is the Unit 2 decision point): per-session
//     watch state (module-level Map keyed by sid): assistant-role
//     message.updated → lastTokenTotal OVERWRITTEN (tokens.total if
//     present, else input+output+cache.read+cache.write; positive only)
//     + the model pair + lastActivityAt; session.status busy → arm the
//     session + reset the once-per-busy-cycle nudge-log dedup counter;
//     session.status idle → the tick decides (Unit 4 only — Unit 2 has
//     no tick leg anymore).
//   - Gate order on a tool result (cheap first; the ONE expensive step
//     — the fresh messages() fetch + scopeVerdict — runs ONLY for a
//     saturated, actively-working session): a watch with a positive
//     token total + a known model; autoCompact ON (per-call budget-file
//     read); the model limits resolve (cached after the first fetch);
//     a positive usable window; ratio >= threshold. Usable window =
//     context - Math.min(reserve, output ?? 0) (mirrors OpenCode's own
//     overflow math).
//   - Decision log lines (Unit 1 lines unchanged in format): `arm=`,
//     `nudge=` (ONE per busy cycle — the first suffix; the dedup resets
//     on a fresh busy), `send-fail=` / `err=` on the Unit 3/4 paths.
//   - Config (maintainer ruling 2026-09-22: "only trigger it past the
//     95% line"): OPTIONAL top-level keys in
//     `.opencode/temp/compact_budget.json` (the compact_memory budget
//     store — read-only here, read PER nudge-eligible call — a live
//     edit takes effect on the next tool result): `saturationThreshold`
//     (number, valid 0 < t < 1, default 0.95) and `outputReserve`
//     (non-negative number, default 20_000). Fail-open: file missing /
//     unreadable / malformed / key absent / unparseable / out-of-range
//     → the default.
//   - Toggle (maintainer priority #1): an OPTIONAL top-level
//     `autoCompact` flag in the SAME budget file gates the nudge:
//     absent/`true` → current behavior; `false` → the suffix is
//     suppressed SILENTLY (no per-tool-result log line — the v1.x
//     log-growth discipline); a missing/unreadable/malformed file
//     fails OPEN (current behavior). The file is read per nudge-
//     eligible call (small file).
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
//   prompt, with the SOURCE session's CURRENT agent+model (#85 part 2
//   fire-time resolution — the Unit 4 successor spawn passes the
//   closing session's fresh fetch; a file-trigger spawn has no source
//   session → NO `agent`/`model` field — the host default applies).
//   Success → the helper RETURNS the new sid (string) — the CALLER
//   (the Unit 4 restart/cap-exhaustion branch) records the successor's
//   lineage depth in the module-level `spawned` map (sid → depth — #90
//   part A: repurposed from the old #85 part-1 EXCLUSION epoch mark) and
//   STICKY-deactivates the trigger (a failed spawn changes nothing) —
//   plus a `spawn=` line. Every failure is a `spawn-fail=` line (the
//   helper RETURNS null); it NEVER throws outward. The module stays
//   DEFAULT-ONLY exported (a named export breaks the smoke check).
//
// UNIT 4 (the liveness watchdog — who watches the top-level session):
// an in-scope session going idle (or session.error) is routed on the
// NEXT TICK (the 5s funnel stays the only decision+send funnel; events
// only set state). SCOPE (#85 part 1 — the #82 generalized scope,
// ruling 2026-09-22; #85 part 3 (d): the toggle is checked FIRST — a
// trailing own-line `<|Direct|>` → "none" WINS over the planner test
// (a Direct planner session is OUT of scope — no Unit 4 CONTINUE — and
// the Unit 2 nudge is suppressed (c)); an own-line ON toggle →
// "autorun" (any agent type); only NO toggle falls through to the
// planner test): a sid is in-scope iff the LAST OWN-LINE TOGGLE in its
// user history is ON (#82: `<|autonom|>` / `<|Autorun|>`, case-
// insensitive, whole-line only; OFF = `<|Direct|>`; last-toggle-wins,
// recomputed from the FRESH messages() fetch on every idle —
// restart-safe, no in-memory state), OR — with NO toggle — the
// session's working agent — the FIRST user message's `agent` field
// (the DB `session.agent` mirror; verified 2026-09-22 — the plugin
// cannot read the DB in-process, the message field is the client-
// reachable source) — is a PLANNER agent (agent ids follow
// `planner_<model>`; the prefix survives model-generation renames).
// The planner-only gate is DROPPED — ANY agent type (prompt_builder, a
// future researcher, ...) runs in a loop when toggled. #90 part A: the
// old #85 part-1 self-spawned exclusion is REMOVED — a plugin-spawned
// successor is tracked + inherits the trigger's state (its first user
// message is the RESTART prompt, line 1 = the exact own-line toggle);
// the loop guard moves to the LINEAGE-DEPTH cap on the spawn branch.
// The verdict is cached per watch
// as scope: "planner" | "autorun" | "none" | "unknown" (unknown until
// the first settled fetch; fail-safe = no action); NON-SCOPED sessions
// are NEVER acted on. ROUTING on the LAST
// assistant message's text parts for
// action:\s*(restart|resume|stop|ask_maintainer) (last match wins):
// stop / ask_maintainer → NO send, `route= stop|ask` line; resume or NO
// recognized line → ONE queued CONTINUE prompt (recoveryCount++, cap 2
// per idle cycle, reset on a fresh busy), `recovery= attempt=N` line;
// item 2: a STORED queued message (the compact_memory per-session temp
// file) is relayed as the CONTINUE prompt's FIRST message + the one-line
// post-compaction addendum (`relay=` line; the file is renamed .consumed
// on a successful send);
// a FAILED CONTINUE send (`send-fail=`) DEAD-MARKS the session for the
// current idle cycle (#85 part 2): the next routed tick logs
// `skip= dead` — the remaining recovery retries AND the
// cap-exhaustion fallback spawn are skipped (no doomed successor);
// cleared on a fresh busy (the same reset axis as the recovery
// budget); a dead model never goes busy → the mark persists → no 5s
// retry loop. restart, or cap exhausted with still no line (item 11:
// the closing session's compaction budget FULLY exhausted — count > cap
// — → the RESTART prompt carries the forced-new-session directive + a
// `budget= exhausted` line) →
// SUCCESSOR CHECK (a
// DIFFERENT sid tracked in a session.created event since the closed
// session's lastActivityAt → `skip= successor`) else the
// LINEAGE-DEPTH CAP (#90 part A: a session at depth >= 2 does not
// spawn → `skip= depth sid=` line) else spawnPlanner with the RESTART
// prompt + `route= restart spawn` line. A SUCCESSFUL spawn records the
// successor's lineage depth (trigger depth + 1) and STICKY-deactivates
// the TRIGGER (part B: `deactivate= sid=` line — the trigger is never
// re-routed/re-spawned from again; the flag clears ONLY on a NEW user
// message carrying an own-line ON toggle → `skip= deactivated sid=`).
// session.created events are tracked (sid → epoch) for the successor
// check; the in-memory depth map + deactivation flags are restored at
// init from the plugin's own log (part C, ONCE per host process). OVERLAP-ERA CAVEAT
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
import { createHash } from "node:crypto";
import { appendFileSync, closeSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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

// Unit 3 constants (#85 part 2: the injected bodies carry the SOURCE
// session's CURRENT agent+model — resolved at fire-time from the
// last-assistant info, with the opencode.jsonc agent-config lookup as
// the fallback; NEVER a hardcoded planner constant — the live roster
// moves under model-generation renames). The one-shot trigger file
// name (same dir as the log — `.opencode/temp/`).
const SPAWN_TRIGGER_FILE = "auto_resume_spawn_trigger";
// #85 part 2: the opencode.jsonc fallback target (the project root —
// the factory's `input.directory`; the live roster is the live source
// of truth for the configured agent models).
const OPENCODE_CONFIG_FILE = "opencode.jsonc";

// Unit 2 defaults (deep-dive B §2): the saturation threshold and the
// output reserve are configurable per tick via the optional budget-file
// keys `saturationThreshold` / `outputReserve` (see the header); these
// are the FAIL-OPEN defaults. Usable window = context -
// Math.min(reserve, output ?? 0) (mirrors OpenCode's own overflow math).
const DEFAULT_SATURATION_THRESHOLD = 0.95;
const DEFAULT_OUTPUT_RESERVE = 20000;
// #85 part 3: the nudge LADDER's top rung — ratio >= this appends the
// `--maintainer`-flagged line instead of the plain self-compact-now
// suffix (the HIGHEST rung met fires; the 0.95 threshold rung stays
// per-call configurable — this one is fixed).
const MAINTAINER_NUDGE_RATIO = 0.98;
// The optional autoCompact toggle file (same dir as the log — the
// compact_memory budget store; we only READ its optional top-level
// `autoCompact` key, never write the file).
const COMPACT_BUDGET_FILE = "compact_budget.json";

// #85 part 3: the once-per-busy-cycle NUDGE-LOG dedup: at most ONE
// `nudge=` log line per busy cycle (the suffix itself appends on EVERY
// eligible tool result — a per-step reminder — only the log line is
// deduped); attempts zeroed when a fresh busy cycle arms the session.
// The old once-per-cycle SEND budget is gone with the promptAsync path
// (the nudge is passive — no send, no budget).
const MAX_ATTEMPTS_PER_BUSY_CYCLE = 1;

// Unit 4 constants: the looprunner's launch marker (carried in the
// RESTART start prompt below — a self-spawned successor's first user
// message; #90 part A: it now sits on its OWN LINE there — the #82
// own-line rule COUNTS it, so EVERY restart-spawned successor derives
// scope "autorun" from that message alone — restart-safe), the #82
// OWN-LINE TOGGLE markers (ON counts BOTH spellings, case-insensitive —
// a marker counts ONLY as the whole line, trim-exact; mid-sentence or
// bullet-prefixed lines never toggle; OFF is `<|Direct|>`), the
// recovery budget (at most two queued CONTINUE prompts per idle cycle —
// a fresh busy cycle resets it), and the action-line vocabulary
// (AGENTS.md §Interaction-contract state machine; the LAST match wins).
const AUTONOM_MARKER = "<|autonom|>";
const TOGGLE_ON_MARKERS: ReadonlyArray<string> = ["<|autonom|>", "<|autorun|>"];
const TOGGLE_OFF_MARKER = "<|direct|>";
const MAX_RECOVERY_ATTEMPTS = 2;
// #90 part A: the LINEAGE-DEPTH cap (the replacement of the #85
// part-1 exclusion's loop-prevention role): a session at depth >= N
// does NOT spawn its successor — N = 2: original → successor → last;
// a chain of cap-exhausted empty sessions stops at the 3rd generation
// and stalls visibly for the maintainer. A session never
// plugin-spawned (a user session, a file-trigger spawn) is absent from
// the `spawned` map → depth 0.
const LINEAGE_MAX_DEPTH = 2;
// #98 part A: LINE-ANCHORED — `action:` matches ONLY at line start
// (after any leading whitespace), never as a PROSE-QUOTED MID-LINE
// mention (the 2026-09-23 20:14Z mis-route cause). The anchor group is
// NON-capturing so group 1 is still the ACTION WORD (`found = m[1]`).
const ACTION_RE = /(?:^|\n)\s*action:\s*(restart|resume|stop|ask_maintainer)/g;

let logDir = "";
let logPath = "";
let client: unknown = null;
// #85 part 2: the project root (the factory's `input.directory`) — the
// opencode.jsonc fallback lookup path.
let projectDir = "";
// #85 part 2: the CACHED opencode.jsonc agents map (undefined = not yet
// read, null = read but no usable agents map / parse failure, object =
// the agents map) — read only when the fallback fires (never per tick).
let jsoncAgentsCache: Record<string, unknown> | null | undefined;
// #98 part B: the ctx.log TAIL CURSOR (module-level — the file is
// append-only; the cursor always sits on a line boundary (a newline
// is a single UTF-8 byte), so a byte offset is a character boundary;
// a size REGRESSION (rotation/trim) resets it to 0).
let ctxLogOffset = 0;

// Unit 2 module-level state (all state at module level — the file's
// Unit 1 shape): per-session watches, the re-entrancy latch, the
// model-limits cache (read-through, computed once per model, successful
// values only — a fail-safe null is never cached so a transient failure
// can be re-checked on the next tick), the single tick timer.
interface Watch {
  lastTokenTotal: number;
  model: { providerID: string; modelID: string } | null;
  attempts: number;
  lastActivityAt: number | null;
  armed: boolean;
  status: "busy" | "idle" | "";
  // Unit 4: the scope verdict (planner / autorun / none / unknown —
  // unknown until a messages() fetch settles it; RE-evaluated on every
  // idle — last-toggle-wins can flip with a new user message), the
  // recovery budget (CONTINUE sends this idle cycle; a fresh busy
  // resets it), and the pending-idle latch (ONE decision per idle
  // cycle — set by an idle event or session.error, cleared when the
  // tick makes its decision or the cycle fails).
  scope: "planner" | "autorun" | "none" | "unknown";
  recoveryCount: number;
  idlePending: boolean;
  // #85 part 2 (dead-mark): a FAILED CONTINUE send marked the current
  // idle cycle — the remaining recovery retries AND the
  // cap-exhaustion fallback spawn are skipped (`skip= dead` line);
  // cleared on a fresh busy (the same reset axis as recoveryCount).
  deadMarked: boolean;
  // #90 part B: the STICKY trigger deactivation — a SUCCESSFUL
  // restart/cap-exhaustion spawn hands the session off to its
  // successor: the deactivated trigger is never re-routed or re-spawned
  // from (`skip= deactivated` line — no send, no route=); the flag
  // clears ONLY when a NEW user message (count > deactivatedUserCount)
  // carries an own-line ON toggle (explicit maintainer re-engage). A
  // FAILED spawn changes nothing. Restored at init from the plugin's
  // own log (part C — the user count is unknown there → 0).
  deactivated: boolean;
  deactivatedUserCount: number;
}
const watches = new Map<string, Watch>();
const sending = new Set<string>();
const limitsCache = new Map<string, { context: number; output: number }>();
let tickTimer: ReturnType<typeof setInterval> | null = null;

// Unit 3 module-level state: the LINEAGE-DEPTH map (sid -> depth — #90
// part A repurposes the old #85 part-1 EXCLUSION self-mark: a
// restart/cap-exhaustion spawn stores depth(trigger) + 1 on its
// successor at the spawn branch; a session never plugin-spawned — a
// user session, a file-trigger spawn — is ABSENT → depth 0; the depth
// cap on the spawn branch is the replacement loop guard; part C
// restores the map + the deactivation flags from the plugin's own log
// at init) and the in-flight latch (no double-spawn while one spawn
// attempt is running; held until the trigger file is consumed).
const spawned = new Map<string, number>();
let spawnInFlight = false;

// Unit 4 module-level state: the session.created tracking (sid →
// epoch — the successor check: a DIFFERENT sid created since the
// closing session's lastActivityAt means someone already replaced it,
// so the watchdog stays out of the way).
const createdSessions = new Map<string, number>();

// #80 (unit 4 cap semantics): the pending-inject mark (sid -> epoch) —
// a CONTINUE send has been queued for this sid but not yet consumed by
// a fresh busy. The busy of an INJECTED turn is not a real new busy
// cycle, so it must NOT reset the recovery cap (that reset is what made
// the cap unreachable while the plugin keeps injecting). A mark older
// than the TTL is ignored (expired).
const pendingInject = new Map<string, number>();
const PENDING_INJECT_TTL = 120_000;

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
      scope: "unknown", recoveryCount: 0, idlePending: false, deadMarked: false,
      deactivated: false, deactivatedUserCount: 0,
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

// Unit 2: the stable context LIMITS for a model pair (deep-dive B §2
// step 2): client provider list → provider by id → model entry →
// entry.limit.{context,output}. The usable window is computed per tick
// in tick() from these limits + the per-tick configurable reserve:
// usable = context - Math.min(reserve, output). Fail-safe NULL on
// missing model/provider data, missing/zero context limit, or ANY
// throw (the saturation check simply does not fire — no intervention).
// Successful values are cached per providerID/modelID for the plugin's
// life; nulls are not (transient failures stay re-checkable).
async function getModelLimits(model: { providerID: string; modelID: string }): Promise<{ context: number; output: number } | null> {
  const key = model.providerID + "/" + model.modelID;
  const cached = limitsCache.get(key);
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
      const limits = { context: lim.context, output: out };
      limitsCache.set(key, limits);
      return limits;
    }
    return null;
  } catch {
    return null;
  }
}

// Unit 2: the optional autoCompact toggle (maintainer priority #1) — a
// per-nudge-eligible-call read of `.opencode/temp/compact_budget.json`
// (the compact_memory budget store — READ-ONLY here, never written;
// small file, a per-call read is fine). Lenient parse: file missing /
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

// Unit 2: the configurable saturation threshold + output reserve — a
// per-nudge-eligible-call READ-ONLY parse of the SAME budget file (small
// file — a live edit takes effect on the next tool result).
// Fail-open: file missing / unreadable / JSON parse failure / key
// absent / not-a-number / out-of-range → the default (0.95 / 20_000).
// Valid: `saturationThreshold` 0 < t < 1; `outputReserve` >= 0.
function saturationConfig(): { threshold: number; reserve: number } {
  let threshold = DEFAULT_SATURATION_THRESHOLD;
  let reserve = DEFAULT_OUTPUT_RESERVE;
  try {
    const data: unknown = JSON.parse(readFileSync(join(logDir, COMPACT_BUDGET_FILE), "utf-8"));
    if (typeof data === "object" && data !== null) {
      const rec = data as Record<string, unknown>;
      const t = rec["saturationThreshold"];
      if (typeof t === "number" && Number.isFinite(t) && t > 0 && t < 1) threshold = t;
      const r = rec["outputReserve"];
      if (typeof r === "number" && Number.isFinite(r) && r >= 0) reserve = r;
    }
  } catch {
    // missing / unreadable / malformed → fail OPEN (defaults)
  }
  return { threshold, reserve };
}

// #85 part 3: the passive Unit-2 nudge (the ctx-line suffix ladder — the
// HIGHEST rung met fires): ratio >= 0.98 → the `--maintainer`-flagged
// line; else ratio >= the saturation threshold (per-call configurable,
// default 0.95) → the self-compact-now suffix. The text names the
// measured ratio (3 decimals).
function nudgeText(ratio: number): string {
  if (ratio >= MAINTAINER_NUDGE_RATIO)
    return `⚠⚠ --maintainer: context saturated at ratio=${ratio.toFixed(3)} — self-compact NOW`;
  return `self-compact now (ratio=${ratio.toFixed(3)})`;
}

// #85 part 3: the ctx-line-suffix append rule (the gauge plugin's
// appendReadout rule — the same channel the `ctx:` line rides): empty
// output → the suffix alone; trailing \n → direct concat; else →
// \n + suffix. A non-string output (defensive — the SDK declares
// string) → silent skip (the object untouched). Returns whether the
// suffix was actually appended.
function appendNudge(output: { output?: unknown }, suffix: string): boolean {
  const cur = output.output;
  if (typeof cur !== "string") return false;
  output.output = cur === "" ? suffix : cur.endsWith("\n") ? cur + suffix : cur + "\n" + suffix;
  return true;
}

// #85 part 3: the Unit-2 nudge hook — the ctx-line channel (the SAME
// tool.execute.after output.output mutation the gauge plugin uses for
// its `ctx:` line). PER busy session: a tool result IS the activity
// evidence — the suffix lands on the session's OWN tool returns while
// it is actively working; a stale/idle session emits no tool results →
// no nudge (the stale-session revival is gone by construction). NO
// promptAsync (no resume, no queued turn, no busy, no budget reset, no
// loop). GATES in order (cheap first): a watch with a positive token
// total + a known model; autoCompact ON (per-call budget-file read);
// the model limits resolve (cached after the first fetch); a positive
// usable window; ratio >= the per-call saturation threshold. ONLY then
// the ONE expensive step: the FRESH messages() fetch + scopeVerdict —
// verdict "none" (Direct / non-scoped) → NO suffix (the (c) Direct
// suppression — the verdict must be CURRENT, not the tick-era cached
// one). First suffix of a busy cycle → ONE `nudge=` log line (the
// once-per-cycle dedup on w.attempts — reset on a fresh busy). NEVER
// throws (a throw out of a hook would surface to the session).
async function onToolAfterNudge(
  input: { tool?: string; sessionID?: string; callID?: string },
  output: { title?: unknown; output?: unknown; metadata?: unknown },
): Promise<void> {
  try {
    const sid = typeof input?.sessionID === "string" && input.sessionID !== "" ? input.sessionID : null;
    if (!sid) return;
    const w = watches.get(sid);
    if (!w || w.lastTokenTotal <= 0 || !w.model) return;
    if (!autoCompactEnabled()) return;
    const limits = await getModelLimits(w.model);
    if (limits === null) return;
    const { threshold, reserve } = saturationConfig();
    const usable = limits.context - Math.min(reserve, limits.output);
    if (!(usable > 0)) return;
    const ratio = w.lastTokenTotal / usable;
    if (ratio < threshold) return;
    // The ONE expensive step — only a saturated, actively-working
    // session reaches here: the fresh fetch + scope verdict (the
    // Direct suppression (c) needs the CURRENT verdict — last-toggle-
    // wins can flip with a new user message mid-turn).
    const msgs = await fetchMsgs(sid);
    const verdict = scopeVerdict(msgs);
    if (verdict === "none") return; // (c) Direct / non-scoped: suppressed
    if (verdict !== w.scope) {
      w.scope = verdict;
      log(`scope= ${verdict} sid=${sid}`);
    }
    if (w.attempts < MAX_ATTEMPTS_PER_BUSY_CYCLE) {
      w.attempts = MAX_ATTEMPTS_PER_BUSY_CYCLE; // once-per-cycle nudge-log dedup
      log(`nudge= sid=${sid} ratio=${ratio.toFixed(3)} tokens=${w.lastTokenTotal} usable=${usable}`);
    }
    appendNudge(output, nudgeText(ratio));
  } catch {
    // never throw out of a hook
  }
}

// plan9 unit A: the autorun-identifiable spawn TITLE —
// `<loop-folder> planner-<N>` where N = the largest `planner-<N>` found
// in the current loop folder's `loop_log.md`, + 1 (the same derivation
// the planner uses for its iteration number). Detection mirrors
// `.opencode/tools/loop_log.ts` (~L75): readdirSync the loop root
// (the factory's `input.directory`), exactly-one `autorun-*` folder →
// it, several → the most-recently-modified (the tool's anomaly rule).
// NO loop folder / no `loop_log.md` / no `planner-<N>` line → null
// (the spawn stays un-named, exactly as before). Never throws out —
// a title failure must not break the spawn.
function spawnTitleFor(): string | null {
  try {
    if (!projectDir) return null;
    const loopRoot = join(projectDir, ".opencode", "loop");
    const folders = readdirSync(loopRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith("autorun-"))
      .map((e) => e.name);
    if (folders.length === 0) return null;
    let folder: string;
    if (folders.length === 1) {
      folder = folders[0];
    } else {
      // Several → the most-recently-modified (mirrors the loop_log tool).
      folder = folders
        .map((n) => ({ n, m: statSync(join(loopRoot, n)).mtimeMs }))
        .sort((a, b) => b.m - a.m)[0].n;
    }
    // Missing loop_log.md throws → caught below → null (no identifier).
    const logText = readFileSync(join(loopRoot, folder, "loop_log.md"), "utf-8");
    let max = 0;
    for (const m of logText.matchAll(/planner-(\d+)/g)) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
    if (max === 0) return null; // no planner-<N> line → no identifier
    return `${folder} planner-${max + 1}`;
  } catch {
    return null; // unreadable dir/log → no identifier
  }
}

// Unit 3: the new-planner spawn helper (module-INTERNAL — the factory
// stays the ONLY export): create a fresh session, then ONE queued
// promptAsync carrying the planner start prompt. QUEUED, never
// synchronous (KV-cache invalidation). #85 part 2 (current
// agent+modelID): the body carries the SOURCE session's CURRENT
// agent+model (the fresh fetch passed in by the Unit 4 restart /
// cap-exhausted branch — the successor keeps the agent+model that ran
// the closing session); a file-trigger spawn passes none → NO
// `agent`/`model` field (the host default applies). Never throws
// outward; every failure is a `spawn-fail=` line + a NULL return.
// #90 part B: RETURNS the new sid (string) or null — the Unit 4
// restart/cap-exhaustion branch records the successor's lineage depth
// (part A) and STICKY-deactivates the trigger (part B) ON A SUCCESSFUL
// SPAWN; a failed spawn changes nothing (current semantics). The
// file-trigger path stays unchanged (no source session, no depth set —
// the successor is absent from the `spawned` map → depth 0).
async function spawnPlanner(startPrompt: string, sourceMsgs?: unknown): Promise<string | null> {
  const sess = (client as {
    session?: {
      create?: (options?: unknown) => Promise<unknown>;
      promptAsync?: (args: unknown) => Promise<unknown>;
    };
  } | null)?.session;
  if (!sess || typeof sess.create !== "function") {
    log("spawn-fail= create missing");
    return null;
  }
  // plan9 unit A: the autorun-identifiable title (null → the spawn is
  // exactly as before, no body).
  const identName = spawnTitleFor();
  let newSid: unknown;
  try {
    // No args unless the identifier resolved: SessionCreateData is
    // `body?: { parentID?, title? }` (the vendored @opencode-ai/sdk
    // types — the bounded SDK answer, 2026-09-23).
    const res = identName
      ? await sess.create({ body: { title: identName } })
      : await sess.create();
    // The static SDK shape is res.data.id (Session); a top-level id is
    // accepted defensively (live-shape drift).
    const d = (res as { data?: Record<string, unknown> } | null)?.data;
    newSid = d?.id ?? (res as { id?: unknown } | null)?.id;
  } catch (e) {
    log(`spawn-fail= create: ${(e as { message?: string } | null)?.message ?? "unknown"}`);
    return null;
  }
  if (typeof newSid !== "string" || newSid === "") {
    log("spawn-fail= create no id");
    return null;
  }
  if (typeof sess.promptAsync !== "function") {
    log("spawn-fail= promptAsync missing");
    return null;
  }
  const ident = resolveInjectIdentity(sourceMsgs);
  const body: Record<string, unknown> = { parts: [{ type: "text", text: startPrompt }] };
  if (ident.agent) body.agent = ident.agent;
  if (ident.model) body.model = ident.model;
  try {
    await sess.promptAsync({ path: { id: newSid }, body });
  } catch (e) {
    log(`spawn-fail= promptAsync: ${(e as { message?: string } | null)?.message ?? "unknown"}`);
    return null;
  }
  const identBits: string[] = [];
  if (ident.agent) identBits.push(`agent=${ident.agent}`);
  if (ident.model) identBits.push(`model=${ident.model.providerID}/${ident.model.modelID}`);
  // plan9 unit A: the identifier bit (present only when resolved).
  if (identName) identBits.push(`ident=${identName}`);
  log(`spawn= sid=${newSid}${identBits.length ? " " + identBits.join(" ") : ""}`);
  return newSid; // #90 part B: the caller sets depth + deactivation on success
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

// Item 2 (2026-09-24): the queued continuation message the compact_memory
// tool STORED at queue time (one per-session file under the temp dir —
// .opencode/temp/compact_message_<sid>; the temp fix 0f192e5's disabled
// promptAsync stays gone — the relay is the delivery path). Delivered at
// RESUME time (the unit-4 CONTINUE path — recovery / self-compact resume)
// as the FIRST message of the resumed turn, followed by the one-line
// post-compaction addendum below. Absent / empty / unreadable → null (the
// plain CONTINUE text). Consume-on-success: the file is renamed
// .consumed ONLY after a successful promptAsync (a failed send keeps it
// for the next attempt).
const POST_COMPACTION_ADDENDUM =
  "post-compaction: re-read your head files per .opencode/agent/prompts/agent_readme_post_compaction.md and CONTINUE — never re-plan from scratch";

function queuedMessagePath(sid: string): string {
  return join(logDir, `compact_message_${sid}`);
}

function readQueuedMessage(sid: string): string | null {
  try {
    const t = readFileSync(queuedMessagePath(sid), "utf-8");
    return t.trim() === "" ? null : t;
  } catch {
    return null; // absent / unreadable → the plain CONTINUE text
  }
}

function consumeQueuedMessage(sid: string): void {
  try {
    renameSync(queuedMessagePath(sid), queuedMessagePath(sid) + ".consumed");
  } catch {
    // best effort — never throw out of a hook
  }
}

// Unit 4: the RESTART start prompt for the spawnPlanner call (the
// restart branch / cap-exhausted branch): carries the looprunner
// launch marker + the iteration-counter rule + the rebuild-from-
// committed-state directive. #90 part A: LINE 1 is the EXACT OWN-LINE
// toggle (`<|autonom|>` alone — the #82 own-line rule counts it, the
// prose moved to line 2): EVERY restart-spawned successor derives
// scope "autorun" from its first user message ALONE via the existing
// last-toggle-wins scan — RESTART-SAFE (no in-memory state needed:
// after a host restart the same scan over the same message gives the
// same verdict). The trigger's current agent+model already rides the
// spawn body (#85 part 2). A Direct (OFF) trigger can never reach the
// restart branch (scope "none" is never routed) — no OFF marker needed.
// A scope=planner trigger (no own-line toggle) thus "transmits" its
// state as autorun-scoped: behaviorally identical today (routeScoped-
// Idle treats "planner" and "autorun" alike), and the loop
// self-perpetuates (the successor's own restart spawn carries the same
// text). Item 11 (2026-09-24): when the closing session's compaction
// budget is FULLY exhausted (count > cap — the emergency 1 consumed),
// the prompt ADDS the forced-new-session directive (the limit-run
// DETECTION is the #93 context_recovery port — this is the condition
// check + the directive construction).
function restartText(sid: string, exhausted: boolean): string {
  const base =
    `<|autonom|>\n` +
    `Run autonomously. (auto-resume unit 4 restart branch: the previous planner closed with ` +
    "`action: restart`.) Your iteration number = the largest `planner-N` in the current loop folder's `loop_log.md` " +
    "plus one (verify from the log; the counter-mismatch rule applies). Rebuild reality from committed state " +
    "(git log, NAP, TODO.md) and continue per your planner prompt's autonomous mode.";
  if (!exhausted) return base;
  // The directive's session id = the CLOSING session (the budget store
  // key checked in budgetExhausted — the pinned source).
  return (
    base +
    ` compaction budget exhausted — scan the dump of ${sid} to gain all relevant knowledge ` +
    `(the auto-dump corpus; ` +
    "`dump_session.cjs` in .opencode/agent/scripts/db/ for on-demand dumps); " +
    "make a clean handover/commit if not present; then continue per the NAP."
  );
}

// Item 11 (2026-09-24): the forced-new-session budget check — the budget
// store (the SAME compact_budget.json the Unit-2 nudge reads; READ-ONLY,
// per restart-branch call) shows the closing session's compaction count
// FULLY EXHAUSTED: count > cap (the post-item-10 exhaustion state — the
// emergency 1 consumed, count = cap+1; count == cap leaves the emergency
// available → NOT exhausted). The cap is resolved EXACTLY as
// compact_memory.ts resolves it (mirror of its resolveCap): the CPU
// safety invariant (cap 0), the model_budget map's EXACT bare-model-id
// key (the session entry's `model` = the model id at the last increment),
// else model_budget.default, else the default 1. Fail-open: file missing
// / unreadable / malformed / no entry → NOT exhausted (no directive).
function budgetExhausted(sid: string): boolean {
  try {
    const data: unknown = JSON.parse(readFileSync(join(logDir, COMPACT_BUDGET_FILE), "utf-8"));
    if (typeof data !== "object" || data === null) return false;
    const rec = data as Record<string, unknown>;
    const sessions = rec["sessions"];
    if (sessions == null || typeof sessions !== "object" || Array.isArray(sessions)) return false;
    const entry = (sessions as Record<string, unknown>)[sid];
    if (entry == null || typeof entry !== "object") return false;
    const e = entry as Record<string, unknown>;
    const count = e["count"];
    if (typeof count !== "number" || !Number.isFinite(count)) return false;
    const model = typeof e["model"] === "string" ? (e["model"] as string) : "";
    const mb = rec["model_budget"];
    let cap: number;
    if (/^cpu/i.test(model)) {
      cap = 0; // the CPU safety invariant (mirror of compact_memory's resolveCap)
    } else if (mb != null && typeof mb === "object" && !Array.isArray(mb)) {
      const m = mb as Record<string, unknown>;
      if (model !== "" && typeof m[model] === "number" && Number.isFinite(m[model])) cap = m[model] as number;
      else if (typeof m["default"] === "number" && Number.isFinite(m["default"])) cap = m["default"] as number;
      else cap = 1;
    } else {
      cap = 1;
    }
    return count > cap;
  } catch {
    return false; // missing / unreadable / malformed → fail OPEN (no directive)
  }
}

// Unit 4: the SDK list shape of a messages() result —
// Array<{info: Message, parts: Array<Part>}> (SessionMessagesData,
// 200 = the array of message+parts pairs). DUAL SHAPE (2026-09-21):
// the in-process client resolves the list as a RequestResult wrapper
// ({ data: [...] }) — normalize to the bare array before the logic
// (the same fix as resolveModel, compact_memory.ts, 280b8d0).
// Defensive: a non-array or malformed entry yields no role / no text.
type MsgPair = { info?: Record<string, unknown>; parts?: Array<Record<string, unknown>> };

function msgPairs(msgs: unknown): MsgPair[] {
  const arr = Array.isArray(msgs)
    ? (msgs as MsgPair[])
    : (msgs != null && typeof msgs === "object" && Array.isArray((msgs as { data?: unknown }).data)
      ? (msgs as { data: MsgPair[] }).data
      : null);
  return arr ?? [];
}

function textParts(pair: MsgPair): string[] {
  const out: string[] = [];
  for (const p of pair.parts ?? []) {
    if (p && typeof p === "object" && p.type === "text" && typeof p.text === "string") out.push(p.text);
  }
  return out;
}

// #82: the last-toggle-wins scan — the LAST own-line toggle marker in
// the user history wins (bidirectional; restart-safe: no in-memory
// state — the same scan derives the state after a process restart). A
// marker counts ONLY as the whole line (trim-exact — mid-sentence or
// bullet-prefixed lines never toggle).
function lastToggle(msgs: unknown): "on" | "off" | null {
  let last: "on" | "off" | null = null;
  for (const pair of msgPairs(msgs)) {
    if (!pair.info || pair.info.role !== "user") continue;
    for (const t of textParts(pair)) {
      for (const line of t.split(/\r?\n/)) {
        const s = line.trim().toLowerCase();
        if (TOGGLE_ON_MARKERS.includes(s)) last = "on";
        else if (s === TOGGLE_OFF_MARKER) last = "off";
      }
    }
  }
  return last;
}

// #90 part B: the LAST user message's own-line toggle (the
// deactivation clear check): a NEW user message clears the flag ONLY
// when it ITSELF carries an own-line ON toggle — the whole-history
// scan (lastToggle) would wrongly credit the trigger's
// pre-deactivation toggle to a plain ping (the trigger was
// autorun-scoped, so its history always scans "on").
function lastUserToggle(msgs: unknown): "on" | "off" | null {
  let last: MsgPair | null = null;
  for (const pair of msgPairs(msgs)) {
    if (pair.info && pair.info.role === "user") last = pair;
  }
  if (!last) return null;
  let t: "on" | "off" | null = null;
  for (const txt of textParts(last)) {
    for (const line of txt.split(/\r?\n/)) {
      const s = line.trim().toLowerCase();
      if (TOGGLE_ON_MARKERS.includes(s)) t = "on";
      else if (s === TOGGLE_OFF_MARKER) t = "off";
    }
  }
  return t;
}

// #90 part B: the user-message count (the deactivation's new-message
// baseline — the flag clears only when a NEW user message arrived:
// count > the deactivation-time count).
function userMessageCount(msgs: unknown): number {
  let n = 0;
  for (const pair of msgPairs(msgs)) {
    if (pair.info && pair.info.role === "user") n += 1;
  }
  return n;
}

// #85 part 1 (#82 generalized scope): the scope verdict, recomputed
// from the FRESH messages() fetch (last-toggle-wins can flip with a new
// user message — no long-lived cache). #85 part 3 (d): the LAST OWN-
// LINE TOGGLE is checked BEFORE the planner test — a trailing own-line
// `<|Direct|>` → "none" WINS over the planner test (Direct deactivates
// Unit 4 for the planner AND suppresses the Unit 2 nudge (c)); an
// own-line ON toggle → "autorun" (ANY agent type — #82, the planner-
// only gate is DROPPED); only NO toggle falls through to the planner
// test (the FIRST user message's `agent` field — the DB
// `session.agent` mirror — verified 2026-09-22; the plugin cannot read
// the DB in-process, so the message field is the client-reachable
// source; agent ids follow `planner_<model>`; the prefix survives
// model-generation renames) → "planner", else "none". #90 part A: the
// old #85 part-1 self-spawned exclusion is REMOVED — a plugin-spawned
// successor is tracked (it derives scope from its own history — the
// RESTART prompt's own-line toggle makes it "autorun") and inherits
// the trigger's state; the loop guard moved to the LINEAGE-DEPTH cap
// on the restart/cap-exhaustion spawn branch.
function scopeVerdict(msgs: unknown): "planner" | "autorun" | "none" {
  const toggle = lastToggle(msgs);
  if (toggle === "off") return "none"; // (d) Direct beats the planner test
  if (toggle === "on") return "autorun"; // #82 — ANY agent type
  const agent = firstUserAgent(msgs);
  if (typeof agent === "string" && agent.startsWith("planner")) return "planner";
  return "none";
}

// #80 (agent retention): the FIRST user message's agent field (the
// session's working agent) — the injected promptAsync bodies carry it
// so a resumed turn keeps the agent that ran the session; null when no
// user message carries a non-empty string agent field.
function firstUserAgent(msgs: unknown): string | null {
  for (const pair of msgPairs(msgs)) {
    if (!pair.info || pair.info.role !== "user") continue;
    const a = pair.info.agent;
    if (typeof a === "string" && a !== "") return a;
  }
  return null;
}

// #85 part 2 (current agent+modelID): the LAST assistant message's info
// object (the session's CURRENT working agent+model — reflects
// mid-session switches); null when no assistant message exists.
// #91: the COMPACTION SUMMARY (an assistant message with
// agent="compaction" — a synthetic summary, not a real turn) is
// SKIPPED — it must never supply the inject/spawn identity (the
// 2026-09-23 live incident: a successor spawned with agent=compaction).
function lastAssistantInfo(msgs: unknown): Record<string, unknown> | null {
  let last: Record<string, unknown> | null = null;
  for (const pair of msgPairs(msgs)) {
    if (pair.info && pair.info.role === "assistant" && pair.info.agent !== "compaction") last = pair.info;
  }
  return last;
}

// #85 part 2 (fire-time identity) + #85 part 3 (the Unit-2 nudge scope
// gate): a fresh messages() fetch — called only when a send is actually
// queued (Unit 3/4) or a tool result is nudge-eligible (a saturated,
// actively-working session — never per tick); null when the client has
// no messages() or the fetch fails (the caller falls through / fails
// safe).
async function fetchMsgs(sid: string): Promise<unknown> {
  try {
    const sess = (client as { session?: { messages?: (args: unknown) => Promise<unknown> } } | null)?.session;
    if (!sess || typeof sess.messages !== "function") return null;
    return await sess.messages({ path: { id: sid } });
  } catch {
    return null;
  }
}

// #85 part 2 (JSONC fallback): strip comments + trailing commas (the
// live opencode.jsonc shape — comments, trailing commas) into strict
// JSON. String-aware (a `//` inside a string literal is not a
// comment); a parse failure throws (the caller swallows → null).
function parseJsonc(text: string): unknown {
  let out = "";
  let i = 0;
  let inStr = false;
  while (i < text.length) {
    const ch = text[i];
    if (inStr) {
      out += ch;
      if (ch === "\\" && i + 1 < text.length) {
        i += 1;
        out += text[i];
      } else if (ch === '"') {
        inStr = false;
      }
      i += 1;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    if (ch === "}" || ch === "]") {
      while (out.endsWith(" ") || out.endsWith("\n") || out.endsWith("\t")) out = out.slice(0, -1);
      if (out.endsWith(",")) out = out.slice(0, -1);
    }
    out += ch;
    i += 1;
  }
  return JSON.parse(out);
}

// #85 part 2 (JSONC fallback): the project's opencode.jsonc AGENT MAP —
// CACHED (undefined = not yet read, null = read but no usable agents
// map / parse failure) — read only when the fallback fires (never per
// tick). The live opencode.jsonc is the live source of truth for the
// roster.
function jsoncAgents(): Record<string, unknown> | null {
  if (jsoncAgentsCache !== undefined) return jsoncAgentsCache;
  jsoncAgentsCache = null;
  try {
    const raw = readFileSync(join(projectDir, OPENCODE_CONFIG_FILE), "utf-8");
    const data = parseJsonc(raw);
    const agents = (data as { agent?: unknown } | null)?.agent;
    if (agents && typeof agents === "object" && !Array.isArray(agents)) {
      jsoncAgentsCache = agents as Record<string, unknown>;
    }
  } catch {
    // missing / unreadable / malformed → null (cached)
  }
  return jsoncAgentsCache;
}

// #85 part 2 (JSONC fallback): an agent's CONFIGURED model from the
// cached agents map — the live opencode.jsonc stores it as a
// `"providerID/modelID"` string (an object pair is accepted
// defensively); null when the agent or its model is absent /
// malformed.
function configuredModelForAgent(agent: string): { providerID: string; modelID: string } | null {
  const agents = jsoncAgents();
  if (!agents) return null;
  const cfg = agents[agent];
  if (!cfg || typeof cfg !== "object") return null;
  const m = (cfg as Record<string, unknown>).model;
  if (typeof m === "string") {
    const slash = m.indexOf("/");
    if (slash > 0 && slash < m.length - 1) return { providerID: m.slice(0, slash), modelID: m.slice(slash + 1) };
    return null;
  }
  const o = m as { providerID?: unknown; modelID?: unknown } | null;
  if (o && typeof o.providerID === "string" && typeof o.modelID === "string" && o.providerID !== "" && o.modelID !== "") {
    return { providerID: o.providerID, modelID: o.modelID };
  }
  return null;
}

// #85 part 2 (current agent+modelID — the root-cause fix for the
// stale-agent UnknownError): the injected body's agent+model, resolved
// at FIRE-TIME (only when a send is actually queued, never per tick).
// Source order — NEVER a planner constant:
//   1. the LAST assistant message's info.agent + info.model (the
//      session's CURRENT working pair — reflects mid-session switches;
//      for a spawn: the SOURCE session's pair carries over to the
//      successor);
//   2. if absent: the session's working agent (the FIRST user message's
//      agent field) + that agent's configured model from
//      opencode.jsonc (cached; read only when the fallback fires);
//   3. if still absent: NEITHER field (the host default applies — the
//      send site logs an agent-omit= line).
function resolveInjectIdentity(msgs: unknown): { agent: string | null; model: { providerID: string; modelID: string } | null } {
  const last = lastAssistantInfo(msgs);
  const a1 = last?.agent;
  const m1 = last ? modelPair(last, {}) : null;
  if (typeof a1 === "string" && a1 !== "" && m1) return { agent: a1, model: m1 };
  const agent = (typeof a1 === "string" && a1 !== "" ? a1 : null) ?? firstUserAgent(msgs);
  if (!agent) return { agent: null, model: null };
  return { agent, model: configuredModelForAgent(agent) };
}

// Unit 4: the routing scan — the LAST assistant message's text parts,
// the LAST match of the action-line regex wins; null = no assistant
// message or no recognized line. #91: the COMPACTION SUMMARY
// (agent="compaction") is SKIPPED — its QUOTED action lines (a summary
// of a predecessor's close) must never drive the routing (the
// 2026-09-23 live incident: a quoted "action: restart" mis-routed a
// recovery into a restart spawn).
function lastAssistantAction(msgs: unknown): string | null {
  let last: MsgPair | null = null;
  for (const pair of msgPairs(msgs)) {
    if (pair.info && pair.info.role === "assistant" && pair.info.agent !== "compaction") last = pair;
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
  // #85 part 2: the SAME fresh fetch also serves the fire-time
  // identity resolution below (the injected body's current agent+model
  // — one round trip, no extra fetch).
  // #85 part 1 (#82 scope): the verdict is RECOMPUTED from the fresh
  // fetch (last-toggle-wins can flip with a new user message — no
  // long-lived cache). The verdict log line (#80) pins the decision for
  // attribution and lands only on CHANGE (no per-tick spam).
  const verdict = scopeVerdict(msgs);
  if (verdict !== w.scope) {
    w.scope = verdict;
    log(`scope= ${verdict} sid=${sid}`);
  }
  // #90 part B: the STICKY trigger deactivation — checked right after
  // the scope recompute: no send, no re-spawn, no route= line; the
  // session stays MANUALLY usable (a maintainer ping still gets a
  // normal model response — the plugin simply never injects or spawns
  // from it). The flag clears ONLY on an explicit re-engage: a NEW
  // user message (count > the deactivation-time count) that carries an
  // OWN-LINE ON toggle (checked on the last user message alone — the
  // whole-history scan would credit the trigger's pre-deactivation
  // toggle to a plain ping). A plain ping keeps the flag.
  if (w.deactivated) {
    if (userMessageCount(msgs) > w.deactivatedUserCount && lastUserToggle(msgs) === "on") {
      w.deactivated = false; // explicit re-engage — fall through (the successor check prevents duplication)
    } else {
      log(`skip= deactivated sid=${sid}`);
      w.idlePending = false; // the decision for this idle cycle is made
      return;
    }
  }
  if (w.scope === "none") {
    // non-scoped: NEVER acted on (fail-safe = no action)
    w.idlePending = false;
    return;
  }
  w.idlePending = false; // the decision for this idle cycle is made below
  // #85 part 2 (dead-mark): a FAILED CONTINUE send marked the current
  // idle cycle — skip the remaining recovery retries AND the
  // cap-exhaustion fallback spawn (no doomed successor); cleared on a
  // fresh busy (the same reset axis as recoveryCount).
  if (w.deadMarked) {
    log(`skip= dead sid=${sid}`);
    return;
  }
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
        w.deadMarked = true; // #85 part 2: a failed CONTINUE dead-marks the idle cycle
        return;
      }
      // QUEUED (promptAsync): the synthetic part lands as the next turn
      // at idle — the race-free channel (never a synchronous prompt).
      // #85 part 2 (current agent+modelID): the body carries the
      // session's CURRENT working agent+model — resolved from the SAME
      // fresh fetch (no extra round trip; fire-time only); a null
      // agent → no agent field (the host default applies) + an
      // agent-omit= attribution line.
      const ident = resolveInjectIdentity(msgs);
      // Item 2: the stored queued message (the compact_memory temp file)
      // is the FIRST message of the resumed turn + the one-line
      // post-compaction addendum; NO stored message → the plain
      // CONTINUE text.
      const stored = readQueuedMessage(sid);
      const text = stored != null ? `${stored}\n${POST_COMPACTION_ADDENDUM}` : continueText(sid);
      if (stored != null) log(`relay= sid=${sid}`);
      const body: Record<string, unknown> = { parts: [{ type: "text", text }] };
      if (ident.agent) body.agent = ident.agent;
      else log(`agent-omit= sid=${sid} no current agent+model`);
      if (ident.model) body.model = ident.model;
      await sess.promptAsync({ path: { id: sid }, body });
      if (stored != null) consumeQueuedMessage(sid); // consume ONLY on a successful send
      // #80 (cap semantics): mark the pending injection — the busy of
      // this injected turn must not reset the recovery cap.
      pendingInject.set(sid, Date.now());
    } catch (e) {
      log(`send-fail= sid=${sid} ${(e as { message?: string} | null)?.message ?? "unknown"}`);
      w.deadMarked = true; // #85 part 2: a failed CONTINUE dead-marks the idle cycle
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
  // #90 part A: the LINEAGE-DEPTH cap (the replacement of the #85
  // part-1 exclusion's loop-prevention role): a session at depth >=
  // LINEAGE_MAX_DEPTH does NOT spawn its successor — the chain of
  // cap-exhausted empty sessions stops at the 3rd generation and
  // stalls visibly for the maintainer. A session never plugin-spawned
  // (a user session, a file-trigger spawn) is absent from the map →
  // depth 0.
  const depth = spawned.get(sid) ?? 0;
  if (depth >= LINEAGE_MAX_DEPTH) {
    log(`skip= depth sid=${sid} depth=${depth}`);
    return;
  }
  // Item 11: the forced-new-session budget check (FULLY exhausted → the
  // restart prompt carries the directive).
  const exhausted = budgetExhausted(sid);
  if (exhausted) log(`budget= exhausted sid=${sid}`);
  log(`route= restart spawn sid=${sid}`);
  // #85 part 2: the SOURCE session's fresh fetch — its current
  // agent+modelID carries over to the successor.
  const newSid = await spawnPlanner(restartText(sid, exhausted), msgs); // Unit 3 helper (never throws outward)
  // #90 part A+B: a SUCCESSFUL spawn records the successor's lineage
  // depth (trigger depth + 1) and STICKY-deactivates the TRIGGER
  // (part B: the fresh fetch is already in hand — its user-message
  // count is the deactivation baseline); a failed spawn (null)
  // changes nothing (current semantics).
  if (newSid) {
    spawned.set(newSid, depth + 1);
    w.deactivated = true;
    w.deactivatedUserCount = userMessageCount(msgs);
    log(`deactivate= sid=${sid}`);
  }
}

// #98 part B: the COMPACT-line sid extractor (the measured ctx.log
// line format: `<YYYY-MM-DD_HH-MM> <model> COMPACT <sid>
// [tok=<n> <source>] messages=<n>`).
const COMPACT_SID_RE = /\bCOMPACT\s+(ses_[A-Za-z0-9_]+)/;

// #98 part B: the RE-ARM tail-read — on EVERY tick, read only the NEW
// content of `.opencode/temp/ctx.log` since the last tick (the
// `ctxLogOffset` cursor); for each NEW `COMPACT <sid>` line whose sid
// is currently WATCHED: set `idlePending` + reset `recoveryCount` to 0
// (a FRESH recovery budget — the context situation changed after the
// compaction). The silent-compaction gap: a compaction that neither
// emits a fresh busy nor an idle would otherwise leave the watch
// UNARMED (no pending decision, no recovery, no restart — the
// session stalls silently). The existing routing loop (the SAME tick)
// then routes the newly-armed sid. A partial trailing line (no newline
// yet — the writer is mid-write) is held back for the next tick
// (processing it now would lose it forever). Never throws (the tick's
// never-throw contract); only watched sids are armed; a fresh busy
// already clears `idlePending` (the arm path) so no double send.
function tailCompactRearm(): void {
  const ctxLogPath = join(logDir, "ctx.log");
  let size: number;
  try {
    size = statSync(ctxLogPath).size;
  } catch {
    return; // no ctx.log yet / unreadable → no-op
  }
  if (size < ctxLogOffset) ctxLogOffset = 0; // shrank (rotation/trim) → re-read from the start
  if (size === ctxLogOffset) return; // no new content
  const buf = Buffer.alloc(size - ctxLogOffset);
  let n = 0;
  try {
    const fd = openSync(ctxLogPath, "r");
    try {
      n = readSync(fd, buf, 0, size - ctxLogOffset, ctxLogOffset);
    } finally {
      closeSync(fd);
    }
  } catch {
    return; // unreadable → no-op (the cursor is unchanged)
  }
  const chunk = buf.subarray(0, n).toString("utf-8");
  let complete: string;
  if (chunk.length > 0 && chunk.charCodeAt(chunk.length - 1) === 10) {
    ctxLogOffset += n; // every line in the chunk is fully written
    complete = chunk;
  } else {
    const nl = chunk.lastIndexOf("\n");
    ctxLogOffset += nl + 1; // nl === -1 → advance 0 (hold the whole chunk back)
    complete = nl >= 0 ? chunk.slice(0, nl) : "";
  }
  for (const line of complete.split("\n")) {
    const m = line.match(COMPACT_SID_RE);
    if (!m) continue;
    const w = watches.get(m[1]);
    if (!w) continue; // only watched sids
    w.idlePending = true;
    w.recoveryCount = 0; // a FRESH recovery budget (the context changed)
    log(`rearm= compact sid=${m[1]}`);
  }
}

// Unit 3+4: the ONE tick (5000ms default, per-factory tickMs option) —
// the only decision+send funnel. Unit 3's
// trigger check runs first (the spawn is a high-priority action), then
// #98 part B re-arms the watched sids on a NEW ctx.log COMPACT line,
// then Unit 4 routes every scoped session with a pending idle decision.
// (#85 part 3: Unit 2 has no tick leg anymore — the nudge is a passive
// ctx-line suffix on the tool-call return, gated per tool result in
// onToolAfterNudge.) Never throws out (an unhandled rejection from the
// timer would take the host down).
async function tick() {
  try {
    await checkSpawnTrigger(); // Unit 3 — the trigger check first
  } catch {
    // swallow — the timer callback must never reject
  }
  try {
    tailCompactRearm(); // #98 part B — BEFORE the routing loop: arm on a NEW ctx.log COMPACT line
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
      w.attempts = 0; // #85 part 3: a fresh busy cycle resets the once-per-cycle nudge-log dedup
      // #80 (cap semantics): only a REAL new busy resets the recovery
      // cap — a busy that consumes a still-pending CONTINUE injection
      // (within the TTL) is the injected turn itself, not a fresh
      // cycle, so the cap keeps accumulating.
      const sentAt = pendingInject.get(sid);
      if (sentAt !== undefined && Date.now() - sentAt <= PENDING_INJECT_TTL) {
        pendingInject.delete(sid);
        w.idlePending = false; // an injected busy: no pending decision
        w.status = "busy";
        log(`arm= sid=${sid} injected`);
      } else {
        w.recoveryCount = 0; // Unit 4: a fresh busy cycle resets the recovery budget
        w.deadMarked = false; // #85 part 2: a fresh busy clears the dead-mark
        w.idlePending = false; // a fresh busy cycle: no pending decision
        w.status = "busy";
        log(`arm= sid=${sid}`);
      }
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
    // #96: the per-token stream delta is NEVER logged (~97% of the old
    // log volume). armEvent is a no-op for this type (the Unit 2
    // saturation input is message.updated ONLY) — the early return
    // changes nothing but the missing log line.
    if (ev.type === "message.part.delta") return;
    const props = (ev.properties ?? {}) as Record<string, unknown>;
    const sid = props.sessionID ?? "unknown";
    const extra = keyFields(props);
    log(`event=${ev.type} sid=${sid}${extra ? " " + extra : ""}`);
    armEvent(ev.type, sid, props);
  } catch {
    // swallow — never throw out of a hook
  }
};

// #80 (code state pin): the running plugin source's 8-char sha256
// prefix — the `surface=` line carries it so the NEXT incident pins
// WHICH source the logging process actually ran (the H2 hypothesis:
// running variant ≠ committed file). Best-effort: any failure →
// "unknown" (the line still lands).
function codeVersion(): string {
  try {
    return createHash("sha256").update(readFileSync(fileURLToPath(import.meta.url))).digest("hex").slice(0, 8);
  } catch {
    return "unknown";
  }
}

// #96: the INIT SIZE GUARD (runs BEFORE restoreLineageFromLog — the
// #90 restore then sees only the surviving tail: an older route=/spawn=
// pair cut by the trim resets depth to 0 — best-effort by design, the
// documented accepted consequence). If the log outgrew the cap: keep
// the byte TAIL (the last tailBytes bytes) and append ONE
// `log-trim= old=<bytes> new=<bytes>` line (old = the pre-trim size,
// new = the kept tail size). The file is never held open (log() is a
// per-line appendFileSync) → a synchronous init-trim is safe.
// absent/unreadable file → no-op. Best-effort: a trim failure must not
// break plugin load.
function trimLogIfNeeded(maxBytes: number, tailBytes: number): void {
  let size: number;
  try {
    size = statSync(logPath).size;
  } catch {
    return; // no log yet / unreadable → no-op
  }
  if (size <= maxBytes) return;
  const keep = Math.min(size, tailBytes);
  if (keep >= size) return; // degenerate caps (tail >= size) → nothing to cut
  try {
    const buf = Buffer.alloc(keep);
    const fd = openSync(logPath, "r");
    let n = 0;
    try {
      n = readSync(fd, buf, 0, keep, size - keep);
    } finally {
      closeSync(fd);
    }
    writeFileSync(logPath, buf.subarray(0, n));
    log(`log-trim= old=${size} new=${keep}`);
  } catch {
    // swallow — best-effort
  }
}

// #90 part C: the RESTART-SAFE restoration (ONCE per host process —
// the first factory call; the live host loads the plugin once per
// process): the plugin reads its OWN auto_resume.log and restores the
// in-memory #90 state a host restart loses: each `route= restart
// spawn sid=X` line PAIRED with the following `spawn= sid=Y` line →
// deactivated(X) + lineage depth(Y) = depth(X) + 1; an UNPAIRED `spawn=`
// line → depth 0 (the file-trigger path). A `spawn-fail=` line between
// the pair breaks the pairing (a failed spawn never deactivated —
// part B semantics). After a host restart the LOG (temp dir) outlives
// the process, so the lineage stays bounded across restarts.
// Best-effort: no log yet (first boot) / unreadable → nothing restored
// (empty state = all depth 0, no deactivations).
let lineageRestored = false;
function restoreLineageFromLog(): void {
  if (lineageRestored) return; // ONCE per process (the smoke re-factories — no re-parse)
  lineageRestored = true;
  let text: string;
  try {
    text = readFileSync(logPath, "utf-8");
  } catch {
    return; // no log yet / unreadable → nothing to restore
  }
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.includes("spawn= sid=")) {
      const m = line.match(/spawn= sid=(\S+)/);
      // UNPAIRED spawn= line → depth 0 (the file-trigger path — a
      // child already paired by an earlier route= line keeps its depth).
      if (m && !spawned.has(m[1])) spawned.set(m[1], 0);
      continue;
    }
    const rt = line.match(/route= restart spawn sid=(\S+)/);
    if (!rt) continue;
    // look ahead for the PAIRING spawn= line (no spawn-fail= in
    // between — a failed spawn never deactivated, part B).
    for (let j = i + 1; j < lines.length; j += 1) {
      const lj = lines[j];
      if (lj.includes("spawn-fail=")) break;
      const sj = lj.match(/spawn= sid=(\S+)/);
      if (sj) {
        const parent = rt[1];
        const w = getWatch(parent);
        w.deactivated = true; // the restored STICKY flag (user count unknown → 0)
        spawned.set(sj[1], (spawned.get(parent) ?? 0) + 1); // depth(parent) + 1
        break;
      }
    }
  }
}

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
    log(`surface= v=${codeVersion()} ` + parts.join(" "));
  } catch {
    // swallow — a probe failure must not break plugin load
  }
}

export default (async (input: PluginInput) => {
  logDir = join(input?.directory ?? "", ".opencode", "temp");
  logPath = join(logDir, "auto_resume.log");
  projectDir = input?.directory ?? ""; // #85 part 2: the opencode.jsonc fallback path
  client = input?.client ?? null;
  // #96: the log size guard caps — factory options (the live host never
  // passes them → the 20MB/2MB defaults (live: a trim fires only when
  // the log outgrew 20MB); the smoke passes small values so the trim is
  // testable without a multi-megabyte fixture — the tickMs pattern).
  const maxLogOpt: unknown = (input as Record<string, unknown> | undefined)?.maxLogBytes;
  const maxLogBytes = typeof maxLogOpt === "number" && Number.isFinite(maxLogOpt) && maxLogOpt > 0 ? maxLogOpt : 20 * 1024 * 1024;
  const tailOpt: unknown = (input as Record<string, unknown> | undefined)?.logTailBytes;
  const logTailBytes = typeof tailOpt === "number" && Number.isFinite(tailOpt) && tailOpt > 0 ? tailOpt : 2 * 1024 * 1024;
  trimLogIfNeeded(maxLogBytes, logTailBytes); // #96: BEFORE the #90 restore (it then sees the surviving tail)
  restoreLineageFromLog(); // #90 part C: ONCE per process (before any routing can happen)
  probeSurface(input); // one-shot at load
  // The tick period is a per-factory-call option: the live host never
  // passes tickMs → the 5000ms default (live behavior unchanged); the
  // smoke passes a short tick so its tick-waits stay sub-second
  // (test-only lever).
  const tickOpt: unknown = (input as Record<string, unknown> | undefined)?.tickMs;
  const tickMs = typeof tickOpt === "number" && Number.isFinite(tickOpt) && tickOpt > 0 ? tickOpt : 5000;
  if (!tickTimer) {
    tickTimer = setInterval(() => {
      void tick(); // the tick (5000ms by default) — the only decision+send funnel
    }, tickMs);
    tickTimer.unref(); // must not keep the host process alive
  }
  return {
    event: onEvent,
    // #85 part 3: the passive Unit-2 nudge — the ctx-line suffix on the
    // tool-call return (the gauge plugin's ctx: line channel).
    "tool.execute.after": onToolAfterNudge,
  };
}) satisfies Plugin;
