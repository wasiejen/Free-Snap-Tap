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
// mutation token, plus the two R6 edit-hint tokens appended, 2026-09-25,
// plus `fuzzy-edit`, the (2) mutating edit-fuzzy token appended last,
// 2026-09-25 — twelve total):
//   observed-redundancy-ok | redundancy-mismatch | no-candidate | ambiguous |
//   out-of-sandbox | path-anomaly | fuzzy-resolved | fuzzy-rejected |
//   pair-resolved | edit-hint | edit-ambiguous | fuzzy-edit
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
//   token — the ref-existence gate is not even attempted)
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
// R6 (2026-09-25): the CONTENT-locator caps (decision-record §8) — the
// all-dense bounded whole-file scan cap (first 256 KiB) and the candidate
// cap (first in file order). The d/gap accept bar reuses FUZZY_MAX_D /
// FUZZY_MIN_GAP — the SAME thresholds as path matching.
export const LOCATOR_MAX_FILE_CHARS = 262_144;
export const LOCATOR_MAX_CANDIDATES = 500;
// R2 (2026-09-16): the WRITE-scope fuzzy accept bar — d<=1 (tighter than
// read's d<=2: the hazard class is different, research §2.3 — a wrong write
// is not self-correcting). Same gap rule, same strict existence gate (the
// corpus holds only REAL paths; the mistyped path is checked absent first).
export const WRITE_FUZZY_MAX_D = 1;
// R7 (2026-09-17): the SEGMENT-level accept bar — seg-d<=1, the same bar in
// both scopes (maintainer ruling 09-17). A path is a sequence of folder
// units: one extra / one mismatched folder = 1. A segment SUBSTITUTION
// counts as seg-d 1 ONLY when the two names are char-close (intra-segment
// levenshtein <= 1); a char-far substitution is non-substitutable (the DP
// routes around it at insert+delete cost 2 — fails closed).
export const SEG_MAX_D = 1;
// (2) (2026-09-25, #95 sub-item 2): the MUTATING edit-fuzzy accept bar —
// d<=1 on the normalize-then-compare distance (the typo tolerance, the
// #72/M1 strict bar). NO proportional bar: the CRLF/LF + trailing-ws
// drift class is unbounded in length (a 40-line CRLF drift = 39 chars —
// beyond any proportional cap); normalization removes it exactly.
export const EDIT_FUZZY_MAX_D = 1;

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
  "edit-hint", // R6 (2026-09-25): the edit-hint channel (locator resolved)
  "edit-ambiguous", // R6 (2026-09-25): multiple candidate lines (exact or fuzzy)
  "fuzzy-edit", // (2) (2026-09-25, #95): the MUTATING edit-fuzzy oldString verdict
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
  "edit-hint": 9, // documentary (the R6 hint channel logs it separately)
  "edit-ambiguous": 10, // documentary (same)
  "fuzzy-edit": 11, // documentary (the (2) edit-fuzzy channel logs it separately)
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

// ------------------------------------------------------------------ escape resolution (#0, 2026-09-18)
//
// The numword escape form (approved 2026-09-17_numword-escape-output.md):
// `[<incident>:<safe-form>:<sentinel>]` in write/edit CONTENT — a dense
// number the agent cannot reliably emit is WRITTEN into the file via the
// safe form it CAN. Field 1 (the incident, digits as-seen — the drifted
// state) is log-only, never authoritative. Field 2 (the correcting side)
// is the VALUE: dash-separated single digits (`3-2-0`) or numwords
// (`three-two-zero`) — the existing safe forms. Field 3 (the sentinel,
// `esc` / `escape` — the case variants are the same: one regex, the `i`
// flag) is the MATCH GATE: only sentinel-carrying forms are resolved, an
// unmarked `[a:b]` or an invalid field 2 stays byte-identical (Part 4 —
// no risk of unknowingly rewriting code; the clash surface is the exact
// `<digits>:<safe-form>:<sentinel>` structure). The whole form is
// replaced by the field-2-derived digits — the sentinel never reaches the
// file.

const ESCAPE_RE = /\[([0-9]+):([^:\]]+):esc(?:ape)?\]/gi;

export interface EscapeHit {
  raw: string; // the matched form as-seen (the log evidence)
  value: string; // the digits derived from field 2 (the written value)
  start: number;
  end: number;
}

