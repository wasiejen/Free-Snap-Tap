# R1 spec — read-scope `[left:right]` pair resolution + form switch + sandbox fix

STATUS: LAUNCH-READY (approved: maintainer "go for read-scope" 2026-09-16
direct session + research-doc 5.3 approval). Design source (read this BEFORE
the code — the reasoning is there, do not re-derive):
`.opencode/agent/research/fuzzy-numword/decision-record.md` §2.

## Goal
The intercept observer resolves the redundancy pair in READ scope and the
pair grammar switches from the old tight `digit|word` pipe form to
`[left:right]`.

## Verified facts (measured at spec time — build on these, do not re-verify)
- Baseline: probe 180/180 (self-annotation is the source, `handover_probe.mjs`
  line ~452; S18 = 32 checks at line ~3111). Loader contract: the plugin file
  must keep `grep -c ^export` = 1 (default export only — pinned by S18).
- Current pair detector: `PAIR_RE` at `intercept_observer_core.ts` line 262,
  `\b(\d{1,12})\|([a-z][a-z-]*)` (tight digit|word). All eight verdicts are
  frozen in `VERDICTS` (line ~103) and probe-pinned — a NEW verdict means a
  new probe pin.
- Read-scope mutation already exists for fuzzy (`intercept_observer.ts` line
  ~240: `if (tool === "read")`); the pair work plugs into the same hook.
- Word map (single home, read by plugin + scriptlets):
  `.opencode/agent/scripts/numword/numwords.json` — do NOT add words.
- Smoke: `.opencode/plugin/tests/intercept_observer.smoke.mjs` (29/29).

## Scope (what to build)
1. **Pair grammar switch** (core): `[left:right]`, NO inner spaces, exactly
   one `:`. left ∈ digit-as-seen `[0-9]+` | adder `\d+(\+\d+)*` | numword
   dash-form (map words, `fourty` alias, `-`-separated single units); right =
   numword dash-form ONLY. Right side unresolved (unknown word) →
   `no-candidate`, never a guess. Multiple pairs per arg → independent
   resolution, one log line each. Old tight `digit|word` form: no longer
   detected (the form is dead — his ruling 2026-09-16).
2. **Read-scope resolution**: `read` + string `filePath` containing a pair →
   resolve the pair to the canonical digits (adder-left = sum; right-wins on
   left/right mismatch — the canonical is ALWAYS the right-derived value;
   mismatch additionally flagged in the evidence field) → EXISTENCE GATE:
   mutate `output.args.filePath` only if the canonical path exists AND the
   pair-containing path does not (both/neither → fail-closed, original arg,
   gate evidence logged). New verdict `pair-resolved` (added to `VERDICTS` +
   pinned). Non-read tools: pair logging ONLY (existing
   `observed-redundancy-ok` / `redundancy-mismatch` / `no-candidate`
   verdicts on the NEW form).
3. **Sandbox allowed roots**: out-of-sandbox check accepts repo root +
   `C:/Users/Wasiejen/AppData/Local/Temp/opencode` (scratchpad — approved
   external dir; today it flags noise on every scratchpad use, measured).
4. **Probe** (S18 extension or new S19 — worker's call, pin the choice in
   the self-annotation): grammar (match / mismatch→right-wins / adder-sum /
   unknown-right / multi-pair / old-form-no-longer-detected), read mutation
   (canonical exists → mutated + `pair-resolved`; canonical absent →
   fail-closed), non-read tool = no mutation, scratchpad NOT
   out-of-sandbox. Update the self-annotation total (machine-check, never
   retype the digits).
5. **Smoke**: pair-resolution round-trip case added.

## Definition of done
- Probe green at the NEW self-annotation total; smoke green; `pytest` and
  `ruff` unchanged-green; plugin `grep -c ^export` = 1; standard gate per
  `repo_commands.md` all green; handover summary with measured numbers.

## Approval boundary
- PRE-APPROVED: read-scope resolution, form switch, sandbox fix (this spec).
- DO-NOT-TOUCH: write/edit/delete args (R2, separately approved),
  `ctx_watchdog.ts`, `numwords.json` (no new words), AGENTS.md + the
  repo-parts + anything under `.opencode/maintainer/` (maintainer files),
  the research/FB docs (read-only basis), `prompt_*` files (edit-deny).
- Spec paths are REPO-RELATIVE in every command — no doubled absolute paths
  (the launch-death lesson; the observer would have flagged it).
- Log file + C7 line shape unchanged (8 fields); new verdicts only.

## Worker
`worker_Q4_140K` (roster default for 140K-era builds; this is a
focused single-plugin change — one context, no research mandate).
