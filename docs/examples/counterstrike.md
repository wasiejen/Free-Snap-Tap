# Real-world example: Counter-Strike focus group

> Part of the FST docs: [index](../README.md)

The Counter-Strike profile from the maintainer's live config file - a complete
focus section in under 20 active lines. It is the smallest profile that shows
every core concept working together on one game.

Techniques shown: tap groups, rebinds and `suppress`, timing evaluations (`tr`,
`last`, `dc`), the `cs()` counterstrafe helper, per-key delay segments, a
multi-constraint trigger group, and a macro used as a buy script.

The extract is the focus section as configured: the leading indentation and the
commented-out experiment lines are dropped, the section comments are kept.

```bash
<focus>Counter-Strike

<arg>-tapdelay=6,4
<arg>-aliasdelay=6,4
<arg>-nomenu
<arg>-crosshair=2,2

# Tap Groups
a,d
w,s

# Rebinds
<,left_control
caps_lock : shift
c: left_control
shift : left_control
v: suppress
left_windows : suppress
```

## The counterstrafe macros

The four movement keys share one shape: `+w` (the release of `w`) fires when the
key was held longer than 100 ms and the jump key was not used in the last
500 ms, while the opposite key and crouch are not held. The macro releases `w`,
taps the opposite key for `cs("+w")*1.1` ms (the counterstrafe length FST
calculates from how long `w` was held), and releases it immediately.

```bash
# Macros
+w|(tr("+w")>100)|(last("-space")>500), !s, !ctrl ::  +w|15|5, -s|(cs("+w")*1.1), +s|0|0
+s|(tr("+s")>100)|(last("-space")>500), !w, !ctrl ::  +s|15|5, -w|(cs("+s")*1.1), +w|0|0
+a|(tr("+a")>100)|(last("-space")>500), !d, !ctrl ::  +a|15|5, -d|(cs("+a")*1.1), +d|0|0
+d|(tr("+d")>100)|(last("-space")>500), !a, !ctrl ::  +d|15|5, -a|(cs("+d")*1.1), +a|0|0
```

`+w|15|5` is a random 5-15 ms delay after the `w` release; `+s|0|0` forces the
release out with zero delay. See
[prefixes-suffixes.md - Suffix/Delays](../prefixes-suffixes.md) and
[Suffix/Evaluation](../prefixes-suffixes.md) for `tr`, `last` and `cs`.

## Double tap and the buy script

`dc()` (double click) measures the time between two presses of the same key, so
a fast double tap of `x` executes a longer action and a single tap stays free.

```bash
#double_tap to execute
-x|(dc()<500) :: +x|(1000-dc()), -left_mouse|700|700, +left_mouse|0|0, q

#buy sg552
num1 :: b, 4, 3
```

## What to notice

- `<focus>Counter-Strike` matches any window whose title contains
  "Counter-Strike" - a case-sensitive substring
  ([config-file.md](../config-file.md)).
- `<,left_control` is quoted exactly as the live file writes it: it sits under
  the `# Rebinds` comment, but without a `:` before the second key the parser
  reads it as a tap group of `<` and `left_control`. A rebind of `<` to
  left ctrl would need `left_windows : left_control` - the commented
  `#left_windows, left_control` line above it in the live file shows the same
  trap with a comma.
- `shift : left_control` and `caps_lock : shift` rebind whole Keys; `v: suppress`
  and `left_windows : suppress` drop the key entirely
  ([groups-macros.md - Rebinds](../groups-macros.md)).
- `a,d` and `w,s` stay plain tap groups - no per-key delay syntax is allowed
  there, only `-tapdelay` ([start-arguments.md](../start-arguments.md)).
- Every macro trigger is a key_event (`+w`), never a Key, to avoid firing twice
  per tap ([groups-macros.md - Macros](../groups-macros.md)).
