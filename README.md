## Free Snap Tap: Universal Keyboard Snap Tap Program with Tap Groupings

**aka Snap Tapping**

A minimalistic Python-based Snap Tapping program compatible with all keyboards, providing enhanced input prioritization for smoother gaming and typing experiences. Inspired by Razer Snap Tap and Wooting SOCD & Null Bind.

Snap Tapping ensures that the most recent key input is prioritized, even if an opposing key is still pressed. This feature is particularly useful in gaming scenarios where precise control is crucial.

With **Tap Groupings**, you can define your own sets of keys to be observed together and be separately handled. The key presses for each Tap Grouping are mutually exclusive — only one will be sent as input at any time. 
As long as one key is still pressed it will be send as input - so e.g. fast tapping `D` while holding `A` (or reversed) and so rapid switching between `A` and `D` is possible.

Also with the Option for simple **Key Replacements**. Useful if you can't change some keys ingame or you want to use keys that normally are not available to games like the windows keys.

**Only works on Windows.**

With CLI User Interface to manage Tap Groupings and Key Replacements:

<img width="400" alt="FST" src="https://github.com/user-attachments/assets/09efd630-c691-4d1c-8a06-aa8906bc54a7">

Tap Groupings are now saved in a separate `tap_groups.txt` file and key replacement pairs in `key_replacement_groups.txt` - both can be edited directly.

Each line represents one Tap Group, and each key is to be separated by a comma and can have 1 or more keys in it. (e.g. `1, 2, 3, 4` or `left_shift, left_control, alt` or just `v` would also be possible)
Key Replacement Pairs only accepts 2 keys.

String representation or vk-codes (virtual keyboard codes—list in py file) can also be used.

### Example Use Cases for Tap Groups

- Movement Left/Right (Tap Group `a, d` and/or `left_arrow, right_arrow`)
- Movement Forward/Backward (Tap Group `w, s` and/or `up_arrow, down_arrow`)
- Leaning to the sides (Tap Group `e, q`)
- Fast weapon switching (Tap Group `1, 2, 3, 4`)
- Flight/Space Sim:
  - Throttle Up/Down
  - Movement Up/Down (Tap Group `r, f`)
  - Yaw Left/Right
  - Pitch Up/Down
  - Roll Left/Right
 
- Single key Tap Groups:
  - e.g. (Tap Group `v`) would transform output while holding the key from "vvvvvvvvvvv..." to just "v". (might depend on keyboard used)
    - Use case you ask? I have no idea right now. ;-D
    - Might be useful for people who want to have only one character written at a time independent from how long the key is pressed. Add every key each to a Tap Group and all keys will always only write one character.

### Example Use Cases for Key Replacements

- `windows_left` to `left_control` 
- `<` to `left_shift`

## Controls

- **Toggle Pause:** Press the `DELETE` key to pause or resume the program.
- **Stop Execution:** Press the `END` key to stop the program.
- **Return to Menu:** Press the `PAGE_DOWN` key to return to the menu.

You can change the control keys in the py file under # Control keys.

## Version Information

**V0.7.0**
- fixed a bug due which the key replacement was never send

Some measures to lighten the precision of snap tap to maybe circumvent some AntiCheat.
- NEW: random delay for snap tap 
  - Start argument `-delay=50` for max delay of 50 ms (can be set in a range of 1-500)
  - Without the start argument no delay will be used
- NEW: crossover of input for snap tap
  - Start argument `-crossover=50` for a probability of 50% (can be set in a range of 0-100)
  - I call "crossover" the act of releasing one key before the press - but just simulated. In a way to simulate a too early release of one key before the press of the actual pressed key (immediate release of last key and delay of pressed key as result). 
  - Same random delay used as defined by -delay="number"
  - Without the start argument no crossover will be used

**V0.6.0**
- NEW: Key Replacements will now be tracked in tap groups
- NEW: Menu option: 7. Print vk_codes to identify keys
  - Will print out the corresponding vk_codes of a key event. Useful for finding your own vk_codes when used with different keybaord_layouts. 
- Added requirements.txt - see #19
- Removed exe from repo and put it into releases: see #19
- Some edits in README.md

**V0.5.1**
- Fixed direct interpretation of number strings, e.g. `1`, `2`, ... as a vk_code. Fixed by first looking up in dict if a string entry for that number exists and if not then cast it as an int an use it directly as a vk_code.

**V0.50**
- Fixed not working -txt= startargument; changed it to: 
  - `-tapfile=` replaces `-txt=`
- NEW: Starting argument for custom key replacement file
  - `-keyfile=`
- NEW: Control for returning to the menu on `PAGE_DOWN` key
- NEW: Mouse Buttons (1: left, 2: right, 4: middle) can now be the output key of a key replacement pair
- NEW: key replacements can now reverse there output
  - declared by just using a `-` before any or both keys in the key pair
  - (e.g. `k, -k` or `-k, -k`  would reverse the press of k to a release and vise versa)
    - originally intented for the right mouse button (looking around) in MMO's 
      - e.g. `k, 2` / `k, mouse_right` to simulate a right mouse click with a keyboard key `k`
      - e.g. `k, -2` then reverses to output and lets me lock the right mouse button on release of key `k`
    - but can also be used for toggling auto movement on and off with another key (e.g. `left_windows, -w`)
- removed implementation parts of the attempt to make it work on linux
  - most of the functionality was not working due to the linux limitation of not being able to supress events

## How Free Snap Tap Works

Snap Tapping is a feature that enhances your keyboard's responsiveness by prioritizing the most recent key input when multiple keys are pressed simultaneously. Here’s how it operates:

