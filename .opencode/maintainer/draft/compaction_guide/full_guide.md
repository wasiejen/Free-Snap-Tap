# Compaction — full guide (reference)

Status: DRAFT — written by the planner (direct session, 2026-09-24) from a design discussion
with the maintainer. Intended as the standing reference every future agent is directed to, for
how compaction works, how it affects them, and how to use it. Final home: TBA — the maintainer
promotes it (knowledge base and/or per-agent prompt excerpts).

All numbers below are MEASURED on this host or STATED by the maintainer on 2026-09-24. They are
specific to the planner model (170k window) where noted: the MECHANICS transfer to every model
and role; the NUMBERS (budgets, floor, speeds) are per model — see §9.

---

## 1. What compaction is

- **Compaction is NOT a restart.** It trims the OLD history; the recent tail stays INTACT and a
  summary replaces the dropped part. On resume you re-read head files and CONTINUE — never
  re-plan from scratch.
- The post-compaction context has THREE parts:
  1. **System prompt** — around 20k for the planner (tools, AGENTS.md, role prompt, destill memory).
  2. **Compacted history** — the summary of the whole session plus stripped old content: tool
     outputs removed (e.g. reads), thoughts compacted. Variable size — the more tool output the
     dropped part consisted of, the smaller it becomes.
  3. **keepMessages head** — the last X messages kept FULLY, including tool calls and their
     outputs. keepMessages is the dial.
- **keepTokens is being removed** from the tool options. (Found 2026-09-24: the old config
  carried keepTokens, which silently SUPERSEDED keepMessages — so keepMessages was ignored.
  Fixed; henceforth only keepMessages.)
- **Hard floor:** around 25-30k at keepMessages=0 (system prompt + minimal compacted history).
  The 55-65k (30-40%) post-compaction state observed earlier was the old keepTokens=30k regime;
  now keepMessages drives the head size.

### How the summary is produced (the merge step)
The summary prompt (draft: `../compaction_prompt.md` next to this folder):
- The summary is a MERGE: `<prior-summary>` + `<conversation>` → new summary. **Anything not
  carried into the new summary is lost.**
- On conflict, the conversation wins (state the corrected fact, drop the old claim).
- Format: Work State — Objective / Important Details / Completed / Active / Blocked / Next Move /
  Relevant Files. Terse bullets; exact paths, symbols, commands, errors preserved.
