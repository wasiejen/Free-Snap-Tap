
- following suffixes of a ke or a trigger_group here not checked/executed as soon as one suffix evaluated to False (was a measure to prevent unnecessary checks)
- starting times for keys was set to start time - now will be set 1000 seconds in the past, to guarantee first time execution of macros/rebinds with boolean time evaluations
- reset_repeat() now evaluates to True


New:
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
  