# scripts/log — dense-content helpers for big log files

Print bounded context windows around needle lines in multi-MB logs WITHOUT
reading the log into agent context.

**log resolution:** env `OPENCODE_LOG` > host default
`C:/Users/Wasiejen/.local/share/opencode/log/opencode.log`.

| script | what it does | tested (from repo root) |
|---|---|---|
| `logctx.cjs` | for each needle line: a +/-3-line window, each line truncated to 380 chars, hits capped | 2026-09-15: `node .opencode/agent/scripts/log/logctx.cjs` → `=== HIT at line 46904 (hit 1) ===` + `total "schema rejection" lines: 20 of 64193`, exit 0 |
| `summarize_intercept.cjs` | turns the fuzzy-numword intercept log into a 6-section evidence summary (R4 flywheel: verdict counts, fuzzy-rejected d/gap, redundancy-mismatch verbatim, adder-form usage, out-of-sandbox by path prefix, per-session counts); generic — no hardcoded counts/session ids | 2026-09-23: `node .opencode/agent/scripts/log/tests/summarize_intercept.smoke.cjs` → fixture run byte-exact vs `tests/expected_summary.txt`, all checks passed, exit 0; real log → 6 sections, exit 0 |

Usage (one each):

```
node .opencode/agent/scripts/log/logctx.cjs                       # default needle "schema rejection", cap 20
node .opencode/agent/scripts/log/logctx.cjs "provider error" 5    # custom needle, cap 5
OPENCODE_LOG=C:/path/to.log node .opencode/agent/scripts/log/logctx.cjs ERROR

node .opencode/agent/scripts/log/summarize_intercept.cjs          # default .opencode/temp/intercept.log
node .opencode/agent/scripts/log/summarize_intercept.cjs <logfile>
```

The `maxHits` cap (default 20) plus the per-line 380-char truncation keep the
output bounded even when a needle is common.

`summarize_intercept.cjs` reads the R7 observer log (NOT the `OPENCODE_LOG`
host log) and never writes; its committed fixture + pinned smoke test live
under `tests/` (`intercept_fixture.log`, `expected_summary.txt`,
`summarize_intercept.smoke.cjs` — run the smoke with plain node, exit 0 iff
green).
