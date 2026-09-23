#!/usr/bin/env node
// summarize_intercept.cjs -- read-only: turn the fuzzy-numword intercept log
// (.opencode/temp/intercept.log, written by the R7 observer) into a 6-section
// evidence summary (the R4 flywheel -- spec_R4_log_mining.md).
//
// GENERIC by design: the log keeps growing; every count is computed at run
// time, nothing (no count, no session id, no verdict) is hardcoded. The
// frozen verdict vocabulary below mirrors VERDICTS @
// .opencode/plugin/intercept_observer_core.ts (byte-stable by contract) and
// is the ONLY constant: verdicts outside it are reported as NEW.
//
// Line grammar (8 fields, separator " | " = space pipe space):
//   date_time | session_id | model | tool | args-json | evidence | scope | verdict
// Parsed right-anchored: verdict = last field, scope = second-to-last,
// evidence = third-to-last. If args-json ever contains " | " it merges into
// the args region; evidence/scope/verdict stay anchored. Lines with < 8
// fields are counted as malformed (their session id still counts in sec 6).
//
// Output sections (plain text, machine-stable lines):
//   1 verdict counts        (frozen in VERDICTS order, zero-included, NEW after)
//   2 fuzzy-rejected        (per-event d/gap + best-cand census: threshold-tuning input)
//   3 redundancy-mismatch   (verbatim lines: the word-drift evidence, feeds R5)
//   4 adder-form usage      (adder-left pair args: incident-density metric, decision-record 2.5)
//   5 out-of-sandbox        (count by path prefix: validates the scratchpad fix /
//                            catches new noise sources)
//   6 per-session line counts (convergence-habit signal, decision-record 6.3)
//
// Usage: node summarize_intercept.cjs [logfile=.opencode/temp/intercept.log]
//   e.g. node .opencode/agent/scripts/log/summarize_intercept.cjs
//        node .opencode/agent/scripts/log/summarize_intercept.cjs .opencode/temp/intercept.log
// Exit: 0 = summary printed, 1 = log file unreadable.

"use strict";
const fs = require("fs");

// The frozen verdict vocabulary -- mirror of VERDICTS @
// .opencode/plugin/intercept_observer_core.ts (byte-stable by contract).
const FROZEN_VERDICTS = [
  "observed-redundancy-ok",
  "redundancy-mismatch",
  "no-candidate",
  "ambiguous",
  "out-of-sandbox",
  "path-anomaly",
  "fuzzy-resolved",
  "fuzzy-rejected",
  "pair-resolved",
];

const VERBATIM_CAP = 380; // same per-line cap as logctx.cjs

// --- parsing ----------------------------------------------------------------

function parseLine(line) {
  const p = line.split(" | ");
  if (p.length < 8) return { malformed: true, session: p[1] || null, raw: line };
  return {
    malformed: false,
    session: p[1],
    evidence: p[p.length - 3],
    scope: p[p.length - 2],
    verdict: p[p.length - 1],
    raw: line,
  };
}

// Left side of a pair evidence value (the adder side, decision-record 2.5):
//   bare form "4|four"                    -> "4"
//   bracket form "[800+50+11:eight-6-1]"  -> "800+50+11"
function pairLeft(value) {
  const b = value.match(/^\[([^\]:]*)/);
  if (b) return b[1];
  const i = value.indexOf("|");
  return i === -1 ? value : value.slice(0, i);
}
// Adder construction: digits with at least one "+" (2.5 form b).
const ADDER_RE = /^\d+(\+\d+)+$/;

// The fuzzy-rejected candidate list ("cands=name d,name d,..."); the
// observer field cap can cut it mid-item (trailing "..." names, no dist).
function candList(field) {
  const m = field.match(/ cands=(.*)$/);
  if (!m) return [];
  const out = [];
  for (const item of m[1].split(",")) {
    const im = item.match(/^(.*\S) (\d+)$/);
    out.push(im ? { name: im[1], dist: parseInt(im[2], 10) } : { name: item, dist: null });
  }
  return out;
}

// Path-prefix bucket for section 5: normalize backslashes, drop leading
// slashes, take the first 3 non-empty segments. Values with fewer segments
// (observer-extraction junk like "//" or "/^") keep their raw form -- the
// noise sources must stay visible, not absorbed.
function pathPrefix(value) {
  const norm = value.replace(/\\/g, "/").replace(/^\/+/, "");
  const segs = norm.split("/").filter(Boolean);
  if (segs.length >= 3) return segs.slice(0, 3).join("/");
  if (segs.length === 0) return "(empty)";
  return value;
}

