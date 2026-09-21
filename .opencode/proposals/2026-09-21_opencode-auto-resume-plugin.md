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
user ESC. The plugin NEVER touches NAP/TODO/maintainer files (that is the
prompts' job); logging via `app.log` as upstream does.

**Unit 1 — skeleton logging plugin (the testbed).** Small plugin in
`.opencode/plugin/`: log every event it receives (name + sid + key fields) and
probe the live v1 client surface (which `session.*` methods exist; is there a
host-side compaction trigger; is `session.summarize` callable from a plugin?).
DoD: a live session's events appear in the log; a surface report is appended to
`knowledge/opencode-plugins/`. Validates the v1 API for all later units (the
v1/v2 question was answered from source; this verifies it live).

**Unit 2 — context-limit compaction trigger (gap 2).** Token tracking on
`message.updated` (B §2 step 1); on status→idle, if the last assistant token
total ≥ 85% of the usable window (B §2 step 2) → dispatch compaction ONCE per
busy cycle (B §1 #1 reset pattern). Parent path: since the host-side compaction
command surface is unknown until Unit 1, the first working form is a prompt that
instructs the session to self-compact via the `compact_memory` tool (SELF path).
DoD: a live session crossing the threshold compacts itself, unattended, once
per busy cycle.

**Unit 3 — auto-resume after compaction (gap 1).** On compaction completion
(detect via the events Unit 1 confirms — status transition out of compacting) →
send the post-compaction-protocol prompt (re-read the NAP head files, continue
the current unit). DoD: a compacted session resumes unattended and completes its
current work unit.

**Unit 4 — restart detection + new planner (gap 3).** Pattern-scan recent
assistant text for the `action:` line (AGENTS.md §Interaction-contract state
machine; upstream analog = C §2.5/§2.6 done-claim pattern scanning). On an
`action: restart` close of an idle planner session → start a NEW planner
session (mechanism per Unit 1's surface report; upstream analog = prompt a new
session + discovery pickup, A §3). DoD: a planner closing with `action: restart`
spawns the next planner session unattended.

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
  (log line + gauge readout before/after).
- Unit 3: a compacted session resumes unattended (session dump / loop-style
  observation shows continued work).
- Unit 4: an `action: restart` close spawns the next planner session.
- All units: standard gates stay green (plugin-only, no product code touched);
  opencode restarts cleanly with the plugin auto-discovered from
  `.opencode/plugin/`.

## Status

Awaiting approval. Units are independently approvable and strictly ordered
(each leaves the repo green); Unit 1 can launch as soon as this proposal is
approved.
