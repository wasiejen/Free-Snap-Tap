'''
Free-Snap-Tap V1.2.0
last updated: 250724-1434
'''

import sys
from PySide6.QtWidgets import QSizePolicy, QWidget, QApplication, QMenu, QSystemTrayIcon, QLabel, QVBoxLayout, QFrame
from PySide6.QtCore import QObject, Qt, qInstallMessageHandler, Signal, QTimer
from PySide6.QtGui import QPainter, QColor, QPen, QCursor, QIcon, QPixmap, QFont

import ctypes

import logging
# Use __name__ to automatically label logs with the filename
logger = logging.getLogger(__name__)

# suppress warnings about setGeometry when changing screens and drawn geometry gets out of bound
def customMessageHandler(mode, context, message):
    # Suppress QWindowsWindow::setGeometry warnings
    if "QWindowsWindow::setGeometry" in message:
        return
    # Otherwise, print the message (log to file, etc.)
    print(f"Qt Message: {message}")

qInstallMessageHandler(customMessageHandler)


# Window style constants
user32 = ctypes.WinDLL('user32', use_last_error=True)
kernel32 = ctypes.WinDLL('kernel32', use_last_error=True)
SW_HIDE, SW_SHOW = 0, 5
GWL_EXSTYLE = -20
# WS_EX_TOOLWINDOW = 0x00000080
# WS_EX_APPWINDOW = 0x00040000

console_visible = True

# Store original state at module load
# _hwnd = kernel32.GetConsoleWindow()
# _original_style = user32.GetWindowLongPtrW(_hwnd, GWL_EXSTYLE) if _hwnd else None

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

def get_current_screen():
    # center_point = self.geometry().center()
    # screen = QApplication.screenAt(center_point)
    screen = QApplication.screenAt(QCursor.pos())
    if not screen:
        screen = QApplication.primaryScreen()
    return screen  
            
def get_device_pixel_ratio(screen):
    return screen.devicePixelRatio() 

  
    
# def calc_size_multiplier(screen):
#     # Raw pixels, e.g. 2160x3840 at 150% scaling
#     virtual_geom = screen.geometry()
#     min_pixel = min(virtual_geom.width(), virtual_geom.height())
#     dpr = get_device_pixel_ratio(screen)
#     min_pixel = min_pixel
    
#     print(f"Screen geometry: {screen.size()}, Device Pixel Ratio: {dpr}, Min pixel: {min_pixel}")
    
#     # Define resolution thresholds for scaling
#     min_res = 720     # Lower bound, anything ≤ 720p gets smallest
#     baseline = 1080   # Standard reference size (scaling factor of 1)
#     max_res = 2160    # 4K and above, scaling factor of 2
#     if min_pixel <= min_res:
#         return 0.67
#     elif min_pixel >= max_res:
#         return 2.0
#     else:
#         # Linear interpolate between 0.67 (at 720p) and 2.0 (at 2160p)
#         multiplier = round(0.67 + (min_pixel - min_res) * (2.0 - 0.67) / (max_res - min_res), 1)
#         return multiplier 

    
    
    

