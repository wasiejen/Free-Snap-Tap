from pynput import keyboard

DEBUG = False
PAUSE = False

# Initialize the Controller
controller = keyboard.Controller()

# Constants for key events
WM_KEYDOWN = 0x0100
WM_KEYUP = 0x0101
EXIT_KEY = keyboard.Key.end   # END key
TOGGLE_ON_OFF_KEY = keyboard.Key.delete

# Flag to indicate when a key press should not be supressed
simulating_key_press = False

# Tap Groups
tap_groups = [['a', 'd'], 
              ['w', 's'],
              ['1', '2', '3', '4'],
              ['q', 'e'],
              ]

if DEBUG: print(tap_groups)

# Creation of helper dict and lists for saving the states of the tap groups
tap_groups_states_dict = []
for group_index, group in enumerate(tap_groups):
    tap_groups_states_dict.append({})
    for key in group:
        tap_groups_states_dict[group_index][key] = 0

tap_groups_last_key_pressed = []
tap_groups_last_key_send = []
for group in tap_groups:
    tap_groups_last_key_pressed.append(None)
    tap_groups_last_key_send.append(None)

if DEBUG: print(tap_groups_states_dict)
if DEBUG: print(tap_groups_last_key_pressed)
if DEBUG: print(tap_groups_last_key_send)


def which_key_to_send(group_index):

    # case 1: no keys pressed -> no key is send, last key pressed is released
    # case 2: one key pressed -> this key is send
    # case 3: mote than one key pressed -> last pressed key is send

    # sum of values in group of group_indexa
    num_of_keys_pressed = sum(list(tap_groups_states_dict[group_index].values()))
    if DEBUG: print("tap group state: ", tap_groups_states_dict[group_index].values())
    if DEBUG: print("number of keys in typ group pressed: ", num_of_keys_pressed)

    key_to_press = None

    # case 1
    if num_of_keys_pressed == 0:
        pass
    # case 2
    elif num_of_keys_pressed == 1:
        for key in list(tap_groups_states_dict[group_index].keys()):
            if tap_groups_states_dict[group_index][key] == 1:
                key_to_press = key
    # case 3           
    elif num_of_keys_pressed > 1:
        key_to_press = tap_groups_last_key_pressed[group_index]

    return key_to_press

def send_keys(key_to_press, group_index):
    global tap_groups_last_key_send
    last_key_send = tap_groups_last_key_send[group_index]
    if key_to_press != last_key_send:
        if key_to_press == None:
            if last_key_send == None:
                pass
            else:
                release_key(last_key_send)
                tap_groups_last_key_send[group_index] = None
        else:
            if last_key_send != None:
                release_key(last_key_send)
            press_key(key_to_press)

def release_key(key):
    global simulating_key_press
    simulating_key_press = True
    controller.release(key)
    simulating_key_press = False

def press_key(key):
    global simulating_key_press
    simulating_key_press = True
    controller.press(key)
    simulating_key_press = False

def on_release(key):
    global PAUSE
    if DEBUG: print(f"Key {key} released")
    if key == EXIT_KEY:
        # Stop listener
        print('--- Stopping execution ---')
        return False
    elif key == TOGGLE_ON_OFF_KEY:
        # PAUSE replacement of keys - but you will be back to 'w and 'd' instead of arrow keys
        if PAUSE: 
            print('--- resumed ---')
            PAUSE = False
        else:
            print ('--- paused ---')
            PAUSE = True

def win32_event_filter(msg, data):
    global tap_groups_states_dict
    if not PAUSE and not simulating_key_press:

        vk_code = data.vkCode
        key_char = chr(vk_code).lower()
        if DEBUG: print("vk_code: ", vk_code)
        for group_index, group in enumerate(tap_groups_states_dict):
            if key_char in list(group.keys()):
                # Check if the event is a key press or release
                if msg == WM_KEYDOWN:
                    if DEBUG: print('#1 key press')
                    if tap_groups_states_dict[group_index][key_char] == 0: 
                        tap_groups_states_dict[group_index][key_char] = 1
                        tap_groups_last_key_pressed[group_index] = key_char
                        key_to_press = which_key_to_send(group_index)
                        send_keys(key_to_press, group_index)

                elif msg == WM_KEYUP:
                    if DEBUG: print('#2 key release')
                    tap_groups_states_dict[group_index][key_char] = 0
                    key_to_press = which_key_to_send(group_index)
                    send_keys(key_to_press, group_index)
                

                listener.suppress_event()

if __name__ == "__main__":
    print('--- Snap-Tapping started ---')
    print('')
    print('--- toggle PAUSE with delete key ---')
    print('--- STOP with END key ---')
    print('')
    with keyboard.Listener(#on_press=on_press, 
                            on_release=on_release, 
                            win32_event_filter=win32_event_filter) as listener:
        listener.join()