function trunc(s, cap) {
  return s.length > cap ? s.slice(0, cap) + "..." : s;
}
function byCountDescNameAsc(a, b) {
  return b[1] - a[1] || (a[0] < b[0] ? -1 : 1);
}

// --- summary -----------------------------------------------------------------

function summarize(text, logname) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const parsed = lines.map(parseLine);
  const ok = parsed.filter((p) => !p.malformed);
  const total = parsed.length;
  const malformed = total - ok.length;

  // 1 -- verdict counts (frozen in VERDICTS order, zero-included, NEW after)
  const counts = {};
  for (const p of ok) counts[p.verdict] = (counts[p.verdict] || 0) + 1;
  const sec1 = ["== 1. verdict counts =="];
  for (const v of FROZEN_VERDICTS) sec1.push(v.padEnd(24) + (counts[v] || 0));
  const fresh = Object.keys(counts)
    .filter((v) => !FROZEN_VERDICTS.includes(v))
    .sort(byCountDescNameAsc);
  for (const v of fresh) sec1.push("NEW " + v + " " + counts[v]);

  // 2 -- fuzzy-rejected: per-event d/gap + best-cand census
  const rej = ok.filter((p) => p.verdict === "fuzzy-rejected");
  const sec2 = [
    "== 2. fuzzy-rejected (" + rej.length + ") ==",
    "# per event: d = best-cand dist, gap = 2nd-best minus best, ? = cut off",
  ];
  const candTally = {};
  for (const p of rej) {
    const cands = candList(p.evidence);
    const d = cands.length && cands[0].dist != null ? cands[0].dist : "?";
    const gap =
      cands.length >= 2 && cands[0].dist != null && cands[1].dist != null
        ? cands[1].dist - cands[0].dist
        : "?";
    const name = cands.length ? trunc(cands[0].name, 40) : "?";
    sec2.push("d=" + d + " gap=" + gap + " cand=" + name);
    if (cands.length) {
      const k = name + " d=" + d;
      candTally[k] = (candTally[k] || 0) + 1;
    }
  }
  sec2.push("# best-cand census (count desc, name asc)");
  for (const [k, n] of Object.entries(candTally).sort(byCountDescNameAsc))
    sec2.push(k + " x" + n);

  // 3 -- redundancy-mismatch verbatim (the word-drift evidence)
  const mm = ok.filter((p) => p.verdict === "redundancy-mismatch");
  const sec3 = ["== 3. redundancy-mismatch (" + mm.length + ") verbatim =="];
  for (const p of mm) sec3.push(trunc(p.raw, VERBATIM_CAP));

  // 4 -- adder-form usage in pair args (incident-density metric)
  const pairLines = ok.filter((p) => /^pair=/.test(p.evidence));
  const adder = pairLines.filter((p) => ADDER_RE.test(pairLeft(p.evidence.slice(5))));
  const sec4 = [
    "== 4. adder-form usage (pair args) ==",
    "pair-events " + pairLines.length,
    "adder-left " + adder.length,
  ];

  // 5 -- out-of-sandbox by path prefix
  const oos = ok.filter((p) => p.verdict === "out-of-sandbox");
  const prefixes = {};
  for (const p of oos) {
    const m = p.evidence.match(/^path=(\S*)/);
    const key = m ? pathPrefix(m[1]) : "(unparsed)";
    prefixes[key] = (prefixes[key] || 0) + 1;
  }
  const sec5 = ["== 5. out-of-sandbox by path prefix (" + oos.length + ") =="];
  for (const [k, n] of Object.entries(prefixes).sort(byCountDescNameAsc))
    sec5.push(n + "  " + k);

  // 6 -- per-session line counts (convergence-habit signal)
  const sess = {};
  for (const p of parsed) if (p.session) sess[p.session] = (sess[p.session] || 0) + 1;
  const sec6 = ["== 6. per-session line counts (" + Object.keys(sess).length + " sessions) =="];
  for (const [k, n] of Object.entries(sess).sort(byCountDescNameAsc))
    sec6.push(n + "  " + k);

  const header = [
    "INTERCEPT SUMMARY " + logname,
    "lines " + total + "  sessions " + Object.keys(sess).length + "  malformed " + malformed,
  ];
  return header.concat(sec1, sec2, sec3, sec4, sec5, sec6).join("\n");
}

// --- cli ---------------------------------------------------------------------

function main() {
  const file = process.argv[2] || ".opencode/temp/intercept.log";
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    console.error("summarize_intercept: cannot read " + file + ": " + e.message);
    process.exit(1);
  }
  console.log(summarize(text, file));
}

if (require.main === module) main();
module.exports = { summarize, FROZEN_VERDICTS, parseLine, pathPrefix, pairLeft };
