// intercept_observer.ts — 5.3 log-only intercept observer + 5.4 read-scoped
// fuzzy read resolution (lane 5.3/5.4, approved 2026-09-16; design source:
// research 2026-09-16_fuzzy-and-numword-tool-reliability.md §2 + addendum
// C6/C7 + R2 write-scope resolution, 2026-09-16).
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
//   NEVER touched by the READ channels. Both outcomes are logged (addendum
//   C6: conservative + both logged). glob / grep / section-anchors are NOT
//   in this unit (queued).
//
// (3) WRITE-SCOPED RESOLUTION (R2, 2026-09-16 — the mutation surface):
//   (3a) PAIR on the write-scope path fields (write/edit `filePath`,
//       block_transfer `srcFile`/`dstFile`): the read-scope gate semantics
//       (right-wins canonical; strict existence gate — mutate only when the
//       canonical EXISTS and the pair-form path does NOT), with the
//       corruption asymmetry of §2.3 — a MISMATCH FAILS CLOSED (no
//       mutation; `gate=fail-closed` logged; the agent sees the log and
//       decides). The OTHER string fields of the same call (content /
//       oldString / newString / bufferName / …) carry the observation-form
//       pair line ONLY — never mutated (the content-scope guard: mutation
//       is scope, not grammar — `args[1:one]` collides with the python
 //       slice form in the string space).
//   (3b) FUZZY on the same path fields: the read-scope matcher at the
//       TIGHTER bar d<=1 (`resolveWritePath`) under the same strict gate —
//       `fuzzy-resolved`/`fuzzy-rejected` with the `scope=write` flag in
//       the evidence (the nine verdicts stay byte-identical). M1 (2026-09-17,
//       #72): the `write` tool is EXCLUDED from this channel — "new file"
//       is a legal write intent, so a d=1 near-miss must never hijack an
//       existing sibling (edit/block_transfer keep the channel; the (3a)
//       pair channel is unaffected for all three tools).
//   (3c) GIT REFS in the bash `command` string: pair → digit (right-wins),
//       gated on ref EXISTENCE (research §3.4 — the gate is MANDATORY):
//       the maximal hex run spanning the pair's canonical digits is the
//       candidate ref; run < 4 hex chars → bare log-only line (gate not
//       attempted); run >= 4 → the ref exists in `git for-each-ref`
//       (--format=%(refname:short) membership — NOT rev-parse --verify,
//       which accepts any 40-hex string as an object name and never
//       consults a 40-hex-named ref; measured 2026-09-17) or the command
//       is left untouched (`gate=ref-rejected`); mutation is
//       all-or-nothing across the command's pairs (`gate=ref-mutated`).
//   Channel lines log BEFORE the observation lines (pair-before-dense
//   order); the nine VERDICTS stay byte-identical (core VERDICTS).
//
// (4) R6 PAYLOAD JOURNAL (2026-09-25, observation-only — decision-record
//   §8): EVERY `write` / `edit` / `block_transfer` call appends ONE line to
//   `.opencode/temp/journal_write.log` (write) or `journal_edit.log`
//   (edit + block_transfer — the spec names two files for three tools; the
//   line's tool field disambiguates). Best-effort, NEVER fails the call.
//   Line: `<stamp> | <session> | <tool> | <target> | <payload>` — 5 logical
//   fields; the payload is JSON (self-delimiting, may itself contain
//   " | "). target = the EFFECTIVE (post-mutation) path: write/edit
//   `filePath`, block_transfer `dstFile`. payload: write = JSON
//   `content`; edit = JSON `{filePath, old, new}`; block_transfer = JSON
//   `{srcFile, dstFile, mode?, startMarker?, endMarker?, targetMarker?,
//   bufferName?}` (the string fields present). The journal is a SEPARATE
//   file from intercept.log — journal-only calls add NO intercept line.
//
// (5) THE EDIT CHANNEL (R6 2026-09-25 + the (2) MUTATING edit-fuzzy,
//   2026-09-25, #95 sub-item 2 — `edit` only, the EFFECTIVE
//   post-pair/fuzzy args): oldString occurring EXACTLY ONCE in
//   the target file → SILENT (no line, no mutation, no after-hook hint —
//   the edit will succeed); >1 raw occurrences → `edit-ambiguous` line
//   `hint lines=<n1>,<n2>,…` (the edit tool will reject; the after-hook
//   hint is stored); 0 occurrences → the (2) MUTATING edit-fuzzy matcher
//   (core `resolveEditOldString` — normalize-then-compare: candidate
//   starts REUSE the R6 content-locator generation, both sides
//   normalized per-line \r\n→\n + strip trailing ws, d = the MAX
//   Levenshtein over the scored line-pairs): exactly-one candidate at
//   d=0 → MUTATE `output.args.oldString` to the file's EXACT bytes for
//   that block (an exact UNIQUE file substring) + the `fuzzy-edit` line
//   `fuzzy-edit orig=<first ~40 chars> len=<n> d=<0|1> value=<first ~40
//   chars of the target>` (directive b: the feedback is truncated — the
//   FULL payload stays in the R6 journal, whose edit `old` field is the
//   ORIGINAL pre-mutation oldString) + NO after-hook hint (the edit
//   succeeds); else exactly-one candidate at d<=1 → the same mutation;
//   else FAIL-CLOSED (no mutation): the R6 hint verdict fires as today —
//   the core CONTENT locator (locateContent — the anchor/candidate +
//   d<=2 gap>=2 shape): exact-single → `edit-hint` `hint line=<n> d=0
//   gap=inf snippet=<file line>`; resolved → `edit-hint` `hint line=<n>
//   d=<d> gap=<g|inf> snippet=<file line>`; ambiguous → `edit-ambiguous`
//   `hint cands=<n1 d1,n2 d2,n3 d3>`; fail-closed → `no-candidate`
//   `hint reason=<no-anchor-line|d-too-high|empty-arg>` — the
//   no-candidate line GAINS the best-candidate d when candidates exist
//   (directive a: every attempt is logged with the best-candidate d) —
//   and the after-hook hint is stored (the edit fails as today). Field 7
//   = `edit oldString`. The three new verdicts (`edit-hint` /
//   `edit-ambiguous` / `fuzzy-edit`) are appended to the core VERDICTS
//   (12 total). A SINGLE mutation — NO auto-retry (the §8 recovery
//   discipline; the R6 journal stays the recovery fallback).
//
// (6) R6 AFTER-HOOK ENRICHMENT (2026-09-25, LIVE-ACCEPTANCE RESTART-
//   GATED): a hint's evidence is cached per callID (TTL 10 min, cap 100,
//   FIFO) and `tool.execute.after` APPENDS it to the failed result's
//   `output.output` (the installed host reads `output.output` back from
//   the same reference — verified in the installed bundle types + binary;
//   if a host version could not enrich, the log-only fallback still
//   stands — the hint line is always logged). The cache entry is consumed
//   once.
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
// `fuzzy orig=<arg> cands=<p1 d1,p2 d2,p3 d3> reason=<r>` (rejected); the
// write-scope fuzzy lines (R2) carry `fuzzy scope=write …`. The read-scope
// pair lines (R1) use field 6
// `pair=[<l>:<r>] canon=<right-derived> dist=<d> gate=mutated|both-exist|
// none-exist` (mutated = `pair-resolved` verdict); the write-scope pair
// lines (R2) add `gate=fail-closed` on a mismatch field (fail-closed) and
// the bash git-ref lines (R2) add `gate=ref-mutated|ref-rejected
// run=<hexrun>` (ref run < 4 → the bare `pair=… canon=… dist=…` form, gate
// not attempted).
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
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CORPUS_TTL_MS,
  MAX_LINES_PER_CALL,
  MODEL_CACHE_TTL_MS,
  POSIX_PATH_RE,
  buildCorpus,
  checkPairs,
  classifyContext,
  collapseAdjacentDup,
  flattenField,
  loadNumwordMap,
  locateContent,
  matchNearPathSegments,
  nearestExistingDir,
  normPathForm,
  normSandboxPath,
  observeArg,
  observeSandbox,
  relForm,
  resolveEditOldString,
  resolveReadPath,
  resolveRedirect,
  resolveWritePath,
  SCRATCHPAD_ROOT,
} from "./intercept_observer_core.ts";
import type { NumwordMap, Observation, PairCheck } from "./intercept_observer_core.ts";
import { stripJsoncComments } from "./compact_memory.ts";
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
// R8 (#97, 2026-09-25): the allowed redirect roots — resolved ONCE at the
// factory/init call (never per call).
let allowedRoots: string[] = [];
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

