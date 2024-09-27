
### NEW V1.0.1: 
- all settings in one file (except start arg: `-file=...` to define from which file to load at start)
  - all start arguments supported via `<arg>*startargument*`
  - multi focus apps with own groups via `<focus>*name of focus app*`  
    - all start arguments and groups before first `<focus>...` will be interpreted as default and applied to all focus app settings
    - every start argument and groups until the next <focus> will be added to the current focus name and applied AFTER the default start arguments and groups
    - e.g. tap group `a, d` before first <focus> will be applied to all focus groups
- adapted cli output of groups to always show the currently active groups
- if a ke/key had more then one suffix, following suffixes of a ke or a trigger_group were not checked/executed as soon as one suffix evaluated to False (was a measure to prevent unnecessary checks) - fixed, now all will be checked
- starting times for keys was set to start time - now will be set 1000 seconds in the past, to guarantee first time execution of macros/rebinds with boolean time evaluations 
  - my cause problems in delay times if the key was not pressed before a time evaluation for a delay of this key
- reset_repeat() and repeat_stop() now evaluates to True
- file now supports multi line macro sequences, when new lines starts with `:` it will be added to the line above


### NEW V1.0.0:
- macro playback interruption and replaying by retriggering the same macro
- macro sequences and reset functionality
- macro notation now with `::` instead of `:`
- mouse buttons now also tracked, 
  - right_mouse, left_mouse, middle_mouse, mouse_x1, mouse_x2 now usable as constraints, and in suffixes
- repeating keys at set interval and management of the repeating function
  - function invocation (similar to evaluations but will always return False, but execute the function to manage the repetition of the suffixed key_event or Key)
    - toggle_repeat()
    - stop_repeat()
    - reset_repeat()
 - added evaluations:
   - last(): returns time since last press or release
   - dc(): "double click": on press returns time since last press, on release returns time since last release 
  