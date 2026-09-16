// numword.cjs — word→digit (numword) node entry point: CLI + module.
//
// The map lives in numwords.json — defined ONCE, read by BOTH entry points
// (the python twin w2n.py reads the same file). The entries only format it.
//
// Grammar (research §3.2 + addendum C4, approved 2026-09-16, lane 5.2):
//   - exact map words: units zero..nine, tens ten..ninety (incl. the `fourty`
//     alias → 40), teens eleven..nineteen EXPLICIT (ten+one ≠ eleven);
//   - tens+unit composition: `ninetyfour` → 94 (unique split point — an
//     ambiguous split is unknown, not a guess);
//   - dash-separated units are the canonical dense form: `two-zero` → 20,
//     `one-zero-one` → 101 (the one-prefix rule; a separator ALWAYS between
//     dense units);
//   - wordlist: `five,five` → 55 (comma list of single words);
//   - NO arithmetic in grammar input (`two+zero` → UNKNOWN), NO unseparated
//     concatenation (`twozero` → UNKNOWN — the §2.4 8/9 failure stays a loud
//     failure); unknown input → LOUD error (non-zero exit / throw), never a
//     best-guess.
//
// CLI (repo root or anywhere — the map resolves next to this file):
//   node numword.cjs <word-or-wordlist>      → digit string on stdout (exit 0)
//   node numword.cjs check <digit_str> <word> → AGREE <digits> (exit 0)
//                                              DISAGREE <digits> (exit 1)
//                                              UNKNOWN <word> (exit 2)
// Module (node -e usable):
//   const { w2n, numword_check } = require("<abs path>/numword.cjs");

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const MAP_PATH = path.join(__dirname, "numwords.json");

let cached = null;
function loadMap() {
  if (!cached) {
    const m = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
    if (!m || typeof m !== "object" || !m.units || !m.tens || !m.teens) {
      throw new Error(`numwords.json: missing units/tens/teens (${MAP_PATH})`);
    }
    cached = m;
  }
  return cached;
}

// ONE alphabetic word (no dashes, no commas): exact map hit (units / tens /
// teens + the fourty alias), else the UNIQUE tens+unit split (ninetyfour →
// 94); zero or multiple splits → null (unknown).
function singleWord(s, m) {
  if (s in m.units) return String(m.units[s]);
  if (s in m.tens) return String(m.tens[s]);
  if (s in m.teens) return String(m.teens[s]);
  const hits = [];
  for (let i = 1; i < s.length; i++) {
    const pre = s.slice(0, i);
    const suf = s.slice(i);
    if (pre in m.tens && suf in m.units) hits.push(String(m.tens[pre] + m.units[suf]));
  }
  return hits.length === 1 ? hits[0] : null;
}

// w2n — word or wordlist → digit string. Throws on unknown input (loud, never
// a guess). Case-insensitive, surrounding whitespace trimmed.
function w2n(raw) {
  const s = String(raw).trim().toLowerCase();
  const m = loadMap();
  if (s.includes(",")) {
    // wordlist: comma-separated single words; the dense form is the dash
    // form, so a list element must be a bare single word (no dash inside).
    let out = "";
    for (const p0 of s.split(",")) {
      const p = p0.trim();
      if (p === "" || p.includes("-")) {
        throw new Error(`numword: unknown numberword (wordlist element): '${raw}'`);
      }
      const d = singleWord(p, m);
      if (d === null) {
        throw new Error(`numword: unknown numberword (wordlist element): '${raw}'`);
      }
      out += d;
    }
    return out;
  }
  if (!/^[a-z-]+$/.test(s)) {
    throw new Error(`numword: unknown numberword: '${raw}'`);
  }
  if (s.includes("-")) {
    // canonical dense form: dash-separated single-digit units (the one-prefix
    // rule makes `one-zero-one` → 101 fall out of the same rule).
    let out = "";
    for (const p of s.split("-")) {
      if (p === "" || !(p in m.units)) {
        throw new Error(`numword: unknown numberword (dense unit): '${raw}'`);
      }
      out += String(m.units[p]);
    }
    return out;
  }
  const d = singleWord(s, m);
  if (d === null) {
    throw new Error(`numword: unknown numberword: '${raw}'`);
  }
  return d;
}

// numword_check — machine-readable agreement for shells:
//   AGREE <digits>    — w2n(word) === digit_str (code 0)
//   DISAGREE <digits> — w2n(word) resolved to something else (code 1)
//   UNKNOWN <word>    — the word does not resolve (code 2; loud, never guessed)
function numword_check(digit_str, word_str) {
  try {
    const d = w2n(word_str);
    if (d === String(digit_str).trim()) return { ok: true, out: `AGREE ${d}`, code: 0 };
    return { ok: false, out: `DISAGREE ${d}`, code: 1 };
  } catch {
    return { ok: false, out: `UNKNOWN ${String(word_str).trim()}`, code: 2 };
  }
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.length === 3 && argv[0] === "check") {
    const r = numword_check(argv[1], argv[2]);
    console.log(r.out);
    process.exit(r.code);
  }
  if (argv.length === 1) {
    try {
      console.log(w2n(argv[0]));
      process.exit(0);
    } catch (e) {
      process.stderr.write(`${e.message}\n`);
      process.exit(1);
    }
  }
  process.stderr.write("usage: node numword.cjs <word-or-wordlist> | node numword.cjs check <digit_str> <word>\n");
  process.exit(64);
}

module.exports = { w2n, numword_check, MAP_PATH };
