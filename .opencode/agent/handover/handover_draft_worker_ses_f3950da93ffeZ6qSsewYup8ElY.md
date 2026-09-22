handover_task_to_planner.md (IN PROGRESS checkpoint)
- Task: TODO #80 (spec at .opencode/agent/handover/handover_task.md)
- Status: investigation complete, implementation pending (checkpointed at stop line, self-compacting).
- What was learned/decided (the plan):

Facts (verified on disk)
- Branch opencode_test @ ef03bd0 (ahead 44, behind 1) — deliverable commit goes here.
- Plugin: .opencode/plugin/deactivated/auto_resume.ts (825 lines), stays deactivated.
- Smoke: .opencode/plugin/tests/auto_resume.smoke.mjs — 63 checks. Note: smoke line 40 loads .opencode/plugin/auto_resume.ts — the path pre-d322927→a000dfd. Since a000dfd moved the plugin into deactivated/ it wasn't updated; the smoke is currently red at import (file not found). First fix: path to deactivated/auto_resume.ts. (Verify by running before editing.)
- Gates: probe node .opencode/plugin/probes/handover_probe.mjs (241/241), pytest 459+1w ./.venv/Scripts/python.exe -m pytest -q, ruff ./.venv/Scripts/ruff.exe check --select F . (F=0).
- Working tree: M .opencode/maintainer/priority.md (maintainer's, not mine — leave uncommitted), 2 untracked compaction dumps (not mine — leave alone).

Item 3 verdict: (b) evidence + hypothesis (no forced code fix) + log line of fail-safe attribution added as part of change-1 area (scope= verdict line).
Evidence (from live log .opencode/temp/auto_resume.log, all UTC; read via node script, limited grep):
- 9× recovery= sid=ses_f39d250e9ffeheip2FVEeY5Fk6 attempt=1: 2026-09-21T23:11:22/27/32/37 (gen started 22:50:11Z), 23:40:41 (gen 23:12:03Z), 23:58:23/33/38/43 (gen 23:42:21Z). All attempt=1, ~5s apart (tick period).
- 9 surface= process generations: 14:25:48, 16:42:39, 20:32:42, 21:44:47, 21:49:49, 22:50:11, 23:12:03, 23:42:21, 23:58:52Z. Log's final line 23:58:54Z; deactivation commit a000dfd = 23:59:46Z → no plugin process since deactivation (consistent with it not currently in config, file now outside autoloaded .opencode/plugin top-level).
- attempt=1 repetition is reproducible under committed code (recoveryCount resets on every new busy L722, including injected-turn busy) = exactly the cap-unreachability root cause (change #2) — not an independent mystery.
- Scope paradox: for recovery= to be emitted, at routing time spawned.has(sid) || userHasMarker(msgs) must have been TRUE (L614, committed in all unit-4 commits since 8e4f778 — scope gate is in from day 1, verified by git show). Planner: checked 15 user text parts of the window, no marker; sid not in spawned.
- Hypotheses (ranked): H1 marker in the session's pre-window user history — userHasMarker scans full session messages(), and planner's check only covers 23:40–23:58 window parts (the dump ses_f39d250e..._c0.md contains 68 lines mentioning the marker string, but they appear as ASSISTANT analysis text so far; unverified user parts pre-window — the one open DB check). H2 running variant ≠ committed file (process started from an earlier / dev copy of plugin source). Both become testable: new scope= verdict log line + surface= v=<hash> version ID will pin verdict + code state in the next incident.

Implementation plan (exact)
Details — changes 1..4, smoke changes, gates, commit plan, hash note

Resume instructions
1. Read this file + spec (handover_task.md) + the 2 files (plugin + smoke).
2. Run the smoke as-is → confirm the import-path red baseline (expected).
3. Apply plugin changes in the order below; apply smoke changes; run smoke until green; run gates; update TODO #80 status line; write final handover (replace this checkpoint content, keep evidence); 1 commit (code + smoke + TODO + handover; exclude .opencode/maintainer/**, leave priority.md alone); final message with hash + item-3 verdict + count.

OK, plugin plan in exact form:

Change 0 (prerequisite): smoke's import path → .opencode/plugin/deactivated/auto_resume.ts (smoke line 40).

Change 1 — Agent retention (plugin):
- firstUserAgent(msgs): string | null — scan msgPairs in order; the first pair with info.role==="user" and typeof info.agent==="string" and a===…; wait typeof a === "string" && a !== "" → return a; else null.
- Watch interface: add userAgent?: string | null (undefined = not yet resolved; null = resolved, absent).
- resolveInjectAgent(sid, w): Promise<string | null>:
  - if w.scope === "planner" → PLANNER_AGENT_ID (no fetch).
  - else if w.userAgent !== undefined → return w.userAgent.
  - else: fetch messages once (client.session.messages({path:{id:sid}})); on success: w.userAgent = firstUserAgent(msgs); return that. On throw / missing messages fn: w.userAgent = null. If the resolved value is null → log agent-omit= sid=${sid} no user agent field (one line). Return null.
- sendSelfCompact (unit 2): after the trigger log line, const agent = await resolveInjectAgent(sid, w); build body: const body: Record<string, unknown> = { parts: [{ type: "text", text: selfCompactText(...) }] }; if (agent) body.agent = agent; then await sess.promptAsync({ path: { id: sid }, body });.
- routeScopedIdle (unit 4): after successful msgs fetch → w.userAgent = firstUserAgent(msgs); (cache for unit 2). In the continue branch: const agent = await resolveInjectAgent(sid, w); (scoped → immediately PLANNER_AGENT_ID, no extra fetch) → body with agent, same shape.
- Also add scope verdict log line: in routeScopedIdle's verdict block, log after decision scope= planner|none sid=${sid}: planner: log(\scope= planner sid=${sid}\`)` / none: `log(\`scope= none sid=${sid}\`)` (also on the none early-return path — the verdict log happens inside both branches before the return).
- Header comment: add one line documenting #80 in the UNIT 2/UNIT 4 section? (small comment; optional — keep minimal: one comment near the new functions.)

Change 2 — Recovery cap semantics (plugin):
- Module state: const pendingInject = new Map<string, number>(); + const PENDING_INJECT_TTL = 120_000;
- busy branch of armEvent:
w.armed = true;
w.attempts = 0;
const sentAt = pendingInject.get(sid);
if (sentAt !== undefined && Date.now() - sentAt <= PENDING_INJECT_TTL) {
  pendingInject.delete(sid); // injected turn — not a new busy
  w.idlePending = false; w.status = "busy";
  log(`arm= sid=${sid} injected`);
} else {
  w.recoveryCount = 0; // only a real new busy resets the cap
  w.idlePending = false; w.status = "busy";
  log(`arm= sid=${sid}`);
}
- In unit 4's continue send: after await sess.promptAsync(...) succeeds (inside try, after the await): pendingInject.set(sid, Date.now());
- Cap stays 2.

Change 3 — No forced code fix (verdict (b)); scope= verdict log line added under change 1 (fail-safe / attribution only, no behavior change).

Change 4 — surface= version ID (plugin):
- imports: add createHash from "node:crypto", fileURLToPath from "node:url" to existing imports (lines 107–108).
- function codeVersion(): string { try { return createHash("sha256").update(readFileSync(fileURLToPath(import.meta.url))).digest("hex").slice(0,8); } catch { return "unknown"; } }
- probeSurface: log("surface= v=" + codeVersion() + " " + parts.join(" "));

Smoke changes (auto_resume.smoke.mjs):
1. Line 40: path → deactivated.
2. Re-derive existing u4 classify (lines 552-553): const contSends = () => u4Sends.filter(c => ((c.body?.parts?.[0]?.text ?? "")).includes("agent_readme_post_compaction.md")); and const spawnSends = () => u4Sends.filter(c => ((c.body?.parts?.[0]?.text ?? "")).startsWith(MARK) && c.body?.agent === "planner_Q3S_160K"); — hmm, note: restartText starts with MARK. Keep both.
3. New check: "UNIT 4: continue send carries agent=planner_Q3S_160K (explicit)" — all contSends have body.agent === PLANNER (verify on first batch: at check time contSends().length===1? Check at a point where sends are settled, after batch A).
4. After batch C (after existing send-total check), new cap section, on the u4 client (still active) for new sid ses_u4_cap (before re-factoring the u2ag client):
   - msgScript.set("ses_u4_cap", mkPairs(["user", MARK + " iteration 1", "assistant", "Mid-unit, no closing line."]));
   - Fire busy → idle; waitUntil line recovery= sid=ses_u4_cap attempt=1 appears (1st time) waitUntil needs count-aware predicate — line existence + count helper: countRecovery(sid,n) = readLines().filter(l=>l.includes(recovery= sid=ses_u4_cap attempt=${n})).length.
   - Fire busy (injected — consumed) → idle; waitUntil attempt=2 line exists.
   - Assert: arm= sid=ses_u4_cap injected line present after busy #2.
   - Fire busy (injected — consumed) → idle; waitUntil route= restart spawn sid=ses_u4_cap line exists and u4Creates grew by 1. Assert no attempt=3 line.
   - Fire busy (real — no pending mark) → idle; waitUntil attempt=1 line count === 2 (re-issued after reset).
   - Assert: exactly 2 arm= ... injected lines for ses_u4_cap.
5. New section, final factory for the new u2ag client: promptAsync spy u2agCalls, messages spy (script map): ses_u3_new → mkPairs(["user","plain direct", "assistant","Done. action: stop"]) (stop route, no send); ses_u2_agnet → [ {info:{role:"user",agent:"worker_Q3S_160K"},parts:{type:"text",text:"plain"}}, {info:{role:"assistant"},parts:{type:"text",text:"stop test"}} ] hmm — the last assistant for unit-4 routing: to avoid a continue, text needs a recognizable action line: "Done. action: stop". Give each sid's assistant line a action: stop.
   - ses_u2_agnone → user info {role:"user"} (no agent) + assistant "action: stop".
   - Fire for each: busy, msgUpdated(sid,"assistant",{total:80000},MODEL), idle.
   - Wait for u2agCalls.length===3.
   - Checks: ses_u3_new send (scoped, scope=planner cached from batch A) → body.agent==="planner_Q3S160K", text contains RATIO_HI, path.id OK; ses_u2_agnet send → body.agent==="worker_Q3S160K" (agent of first user message); ses_u2_agnone send → no "agent" key in body + log line agent-omit= sid=ses_u2_agnone present.
   - Also: unit-4 routes for these: scope= none lines for both new sids; route= stop for ses_u3_new; no extra u2ag sends (u2agCalls.length stays 3).
6. surface check: chk("surface line carries the v= code version identifier (8-char sha256 prefix)", surf && /\bv=[0-9a-f]{8}\b/.test(surf), surf ?? "").
7. Strengthen ses_u4_plain check: add readLines().some(l => l.includes("scope= none sid=ses_u4_plain")) to existing conditions (keep existing parts


--- manual compaction summery (added 2026-09-22_13-19)

Objective
- Implement TODO #80 (auto_resume fix) per the committed task spec: agent-preservation in promptAsync bodies, recovery-cap semantics fix, scope verification of the mis-scoping incident, surface= version identifier, and smoke-test extension. Work on opencode_test branch, verify against gates, make ONE commit, write handover file.
Important Details
- Task spec: .opencode/agent/handover/handover_task.md — the contract with ordered changes, definition of done, DO-NOT-touch list, baselines.
- Plugin location: .opencode/plugin/deactivated/auto_resume.ts (deactivated since commit a000dfd; must stay deactivated).
- Smoke path mismatch: .opencode/plugin/tests/auto_resume.smoke.mjs line 40 loads .opencode/plugin/auto_resume.ts (old path) — file was moved to deactivated/ by a000dfd but smoke path never updated. Must fix to deactivated/auto_resume.ts.
- Branch: opencode_test at ef03bd0 (ahead 44, behind 1). Verify with git branch -v before committing.
- Baseline smoke: 63 checks green at eaef397 (pre-deactivation); current smoke is broken (import path).
- DO-NOT-touch: .opencode/maintainer/**, live config, other plugins. Modified .opencode/maintainer/priority.md and untracked compaction dumps are pre-existing — do NOT commit them.
- Shell: Git-Bash (bash 3.6, MINGW64); node for smoke; file tools for writes (no > redirection).
- Commit routine: ONE commit containing code + TODO.md #80 status update + handover file.
- Final message must include: what changed, item-3 verdict, smoke/gate results, commit hash.
- Unit 4 scope gate (from 8e4f778): spawned.has(sid) || userHasMarker(msgs) → planner; else none → no action. Scope cached per watch.
- msgPairs unwraps SDK RequestResult { data } wrapper (fix from eaef397).
- recoveryCount (L182, cap check L631-633): currently reset on every new busy (L722) → cap unreachable while plugin keeps injecting.
- spawned Map (L194): populated only by spawnPlanner (L438).
- Commit hash in TODO/handover: circular reference problem (hash unknown before commit); need to check repo precedent for how prior entries handled this.
Work State
Completed
- Read task spec, repo overview parts (commands, testgate), plugin source (truncated at ~L27), smoke test (truncated at ~L31), _smoke_base.mjs.
- Confirmed on-disk state: auto_resume.ts only in deactivated/; top-level .opencode/plugin/ has no auto_resume.ts.
- Confirmed branch: opencode_test at ef03bd0.
- Git history established: d322927 → d90973b → ee75861 → 4b1a965 → 8e4f778 → d4ef76e → eaef397 → a000dfd (deactivation) → 05a3bde → 0273249 → ef03bd0 (spec).
- Confirmed a000dfd did NOT update smoke path (only moved file + edited ideas.md).
- Confirmed Unit 4 scope gate exists since 8e4f778 (committed code always has scope check).
- Read deactivated/dev_plugin_hot_loaded.ts — a hot-reload dev plugin (untested, likely irrelevant to the incident).
- Extensive implementation design reasoning completed for all 4 changes (agent resolution, pendingInject TTL map, scope log line, codeVersion hash, smoke check additions).
Active
- Evidence gathering for item 3 (scope verification): was about to run bounded greps on:
- Live log .opencode/temp/auto_resume.log (grep for ses_f39d250e9ffeheip2FVEeY5Fk6, surface=, recovery= lines).
- Session dump .opencode/archive/sessions/compaction_dumps/ses_f39d250e9ffeheip2FVEeY5Fk6_c0.md (grep for autonom, auto-resume, user parts).
- opencode.jsonc for plugin path references.
- TODO.md #80 current text + precedent for commit-hash references in status lines.
- No code changes made yet — all edits still pending.
Blocked
- Smoke is currently red (broken import path) — must fix as part of the work.
- Item 3 verdict depends on evidence not yet collected (live log, session dump, config).
- Commit-hash circular reference in TODO/handover needs precedent check.
- opencode.jsonc grep returned no "plugin" matches in the output shown (truncated) — need to verify how plugins are discovered (auto-scan vs. explicit path list).
Next Move
1. Collect item-3 evidence (bounded greps): live log for sid ses_f39d250e9ffeheip2FVEeY5Fk6 + surface= lines; session dump for autonom/marker in user parts; opencode.jsonc plugin discovery mechanism; TODO.md #80 current text + hash-reference precedent.
2. Implement all 4 changes in .opencode/plugin/deactivated/auto_resume.ts: (a) resolveInjectAgent() helper + firstUserAgent() + w.userAgent cache + agent in Unit 2 & Unit 4 promptAsync bodies; (b) pendingInject Map with 120s TTL in busy handler (injected busy skips recoveryCount reset); (c) scope= verdict log line; (d) codeVersion() sha256 hash in surface= line. Add userAgent?: string | null to Watch interface.
3. Fix smoke import path → deactivated/auto_resume.ts; extend smoke with ~10-11 new checks (agent in Unit 2/4 bodies, cap semantics with injected-vs-genuine busy, scope line, version identifier); update contSends/spawnSends classifiers (now both carry agent); add new sids to smokeSids.
4. Run smoke (node .opencode/plugin/tests/auto_resume.smoke.mjs) → must be green.
5. Run gates (pytest + ruff + handover_probe per repo_commands.md).
6. Update TODO.md #80 status line + write .opencode/agent/handover/handover_task_to_planner.md.
7. ONE commit on opencode_test (code + smoke + TODO + handover only; NOT the pre-existing modified/untracked files).
Relevant Files
- .opencode/agent/handover/handover_task.md: the task spec (contract).
- .opencode/plugin/deactivated/auto_resume.ts: the plugin to modify (all 4 changes land here).
- .opencode/plugin/tests/auto_resume.smoke.mjs: smoke suite to fix (import path) + extend (new checks).
- .opencode/plugin/tests/_smoke_base.mjs: shared smoke helpers (loadRepo, freshSandbox, makeChecker).
- TODO.md: entry #80 status line to update in the commit.
- .opencode/agent/handover/handover_task_to_planner.md: handover file to write (in the commit).
- .opencode/temp/auto_resume.log: live log (evidence for item 3; read-only grep).
- .opencode/archive/sessions/compaction_dumps/ses_f39d250e9ffeheip2FVEeY5Fk6_c0.md: mis-scoped session dump (evidence for item 3).
- opencode.jsonc: live config (verify plugin discovery; DO-NOT-touch).
- .opencode/agent/prompts/repo/repo_commands.md: gate commands, shell conventions, commit routine.
