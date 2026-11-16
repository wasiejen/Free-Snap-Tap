'''
Free-Snap-Tap V1.3.0
last updated: 250724-1434
'''


from pynput import keyboard, mouse
from os import system, startfile # to use clearing of CLI for better menu usage and opening config file
import sys # to get start arguments
import msvcrt # to flush input stream
from random import randint # randint(3, 9))
from time import time, monotonic # sleep(0.005) = 5 ms; monotonic = F-B4 age anchor
from fst_data_types import (Key_Event, type_check, ConfigError,
                            FOCUS_NAME_ILLEGAL, Lifecycle_State,
                            SOURCE_DRAIN, SOURCE_TAP, SOURCE_TOGGLE,
                            TICKET_COMPLETED, TICKET_STATES)
from fst_tasks import Focus_Task, Macro_Repeat_Task
# F-C2 (review Item 4): the config line grammar lives in ONE module; this file
# is a CONSUMER (validator rules + runtime containers), never a second parser
from fst_config_parser import (split_key_group, clean_comment_lines,
                               combine_multiline_continuations,
                               clean_focus_header, focus_scope_of,
                               normalize_start_arg_name, parse_int_list,
                               classify_groups, LineNamer,
                               arg_value, prefix_matches, split_item_prefix,
                               START_ARG_FLAGS, START_ARG_VALUES,
                               KIND_TAP, KIND_REBIND, KIND_MACRO, KIND_SEQUENCE,
                               DELAY_RANGE, RUNTIME_DELAY_RANGE)
import datetime
import re #regular expression
import ast # structural constraint check (Config_Validator)
from collections import namedtuple
from vk_codes import vk_codes_dict
from fst_save_file_handler import make_backup as mb, restore_backup as rb
import pyperclip # to copy mouse position to clipboard for easier pasting
import asyncio
import copy
import os # --elevate lane: basename of sys.executable (dev-mode detection)
import threading # F-B4: the status dump names the thread that wrote it
import ctypes # --elevate lane: shell32 IsUserAnAdmin + ShellExecuteW runas
import subprocess # --elevate lane: list2cmdline argv quoting for lpParameters

import logging
# FST area-logger tree (design 2026-10-01_fst-logging-design.md §3):
#   fst           app root: lifecycle, errors -> fst.log + console (WARNING+)
#   fst.flow      per-key pipeline (IN/rebind/toggle/SUPPRESSED/OUT) -> own fst_flow.log
#   fst.eval      constraint evaluation + eval variables
#   fst.state     key-state dicts, press/release tracking, timings
#   fst.macro     macro/repeat task lifecycle
#   fst.config    start-arg parsing, config load
#   fst.drop      named event-drop records (U345 H1 drop-watch lane)
logger = logging.getLogger('fst')
logger_flow = logging.getLogger('fst.flow')
logger_eval = logging.getLogger('fst.eval')
logger_state = logging.getLogger('fst.state')
logger_macro = logging.getLogger('fst.macro')
logger_config = logging.getLogger('fst.config')
logger_drop = logging.getLogger('fst.drop')

MAIN_LOG_FILE = 'fst.log'
FLOW_LOG_FILE = 'fst_flow.log'
# drop-watch lane (U345 H1): named release-event drop records land in
# the dedicated append-only file while the watch is on (records ride
# fst.log + console at WARNING+ via propagation, like the flow channel)
DROP_LOG_FILE = 'fst_drop.log'
# bounded raw-event ring (U345 H1): filter entries append a raw tuple
# (no format, no I/O); flush writes only when a drop happens (rare)
DROP_RING_MAXLEN = 200
# F-B4 (review Item 13): THE bug-report artifact - one-shot status dump,
# same directory convention as the other FST files (CWD-relative, like the
# log files above); overwritten atomically at startup and at every reload
STATUS_FILE = 'fst_status.log'

# -log=LEVEL start argument values -> logging levels
LOG_LEVELS = {'debug': logging.DEBUG, 'info': logging.INFO,
              'warning': logging.WARNING, 'error': logging.ERROR}

# area loggers covered by the root debug level (-log=LEVEL, alt+num1/2/3);
# fst.flow is on its own channel (-flow / alt+num4 / menu option 0)
AREA_LOGGER_NAMES = ('fst', 'fst.eval', 'fst.state', 'fst.macro', 'fst.config')


def setup_fst_logging():
    '''Configure the FST area-logger tree once at startup: fst.log is
    append-only (never wiped between runs), the console shows WARNING+.'''
    root = logging.getLogger('fst')
    if root.handlers:
        return  # already set up
    root.setLevel(logging.INFO)
    for name in AREA_LOGGER_NAMES[1:]:
        logging.getLogger(name).setLevel(logging.INFO)
    flow = logging.getLogger('fst.flow')
    flow.setLevel(logging.WARNING)
    flow.propagate = True
    file_handler = logging.FileHandler(MAIN_LOG_FILE, mode='a')
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    root.addHandler(file_handler)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.WARNING)
    console_handler.setFormatter(logging.Formatter('%(levelname)s %(name)s: %(message)s'))
    root.addHandler(console_handler)


def set_area_log_level(level):
    '''Set the root debug level on fst + all area loggers except fst.flow.'''
    for name in AREA_LOGGER_NAMES:
        logging.getLogger(name).setLevel(level)


def is_flow_enabled():
    return logging.getLogger('fst.flow').level == logging.DEBUG


def set_flow_enabled(enabled):
    '''Enable/disable the per-key flow stream: DEBUG -> own append-only
    fst_flow.log (propagation off, excluded from the main file); off ->
    WARNING+ records propagate to the main log.'''
    flow = logging.getLogger('fst.flow')
    if enabled:
        if is_flow_enabled() and flow.handlers:
            return  # already on (apply_start_arguments re-runs on focus change)
        flow.setLevel(logging.DEBUG)
        flow.propagate = False
        flow_handler = logging.FileHandler(FLOW_LOG_FILE, mode='a')
        flow_handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(message)s'))
        flow.addHandler(flow_handler)
    else:
        for handler in flow.handlers[:]:
            flow.removeHandler(handler)
            handler.close()
        flow.setLevel(logging.WARNING)
        flow.propagate = True


def toggle_flow():
    set_flow_enabled(not is_flow_enabled())


def is_drop_watch_enabled():
    '''Drop-watch lane state (U345 H1): the ring at the filter entries is
    always recording (cheap raw tuples); this flag gates the dedicated
    fst_drop.log handler and the ring tail appended to drop lines.'''
    return CONSTANTS.DROP_WATCH


def set_drop_watch_enabled(enabled):
    '''Enable/disable the drop-watch lane (U345 H1): ON -> dedicated
    append-only fst_drop.log handler on the fst.drop logger (records
    propagate to fst.log + console at WARNING+, like the flow channel);
    OFF -> handler removed. Idempotent on focus-change re-applies
    (apply_start_arguments re-runs).'''
    drop = logging.getLogger('fst.drop')
    if enabled:
        if is_drop_watch_enabled() and drop.handlers:
            return  # already on
        drop.setLevel(logging.DEBUG)
        drop.propagate = True
        drop_handler = logging.FileHandler(DROP_LOG_FILE, mode='a')
        drop_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s %(message)s'))
        drop.addHandler(drop_handler)
        CONSTANTS.DROP_WATCH = True
    else:
        for handler in drop.handlers[:]:
            drop.removeHandler(handler)
            handler.close()
        # INFO level kept (unlike the flow channel's WARNING-off): the
        # stop-summary INFO line must reach fst.log even after an ON->OFF
        # cycle - the cumulative drop counter is the point of the hunt
        drop.setLevel(logging.INFO)
        drop.propagate = True
        CONSTANTS.DROP_WATCH = False


def toggle_drop_watch():
    set_drop_watch_enabled(not is_drop_watch_enabled())


def toggle_debug_level():
    '''Toggle the root debug level between DEBUG and INFO (alt+num1/2/3).'''
    current = logging.getLogger('fst').level
    set_area_log_level(logging.INFO if current == logging.DEBUG else logging.DEBUG)


def is_any_debug_active():
    '''CLI keep-open gate: any area logger (incl. flow) at DEBUG -> keep console.'''
    return any(logging.getLogger(name).level == logging.DEBUG
               for name in AREA_LOGGER_NAMES + ('fst.flow',))


