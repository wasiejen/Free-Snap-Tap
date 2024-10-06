
# STATUS_INDICATOR = False
# STATUS_INDICATOR_SIZE = 100
# CROSSHAIR_ENABLED = False
# CROSSHAIR_DELTA_X = 0
# CROSSHAIR_DELTA_Y = 0

# # global variables
# DEBUG = True
# DEBUG2 = False
# WIN32_FILTER_PAUSED = True
# MANUAL_PAUSED = False
# STOPPED = False
# MENU_ENABLED = True
# CONTROLS_ENABLED = True
# PRINT_VK_CODES = False

# EXEC_ONLY_ONE_TRIGGERED_MACRO = False

# # for focus setting
# FOCUS_THREAD_PAUSED = True
# paused_lock = Lock()

# # AntiCheat testing (ACT)
# ACT_DELAY = True
# ACT_MIN_DELAY_IN_MS = 2
# ACT_MAX_DELAY_IN_MS = 10
# ACT_CROSSOVER = False # will also force delay
# ACT_CROSSOVER_PROPABILITY_IN_PERCENT = 50

# # Alias delay between presses and releases
# ALIAS_MIN_DELAY_IN_MS = ACT_MIN_DELAY_IN_MS 
# ALIAS_MAX_DELAY_IN_MS = ACT_MAX_DELAY_IN_MS

# # Define File name for saving of everything, can be any filetype
# # But .txt or .cfg recommended for easier editing
# FILE_NAME = 'FSTconfig.txt'

# # Constants for key events
# WM_KEYDOWN = [256,260] # _PRESS_MESSAGES = (_WM_KEYDOWN, _WM_SYSKEYDOWN)
# WM_KEYUP = [257,261] # _RELEASE_MESSAGES = (_WM_KEYUP, _WM_SYSKEYUP)

# # Constants for mouse events
# MSG_MOUSE_MOVE = 512
# MSG_MOUSE_SCROLL_VERTICAL = 522
# MSG_MOUSE_SCROLL_HORIZONTAL = 526   

# MSG_MOUSE_DOWN = [513,516,519,523]
# MSG_MOUSE_UP = [514,517,520,524]
# MSG_MOUSE_SCROLL = [MSG_MOUSE_SCROLL_VERTICAL, MSG_MOUSE_SCROLL_HORIZONTAL]

# # Control key combinations
# EXIT_Combination = ["alt", "end"] # END key vkcode 35, ALT 164
# TOGGLE_ON_OFF_Combination = ["alt", "delete"]  # DELETE key vkcode 46
# MENU_Combination = ["alt", "page_down"] # PAGE_DOWN

# SUPPRESS_CODE = -999

# # Tap groups define which keys are mutually exclusive
# # Key Groups define which key1 will be replaced by key2
# # if a Key Group has more than 2 keys if will be handled als alias
# tap_groups = []    # [Tap_Groups]
# rebinds_dict = {}       # Key_Event : Key_Event
# rebind_triggers = []
# macros_dict = {}        # [Key_Group : Key_Group]  # triggers are the Keys to the Item Makro
# macro_triggers = [] 
# all_trigger_events = []

# # hr = human readable form - saves the lines cleaned of comments and presorted
# # these will be shown in menu, because internally they look a bit different (esp rebinds)
# tap_groups_hr = [] 
# rebinds_hr = [] 
# macros_hr = []

# # logging
# alias_thread_logging = []

# # collect all active keys here for recognition of key combinations
# pressed_keys = set()
# released_keys = set()
# # collect active key press/release states to prevent refiring macros while holding a key
# real_key_press_states_dict = {}
# all_key_press_states_dict = {}

# # toggle state tracker
# toggle_state_dict = {}
# alias_toggle_lock = Lock()

# # time_real = [time_real_last_pressed, time_real_last_released, time_real_released, time_real_pressed]
# time_real = [{}, {}, {}, {}]
# # time_simulated = [time_simulated_last_pressed, time_simulated_last_released, time_simulated_released, time_simulated_pressed]
# time_simulated = [{}, {}, {}, {}]
# # time_all = [time_all_last_pressed, time_all_last_released, time_all_released, time_all_pressed]
# time_all = [{}, {}, {}, {}]

# # Initialize the Controller
# controller = keyboard.Controller()
# mouse_controller = mouse.Controller()

# controller_dict = {True: mouse_controller, False: controller}

# mouse_vk_codes_dict = {1: mouse.Button.left, 
#                        2: mouse.Button.right, 
#                        3: mouse.Button.middle,
#                        4: mouse.Button.x1,
#                        5: mouse.Button.x2,
#                        }
# mouse_vk_codes = mouse_vk_codes_dict.keys()


# macro_thread_dict = {}
# macros_sequence_counter_dict = {}

# repeat_thread_dict = {}

# TIME_DIFF = None


