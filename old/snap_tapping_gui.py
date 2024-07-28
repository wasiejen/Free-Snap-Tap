# snap_tapping_gui.py
import sys
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QListWidget, QLineEdit
import snap_tapping_logic as logic

class SnapTappingGUI(QWidget):
    def __init__(self):
        super().__init__()

        self.initUI()

    def initUI(self):
        self.setWindowTitle("Snap-Tapping Configuration")

        layout = QVBoxLayout()

        # Listbox to display tap groups
        self.tap_groups_listbox = QListWidget()
        layout.addWidget(self.tap_groups_listbox)

        # Entry widget to input new tap groups
        self.new_group_entry = QLineEdit()
        layout.addWidget(self.new_group_entry)

        # Add and Delete buttons
        buttons_layout = QHBoxLayout()
        add_button = QPushButton("Add Tap Group")
        add_button.clicked.connect(self.add_tap_group)
        buttons_layout.addWidget(add_button)

        delete_button = QPushButton("Delete Tap Group")
        delete_button.clicked.connect(self.delete_tap_group)
        buttons_layout.addWidget(delete_button)

        layout.addLayout(buttons_layout)

        # Pause and Close buttons
        control_buttons_layout = QHBoxLayout()
        self.pause_button = QPushButton("Pause")
        self.pause_button.clicked.connect(self.toggle_pause)
        control_buttons_layout.addWidget(self.pause_button)

        close_button = QPushButton("Close")
        close_button.clicked.connect(self.close_app)
        control_buttons_layout.addWidget(close_button)

        layout.addLayout(control_buttons_layout)

        self.setLayout(layout)

        # Update the Listbox with initial tap groups
        self.update_tap_groups_listbox()

    def update_tap_groups_listbox(self):
        self.tap_groups_listbox.clear()
        with logic.lock:
            for group in logic.tap_groups:
                self.tap_groups_listbox.addItem(', '.join(group))

    def add_tap_group(self):
        new_group = self.new_group_entry.text().split(',')
        if new_group:
            logic.add_tap_group(new_group)
            self.update_tap_groups_listbox()
            self.new_group_entry.clear()

    def delete_tap_group(self):
        selected_index = self.tap_groups_listbox.currentRow()
        if selected_index != -1:
            logic.delete_tap_group(selected_index)
            self.update_tap_groups_listbox()

    def toggle_pause(self):
        global PAUSE
        PAUSE = not PAUSE
        self.pause_button.setText("Resume" if PAUSE else "Pause")

    def close_app(self):
        self.close()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    gui = SnapTappingGUI()
    gui.show()
    sys.exit(app.exec_())
