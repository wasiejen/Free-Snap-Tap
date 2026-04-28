'''
Free-Snap-Tap V1.2.0
last updated: 250724-1435
'''

import asyncio
from threading import Thread 
import sys 
from time import sleep
import datetime

from fst_keyboard import FST_Keyboard
from fst_manager import CONSTANTS
from fst_overlay import GUI_Manager, set_console_visibility, ToastBridge
from PySide6.QtWidgets import QApplication


import logging
# Use __name__ to automatically label logs with the filename
logging.basicConfig(
    filename='fst.log', 
    filemode='a', # 'a' for append (default), 'w' to overwrite each time
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.DEBUG # Capture everything from DEBUG level and up
)
logger = logging.getLogger(__name__)

# will not overwrite debug settings in config
CONSTANTS.DEBUG = False
# CONSTANTS.DEBUG = True
CONSTANTS.DEBUG2 = False
# CONSTANTS.DEBUG2 = True
CONSTANTS.DEBUG3 = False
# CONSTANTS.DEBUG3 = True
CONSTANTS.DEBUG4 = False
# CONSTANTS.DEBUG4 = True

# debug options on numpad numbers - if you use them do not turn on
CONSTANTS.DEBUG_NUMPAD = False
# CONSTANTS.DEBUG_NUMPAD = True


# Compilation mode, support OS-specific options
# nuitka-project: --standalone
# nuitka-project: --onefile
# link time optimization
# nuitka-project: --lto=yes

# The PySide6 plugin covers qt-plugins
# nuitka-project: --enable-plugin=pyside6
# nuitka-project: --include-qt-plugins=platforms
# nuitka-project: --noinclude-qt-plugins=iconengines
# nuitka-project: --noinclude-qt-plugins=imageformats
# nuitka-project: --noinclude-qt-plugins=mediaservice
# nuitka-project: --noinclude-qt-plugins=platformthemes
# nuitka-project: --noinclude-qt-plugins=printsupport
# nuitka-project: --noinclude-qt-plugins=styles
# nuitka-project: --windows-icon-from-ico="{MAIN_DIRECTORY}/icons/keyboard.ico"
# nuitka-project: --output-filename=free_snap_tap_nuitka.exe

# python -m nuitka --standalone --onefile --enable-plugin=pyqt5  --include-qt-plugins=platforms --windows-icon-from-ico=./icons/keyboard.ico free_snap_tap.py --output-filename=free_snap_tap_nuitka.exe

CURRENT_DATE_TIME = datetime.datetime.now().strftime("%y%m%d-%H%M")

# Define File name for saving of everything, can be any filetype
# But .txt or .cfg recommended for easier editing
CONSTANTS.FILE_NAME = 'FSTconfig.txt'
# CONSTANTS.FILE_NAME = 'FSTconfig_test.txt'

# Control key combinations (vk_code and/or key_string) 
# (1,2 or more keys possible - depends on rollover of your keyboard)
CONSTANTS.EXIT_Combination = ["alt", "end"]
CONSTANTS.TOGGLE_ON_OFF_Combination = ["alt", "delete"]
CONSTANTS.MENU_Combination = ["alt", "page_down"]  
 
app = None

class MainLogic:
    def __init__(self, fst_keyboard):
        self.fst_keyboard = fst_keyboard
        self.loop = None

    def on_press(self, key):
        """Handle key press events."""

    # 1. Define the thread's target
    def start_async_thread(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        # We run the logic inside the loop
        self.loop.create_task(self.run())
        try:
            self.loop.run_forever()
        finally:
            self.cleanup
        
    def cleanup(self):
        """Clean up resources on shutdown."""
        print("Cleaning up resources...")
        self.fst_keyboard.stop_listener()
        #self.fst_keyboard.focus_manager.stop_focus_thread()
        self.fst_keyboard.cli_menu.flush_the_input_buffer()
        self.loop.close()
        print("Secondary thread fully exited.")

        
    async def run(self):    
            
        if CONSTANTS.DEBUG:
            print(f"D1: tap_groups_hr: {self.fst_keyboard.config_manager.tap_groups_hr}")
            print(f"D1: tap_groups: {self.fst_keyboard._tap_groups}")

        focus_active = self.fst_keyboard.focus_manager.init_focus_task()

        while not self.fst_keyboard.arg_manager.STOPPED:    

            self.fst_keyboard.set_loop(self.loop)
            self.fst_keyboard.init_listener()
            
            if self.fst_keyboard.arg_manager.MENU_ENABLED:
                self.fst_keyboard.focus_manager.pause_focus_task()
                self.fst_keyboard.cli_menu.display_menu()
            else:
                self.fst_keyboard.config_manager.display_groups()
            
            if focus_active:
                self.fst_keyboard.focus_manager.restart_focus_task()
            
            # start keyboard and mouse listener
            self.fst_keyboard.start_listener()
            
            # if no focus app is given in config file, then start default as always active
            if not focus_active:
                self.fst_keyboard.update_args_and_groups()
                self.fst_keyboard.cli_menu.update_group_display()
                self.fst_keyboard.arg_manager.WIN32_FILTER_PAUSED = False
            
            print('--- Free Snap Tap started ---')
            
            if focus_active:
                self.fst_keyboard.cli_menu.display_focus_names()
            self.fst_keyboard.focus_manager.start_focus_task()

            # Keep the loop alive indefinitely
            while True:
                await asyncio.sleep(3600)


if __name__ == "__main__":  
    
    set_console_visibility(False)  # Hide console window at startup
    
    fst_keyboard = FST_Keyboard()
    fst_keyboard.set_sys_start_arguments(sys.argv[1:] if len(sys.argv) > 1 else [])
    fst_keyboard.update_args_and_groups()
    
    logic = MainLogic(fst_keyboard)
    
    # waiting for the rest of the program to finish loading 
    sleep(0.5)
    
    # hide command window at start but inform user before
    if fst_keyboard.arg_manager.CMD_WINDOW_HIDDEN:
        #print("\nATTENTION: cmd window will now be hidden, can be shown again via tray icon menu\n")
        #sleep(3)
        # toggle_console(False)
        pass
    else:
        set_console_visibility(True)
    
    if fst_keyboard.arg_manager.TRAY_ICON or fst_keyboard.arg_manager.STATUS_INDICATOR:
        logging.info("Starting in GUI mode with tray icon or status indicator enabled.")
        # GUI MODE: Start logic in a secondary thread        
        # Spawn and start the thread
        logic_thread = Thread(target=logic.start_async_thread, daemon=True)
        logic_thread.start()

        app = QApplication([])
        gui_manager = GUI_Manager(fst_keyboard, app)
        
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

        if fst_keyboard.arg_manager.TRAY_ICON:
            gui_manager.tray_icon.show()
          
        # start QT overlay
        if fst_keyboard.arg_manager.STATUS_INDICATOR:    
            gui_manager.overlay.show()      
                    
        # gui_manager.start_update_timer()  # Start the periodic update timer
        gui_manager.start()  # Start the Qt event loop
    else:
        # if no tray icon or status indicator, just run the main function
        # HEADLESS MODE: Run logic in the current (__main__) thread
        logging.info("Starting in headless mode with no tray icon or status indicator.")
        try:
            asyncio.run(logic.run())
        except KeyboardInterrupt:
            logging.info("Keyboard interrupt received.")
        
    sys.exit(1)  # Exit the script after main function completes