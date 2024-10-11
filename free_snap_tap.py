'''
Free-Snap-Tap V1.1
last updated: 241010-0144
'''

from threading import Thread 
from os import startfile 
import sys 
from time import sleep 
import tkinter as tk

from fst_keyboard import FST_Keyboard
from fst_manager import CONSTANTS



# will not overwrite debug settings in config
CONSTANTS.DEBUG = False
# CONSTANTS.DEBUG = True
CONSTANTS.DEBUG2 = False
# CONSTANTS.DEBUG2 = True
CONSTANTS.DEBUG3 = False
# CONSTANTS.DEBUG3 = True

# debug options on numpad numbers - if you use them do not turn on
# CONSTANTS.DEBUG_NUMPAD = False
CONSTANTS.DEBUG_NUMPAD = True

# Define File name for saving of everything, can be any filetype
# But .txt or .cfg recommended for easier editing
# CONSTANTS.FILE_NAME = 'FSTconfig.txt'
# CONSTANTS.FILE_NAME = 'FSTconfig_test.txt'
CONSTANTS.FILE_NAME = 'allinone.txt'

# Control key combinations (vk_code and/or key_string) 
# (1,2 or more keys possible - depends on rollover of your keyboard)
CONSTANTS.EXIT_Combination = ["alt", "end"]
CONSTANTS.TOGGLE_ON_OFF_Combination = ["alt", "delete"]
CONSTANTS.MENU_Combination = ["alt", "page_down"]  
 
 
class Status_Indicator():
    
    def __init__(self, root, fst_keyboard):
        self.root = root
        self._fst = fst_keyboard
        self.root.title("FST Status Indicator")
        self.root.overrideredirect(True)  # Remove window decorations
        
        # Get the screen width and height
        self.screen_width = self.root.winfo_screenwidth()
        self.screen_height = self.root.winfo_screenheight()
        
        # Calculate the position to center the window
        self.x_position = (self.screen_width) - 60
        self.y_position = 0
        
        # Set the window geometry to 2x2 pixels centered on the screen
        self.root.geometry(f'100x100+{self.x_position}+{self.y_position}')
        self.root.attributes("-alpha", 0.5)  # Set transparency level
        self.root.wm_attributes("-topmost", 1)  # Keep the window on top
        self.root.wm_attributes("-transparentcolor", "yellow")
        
        # print(f"self._fst.arg_manager.STATUS_INDICATOR_SIZE: {self._fst.arg_manager.STATUS_INDICATOR_SIZE}")
        # Create a canvas for the indicator
        self.canvas = tk.Canvas(self.root, width=100+self._fst.arg_manager.STATUS_INDICATOR_SIZE, height=100+self._fst.arg_manager.STATUS_INDICATOR_SIZE, bg='yellow', highlightthickness=0)
        self.canvas.pack()

        # Draw the indicator
        self.indicator = self.canvas.create_oval(20, 20, 20+self._fst.arg_manager.STATUS_INDICATOR_SIZE, 20+self._fst.arg_manager.STATUS_INDICATOR_SIZE, fill="green")

        # Bind mouse events to make the window draggable
        self.root.bind("<ButtonPress-1>", self.on_start)
        self.root.bind('<Double-1>', self.open_config_file) # left mouse button double click
        self.root.bind('<Button-2>', self.open_config_file) # middle mouse button
        self.root.bind("<B1-Motion>", self.on_drag)

        # Create a right-click context menu
        self.context_menu = tk.Menu(self.root, tearoff=0)
        
        self.context_menu.add_command(label="Open config file", command=self.open_config_file)
        self.context_menu.add_command(label="Reload from file", command=self.reload_from_file)
        self.context_menu.add_separator()
        self.context_menu.add_command(label="Toggle Pause", command=self._fst.control_toggle_pause)
        self.context_menu.add_command(label="Return to Menu", command=self._fst.control_return_to_menu)
        self.context_menu.add_command(label="Exit Program", command=self._fst.control_exit_program)
        self.context_menu.add_separator()
        self.context_menu.add_command(label="Close Indicator", command=self.close_window)
        self.context_menu.add_command(label="Toggle Crosshair", command=self.toggle_crosshair)
        
        # Bind right-click to show the context menu
        self.canvas.bind("<Button-3>", self.show_context_menu)
        
        self.crosshair_enabled = False
        self.crosshair = None
        
        self.stop = False
        

    def open_config_file(self, event = None):
        startfile(self._fst.config_manager.file_name)
        
    def reload_from_file(self):
        self._fst.update_args_and_groups(self._fst.focus_manager.FOCUS_APP_NAME)
        self._fst.cli_menu.update_group_display()
        print(f'\n>>> file reloaded for focus app: {self._fst.focus_manager.FOCUS_APP_NAME}\n')
        


    def on_start(self, event):
        # Record the starting position of the mouse
        self._drag_data = {"x": event.x_root, "y": event.y_root}

    def on_drag(self, event):
        # Calculate the new position of the window
        dx = event.x_root - self._drag_data["x"]
        dy = event.y_root - self._drag_data["y"]
        x = self.root.winfo_x() + dx
        y = self.root.winfo_y() + dy

        # Update the starting position of the mouse
        self._drag_data["x"] = event.x_root
        self._drag_data["y"] = event.y_root

        # Move the window to the new position
        self.root.geometry(f"+{x}+{y}")

    def show_context_menu(self, event):
        self.context_menu.tk_popup(event.x_root, event.y_root)

    def run(self):
        self.root.mainloop()

    def update_indicator(self):
        wait_one_round = False
        manual = self._fst.arg_manager.MANUAL_PAUSED
        win32 = self._fst.arg_manager.WIN32_FILTER_PAUSED
        while not self.stop:
            if self._fst.arg_manager.STATUS_INDICATOR:
                    
                # only update if there is a change
                if manual is not self._fst.arg_manager.MANUAL_PAUSED or win32 is not self._fst.arg_manager.WIN32_FILTER_PAUSED:
                    manual = self._fst.arg_manager.MANUAL_PAUSED
                    win32 = self._fst.arg_manager.WIN32_FILTER_PAUSED
                    
                    if self._fst.arg_manager.MANUAL_PAUSED or self._fst.arg_manager.WIN32_FILTER_PAUSED:
                        status = False
                    else:
                        status = True
                        wait_one_round = True
                    color = "green" if status else "red"
                    self.canvas.itemconfig(self.indicator, fill=color)    
                
            # activate and deactive crosshair from tk.mainloop
            # wait an extra round for the new window to settle itself
            if wait_one_round:
                wait_one_round = False
            else:
                if self._fst.arg_manager.CROSSHAIR_ENABLED:
                    if not self.crosshair_enabled:
                        self.crosshair_activate()
                else:
                    if self.crosshair_enabled:
                        self.crosshair_deactivate()
                    
            # if mainthread is inactive already than end indicator
            if not main_thread.is_alive():
                if self.crosshair_enabled:
                    self.crosshair_deactivate()
                self.close_window()
            sleep(1)
            
    def toggle_crosshair(self):
        if not self._fst.arg_manager.CROSSHAIR_ENABLED:#self.crosshair_enabled:
            self._fst.arg_manager.CROSSHAIR_ENABLED = True
            self.crosshair_activate()
        else:
            self._fst.arg_manager.CROSSHAIR_ENABLED = False
            self.crosshair_deactivate()
        
    def crosshair_activate(self):
        if self.crosshair is not None:
            self.crosshair_deactivate()
        self.crosshair = Crosshair(tk.Toplevel(), self._fst)
        self.crosshair_enabled = True
        
    def crosshair_deactivate(self):
        self.crosshair.destroy()
        self.crosshair = None
        self.crosshair_enabled = False
    
    def end(self):
        self.stop = True
        
    def close_window(self):
        self.end()
        # Properly close the Tkinter window and stop the main loop
        self.root.destroy()

