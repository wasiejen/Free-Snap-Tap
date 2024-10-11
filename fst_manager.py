'''
Free-Snap-Tap V1.1
last updated: 241010-0144
'''

from pynput import keyboard, mouse
from threading import Event # to play aliases without interfering with keyboard listener
from os import system, startfile # to use clearing of CLI for better menu usage and opening config file
import sys # to get start arguments
import msvcrt # to flush input stream
from random import randint # randint(3, 9)) 
from time import time, sleep # sleep(0.005) = 5 ms
import pprint
from fst_data_types import Key_Event, type_check
from fst_threads import Repeat_Thread, Focus_Thread

class CONSTANTS():

    # will not overwrite debug settings in config
    DEBUG = False
    DEBUG2 = False
    DEBUG3 = False
    DEBUG4 = False
    DEBUG_NUMPAD = False

    # Define File name for saving of everything, can be any filetype
    # But .txt or .cfg recommended for easier editing
    FILE_NAME = 'FSTconfig.txt'

    # Control key combinations (vk_code and/or key_string) 
    # (1,2,3, ... keys possible - depends on rollover of your keyboard)
    EXIT_Combination = ["alt", "end"]
    TOGGLE_ON_OFF_Combination = ["alt", "delete"]
    MENU_Combination = ["alt", "page_down"]  


