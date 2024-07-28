#include <stdio.h>
#include <stdlib.h>
#include <windows.h>
#include <stdbool.h>

// Constants for key events
#define WM_KEYDOWN 0x0100
#define WM_KEYUP 0x0101

// Virtual key codes for keys used for controlling execution
#define EXIT_KEY VK_END
#define TOGGLE_ON_OFF_KEY VK_DELETE

// For readability later
#define PRESS true
#define RELEASE false

// Flag to indicate when a key press should not be suppressed
bool simulating_key_press = false;
bool PAUSE = false;
bool DEBUG = false;

// Dictionary mapping characters and keys to their VK codes
int vk_codes_dict[256] = {0};

// Tap groups define which keys are mutually exclusive
int tap_groups[2][2] = {
    {VK_W, VK_S},
    {VK_A, VK_D}
};

// Initialize the state of each tap group
int tap_groups_states[2][2] = {0};
int tap_groups_last_key_pressed[2] = {0};
int tap_groups_last_key_send[2] = {0};

// Function prototypes
int which_key_to_send(int group_index);
void send_keys(int key_to_send, int group_index);
void touch_key(bool is_press, int key);
LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam);

int main() {
    printf("--- Snap-Tapping started ---\n");
    printf("--- toggle PAUSE with DELETE key ---\n");
    printf("--- STOP execution with END key ---\n");

    // Set up a low-level keyboard hook
    HHOOK keyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL, LowLevelKeyboardProc, NULL, 0);
    if (!keyboardHook) {
        fprintf(stderr, "Failed to install keyboard hook!\n");
        return 1;
    }

    // Message loop to keep the program running
    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    UnhookWindowsHookEx(keyboardHook);
    return 0;
}

int which_key_to_send(int group_index) {
    int num_of_keys_pressed = 0;
    int key_to_send = 0;

    for (int i = 0; i < 2; i++) {
        if (tap_groups_states[group_index][i] == 1) {
            num_of_keys_pressed++;
            key_to_send = tap_groups[group_index][i];
        }
    }

    if (num_of_keys_pressed > 1) {
        key_to_send = tap_groups_last_key_pressed[group_index];
    }

    return key_to_send;
}

void send_keys(int key_to_send, int group_index) {
    int last_key_send = tap_groups_last_key_send[group_index];

    if (key_to_send != last_key_send) {
        if (key_to_send == 0) {
            if (last_key_send != 0) {
                touch_key(RELEASE, last_key_send);
            }
            tap_groups_last_key_send[group_index] = 0;
        } else {
            if (last_key_send != 0) {
                touch_key(RELEASE, last_key_send);
            }
            touch_key(PRESS, key_to_send);
            tap_groups_last_key_send[group_index] = key_to_send;
        }
    }
}

void touch_key(bool is_press, int key) {
    simulating_key_press = true;

    INPUT input;
    input.type = INPUT_KEYBOARD;
    input.ki.wVk = key;
    input.ki.dwFlags = is_press ? 0 : KEYEVENTF_KEYUP;
    SendInput(1, &input, sizeof(INPUT));

    simulating_key_press = false;
}

LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode == HC_ACTION) {
        KBDLLHOOKSTRUCT *p = (KBDLLHOOKSTRUCT *)lParam;
        int vk_code = p->vkCode;

        if (wParam == WM_KEYUP) {
            if (vk_code == EXIT_KEY) {
                printf("\n--- Stopping execution ---\n");
                PostQuitMessage(0);
            } else if (vk_code == TOGGLE_ON_OFF_KEY) {
                PAUSE = !PAUSE;
                printf("--- %s ---\n", PAUSE ? "paused" : "resumed");
            }
        }

        if (!PAUSE && !simulating_key_press) {
            for (int group_index = 0; group_index < 2; group_index++) {
                for (int i = 0; i < 2; i++) {
                    if (vk_code == tap_groups[group_index][i]) {
                        if (wParam == WM_KEYDOWN && tap_groups_states[group_index][i] == 0) {
                            tap_groups_states[group_index][i] = 1;
                            tap_groups_last_key_pressed[group_index] = vk_code;
                            send_keys(which_key_to_send(group_index), group_index);
                        } else if (wParam == WM_KEYUP) {
                            tap_groups_states[group_index][i] = 0;
                            send_keys(which_key_to_send(group_index), group_index);
                        }
                        return 1; // Suppress the event
                    }
                }
            }
        }
    }
    return CallNextHookEx(NULL, nCode, wParam, lParam);
}
