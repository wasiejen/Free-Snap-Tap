from pynput import keyboard, mouse
import os # to use clearing of CLI for better menu usage
import msvcrt # for clearing the input buffer before starting a new input
import sys # to get start arguments

from random import randint # randint(3, 9)) 
from time import sleep # sleep(0.005) = 5 ms


DEBUG = False
PAUSED = False
STOPPED = False
MENU_ENABLED = True
CONTROLS_ENABLED = True
PRINT_VK_CODES = False

# AntiCheat testing (ACT)
ACT_DELAY = False
ACT_MIN_DELAY_IN_MS = 2
ACT_MAX_DELAY_IN_MS = 10
ACT_CROSSOVER = False # will also force delay
ACT_CROSSOVER_PROPABILITY_IN_PERCENT = 50

# Alias delay between presses and releases
ALIAS_MIN_DELAY_IN_MS = 2 
ALIAS_MAX_DELAY_IN_MS = 10

# Define File name for saving of Tap Groupings and Key Groups
FILE_NAME_TAP_GROUPS = 'tap_groups.txt'
FILE_NAME_KEY_GROUPS = 'key_groups.txt'

# Constants for key events
WM_KEYDOWN = [256,260] # _PRESS_MESSAGES = (_WM_KEYDOWN, _WM_SYSKEYDOWN)
WM_KEYUP = [257,261] # _RELEASE_MESSAGES = (_WM_KEYUP, _WM_SYSKEYUP)

# Control keys
EXIT_KEY = 35  # END key vkcode 35
TOGGLE_ON_OFF_KEY = 46  # DELETE key vkcode 46
MENU_KEY = 34 # PAGE_DOWN

# Tap groups define which keys are mutually exclusive
tap_groups = []

# Key Groups define which key1 will be replaced by key2
# if a Key Group has more than 2 keys if will be handled als alias
key_groups = []

# Initialize the Controller
controller = keyboard.Controller()
mouse_controller = mouse.Controller()

controller_dict = {True: mouse_controller, False: controller}

mouse_vk_codes_dict = {1: mouse.Button.left, 
                       2: mouse.Button.right, 
                       4: mouse.Button.middle}
mouse_vk_codes = mouse_vk_codes_dict.keys()

# Dictionary mapping strings and keys to their VK codes
vk_codes_dict = {
    'mouse_left': 1, 'mouse_right': 2, 'mouse_middle': 4,
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
    'pa1': 253, 'oem_clear': 254,
    # some vk_codes for german keyboard layout
    '<': 226, 'ä': 222, 'ö': 192, 'ü': 186, '´': 221, 'copilot': 134, 
    # some symbols
    '-': 189, '+': 187, '#': 191, ',': 188, '.':190,
    # supress keys with binding to:
    'suppress': 0,

}

def load_groups(file_name, data_object):
    """
    Load tap groups from a text file.
    Each line in the file represents a tap group with keys separated by commas.
    """
    data_object = []
    with open(file_name, 'r') as file:
        for line in file:
            if len(line) > 1:
                group = line.strip().replace(" ","").split(',')
                # ignore line if first char is a #
                if group[0][0] == '#':
                    pass
                else:
                    data_object.append(group)
    return data_object

def save_groups(file_name, data_object):
    """
    Save tap groups to a text file.
    Each line in the file represents a tap group with keys separated by commas.
    """
    with open(file_name, 'w') as file:
        for group in data_object:
            file.write(','.join(group) + '\n')

def display_groups(data_object):
    """
    Display the current tap groups.
    """
    for index, group in enumerate(data_object):
        print(f"{index}: {', '.join(group)}")

def add_group(new_group, data_object):
    """
    Add a new tap group.
    """
    data_object.append(new_group)

def delete_group(index, data_object):
    """
    Delete the tap group at the specified index.
    """
    if 0 <= index < len(data_object):
        del data_object[index]

def reset_tap_groups_txt():
    """
    Reset Tap Groups and save new tap_group.txt with a+d and w+s tap groups
    """
    global tap_groups
    tap_groups = []
    add_group(['a','d'], tap_groups)
    add_group(['w','s'], tap_groups)
    save_groups(FILE_NAME_TAP_GROUPS, tap_groups)

