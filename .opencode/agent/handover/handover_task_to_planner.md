# Worker Summary — numword scriptlet (lane 5.2, worker-1, ses_f55f99299ffe6LtURACkgXKuTD, Qwen3.8-27B-IQ4KT-140K, looprun 2026-09-16_13-33)

Task spec: `handover_task.md` (approved research lane 5.2). DONE — all 8
DoD items green. Two commits: `708d272` (scripts) + `16d8b83` (probe S17 +
docs); this handover rides the third (commit) on top.

## What changed
1. **NEW** `.opencode/agent/scripts/numword/` — the approved scriptlet:
   - `numwords.json` — ONE shared map: units zero..nine, tens ten..ninety
     incl. the `fourty` alias→40, teens eleven..nineteen EXPLICIT.
   - `numword.cjs` — node entry point: `w2n(word)` (module, node -e usable),
     CLI `node numword.cjs <word-or-wordlist>` → digits (exit 0; unknown →
     exit 1 + `unknown` on stderr), CLI `node numword.cjs check <digit_str>
     <word>` → `AGREE <d>` (0) / `DISAGREE <d>` (1) / `UNKNOWN <w>` (2), and
     the `numword_check(digit_str, word_str)` module function returning
     `{ok, out, code}`.
   - `w2n.py` — python twin: `w2n(word)` importable/f-string-usable, SAME map
     (reads the same `numwords.json`), same grammar; unknown → ValueError.
2. **APPENDED** probe `.opencode/plugin/probes/handover_probe.mjs`: new S17
   section, checks 124–149 (26), inserted before S5 hygiene (existing
   sections untouched); header EXTENDED chain + WHAT-IT-RUNS entry +
   annotation total updated.
3. **UPDATED** `.opencode/agent/scripts/README.md` (numword/ category line) +
   `INVENTORY.md` (Promoted table: 2 lines — numword.cjs, w2n.py).

## Grammar implemented (spec left split points to me; fixtures are the contract)
- exact map hit (units / tens+alias / teens) → then the UNIQUE tens+unit
  split (`ninetyfour`→94; an ambiguous split = unknown);
- dash-separated parts must ALL be single-digit unit words (the canonical
  dense form; `one-zero-one`→101 falls out of the same rule as the
  one-prefix) — so e.g. `twenty-zero` is rejected;
- comma wordlist (`five,five`→55): each element must be a bare single word
  (no dash inside — the dense form is the dash form);
- anything else (`twozero`, `two+zero`, non-alphabetic chars, empty) → loud
  unknown; case-insensitive, trimmed.

## Measured verification (standard gate, all run at commit 16d8b83)
- pytest: **459 passed, 1 warning** — baseline unchanged (459+1w).
- ruff `--select F .`: **All checks passed** (F=0).
- probe: **PROBE handover: 148/148 PASS**, exit 0 — 26/26 new S17 checks
  green (ids 124–149 counted precisely); header annotation `148/148`
  machine-checked (`node -e` sum of section counts = 148, twice: section-sum
  and 122+26 — agree; never retyped).
- 7/7 plugin smokes green (block_transfer.sandbox, block_transfer,
  compact_memory, context_recovery, ctx_gauge, gauge_core, loop_log).
- Fixtures pinned in the probe (each individually): PASS nine→9,
  ninetyfour→94, fourty→40, one-zero-one→101, two-zero→20, one-zero-six→106,
  eleven→11; REJECT twozero, two+zero, foour, eleventy — each pinned on the
  node CLI (spawned), the python twin (spawned via `.venv/Scripts/python.exe`
  — live in the probe, NOT the flaky-fallback path of DoD 5), and the module
  (required DIRECT via createRequire).

## Deviations / notes (flagged, none blocking)
- **Spec vs reality (the code wins):** the spec described the probe header
  annotation (~line 376) as word-form "one hundred twenty-two" per #61 — the
  actual annotation is DIGIT form `12/2` on that line (no word-form total
  exists in the file; grep for `hundred` is empty). I kept the digit style
  and machine-checked the new `148/148`.
- Spec named the worker `worker_Q4_140K`; I am worker-1 (same
  Qwen3.8-27B-IQ4KT-140K model, per the launch context) — no practical
  difference.
- Two implementation bugs were caught and fixed by machine test before
  commit (the fixture run is the safety net working as designed): (a)
  tens+unit composition initially string-concatenated (ninetyfour→904) —
  now numeric (→94) in BOTH entry points; (b) the `check` CLI subcommand
  argv-length guard was 2 instead of 3.

## Deliberately NOT done
- No bash `w2n()` shell-function entry point — §3.2 lists it as a possible
  third entry, but the approved 5.2 goal is "ONE numword map + working
  word→digit / cross-check entry points in node + python"; a bash wrapper
  would duplicate the CLI (and awk was explicitly out). One-liner remains
  available: `node .opencode/agent/scripts/numword/numword.cjs nine`.
- No new TODO entries (per spec — the lane is recorded in the research
  addendum + this handover).
- Pre-existing untracked dir `.opencode/archive/loop/autorun-2026-09-15_13-11/`
  was left alone (not mine, predates this task).
- No FST product code touched; branch `opencode_test` unchanged.

## Loop log
Started + closed in `.opencode/loop/autorun-2026-09-16_13-33/loop_log.md`
(START line `-->START worker-1 ... numword scriptlet (lane 5.2)...`; the DONE
line lands with the commit of this handover).
