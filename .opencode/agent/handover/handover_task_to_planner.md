# Worker summary — auto-resume UNIT 2: context-limit compaction trigger

Worker: `worker_Q3S_160K`, session `ses_f3b8c19e9ffe2IoV4S9lrx0vSi`, 2026-09-21.
Task spec: `.opencode/agent/handover/handover_task.md` (Auto-resume UNIT 2).

## WHAT CHANGED

Plugin-only, inside the approved proposal's Unit 2 (no product code, no probe
pins, no NAP/TODO/maintainer files touched — verified via `git status`).

1. **`.opencode/plugin/auto_resume.ts`** (117 → ~370 lines, Unit 1 shape kept):
   - Unit 2 mechanism per the locked design: events only ARM per-session
     watch state (module-level `Map` keyed by sid — `lastTokenTotal`
     OVERWRITTEN on assistant-role `message.updated` only, model pair,
     attempts counter, `lastActivityAt`, armed/status); ONE 5s
     `.unref()`-ed `setInterval` tick is the only decision+send funnel.
   - On idle: skip if tokens ≤ 0 / attempts already 1 this busy cycle /
     usable window null / ratio < 0.85; else re-entrancy latch + gate
     re-check right before send → ONE QUEUED `client.session.promptAsync`
     (never synchronous), latch held until it settles, attempts++.
   - Usable window per deep-dive B §2: `context - Math.min(20_000, output ?? 0)`
     from the provider list, cached per `providerID/modelID` (successful
     values only — nulls stay re-checkable), fail-safe null on any
     missing data or throw.
   - Queued text names the measured ratio and instructs the session to call
     `compact_memory` NOW with NO sessionID (SELF path) + a 1-3 line
     continuation message, then continue per the post-compaction protocol.
   - New short decision log lines: `arm=`, `saturation=` (with ratio),
     `trigger=`, `send-fail=`. All Unit 1 lines unchanged in format.
   - Never throws out of any hook or the tick (outer try/catch — an
     unhandled timer rejection would take the host down).
2. **`.opencode/plugin/tests/auto_resume.smoke.mjs`** (113 → ~260 lines):
   extended with the 19 Unit 2 checks (mock client spying on `promptAsync`;
   mock `provider.list()` supplying `limit` data in the live SDK shape).
   All 12 Unit 1 checks stay byte-identical and green. Live-log invariant
   refined (see discrepancy 3 below).

## MEASURED VERIFICATION (all green, this checkout `opencode_test`)

| gate | result |
|---|---|
| `node .opencode/plugin/tests/auto_resume.smoke.mjs` | **ALL PASS (32/32)**, exit 0 (~30s — real 5s tick waits) |
| `./.venv/Scripts/python.exe -m pytest -q` | **459 passed, 1 warning** (expected) |
| `./.venv/Scripts/ruff.exe check --select F .` | **All checks passed** (F=0) |
| `node .opencode/plugin/probes/handover_probe.mjs` | **PROBE handover: 235/235 PASS** (no pins added) |

DoD cases pinned by the smoke: (1) overwrite-not-accumulate (80000 then 40000
→ no send; user-role 1M update ignored); (2) sub-threshold → zero sends;
(3) ≥0.85 → exactly ONE send, body carries ratio `0.952` + compact_memory
SELF-path instruction, `trigger=` line present, one text part, no noReply;
(4) second idle same cycle → no second send; (5) fresh busy→idle → sends
again (budget reset); (6) no model / missing provider data / throwing send →
no send, no throw, `send-fail=` logged; (7) all Unit 1 checks green.

## COMMITS

- `d90973b` — code + smoke in one commit (green only).
- This summary commits with it separately (handover file).

## DISCREPANCIES FOUND (recorded here, NOT in TODO — TODO off-limits per the spec)

1. **Spec says `client.provider.get()`; the installed SDK 1.18.29 exposes
   `client.provider.list()`** (no `get` in the `Provider` client class —
   verified in `sdk.gen.d.ts`). The code tries `list` first, `get` as
   fallback (defensive across v1-generation clients).
2. **Spec's model-pair source `info.model ?? props.model` does not exist on
   the live `AssistantMessage`** (installed 1.18.29 type + live log: the
   pair is top-level `providerID`/`modelID` on the message object). The
   code accepts both shapes (`model` object first, top-level pair second).
   Without the fallback the trigger would have silently never fired live.
3. **The Unit 1 smoke's "live log size unchanged" invariant is unsatisfiable
   for a multi-second smoke on a live host** — the live plugin instance
   appends this session's own events in real time (measured: +696 B over the
   ~30s smoke). Replaced with the precise invariant: NO smoke-session line
   ever lands in the live log (tail-read the newly appended bytes and scan
   for the smoke sids). The sandbox still receives every smoke line.
   (The first Unit 1 smoke pass at 1-second runtime is why this never
   surfaced before.)
   Related: the live `message.updated` event carries `properties.sessionID`
   even though the static .d.ts only shows `properties.info` (same
   live-more-than-static pattern as `session.message`).

## DELIBERATELY NOT DONE

- Live acceptance (a live session crossing 85 % self-compacting once per
  busy cycle, no re-prefill stall) — out of scope per the spec; the smoke
  pins the exact send conditions so the planner/maintainer can verify the
  live run from `.opencode/temp/auto_resume.log` (`arm=`/`saturation=`/
  `trigger=`/`send-fail=` lines).
- Unit 3/4 (aborts, escalation, subagent special-casing, magic-context,
  NAP/TODO access) — deliberately absent, marked in the file header.
- No `compact_memory.ts`, probe, `src/`, `tests/` changes.
- No TODO.md entries — nothing found that the spec doesn't already cover
  (the three discrepancies above are design-wording vs reality, resolved
  defensively in-code; if the planner wants them as TODO entries for the
  spec/proposal correction, the content is above).

## Lessons

Spec "already-grepped" SDK facts should name the exact method/field
(`provider.list()`, top-level `providerID`/`modelID`) — the two wording
gaps above required live/static verification to resolve safely.
