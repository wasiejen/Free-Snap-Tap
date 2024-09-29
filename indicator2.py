import tkinter as tk
import threading
import queue
import time

class StatusIndicator:
    def __init__(self, root):
        self.root = root
        self.root.title("Status Indicator")
        self.canvas = tk.Canvas(root, width=100, height=100)
        self.canvas.pack()
        self.indicator = self.canvas.create_oval(20, 20, 80, 80, fill="red")
        self.queue = queue.Queue()
        self.root.after(100, self.process_queue)

    def process_queue(self):
        try:
            while True:
                status = self.queue.get_nowait()
                color = "green" if status == "active" else "red"
                self.canvas.itemconfig(self.indicator, fill=color)
        except queue.Empty:
            pass
        finally:
            self.root.after(100, self.process_queue)

    def set_status(self, status):
        self.queue.put(status)

def start_indicator(indicator):
    def toggle_status():
        while True:
            time.sleep(5)  # Toggle every 5 seconds
            new_status = "active" if indicator.queue.empty() else "inactive"
            indicator.set_status(new_status)

    toggle_thread = threading.Thread(target=toggle_status)
    toggle_thread.daemon = True
    toggle_thread.start()

def main():
    root = tk.Tk()
    indicator = StatusIndicator(root)
    start_indicator(indicator)
    root.mainloop()

if __name__ == "__main__":
    main()
