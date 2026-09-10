# P10 — maintainer→agent handover channel: per-message inbox in `proposals/maintainer/`

**Proposal:** replace the single append-only `.opencode/handover_maintainer.md` with a
per-message file channel: the maintainer writes ONE file per message into
`proposals/maintainer/inbox/` (e.g. `M260910-1343_files-subfolder.md`, content verbatim
incl. the `--planner:`/`--worker:` addressing line); the addressed agent scans `inbox/`
at session start and, after handling a message, MOVES it to
`proposals/maintainer/done/` (content untouched — the move = handled, mirroring the
approved/commented/rejected move semantics). The old single file is retired (archived,
not deleted — deletion is his call).

**Context:** the current single-file channel has three friction points (observed over
looprun 2):
1. **No "processed" signal.** The planner tracks which `YYMMDD-HHMM` timestamps it has
   already handled in the NAP from memory — after a restart or an interrupted session a
   message can be re-processed or (worse) skipped; there is no durable, locational
   read-receipt.
2. **Mixed types in one growing file** (rulings, task approvals, questions, channel
   announcements) — re-reading the whole file every session start costs context that
   grows per message.
3. **Git-status noise + commit ambiguity.** The file is maintainer scratch but tracked:
   it shows as `M` in every iteration's `git status`, and each loop iteration's notes
   must restate "do not commit maintainer-owned files". Per-message files give a
   clean "new file in inbox" attention signal instead.

**Proposed action:**
1. Add `proposals/maintainer/{inbox,done}/` + a short convention block (one section) in
   `proposals/README.md`: "maintainer/ = the reverse direction (maintainer→agent);
   inbox = new, done = handled by the addressed agent; naming `M<YYMMDD-HHMM>_<slug>.md`,
   naming is loose — the content is what is read".
2. Maintainer workflow: one file per message into `inbox/` (same content format as
   today — the `--planner:`/`--worker:` prefix stays the addressing line).
3. Agent workflow (planner prompt + this NAP): scan `inbox/` at session start BEFORE
   planning; after each message is handled (ruling recorded / task done / question
   answered in the closing message), `Move-Item` it to `done/` — never edit the
   content, never commit messages the maintainer has not yet moved... (the agent
   commits the moves as bookkeeping, same as the approved/ moves).
4. Cutover: the 3 current messages are already handled (1333 = numbered specs approved
   and in use; 1343 = files/ subfolder landed + README updated); the ONE open request
   (1336 = NAP-bloat / prompt-separation proposal) becomes the first `inbox/` message
   at cutover. `.opencode/handover_maintainer.md` → `.opencode/archive/` (retired).

**Impact / risk:** small workflow change for the maintainer (create-a-file instead of
append) — mitigated by loose naming (a scratch file renamed later is fine; only the
inbox location matters to the agent). Zero change to the planner's planning logic —
"check changed files" becomes "scan inbox". If the per-file rhythm is too annoying, the
fallback (option B) is a single `proposals/maintainer.md` — same benefits minus the
processed-signal; I recommend option A because the read-receipt is the actual pain.

**Verdict:**
- as long as i do not have to write one file per idea and collect more in one file. i am ok the inbox/read folder implementation (A)
- implemented 2026-09-10 (looprun 2, iter 3): `proposals/maintainer/{inbox,done}/`
  created + README section; the bundling condition is part of the convention
  (several messages may share ONE inbox file — the move = ALL messages in it
  handled); the first inbox message carries the open 1346 request (NAP-bloat /
  prompt-separation proposal); `.opencode/handover_maintainer.md` retired to
  `.opencode/archive/`; the planner prompt Orientation step now scans `inbox/`.