def reset_key_groups_txt():
    """
    Reset key_groups and initialise empty txt file
    """
    global key_groups
    key_groups = []
    #add_group(['<','left_shift'], key_groups)
    #add_group(['left_windows','left_control'], key_groups)
    save_groups(FILE_NAME_KEY_GROUPS, key_groups)

def convert_to_vk_code(key):
    try:
        return vk_codes_dict[key]
    except KeyError:
        try:
            key_int = int(key)
            if 0 < key_int < 256:
                return key_int
        except ValueError:
            raise KeyError


def initialize_key_groups():
    global key_groups_dict, key_groups_key_modifier , key_groups_key_delays
    key_groups_dict = [[] for n in range(len(key_groups))] 
    # saves the modifiers of the key '+'=up=False, '-'=down=True, no modifier=None
    key_groups_key_modifier = [[] for n in range(len(key_groups))] 
    key_groups_key_delays = [[] for n in range(len(key_groups))] 

    if DEBUG: print("key groups: ", key_groups)
    for group_index, group in enumerate(key_groups):
        for key in group:

            #TODO: first break up the combination into a list of keys


            #seperate delay info from string
            if '|' in key:
                key, *delays = key.split('|')
                if DEBUG: print(f"delays for {key}: {delays}")
                # cast in int and ignore all other elements after first 2
                delays = [int(delay) for delay in delays[:2]]
            else:
                delays = [ALIAS_MAX_DELAY_IN_MS, ALIAS_MIN_DELAY_IN_MS]
            key_groups_key_delays[group_index].append(delays)


            if key == '':
                break

            # recognition of mofidiers +, - and #
            # only interpret it as such when more then one char is in key
            key_modifier = None
            if len(key) > 1: 
                if key[0] == '-':
                    # down key
                    key_modifier = 'down'
                    key = key.replace('-','',1) # only replace first occurance
                elif key[0] == '+':
                    # up key
                    key_modifier = 'up'
                    key = key.replace('+','',1)
                elif key[0] == '#':
                    # up key
                    key_modifier = 'reversed'
                    key = key.replace('#','',1)

            key = convert_to_vk_code(key)
            key_groups_dict[group_index].append(key)
            key_groups_key_modifier[group_index].append(key_modifier)            

    if DEBUG: print("key dict: ", key_groups_dict)

def initialize_tap_groups():
    """
    Initialize the state of each tap group
    """
    global tap_groups_states_dict, tap_groups_last_key_pressed, tap_groups_last_key_send
    tap_groups_states_dict = []
    for group in tap_groups:
        group_state = {}
        for key in group:
            key = convert_to_vk_code(key)
            group_state[key] = 0
        tap_groups_states_dict.append(group_state)
    tap_groups_last_key_pressed = [None] * len(tap_groups)
    tap_groups_last_key_send = [None] * len(tap_groups)
    if DEBUG:
        print(f"tap_groups_last_key_pressed: {tap_groups_last_key_pressed}")
        print(f"tap_groups_last_key_send: {tap_groups_last_key_send}")

def is_simulated_key_event(flags):
    return flags & 0x10

def is_press(msg):
    if msg in WM_KEYDOWN:
        return True
    if msg in WM_KEYUP:
        return False

def delay(max = ALIAS_MAX_DELAY_IN_MS, min = ALIAS_MIN_DELAY_IN_MS, ):
    if min > max: min,max = max,min
    sleep(randint(min, max) / 1000)

