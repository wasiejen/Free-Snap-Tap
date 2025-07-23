'''
Free-Snap-Tap V1.1.6
last updated: 250723-1528
'''

import sys
from PyQt5.QtWidgets import QWidget, QApplication, QMenu
from PyQt5.QtCore import Qt, qInstallMessageHandler
from PyQt5.QtGui import QPainter, QColor, QPen, QCursor

def customMessageHandler(mode, context, message):
    # Suppress QWindowsWindow::setGeometry warnings
    if "QWindowsWindow::setGeometry" in message:
        return
    # Otherwise, print the message (log to file, etc.)
    print(f"Qt Message: {message}")

qInstallMessageHandler(customMessageHandler)


# --- Crosshair Overlay ---
class CrosshairOverlay(QWidget):
    def __init__(self, center_point, delta_x=0, delta_y=0, thickness=1, color=(255,0,255), parent=None, size_multiplier=1.0):
        super().__init__(parent)
        self.crosshair_size = int(32 * size_multiplier)  # Span of the crosshair overlay
        self.thickness = int(thickness * size_multiplier)
        self.size_multiplier = size_multiplier
        self.color = QColor(*color)
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowTransparentForInput | Qt.WindowStaysOnTopHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground)

        # Place the overlay window so its center coincides with (center_point + deltas)
        x = center_point.x() + int(delta_x * size_multiplier) - self.crosshair_size//2
        y = center_point.y() + int(delta_y * size_multiplier) - self.crosshair_size//2
        self.setGeometry(x, y, self.crosshair_size, self.crosshair_size)
        self.show()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        pen = QPen(self.color)
        pen.setWidth(self.thickness)
        painter.setPen(pen)
        c = self.crosshair_size // 2  # Local center

        # Crosshair lines, precisely positioned (relative to center)
        sm = self.size_multiplier
        outer_radius = int(14 * sm)
        inner_radius = int(7 * sm)
        cube_distance = int(2 * sm)
        cube_distance_down = int(3 * sm)
        painter.drawLine(c - outer_radius, c, c - inner_radius, c)
        painter.drawLine(c + outer_radius, c, c + inner_radius, c)
        painter.drawLine(c, c + outer_radius, c, c + inner_radius + 1)
        painter.drawLine(c - cube_distance, c, c - cube_distance, c + cube_distance_down)
        painter.drawLine(c + cube_distance, c, c + cube_distance, c + cube_distance_down)
        painter.drawLine(c + cube_distance, c + cube_distance_down, c - cube_distance, c + cube_distance_down)

