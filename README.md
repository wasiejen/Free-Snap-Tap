# Free Snap Tap: Universal Keyboard Snap Tap with Tap Groups, Rebinds (Key Replacements), Macros (Aliases) and custom adjustable delay for each key.

**Works as of V0.8.0 without triggering Valve Anti Cheat (if delays are not set too short :-) )**

**Only works on Windows.**

A minimalistic Python-based Snap Tapping program compatible with all keyboards and supports:

## General (very short) overview of functionalities
For more info see [Wiki](https://github.com/wasiejen/Free-Snap-Tap/wiki)

<img src="https://github.com/user-attachments/assets/c730d4ed-d16c-43ca-8368-409fb661b399" alt="crosshair" width="200"/>
<img src="https://github.com/user-attachments/assets/abbed088-8271-4160-98b6-ca770d12757c" alt="crosshair" width="250"/>

- This program main functionalities regarding the handling of Keys and key_events (ke):
1.  **[Tap_Groups]** `a, d`: Keys with Snap Tap functionality
    - mutually exclusive Keys that will always prioritise the most recent key press and resend the previous pressed key if it is still pressed
    - the output will be the idealized version of the real input
    - delays for simulanious key events are applied on default
2.  **[Rebinds]** `trigger_group : replacement key_event or  Key`: when a trigger_group is activated the key_event / Key will be played instead of trigger
    - The important destinctions from Macros are that Rebinds only support a single Key or key_event as the played part (output part) and that this resulting output (key_event) will be able to trigger macros
3.  **[Macros]** `trigger_group :: key_group`: the key_group will be played when the trigger_group is activated; trigger will be suppressed
    - delay per key setable
    - interrupts itself on replay
    - interruptable via invocation `|(*name of the macro*)`
4. **[Macro_Sequences]** `trigger_group :: key_group 1 : key_group 2 : ...`
    - multiple macro key groups playable in sequence with the same trigger key on repeated reactivation of the same macro trigger.
    - can be reseted by itself or other rebinds or macros via invocation `|(*name of macro*)`
5. **[Delays]** `ke|100` supported for Tap_Groups in general and in Macros in general and on a per key basis with option to be random in min, max limits
    - `ke|10|5` will use a random delay between 5 and 10 ms
6. **[Focus Apps]** activates and deactivates the functionality based on set focus app names. Multiple focus app defineable with different settings and Tap Groups, Rebinds and Macros for each focus app
7. **[Configuration]** everything can be configurated in a single text file
    - for each game different settings and groups can be set and will be automatically applied on active window recognition
8. **[Aliases]** `<*name of alias*> -shift, h, +shift, e,l,l,o` define groups of key events that can be used in rebinds and macros
9. **[Repetition of Aliases]** Alias groups can be used the start periodically
    - `|(toggle_repeat('<*name of alias*>', 5000))` 
10. **[Constraints and Evaluations]** every key_event can be controlled by constraints and evaluations that determine if a key will be played or not
    - `ke|(p('shift') and tr('-space') > 1000)` : the ke will only be played if shift is pressed (p) and the space key was pressed more than 1000 ms ago (tr = time real key event)
11. **[Invocations]** can be placed on any ke to invoke a defined function and give parameters to control repetiton of alias and interruption reset behavior
12. **[Status Indicator - simple overlay for in game control]** `<arg>-status_indicator=*size in pixel*`
    - see picture above - just a small dot that changes based on being active to green and on incative to red
    - left mouse drag changes the placement, right mouse click opens the menu
    - double left mouse click or middle mouse click will open the config file
13. **[Crosshair]** `<arg>-crosshair` or `<arg>-crosshair=*pixel delta x*,*pixel delta y*`
    - displays a simple crosshair as overlay and can be controlled on a per game basis
  
Function Documentation V1.1.3 now in the [Wiki](https://github.com/wasiejen/Free-Snap-Tap/wiki).

## Example for a config file:

```bash
# default groups are defined before he first <focus> and will always be 
# active and also applied if a focus app is recognised before the focus groups will be apllied on top

#<arg>-debug
#<arg>-crossover=40
#<arg>-tapdelay=6,4
#<arg>-aliasdelay=6,4
#<arg>-nomenu
#<arg>-nocontrols
<arg>-nodelay

### NEW since V1.1.0 (only usable as default argument)
<arg>-status_indicator=20  # starts the status indicator with a size of 20 pixel on startup

#Tap Groups
a, d
w, s


#----------------------------------------
# Counter Strike focus group - everything following <focus> will activate when an active
# window matches the name or has the part of the name in itself that is given after <focus>
<focus>Counter

#<arg>-debug
#<arg>-crossover=40
<arg>-tapdelay=8,2        # random delay between 2 and 8 ms
<arg>-aliasdelay=10,4     # default delay for macros between each key event (press, release) bet 4 and 10 ms
#<arg>-nomenu
#<arg>-nocontrols
#<arg>-nodelay

### NEW with V1.1.0
<arg>-crosshair   # displays a simple crosshair in the center of the main screen

# Tap Groups
# a,d                     # already applied in default part of the file
# w,s                     # already applied in default part of the file

# Rebinds
left_windows : left_control
caps_lock : shift
c : ^left_control         # toggle for left control on c
v : suppress              # v will always suppressed

# Macros
# automatic counter strafing when w key released
# will not trigger if crouched (!ctrl) or opposite key is pressed (!s for forward)
# (tr("+w")>100): will only trigger if movement key was pressed for at least 100 ms
# (last("-space")>500): will only trigger if time since last press of space is longer than 500 ms
# (cs("+w")): counterstrafe will be dynamically adjusted based on time of pressed movement key 
# cs() is a hard coded function that uses a polynomial function to approximate the acceleration
#    ingame and calculate the needed length for a counterstrafe to come to a stop
(counterstrafing_forward) +w|(tr("+w")>100)|(last("-space")>500), !s, !ctrl ::  +w|15|5, -s|(cs("+w")*1.1), +s|0|0
(counterstrafing_back)    +s|(tr("+s")>100)|(last("-space")>500), !w, !ctrl ::  +s|15|5, -w|(cs("+s")*1.1), +w|0|0
(counterstrafing_left)    +a|(tr("+a")>100)|(last("-space")>500), !d, !ctrl ::  +a|15|5, -d|(cs("+a")*1.1), +d|0|0
(counterstrafing_right)   +d|(tr("+d")>100)|(last("-space")>500), !a, !ctrl ::  +d|15|5, -a|(cs("+d")*1.1), +a|0|0

# jump with crouch: will not trigger if ctrl is pressed (!ctrl)
# will only trigger if space press was 125-400 ms long and the crouch will go at most to 600 ms after the initial space press
+space|(125<tr("+space")<400), !ctrl :: +space, -ctrl|(600-tr("+space")), +ctrl|0|0 

# automatic application of healing syringe and switch back to last weapon
# (125<tr("+x")<900): will not be triggered if tapped really quickly or hold over 900 ms
# the longest it will be waiting to release x is 900ms after x was pressed (900-tr("+x")) to make sure it is equipped fully
+x|(125<tr("+x")<800) :: +x|(1000-tr("+x")), -left_mouse|700|700, +left_mouse|0|0, q


### V1.1.0+ features here
#----------------------------------------
#Horizon - Forbidden West (with some examples I use)
<focus> Horizon

<arg>-tapdelay=6,4
<arg>-aliasdelay=40,40
<arg>-nomenu

### NEW with V1.1.0
<arg>-crosshair   # displays a simple crosshair in the center of the main screen
<arg>-crosshair=10,10   # sets the centerpoint 10 pixels to the right and down on the main screen

# Aliases
<run_if_not> -shift|(ar('shift'))
<alias_in_alias> <run_if_not>,   +ctrl|75|(ap('-ctrl')),  -ctrl|150,   +c|75|(ap('-c')),  +ctrl, -shift

# will be used for repetition
<scan> v

# Rebinds
(autospring_toggle) caps_lock : ^shift
(autosprint_on_dc) +shift|(dc()<900) : +suppress
(focus_toggle) p: ^alt

# repetiton of scanning on v every 6.5 s
# eval/invocation in sequence: if previous True evaluate the next
# |(!) is sme aas |(False) and will result in that the rebind will never be played but the invocations were already executed
# so no replacement of the key and the original key input will not be supressed
(repeat_scan) +v|(tr("+v")>500)|(stop_repeat('<scan>'))|(!) : +v 
(repeat_scan) -t|(toggle_repeat('<scan>', 6500))|(!) : -t
(repeat_scan) -v|(reset_repeat('<scan>'))|(!) : -v

# on escape all repeated keys will be stopped, all currently pressed simulated keys will be released and the map seqence resetted
(esc_repeat_stop) +esc|(stop_all_repeat())|(release_all_keys())|(map_open_close)|(!) : +esc

# Macros
(aiming) -left_mouse, -right_mouse :: -left_mouse|900, -alt|(p("right_mouse"))
(aiming_mod1) +left_mouse, -right_mouse :: +left_mouse, +alt,  None|(aiming)  # |(aiming) wil interrupt the above macro
(aiming_mod2) +right_mouse, -left_mouse :: +left_mouse|50|(last('-ml')>800), +right_mouse, +alt,  None|(aiming)

(crouch) -c :: <run_if_not>, +c|100|(ap('-c')), -c|100, +c, -shift
(crouch_mod) +c : +suppress

(evade_2) -mouse_x2 :: <alias_in_alias>

(heavy_attack) -mouse_x1 :: -g|50, +shift|50, -shift|50, +g 
(heavy_attack_mod) +mouse_x1 : +suppress

(special_ability) i :: -f|50, space|50, +f

# key sequence - one key group will be played after the other and reset itself or via |(map_open_close)
# stops repeat in map and resumes it on exit
(map_open_close) -m :: m, |(stop_repeat('<scan>'))
					 : esc, |(toggle_repeat('<scan>', 6500))
(map_open_close_mod) +m : +suppress

(stop_shift_on_menu_and_map_reset) -tab|(map_open_close) :: +shift, tab
(stop_shift_on_menu_and_map_reset) +tab : +suppress

# due to some dropped shift states in the game when looting the internal state must be resetted to again run via simulated input
(interact_shift_mod) +e|(tr("+e")>300) :: +e, +shift, |(release_all_keys())
(interact_shift_mod) +e|(dc() < 1000) :: +e, -shift


#----------------------------------------
# Space Marine 2 :-D
<focus> Marine 2

# focus groups for Space Marine 2 

```

## For function documentation and usage see the [Wiki](https://github.com/wasiejen/Free-Snap-Tap/wiki)

## How Free Snap Tap Works 

Snap Tapping is a feature that enhances your keyboard's responsiveness by prioritizing the most recent key input when multiple keys are pressed simultaneously. Here’s how it operates:

1. **Intercepting Keyboard Input:** The program monitors the keys defined in the Tap Groupings. When you press any of these keys, the program intercepts the input.
2. **Suppressing Original Input:** Instead of allowing the original key press to be sent directly to your computer, the program suppresses it. This means the original input is not immediately processed by your system or application.
3. **Sending Idealized Input:** The program then determines the ideal input based on the most recent key press. For example, if you press `A` and then `D` without releasing `A`, the program will prioritize `D` and if you release `D`, `A` will be pressed again as long it is pressed. This idealized input is then sent to your system, ensuring that the most recent direction is registered.

## Easy Usage

- Download the executable from the current [releases](https://github.com/wasiejen/Free-Snap-Tap/releases).
- Start via `free_snap_tap.exe` or the provided bat(ch) file and a Command Line Interface will open with further explanations.
- to customize the start with many options see `# Configuration`. Example batch file can also be found there.
- To start from the menu hit [Enter].
- Have fun. :-)

### AntiVir False Positives
- The exe is offered to simplify the usage, it may get a false positive from some antivirus tools and be detected as a Trojan. The reason for that seems to be the packaging as an executable that triggers these antivirus software and leads to false positives. See Discussion #12.
  - Option 1: if recognized as Trojan - whitelist it in your antivir.
  - Option 2: instead use the py file - See `# Installation` for more info

## Installation

1. **Install Python:** Ensure Python 3.6 or higher is installed on your system. You can download it from [python.org](https://www.python.org/).
2. **Install `pynput` Package:** Open your terminal or command prompt and run:

```bash
pip install pynput
```

or navigate to the Free-Snap-Tap repo folder and type in:

```bash
pip install -r requirements.txt
```

3. **Starting the Program:**

    3.1 **Option A: directly:** By  clicking/executing the `example_batch_file.bat` file.

    3.2 **Option B: via Command Line:** Start a Command Line/Terminal, navigate to the folder containing the .py file and use one of the following commands:

```bash
./example_batch_file.bat
```

or navigate to the Free-Snap-Tap repo folder and type in:

```bash
python ./free_snap_tap.py
```

## On Linux 

Not working due to no support of selective key suppression in Linux OS.

## On MacOS - **Not supported atm**

Compared to Linux the selective event suppression is possible, but it uses another listener constructor and gets other data than the win32_event_filter which is used here. Since this conversion/switch/alternative is not implemented yet, the program will not work on MacOS. But there might be a fix for that in the future.

## On Feedback:

Feel free to give feedback. This program is a fun project to me to get more comfortable with GitHub and testing out some things in Python. :-)
If you have wishes or ideas what to add, just `create a issue` or `start a discussion` with a description and use cases of the feature.

## Version History

Moved to [Wiki](https://github.com/wasiejen/Free-Snap-Tap/wiki).