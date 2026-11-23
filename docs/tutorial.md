# Tutorial - from the first start to a working profile

> Part of the FST docs: [index](README.md) - [features & install](../README.md)

The teaching layer of the documentation. Twelve steps build one config file from
empty to a game profile: each step states a goal, gives a copy-paste snippet,
says what you should see, and names the classic pitfall. The reference pages
stay terse on purpose - learn here, look up the complete syntax there.

Every snippet goes into `FSTconfig.txt`, which lives next to the `.exe`/`.py`
and is resolved against that folder at start-up (never the working directory) -
see [config-file.md](config-file.md). Lines after a `#` are comments.

## 1. Install, first run, and the console menu

**Goal.** FST running from a menu you understand.

The two supported start routes are the release `.exe`
([releases](https://github.com/wasiejen/Free-Snap-Tap/releases)) or the Python
source. For the source you need Python 3.12 or newer and two packages:

```bash
pip install pynput pygetwindow
python ./free_snap_tap.py
```

A console opens with the loaded groups and this prompt:

```text
------ Options -------
0. Toggle debugging output with evaluation results
1. Open file:'FSTconfig.txt' in your default editor.
2. Reload everything from file.
3. Print virtual key codes to identify keys.
4. End the program/script.

Hit [Enter] to start or enter your choice:
```

**What you should see.** `[Enter]` closes the menu and starts the listeners -
from now on your keyboard is live-intercepted. Option 1 opens the config file,
option 2 reloads it, option 3 prints the vk code of every key you press (use it
to find out how your keyboard names a key).

**Classic pitfall.** Two of them. The exe can be flagged as a Trojan by
antivirus tools - that is a packaging false positive, see
[README - AntiVir False Positives](../README.md). And FST looks for
`FSTconfig.txt` next to the `.exe`/`.py` it runs from, so editing a copy that
sits in another folder changes nothing.

Reference: [README - Installation / Easy Usage](../README.md),
[config-file.md](config-file.md).

## 2. Snap tap - the first tap group `a, d`

**Goal.** A-D counter-strafing without releasing either key.

```bash
# Tap Groups
a, d
w, s
```

**What you should see.** Hold `a`, then press `d`: the program suppresses both
real presses and sends the idealized pair, so `d` becomes active the moment you
touch it and `a` is released. Release `d` and `a` is pressed again while you
still hold it. The game only ever sees the most recent direction.

**Classic pitfall.** A tap group accepts plain key strings only: `a|10` or
`-a, -d` are errors at group init, and a group needs two or more keys. Per-key
delays do not exist here - use the `-tapdelay` start argument (step 4).

Reference: [groups-macros.md - Tap_Groups](groups-macros.md),
[README - How Free Snap Tap Works](../README.md).

## 3. The first focus app

**Goal.** Keep the tap groups everywhere, but add game-specific lines that only
apply while that game owns the screen.

```bash
# Tap Groups (default part - before the first <focus>, always active)
a, d

#----------------------------------------
# Counter Strike focus group
<focus>Counter

# Rebinds
left_windows : suppress
```

Everything before the first `<focus>` is the default part; it stays active and
is merged into every focus group. Everything below `<focus>` belongs to that
window only.

**What you should see.** Switch to a window whose title contains `Counter`: the
focus group activates and its lines apply on top of the default part. Switch
away and FST is back to the default part.

**Classic pitfall.** The match is a **case-sensitive substring**:
`<focus>Counter` matches "Counter-Strike" but not "counter-strike". Characters
outside letters, numbers, spaces, `_`, `.`, `,` are stripped at parse time, and
`<focus>CS2, cs2 alt` defines one group with two matching names - the lines
below the first name are shared by all of them.

Reference: [config-file.md](config-file.md).

## 4. Delays - `-tapdelay`, `-macrodelay`, `-nodelay`

**Goal.** A human-looking gap between simulated key events, and the switch to
turn it off.

```bash
<arg>-tapdelay=8,2       # tap groups: random gap between 2 and 8 ms
<arg>-macrodelay=10,4    # macros/aliases: default gap 4-10 ms
<arg>-crossover=40       # 40% chance that press and release overlap
#<arg>-nodelay           # uncomment to switch delays and crossover off
```

The pair is `max,min`; the parser sorts it, so `8,2` and `2,8` mean the same.

**What you should see.** With `-tapdelay` the counter-strafe switch in step 2
lands a few ms later instead of instantly. With `-nodelay` everything fires
immediately and the crossover is off.

**Classic pitfall.** The shipped default pair is 2-10 ms - that sits BELOW the
~15.6 ms Windows clock tick, so every gap quantizes to one tick and playback is
effectively immediate. For a rhythm you can actually hear or see, pick a pair
whose LOWER bound is above the tick, e.g. `-macrodelay=25,20`. And remember:
tap groups only obey these arguments - a `key|100` suffix there is invalid.

Reference: [prefixes-suffixes.md - Suffix/Delays](prefixes-suffixes.md),
[start-arguments.md](start-arguments.md).

## 5. Rebinds and `: suppress`

**Goal.** Replace one key with another, or remove it entirely.

```bash
# Rebinds
left_windows : left_control    # win key behaves as ctrl
caps_lock : shift              # a whole Key: press and release
c : ^left_control              # c toggles left ctrl on and off
v : suppress                   # v never reaches the game
+shift : +suppress             # only the release of shift is dropped
```

**What you should see.** `left_windows` types like ctrl. `c` behaves like a
caps-lock for ctrl: one press crouches, the next press stands up. `v` does
nothing at all.

**Classic pitfall.** Precedence and pass-through. If a trigger has BOTH a rebind
and a macro, the rebind wins and the macro never fires. And a rebind that
matches while a constraint on its replacement fails suppresses the original key
and sends nothing - to let the original key through instead, move the
constraint to the trigger side: `a|(p("shift")) : b`.

Reference: [groups-macros.md - Rebinds](groups-macros.md).

## 6. The first macro, with per-key delay

**Goal.** One key plays a whole sequence, with a timing of its own per key.

```bash
# Macros
(heavy_attack) -mouse_x1 :: -g|50, +shift|50, -shift|50, +g
```

The name in parentheses is optional but needed later for interrupting; `::`
separates the trigger group from the played key group; `|50` is the delay after
that key event.

**What you should see.** Pressing mouse button 4 sends: `g` down, 50 ms, `shift`
down, 50 ms, `shift` up, 50 ms, `g` up. The mouse button itself is suppressed -
the game never sees it.

**Classic pitfall.** Retriggering an unfinished macro interrupts the old
playback and starts the new one - a macro is not a queue. Also, a macro trigger
must be a key_event: a bare `Key` there is read as its press event `-ke`, so one
tap cannot fire both the press and the release leg.

Reference: [groups-macros.md - Macros](groups-macros.md),
[prefixes-suffixes.md - Suffix/Delays](prefixes-suffixes.md).

## 7. Prefixes: `-`, `+`, `!`, `^`

**Goal.** Control whether a Key or a single key_event is meant.

```bash
-a            # press only
+a            # release only
!a            # release too - and the "not pressed" form in a constraint
^a            # a toggled Key - the only prefix allowed on a Key
a             # a Key: press + release  (= -a, +a)

# used in a config:
f : ^caps_lock                 # f toggles caps lock
-v, -shift :: c                # the macro on the press of v, while shift is pressed
```

**What you should see.** Prefixes pick the granularity: a rebind on `-v` fires
when you press v, one on `+v` when you release it, one on `v` on both legs.

**Classic pitfall.** In a rebind notation, ONE Key makes BOTH sides Keys:
`-caps_lock, shift` is re-read as `caps_lock, shift`. And a key's press state is
read AFTER the current event already updated it, so `-ke|(p('ke'))` is always
True and `+ke|(p('ke'))` always False - compare another key instead, or use
`ap()`/`ar()` for real-or-simulated state.

Reference: [concepts.md](concepts.md),
[prefixes-suffixes.md](prefixes-suffixes.md).

## 8. Aliases `<name>` and nesting

**Goal.** Write a key group once, reuse it everywhere.

```bash
<world> -shift, w, o, r, l, d, +shift
(write_helloWORLD) -h :: h, e, l, l, o, <world>

<run_if_not> -shift|(ar('shift'))
<alias_in_alias> <run_if_not>, +ctrl|75|(ap('-ctrl')), -ctrl|150, +c|75|(ap('-c')), +ctrl, -shift
```

**What you should see.** Pressing `h` types "helloWORLD". An alias is inserted
at the position where it is used, so an alias may contain other aliases
(`<alias_in_alias>` above contains `<run_if_not>`).

**Classic pitfall.** An alias is text insertion, not a callable: it only plays
inside a rebind replacement, a macro key group, a macro sequence, or a trigger
group. Naming is also not free-form on the invocation side - a repeat needs the
name quoted: `toggle_repeat('<scan>', 6500)`, without the angle brackets it
matches nothing.

Reference: [groups-macros.md - Aliases](groups-macros.md).

## 9. Constraints and evaluations

**Goal.** Let the state of the game decide whether a key plays.

```bash
# a constraint suffix: plays only while shift is pressed
-b|(-shift) :: 1

# the CS counterstrafe line: timing evaluations + real-key constraints
+w|(tr("+w")>100)|(last("-space")>500), !s, !ctrl ::  +w|15|5, -s|(cs("+w")*1.1), +s|0|0
```

`(-shift)` is a constraint (True while shift is pressed), `(tr("+w")>100)` is an
evaluation that became a bool by comparison, `(cs("+w")*1.1)` is an evaluation
that returns a NUMBER - and a number is used as the delay after that key.

**What you should see.** The counterstrafe macro fires only when you release a
movement key you held longer than 100 ms, you have not jumped in the last
500 ms, and neither the opposite key nor crouch is held. The counter key is then
held exactly as long as the game needs to stop the movement.

**Classic pitfall.** Quote the key inside `p()`, `ap()`, `tr()`: an unquoted
name is evaluated as a python variable and an unknown name silently evaluates to
True. And a suffix chain is checked left to right, stopping at the first False -
everything after a False never runs.

Real-world example: the whole [Counter-Strike profile](examples/counterstrike.md).
Reference: [prefixes-suffixes.md - Suffix/Constraints, Suffix/Evaluation](prefixes-suffixes.md).

## 10. `toggle_repeat` - a repeat you can start and stop

**Goal.** Send an alias again and again until you say otherwise.

```bash
# define alias to be played
<scan> v

# repetition of scanning on v every 6.5 s
(repeat_scan) -t|(toggle_repeat('<scan>', 6500))|(!) : -t
(repeat_scan) -v|(reset_repeat('<scan>'))|(!) : -v
(repeat_scan) +v|(tr("+v")>500)|(stop_repeat('<scan>'))|(!) : +v
```

**What you should see.** The first press of `t` starts a scan every 6500 ms and
plays it immediately; the second `t` press stops it. A long press-and-release of
`v` stops the repeat too; a short `v` press only restarts the interval.

**Classic pitfall.** The `|(!)` at the end is the trick, and order is
everything: the invocations left of it already ran, then `(False)` blocks the
rebind, so the key is not replaced and not suppressed. Move `|(!)` in front of
`toggle_repeat(...)` and the repeat never starts.

Real-world example: the auto-fire lanes in the [Battlefield profile](examples/battlefield.md).
Reference: [invocations.md - Repetition of Aliases](invocations.md).

## 11. Typing, toasts, and variables

**Goal.** Type text, show feedback on screen, and remember a mode.

```bash
(say_gg)   -f1 :: |(type("gg"))
(mode_on)  -f2 :: _|(set("mode", 1))|(show_message("mode_ON"))
(mode_off) -f3 :: _|(clear("mode"))|(show_message("mode_OFF"))
(what_mode) -f4|(is_set("mode")) :: |(type("mode is on"))
```

`_` is the empty key event: never played, but its suffixes still evaluate, so it
is the standard carrier for invocations.

**What you should see.** `f1` writes "gg" into whatever has the keyboard focus.
`f2`/`f3` pop a toast box below the status dot for three seconds. `f4` types
only while the `mode` variable is set.

**Classic pitfall.** Toasts need GUI mode: without `-status_indicator` or
`-tray_icon` at start-up they raise an error (headless run). And variables are
memory-only - they are not saved and they start empty on every start, so a
profile must establish its own defaults (see the `-esc` reset line in the
Battlefield example below).

Real-world example: the variable-driven class/weapon state machine in the
[Battlefield profile](examples/battlefield.md).
Reference: [invocations.md - Typing, Toasts, Variable system](invocations.md).

## 12. Overlay, pause, reload, and the bug-report artifact

**Goal.** See what FST is doing, control it without the console, and file a bug.

```bash
<arg>-status_indicator=20   # the dot: green = active, red = inactive, blue = always-active
<arg>-crosshair             # needs the GUI loop: dot or tray must be on
<arg>-tray_icon             # tray menu: Open config / Reload / Toggle Pause / ...
<arg>-hide_cmd_window       # console hidden after start-up (needs the tray to show it again)
```

Keys: `ALT + DELETE` pauses (resuming reloads the groups from file), `ALT + END`
stops, `ALT + PAGE_DOWN` returns to the console menu. On the dot: left-drag
moves it, right-click opens the menu, double-click opens the config file.

**What you should see.** A small dot in the top-right corner that turns green
when a focus app matches and red when nothing does. A resolution or scale change
keeps its relative position.

**Classic pitfall.** `<arg>-crosshair` alone shows nothing - the GUI loop only
starts when `-status_indicator` or `-tray_icon` is enabled at start-up. And when
something misbehaves, do not describe the state from memory: `fst_status.log`
(next to `fst.log`) is written at every start-up and every successful reload and
captures the effective arguments, the focus scope, the group counts, the key
states, and the open tickets. There is deliberately no hotkey for it - reload
the config to get a fresh one and attach the file to the report.

Reference: [overlay.md](overlay.md), [controls.md](controls.md).

## Where to go next

- Complete syntax: [groups-macros.md](groups-macros.md),
  [prefixes-suffixes.md](prefixes-suffixes.md), [invocations.md](invocations.md),
  [start-arguments.md](start-arguments.md).
- Two full live profiles: [examples/counterstrike.md](examples/counterstrike.md),
  [examples/battlefield.md](examples/battlefield.md).
- Why timing behaves the way it does: [internals.md](internals.md).
