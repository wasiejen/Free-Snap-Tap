// intercept_observer_core.ts — the PURE core of the intercept observer
// (lane 5.3 log-only observation + lane 5.4 read-scoped fuzzy read
// resolution; approved 2026-09-16; design source: research
// 2026-09-16_fuzzy-and-numword-tool-reliability.md §2 + addendum C6/C7).
//
// WHY THIS FILE EXISTS (the 2026-09-16 export fix): the opencode plugin
// loader normalizes a plugin module via `Object.values(module)` and EVERY
// value must be a function (or an object with a function `.server`) — else
// `TypeError("Plugin export is not a function")` at load (verified in the
// installed binary; the opencode.log run of 2026-09-16 failed with exactly
// that for this plugin's ~16 named exports). So ALL named exports live HERE;
// the plugin file (intercept_observer.ts) exports the default factory ONLY
// and imports this module. This file is a pure module — it is NEVER loaded
// by the host loader directly (default export not required).
//
// OBSERVATIONS (a log line fires only when at least one fires; each class
// bundles into ONE line; the per-call cap + priority order apply):
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
//   (c) `[left:right]` redundancy pairs (R1, 2026-09-16 — the form switch:
//       the OLD tight `digit|word` pipe form is DEAD, no longer detected):
//       no inner spaces, exactly one colon. left ∈ digits as-seen | adder
//       construction (`800+50+11` → the sum) | numword form (a single map
//       word incl. the `fourty` alias, or dash-separated single units);
//       right = numword form ONLY. Left/right check via the map →
//       agreement / mismatch (right-wins: the canonical is ALWAYS the
//       right-derived value) / no-candidate (a side unresolved — never a
//       guess). Multiple pairs per arg → independent resolution, one
//       observation each. In READ scope the pair channel also EXISTS-gates
//       a mutation to the canonical path (the `pair-resolved` verdict).
//       Verdicts: `observed-redundancy-ok` / `redundancy-mismatch` /
//       `no-candidate` (a side unresolvable) / `pair-resolved` (read
//       mutation) — `ambiguous` (multi-split) is vocabulary-stable but
//       unreachable for the new form (no composition on the pair sides).
//   (d) path sanity: doubled segments (`users\users` shape).
//       Verdict: `path-anomaly`.
//   (e) out-of-sandbox path NOTE: absolute path spans not under the
//       workspace root (the PluginInput project directory) AND not under
//       the approved scratchpad root SCRATCHPAD_ROOT (R1, 2026-09-16 — the
//       flag on it was pure noise, measured). NOTE ONLY, no enforcement
//       (enforcement stays where it is today — addendum C6, maintainer
//       point 403: one check, no stale duplicates).
//       Verdict: `out-of-sandbox`.
//
// READ-SCOPED FUZZY RESOLUTION (lane 5.4 — the "read functionality",
// approved 2026-09-16; research §2.2-§2.7): the PURE matcher core. Scope
// rule (§2.3): READ-ONLY tools only — writes/edit/delete NEVER fuzzy
// (a wrong fuzzy match on a read is self-correcting; on a write it is data
// loss). The plugin hook wires this for `input.tool === "read"` with a
// string `output.args.filePath` ONLY (glob/grep/section-anchors are NOT in
// this unit).
//
// WRITE-SCOPED FUZZY (R2, 2026-09-16): the SAME matcher at the tighter
// accept bar WRITE_FUZZY_MAX_D (1) — `resolveWritePath`. The plugin hook
// wires it for the write-scope path fields (write/edit `filePath`,
// block_transfer `srcFile`/`dstFile`) under the SAME strict existence gate
// (mistyped path absent, candidate real — the corpus holds only real
// paths); the verdict is `fuzzy-resolved`/`fuzzy-rejected` with an explicit
// `scope=write` flag in the evidence (the nine verdicts stay byte-identical).
//   Matcher (§2.2): exact after normalize (case/slash/trim) → `exact` (the
//   caller leaves the arg untouched); else Levenshtein over the FULL
//   relative paths of a bounded corpus → `resolved` iff d <= FUZZY_MAX_D
//   (2) AND the gap to the second-closest real path is >= FUZZY_MIN_GAP
//   (2); anything else FAIL-CLOSED (`rejected` with the top-3 candidates +
//   reason — d too high / gap too small / empty corpus; the original arg
//   runs and the honest "not found" surfaces, §2.5). The corpus is bounded
//   (§2.7): skip .git/node_modules, cap CORPUS_MAX_ENTRIES (20k); a stale
//   or empty cache fail-closes to "no match" (the safe direction).
//
// LINE SHAPE (addendum C7 — byte-exact, pipe-separated, 8 fields):
//   <timestamp> | <session_id> | <model_id> | <tool> | <original-arg> |
//   <candidates + distances OR gate evidence> | <context: what the arg is —
//   path / commit-ref / date / session-id> | <verdict>
// Field contents NEVER contain the separator " | " (they are flattened:
// any `|` with optional surrounding spaces → `|`, newlines → space) and are
// capped at MAX_FIELD_CHARS (truncation marked with the ASCII `...`).
//
// VERDICT VOCABULARY (the original six, byte-identical and in order, plus
// the two read-scope fuzzy tokens appended — addendum C6: conservative,
// BOTH outcomes logged — plus `pair-resolved`, the R1 read-scope pair
// mutation token appended last):
//   observed-redundancy-ok | redundancy-mismatch | no-candidate | ambiguous |
//   out-of-sandbox | path-anomaly | fuzzy-resolved | fuzzy-rejected |
//   pair-resolved
// Fuzzy evidence forms (field 6):
//   resolved: `fuzzy orig=<arg> -> <resolved-rel> d=<n> gap=<g|inf>`
//   rejected: `fuzzy orig=<arg> cands=<p1 d1,p2 d2,p3 d3> reason=<r>`
//   write scope (R2): the same + an explicit ` scope=write` after `fuzzy`
//   (the verdicts stay the nine; the scope flag carries the write-scope fact)
// Pair evidence forms (field 6):
//   ok/mismatch: `pair=[<l>:<r>] canon=<right-derived> dist=<d>`
//   read gate:   the same + ` gate=mutated|both-exist|none-exist`
//   write gate (R2): the same gate tokens; a MISMATCH field FAILS CLOSED —
//   the line carries ` gate=fail-closed` (never a mutated write target)
//   bash git-ref (R2): mutated → `... gate=ref-mutated run=<hexrun>`
//   (pair-resolved); gate failed → `... gate=ref-rejected run=<hexrun>`;
//   the ref run < 4 hex chars → the bare log-only form above (no gate
//   token — the rev-parse gate is not even attempted)
//   no-candidate: `pair=[<l>:<r>] gate=right-unknown|left-unknown`
//
// CAPS (documented per the task spec — worker's call):
//   MAX_LINES_PER_CALL  = 3  (priority-ordered, then truncated)
//   MAX_FIELD_CHARS     = 160 (original-arg + evidence + error message)
//   MIN_DENSE_RUN       = 6  (digit-run length that fires (a))
//   MODEL_CACHE_TTL_MS  = 60_000 (per-session model-id cache, plugin layer)
//   CORPUS_TTL_MS       = 60_000 (corpus cache TTL, plugin layer — §2.7)
//   CORPUS_MAX_ENTRIES  = 20_000 (corpus cap — fail-safe: empty → never
//                              resolves)
//   FUZZY_MAX_D         = 2    (accept bar, §2.4 — read scope)
//   WRITE_FUZZY_MAX_D   = 1    (accept bar — write scope, R2; §2.3 hazard)
//   FUZZY_MIN_GAP       = 2    (gap-to-second-best accept bar, §2.4)

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import type { Dirent } from "node:fs";
import { dirname, join, relative } from "node:path";

