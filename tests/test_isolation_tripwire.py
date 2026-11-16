"""F-B7 (preventive hardening): the conftest OS-input tripwire fires.

Pins:
- ctypes.windll.user32.SendInput (the choke point of every real key/mouse
  injection) raises TestIsolationViolation instead of emitting input.
- a REAL pynput keyboard Controller press (the Output_Manager construction
  shape, fst_manager.py creates real Controllers) raises at the pynput
  backend SendInput global - no OS event leaves the process.
- a REAL pynput mouse Controller position set trips the class-bound
  SetCursorPos (a class attribute, patched with a static wrapper).
- the allow_real_input marker reaches the real primitive, proven with a
  zero-event call (SendInput(0, NULL, 0) injects nothing, returns 0).
"""
import ctypes

import pytest
from pynput import keyboard as pynput_keyboard
from pynput import mouse as pynput_mouse
from pynput.keyboard import KeyCode

from conftest import TestIsolationViolation

VK_A = 0x41


def test_tripwire_fires_on_real_ctypes_sendinput():
    '''user32.SendInput raises TestIsolationViolation (never reaches OS).'''
    with pytest.raises(TestIsolationViolation) as exc:
        ctypes.windll.user32.SendInput(1, None, 0)
    msg = str(exc.value)
    assert 'ctypes.windll.user32.SendInput' in msg
    assert 'Call stack:' in msg


def test_tripwire_fires_on_real_pynput_controller_press():
    '''A real Controller.press trips at the pynput backend SendInput.'''
    controller = pynput_keyboard.Controller()
    with pytest.raises(TestIsolationViolation) as exc:
        controller.press(KeyCode.from_vk(VK_A))
    assert 'pynput.keyboard._win32.SendInput' in str(exc.value)


def test_tripwire_fires_on_real_mouse_position_set():
    '''A real mouse Controller position set trips the class-bound SetCursorPos.'''
    controller = pynput_mouse.Controller()
    with pytest.raises(TestIsolationViolation) as exc:
        controller.position = (0, 0)
    assert 'SetCursorPos' in str(exc.value)


@pytest.mark.allow_real_input
def test_allow_real_input_marker_reaches_real_primitive():
    '''Allow-listed test hits the REAL primitive; 0 inputs = no desktop event.'''
    assert ctypes.windll.user32.SendInput(0, None, 0) == 0
