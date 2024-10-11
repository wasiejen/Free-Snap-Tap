'''
Free-Snap-Tap V1.1
last updated: 241008-1643
'''

from abc import ABC, abstractmethod

# decorator data type_check
def type_check(expected_type):
    def decorator(func):
        def wrapper(self, value):
            if not isinstance(value, expected_type):
                raise TypeError(f"Expected {expected_type}, got {type(value)}")
            return func(self, value)
        return wrapper
    return decorator


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
        value = 0
        for constraint in self._constraints:
            if isinstance(constraint, str):
                constraints += f"|({constraint})"
            if isinstance(constraint, int):
                if value != constraint:
                    value = constraint
                    constraints += f"{'|' + str(constraint) if constraint != 0 else ''}"
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
        # return hash(f"{self._get_sign()}{self._vk_code}")
        return hash(self.__repr__())
    
    # to be able to use complimentory to the Key class and return 2 Key_events
    def get_key_events(self):
        return [self, self]
    
    def get_opposite_key_event(self):
        return Key_Event(self._vk_code, not self._is_press, self._constraints, self._key_string)
    
    def __eq__(self, other) -> bool:
        return (self.vk_code == other.vk_code) and (self.is_press is other.is_press)
    
    def _get_sign(self):
        return '-' if self._is_press else '+'
    
    def repr_wo_constraints(self):
        if self._key_string is None:
            return f"{self._get_sign()}{self._vk_code}"
        else:
            return f"{self._get_sign()}{self._key_string}" 
    
   
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
  
 
class Key_Group(object):
    '''
    #XXX
    '''    
    def __init__(self, key_events=[]):
        if isinstance(key_events, Key_Event):
            key_events = [key_events]
        self._key_events = key_events
    
    @property
    def key_events(self):
        return self._key_events.copy()
    
    @key_events.setter
    @type_check(list)
    def key_events(self, new_list):
        self._key_events = new_list
        
    def get_key_events(self):
        return self._key_events
    
    def get_vk_codes(self):
        return [key.vk_codes for key in self._key_events]
    
    def add_key_event(self, key_event):
        self._key_events.append(key_event)
        
    def append(self, key_event):
        self._key_events.append(key_event)
        
    def get_trigger(self):
        return self._key_events[0]
    
    def __hash__(self):
        return hash(self.__repr__())
      
    def __eq__(self, other) -> bool:
        if len(self._key_events) == len(other.get_key_events()):
            equal = True
            for my_key_event, other_key_event in zip(self._key_events, other.get_key_events()):
                equal = equal and my_key_event == other_key_event
            return equal
        else:
            False

    def __repr__(self):
        key_strings = []
        for key_event in self._key_events:
            key_strings.append(repr(key_event))
        return "KG(" + ', '.join(key_strings) + ")"
    
    def __len__(self):
        return len(self._key_events)
    
    
class Rebind(object):
    
    def __init__(self, trigger_group, replacement):
        self._trigger_group = trigger_group
        self._replacement = replacement
        self._alias = ''
        
    @property
    def alias(self):
        return self._alias
    @alias.setter
    @type_check(str)
    def alias(self, alias):
        self._alias = alias
        
    @property
    def trigger_group(self):
        return self._trigger_group
    
    @trigger_group.setter
    @type_check(Key_Group)
    def trigger_group(self, new_list):
        self._trigger_group = new_list

    @property
    def replacement(self):
        return self._replacement
    
    @replacement.setter
    @type_check(Key_Event)
    def replacement(self, new_list):
        self._replacement = new_list
        
    def get_trigger(self):
        return self._trigger_group.get_trigger()
        
    # def get_trigger_group(self):
    #     return self._trigger_group
        
    def __hash__(self):
        return hash(self.__repr__())
    
    def __eq__(self, other):
        equal = True
        equal = equal and self.trigger_group == other.trigger_group
        equal = equal and self.replacement == other.replacement
        return equal
    
    def __repr__(self):
        return f"{self._alias} {self._trigger_group} : {self._replacement}"
        
    
class Macro(object):
    
    def __init__(self, trigger_group, key_groups):
        self._trigger_group = trigger_group
        self._key_groups = key_groups
        self._sequence_counter = 0
        self._num_sequences = len(self._key_groups)
        self._alias = ''
        
    @property
    def alias(self):
        return self._alias
    @alias.setter
    @type_check(str)
    def alias(self, alias):
        self._alias = alias

    @property
    def trigger_group(self):
        return self._trigger_group
    
    @property
    def num_sequences(self):
        return self._num_sequences
    
        
    def _get_key_group(self):
        if self._num_sequences == 0:
            raise ValueError("No key groups in Macro")
        elif self._num_sequences == 1:
            return self._key_groups[0]
        else:
            if self._sequence_counter >= self._num_sequences:
                self._sequence_counter = 0
            group = self._key_groups[self._sequence_counter]
            self._sequence_counter += 1
            return group
        
    def get_key_events_of_current_sequence(self):
        return self._get_key_group().get_key_events()
        
    def reset_sequence_counter(self):
        self._sequence_counter = 0
        
    def get_trigger(self):
        return self._trigger_group.get_trigger()
    
    def __hash__(self):
        return hash(self.__repr__())

    def __eq__(self, other):
        raise NotImplementedError
    
    def __repr__(self):
        output = f"{self._alias} {self._trigger_group} :: {self._key_groups[0]}"
        if self._num_sequences > 1:
            inset = output.find('::')
            for key_group in self._key_groups[1:]:
                output += f"\n{' ' * inset} : {key_group}"
        return output
    
# class Macro_Sequence(Macro):
    
#     def __init__(self):
#         super().__init__(self)

#     def __hash__(self):
#         return hash(self.__repr__())
    
#     def __eq__(self, other):
#         raise NotImplementedError
#     def __repr__(self):
#         raise NotImplementedError
    
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
        self._alias = ''
        
    @property
    def alias(self):
        return self._alias
    @alias.setter
    @type_check(str)
    def alias(self, alias):
        self._alias = alias
     
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
      