class GUI_Manager(QWidget):
    def __init__(self, fst_keyboard, app):
        super().__init__()
        self._fst = fst_keyboard
        self._app = app #QApplication([])
        self.tray_icon = Tray_Icon(fst_keyboard, parent=self)
        self.overlay = StatusOverlay(fst_keyboard, parent=self)
        self.toast_manager = ToastManager(fst_keyboard, self.overlay)
        self.crosshair = CrosshairOverlay(fst_keyboard, parent=self)
        self.color = None

        # Connect signals from tray_ui to manager methods
        self.tray_icon.signal_open_config.connect(self.open_config_file)
        self.tray_icon.signal_reload.connect(self.reload_from_file)
        self.tray_icon.signal_toggle_pause.connect(self.toggle_pause)
        self.tray_icon.signal_return_menu.connect(self.return_to_menu)
        self.tray_icon.signal_toggle_status_indicator.connect(self.toggle_status_indicator)
        self.tray_icon.signal_toggle_console.connect(self.toggle_console_on_left_click)
        self.tray_icon.signal_exit.connect(self.exit_program)
        
        self.tray_icon.signal_toggle_crosshair.connect(self.toggle_crosshair) 
        self.overlay.signal_toggle_crosshair.connect(self.toggle_crosshair) 

        self.update_timer = QTimer()
        self.update_timer.timeout.connect(self.perform_periodic_update)
        
        self.update_timer.stop()
        
        self.manual = self._fst.arg_manager.MANUAL_PAUSED
        self.win32 = self._fst.arg_manager.WIN32_FILTER_PAUSED
        self.focus_name = self._fst.focus_manager.FOCUS_APP_NAME
        self.crosshair_enabled = self._fst.arg_manager.CROSSHAIR_ENABLED
        self.status = self._fst.arg_manager.STATUS_INDICATOR
        
        # self.overlay_console_visible = True
        
        if self._fst.arg_manager.ALWAYS_ACTIVE:
            self.color = "blue"
        else:
            self.color =  "red"

    def start(self):
        self.start_update_timer()  # Start the periodic update timer
        self._app.exec()  # Start the Qt event loop
        
    def start_update_timer(self):
        """Start the periodic update timer."""
        self.update_timer.start(500)
        
    def perform_periodic_update(self):
               
        if self.status != self._fst.arg_manager.STATUS_INDICATOR:
            self.status = self._fst.arg_manager.STATUS_INDICATOR
            if self.status:
                self.overlay.show_indicator()
            else:
                self.overlay.hide_indicator()
                    
        if self.crosshair_enabled is not self._fst.arg_manager.CROSSHAIR_ENABLED:
            self.crosshair_enabled = self._fst.arg_manager.CROSSHAIR_ENABLED
            if self._fst.arg_manager.CROSSHAIR_ENABLED:
                self.crosshair.show_crosshair()
            else:
                self.crosshair.hide_crosshair()

        if self._fst.arg_manager.STATUS_INDICATOR or self._fst.arg_manager.TRAY_ICON:

            # only update if there is a change
            if (self.manual is not self._fst.arg_manager.MANUAL_PAUSED or 
                self.win32 is not self._fst.arg_manager.WIN32_FILTER_PAUSED or
                self.focus_name is not self._fst.focus_manager.FOCUS_APP_NAME):
                self.manual = self._fst.arg_manager.MANUAL_PAUSED
                self.win32 = self._fst.arg_manager.WIN32_FILTER_PAUSED
                self.focus_name = self._fst.focus_manager.FOCUS_APP_NAME
                

                if self._fst.arg_manager.MANUAL_PAUSED or self._fst.arg_manager.WIN32_FILTER_PAUSED:
                    color = "red"
                else:
                    if self._fst.arg_manager.ALWAYS_ACTIVE and self.focus_name == '':
                        color = "blue"
                    else:   
                        color = "green"
                
                if self.tray_icon is not None:
                    if self.tray_icon.color != color:
                        # print("new color icon: ", color)
                        self.tray_icon.update_color(color)

                if self.overlay is not None:
                    if self.overlay.color_name != color:
                        #print("new color overlay: ", color)
                        self.overlay.update_color(color) 
                        # on first color update, hide the overlay console taskbar icon
                        # if self.overlay_console_visible:
                        #     hide_overlay_console()
                        #     self.overlay_console_visible = False    
                            
                            

    

    def open_config_file(self):
        self._fst.open_config_file()

    def reload_from_file(self):
        self._fst.reload_from_file()

    def toggle_pause(self):
        self._fst.control_toggle_pause()

    def return_to_menu(self):
        self._fst.control_return_to_menu()

    def toggle_status_indicator(self):
        """Toggle the status indicator visibility."""
        # self._fst.arg_manager.STATUS_INDICATOR = checked
        # You can add logic to show/hide overlay indicator here
        # e.g. self.overlay.show_indicator() or hide_indicator()
        if self._fst.arg_manager.STATUS_INDICATOR:
            self._fst.arg_manager.STATUS_INDICATOR = False
            # overlay.hide_indicator()
        else:
            self._fst.arg_manager.STATUS_INDICATOR = True

    def toggle_console_on_left_click(self):
              
        # Placeholder: implement your console visibility toggle here
        switch_console_visibility()  # Replace with your actual function
        
    def exit_program(self):
        self._fst.control_exit_program("icon")
        self.close()
        self.deleteLater()
        self._app.quit()
        sys.exit(0)

    def display_internal_state(self):
        self._fst.display_internal_repr_groups()
        
    # --- Crosshair Toggle Logic ---
    def toggle_crosshair(self):
        if self._fst.arg_manager.CROSSHAIR_ENABLED:
            self._fst.arg_manager.CROSSHAIR_ENABLED = False
            # overlay.hide_indicator()
        else:
            self._fst.arg_manager.CROSSHAIR_ENABLED = True
        
            
    # def add_toast(self, text, **kwargs):
    #     self.toast_manager.add_toast(text, **kwargs)
    
    # def add_timer(self, text, **kwargs):
    #     self.toast_manager.add_toast(text, **kwargs)
        
    # def remove_toast(self, text):
    #     self.toast_manager.remove_toast(text)   
    
    # def remove_all_toasts(self):
    #     self.toast_manager.remove_all_toasts()
        
        
