# Task spec — R3 completion (TAKEOVER of the dead R3 run's staged diff)

Goal: finish R3 (the arg-scope extension) — a prior worker (worker-21,
ses_f22a9f87) implemented the four channels, hit the context wall BEFORE
running the gate, and died leaving an UNCOMMITTED, NEVER-GATE-VERIFIED
diff. You take over that staged state: verify, complete the missing pins,
gate green, commit.

## What is on disk right now (planner-verified 2026-09-26 from the diff)
Uncommitted in 4 files (the ONLY R3-relevant changes — anything else
modified in the tree, e.g. `opencode.jsonc` / `priority.md`, is the
maintainer's live edit — DO NOT TOUCH or revert):
1. `.opencode/plugin/intercept_observer_core.ts` (+146) — the two new
   verdicts `anchor-resolved` / `anchor-rejected` (14 total); the R3
   section-anchor matcher (self-contained in core — NO tool-module import;
   reuses the S1 block_transfer rule: CRLF-tolerant, leading
   spaces/tabs stripped per line, verbatim case-sensitive `startsWith`,
   anchor used as typed).
2. `.opencode/plugin/intercept_observer.ts` (+363) — all four channels:
   - glob/grep PAIR channel: field-parameterized — the read `filePath`
     + the glob/grep `path` field share ONE READ gate (d<=2 / gap>=2).
   - section-anchor resolver: the read `offset` as a named section anchor
     (the block_transfer marker convention); exactly-one match → resolve
     BEFORE the read executes (offset rewrite + limit clamp per the spec);
     0 or >=2 → FAIL-CLOSED with the match count logged; numeric-string
     offset = fallback, always working; file missing → silent fail-closed;
     bounded grep on the named file only.
   - bash QUOTED-FORM channel: `[left:right]` pairs INSIDE quoted spans of
     the bash `command` (quoted-spans ownership split vs the unquoted
     pair checks); ok pairs replaced by canonical digits in a candidate
     command; never throws.
   - block_transfer ANCHOR-MARKER channel (`runAnchorMarkers`): pair/fuzzy
     on startMarker/endMarker/targetMarker under the R2 write-scope gate
     (strict existence, fail-closed); the anchor fields are EXCLUDED from
     the content-scope loop (no double handling).
3. `.opencode/plugin/tests/intercept_observer.smoke.mjs` — VERDICTS
   vocabulary re-pin 12→14 (the only smoke change so far).
4. `.opencode/plugin/probes/handover_probe.mjs` — the S18 VERDICTS-length
   re-pin 12→14 (the only probe change so far).

The staged state has NEVER passed the gate. Pre-staged baselines (the dead
worker re-verified them at its start): probe 316/316, block_transfer
123/123 + 64/64, intercept_observer 68/68, pytest 459+1w, ruff F=0.

## What to do
1. Review the staged diff FIRST (`git diff` on the 4 files — bounded
   reads; do not re-read whole files beyond what the diff shows).
2. Run the standard gate (per `.opencode/agent/prompts/repo/repo_commands.md`)
   on the staged state and fix what is red.
3. COMPLETE the missing pins per the R3 spec DoD (committed at
   `.opencode/agent/research/fuzzy-numword/spec_R3_arg_scope_extension.md`
   — read it, incl. the "Re-scope note" section): PROBE pins per surface
   (glob/grep resolution; the anchor resolver exactly-one / zero /
   multi; bash quoted-form; the block_transfer anchor gate branches) +
   smoke checks for the four channels (the staged smoke carries only the
   VERDICTS re-pin — per-channel behavior is NOT yet pinned).
4. Design details where ambiguous: `decision-record.md` §2 + research
   doc §2.6/§3.5 (same folder — bounded section reads, no broad
   re-research).
5. Checkpoint commits per verified unit; TODO + handover ride the FINAL
   commit (hashes of the code commits, never your own).

## Definition of done
- Standard gate GREEN on the completed state: probe total = 316 + your
  new R3 pins (state the exact new count in the handover), smokes ALL
  PASS (intercept_observer = 68 + your new channel checks), pytest
  459+1w, ruff F=0.
- Handover at `.opencode/agent/handover/handover_task_to_planner.md`
  (measured gate numbers + what you fixed in the staged diff, if
  anything + the new pin list).

## Do-NOT-touch
`.opencode/maintainer/**`, `opencode.jsonc` (live edit, uncommitted —
leave as-is), FST product code, `.opencode/tools/block_transfer.ts` and
the S1–S4 bt-v2 logic, `context_recovery.ts` (DEACTIVATED by the
maintainer — its recovery-resume fix is a SEPARATE pending item, not
yours), `auto_resume.ts`.

## NOT in this unit
Live acceptance (the live plugin runs pre-R3 code; the R-unit live
acceptances are the separate pending-maintainer queue).

## Worker
`worker_Q3S_245K_slow` (stay on the current checkout, `opencode_test`).
