import tkinter as tk
import threading
import time

class StatusIndicator:
    def __init__(self, root):
        self.root = root
        self.root.title("Status Indicator")
        self.canvas = tk.Canvas(root, width=100, height=100)
        self.canvas.pack()
        self.status = "inactive"
        self.indicator = self.canvas.create_oval(20, 20, 80, 80, fill="red")

    def update_indicator(self):
        while True:
            color = "green" if self.status == "active" else "red"
            self.canvas.itemconfig(self.indicator, fill=color)
            time.sleep(1)  # Update every second

    def set_status(self, status):
        self.status = status

def start_indicator(indicator):
    indicator_thread = threading.Thread(target=indicator.update_indicator)
    indicator_thread.daemon = True  # Daemonize thread
    indicator_thread.start()

def main():
    root = tk.Tk()
    indicator = StatusIndicator(root)
    start_indicator(indicator)

    # Example of changing status from another thread
    def toggle_status():
        while True:
            time.sleep(5)  # Toggle every 5 seconds
            new_status = "active" if indicator.status == "inactive" else "inactive"
            indicator.set_status(new_status)

    toggle_thread = threading.Thread(target=toggle_status)
    toggle_thread.daemon = True
    toggle_thread.start()

    root.mainloop()

if __name__ == "__main__":
    main()