class CONSTANTS():

    # safety gate: only run the numpad debug-combination checks when enabled
    # (so alt+num* is not swallowed while gaming)
    DEBUG_NUMPAD = False

    # U345 H2: toast bridge calls ride the offload queue + asyncio pump task
    # (the hook-pump leg becomes one deque append; the bridge emit never runs
    # on a poster thread). -no_toast_offload restores the direct emit path
    # (A/B switch for the maintainer's gaming test).
    TOAST_OFFLOAD = True

    # U345 H1 drop-watch: gates the dedicated fst_drop.log flush + ring tail
    # on drop lines (-drop_watch start arg / alt+num6 numpad toggle); the
    # ring recording itself is always on (raw tuples, no format, no I/O).
    DROP_WATCH = False

    # F-B4 (review Item 13): the ticket-aging warning threshold of the status
    # dump's LEDGER section (design report TOP-3 risk 3: a ticket open longer
    # than this is debt worth naming). An open ticket older than this many ms
    # gets a [StuckKeyWatch] line in the dump and in the log at WARNING.
    STUCK_TICKET_MS = 5000

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
                    logger_eval.debug(f"string as constraint found - {constraint}")
                    result = self.constraint_evaluation(constraint, key_event)
                    if isinstance(result, bool):
                        fullfilled = fullfilled and result
                    elif isinstance(result, int):
                        temp_delays.append(result)
                    else:
                        logger_eval.warning(f"constraint {constraint} is not valid")

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
                    logger_state.debug(f"vk_code: {vk_code} time released: {key_time}")
                except KeyError as error:
                    logger_state.debug(f"time_release: no value yet for vk_code: {error}")
                    return 0
            else:
                try:
                    key_time = time_pressed[vk_code]
                    logger_state.debug(f"vk_code: {vk_code} time pressed: {key_time}")
                except KeyError as error:
                    logger_state.debug(f"time_press: no value yet for vk_code: {error}")
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

        # press of all keys (incl simulated) - union: real OR simulated
        def ap(key_string):
            vk_code, _ = get_vk_code_and_press_from_keystring(key_string)
            return self._fst.state_manager.get_all_key_press_state(vk_code)

        # release of all keys (incl simulated) - union: real OR simulated
        def ar(key_string):
            return not ap(key_string)

        # give out time since last key press/release
        def last(key_string, time_list = self._fst.state_manager.time_real):
            time_last_pressed, time_last_released, _, _ = time_list
            vk_code, is_press = get_vk_code_and_press_from_keystring(key_string)
            try:
                logger_state.debug(f"{time_in_millisec() - self._fst.TIME_DIFF}")
                logger_state.debug(f"{time_last_pressed[vk_code]}")
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
                logger_state.debug(f"{time_released[vk_code] + time_pressed[vk_code]}")
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
            except (KeyError, AttributeError, ValueError):
                logger_eval.warning(f"can not find a Repeat called {alias_string} - stop_repeat()")
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
            except (KeyError, AttributeError, ValueError):
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
            except (KeyError, AttributeError, ValueError):
                logger_eval.debug(f"can not find a Repeat called {alias_string} - is_repeat_active()")
            return False

        def reset_repeat(alias_string):
            try:
                repeat_task, _handle = self._repeat_thread_dict[alias_string]
                if not _handle.done():
                    repeat_task.reset()
            except (KeyError, AttributeError, ValueError):
                logger_eval.warning(f"can not find a Repeat called {alias_string} - reset_repeat()")
            return True

        def stop_all_repeat():
            logger_eval.debug(f"Stop all repeat called: {self._repeat_thread_dict.items()}")
            try:
                for alias_name, (repeat_task, _handle) in self._repeat_thread_dict.items():
                    if not _handle.done():
                        repeat_task.cancel_playback()
                        _handle.cancel()
                logger_eval.debug("-- Eval: stopped all Repeat")
            except (AttributeError, ValueError):
                logger_eval.warning(f"can not find a Repeat called {alias_name} - stop_all_repeat()")
            return True



        def reset(alias_string):
            self._fst.reset_macro_sequence_by_name(alias_string, current_ke)
            return True

        def release_all_keys():
            def _work():
                self._fst.release_all_currently_pressed_simulated_keys('constraint_action')
                logger_eval.debug("-- Eval: released all keys")
                return True
            # U364/#360: SendInput leg off the pump -> loop lane
            return self.pump_lane(_work, 'release_all_keys')

        def type(key_string):
            def _work():
                release_modifier()
                self._keyboard_controller.type(key_string)
                return True
            # U364/#360: SendInput typing leg off the pump -> loop lane;
            # the macro-playback caller is ON the loop lane and runs inline
            return self.pump_lane(_work, 'type')

        def write(key_string):
            return type(key_string)

        def set(key_string, value = 1):
            if value is True:
                value = 1
            elif value is False:
                value = 0
            self.variables[key_string] = value
            logger_eval.debug(f'variable {key_string} set to: {value}')
            return True

        def is_set(key_string):
            try:
                #print(f'variable {key_string} is {self.variables[key_string]}')
                return True if self.variables[key_string] != 0 else False
            except KeyError:
                set(key_string, 0)
                logger_eval.debug(f'variable {key_string} not set')
                return False

        def get(key_string):
            try:
                return self.variables[key_string]
            except KeyError:
                set(key_string, 0)
                logger_eval.debug(f'variable {key_string} not set')
                return 0


        def check(key_string, value = 1):
            if isinstance(value, int):
                try:
                    return self.variables[key_string] == value
                except KeyError:
                    set(key_string, 0)
                    logger_eval.debug(f'variable {key_string} not set')
                    return False
            elif isinstance(value, (list, tuple)):
                try:
                    return self.variables[key_string] in value
                except KeyError:
                    set(key_string, 0)
                    logger_eval.debug(f'variable {key_string} not set')
                    return False

        def clear(key_string):
            self.variables[key_string] = 0
            logger_eval.debug(f'variable {key_string} cleared')
            return True

        # eval-scope shim (NOT dead): a bare clear_all_variables() call in a
        # config constraint resolves to this local and forwards to the real
        # Output_Manager method - deleting it would silently no-op live configs
        def clear_all_variables():
            self.clear_all_variables()
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
            def _work():
                self._fst.state_manager.release_all_modifier_keys()
                return True
            # U364/#360: SendInput leg off the pump -> loop lane; returns
            # True on BOTH paths (was None inline - eval treated it as
            # not-a-bool and logged a bogus "constraint is not valid"
            # warning, reviewer P2-6)
            return self.pump_lane(_work, 'release_modifier')

        def make_backup(save_dir=self._fst.arg_manager.SAVE_DIR, backup_root_dir=self._fst.arg_manager.BACKUP_ROOT_DIR):
            def _work():
                backup_path, backup_name = mb(save_dir, backup_root_dir)
                print(f"Made backup to {backup_path}")
                show_message(f"Made backup to {backup_name}", d=5., ts=10, bgc="rgba(40, 150, 40, 200)")
                logger.info(f"made backup to {backup_path}")
                return True
            # U364/#360: file I/O leg off the pump -> loop lane
            return self.pump_lane(_work, 'make_backup')

        def restore_backup(save_dir=self._fst.arg_manager.SAVE_DIR, backup_root_dir=self._fst.arg_manager.BACKUP_ROOT_DIR):
            def _work():
                restored_path, restored_name = rb(save_dir, backup_root_dir)
                print(f"Restored backup from {restored_path}")
                show_message(f"Restored backup from {restored_name}", d=5., ts=10, bgc="rgba(150, 40, 40, 200)")
                logger.info(f"restored backup from {restored_path}")
                return True
            # U364/#360: file I/O leg off the pump -> loop lane
            return self.pump_lane(_work, 'restore_backup')

        # U364/#360: the mouse-send legs below (scroll_*, mouse_move*) are
        # SendInput legs -> pump_lane (loop lane off-pump, inline on-loop/legacy)
        def scroll_up(value):
            def _work():
                self._mouse_controller.scroll(0, value)
                return True
            return self.pump_lane(_work, 'scroll_up')

        def scroll_down(value):
            def _work():
                self._mouse_controller.scroll(0, -value)
                return True
            return self.pump_lane(_work, 'scroll_down')

        def scroll_right(value):
            def _work():
                self._mouse_controller.scroll(value, 0)
                return True
            return self.pump_lane(_work, 'scroll_right')

        def scroll_left(value):
            def _work():
                self._mouse_controller.scroll(-value, 0)
                return True
            return self.pump_lane(_work, 'scroll_left')

        def mouse_move_abs(dx, dy):
            def _work():
                self._mouse_controller.position = (dx, dy)
                return True
            return self.pump_lane(_work, 'mouse_move_abs')

        def mouse_move(dx, dy):
            def _work():
                self._mouse_controller.move(dx, dy)
                return True
            return self.pump_lane(_work, 'mouse_move')

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
            def _work():
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
            # U364/#360: the position SET is a SendInput leg -> pump_lane
            # (reviewer P1-1: the sibling of mouse_move/mouse_move_abs).
            # On the lane path the caller gets True at SCHEDULE time (the
            # outcome is not known to the pump - same semantics as every
            # other action leg); the inline path keeps the old False returns.
            return self.pump_lane(_work, 'mouse_move_to_var')

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
            self._fst.remove_all_callback()
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
            def _work():
                pyperclip.copy(key_string)
                show_message(f'"{key_string}" copied to clipboard')
                return True
            # U364/#360: clipboard write leg off the pump -> loop lane
            return self.pump_lane(_work, 'copy_to_clipboard')

        def paste():
            # sync data leg (U364/#360): the eval caller needs the pasted
            # VALUE back, so this clipboard READ stays on the calling thread
            # (no flow-log evidence of a paste stall; a value-passing lane
            # would be a redesign - see handover_u364)
            pasted_text = pyperclip.paste()
            print(f'"{pasted_text}" pasted from clipboard')
            return pasted_text

        def save_into_file(text, time_stamp=get_time(), mode='w', file_path='output.txt'):
            def _work():
                with open(file_path, mode) as file:
                    file.write(f"{time_stamp}: {text}\n")
                print(f'"{time_stamp}: {text}" saved into {file_path}')
                return True
            # U364/#360: file I/O leg off the pump -> loop lane (the
            # time_stamp default still stamps at CALL time on the caller)
            return self.pump_lane(_work, 'save_into_file')

        def append_to_file(text, time_stamp=get_time(), file_path='output.txt'):
            return save_into_file(text, time_stamp, mode='a', file_path=file_path)

        def empty_file(file_path='output.txt'):
            def _work():
                open(file_path, 'w').close()
                print(f'{file_path} has been emptied')
                return True
            # U364/#360: file I/O leg off the pump -> loop lane
            return self.pump_lane(_work, 'empty_file')

        def print_all_variables():
            if self.variables:
                print("Current variables:")
                for key_string, value in self.variables.items():
                    print(f"{key_string}: {value}")
            else:
                print("No variables set.")
            return True

        def clear_console():
            def _work():
                if sys.platform.startswith('win'):
                    system('cls')
                else:
                    system('clear')
                return True
            # U364/#360: shell spawn leg off the pump -> loop lane
            return self.pump_lane(_work, 'clear_console')


        # ---------------------------
        # eval starts from here

        logger_eval.debug(f"received for eval: {constraint_to_evaluate} : {current_ke}")

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
                if isinstance(error, ConfigError):
                    self._fst.surface_config_error(error)
                else:
                    # defensive: any other unexpected exception is logged (fail-closed)
                    logger_eval.error(f"constraint evaluation failed for {constraint_to_evaluate}: {error}")
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
            except ConfigError as error:
                self._fst.surface_config_error(error)
                # unknown key in a constraint function call fails the constraint (fail-closed)
                return False
            except NameError as error:
                # unknown name (e.g. invocation of a macro that never played) -> ignored
                logger_eval.warning(f"constraint {constraint_to_evaluate} not recognized - ignored: {error}")
                return True
            logger_eval.debug(f"evaluated {constraint_to_evaluate} to: {result}")
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

    # U364/#360: lane routing for blocking legs. A LL-hook pump that blocks
    # past LowLevelHooksTimeout gets the hook silently removed -> events pass
    # UNFILTERED (suppression dies mid-macro; maintainer fst_flow.log
    # evidence 2026-11-04). pump_lane schedules the blocking work on the
    # asyncio loop lane (FIFO = loop ready queue) and the pump caller returns
    # True immediately; it runs work() INLINE when the caller is already on
    # the loop thread (macro playback lane) or when no loop is wired
    # (headless/legacy/tests = old synchronous behavior, contract locked in
    # tests/test_pump_async_lane.py::TestFallbackContract; since U375 the
    # headless mode runs the owned MainLogic.loop too, so the inline path
    # there is the safety net only). Every routed leg
    # is an action leg whose success value is True, so the pump-side True is
    # the same value the inline path returns.
    def pump_lane(self, work, leg_name='leg'):
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            loop = getattr(self._fst, 'loop', None)
            if loop is not None:
                async def _run_on_lane():
                    work()
                try:
                    _handle = asyncio.run_coroutine_threadsafe(_run_on_lane(), loop)
                    # repo convention (start_macro_playback/start_repeat): a
                    # raising lane leg surfaces through check_result - never a
                    # silent "scheduled = success" (reviewer P1-3)
                    _handle.add_done_callback(self._fst.check_result)
                    return True
                except Exception as error:
                    logger_flow.error(f"pump lane scheduling failed for {leg_name}: {error}")
                    return False
        return work()

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

    def _tap_source_id(self, tap_group):
        '''F-A10 attribution for a tap release ticket: the group's own key
        strings (the group "a,d" -> "a,d"), so the flow-log TICKET line names
        the emitting group the way the maintainer reads it. Key objects carry
        key_string; a plain-label test member falls back to its vk code. The
        ticket already carries the vk, so the id names the GROUP, not the key.'''
        names = []
        for key in getattr(tap_group, 'keys', ()):
            key_string = getattr(key, 'key_string', None)
            names.append(key_string if key_string
                         else str(getattr(key, 'vk_code', key)))
        return ','.join(names) if names else 'tap'

    def _open_tap_release_ticket(self, vk_code, tap_group):
        '''F-A10 (the stuck-'a' fix, ladder R4 sibling): open the ledger release
        receipt for a tap-snap-send release leg the moment it is SCHEDULED on
        the pump, before the leg leaves the thread, so the sim-release veto's
        R4 consult (FST_Keyboard.take_owed_release_ticket) serves the tap UP
        like every other emitter's: ticket open => deliver, never suppress.
        Closes W1 (the ticketless-UP-eaten-by-the-veto window) by construction.
        source_kind=SOURCE_TAP, source_id names the group, and the ledger stamps
        the global monotonic seq (the multi-key sequence position). The ticket
        closes at DELIVERY (the veto-leg close), exactly like the drain's
        (F-A9) - this method only opens it and never closes it.

        Only the RELEASE legs are ticketed. An arriving tap press is never
        eaten (the veto allows presses on the active key), so a press ticket
        would have no delivery-close path and would age as false tap debt; the
        holders that own a long press (macro/toggle) use open_press_ticket for
        that different hold-ownership shape. The snap tap owes an UP, not a
        hold. None-tolerant like every ticket helper: bookkeeping must never
        block or alter a send, and a stand-in keyboard without the helper is a
        no-op (the send proceeds exactly as before).'''
        opener = getattr(self._fst, 'open_release_ticket', None)
        if opener is None:
            return None
        return opener(vk_code, SOURCE_TAP, self._tap_source_id(tap_group))

    # 260429-1441 - added crossover and delay for tap groups as async coroutines - everything else runs without async directly in the listener thread
    # U364/#360: the sync legs go through pump_lane (loop lane FIFO when a
    # loop is wired, inline fallback when not); tap-group state
    # (set_last_key_send) STAYS on the caller thread so hold-repeat
    # decisions (260428-2341) never read delayed state, and the lane keeps
    # the send step order FIFO (tests/test_pump_async_lane.py).
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
                logger_flow.debug("crossover")
                self._keyboard_controller.press(key_code_to_send)
            else:
                self._keyboard_controller.release(key_code_last_key_send)
            if self._fst.arg_manager.ACT_DELAY or self._fst.arg_manager.ACT_CROSSOVER:
                delay = randint(self._fst.arg_manager.ACT_MIN_DELAY_IN_MS, self._fst.arg_manager.ACT_MAX_DELAY_IN_MS)
                logger_flow.debug(f"delayed by {delay} ms")
                await asyncio.sleep(delay / 1000) # in ms
            if is_crossover:
                self._keyboard_controller.release(key_code_last_key_send)
            else:
                self._keyboard_controller.press(key_code_to_send)


        key_to_send = tap_group.get_active_key()
        last_key_send = tap_group.get_last_key_send()

        logger_flow.debug(f"last_key_send: {last_key_send}")
        logger_flow.debug(f"key_to_send: {key_to_send}")

        key_code_to_send = keyboard.KeyCode.from_vk(key_to_send)
        key_code_last_key_send = keyboard.KeyCode.from_vk(last_key_send)

        # only send if key to send is not the same as last key send
        if key_to_send != last_key_send:
            def _release_last_key():
                self._keyboard_controller.release(key_code_last_key_send)

            def _press_new_key():
                self._keyboard_controller.press(key_code_to_send)

            def _switch_keys():
                self._keyboard_controller.release(key_code_last_key_send)
                self._keyboard_controller.press(key_code_to_send)

            if key_to_send is None:
                if last_key_send is not None:
                    # F-A10: the settle release opens its tap release ticket at
                    # SCHEDULE time, before the leg leaves the pump, so the R4
                    # sim-release veto serves the tap UP (ticket open => deliver).
                    self._open_tap_release_ticket(last_key_send, tap_group)
                    if self.pump_lane(_release_last_key, 'tap_release') is False:
                        # W3: the lane is gone (dead loop) - the owed UP must
                        # still reach the app, so emit it inline (rebind-leg
                        # sibling, F-A9 reviewer P1-4: a key LOST on a dead loop).
                        _release_last_key()
                tap_group.set_last_key_send(None)
            else:
                if last_key_send is not None:
                    # F-A10: the switch's release-of-last_key_send leg opens its
                    # tap release ticket at SCHEDULE time (before the lane hop),
                    # covering W1 (the re-arm race) and the crossover tail; the
                    # ticket closes at delivery via the R4 consult.
                    self._open_tap_release_ticket(last_key_send, tap_group)
                    if not self._fst.arg_manager.ACT_DELAY and not self._fst.arg_manager.ACT_CROSSOVER:
                        if self.pump_lane(_switch_keys, 'tap_switch') is False:
                            # W3 dead lane: still owe the UP, so run the switch
                            # inline (the release closes at delivery).
                            _switch_keys()
                    else:
                        try:
                            asyncio.run_coroutine_threadsafe(send_async(key_to_send, last_key_send, key_code_to_send, key_code_last_key_send), self._fst.loop)
                        except Exception as e:
                            logger_flow.error(f"Error occurred while calling send_keys_with_delay: {e}")
                            # W3 delay/crossover: the schedule died - still owe
                            # the UP of the held key, so emit it inline.
                            _release_last_key()
                else:
                    self.pump_lane(_press_new_key, 'tap_press')
                tap_group.set_last_key_send(key_to_send)

    def clear_all_variables(self):
        self.variables = {}


