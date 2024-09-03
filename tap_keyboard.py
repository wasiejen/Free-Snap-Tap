#from pynput import keyboard, mouse    
from random import randint
from time import sleep, time
#import time
from threading import Thread, Lock
 
class Tap_Keyboard(object):
    
    def __init__(self):
        self._real_key_states = {}
        self._virtual_key_states = {}
        for index in range(262):
            self._real_key_states[index] = None
            self._virtual_key_states[index] = None
        self._tap_groups = []     # [Tap_Groups]
        self._rebinds = {}        # Key_Event : Key_Event
        self._makros = {}         # Key_Group : Makro  # triggers are the Keys to the Item Makro
        self._triggers = []       # [Key_Groups]
        self._activated_triggers = []
        self._played_triggers = []
        
    def press(self, vk_code):
        self._update_real_key_states(vk_code, True)
        
    def release(self, vk_code):
        self._update_real_key_states(vk_code, False)
        
    def _update_real_key_states(self, vk_code, is_press):        
        # check for rebinds
        key_event = Key_Event(vk_code, is_press)
        if key_event in self._rebinds.keys():
            
            key_event = self._rebinds[key_event]
            # # only update if changed
            # if self._real_key_states[self._rebinds[key_event]] is not is_press:
            #     self._real_key_states[self._rebinds[key_event]] = is_press
                
            #     self._update_trigger_status()
                
            #     key_event = Key_Event(self._rebinds[key_event], is_press)                
            #     self._send_key_event(key_event)
                
        # only update if changed
        if self._real_key_states[key_event.get_vk_codes()] is not key_event.get_is_press():
            self._real_key_states[key_event.get_vk_codes()] = key_event.get_is_press()
            
            self._update_tap_groups(key_event)
            self._update_trigger_status()
            self._send_key_event(key_event)
        
    def _update_virtual_key_states(self, vk_code, is_press):
        key_event = Key_Event(vk_code, is_press)
        # only update if changed
        if self._virtual_key_states[key_event.get_vk_codes()] is not key_event.get_is_press():
            self._virtual_key_states[key_event.get_vk_codes()] = key_event.get_is_press()
            # TODO:2 not needed if only real keys can trigger triggers :-)
            # self._update_status()
            
            
            self._send_key_event(key_event)
    
    def _update_tap_groups(self, key_event):
        vk_code, is_press = key_event.vk_code(), key_event.is_press()
        updated = False
        for tap_group in self._tap_groups:
            if vk_code in tap_group.get_vk_codes():
                tap_group.update_tap_states(vk_code, is_press)
                updated = True
                break
        return updated   
        
    
    def _update_trigger_status(self):
        self._check_triggers()
        self._play_triggered()
        #self._send_key_event()  
        
    def _send_key_event(self, key_event):
        # TODO send keys that are not triggering anything
        # base on actual state
        
        # I do not know right now how to inregrate tap groups
            # group of Keys (new class)?
        # how to determine which keys exactly to send
        # if I should use Key_event for that
        
        # 1 is vk_code in a tap group?
            # if yes determine what key to send for the tap group
            # here I have to prioritize real input
        # 2 send key_event   
        for tap_group in self._tap_groups:
            for vk_code in tap_group:
                pass 
          
        pass
         
    def _get_key_states(self, vk_code):
        real_press = self._real_key_states[vk_code]
        virtual_press = self._virtual_key_states[vk_code]
        return real_press, virtual_press
    
    def add_makro(self, makro):
        trigger = makro.get_trigger()
        self._makros[trigger] = makro
        self._triggers.append(trigger)
        
    def add_rebind(self, key_trigger, key_replacment):
        # Dict of Key_Event : Key_Event
        self._rebinds[key_trigger] = key_replacment
        
    def add_tap_group(self, tap_group):
        # just a list of lists of vk_codes
        self._tap_groups.append(tap_group)
    
    # all this effort mainly because to use this here xD 
    def _is_key_pressed(self, vk_code):
        # determines resultig key from combining virtual and real key presses together
        # determines which input has priotiry - real    
        # TODO:2 should aliases be triggerable by virtual key states?????
            # I think not - just to remove the danger of a infinite loop       
        if self._real_key_states[vk_code] is True:
            return True
        # elif self._virtual_key_states[vk_code] is True:
        #     return True
        else:
            return False
        
    def _check_matching_key_state(self, key_event):
        return self._is_key_pressed(key_event.vk_code()) == key_event.is_press()
        
    def _check_triggers(self):
        self._activated_triggers = []
        for trigger in self._triggers:
            # check if triggered
            # TODO
            if isinstance(trigger, Key_Event):
                if self._check_matching_key_state(trigger):
                    self._activated_triggers.append(trigger)
                    print("rebind found ",  trigger)
            else:
                triggered = True
                for key_event in trigger.get_key_events():
                    triggered = triggered and self._check_matching_key_state(key_event)
                    #print(trigger, key_event, triggered)
                if triggered:
                    print("trigger found ", trigger)
                    self._activated_triggers.append(trigger)
           
         # remove triggers from played that are not activated any more
        cleaned_triggers = []
        

        for trigger in self._played_triggers:
            if trigger in self._activated_triggers:
                cleaned_triggers.append(trigger)
        self._played_triggers = cleaned_triggers
        #print("played: ",self._played_triggers)
        #print("activated: ",self._activated_triggers)
        
    def _play_triggered(self):
        for trigger in self._activated_triggers:
            if trigger not in self._played_triggers:
                # important is to first add to abort function here or else else 
                # unending recursion while same trigger starts a new makro playback
                self._played_triggers.append(trigger)
                print(f"added trigger to played triggers: {self._played_triggers}")
                # spawn thread for makro playback
                makro = self._makros[trigger]
                thread = Alias_Thread(makro)
                print("> playing makro:", makro)
                thread.start()

