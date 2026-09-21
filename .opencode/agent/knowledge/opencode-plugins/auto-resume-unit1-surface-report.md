# auto-resume UNIT 1 — v1 client surface report (static part)

Source: installed type definitions of `@opencode-ai/sdk` + `@opencode-ai/plugin`
under `.opencode/node_modules/` (bounded greps of
`@opencode-ai/sdk/dist/gen/sdk.gen.d.ts` and `@opencode-ai/plugin/dist/index.d.ts`);
verifying session: worker_Q3S_160K, session ses_f3bbdd89affeigE26tm2lka7AT,
2026-09-21. Design of record:
`.opencode/proposals/approved/2026-09-21_opencode-auto-resume-plugin.md`.

## Installed versions (provenance)

- `@opencode-ai/sdk` = 1.18.29, `@opencode-ai/plugin` = 1.18.29
  (from the installed `package.json` under `.opencode/node_modules/`).
  NOTE: the design doc names the host install as `opencode-ai@1.18.31` —
  the repo-local `.opencode/node_modules` says 1.18.29. Both are
  v1-generation clients; the live `surface=` probe confirms the runtime
  surface (see below).

## Static `session.*` method surface (from `@opencode-ai/sdk/dist/gen/sdk.gen.d.ts`)

Bounded grep (`prompt|abort|list|get|message|todo|command|summarize|compact`,
head -40) of the generated SDK shows the `session` namespace exposes:

| method | present in .d.ts | line |
|---|---|---|
| `session.list` | yes | 110 |
| `session.get` | yes | 126 |
| `session.todo` | yes | 138 |
| `session.abort` | yes | 150 |
| `session.summarize` | yes | 166 |
| `session.prompt` | yes | 174 |
| `session.promptAsync` | yes | 182 |
| `session.command` | yes | 186 |
| `session.message` | NO (no such method) | — |
| `session.compact` | NO (no such method) | — |

The client object itself: `PluginInput.client = ReturnType<typeof createOpencodeClient>`
(`@opencode-ai/plugin/dist/index.d.ts` line 37; `createOpencodeClient` is
`@opencode-ai/sdk/dist/client.d.ts`). Event hook key verified:
`Hooks.event?: (input: { event: Event }) => Promise<void>`
(`@opencode-ai/plugin/dist/index.d.ts`, the `Hooks` interface, ~line 175).

## Init probe design (the live confirmation)

