# Aliases, Tap Groups, Rebinds, Macros, Macro Sequences

> Part of the FST docs: [index](README.md) - [features & install](../README.md)

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
- Notation: `a, d` simple listing of Keys separated by commas 
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
- macro playback WILL BE INTERRUPTED by retriggering of the macro if it is still in playback and waiting for a delay, the old playback will be stopped and replaced by the new retriggered macro playback
- Only supports notation for the trigger of the trigger_group as key_event, to prevent double triggering with one key_tap
  - if a `Key` is given it will be interpreted as a pressed key_event `-key_event` 
- can be named by putting`(*name of the macro*)` in front of the macro definition
  - on usage of `|(*name of the macro*)` the playback of a started macro can be interrupted from anywhere - nothing is reset (unknown names are a silent no-op)
- why playback never blocks real input (the asyncio task design) is in [internals.md](internals.md)

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

