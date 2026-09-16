# w2n.py — word→digit (numword) python entry point.
#
# The map lives in numwords.json — the SAME file the node entry point
# (numword.cjs) reads, so the map is defined once. The grammar is the same
# grammar (research §3.2 + addendum C4, approved 2026-09-16, lane 5.2):
#   - exact map words: units zero..nine, tens ten..ninety (incl. the `fourty`
#     alias → 40), teens eleven..nineteen EXPLICIT (ten+one ≠ eleven);
#   - tens+unit composition: `ninetyfour` → 94 (unique split point — an
#     ambiguous split is unknown, not a guess);
#   - dash-separated units are the canonical dense form: `two-zero` → 20,
#     `one-zero-one` → 101 (the one-prefix rule; a separator ALWAYS between
#     dense units);
#   - wordlist: `five,five` → 55 (comma list of single words);
#   - NO arithmetic in grammar input (`two+zero` → unknown), NO unseparated
#     concatenation (`twozero` → unknown — the §2.4 8/9 failure stays a loud
#     failure); unknown input → ValueError (loud, never a best-guess).
#
# Usage (f-string usable):
#   from w2n import w2n
#   f"section {w2n('five')}"

import json
import os

_MAP_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "numwords.json")
_cache = None


def _load_map():
    global _cache
    if _cache is None:
        with open(_MAP_PATH, encoding="utf-8") as f:
            m = json.load(f)
        if not isinstance(m, dict) or not (m.get("units") and m.get("tens") and m.get("teens")):
            raise ValueError(f"numwords.json: missing units/tens/teens ({_MAP_PATH})")
        _cache = m
    return _cache


def _single_word(s, m):
    """ONE alphabetic word: exact map hit (units / tens / teens + the fourty
    alias), else the UNIQUE tens+unit split (ninetyfour → 94); zero or
    multiple splits → None (unknown)."""
    if s in m["units"]:
        return str(m["units"][s])
    if s in m["tens"]:
        return str(m["tens"][s])
    if s in m["teens"]:
        return str(m["teens"][s])
    hits = [
        str(m["tens"][s[:i]] + m["units"][s[i:]])
        for i in range(1, len(s))
        if s[:i] in m["tens"] and s[i:] in m["units"]
    ]
    return hits[0] if len(hits) == 1 else None


def w2n(raw):
    """word or wordlist → digit string. Raises ValueError on unknown input
    (loud, never a guess). Case-insensitive, surrounding whitespace trimmed."""
    s = str(raw).strip().lower()
    m = _load_map()
    if "," in s:
        # wordlist: comma-separated single words; the dense form is the dash
        # form, so a list element must be a bare single word (no dash inside).
        out = []
        for p0 in s.split(","):
            p = p0.strip()
            if p == "" or "-" in p:
                raise ValueError(f"numword: unknown numberword (wordlist element): {raw!r}")
            d = _single_word(p, m)
            if d is None:
                raise ValueError(f"numword: unknown numberword (wordlist element): {raw!r}")
            out.append(d)
        return "".join(out)
    if not s or any(not (c.isalpha() or c == "-") for c in s):
        raise ValueError(f"numword: unknown numberword: {raw!r}")
    if "-" in s:
        # canonical dense form: dash-separated single-digit units (the
        # one-prefix rule makes `one-zero-one` → 101 fall out of the same rule).
        out = []
        for p in s.split("-"):
            if p == "" or p not in m["units"]:
                raise ValueError(f"numword: unknown numberword (dense unit): {raw!r}")
            out.append(str(m["units"][p]))
        return "".join(out)
    d = _single_word(s, m)
    if d is None:
        raise ValueError(f"numword: unknown numberword: {raw!r}")
    return d


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        sys.stderr.write("usage: python w2n.py <word-or-wordlist>\n")
        sys.exit(64)
    try:
        sys.stdout.write(w2n(sys.argv[1]) + "\n")
    except ValueError as e:
        sys.stderr.write(str(e) + "\n")
        sys.exit(1)