- The summarizer is the **SAME model that runs the session** (config: root `agent.compaction.model`
  if set, else the session's own model — currently the same), so the summary carries the
  session's own expertise and level of detail — a competent digest, not a lossy one.
- **This merge step is where bit-rot lives** (§5): each compaction re-summarises the previous
  summary, so fidelity depends on what each hop carried forward.

---

## 2. Measured numbers (this host, planner model, 2026-09-24)

| quantity | value |
|---|---|
| context window | 170k |
| generation speed, low fill | ~60 t/s |
| generation speed, 160k prefill (92-93%) | ~32 t/s |
| time to fill the 170k window | ~30-45 min (tool-heavy fill ~15 min) |
| one compaction (compaction itself) | 90-120 s |
| reload of the new context | ~60-70 s |
| total per compaction | ~3-4 min |
| floor at keepMessages=0 | ~25-30k |
| keepMessages default (self-triggered) | 12 |
| keepMessages default (auto at limit, host compaction block) | 18 |
| gauge lag | readout lags true usage by ~2 tool calls (~5k) — treat as a LOWER bound |

---

## 3. What it costs — and what it earns

- **No money cost** — the system runs locally; energy only. **Wall-time is the metric.**
- One compaction costs ~3-4 min. Filling the window costs 30-45 min. Generation speed drops as
  the context fills (60 → 32 t/s), so accumulated tool output is a DOUBLE cost: it eats the
  window AND slows every token after it.
- **Net: compaction almost always REDUCES total wall-time** — it (a) reclaims the lost generation
  speed (roughly 2-3x on the remaining work, maintainer estimate), (b) extends the usable window,
  and (c) avoids a fresh-planner restart that would re-derive everything from committed files
  plus research.
- The one real cost is **bit-rot** (§5) — not money, not wall-time.

---

## 4. Budgets and why they exist — bit-rot

- The budget is NOT a wall-clock backstop (compaction is net-fast) and NOT a money cap (no token
  cost).
- It is a cap on **BIT-ROT**: we do not yet know how an N-times-compacted summary (a summary of a
  summary of …) shifts the compacted agent's BEHAVIOR. The cap is a **safety measure against an
  unknown**, and it MAY BE RAISED once stability is proven.
- Budgets are PER MODEL, per session (from the `compact_budget.json` model_budget map; unlisted
  models get the configured default; CPU models are denied). Current values for the PLANNER
  model:
  - `normal`: **5** self-triggered compactions (keepMessages-capable).
  - `emergency`: **1** — a shared reserve usable by BOTH emergency systems (see §6); first-
    come-first-served; the auto one fires it at most once.
- **A session survives up to 6 compactions (5 + 1). The next wall-hit is a clean forced handover —
  never a hard death** (§6 wall flow).

---

## 5. The three compaction paths

| path | trigger | keepMessages | budget it draws from |
|---|---|---|---|
| 1. **Normal** | self-triggered (`compact_memory`) | yes (default 12) | normal 5 |
| 2. **Self-emergency** | self-triggered (planned `emergency` param — NOT yet registered) | yes | emergency 1 |
| 3. **Auto at limit** | automatic at the context limit — the agent CANNOT trigger it | NO — host default 18 | normal 5 if available, else emergency 1 (once) |

- Path 3 is a **pure safety net**: it preserves the context in case the agent is no longer able
  to act. It cannot be influenced by the agent.
- **Wall flow:**
  1. Hit limit with the 5 available → path 3 decrements the 5 (it never touches the emergency 1
     while the 5 has room).
  2. Hit limit with the 5 spent → path 3 uses the emergency 1 (fires ONCE — no unlimited
     re-hitting of the limit to inflate the budget).
  3. Hit limit with BOTH exhausted → **forced NEW SESSION**: a new planner with a directive to
     scan the dump of the last session to gain all relevant knowledge and make a clean
     handover/commit if not present.
- **The race (practical consequence):** the emergency 1 is shared between paths 2 and 3,
  first-come-first-served. If you wait until the hard limit, the auto one (path 3) consumes it
  BLINDLY (18-msg default) and you lose your keepMessages control. So spend the 1 on YOUR terms
  first — at the stop line / >95% / mid-handover, with the keepMessages you actually want (§7).

---

## 6. What survives, what is lost

- **INTACT:** the last keepMessages messages — tool calls, their outputs, thoughts.
- **DIGESTED:** everything older — tool outputs stripped, thoughts compacted, essence carried by
  the same-model summary.
- **AT RISK:** early-message content the summary may not carry at full fidelity — initial
  instructions, early context, nuances of still-open discussion. Rule: anything the current work
  depends on from the head of the session must be COMMITTED (or captured in the NAP) BEFORE you
  compact.
- **Dumps:** a dump is created AUTOMATICALLY on self or cross compaction (the older
  "dump the session before the compaction" protocol is STALE — that build detail no longer
  applies). `dump_session.cjs` (`.opencode/agent/scripts/db/`) remains for on-demand dumps. The
  last session's dump is the recovery source for the forced-new-session directive (§5 step 3).

---

## 7. When to use it — the policy

**Default: COMPACT (path 1) until the normal budget is spent.** Compaction is a routine
maintenance/speed tool, not an emergency valve — once its behavior is predictable it is just
another tool in the set.

Triggers:
- **DISTILLED:** you have read the files / greps / probes and formed the plan — the raw tool
  output is dead weight (it eats window AND slows generation). Drop it. This can be **MID-UNIT**,
  not only at unit boundaries — the criterion is "the output is distilled into understanding",
  not "I'm at a boundary".
- **SPEED:** the remaining work is long enough that the speed-up (~2-3x) beats the ~3-min
  overhead — for most real units, yes.
- **STOP LINE / >95% / MID-HANDOVER:** spend the emergency 1 PROACTIVELY (path 2) with the
  keepMessages you want, before the auto one (path 3) can take it blindly.
- **BUDGET INFO:** your remaining budget arrives as indirect information when you cross the 80%
  line (planned); plan with margin (gauge lags, §2).

**keepMessages heuristic:**
- Keep what you would have to **RE-DERIVE**: drafts, the plan, its rationale, in-flight state.
- If you have a full handover/checkpoint committed, you can keep LESS.
- **WHEN IN DOUBT: KEEP MORE.** If the remaining window after is too small, compact again with a
  smaller keepMessages.
- Default 12; floor ~25-30k at keepMessages=0.

**Restart (fresh session) INSTEAD of compact — the exception:**
- Task COMPLETE, AND no relevant knowledge for the next task lives in keepMessages (it is all in
  the committed files: NAP / TODO / git), AND you want a clean context (no further bit-rot
  generation), AND you accept the re-derivation cost (a fresh planner reads NAP + TODO and does
  some research to be sure).
- If the task is complete and you already know the next steps (you wrote the NAP/TODO) and budget
  remains: compacting with a LOW keepMessages and continuing is usually BETTER than restarting —
  momentum for one small bit-rot step.

**Stop lines (triage thresholds on top of the default-compact policy):**
- **80%:** near-limit triage — estimate the tool calls still needed to finish the current work;
  estimates at the limit are optimistic by construction, round up. If it clearly won't finish
  before the line, stop at the last verified checkpoint and compact INSTEAD of starting the unit.
- **90% (stop line):** stop starting NEW work; compact (path 1, or path 2 proactively) to
  CONTINUE — compaction enables further work, it does not end it.
- **95%:** forced — commit current status + compact NOW; do not deliberate while budget remains
  (deliberation burns the budget that funds the compaction).
- These are triage thresholds — NOT the only compaction moments (that was the old emergency
  framing).

---

## 8. Guardrails

- **COMMIT before you compact** when the current work depends on early-message knowledge — land
  the commit first (or capture the needed bit in the NAP). Compaction follows a commit; it never
  precedes one it depends on.
- **Do NOT rely on the auto one (path 3) for a keepMessages you need** — it is blind (18-msg
  default).
- **After a compaction it is NOT a lost session:** re-read the head files (NAP, handover/task
  files, TODO — role-specific) and CONTINUE from the summary + head files. Never re-plan from
  scratch.
- **Self-compaction in the loop:** the session RESUMES (the looprunner resumes via task_id). The
  `message` param is not yet wired — the continuation message is relayed as the FIRST message on
  resume with a short post-compaction-protocol instruction (planned fix). Until then, put the
  continuation instruction into the stop/handover message.
- **Do not treat the stop line as the purpose of compaction** — it is one of several triggers;
  the default is routine compaction (§7).

---

## 9. Per-model / per-role caveats

- Budgets are PER MODEL (`compact_budget.json` model_budget map; unlisted models get the
  configured default; CPU models denied). **5 + 1 is the planner model's current config — other
  agents: check your budget info, do not hardcode.**
- Window size, floor, and speeds (170k, ~25-30k floor, 60 → 32 t/s) are planner-model numbers.
  Mechanics transfer; numbers don't.
- System-prompt size differs per role (planner ~20k with tools + AGENTS.md + destill memory).
- The keepMessages defaults differ: 12 (self-triggered, our plugins' budget file) vs 18 (host
  compaction block, used by the auto one). Each system reads its own store.

---

## 10. Resume protocol (after any compaction)

1. You are the SAME session with a trimmed tail — the recent messages are intact.
2. Re-read the head files your role names: NAP, task spec / handover files, TODO.
3. Continue the in-flight work from the summary + head files.
4. Re-gauge (`ctx_gauge`) before the next unit — the readout lags by ~2 tool calls.

---

## 11. Evolving / open (2026-09-24)

**Unknown:**
- BIT-ROT: the behavior effect of N-times-compacted summaries is unmeasured; the budget may be
  raised once stability is proven.

**Planned (maintainer, 2026-09-24 — not yet live):**
- `emergency` param on `compact_memory` (path 2), keepMessages-capable.
- Remaining budget as indirect information when the session crosses the 80% line.
- `keepTokens` removed from the tool options.
- Self-compaction `message` relayed as the first message on resume (+ short post-compaction
  protocol instruction).

**Stale passages superseded by this guide (still present in current prompts/tool descriptions —
fix pending):**
- "Dump the session BEFORE the compaction" → dumps are now automatic on self/cross compact.
- "The keep fields are ignored by this build's server" → keepMessages works as documented.
- "The host's compaction model (e.g. Gemma) differs from the target's model" → the summarizer is
  the session's own model (config-dependent, §1).
- "Near-limit estimates are 'starting values, calibrate from measured loopruns'" → act on the
  ~10-call / ~6-call thresholds as the calibrated instruction.