class Tray_Icon(QSystemTrayIcon):
    """A system tray icon with a context menu for Free-Snap-Tap."""
    
    signal_open_config = Signal()
    signal_reload = Signal()
    signal_toggle_pause = Signal()
    signal_return_menu = Signal()
    signal_toggle_status_indicator = Signal()
    signal_toggle_console = Signal()
    signal_toggle_crosshair = Signal()
    signal_exit = Signal()

    def __init__(self, fst_keyboard, parent=None):
        super().__init__(parent)
        self._fst = fst_keyboard
        self.color = None
        self.images = {}
        self.fill_images()
        # self.parent

        self.setIcon(self.images["red"])
        self.setToolTip("FST Status")
        self.setContextMenu(self.create_menu())
        #self.show()  # Show the tray icon
        
        self.activated.connect(self.on_activated)
        
    def on_activated(self, reason):
        if reason == QSystemTrayIcon.Trigger:  # Left click on most platforms
            self.signal_toggle_console.emit()

    def update_color(self, color):
        """Update the tray icon color."""
        self.color = color
        if color in self.images:
            self.setIcon(self.images[color])

    def fill_images(self):
        max_size = 64  # icon size 64x64
        border = 2
        size = max_size - 2 * border
        # both_borders = border * 2
        font_size = int(size / 2 - 2)

        font = QFont("Arial", font_size, QFont.Bold)

        for color_name in ["red", "green", "blue"]:
            pixmap = QPixmap(max_size, max_size)
            pixmap.fill(Qt.transparent)

            painter = QPainter(pixmap)
            painter.setRenderHint(QPainter.Antialiasing)

            painter.setBrush(QColor(color_name))
            painter.setPen(Qt.NoPen)
            painter.drawEllipse(border, border, size, size)

            # Draw text "FST" centered
            painter.setPen(Qt.white)
            painter.setFont(font)
            rect = pixmap.rect()
            painter.drawText(rect, Qt.AlignCenter, "FST")

            painter.end()
            self.images[color_name] = QIcon(pixmap)

    def create_menu(self):
        menu = QMenu()

        menu.addAction("Open config file", self.signal_open_config.emit)
        menu.addAction("Reload from file", self.signal_reload.emit)
        menu.addSeparator()
        menu.addAction("Toggle Pause", self.signal_toggle_pause.emit)
        menu.addAction("Return to Menu", self.signal_return_menu.emit)
        menu.addSeparator()
        menu.addAction("Toggle Indicator", self.signal_toggle_status_indicator.emit)
        menu.addAction("Toggle Crosshair", self.signal_toggle_crosshair.emit)
        menu.addSeparator()
        menu.addAction("Toggle Console", self.signal_toggle_console.emit)
        menu.addSeparator()
        menu.addAction("Exit Program", self.signal_exit.emit)

        return menu         