alias_thread_logging = []

class Alias_Thread(Thread):
    '''
    
    '''

    def __init__(self, makro):
        Thread.__init__(self)
        self.stop = False
        self.daemon = True
        self.key_group = makro.get_key_events()
        
    def run(self):     
        try:   
            for key_event in self.key_group:
                alias_thread_logging.append(f"{time() - starttime:.5f}: Send virtual key: {key_event}")
                vk_code, is_press, delays = key_event.get_all()
                # kb._update_virtual_key_states(vk_code, is_press)
                min, max = delays
                if min > max: 
                    min,max = max,min
                sleep(randint(min, max) / 1000)
        except Exception as error:
            alias_thread_logging.append(error)
        pass
           
class Key(object):
    
    def __init__(self, key_string, vk_code, reversed = False, delays=[0,0]) -> None:
        self._key_string = key_string
        self._delays = delays
        self._reversed = reversed
        self._vk_code = vk_code
        self._key_events = [Key_Event(self._vk_code, True, delays=delays, key_string=key_string), 
                           Key_Event(self._vk_code, False, delays=delays, key_string=key_string)]
        if self._reversed:
            self._key_events[0], self._key_events[1] = self._key_events[1], self._key_events[0]
        
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
              
                       
class Key_Event(object):
    
    def __init__(self, vk_code, is_press=True, delays=[0,0], key_string = None):
        self._key_string = key_string
        self._vk_code = vk_code
        self._is_press = is_press
        self._delays = delays

        
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
        return hash(f"{'-' if self._is_press else '+'}{self._vk_code}")
    
    # to be able to use complimentory to the Key class and return 2 Key_events
    def get_key_events(self):
        return [self, self]
    
    def get_key_string(self):
        return self._key_string
    
    def get_opposite_key_event(self):
        return Key_Event(self._vk_code, not self._is_press, self._delays, self._key_string)
    
    def __eq__(self, other) -> bool:
        return (self.get_vk_code() == other.get_vk_code()) and (self.get_is_press() is other.get_is_press())
    
    # def __str__(self):
    #     if self._key_string is None:
    #         return f"Key_Event({self._vk_code}, {self._is_press}, {self._delays})"
    #     else:
    #         return f"Key_Event({self._key_string}, {self._is_press}, {self._delays})"
        
    def __repr__(self):
        delay = f"|{self._delays[0]}|{self._delays[1]}"#
        delay = ''
        if self._key_string is None:
            return f"{'-' if self._is_press else '+'}{self._vk_code}{delay}"
        else:
            return f"{'-' if self._is_press else '+'}{self._key_string}{delay}"
   
        
        
        
        
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
    
    def __hash__(self):
        return hash(self.__repr__())
      
    def __eq__(self, other) -> bool:
        equal = True
        for my_key_event, other_key_event in zip(self.key_group, other.get_key_events()):
            equal = equal and my_key_event == other_key_event
        return equal
    
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
     
     
    
if __name__ == '__main__':
    
    kb = Tap_Keyboard()
    starttime = time()
    
    trigger = Key_Group([Key_Event(160, True), Key_Event(65, True)])
    newmakro = Macro(trigger)
    newmakro.add_key_event(Key_Event(162,True))
    newmakro.add_key_event(Key_Event(66,True,[1000,1000]))
    newmakro.add_key_event(Key_Event(66,False))
    newmakro.add_key_event(Key_Event(162,False))
    
    kb.add_tap_group(Tap_Group([65,68]))
    print(newmakro)
    kb.add_tap_group([65,68]) # a,d
    kb.add_makro(newmakro)
    key1 = Key_Event(162,True)
    key2 = Key_Event(162,False)
    print(key1)
    kg = Key_Group([key1, key2])
    print(kg)
    kb.press(66)
    kb.press(65)
    kb.press(160)
    kb.press(65)
    kb.release(65)
    kb.release(66)
    kb.press(65)
    kb.release(160)
    kb.release(65)
    
    sleep(4)
    for line in alias_thread_logging:
        print(line)
      
      
      
      