# repo_overview.md — repo-specific map for Free Snap Tap (READ FIRST)

Windows-only snap-tapping / rebind / macro tool (pynput low-level hooks,
PySide6 GUI, asyncio tasks) — the repo map is split into the parts in THIS
folder; read the part(s) you need, not the whole set.

Maintained by the maintainer; agents do not edit it directly. If a part
conflicts with the code, the code wins — flag the discrepancy in your summary
or `TODO.md`. Edit a part only if explicitly tasked.

Parts (read when …):
- `repo_map.md` — read when you need the project overview, sign convention,
  module map, data flow, the worker roster, or phase-scoped pointers.
- `repo_commands.md` — read when running shells, tests, gates, or the gauge,
  or when you need the handover / archive / NAP file paths.
- `repo_testgate.md` — read when writing or running tests, or before touching
  the input pipeline (no live listeners).
- `repo_gotchas.md` — read when debugging odd behavior, or before editing code
  in the areas named there.
- `repo_custom_tools.md` — read when using (or delegating) the
  host-specific opencode tools (block_transfer, ctx_gauge, loop_log,
  compact_memory) or when one of their behaviors surprises you.

## Safety limits
- **Backend inference server** (llama-swap, SINGLE model slot —
  192.168.178.20:8033 as of 2026-09-24, the address may move): agents
  NEVER launch requests at it — not for tests or probes, not even
  enumeration (GET /v1/models). A direct request evicts whatever model
  the live session is using (measured 2026-09-24: an 80k prefill probe
  kicked the planner's own model out of the backend mid-session). All
  model traffic goes through opencode sessions only; the maintainer
  alone touches the backend (e.g. moving the context limit there —
  no opencode.jsonc change needed).
- **Permanent startup load errors (measured 2026-09-24):** every
  process start logs `failed to load plugin` for `compact_memory.ts`
  ("The \"paths[0]\" property must be of type string, got object") and
  `intercept_observer_core.ts` ("Plugin export is not a function") —
  yet the compact_memory tool WORKS (a self-compact ran under the same
  failing start) and the observer intercepts live (intercept.log
  grows). The maintainer confirmed no alternative plugin versions
  exist — the files load despite the errors. FIX PENDING (separate
  item; the maintainer flagged it 2026-09-24).
