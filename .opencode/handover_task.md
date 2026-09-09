# TASK T1 — Native session-gated context gauge (de-peek core) + unknown-model readouts

## PLANNER RULING 2026-09-10 (continuation 2 — RE-RULING: back to node:sqlite; supersedes the
2026-09-09 sqlite3.exe block)

1. **SQLite access = built-in `node:sqlite` (`DatabaseSync`) (maintainer re-ruling
   2026-09-10):** the 2026-09-09 sqlite3.exe spawn backend is superseded. Rationale: the
   3bit Q3 workers lost coherence on the SQL/JSON detail work; the build now runs on the
   4bit same-model worker. Verified ground (unchanged from fact 1): node v24.19.0 (the
   probe/peek host) has flag-free `node:sqlite`. The bun-compiled opencode.exe plugin host
   remains the KNOWN RISK (the original hang-up) — therefore the worker MUST (a) run the
   core under system bun 1.4.2 as a host proxy and record pass/fail in the summary, and
   (b) keep the never-throw contract: ANY failure (incl. missing/unsupported `node:sqlite`
   in the host) → kind `db-error`, silent fallback, NO exception into the hook. Production
   evidence = the maintainer restart + the one-shot log read (call 1). `sqlite3.exe`
   (`.opencode/plugin/tools/`) STAYS ON DISK — maintainer-placed tool, now unused by the
   core; do NOT delete, flag it in the summary.
   Core contract stays: `readGauge(dbPath?)` async (dbPath default = fact-2 path,
   injectable for probe fixtures), result ≥ `{sid, modelId, ctx, total, window, ok}`,
   kinds ok / no-total / db-error, `formatGauge(r)` = the ONE readout line; busy handling
   = API-way (PRAGMA busy_timeout via exec or one retry on busy — worker's call; ~2500 ms
   budget; never throw). The marker-SQL rows (`M|sid|model|total|output` / `S|sid`,
   json_extract in SQL — the `data` JSON is never fetched) are portable to `prepare()` —
   keep them if convenient; a direct structured query is fine if the result shape holds.
   The window rule + parseWindow/parseModelId (14 unit checks) are UNCHANGED. The
   committed core (`ctxgauge/gauge.mjs`, sqlite3.exe spawn version) is the STARTING POINT
   — replace only the read mechanic, keep the parser + readout forms byte-identical.
2. **Window rule (maintainer-confirmed):** a llama-swap model name's trailing `<N>K` →
   N×1000, `<N>M` → N×10⁶ EXACTLY (`-120K_MTP` → 120000, `_210K` → 210000); `-MTP` is a
   speed note only; the LAST matching marker wins; no match ⇒ UNKNOWN window (never a
   hardcoded guess). The worker's gauge.mjs digit corruption (`105`/`105*105` lost in
   compression) is fixed in the committed core.