// R8 (#97, 2026-09-25): the allowed-root basis for the out-of-sandbox path
// redirect — resolved ONCE at plugin init from opencode.jsonc: the
// `permission.external_directory` keys with value "allow" (the `/**` suffix
// stripped — a dir key and its `/**` twin dedupe to ONE root), the
// `references.*.path` values, + the workspace root (the hook's `directory`).
// Config unreadable / malformed → the fallback roots [workspace root,
// SCRATCHPAD_ROOT] (today's note-only roots) — never throw (fail-open, the
// established pattern). The JSONC parse reuses the shared string-state
// comment stripper (compact_memory.ts — the URL-safe parse).
function resolveAllowedRoots(): string[] {
  const roots: string[] = [];
  let ok = false;
  try {
    const cfg = JSON.parse(stripJsoncComments(readFileSync(join(dir, "opencode.jsonc"), "utf8")));
    const top = cfg && typeof cfg === "object" ? (cfg as Record<string, unknown>) : null;
    const ed = top && top.permission && typeof top.permission === "object" ? (top.permission as Record<string, unknown>) : null;
    const ext = ed && ed.external_directory && typeof ed.external_directory === "object" ? (ed.external_directory as Record<string, unknown>) : null;
    if (ext !== null) {
      for (const [key, val] of Object.entries(ext)) {
        if (val !== "allow" || key === "") continue;
        roots.push(key.endsWith("/**") ? key.slice(0, -3) : key);
      }
    }
    const refs = top && top.references && typeof top.references === "object" ? (top.references as Record<string, unknown>) : null;
    if (refs !== null) {
      for (const ref of Object.values(refs)) {
        if (ref && typeof ref === "object" && typeof (ref as Record<string, unknown>).path === "string" && (ref as Record<string, unknown>).path !== "") {
          roots.push((ref as Record<string, string>).path);
        }
      }
    }
    ok = true;
  } catch {
    // config unreadable / malformed → the fallback roots (fail-open)
  }
  roots.push(dir);
  if (!ok) roots.push(SCRATCHPAD_ROOT); // spec fallback: [workspace root, SCRATCHPAD_ROOT]
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of roots) {
    const n = normSandboxPath(r);
    if (n === "" || seen.has(n)) continue;
    seen.add(n);
    out.push(r);
  }
  return out;
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
  // #73 (2026-09-17): the STRUCTURAL dedup-collapse pre-check — an adjacent
  // identical FOLDER pair in the ABSOLUTE path (the realistic nested
  // doubling; the rel form has no pair — nearestExistingDir absorbs one)
  // → collapse one copy; the collapsed path EXISTS → resolve to it BEFORE
  // the corpus matchers (kind=dedup evidence, d=0 structural, NO gap field
  // — it is not a distance match); absent → fail-closed fall-through
  // (the matchers below, unchanged).
  const collapsed = collapseAdjacentDup(abs);
  if (collapsed !== null && existsSync(collapsed)) {
    (args as { filePath: string }).filePath = collapsed;
    return {
      verdict: "fuzzy-resolved",
      evidence: `fuzzy kind=dedup scope=read orig=${filePath} -> ${collapsed} d=0`,
      context: classifyContext(filePath),
    };
  }
  const root = nearestExistingDir(abs);
  if (root === "") return null; // nowhere to match against — fail silent
  const rel = relForm(abs, root);
  const corpus = getCorpus(root);
  // R7 (2026-09-17): the SEGMENT-level matcher FIRST — >=2-segment rel args
  // only (a single segment is a bare filename — BYPASS: the char channel
  // owns it exactly as pinned in S18/S20; the doubling case is
  // structurally >=2 segments). Segment-resolved → the kind=seg evidence
  // line; segment-rejected → fall through to the char matcher below
  // (unchanged).
  if (normPathForm(rel).split("/").filter((s) => s !== "").length >= 2) {
    const seg = matchNearPathSegments(rel, corpus);
    if (seg.kind === "exact") return null;
    if (seg.kind === "resolved") {
      (args as { filePath: string }).filePath = join(root, seg.path);
      return {
        verdict: "fuzzy-resolved",
        evidence: `fuzzy kind=seg scope=read orig=${filePath} -> ${seg.path} d=${seg.d} gap=${seg.gap === Infinity ? "inf" : seg.gap}`,
        context: classifyContext(filePath),
      };
    }
  }
  const res = resolveReadPath(rel, corpus);
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

