# Cross-Session Compaction Experiment — Session Summary

- **Date:** 2026-09-14
- **Controller session:** `ses_f5f4fa93dffeSS4Z5EpPJfOlT0` (planner/worker role: Qwen3.8-27B-IQ4KT-120K, 120K window)
- **Subject session (worker):** `ses_f5f2204deffe1Lyi8pNRnB3E4f` (agent `worker_Q4_120K`, self-reported model `llama-swap/Qwen3.8-27B-IQ4KT-120K`)
- **Purpose:** Test the `compact_memory` tool's cross-session behavior — specifically whether the `modelID` parameter defines the model that *performs* the compaction, and how `keepTokens` / `keepMessages` affect the resumed session.

---

## Setup / Method

1. Delegate a fixed "probe" task to `worker_Q4_120K`: call its own `ctx_gauge` tool twice, report both outputs verbatim plus its session ID and model ID, then end.
2. Compact the worker's session via `compact_memory` using an explicit `sessionID` + `providerID` + `modelID`.
3. Re-delegate to the *same* session via `task_id` and observe: (a) whether the session needs a "flush" delegation first, (b) the post-compaction context baseline (from GAUGE_1), (c) what history the worker still sees.

Key context: `ctx_gauge` readout format is `SESSION=… CTX=n (p%) REM=m`. The footer readouts on tool results (e.g. `(12%/105K)`) are the controller's own context, not the worker's.

---

## Round-by-round results

### Round 1 — Fresh delegation (baseline)
- GAUGE_1: `CTX=notAvailable` (db readout unavailable at session start — first-ever read for that session)
- GAUGE_2: `CTX=13023 (10%) REM=106977`
- **Interpretation:** ~13k tokens is the natural floor for this agent (system prompt + AGENTS.md + repo overview). Worker behaved correctly, ended after two gauge calls.

### Round 2 — Compaction with matching modelID
- `compact_memory(sessionID=ses_f5f2…, providerID=llama-swap, modelID=llama-swap/Qwen3.8-27B-IQ4KT-120K)`
- Returned: `Context successfully compacted: kept last 12 messages / 30000 tokens.` + `cross session compaction detected`
- First delegation after compaction **did not run the probe** — it returned a compaction-style structured summary (`## Objective / Important Details / Work State / Next Move / Relevant Files`) and ended.
- Second delegation then ran the probe cleanly:
  - GAUGE_1: `CTX=1637 (1%)` → low post-compaction baseline (summary was compact)
  - GAUGE_2: `CTX=14787 (12%)`
- **Interpretation (later refined by maintainer):** the first delegation flushed the *queued* compaction routine — the worker "ended according to normal compaction routine" instead of executing the new task. One extra delegation is needed after a queued compaction before the session can act normally again.

### Round 3 — Compaction with a foreign modelID
- `compact_memory(…, modelID=Gemma4-12B-Q4KXL-MTP-128K)` — a model that is **not** the session's agent model.
- Tool returned byte-identical text to Round 2: `kept last 12 messages / 30000 tokens` + `cross session compaction detected`. The tool result does not echo which model was invoked.
- First delegation this time **ran the probe directly** (no flush delegation needed):
  - GAUGE_1: `CTX=4017 (3%)`, GAUGE_2: `CTX=14200 (11%)`
- Second delegation: GAUGE_1 `CTX=14430 (12%)`, GAUGE_2 `CTX=15060 (12%)`
- Worker self-identity stayed `llama-swap/Qwen3.8-27B-IQ4KT-120K` in both delegations — `modelID` affects the compaction run, not the session's agent model.

### Round 4 — Text forensics (quote the compaction summary)
- Delegated: "quote the oldest compaction/summary block in your context verbatim."
- Worker reported 2 summary blocks (a "draft" and "revised" version) it claims live inside an earlier assistant `<thinking>` block; quoted one structured recap (~100–120 words, standard template, "Turn 1/2/3: called ctx_gauge twice").
- **Caveats:** the `<thinking>`-block claim is likely a misread by the quantized model of where the compaction message actually sits; and a quantized model's "verbatim" quote is only partially trustworthy. The summary follows the repo's standard compaction template either way, so **style cannot discriminate Gemma-12B vs Qwen-27B** — the compaction prompt fixes the template.
- Conclusion from this round: the text-level probe can only *corroborate*, not *prove*, model identity.

