# Delays, Prefixes, Suffixes

> Part of the FST docs: [index](README.md) - [features & install](../README.md)

## Delays in general
  - default delay for Tap_Groups and Macros is set to a random time between 2 and 10 ms
  - in Tap_Groups: 
    - used for simulated keys that would idealized be executed together - to get a more natural input behavior
    - default delays for Tap_Groups are changeable via the start argument `-tapdelay=*min_delay*,*max_delay*`
  - in Macros/Macro_Sequences: 
    - custom delay usable for each key of a key_group that will be executed AFTER the key_event
      - for Keys with delays, the delay will be executed after the press AND the release
    - default delays for Macros are changeable via the start argument `-macrodelay=*min_delay*,*max_delay*`
  - delay can be suppressed entirely with the start argument `-nodelay`
For further functionality of how it will be triggered, usage of constraints, evaluation and function invocation see [Rebinds + Macros + Macro_Sequences](groups-macros.md)

## On Prefixes and Suffixes

## [Prefixes]
Every key event supports prefixes **prefix/modifier**
  - `-key_event`: defines the pressed (down) state of a key
    ```bash
    -v : a    # fires on the press leg of v only
    ```
  - `+key_event` and `!key_event` - defines the released (up) state of a key
    ```bash
    +v : a    # fires on the release leg of v
    !v : a    # "!" is the same release form
    ```
  - `^Key`: toggle a key - on key press key will be toggled between press and release; key release will be suppressed
    - key after prefix `^` will always be interpreted as a Key instead of a key_event
    ```bash
    f : ^caps_lock    # f toggles caps_lock on and off
    ```

## [Suffixes]

- every key_event supports **suffixes** (constraints, evaluation, function invocation)
  - a suffix segment is either a delay number or a parenthesized expression `(...)` - a bare segment is parsed as a delay number, so `ke1|-ke2` is rejected
- suffixes in trigger_group will only be checked/activated when trigger and constraints all check for True

### [Suffix/Constraints]

  - as constraints: `(-ke)`, `(+ke)`/`(!ke)`: e.g. `ke1|(-ke2)|(-ke3) : ...` is functionally the same as trigger group: `ke1, -ke2, -ke3 : ...`
    - inside the parentheses the sign names the state to check: `(-ke)` is True while ke is pressed, `(+ke)`/`(!ke)` while ke is not pressed (real and simulated state)
    ```bash
    w|(-a)|(-s) : x   # constraint suffixes on w
    w, -a, -s : x     # the same condition as a trigger group
    ```

### [Suffix/Delays]

  - Notation: 
    - `key_event/Key|*time*` -> will result in a static delay of length *time* in ms
    - `key_event/Key|*time1*|*time2*` -> will result in a random delay of length between *time1* and *time2* ms
    ```bash
    w :: a|250, b      # static: wait 250 ms after a
    w :: a|50|120, b   # random: wait between 50 and 120 ms after a
    ```
- the rulings behind these delays (unbounded segment delays, the shipped default pair) are in [internals.md](internals.md)

### [Suffix/Evaluation] updated to V1.1.3

The invocation grammar `|(...)` is owned by [invocations.md](invocations.md) - this section owns the evaluation functions that resolve inside a constraint `(...)`.

- supports evaluation as suffix
  - **evaluation to an integer** which will be used as a constant delay (all following function returns a length of time in ms)
    - `|(tr("ke"))`: timing of length of time for presses and releases of **Real** key events
        - for tr("-ke") get the length of time of a key press to release (read like: when I press ke (-ke) then give me the length of time since the last ke release)
        - for tr("+ke") returns the length of time from last key press to actual key release
    - `|(ts("ke"))`: timing of length of time for presses and releases of **Simulated** key events (also includes Tap Groups due to handling of them internally)
    - `|(ta("ke"))`: timing of length of time for presses and releases of **All** key events
    - `ke1|(last("ke2"))`: timing of length since last `-ke` press or `+ke` release (especially useful to check on other keys than the suffixed key)
    - `|(dc("ke"))`: dc short for double click: return the time between two press events or between two release events of the key
      - the sign of the key argument carries no meaning (`dc("-ke")` and `dc("+ke")` return the same value)
      - returns 9999 ms if the key has no previous events
    - `|(cs("key"))`: counterstrafing especially for CounterStrike: returns a time of length a key must pressed based on the pressed key to return the optimal time of length for a counterstrafe to come to a stop. Uses an internal function to approximate the acceleration time of the counter movement key.
    - `|(csl("ke"))`: some as above only uses a linear function to estimate the counter strafing time

    ```bash
    w|(tr("w")) : a      # a waits the measured press-to-release timing of w
    x|(last('q')) : b    # b waits the time since q's last press or release
    ```

  - **evaluation to bool (True/False)**
    - supports standard python notation and inbuilt functions
      - use of `,` commas in multi parameter functions is supported since V1.1.2 (e.g. pow(20,3) does now work)
    - **every above time function can be used as a comparison evaluate it to bool**
      - e.g. (dc("-ke") < 500) -> results to True if a double click (as time of the press) was made in less than 500 ms, else it will evaluate to False
    - `p('key_string')`: (real key press) returns True if the real key defined by key_string is pressed
      - the press state is read AFTER the current event already updated it - so on a trigger `-ke|(p('ke'))` is always True and `+ke|(p('ke'))` is always False; the sign of the argument is ignored
      - the key must be given as a quoted string - an unquoted name is evaluated as a python variable and unknown names silently evaluate to True
    - `r('key_string')`: (real keys release)
    - `ap('key_string')`: (all keys press) returns True if the real key or a simulated key defined by key_string is pressed
    - `ar('key_string')`: (all keys release)

    ```bash
    w|(p('a')) : x        # x plays only while a is really pressed
    y|(dc('y') < 500) : z # z plays only after a double click of y below 500 ms
    ```

  - **evaluation to False**
    - `|(False)` = `|(!)` = `|()` are equivalent and will always return False

    ```bash
    w|(!) : a    # blocks the rebind - same as |(False) and |()
    ```

  - **evaluation to True**
    - all following invocations will always result in True


