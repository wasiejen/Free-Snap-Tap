'''
Free-Snap-Tap V1.1.6
last updated: 250723-1350
'''

from threading import Thread 
import sys 
from time import sleep 
#import tkinter as tk
import pystray
from PIL import Image, ImageDraw, ImageFont
import ctypes

from fst_keyboard import FST_Keyboard
from fst_manager import CONSTANTS
from overlay import StatusOverlay, CrosshairOverlay
from PyQt5.QtWidgets import QApplication

# import overlay_lib
# from overlay_lib import Vector2D, RgbaColor, SkDrawCircle, FlDrawCircle, DrawLine


# from PyQt5 import QtCore, QtGui
# from PyQt5.QtWidgets import QApplication, QWidget, QPushButton, QVBoxLayout, QLabel
# from PyQt5.QtGui import QPainter


# will not overwrite debug settings in config
CONSTANTS.DEBUG = False
# CONSTANTS.DEBUG = True
CONSTANTS.DEBUG2 = False
# CONSTANTS.DEBUG2 = True
CONSTANTS.DEBUG3 = False
# CONSTANTS.DEBUG3 = True

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
 
setting_up_complete = False
console_visible = True
overlay_console_visible = True
app = None
overlay = None

class Updater:
    
    def __init__(self, fst_keyboard):
        self._fst = fst_keyboard
        self.icon = None
        self.overlay = None
        self.stop = False
    
    def set_icon(self, element):
        self.icon = element
        
    def set_overlay(self, element):
        self.overlay = element
        
    def end(self):
        self.stop = True
        
    def run(self):
        self.update()
        
    def update2(self):
        while not self.stop:
            if self.icon is not None:
                self.icon.update_indicator()
            if self.overlay is not None:
                self.overlay.update_indicator()   
            sleep(1)
        
    def update(self):
        manual = self._fst.arg_manager.MANUAL_PAUSED
        win32 = self._fst.arg_manager.WIN32_FILTER_PAUSED
        focus_name = self._fst.focus_manager.FOCUS_APP_NAME
        crosshair = self._fst.arg_manager.CROSSHAIR_ENABLED
        status = self._fst.arg_manager.STATUS_INDICATOR
        
        global overlay_console_visible
        
        if self._fst.arg_manager.ALWAYS_ACTIVE:
            color = "blue"
        else:
            color =  "red"
        
        # wait for tray icon and overlay to be set up
        while not setting_up_complete:
            sleep(0.5)
        sleep(0.5)
        
        while not self.stop:
            if status != self._fst.arg_manager.STATUS_INDICATOR:
                status = self._fst.arg_manager.STATUS_INDICATOR
                if self.overlay is not None:
                    if status:
                        self.overlay.show_indicator()
                    else:
                        self.overlay.hide_indicator()
            
            if self._fst.arg_manager.STATUS_INDICATOR or self._fst.arg_manager.TRAY_ICON:

                # only update if there is a change
                if (manual is not self._fst.arg_manager.MANUAL_PAUSED or 
                    win32 is not self._fst.arg_manager.WIN32_FILTER_PAUSED or
                    focus_name is not self._fst.focus_manager.FOCUS_APP_NAME or
                    crosshair is not self._fst.arg_manager.CROSSHAIR_ENABLED):
                    manual = self._fst.arg_manager.MANUAL_PAUSED
                    win32 = self._fst.arg_manager.WIN32_FILTER_PAUSED
                    focus_name = self._fst.focus_manager.FOCUS_APP_NAME
                    crosshair = self._fst.arg_manager.CROSSHAIR_ENABLED

                    if self._fst.arg_manager.MANUAL_PAUSED or self._fst.arg_manager.WIN32_FILTER_PAUSED:
                        color = "red"
                    else:
                        if self._fst.arg_manager.ALWAYS_ACTIVE and focus_name == '':
                            color = "blue"
                        else:   
                            color = "green"
                    
                    if self.icon is not None:
                        if self.icon.color != color:
                            #print("new color icon: ", color)
                            self.icon.update(color)

                    if self.overlay is not None:
                        if self.overlay.color_name != color:
                            #print("new color overlay: ", color)
                            self.overlay.update_color(color) 
                            # on first color update, hide the overlay console taskbar icon
                            if overlay_console_visible:
                                hide_overlay_console()
                                overlay_console_visible = False    

                        if self._fst.arg_manager.CROSSHAIR_ENABLED:
                            self.overlay.display_crosshair()
                            #print("crosshair displayed")
                        else:
                            self.overlay.remove_crosshair()
                            #print("crosshair removed")

            sleep(0.5)

