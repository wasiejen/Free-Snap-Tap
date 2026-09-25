# HANDOVER — TODO #94: block_transfer REPLACE mode (line-anchored span replacement from a buffer) (worker, `worker_Q3S_170K`, 2026-09-25)

## Executive summary
`REPLACE` is a new mode of the block_transfer tool: it atomically replaces the
line-anchored span (startMarker..endMarker INCLUSIVE) of ONE EXISTING file with
the contents of a named clipboard buffer — edit-like region replacement WITHOUT
an exact oldString match. The content channel stays buffers-only (no inline text
arg — consistent with PASTE); the buffer is PRESERVED afterwards (not consumed);
REPLACE never creates a file; all checks run BEFORE any fs access (sandbox
guard first); the return reports what was replaced (perceptibility):
`REPLACED lines <s>..<e> (<n> line[s]) in <dstFile> with buffer '<b>' (<m> line[s]).`
(s/e are 1-based line numbers). The mode enum, the schema describes, and the
description's MODES/ANCHORS/BUFFERS/EDGE paragraphs all document REPLACE.

## What changed (ONE commit: code + smokes + probe + knowledge + TODO.md + this handover)
- `.opencode/tools/block_transfer.ts` — `REPLACE` added to the mode enum (after
  PASTE) + its describe text; the dispatch branch sits next to PASTE; new
  per-arg required messages (dstFile / startMarker / endMarker), file-not-found,
  anchor not found, non-unique anchor, start-after-end, empty buffer (the exact
  PASTE message), the out-of-sandbox form. The description's MODES paragraph
  (REPLACE + "PASTE inserts, it does not replace"), ANCHORS (the span is in
  dstFile itself, no targetMarker), BUFFERS (the buffer supplies the replacement
  content, preserved), and EDGE ("an empty PASTE or REPLACE buffer") updated.
  The leading one-liner is UNCHANGED (the sandbox smoke pins it byte-exact).
- `.opencode/plugin/tests/block_transfer.smoke.mjs` — +8 checks (22 → 30): happy
  path (exact return string + byte-exact dst), buffer preserved (later PASTE
  reports 2 lines), missing dstFile, missing startMarker, anchor not found,
  non-unique anchor, start after end, single-line span (start == end).
- `.opencode/plugin/tests/block_transfer.sandbox.smoke.mjs` — +1 check (52 → 53):
  REPLACE with an out-of-sandbox dstFile → the byte-exact error form, no write,
  new path added to both cleanup lists.
- `.opencode/plugin/probes/handover_probe.mjs` — S15 +2 checks: **262** (REPLACE
  happy path: span replaced in place + byte-exact `REPLACED` report + buffer
  preserved via a later PASTE) and **263** (REPLACE non-unique start anchor →
  byte-exact error + dst byte-identical). IDs 262/263 extracted as max-used+1
  (max used = 261, machine-verified before the edit). S15 header count
  (10 → 12) + the section-header comment + the file's self-annotated totals
  (S15=12, 257/257 → 259/259) updated — the section-sum was machine-verified to
  equal 259.
- `.opencode/agent/knowledge/plugin_tools/2026-09-25_block_transfer.replace_mode.md`
  — NEW dated note: the REPLACE mode + when to use REPLACE vs PASTE vs MOVE +
  the slot-file lesson (the 2026-09-24 slot-clobber incident: PASTE is
  insert-only — slot/region replacement = REPLACE or write-overwrite).
- `TODO.md` #94 — status → `LANDED` (NO self-hash — the hash rides the
  planner's follow-up bookkeeping commit).

## Implementation decisions (inside the spec; worth a look)
1. **Anchor matching = `startsWith` (line-prefix), with an explicit non-unique
   check** — the spec's pinned design ("the line STARTING WITH startMarker;
   0 → not-found; ≥2 → non-unique"). NOTE: the EXISTING modes (MOVE/COPY/CUT/
   DELETE) use `includes` and have NO non-unique check — REPLACE intentionally
   does NOT change them (scope: the task adds a mode, it does not re-pin the
   others; flagged here so the drift stays visible).
2. **The end marker is searched over the WHOLE file, then `startIdx <= endIdx`
   is required** (the spec's pinned rule) — vs the existing modes'
   end-after-start search. A non-unique end (≥2 matches anywhere) also errors.
3. **Check order:** required args → sandbox → file-exists → buffer → anchors →
   write. So an out-of-sandbox dst errors even with a valid buffer, and a
   missing file errors before the buffer check (the smoke/probe pins match this).
4. **Singular/plural in the return** (`(1 line)` vs `(n lines)`) — the spec's
   example used `<n> lines`; the single-line-span pin needed the grammatical
   form and the rest of the tool's message style is count-natural.
5. **Smoke split:** the spec's 8 REPLACE checks were written as 8 `chk` calls
   (the happy path and the single-line span each combine the exact return
   string + the byte-exact file content in ONE check, matching the file's
   existing style) — the count lands exactly on 30.

## Measured verification (baseline re-run AT START, not trusted)
Baseline (start, 2026-09-25): probe **257/257 PASS** exit 0 (max used check ID =
261); smokes 22/22 + 52/52 (per the spec's verified facts).
After the change (all re-run):
- `node .opencode/plugin/tests/block_transfer.smoke.mjs` → **ALL PASS (30/30)**
- `node .opencode/plugin/tests/block_transfer.sandbox.smoke.mjs` → **ALL PASS (53/53)**
- `node .opencode/plugin/probes/handover_probe.mjs` → **PROBE handover: 259/259 PASS**,
  exit 0; S15 = 12 checks; header totals machine-updated and the section-sum
  machine-verified to equal 259; checks 262/263 PASS (exact lines in the run log)
- pytest: **459 passed, 1 warning** (in 2.21s)
- ruff: **F=0** ("All checks passed!")

## Commit facts
ONE green commit (code + smokes + probe + knowledge + TODO.md + this handover),
per the spec's single-unit shape. Staged by explicit pathspec — the working
tree's maintainer-pending changes (`.opencode/maintainer/**` moves/edits,
`AGENTS.md`) are NOT included (left exactly as found). The two submit-tool
inbox entries this session appended (`.opencode/agent/agent_feedback.md`,
`todo_inbox.md`) also stay OUT of the commit (append-only curation channels —
they ride the planner's bookkeeping/curation commit). The hash rides the
planner's follow-up bookkeeping commit (no self-reference).

## TODO entries
- #94 status → LANDED (this commit's contents; the hash in the planner's bookkeeping).
- No new `todo_inbox.md` entries.

## Deliberately NOT done (with reason)
- The existing modes' anchor semantics were NOT touched (they stay `includes` +
  no non-unique check) — out of scope; the spec's scope list is exhaustive on
  this point (flagged in decision 1 instead).
- Multi-block REPLACE (several spans in one call) — deferred per the spec's
  design section.
- PASTE was left insert-only (the spec's pinned boundary — PASTE does not gain
  replacement semantics).
- DO-NOT-touch items untouched: `.opencode/maintainer/**`, `opencode.jsonc`,
  `AGENTS.md`, the other tools in `.opencode/tools/`, probe sections S10/S11,
  and every file outside the spec's scope list.
