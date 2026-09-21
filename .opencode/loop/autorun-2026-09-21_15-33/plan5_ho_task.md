# Task spec — compact_memory rework, unit A (priority.md #1, TODO #70)

Worker: `worker_Q3S_160K` · Iteration: plan5 (looprun autorun-2026-09-21_15-33),
worker-6. Design source (his rulings): `.opencode/maintainer/priority.md` item #1
(lines 48-79) — READ it first; it BINDS. Build on `compact_memory.ts` as landed.

## Goal

Rework `.opencode/plugin/compact_memory.ts`: (A) providerID/modelID removed from
the exposed args — the summarizer model resolves from the root config's
`agent.compaction.model`, falling back to the compacting session's model;
(B) the `message` arg is queued to the compacted session as a direct prompt;
(C) dump-hook diagnostics: a DUMP-OK line on success + defensive stdio change.

## Verified facts (planner-measured at spec time — do NOT re-derive)

- Tool: `.opencode/plugin/compact_memory.ts` (654 lines; the v1 `summarize`
  path is the ACTIVE one on this host; the `compact` v2 branch stays as-is).
- Args today = 6 keys; the override pair is read at lines 521-534;
  `resolveModel` (line 415) does self = `c.extra.model` / cross = last
  `session.messages` entry — that function is the FALLBACK behavior to keep.
- `callSummarize` (line 373) requires providerID+modelID in the body; the
  keep-rejected retry, verified-success-only budget increment, COMPACT line,
  quant-class gate, and `preCompactionDump` (line 284,
  `execFileSync(..., { timeout: 60_000, stdio: "pipe" })`) all stay.
- Root config = `opencode.jsonc` (JSONC — `//` comments that may also appear
  INSIDE strings, e.g. URLs → a naive comment-strip corrupts; the parser must
  be string-state-aware). The live `agent.compaction` block is COMMENTED OUT
  today → the fallback path is the active one at present. Shape when set:
  `agent: { compaction: { model: "provider/model", temperature?: number } }`.
- Queued-prompt pattern (measured, `auto_resume.ts` line 357):
  `client.session.promptAsync({ path: { id }, body: { parts: [{ type: "text",
  text }] } })` — never awaited.
- Baselines at spec time: compact_memory smoke 47/47; probe 235/235;
  pytest 459+1w; ruff F=0.
- Branch: stay on the current checkout (verify `git branch -v`; do not switch).

## Changes (WHAT + end state; HOW is yours inside the DoD)

A. Params + resolution
- Args schema = EXACTLY 4 keys: sessionID, keepTokens, keepMessages, message.
  providerID/modelID removed (schema + read sites).
- New exported PURE function (probe-pinnable) resolving the summarizer pair:
  `resolveCompactionModel(configContent: string, fallback: { providerID:
  string; modelID: string }): { providerID: string; modelID: string; source:
  "config" | "fallback" }`. Rules: parse the content JSONC-safely (comment-
  aware, string-state-aware); `agent.compaction.model` = "provider/model" →
  split at the FIRST "/" (both halves non-empty — a missing "/" or empty half
  is malformed → fallback); absent file / unparseable / key missing /
  malformed → the fallback pair UNCHANGED, `source: "fallback"`.
- In the tool: read `opencode.jsonc` from the root (fall back to
  `opencode.json` if absent) → `resolveCompactionModel` with the existing
  `resolveModel` result as fallback → on an empty pair, refuse exactly as
  today (request not sent, no budget burned).
- Update the tool's description string (no override pair; summarizer = config
  compaction model when set, else the session's model).

B. message → queued prompt
- When `message` is non-empty: AFTER the compaction dispatch (the existing
  void path — no await anywhere), fire exactly ONE queued `promptAsync` to
  the compacted sessionID with text = the message. Fire-and-forget.
- `typeof promptAsync !== "function"` → no prompt sent; the dispatch response
  gains a WARNING line saying the message was not queued.
- The dispatch response states the message was queued for the target session
  (delivered on its resume).

C. Dump diagnostics
- On success: append a `DUMP-OK <sid> <relfile> <ms>` line to
  `.opencode/temp/ctx.log` (same local-stamp prefix style as the DUMP-FAIL
  line; relfile = the corpus-relative dump path, e.g.
  `compaction_dumps/ses_..._c0.md`; ms = elapsed milliseconds).
- `preCompactionDump` spawn: `stdio: "pipe"` → `"ignore"` (removes the
  pipe-buffer deadlock failure mode — the ETIMEDOUT evidence: hung child
  in-host, script runs 0.12 s standalone).
- The DUMP-FAIL line format and the 60 s timeout are UNCHANGED.

## Definition of done

- All of A/B/C landed; `compact_memory.smoke.mjs` re-pinned (4-key args;
  config-resolution cases: config set → config pair in body, config
  commented-out → fallback, malformed → fallback; the old override case
  removed; message → promptAsync pins incl. the no-promptAsync WARNING;
  DUMP-OK line pin; stdio-ignore pin) — ALL PASS.
- probe: APPEND a new section pinning the exported resolver (config present /
  absent / malformed / comment+URL-safe parse) + the DUMP-OK format;
  update the existing compact_memory pins that changed (4-key args);
  header annotation updated; the probe total self-consistent (run + verify).
- Full standard gate green: probe (new total), pytest 459+1w, ruff F=0,
  ALL 10 smokes green (auto_resume stays 53/53 — you do not touch it).
- ONE commit: code + smoke + probe + a one-line TODO #70 status note (append
  "unit A landed, commit <hash>" to its status line — do not reword the
  entry) + your handover summary. Handover to
  `.opencode/agent/handover/handover_task_to_planner.md`.

## DO-NOT-TOUCH

`.opencode/maintainer/**`, the live `opencode.jsonc` (READ-ONLY — never
write/modify it; the config is only ever read), `AGENTS.md`,
`.opencode/plugin/auto_resume.ts`, `dump_session.cjs`, the budget store,
other smokes / probe sections, and the maintainer's `--comment` block inside
compact_memory.ts (lines 481-504). No new dependencies.

## Approval boundary

Pre-approved (his priority.md #1 rulings): the param removal, the config
resolution order, the queued message, the DUMP-OK line, the stdio change.
Anything else is out of scope. If a verified fact above conflicts with the
reality you measure, STOP and report the discrepancy in your handover
instead of deciding.