// The safe form of field 2 (map/grammar-driven — no second numeral table):
// dash-separated single digits, or a numword form resolvable by the
// EXISTING `resolveNumword` grammar (single map word / dash-separated
// single units / tens / teens). Invalid → null (not a match — the loud
// unknown discipline, never a guess).
export function resolveEscapeSafe(raw: string, map: NumwordMap): string | null {
  const s = String(raw).trim().toLowerCase();
  if (s === "") return null;
  if (/^[0-9](?:-[0-9])*$/.test(s)) return s.replace(/-/g, ""); // 3-2-0 → 320
  const r = resolveNumword(s, map);
  return r.kind === "value" ? r.value : null;
}

// Resolve EVERY sentinel-carrying escape form in `text`: returns the
// transformed text (each matched form → its field-2-derived digits; the
// sentinel is stripped) + the hit list (original form + resolved digits
// per hit) for the log line. A form whose field 2 is not a valid safe
// form is left byte-identical (NOT a match). Pure function over arg
// strings + the shared map.
export function resolveEscapes(text: string, map: NumwordMap): { text: string; hits: EscapeHit[] } {
  const s = String(text ?? "");
  const hits: EscapeHit[] = [];
  for (const m of s.matchAll(ESCAPE_RE)) {
    const value = resolveEscapeSafe(m[2], map);
    if (value === null) continue;
    hits.push({ raw: m[0], value, start: m.index!, end: m.index! + m[0].length });
  }
  if (hits.length === 0) return { text: s, hits };
  let out = "";
  let last = 0;
  for (const h of hits) {
    out += s.slice(last, h.start) + h.value;
    last = h.end;
  }
  return { text: out + s.slice(last), hits };
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

// ------------------------------------------------------------------ R7 segment-level matcher (2026-09-17)
//
// A path is a SEQUENCE OF FOLDER UNITS: distance is counted per segment
// (one extra / one mismatched folder = 1). The doubled folder
// (OpenCodeProjects/OpenCodeProjects/… — char-lev 17, invisible to the
// char channel) is a single INSERTION (seg-d 1). Same gate discipline as
// matchNearPath: the corpus holds only REAL paths (the caller checks the
// mistyped path absent first), accept iff seg-d <= SEG_MAX_D AND gap to the
// second-best >= FUZZY_MIN_GAP, deterministic tie-break (seg-d, then
// intra-segment char-sum, then lexical), fail-closed rejected with top-3
// [relPath, seg-d] + reason. The hook applies it to >=2-segment relative
// args BEFORE the char matcher; 1-segment args BYPASS it (the char channel
// owns bare filenames — the S18/S20 evidence pins).

// The per-candidate segment DP: [seg-d, charSum] under the lex order —
// delete/insert cost 1 (charSum unchanged); substitution is allowed ONLY at
// the intra-segment char bar (cost = lev, charSum += lev); a char-far pair
// is non-substitutable. charSum is the intra-segment char total of the
// chosen alignment (the tie-break second key).
function segmentDistance(a: string[], b: string[]): [number, number] {
  const m = a.length;
  const n = b.length;
  const dp: Array<Array<[number, number]>> = [];
  for (let i = 0; i <= m; i++) {
    dp.push([]);
    for (let j = 0; j <= n; j++) {
      let v: [number, number];
      if (i === 0 && j === 0) v = [0, 0];
      else if (i === 0) v = [j, 0];
      else if (j === 0) v = [i, 0];
      else {
        const lev = levenshtein(a[i - 1], b[j - 1]);
        const opts: Array<[number, number]> = [
          [dp[i - 1][j][0] + 1, dp[i - 1][j][1]],
          [dp[i][j - 1][0] + 1, dp[i][j - 1][1]],
        ];
        if (lev <= 1) opts.push([dp[i - 1][j - 1][0] + lev, dp[i - 1][j - 1][1] + lev]);
        opts.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
        v = opts[0];
      }
      dp[i].push(v);
    }
  }
  return dp[m][n];
}

// Split a normalized rel path into folder units (normPathForm can keep a
// leading slash — drop empties so "///a/b" still splits to [a, b]).
function splitSegments(rel: string): string[] {
  return rel.split("/").filter((s) => s !== "");
}

// The R7 PURE segment matcher (DoD 1): same ReadResolution shape as
// matchNearPath with d = segment distance, cands = [relPath, seg-d].
export function matchNearPathSegments(argRel: string, corpus: string[]): ReadResolution {
  const q = normPathForm(argRel);
  if (q === "" || corpus.length === 0) {
    return { kind: "rejected", cands: [], reason: corpus.length === 0 ? "empty-corpus" : "empty-arg" };
  }
  for (const c of corpus) {
    if (normPathForm(c) === q) return { kind: "exact" };
  }
  const qSegs = splitSegments(q);
  const scored: Array<{ c: string; d: number; cs: number }> = [];
  let best: { c: string; d: number; cs: number } | null = null;
  let second = Infinity;
  for (const c of corpus) {
    const [d, cs] = segmentDistance(qSegs, splitSegments(normPathForm(c)));
    scored.push({ c, d, cs });
    if (best === null || d < best.d || (d === best.d && (cs < best.cs || (cs === best.cs && c < best.c)))) {
      second = best === null ? Infinity : best.d;
      best = { c, d, cs };
    } else if (d < second) {
      second = d;
    }
  }
  scored.sort((x, y) => x.d - y.d || x.cs - y.cs || (x.c < y.c ? -1 : x.c > y.c ? 1 : 0));
  const b = best as { c: string; d: number; cs: number };
  if (b.d <= SEG_MAX_D && second - b.d >= FUZZY_MIN_GAP) {
    return { kind: "resolved", path: b.c, d: b.d, gap: second === Infinity ? Infinity : second - b.d };
  }
  return {
    kind: "rejected",
    cands: scored.slice(0, 3).map((e) => [e.c, e.d] as [string, number]),
    reason: b.d > SEG_MAX_D ? "d-too-high" : "gap-too-small",
  };
}

// ------------------------------------------------------------------ R7.1 dedup-collapse (2026-09-17, #73)
//
// The STRUCTURAL doubling pre-check (the realistic nested doubling —
// OpenCodeProjects/OpenCodeProjects/…): detect it on the ABSOLUTE path
// form, NOT the rel path (nearestExistingDir absorbs one doubled folder
// into the root, so the rel form has no adjacent pair). Find the FIRST
// adjacent identical FOLDER pair (case-insensitive — normPathForm per
// segment), remove ONE copy → the collapsed absolute path (the input's
// separator form is preserved; empty segments from separator runs never
// qualify — a double slash is not a doubled folder); null when no such
// pair. The caller EXISTS-gates the result (fail-closed fall-through
// when absent); there is deliberately NO file-vs-dir gate (the corpus
// matchers return both, the gate discipline stays one check).

export function collapseAdjacentDup(absPath: string): string | null {
  const p = String(absPath ?? "").trim();
  if (p === "") return null;
  const segs = p.split(/[\\/]/);
  for (let i = 0; i + 1 < segs.length; i++) {
    if (segs[i] === "" || segs[i + 1] === "") continue;
    if (normPathForm(segs[i]) === normPathForm(segs[i + 1])) {
      const sep = p.includes("\\") ? "\\" : "/";
      return segs.slice(0, i + 1).concat(segs.slice(i + 2)).join(sep);
    }
  }
  return null;
}

// ------------------------------------------------------------------ R6 content locator (2026-09-25)
//
// The anchor-first CONTENT locator (design source: research/fuzzy-numword/
// decision-record.md §8 — the unifying primitive for (a) the R6 edit
// hints, (b) the R3 section-anchor resolver, (c) the block_transfer section
// recovery). Built on the EXISTING path-matcher shape: anchor/candidate +
// the d/gap accept bar (FUZZY_MAX_D / FUZZY_MIN_GAP — the SAME thresholds as
// path matching; `levenshtein` is reused as-is — no re-derived distance
// math), fail-closed.
//
// DENSE / NON-DENSE SPLIT: a line is scanned for DENSE spans — digit-
// starting runs over [0-9\-_/.] (dates like 2026-09-15, dense ids, bare
// digit runs — a single digit is dense too; it just shortens the word span
// around it) and the `ses_…` session-id shape; the NON-DENSE spans are the
// word runs in between. ANCHOR = the longest non-dense run (normalized);
// "" when a line has no word run (all-dense). Multi-line queries: the
// anchor set is the FIRST + LAST line only (their longest non-dense runs,
// line offsets 0 and k).
//
// CANDIDATES: block start i (1-based) where every anchored query line's
// anchor is a normalized substring of file line i+offset (the whole k+1
// block must fit in the file). All-dense query (no anchor anywhere) →
// BOUNDED whole-file scan (the cap below — a truncated scan can only MISS
// a candidate, never invent one — the safe direction); every block start
// is a candidate. At most LOCATOR_MAX_CANDIDATES candidates (first in file
// order).
//
// EXACT-THEN-FUZZY within candidates: exact = every scored query line
// normalized-equal to the candidate's line (scored lines = the anchored
// lines; all-dense = first + last); then d = the MAX levenshtein over the
// scored query lines; accept iff d <= FUZZY_MAX_D AND the gap to the
// second-best >= FUZZY_MIN_GAP; else FAIL-CLOSED: gap<2 → ambiguous
// (top-3 [line, d]); d too high / no candidate line / empty query →
// rejected (the caller fail-closes to `no-candidate`).

const DENSE_SPAN_RE = /\d[\d\-_/.]*|ses_[0-9a-zA-Z]{8,}/g;

// Content normalization for comparisons (the normPathForm analogue for
// line content): trim, collapse whitespace runs, lowercase.
export function normContent(s: string): string {
  return String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

// The longest NON-DENSE run of a line (normalized); "" when the line has
// no word span (all-dense).
export function longestNonDenseRun(line: string): string {
  const s = String(line ?? "");
  const gaps: string[] = [];
  let last = 0;
  for (const m of s.matchAll(DENSE_SPAN_RE)) {
    gaps.push(s.slice(last, m.index!));
    last = m.index! + m[0].length;
  }
  gaps.push(s.slice(last));
  let best = "";
  for (const g of gaps) {
    const n = normContent(g);
    if (n.length > best.length) best = n;
  }
  return best;
}

// The R6 content-locator result (the ReadResolution analogue over FILE
// LINES instead of paths; line numbers are 1-based block starts):
//   exact     — every scored query line normalized-equal to the candidate
//               line(s) (the hook: one line → edit-hint d=0; many →
//               edit-ambiguous with all line numbers)
//   resolved  — d <= FUZZY_MAX_D AND gap >= FUZZY_MIN_GAP (edit-hint)
//   ambiguous — gap < FUZZY_MIN_GAP: top-3 [line, d] (edit-ambiguous)
//   rejected  — fail-closed: empty-arg | no-anchor-line | d-too-high
//               (the caller logs `no-candidate`)
export type ContentResolution =
  | { kind: "exact"; lines: number[] }
  | { kind: "resolved"; line: number; d: number; gap: number }
  | { kind: "ambiguous"; cands: Array<[number, number]> }
  | { kind: "rejected"; reason: string };

// The shared content-locator query prep (R6 locateContent + the (2)
// edit-fuzzy channel, 2026-09-25 — the spec's candidate-generation reuse):
// the dense/non-dense anchor set — multi-line → first + last; an
// empty/wordless line contributes no anchor; all-dense → a bounded
// whole-file scan under the cap.
export interface ContentQuery {
  qRaw: string;
  qLines: string[];
  qNorm: string[];
  k: number; // qLines.length - 1
  anchors: Array<{ idx: number; anchor: string }>;
  scoreIdx: number[]; // the scored lines (anchored lines; all-dense → first+last or [0])
}

export function prepContentQuery(query: string): ContentQuery {
  const qRaw = String(query ?? "");
  const qLines = qRaw.split(/\r?\n/);
  const qNorm = qLines.map(normContent);
  const k = qNorm.length - 1;
  const anchorIdx = k === 0 ? [0] : [0, k];
  const anchors: Array<{ idx: number; anchor: string }> = [];
  for (const i of anchorIdx) {
    const a = longestNonDenseRun(qLines[i]);
    if (a !== "") anchors.push({ idx: i, anchor: a });
  }
  const scoreIdx: number[] = anchors.length > 0 ? anchors.map((a) => a.idx) : k === 0 ? [0] : [0, k];
  return { qRaw, qLines, qNorm, k, anchors, scoreIdx };
}

// The shared candidate block starts (1-based, first in file order, capped
// at LOCATOR_MAX_CANDIDATES).
export function contentCandidateStarts(q: ContentQuery, fileLines: string[]): number[] {
  const candStarts: number[] = [];
  for (let i = 1; i + q.k <= fileLines.length; i++) {
    if (candStarts.length >= LOCATOR_MAX_CANDIDATES) break;
    if (q.anchors.length === 0) {
      candStarts.push(i);
      continue;
    }
    let ok = true;
    for (const { idx, anchor } of q.anchors) {
      if (!normContent(fileLines[i + idx - 1]).includes(anchor)) {
        ok = false;
        break;
      }
    }
    if (ok) candStarts.push(i);
  }
  return candStarts;
}

export function locateContent(query: string, fileText: string, cap: number = LOCATOR_MAX_FILE_CHARS): ContentResolution {
  const q = prepContentQuery(query);
  if (q.qNorm.every((s) => s === "")) return { kind: "rejected", reason: "empty-arg" };
  const fileLines = String(fileText ?? "").slice(0, cap).split(/\r?\n/);
  const candStarts = contentCandidateStarts(q, fileLines);
  if (candStarts.length === 0) {
    return { kind: "rejected", reason: q.anchors.length === 0 ? "d-too-high" : "no-anchor-line" };
  }
  // exact first: every scored query line normalized-equal
  const exactLines: number[] = [];
  for (const i of candStarts) {
    let ok = true;
    for (const idx of q.scoreIdx) {
      if (normContent(fileLines[i + idx - 1]) !== q.qNorm[idx]) {
        ok = false;
        break;
      }
    }
    if (ok) exactLines.push(i);
  }
  if (exactLines.length > 0) return { kind: "exact", lines: exactLines };
  // fuzzy: d per candidate = the MAX levenshtein over the scored lines
  const scored: Array<{ line: number; d: number }> = [];
  for (const i of candStarts) {
    let d = 0;
    for (const idx of q.scoreIdx) {
      d = Math.max(d, levenshtein(q.qNorm[idx], normContent(fileLines[i + idx - 1])));
    }
    scored.push({ line: i, d });
  }
  scored.sort((a, b) => a.d - b.d || a.line - b.line);
  const best = scored[0];
  const second = scored.length > 1 ? scored[1].d : Infinity;
  if (best.d > FUZZY_MAX_D) return { kind: "rejected", reason: "d-too-high" };
  if (second - best.d >= FUZZY_MIN_GAP) {
    return { kind: "resolved", line: best.line, d: best.d, gap: second === Infinity ? Infinity : second - best.d };
  }
  return { kind: "ambiguous", cands: scored.slice(0, 3).map((e) => [e.line, e.d] as [number, number]) };
}

// ------------------------------------------------------------------ (2) the
// edit-fuzzy oldString channel (2026-09-25, #95 sub-item 2 — the MUTATING
// normalize-then-compare; decision-record §8.2)
//
// The oldString exact-match failure is a very regular problem, and the
// dominant drift class (CRLF/LF + trailing-whitespace) is unbounded in
// length (a 40-line CRLF drift = 39 chars — beyond any proportional cap);
// normalization removes it EXACTLY, so a proportional distance bar is
// REJECTED. d = 0 or d<=1 (EDIT_FUZZY_MAX_D — the typo tolerance, the
// #72/M1 strict bar), on exactly-one candidate; the caller applies a
// SINGLE mutation (no auto-retry — the §8 recovery discipline; the R6
// journal stays the recovery fallback).

const stripTrailingWs = (l: string): string => String(l ?? "").replace(/\s+$/, "");

// The (2) normalization (per line): \r\n→\n (via the split) + strip
// trailing whitespace. NO case / internal-whitespace normalization (those
// would blur the typo signal — this removes exactly the CRLF/LF +
// trailing-ws drift class, and nothing else).
export function normEditBytes(s: string): string {
  return String(s ?? "").split(/\r?\n/).map(stripTrailingWs).join("\n");
}

// The (2) resolution result (the EditResolution type — decision-record
// §8.2, the hierarchical mutation bar):
//   exactly-one candidate at d=0        → mutate (the exact file bytes)
//   else exactly-one candidate at d<=1  → mutate (the typo tolerance)
//   else                                → fail (no mutation — the caller
//                                         fires the R6 hint verdict)
// bestD = the MIN d over the candidates (directive a: every attempt is
// logged with the best-candidate d); -1 when no candidate exists.
export interface EditResolution {
  kind: "mutate" | "fail";
  bestD: number;
  mutated?: string; // mutate: the exact file bytes of the candidate block
  line?: number; // mutate: the 1-based block start
  d?: number; // mutate: the accepted candidate d (0 | 1)
}

// The candidate block's EXACT file bytes (1-based block start): the block's
// lines with the file's own internal line terminators; the LAST line's
// trailing terminator is NOT included (the replacement keeps the file's
// line structure). null when the block is empty / out of range — the
// caller fail-closes.
function editBlockBytes(text: string, fileLines: string[], q: ContentQuery, line: number): string | null {
  // per-line content offsets (terminator-aware: \r\n or \n; a bare \r is
  // NOT a terminator — matches the split(/\r?\n/) the rest of the code uses)
  const starts: number[] = [0];
  const ends: number[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text.charCodeAt(i);
    if (c === 10) {
      ends.push(i);
      starts.push(i + 1);
      i += 1;
    } else if (c === 13 && i + 1 < text.length && text.charCodeAt(i + 1) === 10) {
      ends.push(i);
      starts.push(i + 2);
      i += 2;
    } else {
      i += 1;
    }
  }
  ends.push(text.length); // the last (unterminated) line
  const li = line - 1; // 0-based block start
  const last = li + q.k; // 0-based last block line
  if (li < 0 || last >= fileLines.length) return null;
  const bytes = text.slice(starts[li], ends[last]);
  return bytes.length > 0 ? bytes : null;
}

// The raw (overlapping-inclusive) occurrence count of a non-empty needle.
// Overlaps COUNT (conservative: an over-count fail-closes the mutation).
function countOccurrences(haystack: string, needle: string): number {
  if (needle === "") return 0;
  let n = 0;
  let pos = 0;
  while (pos + needle.length <= haystack.length) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) break;
    n += 1;
    pos = idx + 1;
  }
  return n;
}