// ------------------------------------------------------------------ write-scoped resolution (R2, 2026-09-16)
//
// The correction channels for the MUTATING surface (write/edit/block_transfer
// path fields + bash git refs) under the strict existence gate. The
// corruption asymmetry of research §2.3 is respected throughout: a wrong
// write is NOT self-correcting, so every ambiguous case FAILS CLOSED (no
// mutation, the log line carries both values / the gate evidence).

// The write-scope path fields per tool — the gated (mutable) fields. EVERY
// other string field of the same call is CONTENT-scope: observed (pair line
// logged), never mutated (the guard is scope, not grammar — `args[1:one]` in
// a python string collides with the pair form; the pair grammar does not
// know it is inside a string).
const WRITE_PATH_FIELDS: Record<string, string[]> = {
  write: ["filePath"],
  edit: ["filePath"],
  block_transfer: ["srcFile", "dstFile"],
};

function writePathFields(tool: string): string[] {
  return WRITE_PATH_FIELDS[tool] ?? [];
}

// R8 (#97, 2026-09-25): the TYPED path fields of the out-of-sandbox path
// redirect — the 1:1 allowed-root redirect (core `resolveRedirect`). A
 // SEPARATE table from WRITE_PATH_FIELDS (which drives the write-owned
 // pair/fuzzy channels — adding `read` there would break ownership).
// Applies to: read/write/edit `filePath` + block_transfer `srcFile`/
// `dstFile`. BASH `command` strings are covered by a SEPARATE pass
// (runRedirectCommand, #102 2026-09-26): the mapped POSIX temp-root
// spans are substituted in place (same 1:1 resolver, same kind=redirect
// line); UNmapped spans stay byte-identical (fail-closed — the
// out-of-sandbox note stays for them). Runs AFTER the R1/R2
// fuzzy channels (a path fuzzy-resolved in-sandbox is never redirected).
// On a redirect: the field is MUTATED to the target, the channel line
 // `kind=redirect tool=<t> arg=<field> orig=<full> value=<full>` is logged
 // (the `pair-resolved` verdict is REUSED — the `kind=dedup` precedent; the
 // twelve VERDICTS stay byte-identical), the out-of-sandbox
// NOTE is recomputed on the EFFECTIVE args (the redirected field no longer
// fires it — see onToolBefore), and a feedback note is stored for the
// after hook (the Unit 2 delivery). FAIL-CLOSED: no 1:1 mapping → no
// mutation (the permission gate + the note behave exactly as today).
// M1 note: the write redirect targets ALREADY-ALLOWED paths — no new
// overwrite hazard class (a file there was always directly writable by
// the agent). Never throws.
const REDIRECT_PATH_FIELDS: Record<string, string[]> = {
  read: ["filePath"],
  write: ["filePath"],
  edit: ["filePath"],
  block_transfer: ["srcFile", "dstFile"],
};

function runRedirect(output: { args?: unknown }, tool: string): { lines: Observation[]; fired: boolean } {
  const args = output?.args;
  if (args == null || typeof args !== "object") return { lines: [], fired: false };
  const fields = REDIRECT_PATH_FIELDS[tool] ?? [];
  if (fields.length === 0) return { lines: [], fired: false };
  const lines: Observation[] = [];
  let fired = false;
  for (const field of fields) {
    const raw = (args as Record<string, unknown>)[field];
    if (typeof raw !== "string" || raw.trim() === "") continue;
    const abs = isAbsolute(raw) ? raw : join(dir || ".", raw);
    const target = resolveRedirect(abs, allowedRoots);
    if (target === null || target === raw) continue; // fail-closed / no-op
    (args as Record<string, string>)[field] = target;
    fired = true;
    lines.push({
      verdict: "pair-resolved",
      evidence: `kind=redirect tool=${tool} arg=${field} orig=${raw} value=${target}`,
      context: classifyContext(raw),
    });
  }
  return { lines, fired };
}