def win32_event_filter(msg, data):
    """
    Filter and handle keyboard events.
    """
    global PAUSED, STOPPED
    global key_groups_key_modifier

    def check_for_mouse_vk_code(vk_code):
        is_mouse_key = vk_code in mouse_vk_codes
        return is_mouse_key

    def get_key_code(is_mouse_key, vk_code):
        if is_mouse_key:
            key_code = mouse_vk_codes_dict[vk_code]
        else:
            key_code = keyboard.KeyCode.from_vk(vk_code)
        return key_code

    def should_activate(key_modifier):

        activate = False
        # if no up or down is set, it will be fired at press and release of key
        # just to be consitent with the syntax
        if key_modifier == None:
            activate = True
        # only fire alias with release of key, not on press
        elif key_modifier == 'up':
            if not is_keydown:
                activate = True
        # only fire alias with press of key, not on release
        elif key_modifier == 'down':
            if is_keydown:
                activate = True
        # I do not know yet ...
        elif key_modifier == 'reversed': #
            pass
        return activate

    key_directly_replaced = False
    vk_code = data.vkCode
    is_keydown = is_press(msg)

    if PRINT_VK_CODES and is_keydown:
        print(f"vk_code: {vk_code}")

    # if DEBUG: 
    #     print(f"vk_code: {vk_code}")
    #     print("msg: ", msg)
    #     print("data: ", data)

    # check for simulated keys:
    if not is_simulated_key_event(data.flags):

        # Replace some Buttons :-D
        if not PAUSED:
            for group_index, group in enumerate(key_groups_dict):
                # if DEBUG: print("group_index", group_index)

                if vk_code == group[0]:

                    key_modifier = key_groups_key_modifier[group_index][0]
                    new_key_modifiers = key_groups_key_modifier[group_index][1:]                

                    if DEBUG: 
                        print("vk_code_gotten: ", vk_code)
                        print("vk_code_replacement: ", group)
                        print("is_keydown: ", is_keydown)
                        print(f"key_modifiers: {key_modifier} -> {new_key_modifiers}", )

                    # KEY REPLACEMENT handling
                    if len(group) == 2:              

                        if DEBUG: print("Key Replacement recognised: ", group)
                        # check for key_groups_state_is_pressed
                        
                        if should_activate(key_modifier) == True:
                            vk_code = group[1]  
                            key_directly_replaced = True

                        if new_key_modifiers[0] == 'reversed':
                            is_keydown = not is_keydown # with this can be tracked in tap_groups

                        # look for "suppress" as defined in vk_code_dict
                        # suppress event when found
                        if vk_code == 0:
                            if DEBUG: print("key suppressed: vk_code: ", group)
                            listener.suppress_event()   

                    # ALIAS handling
                    else:
                        # check for modifier
                        if DEBUG: print("ALIAS recognised!: ", group)

                        vk_codes = group[1:]

                        if should_activate(key_modifier) == True:
                            for i, code in enumerate(vk_codes):

                                is_mouse_key = check_for_mouse_vk_code(code)
                                key_code = get_key_code(is_mouse_key, code)

                                key_delays = key_groups_key_delays[group_index][i]

                                if DEBUG: print(i, code)

                                if new_key_modifiers[i] == None:
                                    controller_dict[is_mouse_key].press(key_code)
                                    delay(*key_delays)
                                    controller_dict[is_mouse_key].release(key_code) 
                                elif new_key_modifiers[i] == 'up':
                                    controller_dict[is_mouse_key].release(key_code)
                                elif new_key_modifiers[i] == 'down':
                                    controller_dict[is_mouse_key].press(key_code)
                                elif new_key_modifiers[i] == 'reversed': 
                                    controller_dict[is_mouse_key].release(key_code)
                                    delay(*key_delays)
                                    controller_dict[is_mouse_key].press(key_code)
                                delay(*key_delays)

                            listener.suppress_event()   
                    #


                        '''
                        [o] # key combination marked with + between keys: e.g. shift_left+u -> shift down, u down, u up, shift up
                            [x] somewhat solved by using -shift,key,+shift - even more flexible
                        [x] # key up and down marked by + and - before keys: e.g. -shift_left, n, e, w, +shift_left --> NEW
                            [x] # have to change reverse keys for it to work with -, but is similar in function
                        [x] maybe it is possible to also use + and - as modifier for the input_key,
                            [x] # to differentiate between key press and key release as trigger
                            [x] # 2 alias on one key usable then - one on press, one on release xD
                        [x] # though to the end: key groups will look like
                            -k,-shift,h,e,l,l,o,+shift          # k down -> HELLO
                            +k,-shift,w,o,r,l,d,+shift          # k up   -> WORLD
                            -l,-l,mouse_right                   # l down -> l down, right mouse click
                            h, u   # equivalent to h-,u-;h+,u+  # h will be replaced by u: h down -> u down, h up -> u up
                                # maybe really just define h-,u-;h+,u+ and split at ; (has to be compatible with shared typ_groups )

                        [x] # include delay for a key to change the delay after that key:
                                -h,-shift,h/10,e/5,l,l,o,+shift     # custom delay of 10 ms after h and 5 ms after e
                        
                        # problem is that key combination can not be recognised as an input
                            # global state list with 262 (0-261) elements for each key representing pressed or not
                            # global list with lists of all combinations to be tracked
                                # fast check by just asking if the indize of state_list[key of combination] is pressed
                            # global state of last_key_pressed
                            # comb_last_key_pressed for each combination
                                # e.g. tapgroup a,d
                                a pressed -> last_key_pressed = a
                                    state[a] = 1, looked up if in combination; set comb_last_key_pressed = a; a press send
                                d pressed -> last_key_pressed = d
                                    state[d] = 1 and d press send
                                    key combination triggered
                                        comb_last_key_pressed released
                                d released
                                    state[d] = 0 and d release send
                                    check combination for num of sum greater 1
                                        send comb_last_key_pressed
                                        ### but this is d which was released

                        # there might be the problem with aliases and tap groups that only a press or the release will be used for input.
                            # the other event will still be send? is that a problem?
                            # e.g. `-o*` or `-o, *supress` for "supress o press" as a key group
                        
                        # linux compatibility:
                            # replace win32_event_filter with generic on_press and on_release calls 
                            # supress=True to supress everything
                            # pipe through the script every input
                            # logic for not sendung key when used in key groups as trigger

                        # readme and description need a bigger update xD


                        '''         

        # Stop the listener if the END key is released
        if CONTROLS_ENABLED and vk_code == MENU_KEY and msg in WM_KEYUP:
            print('\n--- Stopping execution ---')
            listener.stop()

        # Stop the listener if the END key is released
        elif CONTROLS_ENABLED and vk_code == EXIT_KEY and msg in WM_KEYUP:
            print('\n--- Stopping execution ---')
            listener.stop()
            STOPPED = True
            exit()

        # Toggle paused/resume if the DELETE key is released
        elif CONTROLS_ENABLED and vk_code == TOGGLE_ON_OFF_KEY and msg in WM_KEYUP:
            if PAUSED:
                print('--- resumed ---')
                PAUSED = False
            else:
                print('--- paused ---')
                PAUSED = True

        # Snap Tap Part of Evaluation
        # Intercept key events if not PAUSED
        elif not PAUSED: # or not output_is_reversed:
            if DEBUG: print("#0")
            for group_index, group in enumerate(tap_groups_states_dict):
                if DEBUG: print(f"#1 {group_index, group}")
                if vk_code in group:
                    if key_directly_replaced: key_directly_replaced = False
                    if is_keydown: # and group[vk_code] == 0: #TODO ACT_6 repeating keys
                        group[vk_code] = 1
                        if DEBUG: print(f"#2 {vk_code}")
                        tap_groups_last_key_pressed[group_index] = vk_code
                        send_keys(which_key_to_send(group_index), group_index)
                    else:
                        group[vk_code] = 0
                        if DEBUG: print(f"#3 {vk_code}")
                        send_keys(which_key_to_send(group_index), group_index)
                    listener.suppress_event()
                    # only the first instance of a key will be actualized 
                    # - no handling for a single key in multiple tap groups
                    break

        # if replaced key was not handled by tap groupings, then just send new key event
        # if key_directly_replaced:
        #     if DEBUG: print(f"replacement vk_code: {vk_code}")

        #     is_mouse_key = check_for_mouse_vk_code(vk_code)
        #     key_code = get_key_code(is_mouse_key, vk_code)

        #     if is_keydown: # and not output_is_reversed:
        #         controller_dict[is_mouse_key].press(key_code)
        #     else:
        #         controller_dict[is_mouse_key].release(key_code)
        #     listener.suppress_event()

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
        # TODO: this will resent a released key if the released key was the last pressed ...
        # do we need a rolling state list?
        # or is it good enough?
        # should tap_groups_last_key_released also be tracked?
            # send only last key pressed of last_key_pressed != last_key_released

    return key_to_send