# ---------------------------------------------------------------------------
# Config validation (U69, proposal 2026-10-31_fst-config-validator a,b,c,d)
#
# ONE pass over the CLEANED config lines (after _clean_comments_numbered /
# _combine_multilines_numbered) that collects ALL violations before any group is
# built; nothing is evaluated and eval() is untouched. Each violation is a
# (line number, item alias, rule, message, severity) record.
#
# severity ERROR: the line cannot build a correct group or would crash the
#   hot path at eval time -> load_config raises one consolidated ConfigError.
# severity WARNING: the line runs today through a silent no-op or a silent
#   strip -> it is reported through the same surface channel and the load
#   proceeds, so valid configs keep their exact behavior.
# ---------------------------------------------------------------------------

Config_Violation = namedtuple('Config_Violation',
                               'line item rule message severity scope')


# constraint-expression functions and their positional-argument arity
# (mirrors the nested helpers of Output_Manager.constraint_evaluation)
CONSTRAINT_FUNCTIONS = {
    # time / state queries
    'tr': (1, 1), 'ts': (1, 1), 'ta': (1, 1),
    'cs': (1, 1), 'csl': (1, 1),
    'p': (1, 1), 'r': (1, 1), 'ap': (1, 1), 'ar': (1, 1),
    'last': (1, 2), 'dc': (0, 2),
    # alias repetition + macro/sequence control
    'start_repeat': (2, 3), 'stop_repeat': (1, 1), 'toggle_repeat': (2, 2),
    'is_repeat_active': (1, 1), 'reset_repeat': (1, 1), 'stop_all_repeat': (0, 0),
    'reset': (1, 1), 'release_all_keys': (0, 0),
    # typing
    'type': (1, 1), 'write': (1, 1), 'release_modifier': (0, 0),
    # integer variables
    'set': (1, 2), 'is_set': (1, 1), 'get': (1, 1), 'check': (1, 2),
    'clear': (1, 1), 'clear_all_variables': (0, 0), 'incr': (1, 1), 'decr': (1, 1),
    # text variables and misc
    'set_var': (2, 2), 'get_var': (1, 1), 'cli': (1, 1),
    'date': (0, 0), 'date_time': (0, 0), 'get_time': (0, 0),
    'make_backup': (0, 2), 'restore_backup': (0, 2),
    # mouse
    'scroll_up': (1, 1), 'scroll_down': (1, 1),
    'scroll_right': (1, 1), 'scroll_left': (1, 1),
    'mouse_move_abs': (2, 2), 'mouse_move': (2, 2), 'mouse_get_pos': (0, 0),
    'mouse_save_to_var': (1, 1), 'mouse_move_to_var': (1, 1),
    # toasts
    'show_message': (1, 4), 'show_timer': (1, 4),
    'remove_toast': (0, 1), 'remove_all_toasts': (0, 1),
    # clipboard / files
    'copy_to_clipboard': (1, 1), 'paste': (0, 0),
    'save_into_file': (1, 4), 'append_to_file': (1, 3), 'empty_file': (0, 1),
    'print_all_variables': (0, 0), 'clear_console': (0, 0),
}

# python builtins resolvable inside eval() of a constraint expression
CONSTRAINT_BUILTINS = frozenset({
    'abs', 'all', 'any', 'bin', 'bool', 'bytes', 'callable', 'chr', 'dict',
    'divmod', 'enumerate', 'filter', 'float', 'format', 'frozenset', 'hex',
    'int', 'isinstance', 'len', 'list', 'map', 'max', 'min', 'ord', 'pow',
    'range', 'reversed', 'round', 'set', 'sorted', 'str', 'sum', 'tuple',
    'zip', 'print',
})

# module roots whose dotted attribute chains resolve inside eval() of a
# constraint expression (imported at the top of this module, so the module
# globals hold them) - their attributes are NOT checked as unknown functions
CONSTRAINT_MODULES = frozenset({'datetime'})

# invocations whose first string argument is an alias <name> reference
ALIAS_ARG_FUNCTIONS = ('start_repeat', 'stop_repeat', 'toggle_repeat',
                       'is_repeat_active', 'reset_repeat')

# key-string prefixes carrying a press/release/toggle meaning
KEY_MODIFIER_PREFIXES = '-+!^'

# focus-name sanitizer rule: ONE pattern, defined in fst_data_types (neutral
# module - fst_tasks needs it too and fst_manager imports fst_tasks) and
# imported above, so the config strip, the validator mirror and the
# active-window TITLE strip in Focus_Task can never drift apart (#399).

# start arguments: valueless switches and value-taking arguments
# F-C3 (review Item 4 inventory): the start-argument vocabulary lives in
# fst_config_parser (START_ARG_FLAGS / START_ARG_VALUES) and is imported at
# the top of this file - the config validator below is its only consumer;
# the command-line chain in Argument_Manager keeps its own (lenient) matching

# elevation names in a config <arg> line (pair-approved 2026-11-16, after
# the maintainer's live confusion): the elevation flag is a START argument
# only - the startup lane strips it from argv before the pipeline - so a
# config line carrying any elevation spelling is always the wrong place.
# The validator answers ALL four dash-count/tense spellings ('-elevate',
# '--elevate', '-elevated', '--elevated') with the specific start-argument
# hint instead of the generic unknown-arg warning (checked on the name
# part: lowercased, leading dashes stripped)
ELEVATE_CONFIG_NAMES = frozenset({'elevate', 'elevated'})

# delay values accepted by Argument_Manager.extract_delays
# F-C2 (review Item 4): the bracket-aware splitter and the delay bounds moved
# to fst_config_parser.py - the config grammar has ONE home. Both names are
# imported at the top of this file, so every call site below is unchanged.


