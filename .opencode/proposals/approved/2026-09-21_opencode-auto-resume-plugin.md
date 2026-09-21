# Proposal — our own auto-resume plugin (Phase 3 of the opencode-auto-resume research)

Date: 2026-09-21 · Author: planner (direct session). Reference research: Phases 1-2
completed and vendored (map + deep-dives A/B/C below).

## Problem

The looprunner is a mechanical relay (task, action line, restart). The maintainer
wants "infinite direct sessions" — direct access to the planner, with a plugin
handling resume/restart instead of a separate agent process (his ideas.md item,
2026-09-18: "replace looprunner with a plugin that automatically resumes or
restarts the planner agent"). Three gaps, measured against a working upstream
reference (opencode-auto-resume v1.1.16):

1. **No auto-resume after compaction** — a compacted session sits idle until
   resumed manually (the post-compaction protocol exists in prompts; nothing
   dispatches it).
2. **No auto compaction trigger on context limit** — the agent must decide at the
   stop line itself; our compact_memory has no saturation detection.
3. **No auto-restart on `action: restart`** — the looprunner does this today.

## Reference corpus (verified, in-repo — read on demand, never re-derive)

- Feature map: `.opencode/agent/knowledge/opencode-plugins/auto-resume-map.md`
- A — continuous auto-start (timer architecture §3, send path §4, ESC boundary §5):
  `.../auto-resume-deepdive-A.md`
- B — context overflow + error handling (saturation chain §2, error classes §1):
  `.../auto-resume-deepdive-B.md`
- C — generally-useful mechanisms (idle-scan mega-function, task_complete,
  completion latches): `.../auto-resume-deepdive-C.md`
- API-surface fact (verified 2026-09-21 from the upstream source): it uses only
  v1-era surface — event cases session.status/created/updated/idle/interrupted,
  message.updated, todo.updated, session.error, command.executed; hooks
  chat.message, tool.execute.before/after, command.execute.before; client
  app.log / session.prompt / abort / list / summarize / command → compatible
  with our v1 instance (opencode-ai@1.18.31).

## Design (independently approvable units, strict build order)

**Shared architecture rules** (deep-dive A §3 lessons — apply to every unit):
events only ARM state on a per-session watch object; ONE 5s tick is the only
decision+send funnel; every send passes one gated send path (re-entrancy latch +
cancel/completion gate, re-validated right before send); timers `.unref()`-ed;
plugin self-actions (prompts/aborts) self-marked so they never collide with
user ESC. **Prompt injection MUST be queued** — `client.session.promptAsync`
(the same race-free delivery channel the ctx_watchdog nudge ladder uses: the
synthetic part queues as the next turn at idle) — never a synchronous prompt:
an immediate injection invalidates the session KV cache and forces a full
re-prefill (measured by the maintainer: 3-4 min at 90% fill; the earlier
ctx_watchdog nudge era hit exactly this). Where Unit 1 finds a host-side
command surface, prefer the command over a prompt (commands do not re-prefill).
The plugin NEVER touches NAP/TODO/maintainer files (that is the prompts' job);
logging via `app.log` as upstream does.

**Unit 1 — skeleton logging plugin (the testbed).** Small plugin in
`.opencode/plugin/`: log every event it receives (name + sid + key fields) and
probe the live v1 client surface (which `session.*` methods exist; is there a
host-side compaction trigger; is `session.summarize` callable from a plugin?).
DoD: a live session's events appear in the log; a surface report is appended to
`knowledge/opencode-plugins/`. Validates the v1 API for all later units (the
v1/v2 question was answered from source; this verifies it live).

**Unit 2 — context-limit compaction trigger (gap 2).** Token tracking on
`message.updated` (B §2 step 1); on status→idle, if the last assistant token
total ≥ 85% of the usable window (B §2 step 2) → trigger compaction ONCE per
busy cycle (B §1 #1 reset pattern). **Mechanism (per maintainer 2026-09-21
comment): host-side command if Unit 1 finds one** (upstream's ctx-wrapup
pattern — no re-prefill); **otherwise a QUEUED prompt** (`promptAsync`)
instructing the session to self-compact via the `compact_memory` tool (SELF
path) — never a synchronous prompt (cache invalidation → 3-4 min re-prefill at
90% fill, the old ctx_watchdog nudge failure mode). DoD: a live session
crossing the threshold compacts itself, unattended, once per busy cycle, with
NO re-prefill stall.
--comment: prompt needs to be queued or it will trigger a complete invalidation of sessions cache and thus a complete re prefill - takes a long time (3-4 minutes on 90% context fill). the nudges we used in earlier versions of the ctx_watchdog caused exactly this. --info also a prompt (message or the starting prompt on delegation or re-delegation) is for me as maintainer the only place i can enter and revert to in the session of a sub-agent - in case it is needed to give instructions. so sometimes a queued prompt in the middle of the session or before work starts might be useful for me. (sorry idle thoughts again - an idea for later maybe if i observe an actual need for it)
Planner replies (2026-09-21, direct session): adopted as a shared architecture
rule — every prompt the plugin injects is QUEUED (`client.session.promptAsync`,
the ctx_watchdog nudge's race-free channel: the synthetic part queues as the
next turn at idle) — never synchronous. Unit 2 additionally prefers a host-side
command where Unit 1 finds one (the upstream ctx-wrapup pattern — no
re-prefill). Your deferred idea (a maintainer prompt-injection channel into
sub-agent sessions — the mid-session queued prompt / starting prompt as the
only re-entry point) is noted and PARKED as an observation — not actioned
until an actual need shows up.

**Unit 3 — new planner spawn mechanism (shared building block).** A single
helper that starts a fresh planner session (new session + planner prompt
injection — mechanism per Unit 1's surface report; upstream analog = prompt a
new session + discovery pickup, A §3). Used by both the `action: restart`
branch and the unrecoverable-stop restart in Unit 4. DoD: invoking the helper
produces a running fresh planner session.

**Unit 4 — planner liveness watchdog (gap 1 + sudden stop — who watches the
top-level session).** On planner status→idle / error, route by state:
- **Just compacted** (status transition out of compacting, no `action:` line):
  send the post-compaction-protocol resume prompt (QUEUED; re-read the NAP
  head files, continue the current unit), with backoff.
- **Last message carries a recognized `action:` line** (AGENTS.md
  §Interaction-contract state machine): `stop` → do nothing; `ask_maintainer`
  → do nothing (wait for the maintainer); `restart` → spawn a new planner
  (Unit 3).
- **No recognized `action:` line** (sudden stop / stall / death — e.g. a
  truncated tool call killed the turn): recovery — send a "continue the current
  unit from the NAP" resume prompt (QUEUED, backoff, retry cap); on retries
  exhausted → restart via a new planner (Unit 3).
This is the lightweight planner-scoped analog of upstream's auto-start family
(A): it tracks whether the planner is actually active and restarts on sudden
stop. DoD: (a) a compacted planner resumes unattended; (b) a planner that
suddenly stops without an `action:` line is recovered or restarted unattended;
(c) a planner closing with `action: restart` spawns the next planner; (d) a
`stop` / `ask_maintainer` close is left alone.
--comment: we had some sudden stops - but might be connected to failed tool calls caused by JSON truncation and the session just stopped. as a sub-agent the control would be returned to the planner. but what happens when the planner suddently stops? is there a watchdog that keeps track if the planner is actually active? and restarts in need of sudden stop?
Planner replies (2026-09-21, direct session): yes — that gap is now Unit 4
(the planner liveness watchdog; the old Unit 3 auto-resume became its first
branch). On planner status→idle / error it routes: just-compacted → queued
post-compaction resume; a recognized `action:` line → `stop` / `ask_maintainer`
left alone, `restart` spawns a new planner; NO recognized `action:` line (the
sudden-stop case, e.g. a truncated tool call killed the turn) → queued recovery
prompt with backoff + retry cap, then restart via a fresh planner on retries
exhausted. The old Unit 4 (restart detection) became the shared spawn helper
(new Unit 3). The busy-silence sub-case (A P1, still-busy-with-dead-stream)
stays parked as a Unit 4 secondary case.

**Explicitly NOT ported from upstream** (scope discipline): the watchdog
abort-escalation chain (A §4 P2) and the orphaned parent/child watch (P3) — we
run planner-depth-1 with no subagent orphans (workers are planner-managed);
celebration latch (🎉), idle open-todos nudge, subagent native-compaction path,
and the done-claim/ready-to-continue heuristics (C) — we have our own
TODO/NAP protocol. Busy-silence stall detection (A P1) is revisited later only
if stalls prove a real problem.


## Acceptance

- Unit 1: live event log + surface report in `knowledge/opencode-plugins/`.
- Unit 2: one live demo — a session crosses the threshold and self-compacts
  (log line + gauge readout before/after), with NO re-prefill stall.
- Unit 3: invoking the spawn helper produces a running fresh planner session.
- Unit 4: (a) a compacted planner resumes unattended (session dump / loop-style
  observation shows continued work); (b) a planner that suddenly stops without
  an `action:` line is recovered or restarted unattended; (c) an `action:
  restart` close spawns the next planner session; (d) a `stop` /
  `ask_maintainer` close is left alone.
- All units: standard gates stay green (plugin-only, no product code touched);
  opencode restarts cleanly with the plugin auto-discovered from
  `.opencode/plugin/`.

## Status

APPROVED 2026-09-21 (maintainer moved this file to `approved/`). Units are
independently approvable and strictly ordered (each leaves the repo green);
Unit 1 is launched in looprun `autorun-2026-09-21_15-33` (plan1, task spec
`plan1_ho_task.md` in the loop folder).
