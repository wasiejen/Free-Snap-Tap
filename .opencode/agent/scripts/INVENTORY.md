# Scratchpad inventory (machine-generated 2026-09-15)

Source: `C:/Users/Wasiejen/AppData/Local/Temp/opencode/` — the cross-session scratchpad
the helper-script collection was curated from. **Originals are NOT deleted**
(maintainer call). Purpose = first header-comment line of the file, verbatim
(trimmed to 100 chars); `(no header comment)` = no comment in the first 5 lines.

## Promoted into the repo (curated + generalized + tested)

| script | repo home |
|---|---|
| binwin.cjs | .opencode/agent/scripts/binary/ |
| binoff.cjs | .opencode/agent/scripts/binary/ |
| binhits.cjs | .opencode/agent/scripts/binary/ |
| sesinspect.cjs | .opencode/agent/scripts/db/ |
| sesdata.cjs | .opencode/agent/scripts/db/ |
| compact_dir.cjs | .opencode/agent/scripts/db/ |
| probe_schema.cjs | .opencode/agent/scripts/db/ |
| logctx.cjs | .opencode/agent/scripts/log/ |
| numword.cjs | .opencode/agent/scripts/numword/ |
| w2n.py | .opencode/agent/scripts/numword/ |

Not promoted (dedup/superseded): `findbin.ps1` (PowerShell twin of binwin.cjs),
`find_ctx*.mjs` (binary context one-shots superseded by binary/), `dump_session.py`
(python twin of db/dump_session.cjs).

## Category guide (name-based, for the one-shots)

- `db*`, `peek_*`, `inspect_*`, `probe*`, `tokens_probe.py` — one-shot opencode DB probes (read-only).
- `nap*`, `close*`, `curate_*`, `todo_*`, `verdict.js`, `apply_*` — one-shot handover/TODO/proposal file edits.
- `bunproof_*`, `*smoke*` — one-shot plugin verification (compact_memory, block_transfer, ctx_gauge, loop_log).
- `binwin/binoff/binhits.cjs`, `find_ctx*.mjs`, `findbin.ps1` — binary string search (curated into binary/).
- `sesinspect/sesdata/compact_dir/probe_schema.cjs` — DB session inspectors (curated into db/).
- `logctx.cjs` — log context (curated into log/).
- `map.py`, `verify_map.cjs`, `exec_renames.cjs`, `restructure_paths.ps1` — one-shot rename/convert batches.
- `gauge_*`, `s8_math.mjs`, `verify_explorer*.mjs`, `windown.mjs`, `old_probe.mjs`, `probe_head.mjs` — gauge/probe scratch (large ones: old_probe.mjs 120KB, probe_head.mjs 46KB).

## All script files

