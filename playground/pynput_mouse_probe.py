from pynput import mouse
import time
import ctypes

# CONSTANTS for key events
WM_KEYDOWN = [256,260] # _PRESS_MESSAGES = (_WM_KEYDOWN, _WM_SYSKEYDOWN)
WM_KEYUP = [257,261] # _RELEASE_MESSAGES = (_WM_KEYUP, _WM_SYSKEYUP)

# CONSTANTS for mouse events
MSG_MOUSE_MOVE = 512
MSG_MOUSE_SCROLL_VERTICAL = 522
MSG_MOUSE_SCROLL_HORIZONTAL = 526

MSG_MOUSE_DOWN = [513,516,519,523]
MSG_MOUSE_UP = [514,517,520,524]
MSG_MOUSE_SCROLL = [MSG_MOUSE_SCROLL_VERTICAL, MSG_MOUSE_SCROLL_HORIZONTAL]

mouse_controller = mouse.Controller()


# Win32 Constants
INPUT_MOUSE = 0
INPUT_KEYBOARD = 1

# Movement & Coordinate Control
MOUSEEVENTF_MOVE           = 0x0001  # Mouse movement occurred
MOUSEEVENTF_ABSOLUTE       = 0x8000  # Map dx/dy to absolute screen coords (0 to 65535)
MOUSEEVENTF_VIRTUALDESK    = 0x4000  # Map coords to multi-monitor virtual desktop
MOUSEEVENTF_MOVE_NOCOALESCE= 0x2000  # Do not combine mouse movement messages

# Primary & Secondary Buttons
MOUSEEVENTF_LEFTDOWN       = 0x0002  # Left button down
MOUSEEVENTF_LEFTUP         = 0x0004  # Left button up
MOUSEEVENTF_RIGHTDOWN      = 0x0008  # Right button down
MOUSEEVENTF_RIGHTUP        = 0x0010  # Right button up
MOUSEEVENTF_MIDDLEDOWN     = 0x0020  # Middle button down
MOUSEEVENTF_MIDDLEUP       = 0x0040  # Middle button up

# X-Buttons (Side / Extra Buttons)
MOUSEEVENTF_XDOWN          = 0x0080  # An X-button was pressed
MOUSEEVENTF_XUP            = 0x0100  # An X-button was released

# Wheels / Panning
MOUSEEVENTF_WHEEL          = 0x0800  # Vertical scroll wheel movement
MOUSEEVENTF_HWHEEL         = 0x1000  # Horizontal scroll wheel movement

# Keyboard Event Flags
KEYEVENTF_KEYDOWN = 0x0000
KEYEVENTF_KEYUP = 0x0002

class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", ctypes.c_long),
        ("dy", ctypes.c_long),
        ("mouseData", ctypes.c_ulong),
        ("dwFlags", ctypes.c_ulong),
        ("time", ctypes.c_ulong),
        ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong)),
    ]

class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", ctypes.c_ushort),
        ("wScan", ctypes.c_ushort),
        ("dwFlags", ctypes.c_ulong),
        ("time", ctypes.c_ulong),
        ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong)),
    ]

class HARDWAREINPUT(ctypes.Structure):
    _fields_ = [
        ("uMsg", ctypes.c_ulong),
        ("wParamL", ctypes.c_ushort),
        ("wParamH", ctypes.c_ushort),
    ]

class INPUT(ctypes.Structure):
    class _INPUT(ctypes.Union):
        _fields_ = [
            ("mi", MOUSEINPUT),
            ("ki", KEYBDINPUT),
            ("hi", HARDWAREINPUT),
        ]

    _anonymous_ = ("_input",)
    _fields_ = [
        ("type", ctypes.c_ulong),
        ("_input", _INPUT),
    ]

def send_mouse_click(dw_flags, data=0):
    extra = ctypes.c_ulong(0)
    ii = INPUT()
    ii.type = INPUT_MOUSE
    ii.mi = MOUSEINPUT(0, 0, data, dw_flags, 0, ctypes.pointer(extra))
    ctypes.windll.user32.SendInput(1, ctypes.pointer(ii), ctypes.sizeof(ii))

def mouse_win32_event_filter(msg, data):

    def is_simulated_key_event(flags):
        return flags == 1

    def is_press(msg):
        if msg in MSG_MOUSE_DOWN:
            return True
        if msg in MSG_MOUSE_UP:
            return False
        if msg in MSG_MOUSE_SCROLL:
            if data.mouseData == 7864320: # up
                return False
            if data.mouseData == 4287102976: # down
                return True

    def get_mouse_vk_code():
        # mouse left
        if msg in [513, 514]:
            return 1
        if msg in [516, 517]:
            return 2
        if msg in [519, 520]:
            return 3
        if msg in [523, 524]:
            if data.mouseData == 65536:
                return 4
            if data.mouseData == 131072:
                return 5
        if msg == MSG_MOUSE_SCROLL_VERTICAL:
            return 6
        if msg == MSG_MOUSE_SCROLL_HORIZONTAL:
            return 7
        return None

    def get_coordinates():
        x = data.pt.x
        y = data.pt.y
        return (x,y)


    vk_code = get_mouse_vk_code()
    is_keydown = is_press(msg)

    print(f"{vk_code} : {is_keydown}")
    if vk_code == 2:
        if is_keydown:
            send_mouse_click(MOUSEEVENTF_LEFTDOWN)
            #mouse_controller.press(mouse.Button.left)
        else:
            send_mouse_click(MOUSEEVENTF_LEFTUP)
        listener.suppress_event()
            #time.sleep(0.1)
            #mouse_controller.release(mouse.Button.left)


if __name__ == '__main__':
    listener = mouse.Listener(win32_event_filter=mouse_win32_event_filter)

    listener.start()
    while True:
        time.sleep(0.1)