// #102 (2026-09-26): the BASH `command`-string redirect — the same 1:1
// resolver over the POSIX path spans inside the command (POSIX_PATH_RE —
// the note-channel span grammar, exported from the core): each span the
// resolver maps (the POSIX temp-root prefix mapping) is substituted in
// place, ONE kind=redirect line per mapped span (the `pair-resolved`
// verdict is REUSED — the twelve VERDICTS stay byte-identical). UNmapped
// spans are left byte-identical (fail-closed — the out-of-sandbox note
// still fires for them). No other span class is touched (the command
// string stays opaque otherwise). The field is MUTATED only when at
// least one span mapped. Never throws.
function runRedirectCommand(output: { args?: unknown }, tool: string): { lines: Observation[]; fired: boolean } {
  if (tool !== "bash") return { lines: [], fired: false };
  const args = output?.args;
  if (args == null || typeof args !== "object") return { lines: [], fired: false };
  const raw = (args as Record<string, unknown>)["command"];
  if (typeof raw !== "string" || raw.trim() === "") return { lines: [], fired: false };
  const lines: Observation[] = [];
  let fired = false;
  const next = raw.replace(POSIX_PATH_RE, (m, pre, span) => {
    const target = resolveRedirect(span, allowedRoots);
    if (target === null || target === span) return m; // fail-closed / no-op
    fired = true;
    lines.push({
      verdict: "pair-resolved",
      evidence: `kind=redirect tool=bash arg=command orig=${span} value=${target}`,
      context: classifyContext(raw),
    });
    return pre + target;
  });
  if (next !== raw) (args as Record<string, string>)["command"] = next;
  return { lines, fired };
}

// The no-candidate pair line (shared by every channel — byte-identical to
// the observation-channel form): which side failed to resolve.
function noCandidateLine(pc: PairCheck, ctx: string): Observation {
  return {
    verdict: "no-candidate",
    evidence: `pair=${pc.raw} gate=${pc.rightVal === null ? "right-unknown" : "left-unknown"}`,
    context: ctx,
  };
}

// WRITE-scope PAIR resolution: the read-scope gate semantics at the mutating
// surface, with the one asymmetry — a left/right MISMATCH in a path field
// FAILS CLOSED (no mutation; the agent sees the log and decides), unlike
// read scope which resolves on mismatch (§2.6). Every `[left:right]` pair in
// a path field resolves independently (one log line each); right-wins
// canonical. EXISTENCE GATE (strict): MUTATES the field to the canonical
// path only when the canonical path EXISTS and the pair-form path does NOT
// (both/none → no mutation + gate evidence). The other string fields of the
// call (content/oldString/newString/…) carry the observation-form pair line
// ONLY. Channel cap: MAX_LINES_PER_CALL lines per call (path fields first,
// then content fields). Never throws.
function runPairWrite(output: { args?: unknown }, tool: string): Observation[] {
  const args = output?.args;
  if (args == null || typeof args !== "object" || map === null) return [];
  const fields = writePathFields(tool);
  if (fields.length === 0) return [];
  const lines: Observation[] = [];
  const abs = (p: string) => (isAbsolute(p) ? p : join(dir || ".", p));
  for (const field of fields) {
    if (lines.length >= MAX_LINES_PER_CALL) break;
    const raw = (args as Record<string, unknown>)[field];
    if (typeof raw !== "string" || raw.trim() === "") continue;
    const checks = checkPairs(raw, map);
    if (checks.length === 0) continue;
    const ctx = classifyContext(raw);
    if (checks.some((pc) => pc.verdict === "redundancy-mismatch")) {
      // FAIL-CLOSED: never "helpfully" rewrite a mismatched write target
      for (const pc of checks) {
        lines.push(
          pc.verdict === "no-candidate"
            ? noCandidateLine(pc, ctx)
            : {
                verdict: pc.verdict,
                evidence: `pair=${pc.raw} canon=${pc.canonical} dist=${pc.dist} gate=fail-closed`,
                context: ctx,
              },
        );
      }
      continue;
    }
    let canon = raw;
    for (const pc of checks) if (pc.canonical !== null) canon = canon.split(pc.raw).join(pc.canonical);
    const canonExists = existsSync(abs(canon));
    const origExists = existsSync(abs(raw));
    const mutate = canonExists && !origExists;
    if (mutate) (args as Record<string, string>)[field] = canon;
    const gate = mutate ? "mutated" : canonExists && origExists ? "both-exist" : "none-exist";
    for (const pc of checks) {
      lines.push(
        pc.verdict === "no-candidate"
          ? noCandidateLine(pc, ctx)
          : {
              verdict: mutate ? "pair-resolved" : pc.verdict,
              evidence: `pair=${pc.raw} canon=${pc.canonical} dist=${pc.dist} gate=${gate}`,
              context: ctx,
            },
      );
    }
  }
  // the content-scope guard: the OTHER string fields of the same call carry
  // the observation-form pair line only (never mutated, no gate evidence)
  for (const [field, value] of Object.entries(args as Record<string, unknown>)) {
    if (lines.length >= MAX_LINES_PER_CALL) break;
    if (fields.includes(field) || typeof value !== "string" || value === "") continue;
    for (const pc of checkPairs(value, map)) {
      if (lines.length >= MAX_LINES_PER_CALL) break;
      lines.push(
        pc.verdict === "no-candidate"
          ? noCandidateLine(pc, classifyContext(value))
          : {
              verdict: pc.verdict,
              evidence: `pair=${pc.raw} canon=${pc.canonical} dist=${pc.dist}`,
              context: classifyContext(value),
            },
      );
    }
  }
  return lines.slice(0, MAX_LINES_PER_CALL);
}

