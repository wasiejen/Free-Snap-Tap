from pynput import keyboard
import os # to use clearing of CLI for better menu usage
import sys # to get start arguments
import platform # to check for Linux

IS_LINUX = False
DEBUG = False
PAUSED = False
SKIP_MENU = False
CONTROLS_ENABLED = True

# Define File name for saving of Tap Groupings
FILE_NAME = 'tap_groups.txt'

# Constants for key events
WM_KEYDOWN = [256,260] # _PRESS_MESSAGES = (_WM_KEYDOWN, _WM_SYSKEYDOWN)
WM_KEYUP = [257,261] # _RELEASE_MESSAGES = (_WM_KEYUP, _WM_SYSKEYUP)
EXIT_KEY = 35  # END key vkcode 35
TOGGLE_ON_OFF_KEY = 46  # DELETE key vkcode 46
PRESS = True
RELEASE = False

# Flag to indicate when a key press should not be suppressed
simulating_key_press = False

# Tap groups define which keys are mutually exclusive
tap_groups = []

# Initialize the Controller
controller = keyboard.Controller()

# Dictionary mapping characters and keys to their VK codes
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
    'alt': 18, 'PAUSED': 19, 'caps_lock': 20, 'esc': 27, 'space': 32,
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
    'media_stop': 178, 'media_play_PAUSED': 179, 'launch_mail': 180,
    'launch_media_select': 181, 'launch_app1': 182, 'launch_app2': 183,
    'semicolon': 186, 'plus': 187, 'comma': 188, 'minus': 189,
    'period': 190, 'slash': 191, 'grave_accent': 192,
    'open_bracket': 219, 'backslash': 220, 'close_bracket': 221,
    'quote': 222, 'oem_8': 223, 'oem_102': 226,
    'process_key': 229, 'packet': 231, 'attn': 246, 'crsel': 247,
    'exsel': 248, 'erase_eof': 249, 'play': 250, 'zoom': 251,
    'pa1': 253, 'oem_clear': 254
}

def load_tap_groups():
    """
    Load tap groups from a text file.
    Each line in the file represents a tap group with keys separated by commas.
    """
    global tap_groups
    tap_groups = []
    with open(FILE_NAME, 'r') as file:
        for line in file:
            group = line.strip().split(',')
            tap_groups.append(group)

def save_tap_groups():
    """
    Save tap groups to a text file.
    Each line in the file represents a tap group with keys separated by commas.
    """
    with open(FILE_NAME, 'w') as file:
        for group in tap_groups:
            file.write(','.join(group) + '\n')

def display_tap_groups():
    """
    Display the current tap groups.
    """
    for index, group in enumerate(tap_groups):
        print(f"{index}: {', '.join(group)}")

def add_tap_group(new_group):
    """
    Add a new tap group.
    """
    tap_groups.append(new_group)
    save_tap_groups()

def delete_tap_group(index):
    """
    Delete the tap group at the specified index.
    """
    if 0 <= index < len(tap_groups):
        del tap_groups[index]
        save_tap_groups()

def reset_tap_groups_txt():
    """
    Reset Tap Groups and save new tap_group.txt with a+d and w+s tap groups
    """
    global tap_groups
    tap_groups = []
    add_tap_group(['a','d'])
    add_tap_group(['w','s'])

def initialize_tap_groups():
    """
    Initialize the state of each tap group
    """
    global tap_groups_states_dict, tap_groups_last_key_pressed, tap_groups_last_key_send
    tap_groups_states_dict = []
    for group in tap_groups:
        group_state = {}
        for key in group:
            if isinstance(key, str):
                try:
                    key = vk_codes_dict[key]
                except KeyError as error_msg:
                    print("!!! Wrong string as a key used: ", error_msg)
                    break
            group_state[key] = 0
        tap_groups_states_dict.append(group_state)

    tap_groups_last_key_pressed = [None] * len(tap_groups)
    tap_groups_last_key_send = [None] * len(tap_groups)

def win32_event_filter(msg, data):
    """
    Filter and handle keyboard events.
    """
    global PAUSED
    vk_code = data.vkCode
    if DEBUG: print(vk_code)
    if DEBUG: print("msg: ", msg)
    if DEBUG: print("data: ", data)

    # # Replace some Buttons :-D
    # if not PAUSED:
    #     if vk_code in list(replace_key_from.keys()):
    #         if DEBUG: print(vk_code)
    #         vk_code = replace_key_from[vk_code]
    #         simulate_key_event(is_press[msg], vk_code)
    #         listener.suppress_event()

   
    # Stop the listener if the END key is released
    if CONTROLS_ENABLED and vk_code == EXIT_KEY and msg in WM_KEYUP:
        print('\n--- Stopping execution ---')
        listener.stop()

    # Toggle paused/resume if the DELETE key is released
    elif CONTROLS_ENABLED and vk_code == TOGGLE_ON_OFF_KEY and msg in WM_KEYUP:
        if PAUSED:
            print('--- resumed ---')
            PAUSED = False
        else:
            print('--- paused ---')
            PAUSED = True

    # Intercept key events if not PAUSED and not simulating key press
    elif not PAUSED and not simulating_key_press:
        for group_index, group in enumerate(tap_groups_states_dict):
            if vk_code in group:
                if msg in WM_KEYDOWN and group[vk_code] == 0:
                    group[vk_code] = 1
                    tap_groups_last_key_pressed[group_index] = vk_code
                    send_keys(which_key_to_send(group_index), group_index)
                elif msg in WM_KEYUP:
                    group[vk_code] = 0
                    send_keys(which_key_to_send(group_index), group_index)
                if not IS_LINUX: listener.suppress_event()
                # only the first instance of a key will be actualized 
                # - no handling for a single key in multiple tap groups
                break

