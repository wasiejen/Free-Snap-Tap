'''
Free-Snap-Tap V1.1.3
last updated: 241015-1300
'''

from pynput import keyboard, mouse
from threading import Event # to play aliases without interfering with keyboard listener
from time import time # sleep(0.005) = 5 ms
from vk_codes import vk_codes_dict  #change the keys you need here in vk_codes_dict.py
import pprint

from fst_data_types import Key_Event, Key_Group, Key, Tap_Group, Rebind, Macro
from fst_threads import Macro_Thread
from fst_manager import CONSTANTS, CLI_menu
from fst_manager import Output_Manager, Argument_Manager, Focus_Group_Manager 
from fst_manager import Input_State_Manager, Config_Manager

   
class FST_Keyboard():
    '''
    #XXX
    '''
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

    SUPPRESS_CODE = -999
    
    TIME_DIFF = None
    START_TIME = None
        
    def __init__(self):
        
        # self._focus_manager = Focus_Group_Manager() if focus_manager is None else focus_manager
        # self._config_manager = config_manager(CONSTANTS.FILE_NAME, self._focus_manager) if config_manager is None else config_manager
        # self._args = Argument_Manager(self) if args is None else args
        self._focus_manager = Focus_Group_Manager(self) 
        self._config_manager = Config_Manager(CONSTANTS.FILE_NAME) 
        self._arg_manager = Argument_Manager(self) 

            
        self._output_manager = Output_Manager(self)
        self._state_manager = Input_State_Manager(self)
        self._cli_menu = CLI_menu(self)
        
        # Tap groups define which keys are mutually exclusive
        # Key Groups define which key1 will be replaced by key2
        # if a Key Group has more than 2 keys if will be handled als alias
        self._tap_groups = []    # [Tap_Groups]
        self._rebinds_dict = {}       # Key_Event : Key_Event
        self._rebind_triggers = []
        self._macros_dict = {}        # [Key_Group : Key_Group]  # triggers are the Keys to the Item Makro
        self._macro_triggers = [] 
        self._all_trigger_events = []
        
        self._macro_thread_dict = {}        
        
        # colletor of all rebinds and macros, not used for anything yet 241011-1117
        self._rebinds = []
        self._macros = []
        self._macros_alias_dict = {}
        self._macro_sequence_alias_list = []
        self._key_group_by_alias = {}
        
        self._mouse_listener = None
        self._listener = None
            
    def init_listener(self):
        self._mouse_listener = mouse.Listener(win32_event_filter=self.mouse_win32_event_filter)
        self._listener = keyboard.Listener(win32_event_filter=self.keyboard_win32_event_filter)
        
    def start_listener(self):
        if self._mouse_listener is None or self._listener is None:
            self.init_listener()
        self._listener.start()
        self._mouse_listener.start()
        
    def stop_listener(self):
        self._listener.stop()
        self._mouse_listener.stop()
        
    def join_listener(self):
        self._listener.join()

    @property
    def focus_manager(self):
        return self._focus_manager
    @property
    def state_manager(self):
        return self._state_manager
    @property
    def arg_manager(self):
        return self._arg_manager
    @property
    def output_manager(self):
        return self._output_manager
    @property
    def config_manager(self):
        return self._config_manager
    @property
    def cli_menu(self):
        return self._cli_menu
    @property
    def macro_thread_dict(self):
        return self._macro_thread_dict
    @property
    def macro_sequence_alias_list(self):
        return self._macro_sequence_alias_list
    @property
    def key_group_by_alias(self):
        return self._key_group_by_alias
    
    def convert_to_vk_code(self, key):
        '''
        try to convert string input of a key into a vk_code based on vk_code_dict
        '''
        try:
            return vk_codes_dict[key]
        except KeyError:
            try:
                key_int = int(key)
                #not 0 < to enable None and empty ke
                if 0 <= key_int < 256:
                # if 0 < key_int < 256:
                    return key_int
            except ValueError as error:
                print(error)
                raise KeyError

    def initialize_groups_from_presorted_lines(self):
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
        
        self._key_group_by_alias = {}
        
        # only for display purposes
        self._rebinds = []
        self._macros = []
                
        def extract_data_from_key(key_string):           
            #separate delay info from string
            if '|' in key_string:
                key_string, *constraints = key_string.split('|')
                if CONSTANTS.DEBUG: 
                    print(f"D1: Constraints for {key_string}: {constraints}")
                temp_constraints = []
                # constraints = []
                for constraint in constraints:
                    if constraint.startswith('('):
                        # clean the brackets
                        constraint = constraint[1:-1]
                        temp_constraints.append(constraint)
                    else:
                        temp_constraints.append(int(constraint))
                constraints = temp_constraints
                
            else:
                constraints = [self._arg_manager.MACRO_MAX_DELAY_IN_MS, self._arg_manager.MACRO_MIN_DELAY_IN_MS]
                
            # to enable empty ke with empty string
            # if key_string == '':
            #     return False
        
            # recognition of mofidiers +, -, !, ^
            # only interpret it as such when more then one char is in key
            key_modifier = None
            if len(key_string) > 1: 
                if key_string[0] == '-':
                    # down key
                    key_modifier = 'down'
                    key_string = key_string.replace('-','',1) # only replace first occurance
                elif key_string[0] == '+':
                    # up key
                    key_modifier = 'up'
                    key_string = key_string.replace('+','',1)
                elif key_string[0] == '!':
                    # up key
                    key_modifier = 'up'
                    key_string = key_string.replace('!','',1)
                elif key_string[0] == '^':
                    # up key
                    key_modifier = 'toggle'
                    key_string = key_string.replace('^','',1)

            # convert string to actual vk_code
            vk_code = self.convert_to_vk_code(key_string)
            
            # if none key is found set it as up to force it to be seen as key_event
            if vk_code <= 0:
                key_modifier = 'up'
                
                            
            if key_modifier is None:
                new_element = (Key(vk_code, constraints=constraints, key_string=key_string))
            elif key_modifier == 'down':
                new_element = (Key_Event(vk_code, True, constraints, key_string=key_string))
            elif key_modifier == 'up':
                new_element = (Key_Event(vk_code, False, constraints, key_string=key_string))
            elif key_modifier == 'toggle':
                new_element = (Key(vk_code, constraints=constraints, key_string=key_string, is_toggle=True))
            return new_element
        
        def convert_key_string_group(list_of_strings, is_trigger_group = False):  
            key_group = []
            for key_string in list_of_strings:
                if key_string.startswith('<'):
                    try:
                        key_group = key_group + self._key_group_by_alias[key_string]
                    except KeyError:
                        raise KeyError(f"Alias {key_string} is not known")
                else:   
                    new_element = extract_data_from_key(key_string)    
                    if new_element is not False:
                        if isinstance(new_element, Key_Event):
                            key_group.append(new_element)
                        elif isinstance(new_element, Key):
                            key_press, key_releae = new_element.get_key_events()
                            ###XXX hacks to enable empty ke with only one + element
                            if new_element.vk_code > 0:
                                key_group.append(key_press)
                            # if not in trigger group - so Key Instances as triggers are handled correctly
                            if not is_trigger_group or new_element.vk_code <= 0:
                                key_group.append(key_releae)               
            return key_group

        # extract aliases 

        try:
            for alias, group in self.config_manager.alias_hr:
                self._key_group_by_alias[alias] = convert_key_string_group(group)

        except Exception as error:
            print(f"ERROR: {error} \n -> in Alias: {group}")
            raise Exception(error)
        
        # extract tap groups
        try:
            for alias, group in self.config_manager.tap_groups_hr:
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
            for alias, rebind in self.config_manager.rebinds_hr:
                trigger_group, replacement_key = rebind
                
                # evaluate the given key strings
                new_trigger_group = convert_key_string_group(trigger_group, is_trigger_group=True)
                replacement_key = extract_data_from_key(replacement_key)
                
                # check if any given key is a Key Instance - has to be treated differently just to 
                # be able to use v:8 instead of -v:-8 and +v:+8
                both_are_Keys = False                
                if isinstance(new_trigger_group[0], Key) or isinstance(replacement_key, Key):
                    # if one is Key Instance but the other Key_Event -> convert Key_Event into Key
                    if not isinstance(new_trigger_group[0], Key):
                        temp = new_trigger_group[0]
                        ###XXX 241022-1341
                        new_trigger_group[0] = Key(temp.vk_code, constraints=temp.constraints, key_string=temp.key_string)    
                    if not isinstance(replacement_key, Key):
                        temp = replacement_key
                        replacement_key = Key(temp.vk_code, constraints=temp.constraints, key_string=temp.key_string)
                    both_are_Keys = True
                
                trigger_key, *trigger_rest = new_trigger_group
                
                # if both are key_events create ke:ke
                if not both_are_Keys:
                    trigger_group = Key_Group(new_trigger_group)
                    new_rebind = Rebind(trigger_group, replacement_key)
                    self._rebinds.append(new_rebind)
                    self._rebind_triggers.append(trigger_group)
                    self._rebinds_dict[trigger_group] = new_rebind
                # if both are Keys then create 2 Key_Event: Key_Event rebind sinstead
                else:
                    trigger_events = trigger_key.get_key_events()
                    replacement_events = replacement_key.get_key_events()
                    for index in [0,1]:
                        trigger_group = Key_Group([trigger_events[index]] + trigger_rest)
                        new_rebind = Rebind(trigger_group, replacement_events[index])
                        self._rebinds.append(new_rebind)
                        self._rebind_triggers.append(new_rebind.trigger_group)
                        self._rebinds_dict[new_rebind.trigger_group] = new_rebind

        except Exception as error:
            print(f"ERROR: {error} \n -> in Rebind: {rebind}")
            raise Exception(error)
                    
        # extract macros   
        try:      
            for alias, macro in self.config_manager.macros_hr:
                # convert Keys into Key_Events
                trigger_group, *key_groups = macro
                extracted_trigger_group = Key_Group(convert_key_string_group(trigger_group, is_trigger_group=True))
                extracted_key_groups = []
                for key_group in key_groups:
                    key_group = Key_Group(convert_key_string_group(key_group))
                    extracted_key_groups.append(key_group)
                new_macro = Macro(extracted_trigger_group, extracted_key_groups)
                
                ###XXX 241014-2035
                new_macro.alias = alias[1:-1]

                if new_macro.num_sequences > 1: 
                    self._macros_alias_dict[new_macro.alias] = new_macro

                self._macros.append(new_macro)
                self._macro_triggers.append(new_macro.trigger_group)
                self._macros_dict[new_macro.trigger_group] = new_macro
                
        except Exception as error:
            print(f"ERROR: {error} \n -> in Macro: {macro}")
            raise Exception(error)

        if CONSTANTS.DEBUG3:
            self.display_internal_repr_groups()

        # extract all triggers for suppression of repeated keys: test V1.0.2.1 Bugfix
        all_triggers = self._rebind_triggers + self._macro_triggers
        for trigger_group in all_triggers:
            self._all_trigger_events.append(trigger_group.get_trigger())#
        
        self._macro_sequence_alias_list = self._macros_alias_dict.keys()

    def apply_focus_groups(self, focus_name = ''):
        if focus_name != '':
            _, focus_group_lines = self.focus_manager.multi_focus_dict[focus_name]
        else:
            _, focus_group_lines = [],[]
        default_lines = self.focus_manager.alias_lines + self.focus_manager.default_group_lines
        self._config_manager.presort_lines(default_lines + focus_group_lines)
        self.initialize_groups_from_presorted_lines()
        
    def update_focus_groups(self):
        self.focus_manager.update_groups_from_config(self.config_manager.load_config())

    def update_args_and_groups(self, focus_name = ''):
        self.release_all_currently_pressed_simulated_keys()
        self._state_manager.stop_all_repeating_keys()
        self._arg_manager.reset_global_variable_changes()
        self.apply_start_args_by_focus_name(focus_name)    
        self.apply_focus_groups(focus_name)    

    def mouse_win32_event_filter(self, msg, data):#
        '''
        #XXX
        '''
        # data:
        # typedef struct tagMSLLHOOKSTRUCT {
        # POINT     pt;
        # DWORD     mouseData;
        # DWORD     flags;
        # DWORD     time;
        # ULONG_PTR dwExtraInfo;

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
            if msg in FST_Keyboard.MSG_MOUSE_DOWN:
                return True
            if msg in FST_Keyboard.MSG_MOUSE_UP:
                return False
            if msg in FST_Keyboard.MSG_MOUSE_SCROLL:
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
            if msg == FST_Keyboard.MSG_MOUSE_SCROLL_VERTICAL:
                return 6
            if msg == FST_Keyboard.MSG_MOUSE_SCROLL_HORIZONTAL:
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

        if not msg == FST_Keyboard.MSG_MOUSE_MOVE:
            
            vk_code = get_mouse_vk_code()
            key_event_time = data.time
            is_keydown = is_press(msg)
            is_simulated = is_simulated_key_event(data.flags)
            # if CONSTANTS.DEBUG:
            #     print(f"D1: vk_coe: {vk_code}, simulated: {is_simulated}, msg: {msg}")       
            if vk_code is not None:      
                self._win32_event_filter(vk_code, key_event_time, is_keydown, is_simulated, is_mouse_event=True)
            else:
                self._listener.suppress()
        
    def keyboard_win32_event_filter(self, msg, data):
        
        def is_simulated_key_event(flags):
            return flags & 0x10

        def is_press(msg):
            if msg in FST_Keyboard.WM_KEYDOWN:
                return True
            if msg in FST_Keyboard.WM_KEYUP:
                return False
        
        vk_code = data.vkCode
        key_event_time = data.time
        is_keydown = is_press(msg)
        is_simulated = is_simulated_key_event(data.flags)
        self._win32_event_filter(vk_code, key_event_time, is_keydown, is_simulated)

    def _win32_event_filter(self, vk_code, key_event_time, is_keydown, is_simulated, is_mouse_event=False):
        """
        Filter and handle keyboard and mouse events.
        """
        
        def time_in_millisec():
            return int(time() * 1000)
       
        def is_trigger_activated(current_ke, trigger_group):
            keys = trigger_group.get_key_events()
            # only trigger on the first key_event in trigger group
            # so only if that key is pressed the trigger can be activated
            if current_ke != keys[0]:    
                return False      
                    
            activated = True
            for key in keys:                         
                if key.is_press:
                    activated = activated and self.state_manager.get_real_key_press_state(key.vk_code)
                else:
                    activated = activated and not self.state_manager.get_real_key_press_state(key.vk_code)
                    
            # first check every other given trigger before evaluating constraints    
            if activated:
                for key in keys:
                    if activated:
                        constraints_fulfilled = self.output_manager.check_constraint_fulfillment(key)
                        activated = activated and constraints_fulfilled
            return activated    
        
        key_replaced = False
        alias_fired = False
        trigger_key_repeated = False
        real_input_repeated = False
        to_be_suppressed = False
        
        current_ke = Key_Event(vk_code, is_keydown)
        
        # get the time difference from system time to the key_event_time
        if FST_Keyboard.TIME_DIFF is None:
            FST_Keyboard.TIME_DIFF = time_in_millisec() - key_event_time
            FST_Keyboard.START_TIME = key_event_time
            # set all key_times to starting time
            self.state_manager.init_all_key_times_to_starting_time(key_event_time)
        
        if CONSTANTS.DEBUG4:
            # print(f"D4:->{"->" if is_simulated else ""} IN  ({key_event_time - FST_Keyboard.START_TIME}): {current_ke } - {"simulated key: " if is_simulated else "real key: "}")
            print(f"D4: {"-- | ->" if is_simulated else "->"} IN  ({key_event_time - FST_Keyboard.START_TIME}): {current_ke } - {"simulated key: " if is_simulated else "real key: "}")
            
        # to help identify vk_codes on key presses
        if self._arg_manager.PRINT_VK_CODES:
        # if True:
            print(f"D1: time: {key_event_time}, vk_code: {vk_code} - {"press  " if is_keydown else "release"} - {"simulated" if is_simulated else "real"}")

        # handle real key input here
        if not is_simulated: 
            # stop repeating keys from being evaluated
            vk_code = current_ke.vk_code
            # exclude mouse events from this
            if not is_mouse_event and current_ke.is_press:
                press_state = self.state_manager.get_real_key_press_state(vk_code)
                if press_state == current_ke.is_press:
                    # if the key is repeated and is a trigger, it will be suppressed
                    if current_ke in self._all_trigger_events:
                        if CONSTANTS.DEBUG3:
                            print(f"repeated key supressed: {current_ke}")
                        to_be_suppressed = True
                        trigger_key_repeated = True
                    real_input_repeated = True
            else:
                trigger_key_repeated = False
            
            # track every real key state in a dict - to recognise repeating
            self.state_manager.set_real_key_press_state(current_ke.vk_code, current_ke.is_press)
            # track real key presses extra (in a set())
            self.state_manager.manage_key_press_states_by_event(current_ke)
            
            
            # here best place to start tracking the timings of presses and releases of real keys
            # only update times if not repeated
            if not real_input_repeated:
                self.state_manager.set_key_times(key_event_time, vk_code, is_keydown, self.state_manager.REAL)
                self.state_manager.set_key_times(key_event_time, vk_code, is_keydown, self.state_manager.ALL)       

                'DEBUG COMBINATIONS HANDLING'
                if CONSTANTS.DEBUG_NUMPAD:
                    self.check_debug_numpad_actions()
                
                'CONTROL HANDLING'
                self.check_control_actions()
 
            # Replace some Buttons :-D
            if not self._arg_manager.WIN32_FILTER_PAUSED and not self._arg_manager.PRINT_VK_CODES:
                
                if not to_be_suppressed:
                    'REBINDS HANDLING'
                    # check for rebinds and replace current key event with replacement key event
                    for trigger_group in self._rebind_triggers:
                        
                        if is_trigger_activated(current_ke, trigger_group):
                            try:
                                rebind = self._rebinds_dict[trigger_group]
                                replacement_ke = rebind.replacement
                                old_ke = current_ke
                                current_ke = replacement_ke
                                key_replaced = True
                            except KeyError as error:
                                if CONSTANTS.DEBUG:
                                    print(f"D1: rebind not found: {error}")
                                    print(self._rebinds_dict)
                                    
                            if key_replaced:
                                # if key is supressed
                                if current_ke.vk_code == FST_Keyboard.SUPPRESS_CODE:
                                    to_be_suppressed = True
                                else:
                                    # check constraints to run evaluation on it
                                    constraints_fulfilled = self.output_manager.check_constraint_fulfillment(current_ke)
                                    
                                    if not constraints_fulfilled:
                                        to_be_suppressed = True
                                    
                                break
                            
                    if key_replaced and not to_be_suppressed:                     
                        # 241009-1459 press state set is updated here with new key (not the press state dict!)
                        self.state_manager.remove_key_press_state(old_ke.vk_code)
                        self.state_manager.manage_key_press_states_by_event(current_ke)
                        if CONSTANTS.DEBUG4:
                           print(f"D4: -- rebind found: {old_ke} -> {current_ke}") 
                                                                                 
                    'STOP REPEATED KEYS FROM HERE'        
                    # prevent evaluation of repeated key events
                    # not earliert to keep rebinds and supression intact - toggling can be a bit fast if key is pressed a long time  
                    
                    if not real_input_repeated and not to_be_suppressed:

                        'TOGGLE STATE'
                        if key_replaced:
                        # if key is to be toggled
                            if current_ke.is_toggle:
                                if old_ke.is_press:
                                    toggle_ke = self.state_manager.get_next_toggle_state_key_event(current_ke)
                                    if CONSTANTS.DEBUG4:
                                        print(f"D4: -- toggle arrived: {current_ke} -> {toggle_ke}")
                                    current_ke = toggle_ke
                                else:
                                    # key up needs to be supressed or else it will be evaluated 2 times each tap
                                    if CONSTANTS.DEBUG4:
                                        print(f"D4: -- toggle suppress: {current_ke}")
                                    to_be_suppressed = True

                        # reset toggle state of key manually released - so toggle will start anew by pressing the key
                        else:
                            self.state_manager.set_toggle_state_to_curr_ke(current_ke)
                        
                        'MACROS HERE'
                        for trigger_group in self._macro_triggers:
                            if is_trigger_activated(current_ke, trigger_group): 
                                alias_fired = True
                                
                                # macro sequence handling is internal in class Macro
                                macro = self._macros_dict[trigger_group]
                                key_sequence = macro.get_key_events_of_current_sequence()
                                    
                                'MACRO playback'
                                # only spawn a thread for execution if more than one key event in to be played key sequence
                                if CONSTANTS.DEBUG:
                                    print(f"D1: key_sequence: {key_sequence}")
                                # if there is an empty key group ... just ignore it and do not supress the triggerkey
                                if len(key_sequence) == 0:
                                    pass
                                elif len(key_sequence) > 0:
                                    
                                    
                                    self.start_macro_playback(macro.alias, key_sequence) 
                                    
                                if CONSTANTS.DEBUG:
                                    print("D1: > playing makro:", trigger_group)
                                    
                                if self._arg_manager.EXEC_ONLY_ONE_TRIGGERED_MACRO:
                                    break
                
                'TAP GROUP EVALUATION HERE'
                # Snap Tap Part of Evaluation
                # Intercept key events if not PAUSED
                if not self._arg_manager.WIN32_FILTER_PAUSED and not self._arg_manager.PRINT_VK_CODES:
                    vk_code, is_keydown, _ = current_ke.get_all()
                    if CONSTANTS.DEBUG: 
                        print("D1: tap group #0")
                        # print(self._tap_groups)               
                        # print(vk_code, is_keydown)               
                    for tap_group in self._tap_groups:
                        if vk_code in tap_group.get_vk_codes():
                            if CONSTANTS.DEBUG: 
                                print(f"D1: tap group {vk_code}")
                            if key_replaced is True:
                                key_replaced = False
                            tap_group.update_tap_states(vk_code, is_keydown) 

                            # send keys
                            self.output_manager.send_keys_for_tap_group(tap_group)
                            # to allow repeated keys from hold, key_to_send is a vk_code
                            if tap_group.get_active_key() != vk_code or not trigger_key_repeated:
                                to_be_suppressed = True
                                break
                            break
                
                # if replacement happened suppress source key event   
                if key_replaced is True and not to_be_suppressed:
                    self.output_manager.send_key_event(current_ke)
                    to_be_suppressed = True
                
                # supress event that triggered an alias - done here because it should also update tap groups before
                if alias_fired is True:
                    to_be_suppressed = True

        'PREVENT CONTRADICTING KEYS IN TAP GROUPS AND IN GENERAL'
        # here the interception of interference of alias with tap groups is realized
        if is_simulated:
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
                                to_be_suppressed = True
                                break
                        # not the active key -> only release allowed
                        else: 
                            if is_keydown:
                                to_be_suppressed = True
                                break
            
            ###XXX 241016-1101 general condradiction prevention disabled to test
            # # intercept simulated releases of keys that are still pressed           
            if not key_is_in_tap_groups and not is_keydown:
                if CONSTANTS.DEBUG2:
                    print(f"D2: {current_ke} may be contrary to real input: real press is: {self.state_manager.get_real_key_press_state(vk_code)}")
                # if it is a toggle key, then let it through even if it contradicts real key state
                if vk_code in self.state_manager.toggle_states_dict_keys:
                    if CONSTANTS.DEBUG2:
                        print(f"D2 not suppressed {current_ke} because it is toggle")
                    pass
                # 241009-1456
                elif not is_mouse_event and self.state_manager.get_key_press_state(vk_code):
                    if CONSTANTS.DEBUG2:
                        print(f"D2 suppressed {current_ke} because it would release real key press state")
            #         to_be_suppressed = True
        
        
        'ALL SUPPRESSION DONE HERE'
        # here arrive all key_events that will be send - last place to intercept
        if to_be_suppressed:
            
            # 241009-1541 if real key was used in a macro, remove it from pressed key set, 
            # to be not used to filter out opposing sim keys
            if alias_fired:
                self.state_manager.remove_key_press_state(current_ke.vk_code)
                if CONSTANTS.DEBUG3:
                    print(f"D3: -- removed {current_ke} from pressed keys")
            if CONSTANTS.DEBUG4:
                print(f"D4: {"-- | XX" if is_simulated else "XX"} SUPPRESSED: {current_ke}")

            self._listener.suppress_event()     
                
        # everything that will be send arrives here      
        vk_code, is_keydown, _ = current_ke.get_all()
        if vk_code > 0:
            if is_simulated:
                # save time of simulated and send keys
                self.state_manager.set_key_times(key_event_time, vk_code, is_keydown, self.state_manager.SIMULATED)
                self.state_manager.set_key_times(key_event_time, vk_code, is_keydown, self.state_manager.ALL) 
                # save press state of all keys to release them on focus change
                self.state_manager.set_simulated_key_press_state(vk_code, current_ke.is_press)
            
        if CONSTANTS.DEBUG4:
            print(f"D4: {"-- | <-" if is_simulated else "<-"} OUT ({key_event_time - FST_Keyboard.START_TIME}): {current_ke } - {"simulated key: " if is_simulated else "real key: "}")

    def start_macro_playback(self, alias_name, key_sequence, stop_event = Event()):

        self.interrupt_macro_by_name(alias_name)
        
        if stop_event.is_set():
            stop_event.clear()
        # stop_event = Event()
        macro_thread = Macro_Thread(key_sequence, stop_event, alias_name, self)
        # save thread and stop event to find it again for possible interruption
        self._macro_thread_dict[alias_name] = [macro_thread, stop_event]
        macro_thread.start()
    
    def interrupt_macro_by_name(self, alias_name):
        try:
            macro_thread, stop_event_old = self._macro_thread_dict[alias_name]
             ## interruptable threads
            if macro_thread.is_alive():
                if CONSTANTS.DEBUG:
                    print(f"D1: {alias_name} is still alive - trying to stop")
                stop_event_old.set()
                macro_thread.join()
        except KeyError:
            if CONSTANTS.DEBUG4:
                print(f"D4: -- macro stop unsucessful - might just be the first start of {alias_name}")
            pass          

    def check_for_combination(self, vk_codes):                 
        all_active = True
        for vk_code in vk_codes:
            if isinstance(vk_code, str):
                vk_code = self.convert_to_vk_code(vk_code)
            all_active = all_active and self.state_manager.get_real_key_press_state(vk_code)
        return all_active
    
    def check_control_actions(self):
        'CONTROLS HERE'
        if self._arg_manager.CONTROLS_ENABLED:                  
                    # # Stop the listener if the MENU combination is pressed
            if self.check_for_combination(CONSTANTS.MENU_Combination):
                self.control_return_to_menu()  
                    # # Stop the listener if the END combination is pressed
            elif self.check_for_combination(CONSTANTS.EXIT_Combination):
                self.control_exit_program()
                    # Toggle paused/resume if the DELETE combination is pressed
            elif self.check_for_combination(CONSTANTS.TOGGLE_ON_OFF_Combination):
                self.control_toggle_pause()
                
        # 'RESET ON ESC AND ALT+TAB'
        # if self.check_for_combination(['esc']):
        #     self.state_manager.release_all_currently_pressed_simulated_keys()
            # self.state_manager.stop_all_repeating_keys()
        # if self.check_for_combination(['alt', 'tab']):
        #     self.state_manager.release_all_currently_pressed_keys()

    def check_debug_numpad_actions(self):
        if self.check_for_combination(['num1']):
            CONSTANTS.DEBUG = not CONSTANTS.DEBUG
        if self.check_for_combination(['num2']):
            CONSTANTS.DEBUG2 = not CONSTANTS.DEBUG2
        if self.check_for_combination(['num3']):
            CONSTANTS.DEBUG3 = not CONSTANTS.DEBUG3
        if self.check_for_combination(['num4']):
            CONSTANTS.DEBUG4 = not CONSTANTS.DEBUG4
        if self.check_for_combination(['num5']):
            self.display_internal_repr_groups()
        if self.check_for_combination(['num7']):
            pprint.pp(f"real_key_state: {self.state_manager._real_key_press_states_dict}")
            pprint.pp(f"sim_key_state: {self.state_manager._simulated_key_press_states_dict}")
        if self.check_for_combination(['num8']):
            pprint.pp(f"all_key_state: {self.state_manager._all_key_press_states_dict}")

    def control_return_to_menu(self):
        self._arg_manager.MENU_ENABLED = True
        self._arg_manager.WIN32_FILTER_PAUSED = True
        print('--- Stopping - Return to menu ---')
        if CONSTANTS.DEBUG3:
            print(f"D3: return to menu with pressed keys: \n {self.state_manager._real_key_press_states_dict}")
        self.release_all_currently_pressed_simulated_keys()
        self._state_manager.stop_all_repeating_keys()
        self._mouse_listener.stop()
        self._listener.stop()

    def control_exit_program(self):
        print('--- Stopping execution ---')
        self.release_all_currently_pressed_simulated_keys()
        self._state_manager.stop_all_repeating_keys()
        self._mouse_listener.stop()
        self._listener.stop()
        self._arg_manager.STOPPED = True
        exit()

    def control_toggle_pause(self):
        if self._arg_manager.WIN32_FILTER_PAUSED:
            self._arg_manager.reset_global_variable_changes()
            self.apply_start_args_by_focus_name(self._focus_manager.FOCUS_APP_NAME)
            self.apply_focus_groups(self._focus_manager.FOCUS_APP_NAME)
            self.cli_menu.clear_cli()
            self._config_manager.display_groups()
            print("\n--- reloaded sucessfully ---")
            print('--- manuelly resumed ---\n')
            if self._arg_manager.CONTROLS_ENABLED:
                self.cli_menu.display_control_text()
            # with paused_lock:
            self._arg_manager.WIN32_FILTER_PAUSED = False
            self._arg_manager.MANUAL_PAUSED = False

        else:
            print('--- manually paused ---')
            # with paused_lock:
            self._arg_manager.WIN32_FILTER_PAUSED = True
            self._arg_manager.MANUAL_PAUSED = True
            self.release_all_currently_pressed_simulated_keys()
            self._state_manager.stop_all_repeating_keys() 
            
              
    def reset_macro_sequence_by_name(self, alias_name, current_ke = ''):
        
        ###XXX if macro and not macro sequence? interrupt the macro without starting it
        ###XXX different easy eval for that - not needed here any more even if it would work - 
        # only triggered when a seqence macro and restart will interrupt it anyway
        ###self.interrupt_macro_by_name(alias_name)
        
        ### +
        try:
            macro_to_reset = self._macros_alias_dict[alias_name]
            ###XXX 241014-1952 only reset if not already resetted or unused
            if macro_to_reset.get_sequence_counter() > 0:
                macro_to_reset.reset_sequence_counter()
                if CONSTANTS.DEBUG4:
                    print(f"D4: -- Macro ({alias_name}) reseted successfully by {current_ke}")
        except KeyError:
            print(f"--- No Macro Sequence with name {alias_name} - reset failed")
            if CONSTANTS.DEBUG:
                print(f"all sequence names: {self._macros_alias_dict.keys()}")

    def apply_start_args_by_focus_name(self, focus_name = ''):
        self._arg_manager.apply_start_arguments(self._arg_manager._sys_start_args)
        self.update_focus_groups()
        # needs to be done after reloading of file or else it will not have the actual data
        if focus_name != '':
            focus_start_arguments, _ = self.focus_manager.multi_focus_dict[focus_name]
        else:
            focus_start_arguments, _ = [],[]  
        self._arg_manager.apply_start_arguments(self.focus_manager.default_start_arguments + focus_start_arguments)
        
    def set_sys_start_arguments(self, sys_args):
        self._arg_manager.sys_start_args = sys_args
          
    def release_all_currently_pressed_simulated_keys(self):
        self._state_manager.release_all_currently_pressed_simulated_keys()
        self._output_manager.clear_all_variables()
        
    def display_internal_repr_groups(self):                    

        print("Aliases")
        for alias, group in self.key_group_by_alias.items():
            print(f"{alias} {group}")  
        print("\n# Tap Groups")
        for group in self._tap_groups:
            print(f"{group}")
        print("\n# Rebinds")
        for rebind in self._rebinds:
            print(f"{rebind}")
        print("\n# Macros")
        for macro in self._macros:
            print(f"{macro}")
        print("\n# Macro Sequences")
        for alias, group in self._macros_alias_dict.items():
            print(f"{group}")
            
    