# P06 — host-dependent DoD checks must run on the REAL host

**Proposal:** add to `prompt_agent_task.md` (and/or `agents_repo.md` gotchas): "For
host-dependent capability checks (built-in modules, runtime flags, bundled binaries),
the DoD must name the REAL host — probe from inside the plugin/process or with the
bundled runtime; never a same-named system CLI."

**Context:** agent_feedback (T1, "DoD 'bun host-proxy check' verified the wrong bun"):
the check ran under SYSTEM bun — which passes — while the bun baked into
`opencode.exe` lacks `node:sqlite` entirely; the build + a maintainer restart cycle
produced only the failure lines as "evidence" (TODO #37, since closed by the backend
chain).

**Impact / risk:** doc-only; prevents same-named-CLI false confidence in future builds.

**Verdict:**
- this is repo specific and should go into agents_repo.md
- implemented 2026-09-10 (looprun 2, iter 3): applied per the comment — gotcha
  in `agents_repo.md` (host-dependent capability checks probe the REAL host,
  never a same-named system CLI).
