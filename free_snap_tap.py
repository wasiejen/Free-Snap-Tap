'''
Free-Snap-Tap V1.1.3
last updated: 241015-1041
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

import overlay_lib
from overlay_lib import Vector2D, RgbaColor, SkDrawCircle, FlDrawCircle, DrawLine

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
            if self._fst.arg_manager.STATUS_INDICATOR or self._fst.arg_manager.TRAY_ICON:

                # only update if there is a change
                if (manual is not self._fst.arg_manager.MANUAL_PAUSED or 
                    win32 is not self._fst.arg_manager.WIN32_FILTER_PAUSED or
                    focus_name is not self._fst.focus_manager.FOCUS_APP_NAME):
                    manual = self._fst.arg_manager.MANUAL_PAUSED
                    win32 = self._fst.arg_manager.WIN32_FILTER_PAUSED
                    focus_name = self._fst.focus_manager.FOCUS_APP_NAME
                    
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
                if self.overlay.color != color:
                    #print("new color overlay: ", color)
                    self.overlay.update_color(color) 
                    # on first color update, hide the overlay console taskbar icon
                    if overlay_console_visible:
                        hide_overlay_console()
                        overlay_console_visible = False                 

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
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Overlay to next screen", lambda: overlay.set_next_screen(True)),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Toggle Pause", self.toggle_pause),
            pystray.MenuItem("Return to Menu", self.return_to_menu),
            pystray.Menu.SEPARATOR,
            # pystray.MenuItem('Show Console', lambda: set_console_visibility(True)),
            # pystray.MenuItem('Hide Console', lambda: set_console_visibility(False)),
            pystray.MenuItem("Toggle Console", self.toggle_console_on_left_click, default=True),
            #pystray.MenuItem("Display internal state", self.display_internal_state),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Exit Program", self.exit_program),
        )
        return menu
    
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
        
    def exit_program(self):
        self.end()
        if overlay is not None:
            overlay.exit_program()
        self._fst.control_exit_program("icon")
        self.tray_icon.stop()

    def display_internal_state(self):
        self._fst.display_internal_repr_groups()



class Status_Overlay_QT():

    def __init__(self, fst_keyboard):
        self._fst = fst_keyboard
        self.overlay_wrapper = overlay_lib.Overlay(
            drawlistCallback=self._draw_callback,
            refreshTimeout=1000  # ms
        )
        # Initial color (red, green, blue, alpha)
        self.color = "red"  # Semi-transparent red
        self.color_code = self._get_color_code(self.color)
        
        
        self.app = self.overlay_wrapper.app
        self.overlay = self.overlay_wrapper.overlay
        self.overlay.setWindowTitle("FST_Overlay")
        
        # move to different screen if available
        self.current_screen_index = 0        
        self.set_next_screen(True) # set the display screen to prime screen
    
    def set_next_screen(self, next:bool = True):
        self.move_screen = True
        self.overlay.setUpdatesEnabled(False)
        # return to origin point
        #self.overlay.move(0, 0)
        self.screens = self.app.screens()
        self.num_screens = len(self.screens)
        if next:
            self.current_screen_index = (self.current_screen_index + 1) % self.num_screens        
        self.screen = self.screens[self.current_screen_index]
        self.geometry = self.screen.geometry()
        self.width = self.screen.size().width()
        self.height = self.screen.size().height()
        self.center = [self.width // 2, self.height // 2]
        # move to new screen origin point
        print(f"Moving overlay to screen {self.current_screen_index} of {self.num_screens}: {self.geometry.left()}, {self.geometry.top()}")
        self.overlay.move(self.geometry.left(), self.geometry.top())
        self.move_screen = False
        self.overlay.setUpdatesEnabled(True)
        self.overlay.update()
        
    def _get_color_code(self, color, a=140):
        if color == "red":
            r, g, b = 255, 0, 0
        elif color == "green":
            r, g, b = 0, 255, 0 
        elif color == "blue":
            r, g, b = 0, 0, 255
        return [r, g, b, a]


    def update_color(self, color):
        self.color = color
        self.color_code = self._get_color_code(self.color)

    # def _draw_callback(self):
    #     # Draw a filled circle at (960, 540) with radius 80
    #     return [
    #         SkDrawCircle(
    #             Vector2D(self.width - 30, 30),
    #             30,
    #             RgbaColor(*self.color_code),
    #             20  # 0 for filled
    #         )
    #     ]
    
    def _draw_callback(self):
        drawings = []
        if not self.move_screen:
            if self._fst.arg_manager.STATUS_INDICATOR:
                drawings.append(self._draw_status_indicator())
            
            if self._fst.arg_manager.CROSSHAIR_ENABLED:
                # if crosshair is enabled, then draw it
                drawings = drawings + self._draw_crosshair()
        return drawings
        
    def _draw_status_indicator(self):
        size = self._fst.arg_manager.STATUS_INDICATOR_SIZE
        status_circle = FlDrawCircle(
            Vector2D(self.width - 20, 20),
            size,
            RgbaColor(*self.color_code),
            RgbaColor(*self.color_code),
            1  # 0 for filled
        )  
        return status_circle   
        
    def _draw_crosshair(self):
        
        dx = self._fst.arg_manager.CROSSHAIR_DELTA_X
        dy = self._fst.arg_manager.CROSSHAIR_DELTA_Y
        
        def complement_color(qimage):
            width, height = qimage.width(), qimage.height()
            r = g = b = 0
            for y in range(height):
                for x in range(width):
                    color = qimage.pixelColor(x, y)
                    r += color.red()
                    g += color.green()
                    b += color.blue()
            size = width * height
            return (255 - r // size, (255 -  g // size) // 3, 255 -  b // size)    
        
        # pixmap = self.screen.grabWindow(0, self.center[0] + dx - 2, self.center[1] + dy - 2, 4, 4)
        # qimage = pixmap.toImage()
        # compl_color = complement_color(qimage  
        
        # class DrawLine:
            # start_coord: Vector2D
            # end_coord: Vector2D
            # color: RgbaColor
            # thickness: int
        
        lines = [[[self.center[0] - 14 + dx, self.center[1] -  0 + dy], [self.center[0] -  7 + dx, self.center[1] -  0 +dy]],
                 [[self.center[0] + 14 + dx, self.center[1] +  0 + dy], [self.center[0] +  7 + dx, self.center[1] -  0 +dy]],
                 [[self.center[0] -  0 + dx, self.center[1] + 14 + dy], [self.center[0] -  0 + dx, self.center[1] +  8 +dy]],
                 [[self.center[0] -  2 + dx, self.center[1] -  0 + dy], [self.center[0] -  2 + dx, self.center[1] +  3 +dy]],
                 [[self.center[0] +  2 + dx, self.center[1] -  0 + dy], [self.center[0] +  2 + dx, self.center[1] +  3 +dy]],
                 [[self.center[0] +  2 + dx, self.center[1] +  3 + dy], [self.center[0] -  2 + dx, self.center[1] +  3 +dy]]
                ]
        crosshair_lines = [] 
        for points in lines:
            crosshair_lines.append(
            DrawLine(
                start_coord=Vector2D(points[0][0], points[0][1]),
                end_coord=Vector2D(points[1][0], points[1][1]),
                color=RgbaColor(255,0,255,255),  # purple color
                # color=RgbaColor(*compl_color, 255),  # purple color
                thickness=1
            ))
        return crosshair_lines
    
    def run(self):
        self.overlay_wrapper.spawn()
        
        
    def exit_program(self):
        # i need to close the internal overlay variable aka a class of MainWindow(QtWidgets.QMainWindow)
        self.overlay.close()
        # maybe even the internal self.app = QtWidgets.QApplication([])
        #self.overlay.app.quit()
         
         
# class Status_Overlay():
    
#     def __init__(self, root, fst_keyboard):
#         self.root = root
#         self._fst = fst_keyboard
#         self.crosshair_enabled = False
#         self.crosshair = None
#         self.stop = False
        
#         self.root.title("FST Status Indicator")
#         self.root.overrideredirect(True)  # Remove window decorations

#         self.color = None
#         # Get the screen width and height
#         self.screen_width = self.root.winfo_screenwidth()
#         self.screen_height = self.root.winfo_screenheight()
        
#         # Calculate the size and position of the window
#         user_size = self._fst.arg_manager.STATUS_INDICATOR_SIZE
#         padding = 20
#         dpadding = 2* padding
#         x_size = dpadding + user_size
#         if x_size < 100:
#             x_size = 100
#         y_size = dpadding + user_size
#         x_position = (self.screen_width) - x_size
#         y_position = 0
        
#         # Set the window geometry placement
#         self.root.geometry(f'{x_size}x{y_size}+{x_position}+{y_position}')
#         self.root.attributes("-alpha", 1)  # Set transparency level
#         self.root.wm_attributes("-topmost", 1)  # Keep the window on top
#         self.root.wm_attributes("-transparentcolor", "yellow")
        
#         # print(f"self._fst.arg_manager.STATUS_INDICATOR_SIZE: {self._fst.arg_manager.STATUS_INDICATOR_SIZE}")
#         # Create a canvas for the indicator
#         self.canvas = tk.Canvas(self.root, width=x_size, height=y_size, bg='yellow', highlightthickness=0)
#         self.canvas.pack()

#         # Draw the indicator
#         self.indicator = self.canvas.create_oval(x_size - padding - user_size, padding, x_size - padding, y_size - padding, fill="red")

#         # Bind mouse events to make the window draggable
#         self.root.bind("<ButtonPress-1>", self.on_start)
#         self.root.bind('<Double-1>', self.open_config_file) # left mouse button double click
#         self.root.bind('<Button-2>', self.open_config_file) # middle mouse button
#         self.root.bind("<B1-Motion>", self.on_drag)

#         # Create a right-click context menu
#         self.context_menu = tk.Menu(self.root, tearoff=0)
        
#         self.context_menu.add_command(label="Open config file", command=self.open_config_file)
#         self.context_menu.add_command(label="Reload from file", command=self.reload_from_file)
#         self.context_menu.add_separator()
#         self.context_menu.add_command(label="Toggle Pause", command=self.toggle_pause)
#         self.context_menu.add_command(label="Return to Menu", command=self.return_to_menu)
#         self.context_menu.add_command(label="Exit Program", command=self.exit_program)
#         self.context_menu.add_separator()
#         self.context_menu.add_command(label='Show Console', command = lambda: set_console_visibility(True))
#         self.context_menu.add_command(label='Hide Console', command = lambda: set_console_visibility(False))
#         #self.context_menu.add_command(label="Toggle Crosshair", command=self.toggle_crosshair)
#         self.context_menu.add_command(label="Display internal state", command=self.display_internal_state)
#         self.context_menu.add_separator()
#         self.context_menu.add_command(label="Close Indicator", command=self.close_window)
        
#         # Bind right-click to show the context menu
#         self.canvas.bind("<Button-3>", self.show_context_menu)

#     def toggle_pause(self):
#         self._fst.control_toggle_pause()

#     def return_to_menu(self):
#         self._fst.control_return_to_menu()

#     def end(self):
#         self.stop = True
        
#     def exit_program(self):
#         self.end()
#         self._fst.control_exit_program("overlay")
#         self.root.destroy()

#     def display_internal_state(self):
#         self._fst.display_internal_repr_groups()
        
#     def open_config_file(self, event = None):
#         self._fst.open_config_file()
        
#     def reload_from_file(self):
#         self._fst.reload_from_file()

#     def on_start(self, event):
#         # Record the starting position of the mouse
#         self._drag_data = {"x": event.x_root, "y": event.y_root}

#     def on_drag(self, event):
#         # Calculate the new position of the window
#         dx = event.x_root - self._drag_data["x"]
#         dy = event.y_root - self._drag_data["y"]
#         x = self.root.winfo_x() + dx
#         y = self.root.winfo_y() + dy

#         # Update the starting position of the mouse
#         self._drag_data["x"] = event.x_root
#         self._drag_data["y"] = event.y_root

#         # Move the window to the new position
#         self.root.geometry(f"+{x}+{y}")

#     def show_context_menu(self, event):
#         self.context_menu.tk_popup(event.x_root, event.y_root)

#     def run(self):
#         self.root.mainloop()
#         #self.update_indicator()
        
#     def update(self, color):
#         self.color = color
#         self.canvas.itemconfig(self.indicator, fill=color) 
        
#     def close_window(self):
#         self.end()
#         # Properly close the Tkinter window and stop the main loop
#         self.root.destroy()
  
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


set_console_visibility(False)  # Hide console window at startup

if __name__ == "__main__":    
    overlay = None
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
        # print("\nATTENTION: cmd window will now be hidden, can be shown again via tray icon menu\n")
        # sleep(3)
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
            try:            
                overlay = Status_Overlay_QT(fst_keyboard)
                updater.set_overlay(overlay)
                setting_up_complete = True
                overlay.run()

                
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

