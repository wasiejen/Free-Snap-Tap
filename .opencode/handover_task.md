# TASK — #3: README + WIKI rework to the current state of the code (decided items only)

FIRST read `AGENTS.md`, `agents_repo.md`, this file, TODO.md entry #3, and
`SPEC_FEATURES.md` in full (it is the decisions source — sections 2 and 4 carry
the 2026-09-06 maintainer decisions you are implementing).
Repo root = the directory containing `agents_repo.md`.

## Goal
`README.md` and `WIKI.md` state the current code behavior: every item in
`SPEC_FEATURES.md` §2 (documented-but-wrong) and §4 (decided discrepancies) is
fixed in the docs per the recorded 2026-09-06 decisions. Docs-only work —
**no code, no tests, no behavior change.**

## The fix list (each = one doc change, verified against the code before you write it)
§2 — documented but NOT implemented (reword the docs to what the code does):
1. WIKI `[Tap_Groups]`: "key_event notation `-a, -d` will be interpreted as Keys"
   is FALSE — tap groups accept plain key strings only (a `|` delay or sign in a
   tap-group entry raises at group init).
2. README #5: per-key delays in Tap Groups is FALSE — only the global
   `-tapdelay=` / `-nodelay` start args affect tap groups.
3. WIKI `|(name)` on a macro *sequence*: the in-flight playback is NOT
   interrupted — the invocation only resets the sequence counter.
4. WIKI "status indicator can only be used as default argument, not in a focus
   group" is FALSE — per-focus `<arg>-status_indicator` is parsed and applied;
   what is genuinely default-only is the GUI *loop* starting at startup (or
   `-tray_icon`).
5. WIKI "crosshair only works if Status Indicator is used" is FALSE — the GUI
   loop also starts with `-tray_icon` alone, and the tray menu toggles the
   crosshair.

§4 — discrepancies with recorded decisions (document per the decision):
- #5: WIKI "macros played in its own thread" → they are asyncio tasks now
  (interruptible, non-blocking).
- #6: `|(name)` semantics differ by type — macro name interrupts started
  playback (no reset); sequence name resets the counter (no interrupt of
  in-flight playback); unknown name is a silent no-op. Document per-type.
- #7: `|reset('name')` on a non-sequence name prints
  "No Macro Sequence ... reset failed" and does nothing else — keep + document.
- #9: `dc()` ignores the sign of its key argument — document that the sign
  carries no meaning (interval between same-phase events; 9999 sentinel when no
  previous events).
- #10: `p()` is evaluated AFTER the current event already updated the real
  press state (so `+ke|(p('ke'))` is always False, `-ke|(p('ke'))` always
  True) and ignores the sign of its argument — document both.
- #11: invocations work at trigger/constraint placement too (not only
  replacement key / macro groups), left-to-right with short-circuit — document.
- #12: README/WIKI hygiene — title mixing "Macros (Aliases)" where the code
  treats them separately; "Python 3.6 or higher" → the venv is 3.12 (state
  "Python 3.12" per the repo venv fact); typos "Repetiton" / "repetition will
  interrupt inself"; the README comment claiming the original key is NOT
  suppressed after `|(!)` (keep the observable claim if it matches the code,
  fix the reasoning); online-Wiki links/version refs V1.1.3 → V1.2.0.
- #13: a `None`/empty ke has NO default delay (pure timing marker unless given
  explicit delays) — remove the "###XXX still up for debate" note.
- #14: when a rebind is matched but the *replacement's* constraints fail, the
  ORIGINAL key is suppressed and nothing is sent (document + the pass-through
  pattern `a|(p("shift")) : b` for users who want the original to pass); a
  signed key on the RIGHT side of a Key rebind (`a : -b`) is reinterpreted as a
  plain Key (press+release pair); keys inside `p(...)`-style evals must be
  quoted strings.
- #15: focus matching is a case-SENSITIVE substring match — document.

## Rules
- **Code is ground truth.** SPEC_FEATURES.md line numbers are as of 2026-09-06
  and have drifted — for every fix, verify the claim against the CURRENT code
  (grep / targeted window reads) before rewriting the doc line. If the code no
  longer matches the recorded decision, STOP that item, flag it in the summary,
  and leave the doc as-is (do not decide).
- **Sign convention (mandatory in any example you write):** `-key` = key
  pressed, `+key` = key released, `^key` = toggle (per `agents_repo.md`).
- Docs-only diff: `README.md` + `WIKI.md` (plus TODO.md status tail + the
  handover files). `SPEC_FEATURES.md` is READ-ONLY for you (it is the decisions
  record). No production code, no tests.
- Keep the edits minimal and in-place — reword the wrong passages, do not
  rewrite whole sections for style. §3 items (features implemented but
  undocumented, e.g. the variable system, typing/toast/mouse/clipboard invocations)
  are OUT OF SCOPE for this task — do not add new feature sections.
- Preserve the docs' existing structure/heading style; fix content, not layout.

## Definition of done + verification
1. Every §2 item (1-5 above) and every §4 item (#5,#6,#7,#9,#10,#11,#12,#13,
   #14,#15) is fixed in the docs per its recorded decision, each verified
   against the current code (list the verification per item in the summary).
2. `git diff --stat` touches ONLY `README.md`, `WIKI.md`, `TODO.md`, the
   handover files.
3. Gate green: `& .\.venv\Scripts\python.exe -m pytest -q` → 434 passed (unchanged);
   `& .\.venv\Scripts\ruff.exe check --select F .` → F = 0.
4. TODO.md #3 gets a status tail: LANDED (date) + per-item one-liner (which doc
   line changed) + residual note: "§3 undocumented-features documentation
   (variable system, typing/toast/mouse/clipboard/file invocations, extra start
   args, numpad debug combos) remains a separate, larger docs task — candidate
   for a new entry". Entry NOT closed (the residual keeps it open).

## Commit (per AGENTS.md)
Commit docs + TODO.md + `.opencode/handover_task_to_planner.md` (your EXECUTIVE
SUMMARY — write it there AND return it as your final message: per-item
verification, measured gate output, commit hash, deviations, deliberately-not-done).
End with your verbatim self-gauge line (`node .opencode\ctxgauge\peek.mjs`).

## Context discipline
All three docs are small (≤ 326 lines) — full reads are fine. Code reads:
targeted windows only (grep first, offset/limit). Gauge-check between the WIKI
pass and the README pass; at REM ≤ 20k finish the commit routine and stop at a
clean committed point, listing the residual items in the summary.