# sys_start_args = []


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

    def __init__(self):

        pass


# remplate 
    # @property
    # def data(self):
    #     return self._data

    # @data.setter
    # def data(self, value):
    #     if isinstance(value, dict):
    #         self._data = value
    #     else:
    #         raise ValueError("Data must be a dictionary")

class File_Handler():
    '''
    file handling and hr display of groups
    '''
    
    def __init__(self, file_name = None, focus_manager = None):
        self._file_name = file_name
        self._fm = focus_manager
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
    
        
    def reload_from_file(self):
        # try loading  from file
        try:
            self.load_from_file()
        # if no file exist create new one
        except FileNotFoundError:
            self.create_new_group_file()    
            

    def load_from_file(self):
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
#        self._fm.multi_focus_dict_keys = self._fm.multi_focus_dict.keys()
        self._fm.default_start_arguments = default_start_arguments
        self._fm.default_group_lines = default_group_lines
        
        print(self._fm.default_start_arguments)
        print(self._fm.default_group_lines)
        print(self._fm.multi_focus_dict)
        
         

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
        print(lines)
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
                    
        print(self.tap_groups_hr)
        print(self.rebinds_hr)
        print(self.macros_hr)

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

class System_State_Manage():

    def __init__(self):

        pass

class Focus_Group_Manager():
    
    def __init__(self):
        self._multi_focus_dict = {}
        self._multi_focus_dict_keys = []
        self._default_start_arguments = []
        self._default_group_lines = []
        self.FOCUS_APP_NAME = ''
        pass
    
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

    def __init__(self):
        
        pass

    
class Tap_Keyboard():
    
    def __init__(self, focus_manager = None, state_manager = None):
        if focus_manager is None:
            self._focus_manager = Focus_Group_Manager()
        else:
            self._focus_manager = focus_manager
        if state_manager is None:
            self._state_manager = Input_State_Manager()
        else:
            self._state_manager = state_manager

    @property
    def focus_manager(self):
        return self._focus_manager
    
    @property
    def state_manager(self):
        return self._state_manager
    







# old implementation

class Key_Event(object):
    
    def __init__(self, vk_code, is_press=True, constraints=[0,0], key_string = None, toggle = False):
        self._key_string = key_string
        self._vk_code = vk_code
        self._is_press = is_press
        self._constraints = constraints
        self._toggle = toggle
        
    def get_all(self):
        return self._vk_code, self._is_press, self._constraints

    def get_vk_code(self):
        return self._vk_code

    def get_is_press(self):
        return self._is_press

    def get_constraints(self):
        return self._constraints
    
    def __hash__(self):
        # return hash((self._vk_code, self._state_pressed))
        return hash(f"{self._get_sign()}{self._vk_code}")
    
    # to be able to use complimentory to the Key class and return 2 Key_events
    def get_key_events(self):
        return [self, self]
    
    def get_key_string(self):
        return self._key_string
    
    def get_opposite_key_event(self):
        return Key_Event(self._vk_code, not self._is_press, self._constraints, self._key_string)
    
    def is_prohibited(self):
        return self._prohibited
    
    def is_toggle(self):
        return self._toggle
    
    def _get_sign(self):
        if self._toggle:
            return '^'
        else:
            return '-' if self._is_press else '+'
    
    def __eq__(self, other) -> bool:
        return (self.get_vk_code() == other.get_vk_code()) and (self.get_is_press() is other.get_is_press())
    
    # def __str__(self):
    #     if self._key_string is None:
    #         return f"Key_Event({self._vk_code}, {self._is_press}, {self._constraints})"
    #     else:
    #         return f"Key_Event({self._key_string}, {self._is_press}, {self._constraints})"
        
    def __repr__(self):
        constraints = ''
        for constraint in self._constraints:
            constraints = f"{constraints}|{constraint}"
        if self._key_string is None:
            return f"{self._get_sign()}{self._vk_code}{constraints}"
        else:
            return f"{self._get_sign()}{self._key_string}{constraints}"
            # return f"{self._get_sign()}{self._key_string}{constraints}"
   
class Key(object):
    
    def __init__(self, vk_code, key_string='', constraints=[0,0]) -> None:
        self._key_string = key_string
        self._constraints = constraints
        self._vk_code = vk_code
        key_event = Key_Event(self._vk_code, True, constraints=constraints, key_string=key_string)
        self._key_events = [key_event, key_event.get_opposite_key_event()]

        
    def get_vk_code(self):
        return self._vk_code
    
    def get_key_string(self):
        return self._key_string
    
    def get_key_events(self):
        return self._key_events
    
    def __repr__(self):
        constraints = ''
        for constraint in self._constraints:
            constraints = f"{constraints}|{constraint}"
        return f"{self._key_string}{constraints}"        
     
