


# Function documentation (Version 1.2.0):

## General overview

This program offers ways to interacts with real input in the form of key_events (a button press or release).
It interpretes the real input (of keyboard and mouse) and according to defined rules sends out simulated key_events or/and supresses real key_events. It offers Tap_Groups as a Snap Tap alternative for every keyboard and key combination, Rebinds to adjust keyboard keys free from game or keybind support, macros to play more complex key inputs with a single key press and/or release, timed repeated keys to automate recurring refreshes of buffs in games and resetable macro sequences with changing key outputs on the same trigger key.

## Often used terms:

- **key_event** or short **ke**: `-a`: a key_event is a press `-a` or release `+a`/`!a` of the a Key. 
- **Key** `a`: a Key (without prefix +, - or !) is a short form for a **key_tap**: 2 key_events consisting of a press and a release. 
    - This destinction is important for the following definition of rules to interpret the input and how output is send. 
- **key_group** `a, b, c, ...`: a key_group is a collection of key_events and Keys that serves as a **trigger_group** to determine when a rebind or macro will be activated and as **macro key_groups** that includes every key_event that will be played when a trigger_group is activated.
  - Keys will be always interpreted as 2 key_events of press and release `a` = `-a, +a`
- **trigger_group**: `trigger, constraint1, constraint2, ...` consists of the trigger key_event and constraint key_events. Only the trigger key_event can trigger rebinds or macros.
  - **trigger_group/trigger**: is the real ke/Key that can activate a rebind or macro
  - **trigger_group/constraint**: is a ke that determines if a trigger can be activated. e.g. `-shift` = shift must be pressed
- **replacement** key_event/Key: output/result of a rebind
- **suppression** of a key - key will be intercepted and behave as if it was not pressed
- **key_strings** is the alphabetical representation of the keys we use and will be translated into vk_codes via the dictionary in vk_code_dict.py. Key_strings can be edited to fit preferences or actual keyboard layout by simply editing the file and adding or changing the key-strings that you want to use.
- **vk_code** is the number presentation that a key has internally and is used to identify the right key to be send
- **prefix/modifier** `-key_event`, `+key_event`, `!key_event`, `^Key`: the prefix is the sign before a key_event or Key. If `-`, `-`, `!` are present it will define a key_event of press or release. `^` defines a toggled Key and is the only prefix for a Key. If there is no prefix, it will be handled as a Key (press + release).
- **suffix** `key_event|suffix|suffix|...` are written behind key_events or Keys and are interpreted as:
  - **suffix/delays** `ke|*time in ms*` time after a key_event that will be waited before next will be played. Delay is defined by if the suffix is a number (time in ms for delay) or can be evaluated to a number.
  - **suffix/constraints** `ke|-ke|+ke`defines when to trigger or send a key_event based on True or False statements
  - **suffix/evaluations** `ke|(evaluation)` can result in a constraint if evaluated to True/False or as delay when evaluated to a number
  - **suffix/function invocation** `ke1 :: ke2|(repeat_toggle(10000))` a function that will always evaluate to True - the suffixed key_event is still played as usual, and the function defined in the invocation will be started
    - in this example: trigger `ke1` will start a repeated sending of the `ke2` every 10 seconds until ```ke1` is pressed again and stop it
- **focus app name** is a part or the full name of the active window the program will be looking for to activate or change tap groups, rebinds and macros
  - the match is a case-sensitive substring: `<focus>Counter` matches a window named "Counter-Strike" but not "counter-strike"
  - **focus group** are all the start arguments, tap groups, rebinds, macros that are applied when a focus app is recognised


## Controls

- **Toggle Pause:** Press the `ALT + DELETE` key to pause or resume the program.
  - resuming will reload key and tap groups from files
- **Stop Execution:** Press the `ALT + END` key to stop the program.
- **Return to Menu:** Press the `ALT + PAGE_DOWN` key to return to the menu.
You can change the control key combinations in the py file under # Control key combination.

### [Status Indicator - simple overlay for in game control]

- `<arg>-status_indicator=*size in pixel*`
- can be used as default argument and in focus groups - per-focus values are applied while the GUI loop is running
  - the GUI loop itself only starts if `-status_indicator` or `-tray_icon` is enabled at startup
  - see picture above - just a small dot that changes based on being active to green and on incative to red
  - right mouse click opens the menu
  - double left mouse click or middle mouse click will open the config file

#### [Crosshair] as function of the GUI overlay
- `<arg>-crosshair` or `<arg>-crosshair=*pixel delta x*,*pixel delta y*`
  - displays a simple crosshair as overlay and can be controlled on a per game basis
