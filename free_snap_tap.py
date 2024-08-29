from pynput import keyboard, mouse
from threading import Thread, Lock # to play aliases without interfering with keyboard listener
import os # to use clearing of CLI for better menu usage
import sys # to get start arguments
from random import randint # randint(3, 9)) 
from time import sleep # sleep(0.005) = 5 ms
import pygetwindow as gw # to get name of actual window for focusapp function

from vk_codes import vk_codes_dict
from tap_keyboard import Tap_Group, Key_Event, Key_Group, Key, Macro, Rebind

# global variables
DEBUG = False
PAUSED = False
MANUAL_PAUSED = False
STOPPED = False
MENU_ENABLED = True
CONTROLS_ENABLED = True
PRINT_VK_CODES = False

# for focus setting
paused_lock = Lock()
FOCUS_APP_NAME = None
FOCUS_THREAD_PAUSED = True

# AntiCheat testing (ACT)
ACT_DELAY = True
ACT_MIN_DELAY_IN_MS = 2
ACT_MAX_DELAY_IN_MS = 10
ACT_CROSSOVER = False # will also force delay
ACT_CROSSOVER_PROPABILITY_IN_PERCENT = 50

# Alias delay between presses and releases
ALIAS_MIN_DELAY_IN_MS = ACT_MIN_DELAY_IN_MS 
ALIAS_MAX_DELAY_IN_MS = ACT_MAX_DELAY_IN_MS

# Define File name for saving of Tap Groupings and Key Groups
# FILE_NAME_TAP_GROUPS = 'tap_groups.txt'
# FILE_NAME_KEY_GROUPS = 'key_groups.txt'
FILE_NAME_ALL = 'allinone.txt'

# Constants for key events
WM_KEYDOWN = [256,260] # _PRESS_MESSAGES = (_WM_KEYDOWN, _WM_SYSKEYDOWN)
WM_KEYUP = [257,261] # _RELEASE_MESSAGES = (_WM_KEYUP, _WM_SYSKEYUP)

# Control keys
EXIT_KEY = 35  # END key vkcode 35
TOGGLE_ON_OFF_KEY = 46  # DELETE key vkcode 46
MENU_KEY = 34 # PAGE_DOWN

# collect all active keys here for key combination 
current_keys = set()
triggers = [] # not used yet

# Tap groups define which keys are mutually exclusive
tap_groups_hr = []   # hr = human readable form - just a remainder of old implementation #legacy
# Key Groups define which key1 will be replaced by key2
# if a Key Group has more than 2 keys if will be handled als alias
rebinds_hr = [] #legacy
macros_hr = []

tap_groups = []     # [Tap_Groups]
rebinds = []        # Key_Event : Key_Event
macros = []         # [Key_Group : Key_Group]  # triggers are the Keys to the Item Makro

#key_groups = []     # [Key_Groups]

# Initialize the Controller
controller = keyboard.Controller()
mouse_controller = mouse.Controller()

controller_dict = {True: mouse_controller, False: controller}

mouse_vk_codes_dict = {1: mouse.Button.left, 
                       2: mouse.Button.right, 
                       4: mouse.Button.middle}
mouse_vk_codes = mouse_vk_codes_dict.keys()

def load_groups(file_name):
    global tap_groups_hr, rebinds_hr, macros_hr
    
    tap_groups_hr = []
    rebinds_hr = []
    macros_hr = []
    
    with open(file_name, 'r') as file:
        for line in file:
            if len(line) > 1:
                # strip all comments from line
                group = line.strip().replace(" ","").split(',')
                # ignore line if first char is a #
                if group[0][0] == '#':
                    pass
                else:
                    # remove commented out keys
                    cleaned_group = []
                    for key in group:
                        # ignore commented out keys
                        if key[0] != '#': 
                            # ignore comments after keys
                            cleaned_group.append(key.split('#')[0]) 
                    cleaned_line = ','.join(cleaned_group)

                    groups = cleaned_line.split(':')
                    # tap group
                    if len(groups) == 1: 
                        tap_groups_hr.append(groups[0].split(','))
                    # rebinds and macros
                    elif len(groups) == 2:
                        trigger_group = groups[0].split(',')
                        key_group = groups[1].split(',')
                        # rebind
                        if len(trigger_group) == 1 and len(key_group) == 1:
                            rebinds_hr.append([trigger_group, key_group])
                        # macro
                        else:
                            macros_hr.append([trigger_group, key_group])
                        

