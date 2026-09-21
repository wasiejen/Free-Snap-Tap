# TASK — auto_resume #79: msgPairs dual-shape unwrap (Unit 4 action routing)

Worker: `worker_Q3S_110K_mtp`. Branch: stay on the current checkout (`opencode_test`).

## Goal
Fix TODO #79 (HIGH, live, measured): `msgPairs` in
`.opencode/plugin/auto_resume.ts` (line 521) never unwraps the SDK
`RequestResult` wrapper `{ data: [...] }` that `sess.messages()` returns
live → `lastAssistantAction` (line 548) / `userHasMarker` (line 535)
always see an empty list → Unit 4 routing NEVER recognizes an action line
→ finished planner sessions get spurious recovery prompts (context drain;
ping-pong on the single model slot, measured live this looprun — planner-6
was re-woken repeatedly after a valid `action: restart`).

## Design (the WHAT — HOW is yours inside this boundary)
1. `msgPairs` (line 521): normalize the dual response shape BEFORE the
   array check — a bare array stays; a non-null object with an array
   `data` property → use `data`; anything else → `[]`. The precedent
   pattern is verified in-repo — copy that normalization verbatim:
   `.opencode/plugin/compact_memory.ts` line 467 (`resolveModel`, the
   dual-shape fix of 280b8d0). Update the comment block at lines 515-518
   to document the dual shape (one line, the file's comment style).
2. The messages-RPC site is the SINGLE call at line 597
   (`msgs = await sess.messages({ path: { id: sid } })`) — verified at
   spec time (grep `\.messages(` in auto_resume.ts = one hit). No other
   site needs the unwrap.
3. Smoke (`.opencode/plugin/tests/auto_resume.smoke.mjs`): ADD one
   wrapper-shape case to the Unit 4 section: the fake client's
   `messages()` returns `{ data: [...] }` (not a bare array), the last
   assistant text part carries a recognized action line → the router acts
   on it (e.g. `action: stop` → `route= stop`, no send). KEEP all existing
   bare-array cases (dual shape — the same pinning approach as 4b1a965 /
   280b8d0). For the fake-client plumbing, follow the existing Unit 4
   fake-client pattern in the smoke (grep the smoke for the Unit 4
   section — it is the section with the scope/routing cases).

## Definition of done
- `node .opencode/plugin/tests/auto_resume.smoke.mjs` — ALL PASS (62
  existing + the new wrapper case).
- Standard gate green: `./.venv/Scripts/python.exe -m pytest -q`
  (459 passed + 1 known warning), `./.venv/Scripts/ruff.exe check
  --select F .` (F=0), `node .opencode/plugin/probes/handover_probe.mjs`
  (241/241 — reported total == header annotation; re-pin ONLY if an
  existing pin breaks — say so).
- ONE commit (code + smoke + handover bookkeeping), message per the
  commit-routine conventions.

## DO-NOT-touch
- `.opencode/plugin/compact_memory.ts` (read-only reference — the
  precedent), `opencode.jsonc`, `.opencode/maintainer/**`, the LIVE
  `.opencode/temp/**` files, auto_resume Unit 2/3 code blocks (incl. the
  UNIT B toggle that just landed in d4ef76e), probe sections.

## Context discipline
- Read ONLY: auto_resume.ts lines ~510-620 (MsgPair type + msgPairs +
  userHasMarker + lastAssistantAction + the scope/routing part of tick),
  compact_memory.ts lines ~439-483 (the resolveModel precedent), and the
  smoke's Unit 4 section (locate it by grep, then read it bounded). Run
  the gates. Nothing else.