class Output_Manager():
    
    '''
    #XXX
    '''

    def __init__(self, fst_keyboard):
        self._fst = fst_keyboard
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
                if CONSTANTS.DEBUG3:
                    print(f"D3: string as constraint found - {constraint}")
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
            delay_times = [self._fst.arg_manager.ALIAS_MAX_DELAY_IN_MS, self._fst.arg_manager.ALIAS_MIN_DELAY_IN_MS]
        elif len(delay_times) == 1:
            delay_times = delay_times*2
        elif len(delay_times) == 2:
            pass
        else:
            delay_times = delay_times[:2]
        
        self.send_key_event(key_event)
        
        if self._fst._args.ACT_DELAY and with_delay:
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
                if CONSTANTS.DEBUG: 
                    print(f"D1: incremental delay: {delay_time}, num_sleep_increments {num_sleep_increments}, num_sleep_rest {num_sleep_rest}")
                sleep(num_sleep_rest / 1000)
                for i in range(num_sleep_increments):
                    if not stop_event.is_set():
                        sleep(sleep_increment / 1000)
                    else:
                        if CONSTANTS.DEBUG:
                            print("D1: stop event recognised")
                        break

    def constraint_evaluation(self, constraint_to_evaluate, current_ke):
        
        def time_in_millisec():
            return int(time() * 1000)
        
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
            vk_code = self._fst.convert_to_vk_code(key_string.strip('"').strip("'"))
            return vk_code, is_press
        
        def get_key_time_template(key_string, time_list):
            '''
            template for all press and release time functions -> time in ms
            '''
            _, _, time_released, time_pressed = time_list
            vk_code, is_press = get_vk_code_and_press_from_keystring(key_string)
            key_time = 0
            if is_press:
                try:
                    key_time = time_released[vk_code]
                    if CONSTANTS.DEBUG2:
                        print(f"vk_code: {vk_code} time released: {key_time}")
                except KeyError as error:
                    if CONSTANTS.DEBUG2:
                        print(f"time_release: no value yet for vk_code: {error}")     
                    return 0
            else:
                try:
                    key_time = time_pressed[vk_code]
                    if CONSTANTS.DEBUG2:
                        print(f"vk_code: {vk_code} time pressed: {key_time}")
                except KeyError as error:
                    if CONSTANTS.DEBUG2:
                        print(f"time_press: no value yet for vk_code: {error}")
                    return 0
            return key_time
        
        def tr(key_string):
            '''
            real press and release time function -> time in ms
            '''
            return get_key_time_template(key_string, self._fst.state_manager.time_real)
        
        def ts(key_string):
            '''
            simulated press and release time function -> time in ms
            '''
            return get_key_time_template(key_string, self._fst.state_manager.time_simulated)
        
        def ta(key_string):
            '''
            all combined (real and simulated) press and release time function -> time in ms
            '''
            return get_key_time_template(key_string, self._fst.state_manager.time_all)
        
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
            vk_code, _ = get_vk_code_and_press_from_keystring(key_string)
            return self._fst.state_manager.get_real_key_press_state(vk_code)
        # release of real keys
        
        def r(key_string):
            return not p(key_string)   
        
        # press of all keys (incl simulated)
        def ap(key_string):
            vk_code, _ = get_vk_code_and_press_from_keystring(key_string)
            return self._fst.state_manager.get_all_key_press_state(vk_code)
            
        # relese of all keys (incl simulated)
        def ar(key_string):
            return not ap(key_string)   

        # give out time since last key press/release
        def last(key_string, time_list = self._fst.state_manager.time_real):
            time_last_pressed, time_last_released, _, _ = time_list
            vk_code, is_press = get_vk_code_and_press_from_keystring(key_string)
            try:
                if CONSTANTS.DEBUG:
                    print(f"D1: {time_in_millisec() - self._fst.TIME_DIFF}")
                    print(f"D1: {time_last_pressed[vk_code]}")
                current_time = time_in_millisec() - self._fst.TIME_DIFF
                return current_time - time_last_pressed[vk_code] if is_press else current_time - time_last_released[vk_code]
            except KeyError:
                return 0
            
        # double click - gets the time since the last click  
        def dc(key_string = None, time_list = self._fst.state_manager.time_real):
            _, _, time_released, time_pressed = time_list
            # use current key event that activated trigger to get reliable double click
            if key_string is None:
                vk_code = current_ke.vk_code
            else:
                vk_code, _ = get_vk_code_and_press_from_keystring(key_string)
            try:
                if CONSTANTS.DEBUG:
                    print(f"D1: {time_released[vk_code] + time_pressed[vk_code]}")
                return time_released[vk_code] + time_pressed[vk_code]
            except KeyError:
                ##2
                return 9999
            
        def repeat(key_string):
            
            repeat_time = int(key_string)
            # reset stop event
            stop_event = Event()
            repeat_thread = Repeat_Thread(current_ke, stop_event, repeat_time, self._fst, time_increment=100)
            # save thread and stop event to find it again for possible interruption
            self._repeat_thread_dict[current_ke] = [repeat_thread, stop_event]
            repeat_thread.start() 
            return None
        
        def stop_repeat():
            try:
                repeat_thread, stop_event = self._repeat_thread_dict[current_ke]
                if repeat_thread.is_alive():
                    if CONSTANTS.DEBUG2:
                        print(f"D2: {current_ke}-repeat: still alive - try to stop")
                    stop_event.set()
                    repeat_thread.join()
            except KeyError:
                # this thread was not started before
                pass
            return False
        
        def toggle_repeat(key_string):
            try:
                repeat_thread, stop_event = self._repeat_thread_dict[current_ke]
                if repeat_thread.is_alive():
                    # print(f"stopping repeat for {current_ke}")
                    stop_event.set()
                    repeat_thread.join()
                else:
                    # print(f"{current_ke} restarting repeat")
                    repeat(key_string)
            except KeyError:
                # this thread was not started before
                # print(f"{current_ke} starting repeat for first time")
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

        # --------------------
        
        if CONSTANTS.DEBUG3:
            print(f"D3: received for eval: {constraint_to_evaluate} : {current_ke}")
        
        easy_eval_succeeded = False
        first_char = constraint_to_evaluate[0]
        if first_char in ['!', '+', '-']:
            try:
                vk_code, is_press = get_vk_code_and_press_from_keystring(constraint_to_evaluate)
                easy_eval_succeeded = True
                key_press = self._fst.state_manager.get_all_key_press_state(vk_code)
                if is_press == key_press:
                    return True
                else:
                    return False
            except Exception as error:
                print(error)
                
        
        if not easy_eval_succeeded:
            result = eval(constraint_to_evaluate)
            ### print(f"result of '{constraint_to_evaluate}' is '{result}'")
            if CONSTANTS.DEBUG2:
                print(f"D2: evaluated {constraint_to_evaluate} to: {result}")
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
        
        if CONSTANTS.DEBUG: 
            print(f"D1: last_key_send: {last_key_send}")
            print(f"D1: key_to_send: {key_to_send}")
            
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
                        is_crossover = randint(0,100) > (100 - self._fst.arg_manager.ACT_CROSSOVER_PROPABILITY_IN_PERCENT) and self._fst.arg_manager.ACT_CROSSOVER # 50% possibility
                    if is_crossover:
                        if CONSTANTS.DEBUG: 
                            print("D1: crossover")
                        self._keyboard_controller.press(key_code_to_send)
                    else:
                        self._keyboard_controller.release(key_code_last_key_send) 
                    # random delay if activated
                    if self._fst.arg_manager.ACT_DELAY or self._fst.arg_manager.ACT_CROSSOVER: 
                        delay = randint(self._fst.arg_manager.ACT_MIN_DELAY_IN_MS, self._fst.arg_manager.ACT_MAX_DELAY_IN_MS)
                        if CONSTANTS.DEBUG: 
                            print(f"D1: delayed by {delay} ms")
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
         
    
    def clean_lines(self, lines):
        comments_cleaned_lines = []
        for line in lines:
            if len(line) > 1:
                if line.startswith('<focus>'):
                    cleaned_line = '<focus>'
                    # strip comment
                    temp_line = line[7:].split('#')[0]
                    # remove leading whitespaces
                    while temp_line.find(' ') == 0:
                        temp_line = temp_line[1:]
                    # remove trailing whitespaces
                    temp_line = temp_line[::-1]
                    while temp_line.find(' ') == 0:
                        temp_line = temp_line[1:]
                    # recombine with focus part
                    cleaned_line += temp_line[::-1]
                    comments_cleaned_lines.append(line.split('#')[0])
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
        
        # clean multiline macro sequences and joins them together
        multiline_cleaned_lines = []
        for line in comments_cleaned_lines:
            if len(line) > 1 and line[0] == ':':
                # add multiline to last multiline sequence
                multiline_cleaned_lines[-1] += line
            else:
                multiline_cleaned_lines.append(line)
                
        return multiline_cleaned_lines

    def parse_line(self, line):
        pass
    
    def _load_from_file(self):
        '''
        reads in the file and removes the commented out lines, keys and inline comments;
        joins multiline macro sequences; 
        '''    
        
        temp_file = []
        with open(self._file_name, 'r') as file:
            for line in file:
                temp_file.append(line) 

        cleaned_lines = self.clean_lines(temp_file) 
            
        focus_name = ''
        multi_focus_dict = {}
        default_start_arguments = []
        default_group_lines = []
        
        for line in cleaned_lines:
            if line.startswith('<focus>'):
                focus_name = line.replace('<focus>', '').replace('\n', '').lower()
                multi_focus_dict[focus_name] = [[], []]
            elif line.startswith('<arg>'):
                line = line.replace('<arg>', '').replace('\n', '').lower()
                if focus_name == '':
                    default_start_arguments.append(line)
                else:
                    multi_focus_dict[focus_name][0].append(line)
            else:
                if focus_name == '':
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
    '''
    #XXX
    '''
    ### config of these variables should be done via config
    ## config manager has the control over the arguments

    STATUS_INDICATOR = False
    STATUS_INDICATOR_SIZE = 40
    CROSSHAIR_ENABLED = False
    CROSSHAIR_DELTA_X = 0
    CROSSHAIR_DELTA_Y = 0

    # global variables
    DEBUG  = False
    DEBUG2 = False
    DEBUG3 = False
    DEBUG_NUMPAD = False
    
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

    def __init__(self, fst_keyboard):
        self._fst = fst_keyboard
        Argument_Manager.DEBUG  = CONSTANTS.DEBUG 
        Argument_Manager.DEBUG2 = CONSTANTS.DEBUG2
        Argument_Manager.DEBUG3 = CONSTANTS.DEBUG3
        Argument_Manager.DEBUG_NUMPAD = CONSTANTS.DEBUG_NUMPAD
        # to only set up the variable and not reset it with every focus change
        self.STATUS_INDICATOR = Argument_Manager.STATUS_INDICATOR
        self.STATUS_INDICATOR_SIZE = Argument_Manager.STATUS_INDICATOR_SIZE
        
        # getting sys arguments and saving them
        self.sys_start_args = sys.argv[1:] if len(sys.argv) > 1 else []
        self.reset_global_variable_changes()
        
    def reset_global_variable_changes(self):
        # self.DEBUG = Argument_Manager.DEBUG  
        # self.DEBUG2 = Argument_Manager.DEBUG2
        # self.DEBUG3 = Argument_Manager.DEBUG3
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
                print(f"D1: {arg}")
            # enable debug print outs
            if arg == "-debug":
                self.DEBUG = True
                CONSTANTS.DEBUG = True
            # start directly without showing the menu
            elif arg == "-nomenu":
                self.MENU_ENABLED = False
            # use custom tap groups file for loading and saving
            elif arg[:6] == '-file=' and len(arg) > 6:
                file_name = arg[6:]
                if self.DEBUG: 
                    print(f"D1: {file_name}")
                self._fst.config_manager.file_name = file_name
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

    def apply_start_args_by_focus_name(self, focus_name = ''):
        
        self.apply_start_arguments(self.sys_start_args)
        
        self._fst.config_manager.load_config()
        # needs to be done after reloading of file or else it will not have the actual data
        if focus_name != '':
            focus_start_arguments, _ = self._fst.focus_manager.multi_focus_dict[focus_name]
        else:
            focus_start_arguments, _ = [],[]
            
        self.apply_start_arguments(self._fst.focus_manager.default_start_arguments + focus_start_arguments)