def send_keys(key_to_send, group_index):
    """
    Send the specified key and release the last key if necessary.
    """
    last_key_send = tap_groups_last_key_send[group_index]
    if DEBUG: 
        print(f"last_key_send: {last_key_send}")
        print(f"key_to_send: {key_to_send}")
    key_code_to_send = keyboard.KeyCode.from_vk(key_to_send)
    key_code_last_key_send = keyboard.KeyCode.from_vk(last_key_send)

    # repeat keys if activated, if not then only send keys when key changes
    if key_to_send != last_key_send:#

        if key_to_send is None:
            if last_key_send is not None:
                controller.release(key_code_last_key_send) 
            tap_groups_last_key_send[group_index] = None
        else:
            is_crossover = False
            if last_key_send is not None:
                # only use crossover when changinging keys, or else repeating will make movement stutter
                if key_to_send != last_key_send:
                    # only use crossover is activated and probility is over percentage
                    is_crossover = randint(0,100) > (100 - ACT_CROSSOVER_PROPABILITY_IN_PERCENT) and ACT_CROSSOVER # 50% possibility

                if is_crossover:
                    if DEBUG: print("crossover")
                    controller.press(key_code_to_send)
                else:
                    controller.release(key_code_last_key_send) 
                # random delay if activated
                if ACT_DELAY or ACT_CROSSOVER: 
                    delay = randint(ACT_MIN_DELAY_IN_MS, ACT_MAX_DELAY_IN_MS)
                    if DEBUG: print(f"delayed by {delay} ms")
                    sleep(delay / 1000) # in ms

            if is_crossover:
                controller.release(key_code_last_key_send) 
            else:
                controller.press(key_code_to_send) 

            tap_groups_last_key_send[group_index] = key_to_send