// WRITE-scope FUZZY: the read-scope matcher at the tighter bar (d<=1,
// resolveWritePath) under the SAME strict existence gate — runs on the
// (possibly pair-mutated) RESULT, per path field. Existing target → fast
// path (no line — the tool will find it); resolved → MUTATES the field to
// the resolved path + `fuzzy-resolved` with the `scope=write` flag;
// rejected → `fuzzy-rejected` with `scope=write` (both outcomes logged —
// addendum C6). At most one line per path field. Never throws.
function runFuzzyWrite(output: { args?: unknown }, tool: string): Observation[] {
  const args = output?.args;
  if (args == null || typeof args !== "object") return [];
  const fields = writePathFields(tool);
  if (fields.length === 0) return [];
  const lines: Observation[] = [];
  for (const field of fields) {
    const filePath = (args as Record<string, unknown>)[field];
    if (typeof filePath !== "string" || filePath.trim() === "") continue;
    const abs = isAbsolute(filePath) ? filePath : join(dir || ".", filePath);
    if (existsSync(abs)) continue; // exact-existing target — never fuzzy
    // #73 (2026-09-17): the STRUCTURAL dedup-collapse pre-check (the M1
    // dispatch guard keeps `write` OUT of this channel — edit/
    // block_transfer only; a doubled `write` stays ZERO lines): collapse
    // one copy of an adjacent identical FOLDER pair in the ABSOLUTE path;
    // the collapsed path EXISTS → mutate + kind=dedup scope=write line;
    // absent → fail-closed fall-through (the matchers below, unchanged).
    const collapsed = collapseAdjacentDup(abs);
    if (collapsed !== null && existsSync(collapsed)) {
      (args as Record<string, string>)[field] = collapsed;
      lines.push({
        verdict: "fuzzy-resolved",
        evidence: `fuzzy kind=dedup scope=write orig=${filePath} -> ${collapsed} d=0`,
        context: classifyContext(filePath),
      });
      continue;
    }
    const root = nearestExistingDir(abs);
    if (root === "") continue; // nowhere to match against — fail silent
    const rel = relForm(abs, root);
    const corpus = getCorpus(root);
    // R7 (2026-09-17): the SEGMENT-level matcher FIRST — >=2-segment rel
    // args only (a single segment is a bare filename — BYPASS: the char
    // channel owns it, the S18/S20 pins); segment-resolved → the kind=seg
    // scope=write line; segment-rejected → fall through to the char
    // matcher below (unchanged).
    if (normPathForm(rel).split("/").filter((s) => s !== "").length >= 2) {
      const seg = matchNearPathSegments(rel, corpus);
      if (seg.kind === "exact") continue;
      if (seg.kind === "resolved") {
        (args as Record<string, string>)[field] = join(root, seg.path);
        lines.push({
          verdict: "fuzzy-resolved",
          evidence: `fuzzy kind=seg scope=write orig=${filePath} -> ${seg.path} d=${seg.d} gap=${seg.gap === Infinity ? "inf" : seg.gap}`,
          context: classifyContext(filePath),
        });
        continue;
      }
    }
    const res = resolveWritePath(rel, corpus);
    if (res.kind === "exact") continue; // normalized-equal — untouched
    if (res.kind === "resolved") {
      (args as Record<string, string>)[field] = join(root, res.path);
      lines.push({
        verdict: "fuzzy-resolved",
        evidence: `fuzzy scope=write orig=${filePath} -> ${res.path} d=${res.d} gap=${res.gap === Infinity ? "inf" : res.gap}`,
        context: classifyContext(filePath),
      });
    } else {
      lines.push({
        verdict: "fuzzy-rejected",
        evidence: `fuzzy scope=write orig=${filePath} cands=${res.cands.map(([p, d]) => `${p} ${d}`).join(",")} reason=${res.reason}`,
        context: classifyContext(filePath),
      });
    }
  }
  return lines;
}

// The MANDATORY gate for bash git-ref resolution (research §3.4): a
// candidate ref is trusted only if it EXISTS in the repository's ref
// namespace — `git for-each-ref --format=%(refname:short)` + membership.
// NOT `git rev-parse --verify` (measured 2026-09-17): git parses a pure
// 40-hex string as an OBJECT name, not a ref — `rev-parse --verify`
// accepts ANY 40-hex string (even a non-existent sha, exit 0) and never
// consults the ref when the ref name is exactly 40 hex chars; the `^{}` /
// `^{commit}` peel does not help (the ref is ignored for the same reason).
// Bounded spawn (hard 2500 ms timeout); ANY failure (missing git, timeout,
// non-zero exit, non-repo dir) → false (fail-closed, never throw).
function gitRefExists(run: string): boolean {
  try {
    const r = spawnSync("git", ["for-each-ref", "--format=%(refname:short)"], {
      cwd: dir || undefined,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2500,
    });
    if (r.status !== 0 || typeof r.stdout !== "string") return false;
    return r.stdout.split("\n").map((l) => l.trim()).includes(run);
  } catch {
    return false;
  }
}

