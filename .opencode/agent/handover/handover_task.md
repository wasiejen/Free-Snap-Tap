# Task spec — TODO #102: R8 redirect extension — map POSIX /tmp into the sandbox

Goal: end the repeated loop stops from workers' `/tmp` habits by extending
the R8 1:1 allowed-root redirect (#97, landed `07bdd56`) so the POSIX
`/tmp` (and `/var/tmp`) root maps onto the scratchpad root — redirect +
log, never an allow-widening. Maintainer live report 2026-09-26:
"worker keep trying to access the temp/tmp folder directly and are
stopping the loop repeatedly."

## Scope (verified state at spec time)
- The redirect: `.opencode/plugin/intercept_observer.ts` — R8 section
  (~L245-282 allowed-root resolution at init from opencode.jsonc
  `permission.external_directory` + `references`; ~L499-541 +
  ~L1063-1081 the typed-arg redirect pass; `kind=redirect tool=… arg=…
  orig=… value=…` channel line) over the core resolver in
  `.opencode/plugin/intercept_observer_core.ts` (`underRoot` /
  `resolveRedirect`, ~L498-514, incl. the `extraRoots` param).
- Live evidence (planner-verified 2026-09-26): `intercept.log` line
  4668 — the Windows-Root form `C:\Users\Wasiejen\AppData\Local\Temp\
  bt_smoke_out.txt` was redirected 1:1 to `...\Temp\opencode\...` (that
  root mapping WORKS). The POSIX `/tmp/...` form has no mapping ->
  fail-closed -> the permission gate STOPS the session (S1 worker
  friction entry, 2026-09-26).
- Pins: the intercept smoke under `.opencode/plugin/tests/` +
  `.opencode/plugin/probes/handover_probe.mjs` (append-only section per
  the established pattern; probe total 297 at spec time).
- Read the R8 sections named above (bounded — they are short) + the
  root-resolution code. No SDK research; no opencode.jsonc edit
  (maintainer domain — the roots come from it read-only).

## What to build
1. Extend the allowed-root mapping with the POSIX roots: `/tmp/<rest>`
   and `/var/tmp/<rest>` -> `C:\Users\Wasiejen\AppData\Local\Temp\
   opencode\<rest>` (the scratchpad root — same 1:1 semantics as the
   existing Windows-Root mapping: root substitution, remainder kept).
   The mapping is a CODE constant of this unit's rule (documented in the
   code comment as the maintainer's scratchpad ruling 2026-09-26), NOT
   read from opencode.jsonc (the config names the Windows roots only).
2. Coverage: the redirect pass already runs over the TYPED args of ALL
   tools (incl. the bash `command` string) — verify with a pin that a
   bash command containing a `/tmp/...` path is redirected there too;
   if the bash `command` string is NOT currently in the redirect pass,
   extend it (same 1:1 resolver, same `kind=redirect` line).
3. Fail-closed unchanged: any path with no 1:1 mapping (other temp
   roots, `C:\Windows\...`, etc.) still fails closed — no mutation, no
   allow-widening (the M1 note holds).
4. Pins: new intercept smoke checks — `/tmp/x` + `/var/tmp/x` typed-arg
   redirect (orig=/value= byte-exact), bash-command `/tmp` redirect,
   one no-mapping fail-closed case; new PROBE section (numbered checks,
   append-only) for the same surface. Existing pins stay green.

## Definition of done
- Controlled `/tmp` write+read (bash + one typed tool arg) redirected,
  file lands in the sandbox, `kind=redirect` lines carry orig=/value=.
- No-mapping case fails closed (pinned). Existing intercept smoke ALL
  PASS + new pins; probe = 297 + your new checks, ALL PASS; pytest
  459+1w; ruff F=0 (standard gate per `repo_commands.md`).
- Checkpoint: ONE green commit (code + pins + probe section). TODO +
  handover ride the final commit.

## Do-NOT-touch
`.opencode/maintainer/**`, `opencode.jsonc`, FST product code, the
other intercept channels (pair/fuzzy/R6/R7 — the R8 sections only),
other plugins/tools. If the existing R8 root-resolution turns out
different from the spec's verified state, STOP and note it in your
handover — do not re-derive.

## Worker
`worker_Q3S_245K_slow` (same-model, serial slot).
