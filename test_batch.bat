@echo off
python .\free_snap_tap.py ^
::-debug ^
::-file=FSTconfig.txt ^
-crossover=20 ^
-tapdelay=5,2 ^
-aliasdelay=5,2 ^
::-nomenu ^
::-nocontrols ^
::-nodelay ^
-focusapp=sublime

pause