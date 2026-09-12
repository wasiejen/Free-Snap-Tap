# inbox_planner/ — maintainer→planner messages

Files the maintainer drops for the planner (content verbatim; the `--planner:`
prefix line is the addressing line; bundling is fine). The planner scans this
folder at session start BEFORE planning, handles each message, moves the file
to `../done/` (content untouched — the move is the read-receipt), and records
the handling in the NAP/TODO as usual. A `--main`/`--maintainer` marker
anywhere in a file is a direct instruction: act on it first, then remove the
marker line.

`draft/` — his drafting-session scratch; scan it ONLY when nothing else is
open in this inbox.
