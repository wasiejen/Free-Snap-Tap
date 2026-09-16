// intercept_observer.ts — 5.3 log-only intercept observer + 5.4 read-scoped
// fuzzy read resolution (lane 5.3/5.4, approved 2026-09-16; design source:
// research 2026-09-16_fuzzy-and-numword-tool-reliability.md §2 + addendum
// C6/C7).
//
// WHAT IT IS: a SEPARATE plugin (functionally separate from ctx_watchdog.ts —
// maintainer ruling) with a `tool.execute.before` hook, active for ALL tools
// (read/glob/grep/bash + write/edit observed too). It has TWO channels:
//
// (1) OBSERVATION (log-only, ALL tools): it OBSERVES and LOGS suspicious
// dense-digit / numword / redundancy / path anomalies to
// `.opencode/temp/intercept.log`. It NEVER mutates `output.args` for this
// channel and NEVER blocks — the incident data stream is its value
// (addendum C7: the log proves an incident OCCURRED, not that a correction
// was necessary).
//
// (2) READ-SCOPED RESOLUTION (the 5.4 "read functionality", approved
// 2026-09-16; research §2.2-§2.7 + R1 the pair pipeline, 2026-09-16): for
// `input.tool === "read"` with a STRING `output.args.filePath` ONLY, TWO
// channels in FIXED ORDER (decision-record §2.6):
//   (2a) PAIR RESOLUTION (R1): every `[left:right]` pair in the filePath
//       resolves independently (right-wins canonical); EXISTENCE GATE —
//       MUTATES `output.args.filePath` to the canonical path only when the
//       canonical path EXISTS and the pair-containing path does NOT
//       (both/neither → FAIL-CLOSED, original arg, gate evidence logged).
//       One log line per pair; a mutation logs the `pair-resolved` verdict.
//       In non-read tools the pair is LOGGED ONLY (observation channel).
//   (2b) FUZZY RESOLUTION (lane 5.4): the matcher sees the (possibly
//       pair-mutated) RESULT. Exact / normalized-existing path → untouched
//       (no line); a Levenshtein match over the bounded corpus (d<=2 AND
//       gap>=2) → MUTATES `output.args.filePath` to the resolved absolute
//       path + a `fuzzy-resolved` line; anything else → FAIL-CLOSED
//       (original arg, the honest "not found" surfaces) + a
//       `fuzzy-rejected` line with top-3 candidates + reason.
//   Scope rule (§2.3): READ-ONLY tools ONLY — WRITE/EDIT/DELETE args are
//   NEVER touched. Both outcomes are logged (addendum C6: conservative +
//   both logged). glob / grep / section-anchors are NOT in this unit
//   (queued).
//
// EXPORT CONTRACT (the 2026-09-16 export fix — verified in the installed
// binary's minified source): the plugin loader normalizes a plugin module
// via `Object.values(module)` and EVERY value must be a function (or an
// object with a function `.server`) — else
// `TypeError("Plugin export is not a function")` at load. The opencode.log
// run of 2026-09-16 failed with exactly that for the ~16 named exports this
// file used to carry. So THIS file exports the default factory ONLY (zero
// other `export` statements); the pure core (types, constants, regexes,
// pure functions, the fuzzy matcher) lives in `intercept_observer_core.ts`
// (imported below; never loaded by the host loader directly).
//
// HOUSE RULE (ctx_watchdog.ts header): best-effort, never-throw — ANY
// internal error → at most ONE `intercept-error`-style line to the log, the
// hook returns silently.
//
// SINGLE NUMWORD MAP HOME (addendum C3): at plugin start this file reads
// `.opencode/agent/scripts/numword/numwords.json` — the ONE shared map
// (also read by numword.cjs / w2n.py). NO embedded second copy. If the read
// fails, numword checks (b) and (c) are silently off; the other checks
// still run.
//
// LINE SHAPE (addendum C7 — byte-exact, pipe-separated, 8 fields):
//   <timestamp> | <session_id> | <model_id> | <tool> | <original-arg> |
//   <candidates + distances OR gate evidence> | <context: what the arg is —
//   path / commit-ref / date / session-id> | <verdict>
// The fuzzy lines reuse the same shape; their field 6 is
// `fuzzy orig=<arg> -> <resolved-rel> d=<n> gap=<g|inf>` (resolved) or
// `fuzzy orig=<arg> cands=<p1 d1,p2 d2,p3 d3> reason=<r>` (rejected). The
// read-scope pair lines (R1) use field 6
// `pair=[<l>:<r>] canon=<right-derived> dist=<d> gate=mutated|both-exist|
// none-exist` (mutated = `pair-resolved` verdict).
// Verdict vocabulary: the six observation verdicts (core header) +
// `fuzzy-resolved` / `fuzzy-rejected` + `pair-resolved` + `error` (the
// intercept-error line).
//
// MODEL ID: obtained the same way the watchdog fills its ctx-log model field
// — readGauge(undefined, sessionID) from ./scripts/gauge.mjs (the shared
// session-DB read: `session.model` column → model id). NEVER spawns
// unbounded (the gauge's own bounded backend chain; in-process node:sqlite
// first, spawn fallback with a hard 2500 ms timeout). Unavailable / empty /
// no session id → the literal `unknown` (never throw; no cross-session
// fallback — the watchdog's session-gating discipline).
//
// LOG FILE: `.opencode/temp/intercept.log` (append-only, git-ignored — the
// §4.2 temp channel; a SEPARATE file from plugin.log, maintainer ruling).
// Written under `<PluginInput.directory>/.opencode/temp/`.
//
// USAGE NOTE: RESTART-GATED — the plugin activates at the next host restart
// (plugins are auto-loaded from .opencode/plugin/; no opencode.jsonc entry).
// Log location: .opencode/temp/intercept.log.
//
// RESTART-GATED: the build lands committed + smoke/pinned; live acceptance
// is ONE restart (the #51/#55 pattern). The 5.4 mutation-channel one-shot
// rides the same restart: the scratchpad sentinel twin pair
// `fuzzy_accept/file-four.txt` (sentinel, content ORIGINAL) / `file-4.txt`
// (twin, content TWIN) is pre-created and NOT deleted — the acceptance
// session reads the sentinel with a d<=2 mistyped path and checks the
// returned content + the `fuzzy-resolved` log line (mutation channel LIVE
// or NOT).

