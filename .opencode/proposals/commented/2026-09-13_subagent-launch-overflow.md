# 2026-09-13 — subagent launch context overflow on this host (planner-flagged)

Status: AWAITING APPROVAL (host-side — maintainer's domain: llama-swap allocation /
opencode config).

## Problem
Task-tool subagent launches on this host fail at the REQUEST level with
`context_length_exceeded: the request exceeds the available context size`
(or "…try increasing it"). Three data points, all 2026-09-13, all the same
committed spec (nap-size Part 2, `a018f49`):

1. `ses_f67324bf4ffeEeQMPWJBhFGRya` (planner_Q4_120K text-worker, iter 3) — ran
   ~16 read steps, then overflowed (6 host retries over 13 min), zero artifacts.
2. `ses_f66f1edc9ffeB78gLoWb4LjunF` (planner_Q3_120k_mtp text-worker, iter 4
   retry step 1) — request-level failure; server log
   (`~/.local/share/opencode/log/opencode.log`) shows 6 error→retry pairs over
   13 min on `Qwen3.8-27B-IQ3KT-120K_MTP`, final `process` error, zero
   artifacts, no WIP.
3. `ses_f668543dcffebxrGu3meTIjVrp` (planner_Q4_120K text-worker, iter 4
   retry step 2) — instant request-level failure, zero artifacts.

## Verified facts (planner, 2026-09-13)
- `opencode.jsonc` (live file, read-only check): all three 120K model entries
  (IQ4KT-120K, IQ3KT-120K_MTP, IQ4KT-120K) carry `limit.context: 120000` —
  the failures happen BELOW the configured limit.
- The parent planner session on `Qwen3.8-27B-IQ4KT-120K` runs fine at 85 %+
  usage (iter 4 itself) — the overflow is specific to subagent launch
  requests (or the MTP/3bit model's effective window), not the IQ4KT-120K
  model in general.
- The Q3-MTP error text carries "context shift is disabled" — the host's
  context-shift path does not rescue these requests.

## Recommendation (one)
Check the effective context allocation of the two models in llama-swap (and
the actual subagent prefill size in the server log). Until fixed, the
sanctioned path for text-worker tasks on this host = the PLANNER-DIRECT
bounded-read fallback (recorded in the NAP: NAP sections in ~150-line chunks,
compressed line per chunk written to a scratch file, final splice at the end).

## Open question
Should `opencode.jsonc` `limit.context` values be set to the models' ACTUAL
effective windows (so the host can context-shift/compact instead of hard-
failing the request)? If yes, that also re-opens the worker-prompt launches
(died the same way at the compact_memory build, cf. the iter-1/iter-3 records).


--comment: can be moved to rejected? or better implemented i guess
- checked on the settings and context-shift is already active. limits are correct. if in limit there is nothing to shift anymore. around 500-1000 tokens or so can be shifted to end a tool or write, but not more. then there is nothing to be done except compaction
  - see cross-compaction