class Tray_Icon:
    
    def __init__(self, fst_keyboard):
        self._fst = fst_keyboard
        self.stop = False
        self.color = None
        self.images = {}
        self.fill_images() # Initial image creation
        self.tray_icon = pystray.Icon("FST Status", self.images["red"], menu=self.create_menu())
        self.update_thread = None
        self.overlay = None
        

    def fill_images(self):
        max = 64  #icon size is 64x64
        border = 2
        size = max - 2 * border
        both_borders = border * 2
        font_size = size/2+6
        font = ImageFont.truetype("arial.ttf", font_size )
        for color in ["red", "green", "blue"]:
            image = Image.new('RGBA', (size+both_borders, size+both_borders), (0, 0, 0, 0)) #transparent background
            draw = ImageDraw.Draw(image)
            draw.ellipse((0 + border, 0 + border, size + border, size + border), fill=color)
            draw.text((border-1, (max - font_size)/2), "FST", font=font, fill="white")
            self.images[color] = image

    def create_menu(self):
        menu = (
            pystray.MenuItem("Open config file", self.open_config_file),
            pystray.MenuItem("Reload from file", self.reload_from_file),
            # pystray.Menu.SEPARATOR,
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Toggle Pause", self.toggle_pause),
            pystray.MenuItem("Return to Menu", self.return_to_menu),
            pystray.Menu.SEPARATOR,
            # pystray.MenuItem('Show Console', lambda: set_console_visibility(True), visible= not console_visible),
            # pystray.MenuItem('Hide Console', lambda: set_console_visibility(False), visible=console_visible),
            pystray.MenuItem("Toggle Indicator", self.toggle_status_indicator, visible=self._fst.arg_manager.STATUS_INDICATOR),
            pystray.Menu.SEPARATOR,

            pystray.MenuItem("Toggle Console", self.toggle_console_on_left_click, default=True),
            # pystray.MenuItem("Hide Indicator", overlay.hide_indicator, visible=self._fst.arg_manager.STATUS_INDICATOR),
            #pystray.MenuItem("Display internal state", self.display_internal_state),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Exit Program", self.exit_program),
        )
        return menu
    
    def toggle_status_indicator(self):
        """Toggle the status indicator visibility."""
        if self._fst.arg_manager.STATUS_INDICATOR:
            self._fst.arg_manager.STATUS_INDICATOR = False
            # overlay.hide_indicator()
        else:
            self._fst.arg_manager.STATUS_INDICATOR = True
            # overlay.show_indicator()
            
    def toggle_console_on_left_click(self):
        switch_console_visibility()
        
    def update(self, color):
        self.color = color
        self.tray_icon.icon = self.images[color] # Update the icon 
        
    def start_icon(self):
        try:
            self.tray_icon.run()
        except AttributeError as err:
            print(err)

    def open_config_file(self):
        self._fst.open_config_file()

    def reload_from_file(self):
        self._fst.reload_from_file()

    def toggle_pause(self):
        self._fst.control_toggle_pause()

    def return_to_menu(self):
        self._fst.control_return_to_menu()

    def end(self):
        self.stop = True
        
    def add_overlay(self, overlay): 
        """Add the overlay to the tray icon."""
        self.overlay = overlay

    def exit_program(self):
        self.end()
        if self.overlay is not None:
            self.overlay.exit_program()
        self._fst.control_exit_program("icon")
        self.tray_icon.stop()

    def display_internal_state(self):
        self._fst.display_internal_repr_groups()


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

    sys.exit(1)

# 250430-1306 old control function

# # Console window control functions - to hide and unhide cmd window
# user32 = ctypes.WinDLL('user32', use_last_error=True)
# SW_HIDE, SW_SHOW = 0, 5  

# def get_console_window():
#     return ctypes.windll.kernel32.GetConsoleWindow()

# def toggle_console(show: bool):
#     if hwnd := get_console_window():
#         user32.ShowWindow(hwnd, SW_SHOW if show else SW_HIDE)

# >>> 250430-1251 
# Console window control functions - to hide and unhide cmd window

