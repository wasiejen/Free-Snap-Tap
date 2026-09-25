# Task spec — TODO #97: R8 out-of-sandbox path redirect + escape return-info

Goal: two ordered units in `.opencode/plugin/` (both pre-approved observable
behavior changes — his live priority.md item "TODO #97" 2026-09-25 + the
#97 TODO entry):
1. **R8 redirect** — an out-of-sandbox path arg that maps 1:1 to an allowed
   root is REDIRECTED (mutated) by the intercept before the call runs; no 1:1
   mapping → fail-closed (no mutation); NO new out-of-sandbox access is ever
   granted (redirect only, never allow-widening).
2. **Escape return-info** — a mutation the agent cannot perceive (the
   numword-escape resolution, `kind=escape`) gets a feedback note in the
   tool result (truncated, per his context-saving ruling) + the full
   payload in the R6 journal.

Worker: `worker_Q3S_170K`. Stay on the current checkout (verify with
`git branch -v` — do not assume the branch name).

## Baseline (measured 2026-09-25, planner-17)
probe 291/291 (self-annotated header); smokes: intercept_observer 55/55,
auto_resume 139/139, compact_memory 74/74, context_recovery 17/17,
block_transfer 30/30 + 53/53, submit 20/20; pytest 459 passed + 1 warning;
ruff F=0. Current behavior: `out-of-sandbox` is an OBSERVATION verdict
only (`intercept_observer_core.ts` L548-586 — `observeSandbox`, `underRoot`,
`SCRATCHPAD_ROOT` L558); nothing is mutated; the session stops on
opencode's own permission gate.

## Area pointers (read ONLY these sections — not whole files)
- `.opencode/plugin/intercept_observer.ts`:
  - L239-306 hook plumbing (`logPath`, `appendRaw`, `appendObservation` —
    the 8-field line shape)
  - L270 `getModel` (opencode.jsonc is already parsed there — reuse the
    JSONC plumbing; resolve your roots ONCE at the factory/init call)
  - L308-429 read-scope channels (`getCorpus`, `runPairRead`,
    `runFuzzyRead` — the mutation + `kind=` channel-line PATTERN to follow)
  - L430-455 `writePathFields` (the per-tool path-field table)
  - L559-587 `runEscapeContent` (the `kind=escape` mutation channel)
  - L749-896 R6 journal + hint (`storeHint` L757, `appendJournal` L775,
    `runEditFuzzy` L822)
  - L897-1015 `onToolAfter` + `onToolBefore` + the hook registration
- `.opencode/plugin/intercept_observer_core.ts`: L445-506 (escape
  resolution, `ESCAPE_RE`), L548-586 (sandbox note e).
- `opencode.jsonc` L23-40: `permission.external_directory` (the `"allow"`
  keys) + `references.scratchpad.path` — the allowed-root basis (his
  L24 comment: "as basis for sandboxing").
- Smoke: `.opencode/plugin/tests/intercept_observer.smoke.mjs`; probe:
  `.opencode/plugin/probes/handover_probe.mjs` (S18-adjacent section, the
  established pattern — the probe self-annotates its header total;
  machine-update it).

## Unit 1 — R8 redirect
Allowed roots — resolved ONCE at plugin init from `opencode.jsonc`:
- keys of `permission.external_directory` with value `"allow"`, `/**`
  suffix stripped, deduped (`npm` + `npm/**` → one root),
- `references.*.path` values,
- the hook's `directory` (the workspace root — already available).
- Config unreadable → fall back to [workspace root, `SCRATCHPAD_ROOT`]
  (today's note-only roots) — never throw (fail-open, the established
  pattern).
Pure resolver in core (exported, testable) over ONE normalized absolute
path span + the root list:
- case (i): span == root → target = root
- case (ii): dirname(span) == dirname(root) — a direct SIBLING of an
  allowed root (span != root) → target = root + separator + basename(span)
- EXACTLY ONE (root, case) match after root dedupe → return the target;
  0 or ≥2 → null (no mutation).
- Comparison normalization: reuse `underRoot`'s normalize (backslash→/,
  collapse separator runs, lowercase, trim trailing /). The TARGET string
  keeps the root as configured + the span's basename (case preserved).
