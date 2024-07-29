## Free Snap Tap: Universal Keyboard Snap Tap Program with Tap Groupings

**aka Snap Tapping**

A minimalistic Python-based Snap Tapping program compatible with all keyboards, providing enhanced input prioritization for smoother gaming and typing experiences. Inspired by Razer Snap Tap Wooting SOCD & Null Bind.

Snap Tapping ensures that the most recent key input is prioritized, even if an opposing key is still pressed. This feature is particularly useful in gaming scenarios where precise control is crucial.

With **Tap Groupings**, you can define your own sets of keys to be observed together and be separately handled. The key presses for each Tap Grouping are mutually exclusive — only one will be sent as input at any time. 
As long as one key is still pressed it will be send as input - so e.g. fast tapping `D` while holding `A` (or reversed) and so rapid switching between `A` and `D` is possible.

Now with CLI User Interface to manage Tap Groupings:

<img src="https://github.com/user-attachments/assets/044bf4e5-f433-46e0-9d19-6f3ba11b8685" width="400"/>

Tap Groupings are now saved in a separate `tap_groups.txt` file which can be edited.

Each line represents one Tap Group, and each key is to be separated by a comma and can have 2 or more keys in it. 
(e.g. `1, 2, 3, 4` or `left_shift, left_control, alt` would also be possible)

String representation or vk-codes (virtual keyboard codes—list in py file) can be used.

### Example Use Cases

- Movement Left/Right
- Movement Forward/Backward
- Leaning to the sides
- Fast weapon switching
- Flight/Space Sim:
  - Throttle Up/Down
  - Movement Up/Down
  - Yaw Left/Right
  - Pitch Up/Down
  - Roll Left/Right

### Version History

**V0.3:**
- Added CLI UI to manage tap groupings.
- `tap_groups.txt` is used to save actual tap groupings, can be edited by hand if needed.

**V0.22:**
- Renamed to Free Snap Tap.

**V0.2:**
- Now special keys like Ctrl, Space, Alt, Win, Numpad keys, F-keys usable in Tap Groups.
- Just use the string representation (found in py_file in vk_codes dict) or directly the vk-codes. Mixing of both in the same Tap Group is possible.
- Added an icon! :-D (icons created by Vector Squad - Flaticon)

## How Free Snap Tap Works

Snap Tapping is a feature that enhances your keyboard's responsiveness by prioritizing the most recent key input when multiple keys are pressed simultaneously. Here’s how it operates:

1. **Intercepting Keyboard Input:** The program monitors the keys defined in the Tap Groupings. When you press any of these keys, the program intercepts the input.
2. **Suppressing Original Input:** Instead of allowing the original key press to be sent directly to your computer, the program suppresses it. This means the original input is not immediately processed by your system or application.
3. **Sending Idealized Input:** The program then determines the ideal input based on the most recent key press. For example, if you press `A` and then `D` without releasing `A`, the program will prioritize `D` and if you release `D`, `A` will be pressed again as long it is pressed. This idealized input is then sent to your system, ensuring that the most recent direction is registered.

### Example Scenario

Consider a gaming scenario where you are using the WASD keys for movement:

- **Without Snap Tapping:** Pressing `A` (left) and then `D` (right) simultaneously might cause your character to stop moving because the game receives conflicting inputs.
- **With Snap Tapping:** Pressing `A` (left) and then `D` (right) will result in the program sending only the `D` input, allowing your character to move right without interruption.

## Easy Usage

- Start via `free_snap_tap.exe` and a Command Line Interface will open with further explanations.
- Nothing more to do—Tap Groups can be defined via CLI.
- Have fun. :-)

## Configuration

Tap Groupings are a set of keys that are observed and the output of each group is separately handled. Activation of a key is mutually exclusive to all others—so there will always be only one activated key.

You can define Tap Groupings via Command Line, via `tap_groups.txt`, or in the Python file under the # Tap Groups section.

## Controls

- **Toggle Pause:** Press the DELETE key to pause or resume the program.
- **Stop Execution:** Press the END key to stop the program.

## Requirements if you want to use the py file directly

- Python 3.6 or higher
- `pynput` library

Install the `pynput` library using pip:

```bash
pip install pynput
```

## Installation

1. **Install Python:** Ensure Python 3.6 or higher is installed on your system. You can download it from [python.org](https://www.python.org/).
2. **Install `pynput` Package:** Open your terminal or command prompt and run:

```bash
pip install pynput
```

3. **Start the Program:** Run the `snap_tap.bat` file to start the Snap-Tap program:

```bash
./free_snap_tap.bat
```

or

```bash
python ./free_snap_tap.py
```

or by directly clicking/executing the `free_snap_tap.bat` file.