1. **Intercepting Keyboard Input:** The program monitors the keys defined in the Tap Groupings. When you press any of these keys, the program intercepts the input.
2. **Suppressing Original Input:** Instead of allowing the original key press to be sent directly to your computer, the program suppresses it. This means the original input is not immediately processed by your system or application.
3. **Sending Idealized Input:** The program then determines the ideal input based on the most recent key press. For example, if you press `A` and then `D` without releasing `A`, the program will prioritize `D` and if you release `D`, `A` will be pressed again as long it is pressed. This idealized input is then sent to your system, ensuring that the most recent direction is registered.

## Easy Usage

- Download the executable from the actual [releases](https://github.com/wasiejen/Free-Snap-Tap/releases).
- Start via `free_snap_tap.exe` or the provided bat(ch) files and a Command Line Interface will open with further explanations.
- Nothing more to do — Tap Groups and Key Replacements can be defined via CLI. To start from the menu hit [Enter].
- Have fun. :-)

### AntiVir False Positives
- The exe is offered to simplify the usage, it may get a false positive from some antivirus tools and be detected as a trojan. The reason for that seems to be the packaging as an executable that triggers these antivirus software and leads to false positives. See Discussion #12.
  - Option 1: if recognised as trojan - whitelist it in your antivir.
  - Option 2: instead use the py file - See `# Installation` for more info

## Configuration

Start Options: (add to the bat(ch) file or in a link after the *path*\free_snap_tap.exe)
-  `-nomenu` or `direct-start`: skips the menu and will be directly active
-  `-tapfile="filename"` (with or without "): load and save tap groupings from a custom save file
-  `-keyfile="filename"` (with or without "): load and save key groupings from a custom save file
-  `-debug`: print out some debug info
-  `-nocontrols`: to start it without the controls on `DEL`, `END` and `PAGE_DOWN`keys enabled- start -  `-delay="number"` for max delay of "number" ms (can be set in a range of 1-500)
-  `-crossover="number"` for a probability of "number" percent (can be set in a range of 0-100)
  
Tap Groupings are a set of keys that are observed and the output of each group is separately handled. Activation of a key is mutually exclusive to all others—so there will always be only one activated key.
You can define Tap Groupings or Key Replacements via Command Line or via editing the `tap_groups.txt` or `key_replacement_groups.txt`.

## Requirements if you want to use the py file directly

- Python 3.6 or higher
- `pynput` library

Install the `pynput` library using pip:

```bash
pip install pynput
```
or

```bash
pip install -r requirements.txt
```

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

    3.1 **Option A: directly:** By  clicking/executing the `free_snap_tap.bat` file.

    3.2 **Option B: via Command Line:** Start a Command Line/Terminal, navigate to the folder containing the .py file and use one of the follwing commands:

```bash
./free_snap_tap.bat
```

or navigate to the Free-Snap-Tap repo folder and type in:

```bash
python ./free_snap_tap.py
```

## On Linux - try V0.37 or V.40 - no linux functionality in V0.50+

V0.50 removed implementation attempt from V0.37

V0.37 introduced an implemention attempt to make it useable on linux

~~Will not work with the actual package pynput to use the event handling. In Linux this package only supports full suppression of key events. And I only selectively suppress key events and let every key not part of a tap group be. Since this is not feasable atm with this package and the implementation I used there is no linux support atm.~~

## On MacOS - **Not working atm**

Compared to linux the selective event suppression is possible, but it uses another listener constructor and gets other data than the win32_event_filter which is used here. Since this conversion/switch/alternative is not implemented yet, the program will not work on MacOS. But there might be a fix for that in the future.

## On Feedback:

Feel free to give feedback. This program is a fun project to me to get more comfortable with Github and testing out some things in Python. :-)
If you have wishes or ideas what to add, just `create an issue` or `start a discussion`.

### Version History

**V0.40**
- NEW: Management of key replacements
    - I had the functionality to suppress keys, so why not replace some.
    - Managed in the same manner as the tap groupings
- Better or more complete error handling in the menu
    - if someone still finds a way to crash the program via the menu, then congratulations :-D
- Linux user will not see the new key replacement options
    - selective key suppression is simply not working on linux

**V0.37**
- bug fix where program control were not working due to changed key up and down recognition intruduced in V0.36
- first Linux test implemention
    - feedback needed - might not work due to still using win32_event_filter, but now without suppression of key events for Linux
 
**V0.36**
- corrected a bug where the ALT key and (ALT GR) changes the msg values for up and down keys (really weird behavior)

**V0.35**
- fixed bug that disabled snap tapping in V0.34

**V0.34**
- added start argument `-nocontrols` to start it without the controls `DEL` and `END` enabled

**V0.32**
- added option to load and save tap groupings to custom files.
  - add `-txt=` followed with filename (e.g. -txt=starcitizen.txt) to the bat file or the link to the execution file
- small edits in py file
- some comments

**V0.31:**
- added small fixes
  - no handling of a single key in multiple tap Groups any more - resulted in strange behavior
- added option to start without menu
  - just ad -nomenu or use prepared bat file to start directly with defined Tap Groupings in tap_groups.txt

**V0.3:**
- Added CLI UI to manage tap groupings.
- `tap_groups.txt` is used to save actual tap groupings, can be edited by hand if needed.

**V0.22:**
- Renamed to Free Snap Tap.

**V0.2:**
- Now special keys like Ctrl, Space, Alt, Win, Numpad keys, F-keys usable in Tap Groups.
- Just use the string representation (found in py_file in vk_codes dict) or directly the vk-codes. Mixing of both in the same Tap Group is possible.
- Added an icon! :-D (icons created by Vector Squad - Flaticon)
