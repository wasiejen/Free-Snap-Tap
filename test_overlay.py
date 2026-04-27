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
            'STATUS_INDICATOR_SIZE': 10, 'CROSSHAIR_ENABLED': False, 
            'STATUS_INDICATOR': True, 'TRAY_ICON': True, 
            'ALWAYS_ACTIVE': False, 'MANUAL_PAUSED': False, 
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
                self.toast_callback("Thread: Task 1 Done", 3000, 12, "green", "white")
            time.sleep(2)
            if self.toast_callback:
                self.toast_callback("Thread: Finalizing...", 2000, 10, "blue", "white")

        threading.Thread(target=task, daemon=True).start()

# 2. Main Test Execution
if __name__ == "__main__":
    app = QApplication(sys.argv)
    
    # Initialize the real components
    fst_logic = DummyFST()
    gui_manager = GUI_Manager(fst_logic, app)
    
    # Setup the Bridge (The thread-safe glue)
    bridge = ToastBridge()
    bridge.signal_show_toast.connect(gui_manager.toast_manager.add_toast)
    
    # Inject the bridge into the dummy logic
    fst_logic.toast_callback = bridge.trigger_toast

    # Start the simulated thread
    fst_logic.run_background_tasks()

    # Start the Qt Event Loop
    gui_manager.start()
    time.sleep(12)  # Keep the main thread alive long enough to see the toasts  