class Key_Event(object):
    
    def __init__(self, vk_code, is_press=True, delays=[0,0], key_string = None, toggle = False):
        self._key_string = key_string
        self._vk_code = vk_code
        self._is_press = is_press
        self._delays = delays
        self._toggle = toggle
        
    def get_all(self):
        return self._vk_code, self._is_press, self._delays

    def get_vk_code(self):
        return self._vk_code

    def get_is_press(self):
        return self._is_press

    def get_delays(self):
        return self._delays
    
    def __hash__(self):
        # return hash((self._vk_code, self._state_pressed))
        return hash(f"{self._get_sign()}{self._vk_code}")
    
    # to be able to use complimentory to the Key class and return 2 Key_events
    def get_key_events(self):
        return [self, self]
    
    def get_key_string(self):
        return self._key_string
    
    def get_opposite_key_event(self):
        return Key_Event(self._vk_code, not self._is_press, self._delays, self._key_string)
    
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
    #         return f"Key_Event({self._vk_code}, {self._is_press}, {self._delays})"
    #     else:
    #         return f"Key_Event({self._key_string}, {self._is_press}, {self._delays})"
        
    def __repr__(self):
        delay = ''
        if self._key_string is None:
            return f"{self._get_sign()}{self._vk_code}{delay}"
        else:
            return f"{self._get_sign()}{self._key_string}{delay}"
            # return f"{self._get_sign()}{self._key_string}{delay}"
   
class Key(object):
    
    def __init__(self, vk_code, key_string='', delays=[0,0]) -> None:
        self._key_string = key_string
        self._delays = delays
        self._vk_code = vk_code
        key_event = Key_Event(self._vk_code, True, delays=delays, key_string=key_string)
        self._key_events = [key_event, key_event.get_opposite_key_event()]

        
    def get_vk_code(self):
        return self._vk_code
    
    def get_key_string(self):
        return self._key_string
    
    def get_key_events(self):
        return self._key_events
    
    def __repr__(self):
        delay = f"|{self._delays[0]}|{self._delays[1]}"
        delay = ''
        if self._reversed:
            return f"!{self._key_string}{delay}"
        else:
            return f"{self._key_string}{delay}"        
     
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
      
      
      