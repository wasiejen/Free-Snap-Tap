### NEW V1.0.1: 
- all settings in one file (except start arg: `-file=...` to define from which file to load at start)
  - all start arguments supported via `<arg>*startargument*`
  - multi focus apps with own groups via `<focus>*name of focus app*`  
    - all start arguments and groups before first `<focus>...` will be interpreted as default and applied to all focus app settings
    - every start argument and groups until the next \<focus> will be added to the current focus name and applied AFTER the default start arguments and groups
    - e.g. tap group `a, d` before first \<focus> will be applied to all focus groups
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
- many other smaller improvements :-)
  

# Function documentation (Version 1.0.1):

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
  - **suffix/function invocation** `ke1 :: ke2|(repeat_toggle(10000))` a function that will always evaluate to False and so supresses the actual ke, but will start the function defined in it
    - in this example: trigger `ke1` will start a repeated sending of the `ke2` every 10 seconds until ```ke1` is pressed again and stop it
  - **focus app name** is a part or the full name of the active window the program will be looking for to activate or change tap groups, rebinds and macros

## General (very short) overview of functionalities

- This program main functionalities regarding the handling of Keys and key_events:
1.  [Tap_Groups] `a, d`: Keys with Snap Tap functionality
    - mutually exclusive Keys that will always prioritise the most recent key press and resend the previous pressed key if it is still pressed
    - the output will be the idealized version of the real input
    - delays for simulanious key events are applied on default
2.  [Rebinds] `trigger_group : replacement key_event or  Key`: when a trigger_group is activated the key_event / Key will be played instead of trigger
    - The important destinctions from Macros are that Rebinds only support a single Key or key_event as the played part (output part) and that this resulting output (key_event) will be able to trigger macros
3.  [Macros] `trigger_group :: key_group`: the key_group will be played when the trigger_group is activated; trigger will be suppressed
    - delay per key setable
4. [Macro_Sequences] `trigger_group :: key_group 1 : key_group 2 : ...`
    - multiple macro key groups playable in sequence with the same trigger key on repeated reactivation of the same macro trigger.
    - can be reseted by itself via `reset` key_event or by other macros or rebinds with the use of `reset_*number of macro*` key_event 
      - IDEA: or the function invocation (reset(*number of macro*)) TODO: implemented it
5. [Delays] supported for Tap_Groups in general and in Macros in general and on a per key basis with option to be random in min, max limits
6. [Focus App] activates and deactivates the functionality based on set focus app names. Multiple focus app defineable with different settings and Tap Groups, Rebinds and Macros for each focus app
7. [Configuration] everything can be configurated in a single text file


## More in depth functionality

- Each function has to be added to the FSTconfig.txt as a single line. 
- Comments usable with `#` for line comments, commenting out single keys and comments after a definition.
- All usable key strings are included in the vk_code_dict.py file. Key strings can be edited or added freely so simplify to ease usage.



### [Tap_Groups]
- Notation: `a, d` simple listing of Keys seperated by commas 
- 2 or more Keys usable
- key_event notation `-a, -d` will be interpreted as Keys 'a,d' instead
- delays are usable via the start argument `tap_delay=min_time,max_time`
- simulated keys from Macros can not interfere with real key states (current pressed keys) that are defined in tap_groups
- Rebinds that have as replacement a key in a Tap_Group will be treated as normal real key events and will not be ignored.

### [Rebinds]
- Notation: `trigger_group : replacement key_event or Key` 
- internally it only works with key_events. Usage of Keys is offered to simplify press and release rebinds.
- replacements of rebinds can trigger macros and be used in Tap_Groups
- replacements will be played immediately - there is no delay and given delays will be ignored
- support notation with key_events and Keys
  - `key_event : key_event`
    - will be used as is
  - `Key : Key`
    - will be interpreted as 2 key_event : key_event rebinds
    - e.g. `a : b` -> `-a : -b` and `+a, +b`
  - !Attention: if only one Key is present in the notation as trigger or replacement, both will be interpreted as Keys
    - `-caps_lock, shift` -> `caps_lock, shift`
- supports suppression of key_events and Keys
  - `windows_left : suppress` will suppress the left windows key
  - `+shift : +suppress` will only suppress the release of shift

For further functionality of how it will be triggered, usage of constraints, evaluation and function invocation see [Rebinds + Macros + Macro_Sequences]