# def save_groups(file_name):
#     """
#     Save tap groups to a text file.
#     Each line in the file represents a tap group with keys separated by commas.
#     """
#     global tap_groups_hr, rebinds_hr, macros_hr
    
#     with open(file_name, 'w') as file:
#         # tapgroups
#         file.write("# Tap Groups\n")
#         for tap_group in tap_groups_hr:
#             # file.write(f"{tap_group}\n")
#             file.write(', '.join(tap_group)+'\n')         
#         # rebinds
#         file.write("# Rebinds\n")
#         for rebind in rebinds_hr:
#             file.write(' : '.join([', '.join(rebind[0]),', '.join(rebind[1])]))
#         # macros
#         file.write("# Macros\n")
#         for macro in macros_hr:
#             file.write(' : '.join([', '.join(macro[0]),', '.join(macro[1])]))


def display_groups():
    """
    Display the current tap groups.
    """
    global tap_groups_hr, rebinds_hr, macros_hr
    print("# Tap Groups")
    for index, tap_group in enumerate(tap_groups_hr):
        # print(f"{tap_group}\n")
        print(f"[{index}] " + ', '.join(tap_group)+'')         
    # rebinds
    print("\n# Rebinds")
    for index, rebind in enumerate(rebinds_hr):
        print(f"[{index}] " + ' : '.join([', '.join(rebind[0]),', '.join(rebind[1])]))
    # macros
    print("\n# Macros")
    for index, macro in enumerate(macros_hr):
        print(f"[{index}] " + ' : '.join([', '.join(macro[0]),', '.join(macro[1])]))

# def add_group(new_group, data_object):
#     """
#     Add a new tap group.
#     """
#     data_object.append(new_group)

# def delete_group(index, data_object):
#     """
#     Delete the tap group at the specified index.
#     """
#     if 0 <= index < len(data_object):
#         del data_object[index]

# def reset_tap_groups_txt():
#     """
#     Reset Tap Groups and save new tap_group.txt with a+d and w+s tap groups
#     """
#     global tap_groups_hr
#     tap_groups_hr = []
#     add_group(['a','d'], tap_groups_hr)
#     add_group(['w','s'], tap_groups_hr)
#     save_groups(FILE_NAME_ALL)

# def reset_key_groups_txt():
#     """
#     Reset key_groups and initialise empty txt file
#     """
#     global key_groups_hr, macros_hr
#     key_groups_hr = []
#     macros_hr = []
#     #add_group(['<','left_shift'], key_groups)
#     #add_group(['left_windows','left_control'], key_groups)
#     save_groups(FILE_NAME_ALL)

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


