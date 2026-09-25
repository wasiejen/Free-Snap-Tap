# block_transfer REPLACE mode (TODO #94, 2026-09-25)

## REPLACE: line-anchored span replacement from a named buffer
- **Do:** To replace a region of an EXISTING file in one atomic call, use
  `REPLACE`: `dstFile` + `startMarker` + `endMarker` (short UNIQUE line
  prefixes in dstFile, the span is start..end INCLUSIVE) + `bufferName`
  (default `default`) — the replacement content is ALWAYS the named buffer,
  never inline text (the content channel stays buffers-only, like PASTE).
  Fill the buffer with a COPY/CUT first. The buffer is PRESERVED afterwards
  (not consumed). The return reports the 1-based line span + counts, e.g.
  `REPLACED lines 2..3 (2 lines) in 'f.txt' with buffer 'b' (2 lines).`
- **Why (evidence):** implemented 2026-09-25 in `.opencode/tools/block_transfer.ts`
  (enum + dispatch branch next to PASTE + description MODES/ANCHORS/BUFFERS/EDGE);
  all checks run before any fs access (sandbox check + file-must-exist +
  buffer + anchors); REPLACE never creates a file (no span exists in a
  nonexistent file). Verified: smokes 30/30 + 53/53, probe S15 checks 262/263
  (total 259/259), gate green (pytest 459 + 1 warning, ruff F=0).
- **Ref:** worker_Q3S_170K session 2026-09-25 (TODO #94); the spec's
  maintainer approval 2026-09-25.
- **Keys:** block_transfer, REPLACE, span replacement, anchored edit, buffer.

## When to use REPLACE vs PASTE vs MOVE
- **Do:** pick by intent: `PASTE` = INSERT a buffer at a point (after
  targetMarker or EOF — it never overwrites anything); `REPLACE` = SWAP a
  line-anchored span of an existing file with the buffer (edit-like region
  replacement WITHOUT an exact oldString match); `MOVE` = CUT a span from one
  file and INSERT it into another in one call. For a slot/region replacement
  use REPLACE (or a write-overwrite of the whole file) — NOT PASTE.
- **Why (evidence):** the 2026-09-24 slot-clobber incident
  (`.opencode/agent/agent_feedback.md`): an agent used PASTE-as-slot-replacement
  and clobbered the slot — PASTE is insert-only, so a two-step
  DELETE+PASTE composition leaves an intermediate state; REPLACE closes that
  gap atomically (one call, no intermediate state, perceptible report).
- **Ref:** the 2026-09-24 slot-clobber incident in agent_feedback; TODO #94
  problem statement (his priority.md "fuzzy matching of edit oldstring").
- **Keys:** slot clobber, PASTE insert-only, MOVE vs PASTE vs REPLACE, atomic replacement.