### [Macros]
- Notation: `trigger_group :: key_group`
- support of custom delays per key_event/Key (for usage of custom delay see [Suffix/Delays] and for general delay see #### Delays in general)
  - Notation: 
    - `key_event/Key|*time*` -> will result in a static delay of length *time* in ms
    - `key_event/Key|*time1*|*time2*` -> will result in a random delay of length between *time1* and *time2* in ms
- support of key_groups (multiple Keys and/or key_events) to be played
- will be played in its own thread to not interfere with real input while waiting for the delays
  - macro playback WILL BE INTERRUPTED by retriggering of the macro if it is still in playback and waiting for a delay, the old playback will be stopped and replaced by the new retriggered macro playback
- Only supports notation for the trigger of the trigger_group as key_event, to prevent double triggering with one key_tap
  - if a `Key` is given it will be interpreted as a pressed key_event `-key_event` 

For further functionality of how it will be triggered, usage of constraints, evaluation and function invocation see [Rebinds + Macros + Macro_Sequences]

### [Macros/Macro_Sequences]
- Notation: `trigger_group :: key_group1 : key_group2 : key_group3 : ...`
- can have 2 or more key_groups
- each key_group will be played in sequence with each retrigger of the trigger key if the constraints of the trigger group are still valid
- macro sequence will reset itself automatically if every key_group was played and thus will start anew
- can be reseted by the use of the key_event `reset` in the trigger group or any of the key_groups
  - !Attention: always use `-reset` or `+reset` or else it will be handled like a Key (press and release) and checked (trigger group) or exeuted (key_group) 2 times. One time on -reset and another on +reset.
  - `reset` will only reset the actual macro sequence it will be used in
  - `reset` can be used with constraints or evaluations to only activate it under certain conditions (like elapsed time or key pressed at the same time)
- to reset other macro sequences there are other `reset_*number of macro*` key_events (from reset_0 to reset_30 atm) that can be used to reset a specific macro sequence.
  - the number of a macro is determined by the order of macros in the config file and starts with 0
- IDEA TODO: reset as function invocation of a trigger to check at press of a trigger if macro sequence should be reseted and then start the macro sequence at the start or continue. this (reset(*number of macro*)) should always evaluate to True to not hinder the trigger to be triggered

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

### [Suffix/Evaluation]

- supports evaluation as suffix
  - **evaluation to an integer** which will be used as a constant delay (all following function returns a length of time in ms)
    - `|(tr("ke"))`: timing of length of time for presses and releases of **Real** key events
        - for tr("-ke") get the length of time of a key press to release (read like: when I press ke (-ke) then give me the length of time since the last ke release)
        - for tr("+ke") returns the length of time from last key press to actual key release
    - `|(ts("ke"))` timing of length of time for presses and releases of **Simulated** key events (also includes Tap Groups due to handling of them internally)
    - `|(ta("ke"))` timing of length of time for presses and releases of **All** key events
    - `ke1|(last("ke2"))` timing of length since last `-ke` press or `+ke` release (especially useful to check on other keys than the suffixed key)
    - `|(dc("ke"))` dc short for double click: return time on press since the last press, or time of release since the last release
    - `|(cs("key"))`: counterstrafing especially for CounterStrike: returns a time of length a key must pressed based on the pressed key to return the optimal time of length for a counterstrafe to come to a stop. Uses an internal function to approximate the acceleration time of the counter movement key.
    - `|(csl("ke"))`: some as above only uses a linear function to estimate the counter strafing time

  - **evaluation to bool (True/False)**
    - supports standard python notation and inbuilt functions
      - use of `,` commas in multi parameter functions is not supported atm. (e.g. pow(20,3) does not work)
    - **every above time function can be used as a comparison evaluate it to bool**
      - e.g. (dc("-ke") < 500) -> results to True if a double click (as time of the press) was made in less than 500 ms, else it will evaluate to False

### [Suffix/Function_Invocation]

- supports function invocation as suffix in replacement key of rebinds or played key groups of macros
- !ATTENTION: when function invocation is used on trigger and/or constraints of a trigger_group
  - the trigger and all constraints must check for True BEFORE their evaluations/trigger invocations will be checked
  - some invocations will result in False, so if used in a trigger_group, the following rebind or macro will likely never be activated
- ke/Keys that are suffixed with an invocation will never be played directly but instead will be played at the start of the repetition. So if you trigger a repeat and nothing is happening, then most likely the repeat did not start correctly or some other evaluations of the repeated ke/Key prevented the immediate execution 
- repeated ke's/Keys are not able to trigger other macros/rebinds even when started on a replacement of a rebind

- main functionality atm is to define repeated keys that will be send indefinitely with a defined time separation, until stopped again.
  - I use it mainly for repeated buffing/activating abilities with effect times in games to not bother to remember to renew it. :-)
  - due to implementation each key_event will be automated separately and has to be stopped separately
  - each invocation only applies to the Key or ke of it is suffixed to

