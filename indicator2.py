import tkinter as tk

def on_start(event):
    # Record the starting position of the mouse
    root._drag_data = {"x": event.x_root, "y": event.y_root}

def on_drag(event):
    # Calculate the new position of the window
    dx = event.x_root - root._drag_data["x"]
    dy = event.y_root - root._drag_data["y"]
    x = root.winfo_x() + dx
    y = root.winfo_y() + dy

    # Update the starting position of the mouse
    root._drag_data["x"] = event.x_root
    root._drag_data["y"] = event.y_root

    # Move the window to the new position
    root.geometry(f"+{x}+{y}")

def show_context_menu(event):
    context_menu.tk_popup(event.x_root, event.y_root)

root = tk.Tk()
root.overrideredirect(True)  # Remove window decorations
root.geometry("100x100")
root.attributes("-alpha", 1)  # Set transparency level
root.wm_attributes("-transparentcolor", "yellow")

# Create a canvas for the indicator
canvas = tk.Canvas(root, width=100, height=100, bg="yellow", highlightthickness=0)
canvas.pack()

# Draw the indicator
indicator = canvas.create_oval(20, 20, 80, 80, fill="green")

# Bind mouse events to make the window draggable
root.bind("<ButtonPress-1>", on_start)
root.bind("<B1-Motion>", on_drag)

# Create a right-click context menu
context_menu = tk.Menu(root, tearoff=0)
context_menu.add_command(label="Close", command=root.quit)

# Bind right-click to show the context menu
canvas.bind("<Button-3>", show_context_menu)

root.mainloop()