class Config_Validator():
    '''
    structural evaluation of the cleaned config lines - collects ALL
    violations (not fail-fast); no group building and no constraint eval
    '''

    ERROR = 'error'
    WARNING = 'warning'

    def __init__(self):
        self.violations = []
        # F-C2 (review Item 4): the (TAP_n)/(REB_n)/(MAC_n)/(SEQ_n) numbering
        # is the parser's LineNamer with the validator's documented policy -
        # every line of a type advances the counter, declared name or not
        # (presort_lines runs the same class with the other policy)
        self._namer = LineNamer(count_named=True)
        # scope of the line currently checked (violations record it)
        self._current_scope = ''
        # the SILENT sections (U330 ask 3): scopes whose warnings are
        # suppressed - the activation toast skips them. U355 edge 4: ONE
        # live set, public so the load copies it
        # (Config_Manager.config_suppressed_scopes) - the private
        # _suppress_scopes twin and its end-of-validate mirror are gone,
        # a reused instance cannot report stale silent scopes
        self.suppressed_scopes = set()

    def validate(self, numbered_lines):
        '''numbered_lines: list of (line_number, cleaned_line) tuples'''
        self._collect_alias_definitions(numbered_lines)
        # FST-404 (#404) D1: vk -> (line, item) of the FIRST tap group that
        # declares it, per effective scope (a focus section also runs the
        # default-section groups, so its index starts as a copy of the default)
        self._tap_vk_index = {'': {}}
        scope = ''
        aliases_by_scope = self._aliases_by_scope
        self.suppressed_scopes = set()
        for line_number, line in numbered_lines:
            if line.startswith('<focus>'):
                # ruling A (maintainer 2026-11-03, TODO #300): the <focus>
                # header line belongs to ITS OWN new section - take the scope
                # from the header BEFORE recording its warnings, so the
                # header's warnings land in the new section and that
                # section's -no_warnings can suppress them (the previous
                # section no longer leaks them)
                scope = self._focus_scope_of(line)
                self._current_scope = scope
                self._tap_vk_index.setdefault(scope, dict(self._tap_vk_index['']))
                self._check_focus_line(line_number, line)
                continue
            self._current_scope = scope
            if line.startswith('<arg>'):
                self._check_arg_line(line_number, line, scope)
                continue
            self._check_group_line(line_number, line, scope,
                                   aliases_by_scope.get(scope, set()))
        # check-suppression (-no_warnings): drop WARNING violations of the
        # suppressed sections (the default scope '' counts as a section);
        # ERROR severity is never suppressed
        if self.suppressed_scopes:
            self.violations = [v for v in self.violations
                               if not (v.severity == self.WARNING
                                       and v.scope in self.suppressed_scopes)]
        return self.violations

    # -- reporting helpers ---------------------------------------------------

    def _add(self, line_number, item, rule, message, severity):
        self.violations.append(
            Config_Violation(line_number, item, rule, message, severity,
                             self._current_scope))

    def _error(self, line_number, item, rule, message):
        self._add(line_number, item, rule, message, self.ERROR)

    def _warn(self, line_number, item, rule, message):
        self._add(line_number, item, rule, message, self.WARNING)

    @staticmethod
    def format_report(violations):
        '''one consolidated user-facing report text'''
        errors = sum(1 for v in violations if v.severity == Config_Validator.ERROR)
        warnings = len(violations) - errors
        lines = [f'{len(violations)} config violation(s) '
                 f'({errors} error(s), {warnings} warning(s)):']
        for v in violations:
            lines.append(f'  line {v.line} {v.item or "(unnamed)"} '
                         f'[{v.rule}] {v.severity}: {v.message}')
        return '\n'.join(lines)

    # -- scope / alias definitions -------------------------------------------

    def _collect_alias_definitions(self, numbered_lines):
        '''alias <name> definitions per scope (default + each focus section)'''
        self._aliases_by_scope = {'': set()}
        scope = ''
        for _, line in numbered_lines:
            if line.startswith('<focus>'):
                scope = self._focus_scope_of(line)
                # a focus section sees the default aliases plus its own ones
                if scope not in self._aliases_by_scope:
                    self._aliases_by_scope[scope] = set(
                        self._aliases_by_scope.get('', set()))
            else:
                # F-C3: same split_item_prefix rule as _check_group_line;
                # only an '<...>' prefix is an alias DEFINITION here (a
                # '(*name*)' prefix names a group, it defines no alias)
                declared, _, _ = split_item_prefix(line)
                if declared.startswith('<'):
                    self._aliases_by_scope.setdefault(scope, set()).add(
                        declared)

    @staticmethod
    def _focus_scope_of(line):
        '''F-C2 (review Item 4): the scope rule is fst_config_parser.
        focus_scope_of - the runtime's focus map (Config_Manager.
        _focus_scope_map_from_lines) uses the same cleaning, so a section can
        no longer scope differently in the report than at runtime'''
        return focus_scope_of(line)

    # -- focus and argument lines --------------------------------------------

    def _check_focus_line(self, line_number, line):
        name = line.replace('<focus>', '')
        stripped = clean_focus_header(line)
        if not stripped.strip(', ').strip():
            self._error(line_number, '(focus)', 'focus',
                        'empty focus name - add the window name after <focus>')
            return
        if stripped != name:
            removed = ''.join(sorted(set(re.findall(FOCUS_NAME_ILLEGAL, name))))
            self._warn(line_number, '(focus)', 'focus',
                       f'invalid focus-name characters removed: {name!r} -> {stripped!r} '
                       f'(removed: {removed!r})')

    def _check_arg_line(self, line_number, line, scope):
        arg = line.replace('<arg>', '').strip().lower()
        if not arg or arg[0] in (':', '#'):
            return
        if arg[0] != '-':
            self._warn(line_number, '(arg)', 'arg',
                       f'start argument {arg!r} must start with "-"')
            return
        name, _, value = arg.partition('=')
        if name.lstrip('-') in ELEVATE_CONFIG_NAMES:
            # self-explaining rejection (pair-approved 2026-11-16): any
            # elevation spelling here gets the specific hint, not the
            # generic unknown-arg warning below; the echo carries the
            # whole (already lowercased) arg like the generic warning does
            self._warn(line_number, '(arg)', 'arg',
                       f"'{arg}' is a start argument for elevation - "
                       'place it on the command line, not in the config')
            return
        # U361 (TODO #356, ruling A 2026-11-04): dashed spellings are
        # accepted - normalize '-' -> '_' in the NAME part for matching
        # ('-always-active' == '-always_active'); the value stays verbatim
        # and the messages below echo the original spelling
        match_name = normalize_start_arg_name(name)
        if match_name == '-no_warnings':
            # check-suppression arg (maintainer observation 1): warnings of
            # this section are dropped from the report; the section carries
            # the flag - a bare <arg>-no_warnings in the default scope
            # suppresses the default group's warnings
            self.suppressed_scopes.add(scope)
        has_value = value != ''
        if match_name == '-default_on' and not has_value:
            # (#423) retired the same day it shipped (U418/321a893): settled
            # model (maintainer 2026-11-11, TODO #418 resolution) - the
            # default group IS merged into every focus group; -default_off
            # is the ONLY opt-out, so -default_on has no valid function.
            # WARNING (suppressible with the section's -no_warnings) - the
            # flag does nothing at runtime anymore. Dashed twin included
            # (U361 normalization above). The VALUE form falls through to
            # the generic unknown-argument warning - the parser branch
            # (exact '-default_on' match) reports it unknown too, so both
            # lanes stay consistent (U423 review P2-4)
            self._warn(line_number, '(arg)', 'arg',
                       '-default_on is retired - the default group is always '
                       'added to every focus group; use -default_off to opt out')
            return
        if has_value:
            if match_name in START_ARG_VALUES:
                self._check_arg_value(line_number, match_name, value)
            elif match_name in START_ARG_FLAGS:
                self._error(line_number, '(arg)', 'arg',
                            f'{name} takes no value - remove the "=" part')
            else:
                self._warn(line_number, '(arg)', 'arg',
                           f'unknown start argument: {arg}')
            return
        if match_name in START_ARG_FLAGS:
            return
        if match_name in START_ARG_VALUES:
            self._error(line_number, '(arg)', 'arg',
                        f'{name} needs a value after "="')
            return
        self._warn(line_number, '(arg)', 'arg',
                   f'unknown start argument: {arg}')

    def _check_arg_value(self, line_number, name, value):
        if name == '-log':
            if value not in LOG_LEVELS:
                self._error(line_number, '(arg)', 'arg',
                            f'invalid log level {value!r} - use debug, info, warning or error')
        elif name == '-focusapp':
            self._error(line_number, '(arg)', 'arg',
                        '-focusapp is removed since V1.0.0 - use <focus>name in the config')
        elif name in ('-tapdelay', '-aliasdelay', '-macrodelay'):
            delays = parse_int_list(value)
            if delays is None:
                self._error(line_number, '(arg)', 'arg',
                            f'invalid delay {value!r} - needs number(s) separated by comma')
                return
            if len(delays) > 2:
                self._warn(line_number, '(arg)', 'arg',
                           f'{name} gets {len(delays)} values - only the first two are used')
            for delay in delays:
                if not DELAY_RANGE[0] <= delay <= DELAY_RANGE[1]:
                    self._error(line_number, '(arg)', 'arg',
                                f'delay {delay} not in range {DELAY_RANGE[0]}<delay<={DELAY_RANGE[1]} ms')
        elif name == '-crossover':
            crossover = parse_int_list(value)
            if crossover is None or len(crossover) != 1:
                self._error(line_number, '(arg)', 'arg',
                            f'invalid probability {value!r} - needs one number')
            elif not 0 <= crossover[0] <= 100:
                self._error(line_number, '(arg)', 'arg',
                            f'probability {crossover[0]} not in range 0<=prob<=100 %')
        elif name == '-status_indicator':
            size = parse_int_list(value)
            if size is None or len(size) != 1 or size[0] <= 0:
                self._error(line_number, '(arg)', 'arg',
                            f'invalid indicator size {value!r} - needs one number > 0')
        elif name == '-crosshair':
            delta = parse_int_list(value)
            if delta is None or len(delta) != 2:
                self._error(line_number, '(arg)', 'arg',
                            f'invalid crosshair delta {value!r} - needs two numbers, e.g. -crosshair=5,-10')

    # F-C2 (review Item 4): the int-list parse of the value arguments moved to
    # fst_config_parser.parse_int_list - the ONE place a delay/probability/
    # size value is turned into ints for the report (the runtime parses its
    # own copy in extract_delays, which is a behavior decision, see there)

    # -- group lines: arity per item type ------------------------------------

    def _check_group_line(self, line_number, line, scope, aliases):
        # F-C3 (review Item 4 inventory): the declared-name prefix rule is
        # fst_config_parser.split_item_prefix - the same rule the alias
        # collection walk applies below, so the two validator walks cannot
        # disagree about where a name ends and the body starts
        alias, body, is_alias_line = split_item_prefix(line)
        if is_alias_line and not re.fullmatch(r'<[A-Za-z0-9_]+>', alias):
            self._error(line_number, alias, 'alias',
                        f'invalid alias name {alias} - letters, numbers and "_" only')

        if is_alias_line:
            if not body:
                self._warn(line_number, alias, 'alias', 'alias without keys - nothing to insert')
            self._check_key_group(line_number, alias, body, aliases, 'group')
            return

        # F-C2 (review Item 4): ONE classification - fst_config_parser.
        # classify_groups is the same rule presort_lines runs, so a line the
        # validator calls a macro can never be a tap group at runtime
        kind, groups = classify_groups(body)

        if kind == KIND_TAP:
            item = self._namer.name_for(kind, alias)
            if groups[0].count('(') == groups[0].count(')') and len(split_key_group(groups[0])) < 2:
                self._warn(line_number, item, 'arity',
                           'tap group needs 2 or more keys')
            self._check_key_group(line_number, item, groups[0], aliases, 'tap')
            self._check_tap_group_ownership(line_number, item, groups[0])
        elif kind == KIND_REBIND:
            item = self._namer.name_for(kind, alias)
            key_group = split_key_group(groups[1])
            if not any(k for k in split_key_group(groups[0])):
                self._error(line_number, item, 'shape',
                            'rebind without trigger key - add the trigger before ":"')
            if groups[1].count('(') == groups[1].count(')') and len(key_group) != 1:
                self._error(line_number, item, 'arity',
                            f'{key_group} is not a valid rebind (only one key_event/key allowed) '
                            '- use "::" instead of ":" to declare it as a macro')
            self._check_key_group(line_number, item, groups[0], aliases, 'trigger')
            self._check_key_group(line_number, item, groups[1], aliases, 'group')
        elif kind in (KIND_MACRO, KIND_SEQUENCE):
            if kind == KIND_SEQUENCE:
                item = self._namer.name_for(kind, alias)
                key_groups = groups[2:]
                if len(key_groups) < 2:
                    self._error(line_number, item, 'arity',
                                'macro sequence needs 2 or more key groups')
            else:
                item = self._namer.name_for(kind, alias)
                key_groups = [groups[2]]
            if not any(k for k in split_key_group(groups[0])):
                self._error(line_number, item, 'shape',
                            'macro without trigger key - add the trigger before "::"')
            self._check_key_group(line_number, item, groups[0], aliases, 'trigger')
            for key_group in key_groups:
                self._check_key_group(line_number, item, key_group, aliases, 'group')
        else:
            # presort_lines drops this line today: the middle group is not empty
            self._error(line_number, alias or '(unnamed)', 'dropped',
                        'line dropped - ":" after a "::" group needs an empty '
                        'middle group (use "a :: b : c" for a macro sequence)')

    def _check_tap_group_ownership(self, line_number, item, group_text):
        '''FST-404 (#404), ruling protocol D1: one vk may be owned by only ONE
        tap group per effective scope. The runtime hands a vk event to the
        FIRST group declaring it (owner registry, FST_Keyboard.
        _tap_owner_by_vk), so a second declaration is dead config -> WARNING.
        An ERROR would reject existing user configs (maintainer's included) =
        observable behavior change, so it stays a warning.'''
        if not group_text or group_text.count('(') != group_text.count(')'):
            return
        index = self._tap_vk_index.setdefault(self._current_scope, {})
        for key_string in split_key_group(group_text):
            base = key_string.split('|')[0].strip()
            vk = self._tap_vk_of(base)
            if vk is None:
                continue
            first = index.get(vk)
            if first is not None and first[0] != line_number:
                self._warn(line_number, item, 'tap-dup',
                           f"key '{base}' is already in tap group {first[1]} "
                           f"(line {first[0]}) - only the first group owns it")
                continue
            index[vk] = (line_number, item)

    @staticmethod
    def _tap_vk_of(base):
        if base in vk_codes_dict:
            return vk_codes_dict[base]
        try:
            vk = int(base)
        except ValueError:
            return None
        return vk if 0 <= vk < 256 else None

    def _check_key_group(self, line_number, item, group_text, aliases, kind):
        '''one key group: unbalanced brackets drop it in presort_lines'''
        if not group_text:
            return
        if group_text.count('(') != group_text.count(')'):
            self._error(line_number, item, 'parens',
                        f'unbalanced parentheses in "{group_text}" - group dropped')
            return
        for key_string in split_key_group(group_text):
            self._check_key_string(line_number, item, key_string, aliases, kind)

    # -- key strings and constraint expressions ------------------------------

    def _check_key_string(self, line_number, item, key_string, aliases, kind):
        segments = key_string.split('|')
        base = segments[0]

        if kind == 'tap':
            if len(base) > 1 and base[0] in KEY_MODIFIER_PREFIXES:
                self._error(line_number, item, 'shape',
                            f'tap group key {base} must be a plain key (no -/+ ! ^ prefix)')
                return
            if len(segments) > 1:
                self._error(line_number, item, 'shape',
                            f'tap group key {base} must be a plain key (no delay suffix)')
                return
            self._check_vk_resolvable(line_number, item, base)
            return

        if base.startswith('<'):
            # groups resolve a "<name>" string through the alias dict only
            if base not in aliases:
                self._error(line_number, item, 'alias',
                            f'alias {base} is not defined in this focus section')
            if len(segments) > 1:
                self._warn(line_number, item, 'suffix',
                           f'suffixes on the alias {base} are ignored')
            return

        if len(base) > 1 and base[0] in KEY_MODIFIER_PREFIXES:
            base = base[1:]
        self._check_vk_resolvable(line_number, item, base)

        for segment in segments[1:]:
            self._check_constraint_segment(line_number, item, segment, aliases)

    def _check_vk_resolvable(self, line_number, item, key):
        if key in vk_codes_dict:
            return
        try:
            valid = 0 <= int(key) < 256
        except ValueError:
            valid = False
        if not valid:
            self._error(line_number, item, 'vk',
                        f'key {key!r} does not resolve to a vk code')

    def _check_constraint_segment(self, line_number, item, segment, aliases):
        if segment.startswith('('):
            inner = segment[1:-1]
            if not segment.endswith(')') or inner.count('(') != inner.count(')'):
                self._error(line_number, item, 'constraint',
                            f'unbalanced parentheses in constraint {segment}')
                return
            self._check_constraint_expression(line_number, item, inner, aliases)
            return
        try:
            int(segment)
        except ValueError:
            self._error(line_number, item, 'constraint',
                        f'constraint {segment!r} needs to be a delay number or "(...)"')

    @staticmethod
    def _module_root_of(func):
        '''root module name of a dotted call chain, crossing calls on the way:
        datetime.datetime.now().strftime -> 'datetime' (a chain not rooted at a
        module name - a helper-call result, a subscript - yields '')'''
        node = func
        while True:
            if isinstance(node, ast.Attribute):
                node = node.value
            elif isinstance(node, ast.Call) and isinstance(
                    node.func, (ast.Name, ast.Attribute)):
                node = node.func
            else:
                break
        return node.id if isinstance(node, ast.Name) else ''

    def _check_constraint_expression(self, line_number, item, expression, aliases):
        '''structural pass over one "(...)" constraint - no evaluation'''
        if expression in ('', '!', 'True', 'False', 'None'):
            return
        try:
            tree = ast.parse(expression, mode='eval')
        except SyntaxError as error:
            self._error(line_number, item, 'constraint',
                        f'constraint ({expression}) is not a valid expression: {error.msg}')
            return
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            if isinstance(node.func, ast.Name):
                name = node.func.id
            elif isinstance(node.func, ast.Attribute):
                if self._module_root_of(node.func) in CONSTRAINT_MODULES:
                    continue
                name = node.func.attr
            else:
                continue
            args = node.args
            if name in CONSTRAINT_FUNCTIONS:
                min_args, max_args = CONSTRAINT_FUNCTIONS[name]
                if not min_args <= len(args) <= max_args:
                    self._error(line_number, item, 'constraint',
                                f'{name}() takes {min_args}-{max_args} arguments, got {len(args)}')
                if name in ALIAS_ARG_FUNCTIONS and args and isinstance(args[0], ast.Constant) \
                        and isinstance(args[0].value, str):
                    self._check_alias_argument(line_number, item, args[0].value, aliases)
            elif name not in CONSTRAINT_BUILTINS:
                self._warn(line_number, item, 'constraint',
                           f'unknown function {name}() - evaluates to True (no-op)')

    @staticmethod
    def _alias_reference_in_text(text):
        match = re.search(r'<[A-Za-z0-9_]+>', text)
        return match.group(0) if match else ''

    def _check_alias_argument(self, line_number, item, text, aliases):
        reference = self._alias_reference_in_text(text)
        if reference and reference not in aliases:
            self._error(line_number, item, 'alias',
                        f'alias {reference} is not defined in this focus section')


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
        # validator violations of the last load_config that only warn
        self.config_warnings = []
        # SILENT scopes of the last load_config: sections carrying
        # -no_warnings (U330 ask 3) - the activation toast skips them
        self.config_suppressed_scopes = set()
        # cleaned focus name -> validator scope of the last load_config:
        # a multi-name section is scoped by its FIRST cleaned name, and the
        # runtime maps EVERY name of the section to the same group lines
        # (U330 reviewer P1: the scoped report and the silent check resolve
        # every name through this map)
        self.config_focus_scopes = {}

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
        return [cleaned for _, cleaned in self._clean_comments_numbered(lines)]

    def _clean_comments_numbered(self, lines):
        '''F-C2 (review Item 4): the comment/inline-comment grammar lives in
        fst_config_parser.clean_comment_lines - the validator walks this same
        output, so the rule has ONE home'''
        return clean_comment_lines(lines)

    def _combine_multilines_numbered(self, numbered_lines):
        '''F-C2 (review Item 4): the ':' continuation join lives in
        fst_config_parser.combine_multiline_continuations'''
        return combine_multiline_continuations(numbered_lines)

    def _focus_scope_map_from_lines(self, cleaned_lines):
        '''every cleaned name of every focus section -> the validator scope
        of that section (Config_Validator._focus_scope_of: the cleaned
        header's split(',')[0].strip() - a blank first name ('<focus>
        ,Alpha') scopes the section to '' = the default scope). Built from
        the cleaned lines so the map refreshes BEFORE the ConfigError
        check (U355 edge 2) and scopes sections exactly as the validator
        does (U330 reviewer P1, U355 edge 1)'''
        focus_scopes = {}
        for _, line in cleaned_lines:
            if not line.startswith('<focus>'):
                continue
            cleaned = clean_focus_header(line)
            names = [name.strip() for name in cleaned.split(',')
                     if name.strip()]
            if not names:
                continue
            scope = cleaned.split(',')[0].strip()
            for name in names:
                focus_scopes[name] = scope
        return focus_scopes

    def _parse_lines_for_focus_manager(self, file_lines):
        '''
        reads in the file and removes the commented out lines, keys and inline comments;
        joins multiline macro sequences;
        validates the cleaned lines before any group is built
        '''

        cleaned_lines = self._combine_multilines_numbered(self._clean_comments_numbered(file_lines))

        validator = Config_Validator()
        violations = validator.validate(cleaned_lines)
        self.config_warnings = [v for v in violations
                                if v.severity == Config_Validator.WARNING]
        # the silent sections of THIS load (U330 ask 3): re-saved every load,
        # never carried over from a previous one
        self.config_suppressed_scopes = set(validator.suppressed_scopes)
        # U355 edge 2: the focus name->scope map refreshes in the SAME load
        # as warnings/suppressed - built from the cleaned lines BEFORE the
        # ConfigError raise, so a rejected load leaves no stale map behind
        self.config_focus_scopes = self._focus_scope_map_from_lines(cleaned_lines)
        if any(v.severity == Config_Validator.ERROR for v in violations):
            logger_config.error(f"config violations:\n{Config_Validator.format_report(violations)}")
            raise ConfigError(Config_Validator.format_report(violations),
                              'config file')

        group_lines = [line for _, line in cleaned_lines]

        focus_name = ''
        multi_focus_dict = {}
        default_start_arguments = []
        default_group_lines = []
        extra_focus_names = []

        for line in group_lines:
            if line.startswith('<focus>'):
                # #only allow letters, numbers and spaces in focus_name
                # (F-C2: the SAME cleaning the validator scopes with)
                focus_name = clean_focus_header(line)

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

    def alias_definition_lines(self, lines):
        '''FST-403 (#403): the default lines a focus section still needs when
        -default_off drops the default GROUP LINES - the alias DEFINITION
        entries. A collected group line is a [line_name, line] pair
        (_parse_lines_for_focus_manager), and an alias definition carries its
        name token in line_name ('<world>'); presort_lines routes those into
        the alias dict, and a focus-section macro/rebind resolves '<name>'
        through that dict AT BUILD TIME, so dropping them aborts the whole
        group build (KeyError 'Alias <x> is not known' -> bare Exception).
        Tap groups, rebinds, macros and macro sequences are group lines and
        stay dropped (approved proposal 2026-10-31, ruling b).'''
        kept = []
        for item in lines:
            line_name = item[0] if isinstance(item, (list, tuple)) and item else ''
            if line_name.startswith('<') and line_name.endswith('>') \
                    and line_name not in ('<arg>', '<focus>'):
                kept.append(item)
        return kept

    def presort_lines(self, lines):
        '''
        saves cleaned lines according to formatting in different containers;
        saved in variable_hr (human readable)

        a line with >2 groups and a non-empty middle group is dropped here;
        Config_Validator reports it as rule "dropped" before load_config
        returns, so it is never silently lost anymore

        F-C2 (review Item 4): the item TYPE comes from
        fst_config_parser.classify_groups - the SAME rule the validator applies
        when it reports that line, so the two lanes cannot disagree about what
        a line is; the default names come from LineNamer with this method's own
        counter policy (only unnamed lines advance it).
        '''
        self._tap_groups_hr = []
        self._rebinds_hr = []
        self._macros_hr = []
        self._alias_hr = []

        namer = LineNamer(count_named=False)
        # sort the lines into their categories for later initialization
        for line in lines:

            alias, line = line
            if alias.startswith('<'):
                self._alias_hr.append([alias, split_key_group(line)])
            else:
                kind, groups = classify_groups(line)
                # tap groups
                if kind == KIND_TAP:
                    # generate default names for Tap Groups
                    alias = namer.name_for(kind, alias)
                    self._tap_groups_hr.append([alias, split_key_group(groups[0])])
                # rebinds
                elif kind == KIND_REBIND:
                    trigger_group = split_key_group(groups[0])
                    key_group = split_key_group(groups[1])
                    # generate default names for Rebinds
                    alias = namer.name_for(kind, alias)
                    if len(key_group) == 1:
                        self._rebinds_hr.append([alias, [trigger_group, key_group[0]]])
                    # the multi-key replacement is reported by Config_Validator
                    # (rule "arity") before this point is ever reached
                    # macro
                elif kind in (KIND_MACRO, KIND_SEQUENCE):
                    trigger_group = split_key_group(groups[0])
                    if kind == KIND_SEQUENCE:
                        # generate default names for Macro Sequences
                        alias = namer.name_for(kind, alias)
                        key_groups = [split_key_group(group) for group in groups[2:]]
                        self._macros_hr.append([alias, [trigger_group] + key_groups])
                    else:
                        # generate default names for Macros
                        alias = namer.name_for(kind, alias)
                        key_group = split_key_group(groups[2])
                        self._macros_hr.append([alias, [trigger_group, key_group]])
                # KIND_DROPPED: no container - the validator named it already

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