- needs the GUI loop to be started at startup - via `-status_indicator` or via `-tray_icon` alone
  - the tray icon menu offers "Toggle Crosshair", so it can also be toggled without a status indicator


## More in depth functionality

- Each function has to be added to the FSTconfig.txt as a single line. 
- Comments usable with `#` for line comments, commenting out single keys and comments after a definition.
- All usable key strings are included in the vk_code_dict.py file. Key strings can be edited or added freely so simplify to ease usage.

### [Aliases]
- Notation `<*name of the alias> key_group`
- can be used in trigger_group of Rebinds and Macros and in key_groups of Macros and Macro Sequences
```bash
<world> -shift, w, o, r, l, d, + shift
(write helloWORLD) -h :: h, e, l, l, o, <world>
```
- aliases can be used in following aliases also
```bash
<run_if_not> -shift|(ar('shift'))
<alias_in_alias> <run_if_not>,   +ctrl|75|(ap('-ctrl')),  -ctrl|150,   +c|75|(ap('-c')),  +ctrl, -shift
```
- it will just insert the key_group at the position it is used

### [Tap_Groups]
- Notation: `a, d` simple listing of Keys seperated by commas 
- 2 or more Keys usable
- only plain key strings are accepted - key_event notation like `-a, -d` or per-key delays like `a|10` are not valid in Tap_Groups and will raise an error at group init
- delays are usable via the start argument `-tapdelay=min_time,max_time`
- simulated keys from Macros can not interfere with real key states (current pressed keys) that are defined in tap_groups
- Rebinds that have as replacement a key in a Tap_Group will be treated as normal real key events and will not be ignored.
- can be named by putting`(*name of the macro*)` in front of the tap group definition (no functionality to it yet)

### [Rebinds]
- Notation: `trigger_group : replacement key_event or Key` 
- internally it only works with key_events. Usage of Keys is offered to simplify press and release rebinds.
- replacements of rebinds can trigger macros and be used in Tap_Groups
- replacements will be played immediately - there is no delay and given delays will be ignored
- if a rebind is matched but a constraint of the replacement fails, the original key is suppressed and nothing is sent
  - to let the original key pass instead, move the constraint to the trigger side: `a|(p("shift")) : b` plays `b` only while shift is pressed, otherwise the original `a` passes through
- support notation with key_events and Keys
  - `key_event : key_event`
    - will be used as is
  - `Key : Key`
    - will be interpreted as 2 key_event : key_event rebinds
    - e.g. `a : b` -> `-a : -b` and `+a : +b`
    - a signed key on the right side of a Key rebind (e.g. `a : -b`) is reinterpreted as a plain Key - it will be played as a press+release pair `-b, +b`
  - !Attention: if only one Key is present in the notation as trigger or replacement, both will be interpreted as Keys
    - `-caps_lock, shift` -> `caps_lock, shift`
- supports suppression of key_events and Keys
  - `windows_left : suppress` will suppress the left windows key
  - `+shift : +suppress` will only suppress the release of shift
- can be named by putting`(*name of the macro*)` in front of the rebind definition (no functionality to it yet)

For further functionality of how it will be triggered, usage of constraints, evaluation and function invocation see [Rebinds + Macros + Macro_Sequences]

