# R3 spec (STAGED) — arg-scope extension beyond `read`

GATE: **CLEARED 2026-09-25 by maintainer ruling** (bitdrift retired → no
correction data → R4 mining retired as meaningless; no R4 data needed). R2
is green + verified (live). R3 also ABSORBS the anchor-semantics drift fix
(todo_inbox 2026-09-25, found in #94): the existing block_transfer modes
MOVE/COPY/CUT/DELETE match `includes` + no unique-check → migrate to
startsWith + unique (the #94 REPLACE semantics) — approved 2026-09-25
(folded into R3 per his ruling; observable behavior change, pinned).
Design source: `decision-record.md` §2 + research doc §2.6/§3.5.

## Scope (line numbers refreshed at launch)
- **`glob` / `grep` path args:** pair form + fuzzy resolution with READ
  semantics (these are read tools — mismatch resolves, read thresholds
  d<=2/gap>=2).
- **Section-anchor resolver (research §2.6):** a named section anchor (short
  UNIQUE line prefix — the `block_transfer` marker convention) resolves to
  the first line number BEFORE the read executes; exactly-one match →
  rewrite `offset` (+ clamp `limit`), 0 or ≥2 matches → fail-closed with the
  match count logged. Bounded grep on the named file only. Line-offsets stay
  the fallback.
- **`bash` command args** via `command.execute.before`: quoted-form
  resolution (the form inside a quoted string in the command); the quoting
  prompt rule from AGENTS.md is the companion (his paste).
- **`block_transfer` anchors:** pair/fuzzy on anchor markers — anchors
  decide where a block lands, so this rides the R2 write-scope gate logic
  (strict existence, fail-closed on mismatch), not read semantics.
- Log: same channel/shape; new verdicts pinned.

## DoD
Probe pins per surface (glob/grep resolution, anchor exactly-one/zero/multi,
bash quoted-form, block_transfer anchor gate branches), smoke green,
standard gate green.

## Re-scope note (2026-09-26, planner-21 — staging)
- The anchor-semantics drift fix (MOVE/COPY/CUT/DELETE
  includes→startsWith + unique) is **ALREADY LANDED** in bt-v2 S1
  (`0d85a8c` — the unified `resolveAnchor` routes ALL modes through the
  prefix+unique rule; COPY substring tolerance removed). It no longer
  belongs to R3 — build only the four remaining scope items above
  (glob/grep path args, section-anchor resolver, bash quoted-form,
  block_transfer anchor pair/fuzzy via the R2 gate logic).
- The bash `command`-string redirect (#102, `be07ce6`) is already in the
  core resolver — the R3 bash quoted-form resolution extends that same
  1:1 resolver (one `kind=redirect`-style line per resolved span).
- Baselines at staging (planner-verified 2026-09-26, post-S4): probe
  **316/316**, block_transfer **123/123** + sandbox **64/64**,
  intercept_observer **68/68**, pytest 459+1w, ruff F=0. Re-verify at
  start; the measured baseline wins (S3 staging lesson).
- The `block_transfer` anchor markers now resolve via the S1
  `resolveAnchor` taxonomy — R3's pair/fuzzy form must COMPOSE with it
  (pair/fuzzy resolves the marker to a line, then the same
  startsWith+unique rule applies at the resolved site — confirm against
  `decision-record.md` §2 if ambiguous).

## Worker
`worker_Q3S_245K_slow` (spec line was `worker_Q4_140K` — stale, not in the
live opencode.jsonc; 245K-slow = the proven worker for this build family,
verified active).