### Round 5 — Zero-keep compaction
- `compact_memory(…, modelID=Gemma4-12B-Q4KXL-MTP-128K, keepTokens=0, keepMessages=0)`
- Returned: `Context successfully compacted: kept last 0 messages / 0 tokens.` → **accepting zeros works.**
- Probe delegation (ran directly, no flush needed):
  - GAUGE_1: `CTX=13024 (10%)` — within 1 token of the Round 1 natural floor (13023)
  - GAUGE_2: `CTX=15154 (12%)`
  - History visible: "a summary block, not raw earlier turns"

---

## Findings

1. **`modelID` does define the model that performs the compaction.** Decisive evidence is provider-level (maintainer observation): when `compact_memory` was triggered, the controller's model was unloaded from the provider, the named `modelID` (Gemma4-12B-Q4KXL-MTP-128K) was booted and ran the compaction, and control returned before the next delegation could start. The text-level evidence (tool response, summary style) is inconclusive by itself because the response is identical and the summary template is fixed.
2. **`providerID` + `modelID` are independent of the session's agent model.** The worker's system context kept reporting its own model in every delegation; only the compaction run used the foreign model.
3. **Compaction can be queued or synchronous — it changes the delegation rhythm.**
   - Round 2: the first post-compaction delegation was consumed by the compaction routine (returned the summary, ended) → a second delegation was required to act.
   - Rounds 3 & 5: the first post-compaction delegation ran the task directly.
   - Likely explanation: whether the compaction had fully flushed before the next delegation (synchronous boot in Round 3/5 per maintainer observation) determines if a flush delegation is wasted.
4. **The post-compaction baseline is governed by `keepTokens`/`keepMessages`, not by the compaction model** (maintainer correction, confirmed by Round 5): the "keep last N messages / M tokens" floor is preserved verbatim in the resumed context. Round 3's larger baseline (4017) vs Round 2's (1637) reflected kept content size, not model behavior.
5. **`keepTokens=0` / `keepMessages=0` work and act as a hard context reset.** The tool reports "kept last 0 messages / 0 tokens"; the resumed session's context returns to the agent's natural floor (~13k for this agent: GAUGE_1 13024 ≈ Round 1's 13023). The compaction *summary message* itself still exists and is the only inherited state — "keep 0" ≠ "empty session"; it means "the summary is the entire inherited state."
6. **`task_id` resume works across compactions.** The same worker session (`ses_f5f2…`) was resumed successfully after every compaction and kept its identity; a zero-keep compaction is effectively "wipe memory, keep identity" on an existing session.
7. **First-ever `ctx_gauge` call on a fresh session can return `CTX=notAvailable`** (db readout not yet populated) — second call immediately returns a numeric readout.

## Practical implications

- **Resetting a stuck/reused session:** `compact_memory` with `keepTokens=0, keepMessages=0` on the target `sessionID` is a clean in-place reset (no new session needed). Cost: all working continuity is lost; only what the compaction model could still see survives, in summary form.
- **Choosing the compaction model:** you can deliberately route compaction to a cheaper/smaller model via `modelID` (e.g. 12B for mechanical summaries) regardless of the session's main model — the provider boots exactly the named model for that run.
- **Delegation planning after cross-session compaction:** budget for the possibility of one "flush" delegation being consumed by the compaction routine; verify via the first probe gauge whether the session is at its expected post-compaction baseline before doing real work.

## Open questions / not verified

- Whether the compaction summary is actually stored inside a `<thinking>` block (worker's claim) vs. a standalone message — not verified against the session DB.
- Whether a zero-keep summary has lower quality/information than a default-budget summary (only source material was visible context at compaction time either way; not compared).
- Behavior if `modelID` names a model that does not exist on the provider (not tested).
- Whether `providerID` validation is real (only `llama-swap` was used).