def initialize_groups():
    
    # in new form there are rebinds and macros
    # rebind are key_event -> key_event
    # key_group are a list of key_event
    # macros are key_group/trigger_group : key_groups
    
    global tap_groups   
    global rebinds
    global macros
    
    tap_groups = []
    rebinds = []
    macros = []
    
    def extract(key):
        #seperate delay info from string
        if '|' in key:
            key, *delays = key.split('|')
            if DEBUG: 
                print(f"delays for {key}: {delays}")
            # cast in int and ignore all other elements after first 2
            delays = [int(delay) for delay in delays[:2]]
        else:
            delays = [ALIAS_MAX_DELAY_IN_MS, ALIAS_MIN_DELAY_IN_MS]
            
        # if string empty, stop
        if key == '':
            return False
    
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
            elif key[0] == '!':
                # revers 
                key_modifier = 'reversed'
                key = key.replace('!','',1)

        # convert string to actual vk_code
        vk_code = convert_to_vk_code(key)
        return key, vk_code, key_modifier, delays
    
    for group in tap_groups_hr:
        keys = []
        for key_string in group:
            key = Key(key_string, convert_to_vk_code(key_string))
            keys.append(key)
        tap_groups.append(Tap_Group(keys))  
    
    for rebind in rebinds_hr:
        new_rebind = []
        print(rebind)
        for key in rebind:
            print(key)
            data = extract(key[0])
            if data is not False:
                key, vk_code, key_modifier, delays = data
                
                if key_modifier is None:
                    new_rebind.append(Key(key, vk_code, delays=delays))
                elif key_modifier == 'down':
                    new_rebind.append(Key_Event(vk_code, True, delays, key_string=key))
                elif key_modifier == 'up':
                    new_rebind.append(Key_Event(vk_code, False, delays, key_string=key))
                elif key_modifier == 'reversed':
                    new_rebind.append(Key(key, vk_code, delays=delays, reversed=True))
        rebinds.append(Rebind(new_rebind[0], new_rebind[1]))
                 
    for macro in macros_hr:
        new_macro = [[],[]]
        # trigger j = 0, key_group j = 1
        for j, key_group in enumerate(macro):

            new_key_group = Key_Group([])
            if DEBUG: 
                print(j, key_group)
            for key in key_group:
                data = extract(key)
                if data is not False:
                    key, vk_code, key_modifier, delays = data
                
                    if key_modifier is None:
                        new_key_group.append(Key(key,vk_code))
                    elif key_modifier == 'down':
                        new_key_group.append(Key_Event(vk_code, True, delays, key_string=key))
                    elif key_modifier == 'up':
                        new_key_group.append(Key_Event(vk_code, False, delays, key_string=key))
                    elif key_modifier == 'reversed':
                        new_key_group.append(Key(key,vk_code,reversed=True))

            new_macro[j] = new_key_group    
        macros.append(Macro(trigger=new_macro[0], key_events_to_play=new_macro[1]))
                      

    

def reload_all_groups():
    global FILE_NAME_TAP_GROUPS, tap_groups_hr
    # try loading tap groups from file
    try:
        load_groups(FILE_NAME_ALL)
    # if no tap_groups.txt file exist create new one
    except FileNotFoundError:
        reset_tap_groups_txt()
    initialize_groups()

def is_simulated_key_event(flags):
    return flags & 0x10

def is_press(msg):
    if msg in WM_KEYDOWN:
        return True
    if msg in WM_KEYUP:
        return False

def delay(max = ALIAS_MAX_DELAY_IN_MS, min = ALIAS_MIN_DELAY_IN_MS, ):
    if min > max: 
        min,max = max,min
    sleep(randint(min, max) / 1000)

def check_for_mouse_vk_code(vk_code):
    is_mouse_key = vk_code in mouse_vk_codes
    return is_mouse_key

def get_key_code(is_mouse_key, vk_code):
    if is_mouse_key:
        key_code = mouse_vk_codes_dict[vk_code]
    else:
        key_code = keyboard.KeyCode.from_vk(vk_code)
    return key_code

def alias_thread(group_index, group, key_groups_key_delays, new_key_modifiers):
    vk_codes = group[1:] 

    for index, code in enumerate(vk_codes):
        is_mouse_key = check_for_mouse_vk_code(code)
        key_code = get_key_code(is_mouse_key, code)

        key_delays = key_groups_key_delays[group_index][index + 1] #+1 to exclude first element

        if DEBUG: 
            print(index, code)

        if new_key_modifiers[index] is None:
            controller_dict[is_mouse_key].press(key_code)
            if ACT_DELAY: 
                delay(*key_delays)
            controller_dict[is_mouse_key].release(key_code) 
        elif new_key_modifiers[index] == 'up':
            controller_dict[is_mouse_key].release(key_code)
        elif new_key_modifiers[index] == 'down':
            controller_dict[is_mouse_key].press(key_code)
        elif new_key_modifiers[index] == 'reversed': 
            controller_dict[is_mouse_key].release(key_code)
            if ACT_DELAY: 
                delay(*key_delays)
            controller_dict[is_mouse_key].press(key_code)
        if ACT_DELAY: 
            delay(*key_delays)

