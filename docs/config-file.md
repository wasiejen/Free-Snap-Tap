# Config file - syntax and focus groups

> Part of the FST docs: [index](README.md) - [features & install](../README.md)

## [Configuration]

- The default config file "FSTconfig.txt" lives next to the `.exe`/`.py`: it is resolved against that folder at startup, so it is found on every launch route (boot shortcuts, `.bat` launchers, double-click) - the working directory is never used (#461)
- text file can be changed from default "FSTconfig.txt" to any file you want to, with the help of the startargument `-file=*file_name*` (this override is taken exactly as given: a relative value resolves against the working directory, as it always did)
- all startarguments can be used either with a .bat file, by adding them to the link to the .exe or .py file, or by including them in the config file with `<arg>*start_argument*`, e.g. `<arg>-nomenu`
- focus app names can be defined in the config file via `<focus>*name of the app*`
  - everything BEFORE the first \<focus> will be seen as default start arguments and groupings and applied in general (evene outsite of focus apps) and to all following focus app groupings
  - everything following this \<focus> definition up until the next \<focus> will be applied when the focus app name given is found in the current active window
  - multiple focus names on one line: `<focus>CS2, cs2 alt` - the names after the first comma are aliases of the same focus group: the start arguments and groups are defined under the first name and SHARED by all names, and matching ANY of the names activates that one group
  - focus names only keep letters, numbers, spaces, `_`, `.`, `,`, `-` and `:` (the `FOCUS_NAME_ILLEGAL` pattern in `fst_data_types.py`) - any other character is stripped at parse time
- a line that starts with `:` (leading whitespace is stripped at parse time) is joined to the previous line - so a macro sequence can be written over multiple lines for readability (see the README example with the indented `: esc, ...` continuation line)

```bash
<arg>-status_indicator=15
#----------------------------------------
### Counter Strike focus group
<focus>Counter

#<arg>-crossover=40
<arg>-tapdelay=6,4
<arg>-aliasdelay=6,4
#<arg>-nomenu
#<arg>-nocontrols
#<arg>-nodelay
<arg>-crosshair
# <arg>-crosshair=10,10

# Tap Groups
a,d
w,s

# Rebinds
...
```