class Focus_Group_Manager():
    '''
    #XXX
    '''
    def __init__(self, fst_keyboard):
        self._fst = fst_keyboard
        self._multi_focus_dict = {}
        self._multi_focus_dict_keys = []
        self._default_start_arguments = []
        self._default_group_lines = []
        self.FOCUS_APP_NAME = ''
        
        self.focus_active = False
        self._focus_thread  = None
    
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
        
    def init_focus_thread(self):
        if len(self._multi_focus_dict_keys) > 0:
            self.focus_active = True
            self._focus_thread = Focus_Thread(self._fst)
        else:
            self.focus_active = False
        return self.focus_active
            
    def pause_focus_thread(self):
        if self.focus_active and self._focus_thread.is_alive():
            self._focus_thread.pause()
        
    def start_focus_thread(self):
        if self.focus_active and self._focus_thread.is_alive():
            self._focus_thread.start()
        
    def restart_focus_thread(self):
        if self.focus_active and self._focus_thread.is_alive():
            self._focus_thread.restart()
        
    def stop_focus_thread(self):
        if self.focus_active and self._focus_thread.is_alive():
            self._focus_thread.end()
            self._focus_thread.join()
    
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
    
    ALL_MODIFIER_KEYS = [160, 161, 162, 163, 164, 165]
    
    def __init__(self, fst_keyboard):#, fst_keyboard):
        self._fst = fst_keyboard
        
        self._pressed_keys = set()
        
        # collect active key press/release states to prevent refiring macros while holding a key
        self._real_key_press_states_dict = {}
        self._simulated_key_press_states_dict = {}
        self._all_key_press_states_dict = {}

        # toggle state tracker
        self._toggle_states_dict = {}
        self._toggle_states_dict_keys = []

        # time_real = [time_real_last_pressed, time_real_last_released, time_real_released, time_real_pressed]
        self._time_real = [{}, {}, {}, {}]
        # time_simulated = [time_simulated_last_pressed, time_simulated_last_released, time_simulated_released, time_simulated_pressed]
        self._time_simulated = [{}, {}, {}, {}]
        # time_all = [time_all_last_pressed, time_all_last_released, time_all_released, time_all_pressed]
        self._time_all = [{}, {}, {}, {}]
      
    @property
    def pressed_keys(self):
        return self._pressed_keys
    
    def get_real_key_press_state(self, vk_code):
        try:
            return self._real_key_press_states_dict[vk_code]
        except KeyError:
            self.set_real_key_press_state(vk_code, False)
            return False
    def set_real_key_press_state(self, vk_code, is_press):
        # print(f"real key state of {vk_code} set to {is_press}")
        self._real_key_press_states_dict[vk_code] = is_press
        self._all_key_press_states_dict[vk_code] = is_press

    def get_simulated_key_press_state(self, vk_code):
        try:
            return self._simulated_key_press_states_dict[vk_code]
        except KeyError:
            self.set_simulated_key_press_state(vk_code, False)
            return False
    def set_simulated_key_press_state(self, vk_code, is_press):
        if vk_code > 0:
            self._simulated_key_press_states_dict[vk_code] = is_press
            self._all_key_press_states_dict[vk_code] = is_press
            
    def get_all_key_press_state(self, vk_code):
        try:
            return self._all_key_press_states_dict[vk_code]
        except KeyError:
            self.set_all_key_press_state(vk_code, False)
            return False
    def set_all_key_press_state(self, vk_code, is_press):
        if vk_code > 0:
            self._all_key_press_states_dict[vk_code] = is_press


    def get_toggle_state(self, vk_code):
        try:
            return self._toggle_states_dict[vk_code]
        except KeyError:
            self.set_toggle_state(vk_code, False)
            self._toggle_states_dict_keys  = self._toggle_states_dict.keys()
            return False
    def set_toggle_state(self, vk_code, is_press):
        self._toggle_states_dict[vk_code] = is_press 
        
    @property
    def toggle_states_dict_keys(self):
        return self._toggle_states_dict_keys                      
    @property
    def time_real(self):
        return self._time_real
    @property
    def time_simulated(self):
        return self._time_simulated
    @property
    def time_all(self):
        return self._time_all

    def get_key_press_state(self, vk_code):
        return vk_code in self._pressed_keys
    
    def add_key_press_state(self, vk_code):    
        self._pressed_keys.add(vk_code)    
        
    def remove_key_press_state(self, vk_code):
        try:
            self._pressed_keys.remove(vk_code)
        except KeyError:
            pass
        
    def manage_key_press_states_by_event(self, key_event):
        vk_code, is_keydown, _ = key_event.get_all() 
        if is_keydown:
            self.add_key_press_state(vk_code)
        else:
            self.remove_key_press_state(vk_code)
        if CONSTANTS.DEBUG3:
            pprint.pp(f"pressed keys: {self._pressed_keys}")

    def get_next_toggle_state_key_event(self, key_event):
        vk_code, _, constraints = key_event.get_all()
        is_press_toggle = self.get_toggle_state(vk_code)
        self.set_toggle_state(vk_code, not is_press_toggle)
        return Key_Event(vk_code, not is_press_toggle, constraints, key_string = key_event.key_string, is_toggle=True)

    def set_toggle_state_to_curr_ke(self, key_event):
        vk_code, is_press, _ =  key_event.get_all()
        if vk_code in self._toggle_states_dict_keys:
            if CONSTANTS.DEBUG4:
                print(f"D4: -- toggle state for {key_event} updated")
            self.set_toggle_state(vk_code, is_press)

    def stop_all_repeating_keys(self):
        for key_event in self._fst.output_manager.repeat_thread_dict.keys():
            repeat_thread, stop_event = self._fst.output_manager.repeat_thread_dict[key_event]
            if repeat_thread.is_alive():
                stop_event.set()
                repeat_thread.join()

    def release_all_toggles(self):
        for vk_code in self._toggle_states_dict_keys:
            self._fst.output_manager.send_key_event(Key_Event(vk_code, False))
            self.set_toggle_state(vk_code, False)

    def release_all_currently_pressed_keys(self):
        ###XXX 241009-1049 do not release real keys, 241009-1100 now again release all keys - works better
        if CONSTANTS.DEBUG2:
            print("D2: releasing all keys")

        self.release_all_modifier_keys()
                
        # release remaining simulated keys
        for vk_code, is_press in self._all_key_press_states_dict.items(): 
            if is_press:
                # only reset simulated keys
                if self.get_simulated_key_press_state(vk_code) is True:
                # if self.get_simulated_key_press_state(vk_code) is True and not vk_code in self.pressed_keys:
                    if CONSTANTS.DEBUG2:
                        print(f"D2: released key: {vk_code}")
                    self._fst.output_manager.send_key_event(Key_Event(vk_code, False))       
        
        self.release_all_toggles()
        self.reset_states_dicts()
    
    def release_all_modifier_keys(self):
        # first release all modifert keys
        for vk_code in Input_State_Manager.ALL_MODIFIER_KEYS:
            ###XXX 241009-1603
            if not self.get_real_key_press_state(vk_code):
            # if not vk_code in self.pressed_keys:
                if CONSTANTS.DEBUG2:
                    print(f"D2: released pressed modifier key: {vk_code}")
                self._fst.output_manager.send_key_event(Key_Event(vk_code, False))
                self.set_simulated_key_press_state(vk_code, False)
                
    def reset_states_dicts(self):
        self._pressed_keys = set()
        self._real_key_press_states_dict = {}
        self._simulated_key_press_states_dict = {}
        self._all_key_press_states_dict = {}
        
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

