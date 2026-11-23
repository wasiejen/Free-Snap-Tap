# Function Invocations - reference

> Part of the FST docs: [index](README.md) - [features & install](../README.md)

### [Suffix/Function_Invocation] updated to V1.1.3

- supports function invocation as suffix in replacement key of rebinds or played key groups of macros, and also on the trigger and its constraints
- suffixes (constraints, evaluations, invocations) are checked left to right and stop at the first False - an invocation placed after a False evaluation is never executed
- !ATTENTION: when function invocation is used on trigger and/or constraints of a trigger_group
  - the trigger and all constraints must check for True BEFORE their evaluations/trigger invocations will be checked
- ALL INVOCATIONS will always result in True

#### [Repetition of Aliases]

- previously defined Aliases groups <*name*> can be repetited with the following invocations:
- repetition will interrupt itself on reset_repeat or when stopped - so not played parts of the alias group will not be played
- on start will be played immediately
- repeat time is the interval of starts between each playback and independent of delays in the alias group
- do not forget the '' or "" around the \<name> :-)

  - `(toggle_repeat('<*name of alias>', *repeat time in ms*))`   
    - one press+release will start a repeat of ke/Key it is suffixed to and the second will stop the repeat
    - delays between the played keys are defined 
  - `(start_repeat('<*name of alias>', *repeat time in ms*))`
  - `(stop_repeat('<*name of alias>'))`   
  - `(reset_repeat('<*name of alias>'))`  resets the interval of the ke/Key and starts the interval anew

##### Example:
```bash
# define alias to be played
<scan> v

# repetition of scanning on v every 6.5 s
# |(!) is the same as |(False): suffixes are checked left to right and stop at the first False,
# so the invocations placed before |(!) are already executed while the rebind itself is not played
# -> no replacement of the key and the original key input is not suppressed
(repeat_scan) -t|(toggle_repeat('<scan>', 6500))|(!) : -t
(repeat_scan) -v|(reset_repeat('<scan>'))|(!) : -v

# stop repeat only if v was pressed for at least 500 ms (so a long press of v)
(repeat_scan) +v|(tr("+v")>500)|(stop_repeat('<scan>'))|(!) : +v 
```

#### [Reset of Sequences and Interrupt of Macro]

- to reset a sequence or interrupt a playing macro the invocation `|(*name of the macro*)`  or `|reset('(*name of the macro*)')`can be used
  - the semantics differ by the type of the name:
    - `|(name)` on a macro name interrupts a started macro playback - it stops as soon as possible (normally in < 10 ms) and does not reset anything
    - `|(name)` on a sequence name resets the sequence counter only - the currently in-flight playback is not interrupted
    - `|(reset('name'))` on a sequence name resets the counter; on a non-sequence name it prints "No Macro Sequence with name ... - reset failed" and does nothing else (it does not interrupt a macro)
    - an unknown name is a silent no-op (evaluates to True)
  - resetting of a sequence will let the next playback of the sequence start again on the first key group

#### [General key control]

- `|(stop_all_repeat())` - will stop all active repeats
- `|(release_all_keys())` - will release all currently simulated keys that are pressed

#### [Function results in general]

The functions of the following sections are resolved by the same suffix evaluation as [Suffix/Evaluation] - usable on any key event, on trigger groups and on constraints:
- a bool result acts as a constraint (True plays, False blocks)
- an int result is used as a delay (in ms) after the key event
- a None result passes (True)
- any other result prints "! Constraint ... not valid" and passes

#### [Variable system]

- variables are kept in memory only - they are not saved with the config or the save file and start empty on every start of the program
- **integer variables**:
  - `|(set('name', *value*))`: set the variable *name* to *value* - a True/False *value* is stored as 1/0; without *value* the variable is set to 1
  - `|(is_set('name'))`: evaluates to True iff the variable holds a value other than 0 - unknown names evaluate to False
  - `|(get('name'))`: evaluates to the current value as an int (usable as a delay) - an unknown name is created with 0 and evaluates to 0
  - `|(check('name', *value*))`: evaluates to True iff the variable matches *value* - an int *value* is compared for equality, a list/tuple checks membership; unknown names evaluate to False
    - a *value* that is neither an int nor a list/tuple makes the check pass (True)
  - `|(incr('name'))`: increase the variable by 1 - an unknown name is created at 1
  - `|(decr('name'))`: decrease the variable by 1 - an unknown name is created at 0
  - `|(clear('name'))`: set the variable to 0
  - `|(clear_all_variables())`: remove ALL integer variables
- **text variables** (for text values, in contrast to the integer variables):
  - `|(set_var('name', 'text'))`: store the text under *name*
  - `|(get_var('name'))`: evaluates to the stored text - an unknown name is created with the text "None" and returns it
- text and integer variables share the same name space - a name stored with `set_var` is visible to the integer accessors (`is_set` evaluates to True for a stored text, since a text is never equal to 0)
- `|(print_all_variables())`: print all integer variables to the console

#### [Typing]

- `|(type('text'))`: type the given text - all currently pressed modifier keys are released before typing starts
- `|(write('text'))`: alias of `type`
- `|(release_modifier())`: release all currently pressed modifier keys (left/right Shift, Ctrl, Alt) without typing anything

#### [Toasts]