# ---------------------------------------------------------------------------
# --elevate startup lane (maintainer decision 2026-11-16 item 2; posture
# approved item 3; route = research estate 2026-11-13_elevated-input.md
# section 5 lane 1): a frozen exe given --elevate self-elevates through ONE
# runas relaunch of itself, strips the flag from the child's args (loop
# guard) and exits 0. free_snap_tap.py __main__ calls handle_elevate_flag
# BEFORE any UI/hook init and feeds the returned args into the start-arg
# pipeline - the flag never reaches apply_start_arguments, so existing
# parsing/validation is undisturbed (see tests/test_elevate_flag.py).
# ---------------------------------------------------------------------------

ELEVATE_FLAG = '--elevate'

# accepted startup spellings (pair-approved 2026-11-16, WTD mirror):
# '-elevated' is WTD's spelling - cross-product vocabulary parity.
# '--elevate' stays the canonical spelling everywhere (docs, messages,
# pins); the alias only enters through the startup lane, where BOTH
# spellings are stripped from the child's argv (loop guard)
ELEVATE_START_FLAGS = (ELEVATE_FLAG, '-elevated')

ELEVATE_DEV_MESSAGE = ('[Elevation] dev mode - relaunch the exe manually '
                       'or use scheduled task')

# ShellExecuteW failure band labels (cross-product polish 2026-11-16, WTD
# mirror): the documented <= 32 return values are error codes, and the
# shipped failure line carried only the number, so a declined UAC prompt (5)
# and a missing exe (2) looked identical in fst.log. Values verified against
# the installed Windows SDK: SE_ERR_* in um/shellapi.h, ERROR_BAD_FORMAT in
# shared/winerror.h (2026-11-16).
SE_ERR_NAMES = {
    2: 'SE_ERR_FNF',
    3: 'SE_ERR_PNF',
    5: 'SE_ERR_ACCESSDENIED',
    8: 'SE_ERR_OOM',
    11: 'ERROR_BAD_FORMAT',
    26: 'SE_ERR_SHARE',
    27: 'SE_ERR_ASSOCINCOMPLETE',
    28: 'SE_ERR_DDETIMEOUT',
    29: 'SE_ERR_DDEFAIL',
    30: 'SE_ERR_DDEBUSY',
    31: 'SE_ERR_NOASSOC',
    32: 'SE_ERR_DLLNOTFOUND',
}