class Key_Group(object):
    
    def __init__(self, key_events=[]):
        if isinstance(key_events, Key_Event):
            key_events = [key_events]
        self.key_group = key_events
      
    def get_key_events(self):
        return self.key_group
    
    def get_vk_codes(self):
        return [key.get_vk_codes() for key in self.key_group]
    
    def add_key_event(self, key_event):
        self.key_group.append(key_event)
        
    def append(self, key_event):
        self.key_group.append(key_event)
        
    def get_trigger(self):
        return self.key_group[0]
    
    def __hash__(self):
        return hash(self.__repr__())
      
    def __eq__(self, other) -> bool:
        if len(self.key_group) == len(other.get_key_events()):
            equal = True
            for my_key_event, other_key_event in zip(self.key_group, other.get_key_events()):
                equal = equal and my_key_event == other_key_event
            return equal
        else:
            False

    def __repr__(self):
        key_strings = []
        for key_event in self.key_group:
            key_strings.append(repr(key_event))
        return "Key_Group(" + ', '.join(key_strings) + ")"
    
    def __len__(self):
        return len(self.key_group)
      
class Rebind(object):
    
    def __init__(self, trigger, replacement):
        # if isinstance(trigger, Key_Event):
        self.trigger = trigger
        # if isinstance(replacement, Key_Event):
        self.replacement = replacement
   
 
    def get_trigger(self):
        if isinstance(self.trigger, Key):
            return self.trigger.get_key_events()
        else:
            return [self.trigger]
    
    def get_replacement(self):
        return self.replacement
    
    def __repr__(self):
        key_strings = []
        for key in [self.trigger, self.replacement]:
            key_strings.append(repr(key))
        return "Rebind(" + ' : '.join(key_strings) + ")"
    
    # def 
      
class Macro(object):
    
    def __init__(self, trigger= Key_Group([]), key_events_to_play= Key_Group([])):
        if isinstance(trigger, Key_Event):
            self.trigger = Key_Group(trigger)
        else:
            self.trigger = trigger
        if isinstance(key_events_to_play, Key_Event):
            self.key_group = Key_Group(key_events_to_play)
        else:
            self.key_group = key_events_to_play
      
    def get_trigger(self):
        return self.trigger
    
    def get_key_events(self):
        return self.key_group.get_key_events()
    
    def get_all_key_events(self):
        all_key_events = []
        for key in self.key_group:
            if isinstance(key, Key):
                for ke in key.get_key_events():
                    all_key_events.append(ke)
            else:
                all_key_events.append(key)
        return all_key_events
    
    # def get_vk_codes(self):
    #     return [key.get_vk_codes() for key in self.key_group]
    
    def add_key_event(self, key_event):
        self.key_group.add_key_event(key_event)
        
    def __repr__(self):
        text = f"Macro({repr(self.trigger)} : {self.key_group})"               
        return text
    
    def __hash__(self):
        return hash(self.__repr__())
    
    def __eq__(self, other):
        return repr(self) == repr(other)
        
    # def __str__(self):
    #     text = f"({repr(self.trigger)} : {self.key_group})"               
    #     return text
    
    
class Tap_Group(object):
     
    def __init__(self, keys = []) -> None:
         self.keys = keys
         self.states = {}
         self.active_key = None
         for code in self.keys:
             self.states[code] = 0
         self.last_key_pressed = None
         self.last_key_send = None
     
    def update_tap_states(self, vk_code, is_press):
        if is_press:
            self.states[vk_code] = 1
            self.last_key_pressed = vk_code
        else:
            self.states[vk_code] = 0
        self.active_key = self.get_key_to_send()
    
    def get_vk_codes(self):
        return [key.get_vk_code() for key in self.keys]
    
    def get_states(self):
        return self.states
    
    def get_last_key_pressed(self):
        return self.last_key_pressed
    
    def get_key_to_send(self):
        """
        Determine which key to send based on the current state of the tap group.
        - If no keys are pressed, no key is sent.
        - If one key is pressed, that key is sent.
        - If more than one key is pressed, the last pressed key is sent.
        """
        num_of_keys_pressed = sum(self.states.values())
        key_to_send = None
        if num_of_keys_pressed == 1:
            for key, state in self.states.items():
                if state == 1:
                    key_to_send = key
        elif num_of_keys_pressed > 1:
            key_to_send = self.last_key_pressed
        return key_to_send

    def get_active_key(self):
        return self.active_key
    
    def get_last_key_send(self):
        return self.last_key_send
    
    def set_last_key_send(self, last_key_send):
        self.last_key_send = last_key_send
        
    # def __str__(self):
    #     key_strings = []
    #     for key in self.keys:
    #         key_strings.append(repr(key))
    #     return "Tap_Group(" + ','.join(key_strings) + ")"
     
    def __repr__(self):
        key_strings = []
        for key in self.keys:
            key_strings.append(repr(key))
        return "Tap_Group(" + ','.join(key_strings) + ")"      
      
      
      