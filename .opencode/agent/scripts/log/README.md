# scripts/log — dense-content helpers for big log files

Print bounded context windows around needle lines in multi-MB logs WITHOUT
reading the log into agent context.

**log resolution:** env `OPENCODE_LOG` > host default
`C:/Users/Wasiejen/.local/share/opencode/log/opencode.log`.

| script | what it does | tested (2026-09-15, from repo root) |
|---|---|---|
| `logctx.cjs` | for each needle line: a +/-3-line window, each line truncated to 380 chars, hits capped | `node .opencode/agent/scripts/log/logctx.cjs` → `=== HIT at line 46904 (hit 1) ===` + `total "schema rejection" lines: 20 of 64193`, exit 0 |

Usage (one each):

```
node .opencode/agent/scripts/log/logctx.cjs                       # default needle "schema rejection", cap 20
node .opencode/agent/scripts/log/logctx.cjs "provider error" 5    # custom needle, cap 5
OPENCODE_LOG=C:/path/to.log node .opencode/agent/scripts/log/logctx.cjs ERROR
```

The `maxHits` cap (default 20) plus the per-line 380-char truncation keep the
output bounded even when a needle is common.
