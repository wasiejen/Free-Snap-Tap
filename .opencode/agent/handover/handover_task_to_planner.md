# WORKER SUMMARY — compact_memory plugin (units 1-4, COMPLETE)

Worker-2 (RESUME of dead session ses_f691b7802ffe2wMtz7svBy36Ya; his thought
dump used only as bounded reference, not re-derived). All four resume units
done and committed. The spec at HEAD `100a4f4` was the contract.

## Measured gates (at the final commit, this session)
- **Smoke harness** (scratchpad `C:\Users\Wasiejen\AppData\Local\Temp\opencode\
  qc_smoke\smoke.mjs`, not in the repo): **23/23 PASS** under node. NOTE: the
  harness is STATEFUL — delete `qc_smoke/.opencode` before re-runs. No checks
  were ADDED; 3 harness bugs were FIXED (below).
- **Probe**: `node .opencode/plugin/probes/handover_probe.mjs` → **PROBE
  handover: 98/98 PASS**, exit 0 (84 baseline + 14 new S13 checks, 86-99).
- **pytest**: `459 passed, 1 warning` (the warning is the known #10 item —
  matches the 459 + 1 #10 baseline).
- **ruff**: `check --select F .` → **All checks passed!** (F=0).
- **rg check**: `rg "tools/compact_memory" .opencode/plugin/probes/
  handover_probe.mjs` → **0 hits** (exit 1).
- **git status scope**: plugin file + retirement move + probe + bookkeeping;
  the v1 move is a rename whose diff is the **2 frozen header lines only**
  (git shows `rename … (95%)` = 100% of the content change being those lines).
  NOTE: the working tree also carries the maintainer's own unstaged edits to
  `.opencode/maintainer/priority.md` + `.opencode/proposals/2026-09-12_nap-
  size.md` (DO-NOT-TOUCH — left untouched, NOT in my commits).

## Commit list (WIP rescue + my four units)
- `100a4f4` (planner, WIP rescue) — the committed WIP plugin + resume spec.
- `5619bff` (unit 1) — plugin: classifier `i` flags + cross-read self-model
  fallback; smoke 23/23.
- `44df939` (unit 2) — v1 retired: `git mv .opencode/tools/compact_memory.ts
  → .opencode/plugin/deactivated/compact_memory_v1.ts` + exactly 2 frozen
  header lines (retired/superseded-by + self-location-depth note) + probe
  S10 re-point (TOOL_TS + S10 section header + header-map path ref). ONE
  commit, probe 84/84 at that point.
- `ed83233` (unit 3) — probe S13 appended (checks 86-99 after the check-85
  block, before S5 hygiene): direct import, no hook fires, all fs writes
  steered to the SANDBOX via `directory: SANDBOX`, fresh `ses_qc_*` ids ADDED
  to the FINGERPRINT array (check 43), header section map `S13=14` + total
  `98/98`. Probe 98/98 on the FIRST run (no fix cycle needed).
- `<this final commit>` (unit 4) — TODO.md #52 status (LANDED, live
  acceptance pending his registration + restart) + this summary.

## Failures found + fixed (the 8 launch failures + 1 extra)
1. **clf IQ4 / clf Q4KM / clf trap** (+ the gate cascade): the quant rules
   lacked the `i` flag — `/iq4|q4/`, `/iq3|q3/` didn't match the UPPERCASE
   live names (`Qwen3.8-27B-IQ4KT-120K`). Fixed: `i` flag on both rules
   (the `^cpu` rule already had it).
2. **gate 3rd-4th / v2 schema**: two causes — (a) the classifier cascade
   above (default cap 1 instead of 3); (b) the smoke expects the v2-store
   `model` field to be the CALLING session's model when
   `client.session.messages` is not a function at all (its gate mock stubs no
   messages method). Added a best-effort fallback in `resolveModel`: no
   messages function → self model (`c.extra.model.id`) + a transparency note;
   absent self model → default cap + note (unchanged). NOTE: the proposal
   says "RPC failure / no messages → default cap 1 + note" — I read "no
   messages" as the EMPTY result (which stays default+note) and the missing-
   FUNCTION case as the fallback (pinned by the smoke, the contract). The
   real v1 host client HAS `session.messages`, so this branch is test/mock-
   only in production — flagging for your awareness, no action requested.
3. **retry note** (`"Compaction request failed: null"`): the smoke's OWN mock
   bug — `Promise.reject(spec.summarizeError(n))` rejected the CLEAN retry
   with `null`. Fixed the mock: `summarizeError` may be a function OR a
   static error; reject only when the value is non-null. The plugin already
   reported the Part-1 wording ("keep not accepted by this build
   (retried without the keep fields)"); no plugin change needed.
4. **fail no increment**: same mock line — calling an Error object as a
   function. Same mock fix.
5. **gate check regex (found beyond the 8)**: the smoke's `/hand over/` is
   case-sensitive but v1's carried wording is "Hand over and start fresh"
   (verified byte-identical carry from the v1 file) → regex → `/hand over/i`.
6. **gate check unreachable (found beyond the 8)**: the smoke's 3-call loop
   made `rec.summarize.length === before + 1` UNREACHABLE — `before` was
   captured after 3 allowed calls, and the denial (by design) has zero side
   effects, so the count could never equal before+1. Restructured: 2 allowed
   + separate 3rd (the allowed one, the +1, asserted /compacted/) + separate
   4th (the denial). The check now verifies its stated name ("3rd allowed,
   4th denied") correctly.

## S13 check map (86-99)
86 registration shape · 87 classifier fixtures (IQ4→3, IQ3→1, Q4KM→3,
CPU→0, unknown→1, trap→3) · 88 summarize path + default response BYTE-EXACT
· 89 keep retry-once · 90 compact flat path · 91 no-client error naming both
probed methods · 92 gate (cap−1 allowed / cap denied, zero side effects) ·
93 CPU always denied (cap 0) · 94 increment-on-success only · 95 v2 store
schema on disk (model populated) · 96 COMPACT line WITH model field · 97
message + one-line trailer (byte-exact) · 98 cross-session model read (LAST
entry) · 99 failing RPC (default cap + note, no throw).

## Deliberately NOT done / carried forward
- `opencode.jsonc` untouched (maintainer's live registration — his domain;
  its commented tools/plugins lines now go stale; the registration entry for
  `.opencode/plugin/compact_memory.ts` + per-agent grants is the NEXT step,
  then restart = live Acceptance 2-4).
- `context_recovery.ts` untouched (emergency hook keeps its flat cap —
  maintainer question, carried).
- The smoke harness lives in the scratchpad (per spec, not in the repo) —
  if the maintainer wants it durable, it can be moved into the probe's
  fixture territory; the probe's S13 now pins the same contract IN-repo.
- The proposal file's "no messages → default cap" wording vs the smoke's
  missing-function fallback (see #2b) — proposal is DO-NOT-TOUCH; if you
  want the proposal text amended, that's your call.
