# HANDOVER — TODO #80 continuation (worker-2, ses_f371e0e23ffe0eza71uD5qWy7K)

Status: DONE — implementation landed, smoke + gates run, one commit (hash
below, recorded post-commit in this same file edit cycle — the commit
routines note stands: planner records the hash in a follow-up if it is not
here yet; see "Commit" line).

## What changed (all in the committed tree, branch `opencode_test`)

`.opencode/plugin/deactivated/auto_resume.ts` (stays deactivated — never
added to config):
- **Change 1 — agent retention:** `firstUserAgent(msgs)` (first user
  message's non-empty string `agent` field; null when absent) +
  `resolveInjectAgent(sid, w)` (planner-scoped → `PLANNER_AGENT_ID` with no
  fetch; else watch-cached `userAgent` — undefined = fetch once, null =
  resolved absent; resolved-null / failed fetch → null + one
  `agent-omit= sid=… no user agent field` line). `Watch.userAgent?: string |
  null` added. Both injected promptAsync bodies now carry the resolved
  agent: unit 2 `sendSelfCompact` and unit 4 `routeScopedIdle` continue
  branch (`body.agent = agent`, only when non-null). `routeScopedIdle`
  caches `w.userAgent = firstUserAgent(msgs)` from its existing messages
  fetch (one round trip). Plus the `scope= planner|none sid=…` verdict log
  line (attribution only — no behavior change).
- **Change 2 — recovery-cap semantics:** module state `pendingInject`
  Map (sid → epoch) + `PENDING_INJECT_TTL = 120_000`. Unit 4's continue
  send marks `pendingInject.set(sid, Date.now())` after a successful send.
  The `armEvent` busy branch: a busy within the TTL of a pending mark is
  the injected turn itself → `arm= sid=… injected`, the mark is consumed,
  and `recoveryCount` is NOT reset; a real new busy resets the cap (cap
  stays 2). This is the cap-unreachability root fix (the 9×
  `recovery= attempt=1` repetition in the live log).
- **Change 4 — surface= version ID:** `codeVersion()` (8-char sha256
  prefix of the running source via `import.meta.url`; fail-safe
  "unknown") — the `surface=` line now starts `surface= v=<8hex> …`,
  pinning the running code state in the next incident (H2 testability).
- **Change 3 — verdict (b):** no forced code fix for the scope anomaly —
  see "Item-3 verdict" below.

`.opencode/plugin/tests/auto_resume.smoke.mjs`:
- Change 0: import path → `.opencode/plugin/deactivated/auto_resume.ts`
  (the red ERR_MODULE_NOT_FOUND baseline, confirmed by running before
  editing).
- Re-derived the u4 classifiers (CONTINUE sends now carry agent=planner):
  `contSends` by the locked continue text, `spawnSends` by
  MARK-prefix + agent.
- 13 new checks: surface `v=` 8-hex pin; batch-A continue sends carry
  explicit `agent=planner_Q3S_160K`; cap semantics (real busy → attempt 1;
  injected busy → no reset → attempt 2; second injected busy → cap
  exhausted, no attempt 3, restart spawn; real busy → cap reset, attempt 1
  re-issued; exactly 2 `arm= … injected` lines); agent-retention section
  (fresh u2ag client: scoped send → planner agent + ratio text; plain send
  with first-user agent → `worker_Q3S_160K`; plain send without → NO agent
  key + `agent-omit=` line; unit-4 routes after the sends: stop / scope=
  none ×2 / no extra sends).
- Strengthened the ses_u4_plain check (now pins `scope= none sid=ses_u4_plain`).
- New sids added to the live-log isolation list.

`TODO.md` #80 status line → "implementation LANDED (worker commit — the
planner records the hash in a follow-up); live acceptance pending
re-activation (maintainer call)" + the H1-refutation note.

## Item-3 verdict (H1) — REFUTED, verdict (b)

The open DB check (run BEFORE writing this verdict): ALL user-role parts of
session ses_f39d250e9ffeheip2FVEeY5Fk6 — every part type (41 text + 3
compaction = 44 user parts, 356 total), searched for the literal
`<|autonom|>`: **zero hits**. Loose probes too: 0 user parts contain even
the substring "autonom"; no escaped-pipe variants; the 3 compaction parts
are metadata-only (`{"type":"compaction","auto":false,…}`). The full marker
appears only in 42 assistant `reasoning`/`tool` parts (the session's own
analysis quoting it). H1 (marker in pre-window user history, quoted by a
compaction summary / injected user message) is therefore REFUTED — no
fail-safe implemented; the `scope=` verdict log line is attribution-only
(change 3 as planned). H2 (running variant ≠ committed file) remains the
leading untestable hypothesis until the next incident — the new `scope=`
verdict + `surface= v=` lines will pin both in one line each.

