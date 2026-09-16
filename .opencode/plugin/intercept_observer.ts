// intercept_observer.ts — 5.3 log-only intercept observer (lane 5.3, approved
// 2026-09-16; design source: research 2026-09-16_fuzzy-and-numword-tool-
// reliability.md + addendum C6/C7).
//
// WHAT IT IS: a SEPARATE plugin (functionally separate from ctx_watchdog.ts —
// maintainer ruling) with a `tool.execute.before` hook, active for ALL tools
// (read/glob/grep/bash + write/edit observed too). It OBSERVES and LOGS
// suspicious dense-digit / numword / redundancy / path anomalies. It NEVER
// mutates `output.args` and NEVER blocks — the mutation channel is unproven
// (§5.4 pending); this prototype is designed to survive being PERMANENTLY
// log-only (the incident data stream is its value, addendum C7: the log
// proves an incident OCCURRED, not that a correction was necessary).
//
// HOUSE RULE (ctx_watchdog.ts header): best-effort, never-throw — ANY internal
// error → at most ONE `intercept-error`-style line to the log, the hook
// returns silently. The observation core is a pure function (named export)
// over arg strings + the shared numword map, so the probe/smoke pin fixtures
// WITHOUT a full PluginInput harness.
//
// SINGLE NUMWORD MAP HOME (addendum C3): at plugin start this file reads
// `.opencode/agent/scripts/numword/numwords.json` — the ONE shared map
// (also read by numword.cjs / w2n.py). NO embedded second copy. If the read
// fails, numword checks (b) and (c) are silently off; the other checks
// still run.
//
// OBSERVATIONS (a log line fires only when at least one fires; each class
// bundles into ONE line; the per-call cap + priority order below apply):
//   (a) dense-digit args: digit runs >= MIN_DENSE_RUN (6), the `ses_…`
//       session-id shape, date shapes (YYYY-MM-DD / YYYY_MM_DD / …).
//       Verdict: `no-candidate` (gate evidence: the dense unit, no numword
//       partner to cross-check).
//   (b) numword tokens present in the arg: a token that resolves via the
//       shared map (C4 grammar: exact units/tens/teens incl. the `fourty`
//       alias, unique tens+unit split, dash-separated dense units) is a hit
//       → its value is logged. Unknown tokens (`twozero`) are NOT hits —
//       they are not in the map (loud-unknown, never a guess). A token that
//       is the word side of a `|`-pair is consumed by (c) and not double-
//       logged here. Verdict: `no-candidate`.
//   (c) `<digit>|<word>` redundancy pairs (tight form — no spaces around
//       `|`, so a shell pipe `30 | grep` is NOT a pair; the word must be a
//       full token): left/right check via the map → agreement / mismatch /
//       ambiguous. Evidence carries candidates + numeric distance.
//       Verdicts: `observed-redundancy-ok` / `redundancy-mismatch` /
//       `ambiguous` (multi-split) / `no-candidate` (word unresolvable).
//   (d) path sanity: doubled segments (`users\users` shape).
//       Verdict: `path-anomaly`.
//   (e) out-of-sandbox path NOTE: absolute path spans not under the
//       workspace root (the PluginInput project directory). NOTE ONLY, no
//       enforcement (enforcement stays where it is today — addendum C6,
//       maintainer point 403: one check, no stale duplicates).
//       Verdict: `out-of-sandbox`.
//
// LINE SHAPE (addendum C7 — byte-exact, pipe-separated, 8 fields):
//   <timestamp> | <session_id> | <model_id> | <tool> | <original-arg> |
//   <candidates + distances OR gate evidence> | <context: what the arg is —
//   path / commit-ref / date / session-id> | <verdict>
// Field contents NEVER contain the separator " | " (they are flattened:
// any `|` with optional surrounding spaces → `|`, newlines → space) and are
// capped at MAX_FIELD_CHARS (truncation marked with the ASCII `...`). The
// timestamp is the local minute stamp (same form as
// ctx_watchdog's localStamp: YYYY-MM-DD_HH-MM). The ERROR line (internal
// failure, at most one) keeps the same 8-field shape with field 5 =
// `intercept-error` and field 8 = `error` — the verdict vocabulary below
// applies to observation lines (field 5 != `intercept-error`).
//
// VERDICT VOCABULARY (exactly these six, in priority order for the per-call
// line cap):
//   observed-redundancy-ok | redundancy-mismatch | no-candidate | ambiguous |
//   out-of-sandbox | path-anomaly
//
// CAPS (documented per the task spec — worker's call):
//   MAX_LINES_PER_CALL  = 3  (priority-ordered, then truncated)
//   MAX_FIELD_CHARS     = 160 (original-arg + evidence + error message)
//   MIN_DENSE_RUN       = 6  (digit-run length that fires (a))
//   MODEL_CACHE_TTL_MS  = 60_000 (per-session model-id cache, see below)
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
// USAGE NOTE (task spec item 4): RESTART-GATED — the plugin activates at the
// next host restart (plugins are auto-loaded from .opencode/plugin/; no
// opencode.jsonc entry). Log location: .opencode/temp/intercept.log.
// Verdict vocabulary: the six above (observation lines) + `error` (the
// intercept-error line). Read the log with bounded greps (dense content).
//
// RESTART-GATED: the build lands committed + smoke/pinned; live acceptance is
// ONE restart (the #51/#55 pattern).

