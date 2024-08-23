from pynput import keyboard
from threading import Thread, Lock
import time

# Global variables
shared_data = {'count': 0}
data_lock = Lock()

controller = keyboard.Controller()

# Define the macro as a series of key presses and releases
def play_macro(message, delay):

    # Use the passed message and delay
    for key in message:
        controller.press(key)
        controller.release(key)
        time.sleep(delay)  # Delay between key presses
    
    # Safely modify the shared data
    with data_lock:
        shared_data['count'] += 1
        print(f"Macro executed. Count is now {shared_data['count']}")

# Function to handle key press events
def on_press(key):
    try:
        # Check if the key is the one you want to trigger the macro
        if key.char == 'm':  # Replace 'm' with your desired trigger key
            # Start the macro in a separate thread
            macro_thread = Thread(target=play_macro, args=("Hello", 0.1))
            macro_thread.start()
    except AttributeError:
        pass  # Handle special keys like shift, ctrl, etc.

# Set up the listener
def main():
    with keyboard.Listener(on_press=on_press) as listener:
        listener.join()

if __name__ == "__main__":
    main()