def win32_event_filter(msg, data):
    """
    Filter and handle keyboard events.
    """
    global PAUSED, MANUAL_PAUSED, STOPPED, MENU_ENABLED
    global key_groups_key_modifier

    # def should_activate(key_modifier):
    #     activate = False
    #     # if no up or down is set, it will be fired at press and release of key
    #     # just to be consitent with the syntax
    #     if key_modifier is None:
    #         activate = True
    #     # only fire alias with release of key, not on press
    #     elif key_modifier == 'up':
    #         if not is_keydown:
    #             activate = True
    #     # only fire alias with press of key, not on release
    #     elif key_modifier == 'down':
    #         if is_keydown:
    #             activate = True
    #     # I do not know yet ...
    #     elif key_modifier == 'reversed': 
    #         pass
    #     return activate

    key_replaced = False
    alias_fired = False
    vk_code = data.vkCode
    is_keydown = is_press(msg)
    is_simulated = is_simulated_key_event(data.flags)
    
    current_ke = Key_Event(vk_code, is_keydown)
    
    
    
       

    if (PRINT_VK_CODES and is_keydown) or DEBUG:
        print(f"time: {data.time}, vk_code: {vk_code} - {"press  " if is_keydown else "release"} - {"simulated" if is_simulated else "real"}")

    # if DEBUG: 

    #     print(f"vk_code: {vk_code}")
    #     print("msg: ", msg)
    #     print("data: ", data)

    # check for simulated keys:
    if not is_simulated: # is_simulated_key_event(data.flags):
        
        ### collect input into active keys set
        if is_keydown:
            current_keys.add(vk_code)
        else:
            try:
                current_keys.remove(vk_code)
            except KeyError as error:
                print(f"Key not found to remove in current:, {error}")
                
                
        #         --------------
                
                
        # # Replace some Buttons :-D
        # if not PAUSED and not PRINT_VK_CODES:
            
        #     for rebind in rebinds:
        #         if current_ke == rebind[0]:
        #             current_ke = rebind[1]
        #         # geht nicht weil beides Keys sind und nicht key events
           
           
           
        #    ----------------
           
           
           
           
           
            for group_index, group in enumerate(key_groups_dict):

                trigger_key_modifier, *new_key_modifiers = key_groups_key_modifier[group_index]
                if vk_code == group[0] and should_activate(trigger_key_modifier):
                    if DEBUG: 
                        print("vk_code_gotten: ", vk_code)
                        print("vk_code_replacement: ", group)
                        print("is_keydown: ", is_keydown)
                        print(f"key_modifiers: {trigger_key_modifier} -> {new_key_modifiers}", )
                    # KEY REPLACEMENT handling
                    if len(group) == 2 and not key_replaced:              
                        if DEBUG: 
                            print("Key Replacement recognised: ", group)
                        # check for key_groups_state_is_pressed
                        vk_code = group[1]  
                        key_replaced = True
                        if new_key_modifiers[0] == 'reversed':
                            is_keydown = not is_keydown # with this can be tracked in groups
                        # suppress event when found
                        if vk_code == 0:
                            if DEBUG: 
                                print("key suppressed: vk_code: ", group)
                            listener.suppress_event() 
                        # deactive after replacement to not trigger any aliases
                        # break
                    # ALIAS handling
                    else:
                        alias_fired = True
                        if DEBUG: 
                            print("ALIAS recognised!: ", group)
                        # thread for better delay handler and to prevent dropping of key supression if delay to long
                        thread = Thread(target=alias_thread, daemon = True, args=(group_index, group, key_groups_key_delays, new_key_modifiers))
                        thread.start()

        # Stop the listener if the MENU key is released
        if CONTROLS_ENABLED and vk_code == MENU_KEY and not is_keydown:
            MENU_ENABLED = True
            print('\n--- Stopping execution ---')
            listener.stop()

        # Stop the listener if the END key is released
        elif CONTROLS_ENABLED and vk_code == EXIT_KEY and not is_keydown:
            print('\n--- Stopping execution ---')
            listener.stop()
            STOPPED = True
            exit()

        # Toggle paused/resume if the DELETE key is released
        elif CONTROLS_ENABLED and vk_code == TOGGLE_ON_OFF_KEY and not is_keydown:
            if PAUSED:
                reload_all_groups()
                print("--- tap and key groups reloaded ---")
                print('--- manuelly resumed ---')
                with paused_lock:
                    PAUSED = False
                    MANUAL_PAUSED = False
                # pause focus thread to allow manual overwrite and use without auto focus
                if FOCUS_APP_NAME is not None: 
                    focus_thread.pause()
            else:
                print('--- manually paused ---')
                with paused_lock:
                    PAUSED = True
                    MANUAL_PAUSED = True
                # restart focus thread when manual overwrite is over
                if FOCUS_APP_NAME is not None: 
                    focus_thread.restart()

        # Snap Tap Part of Evaluation
        # Intercept key events if not PAUSED
        elif not PAUSED and not PRINT_VK_CODES:
            if DEBUG: 
                print("#0")
                print(tap_groups)               
            for tap_group in tap_groups:
                if vk_code in tap_group.get_vk_codes():
                    if DEBUG: 
                        print(f"#2 {vk_code}")
                    if key_replaced is True:
                        key_replaced = False
                    tap_group.update_tap_states(vk_code, is_keydown)            
                    # send keys
                    send_keys(tap_group)
                    listener.suppress_event()
                    break
                               
        if key_replaced is True:
            is_mouse_key = check_for_mouse_vk_code(vk_code)
            key_code = get_key_code(is_mouse_key, vk_code)
            if is_keydown: # and not output_is_reversed:
                controller_dict[is_mouse_key].press(key_code)
            else:
                controller_dict[is_mouse_key].release(key_code)
            listener.suppress_event()
        
        # supress event that triggered an alias - done here because it should also update tap groups before
        if alias_fired is True:
            listener.suppress_event()
            
    # here arrive all key_events that will be send - last place to intercept
    # here the interception of interference of alias with tap groups is realized
    if is_simulated:
        for tap_group in tap_groups:
            vk_codes = tap_group.get_vk_codes()
            if vk_code in vk_codes:
                active_key = tap_group.get_active_key()
                # if None all simulated keys are allowed - so no supression
                if active_key is None:
                    pass
                else:
                    if active_key == vk_code:
                        # is active key -> only press allowed
                        if not is_keydown:
                            listener.suppress_event()
                    # not the active key -> only release allowed
                    else: 
                        if is_keydown:
                            listener.suppress_event()

