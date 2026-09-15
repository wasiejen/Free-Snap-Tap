# grep_snippets.md — ready-made, output-limited navigation commands

Copy-paste recipes for finding strings in big files/folders WITHOUT flooding
the agent context. Every command is output-limited (`head`/caps) — adjust the
limits, never remove them. Shell: Git-Bash.

## 1. Maintainer-marker sweep (READY-MADE — do not re-derive)

Copied from the planner prompt §maintainer calls/decisions (the canonical
marker table lives there). `--main` matches `--maintainer` too, `--defer`
matches `--deferred` too; the filter removes known non-live references, not
his live files:

```bash
grep -rn -- "--main\|--now\|--todo\|--defer\|--wip\|--comment" \
  --include="*.md" .opencode/ TODO.md README.md WIKI.md 2>/dev/null \
  | grep -v "_past_priorities\|/done/\|agent_feedback\|nap_direct\|archive/"
```

Run at session start (and after any maintainer touch).

## 2. Count before you look

Always know the hit count first — it tells you whether a bounded read is
safe or you need the scripts in this folder:

```bash
grep -c "pattern" bigfile.txt                 # how many lines match
grep -rc "pattern" .opencode/ | head -30      # per-file counts across a folder
```

## 3. Head-limited content search (files)

```bash
grep -n "pattern" bigfile.txt | head -30      # first 30 matching lines, numbered
grep -n -m 30 "pattern" bigfile.txt           # same, stops at 30 (faster on huge files)
```

## 4. Window around hits (files)

Context lines with a hard cap on total output:

```bash
grep -n -B2 -A5 "pattern" bigfile.txt | head -40
```

## 5. Folder sweep: file list first, content second

```bash
grep -rl "pattern" src/ | head -20            # which files contain it
grep -c "pattern" $(grep -rl "pattern" src/ | head -5)   # then count in the top 5
```

## 6. Section map of a big Markdown/TS file

Locate structure without reading bodies (anchor lines instead of full reads):

```bash
grep -n "^## " bigfile.md | head -40          # headings + line numbers
grep -n "^function\|^export " bigfile.ts | head -30
```

## 7. Live log tail (bounded)

Never `cat` a growing log — read its recent tail only:

```bash
tail -n 200 /c/Users/Wasiejen/.local/share/opencode/log/opencode.log | grep -n "ERROR" | head -20
```

(For needle-context windows in big logs, prefer `log/logctx.cjs`.)

## 8. Dense/unknown content → use the scripts, not grep

- big binaries (tens of MB): `binary/binwin.cjs`, `binhits.cjs`, `binoff.cjs`
- the opencode DB (GBs): `db/probe_schema.cjs`, `db/sesdata.cjs`, ...
- multi-MB logs: `log/logctx.cjs`

Grep on those files is how the context swamp happens (AGENTS.md Patterns 2 & 5).
