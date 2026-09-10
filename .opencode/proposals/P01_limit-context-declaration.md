# P01 — declare `limit.context` per model in opencode.jsonc

**Proposal:** add a `limit` field to each llama-swap model entry so opencode's
ASSUMED context window matches the server's real KV window.

**Context:** agent_feedback (s5, "Delegation context-death at first request"): a
Task-tool launch of `worker_Q4_120K` DIED at its FIRST request
(`context_length_exceeded ... context shift is disabled`, 500) because no `limit` is
declared — opencode's window assumption governs, and the worker-prompt initial
request sits right at it. The raw `agent_Q4_120K` (empty prompt → smaller initial
request) is the current workaround. Related: the "256K"-named gemma endpoint is
actually 128k-capped (TODO #40) — the name-based assumption is already proven wrong once.

**Proposed action (paste into `opencode.jsonc` → `provider.llama-swap.models`):**
```jsonc
"Qwen3.8-27B-IQ4KT-120K": { "name": "Qwen3.8-27B-IQ4KT", "limit": { "context": 120000 } },
"Qwen3.8-27B-IQ3KT-120K_MTP": { "name": "Qwen3.8-27B-IQ3KT-MTP", "limit": { "context": 120000 } },
"Qwen3.8-27B-IQ3KT-210K": { "name": "Qwen3.8-27B-IQ3KT", "limit": { "context": 210000 } },
"Qwen3.8-27B-IQ4KT-50K-MTP": { "name": "Qwen3.8-27B-IQ4KT-MTP", "limit": { "context": 50000 } },
"Gemma4-12B-Q4KXL-MTP-256K": { "name": "Gemma4-12B-Q4KXL-MTP", "limit": { "context": 128000 } },
"Gemma4-12B-Q4KM-UC-256K": { "name": "Gemma4-12B-Q4KM-UC", "limit": { "context": 128000 } },
```
(verify the exact per-server KV windows first; the output cap field if the server
documents one)

**Impact / risk:** worker-prompt launches stop 500ing on the first request; compaction
instead of death. Risk: declaring a limit ABOVE the server's real KV moves the 500
later in the session — declare conservatively.

**Verdict:**
