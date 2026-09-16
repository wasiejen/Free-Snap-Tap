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
//       the evidence (the nine verdicts stay byte-identical).
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
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CORPUS_TTL_MS,
  MAX_LINES_PER_CALL,
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
  resolveWritePath,
} from "./intercept_observer_core.ts";
import type { NumwordMap, Observation, PairCheck } from "./intercept_observer_core.ts";
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
    const root = nearestExistingDir(abs);
    if (root === "") continue; // nowhere to match against — fail silent
    const res = resolveWritePath(relForm(abs, root), getCorpus(root));
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
    // Pipeline order: pair FIRST (may mutate), then the fuzzy matcher on the
    // (possibly pair-mutated) result (decision-record §2.6). Channel lines
    // log BEFORE the observation lines (the pair-before-dense order the
    // smoke/probe pins).
    let channel: Observation[] = [];
    let fuzzy: Observation[] = [];
    if (pairOwned) channel = runPairRead(output);
    else if (writeOwned) channel = runPairWrite(output, tool);
    else if (bashOwned) channel = runGitRefBash(output);
    const obs = argStr === "" ? [] : observeArg(argStr, map, dir || null, skipPairs);
    if (pairOwned) {
      const f = runFuzzyRead(output); // read-scope ONLY
      if (f !== null) fuzzy = [f];
    } else if (writeOwned) {
      fuzzy = runFuzzyWrite(output, tool); // write-scope ONLY
    }
    if (obs.length === 0 && channel.length === 0 && fuzzy.length === 0) return; // nothing to log
    model = await getModel(sid);
    for (const o of channel) appendObservation(sid, model, tool, argStr, o);
    for (const o of obs) appendObservation(sid, model, tool, argStr, o);
    for (const o of fuzzy) appendObservation(sid, model, tool, argStr, o);
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
