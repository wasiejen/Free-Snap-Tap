# inbox_worker/ — maintainer→worker messages

Files the maintainer drops for a worker (e.g. addressing one directly; content
verbatim, the `--worker:` prefix line = addressing). The addressed worker scans
this folder at session start BEFORE executing the task spec, handles each
message, moves the file to `../done/` (content untouched — the move is the
read-receipt), and records the handling in its summary.