# --- Crosshair Overlay ---
class CrosshairOverlay(QWidget):
    def __init__(self, fst_keyboard, crosshair_size=100,thickness=3, color=(255,0,255), parent=None):
        super().__init__(parent)
        self._fst = fst_keyboard
        self._crosshair_size = crosshair_size  # Default size of the crosshair overlay
        self._thickness = thickness
        self.color = QColor(*color)
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowTransparentForInput | Qt.WindowStaysOnTopHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground)

        # Place the overlay window so its center coincides with (center_point + deltas)
        self.update_position()
        self.hide_crosshair()
        
    def hide_crosshair(self):
        """Hide the crosshair overlay."""
        if self.isVisible():
            self.hide()
            
    def show_crosshair(self):
        """Show the crosshair overlay."""
        if not self.isVisible():
            self.update_position()
            self.show()
        
    def update_position(self):
        screen = get_current_screen()
        screen_geom = screen.geometry()
        screen_center = screen_geom.center()
        # screen_height = screen_geom.height()
        # size_multiplier = calc_size_multiplier(screen)
        size_multiplier =  1 / get_device_pixel_ratio(screen)
        
        print(f"Screen geometry: {screen.size()}, Device Pixel Ratio: {get_device_pixel_ratio(screen)}, Size multiplier: {size_multiplier}")
        
        
        self.size_multiplier = size_multiplier  # Store for later use in paintEvent
        self.crosshair_size = int(self._crosshair_size * size_multiplier)  # Span of the crosshair overlay
        self.thickness = int(self._thickness * size_multiplier)
        
        print(f"Crosshair size: {self.crosshair_size}, Thickness: {self.thickness}")
        
        print(f"Crosshair added: Device Pixel Ratio: {get_device_pixel_ratio(screen)}, Size multiplier: {size_multiplier}")
        dx = getattr(self._fst.arg_manager, "CROSSHAIR_DELTA_X", 0)
        dy = getattr(self._fst.arg_manager, "CROSSHAIR_DELTA_Y", 0)
        x = screen_center.x() + int(dx * size_multiplier) - self.crosshair_size//2
        y = screen_center.y() + int(dy * size_multiplier) - self.crosshair_size//2
        self.setGeometry(x, y, self.crosshair_size, self.crosshair_size)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        pen = QPen(self.color)
        pen.setWidth(self.thickness)
        painter.setPen(pen)
        c = self.crosshair_size // 2  # Local center
        
        # Crosshair lines,  positioned relative to center
        padding = 4
        spacing = 1
        outer_radius = (self.crosshair_size - padding) // 2
        inner_radius = outer_radius // 2 + spacing
        cube_distance = self.crosshair_size // 20 + spacing
        cube_distance_down = cube_distance + spacing
        
        shadow_pen = QPen(QColor(0,0,0))
        shadow = 2
        c_shadow = c + shadow
        
        def paint_crosshair(c, pen):
            painter.setPen(pen)
            painter.drawLine(c - outer_radius, c, c - inner_radius, c)
            painter.drawLine(c + outer_radius, c, c + inner_radius, c)
            painter.drawLine(c, c + outer_radius, c, c + inner_radius)# + spacing)
            # pen.setWidth(self.thickness*0.67)
            # painter.drawLine(c - cube_distance, c, c - cube_distance, c + cube_distance_down)
            # painter.drawLine(c + cube_distance, c, c + cube_distance, c + cube_distance_down)
            # painter.drawLine(c + cube_distance, c + cube_distance_down, c - cube_distance, c + cube_distance_down)
            # draw a circle in the center with variable diameter
            painter.drawRect(c - self.thickness//2, c - self.thickness//2, self.thickness, self.thickness)

        paint_crosshair(c_shadow, shadow_pen)  # Draw shadow first
        paint_crosshair(c, pen)
        
        # painter.setPen(pen)
        # painter.drawLine(c - outer_radius, c, c - inner_radius, c)
        # painter.drawLine(c + outer_radius, c, c + inner_radius, c)
        # painter.drawLine(c, c + outer_radius, c, c + inner_radius + spacing)
        # pen.setWidth(self.thickness*0.67)
        # painter.drawLine(c - cube_distance, c, c - cube_distance, c + cube_distance_down)
        # painter.drawLine(c + cube_distance, c, c + cube_distance, c + cube_distance_down)
        # painter.drawLine(c + cube_distance, c + cube_distance_down, c - cube_distance, c + cube_distance_down)

# --- Status Overlay ---
class StatusOverlay(QWidget):

    signal_toggle_crosshair = Signal()
    def __init__(self, fst_keyboard, parent=None):
        super().__init__(parent)
        self._fst = fst_keyboard
        self.crosshair_window = None
        self.screen_changed = False
        self.counter = 0
        
        # Window appearance
        self.base_padding = 5
        self.user_padding = 5 # used also for other things, so that they scale together with the user size
        self.user_size = self._fst.arg_manager.STATUS_INDICATOR_SIZE
        self.setWindowTitle("FST Status Indicator")
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.set_window_size_and_position(init=True)  # Initialize size based on screen geometry

        self.color_name = "red"
        self.color = QColor(self.color_name)
        self._drag_offset = None

        # Build menu
        self.context_menu = QMenu(self)
        self.context_menu.addAction("Open config file", self.open_config_file)
        self.context_menu.addAction("Reload from file", self.reload_from_file)
        self.context_menu.addSeparator()
        self.context_menu.addAction("Toggle Pause", self.toggle_pause)
        self.context_menu.addAction("Return to Menu", self.return_to_menu)
        self.context_menu.addSeparator()
        self.context_menu.addAction("Toggle Crosshair", self.signal_toggle_crosshair.emit)
        self.context_menu.addSeparator()
        self.context_menu.addAction("Remove all Toasts", self.remove_all_toasts)
        self.context_menu.addAction("Hide Indicator", self.toggle_status_indicator)
               

        self.show()

    # Trigger a repaint to reflect the new size
    def set_window_size_and_position(self, init=False):
        user_size = self._fst.arg_manager.STATUS_INDICATOR_SIZE

        #padding = self.padding
        # Window appearance        
        screen = get_current_screen()
        # Get the current global cursor position
        # screen_height = screen.geometry().height()
        size_multiplier = get_device_pixel_ratio(screen)
        # size_multiplier = get_device_pixel_ratio(screen)
        self.user_size = int(user_size * size_multiplier)
        padding = int(self.base_padding  * size_multiplier)
        dpadding = 2 * padding
        
        # Calculate the new size based on user size and padding
        x_size = dpadding + self.user_size
        y_size = dpadding + self.user_size

        if init :
            # On init, place at top-right corner of primary screen
            scr_geom = screen.geometry()
            top_left_x = scr_geom.right() - x_size
            top_left_y = scr_geom.top()
        else:
            # During drag or resizing, always recenter at cursor
            cursor_pos = QCursor.pos()
            top_left_x = cursor_pos.x() - x_size // 2
            top_left_y = cursor_pos.y() - y_size // 2

        self.setGeometry(top_left_x, top_left_y, x_size, y_size)

        self.user_padding = padding
        self.x_size = x_size
        self.y_size = y_size
        self._current_screen = screen
        self._current_screen_name = screen.name() if screen else 'Unknown'
        
        self.update()  # Trigger repaint
        
    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        painter.setBrush(self.color)
        painter.setPen(Qt.NoPen)
        p = self.user_padding
        s = self.user_size
        painter.drawEllipse(self.x_size - p - s, p, s, s)
        #print(f"Painting overlay at: {self.geometry()} with size ({self.x_size}, {self.y_size}) and padding {p}")      

    # --- Mouse drag and menu events ---
    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self._drag_offset = event.globalPos() - self.frameGeometry().topLeft()
            self.screen_changed = False
            self.counter = 10
        event.accept()
        
    def mouseDoubleClickEvent(self, event):
        if event.button() == Qt.LeftButton:
            print("Double-click detected, opening config file.")
            self.open_config_file()
        event.accept()
        
    def mouseMoveEvent(self, event):
        if hasattr(self, '_drag_offset') and self._drag_offset is not None:
            # Calculate new top-left so the widget's center is under the mouse
            global_pos = event.globalPos()
            new_center_x = global_pos.x()
            new_center_y = global_pos.y()
            new_left = new_center_x - self.x_size // 2
            new_top = new_center_y - self.y_size // 2
            self.move(new_left, new_top)
            
            # also drag the toast manager if it's visible
            if hasattr(self.parent(), 'toast_manager'):
                self.parent().toast_manager.update_position()
                
            # Check if the screen changed during drag
            new_screen = get_current_screen()
            if new_screen != self._current_screen:
                self._current_screen = new_screen
                self.screen_changed = True
                self.counter = 10
                # Note: If this causes jumpiness, use only the drag-end approach below.
            if self.screen_changed:
                if self.counter == 0:
                    self.set_window_size_and_position()
                    print(f"Overlay moved to screen: {self._current_screen_name}")
                    self.screen_changed = False
                else:
                    self.counter -= 1   
        event.accept()

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.LeftButton:
            self._drag_offset = None
            # After drag completes, check if the screen changed.
            # Only now, resize/recenter if needed — this avoids feedback loops!
            if self.screen_changed:
                self.set_window_size_and_position()  # Resize and recenter
                print(f"Overlay moved to screen: {self._current_screen_name}")
                self.screen_changed = False
                
        event.accept()

    def contextMenuEvent(self, event):
        self.context_menu.exec_(event.globalPos())

    # --- Menu Actions ---
    def toggle_pause(self):
        self._fst.control_toggle_pause()

    def return_to_menu(self):
        self._fst.control_return_to_menu()

    def exit_program(self):
        self._fst.control_exit_program("overlay")
        self.close_overlay()

    def display_internal_state(self):
        self._fst.display_internal_repr_groups()

    def open_config_file(self):
        self._fst.open_config_file()

    def reload_from_file(self):
        self._fst.reload_from_file()

    def close_overlay(self):
        self.remove_crosshair() 
        self.close()
        self.deleteLater()

    def update_color(self, color):
    
        self.color_name = color
        #self.setStyleSheet(f"background-color: {self.color_name};")
        self.color = QColor(color)
        self.update()
        
    def toggle_status_indicator(self):
        """Toggle the status indicator visibility."""
        if self._fst.arg_manager.STATUS_INDICATOR:
            self._fst.arg_manager.STATUS_INDICATOR = False
            # overlay.hide_indicator()
        else:
            self._fst.arg_manager.STATUS_INDICATOR = True
            # overlay.show_indicator() 
        
    def hide_indicator(self):
        # self._fst.arg_manager.STATUS_INDICATOR = False
        self.hide()
        
    def show_indicator(self):
        # self._fst.arg_manager.STATUS_INDICATOR = True
        self.show()
        # Repaint to ensure color is updated
        self.update()
        
    def remove_all_toasts(self):
        if hasattr(self.parent(), 'toast_manager'):
            self.parent().toast_manager.remove_all_toasts()
        
           
           
class ToastWidget(QFrame):
    def __init__(self, text, duration=3.0, text_size=12, bg_color="rgba(40, 40, 40, 200)", text_color="white", timer=0, parent=None):
        super().__init__(parent)
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.ToolTip | Qt.WindowStaysOnTopHint)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.id = text
        self.duration = duration
        self.base_text = text
        self.text_size = text_size
        self.text_color = text_color
        self.resoltion = 0.1
        self.use_timer_display = bool(timer) # Store the flag
        self.remaining_seconds = round(duration, 1)
        
        self.setStyleSheet(f"""
            QFrame {{
                background-color: {bg_color};
                color: {text_color};
                border-radius: 8px;
                padding: 0px;
            }}
            QLabel {{ 
                background: {bg_color}; 
                font-family: 'Consolas', 'Courier New', monospace; 
                font-size: {text_size}px; 
                font-weight: bold; 
            }}
        """)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSizeConstraint(QVBoxLayout.SetFixedSize)
        


        # Set the initial text
        if self.use_timer_display:
            self.label = QLabel(self.get_display_text())
        else:
            self.label = QLabel(f" {text} ")
        layout.addWidget(self.label)

        # 2. Single Master Timer
        # This handles both the countdown AND the eventual destruction
        self.master_timer = QTimer(self)
        self.master_timer.timeout.connect(self.handle_tick)
        
        # Start at 0.1-second intervals
        self.master_timer.start(100) 
        
        self.adjustSize()

    def __eq__(self, other) -> bool:
        return (self.id == other.id) and (self.duration is other.duration)
    
    def get_display_text(self):
        """Standardizes the countdown format."""
        return f" {self.base_text} | {self.remaining_seconds:5.1f}s "

    def handle_tick(self):
        """The single entry point for timer logic."""
        self.remaining_seconds -= 0.1
        
        if self.remaining_seconds <= 0:
            self.master_timer.stop()
            self.deleteLater()
        elif self.use_timer_display: # No hasattr needed
            self.label.setText(self.get_display_text())

    def dismiss(self, immediately):
        """Visual confirmation before manual removal."""
        if self.master_timer.isActive():
            self.master_timer.stop()
            
        if immediately:
            self.deleteLater()
        else:
            self.label.setText(f" {self.base_text} | DELETE ")
            self.setStyleSheet(f"""
                QFrame {{
                    background-color: rgba(200, 40, 40, 200);
                    color: {self.text_color};
                    border-radius: 8px;
                    padding: 0px;
                }}
                QLabel {{ 
                    font-family: 'Consolas'; 
                    font-size: {self.text_size}px; 
                    font-weight: bold; 
                }}
            """)
            
            # Re-use the timer for the 1-second final delay
            # This is more efficient than creating a singleShot
            self.master_timer.timeout.disconnect() # Remove handle_tick
            self.master_timer.timeout.connect(self.deleteLater)
            self.master_timer.start(1000)

