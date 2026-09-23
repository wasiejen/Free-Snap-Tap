# #78 scoping — dump completeness (READ-ONLY findings, plan11)

Worker: explore (research/audit), session ses_f317d80c2ffeMGup4T9z5IvUs2, 2026-09-23.
All DB access via the curated readOnly helpers + dump script (LIVE DB never written).
All scratch dumps went to `.opencode/archive/sessions/scratch_78/…` and were deleted before close.

## 1. Exclusion list (code) — single-session FULL mode of `dump_session.cjs`

Part handling lives in `fullBody`, the per-part loop at L161–176 (parses each part's
`data` at L162):

| part `type` | treatment in full mode | line refs |
|---|---|---|
| `text` (with string `text`) | EMITTED — verbatim, no cap | L164–166 |
| `reasoning` (with string `text`) | EMITTED — verbatim, no cap | L167–169 |
| `tool` | PARTIALLY EMITTED — header only: tool name, `callID`, `state.status`. **`state.input` and `state.output` (args + results) DROPPED — no case renders them** | L170–172 |
| `text`/`reasoning` whose `text` is NOT a string | falls into catch-all → JSON truncated to 400 chars | guards L164/L167 → L173–174 |
| every other type (`step-start`, `step-finish`, `patch`, `file`, `retry`, …) | DROPPED beyond a 400-char JSON truncation — NOT raw | L173–174 |
| unparseable part data | DROPPED — only `part <id> (unparsed)` marker | L162–163 |

Types actually observed in the DB (measured in §2): text, reasoning, tool, step-start,
step-finish, patch.

Message/session level:
- message header line (id, role, agent, model, ts): L149–155
- meta line (mode/summary/finish/error/tokens): JSON truncated to **600** chars: L156–159
- message with no parts: `(no parts)` placeholder: L177
- orphan parts (no `message_id`): collected L188–191, DROPPED from body — only a
  `# orphan parts: N` count line: L205 (0 orphans in both measured sessions)
- session header (title/agent/model/parent/created/updated/compacting/archived/tokens):
  L124–134; `# messages: N parts: M` count: L194; `# dumped: <ts> mode=…`: L195

`--all` / slim vs full (compact table):

| aspect | slim (`--all` default: L110, L233) | full (single-session — ALWAYS full: L221; or `--all --full`) |
|---|---|---|
| per message | one line: `<ts> | {role,mode,agent,summary,finish,error,tokens,modelID,providerID}` (key list L139) | header (L149–155) + meta (L156–159) + every part (L161–176) |
| truncations | error ≤300 (L141), tokens ≤200 (L142), whole line ≤420 (L143) | unknown part types ≤400 (L174), meta ≤600 (L159) |
| parts | ALL DROPPED (never rendered) | rendered per the table above (fidelity varies by type) |
| user-message `summary` (attachment diffs) | included, but inside the 420-char line cap | included in meta, ≤600 chars — still truncated |
| `--out <relpath>` | not allowed with `--all` (L104) | single-session only; writes OUT_DIR/<relpath> (L213) |

## 2. Empirical check

### 2a. His example: `ses_f5aefe9e1ffemgTiq9GELiqaGL`
- Old on-disk corpus file (tracked): `# dumped: 2026-09-15T17:36:43.792Z  mode=slim`
  (file L9), `# messages: 31  parts: 141` (L8). Body has **0 part markers** (grep count
  0) — only one slim metadata line per message. All 141 parts (text, reasoning, tool,
  …) are absent from the file. The maintainer's complaint matches the file as it sits
  on disk.
- Fresh re-dump with the CURRENT script (single-session = full mode):
  `messages=31 parts=141 bytes=202340` → scratch_78/check.md (deleted after).
  Part-type breakdown of the fresh dump: **tool=30, step-start=30, reasoning=30,
  step-finish=29, text=16, patch=6** — sums to 141 = the DB part count; 0 orphans.
- `sesdata.cjs` for the same sid: 31 messages, slim metadata lines only — it queries
  the message table only (its L18), so it provides NO part coverage at all by design.
- **Verdict: the complaint is STALE with respect to the current script.** The on-disk
  file is a pre-2026-09-21 slim backfill that predates the full-detail renderer. The
  CURRENT script's single-session mode now emits this session's 30 reasoning parts
  verbatim, all 16 text parts verbatim, tool headers, step markers, and (400-char)
  patches — i.e. it includes what the old file lacks (100% of the 141 DB parts appear).
  Residual gaps remain: tool input/output and any >400-char non-text part body are
  still not raw (§1, §4).

### 2b. Recent session with reasoning parts: `ses_f31a5dee5ffe1DIBxZzEDZF8aF`
("autorun-2026-09-21_15-33 planner-10"; picked from the sesinspect no-arg most-recent-10
list)
- Fresh full dump: `messages=58 parts=263 bytes=154652` → scratch_78/b.md (deleted after).
  Part types: **tool=62, step-start=57, step-finish=57, reasoning=57, text=30** — sums to
  263; 0 orphans.
- `sesdata.cjs`: 58 messages, slim lines only (no parts — same design as above).
- Same verdict as 2a: full mode covers all parts; 57 reasoning parts verbatim; tool
  state and non-text bodies truncated (≤400), not raw.

## 3. Timeout behavior (measured)

