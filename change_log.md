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