Applies to the TYPED path fields: `read.filePath`, `write.filePath`,
`edit.filePath`, `block_transfer.srcFile` + `dstFile` (extend the
`writePathFields` table or a parallel one — your call). Bash command
strings are OUT OF SCOPE (opaque; the fail-closed note stays for them).
Ordering: runs AFTER the R1 read-fuzzy channel (a path R1 resolved
in-sandbox is never redirected). If a redirect fires, the out-of-sandbox
NOTE (observation e) naturally does not; if nothing fires, it behaves
exactly as today.
On a redirect: mutate `output.args`; log the channel line
`kind=redirect tool=<t> arg=<field> orig=<full> value=<full>` (8-field
shape; channel lines log before observation lines, as today); store the
feedback note for the after hook (the Unit 2 mechanism).
M1 note (documented in the code comment only): the write redirect targets
ALREADY-ALLOWED paths — no new overwrite hazard class (a file there was
always directly writable by the agent).
FAIL-CLOSED: no 1:1 mapping → no mutation (the permission gate + the
out-of-sandbox note behave exactly as today).

## Unit 2 — escape return-info
Today `runEscapeContent` (`kind=escape`) mutates write/edit CONTENT
silently — the agent "only sees the correction" (his fuzzy_numword item:
"needs feedback … mandatory information"). Add:
- on a `kind=escape` mutation: store a feedback note keyed by callID (the
  `storeHint` pattern, L757): the resolved count + the FIRST orig→value
  TRUNCATED (first ~40 chars of the raw form + its length — per his
  context-saving ruling); extend `appendJournal` so the journal carries
  the pre-mutation escape forms (the full payload).
- `onToolAfter` (L899): append the note to the tool result — also on
  SUCCESS (today it only enriches failed results; extend without changing
  the failed-edit hint behavior). Note text (you draft it; pinned
  semantics): names the channel (`escape-resolved`), the count, the first
  `[orig~40]→[value]`, and points to intercept.log + the journal for the
  full payload.
- Scope: sentinel-carrying escape forms only — the plain `[l:r]` pair
  channel does not mutate args (no feedback needed); the R1/R2 fuzzy
  channels keep their existing lines (they already carry orig=/value=).

## Definition of done
- Unit 1 smokes: a read-sibling path is redirected (arg mutated + the
  `kind=redirect` line); a write-sibling too; span == root → root; a
  sibling matching TWO distinct roots → NO mutation + the note fires; a
  nested non-sibling → no mutation; config-unreadable → the fallback roots
  still redirect; all existing intercept pins unchanged. Probe: new R8
  pins in the S18-adjacent section (established pattern) + header total
  machine-updated.
- Unit 2 smokes: an escape-mutating write/edit → the tool result carries
  the feedback note (truncated first form) + the journal line carries the
  full pre-mutation forms; a call with no escape forms → no note; the
  failed-edit hint behavior unchanged (existing pins).
- Standard gate green at EACH unit. Checkpoint commit per verified unit
  (code only); `TODO.md` + your handover file ride the FINAL commit
  (carrying the code commits' hashes, never their own). TODO #97 status →
  LANDED (hashes recorded by the planner in its bookkeeping commit).
- Discrepancies found → `TODO.md` / `todo_inbox.md` per the shared protocol.

## DO-NOT-touch
`.opencode/maintainer/**`, `opencode.jsonc`, `auto_resume.ts`,
`compact_memory.ts`, `context_recovery.ts`, `block_transfer.ts`,
`loop_log.ts`, the FST code, and the R1/R2/R6 logic (ADDITIONS only —
do not restructure existing channels).