### [Macros]
- Notation: `trigger_group :: key_group`
- support of custom delays per key_event/Key (for usage of custom delay see [Suffix/Delays] and for general delay see #### Delays in general)
  - Notation: 
    - `key_event/Key|*time*` -> will result in a static delay of length *time* in ms
    - `key_event/Key|*time1*|*time2*` -> will result in a random delay of length between *time1* and *time2* in ms
- support of key_groups (multiple Keys and/or key_events) to be played
- will be played as asyncio tasks (interruptible, non-blocking) to not interfere with real input while waiting for the delays
  - macro playback WILL BE INTERRUPTED by retriggering of the macro if it is still in playback and waiting for a delay, the old playback will be stopped and replaced by the new retriggered macro playback
- Only supports notation for the trigger of the trigger_group as key_event, to prevent double triggering with one key_tap
  - if a `Key` is given it will be interpreted as a pressed key_event `-key_event` 
- can be named by putting`(*name of the macro*)` in front of the macro definition
  - on usage of `|(*name of the macro*)` the playback of a started macro can be interrupted from anywhere - nothing is reset (unknown names are a silent no-op)

For further functionality of how it will be triggered, usage of constraints, evaluation and function invocation see [Rebinds + Macros + Macro_Sequences]

### [Macros/Macro_Sequences]
- Notation: `trigger_group :: key_group1 : key_group2 : key_group3 : ...`
- can have 2 or more key_groups
- each key_group will be played in sequence with each retrigger of the trigger key if the constraints of the trigger group are still valid
- macro sequence will reset itself automatically if every key_group was played and thus will start anew
- can be reset by the use of the invocation `|(*name of the macro*)`  or `|reset('(*name of the macro*)')` 
- can be named by putting`(*name of the macro*)` in front of the macro sequence definition
  - on usage of `|(*name of the macro*)` the sequence counter will be reset - the currently in-flight playback is NOT interrupted (it keeps running until it finishes) - on next start of the sequence the first key group will be played

For further functionality of how it will be triggered, usage of constraints, evaluation and function invocation see [Rebinds + Macros + Macro_Sequences]

### [Rebinds + Macros + Macro_Sequences]

- the trigger supports constraints in a trigger_group `trigger, constraint1, constraint2, ...` 
  - the trigger (first element in trigger group) is the only part of the trigger_group that can activate the rebind/macro/macro_sequence
  - constraints are key_events with prefix/modifier and can also as suffixes further constraints, evaluation or function invocation
  - trigger and constraints also supports constraints a suffixes: `trigger|constraint_of_trigger|..., constraint_of_trigger|constrain_of_constraint_of_trigger|..., ...`
  - suffixes of trigger and constraints will only be checked/activated if trigger and constraint (without suffix) will in itself check for True, then the suffixes will be checked in order of placement in trigger_group

## Delays in general
  - default delay for Tap_Groups and Macros is set to a random time between 2 and 10 ms
  - in Tap_Groups: 
    - used for simulated keys that would idealized be executed together - to get a more natural input behavior
    - default delays for Tap_Groups are changeable via the start argument `-tap_delay=*min_delay*,*max_delay*`
  - in Macros/Macro_Sequences: 
    - custom delay usable for each key of a key_group that will be executed AFTER the key_event
      - for Keys with delays, the delay will be executed after the press AND the release
    - default delays for Macros are changeable via the start argument `-macro_delay=*min_delay*,*max_delay*`
  - delay can be suppressed entirely with the start argument `-no_delay`
For further functionality of how it will be triggered, usage of constraints, evaluation and function invocation see [Rebinds + Macros + Macro_Sequences]

## On Prefixes and Suffixes

## [Prefixes]
Every key event supports prefixes **prefix/modifier**
  - `-key_event`: defines the pressed (down) state of a key
  - `+key_event` and `!key_event` - defines the released (up) state of a key
  - `^Key`: toggle a key - on key press key will be toggled between press and release; key release will be suppressed
    - key after prefix `^` will always be interpreted as a Key instead of a key_event

## [Suffixes]

- every key_event supports **suffixes** (constraints, evaluation, function invocation)
  - as constraints: `-ke`, `+ke`/`!ke`: e.g. `ke1|-ke2|-ke3 : ...` is functionally the same as trigger group: `ke1, -ke2, -ke3 : ...`
- suffixes in trigger_group will only be checked/activated when trigger and constraints all check for True

### [Suffix/Delays]

  - Notation: 
    - `key_event/Key|*time*` -> will result in a static delay of length *time* in ms
    - `key_event/Key|*time1*|*time2*` -> will result in a random delay of length between *time1* and *time2* ms

### [Suffix/Evaluation] updated to V1.1.3

- supports evaluation as suffix
  - **evaluation to an integer** which will be used as a constant delay (all following function returns a length of time in ms)
    - `|(tr("ke"))`: timing of length of time for presses and releases of **Real** key events
        - for tr("-ke") get the length of time of a key press to release (read like: when I press ke (-ke) then give me the length of time since the last ke release)
        - for tr("+ke") returns the length of time from last key press to actual key release
    - `|(ts("ke"))`: timing of length of time for presses and releases of **Simulated** key events (also includes Tap Groups due to handling of them internally)
    - `|(ta("ke"))`: timing of length of time for presses and releases of **All** key events
    - `ke1|(last("ke2"))`: timing of length since last `-ke` press or `+ke` release (especially useful to check on other keys than the suffixed key)
    - `|(dc("ke"))`: dc short for double click: return the time between two press events or between two release events of the key
      - the sign of the key argument carries no meaning (`dc("-ke")` and `dc("+ke")` return the same value)
      - returns 9999 ms if the key has no previous events
    - `|(cs("key"))`: counterstrafing especially for CounterStrike: returns a time of length a key must pressed based on the pressed key to return the optimal time of length for a counterstrafe to come to a stop. Uses an internal function to approximate the acceleration time of the counter movement key.
    - `|(csl("ke"))`: some as above only uses a linear function to estimate the counter strafing time

  - **evaluation to bool (True/False)**
    - supports standard python notation and inbuilt functions
      - use of `,` commas in multi parameter functions is supported since V1.1.2 (e.g. pow(20,3) does now work)
    - **every above time function can be used as a comparison evaluate it to bool**
      - e.g. (dc("-ke") < 500) -> results to True if a double click (as time of the press) was made in less than 500 ms, else it will evaluate to False
    - `p('key_string')`: (real key press) returns True if the real key defined by key_string is pressed
      - the press state is read AFTER the current event already updated it - so on a trigger `-ke|(p('ke'))` is always True and `+ke|(p('ke'))` is always False; the sign of the argument is ignored
      - the key must be given as a quoted string - an unquoted name is evaluated as a python variable and unknown names silently evaluate to True
    - `r('key_string')`: (real keys release)
    - `ap('key_string')`: (all keys press) returns True if the real key or a simulated key defined by key_string is pressed
    - `ar('key_string')`: (all keys release)

  - **evaluation to False**
    - `|(False)` = `|(!)` = `|()` are equivalent and will always return False

  - **evaluation to True**
    - all following invocations will always result in True


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
    - `|reset('name')` on a sequence name resets the counter; on a non-sequence name it prints "No Macro Sequence with name ... - reset failed" and does nothing else (it does not interrupt a macro)
    - an unknown name is a silent no-op (evaluates to True)
  - resetting of a sequence will let the next playback of the sequence start again on the first key group

#### [General key control]

- `|stop_all_repeat()` - will stop all active repeats
- `|release_all_keys()` - will release all currently simulated keys that are pressed

#### [None / empty '' key event for invocations]

with V1.1.2 a new key_event the `None` or just empty key event can be used in conjunction with evalations and invocations.
- `None|(stop_all_repeat())` or just `|(stop_all_repeat())`
- it has no default delay - a None/empty ke is a pure timing marker unless given explicit delays (e.g. `None|10|5`)

```bash
# on escape all repeated keys will be stopped, all currently pressed simulated keys will be released and the map seqence resetted
(esc_repeat_stop) +esc|(stop_all_repeat())|(release_all_keys())|(map_open_close)|(!) : +esc
```


## [Configuration]

- text file can be changed from default "FSTconfig.txt" to any file you want to, with the help of the startargument `-file=*file_name*`
- all startarguments can be used either with a .bat file, by adding them to the link to the .exe or .py file, or by including them in the config file with `<arg>*start_argument*`, e.g. `<arg>-nomenu`
- focus app names can be defined in the config file via `<focus>*name of the app*`
  - everything BEFORE the first \<focus> will be seen as default start arguments and groupings and applied in general (evene outsite of focus apps) and to all following focus app groupings
  - everything following this \<focus> definition up until the next \<focus> will be applied when the focus app name given is found in the current active window

```bash
<arg>-status_indicator=15
#----------------------------------------
### Counter Strike focus group
<focus>Counter

#<arg>-debug
#<arg>-crossover=40
<arg>-tapdelay=6,4
<arg>-aliasdelay=6,4
#<arg>-nomenu
#<arg>-nocontrols
#<arg>-nodelay
<arg>-crosshair
# <arg>-crosshair=10,10

# Tap Groups
a,d
w,s

# Rebinds
...
```

## [Start Arguments]

Only the startargument `-file="filename" should now be used as start argument in the batch or in link. 
Everything else should be put in the config file and then can be applied on a per Game based as needed.
- use the same arguments in the config just instead with \<arg> in front. See above example.

-  `<arg>-nomenu` skips the menu and will be directly active
-  `<arg>-file="filename"`: (with or without "): custom save file
-  `<arg>-debug`: print out some debug info
-  `<arg>-nocontrols`: to start it without the controls on `DEL`, `END` and `PAGE_DOWN`keys enabled- start -  
-  `<arg>-tapdelay="number, number"`: sets the default min and max delay of "number,number" ms for Tap_Groups
-  `<arg>-aliasdelay="number, number"`: sets the default min and max delay of "number,number" ms for Macros/Aliases
-  `<arg>-crossover="number"`: sets the probability of "number" percent for a crossover (can be set in a range of 0-100)
   - A crossover is key event reversal with delay - press and release are overlapping the time of delay
-  `<arg>-nodelay`: deactivates delay and crossover

- `<arg>-status_indicator=*size in pixel*`: a dot overlay that changes based on being active to green and on incative to red
- `<arg>-crosshair` displays a simple crosshair as overlay and can be controlled on a per game basis in the center of the screen
- `<arg>-crosshair=*pixel delta x*,*pixel delta y*`: changes centerpoint according the delta x and y values in pixels

**(deprecated)**
Start Options: (add to the bat(ch) file or in a link after the *path*\free_snap_tap.exe)
 - use the start Arguments without \<arg>
 - everything still works as normal start arguments, but than could change in future