// BASH git-ref channel: commit ids in the bash `command` string —
// pair/numword → digit, gated on ref EXISTENCE (gitRefExists — the gate is
// MANDATORY). Every `[left:right]` pair resolves independently (right-wins);
// the candidate command replaces the resolved pairs; the REF is the maximal
// hex run spanning each pair's canonical digits (scan left/right in the
// candidate). run < 4 hex chars → the bare log-only line (the gate is not
// even attempted — the `echo [4:four]` form); run >= 4 → the ref-existence
// gate; MUTATE (all pairs, all-or-nothing) only when EVERY run exists. A
// MISMATCH fails closed (bare mismatch lines, no gate attempt). Never
// throws.
function runGitRefBash(output: { args?: unknown }): Observation[] {
  const args = output?.args;
  if (args == null || typeof args !== "object" || map === null) return [];
  const command = (args as { command?: unknown }).command;
  if (typeof command !== "string" || command.trim() === "") return [];
  const checks = checkPairs(command, map);
  if (checks.length === 0) return [];
  const ctx = classifyContext(command);
  const okPairs = checks.filter((pc) => pc.verdict !== "no-candidate");
  if (okPairs.length === 0 || okPairs.some((pc) => pc.verdict === "redundancy-mismatch")) {
    // fail-closed / nothing resolvable: the bare R1 log-only lines
    return checks.map((pc) =>
      pc.verdict === "no-candidate"
        ? noCandidateLine(pc, ctx)
        : {
            verdict: pc.verdict,
            evidence: `pair=${pc.raw} canon=${pc.canonical} dist=${pc.dist}`,
            context: ctx,
          },
    );
  }
  // candidate command with every ok pair replaced by its canonical digits
  let full = command;
  for (const pc of okPairs) full = full.split(pc.raw).join(pc.canonical!);
  const isHex = (ch: string) => (ch >= "0" && ch <= "9") || (ch >= "a" && ch <= "f") || (ch >= "A" && ch <= "F");
  // per ok pair (source order, disjoint spans): the maximal hex run spanning
  // the canonical digits; a left pair's substitution shifts the span by its
  // length delta
  let shift = 0;
  const runs: Array<{ pc: PairCheck; run: string }> = [];
  for (const pc of okPairs) {
    const start = pc.start + shift;
    const end = start + (pc.canonical ?? "").length;
    let a = start;
    while (a > 0 && isHex(full[a - 1])) a--;
    let b = end;
    while (b < full.length && isHex(full[b])) b++;
    runs.push({ pc, run: full.slice(a, b) });
    shift += (pc.canonical ?? "").length - pc.raw.length;
  }
  const allVerified = runs.every(({ run }) => run.length >= 4 && gitRefExists(run));
  if (allVerified) (args as { command: string }).command = full;
  return runs.map(({ pc, run }) =>
    run.length < 4
      ? {
          verdict: "observed-redundancy-ok",
          evidence: `pair=${pc.raw} canon=${pc.canonical} dist=${pc.dist}`,
          context: ctx,
        }
      : {
          verdict: allVerified ? "pair-resolved" : "observed-redundancy-ok",
          evidence: `pair=${pc.raw} canon=${pc.canonical} dist=${pc.dist} gate=${allVerified ? "ref-mutated" : "ref-rejected"} run=${run}`,
          context: ctx,
        },
  );
}

// ------------------------------------------------------------------ R6 payload journal + edit hint (2026-09-25)

// (6) the per-callID hint cache (the after-hook enrichment source): TTL
// 10 min, cap 100 entries (FIFO evict — Map iteration is insertion order).
const HINT_TTL_MS = 600_000;
const HINT_MAX_ENTRIES = 100;
const hintCache = new Map<string, { at: number; text: string }>();

function storeHint(callID: string, text: string): void {
  if (callID === "") return;
  const now = Date.now();
  for (const [k, v] of hintCache) if (now - v.at > HINT_TTL_MS) hintCache.delete(k);
  if (hintCache.size >= HINT_MAX_ENTRIES) {
    const first = hintCache.keys().next().value;
    if (first !== undefined) hintCache.delete(first);
  }
  hintCache.set(callID, { at: now, text });
}

// (6b) the per-callID FEEDBACK NOTE cache (#97, 2026-09-25) — the
// after-hook enrichment source for the CHANNEL notes (the storeHint
// pattern: TTL 10 min, cap 100, FIFO evict — one callID may carry SEVERAL
 // notes, delivered joined). Stores the R8 redirect note; onToolAfter
 // DELIVERS it (also on SUCCESS — today only the failed-edit hint is
 // delivered).
const noteCache = new Map<string, { at: number; notes: string[] }>();

function storeNote(callID: string, text: string): void {
  if (callID === "") return;
  const now = Date.now();
  for (const [k, v] of noteCache) if (now - v.at > HINT_TTL_MS) noteCache.delete(k);
  const hit = noteCache.get(callID);
  if (hit !== undefined) {
    hit.notes.push(text);
    return;
  }
  if (noteCache.size >= HINT_MAX_ENTRIES) {
    const first = noteCache.keys().next().value;
    if (first !== undefined) noteCache.delete(first);
  }
  noteCache.set(callID, { at: now, notes: [text] });
}

// (4) the payload journal — ONE line per write / edit / block_transfer
// call (best-effort; the house rule: never fail the tool call). The
// effective (post-mutation) args are journaled — what the host would
// actually act on — EXCEPT the edit `old` field: it is the ORIGINAL,
// pre-(2)-mutation oldString (directive b, 2026-09-25 — the recovery
// fallback captures what the model asked for, NOT what the (2) channel
 // mutated it to).
function appendJournal(tool: string, sid: string, args: Record<string, unknown>, editOldOriginal?: string): void {
  try {
    const a = args as Record<string, unknown>;
    const s = (k: string): string => (typeof a[k] === "string" ? (a[k] as string) : "");
    let target = "";
    let payload = "";
    if (tool === "write") {
      target = s("filePath");
      payload = JSON.stringify(s("content"));
    } else if (tool === "edit") {
      target = s("filePath");
      const old = editOldOriginal !== undefined ? editOldOriginal : s("oldString");
      payload = JSON.stringify({ filePath: s("filePath"), old, new: s("newString") });
    } else { // block_transfer
      target = s("dstFile");
      const o: Record<string, string> = {};
      for (const key of ["srcFile", "dstFile", "mode", "startMarker", "endMarker", "targetMarker", "bufferName"] as const) {
        if (typeof a[key] === "string") o[key] = a[key] as string;
      }
      payload = JSON.stringify(o);
    }
    const p = join(dir, ".opencode", "temp", tool === "write" ? "journal_write.log" : "journal_edit.log");
    mkdirSync(dirname(p), { recursive: true });
    appendFileSync(p, `${localStamp()} | ${sid || "unknown"} | ${tool} | ${target} | ${payload}\n`, "utf8");
  } catch {
    // best-effort — never break a tool call
  }
}

// The (2) feedback truncation (directive b, 2026-09-25): first 40 chars,
// a `...` marker when cut — the return feedback (the log line) is a
// context-saving identifier, NOT the full payload (the FULL payload stays
// in the R6 journal — its edit `old` field is the ORIGINAL, pre-mutation
// oldString).
const truncEdit40 = (s: string): string => (s.length > 40 ? s.slice(0, 40) + "..." : s);

 // (5) the edit channel (`edit` only, effective args). Runs AFTER the
 // pair/fuzzy channels (it sees their result). Raw occurrence count