- Fixed timeout at the hook call site: **60_000 ms (60 s)** — `compact_memory.ts` L359:
  `execFileSync(resolveNodeExe(), [scriptPath, sessionID, "--out", name],
  { timeout: 60_000, stdio: "ignore" })`; function L345, call site L741,
  `execFileSync` import L67.
- Measured wall-time of a single-session dump (node one-liner, `Date.now()` before/after
  `execFileSync` of the dump script, `--out scratch_78/…`; both files deleted after):

| session | msgs | wall time |
|---|---|---|
| `ses_f318f0d77ffer6kIwqiNvE1xau` — SMALL | 28 | **64 ms** |
| `ses_f33f1eb98ffeFvrnTdmTzmyE2x` — LARGE (most messages among the 10 most recently updated, per the sesinspect list) | 84 | **87 ms** |

- Scaling: the 84-msg session is ~3× the small one but only 87/64 ≈ **1.36×** the time —
  wall time is dominated by the child-node spawn (~60 ms), dump work itself is a near-flat
  tens of ms. Linear extrapolation: a session 10× the 84-msg size would still be well
  under a second.
- **Can a ~90 %-size session exceed the 60 s hook timeout? NO, on measured evidence.**
  87 ms is **0.145 %** of the 60 s budget (~690× headroom at the largest recent session).
  The live `DUMP-FAIL … spawnSync node ETIMEDOUT` on a ~90 % session (#78 evidence #2)
  therefore cannot be explained by dump duration: it points to a **spawn-level stall**
  (node cold start / OS lock) — a stall that neither dump size nor the fixed budget
  explains in the normal case. The observation "the timeout does not scale with session
  size" holds because actual dump cost is O(100 ms) at every size measured; the
  fixed 60 s is a constant ceiling, not a size-proportional one.
- Caveat: 84 msgs is the largest among the 10 most recently updated sessions (bounded
  choice per spec), not proven to be the largest in the whole DB.

## 4. Raw-JSON mode

**NO** — no current mode dumps the parts as raw JSON as-is:
- full mode is markdown rendering: non-text part types are JSON-stringified then
  truncated to 400 chars (L173–174); tool `state.input`/`state.output` are never emitted
  (L170–172); meta is capped at 600 (L159); even slim lines are capped at 420 (L143).
- `--all` slim/full reuse the same per-session renderers (L233).
- Closest existing thing: **`sesdata.cjs`** — emits one **slim JSON line per message**
  (9 keys selected from the message `data` column, L24; error ≤300, L25; line ≤420,
  L26). It omits the entire `part` table (never queried, L18): all text/reasoning/tool/
  step/patch content, and it is a lossy projection of the message row, not the raw row.
- Conclusion: "dump the DB parts as-is" requires a NEW mode (see §5); nothing current
  writes the raw part `data` JSON.

## 5. Recommendation (ranked, scoping only — no implementation)

Aligned with the maintainer's lean ("dump raw as it is"; markdown filtering on demand):

1. **Add a `--json` raw mode to `dump_session.cjs`** — emit the session row and every
   message/part `data` value as raw JSON, unfiltered and uncapped (structure preserved).
   File: `.opencode/agent/scripts/db/dump_session.cjs` (+ its header doc). Effort: **S**
   (a new render path reusing the existing queries L114–121). Open decision (maintainer's
   call): should raw JSON be the default for the pre-compaction hook?
2. **Fix the hook timeout / diagnose the stall** in `compact_memory.ts` (L359):
   (a) raise the fixed 60 s as cheap insurance, and/or (b) add a spawn diagnostic
   (log spawn start vs child exit; `stdio: "ignore"` currently swallows the child's
   stderr, so a stall leaves no trace). Effort: **S–M**. Measured need is <0.1 s, so a
   raise alone is nearly free; the diagnostic is the higher-value half because the
   observed ETIMEDOUT is a spawn stall, not a budget exhaustion.
3. **Keep markdown, but make full mode lossless** — emit tool `state.input`/
   `state.output` verbatim and remove the 400/600 caps for known part types.
   File: `dump_session.cjs` `fullBody` (L161–176). Effort: **S**. Fits the lean less well
   (markdown is still a projection) — take it only if the raw-JSON mode is declined.
4. (Companion, separate task) **on-demand markdown filter script** that consumes a raw
   JSON dump ("filtering tool calls = a script concern on demand"). Effort: **S**, no
   existing file.

Ranking: 1 > 2 > 3 (with 4 later). Option 1 is the direct implementation of the
maintainer's lean; option 2 is cheap insurance + root-cause tracing of the DUMP-FAIL;
option 3 is the fallback if JSON mode is rejected.

## Close-out notes

- Pre-existing tree dirt at baseline (NOT created by this task — present before my
  first command): `M .opencode/loop/…/loop_log.md`, `M .opencode/maintainer/ideas/ideas.md`,
  `D .opencode/proposals/2026-09-23_spawned-successor-inherit-deactivate.md`
  (+ its moved copy untracked), `?? plan11_ho_task.md`, `?? .opencode/maintainer/inbox_planner/2026-09-23_15-46.md`.
- This task's only new files: this findings file + the handover summary.
- Post-scratch-deletion `git status --short` (no `scratch_78` residue, no corpus edits):
  see handover summary for the final close-out status after both files are written.
- Deliberately not done: no `--all` backfill run, no test/smoke/probe, no edits to any
  tracked file, no raw SQL against the live DB.
