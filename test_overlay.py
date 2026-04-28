import sys
import threading
import time
from PySide6.QtWidgets import QApplication

# Import your actual classes from your existing file
from fst_overlay import GUI_Manager, ToastBridge

# 1. Setup Mock Logic
class DummyFST:
    def __init__(self):
        self.arg_manager = type('obj', (object,), {
            'STATUS_INDICATOR_SIZE': 10, 
            'CROSSHAIR_ENABLED': False, 
            'STATUS_INDICATOR': True, 
            'TRAY_ICON': True,        # Ensure this exists
            'ALWAYS_ACTIVE': False, 
            'MANUAL_PAUSED': False, 
            'WIN32_FILTER_PAUSED': False
        })
        self.focus_manager = type('obj', (object,), {'FOCUS_APP_NAME': ''})
        self.toast_callback = None # The entry point for the bridge

    def run_background_tasks(self):
        """Simulates logic running in a nested thread."""
        def task():
            time.sleep(1)
            if self.toast_callback:
                # Thread-safe call via the bridge
                self.toast_callback("Thread: Task 1 Done ... 6s", 6, 14, "green", "white")
            time.sleep(2)
            if self.toast_callback:
                self.toast_callback("Thread: Finalizing ... 15s", 15, 14, "blue", "white")
            time.sleep(2)
            self.timer_callback("Timer ... 15s", 15, 14, "orange", "white")
            time.sleep(2)
            self.timer_callback("Timer 20s", 20, 14, "orange", "white")
            time.sleep(3)
            self.remove_callback("Timer ... 15s")
            time.sleep(4)
            self.remove_all_callback()
            time.sleep(2)
            self.timer_callback("Timer ... 3s", 3, 14, "green", "white")
            
        threading.Thread(target=task, daemon=True).start()

# 2. Main Test Execution
if __name__ == "__main__":
    app = QApplication(sys.argv)
    
    # Initialize the real components
    fst_keyboard = DummyFST()
    gui_manager = GUI_Manager(fst_keyboard, app)
    
    # Setup the Bridge (The thread-safe glue)
    bridge = ToastBridge()
        # Connect bridge signals to GUI manager slots
    bridge.signal_show_toast.connect(gui_manager.toast_manager.add_toast)
    bridge.signal_show_timer.connect(gui_manager.toast_manager.add_timer)
    bridge.signal_remove_toast.connect(gui_manager.toast_manager.remove_toast)
    bridge.signal_remove_all_toasts.connect(gui_manager.toast_manager.remove_all_toasts)
    # Inject the bridge methods into the keyboard logic for thread-safe calls
    fst_keyboard.toast_callback = bridge.trigger_toast
    fst_keyboard.timer_callback = bridge.trigger_timer
    fst_keyboard.remove_callback = bridge.trigger_remove
    fst_keyboard.remove_all_callback = bridge.trigger_remove_all

    # Start the simulated thread
    fst_keyboard.run_background_tasks()

    # Start the Qt Event Loop
    gui_manager.start()
    time.sleep(30)  # Keep the main thread alive long enough to see the toasts  