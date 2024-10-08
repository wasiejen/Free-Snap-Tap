'''
Free-Snap-Tap V1.1
last updated: 241008-1643
'''

from abc import ABC, abstractmethod

class Input_Event(ABC):
    '''
    #XXX
    '''
    def __init__(self, vk_code, constraints=[0,0], key_string = ''):
        self._key_string = key_string
        self._vk_code = vk_code
        self._constraints = constraints

    @property
    def vk_code(self):
        return self._vk_code
        
    @property
    def constraints(self):
        return self._constraints
    
    @property
    def key_string(self):
        return self._key_string
    
    @abstractmethod
    def __hash__(self):
        pass
    
    # to be able to use complimentory to the Key class and return 2 Key_events
    @abstractmethod
    def get_key_events(self):
        pass
    
    @abstractmethod
    def _get_sign(self):
        pass
    
    @abstractmethod
    def __eq__(self, other) -> bool:
        pass

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
    

class Key_Event(Input_Event):
    '''
    #XXX
    '''    
    def __init__(self, vk_code, is_press=True, constraints=[0,0], key_string = None, is_toggle = False):
        super().__init__(vk_code, constraints=constraints, key_string=key_string)
        self._is_press = is_press
        self._is_toggle = is_toggle
        
    @property
    def is_press(self):
        return self._is_press
    
    @property
    def is_toggle(self):
        return self._is_toggle
    @is_toggle.setter
    def is_toggle(self, new_bool):
        self._is_toggle = new_bool

    def get_all(self):
        return self._vk_code, self._is_press, self._constraints
    
    def __hash__(self):
        # return hash((self._vk_code, self._state_pressed))
        return hash(f"{self._get_sign()}{self._vk_code}")
    
    # to be able to use complimentory to the Key class and return 2 Key_events
    def get_key_events(self):
        return [self, self]
    
    def get_opposite_key_event(self):
        return Key_Event(self._vk_code, not self._is_press, self._constraints, self._key_string)
    
    def __eq__(self, other) -> bool:
        return (self.vk_code == other.vk_code) and (self.is_press is other.is_press)
    
    def _get_sign(self):
        return '-' if self._is_press else '+'
    
   
class Key(Input_Event):
    '''
    #XXX
    '''    
    def __init__(self, vk_code, key_string='', constraints=[0,0], is_toggle=False):
        super().__init__(vk_code, constraints=constraints, key_string=key_string)
        self._is_toggle = is_toggle
        
        self.key_event = Key_Event(self._vk_code, is_press=True, constraints=constraints, key_string=key_string)
        if self._is_toggle:
            self.key_event.is_toggle = True
            self._key_events = [self.key_event, self.key_event]
        else:
            self._key_events = [self.key_event, self.key_event.get_opposite_key_event()]
    
    @property
    def is_toggle(self):
        return self._is_toggle
    
    def get_key_events(self):
        return self._key_events
    
    def _get_sign(self):
        return '^' if self._is_toggle else ''  
    
    def __hash__(self):
        return hash(f"{self._get_sign()}{self._vk_code}")
               
    def __eq__(self, other) -> bool:
        raise NotImplementedError
  
  
# not yet updated implementation
   
class Key_Group(object):
    '''
    #XXX
    '''    
    def __init__(self, key_events=[]):
        if isinstance(key_events, Key_Event):
            key_events = [key_events]
        self.key_group = key_events
      
    def get_key_events(self):
        return self.key_group
    
    def get_vk_codes(self):
        return [key.vk_codes for key in self.key_group]
    
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
      
# class Rebind(object):
    
#     def __init__(self, trigger, replacement):
#         # if isinstance(trigger, Key_Event):
#         self.trigger = trigger
#         # if isinstance(replacement, Key_Event):
#         self.replacement = replacement
   
 
#     def get_trigger(self):
#         if isinstance(self.trigger, Key):
#             return self.trigger.get_key_events()
#         else:
#             return [self.trigger]
    
#     def get_replacement(self):
#         return self.replacement
    
#     def __repr__(self):
#         key_strings = []
#         for key in [self.trigger, self.replacement]:
#             key_strings.append(repr(key))
#         return "Rebind(" + ' : '.join(key_strings) + ")"
    
#     # def 
      
# class Macro(object):
    
#     def __init__(self, trigger= Key_Group([]), key_events_to_play= Key_Group([])):
#         if isinstance(trigger, Key_Event):
#             self.trigger = Key_Group(trigger)
#         else:
#             self.trigger = trigger
#         if isinstance(key_events_to_play, Key_Event):
#             self.key_group = Key_Group(key_events_to_play)
#         else:
#             self.key_group = key_events_to_play
      
#     def get_trigger(self):
#         return self.trigger
    
#     def get_key_events(self):
#         return self.key_group.get_key_events()
    
#     def get_all_key_events(self):
#         all_key_events = []
#         for key in self.key_group:
#             if isinstance(key, Key):
#                 for ke in key.get_key_events():
#                     all_key_events.append(ke)
#             else:
#                 all_key_events.append(key)
#         return all_key_events
    
#     # def get_vk_codes(self):
#     #     return [key.get_vk_codes() for key in self.key_group]
    
#     def add_key_event(self, key_event):
#         self.key_group.add_key_event(key_event)
        
#     def __repr__(self):
#         text = f"Macro({repr(self.trigger)} : {self.key_group})"               
#         return text
    
#     def __hash__(self):
#         return hash(self.__repr__())
    
#     def __eq__(self, other):
#         return repr(self) == repr(other)
        
#     # def __str__(self):
#     #     text = f"({repr(self.trigger)} : {self.key_group})"               
#     #     return text
    
    
class Tap_Group(object):
    '''
    #XXX
    '''     
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
        return [key.vk_code for key in self.keys]
    
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
      
