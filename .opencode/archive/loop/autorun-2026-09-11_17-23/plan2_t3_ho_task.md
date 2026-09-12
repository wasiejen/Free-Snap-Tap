# TASK T3 — `compact_memory` tool completion (L2, approved: `proposals/approved/2026-09-11_compaction-lifecycle.md` L2)

FIRST read `AGENTS.md`, `agents_repo.md` (+ the repo parts it names as
needed), this file, the L2 + "Re-application directive" sections of the
approved proposal, and the maintainer's prototype
`.opencode/tools/compact_memory.ts` (57 lines — the WORKING shape).
MEDIUM task: extend the prototype with the budget + the COMPACT line. Do
NOT rewrite the tool from scratch — the shape (export form, arg names,
call shapes) is the maintainer's and stays.

## Goal

Complete the `compact_memory` custom tool per the approved design:
1. **Budget:** ≤2 compactions per session id (self + emergency COMBINED —
   the future T5 recovery hook will share this store). The tool REFUSES
   with a "hand over and start fresh" result note when exhausted (no
   compact call). Budget state must be PERSISTED to disk (a small state
   store — json or sqlite — under `.opencode/temp/`; your call on the
   mechanic, RECORD it in your summary) — in-memory-only is NOT
   acceptable. Increment on SUCCESS only (a failed compact does not
   consume budget).
2. **COMPACT line:** after a successful compaction the tool appends its
   own COMPACT line to `.opencode/temp/ctx.log` (in-process file append —
   the design explicitly allows it; never throws). Shape: match the T2
   line convention (`<stamp>[ <modelId>]…` — omit-when-empty fields);
   content per the design: `COMPACT` + session id + `tokens=<t>`
   `messages=<m>` + the PRE-compaction readout in parentheses
   (best-effort: if the pre-readout or model id is unavailable, omit that
   field, never throw — record what you could and could not obtain from
   the tool's `context`).
3. **Result note:** keep the prototype's shape — short note
   ("compacted; kept last N messages / T tokens") + the pointer to
   `.opencode\system_prompts\agent_readme_post_compaction.md` (the
   prototype's directive SENTENCE stays — it is a pointer, the content
   lives in the file). On budget refusal: the hand-over note instead.
4. **Never throws:** every error path returns a note (the prototype
   already does this — keep it).

## Do NOT touch

- `.opencode/plugin/ctx_watchdog.ts` and the probe's existing plugin
  checks (T5 adds the recovery hook to the plugin later).
- The role prompts (T4), `opencode.jsonc` (NEVER stage it), anything
  under `.opencode/proposals/maintainer/`, FST python code.
- The prototype's arg names (`keepTokens`/`keepMessages`/`sessionID`)
  and its `context.client.session.compact({path, body})` call shape.

## Probe extension (the probe host imports the tool file DIRECTLY —
type-stripping, the same way it loads the plugin; the tool file must load
that way)

New checks covering at least (fake client + fake shell, sandboxed like the
existing plugin checks):
1. The tool file imports and exposes `compact_memory`.
2. `execute` calls `session.compact` with the PASSED-THROUGH keep knobs
   (fake client captures the call; also the `context.sessionId` fallback
   when the `sessionID` arg is absent).
3. The COMPACT line is written after success (session id + params present;
   pre-readout field per its best-effort availability).
4. The budget allows 2 compactions and REFUSES the 3rd with the
   hand-over note (no compact call on the 3rd); the state file exists on
   DISK after the calls (persistence, not in-memory).
5. A failing `session.compact` returns an error note, never throws, and
   does NOT consume budget.
6. The success return contains the re-application file pointer; the
   refusal return contains the hand-over note.

## Definition of done

1. `node .opencode/plugin/probes/handover_probe.mjs` →
   `PROBE handover: N/N PASS`, exit 0 (N > 65, the new checks above green).
2. `& .\.venv\Scripts\python.exe -m pytest -q` → 451 passed + 1 known #10
   warning (no FST code touched).
3. `& .\.venv\Scripts\ruff.exe check --select F .` → 0.
4. ONE commit: the tool + the probe + the summary file. Record in your
   summary: the budget-store mechanic + its path, the final COMPACT line
   shape, and everything you verified about the tool `context` (what
   fields it provides in the probe / what you had to treat as
   best-effort). Follow the AGENTS.md commit routine (gauge check after
   commit; your loop-log START/DONE lines per the protocol).

## Approval boundary

Pre-approved by the approved proposal (meta-only: the custom tool +
probe; no observable FST change; no config edit; the ctx.log is the
maintainer's observation file). If you hit a genuine design fork the
proposal doesn't answer, pick the minimal option, RECORD it in your
summary, and flag it in `todo_inbox.md`.

## Worker

`worker_Q4_120K` (fresh session).