def display_menu():
    """
    Display the menu and handle user input
    """
    global PRINT_VK_CODES
    PRINT_VK_CODES = False
    invalid_input = False
    text = ""
    while True:       
        # clear the CLI
        if not DEBUG: os.system('cls||clear')
        if invalid_input:
            print(text)
            print("Please try again.\n")
            invalid_input = False
            text = ""
        print("Active Tap Groups:")
        display_groups(tap_groups)
        print("\nActive Key Groups:")
        display_groups(key_groups)
        print('\n------ Options Tap Groups -------')
        print("1. Add Tap Group")
        print("2. Delete Tap Group")
        print("3. Reset tap_groups.txt file")
        print('\n------ Options Key Groups -------')
        print("4. Add Key Group")
        print("5. Delete Key Group")
        print("6. Clear key_groups.txt file")
        print("\n7. Print vk_codes to identify keys")
        print("8. End Script")

        # empty input buffer before asking for next input
        while msvcrt.kbhit():
            msvcrt.getch()

        choice = input("\nHit [Enter] to start or enter your choice: ")

        if choice == '0':
            display_groups(tap_groups)
        elif choice == '1':
            try:
                new_group = input("Enter new tap group (keys separated by commas): ").replace(" ", "").split(',')
                add_group(new_group, tap_groups)
                initialize_tap_groups()
                save_groups(FILE_NAME_TAP_GROUPS, tap_groups)
            except KeyError as error_msg:
                text = f"Error: Wrong string as a key used: {error_msg}"
                invalid_input = True
                delete_group(len(tap_groups) - 1, tap_groups)
        elif choice == '2':
            try:
                index = int(input("Enter the index of the tap group to delete: "))
                if 0 <= index < len(tap_groups):
                    delete_group(index, tap_groups)
                    initialize_tap_groups()
                    save_groups(FILE_NAME_TAP_GROUPS, tap_groups)
                else:
                    text = "Error: Index outside of range of tap groups."
                    invalid_input = True
            except ValueError as error_msg:
                text = "Error: Index was not a Number."
                invalid_input = True
        elif choice == '3':
            reset_tap_groups_txt()
            initialize_tap_groups()
        elif choice == '4': 
            try:
                new_group = input("Enter keys seperated by comma (2 keys = replacement, 3+ = alias): ").replace(" ", "").split(',')
                if len(new_group) >= 2:
                    add_group(new_group, key_groups)
                    initialize_key_groups()
                    save_groups(FILE_NAME_KEY_GROUPS, key_groups)
                else:
                    text = "Error: at least 2 keys are needed."
                    invalid_input = True
            except KeyError as error_msg:
                text = f"Error: Wrong string as a key used: {error_msg}"
                invalid_input = True
                delete_group(len(key_groups) - 1, key_groups)
        elif choice == '5':
            try:
                index = int(input("Enter the index of the key pair to delete: "))
                if 0<= index < len(key_groups):
                    delete_group(index, key_groups)
                    initialize_key_groups()
                    save_groups(FILE_NAME_KEY_GROUPS, key_groups)
                else:
                    text = "Error: Index outside of range of key pairs."
                    invalid_input = True
            except ValueError as error_msg:
                text = "Error: Index was not a Number."
                invalid_input = True
        elif choice == '6':
            reset_key_groups_txt()
            initialize_key_groups()
        elif choice == '7':
            PRINT_VK_CODES = True
            break
        elif choice == '8':
            exit()
        elif choice == '':
            break
        else:
            text = "Error: Invalid input."
            invalid_input = True

