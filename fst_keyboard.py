'''
Free-Snap-Tap V1.1
last updated: 241008-2259
'''

from pynput import keyboard, mouse
from threading import Event # to play aliases without interfering with keyboard listener
from time import time # sleep(0.005) = 5 ms
from vk_codes import vk_codes_dict  #change the keys you need here in vk_codes_dict.py
from fst_data_types import Key_Event, Key_Group, Key, Tap_Group
from fst_threads import Alias_Thread
from fst_manager import CONSTANTS, CLI_menu, type_check
from fst_manager import Output_Manager, Argument_Manager, Focus_Group_Manager, Input_State_Manager

import pprint
        
        
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
    def cli_menu(self):
        return self._cli_menu
    @property
    def macro_thread_dict(self):
        return self._macro_thread_dict
    @property
    def macros_sequence_counter_dict(self):
        return self._macros_sequence_counter_dict
    
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
        c = []
        self._rebinds_dict = {}
        self._rebind_triggers = []
        self._macros_dict = {}
        self._macro_triggers = []
        self._all_trigger_events = []
        
        def extract_data_from_key(key):
            #separate delay info from string
            if '|' in key:
                key, *delays = key.split('|')
                if CONSTANTS.DEBUG: 
                    print(f"D1: delays for {key}: {delays}")
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
                new_element = (Key(vk_code, constraints=delays, key_string=key, is_toggle=True))
            return new_element
        
        # extract tap groups
        try:
            for group in self.config_manager.tap_groups_hr:
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
            for rebind in self.config_manager.rebinds_hr:
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
                            temp = replacement_key
                            replacement_key = Key(temp.vk_code, constraints=temp.constraints, key_string=temp.key_string)
                    both_are_Keys = True
                
                trigger_key, *trigger_rest = new_trigger_group
                
                # if both are key_events
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
            for macro in self.config_manager.macros_hr:
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

        # if CONSTANTS.DEBUG3:
        #     pprint.pp(f"\nD3: tap_groups: {self._tap_groups}")
        #     pprint.pp(f"\nD3: rebinds_dict: {self._rebinds_dict}")
        #     pprint.pp(f"\nD3: macros_dictps: {self._macros_dict}")
            
        # extract all triggers for suppression of repeated keys: test V1.0.2.1 Bugfix
        all_triggers = self._rebind_triggers + self._macro_triggers
        for trigger_group in all_triggers:
            self._all_trigger_events.append(trigger_group.get_trigger())
    
    def apply_focus_groups(self, focus_name = ''):
        if focus_name != '':
            _, focus_group_lines = self.focus_manager.multi_focus_dict[focus_name]
        else:
            _, focus_group_lines = [],[]
        self._config_manager.presort_lines(self.focus_manager.default_group_lines + focus_group_lines)
        self.initialize_groups()
        
    def update_args_and_groups(self, focus_name = ''):
        self._state_manager.release_all_currently_pressed_keys()
        self._state_manager.stop_all_repeating_keys()
        self.args.reset_global_variable_changes()
        self.args.apply_start_args_by_focus_name(focus_name)    
        self.apply_focus_groups(focus_name)    

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
        # veritcal scoll
        # if msg == MSG_MOUSE_SCROLL_VERTICAL:
        #     skip_event = True
        # # horizontal scroll
        # if msg == MSG_MOUSE_SCROLL_HORIZONTAL:
        #     skip_event = True

        if not msg == FST_Keyboard.MSG_MOUSE_MOVE:
            
            vk_code = get_mouse_vk_code()
            key_event_time = data.time
            is_keydown = is_press(msg)
            is_simulated = is_simulated_key_event(data.flags)
            if CONSTANTS.DEBUG:
                print(f"D1: vk_coe: {vk_code}, simulated: {is_simulated}, msg: {msg}")       
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
                    
                    constraints_fulfilled = self.output_manager.check_constraint_fulfillment(key)
                    # if reset code then ignore result for activation
                    if key.vk_code < 0:
                        if constraints_fulfilled:
                            self.reset_macro_sequence_by_reset_code(key.vk_code, trigger_group)
                    else:
                        activated = activated and constraints_fulfilled
            return activated    
        
        key_replaced = False
        alias_fired = False
        trigger_key_repeated = False
        real_input_repeated = False
        to_be_suppressed = False
        
        current_ke = Key_Event(vk_code, is_keydown)
        
        if CONSTANTS.DEBUG4:
            print(f"D4:->-> IN  ({key_event_time - FST_Keyboard.START_TIME}): {current_ke } - {"simulated key: " if is_simulated else "real key: "}")

        # get the time difference from system time to the key_event_time
        if FST_Keyboard.TIME_DIFF is None:
            FST_Keyboard.TIME_DIFF = time_in_millisec() - key_event_time
            FST_Keyboard.START_TIME = key_event_time
            # set all key_times to starting time
            self.state_manager.init_all_key_times_to_starting_time(key_event_time)
        
        # to help identify vk_codes on key presses
        if self.args.PRINT_VK_CODES or CONSTANTS.DEBUG:
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
            if not self.args.WIN32_FILTER_PAUSED and not self.args.PRINT_VK_CODES:
                
                if not to_be_suppressed:
                    'REBINDS HANDLING'
                    # check for rebinds and replace current key event with replacement key event
                    for trigger_group in self._rebind_triggers:
                        
                        if is_trigger_activated(current_ke, trigger_group):
                            try:
                                replacement_ke = self._rebinds_dict[trigger_group]
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
                                    
                                    # handling of reset codes for macro sequences in rebinds
                                    elif current_ke.vk_code <= 0:
                                        self.reset_macro_sequence_by_reset_code(current_ke.vk_code)
                                        to_be_suppressed = True
                                break
                            
                    if key_replaced and not to_be_suppressed:                     
                        # 241009-1459 press state set is updated here with new key (not the press state dict!)
                        self.state_manager.remove_key_press_state(old_ke.vk_code)
                        self.state_manager.manage_key_press_states_by_event(current_ke)
                        if CONSTANTS.DEBUG4:
                           print(f"D4: updated replacmenet key {current_ke}, removed {old_ke}") 
                                                                                 
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
                                    if CONSTANTS.DEBUG3:
                                        print(f"D3: toggle arrived: {current_ke} -> {toggle_ke}")
                                    current_ke = toggle_ke
                                else:
                                    # key up needs to be supressed or else it will be evaluated 2 times each tap
                                    if CONSTANTS.DEBUG3:
                                        print(f"D3: toggle suppress: {current_ke}")
                                    to_be_suppressed = True

                        # reset toggle state of key manually released - so toggle will start anew by pressing the key
                        else:
                            self.state_manager.set_toggle_state_to_curr_ke(current_ke)
                        
                        'MACROS HERE'
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
                                if CONSTANTS.DEBUG:
                                    print(f"D1: key_sequence: {key_sequence}")
                                # if there is an empty key group ... just ignore it and do not supress the triggerkey
                                if len(key_sequence) == 0:
                                    pass
                                elif len(key_sequence) > 0:
                                    try:
                                        macro_thread, stop_event = self._macro_thread_dict[trigger_group]
                                        ## interruptable threads
                                        if macro_thread.is_alive():
                                            if CONSTANTS.DEBUG:
                                                print(f"D1: {trigger_group}-macro: still alive - try to stop")
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
                                    
                                if CONSTANTS.DEBUG:
                                    print("D1: > playing makro:", trigger_group)
                                    
                                if self.args.EXEC_ONLY_ONE_TRIGGERED_MACRO:
                                    break
                
                'TAP GROUP EVALUATION HERE'
                # Snap Tap Part of Evaluation
                # Intercept key events if not PAUSED
                if not self.args.WIN32_FILTER_PAUSED and not self.args.PRINT_VK_CODES:
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
            
            # # intercept simulated releases of keys that are still pressed           
            if not key_is_in_tap_groups and not is_keydown:
                if CONSTANTS.DEBUG2:
                    print(f"D2: {current_ke} may be contrary to real input: real press is: {self.state_manager.get_real_key_press_state(vk_code)}")
                # if it is a toggle key, then let it through even if it contradicts real key state
                if vk_code in self.state_manager.toggle_states_dict_keys:
                    pass
                # 241009-1456
                if not is_mouse_event and self.state_manager.get_key_press_state(vk_code):
                    if CONSTANTS.DEBUG2:
                        print(f"D2 suppressed {current_ke} because it would release real key press state")
                    to_be_suppressed = True
        
        
        'ALL SUPPRESSION DONE HERE'
        # here arrive all key_events that will be send - last place to intercept
        if to_be_suppressed:
            
            # 241009-1541 if real key was used in a macro, remove it from pressed key set, 
            # to be not used to filter out opposing sim keys
            # if not is_simulated and not key_replaced:
            if alias_fired:
                self.state_manager.remove_key_press_state(current_ke.vk_code)
                if CONSTANTS.DEBUG4:
                    print(f"D4: removed {current_ke} from pressed keys")
            
            if key_replaced and current_ke.is_toggle:
                ###XXX even needed anymore???
                if CONSTANTS.DEBUG4:
                    print(f"D4: not suppressed bec of toggle: {current_ke}")
            else:
                if CONSTANTS.DEBUG4:
                    print(f"D4:---- SUPPRESSED: {current_ke}")
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
            print(f"D4:<-<- OUT ({key_event_time - FST_Keyboard.START_TIME}): {current_ke } - {"simulated key: " if is_simulated else "real key: "}")
                        

    def check_for_combination(self, vk_codes):                 
        all_active = True
        for vk_code in vk_codes:
            if isinstance(vk_code, str):
                vk_code = self.convert_to_vk_code(vk_code)
            all_active = all_active and self.state_manager.get_real_key_press_state(vk_code)
        return all_active
    
    def check_control_actions(self):
        'CONTROLS HERE'
        if self.args.CONTROLS_ENABLED:                  
                    # # Stop the listener if the MENU combination is pressed
            if self.check_for_combination(CONSTANTS.MENU_Combination):
                self.control_return_to_menu()  
                    # # Stop the listener if the END combination is pressed
            elif self.check_for_combination(CONSTANTS.EXIT_Combination):
                self.control_exit_program()
                    # Toggle paused/resume if the DELETE combination is pressed
            elif self.check_for_combination(CONSTANTS.TOGGLE_ON_OFF_Combination):
                self.control_toggle_pause()
                
        'RESET ON ESC AND ALT+TAB'
                # TODO: as key_event? 'release_all_pressed_keys'
        if self.check_for_combination(['esc']):
            self.state_manager.release_all_currently_pressed_keys()
        if self.check_for_combination(['alt', 'tab']):
            self.state_manager.release_all_currently_pressed_keys()

    def check_debug_numpad_actions(self):
        if self.check_for_combination(['num1']):
            CONSTANTS.DEBUG = not CONSTANTS.DEBUG
        if self.check_for_combination(['num2']):
            CONSTANTS.DEBUG2 = not CONSTANTS.DEBUG2
        if self.check_for_combination(['num3']):
            CONSTANTS.DEBUG3 = not CONSTANTS.DEBUG3
        if self.check_for_combination(['num4']):
            CONSTANTS.DEBUG4 = not CONSTANTS.DEBUG4
        if self.check_for_combination(['num7']):
            pprint.pp(f"real_key_state: {self.state_manager._real_key_press_states_dict}")
            pprint.pp(f"sim_key_state: {self.state_manager._simulated_key_press_states_dict}")
        if self.check_for_combination(['num8']):
            pprint.pp(f"all_key_state: {self.state_manager._all_key_press_states_dict}")

    def control_return_to_menu(self):
        self.args.MENU_ENABLED = True
        self.args.WIN32_FILTER_PAUSED = True
        print('--- Stopping - Return to menu ---')
        if CONSTANTS.DEBUG3:
            print(f"D3: return to menu with pressed keys: \n {self.state_manager._real_key_press_states_dict}")
        self.state_manager.release_all_currently_pressed_keys()
        self.state_manager.stop_all_repeating_keys()
        self._mouse_listener.stop()
        self._listener.stop()

    def control_exit_program(self):
        print('--- Stopping execution ---')
        self.state_manager.release_all_currently_pressed_keys()
        self.state_manager.stop_all_repeating_keys()
        self._mouse_listener.stop()
        self._listener.stop()
        self.args.STOPPED = True
        exit()

    def control_toggle_pause(self):
        if self.args.WIN32_FILTER_PAUSED:
            self.args.reset_global_variable_changes()
            self.args.apply_start_args_by_focus_name(self._focus_manager.FOCUS_APP_NAME)
            self.apply_focus_groups(self._focus_manager.FOCUS_APP_NAME)
            self.cli_menu.clear_cli()
            self._config_manager.display_groups()
            print("\n--- reloaded sucessfully ---")
            print('--- manuelly resumed ---\n')
            if self.args.CONTROLS_ENABLED:
                self.cli_menu.display_control_text()
            # with paused_lock:
            self.args.WIN32_FILTER_PAUSED = False
            self.args.MANUAL_PAUSED = False

        else:
            print('--- manually paused ---')
            # with paused_lock:
            self.args.WIN32_FILTER_PAUSED = True
            self.args.MANUAL_PAUSED = True
            self.state_manager.release_all_currently_pressed_keys()
            self.state_manager.stop_all_repeating_keys() 
            
    def reset_macro_sequence_by_reset_code(self, vk_code, trigger_group = None):
        
        reset_code = vk_code
        print(f"reset code played: {reset_code}")
        # reset current trigger of this event - return this code to alias tread
        try:
            try:
                # reset self macro sequence
                if reset_code == -255:
                    if trigger_group is None:
                        print("ERROR: self reset only possible from the macro sequence to be reseted")
                    else:
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
