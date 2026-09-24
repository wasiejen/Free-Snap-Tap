# Planner memory

Seeded 2026-09-18 from the memory-pilot seed instruction (direct session
ses_f4c039ae2ffeRqvdPqGu8IdB37). Seeds only: high-value lessons already VERIFIED from
actual planner work; nothing that is authoritative elsewhere (prompt /
knowledge / NAP) is re-stated.

### MEM-0101: Live acceptance is an OBSERVATION-side test — never verify against your own perceived args

- Type: `learned`
- Status: `active`
- Confidence: `high`
- Scope: planning / running / verifying any live acceptance of an
  observer-mediated mutation (numword escape, fuzzy resolution, any
  intercept_observer feature)
- Keywords: live-acceptance, intercept.log, observer, post-mutation,
  false-repeat, self-perception, escape
- Memory: an acceptance test for an observer-mediated mechanism has TWO
  sides, and the test must verify BOTH: (a) the MECHANISM side — the
  pre-mutation `orig=`/`value=` lines in `.opencode/temp/intercept.log` +
  the on-disk artifact; (b) the PERCEPTION side — the agent CANNOT see its
  own pre-mutation args (only the corrected form enters its context), so a
  corrected value in your own view does NOT prove you "wrote it twice" —
  that is a false-repeat. A unit is accepted only when BOTH sides pass; a
  "repeat" observation alone proves nothing either way — cross-reference
  the log first.