class Crosshair():
    
    def __init__(self, root, fst_keyboard):
        

        # Create a new Tkinter window
        self.root = root
        self._fst = fst_keyboard
        
        # Set title to recognise it in focus window
        self.root.title("FST Crosshair")
        
        # Remove window decorations
        self.root.overrideredirect(True)
        
        self.root.bind('<Button-1>', self.restart)
        
        # Set the window to be transparent
        self.root.attributes('-alpha', 1)
        
        self.built_crosshair()
        
    def built_crosshair(self):
        
        def rgbtohex(r,g,b):
            return f'#{r:02x}{g:02x}{b:02x}'
        
        # delta x,y for the midpoint of the crosshair
        delta_x = self._fst.arg_manager.CROSSHAIR_DELTA_X - 1  # for me this is the center of the screen
        delta_y = self._fst.arg_manager.CROSSHAIR_DELTA_Y - 1
        
        # base size has to be at least double the max of |x| or |y|
        # min_canvas_size = 2 * max(abs(delta_x), abs(delta_y)) + 25   # add a bit of buffer (25)
        # print(min_canvas_size)
        
        # # adapt canvas size to be big enough for the delta values
        # if min_canvas_size < 100:
        #     self.size = 100 
        # else: 
        #     # make it a multiplicative of 100
        #     self.size = (min_canvas_size // 100 + 1) * 100
        
        self.size = 100 
        
        # middle point distance from coordinate system of he canvas
        mid = self.size // 2
        
        # Get the screen width and height
        self.screen_width = self.root.winfo_screenwidth()
        self.screen_height = self.root.winfo_screenheight()
        
        # Calculate the position to center the window
        self.x_position = (self.screen_width // 2) - mid + delta_x
        self.y_position = (self.screen_height // 2) - mid + delta_y
        
        # Set the window geometry to 2x2 pixels centered on the screen
        self.root.geometry(f'{self.size}x{self.size}+{self.x_position}+{self.y_position}')
        
        # Create a canvas to draw the crosshair
        self.canvas = tk.Canvas(self.root, width=self.size, height=self.size, bg='white', highlightthickness=0)
        self.canvas.pack()

        # set color to glowing pink - that should be usable in most games :-D
        # would be interesting if it would be possible to make it the complementory color of 
        # the window below
        color = rgbtohex(255, 0, 255)
        
        # Draw the crosshair lines
        self.canvas.create_line(mid+0, mid+10, mid+0, mid+25, fill=color)    # Vertical line
        self.canvas.create_line(mid+1, mid+10, mid+1, mid+25, fill=color)    # Vertical line
        self.canvas.create_line(mid-1, mid+10, mid-1, mid+25, fill="black")  # Vertical line
        
        self.canvas.create_line(mid+11, mid+0, mid+26, mid+0, fill=color)    # Horizontal line right
        self.canvas.create_line(mid+11, mid+1, mid+26, mid+1, fill=color)    # Horizontal line right
        self.canvas.create_line(mid+11, mid+2, mid+26, mid+2, fill="black")  # Horizontal line right
        
        self.canvas.create_line(mid-25, mid+0, mid-10, mid+0, fill=color)    # Horizontal line left
        self.canvas.create_line(mid-25, mid+1, mid-10, mid+1, fill=color)    # tHorizontal line left
        self.canvas.create_line(mid-25, mid+2, mid-10, mid+2, fill="black")  # Horizontal line left
        
        self.canvas.create_line(mid-1, mid+0, mid-1, mid+2, fill=color)      # Dot
        self.canvas.create_line(mid+2, mid+0, mid+2, mid+3, fill=color)      # Dot
        self.canvas.create_line(mid-1, mid+2, mid+2, mid+2, fill=color)      # Dot
        self.canvas.create_line(mid-1, mid+3, mid+3, mid+3, fill="black")    # Dot
        self.canvas.create_line(mid-2, mid+0, mid-2, mid+3, fill="black")    # Dot
        
        # Set the window to be always on top and transparent again for drawing
        self.root.attributes('-topmost', True)
        self.root.attributes('-transparentcolor', 'white')

    # def run(self):
    #     # Start the Tkinter main loop
    #     self.root.mainloop()
        
    def destroy(self, event = None):
        self.root.destroy()
        
    def restart(self, event = None):
        print("restarting crosshair")
        self.canvas.destroy()
        self.built_crosshair()
  
def main():
    
    fst_keyboard.update_args_and_groups()
          
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


if __name__ == "__main__":    
       
    
    fst_keyboard = FST_Keyboard()
    print(sys.argv[1:])
    fst_keyboard.arg_manager.sys_start_args = sys.argv[1:] if len(sys.argv) > 1 else []
    
    if fst_keyboard.arg_manager.STATUS_INDICATOR:
        main_thread = Thread(target=main)
        main_thread.start()
        # waiting for the rest of the program to finish loading 
        sleep(0.5)
        try:
            root = tk.Tk()
            indicator = Status_Indicator(root, fst_keyboard)
            indicator_thread = Thread(target=indicator.update_indicator)
            indicator_thread.daemon = True  # Daemonize thread
            indicator_thread.start()
            indicator.run()
        except RuntimeError:
            pass
        sys.exit(1)
    else:
        main()