import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readGauge } from "./scripts/gauge.mjs";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
// The ONE shared numword map (addendum C3) — resolved next to this file:
// .opencode/plugin → .opencode/agent/scripts/numword (stable for the host
// load and the type-stripped probe/smoke import alike).
const MAP_PATH = join(THIS_DIR, "..", "agent", "scripts", "numword", "numwords.json");

// ------------------------------------------------------------------ constants

export const MAX_LINES_PER_CALL = 3;
export const MAX_FIELD_CHARS = 160;
export const MIN_DENSE_RUN = 6;
export const MODEL_CACHE_TTL_MS = 60_000;

export const VERDICTS = Object.freeze([
  "observed-redundancy-ok",
  "redundancy-mismatch",
  "no-candidate",
  "ambiguous",
  "out-of-sandbox",
  "path-anomaly",
]) as readonly string[];

// Priority for the per-call line cap (index = rank; ties keep input order —
// Array.prototype.sort is stable):
const VERDICT_RANK: Record<string, number> = {
  "redundancy-mismatch": 0,
  "path-anomaly": 1,
  "out-of-sandbox": 2,
  "observed-redundancy-ok": 3,
  ambiguous: 4,
  "no-candidate": 5,
};

// ------------------------------------------------------------------ core types

export interface NumwordMap {
  units: Record<string, number>;
  tens: Record<string, number>;
  teens: Record<string, number>;
}

export interface NumwordResolution {
  kind: "value" | "unknown" | "ambiguous";
  value?: string; // digit string when kind === "value"
  candidates?: string[]; // digit strings when kind === "ambiguous"
}

export interface Observation {
  verdict: string; // one of VERDICTS
  evidence: string; // field 6 content (candidates + distances OR gate evidence)
  context: string; // field 7 content (what the arg is)
}

// ------------------------------------------------------------------ map load

