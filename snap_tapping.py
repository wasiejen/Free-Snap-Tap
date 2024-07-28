from pynput import keyboard

DEBUG = False
PAUSE = False

# Constants for key events
WM_KEYDOWN = 0x0100
WM_KEYUP = 0x0101
EXIT_KEY = 35 #keyboard.Key.end   # END key vkcode 35
TOGGLE_ON_OFF_KEY = 46 #yboard.Key.delete # DELETE key vkcode 46
press = True
release = False

# Flag to indicate when a key press should not be supressed
simulating_key_press = False

# Initialize the Controller
controller = keyboard.Controller()

# vk codes and string representation to be used in tap groups
vk_codes_dict = {
    'a': 65, 'b': 66, 'c': 67, 'd': 68, 'e': 69, 'f': 70, 'g': 71,
    'h': 72, 'i': 73, 'j': 74, 'k': 75, 'l': 76, 'm': 77, 'n': 78,
    'o': 79, 'p': 80, 'q': 81, 'r': 82, 's': 83, 't': 84, 'u': 85,
    'v': 86, 'w': 87, 'x': 88, 'y': 89, 'z': 90,
    '0': 48, '1': 49, '2': 50, '3': 51, '4': 52, '5': 53, '6': 54,
    '7': 55, '8': 56, '9': 57,
    'F1': 112, 'F2': 113, 'F3': 114, 'F4': 115, 'F5': 116, 'F6': 117,
    'F7': 118, 'F8': 119, 'F9': 120, 'F10': 121, 'F11': 122, 'F12': 123,
    'num0': 96, 'num1': 97, 'num2': 98, 'num3': 99, 'num4': 100,
    'num5': 101, 'num6': 102, 'num7': 103, 'num8': 104, 'num9': 105,
    'multiply': 106, 'add': 107, 'separator': 108, 'subtract': 109,
    'decimal': 110, 'divide': 111,
    'backspace': 8, 'tab': 9, 'enter': 13, 'shift': 16, 'ctrl': 17,
    'alt': 18, 'pause': 19, 'caps_lock': 20, 'esc': 27, 'space': 32,
    'page_up': 33, 'page_down': 34, 'end': 35, 'home': 36,
    'left_arrow': 37, 'up_arrow': 38, 'right_arrow': 39, 'down_arrow': 40,
    'select': 41, 'print': 42, 'execute': 43, 'print_screen': 44,
    'insert': 45, 'delete': 46, 'help': 47,
    'left_windows': 91, 'right_windows': 92, 'applications': 93,
    'sleep': 95, 'num_lock': 144, 'scroll_lock': 145,
    'left_shift': 160, 'right_shift': 161, 'left_control': 162,
    'right_control': 163, 'left_menu': 164, 'right_menu': 165,
    'browser_back': 166, 'browser_forward': 167, 'browser_refresh': 168,
    'browser_stop': 169, 'browser_search': 170, 'browser_favorites': 171,
    'browser_home': 172, 'volume_mute': 173, 'volume_down': 174,
    'volume_up': 175, 'media_next_track': 176, 'media_prev_track': 177,
    'media_stop': 178, 'media_play_pause': 179, 'launch_mail': 180,
    'launch_media_select': 181, 'launch_app1': 182, 'launch_app2': 183,
    'semicolon': 186, 'plus': 187, 'comma': 188, 'minus': 189,
    'period': 190, 'slash': 191, 'grave_accent': 192,
    'open_bracket': 219, 'backslash': 220, 'close_bracket': 221,
    'quote': 222, 'oem_8': 223, 'oem_102': 226,
    'process_key': 229, 'packet': 231, 'attn': 246, 'crsel': 247,
    'exsel': 248, 'erase_eof': 249, 'play': 250, 'zoom': 251,
    'pa1': 253, 'oem_clear': 254
}

# Tap Groups (input can be char/str and/or vk-codes (mixes possible) - see dict directly above)
tap_groups = [
    ['w', 's'], 
    ['a', 'd'],  
    #['ctrl', 'space'],  # that is working now
    #['q', 'e'],
    #['1', '2', '3', '4'],  
]
     
if DEBUG: print(tap_groups) 

