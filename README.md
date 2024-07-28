# Free Snap Tap: Universal Keyboard Snap Tap Program

aka Snap Tapping

A Python-based Snap Tapping program compatible with all keyboards, providing enhanced input prioritization for smoother gaming and typing experiences.
Snap Tapping ensures that the most recent key input is prioritized, even if an opposing key is still pressed. This feature is particularly useful in gaming scenarios where precise control is crucial.

With Tap Groupings you can define your own sets of keys to be oberserved together and be seperately handled. The key presses for each Tap Grouping are mutually exclusive - only one will be pressed as output.

### Examples Use Cases

- Movement Left Right
- Movement Forward and Backwards
- Leaning to the sides
- Fast weapon switching 
- Flight/Space Sim:
    - Thottle Up/Down
    - Movement Up/Down
    - Yaw
    - Pitch
    - Roll


V0.22
- renamed to Free Snap Tap

V0.2: 
- Now special keys like ctrl, space, alt, win, numpad keys, F-keys usable in Tap Groups.
- Just use the string representation (found in py_file in vk_codes dict) or directly the vk-codes. Mixing of both in the same Tap Group possible.
- Added an icon! :-D (icons created by Vector Squad - Flaticon)

## How Free Snap Tap Works
Snap Tapping is a feature that enhances your keyboard's responsiveness by prioritizing the most recent key input when multiple keys are pressed simultaneously. Here’s how it operates:

1. **Intercepting Keyboard Input:** The program monitors the keys defined in the Tap Groupings. When you press any of these keys, the program intercepts the input.
2. **Suppressing Original Input:** Instead of allowing the original key press to be sent directly to your computer, the program suppresses it. This means the original input is not immediately processed by your system or application.
3. **Sending Idealized Input:** The program then determines the ideal input based on the most recent key press. For example, if you press "A" and then "D" without releasing "A", the program will prioritize "D". This idealized input is then sent to your system, ensuring that the most recent direction is registered.

### Example Scenario
Consider a gaming scenario where you are using the WASD keys for movement:

- **Without Snap Tapping:** Pressing "A" (left) and then "D" (right) simultaneously might cause your character to stop moving because the game receives conflicting inputs.
- **With Snap Tapping:** Pressing "A" (left) and then "D" (right) will result in the program sending only the "D" input, allowing your character to move right without interruption.

## Easy Usage

- Start via free_snap_tap.exe and a Command Window will open with further explanations. (Tap Groupings are active for a+d and w+s)
- If you want to configure the Tap Grouping you have to see "Installation to Edit Tap Groupings".
- Have fun. :-)

## Controls

- **Toggle Pause:** Press the DELETE key to pause or resume the program.
- **Stop Execution:** Press the END key to stop the program.

## Requirements

- Python 3.6 or higher
- `pynput` library

Install the `pynput` library using pip:

```bash
pip install pynput
```
## Installation to Edit Tap Groupings

1. **Install Python**: Ensure Python 3.6 or higher is installed on your system. You can download it from [python.org](https://www.python.org/).

2. **Install `pynput` Package**: Open your terminal or command prompt and run:
   ```bash
   pip install pynput
   ```
3. **Start the Program:** Run the snap.tap.bat file to start the Snap-Tap program:
   ```bash
   ./free_snap_tap.bat
   ```
   or
   ```bash
   python ./free_snap_tap.py
   ```
  or by directly clicking/executing the free_snap_tap.bat file.

## Configuration
Tap Groupings are a set of keys that are observed and the output of each group is seperately handled. Activtaion of a key is mutually explusive to all others - so there will always be only one activated key.

You can define Tap Groupings in the Python file under the # Tap Groups section. Add or remove lists with the keys as characters/strings or vk_code (overview of most found in .py file). 

### Example:

  ```python
# Tap Groups (input can be char/str and/or vk-codes (mixes possible) - see dicts directly above)
tap_groups = [
    ['w', 's'], 
    ['a', 'd'],  
    #['ctrl', 'space'], 
    #['q', 'e'],
    #['1', '2', '3', '4'],  
]
  ```