| file | size (B) | purpose (first header comment) |
|---|---|---|
| apply_agents_md.py | 3947 | (no header comment) |
| apply_fixes.py | 2146 | (no header comment) |
| apply_fixes2.py | 2234 | (no header comment) |
| binhits.cjs | 598 | // List ALL hit offsets (+ a tiny 60-char context) for one needle. |
| binoff.cjs | 453 | // Offset-window extractor for the opencode binary. |
| binwin.cjs | 904 | // Window-extractor: find strings in the opencode binary, print a small |
| bt_sandbox_smoke.mjs | 12918 | // Iter-10 T1 verification: block_transfer.ts sandbox guard + description rewrite |
| bt_smoke.mjs | 2975 | // Iter-4 verification: block_transfer.ts tool() translation |
| bun_host_check.mjs | 605 | // bun 1.4.2 host-proxy check (TODO.md #30, re-ruling 2026-09-10): import the |
| bunproof_api.mjs | 4687 | // bun:sqlite API verification (TODO #37) — runs under SYSTEM bun 1.4.2. |
| bunproof_diag.mjs | 1254 | (no header comment) |
| bunproof_live.mjs | 871 | // HOST PROOF 2 (TODO #37): run the gauge CORE under SYSTEM bun 1.4.2 against |
| bunproof_opts.mjs | 2525 | (no header comment) |
| bunproof_wal.mjs | 1600 | // WAL + readonly probe under system bun 1.4.2 — reads the LIVE db (read-only, |
| check_report.py | 1811 | (no header comment) |
| close11.cjs | 2038 | // --- TODO.md: condense the #11 block + fix the maintainer-calls item |
| close9.js | 2884 | (no header comment) |
| close_batch.cjs | 1400 | (no header comment) |
| close_proposals.cjs | 4266 | (no header comment) |
| cm_v2_smoke.mjs | 4213 | // v2 smoke: the no-client HTTP-fallback path of compact_memory.ts |
| compact_dir.cjs | 1552 | // Read-only: dump the compaction summary + reload directive for a session. |
| compaudit.cjs | 1025 | // Read-only: compaction parts + user-message audit for the test session. |
| cov_summary.py | 632 | (no header comment) |
| ctx_gauge_smoke.mjs | 2301 | // T2 smoke (iter-10+1 rescue, the iter-4 pattern): ctx_gauge tool |
| ctx_lines.py | 775 | (no header comment) |
| curate_records.js | 1553 | (no header comment) |
| curate_todo.js | 3128 | (no header comment) |
| db_check.mjs | 1462 | // one-shot read-only: recent sessions + their last finished-step token totals |
| db_peek.py | 1294 | (no header comment) |
| db_probe.py | 888 | (no header comment) |
| db_repro.py | 1745 | # exact old query |
| db_schema.py | 658 | (no header comment) |
| dbprobe.mjs | 962 | (no header comment) |
| dbprobe2.mjs | 674 | (no header comment) |
| dbprobe3.mjs | 645 | (no header comment) |
| dbprobe4.mjs | 745 | (no header comment) |
| dbprobe5.mjs | 1106 | (no header comment) |
| dbprobe6.mjs | 784 | (no header comment) |
| dbprobe7.mjs | 912 | (no header comment) |
| directive_probe.mjs | 1702 | (no header comment) |
| dump_session.py | 1251 | (no header comment) |
| electrondet.js | 764 | (no header comment) |
| exec_renames.cjs | 2183 | // Execute Part A: git mv for every dense name under done/ and archive/. |
| find_ctx.mjs | 537 | (no header comment) |
| find_ctx2.mjs | 543 | (no header comment) |
| find_ctx3.mjs | 602 | (no header comment) |
| findbin.ps1 | 554 | (no header comment) |
| fix_label.mjs | 489 | (no header comment) |
| gauge_check.mjs | 1286 | // Exact replica of retired peek.py window/pct math (lines 26-28 of peek.py): |
| gauge_scratch.mjs | 2939 | // scratch: node:sqlite behavior verification |
| handover-check.js | 16903 | // .opencode/plugin/handover.ts |
| inspect_epoch.py | 885 | (no header comment) |
| inspect_msg.py | 614 | (no header comment) |
| inspect_parts.py | 554 | (no header comment) |
| inspect_schema.py | 352 | (no header comment) |
| inspect_sess.py | 302 | (no header comment) |
| inspect_step.py | 781 | (no header comment) |
| knowledge_add.cjs | 1285 | (no header comment) |
| listdirs.cjs | 654 | (no header comment) |
| logctx.cjs | 698 | // Read-only: print context around every "schema rejection" line in the opencode log. |
| loop_log_smoke.mjs | 8146 | // T3 smoke (iter-13, the loop-tool-batch part 3): the loop_log tool. |
| map.py | 1604 | (no header comment) |
| msgparts.cjs | 611 | // Read-only: print text parts of one message (compaction summary directive check). |
| nap2.cjs | 2344 | (no header comment) |
| nap3.cjs | 1578 | (no header comment) |
| nap4.cjs | 2431 | (no header comment) |
| nap_archive.js | 1486 | // 1) collapse the double blank before the 09-13 ses_f652 section |
| nap_compress.cjs | 3240 | (no header comment) |
| nap_fix.cjs | 982 | (no header comment) |
| nap_fix2.cjs | 878 | (no header comment) |
| nap_rewrite.js | 7710 | // NAP Part-2 Phase B — rewrite the NAP header-line driven (no-loss rule). |
| norm_eol.mjs | 1375 | (no header comment) |
| old_probe.mjs | 119018 | // ============================================================================= |
| parse_plugin_log.py | 1923 | (no header comment) |
| peek_db.py | 302 | (no header comment) |
| peek_dump.py | 1120 | # latest message per session for a few sessions |
| peek_events.py | 462 | (no header comment) |
| peek_events2.py | 871 | (no header comment) |
| peek_full.py | 1558 | (no header comment) |
| peek_keys.py | 1121 | (no header comment) |
| peek_meta.py | 1654 | (no header comment) |
| peek_models.py | 785 | (no header comment) |
| peek_msg.py | 697 | (no header comment) |
| peek_schema.py | 263 | (no header comment) |
| peek_search.py | 1162 | (no header comment) |
| peek_sessions.py | 1006 | (no header comment) |
| peek_token_total.py | 531 | (no header comment) |
| plugin_tally.py | 3871 | (no header comment) |
| plugin_tally2.py | 1387 | (no header comment) |
| priority_hunk.cjs | 1035 | (no header comment) |
| probe10.py | 1157 | (no header comment) |
| probe9.py | 1472 | (no header comment) |
| probe_chatmsg.mjs | 2451 | // one-shot probe: exercise onChatMessage of handover_v2.4.ts v2.4.1 |
| probe_fix.cjs | 2484 | // One-shot probe edits for the compact_memory bugfix (2026-09-12). |
| probe_fix99.cjs | 2396 | // Check-99 update: the failing-RPC path now REFUSES to send (no resolvable |
| probe_head.mjs | 45994 | // ============================================================================= |
| probe_outline.cjs | 522 | (no header comment) |
| probe_pluginlog.py | 1837 | (no header comment) |
| probe_schema.cjs | 671 | // Bounded schema probe (read-only). Columns + counts only, no data. |
| probe_shape.cjs | 1295 | // Bounded probe: part.data JSON shape + message.data keys. No bulk data. |
| probe_shape2.cjs | 1511 | // Bounded probe 2: message data key census + tool/reasoning part samples. |
| pw_test.mjs | 1052 | (no header comment) |
| qc_dump.mjs | 667 | (no header comment) |
| qc_fix87.mjs | 2797 | (no header comment) |
| qc_fixscript.mjs | 681 | // the comment line in the new block must carry the SAME digits the probe file |
| reimport_test.mjs | 563 | (no header comment) |
| restructure_paths.ps1 | 2777 | # Part 1 restructure: live-reference path updates |
| rewrite_smoke_expected.cjs | 1008 | // Rewrite the smoke's expected readout strings from machine-computed values |
| rulings.cjs | 2546 | (no header comment) |
| s8_math.mjs | 1295 | // one-shot: compute exact fixture token rows + expected byte-exact readouts for the S8 ladder check |
| scan.ps1 | 951 | (no header comment) |
| scan.py | 1455 | (no header comment) |
| scan2.py | 1299 | (no header comment) |
| scan_dod2.cjs | 1758 | // DoD-2 scan: regex \b26\d{4}\b over content of the spec'd files + names |
| sesdata.cjs | 1034 | // Read-only: message data JSON slim dump for one session. |
| sesinspect.cjs | 1249 | // Read-only DB inspector for the live-test session (compact_memory debug). |
| shape_probe.mjs | 698 | (no header comment) |
| shape_probe2.mjs | 512 | (no header comment) |
| smoke_fix.cjs | 2095 | // Remaining smoke edits for the compact_memory bugfix. Match-count-verified. |
| spawn_probe.mjs | 840 | // Probe: can both runtimes spawn sqlite3.exe with an args-array (no shell)? |
| start_line.mjs | 601 | (no header comment) |
| t5_smoke.mjs | 4041 | // T5 smoke test — NOT the probe; a scratch check for the recovery plugin. |
| tally_seg.py | 1010 | (no header comment) |
| test_import.mjs | 384 | (no header comment) |
| todo57.cjs | 1675 | ## 57. Incident: worker killed mid-task by provider model unload (fst-rebind-repeat first attempt, 2 |
| todo_append.cjs | 3607 | (no header comment) |
| todo_split_part3.py | 3614 | (no header comment) |
| tokens_probe.py | 323 | (no header comment) |
| toolpart_flags.cjs | 906 | // Read-only: (1) full data of the compact_memory tool part for a session; |
| ts_label.mjs | 317 | (no header comment) |
| verdict.js | 1763 | (no header comment) |
| verify_explorer.mjs | 1395 | // scratchpad: verify explorer-session token readout (planner verification) |
| verify_explorer2.mjs | 744 | // scratchpad: token trajectory of the explorer session (planner verification) |
| verify_map.cjs | 3732 | // Verify + compute the Part-A rename mapping from the conversion rules. |
| verify_part3.py | 3812 | (no header comment) |
| verify_split.mjs | 2780 | (no header comment) |
| verify_triage.py | 13665 | (no header comment) |
| verify_wheel.mjs | 693 | (no header comment) |
| warn_lines.mjs | 1090 | (no header comment) |
| windown.mjs | 1755 | (no header comment) |

