# Snap-Tap: Universal Keyboard Snap Tapping Program

A Python-based Snap Tapping program compatible with all keyboards, providing enhanced input prioritization for smoother gaming and typing experiences.
Snap Tapping ensures that the most recent key input is prioritized, even if an opposing key is still pressed. This feature is particularly useful in gaming scenarios where precise control is crucial.

## How Snap Tapping Works
Snap Tapping is a feature that enhances your keyboard's responsiveness by prioritizing the most recent key input when multiple keys are pressed simultaneously. Here’s how it operates:

1. **Intercepting Keyboard Input:** The program monitors the keys defined in the Tap Groupings. When you press any of these keys, the program intercepts the input.
2. **Suppressing Original Input:** Instead of allowing the original key press to be sent directly to your computer, the program suppresses it. This means the original input is not immediately processed by your system or application.
3. **Sending Idealized Input:** The program then determines the ideal input based on the most recent key press. For example, if you press "A" and then "D" without releasing "A", the program will prioritize "D". This idealized input is then sent to your system, ensuring that the most recent direction is registered.

### Example Scenario
Consider a gaming scenario where you are using the WASD keys for movement:

- **Without Snap Tapping:** Pressing "A" (left) and then "D" (right) simultaneously might cause your character to stop moving because the game receives conflicting inputs.
- **With Snap Tapping:** Pressing "A" (left) and then "D" (right) will result in the program sending only the "D" input, allowing your character to move right without interruption.

## Requirements

- Python 3.6 or higher
- `pynput` library

Install the `pynput` library using pip:

```bash
pip install pynput
```

## Installation and Usage

1. **Install Python**: Ensure Python 3.6 or higher is installed on your system. You can download it from [python.org](https://www.python.org/).

2. **Install `pynput` Package**: Open your terminal or command prompt and run:
   ```bash
   pip install pynput
   ```
3. **Start the Program:** Run the snap.tap.bat file to start the Snap-Tap program:
   ```bash
   ./snap-tap.bat
   ```
  or by directly clicking/executing the snap-tap.bat file.

## Configuration
You can define Tap Groupings in the Python file under the # Tap Groups section. Add or remove lists with the keys as characters. 
Tap Groupings are a set of keys that are observed and the output of each group is seperately handled.

### Example:

  ```python
# Tap Groups
tap_groups = [
    ['w', 's'], # WASD keys for movement
    ['a', 'd'],  
    #['q', 'e'],
    #['1', '2', '3', '4'],  
]
  ```

## Controls

- **Toggle Pause:** Press the DELETE key to pause or resume the program.
- **Stop Execution:** Press the END key to stop the program.