import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CORPUS_TTL_MS,
  MODEL_CACHE_TTL_MS,
  buildCorpus,
  checkPairs,
  classifyContext,
  flattenField,
  loadNumwordMap,
  nearestExistingDir,
  normPathForm,
  observeArg,
  relForm,
  resolveReadPath,
} from "./intercept_observer_core.ts";
import type { NumwordMap, Observation } from "./intercept_observer_core.ts";
import { readGauge } from "./scripts/gauge.mjs";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
// The ONE shared numword map (addendum C3) — resolved next to this file:
// .opencode/plugin → .opencode/agent/scripts/numword (stable for the host
// load and the type-stripped probe/smoke import alike).
const MAP_PATH = join(THIS_DIR, "..", "agent", "scripts", "numword", "numwords.json");

// ------------------------------------------------------------------ hook plumbing

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function localStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

let dir = "";
let map: NumwordMap | null = null;
// Per-session model-id cache (bounded: TTL expiry; the read itself is the
// gauge's bounded chain — never spawns unbounded).
const modelCache = new Map<string, { at: number; model: string }>();
// Corpus cache (research §2.7: cache vs crawl; TTL-bounded — new files
// appear during a session; a stale/empty cache fail-closes to "no match",
// the safe direction). Key = normalized root; value = {at, entries}.
const corpusCache = new Map<string, { at: number; entries: string[] }>();

function argsToString(args: unknown): string {
  if (typeof args === "string") return args;
  if (args == null) return "";
  try {
    const s = JSON.stringify(args);
    return typeof s === "string" ? s : "";
  } catch {
    return String(args);
  }
}