The plugin (`auto_resume.ts`) logs a ONE-SHOT `surface=` line at load:
`typeof ctx.client.session.<m>` for each candidate
(`prompt, promptAsync, abort, list, get, message, todo, command, summarize,
compact`) + `app.log=<typeof client.app.log>`. `typeof` ONLY — `Object.keys`
misses prototype methods (knowledge_plugins.md "The plugin ctx client on
THIS host"; a 2026-09-12 probe established that).

Expected values (2026-09-12 probe + static .d.ts above):

- `prompt=function`, `promptAsync=function`, `abort=function`, `list=function`,
  `get=function`, `todo=function`, `command=function`, `summarize=function`
- `message=undefined`, `compact=undefined` (v1-generation client — no
  host-side compaction trigger in the session namespace)
- `app.log=` — to be confirmed live (the static .d.ts does not pin it;
  Unit 1's shared rule wants logging via `app.log` "as upstream does")

The log line lands in `.opencode/temp/auto_resume.log` (append; the temp
dir is mkdir'd recursive by the plugin).

## LIVE CONFIRMATION — PASSED (2026-09-21, planner-1, ses_f3bd43f5bffe32mM8F3rQfaNh5)

Host restart (maintainer, inbox item 26-09-21_16-31) → the plugin
auto-discovered and loaded (first log line `2026-09-21T14:25:48.595Z` UTC).

1. **`surface=` init probe line:** `prompt=function promptAsync=function
   abort=function list=function get=function message=function
   todo=function command=function summarize=function compact=undefined
   app.log=function` — matches the expected v1-generation values.
   ONE deviation from the STATIC table: `session.message` reads
   `function` live but was absent from the bounded .d.ts grep
   (head-40 truncation — the live `typeof` probe is the authority:
   `session.message` IS callable from the plugin). `compact=undefined`
   CONFIRMED (no host-side compaction trigger in the session namespace
   — the Unit 2 trigger cannot rely on one). `app.log=function` — the
   shared-rule logging path is available.
2. **Live event lines:** 12,629 `event=` lines at verification, incl. the
   verifying session itself (`ses_f3bd43f5bffe32mM8F3rQfaNh5`,
   `message.part.updated` events) — the stream is DENSE (per-part
   updates); Unit 2/3 consumers must FILTER events, not count raw lines.

## UNIT 2 supplement — live SDK/event facts (worker-verified 2026-09-21, ses_f3b8c19e9ffe2IoV4S9lrx0vSi)

1. **Provider namespace:** the installed @opencode-ai/sdk 1.18.29 client
   exposes `client.provider.list()` (NOT `get()`), returning
   `{data: {all: Provider[], default, connected}}`; `Provider = {id,
   models: {[modelID]: {limit: {context, output}}}}` — the client method
   wraps the 200 body in `res.data`.
2. **LIVE `message.updated` shape:** `properties.sessionID` IS present (the
   static .d.ts only shows `properties.info` — the live host sends more;
   same live-more-than-static pattern as `session.message` being
   callable). The assistant message object carries `role` + TOP-LEVEL
   `providerID`/`modelID` + `tokens {total?, input, output, reasoning,
   cache{read, write}}` — there is NO `model` sub-object (a unit-2 trigger
   keyed only on `info.model` would have silently never fired).
3. **Smoke/live-log invariant:** the live `.opencode/temp/auto_resume.log`
   keeps growing in real time while the host runs (the live plugin logs
   every event) — a smoke asserting "live log size unchanged" FAILS on any
   multi-second smoke; the correct invariant is "no smoke-session line in
   the newly appended bytes" (measured: +696 B over a ~30s smoke).

## LIVE ACCEPTANCE supplement — plan4 (2026-09-21; planner-measured, worker-4 fix)

1. **LIVE `session.status` shape (the Unit 2 string bug — found in live
   acceptance, fixed 2026-09-21):** EVERY live `session.status` line in
   `.opencode/temp/auto_resume.log` ends in `status=[object Object]` (e.g.
   16:51:43.577Z) — the host carries `status` as an OBJECT
   `{ type: "busy"|"idle"|"retry"|"interrupted" }` (the field is `type`;
   vocabulary per the SDK `SessionStatus` map in `ctx_watchdog.ts` ~line
   175). The old `armEvent` compared `props.status === "busy"` / `===
   "idle"` (strings) → ZERO `arm=`/`saturation=`/`trigger=` lines in the
   whole log: the idle transition never registered, the tick never
   evaluated, the Unit 2 trigger never fired live. The smoke was green
   because its `statusEv` helper mocked the STRING shape. Fix (this
   commit): a module-internal `statusOf()` — string → as-is, object with
   a string `type` → that `type`, else null; `armEvent` uses it (busy
   arms, idle sets idle, any other vocabulary → no state change, no log
   line); the event line prints the normalized value (`status=busy`),
   falling back to the raw `String()` only when normalization yields
   null. The smoke `statusEv` now emits the LIVE object shape; a
   STRING-shape `"busy"` event is pinned separately (dual-shape
   acceptance check, new sid `ses_u2_str`). Live re-acceptance PENDING
   the next host restart (expect `arm=`/`saturation=`/`trigger=` lines).
2. **`create=function` live verdict (Unit 3 pending surface fact,
   settled):** the post-restart surface line
   `2026-09-21T16:42:39.969Z` (log line 148832) carries
   `create=function`.
3. **UNIT 3 LIVE ACCEPTANCE PASSED (planner-run 2026-09-21 17:00Z):**
   trigger file → `spawn= sid=ses_f3b16aa46ffe07iI4CSrScxeWK
   agent=planner_Q3S_160K` (log line 163103) + the `.consumed` rename +
   the spawned session WROTE the marker
   `.opencode/temp/auto_resume_unit3_live_acceptance.txt`
   (`unit3-live-acceptance ses_f3b16aa46ffe07iI4CSrScxeWK 2026-09-21
   17:00:55 UTC`).