def _se_err_name(code):
    '''readable label for a ShellExecuteW failure code; a code the SDK table
    above does not name keeps its number (never an invented symbol)'''
    name = SE_ERR_NAMES.get(code)
    return name if name is not None else f'code {code}'


def _shell32_is_user_an_admin():
    '''the bare ctypes seam for IsUserAnAdmin (tests patch this)'''
    return bool(ctypes.windll.shell32.IsUserAnAdmin())


def _shell32_runas_relaunch(exe_path, parameters, work_dir):
    '''the bare ctypes seam for ShellExecuteW(NULL, "runas", ...) (tests
    patch this); returns the HINSTANCE int (<= 32 = SE_ERR_* failure).
    restype is pinned to c_void_p (cross-product polish 2026-11-16): the
    documented return is an HINSTANCE-cast INT_PTR, so ctypes' default c_int
    truncates the high dword on x64 and a healthy relaunch could read as a
    failure; c_void_p hands the whole value back as an int (NULL arrives as
    None -> 0 = the failure band). work_dir pins the child's CWD to the
    parent's so relative -save_dir= / -backup_root_dir= / -file= values
    resolve on the same footing as they would without the relaunch (reviewer
    P2 2026-11-16: lpDirectory was left NULL and the child CWD unpinned)'''
    shell32 = ctypes.windll.shell32
    shell32.ShellExecuteW.restype = ctypes.c_void_p
    return int(shell32.ShellExecuteW(None, 'runas', exe_path, parameters,
                                     work_dir, 1) or 0)


def _is_process_elevated():
    '''wrapped admin-state check: True = high IL already. A win32 failure
    is named in a warning and treated as NOT elevated - the honest runas
    prompt beats a false '[Elevation] running elevated' claim'''
    try:
        return _shell32_is_user_an_admin()
    except Exception as error:
        logger.warning(f"[Elevation] IsUserAnAdmin failed: {error!r} - "
                       "treating the process as not elevated")
        return False


def _is_dev_python():
    '''dev-mode detection via sys.executable NAME: a source/pytest run
    lives under python.exe; a frozen build (Nuitka/PyInstaller) runs its
    own exe, so its basename never starts with 'python' (spec 2026-11-16)'''
    return os.path.basename(sys.executable).lower().startswith('python')


def _build_runas_parameters(args):
    '''join the flag-free argv into the ONE lpParameters string ShellExecuteW
    wants. list2cmdline applies the exact MSVC argv-quoting rules the child's
    C runtime reverses (reviewer P1 2026-11-16: hand-rolled space-quoting
    corrupts spaced args with trailing backslashes or embedded quotes);
    order preserved'''
    return subprocess.list2cmdline(args)


def handle_elevate_flag(argv):
    '''the --elevate startup lane - returns the args to continue with.

    no flag: argv comes back untouched (zero behavior change, no win32
    call at all).
    already elevated: ONE '[Elevation] running elevated' log line, the
    run continues with the flag stripped.
    not elevated + dev run (python.exe): log ELEVATE_DEV_MESSAGE at WARNING
    (console + fst.log) and continue - no ShellExecute attempt, so no prompt
    and no loop.
    not elevated + frozen exe: ONE runas relaunch of sys.executable with
    the original args WITHOUT the flag (the child never sees it = loop
    guard), then exit 0 via SystemExit.
    '-elevated' is an accepted alias of '--elevate' (pair-approved
    2026-11-16, ELEVATE_START_FLAGS): it triggers the same lane and is
    stripped exactly like the canonical spelling.'''
    if not any(flag in argv for flag in ELEVATE_START_FLAGS):
        return argv
    rest = [arg for arg in argv if arg not in ELEVATE_START_FLAGS]
    if _is_process_elevated():
        logger.info('[Elevation] running elevated')
        return rest
    if _is_dev_python():
        # user-facing instruction (F-B2 class: stays console-visible) AND
        # mirrored to fst.log (polish P2, WTD mirror): the 'fst' console
        # handler shows WARNING+, so the hint rides WARNING to reach BOTH
        # channels - a print() here would vanish with no console at all
        # (pythonw.exe) and never appear in the log the maintainer hunts in.
        logger.warning(ELEVATE_DEV_MESSAGE)
        return rest
    logger.info('[Elevation] relaunching elevated via runas')
    se_result = _shell32_runas_relaunch(sys.executable,
                                        _build_runas_parameters(rest),
                                        os.getcwd())
    if se_result <= 32:
        # SE_ERR_* (5 = the declined UAC prompt): the exit code stays 0 per
        # spec, but the failure gets a named warning line - a silent exit
        # would leave the log indistinguishable from a successful relaunch.
        # The polish unit adds the SE_ERR_* name so the log says WHICH
        # failure happened; the 'runas relaunch returned N' phrase stays
        # because the shipped lane pins it.
        logger.warning(f'[Elevation] runas relaunch returned {se_result} '
                       f'({_se_err_name(se_result)}) - no elevated instance '
                       'started; launch the exe as administrator manually '
                       'if none appeared')
    sys.exit(0)


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

    WIN32_FILTER_PAUSED = True
    MANUAL_PAUSED = False
    STOPPED = False
    MENU_ENABLED = True
    CONTROLS_ENABLED = True
    PRINT_VK_CODES = False

    EXEC_ONLY_ONE_TRIGGERED_MACRO = False

    ALWAYS_ACTIVE = False
    # (#403) approved proposal 2026-10-31_fst-default-focus-group-deactivation
    # (maintainer comments a+b): a focus section can drop the default GROUP
    # LINES with -default_off; start arguments stay merged
    DEFAULT_OFF = False
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
        self.DEFAULT_OFF = Argument_Manager.DEFAULT_OFF
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
                # F-C2 (review Item 4): the runtime bound is the parser's
                # RUNTIME_DELAY_RANGE, INCLUSIVE both ends - (1, 1000) is the
                # historical '0 < delay <= 1000' written as a named range. It
                # is DELIBERATELY not the validator's DELAY_RANGE (0, 1000)
                # checked '0 <= delay <= 1000': the pair is the delay-0 drift
                # Item 4 names, now visible in ONE place and pinned in
                # tests/test_config_parser.py. Unifying the two bounds changes
                # which configs work - a maintainer decision, not a refactor.
                if RUNTIME_DELAY_RANGE[0] <= delay <= RUNTIME_DELAY_RANGE[1]:
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
            # U366 (TODO #362 ruling A 2026-11-06): arg[:1] not arg[0] - an
            # empty argv element must not raise IndexError; it falls through
            # the branch chain to the unknown-argument warning below
            if arg[:1] in (':', '#'):
                continue
            logger_config.debug(f"start argument: {arg}")
            # U361 (TODO #356, ruling A 2026-11-04): dashed spellings are
            # accepted - normalize '-' -> '_' in the arg NAME part for
            # matching ('-always-active' == '-always_active'); the text
            # after '=' stays verbatim; the unknown-arg warning below
            # echoes the original spelling. Names NOT starting with '-'
            # stay untouched (ruling scope: the validator twin rejects
            # them, parser must not rewrite them into valid args)
            original_arg = arg
            arg = normalize_start_arg_name(arg)
            # log level control: -log=debug/info/warning/error
            if arg_value(arg, '-log') is not None:
                level = arg_value(arg, '-log').lower()
                if level in LOG_LEVELS:
                    set_area_log_level(LOG_LEVELS[level])
                else:
                    logger_config.warning(f"invalid log level: {arg_value(arg, '-log')} - use debug, info, warning or error")
            # enable the per-key flow stream -> fst_flow.log
            elif arg == "-flow":
                set_flow_enabled(True)
            elif arg == "-debug_numpad":
                CONSTANTS.DEBUG_NUMPAD = True
            # drop-watch lane -> named drop records in fst_drop.log (U345 H1)
            elif arg == "-drop_watch":
                set_drop_watch_enabled(True)
            # restore the direct toast bridge emit (U345 H2 A/B switch)
            elif arg == "-no_toast_offload":
                CONSTANTS.TOAST_OFFLOAD = False
            # start directly without showing the menu
            elif arg == "-nomenu":
                self.MENU_ENABLED = False
            # use custom tap groups file for loading and saving
            elif arg_value(arg, '-file') is not None:
                file_name = arg_value(arg, '-file')
                logger_config.info(f"config file set to: {file_name}")
                self._fst.config_manager.file_name = file_name
            # Start with controls disabled
            elif arg == "-nocontrols":
                self.CONTROLS_ENABLED = False
            elif arg == "-delay":
                self.ACT_DELAY = True
            elif arg_value(arg, '-tapdelay') is not None:
                self.ACT_DELAY = True
                delays = extract_delays(arg_value(arg, '-tapdelay'))
                if delays is not None:
                    self.ACT_MIN_DELAY_IN_MS, self.ACT_MAX_DELAY_IN_MS = delays
                    print(f"Tap delays set to: min:{self.ACT_MIN_DELAY_IN_MS}, max:{self.ACT_MAX_DELAY_IN_MS}")
                else:
                    print("no valid tap delay - delay range unchanged")
            elif arg_value(arg, '-aliasdelay') is not None:
                self.ACT_DELAY = True
                delays = extract_delays(arg_value(arg, '-aliasdelay'))
                if delays is not None:
                    self.MACRO_MIN_DELAY_IN_MS, self.MACRO_MAX_DELAY_IN_MS = delays
                    print(f"Macro delays set to: min:{self.MACRO_MIN_DELAY_IN_MS}, max:{self.MACRO_MAX_DELAY_IN_MS}")
                else:
                    print("no valid alias delay - delay range unchanged")
            elif arg_value(arg, '-macrodelay') is not None:
                self.ACT_DELAY = True
                delays = extract_delays(arg_value(arg, '-macrodelay'))
                if delays is not None:
                    self.MACRO_MIN_DELAY_IN_MS, self.MACRO_MAX_DELAY_IN_MS = delays
                    print(f"Macro delays set to: min:{self.MACRO_MIN_DELAY_IN_MS}, max:{self.MACRO_MAX_DELAY_IN_MS}")
                else:
                    print("no valid macro delay - delay range unchanged")
            elif arg == "-crossover":
                self.ACT_CROSSOVER = True
            elif arg_value(arg, '-crossover') is not None:
                self.ACT_CROSSOVER = True
                probability = None
                try:
                    probability = int(arg_value(arg, '-crossover'))
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
            elif arg_value(arg, '-focusapp') is not None:
                #FOCUS_APP_NAME = arg[10:]
                #print(f"focusapp active: looking for: {FOCUS_APP_NAME}")
                print("Do not use the -focusapp start argument with V1.0.0+, use instead <focus>*name* directly in config!")
                sys.exit(1)
            elif arg == "-exec_one_macro":
                self.EXEC_ONLY_ONE_TRIGGERED_MACRO = True
            elif arg == "-status_indicator":
                self.STATUS_INDICATOR = True
                print(f"set indicator to: {self.STATUS_INDICATOR}")
            elif arg_value(arg, '-status_indicator') is not None:
                self.STATUS_INDICATOR = True
                self.STATUS_INDICATOR_SIZE = int(arg_value(arg, '-status_indicator'))
                print(f"set indicator size to: {self.STATUS_INDICATOR_SIZE}")
            elif arg == "-crosshair":
                self.CROSSHAIR_ENABLED = True
                print(f"set crosshair to: {self.CROSSHAIR_ENABLED}")
            elif arg_value(arg, '-crosshair') is not None:
                self.CROSSHAIR_ENABLED = True
                try:
                    x, y = arg_value(arg, '-crosshair').strip().replace(' ', '').split(',')
                    self.CROSSHAIR_DELTA_X, self.CROSSHAIR_DELTA_Y = int(x), int(y)
                    print(f"set crosshair delta is set to: {self.CROSSHAIR_DELTA_X}, {self.CROSSHAIR_DELTA_Y}")
                except Exception:
                    print("invalid crosshair delta - needs to be two numbers, e.g. -crosshair=5,-10")
            elif prefix_matches(arg, '-always_active'):
                self.ALWAYS_ACTIVE = True
            elif arg == "-no_warnings":
                # consumed by the config validator (per-scope warning
                # suppression, U290T) - nothing to do at runtime
                pass
            elif arg == "-default_off":
                # (#403) approved proposal 2026-10-31 part (b): drop the default
                # GROUP LINES for the applied focus group only - start arguments
                # stay merged and -always_active (focus-loss behavior) is
                # untouched; DEFAULT_OFF resets on every focus change like
                # ALWAYS_ACTIVE (reset_global_variable_changes)
                self.DEFAULT_OFF = True
                print(f"set default group lines off for this focus group: {self.DEFAULT_OFF}")
            elif arg == "-default_on":
                # (#423) retired the same day it shipped (U418/321a893):
                # settled model (maintainer 2026-11-11, TODO #418 resolution) -
                # the default group IS merged into every focus group and
                # -default_off is the ONLY opt-out, so -default_on does
                # NOTHING here (the config validator surfaces the same
                # retirement WARNING for config sections)
                print("-default_on is retired - the default group is always "
                      "added; use -default_off to opt out")
            elif arg == "-default_always_active":
                # focus-section arg: the default groups stay active whenever
                # this group's args are applied (ALWAYS_ACTIVE resets on
                # every focus change, reset_global_variable_changes)
                self.ALWAYS_ACTIVE = True
                print(f"set default always active to: {self.ALWAYS_ACTIVE}")
            elif prefix_matches(arg, '-tray_icon'):
                self.TRAY_ICON = True
            elif prefix_matches(arg, '-hide_cmd_window'):
                self.CMD_WINDOW_HIDDEN = True
            elif arg_value(arg, '-save_dir') is not None:
                self.SAVE_DIR = arg_value(arg, '-save_dir').strip()
                print(f"set save directory to: {self.SAVE_DIR}")
            elif arg_value(arg, '-backup_root_dir') is not None:
                self.BACKUP_ROOT_DIR = arg_value(arg, '-backup_root_dir').strip()
                print(f"set backup root directory to: {self.BACKUP_ROOT_DIR}")
            else:
                logger_config.warning(f"unknown start argument: {original_arg}")

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
        if vk_code > 0:
            self._real_key_press_states_dict[vk_code] = is_press
            # union: a real release must not clear the all state while the
            # simulated press of the same key is still active
            self._all_key_press_states_dict[vk_code] = is_press or self._simulated_key_press_states_dict.get(vk_code, False)

    def get_simulated_key_press_state(self, vk_code):
        try:
            return self._simulated_key_press_states_dict[vk_code]
        except KeyError:
            self.set_simulated_key_press_state(vk_code, False)
            return False
    def set_simulated_key_press_state(self, vk_code, is_press):
        if vk_code > 0:
            self._simulated_key_press_states_dict[vk_code] = is_press
            # union: a simulated release must not clear the all state while the
            # real press of the same key is still active
            self._all_key_press_states_dict[vk_code] = is_press or self._real_key_press_states_dict.get(vk_code, False)

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
        # F-A7 (ladder R2, shadow for toggles): the latch IS the ownership
        # record of a latched-down key - engaged opens a long-lived press
        # ticket, released closes it. Release BEHAVIOR is byte-identical (this
        # adds no send); it makes toggle debt visible and countable.
        # source_kind='toggle', source_id='toggle:<vk>' - the latch state has no
        # alias name, the vk is the toggle key's identity.
        if is_press:
            opener = getattr(self._fst, 'open_press_ticket', None)
            if opener is not None:
                opener(vk_code, SOURCE_TOGGLE, f'toggle:{vk_code}')
        else:
            closer = getattr(self._fst, 'close_hold_ticket', None)
            if closer is not None:
                closer(vk_code, SOURCE_TOGGLE)

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
            logger_flow.debug(f"-- toggle state for {key_event} updated")
            self.set_toggle_state(vk_code, is_press)

    def stop_all_repeating_keys(self):
        for key_event in self._fst.output_manager.repeat_thread_dict.keys():
            repeat_task, _handle = self._fst.output_manager.repeat_thread_dict[key_event]
            if not _handle.done():
                repeat_task.cancel_playback()
                _handle.cancel()
            # F-A7 (ladder R2): the repeat lane drives a macro playback of the
            # same alias, and cancelling the repeat task does NOT cancel that
            # playback's physical debt. Drain it here, before returning, so a
            # repeat cancel cannot leave a key held (research (D) R2).
            drainer = getattr(self._fst, 'drain_macro_debt', None)
            if drainer is not None:
                drainer(alias=repeat_task.alias_name, context='repeat_cancel')

    def release_all_toggles(self, drain_id=None):
        for vk_code in self._toggle_states_dict_keys:
            # F-A7: the toggle latch drain gets its own emission ticket
            # (source_kind 'toggle'); the ownership ticket the engage opened is
            # closed by the set_toggle_state(False) below. Sends unchanged.
            ticket = self._open_release_ticket(vk_code, SOURCE_TOGGLE,
                                               drain_id, 'toggle_sweep')
            self._fst.output_manager.send_key_event(Key_Event(vk_code, False))
            self._close_ticket(ticket)
            self.set_toggle_state(vk_code, False)

    def reset_all_lists(self):
        self._pressed_keys = set()
        self._real_key_press_states_dict = {}
        self._simulated_key_press_states_dict = {}
        self._all_key_press_states_dict = {}
        self._toggle_states_dict = {}
        self._toggle_states_dict_keys = []