- Why it matters: in the 2026-09-18 escape acceptance the planner's own view
  showed it repeating `a7b c861d` literal three times (a perceived
  generation loop); the log proved all four writes carried the sentinels and
  all were `pair-resolved` — the feature worked the whole time. The
  perception mechanism (measured 2026-09-17, #73) + the maintainer's ruling
  (2026-09-18) make self-observation NON-ADMISSIBLE evidence for
  mutation-behavior claims. Future planners: put this cross-reference into
  any worker spec that verifies observer behavior, and keep it in your own
  acceptance protocol — otherwise a working unit gets re-tested, or a real
  defect gets waved through on "it looked like I typed the literal."
- Evidence: ses_f4c039ae2ffeRqvdPqGu8IdB37, direct session 2026-09-18
  (escape live acceptance); `.opencode/temp/intercept.log` 2026-09-18_12-19
  — 4x `kind=escape scope=content ... pair-resolved` lines with `orig=` the
  sentinel form and `value=` the field-2 digits, `hits=2`; corrected
  file-on-disk readback + unmarked control line byte-identical; maintainer
  ruling on the perception mechanism (same session). Related mechanism fact
  (the post-mutation `state.input` storage) already lives in
  `knowledge/knowledge_plugins.md` — this memory carries the TEST-DESIGN
  ruling, not the mechanism.
- Verified: 2026-09-18 (the acceptance run itself)
- Related: MEM-0102 (close-out protocol — acceptance is its final phase)
- Review when: the observer ever logs pre-mutation evidence INTO the
  session DB (perception gap closed), or acceptance moves to a harness
  (the P6 loop_stats draft).

### MEM-0102: A tool/plugin unit closes with a MAINTAINER-DOMAIN HANDOFF — the planner re-verifies from files at the next session

- Type: `learned`
- Status: `active`
- Confidence: `high`
- Scope: closing any unit that lands a tool/plugin/config change the
  maintainer must register or paste (submit, #0 escape, R1-R7.5, and any
  future tool build)
- Keywords: handoff, pending, maintainer-domain, registration, paste,
  restart, close-out, live-acceptance
- Memory: the close-out for such units is a TWO-PHASE protocol with a
  file-level boundary. Phase 1 (planner's, closable): build + gate green +
  bookkeeping + NAP updated + close-summary pending list NAMING every
  maintainer-domain item verbatim ("registration in the live
  opencode.jsonc + per-agent grant; LIVE ACCEPTANCE after restart;
  AGENTS.md paste <which line, where the draft lives>"). Phase 2 (maintainer
  runs it — registration/paste at his restart cycle): the REOPENING planner
  session verifies FROM FILES FIRST (grep the live opencode.jsonc for the
  tool grant; read the pasted text in AGENTS.md / the live config; `git log`
  for the maintainer's own commit) and only then fires the live acceptance
  (MEM-0101 protocol). Until the file verification passes, the pending
  items stay OPEN — never mark a maintainer-domain item done from the
  worker's summary or from memory.
- Why it matters: this is the standing close pattern of this repo — every
  tool/plugin unit since R1 has closed this way (R1/R2/#73, then
  `submit` and `#0 escape` 2026-09-18), and it is what makes his restart
  cycles testable without him asking anything. It also fixes a real failure
  mode: a reopening session that fires acceptance against an UNREGISTERED
  tool (the plan1 stale-roster incident did nearly that), or marks the
  pending line closed on trust.
- Evidence: fuzzy/numword decision-record.md R1-R7.5 "LIVENESS ACCEPTED"
  lines; plan1_summary.md + plan2_summary.md "Pending (maintainer domain)"
  sections; NAP archive lines for the FST + submit + escape closures;
  ses_f4c039ae2ffeRqvdPqGu8IdB37 2026-09-18 (the reopen-verify-accept cycle
  executed end-to-end for BOTH tools + the AGENTS.md paste).
- Verified: 2026-09-18 (cycle executed twice, once for both units at once)
- Related: MEM-0101
- Review when: the maintainer automates registration (no per-tool phase),
  or the pending-list format changes in the planner prompt.

### MEM-0103: Maintainer files live in the tree and grow as thoughts mature — single-tree status quo (ruling 2026-09-18)

- Type: `decided`
- Status: `active`
- Confidence: `high`
- Scope: how the planner treats the maintainer's live files (live config,
  AGENTS.md, prompts, drafts, priority) and when file content counts as a
  work item
- Keywords: live-file, wip, handoff, commit-point, status-quo,
  file-lifecycle, priority-move
- Memory: the maintainer live-edits his files across days as thoughts
  mature — mostly growth, never "done", they stay open on his screen
  uncommitted ("all my files are --wip and will never be complete").
  STATUS QUO (his ruling 2026-09-18: "i am fine as it is") — the 2-repo /
  draft-separation variants were considered and rejected; his stated
  reasons: sync friction, and live markers / inbox / draft channels only
  work in a SHARED tree (he sees my uncommitted progress live too).
  Channel semantics: marker / inbox / handoff content WORKS uncommitted
  (that is how markers reach me); he commits his live files before bigger
  tests or when he wants the option for me to move handled priority items
  (the move = commit-point action). He does NOT use `--wip` broadly (his
  files are all perpetually mid-state); if he places it, strictest
  handling applies: no edit, no stage, and NO READ until cleared — the
  "not-listed-as-unread in a close" variant means exactly that: a
  mid-state file's content is mid-thought, reading copies an already-stale
  version into my context, and the close message lists which wip files
  stayed unread. My side: named-path commits only, never `git add -A`
  (one incident: dc3f137 disclosure, NAP Standing).
- Why it matters: prevents re-litigating the 2-repo variant in a future
  session and makes handling of his files unambiguous: read freely unless
  `--wip`, never stage, uncommitted content is not a task unless a
  marker / inbox / handoff designates it.
- Evidence: maintainer message, direct session
  ses_f4c039ae2ffeRqvdPqGu8IdB37 (2026-09-18: "i am fine as it is" + the
  lifecycle explanation incl. the ideas-file habit); dc3f137 disclosure;
  this session's flag-only handling of his uncommitted p2 STATUS line and
  memory files (f3da151 handed over by him, 1740bb3 his live edits).
- Verified: 2026-09-18
- Related: MEM-0102 (phase-2 verification shares the file-verification
  discipline)
- Review when: the maintainer starts using `--wip` routinely, or a
  separate-draft-repo variant actually lands.

## MEM-0104 — A context-limit failure message can arrive AFTER the work is complete; rebuild from files before resuming
- What: a Task-tool failure of `context_length_exceeded: the request exceeds
  the available context size` ALWAYS means the sub-agent RAN and hit its
  context limit (maintainer ruling 2026-09-21) — including the case where the
  session finished the ENTIRE task and died only before its last steps (the
  final commit, the feedback submit). The work then sits UNCOMMITTED in the
  working tree.
- Do: on such a message — never assume lost work and never reflexively
  relaunch: rebuild from files FIRST (git status → modified files; read the
  working-tree handover file; run the gate yourself), then either land the
  last steps yourself (planner completing the worker's commit + feedback) or
  resume via task_id; a resume WITHOUT compaction is valid when budget allows
  and the maintainer orders it (compaction is not the default recovery).
- Why (evidence): plan5 (2026-09-21): worker-6's launch reported
  context_length_exceeded, but the session ses_f3ab3c67dffeujQ8L1ucfWu8k8 had
  completed the whole compact_memory unit A build (handover complete, all
  green); the planner verified probe 241/241 + 10/10 smokes + pytest 459+1w +
  ruff F=0 and landed the commit 6864bc0. Contrast: the FIRST launch of the
  same task failed with a DIFFERENT signature ("Assistant response prefill is
  incompatible with enable_thinking") and never ran — a genuine host-side
  failure. File state, not the message, is the discriminator.
- Verified: 2026-09-21 (planner-5, plan5, looprun 2026-09-21_15-33)
- Related: MEM-0102 (verify-from-files-first discipline); knowledge_context.md
   "Task failure messages: context-limit hits, not failed starts"
- Review when: the failure-message vocabulary grows, or the resume protocol
   changes.
- 2026-09-22 addendum (maintainer): the work can be COMMITTED — the worker
   committed (97fccfc) and only hit the limit producing its final result, so
   check `git log` for a fresh worker commit before deciding. The limit cannot
   be hit "instantly" (the worker took time to run), so the failure is
   evidence it ran; in the SERIAL setup that time is    invisible to the planner
   (MEM-0105), so judge from the logs / git log, NOT from a perceived elapsed
   time. #85 part 1 (97fccfc) is the 2026-09-22 instance.

## MEM-0105 — In the serial (one-slot) setup a delegation is INSTANT to the planner; the worker experiences the time
- Type: `learned`
- Status: `active`
- Confidence: `high`
- Scope: any delegation (worker / explorer) under the one-model-slot host
- Keywords: serial-slot, delegation, block-resume, elapsed-time, invisible-runtime, context-limit
- Memory: delegating a worker "exits" the planner's turn — the planner BLOCKS and
   generation resumes only when the worker returns. From the PLANNER's perspective
   any delegation completes without delay (no time passes for me while the worker
   runs); the WORKER is the one that experiences the runtime (its context grows
   over minutes). So the planner cannot use "how long it took" intuition — the
   only reliable evidence of what the worker did is the committed state / the
   logs / a context-limit failure (MEM-0104).
- Why it matters: the planner reflexively reads a context-limit failure as
   "instant, so the worker didn't run" — but the worker's runtime is invisible to
   it, so the failure is actually proof the worker ran (and may have committed).
   Check the files, don't guess from perceived time.
- Evidence: 2026-09-22 direct session ses_f39d250e9ffeheip2FVEeY5Fk6 — the #85
   part-1 launch returned a context-limit failure "instantly" to the planner, but
   the worker had run + committed (97fccfc) + built the #82 toggle in-task; the
   maintainer's serial-slot explanation (planner blocks + resumes; worker
   experiences the time).
- Verified: 2026-09-22
- Related: MEM-0104
- Review when: the host gains multiple model slots, or delegation becomes async.

## MEM-0106 — A sub-agent's self-compaction returns the COMPACTION SUMMARY as the Task result; recognize it by the `## Objective` form + the ctx.log COMPACT line
- Type: `learned`
- Status: `active`
- Confidence: `high`
- Scope: interpreting any worker/planner Task result after a mid-task self-compact
- Keywords: compaction-summary, self-compact, Objective-form, ctx.log, COMPACT-line, task-result, resume-task_id
- Memory: when a sub-agent self-compacts mid-task, the returned text is the
   COMPACTION SUMMARY (the Work State form: `## Objective` / `## Important Details`
   / `## Work State` / `## Next Move` / `## Relevant Files`) — generated by the
   compaction model, NOT a message the agent wrote. Two independent signals:
   (a) IN-RESULT — the summary always starts with `## Objective` (the
   SUMMARY_TEMPLATE forces "Output exactly the structure"); a normal worker
   closing (a short handover pointer) never uses that form. (b) GUARANTEED
   EXTERNAL — our compact_memory tool writes `<date> <model> COMPACT <sessionID>
   tokens=N messages=N` to `.opencode/temp/ctx.log` on verified success; grep it
   for the session ID. On an ambiguous return: recognize the Work State form →
   confirm via the ctx.log COMPACT line → resume via task_id using `## Next Move`.
   No worker convention needed (the compaction model + our tool already emit the
   signal).
- Why it matters: the planner first misread the compaction summary as a worker
   message and was unsure whether to resume. The two signals make the recognition
   reliable with no new mechanism and no error-prone convention.
- Evidence: 2026-09-22 direct session ses_f39d250e9ffeheip2FVEeY5Fk6 — the worker
   (ses_f359ce94...) self-compacted; its Task result was the Work State form;
   ctx.log carried `COMPACT ses_f359ce94... tokens=30000 messages=12`; the
   maintainer confirmed the summary IS the signal + the ctx.log line is the
   guaranteed one.
- Verified: 2026-09-22
- Related: MEM-0104, MEM-0105
- Review when: the compaction summary template changes (the `## Objective` start)
   or the ctx.log COMPACT line format changes.

## MEM-0107 — Worker limit-death forensics live in the dump's step-finish meta; the in-flight write is salvageable from the last message
- Memory: when a worker session dies mid-task (empty Task result, NO ctx.log
  COMPACT line for it), dump it (`node .opencode/agent/scripts/db/dump_session.cjs
  <sid>`) and read the LAST step-finish meta: `reason=length` + a large
  `output=N` = the per-turn OUTPUT cap cut the generation (a truncated write
  tool call → the file change never lands — the tree stays clean for that
  file), while `tokens.total` at the model's window = the context wall. The
  dump's per-message byte sizes reveal where the window went — a worker's own
  giant outputs (design/plan prose, 15k+ tokens per message) can burn MORE
  than the file reads. The in-flight write is salvageable VERBATIM: the dump's
  last message = everything from the last `## msg_` header to EOF. Successor
  handoff = the on-disk uncommitted diff + the salvage file + the spec, with
  explicit instructions: write in chunks (≤ ~8KB ≈ 2k tokens per write/edit),
  read ONLY the needed sections (not whole files), run the smoke early and fix
  reds incrementally. A cross-compact + task_id resume of the dead session does
  NOT save the rework when the kill was an output-cap mid-write (the text must
  be re-emitted anyway) AND costs a same-model single-slot flush of your own
  session — the fresh relaunch with salvage is the cheaper deterministic path.
- Why it matters: plan8 (2026-09-23) worker-12 died exactly this way (23,156
  output tokens cut mid-smoke-write, total 170,238 = the 170k wall; ~34k of
  the window were two planning-prose messages). Compaction could not have
  saved the smoke re-emission; the salvage made the fresh relaunch near-zero
  rework.
- Evidence: 2026-09-23 plan8 (planner ses_f33f1eb98ffeFvrnTdmTzmyE2x): dumped
  ses_f33ee8eabffeaE0xuwZ7lc65NR — machine pass over per-message bytes
  (17.2k + 16.4k token output planning messages; final step
  reason=length output=23156 total=170238); smoke file untouched in the tree;
  74KB salvage at .opencode/loop/autorun-2026-09-21_15-33/
  plan8_worker12_smoke_draft.md.
- Verified: 2026-09-23
- Related: MEM-0104 (rebuild from files on a limit failure), MEM-0106
  (self-compaction signals — the COMPACT line is the thing ABSENT here).
- Review when: the dump format changes (step-finish meta / `## msg_` headers),
  or chunked-write guidance proves unnecessary in a later looprun.

## MEM-0108 — NEVER launch requests at the backend inference server (the single llama-swap model slot) — a direct request evicts the live session's own model

- Rule (maintainer ruling 2026-09-24, direct session): agents NEVER
  launch ANY request at the backend inference server (the
  OpenAI-compatible llama-swap endpoint — 192.168.178.20:8033 as of
  2026-09-24; the address may move) — not for speed tests, not for
  probes, not "small" requests, not even enumeration (GET /v1/models).
  All model traffic goes through opencode sessions only. The backend is
  a SINGLE model slot: it swaps in whatever the active session needs —
  a direct request swaps out whatever is live, INCLUDING the requesting
  agent's own model (which then must be swapped back in at its next
  turn). The maintainer alone touches the backend (e.g. moving the
  context limit there — he can do that without opencode.jsonc changes).
- Why it matters: a direct 80k-token prefill probe at
  Qwen3.8-27B-Compaction returned empty (TTFT null, no usage) after
  ~7 s and kicked the planner's own model (Qwen3.8-27B-Q3S-230K-slow)
  out of the backend mid-session. The probe was also REDUNDANT — the
  maintainer had already measured prefill in his fork test (a fork of
  the planner session driven to the context limit on the Compaction
  model).
- Evidence: 2026-09-24 (planner ses_f30493f9effeuQRFc3ijNON166, direct
  session): my own prefill_test.mjs against the backend
  /v1/chat/completions; maintainer: "you kicked your own model out of
  the backend with a command ... NEVER!".
- Verified: 2026-09-24 (measured incident, maintainer-confirmed).
- Related: MEM-0105 (single-slot setup); the canonical safety-limits
  home is repo_overview.md (maintainer-owned — agents do NOT edit it
  directly; a one-line Safety entry was proposed in the 2026-09-24
  session; no safety section existed there yet); AGENTS.md "Safety
  limits" points at repo_overview.md.
- Review when: the backend gains multi-slot/queueing or a dedicated
  test endpoint, or the maintainer explicitly authorizes a specific
  direct request for a measured run (then the rule's scope narrows to
  "only explicit maintainer-authorized runs").