// of oldString in the target file: 1 → SILENT (no line, no mutation, no
// after-hook hint); >1 → edit-ambiguous with ALL occurrence start lines
// (unchanged from R6); 0 → the (2) MUTATING edit-fuzzy channel
// (2026-09-25, #95 sub-item 2 — normalize-then-compare): d=0/d≤1
// exactly-one candidate → oldString is MUTATED to the file's EXACT bytes
// (the fuzzy-edit line; NO after-hook hint — the edit succeeds); else
// FAIL-CLOSED → the R6 hint verdict fires as today, CARRYING the
// best-candidate d (directive a) + the after-hook hint is stored. A
// SINGLE mutation — no auto-retry (the §8 recovery discipline).
function runEditFuzzy(output: { args?: unknown }): Observation | null {
  const args = output?.args;
  if (args == null || typeof args !== "object") return null;
  const a = args as { filePath?: unknown; oldString?: unknown };
  const filePath = str(a.filePath);
  const oldString = str(a.oldString);
  if (filePath.trim() === "" || oldString === "") return null; // empty-arg → silent
  const abs = isAbsolute(filePath) ? filePath : join(dir, filePath);
  let fileText = "";
  try {
    fileText = readFileSync(abs, "utf8");
  } catch {
    fileText = ""; // missing file — the matcher fail-closes (no-candidate)
  }
  const fileLines = fileText.split(/\r?\n/);
  // raw occurrence start lines (1-based, first line of each block)
  const starts: number[] = [];
  {
    const lineStarts: number[] = [0];
    for (let i = 0; i < fileText.length; i++) if (fileText.charCodeAt(i) === 10) lineStarts.push(i + 1);
    let from = 0;
    while (from + oldString.length <= fileText.length) {
      const idx = fileText.indexOf(oldString, from);
      if (idx === -1) break;
      let lo = 0, hi = lineStarts.length - 1, ln = 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lineStarts[mid] <= idx) { ln = mid + 1; lo = mid + 1; } else hi = mid - 1;
      }
      starts.push(ln);
      from = idx + 1;
    }
  }
  if (starts.length === 1) return null; // exactly one — the edit will succeed (silent)
  if (starts.length > 1) {
    return { verdict: "edit-ambiguous", evidence: `hint lines=${starts.join(",")}`, context: "edit oldString" };
  }
  // 0 raw occurrences → the (2) mutating channel
  const res = resolveEditOldString(oldString, fileText);
  if (res.kind === "mutate") {
    (a as { oldString: string }).oldString = res.mutated!; // THE single mutation (no auto-retry)
    const mutated = res.mutated!;
    return {
      verdict: "fuzzy-edit",
      evidence: `fuzzy-edit orig=${truncEdit40(oldString)} len=${oldString.length} d=${res.d} value=${truncEdit40(mutated)}`,
      context: "edit oldString",
    };
  }
  // fail-closed → the R6 hint verdict fires as today, carrying the
  // best-candidate d (directive a: the no-candidate line gains the best-d
  // when candidates exist); the after-hook hint is stored (the edit fails
  // as today)
  const lc = locateContent(oldString, fileText);
  if (lc.kind === "exact") {
    if (lc.lines.length === 1) {
      const lineText = fileLines[lc.lines[0] - 1] ?? "";
      return { verdict: "edit-hint", evidence: `hint line=${lc.lines[0]} d=0 gap=inf snippet=${lineText}`, context: "edit oldString" };
    }
    return { verdict: "edit-ambiguous", evidence: `hint lines=${lc.lines.join(",")}`, context: "edit oldString" };
  }
  if (lc.kind === "resolved") {
    const lineText = fileLines[lc.line - 1] ?? "";
    return {
      verdict: "edit-hint",
      evidence: `hint line=${lc.line} d=${lc.d} gap=${lc.gap === Infinity ? "inf" : lc.gap} snippet=${lineText}`,
      context: "edit oldString",
    };
  }
  if (lc.kind === "ambiguous") {
    return { verdict: "edit-ambiguous", evidence: `hint cands=${lc.cands.map(([n, d]) => `${n} ${d}`).join(",")}`, context: "edit oldString" };
  }
  const bd = res.bestD >= 0 ? ` best-d=${res.bestD}` : "";
  return { verdict: "no-candidate", evidence: `hint reason=${lc.reason}${bd}`, context: "edit oldString" };
}

 // (6) the after hook — enrich the tool result: the stored edit hint
 // (failed edit — behavior UNCHANGED) + the (#97, 2026-09-25) channel
 // FEEDBACK NOTES (the R8 redirects) — delivered for ANY tool, also on
 // SUCCESS (today only the failed-edit hint is delivered). Hint first,
 // then the notes (joined "\n"); consumed once; best-effort, never throw.
