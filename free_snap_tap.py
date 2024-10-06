from pynput import keyboard, mouse
from threading import Thread, Lock, Event # to play aliases without interfering with keyboard listener
from os import system, startfile # to use clearing of CLI for better menu usage and opening config file
import sys # to get start arguments
import msvcrt # to flush input stream
from random import randint # randint(3, 9)) 
from time import time, sleep # sleep(0.005) = 5 ms
import pygetwindow as gw # to get name of actual window for focusapp function

from vk_codes import vk_codes_dict  #change the keys you need here in vk_codes_dict.py
from tap_keyboard import Key_Event, Key_Group, Key, Tap_Group
# from tap_threads import Focus_Thread, Repeat_Thread, Alias_Thread

import tkinter as tk

DEBUG3 = False

# Control key combinations
EXIT_Combination = ["alt", "end"] # END key vkcode 35, ALT 164
TOGGLE_ON_OFF_Combination = ["alt", "delete"]  # DELETE key vkcode 46
MENU_Combination = ["alt", "page_down"] # PAGE_DOWN

# Define File name for saving of everything, can be any filetype
# But .txt or .cfg recommended for easier editing
FILE_NAME = 'FSTconfig.txt'

sys_start_args = []


'convenience functions'
def time_in_millisec():
    return int(time() * 1000)



# decorator type_check
def type_check(expected_type):
    def decorator(func):
        def wrapper(self, value):
            if not isinstance(value, expected_type):
                raise TypeError(f"Expected {expected_type}, got {type(value)}")
            return func(self, value)
        return wrapper
    return decorator


