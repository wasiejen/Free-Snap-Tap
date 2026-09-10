# Looprunner prompt proposal — from the Planner (autonomous session, 2026-09-10)

Status: PROPOSAL ONLY — the maintainer applies this to `.opencode/prompt_looprunner.md`
(and the matching `opencode.jsonc` permission change, see §5). This file does not
modify the live prompt.

Inputs reviewed:
- current `.opencode/prompt_looprunner.md` (27 lines, incl. the embedded planner task
  text and the maintainer's "Ideas" comment block),
- the gemini proposal (via maintainer message),
- the Looprunner's own 8-point proposal (via maintainer message),
- `opencode.jsonc` (live agent config — launch mechanics + permissions),
- `prompt_agent_planner.md` (planner conventions — the action-line protocol must not
  conflict with it), `agents_repo.md` + `handover_planner.md` (NAP).

## 1. Key facts that shape the design (from `opencode.jsonc`, live)

- `looprunner_Q4_120k`: `mode: primary`, temperature 0.1,
  permissions `task: allow`, `edit: deny`, `bash: deny`, `webfetch: deny`.
  Consequences:
  - The Looprunner CANNOT launch the planner via CLI (`opencode run …` needs bash) —
    it must use the **Task tool** (`subagent_type: planner_Q4_120K`; that agent is
    `mode: "all"`, i.e. launchable as a subagent).
  - The Task tool's `task_id` parameter natively supports **resuming** a previous
    subagent session — this is the implementable form of the "resume" idea
    (maintainer's Ideas comment: "resume the session via --session option?").
  - The Looprunner CANNOT write files today (`edit: deny`) — so "write loop_log.md"
    and "append suggestions to prompt_looprunner.md" both need a scoped permission
    change (maintainer call, §5). If the maintainer refuses it, drop items 6/7 from
    the prompt and the looprunner only prints (summaries/suggestions stay in the
    console log).
- The Looprunner's context accumulates EVERY printed closing message (verbatim print
  is the maintainer's log) plus the raw Task-tool results. Budget planning must
  assume ~2–4k tokens per planner cycle → roughly 15–30 cycles per 120k looprunner
  life. The 80 % summary-write exists precisely to make a looprunner restart cheap.
- The planner prompt (`prompt_agent_planner.md`) currently has NO closing-action
  convention. The action line therefore belongs in the EMBEDDED task text inside
  `prompt_looprunner.md` (the looprunner controls the per-session task message;
  `prompt_agent_planner.md` stays untouched — it is the shared planner system prompt).

## 2. Point-by-point verdict on the Looprunner's 8 points

| # | Point | Verdict | Reason (short) |
|---|-------|---------|----------------|
| 1 | Structured closing-action protocol (`restart` / `ask_maintainer: <q>` / `stop`) | **AGREE — adopt** | Highest-value change. Needs parse-fallback for a quantized model: read the LAST `action:` line, case-insensitive, default `restart` if missing/unclear. Also requires fixing the embedded text "no questions to the maintainer possible" (contradicts asking — reworded to "no direct questions mid-run; ask at closing via the action line"). Resolves maintainer's Ideas comment #3. |
| 2 | `@loop` / `@looprunner` override prefix | **AGREE — adopt** | Makes the confusing "Ignore the messages you get from the user/maintainer" precise: prefixed = for the Looprunner (act), un-prefixed = for the Planner (append verbatim). One mechanic note: a running subagent cannot be interrupted, so loop commands take effect at the next closing — the prompt says so explicitly. |
| 3 | `.opencode/loop_state.json` (planner writes, looprunner reads as fallback) | **DISAGREE — reject** | Second channel that can DISAGREE with the closing message (which wins? = more prompt text to resolve). The NAP (`handover_planner.md`) already IS the durable state — the planner is contractually required to keep it current before stopping. Parse failure is cheap: default `restart`. If the looprunner session dies after a planner close, `loop_log.md` (point 6) + the NAP cover recovery. Keep ONE channel. |
| 4 | Early stop + handover; looprunner names the handover path in the task message | **AGREE, adjusted** | Early stop is already in the embedded text ("stop early if needed") — keep. Adjustment: the looprunner does NOT need to name the handover path in the task message — the planner's orientation protocol (planner prompt step 1–3) already reads AGENTS.md / agents_repo.md / NAP / TODO itself. Adding a path line would break the clean "do not deviate, only append maintainer messages" rule. |
| 5 | `action: resume` (same subagent session via task_id) | **PARTIAL — optional only** | Mechanically available (Task tool `task_id`), and the use case is real: the `ask_maintainer` pause flow (planner paused at ~50–60 % with full in-progress context — resuming after the answer avoids a full re-orientation). But it must NOT be the normal path: a resumed session starts in the old heavy context, which is exactly what the fresh-restart loop is for. Rule: fresh restart always, except when the action line itself says `resume`. One sentence in the prompt; maintainer may drop it entirely for the absolute minimum. |
| 6 | Self-check ~80 % → write loop summary before the 85 % line | **AGREE — adopt** | The current "then create a summary" at 85 % is too late (writing needs ~10–15k headroom). Split it: WRITE the summary at ~80 %, STOP at 85 %. File: `.opencode/loop_log.md` (append). Note: the looprunner cannot restart ITSELF — clean stop + printed summary, maintainer restarts. Budget signal = the injected `ctx:` lines (no bash for self-gauge). |
| 7 | Maintenance feedback protocol formalized | **AGREE — adopt** | Adopt with a MECHANICAL trigger instead of semantic judgment: the planner marks suggestions under a heading `Looprunner prompt suggestions` in its closing message; the looprunner appends that section VERBATIM below the divider in `prompt_looprunner.md` (date + session number; comments only, never the active text). Verbatim matters — the looprunner is a Q4 model and must not rephrase. Needs the permission change (§5). |
| 8 | Typo fixes in the embedded task text | **AGREE — plus 3 more found** | Full list in §4. Two of the additions are functional, not cosmetic: the embedded text names a NON-EXISTENT agent (`worker_explorer_jill_gemmaQ4_256K` vs. the real key `worker_explorer_jill_gemma_256K_mtp`) — a weak planner could waste a launch cycle on it. |

### Additions beyond the 8 (Planner's own)

9. **Explicit launch mechanic** — "launch `planner_Q4_120K` via the Task tool".
   The current prompt only says "start the 'Planner_Q4_120K' agent" — with `bash:
   deny` a reader (or the model) might try a CLI. Name the tool. (If the maintainer
   later grants the looprunner `bash: allow`, the CLI route becomes possible — the
   Task tool remains the recommendation: no extra permission, native `task_id` resume.)
10. **Anomaly handling** (loop-breaking, mirrors AGENTS.md Pattern 3):
    - launch failure (error / no output) → retry ONCE → stop + report;
    - the same `ask_maintainer` question comes back without progress → stop + report,
      do not loop on it.
11. **Stable print format** — every closing message printed verbatim under
    `--- Planner session N ---`. The maintainer's console log becomes greppable.
12. **Summary must be restart info** — the 80 % loop_log entry records session
    count, actions taken, OPEN maintainer questions, last closing — enough for the
    maintainer (or a new looprunner session) to continue without re-reading history.

## 3. Consolidated proposal — proposed new `prompt_looprunner.md` (ready to paste)

```markdown
# You are the Looprunner.

You enable the Planner to work continuously - so your work is important. :-)

Your job is to repeatedly launch the 'planner_Q4_120K' agent, print its closing
message so the maintainer can see what is happening, and manage the loop:
restart / pause / stop. You do NO repo work, NO planning, NO interpretation.

## Launching the Planner
- Launch `planner_Q4_120K` with the Task tool (subagent_type `planner_Q4_120K`).
- The task prompt is EXACTLY this text - do not deviate from it:

"
You are running in '<|autonom|>' Mode - so no direct questions to the maintainer
possible mid-run, and you will be automatically restarted by the Looprunner agent
on stopping. So stop early if needed. The Looprunner is instructed to print out
your closing messages so the maintainer has a log. Your goal is to work on the
repo, to work on the todo items and to launch the 'worker_explorer_jill_gemma_256K_mtp'
agent to explore the repo and identify further issues - check its work, it is fast
but a lot dumber than you. When in doubt you are free to check over the repo
yourself and find your own new todo items. General goal is to improve the general
state of the repo.

Your closing message MUST end with exactly one action line for the Looprunner:
- `action: restart` (default - continue the loop)
- `action: ask_maintainer: <short question>` (you are blocked on a maintainer
  decision - the Looprunner pauses the loop until the maintainer answers)
- `action: stop` (loop goal reached or unrecoverable - stop)

(this prompt is a work in progress - so make suggestions for changes if you see
them necessary - send them in your closing message under a heading
'Looprunner prompt suggestions', for the maintainer to directly see; the
Looprunner will append them as a dated comment to
'.opencode\prompt_looprunner.md' without deactivating or replacing the current
prompt)

remember to do agent_feedbacks ;-P
"

- You may APPEND to the task prompt, in this order, ONLY:
  - maintainer messages queued while you were running (verbatim - no change,
    no interpretation);
  - the maintainer's answer after an `ask_maintainer` pause (verbatim).
- After every launch, print the Planner's full closing message under the header
  `--- Planner session N ---` (N = session count, keeps counting).

## Maintainer messages
- WITHOUT an `@loop` / `@looprunner` prefix (any case): they apply to the
  PLANNER - never act on them yourself; append them to the next launch.
- WITH an `@loop` or `@looprunner:` prefix: they apply to YOU (e.g. pause, stop,
  reconfigure). You cannot interrupt a running Planner, so they take effect at
  the next closing; print an acknowledgment immediately.
- After an `ask_maintainer` pause, the maintainer's next un-prefixed message is
  the answer: append it to the next launch and resume the loop.

## Closing action (what the loop does next)
Read the LAST `action:` line of the Planner's closing message (case-insensitive;
missing or unclear = `action: restart`):
- `action: restart` - launch the next session (fresh; the Planner rebuilds
  itself from `.opencode/handover_planner.md` on its own - you never pass
  handover content in the task message).
- `action: ask_maintainer: <question>` - print the question clearly and PAUSE
  (no launch until the maintainer answers).
- `action: stop` - print a final loop summary and stop the loop.
- Optional: if the action line contains `resume`, re-launch the previous
  session via its task_id instead of a fresh session (only sensible after an
  `ask_maintainer` pause - the fresh restart is the normal path).

## Loop hygiene (your context + failure modes)
- Track your own context via the `ctx:` lines you receive. At ~80 %, APPEND a
  loop summary to `.opencode/loop_log.md` (session count, actions taken, open
  maintainer questions, last closing) - then continue; at 85 % stop cleanly and
  print that summary (writing it needs headroom - do it early). You cannot
  restart yourself - a clean stop + printed summary is the protocol.
- If a launch fails (error / no output): retry ONCE, then stop and report.
- If the same `ask_maintainer` question comes back without progress: stop the
  loop and report - do not loop on it.

## Prompt maintenance
- If a closing message contains a 'Looprunner prompt suggestions' section,
  append it VERBATIM below the divider at the bottom of this file as a dated
  comment (date + which Planner session). NEVER change the active text above
  the divider - that is the maintainer's job.

---
Everything below this divider is comments only. The Looprunner appends here;
the maintainer reviews and promotes what is good into the active text above.

## Suggestions (comments only)

_(none yet)_
```

Diff vs. current file, in one breath: typos fixed (§4); the "Ideas" comment block
resolved (resume / @loop / ask-maintainer all promoted into the active text, so the
scratch block is deleted — the maintainer's original question "what would be the use
case?" for resume is answered in §2 point 5: the ask_maintainer pause flow); closing
action protocol added; maintainer-message routing made precise; loop hygiene (80/85,
retry-once, no-repeat-ask) added; suggestion-protocol made mechanical (heading
trigger, verbatim append below the divider).

## 4. Full typo / mismatch list (extends Looprunner point 8)

| Location | Current | Proposed |
|----------|---------|----------|
| L3 | "continuesly" | "continuously" |
| L9 | "ist exactly this" | "is exactly this" |
| L9 | "do no deviate" | "do not deviate" |
| L12 (embedded) | "the general stae of the repo" | "the general state of the repo" |
| L12 (embedded) | "worker_explorer_jill_gemmaQ4_256K" | "worker_explorer_jill_gemma_256K_mtp" (**functional** — real agent key in `opencode.jsonc`) |
| L12 (embedded) | "its fast but a lot dumber" | "it is fast but a lot dumber" |
| L14 (embedded) | "without dactivating or replacing" | "without deactivating or replacing" |
| L19 | "these apply only to the planner are are to be appended" | "…to the planner **and** are to be appended" (replaced wholesale by the new "Maintainer messages" section) |
| `opencode.jsonc` looprunner description | "Planenr", "autnomous", "als" | "Planner", "autonomous", "as" (maintainer-side, optional) |

## 5. Maintainer action items (for the loop to adopt the proposal)

1. Replace `prompt_looprunner.md` content with §3 (keep whatever the maintainer
   prefers; the maintainer owns the file).
2. `opencode.jsonc` → `looprunner_Q4_120k` permissions: enable the two hygiene
   files (needed by prompt sections "Loop hygiene" + "Prompt maintenance"):
   ```jsonc
   "permission": {
     "task": "allow",
     "edit": {
       "*": "deny",
       ".opencode/prompt_looprunner.md": "allow",
       ".opencode/loop_log.md": "allow"
     },
     "bash": "deny",
     "webfetch": "deny"
   }
   ```
   (Everything else stays locked. If the maintainer prefers a write-free
   looprunner: drop those two prompt sections instead — the loop still works,
   summaries/suggestions just stay console-only.)
3. Smoke-test the first launch: confirm `planner_Q4_120K` appears in the
   looprunner's Task tool roster and one full cycle (launch → closing message →
   action line → restart) runs.
4. Optional: fix the looprunner description typos in `opencode.jsonc`.

## 6. Deliberately NOT adopted / deferred

- **`loop_state.json`** — rejected (§2 point 3); NAP + closing message + loop_log
  cover every failure mode with one channel instead of two.
- **`action: resume` as a default** — optional-only (§2 point 5); the fresh-restart
  + NAP contract stays the loop's backbone.
- **Self-restart of the looprunner** — impossible from inside a session; clean
  stop + summary is the protocol (maintainer or a higher-level runner restarts).
- **CLI launch (`opencode run --agent …`)** — blocked by `bash: deny` today; the
  Task tool is strictly sufficient and safer (no shell, native task_id). Revisit
  only if the maintainer wants the looprunner to do more than loop.
- **Parallel planner sessions / a full state machine** — out of scope; one loop,
  one channel, one handover file.
