# SCRATCH PAD — maintainer's personal notebook (NOT a changelog)

Free-form running tally: what I did, ideas I had, bugs I tracked. Not an
authoritative record — the change record is `git log`, the live backlog is
`TODO.md`, agent-facing rules are `AGENTS.md` / `.opencode/handover_planner.md`.
May be stale; nothing here is required to be maintained.

260909-1512:

# WIP

## WIP - referenced .opencode\ as base path in agents (small vialation of seperation): handover file reference unlear. define directly with path
  - quote: "The git log references "handover v2.4.1" and "NAP: v2.2.2", and also has the context "plan state file", "task spec file", "worker summary file"."
## WIP: needs testing: a lot of permission requests for .opencode/* 
  - why? is it not allowed? - see following point
    - generally deny these request automatically for the workers? how?
## WIP: added bash to path - quote: "PowerShell quoting is annoying with % and such"
  - is there a way to offer the agent a better shell?
  - WIP: now need to inform the agents in agents_repo about the change/option
## WIP: adapt peek to handle unknown models by only displaying the current context and not % and REM

## WIP: needs compaction: ! Important ! 
  - When the model observes a compaction in its session immediately stop working on task - this supersedes the close up routine. write a brief summary directly as a return to if you are a worker. do not write any files! corruption of context highly likely. end session as fast as possible while delivering a brief summery.


  
# OPEN
## lets change the model for planner and default worker to q4_120k, slower but much more stable and precise

## check correctness of quantization making "in head" calculation of models unreliable

## clarify the planner role to clarify with maintainer 
  - the planner is the only one who can directly interact with the user, use it to get info instead of trying to find an answer and burning your context window
  - when used <|alone|> mode - no maintainer is available - so do only things that can be done without feedback and do not start requests
  - 
## add slots to the handover files

## MAYBE STALE: how to make sure the agents do not read the old feedback and append blindly?
  - agent_feedback_instruct.md as a seperate file to read and
  - "<<END>>" special string that the agent can replace directly 
  - and has to end it with the same special string
  - 
## how to enable a subagent to ask for clarification?
  - via messenger app plugin?


  
# OPEN similar - likely same cause - context gauge/nudge mechanism

### WIP:context gauge injection on worker start reports the data from the planner first
  - lets include an ignore context gauge info on worker start in the prompt_of the worker
### delaying receiving of user messages - likely causes by context gauge plugin
- just wrong session_id ctx displayer - should be fixed with checking session_id
- 
### first ctx (starting prompt) after planner start was around 28000 token. that is huge. why? was the message send later and thus included the read files instructions?

### Strange behavior: agent acts as if my messages come later - even mentioning that actions they have done based on it are done before the message arrived.
  - quote: "... reconciling the #33/Call-4 items that are still stale (the curation worker ran before your ruling arrived):"




# IDEAS/Random:

## what would happen if I create multiple personas for workers. like anna, joe, bruce, jill, ... that have some lines  of bckground (expierence, preferences, credentials) and behavior and are dissimilar in some ways, e.g. temperament, consciutiousness, creativity (temp value of model), funny, jumpy, lazy ...
  - normally not desirable, but it can have advantages to let them scan the repo or the task with so different viewpoints on the same problem
  - this would intoduce more dynamic workflows
  - interesting idea how a group with different personas would work on a project
  - maybe with self-reinforcement by feedback from the agents about the others
    - they can not comment about themselfes but only about other personas and this feedback would then influence their persona prompt in limited ways. so over time clear roles and preferences would be established and a hiearchy of how works in what ways with whom best or prefered.


# Tabled
## mobile messsenger integration in opencode?
  - needed? not yet but for future interesting

# DONE
## DONE resolve agents.md
- The agent runs on **Windows** with a **PowerShell (pwsh)** shell. **Heredocs do
  not exist in PowerShell** — `<<EOF` / `cat > file <<EOF` will NOT parse; never
  emit them. Write multi-line content with the file tools (or `Set-Content`),
  then edit the file.