- requires GUI mode (status indicator and/or tray icon) - in headless mode these invocations raise an error
- `|(show_message('text', *display time in s*, *font size*))`: show a toast message in the status indicator - defaults: 3 s display time, font size 12, green background with white text
- `|(show_timer('text', ...))`: same as `show_message`, the default background is yellow
- `|(remove_toast('text'))`: remove the toast with the given text - the `immediately` parameter (default 0) is accepted but currently ignored
- `|(remove_all_toasts())`: remove all toasts - the `immediately` parameter (default 0) is accepted but currently ignored

#### [Mouse control]

- `|(scroll_up(*amount*))`, `|(scroll_down(*amount*))`: send vertical wheel events (up / down)
- `|(scroll_right(*amount*))`, `|(scroll_left(*amount*))`: send horizontal wheel events (right / left)
- `|(mouse_move_abs(*x*, *y*))`: move the mouse to the absolute screen position (*x*, *y*)
- `|(mouse_move(*dx*, *dy*))`: move the mouse relatively by (*dx*, *dy*)
- `|(mouse_get_pos())`: evaluates to the current mouse position as a tuple - the position is additionally copied to the clipboard as text
- `|(mouse_save_to_var('name'))`: save the current mouse position under *name*
- `|(mouse_move_to_var('name'))`: move the mouse to the position saved under *name* - evaluates to False (blocks the key event) if the variable is unknown or does not hold a 2-tuple position

#### [Mouse keys]

- the mouse buttons and the scroll wheels can be used as keys in tap groups, rebinds and macros with these key strings (vk 1 to 7):
  - `left_mouse` / `ml` / `lm` (vk 1, left button)
  - `right_mouse` / `mr` / `rm` (vk 2, right button)
  - `middle_mouse` / `mm` (vk 3, middle button)
  - `mouse_x1` / `mx1` (vk 4)
  - `mouse_x2` / `mx2` (vk 5)
  - `scroll_vertical` / `scroll_y` (vk 6) and `scroll_horizontal` / `scroll_x` (vk 7)
- the press/release state of a scroll key is derived from the sign of the wheel delta - a multi-notch wheel event keeps the state of the first notch
- playing the press of the vertical scroll key sends one notch up, its release one notch down
- playing the press of the horizontal scroll key sends one notch right, its release one notch left

#### [Clipboard]

- `|(copy_to_clipboard('text'))`: copy the text to the clipboard - a toast confirms the copy
- `|(paste())`: evaluates to the current clipboard text - usable as a text value; used bare (not as a value) it passes like any other non-bool/non-int result

#### [File operations]

- relative file paths are resolved against the program's working directory
- `|(save_into_file('text', *time stamp*, *mode*, *file path*))`: write the text to the file as "*time stamp*: *text*" - defaults: file `output.txt`, mode `'w'` (overwrite), time stamp `get_time()`
  - an omitted *time stamp* is taken at the moment the line is WRITTEN, not when the constraint is evaluated (ruling 2026-11-23): a delayed or retried write stamps its own execution time, and while no file-leg write executes the stamp default performs no clock read
  - an explicit *time stamp* stamps what you give it - an explicit `None` stamps the literal `None`, so pass it only deliberately
- `|(append_to_file('text', ...))`: same as `save_into_file`, mode `'a'` (append)
- `|(empty_file('file path'))`: truncate the file - default `output.txt`

#### [Misc]

- `|(cli('text'))`: print the text to the console
- `|(date())`: evaluates to the current date as a "YYMMDD" string
- `|(date_time())`: evaluates to the current date and time as a "YYMMDD-HHMM" string
- `|(get_time())`: evaluates to the current time as an int of milliseconds since the epoch
- `|(make_backup(*save dir*, *backup root dir*))` and `|(restore_backup(*save dir*, *backup root dir*))`:
  - `make_backup` copies the save dir into a timestamped backup folder named `save-YYMMDD-HHMMSS` (a counter is appended when a backup of the same second already exists)
  - `restore_backup` replaces the save dir with the newest backup; the swap is atomic - if the restore cannot finish, the current save dir is left intact or renamed back, never lost
  - both print to the console and show a toast (so they need GUI mode for the toast part)
  - the default directories are the `-save_dir=` / `-backup_root_dir=` start arguments - without them the call fails with a FileNotFoundError
- `|(clear_console())`: clear the console window
- `|(is_repeat_active('name'))`: (an evaluation, not an invocation) evaluates to True iff the repeat handle with the given name is still active - unknown names evaluate to False

#### [None / empty '' key event for invocations]

with V1.1.2 a new key_event the `None` or just empty key event can be used in conjunction with evalations and invocations.
- `None|(stop_all_repeat())` or just `|(stop_all_repeat())`
- it has no default delay - a None/empty ke is a pure timing marker unless given explicit delays (e.g. `None|10|5`)
- the same applies to the key strings `none`, `NONE`, `_`, `reset` and `delay` - they all map to the same vk 0 key event:
  - the key event is never played (there is no physical key behind it)
  - constraints, evaluations and invocations on it are still checked/evaluated as usual

```bash
# on escape all repeated keys will be stopped, all currently pressed simulated keys will be released and the map seqence resetted
(esc_repeat_stop) +esc|(stop_all_repeat())|(release_all_keys())|(map_open_close)|(!) : +esc
```