# Window style constants
user32 = ctypes.WinDLL('user32', use_last_error=True)
kernel32 = ctypes.WinDLL('kernel32', use_last_error=True)
SW_HIDE, SW_SHOW = 0, 5
GWL_EXSTYLE = -20
WS_EX_TOOLWINDOW = 0x00000080
WS_EX_APPWINDOW = 0x00040000

# Store original state at module load
_hwnd = kernel32.GetConsoleWindow()
_original_style = user32.GetWindowLongPtrW(_hwnd, GWL_EXSTYLE) if _hwnd else None

def switch_console_visibility():
    global console_visible
    if console_visible:
        set_console_visibility(False)
    else:
        set_console_visibility(True)

# Function to toggle console visibility
def set_console_visibility(show: bool):
    if not (hwnd := kernel32.GetConsoleWindow()):
        return

    global console_visible
    
    if show:  # Restore original configuration
        user32.ShowWindow(hwnd, SW_SHOW)
        console_visible = True
    else:     # Apply Win11-compatible hide
        user32.ShowWindow(hwnd, SW_HIDE)
        console_visible = False

# hide the console window of the overlay from the taskbar
def hide_overlay_console():
    
    def get_window_by_title(title):
        # Set the return type and argument types for FindWindowW
        user32.FindWindowW.restype = ctypes.wintypes.HWND
        user32.FindWindowW.argtypes = [ctypes.wintypes.LPCWSTR, ctypes.wintypes.LPCWSTR]
        # Pass None for class name to match any window class
        hwnd = user32.FindWindowW(None, title)
        return hwnd

    hwnd = get_window_by_title("FST_Overlay")

    # Initialize style tracking on first use
    style = user32.GetWindowLongPtrW(hwnd, GWL_EXSTYLE)
   # Apply Win11-compatible hide
    new_style = (style & ~WS_EX_APPWINDOW) | WS_EX_TOOLWINDOW
    user32.SetWindowLongPtrW(hwnd, GWL_EXSTYLE, new_style)



if __name__ == "__main__":    
    set_console_visibility(False)  # Hide console window at startup

    
    fst_keyboard = FST_Keyboard()
    fst_keyboard.set_sys_start_arguments(sys.argv[1:] if len(sys.argv) > 1 else [])
    fst_keyboard.update_args_and_groups()
    
    # waiting for the rest of the program to finish loading 
    sleep(0.5)
    
    updater = Updater(fst_keyboard)
    update_thread = Thread(target=updater.update)
    update_thread.daemon = True  # Daemonize thread
    update_thread.start()
    
    # hide command window at start but inform user before
    if fst_keyboard.arg_manager.CMD_WINDOW_HIDDEN:
        #print("\nATTENTION: cmd window will now be hidden, can be shown again via tray icon menu\n")
        #sleep(3)
        # toggle_console(False)
        pass
    else:
        set_console_visibility(True)
    
    if fst_keyboard.arg_manager.TRAY_ICON or fst_keyboard.arg_manager.STATUS_INDICATOR:
        if fst_keyboard.arg_manager.TRAY_ICON:
            try:
                trayicon = Tray_Icon(fst_keyboard)
                trayicon_thread = Thread(target=trayicon.tray_icon.run)
                trayicon_thread.daemon = True  # Daemonize thread
                trayicon_thread.start()
                updater.set_icon(trayicon)
            except RuntimeError:
                pass
          
        # start QT overlay
        if fst_keyboard.arg_manager.STATUS_INDICATOR:    
            main_thread = Thread(target=main)
            main_thread.daemon = True
            main_thread.start()   
            setting_up_complete = True
            try:    
                app = QApplication([])
                overlay = StatusOverlay(fst_keyboard)
                updater.set_overlay(overlay)
                trayicon.add_overlay(overlay)
                app.exec_()
                
            except RuntimeError:
                pass        
                    
        else:
            try:
                if not trayicon_thread.is_alive():
                    updater.end()   
            except NameError:
                pass
            setting_up_complete = True
            main()
    else:
        updater.end()
        setting_up_complete = True
        main()
        
    try:
        if not update_thread.is_alive():
            updater.end()       
    except NameError: 
        pass
    try:
        if not trayicon_thread.is_alive():
            trayicon.end()        
    except NameError: 
        pass

    sys.exit(1)

