# _past_priorities — handled items from `priority.md` (append-only log)

Agents append ONE line per handled item, format:
`- <item as it was in the list> — <short reply>` (done / done, commit X /
see proposals/implemented/<file> / see TODO.md #N). No re-reading, no
re-editing of old entries. The maintainer owns this file — he erases entries
when he wants. The convention itself lives in `priority.md` (section
"How this works").
- # 1 compact_memory plugin that also exposes a tool (quant-class budget + CPU exclusion + optional post-compaction instruction) - done: build e07ae33, bugfix 2ace5e1, live self-compact acceptance bdc4504 (probe 98/98); residual acceptance items 3-4 (cross-session + budget-denied fire) maintainer-side; trail: proposals/approved/2026-09-12_compact_memory_plugin.md + TODO #52
