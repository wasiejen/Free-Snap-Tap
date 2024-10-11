# change log

## changes:

### trigger_groups:

-trigger_groups can not be destinquished also via constraints - not only by the key_events in the trigger_group
  - -mouse_x2|(dc('mx2')<1000) and -mouse_x2|(dc('mx2')>1000) are now recognised as 2 different trigger for rebind or macros and the second will no longer overwrite the first one

- reset can now also be used in a trigger_group to reset the macro sequence on trigger activation
  - combined with constraints it can now work to flexibly reset a macro sequence
  - e.g. `-c, +reset|(dc('c')>1000):: ...` (dc = double click to get the time since last press, when using it with the same key; last() should be used when using it with another key)
  - use always`+reset` because it is handled like a key event and must be fulfilled (in this case must be released which is for all reset keys always True) before the constraints will be checked
  - only if the constraints all result in True will the reset activated

### rebinds

- reset key_events that reset macro sequences now also work in rebinds as replacement key

### macro/ macro sequences:

- the constraint check of a played group (rebind or macro) (not trigger group) will be all checked at the same time now. 
  - before it was always checked at the exact time of playback and could be way later than the original start of the macro due to before applied delays - this lead to some very strange behavior when using time evaluations because they could be updated while the macro was still running 
  - now it has consistent behavior

- removed toggle option from played macro groups 
  - (maybe unnecessary????)
  - I want to rework that because the key states tracking now allows a better solution for this

### repeat keys

- stop_repeat will now again evaluate to False to suppress the playback of the stopped keys

### general behavior
- all key states (press or release) are now tracked - real keys states as well as simulated key states
  - can now be used in invocations as `ap('key_string')` (all keys press) and `ar('key_string')` (all keys release)
  - with this now also the simulated key states can be used to create more complex macros/rebinds

- simulated key events that would release real key presses are now supressed with the exception of the keys defined in the tap groups to allow the snap tap behavior.

### GUI
- status indicator now has the option on doubleClick or middleClick to open the config file like in the contextmenu - just to get to it easier
- crosshair now will redraw itself if left clicked on it (hard to hit :-D )
- crosshair now waits 1 extra second after switching focus groups due to window changes to make it more likely to recognise the right window and its size better

### On window change:
- all currently pressed simulated keys will be released on window change 
  - dependent on rebinds or macros it was possible to get stuck keys until the real key was pressed again to release the key state
  - will ignore currently pressed real keys and not release these
- `esc` now also releases all not currently pressed simulated keys
  - even if manually paused
- `alt+tab` will now also try to release all currently pressed simulated keys

### internal
- renamed everything with delay as constraint to better fit the evolved functionality
- seperated execute_key_event into its functional parts to realise more flexible reset and constraint handling

### refactoring
- refactoring of all global mutable states
- creation of manager classes to handle different aspects of the functionalities
- class FST_keyboard binds it all together and offers access to the managers

## bugfix:
- the reset key_event did not work before (reset_0 to reset_30 and reset_all did work)
  - reset will now reset the macro sequence it was started from/in
- fix focus lines comments not being stripped
  - fixed and upgraded to also stripping leading or trailing whitespaces
- reset of toggle via real key is working again
- not working when using no focus name
- toggle key is broken ... AGAIN ... - fixed

### todo


- alt key gets stuck when tapping out of focus game with alt+tab

- key combination will only be played if exactly these are pressed and no else??? was because shift changes numpad

- [x] shift, control and alt change keys that the system will get, so when these are active they need to be deactivated first???
- DONE


```bash

```

### ideas:

- test out a version which replaces every real input_event and only sends out simulated input_events
  - maybe that has some effect on AC? If it gets nothing else than simulated than that might be the real input

- gui with drag and drap of key_events that can be edited and seperate checked
  - change color on key_press to show what would be active an what not to test it out before using it in the program

- arduino controlled via PySerial um die virtuellen Key Events als echte HID events zu senden. Und so AC potentiell immer umgehen zu können.





- reset of repeated keys should be done by repeating thread? not by state_manager!

- possible to activate FST window when return to menu? to push it to the forground?


- refactor 2: internal structure refactor:
  - new Rebind class
  - new Macro class
  - move initialize_groups to config_manager
  - make it possible to evaluate one line of config code at a time
    - for later usage in gui
    - for seperation of concern
    - structure like:
      - parse_line
        - clean_line(line: string) -> string of line
          - returns line without comments or None if all comment
        - initialize_line() -> Tap_group, Rebind or Macro
          - presort_line(line: string)  and dependent on result call
            - init_tap_group
            - init_rebind
            - init_macro