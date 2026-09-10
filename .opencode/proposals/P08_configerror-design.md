# P08 — config-error surfacing design (TODO #44 + the #1 family)

**Proposal:** one custom `ConfigError` exception with a structured message, raised at
the config-origin sites and caught at the user-facing boundaries (CLI print / GUI toast /
hot-path warning) — never an uncaught crash, always a helpful "where in YOUR config" hint.

**Context:** maintainer ruling 260910 on #44: "uncaught Errors should always be caught;
everything that is based on the FST_config/userconfig file should be caught, but signaled
to the user with helpful information for finding the error in their config ... maybe a
custom configErrorException that contains the reason ... open for suggestion — good place
for a concrete proposal."

**Proposed design:**
1. `fst_data_types.py` (no I/O): `class ConfigError(Exception)` — stores `.reason`
   + `.context` (focus name / key string / line if known);
   `str()` = `FST config error: <reason> (<context>)`.
2. RAISE sites (config-origin failures — same failures, now typed):
   - focus name absent from the (reloaded) `multi_focus_dict` in
     `apply_focus_groups` / `apply_start_args_by_focus_name` (#44) —
     `reason="focus group '<name>' not found — renamed or removed in config?"`;
   - out-of-range / unknown key strings in `convert_to_vk_code` instead of the
     implicit `None` (#1 family, incl. the `check_for_combination` site) —
     `reason="key '<str>' does not resolve to a vk code"`.
3. CATCH sites (the exception travels up and dies here, with a user-visible message):
   - CLI/headless top level + CLI-menu "Reload everything" → `print(f"[FST] {e}")`
     (at startup: print + exit; mid-run: print + continue);
   - win32 hot path: wrap the group-apply call in `_win32_event_filter` —
     `except ConfigError: print(...)` (the listener MUST survive);
   - GUI (StatusOverlay / TrayIcon toggle handlers): `except ConfigError: toast(str(e))`.
4. Fallback semantics (decided with the raise): stale focus name → degrade to the
   DEFAULT groups + printed error; the program keeps running.
5. Tests: raise at each site; hot path survives a stale focus name (listener still
   filters); CLI menu prints the message.

**Impact / risk:** observable change = config errors become printed + degraded instead
of uncaught crashes (the approved direction per the ruling). The degrade-to-defaults
fallback is the one part that needs the maintainer's final yes.

**Verdict:**