// Read + validate the shared map; null on ANY failure (numword checks off,
// other checks still run — never throw out of plugin start).
export function loadNumwordMap(p: string): NumwordMap | null {
  try {
    const m = JSON.parse(readFileSync(p, "utf8"));
    if (m && typeof m === "object" && m.units && typeof m.units === "object" && m.tens && m.teens) {
      return m as NumwordMap;
    }
    return null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ numword resolve
//
// C4 grammar subset (single word + dash-separated dense units) as a PURE
// function over the map — the map is data (the ONE shared copy), this is the
// conversion. Unknown → `unknown`, never a best-guess (the loud-unknown
// discipline of numword.cjs / w2n.py; the comma wordlist form is the
// scriptlet's CLI surface, not the observer's).

export function resolveNumword(raw: string, map: NumwordMap): NumwordResolution {
  const s = String(raw).trim().toLowerCase();
  if (s === "" || !/^[a-z-]+$/.test(s)) return { kind: "unknown" };
  if (s.includes("-")) {
    // canonical dense form: dash-separated single-digit units
    let out = "";
    for (const p of s.split("-")) {
      if (p === "" || !(p in map.units)) return { kind: "unknown" };
      out += String(map.units[p]);
    }
    return { kind: "value", value: out };
  }
  if (s in map.units) return { kind: "value", value: String(map.units[s]) };
  if (s in map.tens) return { kind: "value", value: String(map.tens[s]) };
  if (s in map.teens) return { kind: "value", value: String(map.teens[s]) };
  // unique tens+unit split (ninetyfour → 94); zero splits → unknown,
  // multiple splits → ambiguous (never a guess)
  const hits: string[] = [];
  for (let i = 1; i < s.length; i++) {
    const pre = s.slice(0, i);
    const suf = s.slice(i);
    if (pre in map.tens && suf in map.units) hits.push(String(map.tens[pre] + map.units[suf]));
  }
  if (hits.length === 1) return { kind: "value", value: hits[0] };
  if (hits.length > 1) return { kind: "ambiguous", candidates: hits };
  return { kind: "unknown" };
}

// ------------------------------------------------------------------ context classification
//
// What the ARG is (field 7): the whole arg, first match wins, in this order:
// session-id / commit-ref / date / path / arg (the catch-all).

export const SESSION_ID_RE = /^ses_[0-9a-zA-Z]{8,}$/;
export const COMMIT_REF_RE = /^[0-9a-fA-F]{40}$/;
export const DATE_CTX_RE = /^\d{4}[-/.]\d{1,2}([-/.]\d{1,2})?$/;
export const PATHY_RE =
  /(?:[A-Za-z]:[\\/])|(?:\\{2}[^\s|]+\\+[^\s|]+)|(?:^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)+)|(?:[./][A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*)/;

export function classifyContext(arg: string): string {
  const s = String(arg ?? "").trim();
  if (SESSION_ID_RE.test(s)) return "session-id";
  if (COMMIT_REF_RE.test(s)) return "commit-ref";
  if (DATE_CTX_RE.test(s)) return "date";
  if (PATHY_RE.test(s)) return "path";
  return "arg";
}

// ------------------------------------------------------------------ date / dense shapes (observation a)

const DATE_RUN_RE = /\b(19|20)\d{2}[-_/.](0[1-9]|1[0-2])([-_/.](0[1-9]|[12]\d|3[01]))?\b/g;
const SESSION_SHAPE_RE = /\bses_[0-9a-zA-Z]{8,}/g;

export function observeDense(arg: string): Observation[] {
  const s = String(arg ?? "");
  const parts: string[] = [];
  const runs = s.match(new RegExp(`\\d{${MIN_DENSE_RUN},}`, "g"));
  if (runs) {
    const uniq = runs.filter((r, i) => runs.indexOf(r) === i).slice(0, 2);
    parts.push(uniq.map((r) => `${r.length}d=${r}`).join(" "));
  }
  const shape = s.match(SESSION_SHAPE_RE);
  if (shape) parts.push(`shape=${shape[0]}`);
  const dates: string[] = [];
  for (const m of s.matchAll(DATE_RUN_RE)) {
    dates.push(m[0]);
    if (dates.length === 2) break;
  }
  if (dates.length) parts.push(`date=${dates[0]}`);
  if (parts.length === 0) return [];
  return [{ verdict: "no-candidate", evidence: `dense ${parts.join(" ")}`, context: classifyContext(s) }];
}

// ------------------------------------------------------------------ | pairs (observation c)

// Tight pair form: digits, a bare `|` (no spaces — a shell pipe never
// matches), a full word token (letters + dashes for the dense form).
const PAIR_RE = /\b(\d{1,12})\|([a-z][a-z-]*)/gi;
// The digit side of a pair, by index — used to keep (b) from double-logging
// a word that is already the right side of a checked pair.
const PAIR_LEFT_RE = /\b(\d{1,12})\|/g;

interface PairMatch {
  digits: string;
  word: string;
  start: number;
  wordEnd: number;
}

function pairMatches(s: string): PairMatch[] {
  const out: PairMatch[] = [];
  for (const m of s.matchAll(PAIR_RE)) {
    const wordEnd = m.index! + m[0].length;
    const next = s[wordEnd];
    if (next !== undefined && /[a-zA-Z]/.test(next)) continue; // not a full token
    out.push({ digits: m[1], word: m[2], start: m.index!, wordEnd });
  }
  return out;
}

export function observePairs(arg: string, map: NumwordMap | null): Observation[] {
  if (map === null) return [];
  const s = String(arg ?? "");
  const ctx = classifyContext(s);
  const obs: Observation[] = [];
  for (const pm of pairMatches(s).slice(0, 2)) {
    const left = parseInt(pm.digits, 10);
    const res = resolveNumword(pm.word, map);
    if (res.kind === "value") {
      const cand = parseInt(res.value, 10);
      const dist = Math.abs(left - cand);
      obs.push({
        verdict: dist === 0 ? "observed-redundancy-ok" : "redundancy-mismatch",
        evidence: `pair=${pm.digits}|${pm.word} cand=${res.value} dist=${dist}`,
        context: ctx,
      });
    } else if (res.kind === "ambiguous") {
      obs.push({
        verdict: "ambiguous",
        evidence: `pair=${pm.digits}|${pm.word} cands=${res.candidates!.join(",")} gate=split-ambiguous`,
        context: ctx,
      });
    } else {
      obs.push({
        verdict: "no-candidate",
        evidence: `pair=${pm.digits}|${pm.word} gate=word-unknown`,
        context: ctx,
      });
    }
  }
  return obs;
}

// ------------------------------------------------------------------ numword tokens (observation b)

export function observeNumword(arg: string, map: NumwordMap | null): Observation[] {
  if (map === null) return [];
  const s = String(arg ?? "");
  const lower = s.toLowerCase();
  // the word side of each tight pair (with its start index) — those tokens
  // belong to (c), not (b)
  const consumed: number[] = [];
  for (const m of lower.matchAll(PAIR_LEFT_RE)) {
    consumed.push(m.index! + m[1].length + 1); // after the digit run + the `|`
  }
  const hits: string[] = [];
  for (const m of lower.matchAll(/[a-z]+(?:-[a-z]+)*/g)) {
    if (consumed.includes(m.index!)) continue;
    const res = resolveNumword(m[0], map);
    if (res.kind === "value") {
      hits.push(`${m[0]}→${res.value}`);
      if (hits.length === 2) break;
    }
  }
  if (hits.length === 0) return [];
  return [{ verdict: "no-candidate", evidence: `numword ${hits.join(" ")}`, context: classifyContext(s) }];
}

// ------------------------------------------------------------------ path sanity (observation d)

// A path segment immediately followed by the SAME segment (doubled):
// `users\users`, `users/users`. Case-insensitive; the segment is bounded by
// a start or a separator on the left and a separator or end on the right.
const DOUBLED_RE = /(?:^|[\\/])([^\\/]{1,64})(?:[\\/]\1)(?=[\\/]|$)/gi;

export function observePathAnomaly(arg: string): Observation[] {
  const s = String(arg ?? "");
  const segs: string[] = [];
  for (const m of s.matchAll(DOUBLED_RE)) {
    segs.push(m[1]);
    if (segs.length === 2) break;
  }
  if (segs.length === 0) return [];
  return [{ verdict: "path-anomaly", evidence: `doubled=${[...new Set(segs)].join(",")}`, context: classifyContext(s) }];
}

// ------------------------------------------------------------------ sandbox note (observation e)

const WIN_PATH_RE = /(^|[\s"'=({])([A-Za-z]:[\\/][^\s'"|]*)/g;
const POSIX_PATH_RE = /(^|[\s"'=({])(\/[^\s\\'"|]+)/g;
const UNC_PATH_RE = /(^|[\s"'=({])(\\\\[^\s|]+)/g;

export function underRoot(span: string, root: string): boolean {
  // normalize: backslashes → slashes, collapse separator runs (a JSON-
  // escaped `\\` in a stringified arg reads as `//`), lowercase, trim
  const n = (p: string) => p.replace(/\\/g, "/").replace(/\/{2,}/g, "/").toLowerCase().replace(/\/+$/, "");
  const r = n(root);
  if (r === "") return false;
  const s = n(span);
  return s === r || s.startsWith(r + "/");
}

export function observeSandbox(arg: string, workspaceRoot: string | null): Observation[] {
  if (workspaceRoot === null || workspaceRoot === "") return [];
  const s = String(arg ?? "");
  const ctx = classifyContext(s);
  const spans: string[] = [];
  for (const re of [WIN_PATH_RE, POSIX_PATH_RE, UNC_PATH_RE]) {
    re.lastIndex = 0;
    for (const m of s.matchAll(re)) {
      if (m[2] && !spans.includes(m[2])) spans.push(m[2]);
      if (spans.length >= 4) break;
    }
    if (spans.length >= 4) break;
  }
  const outside = spans.filter((p) => !underRoot(p, workspaceRoot)).slice(0, 2);
  if (outside.length === 0) return [];
  return [{ verdict: "out-of-sandbox", evidence: `path=${outside[0]} root=${workspaceRoot}`, context: ctx }];
}

// ------------------------------------------------------------------ compose + cap

// The pure core over ONE arg string: all observation classes, priority-
// ordered, capped at MAX_LINES_PER_CALL. map = null → numword classes (b)/(c)
// silently off. workspaceRoot = null → sandbox note (e) off.
export function observeArg(arg: string, map: NumwordMap | null, workspaceRoot: string | null): Observation[] {
  const s = typeof arg === "string" ? arg : "";
  if (s === "") return [];
  const obs = [
    ...observePairs(s, map),
    ...observePathAnomaly(s),
    ...observeSandbox(s, workspaceRoot),
    ...observeDense(s),
    ...observeNumword(s, map),
  ];
  obs.sort((a, b) => (VERDICT_RANK[a.verdict] ?? 9) - (VERDICT_RANK[b.verdict] ?? 9));
  return obs.slice(0, MAX_LINES_PER_CALL);
}

// ------------------------------------------------------------------ hook plumbing

const str = (v: unknown): string => (typeof v === "string" ? v : "");

// Flatten a field so the 8-field " | " shape is byte-stable: newlines →
// space, any `|` (with optional surrounding spaces) → bare `|`, cap at
// MAX_FIELD_CHARS (the `...` truncation marker).
export function flattenField(v: string, cap: number = MAX_FIELD_CHARS): string {
  let s = String(v ?? "");
  s = s.replace(/[\r\n\t]+/g, " ").replace(/\s*\|\s*/g, "|");
  if (s.length > cap) s = s.slice(0, cap - 3) + "...";
  return s;
}

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
    const argStr = argsToString(output?.args);
    if (argStr === "") return; // nothing to observe — never a log line
    const obs = observeArg(argStr, map, dir || null);
    if (obs.length === 0) return;
    model = await getModel(sid);
    for (const o of obs) appendObservation(sid, model, tool, argStr, o);
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