// ------------------------------------------------------------------ constants

export const MAX_LINES_PER_CALL = 3;
export const MAX_FIELD_CHARS = 160;
export const MIN_DENSE_RUN = 6;
export const MODEL_CACHE_TTL_MS = 60_000;
export const CORPUS_TTL_MS = 60_000;
export const CORPUS_MAX_ENTRIES = 20_000;
export const FUZZY_MAX_D = 2;
export const FUZZY_MIN_GAP = 2;
// R2 (2026-09-16): the WRITE-scope fuzzy accept bar — d<=1 (tighter than
// read's d<=2: the hazard class is different, research §2.3 — a wrong write
// is not self-correcting). Same gap rule, same strict existence gate (the
// corpus holds only REAL paths; the mistyped path is checked absent first).
export const WRITE_FUZZY_MAX_D = 1;

export const VERDICTS = Object.freeze([
  "observed-redundancy-ok",
  "redundancy-mismatch",
  "no-candidate",
  "ambiguous",
  "out-of-sandbox",
  "path-anomaly",
  "fuzzy-resolved",
  "fuzzy-rejected",
  "pair-resolved", // R1 (2026-09-16): the read-scope pair mutation verdict
]) as readonly string[];

// Priority for the per-call line cap (index = rank; ties keep input order —
// Array.prototype.sort is stable). The fuzzy verdicts log separately (the
// correction channel, addendum C6 — both logged, never capped into the
// observation lines); their ranks are documentary.
const VERDICT_RANK: Record<string, number> = {
  "redundancy-mismatch": 0,
  "path-anomaly": 1,
  "out-of-sandbox": 2,
  "observed-redundancy-ok": 3,
  ambiguous: 4,
  "no-candidate": 5,
  "fuzzy-resolved": 6,
  "fuzzy-rejected": 7,
  "pair-resolved": 8, // documentary (the read channel logs it separately)
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

// The read-scope fuzzy resolution result (research §2.2/§2.5):
//   exact    — normalized-equal to a real corpus path (arg untouched, no line)
//   resolved — d <= 2 AND gap to second-best >= 2 (the caller MUTATES the
//              read arg to `path`, logged as fuzzy-resolved)
//   rejected — fail-closed: top-3 [relPath, distance] candidates + reason
//              (d-too-high / gap-too-small / empty-corpus / empty-arg);
//              the original arg runs (honest error), logged as fuzzy-rejected
export type ReadResolution =
  | { kind: "exact" }
  | { kind: "resolved"; path: string; d: number; gap: number }
  | { kind: "rejected"; cands: Array<[string, number]>; reason: string };

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

// ------------------------------------------------------------------ [l:r] pairs (observation c)

// The `[left:right]` redundancy pair (R1, 2026-09-16; design source:
// research/fuzzy-numword/decision-record.md §2.4/§2.5): NO inner spaces,
// EXACTLY one colon — the left grammar (digits/`+`/letters/`-`) and the
// right grammar (letters/`-`) never contain a colon, so the split is
// unambiguous by construction (a second colon or an inner space kills the
// match). left ∈ digits as-seen | adder construction `\d{1,12}(\+\d{1,12})*`
// | numword form; right = numword form ONLY (never digits). The `i` flag
// keeps the old word-case tolerance. The OLD tight `digit|word` pipe form
// is DEAD (ruling 2026-09-16) — no longer detected (and a shell pipe
// `30 | grep` is not a pair, and never was — it has no brackets).
const PAIR_RE = /\[([0-9]{1,12}(?:\+[0-9]{1,12})*|[a-z][a-z-]*):([a-z][a-z-]*)\]/gi;

export interface PairCheck {
  raw: string; // the matched `[left:right]`
  left: string;
  right: string;
  start: number; // span in the source string — observeNumword skips the in-pair words
  end: number;
  leftVal: number | null;
  rightVal: number | null;
  verdict: "observed-redundancy-ok" | "redundancy-mismatch" | "no-candidate";
  canonical: string | null; // the RIGHT-derived digit string (right-wins, §2.5)
  dist: number | null; // |left - right| when both sides resolve
}

// The numword form of a pair side (R1): a single map word (units / tens /
// teens, incl. the `fourty` alias) or dash-separated single units (every
// part in map.units). NO tens+unit composition (`ninetyfour`) and NO
// arithmetic on this side — that is the scriptlet's w2n surface. Unknown →
// null, never a guess (loud-unknown discipline).
export function resolvePairWord(raw: string, map: NumwordMap): number | null {
  const s = String(raw).trim().toLowerCase();
  if (s === "" || !/^[a-z-]+$/.test(s)) return null;
  if (s.includes("-")) {
    let digits = "";
    for (const p of s.split("-")) {
      if (p === "" || !(p in map.units)) return null;
      digits += String(map.units[p]);
    }
    return parseInt(digits, 10);
  }
  if (s in map.units) return map.units[s];
  if (s in map.tens) return map.tens[s];
  if (s in map.teens) return map.teens[s];
  return null;
}

// The LEFT value of a pair (R1): digits as-seen (form a — the drifted
// state) | adder construction (form b — the SUM of the addends) | the
// numword form (resolvePairWord).
export function resolvePairLeft(raw: string, map: NumwordMap): number | null {
  const s = String(raw).trim();
  if (/^[0-9]+(?:\+[0-9]+)*$/.test(s)) {
    let sum = 0;
    for (const p of s.split("+")) sum += parseInt(p, 10);
    return sum;
  }
  return resolvePairWord(s, map);
}

// Check EVERY `[left:right]` pair in the arg (up to 3 — the call's line
// cap): independent resolution, one check per pair (the pipeline's "one
// log line each"). Right-wins (§2.5): the canonical is ALWAYS the
// right-derived value, even on a mismatch. Either side unresolved →
// no-candidate (never a guess).
export function checkPairs(s: string, map: NumwordMap | null): PairCheck[] {
  if (map === null) return [];
  const out: PairCheck[] = [];
  for (const m of String(s ?? "").matchAll(PAIR_RE)) {
    const leftVal = resolvePairLeft(m[1], map);
    const rightVal = resolvePairWord(m[2], map);
    let verdict: PairCheck["verdict"] = "no-candidate";
    let dist: number | null = null;
    if (leftVal !== null && rightVal !== null) {
      dist = Math.abs(leftVal - rightVal);
      verdict = dist === 0 ? "observed-redundancy-ok" : "redundancy-mismatch";
    }
    out.push({
      raw: m[0],
      left: m[1],
      right: m[2],
      start: m.index!,
      end: m.index! + m[0].length,
      leftVal,
      rightVal,
      verdict,
      canonical: rightVal !== null ? String(rightVal) : null,
      dist,
    });
    if (out.length === 3) break;
  }
  return out;
}

export function observePairs(arg: string, map: NumwordMap | null): Observation[] {
  if (map === null) return [];
  const s = String(arg ?? "");
  const ctx = classifyContext(s);
  const obs: Observation[] = [];
  for (const pc of checkPairs(s, map)) {
    if (pc.verdict === "no-candidate") {
      obs.push({
        verdict: "no-candidate",
        evidence: `pair=${pc.raw} gate=${pc.rightVal === null ? "right-unknown" : "left-unknown"}`,
        context: ctx,
      });
    } else {
      obs.push({
        verdict: pc.verdict,
        evidence: `pair=${pc.raw} canon=${pc.canonical} dist=${pc.dist}`,
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
  // the word sides of each `[l:r]` pair (span) — those tokens belong to (c),
  // not (b): skip any token that starts inside a pair span
  const spans = checkPairs(s, map).map((pc) => [pc.start, pc.end] as const);
  const hits: string[] = [];
  for (const m of lower.matchAll(/[a-z]+(?:-[a-z]+)*/g)) {
    if (spans.some(([a, b]) => m.index! >= a && m.index! < b)) continue;
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

// The approved external scratchpad root (R1, 2026-09-16 — the flag on it
// was pure noise, measured: the own acceptance test fired `out-of-sandbox`
// on the scratchpad sentinel). Allowed alongside the workspace root in the
// note-only sandbox check.
export const SCRATCHPAD_ROOT = "C:/Users/Wasiejen/AppData/Local/Temp/opencode";

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
  const outside = spans.filter((p) => !underRoot(p, workspaceRoot) && !underRoot(p, SCRATCHPAD_ROOT)).slice(0, 2);
  if (outside.length === 0) return [];
  return [{ verdict: "out-of-sandbox", evidence: `path=${outside[0]} root=${workspaceRoot}`, context: ctx }];
}

// ------------------------------------------------------------------ compose + cap

// The pure core over ONE arg string: all observation classes, priority-
// ordered, capped at MAX_LINES_PER_CALL. map = null → numword classes (b)/(c)
// silently off. workspaceRoot = null → sandbox note (e) off. skipPairs =
// the READ channel owns the pair line for this arg (a read with a string
// filePath — the R1 read-scope pair channel logs it with the gate evidence;
// the observation channel must not double-log the same pair).
export function observeArg(
  arg: string,
  map: NumwordMap | null,
  workspaceRoot: string | null,
  skipPairs = false,
): Observation[] {
  const s = typeof arg === "string" ? arg : "";
  if (s === "") return [];
  const obs = [
    ...(skipPairs ? [] : observePairs(s, map)),
    ...observePathAnomaly(s),
    ...observeSandbox(s, workspaceRoot),
    ...observeDense(s),
    ...observeNumword(s, map),
  ];
  obs.sort((a, b) => (VERDICT_RANK[a.verdict] ?? 9) - (VERDICT_RANK[b.verdict] ?? 9));
  return obs.slice(0, MAX_LINES_PER_CALL);
}

// ------------------------------------------------------------------ hook plumbing helpers (shared, pinned)

// Flatten a field so the 8-field " | " shape is byte-stable: newlines →
// space, any `|` (with optional surrounding spaces) → bare `|`, cap at
// MAX_FIELD_CHARS (the `...` truncation marker).
export function flattenField(v: string, cap: number = MAX_FIELD_CHARS): string {
  let s = String(v ?? "");
  s = s.replace(/[\r\n\t]+/g, " ").replace(/\s*\|\s*/g, "|");
  if (s.length > cap) s = s.slice(0, cap - 3) + "...";
  return s;
}

// ------------------------------------------------------------------ read-scope fuzzy resolution (lane 5.4)
//
// Pure matcher core (research §2.2-§2.7). The corpus = relative paths under
// a root (skip .git/node_modules, cap CORPUS_MAX_ENTRIES); the matcher is
// exact → normalize → Levenshtein over FULL relative paths; accept d<=2 AND
// gap>=2, else fail-closed with top-3 candidates. The corpus cache (TTL)
// lives in the plugin layer; `buildCorpus` itself is a plain walk.

// Path normalization for the matcher (research §2.2 step 2): trim,
// backslash → slash, collapse separator runs, lowercase (Windows
// case-insensitivity — a case-only miss is not a typo at all).
export function normPathForm(p: string): string {
  return String(p ?? "").trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/").toLowerCase();
}

// The relative form of an absolute path against a root (slash form).
// `absPath` under the root → the plain relative path; equal → "."; outside
// → POSIX `..` form (the distance math still works on the string).
export function relForm(absPath: string, root: string): string {
  const a = String(absPath ?? "").replace(/\\/g, "/");
  const r = String(root ?? "").replace(/\\/g, "/").replace(/\/+$/, "");
  if (r === "" || a === r) return ".";
  if (a.startsWith(r + "/")) return a.slice(r.length + 1);
  return relative(r, a).replace(/\\/g, "/");
}

// The nearest EXISTING directory at or above the absolute path (walk up —
// a mistyped FILE name still has its parent directory present). Returns ""
// when none exists (the caller fail-closes).
export function nearestExistingDir(absPath: string): string {
  let d = String(absPath ?? "");
  for (let i = 0; i < 24 && d !== ""; i++) {
    try {
      if (statSync(d).isDirectory()) return d;
    } catch {
      // keep walking up
    }
    const parent = dirname(d);
    if (parent === d) break;
    d = parent;
  }
  return "";
}

// Walk `root` and collect relative paths (slash form; directories AND
// files — a mistyped directory name is a legitimate read target). Skip
// .git/node_modules; cap at `cap` entries (fail-safe: empty corpus →
// resolveReadPath never resolves). Sorted for determinism.
export function buildCorpus(root: string, cap: number = CORPUS_MAX_ENTRIES): string[] {
  const out: string[] = [];
  const r = String(root ?? "");
  if (r === "" || !existsSync(r)) return out;
  const walk = (d: string): void => {
    if (out.length >= cap) return;
    let entries: Dirent[];
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= cap) return;
      if (e.name === ".git" || e.name === "node_modules") continue;
      const full = join(d, e.name);
      if (e.isDirectory()) {
        out.push(relative(r, full).replace(/\\/g, "/"));
        walk(full);
      } else if (e.isFile()) {
        out.push(relative(r, full).replace(/\\/g, "/"));
      }
    }
  };
  walk(r);
  out.sort();
  return out;
}

// Classic two-row Levenshtein (insert/delete/substitute, all cost 1).
export function levenshtein(a: string, b: string): number {
  const s = String(a ?? "");
  const t = String(b ?? "");
  if (s === t) return 0;
  if (s === "") return t.length;
  if (t === "") return s.length;
  let prev = new Array<number>(t.length + 1);
  let cur = new Array<number>(t.length + 1);
  for (let j = 0; j <= t.length; j++) prev[j] = j;
  for (let i = 1; i <= s.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev;
    prev = cur;
    cur = tmp;
  }
  return prev[t.length];
}

// The PURE matcher body (research §2.2/§2.5): exact after normalize →
// `exact`; else Levenshtein over the FULL relative paths of the corpus →
// `resolved` iff d <= maxD AND gap to the second-closest >= FUZZY_MIN_GAP;
// else `rejected` with the top-3 [relPath, distance] candidates + reason
// (d-too-high / gap-too-small / empty-corpus / empty-arg). The corpus
// entries are compared in normalized form; the `path` returned is the
// corpus entry as stored (original case/spelling). `maxD` is the scope's
// accept bar (read = FUZZY_MAX_D, write = WRITE_FUZZY_MAX_D — R2).
function matchNearPath(argRel: string, corpus: string[], maxD: number): ReadResolution {
  const q = normPathForm(argRel);
  if (q === "" || corpus.length === 0) {
    return { kind: "rejected", cands: [], reason: corpus.length === 0 ? "empty-corpus" : "empty-arg" };
  }
  for (const c of corpus) {
    if (normPathForm(c) === q) return { kind: "exact" };
  }
  let best = Infinity;
  let bestPath = "";
  let second = Infinity;
  const scored: Array<[string, number]> = [];
  for (const c of corpus) {
    const d = levenshtein(q, normPathForm(c));
    scored.push([c, d]);
    if (d < best) {
      second = best;
      best = d;
      bestPath = c;
    } else if (d < second) {
      second = d;
    }
  }
  scored.sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
  if (best <= maxD && second - best >= FUZZY_MIN_GAP) {
    return { kind: "resolved", path: bestPath, d: best, gap: second === Infinity ? Infinity : second - best };
  }
  return {
    kind: "rejected",
    cands: scored.slice(0, 3),
    reason: best > maxD ? "d-too-high" : "gap-too-small",
  };
}

// READ scope (lane 5.4 — the accept bar FUZZY_MAX_D = 2).
export function resolveReadPath(argRel: string, corpus: string[]): ReadResolution {
  return matchNearPath(argRel, corpus, FUZZY_MAX_D);
}

// WRITE scope (R2, 2026-09-16 — the accept bar WRITE_FUZZY_MAX_D = 1, the
// same strict gate semantics at the tighter bar; the caller still checks
// the mistyped path absent first and the corpus holds only REAL paths).
export function resolveWritePath(argRel: string, corpus: string[]): ReadResolution {
  return matchNearPath(argRel, corpus, WRITE_FUZZY_MAX_D);
}