def send_keys(tap_group):
    """
    Send the specified key and release the last key if necessary.
    """
    # TODO remove delay from here, because it stops listener for the time of delay also ...
    key_to_send = tap_group.get_active_key()
    last_key_send = tap_group.get_last_key_send()
    
    if DEBUG: 
        print(f"last_key_send: {last_key_send}")
        print(f"key_to_send: {key_to_send}")
        
    key_code_to_send = keyboard.KeyCode.from_vk(key_to_send)
    key_code_last_key_send = keyboard.KeyCode.from_vk(last_key_send)
    
    # only send if key to send is not the same as last key send
    if key_to_send != last_key_send:
        if key_to_send is None:
            if last_key_send is not None:
                controller.release(key_code_last_key_send) 
            tap_group.set_last_key_send(None)            
        else:
            is_crossover = False
            if last_key_send is not None:
                # only use crossover when changinging keys, or else repeating will make movement stutter
                if key_to_send != last_key_send:
                    # only use crossover is activated and probility is over percentage
                    is_crossover = randint(0,100) > (100 - ACT_CROSSOVER_PROPABILITY_IN_PERCENT) and ACT_CROSSOVER # 50% possibility
                if is_crossover:
                    if DEBUG: 
                        print("crossover")
                    controller.press(key_code_to_send)
                else:
                    controller.release(key_code_last_key_send) 
                # random delay if activated
                if ACT_DELAY or ACT_CROSSOVER: 
                    delay = randint(ACT_MIN_DELAY_IN_MS, ACT_MAX_DELAY_IN_MS)
                    if DEBUG: 
                        print(f"delayed by {delay} ms")
                    sleep(delay / 1000) # in ms
            if is_crossover:
                controller.release(key_code_last_key_send) 
            else:
                controller.press(key_code_to_send) 
            tap_group.set_last_key_send(key_to_send)
            
