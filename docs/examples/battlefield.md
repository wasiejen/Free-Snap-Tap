# Real-world example: Battlefield focus group

> Part of the FST docs: [index](../README.md)

The Battlefield profile from the maintainer's live config file: a full weapon
and class state machine driven by one key per state, the mouse buttons, and a
Razer Naga side grid. It is the reference example for the variable system,
constraint evaluations, alias nesting, repeat lanes, and a macro sequence.

Techniques shown: integer variables (`set`, `check`, `get`, `clear`), evaluation
chains that end in `|(False)` / `|(!)` so the real key passes through, aliases
as shared state blocks, `start_repeat` / `stop_repeat` lanes, multi-key trigger
groups, toasts as mode feedback, and the escape-key reset.

The extract is the focus section as configured: leading indentation is
normalized, the commented-out experiment blocks are dropped, and every live line
and its own section comment is unmodified.

## The focus section

`-default_off` keeps the default group's lines out of this profile, so game keys
cannot collide with the desktop conveniences
([start-arguments.md](../start-arguments.md)).

```bash
<focus> Battlefield
<arg>-aliasdelay=3,3
<arg>-crosshair=1,0
<arg>-default_off

a,d
w,s
```

## Class presets: variables plus a toast

`num1`-`num4` write the class and weapon state into integer variables and report
the mode with a toast box. The chain ends in `(False) : -None`: the invocations
run, the evaluation returns False, so the rebind never fires and the real number
key reaches the game untouched
([invocations.md - Variable system](../invocations.md),
[None / empty key event](../invocations.md)).

```bash
#set classes
-num1|(set("laser", 0))|(show_message("auto_t_OFF"))|(set("zoom",1))|(set("marking", 0))|(set('class', 0))|(set("weapon", 0))|(set("burst", 0))|(show_message("sturm-soldat"))|(False) : -None
-num2|(set("laser", 0))|(show_message("auto_t_OFF"))|(set("zoom",1))|(set("marking", 0))|(set('class', 1))|(set("weapon", 0))|(set("burst", 0))|(show_message("pioneer"))|(False) : -None
-num3|(set("laser", 0))|(show_message("auto_t_OFF"))|(set("zoom",1))|(set("marking", 0))|(set('class', 2))|(set("weapon", 0))|(set("burst", 0))|(show_message("versorger/medic"))|(False) : -None
-num4|(set("laser", 0))|(show_message("auto_t_OFF"))|(set("zoom",0))|(set("marking", 0))|(set('class', 3))|(set("weapon", 0))|(set("burst", 0))|(show_message("scharfschuetze"))|(False) : -None
```

The same idiom tracks the weapon slot on the number keys, and the gadget slot
resets the state after use (`check` compares an int, `set` without a value
stores 1):

```bash
# set weapons
-1|(set("weapon",0))|(check("ha"))|(stop_repeat('<halbautomatik>'))|(clear("ha"))|(False) : -None
-2|(set("weapon",1))|(False) : -None
-3|(set("weapon",2))|(False) : -None
-4|(set("weapon",3))|(False) : -None
-ml|(check("weapon",3))|(set("weapon",0))|(False) : -None
```

## One alias as the weapon-switch state machine

`<main_weapon_switch>` reads the current weapon variable and presses the matching
number key, so one mouse button toggles between the two carried weapons. The
constraints `(not check("weapon", 0))` and `(check("weapon", 0))` decide which
half of the alias plays; `get("switch")` feeds the result back into `weapon`.

```bash
<main_weapon_switch> -1|50|(not check("weapon", 0)),+1|(not check("weapon", 0))|(set("switch", 0)), -2|50|(check("weapon", 0)), +2|(check("weapon", 0))|(set("switch", 1)) , _|(set("weapon", get("switch")))
```

Used from a key and from the Naga button; the release is suppressed so only the
press leg acts ([groups-macros.md - Aliases](../groups-macros.md)):

```bash
-caps_lock :: <main_weapon_switch>
+caps_lock : +suppress
(5-) -naga5 :: <main_weapon_switch>
(5+) +naga5 : suppress
```

## Repeat lanes: hold-to-fire, released on the second click

The aliases hold the actual burst, the `*_start` / `*_end` aliases arm and stop
the repeat and keep the `ha` flag, so a lane is never armed twice (`not
check("ha")`). `start_repeat` takes the alias name in quotes plus the interval
in ms ([invocations.md - Repetition of Aliases](../invocations.md)).

```bash
<halbautomatik> -ml|60,+ml
<salve> -ml|150,+ml
<burst> -ml|200,+ml
<halbautomatic_start> _|(not check("ha"))|(start_repeat('<halbautomatik>',100))|(set("ha"))
<halbautomatic_end> _|(stop_repeat('<halbautomatik>'))|(clear("ha"))
<salve_start> _|(not check("ha"))|(start_repeat('<salve>',240))|(set("salve"))
<salve_end> _|(stop_repeat('<salve>'))|(clear("salve"))
```

Pistol with automatic zoom: the press of the left button arms the repeat and the
zoom helper, the release tears everything down again. The `#` in that line is a
per-segment comment: it drops only the `#` segment itself, the `_|100` wait and
the `+ml` release after the following commas still play - a comment that should
end the line must therefore sit before any key that follows it.