class ToastManager(QWidget):
    def __init__(self, fst_keyboard, parent_overlay):
        super().__init__()
        self._fst = fst_keyboard
        self.parent_overlay = parent_overlay
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowTransparentForInput | Qt.WindowStaysOnTopHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground)
        
        # FIX: Give it a large enough fixed width so it doesn't need to resize
        # This prevents the 'jump' because the window itself never changes size.
        self.setFixedWidth(500) 
        
        self.main_layout = QVBoxLayout(self)
        self.main_layout.setContentsMargins(0, 0, 0, 0)
        self.main_layout.setSpacing(3)
        
        # Align children to the top-right of our static 500px box
        self.main_layout.setAlignment(Qt.AlignTop | Qt.AlignRight)
        self.active_toasts = {} # Key: text (ID), Value: ToastWidget instance

    def add_toast(self, text, duration, text_size, bg_color, text_color, timer=0):
        # If a toast with the same ID already exists, remove it first
        
        if self._fst.arg_manager.STATUS_INDICATOR:
            self.remove_toast(text, immediately=1)
            
            toast = ToastWidget(text, duration, text_size, bg_color, text_color, timer)
            self.active_toasts[text] = toast
            
            # Auto-cleanup: remove from dict when the widget is deleted
            toast.destroyed.connect(lambda: self._handle_destruction(text))
                              
            self.main_layout.addWidget(toast, alignment=Qt.AlignRight)
            
            self.update_position()
            self.show()
        
    def add_timer(self, text, duration, text_size, bg_color, text_color):
        self.add_toast(text, duration, text_size, bg_color, text_color, timer=1)

    def remove_toast(self, text, immediately=0):
        """Manually find and delete a toast by its ID string."""            
        for i in range(self.main_layout.count()):
            element = self.main_layout.itemAt(i).widget()   
            if element.id == text:
                element.dismiss(immediately) 
                # if text in self.active_toasts.keys():
                #     self.active_toasts.pop(text)
                # self.main_layout.removeWidget(element)
                # element.deleteLater()
            
    def remove_all_toasts(self, immediately=0):
        """Remove all active toasts using their individual dismiss logic."""
        # .values() creates a view; list(...) creates a snapshot copy 
        # so we don't have issues if the dict changes during iteration.
        for toast in list(self.active_toasts.values()):
            toast.dismiss(immediately)

    def _handle_destruction(self, text):
        """Internal cleanup when a toast disappears."""
        if text in self.active_toasts.keys():
            self.active_toasts.pop(text)
        try:
            self.check_empty()
            self.update_position()
        except RuntimeError:
            # C++ side of the manager already deleted (e.g. toasts destroyed
            # at app shutdown) - nothing left to update
            pass

    def update_position(self):
        overlay_geo = self.parent_overlay.geometry()
        parent_padding = self.parent_overlay.user_padding
        
        # Anchor the RIGHT edge of our 500px box to the RIGHT edge of the indicator
        x = overlay_geo.right() - self.width() - parent_padding
        # Anchor the TOP edge of our toasts just below the indicator
        y = overlay_geo.bottom()
        
        self.move(x, y)

    def check_empty(self):
        if self.main_layout.count() == 0:
            self.hide()
    
class ToastBridge(QObject):
    # This acts as the thread-safe "translator"
    signal_show_toast = Signal(str, int, int, str, str)  # text, duration, text_size, bg_color, text_color
    signal_show_timer = Signal(str, int, int, str, str)  # text, duration, text_size, bg_color, text_color
    signal_remove_toast = Signal(str, int) # New signal to target a specific ID
    signal_remove_all_toasts = Signal(int) # New signal to remove all toasts

    def trigger_toast(self, text, duration, text_size, bg_color, text_color):
        # This method can be called safely by ANY thread
        self.signal_show_toast.emit(text, duration, text_size, bg_color, text_color)

    def trigger_timer(self, text, duration, text_size, bg_color, text_color):
        self.signal_show_timer.emit(text, duration, text_size, bg_color, text_color)

    def trigger_remove(self, text, immediately=0):
        """Call this to instantly end a specific toast/timer."""
        self.signal_remove_toast.emit(text, immediately)
        
    def trigger_remove_all(self, immediately=0):
        """Call this to instantly end all toasts/timers."""
        self.signal_remove_all_toasts.emit(immediately)  # Use a special wildcard ID to indicate "all"
