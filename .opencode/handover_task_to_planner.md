# Worker summary — TODO #3: README + WIKI rework to current code state (2026-09-10)

Worker: worker_Q4_120K (docs task per `.opencode/handover_task.md`)

## Executive summary
Docs-only rework of `README.md` + `WIKI.md` covering all 15 decided items of
`SPEC_FEATURES.md` §2 (5) + §4 (10). Every item was verified against the current
code BEFORE rewording — no reword contradicts its recorded decision. No code,
no tests, no `SPEC_FEATURES.md` changes. WIKI.md enters git as a NEW tracked
file (it was gitignored/untracked until the `wiki.md` ignore line was removed
outside this task).

## Per-item verification (code evidence)
- §2.1 WIKI [Tap_Groups]: key strings only — a sign or `|` delay in a tap-group
  key raises at group init (`fst_keyboard.py:273-281`, `convert_to_vk_code`
  `:142-153`).
- §2.2 README feature #5: per-key delays valid in Macros only; Tap_Groups use the
  global `-tapdelay=` / `-nodelay` (`fst_manager.py:718-755`, ACT_* delays).
- §2.3 WIKI sequence `|(name)`: counter reset only — the in-flight playback
  interrupt call is commented out (`fst_keyboard.py:996-1012`).
- §2.4 WIKI status indicator: usable per-focus; only the GUI-loop START is
  default-arg-only (`fst_manager.py:928-933, 1424-1430`, `fst_keyboard.py:1024`,
  overlay poll `fst_overlay.py:153-158`, GUI loop start `free_snap_tap.py:172-203`).
- §2.5 WIKI crosshair: GUI loop also starts with `-tray_icon` alone; tray menu
  "Toggle Crosshair" (`fst_overlay.py:340`).
- §4 #5 WIKI [Macros]: playback via asyncio tasks — interruptible, non-blocking
  (`fst_keyboard.py:851-868`).
- §4 #6 `|(name)` documented per type: macro name → interrupts started playback;
  sequence name → resets counter only; unknown name → silent no-op True
  (`fst_manager.py:643-693`).
- §4 #7 `|reset('name')` on a non-sequence: prints "No Macro Sequence ... reset
  failed", no-op (`fst_keyboard.py:1012`).
- §4 #9 `dc()`: sign carries no meaning; 9999 sentinel for "not pressed"
  (`fst_manager.py:275-288`).
- §4 #10 `p()`: evaluated after the current event updated real state; sign
  ignored (`fst_keyboard.py:611`, `fst_manager.py:244-246`).
- §4 #11 invocations valid at trigger/constraint placement too; suffixes checked
  left to right, stop at first False (`fst_manager.py:103-104`,
  `fst_keyboard.py:561`).
- §4 #12 README: title "Macros (Aliases)" → "Macros, Aliases"; "Python 3.6 or
  higher" → "Python 3.12" (venv = 3.12.9); typos fixed; V1.1.3 → V1.2.0 (WIKI
  header already 1.2.0; WIKI per-section "updated to V1.1.3" markers kept as
  history); the `|(!)` example comment's reasoning reworded to the left-to-right
  short-circuit (the observable "original key not suppressed" claim kept —
  matches code).
- §4 #13 WIKI: a None/empty ke has NO default delay (pure timing marker)
  (`fst_manager.py:134-138`); the "###XXX up for debate" note removed.
- §4 #14 WIKI/README: rebind matched but replacement constraints fail → original
  suppressed + nothing sent (pass-through pattern `a|(p("shift")) : b`); a signed
  key on the replacement side of a Key rebind is reinterpreted as a plain Key
  (`fst_keyboard.py:295-304, 649-658`); keys inside `p(...)`-style evals must be
  quoted strings.
- §4 #15 case-sensitive substring focus matching — ALREADY documented in WIKI
  ("focus app name" bullet), verified against `fst_tasks.py:96`; no change
  needed.

## Adjacent fixes (committed separately, per AGENTS.md)
- Commit `fcc3add` (before this one): TODO #45 — WIKI [Suffixes] invocation
  description corrected (invocations always True; suffixed key_event still
  played), WIKI [Rebinds] example `+a, +b` → `+a : +b`, README "he first" →
  "the first". The WIKI part rides along in WIKI.md's first commit (it was
  untracked). Both WIKI fixes verified present in the committed WIKI.md copy
  (lines 209-230, 102).

## Measured verification (gate)
- `& .\.venv\Scripts\python.exe -m pytest -q` → **434 passed**, 1 warning
- `& .\.venv\Scripts\ruff.exe check --select F .` → **All checks passed** (F=0)
- `git diff --stat` scope → only allowed files (`README.md`, `TODO.md` modified;
  `WIKI.md` new untracked file). The pre-existing `.gitignore` change (removed
  `wiki.md` line, made outside this task) was NOT staged.

## Commits
- `fcc3add` — adjacent doc errors (TODO #45), already in log.
- This task's commit (contains README.md, WIKI.md, TODO.md, this file) — see
  git log; hash reported in the worker's final message.

## TODO entries
- #3: status tail appended (per-item LANDED evidence, gate, anomaly, residual).
  Entry NOT closed — residual §3 docs remain.
- #46: NEW — flaky `test_crossover_not_taken_on_low_roll` (timing-dependent),
  pre-approved test-only fix, OPEN.
- #45: closed earlier (adjacent fixes, commit fcc3add).

## Anomalies / deviations
- WIKI.md was untracked: `.gitignore` had a `wiki.md` entry removed outside this
  task. WIKI.md is added as a new tracked file; the `.gitignore` edit itself is
  NOT staged (left for the maintainer).
- Flaky test failed once in the first full-suite run (434 passed on re-run + in
  isolation). Pre-existing, order/timing-dependent, code untouched — recorded as
  TODO #46.

## Deliberately not done
- Residual §3 documentation (variable system, typing/toast/mouse/clipboard/file
  invocations, extra start args, numpad debug combos) — separate, larger docs
  task (candidate for a new TODO entry; maintainer's call on scheduling).
- `.gitignore` change — pre-existing, not part of this task, left uncommitted.
- Closing #3 — kept OPEN per the residual above.
- Fixing the flaky test — out of scope for a docs-only task (recorded as #46).