function onToolAfter(
  input: { tool?: string; sessionID?: string; callID?: string },
  output: { title?: string; output?: string; metadata?: unknown },
): void {
  try {
    const tool = str(input?.tool);
    const callID = str(input?.callID);
    let extra = "";
    if (tool === "edit") {
      const hit = hintCache.get(callID);
      if (hit !== undefined) {
        hintCache.delete(callID); // consumed once (the TTL bounds the stragglers)
        extra = hit.text;
      }
    }
    const notes = noteCache.get(callID);
    if (notes !== undefined) {
      noteCache.delete(callID); // consumed once (the TTL bounds the stragglers)
      if (notes.notes.length > 0) extra = extra === "" ? notes.notes.join("\n") : `${extra}\n${notes.notes.join("\n")}`;
    }
    if (extra === "") return;
    if (output != null && typeof output === "object") {
      output.output = `${str(output.output)}\n${extra}`;
    }
  } catch {
    // best-effort — never throw out of a hook
  }
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
    // CORRECTION-CHANNEL OWNERSHIP (no double-logging — observeArg skips the
    // pair class for a call whose channel owns the pair lines):
    //   read + string filePath            → the read pair channel (R1)
    //   write/edit/block_transfer         → the write pair channel (R2; owns
    //                                        ALL pair lines of the call —
    //                                        path fields gated, the other
    //                                        string fields observation-form)
    //   bash + string `command`           → the git-ref channel (R2)
    // Raw-string args (not an object) keep the R1 observation behavior —
    // the channels never mutate unstructured strings.
    const isObj = output?.args != null && typeof output.args === "object";
    const readFilePath = isObj ? (output.args as { filePath?: unknown }).filePath : undefined;
    const pairOwned = tool === "read" && typeof readFilePath === "string";
    const writeOwned = isObj && writePathFields(tool).length > 0;
    const bashOwned = isObj && tool === "bash" && typeof (output.args as { command?: unknown }).command === "string";
    const skipPairs = pairOwned || writeOwned || bashOwned;
    // Pipeline order: the pair channel (may mutate), then the fuzzy
    // matcher on the (possibly pair-mutated) result (decision-record
    // §2.6). Channel lines log BEFORE the observation lines (the
    // pair-before-dense order the smoke/probe pins).
    let channel: Observation[] = [];
    let fuzzy: Observation[] = [];
    if (pairOwned) channel = runPairRead(output);
    else if (writeOwned) channel = runPairWrite(output, tool);
    else if (bashOwned) channel = runGitRefBash(output);
    let obs = argStr === "" ? [] : observeArg(argStr, map, dir || null, skipPairs);
    if (pairOwned) {
      const f = runFuzzyRead(output); // read-scope ONLY
      if (f !== null) fuzzy = [f];
    } else if (writeOwned && tool !== "write") {
      // M1, 2026-09-17, #72: `write` excluded from the fuzzy channel —
      // "new file" is a legal intent for write, so a d=1 near-miss must
      // never hijack the target (edit/block_transfer keep the channel;
      // the pair channel above is unaffected for all three tools)
      fuzzy = runFuzzyWrite(output, tool); // write-scope ONLY
    }
    // R8 (#97, 2026-09-25) + #102 (2026-09-26, the bash `command` string):
    // the 1:1 allowed-root redirect over the TYPED path fields + the
    // mapped POSIX spans of the bash command — AFTER the R1/R2 fuzzy
    // channels (a path fuzzy-resolved in-sandbox is never redirected);
    // FAIL-CLOSED when no 1:1 mapping (no mutation; the out-of-sandbox
    // note behaves exactly as today).
    // When a redirect fires, the out-of-sandbox NOTE (observation e) is
    // recomputed on the EFFECTIVE args — the redirected field no longer
    // fires it (an unredirected span still does; the cap holds: ≤1 drop,
    // ≤1 re-add). The feedback note is stored for the after hook (the
    // Unit 2 delivery mechanism).
    const rd = runRedirect(output, tool);
    const rdc = runRedirectCommand(output, tool); // #102 (2026-09-26): the bash `command` string
    const redirect = [...rd.lines, ...rdc.lines];
    if (rd.fired || rdc.fired) {
      obs = obs.filter((o) => o.verdict !== "out-of-sandbox");
      // the allowed roots join the note check — a redirected field lands
      // under an allowed root and no longer fires the note (an
      // UNredirected out-of-sandbox span still does; the cap holds: ≤1
      // drop, ≤1 re-add)
      obs.push(...observeSandbox(argsToString(output?.args), dir || null, allowedRoots));
      storeNote(str(input?.callID), redirect.map((o) => o.evidence).join("; "));
    }
    // R6 (2026-09-25) + (2) (2026-09-25, #95 sub-item 2): the edit channel
    // (edit only — sees the effective, post-pair/fuzzy args; the
    // 0-occurrence case is now the MUTATING edit-fuzzy resolve-then-mutate
    // channel) + the payload journal (EVERY write/edit/block_transfer call
    // — the effective args; the journal is a separate file and runs even
    // when nothing is logged). The journal's edit `old` = the ORIGINAL
    // (pre-(2)-mutation) oldString — captured BEFORE the channel runs
    // (directive b: the recovery fallback captures what the model asked
    // for, not what the interceptor mutated to).
    let hint: Observation | null = null;
    let editOldOriginal: string | undefined;
    if (tool === "edit") {
      editOldOriginal = str((output.args as { oldString?: unknown }).oldString);
      hint = runEditFuzzy(output);
      // the after-hook source: the FAIL-CLOSED hint only — a mutation
      // (fuzzy-edit) stores NO hint (the edit succeeds, no enrichment)
      if (hint !== null && hint.verdict !== "fuzzy-edit") storeHint(str(input?.callID), hint.evidence);
    }
    if (writeOwned) appendJournal(tool, sid, output.args as Record<string, unknown>, editOldOriginal);
    if (obs.length === 0 && channel.length === 0 && redirect.length === 0 && fuzzy.length === 0 && hint === null) return; // nothing to log
    model = await getModel(sid);
    for (const o of channel) appendObservation(sid, model, tool, argStr, o);
    for (const o of redirect) appendObservation(sid, model, tool, argStr, o); // channel lines before observation lines
    for (const o of obs) appendObservation(sid, model, tool, argStr, o);
    for (const o of fuzzy) appendObservation(sid, model, tool, argStr, o);
    if (hint !== null) appendObservation(sid, model, tool, argStr, hint);
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
  allowedRoots = resolveAllowedRoots(); // R8 (#97): resolved ONCE at init
  return {
    "tool.execute.before": onToolBefore,
    "tool.execute.after": onToolAfter, // R6 (2026-09-25): the failed-edit hint enrichment
  };
}) satisfies Plugin;