3. **peek.py state:** it EXISTS on disk (the earlier TODO #30 "DELETED" line was wrong) and
   is still the live v2.4.1 plugin's readout. Delete it in THIS build's commit, together
   with the plugin wiring (the new plugin never needs it; the old one needs it until the
   maintainer restart).
4. **Probe fixture:** build the temp fixture DB with `node:sqlite` `DatabaseSync`
   (CREATE TABLE session/message + INSERT rows, opencode-like schema per fact 2) — NO
   python, NO sqlite3.exe, NO live DB anywhere in the probe.
5. **Remaining DoD for the continuation worker:** 1 (probe rebuilt + green), 2 (no
   python/`$`/python.exe refs in plugin + probe; the core's sqlite3.exe spawn code is
   GONE — only the node:sqlite path remains in the code), 3 (peek.py deleted + `peek.mjs`
   live line re-verified), 4 (suite 434/434 + ruff F=0), 5 (TODO #30/#35 status lines),
   NEW (bun host proxy): the core is green under node v24.19.0 AND the worker runs a
   bun 1.4.2 import+read check of the core and records pass/fail (fail → the db-error
   silent fallback is the production guard; record it in the summary + TODO line — do
   NOT chase a bun workaround). The
   plugin wiring itself: import the core, session-gated MATCH-ONLY post (sid ===
   input.sessionID, mismatch silent + no log), post any valid form (incl. unknown-window
   and CTX=notAvailable), `sess` field on the chatmsg evidence line, gauge-failure
   vocabulary `db-error` (+preview) / `parts-not-array` / `invalid-messageID`, REMOVE the
   dead `$`/ShellLike/GAUGE_TIMEOUT/withTimeout/gaugePreviewOf machinery, v2.5 header block.

FIRST read `AGENTS.md`, `agents_repo.md`, this file, and `TODO.md` #30/#33.
Repo root = `$env:FST`. This task touches the **opencode plugin + its probe + agent-prompt
docs only** — NO FST python code, NO `opencode.jsonc`, NO `agents_repo.md` (maintainer-owned —
flag the stale `peek.py` line in your summary instead).

## Goal (definition of the delivered outcome)

Replace the `peek.py` python shell-out with a native in-plugin `node:sqlite` gauge so the
context readout is (1) **session-sensitive** — the readout carries the id of the session it
read (`SESSION=<sid>`), and the `chat.message` reminder posts ONLY when that id equals the
current session id (mismatch ⇒ no post, silent — never feed another session's numbers into
this one); (2) **honest about unknown models** — when the model id yields no context window,
no percentage and no REM are guessed; (3) one implementation shared by the plugin and the
self-peek CLI (`peek.py` deleted).

Builds the read-mechanic half of TODO #33 (approved nudge build, maintainer lean (a)) + the
core of TODO #30 (de-peek; approved for THIS cycle, folded in per maintainer ruling).
The #33 nudge ladder itself lands in T2 on top of this — do NOT build it here.

## VERIFIED facts (measured 2026-09-10 by the planner — treat as evidence, not memory)

1. **Runtime/host:** the probe runs under system `node` v24.19.0 with native TS type-stripping
   (existing probe header documents this). `node:sqlite` (`DatabaseSync`) works there flag-free
   — verified by direct import. The gauge will therefore never use `$` / the shell again.
2. **DB:** `C:/Users/Wasiejen/.local/share/opencode/opencode.db`, opened read-only
   (`?mode=ro` / `readOnly: true`). Schema facts verified by read-only queries:
   - `session`: at least `id TEXT`, `time_updated INTEGER` (ms epoch), `model TEXT` = JSON
     `{"id":"...","providerID":"...","variant":"default"?}`.
   - `message`: at least `session_id TEXT`, `time_created INTEGER` (ms epoch), `data TEXT` =
     JSON. There is **NO `role` column** — `role` is a field inside `data` JSON.
   - Finished assistant steps carry `data.finish` (e.g. `tool-calls`, `stop`) and
     `data.tokens { total, input, output, reasoning, cache{ write, read } }`;
     the in-flight step's row has empty/absent tokens and NO `"finish"` field in `data`
     (the LIKE filter below therefore excludes it); user-message rows carry **no token
     fields at all** (verified across 30 recent user rows).
   - peek's read: newest session by `time_updated`; within it the latest row
     (`time_created desc`) whose `data` contains `"finish"` (peek.py's LIKE
     ` '%"finish"%' ` equivalent) = the gauge's message; the same SQL is verified stable
     while opencode writes concurrently (read-only + `PRAGMA busy_timeout=2000`; retry
     once on a busy/locked error before giving up — the read must never throw into a hook).
3. **Token semantics (resolves the #30 carry-over caveat + peek.py's in-code maintainer TODO):**
   across all 11 recent step rows, `total = input + output + cache.read` holds EXACTLY, so
   `ctx = total - output = input + cache.read` = exact prompt size at that step = current
   context at that moment. Record the verified meaning in TODO.md #30 when you close its
   evidence items.
4. **Model id → window (the ONLY parser, keep it, drop the fallback):** peek.py's regex
   `-(\d+(?:\.\d+)?)(K|M)(?![0-9])` on the model id from `session.model` JSON `id`
   (e.g. `Qwen3.8-27B-IQ3KT-120K_MTP:chat` → 120000). The hardcoded `120000` fallback in
   peek.py is the bug being removed — no match ⇒ window UNKNOWN (real model `CPU-Qwen3-0.6B`
   never gets treated as 120k).
5. **The cross-session feed is real (live-reproduced this run):** at my turn start the
   injected line said `CTX=106686 (88%)` (read off whatever session was newest-updated — the
   worker's), while my own true context was ~71k (the same query now reads `CTX=61300 (51%)`).
   The fix under build is exactly the `SESSION=` + match-only post.
6. **Live plugin file:** `.opencode/plugin/handover_v2.4.ts` (top-level of `.opencode/plugin/`;
   the loader is non-recursive — subfolder files inert; verified working under that name in the
   maintainer restart cycle v2.4/v2.4.1). Edit it in place; add a `v2.5` header block above
   `v2.4.1` (or replace the top history per your judgement — keep the file the single live
   plugin file; no new top-level plugin files).
7. **Stale probe:** `.opencode/plugin/probes/handover_probe.mjs` points at the deleted
   `handover.ts` and exercises the retired `experimental.chat.system.transform` + fake-`$`-shell
   S4 shapes — it must be rebuilt (see DoD). S1 (preflight)/S2 (gates)/S3 (mirror)/S5 (hygiene)
   behavior is UNCHANGED by this task and those shapes carry over (adapted); S4 (the 9 fake-shell
   transform shapes) is replaced by chat.message + native-gauge shapes.
8. **Constraint:** never parse/work on the LIVE `.opencode/plugin.log` (standing maintainer
   constraint). The probe's S5 hygiene byte-snapshot comparison of the real file (pre/post
   identity + append-only check) is the existing accepted pattern — keep it exactly that and
   no log-content analysis.

## Behavior spec

### Gauge core (new file, e.g. `.opencode/plugin/gauge.mjs` — your call on the name/split as
long as it is ONE implementation imported by both the plugin and the CLI)

- `readGauge(dbPath?) → result` — reads the DB per facts 2/3/4 (dbPath default = fact-2 path;
  injectable so the probe points it at a temp fixture DB). Returns a structured result carrying
  at least: `sid` (the session id it read), `modelId`, `ctx`, `total`, `window` (number|undefined),
  `ok` (whether a token total was found at all).
- Readout forms — the ONE string format used by the CLI, by the plugin's injected text, and by
  T2's nudge text. Given a finished-message read `total−output` = ctx:
  - window known:      `CTX=<ctx> (<pct>%) REM=<window−ctx>`   (pct = integer `ctx*100//window`;
    byte-identical to today's middle of the line — e.g. `CTX=61300 (51%) REM=58700`)
  - window unknown:    `CTX=<ctx>` — nothing else (no guessed pct/REM)
  - no total found (no finished step in the newest session, empty tokens, missing model, DB
    empty — the #21 fresh-session class): `CTX=notAvailable` — informative, verbatim string,
    so a model calling the CLI does not get a silent/zero confusion.
  - The readout line is prefixed with `SESSION=<sid>` (the session the read came from) — the
    CLI prints it; the plugin injects it (a post only happens for the matching session, so the
    agent always sees the id of its own number — control-safety evidence).

### `chat.message` hook (v2.4.1 mechanics stay — part id `prt-ctx-<uuid>`, messageID from
`output.message.id` primary / `input.messageID` fallback, `parts` array push, the existing
`invalid-messageID` / `parts-not-array` skip-and-log branches) — CHANGED ONLY in:

- the readout is the native gauge (no shell, no `GAUGE_TIMEOUT_MS`, no `withTimeout`,
  the whole `$`/ShellLike machinery goes with it — dead code removal, pre-approved class);
- **match-only post:** if `readGauge().sid !== input.sessionID` ⇒ return silently (NO post,
  NO log line — a mismatch is a normal multi-session state, not a failure; the v1.x
  log-growth discipline applies: silence where silent). Only post on equality; then post ANY
  valid form — including the `unknown-window` line and `CTX=notAvailable` (posting an honest
  own-session result is information, not error);
- the `kind:"chatmsg"` evidence line stays per fire (it already carries `session`/`agent`/
  `message`) — ADD one small field for the read session id (e.g. `sess`) so a post and its
  source are visible side by side in the log evidence;
- failure lines `kind:"gauge"`: the old shell-era reasons (`shell-missing`, `timeout`,
  `no-ctx-output`) are GONE; the surviving/new vocabulary is: `db-error` (the read failed
  even after the busy-timeout + one retry — carry a capped preview like the old `preview`
  field), plus the unchanged `parts-not-array` and `invalid-messageID`. Nothing else logs.

### CLI (new `.opencode/ctxgauge/peek.mjs`, deleting `.opencode/ctxgauge/peek.py`)

- Thin: import the shared gauge, `readGauge()`, print `format` → the ONE stdout line, e.g.
  `SESSION=ses_… CTX=61300 (51%) REM=58700`. Exit 0 always (the agent consumes the line);
  an unreadable DB prints `SESSION=unknown CTX=notAvailable` (still informative, never a
  stack trace to stderr in place of a line — stderr may carry the error text as an addition).
- Self-peek command for agents becomes: `node .opencode\ctxgauge\peek.mjs` (repo root).

### Docs (the #30 doc purge, scoped)

- `prompt_agent_planner.md` + `prompt_agent_task.md`: the self-peek command line(s) change
  from the python `peek.py` invocation to `node .opencode\ctxgauge\peek.mjs`; the wording of
  the `ctx:` nudge description stays accurate (it now carries `SESSION=… CTX=…`). Edit
  only those lines — the prompts are otherwise maintainer-owned.
- Grep the repo docs for `peek.py` and purge/update every remaining reference EXCEPT:
  `agents_repo.md` (maintainer-owned — flag it in your summary + TODO note), `TODO.md`
  entries (historical — the #30/#33 entries themselves), `handover_planner.md` (planner-owned
  — the planner updates it), and git history. If the only `AGENTS.md` that exists is the
  repo root (read-only per its own editing rule), flag it for the maintainer rather than
  editing it.

## Definition of done

1. **Probe rebuilt and green:** `node .opencode\plugin\probes\handover_probe.mjs` (exact
   command in the rebuilt probe's own header, run from repo root) → `PROBE handover: N/N PASS`,
   exit 0. The rebuilt probe keeps the sandboxed-init design (directory=temp sandbox, real
   `.opencode` files byte-identity S5 hygiene, zero writes outside the sandbox) and covers at
   least: S1 preflight (3), S2 gates (4), S3 mirror (5), the new S4 = chat.message shapes
   (ok-match inject byte-exact / mismatch-silent / no-throw guarantees + gauge failure-line
   byte-exact per new vocabulary), the new S6 = gauge core shapes (known-window / unknown-
   window / notAvailable / `SESSION=` prefix / model-id parser cases incl. no-match and
   `256K`), S5 hygiene (5). A temp fixture sqlite DB (built by the probe itself, opencode-like
   schema per fact 2) is the gauge's source — NO live DB, NO python anywhere in the probe.
2. **No python on the gauge path:** zero references to `peek.py` / `$` / `python.exe` in the
   plugin code or probe (git-greppable).
3. **Files:** `peek.py` deleted; `peek.mjs` works: `node .opencode\ctxgauge\peek.mjs` from
   repo root prints the `SESSION=…` line against the live DB (read-only) — verify it live in
   the run and paste the exact line in your summary.
4. **Suite green:** `& .\.venv\Scripts\python.exe -m pytest -q` = 434/434 (the plugin task
   touches no FST python — the suite is the no-regression proof; same 13-warning profile).
5. **TODO.md:** #30 gets the verified token-semantic one-liner (fact 3) + status line updated
   to "core landed this cycle — log-profile re-baseline pending maintainer restart + one-shot
   log read (call 1, default SKIP)"; #33 gets one line noting the read-mechanic half landed
   (ladder pending T2). Do NOT close #30 or #33 (both remain open for their tail items).
   Append discrepancies (stale docs you find but can't fix in scope, e.g. `agents_repo.md`)
   as new numbered entries starting at #34.

## Approval boundary

- Pre-approved (just do it): all code/meta edits named here (approved build #33/#30 + docs
  purge class); dead-code removal of the shell machinery; `peek.py` deletion (explicitly
  approved by the maintainer this session); probe rebuild; TODO.md appends.
- NOT pre-approved (stop and flag): any FST python change; `opencode.jsonc`; `agents_repo.md`;
`AGENTS.md` root; deleting `.opencode/plugin/tools/sqlite3.exe` (maintainer-placed, now
   unused — flag only); reading/analyzing `plugin.log` (log-CONTENT; the S5 byte-identity
   snapshots are the existing exception); any change to the v2.4.1 part-schema mechanics
  (id/messageID handling) beyond what's specified; anything observable beyond the specified
  readout/post changes (e.g. a second log file, env vars, config keys).
- If a shape surprise hits you (the live DB differs from fact 2/3 in a way that breaks the
  read, node:sqlite behaves differently than verified, the opencode DB has concurrent-write
  locks that beat the busy-timeout+retry) — implement the safest silent-fallback, record it
  in the summary + TODO, and keep the suite green. Never let the gauge throw into a hook.

## Worker

`worker_Q4_120K` (same model as the planner, 4bit IQ4KT-120K — higher precision for the
delicate SQL/JSON work; the maintainer's default worker for this session, 2026-09-10
re-ruling; the earlier 3bit 210K delegation looped and left no commits). Write the
EXECUTIVE SUMMARY to `.opencode/handover_task_to_planner.md` (OVERWRITE — your latest
summary only) covering: what changed, probe result (exact N/N), the live `peek.mjs`
output line, measured suite, TODO entries added, and what was deliberately not done.
**Handover contract (2026-09-10):** the summary FILE is the primary channel — your
final message must be SHORT (a one-line pointer to the file). Do NOT repeat the
summary as the final message (the repeated-final-message loop cost a cycle).
Commit per the AGENTS.md routine (code + TODO + the summary file in one commit;
message: one-line imperative subject).