// The (2) matcher — normalize-then-compare (the spec's pinned design):
// candidate block starts REUSE the R6 content-locator candidate generation
// (anchors = the oldString's distinctive / longest non-dense lines;
// multi-line anchor = first + last; all-dense → bounded whole-file scan
// under the cap). For each candidate block, normalize BOTH sides — the
// query's lines and the file's lines — with normEditBytes; d = the MAX
// Levenshtein over the scored line-pairs (the same scored-line rule as
// locateContent).
export function resolveEditOldString(query: string, fileText: string, cap: number = LOCATOR_MAX_FILE_CHARS): EditResolution {
  const q = prepContentQuery(query);
  if (q.qNorm.every((s) => s === "")) return { kind: "fail", bestD: -1 };
  const full = String(fileText ?? "");
  const text = full.slice(0, cap);
  const fileLines = text.split(/\r?\n/);
  const candStarts = contentCandidateStarts(q, fileLines);
  if (candStarts.length === 0) return { kind: "fail", bestD: -1 };
  // normalize-then-compare: d per candidate = the MAX levenshtein over the
  // scored line-pairs (normEditBytes both sides)
  const qEdit = q.qLines.map(stripTrailingWs);
  const scored: Array<{ line: number; d: number }> = [];
  for (const i of candStarts) {
    let d = 0;
    for (const idx of q.scoreIdx) {
      d = Math.max(d, levenshtein(qEdit[idx], stripTrailingWs(fileLines[i + idx - 1])));
    }
    scored.push({ line: i, d });
  }
  scored.sort((a, b) => a.d - b.d || a.line - b.line);
  const bestD = scored[0].d;
  // the hierarchical mutation bar (exactly-one discipline; the mutated
  // bytes must be an exact UNIQUE substring of the FULL file — the edit
  // tool's raw indexOf then succeeds)
  for (const bar of [0, EDIT_FUZZY_MAX_D]) {
    const at = scored.filter((s) => s.d <= bar);
    if (at.length === 1) {
      const mutated = editBlockBytes(text, fileLines, q, at[0].line);
      if (mutated !== null && countOccurrences(full, mutated) === 1) {
        return { kind: "mutate", mutated, line: at[0].line, d: at[0].d, bestD: at[0].d };
      }
      // the exact block bytes are not a unique substring — fail-closed
      return { kind: "fail", bestD: at[0].d };
    }
  }
  return { kind: "fail", bestD };
}
