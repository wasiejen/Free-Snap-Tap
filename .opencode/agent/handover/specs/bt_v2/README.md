# specs/bt_v2/ — block_transfer v2 build wave

Purpose: pre-written task specs for the approved `proposals/approved/
2026-09-25_block_transfer-v2.md` build (parts A-I, waves 1+2), written
2026-09-26 by planner-20. Each spec = one focused worker unit, ordered
S1 -> S2 -> S3 -> S4; each leaves the repo green; ONE at a time
(serial slot; the launching planner copies the current spec into
`handover_task.md` + the loop folder before launch).
- `bt_v2_s1_anchor.md` — Part A: one exported pure `resolveAnchor` +
  precise prefix rule + teaching error taxonomy.
- `bt_v2_s2_refs_assembly.md` — Parts B+C: line-number refs, COPY
  list/text, APPEND mode.
- `bt_v2_s3_write_peek.md` — Parts D+E+F: WRITE mode, PEEK mode,
  feedback redesign complete, new probe section.
- `bt_v2_s4_map_lastwrite_description.md` — Parts G+H+I: MAP mode,
  `last_write` auto-buffer, description rework; the new-hire +
  held-out verification is PLANNER-side after this unit.
Queue order: S1 -> S2 -> S3 -> S4 (new-hire test last).
Status (2026-09-26, plan20): S1 LANDED `0d85a8c`; S2 LANDED `f5f888c`
(probe S15 108/109 re-pin ratified by the planner); S3 LANDED `8cc8819`
(probe 316/316; S15 115/263 v2 switch done per the curated item); S4
PENDING (next iteration stages it; the new-hire + held-out verification
is planner-side after S4).
What does NOT go here: worker summaries, NAP, non-bt-v2 specs.
