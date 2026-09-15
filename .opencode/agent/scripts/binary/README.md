# scripts/binary — dense-content helpers for big binaries

Find strings in multi-10s-of-MB binaries WITHOUT reading the binary into
agent context. All scripts read the file, print a bounded text window, and
exit. Non-printable bytes render as `.`.

**exe resolution (all three):** `--exe <path>` flag > env `OPENCODE_EXE` >
host default `C:/Users/Wasiejen/AppData/Roaming/npm/node_modules/opencode-ai/bin/opencode.exe`.

| script | what it does | tested (2026-09-15, from repo root) |
|---|---|---|
| `binwin.cjs` | context window around up to 3 hits per needle (~200 before + 250 after) | `node .opencode/agent/scripts/binary/binwin.cjs "opencode.db"` → `scanned 179998248 bytes` + 1 hit window, exit 0 |
| `binhits.cjs` | ALL hit offsets for one needle (cap 60) + ~60-char context | `node .opencode/agent/scripts/binary/binhits.cjs "compaction"` → 4 `@offset:` lines + `TOTAL shown: 4`, exit 0 |
| `binoff.cjs` | raw window at an absolute byte offset | `node .opencode/agent/scripts/binary/binoff.cjs 108525017 60 200` → window text, exit 0 |

Typical flow: `binhits` (find offsets) → `binoff`/`binwin` (read the window).
Usage examples (one each):

```
node .opencode/agent/scripts/binary/binwin.cjs "compaction_delta"
node .opencode/agent/scripts/binary/binhits.cjs "opencode.db"
node .opencode/agent/scripts/binary/binoff.cjs 108525017            # 100 before, 1500 after
node .opencode/agent/scripts/binary/binoff.cjs 108525017 50 200 --exe C:/path/to.bin
```
