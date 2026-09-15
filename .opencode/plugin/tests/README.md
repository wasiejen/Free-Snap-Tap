# plugin/tests — smoke tests for the custom plugin tools

Purpose: one smoke file per tested tool, same stem as the tool (behavior
suffix where two anchors exist). Run each from the repo root with plain
`node` (v24, type-stripping): `node .opencode/plugin/tests/<file>.smoke.mjs`
— exit 0 iff all checks pass. Shared boilerplate (repo-root resolution,
type-stripped import, sandbox setup, assert/fail-count) lives in
`_smoke_base.mjs` — do not copy-paste it into new smokes.

What goes here: behavior smokes for the tools in `.opencode/tools/`, the
plugin tools in `.opencode/plugin/`, and the gauge core
(`scripts/gauge.mjs`). Runtime fixture files are created under the host
scratchpad `C:/Users/Wasiejen/AppData/Local/Temp/opencode/` (each smoke in
its own subdir, cleaned on start) — that hardcoded path is deliberate
(runtime sandbox, not a source path); no absolute SOURCE path belongs here.

What does NOT go here: `probes/` (the plugin's own probe, distinct from
tool smokes), the pytest suite (repo root `tests/`), and anything that
touches the live loop folder `.opencode/loop/` or the live `opencode.jsonc`
(smokes sandbox instead). New smokes need a green run before commit.
