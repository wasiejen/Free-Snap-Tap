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