## Subdirectories

- agent_test/
- cm_v2_smoke_sandbox/
- compact_memory/
- directive_sbx_2041449606/
- qc_smoke/
- rc_smoke/
- rg/

## Non-script files

| AGENTS.md.next | 12559 | (non-script) |
| TODO.md.bak | 66553 | (non-script) |
| agent_feedback_entry.md | 3149 | (non-script) |
| archive_names.txt | 102 | (non-script) |
| baseline_ids.txt | 176 | (non-script) |
| compact_memory_HEAD.ts | 9590 | (non-script) |
| compact_new_body.txt | 9013 | (non-script) |
| cov_missing.txt | 1007 | (non-script) |
| cross_session_compaction_summary.md | 8533 | (non-script) |
| electrondet_out.txt | 27 | (non-script) |
| final_arith.txt | 65 | (non-script) |
| fst_evidence.txt | 6791 | (non-script) |
| g1.sql | 252 | (non-script) |
| g2.sql | 369 | (non-script) |
| g3.sql | 36 | (non-script) |
| g4.sql | 382 | (non-script) |
| g5.sql | 658 | (non-script) |
| head_count.txt | 53 | (non-script) |
| inbox_orig.txt | 2664 | (non-script) |
| live_prompt_final.md | 4983 | (non-script) |
| live_prompt_final2.md | 5009 | (non-script) |
| live_prompt_new.md | 5010 | (non-script) |
| loop_log_opencode_test.md | 9471 | (non-script) |
| nap_2nd_exchange.txt | 5424 | (non-script) |
| nap_append.sh | 5167 | (non-script) |
| nap_chunk3.md | 9854 | (non-script) |
| nap_chunk4.md | 24049 | (non-script) |
| nap_line_data.tsv | 3723 | (non-script) |
| nap_line_data_prev.tsv | 2721 | (non-script) |
| nap_newsection.txt | 4751 | (non-script) |
| nap_part2_lines.md | 35959 | (non-script) |
| nap_sections.txt | 4895 | (non-script) |
| orig_agents_repo.md | 13312 | (non-script) |
| out.txt | 324805 | (non-script) |
| p05_probe.txt | 31 | (non-script) |
| p05_probe2.txt | 23 | (non-script) |
| probe_counts.txt | 56 | (non-script) |
| qc87_actual.txt | 922 | (non-script) |
| run_facts.txt | 86 | (non-script) |
| summary_new.md | 9582 | (non-script) |
| todo_entry_dump.md | 1964 | (non-script) |
| todo_records.md.bak | 7530 | (non-script) |
| ver.err | 0 | (non-script) |
| ver.txt | 2 | (non-script) |
| work_run.txt | 5633 | (non-script) |
