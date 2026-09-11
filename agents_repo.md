# agents_repo.md — repo-specific map for Free Snap Tap

Windows-only snap-tapping / rebind / macro tool (pynput low-level hooks,
PySide6 GUI, asyncio tasks) — the repo map is split into parts under
`.opencode/system_prompts/repo/`; read the part(s) you need, not the whole set.

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