# Creation of helper dict and lists for saving the states of the tap groups
tap_groups_states_dict = []
for group_index, group in enumerate(tap_groups):
    tap_groups_states_dict.append({})
    for key in group:
        if isinstance(key, str):
            try:
                key = vk_codes_dict[key] 
            except KeyError as keystring:
                print("!!! Wrong string as a key used: ", keystring)
                exit()
        tap_groups_states_dict[group_index][key] = 0

tap_groups_last_key_pressed = []
tap_groups_last_key_send = []
for group in tap_groups:
    tap_groups_last_key_pressed.append(None)
    tap_groups_last_key_send.append(None)

if DEBUG: print(tap_groups_states_dict)
if DEBUG: print(tap_groups_last_key_pressed)
if DEBUG: print(tap_groups_last_key_send)

# logic to determine which key will be pressed next
def which_key_to_send(group_index):

    # case 1: no keys pressed -> no key is send, last key pressed is released
    # case 2: one key pressed -> this key is send
    # case 3: more than one key pressed -> last pressed key is send

    # sum of values in group of group_indexa
    num_of_keys_pressed = sum(list(tap_groups_states_dict[group_index].values()))
    if DEBUG: print("tap group state: ", tap_groups_states_dict[group_index].values())
    if DEBUG: print("number of keys in tap group pressed: ", num_of_keys_pressed)

    key_to_send = None

    # case 1
    if num_of_keys_pressed == 0:
        pass
    # case 2
    elif num_of_keys_pressed == 1:
        for key in list(tap_groups_states_dict[group_index].keys()):
            if tap_groups_states_dict[group_index][key] == 1:
                key_to_send = key
    # case 3           
    elif num_of_keys_pressed > 1:
        key_to_send = tap_groups_last_key_pressed[group_index]

    return key_to_send

# send given key and before that release the last key
def send_keys(key_to_send, group_index):

    global tap_groups_last_key_send
    last_key_send = tap_groups_last_key_send[group_index]
    if key_to_send != last_key_send:
        if key_to_send == None:
            if last_key_send == None:
                pass
            else:
                touch_key(release, last_key_send)
                tap_groups_last_key_send[group_index] = None
        else:
            if last_key_send != None:
                touch_key(release, last_key_send)
            touch_key(press, key_to_send)

# small wrapper for turning off supression of simulated key event
def touch_key(is_press, key):
    global simulating_key_press
    if DEBUG: print("KeyCode: ", keyboard.KeyCode.from_vk(key))
    simulating_key_press = True
    controller.touch(keyboard.KeyCode.from_vk(key),is_press)
    simulating_key_press = False

def win32_event_filter(msg, data):
    global PAUSE
    global tap_groups_states_dict

    vk_code = data.vkCode

    # STOP listeners
    if vk_code == EXIT_KEY and msg == WM_KEYUP:
        print('\n--- Stopping execution ---')
        return False
    # PAUSE Listener
    elif vk_code == TOGGLE_ON_OFF_KEY and msg == WM_KEYUP:
        if PAUSE: 
            print('--- resumed ---')
            PAUSE = False
        else:
            print ('--- paused ---')
            PAUSE = True

    # only intercept key event if it is not paused or no simulated key press is send
    elif not PAUSE and not simulating_key_press:    
        if DEBUG: print("vk_code: ", vk_code)
        for group_index, group in enumerate(tap_groups_states_dict):
            if vk_code in list(group.keys()):
                # Check if the event is a key press or release
                if msg == WM_KEYDOWN:
                    if DEBUG: print('#1 key press')
                    if tap_groups_states_dict[group_index][vk_code] == 0: 
                        tap_groups_states_dict[group_index][vk_code] = 1
                        tap_groups_last_key_pressed[group_index] = vk_code
                        send_keys(which_key_to_send(group_index), group_index)

                elif msg == WM_KEYUP:
                    if DEBUG: print('#2 key release')
                    tap_groups_states_dict[group_index][vk_code] = 0
                    send_keys(which_key_to_send(group_index), group_index)
                
                listener.suppress_event()

if __name__ == "__main__":
    print('--- Snap-Tapping started ---')
    print('')
    print('--- toggle PAUSE with DELETE key ---')
    print('--- STOP execution with END key ---')
    print('')

    with keyboard.Listener(win32_event_filter=win32_event_filter) as listener:
        listener.join()