def which_key_to_send(group_index):
    """
    Determine which key to send based on the current state of the tap group.
    - If no keys are pressed, no key is sent.
    - If one key is pressed, that key is sent.
    - If more than one key is pressed, the last pressed key is sent.
    """
    num_of_keys_pressed = sum(tap_groups_states_dict[group_index].values())
    key_to_send = None

    if num_of_keys_pressed == 1:
        for key, state in tap_groups_states_dict[group_index].items():
            if state == 1:
                key_to_send = key
    elif num_of_keys_pressed > 1:
        key_to_send = tap_groups_last_key_pressed[group_index]

    return key_to_send

def send_keys(key_to_send, group_index):
    """
    Send the specified key and release the last key if necessary.
    """
    last_key_send = tap_groups_last_key_send[group_index]

    if key_to_send != last_key_send:
        if key_to_send is None:
            if last_key_send is not None:
                if not IS_LINUX: simulate_key_event(RELEASE, last_key_send)
            tap_groups_last_key_send[group_index] = None
        else:
            if last_key_send is not None:
                if not IS_LINUX: simulate_key_event(RELEASE, last_key_send)
            simulate_key_event(PRESS, key_to_send)
            tap_groups_last_key_send[group_index] = key_to_send

def simulate_key_event(is_press, key):
    """
    Simulate a key press or release.
    """
    global simulating_key_press
    if DEBUG: print("KeyCode: ", keyboard.KeyCode.from_vk(key))
    simulating_key_press = True
    controller.touch(keyboard.KeyCode.from_vk(key), is_press)
    simulating_key_press = False

#replace_key_from = {vk_codes_dict["oem_102"]: vk_codes_dict["left_control"],
#                    vk_codes_dict["left_windows"]: vk_codes_dict["left_control"]}

#is_press = {WM_KEYDOWN: 1, WM_KEYUP: 0}

def display_menu():
    """
    Display the menu and handle user input
    """
    invalid_input = False
    while True:       
        # clear the CLI
        os.system('cls||clear')
        if invalid_input:
            print("Invalid choice. Please try again.\n")
            invalid_input = False
        print("Active Tap Groups:")
        display_tap_groups()
        print('\n --- Options ---')
        print("1. Add Tap Group")
        print("2. Delete Tap Group")
        print("3. Reset tap_groups.txt file")
        print("4. Start Snap Tapping :-)\n")

        choice = input("Enter your choice: ")

        if choice == '0':
            display_tap_groups()
        elif choice == '1':
            new_group = input("Enter new tap group (keys separated by commas): ").split(',')
            add_tap_group(new_group)
            initialize_tap_groups()
        elif choice == '1':
            index = int(input("Enter the index of the tap group to delete: "))
            delete_tap_group(index)
            initialize_tap_groups()
        elif choice == '3':
            reset_tap_groups_txt()
        elif choice == '4' or choice == '':
            break
        else:
            invalid_input = True

def check_linux():
    global IS_LINUX
    if os.name != 'nt':
        if platform.system() == 'Linux':
            IS_LINUX = True
    return IS_LINUX

def check_root():
    if os.geteuid() != 0:
        raise PermissionError("This script needs to be run as root on Linux")

def check_start_arguments():
    global DEBUG, SKIP_MENU, FILE_NAME, CONTROLS_ENABLED
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            if DEBUG: print(arg)
            # start directly without showing the menu
            if arg == "-direct_start" or arg == "-nomenu":
                SKIP_MENU = True
            # use custom tap groups file for loading and saving
            elif arg[:5] == '-txt=' and len(arg) > 5:
                FILE_NAME = arg[5:]
                if DEBUG: print(FILE_NAME)
            # Debug .. what else :-D
            elif arg == "-debug":
                DEBUG = True
            elif arg == "-nocontrols":
                CONTROLS_ENABLED = False
            else:
                print("unknown start argument: ", arg)

if __name__ == "__main__":
    # check for root on linux systems

    if check_linux():
       check_root()
    
    # check if start arguments are passed
    check_start_arguments()

    # try loading tap groups from file
    try:
        load_tap_groups()
    # if no tap_groups.txt file exist create new one
    except FileNotFoundError:
        reset_tap_groups_txt()

    initialize_tap_groups()

    if not SKIP_MENU:
        display_menu()

    print('\n--- Free Snap Tap started ---')
    print('--- toggle PAUSED with DELETE key ---')
    print('--- STOP execution with END key ---')

    with keyboard.Listener(win32_event_filter=win32_event_filter) as listener:
        listener.join()
