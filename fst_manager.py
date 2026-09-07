'''
Free-Snap-Tap V1.2.0
last updated: 250724-1434
'''


from pynput import keyboard, mouse
from threading import Event # to play aliases without interfering with keyboard listener
from os import system, startfile # to use clearing of CLI for better menu usage and opening config file
import sys # to get start arguments
import msvcrt # to flush input stream
from random import randint # randint(3, 9))
from time import time # sleep(0.005) = 5 ms
from fst_data_types import Key_Event, type_check
from fst_tasks import Focus_Task, Macro_Repeat_Task
import datetime
import re #regular expression
from fst_save_file_handler import make_backup as mb, restore_backup as rb
import pyperclip # to copy mouse position to clipboard for easier pasting
import asyncio
import copy

import logging
# Use __name__ to automatically label logs with the filename
logger = logging.getLogger(__name__)

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
    This class is responsible for sending key events to the system and evaluating constraints for key events.
    '''
    def __init__(self, fst_keyboard):
        self._fst = fst_keyboard
        # Initialize the Controller
        self._keyboard_controller = keyboard.Controller()
        self._mouse_controller = mouse.Controller()
        # self._mouse_scroller = self.mouse_scroller(self._mouse_controller)


        self._controller_dict = {True: self._mouse_controller, False: self._keyboard_controller}

        self._mouse_vk_codes_dict = {   1: mouse.Button.left,
                                        2: mouse.Button.right,
                                        3: mouse.Button.middle,
                                        4: mouse.Button.x1,
                                        5: mouse.Button.x2,
                                        6: "scroll_y_vertical",
                                        7: "scroll_x_horizontal"
                                    }
        self._mouse_vk_codes = self._mouse_vk_codes_dict.keys()
        self._repeat_thread_dict = {}

        self.variables = {}

    @property
    def mouse(self):
        return self._mouse_controller

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
            if fullfilled:
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

    async def execute_key_event(self, key_event, delay_times = [], with_delay=False):

        None_ke_with_delay = True

        # None ke will not be played
        if key_event.vk_code > 0:
            self.send_key_event(key_event)

        # if None ke has manual delays, they will be played .. if no delay is given default delay will NOT be applied
        if len(delay_times) == 0:
            if key_event.vk_code > 0:
                delay_times = [self._fst.arg_manager.MACRO_MAX_DELAY_IN_MS, self._fst.arg_manager.MACRO_MIN_DELAY_IN_MS]
            else:
                None_ke_with_delay = False
        elif len(delay_times) == 1:
            delay_times = delay_times*2
        elif len(delay_times) == 2:
            pass
        else:
            delay_times = delay_times[:2]

        if len(delay_times) == 0:
            pass
        elif self._fst.arg_manager.ACT_DELAY or with_delay or None_ke_with_delay:
            #print(f"D1: waiting for delay: {delay_times}")
            delay_time = self.get_random_delay(*delay_times)
            await asyncio.sleep(delay_time / 1000)


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

        def start_repeat(alias_string, repeat_time, with_overlay=1):
            stop_repeat(alias_string)

            repeat_time = int(repeat_time)


            repeat_task = Macro_Repeat_Task(alias_string, repeat_time, with_overlay, self._fst)

            _handle = asyncio.run_coroutine_threadsafe(repeat_task.run(), self._fst.loop)
            _handle.add_done_callback(self._fst.check_result)
            self._repeat_thread_dict[alias_string] = [repeat_task, _handle]

            #show_message(f"Started repeat for {alias_string} with {repeat_time} ms", d=3., ts=12, bgc="rgba(40, 150, 40, 200)")
            return True

        def stop_repeat(alias_string):
            try:
                repeat_task, _handle = self._repeat_thread_dict[alias_string]
                if not _handle.done():
                    repeat_task.cancel_playback()
                    _handle.cancel()
            except (KeyError, AttributeError):
                if CONSTANTS.DEBUG3:
                    print(f"can not find a Repeat called {alias_string} - stop_repeat()")
            return True

        def toggle_repeat(alias_string, repeat_time):
            try:
                repeat_task, _handle = self._repeat_thread_dict[alias_string]
                if not _handle.done():
                    # print(f"stopping repeat for {current_ke}")
                    repeat_task.cancel_playback()
                    _handle.cancel()
                else:
                    # print(f"{current_ke} restarting repeat")
                    start_repeat(alias_string, repeat_time)
            except (KeyError, AttributeError):
                # this thread was not started before
                # print(f"{current_ke} starting repeat for first time")
                start_repeat(alias_string, repeat_time)
            return True

        def is_repeat_active(alias_string):
            try:
                _, _handle = self._repeat_thread_dict[alias_string]
                if not _handle.done():
                    return True
                else:
                    return False
            except (KeyError, AttributeError):
                if CONSTANTS.DEBUG3:
                    print(f"can not find a Repeat called {alias_string} - stop_repeat()")
            return False

        def reset_repeat(alias_string):
            try:
                repeat_task, _handle = self._repeat_thread_dict[alias_string]
                if not _handle.done():
                    repeat_task.reset()
            except (KeyError, AttributeError):
                if CONSTANTS.DEBUG3:
                    print(f"can not find a Repeat called {alias_string} - reset_repeat()")
                # raise KeyError(error)
            return True

        def stop_all_repeat():
            logger.debug(f"Stop all repeat called: {self._repeat_thread_dict.items()}")
            try:
                for alias_name, (repeat_task, _handle) in self._repeat_thread_dict.items():
                    if not _handle.done():
                        repeat_task.cancel_playback()
                        _handle.cancel()
                if CONSTANTS.DEBUG4:
                    print("D4: -- Eval: stopped all Repeat")
            except AttributeError:
                if CONSTANTS.DEBUG3:
                    print(f"can not find a Repeat called {alias_name} - reset_all_repeat()")
            return True



        def reset(alias_string):
            self._fst.reset_macro_sequence_by_name(alias_string, current_ke)
            return True

        def release_all_keys():
            self._fst.release_all_currently_pressed_simulated_keys()
            if CONSTANTS.DEBUG4:
                print("D4: -- Eval: released all keys")
            return True

        def type(key_string):
            release_modifier()
            self._keyboard_controller.type(key_string)
            return True

        def write(key_string):
            return type(key_string)

        def set(key_string, value = 1):
            if value is True:
                value = 1
            elif value is False:
                value = 0
            self.variables[key_string] = value
            if CONSTANTS.DEBUG4:
                print(f'variable {key_string} set to: {value}')
            return True

        def is_set(key_string):
            try:
                #print(f'variable {key_string} is {self.variables[key_string]}')
                return True if self.variables[key_string] != 0 else False
            except KeyError:
                set(key_string, 0)
                if CONSTANTS.DEBUG3:
                    print(f'variable {key_string} not set')
                return False

        def get(key_string):
            try:
                return self.variables[key_string]
            except KeyError:
                set(key_string, 0)
                if CONSTANTS.DEBUG3:
                    print(f'variable {key_string} not set')
                return 0

        # def inc(key_string, delta=1):
        #     try:
        #         set(key_string, self.variables[key_string] + delta)
        #         return True
        #     except KeyError:
        #         set(key_string, delta)
        #         if CONSTANTS.DEBUG3:
        #             print(f'variable {key_string} not set')
        #         return True

        # def decr(key_string, delta=1):
        #     inc(key_string, delta=-delta)


        def check(key_string, value = 1):
            if isinstance(value, int):
                try:
                    return self.variables[key_string] == value
                except KeyError:
                    set(key_string, 0)
                    if CONSTANTS.DEBUG3:
                        print(f'variable {key_string} not set')
                    return False
            elif isinstance(value, (list, tuple)):
                try:
                    return self.variables[key_string] in value
                except KeyError:
                    set(key_string, 0)
                    if CONSTANTS.DEBUG3:
                        print(f'variable {key_string} not set')
                    return False

        def clear(key_string):
            self.variables[key_string] = 0
            if CONSTANTS.DEBUG4:
                print(f'variable {key_string} cleared')
            return True

        def clear_all_variables():
            self.clear_all_variables()
            # for key_string in self.variables:
            #     self.variables[key_string] = False
            #     print(f'variable {key_string} cleared')
            return True

        def incr(key_string):
            try:
                self.variables[key_string] += 1
            except KeyError:
                set(key_string, 1)
                print(f'variable {key_string} set to 1')
            return True

        def decr(key_string):
            try:
                self.variables[key_string] += -1
            except KeyError:
                set(key_string, 0)
                print(f'variable {key_string} set to 0')
            return True

        def cli(key_string):
            print(key_string)
            return True

        def date():
            current_date = datetime.datetime.now().strftime("%y%m%d")
            return current_date

        def date_time():
            current_date_time = datetime.datetime.now().strftime("%y%m%d-%H%M")
            return current_date_time

        #get current time in ms since epoch
        def get_time():
            current_time = int(time() * 1000)
            return current_time

        def release_modifier():
            self._fst.state_manager.release_all_modifier_keys()

        def make_backup(save_dir=self._fst.arg_manager.SAVE_DIR, backup_root_dir=self._fst.arg_manager.BACKUP_ROOT_DIR):
            backup_path, backup_name = mb(save_dir, backup_root_dir)
            print(f"Made backup to {backup_path}")
            show_message(f"Made backup to {backup_name}", d=5., ts=10, bgc="rgba(40, 150, 40, 200)")
            if CONSTANTS.DEBUG4:
                print(f"D4: -- Eval: made backup to {backup_path}")
            return True

        def restore_backup(save_dir=self._fst.arg_manager.SAVE_DIR, backup_root_dir=self._fst.arg_manager.BACKUP_ROOT_DIR):
            restored_path, restored_name = rb(save_dir, backup_root_dir)
            print(f"Restored backup from {restored_path}")
            show_message(f"Restored backup from {restored_name}", d=5., ts=10, bgc="rgba(150, 40, 40, 200)")
            if CONSTANTS.DEBUG4:
                print(f"D4: -- Eval: restored backup from {restored_path}")
            return True

        def scroll_up(value):
            self._mouse_controller.scroll(0, value)
            return True

        def scroll_down(value):
            self._mouse_controller.scroll(0, -value)
            return True

        def scroll_right(value):
            self._mouse_controller.scroll(value, 0)
            return True

        def scroll_left(value):
            self._mouse_controller.scroll(-value, 0)
            return True

        def mouse_move_abs(dx, dy):
            self._mouse_controller.position = (dx, dy)
            return True

        def mouse_move(dx, dy):
            self._mouse_controller.move(dx, dy)
            return True

        def mouse_get_pos():
            position = self._mouse_controller.position
            copy_to_clipboard(f"{position}")
            return position

        def mouse_save_to_var(key_string):
            position = mouse_get_pos()
            self.variables[key_string] = position
            print(f'mouse position {position} saved to variable {key_string}')
            return True

        def mouse_move_to_var(key_string):
            try:
                position = self.variables[key_string]
                if isinstance(position, tuple) and len(position) == 2:
                    self._mouse_controller.position = position
                    print(f'mouse moved to position {position} from variable {key_string}')
                    return True
                else:
                    print(f'variable {key_string} does not contain a valid position')
                    return False
            except KeyError:
                print(f'variable {key_string} not found')
                return False

        # show_message(*text*, *duration in s*, *text_size in px*, *background_color*, *text_color*)
        def show_message(text, d=3., ts=12, bgc="rgba(40, 150, 40, 200)", tc="white"):
            self._fst.toast_callback(text, d, ts, bgc, tc)
            return True

        def show_timer(text, d=3., ts=12, bgc="rgba(150, 150, 40, 200)", tc="white"):
            self._fst.timer_callback(text, d, ts, bgc, tc)
            return True

        def remove_toast(text, immediately=0):
            self._fst.remove_callback(text)
            return True

        def remove_all_toasts(immediately=0):
            self._fst.remove_all_callbacks()
            return True



        def set_var(key_string, text):
            self.variables[key_string] = text
            return True

        def get_var(key_string):
            try:
                return self.variables[key_string]
            except KeyError:
                set_var(key_string, "None")
                print(f'variable {key_string} set to "None"')
                return self.variables[key_string]

        def copy_to_clipboard(key_string):
            pyperclip.copy(key_string)
            show_message(f'"{key_string}" copied to clipboard')
            return True

        def paste():
            pasted_text = pyperclip.paste()
            print(f'"{pasted_text}" pasted from clipboard')
            return pasted_text

        def save_into_file(text, time_stamp=get_time(), mode='w', file_path='output.txt'):
            with open(file_path, mode) as file:
                file.write(f"{time_stamp}: {text}\n")
            print(f'"{time_stamp}: {text}" saved into {file_path}')
            return True

        def append_to_file(text, time_stamp=get_time(), file_path='output.txt'):
            return save_into_file(text, time_stamp, mode='a', file_path=file_path)

        def empty_file(file_path='output.txt'):
            open(file_path, 'w').close()
            print(f'{file_path} has been emptied')
            return True

        def print_all_variables():
            if self.variables:
                print("Current variables:")
                for key_string, value in self.variables.items():
                    print(f"{key_string}: {value}")
            else:
                print("No variables set.")
            return True

        def clear_console():
            if sys.platform.startswith('win'):
                system('cls')
            else:
                system('clear')
            return True


        # ---------------------------
        # eval starts from here

        if CONSTANTS.DEBUG4:
            print(f"D4: received for eval: {constraint_to_evaluate} : {current_ke}")

        # short eval for (False)
        if constraint_to_evaluate in ['', '!']:
            return False

        # short eval for pressed or not pressed
        elif constraint_to_evaluate[0] in ['!', '+', '-']:
            try:
                vk_code, is_press = get_vk_code_and_press_from_keystring(constraint_to_evaluate)
                key_press = self._fst.state_manager.get_all_key_press_state(vk_code)
                if is_press == key_press:
                    return True
                else:
                    return False
            except Exception as error:
                print(error)
                # unknown key in a state constraint fails the constraint (fail-closed)
                return False

        # check for sequence reset via alias
        elif constraint_to_evaluate in self._fst.macro_sequence_alias_list:

            reset(constraint_to_evaluate)
            return True

        # check for interruptable macro thread
        elif constraint_to_evaluate in self._fst.macro_thread_dict.keys():

            self._fst.interrupt_macro_by_name(constraint_to_evaluate)
            return True

        # only if not found in short eval do the real eval
        else:
            try:
                result = eval(constraint_to_evaluate)
            except NameError as error:
                # unknown name (e.g. invocation of a macro that never played) -> silent no-op
                if CONSTANTS.DEBUG3:
                    print(f"constraint {constraint_to_evaluate} not recognized - ignored: {error}")
                return True
            ### print(f"result of '{constraint_to_evaluate}' is '{result}'")
            if CONSTANTS.DEBUG4:
                print(f"D4: evaluated {constraint_to_evaluate} to: {result}")
            # if it is a number and if negativ change it to 0
            if isinstance(result, float):
                result = int(result)
            if isinstance(result, int):
                if result < 0:
                    result = 0
            if result is None:
                result = True

            return result

    def check_for_mouse_vk_code(self, vk_code):
        return vk_code in self._mouse_vk_codes

    def send_key_event(self, key_event):
        vk_code, is_press, _ = key_event.get_all()
        is_mouse_key = self.check_for_mouse_vk_code(vk_code)
        key_code = self.get_key_code(is_mouse_key, vk_code)

        # 260907-1049 handling scrolling - not handled before
        if is_mouse_key and isinstance(key_code,str):
            if key_code == "scroll_x_horizontal":
                dx, dy = 1 if is_press else -1, 0
            elif key_code == "scroll_y_vertical":
                dx, dy = 0, 1 if is_press else -1
            self._controller_dict[is_mouse_key].scroll(dx, dy)
        # 260907-1055 all keyboard and mouse clicks
        else:
            if is_press:
                self._controller_dict[is_mouse_key].press(key_code)
            else:
                self._controller_dict[is_mouse_key].release(key_code)

    # 260429-1441 - added crossover and delay for tap groups as async coroutines - everything else runs without async directly in the listener thread
    def send_keys_for_tap_group(self, tap_group):
        """
        Send the specified key and release the last key if necessary.
        """

        async def send_async(key_to_send, last_key_send, key_code_to_send, key_code_last_key_send):
            is_crossover = False
            if key_to_send != last_key_send:
                # only use crossover is activated and probility is over percentage
                is_crossover = randint(0,100) > (100 - self._fst.arg_manager.ACT_CROSSOVER_PROPABILITY_IN_PERCENT) and self._fst.arg_manager.ACT_CROSSOVER # 50% possibility
            if is_crossover:
                if CONSTANTS.DEBUG:
                    print("D1: crossover")
                self._keyboard_controller.press(key_code_to_send)
            else:
                self._keyboard_controller.release(key_code_last_key_send)
            if self._fst.arg_manager.ACT_DELAY or self._fst.arg_manager.ACT_CROSSOVER:
                delay = randint(self._fst.arg_manager.ACT_MIN_DELAY_IN_MS, self._fst.arg_manager.ACT_MAX_DELAY_IN_MS)
                if CONSTANTS.DEBUG:
                    print(f"D1: delayed by {delay} ms")
                await asyncio.sleep(delay / 1000) # in ms
            if is_crossover:
                self._keyboard_controller.release(key_code_last_key_send)
            else:
                self._keyboard_controller.press(key_code_to_send)


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
                if last_key_send is not None:
                    if not self._fst.arg_manager.ACT_DELAY and not self._fst.arg_manager.ACT_CROSSOVER:
                        self._keyboard_controller.release(key_code_last_key_send)
                        self._keyboard_controller.press(key_code_to_send)
                    else:
                        try:
                            asyncio.run_coroutine_threadsafe(send_async(key_to_send, last_key_send, key_code_to_send, key_code_last_key_send), self._fst.loop)
                        except Exception as e:
                            logger.error(f"Error occurred while calling send_keys_with_delay: {e}")
                else:
                    self._keyboard_controller.press(key_code_to_send)
                tap_group.set_last_key_send(key_to_send)

    def clear_all_variables(self):
        self.variables = {}


class Config_Manager():
    '''
    file handling and hr display of groups
    takes a file for input and saves the ouput in a focus_manager
    '''
    def __init__(self, file_name = None):
        self._file_name = file_name
        #self._fm = focus_manager

        # hr = human readable form - saves the lines cleaned of comments and presorted
        # these will be shown in menu, because internally they look a bit different (esp rebinds)
        self._tap_groups_hr = []
        self._rebinds_hr = []
        self._macros_hr = []
        self._alias_hr = []

    @property
    def file_name(self):
        return self._file_name
    @file_name.setter
    @type_check(str)
    def file_name(self, new_file_name):
        self._file_name = new_file_name
    #@property
    # def focus_manager(self):
    #     return self._fm
    # @focus_manager.setter
    # @type_check(str)
    # def focus_manager(self, new_focus_manager):
    #     self._fm = new_focus_manager
    @property
    def tap_groups_hr(self):
        return self._tap_groups_hr
    @property
    def rebinds_hr(self):
        return self._rebinds_hr
    @property
    def macros_hr(self):
        return self._macros_hr
    @property
    def alias_hr(self):
        return self._alias_hr

    def load_config(self):
        # try loading  from file
        try:
            return self._parse_lines_for_focus_manager(self._open_config_file())
        # if no file exist create new one and load it
        except FileNotFoundError:
            self.create_new_group_file()
            return self._parse_lines_for_focus_manager(self._open_config_file())


    def _clean_comments(self, lines):
        comments_cleaned_lines = []
        for line in lines:
            ###XXX 241029-0711 strip to allow whitespaces in front
            line = line.replace('\n', '').replace('\t', '').strip()
            if not line:
                continue
            if line.startswith('<focus>'):
                cleaned_line = '<focus>'
                ##260426-1838 multiple focus groups seperated by comma
                focus_group_names = line[7:].split('#')[0].split(',')
                if len(focus_group_names) > 1:
                    # strip whitespace from focus group names and join them with comma again
                    focus_group_names = ",".join([name.strip() for name in focus_group_names])
                else:
                    focus_group_names = focus_group_names[0].strip()
                cleaned_line += focus_group_names
                comments_cleaned_lines.append(cleaned_line)
            elif line.startswith('<arg>'):
                cleaned_line = '<arg>'
                cleaned_line += line[5:].split('#')[0].strip()
                comments_cleaned_lines.append(cleaned_line)
            elif line[0] == '#':
                continue
            else:
                ###XXX 241028-1224: commented out to make eval with spaces possible
                # line = line.replace(" ","")
                cleaned_group = []
                for key in line.split(','):
                    # ignore fully commented out keys
                    if key.strip().startswith('#'):
                        # if commented out key before :, add :
                        if key.find(':') >= 0:
                            cleaned_group.append(':')
                    else:
                        # ignore comments after keys
                        cleaned_key = key.split('#')[0].strip()
                        if cleaned_key:
                            cleaned_group.append(cleaned_key)
                cleaned_line = ','.join(cleaned_group)
                if cleaned_line:
                    comments_cleaned_lines.append(cleaned_line)

        return comments_cleaned_lines

    def _combine_multilines(self, cleaned_lines):
        # clean multiline macro sequences and joins them together
        multiline_cleaned_lines = []
        for line in cleaned_lines:
            if len(line) > 1 and line[0] == ':':
                # add multiline to last multiline sequence
                multiline_cleaned_lines[-1] += line
            else:
                multiline_cleaned_lines.append(line)

        return multiline_cleaned_lines

    def parse_line(self, line):
        pass

    def _parse_lines_for_focus_manager(self, file_lines):
        '''
        reads in the file and removes the commented out lines, keys and inline comments;
        joins multiline macro sequences;
        '''

        cleaned_lines = self._combine_multilines(self._clean_comments(file_lines) )

        focus_name = ''
        multi_focus_dict = {}
        default_start_arguments = []
        default_group_lines = []
        extra_focus_names = []

        for line in cleaned_lines:
            if line.startswith('<focus>'):
                focus_name = line.replace('<focus>', '')
                # #only allow letters, numbers and spaces in focus_name
                focus_name = re.sub(r'[^a-zA-Z0-9,_. ]', '', focus_name)

                ##260426-1851 allow multiple focus groups seperated by comma
                focus_group_names = focus_name.split(',')
                if len(focus_group_names) > 1:
                   focus_name = focus_group_names[0]
                   extra_focus_names = focus_group_names[1:]

                multi_focus_dict[focus_name] = copy.deepcopy([[], []])

                ##260426-1851 allow multiple focus groups seperated by comma
                if extra_focus_names != []:
                    print(f"extra focus names found for {focus_name}: {extra_focus_names}")
                    for extra_focus_name in extra_focus_names:
                        multi_focus_dict[extra_focus_name] = multi_focus_dict[focus_name]
                extra_focus_names = []

                print(f"new focus name found: {focus_group_names}")
            elif line.startswith('<arg>'):
                line = line.replace('<arg>', '').lower()
                if focus_name == '':
                    default_start_arguments.append(line)
                else:
                    multi_focus_dict[focus_name][0].append(line)

            else:
                # alias lines that save a defined series of keyevents for easier usage in config
                if line.startswith('<'):
                    alias_end = line.find('>')
                    if alias_end > 1:
                        line_name = line[:alias_end+1]
                        line = line.replace(line_name, '').strip()

                # add name of the actual line: e.g. key_group, macro, etc
                elif line.startswith('('):
                    line_name_end = line.find(')')
                    if line_name_end > 1:
                        line_name = line[:line_name_end+1]
                    line = line.replace(line_name, '').strip()
                else:
                    line_name = ''

                # sort into focus groups or default group
                if focus_name == '':
                    default_group_lines.append([line_name, line])
                else:
                    multi_focus_dict[focus_name][1].append([line_name, line])

        return multi_focus_dict, default_start_arguments, default_group_lines


    def _open_config_file(self):
        temp_file = []
        with open(self._file_name, 'r') as file:
            for line in file:
                temp_file.append(line)
        return temp_file

    def _write_out_new_file(self):
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

        def split_ignore_brackets2(group):
            '''
            splits the group but ignoring the commas that are in brackets
            used for evaluations that use commas to deliver 2 or more parameters
            '''
            # when no open bracket in group, then just use default split
            if group.find('(') == -1:
                return group.split(',')

            key_string = group
            valid_commas = []
            start_pos = 0

            open_count = 0

            next_comma = key_string.find(',', start_pos)
            next_open = key_string.find('(', start_pos)
            next_close = key_string.find(')', start_pos)

            # next_by_symbol = {',': next_comma, '(': next_open, ')': next_close}

            while True:
                if open_count == 0:
                    if next_comma == -1:
                        valid_commas.append(len(key_string))
                        break
                    elif next_open == -1:
                        first = next_comma
                        valid_commas.append(next_comma)
                    else:
                        first = min(next_comma, next_open)
                        if first == next_comma:
                            valid_commas.append(next_comma)
                            # next comma
                            symbol = ','
                        else:
                            open_count += 1
                            # next open
                            symbol = '('
                elif open_count > 0:
                    if next_open == -1:
                        first = next_close
                        open_count -= 1
                        # next close
                        symbol = ')'
                    else:
                        first = min(next_open, next_close)
                        if first == next_close:
                            open_count -= 1
                            #next close
                            symbol = ')'
                        else:
                            open_count += 1
                            #next open
                            symbol = '('
                # print(f"count: {open_count} , start_pos: {start_pos} , first: {first}")
                # print(f"valid commas: {valid_commas}")
                start_pos = first+1

                if symbol == ',':
                    next_comma = key_string.find(',', start_pos)
                if symbol == '(':
                    next_open = key_string.find('(', start_pos)
                else:
                    next_close = key_string.find(')', start_pos)
                    if open_count == 0:
                        next_comma = key_string.find(',', start_pos)


            split_group = []
            start = 0
            for comma in valid_commas:
                split_group.append(key_string[start:comma])
                start = comma+1

            return split_group

        def split_ignore_brackets(group):
            split_group = group.split(',')
            count_open = []
            new_group = []

            for el in split_group:
                count_open.append(el.count('(') - el.count(')'))

            temp = ''
            sum = 0
            for el, count in zip(split_group, count_open):
                if temp == '':
                    temp += el
                else:
                    temp += ', ' + el
                sum += count
                if sum == 0:
                    new_group.append(temp)
                    temp = ''

            return new_group


        self._tap_groups_hr = []
        self._rebinds_hr = []
        self._macros_hr = []
        self._alias_hr = []

        count_tap = 1
        count_rebind = 1
        count_macro = 1
        count_macro_sequence = 1
        # sort the lines into their categories for later initialization
        for line in lines:

            alias, line = line
            if alias.startswith('<'):
                self._alias_hr.append([alias, split_ignore_brackets(line)])
            else:
                ###XXX 241028-1243 added strip()
                groups = [x.strip() for x in line.split(':')]
                # tap groups
                if len(groups) == 1:
                    # generate default names for Tap Groups
                    if alias == '':
                        alias = f"(TAP_{count_tap})"
                        count_tap += 1
                    self._tap_groups_hr.append([alias, split_ignore_brackets(groups[0])])
                # rebinds
                elif len(groups) == 2:
                    trigger_group = split_ignore_brackets(groups[0])
                    key_group = split_ignore_brackets(groups[1])
                    # generate default names for Rebinds
                    if alias == '':
                        alias = f"(REB_{count_rebind})"
                        count_rebind += 1
                    if len(key_group) == 1:
                        self._rebinds_hr.append([alias, [trigger_group, key_group[0]]])
                    else:
                        print(f"{key_group} is not a valid rebind (only one key_event/key allowed")
                        print("   use :: instead of : to declare it as a macro")
                    # macro
                elif len(groups) > 2 and len(groups[1]) == 0:
                    trigger_group = split_ignore_brackets(groups[0])
                    if len(groups) > 3:
                        # generate default names for Macro Sequences
                        if alias == '':
                            alias = f"(SEQ_{count_macro_sequence})"
                            count_macro_sequence += 1

                        key_groups = [split_ignore_brackets(group) for group in groups[2:]]
                        self._macros_hr.append([alias, [trigger_group] + key_groups])
                    else:
                        # generate default names for Macros
                        if alias == '':
                            alias = f"(MAC_{count_macro})"
                            count_macro += 1
                        key_group = split_ignore_brackets(groups[2])
                        self._macros_hr.append([alias, [trigger_group, key_group]])

    # def display_groups(self):
    #     """
    #     Display the current tap groups.
    #     """
    #     # alias display
    #     print("# Aliases")
    #     for alias_group in self._alias_hr:
    #         alias, group = alias_group
    #         print(f"{alias} " + ', '.join(group)+'')
    #     # tap groups
    #     print("\n# Tap Groups")
    #     for tap_group in self._tap_groups_hr:
    #         alias, tap_group = tap_group
    #         print(f"{alias} " + ', '.join(tap_group)+'')
    #     # rebinds
    #     print("\n# Rebinds")
    #     for rebind in self._rebinds_hr:
    #         alias, rebind = rebind
    #         print(f"{alias} " + ' : '.join([', '.join(rebind[0]), rebind[1]]))
    #     # macros
    #     print("\n# Macros")
    #     for group in self._macros_hr:
    #         alias, *group = group
    #         group = group[0]
    #         first_line = f"{alias} " + ' :: '.join([', '.join(group[0]),', '.join(group[1])])
    #         position = first_line.find('::')
    #         print(first_line)
    #         if len(group) > 2:
    #             for gr in group[2:]:
    #                 print(" " * (position+1) + ": " + ', '.join(gr))

    def display_groups(self):
        """
        Display the current tap groups.
        """
        # alias display

        # inset = '     '

        print("# Aliases")
        for alias_group in self._alias_hr:
            alias, group = alias_group
            print(f"{alias} " + ', '.join(group)+'')
        # tap groups
        print("\n# Tap Groups")
        for tap_group in self._tap_groups_hr:
            alias, tap_group = tap_group
            print(f"{alias} " + ', '.join(tap_group)+'')
        # rebinds
        print("\n# Rebinds")
        for rebind in self._rebinds_hr:
            alias, rebind = rebind
            print(f"{alias} " + ' : '.join([', '.join(rebind[0]), rebind[1]]))
        # macros
        print("\n# Macros")
        for group in self._macros_hr:
            alias, *group = group
            group = group[0]
            position = len(alias)-1
            first_line = f"{alias} {', '.join(group[0])} :"
            print(first_line)
            if len(group) > 1:
                for gr in group[1:]:
                    print(f"{' '*position}: " + ', '.join(gr))

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
        self._write_out_new_file()

class Argument_Manager():
    '''
    manages the global variables and start arguments
    '''
    ### config of these variables should be done via config
    ## config manager has the control over the arguments

    STATUS_INDICATOR = False
    STATUS_INDICATOR_SIZE = 10
    CROSSHAIR_ENABLED = False
    CROSSHAIR_DELTA_X = 0
    CROSSHAIR_DELTA_Y = 0

    TRAY_ICON = False

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

    ALWAYS_ACTIVE = False
    CMD_WINDOW_HIDDEN = False

    # AntiCheat testing (ACT)
    ACT_DELAY = True
    ACT_MIN_DELAY_IN_MS = 2
    ACT_MAX_DELAY_IN_MS = 10
    ACT_CROSSOVER = False # will also force delay
    ACT_CROSSOVER_PROPABILITY_IN_PERCENT = 50

    # Alias delay between presses and releases
    MACRO_MIN_DELAY_IN_MS = ACT_MIN_DELAY_IN_MS
    MACRO_MAX_DELAY_IN_MS = ACT_MAX_DELAY_IN_MS

    SAVE_DIR = ""
    BACKUP_ROOT_DIR = ""

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
        self._sys_start_args = []
        self.reset_global_variable_changes()

    @property
    def sys_start_args(self):
        return self._sys_start_args
    @sys_start_args.setter
    @type_check(list)
    def sys_start_args(self, new_list):
        self._sys_start_args = new_list

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
        self.MACRO_MIN_DELAY_IN_MS = Argument_Manager.MACRO_MIN_DELAY_IN_MS
        self.MACRO_MAX_DELAY_IN_MS = Argument_Manager.MACRO_MAX_DELAY_IN_MS
        self.EXEC_ONLY_ONE_TRIGGERED_MACRO = Argument_Manager.EXEC_ONLY_ONE_TRIGGERED_MACRO
        self.CROSSHAIR_ENABLED = Argument_Manager.CROSSHAIR_ENABLED
        self.CROSSHAIR_DELTA_X = Argument_Manager.CROSSHAIR_DELTA_X
        self.CROSSHAIR_DELTA_Y = Argument_Manager.CROSSHAIR_DELTA_Y
        self.ALWAYS_ACTIVE = Argument_Manager.ALWAYS_ACTIVE
        self.SAVE_DIR = Argument_Manager.SAVE_DIR
        self.BACKUP_ROOT_DIR = Argument_Manager.BACKUP_ROOT_DIR

    'start argument handling'
    def apply_start_arguments(self, argv):
        print(f"apply arguments: {argv}")

        def extract_delays(arg):
            '''returns (min, max) delay in ms or None if no valid delay was given'''
            delays = []
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
            valid_delays = sorted(valid_delays)
            if len(valid_delays) == 1:
                # single delay value applies to min and max
                return valid_delays[0], valid_delays[0]
            if len(valid_delays) == 2:
                return valid_delays[0], valid_delays[1]
            return None


        for arg in argv:
            # if commented out do nothing
            if arg[0] in (':', '#'):
                continue
            if self.DEBUG:
                print(f"D1: {arg}")
            # enable debug print outs
            if arg == "-debug":
                self.DEBUG = True
                CONSTANTS.DEBUG = True
            elif arg == "-debug_numpad":
                CONSTANTS.DEBUG_NUMPAD = True
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
                delays = extract_delays(arg[10:])
                if delays is not None:
                    self.ACT_MIN_DELAY_IN_MS, self.ACT_MAX_DELAY_IN_MS = delays
                    print(f"Tap delays set to: min:{self.ACT_MIN_DELAY_IN_MS}, max:{self.ACT_MAX_DELAY_IN_MS}")
                else:
                    print("no valid tap delay - delay range unchanged")
            elif arg[:12] == "-aliasdelay=" and len(arg) > 12:
                self.ACT_DELAY = True
                delays = extract_delays(arg[12:])
                if delays is not None:
                    self.MACRO_MIN_DELAY_IN_MS, self.MACRO_MAX_DELAY_IN_MS = delays
                    print(f"Macro delays set to: min:{self.MACRO_MIN_DELAY_IN_MS}, max:{self.MACRO_MAX_DELAY_IN_MS}")
                else:
                    print("no valid alias delay - delay range unchanged")
            elif arg[:12] == "-macrodelay=" and len(arg) > 12:
                self.ACT_DELAY = True
                delays = extract_delays(arg[12:])
                if delays is not None:
                    self.MACRO_MIN_DELAY_IN_MS, self.MACRO_MAX_DELAY_IN_MS = delays
                    print(f"Macro delays set to: min:{self.MACRO_MIN_DELAY_IN_MS}, max:{self.MACRO_MAX_DELAY_IN_MS}")
                else:
                    print("no valid macro delay - delay range unchanged")
            elif arg == "-crossover":
                self.ACT_CROSSOVER = True
            elif arg[:11] == "-crossover=" and len(arg) > 11:
                self.ACT_CROSSOVER = True
                probability = None
                try:
                    probability = int(arg[11:])
                except Exception:
                    print("invalid probability - needs to be a number")
                if probability is not None and 0 <= probability <= 100:
                    self.ACT_CROSSOVER_PROPABILITY_IN_PERCENT = probability
                elif probability is not None:
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
                try:
                    x, y = arg[11:].strip().replace(' ', '').split(',')
                    self.CROSSHAIR_DELTA_X, self.CROSSHAIR_DELTA_Y = int(x), int(y)
                    print(f"set crosshair delta is set to: {self.CROSSHAIR_DELTA_X}, {self.CROSSHAIR_DELTA_Y}")
                except Exception:
                    print("invalid crosshair delta - needs to be two numbers, e.g. -crosshair=5,-10")
            elif arg[:14] == "-always_active":
                self.ALWAYS_ACTIVE = True
            elif arg[:10] == "-tray_icon":
                self.TRAY_ICON = True
            elif arg[:16] == "-hide_cmd_window":
                self.CMD_WINDOW_HIDDEN = True
            elif arg[:10] == "-save_dir=" and len(arg) > 10:
                self.SAVE_DIR = arg[10:].strip()
                print(f"set save directory to: {self.SAVE_DIR}")
            elif arg[:17] == "-backup_root_dir=" and len(arg) > 17:
                self.BACKUP_ROOT_DIR = arg[17:].strip()
                print(f"set backup root directory to: {self.BACKUP_ROOT_DIR}")
            else:
                print("unknown start argument: ", arg)

class Focus_Group_Manager():
    '''
    This class manages the focus groups for the FST_Keyboard.
    '''
    def __init__(self, fst_keyboard):
        self._fst = fst_keyboard
        self._multi_focus_dict = {}
        self._multi_focus_dict_keys = []
        self._default_start_arguments = []
        self._default_group_lines = []


        self.FOCUS_APP_NAME = ''

        self.focus_active = False
        self._focus_task  = None
        self.task = None


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

    def init_focus_task(self):

        if len(self._multi_focus_dict_keys) > 0:
            self.focus_active = True
            self._focus_task = Focus_Task(self._fst)
        else:
            self.focus_active = False
        return self.focus_active

    def pause_focus_task(self):
        if self.focus_active:
            self._focus_task.pause()

    def start_focus_task(self):
        # if still active do nothing, otherwise start it again
        loop = asyncio.get_running_loop()
        #loop = self._fst.loop

        def start_task(loop):
            if self.focus_active:
                self.task = loop.create_task(self._focus_task.run())

        if self.task is None:
            start_task(loop)
        elif self.task.done():
            start_task(loop)

    def restart_focus_task(self):
        if self.focus_active:
            self._focus_task.restart()

    def stop_focus_task(self):
        if self.focus_active and not self.task.done():
            self._focus_task.stop()
            #self.task.cancel()

    def update_groups_from_config(self, config_update):
        multi_focus_dict, default_start_arguments, default_group_lines = config_update
        self._multi_focus_dict = multi_focus_dict
        self._multi_focus_dict_keys = self._multi_focus_dict.keys()
        self._default_start_arguments = default_start_arguments
        self._default_group_lines = default_group_lines

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
            repeat_task, _handle = self._fst.output_manager.repeat_thread_dict[key_event]
            if not _handle.done():
                repeat_task.cancel_playback()
                _handle.cancel()

    def release_all_toggles(self):
        for vk_code in self._toggle_states_dict_keys:
            self._fst.output_manager.send_key_event(Key_Event(vk_code, False))
            self.set_toggle_state(vk_code, False)

    def reset_all_lists(self):
        self._pressed_keys = set()
        self._real_key_press_states_dict = {}
        self._simulated_key_press_states_dict = {}
        self._all_key_press_states_dict = {}
        self._toggle_states_dict = {}
        self._toggle_states_dict_keys = []




###XXX 241014-1926 backup

    # def release_all_currently_pressed_keys(self):
    #     ###XXX 241009-1049 do not release real keys, 241009-1100 now again release all keys - works better
    #     if CONSTANTS.DEBUG2:
    #         print("D2: releasing all keys")


    #     # release remaining simulated keys
    #     for vk_code, is_press in self._all_key_press_states_dict.items():
    #         if is_press:
    #             # only reset simulated keys
    #             if self.get_simulated_key_press_state(vk_code) is True:
    #             # if self.get_simulated_key_press_state(vk_code) is True and not vk_code in self.pressed_keys:
    #                 if CONSTANTS.DEBUG2:
    #                     print(f"D2: released key: {vk_code}")
    #                 self._fst.output_manager.send_key_event(Key_Event(vk_code, False))

    #     self.release_all_modifier_keys()
    #     self.release_all_toggles()
    #     self.reset_states_dicts()

    # def release_all_modifier_keys(self):
    #     # first release all modifert keys
    #     for vk_code in Input_State_Manager.ALL_MODIFIER_KEYS:

    #         # self._pressed_keys = set()
    #         self._real_key_press_states_dict = {}
    #         ###XXX 241014-0308
    #         ### -
    #         # if not self.get_real_key_press_state(vk_code):
    #         if not self.pressed_keys:
    #         ### -
    #         ### + trying to prevent supression of releasing of keys
    #         ### +
    #             if CONSTANTS.DEBUG2:
    #                 print(f"D2: released pressed modifier key: {vk_code}")
    #             self._fst.output_manager.send_key_event(Key_Event(vk_code, False))
    #             self.set_simulated_key_press_state(vk_code, False)

###XXX 241014-1926 changed

    def release_all_currently_pressed_simulated_keys(self):
        # print(f"pressed keys on release: {self._pressed_keys}")
        active_keys = []
        for key, item in self._simulated_key_press_states_dict.items():
            if item is True:
             active_keys.append(key)
        # print(f"pressed simulated keys on release: {active_keys}")

        ###XXX 241009-1049 do not release real keys, 241009-1100 now again release all keys - works better
        if CONSTANTS.DEBUG2:
            print("D2: releasing all keys")

        # release remaining simulated keys
        for vk_code, is_press in self._simulated_key_press_states_dict.items():
        # for vk_code, is_press in self._all_key_press_states_dict.items():
            if is_press:
                # only reset simulated keys
                if CONSTANTS.DEBUG2:
                    print(f"D2: released key: {vk_code}")
                self._fst.output_manager.send_key_event(Key_Event(vk_code, False))

        # self.release_all_modifier_keys()

        self.release_all_toggles()
        self.reset_states_dicts()

    def release_all_modifier_keys(self):
        # first release all modifier keys
        for vk_code in Input_State_Manager.ALL_MODIFIER_KEYS:
            if vk_code in self.pressed_keys:
                if CONSTANTS.DEBUG2:
                    print(f"D2: released pressed modifier key: {vk_code}")
                self._fst.output_manager.send_key_event(Key_Event(vk_code, False))
                #self.set_simulated_key_press_state(vk_code, False)

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
            time_list = self._time_all

        time_last_pressed, time_last_released, time_released, time_pressed = time_list

        if is_keydown:
            time_last_pressed[vk_code] = key_event_time
            try:
                time_released[vk_code] = time_last_pressed[vk_code] - time_last_released[vk_code]
                #print(f"time released: {time_released[vk_code]}")
            except KeyError:
                pass
                #print(f"no key yet for: {error}")
        else:
            time_last_released[vk_code] = key_event_time
            try:
                time_pressed[vk_code] = time_last_released[vk_code] - time_last_pressed[vk_code]
                #print(f"time pressed: {time_pressed[vk_code]}")
            except KeyError:
                pass
                #print(f"no key yet for vk_code: {error}")

class CLI_menu():
    '''
    manages the command line interface menu
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
            print("0. Toggle debugging output with evaluation results")
            print(f"1. Open file:'{self._fst.config_manager.file_name}' in your default editor.")
            print("2. Reload everything from file.")
            print("3. Print virtual key codes to identify keys.")
            print("4. End the program/script.", flush=True)

            self.flush_the_input_buffer()

            choice = input("\nHit [Enter] to start or enter your choice: " )

            if choice == '0':
                CONSTANTS.DEBUG4 = not CONSTANTS.DEBUG4
            elif choice == '1':
                startfile(self._fst.config_manager.file_name)
            elif choice == '2':
                self._fst.arg_manager.reset_global_variable_changes()
                self._fst.apply_start_args_by_focus_name(self._fst.focus_manager.FOCUS_APP_NAME)
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
        print('--- enter MENU again with ALT + PAGE_DOWN ---')

    def update_group_display(self):
        self.clear_cli()

        self._fst.config_manager.display_groups()
        if self._fst.arg_manager.CONTROLS_ENABLED:
            self.display_control_text()

    def display_focus_names(self):
        print(f"\n>>> looking for focus names: {', '.join(self._fst.focus_manager.multi_focus_dict_keys)}")

    def display_focus_found(self, active_window):
        print(f'\n>>> FOCUS APP FOUND: resuming with app: \n    {active_window}\n')

    def display_focus_not_found(self):
        print('\n>>> NO FOCUS APP FOUND')
        self.display_focus_names()

    def display_default_active(self):
        print('\n>>> DEFAULT GROUP ACTIVE')
        self.display_focus_names()

    def flush_the_input_buffer(self):
        sys.stdout.flush()
        # Try to flush the buffer
        while msvcrt.kbhit():
            msvcrt.getch()