# --- Status Overlay ---
class StatusOverlay(QWidget):
    def __init__(self, fst_keyboard):
        super().__init__()
        self._fst = fst_keyboard
        self.crosshair_window = None
        self.screen_changed = False
        self.counter = 0
        
        # Window appearance
        self.padding = 5
        self.user_size = self._fst.arg_manager.STATUS_INDICATOR_SIZE
        self.setWindowTitle("FST Status Indicator")
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.set_window_size_and_position(padding=self.padding, user_size=self.user_size, init=True)  # Initialize size based on screen geometry

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
        self.context_menu.addAction("Toggle Crosshair", self.toggle_crosshair)
        self.context_menu.addSeparator()
        self.context_menu.addAction("Hide Indicator", self.toggle_status_indicator)
        
        
        # layout = QVBoxLayout()
        # #layout.setContentsMargins(padding, padding, padding, padding)
        # label = QLabel("FST", self)
        # label.setAlignment(Qt.AlignCenter)
        # label.setStyleSheet("color: white; font-weight: bold; font-size: 16px;")
        # label.setFixedSize(user_size, user_size)
        # layout.addWidget(label)
        # self.setLayout(layout)
        
        # self.setStyleSheet(f"background-color: {self.color_name};")
        

        self.show()

    # Trigger a repaint to reflect the new size
    def set_window_size_and_position(self, padding=5, user_size=20,init=False):
        # Window appearance        
        screen = self.get_current_screen()
        # Get the current global cursor position
        screen_height = screen.geometry().height()
        size_multiplier = self.get_crosshair_size_multiplier(screen_height)
        user_size = int(user_size * size_multiplier)
        padding = int(padding * size_multiplier)
        dpadding = 2 * padding
        
        # Calculate the new size based on user size and padding
        x_size = max(dpadding + user_size, 30)
        y_size = dpadding + user_size

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

        self.user_size = user_size
        self.padding = padding
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
        p = self.padding
        s = self.user_size
        painter.drawEllipse(self.x_size - p - s, p, s, s)
        #print(f"Painting overlay at: {self.geometry()} with size ({self.x_size}, {self.y_size}) and padding {p}")
        
    def get_current_screen(self):
        # center_point = self.geometry().center()
        # screen = QApplication.screenAt(center_point)
        screen = QApplication.screenAt(QCursor.pos())
        if not screen:
            screen = QApplication.primaryScreen()
        return screen         

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

            # Check if the screen changed during drag
            new_screen = self.get_current_screen()
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
        self.close_window()

    def display_internal_state(self):
        self._fst.display_internal_repr_groups()

    def open_config_file(self):
        self._fst.open_config_file()

    def reload_from_file(self):
        self._fst.reload_from_file()

    def close_window(self):
        if self.crosshair_window is not None:
            self.crosshair_window.close()
            self.crosshair_window = None
        self.close()

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

    # --- Crosshair Toggle Logic ---
    def toggle_crosshair(self):
            # Close/remove if already present
            if self.crosshair_window is not None:
                self.set_crosshair(False)
            else:
                self.set_crosshair(True)
    
    def set_crosshair(self, set = True):
        """Toggle the crosshair overlay on or off."""
        if self._fst.arg_manager.CROSSHAIR_ENABLED != set:
            self._fst.arg_manager.CROSSHAIR_ENABLED = set
            
    def remove_crosshair(self):
        if self.crosshair_window is not None:
            self.crosshair_window.close()
            self.crosshair_window = None

    def get_crosshair_size_multiplier(self, screen_height):
            min_res = 720     # Lower bound, anything ≤ 720p gets smallest
            baseline = 1080   # Standard reference size (scaling factor of 1)
            max_res = 2160    # 4K and above, scaling factor of 2
            if screen_height <= min_res:
                return 0.
            elif screen_height >= max_res:
                return 2.0
            else:
                # Linear interpolate between 0.67 (at 720p) and 2.0 (at 2160p)
                multiplier = round(0.67 + (screen_height - min_res) * (2.0 - 0.67) / (max_res - min_res), 1)
                return multiplier
            
    def display_crosshair(self):
        
        """Display the crosshair overlay on the current screen."""           
        if self.crosshair_window is None:

            screen = self.get_current_screen()
            screen_geom = screen.geometry()
            screen_center = screen_geom.center()
            screen_height = screen_geom.height()
            size_multiplier = self.get_crosshair_size_multiplier(screen_height)
            print(f"Crosshair added: Screen height: {screen_height}, Size multiplier: {size_multiplier}")
            dx = getattr(self._fst.arg_manager, "CROSSHAIR_DELTA_X", 0)
            dy = getattr(self._fst.arg_manager, "CROSSHAIR_DELTA_Y", 0)
            self.crosshair_window = CrosshairOverlay(
                screen_center, dx, dy,
                size_multiplier=size_multiplier
            )
        


# --- Dummy usage stub for testing ---
if __name__ == "__main__":
    class DummyArgManager:
        STATUS_INDICATOR_SIZE = 50
        CROSSHAIR_DELTA_X = 0
        CROSSHAIR_DELTA_Y = 0
        CROSSHAIR_THICKNESS = 2

    class DummyFST:
        arg_manager = DummyArgManager()
        def control_toggle_pause(self): print("Pause toggled")
        def control_return_to_menu(self): print("Returned to menu")
        def control_exit_program(self, from_where): print(f"Exit program: {from_where}")
        def display_internal_repr_groups(self): print("Display internal state")
        def open_config_file(self): print("Open config file")
        def reload_from_file(self): print("Reload from file")

    def set_console_visibility(visible): print(f"Console visible?: {visible}")

    app = QApplication(sys.argv)
    overlay = StatusOverlay(DummyFST(), set_console_visibility)
    sys.exit(app.exec_())