def display_menu():
    """
    Display the menu and handle user input
    """
    global PRINT_VK_CODES, DEBUG
    PRINT_VK_CODES = False
    invalid_input = False
    text = ""
    while True:       
        # clear the CLI
        if not DEBUG:
            os.system('cls||clear')
        if invalid_input:
            print(text)
            print("Please try again.\n")
            invalid_input = False
            text = ""
        display_groups()
        print('\n------ Options -------')
        print(f"1. Open file:'{FILE_NAME_ALL}' in your default editor.")
        print("2. Reload everything from file.")
        
        print("\n3. Print virtuell key codes to identify keys.")
        print("4. End the program/script.", flush=True)

        choice = input("\nHit [Enter] to start or enter your choice: " )

        if choice == '0':
            DEBUG = not DEBUG
        elif choice == '1':
            os.startfile(FILE_NAME_ALL)
        elif choice == '2':
            reload_all_groups()   
        elif choice == '3':
            PRINT_VK_CODES = True
            break
        elif choice == '4':
            exit()
        elif choice == '':
            break
        else:
            text = "Error: Invalid input."
            invalid_input = True

def check_start_arguments():
    global DEBUG, MENU_ENABLED, CONTROLS_ENABLED
    global FILE_NAME_TAP_GROUPS, FILE_NAME_KEY_GROUPS
    global ACT_DELAY, ACT_CROSSOVER, ACT_CROSSOVER_PROPABILITY_IN_PERCENT
    global ACT_MAX_DELAY_IN_MS, ACT_MIN_DELAY_IN_MS
    global ALIAS_MIN_DELAY_IN_MS, ALIAS_MAX_DELAY_IN_MS
    global FOCUS_APP_NAME
    
    def extract_delays(arg):
        try:
            delays = [int(delay) for delay in arg.replace(' ','').split(',')]
        except Exception:
            print("invalid delay - needs to be a number(s), seperated by comma")
        if len(delays) > 2:
            delays = delays[:2] # keep only first 2 numbers
        valid_delays = []
        for delay in delays:
            if 0 < delay <= 1000:
                valid_delays.append(delay)
            else:
                print("delay not in range 0<delay<=1000 ms")
        return sorted(valid_delays)
    
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            if DEBUG: 
                print(arg)
            # enable debug print outs
            if arg == "-debug":
                DEBUG = True
            # start directly without showing the menu
            elif arg == "-nomenu":
                MENU_ENABLED = False
            # use custom tap groups file for loading and saving
            elif arg[:9] == '-tapfile=' and len(arg) > 9:
                FILE_NAME_TAP_GROUPS = arg[9:]
                if DEBUG: 
                    print(FILE_NAME_TAP_GROUPS)
            # use custom key groups file for loading and saving
            elif arg[:9] == '-keyfile=' and len(arg) > 9:
                FILE_NAME_KEY_GROUPS = arg[9:]
                if DEBUG: 
                    print(FILE_NAME_KEY_GROUPS)
            # Start with controls disabled
            elif arg == "-nocontrols":
                CONTROLS_ENABLED = False
            elif arg == "-delay":
                ACT_DELAY = True
            elif arg[:10] == "-tapdelay=" and len(arg) > 10:
                ACT_DELAY = True
                ACT_MIN_DELAY_IN_MS, ACT_MAX_DELAY_IN_MS = extract_delays(arg[10:])
                print(f"Tap delays set to: min:{ACT_MIN_DELAY_IN_MS}, max:{ACT_MAX_DELAY_IN_MS}")
            elif arg[:12] == "-aliasdelay=" and len(arg) > 12:
                ACT_DELAY = True
                ALIAS_MIN_DELAY_IN_MS, ALIAS_MAX_DELAY_IN_MS = extract_delays(arg[12:])
                print(f"Alias delays set to: min:{ALIAS_MIN_DELAY_IN_MS}, max:{ALIAS_MAX_DELAY_IN_MS}")
            elif arg == "-crossover":
                ACT_CROSSOVER = True          
            elif arg[:11] == "-crossover=" and len(arg) > 11:
                ACT_CROSSOVER = True    
                try:
                    probability = int(arg[11:])
                except Exception:
                    print("invalid probability - needs to be a number")
                if 0 <= probability <= 100:
                    ACT_CROSSOVER_PROPABILITY_IN_PERCENT = probability
                else:
                    print("probability not in range 0<prob<=100 %")
            elif arg == "-nodelay":
                ACT_DELAY = False
                ACT_CROSSOVER = False
                print("delay+crossover deactivated")
            elif arg[:10] == "-focusapp="  and len(arg) > 10:
                FOCUS_APP_NAME = arg[10:]
                print(f"> Set app focus to: {FOCUS_APP_NAME}")
            else:
                print("unknown start argument: ", arg)