###XXX 241014-1926 changed

    def _open_release_ticket(self, vk_code, source_kind, drain_id, sweep):
        '''F-A7 (L1): build the ticket's source_id from the CALL's attribution
        (`<drain_id>.<sweep>`, or the bare sweep when the caller has no leg
        label) and hand it to the keyboard's ledger. The attribution arrives as
        a parameter - nothing reads shared state, so two drain legs running on
        different threads cannot swap labels. A stand-in keyboard without the
        helper (tests) returns None and the release proceeds unchanged.'''
        opener = getattr(self._fst, 'open_release_ticket', None)
        if opener is None:
            return None
        source = sweep if not drain_id else f"{drain_id}.{sweep}"
        return opener(vk_code, source_kind, source)

    def _close_ticket(self, ticket):
        if ticket is None:
            return None
        closer = getattr(self._fst, 'close_ticket', None)
        if closer is None:
            return None
        return closer(ticket)

    def release_all_currently_pressed_simulated_keys(self, drain_id=None):
        # print(f"pressed keys on release: {self._pressed_keys}")

        ###XXX 241009-1049 do not release real keys, 241009-1100 now again release all keys - works better
        logger_state.debug("releasing all keys")

        # release remaining simulated keys
        for vk_code, is_press in self._simulated_key_press_states_dict.items():
        # for vk_code, is_press in self._all_key_press_states_dict.items():
            if is_press:
                # only reset simulated keys
                logger_state.debug(f"released key: {vk_code}")
                # F-A6 (R1 as scoped for this unit): shadow-record the release
                # this brute sweep emits. Same sends, same order, same count -
                # the sweep semantics are unchanged (R2+ is where a drain asks
                # the ledger for the list instead of inferring it).
                ticket = self._open_release_ticket(vk_code, SOURCE_DRAIN,
                                                   drain_id, 'simulated_sweep')
                self._fst.output_manager.send_key_event(Key_Event(vk_code, False))
                self._close_ticket(ticket)

        # self.release_all_modifier_keys()

        self.release_all_toggles(drain_id)
        self.reset_states_dicts()

    def release_all_modifier_keys(self):
        # first release all modifier keys
        for vk_code in Input_State_Manager.ALL_MODIFIER_KEYS:
            if vk_code in self.pressed_keys:
                logger_state.debug(f"released pressed modifier key: {vk_code}")
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
        if is_any_debug_active():
            print("cli not cleared - debug logging active")
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
                toggle_flow()
            elif choice == '1':
                startfile(self._fst.config_manager.file_name)
            elif choice == '2':
                try:
                    self._fst.arg_manager.reset_global_variable_changes()
                    self._fst.apply_start_args_by_focus_name(self._fst.focus_manager.FOCUS_APP_NAME)
                    self._fst.apply_focus_groups(self._fst.focus_manager.FOCUS_APP_NAME)
                except ConfigError as error:
                    print(f"[FST] {error}")
            elif choice == '3':
                self._fst.arg_manager.PRINT_VK_CODES = True
                break
            elif choice == '4':
                # F-A5 (Item 3): no bare exit() inside the loop task. A
                # SystemExit raised here was swallowed by no one and unwound
                # the asyncio task weirdly (the half-dead process of Item 3);
                # the menu now orders the stop (the flag every observer reads)
                # and POSTS STOPPING into the loop's machine, then returns
                # 'stop' so the caller does not start the listeners it was
                # about to start (F-A5 reviewer P0).
                self._fst.arg_manager.STOPPED = True
                self._fst.post_lifecycle(Lifecycle_State.STOPPING,
                                         'menu choice 4 - End the program')
                return 'stop'
            elif choice == '':
                break
            else:
                text = "Error: Invalid input."
                invalid_input = True

        # a start choice ('' or '3'): the caller continues into the listeners
        return 'start'

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

# ---------------------------------------------------------------------------
# F-B4 (review Item 13): the one-shot status dump - THE bug-report artifact.
# ---------------------------------------------------------------------------

# The effective start arguments the artifact reports, in render order: the
# post-validation values the pump actually runs on (Argument_Manager instance
# attributes, class-attribute fallback via getattr). A bug report must say what
# the filter was told to do, so the list is fixed (a stable public surface of
# the artifact - review Item 13's "small public surface to keep stable").
STATUS_ARG_NAMES = (
    'WIN32_FILTER_PAUSED', 'MANUAL_PAUSED', 'STOPPED', 'MENU_ENABLED',
    'CONTROLS_ENABLED', 'PRINT_VK_CODES', 'EXEC_ONLY_ONE_TRIGGERED_MACRO',
    'ALWAYS_ACTIVE', 'DEFAULT_OFF', 'CMD_WINDOW_HIDDEN',
    'TRAY_ICON', 'STATUS_INDICATOR', 'STATUS_INDICATOR_SIZE',
    'CROSSHAIR_ENABLED', 'CROSSHAIR_DELTA_X', 'CROSSHAIR_DELTA_Y',
    'ACT_DELAY', 'ACT_MIN_DELAY_IN_MS', 'ACT_MAX_DELAY_IN_MS',
    'ACT_CROSSOVER', 'ACT_CROSSOVER_PROPABILITY_IN_PERCENT',
    'MACRO_MIN_DELAY_IN_MS', 'MACRO_MAX_DELAY_IN_MS',
    'SAVE_DIR', 'BACKUP_ROOT_DIR',
)


def _status_text(value):
    '''A name or user-text field for the artifact: ASCII-escaped (a non-ASCII
    focus name or source id must not mangle a reporter\'s paste), None
    collapsed to '-', everything stringified through ascii(). Numeric fields
    and the path lines render raw on purpose - a path has to stay copy-paste
    able, and a vk or seq has to stay greppable.'''
    if value is None:
        return '-'
    return ascii(str(value))