- You have **access to bash** via git bash (no full linux kernel) - use it freely instead of pwsh
## DONE: allow removal of old TODO.md entries are remove the denial of it
  - the code is the source of truth and the history lives in git - there is not need to keep that here
  - currently: Close or condense solved/stale items with a one-line close note pointing at the
    closer (commit/entry); delete only exact duplicates after preserving the
    surviving entry. (Addendum:) Move to todo_records.md when closed.
  - new proposal: Git is the histoy, if the item is solved via a fix and documented via a commit it can be moved to todo_record.md. if it is solved as side-effect of other fixes/commits then remove and document with one-liner via a commit (batch multiple instances if possible - keep single one-liner until next big clean)
## DONE - clean up of TODO needed!
  - there are too many status updates on what was done in it. makes it big and encourages the worker to write in the same style and thus reporting everything there.
## DONE - thematic grouping remain + unique ID: maybe remove thematic grouping of todo and instead just have a running unique numbering for easier referencing?
## DONE - remove access to the .git and .github folders for the planner - more a distant precaution than necessary
## DONE - via Path: agents prone to use (Users\Users) in paths
  - mention it somewehre to guard 
  - or use a PATH alias and set these for the models to use?
    - saves tokens and reduces errors without much instruction
## DONE resolve issues with line ending codes
  - might be my editor ZED which always changes them and thus colliing with github preference of CRLF over LF
    - {
      "line_ending": "prefer_crlf"
      }
    - ensure_final_newline_on_save Default: true
## DONE pin agent_feedback.md file per path


260907-2229:

ideas
! - after every commit update the NAP with the current progress
! - each discrepancy found on commit time is to be added to TODO.md
- clean up debug and replace it with logging. add logging to critical steps. debug3 might remain as a seperate output? debug-numpad might not be needed anymore
- clean up commented out code and check comments on truthfulness compared to code
- add missing docstrings


---- old ----

ideas:

- MouseOnMove maybe usable to record relative mouse movement to record manual anti recoil movement in games? :_)
- transition some global control variables like PAUSED and STOPPED to an Event System?
  - Thread safety
- replace the improvised DEBUG variable system with actual logging
  - not entirely but at least fot expection handling
- make the config possible to be split into multiple files
  - maybe a folder and one file per focus group?
- stylesheet class or collector for easier change of styles for toast messages
- change macro and rebind alias_name to representation of it if not overwritten via config (name)
- change logging level via starting arguments


260428-2159
AsyncIO instead of Threading:
- Focus_Thread -> Focus_Task: now async in secondary MainLogic async thread
- Macro_Tthread -> Macro_Task: also async
  - a lot less overhead
  - a lot easier interruption handling
- Macro_Repeat_Thread -> Macro_Repeat_Task: async
  - better interruption handling - no longer race-conditions possible
- Tap Groups random delay and crossover now running async, everything else runs direcly in listener thread

Toast Box System:
- toast timer upgrade resolution from 1s to 0.1s
- added remove_all_toast option in overlay menu
- toast are now clickthrough :-)

Logging
- basic logging implemented



260428-1230
- fixed a bug in reset_repeat logic that lead to an entire repeat time with no action before starting again
- integrated in repeat function the toast message as timer
  - can optionally be disabled via with_overlay=0 in function
  - `start_repeat(alias_string, repeat_time, with_overlay=0)`
- added remove function for toasts, which is used by the repeat function if reset to prematurely restart a loop
  - works semi reliable on the repeat - has problems with to many repeat or with to fast restarts of a repeat and will generate multiple toasts
  - added function `remove_toast(text, immediately=0)` and `remove_all_toasts(immediately=0)` for deleting toasts manually
    - `immediately=1` will remove toast immediately
    - `immediately=0` default value will recolor toast red and display DEL at timer area, will be removed 1 second after recoloring
- added checks if status_indicator is even on before a toast/timer is posted

260427-2009
- Add several utility actions/functions to Output_Manager: 
  - `get_time()` # in ms since epoch
  - `mouse_get_pos()` # return tuple (x,y) coordinate of current mouse position and copies it into clipboard for easier pasting
  - `mouse_save_to_var(var)` # saves the tuple in a variable
  - `mouse_move_to_var(var)` # moves to the variable if it is a valid tuple
  - `copy_to_clipboard(var)` # copies selected variable to os clipboard
  - `paste()` # returns what is in the clipbaord for use in functions 
    - (not sure for what yet, but when you have a copy to clipboard then why not a paste also? :-P)
  - `save_into_file(text, time_stamp=get_time(), mode='w', file_path='output.txt')` # "{time_stamp}: {text}" saved into {file_path}')
  - `append_to_file(text, time_stamp=get_time(), file_path='output.txt')` #
  - `empty_file(file_path='output.txt')`
  - `print_all_variables()`
  - `clear_console()`