```bash
#pistol mit auto zoom
-ml|(check("weapon",1)), +mr :: <laser_start>, <zoom_start>, <halbautomatic_start> #, _|100, +ml
+ml|(check("weapon",1))|(check("ha")), +mr :: <halbautomatic_end>, <zoom_end>, <laser_end>, _|20, +ml
```

Burst fire instead of full auto - the same lane, chosen by the `burst` variable.
Note that `check("weapon",(0))` is still an int equality check: `(0)` is a
parenthesised number, not a tuple - membership would need `(0,3)` or `[0,3]`
([invocations.md - Variable system](../invocations.md)).

```bash
# alternativer burst automatic fire button
-mm|(check("weapon",(0)))|(check("burst", 0)), -mr :: <halbautomatic_start>
+mm|(check ("ha")):: <halbautomatic_end>, +ml

-mm|(check("weapon",(0)))|(check("burst", 1)), -mr :: _|(start_repeat('<burst>',350))|(set("ha2"))
+mm|(check("ha2")) :: _|(stop_repeat('<burst>'))|(clear("ha2")), +ml
```

## Aim state: markers, laser, zoom

Small aliases compose the aim behaviour; each one is guarded by the matching
mode variable, so the same mouse combo behaves per class and per weapon.

```bash
<laser_start> -t|(check("laser", 1))|(set("t")), +t|(check("laser", 1))
<laser_end> -t|(check("t")), +t|(check("t"))|(clear("t"))
<zoom_start> -mr|(check("zoom", 1))|(r("shift"))|0|(set("mr"))
<zoom_end> +mr|(check("zoom", 1))|0|(check("mr"))|(clear("mr"))
<single_marking> -mm|50|(check("marking")), +mm|0|(check("marking"))
```

The trigger group carries two keys (`-ml` press while `+mr` is held), so one
combo covers aim-down-sights:

```bash
# main weapon
-ml|(check("weapon",0)), +mr :: <laser_start>, <zoom_start>, -ml|0
+ml|(check("weapon",0)), +mr :: +ml|0, <zoom_end>, <laser_end>
# marking enemies while shooting on them
-ml|(check("weapon",0)), -mr :: -ml|0, <single_marking>
+ml|(check("weapon",0) and check("laser", 1)), -mr :: +ml|0, -t|(check("t")), +t|(check("t"))|(clear("t"))
```

## One key, two states: a macro sequence

`num7` alternates between the two burst modes - the first activation plays the
first key group, the next activation the second, then the sequence resets
([groups-macros.md - Macros/Macro_Sequences](../groups-macros.md)). The `num`
keys around it are plain mode switches with a toast as the only feedback.

```bash
-num5 :: _|(set("laser", 0))|(show_message("auto_laser_OFF"))
-num6 :: _|(set("laser", 1))|(show_message("auto_laser_ON")), t
-num8 :: _|(set("zoom", 0))|(show_message("auto_zoom_OFF"))
-num9 :: _|(set("zoom", 1))|(show_message("auto_zoom_ON"))
-num7 :: _|(set("burst", 0))|(show_message("halbautomatic")) : _|(set("burst", 1))|(show_message("burst 2"))
-divide :: _|(clear("marking"))|(show_message("marking_OFF"))
-multiply :: _|(set("marking"))|(show_message("marking_ON"))
```

## The Naga side grid

Names in parentheses label the bindings in the console output; the `-`/`+`
pairing lets the press act and suppresses the release. Mouse-button key strings
(`rm`, `mx1`, `mx2`) are as valid as keyboard keys - `rm` is the right button and
`mx1`/`mx2` the two side buttons; the scroll wheels are `scroll_y`/`scroll_x`
([invocations.md - Mouse keys](../invocations.md)).

```bash
# naga trinity
(1) naga1, +rm : g
(1-rm) naga1, -rm : y
(2) naga2: f
(2-rm) f, -rm : y
(3) naga3, +rm : mx1
(4) naga4 : f1
(6) naga6 : mx2
(8) naga8 : suppress
(9) naga9 : 5
(10) naga10 : m
(12) naga12 : 6
(7-) -naga7|(set("laser", 0))|(show_message("auto_t_OFF"))|(set("zoom",1))|(set("marking"))|(set('class', 2))|(set("weapon",0))|(set("burst",0))|(show_message("versorger/medic"))|(False) :: -None
(7+) +naga7 : suppress
```

## The reset keys

`-esc` writes the whole state back to the untouched preset and still reaches the
game (`|(!)` at the end of the chain). `+esc` is the safety net: it stops every
repeat, releases every simulated key, and clears every variable
([invocations.md - General key control](../invocations.md)).

```bash
-esc|(set("laser", 0))|(show_message("auto_t_OFF"))|(set("zoom",0))|(set('class', 0))|(set("weapon",0))|(show_message("keine Klasse gesetzt"))|(clear("marking"))|(!) :: -esc
+esc|(stop_all_repeat())|(release_all_keys())|(clear_all_variables())|(!) :: +esc
```

## What to notice

- Variables live in memory only - a config reload or restart starts them empty,
  which is why `-esc` rewrites the preset instead of trusting it.
- `check("name", value)` on the left of a suffix chain acts as a gate, `set`
  writes; both are ordinary suffixes, so they compose in any order - left to
  right, stopping at the first False.
- Every mode change reports with a toast, so the state is readable in game
  ([overlay.md - Toast boxes](../overlay.md)) - toasts need GUI mode, i.e.
  `-status_indicator` or `-tray_icon` at start-up.