def _status_num(value):
    '''An int-or-None field (a vk code): '-' instead of Python\'s None.'''
    return '-' if value is None else value


class Status_Dump():
    '''F-B4 (review Item 13): render + write one whole snapshot of what the
    filter is IN right now - the single artifact a bug report attaches.

    Sections, in order: effective args (post-validation) | lifecycle state
    (F-A5) | focus scope | group counts | tap / hold / toggle states (read
    from the F-B1 typed values, never from an object repr) | the ticket
    ledger (F-A6/A7/A8) with the [StuckKeyWatch] aging detector | paths.

    The file (fst_status.log, same CWD-relative directory convention as
    fst.log) is OVERWRITTEN, atomically: render into a temp sibling, then one
    os.replace. A reporter therefore never attaches a half-written file, and
    a failed overwrite never destroys the artifact of the last good moment.

    THREAD RULE (Item 13's named downside, answered by F-A4/F-A5): the render
    reads live containers, so it runs on the asyncio loop thread - the lane
    F-A4 built for the reload leg (FST_Keyboard.request_status_dump routes
    through _run_on_loop_or_inline). The hook pump has NO dump trigger and no
    dump path: a dump is file I/O, and a LL-hook pump that blocks past
    LowLevelHooksTimeout loses the hook silently.

    READ RULE (F-A3 discipline): bind the generation once, copy every live
    container with list()/dict() before iterating, mutate nothing. The reads
    tolerate a concurrent swap or append exactly like the pump\'s own reads.

    A section that raises renders `unavailable: <Type>: <message>` and the
    rest still lands: the artifact exists for the broken case most of all.
    Only the write itself is allowed to raise - the caller names it (the F-A4
    leg failure rule: a failed leg is named, never a silent scheduled-ok).'''

    HEADER = '# FST status dump v1'
    FOOTER = '# end of FST status dump v1'

    def __init__(self, fst_keyboard):
        self._fst = fst_keyboard

    # -- the two entry points ------------------------------------------------

    def render(self, reason='startup', now=None):
        '''The whole artifact as one string - no ARTIFACT file I/O (the
        aging detector below does log, so a re-render re-emits a live
        warning; only `write` touches fst_status.log). `now` is the
        monotonic anchor the ledger ages are measured against - pass it in a
        test to fake the clock (no sleeps in the suite); None reads the
        clock once, so every ticket in this render ages from ONE instant.'''
        now = monotonic() if now is None else now
        lines = [self.HEADER]
        lines += self._header_lines(reason)
        lines += self._section('Effective args (post-validation)',
                               self._args_lines)
        lines += self._section('Lifecycle', self._lifecycle_lines)
        lines += self._section('Focus scope', self._focus_lines)
        lines += self._section('Group counts', self._count_lines)
        lines += self._section('Tap hold toggle', self._tap_lines)
        lines += self._section('Ledger', lambda: self._ledger_lines(now))
        lines += self._section('Paths', self._path_lines)
        lines.append(self.FOOTER)
        return '\n'.join(lines) + '\n'

    def write(self, reason='startup', now=None):
        '''Render, then overwrite the artifact atomically. Returns the
        absolute path written. Raises OSError when the file could not be
        replaced (a locked or unwritable directory) - after the previous
        artifact was left intact, which is the point of the temp + replace.'''
        text = self.render(reason=reason, now=now)
        target = STATUS_FILE
        tmp = f'{target}.tmp-{os.getpid()}'
        try:
            with open(tmp, 'w', encoding='utf-8', newline='\n') as handle:
                handle.write(text)
            os.replace(tmp, target)
        except OSError:
            try:
                os.remove(tmp)
            except OSError:
                pass  # nothing else to do with a temp we cannot delete
            raise
        path = os.path.abspath(target)
        logger.info(f"[StatusDump] wrote={path} reason={reason} "
                    f"pid={os.getpid()}")
        return path

    # -- header / section plumbing ------------------------------------------

    def _header_lines(self, reason):
        # timestamp + pid identify WHICH run wrote the file; the thread names
        # which leg wrote it - the F-B4 thread contract (loop thread, never
        # the pump) is then visible in the artifact itself
        return [
            f"written={datetime.datetime.now().isoformat(timespec='microseconds')}",
            f"pid={os.getpid()}",
            f"thread={ascii(threading.current_thread().name)}",
            f"reason={_status_text(reason)}",
        ]

    def _section(self, header, builder):
        lines = ['', f'## {header}']
        try:
            lines += builder()
        except Exception as error:
            # named, not silent: an artifact that hides a broken section
            # teaches the reporter the wrong thing
            lines.append(f"unavailable: {type(error).__name__}: "
                         f"{ascii(str(error))}")
        return lines

    # -- sections -------------------------------------------------------------

    def _args_lines(self):
        am = self._fst.arg_manager
        lines = [f"{name.lower()}={getattr(am, name, None)}"
                 for name in STATUS_ARG_NAMES]
        lines.append(f"sys_start_args={ascii(list(am.sys_start_args))}")
        # the observability state belongs in the artifact too: a report must
        # say whether the flow log / drop watch were even on, and which level
        # the root logger actually answers at (an unconfigured tree answers at
        # the effective level, NOT at the unset level 0)
        lines.append("log_root_level="
                     f"{logging.getLevelName(logger.getEffectiveLevel())}")
        lines.append(f"flow_enabled={is_flow_enabled()}")
        lines.append(f"drop_watch_enabled={is_drop_watch_enabled()}")
        lines.append(f"debug_numpad={CONSTANTS.DEBUG_NUMPAD}")
        return lines

    def _lifecycle_lines(self):
        machine = getattr(self._fst, '_lifecycle', None)
        state = getattr(machine, 'state', None)
        value = getattr(state, 'value', None)
        return [f"state={value if value is not None else 'not-attached'}"]

    def _focus_lines(self):
        fm = self._fst.focus_manager
        declared = sorted(str(name)
                          for name in list(fm.multi_focus_dict_keys))
        active = str(fm.FOCUS_APP_NAME)
        scope = (self._fst._scope_of_focus_name(active) if active else '-')
        return [
            f"focus_active={bool(fm.focus_active)}",
            f"focus_app_name={_status_text(active or None)}",
            f"scope={_status_text(scope)}",
            f"declared_scopes={len(declared)}",
            f"declared_scope_names={ascii(declared)}",
        ]

    def _count_lines(self):
        rt = self._runtime()
        return [
            f"gen_id={rt.gen_id}",
            f"tap_groups={len(rt.tap_groups)}",
            f"rebinds={len(rt.rebinds)}",
            f"macros={len(rt.macros)}",
            f"macro_sequences={len(rt.macro_sequence_alias_list)}",
            f"key_groups={len(rt.key_group_by_alias)}",
            f"triggers={len(rt.all_trigger_events)}",
            f"rebind_triggers={len(rt.rebind_triggers)}",
            f"macro_triggers={len(rt.macro_triggers)}",
            f"tap_owned_vks={len(rt.tap_owner_by_vk)}",
        ]

    def _tap_lines(self):
        # F-B1 typed values only: vk codes and latched bools. No object repr
        # ever reaches this artifact - Item 13 filed the alt+num5 repr dump
        # as the thing a bug report must not have to read.
        rt = self._runtime()
        lines = []
        for index, group in enumerate(list(rt.tap_groups)):
            states = dict(getattr(group, 'states', None) or {})
            # str-keyed sort: a synthetic group may carry label members (F-B1
            # allows any hashable), and the artifact must render, not raise
            states_text = ','.join(f"{vk}:{int(bool(state))}"
                                   for vk, state
                                   in sorted(states.items(),
                                             key=lambda kv: str(kv[0])))
            lines.append(
                f"tap[{index}] alias={_status_text(getattr(group, 'alias', '') or None)} "
                f"keys={','.join(str(vk) for vk in group.get_vk_codes())} "
                f"states={states_text or '-'} "
                f"last_pressed={_status_num(getattr(group, 'last_key_pressed', None))} "
                f"hold_send={_status_num(getattr(group, 'last_key_send', None))} "
                f"active_key={_status_num(getattr(group, 'active_key', None))}")
        if not lines:
            lines.append('tap_groups: none')
        sm = self._fst.state_manager
        toggles = dict(getattr(sm, '_toggle_states_dict', None) or {})
        latched = sorted((vk for vk, on in toggles.items() if on), key=str)
        lines.append(f"toggle_tracked={len(toggles)}")
        lines.append(f"toggle_latched={','.join(str(vk) for vk in latched) or '-'}")
        held = dict(getattr(self._fst, '_macro_held', None) or {})
        lines.append(f"macro_holds={len(held)}")
        for alias in sorted(str(a) for a in held):
            # the inner dict is live too (the READ RULE): copy before sorting
            vks = ','.join(str(vk) for vk in sorted(dict(held[alias]), key=str))
            lines.append(f"macro_hold alias={_status_text(alias)} vks={vks}")
        return lines

    def _ledger_lines(self, now):
        ledger = getattr(self._fst, '_ledger', None)
        if ledger is None:
            return ['ledger: none']
        # ONE snapshot scan serves every number in this section: open_tickets()
        # plus counts() would be two scans, and a ticket whose state flipped in
        # between could make open=, counts_state= and the rows disagree - the
        # exact one-scan rule open_tickets documents (F-A6 reviewer P2-3 family)
        scanned = ledger.tickets()
        counts = {state: 0 for state in TICKET_STATES}
        for ticket in scanned:
            counts[ticket.state] = counts.get(ticket.state, 0) + 1
        open_now = [t for t in scanned if t.state != TICKET_COMPLETED]
        threshold = CONSTANTS.STUCK_TICKET_MS
        by_source = {}
        for ticket in open_now:
            by_source[ticket.source_kind] = by_source.get(ticket.source_kind,
                                                          0) + 1
        lines = [
            f"high_seq={ledger.high_seq()}",
            f"total={len(scanned)}",
            f"open={len(open_now)}",
            'counts_state=' + ' '.join(f"{state}={counts.get(state, 0)}"
                                       for state in sorted(counts)),
            'counts_open_by_source=' + ' '.join(
                f"{kind}={by_source[kind]}" for kind in sorted(by_source)),
            'open_tickets seq vk kind state source_kind source_id gen mouse age_ms',
        ]
        stuck = []
        for ticket in sorted(open_now, key=lambda t: t.seq):
            age_ms = int((now - ticket.created_at) * 1000)
            lines.append(f"  {ticket.seq} {ticket.vk} {ticket.kind} "
                         f"{ticket.state} {ticket.source_kind} "
                         f"{_status_text(ticket.source_id)} {ticket.gen_id} "
                         f"{int(bool(ticket.is_mouse))} {age_ms}")
            if age_ms > threshold:
                stuck.append((ticket, age_ms))
        if len(open_now) == 0:
            lines.append('  none')
        # the named aging detector of the design report (TOP-3 risk 3): debt
        # that never closes must be nameable without reading the table by eye
        for ticket, age_ms in stuck:
            line = (f"[StuckKeyWatch] seq={ticket.seq} vk={ticket.vk} "
                    f"kind={ticket.kind} state={ticket.state} "
                    f"source_kind={ticket.source_kind} "
                    f"source_id={_status_text(ticket.source_id)} "
                    f"gen={ticket.gen_id} age_ms={age_ms} "
                    f"threshold_ms={threshold}")
            lines.append(line)
            logger.warning(line)
        return lines

    def _path_lines(self):
        lines = [
            f"status_file={os.path.abspath(STATUS_FILE)}",
            f"log_file={os.path.abspath(MAIN_LOG_FILE)}",
            f"flow_log={os.path.abspath(FLOW_LOG_FILE)}",
            f"flow_enabled={is_flow_enabled()}",
            f"drop_log={os.path.abspath(DROP_LOG_FILE)}",
            f"drop_watch_enabled={is_drop_watch_enabled()}",
            f"config_file={os.path.abspath(self._fst.config_manager.file_name)}",
            f"cwd={ascii(os.getcwd())}",
        ]
        return lines

    # -- internals -----------------------------------------------------------

    def _runtime(self):
        '''ONE bind of the live generation (F-A3): the whole artifact is
        consistent to a single generation, never a torn pair of them.'''
        return self._fst._runtime

