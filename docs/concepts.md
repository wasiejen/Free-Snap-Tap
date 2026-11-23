> Part of the FST docs: [index](README.md) - [features & install](../README.md)




# Function documentation (Version 1.4.0):

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
  - **suffix/constraints** `ke|(-ke)|(+ke)` defines when to trigger or send a key_event based on True or False statements
  - **suffix/evaluations** `ke|(evaluation)` can result in a constraint if evaluated to True/False or as delay when evaluated to a number
  - **suffix/function invocation** `ke1 :: ke2|(repeat_toggle(10000))` a function that will always evaluate to True - the suffixed key_event is still played as usual, and the function defined in the invocation will be started
    - in this example: trigger `ke1` will start a repeated sending of the `ke2` every 10 seconds until ```ke1` is pressed again and stop it
- **focus app name** is a part or the full name of the active window the program will be looking for to activate or change tap groups, rebinds and macros
  - the match is a case-sensitive substring: `<focus>Counter` matches a window named "Counter-Strike" but not "counter-strike"
  - **focus group** are all the start arguments, tap groups, rebinds, macros that are applied when a focus app is recognised


