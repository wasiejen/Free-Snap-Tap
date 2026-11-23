# Start Arguments - complete reference

> Part of the FST docs: [index](README.md) - [features & install](../README.md)

## [Start Arguments]

Only the startargument `-file="filename" should now be used as start argument in the batch or in link. 
Everything else should be put in the config file and then can be applied on a per Game based as needed.
- use the same arguments in the config, just with `<arg>` in front - drop the `<arg>` prefix to use the same token on the command line
- each live entry below carries one copy-paste example (the retired `-default_on` carries none by design): a bash fence is a config `<arg>` line, a bat fence is a command line; dashed spellings are accepted (`-exec-one-macro` == `-exec_one_macro` - the name matches with `-` read as `_`, the value after `=` stays verbatim)

> Ownership: this section is the complete start-argument reference. The README `[Extra Start Arguments]` list is a short overview that points here - each flag is documented once, here.

-  `<arg>-nomenu` skips the menu and will be directly active
   ```bash
   <arg>-nomenu
   ```
-  `<arg>-file="filename"`: (with or without "): custom save file
   ```bat
   free_snap_tap.exe -file="my_save.json"
   ```
-  `<arg>-nocontrols`: to start it without the controls on `DEL`, `END` and `PAGE_DOWN`keys enabled- start -  
   ```bash
   <arg>-nocontrols
   ```
-  `<arg>-tapdelay="number, number"`: sets the default min and max delay of "number,number" ms for Tap_Groups
   ```bash
   <arg>-tapdelay=4,20
   ```
-  `<arg>-aliasdelay="number, number"`: sets the default min and max delay of "number,number" ms for Macros/Aliases
   ```bash
   <arg>-aliasdelay=30,60
   ```
-  `<arg>-macrodelay="number, number"`: sets the default min and max delay of "number,number" ms for Macros/Aliases - the same knob as `-aliasdelay` (both spellings set the macro delay pair)
   ```bash
   <arg>-macrodelay=20,25
   ```
-  `<arg>-crossover="number"`: sets the probability of "number" percent for a crossover (can be set in a range of 0-100); a bare `-crossover` enables crossover with the probability in effect (default 50)
   - A crossover is key event reversal with delay - press and release are overlapping the time of delay
   ```bash
   <arg>-crossover=25
   <arg>-crossover
   ```
-  `<arg>-nodelay`: deactivates delay and crossover

   ```bash
   <arg>-nodelay
   ```
- `<arg>-status_indicator=*size in pixel*`: a dot overlay that changes based on being active to green and on incative to red; a bare `<arg>-status_indicator` starts the dot at the default size (10 px)
   ```bash
   <arg>-status_indicator=24
   <arg>-status_indicator
   ```
- `<arg>-crosshair` displays a simple crosshair as overlay and can be controlled on a per game basis in the center of the screen
   ```bash
   <arg>-crosshair
   ```
- `<arg>-crosshair=*pixel delta x*,*pixel delta y*`: changes centerpoint according the delta x and y values in pixels
   ```bash
   <arg>-crosshair=5,-10
   ```

- start arguments are processed in the order they appear - a later argument overrides an earlier one (e.g. `-nodelay` followed by `-delay` keeps the delays active)

- `<arg>-delay`: re-enable the delays - the delays are active on default, so this is only meaningful after an earlier `-nodelay`
   ```bash
   <arg>-delay
   ```
- `<arg>-exec_one_macro`: of all macros triggered by one real key event only the FIRST is played
   ```bash
   <arg>-exec_one_macro
   ```
- `<arg>-debug_numpad`: enable the numpad debug combos (see [Numpad debug combos])
   ```bash
   <arg>-debug_numpad
   ```
- `<arg>-no_warnings`: silence the config-validation warnings for the section it is set in (per-scope suppression) - the runtime takes no action
   ```bash
   <arg>-no_warnings
   ```
- `<arg>-log=<debug|info|warning|error>`: set the area-logging level of `fst.log`; an invalid value is ignored and a warning names the valid levels (area-based logging, V1.3.0)
   ```bash
   <arg>-log=info
   ```
- `<arg>-flow`: enable the per-key flow stream to its own `fst_flow.log` (one line per filter leg of a key event); also toggled at runtime by `ALT + NUM4` and the console menu's "Toggle debugging output" entry (option 0)
   ```bash
   <arg>-flow
   ```
- `<arg>-drop_watch`: enable the drop-watch lane (U345, #291 H1) - filter legs that die mid-event land named drop lines in `fst_drop.log` + `fst.log`; `ALT + NUM6` toggles it at runtime
   ```bash
   <arg>-drop_watch
   ```
- `<arg>-no_toast_offload`: restore the direct toast bridge emit (default is the offload queue + asyncio pump, U345 H2 - A/B switch for the stuck-key hunt)
   ```bash
   <arg>-no_toast_offload
   ```
- `<arg>-always_active`: if no focus app matches, the default groups stay active instead of the filter being paused - the status indicator shows blue while in this default-active state
   ```bash
   <arg>-always_active
   ```
- `<arg>-default_always_active`: set the always-active state from within a section's argument list (the same runtime flag as `-always_active`, applied when that section's args load and reset on every focus change)
   ```bash
   <focus>MyGame
   <arg>-default_always_active
   ```
- `<arg>-default_off` (`-default-off`): deactivate the default group LINES for that focus group - the group builds from its own lines only, so global default conveniences (tap keys, status rebinds) cannot collide inside a game profile. Default START ARGUMENTS are still merged (overwrite the ones you need in the focus section); the focus-loss behavior of `-always_active` is unaffected. Set it in the default section to switch every focus group off (TODO #403, proposal 2026-10-31)
   ```bash
   <arg>-default_off
   ```
- `<arg>-default_on` (`-default-on`): RETIRED (TODO #423) - shipped and retired the same day; setting it does nothing and the config validation prints a WARNING. The settled model: the default group IS merged into every focus group; `-default_off` is the only opt-out (TODO #418 resolution)
- `<arg>-tray_icon`: start the GUI loop with a tray icon (with or without status indicator) - the tray menu offers Open config / Reload / Toggle Pause / Return to Menu / Toggle Indicator / Toggle Crosshair / Toggle Console / Exit
   ```bash
   <arg>-tray_icon
   ```
- `<arg>-hide_cmd_window`: hide the console window at start-up (the decision is taken once, after the config has loaded, and the window is hidden quietly) - without this argument the console window is never touched at start-up. Once hidden it comes back through the tray menu "Toggle Console", which needs `-tray_icon`: started with `-hide_cmd_window` and no tray icon there is no in-app way to show the window again. The flag can arrive from the command line (a launcher bat) AND from config `<arg>` lines - the startup decision line `config_file=*path* exists=*bool* cmd_window=*hidden/visible*` (ONE INFO line in `fst.log`, echoed to the console before any hide) names the final merged decision and the resolved config path, so the "why is my window hidden / why did it not read my config" question is self-reading from the log
   ```bash
   <arg>-hide_cmd_window
   ```
- `<arg>-save_dir=*dir*`: the save dir used by the `make_backup` / `restore_backup` invocations
   ```bash
   <arg>-save_dir=C:\FST\saves
   ```
- `<arg>-backup_root_dir=*dir*`: the backup root dir used by the `make_backup` / `restore_backup` invocations
   ```bash
   <arg>-backup_root_dir=D:\FST\backups
   ```
- `<arg>-focusapp=*name*`: **DEPRECATED** - prints a warning and exits the program with error code 1 (the focus app is defined in the config file via `<focus>` instead); in the config, a `<arg>-focusapp=` line is refused as a load-blocking validation error ("removed since V1.0.0 - use <focus>name in the config")
   ```bat
   rem warns and exits 1 - put <focus>MyGame in the config instead
   free_snap_tap.exe -focusapp=MyGame
   ```

- `--elevate`: **start argument only** (do not put it in the config as `<arg>`). Canonical spelling is `--elevate`; `-elevated` is accepted as an alias, and any elevation spelling placed as a config `<arg>` line now warns `'X' is a start argument for elevation - place it on the command line, not in the config` instead of the generic unknown-argument warning. Self-elevation at startup: if the run is not elevated yet, FST relaunches the same exe through one Windows "run as administrator" prompt, passing along ALL other start arguments (the elevation flag, whichever spelling was used, is stripped in the relaunched child, so no relaunch loop can happen), and the first process exits 0. If the run is already elevated, FST logs one `[Elevation] running elevated` line and starts normally. Running from python.exe (dev mode) never attempts a relaunch - it prints `[Elevation] dev mode - relaunch the exe manually or use scheduled task` and starts normally.
   ```bat
   free_snap_tap.exe --elevate
   ```

- **Single instance:** FST runs one instance at a time - starting a second one exits with a notice: it logs `[SingleInstance] another FST is already running - exiting` and exits with code 1. The check runs at startup after the elevation decision and before any UI/hook init; if the mutex API itself fails, FST logs a warning and starts anyway (the guard never blocks a normal start).

**Prompt-free elevated autostart (scheduled task):** run this ONCE from an elevated shell:
`schtasks /Create /TN "FreeSnapTap" /TR "C:\path\free_snap_tap.exe" /SC ONLOGON /RL HIGHEST`
(or in Task Scheduler UI check "Run with highest privileges"). The task starts FST elevated at every logon with no UAC prompt - registration is the only elevation moment, and the exe needs no `--elevate` flag there (`/RL HIGHEST` alone carries the elevation; the flag is for manual/relaunch use). (Background and security posture of elevated input: internal research note `agent/research/2026-11-13_elevated-input.md` section 5 - agent repo, not shipped with this one.)

**(deprecated)**
Start Options: (add to the bat(ch) file or in a link after the *path*\free_snap_tap.exe)
 - use the start Arguments without \<arg>
 - everything still works as normal start arguments, but than could change in future
