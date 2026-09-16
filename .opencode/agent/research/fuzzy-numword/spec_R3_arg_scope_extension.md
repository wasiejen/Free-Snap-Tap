# R3 spec (STAGED) — arg-scope extension beyond `read`

GATE (launch blocked until ALL hold): R2 green + verified, AND R4 log data
shows volume justifying the surface (pair/fuzzy activity on tools other than
read — without the data this is speculative scope).
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

## Worker
`worker_Q4_140K`.
