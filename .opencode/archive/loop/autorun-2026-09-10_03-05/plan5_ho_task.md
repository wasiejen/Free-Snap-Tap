# TASK — TODO #48: mouse filter packed-word equality → bit tests (delegation-ready per the #42 ruling)

FIRST read `AGENTS.md`, `agents_repo.md`, and this file.

## Goal

In `FST_Keyboard.mouse_win32_event_filter` (`fst_keyboard.py`), replace two
packed-word EQUALITY checks with bit tests / masks — the maintainer's #42
ruling (260910) requires that status bits in the other half of a packed word
must not change the outcome. TODO #48 is explicitly "implicitly approved …
delegation-ready" — no new behavior decisions are open.

## Evidence (planner-verified against the current tree; the file is 1088 lines —
the TODO entry's line refs are from an older version, use THESE anchors)

1. `fst_keyboard.py:464-465` — nested `is_simulated_key_event(flags):
   return flags == 1`. The flags word is the packed LLKHF word; bit 0
   (0x1) = LLKHF_INJECTED. Any other LLKHF bit set (e.g. 0x20
   LLKHF_LOWER_IL_INJECTED, value 0x21) fails `== 1` → an injected event is
   misclassified as REAL input.
2. `fst_keyboard.py:486-490` — for `msg in [523, 524]` (WM_XBUTTONDOWN/UP),
   `data.mouseData == 65536` → vk 4, `== 131072` → vk 5. For X-button
   messages the HIGH word of `mouseData` is the XBUTTON identifier
   (1 = x1, 2 = x2) and the LOW word is the key state (ctrl/shift). With a
   modifier held the low word is nonzero → both equalities fail →
   `get_mouse_vk_code()` returns None → the event is silently suppressed at
   `:530` with no rebind/tap processing.
3. Reference patterns already in the same file (follow their style):
   keyboard `is_simulated_key_event` = `return flags & 0x10` (`:535-536`);
   wheel direction = `bool((data.mouseData >> 16) & 0x8000)` (`:473-476`,
   the landed #42 fix — its comment at `:473-475` states the low-word-
   must-not-matter principle).

## Changes

1. Mouse `is_simulated_key_event` → test bit 0: `return bool(flags & 1)`
   (explicit bool preferred; the result feeds `is_simulated` into
   `_win32_event_filter`).
2. X-button mapping → test the HIGH word, low word ignored, e.g.
   `(data.mouseData >> 16) == 1` → 4, `(data.mouseData >> 16) == 2` → 5
   (or the equivalent mask — your call, mirror the wheel idiom above).
   If the comment block at `:451-453` becomes misleading after the change,
   reword it minimally.
3. Tests in `tests/test_filter_behavior.py` class `TestMouseWin32Filter`
   (reuse the `mouse_msg_data(mouse_data=…, flags=…)` helper + the
   `patch_filter` pattern; the `kb_env_ns` fixture is the mocked
   `FakeFST` — NEVER a live listener):
   - x1 down (523) AND up (524) with a nonzero low word (e.g.
     `65536 | 0x0010` shift) still map to vk 4;
   - x2 down with a nonzero low word (e.g. `131072 | 0x0101`) still maps to
     vk 5;
   - an X-button message with another identifier (e.g. `196608` = x3) still
     resolves no vk → suppress path (unchanged behavior — regression guard);
   - `flags=1` and `flags=0x21` (injected + lower-IL) both classify
     simulated; `flags=0` and `flags=0x20` classify real.
   - The existing tests `test_x_buttons_use_mousedata_for_vk`
     (zero low word) and `test_simulated_flag_passthrough` must stay green
     UNCHANGED — if `assert_called_with(…, False, …)` matching is a concern
     with a raw int return, prefer `bool(...)` so the pin stays exact.

## Out of scope

- `playground/pynput_mouse_probe.py` — the maintainer's personal live probe
  (evidence only in #48); do NOT touch.
- Anything else in the filter (the wheel path is already bit-tested; the
  plain-button paths have no packed word).
- No docs changes: WIKI/README do not document these modifier edges.
- Never run the live listeners; no real keyboard/mouse.

## Definition of done

1. `& .\.venv\Scripts\python.exe -m pytest -q` green — baseline 448 passed +
   1 known #10 warning BEFORE your tests; report the MEASURED count after
   (it rises by your new tests).
2. `& .\.venv\Scripts\ruff.exe check --select F .` = 0 findings.
3. `git diff` scope = exactly `fst_keyboard.py` +
   `tests/test_filter_behavior.py` + `TODO.md` + the summary file.
4. `TODO.md`: #48 `Status:` → closed one-line (date + commit ref) and the
   full record appended to `todo_records.md` per the TODO contract (the
   evidence stays in the record, not re-derived).
5. Write your EXECUTIVE SUMMARY to
   `.opencode/handover/handover_task_to_planner.md` (what changed, measured
   verification, commit hash, TODO entries, deliberate non-actions) — your
   commit is the LAST write to that file.
6. ONE commit (code + tests + TODO.md + todo_records.md + summary).
   `opencode.jsonc` is NEVER staged.

## Context discipline

Small task — keep reads chunked (the filter region is `:439-531`), gauge
(`node .opencode\plugin\scripts\peek.mjs`) between units and after the
commit; stop line `REM ≤ 15k` or `≥ 85 %`. Findings you cannot fix in scope
→ APPEND to `todo_inbox.md` (never `TODO.md`).