- Show toast messages when starting/stopping repeats and when making/restoring backups. 
- Update make_backup/restore_backup to return both path and name, and adjust fst_save_file_handler to return (path, name) tuples. A
- lso import time alongside datetime.

260427-1400
- added toast box for messages and timers
  - added toast message function that will be displayed under the status indicator overlay, that will vanish after set duration (ms)
    - show_message(*text*, *duration in s*, *text_size in px*, *background_color*, *text_color*)
      - `_|(show_message("test"))` # minimal message shown for 3 s
      - `_|(show_message("test", d=15, ts=15, bgc="green", tc="white"))`
      - bgc und tc also usable via `bgc="rgba(40, 40, 40, 200)"` and thus with alpha (transparency)
  - added timer toast message function that displays a countdown timer on the right side of the message text
    - `-up :: _|(show_timer("test", d=15, ts=15, bgc="green"))`
  - example with usage of alias use the same formatting for different timers
    ```
      # alias for timer that can be used for different timer when in combination with `get_var` and `set_var`
      <timer> _|(show_timer(get_var("text"), d=get_var("dur"), ts=15, bgc="rgba(40, 200, 40, 200)", tc="white"))
      -up :: _|(set_var("text","UPPPP 15"))|(set_var("dur",15)), <timer>
      -left :: _|(set_var("text","LEFFT 10"))|(set_var("dur",10)), <timer>
      -right :: <timer>
      -down :: _|(show_message("test", d=15, ts=15, bgc="green"))
    ```
- added function `get_var` and `set_var` for arbitrary variable assignments
  - if `get_var` is called before `set_var`, then the variable will be set to the string "None"
- added test_overlay.py for easier testing of the gui


260426-2158
- mouse scrolling added via functions:
  - vertical scrolling: `_|(scroll_up(*value*))`, `_|(scroll_down(*value*))`
  - horizontal scrolling: `_|(scroll_left(*value*))`, `_|(scroll_right(*value*))`
  - e.g. `-up :: _|(scroll_up(*value*))`
- mouse movement added via functions:
  - relative movement from current positon:
    - `_|(mouse_move(*dx*, *dy*))`
    - `-up ::    _|(mouse_move(0,-50))`
    - `-left ::  _|(mouse_move(-50,0))`
    - `-down ::  _|(mouse_move(0,50))`
    - `-right :: _|(mouse_move(50,0))`
  - absolute movement:
    - `_|(mouse_move_abs(*dx*, *dy*))`
- function `mouse_get_pos()` added that will print out current absolut position and copy the tuble of coordinates into the clipboard of windows for easier pasting

260426-1856
- added extra focus names via comma inline behind <focus>
  - `<focus> group1, group2, group3`
- renamed increase function inc() -> incr()
  - decr() was defined 2 times -> commented out old one for now
- same triggers of rebinds and macros will now overwritten with the newest version
  - printout in cli will still display old and new

251207-0037
- added backup and restore functionality for save games
  - added start argument `-save_dir=` and `-backup_root_dir=`
  - save dir will be backupped incrementally in format "save-YYMMDD-HHMMSS"
  - at start of focus group the start arguments have to be set and then the backup can be started with the evals `|(make_backup())` and `|(restore_backup())`
  - restore backup will restore the last backup as replacement into the save dir

- eval `|(get("variable"))` will now return the value/content of the variable instead of returning True or False dependend on the variables content

250905-1522
- focus name will be cleaned by regular expression [^a-zA-Z0-9 ], so no more non english letters, special symbols etc. (spaces will be kept)
- e.g. even if used "Battlefield™ 6" it will be handled as "Battlefield 6" internally


250905-1424
- Removed automatic lower() of all focus group names (was implemented for easier recognition)
  - lead to the inability to use special symbols in the focus group name, e.g. Trademark symbol in "Battlefield™ 6" :-)
  - But now one has to mind upper and lower case in the focus names ^^
- Defined Alias will now be a part of the focus group instead of always being part of the dafault group
- Crosshair overlay now draws a shadow and uses a larger default size

