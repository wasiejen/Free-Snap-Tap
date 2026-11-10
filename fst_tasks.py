'''
Free-Snap-Tap V1.3.0
last updated: 241105-2004
'''

import asyncio
import pygetwindow as gw
import re #regular expression

import logging

from fst_data_types import FOCUS_NAME_ILLEGAL
# the macro-area logger of the FST logger tree (same cached instance as
# fst_manager's logger_macro - no circular import, fst_manager imports us)
logger_macro = logging.getLogger('fst.macro')


class Macro_Repeat_Task:
    '''
    repeatatly execute a key event based on a timer
    '''
    def __init__(self, alias_name, repeat_time, with_overlay,  fst_keyboard):
        self._fst = fst_keyboard
        self.alias_name = alias_name
        self.repeat_time = repeat_time
        self.with_overlay = with_overlay
        self.reset_event = asyncio.Event()
        self.stop_event = asyncio.Event()
        self._handle = None

    async def run(self):
        logger_macro.debug(f"Macro_Repeat_Task started for {self.alias_name} with repeat time {self.repeat_time} ms")
        print(f"START REPEAT: {self.alias_name} with interval of {self.repeat_time} ms")

        while not self.stop_event.is_set():
            if self.with_overlay:
                self._fst.timer_callback(f"{self.alias_name}", self.repeat_time // 1000, 12, "rgba(40, 150, 40, 200)", "white")

            self._handle = self._fst.start_macro_playback_repeat(self.alias_name, self._fst.key_group_by_alias[self.alias_name])
            try:
                await asyncio.wait_for(self.reset_event.wait(), timeout=self.repeat_time / 1000)
            except asyncio.TimeoutError:
                pass
            if self.reset_event.is_set():
                print(f"Resetting repeat task for {self.alias_name}")
                self.reset_event.clear()

    def cancel_playback(self):
        if self.with_overlay:
            self._fst.remove_callback(f"{self.alias_name}")
        self.stop_event.set()
        self._handle.cancel()

    def reset(self):
        if self.with_overlay:
            self._fst.remove_callback(f"{self.alias_name}")
        self.reset_event.set()
        self._handle.cancel()

class Focus_Task:
    '''
    Async Task for observing the active window and pause toggle the evaluation of key events
    can be manually overwritten by Controls on ALT+DEL
    '''

    def __init__(self, fst_keyboard):#, paused_lock):
        self._stop = False
        self._fst = fst_keyboard
        self.FOCUS_THREAD_PAUSED = False

    async def run(self):
        last_active_window = ''
        found_valid_focus_name = False
        manually_paused = False
        default_active = False
        active_window = "None"
        old_focus_name = "None"
        focus_name_changed = False
        while not self._stop:
            try:
                active_window = gw.getActiveWindow().title
            except AttributeError:
                active_window = "None"
            # when windows name changed
            if active_window != last_active_window or manually_paused:
                if active_window != last_active_window:
                    last_active_window = active_window
                # sanitize the window title with the SAME rule the config side
                # uses (fst_data_types.FOCUS_NAME_ILLEGAL, #399): matching is
                # cleaned_title.find(config_name), so a different pattern here
                # silently disables every focus group whose name keeps a legal
                # char this strip would remove
                active_window = re.sub(FOCUS_NAME_ILLEGAL, '', active_window)
                # if not one of my own spawned windows
                if active_window not in ["FST Status Indicator", "FST Crosshair", "FST_Overlay"]:
                    if not self.FOCUS_THREAD_PAUSED and not self._fst.arg_manager.MANUAL_PAUSED:
                        if manually_paused:
                            manually_paused = False
                        found_valid_focus_name = False
                        focus_name_changed = False
                        # check if it is one of the focus groups
                        for focus_name in self._fst.focus_manager.multi_focus_dict_keys:
                            if active_window.find(focus_name) >= 0:
                                found_valid_focus_name = True
                                # save previous focus app name
                                old_focus_name = self._fst.focus_manager.FOCUS_APP_NAME
                                if old_focus_name != focus_name:
                                    # print(f"> Focus changed from '{old_focus_name}' to '{focus_name}'")
                                    self._fst.focus_manager.FOCUS_APP_NAME = focus_name
                                    focus_name_changed = True
                                break
                        if found_valid_focus_name and focus_name_changed:
                            try:
                                default_active = False
                                self._fst.update_args_and_groups(focus_name, startup=False)
                                self._fst.cli_menu.update_group_display()
                                self._fst.cli_menu.display_focus_found(active_window)
                                self._fst.arg_manager.WIN32_FILTER_PAUSED = False
                            except Exception as error:
                                print('--- reloading of groups files failed - not resumed, still paused ---')
                                print(f" -> aborted reloading due to: {error}")
                            else:
                                # activation toast names the group (U290T); OUT of
                                # the reload handler (U290R): a toast failure is not
                                # a group-reload failure - report it as its own cause.
                                # U330 ask 3: a SILENT focus group (-no_warnings)
                                # is skipped - its warnings are suppressed, so
                                # there is nothing for the toast to show. The silent
                                # guard rides the SAME handler (U330 reviewer P2):
                                # a guard raise names a toast failure, never kills
                                # the focus poll loop
                                try:
                                    if not self._fst.is_silent_focus_group(focus_name):
                                        self._fst.toast_group_activated(focus_name)
                                except Exception as error:
                                    print(f" -> focus activation toast failed: {error}")
                        elif found_valid_focus_name and not focus_name_changed:
                            pass
                        # if not found a focus group set input filter to paused
                        else:
                            self._fst.focus_manager.FOCUS_APP_NAME = ''
                            if self._fst.arg_manager.ALWAYS_ACTIVE:
                                if not default_active:
                                    default_active = True
                                    self._fst.update_args_and_groups(startup=False)  # U330 ask 4: scoped report leg
                                    self._fst.cli_menu.update_group_display()
                                    self._fst.cli_menu.display_default_active()
                                    self._fst.arg_manager.WIN32_FILTER_PAUSED = False
                                    # default groups activated (U290T); a toast
                                    # failure must not kill the focus poll loop
                                    # (U290R, same defect class as the focus branch)
                                    # U330 ask 3: a SILENT default scope
                                    # (-no_warnings in the default section) skips
                                    # the activation toast; the silent guard rides
                                    # the same handler (U330 reviewer P2)
                                    try:
                                        if not self._fst.is_silent_focus_group(''):
                                            self._fst.toast_group_activated('default groups')
                                    except Exception as error:
                                        print(f" -> focus activation toast failed: {error}")
                            else:
                                if self._fst.arg_manager.WIN32_FILTER_PAUSED:
                                    print(f"> Active Window: {active_window}")
                                    pass
                                else:
                                    self._fst.update_args_and_groups(startup=False)  # U330 ask 4: scoped report leg
                                    self._fst.cli_menu.update_group_display()
                                    self._fst.cli_menu.display_focus_not_found()
                                    ###XXX give chance to the controller to release the pressed keys
                                    await asyncio.sleep(0.2)
                                    self._fst.arg_manager.WIN32_FILTER_PAUSED = True
                                    print(f"> Active Window: {active_window}")
                    else:
                        manually_paused = True
            await asyncio.sleep(0.25)

    def pause(self):
        # with self.paused_lock:
        self.FOCUS_THREAD_PAUSED = True

    def restart(self):
        if self.FOCUS_THREAD_PAUSED:
            # with self.paused_lock:
            self.FOCUS_THREAD_PAUSED = False
            self._fst.arg_manager.MANUAL_PAUSED = False

    def stop(self):
        self._stop = True
