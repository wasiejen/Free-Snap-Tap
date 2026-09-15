# 2026-09-13 compact_memory findings (live acceptance, iteration 1)

Status: REVISED 2026-09-15 (back to root) — Item 1 SUPERSEDED by the 2026-09-15
stop/compaction protocol (no approval owed); Item 2 stays your ruling;
see the revision at the end.

Live acceptance of the compact_memory fix ran this iteration via
worker-1 (session `ses_f6765a68bffeudOXmVzLROTYk6`, self-compact, then
planner rescue — full evidence in
`.opencode/agent/handover/handover_task_to_planner.md` and the loop
folder `plan1_ho_task_to_planner.md`). The mechanics are PROVEN:
compaction part `{"type":"compaction","auto":false}` in the DB, reload
directive in the tool output (byte-form per the plugin), budget store
v2 increment 1/3 (model recorded), COMPACT line in ctx.log.
The resume protocol you specified (resume same sessionID via task_id)
is codified in both role prompts — but the live test found one blocker
and one semantic question:

## Item 1 — resume overflow: self-compact near the window top makes the session UNRESUMABLE
- **Evidence:** worker-1 fired at ~40 messages of history (heavy
  prefill). Resume via `task_id` was rejected: `the request exceeds
  the available context size` (model limit 120K, opencode.jsonc). The
  tool reported keep `12 messages / 30000 tokens`, but the server's
  summarize payload schema has no keep key (your Q&A + the NAP open
  question) → the server retained far more than the requested keep;
  system prompt + retained history + 3.6K summary > 120K.
- **Options:**
  (a) Lower the worker/planner self-compact trigger well below the
      current L3 80 % (e.g. fire only at ≤ 50–60 %, so even an
      ignore-keep retention still fits the window after compaction);
  (b) server/registration-side: make the summarize endpoint honor a
      keep field (your domain — your "simplest version");
  (c) both.
- **Recommendation:** (a) immediately (a one-line prompt edit — I
  apply it on approval) and (b) as the durable fix on your side.
  Until (b), an agent compacting at 80 % of 120K ≈ 96K of history
  cannot be resumed at all — the L3 rule as written is a trap on
  this host.

## Item 2 — `time_compacting` is NULL after completion
- **Evidence:** session row (sesdata.cjs, post-completion):
  `time_compacting: null`. The compaction PART is the durable record;
  the flag is either a transient in-progress marker or not set for
  manual (tool-initiated) compaction — the live test cannot tell.
- **Question for you:** is `time_compacting` expected to persist for
  manual compactions? If yes → server-side look; if no → the NAP's
  acceptance wording ("compaction part + time_compacting flag") is
  corrected to "compaction part (the durable record)" and the probe /
  live-acceptance criteria follow.
- **Recommendation:** treat the compaction part as the durable
  acceptance criterion (the flag's semantics are your ruling).

--comment: this is also no longer up to date
- in my experience compaction works in context limit - never failed. with cross-session compaction this should be no longer a problem
  - i honestly do not understand ## Item 2

## Revision (2026-09-15, planner-1 — his comment above kept verbatim)
- **Item 1 (resume overflow): SUPERSEDED.** His ruling: compaction at the
  context limit never failed in his experience; cross-session compaction
  avoids the trap. The 2026-09-15 stop/compaction protocol (stop line ≈90 %
  gauge; order the worker to stop early; pre-compaction dump; cross
  `compact_memory`; `task_id` resume) is now codified in both role prompts —
  it subsumes the old recommendation (a) (lower the trigger to 50-60 %), so
  no further prompt change is made.
- **Item 2 (`time_compacting` NULL): stays his ruling** (server-side
  semantics). Operational acceptance is unchanged and already in use: the
  compaction PART in the DB + the COMPACT line in `temp/ctx.log` are the
  durable evidence; the flag is NOT required.
- Nothing left to approve — his one-move closure (implemented/ or rejected/)
  per his #0 backlog-reduction.


Maintainer ruling (2026-09-15, in 2026-09-15_backlog-decisions.md, D3): "move to implemented" — Item 1 superseded by the 2026-09-15 protocol; Item 2 closed per the recommendation (the compaction PART in the DB + the COMPACT line in temp/ctx.log are the durable acceptance criterion; the flag is NOT required).
