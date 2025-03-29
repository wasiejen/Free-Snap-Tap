'''
Free-Snap-Tap V1.1.3
last updated: 241015-1041
'''
# Dictionary mapping strings and keys to their VK codes
# just add your own key strings, identify the vk_codes by using the "3. print virtual key codes to identify keys." of the menu
# and write them into the dictionary. It is no problem if there are multiple key_strings for the same vk_code.
vk_codes_dict = {
    # mouse keys
    'mouse_left': 1,   'left_mouse': 1,   'ml': 1, 'lm': 1, 
    'mouse_right': 2,  'right_mouse': 2,  'mr': 2, 'rm': 2, 
    'mouse_middle': 3, 'middle_mouse': 3, 'mm': 3, 
    'mouse_x1': 4, 'mx1' : 4,
    'mouse_x2': 5, 'mx2' : 5,
    'scroll_vertical' : 6, 'scroll_vert' : 6, 'vert_scroll' : 6,
    'scroll_horizontal' : 7, 'scroll_hori' : 7, 'hori_scroll' : 7,
    
    # letter keys
    'A': 65, 'a': 65, 
    'B': 66, 'b': 66, 
    'C': 67, 'c': 67, 
    'D': 68, 'd': 68, 
    'E': 69, 'e': 69, 
    'F': 70, 'f': 70, 
    'G': 71, 'g': 71,
    'H': 72, 'h': 72, 
    'I': 73, 'i': 73, 
    'J': 74, 'j': 74, 
    'K': 75, 'k': 75, 
    'L': 76, 'l': 76, 
    'M': 77, 'm': 77, 
    'N': 78, 'n': 78,
    'O': 79, 'o': 79, 
    'P': 80, 'p': 80, 
    'Q': 81, 'q': 81, 
    'R': 82, 'r': 82, 
    'S': 83, 's': 83, 
    'T': 84, 't': 84, 
    'U': 85, 'u': 85,
    'V': 86, 'v': 86, 
    'W': 87, 'w': 87, 
    'X': 88, 'x': 88, 
    'Y': 89, 'y': 89, 
    'Z': 90, 'z': 90,
    
    # number keys
    '0': 48, 
    '1': 49, 
    '2': 50, 
    '3': 51, 
    '4': 52, 
    '5': 53, 
    '6': 54,
    '7': 55, 
    '8': 56, 
    '9': 57,

    # F keys
    'F1': 112,  'f1': 112, 
    'F2': 113,  'f2': 113, 
    'F3': 114,  'f3': 114, 
    'F4': 115,  'f4': 115, 
    'F5': 116,  'f5': 116, 
    'F6': 117,  'f6': 117,
    'F7': 118,  'f7': 118, 
    'F8': 119,  'f8': 119, 
    'F9': 120,  'f9': 120, 
    'F10': 121, 'f10': 121,
    'F11': 122, 'f11': 122, 
    'F12': 123, 'f12': 123,
    'F13': 124, 'f13': 124,
    'F14': 125, 'f14': 125,
    'F15': 126, 'f15': 126,
    'F16': 127, 'f16': 127,
    'F17': 128, 'f17': 128,
    'F18': 129, 'f18': 129,
    'F19': 130, 'f19': 130,
    'F20': 131, 'f20': 131,
    'F21': 132, 'f21': 132,
    'F22': 133, 'f22': 133,
    'F23': 134, 'f23': 134,
    'F24': 135, 'f24': 135,

    # numpad keys
    'num0': 96, 
    'num1': 97, 
    'num2': 98, 
    'num3': 99, 
    'num4': 100,
    'num5': 101, 
    'num6': 102, 
    'num7': 103, 
    'num8': 104, 
    'num9': 105,
    'multiply': 106, 
    'add': 107, 
    'separator': 108, 
    'subtract': 109,
    'decimal': 110, 
    'divide': 111,
    
    # function keys
    'backspace': 8, 
    'tab': 9, 
    'enter': 13, 
    'PAUSED': 19, 
    'caps_lock': 20, 
    'esc': 27, 
    'space': 32,
    'page_up': 33, 
    'page_down': 34, 
    'end': 35, 
    'home': 36,
    'left_windows': 91, 
    'right_windows': 92, 
    'applications': 93,
    'sleep': 95, 
    'num_lock': 144, 
    'scroll_lock': 145,
    'left_shift': 160, 'shift': 160,
    'right_shift': 161, 
    'left_control': 162, 'ctrl': 162,
    'right_control': 163, 
    'left_menu': 164,  'alt': 164, 
    'right_menu': 165,
    
    # direction keys
    'left_arrow': 37, 
    'up_arrow': 38, 
    'right_arrow': 39, 
    'down_arrow': 40,
    
    # menu keys
    'select': 41, 
    'print': 42, 
    'execute': 43, 
    'print_screen': 44,
    'insert': 45, 
    'delete': 46, 
    'help': 47,

    # multimedia keys
    'browser_back': 166, 
    'browser_forward': 167, 
    'browser_refresh': 168,
    'browser_stop': 169, 
    'browser_search': 170, 
    'browser_favorites': 171,
    'browser_home': 172, 
    'volume_mute': 173, 
    'volume_down': 174,
    'volume_up': 175, 
    'media_next_track': 176, 
    'media_prev_track': 177,
    'media_stop': 178, 
    'media_play_PAUSED': 179, 
    'launch_mail': 180,
    'launch_media_select': 181, 
    'launch_app1': 182, 
    'launch_app2': 183,
    
    # symbols
    'semicolon': 186, 
    'plus': 187, '+': 187,
    'comma': 188, ',': 188, 
    'minus': 189, '-': 189, 
    'period': 190, '.': 190,
    'slash': 191, 'hash': 191, 
    'grave_accent': 192,
    'open_bracket': 219, 
    'backslash': 220, 
    'close_bracket': 221,
    'quote': 222, 
    
    # oem keys
    'oem_8': 223, 
    'oem_102': 226,
    'process_key': 229, 
    'packet': 231, 
    'attn': 246, 
    'crsel': 247,
    'exsel': 248, 
    'erase_eof': 249, 
    'play': 250, 
    'zoom': 251,
    'pa1': 253, 
    'oem_clear': 254,
    
    # some vk_codes for german keyboard layout
    '<': 226, 'smaller': 226, 
    'ä': 222, 
    'ö': 192, 
    'ü': 186, 
    '´': 221, 
    'ß': 219,
    'caret' : 220, # key left of 1 on qwertz layout
    'copilot': 134, # actually a 3 key combination with 134 as somewhat unique vk_code id
    
    
    # -----------------only for internal usage --------------------
    
    # none key that will never be executed but constraints will be evaluated 
    # to add reset or repeat with extra constraint checks
    'none': 0, 'NONE': 0, 'None': 0, '': 0, '_': 0,
    ###XXX 241015-2136
    'reset': 0, 'delay': 0, 

    
    ###XXX 241013-1812
    # 'reset': "not supported anymore - use reset evaluation |(*name to reset*)",
    
    # supress keys with binding to:
    'suppress': -999,
    
    
    ###XXX 241013-1800 reset is taken over by evaluation -> use |(*name of sequence to reset*)
    # reset macro sequences
    # 'reset' : -255, # always resets the active macro
    # 'reset_all': -256,
    # 'reset_0': 0,
    # 'reset_1': -1,
    # 'reset_2': -2,
    # 'reset_3': -3,
    # 'reset_4': -4,
    # 'reset_5': -5,
    # 'reset_6': -6,
    # 'reset_7': -7,
    # 'reset_8': -8,
    # 'reset_9': -9,
    # 'reset_10': -10,
    # 'reset_11': -11,
    # 'reset_12': -12,
    # 'reset_13': -13,
    # 'reset_14': -14,
    # 'reset_15': -15,
    # 'reset_16': -16,
    # 'reset_17': -17,
    # 'reset_18': -18,
    # 'reset_19': -19,
    # 'reset_20': -20,
    # 'reset_21': -21,
    # 'reset_22': -22,
    # 'reset_23': -23,
    # 'reset_24': -24,
    # 'reset_25': -25,
    # 'reset_26': -26,
    # 'reset_27': -27,
    # 'reset_28': -28,
    # 'reset_29': -29,
    # 'reset_30': -30,
    

}