## Verification (measured)

- Smoke: `node .opencode/plugin/tests/auto_resume.smoke.mjs` → **ALL PASS
  (76/76)** (63 pre-existing + 13 new; red baseline confirmed first).
- pytest: `./.venv/Scripts/python.exe -m pytest -q` → **459 passed, 1
  warning** (baseline match).
- ruff: `./.venv/Scripts/ruff.exe check --select F .` → **All checks
  passed (F=0)**.
- handover_probe: **240/241 — ONE pre-existing failure, NOT caused by this
  task**: check [97] (compact_memory unit A: "exactly ONE queued
  promptAsync carrying the text part"). Root cause: the maintainer's temp
  fix `0f192e5` (2026-09-22_11-53) commented out the `promptAsync` call in
  `compact_memory.ts` `queueMessage`; the probe still pins the pre-fix
  behavior. Verified: the probe does not load any file changed here (no
  auto_resume reference in the probe); `compact_memory.smoke.mjs` fails
  the same single message check (everything else passes). The spec's
  "probe 241/241" baseline is stale for the current tree. Finding appended
  to `todo_inbox.md` (disposition = planner/maintainer call: re-pin probe
  [97] + the smoke pin to the temp-fix behavior, or restore with
  promptAsync).

## Commit

ONE commit on `opencode_test` (HEAD before commit: 5d17ad0):
`auto_resume.ts` + `auto_resume.smoke.mjs` + `TODO.md` (#80 status) +
`todo_inbox.md` (probe finding) + this handover. Commit hash: recorded by
the planner in a follow-up (worker does not guess its own hash — repo
precedent). Files verified staged: plugin, smoke, TODO.md, todo_inbox.md,
handover_task_to_planner.md — nothing else (the maintainer's live files
were already committed by him at 0f192e5..5d17ad0; tree was clean before my
changes; no `.opencode/maintainer/**` touched).

## Deliberately NOT done

- Re-activating the plugin / touching the live config (DO-NOT-touch;
  live acceptance = maintainer call, recorded in #80).
- The probe [97] re-pin (out of scope — maintainer's intentional temp fix;
  finding in todo_inbox.md for his call).
- H2 resolution (untestable until the next live incident — the new log
  lines make it testable then).
- The open design questions in #80 (direct-session-as-autorun semantics,
  ask_maintainer 5-min timer, compaction-budget exhaustion) — unchanged,
  maintainer items.

## Evidence section (from the worker-1 checkpoint draft, kept)

Facts (verified on disk by worker-1; re-verified where relevant):
- Plugin: `.opencode/plugin/deactivated/auto_resume.ts`, stays deactivated
  (a000dfd moved it; never in config).
- Smoke: 63 checks green pre-deactivation (eaef397); line 40 loaded the
  old pre-move path → red at import since a000dfd (confirmed 2026-09-22).
- Gates: probe `node .opencode/plugin/probes/handover_probe.mjs`, pytest
  `./.venv/Scripts/python.exe -m pytest -q`, ruff `./.venv/Scripts/ruff.exe
  check --select F .`.
- Evidence for the scope anomaly (live log `.opencode/temp/auto_resume.log`,
  all UTC): 9× `recovery= sid=ses_f39d250e9ffeheip2FVEeY5Fk6 attempt=1` at
  2026-09-21T23:11:22/27/32/37 (gen 22:50:11Z), 23:40:41 (gen 23:12:03Z),
  23:58:23/33/38/43 (gen 23:42:21Z) — all attempt=1, ~5s apart (tick
  period). 9 process generations surfaced 14:25:48 → 23:58:52Z; deactivation
  commit a000dfd = 23:59:46Z → no plugin process since deactivation.
- attempt=1 repetition is reproducible under committed code (recoveryCount
  resets on every new busy, including injected-turn busy) = the
  cap-unreachability root cause fixed by change 2 — not an independent
  mystery.
- Scope paradox: for `recovery=` to be emitted, `spawned.has(sid) ||
  userHasMarker(msgs)` must have been true at routing (scope gate in since
  8e4f778, verified by git show). Planner's check covered 15 user text
  parts of the window (no marker); sid not in spawned.
- Hypotheses (ranked): H1 marker in pre-window user history — **REFUTED
  2026-09-22 by the DB check (see above)**; H2 running variant ≠ committed
  file — now testable via the `scope=` verdict + `surface= v=` lines.
