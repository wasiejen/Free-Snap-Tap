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