## V1.1.5 changelog

250724-1441
- set Version to 1.2.0
- Bugfixes: mainly fix for delays not working
- complete migrate to Qt with Interface
- Nuitka (C compile) Build Process (faster execution and smaller program size)


250724-1341
- Revised overlay.py to simplify and improve crosshair and status overlay scaling logic, now using device pixel ratio directly. 
- Removed and commented out unused code and constants, and added DEBUG4 option in free_snap_tap.py.

- Adjusted delay logic in fst_manager.py 
- BUG fixed: no delay was played at all - not sure yet since when and where that bug came from, but it prevented any delay to be applied ...
  - I can not find in the history when the BUG was introduced - most like when implementing None|delay and since then only in special cases and for None vk_code delay was played at all.
  - why did this not appear earlier? that is such a fundamental bug ...

250724-0054
gui:
- completely migrated to PySide6 (Oficcial Qt6 implementation) with every gui element, Tray_Icon, Status_indicator, Crosshair and Update_Thread now all implemented in PySide6
- PySide6 is fully supported in nuitka compared to PyQt5
- Every GUI element new utilises the same Threading Management thanks to QT
- now longer racing condition of update thread and close logic
- every Qt-element now a child of GUI_Manager
  - very easy close handling

250723-1655

overlay:
  - changed overlay and crosshair implementation from overlaylib directly to pyqt5
  - size of crosshair and status overlay now scales with monitor height - 1080p=1.0x, 2160p=2.0x and scales linearly between
  - crosshair will now always be spawned on the monitor the cursor is currently at
  - reenabled menu on status menu
  - manual hide and show of crosshair via status menu
  - hide and show of status menu now toggable via status symbol menu and tray-icon menu
  - status symbol can now be dragged again
  - scaling on monitor change with different heights now much better and without lag
  - much smoother implementation of scaling on monitor change of status symbol

new Nuitka executables:
  - with pyqt the size of the executables notably increased to over 40mb.
  - wanted it to be smaller and if possible faster
  - Now second way of building is via nuitka which compiles to C and then creates the executable
    - should be faster and less resouce intensive in general
    - filesize now down to around 22 mb
  - pyinstaller executables still available
    - much faster build process :-)

250717-1613

- bugfix: stopped focus group reactivation on name change of window - logic from previous update was wrong

250717-0717

- overlay:
  - removed tkinter
  - overlay now runs on pyqt base
  - all overlay elements now see through for interactions like mouse clicks
  - status indicator now in the right upper corner of the screen
  - screen/monitor for overlay can be changed via option in tray_icon
    - "Overlay to next screen"
  - crosshair reintroduced as part of the pyqt overlay
    - optimised for 1080p, no scaling implemented yet
  - status indicator size now adapts based on focus group settings
    - if it should be hidden set the status_indicator=0 (size to 0)

- focus group
  - now it is tracked if the app changes before focus settings are reapplied
    e.g. if a browser window changes it name based on which browser tab is open, then the focus setting will no longer reapply with every name change of the window 

- bugs:
  - tray_icon menu seems to have problems with MS Windows scaling when monitors use different scaling values
    - displayed sometimes big, sometimes small without separators and not interactive anymore
    - maybe a problem with the overlay?

250430-2047
- changed toggle console to an implementation that also works for windows 11
- added left click toggle console option for system tray icon for easier access
  - should maybe instead use this for pausing???
250309-1052
- added "caret" key   # left of key 1 on qwertz layout
  - vk_code 220
250329-1939
- when using type/write of a macro with modifier keys as trigger, the modifier keys will now be released for the duration of the typing/writing and then reengage.
  - e.g. if -d, -alt, -shift should print out the current date, then when hitting d the alt and shift press will be released to make it possible to write out the datestring and will be automatically reengaged afterwords
- new `|(date())`, and `|(date_time())` functions for writing out he current date in yymmdd and yymmdd-HHMM format
  - I just need it alot :-)
- added start argument `<arg>-always_active`
  - indicator will be blue and all default tap groups, rebinds and macros will be active always
  - focus groups will be activated like normal and still show green indicator
- added system tray option
  - `<arg>-tray_icon` now starts a tray icon with the same menu as the overlay
  - tray icon and overlay can be used at the same time or seperately