class CLI_menu():
    '''
    #XXX
    '''        
    def __init__(self, fst_keyboard):
        self._fst = fst_keyboard
    
    def clear_cli(self):
        if CONSTANTS.DEBUG or CONSTANTS.DEBUG2 or CONSTANTS.DEBUG3:
            print("D1: cli not cleared")
        else:
            system('cls||clear')
            
    'menu display' 
    def display_menu(self):
        """
        Display the menu and handle user input
        """
        self._fst.arg_manager.PRINT_VK_CODES = False
        invalid_input = False
        text = ""
        while True:       
            # clear the CLI
            self.clear_cli()
            
            if invalid_input:
                print(text)
                print("Please try again.\n")
                invalid_input = False
                
                text = ""
            self._fst.config_manager.display_groups()
            print('\n------ Options -------')
            print("0. Toggle debugging output for V0.9.3 formula evaluation.")
            print(f"1. Open file:'{self._fst.config_manager.file_name}' in your default editor.")
            print("2. Reload everything from file.")
            print("3. Print virtual key codes to identify keys.")
            print("4. End the program/script.", flush=True)
            
            self.flush_the_input_buffer()

            choice = input("\nHit [Enter] to start or enter your choice: " )

            if choice == '0':
                CONSTANTS.DEBUG2 = not CONSTANTS.DEBUG2
            elif choice == '1':
                startfile(self._fst.config_manager.file_name)
            elif choice == '2':
                self._fst.arg_manager.reset_global_variable_changes()
                self._fst.arg_manager.apply_start_args_by_focus_name(self._fst.focus_manager.FOCUS_APP_NAME)
                self._fst.apply_focus_groups(self._fst.focus_manager.FOCUS_APP_NAME)
            elif choice == '3':
                self._fst.arg_manager.PRINT_VK_CODES = True
                break
            elif choice == '4':
                exit()
            elif choice == '':
                break
            else:
                text = "Error: Invalid input."
                invalid_input = True

    def display_control_text(self):
        print('\n--- toggle PAUSED with ALT + DELETE ---')
        print('--- STOP execution with ALT + END ---')
        print('--- enter MENU again with ALT + PAGE_DOWN ---\n')

    def update_group_display(self):
        self.clear_cli()
        
        self._fst.config_manager.display_groups()
        if self._fst.arg_manager.CONTROLS_ENABLED:
            self.display_control_text()   
            
    def display_focus_names(self):
        print(f">>> looking for focus names: {', '.join(self._fst.focus_manager.multi_focus_dict_keys)}")
    
    def display_focus_found(self, active_window):
        print(f'\n>>> FOCUS APP FOUND: resuming with app: \n    {active_window}\n')
        
    def display_focus_not_found(self):
        print('\n>>> NO FOCUS APP FOUND')
        self.display_focus_names()
        
    def flush_the_input_buffer(self):
        sys.stdout.flush()
        # Try to flush the buffer
        while msvcrt.kbhit():
            msvcrt.getch()
        