function invocations right now:
  - `(toggle_repeat(*time in ms*))`   **evaluates always to False, so ke/Key will not be played**
    - one press+release will start a repeat of ke/Key it is suffixed to and the second will stop the repeat
    - length of delay between press and release will be dependent on your press and release timing; the press will start the repeating of press and release will start it for release
  - `(stop_repeat())`                evaluates always to **True**, so ke/Key will be played if all other constraints are also True
  - `(reset_repeat())`               evaluates always to **True**, so ke/Key will be played if all other constraints are also True
    - resets the interval of the ke/Key and starts the interval anew

Example:
  - `ke :: ke|(toggle_repeat(10000))` start the repetition of `ke` in an interval of 10000 ms #
  - `Key : Key|(toggle_repeat(10000))` will start -ke and +ke of the Key in an interval of 10 s (Keys will always be interpreted as 2 key_events (ke))
  - good way to use stopping and reseting of repeating keys without triggering any rebinds or macros is to just use them on a trigger for the key you want to repeat
    - `Key1 : Key2|(toggle_repeat(10000))`
    - `Key2|(reset_repeat()) : any Key`  <--
    - `Key2|(stop_repeat()) : any Key`  <--
    - invocation will always evaluate to False, so the rebind is never activated, but on the check the invocation will be run and thus started for the suffixed Key

- more complex sequences need more effort because of the implemention as suffix for a ke or Key:
  - `trigger :: -shift|(toggle_repeat(10000)), h|(toggle_repeat(10000)), i|(toggle_repeat(10000)), +shift|(toggle_repeat(10000))` --> results in a repeated written `HI` every 10 seconds


- the repeated ke/Key can have suffixes after the function invocation
  - the repeated ke/Key inherits the suffixes following AFTER the invocation of (toggle_repeat())
    - e.g. `u : v|(toggle_repeat(6500))|(last("-v")>5000)` will create a repeated Key (-ke, +ke) with interval 6,5 seconds and will only send it when the time last press of the real v key is bigger than 5 seconds.
    - normal suffix constraints or other evaluation are usable


## [Configuration]

- text file can be changed from default "FSTconfig.txt" to any file you want to, with the help of the startargument `-file=*file_name*`
- all startarguments can be used either with a .bat file, by adding them to the link to the .exe or .py file, or by including them in the config file with `<arg>*start_argument*`, e.g. `<arg>-nomenu`
- focus app names can be defined in the config file via `<focus>*name of the app*`
  - everything BEFORE the first \<focus> will be seen as default start arguments and groupings and applied in general (evene outsite of focus apps) and to all following focus app groupings
  - everything following this \<focus> definition up until the next \<focus> will be applied when the focus app name given is found in the current active window

```bash
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

# Tap Groups
a,d
w,s

# Rebinds
...
```

### [Start Arguments]

Start Options: (add to the bat(ch) file or in a link after the *path*\free_snap_tap.exe)
-  `-nomenu` skips the menu and will be directly active
-  `-file="filename"`: (with or without "): custom save file
-  `-debug`: print out some debug info
-  `-nocontrols`: to start it without the controls on `DEL`, `END` and `PAGE_DOWN`keys enabled- start -  
-  `-tapdelay="number, number"`: sets the default min and max delay of "number,number" ms for Tap_Groups
-  `-aliasdelay="number, number"`: sets the default min and max delay of "number,number" ms for Macros/Aliases
-  `-crossover="number"`: sets the probability of "number" percent for a crossover (can be set in a range of 0-100)
   - A crossover is key event reversal with delay - press and release are overlapping the time of delay
-  `-nodelay`: deactivates delay and crossover
-  `-focusapp="part of the app name"`: Script only activate evaluation of key events if the defined window with the given name is in focus.
   - e.g. for Counterstrike, `-focusapp=count` is enough to recognize it (not case sensitive)
   - can be manually overwritten by Control on ALT+DEL key combination (to activate outside and deactivate inside focus app)

'''