class Output_Manager():

    def __init__(self, tap_keyboard):
        # self._argument_manager = argument_manager
        # self._state_manager = state_manager
        self._tk = tap_keyboard
    #
        # Initialize the Controller
        self._keyboard_controller = keyboard.Controller()
        self._mouse_controller = mouse.Controller()
        self._controller_dict = {True: self._mouse_controller, False: self._keyboard_controller}
        self._mouse_vk_codes_dict = {   1: mouse.Button.left, 
                                        2: mouse.Button.right, 
                                        3: mouse.Button.middle,
                                        4: mouse.Button.x1,
                                        5: mouse.Button.x2,
                                        }
        self._mouse_vk_codes = self._mouse_vk_codes_dict.keys()
        self._repeat_thread_dict = {}
        
    @property
    def repeat_thread_dict(self):
        return self._repeat_thread_dict
    
    @repeat_thread_dict.setter
    @type_check(dict)
    def repeat_thread_dict(self, new_dict):
        self._repeat_thread_dict = new_dict
        
    'send keys and suffix evaluation'

    def get_random_delay(self, max, min):
        if min > max: 
            min,max = max,min
        return randint(min, max)        
    
    def get_key_code(self, is_mouse_key, vk_code):
        if is_mouse_key:
            key_code = self._mouse_vk_codes_dict[vk_code]
        else:
            key_code = keyboard.KeyCode.from_vk(vk_code)
        return key_code

    def check_constraint_fulfillment(self, key_event, get_also_delays=False):
        fullfilled = True
        temp_delays = []
        for constraint in key_event.constraints:
            if isinstance(constraint, int):
                temp_delays.append(constraint)
            elif isinstance(constraint, str):
                result = self.constraint_evaluation(constraint, key_event)
                if isinstance(result, bool):
                    fullfilled = fullfilled and result
                elif isinstance(result, int):
                    temp_delays.append(result)
                elif result is None:
                    pass
                else:
                    print(f"! Constraint {constraint} is not valid.")
                    
        if get_also_delays:
            return fullfilled, temp_delays
        else:
            return fullfilled
                                        
    def execute_key_event(self, key_event, delay_times = [], with_delay=False, stop_event=None):
        
        if len(delay_times) == 0:
            delay_times = [self._tk.args.ALIAS_MAX_DELAY_IN_MS, self._tk.args.ALIAS_MIN_DELAY_IN_MS]
        elif len(delay_times) == 1:
            delay_times = delay_times*2
        elif len(delay_times) == 2:
            pass
        else:
            delay_times = delay_times[:2]
        
        self.send_key_event(key_event)
        
        if self._tk._args.ACT_DELAY and with_delay:
            delay_time = self.get_random_delay(*delay_times)
            # print(f" --- waiting for: {delay_time}")
            # if not in a thread just play sleep for the delay
            if stop_event is None:
                sleep(delay_time / 1000)
            # if in thread, sleep in increments and break if stop_event is set
            else:
                sleep_increment = 5 # 5 ms
                num_sleep_increments = (delay_time // sleep_increment )
                num_sleep_rest = (delay_time % sleep_increment)
                if self._tk.args.DEBUG: 
                    print(f"incremental delay: {delay_time}, num_sleep_increments {num_sleep_increments}, num_sleep_rest {num_sleep_rest}")
                sleep(num_sleep_rest / 1000)
                for i in range(num_sleep_increments):
                    if not stop_event.is_set():
                        sleep(sleep_increment / 1000)
                    else:
                        if self._tk.args.DEBUG:
                            print("stop event recognised")
                        break

    def constraint_evaluation(self, constraint_to_evaluate, current_ke):
        
        # first get vk_code and is_press
        def get_vk_code_and_press_from_keystring(key_string):
            vk_code, is_press = None, None
            # without modifier it will be interpreted as a release
            if key_string[0] in ['+', '!']:
                is_press = False
                key_string = key_string[1:]
            elif key_string[0] == '-':
                is_press = True
                key_string = key_string[1:]
            else:
                is_press = False  
            vk_code = self.convert_to_vk_code(key_string.strip('"').strip("'"))
            return vk_code, is_press
        
        def get_key_time_template(key_string, time_list):
            '''
            template for all press and release time functions -> time in ms
            '''
            _, _, time_released, time_pressed = time_list
            vk_code, is_press = self.get_vk_code_and_press_from_keystring(key_string)
            key_time = 0
            if is_press:
                try:
                    key_time = time_released[vk_code]
                    if self._tk.args.DEBUG2:
                        print(f"vk_code: {vk_code} time released: {key_time}")
                except KeyError as error:
                    print(f"time_release: no value yet for vk_code: {error}")     
                    return 0
            else:
                try:
                    key_time = time_pressed[vk_code]
                    if self._tk.args.DEBUG2:
                        print(f"vk_code: {vk_code} time pressed: {key_time}")
                except KeyError as error:
                    print(f"time_press: no value yet for vk_code: {error}")
                    return 0
            return key_time
        
        def tr(key_string):
            '''
            real press and release time function -> time in ms
            '''
            return get_key_time_template(key_string, self._tk.state_manager.time_real)
        
        def ts(key_string):
            '''
            simulated press and release time function -> time in ms
            '''
            return get_key_time_template(key_string, self._tk.state_manager.time_simulated)
        
        def ta(key_string):
            '''
            all combined (real and simulated) press and release time function -> time in ms
            '''
            return get_key_time_template(key_string, self._tk.state_manager.time_all)
        
        # hardcoded counterstrafe with a polynomial function to destribe acceleration
        def cs(key_string):
            x = tr(key_string)
            if x > 500:
                velocity = 250
            else:
                a = -0.001
                b = 0.97
                c = 12
                velocity = a*pow(x,2) + b*x + c
            # 100 ms at velo of 250 units/sec breaktime
            # just a guess for now
            breaktime = velocity * 100 / 250
            return round(breaktime)
            
        # hardcoded counterstrafe linear
        def csl(key_string):
            x = tr(key_string)
            if x > 500:
                breaktime = 100
            else:
                breaktime = x / (500/100)
            return round(breaktime)
        
        # press of real keys
        def p(key_string):
            vk_code, _ = self.get_vk_code_and_press_from_keystring(key_string)
            return vk_code in self._tk.state_manager.pressed_keys
        # release of real keys
        
        def r(key_string):
            return not p(key_string)   
        
        # press of all keys (incl simulated)
        def ap(key_string):
            vk_code, _ = self.get_vk_code_and_press_from_keystring(key_string)
            try:
                return self._tk.state_manager.all_key_press_states_dict[vk_code]
            except KeyError:
                return False
            
        # relese of all keys (incl simulated)
        def ar(key_string):
            return not ap(key_string)   

        # give out time since last key press/release
        def last(key_string, time_list = self._tk.state_manager.time_real):
            time_last_pressed, time_last_released, _, _ = time_list
            vk_code, is_press = get_vk_code_and_press_from_keystring(key_string)
            try:
                if self._tk.args.DEBUG:
                    print(time_in_millisec() - self._tk.TIME_DIFF)
                    print(time_last_pressed[vk_code])
                current_time = time_in_millisec() - self._tk.TIME_DIFF
                return current_time - time_last_pressed[vk_code] if is_press else current_time - time_last_released[vk_code]
            except KeyError:
                return 0
            
        # double click - gets the time since the last click  
        def dc(key_string = None, time_list = self._tk.state_manager.time_real):
            _, _, time_released, time_pressed = time_list
            # use current key event that activated trigger to get reliable double click
            if key_string is None:
                vk_code = current_ke.vk_code
            else:
                vk_code, _ = self.get_vk_code_and_press_from_keystring(key_string)
            try:
                if self._tk.args.DEBUG:
                    print(time_released[vk_code] + time_pressed[vk_code])
                return time_released[vk_code] + time_pressed[vk_code]
            except KeyError:
                ##2
                return 9999
            
        def repeat(key_string):
            repeat_time = int(key_string)
                    
            # reset stop event
            stop_event = Event()

            repeat_thread = Repeat_Thread(current_ke, stop_event, repeat_time, time_increment=500)
            # save thread and stop event to find it again for possible interruption
            self._repeat_thread_dict[current_ke] = [repeat_thread, stop_event]
            repeat_thread.start() 
            return None
        
        def stop_repeat():
            try:
                repeat_thread, stop_event = self._repeat_thread_dict[current_ke]
                if repeat_thread.is_alive():
                    if self._tk.args.DEBUG:
                        print(f"{current_ke}-repeat: still alive - try to stop")
                    stop_event.set()
                    ##1
                    repeat_thread.join()
            except KeyError:
                # this thread was not started before
                pass
            return True
        
        def toggle_repeat(key_string):
            try:
                repeat_thread, stop_event = self._repeat_thread_dict[current_ke]
                if repeat_thread.is_alive():
                    print(f"stopping repeat for {current_ke}")
                    stop_event.set()
                    repeat_thread.join()
                else:
                    #print(f"{current_ke} restarting repeat")
                    repeat(key_string)
            except KeyError:
                # this thread was not started before
                #print(f"{current_ke} starting repeat for first time")
                repeat(key_string)
            return False
        
        def reset_timer():
            try:
                repeat_thread, _ = self._repeat_thread_dict[current_ke]
                if repeat_thread.is_alive():
                    repeat_thread.reset_timer()
            except KeyError:
                pass
            return True

        easy_eval_succeeded = False
        first_char = constraint_to_evaluate[0]
        if first_char in ['!', '+', '-']:
            try:
                vk_code, is_press = get_vk_code_and_press_from_keystring(constraint_to_evaluate)
                easy_eval_succeeded = True
                try:
                    key_press = self._tk.state_manager.all_key_press_states_dict[vk_code]
                except KeyError:
                    key_press = False
                if is_press == key_press:
                    return True
                else:
                    return False
            except Exception as error:
                print(error)
                
        
        if not easy_eval_succeeded:
            result = eval(constraint_to_evaluate)
            ### print(f"result of '{constraint_to_evaluate}' is '{result}'")
            if self._tk.args.DEBUG2:
                print(f"evaluated {constraint_to_evaluate} to: {result}")
            # if it is a number and if negativ change it to 0
            if isinstance(result, float):
                result = int(result)
            if isinstance(result, int):
                if result < 0:
                    result = 0    
            if result is None:
                result = True

            return result
    
    def send_key_event(self, key_event):
        
        def check_for_mouse_vk_code(vk_code):
            return vk_code in self._mouse_vk_codes
        
        vk_code, is_press, _ = key_event.get_all()
        
        is_mouse_key = check_for_mouse_vk_code(vk_code)
        key_code = self.get_key_code(is_mouse_key, vk_code)
        if is_press:
            self._controller_dict[is_mouse_key].press(key_code)
        else:
            self._controller_dict[is_mouse_key].release(key_code)          

    def send_keys_for_tap_group(self, tap_group):
        """
        Send the specified key and release the last key if necessary.
        """
        # TODO remove delay from here, because it stops listener for the time of delay also ...
        key_to_send = tap_group.get_active_key()
        last_key_send = tap_group.get_last_key_send()
        
        if self._tk.args.DEBUG: 
            print(f"last_key_send: {last_key_send}")
            print(f"key_to_send: {key_to_send}")
            
        key_code_to_send = keyboard.KeyCode.from_vk(key_to_send)
        key_code_last_key_send = keyboard.KeyCode.from_vk(last_key_send)
        
        # only send if key to send is not the same as last key send
        if key_to_send != last_key_send:
            if key_to_send is None:
                if last_key_send is not None:
                    self._keyboard_controller.release(key_code_last_key_send) 
                tap_group.set_last_key_send(None)            
            else:
                is_crossover = False
                if last_key_send is not None:
                    # only use crossover when changinging keys, or else repeating will make movement stutter
                    if key_to_send != last_key_send:
                        # only use crossover is activated and probility is over percentage
                        is_crossover = randint(0,100) > (100 - self._tk.args.ACT_CROSSOVER_PROPABILITY_IN_PERCENT) and self._tk.args.ACT_CROSSOVER # 50% possibility
                    if is_crossover:
                        if self._tk.args.DEBUG: 
                            print("crossover")
                        self._keyboard_controller.press(key_code_to_send)
                    else:
                        self._keyboard_controller.release(key_code_last_key_send) 
                    # random delay if activated
                    if self._tk.args.ACT_DELAY or self._tk.args.ACT_CROSSOVER: 
                        delay = randint(self._tk.args.ACT_MIN_DELAY_IN_MS, self._tk.args.ACT_MAX_DELAY_IN_MS)
                        if self._tk.args.DEBUG: 
                            print(f"delayed by {delay} ms")
                        sleep(delay / 1000) # in ms
                if is_crossover:
                    self._keyboard_controller.release(key_code_last_key_send) 
                else:
                    self._keyboard_controller.press(key_code_to_send) 
                tap_group.set_last_key_send(key_to_send)

class Config_Manager():
    '''
    file handling and hr display of groups
    takes a file for input and saves the ouput in a focus_manager
    '''
    
    def __init__(self, file_name = None, focus_manager = None):
        self._file_name = file_name
        self._fm = focus_manager
        
        # hr = human readable form - saves the lines cleaned of comments and presorted
        # these will be shown in menu, because internally they look a bit different (esp rebinds)
        self._tap_groups_hr = []
        self._rebinds_hr = []
        self._macros_hr = []
        
        
        
    @property
    def file_name(self):
        return self._file_name
    
    @file_name.setter
    @type_check(str)
    def file_name(self, new_file_name):
        self._file_name = new_file_name
        
    @property
    def focus_manager(self):
        return self._fm
    
    @focus_manager.setter
    @type_check(str)
    def focus_manager(self, new_focus_manager):
        self._fm = new_focus_manager
        
    @property
    def tap_groups_hr(self):
        return self._tap_groups_hr
    @property
    def rebinds_hr(self):
        return self._rebinds_hr
    @property
    def macros_hr(self):
        return self._macros_hr
    
        
    def load_config(self):
        # try loading  from file
        try:
            self._load_from_file()
        # if no file exist create new one
        except FileNotFoundError:
            self.create_new_group_file()    
            

    def _load_from_file(self):
        '''
        reads in the file and removes the commented out lines, keys and inline comments;
        joins multiline macro sequences; 
        '''    

        def clean_lines(lines):
            comments_cleaned_lines = []
            for line in lines:
                if len(line) > 1:
                    if line.startswith('<focus>'):
                        comments_cleaned_lines.append(line)
                    else:
                        line = line.strip().replace(" ","")
                        if len(line) > 1:
                            # strip all comments from line
                            group = line.split(',')
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
                                    # if commented out key before :, add :
                                    elif key.find(':') >= 0:
                                        cleaned_group.append(':')
                                        
                                cleaned_line = ','.join(cleaned_group)
                                comments_cleaned_lines.append(cleaned_line)
            
            # clean multiline macro seauences and joins them together
            multiline_cleaned_lines = []
            for line in comments_cleaned_lines:
                if len(line) > 1 and line[0] == ':':
                    # add multiline to last multiline sequence
                    multiline_cleaned_lines[-1] += line
                else:
                    multiline_cleaned_lines.append(line)
                    
            return multiline_cleaned_lines

        temp_file = []
        with open(self._file_name, 'r') as file:
            for line in file:
                temp_file.append(line) 

        cleaned_lines = clean_lines(temp_file) 
            
        focus_name = None
        multi_focus_dict = {}
        default_start_arguments = []
        default_group_lines = []
        
        if DEBUG3:
            print(cleaned_lines)
        
        for line in cleaned_lines:
            if line.startswith('<focus>'):
                focus_name = line.replace('<focus>', '').replace('\n', '').lower()
                multi_focus_dict[focus_name] = [[], []]
            elif line.startswith('<arg>'):
                line = line.replace('<arg>', '').replace('\n', '').lower()
                if focus_name is None:
                    default_start_arguments.append(line)
                else:
                    multi_focus_dict[focus_name][0].append(line)
            else:
                if focus_name is None:
                    default_group_lines.append(line)
                else:
                    multi_focus_dict[focus_name][1].append(line)

        self._fm.multi_focus_dict = multi_focus_dict
        self._fm.default_start_arguments = default_start_arguments
        self._fm.default_group_lines = default_group_lines
        
    def write_out_new_file(self):
        """
        Create a new file if config file was not found with minimal tap groups

        """
        
        with open(self._file_name, 'w') as file:
            # tapgroups
            file.write("# Tap Groups\n")
            for tap_group in self._tap_groups_hr:
                # file.write(f"{tap_group}\n")
                file.write(', '.join(tap_group)+'\n')         
            # rebinds
            file.write("# Rebinds\n")
            # for rebind in self._rebinds_hr:
            #     file.write(' : '.join([', '.join(rebind[0]),', '.join(rebind[1])]))
            # macros
            file.write("# Macros\n")
            # for macro in self._macros_hr:
            #     # TODO: to adapt to save key sequences - necessary - mainly used to create new file if none found
            #     file.write(' :: '.join([', '.join(macro[0]),', '.join(macro[1])]))
        
    def presort_lines(self, lines):
        '''
        saves cleaned lines according to formatting in different containers;
        saved in variable_hr (human readable)
        '''
        self._tap_groups_hr = []
        self._rebinds_hr = []
        self._macros_hr = []
        
        # sort the lines into their categories for later initialization
        for line in lines:                   
            groups = line.split(':')
            # tap groups
            if len(groups) == 1: 
                self._tap_groups_hr.append(groups[0].split(','))
            # rebinds
            elif len(groups) == 2:
                trigger_group = groups[0].split(',')
                key_group = groups[1].split(',')
                # rebind
                # if len(trigger_group) == 1 and len(key_group) == 1:
                if len(key_group) == 1:
                    self._rebinds_hr.append([trigger_group, key_group[0]])
                else:
                    print(f"{key_group} is not a valid rebind (only one key_event/key allowed") 
                    print("   use :: instead of : to declare it as a macro")
                # macro
            elif len(groups) > 2 and len(groups[1]) == 0:
                trigger_group = groups[0].split(',')
                if len(groups) > 3:
                    # for group in groups[2:]:
                    #     trigger_group.append(group.split(','))
                    key_groups = [group.split(',') for group in groups[2:]]
                    self._macros_hr.append([trigger_group] + key_groups)
                else:
                    key_group = groups[2].split(',')
                    self._macros_hr.append([trigger_group, key_group])
                    
    def display_groups(self):
        """
        Display the current tap groups.
        """
        
        print("# Tap Groups")
        for index, tap_group in enumerate(self._tap_groups_hr):
            # print(f"{tap_group}\n")
            print(f"[{index}] " + ', '.join(tap_group)+'')         
        # rebinds
        print("\n# Rebinds")
        for index, rebind in enumerate(self._rebinds_hr):
            # print(f"[{index}] " + ' : '.join([rebind[0], rebind[1]]))
            print(f"[{index}] " + ' : '.join([', '.join(rebind[0]), rebind[1]]))
        # macros
        print("\n# Macros")
        for index, *group in enumerate(self._macros_hr):
            group = group[0]
            first_line = f"[{index}] " + ' :: '.join([', '.join(group[0]),', '.join(group[1])])
            position = first_line.find('::')
            print(first_line)
            if len(group) > 2:
                for gr in group[2:]:
                    print(" " * (position+1) + ": " + ', '.join(gr))

    def add_group(self, new_group, data_object):
        """
        Add a new tap group.
        """
        data_object.append(new_group)

    def create_new_group_file(self):
        """
        Reset Tap Groups and save new tap_group.txt with a+d and w+s tap groups
        """
        self._tap_groups_hr = []
        self.add_group(['a','d'], self._tap_groups_hr)
        self.add_group(['w','s'], self._tap_groups_hr)
        self.write_out_new_file()

class Argument_Manager():
    ### config of these variables should be done via config
    ## config manager has the control over the arguments

    STATUS_INDICATOR = False
    STATUS_INDICATOR_SIZE = 100
    CROSSHAIR_ENABLED = False
    CROSSHAIR_DELTA_X = 0
    CROSSHAIR_DELTA_Y = 0

    # global variables
    DEBUG = False
    DEBUG2 = False
    WIN32_FILTER_PAUSED = True
    MANUAL_PAUSED = False
    STOPPED = False
    MENU_ENABLED = True
    CONTROLS_ENABLED = True
    PRINT_VK_CODES = False

    EXEC_ONLY_ONE_TRIGGERED_MACRO = False

    # AntiCheat testing (ACT)
    ACT_DELAY = True
    ACT_MIN_DELAY_IN_MS = 2
    ACT_MAX_DELAY_IN_MS = 10
    ACT_CROSSOVER = False # will also force delay
    ACT_CROSSOVER_PROPABILITY_IN_PERCENT = 50

    # Alias delay between presses and releases
    ALIAS_MIN_DELAY_IN_MS = ACT_MIN_DELAY_IN_MS 
    ALIAS_MAX_DELAY_IN_MS = ACT_MAX_DELAY_IN_MS

    def __init__(self, tap_keyboard):
        self._tk = tap_keyboard
        self.reset_global_variable_changes()
        
    def reset_global_variable_changes(self):
        print("--- reset arguments")
        self.DEBUG = Argument_Manager.DEBUG
        self.MENU_ENABLED = Argument_Manager.MENU_ENABLED
        self.CONTROLS_ENABLED = Argument_Manager.CONTROLS_ENABLED
        self.ACT_DELAY = Argument_Manager.ACT_DELAY
        self.ACT_CROSSOVER = Argument_Manager.ACT_CROSSOVER
        self.ACT_CROSSOVER_PROPABILITY_IN_PERCENT = Argument_Manager.ACT_CROSSOVER_PROPABILITY_IN_PERCENT
        self.ACT_MIN_DELAY_IN_MS = Argument_Manager.ACT_MIN_DELAY_IN_MS
        self.ACT_MAX_DELAY_IN_MS = Argument_Manager.ACT_MAX_DELAY_IN_MS
        self.ALIAS_MIN_DELAY_IN_MS = Argument_Manager.ALIAS_MIN_DELAY_IN_MS 
        self.ALIAS_MAX_DELAY_IN_MS = Argument_Manager.ALIAS_MAX_DELAY_IN_MS   
        self.EXEC_ONLY_ONE_TRIGGERED_MACRO = Argument_Manager.EXEC_ONLY_ONE_TRIGGERED_MACRO
        self.STATUS_INDICATOR = Argument_Manager.STATUS_INDICATOR
        self.STATUS_INDICATOR_SIZE = Argument_Manager.STATUS_INDICATOR_SIZE
        self.CROSSHAIR_ENABLED = Argument_Manager.CROSSHAIR_ENABLED
        self.CROSSHAIR_DELTA_X = Argument_Manager.CROSSHAIR_DELTA_X
        self.CROSSHAIR_DELTA_Y = Argument_Manager.CROSSHAIR_DELTA_Y

    'start argument handling'
    def apply_start_arguments(self, argv):
        print(f"apply arguments: {argv}")
        
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
        

        for arg in argv:
            # if commented out do nothing
            if arg[0] == ':' or '#':
                pass
            if self.DEBUG: 
                print(arg)
            # enable debug print outs
            if arg == "-debug":
                self.DEBUG = True
            # start directly without showing the menu
            elif arg == "-nomenu":
                self.MENU_ENABLED = False
            # use custom tap groups file for loading and saving
            elif arg[:6] == '-file=' and len(arg) > 6:
                file_name = arg[6:]
                if self.DEBUG: 
                    print(file_name)
                self._tk.config_manager.file_name = file_name
            # Start with controls disabled
            elif arg == "-nocontrols":
                self.CONTROLS_ENABLED = False
            elif arg == "-delay":
                self.ACT_DELAY = True
            elif arg[:10] == "-tapdelay=" and len(arg) > 10:
                self.ACT_DELAY = True
                self.ACT_MIN_DELAY_IN_MS, self.ACT_MAX_DELAY_IN_MS = extract_delays(arg[10:])
                print(f"Tap delays set to: min:{self.ACT_MIN_DELAY_IN_MS}, max:{self.ACT_MAX_DELAY_IN_MS}")
            elif arg[:12] == "-aliasdelay=" and len(arg) > 12:
                self.ACT_DELAY = True
                self.ALIAS_MIN_DELAY_IN_MS, self.ALIAS_MAX_DELAY_IN_MS = extract_delays(arg[12:])
                print(f"Alias delays set to: min:{self.ALIAS_MIN_DELAY_IN_MS}, max:{self.ALIAS_MAX_DELAY_IN_MS}")
            elif arg == "-crossover":
                self.ACT_CROSSOVER = True          
            elif arg[:11] == "-crossover=" and len(arg) > 11:
                self.ACT_CROSSOVER = True    
                try:
                    probability = int(arg[11:])
                except Exception:
                    print("invalid probability - needs to be a number")
                if 0 <= probability <= 100:
                    self.ACT_CROSSOVER_PROPABILITY_IN_PERCENT = probability
                else:
                    print("probability not in range 0<prob<=100 %")
            elif arg == "-nodelay":
                self.ACT_DELAY = False
                self.ACT_CROSSOVER = False
                print("delay+crossover deactivated")
            elif arg[:10] == "-focusapp="  and len(arg) > 10:
                #FOCUS_APP_NAME = arg[10:]
                #print(f"focusapp active: looking for: {FOCUS_APP_NAME}")
                print("Do not use the -focusapp start argument with V1.0.0+, use instead <focus>*name* directly in config!")
                sys.exit(1)
            elif arg == "-exec_one_macro":
                self.EXEC_ONLY_ONE_TRIGGERED_MACRO = True
            elif arg == "-status_indicator":
                self.STATUS_INDICATOR = True
                print(f"set indicator to: {self.STATUS_INDICATOR}")
            elif arg[:18] == "-status_indicator="  and len(arg) > 18:
                self.STATUS_INDICATOR = True
                self.STATUS_INDICATOR_SIZE = int(arg[18:])
                print(f"set indicator size to: {self.STATUS_INDICATOR_SIZE}")
            elif arg == "-crosshair":
                self.CROSSHAIR_ENABLED = True
                print(f"set crosshair to: {self.CROSSHAIR_ENABLED}")
            elif arg[:11] == "-crosshair="  and len(arg) > 11:
                self.CROSSHAIR_ENABLED = True
                x, y = arg[11:].strip().replace(' ', '').split(',')
                self.CROSSHAIR_DELTA_X, self.CROSSHAIR_DELTA_Y = int(x), int(y)
                print(f"set crosshair delta is set to: {self.CROSSHAIR_DELTA_X}, {self.CROSSHAIR_DELTA_Y}")
            else:
                print("unknown start argument: ", arg)



    def apply_start_args_by_focus_name(self, focus_name = None):
        global sys_start_args
        
        self.apply_start_arguments(sys_start_args)
        
        self._tk.config_manager.load_config()
        # needs to be done after reloading of file or else it will not have the actual data
        if focus_name is not None:
            focus_start_arguments, _ = self._tk.focus_manager.multi_focus_dict[focus_name]
        else:
            focus_start_arguments, _ = [],[]
            
        self.apply_start_arguments(self._tk.focus_manager.default_start_arguments + focus_start_arguments)

class Focus_Group_Manager():
    
    def __init__(self):
        self._multi_focus_dict = {}
        self._multi_focus_dict_keys = []
        self._default_start_arguments = []
        self._default_group_lines = []
        self.FOCUS_APP_NAME = ''
    
    @property
    def multi_focus_dict(self):
        return self._multi_focus_dict
    
    @multi_focus_dict.setter
    @type_check(dict)
    def multi_focus_dict(self, new_dict):
        self._multi_focus_dict = new_dict
        self._multi_focus_dict_keys = new_dict.keys()
         
    @property
    def multi_focus_dict_keys(self):
        return self._multi_focus_dict_keys
    
    # @multi_focus_dict_keys.setter
    # @type_check(dict_keys)
    # def multi_focus_dict_keys(self, new_list):
    #     self._multi_focus_dict_keys = new_list
        
    @property
    def default_start_arguments(self):
        return self._default_start_arguments  # Return a copy to prevent external modification

    @default_start_arguments.setter
    @type_check(list)
    def default_start_arguments(self, new_list):
        self._default_start_arguments = new_list

    @property
    def default_group_lines(self):
        return self._default_group_lines  # Return a copy to prevent external modification

    @default_group_lines.setter
    @type_check(list)
    def default_group_lines(self, new_list):
        self._default_group_lines = new_list
        
    @property
    def FOCUS_APP_NAME(self):
        return self._FOCUS_APP_NAME

    @FOCUS_APP_NAME.setter
    @type_check(str)
    def FOCUS_APP_NAME(self, new_str):
        self._FOCUS_APP_NAME = new_str
    
class Input_State_Manager():
    '''
    manages key press and release states 
    keeps track of:
    - is pressed or not
    - times of key press and releases
    for real and virtual/simulated keys
    '''
    REAL = 'real'
    SIMULATED = 'simulated'
    ALL = 'all'
    
    def __init__(self, output_manager):
        self._output_manager = output_manager
        # collect all active keys here for recognition of key combinations
        self._pressed_keys = set()
        self._released_keys = set()
        # collect active key press/release states to prevent refiring macros while holding a key
        self._real_key_press_states_dict = {}
        self._all_key_press_states_dict = {}

        # toggle state tracker
        self._toggle_state_dict = {}
        self._alias_toggle_lock = Lock()

        # time_real = [time_real_last_pressed, time_real_last_released, time_real_released, time_real_pressed]
        self._time_real = [{}, {}, {}, {}]
        # time_simulated = [time_simulated_last_pressed, time_simulated_last_released, time_simulated_released, time_simulated_pressed]
        self._time_simulated = [{}, {}, {}, {}]
        # time_all = [time_all_last_pressed, time_all_last_released, time_all_released, time_all_pressed]
        self._time_all = [{}, {}, {}, {}]
        
    @property
    def pressed_keys(self):
        return self._pressed_keys

    @property
    def d(self):
        return self._d
    
    @property
    def real_key_press_states_dict(self):
        return self._real_key_press_states_dict


    @property
    def all_key_press_states_dict(self):
        return self._all_key_press_states_dict

    @property
    def toggle_state_dict(self):
        return self._toggle_state_dict

    @property
    def alias_toggle_lock(self):
        return self._alias_toggle_lock

    @property
    def time_real(self):
        return self._time_real

    @property
    def time_simulated(self):
        return self._time_simulated

    @property
    def time_all(self):
        return self._time_all

    'managing key press and release states'
    def add_key_press_state(self, vk_code):    
        self._pressed_keys.add(vk_code)    
        
    def add_key_release_state(self, vk_code):
        self._released_keys.add(vk_code)
        try:
            self._pressed_keys.remove(vk_code)
        except KeyError as error:
            # if self._tk.args.DEBUG:
            pass
            #print(f"release error: {error}")
        
    def manage_key_states_by_event(self, key_event):
        vk_code, is_keydown, _ = key_event.get_all() 
        if is_keydown:
            self.add_key_press_state(vk_code)
        else:
            self.add_key_release_state(vk_code)

    def remove_key_release_state(self, vk_code):
        try:
            self._released_keys.remove(vk_code)
        except KeyError as error:
            # if self._tk.args.DEBUG:
            pass
            #print(f"release state error: {error}")

    def get_next_toggle_state_key_event(self, key_event):
        vk_code, _, constraints = key_event.get_all()
        with self._alias_toggle_lock:
            try:
                self._toggle_state_dict[vk_code] = not self._toggle_state_dict[vk_code]
            except KeyError:
                self._toggle_state_dict[vk_code] = True
                                #replace it so it can be evaluated
            toggle_ke = Key_Event(vk_code, self._toggle_state_dict[vk_code], constraints)
        return toggle_ke

    def set_toggle_state_to_curr_ke(self, key_event):
        vk_code, is_keydown, _ =  key_event.get_all()
        for key in self._toggle_state_dict.keys():
            if key == vk_code:
                self._toggle_state_dict[vk_code] = is_keydown

    def stop_all_repeating_keys(self):
        for key_event in tap_keyboard.output_manager.repeat_thread_dict.keys():
            repeat_thread, stop_event = tap_keyboard.output_manager.repeat_thread_dict[key_event]
            if repeat_thread.is_alive():
                stop_event.set()
                repeat_thread.join()

    #TODO: rework toggle to use key states
    def release_all_toggles(self):
        for vk_code in self._toggle_state_dict.keys():
            self._send_key_event(Key_Event(vk_code, False))
            self._toggle_state_dict[vk_code] = False

    def release_all_currently_not_pressed_keys(self):
        
        for key, is_press in self._all_key_press_states_dict.items(): 
            if is_press:
                print(f"to released pressed key: {key}")
                try:
                    real_key_is_press = self._real_key_press_states_dict[key]
                except KeyError:
                    real_key_is_press = False
                if not real_key_is_press:
                    self._output_manager.send_key_event(Key_Event(key, False))
                    self._all_key_press_states_dict[key] = False
                    
        self.release_all_toggles()
                    
    def reset_key_states(self):
        self._pressed_keys = set()
        self._released_keys = set()
        
    def get_time_lists(self):
        return [self._time_real, self._time_simulated, self._time_all]
    

    'managing key times'
    def init_all_key_times_to_starting_time(self, key_event_time):

        for time_set in self.get_time_lists():
            time_last_pressed, time_last_released, *_ = time_set
            for vk_code in range(256):
                time_last_pressed[vk_code] = key_event_time - 1000000
                time_last_released[vk_code] = key_event_time - 1000000

    def set_key_times(self, key_event_time, vk_code, is_keydown, time_list):
        if time_list == 'real':
            time_list = self._time_real
        elif time_list == 'simulated':
            time_list = self._time_simulated
        elif time_list == 'all':
            time_list = self._time_simulated
            
        time_last_pressed, time_last_released, time_released, time_pressed = time_list
        
        if is_keydown:
            time_last_pressed[vk_code] = key_event_time
            try:
                time_released[vk_code] = time_last_pressed[vk_code] - time_last_released[vk_code]
                #print(f"time released: {time_released[vk_code]}")
            except KeyError as error:
                pass
                #print(f"no key yet for: {error}")     
        else:
            time_last_released[vk_code] = key_event_time
            try:
                time_pressed[vk_code] = time_last_released[vk_code] - time_last_pressed[vk_code]
                #print(f"time pressed: {time_pressed[vk_code]}")
            except KeyError as error:
                pass
                #print(f"no key yet for vk_code: {error}")

class Tap_Keyboard():
    

    # Constants for key events
    WM_KEYDOWN = [256,260] # _PRESS_MESSAGES = (_WM_KEYDOWN, _WM_SYSKEYDOWN)
    WM_KEYUP = [257,261] # _RELEASE_MESSAGES = (_WM_KEYUP, _WM_SYSKEYUP)

    # Constants for mouse events
    MSG_MOUSE_MOVE = 512
    MSG_MOUSE_SCROLL_VERTICAL = 522
    MSG_MOUSE_SCROLL_HORIZONTAL = 526   

    MSG_MOUSE_DOWN = [513,516,519,523]
    MSG_MOUSE_UP = [514,517,520,524]
    MSG_MOUSE_SCROLL = [MSG_MOUSE_SCROLL_VERTICAL, MSG_MOUSE_SCROLL_HORIZONTAL]

    SUPPRESS_CODE = -999
    
    TIME_DIFF = None

    ### incldue directly as global variables to be edited by user

    # Control key combinations
    EXIT_Combination = ["alt", "end"] # END key vkcode 35, ALT 164
    TOGGLE_ON_OFF_Combination = ["alt", "delete"]  # DELETE key vkcode 46
    MENU_Combination = ["alt", "page_down"] # PAGE_DOWN
    
    def __init__(self, config_manager, focus_manager = None, args = None):
        
        self._config_manager = config_manager
        if focus_manager is None:
            self._focus_manager = Focus_Group_Manager()
        else:
            self._focus_manager = focus_manager

        if args is None:
            self._args = Argument_Manager(self)
        else:
            self._args = args
            
        self._output_manager = Output_Manager(self)
        self._state_manager = Input_State_Manager(self._output_manager)
        
                ## include the class in config_handler?

        # Tap groups define which keys are mutually exclusive
        # Key Groups define which key1 will be replaced by key2
        # if a Key Group has more than 2 keys if will be handled als alias
        self.tap_groups = []    # [Tap_Groups]
        self.rebinds_dict = {}       # Key_Event : Key_Event
        self.rebind_triggers = []
        self.macros_dict = {}        # [Key_Group : Key_Group]  # triggers are the Keys to the Item Makro
        self.macro_triggers = [] 
        self.all_trigger_events = []
        
        
        self._macro_thread_dict = {}
        self._macros_sequence_counter_dict = {}
        
        # self._listener = None
        # self._mouse_listener = None
        
    @property
    def listener(self):
        return self._listener  # Return a copy to prevent external modification

    @listener.setter
    @type_check(keyboard.Listener)
    def listener(self, new_listener):
        self._listener = new_listener
        
    @property
    def mouse_listener(self):
        return self._mouse_listener  # Return a copy to prevent external modification

    @mouse_listener.setter
    @type_check(mouse.Listener)
    def mouse_listener(self, new_listener):
        self._mouse_listener = new_listener
    
    
    @property
    def focus_manager(self):
        return self._focus_manager
    @property
    def state_manager(self):
        return self._state_manager
    @property
    def args(self):
        return self._args
    @property
    def output_manager(self):
        return self._output_manager
    @property
    def config_manager(self):
        return self._config_manager
    @property
    def macro_thread_dict(self):
        return self._macro_thread_dict
    @property
    def macros_sequence_counter_dict(self):
        return self._macros_sequence_counter_dict
    


    'initializing'
    def convert_to_vk_code(self, key):
        '''
        try to convert string input of a key into a vk_code based on vk_code_dict
        '''
        try:
            return vk_codes_dict[key]
        except KeyError:
            try:
                key_int = int(key)
                if 0 < key_int < 256:
                    return key_int
            except ValueError as error:
                print(error)
                raise KeyError

    def initialize_groups(self):
        '''
        in new form there are rebinds and macros
        rebind are Key_Group -> Key_Event
        key_group are a list of Key_Event, Keys
        macros are Key_Group : key_Groups
        '''

        
        self._tap_groups = []
        self._rebinds_dict = {}
        self._rebind_triggers = []
        self._macros_dict = {}
        self._macro_triggers = []
        self._all_trigger_events = []
        
        def extract_data_from_key(key):
            #separate delay info from string
            if '|' in key:
                key, *delays = key.split('|')
                if self.args.DEBUG: 
                    print(f"delays for {key}: {delays}")
                temp_delays = []
                # constraints = []
                for delay in delays:
                    if delay.startswith('('):
                        # clean the brackets
                        delay = delay[1:-1]
                        # IDEA ##1
                        # could look for tr(, ts( or ta( in it to determine if it is a delay or constraint
                        temp_delays.append(delay)
                    else:
                        temp_delays.append(int(delay))
                delays = temp_delays
                
            else:
                delays = [self.args.ALIAS_MAX_DELAY_IN_MS, self.args.ALIAS_MIN_DELAY_IN_MS]
                
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
                    # up key
                    key_modifier = 'up'
                    key = key.replace('!','',1)
                elif key[0] == '^':
                    # up key
                    key_modifier = 'toggle'
                    key = key.replace('^','',1)

            # convert string to actual vk_code
            vk_code = self.convert_to_vk_code(key)
                
            if key_modifier is None:
                new_element = (Key(vk_code, constraints=delays, key_string=key))
            elif key_modifier == 'down':
                new_element = (Key_Event(vk_code, True, delays, key_string=key))
            elif key_modifier == 'up':
                new_element = (Key_Event(vk_code, False, delays, key_string=key))
            elif key_modifier == 'toggle':
                new_element = (Key_Event(vk_code, None, delays, key_string=key, toggle=True))
            return new_element
        
        # extract tap groups
        try:
            for group in config_manager.tap_groups_hr:
                keys = []
                for key_string in group:
                    key = self.convert_to_vk_code(key_string)
                    keys.append(Key(key, key_string=key_string))
                self._tap_groups.append(Tap_Group(keys))
        except Exception as error:
            print(f"ERROR: {error} \n -> in Tap Group: {group}")
            raise Exception(error)
            
        # extract rebinds
        try:
            for rebind in config_manager.rebinds_hr:
                trigger_group, replacement_key = rebind
                
                # evaluate the given key strings
                new_trigger_group = []
                for key in trigger_group:
                    new_element = extract_data_from_key(key)            
                    if new_element is not False:
                        new_trigger_group.append(new_element)
                replacement_key = extract_data_from_key(replacement_key)
                
                # check if any given key is a Key Instance - has to be treated differently just to 
                # be able to use v:8 instead of -v:-8 and +v:+8
                both_are_Keys = False
                if isinstance(new_trigger_group[0], Key) or isinstance(replacement_key, Key):
                    # if one is Key Instance but the other Key_Event -> convert Key_Event into Key
                    if not isinstance(new_trigger_group[0], Key):
                        temp = new_trigger_group[0]
                        new_trigger_group[0] = Key(temp.vk_code, key_string=temp.key_string)    
                    if not isinstance(replacement_key, Key):
                        # TODO:
                        # here toggle is lost in conversion
                        if replacement_key.is_toggle:
                            pass # Key_Event.get_key_events() returns [ke, ke] - that should handle it
                        else:
                            temp = replacement_key
                            replacement_key = Key(temp.vk_code, key_string=temp.key_string)
                    both_are_Keys = True
                
                trigger_key, *trigger_rest = new_trigger_group
                
                if not both_are_Keys:
                    trigger_group = Key_Group(new_trigger_group)
                    self._rebind_triggers.append(trigger_group)
                    self._rebinds_dict[trigger_group] = replacement_key
                            
                else:
                    trigger_events = trigger_key.get_key_events()
                    
                    replacement_events = replacement_key.get_key_events()
                    for index in [0,1]:
                        trigger_group = Key_Group([trigger_events[index]] + trigger_rest)
                        self._rebind_triggers.append(trigger_group)
                        self._rebinds_dict[trigger_group] = replacement_events[index]
        except Exception as error:
            print(f"ERROR: {error} \n -> in Rebind: {rebind}")
            raise Exception(error)
                    
        # extract macros   
        try:      
            for macro in config_manager.macros_hr:
                new_macro = []
                # trigger j = 0, key_group j = 1
                for index, key_group in enumerate(macro):
                    new_key_group = Key_Group([])
                    for key in key_group:
                        new_element = extract_data_from_key(key)            
                        if new_element is not False:
                            if isinstance(new_element, Key_Event):
                                new_key_group.append(new_element)
                            elif isinstance(new_element, Key):
                                key_events = new_element.get_key_events()
                                new_key_group.append(key_events[0])
                                # if not in trigger group - so Key Instances as triggers are handled correctly
                                if index >= 1: 
                                    new_key_group.append(key_events[1])
                    new_macro.append(new_key_group)
                self._macro_triggers.append(new_macro[0])
                # trigger is the key to the to be played keygroup
                self._macros_dict[new_macro[0]] = new_macro[1:]
                self._macros_sequence_counter_dict[new_macro[0]] = 0
        except Exception as error:
            print(f"ERROR: {error} \n -> in Macro: {macro}")
            raise Exception(error)
            
        # extract all triggers for suppression of repeated keys: test V1.0.2.1 Bugfix
        all_triggers = self._rebind_triggers + self._macro_triggers
        for trigger_group in all_triggers:
            self._all_trigger_events.append(trigger_group.get_trigger())
    
    


    def apply_focus_groups(self, focus_name = None):
        if focus_name is not None:
            _, focus_group_lines = focus_manager.multi_focus_dict[focus_name]
        else:
            _, focus_group_lines = [],[]
        self._config_manager.presort_lines(focus_manager.default_group_lines + focus_group_lines)
        self.initialize_groups()
        
    def update_args_and_groups(self, focus_name = None):
        self._state_manager.release_all_currently_not_pressed_keys()
        self._state_manager.stop_all_repeating_keys()
        self.args.reset_global_variable_changes()
        self.args.apply_start_args_by_focus_name(focus_name)    
        self.apply_focus_groups(focus_name)    



    '# event evaluation'
    'win32_event handler'
    def mouse_win32_event_filter(self, msg, data):#
        '''
        data:
        typedef struct tagMSLLHOOKSTRUCT {
        POINT     pt;
        DWORD     mouseData;
        DWORD     flags;
        DWORD     time;
        ULONG_PTR dwExtraInfo;
        '''
        # no mousedata for left, right, middle
        # mousedata for x1: 65536: 2^16
        # mousedata for x2: 131072: 2x2^16
        # mousedata for scroll up/left: 7864320 : 120*2^16
        # mousedata for scroll down/right: 4287102976 : 65416*2^16: 8177 *2^19
        
        # buttons received:
        # Button.right
        # Button.left
        # Button.x1
        # Button.x2
        # Button.middle
        

        
        def is_simulated_key_event(flags):
            return flags == 1
        
        def is_press(msg):
            if msg in Tap_Keyboard.MSG_MOUSE_DOWN:
                return True
            if msg in Tap_Keyboard.MSG_MOUSE_UP:
                return False
            if msg in Tap_Keyboard.MSG_MOUSE_SCROLL:
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
            if msg == Tap_Keyboard.MSG_MOUSE_SCROLL_VERTICAL:
                return 6
            if msg == Tap_Keyboard.MSG_MOUSE_SCROLL_HORIZONTAL:
                return 7
            return None

        
        # if DEBUG
        #print(f"pt: {data.pt}")
        #print(f"mouseData: {data.mouseData}")
        #print(f"flags: {data.flags}")
        #print(f"time: {data.time}")
        #print(f"dwExtraInfo: {data.dwExtraInfo}")
        
        
        # skip_event = False
        # # mouse movement
        # if msg == MSG_MOUSE_MOVE:
        #     skip_event = True
        # veritcal scoll
        # if msg == MSG_MOUSE_SCROLL_VERTICAL:
        #     skip_event = True
        # # horizontal scroll
        # if msg == MSG_MOUSE_SCROLL_HORIZONTAL:
        #     skip_event = True

        if not msg == Tap_Keyboard.MSG_MOUSE_MOVE:
            
            vk_code = get_mouse_vk_code()
            key_event_time = data.time
            is_keydown = is_press(msg)
            is_simulated = is_simulated_key_event(data.flags)
            if self.args.DEBUG:
                print(f"vk_coe: {vk_code}, simulated: {is_simulated}, msg: {msg}")       
            if vk_code is not None:      
                self._win32_event_filter(vk_code, key_event_time, is_keydown, is_simulated, is_mouse_event=True)
            else:
                self._listener.suppress()
        
    def keyboard_win32_event_filter(self, msg, data):
        def is_simulated_key_event(flags):
            return flags & 0x10

        def is_press(msg):
            if msg in Tap_Keyboard.WM_KEYDOWN:
                return True
            if msg in Tap_Keyboard.WM_KEYUP:
                return False
        
        vk_code = data.vkCode
        key_event_time = data.time
        is_keydown = is_press(msg)
        is_simulated = is_simulated_key_event(data.flags)
        self._win32_event_filter(vk_code, key_event_time, is_keydown, is_simulated)

    def _win32_event_filter(self, vk_code, key_event_time, is_keydown, is_simulated, is_mouse_event=False):
        """
        Filter and handle keyboard events.
        """
        
        def check_for_combination(vk_codes):                 
            all_active = True
            for vk_code in vk_codes:
                if isinstance(vk_code, str):
                    vk_code = self.convert_to_vk_code(vk_code)
                all_active = all_active and vk_code in self.state_manager.pressed_keys
            return all_active
        
        def is_trigger_activated(current_ke, trigger_group):
            keys = trigger_group.get_key_events()
            # only trigger on the first key_event in trigger group
            # so only if that key is pressed the trigger can be activated
            if current_ke != keys[0]:    
                return False      
                    
            activated = True
            for key in keys:                         
                if key.is_press:
                    activated = activated and key.vk_code in self.state_manager.pressed_keys
                else:
                    activated = activated and key.vk_code not in self.state_manager.pressed_keys
                    
            # first check every other given trigger before evaluating constraints    
            if activated:
                for key in keys:
                    
                    constraints_fulfilled = self.output_manager.check_constraint_fulfillment(key)
                    # if reset code then ignore result for activation
                    if key.vk_code < 0:
                        if constraints_fulfilled:
                            self.reset_macro_sequence_by_reset_code(key.vk_code, trigger_group)
                    else:
                        ##240923 commented out to check all suffixes and execute invocations nad not stop before eval all suffixes
                        # if not activated:
                        #     return False
                        activated = activated and constraints_fulfilled
            return activated    
        
        key_replaced = False
        alias_fired = False
        #real_key_repeated = False
        
        current_ke = Key_Event(vk_code, is_keydown)
        _activated_triggers = []
        
        # get the time difference from system time to the key_event_time
        if Tap_Keyboard.TIME_DIFF is None:
            Tap_Keyboard.TIME_DIFF = time_in_millisec() - key_event_time
            # set all key_times to starting time
            self.state_manager.init_all_key_times_to_starting_time(key_event_time)
        
        if self.args.PRINT_VK_CODES or self.args.DEBUG:
        # if True:
            print(f"time: {key_event_time}, vk_code: {vk_code} - {"press  " if is_keydown else "release"} - {"simulated" if is_simulated else "real"}")

        # check for simulated keys:
        if not is_simulated: # is_simulated_key_event(data.flags):
            
            # stop repeating keys from being evaluated
            vk_code = current_ke.vk_code
            # exclude mouse events from this
            if vk_code >= 8:
                try:
                    press_state = self.state_manager.real_key_press_states_dict[vk_code]
                except KeyError:
                    press_state = None
                    
                if press_state == current_ke.is_press:
                    if current_ke in self._all_trigger_events:
                        self._listener.suppress_event()  
                    real_key_repeated = True
                else:
                    # if not the same -> changed -> evaluate normally for macros
                    real_key_repeated = False
                    self.state_manager.real_key_press_states_dict[vk_code] = current_ke.is_press
            else:
                real_key_repeated = False
            
            # here best place to start tracking the timings of presses and releases
            if not real_key_repeated:
                self.state_manager.set_key_times(key_event_time, vk_code, is_keydown, self.state_manager.REAL)
                self.state_manager.set_key_times(key_event_time, vk_code, is_keydown, self.state_manager.ALL)       
            
            key_release_removed = False        
            if current_ke not in self._rebinds_dict.keys():
                self.state_manager.manage_key_states_by_event(current_ke)
                if self.args.DEBUG:
                    print(f"pressed key: {self.state_manager.pressed_keys}, released keys: {self.state_manager.released_keys}")

            # Replace some Buttons :-D
            if not self.args.WIN32_FILTER_PAUSED and not self.args.PRINT_VK_CODES:
            
                'REBINDS HERE'
                # check for rebinds and replace current key event with replacement key event
                for trigger_group in self._rebind_triggers:
                    
                    if is_trigger_activated(current_ke, trigger_group):
                        try:
                            replacement_ke = self._rebinds_dict[trigger_group]
                            old_ke = current_ke
                            current_ke = replacement_ke
                            key_replaced = True
                        except KeyError as error:
                            if self.args.DEBUG:
                                print(f"rebind not found: {error}")
                                print(self._rebinds_dict)
                                
                        if key_replaced:
                            # if key is supressed
                            if current_ke.vk_code == Tap_Keyboard.SUPPRESS_CODE:
                                self._listener.suppress_event()  
                                                                                                        
                'STOP REPEATED KEYS FROM HERE'        
                # prevent evaluation of repeated key events
                # not earliert to keep rebinds and supression intact - toggling can be a bit fast if key is pressed a long time               
                if not real_key_repeated:
                    ### collect active keys
                    if key_replaced:
                        # if key is to be toggled
                        if current_ke.is_toggle:
                            if old_ke.is_press:
                                current_ke = self.state_manager.get_next_toggle_state_key_event(current_ke)
                            else:
                                # key up needs to be supressed or else it will be evaluated 2 times each tap
                                self._listener.suppress_event()  
                                
                        self.state_manager.manage_key_states_by_event(current_ke)
                        if self.args.DEBUG:
                            print(f"replaced a key: pressed key: {self.state_manager.pressed_keys}, released keys: {self.state_manager.released_keys}")
                    
                    'TOGGLE STATE'
                    # reset toggle state of key manually released - so toggle will start anew by pressing the key
                    self.state_manager.set_toggle_state_to_curr_ke(current_ke)
                    
                    'MACROS HERE'
                    # check for macro triggers     
                    # _activated_triggers = []     
                    # for trigger_group in macro_triggers:
                    #     if is_trigger_activated(current_ke, trigger_group):                         
                    #         _activated_triggers.append(trigger_group)  
                    #         if self.args.DEBUG:
                    #             print(f"trigger group {trigger_group} activated")
                        
                    # play triggered macros
                    # for trigger_group in _activated_triggers:
                    for trigger_group in self._macro_triggers:
                        if is_trigger_activated(current_ke, trigger_group): 
                            alias_fired = True
                            
                            'MACRO SEQUENCES COUNTER HANDLING'
                            macro_groups = self._macros_dict[trigger_group]
                            if len(macro_groups) == 1:
                                key_sequence = macro_groups[0].get_key_events()
                            else:
                                if self._macros_sequence_counter_dict[trigger_group] >= len(macro_groups):
                                    self._macros_sequence_counter_dict[trigger_group] = 0
                                key_sequence = macro_groups[self._macros_sequence_counter_dict[trigger_group]].get_key_events()
                                self._macros_sequence_counter_dict[trigger_group] += 1
                                
                            'MACRO playback'
                            # only spawn a thread for execution if more than one key event in to be played key sequence
                            if self.args.DEBUG:
                                print(f"key_sequence: {key_sequence}")
                            # if there is an empty key group ... just ignore it and do not supress the triggerkey
                            if len(key_sequence) == 0:
                                pass
                            # if there is only one key in the sequence, play it as a rebind?
                            # elif len(key_sequence) == 1:
                            #     key_event = key_sequence[0]
                            #     if key_event.is_toggle:
                            #         key_event = get_next_toggle_state_key_event(key_event)
                            #     execute_key_event(key_event)
                            elif len(key_sequence) > 0:
                                try:
                                    macro_thread, stop_event = self._macro_thread_dict[trigger_group]
                                    ## interruptable threads
                                    if macro_thread.is_alive():
                                        if self.args.DEBUG:
                                            print(f"{trigger_group}-macro: still alive - try to stop")
                                        stop_event.set()
                                        macro_thread.join()
                                except KeyError:
                                    # this thread was not started before
                                    pass
                                
                                # reset stop event
                                stop_event = Event()

                                macro_thread = Alias_Thread(key_sequence, stop_event, trigger_group, self)
                                # save thread and stop event to find it again for possible interruption
                                self._macro_thread_dict[trigger_group] = [macro_thread, stop_event]
                                macro_thread.start() 
                                
                            if self.args.DEBUG:
                                print("> playing makro:", trigger_group)
                                
                            if self.args.EXEC_ONLY_ONE_TRIGGERED_MACRO:
                                break
                    
                    'PREVENT NEXT KEY EVENT FROM TRIGGERING OLD EVENTS'               
                    # to remove the key from released_keys after evaluation of triggers
                    # so can only trigger once
                    if not is_keydown:
                        self.state_manager.remove_key_release_state(current_ke.vk_code)  
                        key_release_removed = True  

            'CONTROLS HERE'
            if self.args.CONTROLS_ENABLED:                  
                # # Stop the listener if the MENU combination is pressed
                if check_for_combination(MENU_Combination):
                    self.control_return_to_menu()
                    
                # # Stop the listener if the END combination is pressed
                elif check_for_combination(EXIT_Combination):
                    self.control_exit_program()

                # Toggle paused/resume if the DELETE combination is pressed
                elif check_for_combination(TOGGLE_ON_OFF_Combination):
                    self.control_toggle_pause()
            
            # TODO: as key_event? 'release_all_pressed_keys'
            if check_for_combination(['esc']):
                self.state_manager.release_all_currently_not_pressed_keys()

            'TAP GROUP EVALUATION HERE'
            # Snap Tap Part of Evaluation
            # Intercept key events if not PAUSED
            if not self.args.WIN32_FILTER_PAUSED and not self.args.PRINT_VK_CODES:
                vk_code, is_keydown, _ = current_ke.get_all()
                if self.args.DEBUG: 
                    print("#0")
                    print(self._tap_groups)               
                    print(vk_code, is_keydown)               
                for tap_group in self._tap_groups:
                    if vk_code in tap_group.get_vk_codes():
                        if self.args.DEBUG: 
                            print(f"#2 {vk_code}")
                        if key_replaced is True:
                            key_replaced = False
                        tap_group.update_tap_states(vk_code, is_keydown) 

                        # send keys
                        self.output_manager.send_keys_for_tap_group(tap_group)
                        # to allow repeated keys from hold, key_to_send is a vk_code
                        if tap_group.get_active_key() != vk_code or not real_key_repeated:
                            self._listener.suppress_event()
                        break
            
            # if replacement happened suppress source key event   
            if key_replaced is True:
                self.output_manager.send_key_event(current_ke)
                self._listener.suppress_event()
            
            # supress event that triggered an alias - done here because it should also update tap groups before
            if alias_fired is True:
                self._listener.suppress_event()
                
            # to remove the key from released_keys after evaluation of triggers
            # so can only trigger once
            if not is_keydown and not key_release_removed:
                self.state_manager.remove_key_release_state(current_ke.vk_code) 
        
        # here arrive all key_events that will be send - last place to intercept
        # here the interception of interference of alias with tap groups is realized
        if is_simulated:
            # fecthing current vk and press - not needed atm but as precaution if I put it somewhere else xD
            vk_code, is_keydown, _ = current_ke.get_all()
            
            key_is_in_tap_groups = False
            for tap_group in self._tap_groups:
                vk_codes = tap_group.get_vk_codes()
                if vk_code in vk_codes:
                    key_is_in_tap_groups = True
                    active_key = tap_group.get_active_key()
                    # if None all simulated keys are allowed - so no supression
                    if active_key is None:
                        pass
                    else:
                        if active_key == vk_code:
                            # is active key -> only press allowed
                            if not is_keydown:
                                self._listener.suppress_event()
                        # not the active key -> only release allowed
                        else: 
                            if is_keydown:
                                self._listener.suppress_event()
            
            # intercept simulated releases of keys that are still pressed
            # might interfere with tap_groups - test it
            if not key_is_in_tap_groups and not is_keydown:
                try:
                    if vk_code > 7 and self.state_manager.real_key_press_states_dict[vk_code] is True:
                        self._listener.suppress_event()
                except KeyError:
                    pass

            
                            
            # save time of simulated and send keys
            self.state_manager.set_key_times(key_event_time, vk_code, is_keydown, self.state_manager.SIMULATED)
            self.state_manager.set_key_times(key_event_time, vk_code, is_keydown, self.state_manager.ALL) 
            
        
        
        # save press state of all keys to release them on focus change
        if vk_code >= 0:
            self.state_manager.all_key_press_states_dict[vk_code] = current_ke.is_press


    'control helper functions'
    def control_return_to_menu(self):
        self.args.MENU_ENABLED = True
        print('--- Stopping - Return to menu ---')
        self.state_manager.release_all_currently_not_pressed_keys()
        self.state_manager.stop_all_repeating_keys()
        self._listener.stop()
        self.mouse_listener.stop()

    def control_exit_program(self):
        print('--- Stopping execution ---')
        self.state_manager.release_all_currently_not_pressed_keys()
        self.state_manager.stop_all_repeating_keys()
        self.listener.stop()
        self.mouse_listener.stop()
        self.args.STOPPED = True
        #exit()

    def control_toggle_pause(self):
        if self.args.WIN32_FILTER_PAUSED:
            self.args.reset_global_variable_changes()
            self.args.apply_start_args_by_focus_name(self._focus_manager.FOCUS_APP_NAME)
            self.apply_focus_groups(self._focus_manager.FOCUS_APP_NAME)
            system('cls||clear')
            self._config_manager.display_groups()
            print("\n--- reloaded sucessfully ---")
            print('--- manuelly resumed ---\n')
            if self.args.CONTROLS_ENABLED:
                display_control_text()
            # with paused_lock:
            self.args.WIN32_FILTER_PAUSED = False
            self.args.MANUAL_PAUSED = False

        else:
            print('--- manually paused ---')
            # with paused_lock:
            self.args.WIN32_FILTER_PAUSED = True
            self.args.MANUAL_PAUSED = True
            self.state_manager.release_all_currently_not_pressed_keys()
            self.state_manager.stop_all_repeating_keys() 
            
    def reset_macro_sequence_by_reset_code(self, vk_code, trigger_group):
        
        reset_code = vk_code
        print(f"reset code played: {reset_code}")
        # reset current trigger of this event - return this code to alias tread
        try:
            try:
                # reset self macro sequence
                if reset_code == -255:
                        self._macros_sequence_counter_dict[trigger_group] = 0
                # reset every sequence counter
                elif reset_code == -256:
                    for index in len(self._macro_triggers):

                        self._macros_sequence_counter_dict[self._macro_triggers[index]] = 0
                        _, stop_event = self._macro_thread_dict[self._macro_triggers[index]]
                        stop_event.set()
                # reset a specific macro seq according to index
                else:
                    self._macros_sequence_counter_dict[self._macro_triggers[reset_code]] = 0
                    _, stop_event = self._macro_thread_dict[self._macro_triggers[reset_code]]
                    stop_event.set()
                        
            except KeyError as error:
                print(f"reset_all: macro thread for trigger {error} not found")
        except IndexError:
                print(f"wrong index for reset - no macro with index: {reset_code}")




'menu display' 
def display_menu():
    """
    Display the menu and handle user input
    """
    tap_keyboard.args.PRINT_VK_CODES = False
    invalid_input = False
    text = ""
    while True:       
        # clear the CLI
        if not tap_keyboard.args.DEBUG:
            pass
            #XXX hsystem('cls||clear')
        if invalid_input:
            print(text)
            print("Please try again.\n")
            invalid_input = False
            
            text = ""
        tap_keyboard.config_manager.display_groups()
        print('\n------ Options -------')
        print("0. Toggle debugging output for V0.9.3 formula evaluation.")
        print(f"1. Open file:'{tap_keyboard.config_manager.file_name}' in your default editor.")
        print("2. Reload everything from file.")
        print("3. Print virtual key codes to identify keys.")
        print("4. End the program/script.", flush=True)
        
        sys.stdout.flush()

        # Try to flush the buffer
        while msvcrt.kbhit():
            msvcrt.getch()

        choice = input("\nHit [Enter] to start or enter your choice: " )

        if choice == '0':
            tap_keyboard.args.DEBUG2 = not tap_keyboard.args.DEBUG2
        elif choice == '1':
            startfile(tap_keyboard.config_manager.file_name)
        elif choice == '2':
            tap_keyboard.args.reset_global_variable_changes()
            tap_keyboard.args.apply_start_args_by_focus_name(tap_keyboard.focus_manager.FOCUS_APP_NAME)
            tap_keyboard.apply_focus_groups(tap_keyboard.focus_manager.FOCUS_APP_NAME)
        elif choice == '3':
            tap_keyboard.args.PRINT_VK_CODES = True
            break
        elif choice == '4':
            exit()
        elif choice == '':
            break
        else:
            text = "Error: Invalid input."
            invalid_input = True

def display_control_text():
    print('--- toggle PAUSED with ALT + DELETE ---')
    print('--- STOP execution with ALT + END ---')
    print('--- enter MENU again with ALT + PAGE_DOWN ---\n')

def update_group_display():
    #XXX
    #system('cls||clear')
    config_manager.display_groups()
    #print("\n--- reloaded sucessfully ---")
    if tap_keyboard.args.CONTROLS_ENABLED:
        display_control_text()   


alias_thread_logging = []

'Theading'
class Alias_Thread(Thread):
    '''
    execute macros/alias in its own threads so the delay is not interfering with key evaluation
    '''
    def __init__(self, key_group, stop_event, trigger_group, tap_keyboard):
        Thread.__init__(self)
        self.daemon = True
        self.key_group = key_group
        self.stop_event = stop_event
        self.trigger_group = trigger_group
        self._tk = tap_keyboard
        
    def run(self): 
        to_be_played_key_events = []
        try:   
            # Key_events ans Keys here ...
            if DEBUG3:
                print(f"> playing macro: {self.trigger_group} :: {self.key_group}")
            for key_event in self.key_group:
                
                # check all constraints at start!
                constraint_fulfilled, delay_times = self._tk.output_manager.check_constraint_fulfillment(key_event, get_also_delays=True)
                if constraint_fulfilled:
                    to_be_played_key_events.append([key_event, delay_times])
                    if DEBUG3: 
                        print(f">> will play '{key_event}' with delays: {delay_times}")

            for key_event, delay_times in to_be_played_key_events:
                # alias_thread_logging.append(f"{time() - starttime:.5f}: Send virtual key: {key_event.key_string}")
                if self.stop_event.is_set():
                    break
                else:
                    # if key_event.is_toggle:
                    #     key_event = get_next_toggle_state_key_event(key_event)
                    vk_code = key_event.vk_code
                    if vk_code <= 0:
                        self.reset_macro_sequence_by_reset_code(vk_code, self.trigger_group)
                    else:
                        # send key event and handles interruption of delay
                        self._tk.output_manager.execute_key_event(key_event, delay_times, with_delay=True, stop_event=self.stop_event)
                       
        except Exception as error:
            print(error)
            alias_thread_logging.append(error)

class Repeat_Thread(Thread):
    '''
    repeatatly execute a key event based on a timer
    '''
    def __init__(self, key_event, stop_event, time, tap_keyboard, time_increment=500):
        Thread.__init__(self)
        self.daemon = True
        vk_code, is_press, constraints = key_event.get_all()
        self.key_event = Key_Event(vk_code, is_press, constraints=constraints[1:], key_string=key_event.key_string)
        self.stop_event = stop_event
        self.time = time
        self.time_increment = time_increment
        self.number_of_increments = time // time_increment
        self.reset = False
        self._tk = tap_keyboard
        
    def run(self): 
        print(f"now repeating: {self.key_event} at interval of {self.time} ms")

        while not self.stop_event.is_set():
            if self.reset:
                self.reset = False
            else:
                if self._tk.output_manager.check_constraint_fulfillment(self.key_event):
                    self._tk.output_manager.execute_key_event(self.key_event)
                
            for index in range(self.number_of_increments):
                if not self.stop_event.is_set() and not self.reset:
                    sleep(self.time_increment / 1000)
                else:
                    break
                
    def reset_timer(self):
        self.reset = True
            
class Focus_Thread(Thread):
    '''
    Thread for observing the active window and pause toggle the evaluation of key events
    can be manually overwritten by Controls on ALT+DEL
    '''

    def __init__(self, tap_keyboard):#, paused_lock):
        Thread.__init__(self)
        self.stop = False
        self.daemon = True
        self._tk = tap_keyboard
        self.FOCUS_THREAD_PAUSED = False
        # self.paused_lock = paused_lock

    def run(self):
        last_active_window = ''
        found_new_focus_app = False
        manually_paused = False
        while not self.stop:
            try:
                active_window = gw.getActiveWindow().title

                # shorten the active window name
                if len(active_window) >= 25:
                    reverse = active_window[::-1]
                    del1 = reverse.find('–')
                    del2 = reverse.find('-')
                    del3 = reverse.find('/')
                    del4 = reverse.find('\\')
                    del_min = 100
                    for deliminator in [del1, del2, del3, del4]:
                        if deliminator != -1 and deliminator < del_min:
                            del_min = deliminator 
                    reverse_shortened = reverse[:del_min]
                    active_window = reverse_shortened[::-1]
                    if active_window[0] == ' ':
                        active_window = active_window[1:]    
                
            except AttributeError:
                pass
            
            if active_window not in ["FST Status Indicator", "FST Crosshair"]:
                if not self.FOCUS_THREAD_PAUSED and not self._tk.args.MANUAL_PAUSED:
        
                    if active_window != last_active_window or manually_paused:
                        if active_window != last_active_window:
                            last_active_window = active_window
                        # to make sure it activates ne focus setting even if manually paused in other app than resumed

                        if manually_paused:
                            manually_paused = False
                        
                        found_new_focus_app = False
                            
                        for focus_name in self._tk.focus_manager.multi_focus_dict_keys:
                            if active_window.lower().find(focus_name) >= 0:
                                found_new_focus_app = True
                                self._tk.focus_manager.FOCUS_APP_NAME = focus_name
                                break
                                        
                        if found_new_focus_app:
                            try:
                                self._tk.update_args_and_groups(focus_name)
                                update_group_display()
                                print(f'\n>>> FOCUS APP FOUND: resuming with app: \n    {active_window}\n')
                                # with self.paused_lock:
                                self._tk.args.WIN32_FILTER_PAUSED = False

                            except Exception as error:
                                print('--- reloading of groups files failed - not resumed, still paused ---')
                                print(f" -> aborted reloading due to: {error}")
                        
                        else:
                            self._tk.focus_manager.FOCUS_APP_NAME = ''
                            if self._tk.args.WIN32_FILTER_PAUSED:
                                # print out active window when paused and it changes
                                # to help find the name :-D
                                print(f"> Active Window: {active_window}")

                            else:
                                self._tk.update_args_and_groups()
                                update_group_display()
                                print(f'\n>>> NO FOCUS APP FOUND: looking for: {', '.join(self._tk.focus_manager.multi_focus_dict_keys)}\n')
                                # with self.paused_lock:
                                self._tk.args.WIN32_FILTER_PAUSED = True
                                    
                                print(f"> Active Window: {active_window}")
                                        
                        
                else:
                    manually_paused = True
                        
            sleep(0.5)

    def pause(self):
        # with self.paused_lock:
        self.FOCUS_THREAD_PAUSED = True

    def restart(self):
        if self.FOCUS_THREAD_PAUSED:
            # with self.paused_lock:
            self.FOCUS_THREAD_PAUSED = False
            self._tk.args.MANUAL_PAUSED = False

    def end(self):
        self.stop = True
             
 
'GUI elements'
class Status_Indicator():
    
    def __init__(self, root, tap_keyboard):
        self.root = root
        self._tk = tap_keyboard
        self.root.title("FST Status Indicator")
        self.root.overrideredirect(True)  # Remove window decorations
        
        # Get the screen width and height
        self.screen_width = self.root.winfo_screenwidth()
        self.screen_height = self.root.winfo_screenheight()
        
        # Calculate the position to center the window
        self.x_position = (self.screen_width) - 60
        self.y_position = 0
        
        # Set the window geometry to 2x2 pixels centered on the screen
        self.root.geometry(f'100x100+{self.x_position}+{self.y_position}')
        self.root.attributes("-alpha", 0.4)  # Set transparency level
        self.root.wm_attributes("-topmost", 1)  # Keep the window on top
        self.root.wm_attributes("-transparentcolor", "yellow")

        print(f"self._tk.args.STATUS_INDICATOR_SIZE: {self._tk.args.STATUS_INDICATOR_SIZE}")
        # Create a canvas for the indicator
        self.canvas = tk.Canvas(self.root, width=100+self._tk.args.STATUS_INDICATOR_SIZE, height=100+self._tk.args.STATUS_INDICATOR_SIZE, bg='yellow', highlightthickness=0)
        self.canvas.pack()

        # Draw the indicator
        self.indicator = self.canvas.create_oval(20, 20, 20+self._tk.args.STATUS_INDICATOR_SIZE, 20+self._tk.args.STATUS_INDICATOR_SIZE, fill="green")

        # Bind mouse events to make the window draggable
        self.root.bind("<ButtonPress-1>", self.on_start)
        self.root.bind('<Double-1>', self.open_config_file) # left mouse button double click
        self.root.bind('<Button-2>', self.open_config_file) # middle mouse button
        self.root.bind("<B1-Motion>", self.on_drag)

        # Create a right-click context menu
        self.context_menu = tk.Menu(self.root, tearoff=0)
        # self.context_menu.attributes("-alpha", 0.4) 
        
        self.context_menu.add_command(label="Open config file", command=self.open_config_file)
        self.context_menu.add_command(label="Reload from file", command=self.reload_from_file)
        self.context_menu.add_separator()
        self.context_menu.add_command(label="Toggle Pause", command=self._tk.control_toggle_pause)
        self.context_menu.add_command(label="Return to Menu", command=self._tk.control_return_to_menu)
        self.context_menu.add_command(label="Exit Program", command=self._tk.control_exit_program)
        self.context_menu.add_separator()
        self.context_menu.add_command(label="Close Indicator", command=self.close_window)
        self.context_menu.add_command(label="Toggle Crosshair", command=self.toggle_crosshair)
        self.crosshair_enabled = False
        self.crosshair = None

        # Bind right-click to show the context menu
        self.canvas.bind("<Button-3>", self.show_context_menu)
        
        self.stop = False
        

    def open_config_file(self, event = None):
        startfile(self._tk.config_manager.file_name)
        
    def reload_from_file(self):
        self._tk.update_args_and_groups(self._tk.focus_manager.FOCUS_APP_NAME)
        update_group_display()
        print(f'\n>>> file reloaded for focus app: {self._tk.focus_manager.FOCUS_APP_NAME}\n')
        
    def toggle_crosshair(self):

        if not self._tk.args.CROSSHAIR_ENABLED:#self.crosshair_enabled:
            self._tk.args.CROSSHAIR_ENABLED = True
            self.crosshair_activate()
        else:
            self._tk.args.CROSSHAIR_ENABLED = False
            self.crosshair_deactivate()
        
    def crosshair_activate(self):
        if self.crosshair is not None:
            self.crosshair_deactivate()
        self.crosshair = Crosshair(tk.Toplevel(), self._tk)
        self.crosshair_enabled = True
        
    def crosshair_deactivate(self):
        self.crosshair.destroy()
        self.crosshair = None
        self.crosshair_enabled = False

    def on_start(self, event):
        # Record the starting position of the mouse
        self._drag_data = {"x": event.x_root, "y": event.y_root}

    def on_drag(self, event):
        # Calculate the new position of the window
        dx = event.x_root - self._drag_data["x"]
        dy = event.y_root - self._drag_data["y"]
        x = self.root.winfo_x() + dx
        y = self.root.winfo_y() + dy

        # Update the starting position of the mouse
        self._drag_data["x"] = event.x_root
        self._drag_data["y"] = event.y_root

        # Move the window to the new position
        self.root.geometry(f"+{x}+{y}")

    def show_context_menu(self, event):
        self.context_menu.tk_popup(event.x_root, event.y_root)

    def run(self):
        self.root.mainloop()

    def update_indicator(self):
        wait_one_round = False
        manual = self._tk.args.MANUAL_PAUSED
        win32 = self._tk.args.WIN32_FILTER_PAUSED
        while not self.stop:
            if self._tk.args.STATUS_INDICATOR:
                    
                # only update if there is a change
                if manual is not self._tk.args.MANUAL_PAUSED or win32 is not self._tk.args.WIN32_FILTER_PAUSED:
                    manual = self._tk.args.MANUAL_PAUSED
                    win32 = self._tk.args.WIN32_FILTER_PAUSED
                    
                    if self._tk.args.MANUAL_PAUSED or self._tk.args.WIN32_FILTER_PAUSED:
                        self.status = False
                    else:
                        self.status = True
                        wait_one_round = True
                    color = "green" if self.status else "red"
                    self.canvas.itemconfig(self.indicator, fill=color)    
                
            # activate and deactive crosshair from tk.mainloop
            # wait an extra round for the new window to settle itself
            if wait_one_round:
                wait_one_round = False
                print("> crosshair - waiting one extra second before activation")
            else:
                if self._tk.args.CROSSHAIR_ENABLED:
                    if not self.crosshair_enabled:
                        self.crosshair_activate()
                else:
                    if self.crosshair_enabled:
                        self.crosshair_deactivate()
                    
            # if mainthread is inactive already than end indicator
            if not main_thread.is_alive():
                if self.crosshair_enabled:
                    self.crosshair_deactivate()
                self.close_window()
            sleep(1)
    
    def end(self):
        self.stop = True
        
    def close_window(self):
        self.end()
        # Properly close the Tkinter window and stop the main loop
        self.root.destroy()

class Crosshair():
    
    def __init__(self, root, tap_keyboard):
        

        # Create a new Tkinter window
        self.root = root
        self._tk = tap_keyboard
        
        # Set title to recognise it in focus window
        self.root.title("FST Crosshair")
        
        # Remove window decorations
        self.root.overrideredirect(True)
        
        self.root.bind('<Button-1>', self.restart)
        
        # Set the window to be transparent
        self.root.attributes('-alpha', 1)
        
        self.built_crosshair()
        
    def built_crosshair(self):
        
        def rgbtohex(r,g,b):
            return f'#{r:02x}{g:02x}{b:02x}'
        
        # delta x,y for the midpoint of the crosshair
        delta_x = self._tk.args.CROSSHAIR_DELTA_X - 1  # for me this is the center of the screen
        delta_y = self._tk.args.CROSSHAIR_DELTA_Y - 1
        
        # base size has to be at least double the max of |x| or |y|
        # min_canvas_size = 2 * max(abs(delta_x), abs(delta_y)) + 25   # add a bit of buffer (25)
        # print(min_canvas_size)
        
        # # adapt canvas size to be big enough for the delta values
        # if min_canvas_size < 100:
        #     self.size = 100 
        # else: 
        #     # make it a multiplicative of 100
        #     self.size = (min_canvas_size // 100 + 1) * 100
        
        self.size = 100 
        
        # middle point distance from coordinate system of he canvas
        mid = self.size // 2
        
        # Get the screen width and height
        self.screen_width = self.root.winfo_screenwidth()
        self.screen_height = self.root.winfo_screenheight()
        
        # Calculate the position to center the window
        self.x_position = (self.screen_width // 2) - mid + delta_x
        self.y_position = (self.screen_height // 2) - mid + delta_y
        
        # Set the window geometry to 2x2 pixels centered on the screen
        self.root.geometry(f'{self.size}x{self.size}+{self.x_position}+{self.y_position}')
        
        # Create a canvas to draw the crosshair
        self.canvas = tk.Canvas(self.root, width=self.size, height=self.size, bg='white', highlightthickness=0)
        self.canvas.pack()

        # set color to glowing pink - that should be usable in most games :-D
        # would be interesting if it would be possible to make it the complementory color of 
        # the window below
        color = rgbtohex(255, 0, 255)
        
        # Draw the crosshair lines
        self.canvas.create_line(mid+0, mid+10, mid+0, mid+25, fill=color)    # Vertical line
        self.canvas.create_line(mid+1, mid+10, mid+1, mid+25, fill=color)    # Vertical line
        self.canvas.create_line(mid-1, mid+10, mid-1, mid+25, fill="black")  # Vertical line
        
        self.canvas.create_line(mid+11, mid+0, mid+26, mid+0, fill=color)    # Horizontal line right
        self.canvas.create_line(mid+11, mid+1, mid+26, mid+1, fill=color)    # Horizontal line right
        self.canvas.create_line(mid+11, mid+2, mid+26, mid+2, fill="black")  # Horizontal line right
        
        self.canvas.create_line(mid-25, mid+0, mid-10, mid+0, fill=color)    # Horizontal line left
        self.canvas.create_line(mid-25, mid+1, mid-10, mid+1, fill=color)    # tHorizontal line left
        self.canvas.create_line(mid-25, mid+2, mid-10, mid+2, fill="black")  # Horizontal line left
        
        self.canvas.create_line(mid-1, mid+0, mid-1, mid+2, fill=color)      # Dot
        self.canvas.create_line(mid+2, mid+0, mid+2, mid+3, fill=color)      # Dot
        self.canvas.create_line(mid-1, mid+2, mid+2, mid+2, fill=color)      # Dot
        self.canvas.create_line(mid-1, mid+3, mid+3, mid+3, fill="black")    # Dot
        self.canvas.create_line(mid-2, mid+0, mid-2, mid+3, fill="black")    # Dot
        
        # Set the window to be always on top and transparent again for drawing
        self.root.attributes('-topmost', True)
        self.root.attributes('-transparentcolor', 'white')

    # def run(self):
    #     # Start the Tkinter main loop
    #     self.root.mainloop()
        
    def destroy(self, event = None):
        self.root.destroy()
        
    def restart(self, event = None):
        print("restarting crosshair")
        self.canvas.destroy()
        self.built_crosshair()


'Main'   
def main():
      
    focus_active = False
    focus_thread = None
    
    if tap_keyboard.args.DEBUG:
        print(f"tap_groups_hr: {config_manager.tap_groups_hr}")
        print(f"tap_groups: {tap_keyboard._tap_groups}")

    if len(focus_manager.multi_focus_dict_keys) > 0:
        focus_active = True
   
    if focus_active:
        focus_thread = Focus_Thread(tap_keyboard)
        focus_thread.start()

    while not tap_keyboard.args.STOPPED:
        tap_keyboard.state_manager.reset_key_states()
        tap_keyboard.state_manager.release_all_currently_not_pressed_keys()
        
        mouse_listener = mouse.Listener(win32_event_filter=tap_keyboard.mouse_win32_event_filter)
        tap_keyboard.mouse_listener = mouse_listener
        listener = keyboard.Listener(win32_event_filter=tap_keyboard.keyboard_win32_event_filter)
        tap_keyboard.listener = listener
        
        mouse_listener.start()
        listener.start()
        
        if tap_keyboard.args.MENU_ENABLED:
            if focus_thread is not None:
                if focus_thread.is_alive():
                    focus_thread.pause()
            display_menu()
        else:
            config_manager.display_groups()

        print('\n--- Free Snap Tap started ---')
        if tap_keyboard.args.CONTROLS_ENABLED:
            display_control_text()
            print(f">>> focus looks for: {', '.join(focus_manager.multi_focus_dict_keys)}")
        if focus_thread is not None:
            if focus_thread.is_alive():
                focus_thread.restart()

        listener.join()
            
        mouse_listener.stop()
        mouse_listener.join()
        
        
    if focus_thread is not None:       
        if focus_thread.is_alive():
            focus_thread.end()
            focus_thread.join()
    
    sleep(0.5)

    sys.exit(1)

if __name__ == "__main__":
    starttime = time()   # for alias thread event logging
    # check if start arguments are passed
    if len(sys.argv) > 1:
        sys_start_args = sys.argv[1:]
        
    
    focus_manager = Focus_Group_Manager()
    config_manager = Config_Manager(FILE_NAME, focus_manager)
    tap_keyboard = Tap_Keyboard(config_manager, focus_manager=focus_manager)
    

    tap_keyboard.args.apply_start_args_by_focus_name()
    tap_keyboard.apply_focus_groups()
    if tap_keyboard.args.STATUS_INDICATOR:
        main_thread = Thread(target=main)
        main_thread.start()
        try:
            root = tk.Tk()
            indicator = Status_Indicator(root, tap_keyboard)
            # indicator_thread = Thread(target=indicator.update_indicator)
            # indicator_thread.daemon = True  # Daemonize thread
            # indicator_thread.start()
            indicator.run()
        except RuntimeError:
            pass
        sys.exit(1)
    else:
        main()
    
# **** ... this is a long file xD