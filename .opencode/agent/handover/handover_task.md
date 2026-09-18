# Task spec — opencode-auto-resume Phase 1: feature-index map (A/B comparison run)

Workers: Run A = `worker_explorer_Q3_120K_mtp` · Run B (separate later launch, SAME spec)
= `worker_gemma_Q4_128K`. Your run's output filename is given in the launch
message — write the map to EXACTLY that path.

## Context (one line)
The maintainer copied an open-source opencode plugin (auto-resume of stalled
LLM sessions) into the scratchpad as reference material for building our own
plugins. This run builds a **feature-index map**: every README feature →
where it lives in `src/index.ts` (line range) + which test file covers it —
so later deep-dive sessions can be scoped by line range.

## Source — READ-ONLY, outside our repo (the "plugin repo")
Root: `C:/Users/Wasiejen/AppData/Local/Temp/opencode/opencode-auto-resume-master`
- `README.md` (30KB) — the feature docs; feature index #1.
- `src/index.ts` — 2767 lines (planner-measured) — the ENTIRE plugin, one
  monolith.
- `src/*.test.ts` — 28 test files, one per feature area; `src/test-utils.ts`
  shared helpers.
- `package.json` — Bun, single dep `@opencode-ai/plugin` (settled — do not
  re-verify).
- **NEVER execute anything from the plugin repo** (no bun/npm/node, no
  `bun test`, no build): it is a live-session-management plugin and has no
  node_modules — static analysis only.

## Goal
Map every README feature — all `###` sections under "What it does" (README
line 5 to line 258), plus "Recovery model" (line 269) and "Architecture"
(line 295) — to its implementation in `src/index.ts` + its test coverage.
README sections from "Installation" onward are OUT of scope.

## Definition of done (measurable)
1. **Map file** at the scratchpad path from the launch message, with:
   - `## Method` — the exact grep/scan commands you used for structure
     discovery (so the method is auditable and reproducible).
   - `## Structural skeleton` — the top-level structure of `src/index.ts`
     (section-banner comments, top-level const/class/function/export) with
     line numbers.
   - `## Feature index` — one entry per README feature:
     `### <feature name>` / what it does (1-2 lines, your words) /
     `where:` src/index.ts lines `<start>-<end>` / `test:` file name (or
     `none`) / `confidence:` `measured` or `guessed`.
   - Coverage: EVERY in-scope `###` feature section gets an entry (a
     `UNKNOWN` entry counts — see rule 4). The `####` sub-sections under
     "Streaming failure recovery" may fold into that one entry.
2. **Line ranges are verified**: for each `measured` entry the start line
   contains (or directly precedes) the named symbol/section — confirm with a
   targeted read before writing the entry. Never invent a range: if a feature
   is not found after a reasonable search, write `where: UNKNOWN` + the greps
   you tried (one line).
3. **Handover summary** in
   `.opencode/agent/handover/handover_task_to_planner.md`: executive summary —
   method, coverage count (mapped / measured / unknown), 3-5 notable
   findings (one line each, e.g. the state-machine name, the central tick /
   watch function), the scratchpad map path, the context-gauge line VERBATIM.
   Do NOT paste the full map into the handover — it stays in the scratchpad
   file.
4. **Commit** per the commit routine: stage NAMED paths only (the handover
   file — NEVER `git add -A`); subject names the run (e.g.
   "auto-resume feature-map Run A (explorer-mtp)").
   **NO TODO.md / todo_inbox.md entries in this task** — the map IS the
   deliverable (this OVERRIDES your per-finding TODO checkpoint; instead
   append map entries to the scratchpad file in batches as you go, so a dead
   session loses at most a few entries).

## Context discipline (binding)
- Read `README.md` in full (it IS the index — that is the point).
- NEVER read `src/index.ts` in full. Grep its structure first (record the
  commands in `## Method`); then targeted reads only around candidate feature
  locations (bounded ranges, e.g. 40-80 lines).
- Test files: case names only — `grep -n "describe\|it(" <file> | head -40`
  per file (or equivalent); never full test bodies.

## DO-NOT-touch
- The plugin repo (read-only — no writes/edits/execution of any kind).
- Our repo except the handover summary file: `.opencode/maintainer/**`,
  `.opencode/agent/prompts/**`, `handover_planner.md`, `TODO.md` /
  `todo_inbox.md` (none written by this task), `AGENTS.md`, `.git/**`.
