# Feedback — block_transfer current status (planner-1, looprun 2026-09-16_13-33, 2026-09-16)

In reply to the `--comment` on TODO #57 ("can you write a short feedback in
maintainer/feedback folder what the current status of the tool is?").

## What it does today
Multi-line block operations on files via short UNIQUE line-prefix anchors
(`startMarker`/`endMarker`, block spans inclusive): MOVE / COPY / CUT /
PASTE (named buffers, `bufferName`, default `default`) / DELETE / CLEAR.
`targetMarker` sets the insertion point in the destination.

## Status
- **Sandbox (your "shared scriptlet" point):** every file access — read AND
  write — is confined to the workspace + the approved temp dir; any path
  outside is rejected with an error. This guard lives in the tool itself
  (one place, `block_transfer.ts`), not a shared scriptlet the scripts
  import. Your idle thought about ONE shared scriptlet for all data-mutating
  scripts: not built — the `.opencode/agent/scripts/` scripts today are
  read-only (DB/binary/log inspection) or write into the workspace corpus by
  explicit flag; the one script with a write path (`dump_session.cjs`) has
  its own path handling. If a shared guard scriptlet becomes worth it, it
  will be when a second script gains a write path.
- **Data-loss guard:** the #57 MOVE-with-missing-`dstFile` silent-delete bug
  is FIXED (guard hoisted pre-write, 733ca7a, closed). The "when in doubt
  save to buffer" question: CUT already preserves the yank in a named buffer
  by design; DELETE discards (that is its point) — there is no automatic
  "save to buffer on doubt" fallback, and CLEAR empties a buffer explicitly.
  If you want a `safemode` where DELETE parks into a buffer instead of
  discarding, that is a small addition — say the word.
- **Pinning:** probe section S15 (10 checks) pins the contract (S16 pins
  loop_log); smoke 22/22 incl. the invalid-input guards. Usage guide:
  `repo_custom_tools.md` (read-when-needed part).
- **Known limits (as designed):** anchors must be UNIQUE line prefixes
  (no regex, no fuzzy); one block per call; no cross-session buffers
  (buffers live in the tool's process lifetime); MOVE between files requires
  both paths inside the sandbox.
- **Live usage:** in active use by planner/worker sessions for moving
  multi-line blocks (NAP sections, TODO entries, prompt hunks) instead of
  write/edit — working as intended; no incident since the guard fix.

--comment 26-09-16_15-03: 
- "no incident since the guard fix"? and before? :-)

- would an APPEND option to append to the buffer be useful?
  - e.g. copiing multiple sections into the buffer to be then put into a new file. to e.g. create a specialised nap version for tasks or to copy together relevant sections of files into another file as handover_addition or compact_addition?

or thinking the thought further
- a COLLECT option that accepts list of:
  - [[`path`, `startMarker`/`start_line_number`, `endMarker`/`start_line_number`], [`path`, `startMarker`/`start_line_number`, `endMarker`/`start_line_number`], ...] 
  - to copy all sections with references included: "path:160:210\n + section \n" into buffer and copy them to the target file or target marker or marker pair?
    - maybe also possibly accepts [`path`, [[`startMarker1`, `endMarker1`], [`startMarker2`, `endMarker2`], ...], ...]