async function getModel(sid: string): Promise<string> {
  if (sid === "") return "unknown"; // no cross-session fallback (session gating)
  try {
    const hit = modelCache.get(sid);
    if (hit && Date.now() - hit.at < MODEL_CACHE_TTL_MS) return hit.model;
    const g = await readGauge(undefined, sid);
    const m = g && typeof g.modelId === "string" && g.modelId !== "" ? g.modelId : "unknown";
    modelCache.set(sid, { at: Date.now(), model: m });
    return m;
  } catch {
    return "unknown";
  }
}

function logPath(): string {
  return join(dir, ".opencode", "temp", "intercept.log");
}

function appendRaw(line: string): void {
  try {
    const p = logPath();
    mkdirSync(dirname(p), { recursive: true });
    appendFileSync(p, line, "utf8");
  } catch {
    // log-only must never break a tool call — swallow
  }
}

function appendObservation(sid: string, model: string, tool: string, argStr: string, o: Observation): void {
  const fields = [localStamp(), sid || "unknown", model, tool || "unknown", flattenField(argStr), flattenField(o.evidence), flattenField(o.context), o.verdict];
  appendRaw(fields.join(" | ") + "\n");
}

function appendError(sid: string, model: string, tool: string, msg: string): void {
  const fields = [localStamp(), sid || "unknown", model, tool || "unknown", "intercept-error", flattenField(msg), "error", "error"];
  appendRaw(fields.join(" | ") + "\n");
}

// ------------------------------------------------------------------ read-scoped fuzzy resolution (channel 2)

function getCorpus(root: string): string[] {
  const key = normPathForm(root);
  const hit = corpusCache.get(key);
  if (hit && Date.now() - hit.at < CORPUS_TTL_MS) return hit.entries;
  const entries = buildCorpus(root);
  corpusCache.set(key, { at: Date.now(), entries });
  return entries;
}

// Read-scope PAIR resolution (R1, 2026-09-16 — the pipeline order,
// decision-record §2.6: the pair channel runs FIRST, the fuzzy matcher then
// sees the result). Every `[left:right]` pair in the read filePath resolves
// independently (one log line each); right-wins — the canonical path
// replaces each RESOLVED pair with its right-derived digits (an unresolved
// pair stays in place → the gate fail-closes). EXISTENCE GATE: MUTATES
// `output.args.filePath` to the canonical path only when the canonical path
// EXISTS and the pair-containing path does NOT (both/neither → FAIL-CLOSED,
// original arg, gate evidence logged). A mutation logs the new
// `pair-resolved` verdict; a gate-fail logs the pair verdict (ok/mismatch)
// with the gate evidence. Never throws.
function runPairRead(output: { args?: unknown }): Observation[] {
  const args = output?.args;
  if (args == null || typeof args !== "object") return [];
  const filePath = (args as { filePath?: unknown }).filePath;
  if (typeof filePath !== "string" || filePath.trim() === "" || map === null) return [];
  const checks = checkPairs(filePath, map);
  if (checks.length === 0) return [];
  const ctx = classifyContext(filePath);
  // the canonical path: every resolved pair → its right-derived digits
  let canon = filePath;
  for (const pc of checks) if (pc.canonical !== null) canon = canon.split(pc.raw).join(pc.canonical);
  const abs = (p: string) => (isAbsolute(p) ? p : join(dir || ".", p));
  const canonExists = existsSync(abs(canon));
  const origExists = existsSync(abs(filePath));
  const mutate = canonExists && !origExists;
  if (mutate) (args as { filePath: string }).filePath = canon;
  const gate = mutate ? "mutated" : canonExists && origExists ? "both-exist" : "none-exist";
  return checks.map((pc) =>
    pc.verdict === "no-candidate"
      ? {
          verdict: "no-candidate",
          evidence: `pair=${pc.raw} gate=${pc.rightVal === null ? "right-unknown" : "left-unknown"}`,
          context: ctx,
        }
      : {
          verdict: mutate ? "pair-resolved" : pc.verdict,
          evidence: `pair=${pc.raw} canon=${pc.canonical} dist=${pc.dist} gate=${gate}`,
          context: ctx,
        },
  );
}