- removed option for crosshair atm
  - only usable when the overlay is active because it is dependent on it
  - temporarily disabled
- now start argument `<arg>-hide_cmd_window` will hide the cmd window after starting up
- added menu options to hide and show again the cmd window


nice-to-have:
- status symbol instead of overlay may be useful if used all the time


bugtracker:
- shorthand for pressed keys as suffix is not working 
  - `f3|-alt : ...` not working like `f3, -alt : ...`
- when returning to menu and restaring filter, the always on function is not working. there needs to be activated a focus group and then it works again like intented ...


features I would like to have:
- alias key groups would be nice to only work for the focus app and not globally if defined in a focus group
- `is_repeat_inactive(<alias>)` ? or just leave `not is_repeat_active(<alias>)` ?

241028-1323
bugfix:
- when active window returned empty the script crashed 
  - fixed
- evaluations with python code that hat spaces in it like (not is_set('var')) were not recognized correctly 
  - fixed
- if a line in the config file started with whitespaces and could lead to wrong recognition of start arguments and commented out lines
  - leading whitespaces will now be removed
  - fixed
- automatic shortening of active window name removed the name of e.g. the game because of some versioning info following it. So if the last part of the window name is not the game name, then it could happen that the game name would be removed
  - now it will always check the full name for the focus name 
  - removed shortening due to many possible naming schemes
  - fixed 

added:
- eval `|(is_repeat_active('aliasname'))` -> True or False dependent on if a repeat is active


changed
- changed default value of set to 1 and clear to 0 (in python 0 -> False and 1 -> True)
  - to always work in variables with numbers and not mix numbers and boolean values
- status_indicator now starts with red as default and only changes when focus name is recognized
- cleaned up some code for the drawing of the status_indicator

## V1.1.4 main_testing branch Changelog
241023-1055
- removed some debug output

- None ke can have manual delays - no default delays will be applied in any case
  - if a delay is given it will be played
  - if no delay is given the default delays will not be applied and no delay will be played
- None can now also have hte key_string `reset` and `delay`
  - no functionality in itself, but for better readability
  - `reset|(macroname)` or `delay|100` is easier to read
- empty ke in trigger group might not correctly be handled as only a release key_event
  - preventive fix to make sure the release ke will be added also to a trigger group
- simplified release_all_keys() underlying function to not be as aggressiv and only release currently pressed simulated keys
- `|(type('text to write'))` and `|(write('text to write'))` eval added
- variables can now be set, checked and cleared
  - `|(set('variable'))` to set it to True
  - can be checked by `|(is_set('variable'))`: will return True or False
  - can be cleared by `|(clear('variable'))`
  - and all variables can be cleared by `|(clear_all_variables())`
  - variables will be reset on change of focus app
- variables with a bit more control over there content can be used by:
  - can be used to adjust delays of key_events or 
  - to create costum sequences or keysets with more than 2 layers (before only True and False possible)
  - `|(set('variable',*value*))` to set a variable to e.g. a number
  - `|(get('variable'))` will just return the content of the variable - a check has to be done seperately or it will be interpreted as a delay
  - `|(check('variable',*value*))` to get the variable and check against the given value - will return True or False
  - `|(incr('variable'))` increases by 1: will set to 0 if not set before
  - `|(decr('variable'))` decreases by 1: will set to 0 if not set before
- added `-macrodelay` as future replacement for `-aliasdelay`
  - I do not know why I choose this misleading name first - maybe I thought aliases are the same as macros
  - both now usable and will replace -aliasdelay step by step

bugfix:
- key combinations did not reset when used and retriggered itself on resuming - fixed
- if option 0 was activated before the first time start of the listener, then an error stopped the listener - fixed
- rebind will be executed despide some of the constraints of the trigger result in False 
  - the constraints will not even checked when replacement key is None, because they will not be saved in the trigger key_event
  - the constraints are stripped when the conversion to a set of key_events takes place because of None being recognised as a Key instead of a key_event as it should
  - None key now works correctly as key_event, but constraints wil still be stripped if key_event is converted to Key 
  - on conversion to set of key_events now also copies the constraints 
  - fixed

ideas:
- on initializing macros - when Key as trigger used then create a macro for -ke of Key and a supress Rebind for +ke of Key
- alias on a focus group basis?
