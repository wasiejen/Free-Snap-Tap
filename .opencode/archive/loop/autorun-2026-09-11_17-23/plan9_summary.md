# plan9 summary (iter 9) — FST behavior batch complete on `fst_work`

- **Unit A (TODO #1)** verified + accepted: `4b93d37` — one `FST_Keyboard.surface_config_error` helper (GUI P08 error toast / headless print); both constraint fail-closed guards + `check_for_combination` + the hot-path resume catch routed through it; dedup + fail-closed preserved. Gates measured by me: 455 passed + 1 #10, ruff F=0.
- **Unit B (TODO #7/#8/#9/#4)** verified + accepted: `2891dab` — #7 comment-only (behavior wins); #8 union semantics + symmetric `vk_code > 0` guard; #9 `ValueError` hardening (5 sites incl. `stop_repeat` consistency addition); #4 dead branch deleted. Gates measured by me: 459 passed + 1 #10, ruff F=0.
- **Batch closed:** proposal approved → `implemented/` with VERDICT; TODO #1/#4/#6/#7/#8/#9 → one-line records (full text in `todo_records.md`); #11 line refs refreshed (≈821).
- **Maintainer-visibility flags:** `stop_repeat` fifth `ValueError` site (beyond Rec 4's letter); `stop_all_repeat` = `(AttributeError, ValueError)`; `fst_work` merge → `opencode_test` is his call (branch was his directive); `plan8_*` files exist only on `opencode_test`.
- **Slipped to iter-10 (stop line):** file the 3-item batch proposal for `inbox_planner/26-09-11_21-50.md`, then delegate the tool builds (implicitly approved).
- **Baselines:** `fst_work` @ `36f3ced`: pytest 459 + 1 #10, ruff F=0; probe 80/80 (carried, no plugin change).
