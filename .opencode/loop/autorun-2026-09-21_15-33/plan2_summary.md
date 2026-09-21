# plan2 summary — looprun autorun-2026-09-21_15-33, iteration 2 (planner-2, ses_f3b948fcdffeiw3Lx7PsOzvP7I)

## What happened

- **Auto-resume UNIT 2 LANDED + planner-verified** (worker `worker_Q3S_160K`
  ses_f3b8c19e9ffe2IoV4S9lrx0vSi; spec `3d51721`, code `d90973b`, summary
  `0a21139`, bookkeeping `a3cf96d`): the context-limit compaction trigger in
  `.opencode/plugin/auto_resume.ts`.
  - Per-session watch objects (module-level Map): `lastTokenTotal`
    (assistant `message.updated` only, OVERWRITTEN), the model pair, the
    once-per-busy-cycle attempts counter, `lastActivityAt`, armed/status.
  - ONE 5s `.unref()`-ed tick = the only decision+send funnel (events only
    ARM state); on idle: skip if tokens ≤ 0 / attempts 1 this cycle / usable
    window null / ratio < 0.85 — else re-entrancy latch + gate re-check right
    before send → ONE QUEUED `client.session.promptAsync` (never
    synchronous; a synchronous injection invalidates the session KV cache →
    3-4 min re-prefill), instructing the session to call `compact_memory`
    NOW with NO sessionID (SELF path) + a 1-3 line continuation message,
    then continue per the post-compaction protocol.
  - Usable window per deep-dive B §2: `context - min(20_000, output)` from
    the provider list, cached per `providerID/modelID` (successful values
    only), fail-safe null on any missing data/throw.
  - New short decision log lines: `arm=`, `saturation=` (ratio),
    `trigger=`, `send-fail=`. Unit 1 lines unchanged in format.
- **Verified from files (planner re-run, this checkout `opencode_test`):**
  smoke **32/32** (all 7 DoD cases pinned: overwrite-not-accumulate,
  sub-threshold no-send, ≥0.85 exactly-one queued send with ratio + SELF
  instruction in the body, second-idle-same-cycle no-send, fresh-busy budget
  reset, fail-safe no-model/no-provider/throwing-send, all Unit 1 checks
  green), probe **235/235**, pytest **459+1w**, ruff **F=0**. Code
  spot-checked against the locked design (tick/latch/budget/threshold/
  arm-reset).
- **Three spec-vs-reality discrepancies** (worker-flagged, resolved
  defensively, facts cured to the unit-1 surface report §UNIT 2 supplement):
  1. SDK provider namespace = `provider.list()` (NOT `get()`) — code tries
     `list`, `get` fallback.
  2. The live model pair is TOP-LEVEL `providerID`/`modelID` on the message
     (no `model` sub-object; the spec's `info.model` key would have silently
     never fired) — code accepts both shapes.
  3. The live auto_resume.log grows in real time — the smoke's "live log
     size unchanged" invariant replaced with "no smoke-session line in the
     newly appended bytes".
- **Knowledge curation:** the worker's 3 facts moved from `knowledge_inbox.md`
  into the surface report §UNIT 2 supplement (curation-log line added).
- **Maintainer idea parked (ideas.md 2026-09-21, no marker):** "pathfinder
  mentality as a planner prompt part" (leave an area in a better state —
  small edits inline, bigger ones → todo_inbox). Parked with the other two
  (NAP snapshot; codified reality-rebuild tool).
- **TODO #75** status updated (Unit 2 LANDED; live acceptance PENDING; next
  = Unit 3).

## Open / next (ordered)

1. **Unit 2 LIVE ACCEPTANCE** — a live session crossing 85 % self-compacts
   once per busy cycle, no re-prefill stall; verified from the
   `arm=`/`saturation=`/`trigger=` lines in `.opencode/temp/auto_resume.log`.
   Requires the host to pick up the Unit 2 build (a restart — this looprun's
   host loaded only Unit 1).
2. **Unit 3 spec + delegation** (new-planner spawn helper — shared building
   block for Unit 4's restart branches) per the approved proposal's strict
   order.
3. Maintainer-domain queue (his priority.md): TODO #70 compact_memory
   rework (providerID/modelID removal from the param list — the Unit 2 work
   gives more live data on the resolve path); repo-split research; #56
   distillation (DEFERRED — the `--defer` marker stands).
