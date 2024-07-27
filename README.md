# Snap-Tap: Universal Keyboard Snap Tapping Program

A Python-based Snap Tapping program compatible with all keyboards, providing enhanced input prioritization for smoother gaming and typing experiences.
Snap Tapping ensures that the most recent key input is prioritized, even if an opposing key is still pressed. This feature is particularly useful in gaming scenarios where precise control is crucial.

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

**Example:**

  ```python
  # Tap Groups
  tap_groups = [
      ['w', 's'], # WASD keys for movement
      ['a', 'd'],  
      ['up', 'down'], # Arrow keys for movement
      ['left', 'right']  
  ]
  ```

## Controls

- **Toggle Pause:** Press the DELETE key to pause or resume the program.
- **Stop Execution:** Press the END key to stop the program.
