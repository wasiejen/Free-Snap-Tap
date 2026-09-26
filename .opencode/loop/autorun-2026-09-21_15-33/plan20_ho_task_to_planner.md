# Worker handover — TODO #102: R8 redirect extension — map POSIX /tmp (+ /var/tmp) into the sandbox scratchpad root

Session: worker-20 `ses_f23201c0effez6Sl8kZ3BSJ0Pf` (2026-09-26).
Status: **DONE** — code + pins + probe section committed (green gate); TODO + this handover on the final commit.
Branch: `opencode_test` (stayed; verified at start).

## What changed

1. **`intercept_observer_core.ts` — the POSIX temp-root prefix mapping** (the
   rule from the spec): `/tmp/<rest>` + `/var/tmp/<rest>` →
   `SCRATCHPAD_ROOT/<rest>` — root substitution, the **full remainder kept**,
   case preserved (backslash + double-slash forms normalized like the rest of
   the resolver). The bare root (`/tmp`, `/var/tmp`) → the scratchpad root
   itself (the case (i) analogy — `ls /tmp` in bash now works too). A **CODE
   constant** (`POSIX_TEMP_PREFIXES`, documented as the maintainer's scratchpad
   ruling 2026-09-26) — NOT read from opencode.jsonc (config names the Windows
   roots only). Implemented as a branch in `resolveRedirect` BEFORE the root
   loop (a POSIX span can never match a configured Windows root — the 1:1 hit
   count of the existing mapping is unaffected; the legacy case (i)/(ii)
   behavior is byte-identical — pinned). `POSIX_PATH_RE` (the note-channel span
   grammar) is now exported so the bash pass reuses the exact grammar (no
   duplicated regex).
2. **`intercept_observer.ts` — the BASH `command`-string redirect** (spec
   point 2 fallback — the spec's assumption was wrong: the typed-fields table
   EXPLICITLY excluded bash command strings as "opaque"). New private
   `runRedirectCommand`: scans the bash command with `POSIX_PATH_RE`, runs the
   SAME 1:1 resolver on each span, substitutes mapped spans in place (source
   order), logs ONE `kind=redirect tool=bash arg=command orig=<span>
   value=<target>` line per mapped span (the `pair-resolved` verdict REUSED —
   the twelve VERDICTS unchanged). UNmapped spans left byte-identical
   (fail-closed — the out-of-sandbox note still fires for them). Merged into
   `onToolBefore` at the existing R8 point (after the fuzzy channels); the
   note-recompute (filter + `observeSandbox` on effective args) applies to the
   merged result. Plugin exports unchanged (default factory ONLY — the smoke
   pin holds).
3. **Pins** — smoke `intercept_observer.smoke.mjs` (4 new checks, (12k)-(12n):
   pure resolver mapped + fail-closed forms; typed READ `/tmp` + `/var/tmp`
   byte-exact; bash command redirect byte-exact; bash unmapped fail-closed) +
   probe **new S29 section, checks 297-304** (pure resolver forms incl. bare
   root / double-slash / backslash; typed READ + WRITE e2e; bash two-mapped-
   spans e2e; bash unmapped fail-closed; bash MIXED mapped/unmapped — the
   note fires for the unmapped span). Header EXTENDED line + section-sum line
   updated (S29=8 → `PROBE handover: 305/305 PASS`).

## Measured verification (standard gate, repo root)

- intercept smoke: **68/68 ALL PASS** (64 existing + 4 new)
- probe: **305/305 PASS** (baseline 297 measured BEFORE changes + 8 new S29;
  agrees with the header annotation)
- pytest: **459 passed, 1 warning** (baseline 459+1w)
- ruff F: **0** (All checks passed)

## Commits

- Unit commit (code + pins + probe section): see `git log` — subject
  "R8 #102: map POSIX /tmp + /var/tmp into the sandbox scratchpad root".
- Final commit: TODO #102 LANDED status + this handover + loop log.

## Deliberately NOT done / notes

- **Live acceptance deferred to the maintainer's process restart.** The DoD's
  "controlled /tmp write+read (bash + one typed tool arg) redirected, file
  lands in the sandbox" was verified at the HOOK level: the e2e pins run the
  REAL before-hook of the NEW code (args mutation + byte-exact kind=redirect
  lines with orig=/value=; the note recompute; fail-closed cases). A live /tmp
  touch in THIS session would exercise the OLD (pre-restart) live plugin and
  would stop the session (the task's own scratchpad warning) — so it was not
  attempted. After the restart, a live `echo hi > /tmp/x` + a typed
  `/tmp/x` read should redirect + land in `C:/Users/Wasiejen/AppData/Local/
  Temp/opencode/` with the kind=redirect lines (the S1 friction entry's
  scenario is the acceptance probe).
- No-opencode.jsonc edit (read-only source of the Windows roots — per spec);
  the other intercept channels (pair/fuzzy/R6/R7) untouched; FST product code
  untouched; `opencode.jsonc` / `.opencode/maintainer/**` untouched.
- The spec's line hint for `resolveRedirect` (~L498-514) was off — it is at
  ~L577 in the core now (was L554 pre-change); same function/semantics as
  verified in the spec (no STOP condition hit).

Lessons: none beyond the friction entry (spec's bash-coverage assumption).