def check_start_arguments():
    global DEBUG, MENU_ENABLED, CONTROLS_ENABLED
    global FILE_NAME_TAP_GROUPS, FILE_NAME_KEY_GROUPS
    global ACT_DELAY, ACT_CROSSOVER
    global ACT_MAX_DELAY_IN_MS, ACT_CROSSOVER_PROPABILITY_IN_PERCENT
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            if DEBUG: print(arg)
            # start directly without showing the menu
            if arg == "-nomenu":
                MENU_ENABLED = False
            # use custom tap groups file for loading and saving
            elif arg[:9] == '-tapfile=' and len(arg) > 9:
                FILE_NAME_TAP_GROUPS = arg[9:]
                if DEBUG: print(FILE_NAME_TAP_GROUPS)
            # use custom key groups file for loading and saving
            elif arg[:9] == '-keyfile=' and len(arg) > 9:
                FILE_NAME_KEY_GROUPS = arg[9:]
                if DEBUG: print(FILE_NAME_KEY_GROUPS)
            # Debug .. what else :-D
            elif arg == "-debug":
                DEBUG = True
            # Start with controls disabled
            elif arg == "-nocontrols":
                CONTROLS_ENABLED = False
            elif arg == "-delay":
                ACT_DELAY = True
            elif arg == "-crossover":
                ACT_CROSSOVER = True          
            elif arg[:7] == "-delay=" and len(arg) > 7:
                ACT_DELAY = True
                try:
                    delay = int(arg[7:])
                except:
                    print("invalid delay - needs to be a number")
                if 0 < delay <= 500:
                    ACT_MAX_DELAY_IN_MS = delay
                else:
                    print("delay not in range 0<delay<=500 ms")
            elif arg[:11] == "-crossover=" and len(arg) > 11:
                ACT_CROSSOVER = True    
                try:
                    probability = int(arg[11:])
                except:
                    print("invalid probability - needs to be a number")
                if 0 <= probability <= 100:
                    ACT_CROSSOVER_PROPABILITY_IN_PERCENT = probability
                else:
                    print("probability not in range 0<prob<=100 %")
            else:
                print("unknown start argument: ", arg)

if __name__ == "__main__":
    # check if start arguments are passed
    check_start_arguments()

    # try loading tap groups from file
    try:
        tap_groups = load_groups(FILE_NAME_TAP_GROUPS, tap_groups)
    # if no tap_groups.txt file exist create new one
    except FileNotFoundError:
        reset_tap_groups_txt()
    initialize_tap_groups()

    if DEBUG:
        print(f"tap_groups: {tap_groups}")
        print(f"tap_groups_states_dict: {tap_groups_states_dict}")

    # try loading key groups from file
    try:
        key_groups = load_groups(FILE_NAME_KEY_GROUPS, key_groups)
    # if no tap_groups.txt file exist create new one
    except FileNotFoundError:
        reset_key_groups_txt()
    initialize_key_groups()

    while not STOPPED:
        if MENU_ENABLED:
            display_menu()

        print('\n--- Free Snap Tap started ---')
        print('--- toggle PAUSED with DELETE key ---')
        print('--- STOP execution with END key ---')
        print('--- enter MENU again with PAGE_DOWN key ---')

        with keyboard.Listener(win32_event_filter=win32_event_filter) as listener:
            listener.join()
