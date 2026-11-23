# Free Snap Tap - Documentation

The docs index. Each page answers one kind of reader task; the short feature
overview, install, and build steps stay in the [README](../README.md).
(This folder replaced the old single-file `WIKI.md` - one home, indexed here.)

| Question | Page |
|---|---|
| What is FST and what do the terms mean (key_event, key_group, trigger_group, vk_code, focus app...)? | [concepts.md](concepts.md) |
| How do I pause, stop, or return to the menu - and what are the ALT+NUM debug combos? | [controls.md](controls.md) |
| How do I report a bug? (the `fst_status.log` status dump) | [controls.md](controls.md) |
| How do the status dot, the crosshair, and the toast boxes look, sit, and follow resolution changes? | [overlay.md](overlay.md) |
| How do I write config lines: aliases, tap groups, rebinds, macros, macro sequences? | [groups-macros.md](groups-macros.md) |
| Why does a focus-app switch take up to 250 ms? Why can a hung window delay a macro? | [internals.md](internals.md) |
| What are prefixes (`-a`, `+a`, `^a`) and suffixes (`|...`) - delays, constraints, evaluations? | [prefixes-suffixes.md](prefixes-suffixes.md) |
| Which invocations exist (repeats, variables, typing, mouse, clipboard, file ops, backups, toasts, misc)? | [invocations.md](invocations.md) |
| How is the config file structured - `<focus>` groups, `<arg>` lines, continuation lines? | [config-file.md](config-file.md) |
| What does each `<arg>` start argument do? | [start-arguments.md](start-arguments.md) |

Start-argument ownership: [start-arguments.md](start-arguments.md) is the
complete reference; the README `[Extra Start Arguments]` list is a short
overview that points there.

Version history: [CHANGELOG.md](../CHANGELOG.md) (v1.3.0 up) plus the
`RELEASE_NOTES_*.md` release bodies; earlier releases on
[GitHub Releases](https://github.com/wasiejen/Free-Snap-Tap/releases).