class Focus_Thread(Thread):
    '''
    Thread for observing the active window and pause toggle the evaluation of key events
    can be manually overwritten by Controls on DEL
    reloads key and tap files on resume
    '''

    def __init__(self, focus_app_name):
        Thread.__init__(self)
        self.stop = False
        self.daemon = True
        self.focus_app_name = focus_app_name.lower()

    def run(self):
        global PAUSED, MANUAL_PAUSED, paused_lock, FOCUS_THREAD_PAUSED
        last_active_window = ''
        while not self.stop:
            try:
                active_window = gw.getActiveWindow().title
            except AttributeError:
                pass
            if FOCUS_THREAD_PAUSED is False and MANUAL_PAUSED is False:
                if active_window.lower().find(self.focus_app_name) >= 0:
                    if PAUSED:
                        try:
                            reload_all_groups()
                            print("--- tap and key groups successful reloaded ---")
                            print('--- auto focus resumed ---')
                            with paused_lock:
                                PAUSED = False
                        except Exception:
                            print('--- reloading of groups files failed - not resumed, still paused ---')
                else:
                    if not PAUSED:
                        with paused_lock:
                            PAUSED = True
                        print('--- auto focus paused ---')
                    # print out active window when paused and it changes
                    # to help find the name :-D
                    else:
                        if last_active_window != active_window:
                            print(f"> Active Window: {active_window}")
                            last_active_window = active_window
            sleep(1)

    def pause(self):
        global FOCUS_THREAD_PAUSED
        with paused_lock:
            FOCUS_THREAD_PAUSED = True

    def restart(self):
        global FOCUS_THREAD_PAUSED, MANUAL_PAUSED
        if FOCUS_THREAD_PAUSED:
            with paused_lock:
                FOCUS_THREAD_PAUSED = False
                MANUAL_PAUSED = False

    def end(self):
        self.stop = True

def main2():
    global listener
    global focus_thread
     # check if start arguments are passed
    check_start_arguments()

    # try loading tap groups from file
    reload_all_groups()

    if DEBUG:
        print(f"tap_groups_hr: {tap_groups_hr}")
        print(f"tap_groups: {tap_groups}")


    if FOCUS_APP_NAME is not None:
        focus_thread = Focus_Thread(FOCUS_APP_NAME)
        focus_thread.start()

    while not STOPPED:
        if MENU_ENABLED:
            if FOCUS_APP_NAME is not None:
                focus_thread.pause()
            display_menu()

        print('\n--- Free Snap Tap started ---')
        print('--- toggle PAUSED with DELETE key ---')
        print('--- STOP execution with END key ---')
        print('--- enter MENU again with PAGE_DOWN key ---')
        if FOCUS_APP_NAME is not None:
            focus_thread.restart()

        with keyboard.Listener(win32_event_filter=win32_event_filter) as listener:
            listener.join()

    if FOCUS_APP_NAME is not None:
        focus_thread.end()
    sys.exit(1)
    
def main():
    #reset_tap_groups_txt()
    reload_all_groups()
    print(tap_groups)
    print(rebinds)
    print(macros)
    display_groups()
    
if __name__ == "__main__":
   main2()