// Read-scope ONLY (research §2.3 — the scope rule): a wrong fuzzy match on
// a READ is self-correcting; on a WRITE it is data loss. Returns the fuzzy
// Observation (null = untouched: not a read, no string filePath, or an
// exact/normalized-existing path) and MUTATES `output.args.filePath` to the
// resolved absolute path when the matcher resolved. Never throws.
function runFuzzyRead(output: { args?: unknown }): Observation | null {
  const args = output?.args;
  if (args == null || typeof args !== "object") return null;
  const filePath = (args as { filePath?: unknown }).filePath;
  if (typeof filePath !== "string" || filePath.trim() === "") return null;
  // absolute form against the workspace root (cwd-independent)
  const abs = isAbsolute(filePath) ? filePath : join(dir || ".", filePath);
  if (existsSync(abs)) return null; // exact — the tool will find it; never fuzzy
  const root = nearestExistingDir(abs);
  if (root === "") return null; // nowhere to match against — fail silent
  const res = resolveReadPath(relForm(abs, root), getCorpus(root));
  if (res.kind === "exact") return null; // normalized-equal — untouched
  if (res.kind === "resolved") {
    (args as { filePath: string }).filePath = join(root, res.path);
    return {
      verdict: "fuzzy-resolved",
      evidence: `fuzzy orig=${filePath} -> ${res.path} d=${res.d} gap=${res.gap === Infinity ? "inf" : res.gap}`,
      context: classifyContext(filePath),
    };
  }
  return {
    verdict: "fuzzy-rejected",
    evidence: `fuzzy orig=${filePath} cands=${res.cands.map(([p, d]) => `${p} ${d}`).join(",")} reason=${res.reason}`,
    context: classifyContext(filePath),
  };
}

// ------------------------------------------------------------------ the hook

async function onToolBefore(
  input: { tool?: string; sessionID?: string; callID?: string },
  output: { args?: unknown },
): Promise<void> {
  let sid = "";
  let tool = "";
  let model = "unknown";
  try {
    sid = str(input?.sessionID);
    tool = str(input?.tool);
    // captured BEFORE any read channel may mutate output.args (field 5 is
    // the ORIGINAL arg — what the model asked for)
    const argStr = argsToString(output?.args);
    // the READ channel owns the pair line for a read with a string filePath
    // (no double-logging — observeArg skips the pair class for that arg).
    // Pipeline order (decision-record §2.6): pair FIRST (may mutate), then
    // the fuzzy matcher on the (possibly mutated) result.
    const readFilePath =
      output?.args != null && typeof output.args === "object"
        ? (output.args as { filePath?: unknown }).filePath
        : undefined;
    const pairOwned = tool === "read" && typeof readFilePath === "string";
    const pairObs = pairOwned ? runPairRead(output) : [];
    const obs = argStr === "" ? [] : observeArg(argStr, map, dir || null, pairOwned);
    let fuzzy: Observation | null = null;
    if (tool === "read") fuzzy = runFuzzyRead(output); // read-scope ONLY
    if (obs.length === 0 && pairObs.length === 0 && fuzzy === null) return; // nothing to log
    model = await getModel(sid);
    for (const o of obs) appendObservation(sid, model, tool, argStr, o);
    for (const o of pairObs) appendObservation(sid, model, tool, argStr, o);
    if (fuzzy !== null) appendObservation(sid, model, tool, argStr, fuzzy);
  } catch (e) {
    // at most ONE intercept-error line; the hook returns silently (the model
    // read may itself have failed — `unknown` then, never a throw)
    try {
      appendError(sid, model, tool, e instanceof Error ? e.message : String(e));
    } catch {
      // swallow — never throw out of a hook
    }
  }
}

export default (async (input: PluginInput) => {
  dir = str(input?.directory);
  map = loadNumwordMap(MAP_PATH); // ONE shared map; null → numword checks silently off
  return {
    "tool.execute.before": onToolBefore,
  };
}) satisfies Plugin;
