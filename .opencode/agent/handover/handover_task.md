# TASK SPEC — TODO #93: port context_recovery.ts to the `event` hook (the emergency compact backstop)

Goal: the backstop fires on a REAL context-overflow error (the host's
session.error event) — compact with the configured keep → budget increment →
COMPACT line → the post-compaction directive (the retry vehicle). Over
budget → CLEAN FAIL (no compact, the error propagates).

Worker: `worker_Q3S_170K`. Stay on the current checkout (`opencode_test`).

## Verified facts (measured at spec time, 2026-09-25, ses_f2a436b57)
1. The `"session.error"` plugin hook does NOT exist in the current SDK — the
   installed `@opencode-ai/plugin` dist/index.d.ts `Hooks` has
   `event?: (input: { event: Event }) => Promise<void>` (notification-only,
   returns VOID — the old design's `{handled, action:"retry"}` return is
   impossible; the directive's promptAsync IS the retry vehicle).
2. The overflow event DOES exist in the `Event` union (SDK
   types.gen.d.ts L518): `EventSessionError = { type: "session.error";
   properties: { sessionID?: string;  error?: ProviderAuthError |
   UnknownError | MessageOutputLengthError | MessageAbortedError | ApiError } }`
   — note the capital-D `sessionID`.
3. Live overflow error (the maintainer's fork test 2026-09-23): a
   `MessageAbortedError` with the text `request (148149 tokens) exceeds the
   available context size (131072 tokens)`; the host emitted 4 session.error
   events for ONE overflow (its internal tail-strip retries) → a
   once-per-overflow in-memory guard is required.
4. The live client is v1-generation: `client.session.summarize({ path:
   { id }, body: { providerID, modelID, keep: { messages } } })` (`compact`
   is undefined) — see compact_memory.ts `callSummarize` (~L501-518) and the
   summarizer resolution (~L603-712, L880). The summarize body REQUIRES
   providerID + modelID; the pair resolves from opencode.jsonc
   `agent.compaction.model` (currently commented out → fallback = the
   session's own model). Replicate that resolution as a SELF-CONTAINED local
   copy — NO runtime import from compact_memory.ts (the T5 constraint: it
   would pull the tool registration into a hook-only plugin).
5. Budget store (live `.opencode/temp/compact_budget.json`, version 2):
   `model_budget` map (bare model id → cap; `default` 1; CPU → 0),
   `sessions` entries `{count, updated, model}`, `emergency_budget` (absent
   → default 1), `emergencyRecovery: true` (ALREADY LIVE — no maintainer
   flag work), `keepMessages: 18` (live). The spec-10 gate (auto side =
   the no-arg path): cap = model_budget[model] ?? model_budget.default;
   count < cap → normal increment (count+1); count == cap → consume the
   emergency slot (count → cap+1, ` emergency` suffix on the COMPACT line);
   count > cap → CLEAN FAIL (no compact, no line).
6. Keep = keepMessages ONLY (spec 01: keepTokens removed — never read, never
   defaulted, never sent). The recovery keep reads the budget file's
   `keepMessages` (fail-open default 12; live 18).
7. COMPACT line = the current tool's writer (compact_memory.ts L245-275):
   `<stamp>[ <model>] COMPACT <sid> messages=<m>[ emergency]` (messages-only
   since spec 01 — no `tokens=` field).
8. The old `COMPACTION_RELOAD_DIRECTIVE` references the looprunner
   (RETIRED) — replace it with the current post-compaction wording (re-read
   the head files per `agent_readme_post_compaction.md`, CONTINUE, never
   re-plan from scratch — the spec-2+11 relay wording).
9. Overflow text markers: keep the prototype's `isOverflowError`
   ("exceeds the available context size" / "context length exceeded" /
   "prompt is too long") — the live error text matches marker 1.
10. Plugin auto-load: opencode.jsonc has NO `plugin` key (measured: zero
    hits) — files in `.opencode/plugin/*.ts` are auto-loaded; moving
    `deactivated/context_recovery.ts` → `.opencode/plugin/context_recovery.ts`
    IS the activation. No opencode.jsonc edit (maintainer-domain: the host
    restart + the live overflow test only).

## Scope
- `.opencode/plugin/deactivated/context_recovery.ts` →
  `.opencode/plugin/context_recovery.ts` (the single source; the deactivated
  copy is removed):
  - Hook: `event` — filter `event.type === "session.error"` + overflow
    marker on `event.properties.error`'s message + `event.properties.sessionID`
    (fail-closed when absent / not an overflow / flag off).
  - The once-per-overflow in-memory guard per sessionID (cleared on
    `EventSessionIdle` for that session — it is in the Event union).
  - Flag: `emergencyRecovery` strictly `true`, read PER FIRE from the budget
    file (missing file/key/other value/unparseable → OFF).
  - The v1 summarize call with the config-resolved summarizer pair (fact 4).
  - The v2 budget gate + read-then-write increment (NO await between read and
    write), on SUCCESS only (fact 5).
  - The COMPACT line per fact 7 (mirror the current tool's writer incl. the
    ` emergency` suffix).
  - The directive per fact 8, injected as a synthetic text part via
    `promptAsync` (a lost directive degrades to a plain retry — evidence
    only, never a throw).
- `tests/context_recovery.smoke.mjs` — re-pinned to the new file + the event
  shape (faked client + faked `EventSessionError`): the flag-off,
  non-overflow, budget states (normal / emergency / exhausted), the keep,
  the line format (incl. ` emergency`), the once-guard, the directive.
- The probe — re-pin S11 (the context_recovery section) to the ported file +
  the event shape (new/updated checks as needed; the probe's check IDs are
  NOT centralized — run the probe, extract the used IDs, pick safe ones;
  update the header's self-annotated total). S10 (the retired v1) stays
  BYTE-IDENTICAL (the v1 removal is his call).
- `TODO.md` #93 — the status line → `LANDED` (the hash is recorded in the
  planner's follow-up bookkeeping commit — do not self-reference it).

## DO-NOT-TOUCH
- `opencode.jsonc` + everything under `.opencode/maintainer/**` (his live
  files).
- The probe's S10 section (byte-identical) and any frozen artifact it pins.
- `compact_memory.ts` (the recovery stays self-contained — no shared-code
  move).
- The live `.opencode/temp/compact_budget.json` (the smoke uses a temp
  fixture root).

## Definition of done
- The file lives at `.opencode/plugin/context_recovery.ts` (the deactivated
  copy gone); it registers the `event` hook (no `"session.error":` key);
  capital-D `sessionID`; the overflow markers present.
- Smoke green (report the new count); probe green (self-annotation updated;
  S10 byte-identical); standard gate green — baseline (2026-09-24, post
  spec-3 + waves): probe 252/252, compact_memory smoke 66/66, auto_resume
  smoke 129/129, pytest 459+1w, ruff F=0 — RE-RUN AT START, do not trust the
  numbers.
- ONE commit: code + smoke + probe + TODO.md + your handover file
  (`handover_task_to_planner.md`: executive summary, the measured gate
  evidence, the commit facts, the TODO entry, what was deliberately NOT
  done — and NAME the maintainer-domain pending items verbatim: (1) the host
  restart (plugin activation), (2) the live overflow acceptance on a
  driven/forked session as the 2026-09-23 fork test (expect: ONE COMPACT
  line + the budget increment + the session survives/continues — the flag is
  already `true` in the budget file, no flag work needed)).
- The follow-up (the context_recovery + compact_memory ONE-plugin
  integration) is OUT of scope — note it as the next candidate in the
  handover.
