'''
Free-Snap-Tap V1.2.0
last updated: 250724-1435
'''

from threading import Thread 
import sys 
from time import sleep

from fst_keyboard import FST_Keyboard
from fst_manager import CONSTANTS
from overlay import GUI_Manager, set_console_visibility
from PySide6.QtWidgets import QApplication
import datetime

CURRENT_DATE_TIME = datetime.datetime.now().strftime("%y%m%d-%H%M")

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

def main():    
          
    if CONSTANTS.DEBUG:
        print(f"D1: tap_groups_hr: {fst_keyboard.config_manager.tap_groups_hr}")
        print(f"D1: tap_groups: {fst_keyboard._tap_groups}")

    focus_active = fst_keyboard.focus_manager.init_focus_thread()

    while not fst_keyboard.arg_manager.STOPPED:    

        fst_keyboard.init_listener()
        
        if fst_keyboard.arg_manager.MENU_ENABLED:
            fst_keyboard.focus_manager.pause_focus_thread()
            fst_keyboard.cli_menu.display_menu()
        else:
            fst_keyboard.config_manager.display_groups()
        
        if focus_active:
            fst_keyboard.focus_manager.restart_focus_thread()
        
        # start keyboard and mouse listener
        fst_keyboard.start_listener()
        
        # if no focus app is given in config file, then start default as always active
        if not focus_active:
            fst_keyboard.update_args_and_groups()
            fst_keyboard.cli_menu.update_group_display()
            fst_keyboard.arg_manager.WIN32_FILTER_PAUSED = False
        
        print('--- Free Snap Tap started ---')
        
        if focus_active:
            fst_keyboard.cli_menu.display_focus_names()
        fst_keyboard.focus_manager.start_focus_thread()

        # wait for listener to finish on internal stop
        fst_keyboard.join_listener()

        fst_keyboard.stop_listener()
            
    fst_keyboard.focus_manager.stop_focus_thread()
    
    fst_keyboard.cli_menu.flush_the_input_buffer()


if __name__ == "__main__":    
    
    set_console_visibility(False)  # Hide console window at startup
    
    fst_keyboard = FST_Keyboard()
    fst_keyboard.set_sys_start_arguments(sys.argv[1:] if len(sys.argv) > 1 else [])
    fst_keyboard.update_args_and_groups()
    
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
        main_thread = Thread(target=main)
        main_thread.daemon = True  # Daemonize thread
        main_thread.start()
        app = QApplication([])
        gui_manager = GUI_Manager(fst_keyboard, app=app)

        if fst_keyboard.arg_manager.TRAY_ICON:
            gui_manager.tray_icon.show()
          
        # start QT overlay
        if fst_keyboard.arg_manager.STATUS_INDICATOR:    
            gui_manager.overlay.show()      
                    
        # gui_manager.start_update_timer()  # Start the periodic update timer
        gui_manager.start()  # Start the Qt event loop
    else:
        # if no tray icon or status indicator, just run the main function
        main()
        
    sys.exit(1)  # Exit the script after main function completes